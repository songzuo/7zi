import { Pathnames, LocalePrefix } from 'next-intl/routing';

export const locales = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh';

export const pathnames: Pathnames<typeof locales> = {
  '/': '/',
  '/about': {
    zh: '/about',
    en: '/about',
    ja: '/about',
    ko: '/about',
    es: '/about',
    fr: '/about',
    de: '/about'
  },
  '/team': {
    zh: '/team',
    en: '/team',
    ja: '/team',
    ko: '/team',
    es: '/team',
    fr: '/team',
    de: '/team'
  },
  '/contact': {
    zh: '/contact',
    en: '/contact',
    ja: '/contact',
    ko: '/contact',
    es: '/contact',
    fr: '/contact',
    de: '/contact'
  },
  '/blog': {
    zh: '/blog',
    en: '/blog',
    ja: '/blog',
    ko: '/blog',
    es: '/blog',
    fr: '/blog',
    de: '/blog'
  },
  '/dashboard': {
    zh: '/dashboard',
    en: '/dashboard',
    ja: '/dashboard',
    ko: '/dashboard',
    es: '/dashboard',
    fr: '/dashboard',
    de: '/dashboard'
  },
  '/agent-dashboard': {
    zh: '/agent-dashboard',
    en: '/agent-dashboard',
    ja: '/agent-dashboard',
    ko: '/agent-dashboard',
    es: '/agent-dashboard',
    fr: '/agent-dashboard',
    de: '/agent-dashboard'
  }
};

// 静态导出模式下使用 'always' 前缀策略
export const localePrefix: LocalePrefix<typeof locales> = 'always';
