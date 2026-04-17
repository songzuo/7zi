/**
 * Token Bucket Algorithm Tests
 * 令牌桶算法测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TokenBucket, MemoryTokenBucket } from '../algorithms/token-bucket'
import { MemoryAdapter } from '../storage/memory-adapter'

describe('TokenBucket', () => {
  let storage: MemoryAdapter
  let tokenBucket: TokenBucket

  beforeEach(() => {
    storage = new MemoryAdapter()
    tokenBucket = new TokenBucket(storage)
  })

  afterEach(async () => {
    await storage.clear()
  })

  describe('Basic Operations', () => {
    it('should allow requests when tokens are available', async () => {
      const result = await tokenBucket.check({
        key: 'test-key',
        capacity: 10,
        refillRate: 1,
      })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeGreaterThanOrEqual(0)
      expect(result.limit).toBe(10)
    })

    it('should consume tokens on each request', async () => {
      const config = {
        key: 'test-key',
        capacity: 5,
        refillRate: 1,
      }

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const result = await tokenBucket.check(config)
        expect(result.allowed).toBe(true)
      }

      // 6th request should be denied
      const result = await tokenBucket.check(config)
      expect(result.allowed).toBe(false)
    })

    it('should refill tokens over time', async () => {
      const config = {
        key: 'test-key',
        capacity: 5,
        refillRate: 10, // 10 tokens per second
      }

      // Consume all tokens
      for (let i = 0; i < 5; i++) {
        await tokenBucket.check(config)
      }

      // Wait for refill
      await new Promise(resolve => setTimeout(resolve, 200))

      // Should have new tokens
      const result = await tokenBucket.check(config)
      expect(result.allowed).toBe(true)
    })

    it('should respect capacity limit', async () => {
      const config = {
        key: 'test-key',
        capacity: 10,
        refillRate: 100,
      }

      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await tokenBucket.check(config)
      }

      // Wait for refill
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should not exceed capacity
      const result = await tokenBucket.check(config)
      expect(result.remaining).toBeLessThanOrEqual(10)
    })
  })

  describe('Burst Handling', () => {
    it('should allow burst traffic up to capacity', async () => {
      const config = {
        key: 'test-key',
        capacity: 100,
        refillRate: 1,
      }

      // Allow burst of 100 requests
      for (let i = 0; i < 100; i++) {
        const result = await tokenBucket.check(config)
        expect(result.allowed).toBe(true)
      }

      // 101st request should be denied
      const result = await tokenBucket.check(config)
      expect(result.allowed).toBe(false)
    })

    it('should handle burst with different refill rates', async () => {
      const config = {
        key: 'test-key',
        capacity: 50,
        refillRate: 5,
      }

      // Consume all tokens
      for (let i = 0; i < 50; i++) {
        await tokenBucket.check(config)
      }

      // Wait for 1 second (should get 5 tokens)
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Should allow 5 more requests
      for (let i = 0; i < 5; i++) {
        const result = await tokenBucket.check(config)
        expect(result.allowed).toBe(true)
      }

      // Next request should be denied
      const result = await tokenBucket.check(config)
      expect(result.allowed).toBe(false)
    })
  })

  describe('Status and Reset', () => {
    it('should return correct status', async () => {
      const config = {
        key: 'test-key',
        capacity: 10,
        refillRate: 1,
      }

      await tokenBucket.check(config)
      await tokenBucket.check(config)

      const status = await tokenBucket.getState(config.key)
      expect(status).toBeDefined()
      expect(status!.tokens).toBeLessThan(10)
      expect(status!.capacity).toBe(10)
    })

    it('should reset bucket', async () => {
      const config = {
        key: 'test-key',
        capacity: 10,
        refillRate: 1,
      }

      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await tokenBucket.check(config)
      }

      // Reset
      await tokenBucket.reset(config.key, config.capacity)

      // Should allow requests again
      const result = await tokenBucket.check(config)
      expect(result.allowed).toBe(true)
    })
  })

  describe('Multiple Keys', () => {
    it('should handle multiple independent buckets', async () => {
      const config1 = { key: 'user-1', capacity: 5, refillRate: 1 }
      const config2 = { key: 'user-2', capacity: 5, refillRate: 1 }

      // Consume all tokens for user-1
      for (let i = 0; i < 5; i++) {
        await tokenBucket.check(config1)
      }

      // user-2 should still have tokens
      const result = await tokenBucket.check(config2)
      expect(result.allowed).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      const mockStorage = {
        get: vi.fn().mockRejectedValue(new Error('Storage error')),
        set: vi.fn().mockRejectedValue(new Error('Storage error')),
        del: vi.fn(),
        eval: vi.fn().mockRejectedValue(new Error('Storage error')),
        clear: vi.fn(),
      } as any

      const errorBucket = new TokenBucket(mockStorage)

      await expect(
        errorBucket.check({ key: 'test', capacity: 10, refillRate: 1 })
      ).rejects.toThrow()
    })
  })
})

describe('MemoryTokenBucket', () => {
  let tokenBucket: MemoryTokenBucket

  beforeEach(() => {
    tokenBucket = new MemoryTokenBucket()
  })

  it('should work without storage backend', async () => {
    const result = await tokenBucket.check({
      key: 'test-key',
      capacity: 10,
      refillRate: 1,
    })

    expect(result.allowed).toBe(true)
  })

  it('should handle multiple keys in memory', async () => {
    const config1 = { key: 'key-1', capacity: 5, refillRate: 1 }
    const config2 = { key: 'key-2', capacity: 5, refillRate: 1 }

    // Consume all tokens for key-1
    for (let i = 0; i < 5; i++) {
      await tokenBucket.check(config1)
    }

    // key-2 should still have tokens
    const result = await tokenBucket.check(config2)
    expect(result.allowed).toBe(true)
  })

  it('should reset bucket', async () => {
    const config = { key: 'test-key', capacity: 10, refillRate: 1 }

    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      await tokenBucket.check(config)
    }

    // Reset
    await tokenBucket.reset(config.key, config.capacity)

    // Should allow requests again
    const result = await tokenBucket.check(config)
    expect(result.allowed).toBe(true)
  })
})