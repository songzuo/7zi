/**
 * Next.js Middleware
 * 
 * This middleware handles:
 * - CORS headers for API routes
 * - Security headers
 * - Request logging (development)
 * 
 * Note: Rate limiting and detailed security features have been migrated
 * to per-route wrappers in src/lib/middleware/
 */

import { NextRequest, NextResponse } from 'next/server';

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
 * Main proxy function (formerly middleware)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // Skip middleware for static files and Next.js internals
  if (
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
    pathname.endsWith('.webp')
  ) {
    return NextResponse.next();
  }

  // Handle OPTIONS requests (CORS preflight)
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    addCorsHeaders(response, origin);
    addSecurityHeaders(response);
    return response;
  }

  const response = NextResponse.next();
  
  // Add headers
  addCorsHeaders(response, origin);
  addSecurityHeaders(response);

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
