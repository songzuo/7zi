/**
 * Unit tests for core utility modules
 *
 * Tests cover:
 * - error handling utilities (errors.ts)
 * - date formatting utilities (date.ts)
 * - number formatting utilities (number-i18n.ts)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createAppError,
  formatErrorMessage,
  isNetworkError,
  ErrorCodes,
  getErrorCode,
  getUserFriendlyMessage,
  type AppError,
} from '@/lib/errors'

import { formatTimeAgo, formatDate, formatDateTime, isToday, isYesterday } from '@/lib/date'

import {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatFileSize,
  formatNumberShort,
} from '@/lib/number-i18n'

describe('lib/errors.ts', () => {
  describe('createAppError', () => {
    it('should create error with message only', () => {
      const error = createAppError('Test error')
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Test error')
      expect(error.code).toBeUndefined()
      expect(error.statusCode).toBeUndefined()
    })

    it('should create error with code', () => {
      const error = createAppError('Test error', ErrorCodes.NOT_FOUND)
      expect(error.code).toBe(ErrorCodes.NOT_FOUND)
    })

    it('should create error with statusCode', () => {
      const error = createAppError('Test error', ErrorCodes.NOT_FOUND, 404)
      expect(error.statusCode).toBe(404)
    })

    it('should create error with all parameters', () => {
      const error = createAppError('Not found', ErrorCodes.NOT_FOUND, 404)
      expect(error.message).toBe('Not found')
      expect(error.code).toBe(ErrorCodes.NOT_FOUND)
      expect(error.statusCode).toBe(404)
    })
  })

  describe('formatErrorMessage', () => {
    it('should format Error object', () => {
      const error = new Error('Test error')
      expect(formatErrorMessage(error)).toBe('Test error')
    })

    it('should format string', () => {
      expect(formatErrorMessage('String error')).toBe('String error')
    })

    it('should handle unknown types', () => {
      expect(formatErrorMessage(null)).toBe('发生未知错误')
      expect(formatErrorMessage(undefined)).toBe('发生未知错误')
      expect(formatErrorMessage(123)).toBe('发生未知错误')
      expect(formatErrorMessage({})).toBe('发生未知错误')
    })
  })

  describe('isNetworkError', () => {
    it('should detect network errors by message', () => {
      expect(isNetworkError(new Error('network error'))).toBe(true)
      expect(isNetworkError(new Error('fetch failed'))).toBe(true)
      expect(isNetworkError(new Error('request timeout'))).toBe(true)
      expect(isNetworkError(new Error('operation aborted'))).toBe(true)
    })

    it('should be case insensitive', () => {
      expect(isNetworkError(new Error('NETWORK ERROR'))).toBe(true)
      expect(isNetworkError(new Error('NetworkError'))).toBe(true)
    })

    it('should return false for non-network errors', () => {
      expect(isNetworkError(new Error('validation error'))).toBe(false)
      expect(isNetworkError(new Error('unknown error'))).toBe(false)
    })

    it('should return false for non-Error types', () => {
      expect(isNetworkError('network error')).toBe(false)
      expect(isNetworkError(null)).toBe(false)
    })
  })

  describe('ErrorCodes', () => {
    it('should contain all expected error codes', () => {
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND')
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED')
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN')
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
      expect(ErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR')
      expect(ErrorCodes.SERVER_ERROR).toBe('SERVER_ERROR')
      expect(ErrorCodes.UNKNOWN).toBe('UNKNOWN')
    })
  })

  describe('getErrorCode', () => {
    it('should return code from AppError', () => {
      const error = createAppError('Test', ErrorCodes.NOT_FOUND, 404)
      expect(getErrorCode(error)).toBe(ErrorCodes.NOT_FOUND)
    })

    it('should detect network errors', () => {
      const error = new Error('network error')
      expect(getErrorCode(error)).toBe(ErrorCodes.NETWORK_ERROR)
    })

    it('should map statusCode to error codes', () => {
      const error401 = createAppError('Unauthorized', undefined, 401)
      expect(getErrorCode(error401)).toBe(ErrorCodes.UNAUTHORIZED)

      const error403 = createAppError('Forbidden', undefined, 403)
      expect(getErrorCode(error403)).toBe(ErrorCodes.FORBIDDEN)

      const error404 = createAppError('Not found', undefined, 404)
      expect(getErrorCode(error404)).toBe(ErrorCodes.NOT_FOUND)

      const error500 = createAppError('Server error', undefined, 500)
      expect(getErrorCode(error500)).toBe(ErrorCodes.SERVER_ERROR)
    })

    it('should return UNKNOWN for unrecognized errors', () => {
      expect(getErrorCode(new Error('Unknown error'))).toBe(ErrorCodes.UNKNOWN)
      expect(getErrorCode('string')).toBe(ErrorCodes.UNKNOWN)
      expect(getErrorCode(null)).toBe(ErrorCodes.UNKNOWN)
    })
  })

  describe('getUserFriendlyMessage', () => {
    it('should return user-friendly messages for known error codes', () => {
      expect(getUserFriendlyMessage(ErrorCodes.NOT_FOUND)).toBe('您请求的资源不存在')
      expect(getUserFriendlyMessage(ErrorCodes.UNAUTHORIZED)).toBe('您需要登录才能访问此资源')
      expect(getUserFriendlyMessage(ErrorCodes.FORBIDDEN)).toBe('您没有权限访问此资源')
      expect(getUserFriendlyMessage(ErrorCodes.VALIDATION_ERROR)).toBe('您提交的数据格式不正确')
      expect(getUserFriendlyMessage(ErrorCodes.NETWORK_ERROR)).toBe(
        '网络连接失败，请检查您的网络设置'
      )
      expect(getUserFriendlyMessage(ErrorCodes.SERVER_ERROR)).toBe(
        '服务器暂时无法处理您的请求，请稍后重试'
      )
    })

    it('should return default message for unknown error codes', () => {
      expect(getUserFriendlyMessage('UNKNOWN_CODE')).toBe('发生未知错误，请稍后重试')
      expect(getUserFriendlyMessage('')).toBe('发生未知错误，请稍后重试')
    })
  })
})

describe('lib/date.ts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('formatTimeAgo', () => {
    it('should return "刚刚" for very recent times', () => {
      const now = new Date('2024-01-01T10:00:00')
      const date = new Date('2024-01-01T09:59:30')
      expect(formatTimeAgo(date, now)).toBe('刚刚')
    })

    it('should format minutes ago', () => {
      const now = new Date('2024-01-01T10:00:00')
      const date = new Date('2024-01-01T09:58:00')
      expect(formatTimeAgo(date, now)).toBe('2分钟前')
    })

    it('should show minutes up to less than 2 hours', () => {
      const now = new Date('2024-01-01T10:00:00')
      const date = new Date('2024-01-01T08:00:01')
      expect(formatTimeAgo(date, now)).toBe('119分钟前')
    })

    it('should format 2 hours as hours ago', () => {
      const now = new Date('2024-01-01T10:00:00')
      const date = new Date('2024-01-01T08:00:00')
      expect(formatTimeAgo(date, now)).toBe('2小时前')
    })

    it('should format hours ago', () => {
      const now = new Date('2024-01-01T20:00:00')
      const date = new Date('2024-01-01T14:00:00')
      expect(formatTimeAgo(date, now)).toBe('6小时前')
    })

    it('should format 24 hours as 24 hours ago', () => {
      const now = new Date('2024-01-01T20:00:00')
      const date = new Date('2023-12-31T20:00:00')
      expect(formatTimeAgo(date, now)).toBe('24小时前')
    })

    it('should format days ago up to 7 days', () => {
      const now = new Date('2024-01-08T10:00:00')
      const date = new Date('2024-01-05T10:00:00')
      expect(formatTimeAgo(date, now)).toBe('3天前')
    })

    it('should format date string for times older than 7 days', () => {
      const now = new Date('2024-01-15T10:00:00')
      const date = new Date('2024-01-01T10:00:00')
      expect(formatTimeAgo(date, now)).toBe('2024/1/1')
    })

    it('should work with date strings', () => {
      const now = new Date('2024-01-01T10:00:00')
      const dateString = '2024-01-01T09:58:00'
      expect(formatTimeAgo(dateString, now)).toBe('2分钟前')
    })

    it('should use current time when now is not provided', () => {
      vi.setSystemTime('2024-01-01T10:00:00')
      const date = new Date('2024-01-01T09:58:00')
      expect(formatTimeAgo(date)).toBe('2分钟前')
    })
  })

  describe('formatDate', () => {
    it('should format date with default options', () => {
      const date = new Date('2024-01-15')
      expect(formatDate(date)).toMatch(/2024/)
      expect(formatDate(date)).toMatch(/1/)
      expect(formatDate(date)).toMatch(/15/)
    })

    it('should format date with custom options', () => {
      const date = new Date('2024-01-15T10:30:00')
      const formatted = formatDate(date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      expect(formatted).toContain('2024年')
      expect(formatted).toContain('1月')
      expect(formatted).toContain('15日')
    })

    it('should work with date strings', () => {
      const dateString = '2024-01-15'
      expect(formatDate(dateString)).toMatch(/2024/)
    })
  })

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      const date = new Date('2024-01-15T14:30:45')
      const formatted = formatDateTime(date)
      expect(formatted).toContain('2024')
      expect(formatted).toContain('01')
      expect(formatted).toContain('15')
      expect(formatted).toContain('14:30')
    })

    it('should work with date strings', () => {
      const dateString = '2024-01-15T14:30:45'
      expect(formatDateTime(dateString)).toContain('2024')
    })

    it('should format with leading zeros', () => {
      const date = new Date('2024-01-05T04:05:06')
      const formatted = formatDateTime(date)
      expect(formatted).toMatch(/0?1\/0?5/)
      expect(formatted).toContain('04:05')
    })
  })

  describe('isToday', () => {
    it('should return true for today', () => {
      vi.setSystemTime('2024-01-15T10:00:00')
      const today = new Date('2024-01-15T14:30:00')
      expect(isToday(today)).toBe(true)
    })

    it('should return false for other days', () => {
      vi.setSystemTime('2024-01-15T10:00:00')
      const yesterday = new Date('2024-01-14T10:00:00')
      const tomorrow = new Date('2024-01-16T10:00:00')
      expect(isToday(yesterday)).toBe(false)
      expect(isToday(tomorrow)).toBe(false)
    })

    it('should work with date strings', () => {
      vi.setSystemTime('2024-01-15T10:00:00')
      expect(isToday('2024-01-15')).toBe(true)
      expect(isToday('2024-01-14')).toBe(false)
    })
  })

  describe('isYesterday', () => {
    it('should return true for yesterday', () => {
      vi.setSystemTime('2024-01-15T10:00:00')
      const yesterday = new Date('2024-01-14T14:30:00')
      expect(isYesterday(yesterday)).toBe(true)
    })

    it('should return false for other days', () => {
      vi.setSystemTime('2024-01-15T10:00:00')
      const today = new Date('2024-01-15T10:00:00')
      const dayBefore = new Date('2024-01-13T10:00:00')
      expect(isYesterday(today)).toBe(false)
      expect(isYesterday(dayBefore)).toBe(false)
    })

    it('should work with date strings', () => {
      vi.setSystemTime('2024-01-15T10:00:00')
      expect(isYesterday('2024-01-14')).toBe(true)
      expect(isYesterday('2024-01-13')).toBe(false)
    })
  })
})

describe('lib/number-i18n.ts', () => {
  describe('formatNumber', () => {
    it('should format integer numbers', () => {
      expect(formatNumber(1234)).toBe('1,234')
      expect(formatNumber(1234567)).toBe('1,234,567')
    })

    it('should format decimal numbers', () => {
      expect(formatNumber(1234.5678)).toBe('1,234.57')
    })

    it('should format with custom options', () => {
      const formatted = formatNumber(1234.5678, 'en-US', {
        maximumFractionDigits: 3,
      })
      expect(formatted).toBe('1,234.568')
    })

    it('should format with different locales', () => {
      expect(formatNumber(1234.5, 'en-US')).toBe('1,234.5')
      expect(formatNumber(1234.5, 'de-DE')).toBe('1.234,5')
      expect(formatNumber(1234.5, 'fr-FR')).toBe('1 234,5')
    })

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0')
      expect(formatNumber(0.1234)).toBe('0.12')
    })

    it('should handle negative numbers', () => {
      expect(formatNumber(-1234)).toBe('-1,234')
      expect(formatNumber(-1234.56)).toBe('-1,234.56')
    })
  })

  describe('formatCurrency', () => {
    it('should format CNY by default', () => {
      expect(formatCurrency(1234.56)).toBe('¥1,234.56')
    })

    it('should format different currencies', () => {
      expect(formatCurrency(1234.56, 'USD', 'en-US')).toContain('$')
      expect(formatCurrency(1234.56, 'EUR', 'de-DE')).toContain('€')
      expect(formatCurrency(1234.56, 'GBP', 'en-GB')).toContain('£')
    })

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('¥0.00')
    })

    it('should handle negative amounts', () => {
      expect(formatCurrency(-1234.56)).toContain('¥')
      expect(formatCurrency(-1234.56)).toContain('1,234.56')
    })

    it('should format with custom options', () => {
      const formatted = formatCurrency(1234.5678, 'USD', 'en-US', {
        maximumFractionDigits: 3,
      })
      expect(formatted).toBe('$1,234.568')
    })
  })

  describe('formatPercent', () => {
    it('should format percentage', () => {
      expect(formatPercent(0.5)).toBe('50%')
      expect(formatPercent(0.123)).toBe('12%')
      expect(formatPercent(1)).toBe('100%')
      expect(formatPercent(1.5)).toBe('150%')
    })

    it('should format with decimal places', () => {
      expect(formatPercent(0.1234, 'en-US', 2)).toBe('12.34%')
      expect(formatPercent(0.1234, 'en-US', 1)).toBe('12.3%')
    })

    it('should format with different locales', () => {
      expect(formatPercent(0.5, 'en-US')).toBe('50%')
      // German locale uses non-breaking space before %
      const dePercent = formatPercent(0.5, 'de-DE')
      expect(dePercent).toMatch(/50/)
      expect(dePercent).toContain('%')
    })

    it('should handle negative values', () => {
      expect(formatPercent(-0.5)).toContain('50%')
      expect(formatPercent(-0.5)).toContain('-')
    })

    it('should handle zero', () => {
      expect(formatPercent(0)).toBe('0%')
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(100)).toBe('100 B')
      expect(formatFileSize(999)).toBe('999 B')
    })

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(1024 * 999)).toBe('999 KB')
    })

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB')
    })

    it('should format gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
      expect(formatFileSize(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB')
    })

    it('should format terabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1 TB')
    })

    it('should handle zero', () => {
      expect(formatFileSize(0)).toBe('0 B')
    })

    it('should format with different locales', () => {
      const result = formatFileSize(2500, 'de-DE')
      // 2500 / 1024 ≈ 2.44, German locale uses comma as decimal separator
      expect(result).toMatch(/2[,.]4/)
      expect(result).toContain('KB')
    })
  })

  describe('formatNumberShort', () => {
    it('should format small numbers without suffix', () => {
      expect(formatNumberShort(123)).toBe('123')
      expect(formatNumberShort(999)).toBe('999')
    })

    it('should format thousands', () => {
      expect(formatNumberShort(1500)).toBe('1.5K')
      expect(formatNumberShort(12345)).toBe('12.3K')
      // With zh-CN locale and maximumFractionDigits: 1, 999999 becomes 1,000K
      expect(formatNumberShort(999999)).toBe('1,000K')
    })

    it('should format millions', () => {
      expect(formatNumberShort(1500000)).toBe('1.5M')
      expect(formatNumberShort(12345678)).toBe('12.3M')
      // With zh-CN locale and maximumFractionDigits: 1, 999999999 becomes 1,000M
      expect(formatNumberShort(999999999)).toBe('1,000M')
    })

    it('should format billions', () => {
      expect(formatNumberShort(1500000000)).toBe('1.5B')
      expect(formatNumberShort(1234567890)).toBe('1.2B')
    })

    it('should handle negative numbers', () => {
      expect(formatNumberShort(-1500)).toBe('-1.5K')
      expect(formatNumberShort(-1234567)).toBe('-1.2M')
    })

    it('should handle zero', () => {
      expect(formatNumberShort(0)).toBe('0')
    })

    it('should format with different locales', () => {
      expect(formatNumberShort(1500, 'en-US')).toBe('1.5K')
      expect(formatNumberShort(1500, 'de-DE')).toBe('1,5K')
    })
  })
})
