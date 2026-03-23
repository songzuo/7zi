/**
 * Rate Limit Event Logger
 *
 * Logs rate limit events to a persistent store for monitoring and analytics.
 */

import { getRedisClient, redisCommand } from '../redis/client';
import { logger } from '@/lib/logger';
import { RateLimitEvent } from './index';

/**
 * Store rate limit event
 */
export async function storeRateLimitEvent(event: RateLimitEvent): Promise<boolean> {
  const result = await redisCommand(
    async () => {
      const client = getRedisClient();
      if (!client) {
        return false;
      }

      const key = `ratelimit:events:${Date.now()}`;
      const value = JSON.stringify(event);

      // Store event with expiration (7 days)
      await client.setex(key, 7 * 24 * 3600, value);

      return true;
    },
    false
  );

  return result ?? false;
}

/**
 * Get rate limit events for a time period
 */
export async function getRateLimitEvents(
  startTime?: number,
  endTime?: number,
  pattern: string = 'ratelimit:events:*'
): Promise<RateLimitEvent[]> {
  const result = await redisCommand(
    async () => {
      const client = getRedisClient();
      if (!client) {
        return [];
      }

      // Get all matching keys
      const keys = await client.keys(pattern);

      if (keys.length === 0) {
        return [];
      }

      // Filter by time range if specified
      const filteredKeys = startTime || endTime
        ? keys.filter(key => {
            const timestamp = parseInt(key.split(':').pop() || '0');
            if (startTime && timestamp < startTime) return false;
            if (endTime && timestamp > endTime) return false;
            return true;
          })
        : keys;

      // Get all events
      const events: RateLimitEvent[] = [];
      for (const key of filteredKeys) {
        const value = await client.get(key);
        if (value) {
          try {
            events.push(JSON.parse(value) as RateLimitEvent);
          } catch (error) {
            logger.error('Failed to parse rate limit event', { error, key, value });
          }
        }
      }

      // Sort by timestamp
      events.sort((a, b) => a.timestamp - b.timestamp);

      return events;
    },
    []
  );

  return result ?? [];
}

/**
 * Get rate limit statistics
 */
/**
 * Get rate limit statistics
 */
export async function getRateLimitStats(
  startTime?: number,
  endTime?: number
): Promise<{
  totalEvents: number;
  exceededEvents: number;
  byPath: Record<string, number>;
  byAlgorithm: Record<string, number>;
  byIP: Record<string, number>;
}> {
  const events = await getRateLimitEvents(startTime, endTime);

  const stats = {
    totalEvents: events.length,
    exceededEvents: events.filter(e => e.exceeded).length,
    byPath: {} as Record<string, number>,
    byAlgorithm: {} as Record<string, number>,
    byIP: {} as Record<string, number>,
  };

  for (const event of events) {
    stats.byPath[event.path] = (stats.byPath[event.path] || 0) + 1;
    stats.byAlgorithm[event.algorithm] = (stats.byAlgorithm[event.algorithm] || 0) + 1;
    stats.byIP[event.ipAddress] = (stats.byIP[event.ipAddress] || 0) + 1;
  }

  return stats;
}

/**
 * Clean up old rate limit events
 */
export async function cleanupOldRateLimitEvents(olderThanDays: number = 7): Promise<number> {
  const result = await redisCommand(
    async () => {
      const client = getRedisClient();
      if (!client) {
        return 0;
      }

      const cutoffTime = Date.now() - olderThanDays * 24 * 3600 * 1000;
      const pattern = 'ratelimit:events:*';
      const keys = await client.keys(pattern);

      let deletedCount = 0;
      for (const key of keys) {
        const timestamp = parseInt(key.split(':').pop() || '0');
        if (timestamp < cutoffTime) {
          await client.del(key);
          deletedCount++;
        }
      }

      return deletedCount;
    },
    0
  );

  return result ?? 0;
}

/**
 * Get top offenders (most rate limit violations)
 */
export async function getTopOffenders(limit: number = 10): Promise<
  Array<{ path: string; ipAddress: string; violations: number }>
> {
  const events = await getRateLimitEvents();
  const exceededEvents = events.filter(e => e.exceeded);

  const offenders = new Map<string, number>();

  for (const event of exceededEvents) {
    const key = `${event.path}:${event.ipAddress}`;
    offenders.set(key, (offenders.get(key) || 0) + 1);
  }

  // Sort by violations count
  const sorted = Array.from(offenders.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, violations]) => {
      const [path, ipAddress] = key.split(':');
      return { path, ipAddress, violations };
    });

  return sorted;
}
