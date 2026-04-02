/**
 * Root Cause Analysis Types
 *
 * Type definitions for the root cause analysis system
 */

// ============================================================================
// Severity Levels
// ============================================================================

export type SeverityLevel = 'info' | 'low' | 'medium' | 'high' | 'critical'

export interface Severity {
  level: SeverityLevel
  score: number // 0-100
  label: string
}

// ============================================================================
// Root Cause Types
// ============================================================================

export type RootCauseType =
  | 'database'
  | 'api'
  | 'rendering'
  | 'resource'
  | 'network'
  | 'memory'
  | 'cpu'
  | 'bundle-size'
  | 'hydration'

// ============================================================================
// Database Query Issues
// ============================================================================

export type DatabaseIssueType =
  | 'full-scan'
  | 'large-result'
  | 'missing-index'
  | 'n-plus-1'
  | 'inefficient-where'
  | 'slow-query'
  | 'connection-pool-exhausted'
  | 'lock-wait'

export interface DatabaseQuery {
  id: string
  query: string
  duration: number // milliseconds
  rowCount?: number
  timestamp: number
  table?: string
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  issues: DatabaseIssueType[]
  executionPlan?: ExecutionPlan
  affectedRows?: number
}

export interface ExecutionPlan {
  scanType: 'index' | 'full' | 'range'
  scanCount: number
  indexUsed?: string
  filterCost: number
  estimatedRows: number
}

export interface DatabaseAnalysis {
  slowQueries: DatabaseQuery[]
  queryStatistics: QueryStatistics
  criticalIssues: DatabaseIssue[]
  recommendations: DatabaseRecommendation[]
}

export interface QueryStatistics {
  totalQueries: number
  slowQueriesCount: number
  averageDuration: number
  slowQueryThreshold: number
  queriesByTable: Map<string, number>
  queriesByType: Map<DatabaseIssueType, number>
  topSlowQueries: DatabaseQuery[]
}

export interface DatabaseIssue {
  id: string
  type: DatabaseIssueType
  severity: Severity
  description: string
  affectedQueries: DatabaseQuery[]
  impact: string
  table?: string
  index?: string
}

export interface DatabaseRecommendation {
  id: string
  type: DatabaseIssueType
  severity: Severity
  title: string
  description: string
  actionItems: string[]
  estimatedImpact: string
  complexity: 'low' | 'medium' | 'high'
  estimatedTime?: string
}

// ============================================================================
// API Response Issues
// ============================================================================

export type APIIssueType =
  | 'server-error'
  | 'client-error'
  | 'rate-limit'
  | 'timeout'
  | 'slow-response'
  | 'connection-error'
  | 'large-payload'
  | 'caching-miss'

export interface APIRequest {
  id: string
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  duration: number // milliseconds
  statusCode: number
  timestamp: number
  payloadSize?: number
  responseSize?: number
  issues: APIIssueType[]
  retryCount?: number
  cacheStatus?: 'hit' | 'miss' | 'stale'
}

export interface APIAnalysis {
  slowRequests: APIRequest[]
  requestStatistics: APIStatistics
  criticalIssues: APIIssue[]
  errorRateAnalysis: ErrorRateAnalysis
  recommendations: APIRecommendation[]
}

export interface APIStatistics {
  totalRequests: number
  averageDuration: number
  slowRequestThreshold: number
  requestsByEndpoint: Map<string, number>
  requestsByStatusCode: Map<number, number>
  requestsByIssueType: Map<APIIssueType, number>
  topSlowEndpoints: APIRequest[]
  errorRate: number
  averagePayloadSize: number
}

export interface APIIssue {
  id: string
  type: APIIssueType
  severity: Severity
  description: string
  affectedRequests: APIRequest[]
  endpoint: string
  impact: string
}

export interface ErrorRateAnalysis {
  overallErrorRate: number
  errorRateByEndpoint: Map<string, number>
  errorRateByStatus: Map<number, number>
  trend: 'increasing' | 'stable' | 'decreasing'
  spikeDetected: boolean
}

export interface APIRecommendation {
  id: string
  type: APIIssueType
  severity: Severity
  title: string
  description: string
  actionItems: string[]
  estimatedImpact: string
  complexity: 'low' | 'medium' | 'high'
  estimatedTime?: string
}

// ============================================================================
// Rendering Performance Issues
// ============================================================================

export type RenderingIssueType =
  | 'long-tasks'
  | 'layout-shift'
  | 'slow-lcp'
  | 'high-cls'
  | 'blocking-resource'
  | 'hydration-mismatch'
  | 'uncontrolled-renders'

export interface RenderingMetrics {
  id: string
  timestamp: number
  lcp?: number // Largest Contentful Paint (ms)
  cls?: number // Cumulative Layout Shift
  fid?: number // First Input Delay (ms)
  tbt?: number // Total Blocking Time (ms)
  fcp?: number // First Contentful Paint (ms)
  tti?: number // Time to Interactive (ms)
  longTaskCount: number
  longTaskDuration: number
  issues: RenderingIssueType[]
}

export interface RenderingAnalysis {
  metrics: RenderingMetrics[]
  criticalIssues: RenderingIssue[]
  bottlenecks: RenderingBottleneck[]
  recommendations: RenderingRecommendation[]
}

export interface RenderingIssue {
  id: string
  type: RenderingIssueType
  severity: Severity
  description: string
  affectedMetrics: RenderingMetrics[]
  impact: string
  component?: string
}

