/**
 * Prometheus/OpenMetrics Exporter
 * 标准化的 Prometheus 指标导出器
 *
 * 功能：
 * - 导出 Prometheus 格式的指标
 * - 支持多种指标类型 (Counter, Gauge, Histogram, Summary)
 * - 自动生成指标元数据
 * - 兼容 Prometheus/Grafana 监控栈
 */

import { getApiPerformanceReport, type ApiPerformanceData } from '@/lib/middleware/api-performance'
import { getRateLimitStats } from '@/lib/middleware/rate-limit'
import { getQueryMetricsSummary } from '@/lib/middleware/db-performance'
import { logger } from '@/lib/logger'

// ============================================
// 类型定义
// ============================================

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary'

export interface Metric {
  name: string
  type: MetricType
  help: string
  value: number
  labels?: Record<string, string>
}

export interface HistogramMetric extends Metric {
  type: 'histogram'
  buckets: { le: string; value: number }[]
  sum: number
  count: number
}

// ============================================
// 指标生成器
// ============================================

export class PrometheusExporter {
  /**
   * 生成所有 Prometheus 指标
   */
  async export(): Promise<string> {
    const lines: string[] = []

    // 系统指标
    lines.push(...(await this.generateSystemMetrics()))

    // HTTP 指标
    lines.push(...this.generateHttpMetrics())

    // 数据库指标
    lines.push(...this.generateDatabaseMetrics())

    // 速率限制指标
    lines.push(...this.generateRateLimitMetrics())

    return lines.join('\n') + '\n'
  }

  /**
   * 生成系统指标
   */
  private generateSystemMetrics(): string[] {
    const lines: string[] = []
    const memUsage = process.memoryUsage()
    const uptime = process.uptime()

    // 内存指标
    lines.push(
      this.formatMetric({
        name: 'nodejs_heap_size_total_bytes',
        type: 'gauge',
        help: 'Process heap size from Node.js in bytes',
        value: memUsage.heapTotal,
      }),
      this.formatMetric({
        name: 'nodejs_heap_size_used_bytes',
        type: 'gauge',
        help: 'Process heap size used from Node.js in bytes',
        value: memUsage.heapUsed,
      }),
      this.formatMetric({
        name: 'nodejs_external_memory_bytes',
        type: 'gauge',
        help: 'Node.js external memory size in bytes',
        value: memUsage.external,
      }),
      this.formatMetric({
        name: 'nodejs_process_resident_set_size_bytes',
        type: 'gauge',
        help: 'Resident set size',
        value: memUsage.rss,
      })
    )

    // 运行时间
    lines.push(
      this.formatMetric({
        name: 'process_uptime_seconds',
        type: 'gauge',
        help: 'Process uptime in seconds',
        value: uptime,
      })
    )

    // 事件循环延迟 (近似)
    lines.push(
      this.formatMetric({
        name: 'nodejs_eventloop_lag_seconds',
        type: 'gauge',
        help: 'Lag of event loop in seconds',
        value: 0, // 需要实际测量
      })
    )

    return lines
  }

  /**
   * 生成 HTTP 指标
   */
  private generateHttpMetrics(): string[] {
    const lines: string[] = []
    const report = getApiPerformanceReport()

    // 请求总数
    lines.push(
      this.formatMetric({
        name: 'http_requests_total',
        type: 'counter',
        help: 'Total number of HTTP requests',
        value: report.summary.totalRequests,
      })
    )

    // 成功请求数
    lines.push(
      this.formatMetric({
        name: 'http_requests_success_total',
        type: 'counter',
        help: 'Total number of successful HTTP requests',
        value: report.summary.successfulRequests,
      })
    )

    // 失败请求数
    lines.push(
      this.formatMetric({
        name: 'http_requests_error_total',
        type: 'counter',
        help: 'Total number of failed HTTP requests',
        value: report.summary.failedRequests,
      })
    )

    // 慢请求数
    lines.push(
      this.formatMetric({
        name: 'http_requests_slow_total',
        type: 'counter',
        help: 'Total number of slow HTTP requests (>500ms)',
        value: report.summary.slowRequests,
      })
    )

    // 按状态码分组的请求
    Object.entries(report.summary.errors).forEach(([statusCode, count]) => {
      lines.push(
        this.formatMetric({
          name: 'http_requests_by_status_total',
          type: 'counter',
          help: 'Total number of HTTP requests by status code',
          value: count,
          labels: { status: statusCode },
        })
      )
    })

    // 平均响应时间
    lines.push(
      this.formatMetric({
        name: 'http_request_duration_seconds',
        type: 'gauge',
        help: 'Average HTTP request duration in seconds',
        value: report.summary.averageDuration / 1000,
      })
    )

    // 最大响应时间
    lines.push(
      this.formatMetric({
        name: 'http_request_duration_max_seconds',
        type: 'gauge',
        help: 'Maximum HTTP request duration in seconds',
        value: report.summary.maxDuration / 1000,
      })
    )

    // 最小响应时间
    lines.push(
      this.formatMetric({
        name: 'http_request_duration_min_seconds',
        type: 'gauge',
        help: 'Minimum HTTP request duration in seconds',
        value: report.summary.minDuration / 1000,
      })
    )

    // 按路由分组的指标
    Object.entries(report.routes).forEach(([route, stats]) => {
      lines.push(
        this.formatMetric({
          name: 'http_requests_by_route_total',
          type: 'counter',
          help: 'Total number of HTTP requests by route',
          value: stats.count,
          labels: { route },
        }),
        this.formatMetric({
          name: 'http_request_duration_by_route_seconds',
          type: 'gauge',
          help: 'Average HTTP request duration by route in seconds',
          value: stats.avgDuration / 1000,
          labels: { route },
        }),
        this.formatMetric({
          name: 'http_error_rate_by_route',
          type: 'gauge',
          help: 'HTTP error rate by route (0-1)',
          value: stats.errorRate / 100,
          labels: { route },
        })
      )
    })

    // P95 和 P99 响应时间 (需要从实际数据计算)
    const p95 = this.calculatePercentile(report.slowRequests, 0.95)
    const p99 = this.calculatePercentile(report.slowRequests, 0.99)

    if (p95 !== null) {
      lines.push(
        this.formatMetric({
          name: 'http_request_duration_p95_seconds',
          type: 'gauge',
          help: 'P95 HTTP request duration in seconds',
          value: p95 / 1000,
        })
      )
    }

    if (p99 !== null) {
      lines.push(
        this.formatMetric({
          name: 'http_request_duration_p99_seconds',
          type: 'gauge',
          help: 'P99 HTTP request duration in seconds',
          value: p99 / 1000,
        })
      )
    }

    return lines
  }

