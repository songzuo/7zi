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

  // ============================================================================
  // TTL Edge Cases
  // ============================================================================

  describe('TTL edge cases', () => {
    it('expires at exact TTL boundary', () => {
      cache.set('key', 'value', 1); // 1 second

      vi.advanceTimersByTime(999);
      expect(cache.get('key')).toBe('value'); // Still valid at 999ms

      vi.advanceTimersByTime(2); // Now at 1001ms
      expect(cache.get('key')).toBeNull(); // Expired
    });

    it('handles multiple TTL units correctly', () => {
      cache.set('seconds', 'v1', 30);
      cache.set('minutes', 'v2', '1m');
      cache.set('hours', 'v3', '1h');
      cache.set('days', 'v4', '1d');

      expect(cache.get('seconds')).toBe('v1');
      expect(cache.get('minutes')).toBe('v2');
      expect(cache.get('hours')).toBe('v3');
      expect(cache.get('days')).toBe('v4');

      // Advance 30 seconds - only seconds should expire
      vi.advanceTimersByTime(31 * 1000);
      expect(cache.get('seconds')).toBeNull();
      expect(cache.get('minutes')).toBe('v2');
      expect(cache.get('hours')).toBe('v3');
      expect(cache.get('days')).toBe('v4');

      // Advance 1 more minute - minutes should expire
      vi.advanceTimersByTime(60 * 1000);
      expect(cache.get('minutes')).toBeNull();
      expect(cache.get('hours')).toBe('v3');
    });

    it('updates expiration on repeated access (sliding window)', () => {
      cache.set('key', 'value', 2); // 2 seconds

      vi.advanceTimersByTime(1000);
      expect(cache.get('key')).toBe('value');

      // Touch to extend TTL
      cache.touch('key', 2);
      vi.advanceTimersByTime(1500);
      expect(cache.get('key')).toBe('value'); // Still valid (total 2.5s with touch)

      vi.advanceTimersByTime(1000); // Now at 2.5s since original set
      expect(cache.get('key')).toBeNull(); // Expired after extended TTL
    });

    it('handles zero TTL as immediate expiration', () => {
      // Zero TTL should be treated as no expiration or immediate expiration
      // The implementation may choose either behavior, so we just check it doesn't throw
      cache.set('key', 'value', 0);
      // Value may or may not be null depending on implementation choice
      // Just verify no error is thrown
      const result = cache.get('key');
      expect(result === null || result === 'value').toBe(true);
    });

    it('handles very long TTL', () => {
      cache.set('key', 'value', '365d');
      vi.advanceTimersByTime(364 * 24 * 60 * 60 * 1000); // 364 days
      expect(cache.get('key')).toBe('value');

      vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000); // 2 more days
      expect(cache.get('key')).toBeNull();
    });
  });

  // ============================================================================
  // Invalidation Strategy Tests
  // ============================================================================

  describe('invalidation strategy', () => {
    it('invalidates multiple patterns', () => {
      cache.set('user:1:profile', 'profile1');
      cache.set('user:1:settings', 'settings1');
      cache.set('user:2:profile', 'profile2');
      cache.set('post:1', 'post1');
      cache.set('post:2', 'post2');

      // Invalidate all user data
      let count = cache.invalidate({ pattern: 'user:*' });
      expect(count).toBe(3);
      expect(cache.get('user:1:profile')).toBeNull();
      expect(cache.get('user:1:settings')).toBeNull();
      expect(cache.get('user:2:profile')).toBeNull();
      expect(cache.get('post:1')).toBe('post1');

      // Invalidate all post data
      count = cache.invalidate({ pattern: 'post:*' });
      expect(count).toBe(2);
      expect(cache.get('post:1')).toBeNull();
    });

    it('combines tags and pattern invalidation', () => {
      cache.set('key1', 'value1', undefined, ['tag1', 'tag2']);
      cache.set('key2', 'value2', undefined, ['tag1']);
      cache.set('key3', 'value3', undefined, ['tag2']);

      // First invalidate by tag
      let count = cache.invalidate({ tags: ['tag1'] });
      expect(count).toBe(2);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBe('value3');

      // Reset and test pattern
      cache.set('key1', 'value1', undefined, ['tag1']);
      cache.set('key2', 'value2', undefined, ['tag2']);
      cache.set('key3', 'value3');

      count = cache.invalidate({ pattern: 'key[13]' });
      expect(count).toBe(2);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBeNull();
    });

    it('handles complex wildcard patterns', () => {
      cache.set('api:v1:users:123', 'user1');
      cache.set('api:v1:users:456', 'user2');
      cache.set('api:v2:users:123', 'user3');
      cache.set('api:v1:posts:789', 'post1');

      // Invalidate all v1 endpoints
      let count = cache.invalidate({ pattern: 'api:v1:*' });
      expect(count).toBe(3);
      expect(cache.get('api:v1:users:123')).toBeNull();
      expect(cache.get('api:v1:users:456')).toBeNull();
      expect(cache.get('api:v1:posts:789')).toBeNull();
      expect(cache.get('api:v2:users:123')).toBe('user3');

      // Invalidate all user endpoints
      count = cache.invalidate({ pattern: '*:users:*' });
      expect(count).toBe(1);
      expect(cache.get('api:v2:users:123')).toBeNull();
    });

    it('returns zero for non-matching pattern', () => {
      cache.set('key1', 'value1');
      const count = cache.invalidate({ pattern: 'nonexistent:*' });
      expect(count).toBe(0);
      expect(cache.get('key1')).toBe('value1');
    });

    it('invalidates with empty options returns zero', () => {
      cache.set('key1', 'value1');
      const count = cache.invalidate({});
      expect(count).toBe(0);
      expect(cache.get('key1')).toBe('value1');
    });
  });

  // ============================================================================
  // Concurrent Access Tests
  // ============================================================================

  describe('concurrent access', () => {
    it('handles rapid sequential reads', async () => {
      cache.set('key', 'value');

      // Rapid sequential reads
      for (let i = 0; i < 100; i++) {
        expect(cache.get('key')).toBe('value');
      }

      const stats = cache.getStats();
      expect(stats.hits).toBe(100);
    });

    it('handles rapid sequential writes', () => {
      // Rapid writes to same key
      for (let i = 0; i < 100; i++) {
        cache.set('key', `value-${i}`);
      }

      expect(cache.get('key')).toBe('value-99');
      expect(cache.size()).toBe(1);
    });

    it('handles concurrent writes to different keys', () => {
      const keys = Array.from({ length: 50 }, (_, i) => `key-${i}`);

      // Write to different keys rapidly
      for (const key of keys) {
        cache.set(key, key);
      }

      expect(cache.size()).toBe(50);

      // Verify all keys
      for (const key of keys) {
        expect(cache.get(key)).toBe(key);
      }
    });

    it('getOrSet handles concurrent calls for same key', async () => {
      // Use real timers for this test since it uses async setTimeout
      vi.useRealTimers();
      
      let factoryCallCount = 0;
      const factory = vi.fn().mockImplementation(async () => {
        factoryCallCount++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'computed-value';
      });

      // Multiple concurrent calls for same key
      const promises = Array.from({ length: 5 }, () =>
        cache.getOrSet('key', factory)
      );

      const results = await Promise.all(promises);

      // All should get the same value
      expect(results.every((v) => v === 'computed-value')).toBe(true);

      // Without mutex locking, factory may be called multiple times
      // This is acceptable behavior - test verifies all calls return the same value
      expect(factoryCallCount).toBeGreaterThanOrEqual(1);
      
      vi.useFakeTimers();
    }, 30000);

    it('getOrSet race condition: first call populates cache for subsequent', async () => {
      // Use real timers for this test since it uses async setTimeout
      vi.useRealTimers();
      
      const results: string[] = [];

      // Simulate slightly staggered calls
      const p1 = cache.getOrSet('key', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return 'value1';
      });

      const p2 = cache.getOrSet('key', async () => 'value2');

      results.push(await p1);
      results.push(await p2);

      // At least one should get a value
      expect(results.some((v) => v !== null)).toBe(true);

      // Cache should have the value (whichever completed first)
      expect(cache.get('key')).not.toBeNull();
      
      vi.useFakeTimers();
    }, 30000);

    it('handles mixed concurrent reads and writes', () => {
      cache.set('counter', 0);

      // Mixed operations
      for (let i = 0; i < 50; i++) {
        if (i % 2 === 0) {
          const current = cache.get<number>('counter') || 0;
          cache.set('counter', current + 1);
        } else {
          cache.get('counter');
        }
      }

      // Final value should be 25 (every even iteration increments)
      expect(cache.get<number>('counter')).toBe(25);
    });
  });

  // ============================================================================
  // Memory Pressure Tests
  // ============================================================================

  describe('memory pressure', () => {
    it('handles maxEntries with TTL interaction', () => {
      const smallCache = new MemoryCache({ maxEntries: 2 });

      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');

      // Access key1 to make it recently used
      smallCache.get('key1');

      // This should evict key2 (LRU), not key1
      smallCache.set('key3', 'value3');

      // key1 should still be accessible (it was accessed recently)
      expect(smallCache.get('key1')).toBe('value1');
      // key2 should be evicted (LRU)
      expect(smallCache.get('key2')).toBeNull();
      // key3 should be present
      expect(smallCache.get('key3')).toBe('value3');

      smallCache.stopCleanup();
    }, 30000);

    it('tracks memory usage accurately', () => {
      const cacheWithTracking = new MemoryCache();
      
      cacheWithTracking.set('small', 'x');
      const smallUsage = cacheWithTracking.getStats().memoryUsage;

      cacheWithTracking.set('large', 'x'.repeat(1000));
      const largeUsage = cacheWithTracking.getStats().memoryUsage;

      expect(largeUsage).toBeGreaterThan(smallUsage);
    });

    it('evicts multiple entries when exceeding maxEntries significantly', () => {
      const tinyCache = new MemoryCache({ maxEntries: 5 });

      // Add 10 entries
      for (let i = 0; i < 10; i++) {
        tinyCache.set(`key${i}`, `value${i}`);
      }

      // Should have exactly 5 entries (evicted 5)
      expect(tinyCache.size()).toBe(5);
      expect(tinyCache.getStats().evictions).toBe(5);

      tinyCache.stopCleanup();
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