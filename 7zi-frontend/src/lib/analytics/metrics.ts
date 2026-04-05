/**
 * Analytics Metrics Calculator
 *
 * Core metrics calculation logic for the analytics system.
 */

import type {
  OverviewMetrics,
  WorkflowTrendData,
  NodePerformanceData,
  ResourceUsageData,
} from './types'

/**
 * Calculate percentile from an array of numbers
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[index]
}

/**
 * Calculate average of an array of numbers
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, val) => sum + val, 0) / values.length
}

/**
 * Generate mock workflow trend data
 */
export function generateWorkflowTrendData(days: number = 7): WorkflowTrendData[] {
  const data: WorkflowTrendData[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    const total = Math.floor(Math.random() * 50) + 20
    const successRate = 0.85 + Math.random() * 0.12 // 85-97%
    const success = Math.floor(total * successRate)
    const failed = total - success // Ensure success + failed = total

    data.push({
      date: date.toISOString().split('T')[0],
      total,
      success,
      failed,
      avgDuration: Math.floor(Math.random() * 5000) + 2000, // 2-7 seconds
    })
  }

  return data
}

/**
 * Generate mock node performance data
 */
export function generateNodePerformanceData(): NodePerformanceData[] {
  const nodeTypes = ['Start', 'End', 'Task', 'Condition', 'Loop', 'Parallel', 'Agent', 'AI']

  return nodeTypes.map(nodeType => {
    const execTimes = Array.from({ length: 100 }, () => Math.random() * 5000 + 100)
    const successRate = 0.9 + Math.random() * 0.09

    return {
      nodeType,
      avgExecutionTime: calculateAverage(execTimes),
      successRate,
      p50: calculatePercentile(execTimes, 50),
      p95: calculatePercentile(execTimes, 95),
      p99: calculatePercentile(execTimes, 99),
      errorTypes: {
        timeout: Math.floor(Math.random() * 5),
        error: Math.floor(Math.random() * 3),
        cancelled: Math.floor(Math.random() * 2),
      },
    }
  })
}

/**
 * Generate mock resource usage data
 */
export function generateResourceUsageData(hours: number = 24): ResourceUsageData[] {
  const data: ResourceUsageData[] = []
  const now = new Date()

  for (let i = hours - 1; i >= 0; i--) {
    const timestamp = new Date(now)
    timestamp.setHours(timestamp.getHours() - i)

    data.push({
      timestamp: timestamp.toISOString(),
      cpuUsage: Math.random() * 60 + 20, // 20-80%
      memoryUsage: Math.random() * 50 + 40, // 40-90%
      diskUsage: Math.random() * 20 + 50, // 50-70%
      networkUsage: Math.random() * 30 + 5, // 5-35%
    })
  }

  return data
}

/**
 * Calculate overview metrics
 */
export function calculateOverviewMetrics(
  workflowTrends: WorkflowTrendData[],
  activeWorkflows: number = 12
): OverviewMetrics {
  const totalExecutions = workflowTrends.reduce((sum, day) => sum + day.total, 0)
  const totalSuccess = workflowTrends.reduce((sum, day) => sum + day.success, 0)
  const totalFailed = workflowTrends.reduce((sum, day) => sum + day.failed, 0)
  const totalDuration = workflowTrends.reduce((sum, day) => sum + day.avgDuration * day.total, 0)

  const successRate = totalExecutions > 0 ? (totalSuccess / totalExecutions) * 100 : 0
  const avgExecutionTime = totalExecutions > 0 ? totalDuration / totalExecutions : 0

  // Today's executions (last data point)
  const todayExecutions = workflowTrends.length > 0 ? workflowTrends[workflowTrends.length - 1].total : 0

  return {
    totalExecutions,
    successRate,
    avgExecutionTime,
    activeWorkflows,
    failedCount: totalFailed,
    todayExecutions,
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Detect anomalies in data
 */
export function detectAnomalies(
  data: number[],
  threshold: number = 2
): Array<{ index: number; value: number; threshold: number }> {
  if (data.length < 2) return []

  const mean = calculateAverage(data)
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
  const stdDev = Math.sqrt(variance)

  return data
    .map((value, index) => ({
      index,
      value,
      threshold: mean + threshold * stdDev,
    }))
    .filter(({ value, threshold }) => value > threshold)
}

/**
 * Calculate growth rate
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format number with commas
 */
export function formatNumber(value: number): string {
  return value.toLocaleString()
}