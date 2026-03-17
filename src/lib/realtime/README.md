# WebSocket 实时通信功能

这个目录包含了 7zi 项目的 WebSocket 实时通信功能，提供了简单易用的 hooks 和强大的通知服务。

## 📦 文件说明

### 核心文件

- **`useWebSocket.ts`** - 简洁的 WebSocket Hook
  - 轻量级 WebSocket 封装
  - 支持自定义事件监听
  - 简单易用的 API
  - 基本自动重连功能

- **`useEnhancedWebSocket.ts`** - 增强的 WebSocket Hook
  - 基于 Socket.IO 的完整功能
  - 指数退避自动重连
  - 心跳检测机制
  - 连接状态管理
  - 离线消息队列
  - 消息统计功能

- **`notification-service.ts`** - 通知服务
  - 统一的通知管理
  - 离线通知队列
  - 完善的错误处理
  - 支持多种通知类型
  - 自动重试机制

- **`types.ts`** - 类型定义
  - WebSocket 消息类型
  - 通知事件类型
  - 连接状态类型

- **`server.ts`** - 通知服务器 Mock
  - 用于测试的服务器实现
  - 模拟用户连接和频道订阅

- **`examples.tsx`** - 使用示例
  - 完整的使用示例代码
  - 涵盖所有主要功能

### 辅助文件

- **`notification-provider.tsx`** - React Context Provider
- **`read-status.ts`** - 已读状态管理
- **`__tests__/`** - 测试文件目录

---

## 🚀 快速开始

### 基础使用 (useWebSocket)

```tsx
'use client';

import { useWebSocket, createMessage } from '@/lib/realtime/useWebSocket';

function MyComponent() {
  const { isConnected, lastMessage, send, on, connect, disconnect } = useWebSocket({
    url: 'ws://localhost:3000/ws',
    autoConnect: true,
    reconnectOnClose: true,
  });

  // 监听特定消息
  const cleanup = on('chat:message', (data) => {
    console.log('收到消息:', data);
  });

  const handleSend = () => {
    const msg = createMessage('chat:message', { text: 'Hello!' });
    send(msg);
  };

  return (
    <div>
      <p>状态: {isConnected ? '已连接' : '未连接'}</p>
      <button onClick={connect}>连接</button>
      <button onClick={disconnect}>断开</button>
      <button onClick={handleSend} disabled={!isConnected}>发送</button>
      {lastMessage && <pre>{JSON.stringify(lastMessage)}</pre>}
    </div>
  );
}
```

### 增强使用 (useEnhancedWebSocket)

```tsx
'use client';

import { useEnhancedWebSocket } from '@/lib/realtime/useEnhancedWebSocket';

function MyComponent() {
  const {
    isConnected,
    connectionState,
    error,
    stats,
    send,
    subscribe,
    on,
    onStateChange,
    getOfflineQueue,
  } = useEnhancedWebSocket({
    url: 'http://localhost:3000',
    token: 'your-auth-token',
    channels: ['notifications'],
    autoConnect: true,
    reconnect: true,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    enableOfflineQueue: true,
  });

  // 监听连接状态
  onStateChange((state) => {
    console.log('连接状态:', state);
  });

  // 监听消息
  on('task:status_changed', (data) => {
    console.log('任务状态变更:', data);
  });

  return (
    <div>
      <p>状态: {connectionState}</p>
      <p>已发送: {stats.messagesSent}</p>
      <p>已接收: {stats.messagesReceived}</p>
      {error && <p className="error">错误: {error.message}</p>}
    </div>
  );
}
```

### 通知服务使用

```tsx
'use client';

import { notificationService } from '@/lib/realtime/notification-service';

// 发送任务状态变更通知
await notificationService.notifyTaskStatusChange({
  taskId: 'task-123',
  taskTitle: '完成设计',
  oldStatus: 'in_progress',
  newStatus: 'completed',
  changedBy: { id: 'user-1', name: '张三' },
  projectId: 'project-456',
  assigneeId: 'user-2',
});

// 发送任务分配通知
await notificationService.notifyTaskAssignment({
  taskId: 'task-789',
  taskTitle: 'API 开发',
  assignedTo: { id: 'user-2', name: '李四' },
  assignedBy: { id: 'user-1', name: '张三' },
  priority: 'high',
});

// 发送系统公告
await notificationService.broadcastSystemAnnouncement({
  title: '系统维护',
  content: '今晚 22:00 进行维护',
  level: 'warning',
});

// 检查离线队列
const queue = notificationService.getOfflineQueue('user-id');
console.log('离线消息:', queue);

// 查看错误日志
const errors = notificationService.getErrorLog();
console.log('错误:', errors);

// 监听错误
notificationService.onError((error) => {
  console.error('通知错误:', error);
});
```

