/**
 * Database Query Builder Utility
 *
 * 提供通用的数据库查询构建器,减少重复代码
 * 优化点:
 * 1. 统一查询条件构建逻辑
 * 2. 自动处理分页
 * 3. 类型安全的参数绑定
 * 4. 复用 SQL 构建模式
 * 5. 支持 JOIN 查询和子查询
 * 6. 智能索引建议
 * 7. 查询结果缓存机制
 * 8. 批量操作支持
 * 9. 索引提示优化
 * 10. 预编译语句缓存
 */

/**
 * 查询条件配置
 */
export interface QueryCondition {
  /** SQL 条件表达式 (如 "status = ?") */
  condition: string;
  /** 条件参数值 */
  value: unknown;
}

/**
 * JOIN 配置
 */
export interface JoinConfig {
  /** JOIN 类型: INNER, LEFT, RIGHT, FULL */
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  /** 要连接的表名或子查询 */
  table: string;
  /** 连接条件 (如 "agents.id = tasks.agent_id") */
  on: string;
  /** 可选的表别名 */
  alias?: string;
}

/**
 * 子查询配置
 */
export interface SubqueryConfig {
  /** 子查询别名 */
  alias: string;
  /** 子查询的构建器或 SQL */
  query: QueryBuilder | string;
  /** 子查询参数 (仅当 query 为字符串时使用) */
  params?: unknown[];
}

/**
 * 分页选项
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * 排序选项
 */
export interface SortOptions {
  orderBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * 查询构建器配置
 */
export interface QueryBuilderConfig {
  /** 基础表名或子查询 */
  from: string;
  /** 查询条件列表 (按添加顺序) */
  conditions?: QueryCondition[];
  /** 分页选项 */
  pagination?: PaginationOptions;
  /** 排序选项 */
  sort?: SortOptions;
  /** 要选择的列 (默认: *) */
  select?: string[];
  /** JOIN 查询配置 */
  joins?: JoinConfig[];
  /** 子查询配置 */
  subqueries?: SubqueryConfig[];
  /** GROUP BY 子句 */
  groupBy?: string[];
  /** HAVING 条件 */
  having?: QueryCondition[];
  /** 是否使用 DISTINCT */
  distinct?: boolean;
}

/**
 * 构建后的查询和参数
 */
export interface BuiltQuery {
  sql: string;
  params: unknown[];
}

/**
 * 批量操作结果
 */
export interface BatchResult {
  /** 成功的行数 */
  successCount: number;
  /** 失败的行数 */
  failureCount: number;
  /** 失败的行索引 */
  failedIndices: number[];
  /** 错误信息 */
  errors: Error[];
}

/**
 * 查询缓存配置
 */
export interface QueryCacheConfig {
  /** 缓存 TTL (毫秒) */
  ttl?: number;
  /** 最大缓存条目数 */
  maxSize?: number;
  /** 是否启用缓存 (默认: false) */
  enabled?: boolean;
}

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
class PreparedStatementCache {
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
}

/**
 * 查询构建器类
 *
 * @example
 * const builder = new QueryBuilder({ from: 'agents' });
 * builder.where('status = ?', 'active');
 * builder.orderBy('created_at', 'DESC');
 * builder.paginate(10, 0);
 * const { sql, params } = builder.build();
 */
export class QueryBuilder {
  private config: QueryBuilderConfig;
  private _cachedQuery: BuiltQuery | null = null;
  private _cacheInvalidated = true;
  private _indexHint: string | null = null;
  private _cacheConfig: QueryCacheConfig = { enabled: false, ttl: 60000, maxSize: 50 };
  private static _globalCache = new Map<string, { data: unknown; timestamp: number; hits: number }>();
  private static _cacheHits = 0;
  private static _cacheMisses = 0;

  constructor(config: QueryBuilderConfig) {
    this.config = {
      conditions: [],
      select: ['*'],
      ...config,
    };
  }

