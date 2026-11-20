// @ts-nocheck
/**
 * Tests for Performance Trend Data Aggregation
 * 性能趋势数据聚合测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type {
  TeamEfficiencyMetrics,
  RealtimePerformanceMetrics,
} from '@/lib/types/analytics/realtime'

/**
 * Performance Trend Aggregation Types
 */
export interface TrendAggregationOptions {
  timeWindow?: number // Time window in milliseconds
  minSamples?: number // Minimum number of samples required
  smoothingFactor?: number // Exponential smoothing factor (0-1)
}

export interface AggregatedTrend {
  metricName: string
  currentValue: number
  previousValue: number
  change: number
  changePercentage: number
  trend: 'up' | 'down' | 'stable'
  confidence: 'high' | 'medium' | 'low'
  samples: number
}

export interface TrendSnapshot {
  timestamp: number
  metrics: TeamEfficiencyMetrics
}

/**
 * Aggregate performance trend data over time window
 */
function aggregateTrend(
  metricName: keyof TeamEfficiencyMetrics,
  snapshots: TrendSnapshot[],
  options: TrendAggregationOptions = {}
): AggregatedTrend | null {
  const {
    timeWindow = 3600000, // Default 1 hour
    minSamples = 2,
    smoothingFactor = 0.5,
  } = options

  if (snapshots.length < minSamples) {
    return null
  }

  const now = Date.now()
  const windowStart = now - timeWindow

  // Filter snapshots within time window
  const filteredSnapshots = snapshots.filter(s => s.timestamp >= windowStart)

  if (filteredSnapshots.length < minSamples) {
    return null
  }

  // Sort by timestamp
  const sortedSnapshots = [...filteredSnapshots].sort((a, b) => a.timestamp - b.timestamp)

  // Get current (latest) and previous (earliest) values
  const latest = sortedSnapshots[sortedSnapshots.length - 1]
  const earliest = sortedSnapshots[0]

  const currentValue = latest.metrics[metricName] as number
  const previousValue = earliest.metrics[metricName] as number

  // Calculate change
  const change = currentValue - previousValue
  const changePercentage =
    previousValue !== 0 ? (change / previousValue) * 100 : currentValue > 0 ? 100 : 0

  // Determine trend direction
  let trend: 'up' | 'down' | 'stable'
  if (Math.abs(changePercentage) < 0.1) {
    trend = 'stable'
  } else if (changePercentage > 0) {
    trend = 'up'
  } else {
    trend = 'down'
  }

  // Calculate confidence based on samples and time spread
  const timeSpread = latest.timestamp - earliest.timestamp
  const confidence: 'high' | 'medium' | 'low' =
    filteredSnapshots.length >= 5 && timeSpread >= timeWindow * 0.75
      ? 'high'
      : filteredSnapshots.length >= 3 && timeSpread >= timeWindow * 0.5
        ? 'medium'
        : 'low'

  return {
    metricName,
    currentValue,
    previousValue,
    change,
    changePercentage,
    trend,
    confidence,
    samples: filteredSnapshots.length,
  }
}

/**
 * Aggregate multiple metrics trends
 */
function aggregateMultipleTrends(
  snapshots: TrendSnapshot[],
  metricNames: (keyof TeamEfficiencyMetrics)[],
  options?: TrendAggregationOptions
): AggregatedTrend[] {
  return metricNames
    .map(metricName => aggregateTrend(metricName, snapshots, options))
    .filter((trend): trend is AggregatedTrend => trend !== null)
}

/**
 * Calculate moving average for trend smoothing
 */
function calculateMovingAverage(
  metricName: keyof TeamEfficiencyMetrics,
  snapshots: TrendSnapshot[],
  windowSize: number = 3
): number | null {
  if (snapshots.length < windowSize) {
    return null
  }

  const sortedSnapshots = [...snapshots]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-windowSize)

  const sum = sortedSnapshots.reduce((acc, s) => acc + (s.metrics[metricName] as number), 0)
  return sum / windowSize
}

