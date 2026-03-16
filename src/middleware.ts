import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const i18nMiddleware = createMiddleware(routing);

const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://plausible.io",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' blob: data: https:",
    "connect-src 'self' https://plausible.io https://umami.7zi.studio",
    "frame-src 'none'",
  ].join('; '),
};

const skipPaths = [
  '/api/health',
  '/api/health/ready',
  '/api/health/live',
  '/api/health/detailed',
];

export default function middleware(request: NextRequest): NextResponse {
  const response = i18nMiddleware(request);
  
  const pathname = request.nextUrl.pathname;
  const shouldSkipSecurity = skipPaths.some(path => pathname.startsWith(path));
  
  if (!shouldSkipSecurity) {
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"]
};
