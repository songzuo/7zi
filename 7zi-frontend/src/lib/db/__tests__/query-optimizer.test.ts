/**
 * Query Optimizer Tests
 *
 * 查询优化器模块的单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  QueryOptimizer,
  createQueryOptimizer,
  QueryOptimizerPresets,
  type QueryCacheConfig,
  type BatchConfig,
} from '../query-optimizer'

// Mock generateSecureId
vi.mock('@/core/utils', () => ({
  generateSecureId: vi.fn(() => 'test-query-id-' + Math.random().toString(36).slice(2, 9)),
}))

describe('QueryOptimizer', () => {
  let optimizer: QueryOptimizer

  beforeEach(() => {
    optimizer = new QueryOptimizer()
  })

  describe('constructor', () => {
    it('should create an instance with default config', () => {
      expect(optimizer).toBeDefined()
    })

    it('should accept custom cache config', () => {
      const customOptimizer = new QueryOptimizer({
        cache: {
          enabled: false,
          ttl: 1000,
          maxSize: 100,
        },
      })
      expect(customOptimizer).toBeDefined()
    })

    it('should accept custom batch config', () => {
      const customOptimizer = new QueryOptimizer({
        batch: {
          enabled: true,
          batchSize: 50,
          maxWaitTime: 50,
        },
      })
      expect(customOptimizer).toBeDefined()
    })
  })

  describe('executeQuery', () => {
    it('should execute a query and return result', async () => {
      const result = await optimizer.executeQuery(
        async () => 'test result',
        'SELECT * FROM test'
      )
      expect(result).toBe('test result')
    })

    it('should cache results when cacheable', async () => {
      const queryFn = vi.fn(async () => 'result')
      const query = 'SELECT * FROM test'

      await optimizer.executeQuery(queryFn, query, [], { cacheable: true })
      await optimizer.executeQuery(queryFn, query, [], { cacheable: true })

      // First call should execute the query, second should use cache
      expect(queryFn).toHaveBeenCalledTimes(1)
    })

    it('should not cache when cacheable is false', async () => {
      const queryFn = vi.fn(async () => 'result')
      const query = 'SELECT * FROM test'

      await optimizer.executeQuery(queryFn, query, [], { cacheable: false })
      await optimizer.executeQuery(queryFn, query, [], { cacheable: false })

      expect(queryFn).toHaveBeenCalledTimes(2)
    })

    it('should throw error when query function fails', async () => {
      await expect(
        optimizer.executeQuery(
          async () => {
            throw new Error('Query failed')
          },
          'SELECT * FROM test'
        )
      ).rejects.toThrow('Query failed')
    })
  })

  describe('batchExecute', () => {
    it('should execute batch operations', async () => {
      const batchFn = vi.fn(async (params: unknown[][]) =>
        params.map((p) => `batch-result-${p[0]}`)
      )

      const result = await optimizer.batchExecute('test-batch', ['param1'], batchFn)
      expect(result).toBe('batch-result-param1')
      expect(batchFn).toHaveBeenCalled()
    })

    it('should disable batching when configured', async () => {
      const disabledOptimizer = new QueryOptimizer({
        batch: { enabled: false, batchSize: 100, maxWaitTime: 100 },
      })

      const batchFn = vi.fn(async (params: unknown[][]) =>
        params.map((p) => `result-${p[0]}`)
      )

      const result = await disabledOptimizer.batchExecute('test-batch', ['param1'], batchFn)
      expect(result).toBe('result-param1')
    })
  })

  describe('getStats', () => {
    it('should return initial stats', () => {
      const stats = optimizer.getStats()
      expect(stats).toHaveProperty('totalQueries')
      expect(stats).toHaveProperty('n1Queries')
      expect(stats).toHaveProperty('cachedQueries')
      expect(stats).toHaveProperty('batchQueries')
      expect(stats).toHaveProperty('averageDuration')
      expect(stats).toHaveProperty('slowQueries')
      expect(stats).toHaveProperty('cacheHitRate')
    })

    it('should track total queries', async () => {
      await optimizer.executeQuery(async () => 'result', 'SELECT 1')
      const stats = optimizer.getStats()
      expect(stats.totalQueries).toBeGreaterThan(0)
    })
  })

  describe('getQueryLogs', () => {
    it('should return empty logs initially', () => {
      const logs = optimizer.getQueryLogs()
      expect(Array.isArray(logs)).toBe(true)
    })

    it('should filter logs by type', async () => {
      await optimizer.executeQuery(async () => 'result', 'SELECT 1')
      const logs = optimizer.getQueryLogs({ type: 'SELECT' })
      expect(logs.length).toBeGreaterThan(0)
    })

    it('should limit logs', () => {
      const logs = optimizer.getQueryLogs({ limit: 5 })
      expect(logs.length).toBeLessThanOrEqual(5)
    })
  })

  describe('getOptimizationSuggestions', () => {
    it('should return optimization suggestions', () => {
      const suggestions = optimizer.getOptimizationSuggestions()
      expect(Array.isArray(suggestions)).toBe(true)
    })
  })

  describe('clearCache', () => {
    it('should clear the cache', () => {
      optimizer.clearCache()
      // Should not throw
      expect(() => optimizer.clearCache()).not.toThrow()
    })
  })

  describe('clearLogs', () => {
    it('should clear query logs', async () => {
      await optimizer.executeQuery(async () => 'result', 'SELECT 1')
      optimizer.clearLogs()
      const logs = optimizer.getQueryLogs()
      expect(logs.length).toBe(0)
    })
  })

  describe('resetStats', () => {
    it('should reset statistics', async () => {
      await optimizer.executeQuery(async () => 'result', 'SELECT 1')
      optimizer.resetStats()
      const stats = optimizer.getStats()
      expect(stats.totalQueries).toBe(0)
      expect(stats.n1Queries).toBe(0)
    })
  })
})

describe('createQueryOptimizer', () => {
  it('should create a QueryOptimizer instance', () => {
    const optimizer = createQueryOptimizer()
    expect(optimizer).toBeInstanceOf(QueryOptimizer)
  })

  it('should accept config', () => {
    const optimizer = createQueryOptimizer({
      cache: { enabled: false },
      batch: { enabled: false },
    })
    expect(optimizer).toBeInstanceOf(QueryOptimizer)
  })
})

describe('QueryOptimizerPresets', () => {
  it('should have DEVELOPMENT preset', () => {
    const optimizer = createQueryOptimizer(QueryOptimizerPresets.DEVELOPMENT)
    expect(optimizer).toBeInstanceOf(QueryOptimizer)
  })

  it('should have PRODUCTION preset', () => {
    const optimizer = createQueryOptimizer(QueryOptimizerPresets.PRODUCTION)
    expect(optimizer).toBeInstanceOf(QueryOptimizer)
  })

  it('should have HIGH_PERFORMANCE preset', () => {
    const optimizer = createQueryOptimizer(QueryOptimizerPresets.HIGH_PERFORMANCE)
    expect(optimizer).toBeInstanceOf(QueryOptimizer)
  })
})
