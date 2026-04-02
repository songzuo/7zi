# WebSocket 监控功能文档

**版本**: v1.8.0  
**最后更新**: 2026-04-02  
**模块**: `src/lib/monitoring/websocket-monitor.ts`

---

## 📖 功能介绍

WebSocket Monitor 是一个专门用于监控 Socket.IO 连接性能的工具，提供实时延迟追踪、连接状态监控和性能指标上报功能。

### 核心功能

- **实时延迟监控** - 自动 Ping-Pong 测试，追踪连接延迟
- **连接状态追踪** - 监控连接、断开、重连等事件
- **性能指标上报** - 自动集成到性能监控系统
- **多命名空间支持** - 支持监控多个独立的 Socket 连接
- **阈值告警** - 延迟超过阈值时自动警告

---

## 🔧 配置选项

### WebSocketMonitorConfig

| 参数                       | 类型      | 默认值  | 说明                 |
| -------------------------- | --------- | ------- | -------------------- |
| `pingInterval`             | `number`  | `5000`  | Ping 间隔时间 (毫秒) |
| `latencyWarningThreshold`  | `number`  | `200`   | 延迟警告阈值 (毫秒)  |
| `latencyCriticalThreshold` | `number`  | `500`   | 延迟严重阈值 (毫秒)  |
| `autoReport`               | `boolean` | `true`  | 是否自动上报指标     |
| `verbose`                  | `boolean` | `false` | 是否输出详细日志     |
| `maxHistoryLength`         | `number`  | `100`   | 历史记录最大长度     |

### 默认配置

```typescript
const DEFAULT_WEBSOCKET_MONITOR_CONFIG = {
  pingInterval: 5000, // 每 5 秒进行一次延迟测试
  latencyWarningThreshold: 200, // 200ms 以上警告
  latencyCriticalThreshold: 500, // 500ms 以上严重
  autoReport: true, // 自动上报到性能系统
  verbose: false, // 生产环境关闭详细日志
  maxHistoryLength: 100, // 保留最近 100 条记录
}
```

---

## 📊 性能指标说明

### WebSocketMetrics

| 指标              | 类型     | 说明                |
| ----------------- | -------- | ------------------- |
| `connectTime`     | `number` | 连接建立耗时 (毫秒) |
| `latency`         | `number` | 当前延迟 (毫秒)     |
| `avgLatency`      | `number` | 平均延迟 (毫秒)     |
| `maxLatency`      | `number` | 最大延迟 (毫秒)     |
| `minLatency`      | `number` | 最小延迟 (毫秒)     |
| `reconnectCount`  | `number` | 重连次数            |
| `messageCount`    | `number` | 消息计数            |
| `errorCount`      | `number` | 错误计数            |
| `connectionState` | `string` | 连接状态            |

### 连接状态值

| 状态           | 说明     |
| -------------- | -------- |
| `connecting`   | 正在连接 |
| `connected`    | 已连接   |
| `disconnected` | 已断开   |
| `reconnecting` | 正在重连 |

### WebSocketMonitorStats

| 指标                | 类型                            | 说明           |
| ------------------- | ------------------------------- | -------------- |
| `totalConnections`  | `number`                        | 总连接数       |
| `activeConnections` | `number`                        | 当前活跃连接数 |
| `totalReconnects`   | `number`                        | 总重连次数     |
| `totalErrors`       | `number`                        | 总错误次数     |
| `totalMessages`     | `number`                        | 总消息数       |
| `avgLatency`        | `number`                        | 平均延迟       |
| `maxLatency`        | `number`                        | 最大延迟       |
| `minLatency`        | `number`                        | 最小延迟       |
| `namespaces`        | `Map<string, WebSocketMetrics>` | 各命名空间指标 |

---

## 📚 API 参考

### 类方法

#### `getInstance(config?)`

获取单例实例。

```typescript
static getInstance(config?: WebSocketMonitorConfig): WebSocketMonitor
```

**参数**:

- `config` (可选): 配置选项

**返回**: WebSocketMonitor 实例

---

#### `initialize(config?)`

初始化监控器。

```typescript
initialize(config?: Partial<WebSocketMonitorConfig>): void
```

**参数**:

- `config` (可选): 部分配置选项

---

#### `trackSocketClient(socket, namespace?)`

