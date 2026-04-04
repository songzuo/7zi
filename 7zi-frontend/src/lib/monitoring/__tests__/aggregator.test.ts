/**
 * MetricsAggregator Tests
 * 指标聚合器测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  MetricsAggregator,
  aggregateByTimeWindow,
  aggregatePercentiles,
  aggregateTrend,
} from '../aggregator'
import type { PerformanceMetric } from '../types'

// 测试数据辅助函数
const createMockMetric = (
  id: string,
  value: number,
  timestamp: number,
  type: PerformanceMetric['type'] = 'api'
): PerformanceMetric => ({
  id,
  name: `metric_${id}`,
  timestamp,
  type,
  value,
  unit: 'ms',
})

describe('MetricsAggregator', () => {
  describe('aggregateByTimeWindow', () => {
    it('should aggregate data by time window', () => {
      const now = Date.now()
      const data: PerformanceMetric[] = [
        createMockMetric('1', 100, now),
        createMockMetric('2', 200, now + 1000),
        createMockMetric('3', 300, now + 2000),
        createMockMetric('4', 400, now + 3000),
        createMockMetric('5', 500, now + 4000),
      ]

      const result = MetricsAggregator.aggregateByTimeWindow(data, 2000)

      // 时间窗口: [now, now+2000), [now+2000, now+4000), [now+4000, now+6000)
      // 数据点: now, now+1000, now+2000, now+3000, now+4000
      // now+2000 和 now+4000 在边界上，使用 < 所以属于下一个窗口
      // 窗口1: now, now+1000 (2个点)
      // 窗口2: now+2000, now+3000 (2个点)
      // 窗口3: now+4000 (1个点)
      expect(result.length).toBe(3)
      expect(result[0].count).toBe(2)
      expect(result[0].avg).toBe(150)
      expect(result[1].count).toBe(2)
      expect(result[1].avg).toBe(350)
      expect(result[2].count).toBe(1)
      expect(result[2].avg).toBe(500)
    })

    it('should handle empty data', () => {
      const result = MetricsAggregator.aggregateByTimeWindow([], 1000)
      expect(result).toEqual([])
    })

    it('should handle single data point', () => {
      const now = Date.now()
      const data = [createMockMetric('1', 100, now)]

      const result = MetricsAggregator.aggregateByTimeWindow(data, 1000)

      expect(result.length).toBe(1)
      expect(result[0].count).toBe(1)
      expect(result[0].sum).toBe(100)
    })

    it('should throw error for invalid window size', () => {
      const data = [createMockMetric('1', 100, Date.now())]
      
      expect(() => {
        MetricsAggregator.aggregateByTimeWindow(data, 0)
      }).toThrow('Window size must be positive')
    })

    it('should calculate min/max correctly', () => {
      const now = Date.now()
      const data: PerformanceMetric[] = [
        createMockMetric('1', 50, now),
        createMockMetric('2', 100, now + 500),
        createMockMetric('3', 200, now + 1000),
      ]

      const result = MetricsAggregator.aggregateByTimeWindow(data, 2000)

      expect(result[0].min).toBe(50)
      expect(result[0].max).toBe(200)
    })
  })

  describe('aggregatePercentiles', () => {
    it('should calculate p50, p90, p99 correctly', () => {
      // 创建均匀分布的数据：1-100
      const data: PerformanceMetric[] = Array.from({ length: 100 }, (_, i) =>
        createMockMetric(String(i), i + 1, Date.now())
      )

      const result = MetricsAggregator.aggregatePercentiles(data)

      // 使用线性插值计算百分位数
      // p50: index = 49.5, values[49] = 50, values[50] = 51
      // p50 = 50 * 0.5 + 51 * 0.5 = 50.5
      expect(result.p50).toBeCloseTo(50.5, 0)
      expect(result.p90).toBeCloseTo(90.1, 0)
      expect(result.p95).toBeCloseTo(95.05, 0)
      expect(result.p99).toBeCloseTo(99.01, 0)
      expect(result.min).toBe(1)
      expect(result.max).toBe(100)
    })

    it('should handle custom percentiles', () => {
      const data: PerformanceMetric[] = [
        createMockMetric('1', 10, Date.now()),
        createMockMetric('2', 20, Date.now()),
        createMockMetric('3', 30, Date.now()),
        createMockMetric('4', 40, Date.now()),
        createMockMetric('5', 50, Date.now()),
      ]

      const result = MetricsAggregator.aggregatePercentiles(data, [25, 75])

      expect(result.p50).toBe(30) // 中位数
      // p25 应该是线性插值
    })

    it('should handle empty data', () => {
      const result = MetricsAggregator.aggregatePercentiles([])

      expect(result.count).toBe(0)
      expect(result.p50).toBe(0)
      expect(result.p90).toBe(0)
    })

    it('should handle single data point', () => {
      const data = [createMockMetric('1', 100, Date.now())]

      const result = MetricsAggregator.aggregatePercentiles(data)

      expect(result.count).toBe(1)
      expect(result.p50).toBe(100)
      expect(result.p90).toBe(100)
      expect(result.p99).toBe(100)
    })
  })

  describe('aggregateTrend', () => {
    it('should detect increasing trend', () => {
      const now = Date.now()
      const data: PerformanceMetric[] = [
        createMockMetric('1', 100, now),
        createMockMetric('2', 150, now + 1000),
        createMockMetric('3', 200, now + 2000),
        createMockMetric('4', 250, now + 3000),
        createMockMetric('5', 300, now + 4000),
      ]

      const result = MetricsAggregator.aggregateTrend(data)

      expect(result.direction).toBe('increasing')
      expect(result.slope).toBeGreaterThan(0)
    })

    it('should detect decreasing trend', () => {
      const now = Date.now()
      const data: PerformanceMetric[] = [
        createMockMetric('1', 500, now),
        createMockMetric('2', 400, now + 1000),
        createMockMetric('3', 300, now + 2000),
        createMockMetric('4', 200, now + 3000),
        createMockMetric('5', 100, now + 4000),
      ]

      const result = MetricsAggregator.aggregateTrend(data)

      expect(result.direction).toBe('decreasing')
      expect(result.slope).toBeLessThan(0)
    })

    it('should detect stable trend', () => {
      const now = Date.now()
      // 完全相同的数据 - 应该检测为 stable
      const data: PerformanceMetric[] = [
        createMockMetric('1', 100, now),
        createMockMetric('2', 100, now + 1000),
        createMockMetric('3', 100, now + 2000),
        createMockMetric('4', 100, now + 3000),
        createMockMetric('5', 100, now + 4000),
      ]

      const result = MetricsAggregator.aggregateTrend(data)

      expect(result.direction).toBe('stable')
    })

    it('should handle empty data', () => {
      const result = MetricsAggregator.aggregateTrend([])

      expect(result.direction).toBe('stable')
      expect(result.confidence).toBe(0)
    })

    it('should handle single data point', () => {
      const data = [createMockMetric('1', 100, Date.now())]

      const result = MetricsAggregator.aggregateTrend(data)

      expect(result.direction).toBe('stable')
      expect(result.confidence).toBe(0)
    })

    it('should calculate change percent', () => {
      const now = Date.now()
      const data: PerformanceMetric[] = [
        createMockMetric('1', 100, now),
        createMockMetric('2', 200, now + 1000),
      ]

      const result = MetricsAggregator.aggregateTrend(data)

      // 变化百分比计算: (last - first) / avg * 100
      // 对于线性回归计算，应该显示增长趋势
      expect(result.direction).toBe('increasing')
      expect(result.changePercent).toBeGreaterThan(0)
    })
  })

  describe('getStats', () => {
    it('should calculate all statistics correctly', () => {
      const data: PerformanceMetric[] = [
        createMockMetric('1', 10, Date.now()),
        createMockMetric('2', 20, Date.now()),
        createMockMetric('3', 30, Date.now()),
        createMockMetric('4', 40, Date.now()),
        createMockMetric('5', 50, Date.now()),
      ]

      const result = MetricsAggregator.getStats(data)

      expect(result.count).toBe(5)
      expect(result.sum).toBe(150)
      expect(result.avg).toBe(30)
      expect(result.min).toBe(10)
      expect(result.max).toBe(50)
      expect(result.median).toBe(30)
      // 标准差: sqrt(((10-30)² + (20-30)² + (30-30)² + (40-30)² + (50-30)²) / 5) = sqrt(200) ≈ 14.14
      expect(result.stdDev).toBeCloseTo(14.14, 1)
    })

    it('should handle empty data', () => {
      const result = MetricsAggregator.getStats([])

      expect(result.count).toBe(0)
      expect(result.avg).toBe(0)
    })
  })

  describe('groupBy', () => {
    it('should group metrics by type', () => {
      const now = Date.now()
      const data: PerformanceMetric[] = [
        createMockMetric('1', 100, now, 'api'),
        createMockMetric('2', 200, now, 'api'),
        createMockMetric('3', 50, now, 'error'),
        createMockMetric('4', 30, now, 'error'),
      ]

      const result = MetricsAggregator.groupBy(data, m => m.type)

      const apiStats = result.get('api')
      const errorStats = result.get('error')

      expect(apiStats?.count).toBe(2)
      expect(apiStats?.avg).toBe(150)
      expect(errorStats?.count).toBe(2)
      expect(errorStats?.avg).toBe(40)
    })
  })

  describe('slidingWindow', () => {
    it('should create sliding windows', () => {
      const now = Date.now()
      const data: PerformanceMetric[] = [
        createMockMetric('1', 10, now),
        createMockMetric('2', 20, now + 1000),
        createMockMetric('3', 30, now + 2000),
        createMockMetric('4', 40, now + 3000),
        createMockMetric('5', 50, now + 4000),
      ]

      const result = MetricsAggregator.slidingWindow(data, 3)

      expect(result.length).toBe(3) // 5 - 3 + 1 = 3
      expect(result[0].avg).toBe(20) // (10+20+30)/3
      expect(result[1].avg).toBe(30) // (20+30+40)/3
      expect(result[2].avg).toBe(40) // (30+40+50)/3
    })
  })

  describe('detectOutliers', () => {
    it('should detect outliers using IQR method', () => {
      const now = Date.now()
      // 数据: 10, 20, 30, 40, 50, 60, 70, 80, 90, 1000 (异常值)
      const data: PerformanceMetric[] = [
        createMockMetric('1', 10, now),
        createMockMetric('2', 20, now),
        createMockMetric('3', 30, now),
        createMockMetric('4', 40, now),
        createMockMetric('5', 50, now),
        createMockMetric('6', 60, now),
        createMockMetric('7', 70, now),
        createMockMetric('8', 80, now),
        createMockMetric('9', 90, now),
        createMockMetric('10', 1000, now),
      ]

      const outliers = MetricsAggregator.detectOutliers(data)

      expect(outliers.length).toBeGreaterThan(0)
      expect(outliers[0].value).toBe(1000)
    })

    it('should not detect outliers in normal data', () => {
      const now = Date.now()
      const data: PerformanceMetric[] = [
        createMockMetric('1', 45, now),
        createMockMetric('2', 50, now),
        createMockMetric('3', 55, now),
        createMockMetric('4', 52, now),
        createMockMetric('5', 48, now),
      ]

      const outliers = MetricsAggregator.detectOutliers(data)

      expect(outliers.length).toBe(0)
    })
  })
})

// 便捷函数测试
describe('Convenience Functions', () => {
  it('aggregateByTimeWindow should work as standalone function', () => {
    const now = Date.now()
    const data = [
      createMockMetric('1', 100, now),
      createMockMetric('2', 200, now + 1000),
    ]

    const result = aggregateByTimeWindow(data, 1000)
    expect(result.length).toBe(2)
  })

  it('aggregatePercentiles should work as standalone function', () => {
    const data = [
      createMockMetric('1', 10, Date.now()),
      createMockMetric('2', 20, Date.now()),
      createMockMetric('3', 30, Date.now()),
    ]

    const result = aggregatePercentiles(data)
    expect(result.p50).toBe(20)
  })

  it('aggregateTrend should work as standalone function', () => {
    const now = Date.now()
    const data = [
      createMockMetric('1', 100, now),
      createMockMetric('2', 200, now + 1000),
    ]

    const result = aggregateTrend(data)
    expect(result.direction).toBeDefined()
  })
})
