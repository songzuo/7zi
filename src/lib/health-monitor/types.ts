/**
 * Health Monitor Types
 *
 * Core types and interfaces for the microservice health monitoring system.
 * Supports 50+ service instances with configurable check intervals.
 *
 * @version v1.10.0
 * @author Executor + 咨询师
 */

// ============================================
// Health Status
// ============================================

/**
 * Overall health status of a service
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

/**
 * Component health status (more granular)
 */
export type ComponentStatus = 'up' | 'down' | 'warning' | 'maintenance'

/**
 * Severity levels for health issues
 */
export type HealthSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

/**
 * Health check type
 */
export type HealthCheckType = 
  | 'liveness'      // Is the service running?
  | 'readiness'     // Is the service ready to accept traffic?
  | 'startup'       // Has the service finished starting?
  | 'dependency'    // Are dependencies healthy?
  | 'custom'        // Custom health check

// ============================================
// Service Registration
// ============================================

/**
 * Service instance registration
 */
export interface ServiceInstance {
  /** Unique instance identifier */
  id: string
  /** Service name */
  name: string
  /** Service version */
  version: string
  /** Instance endpoint URL */
  endpoint: string
  /** Health check endpoint path */
  healthPath: string
  /** Service tags for grouping */
  tags: string[]
  /** Service metadata */
  metadata: Record<string, unknown>
  /** Registration timestamp */
  registeredAt: string
  /** Last heartbeat timestamp */
  lastHeartbeat?: string
  /** Instance weight for load balancing */
  weight: number
  /** Priority for failover (lower = higher priority) */
  priority: number
}

/**
 * Service group for logical grouping
 */
export interface ServiceGroup {
  /** Group identifier */
  id: string
  /** Group name */
  name: string
  /** Group description */
  description?: string
  /** Services in this group */
  services: string[]
  /** Group-level health check config */
  healthCheckConfig?: Partial<HealthCheckConfig>
  /** Minimum healthy instances required */
  minHealthyInstances: number
  /** Group status */
  status: HealthStatus
}

// ============================================
// Health Check Protocol
// ============================================

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /** Check interval in milliseconds */
  intervalMs: number
  /** Timeout for each check in milliseconds */
  timeoutMs: number
  /** Number of consecutive failures before marking unhealthy */
  failureThreshold: number
  /** Number of consecutive successes before marking healthy */
  successThreshold: number
  /** Enable parallel health checks */
  parallel: boolean
  /** Maximum concurrent checks */
  maxConcurrent: number
  /** Retry configuration */
  retry: RetryConfig
  /** Enable circuit breaker */
  circuitBreaker: CircuitBreakerConfig
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Enable retries */
  enabled: boolean
  /** Maximum retry attempts */
  maxAttempts: number
  /** Initial delay in milliseconds */
  initialDelayMs: number
  /** Maximum delay in milliseconds */
  maxDelayMs: number
  /** Backoff multiplier */
  backoffMultiplier: number
  /** Jitter factor (0-1) */
  jitterFactor: number
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Enable circuit breaker */
  enabled: boolean
  /** Number of failures to trip the circuit */
  failureThreshold: number
  /** Percentage of failures to trip the circuit */
  failureRateThreshold: number
  /** Time window for calculating failure rate (ms) */
  timeWindowMs: number
  /** Time to wait before attempting to close circuit (ms) */
  resetTimeoutMs: number
  /** Minimum requests in time window to calculate failure rate */
  minimumNumberOfCalls: number
}

/**
 * Health check request
 */
export interface HealthCheckRequest {
  /** Service instance ID */
  instanceId: string
  /** Check type */
  type: HealthCheckType
  /** Request timestamp */
  timestamp: string
  /** Request ID for tracing */
  requestId: string
  /** Additional parameters */
  params?: Record<string, unknown>
}

/**
 * Health check response (standard format)
 */
export interface HealthCheckResponse {
  /** Overall status */
  status: HealthStatus
  /** Service version */
  version?: string
  /** Response timestamp */
  timestamp: string
  /** Response time in milliseconds */
  responseTimeMs: number
  /** Individual component health */
  components: ComponentHealth[]
  /** Dependencies health */
  dependencies?: DependencyHealth[]
  /** Additional details */
  details?: Record<string, unknown>
  /** Error message if unhealthy */
  error?: HealthError
}

/**
 * Component health
 */
export interface ComponentHealth {
  /** Component name */
  name: string
  /** Component status */
  status: ComponentStatus
  /** Component type (database, cache, queue, etc.) */
  type: string
  /** Optional message */
  message?: string
  /** Component-specific details */
  details?: Record<string, unknown>
  /** Response time for this component */
  responseTimeMs?: number
}

