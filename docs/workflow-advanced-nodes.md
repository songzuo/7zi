# 工作流高级节点功能文档

## 概述

v1.11 工作流系统新增了高级节点功能，支持更复杂的业务逻辑和流程控制。

## 新增节点类型

### 1. HumanInputNode - 人工输入节点

用于需要人工介入的场景，如审批、确认、表单填写等。

#### 配置

```typescript
interface HumanInputConfig {
  formSchema: {
    fields: Array<{
      name: string
      type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'date'
      label: string
      required?: boolean
      placeholder?: string
      options?: string[]
      defaultValue?: unknown
      validation?: {
        min?: number
        max?: number
        pattern?: string
      }
    }>
  }
  requiredApprovals?: number
  timeout?: number
  approvalMessage?: string
  allowSkip?: boolean
}
```

#### 使用示例

```typescript
const approvalNode: WorkflowNode = {
  id: 'approval-1',
  type: NodeType.HUMAN_INPUT,
  name: '审批节点',
  position: { x: 200, y: 100 },
  humanInputConfig: {
    formSchema: {
      fields: [
        {
          name: 'approved',
          type: 'checkbox',
          label: '是否批准',
          required: true,
        },
        {
          name: 'comment',
          type: 'textarea',
          label: '审批意见',
          required: false,
        },
      ],
    },
    requiredApprovals: 1,
    timeout: 300,
  },
}
```

#### API 方法

- `submitInput(instanceId, nodeId, data)` - 提交人工输入
- `getPendingTasks()` - 获取所有待处理任务
- `getPendingTask(instanceId, nodeId)` - 获取指定任务
- `cancelTask(instanceId, nodeId)` - 取消任务
- `clearCompletedInputs(instanceId?)` - 清理已完成的输入

---

### 2. LoopNode - 循环节点

支持多种循环类型：while、do-while、for、forEach。

#### 配置

```typescript
interface LoopConfig {
  loopType: 'while' | 'doWhile' | 'for' | 'forEach'
  condition?: string  // while/doWhile 条件
  forConfig?: {
    start: number
    end: number
    step?: number
    variableName?: string
  }
  forEachConfig?: {
    array: string
    variableName: string
    indexVariableName?: string
  }
  maxIterations?: number
  timeout?: number
  continueOnError?: boolean
  collectResults?: boolean
}
```

#### 使用示例

##### While 循环

```typescript
const whileLoopNode: WorkflowNode = {
  id: 'loop-1',
  type: NodeType.LOOP,
  name: 'While 循环',
  position: { x: 200, y: 100 },
  loopConfig: {
    loopType: 'while',
    condition: 'variables.counter < 10',
    maxIterations: 100,
  },
}
```

##### For 循环

```typescript
const forLoopNode: WorkflowNode = {
  id: 'loop-2',
  type: NodeType.LOOP,
  name: 'For 循环',
  position: { x: 200, y: 200 },
  loopConfig: {
    loopType: 'for',
    forConfig: {
      start: 0,
      end: 10,
      step: 1,
      variableName: 'i',
    },
    collectResults: true,
  },
}
```

##### ForEach 循环

```typescript
const forEachLoopNode: WorkflowNode = {
  id: 'loop-3',
  type: NodeType.LOOP,
  name: 'ForEach 循环',
  position: { x: 200, y: 300 },
  loopConfig: {
    loopType: 'forEach',
    forEachConfig: {
      array: 'variables.items',
      variableName: 'item',
      indexVariableName: 'index',
    },
    continueOnError: true,
  },
}
```

#### API 方法

- `getLoopState(instanceId, nodeId)` - 获取循环状态
- `clearLoopState(instanceId?)` - 清理循环状态

---

### 3. ConditionNode - 条件分支节点（已存在）

支持条件表达式判断，根据结果选择不同的执行分支。

#### 配置

```typescript
interface ConditionConfig {
  expression: string
  trueLabel?: string
  falseLabel?: string
}
```

#### 使用示例

```typescript
const conditionNode: WorkflowNode = {
  id: 'condition-1',
  type: NodeType.CONDITION,
  name: '条件判断',
  position: { x: 200, y: 100 },
  conditionConfig: {
    expression: 'data.amount > 1000',
    trueLabel: '高金额',
    falseLabel: '低金额',
  },
}
```

