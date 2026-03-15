/**
 * @fileoverview 知识图谱查询缓存（优化版）
 * @module lib/cache/knowledge-cache
 *
 * @description
 * 为知识图谱查询提供内存缓存，支持 TTL 和 LRU 淘汰策略。
 * 
 * 优化内容：
 * - 使用稳定哈希生成缓存键
 * - 主动过期清理机制
 * - 前缀索引加速批量失效
 * - 内存使用监控
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number; // 估计内存大小
}

interface CacheOptions {
  maxEntries?: number;
  maxMemoryMB?: number;
  defaultTTL?: number;
  cleanupInterval?: number;
}

interface CacheStats {
  entries: number;
  maxEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsageMB: number;
  maxMemoryMB: number;
  expiredCleanups: number;
}

/**
 * 生成稳定的哈希值（简单实现）
 * 使用 djb2 算法变体
 */
function stableHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * 安全序列化参数（处理循环引用和稳定排序）
 */
function safeStringify(obj: unknown, seen = new WeakSet()): string {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  
  const type = typeof obj;
  
  // 基本类型直接返回
  if (type === 'string') return `"${obj}"`;
  if (type === 'number' || type === 'boolean') return String(obj);
  if (type === 'symbol') return obj.toString();
  if (type === 'function') return '[fn]';
  
  // 处理循环引用
  if (type === 'object') {
    if (seen.has(obj as object)) return '[circular]';
    seen.add(obj as object);
    
    if (Array.isArray(obj)) {
      const items = obj.map(item => safeStringify(item, seen));
      return `[${items.join(',')}]`;
    }
    
    // 对象：按 key 排序确保稳定
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    const pairs = keys.map(k => `"${k}":${safeStringify((obj as Record<string, unknown>)[k], seen)}`);
    return `{${pairs.join(',')}}`;
  }
  
  return String(obj);
}

/**
 * 估计对象内存大小（字节）
 */
function estimateSize(obj: unknown): number {
  const str = safeStringify(obj);
  // UTF-8 字符串大约每字符 1-4 字节，取平均 2 字节
  return str.length * 2;
}

/**
 * LRU 缓存实现，用于知识图谱查询结果
 */
export class KnowledgeQueryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private prefixIndex: Map<string, Set<string>> = new Map();
  private maxEntries: number;
  private maxMemoryBytes: number;
  private defaultTTL: number;
  private cleanupInterval: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private hits = 0;
  private misses = 0;
  private currentMemoryBytes = 0;
  private expiredCleanups = 0;

  constructor(options: CacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 1000;
    this.maxMemoryBytes = (options.maxMemoryMB ?? 100) * 1024 * 1024;
    this.defaultTTL = options.defaultTTL ?? 60000; // 默认 1 分钟
    this.cleanupInterval = options.cleanupInterval ?? 30000; // 默认 30 秒清理一次
    
    this.startCleanupTimer();
  }

  /**
   * 启动定期清理定时器
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.cleanupInterval);
    
    // 允许进程退出时不阻塞
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * 清理过期条目
   */
  cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.deleteEntry(key, entry);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.expiredCleanups++;
    }
    
    return cleaned;
  }

  /**
   * 删除条目（更新内存和索引）
   */
  private deleteEntry(key: string, entry: CacheEntry<unknown>): void {
    this.cache.delete(key);
    this.currentMemoryBytes -= entry.size;
    
    // 更新前缀索引
    const colonIndex = key.indexOf(':');
    if (colonIndex > 0) {
      const prefix = key.substring(0, colonIndex);
      const prefixSet = this.prefixIndex.get(prefix);
      if (prefixSet) {
        prefixSet.delete(key);
        if (prefixSet.size === 0) {
          this.prefixIndex.delete(prefix);
        }
      }
    }
  }

  /**
   * 生成缓存键（使用稳定哈希）
   */
  createKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}=${safeStringify(params[k])}`)
      .join('&');
    
    // 对长参数使用哈希缩短
    const paramStr = sortedParams.length > 200 
      ? stableHash(sortedParams)
      : sortedParams;
    
    return `${prefix}:${paramStr}`;
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
      this.deleteEntry(key, entry);
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
    const size = estimateSize(data);
    
    // 检查内存限制
    if (size > this.maxMemoryBytes * 0.5) {
      // 单个条目超过总内存 50%，不缓存
      console.warn(`[KnowledgeCache] Entry too large (${(size / 1024 / 1024).toFixed(2)}MB), skipping cache`);
      return;
    }
    
    // 如果已存在，先删除旧的
    const existing = this.cache.get(key);
    if (existing) {
      this.currentMemoryBytes -= existing.size;
    }

    // LRU 淘汰直到有空间
    while (
      (this.cache.size >= this.maxEntries || 
       this.currentMemoryBytes + size > this.maxMemoryBytes) &&
      this.cache.size > 0
    ) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        const firstEntry = this.cache.get(firstKey);
        if (firstEntry) {
          this.deleteEntry(firstKey, firstEntry);
        }
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
      hits: existing?.hits ?? 0,
      size,
    };

    this.cache.set(key, entry);
    this.currentMemoryBytes += size;

    // 更新前缀索引
    const colonIndex = key.indexOf(':');
    if (colonIndex > 0) {
      const prefix = key.substring(0, colonIndex);
      let prefixSet = this.prefixIndex.get(prefix);
      if (!prefixSet) {
        prefixSet = new Set();
        this.prefixIndex.set(prefix, prefixSet);
      }
      prefixSet.add(key);
    }
  }

  /**
   * 删除匹配前缀的缓存（使用索引加速）
   */
  invalidatePrefix(prefix: string): number {
    const prefixSet = this.prefixIndex.get(prefix);
    if (!prefixSet) {
      return 0;
    }

    const keysToDelete = [...prefixSet];
    let count = 0;

    for (const key of keysToDelete) {
      const entry = this.cache.get(key);
      if (entry) {
        this.deleteEntry(key, entry);
        count++;
      }
    }

    return count;
  }

  /**
   * 删除单个缓存
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.deleteEntry(key, entry);
      return true;
    }
    return false;
  }

  /**
   * 检查是否存在且未过期
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.deleteEntry(key, entry);
      return false;
    }
    
    return true;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.prefixIndex.clear();
    this.hits = 0;
    this.misses = 0;
    this.currentMemoryBytes = 0;
  }

  /**
   * 销毁缓存（停止定时器）
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const hitRate = this.hits + this.misses > 0
      ? this.hits / (this.hits + this.misses)
      : 0;

    return {
      entries: this.cache.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsageMB: Math.round(this.currentMemoryBytes / 1024 / 1024 * 100) / 100,
      maxMemoryMB: this.maxMemoryBytes / 1024 / 1024,
      expiredCleanups: this.expiredCleanups,
    };
  }

  /**
   * 获取内存使用信息
   */
  getMemoryInfo(): { usedMB: number; maxMB: number; percentUsed: number } {
    const usedMB = this.currentMemoryBytes / 1024 / 1024;
    const maxMB = this.maxMemoryBytes / 1024 / 1024;
    return {
      usedMB: Math.round(usedMB * 100) / 100,
      maxMB,
      percentUsed: Math.round((usedMB / maxMB) * 100),
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
      maxMemoryMB: 50,
      defaultTTL: 30000, // 30 秒
      cleanupInterval: 15000, // 15 秒清理一次
    });
  }
  return cacheInstance;
}

/**
 * 重置缓存单例（用于测试）
 */
export function resetKnowledgeQueryCache(): void {
  if (cacheInstance) {
    cacheInstance.destroy();
    cacheInstance = null;
  }
}
