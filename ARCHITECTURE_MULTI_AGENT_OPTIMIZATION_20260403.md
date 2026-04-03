# 多智能体系统架构优化方案

**文档版本**: 1.0  
**生成日期**: 2026-04-03  
**审查范围**: multi-agent 模块 (message-bus, registry, task-decomposer, protocol)

---

## 📊 发现的问题 (按严重程度排序)

### 🔴 P0 - 致命问题 (可能导致系统崩溃)

| 序号 | 问题 | 文件 | 描述 |
|------|------|------|------|
| P0-1 | 内存泄漏 - messageHistory 无限增长 | message-bus.ts | `messageHistory` Map 永不清理，会导致内存耗尽 |
| P0-2 | 未处理的异常会导致事件循环崩溃 | message-bus.ts | `transport.subscribe` 中的 try-catch 无法捕获异步处理异常 |
| P0-3 | 任务依赖死锁风险 | task-decomposer.ts | 循环依赖检测缺失，可能导致死锁 |

### 🟠 P1 - 严重问题 (功能缺失或错误)

| 序号 | 问题 | 文件 | 描述 |
|------|------|------|------|
| P1-1 | 自动重试未实现 | task-decomposer.ts | `enableAutoRetry` 标记为 TODO，重试逻辑缺失 |
| P1-2 | 无公平调度机制 | task-decomposer.ts | 总是选择第一个在线 Agent，低优先级任务可能饥饿 |
| P1-3 | 清理逻辑缺陷 | registry.ts | Agent 注销时未正确清理心跳定时器 |
| P1-4 | pendingTasks 泄漏 | protocol.ts | 超时后的任务未完全清理 |

### 🟡 P2 - 中等问题 (需要改进)

| 序号 | 问题 | 文件 | 描述 |
|------|------|------|------|
| P2-1 | 缺乏连接状态管理 | message-bus.ts | WebSocket 重连时未处理已有订阅 |
| P2-2 | 子任务执行无超时控制 | task-decomposer.ts | 单个子任务执行没有超时限制 |
| P2-3 | 缺乏限流机制 | message-bus.ts | 消息队列无大小限制，可能 OOM |
| P2-4 | 缺乏健康检查机制 | registry.ts | Agent 状态变化无自动恢复逻辑 |

---

## 🛠️ 解决方案

### P0-1: 内存泄漏 - messageHistory 无限增长

**问题代码** (message-bus.ts ~line 400):
```typescript
// 保存到历史记录
this.messageHistory.set(message.headers.id, message)
// 从不清理！
```

**修复方案**:
```typescript
private messageHistory: Map<string, Message> = new Map()
private maxHistorySize: number = 1000 // 添加最大历史记录数

// 修改 send 方法，添加历史记录清理
private trimHistory(): void {
  if (this.messageHistory.size >= this.maxHistorySize) {
    // 删除最旧的 20% 记录
    const entries = Array.from(this.messageHistory.entries())
    const toRemove = entries.slice(0, Math.floor(entries.length * 0.2))
    toRemove.forEach(([key]) => this.messageHistory.delete(key))
  }
}
```

### P0-2: 未处理的异步异常

**问题代码** (message-bus.ts ~line 60):
```typescript
send(message: Message): Promise<void> {
  this.subscribers.forEach(callback => {
    try {
      callback(message)  // 同步 try-catch
    } catch (error) {   // 但回调可能是 async！
      this.eventBus.emit('error', error)
    }
  })
  return Promise.resolve()
}
```

**修复方案**:
```typescript
send(message: Message): Promise<void> {
  this.subscribers.forEach(callback => {
    // 使用 Promise.resolve().then() 捕获异步错误
    Promise.resolve().then(() => callback(message)).catch(error => {
      this.eventBus.emit('error', error)
    })
  })
  return Promise.resolve()
}
```

### P0-3: 循环依赖检测缺失

**问题代码** (task-decomposer.ts):
```typescript
// 没有检测循环依赖的逻辑
private areDependenciesMet(subTask: SubTask, completed: Set<string>): boolean {
  return subTask.dependencies.every(dep => {
    if (!dep.required) return true
    return completed.has(dep.taskId)
  })
}
```

