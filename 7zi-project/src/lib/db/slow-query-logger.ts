/**
 * Slow Query Logger and Performance Monitor
 * 慢查询日志和性能监控器
 *
 * Features:
 * - Automatic slow query detection and logging
 * - Query execution time tracking
 * - Query pattern analysis
 * - Performance metrics aggregation
 * - Alert system for degraded performance
 */

import { getDatabaseAsync } from './index';
import { logger } from '../logger';

export interface SlowQueryLog {
  /** SQL query */
  sql: string;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Timestamp */
  timestamp: number;
  /** Number of rows returned/affected */
  rowCount: number;
  /** Whether an index was used */
  indexUsed: boolean;
  /** Table name */
  tableName?: string;
  /** Query type (SELECT, INSERT, UPDATE, DELETE) */
  queryType: string;
  /** Parameters used */
  params?: unknown[];
  /** Stack trace for debugging */
  stackTrace?: string;
}

export interface QueryMetrics {
  /** Total queries */
  totalQueries: number;
  /** Total execution time */
  totalExecutionTime: number;
  /** Average execution time */
  avgExecutionTime: number;
  /** Min execution time */
  minExecutionTime: number;
  /** Max execution time */
  maxExecutionTime: number;
  /** Slow query count (> 100ms) */
  slowQueryCount: number;
  /** Very slow query count (> 1000ms) */
  verySlowQueryCount: number;
  /** Queries by type */
  byType: Record<string, number>;
  /** Queries by table */
  byTable: Record<string, number>;
}

export interface PerformanceAlert {
  /** Alert type */
  type: 'slow_query' | 'degraded_performance' | 'connection_issue';
  /** Alert message */
  message: string;
  /** Alert timestamp */
  timestamp: number;
  /** Alert severity */
  severity: 'info' | 'warning' | 'error' | 'critical';
  /** Alert data */
  data?: unknown;
}

/**
 * Slow Query Logger Class
 */
export class SlowQueryLogger {
  private logs: SlowQueryLog[] = [];
  private metrics: QueryMetrics = {
    totalQueries: 0,
    totalExecutionTime: 0,
    avgExecutionTime: 0,
    minExecutionTime: Infinity,
    maxExecutionTime: 0,
    slowQueryCount: 0,
    verySlowQueryCount: 0,
    byType: {},
    byTable: {},
  };
  private alerts: PerformanceAlert[] = [];
  private maxLogs = 1000;
  private slowQueryThreshold = 100; // milliseconds
  private verySlowQueryThreshold = 1000; // milliseconds
  private alertThresholds = {
    slowQueryRate: 0.1, // 10% of queries are slow
    avgExecutionTime: 500, // Average > 500ms
  };

  /**
   * Log a query execution
   */
  logQuery(
    sql: string,
    executionTime: number,
    rowCount: number,
    indexUsed: boolean = false,
    params?: unknown[]
  ): void {
    const queryType = this.extractQueryType(sql);
    const tableName = this.extractTableName(sql);

    // Create log entry
    const log: SlowQueryLog = {
      sql: this.sanitizeQuery(sql),
      executionTime,
      timestamp: Date.now(),
      rowCount,
      indexUsed,
      tableName,
      queryType,
      params: params ? this.sanitizeParams(params) : undefined,
      stackTrace: process.env.NODE_ENV === 'development' ? new Error().stack : undefined,
    };

    // Update metrics
    this.updateMetrics(log);

    // Check if it's a slow query
    if (executionTime > this.slowQueryThreshold) {
      this.addSlowQueryLog(log);

      if (executionTime > this.verySlowQueryThreshold) {
        this.metrics.verySlowQueryCount++;
        logger.error(
          `Very slow query detected (${executionTime.toFixed(0)}ms)`,
          {
            category: 'db',
            sql: this.sanitizeQuery(sql),
            executionTime,
            tableName,
          }
        );
      } else {
        logger.warn(
          `Slow query detected (${executionTime.toFixed(0)}ms)`,
          {
            category: 'db',
            sql: this.sanitizeQuery(sql),
            executionTime,
            tableName,
          }
        );
      }

      // Check for performance alerts
      this.checkForAlerts();
    }
  }

