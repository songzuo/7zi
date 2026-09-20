/**
 * Sliding Window Algorithm Tests
 * 滑动窗口算法测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SlidingWindow, MemorySlidingWindow } from '../algorithms/sliding-window'
import { MemoryAdapter } from '../storage/memory-adapter'

describe('SlidingWindow', () => {
  let storage: MemoryAdapter
  let slidingWindow: SlidingWindow

  beforeEach(() => {
    storage = new MemoryAdapter()
    slidingWindow = new SlidingWindow(storage)
  })

  afterEach(async () => {
    await storage.clear()
  })

  describe('Basic Operations', () => {
    it('should allow requests within limit', async () => {
      const result = await slidingWindow.check({
        key: 'test-key',
        limit: 10,
        windowSeconds: 60,
      })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
      expect(result.limit).toBe(10)
    })

    it('should track request count correctly', async () => {
      const config = {
        key: 'test-key',
        limit: 5,
        windowSeconds: 60,
      }

      const result1 = await slidingWindow.check(config)
      expect(result1.remaining).toBe(4)

      const result2 = await slidingWindow.check(config)
      expect(result2.remaining).toBe(3)
    })

    it('should block requests exceeding limit', async () => {
      const config = {
        key: 'test-key',
        limit: 5,
        windowSeconds: 60,
      }

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const result = await slidingWindow.check(config)
        expect(result.allowed).toBe(true)
      }

      // 6th request should be blocked
      const result = await slidingWindow.check(config)
      expect(result.allowed).toBe(false)
      expect(result.retryAfter).toBeGreaterThan(0)
    })
  })

  describe('Time Window Management', () => {
    it('should slide window correctly', async () => {
      const config = {
        key: 'test-key',
        limit: 10,
        windowSeconds: 1, // 1 second window
      }

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        await slidingWindow.check(config)
      }

      // Wait for window to pass
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Should allow new requests
      const result = await slidingWindow.check(config)
      expect(result.allowed).toBe(true)
    })

    it('should handle partial window slides', async () => {
      const config = {
        key: 'test-key',
        limit: 10,
        windowSeconds: 2,
      }

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        await slidingWindow.check(config)
      }

      // Wait 1 second (half the window)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Old requests should have expired, new ones allowed
      const result = await slidingWindow.check(config)
      expect(result.allowed).toBe(true)
    })
  })

  describe('Precision', () => {
    it('should respect custom precision', async () => {
      const config = {
        key: 'test-key',
        limit: 100,
        windowSeconds: 60,
        precision: 20, // 20 sub-windows
      }

      // Should handle higher precision
      for (let i = 0; i < 100; i++) {
        const result = await slidingWindow.check(config)
        expect(result.allowed).toBe(true)
      }

      const result = await slidingWindow.check(config)
      expect(result.allowed).toBe(false)
    })
  })

  describe('Status and Reset', () => {
    it('should return correct status', async () => {
      const config = {
        key: 'test-key',
        limit: 10,
        windowSeconds: 60,
      }

      await slidingWindow.check(config)
      await slidingWindow.check(config)

      const status = await slidingWindow.getStatus(config.key, 60)
      expect(status).toBeDefined()
      expect(status.count).toBe(2)
      // SlidingWindowState doesn't have limit - that's in config, not state
      expect(status.windowStart).toBeDefined()
      expect(status.windowEnd).toBeDefined()
    })

    it('should reset window', async () => {
      const config = {
        key: 'test-key',
        limit: 10,
        windowSeconds: 60,
      }

      // Fill up the window
      for (let i = 0; i < 10; i++) {
        await slidingWindow.check(config)
      }

      // Reset
      await slidingWindow.reset(config.key)

      // Should allow requests again
      const result = await slidingWindow.check(config)
      expect(result.allowed).toBe(true)
    })
  })

  describe('Multiple Keys', () => {
    it('should handle multiple independent windows', async () => {
      const config1 = { key: 'ip-192.168.1.1', limit: 5, windowSeconds: 60 }
      const config2 = { key: 'ip-192.168.1.2', limit: 5, windowSeconds: 60 }

      // Fill up ip-1
      for (let i = 0; i < 5; i++) {
        await slidingWindow.check(config1)
      }

      // ip-2 should still have capacity
      const result = await slidingWindow.check(config2)
      expect(result.allowed).toBe(true)
    })
  })

  describe('Boundary Effects', () => {
    it('should avoid fixed window boundary effects', async () => {
      const config = {
        key: 'test-key',
        limit: 100,
        windowSeconds: 10,
      }

      // Make 50 requests at the start of window
      for (let i = 0; i < 50; i++) {
        await slidingWindow.check(config)
      }

      // Wait near window boundary
      await new Promise(resolve => setTimeout(resolve, 9000))

      // Make another 50 requests
      for (let i = 0; i < 50; i++) {
        const result = await slidingWindow.check(config)
        // Should allow some as old requests expire
        expect(result.allowed).toBe(true)
      }

      // Next request should be blocked
      const result = await slidingWindow.check(config)
      expect(result.allowed).toBe(false)
    })
  })
})

describe('MemorySlidingWindow', () => {
  let slidingWindow: MemorySlidingWindow

  beforeEach(() => {
    slidingWindow = new MemorySlidingWindow()
  })

  it('should work without storage backend', async () => {
    const result = await slidingWindow.check({
      key: 'test-key',
      limit: 10,
      windowSeconds: 60,
    })

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(9)
  })

  it('should handle multiple keys in memory', async () => {
    const config1 = { key: 'key-1', limit: 5, windowSeconds: 60 }
    const config2 = { key: 'key-2', limit: 5, windowSeconds: 60 }

    // Fill up key-1
    for (let i = 0; i < 5; i++) {
      await slidingWindow.check(config1)
    }

    // key-2 should still have capacity
    const result = await slidingWindow.check(config2)
    expect(result.allowed).toBe(true)
  })

  it('should automatically clean up expired entries', async () => {
    const config = {
      key: 'test-key',
      limit: 10,
      windowSeconds: 1,
    }

    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      await slidingWindow.check(config)
    }

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 1100))

    // Should allow new requests
    const result = await slidingWindow.check(config)
    expect(result.allowed).toBe(true)
  })

  it('should reset window', async () => {
    const config = { key: 'test-key', limit: 10, windowSeconds: 60 }

    // Fill up the window
    for (let i = 0; i < 10; i++) {
      await slidingWindow.check(config)
    }

    // Reset
    await slidingWindow.reset(config.key)

    // Should allow requests again
    const result = await slidingWindow.check(config)
    expect(result.allowed).toBe(true)
  })
})

describe('calculateOptimalPrecision', () => {
  it('should return appropriate precision for small windows', () => {
    const { calculateOptimalPrecision } = require('../algorithms/sliding-window')
    const precision = calculateOptimalPrecision(60, 10)
    expect(precision).toBeGreaterThan(0)
    expect(precision).toBeLessThanOrEqual(10)
  })

  it('should return appropriate precision for large windows', () => {
    const { calculateOptimalPrecision } = require('../algorithms/sliding-window')
    const precision = calculateOptimalPrecision(3600, 1000)
    expect(precision).toBeGreaterThan(0)
  })
})