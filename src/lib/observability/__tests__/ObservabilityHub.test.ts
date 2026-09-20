/**
 * Observability Hub Tests
 * 
 * @version v1.11.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  ObservabilityHub,
  ObservabilityConfig,
  MetricType,
  LogLevel,
  SpanKind,
  SpanStatusCode,
  WidgetType,
  AlertSeverity,
  TimeRange,
} from '../index'

describe('ObservabilityHub', () => {
  let hub: ObservabilityHub

  beforeEach(() => {
    hub = new ObservabilityHub({
      serviceName: 'test-service',
      environment: 'test',
      metrics: { enabled: true },
      tracing: { enabled: true },
      logging: { enabled: true },
      dashboard: { enabled: true },
      alerts: { enabled: true },
    })
  })

  afterEach(() => {
    hub.clear()
  })

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(hub).toBeDefined()
      const status = hub.getStatus()
      expect(status.metrics.enabled).toBe(true)
      expect(status.tracing.enabled).toBe(true)
      expect(status.logging.enabled).toBe(true)
      expect(status.dashboard.enabled).toBe(true)
      expect(status.alerts.enabled).toBe(true)
    })

    it('should create default dashboards', () => {
      const dashboards = hub.listDashboards()
      expect(dashboards.length).toBeGreaterThan(0)
      expect(dashboards[0].id).toBe('system-overview')
    })

    it('should create default alert rules', () => {
      const status = hub.getStatus()
      expect(status.alerts.rulesCount).toBeGreaterThan(0)
    })
  })

  describe('Metrics', () => {
    it('should record metric values', () => {
      hub.recordMetric('test_metric', 42, { tag: 'value' })
      const metrics = hub.queryMetrics({ names: ['test_metric'] })
      expect(metrics.length).toBe(1)
      expect(metrics[0].name).toBe('test_metric')
    })

    it('should increment counter', () => {
      hub.incrementCounter('test_counter', 1)
      hub.incrementCounter('test_counter', 2)
      const metrics = hub.queryMetrics({ names: ['test_counter'] })
      expect(metrics.length).toBe(1)
      expect(metrics[0].sum).toBe(3)
    })

    it('should set gauge value', () => {
      hub.setGauge('test_gauge', 10)
      hub.setGauge('test_gauge', 20)
      const metrics = hub.queryMetrics({ names: ['test_gauge'] })
      expect(metrics.length).toBe(1)
      expect(metrics[0].max).toBe(20)
    })

    it('should observe histogram values', () => {
      hub.observeHistogram('test_histogram', 10)
      hub.observeHistogram('test_histogram', 20)
      hub.observeHistogram('test_histogram', 30)
      const metrics = hub.queryMetrics({ names: ['test_histogram'] })
      expect(metrics.length).toBe(1)
      expect(metrics[0].count).toBe(3)
      expect(metrics[0].avg).toBe(20)
    })

    it('should use timer', () => {
      const timer = hub.startTimer('test_timer')
      // Simulate some work
      const duration = timer()
      expect(duration).toBeGreaterThanOrEqual(0)
      const metrics = hub.queryMetrics({ names: ['test_timer'] })
      expect(metrics.length).toBe(1)
    })

    it('should export Prometheus format', () => {
      hub.recordMetric('test_metric', 42)
      const prometheus = hub.exportPrometheus()
      expect(prometheus).toContain('# HELP')
      expect(prometheus).toContain('# TYPE')
      expect(prometheus).toContain('test_metric')
    })
  })

  describe('Tracing', () => {
    it('should start and end trace', () => {
      const traceId = hub.startTrace('test-trace')
      expect(traceId).toBeDefined()
      hub.endTrace(traceId)
      const traces = hub.queryTraces({ traceId })
      expect(traces.length).toBe(1)
    })

    it('should create nested spans', () => {
      const traceId = hub.startTrace('test-trace')
      const span1 = hub.startSpan('span-1')
      expect(span1).toBeDefined()
      const span2 = hub.startSpan('span-2')
      expect(span2).toBeDefined()
      expect(span2?.parentSpanId).toBe(span1?.spanId)
      hub.endSpan(span2!)
      hub.endSpan(span1!)
      hub.endTrace(traceId)
      const traces = hub.queryTraces({ traceId })
      expect(traces[0].spanCount).toBe(3) // root + 2 spans
    })

    it('should use withSpan for async functions', async () => {
      const traceId = hub.startTrace('test-trace')
      const result = await hub.withSpan('async-span', async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'success'
      })
      expect(result).toBe('success')
      hub.endTrace(traceId)
      const traces = hub.queryTraces({ traceId })
      expect(traces[0].spanCount).toBe(2) // root + 1 span
    })

    it('should handle errors in withSpan', async () => {
      const traceId = hub.startTrace('test-trace')
      await expect(
        hub.withSpan('async-span', async () => {
          throw new Error('Test error')
        })
      ).rejects.toThrow('Test error')
      hub.endTrace(traceId)
      const traces = hub.queryTraces({ traceId })
      expect(traces[0].hasErrors).toBe(true)
    })

    it('should inject and extract trace context', () => {
      const traceId = hub.startTrace('test-trace')
      const headers: Record<string, string> = {}
      hub.injectTraceContext(headers, 'w3c')
      expect(headers['traceparent']).toBeDefined()
      
      const context = hub.extractTraceContext(headers)
      expect(context?.traceId).toBe(traceId)
      hub.endTrace(traceId)
    })

    it('should query traces with filters', () => {
      hub.startTrace('fast-trace')
      hub.endTrace()
      
      hub.startTrace('slow-trace')
      const span = hub.startSpan('slow-operation')
      hub.endSpan(span!)
      hub.endTrace()
      
      const slowTraces = hub.queryTraces({ minDuration: 0 })
      expect(slowTraces.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Logging', () => {
    it('should log info messages', () => {
      hub.logInfo('Test message', { key: 'value' })
      const logs = hub.queryLogs({ levels: [LogLevel.INFO] })
      expect(logs.length).toBe(1)
      expect(logs[0].message).toBe('Test message')
      expect(logs[0].fields?.key).toBe('value')
    })

    it('should log error messages', () => {
      const error = new Error('Test error')
      hub.logError('Error occurred', error, { context: 'test' })
      const logs = hub.queryLogs({ levels: [LogLevel.ERROR] })
      expect(logs.length).toBe(1)
      expect(logs[0].error?.message).toBe('Test error')
    })

    it('should set and clear trace context', () => {
      hub.setLogTraceContext('trace-123', 'span-456')
      hub.logInfo('Test message')
      const logs = hub.queryLogs({})
      expect(logs[0].trace?.traceId).toBe('trace-123')
      expect(logs[0].trace?.spanId).toBe('span-456')
      
      hub.clearLogTraceContext()
      hub.logInfo('Another message')
      const logs2 = hub.queryLogs({})
      expect(logs2[logs2.length - 1].trace).toBeUndefined()
    })

    it('should query logs with filters', () => {
      hub.logInfo('Info message')
      hub.logWarn('Warning message')
      hub.logError('Error message')
      
      const errorLogs = hub.queryLogs({ levels: [LogLevel.ERROR] })
      expect(errorLogs.length).toBe(1)
      
      const infoLogs = hub.queryLogs({ levels: [LogLevel.INFO] })
      expect(infoLogs.length).toBe(1)
    })
  })

  describe('Dashboard', () => {
    it('should get dashboard metrics', async () => {
      hub.recordMetric('test_metric', 42)
      const timeRange: TimeRange = {
        start: Date.now() - 3600000,
        end: Date.now(),
      }
      const dashboardData = await hub.getDashboardMetrics(timeRange)
      expect(dashboardData).toBeDefined()
      expect(dashboardData.dashboardId).toBe('system-overview')
      expect(dashboardData.widgets.length).toBeGreaterThan(0)
    })

    it('should create custom dashboard', () => {
      const dashboard = hub.createDashboard({
        id: 'custom-dashboard',
        name: 'Custom Dashboard',
        widgets: [
          {
            id: 'test-widget',
            type: WidgetType.STAT,
            title: 'Test Widget',
            width: 3,
            height: 2,
            x: 0,
            y: 0,
            config: {},
            dataSource: {
              type: 'metric',
              query: { names: ['test_metric'] },
            },
          },
        ],
      })
      expect(dashboard.id).toBe('custom-dashboard')
      expect(dashboard.widgets.length).toBe(1)
    })

    it('should get dashboard by id', () => {
      const dashboard = hub.getDashboard('system-overview')
      expect(dashboard).toBeDefined()
      expect(dashboard?.id).toBe('system-overview')
    })

    it('should list all dashboards', () => {
      const dashboards = hub.listDashboards()
      expect(dashboards.length).toBeGreaterThan(0)
    })
  })

  describe('Alerts', () => {
    it('should create alert rule', () => {
      const rule = hub.createAlertRule({
        id: 'test-alert',
        name: 'Test Alert',
        severity: AlertSeverity.WARNING,
        enabled: true,
        condition: {
          type: 'metric',
          query: { names: ['test_metric'] },
          operator: 'gt',
          threshold: 100,
        },
      })
      expect(rule.id).toBe('test-alert')
    })

    it('should evaluate alerts', () => {
      hub.recordMetric('test_metric', 150)
      const alerts = hub.evaluateAlerts()
      expect(Array.isArray(alerts)).toBe(true)
    })

    it('should get active alerts', () => {
      const alerts = hub.getActiveAlerts()
      expect(Array.isArray(alerts)).toBe(true)
    })
  })

  describe('Convenience Methods', () => {
    it('should trace function with automatic logging', async () => {
      const result = await hub.traceFunction('test-operation', async (traceId) => {
        expect(traceId).toBeDefined()
        return 'result'
      })
      expect(result).toBe('result')
    })

    it('should handle errors in traceFunction', async () => {
      await expect(
        hub.traceFunction('test-operation', async () => {
          throw new Error('Test error')
        })
      ).rejects.toThrow('Test error')
    })

    it('should create trace context', () => {
      const ctx = hub.createTraceContext('test-trace', { userId: '123' })
      expect(ctx.traceId).toBeDefined()
      expect(ctx.startSpan).toBeDefined()
      expect(ctx.endSpan).toBeDefined()
      expect(ctx.endTrace).toBeDefined()
      
      const span = ctx.startSpan('test-span')
      expect(span).toBeDefined()
      ctx.endSpan(span!)
      ctx.endTrace()
    })
  })

  describe('Status', () => {
    it('should get status', () => {
      hub.recordMetric('test_metric', 42)
      hub.startTrace('test-trace')
      hub.logInfo('Test message')
      
      const status = hub.getStatus()
      expect(status.metrics.registeredCount).toBeGreaterThan(0)
      expect(status.tracing.activeTraces).toBeGreaterThan(0)
      expect(status.logging.entriesCount).toBeGreaterThan(0)
      expect(status.dashboard.dashboardsCount).toBeGreaterThan(0)
      expect(status.alerts.rulesCount).toBeGreaterThan(0)
    })
  })

  describe('Lifecycle', () => {
    it('should start and stop auto refresh', () => {
      expect(() => hub.start()).not.toThrow()
      expect(() => hub.stop()).not.toThrow()
    })

    it('should clear all data', () => {
      hub.recordMetric('test_metric', 42)
      hub.startTrace('test-trace')
      hub.logInfo('Test message')
      
      hub.clear()
      
      const status = hub.getStatus()
      expect(status.metrics.collectedCount).toBe(0)
      expect(status.tracing.activeTraces).toBe(0)
      expect(status.logging.entriesCount).toBe(0)
    })
  })
})

describe('Singleton Pattern', () => {
  it('should initialize and get hub instance', () => {
    const hub1 = new ObservabilityHub({ serviceName: 'singleton-test' })
    expect(hub1).toBeDefined()
    hub1.clear()
  })
})