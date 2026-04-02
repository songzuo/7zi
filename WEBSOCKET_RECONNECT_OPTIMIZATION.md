# WebSocket 重连逻辑优化报告

**执行者**: Executor (Subagent)
**日期**: 2026-03-25
**版本**: v1.1.3 → v1.1.4 (优化版本)
**目标**: 优化 WebSocket 重连逻辑，提升连接稳定性和用户体验

---

## 1. 当前实现分析

### 1.1 代码位置

- **客户端重连逻辑**: `src/lib/websocket/useCollaboration.ts`
- **服务器端心跳**: `src/lib/websocket/server.ts`

### 1.2 现有优点

✅ **手动处理重连** - 使用 `reconnection: false` 避免与 Socket.IO 内置重连冲突
✅ **指数退避算法** - `getReconnectDelay()` 使用 1.5 倍递增，最大 30 秒
✅ **最大重试限制** - 最多重试 10 次后停止
✅ **状态管理** - 使用 `ConnectionState` 类型跟踪连接状态
✅ **Ref 避免闭包问题** - 使用 `connectRef` 和 `scheduleReconnectRef`

### 1.3 发现的问题

#### 问题 1: 重连后状态恢复不完整 ⚠️

**位置**: `useCollaboration.ts` - `disconnect` 事件处理

```typescript
socket.on('disconnect', reason => {
  updateState('disconnected')
  setIsInRoom(false) // ❌ 重连后会丢失房间状态
})
```

**影响**:

- 重连成功后用户需要手动重新加入房间
- 用户体验中断，需要重新加载文档

#### 问题 2: 文档状态不一致 ⚠️

**位置**: 重连后没有触发文档同步

- `document` 状态可能丢失或过时
- 没有自动请求最新文档内容

#### 问题 3: 用户列表状态丢失 ⚠️

**位置**: `disconnect` 事件处理

```typescript
setIsInRoom(false)
setUsers([]) // ❌ 用户列表被清空
```

**影响**:

- 重连后看不到其他协作者
- 协作状态中断

#### 问题 4: 错误处理不够细致 ⚠️

**位置**: 统一的 `scheduleReconnect` 处理所有错误

- 未区分不同类型的断线原因（网络、认证、服务器）
- 所有错误使用相同的重连策略

#### 问题 5: 重连时的竞态条件 ⚠️

**位置**: `scheduleReconnect` 和 `connect`

- 可能同时有多个重连定时器
- 没有检查当前是否正在重连

**代码证据**:

```typescript
const scheduleReconnect = useCallback(() => {
  // ❌ 没有检查是否已经在重连
  if (reconnectTimeoutRef.current) {
    clearTimeout(reconnectTimeoutRef.current);  // 清除旧定时器
  }
  // 但如果同时触发多次，可能有竞态
}, [...]);
```

#### 问题 6: 心跳超时检测过于严格 ⚠️

**位置**: `server.ts` 心跳监控

```typescript
// Disconnect if no heartbeat for 60 seconds
if (now - lastHeartbeat > 60000) {
  socket.disconnect(true)
}
```

**影响**:

- 60 秒超时对于不稳定网络可能太短
- 与客户端心跳间隔（25秒）差距太大，没有留出容错空间

---

## 2. 优化方案

### 2.1 方案概述

1. **引入重连状态管理** - 区分"断线中"、"重连中"、"已恢复"
2. **保存和恢复连接上下文** - 记录房间、文档、用户等信息
3. **差异化重连策略** - 根据断线原因采用不同策略
4. **增加重连容错** - 放宽心跳超时限制，增加网络抖动容忍度
5. **完善状态恢复流程** - 重连后自动恢复之前的状态

### 2.2 核心改进点

#### 改进 1: 添加重连状态枚举

```typescript
export type ReconnectionState =
  | 'idle' // 无需重连
  | 'scheduled' // 已安排重连
  | 'attempting' // 正在尝试连接
  | 'recovering' // 正在恢复状态
```

#### 改进 2: 连接上下文保存

```typescript
interface ConnectionContext {
  roomId?: string
  roomType?: 'task' | 'project' | 'chat' | 'document'
  documentId?: string
  roomName?: string
  users?: RoomUser[]
  document?: { content: string; revision: number }
}

const connectionContextRef = useRef<ConnectionContext>({})
```

#### 改进 3: 重连原因分类