  /**
   * 设置查询缓存配置
   * @param config - 缓存配置
   * @returns this - 链式调用支持
   * @example
   * builder.setCacheConfig({ enabled: true, ttl: 30000 }); // 30秒缓存
   */
  setCacheConfig(config: QueryCacheConfig): this {
    this._cacheConfig = { ...this._cacheConfig, ...config };
    return this;
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计
   */
  static getCacheStats() {
    return {
      size: QueryBuilder._globalCache.size,
      hits: QueryBuilder._cacheHits,
      misses: QueryBuilder._cacheMisses,
      hitRate: QueryBuilder._globalCache.size > 0
        ? QueryBuilder._cacheHits / (QueryBuilder._cacheHits + QueryBuilder._cacheMisses)
        : 0,
    };
  }

  /**
   * 清空全局查询缓存
   */
  static clearGlobalCache() {
    QueryBuilder._globalCache.clear();
    QueryBuilder._cacheHits = 0;
    QueryBuilder._cacheMisses = 0;
  }

  /**
   * 添加索引提示 (优化器提示)
   * @param hint - 索引提示,如 "USE INDEX (idx_status)" 或 "FORCE INDEX (idx_status_type)"
   * @returns this - 链式调用支持
   * @example
   * builder.withIndexHint('USE INDEX (idx_status)');
   * builder.withIndexHint('FORCE INDEX (idx_status_type)');
   */
  withIndexHint(hint: string): this {
    this._indexHint = hint;
    this._invalidateCache();
    return this;
  }

  /**
   * 移除索引提示
   * @returns this - 链式调用支持
   */
  removeIndexHint(): this {
    this._indexHint = null;
    this._invalidateCache();
    return this;
  }

  /**
   * 标记缓存失效
   */
  private _invalidateCache(): void {
    this._cacheInvalidated = true;
    this._cachedQuery = null;
  }

  /**
   * 生成缓存键
   * @returns 缓存键字符串
   */
  private _getCacheKey(): string {
    const config = this.config;
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
      indexHint: this._indexHint,
    });
    return key;
  }

  /**
   * 添加 WHERE 条件
   * @param condition - SQL 条件表达式 (使用 ? 作为参数占位符)
   * @param value - 条件参数值
   * @returns this - 链式调用支持
   * @example
   * builder.where('status = ?', 'active');
   */
  where(condition: string, value: unknown): this {
    this.config.conditions!.push({ condition, value });
    this._invalidateCache();
    return this;
  }

  /**
   * 添加多个 WHERE 条件 (AND 连接)
   * @param conditions - 条件数组
   * @returns this - 链式调用支持
   * @example
   * builder.whereMany([
   *   { condition: 'status = ?', value: 'active' },
   *   { condition: 'type = ?', value: 'worker' }
   * ]);
   */
  whereMany(conditions: QueryCondition[]): this {
    conditions.forEach(({ condition, value }) => this.where(condition, value));
    return this;
  }

  /**
   * 条件性添加 WHERE 条件 (仅当 value 非空时)
   * @param condition - SQL 条件表达式
   * @param value - 条件参数值 (如果为 undefined/null/falsy 则不添加)
   * @returns this - 链式调用支持
   * @example
   * builder.whereIf('type = ?', type); // 仅当 type 存在时添加
   */
  whereIf(condition: string, value: unknown): this {
    if (value !== undefined && value !== null && value !== '') {
      this.where(condition, value);
    }
    return this;
  }

  /**
   * 添加可选的 WHERE 条件 (映射对象属性到条件)
   * @param filters - 过滤器对象,键为字段名,值为条件值
   * @param prefix - 可选的字段前缀 (如 "agents." -> "agents.status")
   * @returns this - 链式调用支持
   * @example
   * builder.whereOptional(
   *   { status: 'active', type: 'worker' },
   *   'agents.'
   * ); // 生成 "agents.status = ? AND agents.type = ?"
   */
  whereOptional(filters: Record<string, unknown>, prefix: string = ''): this {
    Object.entries(filters).forEach(([field, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        this.where(`${prefix}${field} = ?`, value);
      }
    });
    return this;
  }

  /**
   * 设置排序
   * @param column - 排序列名
   * @param order - 排序方向 (默认: 'ASC')
   * @returns this - 链式调用支持
   * @example
   * builder.orderBy('created_at', 'DESC');
   */
  orderBy(column: string, order: 'ASC' | 'DESC' = 'ASC'): this {
    this.config.sort = { orderBy: column, sortOrder: order };
    this._invalidateCache();
    return this;
  }

  /**
   * 设置分页
   * @param limit - 每页数量
   * @param offset - 偏移量 (默认: 0)
   * @returns this - 链式调用支持
   * @example
   * builder.paginate(10, 0); // 第1页
   * builder.paginate(10, 10); // 第2页
   */
  paginate(limit: number, offset: number = 0): this {
    this.config.pagination = { limit, offset };
    this._invalidateCache();
    return this;
  }