---

## 📚 API 文档

### useWebSocket Hook

#### 参数

```typescript
interface SimpleWebSocketConfig {
  url: string;                    // WebSocket 服务器 URL
  protocols?: string | string[];  // WebSocket 协议
  autoConnect?: boolean;          // 是否自动连接 (默认: true)
  reconnectOnClose?: boolean;     // 关闭时是否重连 (默认: false)
  reconnectInterval?: number;     // 重连间隔 (毫秒, 默认: 3000)
  maxReconnectAttempts?: number;  // 最大重连次数 (默认: 5)
}
```

#### 返回值

```typescript
{
  status: WebSocketStatus;           // 连接状态
  isConnected: boolean;               // 是否已连接
  error: Event | null;                // 错误对象
  lastMessage: WebSocketMessage | null; // 最后一条消息
  
  connect: () => void;                // 连接
  disconnect: () => void;             // 断开
  send: (data: WebSocketMessage) => void; // 发送消息
  
  on: (event, handler) => () => void;      // 添加监听器
  once: (event, handler) => () => void;    // 一次性监听
  addListener: ...;                  // 添加监听器
  removeListener: ...;               // 移除监听器
  
  getWebSocket: () => WebSocket | null; // 获取原生 WebSocket 实例
}
```

---

### useEnhancedWebSocket Hook

#### 参数

```typescript
interface WebSocketConfig {
  url: string;                       // Socket.IO 服务器 URL
  token?: string;                    // 认证令牌
  channels?: string[];               // 默认订阅的频道
  autoConnect?: boolean;             // 是否自动连接 (默认: true)
  reconnect?: boolean;               // 是否自动重连 (默认: true)
  maxReconnectAttempts?: number;      // 最大重连次数 (默认: 10)
  reconnectInterval?: number;        // 重连间隔 (默认: 3000)
  heartbeatInterval?: number;        // 心跳间隔 (默认: 30000)
  offlineQueueSize?: number;         // 离线队列大小 (默认: 100)
  enableOfflineQueue?: boolean;      // 是否启用离线队列 (默认: true)
}
```

#### 返回值

```typescript
{
  isConnected: boolean;              // 是否已连接
  connectionState: ConnectionState;  // 连接状态
  error: Error | null;               // 错误对象
  lastMessage: WebSocketMessage | null; // 最后一条消息
  messages: WebSocketMessage[];      // 消息历史
  
  stats: WebSocketStats;             // 统计信息
  // stats 包含:
  // - messagesSent: 已发送消息数
  // - messagesReceived: 已接收消息数
  // - reconnectCount: 重连次数
  // - lastConnected: 最后连接时间
  // - lastDisconnected: 最后断开时间
  // - connectionDuration: 总连接时长
  
  connect: () => void;               // 连接
  disconnect: () => void;            // 断开
  reconnect: () => void;             // 重连
  send: (type, payload) => void;     // 发送消息
  subscribe: (channels) => void;      // 订阅频道
  unsubscribe: (channels) => void;    // 取消订阅
  
  on: (type, handler) => () => void; // 监听消息
  onStateChange: (callback) => () => void; // 监听状态变化
  onError: (callback) => () => void; // 监听错误
  
  clearMessages: () => void;          // 清空消息历史
  getOfflineQueue: () => WebSocketMessage[]; // 获取离线队列
}
```

---

### notificationService

#### 主要方法

