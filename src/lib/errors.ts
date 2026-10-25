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
 * 此模块保留对旧错误处理系统的兼容导出。
 */

// ============================================================
// 统一接口导出 (来自子模块)
// ============================================================

export type { UnifiedErrorInfo } from './errors/unified-types'
export {
  UnifiedErrorType,
  ErrorCodes,
  STATUS_CODE_TO_ERROR_TYPE,
  isRetryableErrorType,
  getDefaultStatusCode,
} from './errors/unified-types'

export {
  UnifiedAppError,
  toUnifiedError,
  isUnifiedError,
  extractErrorInfo,
} from './errors/unified-error'

export type { UnifiedErrorResponse, UnifiedSuccessResponse } from './errors/unified-response'
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
} from './errors/unified-response'

// ============================================================
// 向后兼容类型别名
// ============================================================

export { UnifiedAppError as AppError } from './errors/unified-error'
export { ErrorCodes as legacyErrorCodes } from './errors/unified-types'
export { UnifiedErrorType as ErrorType } from './errors/unified-types'

// ApiError 类型别名
import type { UnifiedAppError } from './errors/unified-error'
export type ApiError = UnifiedAppError

// ============================================================
// 向后兼容函数 (Legacy Functions)
// ============================================================

import { UnifiedErrorType as UET, ErrorCodes as EC } from './errors/unified-types'
import { UnifiedAppError as UAppError, toUnifiedError as tUnifiedError } from './errors/unified-error'

const UnifiedErrorType = UET
const ErrorCodes = EC

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
    // UnifiedErrorType 中没有独立的 SERVER_ERROR 类型,
    // ErrorCodes.SERVER_ERROR 只是国际化用的错误代码, 对应的统一类型是 INTERNAL (500)。
    type = UnifiedErrorType.INTERNAL
  }

  return new UAppError(type, message, statusCode, undefined, false, undefined, code)
}

/**
 * 读取旧版错误对象上可选的 code 字段
 * Read the optional legacy `code` field from an error object
 */
function getLegacyErrorCode(error: Error): string | undefined {
  if (error instanceof UAppError) {
    return error.code
  }
  if ('code' in error && typeof error.code === 'string') {
    return error.code
  }
  return undefined
}

/**
 * 读取旧版错误对象上可选的 statusCode 字段
 * Read the optional legacy `statusCode` field from an error object
 */
function getLegacyErrorStatusCode(error: Error): number | undefined {
  if (error instanceof UAppError) {
    return error.statusCode
  }
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode
  }
  return undefined
}

/**
 * @deprecated Use toUnifiedError().message or toUnifiedError().toJSON() instead
 *
 * 兼容语义: Error 实例返回原始 message, 字符串原样返回, 其余类型返回中文兜底文案。
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return '发生未知错误'
}

/**
 * @deprecated Use toUnifiedError().type === UnifiedErrorType.NETWORK_ERROR instead
 *
 * 兼容语义: 仅对 Error 实例判定, 依据 message 中的 network / fetch / timeout / abort 关键字,
 * 同时兼容统一错误体系中的 NETWORK_ERROR 类型。
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('abort')
  ) {
    return true
  }

  return tUnifiedError(error).type === UnifiedErrorType.NETWORK_ERROR
}

/**
 * @deprecated Use toUnifiedError().code instead
 *
 * 兼容语义: 显式 code > 网络错误判定 > HTTP 状态码映射 > UNKNOWN。
 */
export function getErrorCode(error: unknown): string {
  if (!(error instanceof Error)) {
    return ErrorCodes.UNKNOWN
  }

  const code = getLegacyErrorCode(error)
  if (code) {
    return code
  }

  if (isNetworkError(error)) {
    return ErrorCodes.NETWORK_ERROR
  }

  switch (getLegacyErrorStatusCode(error)) {
    case 401:
      return ErrorCodes.UNAUTHORIZED
    case 403:
      return ErrorCodes.FORBIDDEN
    case 404:
      return ErrorCodes.NOT_FOUND
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorCodes.SERVER_ERROR
    default:
      return ErrorCodes.UNKNOWN
  }
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
    [ErrorCodes.NETWORK_ERROR]: '网络连接失败，请检查您的网络设置',
    [ErrorCodes.SERVER_ERROR]: '服务器暂时无法处理您的请求，请稍后重试',
  }

  return messages[code] || '发生未知错误，请稍后重试'
}