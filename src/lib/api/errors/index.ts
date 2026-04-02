/**
 * @fileoverview Unified API Error Classes
 * @description Centralized error class hierarchy for API routes
 *
 * This module provides a unified error handling system with:
 * - Base ApiError class for all API errors
 * - Specialized error classes for common scenarios
 * - Factory methods for creating errors
 * - Integration with error response formatting
 */

import { NextResponse } from 'next/server'
import { ErrorType } from '../error-types'

// Re-export ErrorType for convenience
export { ErrorType } from '../error-types'

/**
 * HTTP status code mapping for error types
 */
export const ERROR_STATUS_MAP: Record<ErrorType, number> = {
  [ErrorType.VALIDATION]: 400,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.UNAUTHORIZED]: 401,
  [ErrorType.FORBIDDEN]: 403,
  [ErrorType.RATE_LIMIT]: 429,
  [ErrorType.INTERNAL]: 500,
  [ErrorType.BAD_REQUEST]: 400,
  [ErrorType.SERVICE_UNAVAILABLE]: 503,
  [ErrorType.REGISTRATION_FAILED]: 400,
  [ErrorType.WEAK_PASSWORD]: 400,
  [ErrorType.MISSING_TOKEN]: 401,
  [ErrorType.CONFLICT]: 409,
}

/**
 * Default messages for error types
 */
export const DEFAULT_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.VALIDATION]: 'Validation failed',
  [ErrorType.NOT_FOUND]: 'Resource not found',
  [ErrorType.UNAUTHORIZED]: 'Unauthorized access',
  [ErrorType.FORBIDDEN]: 'Access forbidden',
  [ErrorType.RATE_LIMIT]: 'Rate limit exceeded',
  [ErrorType.INTERNAL]: 'Internal server error',
  [ErrorType.BAD_REQUEST]: 'Bad request',
  [ErrorType.SERVICE_UNAVAILABLE]: 'Service unavailable',
  [ErrorType.REGISTRATION_FAILED]: 'Registration failed',
  [ErrorType.WEAK_PASSWORD]: 'Password is too weak',
  [ErrorType.MISSING_TOKEN]: 'Authentication token is missing',
  [ErrorType.CONFLICT]: 'Resource conflict',
}

/**
 * Base API Error class
 * All API errors should extend this class or be instances of it
 */
export class ApiError extends Error {
  /** Error type from ErrorType enum */
  public readonly type: ErrorType
  /** HTTP status code */
  public readonly statusCode: number
  /** Additional error details */
  public readonly details?: Record<string, unknown>
  /** Request ID for tracing */
  public requestId?: string
  /** Whether this error can be retried */
  public readonly retryable: boolean
  /** Seconds to wait before retry (if applicable) */
  public readonly retryAfter?: number
  /** Original cause of this error */
  public readonly cause?: Error

  constructor(options: {
    type: ErrorType
    message?: string
    statusCode?: number
    details?: Record<string, unknown>
    requestId?: string
    retryable?: boolean
    retryAfter?: number
    cause?: Error
  }) {
    const {
      type,
      message = DEFAULT_MESSAGES[type],
      statusCode = ERROR_STATUS_MAP[type],
      details,
      requestId,
      retryable = false,
      retryAfter,
      cause,
    } = options

    super(message, { cause })

    this.name = 'ApiError'
    this.type = type
    this.statusCode = statusCode
    this.details = details
    this.requestId = requestId
    this.retryable = retryable
    this.retryAfter = retryAfter
    this.cause = cause

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Create error response JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      success: false,
      error: {
        type: this.type,
        message: this.message,
        ...(this.details && { details: this.details }),
        ...(this.retryable && { retryable: true }),
        ...(this.retryAfter && { retryAfter: this.retryAfter }),
        timestamp: new Date().toISOString(),
      },
      ...(this.requestId && { requestId: this.requestId }),
    }
  }

  /**
   * Convert to NextResponse
   */
  toResponse(): NextResponse {
    const headers: HeadersInit = {}

    if (this.retryAfter) {
      headers['Retry-After'] = String(this.retryAfter)
    }

    return NextResponse.json(this.toJSON(), {
      status: this.statusCode,
      headers,
    })
  }

  // ============================================================================
  // Factory Methods
  // ============================================================================

  /**
   * Create a validation error (400)
   */
  static validation(
    message: string = DEFAULT_MESSAGES[ErrorType.VALIDATION],
    details?: Record<string, unknown>
  ): ApiError {
    return new ApiError({
      type: ErrorType.VALIDATION,
      message,
      details,
    })
  }

  /**
   * Create a not found error (404)
   */
  static notFound(
    message: string = DEFAULT_MESSAGES[ErrorType.NOT_FOUND],
    details?: Record<string, unknown>
  ): ApiError {
    return new ApiError({
      type: ErrorType.NOT_FOUND,
      message,
      details,
    })
  }

  /**
   * Create an unauthorized error (401)
   */
  static unauthorized(message: string = DEFAULT_MESSAGES[ErrorType.UNAUTHORIZED]): ApiError {
    return new ApiError({
      type: ErrorType.UNAUTHORIZED,
      message,
    })
  }

  /**
   * Create a forbidden error (403)
   */
  static forbidden(message: string = DEFAULT_MESSAGES[ErrorType.FORBIDDEN]): ApiError {
    return new ApiError({
      type: ErrorType.FORBIDDEN,
      message,
    })
  }

  /**
   * Create a bad request error (400)
   */
  static badRequest(
    message: string = DEFAULT_MESSAGES[ErrorType.BAD_REQUEST],
    details?: Record<string, unknown>
  ): ApiError {
    return new ApiError({
      type: ErrorType.BAD_REQUEST,
      message,
      details,
    })
  }

  /**
   * Create a conflict error (409)
   */
  static conflict(
    message: string = DEFAULT_MESSAGES[ErrorType.CONFLICT],
    details?: Record<string, unknown>
  ): ApiError {
    return new ApiError({
      type: ErrorType.CONFLICT,
      message,
      details,
    })
  }

  /**
   * Create a rate limit error (429)
   */
  static rateLimit(
    message: string = DEFAULT_MESSAGES[ErrorType.RATE_LIMIT],
    retryAfter?: number
  ): ApiError {
    return new ApiError({
      type: ErrorType.RATE_LIMIT,
      message,
      retryable: true,
      retryAfter,
    })
  }

  /**
   * Create a service unavailable error (503)
   */
  static serviceUnavailable(
    message: string = DEFAULT_MESSAGES[ErrorType.SERVICE_UNAVAILABLE],
    retryAfter?: number
  ): ApiError {
    return new ApiError({
      type: ErrorType.SERVICE_UNAVAILABLE,
      message,
      retryable: true,
      retryAfter,
    })
  }

  /**
   * Create an internal server error (500)
   */
  static internal(message: string = DEFAULT_MESSAGES[ErrorType.INTERNAL], cause?: Error): ApiError {
    return new ApiError({
      type: ErrorType.INTERNAL,
      message,
      cause,
    })
  }

  /**
   * Create from an unknown error
   */
  static fromError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error
    }

    if (error instanceof Error) {
      return new ApiError({
        type: ErrorType.INTERNAL,
        message: error.message,
        cause: error,
      })
    }

    return new ApiError({
      type: ErrorType.INTERNAL,
      message: String(error),
    })
  }
}

