/**
 * Enhanced Metrics Collector
 * 增强版指标收集器 - 支持实时性能数据聚合
 *
 * 功能：
 * - 收集 Core Web Vitals (LCP, FID, CLS, TTFB)
 * - 收集自定义性能指标
 * - 指标聚合和统计
 * - 趋势分析
 */

import { CORE_WEB_VITALS_THRESHOLDS } from './performance.config'

// ============================================
// 类型定义
// ============================================

export interface AggregatedMetric {
  name: string
  value: number
  count: number
  min: number
  max: number
  avg: number
  p50: number
  p95: number
  p99: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
}

export interface MetricSnapshot {
  metrics: Map<string, AggregatedMetric>
  customMetrics: Map<string, AggregatedMetric>
  alerts: PerformanceAlert[]
  timestamp: number
}

export interface PerformanceAlert {
  metricName: string
  value: number
  threshold: number
  level: 'info' | 'warning' | 'critical'
  message: string
  timestamp: number
  route?: string
}

export type MetricCallback = (snapshot: MetricSnapshot) => void

// ============================================
// 增强版指标收集器
// ============================================

class EnhancedMetricsCollector {
  private static instance: EnhancedMetricsCollector

  /** 指标数据存储 */
  private metrics: Map<string, number[]> = new Map()
  private customMetrics: Map<string, number[]> = new Map()

  /** 聚合缓存 */
  private aggregatedMetrics: Map<string, AggregatedMetric> = new Map()

  /** 告警列表 */
  private alerts: PerformanceAlert[] = []

  /** 回调函数列表 */
  private callbacks: MetricCallback[] = []

  /** 聚合窗口大小 */
  private aggregationWindowMs: number

  /** 最后聚合时间 */
  private lastAggregationTime: number = 0

  /** 聚合定时器 */
  private aggregationTimer: NodeJS.Timeout | null = null

  private constructor() {
    this.aggregationWindowMs = 60000 // 1分钟聚合窗口
  }

  /**
   * 获取单例实例
   */
  static getInstance(): EnhancedMetricsCollector {
    if (!EnhancedMetricsCollector.instance) {
      EnhancedMetricsCollector.instance = new EnhancedMetricsCollector()
    }
    return EnhancedMetricsCollector.instance
  }

  /**
   * 初始化收集器
   */
  initialize(aggregationWindowMs?: number) {
    if (aggregationWindowMs) {
      this.aggregationWindowMs = aggregationWindowMs
    }

    // 启动定期聚合
    this.startAggregation()

    console.log('[EnhancedMetricsCollector] Initialized')
  }

