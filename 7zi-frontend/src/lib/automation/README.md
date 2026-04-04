# Workspace 自动化工作流系统

**版本**: v1.12.2
**创建日期**: 2026-04-04

---

## 📋 概述

Workspace 自动化工作流系统是一个强大的规则引擎，允许用户定义自动化规则来自动执行常见任务。系统支持多种触发器类型（事件、定时、条件、手动）和动作类型（执行工作流、发送通知、调用 API、数据转换）。

---

## 🎯 核心功能

### 1. 规则定义

- **灵活的触发器**: 支持事件触发、定时调度、条件满足、手动触发四种触发方式
- **丰富的动作**: 执行工作流、发送通知、调用 API、数据转换、自定义动作
- **规则条件**: 触发器满足后，还可设置额外条件
- **执行限制**: 最大执行次数、执行窗口、冷却时间

### 2. 规则引擎

- **规则验证**: 完整的规则格式验证，包括 cron 表达式、URL、条件表达式
- **触发评估**: 自动评估触发器条件
- **动作执行**: 支持顺序执行、错误处理、重试机制
- **执行追踪**: 记录每次执行的结果和统计信息

### 3. 持久化存储

- **IndexedDB 存储**: 规则和执行记录持久化到浏览器
- **历史记录**: 保存执行历史，支持查询和清理
- **自动过期**: 可配置执行记录自动清理

---

## 🏗️ 架构设计

```
src/lib/automation/
├── index.ts                    # 统一导出
├── automation-engine.ts        # 规则引擎核心
├── default-templates.ts        # 默认规则模板
├── automation-hooks.ts         # React Hooks
├── automation-storage.ts       # IndexedDB 存储
└── README.md                   # 文档
```

---

## 📚 API 文档

### 核心类型

#### TriggerType

```typescript
type TriggerType = 'event' | 'schedule' | 'condition' | 'manual'
```

- `event`: 事件触发器
- `schedule`: 定时调度
- `condition`: 条件满足
- `manual`: 手动触发

#### ActionType

```typescript
type ActionType = 'execute_workflow' | 'send_notification' | 'call_api' | 'transform_data' | 'custom'
```

#### AutomationRule

```typescript
interface AutomationRule {
  id: string
  name: string
  description?: string
  version: string
  status: RuleStatus

  triggers: TriggerConfig[]
  actions: ActionConfig[]

  condition?: string  // 规则条件表达式
  limits?: {
    maxExecutions?: number
    executionWindow?: number
    cooldown?: number
  }

  metadata: {
    createdAt: string
    updatedAt: string
    createdBy?: string
    lastExecutedAt?: string
    executionCount?: number
    lastError?: string
  }

  stats?: {
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
    lastExecutionDuration?: number
  }
}
```

### AutomationEngine

#### 注册规则

```typescript
import { automationEngine } from '@/lib/automation'

const rule = {
  id: 'rule_1',
  name: '每日备份',
  version: '1.0.0',
  status: 'active',
  triggers: [
    {
      type: 'schedule',
      config: {
        schedule: {
          scheduleType: 'cron',
          value: '0 2 * * *',
          timezone: 'Asia/Shanghai'
        }
      }
    }
  ],
  actions: [
    {
      type: 'execute_workflow',
      config: {
        workflow: {
          workflowId: 'workflow_backup',
          async: true
        }
      }
    }
  ],
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

await automationEngine.registerRule(rule)
```

#### 触发事件

```typescript
await automationEngine.triggerEvent('workflow_completed', {
  workflowId: 'wf_123',
  duration: 45000
})
```

#### 手动触发规则

```typescript
const result = await automationEngine.triggerRule('rule_1', {
  reason: 'Manual execution'
})
```

### React Hooks

#### useAutomationRules

```typescript
import { useAutomationRules } from '@/lib/automation'

function RulesList() {
  const { rules, loading, error, refreshRules } = useAutomationRules()

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {rules.map(rule => (
        <li key={rule.id}>{rule.name} - {rule.status}</li>
      ))}
    </ul>
  )
}
```

#### useRuleExecution

```typescript
import { useRuleExecution } from '@/lib/automation'

function ExecuteButton({ ruleId }) {
  const { executing, executeRule, results } = useRuleExecution()

  const handleExecute = async () => {
    await executeRule(ruleId)
  }

  return (
    <>
      <button onClick={handleExecute} disabled={executing}>
        {executing ? 'Executing...' : 'Execute'}
      </button>
      <pre>{JSON.stringify(results, null, 2)}</pre>
    </>
  )
}
```

#### useRuleTemplates

```typescript
import { useRuleTemplates } from '@/lib/automation'

function TemplateSelector() {
  const { templates, createFromTemplate } = useRuleTemplates()

  const handleSelect = (templateId: string) => {
    const newRule = createFromTemplate(templateId, {
      name: 'My Custom Rule'
    })
    // 注册新规则...
  }

  return (
    <select onChange={(e) => handleSelect(e.target.value)}>
      {templates.map(t => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  )
}
```

---

## 🎨 使用示例

### 1. 创建定时任务

```typescript
const dailyReport = {
  id: 'daily_report',
  name: '每日报告',
  version: '1.0.0',
  status: 'active',
  triggers: [
    {
      type: 'schedule',
      config: {
        schedule: {
          scheduleType: 'cron',
          value: '0 9 * * *', // 每天 9:00
          timezone: 'Asia/Shanghai'
        }
      }
    }
  ],
  actions: [
    {
      type: 'execute_workflow',
      config: {
        workflow: {
          workflowId: 'workflow_generate_report'
        }
      }
    },
    {
      type: 'send_notification',
      config: {
        notification: {
          channels: ['email', 'telegram'],
          template: 'daily_report',
          data: { reportType: 'daily' }
        }
      }
    }
  ],
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}
```

