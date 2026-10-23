/**
 * Retry Utility Tests
 * 重试工具测试
 *
 * ⚠️ 关于计时：
 * 被测实现 `sleep()` 用的是**真实 `setTimeout`**。若在这里开 `vi.useFakeTimers()`，
 * 假时钟会冻结 `setTimeout`，而测试又是直接 `await withRetry(...)`（不推进时钟），
 * 于是每个用例都会挂到 testTimeout（12s）—— 这正是历史上该文件跑满 246s 的原因。
 *
 * 因此本文件**改用真实时钟 + 极小的 initialDelay**（10~100ms），
 * 既保持生产代码语义不变，又让整文件在秒级内跑完。
 * 凡是断言「退避时长」的用例，一律关闭 jitter 以保证确定性。
 */

import { withRetry, withRetrySync, createRetryableFunction, retry, isRetryableError, DEFAULT_RETRYABLE_ERRORS } from '../retry'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger
// 注意路径：测试文件在 src/lib/error-reporting/__tests__/ 下，
// 而 retry.ts 里 `import { logger } from '../logger'` 指向的是 src/lib/logger.ts。
// 原先这里写 '../logger'（解析到 src/lib/error-reporting/logger，不存在），
// 导致 mock 落空、真实 logger 往控制台刷日志。
vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Retry Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      const result = await withRetry(operation)

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(1)
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue('success')

      const result = await withRetry(operation, { maxAttempts: 3, initialDelay: 10 })

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(3)
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should fail after max attempts', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'))

      const result = await withRetry(operation, { maxAttempts: 3, initialDelay: 10 })

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toBe('Always fails')
      expect(result.attempts).toBe(3)
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should use exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue('success')

      const onRetry = vi.fn()
      const result = await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
        addJitter: false,
        onRetry,
      })

      expect(result.success).toBe(true)
      expect(onRetry).toHaveBeenCalledTimes(2)
      // onRetry 的 attempt = **刚刚失败的那次尝试的序号**（1-based），
      // 与 async-retry 等库的约定一致，也与 onComplete(success, attempts) 保持一致。
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error), 100)
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error), 200)
    })

    it('should cap delay at maxDelay', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue('success')

      const onRetry = vi.fn()
      await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 100,
        backoffMultiplier: 10,
        maxDelay: 150,
        addJitter: false,
        onRetry,
      })

      // 第一次退避 100ms，第二次应为 min(100 * 10^1, 150) = 150ms（被 maxDelay 截断）
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error), 150)
    })

    it('should add jitter to delay', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValue('success')

      const onRetry = vi.fn()
      const result = await withRetry(operation, {
        maxAttempts: 2,
        initialDelay: 1000,
        addJitter: true,
        onRetry,
      })

      expect(result.success).toBe(true)
      const delay = onRetry.mock.calls[0][2]
      // Delay should be 1000 ~ 1300 (+30% jitter)
      expect(delay).toBeGreaterThanOrEqual(1000)
      expect(delay).toBeLessThan(1300)
    })

    it('should call onRetry callback', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValue('success')

      const onRetry = vi.fn()
      await withRetry(operation, { maxAttempts: 2, initialDelay: 10, onRetry })

      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Number))
    })

    it('should call onComplete callback', async () => {
      const operation = vi.fn()
      const onComplete = vi.fn()

      // Success case
      operation.mockResolvedValue('success')
      await withRetry(operation, { onComplete })

      expect(onComplete).toHaveBeenLastCalledWith(true, 1)

      // Failure case —— onComplete 收到的是**实际发生的尝试次数**
      onComplete.mockClear()
      operation.mockRejectedValue(new Error('Failed'))
      const result = await withRetry(operation, { maxAttempts: 3, initialDelay: 10, onComplete })

      expect(result.success).toBe(false)
      expect(onComplete).toHaveBeenCalledWith(false, 3, expect.any(Error))
    })

    it('should respect custom shouldRetry', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Retryable error'))
        .mockRejectedValueOnce(new Error('Non-retryable error'))

      const shouldRetry = (error: Error, attempt: number) => {
        return attempt === 1 && error.message === 'Retryable error'
      }

      const result = await withRetry(operation, { maxAttempts: 3, initialDelay: 10, shouldRetry })

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(2)
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should let custom shouldRetry override the default retryable rules', async () => {
      // 回归用例：自定义 shouldRetry 必须**独占**判定权。
      // 若实现写成 `shouldRetry(...) || isRetryableError(...)`，那么 shouldRetry
      // 返回 false 时会被默认规则（'Error' 在 DEFAULT_RETRYABLE_ERRORS 里）覆盖，
      // 导致「自定义为不可重试」彻底失效。
      const operation = vi.fn().mockRejectedValue(new Error('validation failed'))

      const result = await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 10,
        shouldRetry: () => false,
      })

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(1)
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should abort when signal is aborted', async () => {
      const operation = vi.fn().mockImplementation(() => new Promise(() => {}))
      const controller = new AbortController()

      const promise = withRetry(operation, { signal: controller.signal })
      controller.abort()

      await expect(promise).rejects.toThrow('Aborted')
    })

    it('should handle network errors correctly', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success')

      const result = await withRetry(operation, { maxAttempts: 2, initialDelay: 10 })

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(2)
    })
  })

  describe('withRetrySync', () => {
    it('should succeed on first attempt', () => {
      const operation = vi.fn().mockReturnValue('success')

      const result = withRetrySync(operation)

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(1)
    })

    it('should retry on failure and succeed', () => {
      const operation = vi.fn()
        .mockImplementationOnce(() => { throw new Error('Error 1') })
        .mockImplementationOnce(() => { throw new Error('Error 2') })
        .mockReturnValue('success')

      const result = withRetrySync(operation, { maxAttempts: 3, initialDelay: 10 })

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(3)
    })

    it('should fail after max attempts', () => {
      const operation = vi.fn().mockImplementation(() => { throw new Error('Always fails') })

      const result = withRetrySync(operation, { maxAttempts: 3, initialDelay: 10 })

      expect(result.success).toBe(false)
      expect(result.error?.message).toBe('Always fails')
      expect(result.attempts).toBe(3)
    })

    it('should let custom shouldRetry override the default retryable rules', () => {
      const operation = vi.fn().mockImplementation(() => { throw new Error('validation failed') })

      const result = withRetrySync(operation, {
        maxAttempts: 3,
        initialDelay: 10,
        shouldRetry: () => false,
      })

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(1)
    })
  })

  describe('createRetryableFunction', () => {
    it('should create a function that retries', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValue('success')

      const retryableFn = createRetryableFunction(fn, { maxAttempts: 2, initialDelay: 10 })
      const result = await retryableFn()

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('retry decorator', () => {
    it('should retry decorated method and keep its return type', async () => {
      class TestClass {
        @retry({ maxAttempts: 2, initialDelay: 10 })
        async method(): Promise<string> {
          if ((this as unknown as { callCount: number }).callCount === 0) {
            ;(this as unknown as { callCount: number }).callCount = 1
            throw new Error('Error')
          }
          return 'success'
        }

        callCount = 0
      }

      const instance = new TestClass()
      const result = await instance.method()

      // 装饰后的方法返回**原方法的返回值**，而不是内部的 RetryResult
      expect(result).toBe('success')
      expect(instance.callCount).toBe(1)
    })

    it('should throw the last error when decorated method ultimately fails', async () => {
      class TestClass {
        @retry({ maxAttempts: 2, initialDelay: 10 })
        async method(): Promise<string> {
          throw new Error('Always fails')
        }
      }

      const instance = new TestClass()

      await expect(instance.method()).rejects.toThrow('Always fails')
    })
  })

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      expect(isRetryableError(new Error('timeout'), DEFAULT_RETRYABLE_ERRORS)).toBe(true)
      expect(isRetryableError(new TypeError('type error'), DEFAULT_RETRYABLE_ERRORS)).toBe(true)
      expect(isRetryableError(new RangeError('range error'), DEFAULT_RETRYABLE_ERRORS)).toBe(true)
      expect(isRetryableError(new Error('network'), DEFAULT_RETRYABLE_ERRORS)).toBe(true)
      expect(isRetryableError(new Error('ECONNRESET'), DEFAULT_RETRYABLE_ERRORS)).toBe(true)
    })

    it('should identify non-retryable errors', () => {
      // 默认列表里含 'Error'，所以普通 Error 默认**可重试**（这是 by-design 的
      // 「默认重试一切」策略）；要收窄范围需传自定义列表或提供 shouldRetry。
      expect(isRetryableError(new Error('validation failed'), ['TypeError'])).toBe(false)
      expect(isRetryableError(new ReferenceError('reference'), ['Error'])).toBe(false)
      expect(isRetryableError(new Error('validation failed'), ['TypeError', 'FetchError'])).toBe(false)
    })
  })
})
