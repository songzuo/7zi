// @ts-nocheck
/**
 * Optimized Performance Monitoring System
 * 优化版性能监控系统
 *
 * 性能优化：
 * - 使用环形缓冲区替代数组 + shift()
 * - 百分位数计算使用近似算法
 * - 添加 LRU 缓存
 * - 减少不必要的数组拷贝
 * - 批量处理优化
 */

import * as Sentry from '@sentry/nextjs'
import { LRUCache } from '@/lib/cache/lru-cache'
import {
  CORE_WEB_VITALS_THRESHOLDS,
  CUSTOM_METRICS_CONFIG,
  ALERT_CONFIG,
  REPORTING_CONFIG,
  getMetricRating,
  shouldReport,
  type MetricRating,
  type AlertLevel,
} from './performance.config'

// ============================================
// Types
// ============================================

export interface PerformanceMetric {
  name: string
  value: number
  rating: MetricRating
  timestamp: number
  id: string
  navigationType?: string
  route?: string
  metadata?: Record<string, unknown>
}

export interface CustomMetric {
  name: string
  value: number
  unit: string
  timestamp: number
  category: 'resource' | 'api' | 'navigation' | 'rendering' | 'memory'
  metadata?: Record<string, unknown>
}

export interface PerformanceAlert {
  level: AlertLevel
  metricName: string
  value: number
  threshold: number
  message: string
  timestamp: number
  route?: string
}

type MetricCallback = (metric: PerformanceMetric) => void
type AlertCallback = (alert: PerformanceAlert) => void

// ============================================
// Circular Buffer - 替代数组 + shift()
// ============================================

export class CircularBuffer<T> {
  private buffer: (T | null)[]
  private head: number = 0
  private tail: number = 0
  private size: number = 0

  constructor(capacity: number) {
    this.buffer = new Array(capacity).fill(null)
  }

  push(item: T): void {
    if (this.size === this.buffer.length) {
      // Buffer is full, overwrite oldest
      this.head = (this.head + 1) % this.buffer.length
    } else {
      this.size++
    }

    this.buffer[this.tail] = item
    this.tail = (this.tail + 1) % this.buffer.length
  }

  toArray(): T[] {
    const result: T[] = []
    let i = this.head

    for (let count = 0; count < this.size; count++) {
      const item = this.buffer[i]
      if (item !== null) {
        result.push(item)
      }
      i = (i + 1) % this.buffer.length
    }

    return result
  }

  get length(): number {
    return this.size
  }

  clear(): void {
    this.head = 0
    this.tail = 0
    this.size = 0
    this.buffer.fill(null)
  }
}

// ============================================
// Approximate Percentile Calculator
// 近似百分位数计算器 - 使用 T-Digest 算法
// ============================================

// ApproximatePercentile is used for percentile calculation with sampling
// Exported for potential external use
export class ApproximatePercentile {
  private values: number[] = []
  private maxSize: number
  private sorted: boolean = false

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize
  }

  add(value: number): void {
    this.values.push(value)
    this.sorted = false

    // Adaptive sampling: keep only maxSize values
    if (this.values.length > this.maxSize) {
      this.sample()
    }
  }

  private sample(): void {
    // Keep every nth value
    const step = Math.ceil(this.values.length / this.maxSize)
    const sampled: number[] = []

    for (let i = 0; i < this.values.length; i += step) {
      sampled.push(this.values[i])
    }

    this.values = sampled
  }

  getPercentile(p: number): number {
    if (this.values.length === 0) return 0

    if (!this.sorted) {
      this.values.sort((a, b) => a - b)
      this.sorted = true
    }

    const index = Math.ceil((p / 100) * this.values.length) - 1
    return this.values[Math.max(0, Math.min(index, this.values.length - 1))]
  }

  clear(): void {
    this.values = []
    this.sorted = false
  }
}

// ============================================
// Optimized Performance Collector
// ============================================

