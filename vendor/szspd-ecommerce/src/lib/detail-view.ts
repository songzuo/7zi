// src/lib/detail-view.ts
// ============================================================================
// 详情视图模型（服务端专用）
// ----------------------------------------------------------------------------
// 把 CJ 详情（成本价）+ 商品库（商品级零售价）合成前端可以直接渲染的视图：
//   · 每个变体都带**我方零售价**（按变体成本 × 加价规则算）
//   · 变体没有成本价时回落商品级零售价，并标记 degraded=true 供 UI 提示
// 价格只在这里算一次（服务端），前端绝不再自己算钱 —— 避免前后端定价规则漂移。
// ============================================================================
import type { ProductDetailData, DetailVariant } from "./cj-detail";
import { retailFromCost } from "./pricing";

export interface VariantView {
  vid: string;
  variantSku: string;
  /** 规格可读名，如 "Black / XL"；无规格时为空串 */
  name: string;
  image: string | null;
  /** 我方进货成本（美元） */
  costUsd: number | null;
  /** 我方零售单价（美元） */
  price: number;
  /** 展示串，如 "$12.99" */
  priceLabel: string;
  weightGrams: number | null;
  /** 成本缺失、价格用商品级价回落的标记 */
  degraded: boolean;
}

export interface DetailView {
  sku: string;
  images: string[];
  video: string | null;
  variants: VariantView[];
  /** 规格属性名，如 ["Color", "Size"] */
  variantKeys: string[];
  specs: Array<{ label: string; value: string }>;
  descriptionHtml: string;
  descriptionText: string;
  /** 最低零售价（用于"起价"） */
  priceFrom: number;
  priceLabel: string;
  isRange: boolean;
  /** 该商品是否多规格（需要客户选规格） */
  multiVariant: boolean;
  /** 是否有变体缺成本价、价格用了商品级兜底（UI 提示用） */
  hasDegradedPrice: boolean;
  upstreamPrice: string | null;
  fetchedAt: string;
}

function money(v: number): string {
  return `$${v.toFixed(2)}`;
}

/**
 * CJ 的 `variantKey` 常同时返回英文与中文规格名（如 ["Color","颜色"]），
 * 直接 join 会渲染成 "Color / 颜色"。这里去重：只要存在非中文键，就丢弃中文键。
 */
function cleanVariantKeys(keys: unknown): string[] {
  const list = (Array.isArray(keys) ? keys : [])
    .map((k) => String(k ?? "").trim())
    .filter(Boolean);
  const hasCjk = (s: string) => /[\u3400-\u9fff]/.test(s);
  const ascii = list.filter((k) => !hasCjk(k));
  const base = ascii.length ? ascii : list; // 全是中文时保留原样
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of base) {
    const lower = k.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(k);
  }
  return out;
}

/**
 * @param detail CJ 详情（可能为 null —— 尚未缓存）
 * @param fallbackRetail 商品级零售价（详情不可用时的兜底）
 */
export function buildDetailView(detail: ProductDetailData | null, fallbackRetail: number): DetailView | null {
  if (!detail) return null;

  const rawVariants: DetailVariant[] = Array.isArray(detail.variants) ? detail.variants : [];
  let degradedAny = false;

  const variants: VariantView[] = rawVariants
    .filter((v) => v.vid)
    .map((v) => {
      const cost = Number.isFinite(Number(v.price)) && Number(v.price) > 0 ? Number(v.price) : null;
      const degraded = cost === null;
      if (degraded) degradedAny = true;
      const price = cost !== null ? retailFromCost(cost) : fallbackRetail;
      return {
        vid: String(v.vid),
        variantSku: v.sku || "",
        name: v.name || "",
        image: v.image,
        costUsd: cost,
        price,
        priceLabel: money(price),
        weightGrams: v.weightGrams,
        degraded,
      };
    });

  const prices = variants.map((v) => v.price).filter((p) => p > 0);
  const priceFrom = prices.length ? Math.min(...prices) : fallbackRetail;
  const priceTo = prices.length ? Math.max(...prices) : fallbackRetail;
  const isRange = variants.length > 1 && priceTo > priceFrom;

  return {
    sku: detail.sku,
    images: detail.images || [],
    video: detail.video,
    variants,
    variantKeys: cleanVariantKeys(detail.variantKeys),
    specs: detail.specs || [],
    descriptionHtml: detail.descriptionHtml || "",
    descriptionText: detail.descriptionText || "",
    priceFrom,
    priceLabel: isRange ? `${money(priceFrom)} - ${money(priceTo)}` : money(priceFrom),
    isRange,
    multiVariant: variants.length > 1,
    hasDegradedPrice: degradedAny,
    upstreamPrice: detail.upstreamPrice,
    fetchedAt: detail.fetchedAt,
  };
}

export { money as moneyLabel };
