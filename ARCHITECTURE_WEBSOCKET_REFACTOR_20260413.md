# WebSocket Manager 重构计划

> **文档信息**
> - 架构师: 🏗️ 架构师
> - 日期: 2026-04-13
> - 状态: 规划阶段（仅分析，不修改代码）
> - 文件: `7zi-frontend/src/lib/websocket-manager.ts` (1473 行)

---

## 一、现状分析

### 1.1 文件规模

| 文件 | 行数 | 职责 |
|------|------|------|
| `websocket-manager.ts` | **1473** | 核心连接管理（含心跳/重连/队列/质量监控/状态持久化） |
| `websocket-compression.ts` | 412 | 消息压缩（已独立） |
| `websocket-instance-manager.ts` | 345 | 实例管理 |
| `CollabClient.ts` | 819 | 协作客户端 |

### 1.2 websocket-manager.ts 函数列表（按职责分组）

#### 🔴 超过 200 行的函数
**无** — 当前文件没有单个函数超过 200 行，但整体文件过大（1473 行），职责过于集中。

#### 📊 按职责分类的所有方法

| 方法名 | 行数范围 | 职责 |
|--------|----------|------|
| **构造函数 + 连接** | | |
| `constructor` | ~280 | 初始化、加载持久化、启动质量监控 |
| `connect` | ~295 | 建立连接、动态导入 socket.io |
| `disconnect` | ~325 | 断开连接、清理定时器、持久化状态 |
| **消息发送** | | |
| `emit` | ~350 | 发送消息（含压缩） |
| `emitRaw` | ~365 | 发送未压缩消息 |
| `on` / `off` | ~385 | 订阅/取消订阅消息事件 |
| `onStateChange` / `offStateChange` | ~395 | 订阅/取消订阅状态变更 |
| **查询** | | |
| `getState` | ~405 | 获取连接状态 |
| `isConnected` | ~410 | 检查是否已连接 |
| `getQueueSize` | ~415 | 获取队列大小 |
| `clearQueue` | ~422 | 清空队列 |
| `getStats` | ~430 | 获取统计信息 |
| `getCompressionStats` | ~437 | 获取压缩统计 |
| `getReconnectionHistory` | ~445 | 获取重连历史 |
| `getPersistedState` | ~457 | 获取持久化状态 |
| `getSessionId` | ~505 | 获取会话 ID |
| **告警与健康检查** | | |
| `registerQualityAlert` | ~463 | 注册质量告警 |
| `unregisterQualityAlert` | ~472 | 取消质量告警 |
| `healthCheck` | ~480 | 健康检查 |
| `resetStats` | ~528 | 重置统计 |
| **Socket 事件处理** | | |
| `setupSocketListeners` | ~695 | 设置 Socket.io 事件监听 |
| `startHeartbeat` | ~831 | 启动心跳 |
| `stopHeartbeat` | ~875 | 停止心跳 |
| `scheduleReconnection` | ~891 | 调度重连（指数退避+抖动） |
| **队列管理** | | |
| `queueMessage` | ~964 | 消息入队 |
| `sendQueuedMessages` | ~990 | 发送队列消息 |
| `cleanExpiredMessages` | ~1020 | 清理过期消息 |
| **状态管理** | | |
| `setState` | ~1036 | 设置连接状态 |
| `notifyMessageListeners` | ~1060 | 通知消息监听器 |
| **网络监听** | | |
| `setupNetworkListeners` | ~1079 | 监听在线/离线事件 |
| `removeNetworkListeners` | ~1101 | 移除网络监听 |
| `fastReconnect` | ~1116 | 快速重连 |
| **连接质量** | | |
| `calculateConnectionQuality` | ~1127 | 计算连接质量评分 |
| `getReconnectStrategy` | ~1201 | 根据断开原因获取重连策略 |
| **质量监控** | | |
| `startQualityMonitoring` | ~1256 | 启动质量监控定时器 |
| `stopQualityMonitoring` | ~1269 | 停止质量监控 |
| `checkConnectionQuality` | ~1280 | 检查连接质量 |
| `checkAlert` | ~1311 | 检查并触发告警 |
| **持久化** | | |
| `recordReconnection` | ~1378 | 记录重连事件 |
| `persistState` | ~1407 | 持久化状态到 localStorage |
| `loadPersistedState` | ~1437 | 从 localStorage 加载状态 |

### 1.3 主要问题

1. **文件过大** — 1473 行，单一文件承担过多职责
2. **耦合度过高** — 心跳、重连、队列、质量监控、持久化全部耦合在一个类
3. **可测试性差** — 难以对单个功能模块独立测试
4. **可维护性差** — 新增功能只能往里堆，难以定位问题
5. **接口臃肿** — 暴露了大量内部方法给外部（通过 `getReconnectionHistory`、`registerQualityAlert` 等）

---

## 二、拆分方案

### 2.1 推荐模块划分

