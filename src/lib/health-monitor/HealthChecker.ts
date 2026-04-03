/**
 * Health Checker
 *
 * Active health checking service that monitors service instances.
 * Supports configurable intervals, retries, and circuit breaker pattern.
 *
 * @version v1.10.0
 * @author Executor + 咨询师
 */

import type {
  ServiceInstance,
  HealthCheckConfig,
  HealthCheckRequest,
  HealthCheckResponse,
  HealthCheckResult,
  HealthCheckType,
  HealthStatus,
  HealthError,
  InstanceHealth,
  CircuitState,
  HealthEvent,
  HealthEventType
} from './types'
import { DEFAULT_HEALTH_CHECK_CONFIG } from './types'

// ============================================
// Circuit Breaker
// ============================================

interface CircuitBreakerState {
  state: CircuitState
  failureCount: number
  successCount: number
  lastFailureTime: number | null
  lastStateChange: number
  requestCount: number
  failureRate: number
}

/**
 * Circuit Breaker implementation for health checks
 */
class CircuitBreaker {
  private state: CircuitBreakerState
  private config: HealthCheckConfig['circuitBreaker']
  private requestWindow: { success: boolean; timestamp: number }[] = []

  constructor(config: HealthCheckConfig['circuitBreaker']) {
    this.config = config
    this.state = {
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      lastStateChange: Date.now(),
      requestCount: 0,
      failureRate: 0
    }
  }

