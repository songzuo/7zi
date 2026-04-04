/**
 * Retry Utility Tests
 * 重试工具测试
 */

import { withRetry, withRetrySync, createRetryableFunction, retry, isRetryableError, DEFAULT_RETRYABLE_ERRORS } from './retry'
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe('Retry Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success')

      const result = await withRetry(operation)

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(1)
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue('success')

      const result = await withRetry(operation, { maxAttempts: 3, initialDelay: 100 })

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(3)
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'))

      const result = await withRetry(operation, { maxAttempts: 3, initialDelay: 100 })

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toBe('Always fails')
      expect(result.attempts).toBe(3)
    })

    it('should use exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue('success')

      const onRetry = jest.fn()
      const result = await withRetry(operation, {
        maxAttempts: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
        onRetry,
      })

      expect(result.success).toBe(true)
      expect(onRetry).toHaveBeenCalledTimes(2)
      expect(onRetry).toHaveBeenNthCalledWith(1, 2, expect.any(Error), 100)
      expect(onRetry).toHaveBeenNthCalledWith(2, 3, expect.any(Error), 200)
    })

    it('should add jitter to delay', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValue('success')

      const onRetry = jest.fn()
      const result = await withRetry(operation, {
        maxAttempts: 2,
        initialDelay: 1000,
        addJitter: true,
        onRetry,
      })

      expect(result.success).toBe(true)
      const delay = onRetry.mock.calls[0][2]
      // Delay should be 1000 ± 300
      expect(delay).toBeGreaterThanOrEqual(1000)
      expect(delay).toBeLessThan(1300)
    })

    it('should call onRetry callback', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValue('success')

      const onRetry = jest.fn()
      await withRetry(operation, { maxAttempts: 2, onRetry })

      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error), expect.any(Number))
    })

    it('should call onComplete callback', async () => {
      const operation = jest.fn()
      const onComplete = jest.fn()

      // Success case
      operation.mockResolvedValue('success')
      await withRetry(operation, { onComplete })

      expect(onComplete).toHaveBeenLastCalledWith(true, 1)

      // Failure case
      onComplete.mockClear()
      operation.mockRejectedValue(new Error('Failed'))
      const result = await withRetry(operation, { onComplete })

      expect(onComplete).toHaveBeenCalledWith(false, 1, expect.any(Error))
    })

    it('should respect custom shouldRetry', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Retryable error'))
        .mockRejectedValueOnce(new Error('Non-retryable error'))

      const shouldRetry = (error: Error, attempt: number) => {
        return attempt === 1 && error.message === 'Retryable error'
      }

      const result = await withRetry(operation, { maxAttempts: 3, shouldRetry })

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(2)
    })

    it('should abort when signal is aborted', async () => {
      const operation = jest.fn().mockImplementation(() => new Promise(() => {}))
      const controller = new AbortController()

      const promise = withRetry(operation, { signal: controller.signal })
      controller.abort()

      await expect(promise).rejects.toThrow('Aborted')
    })

    it('should handle network errors correctly', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success')

      const result = await withRetry(operation, { maxAttempts: 2 })

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(2)
    })
  })

  describe('withRetrySync', () => {
    it('should succeed on first attempt', () => {
      const operation = jest.fn().mockReturnValue('success')

      const result = withRetrySync(operation)

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(1)
    })

    it('should retry on failure and succeed', () => {
      const operation = jest.fn()
        .mockImplementationOnce(() => { throw new Error('Error 1') })
        .mockImplementationOnce(() => { throw new Error('Error 2') })
        .mockReturnValue('success')

      const result = withRetrySync(operation, { maxAttempts: 3, initialDelay: 10 })

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(3)
    })

    it('should fail after max attempts', () => {
      const operation = jest.fn().mockImplementation(() => { throw new Error('Always fails') })

      const result = withRetrySync(operation, { maxAttempts: 3 })

      expect(result.success).toBe(false)
      expect(result.error?.message).toBe('Always fails')
      expect(result.attempts).toBe(3)
    })
  })

  describe('createRetryableFunction', () => {
    it('should create a function that retries', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValue('success')

      const retryableFn = createRetryableFunction(fn, { maxAttempts: 2 })
      const result = await retryableFn()

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('retry decorator', () => {
    it('should retry decorated method', async () => {
      class TestClass {
        @retry({ maxAttempts: 2 })
        async method(): Promise<string> {
          if ((this as any).callCount === 0) {
            (this as any).callCount = 1
            throw new Error('Error')
          }
          return 'success'
        }

        callCount = 0
      }

      const instance = new TestClass()
      const result = await instance.method()

      expect(result).toBe('success')
      expect(instance.callCount).toBe(1)
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
      expect(isRetryableError(new Error('validation failed'), DEFAULT_RETRYABLE_ERRORS)).toBe(false)
      expect(isRetryableError(new ReferenceError('reference'), ['Error'])).toBe(false)
    })
  })
})
