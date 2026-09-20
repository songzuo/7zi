import Link from "next/link";
import AddToCartButton from "./_add-to-cart-client";
import {
  searchCatalog,
  getTopCategories,
  isCatalogReady,
  type CatalogProduct,
} from "@/lib/catalog-db";
import { loadCatalog, searchCatalog as searchCatalogJson, type SearchOptions } from "@/lib/cj-data";

const PAGE_SIZE = 24;

function parsePrice(raw: string): string {
  const match = raw.match(/[\d.]+/);
  return match ? match[0] : raw;
}

function dedupeName(name: string): string {
  const half = Math.floor(name.length / 2);
  if (half > 5 && name.substring(0, half) === name.substring(half)) {
    return name.substring(0, half).trim();
  }
  return name;
}

/**
 * 优先用 SQLite 目录库查询（百万级性能友好），
 * 不可用时降级到旧的 JSON 全量加载（兼容 8683 条以下的小数据集）。
 */
function queryProducts(params: {
  page: number;
  cat?: string;
  q?: string;
  sort?: SearchOptions["sort"];
}) {
  if (isCatalogReady()) {
    try {
      const result = searchCatalog({
        page: params.page,
        limit: PAGE_SIZE,
        categoryId: params.cat,
        q: params.q,
        sort: params.sort,
      });
      return {
        products: result.items,
        totalCount: result.total,
        totalPages: result.totalPages,
        currentPage: result.page,
        source: "sqlite",
      };
    } catch (e) {
      console.warn("[shop] SQLite 查询失败，降级到 JSON:", e);
    }
  }

  // 降级：旧 JSON 路径
  const catalog = loadCatalog();
  const result = searchCatalogJson(catalog, {
    page: params.page,
    limit: PAGE_SIZE,
    categoryId: params.cat,
    q: params.q,
    sort: params.sort,
  });
  return {
    products: result.items,
    totalCount: result.total,
    totalPages: result.totalPages,
    currentPage: result.page,
    source: "json",
  };
}

function queryCategories() {
  if (isCatalogReady()) {
    try {
      const cats = getTopCategories(20);
      return cats.map((c) => ({ id: c.id, name: c.name }));
    } catch {
      // fall through
    }
  }
  const catalog = loadCatalog();
  if (catalog.categories && catalog.categories.length > 0) {
    return catalog.categories.slice(0, 20).map((c) => ({ id: c.id, name: c.name }));
  }
  const catMap = new Map<string, string>();
  for (const p of catalog.products) {
    if (p.categoryId && !catMap.has(p.categoryId)) {
      catMap.set(p.categoryId, p.categoryId);
    }
  }
  return Array.from(catMap.entries()).slice(0, 20).map(([id]) => ({ id, name: id }));
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; cat?: string; q?: string; sort?: string }>;
}) {
  const { page: pageStr, cat, q, sort } = await searchParams;
  const currentPage = Math.max(1, parseInt(pageStr || "1", 10));

  const categories = queryCategories();
  const result = queryProducts({ page: currentPage, cat, q, sort: sort as any });

  const { products, totalCount, totalPages, currentPage: safePage } = result;

  // 分页链接 helper
  const pageLink = (p: number) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    if (cat) params.set("cat", cat);
    if (q) params.set("q", q);
    if (sort) params.set("sort", sort);
    return `/shop?${params.toString()}`;
  };

  // 生成分页按钮数组（最多显示7个）
  const pageButtons: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageButtons.push(i);
  } else {
    pageButtons.push(1);
    if (safePage > 3) pageButtons.push("...");
    for (
      let i = Math.max(2, safePage - 1);
      i <= Math.min(totalPages - 1, safePage + 1);
      i++
    ) {
      pageButtons.push(i);
    }
    if (safePage < totalPages - 2) pageButtons.push("...");
    pageButtons.push(totalPages);
  }

  return (
    <div>
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome to 7zi Store</h1>
        <p className="text-indigo-100 mb-4">Discover quality products at great prices</p>
        <div className="flex gap-4 text-sm">
          <span className="bg-white/20 px-3 py-1 rounded-full">Secure Payment</span>
          <span className="bg-white/20 px-3 py-1 rounded-full">Fast Shipping</span>
          <span className="bg-white/20 px-3 py-1 rounded-full">Easy Returns</span>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/shop"
          className={
            "px-4 py-2 rounded-full text-sm font-medium transition-colors " +
            (!cat
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-600 hover:bg-indigo-50 border border-gray-200")
          }
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/shop?cat=${encodeURIComponent(c.id)}`}
            className={
              "px-4 py-2 rounded-full text-sm font-medium transition-colors " +
              (cat === c.id
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 hover:bg-indigo-50 border border-gray-200")
            }
          >
            {c.name}
          </Link>
        ))}
      </div>

      {/* Product Count & Page Info + Sort */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-600 text-sm">
          {totalCount} products &nbsp;|&nbsp; Page {safePage} of {totalPages}
        </p>
        <div className="flex gap-1 text-xs">
          {(["name", "price_asc", "price_desc"] as const).map((s) => {
            const params = new URLSearchParams();
            if (cat) params.set("cat", cat);
            if (q) params.set("q", q);
            params.set("sort", s);
            params.set("page", "1");
            const label =
              s === "name" ? "Name" : s === "price_asc" ? "Price ↑" : "Price ↓";
            return (
              <Link
                key={s}
                href={`/shop?${params.toString()}`}
                className={
                  "px-2 py-1 rounded-md transition-colors " +
                  ((sort || "name") === s
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 hover:bg-indigo-50 border border-gray-200")
                }
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard key={p.sku} p={p} />
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No products found</p>
          <Link href="/shop" className="text-indigo-600 hover:underline mt-2 inline-block">
            View all products
          </Link>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-10 flex-wrap">
          {safePage > 1 && (
            <Link
              href={pageLink(safePage - 1)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-indigo-50"
            >
              ← Prev
            </Link>
          )}

          {pageButtons.map((btn, idx) =>
            btn === "..." ? (
              <span key={"ellipsis-" + idx} className="px-3 py-2 text-gray-400">
                ...
              </span>
            ) : (
              <Link
                key={btn}
                href={pageLink(btn as number)}
                className={
                  "px-4 py-2 rounded-lg border transition-colors " +
                  (btn === safePage
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "border-gray-200 text-gray-600 hover:bg-indigo-50")
                }
              >
                {btn}
              </Link>
            )
          )}

          {safePage < totalPages && (
            <Link
              href={pageLink(safePage + 1)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-indigo-50"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function ProductCard({ p }: { p: CatalogProduct }) {
  return (
    <div className="bg-white rounded-xl shadow hover:shadow-lg transition-all duration-300 overflow-hidden group">
      <Link href={`/shop/${p.sku}`}>
        <div className="relative overflow-hidden h-48">
          <img
            src={p.image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {p.hasVideo && (
            <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              Video
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-800 line-clamp-2 mb-1 text-sm">
            {dedupeName(p.name)}
          </h3>
          <p className="text-xs text-gray-400 mb-3">SKU: {p.sku}</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-indigo-600">${parsePrice(p.price)}</span>
          </div>
        </div>
      </Link>
      <div className="px-4 pb-4">
        <AddToCartButton product={{ id: p.sku, sku: p.sku, name: p.name, price: p.price, image: p.image }} />
      </div>
    </div>
  );
}
