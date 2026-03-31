/**
 * Sliding Window Rate Limiting Algorithm
 *
 * Uses Redis sorted sets to implement precise sliding window rate limiting.
 *
 * Advantages:
 * - Precise time window control
 * - Memory efficient (auto-expiration)
 * - Distributed-friendly (works with Redis cluster)
 * - Supports multiple time windows simultaneously
 */

import { getRedisClient, redisCommand } from '../redis/client';
import { getMemoryStore } from './memory-store';
import { shouldUseRedis, getCachedRedisAvailability } from './storage-factory';
import { logger } from '@/lib/logger';

export interface SlidingWindowResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  currentCount: number;
  storage: 'redis' | 'memory';
}

export interface SlidingWindowConfig {
  key: string;
  limit: number; // Maximum requests
  window: number; // Time window in seconds
  forceMemory?: boolean; // Force memory storage
}

/**
 * Check and update sliding window rate limit
 *
 * This uses Redis sorted sets where:
 * - Member: Request timestamp (in milliseconds)
 * - Score: Request timestamp (for sorting)
 *
 * To check the limit, we:
 * 1. Remove entries older than the time window
 * 2. Count remaining entries
 * 3. If count < limit, add current request and allow
 * 4. Otherwise, deny the request
 */
export async function checkSlidingWindow(
  config: SlidingWindowConfig
): Promise<SlidingWindowResult> {
  const { key, limit, window, forceMemory } = config;
  const now = Date.now();
  const windowStart = now - window * 1000;

  // 检查是否使用内存存储
  const useMemory = forceMemory || !shouldUseRedis();
  const redisAvailable = await getCachedRedisAvailability();

  // 如果应该使用 Redis 且 Redis 可用
  if (!useMemory && redisAvailable) {
    try {
      return await checkSlidingWindowRedis(key, limit, window, now, windowStart);
    } catch (_error) {
      logger.error('Redis sliding window check failed, falling back to memory', { error, key, limit, window });
      // Fall back to memory storage
      return checkSlidingWindowMemory(key, limit, window);
    }
  }

  // 使用内存存储
  return checkSlidingWindowMemory(key, limit, window);
}

/**
 * 使用 Redis 检查滑动窗口
 */
async function checkSlidingWindowRedis(
  key: string,
  limit: number,
  window: number,
  now: number,
  windowStart: number
): Promise<SlidingWindowResult> {
  const client = getRedisClient();

  if (!client) {
    throw new Error('Redis client not available');
  }

  // Redis pipeline for atomic operations
  const pipeline = client.pipeline();

  // 1. Remove entries outside the time window
  pipeline.zremrangebyscore(key, 0, windowStart);

  // 2. Count current entries in the window
  pipeline.zcard(key);

  // 3. Check if limit exceeded
  pipeline.zrange(key, 0, limit - 1);

  // 4. Set expiration (cleanup)
  pipeline.expire(key, window);

  // Execute pipeline
  const results = await pipeline.exec();

  if (!results) {
    throw new Error('Redis pipeline execution failed');
  }

  const count = results[1][1] as number;
  const entries = results[2][1] as string[];

  const allowed = count < limit;
  const remaining = Math.max(0, limit - count - (allowed ? 1 : 0));
  const resetTime = now + window * 1000;

  // If allowed, add current request to the window
  if (allowed) {
    await client.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiration if not already set
    await client.expire(key, window);
  }

  return {
    allowed,
    remaining,
    resetTime,
    currentCount: count,
    storage: 'redis',
  };
}

/**
 * 使用内存检查滑动窗口
 */
function checkSlidingWindowMemory(
  key: string,
  limit: number,
  window: number
): SlidingWindowResult {
  const memoryStore = getMemoryStore();
  const result = memoryStore.incrementSlidingWindow(key, limit, window);

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetTime: result.resetTime,
    currentCount: result.currentCount,
    storage: 'memory',
  };
}

