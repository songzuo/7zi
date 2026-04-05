# 工作流自动化系统

## 概述

工作流自动化系统是 v1.14.0 版本的核心功能，提供了完整的工作流定义、执行、触发和调度能力。

## 核心功能

### 1. 工作流 DSL (Domain Specific Language)

支持 JSON 和 YAML 格式的工作流定义，提供完整的验证和类型转换。

```typescript
import { WorkflowDSLParser, DSLFormat } from '@/lib/workflow/dsl'

const parser = new WorkflowDSLParser()

// 解析 JSON
const result = parser.parse(jsonContent, DSLFormat.JSON)

// 解析 YAML
const result = parser.parse(yamlContent, DSLFormat.YAML)

// 序列化
const json = parser.serialize(workflow, DSLFormat.JSON)
const yaml = parser.serialize(workflow, DSLFormat.YAML)
```

### 2. 触发器系统

支持多种触发方式：

- **定时触发**：按固定间隔触发
- **事件触发**：监听特定事件
- **Webhook 触发**：通过 HTTP 请求触发
- **Cron 触发**：使用 Cron 表达式

```typescript
import { TriggerManager, TriggerType, TriggerStatus } from '@/lib/workflow/triggers'

const manager = new TriggerManager()

// 注册触发器
await manager.registerTrigger({
  id: 'trigger-id',
  workflowId: 'workflow-id',
  type: TriggerType.SCHEDULE,
  name: '定时触发器',
  status: TriggerStatus.ACTIVE,
  config: {
    interval: 60000, // 1 分钟
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin',
    triggerCount: 0,
    errorCount: 0,
  },
})

// 手动触发
await manager.manualTrigger('trigger-id', { data: 'value' })
```

### 3. 工作流调度器

管理工作流的执行调度，包括任务队列、并发控制、重试机制等。

```typescript
import { WorkflowScheduler } from '@/lib/workflow/scheduler'

const scheduler = new WorkflowScheduler({
  maxConcurrentTasks: 10,
  taskQueueSize: 100,
  taskTimeout: 300000,
  retryPolicy: {
    maxRetries: 3,
    backoff: 'exponential',
    interval: 1000,
  },
})

// 注册工作流
scheduler.registerWorkflow(workflow)

// 触发工作流
const task = await scheduler.triggerWorkflow('workflow-id', {
  inputData: 'value',
})

// 查询任务状态
const updatedTask = scheduler.getTask(task.id)
```

### 4. 工作流执行引擎

解析和执行工作流定义，管理节点执行顺序和状态。

```typescript
import { enhancedWorkflowExecutor } from '@/lib/workflow/executor'

// 注册工作流
enhancedWorkflowExecutor.registerWorkflow(workflow)

// 创建实例
const instance = enhancedWorkflowExecutor.createInstance(
  'workflow-id',
  { inputData: 'value' },
  { triggeredBy: 'user-123', triggerType: 'manual' }
)

// 执行实例
const result = await enhancedWorkflowExecutor.executeInstance(instance.id)
```

## 节点类型

| 节点类型 | 说明 |
|----------|------|
| `START` | 开始节点 |
| `END` | 结束节点 |
| `AGENT` | Agent 节点 |
| `CONDITION` | 条件节点 |
| `PARALLEL` | 并行节点 |
| `WAIT` | 等待节点 |
| `HUMAN_INPUT` | 人工输入节点 |
| `LOOP` | 循环节点 |
| `SUBWORKFLOW` | 子工作流节点 |

## 工作流 DSL 示例

### JSON 格式

```json
{
  "id": "example-workflow",
  "name": "示例工作流",
  "version": 1,
  "status": "active",
  "nodes": [
    {
      "id": "start",
      "type": "start",
      "name": "开始",
      "position": { "x": 100, "y": 100 }
    },
    {
      "id": "agent1",
      "type": "agent",
      "name": "数据处理",
      "position": { "x": 300, "y": 100 },
      "config": {
        "agentId": "data-processor",
        "prompt": "处理输入数据"
      }
    },
    {
      "id": "end",
      "type": "end",
      "name": "结束",
      "position": { "x": 500, "y": 100 }
    }
  ],
  "edges": [
    {
      "id": "edge1",
      "source": "start",
      "target": "agent1",
      "type": "sequence"
    },
    {
      "id": "edge2",
      "source": "agent1",
      "target": "end",
      "type": "sequence"
    }
  ]
}
```

### YAML 格式

```yaml
id: example-workflow
name: 示例工作流
version: 1
status: active
nodes:
  - id: start
    type: start
    name: 开始
    position:
      x: 100
      y: 100
  - id: agent1
    type: agent
    name: 数据处理
    position:
      x: 300
      y: 100
    config:
      agentId: data-processor
      prompt: 处理输入数据
  - id: end
    type: end
    name: 结束
    position:
      x: 500
      y: 100
edges:
  - id: edge1
    source: start
    target: agent1
    type: sequence
  - id: edge2
    source: agent1
    target: end
    type: sequence
```

## 单元测试

运行测试：

```bash
# 运行所有工作流测试
npm test -- src/lib/workflow/__tests__

# 运行特定测试文件
npm test -- src/lib/workflow/__tests__/dsl.test.ts
npm test -- src/lib/workflow/__tests__/triggers.test.ts
npm test -- src/lib/workflow/__tests__/scheduler.test.ts

# 生成覆盖率报告
npm test -- --coverage src/lib/workflow
```

## 使用示例

完整的使用示例请参见 `src/lib/workflow/examples.ts` 文件。

```typescript
import { example1_DSLParser, example2_CustomWorkflow } from '@/lib/workflow/examples'

// 运行示例
await example1_DSLParser()
await example2_CustomWorkflow()
```

## 文档

详细的技术文档请参见 `REPORT_Workflow_Automation_Implementation.md`。

## 最佳实践

1. **工作流设计**
   - 保持简单，避免过于复杂的工作流
   - 为每个节点配置适当的重试策略
   - 设置合理的超时时间

2. **触发器使用**
   - 使用防抖机制防止重复触发
   - 对 Webhook 和事件触发器进行输入验证
   - 定期检查触发器的执行统计

3. **性能优化**
   - 根据系统资源设置合理的并发数
   - 使用任务队列避免系统过载
   - 定期清理已完成的任务

4. **安全考虑**
   - 为 Webhook 触发器配置认证
   - 限制 Webhook 的来源 IP
   - 避免在工作流定义中存储敏感信息

## 未来改进

- 完整的 Cron 表达式支持
- 工作流持久化到数据库
- 可视化工作流编辑器
- 分布式工作流执行
- 工作流版本管理

## 许可证

MIT