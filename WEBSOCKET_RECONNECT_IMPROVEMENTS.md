# WebSocket 重连机制改进建议

**文档类型**: 最佳实践研究 + 改进建议
**项目**: 7zi-frontend
**日期**: 2026-03-28
**作者**: 咨询师 (Research Agent)

---

## 1. 现有实现分析

### 1.1 当前架构

项目中有两套 WebSocket 实现:

| 位置                                              | 用途                        | 成熟度          |
| ------------------------------------------------- | --------------------------- | --------------- |
| `src/lib/websocket-manager.ts`                    | 通用通知/消息               | ⭐⭐⭐⭐ 完善   |
| `src/features/websocket/lib/websocket-manager.ts` | 协作功能 (useCollaboration) | ⭐⭐⭐ 有待优化 |

### 1.2 现有优点 ✅

```
✅ 心跳检测: 25s 间隔 / 10s 超时 / 3次失败阈值
✅ 指数退避: 1s → 30s, 2倍递增
✅ 消息队列: 100条上限 / 5分钟过期
✅ 状态机: 5种连接状态 + 监听器
✅ 手动重连控制: reconnection: false 避免冲突
✅ 连接统计: ping延迟追踪、平均延迟
```

### 1.3 发现的问题 ⚠️

#### 问题 1: 缺少 Jitter (抖动) ⚠️ 中等

**现象**: 所有客户端在断线后同时以相同延迟重连 → "惊群效应"

```
当前算法:
Client A: 1s → 2s → 4s → 8s...
Client B: 1s → 2s → 4s → 8s...
Client C: 1s → 2s → 4s → 8s...  ← 同时到达

业界最佳: 添加随机 jitter 分散请求
```

#### 问题 2: 断线原因未区分 ⚠️ 中等

**现象**: 所有错误类型使用相同重连策略

```typescript
// 当前: 统一处理
this.scheduleReconnection(); // 所有错误一样

// 应该: 根据原因差异化
- 'io client disconnect' → 不重连 (用户主动断开)
- 'ping timeout'         → 快速重连 (2s初始)
- 'transport close'      → 标准重连 (1s初始)
- 'network_error'        → 标准重连
- 'auth_error'           → 不重连 + 提示重新登录
```

#### 问题 3: 服务器心跳超时过严 ⚠️ 低

**现象**: 服务器 60s 超时 vs 客户端 25s\*3=75s 最大检测时间

```
Socket.IO 配置:
pingTimeout: 60000 (60s)     ← 服务器等待
pingInterval: 25000 (25s)    ← 服务器发送频率

客户端实际检测: 25s * 3 = 75s 才触发断开

问题: 服务器 60s 就断开，客户端 75s 才检测到
建议: pingTimeout 至少 120s
```

#### 问题 4: 重连后状态恢复不完整 ⚠️ 高

**现象**: useCollaboration.ts 重连后丢失房间/文档状态

```typescript
// 当前 disconnect 处理
socket.on('disconnect', () => {
  setIsInRoom(false) // ❌ 重连后需要手动重新加入
  setUsers([]) // ❌ 用户列表丢失
})
```

#### 问题 5: 缺少"快速重连"机制 ⚠️ 低

**现象**: 浏览器断网恢复后，页面不会立即重连

```typescript
// 浏览器恢复网络时，没有监听
window.addEventListener('online', () => {
  // 立即尝试重连，而不是等待下次调度
})
```

#### 问题 6: 重连成功/失败无回调 ⚠️ 低

**现象**: 上层组件无法感知重连完成

```typescript
// 缺少这样的 API:
wsManager.onReconnect((attempt, duration) => {
  toast.success(`已恢复连接 (尝试${attempt}次)`)
})

wsManager.onReconnectFailed((attempts, error) => {
  toast.error('连接失败，请检查网络')
})
```

---

## 2. 业界最佳实践研究

### 2.1 Exponential Backoff + Jitter

**推荐算法** (AWS/Cloudflare 采用):

