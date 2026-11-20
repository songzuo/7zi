/**
 * Multi-Layer Middleware Tests
 * 多层中间件测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MultiLayerMiddleware, DEFAULT_CONFIG, extractContext } from '../middleware/multi-layer'
import { MemoryAdapter } from '../storage/memory-adapter'
import type { RateLimitContext, MultiLayerRateLimitConfig } from '../types'

describe('MultiLayerMiddleware', () => {
  let storage: MemoryAdapter
  let middleware: MultiLayerMiddleware

  beforeEach(() => {
    storage = new MemoryAdapter()
    middleware = new MultiLayerMiddleware(storage, DEFAULT_CONFIG)
  })

  afterEach(async () => {
    await storage.clear()
  })

  describe('Context Extraction', () => {
    it('should extract IP from request', () => {
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {},
      } as any

      const context = extractContext(mockRequest)
      expect(context.ip).toBe('192.168.1.1')
    })

    it('should extract API key from headers', () => {
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {
          'x-api-key': 'test-api-key-123',
        },
      } as any

      const context = extractContext(mockRequest)
      expect(context.apiKey).toBe('test-api-key-123')
    })

    it('should extract user ID from headers', () => {
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {
          'x-user-id': 'user-123',
        },
      } as any

      const context = extractContext(mockRequest)
      expect(context.userId).toBe('user-123')
    })

    it('should handle missing headers gracefully', () => {
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {},
      } as any

      const context = extractContext(mockRequest)
      expect(context.apiKey).toBeNull()
      expect(context.userId).toBeNull()
    })
  })

  describe('Layer Execution', () => {
    it('should execute all enabled layers', async () => {
      const config: MultiLayerRateLimitConfig = {
        global: { enabled: true, algorithm: 'token-bucket', rate: 1000, burst: 2000 },
        ip: { enabled: true, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 100 },
        apiKey: { enabled: true, algorithm: 'token-bucket', defaultTier: 'free', tiers: {} },
        user: { enabled: true, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 200 },
      }

      const mw = new MultiLayerMiddleware(storage, config)

      const context: RateLimitContext = { ip: '192.168.1.1', apiKey: 'test-key', userId: 'user-123', path: '/', method: 'GET', headers: {}, timestamp: Date.now() }

      const result = await mw.check(context)

      expect(result.allowed).toBe(true)
      expect(result.results).toHaveLength(4)
    })

    it('should skip disabled layers', async () => {
      const config: MultiLayerRateLimitConfig = {
        global: { enabled: true, algorithm: 'token-bucket', rate: 1000, burst: 2000 },
        ip: { enabled: false, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 100 },
        apiKey: { enabled: false, algorithm: 'token-bucket', defaultTier: 'free', tiers: {} },
        user: { enabled: false, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 200 },
      }

      const mw = new MultiLayerMiddleware(storage, config)

      const context: RateLimitContext = { ip: '192.168.1.1', path: '/', method: 'GET', headers: {}, timestamp: Date.now() }

      const result = await mw.check(context)

      expect(result.allowed).toBe(true)
      expect(result.results).toHaveLength(1)
    })
  })

  describe('Rate Limiting', () => {
    it('should block requests when IP limit exceeded', async () => {
      const config: MultiLayerRateLimitConfig = {
        global: { enabled: false, algorithm: 'token-bucket', rate: 1000, burst: 2000 },
        ip: { enabled: true, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 5 },
        apiKey: { enabled: false, algorithm: 'token-bucket', defaultTier: 'free', tiers: {} },

        user: { enabled: false, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 200 },

      }

      const mw = new MultiLayerMiddleware(storage, config)

      const context: RateLimitContext = { ip: '192.168.1.1', path: '/', method: 'GET', headers: {}, timestamp: Date.now() }

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const result = await mw.check(context)
        expect(result.allowed).toBe(true)
      }

      // 6th request should be blocked
      const result = await mw.check(context)
      expect(result.allowed).toBe(false)
      expect(result.limitedBy?.layer).toBe('ip')
    })

    it('should block requests when user limit exceeded', async () => {
      const config: MultiLayerRateLimitConfig = {
        global: { enabled: false, algorithm: 'token-bucket', rate: 1000, burst: 2000 },
        ip: { enabled: false, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 100 },

        apiKey: { enabled: false, algorithm: 'token-bucket', defaultTier: 'free', tiers: {} },

        user: { enabled: true, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 5 },
      }

      const mw = new MultiLayerMiddleware(storage, config)

      const context: RateLimitContext = { ip: '127.0.0.1', userId: 'user-123', path: '/', method: 'GET', headers: {}, timestamp: Date.now() }

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const result = await mw.check(context)
        expect(result.allowed).toBe(true)
      }

      // 6th request should be blocked
      const result = await mw.check(context)
      expect(result.allowed).toBe(false)
      expect(result.limitedBy?.layer).toBe('user')
    })

    it('should block requests when API key limit exceeded', async () => {
      const config: MultiLayerRateLimitConfig = {
        global: { enabled: false, algorithm: 'token-bucket', rate: 1000, burst: 2000 },
        ip: { enabled: false, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 100 },

        apiKey: {
          enabled: true,
          algorithm: 'token-bucket',
          defaultTier: 'free',
          tiers: {
            free: { name: 'free', rate: 2, burst: 10, dailyLimit: 1000 },
          },
        },
        user: { enabled: false, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 200 },

      }

      const mw = new MultiLayerMiddleware(storage, config)

      const context: RateLimitContext = { ip: '127.0.0.1', apiKey: 'test-key', path: '/', method: 'GET', headers: {}, timestamp: Date.now() }

      // Make 10 requests (burst capacity)
      for (let i = 0; i < 10; i++) {
        const result = await mw.check(context)
        expect(result.allowed).toBe(true)
      }

      // 11th request should be blocked
      const result = await mw.check(context)
      expect(result.allowed).toBe(false)
      expect(result.limitedBy?.layer).toBe('api-key')
    })
  })

  describe('Whitelist and Blacklist', () => {
    it('should allow whitelisted IPs', async () => {
      const config: MultiLayerRateLimitConfig = {
        global: { enabled: false, algorithm: 'token-bucket', rate: 1000, burst: 2000 },
        ip: {
          enabled: true,
          algorithm: 'sliding-window',
          windowMs: 60000,
          maxRequests: 5,
          whitelist: ['192.168.1.1'],
        },
        apiKey: { enabled: false, algorithm: 'token-bucket', defaultTier: 'free', tiers: {} },

        user: { enabled: false, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 200 },

      }

      const mw = new MultiLayerMiddleware(storage, config)

      const context: RateLimitContext = { ip: '192.168.1.1', path: '/', method: 'GET', headers: {}, timestamp: Date.now() }

      // Make more than 5 requests
      for (let i = 0; i < 10; i++) {
        const result = await mw.check(context)
        expect(result.allowed).toBe(true)
      }
    })

    it('should block blacklisted IPs', async () => {
      const config: MultiLayerRateLimitConfig = {
        global: { enabled: false, algorithm: 'token-bucket', rate: 1000, burst: 2000 },
        ip: {
          enabled: true,
          algorithm: 'sliding-window',
          windowMs: 60000,
          maxRequests: 100,
          blacklist: ['192.168.1.1'],
        },
        apiKey: { enabled: false, algorithm: 'token-bucket', defaultTier: 'free', tiers: {} },

        user: { enabled: false, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 200 },

      }

      const mw = new MultiLayerMiddleware(storage, config)

      const context: RateLimitContext = { ip: '192.168.1.1', path: '/', method: 'GET', headers: {}, timestamp: Date.now() }

      const result = await mw.check(context)
      expect(result.allowed).toBe(false)
      expect(result.limitedBy?.layer).toBe('ip')
    })
  })

  describe('Metrics Collection', () => {
    it('should record metrics for each check', async () => {
      const metricsCollector = {
        recordCheck: vi.fn(),
        recordError: vi.fn(),
      }

      const mw = new MultiLayerMiddleware(storage, DEFAULT_CONFIG, metricsCollector,
      )

      const context: RateLimitContext = { ip: '192.168.1.1', path: '/', method: 'GET', headers: {}, timestamp: Date.now() }

      await mw.check(context)

      expect(metricsCollector.recordCheck).toHaveBeenCalled()
    })

    it('should record errors', async () => {
      const metricsCollector = {
        recordCheck: vi.fn(),
        recordError: vi.fn(),
      }

      const mw = new MultiLayerMiddleware(storage, DEFAULT_CONFIG, metricsCollector,
      )

      const context: RateLimitContext = { ip: '192.168.1.1', path: '/', method: 'GET', headers: {}, timestamp: Date.now() }

      // Force an error by using invalid config
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        ip: { ...DEFAULT_CONFIG.ip, algorithm: 'invalid' as any },
      }

      const invalidMw = new MultiLayerMiddleware(storage, invalidConfig, metricsCollector,
      )

      await invalidMw.check(context)

      expect(metricsCollector.recordError).toHaveBeenCalled()
    })
  })

  describe('Headers Generation', () => {
    it('should generate standard rate limit headers', async () => {
      const context: RateLimitContext = { ip: '192.168.1.1', path: '/', method: 'GET', headers: {}, timestamp: Date.now() }

      const result = await middleware.check(context)

      expect(result.headers).toBeDefined()
      expect(result.headers['X-RateLimit-Limit']).toBeDefined()
      expect(result.headers['X-RateLimit-Remaining']).toBeDefined()
      expect(result.headers['X-RateLimit-Reset']).toBeDefined()
    })

    it('should include Retry-After header when blocked', async () => {
      const config: MultiLayerRateLimitConfig = {
        global: { enabled: false, algorithm: 'token-bucket', rate: 1000, burst: 2000 },
        ip: { enabled: true, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 5 },
        apiKey: { enabled: false, algorithm: 'token-bucket', defaultTier: 'free', tiers: {} },

        user: { enabled: false, algorithm: 'sliding-window', windowMs: 60000, maxRequests: 200 },

      }

      const mw = new MultiLayerMiddleware(storage, config)

      const context: RateLimitContext = { ip: '192.168.1.1', path: '/', method: 'GET', headers: {}, timestamp: Date.now() }

      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        await mw.check(context)
      }

      // Get blocked result
      const result = await mw.check(context)

      expect(result.allowed).toBe(false)
      expect(result.headers['Retry-After']).toBeDefined()
    })
  })
})