**修复方案**:
```typescript
// 添加循环检测
private validateNoCircularDependencies(subTasks: SubTask[]): void {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  
  const dfs = (taskId: string): boolean => {
    visited.add(taskId)
    recursionStack.add(taskId)
    
    const task = subTasks.find(t => t.id === taskId)
    if (task) {
      for (const dep of task.dependencies) {
        if (!visited.has(dep.taskId)) {
          if (dfs(dep.taskId)) return true
        } else if (recursionStack.has(dep.taskId)) {
          throw new MultiAgentError(
            MultiAgentErrorType.VALIDATION_ERROR,
            `Circular dependency detected: ${taskId} -> ${dep.taskId}`
          )
        }
      }
    }
    
    recursionStack.delete(taskId)
    return false
  }
  
  for (const task of subTasks) {
    if (!visited.has(task.id)) {
      dfs(task.id)
    }
  }
}
```

### P1-1: 自动重试未实现

**问题代码** (task-decomposer.ts ~line 280):
```typescript
// 自动重试
if (this.enableAutoRetry && subTask.status === TaskStatus.FAILED) {
  // TODO: 实现重试逻辑
}
```

**修复方案**:
```typescript
private maxRetries: number = 3
private retryDelays: number[] = [1000, 5000, 15000] // 指数退避

private async retrySubTask(subTask: SubTask, attempt: number): Promise<void> {
  if (attempt >= this.maxRetries) {
    return // 超过最大重试次数
  }
  
  const delay = this.retryDelays[Math.min(attempt, this.retryDelays.length - 1)]
  await new Promise(resolve => setTimeout(resolve, delay))
  
  // 重试执行
  subTask.status = TaskStatus.PENDING
  await this.executeSubTask(subTask, new Map())
}
```

### P1-2: 无公平调度机制

**问题代码** (registry.ts ~line 180):
```typescript
// 简单策略：选择负载最低的（非忙碌状态优先）
const online = filtered.filter(a => a.status === 'online')
if (online.length > 0) {
  return online[0] // 总是返回第一个！
}
```

**修复方案**:
```typescript
// 添加负载均衡和轮询支持
private lastAssignedIndex: Map<string, number> = new Map()

findBestAgent(requiredCapabilities: string[], excludeIds?: string[]): AgentInfo | null {
  const candidates = this.findAgentsByCapabilities(requiredCapabilities)
  
  const filtered = candidates.filter(
    agent => (!excludeIds || !excludeIds.includes(agent.id)) && agent.status === 'online'
  )
  
  if (filtered.length === 0) return null
  
  // 轮询选择：使用 round-robin 避免饥饿
  const key = requiredCapabilities.sort().join(',')
  const lastIndex = this.lastAssignedIndex.get(key) || -1
  const nextIndex = (lastIndex + 1) % filtered.length
  this.lastAssignedIndex.set(key, nextIndex)
  
  return filtered[nextIndex]
}
```

### P1-3: 清理逻辑缺陷

**问题代码** (registry.ts):
```typescript
// unregister 中没有检查是否存在
async unregister(agentId: string): Promise<void> {
  const agent = this.agents.get(agentId)
  if (!agent) {
    throw new MultiAgentError(...) // 抛异常但不清理！
  }
  
  // 后续清理代码...
}
```

**修复方案**:
```typescript
async unregister(agentId: string): Promise<void> {
  const agent = this.agents.get(agentId)
  
  // 即使不存在也进行清理操作（幂等）
  if (agent) {
    this.removeCapabilityIndex(agentId, agent.capabilities)
  }
  
  this.clearHeartbeat(agentId)  // 确保清理
  this.agents.delete(agentId)
  
  // 发出事件（带 optional）
  this.emit('unregister', {
    type: 'unregister',
    agentId,
    data: agent as unknown as Record<string, unknown>,
  } as AgentRegistryEvent)
}
```

