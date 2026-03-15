/**
 * 统一 API 响应处理系统
 * 为所有 API 路由提供一致的响应格式和错误处理
 * 
 * @module lib/api-response
 * @description
 * - 统一的错误响应格式
 * - 统一的成功响应格式
 * - 快捷错误创建函数
 * - 路由处理器包装器
 * - 请求验证工具
 * 
 * @example
 * // 在 API 路由中使用
 * import { apiHandler, success, badRequest, notFound } from '@/lib/api-response';
 * 
 * export const GET = apiHandler(async (request) => {
 *   const { searchParams } = new URL(request.url);
 *   const id = searchParams.get('id');
 *   
 *   if (!id) {
 *     return badRequest('Missing id parameter', { field: 'id' }, request);
 *   }
 *   
 *   const data = await fetchData(id);
 *   if (!data) {
 *     return notFound('User', id, request);
 *   }
 *   
 *   return success(data, request);
 * });
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { apiLogger } from '@/lib/logger';
import {
  AppError,
  ErrorCodes,
  ErrorCategory,
  ErrorSeverity,
  toAppError,
  getUserFriendlyMessage,
  type ErrorCode,
  type ErrorContext,
} from '@/lib/errors';

// ============================================
// 类型定义
// ============================================

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
  requestId: string;
  timestamp: string;
  path?: string;
}

/**
 * 统一 API 成功响应格式
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  requestId?: string;
  timestamp: string;
}

/**
 * 统一 API 响应类型
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * API 处理器函数类型
 */
export type ApiHandler<T = unknown> = (
  request: NextRequest,
  context?: unknown
) => Promise<Response | NextResponse<ApiResponse<T>> | NextResponse<unknown>>;

/**
 * 错误处理配置
 */
export interface ErrorHandlerConfig {
  /** 是否包含堆栈跟踪 (仅开发环境) */
  includeStackTrace?: boolean;
  /** 自定义错误转换 */
  errorTransform?: (error: AppError) => AppError;
  /** 错误日志记录器 */
  logger?: (error: AppError, context: ErrorContext, requestId: string) => void;
  /** 请求 ID 提取器 */
  requestIdExtractor?: (request: NextRequest) => string | undefined;
  /** 是否记录请求日志 */
  logRequests?: boolean;
}

// ============================================
// 默认配置
// ============================================

const defaultConfig: Required<Omit<ErrorHandlerConfig, 'errorTransform' | 'logger' | 'requestIdExtractor'>> & ErrorHandlerConfig = {
  includeStackTrace: process.env.NODE_ENV === 'development',
  logRequests: true,
  errorTransform: undefined,
  logger: undefined,
  requestIdExtractor: undefined,
};

// ============================================
// 核心错误处理函数
// ============================================

/**
 * 创建统一格式的错误响应
 * 
 * @param error - 错误对象
 * @param request - 请求对象（可选）
 * @param config - 配置选项
 * @returns NextResponse
 */
export function createErrorResponse(
  error: unknown,
  request?: NextRequest,
  config: ErrorHandlerConfig = {}
): NextResponse<ApiErrorResponse> {
  const mergedConfig = { ...defaultConfig, ...config };
  const appError = toAppError(error);
  
  // 提取请求ID
  const requestId = mergedConfig.requestIdExtractor?.(request as NextRequest) 
    ?? request?.headers.get('x-request-id')
    ?? uuidv4();

  // 应用自定义转换
  const finalError = mergedConfig.errorTransform
    ? mergedConfig.errorTransform(appError)
    : appError;

  // 获取请求路径
  const path = request?.url;

  // 构建响应
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: finalError.code,
      message: finalError.userMessage || getUserFriendlyMessage(finalError.code),
    },
    requestId,
    timestamp: finalError.timestamp,
    path,
  };

  // 添加详情
  const details = buildErrorDetails(finalError, mergedConfig.includeStackTrace);
  if (details) {
    response.error.details = details;
  }

  // 获取 HTTP 状态码
  const statusCode = getHttpStatusFromError(finalError);

  // 记录错误
  if (mergedConfig.logger) {
    mergedConfig.logger(finalError, { route: path, requestId }, requestId);
  } else {
    logError(finalError, { route: path, requestId }, requestId);
  }

  const nextResponse = NextResponse.json(response, { status: statusCode });
  nextResponse.headers.set('x-request-id', requestId);
  
  return nextResponse;
}