  /**
   * 生成数据库指标
   */
  private generateDatabaseMetrics(): string[] {
    const lines: string[] = []
    const dbSummary = getQueryMetricsSummary()

    // 查询总数
    lines.push(
      this.formatMetric({
        name: 'db_queries_total',
        type: 'counter',
        help: 'Total number of database queries',
        value: dbSummary.total,
      })
    )

    // 平均查询时间
    lines.push(
      this.formatMetric({
        name: 'db_query_duration_seconds',
        type: 'gauge',
        help: 'Average database query duration in seconds',
        value: dbSummary.avgDuration / 1000,
      })
    )

    // 慢查询数
    lines.push(
      this.formatMetric({
        name: 'db_queries_slow_total',
        type: 'counter',
        help: 'Total number of slow database queries',
        value: dbSummary.slowQueries.length,
      })
    )

    // 查询成功率
    lines.push(
      this.formatMetric({
        name: 'db_query_success_rate',
        type: 'gauge',
        help: 'Database query success rate (0-1)',
        value: dbSummary.successRate,
      })
    )

    // 按操作类型分组的指标
    Object.entries(dbSummary.byOperation).forEach(([operation, stats]) => {
      lines.push(
        this.formatMetric({
          name: 'db_queries_by_operation_total',
          type: 'counter',
          help: 'Total number of database queries by operation type',
          value: stats.count,
          labels: { operation },
        }),
        this.formatMetric({
          name: 'db_query_duration_by_operation_seconds',
          type: 'gauge',
          help: 'Average database query duration by operation type in seconds',
          value: stats.avgDuration / 1000,
          labels: { operation },
        }),
        this.formatMetric({
          name: 'db_query_error_rate_by_operation',
          type: 'gauge',
          help: 'Database query error rate by operation type (0-1)',
          value: stats.errorRate,
          labels: { operation },
        })
      )
    })

    return lines
  }

  /**
   * 生成速率限制指标
   */
  private generateRateLimitMetrics(): string[] {
    const lines: string[] = []
    const rateLimitStats = getRateLimitStats()

    // 总条目数
    lines.push(
      this.formatMetric({
        name: 'rate_limit_entries_total',
        type: 'gauge',
        help: 'Total number of rate limit entries',
        value: rateLimitStats.totalEntries,
      })
    )

    // 追踪的路径数
    lines.push(
      this.formatMetric({
        name: 'rate_limit_tracked_paths',
        type: 'gauge',
        help: 'Number of paths with rate limiting',
        value: rateLimitStats.trackedPaths.length,
      })
    )

    // 总请求数
    lines.push(
      this.formatMetric({
        name: 'rate_limit_requests_total',
        type: 'counter',
        help: 'Total number of rate-limited requests',
        value: rateLimitStats.totalRequests,
      })
    )

    return lines
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(metrics: ApiPerformanceData[], percentile: number): number | null {
    if (metrics.length === 0) return null

    const sorted = [...metrics].sort((a, b) => a.duration - b.duration)
    const index = Math.ceil(sorted.length * percentile) - 1
    return sorted[Math.max(0, index)].duration
  }

  /**
   * 格式化 Prometheus 指标
   */
  private formatMetric(metric: Metric): string {
    const lines: string[] = []

    // HELP 注释
    lines.push(`# HELP ${metric.name} ${metric.help}`)

    // TYPE 注释
    lines.push(`# TYPE ${metric.name} ${metric.type}`)

    // 指标值
    const labels = metric.labels
      ? `{${Object.entries(metric.labels)
          .map(([k, v]) => `${k}="${this.escapeLabelValue(v)}"`)
          .join(',')}}`
      : ''

    lines.push(`${metric.name}${labels} ${metric.value}`)

    return lines.join('\n')
  }

  /**
   * 转义标签值
   */
  private escapeLabelValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
  }
}

// ============================================
// 单例
// ============================================

export const prometheusExporter = new PrometheusExporter()

// ============================================
// 便捷函数
// ============================================

/**
 * 导出 Prometheus 指标
 */
export async function exportPrometheusMetrics(): Promise<string> {
  try {
    const metrics = await prometheusExporter.export()
    logger.debug('[Prometheus] Metrics exported successfully')
    return metrics
  } catch (error) {
    logger.error('[Prometheus] Failed to export metrics', error)
    throw error
  }
}
