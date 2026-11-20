# Multi-Agent 协作框架

7zi v1.5.0 的核心功能模块，提供完整的 Multi-Agent 协作能力。

## 功能概述

- **Agent 消息总线** - 支持 Agent 间异步消息传递、路由、订阅、广播
- **Agent 注册表** - Agent 发现、注册、能力匹配和健康检查
- **任务分解引擎** - 自动分解复杂任务并分配给合适的 Agent
- **Agent 协作协议** - 基于 A2A 的扩展协议，支持任务委托、状态同步、结果交付

## 快速开始

### 1. 创建 Multi-Agent 系统

```typescript
import { createMultiAgentSystem, TransportType } from '@/lib/multi-agent'

const system = createMultiAgentSystem({
  transport: {
    type: TransportType.MEMORY,
  },
  messageBus: {
    defaultTimeout: 30000,
    maxRetryCount: 3,
  },
})

const { messageBus, registry, taskDecomposer, createProtocol } = system
```

### 2. 注册 Agent

```typescript
await registry.register({
  id: 'agent-coder',
  name: 'Code Generator',
  type: 'llm',
  capabilities: [
    {
      id: 'code-generation',
      name: 'Code Generation',
      description: 'Generate code from specifications',
      category: 'development',
      version: '1.0.0',
    },
  ],
  status: 'online',
  lastSeen: Date.now(),
  metadata: {},
})
```

### 3. 创建协议实例

```typescript
const protocol = createProtocol('my-agent-id')
```

### 4. 委托任务

```typescript
const taskId = await protocol.delegateTask('agent-coder', {
  taskId: 'task-001',
  taskName: 'Create REST API',
  taskDescription: 'Create a REST API with Express',
  input: { language: 'typescript', framework: 'express' },
  requiredCapabilities: ['code-generation'],
  priority: MessagePriority.HIGH,
})
```

### 5. 监听事件

```typescript
protocol.on('task.result.received', event => {
  console.log('Task completed:', event.output)
})

protocol.on('task.status.updated', event => {
  console.log('Task status:', event.status, event.progress)
})
```

## 核心组件

### MessageBus (消息总线)

```typescript
// 发送消息
await messageBus.send({
  headers: {
    id: 'msg-1',
    type: MessageType.REQUEST,
    from: 'agent-1',
    to: 'agent-2',
    priority: MessagePriority.NORMAL,
    timestamp: Date.now(),
  },
  body: { data: 'hello' },
})

// 订阅主题
const unsubscribe = messageBus.subscribe('events.*', async ({ message }) => {
  console.log('Received:', message.body)
})

// 广播消息
await messageBus.broadcast('announcements', { message: 'Hello everyone' })

// 请求-响应模式
const response = await messageBus.request('agent-2', { query: 'status' }, { timeout: 10000 })
```

### AgentRegistry (注册表)

```typescript
// 查找具备特定能力的 Agent
const agents = registry.findAgentsByCapability('code-generation')

// 查找具备多个能力的 Agent
const agents = registry.findAgentsByCapabilities(['code-generation', 'testing'])

// 查找最佳 Agent
const bestAgent = registry.findBestAgent(['code-generation'])

// 搜索 Agent
const results = registry.searchAgents({
  type: 'llm',
  status: 'online',
  keyword: 'code',
})

// 更新心跳
await registry.heartbeat('agent-coder')
```

### TaskDecomposer (任务分解)

```typescript
// 创建任务
const task = await taskDecomposer.createTask(
  'Build Website',
  'Build a responsive website',
  { techStack: 'nextjs' },
  {
    requesterId: 'user-1',
    priority: MessagePriority.HIGH,
  }
)

// 执行任务
const result = await taskDecomposer.executeTask(task.id)

// 取消任务
await taskDecomposer.cancelTask(task.id)
```

### AgentCollaborationProtocol (协作协议)

```typescript
// 任务委托
await protocol.delegateTask('target-agent', {
  taskId: 'task-001',
  taskName: 'Analysis',
  taskDescription: 'Analyze data',
  input: { data: [...] },
  requiredCapabilities: ['data-analysis'],
  priority: MessagePriority.NORMAL,
});

// 发送状态更新
await protocol.sendTaskStatus('requester-agent', {
  taskId: 'task-001',
  status: 'running',
  progress: 50,
});

// 发送任务结果
await protocol.sendTaskResult('requester-agent', {
  taskId: 'task-001',
  output: { result: 'success' },
  completedAt: Date.now(),
  executionTime: 5000,
});

// 查询能力
const response = await protocol.queryCapabilities({
  capabilityIds: ['code-generation'],
});

// 状态同步
await protocol.syncState('target-agent', {
  keys: ['version', 'status'],
  values: ['1.0.0', 'active'],
  timestamp: Date.now(),
});
```

