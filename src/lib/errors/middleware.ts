/**
 * 错误处理中间件
 * 统一 API 错误响应格式
 * 
 * @module lib/errors/middleware
 */

import { NextResponse } from 'next/server';
import {
  AppError,
  ErrorCodes,
  ErrorCategory,
  toAppError,
  getUserFriendlyMessage,
  type ErrorCode,
  type ErrorContext,
} from './index';

/**
 * 统一 API 错误响应格式
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId?: string;
  timestamp: string;
}

/**
 * API 成功响应格式
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  requestId?: string;
  timestamp: string;
}

/**
 * API 响应类型
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 错误处理中间件配置
 */
export interface ErrorHandlerOptions {
  /** 是否包含堆栈跟踪 (仅开发环境) */
  includeStackTrace?: boolean;
  /** 自定义错误转换 */
  errorTransform?: (error: AppError) => AppError;
  /** 错误日志记录器 */
  logger?: (error: AppError, context: ErrorContext) => void;
  /** 请求 ID 提取器 */
  requestIdExtractor?: (request: Request) => string | undefined;
}

/**
 * 默认配置
 */
const defaultOptions: ErrorHandlerOptions = {
  includeStackTrace: process.env.NODE_ENV === 'development',
};

/**
 * 创建错误响应
 */
export function createErrorResponse(
  error: unknown,
  options: ErrorHandlerOptions = {}
): NextResponse<ApiErrorResponse> {
  const mergedOptions = { ...defaultOptions, ...options };
  const appError = toAppError(error);

  // 应用自定义转换
  const finalError = mergedOptions.errorTransform
    ? mergedOptions.errorTransform(appError)
    : appError;

  // 构建响应
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: finalError.code,
      message: finalError.userMessage || getUserFriendlyMessage(finalError.code),
      details: buildErrorDetails(finalError, mergedOptions.includeStackTrace ?? false),
    },
    timestamp: finalError.timestamp,
  };

  // 获取 HTTP 状态码
  const statusCode = getHttpStatusFromError(finalError);

  return NextResponse.json(response, { status: statusCode });
}

/**
 * 构建错误详情
 */
function buildErrorDetails(
  error: AppError,
  includeStackTrace: boolean
): Record<string, unknown> | undefined {
  const details: Record<string, unknown> = {};

  // 添加上下文
  if (error.context && Object.keys(error.context).length > 0) {
    details.context = error.context;
  }

  // 添加原因
  if (error.cause) {
    details.cause = error.cause.message;
  }

  // 开发环境下添加更多信息
  if (includeStackTrace) {
    details.internal = {
      message: error.message,
      category: error.category,
      severity: error.severity,
      stack: error.stack,
    };
  }

  return Object.keys(details).length > 0 ? details : undefined;
}

/**
 * 根据错误获取 HTTP 状态码
 */
function getHttpStatusFromError(error: AppError): number {
  // 从上下文中获取状态码
  if (error.context?.statusCode && typeof error.context.statusCode === 'number') {
    return error.context.statusCode;
  }

  // 根据错误代码映射
  switch (error.code) {
    case ErrorCodes.VALIDATION_ERROR:
      return 400;
    case ErrorCodes.UNAUTHORIZED:
    case ErrorCodes.SESSION_EXPIRED:
      return 401;
    case ErrorCodes.FORBIDDEN:
      return 403;
    case ErrorCodes.NOT_FOUND:
    case ErrorCodes.DATA_NOT_FOUND:
      return 404;
    case ErrorCodes.DUPLICATE_ENTRY:
      return 409;
    case ErrorCodes.RATE_LIMITED:
      return 429;
    case ErrorCodes.TIMEOUT:
      return 408;
    case ErrorCodes.SERVICE_UNAVAILABLE:
      return 503;
    case ErrorCodes.SERVER_ERROR:
    case ErrorCodes.DATABASE_ERROR:
    case ErrorCodes.EXTERNAL_SERVICE_ERROR:
    case ErrorCodes.NETWORK_ERROR:
      return 500;
    default:
      return 500;
  }
}

