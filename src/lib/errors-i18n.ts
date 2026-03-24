/**
 * i18n Error Handling Utilities
 *
 * Provides internationalized error messages for common error scenarios.
 * Supports client-side and server-side usage.
 */

import type { Locale } from '@/i18n/config';

/**
 * Error types that can be internationalized
 */
export type I18nErrorType =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'validation'
  | 'server'
  | 'unknown';

/**
 * Error message templates for each locale
 */
const ERROR_MESSAGES: Partial<Record<Locale, Record<I18nErrorType, string>>> = {
  zh: {
    network: '网络连接失败，请检查您的网络设置',
    timeout: '请求超时，请稍后再试',
    unauthorized: '未授权访问，请登录后继续',
    forbidden: '您没有权限执行此操作',
    notFound: '请求的资源不存在',
    validation: '输入数据验证失败',
    server: '服务器错误，请稍后再试',
    unknown: '发生未知错误',
  },
  en: {
    network: 'Network connection failed, please check your network settings',
    timeout: 'Request timeout, please try again later',
    unauthorized: 'Unauthorized access, please login to continue',
    forbidden: 'You do not have permission to perform this action',
    notFound: 'The requested resource does not exist',
    validation: 'Input data validation failed',
    server: 'Server error, please try again later',
    unknown: 'An unknown error occurred',
  },
};

/**
 * Get localized error message
 */
export function getErrorMessage(
  errorType: I18nErrorType,
  locale: Locale = 'zh',
  customMessage?: string
): string {
  return customMessage || ERROR_MESSAGES[locale]?.[errorType] || ERROR_MESSAGES.zh.unknown;
}

/**
 * Get error message from HTTP status code
 */
export function getHttpErrorMessage(
  status: number,
  locale: Locale = 'zh'
): string {
  const statusToErrorType: Record<number, I18nErrorType> = {
    400: 'validation',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'notFound',
    408: 'timeout',
    500: 'server',
    502: 'server',
    503: 'server',
    504: 'timeout',
  };

  const errorType = statusToErrorType[status] || 'unknown';
  return getErrorMessage(errorType, locale);
}

/**
 * Get error message from Error object
 */
export function getErrorFromException(
  error: Error | unknown,
  locale: Locale = 'zh'
): string {
  if (error instanceof Error) {
    // Try to extract error type from message
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return getErrorMessage('network', locale);
    }
    if (message.includes('timeout')) {
      return getErrorMessage('timeout', locale);
    }
    if (message.includes('unauthorized') || message.includes('unauthenticated')) {
      return getErrorMessage('unauthorized', locale);
    }
    if (message.includes('forbidden')) {
      return getErrorMessage('forbidden', locale);
    }
    if (message.includes('not found') || message.includes('404')) {
      return getErrorMessage('notFound', locale);
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return getErrorMessage('validation', locale);
    }

    // Return original error message if it's not a known type
    return error.message;
  }

  return getErrorMessage('unknown', locale);
}

/**
 * Format error with additional context
 */
export function formatErrorMessage(
  error: string,
  context?: string,
  locale: Locale = 'zh'
): string {
  if (!context) return error;

  const contextMessages: Record<Locale, Record<string, string>> = {
    zh: {
      operation: '操作失败：',
      request: '请求失败：',
      validation: '验证失败：',
    },
    en: {
      operation: 'Operation failed:',
      request: 'Request failed:',
      validation: 'Validation failed:',
    },
  };

  const prefix = contextMessages[locale]?.[context] || '';
  return `${prefix}${error}`;
}

/**
 * Server-side error response interface
 */
export interface ErrorResponse {
  error: string;
  message?: string;
  code?: number;
  details?: unknown;
}

/**
 * Create localized error response for API
 */
export function createErrorResponse(
  errorType: I18nErrorType,
  locale: Locale = 'zh',
  code?: number,
  details?: unknown
): ErrorResponse {
  return {
    error: getErrorMessage(errorType, locale),
    message: getErrorMessage(errorType, locale),
    code,
    details,
  };
}
