/**
 * Data Aggregator Tests
 * 数据聚合器测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  ReportDataAggregator,
  createTimeRange,
  UserActivityDataSource,
  PerformanceDataSource,
  type AggregatedMetric,
  type TimeRangeConfig,
} from '../data-aggregator'

describe('ReportDataAggregator', () => {
  let aggregator: ReportDataAggregator

  beforeEach(() => {
    aggregator = new ReportDataAggregator({
      dataSources: [new UserActivityDataSource(), new PerformanceDataSource()],
      cache: {
        enabled: true,
        ttl: 1000,
        maxSize: 10,
      },
    })
  })

  describe('createTimeRange', () => {
    it('should create day time range', () => {
      const range = createTimeRange('day')
      expect(range.type).toBe('day')
      expect(range.startDate).toBeDefined()
      expect(range.endDate).toBeDefined()
    })

    it('should create custom time range', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-31')
      const range = createTimeRange('custom', start, end)

      expect(range.type).toBe('custom')
      expect(range.startDate?.getTime()).toBe(start.getTime())
      expect(range.endDate?.getTime()).toBe(end.getTime())
    })
  })

  describe('aggregate', () => {
    it('should aggregate data from user-activity source', async () => {
      const timeRange = createTimeRange('day')
      const result = await aggregator.aggregate('user-activity', timeRange)

      expect(result).toBeDefined()
      expect(result.metrics).toBeDefined()
      expect(result.metrics.length).toBeGreaterThan(0)
      expect(result.timeRange).toEqual(timeRange)
    })

    it('should aggregate data from performance source', async () => {
      const timeRange = createTimeRange('week')
      const result = await aggregator.aggregate('performance', timeRange)

      expect(result).toBeDefined()
      expect(result.metrics).toBeDefined()
      expect(result.metrics.length).toBeGreaterThan(0)
    })

    it('should throw error for unknown source', async () => {
      const timeRange = createTimeRange('day')

      await expect(
        aggregator.aggregate('unknown-source', timeRange)
      ).rejects.toThrow('Data source not found')
    })

    it('should use cache for repeated requests', async () => {
      const timeRange = createTimeRange('day')

      const result1 = await aggregator.aggregate('user-activity', timeRange)
      const result2 = await aggregator.aggregate('user-activity', timeRange)

      expect(result1.metrics).toEqual(result2.metrics)
    })
  })

  describe('aggregateMultiple', () => {
    it('should aggregate multiple sources', async () => {
      const timeRange = createTimeRange('month')
      const sources = ['user-activity', 'performance']

      const results = await aggregator.aggregateMultiple(sources, timeRange)

      expect(Object.keys(results)).toHaveLength(2)
      expect(results['user-activity']).toBeDefined()
      expect(results['performance']).toBeDefined()
    })

    it('should handle errors gracefully', async () => {
      const timeRange = createTimeRange('day')
      const sources = ['user-activity', 'unknown-source']

      const results = await aggregator.aggregateMultiple(sources, timeRange)

      expect(Object.keys(results)).toHaveLength(1)
      expect(results['user-activity']).toBeDefined()
      expect(results['unknown-source']).toBeUndefined()
    })
  })

  describe('cache management', () => {
    it('should clear cache', async () => {
      const timeRange = createTimeRange('day')

      await aggregator.aggregate('user-activity', timeRange)
      expect(aggregator.getCacheStats().itemCount).toBeGreaterThan(0)

      aggregator.clearCache()
      expect(aggregator.getCacheStats().itemCount).toBe(0)
    })

    it('should return cache stats', () => {
      const stats = aggregator.getCacheStats()

      expect(stats).toBeDefined()
      expect(stats.itemCount).toBeDefined()
      expect(stats.keys).toBeDefined()
    })
  })

  describe('data source management', () => {
    it('should add data source', () => {
      const source = {
        name: 'test-source',
        fetchMetrics: async (): Promise<AggregatedMetric[]> => [],
      }

      aggregator.addDataSource(source)
      expect(aggregator.getDataSources()).toContain('test-source')
    })

    it('should remove data source', () => {
      aggregator.removeDataSource('user-activity')
      expect(aggregator.getDataSources()).not.toContain('user-activity')
    })

    it('should return all data source names', () => {
      const sources = aggregator.getDataSources()

      expect(sources).toContain('user-activity')
      expect(sources).toContain('performance')
    })
  })
})

describe('UserActivityDataSource', () => {
  it('should fetch user activity metrics', async () => {
    const source = new UserActivityDataSource()
    const metrics = await source.fetchMetrics(createTimeRange('day'))

    expect(metrics).toBeDefined()
    expect(metrics.length).toBe(3)
    expect(metrics[0].name).toBe('active_users')
    expect(metrics[1].name).toBe('new_users')
    expect(metrics[2].name).toBe('sessions')
  })
})

describe('PerformanceDataSource', () => {
  it('should fetch performance metrics', async () => {
    const source = new PerformanceDataSource()
    const metrics = await source.fetchMetrics(createTimeRange('day'))

    expect(metrics).toBeDefined()
    expect(metrics.length).toBe(3)
    expect(metrics[0].name).toBe('avg_response_time')
    expect(metrics[1].name).toBe('error_rate')
    expect(metrics[2].name).toBe('throughput')
  })
})
