/**
 * Application Error Types and Utilities
 */

// Error codes enum
export enum ErrorCodes {
  UNKNOWN = 'UNKNOWN',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
}

// Application error interface
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: unknown;
}

// Create an app error - supports multiple call signatures
export function createAppError(
  message: string,
  codeOrOptions?: string | { code?: string; statusCode?: number; details?: unknown },
  statusCode?: number
): AppError {
  const error = new Error(message) as AppError;
  
  if (typeof codeOrOptions === 'string') {
    error.code = codeOrOptions;
    error.statusCode = statusCode;
  } else if (codeOrOptions) {
    error.code = codeOrOptions.code;
    error.statusCode = codeOrOptions.statusCode;
    error.details = codeOrOptions.details;
  }
  
  return error;
}

// Format error message
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

// Check if error is a network error
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.name === 'NetworkError' ||
      (error as AppError).code === ErrorCodes.NETWORK
    );
  }
  return false;
}

// Get error code from error
export function getErrorCode(error: unknown): string {
  if (error instanceof Error) {
    return (error as AppError).code || ErrorCodes.UNKNOWN;
  }
  return ErrorCodes.UNKNOWN;
}

// Get user-friendly message
export function getUserFriendlyMessage(error: unknown): string {
  const code = getErrorCode(error);

  const messages: Record<string, string> = {
    [ErrorCodes.NETWORK]: '网络连接失败，请检查您的网络',
    [ErrorCodes.VALIDATION]: '输入数据验证失败',
    [ErrorCodes.AUTHENTICATION]: '登录状态已失效，请重新登录',
    [ErrorCodes.AUTHORIZATION]: '您没有权限执行此操作',
    [ErrorCodes.NOT_FOUND]: '请求的资源不存在',
    [ErrorCodes.SERVER_ERROR]: '服务器错误，请稍后再试',
    [ErrorCodes.TIMEOUT]: '请求超时，请重试',
    [ErrorCodes.RATE_LIMIT]: '请求过于频繁，请稍后再试',
    [ErrorCodes.UNKNOWN]: '发生未知错误，请稍后重试',
  };

  return messages[code] || messages[ErrorCodes.UNKNOWN];
}