/**
 * Detect trend reversal (e.g., from up to down)
 */
function detectTrendReversal(
  metricName: keyof TeamEfficiencyMetrics,
  snapshots: TrendSnapshot[],
  minReversalThreshold: number = 10 // Minimum 10% change to consider reversal
): boolean {
  if (snapshots.length < 3) {
    return false
  }

  const sortedSnapshots = [...snapshots].sort((a, b) => a.timestamp - b.timestamp).slice(-3)

  const [first, second, third] = sortedSnapshots

  const firstValue = first.metrics[metricName] as number
  const secondValue = second.metrics[metricName] as number
  const thirdValue = third.metrics[metricName] as number

  const firstToSecond = ((secondValue - firstValue) / firstValue) * 100
  const secondToThird = ((thirdValue - secondValue) / secondValue) * 100

  // Check if trend changed direction significantly
  const firstTrend = Math.sign(firstToSecond)
  const secondTrend = Math.sign(secondToThird)

  return (
    firstTrend !== 0 &&
    secondTrend !== 0 &&
    firstTrend !== secondTrend &&
    Math.abs(firstToSecond - secondToThird) > minReversalThreshold
  )
}

/**
 * Calculate trend velocity (rate of change)
 */
function calculateTrendVelocity(
  metricName: keyof TeamEfficiencyMetrics,
  snapshots: TrendSnapshot[],
  timeWindow: number = 3600000 // 1 hour
): number | null {
  if (snapshots.length < 2) {
    return null
  }

  const sortedSnapshots = [...snapshots].sort((a, b) => a.timestamp - b.timestamp)

  const latest = sortedSnapshots[sortedSnapshots.length - 1]
  const earliest = sortedSnapshots[0]

  const valueChange =
    (latest.metrics[metricName] as number) - (earliest.metrics[metricName] as number)
  const timeChange = latest.timestamp - earliest.timestamp

  if (timeChange === 0) return null

  // Calculate velocity per hour
  const velocityPerHour = (valueChange / timeChange) * timeWindow

  return velocityPerHour
}

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { logger } from '@/lib/logger'

