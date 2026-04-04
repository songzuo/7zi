/**
 * 默认自动化规则模板
 */

import type { AutomationRule } from './automation-engine'

/**
 * 默认规则模板
 */
export const DEFAULT_RULE_TEMPLATES: AutomationRule[] = [
  // ========================================
  // 1. 文件清理自动化
  // ========================================
  {
    id: 'template_file_cleanup',
    name: '文件清理自动化',
    description: '定期清理临时文件和过期缓存',
    version: '1.0.0',
    status: 'paused',
    triggers: [
      {
        type: 'schedule',
        config: {
          schedule: {
            scheduleType: 'cron',
            value: '0 2 * * *', // 每天凌晨 2 点
            timezone: 'Asia/Shanghai',
          },
        },
      },
    ],
    actions: [
      {
        type: 'execute_workflow',
        config: {
          workflow: {
            workflowId: 'workflow_file_cleanup',
            version: '1.0.0',
            async: true,
          },
        },
        onError: 'continue',
        retryCount: 3,
        retryDelay: 5000,
      },
      {
        type: 'send_notification',
        config: {
          notification: {
            channels: ['telegram'],
            template: 'file_cleanup_complete',
            data: {
              message: '文件清理任务已完成',
            },
            priority: 'low',
          },
        },
        onError: 'continue',
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
    },
  },

  // ========================================
  // 2. 工作流执行失败告警
  // ========================================
  {
    id: 'template_workflow_failure_alert',
    name: '工作流执行失败告警',
    description: '工作流执行失败时发送告警通知',
    version: '1.0.0',
    status: 'active',
    triggers: [
      {
        type: 'event',
        config: {
          event: {
            eventType: 'workflow_failed',
            filters: {
              retryCount: 0, // 仅当重试次数为 0 时触发（避免重复告警）
            },
          },
        },
      },
    ],
    actions: [
      {
        type: 'send_notification',
        config: {
          notification: {
            channels: ['telegram', 'email'],
            template: 'workflow_failure',
            data: {
              subject: '工作流执行失败',
            },
            priority: 'high',
          },
        },
        onError: 'retry',
        retryCount: 3,
        retryDelay: 10000,
      },
      {
        type: 'call_api',
        config: {
          api: {
            url: '/api/monitoring/alert',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              type: 'workflow_failure',
              severity: 'warning',
            },
          },
        },
        onError: 'continue',
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
    },
  },

  // ========================================
  // 3. 工作流完成通知
  // ========================================
  {
    id: 'template_workflow_completion',
    name: '工作流完成通知',
    description: '工作流成功完成后发送通知',
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
    condition: 'ctx.triggerData.duration > 60000', // 执行时间超过 1 分钟才通知
    actions: [
      {
        type: 'send_notification',
        config: {
          notification: {
            channels: ['telegram'],
            template: 'workflow_complete',
            data: {
              message: '工作流执行完成',
            },
            priority: 'low',
          },
        },
        onError: 'continue',
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
    },
  },

  // ========================================
  // 4. 系统健康检查
  // ========================================
  {
    id: 'template_health_check',
    name: '系统健康检查',
    description: '定期检查系统健康状态',
    version: '1.0.0',
    status: 'paused',
    triggers: [
      {
        type: 'schedule',
        config: {
          schedule: {
            scheduleType: 'interval',
            value: 300000, // 每 5 分钟
            timezone: 'UTC',
          },
        },
      },
    ],
    actions: [
      {
        type: 'call_api',
        config: {
          api: {
            url: '/api/health',
            method: 'GET',
            timeout: 10000,
          },
        },
        onError: 'continue',
      },
      {
        type: 'send_notification',
        config: {
          notification: {
            channels: ['telegram'],
            template: 'health_check',
            data: {
              message: '系统健康检查',
            },
            priority: 'normal',
          },
        },
        onError: 'continue',
      },
    ],
    limits: {
      cooldown: 300000, // 5 分钟冷却
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
    },
  },

  // ========================================
  // 5. 数据备份自动化
  // ========================================
  {
    id: 'template_data_backup',
    name: '数据备份自动化',
    description: '每日自动备份关键数据',
    version: '1.0.0',
    status: 'paused',
    triggers: [
      {
        type: 'schedule',
        config: {
          schedule: {
            scheduleType: 'cron',
            value: '0 3 * * *', // 每天凌晨 3 点
            timezone: 'Asia/Shanghai',
          },
        },
      },
    ],
    actions: [
      {
        type: 'execute_workflow',
        config: {
          workflow: {
            workflowId: 'workflow_data_backup',
            version: '1.0.0',
            input: {
              backupType: 'full',
              retention: 30,
            },
            async: true,
          },
        },
        onError: 'stop',
        retryCount: 3,
        retryDelay: 60000,
      },
      {
        type: 'send_notification',
        config: {
          notification: {
            channels: ['email'],
            template: 'backup_complete',
            data: {
              subject: '数据备份完成',
            },
            priority: 'normal',
          },
        },
        onError: 'continue',
      },
    ],
    limits: {
      executionWindow: 24 * 60 * 60 * 1000, // 24 小时内只能执行一次
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
    },
  },

  // ========================================
  // 6. 文件变更通知
  // ========================================
  {
    id: 'template_file_change_notification',
    name: '文件变更通知',
    description: '重要文件变更时发送通知',
    version: '1.0.0',
    status: 'paused',
    triggers: [
      {
        type: 'event',
        config: {
          event: {
            eventType: 'file_updated',
            filters: {
              importance: 'high',
            },
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
            template: 'file_change',
            data: {
              message: '重要文件已更新',
            },
            priority: 'normal',
          },
        },
        onError: 'continue',
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
    },
  },

  // ========================================
  // 7. 自动数据同步
  // ========================================
  {
    id: 'template_data_sync',
    name: '自动数据同步',
    description: '定期同步外部数据源',
    version: '1.0.0',
    status: 'paused',
    triggers: [
      {
        type: 'schedule',
        config: {
          schedule: {
            scheduleType: 'cron',
            value: '0 */6 * * *', // 每 6 小时
            timezone: 'UTC',
          },
        },
      },
    ],
    condition: 'ctx.variables.lastSync > 6 * 60 * 60 * 1000', // 距离上次同步超过 6 小时
    actions: [
      {
        type: 'execute_workflow',
        config: {
          workflow: {
            workflowId: 'workflow_data_sync',
            version: '1.0.0',
            async: true,
          },
        },
        onError: 'retry',
        retryCount: 2,
        retryDelay: 30000,
      },
    ],
    limits: {
      cooldown: 3600000, // 1 小时冷却
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
    },
  },

  // ========================================
  // 8. 用户操作审计
  // ========================================
  {
    id: 'template_user_action_audit',
    name: '用户操作审计',
    description: '记录重要用户操作',
    version: '1.0.0',
    status: 'active',
    triggers: [
      {
        type: 'event',
        config: {
          event: {
            eventType: 'user_action',
            filters: {
              actionType: ['create', 'update', 'delete'],
            },
          },
        },
      },
    ],
    actions: [
      {
        type: 'call_api',
        config: {
          api: {
            url: '/api/audit/log',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              action: 'user_action_recorded',
              source: 'automation',
            },
          },
        },
        onError: 'continue',
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
    },
  },
]

/**
 * 获取模板列表
 */
export function getRuleTemplates(): AutomationRule[] {
  return DEFAULT_RULE_TEMPLATES
}

/**
 * 根据 ID 获取模板
 */
export function getRuleTemplateById(id: string): AutomationRule | undefined {
  return DEFAULT_RULE_TEMPLATES.find((template) => template.id === id)
}

/**
 * 根据类型获取模板
 */
export function getRuleTemplatesByType(triggerType: string): AutomationRule[] {
  return DEFAULT_RULE_TEMPLATES.filter((template) =>
    template.triggers.some((trigger) => trigger.type === triggerType)
  )
}

/**
 * 从模板创建规则
 */
export function createRuleFromTemplate(template: AutomationRule, overrides?: Partial<AutomationRule>): AutomationRule {
  const newRule: AutomationRule = {
    ...template,
    id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'paused', // 默认暂停，需要手动激活
    metadata: {
      ...template.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    stats: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
    },
    ...overrides,
  }

  return newRule
}
