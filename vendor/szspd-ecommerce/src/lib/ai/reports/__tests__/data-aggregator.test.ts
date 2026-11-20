/**
 * Report Data Aggregator Tests
 * 报表数据聚合器测试
 * 
 * @version 1.10.0
 */

import { ReportDataAggregator } from '../data-aggregator'
import {
  ReportTemplateType,
  TimeRange,
} from '../types'

describe('ReportDataAggregator', () => {
  let aggregator: ReportDataAggregator

  beforeEach(() => {
    aggregator = new ReportDataAggregator(null, {
      cacheEnabled: true,
      cacheTTL: 300,
    })
  })

  afterEach(() => {
    aggregator.clearCache()
  })

  describe('aggregate', () => {
    it('should aggregate project progress data', async () => {
      const result = await aggregator.aggregate({
        templateType: ReportTemplateType.PROJECT_PROGRESS,
        timeRange: 'week',
      })

      expect(result).toBeDefined()
      expect(result.metrics).toBeDefined()
      expect(result.metrics.overallProgress).toBeDefined()
      expect(result.metrics.completedTasks).toBeDefined()
      expect(result.timeSeries).toBeDefined()
      expect(result.timeSeries!.length).toBeGreaterThan(0)
    })

    it('should aggregate team performance data', async () => {
      const result = await aggregator.aggregate({
        templateType: ReportTemplateType.TEAM_PERFORMANCE,
        timeRange: 'month',
      })

      expect(result).toBeDefined()
      expect(result.metrics.completionRate).toBeDefined()
      expect(result.metrics.satisfactionScore).toBeDefined()
    })

    it('should aggregate task analysis data', async () => {
      const result = await aggregator.aggregate({
        templateType: ReportTemplateType.TASK_ANALYSIS,
        timeRange: 'week',
      })

      expect(result).toBeDefined()
      expect(result.metrics.totalTasks).toBeDefined()
      expect(result.metrics.completionRate).toBeDefined()
      expect(result.breakdown).toBeDefined()
      expect(result.breakdown!.length).toBeGreaterThan(0)
    })

    it('should aggregate agent activity data', async () => {
      const result = await aggregator.aggregate({
        templateType: ReportTemplateType.AGENT_ACTIVITY,
        timeRange: 'week',
      })

      expect(result).toBeDefined()
      expect(result.metrics.activeAgents).toBeDefined()
      expect(result.metrics.totalTokens).toBeDefined()
      expect(result.metrics.successRate).toBeDefined()
    })

    it('should aggregate revenue analysis data', async () => {
      const result = await aggregator.aggregate({
        templateType: ReportTemplateType.REVENUE_ANALYSIS,
        timeRange: 'month',
      })

      expect(result).toBeDefined()
      expect(result.metrics.totalRevenue).toBeDefined()
      expect(result.metrics.growthRate).toBeDefined()
    })

    it('should aggregate user engagement data', async () => {
      const result = await aggregator.aggregate({
        templateType: ReportTemplateType.USER_ENGAGEMENT,
        timeRange: 'week',
      })

      expect(result).toBeDefined()
      expect(result.metrics.totalUsers).toBeDefined()
      expect(result.metrics.activeUsers).toBeDefined()
      expect(result.metrics.retentionRate).toBeDefined()
    })

    it('should support custom time range', async () => {
      const start = new Date('2025-01-01').toISOString()
      const end = new Date('2025-01-31').toISOString()

      const result = await aggregator.aggregate({
        templateType: ReportTemplateType.PROJECT_PROGRESS,
        timeRange: 'custom',
        customRange: { start, end },
      })

      expect(result).toBeDefined()
      expect(result.metadata.timeRange.start).toBe(start)
      expect(result.metadata.timeRange.end).toBe(end)
    })

    it('should include insights', async () => {
      const result = await aggregator.aggregate({
        templateType: ReportTemplateType.PROJECT_PROGRESS,
        timeRange: 'week',
      })

      expect(result.insights).toBeDefined()
      expect(result.insights!.length).toBeGreaterThan(0)
      expect(result.insights![0].title).toBeDefined()
      expect(result.insights![0].description).toBeDefined()
    })
  })

  describe('caching', () => {
    it('should cache aggregated data', async () => {
      const request = {
        templateType: ReportTemplateType.PROJECT_PROGRESS,
        timeRange: 'week' as TimeRange,
      }

      // First call
      const result1 = await aggregator.aggregate(request)

      // Second call (should hit cache)
      const result2 = await aggregator.aggregate(request)

      expect(result1.metrics).toEqual(result2.metrics)

      // Check cache stats
      const stats = aggregator.getCacheStats()
      expect(stats.size).toBeGreaterThan(0)
    })

    it('should clear cache', async () => {
      await aggregator.aggregate({
        templateType: ReportTemplateType.PROJECT_PROGRESS,
        timeRange: 'week',
      })

      aggregator.clearCache()

      const stats = aggregator.getCacheStats()
      expect(stats.size).toBe(0)
    })
  })

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      await aggregator.aggregate({
        templateType: ReportTemplateType.PROJECT_PROGRESS,
        timeRange: 'week',
      })

      const stats = aggregator.getCacheStats()
      expect(stats.size).toBeDefined()
      expect(stats.entries).toBeDefined()
      expect(Array.isArray(stats.entries)).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should throw error for invalid template type', async () => {
      await expect(
        aggregator.aggregate({
          templateType: 'invalid' as ReportTemplateType,
          timeRange: 'week',
        })
      ).rejects.toThrow()
    })
  })
})