  /**
   * Check if requests are allowed
   */
  isRequestAllowed(): boolean {
    if (!this.config.enabled) return true

    switch (this.state.state) {
      case 'closed':
        return true
      case 'open':
        // Check if reset timeout has passed
        if (Date.now() - this.state.lastStateChange >= this.config.resetTimeoutMs) {
          this.transitionTo('half-open')
          return true
        }
        return false
      case 'half-open':
        return true
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    if (!this.config.enabled) return

    this.state.successCount++
    this.addToWindow(true)

    if (this.state.state === 'half-open') {
      // Reset circuit on success in half-open state
      this.transitionTo('closed')
    }

    this.updateFailureRate()
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    if (!this.config.enabled) return

    this.state.failureCount++
    this.state.lastFailureTime = Date.now()
    this.addToWindow(false)

    this.updateFailureRate()

    if (this.state.state === 'half-open') {
      // Open circuit immediately on failure in half-open state
      this.transitionTo('open')
    } else if (this.state.state === 'closed') {
      // Check if we should trip the circuit
      const shouldTrip =
        this.state.failureCount >= this.config.failureThreshold ||
        (this.requestWindow.length >= this.config.minimumNumberOfCalls &&
          this.state.failureRate >= this.config.failureRateThreshold)

      if (shouldTrip) {
        this.transitionTo('open')
      }
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state.state
  }

  /**
   * Get state details
   */
  getStateDetails(): CircuitBreakerState {
    return { ...this.state }
  }

  /**
   * Force reset the circuit
   */
  reset(): void {
    this.transitionTo('closed')
    this.state.failureCount = 0
    this.state.successCount = 0
    this.state.failureRate = 0
    this.requestWindow = []
  }

  private transitionTo(newState: CircuitState): void {
    this.state.state = newState
    this.state.lastStateChange = Date.now()

    if (newState === 'closed') {
      this.state.failureCount = 0
      this.state.successCount = 0
    }
  }

  private addToWindow(success: boolean): void {
    const now = Date.now()
    this.requestWindow.push({ success, timestamp: now })
    this.state.requestCount++

    // Remove old entries outside the time window
    const cutoff = now - this.config.timeWindowMs
    this.requestWindow = this.requestWindow.filter((r) => r.timestamp >= cutoff)
  }

  private updateFailureRate(): void {
    if (this.requestWindow.length === 0) {
      this.state.failureRate = 0
      return
    }
    const failures = this.requestWindow.filter((r) => !r.success).length
    this.state.failureRate = failures / this.requestWindow.length
  }
}

// ============================================
// Health Checker
// ============================================

/**
 * Event callback type
 */
type EventCallback = (event: HealthEvent) => void

/**
 * Health Checker - performs active health checks on service instances
 */
export class HealthChecker {
  private config: HealthCheckConfig
  private checkTimers: Map<string, NodeJS.Timeout> = new Map()
  private instanceHealth: Map<string, InstanceHealth> = new Map()
  private circuitBreakers: Map<string, CircuitBreaker> = new Map()
  private eventCallbacks: EventCallback[] = []
  private isRunning = false
  private checkQueue: string[] = []
  private activeChecks = 0
  private checkHistory: Map<string, HealthCheckResult[]> = new Map()

  constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = { ...DEFAULT_HEALTH_CHECK_CONFIG, ...config }
  }

  /**
   * Start health checking for a service instance
   */
  registerInstance(instance: ServiceInstance): void {
    const instanceId = instance.id

    // Initialize instance health
    this.instanceHealth.set(instanceId, this.createInitialHealth(instance))
    this.circuitBreakers.set(instanceId, new CircuitBreaker(this.config.circuitBreaker))
    this.checkHistory.set(instanceId, [])

    // Start periodic checking if running
    if (this.isRunning) {
      this.scheduleCheck(instance)
    }
  }

  /**
   * Stop health checking for a service instance
   */
  unregisterInstance(instanceId: string): void {
    const timer = this.checkTimers.get(instanceId)
    if (timer) {
      clearTimeout(timer)
      this.checkTimers.delete(instanceId)
    }
    this.instanceHealth.delete(instanceId)
    this.circuitBreakers.delete(instanceId)
    this.checkHistory.delete(instanceId)
  }

  /**
   * Start all health checks
   */
  start(): void {
    if (this.isRunning) return
    this.isRunning = true

    // Schedule checks for all registered instances
    for (const instanceId of this.instanceHealth.keys()) {
      const health = this.instanceHealth.get(instanceId)
      if (health) {
        // Create a minimal ServiceInstance for scheduling
        this.scheduleCheck({
          id: instanceId,
          endpoint: health.endpoint,
          healthPath: '/health'
        } as ServiceInstance)
      }
    }
  }

  /**
   * Stop all health checks
   */
  stop(): void {
    this.isRunning = false
    for (const timer of this.checkTimers.values()) {
      clearTimeout(timer)
    }
    this.checkTimers.clear()
  }

  /**
   * Perform a single health check
   */
  async checkHealth(
    instance: ServiceInstance,
    type: HealthCheckType = 'liveness'
  ): Promise<HealthCheckResult> {
    const requestId = this.generateRequestId()
    const request: HealthCheckRequest = {
      instanceId: instance.id,
      type,
      timestamp: new Date().toISOString(),
      requestId
    }

    this.emitEvent('health.check.started', instance.id, { request })

    const circuitBreaker = this.circuitBreakers.get(instance.id)
    if (circuitBreaker && !circuitBreaker.isRequestAllowed()) {
      return this.createBlockedResult(request, circuitBreaker.getState())
    }

    const startTime = Date.now()
    let attempt = 0
    let lastError: HealthError | undefined

    while (attempt < (this.config.retry.enabled ? this.config.retry.maxAttempts : 1)) {
      attempt++
      try {
        const result = await this.executeCheck(instance, request, attempt)
        
        if (result.success && circuitBreaker) {
          circuitBreaker.recordSuccess()
        }

        this.updateInstanceHealth(instance.id, result)
        this.addToHistory(instance.id, result)

        if (result.success) {
          this.emitEvent('health.check.completed', instance.id, { result })
        } else {
          this.emitEvent('health.check.failed', instance.id, { result, error: result.error })
        }

        return result
      } catch (error) {
        lastError = this.parseError(error)
        
        if (circuitBreaker) {
          circuitBreaker.recordFailure()
        }

        if (attempt < (this.config.retry.enabled ? this.config.retry.maxAttempts : 1)) {
          await this.delay(this.calculateBackoff(attempt))
        }
      }
    }

    const failedResult: HealthCheckResult = {
      request,
      response: this.createErrorResponse(lastError),
      success: false,
      durationMs: Date.now() - startTime,
      executedAt: new Date().toISOString(),
      attempt,
      error: lastError
    }

    this.updateInstanceHealth(instance.id, failedResult)
    this.addToHistory(instance.id, failedResult)
    this.emitEvent('health.check.failed', instance.id, { result: failedResult, error: lastError })

    return failedResult
  }

  /**
   * Perform health check for all instances
   */
  async checkAll(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>()

    if (this.config.parallel) {
      // Parallel execution with concurrency limit
      const batches = this.createBatches(Array.from(this.instanceHealth.keys()), this.config.maxConcurrent)
      
      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(async (instanceId) => {
            const health = this.instanceHealth.get(instanceId)
            if (!health) return null
            
            const instance: ServiceInstance = {
              id: instanceId,
              endpoint: health.endpoint,
              healthPath: '/health',
              name: '',
              version: '',
              tags: [],
              metadata: {},
              registeredAt: '',
              weight: 1,
              priority: 1
            }
            
            const result = await this.checkHealth(instance)
            return { instanceId, result }
          })
        )

        for (const item of batchResults) {
          if (item) {
            results.set(item.instanceId, item.result)
          }
        }
      }
    } else {
      // Sequential execution
      for (const [instanceId, health] of this.instanceHealth) {
        const instance: ServiceInstance = {
          id: instanceId,
          endpoint: health.endpoint,
          healthPath: '/health',
          name: '',
          version: '',
          tags: [],
          metadata: {},
          registeredAt: '',
          weight: 1,
          priority: 1
        }
        
        const result = await this.checkHealth(instance)
        results.set(instanceId, result)
      }
    }

