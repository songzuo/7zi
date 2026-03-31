/**
 * Retry Decorator Tests
 * Tests for src/lib/api/retry-decorator.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  withRetry,
  RetryPresets,
  getRetryInfo,
  type RetryConfig,
} from '@/lib/api/retry-decorator';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Retry Decorator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('withRetry - basic functionality', () => {
    it('should execute function successfully on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const wrappedFn = withRetry(mockFn);

      const result = await wrappedFn();

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to the wrapped function', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      const wrappedFn = withRetry(mockFn);

      await wrappedFn('arg1', 'arg2', { key: 'value' });

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' });
    });

    it('should return the function return value', async () => {
      const mockFn = vi.fn().mockResolvedValue({ data: 'test' });
      const wrappedFn = withRetry(mockFn);

      const result = await wrappedFn();

      expect(result).toEqual({ data: 'test' });
    });
  });

  describe('withRetry - retry logic', () => {
    it('should retry on retryable errors', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const wrappedFn = withRetry(mockFn, { maxRetries: 3, initialDelay: 100 });

      const resultPromise = wrappedFn();

      // Fast-forward through first retry delay
      await vi.advanceTimersByTimeAsync(100);

      const result = await resultPromise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry multiple times up to maxRetries', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockRejectedValueOnce(new Error('503'))
        .mockResolvedValue('success');

      const wrappedFn = withRetry(mockFn, { maxRetries: 3, initialDelay: 100 });

      const resultPromise = wrappedFn();

      // Fast-forward through all retry delays
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      await vi.advanceTimersByTimeAsync(400);

      const result = await resultPromise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should stop retrying after maxRetries attempts', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
      const wrappedFn = withRetry(mockFn, { maxRetries: 2, initialDelay: 100 });

      const resultPromise = wrappedFn();

      // Fast-forward through all retry delays
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);

      await expect(resultPromise).rejects.toThrow('ECONNRESET');
      expect(mockFn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Some other error'));
      const wrappedFn = withRetry(mockFn, {
        maxRetries: 3,
        initialDelay: 100,
        retryableErrors: ['ECONNRESET', 'ETIMEDOUT'],
      });

      await expect(wrappedFn()).rejects.toThrow('Some other error');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('withRetry - exponential backoff', () => {
    it('should use exponential backoff for delays', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('success');

      const wrappedFn = withRetry(mockFn, {
        maxRetries: 2,
        initialDelay: 100,
        backoffMultiplier: 2,
        jitter: false,
      });

      const startTime = Date.now();
      const resultPromise = wrappedFn();

      // First retry should wait 100ms
      await vi.advanceTimersByTimeAsync(100);

      // Second retry should wait 200ms (100 * 2)
      await vi.advanceTimersByTimeAsync(200);

      await resultPromise;
      const elapsed = Date.now() - startTime;

      // Should have waited at least 300ms total
      expect(elapsed).toBeGreaterThanOrEqual(300);
    });

    it('should respect maxDelay', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const wrappedFn = withRetry(mockFn, {
        maxRetries: 1,
        initialDelay: 100,
        backoffMultiplier: 10,
        maxDelay: 150,
        jitter: false,
      });

      const resultPromise = wrappedFn();

      // Delay should be capped at maxDelay (150ms), not 1000ms
      await vi.advanceTimersByTimeAsync(150);

      const result = await resultPromise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('withRetry - jitter', () => {
    it('should add jitter to delays by default', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      // Track actual delay times
      global.setTimeout = vi.fn((callback, delay) => {
        delays.push(delay as number);
        return originalSetTimeout(callback, delay);
      }) as any;

      const wrappedFn = withRetry(mockFn, {
        maxRetries: 1,
        initialDelay: 1000,
        jitter: true,
      });

      await wrappedFn();

      global.setTimeout = originalSetTimeout;

      // With 10% jitter, delay should be between 900-1100
      expect(delays[0]).toBeGreaterThanOrEqual(900);
      expect(delays[0]).toBeLessThanOrEqual(1100);
    });

    it('should respect jitter: false option', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      global.setTimeout = vi.fn((callback, delay) => {
        delays.push(delay as number);
        return originalSetTimeout(callback, delay);
      }) as any;

      const wrappedFn = withRetry(mockFn, {
        maxRetries: 1,
        initialDelay: 1000,
        jitter: false,
      });

      await wrappedFn();

      global.setTimeout = originalSetTimeout;

      // Without jitter, delay should be exactly 1000
      expect(delays[0]).toBe(1000);
    });
  });

  describe('withRetry - custom retry condition', () => {
    it('should use shouldRetry callback to determine if error is retryable', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue('success');

      const wrappedFn = withRetry(mockFn, {
        maxRetries: 3,
        initialDelay: 100,
        shouldRetry: (error, attempt) => {
          return error.message === 'Temporary error' && attempt < 2;
        },
      });

      const resultPromise = wrappedFn();

      // First error is retryable
      await vi.advanceTimersByTimeAsync(100);

      const result = await resultPromise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('withRetry - retryable error codes', () => {
    it('should retry on HTTP status codes', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('HTTP 503'))
        .mockResolvedValue('success');

      const wrappedFn = withRetry(mockFn, {
        maxRetries: 2,
        initialDelay: 100,
        retryableErrors: [503, 502],
      });

      const resultPromise = wrappedFn();

      await vi.advanceTimersByTimeAsync(100);

      const result = await resultPromise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on network error codes', async () => {
      const errorCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'];

      for (const code of errorCodes) {
        const mockFn = vi.fn()
          .mockRejectedValueOnce(new Error(code))
          .mockResolvedValue('success');

        const wrappedFn = withRetry(mockFn, {
          maxRetries: 1,
          initialDelay: 100,
        });

        const resultPromise = wrappedFn();

        await vi.advanceTimersByTimeAsync(100);

        const result = await resultPromise;

        expect(result).toBe('success');
      }
    });

    it('should retry on rate limit (429)', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('HTTP 429'))
        .mockResolvedValue('success');

      const wrappedFn = withRetry(mockFn, {
        maxRetries: 1,
        initialDelay: 100,
      });

      const resultPromise = wrappedFn();

      await vi.advanceTimersByTimeAsync(100);

      const result = await resultPromise;

      expect(result).toBe('success');
    });
  });

  describe('RetryPresets', () => {
    it('should provide conservative preset', () => {
      const preset = RetryPresets.conservative;

      expect(preset.maxRetries).toBe(5);
      expect(preset.initialDelay).toBe(2000);
      expect(preset.maxDelay).toBe(30000);
      expect(preset.backoffMultiplier).toBe(2);
      expect(preset.jitter).toBe(true);
    });

    it('should provide aggressive preset', () => {
      const preset = RetryPresets.aggressive;

      expect(preset.maxRetries).toBe(3);
      expect(preset.initialDelay).toBe(500);
      expect(preset.maxDelay).toBe(5000);
      expect(preset.backoffMultiplier).toBe(1.5);
    });

    it('should provide rateLimited preset', () => {
      const preset = RetryPresets.rateLimited;

      expect(preset.maxRetries).toBe(5);
      expect(preset.initialDelay).toBe(3000);
      expect(preset.maxDelay).toBe(60000);
      expect(preset.retryableErrors).toEqual([429, 503, 502, 504]);
    });

    it('should provide once preset (no retry)', () => {
      const preset = RetryPresets.once;

      expect(preset.maxRetries).toBe(0);
    });

    it('should use conservative preset', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const wrappedFn = withRetry(mockFn, RetryPresets.conservative);

      const resultPromise = wrappedFn();

      // Conservative preset starts with 2000ms delay
      await vi.advanceTimersByTimeAsync(2000);

      const result = await resultPromise;

      expect(result).toBe('success');
    });
  });

  describe('getRetryInfo', () => {
    it('should extract retry info from enriched error', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ECONNRESET'));

      const wrappedFn = withRetry(mockFn, {
        maxRetries: 2,
        initialDelay: 100,
        backoffMultiplier: 2,
      });

      const resultPromise = wrappedFn();

      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);

      const error = await resultPromise.catch((e) => e);

      const retryInfo = getRetryInfo(error);

      expect(retryInfo).not.toBeNull();
      expect(retryInfo?.attempts).toBe(3);
      expect(retryInfo?.config).toEqual({
        maxRetries: 2,
        initialDelay: 100,
        backoffMultiplier: 2,
      });
    });

    it('should return null for non-retried errors', async () => {
      const error = new Error('Simple error');

      const retryInfo = getRetryInfo(error);

      expect(retryInfo).toBeNull();
    });

    it('should return null for non-Error objects', () => {
      const retryInfo = getRetryInfo('string error');

      expect(retryInfo).toBeNull();
    });
  });

  describe('error enrichment', () => {
    it('should add retry metadata to final error', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ECONNRESET'));

      const wrappedFn = withRetry(mockFn, {
        maxRetries: 1,
        initialDelay: 100,
      });

      const resultPromise = wrappedFn();

      await vi.advanceTimersByTimeAsync(100);

      try {
        await resultPromise;
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as any).__retryAttempts).toBe(2);
        expect((error as any).__retryConfig).toBeDefined();
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex retry scenario with success', async () => {
      let attempt = 0;
      const mockFn = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt < 3) {
          throw new Error('ETIMEDOUT');
        }
        return `success-attempt-${attempt}`;
      });

      const wrappedFn = withRetry(mockFn, RetryPresets.aggressive);

      const resultPromise = wrappedFn();

      // Aggressive preset: 500ms initial, 750ms second
      await vi.advanceTimersByTimeAsync(500);
      await vi.advanceTimersByTimeAsync(750);

      const result = await resultPromise;

      expect(result).toBe('success-attempt-3');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should handle network flapping with success', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('503'))
        .mockRejectedValueOnce(new Error('502'))
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('finally-success');

      const wrappedFn = withRetry(mockFn, RetryPresets.conservative);

      const resultPromise = wrappedFn();

      // Conservative: 2000, 4000, 8000ms
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);
      await vi.advanceTimersByTimeAsync(8000);

      const result = await resultPromise;

      expect(result).toBe('finally-success');
      expect(mockFn).toHaveBeenCalledTimes(4);
    });
  });

  describe('edge cases', () => {
    it('should handle zero maxRetries', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Error'));
      const wrappedFn = withRetry(mockFn, { maxRetries: 0 });

      await expect(wrappedFn()).rejects.toThrow('Error');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle very short delays', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const wrappedFn = withRetry(mockFn, {
        maxRetries: 1,
        initialDelay: 1,
      });

      const resultPromise = wrappedFn();

      await vi.advanceTimersByTimeAsync(1);

      const result = await resultPromise;

      expect(result).toBe('success');
    });

    it('should preserve original error message', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Original error message'));
      const wrappedFn = withRetry(mockFn, { maxRetries: 0 });

      await expect(wrappedFn()).rejects.toThrow('Original error message');
    });
  });
});