  /**
   * 设置要选择的列
   * @param columns - 列名数组
   * @returns this - 链式调用支持
   * @example
   * builder.select(['id', 'name', 'status']);
   */
  select(columns: string[]): this {
    this.config.select = columns;
    this._invalidateCache();
    return this;
  }

  /**
   * 添加 JOIN 查询
   * @param type - JOIN 类型 (INNER, LEFT, RIGHT, FULL)
   * @param table - 要连接的表名或子查询
   * @param on - 连接条件 (如 "agents.id = tasks.agent_id")
   * @param alias - 可选的表别名
   * @returns this - 链式调用支持
   * @example
   * builder.join('LEFT', 'wallets', 'agents.id = wallets.agent_id', 'w');
   * builder.join('INNER', 'tasks', 'agents.id = tasks.agent_id', 't');
   */
  join(type: JoinConfig['type'], table: string, on: string, alias?: string): this {
    if (!this.config.joins) {
      this.config.joins = [];
    }
    this.config.joins.push({ type, table, on, alias });
    this._invalidateCache();
    return this;
  }

  /**
   * 添加 INNER JOIN (快捷方法)
   * @param table - 要连接的表名
   * @param on - 连接条件
   * @param alias - 可选的表别名
   * @returns this - 链式调用支持
   * @example
   * builder.innerJoin('wallets', 'agents.id = wallets.agent_id', 'w');
   */
  innerJoin(table: string, on: string, alias?: string): this {
    return this.join('INNER', table, on, alias);
  }

  /**
   * 添加 LEFT JOIN (快捷方法)
   * @param table - 要连接的表名
   * @param on - 连接条件
   * @param alias - 可选的表别名
   * @returns this - 链式调用支持
   * @example
   * builder.leftJoin('tasks', 'agents.id = tasks.agent_id', 't');
   */
  leftJoin(table: string, on: string, alias?: string): this {
    return this.join('LEFT', table, on, alias);
  }

  /**
   * 添加子查询到 FROM 子句
   * @param alias - 子查询别名
   * @param query - 子查询的构建器或 SQL
   * @param params - 子查询参数 (仅当 query 为字符串时使用)
   * @returns this - 链式调用支持
   * @example
   * builder.subquery('active_agents', buildQuery('agents').where('status = ?', 'active'));
   * builder.subquery('stats', 'SELECT COUNT(*) as total FROM agents');
   */
  subquery(alias: string, query: QueryBuilder | string, params?: unknown[]): this {
    if (!this.config.subqueries) {
      this.config.subqueries = [];
    }
    this.config.subqueries.push({ alias, query, params });
    this._invalidateCache();
    return this;
  }

  /**
   * 添加 GROUP BY 子句
   * @param columns - 要分组的列名数组
   * @returns this - 链式调用支持
   * @example
   * builder.groupBy(['status', 'type']);
   */
  groupBy(columns: string[]): this {
    this.config.groupBy = columns;
    this._invalidateCache();
    return this;
  }

  /**
   * 添加 HAVING 条件 (用于聚合后的过滤)
   * @param condition - SQL 条件表达式
   * @param value - 条件参数值
   * @returns this - 链式调用支持
   * @example
   * builder.having('COUNT(*) > ?', 10);
   */
  having(condition: string, value: unknown): this {
    if (!this.config.having) {
      this.config.having = [];
    }
    this.config.having.push({ condition, value });
    this._invalidateCache();
    return this;
  }

