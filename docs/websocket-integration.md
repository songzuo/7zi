# WebSocket 实时通信系统集成指南

## 概述

7zi 项目现已集成完整的 WebSocket 实时通信系统，支持实时通知、任务更新、协作编辑等功能。

## 架构组件

### 1. 服务端组件

#### WebSocket Server (`src/lib/websocket/server.ts`)
- Socket.IO 服务器实现
- 支持房间管理、认证、消息广播
- 提供心跳检测和连接监控
- 支持文档协作（OT 操作）
- 集成语音会议信令服务器

#### API Routes
- `GET /api/ws` - WebSocket 连接端点
- `GET /api/ws/stats` - 服务器统计信息
- `GET /api/ws/rooms/[roomId]` - 房间信息
- `POST /api/ws/broadcast` - 系统公告广播

### 2. 客户端组件

#### Hooks
- `useWebSocket` - 简洁的 WebSocket Hook
- `useEnhancedWebSocket` - 增强的 WebSocket Hook（自动重连、心跳、离线队列）
- `useRealtimeNotifications` - 实时通知 Hook
- `useTaskRealtime` - 实时任务更新 Hook

#### Components
- `NotificationPanel` - 通知面板组件
- `TaskUpdateFeed` - 任务更新流组件

#### Services
- `notification-service` - 通知服务（离线队列、错误处理、自动重试）

### 3. 类型定义 (`src/lib/realtime/types.ts`)
- WebSocket 消息类型
- 实时通知类型
- 连接状态类型
- 通知 Payload 类型

## 快速开始

### 1. 安装依赖

```bash
npm install socket.io socket.io-client
```

已在 `package.json` 中配置。

### 2. 启动开发服务器

```bash
npm run dev
```

WebSocket 服务器将在 `/api/ws` 路径下自动启动。

### 3. 基础使用示例

#### 接收实时通知

```tsx
'use client';

import { NotificationPanel } from '@/components/realtime';
import { useState } from 'react';

export default function MyPage() {
  const [showNotifications, setShowNotifications] = useState(false);
  const userId = 'user-123'; // 从认证上下文获取

  return (
    <div>
      <button onClick={() => setShowNotifications(!showNotifications)}>
        Notifications
      </button>

      {showNotifications && (
        <NotificationPanel
          userId={userId}
          enableSound={true}
          onClose={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
}
```

#### 订阅任务更新

```tsx
'use client';

import { useTaskRealtime } from '@/lib/realtime/useTaskRealtime';
import { useEffect } from 'react';

export default function TaskPage({ taskId }: { taskId: string }) {
  const {
    isConnected,
    recentUpdates,
    subscribeToTask,
  } = useTaskRealtime();

  useEffect(() => {
    // 订阅特定任务的更新
    const cleanup = subscribeToTask(taskId);

    // 组件卸载时自动取消订阅
    return cleanup;
  }, [taskId, subscribeToTask]);

  return (
    <div>
      <div>连接状态: {isConnected ? '已连接' : '未连接'}</div>
      <div>更新数: {recentUpdates.length}</div>
    </div>
  );
}
```

#### 发送自定义通知

```tsx
'use client';

import { notificationService } from '@/lib/realtime/notification-service';

export async function sendTaskUpdate() {
  await notificationService.notifyTaskStatusChange({
    taskId: 'task-123',
    taskTitle: '完成设计',
    oldStatus: 'in_progress',
    newStatus: 'completed',
    changedBy: { id: 'user-1', name: '张三' },
    projectId: 'project-456',
    assigneeId: 'user-2',
  });
}
```

## 功能特性

### 1. 自动重连
- 指数退避算法（3s → 4.5s → 6.75s → ... → 最大 30s）
- 可配置最大重连次数
- 连接成功后自动重置计数器

### 2. 心跳检测
- 定期发送心跳保持连接
- 可配置心跳间隔（默认 30 秒）
- 超时自动断开（60 秒无心跳）

### 3. 离线队列
- 断开连接时自动缓存消息
- 可配置队列大小（默认 100 条）
- 重连后自动发送队列中的消息
- 支持优先级消息

### 4. 连接状态管理
- 完整的状态机：connecting → connected → disconnected → error
- 状态变化监听
- 连接时长统计

### 5. 通知服务
- 支持多种通知类型（任务、成员、系统等）
- 离线通知队列
- 自动重试机制
- 错误日志记录

### 6. 房间管理
- 支持任务、项目、聊天、文档房间
- 自动清理空闲房间
- 用户状态追踪
- 光标同步

## 配置选项

### 环境变量

```env
# WebSocket 服务器 URL
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3000

# 允许的源（CORS）
NEXT_PUBLIC_SITE_URL=https://7zi.studio
```

### Hook 配置

```typescript
const config = {
  url: 'http://localhost:3000',
  token: 'your-auth-token',        // 认证令牌
  channels: ['user:123'],           // 默认订阅的频道
  autoConnect: true,                // 自动连接
  reconnect: true,                  // 自动重连
  maxReconnectAttempts: 10,         // 最大重连次数
  reconnectInterval: 3000,          // 重连间隔（毫秒）
  heartbeatInterval: 30000,         // 心跳间隔（毫秒）
  offlineQueueSize: 100,            // 离线队列大小
  enableOfflineQueue: true,         // 启用离线队列
};
```

