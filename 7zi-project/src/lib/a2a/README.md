# A2A Protocol Module

Agent-to-Agent 通信协议模块 - 提供智能体间的消息传递和通信能力。

## 📖 概述 / Overview

A2A Protocol 实现了智能体间标准化通信协议，支持：

- **消息发送** - 发送通知、请求、响应
- **请求/响应模式** - 支持超时和重试
- **事件驱动** - 基于 EventEmitter 的消息处理
- **优先级支持** - 低/正常/高优先级消息

## 🚀 快速开始 / Quick Start

```typescript
import { A2AProtocol } from '@/lib/a2a'

// 创建协议实例
const protocol = new A2AProtocol()

// 发送请求并等待响应
const response = await protocol.request(
  'agent-a',
  'agent-b',
  { action: 'process', data: '...' },
  { timeout: 30000 }
)

// 发送通知（无需响应）
await protocol.send('agent-a', 'agent-b', 'notification', {
  event: 'task_completed',
})
```

## 📦 核心 API / Core API

### A2AProtocol

主协议类，提供消息传递功能。

#### `send()`

发送消息。

```typescript
async send(
  from: string,
  to: string,
  type: 'request' | 'response' | 'notification' | 'error',
  payload: unknown,
  options?: A2ARequestOptions
): Promise<A2AMessage>
```

#### `request()`

发送请求并等待响应。

```typescript
async request(
  from: string,
  to: string,
  payload: unknown,
  options?: A2ARequestOptions
): Promise<unknown>
```

#### `respond()`

发送响应。

```typescript
async respond(
  from: string,
  to: string,
  correlationId: string,
  payload: unknown
): Promise<A2AMessage>
```

#### `onMessage()`

注册消息处理器。

```typescript
onMessage(
  handler: (msg: A2AMessage) => Promise<unknown>
): void
```

## 📋 类型定义 / Type Definitions

### A2AMessage

```typescript
interface A2AMessage {
  id: string
  from: string
  to: string
  type: 'request' | 'response' | 'notification' | 'error'
  timestamp: number
  payload: unknown
  correlationId?: string
}
```

### A2ARequestOptions

```typescript
interface A2ARequestOptions {
  timeout?: number // 超时时间（毫秒）
  priority?: 'low' | 'normal' | 'high'
  metadata?: Record<string, unknown>
}
```

## 💡 使用场景 / Use Cases

### 智能体间协作

```typescript
// Agent A 请求 Agent B 处理任务
const result = await protocol.request(
  'orchestrator',
  'worker-agent',
  { task: 'analyze', data: largeDataset },
  { timeout: 60000, priority: 'high' }
)
```

### 事件通知

```typescript
// 发送任务完成通知
await protocol.send('worker', 'monitor', 'notification', { event: 'task_completed', taskId: '123' })
```

## 📁 目录结构 / Directory Structure

```
src/lib/a2a/
├── A2AProtocol.ts      # 协议核心实现
├── A2AClient.ts        # 客户端
├── A2AServer.ts        # 服务端
├── A2ATypes.ts         # 类型定义
├── index.ts            # 模块导出
└── examples/
    └── A2AExamples.ts  # 使用示例
```

## 📚 相关模块 / Related Modules

- [`../agents`](../agents) - 智能体注册表
- [`../multi-agent`](../multi-agent) - 多智能体编排

## 📄 许可证 / License

MIT
