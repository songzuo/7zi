import { NextRequest, NextResponse } from "next/server";
import {
  WS_COOKIE,
  channelAccessToken,
  channelAccount,
  channelBalance,
  channelPayBalance,
  channelPayBalanceV2,
  channelSearch,
  channelProduct,
  channelVariants,
  channelFreight,
  channelCreateOrder,
  channelListOrders,
  channelOrderDetail,
  channelSandbox,
  channelSelfTest,
  readChannelLog,
  queueBusy,
  orderStatusLabel,
} from "@/lib/cj-channel";
import { listOrders, getOrderByNo, markOrderPaid, ordersAwaitingCjPayment, ordersTrackable, updateOrderCjStatus, updateOrderFulfillment, updateCjPay } from "@/lib/shop-db";
import { fulfillOrderWithCj, fulfillMode, fulfillsSandbox } from "@/lib/cj-fulfill";
import { payCjOrder, syncCjPayments, cjPayStatus, type PayRail } from "@/lib/cj-pay";
import { pricingSummary } from "@/lib/pricing";
import { providerStatus } from "@/lib/pay-gateway";
import {
  savePayConfig,
  payConfigPublic,
  payConfigIssues,
  type PayConfig,
} from "@/lib/pay-config";
import {
  listSettlements,
  getSettlement,
  settlementSummary,
  updateSettlementLeg,
  recordSettlement,
  type LegCjStatus,
  type LegProfitStatus,
} from "@/lib/settlement";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function gate(req: NextRequest): boolean {
  const cookie = req.cookies.get(WS_COOKIE)?.value || "";
  return !!cookie && cookie === channelAccessToken();
}

function denied() {
  return NextResponse.json({ ok: false, error: "未通过口令校验" }, { status: 401 });
}

function fail(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ ok: false, error: msg }, { status: 502 });
}

// ---------------------------------------------------------------------------
// GET —— 只读操作
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  if (!gate(req)) return denied();
  const sp = req.nextUrl.searchParams;
  const action = (sp.get("action") || "account").trim();

  try {
    switch (action) {
      case "account": {
        const account = await channelAccount();
        return NextResponse.json({ ok: true, account, queueBusy: queueBusy() });
      }
      case "search": {
        const q = sp.get("q") || "";
        const page = Number(sp.get("page") || 1);
        const size = Number(sp.get("size") || 20);
        const r = await channelSearch(q, page, size);
        return NextResponse.json({ ok: true, ...r, query: q, page });
      }
      case "product": {
        const sku = sp.get("sku") || "";
        const p = await channelProduct(sku);
        return NextResponse.json({ ok: true, product: p });
      }
      case "variants": {
        const sku = sp.get("sku") || "";
        const variants = await channelVariants(sku);
        return NextResponse.json({ ok: true, variants });
      }
      case "freight": {
        const options = await channelFreight({
          vid: sp.get("vid") || undefined,
          variantSku: sp.get("variantSku") || undefined,
          quantity: Number(sp.get("qty") || 1),
          endCountryCode: sp.get("to") || "GH",
          startCountryCode: sp.get("from") || "CN",
        });
        return NextResponse.json({ ok: true, options });
      }
      case "orders": {
        const r = await channelListOrders(Number(sp.get("page") || 1), Number(sp.get("size") || 10));
        return NextResponse.json({ ok: true, ...r });
      }
      case "order": {
        const orderId = sp.get("orderId") || "";
        const detail = await channelOrderDetail(orderId);
        return NextResponse.json({ ok: true, detail });
      }
      case "log": {
        return NextResponse.json({ ok: true, log: readChannelLog() });
      }
      // 账户余额（付货款用）
      case "balance": {
        const balance = await channelBalance();
        // 低余额阈值：余额低于它时面板会显式告警。
        // 余额充值只能由主人在 CJ 后台操作，系统无法代充 —— 所以必须提前提醒，
        // 否则客户已付款的订单会卡在「待付货款」，货发不出去。
        const lowBalanceUsd = Number(process.env.CJ_LOW_BALANCE_USD || 50);
        return NextResponse.json({
          ok: true,
          balance,
          mode: fulfillMode(),
          sandbox: fulfillsSandbox(),
          lowBalanceUsd,
          pricing: pricingSummary(),
        });
      }
      // 店铺订单（客户在 szspd.cn 下的单）
      case "shop-orders": {
        const limit = Math.min(100, Math.max(1, Number(sp.get("size") || 30)));
        const orders = await listOrders(limit);
        return NextResponse.json({ ok: true, orders, count: orders.length });
      }
      case "shop-order": {
        const orderNo = sp.get("orderNo") || "";
        const order = await getOrderByNo(orderNo);
        if (!order) return NextResponse.json({ ok: false, error: "订单不存在" }, { status: 404 });
        return NextResponse.json({ ok: true, order });
      }
      /** 只读核验：问 CJ 这笔订单到底付了没（不写任何东西，可放心点） */
      case "cj-pay-status": {
        const orderNo = sp.get("orderNo") || "";
        if (!orderNo) return NextResponse.json({ ok: false, error: "orderNo 必填" }, { status: 400 });
        try {
          return NextResponse.json({ ok: true, ...(await cjPayStatus(orderNo)) });
        } catch (e) {
          return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : String(e) },
            { status: 400 }
          );
        }
      }
      // 支付配置（**只回掩码**，明文密钥永不出进程）
      case "pay-config": {
        return NextResponse.json({
          ok: true,
          config: payConfigPublic(),
          issues: payConfigIssues(),
          provider: providerStatus(),
        });
      }
      // 分账台账：一次收款拆成的两条腿
      case "settlements": {
        const limit = Math.min(500, Math.max(1, Number(sp.get("size") || 50)));
        const orderNo = sp.get("orderNo") || "";
        return NextResponse.json({
          ok: true,
          summary: settlementSummary(),
          settlement: orderNo ? getSettlement(orderNo) : null,
          rows: listSettlements(limit),
        });
      }
      default:
        return NextResponse.json({ ok: false, error: `未知 action: ${action}` }, { status: 400 });
    }
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// POST —— 写操作（创建订单 / 沙盒推进 / 自检）
// ---------------------------------------------------------------------------

