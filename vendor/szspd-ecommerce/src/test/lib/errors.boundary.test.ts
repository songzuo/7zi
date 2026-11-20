/**
 * @fileoverview errors.ts 边界条件测试
 * @description 测试错误处理函数的极端输入、边界值、异常情况
 */
import { describe, it, expect } from 'vitest'
import {
  createAppError,
  formatErrorMessage,
  isNetworkError,
  getErrorCode,
  getUserFriendlyMessage,
  ErrorCodes,
} from '@/lib/errors'

describe('errors - 边界条件测试', () => {
  // ==================== createAppError 边界测试 ====================
  describe('createAppError 边界条件', () => {
    it('处理空字符串消息', () => {
      const error = createAppError('')
      expect(error.message).toBe('')
      expect(error).toBeInstanceOf(Error)
    })

    it('处理超长消息', () => {
      const longMessage = 'a'.repeat(10000)
      const error = createAppError(longMessage)
      expect(error.message).toBe(longMessage)
    })

    it('处理包含特殊字符的消息', () => {
      const specialMessage = '错误：\n\t包含"引号"和\'单引号\'🎉emoji'
      const error = createAppError(specialMessage)
      expect(error.message).toBe(specialMessage)
    })

    it('处理 Unicode 消息', () => {
      const unicodeMessage = '错误消息 العربية 日本語 한국어'
      const error = createAppError(unicodeMessage)
      expect(error.message).toBe(unicodeMessage)
    })

    it('处理空字符串 code', () => {
      const error = createAppError('Test', '')
      expect(error.code).toBe('')
    })

    it('处理特殊字符 code', () => {
      const error = createAppError('Test', 'CODE_WITH-特殊_🎉')
      expect(error.code).toBe('CODE_WITH-特殊_🎉')
    })

    it('处理 0 状态码', () => {
      const error = createAppError('Test', 'CODE', 0)
      expect(error.statusCode).toBe(0)
    })

    it('处理负数状态码', () => {
      const error = createAppError('Test', 'CODE', -1)
      expect(error.statusCode).toBe(-1)
    })

    it('处理非标准 HTTP 状态码', () => {
      const error = createAppError('Test', 'CODE', 999)
      expect(error.statusCode).toBe(999)
    })

    it('处理极大状态码', () => {
      const error = createAppError('Test', 'CODE', Number.MAX_SAFE_INTEGER)
      expect(error.statusCode).toBe(Number.MAX_SAFE_INTEGER)
    })

    it('正确设置 Error 的 name 属性', () => {
      const error = createAppError('Test')
      expect(error.name).toBe('Error')
    })

    it('正确设置 stack 属性', () => {
      const error = createAppError('Test')
      expect(error.stack).toBeDefined()
    })
  })

  // ==================== formatErrorMessage 边界测试 ====================
  describe('formatErrorMessage 边界条件', () => {
    it('处理 Error 实例', () => {
      const error = new Error('Test error')
      expect(formatErrorMessage(error)).toBe('Test error')
    })

    it('处理 TypeError', () => {
      const error = new TypeError('Type error')
      expect(formatErrorMessage(error)).toBe('Type error')
    })

    it('处理 RangeError', () => {
      const error = new RangeError('Range error')
      expect(formatErrorMessage(error)).toBe('Range error')
    })

    it('处理 SyntaxError', () => {
      const error = new SyntaxError('Syntax error')
      expect(formatErrorMessage(error)).toBe('Syntax error')
    })

    it('处理自定义 Error 类', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'CustomError'
        }
      }
      const error = new CustomError('Custom error')
      expect(formatErrorMessage(error)).toBe('Custom error')
    })

    it('处理字符串', () => {
      expect(formatErrorMessage('String error')).toBe('String error')
    })

    it('处理空字符串', () => {
      expect(formatErrorMessage('')).toBe('')
    })

    it('处理包含特殊字符的字符串', () => {
      expect(formatErrorMessage('错误\n\t消息')).toBe('错误\n\t消息')
    })

    it('处理 null', () => {
      expect(formatErrorMessage(null)).toBe('发生未知错误')
    })

    it('处理 undefined', () => {
      expect(formatErrorMessage(undefined)).toBe('发生未知错误')
    })

    it('处理数字', () => {
      expect(formatErrorMessage(123)).toBe('发生未知错误')
    })

    it('处理 0', () => {
      expect(formatErrorMessage(0)).toBe('发生未知错误')
    })

    it('处理 NaN', () => {
      expect(formatErrorMessage(NaN)).toBe('发生未知错误')
    })

    it('处理 Infinity', () => {
      expect(formatErrorMessage(Infinity)).toBe('发生未知错误')
    })

    it('处理布尔值', () => {
      expect(formatErrorMessage(true)).toBe('发生未知错误')
      expect(formatErrorMessage(false)).toBe('发生未知错误')
    })

    it('处理对象', () => {
      expect(formatErrorMessage({ message: 'test' })).toBe('发生未知错误')
    })

    it('处理数组', () => {
      expect(formatErrorMessage(['error1', 'error2'])).toBe('发生未知错误')
    })

    it('处理函数', () => {
      expect(formatErrorMessage(() => 'error')).toBe('发生未知错误')
    })

    it('处理 Symbol', () => {
      expect(formatErrorMessage(Symbol('error'))).toBe('发生未知错误')
    })

    it('处理 BigInt', () => {
      expect(formatErrorMessage(BigInt(123))).toBe('发生未知错误')
    })
  })

  // ==================== isNetworkError 边界测试 ====================
  describe('isNetworkError 边界条件', () => {
    describe('检测 network 关键词', () => {
      it('检测小写 "network"', () => {
        expect(isNetworkError(new Error('network error'))).toBe(true)
      })

      it('检测大写 "NETWORK"', () => {
        expect(isNetworkError(new Error('NETWORK ERROR'))).toBe(true)
      })

      it('检测混合大小写 "Network"', () => {
        expect(isNetworkError(new Error('Network Error'))).toBe(true)
      })

      it('检测消息中间的 "network"', () => {
        expect(isNetworkError(new Error('A network failure occurred'))).toBe(true)
      })
    })

    describe('检测 fetch 关键词', () => {
      it('检测 "fetch"', () => {
        expect(isNetworkError(new Error('fetch failed'))).toBe(true)
      })

      it('检测 "FETCH"', () => {
        expect(isNetworkError(new Error('FETCH ERROR'))).toBe(true)
      })
    })

    describe('检测 timeout 关键词', () => {
      it('检测 "timeout"', () => {
        expect(isNetworkError(new Error('Request timeout'))).toBe(true)
      })

      it('检测 "TIMEOUT"', () => {
        expect(isNetworkError(new Error('REQUEST TIMEOUT'))).toBe(true)
      })
    })

    describe('检测 abort 关键词', () => {
      it('检测 "abort"', () => {
        expect(isNetworkError(new Error('Request aborted'))).toBe(true)
      })

      it('检测 "ABORT"', () => {
        expect(isNetworkError(new Error('REQUEST ABORTED'))).toBe(true)
      })
    })

    describe('非网络错误', () => {
      it('不检测 "net"（部分匹配）', () => {
        expect(isNetworkError(new Error('net result'))).toBe(false)
      })

      it('不检测其他类型错误', () => {
        expect(isNetworkError(new Error('Syntax error'))).toBe(false)
        expect(isNetworkError(new Error('Type error'))).toBe(false)
        expect(isNetworkError(new Error('Reference error'))).toBe(false)
      })

      it('处理空消息错误', () => {
        expect(isNetworkError(new Error(''))).toBe(false)
      })
    })

    describe('非 Error 类型', () => {
      it('处理字符串', () => {
        expect(isNetworkError('network error')).toBe(false)
      })

      it('处理 null', () => {
        expect(isNetworkError(null)).toBe(false)
      })

      it('处理 undefined', () => {
        expect(isNetworkError(undefined)).toBe(false)
      })

      it('处理对象', () => {
        expect(isNetworkError({ message: 'network error' })).toBe(false)
      })
    })
  })

  // ==================== getErrorCode 边界测试 ====================
  describe('getErrorCode 边界条件', () => {
    describe('从 AppError 获取 code', () => {
      it('返回预设的 code', () => {
        const error = createAppError('Test', 'CUSTOM_CODE')
        expect(getErrorCode(error)).toBe('CUSTOM_CODE')
      })

      it('空字符串 code', () => {
        const error = createAppError('Test', '')
        // 空字符串 code 会被视为 falsy，继续检查其他条件
        expect(getErrorCode(error)).toBe(ErrorCodes.UNKNOWN)
      })
    })

    describe('网络错误检测', () => {
      it('检测网络错误并返回 NETWORK_ERROR', () => {
        const error = new Error('network failed')
        expect(getErrorCode(error)).toBe(ErrorCodes.NETWORK_ERROR)
      })

      it('网络错误优先于 statusCode', () => {
        const error = createAppError('network failed', undefined, 404)
        expect(getErrorCode(error)).toBe(ErrorCodes.NETWORK_ERROR)
      })
    })

    describe('状态码映射', () => {
      it('401 映射到 UNAUTHORIZED', () => {
        const error = createAppError('Unauthorized', undefined, 401)
        expect(getErrorCode(error)).toBe(ErrorCodes.UNAUTHORIZED)
      })

      it('403 映射到 FORBIDDEN', () => {
        const error = createAppError('Forbidden', undefined, 403)
        expect(getErrorCode(error)).toBe(ErrorCodes.FORBIDDEN)
      })

      it('404 映射到 NOT_FOUND', () => {
        const error = createAppError('Not found', undefined, 404)
        expect(getErrorCode(error)).toBe(ErrorCodes.NOT_FOUND)
      })

      it('500 映射到 SERVER_ERROR', () => {
        const error = createAppError('Server error', undefined, 500)
        expect(getErrorCode(error)).toBe(ErrorCodes.SERVER_ERROR)
      })

      it('502 映射到 SERVER_ERROR', () => {
        const error = createAppError('Bad gateway', undefined, 502)
        expect(getErrorCode(error)).toBe(ErrorCodes.SERVER_ERROR)
      })

      it('503 映射到 SERVER_ERROR', () => {
        const error = createAppError('Service unavailable', undefined, 503)
        expect(getErrorCode(error)).toBe(ErrorCodes.SERVER_ERROR)
      })

      it('504 映射到 SERVER_ERROR', () => {
        const error = createAppError('Gateway Service Error', undefined, 504)
        expect(getErrorCode(error)).toBe(ErrorCodes.SERVER_ERROR)
      })

      it('其他状态码返回 UNKNOWN', () => {
        const error400 = createAppError('Bad request', undefined, 400)
        expect(getErrorCode(error400)).toBe(ErrorCodes.UNKNOWN)

        const error418 = createAppError("I'm a teapot", undefined, 418)
        expect(getErrorCode(error418)).toBe(ErrorCodes.UNKNOWN)

        const error499 = createAppError('Client closed', undefined, 499)
        expect(getErrorCode(error499)).toBe(ErrorCodes.UNKNOWN)
      })

      it('0 状态码返回 UNKNOWN', () => {
        const error = createAppError('Test', undefined, 0)
        expect(getErrorCode(error)).toBe(ErrorCodes.UNKNOWN)
      })

      it('负数状态码返回 UNKNOWN', () => {
        const error = createAppError('Test', undefined, -1)
        expect(getErrorCode(error)).toBe(ErrorCodes.UNKNOWN)
      })
    })

    describe('code 优先级高于 statusCode', () => {
      it('有 code 时忽略 statusCode', () => {
        const error = createAppError('Test', 'CUSTOM_CODE', 404)
        expect(getErrorCode(error)).toBe('CUSTOM_CODE')
      })
    })

    describe('非 Error 类型', () => {
      it('null 返回 UNKNOWN', () => {
        expect(getErrorCode(null)).toBe(ErrorCodes.UNKNOWN)
      })

      it('undefined 返回 UNKNOWN', () => {
        expect(getErrorCode(undefined)).toBe(ErrorCodes.UNKNOWN)
      })

      it('字符串返回 UNKNOWN', () => {
        expect(getErrorCode('error')).toBe(ErrorCodes.UNKNOWN)
      })

      it('数字返回 UNKNOWN', () => {
        expect(getErrorCode(404)).toBe(ErrorCodes.UNKNOWN)
      })

      it('对象返回 UNKNOWN', () => {
        expect(getErrorCode({ message: 'error' })).toBe(ErrorCodes.UNKNOWN)
      })
    })
  })

  // ==================== getUserFriendlyMessage 边界测试 ====================
  describe('getUserFriendlyMessage 边界条件', () => {
    it('NOT_FOUND 返回正确消息', () => {
      expect(getUserFriendlyMessage(ErrorCodes.NOT_FOUND)).toBe('您请求的资源不存在')
    })

    it('UNAUTHORIZED 返回正确消息', () => {
      expect(getUserFriendlyMessage(ErrorCodes.UNAUTHORIZED)).toBe('您需要登录才能访问此资源')
    })

    it('FORBIDDEN 返回正确消息', () => {
      expect(getUserFriendlyMessage(ErrorCodes.FORBIDDEN)).toBe('您没有权限访问此资源')
    })

    it('VALIDATION_ERROR 返回正确消息', () => {
      expect(getUserFriendlyMessage(ErrorCodes.VALIDATION_ERROR)).toBe('您提交的数据格式不正确')
    })

    it('NETWORK_ERROR 返回正确消息', () => {
      expect(getUserFriendlyMessage(ErrorCodes.NETWORK_ERROR)).toBe(
        '网络连接失败，请检查您的网络设置'
      )
    })

    it('SERVER_ERROR 返回正确消息', () => {
      expect(getUserFriendlyMessage(ErrorCodes.SERVER_ERROR)).toBe(
        '服务器暂时无法处理您的请求，请稍后重试'
      )
    })

    it('UNKNOWN 返回默认消息', () => {
      expect(getUserFriendlyMessage(ErrorCodes.UNKNOWN)).toBe('发生未知错误，请稍后重试')
    })

    it('空字符串返回默认消息', () => {
      expect(getUserFriendlyMessage('')).toBe('发生未知错误，请稍后重试')
    })

    it('未知 code 返回默认消息', () => {
      expect(getUserFriendlyMessage('CUSTOM_CODE')).toBe('发生未知错误，请稍后重试')
    })

    it('特殊字符 code 返回默认消息', () => {
      expect(getUserFriendlyMessage('CODE_🎉')).toBe('发生未知错误，请稍后重试')
    })

    it('数字 code 返回默认消息', () => {
      // @ts-expect-error - 测试运行时行为
      expect(getUserFriendlyMessage(404)).toBe('发生未知错误，请稍后重试')
    })

    it('null code 返回默认消息', () => {
      // @ts-expect-error - 测试运行时行为
      expect(getUserFriendlyMessage(null)).toBe('发生未知错误，请稍后重试')
    })

    it('undefined code 返回默认消息', () => {
      // @ts-expect-error - 测试运行时行为
      expect(getUserFriendlyMessage(undefined)).toBe('发生未知错误，请稍后重试')
    })
  })

  // ==================== ErrorCodes 常量测试 ====================
  describe('ErrorCodes 常量', () => {
    it('所有值都是字符串', () => {
      Object.values(ErrorCodes).forEach(code => {
        expect(typeof code).toBe('string')
      })
    })

    it('所有值都是唯一的', () => {
      const values = Object.values(ErrorCodes)
      const uniqueValues = new Set(values)
      expect(uniqueValues.size).toBe(values.length)
    })

    it('包含所有预期的 code', () => {
      expect(ErrorCodes).toHaveProperty('NOT_FOUND')
      expect(ErrorCodes).toHaveProperty('UNAUTHORIZED')
      expect(ErrorCodes).toHaveProperty('FORBIDDEN')
      expect(ErrorCodes).toHaveProperty('VALIDATION_ERROR')
      expect(ErrorCodes).toHaveProperty('NETWORK_ERROR')
      expect(ErrorCodes).toHaveProperty('SERVER_ERROR')
      expect(ErrorCodes).toHaveProperty('UNKNOWN')
    })
  })

  // ==================== 综合边界场景 ====================
  describe('综合边界场景', () => {
    it('完整的错误处理流程', () => {
      const error = createAppError('Resource not found', ErrorCodes.NOT_FOUND, 404)
      const formatted = formatErrorMessage(error)
      const code = getErrorCode(error)
      const friendly = getUserFriendlyMessage(code)

      expect(formatted).toBe('Resource not found')
      expect(code).toBe(ErrorCodes.NOT_FOUND)
      expect(friendly).toBe('您请求的资源不存在')
    })

    it('网络错误的完整处理流程', () => {
      const error = new Error('Network request failed')
      const code = getErrorCode(error)
      const friendly = getUserFriendlyMessage(code)

      expect(isNetworkError(error)).toBe(true)
      expect(code).toBe(ErrorCodes.NETWORK_ERROR)
      expect(friendly).toBe('网络连接失败，请检查您的网络设置')
    })

    it('未知错误的完整处理流程', () => {
      const code = getErrorCode(null)
      const friendly = getUserFriendlyMessage(code)
      const formatted = formatErrorMessage(null)

      expect(code).toBe(ErrorCodes.UNKNOWN)
      expect(friendly).toBe('发生未知错误，请稍后重试')
      expect(formatted).toBe('发生未知错误')
    })

    it('自定义 code 的错误处理', () => {
      const error = createAppError('Custom business error', 'BUSINESS_ERROR', 422)

      expect(error.code).toBe('BUSINESS_ERROR')
      expect(error.statusCode).toBe(422)
      expect(getErrorCode(error)).toBe('BUSINESS_ERROR')
      // 自定义 code 没有友好消息，返回默认
      expect(getUserFriendlyMessage('BUSINESS_ERROR')).toBe('发生未知错误，请稍后重试')
    })
  })
})
