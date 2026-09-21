import Link from "next/link";
import AddToCartButton from "./_add-to-cart-client";
import {
  loadCatalog,
  loadSyncStatus,
  searchCatalog,
  categoryCounts,
  highlightSegments,
  dedupeName,
  parsePrice,
  priceDisplay,
  timeAgo,
  type CatalogProduct,
} from "@/lib/cj-data";
import { listPriceOf, listPriceDisplay } from "@/lib/list-price";
import {
  getCatalogStats,
  getCategoryTree,
  isCatalogReady,
  searchCatalog as searchCatalogDb,
} from "@/lib/catalog-db";
import PriceTag from "./_price-tag";
import ImpressionTracker from "./_impression-tracker";

const PAGE_SIZE = 24;

export const dynamic = "force-dynamic";

interface SearchParams {
  page?: string;
  cat?: string;
  q?: string;
  sort?: string;
}

function buildHref(base: SearchParams, patch: Partial<SearchParams>): string {
  const params = new URLSearchParams();
  const merged = { ...base, ...patch };
  if (merged.q) params.set("q", merged.q);
  if (merged.cat) params.set("cat", merged.cat);
  if (merged.sort) params.set("sort", merged.sort);
  if (merged.page && merged.page !== "1") params.set("page", merged.page);
  const qs = params.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

function Highlight({ text, q }: { text: string; q?: string }) {
  const segs = highlightSegments(text, q);
  return (
    <>
      {segs.map((s, i) =>
        s.hit ? (
          <mark key={i} className="bg-amber-200 text-zinc-900 rounded px-0.5">
            {s.t}
          </mark>
        ) : (
          <span key={i}>{s.t}</span>
        )
      )}
    </>
  );
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = (await searchParams) || {};
  const q = (sp.q || "").trim() || undefined;
  const cat = sp.cat || undefined;
  const sort = (sp.sort as "relevance" | "name" | "price_asc" | "price_desc") || undefined;
  const currentPage = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  // ---------------------------------------------------------------------
  // 数据源：优先 SQLite 目录库（data/cj-catalog.db，百万级），缺库/异常时降级旧 JSON。
  // 旧 JSON 快照实测 32 万条 ≈ 111MB，解析后进程 RSS 逼近 1GB（Node 堆上限 2GB），
  // 只能当兜底；主路径必须走索引化的 SQLite 查询。
  // ---------------------------------------------------------------------
  const sqliteReady = (() => {
    try {
      return isCatalogReady();
    } catch {
      return false;
    }
  })();

  const status = loadSyncStatus();

  // 全量口径（上游已收割总量）与在售量，一律以目录库实时统计为准。
  // 旧 status.sourceTotal 读的是 cj-sync-status.json 的历史残留值（cj-sync 时代
  // 无过滤翻页被上游截断在 6000 条留下的 6000），完全不反映真实全量货源。
  const stats = (() => {
    try {
      return sqliteReady ? getCatalogStats() : null;
    } catch {
      return null;
    }
  })();
  const feedTotal = stats && stats.totalProducts > 0 ? stats.totalProducts : status.sourceTotal ?? null;

  let items: CatalogProduct[] = [];
  let totalCount = 0;
  let totalPages = 1;
  let safePage = currentPage;
  let categoryName: string | undefined;
  let topCats: Array<{ id: string; name: string; count: number }> = [];
  let subCats: Array<{ id: string; name: string }> = [];
  let liveCount = 0;
  let sqliteUsed = false;

  if (sqliteReady) {
    try {
      const r = searchCatalogDb({ q, categoryId: cat, sort, page: currentPage, limit: PAGE_SIZE });
      items = r.items.map((p) => ({
        id: p.pid || p.sku,
        sku: p.sku,
        name: p.name,
        price: p.price,
        priceFrom: p.priceFrom,
        priceIsRange: p.priceIsRange,
        image: p.image,
        hasVideo: p.hasVideo,
        categoryId: p.categoryId,
        categoryPath: p.categoryPath || undefined,
      }));
      totalCount = r.total;
      totalPages = r.totalPages;
      safePage = r.page;
      categoryName = r.categoryName;
      liveCount = stats?.visibleProducts || stats?.totalProducts || 0;

      const tree = getCategoryTree();
      topCats = tree
        .slice()
        .sort((a, b) => b.productCount - a.productCount)
        .slice(0, 24)
        .map((c) => ({ id: c.name, name: c.name, count: c.productCount }));
      if (cat) {
        const node = tree.find((c) => c.name === cat || c.id === cat);
        subCats = (node?.children || [])
          .slice()
          .sort((a, b) => b.productCount - a.productCount)
          .slice(0, 14)
          .map((c) => ({ id: c.id, name: c.name }));
      }
      sqliteUsed = true;
    } catch (e) {
      console.warn("[shop] SQLite 查询失败，降级到 JSON:", e);
    }
  }

  if (!sqliteUsed) {
    // ---- 兜底：旧 JSON 全量路径（目录库未就绪的小数据集场景） ----
    const catalog = loadCatalog();
    const counts = categoryCounts(catalog);
    const r = searchCatalog(catalog, { q, categoryId: cat, sort, page: currentPage, limit: PAGE_SIZE });
    items = r.items;
    totalCount = r.total;
    totalPages = r.totalPages;
    safePage = r.page;
    categoryName = r.categoryName;
    liveCount = catalog.productCount;
    topCats = catalog.categories.map((c) => ({ id: c.id, name: c.name, count: counts.get(c.id) || 0 }));
    subCats = (catalog.nodeById.get(cat || "")?.children || []).slice(0, 14).map((s) => ({ id: s.id, name: s.name }));
  }

  const result = { items, total: totalCount, page: safePage, totalPages, categoryName };

  const base: SearchParams = {
    q,
    cat,
    sort: sort === "name" && !q ? undefined : sort,
    page: String(result.page),
  };

  const pageLink = (p: number) => buildHref(base, { page: String(p) });

  const pageButtons: (number | "...")[] = [];
  if (result.totalPages <= 7) {
    for (let i = 1; i <= result.totalPages; i++) pageButtons.push(i);
  } else {
    pageButtons.push(1);
    if (result.page > 3) pageButtons.push("...");
    for (let i = Math.max(2, result.page - 1); i <= Math.min(result.totalPages - 1, result.page + 1); i++) {
      pageButtons.push(i);
    }
    if (result.page < result.totalPages - 2) pageButtons.push("...");
    pageButtons.push(result.totalPages);
  }

  const sortOptions: Array<{ key: string; label: string }> = [];
  if (q) sortOptions.push({ key: "", label: "Best match" });
  sortOptions.push(
    { key: "price_asc", label: "Price ↑" },
    { key: "price_desc", label: "Price ↓" },
    { key: "name", label: "A–Z" }
  );
  const activeSort = sort || (q ? "" : "name");

  const fresh = status.lastSyncAt ? Date.now() - new Date(status.lastSyncAt).getTime() < 26 * 3600 * 1000 : false;

  return (
    <div>
      {/* Hero + 搜索 */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 p-8 mb-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome to SZSPD Store — China&apos;s best, delivered to Ghana &amp; Africa
        </h1>
        <p className="text-indigo-100 mb-5">
          {liveCount.toLocaleString()} products in stock · one-click dropshipping · shipped from China
        </p>

        <form action="/shop" method="get" className="flex flex-col sm:flex-row gap-2 max-w-2xl">
          {cat && <input type="hidden" name="cat" value={cat} />}
          {sort && <input type="hidden" name="sort" value={sort} />}
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">🔍</span>
            <input
              type="search"
              name="q"
              defaultValue={q || ""}
              placeholder="Search products or SKU — e.g. watch, led light, CJJT1355346"
              aria-label="Search products"
              className="w-full rounded-xl border-0 pl-9 pr-3 py-3 text-zinc-900 placeholder-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-zinc-900 px-6 py-3 font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-indigo-100">
          <span>Popular:</span>
          {["watch", "headphone", "led", "bag", "kitchen"].map((t) => (
            <Link key={t} href={`/shop?q=${t}`} className="underline underline-offset-2 hover:text-white">
              {t}
            </Link>
          ))}
        </div>
      </div>

      {/* 分类胶囊 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link
          href={buildHref({ q, cat: undefined, sort }, { page: "1" })}
          className={
            "px-4 py-2 rounded-full text-sm font-medium transition-colors " +
            (!cat
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-600 hover:bg-indigo-50 border border-gray-200")
          }
        >
          All
          <span className="ml-1.5 text-xs opacity-70">{liveCount.toLocaleString()}</span>
        </Link>
        {topCats.map((c) => (
          <Link
            key={c.id}
            href={buildHref({ q, sort }, { cat: c.id, page: "1" })}
            className={
              "px-4 py-2 rounded-full text-sm font-medium transition-colors " +
              (cat === c.id
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 hover:bg-indigo-50 border border-gray-200")
            }
          >
            {c.name}
            <span className="ml-1.5 text-xs opacity-70">{c.count.toLocaleString()}</span>
          </Link>
        ))}
      </div>

      {/* 选中分类下的二级分类 */}
      {cat && subCats.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 pl-1">
          {subCats.map((sub) => (
            <Link
              key={sub.id}
              href={buildHref({ q, sort }, { cat: sub.id, page: "1" })}
              className="px-3 py-1 rounded-full text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      {/* 结果信息 + 排序 */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <p className="text-gray-600 text-sm">
          {q ? (
            <>
              <span className="font-semibold text-gray-900">{result.total.toLocaleString()}</span> results for{" "}
              <span className="font-semibold text-indigo-600">&ldquo;{q}&rdquo;</span>
            </>
          ) : (
            <>
              <span className="font-semibold text-gray-900">{result.total.toLocaleString()}</span> products
            </>
          )}
          {result.categoryName && <> in <span className="font-medium">{result.categoryName}</span></>}
          <span className="text-gray-400"> &nbsp;|&nbsp; Page {result.page} of {result.totalPages}</span>
        </p>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 mr-1">Sort</span>
          {sortOptions.map((o) => (
            <Link
              key={o.key || "relevance"}
              href={buildHref({ q, cat, sort: undefined }, { sort: o.key, page: "1" })}
              className={
                "px-3 py-1 rounded-full text-xs transition-colors " +
                (activeSort === o.key
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50")
              }
            >
              {o.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 商品网格 */}
      {result.items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-gray-700 font-medium mb-1">
            No products found{q ? ` for "${q}"` : ""}
          </p>
          <p className="text-gray-500 text-sm mb-5">
            Try a shorter keyword, a different spelling, or browse a category.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/shop" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700">
              Clear search
            </Link>
            {["watch", "phone", "light", "bag", "toy"].map((t) => (
              <Link
                key={t}
                href={`/shop?q=${t}`}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {result.items.map((p) => (
              <ProductCard key={p.id} p={p} q={q} />
            ))}
          </div>
          <ImpressionTracker skus={result.items.map((p) => p.sku)} />
        </>
      )}

      {/* 分页 */}
      {result.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-10 flex-wrap">
          {result.page > 1 && (
            <Link href={pageLink(result.page - 1)} className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-indigo-50">
              ← Prev
            </Link>
          )}
          {pageButtons.map((btn, idx) =>
            btn === "..." ? (
              <span key={"e" + idx} className="px-3 py-2 text-gray-400">...</span>
            ) : (
              <Link
                key={btn}
                href={pageLink(btn as number)}
                className={
                  "px-4 py-2 rounded-lg border transition-colors " +
                  (btn === result.page
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "border-gray-200 text-gray-600 hover:bg-indigo-50")
                }
              >
                {btn}
              </Link>
            )
          )}
          {result.page < result.totalPages && (
            <Link href={pageLink(result.page + 1)} className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-indigo-50">
              Next →
            </Link>
          )}
        </div>
      )}

      {/* 数据同步状态 */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <span className={"inline-block h-2 w-2 rounded-full " + (fresh ? "bg-emerald-500" : "bg-amber-500")} />
          Catalog auto-synced {timeAgo(status.lastSyncAt)}
        </span>
        <span>·</span>
        <span>{liveCount.toLocaleString()} items live from supplier</span>
        {feedTotal ? (
          <>
            <span>·</span>
            <span>{feedTotal.toLocaleString()} in supplier feed</span>
          </>
        ) : null}
        {status.lastSyncMode ? (
          <>
            <span>·</span>
            <span>last run: {status.lastSyncMode}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ProductCard({ p, q }: { p: CatalogProduct; q?: string }) {
  const name = dedupeName(p.name);
  return (
    <div className="bg-white rounded-xl shadow hover:shadow-lg transition-all duration-300 overflow-hidden group flex flex-col">
      <Link href={`/shop/${p.sku}`} className="flex-1">
        <div className="relative overflow-hidden h-48 bg-gray-50">
          <img
            src={p.image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {p.hasVideo && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">Video</div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-800 line-clamp-2 mb-1 text-sm min-h-[2.5rem]">
            <Highlight text={name} q={q} />
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            SKU: <Highlight text={p.sku} q={q} />
          </p>
          {p.categoryPath && (
            <p className="text-[11px] text-gray-400 mb-2 line-clamp-1">{p.categoryPath}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-indigo-600">
              <PriceTag usd={listPriceOf(p).from} isRange={listPriceOf(p).isRange} />
            </span>
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4">
        {listPriceOf(p).isRange ? (
          // 多规格商品不能在列表页盲加购物车 —— 不同规格成本不同，
          // 必须进详情页选规格，否则会出现"按低价规格收钱、按首个规格发货"的亏本单。
          <Link
            href={`/shop/${p.sku}`}
            className="block w-full text-center border border-indigo-600 text-indigo-600 py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors"
          >
            Choose options
          </Link>
        ) : (
          <AddToCartButton
            product={{ id: p.id, sku: p.sku, name, price: listPriceOf(p).label, image: p.image }}
          />
        )}
      </div>
    </div>
  );
}
