/**
 * Performance Logger Integration
 * 性能日志集成模块
 *
 * 集成数据库性能日志、慢查询检测和 N+1 查询检测
 * 提供统一的性能监控接口
 */

import Database from 'better-sqlite3'
import {
  withPerformanceLogging,
  getQueryMetricsSummary,
  getQueryInsights,
} from '../middleware/db-performance'
import { getSlowQueryLogger } from './slow-query-logger'
import type { SlowQueryLogger } from './slow-query-logger'
import { getNPlus1Detector, NPlus1Detection } from './nplus1-detector'
import { logger } from '../logger'
import type { DatabaseConnection } from './index'

// Type alias for better-sqlite3 Database
type BetterSqlite3Database = Database.Database

/**
 * 性能日志配置
 */
export interface PerformanceLoggerConfig {
  /** 是否启用性能日志 */
  enabled?: boolean
  /** 慢查询阈值（毫秒） */
  slowQueryThreshold?: number
  /** 非常慢查询阈值（毫秒） */
  verySlowQueryThreshold?: number
  /** 是否启用 N+1 检测 */
  enableNPlus1Detection?: boolean
  /** 是否记录堆栈跟踪（仅开发环境） */
  enableStackTrace?: boolean
}

/**
 * 性能日志统计摘要
 */
export interface PerformanceSummary {
  /** 总查询数 */
  totalQueries: number
  /** 平均执行时间（毫秒） */
  avgDuration: number
  /** 最慢查询时间（毫秒） */
  maxDuration: number
  /** 成功率 */
  successRate: number
  /** 慢查询数（> 100ms） */
  slowQueryCount: number
  /** 错误查询数 */
  errorQueryCount: number
  /** N+1 检测结果 */
  nPlus1Detections: NPlus1Detection[]
  /** 性能洞察 */
  insights: string[]
  /** 按操作类型统计 */
  byOperation: Record<string, { count: number; avgDuration: number; errorRate: number }>
}

/**
 * 性能日志管理器
 */
class PerformanceLoggerManager {
  private config: Required<PerformanceLoggerConfig>
  private slowQueryLogger: SlowQueryLogger
  private requestMetrics: Map<string, { startTime: number; queryCount: number }> = new Map()

  constructor() {
    this.config = {
      enabled:
        process.env.ENABLE_DB_PERFORMANCE_LOGGING === 'true' ||
        process.env.NODE_ENV === 'development',
      slowQueryThreshold: 100,
      verySlowQueryThreshold: 1000,
      enableNPlus1Detection: true,
      enableStackTrace: process.env.NODE_ENV === 'development',
    }

    this.slowQueryLogger = getSlowQueryLogger()

    // 配置慢查询日志记录器
    this.slowQueryLogger.setSlowQueryThreshold(this.config.slowQueryThreshold)
    this.slowQueryLogger.setVerySlowQueryThreshold(this.config.verySlowQueryThreshold)
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PerformanceLoggerConfig>): void {
    this.config = { ...this.config, ...config }

    // 更新慢查询日志记录器配置
    if (config.slowQueryThreshold !== undefined) {
      this.slowQueryLogger.setSlowQueryThreshold(config.slowQueryThreshold)
    }
    if (config.verySlowQueryThreshold !== undefined) {
      this.slowQueryLogger.setVerySlowQueryThreshold(config.verySlowQueryThreshold)
    }

    logger.info('Performance logger config updated', { category: 'db', config: this.config })
  }

  /**
   * 获取当前配置
   */
  getConfig(): Required<PerformanceLoggerConfig> {
    return { ...this.config }
  }

  /**
   * 开始请求跟踪
   */
  startRequest(requestId: string): void {
    if (!this.config.enabled) return

    this.requestMetrics.set(requestId, {
      startTime: Date.now(),
      queryCount: 0,
    })

    if (this.config.enableNPlus1Detection) {
      const detector = getNPlus1Detector()
      detector.startRequest(requestId)
    }
  }

