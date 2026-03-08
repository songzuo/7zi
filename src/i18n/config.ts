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
  },
  '/portfolio': {
    zh: '/portfolio',
    en: '/portfolio'
  },
  '/tasks': {
    zh: '/tasks',
    en: '/tasks'
  },
  '/settings': {
    zh: '/settings',
    en: '/settings'
  }
};

// 隐式重定向：默认语言不显示前缀，非默认语言显示前缀
// 访问 / 显示中文（URL 不变），访问 /en 显示英文
// 使用 'as-needed' 模式，泛型参数指定为 'as-needed'
export const localePrefix: LocalePrefix<typeof locales, 'as-needed'> = 'as-needed';