describe('aggregateTrend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const baseTimestamp = Date.now()
  const snapshots: TrendSnapshot[] = [
    {
      timestamp: baseTimestamp - 3600000 * 2, // 2 hours ago
      metrics: {
        timestamp: new Date(baseTimestamp - 3600000 * 2).toISOString(),
        agentsOnline: 8,
        agentsIdle: 2,
        agentsWorking: 6,
        tasksPerHour: 80,
        averageTaskDuration: 35,
        taskSuccessRate: 90,
        throughput: 800,
        queueSize: 3,
      },
    },
    {
      timestamp: baseTimestamp - 3600000, // 1 hour ago
      metrics: {
        timestamp: new Date(baseTimestamp - 3600000).toISOString(),
        agentsOnline: 9,
        agentsIdle: 2,
        agentsWorking: 7,
        tasksPerHour: 90,
        averageTaskDuration: 33,
        taskSuccessRate: 92,
        throughput: 900,
        queueSize: 4,
      },
    },
    {
      timestamp: baseTimestamp, // Now
      metrics: {
        timestamp: new Date(baseTimestamp).toISOString(),
        agentsOnline: 10,
        agentsIdle: 2,
        agentsWorking: 8,
        tasksPerHour: 100,
        averageTaskDuration: 30,
        taskSuccessRate: 95,
        throughput: 1000,
        queueSize: 5,
      },
    },
  ]

  it('should aggregate trend for a single metric', () => {
    const result = aggregateTrend('tasksPerHour', snapshots, { timeWindow: 3600000 * 3 }) // 3 hours

    expect(result).not.toBeNull()
    expect(result?.metricName).toBe('tasksPerHour')
    expect(result?.currentValue).toBe(100)
    expect(result?.previousValue).toBe(80)
    expect(result?.change).toBe(20)
    expect(result?.changePercentage).toBe(25)
    expect(result?.trend).toBe('up')
  })

  it('should calculate confidence level based on samples', () => {
    const result = aggregateTrend('tasksPerHour', snapshots, { timeWindow: 3600000 * 3 })
    expect(result?.confidence).toBe('medium') // 3 samples
  })

  it('should return null when insufficient samples', () => {
    const insufficientSnapshots = snapshots.slice(0, 1)
    const result = aggregateTrend('tasksPerHour', insufficientSnapshots)
    expect(result).toBeNull()
  })

  it('should respect minSamples option', () => {
    const result = aggregateTrend('tasksPerHour', snapshots, { minSamples: 5 })
    expect(result).toBeNull()
  })

  it('should filter by time window', () => {
    const recentSnapshots = snapshots.filter(s => s.timestamp >= baseTimestamp - 1800000) // Last 30 min
    const result = aggregateTrend('tasksPerHour', recentSnapshots)
    expect(result).toBeNull() // Only 1 sample in window
  })

  it('should handle negative trends', () => {
    const decreasingSnapshots: TrendSnapshot[] = [
      {
        timestamp: baseTimestamp - 3600000 * 2,
        metrics: {
          timestamp: new Date(baseTimestamp - 3600000 * 2).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 100,
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 1000,
          queueSize: 5,
        },
      },
      {
        timestamp: baseTimestamp,
        metrics: {
          timestamp: new Date(baseTimestamp).toISOString(),
          agentsOnline: 8,
          agentsIdle: 2,
          agentsWorking: 6,
          tasksPerHour: 80,
          averageTaskDuration: 35,
          taskSuccessRate: 90,
          throughput: 800,
          queueSize: 3,
        },
      },
    ]

    const result = aggregateTrend('tasksPerHour', decreasingSnapshots, { timeWindow: 3600000 * 3 })
    expect(result?.trend).toBe('down')
    expect(result?.changePercentage).toBe(-20)
  })

  it('should detect stable trend for small changes', () => {
    const stableSnapshots: TrendSnapshot[] = [
      {
        timestamp: baseTimestamp - 3600000 * 2,
        metrics: {
          timestamp: new Date(baseTimestamp - 3600000 * 2).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 100,
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 1000,
          queueSize: 5,
        },
      },
      {
        timestamp: baseTimestamp,
        metrics: {
          timestamp: new Date(baseTimestamp).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 100.1, // 0.1% change
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 1000,
          queueSize: 5,
        },
      },
    ]

    const result = aggregateTrend('tasksPerHour', stableSnapshots, { timeWindow: 3600000 * 3 })
    expect(result?.trend).toBe('stable')
  })

  it('should handle zero previous value', () => {
    const zeroPreviousSnapshots: TrendSnapshot[] = [
      {
        timestamp: baseTimestamp - 3600000 * 2,
        metrics: {
          timestamp: new Date(baseTimestamp - 3600000 * 2).toISOString(),
          agentsOnline: 0,
          agentsIdle: 0,
          agentsWorking: 0,
          tasksPerHour: 0,
          averageTaskDuration: 0,
          taskSuccessRate: 0,
          throughput: 0,
          queueSize: 0,
        },
      },
      {
        timestamp: baseTimestamp,
        metrics: {
          timestamp: new Date(baseTimestamp).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 100,
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 1000,
          queueSize: 5,
        },
      },
    ]

    const result = aggregateTrend('tasksPerHour', zeroPreviousSnapshots, {
      timeWindow: 3600000 * 3,
    })
    expect(result?.changePercentage).toBe(100)
  })
})

