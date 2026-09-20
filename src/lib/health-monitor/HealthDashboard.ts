/**
 * Health Dashboard
 *
 * Real-time health monitoring dashboard data provider.
 * Aggregates health status across all services and instances.
 *
 * @version v1.10.0
 * @author Executor + 咨询师
 */

import type {
  HealthStatus,
  ServiceHealth,
  InstanceHealth,
  HealthAlert,
  HealthDashboardSummary,
  HealthReport,
  HealthTrendPoint,
  HealthRecommendation,
  HealthIncident,
  ServiceInstance
} from './types'
import type { HealthCheckResult } from './types'
import type { FailureRecord } from './FailureDetector'
import type { RecoveryAttempt } from './RecoveryManager'

// ============================================
// Dashboard Types
// ============================================

/**
 * Service group summary
 */
export interface ServiceGroupSummary {
  name: string
  status: HealthStatus
  instances: number
  healthy: number
  unhealthy: number
  avgResponseTime: number
}

/**
 * Dashboard widget data
 */
export interface DashboardWidget {
  id: string
  type: 'status' | 'chart' | 'table' | 'gauge' | 'timeline'
  title: string
  data: unknown
  refreshIntervalMs: number
  lastUpdated: string
}

/**
 * Health score breakdown
 */
export interface HealthScoreBreakdown {
  overall: number
  availability: number
  performance: number
  reliability: number
  details: {
    factor: string
    score: number
    weight: number
    impact: number
  }[]
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  /** Refresh interval (ms) */
  refreshIntervalMs: number
  /** Enable trend history */
  enableTrends: boolean
  /** Trend history duration (ms) */
  trendDurationMs: number
  /** Maximum alerts to show */
  maxAlerts: number
  /** Maximum recommendations */
  maxRecommendations: number
  /** Enable automatic recommendations */
  enableAutoRecommendations: boolean
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  refreshIntervalMs: 5000,
  enableTrends: true,
  trendDurationMs: 86400000, // 24 hours
  maxAlerts: 50,
  maxRecommendations: 10,
  enableAutoRecommendations: true
}

// ============================================
// Health Dashboard
// ============================================

/**
 * Health Dashboard
 * 
 * Provides real-time health monitoring data for dashboard UI.
 */
export class HealthDashboard {
  private config: DashboardConfig
  private serviceHealth: Map<string, ServiceHealth> = new Map()
  private instanceHealth: Map<string, InstanceHealth> = new Map()
  private alerts: Map<string, HealthAlert> = new Map()
  private trends: Map<string, HealthTrendPoint[]> = new Map()
  private incidents: HealthIncident[] = []
  private lastUpdated: string = new Date().toISOString()

  constructor(config: Partial<DashboardConfig> = {}) {
    this.config = { ...DEFAULT_DASHBOARD_CONFIG, ...config }
  }

  /**
   * Update service health data
   */
  updateServiceHealth(serviceName: string, health: ServiceHealth): void {
    this.serviceHealth.set(serviceName, health)
    this.lastUpdated = new Date().toISOString()

    if (this.config.enableTrends) {
      this.recordTrendPoint(serviceName, health)
    }
  }

  /**
   * Update instance health data
   */
  updateInstanceHealth(instanceId: string, health: InstanceHealth): void {
    this.instanceHealth.set(instanceId, health)
    this.lastUpdated = new Date().toISOString()
  }

  /**
   * Update alerts
   */
  updateAlerts(alerts: HealthAlert[]): void {
    this.alerts.clear()
    for (const alert of alerts.slice(0, this.config.maxAlerts)) {
      this.alerts.set(alert.id, alert)
    }
  }

  /**
   * Update incidents
   */
  updateIncidents(incidents: HealthIncident[]): void {
    this.incidents = incidents
  }

  /**
   * Get dashboard summary
   */
  getSummary(): HealthDashboardSummary {
    const services = Array.from(this.serviceHealth.values())
    const instances = Array.from(this.instanceHealth.values())
    const alerts = Array.from(this.alerts.values())

    const healthyServices = services.filter((s) => s.status === 'healthy').length
    const degradedServices = services.filter((s) => s.status === 'degraded').length
    const unhealthyServices = services.filter((s) => s.status === 'unhealthy').length

    const healthyInstances = instances.filter((i) => i.status === 'healthy').length
    const criticalAlerts = alerts.filter((a) => a.severity === 'critical' && a.status === 'active').length

    const avgResponseTime = this.calculateAvgResponseTime(instances)
    const systemUptime = this.calculateSystemUptime(instances)
    const trend = this.getAggregatedTrend()

    return {
      totalServices: services.length,
      healthyServices,
      degradedServices,
      unhealthyServices,
      totalInstances: instances.length,
      healthyInstances,
      activeAlerts: alerts.filter((a) => a.status === 'active').length,
      criticalAlerts,
      systemUptime,
      avgResponseTimeMs: avgResponseTime,
      trend
    }
  }

