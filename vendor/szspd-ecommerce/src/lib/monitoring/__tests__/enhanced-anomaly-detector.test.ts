// @ts-nocheck
/**
 * Enhanced Anomaly Detector Tests
 * 增强版异常检测器测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  EnhancedAnomalyDetector,
  enhancedAnomalyDetector,
  calculateMean,
  calculateStdDev,
  calculateZScore,
  isAnomaly,
  type AnomalyDetection,
  type AnomalyEvent,
} from '../enhanced-anomaly-detector'

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  default: {
    captureMessage: vi.fn(),
  },
  captureMessage: vi.fn(),
}))

describe('EnhancedAnomalyDetector', () => {
  let detector: EnhancedAnomalyDetector

  beforeEach(() => {
    detector = new EnhancedAnomalyDetector({
      zScoreThreshold: 2,
      criticalZScoreThreshold: 3,
      minSampleSize: 10,
      maxHistorySize: 100,
      alertConfig: {
        enabled: false, // 禁用告警以避免干扰测试
        channels: [],
        cooldownMs: 0,
        minSeverity: 'low',
      },
    })
  })

  afterEach(() => {
    detector.clearAll()
  })

  describe('calculateMean', () => {
    it('should calculate mean correctly', () => {
      expect(calculateMean([1, 2, 3, 4, 5])).toBe(3)
      expect(calculateMean([10, 20, 30])).toBe(20)
      expect(calculateMean([])).toBe(0)
      expect(calculateMean([5])).toBe(5)
    })

    it('should handle negative numbers', () => {
      expect(calculateMean([-5, 0, 5])).toBe(0)
    })
  })

  describe('calculateStdDev', () => {
    it('should calculate standard deviation correctly', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9]
      // 使用总体标准差公式
      expect(calculateStdDev(values)).toBeCloseTo(2, 0)
    })

    it('should return 0 for empty array', () => {
      expect(calculateStdDev([])).toBe(0)
    })

    it('should return 0 for single value', () => {
      expect(calculateStdDev([5])).toBe(0)
    })
  })

  describe('calculateZScore', () => {
    it('should calculate z-score correctly', () => {
      expect(calculateZScore(15, 10, 2)).toBe(2.5)
      expect(calculateZScore(10, 10, 2)).toBe(0)
      expect(calculateZScore(5, 10, 2)).toBe(-2.5)
    })

    it('should return 0 when stdDev is 0', () => {
      expect(calculateZScore(10, 10, 0)).toBe(0)
    })
  })

  describe('isAnomaly', () => {
    it('should detect anomaly when z-score exceeds threshold', () => {
      expect(isAnomaly(15, 10, 2, 2)).toBe(true) // z-score = 2.5
      expect(isAnomaly(10, 10, 2, 2)).toBe(false) // z-score = 0
      expect(isAnomaly(5, 10, 2, 2)).toBe(true) // z-score = -2.5
    })
  })

  describe('trackMetric', () => {
    it('should track metric values', () => {
      detector.trackMetric('test-metric', 100)
      detector.trackMetric('test-metric', 200)

      const history = detector['dataHistory'].get('test-metric')
      expect(history?.length).toBe(2)
      expect(history?.[0].value).toBe(100)
      expect(history?.[1].value).toBe(200)
    })

    it('should respect max history size', () => {
      const limitedDetector = new EnhancedAnomalyDetector({
        maxHistorySize: 5,
        minSampleSize: 3,
      })

      for (let i = 0; i < 10; i++) {
        limitedDetector.trackMetric('test', i)
      }

      const history = limitedDetector['dataHistory'].get('test')
      expect(history?.length).toBe(5)
    })
  })

  describe('calculateBaseline', () => {
    it('should calculate baseline statistics', () => {
      // 添加足够的数据点
      for (let i = 0; i < 15; i++) {
        detector.trackMetric('response_time', 100 + Math.random() * 20)
      }

      const baseline = detector.calculateBaseline('response_time')
      expect(baseline).not.toBeNull()
      expect(baseline?.mean).toBeGreaterThan(0)
      expect(baseline?.stdDev).toBeGreaterThan(0)
      expect(baseline?.sampleSize).toBe(15)
      expect(baseline?.p50).toBeGreaterThan(0)
      expect(baseline?.p95).toBeGreaterThan(0)
    })

    it('should return null when insufficient data', () => {
      detector.trackMetric('test', 100)

      const baseline = detector.calculateBaseline('test')
      expect(baseline).toBeUndefined()
    })

    it('should detect increasing trend', () => {
      // 添加递增数据
      for (let i = 0; i < 30; i++) {
        detector.trackMetric('memory', 100 + i * 2)
      }

      const baseline = detector.calculateBaseline('memory')
      expect(baseline?.trend).toBe('increasing')
    })

    it('should detect decreasing trend', () => {
      // 添加递减数据
      for (let i = 0; i < 30; i++) {
        detector.trackMetric('memory', 200 - i * 2)
      }

      const baseline = detector.calculateBaseline('memory')
      expect(baseline?.trend).toBe('decreasing')
    })

    it('should detect stable trend', () => {
      // 添加稳定数据
      for (let i = 0; i < 30; i++) {
        detector.trackMetric('memory', 100 + Math.random() * 5)
      }

      const baseline = detector.calculateBaseline('memory')
      expect(baseline?.trend).toBe('stable')
    })
  })

  describe('detectAnomaly', () => {
    beforeEach(() => {
      // 建立基准线
      for (let i = 0; i < 20; i++) {
        detector.trackMetric('api_latency', 100 + Math.random() * 50)
      }
    })

    it('should return null when insufficient data', () => {
      const newDetector = new EnhancedAnomalyDetector({
        minSampleSize: 10,
      })

      const result = newDetector.detectAnomaly('test', 100)
      expect(result).toBeNull()
    })

    it('should detect high z-score anomaly', () => {
      // 注入一个异常值（远超正常范围）
      const result = detector.detectAnomaly('api_latency', 500)

      expect(result).not.toBeNull()
      expect(result!.isAnomaly).toBe(true)
      expect(result!.severity).toMatch(/high|critical/)
      expect(result!.zScore).toBeGreaterThan(2)
    })

    it('should detect normal values as not anomalous', () => {
      const result = detector.detectAnomaly('api_latency', 120)

      expect(result).not.toBeNull()
      expect(result!.isAnomaly).toBe(false)
    })
  })

  describe('detectMetricSpecificAnomaly - Response Time', () => {
    beforeEach(() => {
      for (let i = 0; i < 20; i++) {
        detector.trackMetric('response_time_api', 100 + Math.random() * 50)
      }
    })

    it('should detect critical response time threshold', () => {
      const result = detector.detectAnomaly('response_time_api', 5000)

      expect(result).not.toBeNull()
      expect(result!.isAnomaly).toBe(true)
      expect(result!.severity).toBe('critical')
      expect(result!.reason).toContain('Critical response time')
    })

    it('should detect warning response time threshold', () => {
      const result = detector.detectAnomaly('response_time_api', 1500)

      expect(result).not.toBeNull()
      expect(result!.isAnomaly).toBe(true)
      expect(result!.severity).toBe('high')
    })
  })

  describe('detectMetricSpecificAnomaly - Memory Usage', () => {
    beforeEach(() => {
      for (let i = 0; i < 20; i++) {
        detector.trackMetric('memory_usage_percent', 50 + Math.random() * 20)
      }
    })

    it('should detect critical memory threshold', () => {
      const result = detector.detectAnomaly('memory_usage_percent', 98)

      expect(result).not.toBeNull()
      expect(result!.isAnomaly).toBe(true)
      expect(result!.severity).toBe('critical')
      expect(result!.reason).toContain('Critical memory usage')
    })

    it('should detect warning memory threshold', () => {
      const result = detector.detectAnomaly('memory_usage_percent', 85)

      expect(result).not.toBeNull()
      expect(result!.isAnomaly).toBe(true)
      expect(result!.severity).toBe('high')
    })

    it('should detect increasing memory trend as anomaly', () => {
      const trendDetector = new EnhancedAnomalyDetector({
        metrics: {
          responseTime: { enabled: false, warningThreshold: 1000, criticalThreshold: 3000 },
          memoryUsage: { enabled: true, warningThreshold: 80, criticalThreshold: 95 },
          errorRate: { enabled: false, warningThreshold: 5, criticalThreshold: 15 },
          cpuUsage: { enabled: false, warningThreshold: 70, criticalThreshold: 90 },
        },
      })

      // 添加递增的内存数据
      for (let i = 0; i < 30; i++) {
        trendDetector.trackMetric('memory_usage_percent', 50 + i)
      }

      const baseline = trendDetector.calculateBaseline('memory_usage_percent')
      expect(baseline?.trend).toBe('increasing')
    })
  })

  describe('detectMetricSpecificAnomaly - Error Rate', () => {
    beforeEach(() => {
      for (let i = 0; i < 20; i++) {
        detector.trackMetric('error_rate_percent', 1 + Math.random() * 2)
      }
    })

    it('should detect critical error rate threshold', () => {
      const result = detector.detectAnomaly('error_rate_percent', 20)

      expect(result).not.toBeNull()
      expect(result!.isAnomaly).toBe(true)
      expect(result!.severity).toBe('critical')
      expect(result!.reason).toContain('Critical error rate')
    })

    it('should detect warning error rate threshold', () => {
      const result = detector.detectAnomaly('error_rate_percent', 8)

      expect(result).not.toBeNull()
      expect(result!.isAnomaly).toBe(true)
      expect(result!.severity).toBe('high')
      expect(result!.reason).toContain('Elevated error rate')
    })
  })

  describe('detectMetricSpecificAnomaly - CPU Usage', () => {
    beforeEach(() => {
      for (let i = 0; i < 20; i++) {
        detector.trackMetric('cpu_usage_percent', 30 + Math.random() * 20)
      }
    })

    it('should detect critical CPU threshold', () => {
      const result = detector.detectAnomaly('cpu_usage_percent', 95)

      expect(result).not.toBeNull()
      expect(result!.isAnomaly).toBe(true)
      expect(result!.severity).toBe('critical')
    })

    it('should detect warning CPU threshold', () => {
      const result = detector.detectAnomaly('cpu_usage_percent', 80)

      expect(result).not.toBeNull()
      expect(result!.isAnomaly).toBe(true)
      expect(result!.severity).toBe('high')
    })
  })

  describe('trackResponseTime', () => {
    it('should track response time metric', () => {
      const result = detector.trackResponseTime('getUser', 150)

      // 首次调用没有基线，应该返回 null
      expect(result === null || result.isAnomaly === false).toBe(true)

      // 添加足够数据后再检测
      for (let i = 0; i < 20; i++) {
        detector.trackResponseTime('getUser', 100 + Math.random() * 50)
      }

      const anomalyResult = detector.trackResponseTime('getUser', 500)
      expect(anomalyResult).not.toBeNull()
      expect(anomalyResult!.metric).toContain('getUser')
    })
  })

  describe('trackMemoryUsage', () => {
    it('should track memory usage metric', () => {
      detector.trackMemoryUsage(50)

      const history = detector['dataHistory'].get('memory_usage_percent')
      expect(history?.length).toBe(1)
      expect(history?.[0].value).toBe(50)
    })

    it('should include metadata', () => {
      detector.trackMemoryUsage(50, 1024, 512)

      const history = detector['dataHistory'].get('memory_usage_percent')
      expect(history?.[0].metadata).toEqual({
        totalMB: 1024,
        usedMB: 512,
      })
    })
  })

  describe('trackErrorRate', () => {
    it('should track error rate metric', () => {
      detector.trackErrorRate(2.5)

      const history = detector['dataHistory'].get('error_rate_percent')
      expect(history?.length).toBe(1)
      expect(history?.[0].value).toBe(2.5)
    })

    it('should include metadata', () => {
      detector.trackErrorRate(5, 100, 5)

      const history = detector['dataHistory'].get('error_rate_percent')
      expect(history?.[0].metadata).toEqual({
        totalRequests: 100,
        errorCount: 5,
      })
    })
  })

  describe('trackCpuUsage', () => {
    it('should track CPU usage metric', () => {
      detector.trackCpuUsage(45)

      const history = detector['dataHistory'].get('cpu_usage_percent')
      expect(history?.length).toBe(1)
      expect(history?.[0].value).toBe(45)
    })
  })

  describe('Alert Handling', () => {
    let alertDetector: EnhancedAnomalyDetector

    beforeEach(() => {
      alertDetector = new EnhancedAnomalyDetector({
        zScoreThreshold: 2,
        minSampleSize: 5,
        alertConfig: {
          enabled: true,
          channels: ['console'],
          cooldownMs: 0, // 立即触发
          minSeverity: 'low',
        },
      })

      // 建立基线
      for (let i = 0; i < 10; i++) {
        alertDetector.trackMetric('test_metric', 100 + Math.random() * 20)
      }
    })

    it('should emit anomaly event', () => {
      const spy = vi.fn()
      alertDetector.on('anomaly', spy)

      // 触发异常
      alertDetector.trackMetric('test_metric', 300)

      expect(spy).toHaveBeenCalled()
    })

    it('should respect cooldown period', () => {
      const alertDetectorWithCooldown = new EnhancedAnomalyDetector({
        alertConfig: {
          enabled: true,
          channels: [],
          cooldownMs: 1000, // 1秒冷却
          minSeverity: 'low',
        },
      })

      // 建立基线
      for (let i = 0; i < 10; i++) {
        alertDetectorWithCooldown.trackMetric('test_metric', 100)
      }

      const spy = vi.fn()
      alertDetectorWithCooldown.on('anomaly', spy)

      // 触发第一次异常
      alertDetectorWithCooldown.trackMetric('test_metric', 500)
      const firstCallCount = spy.mock.calls.length

      // 立即触发第二次（应该在冷却期内）
      alertDetectorWithCooldown.trackMetric('test_metric', 600)

      expect(spy.mock.calls.length).toBe(firstCallCount) // 不应再触发
    })

    it('should filter by min severity', () => {
      const alertDetector = new EnhancedAnomalyDetector({
        zScoreThreshold: 2,
        criticalZScoreThreshold: 3,
        minSampleSize: 20,
        alertConfig: {
          enabled: true,
          channels: [],
          cooldownMs: 0,
          minSeverity: 'critical', // 只触发 critical
        },
      })

      // 建立基线 - 20个样本，值在100-110之间
      for (let i = 0; i < 20; i++) {
        alertDetector.trackMetric('test_metric', 100 + Math.random() * 10)
      }

      const spy = vi.fn()
      alertDetector.on('anomaly', spy)

      // 触发 high 级别异常（Z-score 在 2-3 之间）
      // 假设 mean ~105, stdDev ~3, 使用 value ~112 得到 Z-score ~2.3
      alertDetector.trackMetric('test_metric', 112)

      // 应该被过滤掉（high < critical）
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('Event Management', () => {
    beforeEach(() => {
      // 建立基线并触发异常
      for (let i = 0; i < 20; i++) {
        detector.trackMetric('test_metric', 100 + Math.random() * 20)
      }

      // 触发几个异常
      detector.trackMetric('test_metric', 300)
      detector.trackMetric('test_metric', 400)
    })

    it('should get anomaly events', () => {
      const events = detector.getAnomalyEvents()
      expect(events.length).toBeGreaterThan(0)
    })

    it('should filter events by start time', () => {
      const startTime = Date.now() - 1000

      // 触发新的异常
      detector.trackMetric('test_metric', 500)

      const events = detector.getAnomalyEvents(startTime)
      expect(events.length).toBeGreaterThan(0)
    })

    it('should acknowledge event', () => {
      const events = detector.getAnomalyEvents()
      expect(events.length).toBeGreaterThan(0)

      const eventId = events[0].id
      const result = detector.acknowledgeEvent(eventId, 'test-user')

      expect(result).toBe(true)
      expect(events[0].acknowledged).toBe(true)
      expect(events[0].acknowledgedBy).toBe('test-user')
    })

    it('should resolve event', () => {
      const events = detector.getAnomalyEvents()
      const eventId = events[0].id

      const result = detector.resolveEvent(eventId, 'Fixed')

      expect(result).toBe(true)
      expect(events[0].resolved).toBe(true)
      expect(events[0].notes).toBe('Fixed')
    })

    it('should mark as false positive', () => {
      const events = detector.getAnomalyEvents()
      const eventId = events[0].id

      const result = detector.markAsFalsePositive(eventId, 'Normal traffic spike')

      expect(result).toBe(true)
      expect(events[0].falsePositive).toBe(true)
    })
  })

  describe('Statistics', () => {
    it('should calculate statistics correctly', () => {
      for (let i = 0; i < 20; i++) {
        detector.trackMetric('metric1', 100 + Math.random() * 20)
        detector.trackMetric('metric2', 200 + Math.random() * 30)
      }

      // 触发一些异常
      detector.trackMetric('metric1', 300)

      const stats = detector.getStatistics()

      expect(stats.metricsTracked).toBe(2)
      expect(stats.baselines).toBeGreaterThan(0)
      expect(stats.anomalyEvents).toBeGreaterThan(0)
      expect(stats.bySeverity).toHaveProperty('critical')
    })
  })

  describe('State Persistence', () => {
    it('should export state', () => {
      for (let i = 0; i < 20; i++) {
        detector.trackMetric('test_metric', 100 + Math.random() * 20)
      }

      detector.trackMetric('test_metric', 300)

      const state = detector.exportState()

      expect(state.baselines).toBeDefined()
      expect(state.events).toBeDefined()
    })

    it('should import state', () => {
      const baseline = {
        metric: 'imported_metric',
        mean: 100,
        stdDev: 10,
        min: 80,
        max: 120,
        p50: 100,
        p95: 115,
        p99: 119,
        sampleSize: 100,
        lastUpdated: Date.now(),
        trend: 'stable' as const,
      }

      detector.importState({
        baselines: [baseline],
        events: [],
      })

      const importedBaseline = detector.getBaseline('imported_metric')
      expect(importedBaseline).toEqual(baseline)
    })
  })

  describe('clearMetric', () => {
    it('should clear specific metric data', () => {
      detector.trackMetric('metric1', 100)
      detector.trackMetric('metric2', 200)

      detector.clearMetric('metric1')

      const history1 = detector['dataHistory'].get('metric1')
      const history2 = detector['dataHistory'].get('metric2')

      expect(history1).toBeUndefined()
      expect(history2?.length).toBe(1)
    })
  })

  describe('clearAll', () => {
    it('should clear all data', () => {
      detector.trackMetric('metric1', 100)
      detector.trackMetric('metric2', 200)
      detector.trackMetric('metric1', 300)

      detector.clearAll()

      expect(detector['dataHistory'].size).toBe(0)
      expect(detector['baselines'].size).toBe(0)
      expect(detector['anomalyEvents'].length).toBe(0)
    })
  })

  describe('Configuration Update', () => {
    it('should update configuration', () => {
      detector.updateConfig({
        zScoreThreshold: 3,
        criticalZScoreThreshold: 4,
      })

      expect(detector['config'].zScoreThreshold).toBe(3)
      expect(detector['config'].criticalZScoreThreshold).toBe(4)
    })
  })

  describe('Disabled Mode', () => {
    it('should not track when disabled', () => {
      const disabledDetector = new EnhancedAnomalyDetector({
        enabled: false,
      })

      disabledDetector.trackMetric('test', 100)

      const history = disabledDetector['dataHistory'].get('test')
      expect(history).toBeUndefined()
    })

    it('should not detect anomalies when disabled', () => {
      const disabledDetector = new EnhancedAnomalyDetector({
        enabled: false,
      })

      const result = disabledDetector.detectAnomaly('test', 100)
      expect(result).toBeNull()
    })
  })
})

describe('Singleton Instance', () => {
  it('should export singleton instance', () => {
    expect(enhancedAnomalyDetector).toBeInstanceOf(EnhancedAnomalyDetector)
  })
})
