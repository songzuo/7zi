// src/lib/cj-fulfill.ts
// ============================================================================
// 履约：把 szspd.cn 的客户订单转成 CJ 代发订单，并付清货款
// ----------------------------------------------------------------------------
// 正确的商业时序（很重要，别搞反）：
//   客户下单 → 落本地库（不碰 CJ）→ 客户付款成功 → 才开始转 CJ 建单 → 付货款 → CJ 发货
// 也就是说「转 CJ」的触发点是**收款成功**，不是下单。否则客户没付钱我们就先垫了货款。
//
// 建单一律用 payType=1（页面支付）。原因见 lib/cj-pay.ts 的长注释：
//   只有 payType=1 既会生成发货单、又返回 cjPayUrl，
//   让我们同时保住「余额自动扣」和「CJ 收银台人工付」两条腿。
//   早期用的 payType=3 建出来的是付不了款的空壳（实测 payBalance 报 1603100 Order not found）。
//
// CJ_FULFILL_MODE 选付款策略：
//   auto（默认）—— 建单后若余额够就直接扣；不够则给出 CJ 支付链接待人工点一下。
//   link        —— 建单后总是给出支付链接，不自动动余额。
//   off         —— 不转入 CJ，只在本地留档（纯人工/暂不发货时用）。
//   注：早期默认值是 link，现在默认 auto —— auto 包含了 link 的行为（余额不够时同样给链接）。
//   CJ_SANDBOX=1 时走沙盒，不产生真实订单与扣费（调试用）。
//
// 成本闸门：转 CJ 前用变体级供货价核对毛利，成交额低于成本（或低于 MIN_MARGIN_USD）
//   则中止转单并落库原因，避免按错误价格亏本发货。force=true 可强行绕过。
//
// 断点续做：若订单已有 cj_order_id 但还没付清（上次建单成功、付款环节中断），
//   本函数**绝不重复建单**（会被上游拒：1603003 Order exist），而是直接接着付款。
// ============================================================================
import { getOrderByNo, getOrderItems, updateOrderFulfillment, markCjPaid } from "./shop-db";
import { channelCreateOrder, channelSandbox } from "./cj-channel";
import { payCjOrder, type CjPayResult } from "./cj-pay";
import { resolveVariantInfo, countryByCode } from "./cj-geo";
import { minMarginUsd } from "./pricing";
import { variantCostOf } from "./shop-pricing";

export type FulfillMode = "link" | "auto" | "off";

export function fulfillMode(): FulfillMode {
  const m = String(process.env.CJ_FULFILL_MODE || "auto").toLowerCase();
  return m === "link" || m === "off" ? (m as FulfillMode) : "auto";
}

export function fulfillsSandbox(): boolean {
  return process.env.CJ_SANDBOX === "1";
}

export interface FulfillResult {
  ok: boolean;
  status: "submitted" | "auto-paid" | "awaiting-payment" | "skipped" | "failed" | "already";
  orderNo: string;
  cjOrderId?: string;
  /** CJ 发货单号（CJ 开头），付款与物流追踪都用它 */
  shipmentOrderId?: string;
  cjPayUrl?: string | null;
  payId?: string;
  /** 实际付款腿：balance / page */
  payMethod?: "balance" | "page" | "";
  /** 本地记到的货款支付腿状态 */
  payState?: string;
  amountUsd?: number;
  balanceUsd?: number;
  /** 本单商品的 CJ 进货成本合计（美元），用于核对毛利 */
  costUsd?: number;
  /** 商品环节毛利 = 成交商品额 - 进货成本（负值代表亏本） */
  goodsMarginUsd?: number;
  /** 成本闸门是否拦下了这一单 */
  blockedByCost?: boolean;
  message: string;
  error?: string;
}

interface FulfillContext {
  cjOrderId: string;
  shipmentOrderId?: string;
  cjPayUrl?: string | null;
  payId?: string;
  costUsd: number;
  goodsMarginUsd: number;
  subtotal: number;
}

