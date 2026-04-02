/**
 * Monitoring Module Tests
 * 监控模块测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PerformanceMonitor } from '../monitor'
import { MemoryStorage } from '../storage'
import type { MonitoringConfig } from '../types'

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance()
    monitor.updateConfig({ enabled: true, sampleRate: 1.0 })
  })

  afterEach(async () => {
    await monitor.clearAllData()
  })

  describe('API Request Tracking', () => {
    it('should track API request metrics', async () => {
      await monitor.trackAPIRequest('GET', '/api/test', 200, 150)
      await monitor.trackAPIRequest('POST', '/api/users', 201, 250)

      const metrics = await monitor.getAggregatedMetrics()

      expect(metrics.apiMetrics.totalRequests).toBe(2)
      expect(metrics.apiMetrics.averageResponseTime).toBe(200)
      expect(metrics.apiMetrics.successRate).toBe(1)
    })

    it('should calculate error rate correctly', async () => {
      await monitor.trackAPIRequest('GET', '/api/test', 200, 100)
      await monitor.trackAPIRequest('GET', '/api/error', 500, 150)
      await monitor.trackAPIRequest('GET', '/api/error2', 500, 120)

      const metrics = await monitor.getAggregatedMetrics()

      expect(metrics.apiMetrics.totalRequests).toBe(3)
      expect(metrics.apiMetrics.errorCount).toBe(2)
      expect(metrics.apiMetrics.errorRate).toBeCloseTo(0.67, 2)
    })
  })

  describe('Error Tracking', () => {
    it('should track errors', async () => {
      await monitor.trackError('TestError', 'Test error message', 'stack trace')

      const metrics = await monitor.getAggregatedMetrics()

      expect(metrics.errorMetrics.totalErrors).toBe(1)
      expect(metrics.errorMetrics.errorsByType['TestError']).toBe(1)
    })

    it('should track multiple error types', async () => {
      await monitor.trackError('TypeError', 'Type error')
      await monitor.trackError('TypeError', 'Another type error')
      await monitor.trackError('ReferenceError', 'Reference error')

      const metrics = await monitor.getAggregatedMetrics()

      expect(metrics.errorMetrics.totalErrors).toBe(3)
      expect(metrics.errorMetrics.errorsByType['TypeError']).toBe(2)
      expect(metrics.errorMetrics.errorsByType['ReferenceError']).toBe(1)
    })
  })

  describe('Operation Tracking', () => {
    it('should track operation duration', async () => {
      const operationId = monitor.startOperation('test_operation')

      await new Promise(resolve => setTimeout(resolve, 50))

      await monitor.endOperation(operationId, true)

      const metrics = await monitor.getAggregatedMetrics()

      expect(metrics.operationMetrics.totalOperations).toBe(1)
      expect(metrics.operationMetrics.averageDuration).toBeGreaterThanOrEqual(45)
      expect(metrics.operationMetrics.successRate).toBe(1)
    })

    it('should track failed operations', async () => {
      const operationId = monitor.startOperation('failing_operation')
      await monitor.endOperation(operationId, false)

      const metrics = await monitor.getAggregatedMetrics()

      expect(metrics.operationMetrics.totalOperations).toBe(1)
      expect(metrics.operationMetrics.successRate).toBe(0)
    })
  })

  describe('Custom Metrics', () => {
    it('should track custom metrics', async () => {
      await monitor.trackCustomMetric('memory_usage', 1024, 'MB')
      await monitor.trackCustomMetric('cpu_usage', 50, '%')

      const metrics = await monitor.getMetrics()
      const customMetrics = metrics.filter(m => m.type === 'custom')

      expect(customMetrics.length).toBe(2)
      // Find metrics by name instead of relying on order
      const memoryMetric = customMetrics.find(m => m.name === 'memory_usage')
      const cpuMetric = customMetrics.find(m => m.name === 'cpu_usage')
      expect(memoryMetric?.value).toBe(1024)
      expect(cpuMetric?.value).toBe(50)
    })
  })

  describe('Alarms', () => {
    beforeEach(async () => {
      monitor.updateConfig({
        enabled: true,
        sampleRate: 1.0,
        alarms: {
          errorRate: {
            metric: 'errorRate',
            threshold: 0.5,
            windowMs: 60000,
            enabled: true,
          },
          responseTime: {
            metric: 'responseTime',
            threshold: 100,
            windowMs: 60000,
            enabled: true,
          },
          operationDuration: {
            metric: 'operationDuration',
            threshold: 100,
            windowMs: 60000,
            enabled: true,
          },
        },
      } as Partial<MonitoringConfig>)

      // Clear data before each alarm test
      await monitor.clearAllData()
    })

    it('should trigger error rate alarm', async () => {
      // Create 2 error requests out of 3 total
      await monitor.trackAPIRequest('GET', '/api/error1', 500, 100)
      await monitor.trackAPIRequest('GET', '/api/error2', 500, 150)
      await monitor.trackAPIRequest('GET', '/api/success', 200, 100)

      const alarms = await monitor.getAlarms()

      const errorRateAlarms = alarms.filter(a => a.type === 'errorRate')
      expect(errorRateAlarms.length).toBeGreaterThan(0)
    })

    it('should trigger response time alarm', async () => {
      await monitor.trackAPIRequest('GET', '/api/slow1', 200, 200)
      await monitor.trackAPIRequest('GET', '/api/slow2', 200, 250)

      const alarms = await monitor.getAlarms()

      const responseTimeAlarms = alarms.filter(a => a.type === 'responseTime')
      expect(responseTimeAlarms.length).toBeGreaterThan(0)
    })

    it('should trigger operation duration alarm', async () => {
      const opId1 = monitor.startOperation('slow_op1')
      await new Promise(resolve => setTimeout(resolve, 150))
      await monitor.endOperation(opId1, true)

      const opId2 = monitor.startOperation('slow_op2')
      await new Promise(resolve => setTimeout(resolve, 200))
      await monitor.endOperation(opId2, true)

      const alarms = await monitor.getAlarms()

      const durationAlarms = alarms.filter(a => a.type === 'operationDuration')
      expect(durationAlarms.length).toBeGreaterThan(0)
    })
  })

  describe('Data Management', () => {
    it('should clear all data', async () => {
      await monitor.trackAPIRequest('GET', '/api/test', 200, 100)
      await monitor.trackError('TestError', 'Test error')

      await monitor.clearAllData()

      const metrics = await monitor.getMetrics()
      const alarms = await monitor.getAlarms()

      expect(metrics.length).toBe(0)
      expect(alarms.length).toBe(0)
    })

    it('should count metrics', async () => {
      expect(await monitor.getMetricsCount()).toBe(0)

      await monitor.trackAPIRequest('GET', '/api/test1', 200, 100)
      await monitor.trackAPIRequest('GET', '/api/test2', 200, 150)
      await monitor.trackAPIRequest('GET', '/api/test3', 200, 200)

      expect(await monitor.getMetricsCount()).toBe(3)
    })
  })

  describe('Sampling', () => {
    it('should respect sample rate', async () => {
      monitor.updateConfig({ enabled: true, sampleRate: 0 })

      await monitor.trackAPIRequest('GET', '/api/test', 200, 100)

      const metrics = await monitor.getMetrics()
      expect(metrics.length).toBe(0)
    })

    it('should track all metrics with 100% sample rate', async () => {
      monitor.updateConfig({ enabled: true, sampleRate: 1.0 })

      await monitor.trackAPIRequest('GET', '/api/test', 200, 100)

      const metrics = await monitor.getMetrics()
      expect(metrics.length).toBe(1)
    })
  })
})

describe('MemoryStorage', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage(1000) // 1 second retention
  })

  it('should save and retrieve metrics', async () => {
    const metric = {
      id: '1',
      name: 'test',
      timestamp: Date.now(),
      type: 'api' as const,
      value: 100,
      unit: 'ms',
    }

    await storage.saveMetric(metric)
    const metrics = await storage.getMetrics()

    expect(metrics.length).toBe(1)
    expect(metrics[0].id).toBe('1')
  })

  it('should filter metrics by type', async () => {
    await storage.saveMetric({
      id: '1',
      name: 'api1',
      timestamp: Date.now(),
      type: 'api' as const,
      value: 100,
      unit: 'ms',
    })

    await storage.saveMetric({
      id: '2',
      name: 'error1',
      timestamp: Date.now(),
      type: 'error' as const,
      value: 1,
      unit: 'count',
    })

    const apiMetrics = await storage.getMetrics({ type: 'api' })
    const errorMetrics = await storage.getMetrics({ type: 'error' })

    expect(apiMetrics.length).toBe(1)
    expect(errorMetrics.length).toBe(1)
  })

  it('should clear metrics', async () => {
    await storage.saveMetric({
      id: '1',
      name: 'test',
      timestamp: Date.now(),
      type: 'api' as const,
      value: 100,
      unit: 'ms',
    })

    await storage.clearMetrics()

    const metrics = await storage.getMetrics()
    expect(metrics.length).toBe(0)
  })
})
