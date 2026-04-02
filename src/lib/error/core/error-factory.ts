/**
 * @fileoverview Error Factory
 * @description Core error creation and utilities - unified with UnifiedAppError
 * @module error/core
 */

import {
  UnifiedAppError,
  toUnifiedError,
  isUnifiedError,
  extractErrorInfo,
} from "@/lib/errors/unified-error";
import {
  UnifiedErrorType,
  ErrorCodes,
  isRetryableErrorType,
  getDefaultStatusCode,
} from "@/lib/errors/unified-types";
import type { UnifiedErrorInfo } from "@/lib/errors/unified-types";

// ============================================================================
// Re-exports from unified error system
// ============================================================================

export {
  UnifiedAppError,
  toUnifiedError,
  isUnifiedError,
  extractErrorInfo,
};

export {
  UnifiedErrorType,
  ErrorCodes,
  isRetryableErrorType,
  getDefaultStatusCode,
};

export type { UnifiedErrorInfo };

// ============================================================================
// Type Alias for AppError (Unified)
// ============================================================================

/**
 * AppError - Unified error type
 * This is now an alias for UnifiedAppError
 */
export type AppError = UnifiedAppError;

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create application error (uses UnifiedAppError internally)
 * @deprecated Use UnifiedAppError directly or its static methods
 */
export function createAppError(
  message: string,
  code?: string,
  statusCode?: number,
): UnifiedAppError {
  let type = UnifiedErrorType.INTERNAL;

  if (code === ErrorCodes.NOT_FOUND) {
    type = UnifiedErrorType.NOT_FOUND;
  } else if (code === ErrorCodes.UNAUTHORIZED) {
    type = UnifiedErrorType.UNAUTHORIZED;
  } else if (code === ErrorCodes.FORBIDDEN) {
    type = UnifiedErrorType.FORBIDDEN;
  } else if (code === ErrorCodes.VALIDATION_ERROR) {
    type = UnifiedErrorType.VALIDATION;
  } else if (code === ErrorCodes.NETWORK_ERROR) {
    type = UnifiedErrorType.NETWORK_ERROR;
  } else if (code === ErrorCodes.SERVER_ERROR) {
    type = UnifiedErrorType.INTERNAL;
  }

  return new UnifiedAppError(type, message, statusCode, undefined, false, undefined, code);
}

/**
 * Format error message
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "发生未知错误";
}

/**
 * Check if error is network error
 */
export function isNetworkError(error: unknown): boolean {
  const unifiedError = toUnifiedError(error);
  return unifiedError.type === UnifiedErrorType.NETWORK_ERROR;
}

/**
 * Get error type
 */
export function getErrorCode(error: unknown): string {
  const unifiedError = toUnifiedError(error);
  // If code is explicitly set, use it
  if (unifiedError.code) {
    return unifiedError.code;
  }
  // Otherwise, map the type to the appropriate code
  switch (unifiedError.type) {
    case UnifiedErrorType.NETWORK_ERROR:
      return ErrorCodes.NETWORK_ERROR;
    case UnifiedErrorType.UNAUTHORIZED:
      return ErrorCodes.UNAUTHORIZED;
    case UnifiedErrorType.FORBIDDEN:
      return ErrorCodes.FORBIDDEN;
    case UnifiedErrorType.NOT_FOUND:
      return ErrorCodes.NOT_FOUND;
    case UnifiedErrorType.VALIDATION:
      return ErrorCodes.VALIDATION_ERROR;
    case UnifiedErrorType.TIMEOUT:
      return ErrorCodes.TIMEOUT;
    case UnifiedErrorType.RATE_LIMIT:
      return ErrorCodes.RATE_LIMIT;
    case UnifiedErrorType.INTERNAL:
    default:
      return ErrorCodes.SERVER_ERROR;
  }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    NOT_FOUND: "您请求的资源不存在",
    UNAUTHORIZED: "您需要登录才能访问此资源",
    FORBIDDEN: "您没有权限访问此资源",
    VALIDATION_ERROR: "您提交的数据格式不正确",
    NETWORK_ERROR: "网络连接失败，请检查您的网络设置",
    SERVER_ERROR: "服务器暂时无法处理您的请求，请稍后重试",
    RATE_LIMIT: "请求过于频繁，请稍后重试",
    TIMEOUT: "请求超时，请稍后重试",
    REGISTRATION_FAILED: "注册失败，请重试",
    WEAK_PASSWORD: "密码强度不足，请设置更复杂的密码",
    MISSING_TOKEN: "缺少认证令牌",
    CONFLICT: "资源冲突",
  };

  return messages[code] || "发生未知错误，请稍后重试";
}

// ============================================================================
// Exports
// ============================================================================

const ErrorFactory = {
  createAppError,
  formatErrorMessage,
  isNetworkError,
  getErrorCode,
  getUserFriendlyErrorMessage,
  ErrorCodes: {
    NOT_FOUND: "NOT_FOUND",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    NETWORK_ERROR: "NETWORK_ERROR",
    SERVER_ERROR: "SERVER_ERROR",
    UNKNOWN: "UNKNOWN",
  } as const,
};

export default ErrorFactory;
