'use client';

// 导航货币切换器：20 种主流货币下拉（记住用户偏好）
import { useCurrency } from '@/lib/shop-currency';
import { CURRENCY_SYMBOL } from '@/lib/currency';

export default function CurrencySwitcher() {
  const { currency, setCurrency, currencies, rates, ready } = useCurrency();

  const label = (code: string) => {
    const meta = currencies.find((c) => c.code === code);
    const sym = CURRENCY_SYMBOL[code as keyof typeof CURRENCY_SYMBOL] ?? '';
    return meta ? `${sym} ${code} · ${meta.name}` : `${sym} ${code}`;
  };

  if (!ready) {
    return (
      <span className="rounded-lg bg-zinc-100 px-2 py-1 text-xs text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
        $ USD
      </span>
    );
  }

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value as any)}
      title={rates[currency] ? `1 USD ≈ ${Number(rates[currency]).toFixed(2)} ${currency}` : 'Switch currency'}
      className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
    >
      {currencies.length > 0
        ? currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.code} · {c.name}
            </option>
          ))
        : (
            <>
              <option value="USD">$ USD · US Dollar</option>
              <option value="GHS">₵ GHS · Ghana Cedi</option>
            </>
          )}
    </select>
  );
}
