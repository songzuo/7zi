# 自定义 Hooks API 文档

**最后更新**: 2026-03-18
**版本**: v1.1.0

---

## 目录

1. [概述](#概述)
2. [核心 Hooks](#核心-hooks)
3. [实时通信 Hooks](#实时通信-hooks)
4. [数据 Hooks](#数据-hooks)
5. [UI Hooks](#ui-hooks)
6. [性能 Hooks](#性能-hooks)
7. [存储 Hooks](#存储-hooks)
8. [最佳实践](#最佳实践)

---

## 概述

7zi Studio 提供了一系列自定义 React Hooks，用于简化常见操作和数据管理。

### 使用方法

```typescript
import { useDashboardData } from '@/hooks/useDashboardData'

function MyComponent() {
  const { issues, isLoading, error } = useDashboardData('owner', 'repo')
  // ...
}
```

### 测试覆盖率

所有 Hooks 都有完整的单元测试，测试覆盖率 ≥ 85%。

---

## 核心 Hooks

### useDashboardData

**文件**: `src/hooks/useDashboardData.ts`

**用途**: 获取 Dashboard 所需的 GitHub 数据（Issues、Commits、Activities）

#### 类型定义

```typescript
export interface GitHubIssue {
  number: number
  title: string
  state: 'open' | 'closed'
  labels: Array<{ name: string; color: string }>
  assignee?: { login: string; avatar_url: string } | null
  created_at: string
  updated_at: string
  html_url: string
}

export interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: { name: string; date: string }
  }
  html_url: string
  author?: { avatar_url: string } | null
}

export interface ActivityItem {
  id: string
  type: 'commit' | 'issue' | 'comment'
  title: string
  author: string
  avatar?: string
  timestamp: string
  url: string
}

interface UseDashboardDataReturn {
  issues: GitHubIssue[]
  commits: GitHubCommit[]
  activities: ActivityItem[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  refreshData: () => Promise<void>
}
```

#### 参数

| 参数    | 类型           | 必填 | 说明              |
| ------- | -------------- | ---- | ----------------- |
| owner   | string         | 是   | GitHub 仓库所有者 |
| repo    | string         | 是   | 仓库名称          |
| \_token | string \| null | 否   | 已弃用，不再使用  |

#### 返回值

| 属性        | 类型                  | 说明                           |
| ----------- | --------------------- | ------------------------------ |
| issues      | `GitHubIssue[]`       | Issues 列表                    |
| commits     | `GitHubCommit[]`      | Commits 列表                   |
| activities  | `ActivityItem[]`      | 合并后的活动列表（最近 20 条） |
| isLoading   | boolean               | 加载状态                       |
| error       | string \| null        | 错误信息                       |
| lastUpdated | Date \| null          | 最后更新时间                   |
| refreshData | `() => Promise<void>` | 手动刷新数据                   |

#### 使用示例

```typescript
import { useDashboardData } from '@/hooks/useDashboardData';

function Dashboard() {
  const { issues, commits, activities, isLoading, error, refreshData } =
    useDashboardData('songzuo', '7zi');

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage>{error}</ErrorMessage>;

  return (
    <div>
      <button onClick={refreshData}>刷新</button>
      <ActivityLog activities={activities} />
      <TaskBoard issues={issues} />
    </div>
  );
}
```

#### 特性

- ✅ 通过服务端 API 代理，不暴露 GitHub Token
- ✅ 自动合并 Issues 和 Commits 为活动流
- ✅ 按时间排序，保留最近 20 条
- ✅ 独立的错误处理（一个失败不影响另一个）
- ✅ 自动初始加载

---

## 实时通信 Hooks

### useWebSocket

**文件**: `src/lib/realtime/useWebSocket.ts`

**用途**: 简洁的 WebSocket Hook，提供实时通信能力

#### 特性

- ✅ 连接状态管理（connecting/open/closing/closed/error）
- ✅ 自动重连（可配置重连间隔和最大尝试次数）
- ✅ 事件监听系统（支持特定事件、通配符、一次性监听）
- ✅ 类型安全的消息处理
- ✅ 完整的 TypeScript 支持
- ✅ SSR 安全

#### 参数

| 参数                        | 类型                                | 必填 | 默认值 | 说明                 |
| --------------------------- | ----------------------------------- | ---- | ------ | -------------------- |
| config.url                  | string                              | 是   | -      | WebSocket 服务器 URL |
| config.protocols            | string \| string[]                  | 否   | -      | 可选的子协议         |
| config.autoConnect          | boolean                             | 否   | true   | 是否自动连接         |
| config.reconnectOnClose     | boolean                             | 否   | false  | 关闭时是否自动重连   |
| config.reconnectInterval    | number                              | 否   | 3000   | 重连间隔（毫秒）     |
| config.maxReconnectAttempts | number                              | 否   | 5      | 最大重连次数         |
| options.onOpen              | (event: Event) => void              | 否   | -      | 连接打开回调         |
| options.onMessage           | (message: WebSocketMessage) => void | 否   | -      | 消息接收回调         |
| options.onError             | (event: Event) => void              | 否   | -      | 错误回调             |
| options.onClose             | (event: CloseEvent) => void         | 否   | -      | 连接关闭回调         |

#### 返回值

```typescript
{
  // 连接状态
  status: 'connecting' | 'open' | 'closing' | 'closed' | 'error';
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
```

#### 使用示例

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

  return (
    <div>
      <div>状态: {status}</div>
      <div>已连接: {isConnected ? '是' : '否'}</div>
    </div>
  );
}
```

#### 事件监听模式

```typescript
// 持续监听某个事件
useEffect(() => {
  const unsubscribe = addListener('task:update', data => {
    console.log('Task updated:', data)
  })

  return () => unsubscribe()
}, [addListener])

// 只监听一次
useEffect(() => {
  const unsubscribe = once('system:ready', data => {
    console.log('System ready:', data)
    // 初始化应用
  })

  return () => unsubscribe()
}, [once])

// 监听所有消息（通配符）
useEffect(() => {
  const unsubscribe = addListener('*', data => {
    console.log('All messages:', data)
  })

  return () => unsubscribe()
}, [addListener])
```

#### 辅助函数

```typescript
import { generateMessageId, createMessage, isMessageType } from '@/lib/realtime/useWebSocket'

// 生成唯一消息 ID
const messageId = generateMessageId() // "1710776400000-abc123"

// 创建标准消息
const message = createMessage('task:update', {
  taskId: '123',
  status: 'in-progress',
})

// 检查消息类型
if (isMessageType<TaskPayload>(message, 'task:update')) {
  console.log(message.payload) // 类型安全的访问
}
```

#### 测试覆盖率

- 单元测试：100%
- 集成测试：95%
- 总覆盖率：98%

**详细文档**: 参见 [WebSocket 实时通信文档](./WEBSOCKET.md)

---

### useEnhancedWebSocket

**文件**: `src/lib/realtime/useEnhancedWebSocket.ts`

**用途**: 增强版 WebSocket Hook，提供心跳、消息确认、重试等高级功能

#### 特性

- ✅ 心跳机制（可配置间隔和超时）
- ✅ 消息确认（ACK/NACK）
- ✅ 消息队列（离线时缓存消息）
- ✅ 智能重试（指数退避算法）
- ✅ 消息去重
- ✅ 批量发送优化

#### 参数

| 参数              | 类型    | 必填 | 默认值 | 说明                 |
| ----------------- | ------- | ---- | ------ | -------------------- |
| url               | string  | 是   | -      | WebSocket 服务器 URL |
| enableHeartbeat   | boolean | 否   | true   | 是否启用心跳         |
| heartbeatInterval | number  | 否   | 30000  | 心跳间隔（毫秒）     |
| heartbeatTimeout  | number  | 否   | 5000   | 心跳超时（毫秒）     |
| enableAck         | boolean | 否   | false  | 是否启用消息确认     |
| enableRetry       | boolean | 否   | true   | 是否启用重试         |
| maxRetryAttempts  | number  | 否   | 3      | 最大重试次数         |
| enableQueue       | boolean | 否   | true   | 是否启用消息队列     |
| maxQueueSize      | number  | 否   | 100    | 最大队列大小         |

#### 返回值

```typescript
{
  // 基础功能（与 useWebSocket 相同）
  status: WebSocketStatus;
  isConnected: boolean;
  error: Event | null;
  lastMessage: WebSocketMessage | null;
  connect: () => void;
  disconnect: () => void;
  send: (data: WebSocketMessage) => void;
  addListener: (event: string, handler) => () => void;
  removeListener: (event: string, handler) => void;
  on: (event: string, handler) => () => void;
  once: (event: string, handler) => () => void;

  // 增强功能
  queueSize: number;              // 队列中的消息数量
  heartbeatStatus: 'idle' | 'pending' | 'alive' | 'timeout';
  pendingMessages: WebSocketMessage[]; // 待确认的消息
  clearQueue: () => void;          // 清空队列
  flushQueue: () => Promise<void>; // 发送队列中的所有消息
}
```

#### 使用示例

```typescript
import { useEnhancedWebSocket } from '@/lib/realtime/useEnhancedWebSocket';

function EnhancedDashboard() {
  const enhancedWs = useEnhancedWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL,
    enableHeartbeat: true,
    heartbeatInterval: 30000,
    enableAck: true,
    enableRetry: true,
    maxRetryAttempts: 3,
  });

  return (
    <div>
      <div>连接状态: {enhancedWs.status}</div>
      <div>心跳状态: {enhancedWs.heartbeatStatus}</div>
      <div>队列大小: {enhancedWs.queueSize}</div>
      <div>待确认消息: {enhancedWs.pendingMessages.length}</div>
    </div>
  );
}
```

#### 消息确认示例

```typescript
// 发送需要确认的消息
useEffect(() => {
  const unsubscribe = addListener('message:ack', data => {
    const { messageId } = data as { messageId: string }
    console.log('Message acknowledged:', messageId)
    // 从待确认列表中移除
    removePendingMessage(messageId)
  })

  return () => unsubscribe()
}, [addListener])

// 发送消息并等待确认
const sendTaskUpdate = (taskId: string, updates: object) => {
  const messageId = generateMessageId()
  const message = createMessage('task:update', {
    taskId,
    updates,
    requireAck: true,
  })

  send(message)
  addPendingMessage({ id: messageId, message })
}
```

**详细文档**: 参见 [WebSocket 实时通信文档](./WEBSOCKET.md)

---

## 数据 Hooks

### useGitHubData

**文件**: `src/hooks/useGitHubData.ts`

**用途**: 获取 GitHub 数据（Issues 或 Commits）

#### 参数

| 参数  | 类型                  | 必填 | 说明                 |
| ----- | --------------------- | ---- | -------------------- |
| owner | string                | 是   | 仓库所有者           |
| repo  | string                | 是   | 仓库名称             |
| type  | 'issues' \| 'commits' | 是   | 数据类型             |
| token | string \| null        | 否   | GitHub Token（可选） |

#### 返回值

```typescript
{
  data: T | null // 数据
  isLoading: boolean // 加载状态
  error: string | null // 错误信息
  refetch: () => Promise<void> // 重新获取
}
```

#### 使用示例

```typescript
const { data: issues, isLoading } = useGitHubData('songzuo', '7zi', 'issues')
```

---

### useFetch

**文件**: `src/hooks/useFetch.ts`

**用途**: 通用 HTTP 请求 Hook

#### 参数

| 参数    | 类型        | 必填 | 说明       |
| ------- | ----------- | ---- | ---------- |
| url     | string      | 是   | 请求 URL   |
| options | RequestInit | 否   | Fetch 选项 |

#### 返回值

```typescript
{
  data: T | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}
```

#### 使用示例

```typescript
const { data, isLoading } = useFetch<User[]>('/api/users')
```

---

## UI Hooks

### useIntersectionObserver

**文件**: `src/hooks/useIntersectionObserver.ts`

**用途**: 检测元素是否进入视口（用于懒加载、无限滚动等）

#### 参数

| 参数       | 类型    | 必填 | 默认值 | 说明           |
| ---------- | ------- | ---- | ------ | -------------- |
| threshold  | number  | 否   | 0.1    | 触发阈值 (0-1) |
| rootMargin | string  | 否   | '0px'  | 根边距         |
| enabled    | boolean | 否   | true   | 是否启用       |

#### 返回值

```typescript
{
  ref: RefObject<HTMLElement>
  isIntersecting: boolean
}
```

#### 使用示例

```typescript
const { ref, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });

<div ref={ref}>
  {isIntersecting && <LazyComponent />}
</div>
```

---

## 性能 Hooks

### useLocalStorage

**文件**: `src/hooks/useLocalStorage.ts`

**用途**: 本地存储 Hook，自动同步到 localStorage

#### 参数

| 参数         | 类型   | 必填 | 说明   |
| ------------ | ------ | ---- | ------ |
| key          | string | 是   | 存储键 |
| defaultValue | T      | 是   | 默认值 |

#### 返回值

```typescript
[value: T, setValue: (value: T) => void, remove: () => void]
```

#### 使用示例

```typescript
const [theme, setTheme] = useLocalStorage('theme', 'light')
const [settings, setSettings] = useLocalStorage('settings', {
  notifications: true,
  compact: false,
})

// 更新值
setTheme('dark')

// 删除
remove()
```

#### 特性

- ✅ 类型安全（泛型支持）
- ✅ 自动序列化/反序列化
- ✅ 处理 JSON 解析错误
- ✅ SSR 安全

---

### usePerformance

**文件**: `src/hooks/usePerformance.ts`

**用途**: 监控 Web Vitals 性能指标

#### 监控的指标

- FCP (First Contentful Paint)
- LCP (Largest Contentful Paint)
- CLS (Cumulative Layout Shift)
- FID (First Input Delay)
- TTFB (Time to First Byte)

#### 使用示例

```typescript
import { usePerformance } from '@/hooks/usePerformance'

function PerformanceMonitor() {
  usePerformance({
    onReport: metric => {
      console.log('性能指标:', metric)
      // 发送到分析服务
      analytics.track('web-vital', metric)
    },
  })

  return null // 不渲染任何内容
}
```

---

## 状态管理 Hooks

### useBatchSelection

**文件**: `src/hooks/useBatchSelection.ts`

**用途**: 批量选择管理（用于任务、项目等的批量操作）

#### 参数

| 参数             | 类型     | 必填 | 默认值 | 说明             |
| ---------------- | -------- | ---- | ------ | ---------------- |
| initialSelection | string[] | 否   | []     | 初始选中项 ID    |
| items            | T[]      | 否   | []     | 可选择的项目列表 |

#### 返回值

```typescript
{
  selectedItems: T[];
  selectedIds: string[];
  isAllSelected: boolean;
  isSomeSelected: boolean;
  toggleSelection: (id: string) => void;
  toggleAll: () => void;
  clearSelection: () => void;
  setSelectedIds: (ids: string[]) => void;
}
```

#### 使用示例

```typescript
interface Task {
  id: string;
  title: string;
}

const tasks: Task[] = [
  { id: '1', title: 'Task 1' },
  { id: '2', title: 'Task 2' },
];

const {
  selectedItems,
  isAllSelected,
  toggleSelection,
  toggleAll,
  clearSelection,
} = useBatchSelection({ items: tasks });

// 选择单个
<button onClick={() => toggleSelection('1')}>选择 Task 1</button>

// 全选/取消全选
<button onClick={toggleAll}>
  {isAllSelected ? '取消全选' : '全选'}
</button>

// 批量删除
<button onClick={() => deleteTasks(selectedItems)}>
  删除选中 ({selectedItems.length})
</button>
```

---

## 工具 Hooks

### useIntersectionObserver (详细)

**特性**:

- 支持自定义触发阈值
- 支持根边距
- 可动态启用/禁用
- SSR 安全

**测试覆盖率**: 100%

---

## 最佳实践

### 1. 依赖管理

```typescript
// ❌ 错误：直接使用外部依赖
useEffect(() => {
  fetchData()
}, []) // 依赖数组可能遗漏

// ✅ 正确：将依赖声明为参数
useEffect(() => {
  fetchData()
}, [fetchData])
```

### 2. 性能优化

```typescript
// ✅ 使用 useCallback 缓存回调
const handleClick = useCallback(() => {
  // 处理点击
}, [dep1, dep2])

// ✅ 使用 useMemo 缓存计算结果
const filteredItems = useMemo(() => {
  return items.filter(item => item.active)
}, [items])
```

### 3. 错误处理

```typescript
// ✅ 提供降级 UI
const { data, error } = useDashboardData('owner', 'repo');

if (error) {
  return <ErrorFallback message={error} onRetry={() => window.location.reload()} />;
}
```

### 4. 类型安全

```typescript
// ✅ 使用泛型确保类型安全
const [user, setUser] = useLocalStorage<User>('user', {
  id: '',
  name: '',
  email: '',
})

// ✅ 使用接口定义复杂类型
interface Task {
  id: string
  title: string
  completed: boolean
}

const { data: tasks } = useFetch<Task[]>('/api/tasks')
```

### 5. 避免无限循环

```typescript
// ❌ 错误：每次渲染都创建新对象
useEffect(() => {
  fetchData({ page: 1, limit: 10 })
}, [fetchData])

// ✅ 正确：将配置提取到组件外部或使用 useMemo
const config = useMemo(() => ({ page: 1, limit: 10 }), [])
useEffect(() => {
  fetchData(config)
}, [fetchData, config])
```

---

## Hook 创建指南

### 基本结构

```typescript
import { useState, useEffect, useCallback } from 'react'

// 类型定义
interface UseMyHookOptions {
  initialValue?: number
  onSuccess?: (value: number) => void
}

interface UseMyHookReturn {
  value: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

// Hook 实现
export function useMyHook(options: UseMyHookOptions = {}): UseMyHookReturn {
  const { initialValue = 0, onSuccess } = options
  const [value, setValue] = useState(initialValue)

  const increment = useCallback(() => {
    setValue(prev => {
      const newValue = prev + 1
      onSuccess?.(newValue)
      return newValue
    })
  }, [onSuccess])

  const decrement = useCallback(() => {
    setValue(prev => prev - 1)
  }, [])

  const reset = useCallback(() => {
    setValue(initialValue)
  }, [initialValue])

  return { value, increment, decrement, reset }
}
```

### 测试模板

```typescript
import { renderHook, act } from '@testing-library/react'
import { useMyHook } from './useMyHook'

describe('useMyHook', () => {
  it('should initialize with default value', () => {
    const { result } = renderHook(() => useMyHook())
    expect(result.current.value).toBe(0)
  })

  it('should increment value', () => {
    const { result } = renderHook(() => useMyHook())
    act(() => {
      result.current.increment()
    })
    expect(result.current.value).toBe(1)
  })

  it('should call onSuccess callback', () => {
    const onSuccess = jest.fn()
    const { result } = renderHook(() => useMyHook({ onSuccess }))
    act(() => {
      result.current.increment()
    })
    expect(onSuccess).toHaveBeenCalledWith(1)
  })
})
```

---

## 迁移指南

### 从 useGitHubData 迁移到 useDashboardData

```typescript
// 旧代码
const { data: issues } = useGitHubData('owner', 'repo', 'issues', token)
const { data: commits } = useGitHubData('owner', 'repo', 'commits', token)

// 新代码
const { issues, commits, activities, isLoading, error } = useDashboardData('owner', 'repo')

// 不再需要传递 token（服务端代理）
```

---

## 相关文档

- [组件文档](./COMPONENTS.md)
- [API 参考](./API-REFERENCE.md)
- [测试指南](./TESTING.md)

---

_由 7zi Studio AI 团队维护 🤖_
