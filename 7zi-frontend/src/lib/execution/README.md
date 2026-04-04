# Execution State Persistence (v1.12.2)

## 概述

执行状态持久化模块用于防止工作流执行时刷新页面丢失进度。基于 IndexedDB，支持自动保存和恢复执行状态。

## 特性

- ✅ 基于 IndexedDB 优先，localStorage 降级
- ✅ 自动保存执行状态（默认 5 秒间隔）
- ✅ 支持执行恢复（pending/running/paused）
- ✅ 节点状态跟踪
- ✅ 执行进度实时更新
- ✅ 执行日志（保留最近 100 条）
- ✅ 变量管理
- ✅ 自动过期清理（24 小时）
- ✅ TypeScript 类型安全

## 文件结构

```
src/lib/execution/
├── index.ts                      # 模块入口
├── execution-storage.ts          # 核心存储模块
├── useExecutionPersistence.ts    # React Hook
├── examples.ts                   # 使用示例
├── __tests__/
│   └── execution-storage.test.ts # 单元测试
└── README.md                     # 本文档
```

## API 列表

### ExecutionStorageManager 类

| 方法 | 说明 | 参数 | 返回 |
|------|------|------|------|
| `saveExecutionState()` | 保存执行状态 | `state`, `options?` | `Promise<string>` |
| `loadExecutionState()` | 加载执行状态 | `id` | `Promise<ExecutionStateData \| null>` |
| `updateExecutionProgress()` | 更新执行进度 | `id`, `progress` | `Promise<void>` |
| `updateNodeState()` | 更新节点状态 | `id`, `nodeId`, `nodeState` | `Promise<void>` |
| `completeExecution()` | 标记完成 | `id`, `outputs?` | `Promise<void>` |
| `failExecution()` | 标记失败 | `id`, `error` | `Promise<void>` |
| `pauseExecution()` | 标记暂停 | `id` | `Promise<void>` |
| `resumeExecution()` | 恢复执行 | `id` | `Promise<ResumeExecutionResult>` |
| `cancelExecution()` | 取消执行 | `id` | `Promise<void>` |
| `addExecutionLog()` | 添加日志 | `id`, `level`, `message`, `nodeId?` | `Promise<void>` |
| `updateVariables()` | 更新变量 | `id`, `variables` | `Promise<void>` |
| `listExecutions()` | 列出执行 | `workflowId?` | `Promise<ExecutionStateData[]>` |
| `deleteExecution()` | 删除执行 | `id` | `Promise<void>` |
| `clearExpiredExecutions()` | 清理过期 | - | `Promise<number>` |

### useExecutionPersistence Hook

```typescript
const {
  // 状态
  executionId,
  executionState,
  isLoading,
  error,

  // 操作
  initializeExecution,
  loadExecution,
  saveState,
  updateProgress,
  updateNode,
  complete,
  fail,
  pause,
  resume,
  cancel,
  addLog,
  updateVariables,
  deleteExecution,

  // 状态检查
  canResume,
  isCompleted,
  isFailed,
  isPaused,
  isRunning,
} = useExecutionPersistence(executionId, {
  autoSaveInterval: 5000,
  autoLoad: true,
  onDelete: () => {},
  onError: (error) => {},
})
```

## 使用示例

### 基本使用

```typescript
import { saveExecutionState, loadExecutionState } from '@/lib/execution'

// 保存执行状态
const executionId = await saveExecutionState({
  workflowId: 'workflow-123',
  workflowName: '数据处理工作流',
  instanceId: '',
  status: 'running',
  nodeStates: {},
  progress: {
    totalNodes: 5,
    completedNodes: 2,
    failedNodes: 0,
    skippedNodes: 0,
    percentage: 40,
  },
  inputs: {},
  outputs: {},
  variables: {},
  logs: [],
  startTime: Date.now(),
})

// 加载执行状态
const state = await loadExecutionState(executionId)
```

### 使用 React Hook

