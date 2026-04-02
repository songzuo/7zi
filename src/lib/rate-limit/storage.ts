/**
 * Redis 存储适配器
 * 为限流算法提供统一的 Redis 接口，支持分布式部署
 */

import Redis from 'ioredis';

export interface RedisConfig {
  /** Redis 连接 URL */
  url?: string;
  /** Redis 主机 */
  host?: string;
  /** Redis 端口 */
  port?: number;
  /** Redis 密码 */
  password?: string;
  /** 数据库索引 */
  db?: number;
  /** 连接池大小 */
  poolSize?: number;
  /** 连接超时（毫秒） */
  connectTimeout?: number;
  /** 键前缀 */
  keyPrefix?: string;
  /** 本地缓存 TTL（毫秒） */
  localCacheTTL?: number;
}

export class RateLimitStorage {
  private redis: Redis;
  private keyPrefix: string;
  private localCache: Map<string, { value: any; expiry: number }> = new Map();
  private localCacheTTL: number;

  constructor(config: RedisConfig = {}) {
    const {
      url,
      host = 'localhost',
      port = 6379,
      password,
      db = 0,
      connectTimeout = 5000,
      keyPrefix = 'ratelimit',
      localCacheTTL = 5000
    } = config;

    this.keyPrefix = keyPrefix;
    this.localCacheTTL = localCacheTTL;

    if (url) {
      this.redis = new Redis(url, {
        connectTimeout,
        lazyConnect: true,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });
    } else {
      this.redis = new Redis({
        host,
        port,
        password,
        db,
        connectTimeout,
        lazyConnect: true,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });
    }

    // 连接成功后清理过期缓存
    this.redis.on('connect', () => {
      this.cleanupLocalCache();
    });
  }

  /**
   * 获取 Redis 实例
   */
  getClient(): Redis {
    return this.redis;
  }

  /**
   * 带本地缓存的 get
   */
  async getWithCache(key: string): Promise<string | null> {
    // 检查本地缓存
    const cached = this.localCache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.value;
    }

    // 从 Redis 获取
    const fullKey = `${this.keyPrefix}:${key}`;
    const value = await this.redis.get(fullKey);

    if (value !== null) {
      // 更新本地缓存
      this.localCache.set(key, {
        value,
        expiry: Date.now() + this.localCacheTTL
      });
    }

    return value;
  }

  /**
   * 带本地缓存失效的 set
   */
  async setWithCache(key: string, value: string, ttl?: number): Promise<void> {
    const fullKey = `${this.keyPrefix}:${key}`;
    if (ttl) {
      await this.redis.set(fullKey, value, 'EX', ttl);
    } else {
      await this.redis.set(fullKey, value);
    }

    // 更新本地缓存
    this.localCache.set(key, {
      value,
      expiry: ttl ? Date.now() + ttl * 1000 : Date.now() + this.localCacheTTL
    });
  }

  /**
   * 执行 Lua 脚本
   */
  async eval(
    script: string,
    numKeys: number,
    ...args: (string | number)[]
  ): Promise<any> {
    return this.redis.eval(script, numKeys, ...args);
  }

  /**
   * 带键前缀的 eval
   */
  async evalWithPrefix(
    script: string,
    keys: string[],
    args: (string | number)[]
  ): Promise<any> {
    const prefixedKeys = keys.map(k => `${this.keyPrefix}:${k}`);
    return this.redis.eval(script, prefixedKeys.length, ...prefixedKeys, ...args);
  }

  /**
   * 删除键（同时清除本地缓存）
   */
  async del(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}:${key}`;
    await this.redis.del(fullKey);
    this.localCache.delete(key);
  }

  /**
   * 清除本地缓存
   */
  private cleanupLocalCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.localCache.entries()) {
      if (now >= cached.expiry) {
        this.localCache.delete(key);
      }
    }
  }

  /**
   * 清除所有本地缓存
   */
  clearLocalCache(): void {
    this.localCache.clear();
  }

  /**
   * 批量获取（支持本地缓存）
   */
  async mgetWithCache(keys: string[]): Promise<(string | null)[]> {
    const results: (string | null)[] = [];
    const keysToFetch: string[] = [];
    const keyMap = new Map<string, number>();

    // 检查本地缓存
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const cached = this.localCache.get(key);
      if (cached && Date.now() < cached.expiry) {
        results[i] = cached.value;
      } else {
        results[i] = null;
        keysToFetch.push(key);
        keyMap.set(key, i);
      }
    }

    // 从 Redis 批量获取
    if (keysToFetch.length > 0) {
      const fullKeys = keysToFetch.map(k => `${this.keyPrefix}:${k}`);
      const values = await this.redis.mget(...fullKeys);

      for (let i = 0; i < values.length; i++) {
        const key = keysToFetch[i];
        const value = values[i];
        const index = keyMap.get(key)!;

        results[index] = value;

        if (value !== null) {
          this.localCache.set(key, {
            value,
            expiry: Date.now() + this.localCacheTTL
          });
        }
      }
    }

    return results;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    redisConnected: boolean;
    localCacheSize: number;
    memoryUsage: NodeJS.MemoryUsage;
  }> {
    const redisConnected = await this.healthCheck();
    const localCacheSize = this.localCache.size;
    const memoryUsage = process.memoryUsage();

    return {
      redisConnected,
      localCacheSize,
      memoryUsage
    };
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    await this.redis.quit();
    this.localCache.clear();
  }

  /**
   * 获取键前缀
   */
  getKeyPrefix(): string {
    return this.keyPrefix;
  }

  /**
   * 设置键前缀
   */
  setKeyPrefix(prefix: string): void {
    this.keyPrefix = prefix;
  }
}

export default RateLimitStorage;
