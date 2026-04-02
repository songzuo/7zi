/**
 * Tests for Optimized Metrics Aggregation
 * 优化的指标聚合测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getAggregatedMetrics,
  getGroupedAggregation,
  getMultiMetricAggregation,
  analyzeTrend,
  calculateMovingAverage,
  getPercentiles,
  type MetricDataPoint,
} from '../metrics-aggregation'

describe('getAggregatedMetrics', () => {
  const testData: MetricDataPoint[] = [
    { timestamp: 1000, value: 10 },
    { timestamp: 2000, value: 20 },
    { timestamp: 3000, value: 30 },
    { timestamp: 4000, value: 40 },
    { timestamp: 5000, value: 50 },
  ]

  it('should return null for empty data', () => {
    const result = getAggregatedMetrics([])
    expect(result).toBeNull()
  })

  it('should return null for null data', () => {
    const result = getAggregatedMetrics(null as any)
    expect(result).toBeNull()
  })

  it('should calculate basic statistics correctly', () => {
    const result = getAggregatedMetrics(testData)

    expect(result).not.toBeNull()
    expect(result?.count).toBe(5)
    expect(result?.sum).toBe(150)
    expect(result?.min).toBe(10)
    expect(result?.max).toBe(50)
    expect(result?.avg).toBe(30)
  })

  it('should track first and last values', () => {
    const result = getAggregatedMetrics(testData)

    expect(result?.first).toBe(10)
    expect(result?.last).toBe(50)
    expect(result?.firstTimestamp).toBe(1000)
    expect(result?.lastTimestamp).toBe(5000)
  })

  it('should calculate change and change percent', () => {
    const result = getAggregatedMetrics(testData)

    expect(result?.change).toBe(40)
    expect(result?.changePercent).toBe(400)
  })

  it('should filter by time window', () => {
    const result = getAggregatedMetrics(testData, {
      startTime: 2000,
      endTime: 4000,
    })

    expect(result?.count).toBe(3)
    expect(result?.sum).toBe(90)
    expect(result?.min).toBe(20)
    expect(result?.max).toBe(40)
  })

  it('should respect minSamples', () => {
    const result = getAggregatedMetrics(testData, {
      minSamples: 10,
    })

    expect(result).toBeNull()
  })

  it('should handle single data point', () => {
    const result = getAggregatedMetrics([{ timestamp: 1000, value: 42 }])

    expect(result?.count).toBe(1)
    expect(result?.sum).toBe(42)
    expect(result?.min).toBe(42)
    expect(result?.max).toBe(42)
    expect(result?.avg).toBe(42)
    expect(result?.first).toBe(42)
    expect(result?.last).toBe(42)
  })

  it('should handle negative values', () => {
    const data = [
      { timestamp: 1000, value: -10 },
      { timestamp: 2000, value: 0 },
      { timestamp: 3000, value: 10 },
    ]

    const result = getAggregatedMetrics(data)

    expect(result?.min).toBe(-10)
    expect(result?.max).toBe(10)
    expect(result?.avg).toBe(0)
  })

  it('should handle zero change percent when first is zero', () => {
    const data = [
      { timestamp: 1000, value: 0 },
      { timestamp: 2000, value: 10 },
    ]

    const result = getAggregatedMetrics(data)

    expect(result?.change).toBe(10)
    expect(result?.changePercent).toBe(100)
  })
})

describe('getGroupedAggregation', () => {
  const testData: MetricDataPoint[] = [
    { timestamp: 1000, value: 10, metadata: { group: 'A' } },
    { timestamp: 2000, value: 20, metadata: { group: 'A' } },
    { timestamp: 3000, value: 30, metadata: { group: 'B' } },
    { timestamp: 4000, value: 40, metadata: { group: 'B' } },
    { timestamp: 5000, value: 50, metadata: { group: 'A' } },
  ]

  it('should group by key extractor', () => {
    const result = getGroupedAggregation(testData, point => point.metadata?.group as string)

    expect(result.groups.size).toBe(2)

    const groupA = result.groups.get('A')
    expect(groupA?.count).toBe(3)
    expect(groupA?.sum).toBe(80)

    const groupB = result.groups.get('B')
    expect(groupB?.count).toBe(2)
    expect(groupB?.sum).toBe(70)
  })

  it('should calculate total aggregation', () => {
    const result = getGroupedAggregation(testData, point => point.metadata?.group as string)

    expect(result.total.count).toBe(5)
    expect(result.total.sum).toBe(150)
    expect(result.total.avg).toBe(30)
  })

  it('should filter by time window', () => {
    const result = getGroupedAggregation(testData, point => point.metadata?.group as string, {
      startTime: 2000,
      endTime: 4000,
    })

    expect(result.total.count).toBe(3)
  })
})

describe('getMultiMetricAggregation', () => {
  interface MultiMetricData {
    timestamp: number
    cpu: number
    memory: number
  }

  const testData: MultiMetricData[] = [
    { timestamp: 1000, cpu: 10, memory: 100 },
    { timestamp: 2000, cpu: 20, memory: 200 },
    { timestamp: 3000, cpu: 30, memory: 300 },
  ]

  it('should aggregate multiple metrics in single pass', () => {
    const extractors = new Map([
      ['cpu', (item: MultiMetricData) => ({ timestamp: item.timestamp, value: item.cpu })],
      ['memory', (item: MultiMetricData) => ({ timestamp: item.timestamp, value: item.memory })],
    ])

    const result = getMultiMetricAggregation(testData, extractors)

    expect(result.size).toBe(2)

    const cpu = result.get('cpu')
    expect(cpu?.count).toBe(3)
    expect(cpu?.sum).toBe(60)
    expect(cpu?.avg).toBe(20)

    const memory = result.get('memory')
    expect(memory?.count).toBe(3)
    expect(memory?.sum).toBe(600)
    expect(memory?.avg).toBe(200)
  })
})

describe('analyzeTrend', () => {
  it('should detect upward trend', () => {
    const metrics = {
      count: 5,
      sum: 150,
      min: 10,
      max: 50,
      avg: 30,
      first: 10,
      last: 50,
      firstTimestamp: 1000,
      lastTimestamp: 5000,
      change: 40,
      changePercent: 400,
    }

    const result = analyzeTrend(metrics)
    expect(result.trend).toBe('up')
    expect(result.slope).toBeGreaterThan(0)
  })

  it('should detect downward trend', () => {
    const metrics = {
      count: 5,
      sum: 150,
      min: 10,
      max: 50,
      avg: 30,
      first: 50,
      last: 10,
      firstTimestamp: 1000,
      lastTimestamp: 5000,
      change: -40,
      changePercent: -80,
    }

    const result = analyzeTrend(metrics)
    expect(result.trend).toBe('down')
    expect(result.slope).toBeLessThan(0)
  })

  it('should detect stable trend', () => {
    const metrics = {
      count: 5,
      sum: 150,
      min: 10,
      max: 50,
      avg: 30,
      first: 30,
      last: 30.02,
      firstTimestamp: 1000,
      lastTimestamp: 5000,
      change: 0.02,
      changePercent: 0.067, // Less than 0.1 threshold
    }

    const result = analyzeTrend(metrics)
    expect(result.trend).toBe('stable')
  })

  it('should calculate confidence based on sample count', () => {
    const metrics = {
      count: 10,
      sum: 150,
      min: 10,
      max: 50,
      avg: 30,
      first: 10,
      last: 50,
      firstTimestamp: 1000,
      lastTimestamp: 5000,
      change: 40,
      changePercent: 400,
    }

    const result = analyzeTrend(metrics)
    expect(result.confidence).toBe('high')
  })
})

describe('calculateMovingAverage', () => {
  const testData: MetricDataPoint[] = [
    { timestamp: 1000, value: 10 },
    { timestamp: 2000, value: 20 },
    { timestamp: 3000, value: 30 },
    { timestamp: 4000, value: 40 },
    { timestamp: 5000, value: 50 },
  ]

  it('should calculate moving average', () => {
    const result = calculateMovingAverage(testData, 3)

    expect(result.length).toBe(3)
    expect(result[0].value).toBe(20) // (10+20+30)/3
    expect(result[1].value).toBe(30) // (20+30+40)/3
    expect(result[2].value).toBe(40) // (30+40+50)/3
  })

  it('should return original data if window size > data length', () => {
    const result = calculateMovingAverage(testData, 10)

    expect(result.length).toBe(5)
  })
})

describe('getPercentiles', () => {
  const testData: MetricDataPoint[] = Array.from({ length: 100 }, (_, i) => ({
    timestamp: i * 1000,
    value: i,
  }))

  it('should calculate percentiles correctly', () => {
    const result = getPercentiles(testData, [50, 90, 95, 99])

    expect(result.get(50)).toBe(49)
    expect(result.get(90)).toBe(89)
    expect(result.get(95)).toBe(94)
    expect(result.get(99)).toBe(98)
  })

  it('should return zeros for empty data', () => {
    const result = getPercentiles([], [50, 90])

    expect(result.get(50)).toBe(0)
    expect(result.get(90)).toBe(0)
  })
})

describe('Performance', () => {
  it('should handle large datasets efficiently', () => {
    const largeData: MetricDataPoint[] = Array.from({ length: 10000 }, (_, i) => ({
      timestamp: i * 1000,
      value: Math.random() * 100,
    }))

    const start = performance.now()
    const result = getAggregatedMetrics(largeData)
    const duration = performance.now() - start

    expect(result).not.toBeNull()
    expect(result?.count).toBe(10000)
    expect(duration).toBeLessThan(100) // Should complete in < 100ms
  })
})
