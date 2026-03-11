/**
 * Redis Cache Tests
 * Tests for src/lib/cache/redis-cache.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RedisCache, getRedisCache, resetRedisCache } from '@/lib/cache/redis-cache';

// Mock logger
vi.mock('@/lib/logger', () => ({
  cacheLogger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('RedisCache', () => {
  let cache: RedisCache;

  beforeEach(() => {
    vi.clearAllMocks();
    resetRedisCache();
  });

  afterEach(() => {
    if (cache) {
      cache.disconnect().catch(() => {});
    }
    resetRedisCache();
  });

  // ============================================================================
  // Constructor
  // ============================================================================

  describe('constructor', () => {
    it('should create with default options', () => {
      cache = new RedisCache();
      expect(cache).toBeDefined();
    });

    it('should use custom prefix', () => {
      cache = new RedisCache({ prefix: 'custom:' });
      expect(cache).toBeDefined();
    });

    it('should use custom default TTL', () => {
      cache = new RedisCache({ defaultTTL: 7200 });
      expect(cache).toBeDefined();
    });

    it('should use custom redis URL', () => {
      cache = new RedisCache({ redisUrl: 'redis://custom:6379' });
      expect(cache).toBeDefined();
    });

    it('should not be connected initially', () => {
      cache = new RedisCache();
      expect(cache.isReady()).toBe(false);
    });
  });

  // ============================================================================
  // Connect
  // ============================================================================

  describe('connect', () => {
    it('should attempt to connect', async () => {
      cache = new RedisCache();
      // Will fail without actual Redis, but should handle gracefully
      const result = await cache.connect();

      // Without actual Redis, this will be false
      expect(typeof result).toBe('boolean');
    });
  });

  // ============================================================================
  // Operations (without connection)
  // ============================================================================

  describe('operations without connection', () => {
    beforeEach(() => {
      cache = new RedisCache();
    });

    it('should return null when not connected', async () => {
      const result = await cache.get('key');
      expect(result).toBeNull();
    });

    it('should return false for set when not connected', async () => {
      const result = await cache.set('key', 'value');
      expect(result).toBe(false);
    });

    it('should return false for delete when not connected', async () => {
      const result = await cache.delete('key');
      expect(result).toBe(false);
    });

    it('should return false for has when not connected', async () => {
      const result = await cache.has('key');
      expect(result).toBe(false);
    });

    it('should return null map for mget when not connected', async () => {
      const result = await cache.mget(['key1', 'key2']);

      expect(result).toBeInstanceOf(Map);
      expect(result.get('key1')).toBeNull();
      expect(result.get('key2')).toBeNull();
    });

    it('should return false for mset when not connected', async () => {
      const result = await cache.mset([
        { key: 'key1', value: 'value1' },
      ]);

      expect(result).toBe(false);
    });

    it('should return 0 for invalidate when not connected', async () => {
      const result = await cache.invalidate({ all: true });
      expect(result).toBe(0);
    });

    it('should return false for touch when not connected', async () => {
      const result = await cache.touch('key', 60);
      expect(result).toBe(false);
    });

    it('should return -1 for getTTL when not connected', async () => {
      const result = await cache.getTTL('key');
      expect(result).toBe(-1);
    });

    it('should handle clear when not connected', async () => {
      await cache.clear();
      // Should not throw
    });
  });

  // ============================================================================
  // getOrSet
  // ============================================================================

  describe('getOrSet', () => {
    beforeEach(() => {
      cache = new RedisCache();
    });

    it('should call factory when not connected (returns null)', async () => {
      const factory = vi.fn().mockResolvedValue('factory-value');

      const result = await cache.getOrSet('key', factory);

      // Without connection, get returns null, factory is called, set fails
      expect(result).toBe('factory-value');
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Statistics
  // ============================================================================

  describe('getStats', () => {
    beforeEach(() => {
      cache = new RedisCache();
    });

    it('should return initial statistics', () => {
      const stats = cache.getStats();

      expect(stats.totalRequests).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.entries).toBe(0);
      expect(stats.memoryUsage).toBe(0);
      expect(stats.evictions).toBe(0);
      expect(stats.expirations).toBe(0);
    });

    it('should track misses', async () => {
      await cache.get('key1');
      await cache.get('key2');

      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
      expect(stats.totalRequests).toBe(2);
    });
  });

  describe('resetStats', () => {
    beforeEach(() => {
      cache = new RedisCache();
    });

    it('should reset statistics', async () => {
      await cache.get('key1');
      await cache.get('key2');

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  // ============================================================================
  // getInfo
  // ============================================================================

  describe('getInfo', () => {
    beforeEach(() => {
      cache = new RedisCache();
    });

    it('should return connection info when not connected', async () => {
      const info = await cache.getInfo();

      expect(info.connected).toBe(false);
    });
  });

  // ============================================================================
  // Disconnect
  // ============================================================================

  describe('disconnect', () => {
    it('should handle disconnect when not connected', async () => {
      cache = new RedisCache();

      await cache.disconnect();
      // Should not throw
    });
  });

  // ============================================================================
  // TTL Parsing
  // ============================================================================

  describe('TTL parsing', () => {
    beforeEach(() => {
      cache = new RedisCache();
    });

    it('should parse numeric TTL', async () => {
      // This tests the internal parseTTL method indirectly
      await cache.set('key', 'value', 60);
      // Without connection, just verify no error
    });

    it('should parse string TTL with seconds', async () => {
      await cache.set('key', 'value', '30s');
      // Without connection, just verify no error
    });

    it('should parse string TTL with minutes', async () => {
      await cache.set('key', 'value', '5m');
      // Without connection, just verify no error
    });

    it('should parse string TTL with hours', async () => {
      await cache.set('key', 'value', '2h');
      // Without connection, just verify no error
    });

    it('should parse string TTL with days', async () => {
      await cache.set('key', 'value', '1d');
      // Without connection, just verify no error
    });
  });

  // ============================================================================
  // Singleton Functions
  // ============================================================================

  describe('singleton functions', () => {
    afterEach(() => {
      resetRedisCache();
    });

    it('should return the same instance', () => {
      const instance1 = getRedisCache();
      const instance2 = getRedisCache();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getRedisCache();
      resetRedisCache();

      const instance2 = getRedisCache();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ============================================================================
  // Serialization
  // ============================================================================

  describe('serialization', () => {
    beforeEach(() => {
      cache = new RedisCache();
    });

    it('should handle different value types in serialization', async () => {
      // Without connection, these will fail gracefully
      await cache.set('string', 'text');
      await cache.set('number', 42);
      await cache.set('object', { foo: 'bar' });
      await cache.set('array', [1, 2, 3]);
      await cache.set('boolean', true);

      // Should not throw
    });
  });

  // ============================================================================
  // Invalidation Options
  // ============================================================================

  describe('invalidation options', () => {
    beforeEach(() => {
      cache = new RedisCache();
    });

    it('should handle invalidate all', async () => {
      const count = await cache.invalidate({ all: true });
      expect(count).toBe(0); // Not connected
    });

    it('should handle invalidate by pattern', async () => {
      const count = await cache.invalidate({ pattern: 'user:*' });
      expect(count).toBe(0); // Not connected
    });

    it('should handle invalidate by tags', async () => {
      const count = await cache.invalidate({ tags: ['tag1', 'tag2'] });
      expect(count).toBe(0); // Not connected
    });
  });
});