    return results
  }

  /**
   * Get instance health
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
   * Get check history for an instance
   */
  getCheckHistory(instanceId: string, limit?: number): HealthCheckResult[] {
    const history = this.checkHistory.get(instanceId) || []
    return limit ? history.slice(-limit) : [...history]
  }

  /**
   * Register event callback
   */
  onEvent(callback: EventCallback): void {
    this.eventCallbacks.push(callback)
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HealthCheckConfig>): void {
    this.config = { ...this.config, ...config }
  }

  // ============================================
  // Private Methods
  // ============================================

  private createInitialHealth(instance: ServiceInstance): InstanceHealth {
    return {
      instanceId: instance.id,
      endpoint: instance.endpoint,
      status: 'unknown',
      circuitBreakerState: 'closed',
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      avgResponseTimeMs: 0,
      responseTimeHistory: [],
      errorRate: 0,
      uptimePercentage: 100,
      totalChecks: 0,
      totalFailures: 0
    }
  }

  private scheduleCheck(instance: ServiceInstance): void {
    const existingTimer = this.checkTimers.get(instance.id)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(async () => {
      if (!this.isRunning) return
      
      await this.checkHealth(instance)
      
      // Reschedule
      if (this.isRunning) {
        this.scheduleCheck(instance)
      }
    }, this.config.intervalMs)

    this.checkTimers.set(instance.id, timer)
  }

  private async executeCheck(
    instance: ServiceInstance,
    request: HealthCheckRequest,
    attempt: number
  ): Promise<HealthCheckResult> {
    const startTime = Date.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs)

    try {
      const url = `${instance.endpoint}${instance.healthPath}`
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'X-Health-Check-Id': request.requestId,
          'X-Health-Check-Type': request.type
        }
      })

      clearTimeout(timeoutId)

      const durationMs = Date.now() - startTime
      const responseBody = await response.json()
      
      const healthResponse: HealthCheckResponse = {
        status: this.parseStatus(responseBody.status),
        version: responseBody.version,
        timestamp: new Date().toISOString(),
        responseTimeMs: durationMs,
        components: responseBody.components || [],
        dependencies: responseBody.dependencies,
        details: responseBody.details,
        error: responseBody.error
      }

      return {
        request,
        response: healthResponse,
        success: response.ok && healthResponse.status !== 'unhealthy',
        durationMs,
        executedAt: new Date().toISOString(),
        attempt
      }
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private updateInstanceHealth(instanceId: string, result: HealthCheckResult): void {
    const health = this.instanceHealth.get(instanceId)
    if (!health) return

    health.lastCheck = result
    health.totalChecks++

    // Update response time history
    health.responseTimeHistory.push(result.durationMs)
    if (health.responseTimeHistory.length > 5) {
      health.responseTimeHistory.shift()
    }
    health.avgResponseTimeMs = this.average(health.responseTimeHistory)

    // Update success/failure counts
    if (result.success) {
      health.consecutiveFailures = 0
      health.consecutiveSuccesses++
      health.lastSuccess = result.executedAt
    } else {
      health.consecutiveSuccesses = 0
      health.consecutiveFailures++
      health.totalFailures++
      health.lastFailure = result.executedAt
    }

    // Update error rate
    health.errorRate = health.totalFailures / health.totalChecks

    // Update status
    const previousStatus = health.status
    if (health.consecutiveFailures >= this.config.failureThreshold) {
      health.status = 'unhealthy'
    } else if (health.consecutiveFailures > 0) {
      health.status = 'degraded'
    } else if (health.consecutiveSuccesses >= this.config.successThreshold) {
      health.status = 'healthy'
    }

    // Update circuit breaker state
    const circuitBreaker = this.circuitBreakers.get(instanceId)
    if (circuitBreaker) {
      health.circuitBreakerState = circuitBreaker.getState()
    }

    // Emit status change event if status changed
    if (previousStatus !== health.status) {
      this.emitEvent('health.status.changed', instanceId, {
        previousStatus,
        newStatus: health.status
      })
    }
  }

  private addToHistory(instanceId: string, result: HealthCheckResult): void {
    const history = this.checkHistory.get(instanceId) || []
    history.push(result)
    
    // Keep history limited
    if (history.length > 100) {
      history.shift()
    }
    
    this.checkHistory.set(instanceId, history)
  }

  private parseStatus(status: string): HealthStatus {
    const normalized = status?.toLowerCase()
    if (['healthy', 'up', 'ok'].includes(normalized)) return 'healthy'
    if (['degraded', 'warning'].includes(normalized)) return 'degraded'
    if (['unhealthy', 'down', 'error'].includes(normalized)) return 'unhealthy'
    return 'unknown'
  }

  private parseError(error: unknown): HealthError {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          code: 'TIMEOUT',
          message: 'Health check timed out',
          type: 'timeout'
        }
      }
      return {
        code: 'CHECK_FAILED',
        message: error.message,
        type: 'connection',
        stack: error.stack
      }
    }
    return {
      code: 'UNKNOWN',
      message: String(error),
      type: 'unknown'
    }
  }

  private createErrorResponse(error?: HealthError): HealthCheckResponse {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTimeMs: 0,
      components: [],
      error
    }
  }

  private createBlockedResult(request: HealthCheckRequest, state: CircuitState): HealthCheckResult {
    return {
      request,
      response: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTimeMs: 0,
        components: [],
        error: {
          code: 'CIRCUIT_OPEN',
          message: `Circuit breaker is ${state}`,
          type: 'unknown'
        }
      },
      success: false,
      durationMs: 0,
      executedAt: new Date().toISOString(),
      attempt: 1,
      error: {
        code: 'CIRCUIT_OPEN',
        message: `Circuit breaker is ${state}`,
        type: 'unknown'
      }
    }
  }

  private calculateBackoff(attempt: number): number {
    const { initialDelayMs, maxDelayMs, backoffMultiplier, jitterFactor } = this.config.retry
    const delay = Math.min(
      initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
      maxDelayMs
    )
    const jitter = delay * jitterFactor * Math.random()
    return delay + jitter
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return numbers.reduce((a, b) => a + b, 0) / numbers.length
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  private generateRequestId(): string {
    return `hc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private emitEvent(type: HealthEventType, instanceId?: string, payload?: Record<string, unknown>): void {
    const event: HealthEvent = {
      id: this.generateRequestId(),
      type,
      timestamp: new Date().toISOString(),
      instanceId,
      payload: payload || {},
      metadata: {
        source: 'HealthChecker'
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

export default HealthChecker
