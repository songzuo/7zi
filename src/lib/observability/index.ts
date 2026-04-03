/**
 * Observability Hub - 可观测性中心
 * 
 * 企业级可观测性系统，集成 Metrics、Tracing、Logging 三大支柱
 * 
 * @version v1.11.0
 * @author AI Executor + Architect
 * 
 * @example
 * ```typescript
 * import { ObservabilityHub } from './observability'
 * 
 * // 初始化
 * const hub = new ObservabilityHub({
 *   serviceName: 'my-service',
 *   environment: 'production',
 * })
 * 
 * // 记录指标
 * hub.recordMetric('http_requests_total', 1, { method: 'GET', path: '/api/users' })
 * 
 * // 创建追踪
 * const traceId = hub.startTrace('handle-request')
 * const span = hub.startSpan('database-query')
 * // ... 执行操作
 * hub.endSpan(span)
 * hub.endTrace()
 * 
 * // 记录日志
 * hub.logger.info('Request processed', { traceId })
 * 
 * // 查询仪表板数据
 * const dashboardData = await hub.getDashboardMetrics({ start: Date.now() - 3600000, end: Date.now() })
 * ```
 */

// ============================================
// Types
// ============================================

export * from './types'

// ============================================
// Metrics
// ============================================

export * from './metrics/MetricCollector'
export * from './metrics/PrometheusExporter'

// ============================================
// Tracing
// ============================================

export * from './tracing/TraceManager'

// ============================================
// Logging
// ============================================

export * from './logging/StructuredLogger'

// ============================================
// Dashboard
// ============================================

export * from './dashboard/DashboardManager'

// ============================================
// Observability Hub
// ============================================

import {
  ObservabilityConfig,
  ObservabilityStatus,
  TimeRange,
  TraceId,
  Span,
  SpanContext,
  SpanKind,
  SpanStatus,
  SpanStatusCode,
  Tags,
  MetricType,
  MetricFilter,
  TraceFilter,
  LogFilter,
  LogLevel,
  SamplingStrategy,
  Dashboard,
  DashboardData,
  AlertRule,
  AlertInstance,
  generateTraceId,
  generateSpanId,
} from './types'

import { MetricCollector, getMetricCollector, initMetricCollector } from './metrics/MetricCollector'
import { PrometheusExporter, createPrometheusHandler } from './metrics/PrometheusExporter'
import { TraceManager, getTraceManager, initTraceManager, TraceManagerOptions } from './tracing/TraceManager'
import { StructuredLogger, getStructuredLogger, initStructuredLogger, StructuredLoggerOptions } from './logging/StructuredLogger'
import { DashboardManager, DEFAULT_DASHBOARDS, DEFAULT_ALERT_RULES } from './dashboard/DashboardManager'

// ============================================
// Observability Hub Class
// ============================================

export class ObservabilityHub {
  private config: {
    serviceName: string
    serviceVersion: string
    environment: string
    metrics: {
      enabled: boolean
      collectInterval: number
      exportInterval: number
      prometheusEnabled: boolean
      prometheusPort: number
    }
    tracing: {
      enabled: boolean
      samplingStrategy: SamplingStrategy
      maxSpansPerTrace: number
      exportEndpoint?: string
    }
    logging: {
      enabled: boolean
      minLevel: LogLevel
      consoleEnabled: boolean
      fileEnabled: boolean
      filePath?: string
      jsonOutput: boolean
    }
    dashboard: {
      enabled: boolean
      refreshInterval: number
    }
    alerts: {
      enabled: boolean
      checkInterval: number
    }
  }
  private metricCollector: MetricCollector
  private traceManager: TraceManager
  private logger: StructuredLogger
  private dashboardManager: DashboardManager
  private prometheusExporter: PrometheusExporter | undefined

