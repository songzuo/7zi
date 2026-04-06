// @ts-nocheck
/**
 * API Rate Limiting & Security Dashboard - Type Definitions
 * API 限流与安全仪表板 - 类型定义
 */

// ============================================================================
// Rate Limit Rule Types
// ============================================================================

export interface RateLimitRule {
  id: string
  name: string
  description?: string
  pattern: string
  algorithm: 'sliding-window' | 'token-bucket'
  windowMs: number
  maxRequests: number
  keyType: 'ip' | 'user' | 'api-key' | 'custom'
  priority: number
  enabled: boolean
  createdAt: number
  updatedAt: number
}

export interface CreateRateLimitRuleDTO {
  name: string
  description?: string
  pattern: string
  algorithm: 'sliding-window' | 'token-bucket'
  windowMs: number
  maxRequests: number
  keyType: 'ip' | 'user' | 'api-key' | 'custom'
  priority?: number
  enabled?: boolean
}

export interface UpdateRateLimitRuleDTO {
  name?: string
  description?: string
  pattern?: string
  algorithm?: 'sliding-window' | 'token-bucket'
  windowMs?: number
  maxRequests?: number
  keyType?: 'ip' | 'user' | 'api-key' | 'custom'
  priority?: number
  enabled?: boolean
}

// ============================================================================
// Blacklist/Whitelist Types
// ============================================================================

export interface BlacklistEntry {
  id: string
  type: 'ip' | 'user-id' | 'api-key' | 'email'
  value: string
  reason?: string
  expiresAt?: number | null
  createdBy?: string
  createdAt: number
}

export interface WhitelistEntry {
  id: string
  type: 'ip' | 'user-id' | 'api-key' | 'email'
  value: string
  description?: string
  createdBy?: string
  createdAt: number
}

export interface CreateBlacklistEntryDTO {
  type: 'ip' | 'user-id' | 'api-key' | 'email'
  value: string
  reason?: string
  expiresAt?: number | null
}

export interface CreateWhitelistEntryDTO {
  type: 'ip' | 'user-id' | 'api-key' | 'email'
  value: string
  description?: string
}

// ============================================================================
// Rate Limit Event Types
// ============================================================================

export interface RateLimitEvent {
  id: string
  identifier: string
  path: string
  ruleId?: string
  allowed: boolean
  remaining: number
  limit: number
  algorithm: 'sliding-window' | 'token-bucket'
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface RateLimitStatus {
  allowed: boolean
  remaining: number
  resetTime: number
  limit: number
  algorithm: 'sliding-window' | 'token-bucket'
  currentCount?: number
  tokensAvailable?: number
}

// ============================================================================
// Attack Event Types
// ============================================================================

export interface AttackEvent {
  id: string
  type: 'ddos' | 'brute-force' | 'sql-injection' | 'xss' | 'other'
  identifier: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description?: string
  evidence?: Record<string, unknown>
  detectedAt: number
  resolved: boolean
  resolvedAt?: number
  resolvedBy?: string
}

// ============================================================================
// Security Alert Types
// ============================================================================

export interface SecurityAlert {
  id: string
  type: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message?: string
  metadata?: Record<string, unknown>
  dismissed: boolean
  dismissedAt?: number
  dismissedBy?: string
  createdAt: number
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface RateLimitStatistics {
  totalRequests: number
  allowedRequests: number
  blockedRequests: number
  blockRate: number
  topViolators: Violator[]
  topPaths: PathStats[]
  timeSeriesData: TimeSeriesDataPoint[]
}

export interface Violator {
  identifier: string
  violations: number
  lastViolation: number
  severity: 'low' | 'medium' | 'high'
}

export interface PathStats {
  path: string
  requests: number
  violations: number
  blockRate: number
}

export interface TrafficStatistics {
  totalRequests: number
  uniqueIdentifiers: number
  averageRequestsPerSecond: number
  peakRequestsPerSecond: number
  timeSeriesData: TimeSeriesDataPoint[]
}

export interface ViolationStatistics {
  totalViolations: number
  byType: Record<string, number>
  bySeverity: Record<string, number>
  timeSeriesData: TimeSeriesDataPoint[]
}

export interface TimeSeriesDataPoint {
  timestamp: number
  value: number
  label?: string
}

export interface TimeRange {
  start: number
  end: number
}

export interface TrendData {
  timestamp: number
  value: number
  trend: 'up' | 'down' | 'stable'
  changePercent?: number
}

export interface Anomaly {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
  detectedAt: number
  metrics: Record<string, number>
  threshold: number
  actualValue: number
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginationResponse<T> {
  items: T[]
  meta: {
    currentPage: number
    perPage: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

// ============================================================================
// Filter Types
// ============================================================================

export interface RuleFilters {
  enabled?: boolean
  algorithm?: 'sliding-window' | 'token-bucket'
  keyType?: 'ip' | 'user' | 'api-key' | 'custom'
  search?: string
}

export interface SecurityFilters {
  type?: 'ip' | 'user-id' | 'api-key' | 'email'
  severity?: 'low' | 'medium' | 'high' | 'critical'
  resolved?: boolean
  dismissed?: boolean
  timeRange?: TimeRange
}

export interface AnalyticsFilters {
  timeRange?: string | TimeRange
  metric?: string
}

// ============================================================================
// Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: number
}

export interface ApiError {
  success: false
  error: string
  details?: Record<string, unknown>
  timestamp: number
}

// ============================================================================
// Dashboard State Types
// ============================================================================

export interface DashboardStats {
  totalRequests: number
  blockedRequests: number
  requestChange: number
  blockChange: number
  activeRules: number
  alerts: number
  alertSeverity: 'info' | 'warning' | 'error' | 'critical'
}

export interface DashboardData {
  stats: DashboardStats
  trafficData: TimeSeriesDataPoint[]
  violationData: TimeSeriesDataPoint[]
  topViolators: Violator[]
  recentAlerts: SecurityAlert[]
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface RateLimitDashboardConfig {
  database: {
    path: string
    maxConnections: number
  }
  redis: {
    enabled: boolean
    host?: string
    port?: number
    password?: string
  }
  analytics: {
    retentionDays: number
    aggregationInterval: number
    anomalyThreshold: number
  }
  alerts: {
    enabled: boolean
    channels: string[]
    webhookUrl?: string
    emailRecipients?: string[]
  }
  security: {
    ipHashSalt: string
    auditLogEnabled: boolean
    auditLogRetentionDays: number
  }
  ui: {
    refreshInterval: number
    maxChartPoints: number
    defaultTimeRange: string
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
