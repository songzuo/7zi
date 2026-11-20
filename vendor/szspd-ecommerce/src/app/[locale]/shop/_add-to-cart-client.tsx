"use client";

function parsePrice(raw: string): string {
  const match = raw.match(/[\d.]+/);
  return match ? match[0] : raw;
}

export default function AddToCartButton({ product }: { product: { id: string; sku: string; name: string; price: string; image: string } }) {
  return (
    <button
      onClick={() => {
        try {
          const cart = JSON.parse(localStorage.getItem("cart") || "[]");
          const idx = cart.findIndex((i: any) => i.id === product.id);
          if (idx >= 0) cart[idx].qty += 1;
          else cart.push({ id: product.id, sku: product.sku, name: product.name, price: parseFloat(parsePrice(product.price)), qty: 1, img: product.image });
          localStorage.setItem("cart", JSON.stringify(cart));
          alert("Added to cart!");
        } catch {}
      }}
      className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
      Add to Cart
    </button>
  );
}
