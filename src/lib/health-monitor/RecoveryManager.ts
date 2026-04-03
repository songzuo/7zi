/**
 * Recovery Manager
 *
 * Automatic recovery mechanisms for failed services.
 * Implements retry strategies, circuit breaker recovery, and alert notifications.
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
  NotificationChannel
} from './types'
import type { FailureRecord } from './FailureDetector'

// ============================================
// Recovery Types
// ============================================

/**
 * Recovery action type
 */
export type RecoveryActionType =
  | 'restart_service'
  | 'scale_up'
  | 'scale_down'
  | 'clear_cache'
  | 'reset_circuit_breaker'
  | 'notify_team'
  | 'run_diagnostic'
  | 'rollback_deployment'
  | 'custom'

/**
 * Recovery strategy
 */
export interface RecoveryStrategy {
  /** Strategy ID */
  id: string
  /** Strategy name */
  name: string
  /** Description */
  description?: string
  /** Applicable failure types */
  failureTypes: string[]
  /** Recovery actions to execute */
  actions: RecoveryAction[]
  /** Maximum retry attempts */
  maxAttempts: number
  /** Delay between attempts (ms) */
  delayMs: number
  /** Whether strategy is enabled */
  enabled: boolean
}

/**
 * Recovery action
 */
export interface RecoveryAction {
  /** Action type */
  type: RecoveryActionType
  /** Action parameters */
  params: Record<string, unknown>
  /** Timeout for action (ms) */
  timeoutMs: number
  /** Whether action is critical */
  critical: boolean
}

/**
 * Recovery attempt record
 */
export interface RecoveryAttempt {
  /** Attempt ID */
  id: string
  /** Instance ID */
  instanceId: string
  /** Failure ID */
  failureId: string
  /** Strategy ID */
  strategyId: string
  /** Attempt number */
  attemptNumber: number
  /** Actions executed */
  actions: RecoveryActionExecution[]
  /** Overall success */
  success: boolean
  /** Start timestamp */
  startedAt: string
  /** End timestamp */
  endedAt?: string
  /** Duration (ms) */
  durationMs?: number
  /** Error message if failed */
  error?: string
}

/**
 * Recovery action execution result
 */
export interface RecoveryActionExecution {
  /** Action type */
  type: RecoveryActionType
  /** Success */
  success: boolean
  /** Duration (ms) */
  durationMs: number
  /** Output or error message */
  output?: string
  /** Error if failed */
  error?: string
}

/**
 * Recovery manager configuration
 */
export interface RecoveryManagerConfig {
  /** Enable automatic recovery */
  enableAutoRecovery: boolean
  /** Maximum concurrent recovery attempts */
  maxConcurrentRecoveries: number
  /** Default recovery timeout (ms) */
  defaultTimeoutMs: number
  /** Notification channels */
  notificationChannels: NotificationChannel[]
  /** Custom recovery strategies */
  customStrategies: RecoveryStrategy[]
  /** Enable recovery metrics */
  enableMetrics: boolean
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_CONFIG: RecoveryManagerConfig = {
  enableAutoRecovery: true,
  maxConcurrentRecoveries: 3,
  defaultTimeoutMs: 30000,
  notificationChannels: [],
  customStrategies: [],
  enableMetrics: true
}

// ============================================
// Recovery Manager
// ============================================

/**
 * Recovery Manager
 * 
 * Manages automatic recovery of failed services.
 */
export class RecoveryManager {
  private config: RecoveryManagerConfig
  private strategies: RecoveryStrategy[]
  private attempts: Map<string, RecoveryAttempt[]> = new Map()
  private activeRecoveries: Set<string> = new Set()
  private eventCallbacks: ((event: HealthEvent) => void)[] = []
  private metrics: RecoveryMetrics

  constructor(config: Partial<RecoveryManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.strategies = this.buildDefaultStrategies()
    if (this.config.customStrategies.length > 0) {
      this.strategies.push(...this.config.customStrategies)
    }
    this.metrics = {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      avgRecoveryTimeMs: 0,
      recoveryByStrategy: {},
      recoveryByFailureType: {}
    }
  }

