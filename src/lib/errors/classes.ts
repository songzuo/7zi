/**
 * 自定义错误类
 * 提供特定领域的错误类型，简化错误创建
 * 
 * @module lib/errors/classes
 */

import { ErrorCodes, ErrorCategory, ErrorSeverity } from './types';
import type { ErrorContext, RecoveryStrategy } from './types';

// AppError 类型（用于类型标注，不导入实现避免循环依赖）
type AppError = Error & {
  code: string;
  category: string;
  severity: string;
  userMessage: string;
  context: ErrorContext;
  recoveryStrategy: RecoveryStrategy;
  shouldReport: boolean;
  timestamp: string;
  cause?: Error;
};

/**
 * 验证错误 - 用于输入验证失败
 */
export class ValidationError extends Error {
  public readonly code = ErrorCodes.VALIDATION_ERROR;
  public readonly category = ErrorCategory.VALIDATION;
  public readonly severity = ErrorSeverity.WARNING;
  public readonly userMessage: string;
  public readonly context: ErrorContext;
  public readonly recoveryStrategy: RecoveryStrategy;
  public readonly shouldReport = false;
  public readonly timestamp: string;
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(
    message: string,
    field?: string,
    value?: unknown,
    options: {
      context?: ErrorContext;
      recoveryStrategy?: RecoveryStrategy;
    } = {}
  ) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.userMessage = field ? `${field}: ${message}` : message;
    this.context = { field, value, ...options.context };
    this.recoveryStrategy = options.recoveryStrategy ?? { type: 'none' };
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * 认证错误 - 用于认证失败
 */
export class AuthError extends Error {
  public readonly code = ErrorCodes.UNAUTHORIZED;
  public readonly category = ErrorCategory.AUTH;
  public readonly severity = ErrorSeverity.WARNING;
  public readonly userMessage = '您需要登录才能访问此资源';
  public readonly context: ErrorContext;
  public readonly recoveryStrategy: RecoveryStrategy;
  public readonly shouldReport = false;
  public readonly timestamp: string;

  constructor(
    message: string = '认证失败',
    options: {
      context?: ErrorContext;
      recoveryStrategy?: RecoveryStrategy;
    } = {}
  ) {
    super(message);
    this.name = 'AuthError';
    this.context = options.context ?? {};
    this.recoveryStrategy = options.recoveryStrategy ?? { type: 'redirect', redirectUrl: '/login' };
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError);
    }
  }
}

/**
 * 权限错误 - 用于授权失败
 */
export class ForbiddenError extends Error {
  public readonly code = ErrorCodes.FORBIDDEN;
  public readonly category = ErrorCategory.PERMISSION;
  public readonly severity = ErrorSeverity.WARNING;
  public readonly userMessage: string;
  public readonly context: ErrorContext;
  public readonly recoveryStrategy: RecoveryStrategy;
  public readonly shouldReport = false;
  public readonly timestamp: string;

  constructor(
    message: string = '没有权限访问',
    options: {
      context?: ErrorContext;
      recoveryStrategy?: RecoveryStrategy;
    } = {}
  ) {
    super(message);
    this.name = 'ForbiddenError';
    this.userMessage = message;
    this.context = options.context ?? {};
    this.recoveryStrategy = options.recoveryStrategy ?? { type: 'none' };
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ForbiddenError);
    }
  }
}

/**
 * 未找到错误 - 用于资源不存在
 */
export class NotFoundError extends Error {
  public readonly code = ErrorCodes.NOT_FOUND;
  public readonly category = ErrorCategory.APPLICATION;
  public readonly severity = ErrorSeverity.WARNING;
  public readonly userMessage: string;
  public readonly context: ErrorContext;
  public readonly recoveryStrategy: RecoveryStrategy;
  public readonly shouldReport = false;
  public readonly timestamp: string;
  public readonly resource?: string;
  public readonly resourceId?: string;

  constructor(
    resource: string = '资源',
    resourceId?: string,
    options: {
      context?: ErrorContext;
      recoveryStrategy?: RecoveryStrategy;
    } = {}
  ) {
    super(`${resource}${resourceId ? ` (${resourceId})` : ''}不存在`);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.resourceId = resourceId;
    this.userMessage = `您请求的${resource}不存在`;
    this.context = { resource, resourceId, ...options.context };
    this.recoveryStrategy = options.recoveryStrategy ?? { type: 'redirect', redirectUrl: '/' };
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotFoundError);
    }
  }
}

