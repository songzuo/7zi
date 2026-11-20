// src/lib/settlement.ts
// ============================================================================
// 分账台账 —— 把客户的「一次收款」拆成两条腿
// ----------------------------------------------------------------------------
// 先讲清楚一件必须坦白的事（决定了本模块的设计）：
//
//   1) **无法让客户的钱直接进 CJ 的账户。** CJ 不是支付服务商，它的
//      payUrl / 余额支付只认「我们自己的 CJ 账户」，把链接给客户，CJ 也只会
//      把货款收走 —— 我们一分利润都拿不到，等于白干。
//   2) **不应该把客户刷两次卡。** 拆成两笔真实扣款会让客户看到两次短信、
//      显著抬升拒付/风控概率，且卡组织对"同一订单重复扣款"很敏感。
//
// 所以「拆成 2 笔」在工程上落地为 **一次收款 + 两条腿分账**：
//
//       客户 --(1 笔, 收银台)--> 我方账户
//                                  ├── 成本腿（本单应付 CJ）──> CJ 余额/支付链接 -> 发货
//                                  └── 利润腿（收款 - 成本 - 网关费）-> 留存我方账户
//
//   两条腿各有独立状态机，任一条腿断了都能单独看到、单独重试，
//   「钱到没到 CJ」「这单赚了多少」都能一眼查出来。
//
// 若站长希望钱在**网关层**就分好（利润自动进自己的子账户/第二银行账户），
// 在「支付设置」里填 Paystack 分账代码或 Flutterwave 子账户即可，
// 那时 split_mode='gateway'，本台账仍会记账以保证对账口径统一。
// ============================================================================
import { getShopDb, getOrderByNo, getOrderItems, type ShopOrder, type ShopOrderItem } from "./shop-db";
import { loadPayConfig } from "./pay-config";

export type LegCjStatus = "pending" | "paid" | "unpaid" | "failed" | "skipped";
export type LegProfitStatus = "retained" | "payout_pending" | "paid_out";
export type CostSource = "snapshot" | "estimate";