  constructor(config: ObservabilityConfig) {
    this.config = {
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion ?? '1.0.0',
      environment: config.environment ?? 'development',
      
      metrics: {
        enabled: config.metrics?.enabled ?? true,
        collectInterval: config.metrics?.collectInterval ?? 60000,
        exportInterval: config.metrics?.exportInterval ?? 15000,
        prometheusEnabled: config.metrics?.prometheusEnabled ?? true,
        prometheusPort: config.metrics?.prometheusPort ?? 9090,
      },
      
      tracing: {
        enabled: config.tracing?.enabled ?? true,
        samplingStrategy: config.tracing?.samplingStrategy ?? { type: 'always' },
        maxSpansPerTrace: config.tracing?.maxSpansPerTrace ?? 1000,
        exportEndpoint: config.tracing?.exportEndpoint,
      },
      
      logging: {
        enabled: config.logging?.enabled ?? true,
        minLevel: config.logging?.minLevel ?? 0,
        consoleEnabled: config.logging?.consoleEnabled ?? true,
        fileEnabled: config.logging?.fileEnabled ?? false,
        filePath: config.logging?.filePath,
        jsonOutput: config.logging?.jsonOutput ?? true,
      },
      
      dashboard: {
        enabled: config.dashboard?.enabled ?? true,
        refreshInterval: config.dashboard?.refreshInterval ?? 30000,
      },
      
      alerts: {
        enabled: config.alerts?.enabled ?? true,
        checkInterval: config.alerts?.checkInterval ?? 60000,
      },
    }

    // 初始化各模块
    this.metricCollector = initMetricCollector({
      maxValuesPerMetric: 10000,
    })

    this.traceManager = initTraceManager({
      serviceName: this.config.serviceName,
      serviceVersion: this.config.serviceVersion,
      environment: this.config.environment,
      samplingStrategy: this.config.tracing.samplingStrategy,
      maxSpansPerTrace: this.config.tracing.maxSpansPerTrace,
    })

    this.logger = initStructuredLogger({
      serviceName: this.config.serviceName,
      serviceVersion: this.config.serviceVersion,
      environment: this.config.environment,
      minLevel: this.config.logging.minLevel,
      consoleEnabled: this.config.logging.consoleEnabled,
      jsonOutput: this.config.logging.jsonOutput,
    })

    this.dashboardManager = new DashboardManager({
      metricCollector: this.metricCollector,
      traceManager: this.traceManager,
      logger: this.logger,
      refreshInterval: this.config.dashboard.refreshInterval,
    })

    // 初始化 Prometheus 导出器
    if (this.config.metrics.prometheusEnabled) {
      this.prometheusExporter = new PrometheusExporter(this.metricCollector, {
        prefix: this.config.serviceName.replace(/-/g, '_'),
      })
    }

    // 创建默认仪表板和告警规则
    this.initializeDefaults()
  }

  // ============================================
  // Initialization
  // ============================================

  private initializeDefaults(): void {
    // 创建默认仪表板
    for (const template of DEFAULT_DASHBOARDS) {
      if (template.id && template.name && template.widgets) {
        this.dashboardManager.createDashboard({
          id: template.id,
          name: template.name,
          description: template.description || '',
          widgets: template.widgets,
          tags: template.tags || [],
        })
      }
    }

    // 创建默认告警规则
    for (const rule of DEFAULT_ALERT_RULES) {
      this.dashboardManager.createAlertRule(rule)
    }
  }

  // ============================================
  // Metrics API
  // ============================================

  /**
   * 记录指标
   */
  recordMetric(name: string, value: number, tags?: Tags): void {
    if (!this.config.metrics.enabled) return
    this.metricCollector.record(name, value, tags)
  }

  /**
   * 递增计数器
   */
  incrementCounter(name: string, value: number = 1, tags?: Tags): void {
    if (!this.config.metrics.enabled) return
    this.metricCollector.increment(name, value, tags)
  }

  /**
   * 设置仪表值
   */
  setGauge(name: string, value: number, tags?: Tags): void {
    if (!this.config.metrics.enabled) return
    this.metricCollector.gauge(name, value, tags)
  }

  /**
   * 观察直方图值
   */
  observeHistogram(name: string, value: number, tags?: Tags): void {
    if (!this.config.metrics.enabled) return
    this.metricCollector.observe(name, value, tags)
  }

  /**
   * 计时器
   */
  startTimer(name: string, tags?: Tags): () => number {
    return this.metricCollector.startTimer(name, tags)
  }

  /**
   * 查询指标
   */
  queryMetrics(filter: MetricFilter) {
    return this.metricCollector.query(filter)
  }

  /**
   * 导出 Prometheus 格式
   */
  exportPrometheus(): string {
    if (!this.prometheusExporter) return ''
    return this.prometheusExporter.export()
  }

  /**
   * 获取 Prometheus HTTP Handler
   */
  getPrometheusHandler() {
    return createPrometheusHandler(this.metricCollector)
  }

  // ============================================
  // Tracing API
  // ============================================

  /**
   * 开始追踪
   */
  startTrace(
    name: string,
    options?: {
      traceId?: TraceId
      attributes?: Tags
      kind?: SpanKind
    }
  ): TraceId {
    if (!this.config.tracing.enabled) return generateTraceId()
    return this.traceManager.startTrace(name, options)
  }

  /**
   * 结束追踪
   */
  endTrace(traceId?: TraceId): void {
    if (!this.config.tracing.enabled) return
    this.traceManager.endTrace(traceId)
  }