describe('aggregateMultipleTrends', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const baseTimestamp = Date.now()
  const snapshots: TrendSnapshot[] = [
    {
      timestamp: baseTimestamp - 3600000,
      metrics: {
        timestamp: new Date(baseTimestamp - 3600000).toISOString(),
        agentsOnline: 8,
        agentsIdle: 2,
        agentsWorking: 6,
        tasksPerHour: 80,
        averageTaskDuration: 35,
        taskSuccessRate: 90,
        throughput: 800,
        queueSize: 3,
      },
    },
    {
      timestamp: baseTimestamp,
      metrics: {
        timestamp: new Date(baseTimestamp).toISOString(),
        agentsOnline: 10,
        agentsIdle: 2,
        agentsWorking: 8,
        tasksPerHour: 100,
        averageTaskDuration: 30,
        taskSuccessRate: 95,
        throughput: 1000,
        queueSize: 5,
      },
    },
  ]

  it('should aggregate trends for multiple metrics', () => {
    const metricNames: (keyof TeamEfficiencyMetrics)[] = [
      'tasksPerHour',
      'taskSuccessRate',
      'throughput',
      'averageTaskDuration',
    ]

    const results = aggregateMultipleTrends(snapshots, metricNames, { timeWindow: 3600000 * 2 })

    expect(results).toHaveLength(4)
    expect(results[0].metricName).toBe('tasksPerHour')
    expect(results[1].metricName).toBe('taskSuccessRate')
    expect(results[2].metricName).toBe('throughput')
    expect(results[3].metricName).toBe('averageTaskDuration')
  })

  it('should filter out null results', () => {
    const metricNames: (keyof TeamEfficiencyMetrics)[] = ['tasksPerHour', 'taskSuccessRate']

    const results = aggregateMultipleTrends(snapshots, metricNames, { timeWindow: 3600000 * 2 })

    expect(results.every(r => r !== null)).toBe(true)
  })

  it('should return empty array for insufficient snapshots', () => {
    const insufficientSnapshots = snapshots.slice(0, 1)
    const metricNames: (keyof TeamEfficiencyMetrics)[] = ['tasksPerHour']

    const results = aggregateMultipleTrends(insufficientSnapshots, metricNames, {
      timeWindow: 3600000 * 2,
    })

    expect(results).toHaveLength(0)
  })
})

describe('calculateMovingAverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const baseTimestamp = Date.now()
  const snapshots: TrendSnapshot[] = [
    {
      timestamp: baseTimestamp - 7200000,
      metrics: {
        timestamp: new Date(baseTimestamp - 7200000).toISOString(),
        agentsOnline: 8,
        agentsIdle: 2,
        agentsWorking: 6,
        tasksPerHour: 80,
        averageTaskDuration: 35,
        taskSuccessRate: 90,
        throughput: 800,
        queueSize: 3,
      },
    },
    {
      timestamp: baseTimestamp - 3600000,
      metrics: {
        timestamp: new Date(baseTimestamp - 3600000).toISOString(),
        agentsOnline: 9,
        agentsIdle: 2,
        agentsWorking: 7,
        tasksPerHour: 90,
        averageTaskDuration: 33,
        taskSuccessRate: 92,
        throughput: 900,
        queueSize: 4,
      },
    },
    {
      timestamp: baseTimestamp,
      metrics: {
        timestamp: new Date(baseTimestamp).toISOString(),
        agentsOnline: 10,
        agentsIdle: 2,
        agentsWorking: 8,
        tasksPerHour: 100,
        averageTaskDuration: 30,
        taskSuccessRate: 95,
        throughput: 1000,
        queueSize: 5,
      },
    },
  ]

  it('should calculate moving average for default window size (3)', () => {
    const result = calculateMovingAverage('tasksPerHour', snapshots)
    expect(result).toBe((80 + 90 + 100) / 3)
  })

  it('should calculate moving average for custom window size', () => {
    const result = calculateMovingAverage('tasksPerHour', snapshots, 2)
    expect(result).toBe((90 + 100) / 2)
  })

  it('should return null for insufficient samples', () => {
    const insufficientSnapshots = snapshots.slice(0, 2)
    const result = calculateMovingAverage('tasksPerHour', insufficientSnapshots, 3)
    expect(result).toBeNull()
  })

  it('should use most recent snapshots', () => {
    const result = calculateMovingAverage('tasksPerHour', snapshots, 2)
    expect(result).toBe(95) // Average of 90 and 100
  })
})

