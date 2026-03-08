/**
 * 内存缓存实现
 * 支持 LRU 驱逐策略、TTL、标签失效
 */

import type { CacheEntry, CacheOptions, CacheStats, CacheInvalidateOptions, TTL } from './types';

export class MemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
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
  private cleanupInterval: NodeJS.Timeout | null = null;
  private tagIndex: Map<string, Set<string>> = new Map();

  constructor(options: CacheOptions = {}) {
    this.options = {
      prefix: options.prefix || 'cache:',
      defaultTTL: options.defaultTTL || 3600,
      maxEntries: options.maxEntries || 1000,
      compression: options.compression ?? false,
      redisUrl: options.redisUrl || '',
      redisPrefix: options.redisPrefix || '',
    };

    this.startCleanup();
  }

  /**
   * 解析 TTL 为毫秒
   */
  private parseTTL(ttl: TTL): number {
    if (typeof ttl === 'number') {
      return ttl * 1000;
    }

    const match = ttl.match(/^(\d+)(s|m|h|d)$/);
    if (!match) {
      return this.options.defaultTTL * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return this.options.defaultTTL * 1000;
    }
  }

  /**
   * 生成完整键名
   */
  private getKey(key: string): string {
    return `${this.options.prefix}${key}`;
  }

  /**
   * 更新标签索引
   */
  private updateTagIndex(key: string, tags?: string[]): void {
    // 移除旧标签
    for (const [, keys] of this.tagIndex) {
      keys.delete(key);
    }

    // 添加新标签
    if (tags) {
      for (const tag of tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(key);
      }
    }
  }

  /**
   * 估算对象大小 (字节)
   */
  private estimateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length * 2; // UTF-16
    } catch {
      return 1024; // 默认 1KB
    }
  }

  /**
   * LRU 驱逐
   */
  private evictLRU(): void {
    let oldest: { key: string; accessedAt: number } | null = null;

    for (const [key, entry] of this.cache) {
      if (!oldest || entry.accessedAt < oldest.accessedAt) {
        oldest = { key, accessedAt: entry.accessedAt };
      }
    }

    if (oldest) {
      this.delete(oldest.key.replace(this.options.prefix, ''));
      this.stats.evictions++;
    }
  }

  /**
   * 清理过期条目
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const rawKey = key.replace(this.options.prefix, '');
      this.delete(rawKey);
      this.stats.expirations++;
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      60000 // 每分钟清理一次
    );
  }

  /**
   * 停止定期清理
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 获取缓存值
   */
  public get<T = unknown>(key: string): T | null {
    this.stats.totalRequests++;
    const fullKey = this.getKey(key);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    const now = Date.now();
    if (entry.expiresAt <= now) {
      this.delete(key);
      this.stats.misses++;
      this.stats.expirations++;
      this.updateHitRate();
      return null;
    }

    // 更新访问统计
    entry.accessedAt = now;
    entry.accessCount++;
    this.stats.hits++;
    this.updateHitRate();

    return entry.value as T;
  }

  /**
   * 设置缓存值
   */
  public set<T = unknown>(key: string, value: T, ttl?: TTL, tags?: string[]): boolean {
    // 如果超过最大条目数，执行 LRU 驱逐
    while (this.cache.size >= this.options.maxEntries) {
      this.evictLRU();
    }

    const fullKey = this.getKey(key);
    const ttlMs = this.parseTTL(ttl || this.options.defaultTTL);
    const now = Date.now();

    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + ttlMs,
      createdAt: now,
      accessedAt: now,
      accessCount: 0,
      tags,
    };

    // 更新标签索引
    this.updateTagIndex(fullKey, tags);

    // 计算内存使用
    const oldEntry = this.cache.get(fullKey);
    if (oldEntry) {
      this.stats.memoryUsage -= this.estimateSize(oldEntry.value);
    }
    this.stats.memoryUsage += this.estimateSize(value);

    this.cache.set(fullKey, entry);
    this.stats.entries = this.cache.size;

    return true;
  }

  /**
   * 删除缓存值
   */
  public delete(key: string): boolean {
    const fullKey = this.getKey(key);
    const entry = this.cache.get(fullKey);

    if (entry) {
      this.stats.memoryUsage -= this.estimateSize(entry.value);
      this.updateTagIndex(fullKey, undefined);
    }

    const deleted = this.cache.delete(fullKey);
    this.stats.entries = this.cache.size;
    return deleted;
  }

  /**
   * 检查键是否存在
   */
  public has(key: string): boolean {
    const fullKey = this.getKey(key);
    const entry = this.cache.get(fullKey);

    if (!entry) return false;

    if (entry.expiresAt <= Date.now()) {
      this.delete(key);
      return false;
    }

    return true;
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
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl, tags);
    return value;
  }

  /**
   * 批量获取
   */
  public mget<T = unknown>(keys: string[]): Map<string, T | null> {
    const result = new Map<string, T | null>();
    for (const key of keys) {
      result.set(key, this.get<T>(key));
    }
    return result;
  }

  /**
   * 批量设置
   */
  public mset<T = unknown>(
    entries: Array<{ key: string; value: T; ttl?: TTL; tags?: string[] }>
  ): boolean {
    for (const { key, value, ttl, tags } of entries) {
      this.set(key, value, ttl, tags);
    }
    return true;
  }

  /**
   * 失效缓存
   */
  public invalidate(options: CacheInvalidateOptions): number {
    let count = 0;

    if (options.all) {
      count = this.cache.size;
      this.clear();
      return count;
    }

    if (options.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        const keys = this.tagIndex.get(tag);
        if (keys) {
          for (const key of keys) {
            const rawKey = key.replace(this.options.prefix, '');
            if (this.delete(rawKey)) {
              count++;
            }
          }
        }
      }
      return count;
    }

    if (options.pattern) {
      const regex = new RegExp(
        `^${this.options.prefix}${options.pattern.replace(/\*/g, '.*')}$`
      );
      const keysToDelete: string[] = [];

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key.replace(this.options.prefix, ''));
        }
      }

      for (const key of keysToDelete) {
        if (this.delete(key)) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * 更新 TTL
   */
  public touch(key: string, ttl?: TTL): boolean {
    const entry = this.cache.get(this.getKey(key));
    if (!entry) return false;

    entry.expiresAt = Date.now() + this.parseTTL(ttl || this.options.defaultTTL);
    return true;
  }

  /**
   * 清空所有缓存
   */
  public clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
    this.stats.memoryUsage = 0;
    this.stats.entries = 0;
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
      entries: this.cache.size,
      memoryUsage: this.stats.memoryUsage,
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
   * 获取所有键
   */
  public keys(): string[] {
    return Array.from(this.cache.keys()).map((k) =>
      k.replace(this.options.prefix, '')
    );
  }

  /**
   * 获取缓存大小
   */
  public size(): number {
    return this.cache.size;
  }
}

// 单例实例
let memoryCacheInstance: MemoryCache | null = null;

export function getMemoryCache(options?: CacheOptions): MemoryCache {
  if (!memoryCacheInstance) {
    memoryCacheInstance = new MemoryCache(options);
  }
  return memoryCacheInstance;
}

export function resetMemoryCache(): void {
  if (memoryCacheInstance) {
    memoryCacheInstance.stopCleanup();
    memoryCacheInstance.clear();
    memoryCacheInstance = null;
  }
}