/**
 * 构建错误详情
 */
function buildErrorDetails(
  error: AppError,
  includeStackTrace: boolean
): Record<string, unknown> | undefined {
  const details: Record<string, unknown> = {};

  // 添加上下文（过滤敏感信息）
  if (error.context && Object.keys(error.context).length > 0) {
    const safeContext = { ...error.context };
    delete safeContext.password;
    delete safeContext.token;
    delete safeContext.secret;
    details.context = safeContext;
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
  const statusMap: Record<string, number> = {
    [ErrorCodes.VALIDATION_ERROR]: 400,
    [ErrorCodes.UNAUTHORIZED]: 401,
    [ErrorCodes.SESSION_EXPIRED]: 401,
    [ErrorCodes.FORBIDDEN]: 403,
    [ErrorCodes.NOT_FOUND]: 404,
    [ErrorCodes.DATA_NOT_FOUND]: 404,
    [ErrorCodes.DUPLICATE_ENTRY]: 409,
    [ErrorCodes.RATE_LIMITED]: 429,
    [ErrorCodes.TIMEOUT]: 408,
    [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
    [ErrorCodes.SERVER_ERROR]: 500,
    [ErrorCodes.DATABASE_ERROR]: 500,
    [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,
    [ErrorCodes.NETWORK_ERROR]: 503,
  };

  return statusMap[error.code] || 500;
}

/**
 * 默认错误日志记录器
 */
function logError(error: AppError, context: ErrorContext, requestId: string): void {
  const logData = {
    requestId,
    code: error.code,
    category: error.category,
    severity: error.severity,
    userMessage: error.userMessage,
    context: error.context,
    cause: process.env.NODE_ENV === 'development' ? error.cause?.message : undefined,
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

// ============================================
// API 处理器包装器
// ============================================

/**
 * API 请求处理包装器
 * 自动捕获错误并返回统一格式
 * 
 * @param handler - 请求处理函数
 * @param config - 配置选项
 * @returns 包装后的处理函数
 * 
 * @example
 * export const GET = apiHandler(async (request) => {
 *   const users = await getUsers();
 *   return success(users, request);
 * });
 */
export function apiHandler<T = unknown>(
  handler: ApiHandler<T>,
  config: ErrorHandlerConfig = {}
): ApiHandler<T> {
  const mergedConfig = { ...defaultConfig, ...config };
  
  return async (request: NextRequest, context?: unknown) => {
    const requestId = mergedConfig.requestIdExtractor?.(request) 
      ?? request.headers.get('x-request-id') 
      ?? uuidv4();

    // 记录请求开始
    if (mergedConfig.logRequests) {
      const startTime = Date.now();
      apiLogger.info(`[${requestId}] ${request.method} ${request.url}`);
      
      // 存储开始时间以便后续使用
      (request as NextRequest & { _startTime?: number })._startTime = startTime;
    }

    try {
      const response = await handler(request, context);
      
      // 添加 requestId 到响应头
      response.headers.set('x-request-id', requestId);
      
      // 记录请求完成
      if (mergedConfig.logRequests) {
        const startTime = (request as NextRequest & { _startTime?: number })._startTime || Date.now();
        const duration = Date.now() - startTime;
        apiLogger.info(`[${requestId}] Completed in ${duration}ms`, {
          status: response.status,
        });
      }

      return response;
    } catch (error) {
      // 提取请求上下文
      const errorContext: ErrorContext = {
        route: request.url,
        requestId,
        method: request.method,
      };

      const appError = toAppError(error, errorContext);

      // 记录错误
      if (mergedConfig.logger) {
        mergedConfig.logger(appError, errorContext, requestId);
      } else {
        logError(appError, errorContext, requestId);
      }

      // 构建错误响应
      const response = createErrorResponse(appError, request, mergedConfig);
      
      return response;
    }
  };
}

// ============================================
// 快捷错误创建函数
// ============================================

/**
 * 快速创建 400 错误
 */
export function badRequest(
  message: string = '请求参数无效',
  details?: Record<string, unknown>,
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    new AppError(message, {
      code: ErrorCodes.VALIDATION_ERROR,
      category: ErrorCategory.VALIDATION,
      context: details,
    }),
    request
  );
}

/**
 * 快速创建 401 错误
 */
export function unauthorized(
  message: string = '请先登录',
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    new AppError(message, {
      code: ErrorCodes.UNAUTHORIZED,
      category: ErrorCategory.AUTH,
    }),
    request
  );
}

/**
 * 快速创建 403 错误
 */
export function forbidden(
  message: string = '没有权限访问',
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    new AppError(message, {
      code: ErrorCodes.FORBIDDEN,
      category: ErrorCategory.PERMISSION,
    }),
    request
  );
}

/**
 * 快速创建 404 错误
 */
export function notFound(
  resource: string = '资源',
  id?: string,
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    new AppError(`${resource}不存在`, {
      code: ErrorCodes.NOT_FOUND,
      category: ErrorCategory.APPLICATION,
      context: { resource, id },
    }),
    request
  );
}

/**
 * 快速创建 409 错误
 */
export function conflict(
  message: string = '资源已存在',
  details?: Record<string, unknown>,
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    new AppError(message, {
      code: ErrorCodes.DUPLICATE_ENTRY,
      category: ErrorCategory.APPLICATION,
      context: details,
    }),
    request
  );
}