/** 把付款引擎的结果翻译成履约结果（两条路径共用，避免口径不一致） */
function toFulfillResult(orderNo: string, pay: CjPayResult, ctx: FulfillContext): FulfillResult {
  const marginNote =
    `商品进价 $${ctx.costUsd.toFixed(2)}，成交额 $${ctx.subtotal.toFixed(2)}，毛利 $${ctx.goodsMarginUsd.toFixed(2)}。`;
  const common: FulfillResult = {
    ok: pay.ok,
    status: "awaiting-payment",
    orderNo,
    cjOrderId: ctx.cjOrderId,
    shipmentOrderId: pay.shipmentOrderId || ctx.shipmentOrderId || "",
    cjPayUrl: pay.payUrl ?? ctx.cjPayUrl ?? null,
    payId: pay.payId || ctx.payId || undefined,
    payMethod: pay.method,
    payState: pay.state,
    amountUsd: pay.amountUsd,
    balanceUsd: pay.balanceUsd ?? undefined,
    costUsd: ctx.costUsd,
    goodsMarginUsd: ctx.goodsMarginUsd,
    message: pay.message,
  };

  if (pay.outcome === "paid" || pay.outcome === "already") {
    return {
      ...common,
      ok: true,
      status: pay.outcome === "paid" ? "auto-paid" : "submitted",
      message: `${pay.message} ${marginNote}`,
    };
  }
  if (pay.outcome === "awaiting-page" || pay.outcome === "busy") {
    return { ...common, ok: true, status: "awaiting-payment" };
  }
  return { ...common, ok: false, status: "awaiting-payment", error: pay.error };
}

/**
 * 把订单转入 CJ 代发并付清货款。
 * @param orderNo 我方订单号（同时作为 CJ 的 orderNumber，天然幂等 —— 重试不会重复下单）
 * @param opts.force 未收款也强制转单（内部测试/手工补单用）
 */