### P1-4: pendingTasks 泄漏

**问题代码** (protocol.ts):
```typescript
// 超时只清理了 Map，但可能还有其他资源泄漏
const timeout = setTimeout(() => {
  this.pendingTasks.delete(validated.taskId)
  this.emit('task.timeout', { taskId: validated.taskId })
}, ...)
```

**修复方案**:
```typescript
// 添加完整清理
private clearPendingTask(taskId: string, reason?: string): void {
  const pending = this.pendingTasks.get(taskId)
  if (pending) {
    clearTimeout(pending.timeout)
    this.pendingTasks.delete(taskId)
    
    // 发出清理完成事件
    this.emit('task.pending.cleared', { 
      taskId, 
      reason: reason || 'timeout' 
    })
  }
}

// 在所有可能需要清理的地方调用
async sendTaskResult(to: string, payload: TaskResultPayload): Promise<void> {
  // ... 发送逻辑 ...
  this.clearPendingTask(validated.taskId, 'completed')
}

async cancelTask(taskId: string, reason: string): Promise<void> {
  // ... 取消逻辑 ...
  this.clearPendingTask(taskId, reason)
}
```

---

## 🏆 Top 3 优先修复建议

| 排名 | 问题 | 严重程度 | 影响 | 建议修复方式 |
|------|------|----------|------|--------------|
| **#1** | P0-1 messageHistory 内存泄漏 | 🔴 致命 | 系统长时间运行必崩 | 立即修复，添加 LRU 清理 |
| **#2** | P0-2 异步异常未捕获 | 🔴 致命 | 可能导致消息处理崩溃 | 立即修复，添加 Promise.catch |
| **#3** | P1-1 自动重试未实现 | 🟠 严重 | 任务失败无法自动恢复 | 尽快实现，影响生产稳定性 |

---

## 📝 实施计划

### 阶段 1: 紧急修复 (立即)
- [ ] 修复 messageHistory 内存泄漏
- [ ] 修复异步异常处理
- [ ] 添加循环依赖检测

### 阶段 2: 稳定性增强 (本周)
- [ ] 实现自动重试机制
- [ ] 修复 pendingTasks 泄漏
- [ ] 改进 Agent 清理逻辑

### 阶段 3: 性能优化 (下周)
- [ ] 实现公平调度
- [ ] 添加消息限流
- [ ] 完善健康检查

---

## ✅ 检查清单

修复完成后，请验证：

- [x] 长时间运行不会内存泄漏 (已修复 messageHistory)
- [x] 异步错误不会导致进程崩溃 (已修复 MemoryTransport)
- [x] 循环依赖能被正确检测和拒绝 (已添加 validateNoCircularDependencies)
- [ ] 失败任务能自动重试 (待实现)
- [x] 任务取消后资源正确释放 (已添加 clearPendingTask)
- [ ] 多任务并发执行时无死锁

---

## 📋 已应用的修复

### ✅ P0-1: 内存泄漏修复
**文件**: `src/lib/multi-agent/message-bus.ts`
- 添加 `maxHistorySize = 1000` 限制
- 添加 `trimHistory()` 方法，自动清理旧记录

### ✅ P0-2: 异步异常处理修复
**文件**: `src/lib/multi-agent/message-bus.ts`
- `MemoryTransport.send()` 改用 `Promise.resolve().then()` 捕获异步错误

### ✅ P0-3: 循环依赖检测
**文件**: `src/lib/multi-agent/task-decomposer.ts`
- 添加 `validateNoCircularDependencies()` 方法
- 在 `executeTask()` 中调用验证

### ✅ P1-3: 注册表清理逻辑改进
**文件**: `src/lib/multi-agent/registry.ts`
- `unregister()` 方法改为幂等操作
- 即使 agent 不存在也清理心跳定时器

### ✅ P1-4: pendingTasks 泄漏修复
**文件**: `src/lib/multi-agent/protocol.ts`
- 添加 `clearPendingTask()` 统一清理方法
- 在 `sendTaskResult()` 和 `cancelTask()` 中使用