---

### 4. ParallelNode - 并行执行节点（已存在）

用于并行分支的起始点，支持并发执行多个分支。

#### 使用示例

```typescript
const parallelNode: WorkflowNode = {
  id: 'parallel-1',
  type: NodeType.PARALLEL,
  name: '并行执行',
  position: { x: 200, y: 100 },
}
```

---

### 5. WaitNode - 等待节点（已存在）

支持定时等待和事件等待。

#### 配置

```typescript
interface WaitConfig {
  duration?: number  // 等待时长（秒）
  waitForEvent?: string  // 等待的事件
}
```

#### 使用示例

```typescript
const waitNode: WorkflowNode = {
  id: 'wait-1',
  type: NodeType.WAIT,
  name: '等待',
  position: { x: 200, y: 100 },
  waitConfig: {
    duration: 5,
  },
}
```

---

## 执行器注册

所有节点执行器已自动注册到 `nodeExecutorRegistry`：

```typescript
import { nodeExecutorRegistry } from '@/lib/workflow/executors/registry'

// 获取执行器
const executor = nodeExecutorRegistry.get(NodeType.HUMAN_INPUT)
const loopExecutor = nodeExecutorRegistry.get(NodeType.LOOP)
```

---

## 安全性

### 条件表达式安全检查

所有条件表达式都会经过安全检查，禁止以下操作：

- `eval()`
- `Function()`
- `require()`
- `import`
- 访问 `process`、`global`、`window`、`document`
- 网络请求（`fetch`、`http://`、`https://`）

---

## 测试覆盖

新增的节点执行器包含完整的单元测试：

- `human-input-executor.test.ts` - 15 个测试用例
- `loop-executor.test.ts` - 32 个测试用例

运行测试：

```bash
npm test -- src/lib/workflow/__tests__/human-input-executor.test.ts
npm test -- src/lib/workflow/__tests__/loop-executor.test.ts
```

---

## 最佳实践

### 1. 人工输入节点

- 设置合理的超时时间，避免工作流长时间挂起
- 使用必填字段确保关键信息不遗漏
- 考虑使用 `requiredApprovals` 实现多人审批

### 2. 循环节点

- 始终设置 `maxIterations` 防止无限循环
- 使用 `timeout` 防止循环执行时间过长
- 根据需要设置 `continueOnError` 决定错误处理策略
- 使用 `collectResults` 收集迭代结果（注意内存使用）

### 3. 条件节点

- 保持条件表达式简洁明了
- 使用有意义的标签（`trueLabel`、`falseLabel`）
- 避免复杂的嵌套条件

### 4. 并行节点

- 确保并行分支之间没有数据依赖
- 注意并行执行的资源消耗
- 合理设置超时时间

---

## 迁移指南

### 从旧版本迁移

如果你已经在使用工作流系统，新增的节点类型无需额外配置即可使用。

### 创建新工作流

使用新增节点类型时，确保：

1. 节点类型正确（`NodeType.HUMAN_INPUT`、`NodeType.LOOP`）
2. 配置完整（`humanInputConfig`、`loopConfig`）
3. 边连接正确（条件节点需要配置 `conditionConfig`）

---

## 故障排查

### 人工输入节点超时

- 检查 `timeout` 配置是否合理
- 确认是否有用户提交输入
- 使用 `getPendingTasks()` 查看待处理任务

### 循环节点不执行

- 检查条件表达式是否正确
- 确认 `maxIterations` 是否设置
- 查看循环状态 `getLoopState()`

### 条件节点分支错误

- 检查条件表达式语法
- 确认边的 `conditionConfig` 配置正确
- 验证表达式中的变量是否存在

---

## 未来计划

- [ ] 支持嵌套循环
- [ ] 支持循环中断（break/continue）
- [ ] 支持人工输入的多人审批流程
- [ ] 支持条件节点的复杂表达式（AND/OR）
- [ ] 支持并行节点的结果聚合
- [ ] 支持等待节点的事件触发机制

---

## 相关文档

- [工作流类型定义](../../types/workflow.ts)
- [工作流引擎](../engine.ts)
- [工作流执行器](../executor.ts)
- [节点执行器注册表](../executors/registry.ts)