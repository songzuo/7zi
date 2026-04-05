/**
 * Tests for batch-request module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BatchRequestManager,
  DeduplicatedRequestCache,
  batchManager,
  requestCache,
} from '../batch-request';

describe('BatchRequestManager', () => {
  let manager: BatchRequestManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    manager = new BatchRequestManager('/api/batch', {
      maxWaitTime: 100,
      maxBatchSize: 10,
      retryAttempts: 3,
      retryDelay: 1000,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    manager.cancelAll();
  });

  describe('addRequest', () => {
    it('adds request to batch', async () => {
      const mockResponse = {
        responses: [
          { id: 'req-1', status: 200, data: { result: 'success' } },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const promise = manager.addRequest('/api/test', 'GET', undefined, {
        'Content-Type': 'application/json',
      });

      // Advance timer to trigger batch
      vi.advanceTimersByTime(100);

      const result = await promise;

      expect(result).toEqual({ result: 'success' });
      expect(global.fetch).toHaveBeenCalledWith('/api/batch', expect.any(Object));
    });

    it('batches multiple requests', async () => {
      const mockResponse = {
        responses: [
          { id: 'req-1', status: 200, data: { result: 'success1' } },
          { id: 'req-2', status: 200, data: { result: 'success2' } },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const promise1 = manager.addRequest('/api/test1', 'GET');
      const promise2 = manager.addRequest('/api/test2', 'GET');

      // Advance timer to trigger batch
      vi.advanceTimersByTime(100);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual({ result: 'success1' });
      expect(result2).toEqual({ result: 'success2' });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('triggers batch when max size reached', async () => {
      const mockResponse = {
        responses: Array.from({ length: 10 }, (_, i) => ({
          id: `req-${i}`,
          status: 200,
          data: { result: `success${i}` },
        })),
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const promises = Array.from({ length: 10 }, (_, i) =>
        manager.addRequest(`/api/test${i}`, 'GET')
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('retries on failure', async () => {
      let attemptCount = 0;

      global.fetch = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            responses: [{ id: 'req-1', status: 200, data: { result: 'success' } }],
          }),
        });
      });

      const promise = manager.addRequest('/api/test', 'GET');

      // Advance timer to trigger batch
      vi.advanceTimersByTime(100);

      const result = await promise;

      expect(result).toEqual({ result: 'success' });
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('rejects after max retry attempts', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const promise = manager.addRequest('/api/test', 'GET');

      // Advance timer to trigger batch
      vi.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow('Network error');
      expect(global.fetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });
  });

  describe('cancelAll', () => {
    it('cancels all pending requests', async () => {
      const promise1 = manager.addRequest('/api/test1', 'GET');
      const promise2 = manager.addRequest('/api/test2', 'GET');

      manager.cancelAll();

      await expect(promise1).rejects.toThrow('Request cancelled');
      await expect(promise2).rejects.toThrow('Request cancelled');
    });
  });

  describe('getPendingCount', () => {
    it('returns pending request count', () => {
      manager.addRequest('/api/test1', 'GET');
      manager.addRequest('/api/test2', 'GET');

      expect(manager.getPendingCount()).toBe(2);
    });
  });

  describe('updateOptions', () => {
    it('updates batch options', () => {
      manager.updateOptions({ maxWaitTime: 200, maxBatchSize: 20 });

      // Add request to trigger batch with new options
      manager.addRequest('/api/test', 'GET');

      vi.advanceTimersByTime(200);

      expect(global.fetch).toHaveBeenCalled();
    });
  });
});

describe('DeduplicatedRequestCache', () => {
  let cache: DeduplicatedRequestCache;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new DeduplicatedRequestCache(5000);
  });

  afterEach(() => {
    cache.clear();
  });

  describe('request', () => {
    it('caches successful responses', async () => {
      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });

      const result1 = await cache.request('key1', requestFn);
      const result2 = await cache.request('key1', requestFn);

      expect(result1).toEqual({ data: 'test' });
      expect(result2).toEqual({ data: 'test' });
      expect(requestFn).toHaveBeenCalledTimes(1);
    });

    it('deduplicates in-flight requests', async () => {
      let resolveCount = 0;
      const requestFn = vi.fn().mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolveCount++;
            resolve({ data: 'test' });
          }, 100);
        })
      );

      const promise1 = cache.request('key1', requestFn);
      const promise2 = cache.request('key1', requestFn);

      await Promise.all([promise1, promise2]);

      expect(requestFn).toHaveBeenCalledTimes(1);
      expect(resolveCount).toBe(1);
    });

    it('bypasses cache when requested', async () => {
      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });

      await cache.request('key1', requestFn);
      await cache.request('key1', requestFn, true);

      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it('clears expired cache entries', async () => {
      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });

      await cache.request('key1', requestFn);

      // Wait for cache to expire
      vi.advanceTimersByTime(6000);

      await cache.request('key1', requestFn);

      expect(requestFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('clear', () => {
    it('clears specific cache entry', async () => {
      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });

      await cache.request('key1', requestFn);
      cache.clear('key1');
      await cache.request('key1', requestFn);

      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it('clears all cache entries', async () => {
      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });

      await cache.request('key1', requestFn);
      await cache.request('key2', requestFn);

      cache.clear();

      await cache.request('key1', requestFn);
      await cache.request('key2', requestFn);

      expect(requestFn).toHaveBeenCalledTimes(4);
    });
  });

  describe('clearOldEntries', () => {
    it('clears old cache entries', async () => {
      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });

      await cache.request('key1', requestFn);

      // Wait for cache to expire
      vi.advanceTimersByTime(6000);

      cache.clearOldEntries();

      expect(cache.size()).toBe(0);
    });
  });

  describe('size', () => {
    it('returns cache size', async () => {
      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });

      await cache.request('key1', requestFn);
      await cache.request('key2', requestFn);

      expect(cache.size()).toBe(2);
    });
  });

  describe('updateTTL', () => {
    it('updates cache TTL', async () => {
      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });

      cache.updateTTL(1000);

      await cache.request('key1', requestFn);

      // Wait for cache to expire with new TTL
      vi.advanceTimersByTime(1500);

      await cache.request('key1', requestFn);

      expect(requestFn).toHaveBeenCalledTimes(2);
    });
  });
});

describe('Preconfigured Instances', () => {
  it('exports batchManager instance', () => {
    expect(batchManager).toBeInstanceOf(BatchRequestManager);
  });

  it('exports requestCache instance', () => {
    expect(requestCache).toBeInstanceOf(DeduplicatedRequestCache);
  });
});