  /**
   * 设置是否使用 DISTINCT
   * @param distinct - 是否使用 DISTINCT (默认: true)
   * @returns this - 链式调用支持
   * @example
   * builder.distinct(true);
   */
  distinct(distinct: boolean = true): this {
    this.config.distinct = distinct;
    this._invalidateCache();
    return this;
  }

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
  ): T[] {
    const cacheEnabled = useCache ?? this._cacheConfig.enabled;
    const { sql, params } = this.build();

    // 如果启用了缓存,尝试从缓存获取
    if (cacheEnabled) {
      const cacheKey = this._getCacheKey();
      const cached = QueryBuilder._globalCache.get(cacheKey);

      if (cached) {
        const now = Date.now();
        const ttl = this._cacheConfig.ttl || 60000;

        // 检查缓存是否过期
        if (now - cached.timestamp < ttl) {
          QueryBuilder._cacheHits++;
          cached.hits++;
          return cached.data as T[];
        } else {
          // 缓存过期,删除
          QueryBuilder._globalCache.delete(cacheKey);
        }
      }
    }

    // 未启用缓存或缓存未命中,执行查询
    QueryBuilder._cacheMisses++;

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

      // 检查缓存大小限制
      const maxSize = this._cacheConfig.maxSize || 50;
      if (QueryBuilder._globalCache.size >= maxSize) {
        // 简单的 LRU: 删除最旧的条目
        let oldestKey: string | null = null;
        let oldestTime = Date.now();

        Array.from(QueryBuilder._globalCache.entries()).forEach(([key, entry]) => {
          if (entry.timestamp < oldestTime) {
            oldestTime = entry.timestamp;
            oldestKey = key;
          }
        });

        if (oldestKey) {
          QueryBuilder._globalCache.delete(oldestKey);
        }
      }

      QueryBuilder._globalCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        hits: 1,
      });
    }

    return result as T[];
  }

  /**
   * 构建最终的 SQL 和参数 (使用缓存)
   * @returns 构建好的查询对象
   * @example
   * const { sql, params } = builder.build();
   * const stmt = db.prepare(sql);
   * const rows = stmt.all(...params);
   */
  build(): BuiltQuery {
    // 如果缓存有效,直接返回缓存的结果
    if (!this._cacheInvalidated && this._cachedQuery) {
      return { ...this._cachedQuery, params: [...this._cachedQuery.params] };
    }

    const { from, conditions, pagination, sort, select, joins, subqueries, groupBy, having, distinct } = this.config;

    // 处理子查询，构建 FROM 子句
    let fromClause = from;
    if (subqueries && subqueries.length > 0) {
      const subqueryParts: string[] = [];
      for (const subquery of subqueries) {
        if (subquery.query instanceof QueryBuilder) {
          const { sql: subSql, params: subParams } = subquery.query.build();
          subqueryParts.push(`(${subSql}) AS ${subquery.alias}`);
        } else {
          subqueryParts.push(`(${subquery.query}) AS ${subquery.alias}`);
        }
      }
      // 如果有多个子查询，组合成 CTE
      if (subqueryParts.length === 1) {
        fromClause = subqueryParts[0];
      } else {
        fromClause = subqueryParts.join(', ');
      }
    }

    // 构建 SELECT 子句
    const distinctClause = distinct ? 'DISTINCT ' : '';
    const selectClause = select ? select.join(', ') : '*';

    // 构建 JOIN 子句
    let joinClause = '';
    if (joins && joins.length > 0) {
      joinClause = joins
        .map(join => {
          const alias = join.alias ? ` AS ${join.alias}` : '';
          return `${join.type} JOIN ${join.table}${alias} ON ${join.on}`;
        })
        .join(' ');
    }

    // 构建 WHERE 子句
    let whereClause = '';
    const params: unknown[] = [];
    if (conditions && conditions.length > 0) {
      const conditionStr = conditions.map(c => c.condition).join(' AND ');
      whereClause = `WHERE ${conditionStr}`;
      params.push(...conditions.map(c => c.value));
    }

    // 添加子查询参数
    if (subqueries) {
      for (const subquery of subqueries) {
        if (typeof subquery.query === 'string' && subquery.params) {
          params.push(...subquery.params);
        } else if (subquery.query instanceof QueryBuilder) {
          const subParams = subquery.query.build().params;
          params.push(...subParams);
        }
      }
    }

    // 构建 GROUP BY 子句
    let groupByClause = '';
    if (groupBy && groupBy.length > 0) {
      groupByClause = `GROUP BY ${groupBy.join(', ')}`;
    }

    // 构建 HAVING 子句
    let havingClause = '';
    if (having && having.length > 0) {
      const havingStr = having.map(h => h.condition).join(' AND ');
      havingClause = `HAVING ${havingStr}`;
      params.push(...having.map(h => h.value));
    }

    // 构建 ORDER BY 子句
    let orderClause = '';
    if (sort && sort.orderBy) {
      orderClause = `ORDER BY ${sort.orderBy} ${sort.sortOrder || 'ASC'}`;
    }

    // 构建 LIMIT 和 OFFSET 子句
    let limitClause = '';
    if (pagination && pagination.limit) {
      limitClause = `LIMIT ?`;
      params.push(pagination.limit);
      if (pagination.offset) {
        limitClause += ` OFFSET ?`;
        params.push(pagination.offset);
      }
    }

    // 添加索引提示 (如果存在)
    let indexHintClause = '';
    if (this._indexHint) {
      indexHintClause = ` ${this._indexHint}`;
    }

    // 组合完整的 SQL
    const sql = `SELECT ${distinctClause}${selectClause} FROM ${fromClause}${indexHintClause} ${joinClause} ${whereClause} ${groupByClause} ${havingClause} ${orderClause} ${limitClause}`.trim();

    // 缓存构建结果
    this._cachedQuery = { sql, params: [...params] };
    this._cacheInvalidated = false;

    return { sql, params };
  }

  /**
   * 重置构建器到初始状态 (保留 from 和 select)
   * @returns this - 链式调用支持
   * @example
   * builder.where('status = ?', 'active');
   * builder.build();
   * builder.reset(); // 清空条件和分页,保留表和列
   * builder.where('status = ?', 'inactive');
   */
  reset(): this {
    const { from, select } = this.config;
    this.config = {
      from,
      conditions: [],
      select,
    };
    this._invalidateCache();
    this._indexHint = null;
    return this;
  }

  /**
   * 获取当前配置 (用于调试)
   * @returns 当前配置对象的浅拷贝
   */
  getConfig(): QueryBuilderConfig {
    return { ...this.config, conditions: [...(this.config.conditions || [])] };
  }

  /**
   * 生成索引建议 - 基于当前查询分析推荐的索引 (优化版)
   * @returns 索引建议数组
   * @example
   * const suggestions = builder.suggestIndexes();
   * // 返回: [{ table: 'agents', columns: ['status', 'type'], type: 'composite', reason: '...', createSql: '...' }]
   */
  suggestIndexes(): Array<{
    table: string;
    columns: string[];
    type: 'index' | 'composite';
    reason: string;
    createSql: string;
    priority: number;
  }> {
    const suggestions: Array<{
      table: string;
      columns: string[];
      type: 'index' | 'composite';
      reason: string;
      createSql: string;
      priority: number;
    }> = [];

    const { from, conditions, joins, sort, groupBy } = this.config;

    // 辅助函数: 解析列名
    const parseColumnName = (condition: string): { table: string; column: string } | null => {
      const match = condition.match(/(\w+(?:\.\w+)?)\s*[=<>!]/);
      if (match) {
        const fullColumn = match[1];
        if (fullColumn.includes('.')) {
          const [table, column] = fullColumn.split('.');
          return { table, column };
        } else {
          return { table: from, column: fullColumn };
        }
      }
      return null;
    };

    // 1. 分析 WHERE 条件中的列 (高优先级)
    if (conditions && conditions.length > 0) {
      const whereColumns = new Map<string, { columns: string[]; conditions: string[] }>();

      for (const cond of conditions) {
        const parsed = parseColumnName(cond.condition);
        if (parsed) {
          const key = parsed.table;
          if (!whereColumns.has(key)) {
            whereColumns.set(key, { columns: [], conditions: [] });
          }
          const entry = whereColumns.get(key)!;
          if (!entry.columns.includes(parsed.column)) {
            entry.columns.push(parsed.column);
          }
          entry.conditions.push(cond.condition);
        }
      }

      Array.from(whereColumns.entries()).forEach(([table, { columns }]) => {
        if (columns.length === 1) {
          suggestions.push({
            table,
            columns,
            type: 'index',
            reason: `WHERE clause frequently filters on ${columns[0]}`,
            createSql: `CREATE INDEX idx_${table}_${columns[0]} ON ${table} (${columns[0]});`,
            priority: 90,
          });
        } else if (columns.length > 1) {
          suggestions.push({
            table,
            columns,
            type: 'composite',
            reason: `WHERE clause frequently filters on ${columns.join(', ')}`,
            createSql: `CREATE INDEX idx_${table}_${columns.join('_')} ON ${table} (${columns.join(', ')});`,
            priority: 85,
          });
        }
      });
    }

    // 2. 分析 JOIN 条件中的列 (高优先级)
    if (joins && joins.length > 0) {
      for (const join of joins) {
        const joinColumns: string[] = [];
        const table = join.alias || join.table.split('(')[0].trim();

        // 解析 JOIN ON 条件中的列
        const matchRegex = /(\w+)\.(\w+)/g;
        let match: RegExpExecArray | null;
        while ((match = matchRegex.exec(join.on)) !== null) {
          const [, tableName, columnName] = match;
          if (tableName === table) {
            if (!joinColumns.includes(columnName)) {
              joinColumns.push(columnName);
            }
          }
        }

        if (joinColumns.length > 0) {
          suggestions.push({
            table,
            columns: joinColumns,
            type: 'composite',
            reason: `JOIN condition: ${join.on}`,
            createSql: `CREATE INDEX idx_${table}_join_${joinColumns.join('_')} ON ${table} (${joinColumns.join(', ')});`,
            priority: 95,
          });
        }
      }
    }

    // 3. 分析 GROUP BY 中的列 (中优先级)
    if (groupBy && groupBy.length > 0) {
      const columns = groupBy.filter(col => !col.includes('.')).map(col => col.trim());
      if (columns.length > 0) {
        suggestions.push({
          table: from,
          columns,
          type: 'composite',
          reason: `GROUP BY on ${columns.join(', ')}`,
          createSql: `CREATE INDEX idx_${from}_group_${columns.join('_')} ON ${from} (${columns.join(', ')});`,
          priority: 70,
        });
      }
    }

    // 4. 分析 ORDER BY 中的列 (中优先级)
    if (sort && sort.orderBy) {
      const parsed = parseColumnName(sort.orderBy);
      if (parsed) {
        const colName = parsed.column;
        const table = parsed.table;

        suggestions.push({
          table,
          columns: [colName],
          type: 'index',
          reason: `ORDER BY uses column ${colName}`,
          createSql: `CREATE INDEX idx_${table}_${colName}_order ON ${table} (${colName} ${sort.sortOrder || 'ASC'});`,
          priority: 75,
        });
      }
    }

    // 按优先级排序
    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 获取推荐的索引提示 (用于当前查询)
   * @returns 索引提示字符串或 null
   */
  getRecommendedIndexHint(): string | null {
    const suggestions = this.suggestIndexes();
    if (suggestions.length === 0) {
      return null;
    }

    // 使用最高优先级的索引建议
    const topSuggestion = suggestions[0];

    if (topSuggestion.columns.length === 1) {
      return `USE INDEX (idx_${topSuggestion.table}_${topSuggestion.columns[0]})`;
    } else {
      return `USE INDEX (idx_${topSuggestion.table}_${topSuggestion.columns.join('_')})`;
    }
  }
}

