/**
 * DashboardManager - 仪表板管理器
 * 
 * 管理仪表板定义、实时数据展示、告警规则配置
 * 
 * @version v1.11.0
 */

import {
  Dashboard,
  DashboardWidget,
  DashboardData,
  WidgetType,
  TimeRange,
  AlertRule,
  AlertInstance,
  AlertCondition,
  AlertSeverity,
  AlertState,
  MetricFilter,
  TraceFilter,
  LogFilter,
} from '../types'
import type { MetricCollector } from '../metrics/MetricCollector'
import type { TraceManager } from '../tracing/TraceManager'
import type { StructuredLogger } from '../logging/StructuredLogger'

// ============================================
// DashboardManager Options
// ============================================

export interface DashboardManagerOptions {
  metricCollector: MetricCollector
  traceManager: TraceManager
  logger: StructuredLogger
  refreshInterval?: number
}

// ============================================
// DashboardManager Class
// ============================================

export class DashboardManager {
  private options: Required<Omit<DashboardManagerOptions, 'metricCollector' | 'traceManager' | 'logger'>> & {
    metricCollector: MetricCollector
    traceManager: TraceManager
    logger: StructuredLogger
  }
  private dashboards: Map<string, Dashboard> = new Map()
  private alertRules: Map<string, AlertRule> = new Map()
  private activeAlerts: Map<string, AlertInstance[]> = new Map()
  private refreshInterval: ReturnType<typeof setInterval> | undefined

  constructor(options: DashboardManagerOptions) {
    this.options = {
      metricCollector: options.metricCollector,
      traceManager: options.traceManager,
      logger: options.logger,
      refreshInterval: options.refreshInterval ?? 30000,
    }
  }

  // ============================================
  // Dashboard CRUD
  // ============================================

  /**
   * 创建仪表板
   */
  createDashboard(dashboard: Omit<Dashboard, 'createdAt' | 'updatedAt'>): Dashboard {
    const now = Date.now()
    const newDashboard: Dashboard = {
      ...dashboard,
      createdAt: now,
      updatedAt: now,
    }
    this.dashboards.set(dashboard.id, newDashboard)
    return newDashboard
  }

  /**
   * 获取仪表板
   */
  getDashboard(id: string): Dashboard | undefined {
    return this.dashboards.get(id)
  }

  /**
   * 更新仪表板
   */
  updateDashboard(id: string, updates: Partial<Dashboard>): Dashboard | undefined {
    const dashboard = this.dashboards.get(id)
    if (!dashboard) return undefined

    const updated: Dashboard = {
      ...dashboard,
      ...updates,
      updatedAt: Date.now(),
    }
    this.dashboards.set(id, updated)
    return updated
  }

  /**
   * 删除仪表板
   */
  deleteDashboard(id: string): boolean {
    return this.dashboards.delete(id)
  }

