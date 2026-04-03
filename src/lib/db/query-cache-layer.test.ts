/**
 * Database Query Cache Layer - Tests
 *
 * Comprehensive tests for the query cache layer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { QueryCacheManager, QueryCacheKeys, getQueryCache } from './query-cache-layer'
import { getQueryCacheConfig, CACHE_INVALIDATION_RULES, TTL_PRESETS } from './query-cache-config'

// Mock Redis client
vi.mock('@/lib/redis/client', () => ({
  getRedisClient: vi.fn(() => null),
  isRedisAvailable: vi.fn(() => Promise.resolve(false)),
}))

describe('QueryCacheManager', () => {
  let cache: QueryCacheManager

  beforeEach(() => {
    cache = new QueryCacheManager({
      l1MaxSize: 100,
      l1DefaultTTL: 1000,
      l1MaxMemoryMB: 10,
      l2Enabled: false, // Disable Redis for tests
      enableMonitoring: false,
    })
  })

  afterEach(async () => {
    await cache.clear()
    cache.stopMonitoring()
  })

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      const key = 'test:key'
      const value = { data: 'test' }

      await cache.set(key, value)
      const result = await cache.get<typeof value>(key)

      expect(result).toEqual(value)
    })

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non:existent')
      expect(result).toBeNull()
    })

    it('should delete a cached value', async () => {
      const key = 'test:delete'
      const value = { data: 'test' }

      await cache.set(key, value)
      expect(await cache.get(key)).toEqual(value)

      await cache.delete(key)
      expect(await cache.get(key)).toBeNull()
    })

    it('should clear all cached values', async () => {
      await cache.set('key1', { data: '1' })
      await cache.set('key2', { data: '2' })
      await cache.set('key3', { data: '3' })

      await cache.clear()

      expect(await cache.get('key1')).toBeNull()
      expect(await cache.get('key2')).toBeNull()
      expect(await cache.get('key3')).toBeNull()
    })
  })

  describe('getOrSet Pattern', () => {
    it('should execute query and cache result on first call', async () => {
      const key = 'test:getorset'
      const value = { data: 'test' }
      let callCount = 0

      const queryFn = vi.fn(async () => {
        callCount++
        return value
      })

      const result = await cache.getOrSet(key, queryFn)

      expect(result).toEqual(value)
      expect(queryFn).toHaveBeenCalledTimes(1)
    })

    it('should return cached result on subsequent calls', async () => {
      const key = 'test:getorset:cached'
      const value = { data: 'test' }

      const queryFn = vi.fn(async () => value)

      // First call
      await cache.getOrSet(key, queryFn)
      expect(queryFn).toHaveBeenCalledTimes(1)

      // Second call - should use cache
      await cache.getOrSet(key, queryFn)
      expect(queryFn).toHaveBeenCalledTimes(1) // Still 1

      // Third call - should use cache
      const result = await cache.getOrSet(key, queryFn)
      expect(result).toEqual(value)
      expect(queryFn).toHaveBeenCalledTimes(1) // Still 1
    })

    it('should use custom TTL', async () => {
      const key = 'test:custom:ttl'
      const value = { data: 'test' }

      await cache.getOrSet(key, async () => value, 500)

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 600))

      const result = await cache.get(key)
      expect(result).toBeNull()
    })
  })

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      // Miss
      await cache.get('miss:key')

      // Set and hit
      await cache.set('hit:key', { data: 'test' })
      await cache.get('hit:key')
      await cache.get('hit:key')

      const stats = cache.getStats()

      expect(stats.l1.misses).toBe(1)
      expect(stats.l1.hits).toBe(2)
      expect(stats.l1.hitRate).toBeCloseTo(2 / 3, 2)
    })

    it('should track overall statistics', async () => {
      await cache.set('key1', { data: '1' })
      await cache.set('key2', { data: '2' })

      await cache.get('key1') // Hit
      await cache.get('key2') // Hit
      await cache.get('key3') // Miss

      const stats = cache.getStats()

      expect(stats.overall.hits).toBe(2)
      expect(stats.overall.misses).toBe(1)
      expect(stats.overall.hitRate).toBeCloseTo(2 / 3, 2)
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate cache by pattern', async () => {
      // Set up invalidation rules
      cache.addInvalidationRule({
        pattern: 'agent:*',
        tables: ['agents'],
      })

      // Set some cached values
      await cache.set('agent:1', { id: 1, name: 'Agent 1' })
      await cache.set('agent:2', { id: 2, name: 'Agent 2' })
      await cache.set('workflow:1', { id: 1, name: 'Workflow 1' })

      // Invalidate by table
      const invalidated = await cache.invalidateByTable('agents')

      expect(invalidated).toBe(2)
      expect(await cache.get('agent:1')).toBeNull()
      expect(await cache.get('agent:2')).toBeNull()
      expect(await cache.get('workflow:1')).not.toBeNull()
    })
  })

  describe('Cache Warmup', () => {
    it('should warm up cache with provided queries', async () => {
      const warmupConfig = {
        queries: [
          {
            key: 'warmup:1',
            query: async () => ({ data: 'warmup 1' }),
            priority: 10,
          },
          {
            key: 'warmup:2',
            query: async () => ({ data: 'warmup 2' }),
            priority: 5,
          },
        ],
        batchSize: 10,
        concurrency: 2,
      }

      await cache.warmup(warmupConfig)

      expect(await cache.get('warmup:1')).toEqual({ data: 'warmup 1' })
      expect(await cache.get('warmup:2')).toEqual({ data: 'warmup 2' })
    })

    it('should handle warmup errors gracefully', async () => {
      const warmupConfig = {
        queries: [
          {
            key: 'warmup:error',
            query: async () => {
              throw new Error('Query failed')
            },
            priority: 10,
          },
          {
            key: 'warmup:success',
            query: async () => ({ data: 'success' }),
            priority: 5,
          },
        ],
        batchSize: 10,
        concurrency: 2,
      }

      // Should not throw
      await expect(cache.warmup(warmupConfig)).resolves.not.toThrow()

      // Successful query should be cached
      expect(await cache.get('warmup:success')).toEqual({ data: 'success' })

      // Failed query should not be cached
      expect(await cache.get('warmup:error')).toBeNull()
    })
  })

  describe('TTL and Expiration', () => {
    it('should expire entries after TTL', async () => {
      await cache.set('expire:key', { data: 'test' }, 100)

      expect(await cache.get('expire:key')).not.toBeNull()

      await new Promise(resolve => setTimeout(resolve, 150))

      expect(await cache.get('expire:key')).toBeNull()
    })

    it('should clean expired entries', async () => {
      await cache.set('expire:1', { data: '1' }, 50)
      await cache.set('expire:2', { data: '2' }, 50)
      await cache.set('persist:1', { data: '3' }, 5000)

      await new Promise(resolve => setTimeout(resolve, 100))

      const cleaned = await cache.cleanExpired()

      expect(cleaned).toBe(2)
      expect(await cache.get('persist:1')).not.toBeNull()
    })
  })

  describe('Memory Management', () => {
    it('should evict LRU entries when max size is reached', async () => {
      const smallCache = new QueryCacheManager({
        l1MaxSize: 3,
        l1DefaultTTL: 60000,
        l1MaxMemoryMB: 1,
        l2Enabled: false,
        enableMonitoring: false,
      })

      await smallCache.set('key1', { data: '1' })
      await smallCache.set('key2', { data: '2' })
      await smallCache.set('key3', { data: '3' })
      await smallCache.set('key4', { data: '4' }) // Should evict key1

      expect(await smallCache.get('key1')).toBeNull()
      expect(await smallCache.get('key2')).not.toBeNull()
      expect(await smallCache.get('key3')).not.toBeNull()
      expect(await smallCache.get('key4')).not.toBeNull()

      await smallCache.clear()
      smallCache.stopMonitoring()
    })
  })
})

describe('QueryCacheKeys', () => {
  it('should generate consistent cache keys', () => {
    expect(QueryCacheKeys.agent('123')).toBe('agent:123')
    expect(QueryCacheKeys.wallet('123')).toBe('wallet:123')
    expect(QueryCacheKeys.approval('123')).toBe('approval:123')
  })

  it('should generate cache keys with filters', () => {
    const key = QueryCacheKeys.agentsList({ status: 'active', limit: 10 })
    expect(key).toContain('agents:list:')
    expect(key).toContain('active')
    expect(key).toContain('10')
  })

  it('should generate custom cache keys', () => {
    const key = QueryCacheKeys.custom('search', { query: 'test', page: 1 })
    expect(key).toContain('search:')
    expect(key).toContain('test')
    expect(key).toContain('1')
  })
})

describe('Cache Configuration', () => {
  it('should provide default configuration', () => {
    const config = getQueryCacheConfig()

    expect(config.l1MaxSize).toBeGreaterThan(0)
    expect(config.l1DefaultTTL).toBeGreaterThan(0)
    expect(config.l1MaxMemoryMB).toBeGreaterThan(0)
  })

  it('should include invalidation rules', () => {
    expect(CACHE_INVALIDATION_RULES.length).toBeGreaterThan(0)
    expect(CACHE_INVALIDATION_RULES[0].pattern).toBeDefined()
    expect(CACHE_INVALIDATION_RULES[0].tables).toBeDefined()
  })

  it('should provide TTL presets', () => {
    expect(TTL_PRESETS.SHORT).toBe(60 * 1000)
    expect(TTL_PRESETS.MEDIUM).toBe(5 * 60 * 1000)
    expect(TTL_PRESETS.LONG).toBe(15 * 60 * 1000)
  })
})

describe('Singleton Instance', () => {
  it('should return the same instance', () => {
    const instance1 = getQueryCache()
    const instance2 = getQueryCache()

    expect(instance1).toBe(instance2)
  })
})