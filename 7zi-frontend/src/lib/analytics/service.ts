/**
 * Analytics Service
 *
 * Data aggregation service for the analytics dashboard.
 * In production, this would connect to your data source (database, monitoring system, etc.).
 */

import type {
  AnalyticsMetrics,
  AnalyticsQueryParams,
  OverviewMetrics,
  WorkflowTrendData,
  NodePerformanceData,
  ResourceUsageData,
  AnomalyData,
} from './types'
import {
  generateWorkflowTrendData,
  generateNodePerformanceData,
  generateResourceUsageData,
  calculateOverviewMetrics,
  detectAnomalies,
} from './metrics'

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
}

/**
 * Analytics Service
 */
class AnalyticsService {
  private cache: Map<string, CacheEntry<unknown>> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get overview metrics
   */
  async getOverviewMetrics(): Promise<OverviewMetrics> {
    const cacheKey = 'overview'
    const cached = this.getFromCache<OverviewMetrics>(cacheKey)

    if (cached) return cached

    // In production, fetch from your data source
    const workflowTrends = generateWorkflowTrendData(7)
    const metrics = calculateOverviewMetrics(workflowTrends)

    this.setCache(cacheKey, metrics)
    return metrics
  }

  /**
   * Get workflow trend data
   */
  async getWorkflowTrends(params: AnalyticsQueryParams = {}): Promise<WorkflowTrendData[]> {
    const cacheKey = `trends-${JSON.stringify(params)}`
    const cached = this.getFromCache<WorkflowTrendData[]>(cacheKey)

    if (cached) return cached

    const days = params.days || 7
    const data = generateWorkflowTrendData(days)

    this.setCache(cacheKey, data)
    return data
  }

  /**
   * Get node performance data
   */
  async getNodePerformance(workflowId?: string): Promise<NodePerformanceData[]> {
    const cacheKey = `node-perf-${workflowId || 'all'}`
    const cached = this.getFromCache<NodePerformanceData[]>(cacheKey)

    if (cached) return cached

    const data = generateNodePerformanceData()

    this.setCache(cacheKey, data)
    return data
  }

  /**
   * Get resource usage data
   */
  async getResourceUsage(hours: number = 24): Promise<ResourceUsageData[]> {
    const cacheKey = `resources-${hours}`
    const cached = this.getFromCache<ResourceUsageData[]>(cacheKey)

    if (cached) return cached

    const data = generateResourceUsageData(hours)

    this.setCache(cacheKey, data)
    return data
  }

  /**
   * Get all analytics metrics
   */
  async getAllMetrics(params: AnalyticsQueryParams = {}): Promise<AnalyticsMetrics> {
    const [overview, workflowTrends, nodePerformance, resourceUsage] = await Promise.all([
      this.getOverviewMetrics(),
      this.getWorkflowTrends(params),
      this.getNodePerformance(params.workflowId),
      this.getResourceUsage(24),
    ])

    const anomalies = this.detectPerformanceAnomalies(workflowTrends)

    return {
      overview,
      workflowTrends,
      nodePerformance,
      resourceUsage,
      anomalies,
    }
  }

  /**
   * Detect performance anomalies
   */
  private detectPerformanceAnomalies(trends: WorkflowTrendData[]): AnomalyData[] {
    const anomalies: AnomalyData[] = []

    const executionValues = trends.map(t => t.total)
    const durationValues = trends.map(t => t.avgDuration)

    const executionAnomalies = detectAnomalies(executionValues, 2)
    const durationAnomalies = detectAnomalies(durationValues, 2)

    executionAnomalies.forEach(({ index, value, threshold }) => {
      anomalies.push({
        timestamp: trends[index].date,
        type: 'performance',
        severity: value > threshold * 1.5 ? 'high' : 'medium',
        message: `Execution count spike detected`,
        value,
        threshold,
      })
    })

    durationAnomalies.forEach(({ index, value, threshold }) => {
      anomalies.push({
        timestamp: trends[index].date,
        type: 'performance',
        severity: value > threshold * 1.5 ? 'high' : 'medium',
        message: `Execution time spike detected`,
        value,
        threshold,
      })
    })

    return anomalies.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }

  /**
   * Get cache data
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const now = Date.now()
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key)
      return null
    }

    return cached.data as T
  }

  /**
   * Set cache data
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService()

// Export factory function for testing
export function createAnalyticsService(): AnalyticsService {
  return new AnalyticsService()
}

// Export types for external use
export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | 'custom'
export type TrendData = {
  timestamp: string
  value: number
  label?: string
}
export type WorkflowStats = {
  totalExecutions: number
  successRate: number
  avgExecutionTime: number
  failedCount: number
}
export type ExecutionDetail = {
  id: string
  workflowId: string
  status: 'success' | 'failed' | 'running'
  startTime: string
  endTime?: string
  duration?: number
}
