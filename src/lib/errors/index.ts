/**
 * 统一错误处理系统
 * Unified Error Handling System
 *
 * 这是项目的统一错误处理入口。
 * 所有模块都应该使用这里的类型、类和函数来处理错误。
 *
 * 使用方式:
 * ```typescript
 * import {
 *   UnifiedAppError,
 *   UnifiedErrorType,
 *   createUnifiedErrorResponse,
 *   createUnifiedSuccessResponse,
 *   withUnifiedErrorHandling,
 * } from '@/lib/errors';
 * ```
 *
 * 向后兼容性:
 * 此模块保留对旧错误处理系统的兼容导出，包括:
 * - src/lib/errors.ts 中的函数
 * - src/lib/api/error-handler.ts 中的函数
 * 请使用统一的 @/lib/errors 导入路径。
 */

// ============================================================
// Types
// ============================================================

export type { UnifiedErrorInfo } from './unified-types'

export {
  UnifiedErrorType,
  ErrorCodes,
  STATUS_CODE_TO_ERROR_TYPE,
  isRetryableErrorType,
  getDefaultStatusCode,
} from './unified-types'

// ============================================================
// Error Class
// ============================================================

export { UnifiedAppError, toUnifiedError, isUnifiedError, extractErrorInfo } from './unified-error'

// ============================================================
// Response Handler
// ============================================================

export type { UnifiedErrorResponse, UnifiedSuccessResponse } from './unified-response'

export {
  createUnifiedErrorResponse,
  createUnifiedSuccessResponse,
  createValidationErrorResponse,
  createNotFoundErrorResponse,
  createUnauthorizedErrorResponse,
  createForbiddenErrorResponse,
  createRateLimitErrorResponse,
  createInternalErrorResponse,
  createServiceUnavailableErrorResponse,
  createNetworkErrorResponse,
  createTimeoutErrorResponse,
  createRegistrationFailedErrorResponse,
  createWeakPasswordErrorResponse,
  createMissingTokenErrorResponse,
  createConflictErrorResponse,
  withUnifiedErrorHandling,
  parseUnifiedResponse,
} from './unified-response'

// ============================================================
// Legacy Exports (向后兼容)
// ============================================================

// 导入必要的类型和函数以支持遗留导出
import {
  UnifiedAppError as UAppError,
  toUnifiedError as tUnifiedError,
  isUnifiedError as iUnifiedError,
  extractErrorInfo as eExtractInfo,
} from './unified-error'

// 重新导出这些类型以在文件中使用
import { UnifiedErrorType as UET, ErrorCodes as EC } from './unified-types'

// 导入 Next.js 类型
import { NextResponse } from 'next/server'

// 在内部使用这些别名
const UnifiedErrorType = UET
const ErrorCodes = EC

/**
 * @deprecated Use UnifiedAppError instead
 */
export { UnifiedAppError as AppError } from './unified-error'

/**
 * @deprecated Use ErrorCodes instead
 */
export { ErrorCodes as legacyErrorCodes } from './unified-types'

/**
 * @deprecated Use UnifiedAppError.validation() instead
 */
export function createAppError(message: string, code?: string, statusCode?: number): UAppError {
  let type = UnifiedErrorType.INTERNAL

  if (code === ErrorCodes.NOT_FOUND) {
    type = UnifiedErrorType.NOT_FOUND
  } else if (code === ErrorCodes.UNAUTHORIZED) {
    type = UnifiedErrorType.UNAUTHORIZED
  } else if (code === ErrorCodes.FORBIDDEN) {
    type = UnifiedErrorType.FORBIDDEN
  } else if (code === ErrorCodes.VALIDATION_ERROR) {
    type = UnifiedErrorType.VALIDATION
  } else if (code === ErrorCodes.NETWORK_ERROR) {
    type = UnifiedErrorType.NETWORK_ERROR
  } else if (code === ErrorCodes.SERVER_ERROR) {
    type = UnifiedErrorType.INTERNAL
  }

  return new UAppError(type, message, statusCode, undefined, false, undefined, code)
}

/**
 * @deprecated Use toUnifiedError().message or toUnifiedError().toJSON() instead
 */
export function formatErrorMessage(error: unknown): string {
  const unifiedError = tUnifiedError(error)
  return unifiedError.message
}

/**
 * @deprecated Use toUnifiedError().type === UnifiedErrorType.NETWORK_ERROR instead
 */
