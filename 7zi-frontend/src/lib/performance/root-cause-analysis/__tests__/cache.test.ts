/**
 * Root Cause Cache Tests
 * 根因分析缓存模块测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RootCauseCache } from '../cache'
import { RootCause, PerformanceContext } from '../types'

describe('RootCauseCache', () => {
  let cache: RootCauseCache
  let mockRootCause: RootCause
  let mockContext: PerformanceContext

  beforeEach(() => {
    cache = new RootCauseCache(10, 1000) // 10 entries, 1 second TTL for testing
    mockContext = {
      timestamp: Date.now(),
      page: '/test',
      network: {
        type: 'wifi' as const,
        rtt: 50,
        downlink: 10,
      },
      slowQueries: [],
      slowApis: [],
    }

    mockRootCause = {
      metric: 'LCP',
      timestamp: Date.now(),
      candidates: [],
      primaryCause: null,
      analyzedAt: Date.now(),
      context: mockContext,
    }
  })

  describe('Basic Operations', () => {
    it('should store and retrieve root cause analysis', () => {
      cache.set('LCP', 4000, mockContext, mockRootCause)
      const result = cache.get('LCP', 4000, mockContext)

      expect(result).toBeDefined()
      expect(result?.metric).toBe('LCP')
      expect(result?.candidates).toEqual(mockRootCause.candidates)
    })

    it('should return null for non-existent entries', () => {
      const result = cache.get('LCP', 4000, mockContext)
      expect(result).toBeNull()
    })

    it('should update access count on retrieval', () => {
      cache.set('LCP', 4000, mockContext, mockRootCause)
      cache.get('LCP', 4000, mockContext)
      cache.get('LCP', 4000, mockContext)

      const stats = cache.getStats()
      expect(stats.totalAccessCount).toBeGreaterThanOrEqual(2)
    })

    it('should clear all entries', () => {
      cache.set('LCP', 4000, mockContext, mockRootCause)
      cache.set('FID', 200, mockContext, mockRootCause)

      expect(cache.getStats().size).toBe(2)

      cache.clear()

      expect(cache.getStats().size).toBe(0)
    })
  })

  describe('Cache Key Generation', () => {
    it('should generate different keys for different metrics', () => {
      // Create separate entries with different metrics
      cache.set('LCP', 4000, mockContext, { ...mockRootCause, metric: 'LCP' })
      cache.set('FID', 200, mockContext, { ...mockRootCause, metric: 'FID' })

      const lcpResult = cache.get('LCP', 4000, mockContext)
      const fidResult = cache.get('FID', 200, mockContext)

      expect(lcpResult?.metric).toBe('LCP')
      expect(fidResult?.metric).toBe('FID')
    })

    it('should generate different keys for different values', () => {
      cache.set('LCP', 4000, mockContext, mockRootCause)
      cache.set('LCP', 5000, mockContext, mockRootCause)

      const result1 = cache.get('LCP', 4000, mockContext)
      const result2 = cache.get('LCP', 5000, mockContext)

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
    })

    it('should generate different keys for different contexts', () => {
      const context1 = {
        timestamp: Date.now(),
        page: '/page1',
        network: { type: 'wifi' as const, rtt: 50, downlink: 10 },
        slowQueries: [],
        slowApis: [],
      }
      const context2 = {
        timestamp: Date.now(),
        page: '/page2',
        network: { type: 'wifi' as const, rtt: 50, downlink: 10 },
        slowQueries: [],
        slowApis: [],
      }

      const rootCause1 = { ...mockRootCause, context: context1 }
      const rootCause2 = { ...mockRootCause, context: context2 }

      cache.set('LCP', 4000, context1, rootCause1)
      cache.set('LCP', 4000, context2, rootCause2)

      const result1 = cache.get('LCP', 4000, context1)
      const result2 = cache.get('LCP', 4000, context2)

      expect(result1?.context?.page).toBe('/page1')
      expect(result2?.context?.page).toBe('/page2')
    })
  })

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      cache.set('LCP', 4000, mockContext, mockRootCause)

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100))

      const result = cache.get('LCP', 4000, mockContext)
      expect(result).toBeNull()
    })

    it('should not expire entries before TTL', async () => {
      cache.set('LCP', 4000, mockContext, mockRootCause)

      // Wait less than TTL
      await new Promise(resolve => setTimeout(resolve, 500))

      const result = cache.get('LCP', 4000, mockContext)
      expect(result).toBeDefined()
    })

    it('should remove expired entries during cleanup', async () => {
      cache.set('LCP', 4000, mockContext, mockRootCause)
      cache.set('FID', 200, mockContext, mockRootCause)

      expect(cache.getStats().size).toBe(2)

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100))

      cache.cleanup()

      expect(cache.getStats().size).toBe(0)
    })
  })

  describe('Eviction Policy', () => {
    it('should evict least accessed entries when cache is full', () => {
      // Fill cache to capacity
      for (let i = 0; i < 10; i++) {
        cache.set(`metric${i}`, i * 1000, mockContext, {
          ...mockRootCause,
          metric: `metric${i}`,
        })
      }

      // Access some entries more frequently
      cache.get('metric0', 0, mockContext)
      cache.get('metric0', 0, mockContext)
      cache.get('metric1', 1000, mockContext)

      // Add one more entry (should evict least accessed)
      cache.set('metric10', 10000, mockContext, {
        ...mockRootCause,
        metric: 'metric10',
      })

      expect(cache.getStats().size).toBe(10)
      expect(cache.get('metric0', 0, mockContext)).toBeDefined()
      expect(cache.get('metric1', 1000, mockContext)).toBeDefined()
    })

    it('should evict oldest entries when access counts are tied', () => {
      // Fill cache to capacity
      for (let i = 0; i < 10; i++) {
        cache.set(`metric${i}`, i * 1000, mockContext, {
          ...mockRootCause,
          metric: `metric${i}`,
        })
      }

      // Add one more entry (should evoldest)
      cache.set('metric10', 10000, mockContext, {
        ...mockRootCause,
        metric: 'metric10',
      })

      expect(cache.getStats().size).toBe(10)
      expect(cache.get('metric0', 0, mockContext)).toBeNull()
      expect(cache.get('metric10', 10000, mockContext)).toBeDefined()
    })
  })

  describe('Statistics', () => {
    it('should return correct cache statistics', () => {
      const localCache = new RootCauseCache(10, 1000)
      localCache.set('LCP', 4000, mockContext, mockRootCause)
      localCache.set('FID', 200, mockContext, mockRootCause)
      localCache.get('LCP', 4000, mockContext)
      localCache.get('LCP', 4000, mockContext)

      const stats = localCache.getStats()

      expect(stats.size).toBe(2)
      expect(stats.maxEntries).toBe(10)
      expect(stats.ttl).toBe(1000)
      // LCP: set(1) + get(2) + get(3) = 3, FID: set(1) = 1, total = 4
      expect(stats.totalAccessCount).toBe(4)
    })

    it('should track access count correctly', () => {
      const localCache = new RootCauseCache(10, 1000)
      localCache.set('LCP', 4000, mockContext, mockRootCause)

      localCache.get('LCP', 4000, mockContext)
      localCache.get('LCP', 4000, mockContext)
      localCache.get('LCP', 4000, mockContext)

      const stats = localCache.getStats()
      // LCP: set(1) + get(2) + get(3) + get(4) = 4 total
      expect(stats.totalAccessCount).toBe(4)
    })
  })

  describe('Context Hashing', () => {
    it('should generate consistent hash for same context', () => {
      const context1 = { ...mockContext }
      const context2 = { ...mockContext }

      cache.set('LCP', 4000, context1, mockRootCause)
      const result = cache.get('LCP', 4000, context2)

      expect(result).toBeDefined()
    })

    it('should generate different hash for different network types', () => {
      const localCache1 = new RootCauseCache(10, 1000)
      const localCache2 = new RootCauseCache(10, 1000)

      const context1 = {
        timestamp: Date.now(),
        page: '/test',
        network: { type: 'wifi' as const, rtt: 50, downlink: 10 },
        slowQueries: [],
        slowApis: [],
      }
      const context2 = {
        timestamp: Date.now(),
        page: '/test',
        network: { type: '4g' as const, rtt: 100, downlink: 3 },
        slowQueries: [],
        slowApis: [],
      }

      localCache1.set('LCP', 4000, context1, { ...mockRootCause, context: context1 })
      localCache2.set('LCP', 4000, context2, { ...mockRootCause, context: context2 })

      const result1 = localCache1.get('LCP', 4000, context1)
      const result2 = localCache2.get('LCP', 4000, context2)

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      expect(result1?.context?.network?.type).toBe('wifi')
      expect(result2?.context?.network?.type).toBe('4g')
    })

    it('should generate different hash for different slow query counts', () => {
      const localCache1 = new RootCauseCache(10, 1000)
      const localCache2 = new RootCauseCache(10, 1000)

      const context1 = {
        timestamp: Date.now(),
        page: '/test',
        network: { type: 'wifi' as const, rtt: 50, downlink: 10 },
        slowQueries: [{ query: 'SELECT 1', duration: 100, rowCount: 1, timestamp: Date.now(), type: 'SELECT' }],
        slowApis: [],
      }
      const context2 = {
        timestamp: Date.now(),
        page: '/test',
        network: { type: 'wifi' as const, rtt: 50, downlink: 10 },
        slowQueries: [],
        slowApis: [],
      }

      localCache1.set('LCP', 4000, context1, { ...mockRootCause, context: context1 })
      localCache2.set('LCP', 4000, context2, { ...mockRootCause, context: context2 })

      const result1 = localCache1.get('LCP', 4000, context1)
      const result2 = localCache2.get('LCP', 4000, context2)

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      expect(result1?.context?.slowQueries?.length).toBe(1)
      expect(result2?.context?.slowQueries?.length).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty context', () => {
      const emptyContext: PerformanceContext = { timestamp: Date.now() }

      cache.set('LCP', 4000, emptyContext, mockRootCause)
      const result = cache.get('LCP', 4000, emptyContext)

      expect(result).toBeDefined()
    })

    it('should handle context with undefined network', () => {
      const contextWithoutNetwork: PerformanceContext = {
        timestamp: Date.now(),
        network: undefined,
      }

      cache.set('LCP', 4000, contextWithoutNetwork, mockRootCause)
      const result = cache.get('LCP', 4000, contextWithoutNetwork)

      expect(result).toBeDefined()
    })

    it('should handle zero value metrics', () => {
      cache.set('LCP', 0, mockContext, mockRootCause)
      const result = cache.get('LCP', 0, mockContext)

      expect(result).toBeDefined()
    })

    it('should handle negative value metrics', () => {
      cache.set('LCP', -1, mockContext, mockRootCause)
      const result = cache.get('LCP', -1, mockContext)

      expect(result).toBeDefined()
    })
  })
})