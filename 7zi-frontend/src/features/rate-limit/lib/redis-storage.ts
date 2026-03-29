/**
 * Redis Rate Limit Storage
 *
 * 基于 Redis 的速率限制存储实现，支持分布式部署
 */

import Redis from 'ioredis';
import { IRateLimitStorage, RateLimitEntry } from './storage';

/**
 * Redis 限流存储类
 */
export class RedisRateLimitStorage implements IRateLimitStorage {
  private redis: Redis;
  private keyPrefix = 'rate-limit:';

  constructor(redisClient?: Redis) {
    if (redisClient) {
      this.redis = redisClient;
    } else {
      // 使用默认连接配置
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            return null; // 停止重试
          }
          return Math.min(times * 100, 3000); // 指数退避
        },
      });
    }
  }

  /**
   * 增加请求计数
   */
  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const redisKey = this.keyPrefix + key;
    const now = Date.now();
    const resetTime = now + windowMs;

    // 使用 Lua 脚本原子性地执行增量和设置过期时间
    const luaScript = `
      local current = redis.call('GET', KEYS[1])
      if current == nil then
        redis.call('SET', KEYS[1], 1)
        redis.call('PEXPIREAT', KEYS[2], ARGV[2])
        redis.call('HSET', KEYS[3], 'windowStart', ARGV[1])
        redis.call('PEXPIREAT', KEYS[3], ARGV[2])
        return {1, ARGV[2], ARGV[1]}
      else
        local count = tonumber(current) + 1
        redis.call('INCR', KEYS[1])
        local windowStart = redis.call('HGET', KEYS[3], 'windowStart')
        if windowStart == nil then
          redis.call('HSET', KEYS[3], 'windowStart', ARGV[1])
          windowStart = ARGV[1]
        end
        return {count, ARGV[2], windowStart}
      end
    `;

    const result = await this.redis.eval(
      luaScript,
      3,
      redisKey, // KEYS[1]: 计数器
      redisKey, // KEYS[2]: 过期时间（复用 key）
      `${redisKey}:meta`, // KEYS[3]: 元数据
      now.toString(), // ARGV[1]: 当前时间戳
      resetTime.toString(), // ARGV[2]: 过期时间戳
    );

    // Redis 返回的是 Buffer 数组，需要转换
    const count = typeof result[0] === 'number' ? result[0] : parseInt(result[0].toString(), 10);
    const reset = typeof result[1] === 'number' ? result[1] : parseInt(result[1].toString(), 10);
    const windowStart = typeof result[2] === 'number' ? result[2] : parseInt(result[2].toString(), 10);

    return {
      count,
      resetTime: reset,
      windowStart,
    };
  }

  /**
   * 获取当前计数
   */
  async get(key: string): Promise<RateLimitEntry | null> {
    const redisKey = this.keyPrefix + key;
    const metaKey = `${redisKey}:meta`;

    const pipeline = this.redis.pipeline();
    pipeline.get(redisKey);
    pipeline.get(metaKey);
    pipeline.ttl(redisKey);

    const [countStr, metaStr, ttl] = await pipeline.exec();

    if (!countStr || countStr[1] === null) {
      return null;
    }

    const count = parseInt(countStr[1] as string, 10);

    // 获取窗口开始时间
    let windowStart = Date.now();
    if (metaStr && metaStr[1] !== null) {
      const meta = JSON.parse(metaStr[1] as string);
      windowStart = meta.windowStart || Date.now();
    }

    // 计算 resetTime
    const ttlSeconds = ttl && ttl[1] !== -2 ? ttl[1] as number : 60;
    const resetTime = Date.now() + ttlSeconds * 1000;

    return {
      count,
      resetTime,
      windowStart,
    };
  }

  /**
   * 重置计数
   */
  async reset(key: string): Promise<void> {
    const redisKey = this.keyPrefix + key;
    const metaKey = `${redisKey}:meta`;

    await this.redis.del(redisKey, metaKey);
  }

  /**
   * 清理过期数据
   *
   * Redis 会自动清理过期的键，这里返回 0 表示不需要手动清理
   */
  async cleanup(): Promise<number> {
    return 0;
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    totalEntries: number;
    activeEntries: number;
    expiredEntries: number;
  }> {
    const pattern = this.keyPrefix + '*';
    const keys = await this.redis.keys(pattern);

    let active = 0;
    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl > 0) {
        active++;
      }
    }

    return {
      totalEntries: keys.length,
      activeEntries: active,
      expiredEntries: keys.length - active,
    };
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * 获取 Redis 客户端实例（用于高级操作）
   */
  getRedisClient(): Redis {
    return this.redis;
  }
}
