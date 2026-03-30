/**
 * Database Tracker
 * 数据库慢查询追踪器
 */

import { SlowQuery } from './types';

export interface QueryIssue {
  type: 'missing-index' | 'full-scan' | 'large-result' | 'n-plus-1' | 'slow-join' | 'inefficient-where';
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
  query: string;
}

export interface DatabaseTrackerConfig {
  enabled: boolean;
  threshold: number; // ms
  maxHistorySize: number;
  sanitizePatterns: RegExp[];
  trackRowCounts: boolean;
}

export const DEFAULT_DATABASE_TRACKER_CONFIG: DatabaseTrackerConfig = {
  enabled: true,
  threshold: 1000, // 1 秒
  maxHistorySize: 1000,
  sanitizePatterns: [
    /'[^']*'/g, // 替换字符串值
    /\b\d+\b/g, // 替换数字
  ],
  trackRowCounts: true,
};

/**
 * DatabaseTracker - 数据库查询追踪器
 * 追踪慢查询、分析查询模式、识别常见问题
 */
export class DatabaseTracker {
  private config: DatabaseTrackerConfig;
  private slowQueries: SlowQuery[] = [];
  private queryStats: Map<string, QueryStats> = new Map();

  constructor(config: Partial<DatabaseTrackerConfig> = {}) {
    this.config = { ...DEFAULT_DATABASE_TRACKER_CONFIG, ...config };
  }

  /**
   * Track a database query
   * 追踪数据库查询
   */
  trackQuery(
    query: string,
    duration: number,
    rowCount?: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enabled) return;

    // 检查是否慢查询
    if (duration > this.config.threshold) {
      this.trackSlowQuery(query, duration, rowCount, metadata);
    }

