// @ts-nocheck
/**
 * Tests for Optimized Metrics Aggregator
 * 优化的指标聚合器测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  OptimizedMetricsAggregator,
  type AggregatorMetric,
  type AggregatedMetrics,
  type TimeWindow,
} from '../optimized-metrics-aggregator'

// Mock LRUCache since it's imported
vi.mock('@/lib/cache/lru-cache', () => {
  class MockLRUCache<T> {
    private cache: Map<string, { value: T; timestamp: number }>
    private maxSize: number
    private ttl: number

    constructor(maxSize: number, ttl?: number) {
      this.cache = new Map()
      this.maxSize = maxSize
      this.ttl = ttl ?? Infinity
    }

    get(key: string): T | null {
      const entry = this.cache.get(key)
      if (!entry) return null

      if (Date.now() - entry.timestamp > this.ttl) {
        this.cache.delete(key)
        return null
      }

      return entry.value
    }

    set(key: string, value: T): void {
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value
        this.cache.delete(firstKey)
      }

      this.cache.set(key, { value, timestamp: Date.now() })
    }

    clear(): void {
      this.cache.clear()
    }

    get size() {
      return this.cache.size
    }
  }

  return { LRUCache: MockLRUCache }
})

describe('OptimizedMetricsAggregator', () => {
  let aggregator: OptimizedMetricsAggregator

  beforeEach(() => {
    aggregator = new OptimizedMetricsAggregator({
      enableWorker: false, // Disable worker for tests
      enableSampling: false, // Disable sampling for deterministic tests
    })
  })

  describe('Basic Aggregation', () => {
    it('should aggregate empty metrics', () => {
      const result = aggregator.getAggregated({
        startTime: 0,
        endTime: Date.now(),
      })

      expect(result).toBeNull()
    })

    it('should aggregate single metric', () => {
      aggregator.addMetric({
        timestamp: Date.now(),
        value: 42,
      })

      const result = aggregator.getAggregated({
        startTime: 0,
        endTime: Date.now() + 1000,
      })

      expect(result).not.toBeNull()
      expect(result?.count).toBe(1)
      expect(result?.sum).toBe(42)
      expect(result?.avg).toBe(42)
      expect(result?.min).toBe(42)
      expect(result?.max).toBe(42)
    })

    it('should aggregate multiple metrics correctly', () => {
      const now = Date.now()
      const metrics: AggregatorMetric[] = [
        { timestamp: now, value: 10 },
        { timestamp: now + 100, value: 20 },
        { timestamp: now + 200, value: 30 },
        { timestamp: now + 300, value: 40 },
        { timestamp: now + 400, value: 50 },
      ]

      metrics.forEach(m => aggregator.addMetric(m))

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 500,
      })

      expect(result).not.toBeNull()
      expect(result?.count).toBe(5)
      expect(result?.sum).toBe(150)
      expect(result?.avg).toBe(30)
      expect(result?.min).toBe(10)
      expect(result?.max).toBe(50)
      expect(result?.first).toBe(10)
      expect(result?.last).toBe(50)
    })

    it('should filter metrics by time window', () => {
      const now = Date.now()
      aggregator.addMetric({ timestamp: now - 1000, value: 1 })
      aggregator.addMetric({ timestamp: now, value: 10 })
      aggregator.addMetric({ timestamp: now + 100, value: 20 })
      aggregator.addMetric({ timestamp: now + 200, value: 30 })
      aggregator.addMetric({ timestamp: now + 1000, value: 100 })

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 300,
      })

      expect(result?.count).toBe(3)
      expect(result?.sum).toBe(60)
      expect(result?.min).toBe(10)
      expect(result?.max).toBe(30)
    })
  })

  describe('Change Tracking', () => {
    it('should calculate absolute change', () => {
      const now = Date.now()
      aggregator.addMetric({ timestamp: now, value: 10 })
      aggregator.addMetric({ timestamp: now + 100, value: 20 })
      aggregator.addMetric({ timestamp: now + 200, value: 30 })

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 300,
      })

      expect(result?.change).toBe(20) // 30 - 10
    })

    it('should calculate percentage change', () => {
      const now = Date.now()
      aggregator.addMetric({ timestamp: now, value: 10 })
      aggregator.addMetric({ timestamp: now + 100, value: 20 })
      aggregator.addMetric({ timestamp: now + 200, value: 30 })

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 300,
      })

      expect(result?.changePercent).toBe(200) // (30 - 10) / 10 * 100
    })

    it('should handle zero first value', () => {
      const now = Date.now()
      aggregator.addMetric({ timestamp: now, value: 0 })
      aggregator.addMetric({ timestamp: now + 100, value: 10 })

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 200,
      })

      expect(result?.change).toBe(10)
      expect(result?.changePercent).toBe(100) // Special case: 0 -> X = 100%
    })

    it('should handle both zero values', () => {
      const now = Date.now()
      aggregator.addMetric({ timestamp: now, value: 0 })
      aggregator.addMetric({ timestamp: now + 100, value: 0 })

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 200,
      })

      expect(result?.change).toBe(0)
      expect(result?.changePercent).toBe(0)
    })

    it('should handle negative change', () => {
      const now = Date.now()
      aggregator.addMetric({ timestamp: now, value: 50 })
      aggregator.addMetric({ timestamp: now + 100, value: 30 })
      aggregator.addMetric({ timestamp: now + 200, value: 10 })

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 300,
      })

      expect(result?.change).toBe(-40)
      expect(result?.changePercent).toBe(-80)
    })
  })

  describe('Percentile Calculation', () => {
    it('should calculate percentiles for sorted data', () => {
      const now = Date.now()
      for (let i = 1; i <= 100; i++) {
        aggregator.addMetric({ timestamp: now + i, value: i })
      }

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 200,
      })

      expect(result?.p50).toBeCloseTo(50, 0)
      expect(result?.p90).toBeCloseTo(90, 0)
      expect(result?.p95).toBeCloseTo(95, 0)
      expect(result?.p99).toBeCloseTo(99, 0)
    })

    it('should handle duplicate values', () => {
      const now = Date.now()
      aggregator.addMetric({ timestamp: now, value: 10 })
      aggregator.addMetric({ timestamp: now + 100, value: 10 })
      aggregator.addMetric({ timestamp: now + 200, value: 10 })
      aggregator.addMetric({ timestamp: now + 300, value: 10 })
      aggregator.addMetric({ timestamp: now + 400, value: 10 })

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 500,
      })

      expect(result?.p50).toBe(10)
      expect(result?.p90).toBe(10)
      expect(result?.p95).toBe(10)
      expect(result?.p99).toBe(10)
    })

    it('should handle small datasets', () => {
      const now = Date.now()
      aggregator.addMetric({ timestamp: now, value: 5 })

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 100,
      })

      expect(result?.p50).toBe(5)
      expect(result?.p90).toBe(5)
    })

    it('should return undefined for percentiles when no data', () => {
      const now = Date.now()
      aggregator.addMetric({ timestamp: now, value: 10 })

      // Empty time window
      const result = aggregator.getAggregated({
        startTime: now + 1000,
        endTime: now + 2000,
      })

      expect(result).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large values', () => {
      const now = Date.now()
      aggregator.addMetric({ timestamp: now, value: Number.MAX_SAFE_INTEGER })

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 100,
      })

      expect(result?.max).toBe(Number.MAX_SAFE_INTEGER)
    })

    it('should handle very small values', () => {
      const now = Date.now()
      aggregator.addMetric({ timestamp: now, value: Number.MIN_SAFE_INTEGER })

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 100,
      })

      expect(result?.min).toBe(Number.MIN_SAFE_INTEGER)
    })

    it('should handle negative values', () => {
      const now = Date.now()
      aggregator.addMetric({ timestamp: now, value: -10 })
      aggregator.addMetric({ timestamp: now + 100, value: 0 })
      aggregator.addMetric({ timestamp: now + 200, value: 10 })

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 300,
      })

      expect(result?.min).toBe(-10)
      expect(result?.max).toBe(10)
      expect(result?.avg).toBe(0)
    })

    it('should handle decimal values', () => {
      const now = Date.now()
      aggregator.addMetric({ timestamp: now, value: 1.5 })
      aggregator.addMetric({ timestamp: now + 100, value: 2.5 })
      aggregator.addMetric({ timestamp: now + 200, value: 3.5 })

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 300,
      })

      expect(result?.sum).toBeCloseTo(7.5, 5)
      expect(result?.avg).toBeCloseTo(2.5, 5)
    })
  })

  describe('Timestamp Tracking', () => {
    it('should track first and last timestamps', () => {
      const now = Date.now()
      aggregator.addMetric({ timestamp: now, value: 10 })
      aggregator.addMetric({ timestamp: now + 100, value: 20 })
      aggregator.addMetric({ timestamp: now + 200, value: 30 })

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 300,
      })

      expect(result?.firstTimestamp).toBe(now)
      expect(result?.lastTimestamp).toBe(now + 200)
    })

    it('should handle out-of-order timestamps', () => {
      const now = Date.now()
      aggregator.addMetric({ timestamp: now + 200, value: 30 })
      aggregator.addMetric({ timestamp: now, value: 10 })
      aggregator.addMetric({ timestamp: now + 100, value: 20 })

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 300,
      })

      expect(result?.firstTimestamp).toBe(now)
      expect(result?.lastTimestamp).toBe(now + 200)
    })
  })

  describe('Metadata', () => {
    it('should accept metrics with metadata', () => {
      const now = Date.now()
      aggregator.addMetric({
        timestamp: now,
        value: 10,
        metadata: { source: 'test', tags: ['metric'] },
      })

      // Metadata is stored in the pending metrics
      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 100,
      })

      expect(result).not.toBeNull()
    })

    it('should handle metrics with no metadata', () => {
      const now = Date.now()
      aggregator.addMetric({
        timestamp: now,
        value: 10,
      })

      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + 100,
      })

      expect(result).not.toBeNull()
    })
  })

  describe('Performance', () => {
    it('should handle large number of metrics efficiently', () => {
      const now = Date.now()
      const count = 10000

      const startTime = performance.now()
      for (let i = 0; i < count; i++) {
        aggregator.addMetric({ timestamp: now + i, value: i })
      }
      const addTime = performance.now() - startTime

      expect(addTime).toBeLessThan(1000) // Should be fast

      const getStartTime = performance.now()
      const result = aggregator.getAggregated({
        startTime: now,
        endTime: now + count,
      })
      const getTime = performance.now() - getStartTime

      expect(getTime).toBeLessThan(100)
      expect(result?.count).toBe(count)
    })
  })

  describe('Configuration', () => {
    it('should enable sampling when configured', () => {
      const aggregatorWithSampling = new OptimizedMetricsAggregator({
        enableWorker: false,
        enableSampling: true,
        samplingConfig: {
          enabled: true,
          maxSamples: 100,
          strategy: 'adaptive',
        },
      })

      const now = Date.now()
      for (let i = 0; i < 1000; i++) {
        aggregatorWithSampling.addMetric({ timestamp: now + i, value: i })
      }

      const result = aggregatorWithSampling.getAggregated({
        startTime: now,
        endTime: now + 2000,
      })

      expect(result).not.toBeNull()
      expect(result?.count).toBeGreaterThan(0)
    })

    it('should use time-based sampling strategy', () => {
      const aggregatorTimeBased = new OptimizedMetricsAggregator({
        enableWorker: false,
        enableSampling: true,
        samplingConfig: {
          enabled: true,
          maxSamples: 100,
          strategy: 'time-based',
        },
      })

      const now = Date.now()
      for (let i = 0; i < 1000; i++) {
        aggregatorTimeBased.addMetric({ timestamp: now + i, value: i })
      }

      const result = aggregatorTimeBased.getAggregated({
        startTime: now,
        endTime: now + 2000,
      })

      expect(result).not.toBeNull()
    })

    it('should use random sampling strategy', () => {
      const aggregatorRandom = new OptimizedMetricsAggregator({
        enableWorker: false,
        enableSampling: true,
        samplingConfig: {
          enabled: true,
          maxSamples: 100,
          strategy: 'random',
        },
      })

      const now = Date.now()
      for (let i = 0; i < 1000; i++) {
        aggregatorRandom.addMetric({ timestamp: now + i, value: i })
      }

      const result = aggregatorRandom.getAggregated({
        startTime: now,
        endTime: now + 2000,
      })

      expect(result).not.toBeNull()
    })
  })
})

describe('QuickSelect Algorithm', () => {
  // This tests the quickSelect function indirectly through the aggregator
  it('should find k-th smallest element correctly', () => {
    const aggregator = new OptimizedMetricsAggregator({
      enableWorker: false,
      enableSampling: false,
    })

    const now = Date.now()
    const values = [50, 10, 90, 30, 70, 20, 80, 40, 60, 100]

    values.forEach((v, i) =>
      aggregator.addMetric({ timestamp: now + i, value: v })
    )

    const result = aggregator.getAggregated({
      startTime: now,
      endTime: now + 200,
    })

    // After sorting: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    // p50 should be around 50-60
    expect(result?.p50).toBeGreaterThanOrEqual(40)
    expect(result?.p50).toBeLessThanOrEqual(60)
  })
})
