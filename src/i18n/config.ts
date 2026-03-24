import { Pathnames, LocalePrefix } from 'next-intl/routing';

export const locales = ['zh', 'en', 'ja', 'ko', 'fr', 'de'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh';

export const pathnames: Pathnames<typeof locales> = {
  '/': '/',
  '/about': {
    zh: '/about',
    en: '/about',
    ja: '/about',
    ko: '/about',
    fr: '/about',
    de: '/about'
  },
  '/team': {
    zh: '/team',
    en: '/team',
    ja: '/team',
    ko: '/team',
    fr: '/team',
    de: '/team'
  },
  '/contact': {
    zh: '/contact',
    en: '/contact',
    ja: '/contact',
    ko: '/contact',
    fr: '/contact',
    de: '/contact'
  },
  '/blog': {
    zh: '/blog',
    en: '/blog',
    ja: '/blog',
    ko: '/blog',
    fr: '/blog',
    de: '/blog'
  },
  '/dashboard': {
    zh: '/dashboard',
    en: '/dashboard',
    ja: '/dashboard',
    ko: '/dashboard',
    fr: '/dashboard',
    de: '/dashboard'
  }
};

// 静态导出模式下使用 'always' 前缀策略
export const localePrefix: LocalePrefix<typeof locales> = 'always';
