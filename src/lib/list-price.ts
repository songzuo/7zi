// src/lib/list-price.ts
// ============================================================================
// 列表页价格：优先用「详情缓存里按变体成本算出的零售价」
// ----------------------------------------------------------------------------
// 问题背景：商品库里的价格来自 CJ 列表接口的**商品级** sellPrice，会与变体级价背离
// （实测 CJJT1355346：商品级 $7.76 → 零售 $8.99，但唯一变体实际 $12.33 → 零售 $14.49）。
// 若列表显示 $8.99、详情页显示 $14.49，客户会认为是虚假标价。
//
// 解决：只要该商品的详情已经缓存过（有人访问过，或夜间预热任务跑过），
// 列表就改用变体成本算价 —— 与详情页、结算、履约四处始终一致；
// 未缓存的商品退回商品级估算价，并靠夜间预热任务逐步收敛。
// ============================================================================
import { readCachedDetail } from "./cj-detail";
import { retailFromCost } from "./pricing";
import type { CatalogProduct } from "./cj-data";

export interface ListPrice {
  /** 展示用价格串（不带 From 前缀），如 "14.49" 或 "5.99-8.99" */
  label: string;
  /** 下界数字，用于排序与起价展示 */
  from: number;
  /** 是否区间价 */
  isRange: boolean;
  /** 价格依据：detail=变体成本（准确）；catalog=商品级估算（待预热校正） */
  source: "detail" | "catalog";
}

export function listPriceOf(p: CatalogProduct): ListPrice {
  if (!p) return { label: "-", from: 0, isRange: false, source: "catalog" };

  const hit = readCachedDetail(String(p.sku));
  if (hit) {
    const prices = (hit.detail.variants || [])
      .map((v) => Number(v.price))
      .filter((x) => Number.isFinite(x) && x > 0)
      .map((x) => retailFromCost(x));
    if (prices.length > 0) {
      const from = Math.min(...prices);
      const to = Math.max(...prices);
      return {
        label: to > from ? `${from.toFixed(2)}-${to.toFixed(2)}` : from.toFixed(2),
        from,
        isRange: to > from,
        source: "detail",
      };
    }
  }

  return {
    label: p.price,
    from: p.priceFrom || 0,
    isRange: !!p.priceIsRange,
    source: "catalog",
  };
}

/** 展示串：区间价前面加 "From " */
export function listPriceDisplay(p: CatalogProduct): string {
  const lp = listPriceOf(p);
  const low = lp.label.split("-")[0];
  return lp.isRange ? `From $${low}` : `$${low}`;
}
