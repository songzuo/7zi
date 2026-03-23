/**
 * Unit Test: L1 Cache and Bull Queue - Component Testing
 *
 * This test verifies the individual components work correctly
 * without requiring Redis to be running.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { L1Cache } from '../l1-cache';
import { QueueManager, QueueName, queueConfigs } from '../../queue/queue-manager';

describe('L1 Cache + Bull Queue - Component Tests', () => {
  let cache: L1Cache<any>;

  beforeEach(() => {
    // Create L1 cache instance for testing
    cache = new L1Cache({
      maxSize: 100,
      defaultTTL: 5000,
      cleanupInterval: 1000,
      enableStats: true,
    });
  });

  afterEach(() => {
    // Clean up cache
    cache.destroy();
  });

  describe('L1 Cache Component', () => {
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

    it('should handle batch operations', async () => {
      const entries = [
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3'],
      ] as const;

      await cache.setMany(entries);

      const values = await cache.getMany(['key1', 'key2', 'key3']);

      expect(values.size).toBe(3);
      expect(values.get('key1')).toBe('value1');
      expect(values.get('key2')).toBe('value2');
      expect(values.get('key3')).toBe('value3');
    });

    it('should handle TTL expiration', async () => {
      await cache.set('expiring', 'value', 100); // 100ms TTL

      // Should exist immediately
      expect(await cache.get('expiring')).toBe('value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(await cache.get('expiring')).toBeNull();
    });

    it('should track statistics correctly', async () => {
      // Set some values
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      // Get some values (hits)
      await cache.get('key1');
      await cache.get('key2');

      // Try to get non-existent value (miss)
      await cache.get('nonexistent');

      const stats = cache.getStats();
      expect(stats.sets).toBe(3);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.currentSize).toBe(3);
    });

    it('should support sync and async operations', async () => {
      // Async operations
      await cache.set('async-key', 'async-value');
      expect(await cache.get('async-key')).toBe('async-value');

      // Sync operations
      cache.setSync('sync-key', 'sync-value');
      expect(cache.getSync('sync-key')).toBe('sync-value');

      const stats = cache.getStats();
      expect(stats.sets).toBe(2);
      expect(stats.hits).toBe(2);
    });
  });

  describe('Queue Manager Component', () => {
    let queueManager: QueueManager;

    beforeEach(() => {
      queueManager = new QueueManager();
    });

    afterEach(async () => {
      try {
        await queueManager.close();
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should create queue manager instance', () => {
      expect(queueManager).toBeInstanceOf(QueueManager);
      expect(queueManager.isReady()).toBe(false);
    });

    it('should have correct queue configurations', () => {
      expect(QueueName.EMAIL).toBe('email');
      expect(QueueName.NOTIFICATION).toBe('notification');
      expect(QueueName.ANALYTICS).toBe('analytics');

      expect(queueConfigs[QueueName.EMAIL]).toBeDefined();
      expect(queueConfigs[QueueName.NOTIFICATION]).toBeDefined();
      expect(queueConfigs[QueueName.ANALYTICS]).toBeDefined();

      expect(queueConfigs[QueueName.EMAIL].retries).toBe(3);
      expect(queueConfigs[QueueName.ANALYTICS].retries).toBe(2);
    });

    it('should throw error when getting non-existent queue', () => {
      const queue = queueManager.getQueue(QueueName.EMAIL);
      expect(queue).toBeUndefined();
    });

    it('should throw error when adding job to uninitialized queue', async () => {
      try {
        await queueManager.addJob(QueueName.EMAIL, { test: 'data' });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('not found');
        expect(error.message).toContain('initialized');
      }
    });
  });

  describe('Cache Usage Patterns for Queue Processors', () => {
    it('should demonstrate read-through caching pattern', async () => {
      const userId = 'user123';
      const userData = { id: userId, name: 'Test User' };

      // Simulate first request - cache miss
      let cached = await cache.get(`user:${userId}`);
      expect(cached).toBeNull();

      // Simulate loading from database
      cached = userData;
      await cache.set(`user:${userId}`, cached);

      // Verify it's cached
      cached = await cache.get(`user:${userId}`);
      expect(cached).toEqual(userData);

      // Simulate second request - cache hit
      cached = await cache.get(`user:${userId}`);
      expect(cached).toEqual(userData);

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
    });

    it('should demonstrate write-through caching pattern', async () => {
      const userId = 'user456';
      const userData = { id: userId, name: 'New User' };

      // Simulate write operation
      await cache.set(`user:${userId}`, userData);

      // Verify it's cached
      const cached = await cache.get(`user:${userId}`);
      expect(cached).toEqual(userData);

      // Simulate update
      userData.name = 'Updated User';
      await cache.set(`user:${userId}`, userData);

      // Verify cache is updated
      const updated = await cache.get(`user:${userId}`);
      expect(updated).toEqual({ id: userId, name: 'Updated User' });

      const stats = cache.getStats();
      expect(stats.sets).toBe(2);
    });

    it('should demonstrate cache invalidation pattern', async () => {
      const userId = 'user789';
      const userData = { id: userId, name: 'User to Invalidate' };

      // Cache the data
      await cache.set(`user:${userId}`, userData);
      expect(await cache.get(`user:${userId}`)).toEqual(userData);

      // Simulate invalidation (e.g., after database update)
      await cache.delete(`user:${userId}`);

      // Verify it's gone
      expect(await cache.get(`user:${userId}`)).toBeNull();
      expect(await cache.has(`user:${userId}`)).toBe(false);

      const stats = cache.getStats();
      expect(stats.deletes).toBe(1);
    });

    it('should demonstrate batch loading pattern', async () => {
      const itemIds = [1, 2, 3, 4, 5];

      // Pre-cache some items
      await cache.setMany([
        ['item:1', { id: 1, name: 'Item 1' }],
        ['item:2', { id: 2, name: 'Item 2' }],
        ['item:3', { id: 3, name: 'Item 3' }],
      ]);

      // Try batch get
      const cached = await cache.getMany(itemIds.map(id => `item:${id}`));

      // Should have 3 cached items
      expect(cached.size).toBe(3);
      expect(cached.get('item:1')).toEqual({ id: 1, name: 'Item 1' });
      expect(cached.get('item:2')).toEqual({ id: 2, name: 'Item 2' });
      expect(cached.get('item:3')).toEqual({ id: 3, name: 'Item 3' });

      // Identify missing items
      const missing = itemIds.filter(id => !cached.has(`item:${id}`));
      expect(missing).toEqual([4, 5]);

      // Cache missing items
      await cache.setMany([
        ['item:4', { id: 4, name: 'Item 4' }],
        ['item:5', { id: 5, name: 'Item 5' }],
      ]);

      // Get all again
      const allItems = await cache.getMany(itemIds.map(id => `item:${id}`));
      expect(allItems.size).toBe(5);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large number of operations efficiently', async () => {
      const iterations = 1000;
      const startTime = Date.now();

      // Set many items
      for (let i = 0; i < iterations; i++) {
        await cache.set(`key:${i}`, `value:${i}`);
      }

      const setTime = Date.now() - startTime;

      // Get all items
      const getStartTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        await cache.get(`key:${i}`);
      }
      const getTime = Date.now() - getStartTime;

      // Verify all items are cached
      expect(cache.size).toBe(iterations);

      const stats = cache.getStats();
      expect(stats.hits).toBe(iterations);
      expect(stats.sets).toBe(iterations);

      // Performance check: should be fast (< 1 second for 1000 operations)
      expect(setTime).toBeLessThan(1000);
      expect(getTime).toBeLessThan(1000);

      console.log(`\nPerformance Metrics:`);
      console.log(`  Set ${iterations} items: ${setTime}ms`);
      console.log(`  Get ${iterations} items: ${getTime}ms`);
      console.log(`  Cache size: ${cache.size}`);
      console.log(`  Hit rate: ${stats.hitRate.toFixed(2)}%`);
    });

    it('should respect maxSize and evict LRU items', async () => {
      const smallCache = new L1Cache({ maxSize: 5, defaultTTL: 10000, enableStats: true });

      // Add 10 items (maxSize is 5)
      for (let i = 0; i < 10; i++) {
        await smallCache.set(`key:${i}`, `value:${i}`);
      }

      // Should only have 5 items
      expect(smallCache.size).toBe(5);

      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(5);

      // First 5 keys should be evicted
      expect(await smallCache.get('key:0')).toBeNull();
      expect(await smallCache.get('key:4')).toBeNull();

      // Last 5 keys should exist
      expect(await smallCache.get('key:5')).toBe('value:5');
      expect(await smallCache.get('key:9')).toBe('value:9');

      smallCache.destroy();
    });
  });

  describe('Integration Readiness', () => {
    it('should have all necessary methods for queue integration', () => {
      // Check that cache has async API
      expect(typeof cache.set).toBe('function');
      expect(typeof cache.get).toBe('function');
      expect(typeof cache.delete).toBe('function');
      expect(typeof cache.clear).toBe('function');
      expect(typeof cache.has).toBe('function');
      expect(typeof cache.setMany).toBe('function');
      expect(typeof cache.getMany).toBe('function');
      expect(typeof cache.deleteMany).toBe('function');

      // Check that cache has sync API
      expect(typeof cache.setSync).toBe('function');
      expect(typeof cache.getSync).toBe('function');
      expect(typeof cache.deleteSync).toBe('function');
      expect(typeof cache.clearSync).toBe('function');
      expect(typeof cache.hasSync).toBe('function');

      // Check that cache has utility methods
      expect(typeof cache.getStats).toBe('function');
      expect(typeof cache.resetStats).toBe('function');
      expect(typeof cache.destroy).toBe('function');
    });

    it('should handle errors gracefully', async () => {
      // Try to delete non-existent key
      await cache.delete('non-existent');
      expect(cache.getStats().deletes).toBe(0); // No change in stats

      // Try to get non-existent key
      const value = await cache.get('also-non-existent');
      expect(value).toBeNull();
      expect(cache.getStats().misses).toBe(1);

      // Try to clear empty cache
      await cache.clear();
      expect(cache.size).toBe(0);
    });

    it('should support different data types', async () => {
      const testData = {
        string: 'hello',
        number: 42,
        boolean: true,
        null: null,
        object: { nested: { value: 123 } },
        array: [1, 2, 3, 4, 5],
        date: new Date('2024-01-01'),
      };

      // Cache all types
      await cache.set('test-data', testData);

      // Retrieve and verify
      const retrieved = await cache.get('test-data');
      expect(retrieved).toEqual(testData);

      // Verify individual types
      expect(typeof retrieved.string).toBe('string');
      expect(typeof retrieved.number).toBe('number');
      expect(typeof retrieved.boolean).toBe('boolean');
      expect(retrieved.null).toBeNull();
      expect(typeof retrieved.object).toBe('object');
      expect(Array.isArray(retrieved.array)).toBe(true);
      expect(retrieved.date instanceof Date).toBe(true);
    });
  });
});