  /**
   * 获取所有仪表板
   */
  listDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values())
  }

  // ============================================
  // Dashboard Data
  // ============================================

  /**
   * 获取仪表板数据
   */
  async getDashboardData(dashboardId: string, timeRange?: TimeRange): Promise<DashboardData | undefined> {
    const dashboard = this.dashboards.get(dashboardId)
    if (!dashboard) return undefined

    const range = timeRange || dashboard.timeRange || {
      start: Date.now() - 3600000, // 1小时前
      end: Date.now(),
    }

    const widgetData = await Promise.all(
      dashboard.widgets.map(async (widget) => {
        try {
          const data = await this.getWidgetData(widget, range)
          return { id: widget.id, data }
        } catch (error) {
          return {
            id: widget.id,
            data: null,
            error: error instanceof Error ? error.message : String(error),
          }
        }
      })
    )

    return {
      dashboardId,
      timeRange: range,
      generatedAt: Date.now(),
      widgets: widgetData,
    }
  }

  /**
   * 获取小组件数据
   */
  private async getWidgetData(widget: DashboardWidget, timeRange: TimeRange): Promise<unknown> {
    const { dataSource } = widget

    switch (dataSource.type) {
      case 'metric':
        return this.getMetricWidgetData(dataSource.query as MetricFilter, timeRange, widget.type)

      case 'trace':
        return this.getTraceWidgetData(dataSource.query as TraceFilter, timeRange)

      case 'log':
        return this.getLogWidgetData(dataSource.query as LogFilter, timeRange)

      default:
        return null
    }
  }

  /**
   * 获取指标小组件数据
   */
  private getMetricWidgetData(filter: MetricFilter, timeRange: TimeRange, widgetType: WidgetType): unknown {
    const results = this.options.metricCollector.query({
      ...filter,
      timeRange,
    })

    switch (widgetType) {
      case WidgetType.LINE_CHART:
        return {
          series: results.map(r => ({
            name: r.name,
            data: [{ time: r.timeRange.start, value: r.avg }, { time: r.timeRange.end, value: r.avg }],
          })),
        }

      case WidgetType.BAR_CHART:
        return {
          labels: results.map(r => r.name),
          data: results.map(r => r.avg),
        }

      case WidgetType.GAUGE:
      case WidgetType.STAT:
        const total = results.reduce((sum, r) => sum + r.avg, 0)
        return { value: total / results.length || 0 }

      case WidgetType.TABLE:
        return results

      case WidgetType.HEATMAP:
        return {
          data: results.map(r => ({
            x: r.name,
            y: r.avg,
            value: r.count,
          })),
        }

      default:
        return results
    }
  }

  /**
   * 获取追踪小组件数据
   */
  private getTraceWidgetData(filter: TraceFilter, timeRange: TimeRange): unknown {
    const traces = this.options.traceManager.queryTraces({
      ...filter,
      timeRange,
    })

    return {
      total: traces.length,
      errors: traces.filter(t => t.hasErrors).length,
      avgDuration: traces.length > 0
        ? traces.reduce((sum, t) => sum + t.duration, 0) / traces.length
        : 0,
      traces: traces.slice(0, 100),
    }
  }

  /**
   * 获取日志小组件数据
   */
  private getLogWidgetData(filter: LogFilter, timeRange: TimeRange): unknown {
    const logs = this.options.logger.query({
      ...filter,
      timeRange,
    })

    return {
      total: logs.length,
      errors: logs.filter(l => l.level === 'error' || l.level === 'fatal').length,
      logs: logs.slice(0, 100),
    }
  }

  // ============================================
  // Alert Rules
  // ============================================

  /**
   * 创建告警规则
   */
  createAlertRule(rule: AlertRule): AlertRule {
    this.alertRules.set(rule.id, rule)
    return rule
  }

  /**
   * 获取告警规则
   */
  getAlertRule(id: string): AlertRule | undefined {
    return this.alertRules.get(id)
  }

  /**
   * 更新告警规则
   */
  updateAlertRule(id: string, updates: Partial<AlertRule>): AlertRule | undefined {
    const rule = this.alertRules.get(id)
    if (!rule) return undefined

    const updated = { ...rule, ...updates }
    this.alertRules.set(id, updated)
    return updated
  }

  /**
   * 删除告警规则
   */
  deleteAlertRule(id: string): boolean {
    this.alertRules.delete(id)
    this.activeAlerts.delete(id)
    return true
  }

  /**
   * 获取所有告警规则
   */
  listAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values())
  }

  // ============================================
  // Alert Evaluation
  // ============================================

  /**
   * 评估告警规则
   */
  evaluateAlerts(): AlertInstance[] {
    const newAlerts: AlertInstance[] = []

    const rules = Array.from(this.alertRules.values())
    for (const rule of rules) {
      if (!rule.enabled) continue

      const value = this.evaluateCondition(rule.condition)
      const isFiring = this.checkThreshold(value, rule.condition)

      const existingAlerts = this.activeAlerts.get(rule.id) || []
      const now = Date.now()

      if (isFiring) {
        // 检查是否已有活跃告警
        const existing = existingAlerts.find(a => a.state === AlertState.FIRING)
        if (existing) {
          existing.value = value
          newAlerts.push(existing)
        } else {
          const alert: AlertInstance = {
            ruleId: rule.id,
            state: AlertState.FIRING,
            severity: rule.severity,
            startedAt: now,
            value,
            labels: rule.labels || {},
            annotations: rule.annotations || {},
          }
          newAlerts.push(alert)
          this.activeAlerts.set(rule.id, [alert])
        }
      } else {
        // 解决现有告警
        for (const alert of existingAlerts) {
          if (alert.state === AlertState.FIRING) {
            alert.state = AlertState.RESOLVED
            alert.resolvedAt = now
            newAlerts.push(alert)
          }
        }
      }
    }

    return newAlerts
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): AlertInstance[] {
    const alerts: AlertInstance[] = []
    const instances = Array.from(this.activeAlerts.values())
    for (const instance of instances) {
      alerts.push(...instance.filter(a => a.state === AlertState.FIRING))
    }
    return alerts
  }

  /**
   * 评估条件
   */
  private evaluateCondition(condition: AlertCondition): number {
    switch (condition.type) {
      case 'metric': {
        const filter = condition.query as MetricFilter
        const results = this.options.metricCollector.query(filter)
        if (results.length === 0) return 0

        switch (condition.aggregation || 'avg') {
          case 'sum':
            return results.reduce((sum, r) => sum + r.sum, 0)
          case 'avg':
            return results.reduce((sum, r) => sum + r.avg, 0) / results.length
          case 'min':
            return Math.min(...results.map(r => r.min))
          case 'max':
            return Math.max(...results.map(r => r.max))
          case 'count':
            return results.reduce((sum, r) => sum + r.count, 0)
          default:
            return results[0].avg
        }
      }

      case 'trace': {
        const filter = condition.query as TraceFilter
        const traces = this.options.traceManager.queryTraces(filter)
        return traces.length
      }

      case 'log': {
        const filter = condition.query as LogFilter
        const logs = this.options.logger.query(filter)
        return logs.length
      }

      default:
        return 0
    }
  }

  /**
   * 检查阈值
   */
  private checkThreshold(value: number, condition: AlertCondition): boolean {
    switch (condition.operator) {
      case 'gt':
        return value > condition.threshold
      case 'lt':
        return value < condition.threshold
      case 'gte':
        return value >= condition.threshold
      case 'lte':
        return value <= condition.threshold
      case 'eq':
        return value === condition.threshold
      case 'neq':
        return value !== condition.threshold
      default:
        return false
    }
  }

  // ============================================
  // System Metrics
  // ============================================

  /**
   * 获取系统概览
   */
  getSystemOverview(): {
    metrics: {
      registered: number
      collected: number
    }
    traces: {
      active: number
      completed: number
    }
    logs: {
      entries: number
    }
    alerts: {
      rules: number
      active: number
    }
  } {
    const metricStats = this.options.metricCollector.getStats()
    const traceStats = this.options.traceManager.getStats()
    const logStats = this.options.logger.getStats()

    return {
      metrics: {
        registered: metricStats.registeredCount,
        collected: metricStats.collectedCount,
      },
      traces: {
        active: traceStats.activeTraces,
        completed: traceStats.completedTraces,
      },
      logs: {
        entries: logStats.entriesCount,
      },
      alerts: {
        rules: this.alertRules.size,
        active: this.getActiveAlerts().length,
      },
    }
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * 启动自动刷新
   */
  startAutoRefresh(): void {
    if (this.refreshInterval) return

    this.refreshInterval = setInterval(() => {
      this.evaluateAlerts()
    }, this.options.refreshInterval)
  }

  /**
   * 停止自动刷新
   */
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = undefined
    }
  }

  /**
   * 清理所有数据
   */
  clear(): void {
    this.dashboards.clear()
    this.alertRules.clear()
    this.activeAlerts.clear()
    this.stopAutoRefresh()
  }
}

