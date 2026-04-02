/**
 * Metrics Collector Tests
 * 指标采集器单元测试
 */

import { MetricsCollector } from '../metrics-collector'

describe('MetricsCollector', () => {
  let collector: MetricsCollector

  beforeEach(() => {
    collector = new MetricsCollector()
  })

  afterEach(() => {
    collector.stop()
    collector.reset()
  })

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const c = new MetricsCollector()
      expect(c.getConfig().collectCpu).toBe(true)
      expect(c.getConfig().collectMemory).toBe(true)
      expect(c.getConfig().collectInterval).toBe(10000)
    })

    it('should create instance with custom config', () => {
      const c = new MetricsCollector({
        collectCpu: false,
        collectInterval: 5000,
      })
      expect(c.getConfig().collectCpu).toBe(false)
      expect(c.getConfig().collectInterval).toBe(5000)
    })
  })

  describe('collectSystemMetrics', () => {
    it('should collect system metrics', () => {
      const metrics = collector.collectSystemMetrics()
      expect(metrics).toHaveProperty('cpuUsage')
      expect(metrics).toHaveProperty('memoryUsage')
      expect(metrics).toHaveProperty('timestamp')
      expect(metrics.timestamp).toBeGreaterThan(0)
    })

    it('should return valid percentage values', () => {
      const metrics = collector.collectSystemMetrics()
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0)
      expect(metrics.cpuUsage).toBeLessThanOrEqual(100)
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0)
      expect(metrics.memoryUsage).toBeLessThanOrEqual(100)
    })
  })

  describe('recordResponseTime', () => {
    it('should record response time samples', () => {
      collector.recordResponseTime(100)
      collector.recordResponseTime(200)
      collector.recordResponseTime(300)

      const metrics = collector.getResponseTimeMetrics()
      expect(metrics.sampleCount).toBe(3)
    })

    it('should calculate correct average', () => {
      collector.recordResponseTime(100)
      collector.recordResponseTime(200)
      collector.recordResponseTime(300)

      const metrics = collector.getResponseTimeMetrics()
      expect(metrics.average).toBe(200)
    })

    it('should calculate correct min/max', () => {
      collector.recordResponseTime(100)
      collector.recordResponseTime(500)
      collector.recordResponseTime(300)

      const metrics = collector.getResponseTimeMetrics()
      expect(metrics.min).toBe(100)
      expect(metrics.max).toBe(500)
    })

    it('should respect sample size limit', () => {
      const limitedCollector = new MetricsCollector({
        responseTimeSampleSize: 3,
      })

      limitedCollector.recordResponseTime(100)
      limitedCollector.recordResponseTime(200)
      limitedCollector.recordResponseTime(300)
      limitedCollector.recordResponseTime(400)

      const metrics = limitedCollector.getResponseTimeMetrics()
      expect(metrics.sampleCount).toBe(3)
      expect(metrics.max).toBe(400)
    })

    it('should calculate percentiles correctly', () => {
      // Record 100 samples from 1 to 100
      for (let i = 1; i <= 100; i++) {
        collector.recordResponseTime(i)
      }

      const metrics = collector.getResponseTimeMetrics()
      expect(metrics.p50).toBeCloseTo(50.5, 0)
      expect(metrics.p95).toBeCloseTo(95.5, 0)
      expect(metrics.p99).toBeCloseTo(99.5, 0)
    })
  })

  describe('recordRequest', () => {
    it('should track total requests', () => {
      collector.recordRequest()
      collector.recordRequest()
      collector.recordRequest()

      const metrics = collector.getThroughputMetrics()
      expect(metrics.totalRequests).toBe(3)
    })

    it('should calculate throughput correctly', async () => {
      collector.recordRequest()
      collector.recordRequest()

      const metrics = collector.getThroughputMetrics()
      expect(metrics.requestsPerMinute).toBeGreaterThanOrEqual(0)
    })
  })

  describe('recordError', () => {
    it('should track error count', () => {
      collector.recordError('NetworkError', 500)
      collector.recordError('NetworkError', 500)
      collector.recordError('TimeoutError', 408)

      const metrics = collector.getErrorRateMetrics()
      expect(metrics.errorCount).toBe(3)
      expect(metrics.errorsByType?.NetworkError).toBe(2)
      expect(metrics.errorsByType?.TimeoutError).toBe(1)
      expect(metrics.errorsByStatus?.['500']).toBe(2)
      expect(metrics.errorsByStatus?.['408']).toBe(1)
    })

    it('should calculate error rate correctly', () => {
      collector.recordRequest()
      collector.recordRequest()
      collector.recordRequest()
      collector.recordRequest()
      collector.recordError('Error1') // 1 error out of 4 = 25%

      const metrics = collector.getErrorRateMetrics()
      expect(metrics.rate).toBeCloseTo(25, 1)
    })
  })

  describe('getPerformanceMetrics', () => {
    it('should return complete performance metrics', () => {
      // Add some data
      collector.recordResponseTime(100)
      collector.recordRequest()
      collector.recordError('TestError')

      const metrics = collector.getPerformanceMetrics()

      expect(metrics).toHaveProperty('system')
      expect(metrics).toHaveProperty('responseTime')
      expect(metrics).toHaveProperty('errorRate')
      expect(metrics).toHaveProperty('throughput')
      expect(metrics).toHaveProperty('timestamp')
      expect(metrics).toHaveProperty('version')
      expect(metrics.version).toBe('1.9.0')
    })
  })

  describe('reset', () => {
    it('should reset all metrics', () => {
      collector.recordResponseTime(100)
      collector.recordRequest()
      collector.recordError('Error')

      collector.reset()

      const responseMetrics = collector.getResponseTimeMetrics()
      const throughputMetrics = collector.getThroughputMetrics()
      const errorMetrics = collector.getErrorRateMetrics()

      expect(responseMetrics.sampleCount).toBe(0)
      expect(throughputMetrics.totalRequests).toBe(0)
      expect(errorMetrics.errorCount).toBe(0)
    })
  })

  describe('start/stop', () => {
    it('should start and stop collecting', () => {
      expect(collector.isActive()).toBe(false)

      collector.start()
      expect(collector.isActive()).toBe(true)

      collector.stop()
      expect(collector.isActive()).toBe(false)
    })

    it('should not start twice', () => {
      collector.start()
      const activeBefore = collector.isActive()

      collector.start()
      expect(collector.isActive()).toBe(activeBefore)
    })
  })
})
