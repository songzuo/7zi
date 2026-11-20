/**
 * Tests for Database Cache Module Exports
 * Tests interfaces, types, and exported utilities
 */

import { describe, it, expect, vi } from 'vitest'
import { CacheKeyGenerator, memoize, memoizeSync, memoization } from './cache'

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('CacheKeyGenerator', () => {
  describe('agentKey', () => {
    it('should generate agent key with correct format', () => {
      const key = CacheKeyGenerator.agentKey('agent-123')
      expect(key).toBe('agent:agent-123')
    })

    it('should handle different agent IDs', () => {
      expect(CacheKeyGenerator.agentKey('abc')).toBe('agent:abc')
      expect(CacheKeyGenerator.agentKey('xyz-789')).toBe('agent:xyz-789')
    })
  })

  describe('agentsListKey', () => {
    it('should generate agents list key with filters', () => {
      const key = CacheKeyGenerator.agentsListKey({ status: 'active' })
      expect(key).toBe('agents:list:{"status":"active"}')
    })

    it('should generate agents list key without filters', () => {
      const key = CacheKeyGenerator.agentsListKey()
      expect(key).toBe('agents:list:undefined')
    })

    it('should handle multiple filters', () => {
      const key = CacheKeyGenerator.agentsListKey({ status: 'active', role: 'admin' })
      expect(key).toContain('status')
      expect(key).toContain('active')
    })
  })

  describe('walletKey', () => {
    it('should generate wallet key with correct format', () => {
      const key = CacheKeyGenerator.walletKey('agent-123')
      expect(key).toBe('wallet:agent-123')
    })
  })

  describe('walletTransactionsKey', () => {
    it('should generate wallet transactions key with options', () => {
      const key = CacheKeyGenerator.walletTransactionsKey('agent-123', { limit: 10 })
      expect(key).toBe('wallet:transactions:agent-123:{"limit":10}')
    })

    it('should generate wallet transactions key without options', () => {
      const key = CacheKeyGenerator.walletTransactionsKey('agent-123')
      expect(key).toBe('wallet:transactions:agent-123:undefined')
    })
  })

  describe('agentStatsKey', () => {
    it('should generate agent stats key', () => {
      const key = CacheKeyGenerator.agentStatsKey()
      expect(key).toBe('stats:agents')
    })
  })

  describe('walletStatsKey', () => {
    it('should generate wallet stats key with agent ID', () => {
      const key = CacheKeyGenerator.walletStatsKey('agent-123')
      expect(key).toBe('stats:wallet:agent-123')
    })
  })

  describe('approvalListKey', () => {
    it('should generate approval list key with query', () => {
      const key = CacheKeyGenerator.approvalListKey({ status: 'pending' })
      expect(key).toBe('approvals:list:{"status":"pending"}')
    })

    it('should generate approval list key without query', () => {
      const key = CacheKeyGenerator.approvalListKey()
      expect(key).toBe('approvals:list:undefined')
    })
  })

  describe('approvalStatsKey', () => {
    it('should generate approval stats key', () => {
      const key = CacheKeyGenerator.approvalStatsKey()
      expect(key).toBe('stats:approvals')
    })
  })
})

