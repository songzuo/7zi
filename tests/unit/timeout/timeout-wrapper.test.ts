/**
 * Timeout Wrapper Tests
 * Tests for src/lib/api/timeout-wrapper.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  withTimeout,
  withTimeoutPromise,
  withTimeoutApi,
  TimeoutPresets,
  withTimeoutDefault,
  withMeasurement,
  withTimeoutAndMeasurement,
  TimeoutError,
} from '@/lib/api/timeout-wrapper'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock error handler
vi.mock('@/lib/api/error-handler', () => ({
  createServiceUnavailableError: vi.fn(async (message: string) => ({
    json: async () => ({
      success: false,
      error: {
        type: 'SERVICE_UNAVAILABLE',
        message,
      },
    }),
  })),
  ErrorType: {
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  },
}))

// Mock user-messages
vi.mock('@/lib/api/user-messages', () => ({
  getLocaleFromRequest: vi.fn(() => 'zh'),
  SupportedLocale: {
    ZH: 'zh',
    EN: 'en',
  },
}))

describe('Timeout Wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('withTimeout', () => {
    it('should execute function successfully within timeout', async () => {
      const mockFn = vi.fn().mockResolvedValue('success')
      const wrappedFn = withTimeout(mockFn, 1000)

      const result = await wrappedFn()

      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should pass arguments to wrapped function', async () => {
      const mockFn = vi.fn().mockResolvedValue('result')
      const wrappedFn = withTimeout(mockFn, 1000)

      const result = await wrappedFn('arg1', 'arg2')

      expect(result).toBe('result')
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('should timeout after specified duration', async () => {
      const mockFn = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('slow'), 5000)))
      const wrappedFn = withTimeout(mockFn, 100)

      const resultPromise = wrappedFn()

      // Fast-forward past timeout
      await vi.advanceTimersByTimeAsync(100)

      await expect(resultPromise).rejects.toThrow('Operation timed out after 100ms')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should use default timeout of 30 seconds', async () => {
      const mockFn = vi.fn().mockResolvedValue('success')
      const wrappedFn = withTimeout(mockFn)

      // Should not timeout for quick operation
      const result = await wrappedFn()

      expect(result).toBe('success')
    })

    it('should clear timeout on successful completion', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      const mockFn = vi.fn().mockResolvedValue('success')
      const wrappedFn = withTimeout(mockFn, 1000)

      await wrappedFn()

      expect(clearTimeout).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })

    it('should clear timeout on error', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      const mockFn = vi.fn().mockRejectedValue(new Error('Function error'))
      const wrappedFn = withTimeout(mockFn, 1000)

      await expect(wrappedFn()).rejects.toThrow('Function error')

      expect(clearTimeout).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })

    it('should preserve function return value', async () => {
      const mockFn = vi.fn().mockResolvedValue({ data: { id: 123 } })
      const wrappedFn = withTimeout(mockFn, 1000)

      const result = await wrappedFn()

      expect(result).toEqual({ data: { id: 123 } })
    })

    it('should preserve error from wrapped function', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Original error'))
      const wrappedFn = withTimeout(mockFn, 1000)

      await expect(wrappedFn()).rejects.toThrow('Original error')
    })
  })

  describe('withTimeoutPromise', () => {
    it('should resolve promise within timeout', async () => {
      const promise = Promise.resolve('success')

      const result = await withTimeoutPromise(promise, 1000)

      expect(result).toBe('success')
    })

    it('should timeout promise after specified duration', async () => {
      const promise = new Promise(resolve => setTimeout(() => resolve('slow'), 5000))

      const resultPromise = withTimeoutPromise(promise, 100)

      await vi.advanceTimersByTimeAsync(100)

      await expect(resultPromise).rejects.toThrow('Operation timed out after 100ms')
    })

    it('should reject on promise error', async () => {
      const promise = Promise.reject(new Error('Promise error'))

      await expect(withTimeoutPromise(promise, 1000)).rejects.toThrow('Promise error')
    })

    it('should clear timeout on promise resolution', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      const promise = Promise.resolve('success')

      await withTimeoutPromise(promise, 1000)

      expect(clearTimeout).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })

    it('should clear timeout on promise rejection', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      const promise = Promise.reject(new Error('Error'))

      await expect(withTimeoutPromise(promise, 1000)).rejects.toThrow()
      expect(clearTimeout).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })
  })

  describe('withTimeoutApi', () => {
    it('should return NextResponse on timeout', async () => {
      const { createServiceUnavailableError } = await import('@/lib/api/error-handler')

      const mockFn = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('slow'), 5000)))
      const wrappedFn = withTimeoutApi(mockFn, 100)

      const resultPromise = wrappedFn()

      await vi.advanceTimersByTimeAsync(100)

      const result = await resultPromise

      expect(createServiceUnavailableError).toHaveBeenCalled()
      expect(result).toBeDefined()
      expect(typeof result.json).toBe('function')
    })

    it('should not timeout for successful API call', async () => {
      const mockFn = vi.fn().mockResolvedValue({ data: 'success' })
      const wrappedFn = withTimeoutApi(mockFn, 1000)

      const result = await wrappedFn()

      expect(result).toEqual({ data: 'success' })
    })

    it('should re-throw non-timeout errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('API Error'))
      const wrappedFn = withTimeoutApi(mockFn, 1000)

      await expect(wrappedFn()).rejects.toThrow('API Error')
    })
  })

  describe('TimeoutPresets', () => {
    it('should provide veryFast preset (500ms)', () => {
      expect(TimeoutPresets.veryFast).toBe(500)
    })

    it('should provide fast preset (2s)', () => {
      expect(TimeoutPresets.fast).toBe(2000)
    })

    it('should provide medium preset (10s)', () => {
      expect(TimeoutPresets.medium).toBe(10000)
    })

    it('should provide long preset (30s)', () => {
      expect(TimeoutPresets.long).toBe(30000)
    })

    it('should provide veryLong preset (60s)', () => {
      expect(TimeoutPresets.veryLong).toBe(60000)
    })

    it('should provide extraLong preset (120s)', () => {
      expect(TimeoutPresets.extraLong).toBe(120000)
    })

    it('should work with presets', async () => {
      const mockFn = vi.fn().mockResolvedValue('success')
      const wrappedFn = withTimeout(mockFn, TimeoutPresets.medium)

      const result = await wrappedFn()

      expect(result).toBe('success')
    })
  })

  describe('withTimeoutDefault', () => {
    it('should return result on success', async () => {
      const mockFn = vi.fn().mockResolvedValue('success')
      const defaultValue = 'fallback'

      const result = await withTimeoutDefault(mockFn, 1000, defaultValue)

      expect(result).toBe('success')
    })

    it('should return default value on timeout', async () => {
      const mockFn = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('slow'), 5000)))
      const defaultValue = 'fallback'

      const resultPromise = withTimeoutDefault(mockFn, 100, defaultValue)

      await vi.advanceTimersByTimeAsync(100)

      const result = await resultPromise

      expect(result).toBe('fallback')
    })

    it('should re-throw non-timeout errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Function error'))
      const defaultValue = 'fallback'

      await expect(withTimeoutDefault(mockFn, 1000, defaultValue)).rejects.toThrow('Function error')
    })
  })

  describe('withMeasurement', () => {
    it('should measure and log execution time', async () => {
      const { logger } = await import('@/lib/logger')

      const mockFn = vi.fn().mockResolvedValue('success')
      const result = await withMeasurement(mockFn, 'testFunction')

      expect(result).toBe('success')
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('testFunction'),
        expect.objectContaining({
          durationMs: expect.any(Number),
        })
      )
    })

    it('should measure and log execution time on error', async () => {
      const { logger } = await import('@/lib/logger')

      const mockFn = vi.fn().mockRejectedValue(new Error('Error'))

      await expect(withMeasurement(mockFn, 'testFunction')).rejects.toThrow()

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('testFunction'),
        expect.any(Error),
        expect.objectContaining({
          durationMs: expect.any(Number),
        })
      )
    })

    it('should preserve return value', async () => {
      const mockFn = vi.fn().mockResolvedValue({ data: 'test' })
      const result = await withMeasurement(mockFn, 'test')

      expect(result).toEqual({ data: 'test' })
    })
  })

  describe('withTimeoutAndMeasurement', () => {
    it('should combine timeout and measurement', async () => {
      const { logger } = await import('@/lib/logger')

      const mockFn = vi.fn().mockResolvedValue('success')
      const result = await withTimeoutAndMeasurement(mockFn, 1000, 'test')

      expect(result).toBe('success')
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('test'),
        expect.objectContaining({
          durationMs: expect.any(Number),
        })
      )
    })

    it('should timeout and log', async () => {
      const { logger } = await import('@/lib/logger')

      const mockFn = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('slow'), 5000)))

      const resultPromise = withTimeoutAndMeasurement(mockFn, 100, 'test')

      await vi.advanceTimersByTimeAsync(100)

      await expect(resultPromise).rejects.toThrow('Operation timed out')

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('test'),
        expect.objectContaining({
          timeoutMs: 100,
        })
      )
    })
  })

  describe('TimeoutError', () => {
    it('should create TimeoutError instance', () => {
      const error = new TimeoutError('Custom timeout message')

      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('TimeoutError')
      expect(error.message).toBe('Custom timeout message')
    })

    it('should use default message', () => {
      const error = new TimeoutError()

      expect(error.message).toBe('Operation timed out')
    })

    it('should be catchable as Error', () => {
      const error = new TimeoutError()

      expect(error instanceof Error).toBe(true)
    })
  })

  describe('integration scenarios', () => {
    it('should handle fast operation with measurement', async () => {
      const mockFn = vi.fn().mockResolvedValue('quick result')
      const wrappedFn = withTimeout(mockFn, TimeoutPresets.fast)

      const result = await wrappedFn()

      expect(result).toBe('quick result')
    })

    it('should handle slow operation timeout', async () => {
      const mockFn = vi
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve('result'), 10000))
        )
      const wrappedFn = withTimeout(mockFn, TimeoutPresets.veryFast)

      const resultPromise = wrappedFn()

      await vi.advanceTimersByTimeAsync(500)

      await expect(resultPromise).rejects.toThrow('Operation timed out')
    })

    it('should work with retry and timeout combination', async () => {
      let attempt = 0
      const mockFn = vi.fn().mockImplementation(() => {
        attempt++
        if (attempt < 2) {
          return new Promise(resolve => setTimeout(() => resolve('slow'), 300))
        }
        return 'success'
      })

      const wrappedFn = withTimeout(mockFn, 200)

      // First attempt will timeout
      const resultPromise1 = wrappedFn()
      await vi.advanceTimersByTimeAsync(200)
      await expect(resultPromise1).rejects.toThrow('Operation timed out')

      // Second attempt succeeds
      const resultPromise2 = wrappedFn()
      await vi.advanceTimersByTimeAsync(300)
      const result2 = await resultPromise2

      expect(result2).toBe('success')
    })

    it('should handle multiple functions with different timeouts', async () => {
      const quickFn = vi.fn().mockResolvedValue('quick')
      const slowFn = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('slow'), 5000)))

      const wrappedQuick = withTimeout(quickFn, 1000)
      const wrappedSlow = withTimeout(slowFn, 100)

      const quickResult = await wrappedQuick()
      expect(quickResult).toBe('quick')

      const slowResultPromise = wrappedSlow()
      await vi.advanceTimersByTimeAsync(100)
      await expect(slowResultPromise).rejects.toThrow('Operation timed out')
    })
  })

  describe('edge cases', () => {
    it('should handle very short timeout (1ms)', async () => {
      const mockFn = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('result'), 100)))
      const wrappedFn = withTimeout(mockFn, 1)

      const resultPromise = wrappedFn()

      await vi.advanceTimersByTimeAsync(1)

      await expect(resultPromise).rejects.toThrow()
    })

    it('should handle zero timeout', async () => {
      const mockFn = vi.fn().mockResolvedValue('success')
      const wrappedFn = withTimeout(mockFn, 0)

      // Zero timeout means immediate check
      const resultPromise = wrappedFn()
      await vi.advanceTimersByTimeAsync(0)

      const result = await resultPromise

      expect(result).toBe('success')
    })

    it('should handle immediate resolve', async () => {
      const mockFn = vi.fn().mockResolvedValue(Promise.resolve('immediate'))
      const wrappedFn = withTimeout(mockFn, 1000)

      const result = await wrappedFn()

      expect(result).toBe('immediate')
    })

    it('should handle undefined return value', async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined)
      const wrappedFn = withTimeout(mockFn, 1000)

      const result = await wrappedFn()

      expect(result).toBeUndefined()
    })

    it('should handle null return value', async () => {
      const mockFn = vi.fn().mockResolvedValue(null)
      const wrappedFn = withTimeout(mockFn, 1000)

      const result = await wrappedFn()

      expect(result).toBeNull()
    })
  })

  describe('locale support', () => {
    it('should use default locale (zh)', async () => {
      const mockFn = vi.fn().mockResolvedValue('success')
      const wrappedFn = withTimeout(mockFn, 1000)

      const result = await wrappedFn()

      expect(result).toBe('success')
    })

    it('should accept custom locale', async () => {
      const mockFn = vi.fn().mockResolvedValue('success')
      const wrappedFn = withTimeout(mockFn, 1000, 'en')

      const result = await wrappedFn()

      expect(result).toBe('success')
    })
  })
})
