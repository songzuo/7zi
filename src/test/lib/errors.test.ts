import { describe, it, expect } from 'vitest'
import {
  createApiError,
  formatErrorMessage,
  isNetworkError,
  getErrorCodeFromStatus,
  getUserFriendlyMessage,
  ErrorCodes,
  AppError,
} from '@/lib/errors'

describe('errors', () => {
  describe('AppError', () => {
    it('creates an error with message only', () => {
      const error = new AppError('Test error')
      
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe(ErrorCodes.UNKNOWN)
    })

    it('creates an error with code', () => {
      const error = new AppError('Test error', { code: ErrorCodes.VALIDATION_ERROR })
      
      expect(error.message).toBe('Test error')
      expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR)
    })

    it('creates an error with code and status code', () => {
      const error = new AppError('Test error', { code: ErrorCodes.NOT_FOUND, context: { statusCode: 404 } })
      
      expect(error.message).toBe('Test error')
      expect(error.code).toBe(ErrorCodes.NOT_FOUND)
      expect(error.context.statusCode).toBe(404)
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

  describe('getErrorCodeFromStatus', () => {
    it('maps 200-299 to OK', () => {
      expect(getErrorCodeFromStatus(200)).toBe('OK')
    })

    it('maps 401 to UNAUTHORIZED', () => {
      expect(getErrorCodeFromStatus(401)).toBe(ErrorCodes.UNAUTHORIZED)
    })

    it('maps 403 to FORBIDDEN', () => {
      expect(getErrorCodeFromStatus(403)).toBe(ErrorCodes.FORBIDDEN)
    })

    it('maps 404 to NOT_FOUND', () => {
      expect(getErrorCodeFromStatus(404)).toBe(ErrorCodes.NOT_FOUND)
    })

    it('maps 500 to SERVER_ERROR', () => {
      expect(getErrorCodeFromStatus(500)).toBe(ErrorCodes.SERVER_ERROR)
    })

    it('maps 502 to SERVER_ERROR', () => {
      expect(getErrorCodeFromStatus(502)).toBe(ErrorCodes.SERVER_ERROR)
    })

    it('maps 503 to SERVICE_UNAVAILABLE', () => {
      expect(getErrorCodeFromStatus(503)).toBe(ErrorCodes.SERVICE_UNAVAILABLE)
    })

    it('maps 504 to TIMEOUT', () => {
      expect(getErrorCodeFromStatus(504)).toBe(ErrorCodes.TIMEOUT)
    })

    it('returns UNKNOWN for unhandled cases', () => {
      expect(getErrorCodeFromStatus(418)).toBe(ErrorCodes.UNKNOWN)
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
      expect(getUserFriendlyMessage('UNKNOWN_CODE' as any)).toBe('发生未知错误，请稍后重试')
    })
  })

  describe('ErrorCodes constants', () => {
    it('has all expected error codes', () => {
      expect(ErrorCodes.OK).toBe('OK')
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND')
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED')
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN')
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
      expect(ErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR')
      expect(ErrorCodes.SERVER_ERROR).toBe('SERVER_ERROR')
      expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE')
      expect(ErrorCodes.TIMEOUT).toBe('TIMEOUT')
      expect(ErrorCodes.UNKNOWN).toBe('UNKNOWN')
    })
  })
})