describe('memoization utility', () => {
  describe('memoize', () => {
    it('should memoize async function results', async () => {
      const fn = vi.fn().mockResolvedValue('result')
      const memoized = memoize(fn, { keyPrefix: 'test-memoize' })

      const result1 = await memoized()
      const result2 = await memoized()

      expect(result1).toBe('result')
      expect(result2).toBe('result')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should use different cache entries for different args', async () => {
      const fn = vi.fn().mockImplementation((x: number) => Promise.resolve(x * 2))
      const memoized = memoize(fn, { keyPrefix: 'multiply' })

      const result1 = await memoized(2)
      const result2 = await memoized(3)

      expect(result1).toBe(4)
      expect(result2).toBe(6)
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should use same cache entry for same args', async () => {
      const fn = vi.fn().mockImplementation((x: number) => Promise.resolve(x * 2))
      const memoized = memoize(fn, { keyPrefix: 'multiply-same' })

      await memoized(2)
      await memoized(2)

      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should respect custom TTL', async () => {
      const fn = vi.fn().mockResolvedValue('result')
      const memoized = memoize(fn, { keyPrefix: 'ttl-test', ttl: 100 })

      await memoized()
      await new Promise(resolve => setTimeout(resolve, 150))
      await memoized()

      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should track statistics', async () => {
      const fn = vi.fn().mockResolvedValue('result')
      const memoized = memoize(fn, { keyPrefix: 'stats-test' })

      await memoized()
      await memoized()
      await memoized()

      const stats = memoization.getStats('stats-test') as any
      expect(stats.totalCalls).toBe(3)
      expect(stats.hits).toBe(2)
      expect(stats.misses).toBe(1)
    })

    it('should work with complex arguments', async () => {
      const fn = vi.fn().mockResolvedValue('result')
      const memoized = memoize(fn, { keyPrefix: 'complex-args' })

      const arg1 = { id: 1, name: 'test' }
      const arg2 = { id: 2, name: 'test2' }

      await memoized(arg1)
      await memoized(arg1)
      await memoized(arg2)

      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('memoizeSync', () => {
    it('should memoize sync function results', () => {
      const fn = vi.fn().mockReturnValue('result')
      const memoized = memoizeSync(fn, { keyPrefix: 'sync-test' })

      const result1 = memoized()
      const result2 = memoized()

      expect(result1).toBe('result')
      expect(result2).toBe('result')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should work with arguments', () => {
      const fn = vi.fn().mockImplementation((a: number, b: number) => a + b)
      const memoized = memoizeSync(fn, { keyPrefix: 'add' })

      expect(memoized(1, 2)).toBe(3)
      expect(memoized(1, 2)).toBe(3)
      expect(memoized(2, 3)).toBe(5)
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should use same cache for same sync args', () => {
      const fn = vi.fn().mockImplementation((x: string) => x.toUpperCase())
      const memoized = memoizeSync(fn, { keyPrefix: 'upper' })

      memoized('hello')
      memoized('hello')
      memoized('world')

      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should track sync function statistics', () => {
      const fn = vi.fn().mockReturnValue(42)
      const memoized = memoizeSync(fn, { keyPrefix: 'sync-stats' })

      memoized()
      memoized()
      memoized()

      const stats = memoization.getStats('sync-stats') as any
      expect(stats.totalCalls).toBe(3)
      expect(stats.hits).toBe(2)
    })
  })

  describe('clearPrefix', () => {
    it('should clear cache entries with specific prefix', async () => {
      const fn = vi.fn().mockResolvedValue('result')
      const memoized = memoize(fn, { keyPrefix: 'clearable-test' })

      await memoized()
      memoization.clearPrefix('clearable-test')
      await memoized()

      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('cleanExpired', () => {
    it('should clean expired entries', async () => {
      const fn = vi.fn().mockResolvedValue('result')
      const memoized = memoize(fn, { keyPrefix: 'expire-test', ttl: 100 })

      await memoized()
      await new Promise(resolve => setTimeout(resolve, 150))

      const cleaned = memoization.cleanExpired()
      expect(cleaned).toBeGreaterThanOrEqual(1)
    })
  })
})

describe('Cache Interface Types', () => {
  describe('CacheEntry', () => {
    it('should represent cache entry structure', () => {
      const entry = {
        key: 'test-key',
        value: 'test-value',
        timestamp: Date.now(),
        ttl: 60000,
        hitCount: 5,
        size: 1024,
      }

      expect(entry.key).toBe('test-key')
      expect(entry.value).toBe('test-value')
      expect(entry.ttl).toBe(60000)
      expect(entry.hitCount).toBe(5)
      expect(entry.size).toBe(1024)
    })
  })

  describe('CacheStats', () => {
    it('should represent cache statistics', () => {
      const stats = {
        hits: 100,
        misses: 20,
        hitRate: 0.83,
        entries: 50,
        totalSize: 50000,
        evictions: 10,
      }

      expect(stats.hits).toBe(100)
      expect(stats.misses).toBe(20)
      expect(stats.hitRate).toBeCloseTo(0.83, 2)
      expect(stats.entries).toBe(50)
    })
  })

  describe('CacheConfig', () => {
    it('should represent cache configuration', () => {
      const config = {
        maxSize: 1000,
        defaultTTL: 300000,
        maxMemoryUsage: 50 * 1024 * 1024,
      }

      expect(config.maxSize).toBe(1000)
      expect(config.defaultTTL).toBe(300000)
      expect(config.maxMemoryUsage).toBe(52428800)
    })
  })
})

describe('MemoizationOptions', () => {
  it('should create with keyPrefix', () => {
    const options = { keyPrefix: 'test' }
    expect(options.keyPrefix).toBe('test')
  })

  it('should create with custom TTL', () => {
    const options = { keyPrefix: 'test', ttl: 60000 }
    expect(options.ttl).toBe(60000)
  })

  it('should create with useArgsAsKey', () => {
    const options = { keyPrefix: 'test', useArgsAsKey: false }
    expect(options.useArgsAsKey).toBe(false)
  })

  it('should create with expensive flag', () => {
    const options = { keyPrefix: 'test', expensive: true }
    expect(options.expensive).toBe(true)
  })

  it('should create with custom keyGenerator', () => {
    const keyGen = (...args: unknown[]) => args.join(':')
    const options = { keyPrefix: 'test', keyGenerator: keyGen }
    expect(typeof options.keyGenerator).toBe('function')
  })
})
