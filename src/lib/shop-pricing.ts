// src/lib/shop-pricing.ts
// ============================================================================
// 结算/下单的「按行定价」——服务端唯一出价口
// ----------------------------------------------------------------------------
// 为什么必须按变体定价：CJ 的商品级价与变体级价会背离（实测 CJJT1355346：
// 商品级 $7.76、唯一变体 $12.33）。如果收银台按商品级定价、履约却按变体发货，
// 每单都会亏差价。所以：
//   · 客户选了规格 → 用**该规格的进货价** × 加价规则 出价，履约也用同一个 vid
//   · 客户没选规格（单规格商品）→ 用商品级价出价，并尽量锁定"第一个变体"的
//     vid 与成本，让定价与发货锁定同一个变体，避免"标价一个、发货另一个"
//   · 上游查不到成本 → 回落到商品级零售价，并由履约侧的成本闸门兜底
// 前端传来的任何金额一律忽略，只信 sku + vid + qty。
// ============================================================================
import { getProductBySku } from "./catalog-db";
import { readCachedDetail, getDetail, type DetailVariant } from "./cj-detail";
import { resolveVariantInfo } from "./cj-geo";
import { retailFromCost, parseCostRange } from "./pricing";

/** 商品名去重（后半截与前半截重复时截断，常见于 CJ 长名） */
function dedupeName(name: string): string {
  const half = Math.floor(name.length / 2);
  if (half > 5 && name.substring(0, half) === name.substring(half)) {
    return name.substring(0, half).trim();
  }
  return name;
}

export interface LineRequest {
  sku: string;
  vid?: string | null;
  qty?: number;
}

export interface PricedLine {
  sku: string;
  /** 实际参与定价的变体 id（字符串，19 位整数不能转 Number） */
  vid: string | null;
  /** 规格可读名，如 "Black / XL" */
  variantName: string | null;
  name: string;
  image: string;
  qty: number;
  /** 我方进货成本（美元），null = 上游未取到 */
  costUsd: number | null;
  /** 单价（我方零售价，美元） */
  unitPrice: number;
  lineTotal: number;
  /** 定价依据：variant=按变体成本；catalog=按商品级成本 */
  priceSource: "variant" | "catalog";
}

export interface PriceResult {
  ok: boolean;
  lines: PricedLine[];
  subtotal: number;
  totalQty: number;
  /** 商品库中找不到的 SKU */
  missing: string[];
  /**
   * 多规格商品但没选规格、且服务端也锁不到变体的 SKU。
   * 必须让客户选规格，**不能猜价** —— 否则会出现"标价一个规格、发货另一个规格"。
   */
  needsVariant: string[];
  /** 价格回落（上游未取到成本）的 SKU，供前端提示 */
  degraded: string[];
}

/** 在详情缓存里按 vid 找变体；缓存未命中则按需拉一次（走 1 QPS 队列） */
async function findVariant(sku: string, vid: string): Promise<{ variant: DetailVariant | null; fetched: boolean }> {
  const key = String(vid);
  const hit = readCachedDetail(sku);
  if (hit) {
    const v = hit.detail.variants.find((x) => String(x.vid) === key) || null;
    if (v) return { variant: v, fetched: false };
  }
  try {
    const r = await getDetail(sku);
    if (r.ok && r.detail) {
      const v = r.detail.variants.find((x) => String(x.vid) === key) || null;
      return { variant: v, fetched: !r.cached };
    }
  } catch {
    /* 上游失败 → 回落商品级价 */
  }
  return { variant: null, fetched: false };
}

