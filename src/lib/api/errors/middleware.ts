/**
 * @fileoverview API Error Middleware
 * @description Middleware wrapper for consistent error handling across all API routes
 *
 * Usage:
 * export const GET = withApiError(async (req) => {
 *   return createSuccessResponse(data);
 * }, { route: '/api/users' });
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiError, ErrorType } from './index'
import { logger } from '../../logger/index'

/**
 * Middleware configuration options
 */
export interface ApiMiddlewareOptions {
  /** Route name for logging and monitoring */
  route?: string
  /** Whether to log errors (default: true) */
  logErrors?: boolean
  /** Whether to include stack trace in production (default: false) */
  includeStack?: boolean
  /** Custom error handler */
  onError?: (error: ApiError, request: NextRequest) => NextResponse
}

/**
 * Default middleware options
 */
const DEFAULT_OPTIONS: Omit<Required<ApiMiddlewareOptions>, 'onError'> & {
  onError: ((error: ApiError, request: NextRequest) => NextResponse) | undefined
} = {
  route: 'unknown',
  logErrors: true,
  includeStack: false,
  onError: undefined,
}

/**
 * Get request ID from headers or generate one
 */
function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || crypto.randomUUID()
}

/**
 * Wrap an API route handler with error handling middleware
 *
 * @example
 * export const GET = withApiError(async (req) => {
 *   const user = await getUser(req);
 *   if (!user) throw ApiError.notFound('User not found');
 *   return createSuccessResponse(user);
 * }, { route: '/api/users' });
 */
export function withApiError<T extends (request: NextRequest) => Promise<NextResponse>>(
  handler: T,
  options: ApiMiddlewareOptions = {}
): T {
  const config = { ...DEFAULT_OPTIONS, ...options } as Required<ApiMiddlewareOptions>

  return (async (request: NextRequest) => {
    const startTime = Date.now()
    const requestId = getRequestId(request)

    try {
      return await handler(request)
    } catch (error) {
      const duration = Date.now() - startTime

      // Convert to ApiError if needed
      const apiError =
        error instanceof ApiError
          ? error
          : error instanceof Error
            ? ApiError.fromError(error)
            : ApiError.internal(String(error))

      // Add request ID
      apiError.requestId = requestId

      // Log error
      if (config.logErrors) {
        const logData = {
          route: config.route,
          method: request.method,
          url: request.url,
          duration,
          requestId,
          statusCode: apiError.statusCode,
          errorType: apiError.type,
        }

        if (apiError.statusCode >= 500) {
          logger.error(`[${config.route}] Server error`, apiError, logData)
        } else if (apiError.statusCode >= 400) {
          logger.warn(`[${config.route}] Client error: ${apiError.message}`, logData)
        } else {
          logger.info(`[${config.route}] Error: ${apiError.message}`, logData)
        }
      }

      // Custom error handler
      if (config.onError) {
        return config.onError(apiError, request)
      }

      // Build response
      const response: Record<string, unknown> = {
        success: false,
        error: {
          type: apiError.type,
          message: apiError.message,
          timestamp: new Date().toISOString(),
        },
        requestId,
      }

      // Add details in development
      if (config.includeStack || process.env.NODE_ENV === 'development') {
        if (apiError.details) {
          ;(response.error as Record<string, unknown>).details = apiError.details
        }
        if (apiError.cause?.stack) {
          ;(response.error as Record<string, unknown>).stack = apiError.cause.stack
        }
      }

      // Add retry info for retryable errors
      if (apiError.retryable) {
        const errorResponse = response.error as Record<string, unknown>
        if (apiError.retryAfter) {
          errorResponse.retryAfter = apiError.retryAfter
        }
        errorResponse.retryable = true
      }

      // Build headers
      const headers: HeadersInit = {}
      if (apiError.retryAfter) {
        headers['Retry-After'] = String(apiError.retryAfter)
      }
      headers['X-Request-ID'] = requestId

      return NextResponse.json(response, {
        status: apiError.statusCode,
        headers,
      })
    }
  }) as T
}

/**
 * Wrap an API route handler with error handling and authentication
 *
 * @example
 * export const GET = withApiAuth(async (req, ctx) => {
 *   const data = await getUserData(ctx.userId);
 *   return createSuccessResponse(data);
 * }, { route: '/api/users/me' });
 */
export function withApiAuth<
  T extends (request: NextRequest, context: { userId: string }) => Promise<NextResponse>,
>(handler: T, options: ApiMiddlewareOptions = {}): (request: NextRequest) => Promise<NextResponse> {
  return withApiError(async (request: NextRequest) => {
    // Simple auth check - in real code use proper auth middleware
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication required')
    }

    // Extract user ID from token (simplified)
    const userId = 'user-from-token' // Replace with actual token parsing

    return await handler(request, { userId })
  }, options)
}

/**
 * Wrap an async function to handle promise rejections
 * Alternative to try-catch for simple handlers
 *
 * @example
 * const handler = handleAsync(async (req) => {
 *   const data = await fetchData();
 *   return createSuccessResponse(data);
 * });
 */
export function handleAsync<T extends (...args: unknown[]) => Promise<NextResponse>>(fn: T): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...(args as Parameters<T>))
    } catch (error) {
      const apiError =
        error instanceof ApiError
          ? error
          : error instanceof Error
            ? ApiError.fromError(error)
            : ApiError.internal(String(error))

      return apiError.toResponse()
    }
  }) as T
}

// Re-export ApiError and ErrorType for convenience
export { ApiError, ErrorType } from './index'

/**
 * Helper to create error responses directly
 * Use this in route handlers for quick error returns
 *
 * @example
 * if (!data) return apiErrorResponse(ApiError.notFound('User not found'));
 */
export function apiErrorResponse(error: ApiError): NextResponse {
  return error.toResponse()
}

/**
 * Helper to create success responses with consistent format
 *
 * @example
 * return apiSuccessResponse({ user });
 */
export function apiSuccessResponse<T>(data: T): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  })
}
