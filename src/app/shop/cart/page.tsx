"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CartItem {
  id: string | number;
  sku: string;
  /** 选中的变体 id（字符串，19 位整数不能转 Number） */
  vid?: string;
  /** 规格名，如 "Black / XL" */
  variantName?: string;
  name: string;
  price: number;
  qty: number;
  img: string;
}

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('cart') || '[]');
      setCart(Array.isArray(raw) ? raw : []);
    } catch {
      setCart([]);
    }
    setMounted(true);
  }, []);

  // 同一商品的不同规格是两行 —— 用行 id（sku::vid）比较，不能用商品 id
  const updateQty = (id: string | number, qty: number) => {
    const newCart = qty <= 0
      ? cart.filter(i => String(i.id) !== String(id))
      : cart.map(i => (String(i.id) === String(id) ? { ...i, qty } : i));
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const total = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0);

  if (!mounted) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h1>
      {cart.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🛒</div>
          <p className="text-gray-500 text-lg mb-4">Your cart is empty</p>
          <Link href="/shop" className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {cart.map(item => (
              <div key={String(item.id)} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
                <img src={item.img} alt={item.name} className="w-20 h-20 object-cover rounded-lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-800 line-clamp-1">{item.name}</h3>
                  {item.variantName && (
                    <p className="text-xs text-gray-500 mt-0.5">Option: <b className="text-gray-700">{item.variantName}</b></p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">SKU: {item.sku}</p>
                  <p className="text-indigo-600 font-bold text-lg">${Number(item.price).toFixed(2)}</p>
                </div>
                <div className="flex items-center border border-gray-200 rounded-lg">
                  <button onClick={() => updateQty(item.id, item.qty-1)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 rounded-l-lg">-</button>
                  <span className="w-10 text-center text-sm font-medium">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, item.qty+1)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 rounded-r-lg">+</button>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">${(Number(item.price) * item.qty).toFixed(2)}</p>
                  <button onClick={() => updateQty(item.id, 0)} className="text-red-400 text-xs hover:text-red-600 mt-1">Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between text-lg font-bold mb-4">
              <span>Total ({cart.reduce((s,i) => s+i.qty, 0)} items)</span>
              <span className="text-indigo-600">${total.toFixed(2)}</span>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              Shipping is calculated at checkout based on your delivery country — live carrier rates to 250+ countries.
            </p>
            <Link href="/shop/checkout"
              className="w-full block text-center bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
              Proceed to Checkout →
            </Link>
            <Link href="/shop" className="w-full block text-center text-indigo-600 py-3 mt-2 hover:underline text-sm">
              ← Continue Shopping
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
