// src/lib/currency-rates.ts
// ============================================================================
// 多货币显示体系（仅显示层换算，结算仍按 CJ/USD）
// ----------------------------------------------------------------------------
// 原则：
//   · 商品/订单/结算在内部一律以 USD 计（CJ 结算货币不变）
//   · 前端显示层按「用户偏好货币」换算展示（GHS ₵ / USD $）
//   · 汇率来源：open.er-api.com（免费、无 key），缓存 1 小时，失败回退内置保守汇率
//   · IP 国家检测：加纳（GH）访客默认 GHS，其余默认 USD；用户手动切换后以偏好为准
// ============================================================================

// 内置保守回退汇率（GHS per USD），仅当外部 API 不可达时使用；API 成功即覆盖
const FALLBACK_RATES: Record<string, number> = { GHS: 15.2 };
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 小时

let cached: { rates: Record<string, number>; updatedAt: string } | null = null;
let cacheUntil = 0;

export interface CurrencyBundle {
  base: 'USD';
  rates: Record<string, number>;
  defaultCurrency: 'USD' | 'GHS';
  ipCountry: string;
  updatedAt: string;
  source: 'live' | 'fallback';
}

async function fetchLiveRates(): Promise<Record<string, number> | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: ctrl.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const j = await res.json();
    if (j?.result !== 'success' || !j?.rates) return null;
    return j.rates as Record<string, number>;
  } catch {
    return null;
  }
}

export async function getCurrencyRates(): Promise<{ rates: Record<string, number>; updatedAt: string; source: 'live' | 'fallback' }> {
  const now = Date.now();
  if (cached && now < cacheUntil) {
    return { rates: cached.rates, updatedAt: cached.updatedAt, source: 'live' };
  }
  const live = await fetchLiveRates();
  if (live && Number(live['GHS']) > 0) {
    cached = { rates: live, updatedAt: new Date().toISOString() };
    cacheUntil = now + CACHE_TTL_MS;
    return { rates: live, updatedAt: cached.updatedAt, source: 'live' };
  }
  // 回退：内置保守汇率
  cacheUntil = now + CACHE_TTL_MS;
  return { rates: FALLBACK_RATES, updatedAt: new Date().toISOString(), source: 'fallback' };
}

/**
 * 从请求头解析访客真实 IP（nginx 已配置 X-Real-IP / X-Forwarded-For）
 */
export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for') || '';
  const first = fwd.split(',')[0]?.trim();
  if (first && first !== 'unknown') return first;
  const real = headers.get('x-real-ip') || '';
  if (real && real !== 'unknown') return real;
  return '';
}

/**
 * 按 IP 国家给出默认货币：加纳 → GHS，其余 → USD
 */
export async function defaultCurrencyForIp(headers: Headers): Promise<{ currency: 'USD' | 'GHS'; country: string }> {
  const ip = clientIp(headers);
  if (!ip) return { currency: 'USD', country: '' };
  try {
    // geoip-lite 无官方类型，动态引入
    // @ts-ignore
    const geoip = require('geoip-lite');
    const geo = geoip.lookup(ip);
    const country = String(geo?.country || '').toUpperCase();
    return { currency: country === 'GH' ? 'GHS' : 'USD', country };
  } catch {
    return { currency: 'USD', country: '' };
  }
}
