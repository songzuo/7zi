/**
 * 统一 API 响应格式
 * 所有 API 端点应使用此模块提供的工具函数
 * 确保一致的响应格式和错误处理
 */

import { NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/id';
import { now } from '@/lib/datetime';
import { z } from 'zod';

// ============================================
// 类型定义
// ============================================

/**
 * 标准错误码
 * 使用语义化的错误码，便于客户端处理
 */
export enum ErrorCode {
  // 客户端错误 (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // 服务端错误 (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * 标准成功响应格式
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
  requestId: string;
  timestamp: string;
}

/**
 * 标准错误响应格式
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    stack?: string; // 仅开发环境
  };
  requestId: string;
  timestamp: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  total?: number;
}

// ============================================
// 请求 ID 生成
// ============================================

// 使用统一的 ID 生成工具 (已导入 generateRequestId)

// ============================================
// 成功响应
// ============================================

/**
 * 创建成功响应
 */
export function success<T>(
  data: T,
  options: {
    status?: number;
    meta?: PaginationParams & Record<string, unknown>;
    requestId?: string;
  } = {}
): NextResponse<ApiSuccessResponse<T>> {
  const requestId = options.requestId || generateRequestId();
  
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    requestId,
    timestamp: now(),
  };

  if (options.meta) {
    response.meta = options.meta;
  }

  return NextResponse.json(response, { status: options.status || 200 });
}

/**
 * 创建创建成功响应 (201)
 */
export function created<T>(
  data: T,
  options: { requestId?: string } = {}
): NextResponse<ApiSuccessResponse<T>> {
  return success(data, { status: 201, ...options });
}

/**
 * 创建无内容响应 (204)
 */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * 创建分页响应
 */
export function paginated<T>(
  data: T[],
  options: PaginationParams & { requestId?: string } = {}
): NextResponse<ApiSuccessResponse<T[]>> {
  return success(data, { 
    meta: {
      page: options.page || 1,
      limit: options.limit || data.length,
      total: options.total || data.length,
    },
    requestId: options.requestId,
  });
}

// ============================================
// 错误响应
// ============================================

/**
 * 错误码到 HTTP 状态码的映射
 */
const errorCodeToStatus: Record<ErrorCode, number> = {
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.VALIDATION_ERROR]: 422,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
};

/**
 * 用户友好的错误消息
 */
const userFriendlyMessages: Record<ErrorCode, string> = {
  [ErrorCode.BAD_REQUEST]: '请求格式不正确',
  [ErrorCode.UNAUTHORIZED]: '请先登录后再访问',
  [ErrorCode.FORBIDDEN]: '您没有权限执行此操作',
  [ErrorCode.NOT_FOUND]: '请求的资源不存在',
  [ErrorCode.CONFLICT]: '资源已存在或状态冲突',
  [ErrorCode.VALIDATION_ERROR]: '提交的数据验证失败',
  [ErrorCode.RATE_LIMITED]: '请求过于频繁，请稍后重试',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误，请稍后重试',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用',
  [ErrorCode.DATABASE_ERROR]: '数据操作失败',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: '外部服务暂时不可用',
};

/**
 * 创建错误响应
 */
export function error(
  code: ErrorCode,
  message?: string,
  options: {
    details?: Record<string, unknown>;
    requestId?: string;
    status?: number;
  } = {}
): NextResponse<ApiErrorResponse> {
  const requestId = options.requestId || generateRequestId();
  const status = options.status || errorCodeToStatus[code] || 500;
  
  // 使用用户友好的默认消息
  const displayMessage = message || userFriendlyMessages[code];
  
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message: displayMessage,
    },
    requestId,
    timestamp: now(),
  };

  // 仅在开发环境添加详细信息
  if (options.details && process.env.NODE_ENV === 'development') {
    response.error.details = options.details;
  }

  return NextResponse.json(response, { status });
}

/**
 * 便捷错误工厂函数
 */