```typescript
import { useExecutionPersistence } from '@/lib/execution'

function WorkflowExecutor() {
  const {
    executionState,
    initializeExecution,
    updateNode,
    complete,
  } = useExecutionPersistence(null)

  const startExecution = async () => {
    // 初始化
    const id = await initializeExecution({
      workflowId: 'workflow-123',
      workflowName: '测试工作流',
    })

    // 执行节点
    await updateNode('node-1', {
      nodeId: 'node-1',
      status: 'completed',
      result: { success: true, data: {} },
    })

    // 标记完成
    await complete({ result: 'success' })
  }

  return <button onClick={startExecution}>开始执行</button>
}
```

### 恢复执行

```typescript
import { resumeExecution } from '@/lib/execution'

// 检查是否可以恢复
const result = await resumeExecution(executionId)

if (result.success && result.canResume) {
  // 可以恢复，从 result.state 获取状态
  const state = result.state!
  console.log('Resuming execution:', state.status)
} else {
  // 无法恢复，创建新执行
  console.log('Cannot resume:', result.reason)
}
```

## 类型定义

### ExecutionStatus

```typescript
type ExecutionStatus =
  | 'pending'      // 待执行
  | 'running'      // 运行中
  | 'paused'       // 已暂停
  | 'completed'    // 已完成
  | 'failed'       // 执行失败
  | 'cancelled'    // 已取消
```

### NodeExecutionStatus

```typescript
type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
```

### ExecutionStateData

```typescript
interface ExecutionStateData {
  workflowId: string
  workflowName: string
  instanceId: string
  status: ExecutionStatus
  nodeStates: Record<string, NodeState>
  progress: ExecutionProgress
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  variables: Record<string, unknown>
  logs: Array<{
    timestamp: number
    level: 'info' | 'warn' | 'error'
    message: string
    nodeId?: string
  }>
  error?: string
  startTime: number
  endTime?: number
  currentStep?: string
}
```

## 集成说明

### 与现有执行引擎集成

执行状态持久化模块设计为与现有执行引擎兼容：

1. **位置**：位于 `src/lib/execution/`
2. **复用**：基于 `draft-storage.ts` 的 IndexedDB 基础设施
3. **独立性**：不修改现有执行逻辑，仅添加持久化层
4. **可选性**：可以选择性地启用持久化

### 集成步骤

1. 在执行引擎初始化时创建执行状态：

```typescript
import { saveExecutionState } from '@/lib/execution'

const executionId = await saveExecutionState({
  workflowId: workflow.id,
  workflowName: workflow.name,
  status: 'pending',
  // ... 其他初始状态
})
```

2. 在节点执行完成后更新节点状态：

```typescript
import { updateNodeState } from '@/lib/execution'

await updateNodeState(executionId, nodeId, {
  nodeId,
  status: 'completed',
  result: { success: true, data: output },
})
```

3. 在工作流完成时标记：

```typescript
import { completeExecution } from '@/lib/execution'

await completeExecution(executionId, { finalOutput })
```

### 恢复执行流程

1. 检测到未完成的执行时，调用 `resumeExecution(id)`
2. 检查返回结果中的 `canResume` 字段
3. 如果可以恢复，从保存的状态继续执行
4. 如果无法恢复，创建新执行或提示用户

## 测试

运行测试：

```bash
npm test -- lib/execution/__tests__/execution-storage.test.ts
```

所有测试通过：✅ 8/8 tests

## 注意事项

1. **性能**：自动保存间隔默认为 5 秒，可根据需要调整
2. **存储限制**：日志只保留最近 100 条，详细日志应存储在服务端
3. **过期清理**：执行状态默认 24 小时后过期
4. **恢复限制**：只有 `pending`、`running`、`paused` 状态可以恢复
5. **并发控制**：不建议同一执行在多个窗口同时恢复

## 待办

- [ ] 集成到实际执行引擎
- [ ] 添加 UI 组件显示可恢复的执行
- [ ] 实现手动触发保存
- [ ] 添加执行历史查看
- [ ] 优化大量节点的性能