监控 Socket.IO 客户端连接。

```typescript
trackSocketClient(socket: Socket, namespace?: string): () => void
```

**参数**:

- `socket`: Socket.IO 客户端实例
- `namespace` (可选): 命名空间标识，默认 "default"

**返回**: 清理函数，调用后停止监控

---

#### `trackSocketServer(io, namespace?)`

监控 Socket.IO 服务端。

```typescript
trackSocketServer(io: SocketIOServer, namespace?: string): void
```

**参数**:

- `io`: Socket.IO 服务器实例
- `namespace` (可选): 命名空间标识，默认 "server"

---

#### `getMetrics(namespace?)`

获取指标数据。

```typescript
getMetrics(namespace?: string): WebSocketMetrics | Map<string, WebSocketMetrics>
```

**参数**:

- `namespace` (可选): 命名空间标识

**返回**: 指定命名空间的指标，或所有命名空间的 Map

---

#### `getLatencyHistory(namespace?)`

获取延迟历史记录。

```typescript
getLatencyHistory(namespace?: string): LatencyRecord[]
```

**参数**:

- `namespace` (可选): 命名空间标识

**返回**: 延迟历史记录数组

---

#### `getEventHistory()`

获取事件历史。

```typescript
getEventHistory(): WebSocketEvent[]
```

**返回**: 事件历史数组

---

#### `getStats()`

获取统计信息。

```typescript
getStats(): WebSocketMonitorStats
```

**返回**: 汇总统计信息

---

#### `stopTracking(namespace)`

停止监控指定命名空间。

```typescript
stopTracking(namespace: string): void
```

**参数**:

- `namespace`: 命名空间标识

---

#### `reset()`

重置所有指标。

```typescript
reset(): void
```

---

#### `destroy()`

销毁实例。

```typescript
destroy(): void
```

---

### 导出的辅助函数

#### `setupWebSocketMonitoring(io)`

设置服务端 WebSocket 监控。

```typescript
setupWebSocketMonitoring(io: SocketIOServer): void
```

**参数**:

- `io`: Socket.IO 服务器实例

---

#### `useWebSocketMonitoring(socket, namespace?)`

客户端 WebSocket 监控 Hook。

```typescript
useWebSocketMonitoring(socket: Socket, namespace?: string): () => void
```

**参数**:

- `socket`: Socket.IO 客户端实例
- `namespace` (可选): 命名空间标识

**返回**: 清理函数

---

#### `getWebSocketStats()`

获取 WebSocket 监控统计。

```typescript
getWebSocketStats(): WebSocketMonitorStats
```

---

#### `getWebSocketLatencyHistory(namespace?)`

获取延迟历史。

```typescript
getWebSocketLatencyHistory(namespace?: string): LatencyRecord[]
```

---

#### `getWebSocketEventHistory()`

获取事件历史。

```typescript
getWebSocketEventHistory(): WebSocketEvent[]
```

---

## 💡 使用示例

### 服务端集成

```typescript
// server.ts
import { Server } from 'socket.io'
import { setupWebSocketMonitoring } from '@/lib/websocket/monitoring-middleware'

const io = new Server(httpServer, {
  cors: { origin: '*' },
})

// 初始化 WebSocket 监控
setupWebSocketMonitoring(io)

// 监控已启动
console.log('WebSocket monitoring enabled')
```

### 客户端使用

```typescript
// client.ts
import { io } from 'socket.io-client'
import { useWebSocketMonitoring } from '@/lib/websocket/monitoring-middleware'

// 创建连接
const socket = io('ws://localhost:3000')

// 开始监控
const cleanup = useWebSocketMonitoring(socket, 'main')

// 获取指标
import { getWebSocketStats } from '@/lib/websocket/monitoring-middleware'

setInterval(() => {
  const stats = getWebSocketStats()
  console.log('连接状态:', stats)
}, 10000)

// 清理
// cleanup();
```

### React 组件中使用

