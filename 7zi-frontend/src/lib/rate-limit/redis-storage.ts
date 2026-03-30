/**
 * Redis Rate Limit Storage
 *
 * 基于 Redis 的速率限制存储实现，支持分布式部署
 *
 * Note: This module requires 'ioredis' to be installed:
 * npm install ioredis
 * If not installed, this class will fall back to no-op implementation
 */

import { IRateLimitStorage, RateLimitEntry } from './storage';

/**
 * Redis 限流存储类
 */
export class RedisRateLimitStorage implements IRateLimitStorage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private redis: any = null;
  private keyPrefix = 'rate-limit:';
  private initialized = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(redisClient?: any) {
    if (redisClient) {
      this.redis = redisClient;
      this.initialized = true;
    }
  }

  /**
   * Initialize Redis connection
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamic import for optional dependency
      const { default: Redis } = await import('ioredis');

      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            return null; // 停止重试
          }
          return Math.min(times * 100, 3000); // 指数退避
        },
      });

      this.initialized = true;
    } catch (error) {
      console.warn('[RedisRateLimitStorage] ioredis not installed. Using no-op implementation.');
      this.initialized = false;
    }
  }

  /**
   * 增加请求计数
   */
  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    if (!this.initialized || !this.redis) {
      return { count: 0, resetTime: Date.now() + windowMs, windowStart: Date.now() };
    }

    const redisKey = this.keyPrefix + key;
    const now = Date.now();
    const resetTime = now + windowMs;

    // Simple increment implementation
    const count = await this.redis.incr(redisKey);

    if (count === 1) {
      await this.redis.pexpire(redisKey, windowMs);
    }

    return {
      count,
      resetTime,
      windowStart: now,
    };
  }

  /**
   * 获取当前计数
   */
  async get(key: string): Promise<RateLimitEntry | null> {
    if (!this.initialized || !this.redis) {
      return null;
    }

    const redisKey = this.keyPrefix + key;

    const countStr = await this.redis.get(redisKey);
    if (!countStr) {
      return null;
    }

    const count = parseInt(countStr, 10);
    const ttl = await this.redis.pttl(redisKey);

    // windowStart can be estimated from TTL and resetTime
    const resetTime = Date.now() + ttl;

    return {
      count,
      resetTime,
      windowStart: resetTime - ttl,
    };
  }

  /**
   * 重置计数
   */
  async reset(key: string): Promise<void> {
    if (!this.initialized || !this.redis) {
      return;
    }

    const redisKey = this.keyPrefix + key;
    await this.redis.del(redisKey);
  }

  /**
   * 清理过期数据
   */
  async cleanup(): Promise<number> {
    return 0; // Redis handles TTL automatically
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    totalEntries: number;
    activeEntries: number;
    expiredEntries: number;
  }> {
    if (!this.initialized || !this.redis) {
      return { totalEntries: 0, activeEntries: 0, expiredEntries: 0 };
    }

    const pattern = this.keyPrefix + '*';
    const keys = await this.redis.keys(pattern);

    return {
      totalEntries: keys.length,
      activeEntries: keys.length,
      expiredEntries: 0,
    };
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.initialized = false;
    }
  }

  /**
   * 获取 Redis 客户端实例（用于高级操作）
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRedisClient(): any {
    return this.redis;
  }
}