export const errors = {
  badRequest: (message?: string, details?: Record<string, unknown>) =>
    error(ErrorCode.BAD_REQUEST, message, { details }),

  unauthorized: (message?: string) =>
    error(ErrorCode.UNAUTHORIZED, message || '请先登录'),

  forbidden: (message?: string) =>
    error(ErrorCode.FORBIDDEN, message || '权限不足'),

  notFound: (resource?: string) =>
    error(ErrorCode.NOT_FOUND, resource ? `${resource}不存在` : undefined),

  conflict: (message?: string) =>
    error(ErrorCode.CONFLICT, message),

  validation: (message: string, details?: Record<string, unknown>) =>
    error(ErrorCode.VALIDATION_ERROR, message, { details }),

  rateLimited: (retryAfter?: number) => {
    const response = error(ErrorCode.RATE_LIMITED, '请求过于频繁，请稍后重试');
    if (retryAfter) {
      response.headers.set('Retry-After', String(retryAfter));
    }
    return response;
  },

  internal: (message?: string, details?: Record<string, unknown>) =>
    error(ErrorCode.INTERNAL_ERROR, message, { details }),

  serviceUnavailable: (service?: string) =>
    error(ErrorCode.SERVICE_UNAVAILABLE, service ? `${service}服务暂时不可用` : undefined),

  database: (message?: string) =>
    error(ErrorCode.DATABASE_ERROR, message),

  externalService: (service?: string) =>
    error(ErrorCode.EXTERNAL_SERVICE_ERROR, service ? `${service}服务暂时不可用` : undefined),
};

// ============================================
// API 处理包装器
// ============================================

/**
 * API 路由处理配置
 */
export interface ApiHandlerConfig {
  /** 是否需要认证 */
  requireAuth?: boolean;
  /** 是否需要管理员权限 */
  requireAdmin?: boolean;
  /** 是否需要 CSRF 保护 */
  requireCsrf?: boolean;
  /** 请求体验证 Schema */
  bodySchema?: z.ZodSchema;
  /** 查询参数验证 Schema */
  querySchema?: z.ZodSchema;
  /** 自定义错误处理 */
  onError?: (error: unknown, requestId: string) => NextResponse<ApiErrorResponse> | null;
}

/**
 * API 路由处理上下文
 */
export interface ApiContext {
  requestId: string;
  userId?: string;
  userRole?: string;
  userEmail?: string;
  body?: unknown;
  query?: Record<string, string>;
}

/**
 * 包装 API 路由处理器
 * 自动处理错误、日志、认证等
 */
export function withApiHandler<T>(
  handler: (context: ApiContext, request: Request) => Promise<NextResponse<T | ApiErrorResponse>>,
  config: ApiHandlerConfig = {}
): (request: Request) => Promise<NextResponse<T | ApiErrorResponse>> {
  return async (request: Request) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    try {
      // 解析 URL 和查询参数
      const url = new URL(request.url);
      const query: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        query[key] = value;
      });

      // 构建上下文
      const context: ApiContext = {
        requestId,
        query,
      };

      // CSRF 保护检查
      if (config.requireCsrf) {
        const { createCsrfMiddleware } = await import('@/lib/security/csrf');
        const csrfMiddleware = createCsrfMiddleware();
        const csrfResult = await csrfMiddleware(request as never);
        if (csrfResult) {
          return csrfResult as NextResponse<ApiErrorResponse>;
        }
      }

      // 认证检查
      if (config.requireAuth || config.requireAdmin) {
        const { extractToken, verifyToken, isAdmin } = await import('@/lib/security/auth');
        const token = extractToken(request as never);
        
        if (!token) {
          return errors.unauthorized('请先登录后再访问');
        }

        const payload = await verifyToken(token);
        if (!payload) {
          return errors.unauthorized('登录已过期，请重新登录');
        }

        context.userId = payload.sub;
        context.userRole = payload.role;
        context.userEmail = payload.email;

        // 管理员权限检查
        if (config.requireAdmin && !isAdmin(payload)) {
          return errors.forbidden('需要管理员权限');
        }
      }

      // 解析请求体
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        try {
          context.body = await request.json();
        } catch {
          // 无请求体时忽略
        }
      }

      // 验证请求体
      if (config.bodySchema && context.body) {
        const result = config.bodySchema.safeParse(context.body);
        if (!result.success) {
          return errors.validation('请求数据验证失败', {
            fields: result.error.issues.map((e: z.ZodIssue) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          });
        }
        context.body = result.data;
      }

      // 验证查询参数
      if (config.querySchema) {
        const result = config.querySchema.safeParse(query);
        if (!result.success) {
          return errors.validation('查询参数验证失败', {
            fields: result.error.issues.map((e: z.ZodIssue) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          });
        }
        context.query = result.data as Record<string, string>;
      }

      // 执行处理器
      const response = await handler(context, request);

      // 记录成功日志
      const duration = Date.now() - startTime;
      apiLogger.info(`API ${request.method} ${url.pathname}`, {
        requestId,
        method: request.method,
        path: url.pathname,
        status: response.status,
        duration,
        userId: context.userId,
      });

      return response;
    } catch (err) {
      // 自定义错误处理
      if (config.onError) {
        const customResponse = config.onError(err, requestId);
        if (customResponse) {
          return customResponse;
        }
      }

      // 标准错误处理
      return handleError(err, requestId, request, startTime);
    }
  };
}

