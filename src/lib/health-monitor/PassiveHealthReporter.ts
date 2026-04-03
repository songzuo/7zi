/**
 * Passive Health Reporter
 *
 * Allows services to self-report their health status.
 * Implements heartbeat mechanism and health aggregation.
 *
 * @version v1.10.0
 * @author Executor + 咨询师
 */

import type {
  ServiceInstance,
  HealthCheckResponse,
  HealthStatus,
  InstanceHealth,
  HealthEvent,
  HealthEventType,
  HealthMetrics,
  CustomMetric
} from './types'

// ============================================
// Heartbeat Types
// ============================================

/**
 * Heartbeat payload from service
 */
export interface HeartbeatPayload {
  /** Instance ID */
  instanceId: string
  /** Service name */
  serviceName: string
  /** Service version */
  version: string
  /** Current health status */
  status: HealthStatus
  /** Timestamp of heartbeat */
  timestamp: string
  /** Optional health details */
  details?: {
    components?: Array<{
      name: string
      status: string
      message?: string
    }>
    metrics?: CustomMetric[]
    dependencies?: Array<{
      name: string
      status: string
    }>
  }
  /** Service metadata */
  metadata?: Record<string, unknown>
}

/**
 * Heartbeat configuration
 */
export interface HeartbeatConfig {
  /** Expected heartbeat interval (ms) */
  intervalMs: number
  /** Grace period before marking as stale (ms) */
  staleThresholdMs: number
  /** Maximum missed heartbeats before unhealthy */
  maxMissedHeartbeats: number
  /** Enable automatic cleanup of stale instances */
  autoCleanup: boolean
  /** Cleanup interval (ms) */
  cleanupIntervalMs: number
}

/**
 * Heartbeat record
 */
interface HeartbeatRecord {
  instanceId: string
  serviceName: string
  lastHeartbeat: string
  status: HealthStatus
  consecutiveMissed: number
  totalHeartbeats: number
  registeredAt: string
  metadata: Record<string, unknown>
}

/**
 * Passive Health Reporter
 * 
 * Receives and processes self-reported health status from services.
 */
export class PassiveHealthReporter {
  private heartbeats: Map<string, HeartbeatRecord> = new Map()
  private instanceHealth: Map<string, InstanceHealth> = new Map()
  private metrics: Map<string, HealthMetrics[]> = new Map()
  private eventCallbacks: ((event: HealthEvent) => void)[] = []
  private cleanupTimer: NodeJS.Timeout | null = null
  private config: HeartbeatConfig

  constructor(config: Partial<HeartbeatConfig> = {}) {
    this.config = {
      intervalMs: 30000,
      staleThresholdMs: 90000, // 3x interval
      maxMissedHeartbeats: 3,
      autoCleanup: true,
      cleanupIntervalMs: 60000,
      ...config
    }
  }

  /**
   * Start the reporter
   */
  start(): void {
    if (this.config.autoCleanup) {
      this.startCleanupTimer()
    }
  }

  /**
   * Stop the reporter
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * Receive a heartbeat from a service
   */
  receiveHeartbeat(payload: HeartbeatPayload): {
    success: boolean
    message: string
    status: HealthStatus
  } {
    const { instanceId, serviceName, status, timestamp, details, metadata } = payload

    // Get or create heartbeat record
    let record = this.heartbeats.get(instanceId)
    const isNew = !record

    if (isNew) {
      record = {
        instanceId,
        serviceName,
        lastHeartbeat: timestamp,
        status,
        consecutiveMissed: 0,
        totalHeartbeats: 1,
        registeredAt: timestamp,
        metadata: metadata || {}
      }
      this.heartbeats.set(instanceId, record)

      // Initialize instance health
      this.instanceHealth.set(instanceId, {
        instanceId,
        endpoint: '',
        status,
        circuitBreakerState: 'closed',
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        avgResponseTimeMs: 0,
        responseTimeHistory: [],
        errorRate: 0,
        uptimePercentage: 100,
        totalChecks: 0,
        totalFailures: 0
      })

      this.emitEvent('health.status.changed', instanceId, {
        previousStatus: 'unknown',
        newStatus: status,
        source: 'heartbeat'
      })
    } else {
      // In the else block, record is guaranteed to exist
      const existingRecord = record!
      const previousStatus = existingRecord.status
      existingRecord.lastHeartbeat = timestamp
      existingRecord.status = status
      existingRecord.totalHeartbeats++
      existingRecord.consecutiveMissed = 0
      if (metadata) {
        existingRecord.metadata = { ...existingRecord.metadata, ...metadata }
      }

      // Update instance health
      const health = this.instanceHealth.get(instanceId)
      if (health) {
        health.status = status
        health.totalChecks++
      }

      if (previousStatus !== status) {
        this.emitEvent('health.status.changed', instanceId, {
          previousStatus,
          newStatus: status,
          source: 'heartbeat'
        })
      }
    }

    // Store metrics if provided
    if (details?.metrics && details.metrics.length > 0) {
      this.storeMetrics(instanceId, details.metrics)
    }

    return {
      success: true,
      message: isNew ? 'Instance registered' : 'Heartbeat received',
      status
    }
  }

