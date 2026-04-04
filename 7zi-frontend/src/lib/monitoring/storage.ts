/**
 * Monitoring Storage
 * 监控数据存储 - 优化版本
 */

import { PerformanceMetric, AlarmEvent } from './types'

export interface MonitoringStorage {
  saveMetric(metric: PerformanceMetric): Promise<void>
  getMetrics(filter?: {
    type?: string
    startTime?: number
    endTime?: number
  }): Promise<PerformanceMetric[]>
  getMetricsByTimeRange(startTime: number, endTime: number): Promise<PerformanceMetric[]>
  clearMetrics(): Promise<void>
  getMetricsCount(): Promise<number>
  saveAlarm(event: AlarmEvent): Promise<void>
  getAlarms(startTime?: number): Promise<AlarmEvent[]>
  clearAlarms(): Promise<void>
}

// ==================== 辅助函数 ====================

/** 按时间戳降序排序 */
function sortByTimestampDesc<T extends { timestamp: number }>(items: T[]): T[] {
  return items.sort((a, b) => b.timestamp - a.timestamp)
}

/** 过滤指标数据 */
function filterMetrics(
  metrics: PerformanceMetric[],
  filter?: { type?: string; startTime?: number; endTime?: number }
): PerformanceMetric[] {
  if (!filter) return metrics

  return metrics.filter(m => {
    if (filter.type && m.type !== filter.type) return false
    if (filter.startTime && m.timestamp < filter.startTime) return false
    if (filter.endTime && m.timestamp > filter.endTime) return false
    return true
  })
}

/** 过滤告警数据 */
function filterAlarms(alarms: AlarmEvent[], startTime?: number): AlarmEvent[] {
  if (!startTime) return alarms
  return alarms.filter(a => a.timestamp >= startTime)
}

// ==================== 内存存储 ====================

export class MemoryStorage implements MonitoringStorage {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private alarms: Map<string, AlarmEvent> = new Map()
  private retentionPeriodMs: number

  constructor(retentionPeriodMs: number = 24 * 60 * 60 * 1000) {
    this.retentionPeriodMs = retentionPeriodMs
  }

  async saveMetric(metric: PerformanceMetric): Promise<void> {
    this.cleanupExpired()
    this.metrics.set(metric.id, metric)
  }

  async getMetrics(filter?: {
    type?: string
    startTime?: number
    endTime?: number
  }): Promise<PerformanceMetric[]> {
    const metrics = Array.from(this.metrics.values())
    return sortByTimestampDesc(filterMetrics(metrics, filter))
  }

  async getMetricsByTimeRange(startTime: number, endTime: number): Promise<PerformanceMetric[]> {
    return this.getMetrics({ startTime, endTime })
  }

  async clearMetrics(): Promise<void> {
    this.metrics.clear()
  }

  async getMetricsCount(): Promise<number> {
    return this.metrics.size
  }

  async saveAlarm(event: AlarmEvent): Promise<void> {
    this.alarms.set(event.id, event)
  }

  async getAlarms(startTime?: number): Promise<AlarmEvent[]> {
    const alarms = Array.from(this.alarms.values())
    return sortByTimestampDesc(filterAlarms(alarms, startTime))
  }

  async clearAlarms(): Promise<void> {
    this.alarms.clear()
  }

  private cleanupExpired(): void {
    const cutoffTime = Date.now() - this.retentionPeriodMs
    for (const [id, metric] of this.metrics) {
      if (metric.timestamp < cutoffTime) {
        this.metrics.delete(id)
      }
    }
  }
}

// ==================== 本地存储 ====================

export class LocalStorageStorage implements MonitoringStorage {
  private retentionPeriodMs: number
  private readonly metricsKey = 'monitoring_metrics'
  private readonly alarmsKey = 'monitoring_alarms'

  constructor(retentionPeriodMs: number = 24 * 60 * 60 * 1000) {
    this.retentionPeriodMs = retentionPeriodMs
  }

  private isClient(): boolean {
    return typeof window !== 'undefined'
  }

  private getStoredMetrics(): PerformanceMetric[] {
    if (!this.isClient()) return []
    const data = localStorage.getItem(this.metricsKey)
    return data ? JSON.parse(data) : []
  }

  private setStoredMetrics(metrics: PerformanceMetric[]): void {
    if (!this.isClient()) return
    localStorage.setItem(this.metricsKey, JSON.stringify(metrics))
  }

  private getStoredAlarms(): AlarmEvent[] {
    if (!this.isClient()) return []
    const data = localStorage.getItem(this.alarmsKey)
    return data ? JSON.parse(data) : []
  }

  private setStoredAlarms(alarms: AlarmEvent[]): void {
    if (!this.isClient()) return
    localStorage.setItem(this.alarmsKey, JSON.stringify(alarms))
  }

  async saveMetric(metric: PerformanceMetric): Promise<void> {
    if (!this.isClient()) return

    const metrics = this.getStoredMetrics()
    const existingIndex = metrics.findIndex(m => m.id === metric.id)

    if (existingIndex >= 0) {
      metrics[existingIndex] = metric
    } else {
      metrics.push(metric)
    }

    // 清理过期数据
    const cutoffTime = Date.now() - this.retentionPeriodMs
    const filteredMetrics = metrics.filter(m => m.timestamp >= cutoffTime)
    this.setStoredMetrics(filteredMetrics)
  }

  async getMetrics(filter?: {
    type?: string
    startTime?: number
    endTime?: number
  }): Promise<PerformanceMetric[]> {
    if (!this.isClient()) return []
    const metrics = this.getStoredMetrics()
    return sortByTimestampDesc(filterMetrics(metrics, filter))
  }

  async getMetricsByTimeRange(startTime: number, endTime: number): Promise<PerformanceMetric[]> {
    return this.getMetrics({ startTime, endTime })
  }

  async clearMetrics(): Promise<void> {
    if (!this.isClient()) return
    localStorage.removeItem(this.metricsKey)
  }

  async getMetricsCount(): Promise<number> {
    if (!this.isClient()) return 0
    return this.getStoredMetrics().length
  }

  async saveAlarm(event: AlarmEvent): Promise<void> {
    if (!this.isClient()) return

    const alarms = this.getStoredAlarms()
    const existingIndex = alarms.findIndex(a => a.id === event.id)

    if (existingIndex >= 0) {
      alarms[existingIndex] = event
    } else {
      alarms.push(event)
    }

    this.setStoredAlarms(alarms)
  }

  async getAlarms(startTime?: number): Promise<AlarmEvent[]> {
    if (!this.isClient()) return []
    const alarms = this.getStoredAlarms()
    return sortByTimestampDesc(filterAlarms(alarms, startTime))
  }

  async clearAlarms(): Promise<void> {
    if (!this.isClient()) return
    localStorage.removeItem(this.alarmsKey)
  }
}
