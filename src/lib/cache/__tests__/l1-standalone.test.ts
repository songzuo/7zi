import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { L1Cache } from '../l1-cache';

describe('L1 Cache - Standalone Test (No Vi Mocks)', () => {
  let cache: L1Cache<any>;

  beforeEach(() => {
    cache = new L1Cache({
      maxSize: 100,
      defaultTTL: 5000,
      cleanupInterval: 1000,
      enableStats: true,
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Basic Operations', () => {
    it('should create cache with correct configuration', () => {
      expect(cache).toBeInstanceOf(L1Cache);
      expect(cache.size).toBe(0);

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      expect(stats.currentSize).toBe(0);
    });

    it('should set and get values correctly', async () => {
      await cache.set('test-key', 'test-value');
      const value = await cache.get('test-key');

      expect(value).toBe('test-value');

      const stats = cache.getStats();
      expect(stats.sets).toBe(1);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
    });

    it('should return null for non-existent keys', async () => {
      const value = await cache.get('non-existent');
      expect(value).toBeNull();

      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
    });

    it('should delete entries', async () => {
      await cache.set('key', 'value');
      expect(await cache.get('key')).toBe('value');

      await cache.delete('key');
      expect(await cache.get('key')).toBeNull();

      const stats = cache.getStats();
      expect(stats.deletes).toBe(1);
    });

    it('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      expect(cache.size).toBe(2);

      await cache.clear();
      expect(cache.size).toBe(0);
      expect(await cache.get('key1')).toBeNull();
    });
  });

  describe('Batch Operations', () => {
    it('should handle batch set', async () => {
      const entries = [
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3'],
      ] as const;

      await cache.setMany(entries);

      expect(cache.size).toBe(3);
      expect(await cache.get('key1')).toBe('value1');
      expect(await cache.get('key2')).toBe('value2');
      expect(await cache.get('key3')).toBe('value3');
    });

    it('should handle batch get', async () => {
      await cache.setMany([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3'],
      ]);

      const results = await cache.getMany(['key1', 'key2', 'key3']);

      expect(results.size).toBe(3);
      expect(results.get('key1')).toBe('value1');
      expect(results.get('key2')).toBe('value2');
      expect(results.get('key3')).toBe('value3');
    });

    it('should handle batch delete', async () => {
      await cache.setMany([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3'],
      ]);

      await cache.deleteMany(['key1', 'key2']);

      expect(cache.size).toBe(1);
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).toBe('value3');
    });
  });

  describe('TTL Expiration', () => {
    it('should expire entries after TTL', async () => {
      await cache.set('expiring', 'value', 100); // 100ms TTL

      // Should exist immediately
      expect(await cache.get('expiring')).toBe('value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(await cache.get('expiring')).toBeNull();
    });

    it('should check expiration on has', async () => {
      await cache.set('expiring', 'value', 100);
      expect(await cache.has('expiring')).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(await cache.has('expiring')).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses correctly', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      // Hits
      await cache.get('key1');
      await cache.get('key2');
      await cache.get('key1'); // Another hit

      // Misses
      await cache.get('nonexistent1');
      await cache.get('nonexistent2');

      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(2);
      expect(stats.sets).toBe(2);
      expect(stats.hitRate).toBe(0.6); // 3 hits out of 5 total
    });

    it('should track evictions', async () => {
      const smallCache = new L1Cache({ maxSize: 3, defaultTTL: 10000, enableStats: true });

      // Add 5 items (maxSize is 3)
      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3');
      await smallCache.set('key4', 'value4');
      await smallCache.set('key5', 'value5');

      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(2);
      expect(smallCache.size).toBe(3);

      smallCache.destroy();
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used items', async () => {
      const smallCache = new L1Cache({ maxSize: 3, defaultTTL: 10000, enableStats: true });

      // Add 3 items
      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3');

      // Access key1 and key2 (key3 becomes LRU)
      await smallCache.get('key1');
      await smallCache.get('key2');

      // Add 4th item - should evict key3 (LRU)
      await smallCache.set('key4', 'value4');

      expect(smallCache.size).toBe(3);
      expect(await smallCache.get('key1')).toBe('value1'); // Still exists
      expect(await smallCache.get('key2')).toBe('value2'); // Still exists
      expect(await smallCache.get('key3')).toBeNull(); // Evicted (was LRU)
      expect(await smallCache.get('key4')).toBe('value4'); // New item

      smallCache.destroy();
    });
  });

  describe('Sync API', () => {
    it('should support sync set and get', () => {
      cache.setSync('sync-key', 'sync-value');
      expect(cache.getSync('sync-key')).toBe('sync-value');

      const stats = cache.getStats();
      expect(stats.sets).toBe(1);
      expect(stats.hits).toBe(1);
    });

    it('should support sync delete', () => {
      cache.setSync('key', 'value');
      cache.deleteSync('key');
      expect(cache.getSync('key')).toBeNull();
    });

    it('should support sync clear', () => {
      cache.setSync('key1', 'value1');
      cache.setSync('key2', 'value2');
      cache.clearSync();

      expect(cache.size).toBe(0);
    });

    it('should support sync has', () => {
      cache.setSync('key', 'value');
      expect(cache.hasSync('key')).toBe(true);
      expect(cache.hasSync('nonexistent')).toBe(false);
    });
  });

  describe('Data Types', () => {
    it('should handle various data types', async () => {
      const testData = {
        string: 'hello',
        number: 42,
        boolean: true,
        null: null,
        object: { nested: { value: 123 } },
        array: [1, 2, 3, 4, 5],
      };

      await cache.set('test-data', testData);

      const retrieved = await cache.get('test-data');
      expect(retrieved).toEqual(testData);
    });
  });

  describe('Performance', () => {
    it('should handle 1000 operations efficiently', async () => {
      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await cache.set(`key:${i}`, `value:${i}`);
      }

      const setTime = Date.now() - startTime;

      for (let i = 0; i < iterations; i++) {
        await cache.get(`key:${i}`);
      }

      const getTime = Date.now() - startTime - setTime;

      expect(cache.size).toBe(iterations);
      expect(setTime).toBeLessThan(1000);
      expect(getTime).toBeLessThan(1000);

      console.log(`\nPerformance: Set ${iterations} items in ${setTime}ms, Get ${iterations} items in ${getTime}ms`);
    });
  });

  describe('Error Handling', () => {
    it('should handle operations on non-existent keys gracefully', async () => {
      await cache.delete('nonexistent'); // Should not throw
      expect(cache.getStats().deletes).toBe(0);

      const value = await cache.get('nonexistent');
      expect(value).toBeNull();
    });

    it('should handle clear on empty cache', async () => {
      await cache.clear(); // Should not throw
      expect(cache.size).toBe(0);
    });
  });
});