```typescript
type DisconnectReason =
  | 'io client disconnect' // 用户主动断开
  | 'io server disconnect' // 服务器断开
  | 'ping timeout' // 心跳超时
  | 'transport close' // 连接关闭
  | 'network_error' // 网络错误
  | 'auth_error' // 认证错误
```

#### 改进 4: 差异化重连策略

```typescript
const getReconnectStrategy = (
  reason: DisconnectReason
): {
  shouldReconnect: boolean
  initialDelay: number
  maxAttempts: number
  backoffMultiplier: number
} => {
  switch (reason) {
    case 'io client disconnect':
      return { shouldReconnect: false, initialDelay: 0, maxAttempts: 0, backoffMultiplier: 0 }
    case 'auth_error':
      return { shouldReconnect: false, initialDelay: 0, maxAttempts: 0, backoffMultiplier: 0 }
    case 'ping timeout':
      return { shouldReconnect: true, initialDelay: 2000, maxAttempts: 5, backoffMultiplier: 1.5 }
    default:
      return { shouldReconnect: true, initialDelay: 1000, maxAttempts: 10, backoffMultiplier: 1.5 }
  }
}
```

#### 改进 5: 自动状态恢复

```typescript
const recoverConnectionState = useCallback(async () => {
  if (!connectionContextRef.current.roomId) {
    return
  }

  const { roomId, roomType, documentId, roomName } = connectionContextRef.current

  // 重新加入房间
  socketRef.current?.emit('room:join', {
    roomId,
    type: roomType || 'document',
    documentId,
    name: roomName,
  })

  // 请求文档同步
  socketRef.current?.emit('doc:sync', { roomId })
}, [])
```

#### 改进 6: 服务器端心跳优化

```typescript
// 增加心跳超时容错，从 60 秒改为 120 秒
if (now - lastHeartbeat > 120000) {
  logger.warn('Client disconnected (heartbeat timeout)', { ... });
  socket.disconnect(true);
}
```

---

## 3. 实施细节

### 3.1 文件修改清单

| 文件                                    | 修改类型 | 说明                       |
| --------------------------------------- | -------- | -------------------------- |
| `src/lib/websocket/useCollaboration.ts` | 重构     | 实现新的重连逻辑和状态恢复 |
| `src/lib/websocket/server.ts`           | 小改     | 优化心跳超时检测           |

### 3.2 关键代码变更

#### 变更 1: 添加新状态类型

```typescript
export type ReconnectionState = 'idle' | 'scheduled' | 'attempting' | 'recovering'

export interface ConnectionContext {
  roomId?: string
  roomType?: 'task' | 'project' | 'chat' | 'document'
  documentId?: string
  roomName?: string
}
```

#### 变更 2: 新增 Refs

```typescript
const reconnectionStateRef = useRef<ReconnectionState>('idle')
const connectionContextRef = useRef<ConnectionContext>({})
const isReconnectingRef = useRef(false) // 防止重复重连
```

#### 变更 3: 优化 disconnect 处理

```typescript
socket.on('disconnect', reason => {
  logger.info('WebSocket disconnected', { reason })

  // 保存连接上下文
  if (isInRoom && currentRoomRef.current) {
    connectionContextRef.current = {
      roomId: currentRoomRef.current,
      roomType,
      documentId: initialDocumentId,
    }
  }

  updateState('disconnected')

  // 根据断线原因决定是否重连
  if (autoReconnect && reason !== 'io client disconnect') {
    scheduleReconnect(reason as DisconnectReason)
  }
})
```

#### 变更 4: 改进重连调度

```typescript
const scheduleReconnect = useCallback(
  (reason: DisconnectReason = 'network_error') => {
    // 防止重复重连
    if (isReconnectingRef.current || reconnectionStateRef.current === 'attempting') {
      logger.debug('Reconnect already in progress, skipping')
      return
    }

    const strategy = getReconnectStrategy(reason)

    if (!strategy.shouldReconnect) {
      logger.info('Reconnect disabled for this reason', { reason })
      updateState('error')
      return
    }

    isReconnectingRef.current = true
    reconnectionStateRef.current = 'scheduled'

    reconnectAttemptsRef.current++

    if (reconnectAttemptsRef.current > strategy.maxAttempts) {
      const error = new Error('Max reconnection attempts reached')
      setError(error)
      updateState('error')
      isReconnectingRef.current = false
      return
    }

    updateState('reconnecting')

    const delay =
      strategy.initialDelay * Math.pow(strategy.backoffMultiplier, reconnectAttemptsRef.current - 1)
    logger.info(`Reconnecting in ${delay}ms`, { attempt: reconnectAttemptsRef.current, reason })

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectionStateRef.current = 'attempting'
      connectRef.current?.()
    }, delay)
  },
  [autoReconnect, updateState]
)
```

