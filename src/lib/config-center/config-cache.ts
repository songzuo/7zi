/**
 * 配置缓存模块
 * @module config-center/config-cache
 * @version 1.10.0
 */

import {
  ConfigCacheItem,
  ConfigEnvironment,
} from './types';

/**
 * 缓存统计信息
 */
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
}

/**
 * 缓存配置
 */
interface CacheConfig {
  /** 默认TTL (秒) */
  defaultTtl: number;
  /** 最大缓存条目数 */
  maxSize: number;
  /** 是否启用统计 */
  enableStats: boolean;
  /** 清理间隔 (毫秒) */
  cleanupInterval: number;
}

/**
 * 配置缓存
 * 
 * 提供高效的配置缓存机制，支持TTL、LRU淘汰策略
 */
export class ConfigCache {
  private cache: Map<string, ConfigCacheItem> = new Map();
  private accessOrder: Map<string, number> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
  };
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(defaultTtl: number = 300, options: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTtl,
      maxSize: options.maxSize || 10000,
      enableStats: options.enableStats ?? true,
      cleanupInterval: options.cleanupInterval || 60000, // 1分钟
    };

    // 启动定期清理
    this.startCleanupTimer();
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(key: string, environment: ConfigEnvironment): string {
    return `${environment}:${key}`;
  }

  /**
   * 获取缓存
   */
  get(key: string, environment: ConfigEnvironment): ConfigCacheItem | undefined {
    const cacheKey = this.generateCacheKey(key, environment);
    const item = this.cache.get(cacheKey);

    // 缓存不存在
    if (!item) {
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      return undefined;
    }

    // 缓存已过期
    if (this.isExpired(item)) {
      this.cache.delete(cacheKey);
      this.accessOrder.delete(cacheKey);
      
      if (this.config.enableStats) {
        this.stats.misses++;
        this.stats.evictions++;
      }
      
      return undefined;
    }

    // 更新访问顺序 (LRU)
    this.accessOrder.set(cacheKey, Date.now());
    
    if (this.config.enableStats) {
      this.stats.hits++;
      item.hitCount++;
    }

    return item;
  }

  /**
   * 设置缓存
   */
  set(
    key: string,
    value: unknown,
    environment: ConfigEnvironment,
    version: number,
    ttl?: number
  ): void {
    const cacheKey = this.generateCacheKey(key, environment);
    const now = Date.now();
    const ttlSeconds = ttl ?? this.config.defaultTtl;

    // 检查是否需要淘汰
    if (this.cache.size >= this.config.maxSize && !this.cache.has(cacheKey)) {
      this.evictLRU();
    }

    const item: ConfigCacheItem = {
      key,
      value,
      environment,
      cachedAt: new Date(now),
      expiresAt: new Date(now + ttlSeconds * 1000),
      version,
      hitCount: this.cache.get(cacheKey)?.hitCount || 0,
    };

    this.cache.set(cacheKey, item);
    this.accessOrder.set(cacheKey, now);

    if (this.config.enableStats) {
      this.stats.sets++;
    }
  }

  /**
   * 删除缓存
   */
  delete(key: string, environment: ConfigEnvironment): boolean {
    const cacheKey = this.generateCacheKey(key, environment);
    const existed = this.cache.delete(cacheKey);
    this.accessOrder.delete(cacheKey);

    if (existed && this.config.enableStats) {
      this.stats.deletes++;
    }

    return existed;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder.clear();

    if (this.config.enableStats) {
      this.stats.deletes += size;
    }
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string, environment: ConfigEnvironment): boolean {
    const cacheKey = this.generateCacheKey(key, environment);
    const item = this.cache.get(cacheKey);
    
    if (!item) {
      return false;
    }

    if (this.isExpired(item)) {
      this.cache.delete(cacheKey);
      this.accessOrder.delete(cacheKey);
      return false;
    }

    return true;
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats & {
    hitRate: number;
    size: number;
    maxSize: number;
  } {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      ...this.stats,
      hitRate,
      size: this.cache.size,
      maxSize: this.config.maxSize,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
  }

  /**
   * 刷新缓存TTL
   */
  refresh(key: string, environment: ConfigEnvironment, ttl?: number): boolean {
    const cacheKey = this.generateCacheKey(key, environment);
    const item = this.cache.get(cacheKey);

    if (!item || this.isExpired(item)) {
      return false;
    }

    const ttlSeconds = ttl ?? this.config.defaultTtl;
    item.expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    this.accessOrder.set(cacheKey, Date.now());

    return true;
  }

  /**
   * 批量获取缓存
   */
  getMultiple(
    keys: string[],
    environment: ConfigEnvironment
  ): Map<string, ConfigCacheItem> {
    const result = new Map<string, ConfigCacheItem>();

    for (const key of keys) {
      const item = this.get(key, environment);
      if (item) {
        result.set(key, item);
      }
    }

    return result;
  }

  /**
   * 批量设置缓存
   */
  setMultiple(
    items: Array<{
      key: string;
      value: unknown;
      environment: ConfigEnvironment;
      version: number;
      ttl?: number;
    }>
  ): void {
    for (const item of items) {
      this.set(item.key, item.value, item.environment, item.version, item.ttl);
    }
  }

  /**
   * 检查缓存项是否过期
   */
  private isExpired(item: ConfigCacheItem): boolean {
    return Date.now() > item.expiresAt.getTime();
  }

  /**
   * LRU淘汰策略
   */
  private evictLRU(): void {
    if (this.accessOrder.size === 0) {
      return;
    }

    // 找到最久未访问的项
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      
      if (this.config.enableStats) {
        this.stats.evictions++;
      }
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, item] of this.cache) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0 && this.config.enableStats) {
      this.stats.evictions += cleaned;
    }

    return cleaned;
  }

  /**
   * 启动定期清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 停止定期清理定时器
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 按环境清除缓存
   */
  clearByEnvironment(environment: ConfigEnvironment): number {
    let cleared = 0;
    const prefix = `${environment}:`;

    for (const [key] of this.cache) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        cleared++;
      }
    }

    if (cleared > 0 && this.config.enableStats) {
      this.stats.deletes += cleared;
    }

    return cleared;
  }

  /**
   * 按前缀清除缓存
   */
  clearByPrefix(prefix: string, environment: ConfigEnvironment): number {
    let cleared = 0;
    const envPrefix = `${environment}:${prefix}`;

    for (const [key] of this.cache) {
      if (key.startsWith(envPrefix)) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        cleared++;
      }
    }

    if (cleared > 0 && this.config.enableStats) {
      this.stats.deletes += cleared;
    }

    return cleared;
  }

  /**
   * 获取缓存键列表
   */
  keys(environment?: ConfigEnvironment): string[] {
    const result: string[] = [];

    for (const key of this.cache.keys()) {
      if (environment) {
        if (key.startsWith(`${environment}:`)) {
          result.push(key.substring(environment.length + 1));
        }
      } else {
        const colonIndex = key.indexOf(':');
        result.push(key.substring(colonIndex + 1));
      }
    }

    return result;
  }

  /**
   * 导出缓存数据
   */
  export(): ConfigCacheItem[] {
    return Array.from(this.cache.values());
  }

  /**
   * 导入缓存数据
   */
  import(items: ConfigCacheItem[]): void {
    for (const item of items) {
      const cacheKey = this.generateCacheKey(item.key, item.environment);
      this.cache.set(cacheKey, item);
      this.accessOrder.set(cacheKey, Date.now());
    }

    if (this.config.enableStats) {
      this.stats.sets += items.length;
    }
  }

  /**
   * 销毁缓存
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
  }
}
