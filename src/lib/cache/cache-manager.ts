/**
 * 缓存管理器
 * 统一缓存接口，支持多种缓存提供者
 */

import type {
  CacheOptions,
  CacheStats,
  CacheInvalidateOptions,
  CacheProvider,
  TTL,
} from './types';
import { MemoryCache } from './memory-cache';
import { RedisCache } from './redis-cache';
import { LayeredCache } from './layered-cache';
import { cacheLogger } from '../logger';

export interface CacheManagerOptions extends CacheOptions {
  provider?: CacheProvider;
  redis?: {
    enabled: boolean;
    url?: string;
    prefix?: string;
  };
  memory?: {
    maxEntries?: number;
    defaultTTL?: number;
  };
  layered?: {
    writeStrategy?: 'write-through' | 'write-behind' | 'write-around';
    readStrategy?: 'look-aside' | 'read-through';
  };
}

type CacheInstance = MemoryCache | RedisCache | LayeredCache;

export class CacheManager {
  private cache: CacheInstance;
  private provider: CacheProvider;
  private initialized: boolean = false;

  constructor(options: CacheManagerOptions = {}) {
    this.provider = options.provider || 'memory';

    switch (this.provider) {
      case 'redis':
        this.cache = new RedisCache({
          ...options,
          redisUrl: options.redis?.url || options.redisUrl,
          redisPrefix: options.redis?.prefix || options.redisPrefix,
        });
        break;

      case 'layered':
        this.cache = new LayeredCache({
          ...options,
          l1Options: {
            maxEntries: options.memory?.maxEntries,
            defaultTTL: options.memory?.defaultTTL,
          },
          l2Options: {
            redisUrl: options.redis?.url || options.redisUrl,
            redisPrefix: options.redis?.prefix || options.redisPrefix,
          },
          writeStrategy: options.layered?.writeStrategy,
          readStrategy: options.layered?.readStrategy,
        });
        break;

      case 'memory':
      default:
        this.cache = new MemoryCache({
          ...options,
          maxEntries: options.memory?.maxEntries,
          defaultTTL: options.memory?.defaultTTL,
        });
        break;
    }
  }

  /**
   * 初始化缓存 (连接 Redis 等)
   */
  public async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    if (this.provider === 'redis' || this.provider === 'layered') {
      const redisCache =
        this.provider === 'redis'
          ? (this.cache as RedisCache)
          : (this.cache as LayeredCache);
      
      const connected = await redisCache.connect();
      if (!connected && this.provider === 'redis') {
        cacheLogger.warn('Redis connection failed, falling back to memory cache');
        // 降级到内存缓存
        this.cache = new MemoryCache();
        this.provider = 'memory';
      }
    }

