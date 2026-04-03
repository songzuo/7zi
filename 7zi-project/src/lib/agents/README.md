# Agent Registry Module

智能体注册表模块 - 管理所有注册的智能体信息。

## 📖 概述 / Overview

Agent Registry 提供智能体的注册、发现和管理功能：

- **智能体注册** - 注册新的智能体
- **能力发现** - 按能力查找智能体
- **状态管理** - 跟踪智能体在线/离线/忙碌状态
- **负载监控** - 实时监控智能体负载

## 🚀 快速开始 / Quick Start

```typescript
import { AgentRegistry } from '@/lib/agents'

// 创建注册表
const registry = new AgentRegistry()

// 注册智能体
registry.register({
  id: 'agent-001',
  name: '分析智能体',
  capabilities: ['analysis', 'nlp', 'ml'],
  status: 'online',
  currentLoad: 0.2
})

// 查找具备特定能力的智能体
const agents = registry.filter({
  capabilities: ['nlp'],
  status: 'online'
})

// 更新状态
registry.updateStatus('agent-001', 'busy')
```

## 📦 核心 API / Core API

### AgentRegistry

智能体注册表类。

#### `register()`

注册新的智能体。

```typescript
register(agent: Agent): void
```

#### `unregister()`

注销智能体。

```typescript
unregister(agentId: string): boolean
```

#### `get()`

获取单个智能体。

```typescript
get(agentId: string): Agent | undefined
```

#### `getAll()`

获取所有智能体。

```typescript
getAll(): Agent[]
```

#### `filter()`

根据条件筛选智能体。

```typescript
filter(filter: AgentFilter): Agent[]
```

**筛选条件**:
```typescript
interface AgentFilter {
  capabilities?: string[]      // 所需能力列表
  status?: 'online' | 'offline' | 'busy'
  maxLoad?: number             // 最大负载阈值
}
```

#### `updateStatus()`

更新智能体状态。

```typescript
updateStatus(agentId: string, status: Agent['status']): boolean
```

#### `updateLoad()`

更新智能体负载。

```typescript
updateLoad(agentId: string, load: number): boolean
```

## 📋 类型定义 / Type Definitions

### Agent

```typescript
interface Agent {
  id: string                    // 唯一标识
  name: string                  // 显示名称
  capabilities: string[]        // 能力列表
  status: 'online' | 'offline' | 'busy'
  currentLoad: number           // 当前负载 (0-1)
  metadata?: Record<string, unknown>
}
```

### AgentFilter

```typescript
interface AgentFilter {
  capabilities?: string[]
  status?: Agent['status']
  maxLoad?: number
}
```

## 💡 使用场景 / Use Cases

### 查找可用智能体

```typescript
// 查找所有在线的分析智能体
const analysts = registry.filter({
  capabilities: ['analysis'],
  status: 'online',
  maxLoad: 0.8  // 负载不超过 80%
})

console.log(`找到 ${analysts.length} 个可用智能体`)
```

### 负载均衡

```typescript
// 找到负载最低的智能体
const availableAgents = registry.filter({
  capabilities: ['processing'],
  status: 'online'
})

const bestAgent = availableAgents.reduce((best, current) =>
  current.currentLoad < best.currentLoad ? current : best
)

// 分配任务
registry.updateLoad(bestAgent.id, bestAgent.currentLoad + 0.3)
```

### 监听智能体事件

```typescript
registry.on('agent:registered', (agent) => {
  console.log(`新智能体注册: ${agent.name}`)
})

registry.on('agent:status:changed', (agent, oldStatus) => {
  console.log(`${agent.name} 状态变更: ${oldStatus} -> ${agent.status}`)
})
```

## 📊 事件 / Events

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `agent:registered` | `Agent` | 新智能体注册 |
| `agent:unregistered` | `Agent` | 智能体注销 |
| `agent:status:changed` | `Agent, oldStatus` | 状态变更 |
| `agent:load:changed` | `Agent, oldLoad` | 负载变更 |

## 📁 目录结构 / Directory Structure

```
src/lib/agents/
├── AgentRegistry.ts    # 注册表实现
└── index.ts            # 模块导出
```

## 📚 相关模块 / Related Modules

- [`../a2a`](../a2a) - 智能体间通信协议
- [`../multi-agent`](../multi-agent) - 多智能体编排

## 📄 许可证 / License

MIT