## 房间 ID 规范

### 任务房间
```
task:<taskId>
示例: task:abc123
```

### 项目房间
```
project:<projectId>
示例: project:xyz789
```

### 聊天房间
```
chat:<chatId>
示例: chat:msg456
```

### 文档房间
```
document:<documentId>
示例: doc:file789
```

### 用户频道
```
user:<userId>
示例: user:user123
```

## 事件类型

### 客户端发送事件

```typescript
// 房间管理
socket.emit('room:join', { roomId, type, documentId });
socket.emit('room:leave', { roomId });
socket.emit('room:get_users', { roomId });

// 文档操作
socket.emit('doc:open', { roomId, documentId });
socket.emit('doc:operation', { roomId, operation });
socket.emit('doc:sync', { roomId });

// 光标
socket.emit('cursor:move', { roomId, position, selection });

// 在线状态
socket.emit('presence:typing', { roomId, isTyping });

// 心跳
socket.emit('heartbeat');
```

### 服务器推送事件

```typescript
// 认证
socket.on('auth:authenticated', data);

// 房间
socket.on('room:joined', data);
socket.on('room:left', data);
socket.on('room:user_joined', data);
socket.on('room:user_left', data);
socket.on('room:user_list', data);

// 文档
socket.on('doc:opened', data);
socket.on('doc:operation_applied', data);
socket.on('doc:sync', data);

// 光标
socket.on('cursor:update', data);

// 在线状态
socket.on('presence:typing', data);

// 通知
socket.on('notification', notification);
socket.on('task:status_changed', data);
socket.on('task:assigned', data);
socket.on('task:comment', data);
socket.on('member:status_changed', data);
socket.on('system:announcement', data);
socket.on('project:updated', data);

// 系统
socket.on('system:error', error);
```

## API 示例

### 获取服务器统计

```bash
curl http://localhost:3000/api/ws/stats
```

响应：
```json
{
  "connected": 42,
  "rooms": 8,
  "totalUsers": 56,
  "rooms": [
    {
      "id": "task:abc123",
      "name": "Room task:abc123",
      "type": "task",
      "userCount": 3
    }
  ]
}
```

### 获取房间信息

```bash
curl http://localhost:3000/api/ws/rooms/task:abc123
```

响应：
```json
{
  "id": "task:abc123",
  "name": "Room task:abc123",
  "type": "task",
  "userCount": 3,
  "createdAt": "2026-03-21T10:30:00.000Z",
  "lastActivity": "2026-03-21T11:30:00.000Z",
  "users": [
    {
      "id": "user-123",
      "name": "张三",
      "color": "#3b82f6",
      "isTyping": false,
      "lastActivity": "2026-03-21T11:29:00.000Z"
    }
  ]
}
```

### 广播系统公告

```bash
curl -X POST http://localhost:3000/api/ws/broadcast \
  -H "Content-Type: application/json" \
  -d '{"message":"系统将于今晚 22:00 进行维护"}'
```

## 测试

### 运行测试

```bash
npm test
```

### 测试覆盖率

```bash
npm run test:coverage
```

## 示例页面

访问 `/examples/realtime-dashboard` 查看完整的功能演示：
- 实时通知面板
- 任务更新流
- 连接状态监控
- WebSocket 统计信息

## 性能优化

### 生产环境配置

```typescript
const config = {
  autoConnect: true,
  reconnect: true,
  maxReconnectAttempts: 10,          // 更多重连尝试
  reconnectInterval: 3000,
  heartbeatInterval: 25000,          // 更短的心跳间隔
  enableOfflineQueue: true,
  offlineQueueSize: 100,
};
```

### 内存管理

- 限制消息历史大小（默认 100 条）
- 限制离线队列大小（默认 50 条/用户）
- 自动清理空闲房间（30 分钟后）

### 网络优化

- 启用 WebSocket 传输优先（自动降级到 polling）
- 压缩大型文档操作
- 批量发送通知

## 故障排查

### 连接失败

1. 检查 WebSocket URL 配置
2. 检查 CORS 设置
3. 检查认证令牌
4. 查看浏览器控制台错误

### 消息未收到

1. 检查是否订阅了正确的频道
2. 检查用户是否在线
3. 查看离线队列
4. 检查事件监听器是否正确注册

### 性能问题

1. 减少消息历史大小
2. 减少离线队列大小
3. 增加心跳间隔
4. 检查是否发送过多通知

## 安全考虑

1. **认证**: 所有 WebSocket 连接都需要有效的 JWT 令牌
2. **CORS**: 配置允许的源列表
3. **速率限制**: 在生产环境中添加速率限制
4. **消息验证**: 验证所有传入的消息
5. **房间权限**: 实现房间访问控制

## 下一步

1. **持久化**: 将离线队列存储到 IndexedDB
2. **加密**: 使用 WSS 和消息加密
3. **监控**: 添加性能指标监控
4. **测试**: 增加集成测试和 E2E 测试
5. **优化**: 根据实际使用情况优化配置

## 相关文档

- [Socket.IO 文档](https://socket.io/docs/)
- [Realtime 功能 README](../src/lib/realtime/README.md)
- [WebSocket Server 文档](../src/lib/websocket/server.ts)
