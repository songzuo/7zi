/**
 * 统一 API 错误处理工具
 * 为所有 API 路由提供一致的错误响应格式
 * 
 * @module lib/api-error
 * @description 
 * - 统一的错误响应格式
 * - 快捷错误创建函数
 * - 路由处理器包装器
 * 
 * @example
 * // 在 API 路由中使用
 * import { apiError, handleApiRequest } from '@/lib/api-error';
 * 
 * export const GET = handleApiRequest(async (request) => {
 *   const data = await fetchData();
 *   return success(data);
 * });
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
} from '@/lib/errors';

// ============================================
// 类型定义
// ============================================

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
 * 统一 API 成功响应格式
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
  requestId?: string;
}

/**
 * 统一 API 响应类型
 */
export type ApiResponse<T = unknown> = ApiErrorResponse | ApiSuccessResponse<T>;

/**
 * 错误严重级别
 */
type ApiErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

/**
 * API 错误配置
 */
export interface ApiErrorConfig {
  code: typeof ErrorCodes[keyof typeof ErrorCodes];
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
  severity?: ApiErrorSeverity;
}

// ============================================
// 预设错误配置
// ============================================

/**
 * 预设错误映射
 */
const ERROR_CONFIGS: Record<string, ApiErrorConfig> = {
  // 4xx 客户端错误
  BAD_REQUEST: {
    code: ErrorCodes.VALIDATION_ERROR,
    message: '请求参数无效',
    statusCode: 400,
    severity: 'warning',
  },
  UNAUTHORIZED: {
    code: ErrorCodes.UNAUTHORIZED,
    message: '请先登录',
    statusCode: 401,
    severity: 'warning',
  },
  FORBIDDEN: {
    code: ErrorCodes.FORBIDDEN,
    message: '没有权限访问',
    statusCode: 403,
    severity: 'warning',
  },
  NOT_FOUND: {
    code: ErrorCodes.NOT_FOUND,
    message: '请求的资源不存在',
    statusCode: 404,
    severity: 'warning',
  },
  METHOD_NOT_ALLOWED: {
    code: ErrorCodes.VALIDATION_ERROR,
    message: '不支持的请求方法',
    statusCode: 405,
    severity: 'warning',
  },
  CONFLICT: {
    code: ErrorCodes.DUPLICATE_ENTRY,
    message: '资源已存在',
    statusCode: 409,
    severity: 'warning',
  },
  UNPROCESSABLE_ENTITY: {
    code: ErrorCodes.VALIDATION_ERROR,
    message: '请求数据格式不正确',
    statusCode: 422,
    severity: 'warning',
  },
  TOO_MANY_REQUESTS: {
    code: ErrorCodes.RATE_LIMITED,
    message: '请求过于频繁，请稍后再试',
    statusCode: 429,
    severity: 'warning',
  },

  // 5xx 服务器错误
  INTERNAL_SERVER_ERROR: {
    code: ErrorCodes.SERVER_ERROR,
    message: '服务器内部错误',
    statusCode: 500,
    severity: 'error',
  },
  SERVICE_UNAVAILABLE: {
    code: ErrorCodes.SERVICE_UNAVAILABLE,
    message: '服务暂时不可用',
    statusCode: 503,
    severity: 'error',
  },
  GATEWAY_TIMEOUT: {
    code: ErrorCodes.TIMEOUT,
    message: '请求超时',
    statusCode: 504,
    severity: 'error',
  },
};

// ============================================
// 错误创建函数
// ============================================

/**
 * 创建 API 错误响应
 * 
 * @param config - 错误配置
 * @param request - 请求对象（可选）
 * @param details - 额外详情
 * @returns NextResponse
 * 
 * @example
 * // 400 错误
 * return apiError('BAD_REQUEST', request, { field: 'email' });
 * 
 * // 404 错误
 * return apiError('NOT_FOUND', request, { resource: 'User', id: '123' });
 * 
 * // 500 错误
 * return apiError('INTERNAL_SERVER_ERROR', request);
 */
export function apiError(
  config: keyof typeof ERROR_CONFIGS | ApiErrorConfig,
  request?: NextRequest,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  const errorConfig = typeof config === 'string' 
    ? ERROR_CONFIGS[config] 
    : config;
  
  if (!errorConfig) {
    return unknownError(request);
  }

  const requestId = request?.headers.get('x-request-id') || uuidv4();
  const path = request?.url;

  const response: ApiErrorResponse = {
    error: errorConfig.code,
    code: errorConfig.code,
    message: errorConfig.message,
    timestamp: new Date().toISOString(),
    requestId,
    path,
  };

  if (details) {
    response.details = details;
  }

  // 开发环境添加调试信息
  if (process.env.NODE_ENV === 'development') {
    response.details = {
      ...response.details,
      _debug: {
        statusCode: errorConfig.statusCode,
        severity: errorConfig.severity,
      },
    };
  }

  // 记录错误
  apiLogger.error(`[${requestId}] API Error: ${errorConfig.code}`, {
    code: errorConfig.code,
    message: errorConfig.message,
    statusCode: errorConfig.statusCode,
    details,
    path,
  });

  return NextResponse.json(response, { status: errorConfig.statusCode });
}

/**
 * 快速创建 400 错误
 */
export function badRequest(
  message: string = '请求参数无效',
  details?: Record<string, unknown>,
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return apiError(
    { code: ErrorCodes.VALIDATION_ERROR, message, statusCode: 400 },
    request,
    details
  );
}