/**
 * 快速创建 422 错误
 */
export function unprocessable(
  message: string = '请求数据格式不正确',
  details?: Record<string, unknown>,
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    new AppError(message, {
      code: ErrorCodes.VALIDATION_ERROR,
      category: ErrorCategory.VALIDATION,
      context: details,
    }),
    request
  );
}

/**
 * 快速创建 429 错误
 */
export function rateLimited(
  message: string = '请求过于频繁，请稍后再试',
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    new AppError(message, {
      code: ErrorCodes.RATE_LIMITED,
      category: ErrorCategory.APPLICATION,
    }),
    request
  );
}

/**
 * 快速创建 500 错误
 */
export function serverError(
  message: string = '服务器内部错误',
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    new AppError(message, {
      code: ErrorCodes.SERVER_ERROR,
      category: ErrorCategory.INFRASTRUCTURE,
      severity: ErrorSeverity.ERROR,
    }),
    request
  );
}

/**
 * 快速创建 503 错误
 */
export function serviceUnavailable(
  message: string = '服务暂时不可用',
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    new AppError(message, {
      code: ErrorCodes.SERVICE_UNAVAILABLE,
      category: ErrorCategory.INFRASTRUCTURE,
      severity: ErrorSeverity.ERROR,
    }),
    request
  );
}

/**
 * 通用错误创建
 */
export function apiError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    new AppError(message, {
      code,
      category: ErrorCategory.APPLICATION,
      context: details,
    }),
    request
  );
}

// ============================================
// 成功响应函数
// ============================================

/**
 * 创建成功响应
 * 
 * @param data - 响应数据
 * @param request - 请求对象（可选）
 * @returns NextResponse
 * 
 * @example
 * return success({ user: { id: '1', name: 'John' } });
 */
export function success<T>(
  data: T,
  request?: NextRequest
): NextResponse<ApiSuccessResponse<T>> {
  const requestId = request?.headers.get('x-request-id') || undefined;

  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    requestId,
    timestamp: new Date().toISOString(),
  };

  const response = NextResponse.json(body);
  
  if (requestId) {
    response.headers.set('x-request-id', requestId);
  }

  return response as NextResponse<ApiSuccessResponse<T>>;
}

