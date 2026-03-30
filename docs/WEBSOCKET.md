# WebSocket 实时通信文档

**最后更新**: 2026-03-29
**版本**: v1.4.0
**维护者**: 🏗️ 架构师 (AI 团队)

---

## 目录

1. [概述](#概述)
2. [v1.4.0 新功能](#v140-新功能)
3. [架构设计](#架构设计)
4. [核心 API](#核心-api)
5. [组件集成](#组件集成)
6. [性能优化](#性能优化)
7. [错误处理](#错误处理)
8. [安全考虑](#安全考虑)
9. [最佳实践](#最佳实践)
10. [故障排查](#故障排查)

---

## 概述

### WebSocket 在 7zi 中的作用

7zi Studio 使用 WebSocket 技术实现以下实时功能：

- ✅ **实时 Dashboard** - 任务状态、成员在线状态、活动日志实时更新
- ✅ **实时协作** - 多用户同时编辑、任务分配、评论同步
- ✅ **实时通知** - 任务分配、评论、系统消息的即时推送
- ✅ **AI 主管通信** - 子代理任务状态、进度更新
- ✅ **多房间协作** (v1.4.0) - 支持多房间、权限控制、消息持久化

### 技术栈

- **客户端**: `useWebSocket` Hook + WebSocket API
- **服务端**: Node.js + `socket.io` 4.8.3
- **协议**: WebSocket (WS) + HTTP fallback
- **压缩**: 消息压缩 (gzip)
- **重连**: 指数退避算法

---

## v1.4.0 新功能

v1.4.0 引入了**高级协作功能**，包括完整的房间系统、权限控制和消息持久化。

### 🏠 房间系统

- **多房间支持** - 动态创建和管理多个协作空间
- **房间类型** - task, project, chat, document, voice, video
- **可见性控制** - public, private, invite-only
- **参与者管理** - 加入/离开、踢出/封禁、角色变更
- **状态追踪** - 光标位置、输入状态、在线/离线

### 🔐 权限控制

- **5 种角色** - owner > admin > moderator > member > guest
- **16 种权限** - 房间权限(7种) + 消息权限(6种) + 管理权限(3种)
- **RBAC 集成** - 角色层级强制、权限授予/撤销
- **临时权限** - 支持过期时间的权限授予

### 💾 消息持久化

- **内存存储** - 每房间最多 10,000 条消息
- **离线队列** - TTL 7 天、每用户 100 条
- **消息操作** - 编辑、软删除、反应(emoji)、置顶
- **历史查询** - 过滤、分页、排除已删除

### 📚 详细文档

- **[WHATS_NEW_v1.4.0.md](./WHATS_NEW_v1.4.0.md)** - v1.4.0 功能展示
- **[api/websocket.md](./api/websocket.md)** - WebSocket API 完整文档
- **[adr/0008-websocket-room-system-design.md](./adr/0008-websocket-room-system-design.md)** - 设计决策

---

## 架构设计

### 连接流程

```
客户端                     服务端
  |                          |
  |  1. WebSocket Handshake  |
  |------------------------->|
  |                          |
  |  2. Connection Open      |
  |<-------------------------|
  |                          |
  |  3. Subscribe Channels   |
  |------------------------->|
  |                          |
  |  4. Start Heartbeat      |
  |<========================>|
  |                          |
  |  5. Real-time Messages   |
  |<========================>|
```

### 消息流

```
┌─────────────────────────────────────────────────────┐
│              WebSocket Message Queue                 │
├─────────────────────────────────────────────────────┤
│  [task:update] → Dashboard, TaskBoard, Notification │
│  [user:presence] → MemberPresenceBoard              │
│  [comment:new] → TaskComments, Notification         │
│  [system:alert] → NotificationPanel                 │
│  [ai:task] → Director, Dashboard                   │
└─────────────────────────────────────────────────────┘
```

### 心跳机制

- **间隔**: 30 秒
- **超时**: 5 秒
- **重连**: 指数退避 (3s → 6s → 12s → 24s → max 60s)
- **最大尝试**: 5 次

---

## 核心 API

### useWebSocket Hook

**文件**: `src/lib/realtime/useWebSocket.ts`

这是主要的 WebSocket Hook，提供完整的连接管理和消息处理功能。

#### 类型定义

```typescript
export type WebSocketStatus =
  | 'connecting'  // 连接中
  | 'open'        // 已连接
  | 'closing'     // 关闭中
  | 'closed'      // 已关闭
  | 'error';      // 错误

export interface SimpleWebSocketConfig {
  url: string;                    // WebSocket 服务器 URL
  protocols?: string | string[];  // 可选的子协议
  autoConnect?: boolean;         // 自动连接 (默认: true)
  reconnectOnClose?: boolean;     // 关闭时自动重连 (默认: false)
  reconnectInterval?: number;    // 重连间隔 (默认: 3000ms)
  maxReconnectAttempts?: number;  // 最大重连次数 (默认: 5)
}

export interface WebSocketOptions {
  onOpen?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

export interface UseWebSocketReturn {
  // 连接状态
  status: WebSocketStatus;
  isConnected: boolean;
  error: Event | null;

  // 消息
  lastMessage: WebSocketMessage | null;

  // 操作
  connect: () => void;
  disconnect: () => void;
  send: (data: WebSocketMessage) => void;

  // 事件监听
  addListener: (event: string, handler: (data: unknown) => void) => () => void;
  removeListener: (event: string, handler: (data: unknown) => void) => void;
  on: (event: string, handler: (data: unknown) => void) => () => void;
  once: (event: string, handler: (data: unknown) => void) => () => void;

  // 工具
  getWebSocket: () => WebSocket | null;
}

export interface WebSocketMessage {
  type: string;         // 消息类型
  id: string;           // 唯一 ID
  timestamp: string;    // ISO 时间戳
  payload?: unknown;    // 消息负载
  [key: string]: unknown;
}
```

#### 基本使用

```typescript
import { useWebSocket } from '@/lib/realtime/useWebSocket';

function Dashboard() {
  const {
    status,
    isConnected,
    lastMessage,
    send,
    addListener,
    disconnect,
  } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    autoConnect: true,
    reconnectOnClose: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  }, {
    onOpen: (event) => {
      console.log('WebSocket connected:', event);
    },
    onMessage: (message) => {
      console.log('Received message:', message);
    },
    onClose: (event) => {
      console.log('WebSocket disconnected:', event);
    },
    onError: (event) => {
      console.error('WebSocket error:', event);
    },
  });

  // 订阅特定事件
  useEffect(() => {
    const unsubscribe = addListener('task:update', (data) => {
      console.log('Task updated:', data);
      // 更新 UI
    });

    return () => unsubscribe();
  }, [addListener]);

  // 发送消息
  const sendTaskUpdate = () => {
    send({
      type: 'task:update',
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
      payload: {
        taskId: '123',
        status: 'in-progress',
      },
    });
  };

  return (
    <div>
      <div>状态: {status}</div>
      <div>已连接: {isConnected ? '是' : '否'}</div>
      <button onClick={sendTaskUpdate}>发送更新</button>
      <button onClick={disconnect}>断开连接</button>
    </div>
  );
}
```

#### 事件监听模式

```typescript
// 持续监听某个事件
useEffect(() => {
  const unsubscribe = addListener('task:update', (data) => {
    console.log('Task updated:', data);
  });

  return () => unsubscribe();
}, [addListener]);

// 只监听一次
useEffect(() => {
  const unsubscribe = once('system:ready', (data) => {
    console.log('System ready:', data);
    // 初始化应用
  });

  return () => unsubscribe();
}, [once]);

// 监听所有消息（通配符）
useEffect(() => {
  const unsubscribe = addListener('*', (data) => {
    console.log('All messages:', data);
    // 日志记录、调试等
  });

  return () => unsubscribe();
}, [addListener]);
```

### useEnhancedWebSocket Hook

**文件**: `src/lib/realtime/useEnhancedWebSocket.ts`

增强版 WebSocket Hook，提供更高级的功能：

- 心跳机制
- 消息队列
- 消息确认 (ACK)
- 重试机制

#### 基本使用

```typescript
import { useEnhancedWebSocket } from '@/lib/realtime/useEnhancedWebSocket';

function EnhancedDashboard() {
  const enhancedWs = useEnhancedWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    enableHeartbeat: true,
    heartbeatInterval: 30000,
    enableAck: true,
    enableRetry: true,
    maxRetryAttempts: 3,
  });

  return (
    <div>
      <div>连接状态: {enhancedWs.status}</div>
      <div>队列大小: {enhancedWs.queueSize}</div>
    </div>
  );
}
```

### 消息类型

#### 标准消息类型

```typescript
// 任务相关
'task:update'       // 任务更新
'task:create'       // 任务创建
'task:delete'       // 任务删除
'task:assign'       // 任务分配

// 用户相关
'user:presence'     // 用户在线状态
'user:typing'       // 用户正在输入

// 评论相关
'comment:new'       // 新评论
'comment:edit'      // 编辑评论
'comment:delete'    // 删除评论

// 通知相关
'notification:push' // 推送通知
'notification:read' // 标记已读

// 系统相关
'system:ready'      // 系统就绪
'system:error'      // 系统错误
'system:maintenance' // 系统维护

// AI 相关
'ai:task:start'     // AI 任务开始
'ai:task:progress'  // AI 任务进度
'ai:task:complete'  // AI 任务完成
'ai:task:error'     // AI 任务错误
```

#### 消息示例

```typescript
// 任务更新消息
{
  type: 'task:update',
  id: 'msg-1234567890-abc123',
  timestamp: '2026-03-18T14:30:00.000Z',
  payload: {
    taskId: 'task-123',
    changes: {
      status: 'in-progress',
      assignee: 'agent-architect',
    },
    updatedAt: '2026-03-18T14:30:00.000Z',
  },
}

// 用户在线状态
{
  type: 'user:presence',
  id: 'msg-1234567890-def456',
  timestamp: '2026-03-18T14:30:00.000Z',
  payload: {
    userId: 'user-123',
    status: 'online',
    location: 'dashboard',
    lastSeen: '2026-03-18T14:30:00.000Z',
  },
}

// AI 任务进度
{
  type: 'ai:task:progress',
  id: 'msg-1234567890-ghi789',
  timestamp: '2026-03-18T14:30:00.000Z',
  payload: {
    taskId: 'ai-task-456',
    agentId: 'agent-executor',
    progress: 75,
    currentStep: '代码实现',
    estimatedCompletion: '2026-03-18T15:00:00.000Z',
  },
}
```

---

## 组件集成

### Dashboard 集成

```typescript
import { useWebSocket } from '@/lib/realtime/useWebSocket';
import { ActivityLog } from '@/components/ActivityLog';
import { TaskBoard } from '@/components/TaskBoard';
import { MemberPresenceBoard } from '@/components/MemberPresenceBoard';

function RealtimeDashboard() {
  const { isConnected, addListener, lastMessage } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL,
    autoConnect: true,
    reconnectOnClose: true,
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // 监听活动更新
  useEffect(() => {
    const unsubscribe = addListener('activity:new', (data) => {
      setActivities(prev => [data, ...prev].slice(0, 20));
    });

    return () => unsubscribe();
  }, [addListener]);

  return (
    <div className="dashboard">
      <div className="status-bar">
        <span>实时连接: {isConnected ? '✅' : '❌'}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ActivityLog activities={activities} />
        <TaskBoard />
        <MemberPresenceBoard />
      </div>
    </div>
  );
}
```

### 通知系统集成

```typescript
import { useWebSocket } from '@/lib/realtime/useWebSocket';
import { useNotifications } from '@/lib/notifications';
import { NotificationToast } from '@/components/NotificationToast';

function RealtimeNotifications() {
  const { addListener } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL,
  });
  const { push } = useNotifications();

  // 监听通知
  useEffect(() => {
    const unsubscribe = addListener('notification:push', (data) => {
      const { type, title, message } = data as any;

      switch (type) {
        case 'success':
          push.success(title, message);
          break;
        case 'error':
          push.error(title, message);
          break;
        case 'warning':
          push.warning(title, message);
          break;
        default:
          push.info(title, message);
      }
    });

    return () => unsubscribe();
  }, [addListener, push]);

  return <NotificationToast />;
}
```

---

## 性能优化

### v1.0.6 优化成果

| 优化项 | 提升幅度 | 说明 |
|--------|----------|------|
| 连接稳定性 | +25% | 断线重连机制改进 |
| 重连速度 | +40% | 指数退避算法优化 |
| 消息延迟 | -30% | 批量消息合并 |
| 内存占用 | -20% | 消息队列优化 |
| 重渲染减少 | 30-40% | React.memo 优化 |

### 优化策略

#### 1. 消息去重

```typescript
const messageCache = useRef(new Map<string, WebSocketMessage>());

useEffect(() => {
  const unsubscribe = addListener('task:update', (message) => {
    // 检查消息是否已处理
    if (messageCache.current.has(message.id)) {
      return;
    }

    // 处理消息
    handleMessage(message);

    // 缓存消息
    messageCache.current.set(message.id, message);

    // 清理旧消息（5 分钟后）
    setTimeout(() => {
      messageCache.current.delete(message.id);
    }, 5 * 60 * 1000);
  });

  return () => unsubscribe();
}, [addListener]);
```

#### 2. 批量更新

```typescript
const [pendingUpdates, setPendingUpdates] = useState<any[]>([]);

// 使用节流批量更新 UI
useEffect(() => {
  const timer = setTimeout(() => {
    if (pendingUpdates.length > 0) {
      applyUpdates(pendingUpdates);
      setPendingUpdates([]);
    }
  }, 100); // 100ms 批量窗口

  return () => clearTimeout(timer);
}, [pendingUpdates]);

useEffect(() => {
  const unsubscribe = addListener('task:update', (data) => {
    setPendingUpdates(prev => [...prev, data]);
  });

  return () => unsubscribe();
}, [addListener]);
```

#### 3. 事件节流

```typescript
const throttledUpdate = useRef<(() => void) | null>(null);

useEffect(() => {
  const unsubscribe = addListener('user:presence', (data) => {
    if (!throttledUpdate.current) {
      throttledUpdate.current = () => {
        updateUserPresence(data);
        throttledUpdate.current = null;
      };

      // 节流：最多每 2 秒更新一次
      setTimeout(() => {
        if (throttledUpdate.current) {
          throttledUpdate.current();
        }
      }, 2000);
    }
  });

  return () => unsubscribe();
}, [addListener]);
```

#### 4. 连接池管理

```typescript
// 为不同功能创建独立的 WebSocket 连接
const dashboardWs = useWebSocket({
  url: `${WS_URL}/dashboard`,
  autoConnect: true,
});

const notificationsWs = useWebSocket({
  url: `${WS_URL}/notifications`,
  autoConnect: false,  // 按需连接
});

// 连接通知服务
function enableNotifications() {
  notificationsWs.connect();
}

// 断开通知服务
function disableNotifications() {
  notificationsWs.disconnect();
}
```

---

## 错误处理

### 常见错误类型

#### 1. 连接失败

```typescript
useWebSocket({
  url: WS_URL,
}, {
  onError: (event) => {
    console.error('WebSocket connection error:', event);

    // 显示用户友好的错误提示
    showErrorToast('无法连接到服务器，请检查网络连接');

    // 尝试使用 HTTP API 回退
    fetchDashboardDataViaHTTP();
  },
});
```

#### 2. 消息解析错误

```typescript
useWebSocket({
  url: WS_URL,
}, {
  onMessage: (message) => {
    try {
      // 验证消息格式
      if (!message.type || !message.id) {
        throw new Error('Invalid message format');
      }

      // 处理消息
      handleMessage(message);
    } catch (error) {
      console.error('Message processing error:', error, message);

      // 记录错误日志
      logError('websocket_message_error', { message, error });
    }
  },
});
```

#### 3. 重连失败

```typescript
const reconnectAttempts = useRef(0);

useWebSocket({
  url: WS_URL,
  reconnectOnClose: true,
  maxReconnectAttempts: 5,
  reconnectInterval: 3000,
}, {
  onClose: (event) => {
    reconnectAttempts.current++;

    if (reconnectAttempts.current >= 5) {
      // 达到最大重连次数
      showCriticalError('无法建立连接，请刷新页面或联系支持');
      // 切换到 HTTP 轮询模式
      switchToHTTPPolling();
    }
  },
  onOpen: () => {
    // 连接成功，重置重连计数
    reconnectAttempts.current = 0;
  },
});
```

### 错误恢复策略

```typescript
enum ConnectionState {
  WebSocket = 'websocket',
  HTTP_Polling = 'http_polling',
  Offline = 'offline',
}

function useResilientConnection() {
  const [connectionState, setConnectionState] = useState(ConnectionState.WebSocket);
  const { isConnected, error } = useWebSocket({ url: WS_URL });

  // 监听连接状态
  useEffect(() => {
    if (!isConnected && error) {
      // WebSocket 失败，切换到 HTTP 轮询
      setConnectionState(ConnectionState.HTTP_Polling);
    }
  }, [isConnected, error]);

  // 根据连接状态选择数据获取方式
  const fetchData = async () => {
    switch (connectionState) {
      case ConnectionState.WebSocket:
        // WebSocket 实时推送，无需主动获取
        break;
      case ConnectionState.HTTP_Polling:
        // HTTP 轮询
        return fetchViaHTTP();
      case ConnectionState.Offline:
        // 从缓存读取
        return fetchFromCache();
    }
  };

  return { connectionState, fetchData };
}
```

---

## 安全考虑

### 1. WebSocket URL 安全

```typescript
// 使用环境变量
const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

// 生产环境使用 WSS (WebSocket Secure)
const secureWsUrl = WS_URL.replace('ws://', 'wss://');

// 验证 URL 格式
function isValidWebSocketUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
  } catch {
    return false;
  }
}
```

### 2. 消息加密

```typescript
// 敏感消息加密
function encryptMessage(message: WebSocketMessage): WebSocketMessage {
  if (isSensitiveMessage(message.type)) {
    return {
      ...message,
      payload: encryptData(JSON.stringify(message.payload)),
    };
  }
  return message;
}

// 解密消息
function decryptMessage(message: WebSocketMessage): WebSocketMessage {
  if (message.encrypted) {
    return {
      ...message,
      payload: JSON.parse(decryptData(message.payload)),
    };
  }
  return message;
}
```

### 3. 认证和授权

```typescript
// 在连接握手时发送认证 token
useWebSocket({
  url: `${WS_URL}?token=${encodeURIComponent(getAuthToken())}`,
}, {
  onOpen: (event) => {
    console.log('Authenticated WebSocket connection established');
  },
  onError: (event) => {
    if (event instanceof CloseEvent && event.code === 4001) {
      // 认证失败
      showErrorToast('认证失败，请重新登录');
      redirectToLogin();
    }
  },
});
```

### 4. 消息验证

```typescript
// 验证消息格式和内容
function validateMessage(message: WebSocketMessage): boolean {
  // 检查必需字段
  if (!message.type || !message.id || !message.timestamp) {
    return false;
  }

  // 检查时间戳（防重放攻击）
  const messageTime = new Date(message.timestamp).getTime();
  const now = Date.now();
  if (Math.abs(now - messageTime) > 60000) { // 1 分钟
    return false;
  }

  // 检查消息类型
  const validTypes = ['task:update', 'user:presence', 'comment:new', /* ... */];
  if (!validTypes.includes(message.type)) {
    return false;
  }

  return true;
}
```

---

## 最佳实践

### 1. 组件卸载时清理

```typescript
useEffect(() => {
  const unsubscribe1 = addListener('event1', handler1);
  const unsubscribe2 = addListener('event2', handler2);

  // 组件卸载时取消所有订阅
  return () => {
    unsubscribe1();
    unsubscribe2();
  };
}, [addListener]);
```

### 2. 使用 React.memo 优化

```typescript
const TaskCard = memo(function TaskCard({ task }: { task: Task }) {
  return <div>{task.title}</div>;
});

// 在父组件中使用
function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <div>
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
```

### 3. 避免无限循环

```typescript
// ❌ 错误：每次渲染都创建新的监听器
useEffect(() => {
  const unsubscribe = addListener('task:update', (data) => {
    setTasks(prev => updateTasks(prev, data));
  });

  return () => unsubscribe();
}, [addListener]); // 缺少 setTasks 依赖

// ✅ 正确：使用 useCallback 稳定函数
const handleTaskUpdate = useCallback((data) => {
  setTasks(prev => updateTasks(prev, data));
}, []);

useEffect(() => {
  const unsubscribe = addListener('task:update', handleTaskUpdate);

  return () => unsubscribe();
}, [addListener, handleTaskUpdate]);
```

### 4. 错误边界

```typescript
function WebSocketErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="error-fallback">
          <h2>实时连接失败</h2>
          <p>无法连接到服务器，正在尝试重新连接...</p>
          <button onClick={() => window.location.reload()}>刷新页面</button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
```

### 5. 开发/生产环境配置

```typescript
const wsConfig: SimpleWebSocketConfig = {
  url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  autoConnect: true,
  reconnectOnClose: process.env.NODE_ENV === 'production',
  reconnectInterval: 3000,
  maxReconnectAttempts: process.env.NODE_ENV === 'production' ? 10 : 3,
};

if (process.env.NODE_ENV === 'development') {
  // 开发环境启用调试日志
  wsConfig.protocols = 'debug';
}
```

---

## 故障排查

### 常见问题

#### 1. 连接超时

**症状**: WebSocket 连接一直处于 "connecting" 状态

**解决方案**:
```typescript
// 设置连接超时
const timeoutRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  timeoutRef.current = setTimeout(() => {
    if (status === 'connecting') {
      console.error('WebSocket connection timeout');
      disconnect();
      // 尝试切换到备用服务器
      connectToBackupServer();
    }
  }, 10000); // 10 秒超时

  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, [status, disconnect]);
```

#### 2. 消息丢失

**症状**: 某些消息没有收到

**解决方案**:
```typescript
// 启用消息确认 (ACK)
useEnhancedWebSocket({
  url: WS_URL,
  enableAck: true,
}, {
  onAck: (messageId) => {
    console.log('Message acknowledged:', messageId);
    // 从队列中移除已确认的消息
    removeFromQueue(messageId);
  },
  onNack: (messageId, reason) => {
    console.error('Message not acknowledged:', messageId, reason);
    // 重试发送
    retryMessage(messageId);
  },
});
```

#### 3. 内存泄漏

**症状**: 长时间运行后内存占用过高

**解决方案**:
```typescript
// 定期清理缓存
useEffect(() => {
  const interval = setInterval(() => {
    // 清理过期的消息缓存
    messageCache.current.clear();

    // 清理过期的订阅
    cleanupExpiredSubscriptions();
  }, 5 * 60 * 1000); // 每 5 分钟

  return () => clearInterval(interval);
}, []);
```

#### 4. 高频更新导致性能问题

**症状**: UI 卡顿，CPU 占用高

**解决方案**:
```typescript
// 使用虚拟滚动处理大量实时更新
import { useVirtualizer } from '@tanstack/react-virtual';

function TaskList({ tasks }: { tasks: Task[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <TaskCard task={tasks[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 监控和调试

### 开发工具

```typescript
// 开发环境启用 WebSocket 调试
if (process.env.NODE_ENV === 'development') {
  // 拦截所有消息并记录
  useEffect(() => {
    const unsubscribe = addListener('*', (message) => {
      console.log(`[WebSocket] ${message.type}:`, message);
    });

    return () => unsubscribe();
  }, [addListener]);

  // 监控连接状态
  useEffect(() => {
    console.log(`[WebSocket] Status: ${status}, Connected: ${isConnected}`);
  }, [status, isConnected]);
}
```

### 性能监控

```typescript
// 监控消息处理时间
function measureMessagePerformance(message: WebSocketMessage, handler: () => void) {
  const startTime = performance.now();
  handler();
  const endTime = performance.now();

  const duration = endTime - startTime;

  if (duration > 100) { // 超过 100ms 警告
    console.warn(`Slow message processing: ${message.type} took ${duration.toFixed(2)}ms`);
  }

  // 发送到分析服务
  analytics.track('websocket_message_performance', {
    type: message.type,
    duration,
  });
}
```

---

## 相关文档

- [自定义 Hooks API](./HOOKS.md) - useWebSocket Hook 详细文档
- [组件文档](./COMPONENTS.md) - Dashboard、ActivityLog 等组件
- [架构文档](./ARCHITECTURE.md) - 系统架构设计
- [测试指南](./TESTING.md) - WebSocket 测试方法

---

**文档版本**: v1.1.0
**最后更新**: 2026-03-18
**维护者**: 🏗️ 架构师 (AI 团队)
