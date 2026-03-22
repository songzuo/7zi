/**
 * @fileoverview Request ID Middleware Wrapper for API Routes
 * @description Provides request ID generation and tracking for API routes
 *
 * This replaces the global middleware functionality with a wrapper approach
 * that can be applied per-API route. This is more flexible and aligns with
 * Next.js best practices.
 *
 * @example
 * ```typescript
 * import { withRequestId } from '@/lib/middleware/with-request-id';
 *
 * export const GET = withRequestId(async (request) => {
 *   const requestId = request.headers.get('x-request-id');
 *   // Your API logic here
 *   return NextResponse.json({ requestId, data });
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { setRequestIdContext, createRequestLogger } from '@/lib/api/api-logger';

/**
 * Request metadata tracking
 */
interface RequestContext {
  requestId: string;
  startTime: number;
  method: string;
  path: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Extract client IP from request headers
 */
function getClientIp(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  return realIp || cfConnectingIp || undefined;
}

/**
 * Extract path from URL (without query params)
 */
function extractPath(request: NextRequest): string {
  try {
    const url = new URL(request.url);
    return url.pathname;
  } catch {
    return request.nextUrl.pathname;
  }
}

/**
 * Create request context
 */
function createContext(request: NextRequest): RequestContext {
  const requestId = generateRequestId();

  return {
    requestId,
    startTime: Date.now(),
    method: request.method,
    path: extractPath(request),
    userAgent: request.headers.get('user-agent') || undefined,
    ip: getClientIp(request),
  };
}

/**
 * Log request start
 */
function logRequestStart(context: RequestContext): void {
  logger.api('Request started', {
    requestId: context.requestId,
    method: context.method,
    path: context.path,
    userAgent: context.userAgent,
    ip: context.ip,
  });
}

/**
 * Log request completion
 */
function logRequestComplete(
  context: RequestContext,
  response: NextResponse,
  error?: Error
): void {
  const duration = Date.now() - context.startTime;
  const statusCode = response.status;

  const logData = {
    requestId: context.requestId,
    method: context.method,
    path: context.path,
    statusCode,
    duration,
    durationMs: duration,
    success: !error && statusCode < 400,
  };

  if (error) {
    logger.error('Request failed', { ...logData, error: error.message });
  } else if (statusCode >= 500) {
    logger.error('Request returned server error', logData);
  } else if (statusCode >= 400) {
    logger.warn('Request returned client error', logData);
  } else {
    logger.api('Request completed', logData);
  }

  // Log slow requests
  if (duration > 500) {
    logger.warn('Slow request detected', logData);
  }

  // Log critical slow requests
  if (duration > 2000) {
    logger.error('Critical slow request detected', logData);
  }
}

/**
 * Request ID middleware wrapper
 *
 * This wrapper:
 * 1. Generates a unique request ID
 * 2. Adds it to request headers
 * 3. Sets it in logger context
 * 4. Logs request start and completion
 * 5. Adds it to response headers
 *
 * @param handler - The API route handler function
 * @param options - Configuration options
 * @returns A wrapped handler function
 *
 * @example
 * ```typescript
 * import { withRequestId } from '@/lib/middleware/with-request-id';
 *
 * export const GET = withRequestId(async (request) => {
 *   const requestId = request.headers.get('x-request-id');
 *   return NextResponse.json({ requestId, message: 'Hello' });
 * });
 * ```
 */
export function withRequestId<T = unknown>(
  handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse<T>>,
  options?: {
    /** Skip logging (default: false) */
    skipLogging?: boolean;
    /** Custom log level (default: 'info') */
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  }
): (request: NextRequest) => Promise<NextResponse<T>> {
  const { skipLogging = false, logLevel = 'info' } = options || {};

  return async (request: NextRequest) => {
    const context = createContext(request);

    // Clone request headers and add request ID
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-request-id', context.requestId);

    // Create a modified request with the new headers
    const modifiedRequest = new NextRequest(request.url, {
      method: request.method,
      headers: requestHeaders,
      body: request.body,
      cache: request.cache,
      credentials: request.credentials,
      integrity: request.integrity,
      keepalive: request.keepalive,
      mode: request.mode,
      redirect: request.redirect,
      referrer: request.referrer,
      referrerPolicy: request.referrerPolicy,
      signal: request.signal,
    });

    // Set request ID in logger context for downstream logging
    setRequestIdContext(context.requestId);

    // Log request start
    if (!skipLogging) {
      logRequestStart(context);
    }

    let response: NextResponse<T>;
    let error: Error | undefined;

    try {
      // Execute the handler with the modified request and context
      response = await handler(modifiedRequest, context);

      // Add request ID to response headers
      response.headers.set('x-request-id', context.requestId);
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));

      // Create error response
      response = NextResponse.json(
        {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || '服务器内部错误',
          requestId: context.requestId,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      ) as NextResponse<T>;

      response.headers.set('x-request-id', context.requestId);
    }

    // Log request completion
    if (!skipLogging) {
      logRequestComplete(context, response, error);
    }

    return response;
  };
}

/**
 * Create a request logger child with request ID
 *
 * This is useful for logging within API route handlers
 *
 * @example
 * ```typescript
 * export const GET = withRequestId(async (request, context) => {
 *   const requestLogger = createRequestLoggerForHandler(context);
 *   requestLogger.info('Processing user data');
 *   return NextResponse.json({ data });
 * });
 * ```
 */
export function createRequestLoggerForHandler(context: RequestContext) {
  return createRequestLogger(context.requestId);
}

/**
 * Extract request ID from request headers
 *
 * This is useful when you need to access the request ID
 * in places where you don't have the context object
 *
 * @example
 * ```typescript
 * const requestId = getRequestId(request);
 * ```
 */
export function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || 'unknown';
}
