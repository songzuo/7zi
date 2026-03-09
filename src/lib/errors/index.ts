/**
 * 统一错误处理系统
 * 整合所有错误处理逻辑，提供完整的错误管理能力
 */

// ============================================
// 类型定义
// ============================================

/**
 * 错误分类
 */
export enum ErrorCategory {
  APPLICATION = 'application',
  API = 'api',
  NETWORK = 'network',
  VALIDATION = 'validation',
  USER_INPUT = 'user_input',
  PERMISSION = 'permission',
  INFRASTRUCTURE = 'infrastructure',
  EXTERNAL_SERVICE = 'external_service',
  THIRD_PARTY = 'third_party',
  DATABASE = 'database',
  AUTH = 'auth',
}

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  FATAL = 'fatal',     // 应用崩溃，需要重启
  ERROR = 'error',     // 功能失败，但应用可继续
  WARNING = 'warning', // 警告，可能影响体验
  INFO = 'info',       // 信息性错误日志
  DEBUG = 'debug',     // 调试信息
}

/**
 * 错误代码
 */
export const ErrorCodes = {
  // 通用错误
  UNKNOWN: 'UNKNOWN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // 认证授权
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // 网络
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  
  // 服务器
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  
  // 数据
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  // 第三方服务
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  EMAIL_ERROR: 'EMAIL_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * 错误上下文
 */
export interface ErrorContext {
  userId?: string;
  requestId?: string;
  route?: string;
  component?: string;
  action?: string;
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * 错误恢复策略
 */
export interface RecoveryStrategy {
  type: 'retry' | 'fallback' | 'redirect' | 'refresh' | 'none';
  maxRetries?: number;
  retryDelay?: number;
  fallbackValue?: unknown;
  redirectUrl?: string;
}

/**
 * 错误配置
 */
export interface ErrorConfig {
  code: ErrorCode;
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string;
  recoveryStrategy?: RecoveryStrategy;
  shouldReport?: boolean;
}

// ============================================
// 自定义错误类
// ============================================

/**
 * 应用错误类
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly userMessage: string;
  public readonly context: ErrorContext;
  public readonly recoveryStrategy?: RecoveryStrategy;
  public readonly shouldReport: boolean;
  public readonly cause?: Error;
  public readonly timestamp: string;

  constructor(
    message: string,
    options: {
      code?: ErrorCode;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      userMessage?: string;
      context?: ErrorContext;
      recoveryStrategy?: RecoveryStrategy;
      shouldReport?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message);
    
    this.name = 'AppError';
    this.code = options.code ?? ErrorCodes.UNKNOWN;
    this.category = options.category ?? ErrorCategory.APPLICATION;
    this.severity = options.severity ?? ErrorSeverity.ERROR;
    this.userMessage = options.userMessage ?? this.getDefaultUserMessage();
    this.context = options.context ?? {};
    this.recoveryStrategy = options.recoveryStrategy;
    this.shouldReport = options.shouldReport ?? true;
    this.cause = options.cause;
    this.timestamp = new Date().toISOString();

    // 保持正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * 获取默认用户消息
   */
  private getDefaultUserMessage(): string {
    return getUserFriendlyMessage(this.code);
  }

  /**
   * 转换为 JSON
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      userMessage: this.userMessage,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
      cause: this.cause?.message,
    };
  }
}

// ============================================
// 错误工厂函数
// ============================================

/**
 * 创建网络错误
 */
export function createNetworkError(
  message: string = '网络连接失败',
  options: Partial<ErrorConfig> & { context?: ErrorContext; cause?: Error } = {}
): AppError {
  return new AppError(message, {
    code: ErrorCodes.NETWORK_ERROR,
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.ERROR,
    userMessage: '网络连接失败，请检查您的网络设置后重试',
    recoveryStrategy: { type: 'retry', maxRetries: 3, retryDelay: 1000 },
    ...options,
  });
}

/**
 * 创建 API 错误
 */
export function createApiError(
  message: string,
  statusCode: number,
  options: Partial<ErrorConfig> & { context?: ErrorContext; cause?: Error } = {}
): AppError {
  const code = getErrorCodeFromStatus(statusCode);
  const category = ErrorCategory.API;
  const severity = statusCode >= 500 ? ErrorSeverity.ERROR : ErrorSeverity.WARNING;
  
  return new AppError(message, {
    code,
    category,
    severity,
    userMessage: getUserFriendlyMessage(code),
    context: { statusCode, ...options.context },
    recoveryStrategy: statusCode >= 500 
      ? { type: 'retry', maxRetries: 2, retryDelay: 2000 }
      : { type: 'none' },
    ...options,
  });
}

/**
 * 创建验证错误
 */
export function createValidationError(
  message: string,
  field?: string,
  options: Partial<ErrorConfig> & { context?: ErrorContext } = {}
): AppError {
  return new AppError(message, {
    code: ErrorCodes.VALIDATION_ERROR,
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.WARNING,
    userMessage: field ? `${field}: ${message}` : message,
    context: { field, ...options.context },
    recoveryStrategy: { type: 'none' },
    shouldReport: false,
    ...options,
  });
}

/**
 * 创建认证错误
 */
export function createAuthError(
  message: string = '认证失败',
  options: Partial<ErrorConfig> & { context?: ErrorContext } = {}
): AppError {
  return new AppError(message, {
    code: ErrorCodes.UNAUTHORIZED,
    category: ErrorCategory.AUTH,
    severity: ErrorSeverity.WARNING,
    userMessage: '您需要登录才能访问此资源',
    recoveryStrategy: { type: 'redirect', redirectUrl: '/login' },
    shouldReport: false,
    ...options,
  });
}

/**
 * 创建未找到错误
 */
export function createNotFoundError(
  resource: string = '资源',
  options: Partial<ErrorConfig> & { context?: ErrorContext } = {}
): AppError {
  return new AppError(`${resource}不存在`, {
    code: ErrorCodes.NOT_FOUND,
    category: ErrorCategory.APPLICATION,
    severity: ErrorSeverity.WARNING,
    userMessage: `您请求的${resource}不存在`,
    recoveryStrategy: { type: 'redirect', redirectUrl: '/' },
    shouldReport: false,
    ...options,
  });
}

/**
 * 创建数据库错误
 */
export function createDatabaseError(
  message: string,
  options: Partial<ErrorConfig> & { context?: ErrorContext } = {}
): AppError {
  return new AppError(message, {
    code: ErrorCodes.DATABASE_ERROR,
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.ERROR,
    userMessage: '数据操作失败，请稍后重试',
    recoveryStrategy: { type: 'retry', maxRetries: 2, retryDelay: 1000 },
    ...options,
  });
}

// ============================================
// 错误处理工具函数
// ============================================

/**
 * 从 HTTP 状态码获取错误代码
 */
export function getErrorCodeFromStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCodes.VALIDATION_ERROR;
    case 401:
      return ErrorCodes.UNAUTHORIZED;
    case 403:
      return ErrorCodes.FORBIDDEN;
    case 404:
      return ErrorCodes.NOT_FOUND;
    case 408:
      return ErrorCodes.TIMEOUT;
    case 409:
      return ErrorCodes.DUPLICATE_ENTRY;
    case 429:
      return ErrorCodes.RATE_LIMITED;
    case 500:
    case 502:
    case 503:
    case 504:
      return ErrorCodes.SERVER_ERROR;
    default:
      return ErrorCodes.UNKNOWN;
  }
}

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyMessage(code: ErrorCode): string {
  const messages: Record<ErrorCode, string> = {
    [ErrorCodes.UNKNOWN]: '发生未知错误，请稍后重试',
    [ErrorCodes.NOT_FOUND]: '您请求的资源不存在',
    [ErrorCodes.VALIDATION_ERROR]: '您提交的数据格式不正确',
    [ErrorCodes.UNAUTHORIZED]: '您需要登录才能访问此资源',
    [ErrorCodes.FORBIDDEN]: '您没有权限访问此资源',
    [ErrorCodes.SESSION_EXPIRED]: '您的登录已过期，请重新登录',
    [ErrorCodes.NETWORK_ERROR]: '网络连接失败，请检查您的网络设置',
    [ErrorCodes.TIMEOUT]: '请求超时，请稍后重试',
    [ErrorCodes.CONNECTION_REFUSED]: '无法连接到服务器，请稍后重试',
    [ErrorCodes.SERVER_ERROR]: '服务器暂时无法处理您的请求，请稍后重试',
    [ErrorCodes.SERVICE_UNAVAILABLE]: '服务暂时不可用，请稍后重试',
    [ErrorCodes.RATE_LIMITED]: '请求过于频繁，请稍后再试',
    [ErrorCodes.DATABASE_ERROR]: '数据操作失败，请稍后重试',
    [ErrorCodes.DATA_NOT_FOUND]: '未找到相关数据',
    [ErrorCodes.DUPLICATE_ENTRY]: '该数据已存在',
    [ErrorCodes.EXTERNAL_SERVICE_ERROR]: '外部服务暂时不可用',
    [ErrorCodes.EMAIL_ERROR]: '邮件发送失败，请稍后重试',
    [ErrorCodes.STORAGE_ERROR]: '文件存储失败，请稍后重试',
  };

  return messages[code] ?? messages[ErrorCodes.UNKNOWN];
}

