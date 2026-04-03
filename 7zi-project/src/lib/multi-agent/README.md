# Multi-Agent Orchestrator Module

多智能体协作编排器模块 - 用于协调和管理多个 AI 智能体的并行、串行和动态任务执行。

## 📖 概述 / Overview

Multi-Agent Orchestrator 是一个强大的多智能体协作框架，支持：

- **并行执行** - 多个智能体同时处理任务，汇总结果
- **串行工作流** - 按依赖顺序执行任务链
- **动态分配** - 基于能力和负载智能分配任务
- **结果聚合** - 支持多种聚合策略（first/all/best/vote/custom）

## 🚀 快速开始 / Quick Start

```typescript
import { MultiAgentOrchestrator, AgentRegistry } from '@/lib/multi-agent'

// 创建编排器
const orchestrator = new MultiAgentOrchestrator()

// 定义任务
const task = {
  id: 'task-001',
  title: '分析用户行为',
  requiredCapabilities: ['analysis', 'nlp'],
  aggregationStrategy: 'vote',
  payload: { userId: '12345' }
}

// 并行执行
const result = await orchestrator.executeParallel(agents, task)
console.log(result.aggregated)
```

## 📦 核心 API / Core API

### MultiAgentOrchestrator

主编排器类，提供任务执行和智能体管理功能。

#### 构造函数

```typescript
constructor(agentRegistry?: AgentRegistry, a2aProtocol?: A2AProtocol)
```

#### 方法

##### `executeParallel()`

并行执行多个智能体，汇总结果。

```typescript
async executeParallel(
  agents: Agent[],
  task: Task,
  options?: ExecutionOptions
): Promise<AggregatedResult>
```

**参数**:
- `agents` - 智能体数组
- `task` - 任务定义
- `options` - 执行选项（可选）

**返回**: `AggregatedResult` - 聚合结果

**示例**:
```typescript
const result = await orchestrator.executeParallel(
  [agent1, agent2, agent3],
  {
    id: 'analysis-001',
    title: '文本分析',
    requiredCapabilities: ['nlp'],
    aggregationStrategy: 'vote',
    payload: { text: 'Hello World' }
  },
  {
    timeout: 30000,
    maxAgents: 2,
    retryOnFailure: true,
    maxRetries: 3
  }
)
```

##### `executeSequential()`

串行执行工作流步骤。

```typescript
async executeSequential(
  workflow: WorkflowStep[],
  options?: ExecutionOptions
): Promise<AggregatedResult[]>
```

**参数**:
- `workflow` - 工作流步骤数组
- `options` - 执行选项（可选）

**返回**: `AggregatedResult[]` - 每个步骤的结果

**示例**:
```typescript
const workflow = [
  {
    taskId: 'step-1',
    task: {
      id: 'extract-001',
      title: '提取数据',
      requiredCapabilities: ['extraction']
    }
  },
  {
    taskId: 'step-2',
    task: {
      id: 'analyze-001',
      title: '分析数据',
      requiredCapabilities: ['analysis']
    },
    dependsOn: ['step-1']  // 依赖 step-1
  }
]

const results = await orchestrator.executeSequential(workflow)
```

##### `assignDynamically()`

基于能力和负载动态分配任务。

```typescript
async assignDynamically(
  task: Task,
  options?: ExecutionOptions
): Promise<AggregatedResult>
```

**参数**:
- `task` - 任务定义
- `options` - 执行选项（可选）

**返回**: `AggregatedResult` - 执行结果

**示例**:
```typescript
const result = await orchestrator.assignDynamically({
  id: 'task-001',
  title: '处理请求',
  requiredCapabilities: ['processing', 'fast'],
  payload: { data: '...' }
})
```

## 📋 类型定义 / Type Definitions

### Task

任务定义接口。

```typescript
interface Task {
  id: string                    // 任务唯一标识
  title: string                 // 任务标题
  requiredCapabilities: string[] // 所需能力列表
  aggregationStrategy?: 'first' | 'all' | 'best' | 'vote' | 'custom'
  payload?: unknown             // 任务负载数据
  timeout?: number              // 超时时间（毫秒）
}
```

### WorkflowStep

工作流步骤定义。

```typescript
interface WorkflowStep {
  taskId: string                // 步骤ID
  task: Task                    // 任务定义
  dependsOn?: string[]          // 依赖的任务ID列表
}
```

### AggregatedResult

聚合结果接口。

```typescript
interface AggregatedResult {
  taskId: string                // 任务ID
  results: Array<{              // 各智能体的结果
    agentId: string
    result: unknown
  }>
  aggregated: unknown           // 聚合后的结果
  metadata: {                   // 元数据
    duration: number            // 执行时长（毫秒）
    agentsUsed: number          // 使用的智能体数量
    successCount: number        // 成功数量
    failureCount: number        // 失败数量
  }
}
```

