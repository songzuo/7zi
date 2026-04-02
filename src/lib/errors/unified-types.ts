/**
 * 统一错误类型定义
 * Unified Error Type Definitions
 *
 * 此文件定义了项目中所有错误类型的统一枚举和接口。
 * 合并了 error-handler.ts, enhanced-error-handler.ts 和 errors.ts 的优点。
 */

/**
 * 统一错误类型枚举
 * Unified Error Type Enum
 */
export enum UnifiedErrorType {
  // Client errors (4xx)
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  BAD_REQUEST = 'BAD_REQUEST',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  MISSING_TOKEN = 'MISSING_TOKEN',
  CONFLICT = 'CONFLICT',

  // Server errors (5xx)
  INTERNAL = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
}

/**
 * 错误代码常量 (用于国际化)
 * Error code constants (for i18n)
 */
export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  TIMEOUT: 'TIMEOUT',
  REGISTRATION_FAILED: 'REGISTRATION_FAILED',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  UNKNOWN: 'UNKNOWN',
} as const

/**
 * 统一错误接口
 * Unified Error Interface
 */
export interface UnifiedErrorInfo {
  type: UnifiedErrorType
  message: string
  code?: string // 错误代码 (用于国际化)
  statusCode: number
  details?: Record<string, unknown>
  retryable: boolean
  retryAfter?: number
}

/**
 * HTTP 状态码到错误类型的映射
 * HTTP status code to error type mapping
 */
export const STATUS_CODE_TO_ERROR_TYPE: Record<number, UnifiedErrorType> = {
  400: UnifiedErrorType.BAD_REQUEST,
  401: UnifiedErrorType.UNAUTHORIZED,
  403: UnifiedErrorType.FORBIDDEN,
  404: UnifiedErrorType.NOT_FOUND,
  409: UnifiedErrorType.CONFLICT,
  429: UnifiedErrorType.RATE_LIMIT,
  500: UnifiedErrorType.INTERNAL,
  503: UnifiedErrorType.SERVICE_UNAVAILABLE,
  504: UnifiedErrorType.TIMEOUT,
}

/**
 * 判断错误是否可重试
 * Determine if an error is retryable
 */
export function isRetryableErrorType(errorType: UnifiedErrorType): boolean {
  const retryableTypes = [
    UnifiedErrorType.NETWORK_ERROR,
    UnifiedErrorType.TIMEOUT,
    UnifiedErrorType.SERVICE_UNAVAILABLE,
    UnifiedErrorType.INTERNAL,
    UnifiedErrorType.RATE_LIMIT,
  ]

  return retryableTypes.includes(errorType)
}

/**
 * 获取错误类型的默认 HTTP 状态码
 * Get default HTTP status code for error type
 */
export function getDefaultStatusCode(errorType: UnifiedErrorType): number {
  const typeToStatus: Record<UnifiedErrorType, number> = {
    [UnifiedErrorType.VALIDATION]: 400,
    [UnifiedErrorType.NOT_FOUND]: 404,
    [UnifiedErrorType.UNAUTHORIZED]: 401,
    [UnifiedErrorType.FORBIDDEN]: 403,
    [UnifiedErrorType.RATE_LIMIT]: 429,
    [UnifiedErrorType.BAD_REQUEST]: 400,
    [UnifiedErrorType.REGISTRATION_FAILED]: 400,
    [UnifiedErrorType.WEAK_PASSWORD]: 400,
    [UnifiedErrorType.MISSING_TOKEN]: 401,
    [UnifiedErrorType.CONFLICT]: 409,
    [UnifiedErrorType.INTERNAL]: 500,
    [UnifiedErrorType.SERVICE_UNAVAILABLE]: 503,
    [UnifiedErrorType.NETWORK_ERROR]: 503,
    [UnifiedErrorType.TIMEOUT]: 504,
  }

  return typeToStatus[errorType] || 500
}
