'use client';

// 导航货币切换器：USD $ / GHS ₵（记住用户偏好）
import { useCurrency } from '@/lib/shop-currency';

export default function CurrencySwitcher() {
  const { currency, setCurrency, rate, ready } = useCurrency();
  if (!ready) {
    return (
      <span className="rounded-lg bg-zinc-100 px-2 py-1 text-xs text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
        USD
      </span>
    );
  }
  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
      <button
        type="button"
        onClick={() => setCurrency('USD')}
        title="US Dollar"
        className={`px-2 py-1 text-xs font-semibold transition-colors ${
          currency === 'USD'
            ? 'bg-indigo-600 text-white'
            : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
        }`}
      >
        $
      </button>
      <button
        type="button"
        onClick={() => setCurrency('GHS')}
        title={`Ghana Cedi · 1 USD ≈ ₵${rate > 0 ? rate.toFixed(2) : '—'}`}
        className={`px-2 py-1 text-xs font-semibold transition-colors ${
          currency === 'GHS'
            ? 'bg-indigo-600 text-white'
            : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
        }`}
      >
        ₵
      </button>
    </div>
  );
}
