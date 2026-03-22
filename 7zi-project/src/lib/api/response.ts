/**
 * Standard API Response Helpers
 *
 * Centralized response helpers for consistent API response formats
 *
 * Standard success response:
 * {
 *   success: true,
 *   data: T,
 *   timestamp?: string
 * }
 *
 * Standard error response:
 * {
 *   success: false,
 *   error: {
 *     code: string,
 *     message: string,
 *     details?: unknown
 *   }
 * }
 */

import { NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

/**
 * Standard success response interface
 */
export interface StandardSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp?: string;
}

/**
 * Standard error response interface
 */
export interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Union type for standard responses
 */
export type StandardApiResponse<T = unknown> =
  | StandardSuccessResponse<T>
  | StandardErrorResponse;

// ============================================================================
// Success Response Helpers
// ============================================================================

/**
 * Create a standard success response
 *
 * @param data - The response data
 * @param options - Optional configuration
 * @returns NextResponse with standard success format
 *
 * @example
 * ```typescript
 * export async function GET() {
 *   const data = await fetchData();
 *   return success(data);
 * }
 * ```
 */
export function success<T = unknown>(
  data: T,
  options?: {
    status?: number;
    includeTimestamp?: boolean;
  }
): NextResponse<StandardSuccessResponse<T>> {
  const response: StandardSuccessResponse<T> = {
    success: true,
    data,
  };

  if (options?.includeTimestamp !== false) {
    response.timestamp = new Date().toISOString();
  }

  return NextResponse.json(response, {
    status: options?.status || 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create a success response with pagination metadata
 *
 * @param data - The response data
 * @param meta - Pagination metadata
 * @param options - Optional configuration
 * @returns NextResponse with success format and meta
 *
 * @example
 * ```typescript
 * export async function GET(request: Request) {
 *   const { searchParams } = new URL(request.url);
 *   const page = parseInt(searchParams.get('page') || '1');
 *   const limit = parseInt(searchParams.get('limit') || '10');
 *
 *   const { items, total } = await fetchPaginatedData(page, limit);
 *
 *   return successWithMeta(items, {
 *     total,
 *     page,
 *     pageSize: limit,
 *     totalPages: Math.ceil(total / limit),
 *   });
 * }
 * ```
 */
export function successWithMeta<T = unknown>(
  data: T,
  meta: {
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  },
  options?: {
    status?: number;
    includeTimestamp?: boolean;
  }
): NextResponse<StandardSuccessResponse<T> & { meta: typeof meta }> {
  const response: StandardSuccessResponse<T> & { meta: typeof meta } = {
    success: true,
    data,
    meta,
  };

  if (options?.includeTimestamp !== false) {
    response.timestamp = new Date().toISOString();
  }

  return NextResponse.json(response, {
    status: options?.status || 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create a success response for created resources (201)
 *
 * @param data - The created resource
 * @returns NextResponse with 201 status
 */
export function created<T = unknown>(
  data: T
): NextResponse<StandardSuccessResponse<T>> {
  return success(data, { status: 201 });
}

/**
 * Create a success response for accepted requests (202)
 *
 * @param data - Optional response data
 * @returns NextResponse with 202 status
 */
export function accepted<T = unknown>(
  data?: T
): NextResponse<StandardSuccessResponse<T>> {
  return success(data as T, { status: 202 });
}

/**
 * Create a success response with no content (204)
 *
 * @returns NextResponse with 204 status
 */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// ============================================================================
// Error Response Helpers
// ============================================================================

/**
 * Create a standard error response
 *
 * @param code - Error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND')
 * @param message - Human-readable error message
 * @param options - Optional configuration
 * @returns NextResponse with standard error format
 *
 * @example
 * ```typescript
 * export async function GET(request: Request) {
 *   const id = request.params.id;
 *   const item = await fetchItem(id);
 *
 *   if (!item) {
 *     return error('NOT_FOUND', 'Item not found', { status: 404 });
 *   }
 *
 *   return success(item);
 * }
 * ```
 */
export function error(
  code: string,
  message: string,
  options?: {
    status?: number;
    details?: unknown;
  }
): NextResponse<StandardErrorResponse> {
  const response: StandardErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details: options?.details,
    },
  };

  return NextResponse.json(response, {
    status: options?.status || 500,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create a bad request error response (400)
 *
 * @param message - Error message
 * @param details - Optional error details
 */
export function badRequest(
  message: string = 'Bad request',
  details?: unknown
): NextResponse<StandardErrorResponse> {
  return error('BAD_REQUEST', message, { status: 400, details });
}

/**
 * Create a validation error response (400)
 *
 * @param message - Validation error message
 * @param details - Optional validation details
 */
export function validationError(
  message: string = 'Validation failed',
  details?: unknown
): NextResponse<StandardErrorResponse> {
  return error('VALIDATION_ERROR', message, { status: 400, details });
}

/**
 * Create an unauthorized error response (401)
 *
 * @param message - Error message
 */
export function unauthorized(
  message: string = 'Unauthorized'
): NextResponse<StandardErrorResponse> {
  return error('UNAUTHORIZED', message, { status: 401 });
}

/**
 * Create a forbidden error response (403)
 *
 * @param message - Error message
 */
export function forbidden(
  message: string = 'Forbidden'
): NextResponse<StandardErrorResponse> {
  return error('FORBIDDEN', message, { status: 403 });
}

/**
 * Create a not found error response (404)
 *
 * @param message - Error message
 */
export function notFound(
  message: string = 'Not found'
): NextResponse<StandardErrorResponse> {
  return error('NOT_FOUND', message, { status: 404 });
}

/**
 * Create a conflict error response (409)
 *
 * @param message - Error message
 * @param details - Optional conflict details
 */
export function conflict(
  message: string = 'Conflict',
  details?: unknown
): NextResponse<StandardErrorResponse> {
  return error('CONFLICT', message, { status: 409, details });
}

/**
 * Create a rate limit error response (429)
 *
 * @param message - Error message
 */
export function rateLimit(
  message: string = 'Too many requests'
): NextResponse<StandardErrorResponse> {
  return error('RATE_LIMIT_EXCEEDED', message, { status: 429 });
}

/**
 * Create an internal server error response (500)
 *
 * @param message - Error message
 * @param details - Optional error details (only in development)
 */
export function internalError(
  message: string = 'Internal server error',
  details?: unknown
): NextResponse<StandardErrorResponse> {
  return error('INTERNAL_ERROR', message, {
    status: 500,
    details: process.env.NODE_ENV === 'development' ? details : undefined,
  });
}

/**
 * Create a service unavailable error response (503)
 *
 * @param message - Error message
 */
export function serviceUnavailable(
  message: string = 'Service unavailable'
): NextResponse<StandardErrorResponse> {
  return error('SERVICE_UNAVAILABLE', message, { status: 503 });
}

// ============================================================================
// Handler Wrapper
// ============================================================================

/**
 * Wrap an async API route handler with automatic error handling
 *
 * @param handler - The async handler function
 * @returns Wrapped handler with error handling
 *
 * @example
 * ```typescript
 * export const GET = withErrorHandler(async (request: Request) => {
 *   const data = await fetchData();
 *   return success(data);
 * });
 * ```
 */
export function withErrorHandler<T extends (...args: unknown[]) => Promise<NextResponse<unknown>>>(
  handler: T
): T {
  return (async (...args: unknown[]) => {
    try {
      return await handler(...(args as Parameters<T>));
    } catch (err) {
      console.error('API Error:', err);

      if (err instanceof Error) {
        return internalError(err.message, {
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        });
      }

      return internalError('An unexpected error occurred', { error: String(err) });
    }
  }) as unknown as T;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for success responses
 */
export function isSuccessResponse<T>(
  response: StandardApiResponse<T>
): response is StandardSuccessResponse<T> {
  return (response as StandardSuccessResponse<T>).success === true;
}

/**
 * Type guard for error responses
 */
export function isErrorResponse(
  response: StandardApiResponse
): response is StandardErrorResponse {
  return (response as StandardErrorResponse).success === false;
}
