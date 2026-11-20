/**
 * @vitest-environment node
 *
 * Health Monitor — full unit + integration suite (fake timers)
 *
 * ONE file on purpose: the repo-level vitest setup (tests/setup.ts: MSW +
 * jsdom + testing-library) is executed once PER TEST FILE, so splitting this
 * suite across six files multiplied the fixed setup cost by six and
 * dominated the runtime (see T290 report for the measured numbers).
 *
 * Every suite uses vi.useFakeTimers() + vi.setSystemTime(); no test waits
 * on wall-clock time.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { HealthMonitor } from '../HealthMonitor'
import { HealthChecker } from '../HealthChecker'
import { PassiveHealthReporter } from '../PassiveHealthReporter'
import { FailureDetector } from '../FailureDetector'
import type { FailureDetectionRule } from '../FailureDetector'
import { RecoveryManager } from '../RecoveryManager'
import type { RecoveryStrategy } from '../RecoveryManager'
import { HealthDashboard } from '../HealthDashboard'
import type { ServiceHealth, HealthIncident, HealthMonitorConfig } from '../types'
import { DEFAULT_HEALTH_MONITOR_CONFIG, DEFAULT_HEALTH_CHECK_CONFIG } from '../types'
import type { HeartbeatPayload } from '../PassiveHealthReporter'
import {
  createMockInstance,
  createMockHealthResponse,
  makeCheckConfig,
  makeInstanceHealth,
  makeCheckResults,
  makeAlert,
  makeServiceHealth,
  makeFailure,
  stubRandom,
  withTimers,
  BASE_TIME
} from './test-utils'

const mockFetch = vi.fn()

const makePayload = (overrides: Partial<HeartbeatPayload> = {}): HeartbeatPayload => ({
  instanceId: 'inst-1',
  serviceName: 'test-service',
  version: '1.0.0',
  status: 'healthy',
  timestamp: BASE_TIME.toISOString(),
  ...overrides
})

describe('HealthChecker', () => {
  let checker: HealthChecker

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(BASE_TIME)
    mockFetch.mockReset()
    global.fetch = mockFetch as unknown as typeof fetch
    checker = new HealthChecker(
      makeCheckConfig({
        intervalMs: 1000,
        timeoutMs: 1000,
        failureThreshold: 3,
        successThreshold: 2
      })
    )
  })

  afterEach(() => {
    checker.stop()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('registration', () => {
    it('registers an instance with unknown initial status', () => {
      checker.registerInstance(createMockInstance('inst-1', 'test-service'))

      const health = checker.getInstanceHealth('inst-1')
      expect(health).toBeDefined()
      expect(health?.instanceId).toBe('inst-1')
      expect(health?.status).toBe('unknown')
      expect(health?.totalChecks).toBe(0)
      expect(health?.circuitBreakerState).toBe('closed')
    })

    it('unregisters an instance and drops its history', () => {
      checker.registerInstance(createMockInstance('inst-1'))
      expect(checker.getCheckHistory('inst-1')).toEqual([])

      checker.unregisterInstance('inst-1')

      expect(checker.getInstanceHealth('inst-1')).toBeUndefined()
      expect(checker.getCheckHistory('inst-1')).toEqual([])
    })

    it('exposes all instance health via getAllInstanceHealth', () => {
      checker.registerInstance(createMockInstance('inst-1'))
      checker.registerInstance(createMockInstance('inst-2'))

      expect(checker.getAllInstanceHealth().size).toBe(2)
    })
  })

  describe('single health check', () => {
    it('performs a successful health check', async () => {
      const instance = createMockInstance('inst-1')
      checker.registerInstance(instance)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockHealthResponse('healthy')
      })

      const result = await withTimers(checker.checkHealth(instance))

      expect(result.success).toBe(true)
      expect(result.response.status).toBe('healthy')
      expect(result.attempt).toBe(1)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('sends the health path and the X-Health-Check headers', async () => {
      const instance = createMockInstance('inst-1')
      checker.registerInstance(instance)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockHealthResponse('healthy')
      })

      await withTimers(checker.checkHealth(instance))

      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toBe('http://test-service-inst-1:8080/health')
      expect(init.method).toBe('GET')
      expect(init.headers['X-Health-Check-Type']).toBe('liveness')
      expect(init.headers['Accept']).toBe('application/json')
    })

    it('treats a degraded status as a successful check', async () => {
      const instance = createMockInstance('inst-1')
      checker.registerInstance(instance)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockHealthResponse('degraded')
      })

      const result = await withTimers(checker.checkHealth(instance))

      expect(result.success).toBe(true)
      expect(result.response.status).toBe('degraded')
    })

    it('treats an unhealthy status as a failed check', async () => {
      const instance = createMockInstance('inst-1')
      checker.registerInstance(instance)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockHealthResponse('unhealthy')
      })

      const result = await withTimers(checker.checkHealth(instance))

      expect(result.success).toBe(false)
      expect(result.response.status).toBe('unhealthy')
    })

    it('normalises unknown status strings to "unknown"', async () => {
      const instance = createMockInstance('inst-1')
      checker.registerInstance(instance)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockHealthResponse('healthy', { status: 'weird' as never })
      })

      const result = await withTimers(checker.checkHealth(instance))

      expect(result.response.status).toBe('unknown')
    })

    it('classifies a network error as a connection failure', async () => {
      const instance = createMockInstance('inst-1')
      checker.registerInstance(instance)

      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      const result = await withTimers(checker.checkHealth(instance))

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('connection')
      expect(result.error?.code).toBe('CHECK_FAILED')
    })

    it('classifies an aborted request as a timeout', async () => {
      const instance = createMockInstance('inst-1')
      checker = new HealthChecker(
        makeCheckConfig({
          intervalMs: 1000,
          timeoutMs: 1000,
          retry: { enabled: false, maxAttempts: 1, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2, jitterFactor: 0 }
        })
      )
      checker.registerInstance(instance)

      const abortError = new Error('aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      const result = await withTimers(checker.checkHealth(instance))

      expect(result.error?.type).toBe('timeout')
      expect(result.error?.code).toBe('TIMEOUT')
    })

    it('reports attempt count and error message on failure', async () => {
      const instance = createMockInstance('inst-1')
      checker.registerInstance(instance)

      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await withTimers(checker.checkHealth(instance))

      expect(result.success).toBe(false)
      expect(result.error?.message).toBe('Network error')
      expect(result.response.status).toBe('unhealthy')
    })
  })

  describe('retry with backoff', () => {
    it('retries up to maxAttempts and only then reports failure', async () => {
      stubRandom(0)
      const instance = createMockInstance('inst-1')
      checker = new HealthChecker(
        makeCheckConfig({
          intervalMs: 1000,
          timeoutMs: 1000,
          retry: { enabled: true, maxAttempts: 3, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2, jitterFactor: 0.1 }
        })
      )
      checker.registerInstance(instance)

      mockFetch.mockRejectedValue(new Error('down'))

      const result = await withTimers(checker.checkHealth(instance))

      expect(result.success).toBe(false)
      expect(result.attempt).toBe(3)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('does not retry when retry is disabled', async () => {
      const instance = createMockInstance('inst-1')
      checker = new HealthChecker(
        makeCheckConfig({
          intervalMs: 1000,
          timeoutMs: 1000,
          retry: { enabled: false, maxAttempts: 3, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2, jitterFactor: 0.1 }
        })
      )
      checker.registerInstance(instance)

      mockFetch.mockRejectedValue(new Error('down'))

      const result = await withTimers(checker.checkHealth(instance))

      expect(result.attempt).toBe(1)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('stops retrying as soon as an attempt succeeds', async () => {
      stubRandom(0)
      const instance = createMockInstance('inst-1')
      checker = new HealthChecker(
        makeCheckConfig({
          intervalMs: 1000,
          timeoutMs: 1000,
          retry: { enabled: true, maxAttempts: 3, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2, jitterFactor: 0.1 }
        })
      )
      checker.registerInstance(instance)

      mockFetch
        .mockRejectedValueOnce(new Error('down'))
        .mockResolvedValueOnce({ ok: true, json: async () => createMockHealthResponse('healthy') })

      const result = await withTimers(checker.checkHealth(instance))

      expect(result.success).toBe(true)
      expect(result.attempt).toBe(2)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('status transitions', () => {
    it('marks healthy only after successThreshold consecutive successes', async () => {
      const instance = createMockInstance('inst-1')
      checker = new HealthChecker(
        makeCheckConfig({ intervalMs: 1000, timeoutMs: 1000, failureThreshold: 3, successThreshold: 2 })
      )
      checker.registerInstance(instance)

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockHealthResponse('healthy')
      })

      await withTimers(checker.checkHealth(instance))
      expect(checker.getInstanceHealth('inst-1')?.status).toBe('unknown')

      await withTimers(checker.checkHealth(instance))
      const health = checker.getInstanceHealth('inst-1')
      expect(health?.status).toBe('healthy')
      expect(health?.consecutiveSuccesses).toBe(2)
      expect(health?.consecutiveFailures).toBe(0)
    })

    it('marks degraded after a single failure below the threshold', async () => {
      const instance = createMockInstance('inst-1')
      checker = new HealthChecker(
        makeCheckConfig({ intervalMs: 1000, timeoutMs: 1000, failureThreshold: 3, successThreshold: 1 })
      )
      checker.registerInstance(instance)

      mockFetch.mockRejectedValueOnce(new Error('down'))
      await withTimers(checker.checkHealth(instance))

      const health = checker.getInstanceHealth('inst-1')
      expect(health?.status).toBe('degraded')
      expect(health?.consecutiveFailures).toBe(1)
      expect(health?.totalFailures).toBe(1)
    })

    it('marks unhealthy once failureThreshold consecutive failures are reached', async () => {
      const instance = createMockInstance('inst-1')
      checker = new HealthChecker(
        makeCheckConfig({
          intervalMs: 1000,
          timeoutMs: 1000,
          failureThreshold: 2,
          successThreshold: 2,
          retry: { enabled: false, maxAttempts: 1, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2, jitterFactor: 0 }
        })
      )
      checker.registerInstance(instance)

      mockFetch.mockRejectedValue(new Error('down'))

      await withTimers(checker.checkHealth(instance))
      await withTimers(checker.checkHealth(instance))

      const health = checker.getInstanceHealth('inst-1')
      expect(health?.consecutiveFailures).toBe(2)
      expect(health?.status).toBe('unhealthy')
      expect(health?.totalFailures).toBe(2)
    })

    it('resets the failure counter after a success', async () => {
      const instance = createMockInstance('inst-1')
      checker = new HealthChecker(
        makeCheckConfig({
          intervalMs: 1000,
          timeoutMs: 1000,
          failureThreshold: 3,
          successThreshold: 1,
          retry: { enabled: false, maxAttempts: 1, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2, jitterFactor: 0 }
        })
      )
      checker.registerInstance(instance)

      mockFetch.mockRejectedValueOnce(new Error('down'))
      await withTimers(checker.checkHealth(instance))
      expect(checker.getInstanceHealth('inst-1')?.consecutiveFailures).toBe(1)

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => createMockHealthResponse('healthy') })
      await withTimers(checker.checkHealth(instance))

      const health = checker.getInstanceHealth('inst-1')
      expect(health?.consecutiveFailures).toBe(0)
      expect(health?.consecutiveSuccesses).toBe(1)
    })

    it('tracks error rate and the last-5 response time window', async () => {
      const instance = createMockInstance('inst-1')
      checker = new HealthChecker(
        makeCheckConfig({
          intervalMs: 1000,
          timeoutMs: 1000,
          failureThreshold: 3,
          successThreshold: 1,
          retry: { enabled: false, maxAttempts: 1, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2, jitterFactor: 0 }
        })
      )
      checker.registerInstance(instance)

      mockFetch.mockRejectedValueOnce(new Error('down'))
      await withTimers(checker.checkHealth(instance))

      mockFetch.mockResolvedValue({ ok: true, json: async () => createMockHealthResponse('healthy') })
      for (let i = 0; i < 6; i++) {
        await withTimers(checker.checkHealth(instance))
      }

      const health = checker.getInstanceHealth('inst-1')!
      expect(health.totalChecks).toBe(7)
      expect(health.totalFailures).toBe(1)
      expect(health.errorRate).toBeCloseTo(1 / 7, 5)
      expect(health.responseTimeHistory.length).toBeLessThanOrEqual(5)
    })
  })

  describe('circuit breaker', () => {
    it('opens the circuit after failureThreshold failures', async () => {
      const instance = createMockInstance('inst-1')
      checker = new HealthChecker(
        makeCheckConfig({
          intervalMs: 1000,
          timeoutMs: 1000,
          failureThreshold: 3,
          successThreshold: 1,
          retry: { enabled: false, maxAttempts: 1, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2, jitterFactor: 0 },
          circuitBreaker: { enabled: true, failureThreshold: 2, failureRateThreshold: 0.5, timeWindowMs: 60000, resetTimeoutMs: 30000, minimumNumberOfCalls: 10 }
        })
      )
      checker.registerInstance(instance)

      mockFetch.mockRejectedValue(new Error('down'))
      await withTimers(checker.checkHealth(instance))
      await withTimers(checker.checkHealth(instance))

      expect(checker.getInstanceHealth('inst-1')?.circuitBreakerState).toBe('open')
    })

    it('blocks requests while the circuit is open', async () => {
      const instance = createMockInstance('inst-1')
      checker = new HealthChecker(
        makeCheckConfig({
          intervalMs: 1000,
          timeoutMs: 1000,
          failureThreshold: 3,
          successThreshold: 1,
          retry: { enabled: false, maxAttempts: 1, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2, jitterFactor: 0 },
          circuitBreaker: { enabled: true, failureThreshold: 2, failureRateThreshold: 0.5, timeWindowMs: 60000, resetTimeoutMs: 30000, minimumNumberOfCalls: 10 }
        })
      )
      checker.registerInstance(instance)

      mockFetch.mockRejectedValue(new Error('down'))
      await withTimers(checker.checkHealth(instance))
      await withTimers(checker.checkHealth(instance))

      mockFetch.mockClear()
      const blocked = await withTimers(checker.checkHealth(instance))

      expect(blocked.success).toBe(false)
      expect(blocked.error?.code).toBe('CIRCUIT_OPEN')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('moves to half-open after the reset timeout and closes on success', async () => {
      const instance = createMockInstance('inst-1')
      checker = new HealthChecker(
        makeCheckConfig({
          intervalMs: 1000,
          timeoutMs: 1000,
          failureThreshold: 3,
          successThreshold: 1,
          retry: { enabled: false, maxAttempts: 1, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2, jitterFactor: 0 },
          circuitBreaker: { enabled: true, failureThreshold: 2, failureRateThreshold: 0.5, timeWindowMs: 60000, resetTimeoutMs: 1000, minimumNumberOfCalls: 10 }
        })
      )
      checker.registerInstance(instance)

      mockFetch.mockRejectedValue(new Error('down'))
      await withTimers(checker.checkHealth(instance))
      await withTimers(checker.checkHealth(instance))
      expect(checker.getInstanceHealth('inst-1')?.circuitBreakerState).toBe('open')

      // Advance past resetTimeoutMs -> half-open
      await vi.advanceTimersByTimeAsync(1500)

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => createMockHealthResponse('healthy') })
      await withTimers(checker.checkHealth(instance))

      expect(checker.getInstanceHealth('inst-1')?.circuitBreakerState).toBe('closed')
    })

    it('never blocks requests when the circuit breaker is disabled', async () => {
      const instance = createMockInstance('inst-1')
      checker = new HealthChecker(
        makeCheckConfig({
          intervalMs: 1000,
          timeoutMs: 1000,
          failureThreshold: 3,
          successThreshold: 1,
          retry: { enabled: false, maxAttempts: 1, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2, jitterFactor: 0 },
          circuitBreaker: { enabled: false, failureThreshold: 1, failureRateThreshold: 0.5, timeWindowMs: 60000, resetTimeoutMs: 30000, minimumNumberOfCalls: 10 }
        })
      )
      checker.registerInstance(instance)

      mockFetch.mockRejectedValue(new Error('down'))
      await withTimers(checker.checkHealth(instance))
      await withTimers(checker.checkHealth(instance))

      expect(checker.getInstanceHealth('inst-1')?.circuitBreakerState).toBe('closed')
    })
  })

  describe('checkAll', () => {
    it('checks every registered instance in parallel mode', async () => {
      checker = new HealthChecker(
        makeCheckConfig({ intervalMs: 1000, timeoutMs: 1000, parallel: true, maxConcurrent: 5 })
      )
      for (let i = 1; i <= 5; i++) {
        checker.registerInstance(createMockInstance(`inst-${i}`))
      }

      mockFetch.mockResolvedValue({ ok: true, json: async () => createMockHealthResponse('healthy') })

      const results = await withTimers(checker.checkAll())

      expect(results.size).toBe(5)
      expect(mockFetch).toHaveBeenCalledTimes(5)
    })

    it('checks instances sequentially when parallel is disabled', async () => {
      checker = new HealthChecker(
        makeCheckConfig({ intervalMs: 1000, timeoutMs: 1000, parallel: false })
      )
      checker.registerInstance(createMockInstance('inst-1'))
      checker.registerInstance(createMockInstance('inst-2'))

      mockFetch.mockResolvedValue({ ok: true, json: async () => createMockHealthResponse('healthy') })

      const results = await withTimers(checker.checkAll())

      expect(results.size).toBe(2)
    })

    it('returns an empty map when no instance is registered', async () => {
      const results = await withTimers(checker.checkAll())
      expect(results.size).toBe(0)
    })
  })

  describe('history & events', () => {
    it('records check history and honours the limit argument', async () => {
      const instance = createMockInstance('inst-1')
      checker.registerInstance(instance)

      mockFetch.mockResolvedValue({ ok: true, json: async () => createMockHealthResponse('healthy') })
      for (let i = 0; i < 4; i++) {
        await withTimers(checker.checkHealth(instance))
      }

      expect(checker.getCheckHistory('inst-1').length).toBe(4)
      expect(checker.getCheckHistory('inst-1', 2).length).toBe(2)
    })

    it('emits check.started and check.completed events', async () => {
      const instance = createMockInstance('inst-1')
      checker.registerInstance(instance)

      const handler = vi.fn()
      checker.onEvent(handler)

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => createMockHealthResponse('healthy') })
      await withTimers(checker.checkHealth(instance))

      const types = handler.mock.calls.map((c) => c[0].type)
      expect(types).toContain('health.check.started')
      expect(types).toContain('health.check.completed')
    })

    it('emits check.failed when the check fails', async () => {
      const instance = createMockInstance('inst-1')
      checker = new HealthChecker(
        makeCheckConfig({
          intervalMs: 1000,
          timeoutMs: 1000,
          retry: { enabled: false, maxAttempts: 1, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2, jitterFactor: 0 }
        })
      )
      checker.registerInstance(instance)

      const handler = vi.fn()
      checker.onEvent(handler)

      mockFetch.mockRejectedValueOnce(new Error('down'))
      await withTimers(checker.checkHealth(instance))

      const types = handler.mock.calls.map((c) => c[0].type)
      expect(types).toContain('health.check.failed')
    })

    it('emits status.changed when the status flips', async () => {
      const instance = createMockInstance('inst-1')
      checker = new HealthChecker(
        makeCheckConfig({
          intervalMs: 1000,
          timeoutMs: 1000,
          failureThreshold: 2,
          successThreshold: 1,
          retry: { enabled: false, maxAttempts: 1, initialDelayMs: 100, maxDelayMs: 1000, backoffMultiplier: 2, jitterFactor: 0 }
        })
      )
      checker.registerInstance(instance)

      const handler = vi.fn()
      checker.onEvent(handler)

      mockFetch.mockRejectedValueOnce(new Error('down'))
      await withTimers(checker.checkHealth(instance))

      const statusEvent = handler.mock.calls
        .map((c) => c[0])
        .find((e) => e.type === 'health.status.changed')
      expect(statusEvent).toBeDefined()
      expect(statusEvent.payload.newStatus).toBe('degraded')
    })

    it('does not throw when an event callback throws', async () => {
      const instance = createMockInstance('inst-1')
      checker.registerInstance(instance)
      checker.onEvent(() => {
        throw new Error('listener exploded')
      })

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => createMockHealthResponse('healthy') })

      await expect(withTimers(checker.checkHealth(instance))).resolves.toBeDefined()
    })
  })

  describe('scheduling', () => {
    it('schedules periodic checks for instances registered while running', async () => {
      checker.start()
      checker.registerInstance(createMockInstance('inst-1'))

      mockFetch.mockResolvedValue({ ok: true, json: async () => createMockHealthResponse('healthy') })

      await vi.advanceTimersByTimeAsync(1000)
      expect(mockFetch).toHaveBeenCalled()
    })

    it('stops scheduling after stop() is called', async () => {
      checker.start()
      checker.registerInstance(createMockInstance('inst-1'))
      checker.stop()

      mockFetch.mockClear()
      await vi.advanceTimersByTimeAsync(5000)

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('updateConfig changes the effective check configuration', () => {
      checker.updateConfig(makeCheckConfig({ intervalMs: 42 }))
      // Behavioural proof: the new interval is used for scheduling.
      checker.start()
      checker.registerInstance(createMockInstance('inst-1'))

      mockFetch.mockResolvedValue({ ok: true, json: async () => createMockHealthResponse('healthy') })
      vi.advanceTimersByTime(41)
      expect(mockFetch).not.toHaveBeenCalled()
      vi.advanceTimersByTime(2)
      expect(mockFetch).toHaveBeenCalled()
    })
  })
})


describe('PassiveHealthReporter', () => {
  let reporter: PassiveHealthReporter

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(BASE_TIME)
    reporter = new PassiveHealthReporter()
  })

  afterEach(() => {
    reporter.stop()
    vi.useRealTimers()
  })

  describe('heartbeat intake', () => {
    it('registers an instance on the first heartbeat', () => {
      const result = reporter.receiveHeartbeat(makePayload())

      expect(result.success).toBe(true)
      expect(result.status).toBe('healthy')
      expect(result.message).toBe('Instance registered')
      expect(reporter.isRegistered('inst-1')).toBe(true)
    })

    it('reports "Heartbeat received" for subsequent beats', () => {
      reporter.receiveHeartbeat(makePayload())
      const result = reporter.receiveHeartbeat(makePayload())

      expect(result.message).toBe('Heartbeat received')
    })

    it('tracks instance health status from heartbeats', () => {
      reporter.receiveHeartbeat(makePayload({ status: 'healthy' }))
      expect(reporter.getInstanceHealth('inst-1')?.status).toBe('healthy')

      reporter.receiveHeartbeat(makePayload({ status: 'degraded' }))
      expect(reporter.getInstanceHealth('inst-1')?.status).toBe('degraded')
    })

    it('increments the heartbeat counter and total checks', () => {
      reporter.receiveHeartbeat(makePayload())
      reporter.receiveHeartbeat(makePayload())

      const record = reporter.getHeartbeatRecord('inst-1')!
      expect(record.totalHeartbeats).toBe(2)
      expect(record.consecutiveMissed).toBe(0)
      expect(reporter.getInstanceHealth('inst-1')?.totalChecks).toBe(1)
    })

    it('merges metadata across heartbeats', () => {
      reporter.receiveHeartbeat(makePayload({ metadata: { a: 1 } }))
      reporter.receiveHeartbeat(makePayload({ metadata: { b: 2 } }))

      expect(reporter.getHeartbeatRecord('inst-1')?.metadata).toEqual({ a: 1, b: 2 })
    })

    it('exposes all heartbeats and all instance health', () => {
      reporter.receiveHeartbeat(makePayload({ instanceId: 'inst-1' }))
      reporter.receiveHeartbeat(makePayload({ instanceId: 'inst-2' }))

      expect(reporter.getAllHeartbeats().length).toBe(2)
      expect(reporter.getAllInstanceHealth().size).toBe(2)
    })

    it('returns undefined for an unknown instance', () => {
      expect(reporter.getInstanceHealth('nope')).toBeUndefined()
      expect(reporter.getHeartbeatRecord('nope')).toBeUndefined()
      expect(reporter.isRegistered('nope')).toBe(false)
    })

    it('unregisters an instance and drops its metrics', () => {
      reporter.receiveHeartbeat(
        makePayload({
          details: { metrics: [{ name: 'rps', value: 10, unit: 'req/s', labels: {} }] }
        })
      )
      expect(reporter.getMetrics('inst-1').length).toBe(1)

      reporter.unregisterInstance('inst-1')

      expect(reporter.isRegistered('inst-1')).toBe(false)
      expect(reporter.getInstanceHealth('inst-1')).toBeUndefined()
      expect(reporter.getMetrics('inst-1')).toEqual([])
    })
  })

  describe('stale detection', () => {
    it('does not report a fresh instance as stale', () => {
      reporter.receiveHeartbeat(makePayload())

      expect(reporter.getStaleInstances().length).toBe(0)
    })

    it('reports an instance as stale once the threshold passes', () => {
      reporter = new PassiveHealthReporter({ intervalMs: 100, staleThresholdMs: 200 })
      reporter.receiveHeartbeat(makePayload())

      vi.setSystemTime(BASE_TIME.getTime() + 250)

      const stale = reporter.getStaleInstances()
      expect(stale.length).toBe(1)
      expect(stale[0].instanceId).toBe('inst-1')
    })

    it('clears the stale flag when a fresh heartbeat arrives', () => {
      reporter = new PassiveHealthReporter({ intervalMs: 100, staleThresholdMs: 200 })
      reporter.receiveHeartbeat(makePayload())

      vi.setSystemTime(BASE_TIME.getTime() + 250)
      expect(reporter.getStaleInstances().length).toBe(1)

      reporter.receiveHeartbeat(
        makePayload({ timestamp: new Date(BASE_TIME.getTime() + 250).toISOString() })
      )
      expect(reporter.getStaleInstances().length).toBe(0)
    })
  })

  describe('cleanup timer', () => {
    it('marks the instance unhealthy after maxMissedHeartbeats cleanups', async () => {
      reporter = new PassiveHealthReporter({
        intervalMs: 100,
        staleThresholdMs: 200,
        maxMissedHeartbeats: 3,
        cleanupIntervalMs: 100
      })
      reporter.start()
      reporter.receiveHeartbeat(makePayload())

      // Move past the stale threshold so every cleanup tick counts a miss.
      vi.setSystemTime(BASE_TIME.getTime() + 300)
      await vi.advanceTimersByTimeAsync(300)

      expect(reporter.getInstanceHealth('inst-1')?.status).toBe('unhealthy')
      expect(reporter.getHeartbeatRecord('inst-1')?.consecutiveMissed).toBeGreaterThanOrEqual(3)
    })

    it('removes instances that stay stale beyond 3x the threshold', async () => {
      reporter = new PassiveHealthReporter({
        intervalMs: 100,
        staleThresholdMs: 200,
        maxMissedHeartbeats: 3,
        cleanupIntervalMs: 100
      })
      reporter.start()
      reporter.receiveHeartbeat(makePayload())

      vi.setSystemTime(BASE_TIME.getTime() + 700)
      await vi.advanceTimersByTimeAsync(200)

      expect(reporter.isRegistered('inst-1')).toBe(false)
    })

    it('stops the cleanup timer on stop()', async () => {
      reporter = new PassiveHealthReporter({
        intervalMs: 100,
        staleThresholdMs: 200,
        cleanupIntervalMs: 100
      })
      reporter.start()
      reporter.receiveHeartbeat(makePayload())
      reporter.stop()

      vi.setSystemTime(BASE_TIME.getTime() + 1000)
      await vi.advanceTimersByTimeAsync(1000)

      // The cleanup never ran, so consecutiveMissed is untouched.
      expect(reporter.getHeartbeatRecord('inst-1')?.consecutiveMissed).toBe(0)
    })

    it('does not schedule a cleanup timer when autoCleanup is disabled', async () => {
      reporter = new PassiveHealthReporter({
        intervalMs: 100,
        staleThresholdMs: 200,
        autoCleanup: false,
        cleanupIntervalMs: 100
      })
      reporter.start()
      reporter.receiveHeartbeat(makePayload())

      vi.setSystemTime(BASE_TIME.getTime() + 1000)
      await vi.advanceTimersByTimeAsync(1000)

      expect(reporter.getHeartbeatRecord('inst-1')?.consecutiveMissed).toBe(0)
    })
  })

  describe('metrics', () => {
    it('stores custom metrics from the heartbeat payload', () => {
      reporter.receiveHeartbeat(
        makePayload({
          details: {
            metrics: [
              { name: 'response_time', value: 150, unit: 'ms', labels: {} },
              { name: 'error_rate', value: 0.02, unit: '%', labels: {} }
            ]
          }
        })
      )

      const metrics = reporter.getMetrics('inst-1')
      expect(metrics.length).toBe(1)
      expect(metrics[0].custom.length).toBe(2)
    })

    it('projects well-known metric names into the structured buckets', () => {
      reporter.receiveHeartbeat(
        makePayload({
          details: {
            metrics: [
              { name: 'response_time', value: 150, unit: 'ms', labels: {} },
              { name: 'error_rate', value: 0.25, unit: '%', labels: {} },
              { name: 'rps', value: 42, unit: 'req/s', labels: {} }
            ]
          }
        })
      )

      const m = reporter.getMetrics('inst-1')[0]
      expect(m.responseTime.avg).toBe(150)
      expect(m.errors.rate).toBe(0.25)
      expect(m.throughput.rps).toBe(42)
    })

    it('honours the limit argument on getMetrics', () => {
      reporter.receiveHeartbeat(
        makePayload({ details: { metrics: [{ name: 'rps', value: 1, unit: 'x', labels: {} }] } })
      )
      reporter.receiveHeartbeat(
        makePayload({ details: { metrics: [{ name: 'rps', value: 2, unit: 'x', labels: {} }] } })
      )

      expect(reporter.getMetrics('inst-1').length).toBe(2)
      expect(reporter.getMetrics('inst-1', 1).length).toBe(1)
    })

    it('caps stored metric entries at 100', () => {
      for (let i = 0; i < 105; i++) {
        reporter.receiveHeartbeat(
          makePayload({ details: { metrics: [{ name: 'rps', value: i, unit: 'x', labels: {} }] } })
        )
      }

      expect(reporter.getMetrics('inst-1').length).toBe(100)
    })
  })

  describe('events', () => {
    it('emits status.changed when a new instance registers', () => {
      const handler = vi.fn()
      reporter.onEvent(handler)

      reporter.receiveHeartbeat(makePayload({ status: 'healthy' }))

      const evt = handler.mock.calls[0][0]
      expect(evt.type).toBe('health.status.changed')
      expect(evt.payload.previousStatus).toBe('unknown')
      expect(evt.payload.newStatus).toBe('healthy')
      expect(evt.instanceId).toBe('inst-1')
    })

    it('emits status.changed when the status flips on a later heartbeat', () => {
      reporter.receiveHeartbeat(makePayload({ status: 'healthy' }))

      const handler = vi.fn()
      reporter.onEvent(handler)
      reporter.receiveHeartbeat(makePayload({ status: 'unhealthy' }))

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0].payload.previousStatus).toBe('healthy')
      expect(handler.mock.calls[0][0].payload.newStatus).toBe('unhealthy')
    })

    it('does not emit when the status is unchanged', () => {
      reporter.receiveHeartbeat(makePayload({ status: 'healthy' }))

      const handler = vi.fn()
      reporter.onEvent(handler)
      reporter.receiveHeartbeat(makePayload({ status: 'healthy' }))

      expect(handler).not.toHaveBeenCalled()
    })

    it('does not throw when an event callback throws', () => {
      reporter.onEvent(() => {
        throw new Error('listener exploded')
      })

      expect(() => reporter.receiveHeartbeat(makePayload())).not.toThrow()
    })
  })

  describe('config', () => {
    it('updateConfig changes the stale threshold', () => {
      reporter.receiveHeartbeat(makePayload())

      reporter.updateConfig({ staleThresholdMs: 10 })
      vi.setSystemTime(BASE_TIME.getTime() + 50)

      expect(reporter.getStaleInstances().length).toBe(1)
    })
  })
})


describe('FailureDetector', () => {
  let detector: FailureDetector

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(BASE_TIME)
    detector = new FailureDetector({
      timeoutThresholdMs: 5000,
      errorRateThreshold: 0.1,
      responseTimeThresholdMs: 2000,
      minSamples: 5
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('timeout detection', () => {
    it('detects timeouts once minSamples slow results are seen', () => {
      const results = makeCheckResults(5, { durationMs: 6000, failedRatio: 1, errorType: 'timeout' })

      const failures = detector.analyze('inst-1', makeInstanceHealth(), results)

      const timeout = failures.find((f) => f.type === 'timeout')
      expect(timeout).toBeDefined()
      expect(timeout?.severity).toBe('critical')
      expect(timeout?.message).toContain('timeouts')
    })

    it('does not detect timeouts below minSamples', () => {
      const results = makeCheckResults(3, { durationMs: 6000, errorType: 'timeout' })

      const failures = detector.analyze('inst-1', makeInstanceHealth(), results)

      expect(failures.some((f) => f.type === 'timeout')).toBe(false)
    })

    it('does not detect timeouts when detectTimeouts is disabled', () => {
      detector.updateConfig({ detectTimeouts: false })
      const results = makeCheckResults(5, { durationMs: 6000, errorType: 'timeout' })

      const failures = detector.analyze('inst-1', makeInstanceHealth(), results)

      expect(failures.some((f) => f.type === 'timeout')).toBe(false)
    })
  })

  describe('error rate detection', () => {
    it('detects a high error rate', () => {
      const health = makeInstanceHealth({ errorRate: 0.25, consecutiveFailures: 5 })
      const results = makeCheckResults(10, { failedRatio: 0.4 })

      const failures = detector.analyze('inst-1', health, results)

      const err = failures.find((f) => f.type === 'error_rate_high')
      expect(err).toBeDefined()
      expect(err?.severity).toBe('high')
      expect(err?.message).toContain('Error rate too high')
    })

    it('computes the error rate from the recent results, not from instanceHealth', () => {
      // instanceHealth.errorRate is 0.9 but 8/10 recent results succeeded.
      const health = makeInstanceHealth({ errorRate: 0.9, consecutiveFailures: 0 })
      const results = makeCheckResults(10, { failedRatio: 0.2 })

      const failures = detector.analyze('inst-1', health, results)

      const err = failures.find((f) => f.type === 'error_rate_high')
      expect(err).toBeDefined()
      expect(err?.message).toContain('20.0%')
    })

    it('escalates to critical above a 50% error rate', () => {
      const health = makeInstanceHealth({ errorRate: 0.8, consecutiveFailures: 8 })
      const results = makeCheckResults(10, { failedRatio: 0.8 })

      const failures = detector.analyze('inst-1', health, results)

      expect(failures.find((f) => f.type === 'error_rate_high')?.severity).toBe('critical')
    })

    it('does not detect a low error rate', () => {
      const health = makeInstanceHealth({ errorRate: 0.01 })
      const failures = detector.analyze('inst-1', health, makeCheckResults(10))

      expect(failures.some((f) => f.type === 'error_rate_high')).toBe(false)
    })

    it('detects an error rate exactly at the threshold (inclusive boundary)', () => {
      // 1 failure out of 10 results == exactly 10% == errorRateThreshold (0.1).
      // The comparison must be inclusive (>=), otherwise the threshold is
      // effectively 10.000...1%.
      const health = makeInstanceHealth({ errorRate: 0.1 })
      const results = makeCheckResults(10, { failedRatio: 0.1 })

      const failures = detector.analyze('inst-1', health, results)

      expect(failures.some((f) => f.type === 'error_rate_high')).toBe(true)
    })

    it('does not detect an error rate just below the threshold', () => {
      // 0 failures out of 10 == 0% error rate, below the 10% threshold.
      const health = makeInstanceHealth({ errorRate: 0 })
      const failures = detector.analyze('inst-1', health, makeCheckResults(10))

      expect(failures.some((f) => f.type === 'error_rate_high')).toBe(false)
    })
  })

  describe('response time detection', () => {
    it('detects a high average response time', () => {
      const health = makeInstanceHealth({ avgResponseTimeMs: 2500 })
      const results = makeCheckResults(5, { durationMs: 2500 })

      const failures = detector.analyze('inst-1', health, results)

      const slow = failures.find((f) => f.type === 'response_time_high')
      expect(slow).toBeDefined()
      expect(slow?.message).toContain('Response time degraded')
    })

    it('escalates to critical above 3x the threshold', () => {
      const health = makeInstanceHealth({ avgResponseTimeMs: 7000 })
      const failures = detector.analyze('inst-1', health, makeCheckResults(5, { durationMs: 7000 }))

      expect(failures.find((f) => f.type === 'response_time_high')?.severity).toBe('critical')
    })

    it('does not detect slow responses when the detector is disabled', () => {
      detector.updateConfig({ detectResponseTime: false })
      const health = makeInstanceHealth({ avgResponseTimeMs: 9000 })

      const failures = detector.analyze('inst-1', health, makeCheckResults(5, { durationMs: 9000 }))

      expect(failures.some((f) => f.type === 'response_time_high')).toBe(false)
    })
  })

  describe('circuit breaker detection', () => {
    it('detects an open circuit breaker', () => {
      const health = makeInstanceHealth({ circuitBreakerState: 'open', status: 'unhealthy' })

      const failures = detector.analyze('inst-1', health, [])

      const cb = failures.find((f) => f.type === 'circuit_breaker_open')
      expect(cb).toBeDefined()
      expect(cb?.severity).toBe('critical')
    })

    it('does not detect a closed circuit breaker', () => {
      const failures = detector.analyze('inst-1', makeInstanceHealth({ circuitBreakerState: 'closed' }), [])

      expect(failures.some((f) => f.type === 'circuit_breaker_open')).toBe(false)
    })
  })

  describe('connection & health-check failure detection', () => {
    it('detects repeated connection failures', () => {
      const health = makeInstanceHealth({ consecutiveFailures: 4, errorRate: 0.4 })
      const results = makeCheckResults(5, { failedRatio: 1, errorType: 'connection' })

      const failures = detector.analyze('inst-1', health, results)

      expect(failures.some((f) => f.type === 'connection_refused')).toBe(true)
    })

    it('detects repeated health-check failures', () => {
      const health = makeInstanceHealth({ status: 'unhealthy', consecutiveFailures: 3 })

      const failures = detector.analyze('inst-1', health, [])

      const hc = failures.find((f) => f.type === 'health_check_fail')
      expect(hc).toBeDefined()
      expect(hc?.severity).toBe('high')
    })

    it('escalates health-check failures to critical at 5 consecutive failures', () => {
      const health = makeInstanceHealth({ status: 'unhealthy', consecutiveFailures: 5 })

      const failures = detector.analyze('inst-1', health, [])

      expect(failures.find((f) => f.type === 'health_check_fail')?.severity).toBe('critical')
    })
  })

  describe('failure bookkeeping', () => {
    it('increments occurrences instead of duplicating the failure', () => {
      const health = makeInstanceHealth({ errorRate: 0.5, consecutiveFailures: 5 })
      const results = makeCheckResults(10, { failedRatio: 0.5 })

      detector.analyze('inst-1', health, results)
      detector.analyze('inst-1', health, results)

      const errFailures = detector
        .getFailures('inst-1')
        .filter((f) => f.type === 'error_rate_high')
      expect(errFailures.length).toBe(1)
      expect(errFailures[0].occurrences).toBe(2)
    })

    it('getAllFailures only lists instances with active failures', () => {
      const health = makeInstanceHealth({ errorRate: 0.5, consecutiveFailures: 5 })
      detector.analyze('inst-1', health, makeCheckResults(10, { failedRatio: 0.5 }))

      expect(detector.getAllFailures().size).toBe(1)
      expect(detector.getAllFailures().get('inst-1')!.length).toBeGreaterThan(0)
    })

    it('resolves a failure and hides it from the active list', () => {
      const health = makeInstanceHealth({ errorRate: 0.5, consecutiveFailures: 5 })
      const failures = detector.analyze('inst-1', health, makeCheckResults(10, { failedRatio: 0.5 }))
      const target = failures.find((f) => f.type === 'error_rate_high')!

      expect(detector.resolveFailure('inst-1', target.id)).toBe(true)
      expect(detector.getFailures('inst-1', false).some((f) => f.id === target.id)).toBe(false)
      expect(detector.getFailures('inst-1', true).some((f) => f.id === target.id)).toBe(true)
    })

    it('returns false when resolving an unknown failure', () => {
      expect(detector.resolveFailure('inst-1', 'nope')).toBe(false)
    })

    it('clear() wipes failures and alerts', () => {
      const health = makeInstanceHealth({ errorRate: 0.5, consecutiveFailures: 5 })
      detector.analyze('inst-1', health, makeCheckResults(10, { failedRatio: 0.5 }))
      expect(detector.getActiveAlerts().length).toBeGreaterThan(0)

      detector.clear()

      expect(detector.getActiveAlerts().length).toBe(0)
      expect(detector.getFailures('inst-1').length).toBe(0)
    })
  })

  describe('alerts', () => {
    it('generates an active alert per failure type', () => {
      const health = makeInstanceHealth({
        errorRate: 0.5,
        consecutiveFailures: 5,
        circuitBreakerState: 'open',
        status: 'unhealthy'
      })
      detector.analyze('inst-1', health, makeCheckResults(10, { failedRatio: 0.5 }))

      const alerts = detector.getActiveAlerts()
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts.every((a) => a.status === 'active')).toBe(true)
      expect(alerts.some((a) => a.labels.failure_type === 'error_rate_high')).toBe(true)
    })

    it('creates one alert per detection round for the same failure type', () => {
      // OBSERVED BEHAVIOUR (see T290 report "未证实的怀疑点"):
      // generateAlert() keys the alert by the *transient* FailureRecord id,
      // while addOrUpdateFailure() merges into the persisted record. So the
      // same failure type detected twice yields two active alerts.
      const health = makeInstanceHealth({ errorRate: 0.5, consecutiveFailures: 5 })
      const results = makeCheckResults(10, { failedRatio: 0.5 })

      detector.analyze('inst-1', health, results)
      const first = detector.getActiveAlerts().length
      expect(first).toBeGreaterThan(0)

      detector.analyze('inst-1', health, results)
      expect(detector.getActiveAlerts().length).toBeGreaterThan(first)
    })

    it('acknowledges an alert', () => {
      const health = makeInstanceHealth({ errorRate: 0.5, consecutiveFailures: 5 })
      detector.analyze('inst-1', health, makeCheckResults(10, { failedRatio: 0.5 }))
      const alert = detector.getActiveAlerts()[0]

      expect(detector.acknowledgeAlert(alert.id, 'operator')).toBe(true)
      expect(detector.getActiveAlerts().some((a) => a.id === alert.id)).toBe(false)
    })

    it('returns false when acknowledging an unknown alert', () => {
      expect(detector.acknowledgeAlert('nope', 'operator')).toBe(false)
    })

    it('resolves an alert', () => {
      const health = makeInstanceHealth({ errorRate: 0.5, consecutiveFailures: 5 })
      detector.analyze('inst-1', health, makeCheckResults(10, { failedRatio: 0.5 }))
      const alert = detector.getActiveAlerts()[0]

      expect(detector.resolveAlert(alert.id)).toBe(true)
      expect(detector.getActiveAlerts().some((a) => a.id === alert.id)).toBe(false)
    })

    it('returns false when resolving an unknown alert', () => {
      expect(detector.resolveAlert('nope')).toBe(false)
    })

    it('does not generate alerts when alerting is disabled', () => {
      detector.updateConfig({ enableAlerting: false })
      const health = makeInstanceHealth({ errorRate: 0.5, consecutiveFailures: 5 })
      detector.analyze('inst-1', health, makeCheckResults(10, { failedRatio: 0.5 }))

      expect(detector.getActiveAlerts().length).toBe(0)
    })

    it('resolves the associated alert when the failure is resolved', () => {
      const health = makeInstanceHealth({ errorRate: 0.5, consecutiveFailures: 5 })
      const failures = detector.analyze('inst-1', health, makeCheckResults(10, { failedRatio: 0.5 }))
      const target = failures.find((f) => f.type === 'error_rate_high')!

      detector.resolveFailure('inst-1', target.id)

      expect(detector.getActiveAlerts().some((a) => a.name.includes('error_rate_high'))).toBe(false)
    })
  })

  describe('statistics', () => {
    it('counts failures by type and severity', () => {
      const health = makeInstanceHealth({
        errorRate: 0.5,
        consecutiveFailures: 5,
        circuitBreakerState: 'open',
        status: 'unhealthy'
      })
      detector.analyze('inst-1', health, makeCheckResults(10, { failedRatio: 0.5 }))

      const stats = detector.getStatistics()
      expect(stats.totalFailures).toBeGreaterThan(0)
      expect(stats.activeFailures).toBe(stats.totalFailures)
      expect(stats.resolvedFailures).toBe(0)
      expect(stats.failuresByType.error_rate_high).toBeGreaterThan(0)
      expect(stats.failuresBySeverity.critical).toBeGreaterThan(0)
    })

    it('counts resolved failures separately', () => {
      const health = makeInstanceHealth({ errorRate: 0.5, consecutiveFailures: 5 })
      const failures = detector.analyze('inst-1', health, makeCheckResults(10, { failedRatio: 0.5 }))
      for (const f of failures) detector.resolveFailure('inst-1', f.id)

      const stats = detector.getStatistics()
      expect(stats.activeFailures).toBe(0)
      expect(stats.resolvedFailures).toBe(stats.totalFailures)
    })
  })

  describe('custom rules', () => {
    it('runs a custom rule added via addRule', () => {
      const rule: FailureDetectionRule = {
        id: 'custom-rule',
        name: 'Custom Rule',
        failureType: 'unknown',
        condition: () => true,
        severity: () => 'low',
        messageTemplate: 'custom fired',
        enabled: true
      }
      detector.addRule(rule)

      const failures = detector.analyze('inst-1', makeInstanceHealth(), [])

      expect(failures.some((f) => f.type === 'unknown' && f.message === 'custom fired')).toBe(true)
    })

    it('skips a disabled custom rule', () => {
      const rule: FailureDetectionRule = {
        id: 'custom-rule',
        name: 'Custom Rule',
        failureType: 'unknown',
        condition: () => true,
        severity: () => 'low',
        messageTemplate: 'custom fired',
        enabled: false
      }
      detector.addRule(rule)

      const failures = detector.analyze('inst-1', makeInstanceHealth(), [])

      expect(failures.some((f) => f.type === 'unknown')).toBe(false)
    })

    it('survives a rule that throws', () => {
      const rule: FailureDetectionRule = {
        id: 'boom',
        name: 'Boom',
        failureType: 'unknown',
        condition: () => {
          throw new Error('rule exploded')
        },
        severity: () => 'low',
        messageTemplate: 'x',
        enabled: true
      }
      detector.addRule(rule)

      expect(() => detector.analyze('inst-1', makeInstanceHealth(), [])).not.toThrow()
    })

    it('honours custom rules supplied via the constructor', () => {
      const custom = new FailureDetector({
        customRules: [
          {
            id: 'ctor-rule',
            name: 'Ctor Rule',
            failureType: 'unknown',
            condition: () => true,
            severity: () => 'medium',
            messageTemplate: 'ctor fired',
            enabled: true
          }
        ]
      })

      const failures = custom.analyze('inst-1', makeInstanceHealth(), [])

      expect(failures.some((f) => f.message === 'ctor fired')).toBe(true)
    })
  })

  describe('events', () => {
    it('emits alert.triggered for a new failure', () => {
      const handler = vi.fn()
      detector.onEvent(handler)

      detector.analyze(
        'inst-1',
        makeInstanceHealth({ errorRate: 0.5, consecutiveFailures: 5 }),
        makeCheckResults(10, { failedRatio: 0.5 })
      )

      expect(handler.mock.calls.map((c) => c[0].type)).toContain('health.alert.triggered')
    })

    it('does not throw when an event callback throws', () => {
      detector.onEvent(() => {
        throw new Error('listener exploded')
      })

      expect(() =>
        detector.analyze('inst-1', makeInstanceHealth({ errorRate: 0.5, consecutiveFailures: 5 }), [])
      ).not.toThrow()
    })
  })
})


describe('RecoveryManager', () => {
  let manager: RecoveryManager

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(BASE_TIME)
    manager = new RecoveryManager({
      enableAutoRecovery: true,
      maxConcurrentRecoveries: 3
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('strategy matching', () => {
    it('recovers a circuit_breaker_open failure with the circuit-breaker strategy', async () => {
      const attempt = await manager.recover('inst-1', makeFailure(), makeInstanceHealth())

      expect(attempt.success).toBe(true)
      expect(attempt.strategyId).toBe('circuit-breaker-recovery')
      expect(attempt.attemptNumber).toBe(1)
      expect(attempt.actions.map((a) => a.type)).toEqual([
        'reset_circuit_breaker',
        'run_diagnostic'
      ])
    })

    it('routes a timeout failure to the timeout strategy', async () => {
      const attempt = await manager.recover('inst-1', makeFailure({ type: 'timeout' }), makeInstanceHealth())

      expect(attempt.strategyId).toBe('timeout-recovery')
      expect(attempt.actions.map((a) => a.type)).toEqual(['clear_cache', 'run_diagnostic'])
    })

    it('routes a connection failure to the connection strategy', async () => {
      const attempt = await manager.recover(
        'inst-1',
        makeFailure({ type: 'connection_refused' }),
        makeInstanceHealth()
      )

      expect(attempt.strategyId).toBe('connection-recovery')
      expect(attempt.actions[0].type).toBe('restart_service')
    })

    it('routes an error-rate failure to the error-rate strategy', async () => {
      const attempt = await manager.recover(
        'inst-1',
        makeFailure({ type: 'error_rate_high' }),
        makeInstanceHealth()
      )

      expect(attempt.strategyId).toBe('error-rate-recovery')
      expect(attempt.actions.map((a) => a.type)).toEqual(['scale_up', 'clear_cache', 'run_diagnostic'])
    })

    it('routes a memory failure to the critical strategy', async () => {
      const attempt = await manager.recover(
        'inst-1',
        makeFailure({ type: 'memory_exhausted' }),
        makeInstanceHealth()
      )

      expect(attempt.strategyId).toBe('critical-failure-recovery')
      expect(attempt.actions.map((a) => a.type)).toEqual(['rollback_deployment', 'notify_team'])
    })

    it('throws when no strategy matches the failure type', async () => {
      await expect(
        manager.recover('inst-1', makeFailure({ type: 'unknown' }), makeInstanceHealth())
      ).rejects.toThrow(/No recovery strategy found/)
    })

    it('uses a custom strategy registered via addStrategy', async () => {
      const strategy: RecoveryStrategy = {
        id: 'custom-strategy',
        name: 'Custom',
        failureTypes: ['unknown'],
        actions: [{ type: 'custom', params: {}, timeoutMs: 1000, critical: false }],
        maxAttempts: 1,
        delayMs: 0,
        enabled: true
      }
      manager.addStrategy(strategy)

      const attempt = await manager.recover('inst-1', makeFailure({ type: 'unknown' }), makeInstanceHealth())

      expect(attempt.strategyId).toBe('custom-strategy')
      expect(attempt.actions[0].type).toBe('custom')
    })

    it('honours custom strategies supplied via the constructor', async () => {
      const custom = new RecoveryManager({
        customStrategies: [
          {
            id: 'ctor-strategy',
            name: 'Ctor',
            failureTypes: ['unknown'],
            actions: [{ type: 'notify_team', params: {}, timeoutMs: 1000, critical: false }],
            maxAttempts: 1,
            delayMs: 0,
            enabled: true
          }
        ]
      })

      const attempt = await custom.recover('inst-1', makeFailure({ type: 'unknown' }), makeInstanceHealth())

      expect(attempt.strategyId).toBe('ctor-strategy')
    })

    it('prefers the built-in strategy when a custom one covers the same failure type', async () => {
      // OBSERVED BEHAVIOUR (see T290 report "未证实的怀疑点"):
      // findStrategy() returns the FIRST enabled strategy whose failureTypes
      // match, and built-ins are registered before custom strategies, so a
      // custom strategy for an already-covered type is dead code.
      manager.addStrategy({
        id: 'shadow-strategy',
        name: 'Shadow',
        failureTypes: ['circuit_breaker_open'],
        actions: [{ type: 'custom', params: {}, timeoutMs: 1000, critical: false }],
        maxAttempts: 1,
        delayMs: 0,
        enabled: true
      })

      const attempt = await manager.recover('inst-1', makeFailure(), makeInstanceHealth())

      expect(attempt.strategyId).toBe('circuit-breaker-recovery')
    })
  })

  describe('attempt bookkeeping', () => {
    it('stores the attempt for the instance', async () => {
      await manager.recover('inst-1', makeFailure(), makeInstanceHealth())

      const attempts = manager.getAttempts('inst-1')
      expect(attempts.length).toBe(1)
      expect(attempts[0].success).toBe(true)
      expect(attempts[0].endedAt).toBeDefined()
    })

    it('increments the attempt number for the same failure id', async () => {
      await manager.recover('inst-1', makeFailure(), makeInstanceHealth())
      await manager.recover('inst-1', makeFailure(), makeInstanceHealth())

      const attempts = manager.getAttempts('inst-1')
      expect(attempts.length).toBe(2)
      expect(attempts[1].attemptNumber).toBe(2)
    })

    it('starts a fresh attempt counter for a different failure id', async () => {
      await manager.recover('inst-1', makeFailure(), makeInstanceHealth())
      await manager.recover('inst-1', makeFailure({ id: 'fail-2' }), makeInstanceHealth())

      const attempts = manager.getAttempts('inst-1')
      expect(attempts[1].attemptNumber).toBe(1)
    })

    it('exposes all attempts via getAllAttempts', async () => {
      await manager.recover('inst-1', makeFailure(), makeInstanceHealth())
      await manager.recover('inst-2', makeFailure(), makeInstanceHealth({ instanceId: 'inst-2' }))

      expect(manager.getAllAttempts().size).toBe(2)
    })

    it('returns an empty list for an unknown instance', () => {
      expect(manager.getAttempts('nope')).toEqual([])
    })
  })

  describe('metrics', () => {
    it('counts successful attempts', async () => {
      await manager.recover('inst-1', makeFailure(), makeInstanceHealth())

      const metrics = manager.getMetrics()
      expect(metrics.totalAttempts).toBe(1)
      expect(metrics.successfulAttempts).toBe(1)
      expect(metrics.failedAttempts).toBe(0)
      expect(metrics.recoveryByStrategy['circuit-breaker-recovery'].total).toBe(1)
      expect(metrics.recoveryByStrategy['circuit-breaker-recovery'].successful).toBe(1)
    })

    it('clear() resets the metrics', async () => {
      await manager.recover('inst-1', makeFailure(), makeInstanceHealth())

      manager.clear()

      const metrics = manager.getMetrics()
      expect(metrics.totalAttempts).toBe(0)
      expect(metrics.successfulAttempts).toBe(0)
      expect(manager.getAttempts('inst-1')).toEqual([])
    })
  })

  describe('guards', () => {
    it('rejects a concurrent recovery for the same instance', async () => {
      // Hold the first recovery open by making the notification channel hang.
      const first = manager.recover('inst-1', makeFailure(), makeInstanceHealth())

      await expect(manager.recover('inst-1', makeFailure(), makeInstanceHealth())).rejects.toThrow(
        /Recovery already in progress/
      )

      await first
    })

    it('rejects when the concurrency limit is reached', async () => {
      const limited = new RecoveryManager({ maxConcurrentRecoveries: 1 })

      const first = limited.recover('inst-1', makeFailure(), makeInstanceHealth())
      await expect(
        limited.recover('inst-2', makeFailure({ instanceId: 'inst-2' }), makeInstanceHealth())
      ).rejects.toThrow(/Maximum concurrent recoveries reached/)

      await first
    })
  })

  describe('notifications', () => {
    it('logs a notification when channels are configured', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
      const withChannels = new RecoveryManager({
        notificationChannels: [
          {
            id: 'ch-1',
            type: 'slack',
            name: 'slack',
            enabled: true,
            config: {},
            severityFilter: ['critical']
          }
        ]
      })

      await withChannels.recover('inst-1', makeFailure(), makeInstanceHealth())

      expect(logSpy).toHaveBeenCalled()
      expect(String(logSpy.mock.calls[0][0])).toContain('[Recovery Notification]')
      logSpy.mockRestore()
    })

    it('does not log when no channels are configured', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

      await manager.recover('inst-1', makeFailure(), makeInstanceHealth())

      expect(logSpy).not.toHaveBeenCalled()
      logSpy.mockRestore()
    })
  })

  describe('events', () => {
    it('emits recovery.started and recovery.completed', async () => {
      const handler = vi.fn()
      manager.onEvent(handler)

      await manager.recover('inst-1', makeFailure(), makeInstanceHealth())

      const types = handler.mock.calls.map((c) => c[0].type)
      expect(types).toContain('health.recovery.started')
      expect(types).toContain('health.recovery.completed')
    })

    it('does not throw when an event callback throws', async () => {
      manager.onEvent(() => {
        throw new Error('listener exploded')
      })

      await expect(manager.recover('inst-1', makeFailure(), makeInstanceHealth())).resolves.toBeDefined()
    })
  })

  describe('config', () => {
    it('updateConfig applies the new limits', async () => {
      const limited = new RecoveryManager({ maxConcurrentRecoveries: 1 })
      limited.updateConfig({ maxConcurrentRecoveries: 5 })

      // With the limit raised, a second concurrent recovery is accepted.
      const first = limited.recover('inst-1', makeFailure(), makeInstanceHealth())
      const second = limited.recover('inst-2', makeFailure({ instanceId: 'inst-2' }), makeInstanceHealth())

      await expect(second).resolves.toBeDefined()
      await first
    })
  })
})


describe('HealthDashboard', () => {
  let dashboard: HealthDashboard

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(BASE_TIME)
    dashboard = new HealthDashboard()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('service health', () => {
    it('stores and retrieves a service health entry', () => {
      dashboard.updateServiceHealth('test-service', makeServiceHealth())

      const retrieved = dashboard.getServiceHealth('test-service') as ServiceHealth
      expect(retrieved.serviceName).toBe('test-service')
      expect(retrieved.healthScore).toBe(100)
    })

    it('returns an array of all services when no name is given', () => {
      dashboard.updateServiceHealth('svc-a', makeServiceHealth({ serviceName: 'svc-a' }))
      dashboard.updateServiceHealth('svc-b', makeServiceHealth({ serviceName: 'svc-b' }))

      const all = dashboard.getServiceHealth() as ServiceHealth[]
      expect(all.length).toBe(2)
    })

    it('returns an empty placeholder for an unknown service', () => {
      const result = dashboard.getServiceHealth('nope') as ServiceHealth

      expect(result.serviceName).toBe('nope')
      expect(result.status).toBe('unknown')
      expect(result.totalInstances).toBe(0)
      expect(result.healthScore).toBe(0)
    })

    it('overwrites the entry when the same service is updated again', () => {
      dashboard.updateServiceHealth('svc', makeServiceHealth({ healthScore: 100 }))
      dashboard.updateServiceHealth('svc', makeServiceHealth({ healthScore: 42 }))

      const result = dashboard.getServiceHealth('svc') as ServiceHealth
      expect(result.healthScore).toBe(42)
    })
  })

  describe('instance health', () => {
    it('stores and retrieves instance health', () => {
      dashboard.updateInstanceHealth('inst-1', makeInstanceHealth({ status: 'healthy' }))

      const retrieved = dashboard.getInstanceHealth('inst-1') as ReturnType<typeof makeInstanceHealth>
      expect(retrieved.instanceId).toBe('inst-1')
      expect(retrieved.status).toBe('healthy')
    })

    it('returns an empty placeholder for an unknown instance', () => {
      const result = dashboard.getInstanceHealth('nope') as ReturnType<typeof makeInstanceHealth>

      expect(result.instanceId).toBe('nope')
      expect(result.status).toBe('unknown')
      expect(result.uptimePercentage).toBe(100)
    })

    it('returns all instances when no id is given', () => {
      dashboard.updateInstanceHealth('inst-1', makeInstanceHealth({ instanceId: 'inst-1' }))
      dashboard.updateInstanceHealth('inst-2', makeInstanceHealth({ instanceId: 'inst-2' }))

      const all = dashboard.getInstanceHealth() as ReturnType<typeof makeInstanceHealth>[]
      expect(all.length).toBe(2)
    })
  })

  describe('summary', () => {
    it('counts services, instances and alerts', () => {
      dashboard.updateServiceHealth('svc-a', makeServiceHealth({ serviceName: 'svc-a' }))
      dashboard.updateServiceHealth('svc-b', makeServiceHealth({ serviceName: 'svc-b', status: 'degraded' }))
      dashboard.updateInstanceHealth('inst-1', makeInstanceHealth({ instanceId: 'inst-1', status: 'healthy' }))
      dashboard.updateInstanceHealth('inst-2', makeInstanceHealth({ instanceId: 'inst-2', status: 'unhealthy' }))
      dashboard.updateAlerts([makeAlert({ id: 'a1' }), makeAlert({ id: 'a2', severity: 'critical' })])

      const summary = dashboard.getSummary()
      expect(summary.totalServices).toBe(2)
      expect(summary.healthyServices).toBe(1)
      expect(summary.degradedServices).toBe(1)
      expect(summary.totalInstances).toBe(2)
      expect(summary.healthyInstances).toBe(1)
      expect(summary.activeAlerts).toBe(2)
      expect(summary.criticalAlerts).toBe(1)
    })

    it('reports 100% uptime and 0 response time when there is no data', () => {
      const summary = dashboard.getSummary()

      expect(summary.systemUptime).toBe(100)
      expect(summary.avgResponseTimeMs).toBe(0)
      expect(summary.totalServices).toBe(0)
    })

    it('averages the response time over instances that reported one', () => {
      dashboard.updateInstanceHealth('inst-1', makeInstanceHealth({ instanceId: 'inst-1', avgResponseTimeMs: 100 }))
      dashboard.updateInstanceHealth('inst-2', makeInstanceHealth({ instanceId: 'inst-2', avgResponseTimeMs: 300 }))

      expect(dashboard.getSummary().avgResponseTimeMs).toBe(200)
    })
  })

  describe('health score', () => {
    it('scores a fully healthy instance near 100', () => {
      dashboard.updateInstanceHealth(
        'inst-1',
        makeInstanceHealth({ uptimePercentage: 100, avgResponseTimeMs: 50, errorRate: 0 })
      )

      const score = dashboard.getHealthScore()
      expect(score.overall).toBeGreaterThan(90)
      expect(score.availability).toBe(100)
      expect(score.performance).toBe(100)
      expect(score.reliability).toBe(100)
    })

    it('penalises a low uptime', () => {
      dashboard.updateInstanceHealth(
        'inst-1',
        makeInstanceHealth({ uptimePercentage: 50, avgResponseTimeMs: 50, errorRate: 0 })
      )

      const score = dashboard.getHealthScore()
      expect(score.availability).toBe(50)
      expect(score.overall).toBeLessThan(90)
    })

    it('penalises a high error rate', () => {
      dashboard.updateInstanceHealth(
        'inst-1',
        makeInstanceHealth({ uptimePercentage: 100, avgResponseTimeMs: 50, errorRate: 0.5 })
      )

      expect(dashboard.getHealthScore().reliability).toBe(50)
    })

    it('degrades the performance score as response time grows', () => {
      const slow = new HealthDashboard()
      slow.updateInstanceHealth('inst-1', makeInstanceHealth({ avgResponseTimeMs: 2500 }))

      // 2500ms is past the 2000ms step -> the bottom performance bucket.
      expect(slow.getHealthScore().performance).toBe(20)
    })

    it('exposes the weighted factor breakdown', () => {
      dashboard.updateInstanceHealth('inst-1', makeInstanceHealth())

      const score = dashboard.getHealthScore()
      expect(score.details.map((d) => d.factor)).toEqual(['availability', 'performance', 'reliability'])
      expect(score.details[0].weight).toBe(0.4)
      expect(score.details[1].weight).toBe(0.35)
      expect(score.details[2].weight).toBe(0.25)
    })
  })

  describe('alerts', () => {
    it('sorts active alerts by severity then recency', () => {
      dashboard.updateAlerts([
        makeAlert({ id: 'low', severity: 'low', timestamp: BASE_TIME.toISOString() }),
        makeAlert({ id: 'crit', severity: 'critical', timestamp: BASE_TIME.toISOString() }),
        makeAlert({ id: 'med', severity: 'medium', timestamp: BASE_TIME.toISOString() })
      ])

      const alerts = dashboard.getActiveAlerts()
      expect(alerts.map((a) => a.id)).toEqual(['crit', 'med', 'low'])
    })

    it('excludes non-active alerts', () => {
      dashboard.updateAlerts([
        makeAlert({ id: 'a1', status: 'active' }),
        makeAlert({ id: 'a2', status: 'acknowledged' }),
        makeAlert({ id: 'a3', status: 'resolved' })
      ])

      expect(dashboard.getActiveAlerts().map((a) => a.id)).toEqual(['a1'])
    })

    it('honours the limit argument', () => {
      dashboard.updateAlerts([
        makeAlert({ id: 'a1', severity: 'critical' }),
        makeAlert({ id: 'a2', severity: 'high' }),
        makeAlert({ id: 'a3', severity: 'low' })
      ])

      expect(dashboard.getActiveAlerts(2).length).toBe(2)
    })

    it('replaces the previous alert set on update', () => {
      dashboard.updateAlerts([makeAlert({ id: 'a1' })])
      dashboard.updateAlerts([makeAlert({ id: 'b1' })])

      const ids = dashboard.getActiveAlerts().map((a) => a.id)
      expect(ids).toEqual(['b1'])
    })

    it('caps the stored alerts at maxAlerts', () => {
      const capped = new HealthDashboard({ maxAlerts: 2 })
      capped.updateAlerts([makeAlert({ id: 'a1' }), makeAlert({ id: 'a2' }), makeAlert({ id: 'a3' })])

      expect(capped.getActiveAlerts().length).toBe(2)
    })
  })

  describe('trends', () => {
    it('records a trend point per service update', () => {
      dashboard.updateServiceHealth('svc', makeServiceHealth({ healthScore: 80 }))

      const trend = dashboard.getTrend('svc')
      expect(trend.length).toBe(1)
      expect(trend[0].score).toBe(80)
    })

    it('does not record trends when enableTrends is off', () => {
      const noTrend = new HealthDashboard({ enableTrends: false })
      noTrend.updateServiceHealth('svc', makeServiceHealth())

      expect(noTrend.getTrend('svc').length).toBe(0)
    })

    it('drops trend points older than the requested duration', () => {
      dashboard.updateServiceHealth('svc', makeServiceHealth())
      vi.setSystemTime(BASE_TIME.getTime() + 10_000)
      dashboard.updateServiceHealth('svc', makeServiceHealth())

      expect(dashboard.getTrend('svc', 5000).length).toBe(1)
      expect(dashboard.getTrend('svc', 60_000).length).toBe(2)
    })

    it('aggregates trends across services', () => {
      dashboard.updateServiceHealth('svc-a', makeServiceHealth())
      dashboard.updateServiceHealth('svc-b', makeServiceHealth())

      expect(dashboard.getTrend().length).toBe(2)
    })
  })

  describe('report', () => {
    it('generates a report with a healthy overall status', () => {
      dashboard.updateServiceHealth('svc', makeServiceHealth())

      const report = dashboard.generateReport()
      expect(report.id).toMatch(/^report-/)
      expect(report.overallStatus).toBe('healthy')
      expect(report.services.length).toBe(1)
      expect(report.timeRange.end).toBe(BASE_TIME.toISOString())
    })

    it('reports unhealthy when a critical alert is active', () => {
      dashboard.updateServiceHealth('svc', makeServiceHealth())
      dashboard.updateAlerts([makeAlert({ severity: 'critical' })])

      expect(dashboard.generateReport().overallStatus).toBe('unhealthy')
    })

    it('reports degraded when only a non-critical alert is active', () => {
      dashboard.updateServiceHealth('svc', makeServiceHealth())
      dashboard.updateAlerts([makeAlert({ severity: 'low' })])

      expect(dashboard.generateReport().overallStatus).toBe('degraded')
    })

    it('reports unknown when there are no services', () => {
      expect(dashboard.generateReport().overallStatus).toBe('unknown')
    })

    it('includes the recorded incidents', () => {
      const incidents: HealthIncident[] = [
        {
          id: 'inc-1',
          title: 'Deploy rollback',
          services: ['svc'],
          status: 'resolved',
          severity: 'medium',
          startedAt: BASE_TIME.toISOString(),
          endedAt: BASE_TIME.toISOString(),
          duration: 60,
          rootCause: 'deploy',
          timeline: []
        }
      ]
      dashboard.updateIncidents(incidents)

      expect(dashboard.generateReport().incidents.length).toBe(1)
    })

    it('skips recommendations when auto recommendations are disabled', () => {
      const noRecs = new HealthDashboard({ enableAutoRecommendations: false })
      noRecs.updateInstanceHealth(
        'inst-1',
        makeInstanceHealth({ errorRate: 0.5, avgResponseTimeMs: 5000 })
      )

      expect(noRecs.generateReport().recommendations.length).toBe(0)
    })
  })

  describe('recommendations', () => {
    it('recommends investigating a high error rate', () => {
      dashboard.updateInstanceHealth('inst-1', makeInstanceHealth({ instanceId: 'inst-1', errorRate: 0.5 }))

      const recs = dashboard.generateReport().recommendations
      expect(recs.some((r) => r.id === 'rec-high-error-rate')).toBe(true)
    })

    it('recommends fixing slow response times', () => {
      dashboard.updateInstanceHealth('inst-1', makeInstanceHealth({ instanceId: 'inst-1', avgResponseTimeMs: 5000 }))

      const recs = dashboard.generateReport().recommendations
      expect(recs.some((r) => r.id === 'rec-slow-response')).toBe(true)
    })

    it('recommends addressing open circuit breakers', () => {
      dashboard.updateInstanceHealth(
        'inst-1',
        makeInstanceHealth({ instanceId: 'inst-1', circuitBreakerState: 'open' })
      )

      const recs = dashboard.generateReport().recommendations
      expect(recs.some((r) => r.id === 'rec-circuit-open')).toBe(true)
    })

    it('recommends monitoring degraded services', () => {
      dashboard.updateServiceHealth('svc', makeServiceHealth({ status: 'degraded' }))

      const recs = dashboard.generateReport().recommendations
      expect(recs.some((r) => r.id === 'rec-degraded-services')).toBe(true)
    })

    it('produces no recommendations for a clean system', () => {
      dashboard.updateServiceHealth('svc', makeServiceHealth())
      dashboard.updateInstanceHealth('inst-1', makeInstanceHealth())

      expect(dashboard.generateReport().recommendations.length).toBe(0)
    })

    it('caps the recommendation count at maxRecommendations', () => {
      const capped = new HealthDashboard({ maxRecommendations: 1 })
      capped.updateInstanceHealth('inst-1', makeInstanceHealth({ instanceId: 'inst-1', errorRate: 0.5 }))
      capped.updateInstanceHealth('inst-2', makeInstanceHealth({ instanceId: 'inst-2', avgResponseTimeMs: 5000 }))

      expect(capped.generateReport().recommendations.length).toBe(1)
    })
  })

  describe('widgets', () => {
    it('exposes the five dashboard widgets', () => {
      const widgets = dashboard.getWidgets()

      expect(widgets.map((w) => w.id)).toEqual([
        'status-overview',
        'health-score',
        'response-time-chart',
        'alerts-table',
        'availability-timeline'
      ])
    })

    it('includes service status in the status overview widget', () => {
      dashboard.updateServiceHealth('svc', makeServiceHealth({ serviceName: 'svc' }))

      const widget = dashboard.getWidgets().find((w) => w.id === 'status-overview')!
      const data = widget.data as { services: { name: string }[] }
      expect(data.services[0].name).toBe('svc')
    })

    it('uses the configured refresh interval', () => {
      const custom = new HealthDashboard({ refreshIntervalMs: 1234 })

      expect(custom.getWidgets().every((w) => w.refreshIntervalMs === 1234)).toBe(true)
    })
  })

  describe('lifecycle', () => {
    it('clear() wipes all aggregated state', () => {
      dashboard.updateServiceHealth('svc', makeServiceHealth())
      dashboard.updateInstanceHealth('inst-1', makeInstanceHealth())
      dashboard.updateAlerts([makeAlert()])

      dashboard.clear()

      const summary = dashboard.getSummary()
      expect(summary.totalServices).toBe(0)
      expect(summary.totalInstances).toBe(0)
      expect(summary.activeAlerts).toBe(0)
    })

    it('updateConfig changes the refresh interval used by widgets', () => {
      dashboard.updateConfig({ refreshIntervalMs: 777 })

      expect(dashboard.getWidgets()[0].refreshIntervalMs).toBe(777)
    })
  })
})

// ============================================
// HealthMonitor Integration Tests
// ============================================

function makeMonitorConfig(overrides: Partial<HealthMonitorConfig> = {}): HealthMonitorConfig {
  return {
    ...DEFAULT_HEALTH_MONITOR_CONFIG,
    ...overrides,
    checkConfig: makeCheckConfig({
      ...DEFAULT_HEALTH_MONITOR_CONFIG.checkConfig,
      intervalMs: 1000,
      timeoutMs: 1000,
      failureThreshold: 3,
      successThreshold: 1,
      parallel: true,
      maxConcurrent: 10,
      ...(overrides.checkConfig ?? {})
    })
  }
}

describe('HealthMonitor', () => {
  let monitor: HealthMonitor

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(BASE_TIME)
    mockFetch.mockReset()
    global.fetch = mockFetch as unknown as typeof fetch
    monitor = new HealthMonitor(makeMonitorConfig())
  })

  afterEach(() => {
    monitor.stop()
    vi.useRealTimers()
  })

  describe('lifecycle', () => {
    it('starts and stops', () => {
      monitor.start()
      expect(monitor.getStatus().isRunning).toBe(true)

      monitor.stop()
      expect(monitor.getStatus().isRunning).toBe(false)
    })

    it('is idempotent on a repeated start()', () => {
      monitor.start()
      monitor.start()

      expect(monitor.getStatus().isRunning).toBe(true)
    })

    it('is safe to stop() when never started', () => {
      expect(() => monitor.stop()).not.toThrow()
      expect(monitor.getStatus().isRunning).toBe(false)
    })

    it('emits monitor.started / monitor.stopped', () => {
      const handler = vi.fn()
      monitor.onEvent(handler)

      monitor.start()
      monitor.stop()

      const types = handler.mock.calls.map((c) => c[0].type)
      expect(types).toContain('health.monitor.started')
      expect(types).toContain('health.monitor.stopped')
    })
  })

  describe('service registration', () => {
    it('registers a service and counts it in the status', () => {
      monitor.registerService(createMockInstance('inst-1', 'test-service'))

      const status = monitor.getStatus()
      expect(status.registeredInstances).toBe(1)
      expect(status.registeredServices).toBe(1)
    })

    it('groups instances by service name', () => {
      monitor.registerService(createMockInstance('inst-1', 'svc-a'))
      monitor.registerService(createMockInstance('inst-2', 'svc-a'))
      monitor.registerService(createMockInstance('inst-3', 'svc-b'))

      const status = monitor.getStatus()
      expect(status.registeredInstances).toBe(3)
      expect(status.registeredServices).toBe(2)
    })

    it('unregisters a service', () => {
      monitor.registerService(createMockInstance('inst-1', 'test-service'))
      monitor.unregisterService('inst-1')

      expect(monitor.getStatus().registeredInstances).toBe(0)
    })

    it('ignores the unregistration of an unknown service', () => {
      monitor.unregisterService('nope')

      expect(monitor.getStatus().registeredInstances).toBe(0)
    })

    it('supports 50+ instances', () => {
      for (let i = 1; i <= 50; i++) {
        monitor.registerService(createMockInstance(`inst-${i}`, `service-${i % 10}`))
      }

      const status = monitor.getStatus()
      expect(status.registeredInstances).toBe(50)
      expect(status.registeredServices).toBe(10)
    })

    it('emits service.registered / service.unregistered', () => {
      const handler = vi.fn()
      monitor.onEvent(handler)

      monitor.registerService(createMockInstance('inst-1', 'test-service'))
      monitor.unregisterService('inst-1')

      const types = handler.mock.calls.map((c) => c[0].type)
      expect(types).toContain('health.service.registered')
      expect(types).toContain('health.service.unregistered')
    })
  })

  describe('checks', () => {
    it('checks a single instance and returns its health', async () => {
      monitor.registerService(createMockInstance('inst-1', 'test-service'))

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockHealthResponse('healthy')
      })

      const health = await withTimers(monitor.checkInstance('inst-1'))

      expect(health?.instanceId).toBe('inst-1')
      expect(health?.status).toBe('healthy')
    })

    it('returns undefined for an unknown instance', async () => {
      const health = await withTimers(monitor.checkInstance('nope'))

      expect(health).toBeUndefined()
    })

    it('checks all instances and returns their health', async () => {
      monitor.registerService(createMockInstance('inst-1', 'service-1'))
      monitor.registerService(createMockInstance('inst-2', 'service-2'))

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockHealthResponse('healthy')
      })

      const results = await withTimers(monitor.checkAllInstances())

      expect(results.size).toBe(2)
      expect(results.get('inst-1')?.status).toBe('healthy')
    })

    it('aggregates service health into the dashboard after a check', async () => {
      monitor.registerService(createMockInstance('inst-1', 'svc-a'))

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockHealthResponse('healthy')
      })

      await withTimers(monitor.checkAllInstances())

      const serviceHealth = monitor.getServiceHealth('svc-a') as { status: string; healthyInstances: number }
      expect(serviceHealth.status).toBe('healthy')
      expect(serviceHealth.healthyInstances).toBe(1)
    })

    it('reports a service as degraded when only a minority of instances are unhealthy', async () => {
      // 3 instances of the same service: 2 healthy, 1 unhealthy (1/3 <= 50%).
      // The service status must be "degraded", NOT "unhealthy" — a service
      // only goes "unhealthy" when MORE THAN HALF of its instances are down.
      const monitor = new HealthMonitor(
        makeMonitorConfig({
          checkConfig: makeCheckConfig({
            intervalMs: 1000,
            timeoutMs: 1000,
            failureThreshold: 1,
            successThreshold: 1,
            retry: {
              enabled: false,
              maxAttempts: 1,
              initialDelayMs: 100,
              maxDelayMs: 1000,
              backoffMultiplier: 2,
              jitterFactor: 0
            }
          })
        })
      )
      monitor.registerService(createMockInstance('inst-1', 'svc-a'))
      monitor.registerService(createMockInstance('inst-2', 'svc-a'))
      monitor.registerService(createMockInstance('inst-3', 'svc-a'))

      mockFetch.mockImplementation((url: string) => {
        if (String(url).includes('inst-1')) return Promise.reject(new Error('down'))
        return Promise.resolve({ ok: true, json: async () => createMockHealthResponse('healthy') })
      })

      await withTimers(monitor.checkAllInstances())

      const serviceHealth = monitor.getServiceHealth('svc-a') as {
        status: string
        healthyInstances: number
        unhealthyInstances: number
      }
      expect(serviceHealth.unhealthyInstances).toBe(1)
      expect(serviceHealth.healthyInstances).toBe(2)
      expect(serviceHealth.status).toBe('degraded')
    })

    it('reports a service as unhealthy when most instances are down', async () => {
      const monitor = new HealthMonitor(
        makeMonitorConfig({
          checkConfig: makeCheckConfig({
            intervalMs: 1000,
            timeoutMs: 1000,
            failureThreshold: 1,
            successThreshold: 1,
            retry: {
              enabled: false,
              maxAttempts: 1,
              initialDelayMs: 100,
              maxDelayMs: 1000,
              backoffMultiplier: 2,
              jitterFactor: 0
            }
          })
        })
      )
      monitor.registerService(createMockInstance('inst-1', 'svc-b'))
      monitor.registerService(createMockInstance('inst-2', 'svc-b'))
      monitor.registerService(createMockInstance('inst-3', 'svc-b'))

      mockFetch.mockImplementation((url: string) => {
        if (String(url).includes('inst-3')) {
          return Promise.resolve({ ok: true, json: async () => createMockHealthResponse('healthy') })
        }
        return Promise.reject(new Error('down'))
      })

      await withTimers(monitor.checkAllInstances())

      const serviceHealth = monitor.getServiceHealth('svc-b') as { status: string }
      expect(serviceHealth.status).toBe('unhealthy')
    })

    it('marks a failing service degraded in the dashboard', async () => {
      monitor.registerService(createMockInstance('inst-1', 'svc-a'))

      mockFetch.mockRejectedValue(new Error('down'))

      await withTimers(monitor.checkAllInstances())

      const serviceHealth = monitor.getServiceHealth('svc-a') as { status: string }
      expect(serviceHealth.status).toBe('degraded')
    })
  })

  describe('heartbeats', () => {
    it('accepts a heartbeat and mirrors the instance into the dashboard', () => {
      monitor.start()

      const result = monitor.receiveHeartbeat(makePayload())

      expect(result.success).toBe(true)
      expect(result.status).toBe('healthy')

      const health = monitor.getInstanceHealth('inst-1') as { status: string }
      expect(health.status).toBe('healthy')
    })

    it('forwards heartbeat status changes as monitor events', () => {
      const handler = vi.fn()
      monitor.onEvent(handler)

      monitor.receiveHeartbeat(makePayload({ status: 'healthy' }))

      expect(handler.mock.calls.map((c) => c[0].type)).toContain('health.status.changed')
    })
  })

  describe('dashboard & reporting', () => {
    it('returns a dashboard summary', () => {
      monitor.registerService(createMockInstance('inst-1', 'test-service'))

      const summary = monitor.getDashboardSummary()
      expect(typeof summary.totalServices).toBe('number')
      expect(summary.totalInstances).toBe(0)
    })

    it('generates a report', () => {
      monitor.registerService(createMockInstance('inst-1', 'test-service'))

      const report = monitor.generateReport()
      expect(report).toBeDefined()
      expect(report.timestamp).toBeDefined()
    })

    it('exposes dashboard widgets', () => {
      const widgets = monitor.getDashboardWidgets()
      expect(widgets.length).toBe(5)
    })

    it('exposes the health score', () => {
      expect(monitor.getHealthScore().overall).toBeGreaterThanOrEqual(0)
    })

    it('exposes trends', () => {
      expect(Array.isArray(monitor.getTrends())).toBe(true)
    })

    it('acknowledgeAlert / resolveAlert proxy to the failure detector', () => {
      expect(monitor.acknowledgeAlert('nope', 'me')).toBe(false)
      expect(monitor.resolveAlert('nope')).toBe(false)
    })
  })

  describe('events', () => {
    it('forwards checker events to the monitor listeners', async () => {
      monitor.registerService(createMockInstance('inst-1', 'test-service'))

      const handler = vi.fn()
      monitor.onEvent(handler)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockHealthResponse('healthy')
      })

      await withTimers(monitor.checkInstance('inst-1'))

      expect(handler).toHaveBeenCalled()
      const types = handler.mock.calls.map((c) => c[0].type)
      expect(types.some((t: string) => t.startsWith('health.check'))).toBe(true)
    })

    it('does not throw when a listener throws', async () => {
      monitor.onEvent(() => {
        throw new Error('listener exploded')
      })

      monitor.registerService(createMockInstance('inst-1'))

      expect(() => monitor.start()).not.toThrow()
    })
  })

  describe('config & reset', () => {
    it('updateConfig propagates the check config to the checker', async () => {
      monitor.updateConfig(
        makeMonitorConfig({
          checkConfig: makeCheckConfig({ intervalMs: 5000, successThreshold: 1 })
        })
      )
      monitor.registerService(createMockInstance('inst-1'))

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockHealthResponse('healthy')
      })

      await withTimers(monitor.checkInstance('inst-1'))

      expect(monitor.getInstanceHealth('inst-1')).toBeDefined()
    })

    it('clear() wipes the registered services', () => {
      monitor.registerService(createMockInstance('inst-1', 'test-service'))

      monitor.clear()

      const status = monitor.getStatus()
      expect(status.registeredInstances).toBe(0)
      expect(status.registeredServices).toBe(0)
    })
  })

  describe('scheduling', () => {
    it('runs periodic checks while running', async () => {
      monitor.start()
      monitor.registerService(createMockInstance('inst-1', 'test-service'))

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockHealthResponse('healthy')
      })

      await vi.advanceTimersByTimeAsync(1200)

      expect(mockFetch).toHaveBeenCalled()
    })

    it('stops the periodic checks after stop()', async () => {
      monitor.start()
      monitor.registerService(createMockInstance('inst-1', 'test-service'))
      monitor.stop()

      mockFetch.mockClear()
      await vi.advanceTimersByTimeAsync(5000)

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})

describe('module exports & default configuration', () => {
  it('exposes every component through the barrel export', async () => {
    const mod = await import('../index')

    expect(typeof mod.HealthMonitor).toBe('function')
    expect(typeof mod.HealthChecker).toBe('function')
    expect(typeof mod.PassiveHealthReporter).toBe('function')
    expect(typeof mod.FailureDetector).toBe('function')
    expect(typeof mod.RecoveryManager).toBe('function')
    expect(typeof mod.HealthDashboard).toBe('function')
    expect(mod.default).toBe(mod.HealthMonitor)
  })

  it('ships a sane default check configuration', () => {
    expect(DEFAULT_HEALTH_CHECK_CONFIG.intervalMs).toBe(30000)
    expect(DEFAULT_HEALTH_CHECK_CONFIG.timeoutMs).toBe(5000)
    expect(DEFAULT_HEALTH_CHECK_CONFIG.failureThreshold).toBe(3)
    expect(DEFAULT_HEALTH_CHECK_CONFIG.successThreshold).toBe(2)
    expect(DEFAULT_HEALTH_CHECK_CONFIG.parallel).toBe(true)
    expect(DEFAULT_HEALTH_CHECK_CONFIG.retry.enabled).toBe(true)
    expect(DEFAULT_HEALTH_CHECK_CONFIG.retry.maxAttempts).toBe(3)
    expect(DEFAULT_HEALTH_CHECK_CONFIG.circuitBreaker.enabled).toBe(true)
  })

  it('ships a sane default monitor configuration', () => {
    expect(DEFAULT_HEALTH_MONITOR_CONFIG.checkConfig).toBe(DEFAULT_HEALTH_CHECK_CONFIG)
    expect(DEFAULT_HEALTH_MONITOR_CONFIG.maxHistorySize).toBe(100)
    expect(DEFAULT_HEALTH_MONITOR_CONFIG.dashboardRefreshMs).toBe(5000)
    expect(DEFAULT_HEALTH_MONITOR_CONFIG.notificationChannels).toEqual([])
    expect(DEFAULT_HEALTH_MONITOR_CONFIG.logging.level).toBe('info')
  })
})