```typescript
// 任务通知
await notificationService.notifyTaskStatusChange(options);
await notificationService.notifyTaskAssignment(options);
await notificationService.notifyTaskComment(options);

// 成员通知
notificationService.notifyMemberStatus(options);

// 系统通知
await notificationService.broadcastSystemAnnouncement(options);

// 项目通知
await notificationService.notifyProjectUpdate(options);

// 自定义通知
await notificationService.sendCustomNotification(options);

// 队列管理
notificationService.getOfflineQueue(userId);      // 获取离线队列
notificationService.clearOfflineQueue(userId);    // 清空离线队列
await notificationService.processQueueNow();      // 手动处理队列

// 错误管理
notificationService.getErrorLog(limit);           // 获取错误日志
notificationService.clearErrorLog();              // 清空错误日志
notificationService.onError(callback);            // 监听错误

// 历史记录
notificationService.getNotificationHistory(userId, limit); // 获取通知历史

// 已读状态
await notificationService.markAsRead(notificationIds, userId); // 标记已读
await notificationService.getUnreadCount(userId);              // 获取未读数

// 在线状态
notificationService.isUserOnline(userId);          // 检查用户是否在线
notificationService.getOnlineUsers();              // 获取在线用户列表
```

---

## 🎯 功能特性

### 1. 自动重连 (指数退避)

- `useEnhancedWebSocket` 实现了指数退避算法
- 每次重连间隔递增：3秒 → 4.5秒 → 6.75秒 → ... → 最大 30 秒
- 可配置最大重连次数
- 连接成功后重置重连计数器

### 2. 心跳检测

- 定期发送心跳消息保持连接
- 可配置心跳间隔 (默认 30 秒)
- 自动在连接建立时启动，断开时停止

### 3. 连接状态管理

- 完整的状态追踪：connecting → connected → disconnected → error
- 状态变化监听器
- 最后连接/断开时间记录
- 总连接时长统计

### 4. 离线消息队列

- 连接断开时自动缓存消息
- 可配置队列大小限制
- 重连后自动发送队列中的消息
- 支持手动查看和清空队列

### 5. 消息统计

- 已发送/接收消息计数
- 重连次数统计
- 连接时长记录
- 完整的统计信息接口

### 6. 错误处理

- 完善的错误捕获和记录
- 错误回调监听
- 错误日志管理
- 自动重试失败的发送

---

## 🔧 配置建议

### 开发环境

```typescript
const config = {
  autoConnect: true,
  reconnect: true,
  maxReconnectAttempts: 5,
  reconnectInterval: 3000,
  heartbeatInterval: 30000,
  enableOfflineQueue: true,
};
```

### 生产环境

```typescript
const config = {
  autoConnect: true,
  reconnect: true,
  maxReconnectAttempts: 10,
  reconnectInterval: 3000,
  heartbeatInterval: 25000,  // 更短的心跳间隔
  enableOfflineQueue: true,
  offlineQueueSize: 100,
};
```

### 低流量环境

```typescript
const config = {
  autoConnect: false,  // 按需连接
  reconnect: true,
  maxReconnectAttempts: 3,
  reconnectInterval: 5000,  // 更长的重连间隔
  heartbeatInterval: 60000,  // 更长的心跳间隔
  enableOfflineQueue: true,
  offlineQueueSize: 50,      // 更小的队列
};
```

---

## 🧪 测试

```bash
# 运行测试
npm test

# 运行测试并生成覆盖率
npm run test:coverage
```

---

## 📝 TypeScript 支持

所有模块都包含完整的 TypeScript 类型定义：

- `WebSocketMessage` - WebSocket 消息类型
- `ConnectionState` - 连接状态类型
- `RealtimeNotificationType` - 通知类型
- `NotificationEvent` - 通知事件类型
- 等等...

---

## 🎨 使用示例

完整的示例代码请查看 `examples.tsx` 文件，包含：

- 基础 WebSocket 使用
- 增强型 WebSocket 使用
- 实时聊天功能
- 通知服务使用
- 综合仪表板

---

## ⚠️ 注意事项

1. **Token 安全**: 生产环境中不要在前端代码中硬编码 token
2. **连接管理**: 合理使用 `autoConnect` 和 `disconnect` 避免不必要的连接
3. **队列大小**: 根据应用需求调整 `offlineQueueSize`
4. **心跳间隔**: 根据服务器负载调整 `heartbeatInterval`
5. **错误处理**: 始终监听错误事件以便及时处理
6. **清理资源**: 组件卸载时确保调用 disconnect

---

## 🔄 升级指南

### 从 useWebSocket 升级到 useEnhancedWebSocket

1. 更新配置对象（添加 token、channels 等）
2. 替换 `status` 为 `connectionState`
3. 使用 `send(type, payload)` 替代 `send(message)`
4. 使用 `subscribe/unsubscribe` 管理频道
5. 利用 `stats` 获取详细统计信息
6. 使用 `getOfflineQueue()` 查看离线队列

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可

MIT License