// ============================================
// Default Dashboard Templates
// ============================================

export const DEFAULT_DASHBOARDS: Partial<Dashboard>[] = [
  {
    id: 'system-overview',
    name: 'System Overview',
    description: 'System health and performance overview',
    widgets: [
      {
        id: 'request-rate',
        type: WidgetType.LINE_CHART,
        title: 'Request Rate',
        width: 6,
        height: 4,
        x: 0,
        y: 0,
        config: {},
        dataSource: {
          type: 'metric',
          query: { names: ['http_requests_total'] },
        },
      },
      {
        id: 'error-rate',
        type: WidgetType.GAUGE,
        title: 'Error Rate',
        width: 3,
        height: 4,
        x: 6,
        y: 0,
        config: { thresholds: { warning: 0.05, critical: 0.1 } },
        dataSource: {
          type: 'metric',
          query: { names: ['error_rate'] },
        },
      },
      {
        id: 'latency',
        type: WidgetType.STAT,
        title: 'Avg Latency (ms)',
        width: 3,
        height: 4,
        x: 9,
        y: 0,
        config: {},
        dataSource: {
          type: 'metric',
          query: { names: ['http_request_duration_ms'] },
        },
      },
      {
        id: 'recent-traces',
        type: WidgetType.TRACE_LIST,
        title: 'Recent Traces',
        width: 6,
        height: 6,
        x: 0,
        y: 4,
        config: {},
        dataSource: {
          type: 'trace',
          query: { limit: 20 },
        },
      },
      {
        id: 'recent-logs',
        type: WidgetType.LOG_LIST,
        title: 'Recent Logs',
        width: 6,
        height: 6,
        x: 6,
        y: 4,
        config: {},
        dataSource: {
          type: 'log',
          query: { limit: 20 },
        },
      },
    ],
  },
  {
    id: 'performance',
    name: 'Performance Dashboard',
    description: 'Performance metrics and analysis',
    widgets: [
      {
        id: 'latency-histogram',
        type: WidgetType.HEATMAP,
        title: 'Latency Distribution',
        width: 12,
        height: 6,
        x: 0,
        y: 0,
        config: {},
        dataSource: {
          type: 'metric',
          query: { names: ['http_request_duration_ms'] },
        },
      },
      {
        id: 'slow-traces',
        type: WidgetType.TRACE_LIST,
        title: 'Slow Traces (>1s)',
        width: 12,
        height: 6,
        x: 0,
        y: 6,
        config: {},
        dataSource: {
          type: 'trace',
          query: { minDuration: 1000, limit: 20 },
        },
      },
    ],
  },
]

