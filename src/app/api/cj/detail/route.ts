// src/app/api/cj/detail/route.ts
// 商品详情（懒加载）：GET ?sku=XXX[&stock=1][&fresh=1]
//
// 设计：详情体积大且变化慢，按需拉取 + 两级缓存（进程内 + 磁盘），
// 所有上游调用走 cj-channel 的 1 QPS 串行队列。
// 返回的每个变体都已带我方零售价（服务端算价，前端不参与定价）。
import { NextRequest, NextResponse } from "next/server";
import { loadCatalog, dedupeName } from "@/lib/cj-data";
import { getDetail, readCachedDetail, readNegative, getStock, detailCacheStats } from "@/lib/cj-detail";
import { buildDetailView } from "@/lib/detail-view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const sku = (sp.get("sku") || "").trim();
  const wantStock = sp.get("stock") === "1";
  const force = sp.get("fresh") === "1";

  if (!sku) {
    return NextResponse.json({ ok: false, error: "sku 必填" }, { status: 400 });
  }

  // 商品级零售价兜底（商品库里已按加价规则换算好）
  const catalog = loadCatalog();
  const product = catalog.products.find((p) => String(p.sku).toUpperCase() === sku.toUpperCase());
  const fallbackRetail = product?.priceFrom && product.priceFrom > 0 ? product.priceFrom : Number(product?.price) || 0;

  if (!product) {
    return NextResponse.json({ ok: false, error: `商品库中不存在该 SKU：${sku}` }, { status: 404 });
  }

  // 已标记下架的负缓存：直接回绝，不打上游
  const neg = readNegative(sku);
  if (neg && !force) {
    return NextResponse.json(
      { ok: false, error: neg.message || "该商品已下架", reason: neg.reason },
      { status: 404 }
    );
  }

  const cachedHit = !force ? readCachedDetail(sku) : null;
  const r = cachedHit
    ? { ok: true as const, detail: cachedHit.detail, cached: true, stale: cachedHit.stale }
    : await getDetail(sku, { force });

  if (!r.ok || !r.detail) {
    const status = r.reason === "not_found" ? 404 : r.reason === "rate_limited" ? 503 : 502;
    return NextResponse.json({ ok: false, error: r.message || "详情获取失败", reason: r.reason }, { status });
  }

  const view = buildDetailView(r.detail, fallbackRetail);

  // 库存是可选的二级懒加载（每个变体一次上游调用），默认不强拉
  let stock: Record<string, { qty: number; area: string }> | null = null;
  let stockCached = false;
  if (wantStock && r.detail.variants.length > 0) {
    try {
      const s = await getStock(sku, r.detail.variants.map((v) => String(v.vid)));
      stock = s.stock;
      stockCached = !!s.cached;
    } catch {
      stock = null;
    }
  }

  return NextResponse.json({
    ok: true,
    sku: r.detail.sku,
    product: {
      sku: product.sku,
      name: dedupeName(product.name),
      image: product.image,
      categoryPath: product.categoryPath || "",
    },
    detail: view,
    stock,
    stockCached,
    cached: !!r.cached,
    stale: !!r.stale,
  });
}

/** 缓存诊断（内部排查用） */
export async function POST() {
  return NextResponse.json({ ok: true, stats: detailCacheStats() });
}
