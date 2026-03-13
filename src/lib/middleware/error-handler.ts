/**
 * 统一错误处理中间件
 * 统一的 API 错误响应格式，带请求日志记录
 * 
 * @module lib/middleware/error-handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { apiLogger } from '@/lib/logger';
import {
  AppError,
  ErrorCodes,
  ErrorCategory,
  toAppError,
  getUserFriendlyMessage,
  type ErrorCode,
  type ErrorContext,
} from '@/lib/errors';

/**
 * 统一 API 错误响应格式
 */
export interface ApiErrorResponse {
  error: string;
  code: string;
  message: string;
  timestamp: string;
  path?: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

/**
 * 错误处理中间件配置
 */
export interface ErrorHandlerOptions {
  /** 是否包含堆栈跟踪 (仅开发环境) */
  includeStackTrace?: boolean;
  /** 自定义错误转换 */
  errorTransform?: (error: AppError) => AppError;
  /** 错误日志记录器 */
  logger?: (error: AppError, context: ErrorContext, requestId: string) => void;
  /** 请求 ID 提取器 */
  requestIdExtractor?: (request: NextRequest) => string | undefined;
}

/**
 * 默认配置
 */
const defaultOptions: ErrorHandlerOptions = {
  includeStackTrace: process.env.NODE_ENV === 'development',
};

/**
 * 创建统一格式的错误响应
 * 
 * @param error - 错误对象
 * @param request - 请求对象（可选）
 * @param options - 配置选项
 * @returns NextResponse
 */
export function createErrorResponse(
  error: unknown,
  request?: NextRequest,
  options: ErrorHandlerOptions = {}
): NextResponse<ApiErrorResponse> {
  const mergedOptions = { ...defaultOptions, ...options };
  const appError = toAppError(error);
  
  // 提取请求ID
  const requestId = mergedOptions.requestIdExtractor?.(request as NextRequest) 
    ?? request?.headers.get('x-request-id')
    ?? uuidv4();

  // 应用自定义转换
  const finalError = mergedOptions.errorTransform
    ? mergedOptions.errorTransform(appError)
    : appError;

  // 获取请求路径
  const path = request?.url;

  // 构建响应 - 统一错误响应格式
  const response: ApiErrorResponse = {
    error: finalError.code,
    code: finalError.code,
    message: finalError.userMessage || getUserFriendlyMessage(finalError.code),
    timestamp: finalError.timestamp,
    requestId,
    path,
  };

  // 开发环境添加更多详情
  if (mergedOptions.includeStackTrace) {
    response.details = {
      internal: {
        message: finalError.message,
        category: finalError.category,
        severity: finalError.severity,
        stack: finalError.stack,
      },
    };
  }

  // 获取 HTTP 状态码
  const statusCode = getHttpStatusFromError(finalError);

  // 记录错误
  if (mergedOptions.logger) {
    mergedOptions.logger(finalError, { route: path, requestId }, requestId);
  } else {
    // 默认日志记录
    logError(finalError, { route: path, requestId }, requestId);
  }

  return NextResponse.json(response, { status: statusCode });
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
 * 默认错误日志记录器
 */
function logError(error: AppError, context: ErrorContext, requestId: string): void {
  // 构建日志数据 - 敏感信息已由 Logger 自动过滤
  const logData = {
    requestId,
    code: error.code,
    category: error.category,
    severity: error.severity,
    userMessage: error.userMessage,
    context: error.context,
    // 仅在开发环境记录 cause 详情
    cause: process.env.NODE_ENV === 'development' ? error.cause?.message : undefined,
    // 生产环境应发送到日志服务，这里仅记录内部消息
    internalMessage: process.env.NODE_ENV === 'development' ? error.message : undefined,
  };

  switch (error.severity) {
    case 'fatal':
    case 'error':
      apiLogger.error(`[${requestId}] ${error.message}`, logData);
      break;
    case 'warning':
      apiLogger.warn(`[${requestId}] ${error.message}`, logData);
      break;
    default:
      apiLogger.info(`[${requestId}] ${error.message}`, logData);
  }
}

/**
 * API 错误处理装饰器
 * 包装 API 路由处理器，自动捕获错误并返回统一格式
 * 
 * @example
 * ```ts
 * export const GET = withErrorHandler(async (request: NextRequest) => {
 *   const data = await fetchData();
 *   return successResponse(data);
 * });
 * ```
 */
export function withErrorHandler(
  handler: (request: NextRequest, ...args: unknown[]) => Promise<Response>,
  options: ErrorHandlerOptions = {}
) {
  return async (request: NextRequest, ...args: unknown[]) => {
    const requestId = request?.headers.get('x-request-id') ?? uuidv4();

    // 记录请求开始
    const startTime = Date.now();
    apiLogger.info(`[${requestId}] ${request?.method} ${request?.url}`);

    try {
      const response = await handler(request, ...args);
      
      // 记录请求完成
      const duration = Date.now() - startTime;
      apiLogger.info(`[${requestId}] Completed in ${duration}ms`, {
        status: response.status,
      });

      return response;
    } catch (error) {
      // 提取请求上下文
      const context: ErrorContext = request
        ? {
            route: request.url,
            requestId,
            method: request.method,
          }
        : { requestId };

      const appError = toAppError(error, context);

      // 记录错误
      if (options.logger) {
        options.logger(appError, context, requestId);
      } else {
        logError(appError, context, requestId);
      }

      // 构建错误响应
      const response = createErrorResponse(appError, request, options);
      
      // 添加 requestId 到响应头
      response.headers.set('x-request-id', requestId);

      return response;
    }
  };
}

/**
 * 验证错误快捷响应
 */
export function validationError(
  message: string,
  field?: string,
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  const appError = new AppError(message, {
    code: ErrorCodes.VALIDATION_ERROR,
    category: ErrorCategory.VALIDATION,
    context: { field },
  });
  return createErrorResponse(appError, request);
}

/**
 * 未找到错误快捷响应
 */
export function notFoundError(
  resource: string = '资源',
  id?: string,
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  const appError = new AppError(`${resource}不存在`, {
    code: ErrorCodes.NOT_FOUND,
    category: ErrorCategory.APPLICATION,
    context: { resource, id },
  });
  return createErrorResponse(appError, request);
}

/**
 * 认证错误快捷响应
 */
export function authError(
  message: string = '需要登录才能访问',
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  const appError = new AppError(message, {
    code: ErrorCodes.UNAUTHORIZED,
    category: ErrorCategory.AUTH,
  });
  return createErrorResponse(appError, request);
}

/**
 * 权限错误快捷响应
 */
export function forbiddenError(
  message: string = '没有权限访问',
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  const appError = new AppError(message, {
    code: ErrorCodes.FORBIDDEN,
    category: ErrorCategory.PERMISSION,
  });
  return createErrorResponse(appError, request);
}

/**
 * 服务器错误快捷响应
 */
export function serverError(
  message: string = '服务器内部错误',
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  const appError = new AppError(message, {
    code: ErrorCodes.SERVER_ERROR,
    category: ErrorCategory.INFRASTRUCTURE,
  });
  return createErrorResponse(appError, request);
}

/**
 * 成功响应助手
 */
export function successResponse<T>(
  data: T,
  requestId?: string
): NextResponse<{
  success: boolean;
  data: T;
  timestamp: string;
  requestId?: string;
}> {
  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId,
  });
}

/**
 * 分页响应助手
 */
export function paginatedResponse<T>(
  data: T[],
  options: {
    page: number;
    limit: number;
    total: number;
    requestId?: string;
  }
): NextResponse<{
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
  requestId?: string;
}> {
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
    timestamp: new Date().toISOString(),
    requestId: options.requestId,
  });
}

export default {
  createErrorResponse,
  withErrorHandler,
  validationError,
  notFoundError,
  authError,
  forbiddenError,
  serverError,
  successResponse,
  paginatedResponse,
};
