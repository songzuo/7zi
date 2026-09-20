import Link from "next/link";
import { notFound } from "next/navigation";
import ProductDetailClient from "../_product-detail-client";
import { loadCatalog, dedupeName, priceDisplay } from "@/lib/cj-data";
import { readCachedDetail } from "@/lib/cj-detail";
import { buildDetailView } from "@/lib/detail-view";

export const dynamicParams = true;
export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;
  const catalog = loadCatalog();
  const product = catalog.products.find((p) => p.sku === sku || p.id === sku);

  if (!product) {
    notFound();
  }

  const name = dedupeName(product.name);

  // 详情走「访问时懒加载 + 缓存」：已缓存则 SSR 直出（零等待），
  // 未缓存时先渲染商品骨架，由客户端组件按需拉取后补上规格与描述。
  const cached = readCachedDetail(product.sku);
  const fallbackRetail = product.priceFrom && product.priceFrom > 0 ? product.priceFrom : Number(product.price) || 0;
  const detailView = cached ? buildDetailView(cached.detail, fallbackRetail) : null;

  // 同类相关商品：先取同叶子分类，不足再补同一级分类
  const sameLeaf = catalog.products.filter(
    (p) => p.categoryId === product.categoryId && p.id !== product.id
  );
  let related = sameLeaf.slice(0, 4);
  if (related.length < 4) {
    // 从叶子分类沿 parentId 向上找到顶层分类，再取该顶层下的商品补足
    const leaf = catalog.nodeById.get(product.categoryId);
    const l2 = leaf?.parentId ? catalog.nodeById.get(leaf.parentId) : undefined;
    const top = l2?.parentId ? catalog.nodeById.get(l2.parentId) : undefined;
    const scope = top ? new Set(catalog.scopeIds.get(top.id) || []) : null;
    if (scope) {
      const extra = catalog.products.filter(
        (p) => p.id !== product.id && scope.has(p.categoryId) && !related.some((r) => r.id === p.id)
      );
      related = related.concat(extra.slice(0, 4 - related.length));
    }
  }

  const crumbs = product.categoryPath ? product.categoryPath.split(" > ") : [];

  return (
    <div>
      <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm text-gray-500">
        <Link href="/shop" className="hover:text-indigo-600">
          Shop
        </Link>
        {crumbs.map((c) => (
          <span key={c} className="flex items-center gap-1">
            <span className="mx-1">/</span>
            <span className="text-gray-500">{c}</span>
          </span>
        ))}
        <span className="mx-1">/</span>
        <span className="line-clamp-1 text-gray-700">{name}</span>
      </nav>

      <ProductDetailClient
        product={{
          id: String(product.id),
          sku: product.sku,
          name,
          image: product.image,
          priceLabel: priceDisplay(product),
        }}
        initialDetail={detailView}
      />

      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-6 text-xl font-bold text-zinc-900">Related Products</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <Link
                key={p.id}
                href={`/shop/${p.sku}`}
                className="group overflow-hidden rounded-xl bg-white shadow transition-all duration-300 hover:shadow-lg"
              >
                <div className="relative h-48 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-gray-800">
                    {dedupeName(p.name).substring(0, 40)}
                  </h3>
                  <p className="mb-3 text-xs text-gray-400">SKU: {p.sku}</p>
                  <span className="text-lg font-bold text-indigo-600">{priceDisplay(p)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