```
src/lib/websocket/
├── types.ts                    # 所有类型定义（独立，无依赖）
├── config.ts                   # 默认配置和配置合并逻辑
├── heartbeat.ts                # 心跳机制（HeartbeatManager）
├── reconnection.ts             # 重连策略（ReconnectionManager）
├── message-queue.ts            # 消息队列（MessageQueue）
├── connection-quality.ts       # 连接质量计算（ConnectionQualityMonitor）
├── state-persistence.ts        # 状态持久化（StatePersistenceManager）
├── network-status.ts           # 网络状态监听（NetworkStatusListener）
├── socket-adapter.ts           # Socket.io 适配层（SocketAdapter）
├── websocket-manager.ts        # 主入口类（Facade 模式）
└── index.ts                    # 统一导出
```

### 2.2 各模块职责

| 模块 | 职责 | 对外接口 |
|------|------|----------|
| `types.ts` | 所有接口/类型定义 | `ConnectionState`, `ConnectionStats`, `QueuedMessage`, `ConnectionQuality`, `PersistedConnectionState`, `QualityAlertConfig`, `HealthCheckResult` 等 |
| `config.ts` | 默认配置、类型安全的配置合并 | `WebSocketManagerOptions`, `DEFAULT_OPTIONS`, `mergeConfig()` |
| `heartbeat.ts` | 心跳 ping/pong 管理 | `start()`, `stop()`, `isRunning()`, `onHeartbeat()`, `onMissed()` |
| `reconnection.ts` | 指数退避算法、重连调度 | `schedule()`, `cancel()`, `getAttempts()`, `getStrategy()` |
| `message-queue.ts` | 消息队列、FIFO、过期清理 | `enqueue()`, `dequeueAll()`, `cleanExpired()`, `size()`, `clear()` |
| `connection-quality.ts` | 质量评分算法、告警触发 | `calculate()`, `startMonitoring()`, `stopMonitoring()`, `registerAlert()` |
| `state-persistence.ts` | localStorage 读写、会话恢复 | `save()`, `load()`, `clear()`, `getSessionId()` |
| `network-status.ts` | 浏览器 online/offline 事件监听 | `setup()`, `teardown()`, `isOnline()`, `onStatusChange()` |
| `socket-adapter.ts` | Socket.io 封装、统一事件格式 | `connect()`, `disconnect()`, `emit()`, `on()`, `off()` |
| `websocket-manager.ts` | Facade，组装各模块，对外提供统一 API | `connect()`, `disconnect()`, `emit()`, `on()`, `getState()`, `getStats()`, `healthCheck()` |

### 2.3 拆分顺序（依赖关系）

```
Step 1: types.ts + config.ts
        ↓ （无依赖，最安全）

Step 2: message-queue.ts
        ↓ （不依赖任何其他模块）

Step 3: heartbeat.ts
        ↓ （不依赖其他新模块）

Step 4: reconnection.ts
        ↓ （不依赖其他新模块）

Step 5: socket-adapter.ts
        ↓ （封装层，最底层）

Step 6: network-status.ts
        ↓ （独立模块）

Step 7: connection-quality.ts
        ↓ （不依赖其他新模块）

Step 8: state-persistence.ts
        ↓ （不依赖其他新模块）

Step 9: websocket-manager.ts（重构主文件）
        - 用以上 8 个模块替换对应的内联实现

Step 10: index.ts + 更新所有 import 路径
```

**关键原则**: 先拆依赖少/风险低的，最后重构主文件。

---

## 三、重构风险评估

### 3.1 风险等级

| 风险项 | 等级 | 说明 |
|--------|------|------|
| 外部调用方多（11+ 文件依赖） | 🔴 高 | 任何接口变更都影响下游，需严格保持向后兼容 |
| 状态管理复杂（多个定时器、事件监听） | 🔴 高 | 重构中易出现定时器未清理、状态不一致 |
| socket.io 动态导入 | 🟡 中 | socket-adapter 需正确处理异步初始化 |
| 质量监控定时器 | 🟡 中 | startQualityMonitoring / stopQualityMonitoring 需精确配对 |
| localStorage 持久化 | 🟢 低 | 独立模块后不影响业务逻辑 |
| 消息压缩耦合 | 🟢 低 | compression 已独立，只需保持接口兼容 |

### 3.2 向后兼容策略

**必须保持不变的对外 API**:
- `WebSocketManager` 类构造函数签名
- `connect()`, `disconnect()`, `emit()`, `on()`, `off()`, `getState()`, `isConnected()`
- `getStats()`, `getQueueSize()`, `clearQueue()`
- `ConnectionState` 枚举值
- 所有已存在的 `ConnectionStats` 字段

**新增 API 可调整**:
- 内部方法全部私有化
- 模块间接口可在拆分中优化

---

## 四、测试策略

### 4.1 测试覆盖目标

