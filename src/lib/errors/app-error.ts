/**
 * 应用错误基类
 * 所有自定义错误的父类
 * 
 * @module lib/errors/app-error
 */

import { ErrorCodes, ErrorCategory, ErrorSeverity } from './types';
import type { ErrorCode, ErrorContext, RecoveryStrategy } from './types';

/**
 * 应用错误类 - 所有自定义错误的基类
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
    return messages[this.code] ?? messages[ErrorCodes.UNKNOWN];
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