```typescript
// 完整公式
const baseDelay = 1000;      // 1秒
const maxDelay = 30000;       // 30秒
const jitterFactor = 0.5;     // 50% 抖动

function getBackoffWithJitter(attempt: number): number {
  const exponential = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * exponential * jitterFactor;
  return Math.min(exponential + jitter, maxDelay);
}

// 效果
Attempt 1: 1000 + [0-500]   = 1000~1500ms
Attempt 2: 2000 + [0-1000]  = 2000~3000ms
Attempt 3: 4000 + [0-2000]  = 4000~6000ms
```

**好处**: 避免多客户端同时重连造成服务器压力

### 2.2 断线原因分类与策略

```typescript
const RECONNECT_STRATEGIES = {
  'io client disconnect': {
    shouldReconnect: false,
    reason: '用户主动断开',
  },
  'io server disconnect': {
    shouldReconnect: true,
    initialDelay: 1000,
    maxAttempts: 10,
    strategy: 'normal',
  },
  'ping timeout': {
    shouldReconnect: true,
    initialDelay: 500, // 快速重连
    maxAttempts: 5,
    strategy: 'aggressive',
  },
  'transport close': {
    shouldReconnect: true,
    initialDelay: 1000,
    maxAttempts: 10,
    strategy: 'normal',
  },
  'transport error': {
    shouldReconnect: true,
    initialDelay: 2000, // 稍等一下
    maxAttempts: 8,
    strategy: 'conservative',
  },
}
```

### 2.3 心跳优化策略

```
当前问题:
- 固定间隔 25s 可能不够灵活
- 网络波动时容易误判

改进方案:
1. 自适应心跳: 根据延迟动态调整间隔
2. 移动平均: 用最近N次延迟计算"健康度"
3. 差分检测: 延迟突然增大时提前警告
```

```typescript
interface HeartbeatConfig {
  interval: number // 当前: 固定 25000ms
  timeout: number // 当前: 固定 10000ms
  maxMissed: number // 当前: 固定 3次
  adaptiveInterval: boolean // 新增: 自适应开关
  latencyThreshold: number // 新增: 延迟阈值 (ms)
}

// 自适应算法示例
function calculateNextPingInterval(avgLatency: number): number {
  const base = 25000
  const safetyMargin = 5000
  const calculated = Math.max(avgLatency * 10, base)
  return Math.min(calculated + safetyMargin, 60000) // 最多60s
}
```

### 2.4 连接健康度评分

```typescript
interface ConnectionHealth {
  score: number // 0-100
  latency: number // 当前延迟
  avgLatency: number // 平均延迟
  missedHeartbeats: number // 连续丢失
  lastConnectedAt: number // 上次连接时间
  reconnectionCount: number // 今日重连次数
}

// 健康度计算
function calculateHealth(stats): ConnectionHealth {
  let score = 100

  // 延迟扣分 (每 100ms -5分)
  score -= Math.min(Math.floor(stats.avgLatency / 100) * 5, 30)

  // 丢失心跳扣分 (每次 -10分)
  score -= stats.missedHeartbeats * 10

  // 频繁重连扣分 (每天 >10次 -20分)
  if (stats.reconnectionCount > 10) score -= 20

  return { ...stats, score: Math.max(0, score) }
}
```

### 2.5 快速重连触发器

```typescript
// 网络状态变化监听
window.addEventListener('online', () => {
  logger.log('[WebSocket] Network online, attempting fast reconnect')
  // 立即重连，不等待调度器
  if (this.state !== ConnectionState.CONNECTED) {
    this.immediateReconnect?.()
  }
})

window.addEventListener('offline', () => {
  logger.log('[WebSocket] Network offline')
  // 标记状态，但不立即断开 (让心跳处理)
})

// 可选: visibilitychange (标签页切换回来时)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // 用户切回来，检查连接
    if (!this.isConnected()) {
      this.immediateReconnect?.()
    }
  }
})
```

### 2.6 优雅关闭机制

```typescript
async gracefulShutdown(): Promise<void> {
  logger.log('[WebSocket] Graceful shutdown initiated');

  // 1. 停止新的消息发送
  this._acceptingMessages = false;

  // 2. 等待队列清空 (最多5秒)
  const startTime = Date.now();
  while (this.queue.length > 0 && Date.now() - startTime < 5000) {
    await this.sleep(100);
  }

  // 3. 发送关闭信号
  this.socket?.emit('client:closing', { timestamp: Date.now() });

  // 4. 等待服务器确认 (最多2秒)
  await this.waitForAck('server:ack:closing', 2000);

  // 5. 真正断开
  this.disconnect();

  logger.log('[WebSocket] Graceful shutdown completed');
}
```

