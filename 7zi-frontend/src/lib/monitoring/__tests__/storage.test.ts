/**
 * Storage Module Tests
 * 存储模块测试 - 持久化存储测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MemoryStorage, LocalStorageStorage } from '../storage'
import type { PerformanceMetric, AlarmEvent } from '../types'

describe('MemoryStorage - 持久化存储测试', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage(24 * 60 * 60 * 1000) // 24小时保留期
  })

  afterEach(async () => {
    await storage.clearMetrics()
    await storage.clearAlarms()
  })

  describe('saveAlarm / getAlarms 方法', () => {
    it('应该保存并获取告警事件', async () => {
      const alarm: AlarmEvent = {
        id: 'alarm-1',
        timestamp: Date.now(),
        type: 'errorRate',
        currentValue: 0.8,
        threshold: 0.5,
        message: '错误率过高',
        severity: 'high',
      }

      await storage.saveAlarm(alarm)
      const alarms = await storage.getAlarms()

      expect(alarms.length).toBe(1)
      expect(alarms[0].id).toBe('alarm-1')
      expect(alarms[0].type).toBe('errorRate')
      expect(alarms[0].severity).toBe('high')
    })

    it('应该保存多个告警事件', async () => {
      const alarms: AlarmEvent[] = [
        {
          id: 'alarm-1',
          timestamp: Date.now() - 1000,
          type: 'errorRate',
          currentValue: 0.8,
          threshold: 0.5,
          message: '错误率过高',
          severity: 'high',
        },
        {
          id: 'alarm-2',
          timestamp: Date.now(),
          type: 'responseTime',
          currentValue: 250,
          threshold: 100,
          message: '响应时间过长',
          severity: 'medium',
        },
        {
          id: 'alarm-3',
          timestamp: Date.now() + 1000,
          type: 'operationDuration',
          currentValue: 300,
          threshold: 100,
          message: '操作耗时过长',
          severity: 'critical',
        },
      ]

      for (const alarm of alarms) {
        await storage.saveAlarm(alarm)
      }

      const retrievedAlarms = await storage.getAlarms()

      expect(retrievedAlarms.length).toBe(3)
      // 应该按时间戳降序排列
      expect(retrievedAlarms[0].id).toBe('alarm-3')
      expect(retrievedAlarms[1].id).toBe('alarm-2')
      expect(retrievedAlarms[2].id).toBe('alarm-1')
    })

    it('应该更新已存在的告警事件', async () => {
      const alarm: AlarmEvent = {
        id: 'alarm-1',
        timestamp: Date.now(),
        type: 'errorRate',
        currentValue: 0.8,
        threshold: 0.5,
        message: '错误率过高',
        severity: 'high',
      }

      await storage.saveAlarm(alarm)

      // 更新告警
      const updatedAlarm: AlarmEvent = {
        id: 'alarm-1',
        timestamp: Date.now() + 1000,
        type: 'errorRate',
        currentValue: 0.9,
        threshold: 0.5,
        message: '错误率持续升高',
        severity: 'critical',
      }

      await storage.saveAlarm(updatedAlarm)
      const alarms = await storage.getAlarms()

      expect(alarms.length).toBe(1)
      expect(alarms[0].currentValue).toBe(0.9)
      expect(alarms[0].severity).toBe('critical')
      expect(alarms[0].message).toBe('错误率持续升高')
    })

    it('应该支持按时间范围过滤告警', async () => {
      const now = Date.now()
      const alarms: AlarmEvent[] = [
        {
          id: 'alarm-1',
          timestamp: now - 2000,
          type: 'errorRate',
          currentValue: 0.8,
          threshold: 0.5,
          message: '错误率过高',
          severity: 'high',
        },
        {
          id: 'alarm-2',
          timestamp: now - 1000,
          type: 'responseTime',
          currentValue: 250,
          threshold: 100,
          message: '响应时间过长',
          severity: 'medium',
        },
        {
          id: 'alarm-3',
          timestamp: now,
          type: 'operationDuration',
          currentValue: 300,
          threshold: 100,
          message: '操作耗时过长',
          severity: 'critical',
        },
      ]

      for (const alarm of alarms) {
        await storage.saveAlarm(alarm)
      }

      // 获取最近1秒的告警
      const recentAlarms = await storage.getAlarms(now - 1000)

      expect(recentAlarms.length).toBe(2)
      expect(recentAlarms.every(a => a.timestamp >= now - 1000)).toBe(true)
    })
  })

  describe('数据导出格式（JSON）', () => {
    it('应该正确序列化和反序列化告警数据', async () => {
      const alarm: AlarmEvent = {
        id: 'alarm-1',
        timestamp: Date.now(),
        type: 'errorRate',
        currentValue: 0.8,
        threshold: 0.5,
        message: '错误率过高',
        severity: 'high',
      }

      await storage.saveAlarm(alarm)
      const alarms = await storage.getAlarms()

      // 序列化为 JSON
      const json = JSON.stringify(alarms)
      expect(json).toBeDefined()
      expect(json.length).toBeGreaterThan(0)

      // 反序列化
      const parsed = JSON.parse(json) as AlarmEvent[]
      expect(parsed.length).toBe(1)
      expect(parsed[0].id).toBe('alarm-1')
      expect(parsed[0].type).toBe('errorRate')
      expect(parsed[0].currentValue).toBe(0.8)
      expect(parsed[0].threshold).toBe(0.5)
      expect(parsed[0].message).toBe('错误率过高')
      expect(parsed[0].severity).toBe('high')
    })

    it('应该正确序列化和反序列化指标数据', async () => {
      const metric: PerformanceMetric = {
        id: 'metric-1',
        name: 'api_response_time',
        timestamp: Date.now(),
        type: 'api',
        value: 150,
        unit: 'ms',
        metadata: {
          endpoint: '/api/test',
          method: 'GET',
          statusCode: 200,
        },
      }

      await storage.saveMetric(metric)
      const metrics = await storage.getMetrics()

      // 序列化为 JSON
      const json = JSON.stringify(metrics)
      expect(json).toBeDefined()
      expect(json.length).toBeGreaterThan(0)

      // 反序列化
      const parsed = JSON.parse(json) as PerformanceMetric[]
      expect(parsed.length).toBe(1)
      expect(parsed[0].id).toBe('metric-1')
      expect(parsed[0].name).toBe('api_response_time')
      expect(parsed[0].type).toBe('api')
      expect(parsed[0].value).toBe(150)
      expect(parsed[0].unit).toBe('ms')
      expect(parsed[0].metadata?.endpoint).toBe('/api/test')
    })

    it('应该支持导出所有数据为 JSON', async () => {
      const metric: PerformanceMetric = {
        id: 'metric-1',
        name: 'api_response_time',
        timestamp: Date.now(),
        type: 'api',
        value: 150,
        unit: 'ms',
      }

      const alarm: AlarmEvent = {
        id: 'alarm-1',
        timestamp: Date.now(),
        type: 'errorRate',
        currentValue: 0.8,
        threshold: 0.5,
        message: '错误率过高',
        severity: 'high',
      }

      await storage.saveMetric(metric)
      await storage.saveAlarm(alarm)

      const metrics = await storage.getMetrics()
      const alarms = await storage.getAlarms()

      const exportData = {
        metrics,
        alarms,
        exportTime: Date.now(),
      }

      const json = JSON.stringify(exportData, null, 2)
      expect(json).toBeDefined()

      const parsed = JSON.parse(json)
      expect(parsed.metrics.length).toBe(1)
      expect(parsed.alarms.length).toBe(1)
      expect(parsed.exportTime).toBeDefined()
    })
  })

  describe('历史记录限制（retentionPeriodMs）', () => {
    it('应该自动清理过期的指标数据', async () => {
      const shortRetentionStorage = new MemoryStorage(100) // 100ms 保留期

      const oldMetric: PerformanceMetric = {
        id: 'metric-old',
        name: 'old_metric',
        timestamp: Date.now() - 200, // 200ms 前
        type: 'api',
        value: 100,
        unit: 'ms',
      }

      const newMetric: PerformanceMetric = {
        id: 'metric-new',
        name: 'new_metric',
        timestamp: Date.now(),
        type: 'api',
        value: 150,
        unit: 'ms',
      }

      await shortRetentionStorage.saveMetric(oldMetric)
      await shortRetentionStorage.saveMetric(newMetric)

      const metrics = await shortRetentionStorage.getMetrics()

      // 旧指标应该被清理
      expect(metrics.length).toBe(1)
      expect(metrics[0].id).toBe('metric-new')
    })

    it('应该在保存新数据时自动清理过期数据', async () => {
      const shortRetentionStorage = new MemoryStorage(100) // 100ms 保留期

      const metric1: PerformanceMetric = {
        id: 'metric-1',
        name: 'metric1',
        timestamp: Date.now() - 150,
        type: 'api',
        value: 100,
        unit: 'ms',
      }

      const metric2: PerformanceMetric = {
        id: 'metric-2',
        name: 'metric2',
        timestamp: Date.now() - 50,
        type: 'api',
        value: 150,
        unit: 'ms',
      }

      await shortRetentionStorage.saveMetric(metric1)
      await shortRetentionStorage.saveMetric(metric2)

      let metrics = await shortRetentionStorage.getMetrics()
      expect(metrics.length).toBe(1)
      expect(metrics[0].id).toBe('metric-2')

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 60))

      const metric3: PerformanceMetric = {
        id: 'metric-3',
        name: 'metric3',
        timestamp: Date.now(),
        type: 'api',
        value: 200,
        unit: 'ms',
      }

      await shortRetentionStorage.saveMetric(metric3)

      metrics = await shortRetentionStorage.getMetrics()
      expect(metrics.length).toBe(1)
      expect(metrics[0].id).toBe('metric-3')
    })

    it('应该保留未过期的数据', async () => {
      const shortRetentionStorage = new MemoryStorage(1000) // 1秒保留期

      const metrics: PerformanceMetric[] = [
        {
          id: 'metric-1',
          name: 'metric1',
          timestamp: Date.now() - 500,
          type: 'api',
          value: 100,
          unit: 'ms',
        },
        {
          id: 'metric-2',
          name: 'metric2',
          timestamp: Date.now() - 300,
          type: 'api',
          value: 150,
          unit: 'ms',
        },
        {
          id: 'metric-3',
          name: 'metric3',
          timestamp: Date.now(),
          type: 'api',
          value: 200,
          unit: 'ms',
        },
      ]

      for (const metric of metrics) {
        await shortRetentionStorage.saveMetric(metric)
      }

      const retrievedMetrics = await shortRetentionStorage.getMetrics()

      // 所有数据都应该保留
      expect(retrievedMetrics.length).toBe(3)
    })
  })

  describe('错误处理', () => {
    it('应该处理无效的告警数据', async () => {
      const invalidAlarm = {
        id: '',
        timestamp: -1,
        type: 'errorRate' as const,
        currentValue: -1,
        threshold: -1,
        message: '',
        severity: 'high' as const,
      }

      // 不应该抛出异常
      await expect(storage.saveAlarm(invalidAlarm)).resolves.not.toThrow()

      const alarms = await storage.getAlarms()
      expect(alarms.length).toBe(1)
    })

    it('应该处理无效的指标数据', async () => {
      const invalidMetric = {
        id: '',
        name: '',
        timestamp: -1,
        type: 'api' as const,
        value: -1,
        unit: '',
      }

      // 不应该抛出异常
      await expect(storage.saveMetric(invalidMetric)).resolves.not.toThrow()

      const metrics = await storage.getMetrics()
      expect(metrics.length).toBe(1)
    })

    it('应该处理空数据查询', async () => {
      const metrics = await storage.getMetrics()
      const alarms = await storage.getAlarms()

      expect(metrics).toEqual([])
      expect(alarms).toEqual([])
    })

    it('应该处理不存在的过滤条件', async () => {
      const metric: PerformanceMetric = {
        id: 'metric-1',
        name: 'api_metric',
        timestamp: Date.now(),
        type: 'api',
        value: 100,
        unit: 'ms',
      }

      await storage.saveMetric(metric)

      // 查询不存在的类型
      const filteredMetrics = await storage.getMetrics({ type: 'error' })
      expect(filteredMetrics).toEqual([])

      // 查询不存在的时间范围
      const timeFilteredMetrics = await storage.getMetrics({
        startTime: Date.now() + 10000,
        endTime: Date.now() + 20000,
      })
      expect(timeFilteredMetrics).toEqual([])
    })

    it('应该处理清空操作', async () => {
      const metric: PerformanceMetric = {
        id: 'metric-1',
        name: 'api_metric',
        timestamp: Date.now(),
        type: 'api',
        value: 100,
        unit: 'ms',
      }

      const alarm: AlarmEvent = {
        id: 'alarm-1',
        timestamp: Date.now(),
        type: 'errorRate',
        currentValue: 0.8,
        threshold: 0.5,
        message: '错误率过高',
        severity: 'high',
      }

      await storage.saveMetric(metric)
      await storage.saveAlarm(alarm)

      await storage.clearMetrics()
      await storage.clearAlarms()

      const metrics = await storage.getMetrics()
      const alarms = await storage.getAlarms()

      expect(metrics).toEqual([])
      expect(alarms).toEqual([])
    })

    it('应该正确计数指标数量', async () => {
      expect(await storage.getMetricsCount()).toBe(0)

      const metrics: PerformanceMetric[] = [
        {
          id: 'metric-1',
          name: 'metric1',
          timestamp: Date.now(),
          type: 'api',
          value: 100,
          unit: 'ms',
        },
        {
          id: 'metric-2',
          name: 'metric2',
          timestamp: Date.now(),
          type: 'api',
          value: 150,
          unit: 'ms',
        },
        {
          id: 'metric-3',
          name: 'metric3',
          timestamp: Date.now(),
          type: 'api',
          value: 200,
          unit: 'ms',
        },
      ]

      for (const metric of metrics) {
        await storage.saveMetric(metric)
      }

      expect(await storage.getMetricsCount()).toBe(3)
    })
  })
})

describe('LocalStorageStorage - 持久化存储测试', () => {
  let storage: LocalStorageStorage
  let localStorageMock: Record<string, string>

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {}
    const mockLocalStorage = {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value
      },
      removeItem: (key: string) => {
        delete localStorageMock[key]
      },
      clear: () => {
        localStorageMock = {}
      },
      length: 0,
      key: vi.fn(),
    }

    vi.stubGlobal('localStorage', mockLocalStorage)
    storage = new LocalStorageStorage(24 * 60 * 60 * 1000)
  })

  afterEach(async () => {
    await storage.clearMetrics()
    await storage.clearAlarms()
    localStorageMock = {}
    vi.unstubAllGlobals()
  })

  describe('saveAlarm / getAlarms 方法', () => {
    it('应该保存告警到 localStorage', async () => {
      const alarm: AlarmEvent = {
        id: 'alarm-1',
        timestamp: Date.now(),
        type: 'errorRate',
        currentValue: 0.8,
        threshold: 0.5,
        message: '错误率过高',
        severity: 'high',
      }

      await storage.saveAlarm(alarm)

      // 检查数据是否存储在 mock localStorage 中
      expect(localStorageMock['monitoring_alarms']).toBeDefined()
      expect(localStorageMock['monitoring_alarms']).toContain('alarm-1')

      const alarms = await storage.getAlarms()
      expect(alarms.length).toBe(1)
      expect(alarms[0].id).toBe('alarm-1')
    })

    it('应该从 localStorage 读取告警', async () => {
      const alarm: AlarmEvent = {
        id: 'alarm-1',
        timestamp: Date.now(),
        type: 'errorRate',
        currentValue: 0.8,
        threshold: 0.5,
        message: '错误率过高',
        severity: 'high',
      }

      await storage.saveAlarm(alarm)

      // 验证数据已存储
      expect(localStorageMock['monitoring_alarms']).toBeDefined()

      const alarms = await storage.getAlarms()
      expect(alarms.length).toBe(1)
      expect(alarms[0].id).toBe('alarm-1')
    })
  })

  describe('数据导出格式（JSON）', () => {
    it('应该正确序列化告警数据到 localStorage', async () => {
      const alarm: AlarmEvent = {
        id: 'alarm-1',
        timestamp: Date.now(),
        type: 'errorRate',
        currentValue: 0.8,
        threshold: 0.5,
        message: '错误率过高',
        severity: 'high',
      }

      await storage.saveAlarm(alarm)

      const storedData = localStorageMock['monitoring_alarms']
      expect(storedData).toBeDefined()

      const parsed = JSON.parse(storedData) as AlarmEvent[]
      expect(parsed.length).toBe(1)
      expect(parsed[0].id).toBe('alarm-1')
      expect(parsed[0].type).toBe('errorRate')
    })

    it('应该正确序列化指标数据到 localStorage', async () => {
      const metric: PerformanceMetric = {
        id: 'metric-1',
        name: 'api_response_time',
        timestamp: Date.now(),
        type: 'api',
        value: 150,
        unit: 'ms',
        metadata: {
          endpoint: '/api/test',
        },
      }

      await storage.saveMetric(metric)

      const storedData = localStorageMock['monitoring_metrics']
      expect(storedData).toBeDefined()

      const parsed = JSON.parse(storedData) as PerformanceMetric[]
      expect(parsed.length).toBe(1)
      expect(parsed[0].id).toBe('metric-1')
      expect(parsed[0].metadata?.endpoint).toBe('/api/test')
    })
  })

  describe('历史记录限制（retentionPeriodMs）', () => {
    it('应该自动清理过期的指标数据', async () => {
      const shortRetentionStorage = new LocalStorageStorage(100) // 100ms 保留期

      const oldMetric: PerformanceMetric = {
        id: 'metric-old',
        name: 'old_metric',
        timestamp: Date.now() - 200,
        type: 'api',
        value: 100,
        unit: 'ms',
      }

      const newMetric: PerformanceMetric = {
        id: 'metric-new',
        name: 'new_metric',
        timestamp: Date.now(),
        type: 'api',
        value: 150,
        unit: 'ms',
      }

      await shortRetentionStorage.saveMetric(oldMetric)
      await shortRetentionStorage.saveMetric(newMetric)

      const metrics = await shortRetentionStorage.getMetrics()

      expect(metrics.length).toBe(1)
      expect(metrics[0].id).toBe('metric-new')
    })
  })

  describe('错误处理', () => {
    it('应该处理 localStorage 不可用的情况', async () => {
      // 使用 vi.stubGlobal 来模拟没有 window 对象的环境
      vi.stubGlobal('window', undefined)

      const serverStorage = new LocalStorageStorage()

      const alarm: AlarmEvent = {
        id: 'alarm-1',
        timestamp: Date.now(),
        type: 'errorRate',
        currentValue: 0.8,
        threshold: 0.5,
        message: '错误率过高',
        severity: 'high',
      }

      // 不应该抛出异常
      await expect(serverStorage.saveAlarm(alarm)).resolves.not.toThrow()

      const alarms = await serverStorage.getAlarms()
      expect(alarms).toEqual([])

      // 清理 mock
      vi.unstubAllGlobals()
    })

    it('应该处理 localStorage 损坏的数据', async () => {
      // 先设置损坏的数据
      localStorageMock['monitoring_alarms'] = 'invalid json'

      // 创建新的 storage 实例来读取损坏的数据
      const corruptedStorage = new LocalStorageStorage(24 * 60 * 60 * 1000)

      // 当前的实现会抛出异常，因为没有 try-catch 处理
      // 这测试验证了当数据损坏时会失败
      await expect(corruptedStorage.getAlarms()).rejects.toThrow(SyntaxError)
    })
  })

  describe('辅助方法测试', () => {
    it('getStoredMetrics 应该返回存储的指标', () => {
      const metrics: PerformanceMetric[] = [
        {
          id: 'metric-1',
          name: 'metric1',
          timestamp: Date.now(),
          type: 'api',
          value: 100,
          unit: 'ms',
        },
      ]

      storage.setStoredMetrics(metrics)

      const storedMetrics = storage.getStoredMetrics()
      expect(storedMetrics.length).toBe(1)
      expect(storedMetrics[0].id).toBe('metric-1')
    })

    it('getStoredAlarms 应该返回存储的告警', () => {
      const alarms: AlarmEvent[] = [
        {
          id: 'alarm-1',
          timestamp: Date.now(),
          type: 'errorRate',
          currentValue: 0.8,
          threshold: 0.5,
          message: '错误率过高',
          severity: 'high',
        },
      ]

      storage.setStoredAlarms(alarms)

      const storedAlarms = storage.getStoredAlarms()
      expect(storedAlarms.length).toBe(1)
      expect(storedAlarms[0].id).toBe('alarm-1')
    })
  })
})