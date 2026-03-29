/**
 * @fileoverview API Error Handler
 * @description Centralized error handling for API routes with consistent error responses
 *
 * Standard error response format:
 * {
 *   success: false,
 *   error: {
 *     type: ErrorType,  // Error type enum
 *     message: string,  // Human-readable message
 *     details?: Record<string, unknown>,  // Additional error details
 *     timestamp: string  // ISO 8601 timestamp
 *   }
 * }
 */

import { NextResponse } from 'next/server';
import { logger } from '../logger';

/**
 * Error types for different error categories
 * Use these values for error.type (not error.code)
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  INTERNAL = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  MISSING_TOKEN = 'MISSING_TOKEN',
}

/**
 * API Error class for structured error responses
 */
export class ApiError extends Error {
  public data?: Record<string, unknown>;

  constructor(
    public type: ErrorType,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Error response interface
 * This is the standard format for all API error responses
 */
export interface ErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
}

/**
 * Success response interface
 * This is the standard format for all API success responses
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

/**
 * Create standardized success response
 * This is the recommended way to create success responses in API routes
 */
export function createSuccessResponse<T = unknown>(
  data: T,
  status: number = 200
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Create standardized error response
 * This is the recommended way to create error responses in API routes
 */
export function createErrorResponse(
  error: Error | ApiError,
  statusCode?: number,
  details?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  const timestamp = new Date().toISOString();

  // If it's already an ApiError, use it directly
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          type: error.type,
          message: error.message,
          details: error.details,
          timestamp,
        },
      },
      { status: error.statusCode }
    );
  }

  // Handle generic errors
  logger.error('API Error', error instanceof Error ? error : new Error(String(error)), { category: 'api' });

  const errorType = ErrorType.INTERNAL;
  const status = statusCode ?? 500;

  return NextResponse.json(
    {
      success: false,
      error: {
        type: errorType,
        message: 'An internal error occurred',
        // Only include details in development, and sanitize them
        details: process.env.NODE_ENV === 'development'
          ? { originalMessage: error.message }
          : undefined,
        timestamp,
      },
    },
    { status }
  );
}

/**
 * Create validation error response (400)
 */
export function createValidationError(
  message: string,
  details?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  const error = new ApiError(ErrorType.VALIDATION, message, 400, details);
  return createErrorResponse(error);
}

/**
 * Create not found error response (404)
 */
export function createNotFoundError(
  message: string,
  details?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  const error = new ApiError(ErrorType.NOT_FOUND, message, 404, details);
  return createErrorResponse(error);
}

/**
 * Create unauthorized error response (401)
 */
export function createUnauthorizedError(
  message: string = 'Unauthorized access'
): NextResponse<ErrorResponse> {
  const error = new ApiError(ErrorType.UNAUTHORIZED, message, 401);
  return createErrorResponse(error);
}

/**
 * Create forbidden error response (403)
 */
export function createForbiddenError(
  message: string = 'Access forbidden',
  extra?: {
    requiredPermissions?: string[];
    missingPermissions?: string[];
  }
): NextResponse<ErrorResponse> {
  const error = new ApiError(ErrorType.FORBIDDEN, message, 403);
  const response = createErrorResponse(error);

  // Add extra context if provided by adding to the error data
  if (extra) {
    error.data = {
      ...error.details,
      requiredPermissions: extra.requiredPermissions,
      missingPermissions: extra.missingPermissions,
    };
  }

  return response;
}

/**
 * Create rate limit error response (429)
 */
export function createRateLimitError(
  message: string = 'Rate limit exceeded'
): NextResponse<ErrorResponse> {
  const error = new ApiError(ErrorType.RATE_LIMIT, message, 429);
  return createErrorResponse(error);
}

/**
 * Create service unavailable error response (503)
 */
export function createServiceUnavailableError(
  message: string = 'Service temporarily unavailable'
): NextResponse<ErrorResponse> {
  const error = new ApiError(ErrorType.SERVICE_UNAVAILABLE, message, 503);
  return createErrorResponse(error);
}

/**
 * Create registration failed error response (400)
 */
export function createRegistrationFailedError(
  message: string = 'Registration failed',
  details?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  const error = new ApiError(ErrorType.REGISTRATION_FAILED, message, 400, details);
  return createErrorResponse(error);
}

/**
 * Create weak password error response (400)
 */
export function createWeakPasswordError(
  message: string = 'Password is too weak',
  details?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  const error = new ApiError(ErrorType.WEAK_PASSWORD, message, 400, details);
  return createErrorResponse(error);
}

/**
 * Create bad request error response (400)
 */
export function createBadRequestError(
  message: string = 'Bad request',
  details?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  const error = new ApiError(ErrorType.BAD_REQUEST, message, 400, details);
  return createErrorResponse(error);
}

/**
 * Create missing token error response (401)
 */
export function createMissingTokenError(
  message: string = 'Authentication token is missing'
): NextResponse<ErrorResponse> {
  const error = new ApiError(ErrorType.MISSING_TOKEN, message, 401);
  return createErrorResponse(error);
}

/**
 * Handle API route errors with try-catch wrapper
 * This provides automatic error handling for API route handlers
 *
 * @example
 * export const GET = withErrorHandling(async (request: Request) => {
 *   // Your handler logic here
 *   return createSuccessResponse(data);
 * });
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<NextResponse<unknown>>>(
  handler: T
): T {
  return (async (...args: unknown[]) => {
    try {
      return await handler(...(args as Parameters<T>));
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error : new Error(String(error)));
    }
  }) as unknown as T;
}