/**
 * 快捷函数: 创建查询构建器
 * @param from - 表名或子查询
 * @returns 新的 QueryBuilder 实例
 * @example
 * const { sql, params } = buildQuery('agents')
 *   .where('status = ?', 'active')
 *   .orderBy('created_at', 'DESC')
 *   .paginate(10, 0)
 *   .build();
 */
export function buildQuery(from: string): QueryBuilder {
  return new QueryBuilder({ from });
}

/**
 * 快捷函数: 为指定表创建带可选过滤器的查询
 * @param tableName - 表名
 * @param filters - 可选过滤器对象
 * @param options - 查询选项
 * @returns 构建好的查询对象
 * @example
 * const { sql, params } = buildWhereQuery('agents', {
 *   status: 'active',
 *   type: 'worker'
 * }, {
 *   limit: 10,
 *   orderBy: 'created_at',
 *   sortOrder: 'DESC'
 * });
 */
export function buildWhereQuery(
  tableName: string,
  filters: Record<string, unknown>,
  options?: {
    prefix?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    select?: string[];
  }
): BuiltQuery {
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

  return builder.build();
}

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
      } catch (_error) {
        result.failureCount++;
        result.failedIndices.push(i);
        result.errors.push(error as Error);
      }
    }
  } catch (_error) {
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
      } catch (_error) {
        result.failureCount++;
        result.failedIndices.push(i);
        result.errors.push(error as Error);
      }
    }
  } catch (_error) {
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
      } catch (_error) {
        result.failureCount++;
        result.failedIndices.push(i);
        result.errors.push(error as Error);
      }
    }
  } catch (_error) {
    // 如果 prepare 失败,所有行都失败
    result.failureCount = conditions.length;
    result.failedIndices = Array.from({ length: conditions.length }, (_, i) => i);
    result.errors = Array.from({ length: conditions.length }, () => error as Error);
  }

  return result;
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

/**
 * 获取缓存统计信息 (查询缓存 + 预编译语句缓存)
 * @returns 缓存统计
 */
export function getCacheStats() {
  const cacheInstance = PreparedStatementCache.getInstance();
  // Cast through unknown to access private property safely
  const cacheSize = (cacheInstance as unknown as { cache?: Map<string, unknown> }).cache?.size ?? 0;

  return {
    queryCache: QueryBuilder.getCacheStats(),
    preparedStatementCache: {
      size: cacheSize,
    },
  };
}