/**
 * Alert Statistics Module
 * Comprehensive alert analytics and reporting
 */

import type { PerformanceAlert, AlertLevel, AlertStatus, AlertCategory } from './alerter'

// ========================================
// Types
// ========================================

export interface AlertTimeSeries {
  /** Time bucket (timestamp) */
  timestamp: number
  /** Count in this bucket */
  count: number
  /** Breakdown by level */
  byLevel: Record<AlertLevel, number>
  /** Breakdown by category */
  byCategory: Record<AlertCategory, number>
}

export interface AlertTrend {
  /** Metric name */
  metric: string
  /** Current value */
  current: number
  /** Previous value */
  previous: number
  /** Change percentage */
  changePercent: number
  /** Trend direction */
  direction: 'up' | 'down' | 'stable'
}

export interface AgentAlertStats {
  /** Agent ID */
  agentId: string
  /** Agent name */
  agentName: string
  /** Total alerts */
  totalAlerts: number
  /** Alerts by level */
  byLevel: Record<AlertLevel, number>
  /** Average resolution time (ms) */
  avgResolutionTime: number
  /** Alerts in last 24 hours */
  last24Hours: number
  /** Trend compared to previous period */
  trend: AlertTrend
}

export interface AlertMetricsReport {
  /** Report timestamp */
  generatedAt: number
  /** Time range */
  timeRange: {
    start: number
    end: number
  }
  /** Total alerts */
  totalAlerts: number
  /** Unique alerts (by deduplication) */
  uniqueAlerts: number
  /** Alerts by level */
  byLevel: Record<AlertLevel, number>
  /** Alerts by category */
  byCategory: Record<AlertCategory, number>
  /** Alerts by status */
  byStatus: Record<AlertStatus, number>
  /** Alerts by source/agent */
  bySource: Record<string, number>
  /** Time series data */
  timeSeries: AlertTimeSeries[]
  /** Trends */
  trends: AlertTrend[]
  /** Agent-specific stats */
  agentStats: AgentAlertStats[]
  /** Resolution statistics */
  resolutionStats: {
    avgResolutionTime: number
    medianResolutionTime: number
    p95ResolutionTime: number
    resolutionsPerHour: number
  }
  /** Suppression statistics */
  suppressionStats: {
    totalSuppressions: number
    activeRules: number
    suppressionRate: number
  }
}

export interface StatsOptions {
  /** Start time for report */
  startTime?: number
  /** End time for report */
  endTime?: number
  /** Time bucket size for time series (ms) */
  bucketSize?: number
  /** Include agent breakdown */
  includeAgents?: boolean
  /** Include time series */
  includeTimeSeries?: boolean
  /** Include trends */
  includeTrends?: boolean
  /** Compare to previous period */
  comparePrevious?: boolean
}

// ========================================
// AlertStatsCollector Class
// ========================================

export class AlertStatsCollector {
  private alerts: PerformanceAlert[] = []
  private maxAlerts: number
  private agentRegistry?: Map<string, string>

  constructor(options?: { maxAlerts?: number; agentRegistry?: Map<string, string> }) {
    this.maxAlerts = options?.maxAlerts || 10000
    this.agentRegistry = options?.agentRegistry
  }

  // ========================================
  // Data Collection
  // ========================================

