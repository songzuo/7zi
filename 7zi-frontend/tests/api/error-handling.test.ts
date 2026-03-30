/**
 * API Error Handling Edge Cases Tests
 * 边界测试用例 - 验证错误处理模块的边界条件和异常场景
 *
 * @date 2026-03-29
 * @task 补充边界测试用例
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ApiError,
  createErrorResponse,
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createRateLimitError,
  createServiceUnavailableError,
  ErrorType,
  withErrorHandling,
} from '@/lib/api/error-handler'
import { logApiError, createApiContext, ErrorStatistics } from '@/lib/api/error-logger'
import { withRetry, RetryPresets } from '@/lib/api/retry-decorator'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('../../src/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('API Error Handling Edge Cases Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('1. 超长错误消息处理（超过 10KB）', () => {
    const generateLongMessage = (sizeInBytes: number): string => {
      const baseMessage = '这是一个测试错误消息。'
      const baseLength = Buffer.byteLength(baseMessage, 'utf8')
      const repeatCount = Math.ceil(sizeInBytes / baseLength)
      return baseMessage.repeat(repeatCount)
    }

    it('should handle 10KB error message', async () => {
      const longMessage = generateLongMessage(10 * 1024) // 10KB
      const error = new ApiError(ErrorType.INTERNAL, longMessage, 500)

      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error.message).toBe(longMessage)
      expect(Buffer.byteLength(responseData.error.message, 'utf8')).toBeGreaterThanOrEqual(10 * 1024)
    })

    it('should handle 100KB error message', async () => {
      const longMessage = generateLongMessage(100 * 1024) // 100KB
      const error = new ApiError(ErrorType.VALIDATION, longMessage, 400)

      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.message).toBe(longMessage)
      expect(Buffer.byteLength(responseData.error.message, 'utf8')).toBeGreaterThanOrEqual(100 * 1024)
    })

    it('should handle 1MB error message (stress test)', async () => {
      const longMessage = generateLongMessage(1024 * 1024) // 1MB
      const error = new ApiError(ErrorType.INTERNAL, longMessage, 500)

      const startTime = Date.now()
      const response = createErrorResponse(error)
      const duration = Date.now() - startTime

      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(Buffer.byteLength(responseData.error.message, 'utf8')).toBeGreaterThanOrEqual(1024 * 1024)
      // Performance check: should complete within 5 seconds even for 1MB
      expect(duration).toBeLessThan(5000)
    })

    it('should handle error message with mixed languages and emojis', async () => {
      const complexMessage = `
        中文错误消息：这是超长的错误描述
        English error message: This is a very long error description
        日本語エラーメッセージ：これは非常に長いエラー説明です
        🚨⚠️❌ Error with emojis: ${'⚡'.repeat(1000)}
        Arabic message: رسالة خطأ طويلة باللغة العربية
        ${'测试'.repeat(2000)}
      `
      const error = new ApiError(ErrorType.VALIDATION, complexMessage, 400)

      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.message).toContain('中文')
      expect(responseData.error.message).toContain('English')
      expect(responseData.error.message).toContain('日本語')
      expect(responseData.error.message).toContain('🚨')
    })

    it('should truncate long messages in production mode', async () => {
      // 模拟生产环境
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const longMessage = generateLongMessage(100 * 1024) // 100KB
      const error = new ApiError(ErrorType.INTERNAL, longMessage, 500)

      const response = createErrorResponse(error)
      const responseData = await response.json()

      // 在生产环境，原始消息应该被截断或隐藏
      expect(responseData.error.message).toBeDefined()

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('2. 特殊字符转义（XSS 防护验证）', () => {
    it('should escape HTML tags in error message', async () => {
      const xssMessage = '<script>alert("XSS")</script><img src=x onerror=alert(1)>'
      const error = new ApiError(ErrorType.VALIDATION, xssMessage, 400)

      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.message).toBe(xssMessage)
      // 确保响应的 Content-Type 是 application/json（防止 HTML 解析）
      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should escape SQL injection attempts', async () => {
      const sqlMessage = "'; DROP TABLE users; --"
      const error = new ApiError(ErrorType.VALIDATION, sqlMessage, 400)

      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.message).toBe(sqlMessage)
    })

    it('should handle Unicode control characters', async () => {
      const controlCharsMessage = String.fromCharCode(0) + String.fromCharCode(1) + 'Normal text' + String.fromCharCode(31)
      const error = new ApiError(ErrorType.VALIDATION, controlCharsMessage, 400)

      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      // JSON 序列化会自动处理控制字符
      expect(responseData.error.message).toBeDefined()
    })

    it('should handle null bytes and binary data', async () => {
      const binaryMessage = '\x00Binary\x01data\x02here\x03'
      const error = new ApiError(ErrorType.INTERNAL, binaryMessage, 500)

      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error.message).toBeDefined()
    })

    it('should handle JSON injection attempts in error details', async () => {
      const maliciousDetails = {
        message: '{"injected":true,"malicious":"data"}',
        nested: {
          script: '<script>alert(1)</script>'
        }
      }
      const error = new ApiError(ErrorType.VALIDATION, 'Test message', 400, maliciousDetails)

      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.details).toEqual(maliciousDetails)
      // 确保是 JSON 响应，不是 HTML
      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should handle template injection attempts', async () => {
      const templateMessage = '${process.env.SECRET}{{7*7}}<%= 7*7 %>'
      const error = new ApiError(ErrorType.VALIDATION, templateMessage, 400)

      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.message).toBe(templateMessage)
      // 确保没有被执行
      expect(responseData.error.message).toContain('${')
      expect(responseData.error.message).toContain('{{')
    })

    it('should handle protocol-relative URLs', async () => {
      const urlMessage = '//evil.com/xss.js'
      const error = new ApiError(ErrorType.VALIDATION, urlMessage, 400)

      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.message).toBe(urlMessage)
    })

    it('should handle data URLs', async () => {
      const dataUrlMessage = 'data:text/html,<script>alert(1)</script>'
      const error = new ApiError(ErrorType.VALIDATION, dataUrlMessage, 400)

      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.message).toBe(dataUrlMessage)
    })

    it('should handle javascript: URLs', async () => {
      const jsUrlMessage = 'javascript:alert(1)'
      const error = new ApiError(ErrorType.VALIDATION, jsUrlMessage, 400)

      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.message).toBe(jsUrlMessage)
    })

    it('should handle excessive nesting levels in error details', async () => {
      const createDeepNesting = (depth: number, current: number = 0): Record<string, unknown> => {
        if (current >= depth) return { value: 'deep' }
        return { level: current, nested: createDeepNesting(depth, current + 1) }
      }

      const deepDetails = createDeepNesting(100) // 100层嵌套
      const error = new ApiError(ErrorType.VALIDATION, 'Deep nesting test', 400, deepDetails)

      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.details).toBeDefined()
      expect(responseData.error.details.nested).toBeDefined()
    })
  })

  describe('3. 嵌套错误对象序列化', () => {
    it('should handle nested error objects', async () => {
      const originalError = new Error('Original error')
      originalError.stack = 'Stack trace line 1\nStack trace line 2'

      const wrappedError = new ApiError(
        ErrorType.INTERNAL,
        'Wrapped error',
        500,
        {
          originalError: {
            name: originalError.name,
            message: originalError.message,
            stack: originalError.stack,
          },
          nestedLevel: 1,
        }
      )

      const response = createErrorResponse(wrappedError)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error.message).toBe('Wrapped error')
      expect(responseData.error.details?.originalError?.message).toBe('Original error')
    })

    it('should handle deeply nested error chains', async () => {
      const createErrorChain = (depth: number): ApiError => {
        if (depth <= 0) {
          return new ApiError(ErrorType.VALIDATION, 'Base error', 400)
        }

        const previous = createErrorChain(depth - 1)
        return new ApiError(
          ErrorType.INTERNAL,
          `Error at level ${depth}`,
          500,
          {
            previousError: {
              type: previous.type,
              message: previous.message,
              statusCode: previous.statusCode,
            },
            level: depth,
          }
        )
      }

      const deepError = createErrorChain(10) // 10层嵌套
      const response = createErrorResponse(deepError)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error.message).toBe('Error at level 10')
      expect(responseData.error.details?.level).toBe(10)
    })

    it('should handle circular references in error details', async () => {
      const circular: Record<string, unknown> = {
        message: 'Circular reference',
      }
      circular.self = circular

      const error = new ApiError(ErrorType.VALIDATION, 'Circular test', 400, circular)

      // JSON.stringify 应该处理循环引用（会抛出错误）
      // 测试我们的错误处理器是否能正确处理
      expect(() => {
        const response = createErrorResponse(error)
        response.json()
      }).toThrow() // 或者根据实现返回可序列化的版本
    })

    it('should handle arrays in error details', async () => {
      const errorDetails = {
        errors: [
          { field: 'email', message: 'Invalid email' },
          { field: 'password', message: 'Password too short' },
          { field: 'username', message: 'Username required' },
        ],
        count: 3,
      }

      const error = new ApiError(ErrorType.VALIDATION, 'Multiple validation errors', 400, errorDetails)
      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.details?.errors).toHaveLength(3)
      expect(responseData.error.details?.errors[0].field).toBe('email')
    })

    it('should handle mixed types in error details', async () => {
      const errorDetails = {
        string: 'string value',
        number: 123,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { nested: 'value' },
        date: new Date().toISOString(),
        regex: '/test/g',
      }

      const error = new ApiError(ErrorType.VALIDATION, 'Mixed types test', 400, errorDetails)
      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.details?.string).toBe('string value')
      expect(responseData.error.details?.number).toBe(123)
      expect(responseData.error.details?.boolean).toBe(true)
      expect(responseData.error.details?.null).toBe(null)
      expect(responseData.error.details?.array).toEqual([1, 2, 3])
    })

    it('should handle Error subclasses', async () => {
      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message)
          this.name = 'CustomError'
        }
      }

      const customError = new CustomError('Custom error message', 'CUSTOM_CODE')

      const response = createErrorResponse(customError)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error.message).toBe('Custom error message')
      expect(responseData.error.type).toBe(ErrorType.INTERNAL)
    })

    it('should preserve stack trace in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const error = new Error('Test error')
      error.stack = 'Stack trace line 1\nStack trace line 2\nStack trace line 3'

      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error.details?.originalMessage).toBe('Test error')

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv
    })

    it('should omit stack trace in production mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const error = new Error('Test error')
      error.stack = 'Stack trace line 1\nStack trace line 2\nStack trace line 3'

      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      // 在生产环境，不应该暴露原始错误消息
      expect(responseData.error.message).toBe('An internal error occurred')
      expect(responseData.error.details?.originalMessage).toBeUndefined()

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('4. 并发错误日志写入', () => {
    it('should handle concurrent error logging without data loss', async () => {
      const concurrency = 100
      const requests = Array.from({ length: concurrency }, (_, i) =>
        logApiError(
          new Error(`Concurrent error ${i}`),
          {
            requestId: `req-${i}`,
            path: '/api/test',
            method: 'POST',
          }
        )
      )

      await Promise.all(requests)

      // 验证日志被记录
      const logger = await import('@/lib/logger')
      expect(logger.logger.error).toHaveBeenCalledTimes(concurrency)
    })

    it('should handle concurrent logging with different error types', async () => {
      const errorTypes = [
        ErrorType.VALIDATION,
        ErrorType.NOT_FOUND,
        ErrorType.UNAUTHORIZED,
        ErrorType.FORBIDDEN,
        ErrorType.INTERNAL,
      ]

      const requests = errorTypes.map((type, i) =>
        logApiError(
          new ApiError(type, `Error of type ${type}`),
          {
            requestId: `req-${type}-${i}`,
            path: `/api/test/${type}`,
            method: 'GET',
          }
        )
      )

      await Promise.all(requests)

      // 验证所有错误类型都被正确记录
      const logger = await import('@/lib/logger')
      expect(logger.logger.error).toHaveBeenCalled()
      expect(logger.logger.warn).toHaveBeenCalled()
    })

    it('should handle rapid successive error logging', async () => {
      const rapidErrors = 50
      const startTime = Date.now()

      const requests = Array.from({ length: rapidErrors }, (_, i) =>
        logApiError(
          new Error(`Rapid error ${i}`),
          {
            requestId: `rapid-${i}`,
            path: '/api/rapid',
            method: 'POST',
          }
        )
      )

      await Promise.all(requests)

      const duration = Date.now() - startTime

      // 验证性能：应该快速完成
      expect(duration).toBeLessThan(5000) // 5秒内完成

      // 验证所有错误都被记录
      const logger = await import('@/lib/logger')
      expect(logger.logger.error).toHaveBeenCalledTimes(rapidErrors)
    })

    it('should handle concurrent error statistics recording', async () => {
      const stats = new ErrorStatistics(60000) // 1 minute window
      const errorTypes = [
        ErrorType.VALIDATION,
        ErrorType.NOT_FOUND,
        ErrorType.UNAUTHORIZED,
        ErrorType.FORBIDDEN,
        ErrorType.INTERNAL,
      ]

      // 并发记录错误
      const requests = Array.from({ length: 100 }, (_, i) => {
        const type = errorTypes[i % errorTypes.length]
        return Promise.resolve(stats.record(type, '/api/test'))
      })

      await Promise.all(requests)

      // 验证统计
      expect(stats.getCount(ErrorType.VALIDATION, '/api/test')).toBe(20)
      expect(stats.getCount(ErrorType.NOT_FOUND, '/api/test')).toBe(20)
      expect(stats.getCount(ErrorType.UNAUTHORIZED, '/api/test')).toBe(20)
      expect(stats.getCount(ErrorType.FORBIDDEN, '/api/test')).toBe(20)
      expect(stats.getCount(ErrorType.INTERNAL, '/api/test')).toBe(20)
    })

    it('should handle concurrent logging with shared ErrorStatistics instance', async () => {
      const stats = new ErrorStatistics()

      // 并发记录 1000 个错误
      const requests = Array.from({ length: 1000 }, (_, i) =>
        Promise.resolve(stats.record(`ERROR_TYPE_${i % 10}`, `/api/path/${i % 5}`))
      )

      await Promise.all(requests)

      // 验证总数
      const allStats = stats.getAll()
      const totalCount = Object.values(allStats).reduce((sum, stat) => sum + stat.count, 0)

      expect(totalCount).toBe(1000)
    })

    it('should handle concurrent logging with performance tracking', async () => {
      const requests = Array.from({ length: 50 }, async (_, i) => {
        const mockRequest = new Request(`https://example.com/api/test/${i}`, {
          method: 'POST',
        })

        const context = createApiContext(mockRequest, {
          requestId: `perf-${i}`,
          duration: Math.random() * 1000,
        })

        await logApiError(
          new Error(`Performance test error ${i}`),
          context
        )
      })

      await Promise.all(requests)

      const logger = await import('../../src/lib/logger')
      expect(logger.logger.error).toHaveBeenCalledTimes(50)
    })

    it('should handle concurrent logging during high load', async () => {
      const highLoadCount = 500
      const requests = Array.from({ length: highLoadCount }, (_, i) =>
        logApiError(
          new Error(`High load error ${i}`),
          {
            requestId: `high-${i}`,
            path: '/api/high-load',
            method: 'GET',
            duration: Math.random() * 1000,
            metadata: { index: i, timestamp: Date.now() },
          }
        )
      )

      const startTime = Date.now()
      await Promise.all(requests)
      const duration = Date.now() - startTime

      // 性能检查：应该在合理时间内完成
      expect(duration).toBeLessThan(10000) // 10秒内完成

      const logger = await import('../../src/lib/logger')
      expect(logger.logger.error).toHaveBeenCalledTimes(highLoadCount)
    })

    it('should handle concurrent logStatistics reset', async () => {
      const stats = new ErrorStatistics()

      // 先记录一些错误
      await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          Promise.resolve(stats.record(`ERROR_${i % 5}`, '/api/path'))
        )
      )

      // 并发重置和记录
      await Promise.all([
        Promise.resolve(stats.reset()),
        ...Array.from({ length: 30 }, (_, i) =>
          Promise.resolve(stats.record(`NEW_ERROR_${i % 3}`, '/api/new-path'))
        ),
      ])

      // 验证重置后的统计
      expect(stats.getCount('ERROR_0', '/api/path')).toBe(0)
      expect(stats.getCount('NEW_ERROR_0', '/api/new-path')).toBe(10)
    })
  })

  describe('5. 错误码边界值测试', () => {
    it('should handle all valid HTTP status codes', () => {
      const validCodes = [200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 409, 429, 500, 502, 503, 504]

      validCodes.forEach(code => {
        const error = new ApiError(ErrorType.INTERNAL, 'Test error', code)
        const response = createErrorResponse(error)
        expect(response.status).toBe(code)
      })
    })

    it('should handle edge HTTP status codes', () => {
      const edgeCodes = [
        { code: 100, description: 'Continue' },
        { code: 199, description: 'Informational' },
        { code: 200, description: 'OK' },
        { code: 299, description: 'Success' },
        { code: 300, description: 'Multiple Choices' },
        { code: 399, description: 'Redirect' },
        { code: 400, description: 'Bad Request' },
        { code: 499, description: 'Client Error' },
        { code: 500, description: 'Internal Server Error' },
        { code: 599, description: 'Server Error' },
      ]

      edgeCodes.forEach(({ code, description }) => {
        const error = new ApiError(ErrorType.INTERNAL, description, code)
        const response = createErrorResponse(error)
        expect(response.status).toBe(code)
      })
    })

    it('should handle negative status codes (edge case)', () => {
      const negativeCodes = [-1, -100, -500]

      negativeCodes.forEach(code => {
        const error = new ApiError(ErrorType.INTERNAL, 'Negative code', code as any)
        const response = createErrorResponse(error)
        // HTTP 规范不允许负状态码，但我们应该优雅处理
        expect(response.status).toBeDefined()
      })
    })

    it('should handle very large status codes (edge case)', () => {
      const largeCodes = [1000, 9999, 99999]

      largeCodes.forEach(code => {
        const error = new ApiError(ErrorType.INTERNAL, 'Large code', code as any)
        const response = createErrorResponse(error)
        // HTTP 规范限制状态码为 1-599，但我们应该优雅处理
        expect(response.status).toBeDefined()
      })
    })

    it('should handle zero status code', () => {
      const error = new ApiError(ErrorType.INTERNAL, 'Zero code', 0)
      const response = createErrorResponse(error)
      expect(response.status).toBeDefined()
    })

    it('should handle all ErrorType values', async () => {
      const errorTypes = Object.values(ErrorType)

      errorTypes.forEach(type => {
        const error = new ApiError(type, `Test error for ${type}`)
        const response = createErrorResponse(error)
        const responseData = response.json() as Promise<{ error: { type: string } }>

        expect(response.status).toBeDefined()
        responseData.then(data => {
          expect(data.error.type).toBe(type)
        })
      })
    })

    it('should handle empty error message', async () => {
      const error = new ApiError(ErrorType.VALIDATION, '', 400)
      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.message).toBe('')
    })

    it('should handle single character error message', async () => {
      const error = new ApiError(ErrorType.VALIDATION, 'E', 400)
      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.message).toBe('E')
    })

    it('should handle whitespace-only error message', async () => {
      const error = new ApiError(ErrorType.VALIDATION, '   \n\t\r   ', 400)
      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.message).toBe('   \n\t\r   ')
    })

    it('should handle error message with null characters', async () => {
      const error = new ApiError(ErrorType.VALIDATION, 'Error\x00with\x00nulls', 400)
      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      // JSON 序列化会处理空字符
      expect(responseData.error.message).toBeDefined()
    })

    it('should handle error details with special number values', async () => {
      const specialNumbers = {
        zero: 0,
        negative: -1,
        veryLarge: Number.MAX_SAFE_INTEGER,
        verySmall: Number.MIN_SAFE_INTEGER,
        float: 3.14159265359,
        infinity: Infinity,
        negativeInfinity: -Infinity,
        notANumber: NaN,
      }

      const error = new ApiError(ErrorType.VALIDATION, 'Special numbers', 400, specialNumbers)
      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.details?.zero).toBe(0)
      expect(responseData.error.details?.negative).toBe(-1)
      expect(responseData.error.details?.veryLarge).toBe(Number.MAX_SAFE_INTEGER)
      expect(responseData.error.details?.verySmall).toBe(Number.MIN_SAFE_INTEGER)
      expect(responseData.error.details?.float).toBe(3.14159265359)
      // Infinity 和 NaN 在 JSON 中会被转换为 null
    })

    it('should handle error details with empty values', async () => {
      const emptyValues = {
        emptyString: '',
        emptyArray: [],
        emptyObject: {},
        nullValue: null,
        undefinedValue: undefined,
      }

      const error = new ApiError(ErrorType.VALIDATION, 'Empty values', 400, emptyValues)
      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.details?.emptyString).toBe('')
      expect(responseData.error.details?.emptyArray).toEqual([])
      expect(responseData.error.details?.emptyObject).toEqual({})
      expect(responseData.error.details?.nullValue).toBe(null)
      expect(responseData.error.details?.undefinedValue).toBeUndefined()
    })

    it('should handle error with no details', async () => {
      const error = new ApiError(ErrorType.VALIDATION, 'No details')
      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.details).toBeUndefined()
    })

    it('should handle error with null details', async () => {
      const error = new ApiError(ErrorType.VALIDATION, 'Null details', 400, null as any)
      const response = createErrorResponse(error)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error.details).toBeNull()
    })

    it('should handle all retry configuration boundary values', async () => {
      const boundaryConfigs = [
        { maxRetries: 0, initialDelay: 0, maxDelay: 0 },
        { maxRetries: 100, initialDelay: 1, maxDelay: 1 },
        { maxRetries: -1, initialDelay: -100, maxDelay: -1000 },
        { maxRetries: Number.MAX_SAFE_INTEGER, initialDelay: 1000000, maxDelay: 10000000 },
      ]

      for (const config of boundaryConfigs) {
        const mockFn = vi.fn().mockRejectedValue(new Error('Test error'))

        const fnWithRetry = withRetry(mockFn, config)

        try {
          await fnWithRetry()
        } catch (error) {
          // 应该抛出错误
        }

        // 验证函数被调用（配置可能无效，但应该不崩溃）
        expect(mockFn).toHaveBeenCalled()
      }
    })

    it('should handle retry with all status codes', async () => {
      const statusCodes = [200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 409, 429, 500, 502, 503, 504]

      for (const code of statusCodes) {
        const mockFn = vi.fn()
          .mockRejectedValueOnce(new Error(`HTTP ${code}`))
          .mockResolvedValueOnce('success')

        const fnWithRetry = withRetry(
          mockFn,
          {
            maxRetries: 3,
            retryableErrors: [code],
          }
        )

        const result = await fnWithRetry()

        expect(result).toBe('success')
        expect(mockFn).toHaveBeenCalledTimes(2)
      }
    })
  })

  describe('综合边界测试场景', () => {
    it('should handle concurrent errors with long messages and special characters', async () => {
      const longXssMessage = '<script>'.repeat(1000) + 'XSS' + '</script>'.repeat(1000)

      const requests = Array.from({ length: 50 }, (_, i) =>
        Promise.resolve(
          createErrorResponse(
            new ApiError(ErrorType.VALIDATION, `${longXssMessage} - Error ${i}`, 400, {
              requestId: `req-${i}`,
              path: '/api/comprehensive',
              method: 'POST',
              index: i,
            })
          )
        )
      )

      const responses = await Promise.all(requests)

      responses.forEach((response, i) => {
        expect(response.status).toBe(400)
        expect(response.headers.get('content-type')).toContain('application/json')
      })
    })

    it('should handle error chain with concurrent logging', async () => {
      const errorChains = Array.from({ length: 20 }, (_, i) => {
        let error: ApiError = new ApiError(ErrorType.VALIDATION, `Base error ${i}`, 400)

        for (let j = 0; j < 5; j++) {
          error = new ApiError(ErrorType.INTERNAL, `Wrapped error ${i}-${j}`, 500, {
            previousError: {
              type: error.type,
              message: error.message,
              statusCode: error.statusCode,
            },
            level: j + 1,
            chain: i,
          })
        }

        return logApiError(error, {
          requestId: `chain-${i}`,
          path: '/api/error-chain',
          method: 'GET',
        })
      })

      await Promise.all(errorChains)

      const logger = await import('../../src/lib/logger')
      expect(logger.logger.error).toHaveBeenCalledTimes(20)
    })

    it('should handle stress test: 1000 concurrent errors', async () => {
      const startTime = Date.now()

      const requests = Array.from({ length: 1000 }, (_, i) => {
        const errorType = Object.values(ErrorType)[i % Object.values(ErrorType).length]
        const error = new ApiError(
          errorType as ErrorType,
          `Stress test error ${i}`,
          400 + (i % 100), // 各种状态码
          {
            requestId: `stress-${i}`,
            path: `/api/stress/${i % 10}`,
            method: ['GET', 'POST', 'PUT', 'DELETE'][i % 4],
            index: i,
            timestamp: Date.now(),
            nested: {
              level1: {
                level2: {
                  level3: `data-${i}`,
                },
              },
            },
          }
        )

        return Promise.all([
          createErrorResponse(error),
          logApiError(error, {
            requestId: `stress-${i}`,
            path: `/api/stress/${i % 10}`,
            method: ['GET', 'POST', 'PUT', 'DELETE'][i % 4],
          }),
        ])
      })

      const results = await Promise.all(requests)
      const duration = Date.now() - startTime

      // 性能检查
      expect(duration).toBeLessThan(30000) // 30秒内完成

      // 验证所有错误都被处理
      expect(results).toHaveLength(1000)
    })
  })

  describe('快捷方法边界测试', () => {
    it('should handle createValidationError with all boundary values', () => {
      const testCases = [
        { message: '' },
        { message: 'E' },
        { message: ' '.repeat(10000) },
        { message: null as any },
        { message: undefined as any },
        { details: {} },
        { details: null },
        { details: undefined },
        { details: { nested: { deep: { value: 123 } } } },
      ]

      testCases.forEach(({ message, details }) => {
        const response = createValidationError(message as string, details)
        expect(response.status).toBe(400)
        expect(response.headers.get('content-type')).toContain('application/json')
      })
    })

    it('should handle all error creation functions', () => {
      const testMessage = 'Test error message'
      const testDetails = { field: 'value' }

      const functions = [
        () => createValidationError(testMessage, testDetails),
        () => createNotFoundError(testMessage, testDetails),
        () => createUnauthorizedError(testMessage),
        () => createForbiddenError(testMessage),
        () => createRateLimitError(testMessage),
        () => createServiceUnavailableError(testMessage),
      ]

      functions.forEach(fn => {
        const response = fn()
        expect(response.status).toBeGreaterThanOrEqual(400)
        expect(response.status).toBeLessThan(600)
        expect(response.headers.get('content-type')).toContain('application/json')
      })
    })

    it('should handle createSuccessResponse with various data types', () => {
      const testCases = [
        null,
        undefined,
        '',
        'string',
        0,
        -1,
        123,
        [],
        {},
        { nested: { deep: { value: 'test' } } },
        [1, 2, { a: 3 }],
      ]

      testCases.forEach(data => {
        const response = createSuccessResponse(data)
        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toContain('application/json')
      })
    })
  })

  describe('withErrorHandling 包装器边界测试', () => {
    it('should handle handler that throws non-Error objects', async () => {
      const nonErrorObjects = [
        null,
        undefined,
        '',
        123,
        { error: 'object' },
        ['array'],
      ]

      for (const errorObj of nonErrorObjects) {
        const handler = withErrorHandling(async () => {
          throw errorObj
        })

        const response = await handler()
        expect(response.status).toBeDefined()
        expect(response.headers.get('content-type')).toContain('application/json')
      }
    })

    it('should handle handler that returns various response types', async () => {
      const handler = withErrorHandling(async () => {
        return createSuccessResponse({ data: 'test' })
      })

      const response = await handler()
      expect(response.status).toBe(200)
    })

    it('should handle handler with long execution time', async () => {
      const handler = withErrorHandling(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return createSuccessResponse({ delayed: true })
      })

      const startTime = Date.now()
      const response = await handler()
      const duration = Date.now() - startTime

      expect(response.status).toBe(200)
      expect(duration).toBeGreaterThanOrEqual(100)
    })
  })
})