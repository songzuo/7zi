/**
 * @fileoverview Global Middleware for Request Tracking
 * @description Adds request ID to all requests for error tracking and debugging
 *
 * Features:
 * - Generates unique request ID for each request
 * - Adds request ID to request headers and response headers
 * - Enables request tracing across the application
 *
 * @example
 * // Access request ID in API routes
 * const requestId = request.headers.get('x-request-id');
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Middleware to add request ID to all requests
 */
export function middleware(request: NextRequest) {
  // Generate unique request ID
  const requestId = crypto.randomUUID();

  // Clone request headers and add request ID
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // Log incoming request
  logger.info(`Incoming request: ${request.method} ${request.nextUrl.pathname}`, {
    requestId,
    method: request.method,
    path: request.nextUrl.pathname,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
  });

  // Create response with modified headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add request ID to response headers for client tracking
  response.headers.set('x-request-id', requestId);

  return response;
}

/**
 * Configure middleware to match all API routes
 */
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match all pages
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
