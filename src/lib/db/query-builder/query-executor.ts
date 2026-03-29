/**
 * Query Executor - 查询执行和批量操作
 *
 * 提供查询执行和批量操作的辅助函数
 */

import { QueryBuilder, BatchResult, BuiltQuery } from './query-builder';
import { PreparedStatementCache } from './query-cache';

/**
 * 扩展 QueryBuilder 类以添加 execute 方法
 */
declare module './query-builder' {
  interface QueryBuilder {
    /**
     * 执行查询并缓存结果 (如果启用缓存)
     * @param db - 数据库实例
     * @param useCache - 是否使用缓存 (默认: 使用配置的设置)
     * @returns 查询结果
     * @example
     * const rows = await builder.execute(db);
     */
    execute<T extends Record<string, unknown> = Record<string, unknown>>(
      db: { prepare: (sql: string) => { all: (...params: unknown[]) => T[] } },
      useCache?: boolean
    ): T[];
  }
}

/**
 * 为 QueryBuilder 添加 execute 方法
 */
QueryBuilder.prototype.execute = function<T extends Record<string, unknown> = Record<string, unknown>>(
  db: { prepare: (sql: string) => { all: (...params: unknown[]) => T[] } },
  useCache?: boolean
): T[] {
  const cacheConfig = this._getCacheConfig();
  const cacheEnabled = useCache ?? cacheConfig.enabled;
  const { sql, params } = this.build();

  // 如果启用了缓存,尝试从缓存获取
  if (cacheEnabled) {
    const cacheKey = this._getCacheKey();
    const globalCache = QueryBuilder._getGlobalCache();
    const cached = globalCache.get(cacheKey);

    if (cached) {
      const now = Date.now();
      const ttl = cacheConfig.ttl || 60000;

      // 检查缓存是否过期
      if (now - cached.timestamp < ttl) {
        QueryBuilder._incrementCacheHits();
        QueryBuilder._incrementCacheItemHits(cacheKey);
        return cached.data as T[];
      } else {
        // 缓存过期,删除
        globalCache.delete(cacheKey);
      }
    }
  }

  // 未启用缓存或缓存未命中,执行查询
  QueryBuilder._incrementCacheMisses();

  // 使用预编译语句缓存
  const stmtCache = PreparedStatementCache.getInstance();
  let stmt = stmtCache.get(db, sql);

  if (!stmt) {
    const prepared = db.prepare(sql);
    stmt = prepared as { all: (...params: unknown[]) => T[] };
    stmtCache.set(db, sql, stmt);
  }

  const result = stmt.all(...params);

  // 如果启用了缓存,保存结果
  if (cacheEnabled) {
    const cacheKey = this._getCacheKey();
    const globalCache = QueryBuilder._getGlobalCache();

    // 检查缓存大小限制
    const maxSize = cacheConfig.maxSize || 50;
    if (globalCache.size >= maxSize) {
      // 简单的 LRU: 删除最旧的条目
      let oldestKey: string | null = null;
      let oldestTime = Date.now();

      Array.from(globalCache.entries()).forEach(([key, entry]) => {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      });

      if (oldestKey) {
        globalCache.delete(oldestKey);
      }
    }

    globalCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      hits: 1,
    });
  }

  return result as T[];
};

/**
 * 执行查询的辅助函数 (结合 better-sqlite3) - 优化版,使用预编译语句缓存
 * @param db - 数据库实例
 * @param tableName - 表名
 * @param filters - 过滤器对象
 * @param options - 查询选项
 * @returns 查询结果行
 * @example
 * const rows = executeQuery(db, 'agents', {
 *   status: 'active',
 *   type: 'worker'
 * }, {
 *   limit: 10,
 *   orderBy: 'created_at',
 *   sortOrder: 'DESC'
 * });
 */
export function executeQuery<T extends Record<string, unknown> = Record<string, unknown>>(
  db: { prepare: (sql: string) => { all: (...params: unknown[]) => T[] } },
  tableName: string,
  filters: Record<string, unknown>,
  options?: {
    prefix?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    select?: string[];
    useCache?: boolean;
  }
): T[] {
  const builder = new QueryBuilder({ from: tableName });

  // 添加可选过滤器
  if (filters && Object.keys(filters).length > 0) {
    builder.whereOptional(filters, options?.prefix || '');
  }

  // 添加排序
  if (options?.orderBy) {
    builder.orderBy(options.orderBy, options.sortOrder || 'DESC');
  }

  // 添加分页
  if (options?.limit !== undefined) {
    builder.paginate(options.limit, options.offset || 0);
  }

  // 设置选择的列
  if (options?.select) {
    builder.select(options.select);
  }

  // 使用优化后的 execute 方法
  return builder.execute<T>(db, options?.useCache);
}

/**
 * 批量插入数据
 * @param db - 数据库实例
 * @param tableName - 表名
 * @param rows - 要插入的数据行数组
 * @returns 批量操作结果
 * @example
 * const result = batchInsert(db, 'agents', [
 *   { id: 1, name: 'agent1', status: 'active' },
 *   { id: 2, name: 'agent2', status: 'inactive' }
 * ]);
 */
