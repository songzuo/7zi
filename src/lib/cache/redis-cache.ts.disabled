/**
 * Redis 缓存实现
 * 支持集群、重连、管道操作
 */

import type { CacheOptions, CacheStats, CacheInvalidateOptions, TTL } from './types';
import { cacheLogger } from '../logger';

// Redis 客户端接口 (避免直接依赖)
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  mset(...keyValues: string[]): Promise<string>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hdel(key: string, ...fields: string[]): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  ping(): Promise<string>;
  quit(): Promise<string>;
  on(event: string, callback: (...args: unknown[]) => void): this;
  connect?(): Promise<void>;
}

export class RedisCache {
  private client: RedisClient | null = null;
  private options: Required<CacheOptions>;
  private stats: CacheStats = {
    totalRequests: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
    entries: 0,
    memoryUsage: 0,
    evictions: 0,
    expirations: 0,
  };
  private tagIndexPrefix: string;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  constructor(options: CacheOptions = {}) {
    this.options = {
      prefix: options.prefix || 'cache:',
      defaultTTL: options.defaultTTL || 3600,
      maxEntries: options.maxEntries || 10000,
      compression: options.compression ?? false,
      redisUrl: options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      redisPrefix: options.redisPrefix || '7zi:',
    };
    this.tagIndexPrefix = `${this.options.redisPrefix}tags:`;
  }

  /**
   * 初始化 Redis 连接
   */
  public async connect(): Promise<boolean> {
    try {
      // 动态导入 Redis 客户端
      const redis = await this.loadRedisClient();
      
      if (!redis) {
        if (process.env.NODE_ENV === 'development') {
          cacheLogger.warn('Redis client not available, using fallback');
        }
        return false;
      }

      this.client = redis;
      
      // 测试连接
      await this.client.ping();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // 设置事件监听
      this.setupEventListeners();
      
      return true;
    } catch (error) {
      cacheLogger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 动态加载 Redis 客户端
   */
  private async loadRedisClient(): Promise<RedisClient | null> {
    try {
      // 尝试加载 ioredis
      const RedisModule = await import('ioredis');
      const Redis = RedisModule.default || RedisModule;
      return new (Redis as new (url: string, options?: Record<string, unknown>) => RedisClient)(this.options.redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > this.maxReconnectAttempts) {
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });
    } catch {
      // 尝试加载 redis
      try {
        const redis = await import('redis');
        const client = redis.createClient({ url: this.options.redisUrl });
        await client.connect();
        return client as unknown as RedisClient;
      } catch {
        if (process.env.NODE_ENV === 'development') {
          cacheLogger.warn('No Redis client available. Install ioredis or redis package.');
        }
        return null;
      }
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      this.isConnected = false;
    });

    this.client.on('error', (error: unknown) => {
      cacheLogger.error('Redis cache error:', error instanceof Error ? error : new Error(String(error)));
    });
  }

  /**
   * 解析 TTL 为秒
   */
  private parseTTL(ttl: TTL): number {
    if (typeof ttl === 'number') {
      return ttl;
    }

    const match = ttl.match(/^(\d+)(s|m|h|d)$/);
    if (!match) {
      return this.options.defaultTTL;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return this.options.defaultTTL;
    }
  }

  /**
   * 生成完整键名
   */
  private getKey(key: string): string {
    return `${this.options.redisPrefix}${this.options.prefix}${key}`;
  }

