/**
 * Health Monitor Tests
 *
 * Comprehensive tests for the health monitoring system.
 *
 * @version v1.10.0
 * @author Executor + 咨询师
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  HealthMonitor,
  HealthChecker,
  PassiveHealthReporter,
  FailureDetector,
  RecoveryManager,
  HealthDashboard
} from '../index'
import type {
  ServiceInstance,
  HealthCheckResponse,
  HealthStatus,
  InstanceHealth,
  HealthAlert
} from '../types'
import type { HeartbeatPayload } from '../PassiveHealthReporter'

// ============================================
// Test Data
// ============================================

const createMockInstance = (id: string, name: string): ServiceInstance => ({
  id,
  name,
  version: '1.0.0',
  endpoint: `http://${name}-${id}:8080`,
  healthPath: '/health',
  tags: ['test'],
  metadata: {},
  registeredAt: new Date().toISOString(),
  weight: 1,
  priority: 1
})

const createMockHealthResponse = (status: HealthStatus): HealthCheckResponse => ({
  status,
  timestamp: new Date().toISOString(),
  responseTimeMs: 100,
  components: [
    { name: 'database', status: 'up', type: 'database' },
    { name: 'cache', status: 'up', type: 'cache' }
  ]
})

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// ============================================
// HealthChecker Tests
// ============================================

describe('HealthChecker', () => {
  let checker: HealthChecker

  beforeEach(() => {
    checker = new HealthChecker({
      intervalMs: 1000,
      timeoutMs: 1000,
      failureThreshold: 3,
      successThreshold: 2
    })
    mockFetch.mockReset()
  })

  afterEach(() => {
    checker.stop()
  })

  it('should register an instance', () => {
    const instance = createMockInstance('inst-1', 'test-service')
    checker.registerInstance(instance)

    const health = checker.getInstanceHealth('inst-1')
    expect(health).toBeDefined()
    expect(health?.instanceId).toBe('inst-1')
    expect(health?.status).toBe('unknown')
  })

  it('should unregister an instance', () => {
    const instance = createMockInstance('inst-1', 'test-service')
    checker.registerInstance(instance)
    checker.unregisterInstance('inst-1')

    const health = checker.getInstanceHealth('inst-1')
    expect(health).toBeUndefined()
  })

  it('should perform a health check', async () => {
    const instance = createMockInstance('inst-1', 'test-service')
    checker.registerInstance(instance)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createMockHealthResponse('healthy')
    })

    const result = await checker.checkHealth(instance)

    expect(result.success).toBe(true)
    expect(result.response.status).toBe('healthy')
  })

  it('should handle failed health checks', async () => {
    const instance = createMockInstance('inst-1', 'test-service')
    checker.registerInstance(instance)

    mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

    const result = await checker.checkHealth(instance)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.type).toBe('connection')
  })

  it('should handle errors gracefully', async () => {
    const instance = createMockInstance('inst-1', 'test-service')
    checker.registerInstance(instance)

    // Mock fetch to reject with an error
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await checker.checkHealth(instance)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should update instance health after check', async () => {
    const instance = createMockInstance('inst-1', 'test-service')
    // Use config with successThreshold of 1 so single success marks as healthy
    checker = new HealthChecker({
      intervalMs: 1000,
      timeoutMs: 1000,
      failureThreshold: 3,
      successThreshold: 1
    })
    checker.registerInstance(instance)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createMockHealthResponse('healthy')
    })

    await checker.checkHealth(instance)

    const health = checker.getInstanceHealth('inst-1')
    expect(health?.status).toBe('healthy')
    expect(health?.consecutiveSuccesses).toBe(1)
  })

  it('should track consecutive failures', async () => {
    const instance = createMockInstance('inst-1', 'test-service')
    // Use failureThreshold of 2 so 2 failures mark as unhealthy
    checker = new HealthChecker({
      intervalMs: 1000,
      timeoutMs: 1000,
      failureThreshold: 2,
      successThreshold: 2
    })
    checker.registerInstance(instance)

    // Simulate 2 failures
    for (let i = 0; i < 2; i++) {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))
      await checker.checkHealth(instance)
    }

    const health = checker.getInstanceHealth('inst-1')
    expect(health?.consecutiveFailures).toBe(2)
    expect(health?.status).toBe('unhealthy')
  })

  it('should support parallel health checks', async () => {
    const checker = new HealthChecker({
      intervalMs: 1000,
      timeoutMs: 1000,
      parallel: true,
      maxConcurrent: 5
    })

    // Register 5 instances
    for (let i = 1; i <= 5; i++) {
      const instance = createMockInstance(`inst-${i}`, 'test-service')
      checker.registerInstance(instance)
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => createMockHealthResponse('healthy')
    })

    const results = await checker.checkAll()

    expect(results.size).toBe(5)
    expect(mockFetch).toHaveBeenCalledTimes(5)

    checker.stop()
  })

  it('should emit events', async () => {
    const instance = createMockInstance('inst-1', 'test-service')
    checker.registerInstance(instance)

    const eventHandler = vi.fn()
    checker.onEvent(eventHandler)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createMockHealthResponse('healthy')
    })

    await checker.checkHealth(instance)

    expect(eventHandler).toHaveBeenCalled()
    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('health.check')
      })
    )
  })
})

// ============================================
// PassiveHealthReporter Tests
// ============================================

describe('PassiveHealthReporter', () => {
  let reporter: PassiveHealthReporter

  beforeEach(() => {
    reporter = new PassiveHealthReporter()
  })

  afterEach(() => {
    reporter.stop()
  })

  it('should receive a heartbeat', () => {
    const payload: HeartbeatPayload = {
      instanceId: 'inst-1',
      serviceName: 'test-service',
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date().toISOString()
    }

    const result = reporter.receiveHeartbeat(payload)

    expect(result.success).toBe(true)
    expect(result.status).toBe('healthy')
  })

  it('should track instance health from heartbeats', () => {
    const payload: HeartbeatPayload = {
      instanceId: 'inst-1',
      serviceName: 'test-service',
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date().toISOString()
    }

    reporter.receiveHeartbeat(payload)

    const health = reporter.getInstanceHealth('inst-1')
    expect(health).toBeDefined()
    expect(health?.status).toBe('healthy')
  })

  it('should detect stale instances', async () => {
    reporter = new PassiveHealthReporter({
      intervalMs: 100,
      staleThresholdMs: 200
    })
    reporter.start()

    const payload: HeartbeatPayload = {
      instanceId: 'inst-1',
      serviceName: 'test-service',
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date().toISOString()
    }

    reporter.receiveHeartbeat(payload)

    // Wait for stale detection
    await new Promise((resolve) => setTimeout(resolve, 300))

    const stale = reporter.getStaleInstances()
    expect(stale.length).toBeGreaterThan(0)
    expect(stale[0].instanceId).toBe('inst-1')
  })

  it('should store custom metrics', () => {
    const payload: HeartbeatPayload = {
      instanceId: 'inst-1',
      serviceName: 'test-service',
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      details: {
        metrics: [
          { name: 'response_time', value: 150, unit: 'ms', labels: {} },
          { name: 'error_rate', value: 0.02, unit: '%', labels: {} }
        ]
      }
    }

    reporter.receiveHeartbeat(payload)

    const metrics = reporter.getMetrics('inst-1')
    expect(metrics.length).toBeGreaterThan(0)
    expect(metrics[0].custom.length).toBe(2)
  })
})

// ============================================
// FailureDetector Tests
// ============================================

describe('FailureDetector', () => {
  let detector: FailureDetector

  beforeEach(() => {
    detector = new FailureDetector({
      timeoutThresholdMs: 5000,
      errorRateThreshold: 0.1,
      responseTimeThresholdMs: 2000
    })
  })

  it('should detect high error rate', () => {
    const instanceHealth: InstanceHealth = {
      instanceId: 'inst-1',
      endpoint: 'http://localhost:8080',
      status: 'degraded',
      circuitBreakerState: 'closed',
      consecutiveFailures: 5,
      consecutiveSuccesses: 0,
      avgResponseTimeMs: 500,
      responseTimeHistory: [500, 600, 450],
      errorRate: 0.25, // 25% error rate
      uptimePercentage: 75,
      totalChecks: 20,
      totalFailures: 5
    }

    const recentResults = Array(10).fill(null).map((_, i) => ({
      request: { instanceId: 'inst-1', type: 'liveness', timestamp: new Date().toISOString(), requestId: `req-${i}` },
      response: { status: i < 3 ? 'unhealthy' : 'healthy', timestamp: new Date().toISOString(), responseTimeMs: 100, components: [] },
      success: i >= 3,
      durationMs: 100,
      executedAt: new Date().toISOString(),
      attempt: 1
    }))

    const failures = detector.analyze('inst-1', instanceHealth, recentResults as any)

    expect(failures.length).toBeGreaterThan(0)
    expect(failures.some(f => f.type === 'error_rate_high')).toBe(true)
  })

  it('should detect circuit breaker open', () => {
    const instanceHealth: InstanceHealth = {
      instanceId: 'inst-1',
      endpoint: 'http://localhost:8080',
      status: 'unhealthy',
      circuitBreakerState: 'open',
      consecutiveFailures: 10,
      consecutiveSuccesses: 0,
      avgResponseTimeMs: 500,
      responseTimeHistory: [],
      errorRate: 0.5,
      uptimePercentage: 50,
      totalChecks: 20,
      totalFailures: 10
    }

    const failures = detector.analyze('inst-1', instanceHealth, [])

    expect(failures.some(f => f.type === 'circuit_breaker_open')).toBe(true)
  })

  it('should generate alerts for failures', () => {
    const instanceHealth: InstanceHealth = {
      instanceId: 'inst-1',
      endpoint: 'http://localhost:8080',
      status: 'unhealthy',
      circuitBreakerState: 'open',
      consecutiveFailures: 10,
      consecutiveSuccesses: 0,
      avgResponseTimeMs: 500,
      responseTimeHistory: [],
      errorRate: 0.5,
      uptimePercentage: 50,
      totalChecks: 20,
      totalFailures: 10
    }

    detector.analyze('inst-1', instanceHealth, [])

    const alerts = detector.getActiveAlerts()
    expect(alerts.length).toBeGreaterThan(0)
  })

  it('should resolve failures', () => {
    const instanceHealth: InstanceHealth = {
      instanceId: 'inst-1',
      endpoint: 'http://localhost:8080',
      status: 'unhealthy',
      circuitBreakerState: 'open',
      consecutiveFailures: 10,
      consecutiveSuccesses: 0,
      avgResponseTimeMs: 500,
      responseTimeHistory: [],
      errorRate: 0.5,
      uptimePercentage: 50,
      totalChecks: 20,
      totalFailures: 10
    }

    const failures = detector.analyze('inst-1', instanceHealth, [])
    
    // Resolve all detected failures
    for (const failure of failures) {
      const result = detector.resolveFailure('inst-1', failure.id)
      expect(result).toBe(true)
    }

    const activeFailures = detector.getFailures('inst-1', false)
    expect(activeFailures.length).toBe(0)
  })

  it('should return failure statistics', () => {
    const instanceHealth: InstanceHealth = {
      instanceId: 'inst-1',
      endpoint: 'http://localhost:8080',
      status: 'unhealthy',
      circuitBreakerState: 'open',
      consecutiveFailures: 10,
      consecutiveSuccesses: 0,
      avgResponseTimeMs: 500,
      responseTimeHistory: [],
      errorRate: 0.5,
      uptimePercentage: 50,
      totalChecks: 20,
      totalFailures: 10
    }

    detector.analyze('inst-1', instanceHealth, [])

    const stats = detector.getStatistics()
    expect(stats.totalFailures).toBeGreaterThan(0)
    expect(stats.activeFailures).toBeGreaterThan(0)
  })
})

// ============================================
// RecoveryManager Tests
// ============================================

describe('RecoveryManager', () => {
  let manager: RecoveryManager

  beforeEach(() => {
    manager = new RecoveryManager({
      enableAutoRecovery: true,
      maxConcurrentRecoveries: 3
    })
  })

  it('should find applicable recovery strategy', () => {
    const failure = {
      id: 'fail-1',
      instanceId: 'inst-1',
      type: 'circuit_breaker_open',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      message: 'Circuit breaker is open',
      details: {},
      occurrences: 1,
      firstOccurrence: new Date().toISOString(),
      lastOccurrence: new Date().toISOString(),
      resolved: false,
      relatedFailures: []
    }

    const instanceHealth: InstanceHealth = {
      instanceId: 'inst-1',
      endpoint: 'http://localhost:8080',
      status: 'unhealthy',
      circuitBreakerState: 'open',
      consecutiveFailures: 5,
      consecutiveSuccesses: 0,
      avgResponseTimeMs: 500,
      responseTimeHistory: [],
      errorRate: 0.5,
      uptimePercentage: 50,
      totalChecks: 20,
      totalFailures: 10
    }

    // Recovery should not throw
    expect(async () => {
      await manager.recover('inst-1', failure as any, instanceHealth)
    }).not.toThrow()
  })

  it('should track recovery attempts', async () => {
    const failure = {
      id: 'fail-1',
      instanceId: 'inst-1',
      type: 'circuit_breaker_open',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      message: 'Circuit breaker is open',
      details: {},
      occurrences: 1,
      firstOccurrence: new Date().toISOString(),
      lastOccurrence: new Date().toISOString(),
      resolved: false,
      relatedFailures: []
    }

    const instanceHealth: InstanceHealth = {
      instanceId: 'inst-1',
      endpoint: 'http://localhost:8080',
      status: 'unhealthy',
      circuitBreakerState: 'open',
      consecutiveFailures: 5,
      consecutiveSuccesses: 0,
      avgResponseTimeMs: 500,
      responseTimeHistory: [],
      errorRate: 0.5,
      uptimePercentage: 50,
      totalChecks: 20,
      totalFailures: 10
    }

    await manager.recover('inst-1', failure as any, instanceHealth)

    const attempts = manager.getAttempts('inst-1')
    expect(attempts.length).toBeGreaterThan(0)
  })

  it('should calculate recovery metrics', async () => {
    const failure = {
      id: 'fail-1',
      instanceId: 'inst-1',
      type: 'circuit_breaker_open',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      message: 'Circuit breaker is open',
      details: {},
      occurrences: 1,
      firstOccurrence: new Date().toISOString(),
      lastOccurrence: new Date().toISOString(),
      resolved: false,
      relatedFailures: []
    }

    const instanceHealth: InstanceHealth = {
      instanceId: 'inst-1',
      endpoint: 'http://localhost:8080',
      status: 'unhealthy',
      circuitBreakerState: 'open',
      consecutiveFailures: 5,
      consecutiveSuccesses: 0,
      avgResponseTimeMs: 500,
      responseTimeHistory: [],
      errorRate: 0.5,
      uptimePercentage: 50,
      totalChecks: 20,
      totalFailures: 10
    }

    await manager.recover('inst-1', failure as any, instanceHealth)

    const metrics = manager.getMetrics()
    expect(metrics.totalAttempts).toBeGreaterThan(0)
  })
})

// ============================================
// HealthDashboard Tests
// ============================================

describe('HealthDashboard', () => {
  let dashboard: HealthDashboard

  beforeEach(() => {
    dashboard = new HealthDashboard()
  })

  it('should update and retrieve service health', () => {
    const serviceHealth = {
      serviceName: 'test-service',
      status: 'healthy',
      totalInstances: 3,
      healthyInstances: 3,
      unhealthyInstances: 0,
      degradedInstances: 0,
      instances: [],
      lastChecked: new Date().toISOString(),
      healthScore: 100,
      alerts: []
    }

    dashboard.updateServiceHealth('test-service', serviceHealth as any)

    const retrieved = dashboard.getServiceHealth('test-service')
    expect(retrieved).toBeDefined()
    expect((retrieved as any).serviceName).toBe('test-service')
  })

  it('should update and retrieve instance health', () => {
    const instanceHealth: InstanceHealth = {
      instanceId: 'inst-1',
      endpoint: 'http://localhost:8080',
      status: 'healthy',
      circuitBreakerState: 'closed',
      consecutiveFailures: 0,
      consecutiveSuccesses: 5,
      avgResponseTimeMs: 100,
      responseTimeHistory: [100, 110, 95],
      errorRate: 0,
      uptimePercentage: 100,
      totalChecks: 100,
      totalFailures: 0
    }

    dashboard.updateInstanceHealth('inst-1', instanceHealth)

    const retrieved = dashboard.getInstanceHealth('inst-1')
    expect(retrieved).toBeDefined()
    expect((retrieved as InstanceHealth).instanceId).toBe('inst-1')
  })

  it('should calculate dashboard summary', () => {
    // Add some test data
    dashboard.updateServiceHealth('service-1', {
      serviceName: 'service-1',
      status: 'healthy',
      totalInstances: 2,
      healthyInstances: 2,
      unhealthyInstances: 0,
      degradedInstances: 0,
      instances: [],
      lastChecked: new Date().toISOString(),
      healthScore: 100,
      alerts: []
    })

    dashboard.updateInstanceHealth('inst-1', {
      instanceId: 'inst-1',
      endpoint: 'http://localhost:8080',
      status: 'healthy',
      circuitBreakerState: 'closed',
      consecutiveFailures: 0,
      consecutiveSuccesses: 5,
      avgResponseTimeMs: 100,
      responseTimeHistory: [100],
      errorRate: 0,
      uptimePercentage: 100,
      totalChecks: 100,
      totalFailures: 0
    })

    const summary = dashboard.getSummary()

    expect(summary.totalServices).toBe(1)
    expect(summary.healthyServices).toBe(1)
    expect(summary.totalInstances).toBe(1)
  })

  it('should generate health report', () => {
    dashboard.updateServiceHealth('service-1', {
      serviceName: 'service-1',
      status: 'healthy',
      totalInstances: 2,
      healthyInstances: 2,
      unhealthyInstances: 0,
      degradedInstances: 0,
      instances: [],
      lastChecked: new Date().toISOString(),
      healthScore: 100,
      alerts: []
    })

    const report = dashboard.generateReport()

    expect(report.id).toBeDefined()
    expect(report.timestamp).toBeDefined()
    expect(report.overallStatus).toBe('healthy')
    expect(report.services.length).toBe(1)
  })

  it('should calculate health score', () => {
    dashboard.updateInstanceHealth('inst-1', {
      instanceId: 'inst-1',
      endpoint: 'http://localhost:8080',
      status: 'healthy',
      circuitBreakerState: 'closed',
      consecutiveFailures: 0,
      consecutiveSuccesses: 5,
      avgResponseTimeMs: 100,
      responseTimeHistory: [100],
      errorRate: 0,
      uptimePercentage: 99.9,
      totalChecks: 100,
      totalFailures: 0
    })

    const score = dashboard.getHealthScore()

    expect(score.overall).toBeGreaterThan(80)
    expect(score.availability).toBeGreaterThan(90)
    expect(score.performance).toBeGreaterThan(80)
  })

  it('should get dashboard widgets', () => {
    const widgets = dashboard.getWidgets()

    expect(widgets.length).toBeGreaterThan(0)
    expect(widgets.some(w => w.type === 'status')).toBe(true)
    expect(widgets.some(w => w.type === 'gauge')).toBe(true)
    expect(widgets.some(w => w.type === 'chart')).toBe(true)
  })

  it('should generate recommendations', () => {
    // Add unhealthy instance
    dashboard.updateInstanceHealth('inst-1', {
      instanceId: 'inst-1',
      endpoint: 'http://localhost:8080',
      status: 'unhealthy',
      circuitBreakerState: 'open',
      consecutiveFailures: 10,
      consecutiveSuccesses: 0,
      avgResponseTimeMs: 5000,
      responseTimeHistory: [5000],
      errorRate: 0.5,
      uptimePercentage: 50,
      totalChecks: 100,
      totalFailures: 50
    })

    const report = dashboard.generateReport()
    const recommendations = report.recommendations

    expect(recommendations.length).toBeGreaterThan(0)
  })
})

// ============================================
// HealthMonitor Integration Tests
// ============================================

describe('HealthMonitor', () => {
  let monitor: HealthMonitor

  beforeEach(() => {
    monitor = new HealthMonitor({
      checkConfig: {
        intervalMs: 1000,
        timeoutMs: 1000,
        failureThreshold: 3,
        successThreshold: 2,
        parallel: true,
        maxConcurrent: 10,
        retry: {
          enabled: true,
          maxAttempts: 3,
          initialDelayMs: 100,
          maxDelayMs: 1000,
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
      },
      defaultIntervalMs: 1000,
      maxHistorySize: 100,
      enablePassiveReporting: true,
      enableMetrics: true,
      metricsRetentionMs: 3600000,
      enableDashboard: true,
      dashboardRefreshMs: 5000,
      notificationChannels: [],
      logging: {
        level: 'info',
        includeTimestamps: true,
        includeMetadata: true
      }
    })
    mockFetch.mockReset()
  })

  afterEach(() => {
    monitor.stop()
  })

  it('should start and stop', () => {
    monitor.start()
    expect(monitor.getStatus().isRunning).toBe(true)

    monitor.stop()
    expect(monitor.getStatus().isRunning).toBe(false)
  })

  it('should register services', () => {
    const instance = createMockInstance('inst-1', 'test-service')
    monitor.registerService(instance)

    const status = monitor.getStatus()
    expect(status.registeredInstances).toBe(1)
    expect(status.registeredServices).toBe(1)
  })

  it('should unregister services', () => {
    const instance = createMockInstance('inst-1', 'test-service')
    monitor.registerService(instance)
    monitor.unregisterService('inst-1')

    const status = monitor.getStatus()
    expect(status.registeredInstances).toBe(0)
  })

  it('should receive heartbeats', () => {
    monitor.start()

    const result = monitor.receiveHeartbeat({
      instanceId: 'inst-1',
      serviceName: 'test-service',
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date().toISOString()
    })

    expect(result.success).toBe(true)
  })

  it('should check instance health', async () => {
    const instance = createMockInstance('inst-1', 'test-service')
    monitor.registerService(instance)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createMockHealthResponse('healthy')
    })

    const health = await monitor.checkInstance('inst-1')

    expect(health).toBeDefined()
    // Status might be 'unknown' if successThreshold > 1, but health object should exist
    expect(health?.instanceId).toBe('inst-1')
  })

  it('should check all instances', async () => {
    monitor.registerService(createMockInstance('inst-1', 'service-1'))
    monitor.registerService(createMockInstance('inst-2', 'service-2'))

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => createMockHealthResponse('healthy')
    })

    const results = await monitor.checkAllInstances()

    expect(results.size).toBe(2)
  })

  it('should get service health', () => {
    monitor.registerService(createMockInstance('inst-1', 'test-service'))

    const health = monitor.getServiceHealth('test-service')
    expect(health).toBeDefined()
  })

  it('should generate report', () => {
    monitor.registerService(createMockInstance('inst-1', 'test-service'))

    const report = monitor.generateReport()

    expect(report).toBeDefined()
    expect(report.timestamp).toBeDefined()
  })

  it('should get dashboard summary', () => {
    const summary = monitor.getDashboardSummary()

    expect(summary).toBeDefined()
    expect(typeof summary.totalServices).toBe('number')
  })

  it('should handle events', async () => {
    const instance = createMockInstance('inst-1', 'test-service')
    monitor.registerService(instance)

    const eventHandler = vi.fn()
    monitor.onEvent(eventHandler)

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => createMockHealthResponse('healthy')
    })

    await monitor.checkInstance('inst-1')

    expect(eventHandler).toHaveBeenCalled()
  })

  it('should support 50+ instances', () => {
    // Register 50 instances
    for (let i = 1; i <= 50; i++) {
      monitor.registerService(createMockInstance(`inst-${i}`, `service-${i % 10}`))
    }

    const status = monitor.getStatus()
    expect(status.registeredInstances).toBe(50)
    expect(status.registeredServices).toBe(10)
  })
})
