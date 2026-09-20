// src/app/api/shop/webhook/route.ts
// 支付回调：校验签名 → 标记已收款 → **记录分账** → 自动触发 CJ 代发履约（成本腿）
// 支持 Paystack（x-paystack-signature，HMAC-SHA512）与 Flutterwave（verif-hash）
//
// 一次收款、两条腿：
//   ① 成本腿：应付 CJ（进货成本 + 运费）→ 走 CJ 余额支付 / CJ 支付链接（本文件触发）
//   ② 利润腿：收款 - 成本 - 网关费 → 留存我方账户（settlement.ts 记账）
import { NextRequest, NextResponse } from 'next/server';
import { markOrderPaid, getOrderByNo } from '@/lib/shop-db';
import { fulfillOrderWithCj } from '@/lib/cj-fulfill';
import { verifyPaystackSignature, verifyFlutterwaveSignature } from '@/lib/pay-gateway';
import { recordSettlement, updateSettlementLeg, getSettlement } from '@/lib/settlement';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET() {
  return NextResponse.json({ ok: true, message: 'SZSPD payment webhook is alive' });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const psSignature = request.headers.get('x-paystack-signature');
  const flwHash = request.headers.get('verif-hash');

  let payload: any = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  // ---------------- Paystack ----------------
  if (psSignature) {
    if (!verifyPaystackSignature(raw, psSignature)) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }
    if (payload?.event !== 'charge.success') {
      return NextResponse.json({ received: true, ignored: payload?.event || 'unknown' });
    }
    const orderNo = String(payload?.data?.reference || '');
    const paid = Number(payload?.data?.amount || 0) / 100;
    return await settle(orderNo, { provider: 'paystack', ref: String(payload?.data?.id || ''), paid });
  }

  // ---------------- Flutterwave ----------------
  if (flwHash) {
    if (!verifyFlutterwaveSignature(flwHash)) {
      return NextResponse.json({ error: 'invalid verif-hash' }, { status: 401 });
    }
    const status = String(payload?.status || payload?.data?.status || '').toLowerCase();
    if (status !== 'successful' && status !== 'success') {
      return NextResponse.json({ received: true, ignored: status || 'unknown' });
    }
    const orderNo = String(payload?.tx_ref || payload?.data?.tx_ref || '');
    const paid = Number(payload?.amount || payload?.data?.amount || 0);
    return await settle(orderNo, { provider: 'flutterwave', ref: String(payload?.data?.id || payload?.id || ''), paid });
  }

  // 未带任何已知签名头 —— 拒收（避免伪造「已付款」把货发出去）
  return NextResponse.json(
    { error: 'unrecognized webhook source (missing signature headers)' },
    { status: 401 }
  );
}

/** 标记收款 → 记录分账 → 异步触发成本腿（CJ 履约） */
async function settle(
  orderNo: string,
  info: { provider: string; ref: string; paid: number }
): Promise<NextResponse> {
  if (!orderNo) {
    return NextResponse.json({ error: 'missing order reference' }, { status: 400 });
  }
  const existing = await getOrderByNo(orderNo);
  if (!existing) {
    return NextResponse.json({ error: `order not found: ${orderNo}` }, { status: 404 });
  }

  // 幂等：网关会重复推送，重复回调不能再触发一次发货/扣款
  if (existing.payment_status === 'paid') {
    const s = getSettlement(orderNo);
    return NextResponse.json({
      received: true,
      duplicate: true,
      order_no: orderNo,
      cj_leg: s?.leg_cj_status || 'unknown',
    });
  }

  await markOrderPaid(orderNo, { provider: info.provider, ref: info.ref });

  // 记录分账：算出「应付 CJ」与「留存利润」两条腿，账本先落地。
  // 即使后面 CJ 付款失败，钱去哪了也有据可查。
  const split = await recordSettlement(orderNo, {
    provider: info.provider,
    ref: info.ref,
    splitMode: 'ledger',
  });

  // 履约要调用 CJ 下单接口（实测 20~30 秒），不能阻塞 webhook 响应，
  // 否则网关会判超时并反复重推。这里异步执行 + 落库记录结果，
  // 失败可在内部通道用「待履约订单」按钮重试，状态自愈。
  void fulfillOrderWithCj(orderNo)
    .then(async (r) => {
      console.log(`[fulfill] ${orderNo} -> ${r.status}: ${r.message}`);
      // 回写成本腿状态。
      // 注意：钱是不是真到 CJ 手里，以 `status` 为准 ——
      //   auto-paid = 本次余额扣款成功；submitted = 已付清（含「本来就已经付过」）；
      //   awaiting-payment = **已建 CJ 单但没付上**（余额不足或缺支付链接）。
      // 早期这里把 submitted 记成 unpaid，是因为那时 submitted 只代表「建了单」；
      // 现在建单与付款分开了，submitted 只会在付清后出现，所以必须记 paid。
      const legMap: Record<string, 'paid' | 'unpaid' | 'failed' | 'skipped' | 'pending'> = {
        'auto-paid': 'paid',
        submitted: 'paid',
        'awaiting-payment': 'unpaid',
        failed: 'failed',
        already: 'paid',
        skipped: 'skipped',
      };
      const leg = legMap[r.status] || 'pending';
      const methodMap: Record<string, string> = { balance: 'cj-balance', page: 'cj-page' };
      await updateSettlementLeg(orderNo, {
        leg_cj_status: leg,
        leg_cj_method: methodMap[r.payMethod || ''] || (r.cjPayUrl ? 'cj-page' : 'none'),
        leg_cj_ref: r.shipmentOrderId || r.cjOrderId || '',
        // CJ 返回的实际扣款额比估算准，用它校正成本腿
        actualCjCost: typeof r.amountUsd === 'number' && r.amountUsd > 0 ? r.amountUsd : undefined,
        note: leg === 'unpaid' ? `已建 CJ 单但未付上：${r.message}` : '',
      });
      return r;
    })
    .catch(async (e) => {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[fulfill] ${orderNo} 失败:`, msg);
      await updateSettlementLeg(orderNo, { leg_cj_status: 'failed', note: `转 CJ 异常：${msg}` }).catch(() => {});
    });

  return NextResponse.json({
    received: true,
    order_no: orderNo,
    provider: info.provider,
    paid: info.paid,
    split: split
      ? {
          gross: split.gross_amount,
          to_cj: split.cj_cost,
          profit: split.profit,
          cost_source: split.cj_cost_source,
        }
      : null,
    note: 'payment recorded; split ledger written; CJ fulfilment triggered in background',
  });
}