---

## 3. 改进建议优先级

### 🔴 P0 - 必须修复 (影响核心功能)

#### P0.1: 重连后状态恢复

**问题**: useCollaboration.ts 重连后丢失房间状态

**建议代码**:

```typescript
// 新增连接上下文保存
interface ConnectionContext {
  roomId?: string;
  roomType?: 'task' | 'project' | 'chat' | 'document';
  documentId?: string;
  lastEventId?: string;    // 断线前的最后事件ID
}

private connectionContext: ConnectionContext = {};

// disconnect 时保存
socket.on('disconnect', () => {
  if (this.isInRoom) {
    this.connectionContext = {
      roomId: this.currentRoomId,
      roomType: this.roomType,
      documentId: this.documentId,
    };
  }
});

// connect 时恢复
socket.on('connect', () => {
  if (this.connectionContext.roomId) {
    logger.log('[WS] Recovering room state:', this.connectionContext);
    socket.emit('room:rejoin', this.connectionContext);
  }
});
```

#### P0.2: 服务器心跳超时调整

**问题**: pingTimeout 60s 与客户端检测不匹配

**建议修改** (`src/lib/services/notification.ts`):

```typescript
const io = new SocketIOServer(httpServer, {
  // ... 其他配置
  pingTimeout: 120000, // 120秒 (原来是 60000)
  pingInterval: 25000, // 保持 25秒
})
```

---

### 🟡 P1 - 重要改进 (提升稳定性)

#### P1.1: 添加 Jitter

**文件**: `src/lib/websocket-manager.ts`

```typescript
// scheduleReconnection() 方法修改

private scheduleReconnection(): void {
  // ... 现有检查 ...

  const baseDelay = this.options.reconnectionDelay * Math.pow(2, this.reconnectionAttempts - 1);
  const jitter = Math.random() * baseDelay * 0.5; // 0-50% 抖动
  const delay = Math.min(baseDelay + jitter, this.options.reconnectionDelayMax);

  // 日志显示实际延迟 (含抖动)
  logger.log(
    `[WebSocketManager] Reconnecting in ${Math.round(delay)}ms (base: ${baseDelay}ms, jitter: +${Math.round(jitter)}ms)`
  );

  this.reconnectionTimer = setTimeout(() => this.connect(), delay);
}
```

#### P1.2: 断线原因分类

**新增方法**:

```typescript
type DisconnectReason =
  | 'io client disconnect'
  | 'io server disconnect'
  | 'ping timeout'
  | 'transport close'
  | 'transport error'
  | 'forced close';

private getReconnectStrategy(reason: string): {
  shouldReconnect: boolean;
  initialDelay: number;
  maxAttempts: number;
  skipBackoff: boolean;
} {
  const strategies: Record<string, ReturnType<typeof this.getReconnectStrategy>> = {
    'io client disconnect': {
      shouldReconnect: false,
      initialDelay: 0,
      maxAttempts: 0,
      skipBackoff: false
    },
    'ping timeout': {
      shouldReconnect: true,
      initialDelay: 500,   // 快速重连
      maxAttempts: 5,
      skipBackoff: false
    },
    'transport error': {
      shouldReconnect: true,
      initialDelay: 2000,  // 稍等
      maxAttempts: 8,
      skipBackoff: false
    },
    // 默认策略
    default: {
      shouldReconnect: true,
      initialDelay: this.options.reconnectionDelay,
      maxAttempts: this.options.reconnectionAttempts,
      skipBackoff: false
    }
  };

  return strategies[reason] || strategies.default;
}
```

#### P1.3: 添加在线/离线监听

