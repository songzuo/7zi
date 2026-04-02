/**
 * Integration Test - Anomaly Detection with Monitoring
 * 异常检测集成测试 - 简化版
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { EnhancedAnomalyDetector, enhancedAnomalyDetector } from '../enhanced-anomaly-detector'

describe('Enhanced Anomaly Detector - Integration Tests', () => {
  let detector: EnhancedAnomalyDetector

  beforeEach(() => {
    detector = new EnhancedAnomalyDetector({
      enabled: true,
      zScoreThreshold: 2,
      criticalZScoreThreshold: 3,
      minSampleSize: 10,
      maxHistorySize: 100,
      alertConfig: {
        enabled: false, // 禁用告警
        channels: [],
        cooldownMs: 0,
        minSeverity: 'low',
      },
    })
  })

  afterEach(() => {
    detector.clearAll()
  })

  describe('Real-world Scenarios', () => {
    it('should detect API latency spike', () => {
      // 模拟正常流量 - 响应时间在 50-100ms
      for (let i = 0; i < 20; i++) {
        detector.trackResponseTime('api.getUser', 50 + Math.random() * 50)
      }

      // 模拟流量高峰 - 响应时间突然增加到 500ms
      const spikeDetection = detector.trackResponseTime('api.getUser', 500)

      expect(spikeDetection).not.toBeNull()
      expect(spikeDetection!.isAnomaly).toBe(true)
      expect(spikeDetection!.severity).toMatch(/high|critical/)
    })

    it('should detect memory threshold breach', () => {
      // 正常内存使用
      for (let i = 0; i < 20; i++) {
        detector.trackMemoryUsage(50 + Math.random() * 10)
      }

      // 内存使用超过阈值
      const leakDetection = detector.trackMemoryUsage(98)

      expect(leakDetection).not.toBeNull()
      expect(leakDetection!.isAnomaly).toBe(true)
      expect(leakDetection!.severity).toBe('critical')
    })

    it('should detect error rate spike', () => {
      // 模拟部署前 - 错误率很低
      for (let i = 0; i < 20; i++) {
        detector.trackErrorRate(0.5 + Math.random(), 1000, 5 + Math.floor(Math.random() * 5))
      }

      // 模拟部署后 - 错误率激增
      const detection = detector.trackErrorRate(20, 100, 20)

      expect(detection).not.toBeNull()
      expect(detection!.isAnomaly).toBe(true)
      expect(detection!.severity).toBe('critical')
    })

    it('should detect CPU saturation', () => {
      // 正常 CPU 使用率
      for (let i = 0; i < 15; i++) {
        detector.trackCpuUsage(30 + Math.random() * 20)
      }

      // CPU 饱和
      const saturationDetection = detector.trackCpuUsage(98)

      expect(saturationDetection).not.toBeNull()
      expect(saturationDetection!.isAnomaly).toBe(true)
      expect(saturationDetection!.severity).toBe('critical')
    })
  })

  describe('Event Lifecycle Management', () => {
    it('should track complete event lifecycle', () => {
      // 建立基线并触发异常
      for (let i = 0; i < 20; i++) {
        detector.trackResponseTime('api.orders', 100 + Math.random() * 30)
      }

      // 触发异常
      detector.trackResponseTime('api.orders', 400)

      const events = detector.getAnomalyEvents()
      expect(events.length).toBeGreaterThan(0)

      const eventId = events[0].id

      // 确认异常
      const acknowledged = detector.acknowledgeEvent(eventId, 'oncall-team')
      expect(acknowledged).toBe(true)
      expect(events[0].acknowledged).toBe(true)

      // 解决异常
      const resolved = detector.resolveEvent(eventId, 'Fixed slow query')
      expect(resolved).toBe(true)
      expect(events[0].resolved).toBe(true)
      expect(events[0].notes).toBe('Fixed slow query')
    })

    it('should handle false positive scenarios', () => {
      // 建立基线
      for (let i = 0; i < 20; i++) {
        detector.trackResponseTime('api.cache', 20 + Math.random() * 10)
      }

      // 触发误报
      const falseAnomaly = detector.trackResponseTime('api.cache', 80)
      expect(falseAnomaly?.isAnomaly).toBe(true)

      const events = detector.getAnomalyEvents()
      const eventId = events[0].id

      // 标记为误报
      const marked = detector.markAsFalsePositive(eventId, 'Expected cache miss surge')
      expect(marked).toBe(true)
      expect(events[0].falsePositive).toBe(true)

      // 验证统计数据
      const stats = detector.getStatistics()
      expect(stats.falsePositiveRate).toBeGreaterThan(0)
    })
  })

  describe('Statistics and Reporting', () => {
    it('should provide statistics', () => {
      // 多指标追踪
      for (let i = 0; i < 15; i++) {
        detector.trackResponseTime('api.user', 100 + Math.random() * 50)
        detector.trackMemoryUsage(50 + Math.random() * 20)
        detector.trackCpuUsage(40 + Math.random() * 20)
      }

      const stats = detector.getStatistics()

      expect(stats.metricsTracked).toBe(3)
      expect(stats.totalDataPoints).toBeGreaterThan(0)
      expect(stats.baselines).toBeGreaterThan(0)
      expect(stats.bySeverity).toBeDefined()
      expect(stats.byMetric).toBeDefined()
    })
  })

  describe('State Persistence', () => {
    it('should save and restore state', () => {
      // 添加数据
      for (let i = 0; i < 15; i++) {
        detector.trackResponseTime('persist.api', 100 + Math.random() * 30)
      }

      // 导出状态
      const state1 = detector.exportState()
      expect(state1.baselines.length).toBeGreaterThan(0)

      // 创建新实例并导入状态
      const newDetector = new EnhancedAnomalyDetector({
        minSampleSize: 10,
        alertConfig: { enabled: false, channels: [], cooldownMs: 0, minSeverity: 'low' },
      })

      newDetector.importState(state1)

      // 验证导入的基线
      const importedBaseline = newDetector.getBaseline('response_time_persist.api')
      expect(importedBaseline).not.toBeNull()
      expect(importedBaseline?.metric).toBe('response_time_persist.api')
    })
  })

  describe('Singleton Instance', () => {
    it('should use singleton for global monitoring', () => {
      // 单例实例应该跨调用保持状态
      enhancedAnomalyDetector.trackResponseTime('singleton.api', 100)
      enhancedAnomalyDetector.trackResponseTime('singleton.api', 120)

      const stats = enhancedAnomalyDetector.getStatistics()
      expect(stats.metricsTracked).toBeGreaterThan(0)

      // 清理
      enhancedAnomalyDetector.clearAll()
    })
  })

  describe('Configuration', () => {
    it('should respect disabled configuration', () => {
      const disabledDetector = new EnhancedAnomalyDetector({
        enabled: false,
      })

      disabledDetector.trackResponseTime('disabled.api', 1000)
      const detection = disabledDetector.detectAnomaly('disabled.api', 1000)

      expect(detection).toBeNull()
      expect(disabledDetector['dataHistory'].size).toBe(0)
    })
  })
})
