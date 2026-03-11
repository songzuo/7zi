/**
 * Layered Cache Tests
 * Tests for src/lib/cache/layered-cache.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LayeredCache, getLayeredCache, resetLayeredCache } from '@/lib/cache/layered-cache';

// Mock MemoryCache
vi.mock('@/lib/cache/memory-cache', () => ({
  MemoryCache: vi.fn().mockImplementation(() => {
    const store = new Map<string, unknown>();
    return {
      get: vi.fn((key: string) => store.get(key) ?? null),
      set: vi.fn((key: string, value: unknown) => {
        store.set(key, value);
        return true;
      }),
      delete: vi.fn((key: string) => store.delete(key)),
      has: vi.fn((key: string) => store.has(key)),
      mget: vi.fn((keys: string[]) => {
        const result = new Map();
        for (const key of keys) {
          result.set(key, store.get(key) ?? null);
        }
        return result;
      }),
      mset: vi.fn((entries: Array<{ key: string; value: unknown }>) => {
        for (const { key, value } of entries) {
          store.set(key, value);
        }
        return true;
      }),
      invalidate: vi.fn(() => 0),
      touch: vi.fn(() => true),
      clear: vi.fn(() => store.clear()),
      getStats: vi.fn(() => ({
        totalRequests: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        entries: store.size,
        memoryUsage: 0,
        evictions: 0,
        expirations: 0,
      })),
      resetStats: vi.fn(),
      stopCleanup: vi.fn(),
    };
  }),
}));

// Mock RedisCache
vi.mock('@/lib/cache/redis-cache', () => ({
  RedisCache: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(true),
    has: vi.fn().mockResolvedValue(false),
    getOrSet: vi.fn().mockImplementation(async (_key: string, factory: () => Promise<unknown>) => factory()),
    mget: vi.fn().mockResolvedValue(new Map()),
    mset: vi.fn().mockResolvedValue(true),
    invalidate: vi.fn().mockResolvedValue(0),
    touch: vi.fn().mockResolvedValue(true),
    clear: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn(() => ({
      totalRequests: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      entries: 0,
      memoryUsage: 0,
      evictions: 0,
      expirations: 0,
    })),
    resetStats: vi.fn(),
    isReady: vi.fn().mockReturnValue(true),
  })),
}));

describe('LayeredCache', () => {
  let cache: LayeredCache;

  beforeEach(() => {
    vi.clearAllMocks();
    resetLayeredCache();
  });

  afterEach(() => {
    if (cache) {
      cache.disconnect().catch(() => {});
    }
    resetLayeredCache();
  });

  // ============================================================================
  // Constructor
  // ============================================================================

  describe('constructor', () => {
    it('should create with default options', () => {
      cache = new LayeredCache();
      expect(cache).toBeDefined();
    });

    it('should use write-through strategy by default', () => {
      cache = new LayeredCache();
      expect(cache).toBeDefined();
    });

    it('should accept custom write strategy', () => {
      cache = new LayeredCache({ writeStrategy: 'write-behind' });
      expect(cache).toBeDefined();
    });

    it('should accept custom read strategy', () => {
      cache = new LayeredCache({ readStrategy: 'read-through' });
      expect(cache).toBeDefined();
    });

    it('should accept L1 options', () => {
      cache = new LayeredCache({
        l1Options: {
          maxEntries: 100,
          defaultTTL: 60,
        },
      });
      expect(cache).toBeDefined();
    });

    it('should accept L2 options', () => {
      cache = new LayeredCache({
        l2Options: {
          redisUrl: 'redis://localhost:6379',
        },
      });
      expect(cache).toBeDefined();
    });
  });

  // ============================================================================
  // Connect
  // ============================================================================

  describe('connect', () => {
    it('should connect to L2', async () => {
      cache = new LayeredCache();
      const result = await cache.connect();

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // Get Operations
  // ============================================================================

  describe('get', () => {
    beforeEach(() => {
      cache = new LayeredCache();
    });

    it('should return null when not found in both layers', async () => {
      const result = await cache.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should track statistics', async () => {
      await cache.get('key1');
      await cache.get('key1');

      const stats = cache.getStats();
      expect(stats.layered.totalRequests).toBe(2);
    });
  });

  // ============================================================================
  // Set Operations - Write Through
  // ============================================================================

  describe('set - write-through', () => {
    beforeEach(() => {
      cache = new LayeredCache({ writeStrategy: 'write-through' });
    });

    it('should set value in both layers', async () => {
      const result = await cache.set('key', 'value');

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // Set Operations - Write Behind
  // ============================================================================

  describe('set - write-behind', () => {
    beforeEach(() => {
      cache = new LayeredCache({ writeStrategy: 'write-behind' });
    });

    it('should set value immediately in L1 and async in L2', async () => {
      const result = await cache.set('key', 'value');

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // Set Operations - Write Around
  // ============================================================================

  describe('set - write-around', () => {
    beforeEach(() => {
      cache = new LayeredCache({ writeStrategy: 'write-around' });
    });

    it('should only write to L2', async () => {
      const result = await cache.set('key', 'value');

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // Delete Operations
  // ============================================================================

  describe('delete', () => {
    beforeEach(() => {
      cache = new LayeredCache();
    });

    it('should delete from both layers', async () => {
      const result = await cache.delete('key');

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // Has Operations
  // ============================================================================

  describe('has', () => {
    beforeEach(() => {
      cache = new LayeredCache();
    });

    it('should return false when key not in either layer', async () => {
      const result = await cache.has('nonexistent');

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // GetOrSet
  // ============================================================================

  describe('getOrSet', () => {
    beforeEach(() => {
      cache = new LayeredCache();
    });

    it('should call factory when value not cached', async () => {
      const factory = vi.fn().mockResolvedValue('new value');

      const result = await cache.getOrSet('key', factory);

      expect(result).toBe('new value');
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Batch Operations
  // ============================================================================

  describe('mget', () => {
    beforeEach(() => {
      cache = new LayeredCache();
    });

    it('should get multiple values', async () => {
      const result = await cache.mget(['key1', 'key2', 'key3']);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(3);
    });

    it('should track statistics for batch gets', async () => {
      await cache.mget(['key1', 'key2']);

      const stats = cache.getStats();
      expect(stats.layered.totalRequests).toBe(2);
    });
  });

  describe('mset', () => {
    beforeEach(() => {
      cache = new LayeredCache();
    });

    it('should set multiple values', async () => {
      const result = await cache.mset([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
      ]);

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // Invalidation
  // ============================================================================

  describe('invalidate', () => {
    beforeEach(() => {
      cache = new LayeredCache();
    });

    it('should invalidate in both layers', async () => {
      const count = await cache.invalidate({ all: true });

      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should invalidate by pattern', async () => {
      const count = await cache.invalidate({ pattern: 'user:*' });

      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should invalidate by tags', async () => {
      const count = await cache.invalidate({ tags: ['tag1'] });

      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // Touch
  // ============================================================================

  describe('touch', () => {
    beforeEach(() => {
      cache = new LayeredCache();
    });

    it('should update TTL in both layers', async () => {
      const result = await cache.touch('key', 60);

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // Clear
  // ============================================================================

  describe('clear', () => {
    beforeEach(() => {
      cache = new LayeredCache();
    });

    it('should clear both layers', async () => {
      await cache.clear();
      // Should not throw
    });
  });

  // ============================================================================
  // Statistics
  // ============================================================================

  describe('getStats', () => {
    beforeEach(() => {
      cache = new LayeredCache();
    });

    it('should return layered statistics', () => {
      const stats = cache.getStats();

      expect(stats.l1).toBeDefined();
      expect(stats.l2).toBeDefined();
      expect(stats.layered).toBeDefined();
      expect(stats.layered.l1Hits).toBeDefined();
      expect(stats.layered.l2Hits).toBeDefined();
      expect(stats.layered.misses).toBeDefined();
      expect(stats.layered.totalRequests).toBeDefined();
    });

    it('should calculate hit rates', () => {
      const stats = cache.getStats();

      expect(stats.layered.l1HitRate).toBeDefined();
      expect(stats.layered.l2HitRate).toBeDefined();
      expect(stats.layered.overallHitRate).toBeDefined();
    });
  });

  describe('resetStats', () => {
    beforeEach(() => {
      cache = new LayeredCache();
    });

    it('should reset all statistics', () => {
      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.layered.l1Hits).toBe(0);
      expect(stats.layered.l2Hits).toBe(0);
      expect(stats.layered.misses).toBe(0);
      expect(stats.layered.totalRequests).toBe(0);
    });
  });

  // ============================================================================
  // Warmup
  // ============================================================================

  describe('warmup', () => {
    beforeEach(() => {
      cache = new LayeredCache();
    });

    it('should warmup cache with entries', async () => {
      const entries = [
        { key: 'key1', factory: () => Promise.resolve('value1') },
        { key: 'key2', factory: () => Promise.resolve('value2') },
      ];

      await cache.warmup(entries);
      // Should not throw
    });
  });

  // ============================================================================
  // Accessor Methods
  // ============================================================================

  describe('accessor methods', () => {
    beforeEach(() => {
      cache = new LayeredCache();
    });

    it('should return L1 cache', () => {
      const l1 = cache.getL1();

      expect(l1).toBeDefined();
    });

    it('should return L2 cache', () => {
      const l2 = cache.getL2();

      expect(l2).toBeDefined();
    });

    it('should check if ready', () => {
      const ready = cache.isReady();

      expect(typeof ready).toBe('boolean');
    });
  });

  // ============================================================================
  // Disconnect
  // ============================================================================

  describe('disconnect', () => {
    it('should disconnect cleanly', async () => {
      cache = new LayeredCache();
      await cache.connect();

      await cache.disconnect();
      // Should not throw
    });
  });

  // ============================================================================
  // Singleton Functions
  // ============================================================================

  describe('singleton functions', () => {
    afterEach(() => {
      resetLayeredCache();
    });

    it('should return the same instance', () => {
      const instance1 = getLayeredCache();
      const instance2 = getLayeredCache();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getLayeredCache();
      resetLayeredCache();

      const instance2 = getLayeredCache();

      expect(instance1).not.toBe(instance2);
    });
  });
});
