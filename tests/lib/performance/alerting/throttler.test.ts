/**
 * Throttler Unit Tests
 * Tests for alert throttling mechanism
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ========================================
// Types (matching design document)
// ========================================

interface ThrottleConfig {
  windowMs: number      // Time window in milliseconds
  maxPerWindow: number  // Max messages per window
}

// ========================================
// Throttler Implementation (for testing)
// ========================================

class Throttler {
  private config: ThrottleConfig
  private history: Map<string, number[]> = new Map()

  constructor(config: ThrottleConfig) {
    this.config = config
  }

  shouldThrottle(key: string): boolean {
    const now = Date.now()
    const timestamps = this.history.get(key) || []

    // Clean up expired records
    const validTimestamps = timestamps.filter(
      ts => now - ts < this.config.windowMs
    )

    if (validTimestamps.length >= this.config.maxPerWindow) {
      return true // Throttle
    }

    // Record this send
    validTimestamps.push(now)
    this.history.set(key, validTimestamps)
    return false
  }

  reset(key?: string): void {
    if (key) {
      this.history.delete(key)
    } else {
      this.history.clear()
    }
  }

  getStats(key: string): { count: number; oldestTimestamp: number | null } {
    const timestamps = this.history.get(key) || []
    const now = Date.now()
    const validTimestamps = timestamps.filter(
      ts => now - ts < this.config.windowMs
    )
    
    return {
      count: validTimestamps.length,
      oldestTimestamp: validTimestamps.length > 0 ? validTimestamps[0] : null,
    }
  }
}

// ========================================
// Tests
// ========================================

describe('Throttler', () => {
  let throttler: Throttler

  describe('basic throttling', () => {
    beforeEach(() => {
      throttler = new Throttler({
        windowMs: 60000,    // 1 minute
        maxPerWindow: 1,    // 1 message per minute
      })
    })

    it('should allow first message in window', () => {
      const key = 'error:server-1:cpu'
      expect(throttler.shouldThrottle(key)).toBe(false)
    })

    it('should throttle second message in same window', () => {
      const key = 'error:server-1:cpu'
      
      // First message should pass
      throttler.shouldThrottle(key)
      
      // Second message should be throttled
      expect(throttler.shouldThrottle(key)).toBe(true)
    })

    it('should throttle all subsequent messages in window', () => {
      const key = 'warning:api:latency'
      
      // First passes
      throttler.shouldThrottle(key)
      
      // All subsequent are throttled
      expect(throttler.shouldThrottle(key)).toBe(true)
      expect(throttler.shouldThrottle(key)).toBe(true)
      expect(throttler.shouldThrottle(key)).toBe(true)
    })
  })

  describe('window expiration', () => {
    beforeEach(() => {
      throttler = new Throttler({
        windowMs: 100,  // 100ms window for testing
        maxPerWindow: 1,
      })
    })

    it('should allow message after window expires', async () => {
      const key = 'info:app:status'
      
      // First message passes
      expect(throttler.shouldThrottle(key)).toBe(false)
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Should allow again after window expires
      expect(throttler.shouldThrottle(key)).toBe(false)
    })

    it('should reset throttle count after window expires', async () => {
      const key = 'critical:db:connection'
      
      // First message
      throttler.shouldThrottle(key)
      
      // Multiple throttled messages
      throttler.shouldThrottle(key)
      throttler.shouldThrottle(key)
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Should allow again
      expect(throttler.shouldThrottle(key)).toBe(false)
    })
  })

  describe('independent key throttling', () => {
    beforeEach(() => {
      throttler = new Throttler({
        windowMs: 60000,
        maxPerWindow: 1,
      })
    })

    it('should throttle different keys independently', () => {
      const key1 = 'error:server-1:cpu'
      const key2 = 'error:server-2:cpu'
      const key3 = 'warning:server-1:memory'
      
      // All first messages should pass
      expect(throttler.shouldThrottle(key1)).toBe(false)
      expect(throttler.shouldThrottle(key2)).toBe(false)
      expect(throttler.shouldThrottle(key3)).toBe(false)
      
      // All second messages should be throttled
      expect(throttler.shouldThrottle(key1)).toBe(true)
      expect(throttler.shouldThrottle(key2)).toBe(true)
      expect(throttler.shouldThrottle(key3)).toBe(true)
    })

    it('should not affect other keys when one is throttled', () => {
      const key1 = 'info:app:health'
      const key2 = 'error:app:crash'
      
      // Throttle key1
      throttler.shouldThrottle(key1)
      expect(throttler.shouldThrottle(key1)).toBe(true)
      
      // key2 should still be allowed
      expect(throttler.shouldThrottle(key2)).toBe(false)
    })
  })

  describe('maxPerWindow configuration', () => {
    it('should allow multiple messages per window', () => {
      throttler = new Throttler({
        windowMs: 60000,
        maxPerWindow: 3,
      })
      
      const key = 'error:api:timeout'
      
      // First 3 should pass
      expect(throttler.shouldThrottle(key)).toBe(false)
      expect(throttler.shouldThrottle(key)).toBe(false)
      expect(throttler.shouldThrottle(key)).toBe(false)
      
      // 4th should be throttled
      expect(throttler.shouldThrottle(key)).toBe(true)
    })

    it('should allow exactly maxPerWindow messages', () => {
      throttler = new Throttler({
        windowMs: 60000,
        maxPerWindow: 5,
      })
      
      const key = 'warning:cache:miss'
      
      // Exactly 5 should pass
      for (let i = 0; i < 5; i++) {
        expect(throttler.shouldThrottle(key)).toBe(false)
      }
      
      // 6th should be throttled
      expect(throttler.shouldThrottle(key)).toBe(true)
    })

    it('should allow 10 messages when maxPerWindow is 10', () => {
      throttler = new Throttler({
        windowMs: 60000,
        maxPerWindow: 10,
      })
      
      const key = 'info:metrics:counter'
      
      for (let i = 0; i < 10; i++) {
        expect(throttler.shouldThrottle(key)).toBe(false)
      }
      
      expect(throttler.shouldThrottle(key)).toBe(true)
    })
  })

  describe('reset functionality', () => {
    beforeEach(() => {
      throttler = new Throttler({
        windowMs: 60000,
        maxPerWindow: 1,
      })
    })

    it('should reset specific key', () => {
      const key = 'error:server:disk'
      
      // First message
      throttler.shouldThrottle(key)
      expect(throttler.shouldThrottle(key)).toBe(true)
      
      // Reset
      throttler.reset(key)
      
      // Should allow again
      expect(throttler.shouldThrottle(key)).toBe(false)
    })

    it('should not affect other keys when resetting specific key', () => {
      const key1 = 'error:server-1:cpu'
      const key2 = 'error:server-2:cpu'
      
      throttler.shouldThrottle(key1)
      throttler.shouldThrottle(key2)
      
      throttler.reset(key1)
      
      // key1 should be reset
      expect(throttler.shouldThrottle(key1)).toBe(false)
      
      // key2 should still be throttled
      expect(throttler.shouldThrottle(key2)).toBe(true)
    })

    it('should reset all keys when no key specified', () => {
      const key1 = 'error:server-1:cpu'
      const key2 = 'error:server-2:memory'
      const key3 = 'warning:server-3:disk'
      
      // Throttle all keys
      throttler.shouldThrottle(key1)
      throttler.shouldThrottle(key2)
      throttler.shouldThrottle(key3)
      
      // Reset all
      throttler.reset()
      
      // All should be allowed
      expect(throttler.shouldThrottle(key1)).toBe(false)
      expect(throttler.shouldThrottle(key2)).toBe(false)
      expect(throttler.shouldThrottle(key3)).toBe(false)
    })
  })

  describe('getStats', () => {
    beforeEach(() => {
      throttler = new Throttler({
        windowMs: 60000,
        maxPerWindow: 3,
      })
    })

    it('should return correct count', () => {
      const key = 'error:api:latency'
      
      expect(throttler.getStats(key).count).toBe(0)
      
      throttler.shouldThrottle(key)
      expect(throttler.getStats(key).count).toBe(1)
      
      throttler.shouldThrottle(key)
      expect(throttler.getStats(key).count).toBe(2)
      
      throttler.shouldThrottle(key)
      expect(throttler.getStats(key).count).toBe(3)
      
      // This one is throttled but count stays at 3
      throttler.shouldThrottle(key)
      expect(throttler.getStats(key).count).toBe(3)
    })

    it('should return oldest timestamp', () => {
      const key = 'warning:cache:hit-rate'
      const beforeTime = Date.now()
      
      throttler.shouldThrottle(key)
      throttler.shouldThrottle(key)
      
      const stats = throttler.getStats(key)
      expect(stats.oldestTimestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(stats.oldestTimestamp).toBeLessThanOrEqual(Date.now())
    })

    it('should return null for unknown key', () => {
      const stats = throttler.getStats('unknown:key')
      expect(stats.count).toBe(0)
      expect(stats.oldestTimestamp).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should handle very short window', async () => {
      throttler = new Throttler({
        windowMs: 10,  // 10ms
        maxPerWindow: 1,
      })
      
      const key = 'info:health:check'
      
      expect(throttler.shouldThrottle(key)).toBe(false)
      expect(throttler.shouldThrottle(key)).toBe(true)
      
      await new Promise(resolve => setTimeout(resolve, 20))
      
      expect(throttler.shouldThrottle(key)).toBe(false)
    })

    it('should handle maxPerWindow = 0', () => {
      throttler = new Throttler({
        windowMs: 60000,
        maxPerWindow: 0,
      })
      
      const key = 'error:critical:system'
      
      // Should always throttle
      expect(throttler.shouldThrottle(key)).toBe(true)
      expect(throttler.shouldThrottle(key)).toBe(true)
    })

    it('should handle empty key', () => {
      throttler = new Throttler({
        windowMs: 60000,
        maxPerWindow: 1,
      })
      
      expect(throttler.shouldThrottle('')).toBe(false)
      expect(throttler.shouldThrottle('')).toBe(true)
    })

    it('should handle concurrent calls', () => {
      throttler = new Throttler({
        windowMs: 60000,
        maxPerWindow: 100,  // Allow many
      })
      
      const key = 'test:concurrent'
      const results: boolean[] = []
      
      // Simulate concurrent calls
      for (let i = 0; i < 100; i++) {
        results.push(throttler.shouldThrottle(key))
      }
      
      // All should pass
      expect(results.every(r => r === false)).toBe(true)
      
      // Next should be throttled
      expect(throttler.shouldThrottle(key)).toBe(true)
    })
  })
})