// ============================================
// Default Alert Rules
// ============================================

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'high-error-rate',
    name: 'High Error Rate',
    description: 'Alert when error rate exceeds 5%',
    severity: AlertSeverity.WARNING,
    enabled: true,
    condition: {
      type: 'metric',
      query: { names: ['error_rate'] },
      operator: 'gt',
      threshold: 0.05,
      aggregation: 'avg',
    },
    labels: { team: 'platform' },
    annotations: { summary: 'Error rate is above 5%' },
  },
  {
    id: 'high-latency',
    name: 'High Latency',
    description: 'Alert when p95 latency exceeds 1 second',
    severity: AlertSeverity.WARNING,
    enabled: true,
    condition: {
      type: 'metric',
      query: { names: ['http_request_duration_ms'] },
      operator: 'gt',
      threshold: 1000,
      aggregation: 'max',
    },
    labels: { team: 'platform' },
    annotations: { summary: 'P95 latency is above 1 second' },
  },
  {
    id: 'trace-errors',
    name: 'Trace Errors',
    description: 'Alert when traces with errors are detected',
    severity: AlertSeverity.ERROR,
    enabled: true,
    condition: {
      type: 'trace',
      query: { hasErrors: true },
      operator: 'gt',
      threshold: 0,
    },
    labels: { team: 'platform' },
    annotations: { summary: 'Traces with errors detected' },
  },
]
