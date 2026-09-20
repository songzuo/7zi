// src/lib/pricing.ts
// ============================================================================
// 定价：CJ 供货成本 → 我方零售价（全站唯一真相）
// ----------------------------------------------------------------------------
// 背景（为什么要做这个文件）：
//   商城此前直接展示 CJ 的商品级 sellPrice —— 那是我方的**进货成本**，
//   等于零毛利销售。审计 40 个抽样商品：亏本 3 个 / 毛利 0% 的 37 个 / 有毛利 0 个。
//   且 CJ 的商品级价与变体级价会背离（实测 CJJT1355346：商品级 $7.76、变体 $12.33）。
//
// 定价规则（保守起步，可以只用环境变量调，不用改代码）：
//   零售价 = max(成本 × (1 + 加价率), 成本 + 最低加价额)，再向上取到 0.5 的整数倍后减 0.01
//   默认：加价率 15%、最低加价 $0.80 → 价格尾数只会出现 .49 / .99
//
// 为什么最低加价额是必须的：一个 $0.80 的饰品按 15% 只能加 $0.12，
// 而每单固定要摊掉的支付通道费、汇损、客服与退换风险远超这个数。
// $0.80 是最保守的覆盖线，先站住不亏，后续要提就调 PRICE_MARKUP_PCT。
//
// 环境变量：
//   PRICE_MARKUP_PCT    加价率百分比，默认 15
//   PRICE_MIN_ADD_USD   单件最低加价额（美元），默认 0.80
//   MIN_MARGIN_USD      履约成本闸门的最低毛利（美元），默认 0.50
// ============================================================================

/** 加价率（百分比） */
export function markupPct(): number {
  const v = Number(process.env.PRICE_MARKUP_PCT);
  return Number.isFinite(v) && v >= 0 ? v : 15;
}

/** 单件最低加价额（美元） */
export function minAddUsd(): number {
  const v = Number(process.env.PRICE_MIN_ADD_USD);
  return Number.isFinite(v) && v >= 0 ? v : 0.8;
}

/** 履约成本闸门的最低毛利（美元） */
export function minMarginUsd(): number {
  const v = Number(process.env.MIN_MARGIN_USD);
  return Number.isFinite(v) && v >= 0 ? v : 0.5;
}

/** 价格尾数规整：向上取到 0.5 的倍数再减 0.01 → 只会出现 .49 / .99 */
export function charmRound(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const stepped = Math.ceil(amount / 0.5) * 0.5;
  const v = stepped - 0.01;
  return Math.round(v * 100) / 100;
}

/**
 * 成本（美元）→ 零售价（美元）。
 * @param cost 我方进货成本，含 CJ 变体供货价
 */
export function retailFromCost(cost: number): number {
  const c = Number(cost);
  if (!Number.isFinite(c) || c <= 0) return 0;
  const graded = c * (1 + markupPct() / 100);
  const floored = c + minAddUsd();
  return charmRound(Math.max(graded, floored));
}

/** 单件商品环节毛利（零售 - 成本），用于审计与闸门提示 */
export function goodsMargin(retail: number, cost: number): number {
  if (!Number.isFinite(retail) || !Number.isFinite(cost)) return 0;
  return Math.round((retail - cost) * 100) / 100;
}

/** 把上游价格字符串（可能是 "7.76" 或 "4.84-7.31"）解析出下界/上界 */
export function parseCostRange(raw: string): { low: number | null; high: number | null } {
  const s = String(raw ?? "");
  const nums = s.match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) return { low: null, high: null };
  const low = Number(nums[0]);
  const high = nums.length > 1 ? Number(nums[1]) : null;
  return {
    low: Number.isFinite(low) ? low : null,
    high: high !== null && Number.isFinite(high) ? high : null,
  };
}

export interface RetailLabel {
  /** 展示用价格字符串，如 "8.99" 或 "5.99-8.99" */
  label: string;
  /** 下界数字，用于排序与"起价"展示 */
  from: number;
  /** 是否区间价（多规格且价格不一） */
  isRange: boolean;
  /** 对应的成本下界/上界，便于审计 */
  costLow: number | null;
  costHigh: number | null;
}

/** 上游成本字符串 → 零售展示价（区间价两端一起加价） */
export function retailLabelFromCost(raw: string): RetailLabel {
  const { low, high } = parseCostRange(raw);
  if (low === null) return { label: String(raw ?? ""), from: 0, isRange: false, costLow: null, costHigh: null };
  const rLow = retailFromCost(low);
  if (high !== null && high > low) {
    const rHigh = retailFromCost(high);
    if (rHigh > rLow) {
      return { label: `${rLow.toFixed(2)}-${rHigh.toFixed(2)}`, from: rLow, isRange: true, costLow: low, costHigh: high };
    }
  }
  return { label: rLow.toFixed(2), from: rLow, isRange: false, costLow: low, costHigh: null };
}

/** 定价说明（内部通道展示用） */
export function pricingSummary(): string {
  return `加价率 ${markupPct()}% + 最低加价 $${minAddUsd().toFixed(2)}，尾数 .49/.99；履约最低毛利 $${minMarginUsd().toFixed(2)}`;
}