```typescript
// 在构造函数或 init() 中添加
private setupNetworkListeners(): void {
  this._onlineHandler = () => {
    logger.log('[WebSocketManager] Network online');
    if (this.state !== ConnectionState.CONNECTED) {
      // 立即尝试快速重连
      this.fastReconnect?.();
    }
  };

  this._offlineHandler = () => {
    logger.log('[WebSocketManager] Network offline');
    this._wasConnected = this.state === ConnectionState.CONNECTED;
  };

  window.addEventListener('online', this._onlineHandler);
  window.addEventListener('offline', this._offlineHandler);
}

private removeNetworkListeners(): void {
  window.removeEventListener('online', this._onlineHandler);
  window.removeEventListener('offline', this._offlineHandler);
}

private fastReconnect(): void {
  // 使用较小延迟立即重连
  this.reconnectionAttempts = 0;
  this.connect();
}
```

---

### 🟢 P2 - 增强功能 (提升体验)

#### P2.1: 重连事件回调

```typescript
// 新增类型
type ReconnectListener = (event: {
  type: 'attempt' | 'success' | 'failed' | 'max-attempts';
  attempt: number;
  delay?: number;
  duration?: number;
  error?: Error;
}) => void;

// 新增方法
private reconnectListeners: Set<ReconnectListener> = [];

onReconnect(listener: ReconnectListener): () => void {
  this.reconnectListeners.add(listener);
  return () => this.reconnectListeners.delete(listener);
}

private notifyReconnectListeners(event: Parameters<ReconnectListener>[0]): void {
  this.reconnectListeners.forEach(listener => {
    try {
      listener(event);
    } catch (e) {
      logger.error('[WebSocketManager] Reconnect listener error:', e);
    }
  });
}

// 使用示例
wsManager.onReconnect(({ type, attempt, duration }) => {
  if (type === 'success') {
    analytics.track('websocket_reconnect_success', { attempt, duration });
  }
});
```

#### P2.2: 连接健康度 API

```typescript
interface HealthReport {
  score: number;            // 0-100
  status: 'excellent' | 'good' | 'degraded' | 'poor';
  latency: number;
  avgLatency: number;
  uptime: number;           // 连续连接时间 (ms)
  reconnections: number;   // 今日重连次数
  lastHeartbeat: number;    // 上次心跳时间
}

getHealth(): HealthReport {
  const uptime = this.state === ConnectionState.CONNECTED
    ? Date.now() - this._connectedAt
    : 0;

  let score = 100;
  if (this.stats.averagePingLatency > 500) score -= 20;
  if (this.stats.averagePingLatency > 1000) score -= 30;
  if (this.missedHeartbeats > 0) score -= this.missedHeartbeats * 15;

  return {
    score: Math.max(0, score),
    status: score > 80 ? 'excellent' : score > 60 ? 'good' : score > 30 ? 'degraded' : 'poor',
    latency: this.stats.currentPingLatency,
    avgLatency: this.stats.averagePingLatency,
    uptime,
    reconnections: this.stats.totalReconnections,
    lastHeartbeat: this.lastPongTime
  };
}
```

#### P2.3: 优雅关闭

```typescript
async shutdown(timeoutMs = 5000): Promise<void> {
  logger.log('[WebSocketManager] Shutdown initiated');

  // 1. 停止接受新消息
  this._acceptingMessages = false;

  // 2. 清空队列中的消息 (可选: 改为持久化)
  this.queue = [];

  // 3. 停止所有定时器
  this.stopHeartbeat();

  if (this.reconnectionTimer) {
    clearTimeout(this.reconnectionTimer);
    this.reconnectionTimer = null;
  }

  // 4. 断开连接
  if (this.socket) {
    this.socket.disconnect();
    this.socket = null;
  }

  // 5. 清理监听器
  this.stateListeners.clear();
  this.messageListeners.clear();

  this.setState(ConnectionState.DISCONNECTED);
  logger.log('[WebSocketManager] Shutdown completed');
}
```

---

## 4. 实施计划

### Phase 1: 紧急修复 (1-2天)

| 任务                               | 优先级 | 工作量 |
| ---------------------------------- | ------ | ------ |
| 修复 useCollaboration 重连状态恢复 | P0     | 2小时  |
| 调整服务器心跳超时 60s→120s        | P0     | 15分钟 |
| 添加断线原因判断 (避免重复断开)    | P0     | 1小时  |

### Phase 2: 稳定性提升 (3-5天)

| 任务                   | 优先级 | 工作量 |
| ---------------------- | ------ | ------ |
| 添加 Jitter 到退避算法 | P1     | 1小时  |
| 实现断线原因分类策略   | P1     | 2小时  |
| 添加在线/离线事件监听  | P1     | 1小时  |
| 完善单元测试           | P1     | 3小时  |

