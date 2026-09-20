// src/lib/cj-pay.ts
// ============================================================================
// 「我方 → CJ」付货款 —— 把客户的「一次收款」换成给 CJ 的「一次性付清」
// ----------------------------------------------------------------------------
// 这是「真正的一键代发」的最后一块拼图：客户付完钱，系统自动把货款付给 CJ，
// 订单随即进入 CJ 的发货流程，全程不需要人点。
//
// ## 先讲清楚 CJ 到底提供了什么（实测结论，别再猜）
//
// CJ 建单接口 createOrderV2 的参数 payType 决定「这单将来怎么付钱」：
//
//   payType=1（或省略）页面支付 → 建单即生成发货单，返回 **cjPayUrl**，
//                                订单状态 UNPAID，可付款。**两条腿都能走**。
//   payType=2           余额支付 → 建单时直接走加购/确认/扣款，余额不够就失败。
//   payType=3           仅建单   → **不生成发货单**，订单停在 CREATED，
//                                事后连付款接口都找不到它（1603100 Order not found）。
//
// 也就是说 payType=3 建出来的是**空壳**；payType=1 才是唯一「既能自动扣余额、
// 又能交给人工拿链接去付」的选择。本项目早期用的是 payType=3，等于每单都付不了款。
//
// CJ 的支付接口总共只有三个（官方接口清单）：
//   GET  /shopping/pay/getBalance        查余额
//   POST /shopping/pay/payBalance        orderId         = SD 开头的订单号
//   POST /shopping/pay/payBalanceV2      shipmentOrderId = CJ 开头的发货单号（母单场景必须用它）
// **没有任何接口能为「已存在的订单」补发支付链接** —— 所以 cjPayUrl 必须在
// 建单那一刻抓下来落库（见 cj-fulfill.ts），过期不补。
//
// ## 付款腿的两条走法
//
//   balance 腿：CJ 账户余额 ≥ 应付额 → 直接扣余额，全自动无人值守。
//   page    腿：余额不足 → 把建单时拿到的 cjPayUrl 交给站长，在 CJ 收银台
//               用信用卡 / PayPal / Payoneer / 本地支付把这一单付掉。
//               付完由定时任务回查核验，自动推进订单。
//
// ## 防重复付款（这是本模块最要紧的约束）
//
// 三道闸门，任何一道都足以拦住重复扣款：
//   ① 终态短路：cj_pay_state='paid' 直接返回，连 CJ 都不问。
//   ② **以 CJ 为准核验**：付款前先 getOrderDetail，CJ 说已付就只更正本地状态，
//      绝不发起支付（避免「上次已付成功但回查超时」被误判成没付）。
//   ③ **原子占位**：claimCjPayment() 是带 WHERE 条件的 UPDATE，只有 changes>0
//      的调用方拿到「付款权」，并发回调 / 重复点击 / 定时任务重入都抢不到。
// ============================================================================
import {
  getOrderByNo,
  claimCjPayment,
  updateCjPay,
  markCjPaid,
  ordersAwaitingCjPaySync,
  type ShopOrder,
} from "./shop-db";
import {
  channelOrderDetail,
  channelConfirmOrder,
  detailPaid,
  channelBalance,
  channelPayBalance,
  channelPayBalanceV2,
} from "./cj-channel";
import { updateSettlementLeg } from "./settlement";

/** 走哪条腿付货款 */
export type PayRail = "auto" | "balance" | "page";

export type CjPayOutcome =
  | "paid" // 本次调用把款付掉了（余额腿）
  | "already" // CJ 侧已付，本次只补记了本地状态
  | "awaiting-page" // 需要人工在 CJ 收银台付，链接已给出
  | "busy" // 另一个调用方正在付款，本次未动手
  | "failed"
  | "skipped";