export function isNetworkError(error: unknown): boolean {
  const unifiedError = tUnifiedError(error)
  return unifiedError.type === UnifiedErrorType.NETWORK_ERROR
}

/**
 * @deprecated Use toUnifiedError().code instead
 */
export function getErrorCode(error: unknown): string {
  const unifiedError = tUnifiedError(error)
  return unifiedError.code || ErrorCodes.UNKNOWN
}

/**
 * @deprecated Use custom error messages or i18n system instead
 */
export function getUserFriendlyMessage(code: string): string {
  const messages: Record<string, string> = {
    [ErrorCodes.NOT_FOUND]: '您请求的资源不存在',
    [ErrorCodes.UNAUTHORIZED]: '您需要登录才能访问此资源',
    [ErrorCodes.FORBIDDEN]: '您没有权限访问此资源',
    [ErrorCodes.VALIDATION_ERROR]: '您提交的数据格式不正确',
    [ErrorCodes.NETWORK_ERROR]: '网络连接失败,请检查您的网络设置',
    [ErrorCodes.SERVER_ERROR]: '服务器暂时无法处理您的请求,请稍后重试',
  }

  return messages[code] || '发生未知错误,请稍后重试'
}

// ============================================================
// API Error Handler Compatibility (向后兼容)
// 这些函数提供对 src/lib/api/error-handler.ts 的兼容
// ============================================================

/**
 * ErrorType 枚举 - 兼容 src/lib/api/error-handler.ts
 * @deprecated Use UnifiedErrorType instead
 */
export { UnifiedErrorType as ErrorType } from './unified-types'

/**
 * ApiError 类型别名 - 兼容 src/lib/api/error-handler.ts
 * @deprecated Use UnifiedAppError instead
 */
export type ApiError = UAppError

/**
 * @deprecated Use createValidationErrorResponse instead
 */
export function createValidationError(
  message: string,
  details?: Record<string, unknown>
): NextResponse<unknown> {
  return createValidationErrorResponse(message, details)
}

/**
 * @deprecated Use createNotFoundErrorResponse instead
 */
export function createNotFoundError(
  message: string,
  details?: Record<string, unknown>
): NextResponse<unknown> {
  return createNotFoundErrorResponse(message, details)
}

/**
 * @deprecated Use createUnauthorizedErrorResponse instead
 */
export function createUnauthorizedError(
  message: string = 'Unauthorized access'
): NextResponse<unknown> {
  return createUnauthorizedErrorResponse(message)
}

/**
 * @deprecated Use createForbiddenErrorResponse instead
 */
export function createForbiddenError(
  message: string = 'Access forbidden'
): NextResponse<unknown> {
  return createForbiddenErrorResponse(message)
}

/**
 * @deprecated Use createConflictErrorResponse instead
 */
export function createConflictError(
  message: string = 'Resource conflict',
  details?: Record<string, unknown>
): NextResponse<unknown> {
  return createConflictErrorResponse(message, details)
}

/**
 * @deprecated Use createRateLimitErrorResponse instead
 */
export function createRateLimitError(
  message: string = 'Rate limit exceeded'
): NextResponse<unknown> {
  return createRateLimitErrorResponse(message)
}

/**
 * @deprecated Use createServiceUnavailableErrorResponse instead
 */
export function createServiceUnavailableError(
  message: string = 'Service temporarily unavailable'
): NextResponse<unknown> {
  return createServiceUnavailableErrorResponse(message)
}

/**
 * @deprecated Use createInternalErrorResponse instead
 */
export function createInternalError(
  message: string = 'Internal server error',
  details?: Record<string, unknown>
): NextResponse<unknown> {
  return createInternalErrorResponse(message, details)
}

/**
 * @deprecated Use createUnifiedErrorResponse instead
 * 此函数为 API 路由提供统一的错误响应
 */
export function createErrorResponse(
  error: Error | UAppError | unknown,
  statusCode?: number,
  details?: Record<string, unknown>
): NextResponse<unknown> {
  if (error instanceof UAppError) {
    return createUnifiedErrorResponse(error, statusCode, details)
  }

  const unifiedError = error instanceof Error ? error : new Error(String(error))
  return createUnifiedErrorResponse(unifiedError, statusCode, details)
}

/**
 * @deprecated Use createUnifiedSuccessResponse instead
 */
export function createSuccessResponse<T = unknown>(
  data: T,
  statusCode: number = 200
): NextResponse<unknown> {
  return createUnifiedSuccessResponse(data, statusCode)
}