  /**
   * Get service health summary
   */
  getServiceHealth(serviceName?: string): ServiceHealth | ServiceHealth[] {
    if (serviceName) {
      return this.serviceHealth.get(serviceName) || this.createEmptyServiceHealth(serviceName)
    }
    return Array.from(this.serviceHealth.values())
  }

  /**
   * Get instance health summary
   */
  getInstanceHealth(instanceId?: string): InstanceHealth | InstanceHealth[] {
    if (instanceId) {
      return this.instanceHealth.get(instanceId) || this.createEmptyInstanceHealth(instanceId)
    }
    return Array.from(this.instanceHealth.values())
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(limit?: number): HealthAlert[] {
    const alerts = Array.from(this.alerts.values())
      .filter((a) => a.status === 'active')
      .sort((a, b) => {
        // Sort by severity first, then by timestamp
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
        if (severityDiff !== 0) return severityDiff
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })

    return limit ? alerts.slice(0, limit) : alerts
  }

  /**
   * Get health score breakdown
   */
  getHealthScore(): HealthScoreBreakdown {
    const instances = Array.from(this.instanceHealth.values())
    
    // Calculate availability score
    const availabilityScores = instances.map((i) => i.uptimePercentage)
    const availability = this.average(availabilityScores)

    // Calculate performance score (based on response time)
    const responseTimes = instances.map((i) => i.avgResponseTimeMs)
    const avgResponseTime = this.average(responseTimes)
    const performance = this.calculatePerformanceScore(avgResponseTime)

    // Calculate reliability score (based on error rate)
    const errorRates = instances.map((i) => i.errorRate)
    const avgErrorRate = this.average(errorRates)
    const reliability = Math.max(0, 100 - avgErrorRate * 100)

    // Calculate overall score with weights
    const details = [
      {
        factor: 'availability',
        score: availability,
        weight: 0.4,
        impact: availability * 0.4
      },
      {
        factor: 'performance',
        score: performance,
        weight: 0.35,
        impact: performance * 0.35
      },
      {
        factor: 'reliability',
        score: reliability,
        weight: 0.25,
        impact: reliability * 0.25
      }
    ]

    const overall = details.reduce((sum, d) => sum + d.impact, 0)

    return {
      overall: Math.round(overall * 10) / 10,
      availability: Math.round(availability * 10) / 10,
      performance: Math.round(performance * 10) / 10,
      reliability: Math.round(reliability * 10) / 10,
      details
    }
  }

  /**
   * Get trend data
   */
  getTrend(serviceName?: string, durationMs?: number): HealthTrendPoint[] {
    if (serviceName) {
      const trend = this.trends.get(serviceName) || []
      return this.filterTrendByDuration(trend, durationMs || this.config.trendDurationMs)
    }
    return this.getAggregatedTrend(durationMs)
  }

  /**
   * Generate comprehensive health report
   */
  generateReport(): HealthReport {
    const now = new Date()
    const start = new Date(now.getTime() - this.config.trendDurationMs)

    const summary = this.getSummary()
    const services = Array.from(this.serviceHealth.values())
    const activeAlerts = this.getActiveAlerts()
    
    // Generate recommendations
    const recommendations = this.config.enableAutoRecommendations
      ? this.generateRecommendations()
      : []

    return {
      id: `report-${Date.now()}`,
      timestamp: now.toISOString(),
      timeRange: {
        start: start.toISOString(),
        end: now.toISOString()
      },
      overallStatus: this.determineOverallStatus(summary),
      overallScore: summary.avgResponseTimeMs > 0 ? summary.systemUptime : 0,
      services,
      activeAlerts,
      incidents: this.incidents,
      recommendations,
      dashboard: summary
    }
  }

  /**
   * Get dashboard widgets
   */
  getWidgets(): DashboardWidget[] {
    const now = new Date().toISOString()
    
    return [
      {
        id: 'status-overview',
        type: 'status',
        title: 'Service Status Overview',
        data: this.getStatusOverview(),
        refreshIntervalMs: this.config.refreshIntervalMs,
        lastUpdated: now
      },
      {
        id: 'health-score',
        type: 'gauge',
        title: 'System Health Score',
        data: this.getHealthScore(),
        refreshIntervalMs: this.config.refreshIntervalMs,
        lastUpdated: now
      },
      {
        id: 'response-time-chart',
        type: 'chart',
        title: 'Response Time Trend',
        data: this.getResponseTimeChartData(),
        refreshIntervalMs: this.config.refreshIntervalMs,
        lastUpdated: now
      },
      {
        id: 'alerts-table',
        type: 'table',
        title: 'Active Alerts',
        data: this.getActiveAlerts(10),
        refreshIntervalMs: this.config.refreshIntervalMs,
        lastUpdated: now
      },
      {
        id: 'availability-timeline',
        type: 'timeline',
        title: 'Availability Timeline',
        data: this.getAvailabilityTimeline(),
        refreshIntervalMs: this.config.refreshIntervalMs,
        lastUpdated: now
      }
    ]
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.serviceHealth.clear()
    this.instanceHealth.clear()
    this.alerts.clear()
    this.trends.clear()
    this.incidents = []
    this.lastUpdated = new Date().toISOString()
  }

  // ============================================
  // Private Methods
  // ============================================

  private recordTrendPoint(serviceName: string, health: ServiceHealth): void {
    if (!this.trends.has(serviceName)) {
      this.trends.set(serviceName, [])
    }

    const trend = this.trends.get(serviceName)!
    const point: HealthTrendPoint = {
      timestamp: new Date().toISOString(),
      score: health.healthScore,
      status: health.status,
      healthyCount: health.healthyInstances,
      unhealthyCount: health.unhealthyInstances
    }

    trend.push(point)

    // Keep only data within trend duration
    const cutoff = Date.now() - this.config.trendDurationMs
    const filteredTrend = trend.filter(
      (p) => new Date(p.timestamp).getTime() >= cutoff
    )
    this.trends.set(serviceName, filteredTrend)
  }

  private getAggregatedTrend(durationMs?: number): HealthTrendPoint[] {
    const allTrends = Array.from(this.trends.values()).flat()
    return this.filterTrendByDuration(allTrends, durationMs || this.config.trendDurationMs)
  }

  private filterTrendByDuration(trend: HealthTrendPoint[], durationMs: number): HealthTrendPoint[] {
    const cutoff = Date.now() - durationMs
    return trend
      .filter((p) => new Date(p.timestamp).getTime() >= cutoff)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }

  private calculateAvgResponseTime(instances: InstanceHealth[]): number {
    const times = instances
      .filter((i) => i.avgResponseTimeMs > 0)
      .map((i) => i.avgResponseTimeMs)
    return times.length > 0 ? this.average(times) : 0
  }

  private calculateSystemUptime(instances: InstanceHealth[]): number {
    if (instances.length === 0) return 100
    const uptimes = instances.map((i) => i.uptimePercentage)
    return this.average(uptimes)
  }

  private calculatePerformanceScore(avgResponseTime: number): number {
    // Score based on response time thresholds
    // < 100ms: 100, < 200ms: 90, < 500ms: 80, < 1000ms: 60, < 2000ms: 40, > 2000ms: 20
    if (avgResponseTime === 0) return 100
    if (avgResponseTime < 100) return 100
    if (avgResponseTime < 200) return 90
    if (avgResponseTime < 500) return 80
    if (avgResponseTime < 1000) return 60
    if (avgResponseTime < 2000) return 40
    return 20
  }

  private determineOverallStatus(summary: HealthDashboardSummary): HealthStatus {
    if (summary.criticalAlerts > 0 || summary.unhealthyServices > 0) {
      return 'unhealthy'
    }
    if (summary.degradedServices > 0 || summary.activeAlerts > 0) {
      return 'degraded'
    }
    if (summary.totalServices === 0) {
      return 'unknown'
    }
    return 'healthy'
  }

  private generateRecommendations(): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = []
    const instances = Array.from(this.instanceHealth.values())
    const services = Array.from(this.serviceHealth.values())

    // Check for high error rates
    const highErrorInstances = instances.filter((i) => i.errorRate > 0.1)
    if (highErrorInstances.length > 0) {
      recommendations.push({
        id: 'rec-high-error-rate',
        priority: 1,
        type: 'reliability',
        title: 'High Error Rate Detected',
        description: `${highErrorInstances.length} instances have error rates above 10%. Consider investigating logs and scaling.`,
        affectedServices: highErrorInstances.map((i) => i.instanceId),
        impact: 'Reduced reliability and user experience',
        effort: 'medium',
        relatedMetrics: ['error_rate', 'response_time']
      })
    }

    // Check for slow response times
    const slowInstances = instances.filter((i) => i.avgResponseTimeMs > 2000)
    if (slowInstances.length > 0) {
      recommendations.push({
        id: 'rec-slow-response',
        priority: 2,
        type: 'performance',
        title: 'Slow Response Times',
        description: `${slowInstances.length} instances have average response times above 2 seconds. Consider optimization or scaling.`,
        affectedServices: slowInstances.map((i) => i.instanceId),
        impact: 'Degraded user experience and potential timeout issues',
        effort: 'medium',
        relatedMetrics: ['response_time', 'cpu_usage']
      })
    }

    // Check for circuit breakers
    const openCircuits = instances.filter((i) => i.circuitBreakerState === 'open')
    if (openCircuits.length > 0) {
      recommendations.push({
        id: 'rec-circuit-open',
        priority: 1,
        type: 'reliability',
        title: 'Open Circuit Breakers',
        description: `${openCircuits.length} instances have open circuit breakers. They are not receiving traffic.`,
        affectedServices: openCircuits.map((i) => i.instanceId),
        impact: 'Reduced capacity and potential cascading failures',
        effort: 'high',
        relatedMetrics: ['circuit_breaker_state', 'failure_count']
      })
    }

    // Check for degraded services
    const degradedServices = services.filter((s) => s.status === 'degraded')
    if (degradedServices.length > 0) {
      recommendations.push({
        id: 'rec-degraded-services',
        priority: 2,
        type: 'reliability',
        title: 'Degraded Services',
        description: `${degradedServices.length} services are in degraded state. Monitor closely.`,
        affectedServices: degradedServices.map((s) => s.serviceName),
        impact: 'Potential service disruption',
        effort: 'low',
        relatedMetrics: ['health_status', 'instance_count']
      })
    }

    return recommendations.slice(0, this.config.maxRecommendations)
  }