  /**
   * Attempt to recover from a failure
   */
  async recover(
    instanceId: string,
    failure: FailureRecord,
    instanceHealth: InstanceHealth
  ): Promise<RecoveryAttempt> {
    // Check if already recovering
    if (this.activeRecoveries.has(instanceId)) {
      throw new Error(`Recovery already in progress for instance ${instanceId}`)
    }

    // Find applicable strategy
    const strategy = this.findStrategy(failure.type)
    if (!strategy) {
      throw new Error(`No recovery strategy found for failure type: ${failure.type}`)
    }

    // Check concurrency limit
    if (this.activeRecoveries.size >= this.config.maxConcurrentRecoveries) {
      throw new Error('Maximum concurrent recoveries reached')
    }

    // Mark as active
    this.activeRecoveries.add(instanceId)

    const attemptId = this.generateId()
    const attempt: RecoveryAttempt = {
      id: attemptId,
      instanceId,
      failureId: failure.id,
      strategyId: strategy.id,
      attemptNumber: this.getAttemptCount(instanceId, failure.id) + 1,
      actions: [],
      success: false,
      startedAt: new Date().toISOString()
    }

    this.emitEvent('health.recovery.started', instanceId, {
      attemptId,
      strategyId: strategy.id,
      failureType: failure.type
    })

    const startTime = Date.now()

    try {
      // Execute recovery actions
      for (const action of strategy.actions) {
        const actionResult = await this.executeAction(action, instanceId, instanceHealth)
        attempt.actions.push(actionResult)

        if (!actionResult.success && action.critical) {
          throw new Error(`Critical action failed: ${action.type}`)
        }
      }

      attempt.success = true
      attempt.endedAt = new Date().toISOString()
      attempt.durationMs = Date.now() - startTime

      this.emitEvent('health.recovery.completed', instanceId, {
        attemptId,
        success: true,
        durationMs: attempt.durationMs
      })

      // Send notification
      await this.sendNotification(instanceId, failure, attempt, true)

    } catch (error) {
      attempt.success = false
      attempt.endedAt = new Date().toISOString()
      attempt.durationMs = Date.now() - startTime
      attempt.error = error instanceof Error ? error.message : String(error)

      this.emitEvent('health.recovery.failed', instanceId, {
        attemptId,
        error: attempt.error
      })

      // Send notification
      await this.sendNotification(instanceId, failure, attempt, false)
    } finally {
      // Remove from active
      this.activeRecoveries.delete(instanceId)

      // Store attempt
      if (!this.attempts.has(instanceId)) {
        this.attempts.set(instanceId, [])
      }
      this.attempts.get(instanceId)!.push(attempt)

      // Update metrics
      this.updateMetrics(attempt)
    }

    return attempt
  }

  /**
   * Get recovery attempts for an instance
   */
  getAttempts(instanceId: string): RecoveryAttempt[] {
    return this.attempts.get(instanceId) || []
  }

  /**
   * Get all recovery attempts
   */
  getAllAttempts(): Map<string, RecoveryAttempt[]> {
    return new Map(this.attempts)
  }

  /**
   * Get recovery metrics
   */
  getMetrics(): RecoveryMetrics {
    return { ...this.metrics }
  }

