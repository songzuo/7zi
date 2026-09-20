'use client';

// src/lib/shop-currency.tsx
// ============================================================================
// 多货币显示上下文（仅显示层换算，内部/结算一律 USD）
//   · 偏好：localStorage 'szspd_currency'（用户手动切换后记住，优先于 IP 默认）
//   · IP 默认：加纳（GH）访客 → GHS，其余 → USD（由 /api/shop/currency 提供）
//   · 汇率：实时拉取 + 1h 缓存（后端），失败回退内置汇率
// ============================================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type CurrencyCode = 'USD' | 'GHS';

interface CurrencyState {
  /** 当前显示货币 */
  currency: CurrencyCode;
  /** 切换货币（记住偏好） */
  setCurrency: (c: CurrencyCode) => void;
  /** GHS per USD 汇率 */
  rate: number;
  /** 是否已从服务端拿到汇率与 IP 默认（未就绪时按 USD 显示） */
  ready: boolean;
  /** 服务端建议默认货币（IP 检测），仅当用户无偏好时生效 */
  serverDefault: CurrencyCode;
  /** 换算并格式化 USD 金额为显示货币字符串 */
  fmt: (usd: number, opts?: { decimals?: number }) => string;
  /** 换算 USD 数字 → 当前货币数字 */
  convert: (usd: number) => number;
}

const SYMBOLS: Record<CurrencyCode, string> = { USD: '$', GHS: '₵' };
const PREF_KEY = 'szspd_currency';

const CurrencyContext = createContext<CurrencyState>({
  currency: 'USD',
  setCurrency: () => {},
  rate: 1,
  ready: false,
  serverDefault: 'USD',
  fmt: (v) => `$${(Number(v) || 0).toFixed(2)}`,
  convert: (v) => v,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [serverDefault, setServerDefault] = useState<CurrencyCode>('USD');
  const [rate, setRate] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    // 1) 本地偏好（用户选择，最高优先）
    try {
      const pref = localStorage.getItem(PREF_KEY);
      if (pref === 'USD' || pref === 'GHS') {
        setCurrencyState(pref);
      }
    } catch {}

    // 2) 服务端：汇率 + IP 默认货币
    fetch('/api/shop/currency', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (j?.success && j.rates && Number(j.rates.GHS) > 0) {
          setRate(Number(j.rates.GHS));
        }
        const def = j?.defaultCurrency === 'GHS' ? 'GHS' : 'USD';
        setServerDefault(def);
        // 无本地偏好时，用 IP 默认
        let pref: string | null = null;
        try {
          pref = localStorage.getItem(PREF_KEY);
        } catch {}
        if (!pref) setCurrencyState(def);
      })
      .catch(() => {})
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(PREF_KEY, c);
    } catch {}
  }, []);

  const convert = useCallback(
    (usd: number) => {
      const v = Number(usd) || 0;
      return currency === 'GHS' ? v * (rate > 0 ? rate : 1) : v;
    },
    [currency, rate]
  );

  const fmt = useCallback(
    (usd: number, opts?: { decimals?: number }) => {
      const v = convert(usd);
      const decimals = opts?.decimals ?? 2;
      const num = v.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return `${SYMBOLS[currency]}${num}`;
    },
    [convert, currency]
  );

  const value = useMemo<CurrencyState>(
    () => ({ currency, setCurrency, rate, ready, serverDefault, fmt, convert }),
    [currency, setCurrency, rate, ready, serverDefault, fmt, convert]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyState {
  return useContext(CurrencyContext);
}
