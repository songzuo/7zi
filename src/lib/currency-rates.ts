// src/lib/currency-rates.ts
// ============================================================================
// 多货币显示体系 —— 服务端模块（汇率拉取 + IP 国家检测）
// 注意：本模块含 Node 依赖（geoip-lite / fetch），只能被服务端代码 import；
// 客户端组件请 import '@/lib/currency'（纯数据）。
// ============================================================================
import { CURRENCY_CODES, FALLBACK_RATES, currencyForCountry, type CurrencyCode } from './currency';

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
 * Turbopack 打包时会把 process.cwd() 虚拟化为其他路径（如 /ROOT），
 * 导致 geoip-lite 无法找到数据文件。这里在 require 之前
 * 用真实环境变量 PWD 或早先注入的 GEOIP_DATA_DIR 修正数据路径。
 */
function ensureGeoipDataPath(): void {
  try {
    const path = require('path');
    const dataDir =
      process.env.GEOIP_DATA_DIR ||
      path.join(process.env.PWD || process.cwd(), 'node_modules', 'geoip-lite', 'data');
    if (!process.env.GEOIP_COUNTRY) process.env.GEOIP_COUNTRY = path.join(dataDir, 'geoip-country.dat');
    if (!process.env.GEOIP_CITY) process.env.GEOIP_CITY = path.join(dataDir, 'geoip-city.dat');
    if (!process.env.GEOIP_CITY6) process.env.GEOIP_CITY6 = path.join(dataDir, 'geoip-city6.dat');
  } catch {}
}

/**
 * 按 IP 国家给出默认货币：国家 → 该国实际流通货币（20 种之一）；不在清单 → USD
 */
export async function defaultCurrencyForIp(headers: Headers): Promise<{ currency: CurrencyCode; country: string }> {
  const ip = clientIp(headers);
  if (!ip) return { currency: 'USD', country: '' };
  try {
    ensureGeoipDataPath();
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
