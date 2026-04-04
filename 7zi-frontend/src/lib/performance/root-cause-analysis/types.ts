/**
 * Root Cause Analysis Types
 * 根因分析类型定义
 */

// ============================================
// Performance Context
// ============================================

export interface PerformanceContext {
  timestamp: number
  page?: string
  userAgent?: string
  network?: NetworkInfo
  slowQueries?: SlowQuery[]
  slowApis?: SlowAPICall[]
  rendering?: RenderingMetrics
  resources?: ResourceMetrics
  memory?: MemoryMetrics
  cpu?: CPUMetrics
}

export interface NetworkInfo {
  type: 'wifi' | '4g' | '5g' | '3g' | '2g' | 'unknown'
  rtt?: number
  downlink?: number
  effectiveType?: string
}

// ============================================
// Database Query Types
// ============================================

export interface SlowQuery {
  query: string
  duration: number
  rowCount: number
  timestamp: number
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  table?: string
  metadata?: Record<string, any>
}

export interface QueryPattern {
  pattern: string
  count: number
  avgDuration: number
  maxDuration: number
  totalRows: number
  tables: string[]
}

// ============================================
// API Types
// ============================================

export interface SlowAPICall {
  endpoint: string
  method: string
  duration: number
  statusCode: number
  timestamp: number
  error?: string
  requestSize?: number
  responseSize?: number
}

export interface APIEndpointStats {
  endpoint: string
  method: string
  count: number
  avgDuration: number
  maxDuration: number
  errorCount: number
  successRate: number
  lastAccessed: number
}

// ============================================
// Rendering Types
// ============================================

export interface RenderingMetrics {
  longTasks: number
  totalBlockingTime: number
  firstContentfulPaint?: number
  largestContentfulPaint?: number
  cumulativeLayoutShift?: number
  timeToInteractive?: number
  firstInputDelay?: number
  interactionToNextPaint?: number
}

export interface LongTask {
  taskName: string
  duration: number
  startTime: number
  component?: string
  attribution?: string
}

// ============================================
// Resource Types
// ============================================

export interface ResourceMetrics {
  totalSize: number
  count: number
  slowResources: SlowResource[]
  resourceTiming?: ResourceTiming[]
}

export interface SlowResource {
  type: 'script' | 'stylesheet' | 'image' | 'font' | 'video' | 'audio' | 'other'
  url: string
  size: number
  duration: number
  timestamp: number
  initiatorType?: string
  transferSize?: number
}

export interface ResourceTiming {
  name: string
  initiatorType: string
  startTime: number
  duration: number
  transferSize: number
  encodedBodySize: number
  decodedBodySize: number
}

// ============================================
// Memory & CPU Types
// ============================================

export interface MemoryMetrics {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  memoryUsage: number // percentage
}

export interface CPUMetrics {
  usage: number // percentage
  threads: number
  tasks: number
}

// ============================================
// Root Cause Analysis Types
// ============================================

/**
 * Details specific to database-related root causes
 */
export interface DatabaseRootCauseDetails {
  query: string
  executionTime: number
  table: string
  slowQuery?: boolean
}

/**
 * Details specific to API-related root causes
 */
export interface APIRootCauseDetails {
  endpoint: string
  method: string
  responseTime: number
  statusCode: number
}

/**
 * Details specific to rendering-related root causes
 */
export interface RenderingRootCauseDetails {
  component: string
  renderTime: number
  reRenderCount?: number
}

/**
 * Details specific to memory-related root causes
 */
export interface MemoryRootCauseDetails {
  heapUsed: number
  heapTotal: number
  external: number
  memoryLeakSuspect?: boolean
}

/**
 * Details specific to network-related root causes
 */
export interface NetworkRootCauseDetails {
  url: string
  requestSize: number
  responseSize: number
  latency: number
}

/**
 * Details for database analysis with aggregated metrics
 */
export interface DatabaseAnalysisDetails {
  totalSlowQueries: number
  avgDuration: number
  maxDuration: number
  slowestQuery: {
    query: string
    duration: number
    type: string
    rowCount: number
  }
  issues: string[]
}

/**
 * Details for API analysis with aggregated metrics
 */
export interface APIAnalysisDetails {
  totalSlowApis: number
  avgDuration: number
  errorCount: number
  errorRate: number
  slowestApi: {
    endpoint: string
    method: string
    duration: number
    statusCode: number
  }
  issues: string[]
}

/**
 * Details for resource analysis
 */
export interface ResourceAnalysisDetails {
  totalSize: number
  slowResourcesCount: number
  resourcesByType: Record<string, { count: number; totalSize: number }>
}

/**
 * Details for memory analysis
 */
export interface MemoryAnalysisDetails {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  memoryUsage: number
}

/**
 * Union type for all root cause details
 */
export type RootCauseDetails = 
  | DatabaseRootCauseDetails 
  | APIRootCauseDetails 
  | RenderingRootCauseDetails 
  | MemoryRootCauseDetails 
  | NetworkRootCauseDetails
  | DatabaseAnalysisDetails
  | APIAnalysisDetails
  | ResourceAnalysisDetails
  | MemoryAnalysisDetails
  | RenderingMetrics
  | NetworkInfo
  | CPUMetrics

export interface RootCauseCandidate {
  type: 'database' | 'api' | 'rendering' | 'resource' | 'network' | 'memory' | 'cpu' | 'code'
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number // 0-1
  description: string
  details: RootCauseDetails
  suggestedActions: string[]
  estimatedFixTime?: string
  relatedMetrics?: string[]
}

export interface RootCause {
  metric: string
  timestamp: number
  candidates: RootCauseCandidate[]
  primaryCause: RootCauseCandidate | null
  analyzedAt: number
  context?: PerformanceContext
}

export interface RootCauseAnalysisResult {
  rootCause: RootCause
  recommendations: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  estimatedImpact: string
  quickWins: string[]
}

// ============================================
// Configuration Types
// ============================================

export interface RootCauseAnalysisConfig {
  enabled: boolean
  slowQueryThreshold: number // ms
  slowAPIThreshold: number // ms
  longTaskThreshold: number // ms
  resourceSizeThreshold: number // bytes
  minConfidence: number
  maxCandidates: number
  analysisDepth: 'basic' | 'standard' | 'deep'
  enableMLAnalysis: boolean
  enableTrendAnalysis: boolean
}

export const DEFAULT_ROOT_CAUSE_CONFIG: RootCauseAnalysisConfig = {
  enabled: true,
  slowQueryThreshold: 1000, // 1 秒
  slowAPIThreshold: 2000, // 2 秒
  longTaskThreshold: 50, // 50ms
  resourceSizeThreshold: 1024 * 1024, // 1MB
  minConfidence: 0.6,
  maxCandidates: 5,
  analysisDepth: 'standard',
  enableMLAnalysis: false,
  enableTrendAnalysis: true,
}

// ============================================
// Alert Types
// ============================================

export interface RootCauseAlert {
  id: string
  timestamp: number
  metric: string
  rootCause: RootCause
  acknowledged: boolean
  resolvedAt?: number
  notifiedChannels: string[]
}

// ============================================
// Utility Types
// ============================================

export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type RootCauseType =
  | 'database'
  | 'api'
  | 'rendering'
  | 'resource'
  | 'network'
  | 'memory'
  | 'cpu'
  | 'code'

export interface SeverityScore {
  low: 1
  medium: 2
  high: 3
  critical: 4
}

export const SEVERITY_SCORES: SeverityScore = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}
