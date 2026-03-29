/**
 * i18n 配置文件
 * 
 * 支持中英文切换、语言检测、SSR 兼容
 */

import type { InitOptions } from 'i18next';

// 支持的语言列表
export const supportedLanguages = ['zh', 'en'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

// 默认语言
export const defaultLanguage: SupportedLanguage = 'zh';

// 语言名称映射
export const languageNames: Record<SupportedLanguage, string> = {
  zh: '中文',
  en: 'English',
};

// 语言检测配置
export const languageDetectorConfig = {
  order: ['cookie', 'localStorage', 'navigator', 'htmlTag'],
  lookupCookie: 'i18next',
  lookupLocalStorage: 'i18nextLng',
  caches: ['cookie', 'localStorage'],
  excludeCacheFor: ['cimode'],
  cookieMinutes: 365 * 24 * 60, // 1 year
  cookieDomain: undefined,
  htmlTag: document?.documentElement,
  checkWhitelist: true,
};

// i18next 初始化配置
export const i18nConfig: InitOptions = {
  // 支持的语言
  supportedLngs: [...supportedLanguages],
  
  // 回退语言
  fallbackLng: defaultLanguage,
  
  // 默认语言
  lng: defaultLanguage,
  
  // 调试模式（开发环境）
  debug: process.env.NODE_ENV === 'development',
  
  // 插值配置
  interpolation: {
    escapeValue: false, // React 已经处理 XSS
  },
  
  // 资源加载
  ns: ['common', 'auth', 'navigation', 'errors', 'dashboard'],
  defaultNS: 'common',
  
  // 加载策略
  load: 'languageOnly', // 'zh-CN' -> 'zh'
  
  // 缺失翻译键处理
  saveMissing: process.env.NODE_ENV === 'development',
  missingKeyHandler: (lngs, ns, key, fallbackValue) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Missing translation: ${ns}:${key} for ${lngs.join(', ')}`);
    }
  },
  
  // React 配置
  react: {
    useSuspense: false, // SSR 兼容
  },
  
  // 语言检测（仅客户端）
  detection: languageDetectorConfig,
};

// 获取语言方向（RTL/LTR）
export function getLanguageDirection(lng: SupportedLanguage): 'ltr' | 'rtl' {
  return 'ltr'; // 中英文都是 LTR
}

// 检查语言是否支持
export function isSupportedLanguage(lng: string): lng is SupportedLanguage {
  return supportedLanguages.includes(lng as SupportedLanguage);
}

// 获取语言代码（标准化）
export function normalizeLanguage(lng: string): SupportedLanguage {
  // 处理 zh-CN, zh-TW, zh-HK 等
  if (lng.startsWith('zh')) return 'zh';
  // 处理 en-US, en-GB 等
  if (lng.startsWith('en')) return 'en';
  // 返回原语言或默认
  return isSupportedLanguage(lng) ? lng : defaultLanguage;
}