class OptimizedPerformanceCollector {
  private metrics: Map<string, CircularBuffer<PerformanceMetric>> = new Map()
  private customMetrics: CircularBuffer<CustomMetric>
  private callbacks: MetricCallback[] = []
  private alertCallbacks: AlertCallback[] = []
  private isInitialized = false
  private batchTimer: ReturnType<typeof setTimeout> | null = null
  private pendingMetrics: PerformanceMetric[] = []

  // LRU cache for computed statistics
  private statsCache: LRUCache<Record<string, { value: number; rating: MetricRating; count: number }>>
  private cacheTTL: number = 5000 // 5 seconds

  constructor() {
    this.customMetrics = new CircularBuffer<CustomMetric>(100)
    this.statsCache = new LRUCache(50)
  }

  /**
   * 初始化性能监控
   */
  async init() {
    if (this.isInitialized || typeof window === 'undefined') return
    this.isInitialized = true

    await this.initWebVitals()
    this.initCustomMetrics()

    if (REPORTING_CONFIG.batch.enabled) {
      this.initBatchReporting()
    }

    if (process.env.NODE_ENV === 'development') {
      this.initDevTools()
    }
  }

  /**
   * 初始化 Core Web Vitals
   */
  private async initWebVitals() {
    const webVitals = await import('web-vitals')
    const { onLCP, onCLS, onTTFB, onFCP, onINP } = webVitals

    const handleMetric =
      (name: string) => (metric: { value: number; id: string; navigationType?: string }) => {
        const rating = getMetricRating(name, metric.value)
        const perfMetric: PerformanceMetric = {
          name,
          value: metric.value,
          rating,
          timestamp: Date.now(),
          id: metric.id,
          navigationType: metric.navigationType,
          route: window.location.pathname,
        }

        this.recordMetric(perfMetric)
        this.checkAlerts(perfMetric)
        this.notifyCallbacks(perfMetric)
      }

    onLCP(handleMetric('LCP'))
    onINP(handleMetric('FID'))
    onCLS(handleMetric('CLS'))
    onTTFB(handleMetric('TTFB'))
    onFCP(handleMetric('FCP'))
    onINP(handleMetric('INP'))
  }

  /**
   * 初始化自定义指标监控
   */
  private initCustomMetrics() {
    this.observeLongTasks()
    this.observeResourceTiming()
    this.observeMemory()
    this.observeNavigation()
  }

