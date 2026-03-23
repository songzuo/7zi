/**
 * L2 Redis Cache Implementation
 *
 * Distributed cache layer using Redis as backend.
 * Designed for persistent, cross-instance cache with TTL support.
 *
 * @module lib/cache/l2-cache
 * @version 1.0.0
 * @author 7zi Team
 * @license MIT
 *
 * @example
 * import { L2Cache } from '@/lib/cache/l2-cache';
 *
 * const cache = new L2Cache({ prefix: 'app', defaultTTL: 3600000 });
 * await cache.set('key', value);
 * const value = await cache.get('key');
 */

import { getRedisClient, isRedisAvailable, redisCommand } from '@/lib/redis/client';
import { logger } from '@/lib/logger';

export interface L2CacheOptions {
  /** Key prefix for namespacing (default: 'cache') */
  prefix?: string;
  /** Default TTL in milliseconds (default: 1 hour) */
  defaultTTL?: number;
  /** Enable fallback to undefined when Redis unavailable (default: false) */
  silentFallback?: boolean;
}

export interface L2CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

/**
 * L2 Redis Cache with TTL and automatic serialization
 *
 * Features:
 * - Redis-based distributed caching
 * - Configurable TTL per entry
 * - Automatic JSON serialization/deserialization
 * - Key prefixing for namespacing
 * - Statistics tracking for monitoring
 * - Graceful fallback when Redis unavailable
 * - Batch operations support
 *
 * @template T - Type of cached values
 * @example
 * const cache = new L2Cache<MyType>({ prefix: 'app', defaultTTL: 3600000 });
 * await cache.set('key', value);
 * const value = await cache.get('key');
 */
export class L2Cache<T = unknown> {
  private prefix: string;
  private defaultTTL: number;
  private silentFallback: boolean;
  private stats: L2CacheStats;

  constructor(options: L2CacheOptions = {}) {
    const {
      prefix = 'cache',
      defaultTTL = 60 * 60 * 1000, // 1 hour
      silentFallback = false,
    } = options;

    this.prefix = prefix;
    this.defaultTTL = defaultTTL;
    this.silentFallback = silentFallback;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
    };
  }

  /**
   * Get value from Redis cache
   */
  async get(key: string): Promise<T | null> {
    const redisKey = this.buildKey(key);

    return redisCommand(async () => {
      const client = getRedisClient();
      if (!client) {
        this.stats.misses++;
        throw new Error('Redis client not available');
      }

      const value = await client.get(redisKey);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();

      try {
        return JSON.parse(value) as T;
      } catch (error) {
        logger.error(`Failed to parse cache value for key: ${key}`, { error });
        this.stats.errors++;
        return null;
      }
    }, null);
  }

  /**
   * Set value in Redis cache with TTL
   */
  async set(key: string, value: T, ttl?: number): Promise<boolean> {
    const redisKey = this.buildKey(key);
    const expiry = ttl ?? this.defaultTTL;
    const expirySeconds = Math.ceil(expiry / 1000);

    return redisCommand(async () => {
      const client = getRedisClient();
      if (!client) {
        throw new Error('Redis client not available');
      }

      const serialized = JSON.stringify(value);
      const result = await client.setex(redisKey, expirySeconds, serialized);

      this.stats.sets++;

      return result === 'OK';
    }, false);
  }

  /**
   * Delete value from Redis cache
   */
  async delete(key: string): Promise<boolean> {
    const redisKey = this.buildKey(key);

    return redisCommand(async () => {
      const client = getRedisClient();
      if (!client) {
        throw new Error('Redis client not available');
      }

      const result = await client.del(redisKey);

      this.stats.deletes++;

      return result > 0;
    }, false);
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    const redisKey = this.buildKey(key);

    return redisCommand(async () => {
      const client = getRedisClient();
      if (!client) {
        return false;
      }

      const result = await client.exists(redisKey);
      return result === 1;
    }, false);
  }

  /**
   * Set TTL for existing key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const redisKey = this.buildKey(key);
    const expirySeconds = Math.ceil(ttl / 1000);

    return redisCommand(async () => {
      const client = getRedisClient();
      if (!client) {
        return false;
      }

      const result = await client.expire(redisKey, expirySeconds);
      return result === 1;
    }, false);
  }

  /**
   * Get remaining TTL in milliseconds
   */
  async ttl(key: string): Promise<number> {
    const redisKey = this.buildKey(key);

    return redisCommand(async () => {
      const client = getRedisClient();
      if (!client) {
        return -1;
      }

      const ttlSeconds = await client.ttl(redisKey);

      if (ttlSeconds === -2) {
        // Key doesn't exist
        return -2;
      }

      if (ttlSeconds === -1) {
        // Key exists but has no expiry
        return -1;
      }

      return ttlSeconds * 1000; // Convert to milliseconds
    }, -2);
  }

  /**
   * Clear all cache entries with this prefix
   */
  async clear(): Promise<number> {
    const pattern = `${this.prefix}:*`;

    return redisCommand(async () => {
      const client = getRedisClient();
      if (!client) {
        return 0;
      }

      const keys = await client.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      const result = await client.del(...keys);
      return result;
    }, 0);
  }

  /**
   * Get multiple values
   */
  async mget(keys: string[]): Promise<Map<string, T | null>> {
    const redisKeys = keys.map((k) => this.buildKey(k));
    const result = new Map<string, T | null>();

    await redisCommand(async () => {
      const client = getRedisClient();
      if (!client) {
        keys.forEach((k) => result.set(k, null));
        this.stats.misses += keys.length;
        return;
      }

      const values = await client.mget(...redisKeys);

      keys.forEach((key, index) => {
        const value = values[index];

        if (value === null) {
          this.stats.misses++;
          result.set(key, null);
        } else {
          this.stats.hits++;
          try {
            result.set(key, JSON.parse(value) as T);
          } catch (error) {
            logger.error(`Failed to parse cache value for key: ${key}`, { error });
            this.stats.errors++;
            result.set(key, null);
          }
        }
      });

      this.updateHitRate();
    }, null);

    return result;
  }

  /**
   * Set multiple values
   */
  async mset(entries: Map<string, T>, ttl?: number): Promise<boolean> {
    const expiry = ttl ?? this.defaultTTL;
    const expirySeconds = Math.ceil(expiry / 1000);

    return redisCommand(async () => {
      const client = getRedisClient();
      if (!client) {
        throw new Error('Redis client not available');
      }

      const pipeline = client.pipeline();

      entries.forEach((value, key) => {
        const redisKey = this.buildKey(key);
        const serialized = JSON.stringify(value);
        pipeline.setex(redisKey, expirySeconds, serialized);
      });

      await pipeline.exec();

      this.stats.sets += entries.size;

      return true;
    }, false);
  }

  /**
   * Get or set pattern - returns cached data or executes function to fetch it
   */
  async getOrSet(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get(key);

    if (cached !== null) {
      return cached;
    }

    const data = await fn();
    await this.set(key, data, ttl);
    return data;
  }

  /**
   * Get cache statistics
   */
  getStats(): L2CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
    };
  }

  /**
   * Check if Redis is available
   */
  async isAvailable(): Promise<boolean> {
    return isRedisAvailable();
  }

  /**
   * Build namespaced key
   */
  private buildKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total === 0 ? 0 : this.stats.hits / total;
  }
}

/**
 * Create L2 cache instance
 */
export function createL2Cache<T = unknown>(
  options?: L2CacheOptions
): L2Cache<T> {
  return new L2Cache<T>(options);
}
