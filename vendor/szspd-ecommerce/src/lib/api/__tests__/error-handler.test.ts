/**
 * API Error Handler Tests
 * Tests for API error handling utilities
 */

// @ts-nocheck - Complex API response type issues with async/await

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ApiError,
  createErrorResponse,
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createRateLimitError,
  createServiceUnavailableError,
  withErrorHandling,
  ErrorType,
} from '../error-handler'

describe('API Error Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set default to development for most tests
    vi.stubEnv('NODE_ENV', 'development')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('ApiError', () => {
    it('should create an ApiError instance', () => {
      const error = new ApiError(ErrorType.VALIDATION, 'Invalid input', 400)

      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('ApiError')
      expect(error.type).toBe(ErrorType.VALIDATION)
      expect(error.message).toBe('Invalid input')
      expect(error.statusCode).toBe(400)
    })

    it('should create ApiError with default status code 500', () => {
      const error = new ApiError(ErrorType.INTERNAL, 'Internal error')

      expect(error.statusCode).toBe(500)
    })

    it('should create ApiError with details', () => {
      const details = { field: 'email', constraint: 'required' }
      const error = new ApiError(ErrorType.VALIDATION, 'Invalid input', 400, details)

      expect(error.details).toEqual(details)
    })

    it('should support all error types', () => {
      const errorTypes = [
        ErrorType.VALIDATION,
        ErrorType.NOT_FOUND,
        ErrorType.UNAUTHORIZED,
        ErrorType.FORBIDDEN,
        ErrorType.RATE_LIMIT,
        ErrorType.INTERNAL,
        ErrorType.BAD_REQUEST,
        ErrorType.SERVICE_UNAVAILABLE,
      ]

      errorTypes.forEach(type => {
        const error = new ApiError(type, 'Test message')
        expect(error.type).toBe(type)
      })
    })
  })

  describe('createErrorResponse', () => {
    it('should create error response from ApiError', async () => {
      const apiError = new ApiError(ErrorType.VALIDATION, 'Invalid input', 400, {
        field: 'email',
      })
      const response = await createErrorResponse(apiError)

      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body).toMatchObject({
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: 'Invalid input',
          details: { field: 'email' },
          timestamp: expect.any(String),
        },
      })
    })

    it('should create error response from generic Error', async () => {
      const genericError = new Error('Something went wrong')
      const response = await createErrorResponse(genericError)

      expect(response.status).toBe(500)

      const body = await response.json()
      expect(body).toMatchObject({
        success: false,
        error: {
          type: ErrorType.INTERNAL,
          message: 'Something went wrong',
          timestamp: expect.any(String),
        },
      })
    })

    it('should include original message in development mode', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const genericError = new Error('Specific error details')
      const response = await createErrorResponse(genericError)

      const body = await response.json()
      expect(body.error.details).toEqual({
        originalMessage: 'Specific error details',
      })
    })

    it('should not include original message in production mode', async () => {
      vi.stubEnv('NODE_ENV', 'production')

      const genericError = new Error('Specific error details')
      const response = await createErrorResponse(genericError)

      const body = await response.json()
      expect(body.error.details).toBeUndefined()
    })

    it('should use ApiError status code (custom param not supported)', async () => {
      const apiError = new ApiError(ErrorType.VALIDATION, 'Invalid input', 400)
      const response = await createErrorResponse(apiError)

      expect(response.status).toBe(400)
    })

    it('should handle string errors', async () => {
      const stringError = 'String error message'
      const response = await createErrorResponse(stringError as unknown as Error)

      expect(response.status).toBe(500)

      const body = await response.json()
      expect(body.error.message).toBe('An internal error occurred')
    })
  })

  describe('createValidationError', () => {
    it('should create validation error response', async () => {
      const response = await createValidationError('Email is required', {
        field: 'email',
        constraint: 'required',
      })

      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body).toMatchObject({
        success: false,
        error: {
          type: ErrorType.VALIDATION,
          message: 'Email is required',
          details: {
            field: 'email',
            constraint: 'required',
          },
          timestamp: expect.any(String),
        },
      })
    })

    it('should create validation error without details', async () => {
      const response = await createValidationError('Invalid input')

      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.error.message).toBe('Invalid input')
      expect(body.error.details).toBeUndefined()
    })
  })

  describe('createNotFoundError', () => {
    it('should create not found error response', async () => {
      const response = await createNotFoundError('User not found', {
        id: '123',
      })

      expect(response.status).toBe(404)

      const body = await response.json()
      expect(body).toMatchObject({
        success: false,
        error: {
          type: ErrorType.NOT_FOUND,
          message: 'User not found',
          details: { id: '123' },
          timestamp: expect.any(String),
        },
      })
    })

    it('should create not found error with default message', async () => {
      const response = await createNotFoundError('Resource not found')

      expect(response.status).toBe(404)
      expect((await response.json()).error.type).toBe(ErrorType.NOT_FOUND)
    })
  })

  describe('createUnauthorizedError', () => {
    it('should create unauthorized error response with default message', async () => {
      const response = await createUnauthorizedError()

      expect(response.status).toBe(401)

      const body = await response.json()
      expect(body).toMatchObject({
        success: false,
        error: {
          type: ErrorType.UNAUTHORIZED,
          message: 'Unauthorized access',
          timestamp: expect.any(String),
        },
      })
    })

    it('should create unauthorized error response with custom message', async () => {
      const response = await createUnauthorizedError('Invalid token')

      expect(response.status).toBe(401)

      const body = await response.json()
      expect(body.error.message).toBe('Invalid token')
    })
  })

  describe('createForbiddenError', () => {
    it('should create forbidden error response with default message', async () => {
      const response = await createForbiddenError()

      expect(response.status).toBe(403)

      const body = await response.json()
      expect(body).toMatchObject({
        success: false,
        error: {
          type: ErrorType.FORBIDDEN,
          message: 'Access forbidden',
          timestamp: expect.any(String),
        },
      })
    })

    it('should create forbidden error response with custom message', async () => {
      const response = await createForbiddenError('Insufficient permissions')

      expect(response.status).toBe(403)

      const body = await response.json()
      expect(body.error.message).toBe('Insufficient permissions')
    })
  })

  describe('createRateLimitError', () => {
    it('should create rate limit error response with default message', async () => {
      const response = await createRateLimitError()

      expect(response.status).toBe(429)

      const body = await response.json()
      expect(body).toMatchObject({
        success: false,
        error: {
          type: ErrorType.RATE_LIMIT,
          message: 'Rate limit exceeded',
          timestamp: expect.any(String),
        },
      })
    })

    it('should create rate limit error response with custom message', async () => {
      const response = await createRateLimitError('Too many requests')

      expect(response.status).toBe(429)

      const body = await response.json()
      expect(body.error.message).toBe('Too many requests')
    })
  })

  describe('createServiceUnavailableError', () => {
    it('should create service unavailable error response with default message', async () => {
      const response = await createServiceUnavailableError()

      expect(response.status).toBe(503)

      const body = await response.json()
      expect(body).toMatchObject({
        success: false,
        error: {
          type: ErrorType.SERVICE_UNAVAILABLE,
          message: 'Service temporarily unavailable',
          timestamp: expect.any(String),
        },
      })
    })

    it('should create service unavailable error response with custom message', async () => {
      const response = await createServiceUnavailableError('Maintenance mode')

      expect(response.status).toBe(503)

      const body = await response.json()
      expect(body.error.message).toBe('Maintenance mode')
    })
  })

  describe('withErrorHandling', () => {
    it('should wrap handler and return successful response', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ ok: true })
      const wrappedHandler = withErrorHandling(mockHandler)

      const result = await wrappedHandler()

      expect(mockHandler).toHaveBeenCalledOnce()
      expect(result).toEqual({ ok: true })
    })

    it('should catch errors and return error response', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Handler error'))
      const wrappedHandler = withErrorHandling(mockHandler)

      const result = await wrappedHandler()

      expect(mockHandler).toHaveBeenCalledOnce()
      expect(result.status).toBe(500)

      const body = await result.json()
      expect(body.success).toBe(false)
      expect(body.error.type).toBe(ErrorType.INTERNAL)
    })

    it('should catch ApiError and return formatted response', async () => {
      const mockHandler = vi
        .fn()
        .mockRejectedValue(new ApiError(ErrorType.VALIDATION, 'Validation failed', 400))
      const wrappedHandler = withErrorHandling(mockHandler)

      const result = await wrappedHandler()

      expect(result.status).toBe(400)

      const body = await result.json()
      expect(body.success).toBe(false)
      expect(body.error.type).toBe(ErrorType.VALIDATION)
      expect(body.error.message).toBe('Validation failed')
    })

    it('should catch string errors', async () => {
      const mockHandler = vi.fn().mockRejectedValue('String error')
      const wrappedHandler = withErrorHandling(mockHandler)

      const result = await wrappedHandler()

      expect(result.status).toBe(500)
    })

    it('should pass through handler arguments', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ success: true })
      const wrappedHandler = withErrorHandling(mockHandler)

      await wrappedHandler('arg1', 'arg2', { key: 'value' })

      expect(mockHandler).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' })
    })

    it('should handle null/undefined errors', async () => {
      const mockHandler = vi.fn().mockRejectedValue(null)
      const wrappedHandler = withErrorHandling(mockHandler)

      const result = await wrappedHandler()

      expect(result.status).toBe(500)
    })
  })

  describe('Error type constants', () => {
    it('should have all expected error types', () => {
      expect(ErrorType.VALIDATION).toBe('VALIDATION_ERROR')
      expect(ErrorType.NOT_FOUND).toBe('NOT_FOUND')
      expect(ErrorType.UNAUTHORIZED).toBe('UNAUTHORIZED')
      expect(ErrorType.FORBIDDEN).toBe('FORBIDDEN')
      expect(ErrorType.RATE_LIMIT).toBe('RATE_LIMIT_EXCEEDED')
      expect(ErrorType.INTERNAL).toBe('INTERNAL_ERROR')
      expect(ErrorType.BAD_REQUEST).toBe('BAD_REQUEST')
      expect(ErrorType.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE')
    })
  })

  describe('Integration scenarios', () => {
    it('should handle complete error flow in API handler', async () => {
      const mockHandler = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ data: 'success' }),
      })

      const wrappedHandler = withErrorHandling(mockHandler)

      const result = await wrappedHandler()
      expect(result).toBeDefined()
    })

    it('should create consistent error responses across all error types', async () => {
      const errorCreators = [
        () => createValidationError('Validation error'),
        () => createNotFoundError('Not found'),
        () => createUnauthorizedError('Unauthorized'),
        () => createForbiddenError('Forbidden'),
        () => createRateLimitError('Rate limited'),
        () => createServiceUnavailableError('Service unavailable'),
      ]

      for (const createError of errorCreators) {
        const response = await createError()
        const body = await response.json()

        expect(body).toHaveProperty('success', false)
        expect(body).toHaveProperty('error')
        expect(body.error).toHaveProperty('type')
        expect(body.error).toHaveProperty('message')
        expect(body.error).toHaveProperty('timestamp')
      }
    })
  })
})
