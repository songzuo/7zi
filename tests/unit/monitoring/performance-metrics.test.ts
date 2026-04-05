/**
 * Performance Monitoring Unit Tests
 * 性能监控单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock browser APIs
const mockPerformance = {
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  clearMarks: vi.fn(),
  now: vi.fn(() => Date.now()),
}

const mockMemory = {
  usedJSHeapSize: 50 * 1024 * 1024,
  totalJSHeapSize: 100 * 1024 * 1024,
}

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Test)',
  connection: {
    effectiveType: '4g',
  },
}

const mockWindow = {
  performance: mockPerformance,
  navigator: mockNavigator,
  location: {
    href: 'http://localhost:3000/test',
    pathname: '/test',
  },
  addEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}

global.window = mockWindow as unknown as Window & typeof globalThis
global.performance = mockPerformance as unknown as Performance

// ============================================
// 测试阈值配置
// ============================================

const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000, poor: 4000 },
  FID: { good: 100, needsImprovement: 300, poor: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25, poor: 0.25 },
  TTFB: { good: 800, needsImprovement: 1800, poor: 1800 },
  FCP: { good: 1800, needsImprovement: 3000, poor: 3000 },
  INP: { good: 200, needsImprovement: 500, poor: 500 },
}

// ============================================
// 测试辅助函数
// ============================================

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS]
  if (!threshold) return 'good'

  if (value <= threshold.good) return 'good'
  if (value <= threshold.needsImprovement) return 'needs-improvement'
  return 'poor'
}

function calculateScore(current: {
  LCP?: number
  CLS?: number
  INP?: number
  FID?: number
}): { overall: number; lcp: number; cls: number; inp: number; fid: number } {
  let lcpScore = 100
  let fidScore = 100
  let clsScore = 100
  let inpScore = 100

  if (current.LCP) {
    if (current.LCP <= 2500) lcpScore = 100
    else if (current.LCP <= 4000) lcpScore = 75 - ((current.LCP - 2500) / 1500) * 25
    else lcpScore = Math.max(0, 50 - ((current.LCP - 4000) / 2000) * 50)
  }

  if (current.FID) {
    if (current.FID <= 100) fidScore = 100
    else if (current.FID <= 300) fidScore = 75 - ((current.FID - 100) / 200) * 25
    else fidScore = Math.max(0, 50 - ((current.FID - 300) / 200) * 50)
  }

  if (current.CLS) {
    if (current.CLS <= 0.1) clsScore = 100
    else if (current.CLS <= 0.25) clsScore = 75 - ((current.CLS - 0.1) / 0.15) * 25
    else clsScore = Math.max(0, 50 - ((current.CLS - 0.25) / 0.25) * 50)
  }

  if (current.INP) {
    if (current.INP <= 200) inpScore = 100
    else if (current.INP <= 500) inpScore = 75 - ((current.INP - 200) / 300) * 25
    else inpScore = Math.max(0, 50 - ((current.INP - 500) / 500) * 50)
  }

  const overall = lcpScore * 0.25 + fidScore * 0.1 + clsScore * 0.25 + inpScore * 0.4

  return {
    overall: Math.round(overall),
    lcp: Math.round(lcpScore),
    fid: Math.round(fidScore),
    cls: Math.round(clsScore),
    inp: Math.round(inpScore),
  }
}

// ============================================
// 测试套件
// ============================================

describe('Performance Metrics', () => {
  describe('LCP (Largest Contentful Paint)', () => {
    it('should return "good" for LCP <= 2500ms', () => {
      expect(getRating('LCP', 2000)).toBe('good')
      expect(getRating('LCP', 2500)).toBe('good')
    })

    it('should return "needs-improvement" for 2500ms < LCP <= 4000ms', () => {
      expect(getRating('LCP', 3000)).toBe('needs-improvement')
      expect(getRating('LCP', 4000)).toBe('needs-improvement')
    })

    it('should return "poor" for LCP > 4000ms', () => {
      expect(getRating('LCP', 4500)).toBe('poor')
      expect(getRating('LCP', 5000)).toBe('poor')
    })
  })

  describe('CLS (Cumulative Layout Shift)', () => {
    it('should return "good" for CLS <= 0.1', () => {
      expect(getRating('CLS', 0.05)).toBe('good')
      expect(getRating('CLS', 0.1)).toBe('good')
    })

    it('should return "needs-improvement" for 0.1 < CLS <= 0.25', () => {
      expect(getRating('CLS', 0.15)).toBe('needs-improvement')
      expect(getRating('CLS', 0.25)).toBe('needs-improvement')
    })

    it('should return "poor" for CLS > 0.25', () => {
      expect(getRating('CLS', 0.3)).toBe('poor')
      expect(getRating('CLS', 0.5)).toBe('poor')
    })
  })

  describe('INP (Interaction to Next Paint)', () => {
    it('should return "good" for INP <= 200ms', () => {
      expect(getRating('INP', 100)).toBe('good')
      expect(getRating('INP', 200)).toBe('good')
    })

    it('should return "needs-improvement" for 200ms < INP <= 500ms', () => {
      expect(getRating('INP', 300)).toBe('needs-improvement')
      expect(getRating('INP', 500)).toBe('needs-improvement')
    })

    it('should return "poor" for INP > 500ms', () => {
      expect(getRating('INP', 600)).toBe('poor')
      expect(getRating('INP', 1000)).toBe('poor')
    })
  })

  describe('TTFB (Time to First Byte)', () => {
    it('should return "good" for TTFB <= 800ms', () => {
      expect(getRating('TTFB', 500)).toBe('good')
      expect(getRating('TTFB', 800)).toBe('good')
    })

    it('should return "needs-improvement" for 800ms < TTFB <= 1800ms', () => {
      expect(getRating('TTFB', 1000)).toBe('needs-improvement')
      expect(getRating('TTFB', 1800)).toBe('needs-improvement')
    })

    it('should return "poor" for TTFB > 1800ms', () => {
      expect(getRating('TTFB', 2000)).toBe('poor')
      expect(getRating('TTFB', 3000)).toBe('poor')
    })
  })

  describe('FCP (First Contentful Paint)', () => {
    it('should return "good" for FCP <= 1800ms', () => {
      expect(getRating('FCP', 1000)).toBe('good')
      expect(getRating('FCP', 1800)).toBe('good')
    })

    it('should return "needs-improvement" for 1800ms < FCP <= 3000ms', () => {
      expect(getRating('FCP', 2000)).toBe('needs-improvement')
      expect(getRating('FCP', 3000)).toBe('needs-improvement')
    })

    it('should return "poor" for FCP > 3000ms', () => {
      expect(getRating('FCP', 3500)).toBe('poor')
      expect(getRating('FCP', 5000)).toBe('poor')
    })
  })
})

describe('Performance Score Calculation', () => {
  it('should calculate perfect score for all good metrics', () => {
    const score = calculateScore({
      LCP: 2000,
      CLS: 0.05,
      INP: 100,
      FID: 50,
    })

    expect(score.overall).toBe(100)
    expect(score.lcp).toBe(100)
    expect(score.cls).toBe(100)
    expect(score.inp).toBe(100)
    expect(score.fid).toBe(100)
  })

  it('should calculate reduced score for needs-improvement metrics', () => {
    const score = calculateScore({
      LCP: 3000,
      CLS: 0.15,
      INP: 300,
      FID: 200,
    })

    expect(score.overall).toBeLessThan(100)
    expect(score.overall).toBeGreaterThan(50)
  })

  it('should calculate low score for poor metrics', () => {
    const score = calculateScore({
      LCP: 5000,
      CLS: 0.3,
      INP: 600,
      FID: 400,
    })

    expect(score.overall).toBeLessThan(50)
  })

  it('should handle undefined metrics', () => {
    const score = calculateScore({})

    expect(score.overall).toBe(100)
    expect(score.lcp).toBe(100)
  })
})

describe('Alert Thresholds', () => {
  interface AlertRule {
    name: string
    metricName: string
    threshold: number
    comparison: 'gt' | 'gte' | 'lt' | 'lte'
    level: 'info' | 'warning' | 'critical'
  }

  const rules: AlertRule[] = [
    { name: 'LCP Critical', metricName: 'LCP', threshold: 4000, comparison: 'gt', level: 'critical' },
    { name: 'LCP Warning', metricName: 'LCP', threshold: 2500, comparison: 'gt', level: 'warning' },
    { name: 'CLS Critical', metricName: 'CLS', threshold: 0.25, comparison: 'gt', level: 'critical' },
    { name: 'CLS Warning', metricName: 'CLS', threshold: 0.1, comparison: 'gt', level: 'warning' },
    { name: 'INP Critical', metricName: 'INP', threshold: 500, comparison: 'gt', level: 'critical' },
    { name: 'INP Warning', metricName: 'INP', threshold: 200, comparison: 'gt', level: 'warning' },
  ]

  function checkAlert(metricName: string, value: number): AlertRule | null {
    for (const rule of rules) {
      if (rule.metricName !== metricName) continue

      let triggered = false
      switch (rule.comparison) {
        case 'gt':
          triggered = value > rule.threshold
          break
        case 'gte':
          triggered = value >= rule.threshold
          break
        case 'lt':
          triggered = value < rule.threshold
          break
        case 'lte':
          triggered = value <= rule.threshold
          break
      }

      if (triggered) {
        return rule
      }
    }
    return null
  }

  it('should trigger LCP warning at 2500ms', () => {
    const alert = checkAlert('LCP', 3000)
    expect(alert).not.toBeNull()
    expect(alert?.level).toBe('warning')
  })

  it('should trigger LCP critical at 4000ms', () => {
    const alert = checkAlert('LCP', 4500)
    expect(alert).not.toBeNull()
    expect(alert?.level).toBe('critical')
  })

  it('should trigger CLS warning at 0.1', () => {
    const alert = checkAlert('CLS', 0.15)
    expect(alert).not.toBeNull()
    expect(alert?.level).toBe('warning')
  })

  it('should trigger CLS critical at 0.25', () => {
    const alert = checkAlert('CLS', 0.3)
    expect(alert).not.toBeNull()
    expect(alert?.level).toBe('critical')
  })

  it('should trigger INP warning at 200ms', () => {
    const alert = checkAlert('INP', 300)
    expect(alert).not.toBeNull()
    expect(alert?.level).toBe('warning')
  })

  it('should trigger INP critical at 500ms', () => {
    const alert = checkAlert('INP', 600)
    expect(alert).not.toBeNull()
    expect(alert?.level).toBe('critical')
  })

  it('should not trigger alert for good values', () => {
    expect(checkAlert('LCP', 2000)).toBeNull()
    expect(checkAlert('CLS', 0.05)).toBeNull()
    expect(checkAlert('INP', 100)).toBeNull()
  })
})

describe('Trend Analysis', () => {
  interface TrendData {
    timestamp: number
    score: number
  }

  function calculateTrend(data: TrendData[]): { trend: 'improving' | 'stable' | 'degrading'; changePercent: number } {
    if (data.length < 2) {
      return { trend: 'stable', changePercent: 0 }
    }

    const firstScore = data[0].score
    const lastScore = data[data.length - 1].score
    const changePercent = ((lastScore - firstScore) / firstScore) * 100

    let trend: 'improving' | 'stable' | 'degrading'
    if (changePercent > 5) {
      trend = 'improving'
    } else if (changePercent < -5) {
      trend = 'degrading'
    } else {
      trend = 'stable'
    }

    return { trend, changePercent }
  }

  it('should detect improving trend', () => {
    const data = [
      { timestamp: Date.now() - 10000, score: 70 },
      { timestamp: Date.now() - 5000, score: 80 },
      { timestamp: Date.now(), score: 90 },
    ]

    const result = calculateTrend(data)

    expect(result.trend).toBe('improving')
    expect(result.changePercent).toBeGreaterThan(0)
  })

  it('should detect degrading trend', () => {
    const data = [
      { timestamp: Date.now() - 10000, score: 90 },
      { timestamp: Date.now() - 5000, score: 80 },
      { timestamp: Date.now(), score: 70 },
    ]

    const result = calculateTrend(data)

    expect(result.trend).toBe('degrading')
    expect(result.changePercent).toBeLessThan(0)
  })

  it('should detect stable trend', () => {
    const data = [
      { timestamp: Date.now() - 10000, score: 80 },
      { timestamp: Date.now() - 5000, score: 81 },
      { timestamp: Date.now(), score: 79 },
    ]

    const result = calculateTrend(data)

    expect(result.trend).toBe('stable')
    expect(Math.abs(result.changePercent)).toBeLessThan(5)
  })

  it('should handle empty data', () => {
    const result = calculateTrend([])

    expect(result.trend).toBe('stable')
    expect(result.changePercent).toBe(0)
  })

  it('should handle single data point', () => {
    const result = calculateTrend([{ timestamp: Date.now(), score: 80 }])

    expect(result.trend).toBe('stable')
    expect(result.changePercent).toBe(0)
  })
})

describe('Memory Metrics', () => {
  interface MemoryMetrics {
    usedJSHeapSize: number
    totalJSHeapSize: number
  }

  function calculateMemoryUsage(memory: MemoryMetrics): {
    usedMB: number
    totalMB: number
    usagePercent: number
    status: 'good' | 'warning' | 'critical'
  } {
    const usedMB = memory.usedJSHeapSize / (1024 * 1024)
    const totalMB = memory.totalJSHeapSize / (1024 * 1024)
    const usagePercent = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100

    let status: 'good' | 'warning' | 'critical'
    if (usagePercent < 50) {
      status = 'good'
    } else if (usagePercent < 80) {
      status = 'warning'
    } else {
      status = 'critical'
    }

    return { usedMB, totalMB, usagePercent, status }
  }

  it('should calculate memory usage correctly', () => {
    const memory = {
      usedJSHeapSize: 40 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
    }

    const result = calculateMemoryUsage(memory)

    expect(result.usedMB).toBe(40)
    expect(result.totalMB).toBe(100)
    expect(result.usagePercent).toBe(40)
    expect(result.status).toBe('good')
  })

  it('should return warning for 50-80% usage', () => {
    const memory = {
      usedJSHeapSize: 65 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
    }

    const result = calculateMemoryUsage(memory)

    expect(result.status).toBe('warning')
  })

  it('should return critical for >80% usage', () => {
    const memory = {
      usedJSHeapSize: 90 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
    }

    const result = calculateMemoryUsage(memory)

    expect(result.status).toBe('critical')
  })
})

describe('Long Task Detection', () => {
  interface LongTaskEntry {
    duration: number
    startTime: number
    name: string
  }

  function analyzeLongTasks(tasks: LongTaskEntry[]): {
    count: number
    totalDuration: number
    avgDuration: number
    criticalCount: number
    warningCount: number
  } {
    const criticalTasks = tasks.filter(t => t.duration > 300)
    const warningTasks = tasks.filter(t => t.duration > 100 && t.duration <= 300)
    const totalDuration = tasks.reduce((sum, t) => sum + t.duration, 0)

    return {
      count: tasks.length,
      totalDuration,
      avgDuration: tasks.length > 0 ? totalDuration / tasks.length : 0,
      criticalCount: criticalTasks.length,
      warningCount: warningTasks.length,
    }
  }

  it('should count long tasks correctly', () => {
    const tasks = [
      { duration: 50, startTime: 100, name: 'task1' },
      { duration: 150, startTime: 200, name: 'task2' },
      { duration: 350, startTime: 400, name: 'task3' },
    ]

    const result = analyzeLongTasks(tasks)

    expect(result.count).toBe(3)
    expect(result.warningCount).toBe(1)
    expect(result.criticalCount).toBe(1)
  })

  it('should handle empty tasks', () => {
    const result = analyzeLongTasks([])

    expect(result.count).toBe(0)
    expect(result.avgDuration).toBe(0)
  })
})