/** 计算单行价格 */
export async function priceLine(input: LineRequest): Promise<PricedLine | null> {
  const sku = String(input.sku || "").trim().toUpperCase();
  if (!sku) return null;
  const qty = Math.max(1, Math.min(999, Number(input.qty) || 1));

  const product = getProductBySku(sku);
  if (!product) return null;

  const name = dedupeName(product.name);
  const image = product.image;
  const catalogRetail = Number(product.price) || 0;

  const vidIn = input.vid === undefined || input.vid === null ? "" : String(input.vid).trim();

  // ---- 情况一：客户选了规格 ----
  if (vidIn) {
    const { variant } = await findVariant(sku, vidIn);
    if (variant && Number.isFinite(Number(variant.price)) && Number(variant.price) > 0) {
      const unitPrice = retailFromCost(Number(variant.price));
      return {
        sku, vid: vidIn, variantName: variant.name || null,
        name, image: variant.image || image, qty,
        costUsd: Number(variant.price), unitPrice,
        lineTotal: Math.round(unitPrice * qty * 100) / 100,
        priceSource: "variant",
      };
    }
    // 变体没查不到成本：仍然保留 vid（履约按它发货），价格回落商品级
    return {
      sku, vid: vidIn, variantName: null, name, image, qty,
      costUsd: null,
      unitPrice: catalogRetail,
      lineTotal: Math.round(catalogRetail * qty * 100) / 100,
      priceSource: "catalog",
    };
  }

  // ---- 情况二：没选规格 ----
  // 判断"是否需要规格"**以详情缓存的真实变体数为准**，而不是只看商品级价格区间。
  // 踩过的坑：商品级价格不是区间、但实际有多个变体的商品真实存在，
  // 光看 priceIsRange 会漏判，导致下单不带 vid —— 定价按商品级、发货按首个变体，
  // 两者成本可能背离，等于把"多规格修复"又开了个后门。
  const cached = readCachedDetail(sku);
  const validVariants = (cached?.detail.variants || []).filter((v) => v.vid);
  const needsVariant = !!product.priceIsRange || validVariants.length > 1;

  if (needsVariant) {
    // 优先用详情缓存里的首个变体（履约用的就是它），缓存没有才问上游
    const first = validVariants[0] || null;
    let chosenVid = first ? String(first.vid) : "";
    let cost: number | null =
      first && Number.isFinite(Number(first.price)) && Number(first.price) > 0 ? Number(first.price) : null;
    if (!chosenVid) {
      try {
        const info = await resolveVariantInfo(sku);
        if (info?.vid) {
          chosenVid = String(info.vid);
          if (cost === null && Number.isFinite(info.price) && info.price > 0) cost = info.price;
        }
      } catch {
        /* 上游失败 → 下面判定为"必须让客户选规格" */
      }
    }
    if (chosenVid) {
      const unitPrice = cost !== null ? retailFromCost(cost) : catalogRetail;
      return {
        sku, vid: chosenVid, variantName: first?.name || null, name,
        image: first?.image || image, qty,
        costUsd: cost, unitPrice,
        lineTotal: Math.round(unitPrice * qty * 100) / 100,
        priceSource: cost !== null ? "variant" : "catalog",
      };
    }
    // 多规格却锁不到任何变体 —— 绝不猜价，交由上层要求客户选规格
    return null;
  }

  return {
    sku, vid: null, variantName: null, name, image, qty,
    costUsd: parseCostRange(product.costPrice || "").low,
    unitPrice: catalogRetail,
    lineTotal: Math.round(catalogRetail * qty * 100) / 100,
    priceSource: "catalog",
  };
}

/**
 * 取某个变体的进货成本 —— 只读详情缓存，不打上游。
 * 履约时用它核算成本（拿不到就返回 null，由成本闸门决定是否放行）。
 */
export function variantCostOf(sku: string, vid: string): number | null {
  if (!sku || !vid) return null;
  const hit = readCachedDetail(sku);
  if (!hit) return null;
  const v = hit.detail.variants.find((x) => String(x.vid) === String(vid));
  const p = Number(v?.price);
  return Number.isFinite(p) && p > 0 ? p : null;
}

/** 整车定价（顺序执行：上游 1 QPS，并发没有意义） */
export async function priceLines(items: LineRequest[]): Promise<PriceResult> {
  const lines: PricedLine[] = [];
  const missing: string[] = [];
  const needsVariant: string[] = [];
  const degraded: string[] = [];
  const seen = new Set<string>();
  const seenVariant = new Set<string>();
  for (const it of items || []) {
    const sku = String(it?.sku || "").trim().toUpperCase();
    if (!sku) continue;
    const p = await priceLine(it);
    if (!p) {
      // priceLine 对「商品不存在」与「多规格没选规格」都返回 null，
      // 但给客户的说法完全不同，这里按商品库是否存在来分桶。
      const inCatalog = !!getProductBySku(sku);
      if (inCatalog) {
        if (!seenVariant.has(sku)) {
          needsVariant.push(sku);
          seenVariant.add(sku);
        }
      } else if (!seen.has(sku)) {
        missing.push(sku);
        seen.add(sku);
      }
      continue;
    }
    if (p.priceSource === "catalog" && p.vid) degraded.push(p.sku);
    lines.push(p);
  }

  const subtotal = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  return { ok: lines.length > 0, lines, subtotal, totalQty, missing, needsVariant, degraded };
}
