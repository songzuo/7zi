import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: {
    mode: 'as-needed',
    prefixes: {
      en: '/en',
    },
  },
});

export const config = {
  matcher: [
    // 匹配所有路径，除了 API、静态文件等
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