const REAL_CONFIRM_WORD = "REAL";

export async function POST(req: NextRequest) {
  if (!gate(req)) return denied();

  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const action = String(body?.action || "").trim();

  try {
    if (action === "create-order") {
      const sandbox = body.sandbox !== false; // 默认沙盒
      if (!sandbox) {
        // 真实下单：三重闸门，缺一不可
        if (body.confirmReal !== true || String(body.confirmWord || "").trim().toUpperCase() !== REAL_CONFIRM_WORD) {
          return NextResponse.json(
            { ok: false, error: "真实下单被拒绝：需要 confirmReal=true 且确认词 REAL" },
            { status: 400 }
          );
        }
      }
      const result = await channelCreateOrder({
        orderNumber: body.orderNumber,
        vid: body.vid,
        sku: body.sku,
        quantity: Number(body.quantity || 1),
        logisticName: String(body.logisticName || "").trim(),
        fromCountryCode: body.fromCountryCode || "CN",
        shippingCustomerName: String(body.shippingCustomerName || "").trim(),
        shippingPhone: body.shippingPhone,
        shippingCountryCode: String(body.shippingCountryCode || "").trim().toUpperCase(),
        shippingCountry: String(body.shippingCountry || "").trim(),
        shippingProvince: String(body.shippingProvince || "").trim(),
        shippingCity: String(body.shippingCity || "").trim(),
        shippingAddress: String(body.shippingAddress || "").trim(),
        shippingAddress2: body.shippingAddress2,
        shippingZip: body.shippingZip,
        houseNumber: body.houseNumber,
        email: body.email,
        remark: body.remark,
        sandbox,
        payType: body.payType,
      });
      return NextResponse.json(result);
    }

    if (action === "sandbox") {
      const sub = String(body.sub || "");
      const orderId = String(body.orderId || "").trim();
      const value = body.value === undefined || body.value === null ? undefined : String(body.value).trim();
      if (sub !== "pay" && sub !== "status" && sub !== "track") {
        return NextResponse.json({ ok: false, error: "sub 必须是 pay / status / track" }, { status: 400 });
      }
      if (!orderId) return NextResponse.json({ ok: false, error: "orderId 必填" }, { status: 400 });
      if ((sub === "status" || sub === "track") && !value) {
        return NextResponse.json({ ok: false, error: "该操作需要 value" }, { status: 400 });
      }
      const data = await channelSandbox(sub, orderId, value);
      return NextResponse.json({ ok: true, data });
    }

    if (action === "selftest") {
      const r = await channelSelfTest(String(body.sku || "CJJT1355346"), String(body.to || "GH"));
      return NextResponse.json({ ok: true, ...r });
    }

    // ---- 付货款给 CJ ----
    if (action === "pay-balance") {
      const orderId = String(body.orderId || "").trim();
      if (!orderId) return NextResponse.json({ ok: false, error: "orderId 必填" }, { status: 400 });
      const data = await channelPayBalance(orderId);
      return NextResponse.json({ ok: true, data });
    }

    if (action === "pay-balance-v2") {
      const shipmentOrderId = String(body.shipmentOrderId || "").trim();
      if (!shipmentOrderId) return NextResponse.json({ ok: false, error: "shipmentOrderId 必填" }, { status: 400 });
      const data = await channelPayBalanceV2(shipmentOrderId);
      return NextResponse.json({ ok: true, data });
    }

    /** 建单并直接取 CJ 支付链接（payType=1）—— 人工付货款用 */
    if (action === "create-pay-link") {
      const result = await channelCreateOrder({
        orderNumber: body.orderNumber,
        vid: body.vid,
        sku: body.sku,
        quantity: Number(body.quantity || 1),
        lines: Array.isArray(body.lines) ? body.lines : undefined,
        logisticName: String(body.logisticName || "").trim(),
        fromCountryCode: body.fromCountryCode || "CN",
        shippingCustomerName: String(body.shippingCustomerName || "").trim(),
        shippingPhone: body.shippingPhone,
        shippingCountryCode: String(body.shippingCountryCode || "").trim().toUpperCase(),
        shippingCountry: String(body.shippingCountry || "").trim(),
        shippingProvince: String(body.shippingProvince || "").trim(),
        shippingCity: String(body.shippingCity || "").trim(),
        shippingAddress: String(body.shippingAddress || "").trim(),
        shippingAddress2: body.shippingAddress2,
        shippingZip: body.shippingZip,
        email: body.email,
        remark: body.remark,
        sandbox: body.sandbox !== false,
        payType: 1,
      });
      return NextResponse.json(result);
    }

    // -----------------------------------------------------------------------
    // 付清 CJ 货款（「我方 → CJ」这条腿）—— 真正的一键代发
    // -----------------------------------------------------------------------
    // 一次收款、一次性付清：客户在我们这里的钱已经到账，这里只负责把
    // 应付给 CJ 的那部分（进货成本 + 运费）付掉，让 CJ 开始发货。
    // 幂等 + 防重复付款由 lib/cj-pay.ts 的三道闸门保证（终态短路 / 以 CJ 为准 / 原子占位）。

    /**
     * 付清某单的 CJ 货款。
     * rail: auto（默认，余额够就自动扣，不够回链接）| balance（只走余额）| page（只给链接）
     */
    if (action === "pay-cj") {
      const orderNo = String(body.orderNo || "").trim();
      if (!orderNo) return NextResponse.json({ ok: false, error: "orderNo 必填" }, { status: 400 });
      const rail: PayRail = ["auto", "balance", "page"].includes(String(body.rail))
        ? (String(body.rail) as PayRail)
        : "auto";
      return NextResponse.json(await payCjOrder(orderNo, { rail }));
    }

    /**
     * 批量核验 / 补付：把「客户已付款但货款没付给 CJ」的订单收敛掉。
     * 覆盖三种场景：CJ 收银台网页已付完、余额刚充值到账、上次失败需重试。
     * 由服务器定时任务每 10 分钟调用 —— 这是全自动链路的收尾环。
     */
    if (action === "cj-pay-sync") {
      const limit = Math.min(50, Math.max(1, Number(body.limit || 10)));
      const r = await syncCjPayments(limit);
      return NextResponse.json({ ok: true, ...r });
    }

    /**
     * 人工解除占位：把卡在 paying 的订单放回可重试状态。
     * 用途：付款请求发出后进程被杀、或人工已在 CJ 后台自行付款/取消，导致占位没释放。
     * 安全前提：不允许对已付清的订单解锁（那会导致重复付款）。
     */
    if (action === "cj-pay-release") {
      const orderNo = String(body.orderNo || "").trim();
      if (!orderNo) return NextResponse.json({ ok: false, error: "orderNo 必填" }, { status: 400 });
      const order = await getOrderByNo(orderNo);
      if (!order) return NextResponse.json({ ok: false, error: "订单不存在" }, { status: 404 });
      if (order.cj_pay_state === "paid") {
        return NextResponse.json(
          { ok: false, error: "该单货款已付清，为防重复付款不予解锁。" },
          { status: 409 }
        );
      }
      await updateCjPay(orderNo, {
        state: "failed",
        error: String(body.note || "人工解除占位，可重新付款"),
      });
      return NextResponse.json({ ok: true, order: await getOrderByNo(orderNo) });
    }

    // ---- 店铺订单履约（客户付款后转 CJ 代发）----
    /** 标记订单已收款（人工确认微信/MoMo/银行转账时用） */
    if (action === "mark-paid") {
      const orderNo = String(body.orderNo || "").trim();
      if (!orderNo) return NextResponse.json({ ok: false, error: "orderNo 必填" }, { status: 400 });
      const order = await markOrderPaid(orderNo, {
        provider: String(body.provider || "manual"),
        ref: String(body.ref || ""),
      });
      if (!order) return NextResponse.json({ ok: false, error: "订单不存在" }, { status: 404 });
      // 收款后立即尝试转 CJ（失败不影响标记结果）
      let fulfill: unknown = null;
      try {
        fulfill = await fulfillOrderWithCj(orderNo);
      } catch (e) {
        fulfill = { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
      return NextResponse.json({ ok: true, order, fulfill });
    }

    /** 手动把单个店铺订单转入 CJ（force 可跳过收款校验，sandbox=true 强制走沙盒） */
    if (action === "fulfill") {
      const orderNo = String(body.orderNo || "").trim();
      if (!orderNo) return NextResponse.json({ ok: false, error: "orderNo 必填" }, { status: 400 });
      const result = await fulfillOrderWithCj(orderNo, {
        force: body.force === true,
        sandbox: body.sandbox === true,
      });
      return NextResponse.json(result);
    }

    /** 批量补单：把所有「已收款但未转 CJ」的订单依次转入 */
    if (action === "fulfill-pending") {
      const orders = await listOrders(100);
      const targets = orders.filter((o) => o.payment_status === "paid" && o.fulfill_status !== "submitted");
      const results: unknown[] = [];
      for (const o of targets) {
        try {
          results.push(await fulfillOrderWithCj(o.order_no));
        } catch (e) {
          results.push({ orderNo: o.order_no, ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      }
      return NextResponse.json({ ok: true, scanned: orders.length, pending: targets.length, results });
    }

    /**
     * 自动补付（全自动链路的收尾环）：扫描「客户已付款、但货款还没付给 CJ」的订单。
     * 每一步都交给履约引擎，它内部会判断：
     *   · 还没转 CJ   → 先建单（payType=1，拿到支付链接）
     *   · 已建过 CJ 单 → 绝不再建单，直接续付款（重复建单会被上游拒）
     *   · 已付清      → 直接返回 already，不会重复付款
     * 由服务器定时任务每 10 分钟调用，客户付款后无需任何人工介入。
     * 成本闸门拦下的单不会在这里被强发（会明确报出来，等人确认）。
     */
    if (action === "auto-pay-pending") {
      const limit = Math.min(50, Math.max(1, Number(body.limit || 10)));
      const orders = await ordersAwaitingCjPayment(limit);
      const results: Record<string, unknown>[] = [];
      let paid = 0;
      let awaiting = 0;
      let failed = 0;

      for (const o of orders) {
        // 成本闸门拦下的订单留给人工判断，自动化不得绕过
        if (o.fulfill_status === "failed" && /成本闸门/.test(o.cj_error || "")) {
          results.push({ orderNo: o.order_no, status: "cost-gate", message: "被成本闸门拦下，需人工确认后强制转单" });
          continue;
        }
        try {
          const r = await fulfillOrderWithCj(o.order_no);
          results.push({
            orderNo: o.order_no, status: r.status, payMethod: r.payMethod,
            payState: r.payState, amountUsd: r.amountUsd, message: r.message,
          });
          if (r.status === "auto-paid" || r.status === "submitted" || r.status === "already") paid++;
          else if (r.status === "awaiting-payment") awaiting++;
          else failed++;
        } catch (e) {
          failed++;
          results.push({ orderNo: o.order_no, status: "failed", error: e instanceof Error ? e.message : String(e) });
        }
      }

      let balanceUsd: number | null = null;
      try {
        balanceUsd = (await channelBalance()).amount;
      } catch {
        balanceUsd = null;
      }

      return NextResponse.json({ ok: true, scanned: orders.length, paid, awaiting, failed, balanceUsd, results });
    }

    /** 同步 CJ 侧订单状态（物流进度），写回 cj_status 供面板展示 */
    if (action === "cj-status-sync") {
      const limit = Math.min(50, Math.max(1, Number(body.limit || 10)));
      const orders = await ordersTrackable(limit);
      const results: Record<string, unknown>[] = [];
      for (const o of orders) {
        try {
          const d = await channelOrderDetail(o.cj_order_id);
          const raw = String(d?.orderStatus ?? d?.status ?? "").trim();
          const label = raw ? orderStatusLabel(raw) || raw : "";
          if (label) await updateOrderCjStatus(o.order_no, label);
          results.push({ orderNo: o.order_no, cjStatus: label || raw, trackNumber: d?.trackNumber || "" });
        } catch (e) {
          results.push({ orderNo: o.order_no, error: e instanceof Error ? e.message : String(e) });
        }
      }
      return NextResponse.json({ ok: true, scanned: orders.length, results });
    }

    // -----------------------------------------------------------------------
    // 支付设置：站长自助配置网关密钥（写入 data/pay-config.json，即时生效）
    // -----------------------------------------------------------------------
    if (action === "pay-config-save") {
      const patch = (body.patch || {}) as Partial<PayConfig>;
      // 只允许白名单字段，避免前端顺手写进 updatedBy 之类的内部控制字段
      const allowed: (keyof PayConfig)[] = [
        "provider",
        "currency",
        "fxGhs",
        "fxNgn",
        "paystackSecretKey",
        "paystackPublicKey",
        "paystackSecretHash",
        "paystackSplitCode",
        "flutterwaveSecretKey",
        "flutterwaveSecretHash",
        "flutterwaveSubaccounts",
        "feePct",
        "splitEnabled",
        "profitRetainPct",
        "minProfitUsd",
      ];
      const clean: Partial<PayConfig> = {};
      for (const k of allowed) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) (clean as any)[k] = (patch as any)[k];
      }
      savePayConfig(clean, String(body.by || "admin"));
      return NextResponse.json({
        ok: true,
        config: payConfigPublic(),
        issues: payConfigIssues(),
        provider: providerStatus(),
        message: "支付配置已保存并即时生效（无需重启）。",
      });
    }

    // 某条腿的状态推进（成本腿人工标记已付 / 利润腿标记已提现）
    if (action === "settlement-leg") {
      const orderNo = String(body.orderNo || "").trim();
      if (!orderNo) return NextResponse.json({ ok: false, error: "缺少 orderNo" }, { status: 400 });
      const cjLeg = body.legCjStatus ? (String(body.legCjStatus) as LegCjStatus) : undefined;
      const profitLeg = body.legProfitStatus ? (String(body.legProfitStatus) as LegProfitStatus) : undefined;
      const row = await updateSettlementLeg(orderNo, {
        leg_cj_status: cjLeg,
        leg_profit_status: profitLeg,
        leg_cj_method: body.legCjMethod ? String(body.legCjMethod) : undefined,
        leg_cj_ref: body.legCjRef ? String(body.legCjRef) : undefined,
        leg_profit_ref: body.legProfitRef ? String(body.legProfitRef) : undefined,
        note: body.note ? String(body.note) : undefined,
        actualCjCost: Number(body.actualCjCost) > 0 ? Number(body.actualCjCost) : undefined,
      });
      if (!row) return NextResponse.json({ ok: false, error: "该订单没有分账记录" }, { status: 404 });
      return NextResponse.json({ ok: true, settlement: row });
    }

    // 按订单重算分账（改了定价/成本后用于纠偏）
    if (action === "settlement-recompute") {
      const orderNo = String(body.orderNo || "").trim();
      if (!orderNo) return NextResponse.json({ ok: false, error: "缺少 orderNo" }, { status: 400 });
      const row = await recordSettlement(orderNo, {});
      if (!row) return NextResponse.json({ ok: false, error: "订单或分账记录不存在" }, { status: 404 });
      return NextResponse.json({ ok: true, settlement: row, summary: settlementSummary() });
    }

    return NextResponse.json({ ok: false, error: `未知 action: ${action}` }, { status: 400 });
  } catch (e) {
    return fail(e);
  }
}
