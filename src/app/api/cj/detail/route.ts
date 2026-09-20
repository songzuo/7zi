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
import Database from "better-sqlite3";
import { join } from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// 商品基础信息只读连接（单例 + WAL，与 catalog-db.ts 同模式）。
// 全量收割后 products 表可达 155 万行，JSON 快照 570MB 无法每次请求全量解析，
// 基础信息一律 SQLite 索引直查（毫秒级），JSON 仅在 SQLite 不可用时降级。
let _db: Database.Database | null = null;
function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(join(process.cwd(), "data", "cj-catalog.db"), { readonly: true, fileMustExist: true });
  _db.pragma("journal_mode = WAL");
  _db.pragma("cache_size = -20000");
  _db.pragma("mmap_size = 268435456");
  return _db;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findProduct(sku: string): any {
  try {
    const row = getDb()
      .prepare("SELECT sku, pid, name, price, image, hasVideo, categoryId, categoryPath FROM products WHERE UPPER(sku) = UPPER(?)")
      .get(sku);
    if (row) return row;
  } catch (e) {
    console.warn("[api/cj/detail] SQLite 查询失败，降级 JSON:", e);
  }
  const catalog = loadCatalog();
  return catalog.products.find((p) => String(p.sku).toUpperCase() === sku.toUpperCase());
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const sku = (sp.get("sku") || "").trim();
  const wantStock = sp.get("stock") === "1";
  const force = sp.get("fresh") === "1";

  if (!sku) {
    return NextResponse.json({ ok: false, error: "sku 必填" }, { status: 400 });
  }

  // 商品级零售价兜底（商品库里已按加价规则换算好；SQLite 行只有 price，JSON 有 priceFrom）
  const product = findProduct(sku);
  const fallbackRetail = Number(product?.priceFrom && product.priceFrom > 0 ? product.priceFrom : product?.price) || 0;

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
