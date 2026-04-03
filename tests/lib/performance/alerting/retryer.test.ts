/**
 * Retryer Unit Tests
 * Tests for retry with exponential backoff
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ========================================
// Types (matching design document)
// ========================================

interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
}

// ========================================
// Retryer Implementation (for testing)
// ========================================

class Retryer {
  private config: RetryConfig

  constructor(config: RetryConfig) {
    this.config = config
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        if (attempt < this.config.maxAttempts) {
          const delay = Math.min(
            this.config.baseDelayMs * Math.pow(2, attempt - 1),
            this.config.maxDelayMs
          )
          await this.sleep(delay)
        }
      }
    }

    throw lastError
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ========================================
// Tests
// ========================================

describe('Retryer', () => {
  let retryer: Retryer

  describe('successful execution', () => {
    beforeEach(() => {
      retryer = new Retryer({
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
      })
    })

    it('should return result immediately on success', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      
      const result = await retryer.execute(fn)
      
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should not retry on success', async () => {
      const fn = vi.fn().mockResolvedValue('done')
      
      await retryer.execute(fn)
      
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should pass through any type of result', async () => {
      const objectResult = { id: 1, name: 'test' }
      const fn = vi.fn().mockResolvedValue(objectResult)
      
      const result = await retryer.execute(fn)
      
      expect(result).toEqual(objectResult)
    })

    it('should pass through null result', async () => {
      const fn = vi.fn().mockResolvedValue(null)
      
      const result = await retryer.execute(fn)
      
      expect(result).toBeNull()
    })

    it('should pass through undefined result', async () => {
      const fn = vi.fn().mockResolvedValue(undefined)
      
      const result = await retryer.execute(fn)
      
      expect(result).toBeUndefined()
    })
  })

  describe('retry on failure', () => {
    beforeEach(() => {
      retryer = new Retryer({
        maxAttempts: 3,
        baseDelayMs: 10,  // Fast for tests
        maxDelayMs: 100,
      })
    })

    it('should retry on failure and succeed', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success on third')
      
      const result = await retryer.execute(fn)
      
      expect(result).toBe('success on third')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should retry specified number of times', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Always fails'))
      
      await expect(retryer.execute(fn)).rejects.toThrow('Always fails')
      
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should throw the last error after all retries', async () => {
      const errors = [
        new Error('Error 1'),
        new Error('Error 2'),
        new Error('Error 3'),
      ]
      const fn = vi.fn()
        .mockRejectedValueOnce(errors[0])
        .mockRejectedValueOnce(errors[1])
        .mockRejectedValueOnce(errors[2])
      
      await expect(retryer.execute(fn)).rejects.toThrow('Error 3')
    })
  })

  describe('exponential backoff', () => {
    it('should use exponential backoff delay', async () => {
      retryer = new Retryer({
        maxAttempts: 4,
        baseDelayMs: 100,
        maxDelayMs: 10000,
      })
      
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockRejectedValueOnce(new Error('Fail 3'))
        .mockResolvedValue('success')
      
      const startTime = Date.now()
      await retryer.execute(fn)
      const elapsed = Date.now() - startTime
      
      // Expected delays: 100ms (2^0 * 100) + 200ms (2^1 * 100) + 400ms (2^2 * 100) = 700ms
      // Allow some margin for test execution
      expect(elapsed).toBeGreaterThanOrEqual(600)
      expect(fn).toHaveBeenCalledTimes(4)
    })

    it('should respect maxDelayMs', async () => {
      retryer = new Retryer({
        maxAttempts: 5,
        baseDelayMs: 100,
        maxDelayMs: 300,  // Cap at 300ms
      })
      
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockRejectedValueOnce(new Error('Fail 3'))
        .mockRejectedValueOnce(new Error('Fail 4'))
        .mockResolvedValue('success')
      
      const startTime = Date.now()
      await retryer.execute(fn)
      const elapsed = Date.now() - startTime
      
      // Delays: 100, 200, 300 (capped from 400), 300 (capped from 800)
      // Total: ~900ms (allowing margin)
      expect(elapsed).toBeLessThan(1500)  // Should not exceed max delays
      expect(fn).toHaveBeenCalledTimes(5)
    })

    it('should use baseDelayMs as minimum delay', async () => {
      retryer = new Retryer({
        maxAttempts: 2,
        baseDelayMs: 50,
        maxDelayMs: 1000,
      })
      
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success')
      
      const startTime = Date.now()
      await retryer.execute(fn)
      const elapsed = Date.now() - startTime
      
      // First retry delay should be at least baseDelayMs
      expect(elapsed).toBeGreaterThanOrEqual(40)  // Allow some margin
    })
  })

  describe('maxAttempts configuration', () => {
    it('should respect maxAttempts = 1', async () => {
      retryer = new Retryer({
        maxAttempts: 1,
        baseDelayMs: 10,
        maxDelayMs: 100,
      })
      
      const fn = vi.fn().mockRejectedValue(new Error('Fail'))
      
      await expect(retryer.execute(fn)).rejects.toThrow('Fail')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should respect maxAttempts = 5', async () => {
      retryer = new Retryer({
        maxAttempts: 5,
        baseDelayMs: 10,
        maxDelayMs: 100,
      })
      
      const fn = vi.fn().mockRejectedValue(new Error('Fail'))
      
      await expect(retryer.execute(fn)).rejects.toThrow('Fail')
      expect(fn).toHaveBeenCalledTimes(5)
    })

    it('should succeed on the last attempt', async () => {
      retryer = new Retryer({
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
      })
      
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success')
      
      const result = await retryer.execute(fn)
      
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      retryer = new Retryer({
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
      })
    })

    it('should preserve error type', async () => {
      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message)
          this.name = 'CustomError'
        }
      }
      
      const fn = vi.fn().mockRejectedValue(new CustomError('Custom error', 'ERR_001'))
      
      try {
        await retryer.execute(fn)
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as CustomError).code).toBe('ERR_001')
      }
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network error')
      ;(networkError as any).code = 'ENETUNREACH'
      
      const fn = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success')
      
      const result = await retryer.execute(fn)
      
      expect(result).toBe('success')
    })

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Timeout')
      ;(timeoutError as any).code = 'ETIMEDOUT'
      
      const fn = vi.fn()
        .mockRejectedValueOnce(timeoutError)
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValue('success')
      
      const result = await retryer.execute(fn)
      
      expect(result).toBe('success')
    })
  })

  describe('edge cases', () => {
    it('should handle maxAttempts = 0', async () => {
      retryer = new Retryer({
        maxAttempts: 0,
        baseDelayMs: 10,
        maxDelayMs: 100,
      })
      
      const fn = vi.fn().mockResolvedValue('success')
      
      // With 0 attempts, it should not execute
      await expect(retryer.execute(fn)).rejects.toBeUndefined()
      expect(fn).toHaveBeenCalledTimes(0)
    })

    it('should handle synchronous function that returns promise', async () => {
      retryer = new Retryer({
        maxAttempts: 2,
        baseDelayMs: 10,
        maxDelayMs: 100,
      })
      
      let callCount = 0
      const fn = async () => {
        callCount++
        if (callCount === 1) throw new Error('Fail')
        return 'success'
      }
      
      const result = await retryer.execute(fn)
      
      expect(result).toBe('success')
    })

    it('should handle very large baseDelayMs with small maxAttempts', async () => {
      retryer = new Retryer({
        maxAttempts: 2,
        baseDelayMs: 1000,
        maxDelayMs: 2000,
      })
      
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success')
      
      const startTime = Date.now()
      await retryer.execute(fn)
      const elapsed = Date.now() - startTime
      
      // Should wait at least baseDelayMs (1000ms)
      expect(elapsed).toBeGreaterThanOrEqual(900)
    })
  })

  describe('real-world scenarios', () => {
    it('should handle Slack webhook temporary failure', async () => {
      retryer = new Retryer({
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 5000,
      })
      
      // Simulate 503 then success
      const mockFetch = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Service Unavailable'), { status: 503 }))
        .mockResolvedValue({ ok: true })
      
      const sendToSlack = async () => {
        const response = await mockFetch()
        if (!response.ok) throw new Error('Failed')
        return response
      }
      
      const result = await retryer.execute(sendToSlack)
      
      expect(result.ok).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle rate limiting with retry', async () => {
      retryer = new Retryer({
        maxAttempts: 4,
        baseDelayMs: 50,
        maxDelayMs: 500,
      })
      
      const mockApi = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('Rate limited'), { status: 429 }))
        .mockRejectedValueOnce(Object.assign(new Error('Rate limited'), { status: 429 }))
        .mockResolvedValue({ success: true })
      
      const callApi = async () => {
        const response = await mockApi()
        if (response.status === 429) throw new Error('Rate limited')
        return response
      }
      
      const result = await retryer.execute(callApi)
      
      expect(result.success).toBe(true)
      expect(mockApi).toHaveBeenCalledTimes(3)
    })
  })
})
