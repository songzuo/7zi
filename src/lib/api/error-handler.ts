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

import { NextResponse, NextRequest } from 'next/server';
import { logger } from '../logger';
import { getUserFriendlyError, getLocaleFromRequest, createUserErrorExtension, SupportedLocale } from './user-messages';
import { ErrorType } from './error-types';

// Re-export ErrorType for backward compatibility
export { ErrorType } from './error-types';

/**
 * API Error class for structured error responses
 */
export class ApiError extends Error {
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
    /** User-friendly message (all environments) */
    userMessage?: string;
    /** Suggested action for the user */
    action?: string;
    /** Additional help text */
    help?: string;
    details?: Record<string, unknown>;
    timestamp: string;
  };
  /** Request ID for tracking */
  requestId?: string;
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

// ============================================================================
// Helper Functions - Extracted to reduce code duplication
// ============================================================================

/**
 * Base error response builder - Consolidates common logic
 */
async function buildErrorResponse(
  type: ErrorType,
  message: string,
  statusCode: number,
  details?: Record<string, unknown>,
  locale: SupportedLocale = 'zh',
  requestId?: string
): Promise<ErrorResponse> {
  const timestamp = new Date().toISOString();
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  const userErrorExtension = await createUserErrorExtension(type, locale);

  return {
    success: false,
    error: {
      type,
      message: isDevelopment ? message : 'An error occurred',
      userMessage: userErrorExtension.userMessage,
      action: userErrorExtension.userAction,
      help: userErrorExtension.userHelp,
      details: isDevelopment ? details : undefined,
      timestamp,
    },
    requestId,
  };
}

/**
 * Create a NextResponse from error data
 */
