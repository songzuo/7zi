import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SZSPD Store — Quality Products, China to Ghana & Africa',
  description:
    'SZSPD (SZ) is a cross-border e-commerce platform serving Ghana, Africa and customers worldwide. Quality products sourced from China, one-click dropshipping, tracked delivery to your door.',
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-14 items-center justify-between">
            <Link
              href="/shop"
              className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              <span className="inline-flex h-6 items-center rounded bg-gradient-to-r from-red-600 via-yellow-500 to-green-600 px-2 text-xs font-black tracking-widest text-white">
                SZ
              </span>
              <span className="text-sm font-semibold">SZSPD</span>
            </Link>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-white">
              SZSPD Store <span className="hidden sm:inline text-xs font-normal text-zinc-500">· Serving Ghana · Africa · Worldwide</span>
            </h1>
            <div className="flex items-center gap-3">
              <Link
                href="/shop/orders"
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                📦 Orders
              </Link>
              <Link
                href="/shop/cart"
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                🛒 Cart
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <footer className="border-t border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-8 grid gap-8 md:grid-cols-3 text-sm">
          <div>
            <div className="mb-2 font-bold text-zinc-900 dark:text-white">
              <span className="inline-flex h-5 items-center rounded bg-gradient-to-r from-red-600 via-yellow-500 to-green-600 px-1.5 text-[10px] font-black tracking-widest text-white">SZ</span>{' '}
              SZSPD — About Us
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              SZSPD sources quality products from China and delivers them to Ghana, Africa and customers worldwide — with one-click dropshipping, secure payment and tracked shipping.
            </p>
            <p className="mt-2 text-zinc-500 dark:text-zinc-500">🇬🇭 Proudly serving Ghana &amp; Africa · 🌍 Shipping worldwide</p>
          </div>
          <div>
            <div className="mb-2 font-bold text-zinc-900 dark:text-white">Contact — Ghana 🇬🇭</div>
            <p className="text-zinc-600 dark:text-zinc-400">Phone / WhatsApp / WeChat: <a className="text-blue-600 hover:underline" href="tel:+233248009090">+233 24 800 9090</a></p>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              <a className="text-blue-600 hover:underline" href="https://wa.me/233248009090" target="_blank" rel="noopener">WhatsApp us →</a>
            </p>
            <p className="mt-2 text-zinc-500 dark:text-zinc-500 leading-relaxed">
              Plot 36, Block P, Fawoade,<br />
              Ashanti Region (Kumasi), AD-021-7690, Ghana
            </p>
          </div>
          <div>
            <div className="mb-2 font-bold text-zinc-900 dark:text-white">Contact — China 🇨🇳</div>
            <p className="text-zinc-600 dark:text-zinc-400">Phone / WhatsApp / WeChat: <a className="text-blue-600 hover:underline" href="tel:+8613319551131">+86 133 1955 1131</a></p>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              <a className="text-blue-600 hover:underline" href="https://wa.me/8613319551131" target="_blank" rel="noopener">WhatsApp us →</a>
            </p>
            <p className="mt-2 text-zinc-500 dark:text-zinc-500 leading-relaxed">
              Room 10020, Tiandu Tower, Kaifu Avenue,<br />
              Kaifu District, Changsha, Hunan, China
            </p>
          </div>
        </div>
        <div className="border-t border-zinc-100 py-4 text-center text-xs text-zinc-400 dark:border-zinc-800">
          © {new Date().getFullYear()} SZSPD · SZ. All rights reserved. · Quality products from China, delivered across Ghana, Africa &amp; the world.
        </div>
      </footer>
    </div>
  );
}
