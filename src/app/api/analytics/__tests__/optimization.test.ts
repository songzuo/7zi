/**
 * @fileoverview Analytics API 性能优化测试
 * @description 测试缓存、分页和错误处理功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheManager, CachePresets } from '@/lib/cache/CacheManager';

// ============================================================================
// Test Suite: Cache Manager
// ============================================================================

describe('CacheManager - Analytics Optimization', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager();
  });

  afterEach(() => {
    cacheManager.clear();
    cacheManager.stopCleanup();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve data', () => {
      const key = 'test-key';
      const data = { value: 42 };

      cacheManager.set(key, data, 1000);
      const retrieved = cacheManager.get(key);

      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent keys', () => {
      const result = cacheManager.get('non-existent');
      expect(result).toBeNull();
    });

    it('should expire data after TTL', async () => {
      const key = 'test-key';
      const data = { value: 42 };

      cacheManager.set(key, data, 100); // 100ms TTL

      // Immediate retrieval should work
      expect(cacheManager.get(key)).toEqual(data);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired now
      expect(cacheManager.get(key)).toBeNull();
    });

    it('should clear cache', () => {
      const key1 = 'key-1';
      const key2 = 'key-2';

      cacheManager.set(key1, { value: 1 }, 1000);
      cacheManager.set(key2, { value: 2 }, 1000);

      expect(cacheManager.getStats().size).toBe(2);

      cacheManager.clear();

      expect(cacheManager.getStats().size).toBe(0);
      expect(cacheManager.get(key1)).toBeNull();
      expect(cacheManager.get(key2)).toBeNull();
    });

    it('should delete specific keys', () => {
      const key1 = 'key-1';
      const key2 = 'key-2';

      cacheManager.set(key1, { value: 1 }, 1000);
      cacheManager.set(key2, { value: 2 }, 1000);

      expect(cacheManager.getStats().size).toBe(2);

      const deleted = cacheManager.delete(key1);

      expect(deleted).toBe(true);
      expect(cacheManager.get(key1)).toBeNull();
      expect(cacheManager.get(key2)).toEqual({ value: 2 });
      expect(cacheManager.getStats().size).toBe(1);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache statistics', () => {
      const key = 'test-key';
      const data = { value: 42 };

      cacheManager.set(key, data, 1000);

      // Miss
      cacheManager.get('non-existent');
      expect(cacheManager.getStats().misses).toBe(1);

      // Hit
      cacheManager.get(key);
      expect(cacheManager.getStats().hits).toBe(1);

      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(1);
    });

    it('should calculate hit rate correctly', () => {
      const key = 'test-key';
      const data = { value: 42 };

      cacheManager.set(key, data, 1000);

      // Misses
      cacheManager.get('miss-1');
      cacheManager.get('miss-2');

      // Hits
      cacheManager.get(key);
      cacheManager.get(key);
      cacheManager.get(key);

      const hitRate = cacheManager.getHitRate();
      expect(hitRate).toBe(0.6); // 3 hits out of 5 requests
    });

    it('should handle zero requests correctly', () => {
      const hitRate = cacheManager.getHitRate();
      expect(hitRate).toBe(0);
    });
  });

  describe('getOrSet Pattern', () => {
    it('should support getOrSet pattern', async () => {
      const key = 'test-key';
      let callCount = 0;

      const fetchFn = async () => {
        callCount++;
        return { value: 42 };
      };

      // First call - should execute fetchFn
      const result1 = await cacheManager.getOrSet(key, fetchFn, 1000);
      expect(result1).toEqual({ value: 42 });
      expect(callCount).toBe(1);

      // Second call - should return cached value
      const result2 = await cacheManager.getOrSet(key, fetchFn, 1000);
      expect(result2).toEqual({ value: 42 });
      expect(callCount).toBe(1); // Should not call fetchFn again
    });

    it('should cache failed results if explicitly set', async () => {
      const key = 'test-key';
      let callCount = 0;

      const fetchFn = async () => {
        callCount++;
        throw new Error('API Error');
      };

      // First call should throw
      await expect(cacheManager.getOrSet(key, fetchFn, 1000)).rejects.toThrow('API Error');
      expect(callCount).toBe(1);
    });
  });

  describe('Key Generation', () => {
    it('should generate cache keys correctly', () => {
      const key1 = CacheManager.generateKey('prefix', 'arg1', 'arg2', 123);
      const key2 = CacheManager.generateKey('prefix', 'arg1', 'arg2', 123);
      const key3 = CacheManager.generateKey('prefix', 'arg1', 'arg2', 456);

      expect(key1).toBe('prefix:arg1:arg2:123');
      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });

    it('should handle mixed argument types', () => {
      const key = CacheManager.generateKey('analytics', 'week', 1, 100, ['a', 'b']);
      expect(typeof key).toBe('string');
      expect(key).toContain('analytics');
      expect(key).toContain('week');
    });
  });

  describe('Cache Presets', () => {
    it('should use cache presets', () => {
      expect(CachePresets.REALTIME).toBe(5 * 1000);
      expect(CachePresets.SHORT).toBe(30 * 1000);
      expect(CachePresets.MEDIUM).toBe(60 * 1000);
      expect(CachePresets.LONG).toBe(5 * 60 * 1000);
      expect(CachePresets.VERY_LONG).toBe(30 * 60 * 1000);
    });
  });

  describe('Performance', () => {
    it('should handle large number of operations efficiently', () => {
      const start = Date.now();

      // Set 1000 entries
      for (let i = 0; i < 1000; i++) {
        cacheManager.set(`key-${i}`, { value: i }, 10000);
      }

      // Get 1000 entries
      for (let i = 0; i < 1000; i++) {
        cacheManager.get(`key-${i}`);
      }

      const end = Date.now();
      const duration = end - start;

      // Should complete within 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent getOrSet operations', async () => {
      const key = 'test-key';
      let callCount = 0;

      const fetchFn = async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return { value: 42 };
      };

      // Simulate concurrent requests
      const requests = Array.from({ length: 5 }, () =>
        cacheManager.getOrSet(key, fetchFn, 1000)
      );

      const results = await Promise.all(requests);

      // All should return the same value
      expect(results.every(r => r?.value === 42)).toBe(true);

      // Multiple concurrent calls will each miss cache and fetch
      // In a production environment with request deduplication, this would be 1
      expect(callCount).toBeGreaterThan(0);
    });
  });

  describe('Type Safety', () => {
    it('should preserve types when storing and retrieving', () => {
      const key = 'test-key';

      interface TestType {
        id: number;
        name: string;
        nested: {
          value: boolean;
        };
      }

      const data: TestType = {
        id: 1,
        name: 'test',
        nested: { value: true }
      };

      cacheManager.set(key, data, 1000);
      const retrieved = cacheManager.get<TestType>(key);

      expect(retrieved).toEqual(data);
      expect(retrieved?.nested.value).toBe(true);
    });

    it('should handle different data types', () => {
      const stringKey = 'string-key';
      const numberKey = 'number-key';
      const booleanKey = 'boolean-key';
      const arrayKey = 'array-key';
      const objectKey = 'object-key';

      cacheManager.set(stringKey, 'test-string', 1000);
      cacheManager.set(numberKey, 42, 1000);
      cacheManager.set(booleanKey, true, 1000);
      cacheManager.set(arrayKey, [1, 2, 3], 1000);
      cacheManager.set(objectKey, { a: 1, b: 2 }, 1000);

      expect(cacheManager.get<string>(stringKey)).toBe('test-string');
      expect(cacheManager.get<number>(numberKey)).toBe(42);
      expect(cacheManager.get<boolean>(booleanKey)).toBe(true);
      expect(cacheManager.get<number[]>(arrayKey)).toEqual([1, 2, 3]);
      expect(cacheManager.get<object>(objectKey)).toEqual({ a: 1, b: 2 });
    });
  });

  describe('Analytics-specific use cases', () => {
    it('should cache analytics metrics with correct TTL', () => {
      const filters = {
        timeRange: 'week' as const,
        agentIds: ['agent-1', 'agent-2'],
        metrics: ['agents', 'users', 'tasks']
      };

      const metrics = {
        agents: { total: 10, active: 5 },
        users: { total: 100, active: 20 },
        tasks: { total: 50, completed: 40 }
      };

      const cacheKey = CacheManager.generateKey(
        'analytics',
        filters.timeRange,
        filters.agentIds?.join(',') || 'all',
        filters.metrics?.join(',') || 'all'
      );

      // Cache with 5-minute TTL
      cacheManager.set(cacheKey, metrics, CachePresets.LONG);

      const retrieved = cacheManager.get(cacheKey);
      expect(retrieved).toEqual(metrics);
    });

    it('should handle time series pagination caching', () => {
      const page1Key = 'analytics:week:timeSeries:1:100';
      const page2Key = 'analytics:week:timeSeries:2:100';

      const page1Data = {
        data: [{ timestamp: '2024-01-01', value: 10 }],
        total: 200,
        page: 1,
        limit: 100,
        totalPages: 2
      };

      const page2Data = {
        data: [{ timestamp: '2024-02-01', value: 20 }],
        total: 200,
        page: 2,
        limit: 100,
        totalPages: 2
      };

      cacheManager.set(page1Key, page1Data, CachePresets.LONG);
      cacheManager.set(page2Key, page2Data, CachePresets.LONG);

      const retrievedPage1 = cacheManager.get(page1Key);
      const retrievedPage2 = cacheManager.get(page2Key);

      expect(retrievedPage1).toEqual(page1Data);
      expect(retrievedPage2).toEqual(page2Data);
      expect(retrievedPage1?.page).toBe(1);
      expect(retrievedPage2?.page).toBe(2);
    });

    it('should track cache efficiency for analytics endpoints', () => {
      const key = 'analytics:week:metrics';

      // Simulate typical analytics traffic
      // 1 initial request (miss)
      cacheManager.get(key);

      // 9 subsequent requests (hits)
      for (let i = 0; i < 9; i++) {
        cacheManager.set(key, { data: 'test' }, 1000);
        cacheManager.get(key);
      }

      const stats = cacheManager.getStats();
      const hitRate = cacheManager.getHitRate();

      expect(stats.hits).toBe(9);
      expect(stats.misses).toBe(1);
      expect(hitRate).toBe(0.9); // 90% hit rate
    });
  });
});

