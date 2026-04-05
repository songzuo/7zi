/**
 * Automation Engine Advanced Integration Tests
 *
 * Advanced integration tests covering:
 * - Rule trigger condition evaluation (complex scenarios)
 * - Action execution (edge cases and error scenarios)
 * - Error handling (comprehensive error scenarios)
 * - Concurrency control (parallel execution, race conditions)
 *
 * @version 1.0.0
 * @date 2026-04-05
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AutomationEngine, RuleValidator, type AutomationRule, type ExecutionResult } from '../../src/lib/automation/automation-engine'

describe('AutomationEngine Advanced Integration Tests', () => {
  let engine: AutomationEngine

  beforeEach(() => {
    engine = new AutomationEngine()
  })

  afterEach(async () => {
    await engine.cleanup()
  })

  // ============================================================================
  // Rule Trigger Condition Evaluation
  // ============================================================================

  describe('Rule Trigger Condition Evaluation', () => {
    describe('Event Trigger Conditions', () => {
      it('should evaluate event filters with multiple criteria', async () => {
        const rule = createTestRule('event_filter_rule', 'Event Filter Rule')
        rule.triggers = [
          {
            type: 'event',
            config: {
              event: {
                eventType: 'workflow_completed',
                filters: {
                  workflowId: 'wf_123',
                  status: 'success',
                  userId: 'user_456',
                },
              },
            },
          },
        ]
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'All filters matched' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        // Trigger with all matching filters
        await engine.triggerEvent('workflow_completed', {
          workflowId: 'wf_123',
          status: 'success',
          userId: 'user_456',
        })

        await new Promise((resolve) => setTimeout(resolve, 100))

        const retrieved = engine.getRule('event_filter_rule')
        expect(retrieved?.metadata.executionCount).toBe(1)
      })

      it('should not trigger when event filters do not match', async () => {
        const rule = createTestRule('event_filter_rule', 'Event Filter Rule')
        rule.triggers = [
          {
            type: 'event',
            config: {
              event: {
                eventType: 'workflow_completed',
                filters: {
                  workflowId: 'wf_123',
                  status: 'success',
                },
              },
            },
          },
        ]
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'Filters matched' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        // Trigger with non-matching filter
        await engine.triggerEvent('workflow_completed', {
          workflowId: 'wf_123',
          status: 'failed',
        })

        await new Promise((resolve) => setTimeout(resolve, 100))

        const retrieved = engine.getRule('event_filter_rule')
        expect(retrieved?.metadata.executionCount || 0).toBe(0)
      })

      it('should handle event filters with nested objects', async () => {
        const rule = createTestRule('nested_filter_rule', 'Nested Filter Rule')
        rule.triggers = [
          {
            type: 'event',
            config: {
              event: {
                eventType: 'data_changed',
                filters: {
                  type: 'user',
                  action: 'update',
                },
              },
            },
          },
        ]
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'Nested filter matched' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        // Trigger with nested data
        await engine.triggerEvent('data_changed', {
          type: 'user',
          action: 'update',
          id: 'user_123',
        })

        await new Promise((resolve) => setTimeout(resolve, 100))

        const retrieved = engine.getRule('nested_filter_rule')
        expect(retrieved?.metadata.executionCount).toBe(1)
      })
    })

    describe('Schedule Trigger Conditions', () => {
      it('should execute interval schedule multiple times', async () => {
        const rule = createTestRule('interval_rule', 'Interval Rule')
        rule.triggers = [
          {
            type: 'schedule',
            config: {
              schedule: {
                scheduleType: 'interval',
                value: 50, // 50ms
              },
            },
          },
        ]
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'Interval executed' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        // Wait for multiple executions
        await new Promise((resolve) => setTimeout(resolve, 200))

        const retrieved = engine.getRule('interval_rule')
        expect(retrieved?.metadata.executionCount).toBeGreaterThan(1)
      })

      it('should stop interval schedule when rule is paused', async () => {
        const rule = createTestRule('interval_pause_rule', 'Interval Pause Rule')
        rule.triggers = [
          {
            type: 'schedule',
            config: {
              schedule: {
                scheduleType: 'interval',
                value: 50,
              },
            },
          },
        ]
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'Interval executed' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        // Wait for some executions
        await new Promise((resolve) => setTimeout(resolve, 120))

        const retrieved1 = engine.getRule('interval_pause_rule')
        const count1 = retrieved1?.metadata.executionCount || 0

        // Pause the rule
        await engine.updateRuleStatus('interval_pause_rule', 'paused')

        // Wait for more time
        await new Promise((resolve) => setTimeout(resolve, 120))

        const retrieved2 = engine.getRule('interval_pause_rule')
        const count2 = retrieved2?.metadata.executionCount || 0

        // Count should not increase significantly after pause
        expect(count2).toBeLessThanOrEqual(count1 + 1)
      })

      it('should resume interval schedule when rule is reactivated', async () => {
        const rule = createTestRule('interval_resume_rule', 'Interval Resume Rule')
        rule.triggers = [
          {
            type: 'schedule',
            config: {
              schedule: {
                scheduleType: 'interval',
                value: 50,
              },
            },
          },
        ]
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'Interval executed' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        // Pause the rule
        await engine.updateRuleStatus('interval_resume_rule', 'paused')

        await new Promise((resolve) => setTimeout(resolve, 100))

        const retrieved1 = engine.getRule('interval_resume_rule')
        const count1 = retrieved1?.metadata.executionCount || 0

        // Resume the rule
        await engine.updateRuleStatus('interval_resume_rule', 'active')

        // Wait for executions
        await new Promise((resolve) => setTimeout(resolve, 120))

        const retrieved2 = engine.getRule('interval_resume_rule')
        const count2 = retrieved2?.metadata.executionCount || 0

        // Count should increase after resume
        expect(count2).toBeGreaterThan(count1)
      })
    })

    describe('Condition Trigger Evaluation', () => {
      it('should evaluate condition with dynamic context', async () => {
        const rule = createTestRule('dynamic_condition_rule', 'Dynamic Condition Rule')
        rule.triggers = [
          {
            type: 'condition',
            config: {
              condition: {
                expression: 'ctx.value > ctx.threshold',
                evaluateInterval: 50,
              },
            },
          },
        ]
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'Dynamic condition met' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        // Wait for evaluation
        await new Promise((resolve) => setTimeout(resolve, 150))

        const retrieved = engine.getRule('dynamic_condition_rule')
        expect(retrieved).toBeDefined()
      })

      it('should handle condition evaluation errors gracefully', async () => {
        const rule = createTestRule('error_condition_rule', 'Error Condition Rule')
        rule.triggers = [
          {
            type: 'condition',
            config: {
              condition: {
                expression: 'ctx.nonExistentProperty.someMethod()',
                evaluateInterval: 50,
              },
            },
          },
        ]
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'Condition evaluated' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        // Wait for evaluation (should not crash)
        await new Promise((resolve) => setTimeout(resolve, 150))

        const retrieved = engine.getRule('error_condition_rule')
        expect(retrieved).toBeDefined()
      })
    })

    describe('Rule-Level Conditions', () => {
      it('should evaluate rule condition after trigger', async () => {
        const rule = createTestRule('rule_condition_rule', 'Rule Condition Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.condition = 'ctx.triggerData?.priority === "high"'
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'High priority action' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        // Condition met
        const result1 = await engine.triggerRule('rule_condition_rule', { priority: 'high' })
        expect(result1.success).toBe(true)
        expect(result1.actionResults.length).toBe(1)

        // Condition not met
        const result2 = await engine.triggerRule('rule_condition_rule', { priority: 'low' })
        expect(result2.success).toBe(true)
        expect(result2.actionResults.length).toBe(0)
      })

      it('should evaluate complex rule conditions', async () => {
        const rule = createTestRule('complex_rule_condition', 'Complex Rule Condition')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.condition = 'ctx.triggerData?.value > 10 && ctx.triggerData?.value < 100 && ctx.triggerData?.enabled === true'
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

        // All conditions met
        const result1 = await engine.triggerRule('complex_rule_condition', { value: 50, enabled: true })
        expect(result1.actionResults.length).toBe(1)

        // Value too high
        const result2 = await engine.triggerRule('complex_rule_condition', { value: 150, enabled: true })
        expect(result2.actionResults.length).toBe(0)

        // Enabled false
        const result3 = await engine.triggerRule('complex_rule_condition', { value: 50, enabled: false })
        expect(result3.actionResults.length).toBe(0)
      })
    })
  })

  // ============================================================================
  // Action Execution
  // ============================================================================

  describe('Action Execution', () => {
    describe('Execute Workflow Action', () => {
      it('should execute workflow with input data', async () => {
        const rule = createTestRule('workflow_input_rule', 'Workflow Input Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'execute_workflow',
            config: {
              workflow: {
                workflowId: 'wf_test',
                input: { source: 'automation', data: 'test_data' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        const result = await engine.triggerRule('workflow_input_rule', { triggerValue: 123 })

        expect(result.success).toBe(true)
        expect(result.actionResults[0].success).toBe(true)
      })

      it('should execute workflow with version', async () => {
        const rule = createTestRule('workflow_version_rule', 'Workflow Version Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'execute_workflow',
            config: {
              workflow: {
                workflowId: 'wf_versioned',
                version: '2.0.0',
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        const result = await engine.triggerRule('workflow_version_rule')

        expect(result.success).toBe(true)
        expect(result.actionResults[0].success).toBe(true)
      })
    })

    describe('Send Notification Action', () => {
      it('should send notification to multiple channels', async () => {
        const rule = createTestRule('multi_channel_rule', 'Multi Channel Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram', 'email', 'webhook', 'push'],
                data: { message: 'Multi-channel notification' },
                priority: 'urgent',
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        const result = await engine.triggerRule('multi_channel_rule')

        expect(result.success).toBe(true)
        expect(result.actionResults[0].success).toBe(true)
      })

      it('should send notification with template', async () => {
        const rule = createTestRule('template_notification_rule', 'Template Notification Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                template: 'workflow_completed_template',
                data: { workflowId: 'wf_123', status: 'success' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        const result = await engine.triggerRule('template_notification_rule')

        expect(result.success).toBe(true)
        expect(result.actionResults[0].success).toBe(true)
      })
    })

    describe('Call API Action', () => {
      it('should call API with custom headers', async () => {
        global.fetch = vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          } as Response)
        ) as unknown as typeof fetch

        const rule = createTestRule('api_headers_rule', 'API Headers Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'call_api',
            config: {
              api: {
                url: 'https://api.example.com/test',
                method: 'POST',
                headers: {
                  'Authorization': 'Bearer token123',
                  'X-Custom-Header': 'custom-value',
                },
                body: { test: true },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        const result = await engine.triggerRule('api_headers_rule')

        expect(result.success).toBe(true)
        expect(result.actionResults[0].success).toBe(true)

        vi.restoreAllMocks()
      })

      it('should call API with timeout', async () => {
        global.fetch = vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          } as Response)
        ) as unknown as typeof fetch

        const rule = createTestRule('api_timeout_rule', 'API Timeout Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'call_api',
            config: {
              api: {
                url: 'https://api.example.com/test',
                method: 'GET',
                timeout: 5000,
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        const result = await engine.triggerRule('api_timeout_rule')

        expect(result.success).toBe(true)
        expect(result.actionResults[0].success).toBe(true)

        vi.restoreAllMocks()
      })

      it('should handle API timeout error', async () => {
        global.fetch = vi.fn(() =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 10)
          )
        ) as unknown as typeof fetch

        const rule = createTestRule('api_timeout_error_rule', 'API Timeout Error Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'call_api',
            config: {
              api: {
                url: 'https://api.example.com/slow',
                method: 'GET',
                timeout: 100,
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        const result = await engine.triggerRule('api_timeout_error_rule')

        expect(result.success).toBe(false)
        expect(result.actionResults[0].success).toBe(false)

        vi.restoreAllMocks()
      })

      it('should handle different HTTP methods', async () => {
        const methods: Array<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'> = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

        for (const method of methods) {
          global.fetch = vi.fn(() =>
            Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ success: true }),
            } as Response)
          ) as unknown as typeof fetch

          const rule = createTestRule(`api_${method.toLowerCase()}_rule`, `API ${method} Rule`)
          rule.triggers = [{ type: 'manual', config: {} }]
          rule.actions = [
            {
              type: 'call_api',
              config: {
                api: {
                  url: 'https://api.example.com/test',
                  method,
                },
              },
            },
          ]
          rule.status = 'active'

          await engine.registerRule(rule)

          const result = await engine.triggerRule(`api_${method.toLowerCase()}_rule`)

          expect(result.success).toBe(true)
          expect(result.actionResults[0].success).toBe(true)

          vi.restoreAllMocks()
        }
      })
    })

    describe('Transform Data Action', () => {
      it('should transform data with complex expression', async () => {
        const rule = createTestRule('complex_transform_rule', 'Complex Transform Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'transform_data',
            config: {
              transform: {
                source: 'triggerData',
                target: 'output',
                transform: 'data.items ? data.items.map(i => i.value * 2).reduce((a, b) => a + b, 0) : 0',
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        const result = await engine.triggerRule('complex_transform_rule', {
          items: [{ value: 10 }, { value: 20 }, { value: 30 }],
        })

        expect(result.success).toBe(true)
        expect(result.actionResults[0].success).toBe(true)
      })

      it('should handle transform errors gracefully', async () => {
        const rule = createTestRule('transform_error_rule', 'Transform Error Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'transform_data',
            config: {
              transform: {
                source: 'triggerData',
                target: 'output',
                transform: 'data.nonExistent.method()',
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        const result = await engine.triggerRule('transform_error_rule', {})

        expect(result.success).toBe(false)
        expect(result.actionResults[0].success).toBe(false)
      })
    })

    describe('Custom Action', () => {
      it('should execute custom action with parameters', async () => {
        const rule = createTestRule('custom_params_rule', 'Custom Params Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'custom',
            config: {
              custom: {
                handler: 'myCustomHandler',
                params: {
                  param1: 'value1',
                  param2: 123,
                  param3: { nested: true },
                },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        const result = await engine.triggerRule('custom_params_rule')

        expect(result.success).toBe(true)
        expect(result.actionResults[0].success).toBe(true)
      })
    })
  })

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    describe('Action Error Handling', () => {
      it('should stop execution on error with onError=stop', async () => {
        global.fetch = vi.fn(() =>
          Promise.reject(new Error('Network error'))
        ) as unknown as typeof fetch

        const rule = createTestRule('stop_on_error_rule', 'Stop on Error Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'call_api',
            config: {
              api: {
                url: 'https://api.example.com/error',
                method: 'GET',
              },
            },
            onError: 'stop',
          },
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'This should not execute' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        const result = await engine.triggerRule('stop_on_error_rule')

        expect(result.success).toBe(false)
        expect(result.actionResults.length).toBe(1)
        expect(result.actionResults[0].success).toBe(false)

        vi.restoreAllMocks()
      })

      it('should continue execution on error with onError=continue', async () => {
        global.fetch = vi.fn(() =>
          Promise.reject(new Error('Network error'))
        ) as unknown as typeof fetch

        const rule = createTestRule('continue_on_error_rule', 'Continue on Error Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'call_api',
            config: {
              api: {
                url: 'https://api.example.com/error',
                method: 'GET',
              },
            },
            onError: 'continue',
          },
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'This should execute' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        const result = await engine.triggerRule('continue_on_error_rule')

        expect(result.success).toBe(false)
        expect(result.actionResults.length).toBe(2)
        expect(result.actionResults[0].success).toBe(false)
        expect(result.actionResults[1].success).toBe(true)

        vi.restoreAllMocks()
      })

      it('should retry action with exponential backoff', async () => {
        let attemptCount = 0

        global.fetch = vi.fn(() => {
          attemptCount++
          if (attemptCount < 3) {
            return Promise.reject(new Error('Temporary error'))
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          } as Response)
        }) as unknown as typeof fetch

        const rule = createTestRule('retry_backoff_rule', 'Retry Backoff Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'call_api',
            config: {
              api: {
                url: 'https://api.example.com/retry',
                method: 'GET',
              },
            },
            onError: 'retry',
            retryCount: 5,
            retryDelay: 50,
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        const result = await engine.triggerRule('retry_backoff_rule')

        expect(attemptCount).toBe(3)
        expect(result.success).toBe(true)
        expect(result.actionResults[0].success).toBe(true)

        vi.restoreAllMocks()
      })

      it('should fail after max retries', async () => {
        global.fetch = vi.fn(() =>
          Promise.reject(new Error('Persistent error'))
        ) as unknown as typeof fetch

        const rule = createTestRule('max_retries_rule', 'Max Retries Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'call_api',
            config: {
              api: {
                url: 'https://api.example.com/error',
                method: 'GET',
              },
            },
            onError: 'retry',
            retryCount: 3,
            retryDelay: 10,
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        const result = await engine.triggerRule('max_retries_rule')

        expect(result.success).toBe(false)
        expect(result.actionResults[0].success).toBe(false)

        vi.restoreAllMocks()
      })
    })

    describe('Rule Error Handling', () => {
      it('should handle rule validation errors', async () => {
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

      it('should handle trigger evaluation errors gracefully', async () => {
        const rule = createTestRule('trigger_error_rule', 'Trigger Error Rule')
        rule.triggers = [
          {
            type: 'condition',
            config: {
              condition: {
                expression: 'ctx.value && ctx.value > 10',
                evaluateInterval: 50,
              },
            },
          },
        ]
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'Test' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        // Wait for evaluation (should not crash)
        await new Promise((resolve) => setTimeout(resolve, 150))

        const retrieved = engine.getRule('trigger_error_rule')
        expect(retrieved).toBeDefined()
      })

      it('should update rule error status on failure', async () => {
        global.fetch = vi.fn(() =>
          Promise.reject(new Error('API error'))
        ) as unknown as typeof fetch

        const rule = createTestRule('error_status_rule', 'Error Status Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'call_api',
            config: {
              api: {
                url: 'https://api.example.com/error',
                method: 'GET',
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        await engine.triggerRule('error_status_rule')

        const retrieved = engine.getRule('error_status_rule')
        expect(retrieved?.stats?.failedExecutions).toBe(1)

        vi.restoreAllMocks()
      })
    })
  })

  // ============================================================================
  // Concurrency Control
  // ============================================================================

  describe('Concurrency Control', () => {
    describe('Parallel Rule Execution', () => {
      it('should handle multiple rules executing in parallel', async () => {
        const rules: AutomationRule[] = []

        for (let i = 1; i <= 5; i++) {
          const rule = createTestRule(`parallel_rule_${i}`, `Parallel Rule ${i}`)
          rule.triggers = [{ type: 'manual', config: {} }]
          rule.actions = [
            {
              type: 'send_notification',
              config: {
                notification: {
                  channels: ['telegram'],
                  data: { message: `Rule ${i} executed` },
                },
              },
            },
          ]
          rule.status = 'active'
          rules.push(rule)
        }

        // Register all rules
        for (const rule of rules) {
          await engine.registerRule(rule)
        }

        // Execute all rules in parallel
        const promises = rules.map((rule) => engine.triggerRule(rule.id))
        const results = await Promise.all(promises)

        expect(results.length).toBe(5)
        expect(results.every((r) => r.success)).toBe(true)
      })

      it('should handle concurrent event triggers', async () => {
        const rule1 = createTestRule('concurrent_event_rule_1', 'Concurrent Event Rule 1')
        rule1.triggers = [
          {
            type: 'event',
            config: {
              event: {
                eventType: 'concurrent_event',
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

        const rule2 = createTestRule('concurrent_event_rule_2', 'Concurrent Event Rule 2')
        rule2.triggers = [
          {
            type: 'event',
            config: {
              event: {
                eventType: 'concurrent_event',
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

        // Trigger multiple events concurrently
        const promises = [
          engine.triggerEvent('concurrent_event', { id: 1 }),
          engine.triggerEvent('concurrent_event', { id: 2 }),
          engine.triggerEvent('concurrent_event', { id: 3 }),
        ]
        await Promise.all(promises)

        await new Promise((resolve) => setTimeout(resolve, 200))

        const retrieved1 = engine.getRule('concurrent_event_rule_1')
        const retrieved2 = engine.getRule('concurrent_event_rule_2')

        expect(retrieved1?.metadata.executionCount).toBe(3)
        expect(retrieved2?.metadata.executionCount).toBe(3)
      })
    })

    describe('Race Condition Prevention', () => {
      it('should prevent race conditions with cooldown', async () => {
        const rule = createTestRule('cooldown_race_rule', 'Cooldown Race Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.limits = { cooldown: 100 }
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'Test' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        // First execution
        const result1 = await engine.triggerRule('cooldown_race_rule')
        expect(result1.success).toBe(true)

        // Immediate second execution (should be blocked)
        const result2 = await engine.triggerRule('cooldown_race_rule')
        expect(result2.success).toBe(false)
        expect(result2.error).toBe('规则执行次数受限')

        // Wait for cooldown
        await new Promise((resolve) => setTimeout(resolve, 150))

        // Third execution (should succeed)
        const result3 = await engine.triggerRule('cooldown_race_rule')
        expect(result3.success).toBe(true)
      })

      it('should prevent race conditions with execution window', async () => {
        const rule = createTestRule('window_race_rule', 'Window Race Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.limits = { executionWindow: 100 }
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'Test' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        // First execution
        const result1 = await engine.triggerRule('window_race_rule')
        expect(result1.success).toBe(true)

        // Immediate second execution (should be blocked)
        const result2 = await engine.triggerRule('window_race_rule')
        expect(result2.success).toBe(false)
        expect(result2.error).toBe('规则执行次数受限')

        // Wait for window
        await new Promise((resolve) => setTimeout(resolve, 150))

        // Third execution (should succeed)
        const result3 = await engine.triggerRule('window_race_rule')
        expect(result3.success).toBe(true)
      })

      it('should prevent race conditions with max executions', async () => {
        const rule = createTestRule('max_exec_race_rule', 'Max Exec Race Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.limits = { maxExecutions: 2 }
        rule.stats = { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0 }
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'Test' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        // First execution
        const result1 = await engine.triggerRule('max_exec_race_rule')
        expect(result1.success).toBe(true)

        // Second execution
        const result2 = await engine.triggerRule('max_exec_race_rule')
        expect(result2.success).toBe(true)

        // Third execution (should be blocked)
        const result3 = await engine.triggerRule('max_exec_race_rule')
        expect(result3.success).toBe(false)
        expect(result3.error).toBe('规则执行次数受限')
      })
    })

    describe('Concurrent Action Execution', () => {
      it('should handle multiple actions in sequence', async () => {
        const executionOrder: string[] = []

        const rule = createTestRule('sequential_actions_rule', 'Sequential Actions Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'Action 1' },
              },
            },
          },
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['email'],
                data: { message: 'Action 2' },
              },
            },
          },
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['push'],
                data: { message: 'Action 3' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        const result = await engine.triggerRule('sequential_actions_rule')

        expect(result.success).toBe(true)
        expect(result.actionResults.length).toBe(3)
        expect(result.actionResults.every((ar) => ar.success)).toBe(true)
      })

      it('should handle mixed action types with errors', async () => {
        global.fetch = vi.fn(() =>
          Promise.reject(new Error('API error'))
        ) as unknown as typeof fetch

        const rule = createTestRule('mixed_actions_rule', 'Mixed Actions Rule')
        rule.triggers = [{ type: 'manual', config: {} }]
        rule.actions = [
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['telegram'],
                data: { message: 'Action 1' },
              },
            },
          },
          {
            type: 'call_api',
            config: {
              api: {
                url: 'https://api.example.com/error',
                method: 'GET',
              },
            },
            onError: 'continue',
          },
          {
            type: 'send_notification',
            config: {
              notification: {
                channels: ['email'],
                data: { message: 'Action 3' },
              },
            },
          },
        ]
        rule.status = 'active'

        await engine.registerRule(rule)

        const result = await engine.triggerRule('mixed_actions_rule')

        expect(result.success).toBe(false)
        expect(result.actionResults.length).toBe(3)
        expect(result.actionResults[0].success).toBe(true)
        expect(result.actionResults[1].success).toBe(false)
        expect(result.actionResults[2].success).toBe(true)

        vi.restoreAllMocks()
      })
    })
  })

  // ============================================================================
  // Performance and Scalability
  // ============================================================================

  describe('Performance and Scalability', () => {
    it('should handle large number of rules', async () => {
      const ruleCount = 50
      const rules: AutomationRule[] = []

      for (let i = 1; i <= ruleCount; i++) {
        const rule = createTestRule(`scale_rule_${i}`, `Scale Rule ${i}`)
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
      const startTime = Date.now()
      for (const rule of rules) {
        await engine.registerRule(rule)
      }
      const registrationTime = Date.now() - startTime

      expect(registrationTime).toBeLessThan(5000) // Should register in < 5s
      expect(engine.getAllRules().length).toBe(ruleCount)

      // Execute a subset of rules
      const executionStartTime = Date.now()
      const promises = rules.slice(0, 10).map((rule) => engine.triggerRule(rule.id))
      await Promise.all(promises)
      const executionTime = Date.now() - executionStartTime

      expect(executionTime).toBeLessThan(1000) // Should execute in < 1s
    })

    it('should handle rapid successive triggers', async () => {
      const rule = createTestRule('rapid_trigger_rule', 'Rapid Trigger Rule')
      rule.triggers = [{ type: 'manual', config: {} }]
      rule.actions = [
        {
          type: 'send_notification',
          config: {
            notification: {
              channels: ['telegram'],
              data: { message: 'Test' },
            },
          },
        },
      ]
      rule.status = 'active'

      await engine.registerRule(rule)

      const triggerCount = 20
      const startTime = Date.now()

      const promises = Array.from({ length: triggerCount }, () => engine.triggerRule('rapid_trigger_rule'))
      const results = await Promise.all(promises)

      const totalTime = Date.now() - startTime

      expect(results.length).toBe(triggerCount)
      expect(results.every((r) => r.success)).toBe(true)
      expect(totalTime).toBeLessThan(2000) // Should complete in < 2s
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
    triggers: [],
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }
}