  /**
   * 结束请求跟踪
   */
  endRequest(requestId: string): NPlus1Detection | null {
    if (!this.config.enabled) return null

    const metrics = this.requestMetrics.get(requestId)
    if (!metrics) return null

    const duration = Date.now() - metrics.startTime
    this.requestMetrics.delete(requestId)

    logger.debug('Request completed', {
      category: 'db',
      requestId,
      duration,
      queryCount: metrics.queryCount,
    })

    if (this.config.enableNPlus1Detection) {
      const detector = getNPlus1Detector()
      const detection = detector.endRequest(requestId)

      if (detection.detected) {
        logger.warn('N+1 query pattern detected', {
          category: 'db',
          requestId,
          severity: detection.severity,
          patternCount: detection.patterns.length,
          suggestions: detection.suggestions,
        })
      }

      return detection
    }

    return null
  }

  /**
   * 包装数据库连接以启用性能日志
   */
  wrapDatabase(db: Database.Database | DatabaseConnection): DatabaseConnection {
    if (!this.config.enabled) {
      // Return as-is, cast to DatabaseConnection
      return db as DatabaseConnection
    }

    return withPerformanceLogging(db as DatabaseConnection)
  }

  /**
   * 获取性能摘要
   */
  getPerformanceSummary(): PerformanceSummary {
    const dbMetrics = getQueryMetricsSummary()
    const slowQueryStats = this.slowQueryLogger.getSlowQueryStats()
    const insights = getQueryInsights()

    // 获取 N+1 检测结果（从请求历史中）
    const nPlus1Detections: NPlus1Detection[] = []

    return {
      totalQueries: dbMetrics.total,
      avgDuration: dbMetrics.avgDuration,
      maxDuration: dbMetrics.maxDuration,
      successRate: dbMetrics.successRate,
      slowQueryCount: slowQueryStats.total,
      errorQueryCount:
        dbMetrics.total - Math.floor((dbMetrics.successRate / 100) * dbMetrics.total),
      nPlus1Detections,
      insights,
      byOperation: dbMetrics.byOperation,
    }
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const summary = this.getPerformanceSummary()
    const slowQueryStats = this.slowQueryLogger.getSlowQueryStats()

    let report = '=== 数据库性能报告 ===\n\n'
    report += `生成时间: ${new Date().toISOString()}\n\n`

    report += '性能摘要:\n'
    report += `  总查询数: ${summary.totalQueries}\n`
    report += `  平均执行时间: ${summary.avgDuration.toFixed(2)}ms\n`
    report += `  最慢查询时间: ${summary.maxDuration.toFixed(2)}ms\n`
    report += `  成功率: ${summary.successRate.toFixed(2)}%\n`
    report += `  慢查询数 (>${this.config.slowQueryThreshold}ms): ${summary.slowQueryCount}\n`
    report += `  错误查询数: ${summary.errorQueryCount}\n\n`

    if (Object.keys(summary.byOperation).length > 0) {
      report += '按操作类型统计:\n'
      for (const [op, data] of Object.entries(summary.byOperation)) {
        report += `  ${op}:\n`
        report += `    查询数: ${data.count}\n`
        report += `    平均时间: ${data.avgDuration.toFixed(2)}ms\n`
        report += `    错误率: ${data.errorRate.toFixed(2)}%\n`
      }
      report += '\n'
    }

    report += '慢查询统计:\n'
    report += `  总数: ${slowQueryStats.total}\n`
    report += `  平均时间: ${slowQueryStats.avgTime.toFixed(2)}ms\n`
    report += `  最慢查询: ${slowQueryStats.maxTime.toFixed(2)}ms\n\n`

    if (slowQueryStats.topQueries.length > 0) {
      report += 'Top 10 慢查询:\n'
      for (let i = 0; i < Math.min(10, slowQueryStats.topQueries.length); i++) {
        const query = slowQueryStats.topQueries[i]
        report += `  ${i + 1}. ${query.sql.substring(0, 80)}...\n`
        report += `     时间: ${query.executionTime.toFixed(2)}ms, 行数: ${query.rowCount}\n`
        report += `     表: ${query.tableName || 'N/A'}, 索引: ${query.indexUsed ? '是' : '否'}\n\n`
      }
    }

    if (summary.insights.length > 0) {
      report += '性能洞察:\n'
      for (const insight of summary.insights) {
        report += `  ${insight}\n`
      }
      report += '\n'
    }

    return report
  }