/**
 * 格式化错误消息
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '发生未知错误';
}

/**
 * 判断是否为网络错误
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.category === ErrorCategory.NETWORK;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('abort') ||
      message.includes('connection')
    );
  }
  return false;
}

/**
 * 判断是否可重试
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.recoveryStrategy?.type === 'retry';
  }
  return isNetworkError(error);
}

/**
 * 判断是否需要报告
 */
export function shouldReportError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.shouldReport;
  }
  // 默认所有未分类错误都需要报告
  return true;
}

// ============================================
// 错误转换函数
// ============================================

/**
 * 将未知错误转换为 AppError
 */
export function toAppError(
  error: unknown,
  context?: ErrorContext
): AppError {
  if (error instanceof AppError) {
    // 合并上下文
    if (context) {
      return new AppError(error.message, {
        code: error.code,
        category: error.category,
        severity: error.severity,
        userMessage: error.userMessage,
        context: { ...error.context, ...context },
        recoveryStrategy: error.recoveryStrategy,
        shouldReport: error.shouldReport,
        cause: error.cause,
      });
    }
    return error;
  }

  if (error instanceof Error) {
    // 检查是否为网络错误
    if (isNetworkError(error)) {
      return createNetworkError(error.message, { cause: error, context });
    }

    // 检查是否为 Response
    if (error instanceof Response || (error as { status?: number }).status) {
      const response = error as unknown as { status: number; statusText: string };
      return createApiError(
        response.statusText || 'API Error',
        response.status,
        { cause: error, context }
      );
    }

    // 通用错误
    return new AppError(error.message, {
      cause: error,
      context,
    });
  }

  // 未知错误类型
  return new AppError(String(error), { context });
}

