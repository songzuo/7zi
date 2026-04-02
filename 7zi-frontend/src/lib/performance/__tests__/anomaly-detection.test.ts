/**
 * Performance Monitoring Tests
 * 性能监控测试用例
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PerformanceAnomalyDetector } from '../anomaly-detection/detector'
import { BaselineManager } from '../anomaly-detection/baseline'
import { calculateZScore, detectAnomalyZScore } from '../anomaly-detection/algorithms/z-score'
import { RootCauseAnalyzer } from '../root-cause-analysis/analyzer'
import { PerformanceAlerter } from '../alerting/alerter'
import { BudgetChecker } from '../budget-control/budget-checker'

describe('BaselineManager', () => {
  let manager: BaselineManager

  beforeEach(() => {
    manager = new BaselineManager({
      enabled: true,
      algorithms: {
        zScore: { enabled: true, threshold: 3 },
        isolationForest: { enabled: false, contamination: 0.1 },
        threshold: { enabled: true },
      },
      baseline: { minSampleSize: 10, updateIntervalMs: 1000, windowSizeMs: 60000 },
      filters: { enablePseudoAnomalyFilter: false, cooldownMs: 5000, minConfidence: 0.7 },
    })
  })

  it('should add data points', () => {
    manager.addDataPoint('test-metric', 100)
    const history = manager.getHistory('test-metric')
    expect(history.length).toBe(1)
  })

  it('should calculate baseline with enough samples', () => {
    // 添加足够的数据点
    for (let i = 0; i < 15; i++) {
      manager.addDataPoint('test-metric', 100 + Math.random() * 10)
    }

    const baseline = manager.updateBaseline('test-metric')
    expect(baseline).not.toBeNull()
    expect(baseline!.mean).toBeGreaterThan(90)
    expect(baseline!.mean).toBeLessThan(120)
  })

  it('should not calculate baseline with insufficient samples', () => {
    manager.addDataPoint('test-metric', 100)
    manager.addDataPoint('test-metric', 101)

    const baseline = manager.updateBaseline('test-metric')
    expect(baseline).toBeNull()
  })

  it('should calculate percentiles correctly', () => {
    // 添加固定值序列
    for (let i = 1; i <= 100; i++) {
      manager.addDataPoint('test-metric', i)
    }

    const baseline = manager.updateBaseline('test-metric')
    expect(baseline).not.toBeNull()
    expect(baseline!.p50).toBeCloseTo(51, -1)
    expect(baseline!.p95).toBeGreaterThan(90)
    expect(baseline!.p99).toBeGreaterThan(95)
  })
})

describe('Z-Score Algorithm', () => {
  it('should calculate Z-score correctly', () => {
    const baseline = {
      metric: 'test',
      mean: 100,
      stdDev: 10,
      min: 80,
      max: 120,
      p50: 100,
      p95: 116,
      p99: 119,
      sampleSize: 100,
      lastUpdated: Date.now(),
    }

    const zScore = calculateZScore(130, baseline)
    expect(zScore).toBe(3)
  })

  it('should detect anomaly for high Z-score', () => {
    const baseline = {
      metric: 'test',
      mean: 100,
      stdDev: 10,
      min: 80,
      max: 120,
      p50: 100,
      p95: 116,
      p99: 119,
      sampleSize: 100,
      lastUpdated: Date.now(),
    }

    const result = detectAnomalyZScore(150, baseline, 3)
    expect(result.isAnomaly).toBe(true)
    expect(result.zScore).toBe(5)
    expect(result.severity).toBe('critical')
  })

  it('should not detect anomaly for normal values', () => {
    const baseline = {
      metric: 'test',
      mean: 100,
      stdDev: 10,
      min: 80,
      max: 120,
      p50: 100,
      p95: 116,
      p99: 119,
      sampleSize: 100,
      lastUpdated: Date.now(),
    }

    const result = detectAnomalyZScore(105, baseline, 3)
    expect(result.isAnomaly).toBe(false)
  })
})

describe('PerformanceAnomalyDetector', () => {
  let detector: PerformanceAnomalyDetector

  beforeEach(() => {
    detector = new PerformanceAnomalyDetector({
      enabled: true,
      algorithms: {
        zScore: { enabled: true, threshold: 3 },
        isolationForest: { enabled: false, contamination: 0.1 },
        threshold: { enabled: true, maxThreshold: 1000 },
      },
      baseline: { minSampleSize: 10, updateIntervalMs: 1000, windowSizeMs: 60000 },
      filters: { enablePseudoAnomalyFilter: false, cooldownMs: 5000, minConfidence: 0.7 },
    })
  })

  it('should track and detect anomalies', () => {
    // 训练阶段 - 添加正常数据
    for (let i = 0; i < 15; i++) {
      detector.trackMetric('response-time', 100 + Math.random() * 20)
    }

    // 检测正常值
    const normalResult = detector.detectAnomaly('response-time', 110)
    expect(normalResult!.isAnomaly).toBe(false)

    // 检测异常值
    const anomalyResult = detector.detectAnomaly('response-time', 500)
    expect(anomalyResult!.isAnomaly).toBe(true)
  })

  it('should detect threshold violations', () => {
    const result = detector.detectAnomaly('test-metric', 1500)
    expect(result!.isAnomaly).toBe(true)
    expect(result!.algorithm).toBe('threshold')
  })

  it('should return null baseline for unknown metrics', () => {
    const baseline = detector.getBaseline('unknown-metric')
    expect(baseline).toBeNull()
  })
})

describe('RootCauseAnalyzer', () => {
  let analyzer: RootCauseAnalyzer

  beforeEach(() => {
    analyzer = new RootCauseAnalyzer()
  })

  it('should analyze slow database queries', () => {
    const context = {
      timestamp: Date.now(),
      slowQueries: [
        {
          query: 'SELECT * FROM users',
          duration: 2000,
          rowCount: 1000,
          type: 'SELECT' as const,
          timestamp: Date.now(),
        },
        {
          query: 'SELECT * FROM orders',
          duration: 3000,
          rowCount: 5000,
          type: 'SELECT' as const,
          timestamp: Date.now(),
        },
      ],
    }

    const result = analyzer.analyze('responseTime', 5000, context)
    expect(result.candidates.length).toBeGreaterThan(0)
    expect(result.primaryCause!.type).toBe('database')
    expect(result.primaryCause!.severity).toBe('high')
  })

  it('should analyze slow API calls', () => {
    const context = {
      timestamp: Date.now(),
      slowApis: [
        {
          endpoint: '/api/users',
          method: 'GET',
          duration: 3000,
          statusCode: 200,
          timestamp: Date.now(),
        },
        {
          endpoint: '/api/orders',
          method: 'POST',
          duration: 4000,
          statusCode: 500,
          timestamp: Date.now(),
          error: 'Timeout',
        },
      ],
    }

    const result = analyzer.analyze('responseTime', 5000, context)
    expect(result.primaryCause!.type).toBe('api')
  })

  it('should analyze rendering issues', () => {
    const context = {
      timestamp: Date.now(),
      rendering: {
        longTasks: 20,
        totalBlockingTime: 600,
        largestContentfulPaint: 5000,
        cumulativeLayoutShift: 0.3,
      },
    }

    const result = analyzer.analyze('LCP', 5000, context)
    expect(result.primaryCause!.type).toBe('rendering')
  })

  it('should return no candidates for normal context', () => {
    const context = {
      timestamp: Date.now(),
    }

    const result = analyzer.analyze('responseTime', 100, context)
    expect(result.candidates.length).toBe(0)
    expect(result.primaryCause).toBeNull()
  })
})

describe('PerformanceAlerter', () => {
  let alerter: PerformanceAlerter

  beforeEach(() => {
    alerter = new PerformanceAlerter({ enabled: true, defaultChannels: ['dashboard'] })
  })

  it('should create and store alerts', async () => {
    const alert = await alerter.createAlert({
      level: 'warning',
      title: 'High Response Time',
      message: 'Response time is 3000ms',
      metric: 'responseTime',
      value: 3000,
      threshold: 2000,
      source: 'threshold',
    })

    expect(alert.id).toBeDefined()
    expect(alert.level).toBe('warning')
    expect(alert.acknowledged).toBe(false)
  })

  it('should acknowledge alerts', async () => {
    const alert = await alerter.createAlert({
      level: 'error',
      title: 'Test Alert',
      message: 'Test message',
      metric: 'test',
      value: 100,
      threshold: 50,
      source: 'manual',
    })

    const acknowledged = alerter.acknowledgeAlert(alert.id, 'user1')
    expect(acknowledged).toBe(true)

    const alerts = alerter.getAlerts({ acknowledged: true })
    expect(alerts.length).toBe(1)
  })

  it('should resolve alerts', async () => {
    const alert = await alerter.createAlert({
      level: 'warning',
      title: 'Test Alert',
      message: 'Test message',
      metric: 'test',
      value: 100,
      threshold: 50,
      source: 'manual',
    })

    const resolved = alerter.resolveAlert(alert.id)
    expect(resolved).toBe(true)

    const alerts = alerter.getAlerts({ resolved: true })
    expect(alerts.length).toBe(1)
  })

  it('should get alert statistics', async () => {
    await alerter.createAlert({
      level: 'warning',
      title: 'Alert 1',
      message: 'Test',
      metric: 'metric1',
      value: 100,
      threshold: 50,
      source: 'manual',
    })

    await alerter.createAlert({
      level: 'error',
      title: 'Alert 2',
      message: 'Test',
      metric: 'metric2',
      value: 100,
      threshold: 50,
      source: 'manual',
    })

    const stats = alerter.getStats()
    expect(stats.totalAlerts).toBe(2)
    expect(stats.alertsByLevel.warning).toBe(1)
    expect(stats.alertsByLevel.error).toBe(1)
  })
})

describe('BudgetChecker', () => {
  let checker: BudgetChecker

  beforeEach(() => {
    checker = new BudgetChecker()
  })

  it('should check timing budgets', () => {
    const result = checker.checkBudget('/', {
      LCP: 3000, // 超过 2500 阈值
      FID: 80,
      CLS: 0.05,
    })

    expect(result.passed).toBe(false)
    expect(result.violations.length).toBeGreaterThan(0)
    expect(result.violations[0].metric).toBe('LCP')
  })

  it('should pass for values within budget', () => {
    const result = checker.checkBudget('/', {
      LCP: 2000,
      FID: 80,
      CLS: 0.05,
      TTFB: 400,
      FCP: 1500,
    })

    expect(result.passed).toBe(true)
    expect(result.violations.length).toBe(0)
    expect(result.score).toBe(100)
  })

  it('should check resource budgets', () => {
    const result = checker.checkBudget(
      '/',
      { LCP: 2000 },
      {
        js: 600 * 1024, // 600KB, 超过 500KB 预算
        css: 50 * 1024,
        images: 512 * 1024,
        total: 2 * 1024 * 1024,
      }
    )

    expect(result.violations.some(v => v.metric === 'Resource:js')).toBe(true)
  })

  it('should return correct budget for page', () => {
    const budget = checker.getBudgetForPage('/dashboard')
    expect(budget.path).toBe('/dashboard')
    expect(budget.timings.length).toBeGreaterThan(0)
  })

  it('should return default budget for unknown page', () => {
    const budget = checker.getBudgetForPage('/unknown')
    expect(budget.path).toBe('/unknown')
  })

  it('should calculate score based on violations', () => {
    const result = checker.checkBudget('/', {
      LCP: 5000, // 严重超标
      FID: 200,
      CLS: 0.5,
    })

    expect(result.score).toBeLessThan(100)
  })
})