/**
 * Dependency health
 */
export interface DependencyHealth {
  /** Dependency name */
  name: string
  /** Dependency status */
  status: HealthStatus
  /** Dependency endpoint */
  endpoint?: string
  /** Response time */
  responseTimeMs?: number
  /** Error if unhealthy */
  error?: string
}

/**
 * Health error
 */
export interface HealthError {
  /** Error code */
  code: string
  /** Error message */
  message: string
  /** Error type */
  type: 'timeout' | 'connection' | 'response' | 'parse' | 'unknown'
  /** Stack trace if available */
  stack?: string
  /** Additional error details */
  details?: Record<string, unknown>
}

// ============================================
// Health Check Result
// ============================================

/**
 * Result of a health check execution
 */
export interface HealthCheckResult {
  /** Check request */
  request: HealthCheckRequest
  /** Check response */
  response: HealthCheckResponse
  /** Whether the check was successful */
  success: boolean
  /** Execution duration in milliseconds */
  durationMs: number
  /** Timestamp when check was executed */
  executedAt: string
  /** Attempt number (for retries) */
  attempt: number
  /** Error if failed */
  error?: HealthError
}

/**
 * Aggregated health for a service (across all instances)
 */
export interface ServiceHealth {
  /** Service name */
  serviceName: string
  /** Overall status */
  status: HealthStatus
  /** Total instances */
  totalInstances: number
  /** Healthy instances */
  healthyInstances: number
  /** Unhealthy instances */
  unhealthyInstances: number
  /** Degraded instances */
  degradedInstances: number
  /** Instance details */
  instances: InstanceHealth[]
  /** Last check timestamp */
  lastChecked: string
  /** Health score (0-100) */
  healthScore: number
  /** Service-level alerts */
  alerts: HealthAlert[]
}

/**
 * Health of a single instance
 */
export interface InstanceHealth {
  /** Instance ID */
  instanceId: string
  /** Instance endpoint */
  endpoint: string
  /** Current status */
  status: HealthStatus
  /** Circuit breaker state */
  circuitBreakerState: CircuitState
  /** Consecutive failures */
  consecutiveFailures: number
  /** Consecutive successes */
  consecutiveSuccesses: number
  /** Last check result */
  lastCheck?: HealthCheckResult
  /** Last successful check */
  lastSuccess?: string
  /** Last failure */
  lastFailure?: string
  /** Average response time (last 5 checks) */
  avgResponseTimeMs: number
  /** Response time history */
  responseTimeHistory: number[]
  /** Error rate (0-1) */
  errorRate: number
  /** Uptime percentage */
  uptimePercentage: number
  /** Total checks performed */
  totalChecks: number
  /** Total failures */
  totalFailures: number
}

/**
 * Circuit breaker state
 */
export type CircuitState = 'closed' | 'open' | 'half-open'

// ============================================
// Metrics & Monitoring
// ============================================

/**
 * Health metrics for a service
 */
export interface HealthMetrics {
  /** Service/instance identifier */
  id: string
  /** Metric timestamp */
  timestamp: string
  /** Response time metrics */
  responseTime: ResponseTimeMetrics
  /** Availability metrics */
  availability: AvailabilityMetrics
  /** Error metrics */
  errors: ErrorMetrics
  /** Throughput metrics */
  throughput: ThroughputMetrics
  /** Custom metrics */
  custom: CustomMetric[]
}

/**
 * Response time metrics
 */
export interface ResponseTimeMetrics {
  /** Average response time */
  avg: number
  /** Minimum response time */
  min: number
  /** Maximum response time */
  max: number
  /** P50 response time */
  p50: number
  /** P95 response time */
  p95: number
  /** P99 response time */
  p99: number
  /** Standard deviation */
  stdDev: number
}

/**
 * Availability metrics
 */
export interface AvailabilityMetrics {
  /** Uptime percentage (0-100) */
  uptimePercentage: number
  /** Total time monitored (ms) */
  totalMonitoredMs: number
  /** Total downtime (ms) */
  totalDowntimeMs: number
  /** Number of downtime incidents */
  downtimeIncidents: number
  /** MTTR (Mean Time To Recovery) in ms */
  mttr: number
  /** MTBF (Mean Time Between Failures) in ms */
  mtbf: number
}

/**
 * Error metrics
 */
export interface ErrorMetrics {
  /** Total errors */
  total: number
  /** Error rate (0-1) */
  rate: number
  /** Errors by type */
  byType: Record<string, number>
  /** Errors by code */
  byCode: Record<string, number>
  /** Last error timestamp */
  lastError?: string
}

