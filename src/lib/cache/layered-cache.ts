/**
 * 分层缓存实现
 * L1: 内存缓存 (快速访问)
 * L2: Redis 缓存 (持久化)
 */

import type { CacheOptions, CacheStats, CacheInvalidateOptions, TTL } from './types';
import { MemoryCache } from './memory-cache';
import { RedisCache } from './redis-cache';
import { cacheLogger } from '@/lib/logger';

export type WriteStrategy = 'write-through' | 'write-behind' | 'write-around';
export type ReadStrategy = 'look-aside' | 'read-through';

export interface LayeredCacheOptions extends CacheOptions {
  writeStrategy?: WriteStrategy;
  readStrategy?: ReadStrategy;
  l1Options?: CacheOptions;
  l2Options?: CacheOptions;
}

export class LayeredCache {
  private l1: MemoryCache;
  private l2: RedisCache;
  private writeStrategy: WriteStrategy;
  private readStrategy: ReadStrategy;
  private stats: {
    l1Hits: number;
    l2Hits: number;
    misses: number;
    totalRequests: number;
  } = {
    l1Hits: 0,
    l2Hits: 0,
    misses: 0,
    totalRequests: 0,
  };

  constructor(options: LayeredCacheOptions = {}) {
    this.writeStrategy = options.writeStrategy || 'write-through';
    this.readStrategy = options.readStrategy || 'look-aside';

    // 初始化 L1 内存缓存
    this.l1 = new MemoryCache({
      prefix: options.prefix || '',
      defaultTTL: options.defaultTTL || 300, // L1 更短的 TTL
      maxEntries: options.maxEntries || 500,
      ...options.l1Options,
    });

    // 初始化 L2 Redis 缓存
    this.l2 = new RedisCache({
      prefix: options.prefix || '',
      defaultTTL: options.defaultTTL || 3600, // L2 更长的 TTL
      ...options.l2Options,
    });
  }

  /**
   * 初始化连接
   */
  public async connect(): Promise<boolean> {
    return this.l2.connect();
  }

  /**
   * 获取缓存值
   */
  public async get<T = unknown>(key: string): Promise<T | null> {
    this.stats.totalRequests++;

    // 1. 先从 L1 获取
    const l1Value = this.l1.get<T>(key);
    if (l1Value !== null) {
      this.stats.l1Hits++;
      return l1Value;
    }

    // 2. L1 未命中，从 L2 获取
    const l2Value = await this.l2.get<T>(key);
    if (l2Value !== null) {
      this.stats.l2Hits++;
      
      // 回填 L1
      this.l1.set(key, l2Value);
      
      return l2Value;
    }

    // 3. 都未命中
    this.stats.misses++;
    return null;
  }

  /**
   * 获取或设置缓存 (带工厂函数)
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
   * 设置缓存值
   */
  public async set<T = unknown>(
    key: string,
    value: T,
    ttl?: TTL,
    tags?: string[]
  ): Promise<boolean> {
    switch (this.writeStrategy) {
      case 'write-through':
        // 同时写入 L1 和 L2
        this.l1.set(key, value, ttl, tags);
        return await this.l2.set(key, value, ttl, tags);

      case 'write-behind':
        // 先写 L1，异步写 L2
        this.l1.set(key, value, ttl, tags);
        this.l2.set(key, value, ttl, tags).catch((err) => {
          cacheLogger.error('L2 async write error:', err);
        });
        return true;

      case 'write-around':
        // 只写 L2，不更新 L1
        return await this.l2.set(key, value, ttl, tags);

      default:
        this.l1.set(key, value, ttl, tags);
        return await this.l2.set(key, value, ttl, tags);
    }
  }

  /**
   * 删除缓存值
   */
  public async delete(key: string): Promise<boolean> {
    this.l1.delete(key);
    return await this.l2.delete(key);
  }

  /**
   * 检查键是否存在
   */
  public async has(key: string): Promise<boolean> {
    if (this.l1.has(key)) return true;
    return await this.l2.has(key);
  }

  /**
   * 批量获取
   */
  public async mget<T = unknown>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();
    const l2Keys: string[] = [];

    // 先从 L1 获取
    for (const key of keys) {
      const l1Value = this.l1.get<T>(key);
      if (l1Value !== null) {
        result.set(key, l1Value);
        this.stats.l1Hits++;
      } else {
        l2Keys.push(key);
      }
    }

