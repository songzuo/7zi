/**
 * @fileoverview Tests for error handling utilities
 */

import { describe, it, expect } from 'vitest'
import {
  createAppError,
  formatErrorMessage,
  isNetworkError,
  getErrorCode,
  ErrorCodes,
} from './errors'

describe('errors', () => {
  describe('createAppError', () => {
    it('should create an error with message', () => {
      const error = createAppError('Test error')
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Test error')
    })

    it('should create an error with code', () => {
      const error = createAppError('Test error', 'TEST_ERROR')
      expect(error.code).toBe('TEST_ERROR')
    })

    it('should create an error with statusCode', () => {
      const error = createAppError('Test error', 'TEST_ERROR', 404)
      expect(error.statusCode).toBe(404)
    })
  })

  describe('formatErrorMessage', () => {
    it('should format Error objects', () => {
      const error = new Error('Test error message')
      expect(formatErrorMessage(error)).toBe('Test error message')
    })

    it('should format string errors', () => {
      expect(formatErrorMessage('String error')).toBe('String error')
    })

    it('should format unknown errors', () => {
      expect(formatErrorMessage(null)).toBe('发生未知错误')
      expect(formatErrorMessage(undefined)).toBe('发生未知错误')
      expect(formatErrorMessage(123)).toBe('发生未知错误')
    })
  })

  describe('isNetworkError', () => {
    it('should detect network errors', () => {
      expect(isNetworkError(new Error('Network error'))).toBe(true)
      expect(isNetworkError(new Error('Fetch failed'))).toBe(true)
      expect(isNetworkError(new Error('Request timeout'))).toBe(true)
      expect(isNetworkError(new Error('Request aborted'))).toBe(true)
      expect(isNetworkError(new Error('NETWORK ERROR'))).toBe(true)
    })

    it('should not detect non-network errors', () => {
      expect(isNetworkError(new Error('Validation failed'))).toBe(false)
      expect(isNetworkError(new Error('Not found'))).toBe(false)
    })

    it('should return false for non-Error objects', () => {
      expect(isNetworkError('Network error')).toBe(false)
      expect(isNetworkError(null)).toBe(false)
    })
  })

  describe('getErrorCode', () => {
    it('should return error code from AppError', () => {
      const error = createAppError('Test', ErrorCodes.NOT_FOUND)
      expect(getErrorCode(error)).toBe(ErrorCodes.NOT_FOUND)
    })

    it('should detect network errors', () => {
      const error = new Error('Network request failed')
      expect(getErrorCode(error)).toBe(ErrorCodes.NETWORK_ERROR)
    })

    it('should map 401 to UNAUTHORIZED', () => {
      const error = createAppError('Test', undefined, 401)
      expect(getErrorCode(error)).toBe(ErrorCodes.UNAUTHORIZED)
    })

    it('should map 403 to FORBIDDEN', () => {
      const error = createAppError('Test', undefined, 403)
      expect(getErrorCode(error)).toBe(ErrorCodes.FORBIDDEN)
    })

    it('should map 404 to NOT_FOUND', () => {
      const error = createAppError('Test', undefined, 404)
      expect(getErrorCode(error)).toBe(ErrorCodes.NOT_FOUND)
    })

    it('should map 5xx errors to SERVER_ERROR', () => {
      expect(getErrorCode(createAppError('Test', undefined, 500))).toBe(ErrorCodes.SERVER_ERROR)
      expect(getErrorCode(createAppError('Test', undefined, 502))).toBe(ErrorCodes.SERVER_ERROR)
      expect(getErrorCode(createAppError('Test', undefined, 503))).toBe(ErrorCodes.SERVER_ERROR)
      expect(getErrorCode(createAppError('Test', undefined, 504))).toBe(ErrorCodes.SERVER_ERROR)
    })

    it('should return UNKNOWN for unrecognized errors', () => {
      expect(getErrorCode(new Error('Unknown error'))).toBe(ErrorCodes.UNKNOWN)
      expect(getErrorCode('string error')).toBe(ErrorCodes.UNKNOWN)
    })
  })

  describe('ErrorCodes', () => {
    it('should have all expected error codes', () => {
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND')
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED')
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN')
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
      expect(ErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR')
      expect(ErrorCodes.SERVER_ERROR).toBe('SERVER_ERROR')
      expect(ErrorCodes.UNKNOWN).toBe('UNKNOWN')
    })
  })
})