export function batchInsert<T extends Record<string, unknown> = Record<string, unknown>>(
  db: { prepare: (sql: string) => { run: (...params: unknown[]) => { changes: number } } },
  tableName: string,
  rows: T[]
): BatchResult {
  if (rows.length === 0) {
    return { successCount: 0, failureCount: 0, failedIndices: [], errors: [] };
  }

  const result: BatchResult = {
    successCount: 0,
    failureCount: 0,
    failedIndices: [],
    errors: [],
  };

  // 获取列名 (从第一行)
  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

  try {
    const stmt = db.prepare(sql) as { run: (...params: unknown[]) => { changes: number } };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const values = columns.map(col => row[col]);

      try {
        stmt.run(...values);
        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.failedIndices.push(i);
        result.errors.push(error as Error);
      }
    }
  } catch (error) {
    // 如果 prepare 失败,所有行都失败
    result.failureCount = rows.length;
    result.failedIndices = Array.from({ length: rows.length }, (_, i) => i);
    result.errors = Array.from({ length: rows.length }, () => error as Error);
  }

  return result;
}

/**
 * 批量更新数据
 * @param db - 数据库实例
 * @param tableName - 表名
 * @param updates - 要更新的数据行数组,每行必须包含用于匹配的条件字段
 * @param conditionColumns - 用于匹配的列名数组
 * @returns 批量操作结果
 * @example
 * const result = batchUpdate(db, 'agents', [
 *   { id: 1, status: 'active' },
 *   { id: 2, status: 'inactive' }
 * ], ['id']);
 */
export function batchUpdate<T extends Record<string, unknown> = Record<string, unknown>>(
  db: { prepare: (sql: string) => { run: (...params: unknown[]) => { changes: number } } },
  tableName: string,
  updates: T[],
  conditionColumns: string[]
): BatchResult {
  if (updates.length === 0) {
    return { successCount: 0, failureCount: 0, failedIndices: [], errors: [] };
  }

  const result: BatchResult = {
    successCount: 0,
    failureCount: 0,
    failedIndices: [],
    errors: [],
  };

  // 获取要更新的列 (排除条件列)
  const allColumns = Object.keys(updates[0]);
  const updateColumns = allColumns.filter(col => !conditionColumns.includes(col));

  if (updateColumns.length === 0) {
    return result;
  }

  // 构建 SET 子句
  const setClause = updateColumns.map(col => `${col} = ?`).join(', ');
  // 构建 WHERE 子句
  const whereClause = conditionColumns.map(col => `${col} = ?`).join(' AND ');
  const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;

  try {
    const stmt = db.prepare(sql) as { run: (...params: unknown[]) => { changes: number } };

    for (let i = 0; i < updates.length; i++) {
      const row = updates[i];
      const updateValues = updateColumns.map(col => row[col]);
      const conditionValues = conditionColumns.map(col => row[col]);
      const values = [...updateValues, ...conditionValues];

      try {
        stmt.run(...values);
        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.failedIndices.push(i);
        result.errors.push(error as Error);
      }
    }
  } catch (error) {
    // 如果 prepare 失败,所有行都失败
    result.failureCount = updates.length;
    result.failedIndices = Array.from({ length: updates.length }, (_, i) => i);
    result.errors = Array.from({ length: updates.length }, () => error as Error);
  }

  return result;
}

/**
 * 批量删除数据
 * @param db - 数据库实例
 * @param tableName - 表名
 * @param conditions - 删除条件数组
 * @param conditionColumns - 用于匹配的列名数组
 * @returns 批量操作结果
 * @example
 * const result = batchDelete(db, 'agents', [
 *   { id: 1 },
 *   { id: 2 }
 * ], ['id']);
 */
export function batchDelete<T extends Record<string, unknown> = Record<string, unknown>>(
  db: { prepare: (sql: string) => { run: (...params: unknown[]) => { changes: number } } },
  tableName: string,
  conditions: T[],
  conditionColumns: string[]
): BatchResult {
  if (conditions.length === 0) {
    return { successCount: 0, failureCount: 0, failedIndices: [], errors: [] };
  }

  const result: BatchResult = {
    successCount: 0,
    failureCount: 0,
    failedIndices: [],
    errors: [],
  };

  // 构建 WHERE 子句
  const whereClause = conditionColumns.map(col => `${col} = ?`).join(' AND ');
  const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;

  try {
    const stmt = db.prepare(sql) as { run: (...params: unknown[]) => { changes: number } };

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const values = conditionColumns.map(col => condition[col]);

      try {
        stmt.run(...values);
        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.failedIndices.push(i);
        result.errors.push(error as Error);
      }
    }
  } catch (error) {
    // 如果 prepare 失败,所有行都失败
    result.failureCount = conditions.length;
    result.failedIndices = Array.from({ length: conditions.length }, (_, i) => i);
    result.errors = Array.from({ length: conditions.length }, () => error as Error);
  }

  return result;
}
