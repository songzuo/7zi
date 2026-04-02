/**
 * Metrics Aggregator Tests
 * 指标聚合器单元测试
 */

import { MetricsAggregator } from '../metrics-aggregator'
import type { MetricDataPoint, ResponseTimeMetrics, SystemMetrics } from '../metrics-types'

describe('MetricsAggregator', () => {
  let aggregator: MetricsAggregator

  beforeEach(() => {
    aggregator = new MetricsAggregator()
  })

  afterEach(() => {
    aggregator.reset()
  })

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const a = new MetricsAggregator()
      expect(a.getConfig().maxHistorySize).toBe(100)
      expect(a.getConfig().defaultPercentiles).toEqual([50, 90, 95, 99])
    })

    it('should create instance with custom config', () => {
      const a = new MetricsAggregator({
        maxHistorySize: 50,
        dataExpiryMs: 1800000,
      })
      expect(a.getConfig().maxHistorySize).toBe(50)
      expect(a.getConfig().dataExpiryMs).toBe(1800000)
    })
  })

  describe('percentile', () => {
    it('should calculate P50 correctly', () => {
      const values = [1, 2, 3, 4, 5]
      expect(aggregator.percentile(values, 50)).toBe(3)
    })

    it('should calculate P95 correctly', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1)
      expect(aggregator.percentile(values, 95)).toBeCloseTo(95, 0)
    })

    it('should calculate P99 correctly', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1)
      expect(aggregator.percentile(values, 99)).toBeCloseTo(99, 0)
    })

    it('should handle empty array', () => {
      expect(aggregator.percentile([], 50)).toBe(0)
    })

    it('should handle single element', () => {
      expect(aggregator.percentile([42], 50)).toBe(42)
    })
  })

  describe('mean', () => {
    it('should calculate mean correctly', () => {
      expect(aggregator.mean([1, 2, 3, 4, 5])).toBe(3)
      expect(aggregator.mean([10, 20, 30])).toBe(20)
    })

    it('should handle empty array', () => {
      expect(aggregator.mean([])).toBe(0)
    })
  })

  describe('median', () => {
    it('should calculate median for odd length', () => {
      expect(aggregator.median([1, 2, 3, 4, 5])).toBe(3)
    })

    it('should calculate median for even length', () => {
      expect(aggregator.median([1, 2, 3, 4])).toBeCloseTo(2.5, 1)
    })
  })

  describe('standardDeviation', () => {
    it('should calculate standard deviation correctly', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9]
      const stdDev = aggregator.standardDeviation(values)
      expect(stdDev).toBeCloseTo(2, 0)
    })

    it('should return 0 for single element', () => {
      expect(aggregator.standardDeviation([42])).toBe(0)
    })

    it('should return 0 for empty array', () => {
      expect(aggregator.standardDeviation([])).toBe(0)
    })
  })

  describe('aggregateFromDataPoints', () => {
    it('should aggregate data points correctly', () => {
      const dataPoints: MetricDataPoint[] = [
        { value: 100, timestamp: 1000 },
        { value: 200, timestamp: 2000 },
        { value: 300, timestamp: 3000 },
        { value: 400, timestamp: 4000 },
        { value: 500, timestamp: 5000 },
      ]

      const result = aggregator.aggregateFromDataPoints(dataPoints)

      expect(result.min).toBe(100)
      expect(result.max).toBe(500)
      expect(result.avg).toBe(300)
      expect(result.count).toBe(5)
      expect(result.timeRange.start).toBe(1000)
      expect(result.timeRange.end).toBe(5000)
    })

    it('should calculate percentiles', () => {
      const dataPoints: MetricDataPoint[] = Array.from({ length: 100 }, (_, i) => ({
        value: i + 1,
        timestamp: i * 1000,
      }))

      const result = aggregator.aggregateFromDataPoints(dataPoints)

      expect(result.p50).toBeCloseTo(50.5, 0)
      expect(result.p95).toBeCloseTo(95.5, 0)
      expect(result.p99).toBeCloseTo(99.5, 0)
    })

    it('should handle empty array', () => {
      const result = aggregator.aggregateFromDataPoints([])
      expect(result.count).toBe(0)
      expect(result.avg).toBe(0)
    })
  })

  describe('calculatePercentile', () => {
    it('should calculate specific percentile', () => {
      const dataPoints: MetricDataPoint[] = Array.from({ length: 100 }, (_, i) => ({
        value: i + 1,
        timestamp: Date.now(),
      }))

      expect(aggregator.calculatePercentile(dataPoints, 50)).toBeCloseTo(50.5, 0)
      expect(aggregator.calculatePercentile(dataPoints, 95)).toBeCloseTo(95.5, 0)
      expect(aggregator.calculatePercentile(dataPoints, 99)).toBeCloseTo(99.5, 0)
    })
  })

  describe('movingAverage', () => {
    it('should calculate moving average', () => {
      const values = [1, 2, 3, 4, 5]
      const result = aggregator.movingAverage(values, 3)

      expect(result.length).toBe(3)
      expect(result[0]).toBeCloseTo(2, 1) // (1+2+3)/3
      expect(result[1]).toBeCloseTo(3, 1) // (2+3+4)/3
      expect(result[2]).toBeCloseTo(4, 1) // (3+4+5)/3
    })

    it('should handle window larger than array', () => {
      const values = [1, 2, 3]
      const result = aggregator.movingAverage(values, 10)

      expect(result.length).toBe(1)
      expect(result[0]).toBe(2) // average of [1,2,3]
    })
  })

  describe('history management', () => {
    it('should add system metrics to history', () => {
      const metric: SystemMetrics = {
        cpuUsage: 50,
        memoryUsage: 60,
        timestamp: Date.now(),
      }

      aggregator.addSystemMetrics(metric)

      const history = aggregator.getHistory()
      expect(history.system.length).toBe(1)
      expect(history.system[0]).toEqual(metric)
    })

    it('should add response time metrics to history', () => {
      const metric: ResponseTimeMetrics = {
        average: 100,
        min: 50,
        max: 200,
        p50: 90,
        p95: 180,
        p99: 195,
        sampleCount: 100,
        timestamp: Date.now(),
      }

      aggregator.addResponseTimeMetrics(metric)

      const history = aggregator.getHistory()
      expect(history.responseTime.length).toBe(1)
    })

    it('should enforce history size limit', () => {
      const smallAggregator = new MetricsAggregator({ maxHistorySize: 3 })

      for (let i = 0; i < 5; i++) {
        smallAggregator.addSystemMetrics({
          cpuUsage: i,
          memoryUsage: i,
          timestamp: i,
        })
      }

      const history = smallAggregator.getHistory()
      expect(history.system.length).toBe(3)
      expect(history.system[0].cpuUsage).toBe(2) // Last 3 items
      expect(history.system[2].cpuUsage).toBe(4)
    })

    it('should get history in range', () => {
      const now = Date.now()

      for (let i = 0; i < 5; i++) {
        aggregator.addSystemMetrics({
          cpuUsage: i,
          memoryUsage: i,
          timestamp: now - (5 - i) * 1000,
        })
      }

      const history = aggregator.getHistoryInRange(now - 3000, now - 1000)
      expect(history.system.length).toBe(3) // Should include timestamps within range
    })

    it('should get latest history', () => {
      for (let i = 0; i < 10; i++) {
        aggregator.addSystemMetrics({
          cpuUsage: i,
          memoryUsage: i,
          timestamp: i,
        })
      }

      const latest = aggregator.getLatestHistory(3)
      expect(latest.system.length).toBe(3)
      expect(latest.system[0].cpuUsage).toBe(7) // Last 3 items
    })
  })

  describe('getResponseTimePercentiles', () => {
    it('should return zeros for empty history', () => {
      const result = aggregator.getResponseTimePercentiles()
      expect(result.p50).toBe(0)
      expect(result.p95).toBe(0)
      expect(result.p99).toBe(0)
    })

    it('should calculate percentiles from history', () => {
      for (let i = 1; i <= 10; i++) {
        aggregator.addResponseTimeMetrics({
          average: i * 10,
          min: i * 5,
          max: i * 20,
          p50: i * 10,
          p95: i * 18,
          p99: i * 20,
          sampleCount: 100,
          timestamp: i,
        })
      }

      const result = aggregator.getResponseTimePercentiles()
      expect(result.p50).toBeGreaterThan(0)
      expect(result.p95).toBeGreaterThan(0)
      expect(result.p99).toBeGreaterThan(0)
    })
  })

  describe('trend analysis', () => {
    it('should detect increasing error rate trend', () => {
      for (let i = 1; i <= 10; i++) {
        aggregator.addErrorRateMetrics({
          rate: i * 2, // Increasing rate
          totalRequests: 100,
          errorCount: i * 2,
          timestamp: i,
        })
      }

      const trend = aggregator.getErrorRateTrend()
      expect(trend).toBe('increasing')
    })

    it('should detect decreasing throughput trend', () => {
      for (let i = 10; i >= 1; i--) {
        aggregator.addThroughputMetrics({
          requestsPerMinute: i * 100,
          requestsPerSecond: i * 1.67,
          timeWindowMs: 60000,
          totalRequests: 1000,
          timestamp: 10 - i,
        })
      }

      const trend = aggregator.getThroughputTrend()
      expect(trend).toBe('decreasing')
    })

    it('should detect stable trend', () => {
      for (let i = 0; i < 10; i++) {
        aggregator.addErrorRateMetrics({
          rate: 5, // Constant rate
          totalRequests: 100,
          errorCount: 5,
          timestamp: i,
        })
      }

      const trend = aggregator.getErrorRateTrend()
      expect(trend).toBe('stable')
    })
  })

  describe('getTimeWeightedAverage', () => {
    it('should calculate time-weighted average', () => {
      const dataPoints: MetricDataPoint[] = [
        { value: 100, timestamp: 1000 },
        { value: 200, timestamp: 2000 },
        { value: 300, timestamp: 3000 },
      ]

      const result = aggregator.getTimeWeightedAverage(dataPoints)
      expect(result).toBe(200) // Simple case, equal intervals
    })

    it('should handle single data point', () => {
      const dataPoints: MetricDataPoint[] = [{ value: 100, timestamp: 1000 }]

      expect(aggregator.getTimeWeightedAverage(dataPoints)).toBe(100)
    })

    it('should handle empty array', () => {
      expect(aggregator.getTimeWeightedAverage([])).toBe(0)
    })
  })

  describe('reset', () => {
    it('should clear all history', () => {
      aggregator.addSystemMetrics({
        cpuUsage: 50,
        memoryUsage: 60,
        timestamp: Date.now(),
      })

      aggregator.reset()

      const history = aggregator.getHistory()
      expect(history.system.length).toBe(0)
    })
  })
})