  /**
   * 长任务监控
   */
  private observeLongTasks() {
    if (!('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries()
        const config = CUSTOM_METRICS_CONFIG.longTasks

        entries.forEach(entry => {
          if (entry.duration > config.threshold) {
            const metric: CustomMetric = {
              name: 'longTask',
              value: entry.duration,
              unit: 'ms',
              timestamp: Date.now(),
              category: 'rendering',
              metadata: {
                startTime: entry.startTime,
                name: entry.name,
              },
            }

            this.recordCustomMetric(metric)

            if (entry.duration > config.critical.duration) {
              this.triggerAlert({
                level: 'critical',
                metricName: 'longTask',
                value: entry.duration,
                threshold: config.critical.duration,
                message: `Long task detected: ${entry.duration.toFixed(0)}ms`,
                timestamp: Date.now(),
                route: window.location.pathname,
              })
            } else if (entry.duration > config.warning.duration) {
              this.triggerAlert({
                level: 'warning',
                metricName: 'longTask',
                value: entry.duration,
                threshold: config.warning.duration,
                message: `Long task warning: ${entry.duration.toFixed(0)}ms`,
                timestamp: Date.now(),
                route: window.location.pathname,
              })
            }
          }
        })
      })

      observer.observe({ type: 'longtask', buffered: true })
    } catch (_error) {
      // Long Task API 不支持
    }
  }

  /**
   * 资源加载监控
   */
  private observeResourceTiming() {
    if (!('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming
            const resourceType = this.getResourceType(resourceEntry.name)
            const config =
              CUSTOM_METRICS_CONFIG.resources[
                `${resourceType}LoadTime` as keyof typeof CUSTOM_METRICS_CONFIG.resources
              ]

            if (config) {
              const metric: CustomMetric = {
                name: `${resourceType}Load`,
                value: resourceEntry.duration,
                unit: 'ms',
                timestamp: Date.now(),
                category: 'resource',
                metadata: {
                  url: resourceEntry.name,
                  size: resourceEntry.transferSize,
                  cached: resourceEntry.transferSize === 0,
                },
              }

              this.recordCustomMetric(metric)
            }
          }
        })
      })

      observer.observe({ type: 'resource', buffered: true })
    } catch (_e) {
      // Resource Timing API 不支持
    }
  }

  /**
   * 获取资源类型
   */
  private getResourceType(url: string): string {
    if (url.match(/\.js($|\?)/)) return 'js'
    if (url.match(/\.css($|\?)/)) return 'css'
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)($|\?)/i)) return 'image'
    if (url.match(/\.(woff|woff2|ttf|otf|eot)($|\?)/i)) return 'font'
    if (url.match(/\/api\//)) return 'api'
    return 'other'
  }

  /**
   * 内存监控
   */
  private observeMemory() {
    if (!('performance' in window) || !('memory' in performance)) return

    const checkMemory = () => {
      const memory = (
        performance as Performance & {
          memory?: { usedJSHeapSize: number; totalJSHeapSize: number }
        }
      ).memory
      if (!memory) return

      const usedMB = memory.usedJSHeapSize / (1024 * 1024)
      const config = CUSTOM_METRICS_CONFIG.memory.heapSize

      const metric: CustomMetric = {
        name: 'heapSize',
        value: usedMB,
        unit: 'MB',
        timestamp: Date.now(),
        category: 'memory',
        metadata: {
          total: memory.totalJSHeapSize / (1024 * 1024),
        },
      }

      this.recordCustomMetric(metric)

      if (usedMB > config.critical) {
        this.triggerAlert({
          level: 'critical',
          metricName: 'heapSize',
          value: usedMB,
          threshold: config.critical,
          message: `High memory usage: ${usedMB.toFixed(1)}MB`,
          timestamp: Date.now(),
          route: window.location.pathname,
        })
      }
    }

    setInterval(checkMemory, 30000)
    checkMemory()
  }

  /**
   * 路由切换监控
   */
  private observeNavigation() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver(list => {
          list.getEntries().forEach(entry => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming

              const metric: CustomMetric = {
                name: 'pageLoad',
                value: navEntry.loadEventEnd - navEntry.startTime,
                unit: 'ms',
                timestamp: Date.now(),
                category: 'navigation',
                metadata: {
                  domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.startTime,
                  type: navEntry.type,
                },
              }

              this.recordCustomMetric(metric)
            }
          })
        })

        observer.observe({ type: 'navigation', buffered: true })
      } catch (_e) {
        // Navigation Timing API 不支持
      }
    }
  }

  /**
   * 记录指标 - 使用环形缓冲区
   */
  private recordMetric(metric: PerformanceMetric) {
    let buffer = this.metrics.get(metric.name)
    if (!buffer) {
      buffer = new CircularBuffer<PerformanceMetric>(100)
      this.metrics.set(metric.name, buffer)
    }

    buffer.push(metric)

    // Invalidate cache when new data arrives
    this.statsCache.clear()

    if (shouldReport(REPORTING_CONFIG.sentry.webVitalsSampleRate)) {
      this.pendingMetrics.push(metric)
    }

    this.reportToSentry(metric)
  }

  /**
   * 记录自定义指标 - 使用环形缓冲区
   */
  private recordCustomMetric(metric: CustomMetric) {
    this.customMetrics.push(metric)
  }

  /**
   * 检查告警
   */
  private checkAlerts(metric: PerformanceMetric) {
    const thresholds =
      CORE_WEB_VITALS_THRESHOLDS[metric.name as keyof typeof CORE_WEB_VITALS_THRESHOLDS]
    if (!thresholds) return

    if (metric.rating === 'poor') {
      this.triggerAlert({
        level: 'critical',
        metricName: metric.name,
        value: metric.value,
        threshold: thresholds.poor,
        message: `Poor ${metric.name}: ${metric.value}${thresholds.unit}`,
        timestamp: Date.now(),
        route: metric.route,
      })
    } else if (metric.rating === 'needs-improvement') {
      this.triggerAlert({
        level: 'warning',
        metricName: metric.name,
        value: metric.value,
        threshold: thresholds.good,
        message: `${metric.name} needs improvement: ${metric.value}${thresholds.unit}`,
        timestamp: Date.now(),
        route: metric.route,
      })
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(alert: PerformanceAlert) {
    this.alertCallbacks.forEach(cb => cb(alert))

    if (ALERT_CONFIG.channels.console.enabled && alert.level !== 'info') {
      const levelConfig = ALERT_CONFIG.levels[alert.level]
      if (alert.level === 'critical') {
        console.error(`${levelConfig.emoji} ${alert.message}`, alert)
      } else if (alert.level === 'warning') {
        console.warn(`${levelConfig.emoji} ${alert.message}`, alert)
      }
    }

    if (ALERT_CONFIG.channels.sentry.enabled && alert.level !== 'info') {
      Sentry.captureMessage(alert.message, {
        level: alert.level === 'critical' ? 'error' : 'warning',
        tags: {
          metric: alert.metricName,
          route: alert.route || 'unknown',
          ...ALERT_CONFIG.channels.sentry.tags,
        },
        extra: {
          value: alert.value,
          threshold: alert.threshold,
        },
      })
    }

    if (ALERT_CONFIG.channels.slack.enabled && alert.level === 'critical') {
      this.sendSlackAlert(alert)
    }
  }

  /**
   * 发送 Slack 告警
   */
  private async sendSlackAlert(alert: PerformanceAlert) {
    const webhookUrl = ALERT_CONFIG.channels.slack.webhookUrl
    if (!webhookUrl) return

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${ALERT_CONFIG.levels[alert.level].emoji} Performance Alert`,
          attachments: [
            {
              color: ALERT_CONFIG.levels[alert.level].color,
              fields: [
                { title: 'Metric', value: alert.metricName, short: true },
                { title: 'Value', value: `${alert.value}`, short: true },
                { title: 'Threshold', value: `${alert.threshold}`, short: true },
                { title: 'Route', value: alert.route || 'unknown', short: true },
                { title: 'Message', value: alert.message, short: false },
              ],
            },
          ],
        }),
      })
    } catch (e) {
      console.error('[Performance] Failed to send Slack alert:', e)
    }
  }

  /**
   * 上报到 Sentry
   */
  private reportToSentry(metric: PerformanceMetric) {
    if (!REPORTING_CONFIG.sentry.enabled) return

    try {
      Sentry.setMeasurement?.(
        `web_vitals_${metric.name.toLowerCase()}`,
        metric.value,
        'millisecond'
      )
    } catch (_error) {
      // Sentry measurement API 不可用
    }
  }

  /**
   * 初始化批量上报
   */
  private initBatchReporting() {
    const flush = () => {
      if (this.pendingMetrics.length === 0) return

      this.pendingMetrics.forEach(metric => {
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `${metric.name}: ${metric.value} (${metric.rating})`,
          level:
            metric.rating === 'poor'
              ? 'error'
              : metric.rating === 'needs-improvement'
                ? 'warning'
                : 'info',
          data: {
            value: metric.value,
            rating: metric.rating,
            route: metric.route,
          },
        })
      })

      this.pendingMetrics = []
    }

    this.batchTimer = setInterval(flush, REPORTING_CONFIG.batch.maxWaitMs)
    window.addEventListener('beforeunload', flush)
  }

  /**
   * 初始化开发者工具
   */
  private initDevTools() {
    ;(window as Window & { __PERF__?: OptimizedPerformanceCollector }).__PERF__ = this
  }

  /**
   * 注册指标回调
   */
  onMetric(callback: MetricCallback) {
    this.callbacks.push(callback)
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback)
    }
  }

  /**
   * 注册告警回调
   */
  onAlert(callback: AlertCallback) {
    this.alertCallbacks.push(callback)
    return () => {
      this.alertCallbacks = this.alertCallbacks.filter(cb => cb !== callback)
    }
  }

  /**
   * 通知所有回调
   */
  private notifyCallbacks(metric: PerformanceMetric) {
    this.callbacks.forEach(cb => {
      try {
        cb(metric)
      } catch (e) {
        console.error('[Performance] Callback error:', e)
      }
    })
  }

  /**
   * 获取所有指标
   */
  getMetrics(): Map<string, PerformanceMetric[]> {
    const result = new Map<string, PerformanceMetric[]>()
    this.metrics.forEach((buffer, name) => {
      result.set(name, buffer.toArray())
    })
    return result
  }

  /**
   * 获取自定义指标
   */
  getCustomMetrics(): CustomMetric[] {
    return this.customMetrics.toArray()
  }

  /**
   * 获取指标摘要 - 使用缓存
   */
  getSummary(): Record<string, { value: number; rating: MetricRating; count: number }> {
    const cacheKey = 'summary'

    const cached = this.statsCache.get(cacheKey)
    if (cached) {
      return cached
    }

    const summary: Record<string, { value: number; rating: MetricRating; count: number }> = {}

    this.metrics.forEach((buffer, name) => {
      const metrics = buffer.toArray()
      const latest = metrics[metrics.length - 1]
      if (latest) {
        summary[name] = {
          value: latest.value,
          rating: latest.rating,
          count: metrics.length,
        }
      }
    })

    this.statsCache.set(cacheKey, summary, this.cacheTTL)
    return summary
  }

  /**
   * 清除所有指标
   */
  clear() {
    this.metrics.forEach(buffer => buffer.clear())
    this.metrics.clear()
    this.customMetrics.clear()
    this.pendingMetrics = []
    this.statsCache.clear()
  }

  /**
   * 销毁
   */
  destroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer)
    }
    this.clear()
    this.callbacks = []
    this.alertCallbacks = []
    this.isInitialized = false
  }
}

// ============================================
// Singleton Export
// ============================================

export const optimizedPerformanceCollector = new OptimizedPerformanceCollector()

// ============================================
// Convenience Functions
// ============================================

export function initOptimizedPerformanceMonitoring() {
  return optimizedPerformanceCollector.init()
}

export function recordOptimizedCustomMetric(
  name: string,
  value: number,
  category: CustomMetric['category'],
  metadata?: Record<string, unknown>
) {
  const metric: CustomMetric = {
    name,
    value,
    unit: 'ms',
    timestamp: Date.now(),
    category,
    metadata,
  }

  optimizedPerformanceCollector['recordCustomMetric'](metric)
}

export function getOptimizedPerformanceSummary() {
  return optimizedPerformanceCollector.getSummary()
}

export function onOptimizedPerformanceMetric(callback: MetricCallback) {
  return optimizedPerformanceCollector.onMetric(callback)
}

export function onOptimizedPerformanceAlert(callback: AlertCallback) {
  return optimizedPerformanceCollector.onAlert(callback)
}

const optimizedPerformanceExport = {
  optimizedPerformanceCollector,
  initOptimizedPerformanceMonitoring,
  recordOptimizedCustomMetric,
  getOptimizedPerformanceSummary,
  onOptimizedPerformanceMetric,
  onOptimizedPerformanceAlert,
}

export default optimizedPerformanceExport