/**
 * 服务器错误 - 用于服务器内部错误
 */
export class ServerError extends Error {
  public readonly code = ErrorCodes.SERVER_ERROR;
  public readonly category = ErrorCategory.INFRASTRUCTURE;
  public readonly severity = ErrorSeverity.ERROR;
  public readonly userMessage = '服务器暂时无法处理您的请求，请稍后重试';
  public readonly context: ErrorContext;
  public readonly recoveryStrategy: RecoveryStrategy;
  public readonly shouldReport = true;
  public readonly timestamp: string;
  public readonly isOperational: boolean;

  constructor(
    message: string = '服务器内部错误',
    options: {
      isOperational?: boolean;
      context?: ErrorContext;
      recoveryStrategy?: RecoveryStrategy;
    } = {}
  ) {
    super(message);
    this.name = 'ServerError';
    this.isOperational = options.isOperational ?? true;
    this.context = options.context ?? {};
    this.recoveryStrategy = options.recoveryStrategy ?? { type: 'retry', maxRetries: 2, retryDelay: 1000 };
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServerError);
    }
  }
}

/**
 * 数据库错误 - 用于数据库操作失败
 */
export class DatabaseError extends Error {
  public readonly code = ErrorCodes.DATABASE_ERROR;
  public readonly category = ErrorCategory.DATABASE;
  public readonly severity = ErrorSeverity.ERROR;
  public readonly userMessage = '数据操作失败，请稍后重试';
  public readonly context: ErrorContext;
  public readonly recoveryStrategy: RecoveryStrategy;
  public readonly shouldReport = true;
  public readonly timestamp: string;

  constructor(
    message: string = '数据操作失败',
    options: {
      context?: ErrorContext;
      recoveryStrategy?: RecoveryStrategy;
    } = {}
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.context = options.context ?? {};
    this.recoveryStrategy = options.recoveryStrategy ?? { type: 'retry', maxRetries: 2, retryDelay: 1000 };
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }
}

/**
 * 网络错误 - 用于网络连接失败
 */
export class NetworkError extends Error {
  public readonly code = ErrorCodes.NETWORK_ERROR;
  public readonly category = ErrorCategory.NETWORK;
  public readonly severity = ErrorSeverity.ERROR;
  public readonly userMessage = '网络连接失败，请检查您的网络设置后重试';
  public readonly context: ErrorContext;
  public readonly recoveryStrategy: RecoveryStrategy;
  public readonly shouldReport = true;
  public readonly timestamp: string;

  constructor(
    message: string = '网络连接失败',
    options: {
      context?: ErrorContext;
      recoveryStrategy?: RecoveryStrategy;
    } = {}
  ) {
    super(message);
    this.name = 'NetworkError';
    this.context = options.context ?? {};
    this.recoveryStrategy = options.recoveryStrategy ?? { type: 'retry', maxRetries: 3, retryDelay: 1000 };
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
  }
}

/**
 * 速率限制错误 - 用于请求过于频繁
 */
export class RateLimitError extends Error {
  public readonly code = ErrorCodes.RATE_LIMITED;
  public readonly category = ErrorCategory.API;
  public readonly severity = ErrorSeverity.WARNING;
  public readonly userMessage = '请求过于频繁，请稍后再试';
  public readonly context: ErrorContext;
  public readonly recoveryStrategy: RecoveryStrategy;
  public readonly shouldReport = false;
  public readonly timestamp: string;
  public readonly retryAfter?: number;

  constructor(
    message: string = '请求过于频繁',
    retryAfter?: number,
    options: {
      context?: ErrorContext;
    } = {}
  ) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.context = { retryAfter, ...options.context };
    this.recoveryStrategy = { type: 'retry', maxRetries: 1, retryDelay: retryAfter ? retryAfter * 1000 : 5000 };
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RateLimitError);
    }
  }
}

export default {
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ServerError,
  DatabaseError,
  NetworkError,
  RateLimitError,
};
