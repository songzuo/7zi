"use client";
import Link from 'next/link';

export default function ConfirmationPage() {
  return (
    <div className="max-w-lg mx-auto text-center py-16">
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed!</h1>
      <p className="text-gray-500 mb-8">
        Thank you for your order. We will contact you soon with shipping details.
      </p>
      <div className="space-y-3">
        <Link href="/shop" className="block bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
