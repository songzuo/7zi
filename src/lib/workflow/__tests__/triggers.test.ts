/**
 * 工作流触发器系统测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from '@jest/globals'
import {
  TriggerManager,
  TriggerType,
  TriggerStatus,
  type TriggerDefinition,
  type TriggerCallback,
} from '../triggers'

describe('TriggerManager', () => {
  let manager: TriggerManager

  beforeEach(() => {
    manager = new TriggerManager()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await manager.stopAll()
  })

  describe('触发器注册', () => {
    it('应该成功注册有效的触发器', async () => {
      const trigger: TriggerDefinition = {
        id: 'test-trigger',
        workflowId: 'test-workflow',
        type: TriggerType.SCHEDULE,
        name: '测试触发器',
        status: TriggerStatus.ACTIVE,
        config: {
          interval: 1000, // 1 秒
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          triggerCount: 0,
          errorCount: 0,
        },
      }

      await manager.registerTrigger(trigger)

      const retrieved = manager.getTrigger('test-trigger')
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe('test-trigger')
      expect(retrieved?.status).toBe(TriggerStatus.ACTIVE)
    })

    it('应该验证必需字段', async () => {
      const invalidTrigger = {
        // 缺少 id
        workflowId: 'test-workflow',
        type: TriggerType.SCHEDULE,
        name: '测试触发器',
        status: TriggerStatus.ACTIVE,
        config: {
          interval: 1000,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          triggerCount: 0,
          errorCount: 0,
        },
      }

      await expect(manager.registerTrigger(invalidTrigger as TriggerDefinition)).rejects.toThrow(
        '触发器验证失败'
      )
    })

    it('应该验证定时触发器配置', async () => {
      const invalidTrigger: TriggerDefinition = {
        id: 'test-trigger',
        workflowId: 'test-workflow',
        type: TriggerType.SCHEDULE,
        name: '测试触发器',
        status: TriggerStatus.ACTIVE,
        config: {
          interval: -100, // 无效的间隔
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          triggerCount: 0,
          errorCount: 0,
        },
      }

      await expect(manager.registerTrigger(invalidTrigger)).rejects.toThrow(
        '触发器验证失败'
      )
    })

    it('应该验证事件触发器配置', async () => {
      const invalidTrigger: TriggerDefinition = {
        id: 'test-trigger',
        workflowId: 'test-workflow',
        type: TriggerType.EVENT,
        name: '测试触发器',
        status: TriggerStatus.ACTIVE,
        config: {
          // 缺少 eventType
        } as any,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          triggerCount: 0,
          errorCount: 0,
        },
      }

      await expect(manager.registerTrigger(invalidTrigger)).rejects.toThrow(
        '触发器验证失败'
      )
    })

    it('应该验证 Webhook 触发器配置', async () => {
      const invalidTrigger: TriggerDefinition = {
        id: 'test-trigger',
        workflowId: 'test-workflow',
        type: TriggerType.WEBHOOK,
        name: '测试触发器',
        status: TriggerStatus.ACTIVE,
        config: {
          // 缺少 endpoint
        } as any,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          triggerCount: 0,
          errorCount: 0,
        },
      }

      await expect(manager.registerTrigger(invalidTrigger)).rejects.toThrow(
        '触发器验证失败'
      )
    })
  })

  describe('触发器控制', () => {
    it('应该能够启动触发器', async () => {
      const trigger: TriggerDefinition = {
        id: 'test-trigger',
        workflowId: 'test-workflow',
        type: TriggerType.SCHEDULE,
        name: '测试触发器',
        status: TriggerStatus.PAUSED, // 初始为暂停状态
        config: {
          interval: 1000,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          triggerCount: 0,
          errorCount: 0,
        },
      }

      await manager.registerTrigger(trigger)
      await manager.startTrigger('test-trigger')

      const retrieved = manager.getTrigger('test-trigger')
      expect(retrieved?.status).toBe(TriggerStatus.ACTIVE)
    })

    it('应该能够停止触发器', async () => {
      const trigger: TriggerDefinition = {
        id: 'test-trigger',
        workflowId: 'test-workflow',
        type: TriggerType.SCHEDULE,
        name: '测试触发器',
        status: TriggerStatus.ACTIVE,
        config: {
          interval: 1000,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          triggerCount: 0,
          errorCount: 0,
        },
      }

      await manager.registerTrigger(trigger)
      await manager.stopTrigger('test-trigger')

      const retrieved = manager.getTrigger('test-trigger')
      expect(retrieved?.status).toBe(TriggerStatus.PAUSED)
    })

    it('应该能够暂停触发器', async () => {
      const trigger: TriggerDefinition = {
        id: 'test-trigger',
        workflowId: 'test-workflow',
        type: TriggerType.SCHEDULE,
        name: '测试触发器',
        status: TriggerStatus.ACTIVE,
        config: {
          interval: 1000,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          triggerCount: 0,
          errorCount: 0,
        },
      }

      await manager.registerTrigger(trigger)
      await manager.pauseTrigger('test-trigger')

      const retrieved = manager.getTrigger('test-trigger')
      expect(retrieved?.status).toBe(TriggerStatus.PAUSED)
    })

    it('应该能够恢复触发器', async () => {
      const trigger: TriggerDefinition = {
        id: 'test-trigger',
        workflowId: 'test-workflow',
        type: TriggerType.SCHEDULE,
        name: '测试触发器',
        status: TriggerStatus.PAUSED,
        config: {
          interval: 1000,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          triggerCount: 0,
          errorCount: 0,
        },
      }

      await manager.registerTrigger(trigger)
      await manager.resumeTrigger('test-trigger')

      const retrieved = manager.getTrigger('test-trigger')
      expect(retrieved?.status).toBe(TriggerStatus.ACTIVE)
    })
  })

  describe('触发器回调', () => {
    it('应该调用自定义回调', async () => {
      const callback = vi.fn<TriggerCallback>()
      manager.setTriggerCallback('test-trigger', callback)

      await manager.manualTrigger('test-trigger', { test: 'data' })

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-trigger',
        }),
        { test: 'data' }
      )
    })

    it('应该更新触发器元数据', async () => {
      const trigger: TriggerDefinition = {
        id: 'test-trigger',
        workflowId: 'test-workflow',
        type: TriggerType.SCHEDULE,
        name: '测试触发器',
        status: TriggerStatus.ACTIVE,
        config: {
          interval: 1000,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          triggerCount: 0,
          errorCount: 0,
        },
      }

      await manager.registerTrigger(trigger)
      await manager.manualTrigger('test-trigger')

      const retrieved = manager.getTrigger('test-trigger')
      expect(retrieved?.metadata.triggerCount).toBe(1)
      expect(retrieved?.metadata.lastTriggeredAt).toBeDefined()
    })
  })

  describe('触发器查询', () => {
    beforeEach(async () => {
      // 注册多个触发器
      const triggers: TriggerDefinition[] = [
        {
          id: 'trigger-1',
          workflowId: 'workflow-1',
          type: TriggerType.SCHEDULE,
          name: '触发器 1',
          status: TriggerStatus.ACTIVE,
          config: { interval: 1000 },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test',
            triggerCount: 0,
            errorCount: 0,
          },
        },
        {
          id: 'trigger-2',
          workflowId: 'workflow-2',
          type: TriggerType.EVENT,
          name: '触发器 2',
          status: TriggerStatus.PAUSED,
          config: { eventType: 'test.event' },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test',
            triggerCount: 0,
            errorCount: 0,
          },
        },
        {
          id: 'trigger-3',
          workflowId: 'workflow-1',
          type: TriggerType.WEBHOOK,
          name: '触发器 3',
          status: TriggerStatus.ACTIVE,
          config: { endpoint: '/webhook' },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test',
            triggerCount: 0,
            errorCount: 0,
          },
        },
      ]

      for (const trigger of triggers) {
        await manager.registerTrigger(trigger)
      }
    })

    it('应该获取所有触发器', () => {
      const triggers = manager.getAllTriggers()
      expect(triggers).toHaveLength(3)
    })

    it('应该按工作流 ID 过滤触发器', () => {
      const triggers = manager.getAllTriggers({ workflowId: 'workflow-1' })
      expect(triggers).toHaveLength(2)
      expect(triggers.every(t => t.workflowId === 'workflow-1')).toBe(true)
    })

    it('应该按类型过滤触发器', () => {
      const triggers = manager.getAllTriggers({ type: TriggerType.SCHEDULE })
      expect(triggers).toHaveLength(1)
      expect(triggers[0].type).toBe(TriggerType.SCHEDULE)
    })

    it('应该按状态过滤触发器', () => {
      const triggers = manager.getAllTriggers({ status: TriggerStatus.ACTIVE })
      expect(triggers).toHaveLength(2)
      expect(triggers.every(t => t.status === TriggerStatus.ACTIVE)).toBe(true)
    })

    it('应该获取工作流的所有触发器', () => {
      const triggers = manager.getWorkflowTriggers('workflow-1')
      expect(triggers).toHaveLength(2)
      expect(triggers.every(t => t.workflowId === 'workflow-1')).toBe(true)
    })
  })

  describe('触发器统计', () => {
    it('应该返回触发器统计信息', async () => {
      const trigger: TriggerDefinition = {
        id: 'test-trigger',
        workflowId: 'test-workflow',
        type: TriggerType.SCHEDULE,
        name: '测试触发器',
        status: TriggerStatus.ACTIVE,
        config: {
          interval: 1000,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          triggerCount: 5,
          errorCount: 2,
        },
      }

      await manager.registerTrigger(trigger)
      await manager.manualTrigger('test-trigger')

      const stats = manager.getTriggerStats('test-trigger')
      expect(stats).toBeDefined()
      expect(stats?.triggerCount).toBe(6) // 5 + 1 from manual trigger
      expect(stats?.errorCount).toBe(2)
      expect(stats?.lastTriggeredAt).toBeDefined()
    })

    it('应该返回 null 对于不存在的触发器', () => {
      const stats = manager.getTriggerStats('nonexistent')
      expect(stats).toBeNull()
    })
  })

  describe('触发器事件', () => {
    it('应该发出触发器注册事件', async () => {
      const eventSpy = vi.fn()
      manager.on('trigger:registered', eventSpy)

      const trigger: TriggerDefinition = {
        id: 'test-trigger',
        workflowId: 'test-workflow',
        type: TriggerType.SCHEDULE,
        name: '测试触发器',
        status: TriggerStatus.ACTIVE,
        config: {
          interval: 1000,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          triggerCount: 0,
          errorCount: 0,
        },
      }

      await manager.registerTrigger(trigger)

      expect(eventSpy).toHaveBeenCalledWith(trigger)
    })

    it('应该发出触发器启动事件', async () => {
      const eventSpy = vi.fn()
      manager.on('trigger:started', eventSpy)

      const trigger: TriggerDefinition = {
        id: 'test-trigger',
        workflowId: 'test-workflow',
        type: TriggerType.SCHEDULE,
        name: '测试触发器',
        status: TriggerStatus.PAUSED,
        config: {
          interval: 1000,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          triggerCount: 0,
          errorCount: 0,
        },
      }

      await manager.registerTrigger(trigger)
      await manager.startTrigger('test-trigger')

      expect(eventSpy).toHaveBeenCalled()
    })

    it('应该发出触发器激活事件', async () => {
      const eventSpy = vi.fn()
      manager.on('trigger:activated', eventSpy)

      const trigger: TriggerDefinition = {
        id: 'test-trigger',
        workflowId: 'test-workflow',
        type: TriggerType.SCHEDULE,
        name: '测试触发器',
        status: TriggerStatus.ACTIVE,
        config: {
          interval: 1000,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          triggerCount: 0,
          errorCount: 0,
        },
      }

      await manager.registerTrigger(trigger)
      await manager.manualTrigger('test-trigger')

      expect(eventSpy).toHaveBeenCalledWith({
        triggerId: 'test-trigger',
        workflowId: 'test-workflow',
        timestamp: expect.any(String),
        payload: {},
      })
    })
  })
})