export interface SettlementRow {
  id: number;
  order_no: string;
  currency: string;
  gross_amount: number;
  goods_cost: number;
  shipping_cost: number;
  cj_cost: number;
  gateway_fee: number;
  profit: number;
  cj_cost_source: CostSource;
  provider: string;
  provider_ref: string;
  split_mode: string;
  leg_cj_status: LegCjStatus;
  leg_cj_method: string;
  leg_cj_ref: string;
  leg_cj_at: string;
  leg_profit_status: LegProfitStatus;
  leg_profit_ref: string;
  leg_profit_at: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface SplitBreakdown {
  orderNo: string;
  currency: string;
  gross: number;
  goodsCost: number;
  shippingCost: number;
  /** 本单应付 CJ 的总额（货 + 运费）= 成本腿 */
  cjCost: number;
  /** 网关手续费估算 */
  gatewayFee: number;
  /** 留存利润 = 收款 - 成本腿 - 网关费 */
  profit: number;
  /** 成本来自冻结快照还是估算（估算意味着上游当时没取到进价） */
  costSource: CostSource;
  /** 利润低于 minProfitUsd，这单可能白干 */
  thinMargin: boolean;
}

function round2(v: number): number {
  return Math.round((Number(v) || 0) * 100) / 100;
}

/**
 * 计算分账明细。
 * 成本优先级：**下单时冻结的 cost_usd 快照**（最准）→ 按我方定价规则反推估算。
 * 反推依据：零售 = max(成本×1.15, 成本+0.80)，区间价取中位近似，
 * 只作对账参考，绝不用于对外报价。
 */
export function computeSplit(
  order: Pick<ShopOrder, "order_no" | "total_amount" | "shipping_fee" | "currency">,
  items: Array<Pick<ShopOrderItem, "sku" | "quantity" | "unit_price" | "cost_usd">>,
  opts: { profitRetainPct?: number | null; feePct?: number; minProfitUsd?: number } = {}
): SplitBreakdown {
  const cfg = loadPayConfig();
  const feePct = opts.feePct ?? cfg.feePct;
  const minProfitUsd = opts.minProfitUsd ?? cfg.minProfitUsd;
  const retainPct = opts.profitRetainPct === undefined ? cfg.profitRetainPct : opts.profitRetainPct;

  const gross = round2(order.total_amount);
  const shippingCost = round2(order.shipping_fee);

  let goodsCost = 0;
  let estimated = false;
  for (const it of items || []) {
    const qty = Math.max(0, Number(it.quantity) || 0);
    const snap = Number(it.cost_usd) || 0;
    if (snap > 0) {
      goodsCost += snap * qty;
    } else {
      // 没有快照 → 按定价规则反推（利润会偏乐观，标记为估算）
      const unit = Number(it.unit_price) || 0;
      goodsCost += (unit / 1.15) * qty;
      estimated = true;
    }
  }
  goodsCost = round2(goodsCost);

  // 成本腿：应付 CJ = 进货成本 + CJ 运费
  let cjCost = round2(goodsCost + shippingCost);
  let profit = round2(gross - cjCost);

  // 站长若设了"利润留存比例"，则按比例切：留存部分为利润，其余全算成本腿。
  // 用途：某些品类希望固定毛利比例，而不是成本加成。
  if (typeof retainPct === "number" && retainPct > 0 && retainPct < 1) {
    const retained = round2(gross * retainPct);
    if (retained < profit) {
      profit = retained;
      cjCost = round2(gross - retained);
    }
    // retained >= profit 时不调整：不能让成本腿低于真实成本，否则付不起 CJ
  }

  const gatewayFee = round2((gross * feePct) / 100);
  const netProfit = round2(profit - gatewayFee);

  return {
    orderNo: order.order_no,
    currency: order.currency || "USD",
    gross,
    goodsCost,
    shippingCost,
    cjCost,
    gatewayFee,
    profit: netProfit,
    costSource: estimated ? "estimate" : "snapshot",
    thinMargin: netProfit < minProfitUsd,
  };
}

/**
 * 记录分账（幂等）：同一个订单号只落一行。
 * 重复回调 / 重复点击都安全 —— 已存在则只刷新收款信息，不覆盖两条腿的推进状态。
 */
export async function recordSettlement(
  orderNo: string,
  info: { provider?: string; ref?: string; splitMode?: string } = {}
): Promise<SettlementRow | null> {
  const order = await getOrderByNo(orderNo);
  if (!order) return null;
  const items = await getOrderItems(order.id);
  const split = computeSplit(order, items);

  const conn = getShopDb();
  const existing = conn.prepare("SELECT * FROM settlements WHERE order_no=?").get(orderNo) as
    | SettlementRow
    | undefined;

  if (existing) {
    conn
      .prepare(
        `UPDATE settlements SET
           gross_amount=?, goods_cost=?, shipping_cost=?, cj_cost=?, gateway_fee=?, profit=?,
           cj_cost_source=?, provider=COALESCE(NULLIF(?,''),provider),
           provider_ref=COALESCE(NULLIF(?,''),provider_ref),
           updated_at=datetime('now')
         WHERE order_no=?`
      )
      .run(
        split.gross,
        split.goodsCost,
        split.shippingCost,
        split.cjCost,
        split.gatewayFee,
        split.profit,
        split.costSource,
        info.provider || "",
        info.ref || "",
        orderNo
      );
    return getSettlement(orderNo);
  }

  conn
    .prepare(
      `INSERT INTO settlements
         (order_no,currency,gross_amount,goods_cost,shipping_cost,cj_cost,gateway_fee,profit,
          cj_cost_source,provider,provider_ref,split_mode,note)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      orderNo,
      split.currency,
      split.gross,
      split.goodsCost,
      split.shippingCost,
      split.cjCost,
      split.gatewayFee,
      split.profit,
      split.costSource,
      info.provider || "",
      info.ref || "",
      info.splitMode || "ledger",
      split.thinMargin ? `利润低于阈值（${split.profit.toFixed(2)} < ${loadPayConfig().minProfitUsd}）` : ""
    );

  return getSettlement(orderNo);
}

export function getSettlement(orderNo: string): SettlementRow | null {
  const row = getShopDb().prepare("SELECT * FROM settlements WHERE order_no=?").get(orderNo) as
    | SettlementRow
    | undefined;
  return row || null;
}

export function listSettlements(limit = 50): SettlementRow[] {
  const n = Math.max(1, Math.min(500, limit));
  return getShopDb()
    .prepare("SELECT * FROM settlements ORDER BY id DESC LIMIT ?")
    .all(n) as SettlementRow[];
}

/** 更新某条腿的状态（付款成功 / 失败 / 已提现等） */
export async function updateSettlementLeg(
  orderNo: string,
  patch: {
    leg_cj_status?: LegCjStatus;
    leg_cj_method?: string;
    leg_cj_ref?: string;
    leg_profit_status?: LegProfitStatus;
    leg_profit_ref?: string;
    note?: string;
    /** 用 CJ 实际扣款额校正成本（比估算更准） */
    actualCjCost?: number;
  }
): Promise<SettlementRow | null> {
  const conn = getShopDb();
  const cur = conn.prepare("SELECT * FROM settlements WHERE order_no=?").get(orderNo) as
    | SettlementRow
    | undefined;
  if (!cur) return null;

  // CJ 实际扣款额到手 → 用它替换估算值重算利润，并标记为快照口径
  if (typeof patch.actualCjCost === "number" && patch.actualCjCost > 0) {
    const cj = round2(patch.actualCjCost);
    const profit = round2(cur.gross_amount - cj - cur.gateway_fee);
    conn
      .prepare(
        `UPDATE settlements SET cj_cost=?, profit=?, cj_cost_source='snapshot', updated_at=datetime('now')
         WHERE order_no=?`
      )
      .run(cj, profit, orderNo);
  }

  conn
    .prepare(
      `UPDATE settlements SET
         leg_cj_status=COALESCE(?,leg_cj_status),
         leg_cj_method=COALESCE(NULLIF(?,''),leg_cj_method),
         leg_cj_ref=COALESCE(NULLIF(?,''),leg_cj_ref),
         leg_cj_at=CASE WHEN ? IS NOT NULL THEN datetime('now') ELSE leg_cj_at END,
         leg_profit_status=COALESCE(?,leg_profit_status),
         leg_profit_ref=COALESCE(NULLIF(?,''),leg_profit_ref),
         leg_profit_at=CASE WHEN ? IS NOT NULL THEN datetime('now') ELSE leg_profit_at END,
         note=CASE WHEN ? <> '' THEN ? ELSE note END,
         updated_at=datetime('now')
       WHERE order_no=?`
    )
    .run(
      patch.leg_cj_status ?? null,
      patch.leg_cj_method || "",
      patch.leg_cj_ref || "",
      patch.leg_cj_status ?? null,
      patch.leg_profit_status ?? null,
      patch.leg_profit_ref || "",
      patch.leg_profit_status ?? null,
      patch.note || "",
      patch.note || "",
      orderNo
    );

  return getSettlement(orderNo);
}

export interface SettlementSummary {
  orders: number;
  gross: number;
  cjCost: number;
  gatewayFee: number;
  profit: number;
  /** 成本腿还没付给 CJ 的金额（欠 CJ 的钱） */
  cjOutstanding: number;
  /** 已经付给 CJ 的金额 */
  cjPaid: number;
  /** 成本是估算口径的单数 —— 数字仅供参考 */
  estimated: number;
  thinMarginOrders: number;
  cfg: { feePct: number; profitRetainPct: number | null; minProfitUsd: number; splitEnabled: boolean };
}

export function settlementSummary(): SettlementSummary {
  const conn = getShopDb();
  const cfg = loadPayConfig();
  const agg = conn
    .prepare(
      `SELECT COUNT(*) AS orders,
              COALESCE(SUM(gross_amount),0) AS gross,
              COALESCE(SUM(cj_cost),0)      AS cjCost,
              COALESCE(SUM(gateway_fee),0)  AS gatewayFee,
              COALESCE(SUM(profit),0)       AS profit,
              COALESCE(SUM(CASE WHEN leg_cj_status IN ('paid') THEN cj_cost ELSE 0 END),0) AS cjPaid,
              COALESCE(SUM(CASE WHEN leg_cj_status IN ('pending','unpaid','failed') THEN cj_cost ELSE 0 END),0) AS cjOutstanding,
              COALESCE(SUM(CASE WHEN cj_cost_source='estimate' THEN 1 ELSE 0 END),0) AS estimated,
              COALESCE(SUM(CASE WHEN profit < ? THEN 1 ELSE 0 END),0) AS thin
         FROM settlements`
    )
    .get(cfg.minProfitUsd) as any;

  return {
    orders: Number(agg?.orders || 0),
    gross: round2(agg?.gross || 0),
    cjCost: round2(agg?.cjCost || 0),
    gatewayFee: round2(agg?.gatewayFee || 0),
    profit: round2(agg?.profit || 0),
    cjPaid: round2(agg?.cjPaid || 0),
    cjOutstanding: round2(agg?.cjOutstanding || 0),
    estimated: Number(agg?.estimated || 0),
    thinMarginOrders: Number(agg?.thin || 0),
    cfg: {
      feePct: cfg.feePct,
      profitRetainPct: cfg.profitRetainPct,
      minProfitUsd: cfg.minProfitUsd,
      splitEnabled: cfg.splitEnabled,
    },
  };
}