    // 更新查询统计
    this.updateQueryStats(query, duration, rowCount);
  }

  /**
   * Track a slow query
   * 追踪慢查询
   */
  private trackSlowQuery(
    query: string,
    duration: number,
    rowCount?: number,
    metadata?: Record<string, any>
  ): void {
    const sanitizedQuery = this.sanitizeQuery(query);
    const queryType = this.extractQueryType(query);
    const table = this.extractTableName(query);

    const slowQuery: SlowQuery = {
      query: sanitizedQuery,
      duration,
      rowCount: rowCount || 0,
      timestamp: Date.now(),
      type: queryType,
    };

    // 添加到历史记录
    this.slowQueries.push(slowQuery);

    // 限制历史记录大小
    if (this.slowQueries.length > this.config.maxHistorySize) {
      this.slowQueries.shift();
    }

    // 发送告警（如果配置了告警回调）
    if (metadata?.onAlert && typeof metadata.onAlert === 'function') {
      const issue = this.identifyQueryIssue(slowQuery);
      if (issue) {
        metadata.onAlert(issue);
      }
    }
  }

  /**
   * Update query statistics
   * 更新查询统计
   */
  private updateQueryStats(query: string, duration: number, rowCount?: number): void {
    const normalizedQuery = this.normalizeQuery(query);
    const existing = this.queryStats.get(normalizedQuery) || {
      count: 0,
      totalDuration: 0,
      maxDuration: 0,
      totalRows: 0,
      avgDuration: 0,
    };

    existing.count++;
    existing.totalDuration += duration;
    existing.maxDuration = Math.max(existing.maxDuration, duration);
    if (rowCount) {
      existing.totalRows += rowCount;
    }
    existing.avgDuration = existing.totalDuration / existing.count;

    this.queryStats.set(normalizedQuery, existing);
  }

  /**
   * Sanitize query by removing sensitive data
   * 清理查询中的敏感数据
   */
  private sanitizeQuery(query: string): string {
    let sanitized = query;
    for (const pattern of this.config.sanitizePatterns) {
      sanitized = sanitized.replace(pattern, '?');
    }
    return sanitized;
  }

  /**
   * Normalize query for grouping
   * 标准化查询用于分组
   */
  private normalizeQuery(query: string): string {
    return this.sanitizeQuery(query)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract query type (SELECT, INSERT, UPDATE, DELETE)
   * 提取查询类型
   */
  private extractQueryType(query: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' {
    const normalized = query.trim().toUpperCase();
    if (normalized.startsWith('SELECT')) return 'SELECT';
    if (normalized.startsWith('INSERT')) return 'INSERT';
    if (normalized.startsWith('UPDATE')) return 'UPDATE';
    if (normalized.startsWith('DELETE')) return 'DELETE';
    return 'SELECT'; // 默认
  }

  /**
   * Extract table name from query
   * 从查询中提取表名
   */
  private extractTableName(query: string): string | undefined {
    const normalized = query.toLowerCase();
    
    // SELECT ... FROM table
    const fromMatch = normalized.match(/from\s+([a-z_][a-z0-9_]*)/i);
    if (fromMatch) return fromMatch[1];
    
    // INSERT INTO table
    const insertMatch = normalized.match(/insert\s+into\s+([a-z_][a-z0-9_]*)/i);
    if (insertMatch) return insertMatch[1];
    
    // UPDATE table
    const updateMatch = normalized.match(/update\s+([a-z_][a-z0-9_]*)/i);
    if (updateMatch) return updateMatch[1];
    
    // DELETE FROM table
    const deleteMatch = normalized.match(/delete\s+from\s+([a-z_][a-z0-9_]*)/i);
    if (deleteMatch) return deleteMatch[1];

    return undefined;
  }

  /**
   * Identify query issue
   * 识别查询问题
   */
  identifyQueryIssue(query: SlowQuery): QueryIssue | null {
    const issues = this.identifyQueryIssues([query]);
    return issues.length > 0 ? issues[0] : null;
  }

  /**
   * Identify issues in multiple queries
   * 识别多个查询的问题
   */
  identifyQueryIssues(queries: SlowQuery[]): QueryIssue[] {
    const issues: QueryIssue[] = [];

    for (const query of queries) {
      const issue = this.detectIssue(query);
      if (issue) {
        issues.push(issue);
      }
    }

    // 如果没有检测到问题但查询很慢，返回通用问题
    if (issues.length === 0 && queries.length > 0) {
      const slowest = queries.reduce((a, b) => (a.duration > b.duration ? a : b));
      if (slowest.duration > 1000) {
        // Determine severity based on how slow the query is
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        if (slowest.duration > 3000) {
          severity = 'high';
        } else if (slowest.duration > 5000) {
          severity = 'critical';
        }
        
        issues.push({
          type: 'slow-join',
          severity,
          suggestion: `Slow query detected (${slowest.duration}ms). Review execution plan and consider indexing`,
          query: slowest.query,
        });
      }
    }

    return issues;
  }

  /**
   * Detect issue in a single query
   * 检测单个查询的问题
   */
  private detectIssue(query: SlowQuery): QueryIssue | null {
    const queryLower = query.query.toLowerCase();

    // 1. 大结果集检测 (最高优先级 - critical)
    if (query.duration > 5000 && query.rowCount > 10000) {
      return {
        type: 'large-result',
        severity: 'critical',
        suggestion: 'Large result set detected. Implement pagination, add WHERE clauses, or consider batching',
        query: query.query,
      };
    }

    // 2. 全表扫描检测
    if (queryLower.includes('select *') || queryLower.includes('select\t*')) {
      return {
        type: 'full-scan',
        severity: 'high',
        suggestion: 'Avoid SELECT * - specify only required columns to reduce data transfer and improve query performance',
        query: query.query,
      };
    }

    // 3. N+1 问题检测（需要上下文）
    if (queryLower.includes('where') && queryLower.includes('in (select')) {
      return {
        type: 'n-plus-1',
        severity: 'medium',
        suggestion: 'Potential N+1 query pattern. Consider using JOINs or batch loading instead of subqueries',
        query: query.query,
      };
    }

    // 4. 低效 WHERE 条件 (LIKE with leading wildcard)
    if (queryLower.includes('where') && queryLower.includes('like') && queryLower.includes('%')) {
      return {
        type: 'inefficient-where',
        severity: 'medium',
        suggestion: 'Leading wildcard in LIKE clause prevents index usage. Consider full-text search or restructuring query',
        query: query.query,
      };
    }

    // 5. 缺少索引检测（慢 JOIN）
    if (queryLower.includes('join') && query.duration > 2000) {
      return {
        type: 'missing-index',
        severity: 'high',
        suggestion: 'Slow JOIN detected. Ensure join columns are indexed and review execution plan',
        query: query.query,
      };
    }

    // 6. 慢 JOIN 检测
    if (queryLower.includes('join') && query.duration > 3000) {
      return {
        type: 'slow-join',
        severity: 'high',
        suggestion: 'Slow JOIN operation. Review join conditions, add indexes on join columns, and consider denormalization',
        query: query.query,
      };
    }

    return null;
  }

  /**
   * Get slow queries
   * 获取慢查询列表
   */
  getSlowQueries(limit?: number): SlowQuery[] {
    const queries = [...this.slowQueries].sort((a, b) => b.duration - a.duration);
    return limit ? queries.slice(0, limit) : queries;
  }

  /**
   * Get query statistics
   * 获取查询统计
   */
  getQueryStats(): Map<string, QueryStats> {
    return new Map(this.queryStats);
  }

  /**
   * Get slowest queries
   * 获取最慢的查询
   */
  getSlowestQueries(count: number = 10): SlowQuery[] {
    return [...this.slowQueries]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count);
  }

  /**
   * Get queries by type
   * 按类型获取查询
   */
  getQueriesByType(): Record<string, number> {
    const counts: Record<string, number> = { SELECT: 0, INSERT: 0, UPDATE: 0, DELETE: 0 };
    for (const query of this.slowQueries) {
      counts[query.type]++;
    }
    return counts;
  }

  /**
   * Get queries by table
   * 按表获取查询
   */
  getQueriesByTable(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const query of this.slowQueries) {
      const table = this.extractTableName(query.query);
      if (table) {
        counts[table] = (counts[table] || 0) + 1;
      }
    }
    return counts;
  }

  /**
   * Clear history
   * 清空历史记录
   */
  clearHistory(): void {
    this.slowQueries = [];
    this.queryStats.clear();
  }

  /**
   * Update configuration
   * 更新配置
   */
  updateConfig(partialConfig: Partial<DatabaseTrackerConfig>): void {
    this.config = { ...this.config, ...partialConfig };
  }

  /**
   * Export data for analysis
   * 导出数据用于分析
   */
  exportData(): {
    slowQueries: SlowQuery[];
    queryStats: Record<string, QueryStats>;
    config: DatabaseTrackerConfig;
  } {
    const stats: Record<string, QueryStats> = {};
    this.queryStats.forEach((value, key) => {
      stats[key] = value;
    });

    return {
      slowQueries: this.slowQueries,
      queryStats: stats,
      config: this.config,
    };
  }

  /**
   * Analyze database queries and return analysis results
   * 分析数据库查询并返回分析结果
   */
  analyze(): DatabaseAnalysis {
    const slowestQueries = this.getSlowestQueries(10);
    const issues = this.identifyQueryIssues(this.slowQueries);
    const queriesByType = this.getQueriesByType();
    const queriesByTable = this.getQueriesByTable();

    const stats: Record<string, QueryStats> = {};
    this.queryStats.forEach((value, key) => {
      stats[key] = value;
    });

    return {
      slowQueries: this.slowQueries,
      topSlowQueries: slowestQueries,
      issues,
      queryStats: stats,
      queriesByType,
      queriesByTable,
      totalQueries: this.slowQueries.length,
      avgDuration: this.slowQueries.length > 0
        ? this.slowQueries.reduce((sum, q) => sum + q.duration, 0) / this.slowQueries.length
        : 0,
      maxDuration: this.slowQueries.length > 0
        ? Math.max(...this.slowQueries.map(q => q.duration))
        : 0,
    };
  }
}

export interface QueryStats {
  count: number;
  totalDuration: number;
  maxDuration: number;
  totalRows: number;
  avgDuration: number;
}

export interface DatabaseAnalysis {
  slowQueries: SlowQuery[];
  topSlowQueries: SlowQuery[];
  issues: QueryIssue[];
  queryStats: Record<string, QueryStats>;
  queriesByType: Record<string, number>;
  queriesByTable: Record<string, number>;
  totalQueries: number;
  avgDuration: number;
  maxDuration: number;
}

// Export singleton instance
export const databaseTracker = new DatabaseTracker();
