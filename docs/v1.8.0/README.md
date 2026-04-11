# v1.8.0 功能文档

**发布日期**: 2026-04-02
**版本**: v1.8.0

---

## 核心功能

### 1. Visual Workflow Orchestrator (可视化工作流编排器)

完整的工作流执行引擎，支持拖拽设计和可视化配置。

**核心文件**: `src/lib/workflow/VisualWorkflowOrchestrator.ts`

**支持节点类型**:

| 节点类型 | 说明 | 颜色 |
|---------|------|------|
| `START` | 开始节点 | 🟢 绿色 |
| `END` | 结束节点 | 🔴 红色 |
| `TASK` | 任务节点 | 🔵 蓝色 |
| `AGENT` | AI Agent 节点 | 🟣 紫色 |
| `CONDITION` | 条件分支节点 | 🟡 黄色 |
| `PARALLEL` | 并行执行节点 | 🟣 紫色 |
| `WAIT` | 等待节点 | ⚪ 灰色 |

**核心功能**:

```typescript
import { VisualWorkflowOrchestrator } from '@/lib/workflow/VisualWorkflowOrchestrator'

const orchestrator = new VisualWorkflowOrchestrator()

// 创建工作流实例
const instance = await orchestrator.createInstance(workflow, {
  trigger: { type: 'manual', timestamp: new Date().toISOString() },
  inputs: { key: 'value' }
})

// 执行工作流
await orchestrator.execute(instance.id)

// 取消工作流
await orchestrator.cancel(instance.id)

// 暂停工作流
await orchestrator.pause(instance.id)

// 恢复工作流
await orchestrator.resume(instance.id)
```

### 2. Workflow Canvas 组件

可视化工作流设计画布，支持拖拽节点和连接线。

**核心文件**: `src/components/workflow/WorkflowCanvas.tsx`

**功能特性**:
- 拖拽添加节点
- Bezier 曲线连接
- 节点缩放和拖拽
- 网格对齐
- MiniMap 导航

### 3. Email Alerting 系统

SMTP 邮件告警系统，支持模板和多样化告警。

**核心文件**:
- `src/lib/alerting/EmailAlertService.ts`
- `src/config/email.ts`
- `src/lib/alerting/templates/alert-template.ts`

**配置示例**:

```typescript
// .env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=alerts@example.com
SMTP_PASS=your-password
SMTP_FROM=7zi Studio <alerts@example.com>
```

**使用示例**:

```typescript
import { EmailAlertService } from '@/lib/alerting/EmailAlertService'

const emailService = new EmailAlertService()

await emailService.sendAlert({
  to: 'admin@example.com',
  subject: '工作流执行失败',
  template: 'workflow-failure',
  data: {
    workflowName: '数据处理流程',
    error: '连接超时',
    timestamp: new Date().toISOString()
  }
})
```

---

## 目录结构

```
src/lib/workflow/
├── VisualWorkflowOrchestrator.ts  # 核心编排器
├── executor.ts                     # 执行器
├── dsl.ts                         # DSL 解析器
├── scheduler.ts                    # 调度器
├── triggers.ts                     # 触发器
├── history.ts                      # 历史记录
├── TaskParser.ts                   # 任务解析
├── examples.ts                     # 示例工作流
└── __tests__/                     # 测试文件

src/components/workflow/
├── WorkflowCanvas.tsx              # 画布组件
└── ...

src/lib/alerting/
├── EmailAlertService.ts            # 邮件服务
├── index.ts                       # 导出
└── templates/
    └── alert-template.ts           # 告警模板
```

---

## 工作流定义示例

```json
{
  "id": "my-workflow",
  "name": "数据处理工作流",
  "version": 1,
  "nodes": [
    { "id": "start", "type": "START", "name": "开始" },
    { "id": "task1", "type": "TASK", "name": "获取数据" },
    { "id": "condition", "type": "CONDITION", "name": "检查数据",
      "conditionConfig": { "expression": "data.length > 0" }},
    { "id": "process", "type": "AGENT", "name": "处理数据" },
    { "id": "end", "type": "END", "name": "结束" }
  ],
  "edges": [
    { "id": "e1", "source": "start", "target": "task1" },
    { "id": "e2", "source": "task1", "target": "condition" },
    { "id": "e3", "source": "condition", "target": "process",
      "conditionConfig": { "label": "yes" }},
    { "id": "e4", "source": "process", "target": "end" }
  ]
}
```

---

## 状态机

工作流实例状态转换:

```
                    ┌─────────────┐
                    │   PENDING   │
                    └──────┬──────┘
                           │ execute()
                           ▼
                    ┌─────────────┐
              ┌────►│   RUNNING   │◄────┐
              │     └──────┬──────┘     │
              │            │            │
         pause()      completed()    cancel()
              │            │            │
              │            ▼            │
              │     ┌─────────────┐      │
              │     │  COMPLETED  │      │
              │     └─────────────┘      │
              │                          │
              │     ┌─────────────┐      │
              └─────│   FAILED    │──────┘
                    └─────────────┘

                    ┌─────────────┐
                    │   PAUSED    │
                    └──────┬──────┘
                           │ resume()
                           ▼
                    ┌─────────────┐
         ┌──────────│   RUNNING   │◄─────────┐
         │          └─────────────┘          │
         │                                   │
    resume()                           cancel()
         │                                   │
         ▼                                   ▼
```

---

## 相关文档

- [Workflow README](./lib/workflow/README.md)
- [Email Alerting README](./lib/alerting/README.md)
- [CHANGELOG.md](../CHANGELOG.md)
- [VISUAL_WORKFLOW_IMPLEMENTATION_ROADMAP.md](./VISUAL_WORKFLOW_IMPLEMENTATION_ROADMAP.md)
