/**
 * 统一错误响应处理器
 * Unified Error Response Handler
 *
 * 提供统一的 API 响应格式和处理函数。
 */

import { NextRequest, NextResponse } from 'next/server'
import { UnifiedErrorType, UnifiedErrorInfo } from './unified-types'
import { UnifiedAppError, toUnifiedError, extractErrorInfo } from './unified-error'
import { logger } from '../logger'

/**
 * 统一错误响应格式
 * Unified Error Response Format
 */
export interface UnifiedErrorResponse {
  success: false
  error: {
    type: UnifiedErrorType
    message: string
    code?: string
    details?: Record<string, unknown>
    retryable: boolean
    retryAfter?: number
    timestamp: string
  }
}

/**
 * 统一成功响应格式
 * Unified Success Response Format
 */
export interface UnifiedSuccessResponse<T = unknown> {
  success: true
  data: T
  timestamp: string
}

/**
 * 创建统一错误响应
 * Create unified error response
 *
 * @param error - 错误对象 (可以是 Error, UnifiedAppError, 或其他类型)
 * @param statusCode - 可选的 HTTP 状态码 (会覆盖错误对象中的状态码)
 * @param details - 可选的额外详情 (会合并到错误详情中)
 * @returns NextResponse with unified error format
 */
export function createUnifiedErrorResponse(
  error: Error | UnifiedAppError,
  statusCode?: number,
  details?: Record<string, unknown>
): NextResponse<UnifiedErrorResponse> {
  const timestamp = new Date().toISOString()

  // 转换为统一错误
  const unifiedError = toUnifiedError(error)

  // 合并详情
  const mergedDetails = {
    ...unifiedError.details,
    ...details,
  }

  // 使用提供的状态码或错误对象中的状态码
  const finalStatusCode = statusCode ?? unifiedError.statusCode

  // 记录错误
  if (unifiedError.statusCode >= 500) {
    logger.error('API Error', unifiedError, {
      category: 'api',
      statusCode: finalStatusCode,
      errorType: unifiedError.type,
      details: mergedDetails,
    })
  } else {
    logger.warn('API Client Error', {
      category: 'api',
      statusCode: finalStatusCode,
      errorType: unifiedError.type,
      details: mergedDetails,
    })
  }

  // 构建响应
  const response = {
    success: false as const,
    error: {
      type: unifiedError.type,
      message: unifiedError.message,
      code: unifiedError.code,
      details: mergedDetails,
      retryable: unifiedError.retryable,
      retryAfter: unifiedError.retryAfter,
      timestamp,
    },
  }

  // 构建响应头
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  // 添加重试头
  if (unifiedError.retryAfter !== undefined) {
    headers['Retry-After'] = String(unifiedError.retryAfter)
  }

  // 在开发环境下添加更多信息
  if (process.env.NODE_ENV === 'development') {
    headers['X-Error-Debug'] = JSON.stringify({
      stack: unifiedError.stack,
      originalError:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
            }
          : String(error),
    })
  }

  return NextResponse.json(response, {
    status: finalStatusCode,
    headers,
  })
}

/**
 * 创建统一成功响应
 * Create unified success response
 *
 * @param data - 响应数据
 * @param status - HTTP 状态码 (默认 200)
 * @returns NextResponse with unified success format
 */
export function createUnifiedSuccessResponse<T = unknown>(
  data: T,
  status: number = 200
): NextResponse<UnifiedSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

/**
 * 创建验证错误响应 (400)
 * Create validation error response
 */
export function createValidationErrorResponse(
  message: string,
  details?: Record<string, unknown>
): NextResponse<UnifiedErrorResponse> {
  return createUnifiedErrorResponse(UnifiedAppError.validation(message, details))
}

/**
 * 创建未找到错误响应 (404)
 * Create not found error response
 */
export function createNotFoundErrorResponse(
  message: string,
  details?: Record<string, unknown>
): NextResponse<UnifiedErrorResponse> {
  return createUnifiedErrorResponse(UnifiedAppError.notFound(message, details))
}

/**
 * 创建未授权错误响应 (401)
 * Create unauthorized error response
 */
export function createUnauthorizedErrorResponse(
  message: string = 'Unauthorized access'
): NextResponse<UnifiedErrorResponse> {
  return createUnifiedErrorResponse(UnifiedAppError.unauthorized(message))
}

/**
 * 创建禁止访问错误响应 (403)
 * Create forbidden error response
 */
export function createForbiddenErrorResponse(
  message: string = 'Access forbidden'
): NextResponse<UnifiedErrorResponse> {
  return createUnifiedErrorResponse(UnifiedAppError.forbidden(message))
}

/**
 * 创建速率限制错误响应 (429)
 * Create rate limit error response
 */