    this.initialized = true;
    return true;
  }

  /**
   * 获取缓存值
   */
  public async get<T = unknown>(key: string): Promise<T | null> {
    if (this.provider === 'memory') {
      return (this.cache as MemoryCache).get<T>(key);
    }
    return await (this.cache as RedisCache | LayeredCache).get<T>(key);
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
    if (this.provider === 'memory') {
      return (this.cache as MemoryCache).set(key, value, ttl, tags);
    }
    return await (this.cache as RedisCache | LayeredCache).set(key, value, ttl, tags);
  }

  /**
   * 删除缓存值
   */
  public async delete(key: string): Promise<boolean> {
    if (this.provider === 'memory') {
      return (this.cache as MemoryCache).delete(key);
    }
    return await (this.cache as RedisCache | LayeredCache).delete(key);
  }

  /**
   * 检查键是否存在
   */
  public async has(key: string): Promise<boolean> {
    if (this.provider === 'memory') {
      return (this.cache as MemoryCache).has(key);
    }
    return await (this.cache as RedisCache | LayeredCache).has(key);
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
    if (this.provider === 'memory') {
      return await (this.cache as MemoryCache).getOrSet(key, factory, ttl, tags);
    }
    return await (this.cache as RedisCache | LayeredCache).getOrSet(key, factory, ttl, tags);
  }

  /**
   * 批量获取
   */
  public async mget<T = unknown>(keys: string[]): Promise<Map<string, T | null>> {
    if (this.provider === 'memory') {
      return (this.cache as MemoryCache).mget<T>(keys);
    }
    return await (this.cache as RedisCache | LayeredCache).mget<T>(keys);
  }

  /**
   * 批量设置
   */
  public async mset<T = unknown>(
    entries: Array<{ key: string; value: T; ttl?: TTL; tags?: string[] }>
  ): Promise<boolean> {
    if (this.provider === 'memory') {
      return (this.cache as MemoryCache).mset(entries);
    }
    return await (this.cache as RedisCache | LayeredCache).mset(entries);
  }

  /**
   * 失效缓存
   */
  public async invalidate(options: CacheInvalidateOptions): Promise<number> {
    if (this.provider === 'memory') {
      return (this.cache as MemoryCache).invalidate(options);
    }
    return await (this.cache as RedisCache | LayeredCache).invalidate(options);
  }

  /**
   * 更新 TTL
   */
  public async touch(key: string, ttl?: TTL): Promise<boolean> {
    if (this.provider === 'memory') {
      return (this.cache as MemoryCache).touch(key, ttl);
    }
    return await (this.cache as RedisCache | LayeredCache).touch(key, ttl);
  }

  /**
   * 清空所有缓存
   */
  public async clear(): Promise<void> {
    if (this.provider === 'memory') {
      (this.cache as MemoryCache).clear();
    } else {
      await (this.cache as RedisCache | LayeredCache).clear();
    }
  }

  /**
   * 获取缓存统计
   */
  public getStats(): CacheStats | { l1: CacheStats; l2: CacheStats; layered: Record<string, unknown> } {
    return this.cache.getStats();
  }

  /**
   * 重置统计
   */
  public resetStats(): void {
    this.cache.resetStats();
  }

  /**
   * 获取缓存提供者
   */
  public getProvider(): CacheProvider {
    return this.provider;
  }

  /**
   * 获取底层缓存实例
   */
  public getCache(): CacheInstance {
    return this.cache;
  }

  /**
   * 检查是否已初始化
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 关闭连接
   */
  public async shutdown(): Promise<void> {
    if (this.provider === 'redis') {
      await (this.cache as RedisCache).disconnect();
    } else if (this.provider === 'layered') {
      await (this.cache as LayeredCache).disconnect();
    } else {
      (this.cache as MemoryCache).stopCleanup();
    }
    this.initialized = false;
  }
}

// 默认缓存管理器实例
let defaultManager: CacheManager | null = null;
let lastOptions: CacheManagerOptions | null = null;

// 深度比较两个对象是否相等
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  return true;
}

export function getCacheManager(options?: CacheManagerOptions): CacheManager {
  // 如果配置发生变化，销毁旧实例并创建新的
  if (defaultManager && options && !deepEqual(options, lastOptions)) {
    cacheLogger.info('CacheManager config changed, recreating instance');
    defaultManager.shutdown().catch((err) => cacheLogger.error('Shutdown error:', err));
    defaultManager = null;
    lastOptions = null;
  }

  if (!defaultManager) {
    defaultManager = new CacheManager(options);
    lastOptions = options || null;
  }
  return defaultManager;
}

export function resetCacheManager(): void {
  if (defaultManager) {
    defaultManager.shutdown().catch((err) => cacheLogger.error('Shutdown error:', err));
    defaultManager = null;
  }
}

// 便捷方法
export const cache = {
  get: async <T>(key: string) => getCacheManager().get<T>(key),
  set: async <T>(key: string, value: T, ttl?: TTL, tags?: string[]) =>
    getCacheManager().set(key, value, ttl, tags),
  delete: async (key: string) => getCacheManager().delete(key),
  has: async (key: string) => getCacheManager().has(key),
  getOrSet: async <T>(key: string, factory: () => Promise<T>, ttl?: TTL, tags?: string[]) =>
    getCacheManager().getOrSet(key, factory, ttl, tags),
  invalidate: async (options: CacheInvalidateOptions) =>
    getCacheManager().invalidate(options),
  clear: async () => getCacheManager().clear(),
  getStats: () => getCacheManager().getStats(),
};