/**
 * Next.js Proxy / Middleware
 *
 * This middleware handles:
 * - Internationalization (i18n) routing via next-intl
 * - CORS headers for API routes
 * - Security headers
 * - Request logging (development)
 * - API rate limiting
 *
 * Note: Rate limiting and detailed security features have been migrated
 * to per-route wrappers in src/lib/middleware/
 */

import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale, Locale } from './i18n/config';
import { DistributedRateLimiter, KeyGenerators, RateLimitResult } from './lib/security/rate-limit';

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

// Auth API: Strict limit (5 requests/minute)
const authRateLimiter = new DistributedRateLimiter({
  windowMs: 60000,        // 1 minute
  maxRequests: 5,        // 5 requests/minute
  algorithm: 'sliding-window',
  keyGenerator: KeyGenerators.byIP,
});

// Tasks API: Moderate limit (30 requests/minute)
const tasksRateLimiter = new DistributedRateLimiter({
  windowMs: 60000,        // 1 minute
  maxRequests: 30,       // 30 requests/minute
  algorithm: 'sliding-window',
  keyGenerator: KeyGenerators.byIP,
});

// General API: Lenient limit (100 requests/minute)
const generalRateLimiter = new DistributedRateLimiter({
  windowMs: 60000,        // 1 minute
  maxRequests: 100,      // 100 requests/minute
  algorithm: 'token-bucket',
  keyGenerator: KeyGenerators.byIP,
});

/**
 * Select appropriate rate limiter based on request path
 */
function selectRateLimiter(pathname: string): DistributedRateLimiter | null {
  if (pathname.startsWith('/api/auth')) {
    return authRateLimiter;
  }
  if (pathname.startsWith('/api/tasks')) {
    return tasksRateLimiter;
  }
  if (pathname.startsWith('/api/')) {
    return generalRateLimiter;
  }
  return null; // Non-API routes don't need rate limiting
}

/**
 * Apply rate limiting and set headers
 */
async function applyRateLimit(req: NextRequest, pathname: string): Promise<{ blocked: boolean; response?: NextResponse; rateLimitResult?: RateLimitResult }> {
  const limiter = selectRateLimiter(pathname);
  
  if (!limiter) {
    return { blocked: false };
  }

  const result = await limiter.check(req);

  if (!result.allowed) {
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${result.retryAfter || 60} seconds.`,
        retryAfter: result.retryAfter,
        resetTime: new Date(result.resetTime).toISOString(),
      },
      { status: 429 }
    );

    // Set Rate Limit headers
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    if (result.retryAfter) {
      response.headers.set('Retry-After', result.retryAfter.toString());
    }

    return { blocked: true, response };
  }

  // If not blocked, return the result for later header setting
  return { blocked: false, rateLimitResult: result };
}

/**
 * Add rate limit headers to response (after rate check passed)
 */
function addRateLimitHeaders(response: NextResponse, result: RateLimitResult): void {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
}

// ============================================================================
// Security & CORS Headers
// ============================================================================

/**
 * Get preferred locale from request
 */
function getLocale(request: NextRequest): Locale {
  // 1. Check pathname
  const pathname = request.nextUrl.pathname;
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (!pathnameIsMissingLocale) {
    const locale = pathname.split('/')[1] as Locale;
    return locales.includes(locale) ? locale : defaultLocale;
  }

  // 2. Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    // Parse Accept-Language header and find best match
    const headerLocales = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim().toLowerCase());

    for (const headerLocale of headerLocales) {
      // Exact match
      if (locales.includes(headerLocale as Locale)) {
        return headerLocale as Locale;
      }
      // Language-only match (e.g., 'en' for 'en-US')
      const langOnly = headerLocale.split('-')[0];
      if (locales.includes(langOnly as Locale)) {
        return langOnly as Locale;
      }
    }
  }

  // 3. Default locale
  return defaultLocale;
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
  // Configure allowed origins
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_API_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean) as string[];

  // Allow credentials and specific origins
  if (origin && allowedOrigins.some(allowed =>
    allowed && (origin === allowed || origin.startsWith(allowed.replace(/\/$/, '')))
  )) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

/**
 * Handle i18n routing
 */
function handleI18nRouting(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // Skip for API routes, static files, and special paths
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webp') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/offline'
  ) {
    return NextResponse.next();
  }

  // Redirect if locale is missing
  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    return NextResponse.redirect(
      new URL(`/${locale}${pathname}`, request.url)
    );
  }

  // Set locale header for pages to use
  const response = NextResponse.next();
  const locale = pathname.split('/')[1] as Locale;
  response.headers.set('x-locale', locale);
  return response;
}

/**
 * Main proxy function (middleware)
 */
export async function proxy(request: NextRequest) {
  const origin = request.headers.get('origin');
  const pathname = request.nextUrl.pathname;

  // Handle OPTIONS requests (CORS preflight)
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    addCorsHeaders(response, origin);
    addSecurityHeaders(response);
    return response;
  }

  // Apply i18n routing for non-API routes
  if (!pathname.startsWith('/api')) {
    const i18nResponse = handleI18nRouting(request);
    addSecurityHeaders(i18nResponse);
    return i18nResponse;
  }

  // Apply rate limiting for API routes
  const rateLimitCheck = await applyRateLimit(request, pathname);
  
  if (rateLimitCheck.blocked && rateLimitCheck.response) {
    addCorsHeaders(rateLimitCheck.response, origin);
    addSecurityHeaders(rateLimitCheck.response);
    return rateLimitCheck.response;
  }

  // For API routes that pass rate limiting, add headers
  const response = NextResponse.next();
  addCorsHeaders(response, origin);
  addSecurityHeaders(response);

  // Add rate limit headers if we have a result
  if (rateLimitCheck.rateLimitResult) {
    addRateLimitHeaders(response, rateLimitCheck.rateLimitResult);
  }

  return response;
}

/**
 * Configure which paths the middleware runs on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