```typescript
// components/ConnectionStatus.tsx
import { useEffect, useState } from "react";
import { useWebSocketMonitoring, getWebSocketStats } from "@/lib/websocket/monitoring-middleware";
import type { WebSocketMonitorStats } from "@/lib/monitoring/types";

export function ConnectionStatus({ socket }) {
  const [stats, setStats] = useState<WebSocketMonitorStats | null>(null);

  useEffect(() => {
    // 启动监控
    const cleanup = useWebSocketMonitoring(socket, "app");

    // 定时更新状态
    const interval = setInterval(() => {
      setStats(getWebSocketStats());
    }, 5000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, [socket]);

  if (!stats) return <div>加载中...</div>;

  return (
    <div className="connection-status">
      <p>活跃连接: {stats.activeConnections}/{stats.totalConnections}</p>
      <p>平均延迟: {stats.avgLatency.toFixed(0)}ms</p>
      <p>重连次数: {stats.totalReconnects}</p>
      <p>错误次数: {stats.totalErrors}</p>
    </div>
  );
}
```

### 手动控制监控

```typescript
// manual-monitoring.ts
import { WebSocketMonitor } from '@/lib/monitoring/websocket-monitor'
import { io } from 'socket.io-client'

// 获取实例并配置
const monitor = WebSocketMonitor.getInstance({
  pingInterval: 3000,
  latencyWarningThreshold: 150,
  latencyCriticalThreshold: 400,
  verbose: true,
})

// 初始化
monitor.initialize()

// 创建连接
const socket1 = io('ws://server1.com')
const socket2 = io('ws://server2.com')

// 监控多个连接
const cleanup1 = monitor.trackSocketClient(socket1, 'server1')
const cleanup2 = monitor.trackSocketClient(socket2, 'server2')

// 获取特定连接的指标
const server1Metrics = monitor.getMetrics('server1')
console.log('Server1 延迟:', server1Metrics.latency)

// 获取所有指标
const allMetrics = monitor.getMetrics() as Map<string, any>
for (const [ns, metrics] of allMetrics) {
  console.log(`[${ns}] 延迟: ${metrics.latency}ms`)
}

// 获取延迟历史
const latencyHistory = monitor.getLatencyHistory('server1')
console.log('历史记录数:', latencyHistory.length)

// 获取汇总统计
const stats = monitor.getStats()
console.log('总活跃连接:', stats.activeConnections)

// 停止监控特定连接
cleanup1()

// 或使用 stopTracking
monitor.stopTracking('server2')

// 重置所有数据
monitor.reset()

// 完全销毁
monitor.destroy()
```

### 服务端 Ping-Pong 响应

```typescript
// server-handlers.ts
import { Server } from 'socket.io'

export function setupPingPongHandler(io: Server) {
  io.on('connection', socket => {
    // 响应客户端 ping
    socket.on('ping', (data: { timestamp: number }) => {
      socket.emit('pong', {
        timestamp: data.timestamp,
        serverTime: Date.now(),
      })
    })
  })
}
```

---

## ⚠️ 注意事项

### 性能影响

- 默认每 5 秒进行一次延迟测试，对性能影响极小
- 历史记录默认保留 100 条，自动清理旧记录
- 建议 `verbose: false` 避免过多日志输出

### 生产环境配置

```typescript
// 生产环境推荐配置
const prodConfig = {
  pingInterval: 10000, // 10 秒间隔
  latencyWarningThreshold: 300, // 300ms 警告
  latencyCriticalThreshold: 800, // 800ms 严重
  autoReport: true, // 保持上报
  verbose: false, // 关闭日志
  maxHistoryLength: 50, // 减少内存占用
}
```

### 开发环境配置

```typescript
// 开发环境推荐配置
const devConfig = {
  pingInterval: 3000, // 3 秒间隔，更频繁
  latencyWarningThreshold: 100, // 更敏感的阈值
  latencyCriticalThreshold: 300,
  autoReport: true,
  verbose: true, // 开启详细日志
  maxHistoryLength: 200, // 更多历史记录
}
```

---

## 🔗 相关文档

- [WebSocket API 文档](../api/websocket.md) - WebSocket 房间系统
- [性能监控文档](../PERFORMANCE_MONITORING.md) - 性能监控系统
- [ADR-0008: WebSocket 房间系统设计](../adr/0008-websocket-room-system-design.md)

---

## 📝 版本历史

| 版本   | 日期       | 变更                          |
| ------ | ---------- | ----------------------------- |
| v1.8.0 | 2026-04-02 | 初始版本 - WebSocket 监控功能 |
