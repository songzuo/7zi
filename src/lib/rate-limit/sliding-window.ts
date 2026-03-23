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
import { logger } from '@/lib/logger';

export interface SlidingWindowResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  currentCount: number;
}

export interface SlidingWindowConfig {
  key: string;
  limit: number; // Maximum requests
  window: number; // Time window in seconds
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
  const { key, limit, window } = config;
  const now = Date.now();
  const windowStart = now - window * 1000;

  try {
    const client = getRedisClient();

    if (!client) {
      logger.warn('Redis not available for sliding window check');
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: now + window * 1000,
        currentCount: 0,
      };
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
    };
  } catch (error) {
    logger.error('Sliding window check failed', { error, key, limit, window });

    // Fail open - allow request if Redis fails
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: now + window * 1000,
      currentCount: 0,
    };
  }
}

/**
 * Get current sliding window status
 */
export async function getSlidingWindowStatus(
  key: string,
  window: number
): Promise<{ count: number; oldestRequest: number | null; resetTime: number }> {
  const now = Date.now();
  const windowStart = now - window * 1000;
  const defaultResult = { count: 0, oldestRequest: null, resetTime: now + window * 1000 };

  const result = await redisCommand(
    async () => {
      const client = getRedisClient();
      if (!client) {
        return defaultResult;
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

      return { count, oldestRequest, resetTime };
    },
    defaultResult
  );

  return result ?? defaultResult;
}

/**
 * Reset sliding window for a key
 */
export async function resetSlidingWindow(key: string): Promise<boolean> {
  const result = await redisCommand(
    async () => {
      const client = getRedisClient();
      if (!client) {
        return false;
      }

      await client.del(key);
      return true;
    },
    false
  );

  return result ?? false;
}

/**
 * Clean up expired sliding windows
 */
export async function cleanupSlidingWindows(pattern: string): Promise<number> {
  const result = await redisCommand(
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
  );

  return result ?? 0;
}
