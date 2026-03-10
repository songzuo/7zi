/**
 * 内存缓存测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryCache, getMemoryCache, resetMemoryCache } from '@/lib/cache/memory-cache';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new MemoryCache();
  });

  afterEach(() => {
    cache.stopCleanup();
    vi.useRealTimers();
  });

  // ============================================================================
  // Basic Operations
  // ============================================================================

  describe('get and set', () => {
    it('sets and gets a value correctly', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('returns null for non-existent key', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('handles different value types', () => {
      cache.set('string', 'text');
      cache.set('number', 42);
      cache.set('object', { foo: 'bar' });
      cache.set('array', [1, 2, 3]);
      cache.set('boolean', true);

      expect(cache.get('string')).toBe('text');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('object')).toEqual({ foo: 'bar' });
      expect(cache.get('array')).toEqual([1, 2, 3]);
      expect(cache.get('boolean')).toBe(true);
    });

    it('overwrites existing values', () => {
      cache.set('key', 'value1');
      cache.set('key', 'value2');
      expect(cache.get('key')).toBe('value2');
    });
  });

  // ============================================================================
  // TTL Tests
  // ============================================================================

  describe('TTL', () => {
    it('expires entries after TTL (number)', () => {
      cache.set('key', 'value', 1); // 1 second
      expect(cache.get('key')).toBe('value');

      vi.advanceTimersByTime(1500);
      expect(cache.get('key')).toBeNull();
    });

    it('expires entries after TTL (string format)', () => {
      cache.set('key1', 'value1', '30s');
      cache.set('key2', 'value2', '5m');
      cache.set('key3', 'value3', '2h');
      cache.set('key4', 'value4', '1d');

      expect(cache.get('key1')).toBe('value1');

      vi.advanceTimersByTime(31 * 1000);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });

    it('uses default TTL when not specified', () => {
      const customCache = new MemoryCache({ defaultTTL: 2 }); // 2 seconds
      customCache.set('key', 'value');

      vi.advanceTimersByTime(1500);
      expect(customCache.get('key')).toBe('value');

      vi.advanceTimersByTime(1000);
      expect(customCache.get('key')).toBeNull();

      customCache.stopCleanup();
    });

    it('updates TTL with touch method', () => {
      cache.set('key', 'value', 1);

      vi.advanceTimersByTime(500);
      expect(cache.touch('key', 2)).toBe(true); // Extend to 2 seconds

      vi.advanceTimersByTime(1000);
      expect(cache.get('key')).toBe('value'); // Still valid

      vi.advanceTimersByTime(1500);
      expect(cache.get('key')).toBeNull();
    });
  });

  // ============================================================================
  // Delete and Has
  // ============================================================================

  describe('delete and has', () => {
    it('deletes a key correctly', () => {
      cache.set('key', 'value');
      expect(cache.delete('key')).toBe(true);
      expect(cache.get('key')).toBeNull();
    });

    it('returns false when deleting non-existent key', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('checks existence correctly', () => {
      cache.set('key', 'value');
      expect(cache.has('key')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('returns false for expired entries', () => {
      cache.set('key', 'value', 1);
      vi.advanceTimersByTime(1500);
      expect(cache.has('key')).toBe(false);
    });
  });

  // ============================================================================
  // Clear and Size
  // ============================================================================

  describe('clear and size', () => {
    it('clears all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
    });

    it('returns correct size', () => {
      expect(cache.size()).toBe(0);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });

    it('lists all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.keys()).toEqual(expect.arrayContaining(['key1', 'key2']));
    });
  });

  // ============================================================================
  // Batch Operations
  // ============================================================================

  describe('mget and mset', () => {
    it('sets multiple values at once', () => {
      cache.mset([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
      ]);
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
    });

    it('gets multiple values at once', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      const result = cache.mget(['key1', 'key2', 'key3']);
      expect(result.get('key1')).toBe('value1');
      expect(result.get('key2')).toBe('value2');
      expect(result.get('key3')).toBeNull();
    });
  });

  // ============================================================================
  // getOrSet
  // ============================================================================

  describe('getOrSet', () => {
    it('returns cached value when exists', async () => {
      cache.set('key', 'cached');
      const factory = vi.fn().mockResolvedValue('new value');

      const result = await cache.getOrSet('key', factory);
      expect(result).toBe('cached');
      expect(factory).not.toHaveBeenCalled();
    });

    it('calls factory when value not cached', async () => {
      const factory = vi.fn().mockResolvedValue('new value');

      const result = await cache.getOrSet('key', factory);
      expect(result).toBe('new value');
      expect(factory).toHaveBeenCalledTimes(1);
      expect(cache.get('key')).toBe('new value');
    });
  });

  // ============================================================================
  // Tags
  // ============================================================================

  describe('tags', () => {
    it('stores tags with entries', () => {
      cache.set('key1', 'value1', undefined, ['tag1', 'tag2']);
      cache.set('key2', 'value2', undefined, ['tag1', 'tag3']);

      const count = cache.invalidate({ tags: ['tag1'] });
      expect(count).toBe(2);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });

    it('invalidates only entries with matching tag', () => {
      cache.set('key1', 'value1', undefined, ['tag1']);
      cache.set('key2', 'value2', undefined, ['tag2']);

      cache.invalidate({ tags: ['tag1'] });
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });
  });

  // ============================================================================
  // Invalidation
  // ============================================================================

  describe('invalidate', () => {
    it('invalidates all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      const count = cache.invalidate({ all: true });
      expect(count).toBe(2);
      expect(cache.size()).toBe(0);
    });

    it('invalidates by pattern', () => {
      cache.set('user:1', 'value1');
      cache.set('user:2', 'value2');
      cache.set('product:1', 'value3');

      const count = cache.invalidate({ pattern: 'user:*' });
      expect(count).toBe(2);
      expect(cache.get('user:1')).toBeNull();
      expect(cache.get('user:2')).toBeNull();
      expect(cache.get('product:1')).toBe('value3');
    });
  });

  // ============================================================================
  // LRU Eviction
  // ============================================================================

  describe('LRU eviction', () => {
    it('evicts oldest entry when maxEntries reached', () => {
      const smallCache = new MemoryCache({ maxEntries: 3 });
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');
      smallCache.set('key4', 'value4'); // Should evict key1

      expect(smallCache.get('key1')).toBeNull();
      expect(smallCache.get('key4')).toBe('value4');
      expect(smallCache.size()).toBe(3);

      smallCache.stopCleanup();
    });
  });

  // ============================================================================
  // Statistics
  // ============================================================================

  describe('statistics', () => {
    it('tracks hit rate correctly', () => {
      cache.set('key', 'value');
      cache.get('key'); // hit
      cache.get('nonexistent'); // miss

      const stats = cache.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('resets statistics', () => {
      cache.set('key', 'value');
      cache.get('key');
      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.hits).toBe(0);
    });

    it('tracks entries count', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.entries).toBe(2);
    });

    it('tracks evictions', () => {
      const smallCache = new MemoryCache({ maxEntries: 2 });
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');

      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(1);

      smallCache.stopCleanup();
    });
  });

  // ============================================================================
  // Cleanup
  // ============================================================================

  describe('cleanup', () => {
    it('cleans up expired entries periodically', () => {
      cache.set('key1', 'value1', 1);
      cache.set('key2', 'value2', 60);

      vi.advanceTimersByTime(60 * 1000); // 1 minute

      // Cleanup should have run and removed key1
      expect(cache.get('key1')).toBeNull();
    });
  });

  // ============================================================================
  // Prefix
  // ============================================================================

  describe('key prefix', () => {
    it('applies custom prefix', () => {
      const prefixedCache = new MemoryCache({ prefix: 'myapp:' });
      prefixedCache.set('key', 'value');
      const keys = prefixedCache.keys();
      expect(keys).toContain('key');

      prefixedCache.stopCleanup();
    });
  });
});

// ============================================================================
// Singleton Functions
// ============================================================================

describe('Singleton functions', () => {
  afterEach(() => {
    resetMemoryCache();
  });

  it('returns the same instance', () => {
    const instance1 = getMemoryCache();
    const instance2 = getMemoryCache();
    expect(instance1).toBe(instance2);
  });

  it('creates new instance after reset', () => {
    const instance1 = getMemoryCache();
    instance1.set('key', 'value');

    resetMemoryCache();

    const instance2 = getMemoryCache();
    expect(instance2.get('key')).toBeNull();
    expect(instance1).not.toBe(instance2);
  });
});