/**
 * Throughput metrics
 */
export interface ThroughputMetrics {
  /** Requests per second */
  rps: number
  /** Total requests in time window */
  totalRequests: number
  /** Successful requests */
  successfulRequests: number
  /** Failed requests */
  failedRequests: number
}

/**
 * Custom metric
 */
export interface CustomMetric {
  /** Metric name */
  name: string
  /** Metric value */
  value: number
  /** Metric unit */
  unit: string
  /** Metric labels */
  labels: Record<string, string>
}

// ============================================
// Alerts & Notifications
// ============================================

/**
 * Health alert
 */
export interface HealthAlert {
  /** Alert ID */
  id: string
  /** Alert name */
  name: string
  /** Affected service */
  serviceId: string
  /** Affected instance (optional) */
  instanceId?: string
  /** Alert severity */
  severity: HealthSeverity
  /** Alert status */
  status: 'active' | 'resolved' | 'acknowledged' | 'silenced'
  /** Alert message */
  message: string
  /** Alert timestamp */
  timestamp: string
  /** When the alert was resolved */
  resolvedAt?: string
  /** Who acknowledged the alert */
  acknowledgedBy?: string
  /** Runbook URL */
  runbookUrl?: string
  /** Related alerts */
  relatedAlerts: string[]
  /** Alert labels */
  labels: Record<string, string>
  /** Alert annotations */
  annotations: Record<string, string>
}

/**
 * Alert rule definition
 */
export interface AlertRule {
  /** Rule ID */
  id: string
  /** Rule name */
  name: string
  /** Rule description */
  description?: string
  /** Rule expression */
  expression: string
  /** Severity when triggered */
  severity: HealthSeverity
  /** Duration before alerting */
  duration: string
  /** Alert labels */
  labels: Record<string, string>
  /** Alert annotations */
  annotations: Record<string, string>
  /** Whether rule is enabled */
  enabled: boolean
  /** Notification channels */
  channels: string[]
}

// ============================================
// Health Report
// ============================================

/**
 * Comprehensive health report
 */
export interface HealthReport {
  /** Report ID */
  id: string
  /** Report timestamp */
  timestamp: string
  /** Report time range */
  timeRange: {
    start: string
    end: string
  }
  /** Overall system health */
  overallStatus: HealthStatus
  /** System health score */
  overallScore: number
  /** Service health summaries */
  services: ServiceHealth[]
  /** Active alerts */
  activeAlerts: HealthAlert[]
  /** Recent incidents */
  incidents: HealthIncident[]
  /** Recommendations */
  recommendations: HealthRecommendation[]
  /** Dashboard summary */
  dashboard: HealthDashboardSummary
}

/**
 * Health incident
 */
export interface HealthIncident {
  /** Incident ID */
  id: string
  /** Incident title */
  title: string
  /** Affected services */
  services: string[]
  /** Incident status */
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  /** Incident severity */
  severity: HealthSeverity
  /** Start time */
  startedAt: string
  /** End time */
  endedAt?: string
  /** Duration in seconds */
  duration?: number
  /** Root cause */
  rootCause?: string
  /** Resolution summary */
  resolution?: string
  /** Timeline events */
  timeline: IncidentTimelineEvent[]
}

/**
 * Incident timeline event
 */
export interface IncidentTimelineEvent {
  /** Event timestamp */
  timestamp: string
  /** Event type */
  type: 'detected' | 'acknowledged' | 'investigating' | 'identified' | 'fixed' | 'resolved'
  /** Event description */
  description: string
  /** Actor (user or system) */
  actor?: string
}

/**
 * Health recommendation
 */
export interface HealthRecommendation {
  /** Recommendation ID */
  id: string
  /** Priority (1-5, 1 being highest) */
  priority: number
  /** Recommendation type */
  type: 'performance' | 'reliability' | 'capacity' | 'security' | 'cost'
  /** Recommendation title */
  title: string
  /** Detailed description */
  description: string
  /** Affected services */
  affectedServices: string[]
  /** Expected impact */
  impact: string
  /** Implementation effort */
  effort: 'low' | 'medium' | 'high'
  /** Related metrics */
  relatedMetrics: string[]
}

// ============================================
// Dashboard
// ============================================

/**
 * Health dashboard summary
 */
