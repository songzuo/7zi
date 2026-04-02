/**
 * Rate Limiter Tests
 *
 * 速率限制器单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { RateLimiter, RateLimitResult } from '../limiter'
import { MemoryRateLimitStorage } from '../memory-storage'
import { RateLimitConfig } from '../config'

describe('RateLimiter', () => {
  let storage: MemoryRateLimitStorage
  let limiter: RateLimiter
  let config: RateLimitConfig

  beforeEach(() => {
    config = {
      windowMs: 60000, // 1 分钟
      maxRequests: 5,
    }
    storage = new MemoryRateLimitStorage(false)
    limiter = new RateLimiter(storage, config)
  })

  afterEach(async () => {
    await storage.close()
  })

  describe('check', () => {
    it('should allow first request', async () => {
      const result = await limiter.check('test-key')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4) // 5 - 1
      expect(result.limit).toBe(5)
      expect(result.exceeded).toBe(false)
    })

    it('should track request count correctly', async () => {
      const key = 'test-key'

      // 前 5 个请求应该成功
      for (let i = 1; i <= 5; i++) {
        const result = await limiter.check(key)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(5 - i)
      }

      // 第 6 个请求应该被拒绝
      const exceededResult = await limiter.check(key)
      expect(exceededResult.allowed).toBe(false)
      expect(exceededResult.remaining).toBe(0)
      expect(exceededResult.exceeded).toBe(true)
    })

    it('should reset after window expires', async () => {
      const config: RateLimitConfig = {
        windowMs: 100, // 100ms 窗口
        maxRequests: 2,
      }
      const shortLimiter = new RateLimiter(storage, config)

      // 使用配额
      await shortLimiter.check('test-key')
      await shortLimiter.check('test-key')

      // 第 3 个请求应该被拒绝
      const exceededResult = await shortLimiter.check('test-key')
      expect(exceededResult.allowed).toBe(false)

      // 等待窗口过期
      await new Promise(resolve => setTimeout(resolve, 150))

      // 应该再次允许请求
      const newResult = await shortLimiter.check('test-key')
      expect(newResult.allowed).toBe(true)
      // expect(newResult.count).toBe(1); // count 属性不存在，改用 limit - remaining
      expect(newResult.limit - newResult.remaining).toBe(1)
    })

    it('should handle multiple keys independently', async () => {
      const result1a = await limiter.check('key-1')
      const result2a = await limiter.check('key-2')

      expect(result1a.allowed).toBe(true)
      expect(result2a.allowed).toBe(true)

      // 耗尽 key-1 的配额
      await limiter.check('key-1')
      await limiter.check('key-1')
      await limiter.check('key-1')
      await limiter.check('key-1')
      await limiter.check('key-1')

      // key-1 应该被限制
      const result1b = await limiter.check('key-1')
      expect(result1b.allowed).toBe(false)

      // key-2 应该仍然可用
      const result2b = await limiter.check('key-2')
      expect(result2b.allowed).toBe(true)
    })

    it('should return correct reset time', async () => {
      const result = await limiter.check('test-key')

      const now = Date.now()
      expect(result.resetTime).toBeGreaterThan(now)
      expect(result.resetAfter).toBeGreaterThan(0)
      expect(result.resetAfter).toBeLessThanOrEqual(60) // 最多 60 秒
    })
  })

  describe('peek', () => {
    it('should return current state without incrementing', async () => {
      const key = 'test-key'

      // 执行两次检查
      await limiter.check(key)
      await limiter.check(key)

      // peek 应该返回 2 而不增加计数
      const peekResult = await limiter.peek(key)
      // count = limit - remaining
      expect(peekResult.limit - peekResult.remaining).toBe(2)
      expect(peekResult.remaining).toBe(3)

      // 再次检查确认 peek 没有增加计数
      const checkResult = await limiter.check(key)
      expect(checkResult.limit - checkResult.remaining).toBe(3)
    })

    it('should return null for non-existent key', async () => {
      const peekResult = await limiter.peek('non-existent')

      expect(peekResult.allowed).toBe(true)
      expect(peekResult.remaining).toBe(5)
      // count = limit - remaining = 5 - 5 = 0
      expect(peekResult.limit - peekResult.remaining).toBe(0)
    })
  })

  describe('reset', () => {
    it('should reset limit for a key', async () => {
      const key = 'test-key'

      // 耗尽配额
      for (let i = 0; i < 5; i++) {
        await limiter.check(key)
      }

      await limiter.reset(key)

      // 应该允许新请求
      const result = await limiter.check(key)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4) // 5 - 1
    })
  })

  describe('getConfig', () => {
    it('should return the configuration', () => {
      const returnedConfig = limiter.getConfig()

      expect(returnedConfig.windowMs).toBe(60000)
      expect(returnedConfig.maxRequests).toBe(5)
    })
  })

  describe('updateConfig', () => {
    it('should update the configuration', async () => {
      limiter.updateConfig({ maxRequests: 10 })

      const result = await limiter.check('test-key')

      expect(result.limit).toBe(10)
      expect(result.remaining).toBe(9)
    })

    it('should preserve other config values when updating', async () => {
      limiter.updateConfig({ maxRequests: 10 })

      const config = limiter.getConfig()

      expect(config.windowMs).toBe(60000) // 保持不变
      expect(config.maxRequests).toBe(10) // 更新
    })
  })
})