  /**
   * 开始 Span
   */
  startSpan(
    name: string,
    options?: {
      kind?: SpanKind
      attributes?: Tags
    }
  ): Span | undefined {
    if (!this.config.tracing.enabled) return undefined
    return this.traceManager.startSpan(name, options)
  }

  /**
   * 结束 Span
   */
  endSpan(span: Span | string, status?: SpanStatus): void {
    if (!this.config.tracing.enabled) return
    this.traceManager.endSpan(span as Span, status)
  }

  /**
   * 使用 Span 包装异步函数
   */
  async withSpan<T>(
    name: string,
    fn: () => Promise<T>,
    options?: {
      kind?: SpanKind
      attributes?: Tags
    }
  ): Promise<T> {
    if (!this.config.tracing.enabled) return fn()
    return this.traceManager.withSpan(name, fn, options)
  }

  /**
   * 获取当前 Span 上下文
   */
  getSpanContext(): SpanContext | undefined {
    return this.traceManager.getContext()
  }

  /**
   * 注入追踪上下文到 Headers
   */
  injectTraceContext(headers: Record<string, string>, format?: 'w3c' | 'b3' | 'sentry'): Record<string, string> {
    return this.traceManager.injectContext(headers, format)
  }

  /**
   * 从 Headers 提取追踪上下文
   */
  extractTraceContext(headers: Record<string, string | undefined>): SpanContext | undefined {
    return this.traceManager.extractContext(headers)
  }

  /**
   * 查询追踪
   */
  queryTraces(filter: TraceFilter) {
    return this.traceManager.queryTraces(filter)
  }

  // ============================================
  // Logging API
  // ============================================

  /**
   * 记录调试日志
   */
  logDebug(message: string, fields?: Tags): void {
    if (!this.config.logging.enabled) return
    this.logger.debug(message, fields)
  }

  /**
   * 记录信息日志
   */
  logInfo(message: string, fields?: Tags): void {
    if (!this.config.logging.enabled) return
    this.logger.info(message, fields)
  }

  /**
   * 记录警告日志
   */
  logWarn(message: string, fields?: Tags): void {
    if (!this.config.logging.enabled) return
    this.logger.warn(message, fields)
  }

  /**
   * 记录错误日志
   */
  logError(message: string, error?: Error | Tags, fields?: Tags): void {
    if (!this.config.logging.enabled) return
    this.logger.error(message, error, fields)
  }

  /**
   * 设置日志追踪上下文
   */
  setLogTraceContext(traceId: string, spanId?: string): void {
    this.logger.setTraceContext(traceId, spanId)
  }

  /**
   * 清除日志追踪上下文
   */
  clearLogTraceContext(): void {
    this.logger.clearTraceContext()
  }

  /**
   * 查询日志
   */
  queryLogs(filter: LogFilter) {
    return this.logger.query(filter)
  }

  // ============================================
  // Dashboard API
  // ============================================

  /**
   * 获取仪表板数据
   */
  async getDashboardMetrics(timeRange: TimeRange): Promise<DashboardData> {
    const dashboards = this.dashboardManager.listDashboards()
    const defaultDashboard = dashboards[0]
    
    if (!defaultDashboard) {
      return {
        dashboardId: 'default',
        timeRange,
        generatedAt: Date.now(),
        widgets: [],
      }
    }

    return (await this.dashboardManager.getDashboardData(defaultDashboard.id, timeRange))!
  }

  /**
   * 创建仪表板
   */
  createDashboard(dashboard: Omit<Dashboard, 'createdAt' | 'updatedAt'>): Dashboard {
    return this.dashboardManager.createDashboard(dashboard)
  }

  /**
   * 获取仪表板
   */
  getDashboard(id: string): Dashboard | undefined {
    return this.dashboardManager.getDashboard(id)
  }

  /**
   * 获取所有仪表板
   */
  listDashboards(): Dashboard[] {
    return this.dashboardManager.listDashboards()
  }

  /**
   * 创建告警规则
   */
  createAlertRule(rule: AlertRule): AlertRule {
    return this.dashboardManager.createAlertRule(rule)
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): AlertInstance[] {
    return this.dashboardManager.getActiveAlerts()
  }

  /**
   * 评估告警
   */
  evaluateAlerts(): AlertInstance[] {
    return this.dashboardManager.evaluateAlerts()
  }

  // ============================================
  // Convenience Methods
  // ============================================

