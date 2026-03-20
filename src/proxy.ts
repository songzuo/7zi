import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  // - Root path '/' for locale detection
  // - Locale-prefixed paths '/zh/*' and '/en/*'
  // - Unprefixed paths that should be redirected to locale versions
  matcher: [
    // Root path
    '/',
    // Locale-prefixed paths
    '/(zh|en)/:path*',
    // All paths except static files, api, and _next
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};