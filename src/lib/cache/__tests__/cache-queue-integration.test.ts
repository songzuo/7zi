/**
 * Integration Test: L1 Cache + Bull Queue
 *
 * This test verifies that L1 cache and Bull queue work together correctly.
 * It tests the integration between the two systems in a realistic scenario.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { L1Cache } from '../l1-cache';
import { QueueManager, QueueName } from '../../queue/queue-manager';

// Mock logger to avoid console output during tests
vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('L1 Cache + Bull Queue Integration', () => {
  let cache: L1Cache<any>;
  let queueManager: QueueManager;
  const testResults: any[] = [];

  beforeEach(async () => {
    // Create L1 cache instance
    cache = new L1Cache({
      maxSize: 100,
      defaultTTL: 5000, // 5 seconds
      cleanupInterval: 1000,
      enableStats: true,
    });

    // Create queue manager instance
    queueManager = new QueueManager();

    // Clear test results
    testResults.length = 0;
  });

  afterEach(async () => {
    // Clean up cache
    cache.destroy();

    // Clean up queue manager
    try {
      await queueManager.close();
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('Basic Integration: Cache in Job Processor', () => {
    it('should initialize queue manager successfully', async () => {
      await queueManager.initialize();
      expect(queueManager.isReady()).toBe(true);
    });

    it('should process job that uses L1 cache', async () => {
      // Initialize queue manager
      await queueManager.initialize();

      // Create a processor that uses L1 cache
      let processCount = 0;
      const processor = async (job: any) => {
        processCount++;

        const { key, value } = job.data;

        // Try to get from cache first
        let cachedValue = await cache.get(key);

        if (!cachedValue) {
          // Simulate expensive operation
          cachedValue = value;

          // Store in cache
          await cache.set(key, cachedValue, 3000);
        }

        // Return result
        testResults.push({
          processCount,
          key,
          cachedValue,
          stats: cache.getStats(),
        });

        return cachedValue;
      };

      // Start processor
      await queueManager.processQueue(QueueName.ANALYTICS, processor, 2);

      // Wait a bit for processor to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add first job
      const job1 = await queueManager.addJob(QueueName.ANALYTICS, {
        key: 'test1',
        value: 'value1',
      });

      // Add second job with same key (should hit cache)
      await new Promise(resolve => setTimeout(resolve, 50));
      const job2 = await queueManager.addJob(QueueName.ANALYTICS, {
        key: 'test1',
        value: 'value2', // Different value but same key
      });

      // Wait for jobs to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify results
      expect(testResults.length).toBeGreaterThanOrEqual(2);

      // First process should be a cache miss
      const firstResult = testResults[0];
      expect(firstResult.cachedValue).toBe('value1');

      // Verify cache stats show hits
      const stats = cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.sets).toBeGreaterThan(0);
    });

    it('should handle multiple concurrent jobs with cache', async () => {
      await queueManager.initialize();

      let processedCount = 0;
      const processor = async (job: any) => {
        processedCount++;
        const { userId, action } = job.data;

        // Cache user permission check
        const cacheKey = `permission:${userId}:${action}`;
        let hasPermission = await cache.get(cacheKey);

        if (hasPermission === null) {
          // Simulate permission check
          hasPermission = action !== 'delete';

          // Cache result
          await cache.set(cacheKey, hasPermission, 2000);
        }

        testResults.push({
          processedCount,
          userId,
          action,
          hasPermission,
          fromCache: cache.getStats().hits > 0,
        });

        return { hasPermission };
      };

      // Start processor with concurrency 3
      await queueManager.processQueue(QueueName.ANALYTICS, processor, 3);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Add multiple jobs
      const jobs = [
        { userId: 'user1', action: 'read' },
        { userId: 'user1', action: 'read' }, // Should hit cache
        { userId: 'user2', action: 'write' },
        { userId: 'user2', action: 'write' }, // Should hit cache
        { userId: 'user3', action: 'delete' },
        { userId: 'user3', action: 'delete' }, // Should hit cache
      ];

      for (const jobData of jobs) {
        await queueManager.addJob(QueueName.ANALYTICS, jobData);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Wait for jobs to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify all jobs were processed
      expect(testResults.length).toBe(jobs.length);

      // Verify cache was used (should have hits)
      const stats = cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);

      // Verify cached results are consistent
      const user1ReadResults = testResults.filter(r => r.userId === 'user1' && r.action === 'read');
      expect(user1ReadResults.length).toBe(2);
      expect(user1ReadResults[0].hasPermission).toBe(user1ReadResults[1].hasPermission);
    });
  });

  describe('Cache Invalidation in Job Processing', () => {
    it('should invalidate cache entries when processing certain jobs', async () => {
      await queueManager.initialize();

      // Pre-populate cache
      await cache.set('user:1', { name: 'User 1' });
      await cache.set('user:2', { name: 'User 2' });
      await cache.set('user:3', { name: 'User 3' });

      expect(await cache.get('user:1')).toEqual({ name: 'User 1' });
      expect(await cache.get('user:2')).toEqual({ name: 'User 2' });

      // Processor that invalidates cache
      const invalidator = async (job: any) => {
        const { invalidateKey } = job.data;

        if (invalidateKey) {
          await cache.delete(invalidateKey);
          testResults.push({
            action: 'invalidated',
            key: invalidateKey,
            exists: await cache.has(invalidateKey),
          });
        }
      };

      await queueManager.processQueue(QueueName.ANALYTICS, invalidator, 1);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add job to invalidate cache
      await queueManager.addJob(QueueName.ANALYTICS, { invalidateKey: 'user:1' });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify cache was invalidated
      expect(await cache.get('user:1')).toBeNull();
      expect(await cache.get('user:2')).toEqual({ name: 'User 2' }); // Should still exist
    });
  });

  describe('Batch Operations with Cache', () => {
    it('should handle batch operations efficiently with cache', async () => {
      await queueManager.initialize();

      // Pre-populate some cache entries
      await cache.setMany([
        ['item:1', { id: 1, name: 'Item 1' }],
        ['item:2', { id: 2, name: 'Item 2' }],
        ['item:3', { id: 3, name: 'Item 3' }],
      ]);

      // Processor that uses batch get
      const batchProcessor = async (job: any) => {
        const { itemIds } = job.data;

        // Batch get from cache
        const cached = await cache.getMany(itemIds.map(id => `item:${id}`));

        // Identify cache misses
        const missingIds = itemIds.filter(id => !cached.has(`item:${id}`));

        // Simulate loading missing items
        for (const id of missingIds) {
          await cache.set(`item:${id}`, { id, name: `Item ${id}` });
        }

        // Get all again
        const allItems = await cache.getMany(itemIds.map(id => `item:${id}`));

        testResults.push({
          requestedIds: itemIds,
          cachedCount: cached.size,
          missingCount: missingIds.length,
          finalCount: allItems.size,
        });

        return Array.from(allItems.values());
      };

      await queueManager.processQueue(QueueName.ANALYTICS, batchProcessor, 1);
      await new Promise(resolve => setTimeout(resolve, 100));

      // First batch - some hits, some misses
      await queueManager.addJob(QueueName.ANALYTICS, {
        itemIds: [1, 2, 3, 4, 5], // 1-3 cached, 4-5 not
      });

      // Second batch - all hits
      await new Promise(resolve => setTimeout(resolve, 10));
      await queueManager.addJob(QueueName.ANALYTICS, {
        itemIds: [1, 2, 3, 4, 5], // All should be cached now
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify results
      expect(testResults.length).toBe(2);

      // First batch: 3 hits, 2 misses
      expect(testResults[0].cachedCount).toBe(3);
      expect(testResults[0].missingCount).toBe(2);
      expect(testResults[0].finalCount).toBe(5);

      // Second batch: all hits
      expect(testResults[1].cachedCount).toBe(5);
      expect(testResults[1].missingCount).toBe(0);

      // Verify cache stats
      const stats = cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache errors gracefully in job processor', async () => {
      await queueManager.initialize();

      const processor = async (job: any) => {
        const { shouldFail } = job.data;

        if (shouldFail) {
          // Try to cache invalid data
          try {
            // @ts-expect-error - Intentionally passing invalid data
            await cache.set(null, 'value');
            testResults.push({ success: false, error: 'Expected failure' });
          } catch (error) {
            testResults.push({ success: true, caughtError: true });
          }
        } else {
          // Normal operation
          await cache.set('test', 'value');
          testResults.push({ success: true, cached: true });
        }
      };

      await queueManager.processQueue(QueueName.ANALYTICS, processor, 1);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add job that will fail gracefully
      await queueManager.addJob(QueueName.ANALYTICS, { shouldFail: true });

      // Add normal job
      await new Promise(resolve => setTimeout(resolve, 10));
      await queueManager.addJob(QueueName.ANALYTICS, { shouldFail: false });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify both jobs were handled
      expect(testResults.length).toBe(2);
      expect(testResults.some(r => r.caughtError)).toBe(true);
      expect(testResults.some(r => r.cached)).toBe(true);
    });
  });

  describe('Performance and Statistics', () => {
    it('should track cache statistics across multiple job processing', async () => {
      await queueManager.initialize();

      const processor = async (job: any) => {
        const { key, value } = job.data;

        // Check cache
        let result = await cache.get(key);

        if (!result) {
          result = value;
          await cache.set(key, result);
        }

        return result;
      };

      await queueManager.processQueue(QueueName.ANALYTICS, processor, 2);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add 20 jobs with 10 unique keys
      const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
      for (let i = 0; i < 20; i++) {
        const key = keys[i % keys.length];
        await queueManager.addJob(QueueName.ANALYTICS, { key, value: `value-${key}` });
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Wait for all jobs to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get queue stats
      const queueStats = await queueManager.getQueueStats(QueueName.ANALYTICS);

      // Get cache stats
      const cacheStats = cache.getStats();

      // Verify queue processed jobs
      expect(queueStats.completed).toBe(20);

      // Verify cache has good hit rate (should be around 50% for 20 jobs with 10 unique keys)
      expect(cacheStats.hits).toBeGreaterThan(0);
      expect(cacheStats.misses).toBeGreaterThan(0);
      expect(cacheStats.sets).toBe(10); // Should only set each unique key once

      // Calculate expected hit rate
      const hitRate = cacheStats.hitRate;
      expect(hitRate).toBeGreaterThan(0.4); // At least 40% hit rate
    });
  });

  describe('Cache Expiration in Long-Running Jobs', () => {
    it('should handle cache expiration correctly', async () => {
      await queueManager.initialize();

      // Cache with short TTL
      await cache.set('expiring-key', 'initial-value', 500); // 500ms TTL

      expect(await cache.get('expiring-key')).toBe('initial-value');

      // Processor that checks cache
      const checkProcessor = async (job: any) => {
        const { step } = job.data;
        const value = await cache.get('expiring-key');
        testResults.push({ step, value, exists: value !== null });
        return value;
      };

      await queueManager.processQueue(QueueName.ANALYTICS, checkProcessor, 1);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check immediately - should exist
      await queueManager.addJob(QueueName.ANALYTICS, { step: 1 });
      await new Promise(resolve => setTimeout(resolve, 100));

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check after expiration - should be null
      await queueManager.addJob(QueueName.ANALYTICS, { step: 2 });
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify results
      expect(testResults.length).toBe(2);
      expect(testResults[0].exists).toBe(true);
      expect(testResults[0].value).toBe('initial-value');
      expect(testResults[1].exists).toBe(false);
      expect(testResults[1].value).toBeNull();
    });
  });
});
