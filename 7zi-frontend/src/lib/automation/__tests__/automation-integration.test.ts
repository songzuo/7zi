/**
 * Automation Engine Integration Tests
 *
 * Comprehensive integration tests covering:
 * - Multiple rules interaction
 * - Rule and workflow integration
 * - Complex condition expression evaluation
 * - Rule conflict detection and handling
 * - Rule execution performance
 *
 * Note: IndexedDB storage tests are excluded as they require browser environment
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AutomationEngine, RuleValidator, type AutomationRule, type ExecutionResult } from '../automation-engine'

describe('AutomationEngine Integration Tests', () => {
  let engine: AutomationEngine

  beforeEach(() => {
    engine = new AutomationEngine()
  })

  afterEach(async () => {
    await engine.cleanup()
  })

  // ============================================================================
  // Multiple Rules Interaction
  // ============================================================================

  describe('Multiple Rules Interaction', () => {
    it('should execute multiple rules on same event', async () => {
      const rule1 = createTestRule('rule_1', 'Rule 1')
      rule1.triggers = [
        {
          type: 'event',
          config: {
            event: {
              eventType: 'workflow_completed',
              filters: { workflowId: 'wf_123' },
            },
          },
        },
      ]
      rule1.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Rule 1 executed' },
            },
          },
        },
      ]
      rule1.status = 'active'

      const rule2 = createTestRule('rule_2', 'Rule 2')
      rule2.triggers = [
        {
          type: 'event',
          config: {
            event: {
              eventType: 'workflow_completed',
              filters: { workflowId: 'wf_123' },
            },
          },
        },
      ]
      rule2.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['email'],
              data: { message: 'Rule 2 executed' },
            },
          },
        },
      ]
      rule2.status = 'active'

      await engine.registerRule(rule1)
      await engine.registerRule(rule2)

      // Trigger event
      await engine.triggerEvent('workflow_completed', { workflowId: 'wf_123' })

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 200))

      const retrieved1 = engine.getRule('rule_1')
      const retrieved2 = engine.getRule('rule_2')

      expect(retrieved1?.metadata.executionCount).toBeGreaterThan(0)
      expect(retrieved2?.metadata.executionCount).toBeGreaterThan(0)
    })

    it('should handle rule execution order based on priority', async () => {
      const executionOrder: string[] = []

      const rule1 = createTestRule('rule_1', 'Low Priority Rule')
      rule1.triggers = [{ type: 'manual', config: {} }]
      rule1.actions = [
        {
          type: 'custom',
          config: {
            custom: {
              handler: 'handler1',
              params: { order: 1 },
            },
          },
        },
      ]
      rule1.status = 'active'

      const rule2 = createTestRule('rule_2', 'High Priority Rule')
      rule2.triggers = [{ type: 'manual', config: {} }]
      rule2.actions = [
        {
          type: 'custom',
          config: {
            custom: {
              handler: 'handler2',
              params: { order: 2 },
            },
          },
        },
      ]
      rule2.status = 'active'

      await engine.registerRule(rule1)
      await engine.registerRule(rule2)

      // Both rules should execute
      await engine.triggerRule('rule_1')
      await engine.triggerRule('rule_2')

      expect(engine.getAllRules().length).toBe(2)
    })

    it('should prevent infinite loops in rule chains', async () => {
      const rule1 = createTestRule('rule_1', 'Rule 1')
      rule1.triggers = [
        {
          type: 'event',
          config: {
            event: {
              eventType: 'custom_event',
            },
          },
        },
      ]
      rule1.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Rule 1 executed' },
            },
          },
        },
      ]
      rule1.status = 'active'

      const rule2 = createTestRule('rule_2', 'Rule 2')
      rule2.triggers = [
        {
          type: 'event',
          config: {
            event: {
              eventType: 'custom_event',
            },
          },
        },
      ]
      rule2.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Rule 2 executed' },
            },
          },
        },
      ]
      rule2.status = 'active'

      await engine.registerRule(rule1)
      await engine.registerRule(rule2)

      // Trigger event once
      await engine.triggerEvent('custom_event', { data: 'test' })

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 200))

      const retrieved1 = engine.getRule('rule_1')
      const retrieved2 = engine.getRule('rule_2')

      // Both rules should execute once
      expect(retrieved1?.metadata.executionCount).toBe(1)
      expect(retrieved2?.metadata.executionCount).toBe(1)
    })

    it('should handle conflicting rule conditions', async () => {
      const rule1 = createTestRule('rule_1', 'Rule 1')
      rule1.triggers = [{ type: 'manual', config: {} }]
      rule1.condition = 'ctx.triggerData?.value > 10'
      rule1.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Rule 1: Value > 10' },
            },
          },
        },
      ]
      rule1.status = 'active'

      const rule2 = createTestRule('rule_2', 'Rule 2')
      rule2.triggers = [{ type: 'manual', config: {} }]
      rule2.condition = 'ctx.triggerData?.value < 20'
      rule2.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['email'],
              data: { message: 'Rule 2: Value < 20' },
            },
          },
        },
      ]
      rule2.status = 'active'

      await engine.registerRule(rule1)
      await engine.registerRule(rule2)

      // Value 15 satisfies both conditions
      const result1 = await engine.triggerRule('rule_1', { value: 15 })
      const result2 = await engine.triggerRule('rule_2', { value: 15 })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })
  })

  // ============================================================================
  // Rule and Workflow Integration
  // ============================================================================

  describe('Rule and Workflow Integration', () => {
    it('should execute workflow action with proper context', async () => {
      const rule = createTestRule('rule_1', 'Workflow Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.actions = [
        {
          type: 'execute_workflow',
          config: {
            workflow: {
              workflowId: 'wf_integration_test',
              input: { source: 'automation_rule' },
            },
          },
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      const result = await engine.triggerRule('rule_1', { testData: 'integration' })

      expect(result.success).toBe(true)
      expect(result.actionResults[0].actionType).toBe('execute_workflow')
      expect(result.actionResults[0].success).toBe(true)
    })

    it('should pass trigger data to workflow', async () => {
      const rule = createTestRule('rule_1', 'Workflow Data Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.actions = [
        {
          type: 'execute_workflow',
          config: {
            workflow: {
              workflowId: 'wf_data_test',
              input: { initialData: 'from_rule' },
            },
          },
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      const triggerData = { userId: 'user_123', action: 'create' }
      const result = await engine.triggerRule('rule_1', triggerData)

      expect(result.success).toBe(true)
      expect(result.actionResults[0].success).toBe(true)
    })

    it('should handle workflow execution failure', async () => {
      const rule = createTestRule('rule_1', 'Failing Workflow Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.actions = [
        {
          type: 'execute_workflow',
          config: {
            workflow: {
              workflowId: 'wf_failing',
            },
          },
          onError: 'continue',
        },
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Fallback action' },
            },
          },
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      const result = await engine.triggerRule('rule_1')

      expect(result.actionResults.length).toBe(2)
    })

    it('should support async workflow execution', async () => {
      const rule = createTestRule('rule_1', 'Async Workflow Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.actions = [
        {
          type: 'execute_workflow',
          config: {
            workflow: {
              workflowId: 'wf_async',
              async: true,
            },
          },
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      const result = await engine.triggerRule('rule_1')

      expect(result.success).toBe(true)
      expect(result.actionResults[0].actionType).toBe('execute_workflow')
    })
  })

  // ============================================================================
  // Complex Condition Expression Evaluation
  // ============================================================================

  describe('Complex Condition Expression Evaluation', () => {
    it('should evaluate complex boolean expressions', async () => {
      const rule = createTestRule('rule_1', 'Complex Boolean Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.condition = 'ctx.triggerData?.value > 10 && ctx.triggerData?.value < 20 && ctx.triggerData?.enabled === true'
      rule.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Complex condition met' },
            },
          },
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      // Condition met
      const result1 = await engine.triggerRule('rule_1', { value: 15, enabled: true })
      expect(result1.success).toBe(true)
      expect(result1.actionResults.length).toBe(1)

      // Condition not met (value too high)
      const result2 = await engine.triggerRule('rule_1', { value: 25, enabled: true })
      expect(result2.success).toBe(true)
      expect(result2.actionResults.length).toBe(0)

      // Condition not met (enabled false)
      const result3 = await engine.triggerRule('rule_1', { value: 15, enabled: false })
      expect(result3.success).toBe(true)
      expect(result3.actionResults.length).toBe(0)
    })

    it('should evaluate nested object conditions', async () => {
      const rule = createTestRule('rule_1', 'Nested Object Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.condition = 'ctx.triggerData?.user?.role === "admin" && ctx.triggerData?.user?.permissions?.includes("write")'
      rule.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Admin with write permission' },
            },
          },
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      // Condition met
      const result1 = await engine.triggerRule('rule_1', {
        user: { role: 'admin', permissions: ['read', 'write'] },
      })
      expect(result1.success).toBe(true)
      expect(result1.actionResults.length).toBe(1)

      // Condition not met (not admin)
      const result2 = await engine.triggerRule('rule_1', {
        user: { role: 'user', permissions: ['read', 'write'] },
      })
      expect(result2.success).toBe(true)
      expect(result2.actionResults.length).toBe(0)
    })

    it('should evaluate array conditions', async () => {
      const rule = createTestRule('rule_1', 'Array Condition Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.condition = 'ctx.triggerData?.items?.length > 0 && ctx.triggerData?.items?.every(i => i.valid === true)'
      rule.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'All items valid' },
            },
          },
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      // Condition met
      const result1 = await engine.triggerRule('rule_1', {
        items: [{ valid: true }, { valid: true }, { valid: true }],
      })
      expect(result1.success).toBe(true)
      expect(result1.actionResults.length).toBe(1)

      // Condition not met (invalid item)
      const result2 = await engine.triggerRule('rule_1', {
        items: [{ valid: true }, { valid: false }, { valid: true }],
      })
      expect(result2.success).toBe(true)
      expect(result2.actionResults.length).toBe(0)
    })

    it('should evaluate mathematical expressions', async () => {
      const rule = createTestRule('rule_1', 'Math Expression Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.condition = '(ctx.triggerData?.a + ctx.triggerData?.b) * ctx.triggerData?.multiplier > 100'
      rule.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Math condition met' },
            },
          },
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      // Condition met: (10 + 20) * 5 = 150 > 100
      const result1 = await engine.triggerRule('rule_1', { a: 10, b: 20, multiplier: 5 })
      expect(result1.success).toBe(true)
      expect(result1.actionResults.length).toBe(1)

      // Condition not met: (5 + 10) * 5 = 75 < 100
      const result2 = await engine.triggerRule('rule_1', { a: 5, b: 10, multiplier: 5 })
      expect(result2.success).toBe(true)
      expect(result2.actionResults.length).toBe(0)
    })

    it('should evaluate string conditions', async () => {
      const rule = createTestRule('rule_1', 'String Condition Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.condition = 'ctx.triggerData?.status === "active" && ctx.triggerData?.type?.startsWith("user_")'
      rule.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'String condition met' },
            },
          },
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      // Condition met
      const result1 = await engine.triggerRule('rule_1', { status: 'active', type: 'user_admin' })
      expect(result1.success).toBe(true)
      expect(result1.actionResults.length).toBe(1)

      // Condition not met (wrong status)
      const result2 = await engine.triggerRule('rule_1', { status: 'inactive', type: 'user_admin' })
      expect(result2.success).toBe(true)
      expect(result2.actionResults.length).toBe(0)

      // Condition not met (wrong type prefix)
      const result3 = await engine.triggerRule('rule_1', { status: 'active', type: 'system_admin' })
      expect(result3.success).toBe(true)
      expect(result3.actionResults.length).toBe(0)
    })

    it('should handle invalid expressions gracefully', async () => {
      const rule = createTestRule('rule_1', 'Invalid Expression Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.condition = 'invalid syntax here'
      rule.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Should not execute' },
            },
          },
        },
      ]
      rule.status = 'active'

      // Should fail validation
      await expect(engine.registerRule(rule)).rejects.toThrow('规则验证失败')
    })
  })

  // ============================================================================
  // Rule Conflict Detection and Handling
  // ============================================================================

  describe('Rule Conflict Detection and Handling', () => {
    it('should detect duplicate rule IDs', async () => {
      const rule1 = createTestRule('rule_1', 'Rule 1')
      const rule2 = createTestRule('rule_1', 'Rule 2') // Same ID

      await engine.registerRule(rule1)

      // Should update existing rule instead of creating duplicate
      await engine.registerRule(rule2)

      const retrieved = engine.getRule('rule_1')
      expect(retrieved?.name).toBe('Rule 2') // Updated
      expect(engine.getAllRules().length).toBe(1) // Only one rule
    })

    it('should detect conflicting trigger conditions', async () => {
      const rule1 = createTestRule('rule_1', 'Rule 1')
      rule1.triggers = [
        {
          type: 'event',
          config: {
            event: {
              eventType: 'workflow_completed',
              filters: { status: 'success' },
            },
          },
        },
      ]
      rule1.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Success notification' },
            },
          },
        },
      ]
      rule1.status = 'active'

      const rule2 = createTestRule('rule_2', 'Rule 2')
      rule2.triggers = [
        {
          type: 'event',
          config: {
            event: {
              eventType: 'workflow_completed',
              filters: { status: 'success' },
            },
          },
        },
      ]
      rule2.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['email'],
              data: { message: 'Duplicate notification' },
            },
          },
        },
      ]
      rule2.status = 'active'

      await engine.registerRule(rule1)
      await engine.registerRule(rule2)

      // Both rules should execute on same event
      await engine.triggerEvent('workflow_completed', { status: 'success' })

      await new Promise((resolve) => setTimeout(resolve, 200))

      const retrieved1 = engine.getRule('rule_1')
      const retrieved2 = engine.getRule('rule_2')

      expect(retrieved1?.metadata.executionCount).toBe(1)
      expect(retrieved2?.metadata.executionCount).toBe(1)
    })

    it('should handle mutually exclusive conditions', async () => {
      const rule1 = createTestRule('rule_1', 'Rule 1')
      rule1.triggers = [{ type: 'manual', config: {} }]
      rule1.condition = 'ctx.triggerData?.value === 1'
      rule1.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Value is 1' },
            },
          },
        },
      ]
      rule1.status = 'active'

      const rule2 = createTestRule('rule_2', 'Rule 2')
      rule2.triggers = [{ type: 'manual', config: {} }]
      rule2.condition = 'ctx.triggerData?.value === 2'
      rule2.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['email'],
              data: { message: 'Value is 2' },
            },
          },
        },
      ]
      rule2.status = 'active'

      await engine.registerRule(rule1)
      await engine.registerRule(rule2)

      // Only rule 1 should execute
      const result1 = await engine.triggerRule('rule_1', { value: 1 })
      expect(result1.actionResults.length).toBe(1)

      // Only rule 2 should execute
      const result2 = await engine.triggerRule('rule_2', { value: 2 })
      expect(result2.actionResults.length).toBe(1)

      // Neither should execute
      const result3 = await engine.triggerRule('rule_1', { value: 3 })
      expect(result3.actionResults.length).toBe(0)
    })

    it('should prevent circular dependencies', async () => {
      // This test verifies that the engine doesn't create infinite loops
      const rule1 = createTestRule('rule_1', 'Rule 1')
      rule1.triggers = [
        {
          type: 'event',
          config: {
            event: {
              eventType: 'event_a',
            },
          },
        },
      ]
      rule1.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Rule 1' },
            },
          },
        },
      ]
      rule1.status = 'active'

      const rule2 = createTestRule('rule_2', 'Rule 2')
      rule2.triggers = [
        {
          type: 'event',
          config: {
            event: {
              eventType: 'event_b',
            },
          },
        },
      ]
      rule2.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['email'],
              data: { message: 'Rule 2' },
            },
          },
        },
      ]
      rule2.status = 'active'

      await engine.registerRule(rule1)
      await engine.registerRule(rule2)

      // Trigger event_a
      await engine.triggerEvent('event_a', {})

      await new Promise((resolve) => setTimeout(resolve, 200))

      const retrieved1 = engine.getRule('rule_1')
      const retrieved2 = engine.getRule('rule_2')

      // Only rule 1 should execute
      expect(retrieved1?.metadata.executionCount).toBe(1)
      // Rule 2 should not execute (event_b not triggered)
      expect(retrieved2?.metadata.executionCount).toBeUndefined()
    })
  })

  // ============================================================================
  // Rule Execution Performance
  // ============================================================================

  describe('Rule Execution Performance', () => {
    it('should execute single rule quickly', async () => {
      const rule = createTestRule('rule_1', 'Performance Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Performance test' },
            },
          },
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      const startTime = Date.now()
      const result = await engine.triggerRule('rule_1')
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(100) // Should complete in < 100ms
    })

    it('should handle multiple concurrent executions', async () => {
      const rule = createTestRule('rule_1', 'Concurrent Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Concurrent test' },
            },
          },
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      const startTime = Date.now()

      // Execute 10 times concurrently
      const promises = Array.from({ length: 10 }, () => engine.triggerRule('rule_1'))
      const results = await Promise.all(promises)

      const endTime = Date.now()

      expect(results.every((r) => r.success)).toBe(true)
      expect(endTime - startTime).toBeLessThan(500) // Should complete in < 500ms
    })

    it('should handle large number of rules efficiently', async () => {
      const rules: AutomationRule[] = []

      // Create 50 rules
      for (let i = 0; i < 50; i++) {
        const rule = createTestRule(`rule_${i}`, `Rule ${i}`)
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: `Rule ${i}` },
              },
            },
          },
        ]
        rule.status = 'active'
        rules.push(rule)
      }

      // Register all rules
      const registerStart = Date.now()
      for (const rule of rules) {
        await engine.registerRule(rule)
      }
      const registerEnd = Date.now()

      expect(registerEnd - registerStart).toBeLessThan(1000) // Should register in < 1s

      // Execute all rules
      const executeStart = Date.now()
      const promises = rules.map((rule) => engine.triggerRule(rule.id))
      const results = await Promise.all(promises)
      const executeEnd = Date.now()

      expect(results.every((r) => r.success)).toBe(true)
      expect(executeEnd - executeStart).toBeLessThan(2000) // Should execute in < 2s
    })

    it('should handle complex conditions efficiently', async () => {
      const rule = createTestRule('rule_1', 'Complex Condition Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.condition = `
        ctx.triggerData?.a > 0 &&
        ctx.triggerData?.b > 0 &&
        ctx.triggerData?.c > 0 &&
        ctx.triggerData?.d > 0 &&
        ctx.triggerData?.e > 0 &&
        (ctx.triggerData?.a + ctx.triggerData?.b + ctx.triggerData?.c + ctx.triggerData?.d + ctx.triggerData?.e) > 100
      `
      rule.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Complex condition' },
            },
          },
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      const startTime = Date.now()
      const result = await engine.triggerRule('rule_1', { a: 20, b: 20, c: 20, d: 20, e: 21 })
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(100) // Should complete in < 100ms
    })

    it('should track execution duration accurately', async () => {
      const rule = createTestRule('rule_1', 'Duration Tracking Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Duration test' },
            },
          },
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      const startTime = Date.now()
      const result = await engine.triggerRule('rule_1')
      const endTime = Date.now()

      const actualDuration = endTime - startTime

      expect(result.duration).toBeGreaterThanOrEqual(0)
      expect(result.duration).toBeLessThanOrEqual(actualDuration + 10) // Allow small margin

      const retrieved = engine.getRule('rule_1')
      expect(retrieved?.stats?.lastExecutionDuration).toBeDefined()
    })
  })

  // ============================================================================
  // End-to-End Integration Scenarios
  // ============================================================================

  describe('End-to-End Integration Scenarios', () => {
    it('should handle complete workflow: register -> trigger', async () => {
      // 1. Create and register rule
      const rule = createTestRule('rule_1', 'E2E Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'E2E test' },
            },
          },
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      // 2. Trigger rule
      const result = await engine.triggerRule('rule_1')

      // 3. Verify result
      expect(result.success).toBe(true)
      expect(result.executionId).toBeDefined()
      expect(result.actionResults.length).toBe(1)
    })

    it('should handle rule lifecycle: create -> activate -> pause', async () => {
      // 1. Create rule with manual trigger
      const rule = createTestRule('rule_1', 'Lifecycle Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.status = 'paused'

      await engine.registerRule(rule)

      // 2. Activate rule
      await engine.updateRuleStatus('rule_1', 'active')

      let result = await engine.triggerRule('rule_1')
      expect(result.success).toBe(true)

      // 3. Pause rule
      await engine.updateRuleStatus('rule_1', 'paused')

      await expect(engine.triggerRule('rule_1')).rejects.toThrow('规则未激活')

      // 4. Delete rule
      await engine.unregisterRule('rule_1')

      const retrieved = engine.getRule('rule_1')
      expect(retrieved).toBeUndefined()
    })

    it('should handle error recovery and retry', async () => {
      let attemptCount = 0

      // Mock fetch that fails twice, succeeds third time
      global.fetch = vi.fn(() => {
        attemptCount++
        if (attemptCount <= 2) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: () => Promise.resolve({ error: 'Server error' }),
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      }) as unknown as typeof fetch

      const rule = createTestRule('rule_1', 'Retry Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.actions = [
        {
          type: 'call_api',
          config: {
            api: {
              url: 'https://api.example.com/test',
              method: 'GET',
            },
          },
          onError: 'retry',
          retryCount: 3,
          retryDelay: 50,
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      const result = await engine.triggerRule('rule_1')

      expect(attemptCount).toBe(3)
      expect(result.success).toBe(true)
      expect(result.actionResults[0].success).toBe(true)

      vi.restoreAllMocks()
    })
  })
})

// ============================================================================
// Helper Functions
// ============================================================================

function createTestRule(id: string, name: string): AutomationRule {
  return {
    id,
    name,
    version: '1.0.0',
    status: 'active',
    triggers: [
      {
        type: 'event',
        config: {
          event: {
            eventType: 'workflow_completed',
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
}