/**
 * Tests for Unified API Error Classes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ApiError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  RateLimitError,
  ConflictError,
  ErrorType,
  ERROR_STATUS_MAP,
  DEFAULT_MESSAGES,
} from '../index'
import { NextResponse } from 'next/server'

describe('ApiError', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
  })

  describe('constructor', () => {
    it('should create ApiError with all options', () => {
      const error = new ApiError({
        type: ErrorType.VALIDATION,
        message: 'Custom message',
        statusCode: 400,
        details: { field: 'email' },
        requestId: 'req-123',
        retryable: true,
        retryAfter: 60,
        cause: new Error('Original error'),
      })

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ApiError)
      expect(error.name).toBe('ApiError')
      expect(error.type).toBe(ErrorType.VALIDATION)
      expect(error.message).toBe('Custom message')
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual({ field: 'email' })
      expect(error.requestId).toBe('req-123')
      expect(error.retryable).toBe(true)
      expect(error.retryAfter).toBe(60)
      expect(error.cause).toBeInstanceOf(Error)
      expect(error.cause?.message).toBe('Original error')
    })

    it('should use default values when not provided', () => {
      const error = new ApiError({
        type: ErrorType.VALIDATION,
      })

      expect(error.message).toBe(DEFAULT_MESSAGES[ErrorType.VALIDATION])
      expect(error.statusCode).toBe(ERROR_STATUS_MAP[ErrorType.VALIDATION])
      expect(error.retryable).toBe(false)
    })

    it('should set correct status code from type', () => {
      const validationError = new ApiError({ type: ErrorType.VALIDATION })
      expect(validationError.statusCode).toBe(400)

      const notFoundError = new ApiError({ type: ErrorType.NOT_FOUND })
      expect(notFoundError.statusCode).toBe(404)

      const internalError = new ApiError({ type: ErrorType.INTERNAL })
      expect(internalError.statusCode).toBe(500)
    })
  })

  describe('factory methods', () => {
    it('should create validation error', () => {
      const error = ApiError.validation('Invalid email', { field: 'email' })

      expect(error.type).toBe(ErrorType.VALIDATION)
      expect(error.statusCode).toBe(400)
      expect(error.message).toBe('Invalid email')
      expect(error.details).toEqual({ field: 'email' })
    })

    it('should create not found error', () => {
      const error = ApiError.notFound('User not found', { id: '123' })

      expect(error.type).toBe(ErrorType.NOT_FOUND)
      expect(error.statusCode).toBe(404)
      expect(error.message).toBe('User not found')
    })

    it('should create unauthorized error', () => {
      const error = ApiError.unauthorized('Token expired')

      expect(error.type).toBe(ErrorType.UNAUTHORIZED)
      expect(error.statusCode).toBe(401)
      expect(error.message).toBe('Token expired')
    })

    it('should create forbidden error', () => {
      const error = ApiError.forbidden('Admin access required')

      expect(error.type).toBe(ErrorType.FORBIDDEN)
      expect(error.statusCode).toBe(403)
      expect(error.message).toBe('Admin access required')
    })

    it('should create bad request error', () => {
      const error = ApiError.badRequest('Missing required field')

      expect(error.type).toBe(ErrorType.BAD_REQUEST)
      expect(error.statusCode).toBe(400)
    })

    it('should create conflict error', () => {
      const error = ApiError.conflict('Email already exists')

      expect(error.type).toBe(ErrorType.CONFLICT)
      expect(error.statusCode).toBe(409)
    })

    it('should create rate limit error with retry-after', () => {
      const error = ApiError.rateLimit('Too many requests', 60)

      expect(error.type).toBe(ErrorType.RATE_LIMIT)
      expect(error.statusCode).toBe(429)
      expect(error.retryable).toBe(true)
      expect(error.retryAfter).toBe(60)
    })

    it('should create service unavailable error', () => {
      const error = ApiError.serviceUnavailable('Database unavailable', 30)

      expect(error.type).toBe(ErrorType.SERVICE_UNAVAILABLE)
      expect(error.statusCode).toBe(503)
      expect(error.retryable).toBe(true)
      expect(error.retryAfter).toBe(30)
    })

    it('should create internal error with cause', () => {
      const originalError = new Error('Database connection failed')
      const error = ApiError.internal('Something went wrong', originalError)

      expect(error.type).toBe(ErrorType.INTERNAL)
      expect(error.statusCode).toBe(500)
      expect(error.cause).toBe(originalError)
    })
  })

  describe('fromError', () => {
    it('should return same ApiError if already an ApiError', () => {
      const original = ApiError.notFound('User not found')
      const converted = ApiError.fromError(original)

      expect(converted).toBe(original)
    })

    it('should convert Error to ApiError', () => {
      const original = new Error('Something went wrong')
      const converted = ApiError.fromError(original)

      expect(converted).toBeInstanceOf(ApiError)
      expect(converted.type).toBe(ErrorType.INTERNAL)
      expect(converted.message).toBe('Something went wrong')
      expect(converted.cause).toBe(original)
    })

    it('should convert non-Error to ApiError', () => {
      const converted = ApiError.fromError('string error')

      expect(converted).toBeInstanceOf(ApiError)
      expect(converted.message).toBe('string error')
    })
  })

  describe('toJSON', () => {
    it('should create JSON representation', () => {
      const error = new ApiError({
        type: ErrorType.VALIDATION,
        message: 'Invalid input',
        details: { field: 'email' },
        requestId: 'req-123',
      })

      const json = error.toJSON() as Record<string, unknown>

      expect(json.success).toBe(false)
      expect(json.error).toBeDefined()
      expect((json.error as Record<string, unknown>).type).toBe(ErrorType.VALIDATION)
      expect((json.error as Record<string, unknown>).message).toBe('Invalid input')
      expect((json.error as Record<string, unknown>).details).toEqual({ field: 'email' })
      expect(json.requestId).toBe('req-123')
      expect((json.error as Record<string, unknown>).timestamp).toBeDefined()
    })

    it('should include retryable and retryAfter when set', () => {
      const error = new ApiError({
        type: ErrorType.RATE_LIMIT,
        message: 'Too many requests',
        retryable: true,
        retryAfter: 60,
      })

      const json = error.toJSON() as Record<string, unknown>
      const errorJson = json.error as Record<string, unknown>

      expect(errorJson.retryable).toBe(true)
      expect(errorJson.retryAfter).toBe(60)
    })
  })

  describe('toResponse', () => {
    it('should create NextResponse', async () => {
      const error = ApiError.rateLimit('Too many requests', 60)
      const response = error.toResponse()

      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(429)

      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.error.type).toBe(ErrorType.RATE_LIMIT)
      expect(response.headers.get('Retry-After')).toBe('60')
    })
  })
})

describe('ValidationError', () => {
  it('should create validation error with field errors', () => {
    const fieldErrors = {
      email: ['Invalid email format'],
      password: ['Too short', 'Missing number'],
    }

    const error = new ValidationError(fieldErrors, 'Validation failed')

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toBeInstanceOf(ValidationError)
    expect(error.name).toBe('ValidationError')
    expect(error.type).toBe(ErrorType.VALIDATION)
    expect(error.fieldErrors).toEqual(fieldErrors)
    expect(error.details).toEqual({ fields: fieldErrors })
  })

  describe('static methods', () => {
    it('should create from single field error', () => {
      const error = ValidationError.field('email', 'Invalid email')

      expect(error.fieldErrors).toEqual({ email: ['Invalid email'] })
    })

    it('should create from multiple field errors', () => {
      const error = ValidationError.fields({
        email: 'Invalid',
        password: ['Too short', 'Missing number'],
      })

      expect(error.fieldErrors).toEqual({
        email: ['Invalid'],
        password: ['Too short', 'Missing number'],
      })
    })
  })
})

describe('NotFoundError', () => {
  it('should create not found error with resource info', () => {
    const error = new NotFoundError('User', 'user-123')

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toBeInstanceOf(NotFoundError)
    expect(error.name).toBe('NotFoundError')
    expect(error.type).toBe(ErrorType.NOT_FOUND)
    expect(error.statusCode).toBe(404)
    expect(error.resourceType).toBe('User')
    expect(error.resourceId).toBe('user-123')
    expect(error.message).toBe('User not found: user-123')
  })

  it('should create not found error without resource info', () => {
    const error = new NotFoundError()

    expect(error.message).toBe('Resource not found')
    expect(error.details).toBeUndefined()
  })
})

describe('UnauthorizedError', () => {
  it('should create unauthorized error', () => {
    const error = new UnauthorizedError('Token expired')

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toBeInstanceOf(UnauthorizedError)
    expect(error.name).toBe('UnauthorizedError')
    expect(error.type).toBe(ErrorType.UNAUTHORIZED)
    expect(error.statusCode).toBe(401)
  })
})

describe('ForbiddenError', () => {
  it('should create forbidden error with permission', () => {
    const error = new ForbiddenError('Admin only', 'admin:write')

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toBeInstanceOf(ForbiddenError)
    expect(error.name).toBe('ForbiddenError')
    expect(error.type).toBe(ErrorType.FORBIDDEN)
    expect(error.statusCode).toBe(403)
    expect(error.requiredPermission).toBe('admin:write')
    expect(error.details).toEqual({ requiredPermission: 'admin:write' })
  })
})

describe('RateLimitError', () => {
  it('should create rate limit error with retry after', () => {
    const error = new RateLimitError('Too many requests', 60)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toBeInstanceOf(RateLimitError)
    expect(error.name).toBe('RateLimitError')
    expect(error.type).toBe(ErrorType.RATE_LIMIT)
    expect(error.statusCode).toBe(429)
    expect(error.retryable).toBe(true)
    expect(error.retryAfter).toBe(60)
  })
})

describe('ConflictError', () => {
  it('should create conflict error', () => {
    const error = new ConflictError('Email already exists', { field: 'email' })

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toBeInstanceOf(ConflictError)
    expect(error.name).toBe('ConflictError')
    expect(error.type).toBe(ErrorType.CONFLICT)
    expect(error.statusCode).toBe(409)
    expect(error.details).toEqual({ field: 'email' })
  })
})

describe('ErrorType enum', () => {
  it('should have all expected values', () => {
    expect(ErrorType.VALIDATION).toBe('VALIDATION_ERROR')
    expect(ErrorType.NOT_FOUND).toBe('NOT_FOUND')
    expect(ErrorType.UNAUTHORIZED).toBe('UNAUTHORIZED')
    expect(ErrorType.FORBIDDEN).toBe('FORBIDDEN')
    expect(ErrorType.RATE_LIMIT).toBe('RATE_LIMIT_EXCEEDED')
    expect(ErrorType.INTERNAL).toBe('INTERNAL_ERROR')
    expect(ErrorType.BAD_REQUEST).toBe('BAD_REQUEST')
    expect(ErrorType.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE')
    expect(ErrorType.REGISTRATION_FAILED).toBe('REGISTRATION_FAILED')
    expect(ErrorType.WEAK_PASSWORD).toBe('WEAK_PASSWORD')
    expect(ErrorType.MISSING_TOKEN).toBe('MISSING_TOKEN')
    expect(ErrorType.CONFLICT).toBe('CONFLICT')
  })
})

describe('ERROR_STATUS_MAP', () => {
  it('should map all error types to status codes', () => {
    expect(ERROR_STATUS_MAP[ErrorType.VALIDATION]).toBe(400)
    expect(ERROR_STATUS_MAP[ErrorType.NOT_FOUND]).toBe(404)
    expect(ERROR_STATUS_MAP[ErrorType.UNAUTHORIZED]).toBe(401)
    expect(ERROR_STATUS_MAP[ErrorType.FORBIDDEN]).toBe(403)
    expect(ERROR_STATUS_MAP[ErrorType.RATE_LIMIT]).toBe(429)
    expect(ERROR_STATUS_MAP[ErrorType.INTERNAL]).toBe(500)
    expect(ERROR_STATUS_MAP[ErrorType.SERVICE_UNAVAILABLE]).toBe(503)
    expect(ERROR_STATUS_MAP[ErrorType.CONFLICT]).toBe(409)
  })
})
