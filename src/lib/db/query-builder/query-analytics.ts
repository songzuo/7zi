/**
 * Query Analytics - 查询分析和优化建议
 *
 * 提供索引建议和查询优化功能
 */

import { QueryBuilder } from './query-builder';

/**
 * 扩展 QueryBuilder 类以添加分析方法
 */
declare module './query-builder' {
  interface QueryBuilder {
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
    }>;

    /**
     * 获取推荐的索引提示 (用于当前查询)
     * @returns 索引提示字符串或 null
     */
    getRecommendedIndexHint(): string | null;
  }
}

/**
 * 为 QueryBuilder 添加索引建议方法
 */
QueryBuilder.prototype.suggestIndexes = function(): Array<{
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

  const config = this._getConfig();
  const { from, conditions, joins, sort, groupBy } = config;

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
};

/**
 * 为 QueryBuilder 添加索引提示推荐方法
 */
QueryBuilder.prototype.getRecommendedIndexHint = function(): string | null {
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
};

/**
 * 扩展 QueryBuilder 类以添加索引提示方法
 */
declare module './query-builder' {
  interface QueryBuilder {
    /**
     * 添加索引提示 (优化器提示)
     * @param hint - 索引提示,如 "USE INDEX (idx_status)" 或 "FORCE INDEX (idx_status_type)"
     * @returns this - 链式调用支持
     * @example
     * builder.withIndexHint('USE INDEX (idx_status)');
     * builder.withIndexHint('FORCE INDEX (idx_status_type)');
     */
    withIndexHint(hint: string): this;

    /**
     * 移除索引提示
     * @returns this - 链式调用支持
     */
    removeIndexHint(): this;
  }
}

/**
 * 为 QueryBuilder 添加索引提示方法
 */
QueryBuilder.prototype.withIndexHint = function(hint: string): QueryBuilder {
  this._setIndexHint(hint);
  return this;
};

QueryBuilder.prototype.removeIndexHint = function(): QueryBuilder {
  this._setIndexHint(null);
  return this;
};

/**
 * 扩展 QueryBuilder 类以添加缓存统计方法
 * 注意：getCacheStats 和 clearGlobalCache 方法已经在 query-builder.ts 中实现为静态方法
 * 这里不需要重复声明，只需确保类型正确
 */

// 这些方法已经在 query-builder.ts 中定义并导出
// 通过 module augmentation，TypeScript 会自动识别这些类型