/**
 * Get current sliding window status
 */
export async function getSlidingWindowStatus(
  key: string,
  window: number
): Promise<{ count: number; oldestRequest: number | null; resetTime: number; storage: 'redis' | 'memory' }> {
  const now = Date.now();
  const windowStart = now - window * 1000;

  // 检查是否使用内存存储
  const useMemory = !shouldUseRedis();
  const redisAvailable = await getCachedRedisAvailability();

  // 如果应该使用 Redis 且 Redis 可用
  if (!useMemory && redisAvailable) {
    try {
      return await getSlidingWindowStatusRedis(key, window, now, windowStart);
    } catch (_error) {
      logger.error('Redis sliding window status check failed, falling back to memory', { error, key, window });
      // Fall back to memory storage
      return getSlidingWindowStatusMemory(key, window, now);
    }
  }

  // 使用内存存储
  return getSlidingWindowStatusMemory(key, window, now);
}

/**
 * 使用 Redis 获取滑动窗口状态
 */
async function getSlidingWindowStatusRedis(
  key: string,
  window: number,
  now: number,
  windowStart: number
): Promise<{ count: number; oldestRequest: number | null; resetTime: number; storage: 'redis' | 'memory' }> {
  const client = getRedisClient();

  if (!client) {
    throw new Error('Redis client not available');
  }

  const pipeline = client.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zcard(key);
  pipeline.zrange(key, 0, 0, 'WITHSCORES');
  pipeline.expire(key, window);

  const results = await pipeline.exec();

  if (!results) {
    throw new Error('Redis pipeline execution failed');
  }

  const count = results[1][1] as number;
  const oldestEntry = results[2][1] as string[];
  const oldestRequest = oldestEntry.length > 0 ? parseInt(oldestEntry[1]) : null;
  const resetTime = oldestRequest ? oldestRequest + window * 1000 : now + window * 1000;

  return { count, oldestRequest, resetTime, storage: 'redis' };
}

/**
 * 使用内存获取滑动窗口状态
 */
function getSlidingWindowStatusMemory(
  key: string,
  window: number,
  now: number
): { count: number; oldestRequest: number | null; resetTime: number; storage: 'redis' | 'memory' } {
  const memoryStore = getMemoryStore();
  const status = memoryStore.getSlidingWindowStatus(key);

  if (!status) {
    return { count: 0, oldestRequest: null, resetTime: now + window * 1000, storage: 'memory' };
  }

  return {
    count: status.count,
    oldestRequest: status.windowStart,
    resetTime: status.resetTime,
    storage: 'memory',
  };
}

/**
 * Reset sliding window for a key
 */
export async function resetSlidingWindow(key: string): Promise<boolean> {
  const useMemory = !shouldUseRedis();
  const redisAvailable = await getCachedRedisAvailability();

  // 如果应该使用 Redis 且 Redis 可用
  if (!useMemory && redisAvailable) {
    try {
      const client = getRedisClient();
      if (!client) {
        throw new Error('Redis client not available');
      }
      await client.del(key);
      return true;
    } catch (_error) {
      logger.error('Redis reset failed, falling back to memory', { error, key });
    }
  }

  // 使用内存存储
  const memoryStore = getMemoryStore();
  memoryStore.reset(key);
  return true;
}

/**
 * Clean up expired sliding windows
 */
export async function cleanupSlidingWindows(pattern: string): Promise<number> {
  return (await redisCommand(
    async () => {
      const client = getRedisClient();
      if (!client) {
        return 0;
      }

      const keys = await client.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      // Check each key and delete expired ones
      const pipeline = client.pipeline();
      let deletedCount = 0;

      for (const key of keys) {
        const ttl = await client.ttl(key);

        // Delete keys with TTL of -2 (not existing) or negative values
        if (ttl === -2 || ttl < 0) {
          pipeline.del(key);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        await pipeline.exec();
      }

      return deletedCount;
    },
    0
  )) ?? 0;
}
