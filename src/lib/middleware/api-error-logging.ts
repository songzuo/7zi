/**
 * API Error Logging Middleware
 *
 * Logs all API errors with structured context for debugging and monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger, LogLevel } from '@/lib/logger'
import { captureError, ErrorCategory, ErrorSeverity } from '@/lib/monitoring/errors'
import { ApiErrorResponse, ApiError, ApiErrorCode } from '@/lib/api/api-error'

/**
 * Middleware configuration
 */
export interface ErrorLoggingMiddlewareConfig {
  /** Enable/disable middleware */
  enabled?: boolean
  /** Minimum log level */
  logLevel?: LogLevel
  /** Enable Sentry integration */
  enableSentry?: boolean
  /** Log request body */
  logBody?: boolean
  /** Log request headers */
  logHeaders?: boolean
  /** Custom log prefix */
  logPrefix?: string
}

const DEFAULT_CONFIG: Required<ErrorLoggingMiddlewareConfig> = {
  enabled: true,
  logLevel: 'error',
  enableSentry: true,
  logBody: true,
  logHeaders: false,
  logPrefix: '[API Error]',
}

/**
 * Log API error with context
 */
export async function logApiError(
  request: NextRequest,
  response: NextResponse<ApiErrorResponse>,
  error?: Error | unknown,
  config: Required<ErrorLoggingMiddlewareConfig> = DEFAULT_CONFIG
): Promise<void> {
  if (!config.enabled) {
    return
  }

  const requestId = response.headers.get('X-Request-ID') || 'unknown'

  // Extract error details
  let errorDetails: unknown
  try {
    errorDetails = response.json()
  } catch (error) {
    errorDetails = { message: 'Unable to parse error response' }
  }

  // Build log context
  const context: Record<string, unknown> = {
    requestId,
    method: request.method,
    url: request.url,
    status: response.status,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    error: errorDetails,
  }

  // Add request body if configured
  if (config.logBody) {
    try {
      const contentType = request.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const body = await request.clone().json()
        // Sanitize sensitive fields
        context.body = sanitizeBody(body)
      }
    } catch (error) {
      // Body not available or not JSON
    }
  }

  // Add request headers if configured
  if (config.logHeaders) {
    context.headers = Object.fromEntries(request.headers.entries())
  }

  // Log error
  const message = `${config.logPrefix} ${request.method} ${request.url}`

  if (error instanceof Error) {
    logger.error(message, context, error as unknown as Record<string, unknown>)
  } else {
    logger.error(message, context)
  }

  // Capture to Sentry if enabled
  if (config.enableSentry && (config.logLevel === 'error' || config.logLevel === 'fatal')) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError({
            code: ApiErrorCode.INTERNAL_SERVER_ERROR,
            message: response.statusText,
            statusCode: response.status,
          })

    captureError(apiError, {
      category: ErrorCategory.API,
      severity: ErrorSeverity.ERROR,
      tags: {
        method: request.method,
        endpoint: new URL(request.url).pathname,
        status_code: String(response.status),
        request_id: requestId,
      },
      extra: context as Record<string, unknown>,
    })
  }
}

/**
 * Sanitize request body to remove sensitive fields
 */
function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'auth',
    'authorization',
    'credit_card',
    'ssn',
    'social_security',
  ]

  const sanitized = { ...body }

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      ;(sanitized as Record<string, unknown>)[field] = '[REDACTED]'
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    const value = (sanitized as Record<string, unknown>)[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      ;(sanitized as Record<string, unknown>)[key] = sanitizeBody(value)
    }
  }

  return sanitized
}

/**
 * Middleware wrapper for API routes
 *
 * @example
 * ```typescript
 * export const GET = withErrorLogging(async (request) => {
 *   const data = await someOperation();
 *   return success(data);
 * }, { logBody: true });
 * ```
 */
export function withErrorLogging<T = unknown>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>,
  config?: ErrorLoggingMiddlewareConfig
): (request: NextRequest) => Promise<NextResponse<T>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  return async (request: NextRequest) => {
    const requestId = generateRequestId()

    // Log request start
    if (
      finalConfig.enabled &&
      (finalConfig.logLevel === 'info' ||
        finalConfig.logLevel === 'debug' ||
        finalConfig.logLevel === 'warn' ||
        finalConfig.logLevel === 'error' ||
        finalConfig.logLevel === 'fatal')
    ) {
      logger.info(`${finalConfig.logPrefix} Request started`, {
        requestId,
        method: request.method,
        url: request.url,
      })
    }

    const startTime = Date.now()

    try {
      // Execute handler
      const response = await handler(request)

      // Add request ID to response
      response.headers.set('X-Request-ID', requestId)

      // Log request completion for errors
      if (!response.ok) {
        const duration = Date.now() - startTime

        logger.warn(`${finalConfig.logPrefix} Request completed with error`, {
          requestId,
          method: request.method,
          url: request.url,
          status: response.status,
          duration,
        })

        // Try to log error details
        try {
          const clone = response.clone()
          const json = (await clone.json()) as ApiErrorResponse
          await logApiError(
            request,
            response.clone() as NextResponse<ApiErrorResponse>,
            undefined,
            finalConfig
          )
        } catch (error) {
          // Response not JSON, skip detailed logging
        }
      }

      return response
    } catch (error) {
      const duration = Date.now() - startTime

      // Log error
      await logApiError(
        request,
        NextResponse.json(
          {
            code: ApiErrorCode.INTERNAL_SERVER_ERROR,
            message: '服务器内部错误',
            timestamp: new Date().toISOString(),
          },
          { status: 500 }
        ) as NextResponse<ApiErrorResponse>,
        error as unknown as Record<string, unknown> | undefined,
        finalConfig
      )

      logger.error(
        `${finalConfig.logPrefix} Request failed`,
        {
          requestId,
          method: request.method,
          url: request.url,
          duration,
          error: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? (error as unknown as Record<string, unknown>) : undefined
      )

      // Re-throw for the API wrapper to handle
      throw error
    }
  }
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Extract error information from response
 */
export async function extractErrorInfo(response: Response): Promise<{
  code: string
  message: string
  detail?: string
  errors?: Record<string, string[]>
  requestId?: string
}> {
  try {
    const json = (await response.json()) as ApiErrorResponse
    return {
      code: json.code,
      message: json.message,
      detail: json.detail,
      errors: json.errors,
      requestId: response.headers.get('X-Request-ID') || json.requestId,
    }
  } catch (error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: response.statusText || '未知错误',
    }
  }
}

/**
 * Check if error is retryable based on status code
 */
export function isRetryableError(statusCode: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(statusCode)
}

/**
 * Get retry delay based on status code
 */
export function getRetryDelay(statusCode: number, attempt: number): number {
  // Base delay in milliseconds
  const baseDelay = 1000

  // Multipliers for different error types
  const multipliers: Record<number, number> = {
    408: 2, // Request timeout - retry quickly
    429: 5, // Rate limited - wait longer
    500: 3, // Internal server error - moderate wait
    502: 2, // Bad gateway - retry quickly
    503: 4, // Service unavailable - longer wait
    504: 3, // Gateway timeout - moderate wait
  }

  const multiplier = multipliers[statusCode] || 3

  // Exponential backoff with jitter
  const delay = baseDelay * Math.pow(2, attempt - 1) * multiplier
  const jitter = Math.random() * 0.2 * delay // 20% jitter

  return Math.floor(delay + jitter)
}
