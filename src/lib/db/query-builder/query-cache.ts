/**
 * Query Cache - 查询缓存机制
 *
 * 提供全局查询缓存和预编译语句缓存
 */

import { QueryBuilder, QueryCacheConfig } from './query-builder';

/**
 * 预编译语句缓存条目
 */
interface PreparedStatementCacheEntry {
  sql: string;
  stmt: { all: (...params: unknown[]) => unknown[] };
  lastUsed: number;
  useCount: number;
}

/**
 * 全局预编译语句缓存 (单例模式)
 */
export class PreparedStatementCache {
  private static instance: PreparedStatementCache;
  private cache = new Map<string, PreparedStatementCacheEntry>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5分钟
  private readonly MAX_SIZE = 100;

  private constructor() {}

  static getInstance(): PreparedStatementCache {
    if (!PreparedStatementCache.instance) {
      PreparedStatementCache.instance = new PreparedStatementCache();
    }
    return PreparedStatementCache.instance;
  }

  get(db: { prepare: (sql: string) => unknown }, sql: string) {
    const entry = this.cache.get(sql);
    if (entry) {
      entry.lastUsed = Date.now();
      entry.useCount++;
      // 类型断言 - 我们知道这是有效的 prepared statement
      return entry.stmt as { all: (...params: unknown[]) => unknown[] };
    }
    return null;
  }

  set(db: { prepare: (sql: string) => unknown }, sql: string, stmt: { all: (...params: unknown[]) => unknown[] }) {
    // 检查缓存大小限制
    if (this.cache.size >= this.MAX_SIZE) {
      this.evictOldest();
    }

    this.cache.set(sql, {
      sql,
      stmt,
      lastUsed: Date.now(),
      useCount: 1,
    });
  }

  clear() {
    this.cache.clear();
  }

  private evictOldest() {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 获取缓存大小
   */
  getSize(): number {
    return this.cache.size;
  }
}

/**
 * 全局查询缓存 - 存储在 QueryBuilder 类中
 * 为了保持向后兼容,我们在 QueryBuilder 类中添加静态方法
 */

// 扩展 QueryBuilder 类以添加缓存方法
declare module './query-builder' {
  interface QueryBuilder {
    setCacheConfig(config: QueryCacheConfig): this;
    _getCacheKey(): string;
  }
}

// 为 QueryBuilder 添加缓存方法
QueryBuilder.prototype.setCacheConfig = function(config: QueryCacheConfig): QueryBuilder {
  this._setCacheConfig(config);
  return this;
};

/**
 * 生成缓存键 (QueryBuilder 的私有方法)
 */
QueryBuilder.prototype._getCacheKey = function(): string {
  const config = this._getConfig();
  const key = JSON.stringify({
    from: config.from,
    conditions: config.conditions?.map(c => ({ condition: c.condition, type: typeof c.value })),
    sort: config.sort,
    pagination: config.pagination,
    select: config.select,
    joins: config.joins?.map(j => ({ type: j.type, table: j.table, on: j.on, alias: j.alias })),
    groupBy: config.groupBy,
    having: config.having?.map(h => h.condition),
    distinct: config.distinct,
    indexHint: this._getIndexHint(),
  });
  return key;
};

/**
 * 获取缓存统计信息
 * @returns 缓存统计
 */
export function getCacheStats() {
  const cacheInstance = PreparedStatementCache.getInstance();
  const cacheSize = cacheInstance.getSize();

  return {
    queryCache: QueryBuilder.getCacheStats(),
    preparedStatementCache: {
      size: cacheSize,
    },
  };
}

/**
 * 清空所有缓存 (查询缓存 + 预编译语句缓存)
 * @example
 * clearAllCaches();
 */
export function clearAllCaches() {
  QueryBuilder.clearGlobalCache();
  PreparedStatementCache.getInstance().clear();
}
