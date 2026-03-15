/**
 * 统一 API 错误处理
 * 提供一致的错误响应格式和错误码
 */

import { NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/id';

/**
 * 标准错误码枚举
 */
export enum ErrorCode {
  // 通用错误 (1xxx)
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // 认证错误 (2xxx)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  FORBIDDEN = 'FORBIDDEN',
  
  // 资源错误 (3xxx)
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // 业务逻辑错误 (4xxx)
  INVALID_STATUS = 'INVALID_STATUS',
  INVALID_OPERATION = 'INVALID_OPERATION',
  
  // 服务器错误 (5xxx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * HTTP 状态码映射
 */
const errorCodeToStatus: Record<ErrorCode, number> = {
  [ErrorCode.UNKNOWN_ERROR]: 500,
  [ErrorCode.INVALID_REQUEST]: 400,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.INVALID_STATUS]: 400,
  [ErrorCode.INVALID_OPERATION]: 400,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
};

/**
 * 标准错误响应接口
 */
export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
    timestamp: string;
  };
}

/**
 * API 错误类
 */
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * 转换为 JSON 响应
   */
  toResponse(requestId?: string): NextResponse<ApiErrorResponse> {
    const status = errorCodeToStatus[this.code] || 500;
    const response: ApiErrorResponse = {
      error: {
        code: this.code,
        message: this.message,
        timestamp: new Date().toISOString(),
      },
    };

    if (this.details) {
      response.error.details = this.details;
    }

    if (requestId) {
      response.error.requestId = requestId;
    }

    return NextResponse.json(response, { status });
  }
}

/**
 * 创建标准错误响应
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  requestId?: string
): NextResponse<ApiErrorResponse> {
  const status = errorCodeToStatus[code] || 500;
  const response: ApiErrorResponse = {
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
    },
  };

  if (details) {
    response.error.details = details;
  }

  if (requestId) {
    response.error.requestId = requestId;
  }

  return NextResponse.json(response, { status });
}

/**
 * 错误处理包装器
 * 自动捕获异常并返回标准错误响应
 */
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiErrorResponse>> {
  return handler().catch((error) => {
    // 记录错误
    apiLogger.error('API Error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // 如果是已知的 API 错误
    if (error instanceof ApiError) {
      return error.toResponse();
    }

    // 未知错误
    return createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'An unexpected error occurred',
      {
        type: error instanceof Error ? error.constructor.name : typeof error,
      }
    );
  });
}

// 请求 ID 生成器 - 使用统一工具

/**
 * 预定义错误工厂函数
 */
export const ApiErrors = {
  unauthorized: (message = 'Authentication required') =>
    new ApiError(ErrorCode.UNAUTHORIZED, message),

  forbidden: (message = 'Access denied') =>
    new ApiError(ErrorCode.FORBIDDEN, message),

  notFound: (resource: string) =>
    new ApiError(ErrorCode.NOT_FOUND, `${resource} not found`),

  invalidToken: (message = 'Invalid or expired token') =>
    new ApiError(ErrorCode.INVALID_TOKEN, message),

  validationError: (message: string, details?: Record<string, unknown>) =>
    new ApiError(ErrorCode.VALIDATION_ERROR, message, details),

  invalidRequest: (message: string, details?: Record<string, unknown>) =>
    new ApiError(ErrorCode.INVALID_REQUEST, message, details),

  internalError: (message = 'Internal server error') =>
    new ApiError(ErrorCode.INTERNAL_ERROR, message),
};

export default ApiError;
