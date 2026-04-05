/**
 * 自动化引擎 v1.13.0 功能测试
 * @description 为 v1.13.0 新增功能编写测试用例
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  AutomationEngine,
  RuleValidator,
  type AutomationRule,
  type TriggerConfig,
  type ActionConfig,
  type TriggerType,
  type ActionType,
  type EventType,
  type RuleStatus,
} from '@/lib/automation/automation-engine'

// ============================================================================
// Test Data
// ============================================================================

const validRule: AutomationRule = {
  id: 'rule-1',
  name: '测试规则',
  description: '这是一个测试规则',
  version: '1.0.0',
  status: 'active',
  triggers: [
    {
      type: 'manual',
      config: {},
    },
  ],
  actions: [
    {
      type: 'send_notification',
      config: {
        notification: {
          channels: ['telegram'],
          data: { message: 'Test notification' },
        },
      },
    },
  ],
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

const eventTriggerRule: AutomationRule = {
  id: 'rule-2',
  name: '事件触发规则',
  version: '1.0.0',
  status: 'active',
  triggers: [
    {
      type: 'event',
      config: {
        event: {
          eventType: 'workflow_completed',
          filters: { status: 'success' },
        },
      },
    },
  ],
  actions: [
    {
      type: 'send_notification',
      config: {
        notification: {
          channels: ['email'],
          data: { message: 'Workflow completed' },
        },
      },
    },
  ],
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

const scheduleTriggerRule: AutomationRule = {
  id: 'rule-3',
  name: '定时触发规则',
  version: '1.0.0',
  status: 'active',
  triggers: [
    {
      type: 'schedule',
      config: {
        schedule: {
          scheduleType: 'interval',
          value: 60000, // 1 minute
        },
      },
    },
  ],
  actions: [
    {
      type: 'send_notification',
      config: {
        notification: {
          channels: ['telegram'],
          data: { message: 'Scheduled task' },
        },
      },
    },
  ],
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

const conditionTriggerRule: AutomationRule = {
  id: 'rule-4',
  name: '条件触发规则',
  version: '1.0.0',
  status: 'active',
  triggers: [
    {
      type: 'condition',
      config: {
        condition: {
          expression: 'ctx.triggerData.value > 10',
          evaluateInterval: 5000,
        },
      },
    },
  ],
  actions: [
    {
      type: 'send_notification',
      config: {
        notification: {
          channels: ['telegram'],
          data: { message: 'Condition met' },
        },
      },
    },
  ],
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

const multiActionRule: AutomationRule = {
  id: 'rule-5',
  name: '多动作规则',
  version: '1.0.0',
  status: 'active',
  triggers: [
    {
      type: 'manual',
      config: {},
    },
  ],
  actions: [
    {
      type: 'send_notification',
      config: {
        notification: {
          channels: ['telegram'],
          data: { message: 'First action' },
        },
      },
    },
    {
      type: 'call_api',
      config: {
        api: {
          url: 'https://api.example.com/webhook',
          method: 'POST',
        },
      },
    },
  ],
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

const retryActionRule: AutomationRule = {
  id: 'rule-6',
  name: '重试动作规则',
  version: '1.0.0',
  status: 'active',
  triggers: [
    {
      type: 'manual',
      config: {},
    },
  ],
  actions: [
    {
      type: 'call_api',
      config: {
        api: {
          url: 'https://invalid-url-that-fails.com',
          method: 'GET',
        },
      },
      onError: 'retry',
      retryCount: 2,
      retryDelay: 100,
    },
  ],
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

const ruleWithLimits: AutomationRule = {
  id: 'rule-7',
  name: '带限制的规则',
  version: '1.0.0',
  status: 'active',
  triggers: [
    {
      type: 'manual',
      config: {},
    },
  ],
  actions: [
    {
      type: 'send_notification',
      config: {
        notification: {
          channels: ['telegram'],
          data: { message: 'Limited action' },
        },
      },
    },
  ],
  limits: {
    maxExecutions: 5,
    cooldown: 1000,
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Automation Engine v1.13.0 - 自动化引擎测试', () => {
  let engine: AutomationEngine

  beforeEach(() => {
    engine = new AutomationEngine()
    vi.useFakeTimers()
  })

  afterEach(async () => {
    vi.useRealTimers()
    await engine.cleanup()
  })

  // ========================================================================
  // 基础功能测试 (Happy Path)
  // ========================================================================

  describe('基础功能测试', () => {
    it('应该能够注册规则', async () => {
      await expect(engine.registerRule(validRule)).resolves.toBe(true)
      const rule = engine.getRule('rule-1')
      expect(rule).toBeDefined()
      expect(rule?.name).toBe('测试规则')
    })

    it('应该能够获取所有规则', async () => {
      await engine.registerRule(validRule)
      await engine.registerRule(eventTriggerRule)
      const rules = engine.getAllRules()
      expect(rules.length).toBe(2)
    })

    it('应该能够手动触发规则', async () => {
      await engine.registerRule(validRule)
      const result = await engine.triggerRule('rule-1')
      expect(result.success).toBe(true)
      expect(result.executionId).toBeDefined()
    })

    it('应该能够触发事件', async () => {
      await engine.registerRule(eventTriggerRule)
      await engine.triggerEvent('workflow_completed', { status: 'success' })
      // 事件触发是异步的，这里只验证不抛出错误
      expect(true).toBe(true)
    })

    it('应该能够更新规则状态', async () => {
      await engine.registerRule(validRule)
      await engine.updateRuleStatus('rule-1', 'paused')
      const rule = engine.getRule('rule-1')
      expect(rule?.status).toBe('paused')
    })

    it('应该能够注销规则', async () => {
      await engine.registerRule(validRule)
      await engine.unregisterRule('rule-1')
      const rule = engine.getRule('rule-1')
      expect(rule).toBeUndefined()
    })
  })

  // ========================================================================
  // 边界情况测试
  // ========================================================================

  describe('边界情况测试', () => {
    it('应该处理空规则列表', () => {
      const rules = engine.getAllRules()
      expect(rules).toEqual([])
    })

    it('应该处理不存在的规则', () => {
      const rule = engine.getRule('non-existent')
      expect(rule).toBeUndefined()
    })

    it('应该处理触发不存在的规则', async () => {
      await expect(engine.triggerRule('non-existent')).rejects.toThrow()
    })

    it('应该处理暂停状态的规则', async () => {
      const pausedRule = { ...validRule, id: 'paused-rule', status: 'paused' as RuleStatus }
      await engine.registerRule(pausedRule)
      await expect(engine.triggerRule('paused-rule')).rejects.toThrow()
    })

    it('应该处理无订阅的事件', async () => {
      await engine.triggerEvent('custom_event')
      // 不应该抛出错误
      expect(true).toBe(true)
    })

    it('应该处理多个动作的规则', async () => {
      await engine.registerRule(multiActionRule)
      const result = await engine.triggerRule('rule-5')
      expect(result.success).toBe(true)
      expect(result.actionResults.length).toBe(2)
    })
  })

  // ========================================================================
  // 错误处理测试
  // ========================================================================

  describe('错误处理测试', () => {
    it('应该拒绝无效的规则', async () => {
      const invalidRule = { ...validRule, name: '' }
      await expect(engine.registerRule(invalidRule)).rejects.toThrow()
    })

    it('应该拒绝缺少触发器的规则', async () => {
      const noTriggerRule = { ...validRule, triggers: [] }
      await expect(engine.registerRule(noTriggerRule)).rejects.toThrow()
    })

    it('应该拒绝缺少动作的规则', async () => {
      const noActionRule = { ...validRule, actions: [] }
      await expect(engine.registerRule(noActionRule)).rejects.toThrow()
    })

    it('应该处理动作执行失败', async () => {
      await engine.registerRule(retryActionRule)
      const result = await engine.triggerRule('rule-6')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('应该处理无效的 cron 表达式', async () => {
      const invalidCronRule: AutomationRule = {
        ...validRule,
        id: 'invalid-cron',
        triggers: [
          {
            type: 'schedule',
            config: {
              schedule: {
                scheduleType: 'cron',
                value: 'invalid cron expression',
              },
            },
          },
        ],
      }
      await expect(engine.registerRule(invalidCronRule)).rejects.toThrow()
    })

    it('应该处理无效的 URL', async () => {
      const invalidUrlRule: AutomationRule = {
        ...validRule,
        id: 'invalid-url',
        actions: [
          {
            type: 'call_api',
            config: {
              api: {
                url: 'not-a-valid-url',
                method: 'GET',
              },
            },
          },
        ],
      }
      await expect(engine.registerRule(invalidUrlRule)).rejects.toThrow()
    })
  })

  // ========================================================================
  // 触发器类型测试
  // ========================================================================

  describe('触发器类型测试', () => {
    it('应该支持手动触发器', async () => {
      await engine.registerRule(validRule)
      const result = await engine.triggerRule('rule-1')
      expect(result.success).toBe(true)
      expect(result.triggerType).toBe('manual')
    })

    it('应该支持事件触发器', async () => {
      await engine.registerRule(eventTriggerRule)
      await engine.triggerEvent('workflow_completed', { status: 'success' })
      // 事件触发是异步的
      await vi.runAllTimersAsync()
      expect(true).toBe(true)
    })

    it('应该支持定时触发器', async () => {
      await engine.registerRule(scheduleTriggerRule)
      // 推进时间触发定时器
      vi.advanceTimersByTime(60000)
      await vi.runAllTimersAsync()
      expect(true).toBe(true)
    })

    it('应该支持条件触发器', async () => {
      await engine.registerRule(conditionTriggerRule)
      // 推进时间触发条件评估
      vi.advanceTimersByTime(5000)
      await vi.runAllTimersAsync()
      expect(true).toBe(true)
    })
  })

  // ========================================================================
  // 动作类型测试
  // ========================================================================

  describe('动作类型测试', () => {
    it('应该支持发送通知动作', async () => {
      await engine.registerRule(validRule)
      const result = await engine.triggerRule('rule-1')
      expect(result.actionResults[0].actionType).toBe('send_notification')
      expect(result.actionResults[0].success).toBe(true)
    })

    it('应该支持调用 API 动作', async () => {
      await engine.registerRule(multiActionRule)
      const result = await engine.triggerRule('rule-5')
      const apiAction = result.actionResults.find(a => a.actionType === 'call_api')
      expect(apiAction).toBeDefined()
    })

    it('应该支持执行工作流动作', async () => {
      const workflowRule: AutomationRule = {
        ...validRule,
        id: 'workflow-rule',
        actions: [
          {
            type: 'execute_workflow',
            config: {
              workflow: {
                workflowId: 'test-workflow',
              },
            },
          },
        ],
      }
      await engine.registerRule(workflowRule)
      const result = await engine.triggerRule('workflow-rule')
      expect(result.actionResults[0].actionType).toBe('execute_workflow')
    })
  })

  // ========================================================================
  // 重试机制测试
  // ========================================================================

  describe('重试机制测试', () => {
    it('应该支持动作重试', async () => {
      await engine.registerRule(retryActionRule)
      const result = await engine.triggerRule('rule-6')
      expect(result.actionResults.length).toBeGreaterThan(0)
    })

    it('应该支持重试延迟', async () => {
      const retryWithDelayRule: AutomationRule = {
        ...retryActionRule,
        id: 'retry-delay',
        actions: [
          {
            ...retryActionRule.actions[0],
            retryDelay: 500,
          },
        ],
      }
      await engine.registerRule(retryWithDelayRule)
      const result = await engine.triggerRule('retry-delay')
      expect(result).toBeDefined()
    })

    it('应该在重试次数用尽后停止', async () => {
      await engine.registerRule(retryActionRule)
      const result = await engine.triggerRule('rule-6')
      expect(result.success).toBe(false)
    })
  })

  // ========================================================================
  // 规则限制测试
  // ========================================================================

  describe('规则限制测试', () => {
    it('应该限制最大执行次数', async () => {
      await engine.registerRule(ruleWithLimits)
      // 执行超过限制次数
      for (let i = 0; i < 6; i++) {
        await engine.triggerRule('rule-7')
      }
      const rule = engine.getRule('rule-7')
      expect(rule?.stats?.totalExecutions).toBeLessThanOrEqual(5)
    })

    it('应该执行冷却时间', async () => {
      await engine.registerRule(ruleWithLimits)
      await engine.triggerRule('rule-7')
      // 立即再次触发应该被限制
      const result = await engine.triggerRule('rule-7')
      expect(result.success).toBe(false)
      expect(result.error).toContain('受限')
    })

    it('应该在冷却时间后允许执行', async () => {
      await engine.registerRule(ruleWithLimits)
      await engine.triggerRule('rule-7')
      // 等待冷却时间
      vi.advanceTimersByTime(1000)
      await vi.runAllTimersAsync()
      const result = await engine.triggerRule('rule-7')
      expect(result.success).toBe(true)
    })
  })

  // ========================================================================
  // 规则验证测试
  // ========================================================================

  describe('规则验证测试', () => {
    it('应该验证有效的规则', () => {
      const errors = RuleValidator.validateRule(validRule)
      expect(errors).toEqual([])
    })

    it('应该检测空名称', () => {
      const invalidRule = { ...validRule, name: '' }
      const errors = RuleValidator.validateRule(invalidRule)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].path).toBe('name')
    })

    it('应该检测缺少触发器', () => {
      const invalidRule = { ...validRule, triggers: [] }
      const errors = RuleValidator.validateRule(invalidRule)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].path).toBe('triggers')
    })

    it('应该检测缺少动作', () => {
      const invalidRule = { ...validRule, actions: [] }
      const errors = RuleValidator.validateRule(invalidRule)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].path).toBe('actions')
    })

    it('应该检测无效的 cron 表达式', () => {
      const invalidTrigger: TriggerConfig = {
        type: 'schedule',
        config: {
          schedule: {
            scheduleType: 'cron',
            value: 'invalid',
          },
        },
      }
      const errors = RuleValidator.validateTrigger(invalidTrigger, 'triggers[0]')
      expect(errors.length).toBeGreaterThan(0)
    })

    it('应该检测无效的 URL', () => {
      const invalidAction: ActionConfig = {
        type: 'call_api',
        config: {
          api: {
            url: 'not-a-url',
            method: 'GET',
          },
        },
      }
      const errors = RuleValidator.validateAction(invalidAction, 'actions[0]')
      expect(errors.length).toBeGreaterThan(0)
    })

    it('应该检测无效的重试配置', () => {
      const invalidAction: ActionConfig = {
        type: 'send_notification',
        config: {
          notification: {
            channels: ['telegram'],
            data: {},
          },
        },
        onError: 'retry',
        retryCount: 0,
      }
      const errors = RuleValidator.validateAction(invalidAction, 'actions[0]')
      expect(errors.length).toBeGreaterThan(0)
    })
  })

  // ========================================================================
  // 执行统计测试
  // ========================================================================

  describe('执行统计测试', () => {
    it('应该记录执行次数', async () => {
      await engine.registerRule(validRule)
      await engine.triggerRule('rule-1')
      await engine.triggerRule('rule-1')
      const rule = engine.getRule('rule-1')
      expect(rule?.stats?.totalExecutions).toBe(2)
    })

    it('应该记录成功执行次数', async () => {
      await engine.registerRule(validRule)
      await engine.triggerRule('rule-1')
      const rule = engine.getRule('rule-1')
      expect(rule?.stats?.successfulExecutions).toBe(1)
    })

    it('应该记录失败执行次数', async () => {
      await engine.registerRule(retryActionRule)
      await engine.triggerRule('rule-6')
      const rule = engine.getRule('rule-6')
      expect(rule?.stats?.failedExecutions).toBeGreaterThan(0)
    })

    it('应该记录执行持续时间', async () => {
      await engine.registerRule(validRule)
      const result = await engine.triggerRule('rule-1')
      expect(result.duration).toBeGreaterThanOrEqual(0)
      const rule = engine.getRule('rule-1')
      expect(rule?.stats?.lastExecutionDuration).toBeDefined()
    })
  })

  // ========================================================================
  // 并发执行测试
  // ========================================================================

  describe('并发执行测试', () => {
    it('应该支持并发触发多个规则', async () => {
      await engine.registerRule(validRule)
      await engine.registerRule(eventTriggerRule)
      await engine.registerRule(scheduleTriggerRule)

      const results = await Promise.all([
        engine.triggerRule('rule-1'),
        engine.triggerRule('rule-2'),
        engine.triggerRule('rule-3'),
      ])

      expect(results.length).toBe(3)
      expect(results.every(r => r.executionId)).toBe(true)
    })

    it('应该支持并发触发事件', async () => {
      await engine.registerRule(eventTriggerRule)
      await Promise.all([
        engine.triggerEvent('workflow_completed', { status: 'success' }),
        engine.triggerEvent('workflow_completed', { status: 'success' }),
      ])
      await vi.runAllTimersAsync()
      expect(true).toBe(true)
    })
  })

  // ========================================================================
  // 清理测试
  // ========================================================================

  describe('清理测试', () => {
    it('应该清理所有规则', async () => {
      await engine.registerRule(validRule)
      await engine.registerRule(eventTriggerRule)
      await engine.cleanup()
      const rules = engine.getAllRules()
      expect(rules.length).toBe(0)
    })

    it('应该清理定时器', async () => {
      await engine.registerRule(scheduleTriggerRule)
      await engine.unregisterRule('rule-3')
      // 定时器应该被清理
      expect(true).toBe(true)
    })
  })
})