export interface CjPayResult {
  ok: boolean;
  orderNo: string;
  outcome: CjPayOutcome;
  method: "balance" | "page" | "";
  cjOrderId?: string;
  shipmentOrderId?: string;
  /** CJ 收银台付款链接（页面支付腿） */
  payUrl?: string | null;
  payId?: string;
  /** 本单应付 CJ 金额（CJ 侧为准） */
  amountUsd?: number;
  balanceUsd?: number | null;
  /** CJ 侧订单状态原文 */
  cjStatus?: string;
  /** 本地记录到的货款支付腿状态 */
  state?: string;
  message: string;
  error?: string;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** 只读：问 CJ 这笔订单到底付了没（不做任何写操作） */
export async function cjPayStatus(orderNo: string): Promise<{
  orderNo: string;
  paid: boolean;
  cjStatus: string;
  amountUsd: number;
  paymentDate: string;
  shipmentOrderId: string;
  localState: string;
}> {
  const order = await getOrderByNo(orderNo);
  if (!order) throw new Error(`订单不存在：${orderNo}`);
  if (!order.cj_order_id) throw new Error(`订单 ${orderNo} 尚未转入 CJ，无法核验付款状态`);
  const d = await channelOrderDetail(order.cj_order_id);
  const p = detailPaid(d);
  return {
    orderNo,
    paid: p.paid,
    cjStatus: p.status,
    amountUsd: p.amount,
    paymentDate: p.paymentDate,
    shipmentOrderId: String(d?.cjOrderId || order.cj_shipment_order_id || ""),
    localState: order.cj_pay_state || "none",
  };
}

/** 把已付清的事实同时写进分账台账的成本腿，保证对账口径一致 */
async function syncSettlementPaid(orderNo: string, method: string, ref: string, amount: number) {
  try {
    await updateSettlementLeg(orderNo, {
      leg_cj_status: "paid",
      leg_cj_method: method,
      leg_cj_ref: ref,
      ...(amount > 0 ? { actualCjCost: amount } : {}),
    });
  } catch {
    /* 台账写失败不能影响付款结果本身 */
  }
}

/**
 * 付清一笔订单的 CJ 货款（幂等、防重复）。
 *
 * @param orderNo 我方订单号
 * @param opts.rail  auto=余额够就扣、不够给链接（默认）；balance=只允许余额；page=只给链接
 */
export async function payCjOrder(
  orderNo: string,
  opts: { rail?: PayRail } = {}
): Promise<CjPayResult> {
  const order: ShopOrder | null = await getOrderByNo(orderNo);
  if (!order) {
    return { ok: false, orderNo, outcome: "failed", method: "", message: `订单不存在：${orderNo}` };
  }

  // 闸门①：本地已是终态，直接返回，连上游都不问
  if (order.cj_pay_state === "paid") {
    return {
      ok: true, orderNo, outcome: "already", method: (order.cj_pay_method as "balance" | "page") || "",
      cjOrderId: order.cj_order_id, shipmentOrderId: order.cj_shipment_order_id,
      payUrl: order.cj_pay_url || null, payId: order.cj_pay_id || "",
      amountUsd: num(order.cj_pay_amount), state: "paid",
      message: `该订单货款已付清（${order.cj_pay_method || "已付"}），未重复付款。`,
    };
  }

  if (!order.cj_order_id) {
    return {
      ok: false, orderNo, outcome: "skipped", method: "", state: order.cj_pay_state,
      message: `订单 ${orderNo} 尚未转入 CJ，先做履约建单再付货款。`,
    };
  }

  // 闸门②：以 CJ 为准核验 —— 避免「上次已付成功但回查超时」被再付一次
  let detail: any;
  try {
    detail = await channelOrderDetail(order.cj_order_id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // 读失败 ≠ 付款失败。上游限流（1600200 Too Many Requests）或超时都会走到这里，
    // 此时**绝不能把状态打成 failed**：那会让一笔本来健康的「待付货款」订单看起来彻底失败，
    // 而实际上只要下一轮再读一次就恢复正常。
    // 所以这里只记错误、不动状态（占位也尚未获取，无需释放），交给定时任务重试。
    await updateCjPay(orderNo, { error: `核验 CJ 订单失败（可重试）：${msg}` });
    return {
      ok: false, orderNo, outcome: "failed", method: "",
      cjOrderId: order.cj_order_id, state: order.cj_pay_state,
      message: `暂时无法向 CJ 核验该订单（${msg}）。这通常是上游限流或网络抖动，未做任何付款动作，稍后会自动重试。`,
      error: msg,
    };
  }

  let p = detailPaid(detail);

  // 历史空壳单（payType=3）救活：confirmOrder 会把它推到 UNPAID 并补出发货单
  if (!p.paid && (p.status === "CREATED" || p.status === "IN_CART")) {
    try {
      await channelConfirmOrder(order.cj_order_id);
      detail = await channelOrderDetail(order.cj_order_id);
      p = detailPaid(detail);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await updateCjPay(orderNo, { state: "failed", error: `订单确认（救活空壳单）失败：${msg}` });
      return {
        ok: false, orderNo, outcome: "failed", method: "", cjOrderId: order.cj_order_id,
        cjStatus: p.status, state: "failed",
        message: `该 CJ 订单停在 ${p.status || "CREATED"}（早期 payType=3 建单造成），尝试订单确认救活失败：${msg}`,
        error: msg,
      };
    }
  }

  const shipmentOrderId = String(detail?.cjOrderId || order.cj_shipment_order_id || "");
  const amountUsd = p.amount > 0 ? p.amount : num(order.total_amount);

  if (p.paid) {
    await markCjPaid(orderNo, { method: order.cj_pay_method || "page", amount: amountUsd, shipmentOrderId });
    await syncSettlementPaid(orderNo, order.cj_pay_method || "page", shipmentOrderId || order.cj_pay_id, amountUsd);
    return {
      ok: true, orderNo, outcome: "already", method: (order.cj_pay_method as "balance" | "page") || "page",
      cjOrderId: order.cj_order_id, shipmentOrderId, amountUsd, cjStatus: p.status, state: "paid",
      payUrl: order.cj_pay_url || null,
      message: `CJ 侧显示该订单已付款（${p.status}${p.paymentDate ? " · " + p.paymentDate : ""}），已同步本地状态，未重复付款。`,
    };
  }

  // 闸门③：原子占位。抢不到说明有人正在付/已付，本次不动手。
  if (!claimCjPayment(orderNo)) {
    const fresh = await getOrderByNo(orderNo);
    return {
      ok: true, orderNo, outcome: "busy", method: (fresh?.cj_pay_method as "balance" | "page") || "",
      cjOrderId: order.cj_order_id, cjStatus: p.status, state: fresh?.cj_pay_state || "paying",
      payUrl: order.cj_pay_url || null,
      message: `该订单货款正在处理中（状态 ${fresh?.cj_pay_state || "paying"}），本次未重复发起付款。`,
    };
  }

  const rail: PayRail = opts.rail || "auto";
  let balanceUsd: number | null = null;
  let payErr = "";

  // ---- 余额腿 ----
  if (rail === "auto" || rail === "balance") {
    try {
      balanceUsd = (await channelBalance()).amount;
    } catch {
      balanceUsd = null;
    }

    if (balanceUsd !== null && balanceUsd >= amountUsd) {
      try {
        // 母单/合并发货场景必须用 V2 + shipmentOrderId；普通单用 orderId 亦可。
        // 实测：V2 传 CJ 开头的发货单号能正确识别到这笔单。
        if (shipmentOrderId) {
          await channelPayBalanceV2(shipmentOrderId, order.cj_pay_id || undefined);
        } else {
          await channelPayBalance(order.cj_order_id);
        }
        // 扣款后必须回查确认，不能凭接口返回就认成功
        const d2 = await channelOrderDetail(order.cj_order_id);
        const p2 = detailPaid(d2);
        if (p2.paid) {
          const paid = p2.amount > 0 ? p2.amount : amountUsd;
          await markCjPaid(orderNo, { method: "balance", amount: paid, shipmentOrderId });
          await syncSettlementPaid(orderNo, "cj-balance", shipmentOrderId || order.cj_pay_id, paid);
          return {
            ok: true, orderNo, outcome: "paid", method: "balance",
            cjOrderId: order.cj_order_id, shipmentOrderId, amountUsd: paid,
            balanceUsd, cjStatus: p2.status, state: "paid", payUrl: order.cj_pay_url || null,
            message: `已用 CJ 余额付清货款 $${paid.toFixed(2)}（付款前余额 $${balanceUsd.toFixed(2)}），CJ 已接单进入发货流程。`,
          };
        }
        // 接口没报错但状态没变 —— 绝不认成功，留给下一次核验
        await updateCjPay(orderNo, {
          state: "awaiting",
          error: "余额扣款已提交但 CJ 状态未确认，下次核验会自动收敛",
          amount: amountUsd, shipmentOrderId,
        });
        return {
          ok: true, orderNo, outcome: "awaiting-page", method: "balance",
          cjOrderId: order.cj_order_id, shipmentOrderId, amountUsd, balanceUsd,
          cjStatus: p2.status, state: "awaiting", payUrl: order.cj_pay_url || null,
          message: `已提交余额扣款但 CJ 尚未确认（当前 ${p2.status || "未知"}），已安排自动核验；如未成功可改用支付链接。`,
        };
      } catch (e) {
        payErr = e instanceof Error ? e.message : String(e);
      }
    } else if (rail === "balance") {
      payErr = `余额不足（余额 $${(balanceUsd ?? 0).toFixed(2)} < 应付 $${amountUsd.toFixed(2)}）`;
    }
  }

  if (rail === "balance") {
    await updateCjPay(orderNo, { state: "failed", error: payErr || "余额支付失败", amount: amountUsd, shipmentOrderId });
    return {
      ok: false, orderNo, outcome: "failed", method: "balance",
      cjOrderId: order.cj_order_id, shipmentOrderId, amountUsd, balanceUsd, state: "failed",
      message: `余额付款未成功：${payErr || "未知原因"}`, error: payErr,
    };
  }

  // ---- 页面支付腿 ----
  const payUrl = String(order.cj_pay_url || "");
  if (payUrl) {
    const why = payErr
      ? `余额付款不可用（${payErr}）`
      : balanceUsd === null
        ? "余额查询失败"
        : `余额 $${balanceUsd.toFixed(2)} 不足以付清 $${amountUsd.toFixed(2)}`;
    await updateCjPay(orderNo, {
      state: "awaiting", error: why, amount: amountUsd, shipmentOrderId,
    });
    try {
      await updateSettlementLeg(orderNo, { leg_cj_status: "unpaid", leg_cj_method: "cj-page", leg_cj_ref: order.cj_pay_id || "" });
    } catch { /* 台账写失败不影响主流程 */ }
    return {
      ok: true, orderNo, outcome: "awaiting-page", method: "page",
      cjOrderId: order.cj_order_id, shipmentOrderId, payUrl, payId: order.cj_pay_id || "",
      amountUsd, balanceUsd, cjStatus: p.status, state: "awaiting",
      message: `需付 CJ 货款 $${amountUsd.toFixed(2)}（${why}）。已备好 CJ 收银台链接，点一下即可用信用卡/PayPal 付清，付完系统会自动核验并推进发货。`,
    };
  }

  // 既没有余额、也没有支付链接（早期 payType=3 建的单）—— 说清楚，别让人以为系统坏了
  const msg =
    `该订单没有可用的支付链接（早期用 payType=3 建单，CJ 不会为其生成支付页，` +
    `也没有接口能补发）。请二选一：① 给 CJ 账户充值后用「余额付清」；` +
    `② 到 CJ 后台按订单号 ${order.cj_order_id} 手动付款。`;
  await updateCjPay(orderNo, { state: "failed", error: msg, amount: amountUsd, shipmentOrderId });
  return {
    ok: false, orderNo, outcome: "failed", method: "", cjOrderId: order.cj_order_id,
    shipmentOrderId, amountUsd, balanceUsd, cjStatus: p.status, state: "failed",
    message: msg, error: payErr || "缺少支付链接",
  };
}

/**
 * 批量核验 / 补付：给定时任务用。
 * 覆盖三种收敛场景：网页支付已完成、余额刚充值到账、上次失败需重试。
 */
export async function syncCjPayments(limit = 20): Promise<{
  scanned: number;
  paid: number;
  awaiting: number;
  failed: number;
  results: CjPayResult[];
}> {
  const orders = await ordersAwaitingCjPaySync(limit);
  const results: CjPayResult[] = [];
  for (const o of orders) {
    try {
      results.push(await payCjOrder(o.order_no));
    } catch (e) {
      results.push({
        ok: false, orderNo: o.order_no, outcome: "failed", method: "",
        message: e instanceof Error ? e.message : String(e),
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return {
    scanned: orders.length,
    paid: results.filter((r) => r.outcome === "paid" || r.outcome === "already").length,
    awaiting: results.filter((r) => r.outcome === "awaiting-page").length,
    failed: results.filter((r) => r.outcome === "failed").length,
    results,
  };
}
