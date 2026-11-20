import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartButton from "../_add-to-cart-client";
import { getProductBySku, getRelatedProducts, isCatalogReady } from "@/lib/catalog-db";
import { loadCatalog } from "@/lib/cj-data";

function parsePrice(raw: string): string {
  const m = raw.match(/[\d.]+/);
  return m ? m[0] : raw;
}

/**
 * 优先 SQLite 主键查询（O(1)），不可用时降级到 JSON find（O(n)）。
 */
function getProduct(sku: string) {
  let dbReady = false;
  try {
    dbReady = isCatalogReady();
  } catch {
    dbReady = false;
  }

  if (dbReady) {
    try {
      const p = getProductBySku(sku);
      if (p) {
        const related = getRelatedProducts(sku, 4);
        return { product: p, related, source: "sqlite" };
      }
      // 库可用但查不到 = 真不存在：直接返回空，**不要**回落 JSON
      // （为不存在的 SKU 解析 111MB JSON = 一次常驻 +450MB，属内存炸弹）
      return { product: null, related: [], source: "sqlite" };
    } catch (e) {
      console.warn("[shop/sku] SQLite 查询失败，降级到 JSON:", e);
    }
  }

  // 降级：旧 JSON 路径（只在目录库不可用时）
  const catalog = loadCatalog();
  const product = catalog.products.find((p) => p.sku === sku || p.id === sku);
  if (!product) return { product: null, related: [], source: "json" };
  const related = catalog.products
    .filter((p) => p.categoryId === product.categoryId && p.sku !== product.sku)
    .slice(0, 4);
  return { product, related, source: "json" };
}

// dynamicParams=true: 不提前静态生成，运行时按需查找所有 SKU
export const dynamicParams = true;

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;
  const { product, related } = getProduct(sku);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/shop" className="hover:text-indigo-600">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <div className="rounded-2xl overflow-hidden mb-4 bg-gray-100 h-96">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <div className="text-3xl font-bold text-indigo-600 mb-6">
            ${parsePrice(product.price)}
          </div>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-gray-400 text-sm">SKU: {product.sku}</span>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <label className="text-gray-700 font-medium text-sm">Qty:</label>
            <span className="text-gray-400 text-sm">1</span>
          </div>

          <div className="mb-6">
            <AddToCartButton
              product={{
                id: product.sku,
                sku: product.sku,
                name: product.name,
                price: product.price,
                image: product.image,
              }}
            />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-lg mb-1">🚚</div>Free Shipping over $99
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-lg mb-1">🔒</div>Secure Payment
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-lg mb-1">↩</div>30-Day Returns
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Related Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((p) => (
              <Link
                key={p.sku}
                href={`/shop/${p.sku}`}
                className="bg-white rounded-xl shadow hover:shadow-lg transition-all duration-300 overflow-hidden group"
              >
                <div className="relative overflow-hidden h-48">
                  <img
                    src={p.image}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 line-clamp-2 mb-1 text-sm">
                    {p.name.substring(0, 40)}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">SKU: {p.sku}</p>
                  <span className="text-lg font-bold text-indigo-600">
                    ${parsePrice(p.price)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