    // L1 未命中的从 L2 获取
    if (l2Keys.length > 0) {
      const l2Results = await this.l2.mget<T>(l2Keys);
      
      for (const [key, value] of l2Results) {
        result.set(key, value);
        
        if (value !== null) {
          this.stats.l2Hits++;
          // 回填 L1
          this.l1.set(key, value);
        } else {
          this.stats.misses++;
        }
      }
    }

    this.stats.totalRequests += keys.length;
    return result;
  }

  /**
   * 批量设置
   */
  public async mset<T = unknown>(
    entries: Array<{ key: string; value: T; ttl?: TTL; tags?: string[] }>
  ): Promise<boolean> {
    // 写入 L1
    this.l1.mset(entries);

    // 写入 L2
    return await this.l2.mset(entries);
  }

  /**
   * 失效缓存
   */
  public async invalidate(options: CacheInvalidateOptions): Promise<number> {
    // 失效 L1
    this.l1.invalidate(options);

    // 失效 L2
    return await this.l2.invalidate(options);
  }

  /**
   * 更新 TTL
   */
  public async touch(key: string, ttl?: TTL): Promise<boolean> {
    this.l1.touch(key, ttl);
    return await this.l2.touch(key, ttl);
  }

  /**
   * 清空所有缓存
   */
  public async clear(): Promise<void> {
    this.l1.clear();
    await this.l2.clear();
  }

  /**
   * 获取缓存统计
   */
  public getStats(): {
    l1: CacheStats;
    l2: CacheStats;
    layered: {
      l1Hits: number;
      l2Hits: number;
      misses: number;
      totalRequests: number;
      l1HitRate: number;
      l2HitRate: number;
      overallHitRate: number;
    };
  } {
    const l1Stats = this.l1.getStats();
    const l2Stats = this.l2.getStats();

    const totalHits = this.stats.l1Hits + this.stats.l2Hits;
    const l1HitRate =
      this.stats.totalRequests > 0
        ? this.stats.l1Hits / this.stats.totalRequests
        : 0;
    const l2HitRate =
      this.stats.totalRequests > 0
        ? this.stats.l2Hits / this.stats.totalRequests
        : 0;
    const overallHitRate =
      this.stats.totalRequests > 0
        ? totalHits / this.stats.totalRequests
        : 0;

    return {
      l1: l1Stats,
      l2: l2Stats,
      layered: {
        ...this.stats,
        l1HitRate,
        l2HitRate,
        overallHitRate,
      },
    };
  }

  /**
   * 重置统计
   */
  public resetStats(): void {
    this.l1.resetStats();
    this.l2.resetStats();
    this.stats = {
      l1Hits: 0,
      l2Hits: 0,
      misses: 0,
      totalRequests: 0,
    };
  }

  /**
   * 预热缓存
   */
  public async warmup<T>(
    entries: Array<{ key: string; factory: () => Promise<T>; ttl?: TTL; tags?: string[] }>
  ): Promise<void> {
    const results = await Promise.all(
      entries.map(async ({ key, factory, ttl, tags }) => {
        const value = await factory();
        return { key, value, ttl, tags };
      })
    );

    await this.mset(results);
  }

  /**
   * 获取 L1 缓存实例
   */
  public getL1(): MemoryCache {
    return this.l1;
  }

  /**
   * 获取 L2 缓存实例
   */
  public getL2(): RedisCache {
    return this.l2;
  }

  /**
   * 关闭连接
   */
  public async disconnect(): Promise<void> {
    this.l1.stopCleanup();
    await this.l2.disconnect();
  }

  /**
   * 检查连接状态
   */
  public isReady(): boolean {
    return this.l2.isReady();
  }
}

// 单例实例
let layeredCacheInstance: LayeredCache | null = null;

export function getLayeredCache(options?: LayeredCacheOptions): LayeredCache {
  if (!layeredCacheInstance) {
    layeredCacheInstance = new LayeredCache(options);
  }
  return layeredCacheInstance;
}

export function resetLayeredCache(): void {
  if (layeredCacheInstance) {
    layeredCacheInstance.disconnect();
    layeredCacheInstance = null;
  }
}