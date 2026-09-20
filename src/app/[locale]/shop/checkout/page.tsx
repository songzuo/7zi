"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CartItem { id: number; sku: string; name: string; price: number; qty: number; img: string; }

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', address: '', city: '', country: 'United States', zip: '',
  });

  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem('cart') || '[]'));
  }, []);

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.name,
          customer_email: form.email,
          shipping_address: { address: form.address, city: form.city, country: form.country, zip: form.zip },
          total_amount: total,
          items: cart.map(i => ({ product_id: i.id, quantity: i.qty, unit_price: i.price })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('cart');
        router.push('/shop/confirmation?order=' + data.order_no);
      } else {
        alert('Order failed: ' + data.error);
      }
    } catch (e) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">🛒</div>
      <p className="text-gray-500 text-lg mb-4">Your cart is empty</p>
      <Link href="/shop" className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">Shop Now</Link>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Full Name *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Shipping Address</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Street Address *</label>
                <input required value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm text-gray-600 mb-1">City *</label>
                  <input required value={form.city} onChange={e => setForm({...form, city: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">ZIP *</label>
                  <input required value={form.zip} onChange={e => setForm({...form, zip: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Country</label>
                  <select value={form.country} onChange={e => setForm({...form, country: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option>United States</option><option>United Kingdom</option><option>Canada</option>
                    <option>Australia</option><option>Germany</option><option>France</option><option>Japan</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
            🔒 Payment processing coming soon. For now, your order will be saved and we'll contact you.
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {loading ? 'Processing...' : `Place Order — $${total.toFixed(2)}`}
          </button>
        </form>
      </div>
      <div>
        <div className="bg-white rounded-xl shadow p-6 sticky top-24">
          <h2 className="font-semibold text-gray-800 mb-4">Order Summary</h2>
          <div className="space-y-3 mb-4">
            {cart.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <img src={item.img} alt={item.name} className="w-12 h-12 object-cover rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">x{item.qty}</p>
                </div>
                <span className="text-sm font-bold">${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Shipping</span><span className={total >= 99 ? 'text-green-600' : ''}>{total >= 99 ? 'Free' : '$9.99'}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span><span className="text-indigo-600">${(total + (total >= 99 ? 0 : 9.99)).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