  /**
   * Record an alert for statistics
   */
  recordAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert)

    // Trim old alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift()
    }
  }

  /**
   * Record multiple alerts
   */
  recordAlerts(alerts: PerformanceAlert[]): void {
    this.alerts.push(...alerts)

    // Trim old alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts)
    }
  }

  /**
   * Clear all recorded alerts
   */
  clear(): void {
    this.alerts = []
  }

  /**
   * Get all recorded alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts]
  }

  // ========================================
  // Report Generation
  // ========================================

  /**
   * Generate a comprehensive metrics report
   */
  generateReport(options?: StatsOptions): AlertMetricsReport {
    const now = Date.now()
    const startTime = options?.startTime || now - 86400000 // Default: last 24 hours
    const endTime = options?.endTime || now
    const bucketSize = options?.bucketSize || 3600000 // Default: 1 hour buckets

    // Filter alerts to time range
    const filteredAlerts = this.alerts.filter(
      a => a.createdAt >= startTime && a.createdAt <= endTime
    )

    // Calculate basic stats
    const byLevel = this.countByLevel(filteredAlerts)
    const byCategory = this.countByCategory(filteredAlerts)
    const byStatus = this.countByStatus(filteredAlerts)
    const bySource = this.countBySource(filteredAlerts)

    // Calculate unique alerts
    const uniqueAlerts = new Set(
      filteredAlerts.map(a => `${a.title}-${a.source}-${a.metric || 'none'}`)
    ).size

    // Generate time series
    const timeSeries =
      options?.includeTimeSeries !== false
        ? this.generateTimeSeries(filteredAlerts, startTime, endTime, bucketSize)
        : []

    // Generate trends
    const trends = options?.includeTrends !== false ? this.generateTrends(startTime, endTime) : []

    // Generate agent stats
    const agentStats =
      options?.includeAgents !== false
        ? this.generateAgentStats(filteredAlerts, startTime, endTime)
        : []

    // Generate resolution stats
    const resolutionStats = this.generateResolutionStats(filteredAlerts)

    // Generate suppression stats
    const suppressionStats = this.generateSuppressionStats(filteredAlerts)

    return {
      generatedAt: now,
      timeRange: {
        start: startTime,
        end: endTime,
      },
      totalAlerts: filteredAlerts.length,
      uniqueAlerts,
      byLevel,
      byCategory,
      byStatus,
      bySource,
      timeSeries,
      trends,
      agentStats,
      resolutionStats,
      suppressionStats,
    }
  }

  // ========================================
  // Counting Helpers
  // ========================================

  /**
   * Count alerts by level
   */
  private countByLevel(alerts: PerformanceAlert[]): Record<AlertLevel, number> {
    const counts: Record<AlertLevel, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    }

    for (const alert of alerts) {
      counts[alert.level]++
    }

    return counts
  }

  /**
   * Count alerts by category
   */
  private countByCategory(alerts: PerformanceAlert[]): Record<AlertCategory, number> {
    const counts: Record<AlertCategory, number> = {
      performance: 0,
      availability: 0,
      error: 0,
      resource: 0,
      security: 0,
      custom: 0,
    }

    for (const alert of alerts) {
      counts[alert.category]++
    }

    return counts
  }

  /**
   * Count alerts by status
   */
  private countByStatus(alerts: PerformanceAlert[]): Record<AlertStatus, number> {
    const counts: Record<AlertStatus, number> = {
      active: 0,
      acknowledged: 0,
      resolved: 0,
      suppressed: 0,
    }

    for (const alert of alerts) {
      counts[alert.status]++
    }

    return counts
  }

  /**
   * Count alerts by source
   */
  private countBySource(alerts: PerformanceAlert[]): Record<string, number> {
    const counts: Record<string, number> = {}

    for (const alert of alerts) {
      counts[alert.source] = (counts[alert.source] || 0) + 1
    }

    return counts
  }

  // ========================================
  // Time Series Generation
  // ========================================

  /**
   * Generate time series data
   */
  private generateTimeSeries(
    alerts: PerformanceAlert[],
    startTime: number,
    endTime: number,
    bucketSize: number
  ): AlertTimeSeries[] {
    const series: AlertTimeSeries[] = []

    // Create buckets
    for (let time = startTime; time < endTime; time += bucketSize) {
      const bucketEnd = Math.min(time + bucketSize, endTime)
      const bucketAlerts = alerts.filter(a => a.createdAt >= time && a.createdAt < bucketEnd)

      series.push({
        timestamp: time,
        count: bucketAlerts.length,
        byLevel: this.countByLevel(bucketAlerts),
        byCategory: this.countByCategory(bucketAlerts),
      })
    }

    return series
  }

  // ========================================
  // Trend Analysis
  // ========================================

  /**
   * Generate trend data
   */
  private generateTrends(startTime: number, endTime: number): AlertTrend[] {
    const trends: AlertTrend[] = []
    const duration = endTime - startTime

    // Compare to previous period
    const previousStart = startTime - duration
    const previousEnd = startTime

    // Current period alerts
    const currentAlerts = this.alerts.filter(
      a => a.createdAt >= startTime && a.createdAt <= endTime
    )

    // Previous period alerts
    const previousAlerts = this.alerts.filter(
      a => a.createdAt >= previousStart && a.createdAt <= previousEnd
    )

    // Total count trend
    trends.push(this.calculateTrend('total_alerts', currentAlerts.length, previousAlerts.length))

    // Level trends
    const levels: AlertLevel[] = ['info', 'warning', 'error', 'critical']
    for (const level of levels) {
      const current = currentAlerts.filter(a => a.level === level).length
      const previous = previousAlerts.filter(a => a.level === level).length
      trends.push(this.calculateTrend(`alerts_${level}`, current, previous))
    }

    // Category trends
    const categories: AlertCategory[] = [
      'performance',
      'availability',
      'error',
      'resource',
      'security',
    ]
    for (const category of categories) {
      const current = currentAlerts.filter(a => a.category === category).length
      const previous = previousAlerts.filter(a => a.category === category).length
      trends.push(this.calculateTrend(`alerts_${category}`, current, previous))
    }

    return trends
  }

  /**
   * Calculate a single trend
   */
  private calculateTrend(metric: string, current: number, previous: number): AlertTrend {
    let changePercent = 0
    if (previous > 0) {
      changePercent = ((current - previous) / previous) * 100
    } else if (current > 0) {
      changePercent = 100 // New alerts
    }

    let direction: 'up' | 'down' | 'stable' = 'stable'
    if (Math.abs(changePercent) > 5) {
      direction = changePercent > 0 ? 'up' : 'down'
    }

    return {
      metric,
      current,
      previous,
      changePercent: Math.round(changePercent * 10) / 10,
      direction,
    }
  }

  // ========================================
  // Agent Statistics
  // ========================================

  /**
   * Generate agent-specific statistics
   */
  private generateAgentStats(
    alerts: PerformanceAlert[],
    startTime: number,
    endTime: number
  ): AgentAlertStats[] {
    const duration = endTime - startTime
    const previousStart = startTime - duration

    // Group alerts by source (agent)
    const bySource: Record<string, PerformanceAlert[]> = {}
    for (const alert of alerts) {
      if (!bySource[alert.source]) {
        bySource[alert.source] = []
      }
      bySource[alert.source].push(alert)
    }

    // Calculate stats per agent
    const stats: AgentAlertStats[] = []

    for (const [source, sourceAlerts] of Object.entries(bySource)) {
      const agentName = this.agentRegistry?.get(source) || source

      // Calculate resolution times
      const resolutionTimes = sourceAlerts
        .filter(a => a.resolvedAt && a.createdAt)
        .map(a => a.resolvedAt! - a.createdAt)

      const avgResolutionTime =
        resolutionTimes.length > 0
          ? resolutionTimes.reduce((sum, t) => sum + t, 0) / resolutionTimes.length
          : 0

      // Calculate last 24 hours
      const last24Hours = sourceAlerts.filter(a => a.createdAt >= endTime - 86400000).length

      // Get previous period count for trend
      const previousCount = this.alerts.filter(
        a => a.source === source && a.createdAt >= previousStart && a.createdAt < startTime
      ).length

      const trend = this.calculateTrend('alerts', sourceAlerts.length, previousCount)

      stats.push({
        agentId: source,
        agentName,
        totalAlerts: sourceAlerts.length,
        byLevel: this.countByLevel(sourceAlerts),
        avgResolutionTime,
        last24Hours,
        trend,
      })
    }

    // Sort by total alerts
    return stats.sort((a, b) => b.totalAlerts - a.totalAlerts)
  }

  // ========================================
  // Resolution Statistics
  // ========================================

  /**
   * Generate resolution statistics
   */
  private generateResolutionStats(alerts: PerformanceAlert[]): {
    avgResolutionTime: number
    medianResolutionTime: number
    p95ResolutionTime: number
    resolutionsPerHour: number
  } {
    const resolvedAlerts = alerts.filter(a => a.resolvedAt && a.createdAt)
    const resolutionTimes = resolvedAlerts
      .map(a => a.resolvedAt! - a.createdAt)
      .sort((a, b) => a - b)

    // Calculate average
    const avgResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, t) => sum + t, 0) / resolutionTimes.length
        : 0

    // Calculate median
    const medianResolutionTime =
      resolutionTimes.length > 0 ? resolutionTimes[Math.floor(resolutionTimes.length / 2)] : 0

    // Calculate p95
    const p95Index = Math.floor(resolutionTimes.length * 0.95)
    const p95ResolutionTime =
      resolutionTimes.length > 0 ? resolutionTimes[Math.max(0, p95Index - 1)] : 0

    // Calculate resolutions per hour (optimized: single pass instead of two .map() calls)
    const timeSpan =
      alerts.length > 0
        ? Math.max(
            1,
            (() => {
              const { min, max } = alerts.reduce(
                (acc, a) => ({
                  min: Math.min(acc.min, a.createdAt),
                  max: Math.max(acc.max, a.createdAt),
                }),
                { min: Infinity, max: -Infinity }
              )
              return max - min
            })() / 3600000
          )
        : 1
    const resolutionsPerHour = resolvedAlerts.length / timeSpan

    return {
      avgResolutionTime,
      medianResolutionTime,
      p95ResolutionTime,
      resolutionsPerHour,
    }
  }

  // ========================================
  // Suppression Statistics
  // ========================================

  /**
   * Generate suppression statistics
   */
  private generateSuppressionStats(alerts: PerformanceAlert[]): {
    totalSuppressions: number
    activeRules: number
    suppressionRate: number
  } {
    const totalSuppressions = alerts.filter(a => a.status === 'suppressed').length
    const suppressionRate = alerts.length > 0 ? (totalSuppressions / alerts.length) * 100 : 0

    // Note: activeRules would need to be passed from the alerter
    // For now, return 0 as default
    return {
      totalSuppressions,
      activeRules: 0,
      suppressionRate: Math.round(suppressionRate * 10) / 10,
    }
  }

  // ========================================
  // Quick Stats
  // ========================================

  /**
   * Get quick stats for the last 24 hours
   */
  getQuickStats(): {
    totalAlerts: number
    activeAlerts: number
    byLevel: Record<AlertLevel, number>
    avgResolutionTime: number
  } {
    const now = Date.now()
    const dayAgo = now - 86400000
    const recentAlerts = this.alerts.filter(a => a.createdAt >= dayAgo)

    const resolvedAlerts = recentAlerts.filter(a => a.resolvedAt && a.createdAt)
    const resolutionTimes = resolvedAlerts.map(a => a.resolvedAt! - a.createdAt)
    const avgResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, t) => sum + t, 0) / resolutionTimes.length
        : 0

    return {
      totalAlerts: recentAlerts.length,
      activeAlerts: recentAlerts.filter(a => a.status === 'active').length,
      byLevel: this.countByLevel(recentAlerts),
      avgResolutionTime,
    }
  }

  /**
   * Get alert count by time range
   */
  getCountByTimeRange(startTime: number, endTime: number): number {
    return this.alerts.filter(a => a.createdAt >= startTime && a.createdAt <= endTime).length
  }

  /**
   * Get top alert sources
   */
  getTopSources(limit: number = 10): Array<{ source: string; count: number }> {
    const bySource = this.countBySource(this.alerts)
    return Object.entries(bySource)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /**
   * Get alert trends for a specific metric
   */
  getMetricTrend(metric: string, hours: number = 24): AlertTrend {
    const now = Date.now()
    const startTime = now - hours * 3600000
    const previousStart = startTime - hours * 3600000

    const currentAlerts = this.alerts.filter(
      a => a.createdAt >= startTime && a.createdAt <= now && a.metric === metric
    )
    const previousAlerts = this.alerts.filter(
      a => a.createdAt >= previousStart && a.createdAt < startTime && a.metric === metric
    )

    return this.calculateTrend(metric, currentAlerts.length, previousAlerts.length)
  }
}