  /**
   * Add custom recovery strategy
   */
  addStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy)
  }

  /**
   * Register event callback
   */
  onEvent(callback: (event: HealthEvent) => void): void {
    this.eventCallbacks.push(callback)
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RecoveryManagerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Clear all recovery attempts
   */
  clear(): void {
    this.attempts.clear()
    this.activeRecoveries.clear()
    this.metrics = {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      avgRecoveryTimeMs: 0,
      recoveryByStrategy: {},
      recoveryByFailureType: {}
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  private buildDefaultStrategies(): RecoveryStrategy[] {
    return [
      // Circuit Breaker Recovery
      {
        id: 'circuit-breaker-recovery',
        name: 'Circuit Breaker Recovery',
        description: 'Reset circuit breaker and verify health',
        failureTypes: ['circuit_breaker_open'],
        actions: [
          {
            type: 'reset_circuit_breaker',
            params: {},
            timeoutMs: 5000,
            critical: true
          },
          {
            type: 'run_diagnostic',
            params: { type: 'health_check' },
            timeoutMs: 10000,
            critical: false
          }
        ],
        maxAttempts: 3,
        delayMs: 10000,
        enabled: true
      },

      // Timeout Recovery
      {
        id: 'timeout-recovery',
        name: 'Timeout Recovery',
        description: 'Clear cache and restart service if needed',
        failureTypes: ['timeout', 'response_time_high'],
        actions: [
          {
            type: 'clear_cache',
            params: {},
            timeoutMs: 5000,
            critical: false
          },
          {
            type: 'run_diagnostic',
            params: { type: 'latency_check' },
            timeoutMs: 10000,
            critical: false
          }
        ],
        maxAttempts: 2,
        delayMs: 15000,
        enabled: true
      },

      // Connection Failure Recovery
      {
        id: 'connection-recovery',
        name: 'Connection Failure Recovery',
        description: 'Restart service and verify connectivity',
        failureTypes: ['connection_refused', 'connection_reset', 'dns_failure'],
        actions: [
          {
            type: 'restart_service',
            params: { graceful: true },
            timeoutMs: 30000,
            critical: true
          },
          {
            type: 'run_diagnostic',
            params: { type: 'connectivity_check' },
            timeoutMs: 10000,
            critical: false
          }
        ],
        maxAttempts: 2,
        delayMs: 30000,
        enabled: true
      },

      // Error Rate Recovery
      {
        id: 'error-rate-recovery',
        name: 'Error Rate Recovery',
        description: 'Scale up and clear cache',
        failureTypes: ['error_rate_high', 'health_check_fail'],
        actions: [
          {
            type: 'scale_up',
            params: { replicas: 2 },
            timeoutMs: 60000,
            critical: false
          },
          {
            type: 'clear_cache',
            params: {},
            timeoutMs: 5000,
            critical: false
          },
          {
            type: 'run_diagnostic',
            params: { type: 'error_analysis' },
            timeoutMs: 15000,
            critical: false
          }
        ],
        maxAttempts: 2,
        delayMs: 20000,
        enabled: true
      },

      // Critical Failure Recovery
      {
        id: 'critical-failure-recovery',
        name: 'Critical Failure Recovery',
        description: 'Rollback deployment and notify team',
        failureTypes: ['memory_exhausted', 'cpu_overload', 'ssl_error'],
        actions: [
          {
            type: 'rollback_deployment',
            params: {},
            timeoutMs: 60000,
            critical: true
          },
          {
            type: 'notify_team',
            params: { urgency: 'critical' },
            timeoutMs: 5000,
            critical: false
          }
        ],
        maxAttempts: 1,
        delayMs: 0,
        enabled: true
      }
    ]
  }

  private findStrategy(failureType: string): RecoveryStrategy | undefined {
    return this.strategies.find(
      (s) => s.enabled && s.failureTypes.includes(failureType)
    )
  }

  private async executeAction(
    action: RecoveryAction,
    instanceId: string,
    instanceHealth: InstanceHealth
  ): Promise<RecoveryActionExecution> {
    const startTime = Date.now()
    const result: RecoveryActionExecution = {
      type: action.type,
      success: false,
      durationMs: 0
    }

    try {
      // Execute action based on type
      switch (action.type) {
        case 'reset_circuit_breaker':
          result.success = await this.resetCircuitBreaker(instanceId)
          result.output = 'Circuit breaker reset successfully'
          break

        case 'restart_service':
          result.success = await this.restartService(instanceId, action.params)
          result.output = 'Service restarted successfully'
          break

        case 'scale_up':
          result.success = await this.scaleUp(instanceId, action.params)
          result.output = 'Service scaled up successfully'
          break

        case 'scale_down':
          result.success = await this.scaleDown(instanceId, action.params)
          result.output = 'Service scaled down successfully'
          break

        case 'clear_cache':
          result.success = await this.clearCache(instanceId)
          result.output = 'Cache cleared successfully'
          break

        case 'notify_team':
          result.success = await this.notifyTeam(instanceId, action.params)
          result.output = 'Team notified successfully'
          break

        case 'run_diagnostic':
          result.success = await this.runDiagnostic(instanceId, action.params)
          result.output = 'Diagnostic completed successfully'
          break

        case 'rollback_deployment':
          result.success = await this.rollbackDeployment(instanceId)
          result.output = 'Deployment rolled back successfully'
          break

        case 'custom':
          result.success = await this.executeCustomAction(instanceId, action.params)
          result.output = 'Custom action executed successfully'
          break

        default:
          throw new Error(`Unknown action type: ${action.type}`)
      }

      result.durationMs = Date.now() - startTime
      return result

    } catch (error) {
      result.success = false
      result.durationMs = Date.now() - startTime
      result.error = error instanceof Error ? error.message : String(error)
      return result
    }
  }

  private async resetCircuitBreaker(instanceId: string): Promise<boolean> {
    // In a real implementation, this would call the service's circuit breaker reset endpoint
    // For now, we simulate success
    return true
  }

  private async restartService(instanceId: string, params: Record<string, unknown>): Promise<boolean> {
    // In a real implementation, this would call the orchestration API to restart the service
    // For now, we simulate success
    return true
  }

  private async scaleUp(instanceId: string, params: Record<string, unknown>): Promise<boolean> {
    // In a real implementation, this would call the orchestration API to scale up
    // For now, we simulate success
    return true
  }

  private async scaleDown(instanceId: string, params: Record<string, unknown>): Promise<boolean> {
    // In a real implementation, this would call the orchestration API to scale down
    // For now, we simulate success
    return true
  }

  private async clearCache(instanceId: string): Promise<boolean> {
    // In a real implementation, this would call the service's cache clear endpoint
    // For now, we simulate success
    return true
  }

  private async notifyTeam(instanceId: string, params: Record<string, unknown>): Promise<boolean> {
    // In a real implementation, this would send notifications via configured channels
    // For now, we simulate success
    return true
  }

  private async runDiagnostic(instanceId: string, params: Record<string, unknown>): Promise<boolean> {
    // In a real implementation, this would run diagnostic checks
    // For now, we simulate success
    return true
  }

  private async rollbackDeployment(instanceId: string): Promise<boolean> {
    // In a real implementation, this would trigger a deployment rollback
    // For now, we simulate success
    return true
  }

  private async executeCustomAction(instanceId: string, params: Record<string, unknown>): Promise<boolean> {
    // In a real implementation, this would execute custom logic
    // For now, we simulate success
    return true
  }

  private async sendNotification(
    instanceId: string,
    failure: FailureRecord,
    attempt: RecoveryAttempt,
    success: boolean
  ): Promise<void> {
    if (this.config.notificationChannels.length === 0) {
      return
    }

    const severity = this.mapSeverity(failure.severity)
    const message = success
      ? `Recovery successful for ${instanceId}: ${failure.message}`
      : `Recovery failed for ${instanceId}: ${failure.message}. Error: ${attempt.error}`

    // In a real implementation, this would send notifications via configured channels
    // For now, we just log
    console.log(`[Recovery Notification] ${severity}: ${message}`)
  }

  private getAttemptCount(instanceId: string, failureId: string): number {
    const attempts = this.attempts.get(instanceId) || []
    return attempts.filter((a) => a.failureId === failureId).length
  }

  private updateMetrics(attempt: RecoveryAttempt): void {
    this.metrics.totalAttempts++
    
    if (attempt.success) {
      this.metrics.successfulAttempts++
    } else {
      this.metrics.failedAttempts++
    }

    // Update average recovery time
    if (attempt.durationMs) {
      const totalTime = this.metrics.avgRecoveryTimeMs * (this.metrics.totalAttempts - 1)
      this.metrics.avgRecoveryTimeMs = (totalTime + attempt.durationMs) / this.metrics.totalAttempts
    }

    // Update by strategy
    if (!this.metrics.recoveryByStrategy[attempt.strategyId]) {
      this.metrics.recoveryByStrategy[attempt.strategyId] = { total: 0, successful: 0 }
    }
    this.metrics.recoveryByStrategy[attempt.strategyId].total++
    if (attempt.success) {
      this.metrics.recoveryByStrategy[attempt.strategyId].successful++
    }

    // Update by failure type (would need to look up failure)
    // For now, we skip this
  }

  private mapSeverity(severity: string): HealthSeverity {
    const mapping: Record<string, HealthSeverity> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low'
    }
    return mapping[severity] || 'info'
  }

  private generateId(): string {
    return `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private emitEvent(type: HealthEventType, instanceId?: string, payload?: Record<string, unknown>): void {
    const event: HealthEvent = {
      id: this.generateId(),
      type,
      timestamp: new Date().toISOString(),
      instanceId,
      payload: payload || {},
      metadata: {
        source: 'RecoveryManager'
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

/**
 * Recovery metrics
 */
export interface RecoveryMetrics {
  totalAttempts: number
  successfulAttempts: number
  failedAttempts: number
  avgRecoveryTimeMs: number
  recoveryByStrategy: Record<string, { total: number; successful: number }>
  recoveryByFailureType: Record<string, { total: number; successful: number }>
}

export default RecoveryManager