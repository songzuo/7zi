// src/lib/currency.ts
// ============================================================================
// 多货币显示体系 —— 纯数据模块（可被客户端安全 import，无任何 Node 依赖）
// 货币清单 / 符号 / 国家→货币映射 / 回退汇率
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

// 全球主流 20 种货币（含加纳 GHS）。USD 与 GHS 固定排前两位（客户最常用，方便选择）。
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
  { code: 'GHS', name: 'Ghana Cedi', symbol: '₵', countries: ['GH'] },
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

/** 内置保守回退汇率（per USD），仅当外部 API 不可达时使用；API 成功即覆盖 */
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.78, JPY: 149, CNY: 7.2, GHS: 15.2, NGN: 1550, ZAR: 18.2,
  KES: 130, EGP: 48.5, XOF: 605, XAF: 605, AUD: 1.52, CAD: 1.37, CHF: 0.88,
  INR: 84, BRL: 5.5, MXN: 18.3, SGD: 1.34, AED: 3.67,
};
