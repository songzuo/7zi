"use client";
// 商品详情页交互部分：图册 + 规格选择 + 数量 + 加购
// ----------------------------------------------------------------------------
// 为什么必须有规格选择器：CJ 商品里约 2/3 是多规格（颜色/尺码），此前商城没有
// 选择器，只能盲发 variants[0] —— 会发错货，且不同规格成本不同会导致亏本。
// 现在：客户选了哪个 vid，结算价、CJ 下单、运费试算全都用同一个 vid。
//
// 详情（规格/描述/多图）走懒加载：SSR 有缓存就直出，没有就由本组件按需拉，
// 拉过之后落磁盘缓存，后续访问直接 SSR 直出。
import { useCallback, useEffect, useMemo, useState } from "react";

export interface VariantView {
  vid: string;
  variantSku: string;
  name: string;
  image: string | null;
  costUsd: number | null;
  price: number;
  priceLabel: string;
  weightGrams: number | null;
  degraded: boolean;
}

export interface DetailView {
  sku: string;
  images: string[];
  video: string | null;
  variants: VariantView[];
  variantKeys: string[];
  specs: Array<{ label: string; value: string }>;
  descriptionHtml: string;
  descriptionText: string;
  priceFrom: number;
  priceLabel: string;
  isRange: boolean;
  multiVariant: boolean;
  hasDegradedPrice: boolean;
  fetchedAt: string;
}

interface ProductProp {
  id: string;
  sku: string;
  name: string;
  image: string;
  priceLabel: string;
}

interface StockMap {
  [vid: string]: { qty: number; area: string };
}

const CART_KEY = "cart";

