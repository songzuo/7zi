// src/app/api/shop/orders/route.ts
// 下单：服务端重算金额 → 落库 → 创建收银台会话
// 注意：这里**只落库收款，不转 CJ**。转 CJ 由收款成功后的
//      /api/shop/webhook（或内部通道手动）调用 fulfillOrderWithCj 触发。
import { NextRequest, NextResponse } from 'next/server';
import { createOrder, getOrderByNo, getOrderItems } from '@/lib/shop-db';
import { createPaySession, providerStatus } from '@/lib/pay-gateway';
import { quoteFreightMulti, countryByCode } from '@/lib/cj-geo';
import { priceLines } from '@/lib/shop-pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

interface IncomingItem {
  sku?: string;
  vid?: string;
  qty?: number;
  quantity?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customer_name = String(body?.customer_name || '').trim();
    const customer_email = String(body?.customer_email || '').trim();
    const customer_phone = String(body?.customer_phone || '').trim();
    const addr = body?.shipping_address || {};
    const rawItems: IncomingItem[] = Array.isArray(body?.items) ? body.items : [];
    const logisticName = String(body?.logisticName || body?.logistic_name || '').trim();

    if (!customer_name || !customer_email) {
      return NextResponse.json({ success: false, error: '请填写姓名与邮箱' }, { status: 400 });
    }
    if (rawItems.length === 0) {
      return NextResponse.json({ success: false, error: '购物车为空' }, { status: 400 });
    }

    const countryCode = String(addr?.countryCode || addr?.country_code || '').toUpperCase();
    const country = countryByCode(countryCode);
    if (!country) {
      return NextResponse.json(
        { success: false, error: '请选择有效的配送国家/地区' },
        { status: 400 }
      );
    }
    if (!String(addr?.address || '').trim() || !String(addr?.city || '').trim()) {
      return NextResponse.json({ success: false, error: '请填写街道地址与城市' }, { status: 400 });
    }

    // ---- 1) 服务端按变体成本定价（绝不信任前端传的金额）----
    // 客户选了规格就用该规格的进货价算价，并把 vid 一起写进订单：
    // 履约时按同一个 vid 向 CJ 下单，定价与发货严格对应。
    const priced = await priceLines(
      rawItems.map((it) => ({
        sku: String(it?.sku || ''),
        vid: it?.vid ? String(it.vid) : undefined,
        qty: Number(it?.qty ?? it?.quantity) || 1,
      }))
    );
    if (priced.needsVariant?.length) {
      return NextResponse.json(
        {
          success: false,
          error: `以下商品有多个规格，请先选择规格后再下单：${priced.needsVariant.join(', ')}`,
          code: 'VARIANT_REQUIRED',
          needsVariant: priced.needsVariant,
        },
        { status: 422 }
      );
    }
    if (!priced.ok) {
      return NextResponse.json(
        { success: false, error: `商品已下架或不存在：${priced.missing.join(', ') || '未知'}` },
        { status: 422 }
      );
    }

    const items = priced.lines.map((l) => ({
      sku: l.sku,
      name: l.name,
      quantity: l.qty,
      unit_price: l.unitPrice,
      vid: l.vid || '',
      variant_name: l.variantName || '',
      // 冻结此刻的进货成本：分账要按"当时的成本"算毛利，
      // 事后 CJ 改价不能影响历史订单的利润口径（costUsd 为 null 时记 0，台账会标记为估算）
      cost_usd: Number(l.costUsd) > 0 ? Number(l.costUsd) : 0,
    }));
    const subtotal = priced.subtotal;

    // ---- 2) 服务端重算运费（以最终实时价为准，按变体 vid 计费）----
    const quote = await quoteFreightMulti({
      to: countryCode,
      lines: priced.lines.map((l) => ({ sku: l.sku, vid: l.vid, quantity: l.qty })),
    });
    if (!quote.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `暂时无法为 ${country.zh} 计算运费：${quote.error || '上游未返回可用渠道'}。请联系客服确认。`,
          code: 'FREIGHT_UNAVAILABLE',
        },
        { status: 422 }
      );
    }
    const chosen = quote.options.find((o) => o.logisticName === logisticName) || quote.options[0];
    const shippingFee = chosen.price;
    const total = Math.round((subtotal + shippingFee) * 100) / 100;

    // ---- 3) 落库 ----
    const provider = providerStatus().active;
    const { order, order_no } = await createOrder({
      customer_name,
      customer_email,
      customer_phone,
      shipping_address: {
        address: String(addr.address || '').trim(),
        address2: String(addr.address2 || '').trim(),
        city: String(addr.city || '').trim(),
        province: String(addr.province || addr.state || '').trim(),
        zip: String(addr.zip || '').trim(),
        country: country.en,
        countryCode: country.code,
      },
      subtotal,
      shipping_fee: shippingFee,
      total_amount: total,
      country_code: country.code,
      logistic_name: chosen.logisticName,
      payment_provider: provider,
      items,
    });

    // ---- 4) 收银台会话 ----
    const pay = await createPaySession({
      orderNo: order_no,
      amountUsd: total,
      customer: { name: customer_name, email: customer_email, phone: customer_phone },
      countryCode: country.code,
    });

    return NextResponse.json({
      success: true,
      order_no,
      order: {
        order_no,
        customer_name,
        country: country.en,
        country_code: country.code,
        subtotal,
        shipping_fee: shippingFee,
        total_amount: total,
        currency: 'USD',
        logistic_name: chosen.logisticName,
        logistics_aging: chosen.agingLabel,
      },
      payment: pay,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * 查询单笔订单（客户自查用）
 *
 * 安全约束：订单号是顺序号（SZ-YYMMDD-XXX），可被枚举，因此必须同时提供
 * 下单时填写的邮箱作为第二因子。参数缺失、邮箱不匹配、订单不存在三种情况
 * 一律返回同样的 404，不透露订单号是否有效。
 *
 * 历史问题（已修）：此前不带参数会直接返回最近 30 笔订单的完整客户信息
 * （姓名/邮箱/电话/详细收货地址），等同于把客户资料公开在互联网上。
 * 现在这里只回传必要字段，且不包含收货地址与支付流水号。
 * 需要看全部订单请走内部通道 /api/internal/wholesale?action=shop-orders。
 */
export async function GET(request: NextRequest) {
  const orderNo =
    request.nextUrl.searchParams.get('order_no') || request.nextUrl.searchParams.get('order');
  const email = (request.nextUrl.searchParams.get('email') || '').trim().toLowerCase();

  if (!orderNo || !email) {
    return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
  }

  try {
    const order = await getOrderByNo(orderNo);
    if (!order || String(order.customer_email || '').trim().toLowerCase() !== email) {
      return NextResponse.json({ success: false, error: '订单不存在' }, { status: 404 });
    }
    const items = await getOrderItems(order.id);
    return NextResponse.json({
      success: true,
      order: {
        order_no: order.order_no,
        customer_name: order.customer_name,
        country_code: order.country_code,
        currency: order.currency,
        subtotal: order.subtotal,
        shipping_fee: order.shipping_fee,
        total_amount: order.total_amount,
        logistic_name: order.logistic_name,
        payment_status: order.payment_status,
        order_status: order.order_status,
        fulfill_status: order.fulfill_status,
        created_at: order.created_at,
        items,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