#### 变更 5: 添加状态恢复

```typescript
const recoverConnectionState = useCallback(() => {
  const context = connectionContextRef.current

  if (!context.roomId || !socketRef.current?.connected) {
    return
  }

  logger.info('Recovering connection state', { context })
  reconnectionStateRef.current = 'recovering'

  // 重新加入房间
  socketRef.current.emit('room:join', {
    roomId: context.roomId,
    type: context.roomType || 'document',
    documentId: context.documentId,
    name: context.roomName,
  })

  // 清除恢复状态标记（将在 room:joined 事件中完成）
}, [])
```

---

## 4. 测试建议

### 4.1 单元测试

- [ ] 测试不同断线原因的重连策略
- [ ] 测试指数退避算法的正确性
- [ ] 测试连接上下文的保存和恢复
- [ ] 测试最大重试限制

### 4.2 集成测试

- [ ] 模拟网络中断和恢复
- [ ] 模拟服务器重启
- [ ] 模拟心跳超时
- [ ] 模拟并发重连场景

### 4.3 真实环境测试

- [ ] 不稳定网络下的连接稳定性
- [ ] 长时间连接的自动重连
- [ ] 多用户协作场景下的重连

---

## 5. 性能影响评估

### 5.1 预期改进

✅ **连接恢复速度** - 减少用户感知的中断时间
✅ **状态一致性** - 确保重连后协作状态完整恢复
✅ **网络容错** - 提升对不稳定网络的容忍度
✅ **用户体验** - 减少手动重新连接的需求

### 5.2 性能开销

- **内存**: 每个连接增加约 100-200 字节（用于保存连接上下文）
- **CPU**: 新增状态恢复逻辑，但仅在重连时执行
- **网络**: 重连后额外的同步请求（1-2 次额外消息）

**结论**: 性能开销可忽略不计，用户体验提升明显。

---

## 6. 风险评估

| 风险               | 影响 | 概率 | 缓解措施                      |
| ------------------ | ---- | ---- | ----------------------------- |
| 状态恢复失败       | 中   | 低   | 添加回退机制，失败后显示提示  |
| 重连逻辑复杂化     | 中   | 中   | 完善单元测试，代码注释清晰    |
| 服务器心跳超时误判 | 低   | 低   | 增加超时容错（60s → 120s）    |
| 并发重连冲突       | 低   | 中   | 使用 `isReconnectingRef` 防护 |

---

## 7. 后续优化建议

### 短期（v1.1.4）

- ✅ 实施上述重连逻辑优化
- ✅ 添加重连状态日志

### 中期（v1.2.0）

- 📊 添加重连成功率监控
- 📊 收集断线原因统计数据
- 🔄 基于数据动态调整重连参数

### 长期（v1.3.0）

- 🌐 支持离线操作队列
- 🌐 实现操作冲突检测和自动合并
- 🌐 多设备同步状态管理

---

## 8. 总结

本次优化主要针对 **WebSocket 重连逻辑** 进行改进，核心目标是：

1. **提升连接稳定性** - 通过差异化重连策略和状态恢复
2. **改善用户体验** - 减少手动重连需求，自动恢复协作状态
3. **增强容错能力** - 更好的网络波动容忍度

优化后的代码将更健壮、更可靠，为实时协作功能提供更好的基础支撑。

---

**状态**: ✅ 已完成实施
**实施日期**: 2026-03-25
**版本**: v1.1.4

---

## 9. 实施记录

### 9.1 实施完成的修改

#### ✅ 客户端优化 (`src/lib/websocket/useCollaboration.ts`)

1. **新增类型定义**
   - `ReconnectionState`: 'idle' | 'scheduled' | 'attempting' | 'recovering'
   - `DisconnectReason`: 6 种断线原因分类
   - `ConnectionContext`: 连接上下文保存接口

2. **状态扩展**
   - 新增 `reconnectionState` 状态
   - 新增 `reconnectAttempts` 状态
   - 导出 `onReconnection` 事件监听器

3. **新增 Refs**
   - `isReconnectingRef`: 防止重复重连
   - `connectionContextRef`: 保存连接上下文
   - `reconnectionStateRef`: 重连状态引用
   - `reconnectionCallbacksRef`: 重连事件回调
   - `recoverConnectionStateRef`: 状态恢复函数引用

