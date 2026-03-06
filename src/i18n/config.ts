import { Pathnames, LocalePrefix } from 'next-intl/routing';

export const locales = ['zh', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh';

export const pathnames: Pathnames<typeof locales> = {
  '/': '/',
  '/about': {
    zh: '/about',
    en: '/about'
  },
  '/team': {
    zh: '/team',
    en: '/team'
  },
  '/contact': {
    zh: '/contact',
    en: '/contact'
  },
  '/blog': {
    zh: '/blog',
    en: '/blog'
  },
  '/dashboard': {
    zh: '/dashboard',
    en: '/dashboard'
  }
};

// 静态导出模式下使用 'always' 前缀策略
export const localePrefix: LocalePrefix<typeof locales> = 'always';
