import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // as-needed 模式需要匹配所有未加前缀的路径
  // 匹配所有路径，除了静态文件和 API
  matcher: ['/', '/(en|zh)/:path*', '/((?!api|_next|_vercel|.*\..*).*)']
};
