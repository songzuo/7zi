/**
 * @fileoverview 知识图谱查询缓存
 * @module lib/cache/knowledge-cache
 *
 * @description
 * 为知识图谱查询提供内存缓存，支持 TTL 和 LRU 淘汰策略。
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CacheOptions {
  maxEntries?: number;
  defaultTTL?: number;
}

/**
 * LRU 缓存实现，用于知识图谱查询结果
 */
export class KnowledgeQueryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxEntries: number;
  private defaultTTL: number;
  private hits = 0;
  private misses = 0;

  constructor(options: CacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 1000;
    this.defaultTTL = options.defaultTTL ?? 60000; // 默认 1 分钟
  }

  /**
   * 生成缓存键
   */
  createKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}=${JSON.stringify(params[k])}`)
      .join('&');
    return `${prefix}:${sortedParams}`;
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    entry.hits++;
    this.hits++;

    // LRU: 将访问的条目移到末尾
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // LRU 淘汰
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
      hits: 0,
    });
  }

  /**
   * 删除匹配前缀的缓存
   */
  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const hitRate = this.hits + this.misses > 0
      ? this.hits / (this.hits + this.misses)
      : 0;

    return {
      entries: this.cache.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }
}

// 全局单例
let cacheInstance: KnowledgeQueryCache | null = null;

/**
 * 获取知识查询缓存单例
 */
export function getKnowledgeQueryCache(): KnowledgeQueryCache {
  if (!cacheInstance) {
    cacheInstance = new KnowledgeQueryCache({
      maxEntries: 2000,
      defaultTTL: 30000, // 30 秒
    });
  }
  return cacheInstance;
}