/**
 * Validation Error - for input validation failures
 */
export class ValidationError extends ApiError {
  /** Field-level validation errors */
  public readonly fieldErrors: Record<string, string[]>

  constructor(
    fieldErrors: Record<string, string[]>,
    message: string = DEFAULT_MESSAGES[ErrorType.VALIDATION]
  ) {
    super({
      type: ErrorType.VALIDATION,
      message,
      details: { fields: fieldErrors },
    })

    this.name = 'ValidationError'
    this.fieldErrors = fieldErrors
  }

  /**
   * Create from a single field error
   */
  static field(field: string, error: string): ValidationError {
    return new ValidationError({ [field]: [error] })
  }

  /**
   * Create from multiple field errors
   */
  static fields(errors: Record<string, string | string[]>): ValidationError {
    const fieldErrors: Record<string, string[]> = {}

    for (const [field, error] of Object.entries(errors)) {
      fieldErrors[field] = Array.isArray(error) ? error : [error]
    }

    return new ValidationError(fieldErrors)
  }
}

/**
 * Not Found Error - for missing resources
 */
export class NotFoundError extends ApiError {
  /** Resource type that was not found */
  public readonly resourceType?: string
  /** Resource identifier */
  public readonly resourceId?: string

  constructor(resourceType?: string, resourceId?: string, message?: string) {
    const defaultMessage = resourceType
      ? `${resourceType} not found${resourceId ? `: ${resourceId}` : ''}`
      : DEFAULT_MESSAGES[ErrorType.NOT_FOUND]

    super({
      type: ErrorType.NOT_FOUND,
      message: message ?? defaultMessage,
      details: resourceType ? { resourceType, resourceId } : undefined,
    })

    this.name = 'NotFoundError'
    this.resourceType = resourceType
    this.resourceId = resourceId
  }
}

/**
 * Unauthorized Error - for authentication failures
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = DEFAULT_MESSAGES[ErrorType.UNAUTHORIZED]) {
    super({
      type: ErrorType.UNAUTHORIZED,
      message,
    })
    this.name = 'UnauthorizedError'
  }
}

/**
 * Forbidden Error - for authorization failures
 */
export class ForbiddenError extends ApiError {
  /** Required permission that was missing */
  public readonly requiredPermission?: string

  constructor(
    message: string = DEFAULT_MESSAGES[ErrorType.FORBIDDEN],
    requiredPermission?: string
  ) {
    super({
      type: ErrorType.FORBIDDEN,
      message,
      details: requiredPermission ? { requiredPermission } : undefined,
    })

    this.name = 'ForbiddenError'
    this.requiredPermission = requiredPermission
  }
}

/**
 * Rate Limit Error - for rate limiting
 */
export class RateLimitError extends ApiError {
  constructor(message: string = DEFAULT_MESSAGES[ErrorType.RATE_LIMIT], retryAfter?: number) {
    super({
      type: ErrorType.RATE_LIMIT,
      message,
      retryable: true,
      retryAfter,
    })
    this.name = 'RateLimitError'
  }
}

/**
 * Conflict Error - for resource conflicts
 */
export class ConflictError extends ApiError {
  constructor(
    message: string = DEFAULT_MESSAGES[ErrorType.CONFLICT],
    details?: Record<string, unknown>
  ) {
    super({
      type: ErrorType.CONFLICT,
      message,
      details,
    })
    this.name = 'ConflictError'
  }
}