describe('detectTrendReversal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const baseTimestamp = Date.now()

  it('should detect trend reversal from up to down', () => {
    const reversalSnapshots: TrendSnapshot[] = [
      {
        timestamp: baseTimestamp - 7200000,
        metrics: {
          timestamp: new Date(baseTimestamp - 7200000).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 80,
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 800,
          queueSize: 3,
        },
      },
      {
        timestamp: baseTimestamp - 3600000,
        metrics: {
          timestamp: new Date(baseTimestamp - 3600000).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 100, // Up 25%
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 1000,
          queueSize: 4,
        },
      },
      {
        timestamp: baseTimestamp,
        metrics: {
          timestamp: new Date(baseTimestamp).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 85, // Down 15% (reversal)
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 850,
          queueSize: 5,
        },
      },
    ]

    const result = detectTrendReversal('tasksPerHour', reversalSnapshots)
    expect(result).toBe(true)
  })

  it('should not detect reversal for stable trend', () => {
    const stableSnapshots: TrendSnapshot[] = [
      {
        timestamp: baseTimestamp - 7200000,
        metrics: {
          timestamp: new Date(baseTimestamp - 7200000).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 80,
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 800,
          queueSize: 3,
        },
      },
      {
        timestamp: baseTimestamp - 3600000,
        metrics: {
          timestamp: new Date(baseTimestamp - 3600000).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 85,
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 850,
          queueSize: 4,
        },
      },
      {
        timestamp: baseTimestamp,
        metrics: {
          timestamp: new Date(baseTimestamp).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 90, // Still up
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 900,
          queueSize: 5,
        },
      },
    ]

    const result = detectTrendReversal('tasksPerHour', stableSnapshots)
    expect(result).toBe(false)
  })

  it('should return null for insufficient snapshots', () => {
    const insufficientSnapshots: TrendSnapshot[] = [
      {
        timestamp: baseTimestamp - 3600000,
        metrics: {
          timestamp: new Date(baseTimestamp - 3600000).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 80,
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 800,
          queueSize: 3,
        },
      },
      {
        timestamp: baseTimestamp,
        metrics: {
          timestamp: new Date(baseTimestamp).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 100,
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 1000,
          queueSize: 5,
        },
      },
    ]

    const result = detectTrendReversal('tasksPerHour', insufficientSnapshots)
    expect(result).toBe(false)
  })
})