| 模块 | 单元测试覆盖目标 | 集成测试 |
|------|-----------------|----------|
| `message-queue.ts` | 入队/出队/FIFO/过期/LIFO | ✅ |
| `heartbeat.ts` | 启动/停止/pong超时/连续失败 | ✅ |
| `reconnection.ts` | 指数退避/抖动/最大次数 | ✅ |
| `connection-quality.ts` | 评分算法/告警触发/冷却 | ✅ |
| `state-persistence.ts` | 保存/加载/会话恢复 | ✅ |
| `socket-adapter.ts` | connect/disconnect/emits | ✅ |
| `network-status.ts` | online/offline 事件 | ✅ |
| `websocket-manager.ts` | 全流程串联测试 | ✅✅ |

### 4.2 推荐测试顺序

1. **先写 `message-queue` 单元测试** — 最独立，无外部依赖
2. **再写各模块单元测试** — mock 掉其他模块
3. **最后写 `websocket-manager` 集成测试** — 确保所有模块正确协作
4. **现有测试全部通过** — 回归测试不可跳过

### 4.3 Mock 策略

```typescript
// 单元测试 mock 层次
vi.mock('socket.io-client', ...)
vi.mock('@/lib/websocket/heartbeat', ...)
vi.mock('@/lib/websocket/reconnection', ...)
vi.mock('@/lib/websocket/message-queue', ...)

// 集成测试只 mock 外部依赖
vi.mock('socket.io-client', ...)  // 保留
vi.mock('@/lib/logger', ...)
vi.mock('@/lib/monitoring', ...)
```

---

## 五、实施计划

### 5.1 工时估算

| 步骤 | 任务 | 预估工时 |
|------|------|----------|
| 1 | 创建 `src/lib/websocket/` 目录，拆出 `types.ts` + `config.ts` | 1h |
| 2 | 拆出 `message-queue.ts` + 单元测试 | 2h |
| 3 | 拆出 `heartbeat.ts` + 单元测试 | 2h |
| 4 | 拆出 `reconnection.ts` + 单元测试 | 2h |
| 5 | 拆出 `socket-adapter.ts` + 单元测试 | 3h |
| 6 | 拆出 `network-status.ts` + 单元测试 | 1.5h |
| 7 | 拆出 `connection-quality.ts` + 单元测试 | 2h |
| 8 | 拆出 `state-persistence.ts` + 单元测试 | 1.5h |
| 9 | 重构 `websocket-manager.ts` 使用各模块 | 3h |
| 10 | 创建 `index.ts`，更新所有 import 路径 | 1h |
| 11 | 全量回归测试 + E2E 测试 | 4h |
| **合计** | | **~23h** |

### 5.2 注意事项

1. **每次拆分后运行测试** — 不要等到最后一次性重构
2. **保持 Git 提交最小化** — 每个模块单独 commit，方便回滚
3. **TypeScript strict 模式** — 拆分时开启严格类型检查，防止隐式 any
4. **日志保持** — 拆分后的日志前缀格式保持一致，便于调试
5. **Tree-shaking 友好** — 使用具名导出，方便打包工具优化

---

## 六、当前文件 vs 建议结构的对比

### 当前问题
```
websocket-manager.ts (1473行)
├── 连接管理 (connect/disconnect)
├── 心跳管理 (startHeartbeat/stopHeartbeat)
├── 重连管理 (scheduleReconnection)
├── 消息队列 (queueMessage/sendQueuedMessages)
├── 质量监控 (calculateConnectionQuality/checkConnectionQuality)
├── 告警管理 (registerQualityAlert/checkAlert)
├── 状态持久化 (persistState/loadPersistedState)
├── 网络监听 (setupNetworkListeners)
├── Socket.io 事件处理 (setupSocketListeners)
└── 压缩 (已独立到 websocket-compression.ts)
```

### 建议结构
```
src/lib/websocket/
├── types.ts              # 类型定义（从 manager 中提取）
├── config.ts             # 配置（DEFAULT_OPTIONS 等）
├── heartbeat.ts          # 心跳 → 独立类
├── reconnection.ts       # 重连 → 独立类
├── message-queue.ts      # 队列 → 独立类
├── connection-quality.ts  # 质量监控 → 独立类
├── state-persistence.ts  # 持久化 → 独立类
├── network-status.ts     # 网络监听 → 独立类
├── socket-adapter.ts      # Socket 适配 → 独立类
├── websocket-manager.ts   # Facade（大幅精简）
└── index.ts              # 统一导出
```

---

## 七、后续优化建议（重构完成后）

1. **事件总线分离** — 将 `stateListeners` / `messageListeners` 从 Manager 中提取为独立 EventBus
2. **插件化架构** — 支持注册插件（如监控插件、调试插件）扩展功能
3. **Web Worker 支持** — 将重连逻辑移入 Worker，避免主线程阻塞
4. **多连接支持** — 当前只支持单连接，可扩展为连接池
5. **指标导出** — 对接 Prometheus / OpenTelemetry 标准指标格式

---

*本计划仅供分析参考，不涉及代码修改*