// ============================================
// 错误处理包装器
// ============================================

/**
 * 异步函数错误处理包装器
 */
export function withErrorHandler<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: {
    errorCode?: ErrorCode;
    category?: ErrorCategory;
    context?: ErrorContext | ((args: Parameters<T>) => ErrorContext);
    onError?: (error: AppError) => void;
    fallback?: ReturnType<T> | (() => ReturnType<T>);
  } = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const context = typeof options.context === 'function'
        ? options.context(args)
        : options.context;
      
      const appError = toAppError(error, context);
      
      // 调用错误回调
      options.onError?.(appError);
      
      // 如果有回退值，返回它
      if (options.fallback !== undefined) {
        return typeof options.fallback === 'function'
          ? options.fallback()
          : options.fallback;
      }
      
      throw appError;
    }
  }) as T;
}

/**
 * 同步函数错误处理包装器
 */
export function withSyncErrorHandler<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: {
    errorCode?: ErrorCode;
    category?: ErrorCategory;
    context?: ErrorContext;
    onError?: (error: AppError) => void;
    fallback?: ReturnType<T>;
  } = {}
): T {
  return ((...args: Parameters<T>) => {
    try {
      return fn(...args);
    } catch (error) {
      const appError = toAppError(error, options.context);
      options.onError?.(appError);
      
      if (options.fallback !== undefined) {
        return options.fallback;
      }
      
      throw appError;
    }
  }) as T;
}

// ============================================
// 导出
// ============================================

export default {
  AppError,
  ErrorCategory,
  ErrorSeverity,
  ErrorCodes,
  createNetworkError,
  createApiError,
  createValidationError,
  createAuthError,
  createNotFoundError,
  createDatabaseError,
  formatErrorMessage,
  getUserFriendlyMessage,
  isNetworkError,
  isRetryable,
  shouldReportError,
  toAppError,
  withErrorHandler,
  withSyncErrorHandler,
};
