import { describe, it, expect } from 'vitest'
import {
  createAppError,
  formatErrorMessage,
  isNetworkError,
  getErrorCode,
  getUserFriendlyMessage,
  ErrorCodes,
} from '@/lib/errors'

describe('errors', () => {
  describe('createAppError', () => {
    it('creates an error with message only', () => {
      const error = createAppError('Test error')
      
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Test error')
      expect(error.code).toBeUndefined()
      expect(error.statusCode).toBeUndefined()
    })

    it('creates an error with code', () => {
      const error = createAppError('Test error', 'TEST_CODE')
      
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
    })

    it('creates an error with code and status code', () => {
      const error = createAppError('Test error', 'TEST_CODE', 404)
      
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.statusCode).toBe(404)
    })
  })

  describe('formatErrorMessage', () => {
    it('formats Error instances', () => {
      const error = new Error('Test error message')
      expect(formatErrorMessage(error)).toBe('Test error message')
    })

    it('returns string as-is', () => {
      expect(formatErrorMessage('String error')).toBe('String error')
    })

    it('returns default message for unknown types', () => {
      expect(formatErrorMessage(null)).toBe('发生未知错误')
      expect(formatErrorMessage(undefined)).toBe('发生未知错误')
      expect(formatErrorMessage(123)).toBe('发生未知错误')
    })
  })

  describe('isNetworkError', () => {
    it('detects network errors', () => {
      expect(isNetworkError(new Error('network error'))).toBe(true)
      expect(isNetworkError(new Error('Network failed'))).toBe(true)
      expect(isNetworkError(new Error('fetch failed'))).toBe(true)
      expect(isNetworkError(new Error('Request timeout'))).toBe(true)
      expect(isNetworkError(new Error('Request aborted'))).toBe(true)
    })

    it('returns false for non-network errors', () => {
      expect(isNetworkError(new Error('Syntax error'))).toBe(false)
      expect(isNetworkError(new Error('Type error'))).toBe(false)
    })

    it('returns false for non-Error types', () => {
      expect(isNetworkError('network error')).toBe(false)
      expect(isNetworkError(null)).toBe(false)
    })
  })

  describe('getErrorCode', () => {
    it('returns code from AppError', () => {
      const error = createAppError('Test', 'CUSTOM_CODE')
      expect(getErrorCode(error)).toBe('CUSTOM_CODE')
    })

    it('detects network errors', () => {
      const error = new Error('network failed')
      expect(getErrorCode(error)).toBe(ErrorCodes.NETWORK_ERROR)
    })

    it('maps 401 status to UNAUTHORIZED', () => {
      const error = createAppError('Unauthorized', undefined, 401)
      expect(getErrorCode(error)).toBe(ErrorCodes.UNAUTHORIZED)
    })

    it('maps 403 status to FORBIDDEN', () => {
      const error = createAppError('Forbidden', undefined, 403)
      expect(getErrorCode(error)).toBe(ErrorCodes.FORBIDDEN)
    })

    it('maps 404 status to NOT_FOUND', () => {
      const error = createAppError('Not found', undefined, 404)
      expect(getErrorCode(error)).toBe(ErrorCodes.NOT_FOUND)
    })

    it('maps 500 status to SERVER_ERROR', () => {
      const error = createAppError('Server error', undefined, 500)
      expect(getErrorCode(error)).toBe(ErrorCodes.SERVER_ERROR)
    })

    it('maps 502 status to SERVER_ERROR', () => {
      const error = createAppError('Bad gateway', undefined, 502)
      expect(getErrorCode(error)).toBe(ErrorCodes.SERVER_ERROR)
    })

    it('maps 503 status to SERVER_ERROR', () => {
      const error = createAppError('Service unavailable', undefined, 503)
      expect(getErrorCode(error)).toBe(ErrorCodes.SERVER_ERROR)
    })

    it('maps 504 status to SERVER_ERROR', () => {
      const error = createAppError('Gateway timed out', undefined, 504)
      expect(getErrorCode(error)).toBe(ErrorCodes.SERVER_ERROR)
    })

    it('returns UNKNOWN for unhandled cases', () => {
      expect(getErrorCode(null)).toBe(ErrorCodes.UNKNOWN)
      expect(getErrorCode('string')).toBe(ErrorCodes.UNKNOWN)
      expect(getErrorCode(new Error('unknown'))).toBe(ErrorCodes.UNKNOWN)
    })
  })

  describe('getUserFriendlyMessage', () => {
    it('returns friendly message for NOT_FOUND', () => {
      expect(getUserFriendlyMessage(ErrorCodes.NOT_FOUND)).toBe('您请求的资源不存在')
    })

    it('returns friendly message for UNAUTHORIZED', () => {
      expect(getUserFriendlyMessage(ErrorCodes.UNAUTHORIZED)).toBe('您需要登录才能访问此资源')
    })

    it('returns friendly message for FORBIDDEN', () => {
      expect(getUserFriendlyMessage(ErrorCodes.FORBIDDEN)).toBe('您没有权限访问此资源')
    })

    it('returns friendly message for VALIDATION_ERROR', () => {
      expect(getUserFriendlyMessage(ErrorCodes.VALIDATION_ERROR)).toBe('您提交的数据格式不正确')
    })

    it('returns friendly message for NETWORK_ERROR', () => {
      expect(getUserFriendlyMessage(ErrorCodes.NETWORK_ERROR)).toBe('网络连接失败，请检查您的网络设置')
    })

    it('returns friendly message for SERVER_ERROR', () => {
      expect(getUserFriendlyMessage(ErrorCodes.SERVER_ERROR)).toBe('服务器暂时无法处理您的请求，请稍后重试')
    })

    it('returns default message for unknown codes', () => {
      expect(getUserFriendlyMessage('UNKNOWN_CODE')).toBe('发生未知错误，请稍后重试')
    })
  })

  describe('ErrorCodes constants', () => {
    it('has all expected error codes', () => {
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
