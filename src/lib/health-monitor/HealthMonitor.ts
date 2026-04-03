/**
 * Health Monitor
 *
 * Main health monitoring system that coordinates all components.
 * Provides unified interface for health checking, failure detection, and recovery.
 *
 * @version v1.10.0
 * @author Executor + 咨询师
 */

import type {
  ServiceInstance,
  ServiceHealth,
  InstanceHealth,
  HealthCheckConfig,
  HealthMonitorConfig,
  HealthEvent,
  HealthEventType,
  HealthReport,
  HealthAlert,
  HealthStatus
} from './types'
import type { HeartbeatPayload } from './PassiveHealthReporter'
import { DEFAULT_HEALTH_MONITOR_CONFIG } from './types'
import { HealthChecker } from './HealthChecker'
import { PassiveHealthReporter } from './PassiveHealthReporter'
import { FailureDetector } from './FailureDetector'
import { RecoveryManager } from './RecoveryManager'
import { HealthDashboard } from './HealthDashboard'

// ============================================
// Health Monitor
// ============================================

/**
 * Health Monitor
 * 
 * Main orchestrator for the health monitoring system.
 * Coordinates health checking, failure detection, recovery, and dashboard.
 */
export class HealthMonitor {
  private config: HealthMonitorConfig
  private healthChecker: HealthChecker
  private passiveReporter: PassiveHealthReporter
  private failureDetector: FailureDetector
  private recoveryManager: RecoveryManager
  private dashboard: HealthDashboard
  private services: Map<string, ServiceInstance> = new Map()
  private serviceGroups: Map<string, string[]> = new Map()
  private eventCallbacks: ((event: HealthEvent) => void)[] = []
  private isRunning = false
  private checkInterval: NodeJS.Timeout | null = null

  constructor(config: Partial<HealthMonitorConfig> = {}) {
    this.config = { ...DEFAULT_HEALTH_MONITOR_CONFIG, ...config }

    // Initialize components
    this.healthChecker = new HealthChecker(this.config.checkConfig)
    this.passiveReporter = new PassiveHealthReporter()
    this.failureDetector = new FailureDetector()
    this.recoveryManager = new RecoveryManager({
      notificationChannels: this.config.notificationChannels
    })
    this.dashboard = new HealthDashboard()

    // Wire up event callbacks
    this.wireEventCallbacks()
  }

  /**
   * Start the health monitor
   */
  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    this.healthChecker.start()
    this.passiveReporter.start()

    // Start periodic health checks
    this.startPeriodicChecks()