## 任务模板

框架内置了常用任务模板：

```typescript
// 使用代码审查模板
const task = await taskDecomposer.createTask(
  'Review Code',
  'Review the pull request',
  { prId: 123 },
  {
    template: taskDecomposer.getTemplate('code-review'),
  }
)

// 使用文档生成模板
const task = await taskDecomposer.createTask(
  'Generate Docs',
  'Generate API documentation',
  { apiSpec: '...' },
  {
    template: taskDecomposer.getTemplate('doc-generation'),
  }
)
```

## WebSocket 传输

除了内存传输，框架还支持 WebSocket 传输：

```typescript
const system = createMultiAgentSystem({
  transport: {
    type: TransportType.WEBSOCKET,
    options: {
      url: 'ws://localhost:8080/agent-bus',
      reconnectInterval: 5000,
      maxRetries: 10,
    },
  },
})
```

## 事件系统

所有组件都使用 EventEmitter 提供事件：

### MessageBus 事件

- `message.sent` - 消息已发送
- `message.received` - 收到消息
- `message.to.{agentId}` - 收到发给特定 Agent 的消息
- `error` - 发生错误

### AgentRegistry 事件

- `register` - Agent 注册
- `unregister` - Agent 注销
- `heartbeat` - Agent 心跳更新
- `status_change` - Agent 状态变化

### TaskDecomposer 事件

- `task.created` - 任务创建
- `task.started` - 任务开始
- `task.completed` - 任务完成
- `task.failed` - 任务失败
- `task.cancelled` - 任务取消
- `task.updated` - 子任务更新

### AgentCollaborationProtocol 事件

- `task.delegated` - 任务已委托
- `task.received` - 收到委托的任务
- `task.status.updated` - 任务状态更新
- `task.result.received` - 收到任务结果
- `task.cancelled` - 任务已取消
- `task.cancelled.received` - 收到取消请求
- `state.synced` - 状态同步

## 测试

```bash
# 运行所有测试
npm test src/lib/multi-agent

# 运行特定模块测试
npm test src/lib/multi-agent/__tests__/message-bus.test.ts
```

## 架构设计

### 消息流向

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Agent A   │         │ MessageBus  │         │   Agent B   │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  (1) Delegate Task   │                       │
       │──────────────────────>│                       │
       │                       │  (2) Forward Message   │
       │                       │──────────────────────>│
       │                       │                       │
       │                       │  (3) Task Status     │
       │                       │<──────────────────────│
       │  (4) Status Update    │                       │
       │<──────────────────────│                       │
       │                       │                       │
       │                       │  (5) Task Result     │
       │                       │<──────────────────────│
       │  (6) Receive Result   │                       │
       │<──────────────────────│                       │
```

### 能力匹配流程

```
1. Agent 注册
   ├─ 注册到 AgentRegistry
   ├─ 索引能力 -> capabilities map
   └─ 设置心跳监控

2. 任务分配
   ├─ TaskDecomposer 分解任务
   ├─ 查找具备所需能力的 Agent
   ├─ 选择最佳 Agent (在线、负载低)
   └─ 通过协议委托任务
```

## 配置选项

```typescript
interface MultiAgentConfig {
  messageBus: {
    defaultTimeout: number // 默认超时时间 (ms)
    maxRetryCount: number // 最大重试次数
    retryDelay: number // 重试延迟 (ms)
    bufferSize: number // 消息队列大小
  }

  registry: {
    heartbeatInterval: number // 心跳间隔 (ms)
    heartbeatTimeout: number // 心跳超时 (ms)
    cleanupInterval: number // 清理间隔 (ms)
  }

  taskDecomposer: {
    maxSubTasks: number // 最大子任务数
    defaultPriority: number // 默认优先级
    enableAutoRetry: boolean // 启用自动重试
  }

  transport: TransportConfig // 传输配置
}
```

## 版本信息

- 版本: 1.0.0
- 协议版本: 1.0
- TypeScript: 完整类型支持

## 未来扩展

- [ ] 支持任务依赖的高级调度算法
- [ ] 添加任务优先级的动态调整
- [ ] 实现任务结果的智能聚合
- [ ] 支持分布式部署（多实例消息总线）
- [ ] 添加性能监控和指标收集
- [ ] 实现任务执行的可视化追踪