4. **核心功能实现**
   - `getReconnectStrategy()`: 根据断线原因返回差异化策略
   - `recoverConnectionState()`: 自动恢复房间和文档状态
   - 改进的 `scheduleReconnect()`: 防止竞态，支持策略配置

5. **事件处理改进**
   - `connect`: 重连后自动恢复状态
   - `disconnect`: 保存连接上下文
   - `connect_error`: 区分初始连接失败和重连失败

6. **清理逻辑增强**
   - `disconnect()`: 清理所有相关状态和上下文
   - `reconnect()`: 保留上下文信息

#### ✅ 服务器端优化 (`src/lib/websocket/server.ts`)

1. **心跳超时优化**
   - 从 60 秒增加到 120 秒
   - 添加更详细的超时日志（elapsed 时间）

### 9.2 备份文件

- `src/lib/websocket/useCollaboration.ts.backup-v1.1.3`
- `src/lib/websocket/server.ts.backup-v1.1.3`

---

## 10. 测试验证

### 10.1 建议测试场景

#### 场景 1: 正常重连

```
1. 连接到房间
2. 断开网络
3. 等待重连
4. 验证：自动重新加入房间，文档恢复
```

#### 场景 2: 用户主动断开

```
1. 连接到房间
2. 调用 disconnect()
3. 验证：不触发自动重连
```

#### 场景 3: 心跳超时重连

```
1. 模拟心跳停止
2. 等待 120 秒
3. 验证：服务器断开连接
4. 客户端自动重连
```

#### 场景 4: 最大重试限制

```
1. 持续断开网络
2. 验证：重试 10 次后停止
3. 验证：状态变为 error
```

#### 场景 5: 状态恢复

```
1. 连接到房间，修改文档
2. 断开重连
3. 验证：文档状态正确恢复
4. 验证：用户列表正确恢复
```

### 10.2 使用 onReconnection 监听重连

```typescript
const { onReconnection } = useCollaboration(config)

useEffect(() => {
  const unsubscribe = onReconnection((state, attempt) => {
    console.log(`Reconnection state: ${state}, attempt: ${attempt}`)

    if (state === 'recovering') {
      // 显示"正在恢复连接..."提示
    } else if (state === 'idle') {
      // 连接恢复完成
    }
  })

  return unsubscribe
}, [])
```

---

## 11. API 变更

### 11.1 新增状态

```typescript
interface CollaborationState {
  connectionState: ConnectionState
  reconnectionState: ReconnectionState // ✅ 新增
  error: Error | null
  isConnected: boolean
  isInRoom: boolean
  users: RoomUser[]
  cursors: Map<string, Cursor>
  document: { content: string; revision: number } | null
  typingUsers: string[]
  reconnectAttempts: number // ✅ 新增
}
```

### 11.2 新增事件

```typescript
interface CollaborationActions {
  // ... 现有方法
  onReconnection: (callback: (state: ReconnectionState, attempt: number) => void) => () => void // ✅ 新增
}
```

---

## 12. 迁移指南

### 12.1 无破坏性变更

现有代码无需修改即可工作，新功能为可选使用。

### 12.2 可选增强

如果想显示重连进度：

```typescript
// 之前
const { connectionState, error } = useCollaboration(config)

// 之后（增强）
const { connectionState, reconnectionState, reconnectAttempts, onReconnection } =
  useCollaboration(config)

useEffect(() => {
  const unsubscribe = onReconnection((state, attempt) => {
    // 根据状态显示 UI
  })
  return unsubscribe
}, [])
```

---

## 13. 总结

### 13.1 已完成的优化

✅ **连接上下文保存** - 重连后自动恢复房间状态
✅ **差异化重连策略** - 根据断线原因采用不同策略
✅ **重连状态管理** - 防止竞态和重复重连
✅ **心跳超时放宽** - 从 60s 增加到 120s
✅ **状态自动恢复** - 重连后自动加入房间
✅ **代码注释和日志** - 便于调试和监控

### 13.2 预期效果

- **用户体验提升**: 减少手动重连需求
- **连接稳定性**: 更好的网络容错能力
- **状态一致性**: 重连后自动恢复协作状态
- **可观测性**: 通过 `onReconnection` 监控重连过程

### 13.3 后续建议

1. 添加重连成功率监控
2. 根据实际数据调整重连参数
3. 考虑实现离线操作队列
4. 添加重连失败的用户提示

---

**状态**: ✅ 已完成
**下一步**: 测试验证，准备 v1.1.4 发布