  /**
   * 清除所有指标
   */
  clearMetrics(): void {
    // 清除数据库性能指标
    try {
      const dbMetricsModule = require('../middleware/db-performance')
      if (dbMetricsModule.clearQueryMetrics) {
        dbMetricsModule.clearQueryMetrics()
      }
    } catch (error) {
      // db-performance 模块可能不存在，忽略错误
      logger.warn('Failed to clear db-performance metrics', { error, category: 'db' })
    }

    // 清除慢查询日志
    this.slowQueryLogger.clear()

    // 清除 N+1 检测器
    resetNPlus1Detector()

    logger.info('Performance metrics cleared', { category: 'db' })
  }

  /**
   * 获取健康状态
   */
  getHealthStatus(): {
    healthy: boolean
    issues: string[]
    score: number
  } {
    const summary = this.getPerformanceSummary()
    const issues: string[] = []
    let score = 100

    // 检查慢查询率
    const slowQueryRate =
      summary.totalQueries > 0 ? (summary.slowQueryCount / summary.totalQueries) * 100 : 0

    if (slowQueryRate > 10) {
      issues.push(`慢查询率过高: ${slowQueryRate.toFixed(2)}% (> 10%)`)
      score -= 20
    } else if (slowQueryRate > 5) {
      issues.push(`慢查询率偏高: ${slowQueryRate.toFixed(2)}% (> 5%)`)
      score -= 10
    }

    // 检查错误率
    const errorRate = 100 - summary.successRate
    if (errorRate > 1) {
      issues.push(`查询错误率过高: ${errorRate.toFixed(2)}% (> 1%)`)
      score -= 30
    } else if (errorRate > 0.1) {
      issues.push(`查询错误率偏高: ${errorRate.toFixed(2)}% (> 0.1%)`)
      score -= 10
    }

    // 检查平均执行时间
    if (summary.avgDuration > 100) {
      issues.push(`平均查询时间过长: ${summary.avgDuration.toFixed(2)}ms (> 100ms)`)
      score -= 20
    }

    // 检查 N+1 查询
    if (summary.nPlus1Detections.some(d => d.detected)) {
      const detectedCount = summary.nPlus1Detections.filter(d => d.detected).length
      issues.push(`检测到 ${detectedCount} 个请求中存在 N+1 查询问题`)
      score -= 15
    }

    return {
      healthy: score >= 70,
      issues,
      score: Math.max(0, score),
    }
  }
}

/**
 * 重置 N+1 检测器
 */
function resetNPlus1Detector(): void {
  try {
    const { resetNPlus1Detector: reset } = require('./nplus1-detector')
    reset()
  } catch (error) {
    logger.warn('Failed to reset N+1 detector', { error, category: 'db' })
  }
}

// 全局实例
let managerInstance: PerformanceLoggerManager | null = null

/**
 * 获取性能日志管理器实例
 */
export function getPerformanceLogger(): PerformanceLoggerManager {
  if (!managerInstance) {
    managerInstance = new PerformanceLoggerManager()
  }
  return managerInstance
}

/**
 * 重置性能日志管理器（用于测试）
 */
export function resetPerformanceLogger(): void {
  if (managerInstance) {
    managerInstance.clearMetrics()
  }
  managerInstance = null
}

/**
 * 快捷函数：包装数据库连接
 */
export function wrapDatabaseWithLogging(
  db: Database.Database | DatabaseConnection
): DatabaseConnection {
  return getPerformanceLogger().wrapDatabase(db)
}

/**
 * 快捷函数：开始请求跟踪
 */
export function trackRequestStart(requestId: string): void {
  getPerformanceLogger().startRequest(requestId)
}

/**
 * 快捷函数：结束请求跟踪
 */
export function trackRequestEnd(requestId: string): NPlus1Detection | null {
  return getPerformanceLogger().endRequest(requestId)
}

/**
 * 快捷函数：获取性能报告
 */
export function getPerformanceReport(): string {
  return getPerformanceLogger().generateReport()
}

/**
 * 快捷函数：获取健康状态
 */
export function getPerformanceHealth() {
  return getPerformanceLogger().getHealthStatus()
}

export default {
  getPerformanceLogger,
  resetPerformanceLogger,
  wrapDatabaseWithLogging,
  trackRequestStart,
  trackRequestEnd,
  getPerformanceReport,
  getPerformanceHealth,
}