export interface RenderingBottleneck {
  id: string
  type: 'javascript' | 'styling' | 'layout' | 'paint' | 'network'
  severity: Severity
  description: string
  contribution: number // percentage contribution to overall issue
  source?: string
}

export interface RenderingRecommendation {
  id: string
  type: RenderingIssueType
  severity: Severity
  title: string
  description: string
  actionItems: string[]
  estimatedImpact: string
  complexity: 'low' | 'medium' | 'high'
  estimatedTime?: string
}

// ============================================================================
// Waterfall Analysis
// ============================================================================

export interface WaterfallEntry {
  id: string
  name: string
  type: 'navigation' | 'resource' | 'script' | 'stylesheet' | 'image' | 'xhr' | 'fetch'
  startTime: number
  duration: number
  size?: number
  status: 'complete' | 'error' | 'pending' | 'aborted'
  blockingTime: number
  criticalPath?: boolean
  priority?: number
}

export interface CriticalPathNode {
  entry: WaterfallEntry
  blockers: WaterfallEntry[]
  blockedBy: WaterfallEntry[]
  level: number
}

export interface WaterfallAnalysis {
  entries: WaterfallEntry[]
  criticalPath: CriticalPathNode[]
  bottlenecks: WaterfallBottleneck[]
  optimizationOpportunities: OptimizationOpportunity[]
  summary: WaterfallSummary
}

export interface WaterfallBottleneck {
  id: string
  type:
    | 'sequential-loading'
    | 'large-resource'
    | 'blocking-resource'
    | 'missing-compression'
    | 'no-cache'
  severity: Severity
  description: string
  affectedEntries: WaterfallEntry[]
  impact: string
  recommendation: string
}

export interface OptimizationOpportunity {
  id: string
  type: 'preload' | 'prefetch' | 'lazy-load' | 'compress' | 'inline' | 'defer' | 'async'
  target: string
  estimatedImprovement: number // percentage
  complexity: 'low' | 'medium' | 'high'
  description: string
}

export interface WaterfallSummary {
  totalDuration: number
  criticalPathDuration: number
  potentialImprovement: number
  parallelizationScore: number // 0-100
}

// ============================================================================
// Root Cause Analysis Result
// ============================================================================

export interface RootCause {
  id: string
  type: RootCauseType
  severity: Severity
  confidence: number // 0-100
  title: string
  description: string
  evidence: string[]
  impact: Impact
  fixRecommendations: FixRecommendation[]
  estimatedFixTime: string
  priority: number // 1-10
  detectedAt: number
}

export interface Impact {
  userExperience: string
  performance: string
  business?: string
}

export interface FixRecommendation {
  id: string
  title: string
  description: string
  actionItems: string[]
  complexity: 'low' | 'medium' | 'high'
  estimatedTime: string
  risk: 'low' | 'medium' | 'high'
  dependencies?: string[]
}

// ============================================================================
// Analysis Report
// ============================================================================

export interface AnalysisReport {
  id: string
  timestamp: number
  duration: number
  summary: ReportSummary
  rootCauses: RootCause[]
  prioritizedActions: PrioritizedAction[]
  metrics: PerformanceMetrics
  nextSteps: string[]
}

export interface ReportSummary {
  totalIssues: number
  criticalIssues: number
  highIssues: number
  mediumIssues: number
  lowIssues: number
  primaryRootCauses: string[]
  overallScore: number // 0-100
}

export interface PrioritizedAction {
  priority: number
  rootCauseId: string
  action: string
  estimatedImpact: string
  estimatedTime: string
  complexity: 'low' | 'medium' | 'high'
}

export interface PerformanceMetrics {
  lcp?: number
  cls?: number
  fid?: number
  tbt?: number
  databaseQueries?: number
  averageQueryTime?: number
  apiRequests?: number
  averageApiResponseTime?: number
  errorRate?: number
  totalBlockingTime?: number
}

// ============================================================================
// Configuration
// ============================================================================

export interface RootCauseAnalysisConfig {
  database: {
    slowQueryThreshold: number
    maxResultRows: number
    maxQueryDuration: number
    sensitiveDataPatterns: RegExp[]
  }
  api: {
    slowRequestThreshold: number
    maxPayloadSize: number
    errorRateThreshold: number
    timeoutThreshold: number
  }
  rendering: {
    lcpThreshold: number
    clsThreshold: number
    fidThreshold: number
    tbtThreshold: number
    longTaskThreshold: number
  }
  network: {
    slowResourceThreshold: number
    maxResourcesCount: number
  }
  history: {
    maxEntries: number
    retentionDays: number
  }
}

export const DEFAULT_CONFIG: RootCauseAnalysisConfig = {
  database: {
    slowQueryThreshold: 1000, // 1 second
    maxResultRows: 10000,
    maxQueryDuration: 10000, // 10 seconds
    sensitiveDataPatterns: [
      /password/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i,
      /credit[_-]?card/i,
      /ssn/i,
    ],
  },
  api: {
    slowRequestThreshold: 2000, // 2 seconds
    maxPayloadSize: 1024 * 1024, // 1MB
    errorRateThreshold: 0.05, // 5%
    timeoutThreshold: 30000, // 30 seconds
  },
  rendering: {
    lcpThreshold: 2500, // 2.5 seconds
    clsThreshold: 0.1,
    fidThreshold: 100, // 100ms
    tbtThreshold: 300, // 300ms
    longTaskThreshold: 50, // 50ms
  },
  network: {
    slowResourceThreshold: 1000, // 1 second
    maxResourcesCount: 200,
  },
  history: {
    maxEntries: 1000,
    retentionDays: 30,
  },
}
