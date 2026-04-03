/**
 * Failure Detector
 *
 * Multi-dimensional failure detection system.
 * Identifies failures through timeout, error rate, and circuit breaker analysis.
 *
 * @version v1.10.0
 * @author Executor + 咨询师
 */

import type {
  HealthStatus,
  HealthSeverity,
  InstanceHealth,
  HealthAlert,
  HealthEvent,
  HealthEventType,
  HealthCheckResult
} from './types'

// ============================================
// Failure Detection Types
// ============================================

/**
 * Failure type classification
 */
export type FailureType =
  | 'timeout'
  | 'connection_refused'
  | 'connection_reset'
  | 'dns_failure'
  | 'ssl_error'
  | 'http_error'
  | 'error_rate_high'
  | 'response_time_high'
  | 'circuit_breaker_open'
  | 'health_check_fail'
  | 'dependency_failure'
  | 'memory_exhausted'
  | 'cpu_overload'
  | 'unknown'

/**
 * Failure severity levels
 */
export type FailureSeverity = 'critical' | 'high' | 'medium' | 'low'

/**
 * Failure record
 */
export interface FailureRecord {
  /** Failure ID */
  id: string
  /** Instance ID */
  instanceId: string
  /** Failure type */
  type: FailureType
  /** Failure severity */
  severity: FailureSeverity
  /** Failure timestamp */
  timestamp: string
  /** Failure message */
  message: string
  /** Additional details */
  details: Record<string, unknown>
  /** Number of occurrences */
  occurrences: number
  /** First occurrence timestamp */
  firstOccurrence: string
  /** Last occurrence timestamp */
  lastOccurrence: string
  /** Whether the failure is resolved */
  resolved: boolean
  /** Resolution timestamp */
  resolvedAt?: string
  /** Root cause hypothesis */
  rootCauseHypothesis?: string
  /** Related failures */
  relatedFailures: string[]
}

/**
 * Failure detection rule
 */
export interface FailureDetectionRule {
  /** Rule ID */
  id: string
  /** Rule name */
  name: string
  /** Failure type this rule detects */
  failureType: FailureType
  /** Condition expression */
  condition: (context: DetectionContext) => boolean
  /** Severity calculator */
  severity: (context: DetectionContext) => FailureSeverity
  /** Message template */
  messageTemplate: string
  /** Whether rule is enabled */
  enabled: boolean
}

/**
 * Detection context
 */
export interface DetectionContext {
  instanceId: string
  instanceHealth: InstanceHealth
  recentResults: HealthCheckResult[]
  metrics: {
    avgResponseTime: number
    errorRate: number
    consecutiveFailures: number
    timeSinceLastSuccess: number
  }
  timestamp: string
}

/**
 * Failure detector configuration
 */
export interface FailureDetectorConfig {
  /** Enable timeout detection */
  detectTimeouts: boolean
  /** Timeout threshold (ms) */
  timeoutThresholdMs: number
  /** Enable error rate detection */
  detectErrorRate: boolean
  /** Error rate threshold (0-1) */
  errorRateThreshold: number
  /** Enable response time detection */
  detectResponseTime: boolean
  /** Response time threshold (ms) */
  responseTimeThresholdMs: number
  /** Enable circuit breaker detection */
  detectCircuitBreaker: boolean
  /** Time window for analysis (ms) */
  timeWindowMs: number
  /** Minimum samples for detection */
  minSamples: number
  /** Enable automatic alerting */
  enableAlerting: boolean
  /** Custom detection rules */
  customRules: FailureDetectionRule[]
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_CONFIG: FailureDetectorConfig = {
  detectTimeouts: true,
  timeoutThresholdMs: 5000,
  detectErrorRate: true,
  errorRateThreshold: 0.1, // 10%
  detectResponseTime: true,
  responseTimeThresholdMs: 2000,
  detectCircuitBreaker: true,
  timeWindowMs: 60000,
  minSamples: 5,
  enableAlerting: true,
  customRules: []
}

// ============================================
// Failure Detector
// ============================================

/**
 * Failure Detector
 * 
 * Analyzes health check results and metrics to detect failures.
 */
export class FailureDetector {
  private config: FailureDetectorConfig
  private failures: Map<string, FailureRecord[]> = new Map()
  private alerts: Map<string, HealthAlert> = new Map()
  private eventCallbacks: ((event: HealthEvent) => void)[] = []
  private rules: FailureDetectionRule[]

