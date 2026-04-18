/**
 * 生产环境错误报告配置
 *
 * 提供统一的错误处理和报告机制：
 * - 结构化错误类型
 * - 错误边界
 * - 错误聚合
 * - 生产环境报告
 *
 * @version 1.0.0
 * @date 2026-03-28
 */

import { logger } from './logger'

// ============================================
// 错误类型定义
// ============================================
export enum ErrorCode {
  // 客户端错误 (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',

  // 服务端错误 (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT = 'TIMEOUT',

  // 业务错误
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

// ============================================
// 应用错误类
// ============================================
export interface AppErrorOptions {
  code: ErrorCode
  message: string
  statusCode?: number
  details?: Record<string, unknown>
  cause?: Error
  reportToSentry?: boolean
}

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>
  public readonly reportToSentry: boolean
  public readonly timestamp: string

  constructor(options: AppErrorOptions) {
    super(options.message)

    this.name = 'AppError'
    this.code = options.code
    this.statusCode = options.statusCode ?? this.getDefaultStatusCode(options.code)
    this.details = options.details
    this.reportToSentry = options.reportToSentry ?? this.shouldReportToSentry(options.code)
    this.timestamp = new Date().toISOString()

    // 保持正确的原型链
    Object.setPrototypeOf(this, AppError.prototype)

    // 如果有原始错误，记录原因
    if (options.cause) {
      this.cause = options.cause
    }
  }

  private getDefaultStatusCode(code: ErrorCode): number {
    switch (code) {
      case ErrorCode.BAD_REQUEST:
      case ErrorCode.VALIDATION_ERROR:
        return 400
      case ErrorCode.UNAUTHORIZED:
        return 401
      case ErrorCode.FORBIDDEN:
        return 403
      case ErrorCode.NOT_FOUND:
        return 404
      case ErrorCode.CONFLICT:
        return 409
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return 429
      case ErrorCode.SERVICE_UNAVAILABLE:
        return 503
      case ErrorCode.TIMEOUT:
        return 504
      default:
        return 500
    }
  }

  private shouldReportToSentry(code: ErrorCode): boolean {
    // 服务端错误才报告到 Sentry
    const serverErrors = [
      ErrorCode.INTERNAL_ERROR,
      ErrorCode.SERVICE_UNAVAILABLE,
      ErrorCode.DATABASE_ERROR,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      ErrorCode.TIMEOUT,
    ]
    return serverErrors.includes(code)
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV !== 'production' && { stack: this.stack }),
    }
  }
}

// ============================================
// 错误工厂函数
// ============================================
export function createBadRequestError(
  message: string = 'Bad Request',
  details?: Record<string, unknown>
): AppError {
  return new AppError({
    code: ErrorCode.BAD_REQUEST,
    message,
    details,
  })
}

export function createUnauthorizedError(
  message: string = 'Unauthorized',
  details?: Record<string, unknown>
): AppError {
  return new AppError({
    code: ErrorCode.UNAUTHORIZED,
    message,
    details,
  })
}

export function createForbiddenError(
  message: string = 'Forbidden',
  details?: Record<string, unknown>
): AppError {
  return new AppError({
    code: ErrorCode.FORBIDDEN,
    message,
    details,
  })
}

export function createNotFoundError(
  message: string = 'Not Found',
  details?: Record<string, unknown>
): AppError {
  return new AppError({
    code: ErrorCode.NOT_FOUND,
    message,
    details,
  })
}

export function createValidationError(
  message: string = 'Validation Error',
  details?: Record<string, unknown>
): AppError {
  return new AppError({
    code: ErrorCode.VALIDATION_ERROR,
    message,
    details,
  })
}

export function createInternalError(
  message: string = 'Internal Server Error',
  cause?: Error,
  details?: Record<string, unknown>
): AppError {
  return new AppError({
    code: ErrorCode.INTERNAL_ERROR,
    message,
    cause,
    details,
    reportToSentry: true,
  })
}

export function createServiceUnavailableError(
  message: string = 'Service Unavailable',
  details?: Record<string, unknown>
): AppError {
  return new AppError({
    code: ErrorCode.SERVICE_UNAVAILABLE,
    message,
    details,
    reportToSentry: true,
  })
}

export function createDatabaseError(
  message: string = 'Database Error',
  cause?: Error,
  details?: Record<string, unknown>
): AppError {
  return new AppError({
    code: ErrorCode.DATABASE_ERROR,
    message,
    cause,
    details,
    reportToSentry: true,
  })
}

// ============================================
// 错误处理器
// ============================================
export function handleError(
  error: unknown,
  context?: string
): {
  error: AppError
  shouldReport: boolean
} {
  let appError: AppError

  if (error instanceof AppError) {
    appError = error
  } else if (error instanceof Error) {
    appError = new AppError({
      code: ErrorCode.INTERNAL_ERROR,
      message: error.message,
      cause: error,
      reportToSentry: true,
    })
  } else {
    appError = new AppError({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Unknown error occurred',
      details: { originalError: String(error) },
      reportToSentry: true,
    })
  }

  // 记录错误日志
  const errorLogger = context ? logger.child(context) : logger
  errorLogger.error(
    `Error [${appError.code}]: ${appError.message}`,
    error instanceof Error ? error : undefined,
    {
      code: appError.code,
      statusCode: appError.statusCode,
      details: appError.details,
    }
  )

  return {
    error: appError,
    shouldReport: appError.reportToSentry,
  }
}

// ============================================
// 导出
// ============================================
export default {
  AppError,
  ErrorCode,
  handleError,
}