### ExecutionOptions

执行选项接口。

```typescript
interface ExecutionOptions {
  timeout?: number              // 超时时间（毫秒）
  maxAgents?: number            // 最大智能体数量
  retryOnFailure?: boolean      // 失败时是否重试
  maxRetries?: number           // 最大重试次数
}
```

## 🎯 聚合策略 / Aggregation Strategies

### `first`

返回第一个成功的结果。

```typescript
const task = {
  aggregationStrategy: 'first',
  // ...
}
```

### `all`

返回所有结果。

```typescript
const task = {
  aggregationStrategy: 'all',
  // ...
}
```

### `best`

返回最佳结果（简化为第一个成功的结果）。

```typescript
const task = {
  aggregationStrategy: 'best',
  // ...
}
```

### `vote`

投票策略，返回得票最多的结果。

```typescript
const task = {
  aggregationStrategy: 'vote',
  // ...
}
```

### `custom`

自定义聚合策略，返回原始结果数组供用户处理。

```typescript
const task = {
  aggregationStrategy: 'custom',
  // ...
}
```

## 💡 使用场景 / Use Cases

### 场景 1: 并行文本分析

```typescript
// 多个智能体同时分析同一文本
const analysisTask = {
  id: 'text-analysis',
  title: '文本情感分析',
  requiredCapabilities: ['sentiment-analysis'],
  aggregationStrategy: 'vote',
  payload: { text: 'This product is amazing!' }
}

const result = await orchestrator.executeParallel(
  sentimentAgents,
  analysisTask
)
console.log('综合情感:', result.aggregated)
```

### 场景 2: 数据处理流水线

```typescript
// 串行执行数据处理流程
const pipeline = [
  {
    taskId: 'extract',
    task: {
      id: 'extract-001',
      title: '提取数据',
      requiredCapabilities: ['data-extraction']
    }
  },
  {
    taskId: 'transform',
    task: {
      id: 'transform-001',
      title: '转换数据',
      requiredCapabilities: ['data-transformation']
    },
    dependsOn: ['extract']
  },
  {
    taskId: 'load',
    task: {
      id: 'load-001',
      title: '加载数据',
      requiredCapabilities: ['data-loading']
    },
    dependsOn: ['transform']
  }
]

const results = await orchestrator.executeSequential(pipeline)
```

### 场景 3: 智能负载均衡

```typescript
// 自动选择负载最低的智能体
const task = {
  id: 'process-request',
  title: '处理用户请求',
  requiredCapabilities: ['request-processing'],
  payload: { userId: '123', action: 'create' }
}

const result = await orchestrator.assignDynamically(task)
console.log(`由智能体 ${result.results[0].agentId} 处理`)
```

## 🔧 高级配置 / Advanced Configuration

### 自定义智能体注册表

```typescript
import { AgentRegistry } from '@/lib/agents/AgentRegistry'

const registry = new AgentRegistry()

// 注册智能体
registry.register({
  id: 'agent-001',
  name: '分析智能体',
  capabilities: ['analysis', 'nlp'],
  status: 'online',
  currentLoad: 0.2
})

// 使用自定义注册表
const orchestrator = new MultiAgentOrchestrator(registry)
```

### 自定义 A2A 协议

```typescript
import { A2AProtocol } from '@/lib/a2a/A2AProtocol'

const protocol = new A2AProtocol({
  timeout: 60000,
  retryAttempts: 5
})

const orchestrator = new MultiAgentOrchestrator(undefined, protocol)
```

## 📊 性能考虑 / Performance Considerations

- **并行执行** - 适合独立任务，可显著提升吞吐量
- **串行执行** - 适合有依赖关系的任务链
- **动态分配** - 自动负载均衡，优化资源利用
- **超时控制** - 防止任务无限等待

## 🧪 测试 / Testing

```typescript
import { MultiAgentOrchestrator } from '@/lib/multi-agent'

describe('MultiAgentOrchestrator', () => {
  it('should execute parallel tasks', async () => {
    const orchestrator = new MultiAgentOrchestrator()
    const result = await orchestrator.executeParallel(agents, task)
    expect(result.aggregated).toBeDefined()
  })

  it('should execute sequential workflow', async () => {
    const orchestrator = new MultiAgentOrchestrator()
    const results = await orchestrator.executeSequential(workflow)
    expect(results).toHaveLength(2)
  })
})
```

## 📚 相关模块 / Related Modules

- [`AgentRegistry`](../agents/AgentRegistry.ts) - 智能体注册表
- [`A2AProtocol`](../a2a/A2AProtocol.ts) - 智能体间通信协议

## 📄 许可证 / License

MIT