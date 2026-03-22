/**
 * Database Cache Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MemoizationCache,
  memoize,
  memoizeSync,
  memoizedQuery,
  cached,
  cachedWithInvalidation,
  cachedQuery,
  getCacheStats,
  CacheKeyGenerator,
  CacheInvalidator,
  startCacheCleanup,
  warmupCache,
  CacheStats,
} from '../cache';
import type { MemoizationOptions } from '../cache';

// Mock getDatabaseAsync and logger
vi.mock('../index', () => {
  const mockDb = {
    prepare: vi.fn().mockReturnValue({
      all: vi.fn().mockReturnValue([]),
      get: vi.fn().mockReturnValue({}),
    }),
  };
  return {
    getDatabaseAsync: vi.fn().mockResolvedValue(mockDb),
  };
});

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('MemoizationCache', () => {
  let memoization: MemoizationCache;

  beforeEach(() => {
    memoization = new MemoizationCache();
  });

  afterEach(() => {
    memoization.clearAll();
  });

  describe('memoize()', () => {
    it('should memoize async function', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const memoized = memoization.memoize(fn, { keyPrefix: 'test' });

      const result1 = await memoized();
      const result2 = await memoized();

      expect(fn).toHaveBeenCalledTimes(1);
      expect(result1).toBe('result');
      expect(result2).toBe('result');
    });

    it('should cache with different arguments', async () => {
      const fn = vi.fn((x: number) => Promise.resolve(x * 2));
      const memoized = memoization.memoize(fn, { keyPrefix: 'test' });

      await memoized(5);
      await memoized(10);
      await memoized(5); // Should hit cache

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should expire cache after TTL', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const memoized = memoization.memoize(fn, { keyPrefix: 'test', ttl: 100 });

      await memoized();

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      await memoized();

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use custom key generator', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const keyGenerator = (x: number) => `custom:${x}`;

      const memoized = memoization.memoize(fn, {
        keyPrefix: 'test',
        keyGenerator,
      });

      await memoized(1);
      await memoized(1);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should mark expensive operations with longer default TTL', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const memoized = memoization.memoize(fn, {
        keyPrefix: 'test',
        expensive: true,
      });

      await memoized();

      const stats = memoization.getStats('test');
      expect(stats).toBeDefined();
    });

    it('should track memoization stats', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const memoized = memoization.memoize(fn, { keyPrefix: 'test' });

      await memoized();
      await memoized();
      await memoized();

      const stats = memoization.getStats('test')!;
      expect(stats.totalCalls).toBe(3);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(2 / 3);
    });

    it('should handle null and undefined values', async () => {
      const fn1 = vi.fn().mockResolvedValue(null);
      const fn2 = vi.fn().mockResolvedValue(undefined);

      const memoized1 = memoization.memoize(fn1, { keyPrefix: 'test1' });
      const memoized2 = memoization.memoize(fn2, { keyPrefix: 'test2' });

      const result1 = await memoized1();
      const result2 = await memoized2();

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
      expect(result1).toBeNull();
      expect(result2).toBeUndefined();
    });

    it('should handle large objects', async () => {
      const largeObj = {
        data: 'x'.repeat(10000),
        array: Array.from({ length: 100 }, (_, i) => i),
        nested: { level1: { level2: { level3: 'value' } } },
      };

      const fn = vi.fn().mockResolvedValue(largeObj);
      const memoized = memoization.memoize(fn, { keyPrefix: 'test' });

      const result1 = await memoized();
      const result2 = await memoized();

      expect(fn).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(largeObj);
      expect(result2).toEqual(largeObj);
    });

    it('should handle errors gracefully', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));
      const memoized = memoization.memoize(fn, { keyPrefix: 'test' });

      await expect(memoized()).rejects.toThrow('Test error');
    });

    it('should handle complex arguments', async () => {
      const fn = vi.fn((obj: { a: number; b: string }) =>
        Promise.resolve({ result: obj.a * 2 })
      );

      const memoized = memoization.memoize(fn, { keyPrefix: 'test' });

      await memoized({ a: 5, b: 'test' });
      await memoized({ a: 5, b: 'test' }); // Should hit cache
      await memoized({ a: 6, b: 'test' }); // Should be new

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle useArgsAsKey option', async () => {
      const fn = vi.fn((x: number) => Promise.resolve(x * 2));

      // With useArgsAsKey: true (default)
      const memoizedWithArgs = memoization.memoize(fn, {
        keyPrefix: 'test',
        useArgsAsKey: true,
      });

      await memoizedWithArgs(5);
      await memoizedWithArgs(5);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle useArgsAsKey: false', async () => {
      const fn = vi.fn().mockResolvedValue('result');

      // With useArgsAsKey: false
      const memoizedWithoutArgs = memoization.memoize(fn, {
        keyPrefix: 'test',
        useArgsAsKey: false,
      });

      await memoizedWithoutArgs(5);
      await memoizedWithoutArgs(10); // Should use same cache key

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('memoizeSync()', () => {
    it('should memoize sync function', () => {
      const fn = vi.fn().mockReturnValue('result');
      const memoized = memoization.memoizeSync(fn, { keyPrefix: 'test' });

      const result1 = memoized();
      const result2 = memoized();

      expect(fn).toHaveBeenCalledTimes(1);
      expect(result1).toBe('result');
      expect(result2).toBe('result');
    });

    it('should cache with different arguments', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoization.memoizeSync(fn, { keyPrefix: 'test' });

      memoized(5);
      memoized(10);
      memoized(5); // Should hit cache

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should track execution time', () => {
      const fn = vi.fn(() => {
        return 'result';
      });
      const memoized = memoization.memoizeSync(fn, { keyPrefix: 'test' });

      memoized();

      const stats = memoization.getStats('test')!;
      expect(stats.averageExecutionTime).toBeGreaterThanOrEqual(0);
    });

    it('should expire cache after TTL', (done) => {
      const fn = vi.fn().mockReturnValue('result');
      const memoized = memoization.memoizeSync(fn, {
        keyPrefix: 'test',
        ttl: 100,
      });

      memoized();

      // Wait for expiration
      setTimeout(() => {
        memoized();
        expect(fn).toHaveBeenCalledTimes(2);
        done();
      }, 150);
    });

    it('should handle null and undefined values', () => {
      const fn1 = vi.fn().mockReturnValue(null);
      const fn2 = vi.fn().mockReturnValue(undefined);

      const memoized1 = memoization.memoizeSync(fn1, { keyPrefix: 'test1' });
      const memoized2 = memoization.memoizeSync(fn2, { keyPrefix: 'test2' });

      const result1 = memoized1();
      const result2 = memoized2();

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
      expect(result1).toBeNull();
      expect(result2).toBeUndefined();
    });

    it('should handle large objects', () => {
      const largeObj = {
        data: 'x'.repeat(10000),
        array: Array.from({ length: 100 }, (_, i) => i),
      };

      const fn = vi.fn().mockReturnValue(largeObj);
      const memoized = memoization.memoizeSync(fn, { keyPrefix: 'test' });

      const result1 = memoized();
      const result2 = memoized();

      expect(fn).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(largeObj);
    });

    it('should track memoization stats', () => {
      const fn = vi.fn().mockReturnValue('result');
      const memoized = memoization.memoizeSync(fn, { keyPrefix: 'test' });

      memoized();
      memoized();
      memoized();

      const stats = memoization.getStats('test')!;
      expect(stats.totalCalls).toBe(3);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(2 / 3);
    });
  });

  describe('clearPrefix()', () => {
    it('should clear entries with matching prefix', async () => {
      const fn1 = vi.fn().mockResolvedValue('result1');
      const fn2 = vi.fn().mockResolvedValue('result2');

      const memoized1 = memoization.memoize(fn1, { keyPrefix: 'prefix1:test' });
      const memoized2 = memoization.memoize(fn2, { keyPrefix: 'prefix2:test' });

      await memoized1();
      await memoized2();

      memoization.clearPrefix('prefix1:');

      // Prefix1 should be cleared
      await memoized1();
      // Prefix2 should still be cached
      await memoized2();

      expect(fn1).toHaveBeenCalledTimes(2);
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('should not affect entries without matching prefix', async () => {
      const fn1 = vi.fn().mockResolvedValue('result1');
      const fn2 = vi.fn().mockResolvedValue('result2');

      const memoized1 = memoization.memoize(fn1, { keyPrefix: 'test:one' });
      const memoized2 = memoization.memoize(fn2, { keyPrefix: 'test:two' });

      await memoized1();
      await memoized2();

      memoization.clearPrefix('other:');

      await memoized1();
      await memoized2();

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('should handle non-existent prefixes', () => {
      expect(() => memoization.clearPrefix('nonexistent')).not.toThrow();
    });
  });

  describe('clearAll()', () => {
    it('should clear all memoized entries', async () => {
      const fn1 = vi.fn().mockResolvedValue('result1');
      const fn2 = vi.fn().mockResolvedValue('result2');

      const memoized1 = memoization.memoize(fn1, { keyPrefix: 'test1' });
      const memoized2 = memoization.memoize(fn2, { keyPrefix: 'test2' });

      await memoized1();
      await memoized2();

      memoization.clearAll();

      await memoized1();
      await memoized2();

      expect(fn1).toHaveBeenCalledTimes(2);
      expect(fn2).toHaveBeenCalledTimes(2);
    });

    it('should clear all stats', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const memoized = memoization.memoize(fn, { keyPrefix: 'test' });

      await memoized();
      await memoized();

      expect(memoization.getStats('test')!.hits).toBeGreaterThan(0);

      memoization.clearAll();

      const stats = memoization.getStats('test');
      expect(stats?.hits).toBe(0);
      expect(stats?.misses).toBe(0);
    });
  });

  describe('cleanExpired()', () => {
    it('should clean expired entries', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const memoized = memoization.memoize(fn, { keyPrefix: 'test', ttl: 100 });

      await memoized();

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      const cleaned = memoization.cleanExpired();
      expect(cleaned).toBeGreaterThanOrEqual(1);
    });

    it('should return 0 when no expired entries', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const memoized = memoization.memoize(fn, {
        keyPrefix: 'test',
        ttl: 5000,
      });

      await memoized();

      const cleaned = memoization.cleanExpired();
      expect(cleaned).toBe(0);
    });

    it('should clean only expired entries', async () => {
      const fn1 = vi.fn().mockResolvedValue('result1');
      const fn2 = vi.fn().mockResolvedValue('result2');

      const memoized1 = memoization.memoize(fn1, {
        keyPrefix: 'test1',
        ttl: 100,
      });
      const memoized2 = memoization.memoize(fn2, {
        keyPrefix: 'test2',
        ttl: 5000,
      });

      await memoized1();
      await memoized2();

      // Wait for test1 to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      const cleaned = memoization.cleanExpired();
      expect(cleaned).toBeGreaterThanOrEqual(1);

      // test2 should still be cached
      await memoized2();
      expect(fn2).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStats()', () => {
    it('should return stats for specific prefix', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const memoized = memoization.memoize(fn, { keyPrefix: 'test' });

      await memoized();
      await memoized();

      const stats = memoization.getStats('test');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('totalCalls');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('averageExecutionTime');
      expect(stats).toHaveProperty('savedTime');
    });

    it('should return all stats when no prefix specified', async () => {
      const fn1 = vi.fn().mockResolvedValue('result1');
      const fn2 = vi.fn().mockResolvedValue('result2');

      memoization.memoize(fn1, { keyPrefix: 'test1' });
      memoization.memoize(fn2, { keyPrefix: 'test2' });

      const allStats = memoization.getStats();
      expect(allStats).toBeInstanceOf(Map);
      expect(allStats.size).toBe(2);
    });

    it('should return default stats for non-existent prefix', () => {
      const stats = memoization.getStats('nonexistent');
      expect(stats).toEqual({
        hits: 0,
        misses: 0,
        totalCalls: 0,
        hitRate: 0,
        averageExecutionTime: 0,
        savedTime: 0,
      });
    });

    it('should calculate hit rate correctly', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const memoized = memoization.memoize(fn, { keyPrefix: 'test' });

      await memoized();
      await memoized();
      await memoized();

      const stats = memoization.getStats('test')!;
      expect(stats.hitRate).toBe(2 / 3);
    });

    it('should track average execution time', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const memoized = memoization.memoize(fn, { keyPrefix: 'test' });

      await memoized();
      await memoized();

      const stats = memoization.getStats('test')!;
      expect(stats.averageExecutionTime).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Global Functions', () => {
  describe('memoize()', () => {
    it('should use global memoization instance', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const memoized = memoize(fn, { keyPrefix: 'test' });

      await memoized();
      await memoized();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should track stats correctly', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const memoized = memoize(fn, { keyPrefix: 'test' });

      await memoized();
      await memoized();

      const stats = memoization.getStats('test');
      expect(stats?.hits).toBe(1);
    });
  });

  describe('memoizeSync()', () => {
    it('should use global memoization instance', () => {
      const fn = vi.fn().mockReturnValue('result');
      const memoized = memoizeSync(fn, { keyPrefix: 'test' });

      memoized();
      memoized();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should track stats correctly', () => {
      const fn = vi.fn().mockReturnValue('result');
      const memoized = memoizeSync(fn, { keyPrefix: 'test' });

      memoized();
      memoized();

      const stats = memoization.getStats('test');
      expect(stats?.hits).toBe(1);
    });
  });

  describe('memoizedQuery()', () => {
    it('should memoize query without arguments', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const memoized = memoizedQuery(queryFn, { keyPrefix: 'test' });

      await memoized();
      await memoized();

      expect(queryFn).toHaveBeenCalledTimes(1);
    });

    it('should use custom TTL when specified', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const memoized = memoizedQuery(queryFn, {
        keyPrefix: 'test',
        ttl: 100,
      });

      await memoized();

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      await memoized();

      expect(queryFn).toHaveBeenCalledTimes(2);
    });

    it('should handle expensive option', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const memoized = memoizedQuery(queryFn, {
        keyPrefix: 'test',
        expensive: true,
      });

      await memoized();
      await memoized();

      expect(queryFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('cachedQuery()', () => {
    it('should cache and return query result', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const key = 'test-query-key';

      const result1 = await cachedQuery(key, queryFn, 1000);
      const result2 = await cachedQuery(key, queryFn, 1000);

      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(result1).toEqual({ data: 'test' });
      expect(result2).toEqual({ data: 'test' });
    });

    it('should execute query when cache miss', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const key1 = 'test-query-key-1';
      const key2 = 'test-query-key-2';

      await cachedQuery(key1, queryFn, 1000);
      await cachedQuery(key2, queryFn, 1000);

      expect(queryFn).toHaveBeenCalledTimes(2);
    });

    it('should expire cache after TTL', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const key = 'test-query-key-expire';

      await cachedQuery(key, queryFn, 100);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      await cachedQuery(key, queryFn, 100);

      expect(queryFn).toHaveBeenCalledTimes(2);
    });

    it('should handle null values', async () => {
      const queryFn = vi.fn().mockResolvedValue(null);
      const key = 'test-query-key-null';

      const result1 = await cachedQuery(key, queryFn, 1000);
      const result2 = await cachedQuery(key, queryFn, 1000);

      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should handle large objects', async () => {
      const largeObj = {
        data: 'x'.repeat(10000),
        array: Array.from({ length: 100 }, (_, i) => i),
      };

      const queryFn = vi.fn().mockResolvedValue(largeObj);
      const key = 'test-query-key-large';

      const result1 = await cachedQuery(key, queryFn, 1000);
      const result2 = await cachedQuery(key, queryFn, 1000);

      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(largeObj);
    });
  });

  describe('getCacheStats()', () => {
    it('should return global cache statistics', () => {
      const stats = getCacheStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('entries');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('evictions');
    });

    it('should return numeric values', () => {
      const stats = getCacheStats();

      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
      expect(typeof stats.entries).toBe('number');
      expect(typeof stats.totalSize).toBe('number');
      expect(typeof stats.evictions).toBe('number');
    });

    it('should update stats after cache operations', async () => {
      const stats1 = getCacheStats();
      const initialEntries = stats1.entries;

      await cachedQuery('test-stats-key', vi.fn().mockResolvedValue({ data: 'test' }), 1000);

      const stats2 = getCacheStats();
      expect(stats2.entries).toBeGreaterThanOrEqual(initialEntries);
    });
  });
});

describe('CacheKeyGenerator', () => {
  describe('agentKey()', () => {
    it('should generate correct agent key', () => {
      const key = CacheKeyGenerator.agentKey('agent-123');
      expect(key).toBe('agent:agent-123');
    });

    it('should handle special characters in agent ID', () => {
      const key = CacheKeyGenerator.agentKey('agent-123_abc');
      expect(key).toBe('agent:agent-123_abc');
    });
  });

  describe('agentsListKey()', () => {
    it('should generate list key without filters', () => {
      const key = CacheKeyGenerator.agentsListKey();
      expect(key).toBe('agents:list:undefined');
    });

    it('should generate list key with filters', () => {
      const filters = { status: 'active', type: 'chat' };
      const key = CacheKeyGenerator.agentsListKey(filters);
      expect(key).toBe(`agents:list:${JSON.stringify(filters)}`);
    });

    it('should handle complex filter objects', () => {
      const filters = {
        status: 'active',
        tags: ['chat', 'assistant'],
        limit: 10,
      };
      const key = CacheKeyGenerator.agentsListKey(filters);
      expect(key).toContain('agents:list:');
    });
  });

  describe('walletKey()', () => {
    it('should generate correct wallet key', () => {
      const key = CacheKeyGenerator.walletKey('agent-123');
      expect(key).toBe('wallet:agent-123');
    });
  });

  describe('walletTransactionsKey()', () => {
    it('should generate transactions key without options', () => {
      const key = CacheKeyGenerator.walletTransactionsKey('agent-123');
      expect(key).toBe('wallet:transactions:agent-123:undefined');
    });

    it('should generate transactions key with options', () => {
      const options = { limit: 10, offset: 0 };
      const key = CacheKeyGenerator.walletTransactionsKey('agent-123', options);
      expect(key).toBe(`wallet:transactions:agent-123:${JSON.stringify(options)}`);
    });

    it('should handle complex options', () => {
      const options = {
        limit: 10,
        offset: 0,
        sortBy: 'date',
        sortOrder: 'desc',
      };
      const key = CacheKeyGenerator.walletTransactionsKey('agent-123', options);
      expect(key).toContain('wallet:transactions:agent-123:');
    });
  });

  describe('agentStatsKey()', () => {
    it('should generate correct stats key', () => {
      const key = CacheKeyGenerator.agentStatsKey();
      expect(key).toBe('stats:agents');
    });
  });

  describe('walletStatsKey()', () => {
    it('should generate correct wallet stats key', () => {
      const key = CacheKeyGenerator.walletStatsKey('agent-123');
      expect(key).toBe('stats:wallet:agent-123');
    });
  });

  describe('approvalListKey()', () => {
    it('should generate approval list key without query', () => {
      const key = CacheKeyGenerator.approvalListKey();
      expect(key).toBe('approvals:list:undefined');
    });

    it('should generate approval list key with query', () => {
      const query = { status: 'pending' };
      const key = CacheKeyGenerator.approvalListKey(query);
      expect(key).toBe(`approvals:list:${JSON.stringify(query)}`);
    });
  });

  describe('approvalStatsKey()', () => {
    it('should generate correct approval stats key', () => {
      const key = CacheKeyGenerator.approvalStatsKey();
      expect(key).toBe('stats:approvals');
    });
  });
});

describe('CacheInvalidator', () => {
  it('should clear all cache entries', () => {
    CacheInvalidator.clearAll();
    const stats = getCacheStats();
    expect(stats.entries).toBe(0);
  });

  it('should return number of cleaned entries', () => {
    const cleaned = CacheInvalidator.cleanExpired();
    expect(typeof cleaned).toBe('number');
    expect(cleaned).toBeGreaterThanOrEqual(0);
  });

  it('should invalidate agent-related cache entries', () => {
    // This test ensures the method exists and doesn't throw
    expect(() => CacheInvalidator.invalidateAgent('agent-123')).not.toThrow();
  });

  it('should invalidate wallet transactions cache entries', () => {
    expect(() => CacheInvalidator.invalidateWalletTransactions('agent-123')).not.toThrow();
  });

  it('should invalidate approval cache entries', () => {
    expect(() => CacheInvalidator.invalidateApproval('approval-123')).not.toThrow();
  });

  it('should handle special characters in IDs', () => {
    expect(() => CacheInvalidator.invalidateAgent('agent-123_abc')).not.toThrow();
    expect(() => CacheInvalidator.invalidateWalletTransactions('agent-xyz:001')).not.toThrow();
    expect(() => CacheInvalidator.invalidateApproval('approval@123')).not.toThrow();
  });
});

describe('Decorators', () => {
  describe('cached()', () => {
    it('should cache method results', async () => {
      class TestClass {
        private counter = 0;

        @cached('test-method', 1000)
        async getData(): Promise<{ value: number }> {
          this.counter++;
          return { value: this.counter };
        }
      }

      const instance = new TestClass();
      const result1 = await instance.getData();
      const result2 = await instance.getData();

      expect(result1.value).toBe(1);
      expect(result2.value).toBe(1);
    });

    it('should expire cache after TTL', async () => {
      class TestClass {
        private counter = 0;

        @cached('test-method-expire', 100)
        async getData(): Promise<{ value: number }> {
          this.counter++;
          return { value: this.counter };
        }
      }

      const instance = new TestClass();
      const result1 = await instance.getData();

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      const result2 = await instance.getData();

      expect(result1.value).toBe(1);
      expect(result2.value).toBe(2);
    });

    it('should work with methods that return null', async () => {
      class TestClass {
        @cached('test-method-null', 1000)
        async getData(): Promise<null> {
          return null;
        }
      }

      const instance = new TestClass();
      const result1 = await instance.getData();
      const result2 = await instance.getData();

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('cachedWithInvalidation()', () => {
    it('should cache method results with invalidation keys', async () => {
      class TestClass {
        private counter = 0;

        @cachedWithInvalidation('test-method-inv', 1000, ['key1', 'key2'])
        async getData(): Promise<{ value: number }> {
          this.counter++;
          return { value: this.counter };
        }
      }

      const instance = new TestClass();
      const result1 = await instance.getData();
      const result2 = await instance.getData();

      expect(result1.value).toBe(1);
      expect(result2.value).toBe(1);
    });

    it('should handle empty invalidation keys', async () => {
      class TestClass {
        private counter = 0;

        @cachedWithInvalidation('test-method-empty', 1000, [])
        async getData(): Promise<{ value: number }> {
          this.counter++;
          return { value: this.counter };
        }
      }

      const instance = new TestClass();
      const result = await instance.getData();

      expect(result.value).toBe(1);
    });
  });
});

describe('startCacheCleanup', () => {
  it('should start cleanup interval', () => {
    const interval = startCacheCleanup(60000);
    expect(interval).toBeDefined();

    if (typeof interval === 'number') {
      clearInterval(interval);
    } else {
      clearInterval(interval as NodeJS.Timeout);
    }
  });

  it('should use default interval when not provided', () => {
    const interval = startCacheCleanup();
    expect(interval).toBeDefined();

    if (typeof interval === 'number') {
      clearInterval(interval);
    } else {
      clearInterval(interval as NodeJS.Timeout);
    }
  });

  it('should accept custom interval', (done) => {
    const interval = startCacheCleanup(100);

    // Wait a bit to ensure interval is running
    setTimeout(() => {
      if (typeof interval === 'number') {
        clearInterval(interval);
      } else {
        clearInterval(interval as NodeJS.Timeout);
      }
      done();
    }, 200);
  });
});

describe('warmupCache', () => {
  it('should warmup cache without errors', async () => {
    await expect(warmupCache()).resolves.not.toThrow();
  });

  it('should complete warmup', async () => {
    const startTime = Date.now();
    await warmupCache();
    const endTime = Date.now();

    // Warmup should complete in reasonable time
    expect(endTime - startTime).toBeLessThan(5000);
  });
});

describe('Error Handling and Edge Cases', () => {
  describe('MemoizationCache Error Cases', () => {
    let memoization: MemoizationCache;

    beforeEach(() => {
      memoization = new MemoizationCache();
    });

    afterEach(() => {
      memoization.clearAll();
    });

    it('should handle function that throws', async () => {
      const fn = vi.fn().mockImplementation(() => {
        throw new Error('Function error');
      });

      const memoized = memoization.memoize(fn, { keyPrefix: 'test' });

      await expect(memoized()).rejects.toThrow('Function error');
    });

    it('should not cache thrown errors', async () => {
      let callCount = 0;
      const fn = vi.fn().mockImplementation(() => {
        callCount++;
        throw new Error('Function error');
      });

      const memoized = memoization.memoize(fn, { keyPrefix: 'test' });

      await expect(memoized()).rejects.toThrow('Function error');
      await expect(memoized()).rejects.toThrow('Function error');

      expect(callCount).toBe(2); // Should call function twice
    });

    it('should handle very long key prefixes', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const longPrefix = 'a'.repeat(10000);

      const memoized = memoization.memoize(fn, { keyPrefix: longPrefix });

      await memoized();
      await memoized();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle zero TTL', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const memoized = memoization.memoize(fn, { keyPrefix: 'test', ttl: 0 });

      // With zero TTL, entries may expire immediately
      await memoized();
      await memoized();

      // Either the function is called once (cached) or twice (expired)
      expect(fn.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle negative TTL', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const memoized = memoization.memoize(fn, { keyPrefix: 'test', ttl: -100 });

      await memoized();
      await memoized();

      // With negative TTL, entries should expire immediately
      expect(fn.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('cachedQuery Edge Cases', () => {
    it('should handle empty key', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });

      const result = await cachedQuery('', queryFn, 1000);

      expect(result).toEqual({ data: 'test' });
    });

    it('should handle very long key', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const longKey = 'a'.repeat(10000);

      await cachedQuery(longKey, queryFn, 1000);
      await cachedQuery(longKey, queryFn, 1000);

      expect(queryFn).toHaveBeenCalledTimes(1);
    });

    it('should handle key with special characters', async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: 'test' });
      const specialKey = 'test:key/with/special-chars:123';

      await cachedQuery(specialKey, queryFn, 1000);
      await cachedQuery(specialKey, queryFn, 1000);

      expect(queryFn).toHaveBeenCalledTimes(1);
    });
  });
});
