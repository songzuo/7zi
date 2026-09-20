// src/lib/currency-rates.ts
// ============================================================================
// 多货币显示体系（仅显示层换算，结算仍按 CJ/USD）
// ----------------------------------------------------------------------------
// 原则：
//   · 商品/订单/结算在内部一律以 USD 计（CJ 结算货币不变）
//   · 前端显示层按「用户偏好货币」换算展示
//   · 支持全球主流 20 种货币（含加纳 GHS）
//   · IP → 国家 → 该国「实际流通/法定货币」映射（含美元化国家、法郎区、
//     兰特区、澳元区等——货币不等于国家）
//   · 国家货币不在 20 种清单内 → 默认 USD；用户手动切换后以偏好为准（最高优先）
//   · 汇率来源：open.er-api.com（免费、无 key），缓存 1 小时，失败回退内置保守汇率
// ============================================================================

export type CurrencyCode =
  | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY' | 'GHS' | 'NGN' | 'ZAR' | 'KES' | 'EGP'
  | 'XOF' | 'XAF' | 'AUD' | 'CAD' | 'CHF' | 'INR' | 'BRL' | 'MXN' | 'SGD' | 'AED';

export interface CurrencyMeta {
  code: CurrencyCode;
  name: string;
  symbol: string;
  /** 该货币实际流通的国家/地区（ISO alpha-2，用于 IP → 货币映射；货币≠国家） */
  countries: string[];
}

// 全球主流 20 种货币（含加纳 GHS）。
// countries 按「该地实际使用/法定本币」填写，而非「本国发行的货币」：
//   美元化国家 → USD；欧元非欧盟国（摩纳哥/黑山/科索沃等）→ EUR；
//   兰特区（莱索托/纳米比亚/斯威士兰）→ ZAR；澳元区 → AUD；文莱 → SGD（与新加坡元 1:1 流通）等。
export const CURRENCIES: CurrencyMeta[] = [
  {
    code: 'USD', name: 'US Dollar', symbol: '$',
    countries: [
      'US', 'EC', 'SV', 'PA', 'TL', 'ZW', 'FM', 'MH', 'PW',          // 美元化国家
      'TC', 'VG', 'AS', 'GU', 'MP', 'PR', 'VI', 'UM',                // 美属领地/岛屿
    ],
  },
  {
    code: 'EUR', name: 'Euro', symbol: '€',
    countries: [
      'DE','FR','IT','ES','NL','BE','AT','IE','PT','FI','GR','LT','LV','EE',
      'SK','SI','HR','CY','MT','LU',
      'MC','AD','SM','VA','ME','XK',                                   // 使用欧元的非欧盟国家/地区
    ],
  },
  { code: 'GBP', name: 'British Pound', symbol: '£', countries: ['GB', 'GI', 'IM', 'JE', 'GG'] },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', countries: ['JP'] },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', countries: ['CN'] },
  { code: 'GHS', name: 'Ghana Cedi', symbol: '₵', countries: ['GH'] },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', countries: ['NG'] },
  {
    code: 'ZAR', name: 'South African Rand', symbol: 'R',
    countries: ['ZA', 'LS', 'NA', 'SZ'],                               // 兰特区：本币与兰特 1:1 挂钩并广泛流通
  },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', countries: ['KE'] },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', countries: ['EG'] },
  {
    code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA',
    countries: ['BJ','BF','CI','GW','ML','NE','SN','TG'],              // 西非经货联盟 8 国
  },
  {
    code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA',
    countries: ['CM','CF','TD','CG','GA','GQ'],                        // 中非经货共同体 6 国
  },
  {
    code: 'AUD', name: 'Australian Dollar', symbol: 'A$',
    countries: ['AU', 'NR', 'TV', 'KI'],                               // 澳元区
  },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', countries: ['CA'] },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', countries: ['CH', 'LI'] },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', countries: ['IN', 'BT'] },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', countries: ['BR'] },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', countries: ['MX'] },
  {
    code: 'SGD', name: 'Singapore Dollar', symbol: 'S$',
    countries: ['SG', 'BN'],                                           // 文莱元与新加坡元 1:1 可互换流通
  },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', countries: ['AE'] },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);
export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.symbol])
) as Record<CurrencyCode, string>;

/** 国家码 → 该地实际流通货币（20 种内；不在清单返回 null → 默认 USD） */
export function currencyForCountry(country: string): CurrencyCode | null {
  const cc = String(country || '').toUpperCase();
  if (!cc) return null;
  for (const c of CURRENCIES) {
    if (c.countries.includes(cc)) return c.code;
  }
  return null;
}

// 内置保守回退汇率（per USD），仅当外部 API 不可达时使用；API 成功即覆盖
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.78, JPY: 149, CNY: 7.2, GHS: 15.2, NGN: 1550, ZAR: 18.2,
  KES: 130, EGP: 48.5, XOF: 605, XAF: 605, AUD: 1.52, CAD: 1.37, CHF: 0.88,
  INR: 84, BRL: 5.5, MXN: 18.3, SGD: 1.34, AED: 3.67,
};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 小时

let cached: { rates: Record<string, number>; updatedAt: string } | null = null;
let cacheUntil = 0;

export interface CurrencyBundle {
  base: 'USD';
  rates: Record<string, number>;
  defaultCurrency: CurrencyCode;
  ipCountry: string;
  updatedAt: string;
  source: 'live' | 'fallback';
  currencies: CurrencyMeta[];
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
    // 只保留 20 种主流货币（有缺失的用回退值补齐）
    const out: Record<string, number> = {};
    for (const code of CURRENCY_CODES) {
      const v = Number(j.rates[code]);
      out[code] = v > 0 ? v : FALLBACK_RATES[code] ?? 1;
    }
    return out;
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
  cacheUntil = now + CACHE_TTL_MS;
  return { rates: { ...FALLBACK_RATES }, updatedAt: new Date().toISOString(), source: 'fallback' };
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
 * 按 IP 国家给出默认货币：国家 → 该国实际流通货币（20 种之一）；不在清单 → USD
 */
export async function defaultCurrencyForIp(headers: Headers): Promise<{ currency: CurrencyCode; country: string }> {
  const ip = clientIp(headers);
  if (!ip) return { currency: 'USD', country: '' };
  try {
    // geoip-lite 无官方类型，动态引入
    // @ts-ignore
    const geoip = require('geoip-lite');
    const geo = geoip.lookup(ip);
    const country = String(geo?.country || '').toUpperCase();
    const currency = currencyForCountry(country) || 'USD';
    return { currency, country };
  } catch {
    return { currency: 'USD', country: '' };
  }
}
