/**
 * Cache Manager Tests
 * Tests for src/lib/cache/cache-manager.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CacheManager,
  getCacheManager,
  resetCacheManager,
  cache,
} from '@/lib/cache/cache-manager';

// Mock logger
vi.mock('@/lib/logger', () => ({
  cacheLogger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  createLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('CacheManager', () => {
  let manager: CacheManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    resetCacheManager();
  });

  afterEach(() => {
    if (manager) {
      manager.shutdown().catch(() => {});
    }
    vi.useRealTimers();
    resetCacheManager();
  });

  // ============================================================================
  // Constructor and Initialization
  // ============================================================================

  describe('constructor', () => {
    it('should create memory cache by default', () => {
      manager = new CacheManager();
      expect(manager.getProvider()).toBe('memory');
    });

    it('should create memory cache when provider is memory', () => {
      manager = new CacheManager({ provider: 'memory' });
      expect(manager.getProvider()).toBe('memory');
    });

    it('should create memory cache when provider is redis (redis not supported)', () => {
      // Redis cache is currently disabled, falls back to memory
      manager = new CacheManager({ provider: 'redis' });
      expect(manager.getProvider()).toBe('memory');
    });

    it('should create memory cache when provider is layered (layered not supported)', () => {
      // Layered cache is currently disabled, falls back to memory
      manager = new CacheManager({ provider: 'layered' });
      expect(manager.getProvider()).toBe('memory');
    });

    it('should pass memory options to memory cache', () => {
      manager = new CacheManager({
        provider: 'memory',
        memory: {
          maxEntries: 500,
          defaultTTL: 300,
        },
      });

      const cache = manager.getCache();
      expect(cache).toBeDefined();
    });

    it('should not be initialized by default', () => {
      manager = new CacheManager();
      expect(manager.isInitialized()).toBe(false);
    });
  });

  // ============================================================================
  // Initialize
  // ============================================================================

  describe('initialize', () => {
    it('should initialize memory cache immediately', async () => {
      manager = new CacheManager({ provider: 'memory' });
      const result = await manager.initialize();

      expect(result).toBe(true);
      expect(manager.isInitialized()).toBe(true);
    });

    it('should return true if already initialized', async () => {
      manager = new CacheManager({ provider: 'memory' });
      await manager.initialize();
      const result = await manager.initialize();

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // Memory Cache Operations
  // ============================================================================

  describe('memory cache operations', () => {
    beforeEach(() => {
      manager = new CacheManager({ provider: 'memory' });
    });

    describe('get and set', () => {
      it('should set and get a value', async () => {
        await manager.set('key1', 'value1');
        const result = await manager.get('key1');

        expect(result).toBe('value1');
      });

      it('should return null for non-existent key', async () => {
        const result = await manager.get('nonexistent');

        expect(result).toBeNull();
      });

      it('should handle different value types', async () => {
        await manager.set('string', 'text');
        await manager.set('number', 42);
        await manager.set('object', { foo: 'bar' });
        await manager.set('array', [1, 2, 3]);

        expect(await manager.get('string')).toBe('text');
        expect(await manager.get('number')).toBe(42);
        expect(await manager.get('object')).toEqual({ foo: 'bar' });
        expect(await manager.get('array')).toEqual([1, 2, 3]);
      });
    });

    describe('delete', () => {
      it('should delete a key', async () => {
        await manager.set('key', 'value');
        const deleted = await manager.delete('key');
        const result = await manager.get('key');

        expect(deleted).toBe(true);
        expect(result).toBeNull();
      });

      it('should return false for non-existent key', async () => {
        const deleted = await manager.delete('nonexistent');

        expect(deleted).toBe(false);
      });
    });

    describe('has', () => {
      it('should return true for existing key', async () => {
        await manager.set('key', 'value');
        const result = await manager.has('key');

        expect(result).toBe(true);
      });

      it('should return false for non-existent key', async () => {
        const result = await manager.has('nonexistent');

        expect(result).toBe(false);
      });
    });

    describe('getOrSet', () => {
      it('should return cached value when exists', async () => {
        await manager.set('key', 'cached');
        const factory = vi.fn().mockResolvedValue('new value');

        const result = await manager.getOrSet('key', factory);

        expect(result).toBe('cached');
        expect(factory).not.toHaveBeenCalled();
      });

      it('should call factory when value not cached', async () => {
        const factory = vi.fn().mockResolvedValue('new value');

        const result = await manager.getOrSet('key', factory);

        expect(result).toBe('new value');
        expect(factory).toHaveBeenCalledTimes(1);
        expect(await manager.get('key')).toBe('new value');
      });

      it('should pass TTL and tags to set', async () => {
        const factory = vi.fn().mockResolvedValue('value');

        await manager.getOrSet('key', factory, 60, ['tag1']);

        expect(factory).toHaveBeenCalled();
      });
    });

    describe('batch operations', () => {
      it('should get multiple values', async () => {
        await manager.set('key1', 'value1');
        await manager.set('key2', 'value2');

        const result = await manager.mget(['key1', 'key2', 'key3']);

        expect(result.get('key1')).toBe('value1');
        expect(result.get('key2')).toBe('value2');
        expect(result.get('key3')).toBeNull();
      });

      it('should set multiple values', async () => {
        const success = await manager.mset([
          { key: 'key1', value: 'value1' },
          { key: 'key2', value: 'value2' },
        ]);

        expect(success).toBe(true);
        expect(await manager.get('key1')).toBe('value1');
        expect(await manager.get('key2')).toBe('value2');
      });
    });

    describe('invalidate', () => {
      it('should invalidate all entries', async () => {
        await manager.set('key1', 'value1');
        await manager.set('key2', 'value2');

        const count = await manager.invalidate({ all: true });

        expect(count).toBe(2);
        expect(await manager.get('key1')).toBeNull();
        expect(await manager.get('key2')).toBeNull();
      });

      it('should invalidate by pattern', async () => {
        await manager.set('user:1', 'value1');
        await manager.set('user:2', 'value2');
        await manager.set('product:1', 'value3');

        const count = await manager.invalidate({ pattern: 'user:*' });

        expect(count).toBe(2);
        expect(await manager.get('user:1')).toBeNull();
        expect(await manager.get('product:1')).toBe('value3');
      });

      it('should invalidate by tags', async () => {
        await manager.set('key1', 'value1', undefined, ['tag1']);
        await manager.set('key2', 'value2', undefined, ['tag1']);
        await manager.set('key3', 'value3', undefined, ['tag2']);

        const count = await manager.invalidate({ tags: ['tag1'] });

        expect(count).toBe(2);
        expect(await manager.get('key1')).toBeNull();
        expect(await manager.get('key2')).toBeNull();
        expect(await manager.get('key3')).toBe('value3');
      });
    });

    describe('touch', () => {
      it('should update TTL for existing key', async () => {
        await manager.set('key', 'value', 1);

        vi.advanceTimersByTime(500);
        const touched = await manager.touch('key', 2);

        expect(touched).toBe(true);
      });

      it('should return false for non-existent key', async () => {
        const touched = await manager.touch('nonexistent', 60);

        expect(touched).toBe(false);
      });
    });

    describe('clear', () => {
      it('should clear all entries', async () => {
        await manager.set('key1', 'value1');
        await manager.set('key2', 'value2');

        await manager.clear();

        expect(await manager.get('key1')).toBeNull();
        expect(await manager.get('key2')).toBeNull();
      });
    });

    describe('stats', () => {
      it('should return cache statistics', async () => {
        await manager.set('key', 'value');
        await manager.get('key');
        await manager.get('nonexistent');

        const stats = manager.getStats();

        expect(stats.totalRequests).toBe(2);
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);
      });

      it('should reset statistics', async () => {
        await manager.set('key', 'value');
        await manager.get('key');
        manager.resetStats();

        const stats = manager.getStats();

        expect(stats.totalRequests).toBe(0);
        expect(stats.hits).toBe(0);
      });
    });
  });

  // ============================================================================
  // Shutdown
  // ============================================================================

  describe('shutdown', () => {
    it('should shutdown memory cache', async () => {
      manager = new CacheManager({ provider: 'memory' });
      await manager.initialize();

      await manager.shutdown();

      expect(manager.isInitialized()).toBe(false);
    });

    it('should be safe to call multiple times', async () => {
      manager = new CacheManager({ provider: 'memory' });
      await manager.initialize();

      await manager.shutdown();
      await manager.shutdown();

      expect(manager.isInitialized()).toBe(false);
    });
  });

  // ============================================================================
  // Singleton Functions
  // ============================================================================

  describe('singleton functions', () => {
    afterEach(() => {
      resetCacheManager();
    });

    it('should return the same instance', () => {
      const instance1 = getCacheManager();
      const instance2 = getCacheManager();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', async () => {
      const instance1 = getCacheManager();
      await instance1.set('key', 'value');

      resetCacheManager();

      const instance2 = getCacheManager();
      await expect(instance2.get('key')).resolves.toBeNull();
    });
  });

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  describe('convenience methods', () => {
    beforeEach(() => {
      resetCacheManager();
    });

    afterEach(() => {
      resetCacheManager();
    });

    it('should get value using cache.get', async () => {
      await cache.set('key', 'value');
      const result = await cache.get('key');

      expect(result).toBe('value');
    });

    it('should set value using cache.set', async () => {
      const result = await cache.set('key', 'value', 60, ['tag1']);

      expect(result).toBe(true);
    });

    it('should delete value using cache.delete', async () => {
      await cache.set('key', 'value');
      const result = await cache.delete('key');

      expect(result).toBe(true);
    });

    it('should check existence using cache.has', async () => {
      await cache.set('key', 'value');
      const result = await cache.has('key');

      expect(result).toBe(true);
    });

    it('should get or set using cache.getOrSet', async () => {
      const factory = vi.fn().mockResolvedValue('new value');
      const result = await cache.getOrSet('key', factory);

      expect(result).toBe('new value');
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should invalidate using cache.invalidate', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const count = await cache.invalidate({ all: true });

      expect(count).toBe(2);
    });

    it('should clear using cache.clear', async () => {
      await cache.set('key', 'value');
      await cache.clear();

      const result = await cache.get('key');
      expect(result).toBeNull();
    });

    it('should get stats using cache.getStats', () => {
      const stats = cache.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalRequests).toBeDefined();
    });
  });

  // ============================================================================
  // Provider Access
  // ============================================================================

  describe('provider access', () => {
    it('should return provider type', () => {
      manager = new CacheManager({ provider: 'memory' });

      expect(manager.getProvider()).toBe('memory');
    });

    it('should return underlying cache instance', () => {
      manager = new CacheManager({ provider: 'memory' });

      const cacheInstance = manager.getCache();

      expect(cacheInstance).toBeDefined();
    });
  });
});
