/**
 * 错误处理工具函数
 */

interface AppError extends Error {
  code?: string;
  statusCode?: number;
  digest?: string;
}

/**
 * 创建应用错误
 */
export function createAppError(
  message: string,
  code?: string,
  statusCode?: number
): AppError {
  const error = new Error(message) as AppError;
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

/**
 * 格式化错误消息
 */
export function formatErrorMessage(error: unknown): string {
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
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('abort')
    );
  }
  return false;
}

/**
 * 错误类型枚举
 */
export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

/**
 * 获取错误类型
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof Error) {
    const appError = error as AppError;
    if (appError.code) {
      return appError.code;
    }

    if (isNetworkError(error)) {
      return ErrorCodes.NETWORK_ERROR;
    }

    if (appError.statusCode) {
      switch (appError.statusCode) {
        case 401:
          return ErrorCodes.UNAUTHORIZED;
        case 403:
          return ErrorCodes.FORBIDDEN;
        case 404:
          return ErrorCodes.NOT_FOUND;
        case 500:
        case 502:
        case 503:
        case 504:
          return ErrorCodes.SERVER_ERROR;
      }
    }
  }

  return ErrorCodes.UNKNOWN;
}

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyMessage(code: string): string {
  switch (code) {
    case ErrorCodes.NOT_FOUND:
      return '您请求的资源不存在';
    case ErrorCodes.UNAUTHORIZED:
      return '您需要登录才能访问此资源';
    case ErrorCodes.FORBIDDEN:
      return '您没有权限访问此资源';
    case ErrorCodes.VALIDATION_ERROR:
      return '您提交的数据格式不正确';
    case ErrorCodes.NETWORK_ERROR:
      return '网络连接失败，请检查您的网络设置';
    case ErrorCodes.SERVER_ERROR:
      return '服务器暂时无法处理您的请求，请稍后重试';
    default:
      return '发生未知错误，请稍后重试';
  }
}