export async function fulfillOrderWithCj(
  orderNo: string,
  opts: { force?: boolean; sandbox?: boolean } = {}
): Promise<FulfillResult> {
  const order = await getOrderByNo(orderNo);
  if (!order) {
    return { ok: false, status: "failed", orderNo, message: `订单不存在：${orderNo}` };
  }

  // 幂等：已建 CJ 单 **且货款确实已付清** → 什么都不做
  // ⚠️ 必须同时判 cj_pay_state，只看 fulfill_status 是错的：
  //   早期 payType=3 时代（以及沙盒写入）会把 fulfill_status 写成 'submitted'，
  //   但货款根本没付。只看 fulfill_status 会让这类订单被**永久短路**，
  //   而且返回值还谎报「货款已付清、未重复付款」—— 结果就是客户的钱收了、
  //   CJ 的货款永远不付、界面却一片绿。真实故障模式，不是理论风险。
  // 判定依据：markCjPaid() 是原子地同时写 cj_pay_state='paid' 与 fulfill_status='submitted'，
  //   所以「真的付清了」必然两者同时成立；只有两者同时成立才算已完成。
  //   未付清的一律放行到下面的「断点续做」分支去续付款 —— 付款引擎自带三道防重复闸门，
  //   真的已付会被闸门②（以 CJ 为准核验）拦下并只补记状态，不会重复扣款。
  if (
    order.cj_order_id &&
    order.fulfill_status === "submitted" &&
    order.cj_pay_state === "paid"
  ) {
    return {
      ok: true, status: "already", orderNo,
      cjOrderId: order.cj_order_id,
      shipmentOrderId: order.cj_shipment_order_id || "",
      cjPayUrl: order.cj_pay_url || null,
      payId: order.cj_pay_id || undefined,
      payMethod: (order.cj_pay_method as "balance" | "page" | "") || "",
      payState: order.cj_pay_state,
      amountUsd: Number(order.cj_pay_amount) || undefined,
      message: `该订单已提交 CJ（${order.cj_order_id}）且货款已付清，未重复下单、未重复付款。`,
    };
  }

  const mode = fulfillMode();
  if (mode === "off" && !opts.force) {
    return { ok: true, status: "skipped", orderNo, message: "CJ_FULFILL_MODE=off，未转入 CJ。" };
  }

  if (order.payment_status !== "paid" && !opts.force) {
    return {
      ok: true, status: "skipped", orderNo,
      message: `订单尚未收款（payment_status=${order.payment_status}），暂不转 CJ。收款后会自动触发。`,
    };
  }

  const items = await getOrderItems(order.id);
  if (items.length === 0) {
    return { ok: false, status: "failed", orderNo, message: "订单没有商品明细，无法转 CJ。" };
  }

  const addr: any = order.shipping_address || {};
  const code = String(order.country_code || addr.countryCode || "").toUpperCase();
  const country = countryByCode(code);
  if (!country) {
    const msg = `订单缺少有效的国家二字码（country_code=${order.country_code || "-"}），无法转 CJ。`;
    await updateOrderFulfillment(orderNo, { fulfill_status: "failed", cj_error: msg });
    return { ok: false, status: "failed", orderNo, message: msg };
  }

  const logisticName = String(order.logistic_name || "").trim();
  if (!logisticName) {
    const msg = "订单没有选定物流渠道（logistic_name 为空），无法转 CJ。";
    await updateOrderFulfillment(orderNo, { fulfill_status: "failed", cj_error: msg });
    return { ok: false, status: "failed", orderNo, message: msg };
  }

  // 解析各商品的变体 id（运费与下单都只认 vid），同时收集变体级供货价
  // 优先级：订单里客户选中的 vid（定价与发货用同一个）→ 回落到首个变体
  const lines: { vid: string; quantity: number }[] = [];
  let goodsCostUsd = 0;
  let costKnown = true;
  for (const it of items) {
    const pickedVid = String((it as any).vid || "").trim();
    const qty = Number(it.quantity) || 1;
    let vid = pickedVid;
    let unitCost: number | null = null;

    if (pickedVid) {
      // 成本只读详情缓存（零上游调用）；缓存没有就退回首个变体价做参考
      unitCost = variantCostOf(it.sku, pickedVid);
      if (unitCost === null) {
        const info = await resolveVariantInfo(it.sku);
        if (info?.vid === pickedVid && Number.isFinite(info.price)) unitCost = info.price;
      }
    } else {
      const info = await resolveVariantInfo(it.sku);
      if (!info?.vid) {
        const msg = `商品 ${it.sku} 无法解析变体（可能已下架），转 CJ 中止。`;
        await updateOrderFulfillment(orderNo, { fulfill_status: "failed", cj_error: msg });
        return { ok: false, status: "failed", orderNo, message: msg };
      }
      vid = String(info.vid);
      unitCost = Number.isFinite(info.price) ? info.price : null;
    }

    if (!vid) {
      const msg = `商品 ${it.sku} 缺少可用的变体 id，转 CJ 中止。`;
      await updateOrderFulfillment(orderNo, { fulfill_status: "failed", cj_error: msg });
      return { ok: false, status: "failed", orderNo, message: msg };
    }

    lines.push({ vid: String(vid), quantity: qty });
    if (unitCost !== null) goodsCostUsd += unitCost * qty;
    else costKnown = false;
  }
  goodsCostUsd = Math.round(goodsCostUsd * 100) / 100;
  const goodsMarginUsd = Math.round((Number(order.subtotal) - goodsCostUsd) * 100) / 100;
  const subtotal = Number(order.subtotal);
  const ctxBase = { costUsd: goodsCostUsd, goodsMarginUsd, subtotal };

  // ---- 成本闸门 ----
  // CJ 商品级 sellPrice 与变体级 variantSellPrice 会不一致（实测 CJJT1355346：
  // 商品级 $7.76 / 变体级 $12.33）。零售价按定价规则换算后，正常情况下毛利
  // 至少是「最低加价额」；这里做最后一道网：毛利低于 MIN_MARGIN_USD 就中止并落库原因，
  // 人工确认后可用 force 强发，避免按错误价格静默亏本发货。
  // 默认值来自 lib/pricing.ts（0.50），可用环境变量 MIN_MARGIN_USD 覆盖。
  const MIN_MARGIN_USD = minMarginUsd();
  if (!opts.force && costKnown && goodsMarginUsd < MIN_MARGIN_USD) {
    const msg =
      `成本闸门拦截：商品成交额 $${Number(order.subtotal).toFixed(2)} 低于 CJ 进货成本 ` +
      `$${goodsCostUsd.toFixed(2)}（毛利 $${goodsMarginUsd.toFixed(2)}，要求不低于 $${MIN_MARGIN_USD.toFixed(2)}）。` +
      `已中止转单以免亏本发货；若确认要发，请在内部通道用「强制转单」。`;
    await updateOrderFulfillment(orderNo, { fulfill_status: "failed", cj_error: msg });
    return {
      ok: false, status: "failed", orderNo, message: msg,
      costUsd: goodsCostUsd, goodsMarginUsd, blockedByCost: true,
    };
  }

  // ---- 断点续做：已有 CJ 单 → 绝不再建，直接接着付款 ----
  // 为什么必须单独一条路：CJ 对同一 orderNumber 重复建单会直接拒绝
  // （实测 1603003 "Order exist, please do not duplicate create"），
  // 所以「上次建单成功、付款中断」的订单只能靠付款引擎续上，不能重跑建单。
  if (order.cj_order_id && !opts.force) {
    const pay = await payCjOrder(orderNo, { rail: mode === "auto" ? "auto" : "page" });
    return toFulfillResult(orderNo, pay, {
      cjOrderId: order.cj_order_id,
      shipmentOrderId: order.cj_shipment_order_id,
      cjPayUrl: order.cj_pay_url,
      payId: order.cj_pay_id,
      ...ctxBase,
    });
  }

  const sandbox = opts.sandbox === true ? true : fulfillsSandbox();

  // 一律 payType=1（页面支付）：
  //   · 会生成发货单（payType=3 不会），订单落在 UNPAID，可付款
  //   · 返回 cjPayUrl —— CJ 没有任何接口能事后补发支付链接，必须此刻抓下来
  //   · 余额足够时我们照样能自己调 payBalance 扣款，不受 payType 影响
  //     所以 payType=1 同时保住了「自动」和「人工」两条腿。
  let created;
  try {
    created = await channelCreateOrder({
      orderNumber: orderNo,
      lines,
      quantity: lines.reduce((s, l) => s + l.quantity, 0),
      logisticName,
      fromCountryCode: "CN",
      shippingCustomerName: order.customer_name,
      shippingPhone: order.customer_phone || "",
      shippingCountryCode: country.code,
      shippingCountry: country.en,
      shippingProvince: addr.province || addr.state || addr.city || "",
      shippingCity: addr.city || "",
      shippingAddress: addr.address || "",
      shippingAddress2: addr.address2 || "",
      shippingZip: addr.zip || "",
      email: order.customer_email,
      remark: `SZSPD ${orderNo}`,
      sandbox,
      payType: 1,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await updateOrderFulfillment(orderNo, { fulfill_status: "failed", cj_error: msg });
    return { ok: false, status: "failed", orderNo, message: `转入 CJ 失败：${msg}`, error: msg };
  }

  const cjOrderId = created.orderId;
  const amountUsd = created.totalAmount;

  // 沙盒：直接模拟支付并推进到已发货前的状态，便于链路自测
  if (sandbox) {
    try {
      await channelSandbox("pay", cjOrderId);
    } catch {
      /* 沙盒首单通常已是已支付状态，失败无妨 */
    }
    await updateOrderFulfillment(orderNo, {
      fulfill_status: "submitted",
      cj_order_id: cjOrderId,
      cj_order_number: created.orderNumber,
      cj_shipment_order_id: created.shipmentOrderId || "",
      cj_pay_id: created.payId || "",
      cj_error: "",
    });
    // 沙盒也必须把货款腿标成 paid：幂等短路现在要求
    // fulfill_status='submitted' 与 cj_pay_state='paid' 同时成立，
    // 只写前者会让沙盒单下次掉进「断点续做」分支、去打真实的付款接口。
    await markCjPaid(orderNo, {
      method: "balance",
      amount: amountUsd,
      shipmentOrderId: created.shipmentOrderId || "",
      payId: created.payId || "",
    });
    return {
      ok: true, status: "submitted", orderNo, cjOrderId,
      shipmentOrderId: created.shipmentOrderId || "", cjPayUrl: null,
      payId: created.payId || undefined, payMethod: "", payState: "paid",
      amountUsd, costUsd: goodsCostUsd, goodsMarginUsd,
      message: `沙盒订单已提交 CJ（${cjOrderId}），金额约 $${amountUsd.toFixed(2)}，未产生真实扣费。` +
        `商品进价 $${goodsCostUsd.toFixed(2)}，成交额 $${subtotal.toFixed(2)}，毛利 $${goodsMarginUsd.toFixed(2)}。`,
    };
  }

  // ---- 先落库，再付款 ----
  // 顺序很关键：CJ 单号 / 发货单号 / 支付链接 / 支付单号必须先持久化。
  // 万一紧接着的付款环节进程崩了或超时，下一次核验仍能凭这些信息续上（见上面的断点续做），
  // 而不是变成「上游有单、本地不知道」的黑洞。
  await updateOrderFulfillment(orderNo, {
    fulfill_status: "awaiting-payment",
    cj_order_id: cjOrderId,
    cj_order_number: created.orderNumber,
    cj_pay_url: created.cjPayUrl || "",
    cj_shipment_order_id: created.shipmentOrderId || "",
    cj_pay_id: created.payId || "",
    cj_error: "",
  });

  // ---- 付货款：交给统一付款引擎，它自己挑「余额」还是「CJ 收银台」 ----
  // rail=auto 时余额够就自动扣；rail=page 时总是走支付链接（人工点一下）。
  const pay = await payCjOrder(orderNo, { rail: mode === "auto" ? "auto" : "page" });
  return toFulfillResult(orderNo, pay, {
    cjOrderId,
    shipmentOrderId: created.shipmentOrderId || "",
    cjPayUrl: created.cjPayUrl,
    payId: created.payId || undefined,
    ...ctxBase,
  });
}