### 2. 创建事件触发规则

```typescript
const failureAlert = {
  id: 'failure_alert',
  name: '失败告警',
  version: '1.0.0',
  status: 'active',
  triggers: [
    {
      type: 'event',
      config: {
        event: {
          eventType: 'workflow_failed'
        }
      }
    }
  ],
  actions: [
    {
      type: 'send_notification',
      config: {
        notification: {
          channels: ['telegram'],
          template: 'alert',
          data: { priority: 'high' }
        }
      }
    }
  ],
  limits: {
    cooldown: 300000 // 5 分钟冷却，避免重复告警
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}
```

### 3. 创建条件触发规则

```typescript
const autoScale = {
  id: 'auto_scale',
  name: '自动扩容',
  version: '1.0.0',
  status: 'active',
  triggers: [
    {
      type: 'condition',
      config: {
        condition: {
          expression: 'ctx.variables.cpuUsage > 80',
          evaluateInterval: 60000 // 每分钟评估一次
        }
      }
    }
  ],
  actions: [
    {
      type: 'call_api',
      config: {
        api: {
          url: '/api/scale/up',
          method: 'POST'
        }
      }
    }
  ],
  limits: {
    cooldown: 300000 // 5 分钟冷却
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}
```

---

## 📋 默认规则模板

系统提供 8 个默认规则模板：

| 模板 ID | 名称 | 触发类型 | 描述 |
|---------|------|----------|------|
| `template_file_cleanup` | 文件清理自动化 | 定时 (每天 2:00) | 定期清理临时文件和过期缓存 |
| `template_workflow_failure_alert` | 工作流执行失败告警 | 事件 | 工作流执行失败时发送告警通知 |
| `template_workflow_completion` | 工作流完成通知 | 事件 | 工作流成功完成后发送通知 |
| `template_health_check` | 系统健康检查 | 定时 (每 5 分钟) | 定期检查系统健康状态 |
| `template_data_backup` | 数据备份自动化 | 定时 (每天 3:00) | 每日自动备份关键数据 |
| `template_file_change_notification` | 文件变更通知 | 事件 | 重要文件变更时发送通知 |
| `template_data_sync` | 自动数据同步 | 定时 (每 6 小时) | 定期同步外部数据源 |
| `template_user_action_audit` | 用户操作审计 | 事件 | 记录重要用户操作 |

---

## 🔒 安全考虑

### 1. 表达式验证

条件表达式会经过严格的验证和清理：

- 移除危险关键字：`import`, `require`, `eval`, `Function`, `process`, `global`, `window`
- 使用 `new Function()` 而非 `eval()`
- 沙箱化的执行环境

### 2. API 调用限制

- URL 格式验证
- 超时控制
- 错误处理和重试

### 3. 执行限制

- 最大执行次数
- 执行窗口限制
- 冷却时间

---

## 🔧 集成指南

### 与 WorkflowEditor 集成

```typescript
// 在 WorkflowEditor 中注册完成事件
import { automationEngine } from '@/lib/automation'

// 工作流完成后触发事件
function onWorkflowComplete(workflowId: string, result: unknown) {
  automationEngine.triggerEvent('workflow_completed', {
    workflowId,
    result,
    duration: Date.now() - startTime
  })
}
```

### 与通知系统集成

```typescript
// 动作执行时调用通知系统
import { notificationCenter } from '@/lib/notification'

// 在 executeAction 中：
case 'send_notification':
  const config = action.config.notification
  await notificationCenter.send({
    channels: config.channels,
    template: config.template,
    data: config.data
  })
```

### 与监控系统集联

```typescript
// 记录执行指标
import { monitoringAggregator } from '@/lib/monitoring'

// 在 executeRule 中：
monitoringAggregator.recordMetric('automation.execution', 1, {
  ruleId,
  triggerType,
  success
})
```

---

## 📊 性能考虑

### 1. IndexedDB 存储

- 规则和执行记录持久化到浏览器
- 自动清理过期记录（默认 30 天）
- 支持批量操作

### 2. 内存管理

- 规则加载后缓存在内存中
- 定时器按需创建和清理
- 事件监听器自动管理

### 3. 执行优化

- 支持异步执行
- 批量触发处理
- 执行限制避免资源耗尽

---

## 🧪 测试

```bash
# 运行单元测试
pnpm test src/lib/automation/__tests__/

# 运行集成测试
pnpm test src/lib/automation/__tests__/integration/
```

---

## 📈 未来扩展

### 短期 (v1.12.3)

- [ ] 可视化规则编辑器
- [ ] 规则导入/导出功能
- [ ] 更多的触发器类型（Webhook、消息队列）
- [ ] 规则分组和标签

### 中期 (v1.13.x)

- [ ] 规则模板市场
- [ ] 规则版本控制
- [ ] 规则协作和分享
- [ ] 高级调度功能（节假日跳过、业务日历）

### 长期 (v2.x)

- [ ] AI 辅助规则生成
- [ ] 规则推荐引擎
- [ ] 跨 Workspace 规则同步
- [ ] 规则执行可视化分析

---

## 📝 更新日志

### v1.12.2 (2026-04-04)

- ✨ 初始实现自动化规则引擎
- ✨ 支持 4 种触发器类型
- ✨ 支持 5 种动作类型
- ✨ 提供 8 个默认规则模板
- ✨ React Hooks 集成
- ✨ IndexedDB 持久化存储
- 📝 完整的 API 文档和使用示例

---

## 👥 贡献者

- **Executor** (v1.12.2) - 初始实现

---

## 📄 许可证

MIT License