export function createRateLimitErrorResponse(
  message: string = 'Rate limit exceeded',
  retryAfter?: number
): NextResponse<UnifiedErrorResponse> {
  return createUnifiedErrorResponse(UnifiedAppError.rateLimit(message, retryAfter))
}

/**
 * 创建内部错误响应 (500)
 * Create internal error response
 */
export function createInternalErrorResponse(
  message: string = 'Internal server error',
  details?: Record<string, unknown>
): NextResponse<UnifiedErrorResponse> {
  return createUnifiedErrorResponse(UnifiedAppError.internal(message, details))
}

/**
 * 创建服务不可用错误响应 (503)
 * Create service unavailable error response
 */
export function createServiceUnavailableErrorResponse(
  message: string = 'Service temporarily unavailable',
  retryAfter?: number
): NextResponse<UnifiedErrorResponse> {
  return createUnifiedErrorResponse(UnifiedAppError.serviceUnavailable(message, retryAfter))
}

/**
 * 创建网络错误响应 (503)
 * Create network error response
 */
export function createNetworkErrorResponse(
  message: string = 'Network error',
  retryAfter?: number
): NextResponse<UnifiedErrorResponse> {
  return createUnifiedErrorResponse(UnifiedAppError.network(message, retryAfter))
}

/**
 * 创建超时错误响应 (504)
 * Create timeout error response
 */
export function createTimeoutErrorResponse(
  message: string = 'Request timeout',
  retryAfter?: number
): NextResponse<UnifiedErrorResponse> {
  return createUnifiedErrorResponse(UnifiedAppError.timeout(message, retryAfter))
}

/**
 * 创建注册失败错误响应 (400)
 * Create registration failed error response
 */
export function createRegistrationFailedErrorResponse(
  message: string = 'Registration failed',
  details?: Record<string, unknown>
): NextResponse<UnifiedErrorResponse> {
  return createUnifiedErrorResponse(UnifiedAppError.registrationFailed(message, details))
}

/**
 * 创建弱密码错误响应 (400)
 * Create weak password error response
 */
export function createWeakPasswordErrorResponse(
  message: string = 'Password is too weak',
  details?: Record<string, unknown>
): NextResponse<UnifiedErrorResponse> {
  return createUnifiedErrorResponse(UnifiedAppError.weakPassword(message, details))
}

/**
 * 创建缺失令牌错误响应 (401)
 * Create missing token error response
 */
export function createMissingTokenErrorResponse(
  message: string = 'Authentication token is missing'
): NextResponse<UnifiedErrorResponse> {
  return createUnifiedErrorResponse(UnifiedAppError.missingToken(message))
}

/**
 * 创建冲突错误响应 (409)
 * Create conflict error response
 */
export function createConflictErrorResponse(
  message: string,
  details?: Record<string, unknown>
): NextResponse<UnifiedErrorResponse> {
  return createUnifiedErrorResponse(UnifiedAppError.conflict(message, details))
}

/**
 * 统一错误处理包装器
 * Unified error handling wrapper
 *
 * 自动捕获处理器中的错误并转换为统一的错误响应。
 *
 * @example
 * export const POST = withUnifiedErrorHandling(async (request: NextRequest) => {
 *   const data = await someAsyncOperation();
 *   return createUnifiedSuccessResponse(data);
 * });
 */
export function withUnifiedErrorHandling<
  T extends (...args: never[]) => Promise<NextResponse<unknown>>,
>(handler: T): T
export function withUnifiedErrorHandling(
  handler: (request: NextRequest) => Promise<NextResponse<unknown>>
): (request: NextRequest) => Promise<NextResponse<unknown>> {
  return async (request: NextRequest): Promise<NextResponse<unknown>> => {
    try {
      return await handler(request)
    } catch (error) {
      return createUnifiedErrorResponse(error instanceof Error ? error : new Error(String(error)))
    }
  }
}

/**
 * 解析统一响应
 * Parse unified response
 *
 * 从 NextResponse 中提取数据或错误信息。
 */
export function parseUnifiedResponse<T>(
  response: NextResponse<UnifiedSuccessResponse<T> | UnifiedErrorResponse>
): { success: true; data: T } | { success: false; error: UnifiedErrorInfo } {
  try {
    const clonedResponse = response.clone()
    const data = clonedResponse.json() as unknown

    if (typeof data === 'object' && data !== null) {
      if ('success' in data && data.success === true && 'data' in data) {
        return { success: true, data: data.data as T }
      }

      if ('success' in data && data.success === false && 'error' in data) {
        return { success: false, error: data.error as UnifiedErrorInfo }
      }
    }

    // 如果无法解析,返回错误
    return {
      success: false,
      error: {
        type: UnifiedErrorType.INTERNAL,
        message: 'Failed to parse response',
        statusCode: 500,
        retryable: false,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: {
        type: UnifiedErrorType.INTERNAL,
        message: 'Failed to parse response',
        statusCode: 500,
        retryable: false,
      },
    }
  }
}
