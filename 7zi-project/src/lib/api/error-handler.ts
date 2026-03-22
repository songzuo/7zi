/**
 * API Error Handler
 * 统一的 API 错误处理和响应格式
 */

import { NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string;
}

export interface ApiErrorOptions {
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
  expose?: boolean;
}

// ============================================================================
// Error Classes
// ============================================================================

export class ApiErrorClass extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
  expose: boolean;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code || 'INTERNAL_ERROR';
    this.status = options.status || 500;
    this.details = options.details;
    this.expose = options.expose ?? false;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiErrorClass);
    }
  }

  toJSON(): ApiError {
    const error: ApiError = {
      code: this.code,
      message: this.expose ? this.message : 'An error occurred',
    };

    if (this.details && this.expose) {
      error.details = this.details;
    }

    if (process.env.NODE_ENV === 'development') {
      error.stack = this.stack;
    }

    return error;
  }
}

// ============================================================================
// Error Factories
// ============================================================================

/**
 * Create a 400 Bad Request error
 */
export function createBadRequestError(
  message: string,
  details?: Record<string, unknown>
): ApiErrorClass {
  return new ApiErrorClass(message, {
    code: 'BAD_REQUEST',
    status: 400,
    details,
    expose: true,
  });
}

/**
 * Create a 401 Unauthorized error
 */
export function createUnauthorizedError(
  message: string = 'Authentication required',
  details?: Record<string, unknown>
): ApiErrorClass {
  return new ApiErrorClass(message, {
    code: 'UNAUTHORIZED',
    status: 401,
    details,
    expose: true,
  });
}

/**
 * Create a 403 Forbidden error
 */
export function createForbiddenError(
  message: string = 'Access denied',
  details?: Record<string, unknown>
): ApiErrorClass {
  return new ApiErrorClass(message, {
    code: 'FORBIDDEN',
    status: 403,
    details,
    expose: true,
  });
}

/**
 * Create a 404 Not Found error
 */
export function createNotFoundError(
  message: string = 'Resource not found',
  details?: Record<string, unknown>
): ApiErrorClass {
  return new ApiErrorClass(message, {
    code: 'NOT_FOUND',
    status: 404,
    details,
    expose: true,
  });
}

/**
 * Create a 409 Conflict error
 */
export function createConflictError(
  message: string,
  details?: Record<string, unknown>
): ApiErrorClass {
  return new ApiErrorClass(message, {
    code: 'CONFLICT',
    status: 409,
    details,
    expose: true,
  });
}

/**
 * Create a 429 Rate Limit error
 */
export function createRateLimitError(
  retryAfter?: number
): ApiErrorClass {
  const details = retryAfter !== undefined
    ? { retryAfter }
    : undefined;

  return new ApiErrorClass('Too many requests', {
    code: 'RATE_LIMIT_EXCEEDED',
    status: 429,
    details,
    expose: true,
  });
}

/**
 * Create a 500 Internal Server error
 */
export function createInternalServerError(
  message: string = 'Internal server error',
  details?: Record<string, unknown>
): ApiErrorClass {
  return new ApiErrorClass(message, {
    code: 'INTERNAL_ERROR',
    status: 500,
    details,
    expose: false,
  });
}

/**
 * Create a 503 Service Unavailable error
 */
export function createServiceUnavailableError(
  message: string = 'Service temporarily unavailable',
  details?: Record<string, unknown>
): ApiErrorClass {
  return new ApiErrorClass(message, {
    code: 'SERVICE_UNAVAILABLE',
    status: 503,
    details,
    expose: true,
  });
}

/**
 * Create error from any error instance
 */
export function createErrorResponse(
  error: Error | ApiErrorClass | unknown
): ApiErrorClass {
  if (error instanceof ApiErrorClass) {
    return error;
  }

  if (error instanceof Error) {
    return createInternalServerError(error.message);
  }

  return createInternalServerError('An unknown error occurred');
}

// ============================================================================
// Success Response Factory
// ============================================================================

/**
 * Create a success API response
 */
export function createSuccessResponse<T = unknown>(
  data: T,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

// ============================================================================
// Error Response Factory
// ============================================================================

/**
 * Create an error API response
 */
export function createErrorResponseJson(
  error: Error | ApiErrorClass | unknown,
  status?: number
): NextResponse<ApiErrorResponse> {
  const apiError = createErrorResponse(error);

  return NextResponse.json(
    {
      success: false,
      error: apiError.toJSON(),
      timestamp: new Date().toISOString(),
    },
    { status: status ?? apiError.status }
  );
}

// ============================================================================
// Error Handler Middleware
// ============================================================================

/**
 * Wrap a handler with error handling
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
): (...args: T) => Promise<NextResponse> {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      const apiError = createErrorResponse(error);

      // Log error in production
      if (apiError.status >= 500) {
        console.error('[API Error]', error);
      }

      return createErrorResponseJson(apiError);
    }
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiErrorClass {
  return error instanceof ApiErrorClass;
}

/**
 * Check if a response is a success response
 */
export function isSuccessResponse<T = unknown>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Check if a response is an error response
 */
export function isErrorResponse(
  response: ApiResponse
): response is ApiErrorResponse {
  return response.success === false;
}