  constructor(config: Partial<FailureDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.rules = this.buildBuiltInRules()
    if (this.config.customRules.length > 0) {
      this.rules.push(...this.config.customRules)
    }
  }

  /**
   * Analyze instance health for failures
   */
  analyze(
    instanceId: string,
    instanceHealth: InstanceHealth,
    recentResults: HealthCheckResult[]
  ): FailureRecord[] {
    const context = this.buildContext(instanceId, instanceHealth, recentResults)
    const detectedFailures: FailureRecord[] = []

    for (const rule of this.rules) {
      if (!rule.enabled) continue

      try {
        if (rule.condition(context)) {
          const severity = rule.severity(context)
          const failure = this.recordFailure(instanceId, rule, context, severity)
          detectedFailures.push(failure)
        }
      } catch {
        // Rule execution failed, skip
      }
    }

    // Update existing failures or create new ones
    for (const failure of detectedFailures) {
      this.addOrUpdateFailure(instanceId, failure)
    }

    // Generate alerts for new failures
    if (this.config.enableAlerting) {
      for (const failure of detectedFailures) {
        this.generateAlert(failure)
      }
    }

    return detectedFailures
  }

  /**
   * Get failures for an instance
   */
  getFailures(instanceId: string, includeResolved = false): FailureRecord[] {
    const failures = this.failures.get(instanceId) || []
    return includeResolved ? failures : failures.filter((f) => !f.resolved)
  }