  /**
   * Get instance health status
   */
  getInstanceHealth(instanceId: string): InstanceHealth | undefined {
    return this.instanceHealth.get(instanceId)
  }

  /**
   * Get all instance health
   */
  getAllInstanceHealth(): Map<string, InstanceHealth> {
    return new Map(this.instanceHealth)
  }

  /**
   * Get heartbeat record
   */
  getHeartbeatRecord(instanceId: string): HeartbeatRecord | undefined {
    return this.heartbeats.get(instanceId)
  }

  /**
   * Get all heartbeat records
   */
  getAllHeartbeats(): HeartbeatRecord[] {
    return Array.from(this.heartbeats.values())
  }

  /**
   * Get stale instances (missed heartbeats)
   */
  getStaleInstances(): HeartbeatRecord[] {
    const now = Date.now()
    const staleThreshold = this.config.staleThresholdMs

    return this.getAllHeartbeats().filter((record) => {
      const lastHeartbeat = new Date(record.lastHeartbeat).getTime()
      return now - lastHeartbeat > staleThreshold
    })
  }

  /**
   * Get metrics for an instance
   */
  getMetrics(instanceId: string, limit?: number): HealthMetrics[] {
    const metrics = this.metrics.get(instanceId) || []
    return limit ? metrics.slice(-limit) : [...metrics]
  }

  /**
   * Check if instance is registered
   */
  isRegistered(instanceId: string): boolean {
    return this.heartbeats.has(instanceId)
  }

  /**
   * Unregister an instance
   */
  unregisterInstance(instanceId: string): void {
    this.heartbeats.delete(instanceId)
    this.instanceHealth.delete(instanceId)
    this.metrics.delete(instanceId)
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
  updateConfig(config: Partial<HeartbeatConfig>): void {
    this.config = { ...this.config, ...config }
  }

  // ============================================
  // Private Methods
  // ============================================

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleInstances()
    }, this.config.cleanupIntervalMs)
  }

  private cleanupStaleInstances(): void {
    const now = Date.now()
    const staleThreshold = this.config.staleThresholdMs

    for (const [instanceId, record] of this.heartbeats) {
      const lastHeartbeat = new Date(record.lastHeartbeat).getTime()
      const timeSinceLastHeartbeat = now - lastHeartbeat

      if (timeSinceLastHeartbeat > staleThreshold) {
        record.consecutiveMissed++

        // Update instance health to unhealthy if too many missed
        const health = this.instanceHealth.get(instanceId)
        if (health && record.consecutiveMissed >= this.config.maxMissedHeartbeats) {
          const previousStatus = health.status
          health.status = 'unhealthy'
          
          if (previousStatus !== 'unhealthy') {
            this.emitEvent('health.status.changed', instanceId, {
              previousStatus,
              newStatus: 'unhealthy',
              reason: 'missed_heartbeats',
              missedCount: record.consecutiveMissed
            })
          }
        }

        // Optionally remove very old instances
        if (timeSinceLastHeartbeat > staleThreshold * 3) {
          this.emitEvent('health.status.changed', instanceId, {
            previousStatus: record.status,
            newStatus: 'unknown',
            reason: 'instance_timeout'
          })
          this.unregisterInstance(instanceId)
        }
      }
    }
  }

  private storeMetrics(instanceId: string, customMetrics: CustomMetric[]): void {
    const now = new Date().toISOString()
    
    const healthMetrics: HealthMetrics = {
      id: instanceId,
      timestamp: now,
      responseTime: {
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        stdDev: 0
      },
      availability: {
        uptimePercentage: 100,
        totalMonitoredMs: 0,
        totalDowntimeMs: 0,
        downtimeIncidents: 0,
        mttr: 0,
        mtbf: 0
      },
      errors: {
        total: 0,
        rate: 0,
        byType: {},
        byCode: {}
      },
      throughput: {
        rps: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0
      },
      custom: customMetrics
    }

    // Extract specific metrics if present
    for (const metric of customMetrics) {
      if (metric.name === 'response_time') {
        healthMetrics.responseTime.avg = metric.value
      }
      if (metric.name === 'error_rate') {
        healthMetrics.errors.rate = metric.value
      }
      if (metric.name === 'rps') {
        healthMetrics.throughput.rps = metric.value
      }
    }

    // Store metrics
    if (!this.metrics.has(instanceId)) {
      this.metrics.set(instanceId, [])
    }
    this.metrics.get(instanceId)!.push(healthMetrics)

    // Keep only last 100 metric entries
    const metrics = this.metrics.get(instanceId)!
    if (metrics.length > 100) {
      this.metrics.set(instanceId, metrics.slice(-100))
    }
  }

  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private emitEvent(
    type: HealthEventType,
    instanceId?: string,
    payload?: Record<string, unknown>
  ): void {
    const event: HealthEvent = {
      id: this.generateEventId(),
      type,
      timestamp: new Date().toISOString(),
      instanceId,
      payload: payload || {},
      metadata: {
        source: 'PassiveHealthReporter'
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

export default PassiveHealthReporter
