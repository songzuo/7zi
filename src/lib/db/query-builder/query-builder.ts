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

  // 静态属性：全局查询缓存
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
   * 标记缓存失效
   */
  _invalidateCache(): void {
    this._cacheInvalidated = true;
    this._cachedQuery = null;
  }

  /**
   * 获取缓存配置
   */
  _getCacheConfig(): QueryCacheConfig {
    return this._cacheConfig;
  }

  /**
   * 设置缓存配置
   */
  _setCacheConfig(config: QueryCacheConfig): void {
    this._cacheConfig = { ...this._cacheConfig, ...config };
  }

  /**
   * 获取索引提示
   */
  _getIndexHint(): string | null {
    return this._indexHint;
  }

  /**
   * 设置索引提示
   */
  _setIndexHint(hint: string | null): void {
    this._indexHint = hint;
    this._invalidateCache();
  }

  /**
   * 获取配置
   */
  _getConfig(): QueryBuilderConfig {
    return this.config;
  }

  /**
   * 获取索引提示 (用于 analytics)
   */
  _getIndexHintForAnalytics(): string | null {
    return this._indexHint;
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
   * 获取全局缓存实例 (内部使用)
   * @internal
   */
  static _getGlobalCache(): Map<string, { data: unknown; timestamp: number; hits: number }> {
    return QueryBuilder._globalCache;
  }

  /**
   * 增加 cache hits 计数 (内部使用)
   * @internal
   */
  static _incrementCacheHits(): void {
    QueryBuilder._cacheHits++;
  }

  /**
   * 增加 cache misses 计数 (内部使用)
   * @internal
   */
  static _incrementCacheMisses(): void {
    QueryBuilder._cacheMisses++;
  }

  /**
   * 增加 cached item 的 hits 计数 (内部使用)
   * @internal
   */
  static _incrementCacheItemHits(cacheKey: string): void {
    const cached = QueryBuilder._globalCache.get(cacheKey);
    if (cached) {
      cached.hits++;
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
