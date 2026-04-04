/**
 * Automation Engine Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AutomationEngine, RuleValidator, type AutomationRule } from '../automation-engine'

describe('AutomationEngine', () => {
  let engine: AutomationEngine

  beforeEach(() => {
    engine = new AutomationEngine()
  })

  afterEach(async () => {
    await engine.cleanup()
  })

  describe('Rule Registration', () => {
    it('should register a valid rule', async () => {
      const rule = createTestRule('test_rule_1')

      await engine.registerRule(rule)

      const retrieved = engine.getRule('test_rule_1')
      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('Test Rule 1')
    })

    it('should reject invalid rule', async () => {
      const invalidRule = {
        id: 'invalid_rule',
        name: '',
        version: '1.0.0',
        status: 'active' as const,
        triggers: [],
        actions: [],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }

      await expect(engine.registerRule(invalidRule)).rejects.toThrow('规则验证失败')
    })

    it('should update existing rule', async () => {
      const rule = createTestRule('test_rule_1')

      await engine.registerRule(rule)

      const updatedRule = {
        ...rule,
        name: 'Updated Rule',
      }

      await engine.registerRule(updatedRule)

      const retrieved = engine.getRule('test_rule_1')
      expect(retrieved?.name).toBe('Updated Rule')
    })

    it('should unregister rule', async () => {
      const rule = createTestRule('test_rule_1')

      await engine.registerRule(rule)
      await engine.unregisterRule('test_rule_1')

      const retrieved = engine.getRule('test_rule_1')
      expect(retrieved).toBeUndefined()
    })
  })

  describe('Rule Validation', () => {
    it('should validate required fields', () => {
      const rule = {
        id: 'test',
        name: '',
        version: '1.0.0',
        status: 'active' as const,
        triggers: [],
        actions: [],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }

      const errors = RuleValidator.validateRule(rule)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some((e) => e.code === 'REQUIRED_FIELD')).toBe(true)
    })

    it('should validate triggers', () => {
      const rule = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        status: 'active' as const,
        triggers: [{ type: 'event' as const, config: {} }],
        actions: [createTestAction()],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }

      const errors = RuleValidator.validateRule(rule)

      expect(errors.some((e) => e.code === 'REQUIRED_FIELD')).toBe(true)
    })

    it('should validate actions', () => {
      const rule = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        status: 'active' as const,
        triggers: [createTestTrigger()],
        actions: [{ type: 'execute_workflow' as const, config: {} }],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }

      const errors = RuleValidator.validateRule(rule)

      expect(errors.some((e) => e.code === 'REQUIRED_FIELD')).toBe(true)
    })

    it('should validate cron expression', () => {
      expect(RuleValidator.isValidCron('0 2 * * *')).toBe(true)
      expect(RuleValidator.isValidCron('*/5 * * * *')).toBe(true)
      expect(RuleValidator.isValidCron('0 9-17 * * 1-5')).toBe(true)
      expect(RuleValidator.isValidCron('invalid')).toBe(false)
      expect(RuleValidator.isValidCron('0 0 * * * * *')).toBe(false)
    })

    it('should validate URL', () => {
      expect(RuleValidator.isValidUrl('https://example.com')).toBe(true)
      expect(RuleValidator.isValidUrl('http://localhost:3000/api')).toBe(true)
      expect(RuleValidator.isValidUrl('invalid-url')).toBe(false)
      expect(RuleValidator.isValidUrl('')).toBe(false)
    })

    it('should validate condition expression', () => {
      const error1 = RuleValidator.validateCondition('ctx.value > 10', 'condition')
      expect(error1).toBeNull()

      const error2 = RuleValidator.validateCondition('ctx.import("fs")', 'condition')
      expect(error2).toBeDefined()
      expect(error2?.code).toBe('INVALID_CONDITION')
    })
  })

  describe('Rule Status Management', () => {
    it('should update rule status', async () => {
      const rule = createTestRule('test_rule_1')
      rule.status = 'paused'

      await engine.registerRule(rule)
      await engine.updateRuleStatus('test_rule_1', 'active')

      const retrieved = engine.getRule('test_rule_1')
      expect(retrieved?.status).toBe('active')
    })

    it('should throw error for non-existent rule', async () => {
      await expect(engine.updateRuleStatus('non_existent', 'active')).rejects.toThrow('规则不存在')
    })
  })

  describe('Manual Trigger', () => {
    it('should trigger rule manually', async () => {
      const rule = createTestRule('test_rule_1')
      rule.triggers = [
        {
          type: 'manual',
          config: {
            manual: {
              requireConfirmation: false,
            },
          },
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      const result = await engine.triggerRule('test_rule_1', { test: true })

      expect(result.success).toBe(true)
      expect(result.executionId).toBeDefined()
      expect(result.actionResults.length).toBeGreaterThan(0)
    })

    it('should reject trigger for non-active rule', async () => {
      const rule = createTestRule('test_rule_1')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.status = 'paused'

      await engine.registerRule(rule)

      await expect(engine.triggerRule('test_rule_1')).rejects.toThrow('规则未激活')
    })

    it('should reject trigger for rule without manual trigger', async () => {
      const rule = createTestRule('test_rule_1')
      rule.status = 'active'

      await engine.registerRule(rule)

      await expect(engine.triggerRule('test_rule_1')).rejects.toThrow('规则不支持手动触发')
    })
  })

  describe('Rule Limits', () => {
    it('should enforce max executions limit', async () => {
      const rule = createTestRule('test_rule_1')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.status = 'active'
      rule.limits = { maxExecutions: 1 }
      rule.stats = { totalExecutions: 1, successfulExecutions: 1, failedExecutions: 0 }

      await engine.registerRule(rule)

      const result = await engine.triggerRule('test_rule_1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('规则执行次数受限')
    })
  })
})

// ============================================================================
// Helper Functions
// ============================================================================

function createTestRule(id: string): AutomationRule {
  return {
    id,
    name: `Test Rule ${id}`,
    version: '1.0.0',
    status: 'active',
    triggers: [createTestTrigger()],
    actions: [createTestAction()],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }
}

function createTestTrigger(): AutomationRule['triggers'][0] {
  return {
    type: 'event',
    config: {
      event: {
        eventType: 'workflow_completed',
      },
    },
  }
}

function createTestAction(): AutomationRule['actions'][0] {
  return {
    type: 'send_notification',
    config: {
      notification: {
        channels: ['telegram'],
        data: { message: 'Test notification' },
      },
    },
  }
}