/**
 * API 错误处理装饰器
 * 用于包装 API 路由处理器
 * 
 * @example
 * ```ts
 * export const GET = withErrorHandler(async (request: NextRequest) => {
 *   const data = await fetchData();
 *   return NextResponse.json({ success: true, data });
 * });
 * ```
 */
export function withErrorHandler<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T,
  options: ErrorHandlerOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      // 提取请求上下文
      const request = args[0] as Request | undefined;
      const context: ErrorContext = request
        ? {
            route: request.url,
            requestId: options.requestIdExtractor?.(request),
          }
        : {};

      const appError = toAppError(error, context);

      // 记录错误
      if (options.logger) {
        options.logger(appError, context);
      }

      return createErrorResponse(appError, options);
    }
  }) as T;
}

/**
 * 验证错误快捷创建
 */
export function validationError(
  message: string,
  field?: string,
  value?: unknown
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    new AppError(message, {
      code: ErrorCodes.VALIDATION_ERROR,
      category: ErrorCategory.VALIDATION,
      context: { field, value },
    })
  );
}

/**
 * 未找到错误快捷创建
 */
export function notFoundError(
  resource: string = '资源',
  id?: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    new AppError(`${resource}不存在`, {
      code: ErrorCodes.NOT_FOUND,
      category: ErrorCategory.APPLICATION,
      context: { resource, id },
    })
  );
}

/**
 * 认证错误快捷创建
 */
export function authError(
  message: string = '需要登录才能访问'
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    new AppError(message, {
      code: ErrorCodes.UNAUTHORIZED,
      category: ErrorCategory.AUTH,
    })
  );
}

/**
 * 权限错误快捷创建
 */
export function forbiddenError(
  message: string = '没有权限访问'
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    new AppError(message, {
      code: ErrorCodes.FORBIDDEN,
      category: ErrorCategory.PERMISSION,
    })
  );
}

/**
 * 参数验证装饰器
 * 自动验证请求参数
 * 
 * @example
 * ```ts
 * export const POST = withValidation(
 *   { title: 'string', priority: 'string?' },
 *   async (request: NextRequest, validatedBody) => {
 *     // validatedBody 已通过验证
 *     return NextResponse.json({ success: true });
 *   }
 * );
 * ```
 */
export function withValidation<T extends (...args: unknown[]) => Promise<NextResponse>>(
  schema: Record<string, string>,
  handler: (request: Request, validatedBody: Record<string, unknown>) => Promise<NextResponse>
): (...args: unknown[]) => Promise<NextResponse> {
  return withErrorHandler(async (...args: unknown[]) => {
    const request = args[0] as Request;
    
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return validationError('请求体必须是有效的 JSON', 'body');
    }

    // 验证必填字段
    for (const [field, type] of Object.entries(schema)) {
      const isOptional = type.endsWith('?');
      const actualType = isOptional ? type.slice(0, -1) : type;

      if (!isOptional && body[field] === undefined) {
        return validationError(`${field} 是必填字段`, field);
      }

      if (body[field] !== undefined && typeof body[field] !== actualType) {
        return validationError(
          `${field} 必须是 ${actualType} 类型`,
          field,
          body[field]
        );
      }
    }

    return handler(request, body);
  });
}

/**
 * 响应助手 - 创建成功响应
 */
export function successResponse<T>(data: T, requestId?: string): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    requestId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 响应助手 - 创建分页响应
 */
export function paginatedResponse<T>(
  data: T[],
  options: {
    page: number;
    limit: number;
    total: number;
    requestId?: string;
  }
): NextResponse<ApiSuccessResponse<{ items: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>> {
  const totalPages = Math.ceil(options.total / options.limit);
  
  return NextResponse.json({
    success: true,
    data: {
      items: data,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: options.total,
        totalPages,
      },
    },
    requestId: options.requestId,
    timestamp: new Date().toISOString(),
  });
}

export default {
  createErrorResponse,
  withErrorHandler,
  withValidation,
  validationError,
  notFoundError,
  authError,
  forbiddenError,
  successResponse,
  paginatedResponse,
};