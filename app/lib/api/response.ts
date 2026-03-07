/**
 * 统一 API 响应格式
 * 提供一致的成功/错误响应结构
 */

import { NextResponse } from 'next/server';

// 成功响应接口
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: unknown;
  };
}

// 错误响应接口
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string; // 仅在开发环境
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

// 分页数据接口
export interface PaginatedData<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// API 响应类
export class ApiResponse {
  private static generateMeta(): { timestamp: string; requestId?: string } {
    return {
      timestamp: new Date().toISOString(),
      // requestId 可以从请求上下文获取
    };
  }

  /**
   * 成功响应
   */
  static success<T>(data: T, status = 200): NextResponse {
    const response: ApiSuccessResponse<T> = {
      success: true,
      data,
      meta: this.generateMeta(),
    };

    return NextResponse.json(response, { status });
  }

  /**
   * 创建成功（201）
   */
  static created<T>(data: T): NextResponse {
    return this.success(data, 201);
  }

  /**
   * 无内容成功（204）
   */
  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
  }

  /**
   * 分页响应
   */
  static paginated<T>(
    items: T[],
    page: number,
    limit: number,
    total: number
  ): NextResponse {
    const totalPages = Math.ceil(total / limit);

    const data: PaginatedData<T> = {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    return this.success(data);
  }

  /**
   * 错误响应
   */
  static error(
    code: string,
    message: string,
    status = 500,
    details?: unknown
  ): NextResponse {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: this.generateMeta(),
    };

    // 开发环境添加堆栈信息
    if (process.env.NODE_ENV === 'development') {
      response.error.stack = new Error().stack;
    }

    return NextResponse.json(response, { status });
  }

  /**
   * 常见错误快捷方法
   */
  static badRequest(message: string, details?: unknown): NextResponse {
    return this.error('BAD_REQUEST', message, 400, details);
  }

  static unauthorized(message = 'Authentication required'): NextResponse {
    return this.error('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'Access denied'): NextResponse {
    return this.error('FORBIDDEN', message, 403);
  }

  static notFound(message = 'Resource not found'): NextResponse {
    return this.error('NOT_FOUND', message, 404);
  }

  static conflict(message: string, details?: unknown): NextResponse {
    return this.error('CONFLICT', message, 409, details);
  }

  static validationError(
    errors: Record<string, string[]>
  ): NextResponse {
    return this.error('VALIDATION_ERROR', 'Request validation failed', 422, errors);
  }

  static rateLimited(retryAfter = 60): NextResponse {
    const response = this.error(
      'RATE_LIMIT_EXCEEDED',
      'Too many requests, please try again later',
      429
    );
    response.headers.set('Retry-After', retryAfter.toString());
    return response;
  }

  static internalError(message = 'Internal server error'): NextResponse {
    return this.error('INTERNAL_ERROR', message, 500);
  }
}

/**
 * API 响应包装器
 * 自动包装处理器的返回值
 */
export function withApiResponse<T>(
  handler: () => Promise<T>
): Promise<NextResponse> {
  return handler()
    .then((data) => ApiResponse.success(data))
    .catch((error) => {
      console.error('API Error:', error);

      if (error instanceof ApiError) {
        return ApiResponse.error(error.code, error.message, error.status, error.details);
      }

      return ApiResponse.internalError(
        process.env.NODE_ENV === 'development' ? error.message : undefined
      );
    });
}

/**
 * 自定义 API 错误类
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public status = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError('BAD_REQUEST', message, 400, details);
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'Access denied'): ApiError {
    return new ApiError('FORBIDDEN', message, 403);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError('NOT_FOUND', message, 404);
  }

  static conflict(message: string, details?: unknown): ApiError {
    return new ApiError('CONFLICT', message, 409, details);
  }

  static validationError(errors: Record<string, string[]>): ApiError {
    return new ApiError('VALIDATION_ERROR', 'Validation failed', 422, errors);
  }
}

/**
 * 常用 HTTP 状态码
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;
