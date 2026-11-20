"use client";
// 列表页「快速加购」——只用于单规格商品。
// 多规格商品在列表页不给这个按钮（要先进详情页选规格），
// 否则会出现"按最低价规格收钱、按首个规格发货"的亏本与错发。
function parsePrice(raw: string): string {
  const match = String(raw ?? "").match(/[\d.]+/);
  return match ? match[0] : String(raw ?? "");
}

export default function AddToCartButton({
  product,
}: {
  product: { id: string; sku: string; name: string; price: string; image: string };
}) {
  return (
    <button
      onClick={() => {
        try {
          const cart = JSON.parse(localStorage.getItem("cart") || "[]");
          const lineId = `${product.sku}::base`;
          const idx = cart.findIndex((i: any) => String(i.id) === lineId || String(i.id) === String(product.id));
          if (idx >= 0) {
            cart[idx].qty = Number(cart[idx].qty || 1) + 1;
          } else {
            cart.push({
              id: lineId,
              sku: product.sku,
              vid: "",
              variantName: "",
              name: product.name,
              price: parseFloat(parsePrice(product.price)),
              qty: 1,
              img: product.image,
            });
          }
          localStorage.setItem("cart", JSON.stringify(cart));
          alert("Added to cart!");
        } catch {}
      }}
      className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
    >
      Add to Cart
    </button>
  );
}