  /**
   * 记录指标
   */
  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }

    const values = this.metrics.get(name)!
    values.push(value)

    // 限制存储大小（最多保留 1000 个数据点）
    if (values.length > 1000) {
      values.shift()
    }

    // 检查是否需要聚合
    const now = Date.now()
    if (now - this.lastAggregationTime >= this.aggregationWindowMs) {
      this.aggregateMetrics()
    }

    // 检查告警
    this.checkAlerts(name, value)
  }

  /**
   * 记录自定义指标
   */
  recordCustomMetric(name: string, value: number) {
    if (!this.customMetrics.has(name)) {
      this.customMetrics.set(name, [])
    }

    const values = this.customMetrics.get(name)!
    values.push(value)

    if (values.length > 1000) {
      values.shift()
    }

    this.checkCustomAlerts(name, value)
  }

  /**
   * 启动定期聚合
   */
  private startAggregation() {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer)
    }

    this.aggregationTimer = setInterval(() => {
      this.aggregateMetrics()
    }, this.aggregationWindowMs / 2) // 每半个窗口聚合一次
  }

  /**
   * 聚合指标
   */
  private aggregateMetrics() {
    const now = Date.now()
    this.lastAggregationTime = now

    // 聚合 Core Web Vitals
    this.metrics.forEach((values, name) => {
      const aggregated = this.calculateAggregation(name, values)
      this.aggregatedMetrics.set(name, aggregated)
    })

    // 聚合自定义指标
    this.customMetrics.forEach((values, name) => {
      const aggregated = this.calculateAggregation(name, values)
      this.aggregatedMetrics.set(`custom_${name}`, aggregated)
    })

    // 创建快照并通知回调
    const snapshot: MetricSnapshot = {
      metrics: new Map(this.aggregatedMetrics),
      customMetrics: new Map(),
      alerts: [...this.alerts.slice(-10)],
      timestamp: now,
    }

    this.notifyCallbacks(snapshot)

    // 清理旧数据
    this.cleanupOldData()
  }

  /**
   * 计算聚合指标
   */
  private calculateAggregation(name: string, values: number[]): AggregatedMetric {
    if (values.length === 0) {
      return {
        name,
        value: 0,
        count: 0,
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        rating: 'good',
        timestamp: Date.now(),
      }
    }

    const sorted = [...values].sort((a, b) => a - b)
    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / values.length

    const p50Index = Math.floor(sorted.length * 0.5)
    const p95Index = Math.floor(sorted.length * 0.95)
    const p99Index = Math.floor(sorted.length * 0.99)

    const p50 = sorted[p50Index] || 0
    const p95 = sorted[p95Index] || 0
    const p99 = sorted[p99Index] || 0

    const rating = this.getRating(name, avg)

    return {
      name,
      value: avg,
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg,
      p50,
      p95,
      p99,
      rating,
      timestamp: Date.now(),
    }
  }

  /**
   * 获取评级
   */
  private getRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds =
      CORE_WEB_VITALS_THRESHOLDS[metricName as keyof typeof CORE_WEB_VITALS_THRESHOLDS]

    if (!thresholds) {
      return 'good'
    }

    if (value <= thresholds.good) return 'good'
    if (value <= thresholds.needsImprovement) return 'needs-improvement'
    return 'poor'
  }

  /**
   * 检查 Core Web Vitals 告警
   */
  private checkAlerts(metricName: string, value: number) {
    const thresholds =
      CORE_WEB_VITALS_THRESHOLDS[metricName as keyof typeof CORE_WEB_VITALS_THRESHOLDS]

    if (!thresholds) return

    if (value > thresholds.poor) {
      this.triggerAlert({
        metricName,
        value,
        threshold: thresholds.poor,
        level: 'critical',
        message: `Poor ${metricName}: ${value.toFixed(0)}${thresholds.unit}`,
        timestamp: Date.now(),
      })
    } else if (value > thresholds.needsImprovement) {
      this.triggerAlert({
        metricName,
        value,
        threshold: thresholds.needsImprovement,
        level: 'warning',
        message: `${metricName} needs improvement: ${value.toFixed(0)}${thresholds.unit}`,
        timestamp: Date.now(),
      })
    }
  }

  /**
   * 检查自定义指标告警
   */
  private checkCustomAlerts(metricName: string, value: number) {
    // 内存告警
    if (metricName === 'heapSize') {
      if (value > 100) {
        this.triggerAlert({
          metricName,
          value,
          threshold: 100,
          level: 'critical',
          message: `High memory usage: ${value.toFixed(1)}MB`,
          timestamp: Date.now(),
        })
      } else if (value > 50) {
        this.triggerAlert({
          metricName,
          value,
          threshold: 50,
          level: 'warning',
          message: `Memory usage warning: ${value.toFixed(1)}MB`,
          timestamp: Date.now(),
        })
      }
    }

    // 长任务告警
    if (metricName === 'longTask') {
      if (value > 300) {
        this.triggerAlert({
          metricName,
          value,
          threshold: 300,
          level: 'critical',
          message: `Critical long task: ${value.toFixed(0)}ms`,
          timestamp: Date.now(),
        })
      } else if (value > 100) {
        this.triggerAlert({
          metricName,
          value,
          threshold: 100,
          level: 'warning',
          message: `Long task warning: ${value.toFixed(0)}ms`,
          timestamp: Date.now(),
        })
      }
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(alert: PerformanceAlert) {
    this.alerts.push(alert)

    // 限制告警历史大小
    if (this.alerts.length > 100) {
      this.alerts.shift()
    }

    console.log(`[EnhancedMetricsCollector] Alert: ${alert.message}`)
  }

  /**
   * 清理旧数据
   */
  private cleanupOldData() {
    const cutoffTime = Date.now() - this.aggregationWindowMs * 10 // 保留 10 个窗口

    this.metrics.forEach((values, name) => {
      // 这里应该根据时间戳清理，但为了简化，我们只保留最新的 1000 个数据点
      if (values.length > 1000) {
        this.metrics.set(name, values.slice(-1000))
      }
    })

    // 清理旧告警
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoffTime)
  }

  /**
   * 通知回调
   */
  private notifyCallbacks(snapshot: MetricSnapshot) {
    this.callbacks.forEach(callback => {
      try {
        callback(snapshot)
      } catch (error) {
        console.error('[EnhancedMetricsCollector] Callback error:', error)
      }
    })
  }

  /**
   * 注册回调
   */
  onSnapshot(callback: MetricCallback): () => void {
    this.callbacks.push(callback)

    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback)
    }
  }

  /**
   * 获取聚合指标
   */
  getAggregatedMetrics(): Map<string, AggregatedMetric> {
    return new Map(this.aggregatedMetrics)
  }

  /**
   * 获取单个指标的聚合数据
   */
  getAggregatedMetric(name: string): AggregatedMetric | undefined {
    return this.aggregatedMetrics.get(name)
  }

  /**
   * 获取最近的告警
   */
  getRecentAlerts(count: number = 10): PerformanceAlert[] {
    return this.alerts.slice(-count).reverse()
  }

  /**
   * 获取指标趋势
   */
  getTrend(metricName: string, windowMs: number = 3600000): {
    current: number
    previous: number
    changePercent: number
    trend: 'up' | 'down' | 'stable'
  } {
    const values = this.metrics.get(metricName) || []

    if (values.length < 2) {
      return {
        current: values[values.length - 1] || 0,
        previous: 0,
        changePercent: 0,
        trend: 'stable',
      }
    }

    const current = values[values.length - 1]
    const previous = values[0]

    const changePercent = previous === 0 ? 0 : ((current - previous) / previous) * 100

    let trend: 'up' | 'down' | 'stable'
    if (Math.abs(changePercent) < 5) {
      trend = 'stable'
    } else if (changePercent > 0) {
      trend = 'up'
    } else {
      trend = 'down'
    }

    return {
      current,
      previous,
      changePercent,
      trend,
    }
  }

  /**
   * 重置所有数据
   */
  reset() {
    this.metrics.clear()
    this.customMetrics.clear()
    this.aggregatedMetrics.clear()
    this.alerts = []
  }

  /**
   * 销毁收集器
   */
  destroy() {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer)
    }

    this.reset()
    this.callbacks = []

    console.log('[EnhancedMetricsCollector] Destroyed')
  }
}

/**
 * 导出单例
 */
export const enhancedMetricsCollector = EnhancedMetricsCollector.getInstance()

export default EnhancedMetricsCollector