  /**
   * Get all active failures
   */
  getAllFailures(): Map<string, FailureRecord[]> {
    const result = new Map<string, FailureRecord[]>()
    for (const [instanceId, failures] of this.failures) {
      const active = failures.filter((f) => !f.resolved)
      if (active.length > 0) {
        result.set(instanceId, active)
      }
    }
    return result
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): HealthAlert[] {
    return Array.from(this.alerts.values()).filter((a) => a.status === 'active')
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId)
    if (alert) {
      alert.status = 'acknowledged'
      alert.acknowledgedBy = acknowledgedBy
      return true
    }
    return false
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId)
    if (alert) {
      alert.status = 'resolved'
      alert.resolvedAt = new Date().toISOString()
      return true
    }
    return false
  }

  /**
   * Mark a failure as resolved
   */
  resolveFailure(instanceId: string, failureId: string): boolean {
    const failures = this.failures.get(instanceId)
    if (failures) {
      const failure = failures.find((f) => f.id === failureId)
      if (failure) {
        failure.resolved = true
        failure.resolvedAt = new Date().toISOString()
        
        // Resolve associated alert
        for (const alert of this.alerts.values()) {
          if (alert.instanceId === instanceId && alert.name.includes(failure.type)) {
            this.resolveAlert(alert.id)
          }
        }
        
        return true
      }
    }
    return false
  }

  /**
   * Get failure statistics
   */
  getStatistics(): {
    totalFailures: number
    activeFailures: number
    resolvedFailures: number
    failuresByType: Record<FailureType, number>
    failuresBySeverity: Record<FailureSeverity, number>
  } {
    const allFailures = Array.from(this.failures.values()).flat()
    
    return {
      totalFailures: allFailures.length,
      activeFailures: allFailures.filter((f) => !f.resolved).length,
      resolvedFailures: allFailures.filter((f) => f.resolved).length,
      failuresByType: this.countByField(allFailures, 'type') as Record<FailureType, number>,
      failuresBySeverity: this.countByField(allFailures, 'severity') as Record<FailureSeverity, number>
    }
  }

  /**
   * Register event callback
   */
  onEvent(callback: (event: HealthEvent) => void): void {
    this.eventCallbacks.push(callback)
  }

  /**
   * Add custom detection rule
   */
  addRule(rule: FailureDetectionRule): void {
    this.rules.push(rule)
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FailureDetectorConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Clear all failures and alerts
   */
  clear(): void {
    this.failures.clear()
    this.alerts.clear()
  }

  // ============================================
  // Private Methods
  // ============================================

  private buildBuiltInRules(): FailureDetectionRule[] {
    return [
      // Timeout Detection
      {
        id: 'timeout-detection',
        name: 'Timeout Detection',
        failureType: 'timeout',
        condition: (ctx) => {
          if (!this.config.detectTimeouts) return false
          const recentTimeouts = ctx.recentResults.filter(
            (r) => r.durationMs >= this.config.timeoutThresholdMs || r.error?.type === 'timeout'
          )
          return recentTimeouts.length >= this.config.minSamples
        },
        severity: (ctx) => {
          const timeoutRate = ctx.recentResults.filter((r) => r.error?.type === 'timeout').length / ctx.recentResults.length
          return timeoutRate > 0.5 ? 'critical' : timeoutRate > 0.2 ? 'high' : 'medium'
        },
        messageTemplate: 'Instance experiencing timeouts (rate: {{rate}})',
        enabled: true
      },

      // Error Rate Detection
      {
        id: 'error-rate-detection',
        name: 'High Error Rate Detection',
        failureType: 'error_rate_high',
        condition: (ctx) => {
          if (!this.config.detectErrorRate) return false
          return ctx.metrics.errorRate >= this.config.errorRateThreshold
        },
        severity: (ctx) => {
          const rate = ctx.metrics.errorRate
          return rate > 0.5 ? 'critical' : rate > 0.3 ? 'high' : rate > 0.1 ? 'medium' : 'low'
        },
        messageTemplate: 'Error rate too high: {{errorRate}}',
        enabled: true
      },

      // Response Time Detection
      {
        id: 'response-time-detection',
        name: 'High Response Time Detection',
        failureType: 'response_time_high',
        condition: (ctx) => {
          if (!this.config.detectResponseTime) return false
          return ctx.metrics.avgResponseTime >= this.config.responseTimeThresholdMs
        },
        severity: (ctx) => {
          const ratio = ctx.metrics.avgResponseTime / this.config.responseTimeThresholdMs
          return ratio > 3 ? 'critical' : ratio > 2 ? 'high' : 'medium'
        },
        messageTemplate: 'Response time degraded: {{avgResponseTime}}ms',
        enabled: true
      },

      // Circuit Breaker Detection
      {
        id: 'circuit-breaker-detection',
        name: 'Circuit Breaker Open Detection',
        failureType: 'circuit_breaker_open',
        condition: (ctx) => {
          if (!this.config.detectCircuitBreaker) return false
          return ctx.instanceHealth.circuitBreakerState === 'open'
        },
        severity: () => 'critical',
        messageTemplate: 'Circuit breaker is open for instance',
        enabled: true
      },

      // Connection Failure Detection
      {
        id: 'connection-failure-detection',
        name: 'Connection Failure Detection',
        failureType: 'connection_refused',
        condition: (ctx) => {
          const recentConnectionErrors = ctx.recentResults.filter(
            (r) => r.error?.type === 'connection'
          )
          return recentConnectionErrors.length >= 3
        },
        severity: (ctx) => {
          const rate = ctx.metrics.consecutiveFailures / 10
          return rate > 0.5 ? 'critical' : rate > 0.3 ? 'high' : 'medium'
        },
        messageTemplate: 'Connection failures detected (consecutive: {{consecutiveFailures}})',
        enabled: true
      },

      // Health Check Failure Detection
      {
        id: 'health-check-failure-detection',
        name: 'Health Check Failure Detection',
        failureType: 'health_check_fail',
        condition: (ctx) => {
          return ctx.instanceHealth.status === 'unhealthy' && ctx.metrics.consecutiveFailures >= 3
        },
        severity: (ctx) => {
          return ctx.metrics.consecutiveFailures >= 5 ? 'critical' : 'high'
        },
        messageTemplate: 'Health checks failing (consecutive: {{consecutiveFailures}})',
        enabled: true
      }
    ]
  }

  private buildContext(
    instanceId: string,
    instanceHealth: InstanceHealth,
    recentResults: HealthCheckResult[]
  ): DetectionContext {
    const now = Date.now()
    const timeWindow = this.config.timeWindowMs
    const windowStart = now - timeWindow

    // Filter results within time window
    const windowResults = recentResults.filter(
      (r) => new Date(r.executedAt).getTime() >= windowStart
    )

    const avgResponseTime = this.average(windowResults.map((r) => r.durationMs))
    const errorCount = windowResults.filter((r) => !r.success).length
    const errorRate = windowResults.length > 0 ? errorCount / windowResults.length : 0

    const lastSuccess = instanceHealth.lastSuccess
      ? now - new Date(instanceHealth.lastSuccess).getTime()
      : Infinity

    return {
      instanceId,
      instanceHealth,
      recentResults: windowResults,
      metrics: {
        avgResponseTime,
        errorRate,
        consecutiveFailures: instanceHealth.consecutiveFailures,
        timeSinceLastSuccess: lastSuccess
      },
      timestamp: new Date().toISOString()
    }
  }

  private recordFailure(
    instanceId: string,
    rule: FailureDetectionRule,
    context: DetectionContext,
    severity: FailureSeverity
  ): FailureRecord {
    const id = this.generateId()
    const message = this.renderMessage(rule.messageTemplate, context)

    return {
      id,
      instanceId,
      type: rule.failureType,
      severity,
      timestamp: context.timestamp,
      message,
      details: {
        ruleId: rule.id,
        ruleName: rule.name,
        metrics: context.metrics
      },
      occurrences: 1,
      firstOccurrence: context.timestamp,
      lastOccurrence: context.timestamp,
      resolved: false,
      relatedFailures: []
    }
  }

  private addOrUpdateFailure(instanceId: string, newFailure: FailureRecord): void {
    if (!this.failures.has(instanceId)) {
      this.failures.set(instanceId, [])
    }

    const failures = this.failures.get(instanceId)!
    const existingIndex = failures.findIndex(
      (f) => f.type === newFailure.type && !f.resolved
    )

    if (existingIndex >= 0) {
      // Update existing failure
      const existing = failures[existingIndex]
      existing.occurrences++
      existing.lastOccurrence = newFailure.timestamp
      existing.severity = newFailure.severity // Update severity
      existing.message = newFailure.message
    } else {
      // Add new failure
      failures.push(newFailure)
      this.emitEvent('health.alert.triggered', instanceId, {
        failure: newFailure
      })
    }
  }

  private generateAlert(failure: FailureRecord): void {
    const alertId = `alert-${failure.id}`
    
    // Check if alert already exists
    if (this.alerts.has(alertId)) {
      return
    }

    const severity = this.mapSeverity(failure.severity)
    
    const alert: HealthAlert = {
      id: alertId,
      name: `${failure.type} - ${failure.instanceId}`,
      serviceId: failure.instanceId,
      instanceId: failure.instanceId,
      severity,
      status: 'active',
      message: failure.message,
      timestamp: failure.timestamp,
      relatedAlerts: failure.relatedFailures.map((f) => `alert-${f}`),
      labels: {
        failure_type: failure.type,
        severity: failure.severity
      },
      annotations: {
        occurrence_count: String(failure.occurrences)
      }
    }

    this.alerts.set(alertId, alert)
  }

  private renderMessage(template: string, context: DetectionContext): string {
    let message = template
    message = message.replace('{{rate}}', context.metrics.errorRate.toFixed(2))
    message = message.replace('{{errorRate}}', (context.metrics.errorRate * 100).toFixed(1) + '%')
    message = message.replace('{{avgResponseTime}}', context.metrics.avgResponseTime.toFixed(0))
    message = message.replace('{{consecutiveFailures}}', String(context.metrics.consecutiveFailures))
    return message
  }

  private mapSeverity(severity: FailureSeverity): HealthSeverity {
    const mapping: Record<FailureSeverity, HealthSeverity> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low'
    }
    return mapping[severity]
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return numbers.reduce((a, b) => a + b, 0) / numbers.length
  }

  private countByField<T extends string>(
    items: FailureRecord[],
    field: 'type' | 'severity'
  ): Record<T, number> {
    const result: Record<string, number> = {}
    for (const item of items) {
      const value = item[field] as string
      result[value] = (result[value] || 0) + 1
    }
    return result as Record<T, number>
  }

  private generateId(): string {
    return `fail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private emitEvent(type: HealthEventType, instanceId?: string, payload?: Record<string, unknown>): void {
    const event: HealthEvent = {
      id: this.generateId(),
      type,
      timestamp: new Date().toISOString(),
      instanceId,
      payload: payload || {},
      metadata: {
        source: 'FailureDetector'
      }
    }

    for (const callback of this.eventCallbacks) {
      try {
        callback(event)
      } catch {
        // Ignore callback errors
      }
    }
  }
}

export default FailureDetector
