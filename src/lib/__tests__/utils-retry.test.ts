/**
 * Retry Utility Tests
 * Tests for utils/retry.ts - retry logic utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  retry,
  retryWithResult,
  retryFetch,
  RetryCache,
  createRetryCache,
  type RetryOptions,
  type RetryResult,
} from '../utils/retry';

describe('Retry Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await retry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const fn = vi.fn(() => {
        attempts++;
        if (attempts < 3) throw new Error('network error');
        return 'success';
      });

      const promise = retry(fn, { maxRetries: 3 });

      // Fast-forward through retries
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const fn = vi.fn(() => {
        throw new Error('always fails');
      });

      const promise = retry(fn, { maxRetries: 2 });

      // Fast-forward through all retries
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(2000);

      await expect(promise).rejects.toThrow('always fails');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should delay between retries', async () => {
      const fn = vi.fn(() => {
        throw new Error('fail');
      });

      const startTime = Date.now();
      const promise = retry(fn, { maxRetries: 1 });

      await vi.advanceTimersByTimeAsync(1000);

      await expect(promise).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff', async () => {
      const fn = vi.fn(() => {
        throw new Error('fail');
      });

      retry(fn, { maxRetries: 2, initialDelay: 1000, backoffFactor: 2 });

      // First retry after 1s
      await vi.advanceTimersByTimeAsync(1000);
      expect(fn).toHaveBeenCalledTimes(2);

      // Second retry after 2s (1s * 2)
      await vi.advanceTimersByTimeAsync(2000);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should apply max delay limit', async () => {
      const fn = vi.fn(() => {
        throw new Error('fail');
      });

      retry(fn, {
        maxRetries: 3,
        initialDelay: 10000,
        maxDelay: 15000,
        backoffFactor: 2,
      });

      // First retry after 10s
      await vi.advanceTimersByTimeAsync(10000);
      expect(fn).toHaveBeenCalledTimes(2);

      // Second retry after 15s (capped by maxDelay, not 20s)
      await vi.advanceTimersByTimeAsync(15000);
      expect(fn).toHaveBeenCalledTimes(3);

      // Third retry after 15s (capped by maxDelay, not 40s)
      await vi.advanceTimersByTimeAsync(15000);
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it('should retry only on specific errors', async () => {
      const networkError = new Error('network timeout');
      const otherError = new Error('not retryable');

      let attempts = 0;
      const fn = vi.fn(() => {
        attempts++;
        if (attempts === 1) throw networkError;
        if (attempts === 2) throw otherError;
        return 'success';
      });

      const shouldRetry = (error: unknown) =>
        error instanceof Error && error.message.includes('network');

      const promise = retry(fn, { maxRetries: 5, shouldRetry });

      // Fast-forward through first retry
      await vi.advanceTimersByTimeAsync(1000);

      await expect(promise).rejects.toThrow('not retryable');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should support onRetry callback', async () => {
      const onRetry = vi.fn();
      const fn = vi.fn(() => {
        throw new Error('fail');
      });

      const promise = retry(fn, { maxRetries: 1, onRetry });

      await vi.advanceTimersByTimeAsync(1000);

      await expect(promise).rejects.toThrow();
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should support onSuccess callback', async () => {
      const onSuccess = vi.fn();
      const fn = vi.fn().mockResolvedValue('success');

      await retry(fn, { onSuccess });

      expect(onSuccess).toHaveBeenCalledWith('success', 1);
    });

    it('should support onFailure callback', async () => {
      const onFailure = vi.fn();
      const fn = vi.fn(() => {
        throw new Error('fail');
      });

      const promise = retry(fn, { maxRetries: 1, onFailure });

      await vi.advanceTimersByTimeAsync(1000);

      await expect(promise).rejects.toThrow();
      expect(onFailure).toHaveBeenCalled();
    });

    it('should not retry on AbortError', async () => {
      const fn = vi.fn(() => {
        throw new DOMException('Aborted', 'AbortError');
      });

      const promise = retry(fn, { maxRetries: 5 });

      await expect(promise).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should respect abort signal', async () => {
      const fn = vi.fn(() => {
        throw new Error('fail');
      });

      const controller = new AbortController();
      const promise = retry(fn, { maxRetries: 5, signal: controller.signal });

      // Abort after first attempt
      await vi.advanceTimersByTimeAsync(100);
      controller.abort();

      await expect(promise).rejects.toThrow();
    });

    it('should support timeout', async () => {
      const fn = vi.fn(() => new Promise(() => {})); // Never resolves

      const promise = retry(fn, { maxRetries: 0, timeout: 100 });

      await vi.advanceTimersByTimeAsync(100);

      await expect(promise).rejects.toThrow('Timeout');
    });
  });

  describe('retryWithResult', () => {
    it('should return successful result', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await retryWithResult(fn);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(result.totalTime).toBeGreaterThanOrEqual(0);
    });

    it('should return failed result', async () => {
      const fn = vi.fn(() => {
        throw new Error('fail');
      });

      const promise = retryWithResult(fn, { maxRetries: 1 });

      await vi.advanceTimersByTimeAsync(1000);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.attempts).toBe(2); // Initial + 1 retry
      expect(result.totalTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('retryFetch', () => {
    it('should retry on 500 status', async () => {
      let attempts = 0;
      global.fetch = vi.fn(async () => {
        attempts++;
        if (attempts < 2) {
          return {
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as Response;
      });

      const promise = retryFetch('https://api.example.com/data', {}, { maxRetries: 1 });

      await vi.advanceTimersByTimeAsync(1000);

      const response = await promise;

      expect(response.status).toBe(200);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 status', async () => {
      let attempts = 0;
      global.fetch = vi.fn(async () => {
        attempts++;
        if (attempts < 2) {
          return {
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as Response;
      });

      const promise = retryFetch('https://api.example.com/data', {}, { maxRetries: 1 });

      await vi.advanceTimersByTimeAsync(1000);

      const response = await promise;

      expect(response.status).toBe(200);
    });

    it('should not retry on 404 status', async () => {
      global.fetch = vi.fn(async () => ({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response));

      await expect(retryFetch('https://api.example.com/data')).rejects.toThrow();
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('RetryCache', () => {
    it('should cache successful results', async () => {
      const cache = new RetryCache(60000);
      const fn = vi.fn().mockResolvedValue('success');

      const result1 = await cache.execute('key1', fn);
      const result2 = await cache.execute('key1', fn);

      expect(result1).toBe('success');
      expect(result2).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cache failed results', async () => {
      const cache = new RetryCache(60000);
      const fn = vi.fn(() => {
        throw new Error('fail');
      });

      const promise1 = cache.execute('key1', fn, { maxRetries: 0 });
      const promise2 = cache.execute('key1', fn, { maxRetries: 0 });

      await expect(promise1).rejects.toThrow();
      await expect(promise2).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should expire cache entries', async () => {
      const cache = new RetryCache(1000); // 1 second TTL
      const fn = vi.fn().mockResolvedValue('success');

      const result1 = await cache.execute('key1', fn);

      vi.advanceTimersByTime(1500);

      const fn2 = vi.fn().mockResolvedValue('success2');
      const result2 = await cache.execute('key1', fn2);

      expect(result1).toBe('success');
      expect(result2).toBe('success2');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('should cleanup expired entries', () => {
      const cache = new RetryCache(1000);

      cache.cache.set('key1', { timestamp: Date.now() - 2000, result: 'value1' });
      cache.cache.set('key2', { timestamp: Date.now() - 500, result: 'value2' });

      cache.cleanup();

      expect(cache.cache.has('key1')).toBe(false);
      expect(cache.cache.has('key2')).toBe(true);
    });

    it('should clear all entries', () => {
      const cache = new RetryCache(60000);

      cache.cache.set('key1', { timestamp: Date.now(), result: 'value1' });
      cache.cache.set('key2', { timestamp: Date.now(), result: 'value2' });

      cache.clear();

      expect(cache.cache.size).toBe(0);
    });
  });

  describe('createRetryCache', () => {
    it('should create a retry cache', () => {
      const cache = createRetryCache(60000);

      expect(cache).toBeInstanceOf(RetryCache);
    });

    it('should use default TTL', () => {
      const cache = createRetryCache();

      expect(cache).toBeInstanceOf(RetryCache);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero maxRetries', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await retry(fn, { maxRetries: 0 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle negative initialDelay', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await retry(fn, { initialDelay: -100 });

      expect(result).toBe('success');
    });

    it('should handle undefined error', async () => {
      const fn = vi.fn(() => {
        throw undefined;
      });

      const promise = retry(fn, { maxRetries: 1 });

      await vi.advanceTimersByTimeAsync(1000);

      await expect(promise).rejects.toThrow();
    });

    it('should handle non-Error objects thrown', async () => {
      const fn = vi.fn(() => {
        throw 'string error';
      });

      const promise = retry(fn, { maxRetries: 1 });

      await vi.advanceTimersByTimeAsync(1000);

      await expect(promise).rejects.toThrow('string error');
    });

    it('should handle very long delays with maxDelay', async () => {
      const fn = vi.fn(() => {
        throw new Error('fail');
      });

      const promise = retry(fn, {
        maxRetries: 1,
        initialDelay: 1000000, // Very large
        maxDelay: 100, // Capped
      });

      await vi.advanceTimersByTimeAsync(100);

      await expect(promise).rejects.toThrow();
    });
  });
});
