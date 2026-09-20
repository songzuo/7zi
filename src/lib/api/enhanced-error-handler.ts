/**
 * @fileoverview Enhanced API Error Handler with Retry Logic
 * @description 统一的 API 错误响应格式处理器，支持重试逻辑和优雅降级
 *
 * 标准错误响应格式:
 * {
 *   success: false,
 *   error: {
 *     type: ErrorType,
 *     message: string,
 *     code?: string,
 *     details?: Record<string, unknown>,
 *     retryable: boolean,
 *     retryAfter?: number,
 *     timestamp: string
 *   }
 * }
 */

import { NextResponse } from 'next/server'
import { logger } from '../logger'

/**
 * Error types for different error categories
 */
export enum ApiErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  INTERNAL = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONFLICT = 'CONFLICT',
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(errorType: ApiErrorType, statusCode: number): boolean {
  const retryableTypes = [
    ApiErrorType.NETWORK_ERROR,
    ApiErrorType.TIMEOUT,
    ApiErrorType.SERVICE_UNAVAILABLE,
    ApiErrorType.INTERNAL,
  ]

  const retryableStatusCodes = [408, 429, 500, 502, 503, 504]

  return retryableTypes.includes(errorType) || retryableStatusCodes.includes(statusCode)
}

/**
 * Enhanced API Error class with retry support
 */
export class EnhancedApiError extends Error {
  constructor(
    public type: ApiErrorType,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
    public retryable: boolean = false,
    public retryAfter?: number
  ) {
    super(message)
    this.name = 'EnhancedApiError'

    // 自动判断是否可重试
    if (this.retryable === false) {
      this.retryable = isRetryableError(type, statusCode)
    }
  }
}

/**
 * Enhanced error response interface
 */
export interface EnhancedErrorResponse {
  success: false
  error: {
    type: ApiErrorType
    message: string
    code?: string
    details?: Record<string, unknown>
    retryable: boolean
    retryAfter?: number
    timestamp: string
  }
}

/**
 * Create enhanced error response
 */
export function createEnhancedErrorResponse(
  error: Error | EnhancedApiError,
  statusCode?: number,
  details?: Record<string, unknown>
): NextResponse<EnhancedErrorResponse> {
  const timestamp = new Date().toISOString()

  // 如果是 EnhancedApiError，使用它
  if (error instanceof EnhancedApiError) {
    const response = {
      success: false as const,
      error: {
        type: error.type,
        message: error.message,
        details: error.details,
        retryable: error.retryable,
        retryAfter: error.retryAfter,
        timestamp,
      },
    }

    const headers: HeadersInit = {}

    // 添加重试头
    if (error.retryAfter) {
      headers['Retry-After'] = String(error.retryAfter)
    }

    return NextResponse.json(response, {
      status: error.statusCode,
      headers,
    })
  }

  // 处理普通错误
  logger.error('API Error', error instanceof Error ? error : new Error(String(error)), {
    category: 'api',
  })

  // 判断错误类型
  let errorType = ApiErrorType.INTERNAL
  let status = statusCode ?? 500
  let retryable = false
  let retryAfter: number | undefined

  const message = error.message || 'An internal error occurred'

  // 根据消息判断错误类型
  const lowerMessage = message.toLowerCase()
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    errorType = ApiErrorType.NETWORK_ERROR
    status = 503
    retryable = true
  } else if (lowerMessage.includes('timeout')) {
    errorType = ApiErrorType.TIMEOUT
    status = 504
    retryable = true
  } else if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    errorType = ApiErrorType.NOT_FOUND
    status = 404
  } else if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
    errorType = ApiErrorType.UNAUTHORIZED
    status = 401
  } else if (lowerMessage.includes('forbidden') || lowerMessage.includes('403')) {
    errorType = ApiErrorType.FORBIDDEN
    status = 403
  }

  const response = {
    success: false as const,
    error: {
      type: errorType,
      message,
      details,
      retryable,
      retryAfter,
      timestamp,
    },
  }

  return NextResponse.json(response, { status })
}

/**
 * 创建各种类型的错误响应
 */

export function createValidationErrorResponse(
  message: string,
  details?: Record<string, unknown>
): NextResponse<EnhancedErrorResponse> {
  const error = new EnhancedApiError(ApiErrorType.VALIDATION, message, 400, details, false)
  return createEnhancedErrorResponse(error)
}

export function createNotFoundErrorResponse(
  message: string,
  details?: Record<string, unknown>
): NextResponse<EnhancedErrorResponse> {
  const error = new EnhancedApiError(ApiErrorType.NOT_FOUND, message, 404, details, false)
  return createEnhancedErrorResponse(error)
}

export function createUnauthorizedErrorResponse(
  message: string = 'Unauthorized access'
): NextResponse<EnhancedErrorResponse> {
  const error = new EnhancedApiError(ApiErrorType.UNAUTHORIZED, message, 401, undefined, false)
  return createEnhancedErrorResponse(error)
}

export function createForbiddenErrorResponse(
  message: string = 'Access forbidden'
): NextResponse<EnhancedErrorResponse> {
  const error = new EnhancedApiError(ApiErrorType.FORBIDDEN, message, 403, undefined, false)
  return createEnhancedErrorResponse(error)
}

export function createRateLimitErrorResponse(
  message: string = 'Rate limit exceeded',
  retryAfter?: number
): NextResponse<EnhancedErrorResponse> {
  const error = new EnhancedApiError(
    ApiErrorType.RATE_LIMIT,
    message,
    429,
    undefined,
    true,
    retryAfter
  )
  return createEnhancedErrorResponse(error)
}

export function createServiceUnavailableErrorResponse(
  message: string = 'Service temporarily unavailable',
  retryAfter?: number
): NextResponse<EnhancedErrorResponse> {
  const error = new EnhancedApiError(
    ApiErrorType.SERVICE_UNAVAILABLE,
    message,
    503,
    undefined,
    true,
    retryAfter
  )
  return createEnhancedErrorResponse(error)
}

export function createNetworkErrorResponse(
  message: string = 'Network error',
  retryAfter?: number
): NextResponse<EnhancedErrorResponse> {
  const error = new EnhancedApiError(
    ApiErrorType.NETWORK_ERROR,
    message,
    503,
    undefined,
    true,
    retryAfter
  )
  return createEnhancedErrorResponse(error)
}

export function createTimeoutErrorResponse(
  message: string = 'Request timeout',
  retryAfter?: number
): NextResponse<EnhancedErrorResponse> {
  const error = new EnhancedApiError(
    ApiErrorType.TIMEOUT,
    message,
    504,
    undefined,
    true,
    retryAfter
  )
  return createEnhancedErrorResponse(error)
}

/**
 * 增强的错误处理包装器
 */
export function withEnhancedErrorHandling<
  T extends (...args: unknown[]) => Promise<NextResponse<unknown>>,
>(handler: T): T {
  return (async (...args: unknown[]) => {
    try {
      return await handler(...(args as Parameters<T>))
    } catch (error) {
      return createEnhancedErrorResponse(error instanceof Error ? error : new Error(String(error)))
    }
  }) as unknown as T
}
