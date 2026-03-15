/**
 * 错误系统核心类型定义
 * 
 * @module lib/errors/types
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
  OK: 'OK',
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