/**
 * 创建分页成功响应
 * 
 * @param items - 数据项
 * @param page - 当前页码
 * @param limit - 每页数量
 * @param total - 总数
 * @param request - 请求对象
 * @returns NextResponse
 */
export function paginated<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
  request?: NextRequest
): NextResponse<ApiSuccessResponse<{ items: T[]; pagination: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
} }>> {
  const requestId = request?.headers.get('x-request-id') || undefined;

  const response = NextResponse.json({
    success: true as const,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    timestamp: new Date().toISOString(),
    requestId,
  });
  
  if (requestId) {
    response.headers.set('x-request-id', requestId);
  }

  return response;
}

/**
 * 创建已创建响应 (201)
 */
export function created<T>(
  data: T,
  request?: NextRequest
): NextResponse<ApiSuccessResponse<T>> {
  const requestId = request?.headers.get('x-request-id') || undefined;

  const response = NextResponse.json({
    success: true as const,
    data,
    requestId,
    timestamp: new Date().toISOString(),
  }, { status: 201 });
  
  if (requestId) {
    response.headers.set('x-request-id', requestId);
  }

  return response;
}

// ============================================
// 验证辅助函数
// ============================================

/**
 * 验证必填字段
 * 
 * @param value - 要验证的值
 * @param fieldName - 字段名称
 * @param request - 请求对象
 * @returns NextResponse | null (通过验证返回 null)
 * 
 * @example
 * const error = validateRequired(body.name, 'name', request);
 * if (error) return error;
 */
export function validateRequired(
  value: unknown,
  fieldName: string,
  request: NextRequest
): NextResponse<ApiErrorResponse> | null {
  if (value === null || value === undefined || value === '') {
    return badRequest(`${fieldName} 是必填字段`, { field: fieldName }, request);
  }
  return null;
}

/**
 * 验证字符串类型
 */
export function validateString(
  value: unknown,
  fieldName: string,
  request: NextRequest
): NextResponse<ApiErrorResponse> | null {
  if (typeof value !== 'string') {
    return badRequest(`${fieldName} 必须是字符串`, { field: fieldName }, request);
  }
  return null;
}

/**
 * 验证数值范围
 */
export function validateRange(
  value: number,
  fieldName: string,
  min: number,
  max: number,
  request: NextRequest
): NextResponse<ApiErrorResponse> | null {
  if (isNaN(value) || value < min || value > max) {
    return badRequest(
      `${fieldName} 必须在 ${min} 到 ${max} 之间`, 
      { field: fieldName, min, max }, 
      request
    );
  }
  return null;
}

/**
 * 验证枚举值
 */
export function validateEnum<T extends string>(
  value: T,
  fieldName: string,
  allowedValues: T[],
  request: NextRequest
): NextResponse<ApiErrorResponse> | null {
  if (!allowedValues.includes(value)) {
    return badRequest(
      `${fieldName} 必须是以下值之一: ${allowedValues.join(', ')}`, 
      { field: fieldName, allowedValues }, 
      request
    );
  }
  return null;
}

/**
 * 验证对象
 */
export function validateObject(
  value: unknown,
  fieldName: string,
  request: NextRequest
): NextResponse<ApiErrorResponse> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return badRequest(`${fieldName} 必须是对象`, { field: fieldName }, request);
  }
  return null;
}

/**
 * 验证数组
 */
export function validateArray(
  value: unknown,
  fieldName: string,
  request: NextRequest
): NextResponse<ApiErrorResponse> | null {
  if (!Array.isArray(value)) {
    return badRequest(`${fieldName} 必须是数组`, { field: fieldName }, request);
  }
  return null;
}

// ============================================
// 导出
// ============================================

export default {
  // 核心函数
  apiHandler,
  createErrorResponse,
  
  // 错误创建
  apiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  rateLimited,
  serverError,
  serviceUnavailable,

  // 成功响应
  success,
  paginated,
  created,

  // 验证
  validateRequired,
  validateString,
  validateRange,
  validateEnum,
  validateObject,
  validateArray,
};