### Phase 3: 体验优化 (1周+)

| 任务             | 优先级 | 工作量 |
| ---------------- | ------ | ------ |
| 重连事件回调 API | P2     | 2小时  |
| 连接健康度评分   | P2     | 3小时  |
| 优雅关闭机制     | P2     | 2小时  |
| 监控面板集成     | P2     | 5小时  |

---

## 5. 测试验证清单

### 5.1 重连场景测试

```typescript
describe('WebSocket Reconnection', () => {
  it('should reconnect with jitter (not all clients same delay)', async () => {
    // 模拟 100 个客户端同时断线
    const delays = clients.map(c => c.getNextDelay())

    // 验证: 延迟不是完全相同 (标准差 > 0)
    const stdDev = calculateStdDev(delays)
    expect(stdDev).toBeGreaterThan(0)
  })

  it('should not reconnect on io client disconnect', async () => {
    // 用户主动断开，不应该自动重连
    ws.disconnect()
    expect(ws.getState()).toBe(ConnectionState.DISCONNECTED)
    expect(ws.getReconnectAttempts()).toBe(0)
  })

  it('should reconnect quickly on ping timeout', async () => {
    // 心跳超时应该使用较短延迟
    const strategy = ws.getReconnectStrategy('ping timeout')
    expect(strategy.initialDelay).toBeLessThan(1000)
  })
})
```

### 5.2 网络状态测试

```typescript
it('should fast reconnect when network comes back', async () => {
  // 1. 断开网络
  simulator.disconnectNetwork()

  // 2. 模拟恢复
  simulator.connectNetwork()

  // 3. 触发 online 事件
  window.dispatchEvent(new Event('online'))

  // 4. 验证立即重连
  await waitFor(() => ws.getState() === ConnectionState.CONNECTED)
})
```

---

## 6. 参考资料

### 6.1 行业标准

- **AWS Exponential Backoff**: https://aws.amazon.com/cn/blogs/architecture/exponential-backoff-and-jitter/
- **Socket.IO Reconnection**: https://socket.io/docs/v4/handling-connection-errors/
- **WebSocket Best Practices**: https://docs.ably.iobest-practices/websocket/

### 6.2 关键配置对比

| 参数                   | 当前值  | 推荐值   | 原因      |
| ---------------------- | ------- | -------- | --------- |
| `reconnectionDelay`    | 1000ms  | 1000ms   | ✅ 合适   |
| `reconnectionDelayMax` | 30000ms | 30000ms  | ✅ 合适   |
| `heartbeatInterval`    | 25000ms | 25000ms  | ✅ 合适   |
| `heartbeatTimeout`     | 10000ms | 10000ms  | ✅ 合适   |
| `server pingTimeout`   | 60000ms | 120000ms | ⚠️ 需修改 |
| `jitter`               | 无      | 50%      | ⚠️ 需添加 |
| `strategy`             | 统一    | 分类     | ⚠️ 需优化 |

---

## 7. 总结

### 当前状态评估

| 维度     | 评分       | 说明                            |
| -------- | ---------- | ------------------------------- |
| 基础功能 | ⭐⭐⭐⭐⭐ | 心跳、退避、队列已完善          |
| 重连策略 | ⭐⭐⭐     | 缺少分类和抖动                  |
| 状态恢复 | ⭐⭐       | useCollaboration 重连后状态丢失 |
| 可观测性 | ⭐⭐⭐⭐   | 有统计和日志                    |
| 优雅性   | ⭐⭐⭐     | 有基本错误处理                  |

### 核心建议

1. **立即修复**: useCollaboration 的状态恢复 + 服务器心跳超时
2. **短期改进**: 添加 Jitter + 断线原因分类
3. **长期优化**: 健康度评分 + 监控面板

### 预期效果

- 减少惊群效应: 客户端重连分散 30-50%
- 提升用户体验: 重连后自动恢复房间状态
- 降低服务器压力: 更智能的重连策略
- 提高可维护性: 完善的事件回调和日志

---

**文档状态**: 草稿
**下一步**: 评审后进入 Phase 1 实施