/**
 * 快速创建 401 错误
 */
export function unauthorized(
  message: string = '请先登录',
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return apiError('UNAUTHORIZED', request, { message });
}

/**
 * 快速创建 403 错误
 */
export function forbidden(
  message: string = '没有权限访问',
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return apiError('FORBIDDEN', request, { message });
}

/**
 * 快速创建 404 错误
 */
export function notFound(
  resource: string = '资源',
  id?: string,
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return apiError('NOT_FOUND', request, { resource, id });
}

/**
 * 快速创建 409 错误
 */
export function conflict(
  message: string = '资源已存在',
  details?: Record<string, unknown>,
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return apiError('CONFLICT', request, { ...details, message });
}

/**
 * 快速创建 422 错误
 */
export function unprocessable(
  message: string = '请求数据格式不正确',
  details?: Record<string, unknown>,
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return apiError('UNPROCESSABLE_ENTITY', request, { ...details, message });
}

/**
 * 快速创建 429 错误
 */
export function rateLimited(
  message: string = '请求过于频繁，请稍后再试',
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return apiError('TOO_MANY_REQUESTS', request, { message });
}

/**
 * 快速创建 500 错误
 */
export function serverError(
  message: string = '服务器内部错误',
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return apiError('INTERNAL_SERVER_ERROR', request, { message });
}

/**
 * 快速创建 503 错误
 */
export function serviceUnavailable(
  message: string = '服务暂时不可用',
  request?: NextRequest
): NextResponse<ApiErrorResponse> {
  return apiError('SERVICE_UNAVAILABLE', request, { message });
}

/**
 * 未知错误
 */
export function unknownError(request?: NextRequest): NextResponse<ApiErrorResponse> {
  return apiError('INTERNAL_SERVER_ERROR', request, { 
    message: '发生未知错误' 
  });
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

  return NextResponse.json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId,
  });
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

  return NextResponse.json({
    success: true,
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
}

// ============================================
// 错误处理包装器
// ============================================

/**
 * API 请求处理包装器
 * 自动捕获错误并返回统一格式
 * 
 * @param handler - 请求处理函数
 * @returns 包装后的处理函数
 * 
 * @example
 * export const GET = handleApiRequest(async (request) => {
 *   const users = await getUsers();
 *   return success(users);
 * });
 */
export function handleApiRequest<T extends (request: NextRequest, ...args: unknown[]) => Promise<Response>>(
  handler: T
): T {
  return (async (request: NextRequest, ...args: unknown[]) => {
    const requestId = request?.headers.get('x-request-id') || uuidv4();
    const startTime = Date.now();

    // 记录请求开始
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
      // 将错误转换为 AppError
      const appError = toAppError(error, {
        route: request?.url,
        requestId,
        method: request?.method,
      });

      // 记录错误
      apiLogger.error(`[${requestId}] ${appError.message}`, {
        code: appError.code,
        category: appError.category,
        severity: appError.severity,
      });

      // 获取 HTTP 状态码
      const statusCode = getStatusCode(appError.code);

      // 构建错误响应
      const response: ApiErrorResponse = {
        error: appError.code,
        code: appError.code,
        message: appError.userMessage || getUserFriendlyMessage(appError.code),
        timestamp: appError.timestamp,
        requestId,
        path: request?.url,
      };

      // 开发环境添加详情
      if (process.env.NODE_ENV === 'development') {
        response.details = {
          internal: {
            message: appError.message,
            category: appError.category,
            stack: appError.stack,
          },
        };
      }

      const nextResponse = NextResponse.json(response, { status: statusCode });
      nextResponse.headers.set('x-request-id', requestId);

      return nextResponse;
    }
  }) as T;
}

/**
 * 根据错误代码获取 HTTP 状态码
 */
function getStatusCode(code: string): number {
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

  return statusMap[code] || 500;
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
 * if (!validateRequired(body.name, 'name', request)) return;
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
 * 
 * @param value - 要验证的值
 * @param fieldName - 字段名称
 * @param request - 请求对象
 * @returns NextResponse | null
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
 * 
 * @param value - 要验证的值
 * @param fieldName - 字段名称
 * @param min - 最小值
 * @param max - 最大值
 * @param request - 请求对象
 * @returns NextResponse | null
 */
export function validateRange(
  value: number,
  fieldName: string,
  min: number,
  max: number,
  request: NextRequest
): NextResponse<ApiErrorResponse> | null {
  if (isNaN(value) || value < min || value > max) {
    return badRequest(`${fieldName} 必须在 ${min} 到 ${max} 之间`, { field: fieldName, min, max }, request);
  }
  return null;
}

/**
 * 验证枚举值
 * 
 * @param value - 要验证的值
 * @param fieldName - 字段名称
 * @param allowedValues - 允许的值数组
 * @param request - 请求对象
 * @returns NextResponse | null
 */
export function validateEnum<T extends string>(
  value: T,
  fieldName: string,
  allowedValues: T[],
  request: NextRequest
): NextResponse<ApiErrorResponse> | null {
  if (!allowedValues.includes(value)) {
    return badRequest(`${fieldName} 必须是以下值之一: ${allowedValues.join(', ')}`, 
      { field: fieldName, allowedValues }, 
      request
    );
  }
  return null;
}

// ============================================
// 导出
// ============================================

export default {
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
  unknownError,

  // 成功响应
  success,
  paginated,

  // 包装器
  handleApiRequest,

  // 验证
  validateRequired,
  validateString,
  validateRange,
  validateEnum,
};