/**
 * 统一错误处理
 */
function handleError(
  err: unknown,
  requestId: string,
  request: Request,
  startTime: number
): NextResponse<ApiErrorResponse> {
  const url = new URL(request.url);
  const duration = Date.now() - startTime;

  // 判断错误类型并返回适当的响应
  if (err instanceof z.ZodError) {
    apiLogger.warn('Validation error', {
      requestId,
      path: url.pathname,
      errors: err.issues,
      duration,
    });

    return errors.validation('数据验证失败', {
      fields: err.issues.map((e: z.ZodIssue) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // API 错误类
  if (err instanceof ApiErrorClass) {
    apiLogger.error('API error', {
      requestId,
      path: url.pathname,
      code: err.code,
      message: err.message,
      duration,
    });

    return error(err.code, err.message, {
      requestId,
      details: err.details,
    });
  }

  // 一般错误
  const message = err instanceof Error ? err.message : 'Unknown error';
  const stack = err instanceof Error ? err.stack : undefined;

  apiLogger.error('Unhandled error', {
    requestId,
    path: url.pathname,
    method: request.method,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? stack : undefined,
    duration,
  });

  // 生产环境不暴露内部错误信息
  const safeMessage = process.env.NODE_ENV === 'production'
    ? '服务器内部错误'
    : message;

  return errors.internal(safeMessage);
}

/**
 * API 错误类
 */
export class ApiErrorClass extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toResponse(requestId?: string): NextResponse<ApiErrorResponse> {
    return error(this.code, this.message, {
      requestId,
      details: this.details,
    });
  }
}

/**
 * 创建 API 错误
 */
export function createApiError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ApiErrorClass {
  return new ApiErrorClass(code, message, details);
}

// ============================================
// 响应辅助函数
// ============================================

/**
 * 添加请求 ID 到响应头
 */
export function withRequestId(
  response: NextResponse,
  requestId: string
): NextResponse {
  response.headers.set('X-Request-Id', requestId);
  return response;
}

/**
 * 创建带 CORS 头的响应
 */
export function withCors<T>(
  response: NextResponse<T>,
  options: {
    origin?: string;
    methods?: string[];
    headers?: string[];
  } = {}
): NextResponse<T> {
  const origin = options.origin || '*';
  const methods = options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
  const headers = options.headers || ['Content-Type', 'Authorization', 'X-CSRF-Token'];

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', methods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', headers.join(', '));

  return response;
}

export default {
  success,
  created,
  noContent,
  paginated,
  error,
  errors,
  withApiHandler,
  withRequestId,
  withCors,
  generateRequestId,
  createApiError,
  ErrorCode,
};
