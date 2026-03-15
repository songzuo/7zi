/**
 * 缓存管理器
 * 统一缓存接口，支持 Memory 缓存
 * 注意：Redis/Layered 缓存暂时禁用
 */

import type {
  CacheOptions,
  CacheStats,
  CacheInvalidateOptions,
  TTL,
} from './types';
import { MemoryCache } from './memory-cache';
import { cacheLogger } from '../logger';

export interface CacheManagerOptions extends CacheOptions {
  memory?: {
    maxEntries?: number;
    defaultTTL?: number;
  };
}

export class CacheManager {
  private cache: MemoryCache;
  private initialized: boolean = false;

  constructor(options: CacheManagerOptions = {}) {
    this.cache = new MemoryCache({
      ...options,
      maxEntries: options.memory?.maxEntries,
      defaultTTL: options.memory?.defaultTTL,
    });
  }

  /**
   * 初始化缓存
   */
  public async initialize(): Promise<boolean> {
    this.initialized = true;
    return true;
  }

  /**
   * 获取缓存值
   */
  public async get<T = unknown>(key: string): Promise<T | null> {
    return this.cache.get<T>(key);
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
    return this.cache.set(key, value, ttl, tags);
  }

  /**
   * 删除缓存值
   */
  public async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * 检查键是否存在
   */
  public async has(key: string): Promise<boolean> {
    return this.cache.has(key);
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
    return this.cache.getOrSet(key, factory, ttl, tags);
  }

  /**
   * 批量获取
   */
  public async mget<T = unknown>(keys: string[]): Promise<Map<string, T | null>> {
    return this.cache.mget<T>(keys);
  }

  /**
   * 批量设置
   */
  public async mset<T = unknown>(
    entries: Array<{ key: string; value: T; ttl?: TTL; tags?: string[] }>
  ): Promise<boolean> {
    return this.cache.mset(entries);
  }

  /**
   * 失效缓存
   */
  public async invalidate(options: CacheInvalidateOptions): Promise<number> {
    return this.cache.invalidate(options);
  }

  /**
   * 更新 TTL
   */
  public async touch(key: string, ttl?: TTL): Promise<boolean> {
    return this.cache.touch(key, ttl);
  }

  /**
   * 清空所有缓存
   */
  public async clear(): Promise<void> {
    return this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  public getStats(): CacheStats {
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
  public getProvider(): string {
    return 'memory';
  }

  /**
   * 获取底层缓存实例
   */
  public getCache(): MemoryCache {
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
    this.cache.stopCleanup();
    this.initialized = false;
  }
}

// 默认缓存管理器实例
let defaultManager: CacheManager | null = null;

// 获取缓存管理器实例
export function getCacheManager(_options?: CacheManagerOptions): CacheManager {
  if (!defaultManager) {
    defaultManager = new CacheManager(_options);
  }
  return defaultManager;
}

// 重置缓存管理器
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