export interface HealthDashboardSummary {
  /** Total services */
  totalServices: number
  /** Healthy services */
  healthyServices: number
  /** Degraded services */
  degradedServices: number
  /** Unhealthy services */
  unhealthyServices: number
  /** Total instances */
  totalInstances: number
  /** Healthy instances */
  healthyInstances: number
  /** Active alerts count */
  activeAlerts: number
  /** Critical alerts count */
  criticalAlerts: number
  /** System uptime */
  systemUptime: number
  /** Average response time */
  avgResponseTimeMs: number
  /** Health trend (last 24h) */
  trend: HealthTrendPoint[]
}

/**
 * Health trend point
 */
export interface HealthTrendPoint {
  /** Timestamp */
  timestamp: string
  /** Health score at this point */
  score: number
  /** Status at this point */
  status: HealthStatus
  /** Number of healthy instances */
  healthyCount: number
  /** Number of unhealthy instances */
  unhealthyCount: number
}

// ============================================
// Events
// ============================================

/**
 * Health event (for event bus)
 */
export interface HealthEvent {
  /** Event ID */
  id: string
  /** Event type */
  type: HealthEventType
  /** Event timestamp */
  timestamp: string
  /** Related service */
  serviceId?: string
  /** Related instance */
  instanceId?: string
  /** Event payload */
  payload: Record<string, unknown>
  /** Event metadata */
  metadata: {
    source: string
    correlationId?: string
    traceId?: string
  }
}

/**
 * Health event types
 */
export type HealthEventType =
  | 'health.check.started'
  | 'health.check.completed'
  | 'health.check.failed'
  | 'health.status.changed'
  | 'health.alert.triggered'
  | 'health.alert.resolved'
  | 'health.incident.created'
  | 'health.incident.updated'
  | 'health.incident.resolved'
  | 'health.circuit.opened'
  | 'health.circuit.closed'
  | 'health.circuit.half-opened'
  | 'health.recovery.started'
  | 'health.recovery.completed'
  | 'health.recovery.failed'
  | 'health.monitor.started'
  | 'health.monitor.stopped'
  | 'health.service.registered'
  | 'health.service.unregistered'

// ============================================
// Configuration
// ============================================

/**
 * Health monitor configuration
 */
export interface HealthMonitorConfig {
  /** Global health check configuration */
  checkConfig: HealthCheckConfig
  /** Default check interval */
  defaultIntervalMs: number
  /** Maximum history size per instance */
  maxHistorySize: number
  /** Enable passive health reporting */
  enablePassiveReporting: boolean
  /** Passive reporting endpoint */
  passiveReportingEndpoint?: string
  /** Enable metrics collection */
  enableMetrics: boolean
  /** Metrics retention period (ms) */
  metricsRetentionMs: number
  /** Enable dashboard */
  enableDashboard: boolean
  /** Dashboard refresh interval (ms) */
  dashboardRefreshMs: number
  /** Alert notification channels */
  notificationChannels: NotificationChannel[]
  /** Logging configuration */
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'
    includeTimestamps: boolean
    includeMetadata: boolean
  }
}

/**
 * Notification channel configuration
 */
export interface NotificationChannel {
  /** Channel ID */
  id: string
  /** Channel type */
  type: 'email' | 'slack' | 'webhook' | 'pagerDuty' | 'telegram'
  /** Channel name */
  name: string
  /** Whether channel is enabled */
  enabled: boolean
  /** Channel-specific configuration */
  config: Record<string, unknown>
  /** Severity filter */
  severityFilter: HealthSeverity[]
}

/**
 * Default health check configuration
 */
export const DEFAULT_HEALTH_CHECK_CONFIG: HealthCheckConfig = {
  intervalMs: 30000, // 30 seconds
  timeoutMs: 5000, // 5 seconds
  failureThreshold: 3,
  successThreshold: 2,
  parallel: true,
  maxConcurrent: 10,
  retry: {
    enabled: true,
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.1
  },
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    failureRateThreshold: 0.5,
    timeWindowMs: 60000,
    resetTimeoutMs: 30000,
    minimumNumberOfCalls: 10
  }
}

/**
 * Default health monitor configuration
 */
export const DEFAULT_HEALTH_MONITOR_CONFIG: HealthMonitorConfig = {
  checkConfig: DEFAULT_HEALTH_CHECK_CONFIG,
  defaultIntervalMs: 30000,
  maxHistorySize: 100,
  enablePassiveReporting: true,
  enableMetrics: true,
  metricsRetentionMs: 3600000, // 1 hour
  enableDashboard: true,
  dashboardRefreshMs: 5000,
  notificationChannels: [],
  logging: {
    level: 'info',
    includeTimestamps: true,
    includeMetadata: true
  }
}