function readCart(): any[] {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default function ProductDetailClient({
  product,
  initialDetail,
}: {
  product: ProductProp;
  initialDetail: DetailView | null;
}) {
  const [detail, setDetail] = useState<DetailView | null>(initialDetail);
  const [loading, setLoading] = useState(!initialDetail);
  const [loadError, setLoadError] = useState("");
  const [stock, setStock] = useState<StockMap | null>(null);
  const [selectedVid, setSelectedVid] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [mainImage, setMainImage] = useState<string>(product.image);
  const [added, setAdded] = useState("");

  // ---- 详情：SSR 未命中时懒加载 ----
  useEffect(() => {
    if (detail) return;
    let alive = true;
    setLoading(true);
    fetch(`/api/cj/detail?sku=${encodeURIComponent(product.sku)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (j?.ok && j.detail) {
          setDetail(j.detail as DetailView);
          setLoadError("");
        } else {
          setLoadError(j?.error || "详情加载失败");
        }
      })
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [detail, product.sku]);

  // ---- 默认选中：优先有货的最便宜规格（规格必须显式可见，避免盲发）----
  useEffect(() => {
    if (!detail || selectedVid || detail.variants.length === 0) return;
    const inStock = detail.variants.filter((v) => !stock || (stock[v.vid]?.qty ?? 1) > 0);
    const pool = inStock.length ? inStock : detail.variants;
    const cheapest = pool.reduce((a, b) => (b.price < a.price ? b : a), pool[0]);
    setSelectedVid(cheapest.vid);
    if (cheapest.image) setMainImage(cheapest.image);
  }, [detail, stock, selectedVid]);

  // ---- 库存：静默二级懒加载（不打乱首屏）----
  useEffect(() => {
    if (!detail || !detail.multiVariant) return;
    let alive = true;
    fetch(`/api/cj/stock?sku=${encodeURIComponent(product.sku)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (alive && j?.ok && j.stock) setStock(j.stock as StockMap);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [detail, product.sku]);

  const selected = useMemo(
    () => detail?.variants.find((v) => v.vid === selectedVid) || null,
    [detail, selectedVid]
  );

  const unitPrice = selected?.price ?? detail?.priceFrom ?? 0;
  const outOfStock = !!stock && !!selected && (stock[selected.vid]?.qty ?? 1) <= 0;

  const gallery = useMemo(() => {
    const base = detail?.images?.length ? detail.images : [product.image];
    return base.filter(Boolean).slice(0, 12);
  }, [detail, product.image]);

  const addToCart = useCallback(() => {
    if (detail?.multiVariant && !selectedVid) {
      setAdded("请先选择规格");
      return;
    }
    try {
      const cart = readCart();
      const lineId = `${product.sku}::${selectedVid || "base"}`;
      const lineName = selected?.name ? `${product.name} (${selected.name})` : product.name;
      const idx = cart.findIndex((i: any) => String(i.id) === lineId);
      if (idx >= 0) {
        cart[idx].qty = Number(cart[idx].qty || 1) + qty;
        cart[idx].price = unitPrice;
      } else {
        cart.push({
          id: lineId,
          sku: product.sku,
          vid: selectedVid || "",
          variantName: selected?.name || "",
          name: lineName,
          price: unitPrice,
          qty,
          img: selected?.image || mainImage || product.image,
        });
      }
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      setAdded(`已加入购物车：${lineName} × ${qty}`);
      setTimeout(() => setAdded(""), 4000);
    } catch (e) {
      setAdded(e instanceof Error ? e.message : "加入购物车失败");
    }
  }, [detail, product, selectedVid, selected, unitPrice, qty, mainImage]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        {/* ---------- 图册 ---------- */}
        <div>
          <div className="mb-3 flex h-96 items-center justify-center overflow-hidden rounded-2xl bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mainImage || product.image} alt={product.name} className="h-full w-full object-cover" />
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {gallery.map((src) => (
                <button
                  key={src}
                  onClick={() => setMainImage(src)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                    mainImage === src ? "border-indigo-500" : "border-transparent hover:border-gray-300"
                  }`}
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          {detail?.video && (
            <p className="mt-2 text-[11px] text-gray-400">
              该商品有视频介绍——
              <a href={detail.video} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                查看视频
              </a>
            </p>
          )}
        </div>

        {/* ---------- 购买区 ---------- */}
        <div>
          <h1 className="mb-2 text-2xl font-bold text-zinc-900">{product.name}</h1>

          <div className="mb-4 flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-bold text-indigo-600">
              {selected ? selected.priceLabel : detail?.priceLabel || product.priceLabel}
            </span>
            {!selected && detail?.isRange && <span className="text-xs text-gray-500">（按所选规格定价）</span>}
            {selected?.degraded && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                该规格上游未报价，暂按商品价
              </span>
            )}
          </div>

          <div className="mb-5 flex items-center gap-3">
            <span className="text-sm text-gray-400">SKU: {product.sku}</span>
            {selected?.variantSku && <span className="text-sm text-gray-400">规格号: {selected.variantSku}</span>}
          </div>

          {/* 规格选择 */}
          {loading && (
            <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              正在加载规格与详情…
            </div>
          )}

          {!loading && loadError && (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              规格信息暂时取不到（{loadError}）。你可以先按当前价格下单，我们会在发货前与你核对规格。
            </div>
          )}

          {detail && detail.multiVariant && (
            <div className="mb-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">
                  {detail.variantKeys.length ? detail.variantKeys.join(" / ") : "Choose an option"}
                </span>
                <span className="text-[11px] text-gray-500">
                  {detail.variants.length} options{selected ? ` · 已选：${selected.name || selected.variantSku}` : ""}
                </span>
              </div>
              <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1">
                {detail.variants.map((v) => {
                  const q = stock?.[v.vid]?.qty;
                  const soldOut = typeof q === "number" && q <= 0;
                  const active = v.vid === selectedVid;
                  return (
                    <button
                      key={v.vid}
                      type="button"
                      disabled={soldOut}
                      onClick={() => {
                        setSelectedVid(v.vid);
                        if (v.image) setMainImage(v.image);
                      }}
                      className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                        active
                          ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                          : soldOut
                            ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300 line-through"
                            : "border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className="block font-medium">{v.name || v.variantSku || v.vid.slice(-6)}</span>
                      <span className="block text-[11px] text-gray-500">
                        {v.priceLabel}
                        {soldOut ? " · Sold out" : typeof q === "number" ? ` · ${q} left` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!detail?.multiVariant && (
            <p className="mb-5 text-[11px] text-gray-500">单一规格商品，无需选择规格。</p>
          )}

          {/* 数量 */}
          <div className="mb-6 flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Qty:</label>
            <div className="flex items-center rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-9 w-9 text-gray-500 hover:bg-gray-50"
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-medium">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(999, q + 1))}
                className="h-9 w-9 text-gray-500 hover:bg-gray-50"
              >
                +
              </button>
            </div>
          </div>

          <div className="mb-6">
            <button
              type="button"
              onClick={addToCart}
              disabled={outOfStock}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {outOfStock ? "Sold out" : `Add to Cart — $${(unitPrice * qty).toFixed(2)}`}
            </button>
            {added && (
              <p className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">{added}</p>
            )}
            {outOfStock && <p className="mt-2 text-[11px] text-red-500">该规格暂时缺货，请选择其它规格。</p>}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="mb-1 text-lg">🚚</div>Worldwide shipping
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="mb-1 text-lg">🔒</div>Secure Payment
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="mb-1 text-lg">↩</div>30-Day Returns
            </div>
          </div>
        </div>
      </div>

      {/* ---------- 规格参数 ---------- */}
      {detail && detail.specs.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-zinc-900">Specifications</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <tbody>
                {detail.specs.map((s, i) => (
                  <tr key={s.label} className={i % 2 ? "bg-gray-50" : ""}>
                    <td className="w-48 px-4 py-2 text-gray-500">{s.label}</td>
                    <td className="px-4 py-2 text-gray-800">{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------- 商品描述（上游 HTML 已白名单清洗）---------- */}
      {detail && detail.descriptionText && (
        <div className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-zinc-900">Product Description</h2>
          <div
            className="product-desc overflow-hidden rounded-xl border border-gray-200 bg-white p-5 text-sm leading-relaxed text-gray-700"
            dangerouslySetInnerHTML={{ __html: detail.descriptionHtml }}
          />
        </div>
      )}
    </div>
  );
}