function errorResponseToNextResponse(
  errorData: ErrorResponse,
  statusCode: number
): NextResponse<ErrorResponse> {
  return NextResponse.json(errorData, { status: statusCode });
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
export async function createErrorResponse(
  error: Error | ApiError,
  statusCode?: number,
  details?: Record<string, unknown>,
  locale: SupportedLocale = 'zh',
  requestId?: string
): Promise<NextResponse<ErrorResponse>> {
  // If it's already an ApiError, use it directly
  if (error instanceof ApiError) {
    const errorData = await buildErrorResponse(
      error.type,
      error.message,
      error.statusCode,
      error.details,
      locale,
      requestId
    );
    return errorResponseToNextResponse(errorData, error.statusCode);
  }

  // Handle generic errors
  logger.error('API Error', error instanceof Error ? error : new Error(String(error)), { category: 'api' });

  const status = statusCode ?? 500;
  const errorData = await buildErrorResponse(
    ErrorType.INTERNAL,
    error.message || 'An internal error occurred',
    status,
    isDevelopment() ? { originalMessage: error.message } : undefined,
    locale,
    requestId
  );
  return errorResponseToNextResponse(errorData, status);
}

/**
 * Check if running in development mode
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}

/**
 * Create validation error response (400)
 */
export async function createValidationError(
  message: string,
  details?: Record<string, unknown>,
  locale: SupportedLocale = 'zh',
  requestId?: string
): Promise<NextResponse<ErrorResponse>> {
  const error = new ApiError(ErrorType.VALIDATION, message, 400, details);
  return createErrorResponse(error, undefined, details, locale, requestId);
}

/**
 * Create not found error response (404)
 */
export async function createNotFoundError(
  message: string,
  details?: Record<string, unknown>,
  locale: SupportedLocale = 'zh',
  requestId?: string
): Promise<NextResponse<ErrorResponse>> {
  const error = new ApiError(ErrorType.NOT_FOUND, message, 404, details);
  return createErrorResponse(error, undefined, details, locale, requestId);
}

/**
 * Create unauthorized error response (401)
 */
export async function createUnauthorizedError(
  message: string = 'Unauthorized access',
  locale: SupportedLocale = 'zh',
  requestId?: string
): Promise<NextResponse<ErrorResponse>> {
  const error = new ApiError(ErrorType.UNAUTHORIZED, message, 401);
  return createErrorResponse(error, undefined, undefined, locale, requestId);
}

/**
 * Create forbidden error response (403)
 */
export async function createForbiddenError(
  message: string = 'Access forbidden',
  locale: SupportedLocale = 'zh',
  requestId?: string
): Promise<NextResponse<ErrorResponse>> {
  const error = new ApiError(ErrorType.FORBIDDEN, message, 403);
  return createErrorResponse(error, undefined, undefined, locale, requestId);
}

/**
 * Create conflict error response (409)
 */
export async function createConflictError(
  message: string = 'Resource conflict',
  details?: Record<string, unknown>,
  locale: SupportedLocale = 'zh',
  requestId?: string
): Promise<NextResponse<ErrorResponse>> {
  const error = new ApiError(ErrorType.CONFLICT, message, 409, details);
  return createErrorResponse(error, undefined, details, locale, requestId);
}

/**
 * Create rate limit error response (429)
 */
export async function createRateLimitError(
  message: string = 'Rate limit exceeded',
  locale: SupportedLocale = 'zh',
  requestId?: string
): Promise<NextResponse<ErrorResponse>> {
  const error = new ApiError(ErrorType.RATE_LIMIT, message, 429);
  return createErrorResponse(error, undefined, undefined, locale, requestId);
}

/**
 * Create service unavailable error response (503)
 */
export async function createServiceUnavailableError(
  message: string = 'Service temporarily unavailable',
  locale: SupportedLocale = 'zh',
  requestId?: string
): Promise<NextResponse<ErrorResponse>> {
  const error = new ApiError(ErrorType.SERVICE_UNAVAILABLE, message, 503);
  return createErrorResponse(error, undefined, undefined, locale, requestId);
}

/**
 * Create registration failed error response (400)
 */
export async function createRegistrationFailedError(
  message: string = 'Registration failed',
  details?: Record<string, unknown>,
  locale: SupportedLocale = 'zh',
  requestId?: string
): Promise<NextResponse<ErrorResponse>> {
  const error = new ApiError(ErrorType.REGISTRATION_FAILED, message, 400, details);
  return createErrorResponse(error, undefined, details, locale, requestId);
}

/**
 * Create weak password error response (400)
 */
export async function createWeakPasswordError(
  message: string = 'Password is too weak',
  details?: Record<string, unknown>,
  locale: SupportedLocale = 'zh',
  requestId?: string
): Promise<NextResponse<ErrorResponse>> {
  const error = new ApiError(ErrorType.WEAK_PASSWORD, message, 400, details);
  return createErrorResponse(error, undefined, details, locale, requestId);
}

/**
 * Create bad request error response (400)
 */
export async function createBadRequestError(
  message: string = 'Bad request',
  details?: Record<string, unknown>,
  locale: SupportedLocale = 'zh',
  requestId?: string
): Promise<NextResponse<ErrorResponse>> {
  const error = new ApiError(ErrorType.BAD_REQUEST, message, 400, details);
  return createErrorResponse(error, undefined, details, locale, requestId);
}

/**
 * Create missing token error response (401)
 */
export async function createMissingTokenError(
  message: string = 'Authentication token is missing',
  locale: SupportedLocale = 'zh',
  requestId?: string
): Promise<NextResponse<ErrorResponse>> {
  const error = new ApiError(ErrorType.MISSING_TOKEN, message, 401);
  return createErrorResponse(error, undefined, undefined, locale, requestId);
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
    } catch (_error) {
      // Try to extract locale and request ID from the request
      const request = args[0] as Request | NextRequest | undefined;
      const locale = request ? getLocaleFromRequest(request) : 'zh';
      const requestId = request?.headers ? (request.headers as Headers).get('x-request-id') || undefined : undefined;

      return await createErrorResponse(
        error instanceof Error ? error : new Error(String(error)),
        undefined,
        undefined,
        locale,
        requestId
      );
    }
  }) as T;
}
