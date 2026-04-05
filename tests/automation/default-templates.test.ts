/**
 * default-templates.test.ts
 * 默认规则模板测试
 * 覆盖：模板加载、查询、从模板创建规则、模板验证等
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_RULE_TEMPLATES,
  getRuleTemplates,
  getRuleTemplateById,
  getRuleTemplatesByType,
  createRuleFromTemplate,
} from '../../7zi-frontend/src/lib/automation/default-templates'
import type { AutomationRule, TriggerType, ActionType } from '../../7zi-frontend/src/lib/automation/automation-engine'

describe('Default Rule Templates 测试', () => {
  describe('模板列表', () => {
    it('应该返回所有默认模板', () => {
      const templates = getRuleTemplates()
      expect(templates).toBe(DEFAULT_RULE_TEMPLATES)
      expect(templates.length).toBeGreaterThan(0)
    })

    it('每个模板都应该有必需的字段', () => {
      const templates = getRuleTemplates()

      templates.forEach((template) => {
        expect(template.id).toBeDefined()
        expect(typeof template.id).toBe('string')

        expect(template.name).toBeDefined()
        expect(typeof template.name).toBe('string')
        expect(template.name.trim()).not.toBe('')

        expect(template.version).toBeDefined()
        expect(typeof template.version).toBe('string')

        expect(template.status).toBeDefined()
        expect(['active', 'paused', 'disabled', 'error']).toContain(template.status)

        expect(template.triggers).toBeDefined()
        expect(Array.isArray(template.triggers)).toBe(true)
        expect(template.triggers.length).toBeGreaterThan(0)

        expect(template.actions).toBeDefined()
        expect(Array.isArray(template.actions)).toBe(true)
        expect(template.actions.length).toBeGreaterThan(0)

        expect(template.metadata).toBeDefined()
        expect(template.metadata.createdAt).toBeDefined()
        expect(template.metadata.updatedAt).toBeDefined()
      })
    })

    it('每个模板都应该有有效的触发器', () => {
      const templates = getRuleTemplates()

      templates.forEach((template) => {
        template.triggers.forEach((trigger) => {
          expect(trigger.type).toBeDefined()
          expect(['event', 'schedule', 'condition', 'manual']).toContain(trigger.type)

          expect(trigger.config).toBeDefined()
          expect(typeof trigger.config).toBe('object')

          if (trigger.type === 'event' && trigger.config.event) {
            expect(trigger.config.event.eventType).toBeDefined()
            expect(typeof trigger.config.event.eventType).toBe('string')
          }

          if (trigger.type === 'schedule' && trigger.config.schedule) {
            expect(trigger.config.schedule.scheduleType).toBeDefined()
            expect(['interval', 'cron', 'once']).toContain(trigger.config.schedule.scheduleType)
            expect(trigger.config.schedule.value).toBeDefined()
          }

          if (trigger.type === 'condition' && trigger.config.condition) {
            expect(trigger.config.condition.expression).toBeDefined()
            expect(typeof trigger.config.condition.expression).toBe('string')
          }
        })
      })
    })

    it('每个模板都应该有有效的动作', () => {
      const templates = getRuleTemplates()

      templates.forEach((template) => {
        template.actions.forEach((action) => {
          expect(action.type).toBeDefined()
          expect([
            'execute_workflow',
            'send_notification',
            'call_api',
            'transform_data',
            'custom',
          ]).toContain(action.type)

          expect(action.config).toBeDefined()
          expect(typeof action.config).toBe('object')

          if (action.type === 'execute_workflow' && action.config.workflow) {
            expect(action.config.workflow.workflowId).toBeDefined()
          }

          if (action.type === 'send_notification' && action.config.notification) {
            expect(action.config.notification.channels).toBeDefined()
            expect(Array.isArray(action.config.notification.channels)).toBe(true)
            expect(action.config.notification.channels.length).toBeGreaterThan(0)
          }

          if (action.type === 'call_api' && action.config.api) {
            expect(action.config.api.url).toBeDefined()
            expect(action.config.api.method).toBeDefined()
          }
        })
      })
    })
  })

  describe('模板查询', () => {
    it('应该通过 ID 获取模板', () => {
      const templates = getRuleTemplates()
      if (templates.length > 0) {
        const firstTemplate = templates[0]
        const foundTemplate = getRuleTemplateById(firstTemplate.id)

        expect(foundTemplate).toBeDefined()
        expect(foundTemplate?.id).toBe(firstTemplate.id)
        expect(foundTemplate?.name).toBe(firstTemplate.name)
      }
    })

    it('应该对不存在的模板返回 undefined', () => {
      const template = getRuleTemplateById('non-existent-template-id')
      expect(template).toBeUndefined()
    })

    it('应该通过触发器类型获取模板', () => {
      const scheduleTemplates = getRuleTemplatesByType('schedule')
      expect(Array.isArray(scheduleTemplates)).toBe(true)

      scheduleTemplates.forEach((template) => {
        const hasScheduleTrigger = template.triggers.some(
          (trigger) => trigger.type === 'schedule'
        )
        expect(hasScheduleTrigger).toBe(true)
      })
    })

    it('应该通过事件触发器类型获取模板', () => {
      const eventTemplates = getRuleTemplatesByType('event')
      expect(Array.isArray(eventTemplates)).toBe(true)

      eventTemplates.forEach((template) => {
        const hasEventTrigger = template.triggers.some(
          (trigger) => trigger.type === 'event'
        )
        expect(hasEventTrigger).toBe(true)
      })
    })

    it('应该通过手动触发器类型获取模板', () => {
      const manualTemplates = getRuleTemplatesByType('manual')
      expect(Array.isArray(manualTemplates)).toBe(true)

      manualTemplates.forEach((template) => {
        const hasManualTrigger = template.triggers.some(
          (trigger) => trigger.type === 'manual'
        )
        expect(hasManualTrigger).toBe(true)
      })
    })

    it('应该对没有模板的触发器类型返回空数组', () => {
      const templates = getRuleTemplatesByType('condition' as TriggerType)
      expect(Array.isArray(templates)).toBe(true)
    })
  })

  describe('从模板创建规则', () => {
    it('应该从模板创建新规则', () => {
      const templates = getRuleTemplates()
      if (templates.length > 0) {
        const template = templates[0]
        const newRule = createRuleFromTemplate(template)

        expect(newRule).toBeDefined()
        expect(newRule.id).toBeDefined()
        expect(newRule.id).not.toBe(template.id)
        expect(newRule.name).toBe(template.name)
        expect(newRule.description).toBe(template.description)
        expect(newRule.version).toBe(template.version)
        expect(newRule.triggers).toEqual(template.triggers)
        expect(newRule.actions).toEqual(template.actions)
        expect(newRule.condition).toBe(template.condition)
        expect(newRule.limits).toEqual(template.limits)
      }
    })

    it('应该生成唯一的规则 ID', () => {
      const templates = getRuleTemplates()
      if (templates.length > 0) {
        const template = templates[0]
        const rule1 = createRuleFromTemplate(template)
        const rule2 = createRuleFromTemplate(template)

        expect(rule1.id).not.toBe(rule2.id)
      }
    })

    it('新规则的状态应该是 paused', () => {
      const templates = getRuleTemplates()
      if (templates.length > 0) {
        const template = templates[0]
        const newRule = createRuleFromTemplate(template)

        expect(newRule.status).toBe('paused')
      }
    })

    it('应该重置执行统计', () => {
      const templates = getRuleTemplates()
      if (templates.length > 0) {
        const template = templates[0]
        const newRule = createRuleFromTemplate(template)

        expect(newRule.stats).toBeDefined()
        expect(newRule.stats?.totalExecutions).toBe(0)
        expect(newRule.stats?.successfulExecutions).toBe(0)
        expect(newRule.stats?.failedExecutions).toBe(0)
      }
    })

    it('应该更新创建和修改时间', () => {
      const templates = getRuleTemplates()
      if (templates.length > 0) {
        const template = templates[0]
        const newRule = createRuleFromTemplate(template)

        expect(newRule.metadata.createdAt).toBeDefined()
        expect(newRule.metadata.updatedAt).toBeDefined()
        expect(newRule.metadata.createdAt).not.toBe(template.metadata.createdAt)
      }
    })

    it('应该支持覆盖模板字段', () => {
      const templates = getRuleTemplates()
      if (templates.length > 0) {
        const template = templates[0]
        const overrides = {
          name: '自定义名称',
          status: 'active' as const,
        }

        const newRule = createRuleFromTemplate(template, overrides)

        expect(newRule.name).toBe('自定义名称')
        expect(newRule.status).toBe('active')
        expect(newRule.triggers).toEqual(template.triggers)
        expect(newRule.actions).toEqual(template.actions)
      }
    })

    it('应该支持覆盖触发器', () => {
      const templates = getRuleTemplates()
      if (templates.length > 0) {
        const template = templates[0]
        const customTrigger = {
          type: 'manual' as TriggerType,
          config: {},
        }

        const newRule = createRuleFromTemplate(template, {
          triggers: [customTrigger],
        })

        expect(newRule.triggers).toHaveLength(1)
        expect(newRule.triggers[0].type).toBe('manual')
      }
    })

    it('应该支持覆盖动作', () => {
      const templates = getRuleTemplates()
      if (templates.length > 0) {
        const template = templates[0]
        const customAction = {
          type: 'send_notification' as ActionType,
          config: {
            notification: {
              channels: ['email'],
              data: {},
            },
          },
        }

        const newRule = createRuleFromTemplate(template, {
          actions: [customAction],
        })

        expect(newRule.actions).toHaveLength(1)
        expect(newRule.actions[0].type).toBe('send_notification')
      }
    })

    it('应该支持覆盖条件', () => {
      const templates = getRuleTemplates()
      if (templates.length > 0) {
        const template = templates[0]
        const customCondition = 'ctx.triggerData.value > 100'

        const newRule = createRuleFromTemplate(template, {
          condition: customCondition,
        })

        expect(newRule.condition).toBe(customCondition)
      }
    })

    it('应该支持覆盖限制', () => {
      const templates = getRuleTemplates()
      if (templates.length > 0) {
        const template = templates[0]
        const customLimits = {
          maxExecutions: 100,
          cooldown: 60000,
        }

        const newRule = createRuleFromTemplate(template, {
          limits: customLimits,
        })

        expect(newRule.limits).toEqual(customLimits)
      }
    })

    it('应该保留模板的元数据', () => {
      const templates = getRuleTemplates()
      if (templates.length > 0) {
        const template = templates[0]
        const newRule = createRuleFromTemplate(template)

        expect(newRule.metadata.createdBy).toBe(template.metadata.createdBy)
      }
    })
  })

  describe('特定模板验证', () => {
    it('文件清理模板应该有效', () => {
      const template = getRuleTemplateById('template_file_cleanup')
      expect(template).toBeDefined()
      expect(template?.id).toBe('template_file_cleanup')
      expect(template?.name).toBe('文件清理自动化')
      expect(template?.triggers[0].type).toBe('schedule')
      expect(template?.triggers[0].config.schedule?.scheduleType).toBe('cron')
    })

    it('工作流失败告警模板应该有效', () => {
      const template = getRuleTemplateById('template_workflow_failure_alert')
      expect(template).toBeDefined()
      expect(template?.id).toBe('template_workflow_failure_alert')
      expect(template?.name).toBe('工作流执行失败告警')
      expect(template?.triggers[0].type).toBe('event')
      expect(template?.triggers[0].config.event?.eventType).toBe('workflow_failed')
      expect(template?.triggers[0].config.event?.filters).toEqual({
        retryCount: 0,
      })
    })

    it('工作流完成通知模板应该有效', () => {
      const template = getRuleTemplateById('template_workflow_completion')
      expect(template).toBeDefined()
      expect(template?.id).toBe('template_workflow_completion')
      expect(template?.name).toBe('工作流完成通知')
      expect(template?.condition).toBe('ctx.triggerData.duration > 60000')
    })

    it('系统健康检查模板应该有效', () => {
      const template = getRuleTemplateById('template_health_check')
      expect(template).toBeDefined()
      expect(template?.id).toBe('template_health_check')
      expect(template?.name).toBe('系统健康检查')
      expect(template?.triggers[0].config.schedule?.scheduleType).toBe('interval')
      expect(template?.limits?.cooldown).toBe(300000)
    })

    it('数据备份模板应该有效', () => {
      const template = getRuleTemplateById('template_data_backup')
      expect(template).toBeDefined()
      expect(template?.id).toBe('template_data_backup')
      expect(template?.name).toBe('数据备份自动化')
      expect(template?.limits?.executionWindow).toBe(24 * 60 * 60 * 1000)
    })

    it('文件变更通知模板应该有效', () => {
      const template = getRuleTemplateById('template_file_change_notification')
      expect(template).toBeDefined()
      expect(template?.id).toBe('template_file_change_notification')
      expect(template?.name).toBe('文件变更通知')
      expect(template?.triggers[0].config.event?.eventType).toBe('file_updated')
      expect(template?.triggers[0].config.event?.filters).toEqual({
        importance: 'high',
      })
    })

    it('数据同步模板应该有效', () => {
      const template = getRuleTemplateById('template_data_sync')
      expect(template).toBeDefined()
      expect(template?.id).toBe('template_data_sync')
      expect(template?.name).toBe('自动数据同步')
      expect(template?.condition).toBe('ctx.variables.lastSync > 6 * 60 * 60 * 1000')
    })

    it('用户操作审计模板应该有效', () => {
      const template = getRuleTemplateById('template_user_action_audit')
      expect(template).toBeDefined()
      expect(template?.id).toBe('template_user_action_audit')
      expect(template?.name).toBe('用户操作审计')
      expect(template?.triggers[0].config.event?.eventType).toBe('user_action')
      expect(template?.triggers[0].config.event?.filters).toEqual({
        actionType: ['create', 'update', 'delete'],
      })
    })
  })

  describe('模板统计', () => {
    it('应该有正确的模板数量', () => {
      const templates = getRuleTemplates()
      expect(templates.length).toBe(8)
    })

    it('应该有正确数量的定时触发模板', () => {
      const scheduleTemplates = getRuleTemplatesByType('schedule')
      expect(scheduleTemplates.length).toBe(4) // file_cleanup, health_check, data_backup, data_sync
    })

    it('应该有正确数量的事件触发模板', () => {
      const eventTemplates = getRuleTemplatesByType('event')
      expect(eventTemplates.length).toBe(4) // workflow_failure_alert, workflow_completion, file_change_notification, user_action_audit
    })

    it('应该有正确数量的激活模板', () => {
      const templates = getRuleTemplates()
      const activeTemplates = templates.filter((t) => t.status === 'active')
      expect(activeTemplates.length).toBe(3) // workflow_failure_alert, workflow_completion, user_action_audit
    })

    it('应该有正确数量的暂停模板', () => {
      const templates = getRuleTemplates()
      const pausedTemplates = templates.filter((t) => t.status === 'paused')
      expect(pausedTemplates.length).toBe(5) // file_cleanup, health_check, data_backup, data_sync, file_change_notification
    })
  })
})
