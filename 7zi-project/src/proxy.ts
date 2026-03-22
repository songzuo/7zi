/**
 * Proxy for Internationalization
 *
 * This proxy handles locale detection and routing for next-intl.
 * It ensures that all URLs have the correct locale prefix.
 *
 * Features:
 * - Automatic locale detection from Accept-Language header
 * - Locale prefix enforcement (always include /zh or /en)
 * - URL rewriting for server components
 * - Support for default locale fallback
 *
 * Next.js 16: Renamed from middleware.ts to proxy.ts
 */

import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

/**
 * Create and export the proxy
 */
export default createMiddleware(routing);

/**
 * Proxy configuration
 * Ensure the proxy is only applied to relevant paths
 */
export const config = {
  // Match all pathnames except for:
  // - _next (Next.js internals)
  // - api (API routes)
  // - _static (static files)
  // - _vercel (Vercel internals)
  // - favicon.ico, sitemap.xml, robots.txt (static files)
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