describe('calculateTrendVelocity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const baseTimestamp = Date.now()
  const snapshots: TrendSnapshot[] = [
    {
      timestamp: baseTimestamp - 3600000,
      metrics: {
        timestamp: new Date(baseTimestamp - 3600000).toISOString(),
        agentsOnline: 10,
        agentsIdle: 2,
        agentsWorking: 8,
        tasksPerHour: 80,
        averageTaskDuration: 30,
        taskSuccessRate: 95,
        throughput: 800,
        queueSize: 3,
      },
    },
    {
      timestamp: baseTimestamp,
      metrics: {
        timestamp: new Date(baseTimestamp).toISOString(),
        agentsOnline: 10,
        agentsIdle: 2,
        agentsWorking: 8,
        tasksPerHour: 100,
        averageTaskDuration: 30,
        taskSuccessRate: 95,
        throughput: 1000,
        queueSize: 5,
      },
    },
  ]

  it('should calculate positive trend velocity', () => {
    const result = calculateTrendVelocity('tasksPerHour', snapshots)
    expect(result).toBe(20) // 100 - 80 = +20 tasks/hour
  })

  it('should calculate negative trend velocity', () => {
    const decreasingSnapshots: TrendSnapshot[] = [
      {
        timestamp: baseTimestamp - 3600000,
        metrics: {
          timestamp: new Date(baseTimestamp - 3600000).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 100,
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 1000,
          queueSize: 3,
        },
      },
      {
        timestamp: baseTimestamp,
        metrics: {
          timestamp: new Date(baseTimestamp).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 80,
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 800,
          queueSize: 5,
        },
      },
    ]

    const result = calculateTrendVelocity('tasksPerHour', decreasingSnapshots)
    expect(result).toBe(-20)
  })

  it('should return null for single snapshot', () => {
    const singleSnapshot = [snapshots[0]]
    const result = calculateTrendVelocity('tasksPerHour', singleSnapshot)
    expect(result).toBeNull()
  })

  it('should calculate velocity per hour for different time windows', () => {
    // 30 minute change
    const halfHourSnapshots: TrendSnapshot[] = [
      {
        timestamp: baseTimestamp - 1800000,
        metrics: {
          timestamp: new Date(baseTimestamp - 1800000).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 80,
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 800,
          queueSize: 3,
        },
      },
      {
        timestamp: baseTimestamp,
        metrics: {
          timestamp: new Date(baseTimestamp).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 90,
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 900,
          queueSize: 5,
        },
      },
    ]

    const result = calculateTrendVelocity('tasksPerHour', halfHourSnapshots)
    expect(result).toBe(20) // 10 increase in 30min = 20/hour
  })
})

describe('Trend Aggregation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should provide comprehensive trend analysis', () => {
    const baseTimestamp = Date.now()
    const snapshots: TrendSnapshot[] = [
      {
        timestamp: baseTimestamp - 7200000,
        metrics: {
          timestamp: new Date(baseTimestamp - 7200000).toISOString(),
          agentsOnline: 8,
          agentsIdle: 2,
          agentsWorking: 6,
          tasksPerHour: 80,
          averageTaskDuration: 35,
          taskSuccessRate: 90,
          throughput: 800,
          queueSize: 3,
        },
      },
      {
        timestamp: baseTimestamp - 3600000,
        metrics: {
          timestamp: new Date(baseTimestamp - 3600000).toISOString(),
          agentsOnline: 9,
          agentsIdle: 2,
          agentsWorking: 7,
          tasksPerHour: 90,
          averageTaskDuration: 33,
          taskSuccessRate: 92,
          throughput: 900,
          queueSize: 4,
        },
      },
      {
        timestamp: baseTimestamp,
        metrics: {
          timestamp: new Date(baseTimestamp).toISOString(),
          agentsOnline: 10,
          agentsIdle: 2,
          agentsWorking: 8,
          tasksPerHour: 100,
          averageTaskDuration: 30,
          taskSuccessRate: 95,
          throughput: 1000,
          queueSize: 5,
        },
      },
    ]

    // Aggregate multiple trends
    const trends = aggregateMultipleTrends(
      snapshots,
      ['tasksPerHour', 'taskSuccessRate', 'throughput'],
      { timeWindow: 7200000 * 2 }
    )

    // Verify all trends are calculated
    expect(trends).toHaveLength(3)

    // All trends should be positive (up)
    trends.forEach(trend => {
      expect(trend.trend).toBe('up')
      expect(trend.changePercentage).toBeGreaterThan(0)
    })

    // Calculate moving average
    const movingAvg = calculateMovingAverage('tasksPerHour', snapshots)
    expect(movingAvg).toBe((80 + 90 + 100) / 3)

    // Calculate velocity
    const velocity = calculateTrendVelocity('tasksPerHour', snapshots, 7200000)
    expect(velocity).toBe(20)

    // Check for reversal (none in this case)
    const reversal = detectTrendReversal('tasksPerHour', snapshots)
    expect(reversal).toBe(false)
  })
})