  /**
   * 创建一个完整的追踪上下文
   * 返回 traceId 和一个辅助对象
   */
  createTraceContext(name: string, attributes?: Tags): {
    traceId: TraceId
    endTrace: () => void
    startSpan: (spanName: string, spanAttrs?: Tags) => Span | undefined
    endSpan: (span: Span | string) => void
    setLoggerContext: () => void
    clearLoggerContext: () => void
  } {
    const traceId = this.startTrace(name, { attributes })
    
    return {
      traceId,
      endTrace: () => this.endTrace(traceId),
      startSpan: (spanName: string, spanAttrs?: Tags) => this.startSpan(spanName, { attributes: spanAttrs }),
      endSpan: (span: Span | string) => this.endSpan(span),
      setLoggerContext: () => {
        const ctx = this.traceManager.getContext()
        if (ctx) {
          this.setLogTraceContext(ctx.traceId, ctx.spanId)
        }
      },
      clearLoggerContext: () => this.clearLogTraceContext(),
    }
  }

  /**
   * 包装一个异步函数，自动处理追踪和日志
   */
  async traceFunction<T>(
    name: string,
    fn: (traceId: TraceId) => Promise<T>,
    options?: {
      attributes?: Tags
      logLevel?: 'debug' | 'info' | 'warn' | 'error'
    }
  ): Promise<T> {
    const traceId = this.startTrace(name, { attributes: options?.attributes })
    
    // 设置日志上下文
    this.setLogTraceContext(traceId)
    
    const startTime = Date.now()
    
    try {
      this.logInfo(`${name} started`, { traceId })
      
      const result = await fn(traceId)
      
      const duration = Date.now() - startTime
      this.logInfo(`${name} completed`, { traceId, duration })
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.logError(`${name} failed`, error instanceof Error ? error : { error: String(error) }, { traceId, duration })
      throw error
    } finally {
      this.endTrace(traceId)
      this.clearLogTraceContext()
    }
  }

  // ============================================
  // Status & Lifecycle
  // ============================================

  /**
   * 获取状态
   */
  getStatus(): ObservabilityStatus {
    const metricStats = this.metricCollector.getStats()
    const traceStats = this.traceManager.getStats()
    const logStats = this.logger.getStats()

    return {
      metrics: {
        enabled: this.config.metrics.enabled,
        registeredCount: metricStats.registeredCount,
        collectedCount: metricStats.collectedCount,
      },
      tracing: {
        enabled: this.config.tracing.enabled,
        activeTraces: traceStats.activeTraces,
        activeSpans: traceStats.activeSpans,
      },
      logging: {
        enabled: this.config.logging.enabled,
        entriesCount: logStats.entriesCount,
      },
      dashboard: {
        enabled: this.config.dashboard.enabled,
        dashboardsCount: this.dashboardManager.listDashboards().length,
      },
      alerts: {
        enabled: this.config.alerts.enabled,
        rulesCount: this.dashboardManager.listAlertRules().length,
        activeAlerts: this.dashboardManager.getActiveAlerts().length,
      },
    }
  }

  /**
   * 启动自动刷新
   */
  start(): void {
    this.dashboardManager.startAutoRefresh()
  }

  /**
   * 停止自动刷新
   */
  stop(): void {
    this.dashboardManager.stopAutoRefresh()
  }

  /**
   * 清理所有数据
   */
  clear(): void {
    this.metricCollector.clear()
    this.traceManager.clear()
    this.logger.clear()
    this.dashboardManager.clear()
  }
}

// ============================================
// Singleton
// ============================================

let defaultHub: ObservabilityHub | undefined

export function getObservabilityHub(): ObservabilityHub {
  if (!defaultHub) {
    throw new Error('ObservabilityHub not initialized. Call initObservabilityHub first.')
  }
  return defaultHub
}

export function initObservabilityHub(config: ObservabilityConfig): ObservabilityHub {
  defaultHub = new ObservabilityHub(config)
  return defaultHub
}

// ============================================
// Quick Access
// ============================================

/**
 * 快速记录指标
 */
export function recordMetric(name: string, value: number, tags?: Tags): void {
  getObservabilityHub().recordMetric(name, value, tags)
}

/**
 * 快速开始追踪
 */
export function startSpan(name: string, context?: SpanContext): Span | undefined {
  return getObservabilityHub().startSpan(name)
}

/**
 * 快速查询追踪
 */
export async function queryTraces(filter: TraceFilter): Promise<ReturnType<TraceManager['queryTraces']>> {
  return getObservabilityHub().queryTraces(filter)
}

/**
 * 快速获取仪表板数据
 */
export async function getDashboardMetrics(timeRange: TimeRange): Promise<DashboardData> {
  return getObservabilityHub().getDashboardMetrics(timeRange)
}