  private getStatusOverview(): {
    services: { name: string; status: HealthStatus; instances: number }[]
    groups: { name: string; status: HealthStatus; count: number }[]
  } {
    const services = Array.from(this.serviceHealth.values()).map((s) => ({
      name: s.serviceName,
      status: s.status,
      instances: s.totalInstances
    }))

    return {
      services,
      groups: [] // Would be populated from service groups
    }
  }

  private getResponseTimeChartData(): {
    labels: string[]
    data: number[]
  } {
    const trend = this.getAggregatedTrend(3600000) // Last hour
    return {
      labels: trend.map((p) => p.timestamp),
      data: trend.map((p) => p.score)
    }
  }

  private getAvailabilityTimeline(): {
    timestamp: string
    healthy: number
    degraded: number
    unhealthy: number
  }[] {
    const trend = this.getAggregatedTrend(3600000) // Last hour
    return trend.map((p) => ({
      timestamp: p.timestamp,
      healthy: p.healthyCount,
      degraded: Math.floor((p.healthyCount + p.unhealthyCount) * 0.1),
      unhealthy: p.unhealthyCount
    }))
  }

  private createEmptyServiceHealth(serviceName: string): ServiceHealth {
    return {
      serviceName,
      status: 'unknown',
      totalInstances: 0,
      healthyInstances: 0,
      unhealthyInstances: 0,
      degradedInstances: 0,
      instances: [],
      lastChecked: new Date().toISOString(),
      healthScore: 0,
      alerts: []
    }
  }

  private createEmptyInstanceHealth(instanceId: string): InstanceHealth {
    return {
      instanceId,
      endpoint: '',
      status: 'unknown',
      circuitBreakerState: 'closed',
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      avgResponseTimeMs: 0,
      responseTimeHistory: [],
      errorRate: 0,
      uptimePercentage: 100,
      totalChecks: 0,
      totalFailures: 0
    }
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return numbers.reduce((a, b) => a + b, 0) / numbers.length
  }
}

export default HealthDashboard
