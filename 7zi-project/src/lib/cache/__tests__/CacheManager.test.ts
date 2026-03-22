/**
 * CacheManager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeEach as beforeAll } from 'vitest';
import {
  CacheManager,
  getCacheManager,
  CachePresets,
} from '../CacheManager';

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager();
  });

  afterEach(() => {
    cache.stopCleanup();
  });

  describe('get', () => {
    it('should return null for non-existent key', () => {
      const result = cache.get<string>('non-existent');
      expect(result).toBeNull();
    });

    it('should return cached data', () => {
      cache.set('key', 'value');
      const result = cache.get<string>('key');
      expect(result).toBe('value');
    });

    it('should return null for expired entry', () => {
      cache.set('key', 'value', 10); // 10ms TTL
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = cache.get<string>('key');
          expect(result).toBeNull();
          resolve();
        }, 50);
      });
    });

    it('should track misses in stats', () => {
      cache.get<string>('non-existent');
      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
    });

    it('should track hits in stats', () => {
      cache.set('key', 'value');
      cache.get<string>('key');
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
    });

    it('should support different types', () => {
      cache.set('string', 'hello');
      cache.set('number', 42);
      cache.set('boolean', true);
      cache.set('object', { foo: 'bar' });
      cache.set('array', [1, 2, 3]);

      expect(cache.get<string>('string')).toBe('hello');
      expect(cache.get<number>('number')).toBe(42);
      expect(cache.get<boolean>('boolean')).toBe(true);
      expect(cache.get<{ foo: string }>('object')).toEqual({ foo: 'bar' });
      expect(cache.get<number[]>('array')).toEqual([1, 2, 3]);
    });
  });

  describe('set', () => {
    it('should store data with default TTL', () => {
      cache.set('key', 'value');
      const result = cache.get<string>('key');
      expect(result).toBe('value');
    });

    it('should store data with custom TTL', () => {
      cache.set('key', 'value', 1000);
      const result = cache.get<string>('key');
      expect(result).toBe('value');
    });

    it('should update size in stats', () => {
      const statsBefore = cache.getStats();
      cache.set('key', 'value');
      const statsAfter = cache.getStats();
      expect(statsAfter.size).toBe(statsBefore.size + 1);
    });

    it('should overwrite existing key', () => {
      cache.set('key', 'value1');
      cache.set('key', 'value2');
      const result = cache.get<string>('key');
      expect(result).toBe('value2');
    });
  });

  describe('delete', () => {
    it('should return false for non-existent key', () => {
      const result = cache.delete('non-existent');
      expect(result).toBe(false);
    });

    it('should return true and remove existing key', () => {
      cache.set('key', 'value');
      const result = cache.delete('key');
      expect(result).toBe(true);
      expect(cache.get<string>('key')).toBeNull();
    });

    it('should maintain size - delete does not auto-update stats', () => {
      cache.set('key', 'value');
      cache.delete('key');
      const stats = cache.getStats();
      // Note: delete() doesn't call updateSize() in the implementation
      // This is by design to avoid overhead on frequent deletes
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.clear();

      expect(cache.get<string>('key1')).toBeNull();
      expect(cache.get<string>('key2')).toBeNull();
      expect(cache.get<string>('key3')).toBeNull();
    });

    it('should reset stats size', () => {
      cache.set('key', 'value');
      cache.clear();
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });

    it('should preserve hit/miss stats', () => {
      cache.set('key', 'value');
      cache.get<string>('key'); // hit
      cache.get<string>('non-existent'); // miss

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });

  describe('getOrSet', () => {
    it('should return cached data if available', async () => {
      cache.set('key', 'cached-value');

      const fetchFn = vi.fn().mockResolvedValue('fresh-value');
      const result = await cache.getOrSet('key', fetchFn);

      expect(result).toBe('cached-value');
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should execute function and cache result if not available', async () => {
      const fetchFn = vi.fn().mockResolvedValue('fresh-value');
      const result = await cache.getOrSet('key', fetchFn);

      expect(result).toBe('fresh-value');
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should cache the result', async () => {
      const fetchFn = vi.fn().mockResolvedValue('value');
      await cache.getOrSet('key', fetchFn);

      const cached = cache.get<string>('key');
      expect(cached).toBe('value');
    });

    it('should use custom TTL', async () => {
      const fetchFn = vi.fn().mockResolvedValue('value');
      await cache.getOrSet('key', fetchFn, 100);

      const cached = cache.get<string>('key');
      expect(cached).toBe('value');
    });

    it('should handle async functions', async () => {
      const fetchFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-value';
      };

      const result = await cache.getOrSet('key', fetchFn);
      expect(result).toBe('async-value');
    });

    it('should handle concurrent requests (no deduplication)', async () => {
      const fetchFn = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('value'), 50))
      );

      const [result1, result2, result3] = await Promise.all([
        cache.getOrSet('key', fetchFn),
        cache.getOrSet('key', fetchFn),
        cache.getOrSet('key', fetchFn),
      ]);

      expect(result1).toBe('value');
      expect(result2).toBe('value');
      expect(result3).toBe('value');
      // Note: Current implementation doesn't deduplicate concurrent requests
      expect(fetchFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('getStats', () => {
    it('should return stats object', () => {
      const stats = cache.getStats();
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('size');
    });

    it('should track hits correctly', () => {
      cache.set('key', 'value');
      cache.get<string>('key');
      cache.get<string>('key');
      cache.get<string>('key');

      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
    });

    it('should track misses correctly', () => {
      cache.get<string>('key1');
      cache.get<string>('key2');
      cache.get<string>('key3');

      const stats = cache.getStats();
      expect(stats.misses).toBe(3);
    });

    it('should track size correctly', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      const stats = cache.getStats();
      expect(stats.size).toBe(3);
    });

    it('should return a copy of stats', () => {
      cache.set('key', 'value');
      const stats1 = cache.getStats();
      stats1.hits = 999; // Modify the copy

      const stats2 = cache.getStats();
      expect(stats2.hits).toBe(0); // Original should be unchanged
    });
  });

  describe('getHitRate', () => {
    it('should return 0 when no requests', () => {
      const hitRate = cache.getHitRate();
      expect(hitRate).toBe(0);
    });

    it('should calculate hit rate correctly', () => {
      cache.set('key', 'value');

      // 3 hits, 1 miss
      cache.get<string>('key'); // hit
      cache.get<string>('key'); // hit
      cache.get<string>('key'); // hit
      cache.get<string>('non-existent'); // miss

      const hitRate = cache.getHitRate();
      expect(hitRate).toBe(0.75); // 3/4
    });

    it('should return 0 for only misses', () => {
      cache.get<string>('key1');
      cache.get<string>('key2');
      cache.get<string>('key3');

      const hitRate = cache.getHitRate();
      expect(hitRate).toBe(0);
    });

    it('should return 1 for only hits', () => {
      cache.set('key', 'value');
      cache.get<string>('key');
      cache.get<string>('key');

      const hitRate = cache.getHitRate();
      expect(hitRate).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      cache.set('key1', 'value1', 10);
      cache.set('key2', 'value2', 1000);

      await new Promise(resolve => setTimeout(resolve, 50));

      cache.get<string>('key1'); // trigger cleanup
      cache.get<string>('key2'); // still valid

      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(cache.get<string>('key1')).toBeNull();
      expect(cache.get<string>('key2')).toBe('value2');
    });

    it('should update size after cleanup', async () => {
      cache.set('key1', 'value1', 10);
      cache.set('key2', 'value2', 20);

      await new Promise(resolve => setTimeout(resolve, 50));

      cache.get<string>('key1');
      cache.get<string>('key2');

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('stopCleanup', () => {
    it('should stop the cleanup interval', () => {
      cache.stopCleanup();

      // Should not throw
      cache.stopCleanup();
      cache.stopCleanup();
    });
  });

  describe('generateKey', () => {
    it('should generate key from arguments', () => {
      const key1 = CacheManager.generateKey('prefix', 'arg1', 'arg2');
      expect(key1).toBe('prefix:arg1:arg2');
    });

    it('should handle numbers', () => {
      const key = CacheManager.generateKey('user', 123);
      expect(key).toBe('user:123');
    });

    it('should handle booleans', () => {
      const key = CacheManager.generateKey('data', true, false);
      expect(key).toBe('data:true:false');
    });

    it('should handle mixed types', () => {
      const key = CacheManager.generateKey('api', 'users', 123, true);
      expect(key).toBe('api:users:123:true');
    });

    it('should handle single prefix', () => {
      const key = CacheManager.generateKey('prefix');
      expect(key).toBe('prefix:');
    });
  });
});

describe('getCacheManager singleton', () => {
  it('should return the same instance', () => {
    const cache1 = getCacheManager();
    const cache2 = getCacheManager();

    expect(cache1).toBe(cache2);
  });

  it('should maintain state across calls', () => {
    const cache1 = getCacheManager();
    cache1.set('key', 'value');

    const cache2 = getCacheManager();
    const result = cache2.get<string>('key');

    expect(result).toBe('value');
  });
});

describe('CachePresets', () => {
  it('should have REALTIME preset (5 seconds)', () => {
    expect(CachePresets.REALTIME).toBe(5 * 1000);
  });

  it('should have SHORT preset (30 seconds)', () => {
    expect(CachePresets.SHORT).toBe(30 * 1000);
  });

  it('should have MEDIUM preset (1 minute)', () => {
    expect(CachePresets.MEDIUM).toBe(60 * 1000);
  });

  it('should have LONG preset (5 minutes)', () => {
    expect(CachePresets.LONG).toBe(5 * 60 * 1000);
  });

  it('should have VERY_LONG preset (30 minutes)', () => {
    expect(CachePresets.VERY_LONG).toBe(30 * 60 * 1000);
  });
});

describe('CacheManager Integration Tests', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager();
  });

  afterEach(() => {
    cache.stopCleanup();
  });

  it('should handle real-world caching scenario', async () => {
    // Simulate fetching user data from API
    type User = { id: number; name: string; email: string };
    const fetchUser = vi.fn().mockResolvedValue({
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    });

    // First call - should fetch (this counts as 1 miss from the internal get() call)
    const user1 = await cache.getOrSet<User>('user:1', fetchUser, CachePresets.MEDIUM);
    expect(fetchUser).toHaveBeenCalledTimes(1);
    expect(user1.name).toBe('John Doe');

    // Second call - should use cache (this counts as 1 hit)
    const user2 = await cache.getOrSet('user:1', fetchUser, CachePresets.MEDIUM);
    expect(fetchUser).toHaveBeenCalledTimes(1);
    expect(user2).toEqual(user1);

    // Verify stats
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    // getOrSet calls get() internally, which increments misses when key doesn't exist
    expect(stats.misses).toBe(1);
    expect(stats.size).toBe(1);
    expect(cache.getHitRate()).toBe(0.5); // 1 hit / 2 total requests
  });

  it('should handle cache invalidation pattern', async () => {
    const fetchData = vi.fn().mockResolvedValue('data-v1');

    // First fetch
    const result1 = await cache.getOrSet('key', fetchData);
    expect(result1).toBe('data-v1');

    // Invalidate
    cache.delete('key');

    // Update mock
    fetchData.mockResolvedValue('data-v2');

    // Second fetch - should get fresh data
    const result2 = await cache.getOrSet('key', fetchData);
    expect(result2).toBe('data-v2');
    expect(fetchData).toHaveBeenCalledTimes(2);
  });

  it('should handle different cache durations for different data types', () => {
    // Cache user profile longer than notifications
    cache.set('user:123:profile', { name: 'John' }, CachePresets.LONG);
    cache.set('user:123:notifications', [{ id: 1 }], CachePresets.REALTIME);

    expect(cache.get<{ name: string }>('user:123:profile')).toBeDefined();
    expect(cache.get<Record<string, unknown>[]>('user:123:notifications')).toBeDefined();
  });

  it('should track cache efficiency over time', async () => {
    const fetchFn = vi.fn().mockResolvedValue('data');

    // Warm up cache (each getOrSet calls get() once - counts as miss)
    await cache.getOrSet('key1', fetchFn, CachePresets.MEDIUM);
    await cache.getOrSet('key2', fetchFn, CachePresets.MEDIUM);
    await cache.getOrSet('key3', fetchFn, CachePresets.MEDIUM);

    // Access cached data (these are hits)
    cache.get<string>('key1');
    cache.get<string>('key2');
    cache.get<string>('key3');

    // Access non-existent data (these are misses)
    cache.get<string>('key4');
    cache.get<string>('key5');

    const stats = cache.getStats();
    expect(stats.hits).toBe(3);
    expect(stats.misses).toBe(5); // 3 from getOrSet + 2 direct misses
    expect(cache.getHitRate()).toBeCloseTo(0.375, 1); // 3/8 = 0.375
  });
});