  /**
   * Get all slow query logs
   */
  getSlowQueries(limit?: number): SlowQueryLog[] {
    const sorted = [...this.logs].sort((a, b) => b.executionTime - a.executionTime);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get query metrics
   */
  getMetrics(): QueryMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance alerts
   */
  getAlerts(limit?: number): PerformanceAlert[] {
    const sorted = [...this.alerts].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get slow query statistics
   */
  getSlowQueryStats(): {
    total: number;
    avgTime: number;
    maxTime: number;
    byType: Record<string, number>;
    byTable: Record<string, number>;
    topQueries: SlowQueryLog[];
  } {
    const slowQueries = this.logs.filter(log => log.executionTime > this.slowQueryThreshold);

    const byType: Record<string, number> = {};
    const byTable: Record<string, number> = {};

    let totalTime = 0;
    let maxTime = 0;

    for (const log of slowQueries) {
      totalTime += log.executionTime;
      maxTime = Math.max(maxTime, log.executionTime);

      byType[log.queryType] = (byType[log.queryType] || 0) + 1;
      if (log.tableName) {
        byTable[log.tableName] = (byTable[log.tableName] || 0) + 1;
      }
    }

    return {
      total: slowQueries.length,
      avgTime: slowQueries.length > 0 ? totalTime / slowQueries.length : 0,
      maxTime,
      byType,
      byTable,
      topQueries: slowQueries.slice(0, 10),
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const slowQueryStats = this.getSlowQueryStats();
    const slowQueryRate = this.metrics.totalQueries > 0
      ? (slowQueryStats.total / this.metrics.totalQueries) * 100
      : 0;

    let report = '=== Database Performance Report ===\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += 'Query Metrics:\n';
    report += `  Total Queries: ${this.metrics.totalQueries}\n`;
    report += `  Total Execution Time: ${this.metrics.totalExecutionTime.toFixed(0)}ms\n`;
    report += `  Average Execution Time: ${this.metrics.avgExecutionTime.toFixed(2)}ms\n`;
    report += `  Min Execution Time: ${this.metrics.minExecutionTime === Infinity ? 0 : this.metrics.minExecutionTime.toFixed(2)}ms\n`;
    report += `  Max Execution Time: ${this.metrics.maxExecutionTime.toFixed(2)}ms\n`;
    report += `  Slow Query Count (>100ms): ${this.metrics.slowQueryCount}\n`;
    report += `  Very Slow Query Count (>1000ms): ${this.metrics.verySlowQueryCount}\n`;
    report += `  Slow Query Rate: ${slowQueryRate.toFixed(2)}%\n\n`;

    report += 'Queries by Type:\n';
    for (const [type, count] of Object.entries(this.metrics.byType)) {
      report += `  ${type}: ${count}\n`;
    }
    report += '\n';

    report += 'Queries by Table:\n';
    for (const [table, count] of Object.entries(this.metrics.byTable)) {
      report += `  ${table}: ${count}\n`;
    }
    report += '\n';

    report += 'Slow Query Statistics:\n';
    report += `  Total Slow Queries: ${slowQueryStats.total}\n`;
    report += `  Average Slow Query Time: ${slowQueryStats.avgTime.toFixed(2)}ms\n`;
    report += `  Max Slow Query Time: ${slowQueryStats.maxTime.toFixed(2)}ms\n\n`;

    report += 'Top Slow Queries:\n';
    for (let i = 0; i < slowQueryStats.topQueries.length; i++) {
      const query = slowQueryStats.topQueries[i];
      report += `  ${i + 1}. ${query.sql.substring(0, 80)}...\n`;
      report += `     Time: ${query.executionTime.toFixed(2)}ms, Rows: ${query.rowCount}\n`;
      report += `     Table: ${query.tableName || 'N/A'}, Index: ${query.indexUsed ? 'Yes' : 'No'}\n\n`;
    }

    if (this.alerts.length > 0) {
      report += 'Recent Alerts:\n';
      for (let i = 0; i < Math.min(5, this.alerts.length); i++) {
        const alert = this.alerts[i];
        report += `  [${alert.severity.toUpperCase()}] ${alert.message}\n`;
        report += `     ${new Date(alert.timestamp).toISOString()}\n\n`;
      }
    }

    return report;
  }

  /**
   * Clear logs and metrics
   */
  clear(): void {
    this.logs = [];
    this.alerts = [];
    this.metrics = {
      totalQueries: 0,
      totalExecutionTime: 0,
      avgExecutionTime: 0,
      minExecutionTime: Infinity,
      maxExecutionTime: 0,
      slowQueryCount: 0,
      verySlowQueryCount: 0,
      byType: {},
      byTable: {},
    };
  }

  /**
   * Set slow query threshold
   */
  setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold;
  }

  /**
   * Set very slow query threshold
   */
  setVerySlowQueryThreshold(threshold: number): void {
    this.verySlowQueryThreshold = threshold;
  }

  /**
   * Add slow query log
   */
  private addSlowQueryLog(log: SlowQueryLog): void {
    this.logs.push(log);

    // Limit log size
    if (this.logs.length > this.maxLogs) {
      // Remove oldest logs first
      this.logs.sort((a, b) => b.timestamp - a.timestamp);
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(log: SlowQueryLog): void {
    this.metrics.totalQueries++;
    this.metrics.totalExecutionTime += log.executionTime;
    this.metrics.avgExecutionTime = this.metrics.totalExecutionTime / this.metrics.totalQueries;
    this.metrics.minExecutionTime = Math.min(this.metrics.minExecutionTime, log.executionTime);
    this.metrics.maxExecutionTime = Math.max(this.metrics.maxExecutionTime, log.executionTime);

    this.metrics.byType[log.queryType] = (this.metrics.byType[log.queryType] || 0) + 1;
    if (log.tableName) {
      this.metrics.byTable[log.tableName] = (this.metrics.byTable[log.tableName] || 0) + 1;
    }
  }

  /**
   * Check for performance alerts
   */
  private checkForAlerts(): void {
    const slowQueryRate = this.metrics.totalQueries > 0
      ? this.metrics.slowQueryCount / this.metrics.totalQueries
      : 0;

    // Check for degraded performance
    if (slowQueryRate > this.alertThresholds.slowQueryRate) {
      this.addAlert({
        type: 'degraded_performance',
        message: `High slow query rate: ${(slowQueryRate * 100).toFixed(2)}%`,
        timestamp: Date.now(),
        severity: 'warning',
        data: {
          slowQueryRate,
          threshold: this.alertThresholds.slowQueryRate,
        },
      });
    }

    // Check for poor average performance
    if (this.metrics.avgExecutionTime > this.alertThresholds.avgExecutionTime) {
      this.addAlert({
        type: 'degraded_performance',
        message: `High average query time: ${this.metrics.avgExecutionTime.toFixed(2)}ms`,
        timestamp: Date.now(),
        severity: 'error',
        data: {
          avgExecutionTime: this.metrics.avgExecutionTime,
          threshold: this.alertThresholds.avgExecutionTime,
        },
      });
    }
  }

  /**
   * Add performance alert
   */
  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);

    // Limit alerts
    if (this.alerts.length > 100) {
      this.alerts.sort((a, b) => b.timestamp - a.timestamp);
      this.alerts = this.alerts.slice(0, 100);
    }

    // Log the alert
    if (alert.severity === 'error' || alert.severity === 'critical') {
      logger.error(alert.message, {
        category: 'db',
        alertType: alert.type,
        alertData: alert.data,
      });
    } else if (alert.severity === 'warning') {
      logger.warn(alert.message, {
        category: 'db',
        alertType: alert.type,
        alertData: alert.data,
      });
    }
  }

  /**
   * Extract query type
   */
  private extractQueryType(sql: string): string {
    const match = sql.trim().match(/^(\w+)/i);
    return match ? match[1].toUpperCase() : 'UNKNOWN';
  }

  /**
   * Extract table name
   */
  private extractTableName(sql: string): string | undefined {
    const match = sql.match(/FROM\s+([^\s,]+)/i);
    return match ? match[1] : undefined;
  }

  /**
   * Sanitize query for logging
   */
  private sanitizeQuery(sql: string): string {
    return sql.replace(/\s+/g, ' ').trim();
  }

  /**
   * Sanitize parameters for logging
   */
  private sanitizeParams(params: unknown[]): unknown[] {
    return params.map(param => {
      if (typeof param === 'string' && param.length > 50) {
        return param.substring(0, 50) + '...';
      }
      return param;
    });
  }
}

// Global logger instance
let loggerInstance: SlowQueryLogger | null = null;

/**
 * Get or create the global slow query logger instance
 */
export function getSlowQueryLogger(): SlowQueryLogger {
  if (!loggerInstance) {
    loggerInstance = new SlowQueryLogger();
  }
  return loggerInstance;
}

/**
 * Reset the global slow query logger (for testing)
 */
export function resetSlowQueryLogger(): void {
  if (loggerInstance) {
    loggerInstance.clear();
  }
}

export default SlowQueryLogger;
