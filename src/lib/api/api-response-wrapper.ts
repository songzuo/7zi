/**
 * API Response Wrapper
 *
 * Standardizes API responses across all Next.js API routes
 */

import { NextResponse } from 'next/server'
import {
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiError,
  ApiErrorCode,
} from './api-error'

/**
 * Create a successful API response
 */
export function success<T = unknown>(
  data: T,
  meta?: ApiSuccessResponse<T>['meta'],
  options?: {
    status?: number
    requestId?: string
  }
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta,
    timestamp: new Date().toISOString(),
    requestId: options?.requestId,
  }

  return NextResponse.json(response, {
    status: options?.status || 200,
    headers: {
      'X-Request-ID': options?.requestId || generateRequestId(),
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Create an error API response
 */
export function error(
  error: ApiError | Error | unknown,
  options?: {
    status?: number
    requestId?: string
  }
): NextResponse<ApiErrorResponse> {
  const apiError = ApiError.fromError(error)

  const response: ApiErrorResponse = {
    code: apiError.code,
    message: apiError.message,
    detail: apiError.detail,
    errors: apiError.errors,
    timestamp: new Date().toISOString(),
    requestId: options?.requestId || apiError.requestId || generateRequestId(),
    stack: process.env.NODE_ENV === 'development' ? apiError.stack : undefined,
  }

  const status = options?.status || apiError.statusCode

  return NextResponse.json(response, {
    status,
    headers: {
      'X-Request-ID': response.requestId || '',
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Create a bad request error response
 */
export function badRequest(
  message: string = '请求参数错误',
  errors?: Record<string, string[]>,
  options?: {
    requestId?: string
  }
): NextResponse<ApiErrorResponse> {
  const apiError = new ApiError({
    code: ApiErrorCode.BAD_REQUEST,
    message,
    errors,
  })

  return error(apiError, {
    status: 400,
    requestId: options?.requestId,
  })
}

/**
 * Create an unauthorized error response
 */
export function unauthorized(
  message: string = '未授权，请登录',
  options?: {
    requestId?: string
  }
): NextResponse<ApiErrorResponse> {
  const apiError = new ApiError({
    code: ApiErrorCode.UNAUTHORIZED,
    message,
  })

  return error(apiError, {
    status: 401,
    requestId: options?.requestId,
  })
}

/**
 * Create a forbidden error response
 */
export function forbidden(
  message: string = '没有权限执行此操作',
  options?: {
    requestId?: string
  }
): NextResponse<ApiErrorResponse> {
  const apiError = new ApiError({
    code: ApiErrorCode.FORBIDDEN,
    message,
  })

  return error(apiError, {
    status: 403,
    requestId: options?.requestId,
  })
}

/**
 * Create a not found error response
 */
export function notFound(
  message: string = '请求的资源不存在',
  options?: {
    requestId?: string
  }
): NextResponse<ApiErrorResponse> {
  const apiError = new ApiError({
    code: ApiErrorCode.NOT_FOUND,
    message,
  })

  return error(apiError, {
    status: 404,
    requestId: options?.requestId,
  })
}

/**
 * Create a conflict error response
 */
export function conflict(
  message: string = '资源冲突',
  options?: {
    requestId?: string
  }
): NextResponse<ApiErrorResponse> {
  const apiError = new ApiError({
    code: ApiErrorCode.CONFLICT,
    message,
  })

  return error(apiError, {
    status: 409,
    requestId: options?.requestId,
  })
}

/**
 * Create a too many requests error response
 */
export function tooManyRequests(
  message: string = '请求过于频繁，请稍后再试',
  options?: {
    requestId?: string
  }
): NextResponse<ApiErrorResponse> {
  const apiError = new ApiError({
    code: ApiErrorCode.TOO_MANY_REQUESTS,
    message,
  })

  return error(apiError, {
    status: 429,
    requestId: options?.requestId,
  })
}

/**
 * Create an internal server error response
 */
export function internalError(
  message: string = '服务器内部错误',
  options?: {
    requestId?: string
  }
): NextResponse<ApiErrorResponse> {
  const apiError = new ApiError({
    code: ApiErrorCode.INTERNAL_SERVER_ERROR,
    message,
  })

  return error(apiError, {
    status: 500,
    requestId: options?.requestId,
  })
}

/**
 * Create a service unavailable error response
 */
export function serviceUnavailable(
  message: string = '服务暂时不可用',
  options?: {
    requestId?: string
  }
): NextResponse<ApiErrorResponse> {
  const apiError = new ApiError({
    code: ApiErrorCode.SERVICE_UNAVAILABLE,
    message,
  })

  return error(apiError, {
    status: 503,
    requestId: options?.requestId,
  })
}

/**
 * Wrap an async API route handler with error handling
 *
 * @example
 * ```typescript
 * export const GET = withApiHandler(async (request) => {
 *   const data = await someOperation();
 *   return success(data);
 * });
 * ```
 */
export function withApiHandler<T = unknown>(
  handler: (request: Request) => Promise<NextResponse<ApiResponse<T>>>
): (request: Request) => Promise<NextResponse<ApiResponse<T>>> {
  return async (request: Request) => {
    const requestId = generateRequestId()

    try {
      const response = await handler(request)

      // Add request ID to response headers if not present
      if (!response.headers.get('X-Request-ID')) {
        response.headers.set('X-Request-ID', requestId)
      }

      return response
    } catch (err) {
      return error(err, { requestId })
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
 * Type guard for success response
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return (response as ApiSuccessResponse<T>).success === true
}

/**
 * Type guard for error response
 */
export function isErrorResponse(response: ApiResponse): response is ApiErrorResponse {
  return !isSuccessResponse(response)
}

/**
 * Parse API response and throw error if failed
 */
export async function parseResponse<T = unknown>(response: Response): Promise<T> {
  const json = (await response.json()) as ApiResponse<T>

  if (isErrorResponse(json)) {
    const apiError = new ApiError({
      code: json.code,
      message: json.message,
      detail: json.detail,
      errors: json.errors,
      requestId: json.requestId,
    })
    throw apiError
  }

  return json.data
}
