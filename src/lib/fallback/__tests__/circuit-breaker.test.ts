import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerOpenError,
  CircuitBreakerRegistry,
  getCircuitBreaker,
} from '../circuit-breaker'

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'test-breaker',
      failureThreshold: 3,
      successThreshold: 2,
      recoveryTimeout: 1000,
      minimumRequests: 2,
    })
  })

  describe('Initial State', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED)
    })

    it('should have zero stats initially', () => {
      const stats = breaker.getStats()
      expect(stats.total).toBe(0)
      expect(stats.successes).toBe(0)
      expect(stats.failures).toBe(0)
    })

    it('should report healthy when closed', () => {
      const health = breaker.getHealth()
      expect(health.isHealthy).toBe(true)
      expect(health.state).toBe(CircuitState.CLOSED)
    })
  })

  describe('execute()', () => {
    it('should return result on successful execution', async () => {
      const result = await breaker.execute(async () => 'success')
      expect(result).toBe('success')
    })

    it('should increment success stats on success', async () => {
      await breaker.execute(async () => 'success')
      const stats = breaker.getStats()
      expect(stats.successes).toBe(1)
      expect(stats.total).toBe(1)
    })

    it('should throw and record failure on error', async () => {
      await expect(
        breaker.execute(async () => {
          throw new Error('test error')
        })
      ).rejects.toThrow('test error')

      const stats = breaker.getStats()
      expect(stats.failures).toBe(1)
      expect(stats.total).toBe(1)
    })

    it('should open circuit after reaching failure threshold', async () => {
      // Execute failures to trigger threshold
      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => {
          throw new Error('test error')
        }).catch(() => {}) // Ignore errors
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN)
    })

    it('should fail immediately when circuit is open', async () => {
      // Set lastFailureTime so getState() doesn't transition to HALF_OPEN
      breaker.getStats().lastFailureTime = Date.now()
      breaker.open()

      await expect(
        breaker.execute(async () => 'success')
      ).rejects.toThrow(CircuitBreakerOpenError)
    })

    it('should throw CircuitBreakerOpenError with retry info', async () => {
      breaker.getStats().lastFailureTime = Date.now()
      breaker.open()
      breaker.reset = vi.fn() // Mock reset to control retry time

      await expect(
        breaker.execute(async () => 'success')
      ).rejects.toThrow(/Circuit breaker is open for test-breaker/)
    })
  })

  describe('State Transitions', () => {
    it('should transition from CLOSED to OPEN on failures', async () => {
      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => {
          throw new Error('fail')
        }).catch(() => {})
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN)
    })

    it('should stay in OPEN until recovery timeout', async () => {
      breaker.open()

      // Immediately check - should still be OPEN
      expect(breaker.getState()).toBe(CircuitState.OPEN)
    })

    it('should transition from OPEN to HALF_OPEN after timeout', async () => {
      breaker.open()

      // Fast forward time
      vi.useFakeTimers()
      vi.setSystemTime(Date.now() + 1001) // recoveryTimeout is 1000

      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN)

      vi.useRealTimers()
    })

    it('should transition from HALF_OPEN to CLOSED on successes', async () => {
      breaker.open()

      // Transition to HALF_OPEN
      vi.useFakeTimers()
      vi.setSystemTime(Date.now() + 1001)
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN)

      // Successful calls
      await breaker.execute(async () => 'success')
      await breaker.execute(async () => 'success')

      expect(breaker.getState()).toBe(CircuitState.CLOSED)

      vi.useRealTimers()
    })

    it('should transition from HALF_OPEN to OPEN on failure', async () => {
      breaker.open()

      // Transition to HALF_OPEN
      vi.useFakeTimers()
      vi.setSystemTime(Date.now() + 1001)
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN)

      // Failed call
      await breaker.execute(async () => {
        throw new Error('fail')
      }).catch(() => {})

      expect(breaker.getState()).toBe(CircuitState.OPEN)

      vi.useRealTimers()
    })
  })

  describe('Manual Controls', () => {
    it('should reset to CLOSED state', () => {
      breaker.open()
      breaker.reset()

      expect(breaker.getState()).toBe(CircuitState.CLOSED)
    })

    it('should clear stats on reset', async () => {
      await breaker.execute(async () => 'success').catch(() => {})

      breaker.reset()

      const stats = breaker.getStats()
      expect(stats.total).toBe(0)
      expect(stats.successes).toBe(0)
      expect(stats.failures).toBe(0)
    })

    it('should manually open circuit', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED)

      breaker.open()

      expect(breaker.getState()).toBe(CircuitState.OPEN)
    })

    it('should manually close circuit', () => {
      breaker.open()
      breaker.close()

      expect(breaker.getState()).toBe(CircuitState.CLOSED)
    })
  })

  describe('executeDirect()', () => {
    it('should bypass circuit breaker', async () => {
      breaker.open()

      const result = await breaker.executeDirect(async () => 'direct')
      expect(result).toBe('direct')
    })
  })

  describe('Timeout', () => {
    it('should timeout slow requests', async () => {
      const fastBreaker = new CircuitBreaker({
        name: 'timeout-test',
        requestTimeout: 50,
      })

      await expect(
        fastBreaker.execute(async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return 'slow'
        })
      ).rejects.toThrow('Request timeout')
    })
  })

  describe('getHealth()', () => {
    it('should return correct health status', async () => {
      await breaker.execute(async () => 'success').catch(() => {})
      await breaker.execute(async () => {
        throw new Error('fail')
      }).catch(() => {})

      const health = breaker.getHealth()
      expect(health.state).toBe(CircuitState.CLOSED)
      expect(health.stats.total).toBe(2)
      expect(health.failureRate).toBe(50)
      expect(health.isHealthy).toBe(true)
    })
  })
})

describe('CircuitBreakerRegistry', () => {
  beforeEach(() => {
    CircuitBreakerRegistry.getInstance().resetAll()
  })

  it('should be singleton', () => {
    const instance1 = CircuitBreakerRegistry.getInstance()
    const instance2 = CircuitBreakerRegistry.getInstance()
    expect(instance1).toBe(instance2)
  })

  it('should create new breaker if not exists', () => {
    const breaker = getCircuitBreaker('new-breaker')
    expect(breaker).toBeInstanceOf(CircuitBreaker)
  })

  it('should return same breaker for same name', () => {
    const breaker1 = getCircuitBreaker('shared-breaker')
    const breaker2 = getCircuitBreaker('shared-breaker')
    expect(breaker1).toBe(breaker2)
  })

  it('should remove breaker', () => {
    const registry = CircuitBreakerRegistry.getInstance()
    const breaker = getCircuitBreaker('to-remove')
    registry.removeBreaker('to-remove')

    // Getting again should create new instance
    const newBreaker = getCircuitBreaker('to-remove')
    expect(breaker).not.toBe(newBreaker)
  })

  it('should reset all breakers', () => {
    const breaker = getCircuitBreaker('reset-test')
    breaker.open()

    CircuitBreakerRegistry.getInstance().resetAll()

    expect(breaker.getState()).toBe(CircuitState.CLOSED)
  })
})