  /**
   * 序列化值
   */
  private serialize<T>(value: T): string {
    return JSON.stringify({
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * 反序列化值
   */
  private deserialize<T>(data: string | null): T | null {
    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      return parsed.value as T;
    } catch {
      return null;
    }
  }

  /**
   * 检查连接状态
   */
  private ensureConnection(): boolean {
    if (!this.isConnected || !this.client) {
      if (process.env.NODE_ENV === 'development') {
        cacheLogger.warn('Redis cache not connected');
      }
      return false;
    }
    return true;
  }

  /**
   * 获取缓存值
   */
  public async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.ensureConnection()) return null;

    this.stats.totalRequests++;

    try {
      const fullKey = this.getKey(key);
      const data = await this.client!.get(fullKey);

      if (!data) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();
      return this.deserialize<T>(data);
    } catch (error) {
      cacheLogger.error('Redis get error:', error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  public async set<T = unknown>(
    key: string,
    value: T,
    ttl?: TTL,
    tags?: string[]
  ): Promise<boolean> {
    if (!this.ensureConnection()) return false;

    try {
      const fullKey = this.getKey(key);
      const ttlSeconds = this.parseTTL(ttl || this.options.defaultTTL);
      const serialized = this.serialize(value);

      await this.client!.setex(fullKey, ttlSeconds, serialized);

      // 更新标签索引
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          await this.client!.sadd(`${this.tagIndexPrefix}${tag}`, fullKey);
        }
      }

      return true;
    } catch (error) {
      cacheLogger.error('Redis set error:', error);
      return false;
    }
  }

  /**
   * 删除缓存值
   */
  public async delete(key: string): Promise<boolean> {
    if (!this.ensureConnection()) return false;

    try {
      const fullKey = this.getKey(key);
      const result = await this.client!.del(fullKey);
      return result > 0;
    } catch (error) {
      cacheLogger.error('Redis delete error:', error);
      return false;
    }
  }

  /**
   * 检查键是否存在
   */
  public async has(key: string): Promise<boolean> {
    if (!this.ensureConnection()) return false;

    try {
      const fullKey = this.getKey(key);
      const result = await this.client!.exists(fullKey);
      return result > 0;
    } catch (error) {
      cacheLogger.error('Redis has error:', error);
      return false;
    }
  }

  /**
   * 获取或设置缓存 (工厂函数)
   */
  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: TTL,
    tags?: string[]
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl, tags);
    return value;
  }

  /**
   * 批量获取
   */
  public async mget<T = unknown>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();

    if (!this.ensureConnection()) {
      for (const key of keys) {
        result.set(key, null);
      }
      return result;
    }

    try {
      const fullKeys = keys.map((k) => this.getKey(k));
      const values = await this.client!.mget(...fullKeys);

      for (let i = 0; i < keys.length; i++) {
        result.set(keys[i], this.deserialize<T>(values[i] || null));
      }

      return result;
    } catch (error) {
      cacheLogger.error('Redis mget error:', error);
      for (const key of keys) {
        result.set(key, null);
      }
      return result;
    }
  }

  /**
   * 批量设置
   */
  public async mset<T = unknown>(
    entries: Array<{ key: string; value: T; ttl?: TTL; tags?: string[] }>
  ): Promise<boolean> {
    if (!this.ensureConnection()) return false;

    try {
      for (const { key, value, ttl, tags } of entries) {
        await this.set(key, value, ttl, tags);
      }
      return true;
    } catch (error) {
      cacheLogger.error('Redis mset error:', error);
      return false;
    }
  }

  /**
   * 失效缓存
   */
  public async invalidate(options: CacheInvalidateOptions): Promise<number> {
    if (!this.ensureConnection()) return 0;

    try {
      let count = 0;

      if (options.all) {
        const keys = await this.client!.keys(`${this.options.redisPrefix}*`);
        if (keys.length > 0) {
          count = await this.client!.del(...keys);
        }
        return count;
      }

      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          const keys = await this.client!.smembers(`${this.tagIndexPrefix}${tag}`);
          if (keys.length > 0) {
            count += await this.client!.del(...keys);
            await this.client!.del(`${this.tagIndexPrefix}${tag}`);
          }
        }
        return count;
      }

      if (options.pattern) {
        const keys = await this.client!.keys(
          `${this.options.redisPrefix}${this.options.prefix}${options.pattern.replace(/\*/g, '*')}`
        );
        if (keys.length > 0) {
          count = await this.client!.del(...keys);
        }
      }

      return count;
    } catch (error) {
      cacheLogger.error('Redis invalidate error:', error);
      return 0;
    }
  }

  /**
   * 更新 TTL
   */
  public async touch(key: string, ttl?: TTL): Promise<boolean> {
    if (!this.ensureConnection()) return false;

    try {
      const fullKey = this.getKey(key);
      const ttlSeconds = this.parseTTL(ttl || this.options.defaultTTL);
      const result = await this.client!.expire(fullKey, ttlSeconds);
      return result === 1;
    } catch (error) {
      cacheLogger.error('Redis touch error:', error);
      return false;
    }
  }

  /**
   * 获取 TTL
   */
  public async getTTL(key: string): Promise<number> {
    if (!this.ensureConnection()) return -1;

    try {
      const fullKey = this.getKey(key);
      return await this.client!.ttl(fullKey);
    } catch (error) {
      cacheLogger.error('Redis getTTL error:', error);
      return -1;
    }
  }

  /**
   * 清空所有缓存
   */
  public async clear(): Promise<void> {
    if (!this.ensureConnection()) return;

    try {
      const keys = await this.client!.keys(`${this.options.redisPrefix}*`);
      if (keys.length > 0) {
        await this.client!.del(...keys);
      }
    } catch (error) {
      cacheLogger.error('Redis clear error:', error);
    }
  }

  /**
   * 获取缓存统计
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  public resetStats(): void {
    this.stats = {
      totalRequests: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      entries: this.stats.entries,
      memoryUsage: 0,
      evictions: 0,
      expirations: 0,
    };
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    this.stats.hitRate =
      this.stats.totalRequests > 0
        ? this.stats.hits / this.stats.totalRequests
        : 0;
  }

  /**
   * 获取 Redis 信息
   */
  public async getInfo(): Promise<Record<string, unknown>> {
    if (!this.ensureConnection()) {
      return { connected: false };
    }

    return {
      connected: this.isConnected,
      url: this.options.redisUrl.replace(/:[^:@]+@/, ':****@'),
      prefix: this.options.redisPrefix,
      stats: this.getStats(),
    };
  }

  /**
   * 关闭连接
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * 检查连接状态
   */
  public isReady(): boolean {
    return this.isConnected && this.client !== null;
  }
}

// 单例实例
let redisCacheInstance: RedisCache | null = null;

export function getRedisCache(options?: CacheOptions): RedisCache {
  if (!redisCacheInstance) {
    redisCacheInstance = new RedisCache(options);
  }
  return redisCacheInstance;
}

export function resetRedisCache(): void {
  if (redisCacheInstance) {
    redisCacheInstance.disconnect();
    redisCacheInstance = null;
  }
}