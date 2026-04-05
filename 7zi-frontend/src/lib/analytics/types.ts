/**
 * Analytics Types
 *
 * Type definitions for the analytics system.
 */

/**
 * Overview metrics for the dashboard
 */
export interface OverviewMetrics {
  totalExecutions: number
  successRate: number
  avgExecutionTime: number
  activeWorkflows: number
  failedCount: number
  todayExecutions: number
  lastUpdated: string
}

/**
 * Workflow trend data point
 */
export interface WorkflowTrendData {
  date: string
  total: number
  success: number
  failed: number
  avgDuration: number
}

/**
 * Node performance data
 */
export interface NodePerformanceData {
  nodeType: string
  avgExecutionTime: number
  successRate: number
  p50: number
  p95: number
  p99: number
  errorTypes: Record<string, number>
}

/**
 * Resource usage data point
 */
export interface ResourceUsageData {
  timestamp: string
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkUsage: number
}

/**
 * Anomaly detection data
 */
export interface AnomalyData {
  timestamp: string
  type: 'performance' | 'error' | 'resource'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  value: number
  threshold: number
}

/**
 * Complete analytics metrics
 */
export interface AnalyticsMetrics {
  overview: OverviewMetrics
  workflowTrends: WorkflowTrendData[]
  nodePerformance: NodePerformanceData[]
  resourceUsage: ResourceUsageData[]
  anomalies: AnomalyData[]
}

/**
 * Analytics query parameters
 */
export interface AnalyticsQueryParams {
  startDate?: string
  endDate?: string
  workflowId?: string
  status?: 'success' | 'failed' | 'all'
  days?: number
}

/**
 * Export options
 */
export interface ExportOptions {
  type: 'pdf' | 'excel' | 'csv'
  dateRange: '7d' | '30d' | '90d' | 'custom'
  customStartDate?: string
  customEndDate?: string
  includeCharts?: boolean
  includeRawData?: boolean
}

/**
 * Report generation result
 */
export interface ReportResult {
  success: boolean
  reportId: string
  downloadUrl?: string
  error?: string
}