    this.emitEvent('health.monitor.started', undefined, {
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Stop the health monitor
   */
  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false
    this.healthChecker.stop()
    this.passiveReporter.stop()

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    this.emitEvent('health.monitor.stopped', undefined, {
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Register a service instance for monitoring
   */
  registerService(instance: ServiceInstance): void {
    this.services.set(instance.id, instance)
    this.healthChecker.registerInstance(instance)

    // Add to service group
    if (!this.serviceGroups.has(instance.name)) {
      this.serviceGroups.set(instance.name, [])
    }
    this.serviceGroups.get(instance.name)!.push(instance.id)

    this.emitEvent('health.service.registered', instance.id, {
      serviceName: instance.name,
      endpoint: instance.endpoint
    })
  }

  /**
   * Unregister a service instance
   */
  unregisterService(instanceId: string): void {
    const instance = this.services.get(instanceId)
    if (!instance) return

    this.services.delete(instanceId)
    this.healthChecker.unregisterInstance(instanceId)
    this.passiveReporter.unregisterInstance(instanceId)

    // Remove from service group
    const group = this.serviceGroups.get(instance.name)
    if (group) {
      const index = group.indexOf(instanceId)
      if (index >= 0) {
        group.splice(index, 1)
      }
    }

    this.emitEvent('health.service.unregistered', instanceId, {
      serviceName: instance.name
    })
  }

  /**
   * Receive a heartbeat from a service
   */
  receiveHeartbeat(payload: HeartbeatPayload): {
    success: boolean
    message: string
    status: HealthStatus
  } {
    const result = this.passiveReporter.receiveHeartbeat(payload)

    // Update dashboard
    const instanceHealth = this.passiveReporter.getInstanceHealth(payload.instanceId)
    if (instanceHealth) {
      this.dashboard.updateInstanceHealth(payload.instanceId, instanceHealth)
    }

    return result
  }

  /**
   * Perform a health check on a specific instance
   */
  async checkInstance(instanceId: string): Promise<InstanceHealth | undefined> {
    const instance = this.services.get(instanceId)
    if (!instance) {
      return undefined
    }

    await this.healthChecker.checkHealth(instance)
    return this.healthChecker.getInstanceHealth(instanceId)
  }

  /**
   * Perform health checks on all instances
   */
  async checkAllInstances(): Promise<Map<string, InstanceHealth>> {
    const results = await this.healthChecker.checkAll()

    // Process results through failure detector
    for (const [instanceId, result] of results) {
      const instanceHealth = this.healthChecker.getInstanceHealth(instanceId)
      if (instanceHealth) {
        const recentResults = this.healthChecker.getCheckHistory(instanceId, 10)
        const failures = this.failureDetector.analyze(instanceId, instanceHealth, recentResults)

        // Trigger recovery if needed
        if (failures.length > 0 && this.config.checkConfig.retry.enabled) {
          for (const failure of failures) {
            if (!failure.resolved && this.recoveryManager) {
              try {
                await this.recoveryManager.recover(instanceId, failure, instanceHealth)
              } catch {
                // Recovery failed, will be retried
              }
            }
          }
        }

        // Update dashboard
        this.dashboard.updateInstanceHealth(instanceId, instanceHealth)
      }
    }

    // Update alerts in dashboard
    const alerts = this.failureDetector.getActiveAlerts()
    this.dashboard.updateAlerts(alerts)

    // Update service health
    this.updateServiceHealth()

    return this.healthChecker.getAllInstanceHealth()
  }

  /**
   * Get service health
   */
  getServiceHealth(serviceName?: string): ServiceHealth | ServiceHealth[] {
    return this.dashboard.getServiceHealth(serviceName)
  }

  /**
   * Get instance health
   */
  getInstanceHealth(instanceId?: string): InstanceHealth | InstanceHealth[] {
    return this.dashboard.getInstanceHealth(instanceId)
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(limit?: number): HealthAlert[] {
    return this.dashboard.getActiveAlerts(limit)
  }

  /**
   * Get dashboard summary
   */
  getDashboardSummary() {
    return this.dashboard.getSummary()
  }

  /**
   * Generate health report
   */
  generateReport(): HealthReport {
    return this.dashboard.generateReport()
  }

  /**
   * Get dashboard widgets
   */
  getDashboardWidgets() {
    return this.dashboard.getWidgets()
  }

  /**
   * Get health trends
   */
  getTrends(serviceName?: string, durationMs?: number) {
    return this.dashboard.getTrend(serviceName, durationMs)
  }

  /**
   * Get health score
   */
  getHealthScore() {
    return this.dashboard.getHealthScore()
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    return this.failureDetector.acknowledgeAlert(alertId, acknowledgedBy)
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    return this.failureDetector.resolveAlert(alertId)
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
  updateConfig(config: Partial<HealthMonitorConfig>): void {
    this.config = { ...this.config, ...config }
    this.healthChecker.updateConfig(this.config.checkConfig)
    this.dashboard.updateConfig({
      refreshIntervalMs: this.config.dashboardRefreshMs
    })
  }

  /**
   * Get monitor status
   */
  getStatus(): {
    isRunning: boolean
    registeredServices: number
    registeredInstances: number
    activeAlerts: number
    healthScore: number
  } {
    return {
      isRunning: this.isRunning,
      registeredServices: this.serviceGroups.size,
      registeredInstances: this.services.size,
      activeAlerts: this.getActiveAlerts().length,
      healthScore: this.getHealthScore().overall
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.services.clear()
    this.serviceGroups.clear()
    this.healthChecker = new HealthChecker(this.config.checkConfig)
    this.passiveReporter = new PassiveHealthReporter()
    this.failureDetector.clear()
    this.recoveryManager.clear()
    this.dashboard.clear()
  }

  // ============================================
  // Private Methods
  // ============================================

  private startPeriodicChecks(): void {
    this.checkInterval = setInterval(async () => {
      if (!this.isRunning) return

      try {
        await this.checkAllInstances()
      } catch {
        // Check failed, will be retried next interval
      }
    }, this.config.checkConfig.intervalMs)
  }

  private updateServiceHealth(): void {
    for (const [serviceName, instanceIds] of this.serviceGroups) {
      const instances: InstanceHealth[] = []
      let healthyCount = 0
      let unhealthyCount = 0
      let degradedCount = 0

      for (const instanceId of instanceIds) {
        const health = this.healthChecker.getInstanceHealth(instanceId)
        if (health) {
          instances.push(health)
          if (health.status === 'healthy') healthyCount++
          else if (health.status === 'unhealthy') unhealthyCount++
          else if (health.status === 'degraded') degradedCount++
        }
      }

      const serviceHealth: ServiceHealth = {
        serviceName,
        status: this.determineServiceStatus(healthyCount, unhealthyCount, degradedCount),
        totalInstances: instances.length,
        healthyInstances: healthyCount,
        unhealthyInstances: unhealthyCount,
        degradedInstances: degradedCount,
        instances,
        lastChecked: new Date().toISOString(),
        healthScore: this.calculateServiceHealthScore(healthyCount, unhealthyCount, degradedCount),
        alerts: this.failureDetector.getActiveAlerts().filter(
          (a) => instanceIds.includes(a.instanceId || '')
        )
      }

      this.dashboard.updateServiceHealth(serviceName, serviceHealth)
    }
  }

  private determineServiceStatus(
    healthy: number,
    unhealthy: number,
    degraded: number
  ): HealthStatus {
    const total = healthy + unhealthy + degraded
    if (total === 0) return 'unknown'
    if (unhealthy > total / 2) return 'unhealthy'
    if (degraded > 0 || unhealthy > 0) return 'degraded'
    return 'healthy'
  }

  private calculateServiceHealthScore(
    healthy: number,
    unhealthy: number,
    degraded: number
  ): number {
    const total = healthy + unhealthy + degraded
    if (total === 0) return 0
    return Math.round((healthy / total) * 100)
  }

  private wireEventCallbacks(): void {
    // Forward events from components
    this.healthChecker.onEvent((event) => this.emitEvent(event.type, event.instanceId, event.payload))
    this.passiveReporter.onEvent((event) => this.emitEvent(event.type, event.instanceId, event.payload))
    this.failureDetector.onEvent((event) => this.emitEvent(event.type, event.instanceId, event.payload))
    this.recoveryManager.onEvent((event) => this.emitEvent(event.type, event.instanceId, event.payload))
  }

  private emitEvent(
    type: HealthEventType,
    instanceId?: string,
    payload?: Record<string, unknown>
  ): void {
    const event: HealthEvent = {
      id: this.generateId(),
      type,
      timestamp: new Date().toISOString(),
      instanceId,
      payload: payload || {},
      metadata: {
        source: 'HealthMonitor'
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

  private generateId(): string {
    return `hm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

export default HealthMonitor