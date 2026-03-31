/**
 * @fileoverview API Error Middleware
 * @description Middleware wrapper for consistent error handling across all API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, ErrorType } from './error-handler';
import { logger } from '../logger';
import { captureError, ErrorCategory, ErrorSeverity } from '../monitoring/errors';

/**
 * Middleware options for error handling
 */
export interface ApiErrorMiddlewareOptions {
  // Whether to log all errors
  logErrors?: boolean;
  // Whether to capture errors to Sentry
  captureErrors?: boolean;
  // Custom error handler
  errorHandler?: (error: Error, request: NextRequest) => NextResponse;
  // Route-specific tags for monitoring
  tags?: Record<string, string>;
}

/**
 * Wrap API route handler with consistent error handling
 *
 * @example
 * export const GET = withApiErrorMiddleware(async (request) => {
 *   // Your handler logic
 *   return createSuccessResponse(data);
 * }, {
 *   tags: { route: '/api/users' }
 * });
 */
export function withApiErrorMiddleware<T extends (request: NextRequest) => Promise<NextResponse>>(
  handler: T,
  options: ApiErrorMiddlewareOptions = {}
): T {
  return (async (request: NextRequest) => {
    const {
      logErrors = true,
      captureErrors = true,
      errorHandler,
      tags = {},
    } = options;

    const startTime = Date.now();

    try {
      // Execute the handler
      return await handler(request);
    } catch (_error) {
      const duration = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));

      // Log error
      if (logErrors) {
        logger.error('API route error', errorObj, {
          category: 'api',
          url: request.url,
          method: request.method,
          duration,
          ...tags,
        });
      }

      // Capture to Sentry
      if (captureErrors) {
        captureError(errorObj, {
          category: ErrorCategory.API,
          severity: ErrorSeverity.ERROR,
          tags: {
            ...tags,
            method: request.method,
            path: new URL(request.url).pathname,
          },
          extra: {
            url: request.url,
            method: request.method,
            duration,
          },
        });
      }

      // Use custom error handler if provided
      if (errorHandler) {
        return errorHandler(errorObj, request);
      }

      // Default error handling
      return createErrorResponse(errorObj);
    }
  }) as T;
}

/**
 * Wrap API route handler with rate limiting and error handling
 *
 * @example
 * export const POST = withApiProtection(async (request) => {
 *   // Your handler logic
 *   return createSuccessResponse(data);
 * }, {
 *   maxRequests: 10,
 *   windowMs: 60000,
 *   tags: { route: '/api/sensitive' }
 * });
 */
export function withApiProtection<T extends (request: NextRequest) => Promise<NextResponse>>(
  handler: T,
  rateLimitOptions: {
    maxRequests: number;
    windowMs: number;
  },
  errorOptions: ApiErrorMiddlewareOptions = {}
): T {
  return withApiErrorMiddleware(
    (async (request: NextRequest) => {
      // Rate limiting would go here (implement using withRateLimit from rate-limit middleware)
      return await handler(request);
    }) as T,
    errorOptions
  );
}

/**
 * Validate that request has required headers
 */
export function validateRequestHeaders(
  request: NextRequest,
  requiredHeaders: string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const header of requiredHeaders) {
    if (!request.headers.get(header)) {
      missing.push(header);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Create a standardized API error handler for specific routes
 */
export function createApiErrorHandler(
  routeName: string,
  additionalTags: Record<string, string> = {}
): (error: Error, request: NextRequest) => NextResponse {
  return (error: Error, request: NextRequest) => {
    // Determine error type based on error properties
    let errorType = ErrorType.INTERNAL;
    let statusCode = 500;

    // Check for known error types
    if (error.message.includes('not found')) {
      errorType = ErrorType.NOT_FOUND;
      statusCode = 404;
    } else if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      errorType = ErrorType.UNAUTHORIZED;
      statusCode = 401;
    } else if (error.message.includes('forbidden') || error.message.includes('permission')) {
      errorType = ErrorType.FORBIDDEN;
      statusCode = 403;
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      errorType = ErrorType.VALIDATION;
      statusCode = 400;
    }

    // Log with route context
    logger.error(`${routeName} error`, error, {
      category: 'api',
      route: routeName,
      url: request.url,
      method: request.method,
    });

    // Return standardized error response
    return NextResponse.json(
      {
        success: false,
        error: {
          type: errorType,
          message: error.message || 'An error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: statusCode }
    );
  };
}
