# WebSocket API 文档

**版本**: v1.4.0
**最后更新**: 2026-03-29
**基础路径**: `/api/websocket`

---

## 概述

WebSocket API 提供实时双向通信能力，支持房间系统、权限控制、消息持久化等功能。适用于实时协作、实时通知、实时状态同步等场景。

### v1.4.0 新增功能 (2026-03-29)

| 功能模块       | 完成度 | 描述                             |
| -------------- | ------ | -------------------------------- |
| **房间系统**   | 100%   | 多房间管理、动态创建、可见性控制 |
| **权限控制**   | 100%   | 5 种角色、16 种权限、RBAC 集成   |
| **消息持久化** | 100%   | 内存存储、离线队列、历史查询     |
| **状态同步**   | 100%   | 用户在线状态、输入状态、光标位置 |

### 功能特性

- ✅ 房间系统 - 多房间管理、动态创建、可见性控制
- ✅ 权限控制 - 5 种角色、16 种权限、RBAC 集成
- ✅ 消息持久化 - 内存存储、离线队列、历史查询
- ✅ 实时通知 - 任务分配、评论、系统消息
- ✅ 状态同步 - 用户在线状态、输入状态、光标位置

---

## 连接方式

### WebSocket URL

```
开发环境: ws://localhost:3001
生产环境: wss://7zi.com
```

### 认证方式

#### 方式 1: URL 参数传递 Token

```javascript
const ws = new WebSocket(`wss://7zi.com?token=${encodeURIComponent(jwtToken)}`)
```

#### 方式 2: 握手时发送认证消息

```javascript
const ws = new WebSocket('wss://7zi.com')

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: 'auth',
      payload: {
        token: jwtToken,
      },
    })
  )
}
```

---

## 消息格式

### 标准消息结构

```typescript
interface WebSocketMessage {
  type: string // 消息类型
  id: string // 消息唯一 ID
  timestamp: string // ISO 时间戳
  payload?: unknown // 消息负载
  roomId?: string // 房间 ID (可选)
  userId?: string // 用户 ID (可选)
  [key: string]: unknown // 其他字段
}
```

### 认证消息

```json
{
  "type": "auth",
  "id": "msg-auth-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 房间系统

### 房间类型

| 类型       | 说明     | 示例           |
| ---------- | -------- | -------------- |
| `task`     | 任务房间 | 任务讨论、协作 |
| `project`  | 项目房间 | 项目沟通、文档 |
| `chat`     | 聊天房间 | 实时聊天       |
| `document` | 文档房间 | 协作编辑       |
| `voice`    | 语音房间 | 语音通话       |
| `video`    | 视频房间 | 视频会议       |

### 房间可见性

| 类型          | 说明   | 访问控制           |
| ------------- | ------ | ------------------ |
| `public`      | 公开   | 所有认证用户可加入 |
| `private`     | 私有   | 需要所有者邀请     |
| `invite-only` | 仅邀请 | 需要邀请码         |

### 创建房间

```json
{
  "type": "room:create",
  "id": "msg-create-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "name": "AI 任务讨论",
    "type": "task",
    "visibility": "private",
    "maxParticipants": 10,
    "enableHistory": true,
    "metadata": {
      "taskId": "task-001"
    }
  }
}
```

### 加入房间

```json
{
  "type": "room:join",
  "id": "msg-join-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "roomId": "room-001",
    "password": "optional-password" // 可选，私有房间需要
  }
}
```

### 离开房间

```json
{
  "type": "room:leave",
  "id": "msg-leave-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "roomId": "room-001"
  }
}
```

### 房间消息响应

```json
{
  "type": "room:joined",
  "id": "msg-joined-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "roomId": "room-001",
    "role": "member",
    "participants": [
      {
        "userId": "user-001",
        "name": "John Doe",
        "role": "owner",
        "isOnline": true,
        "lastSeen": "2026-03-29T10:00:00.000Z"
      }
    ],
    "recentMessages": []
  }
}
```

---

## 权限系统

### 角色层级

```
owner > admin > moderator > member > guest
```

| 角色        | 描述   | 默认权限                         |
| ----------- | ------ | -------------------------------- |
| `owner`     | 所有者 | 所有权限                         |
| `admin`     | 管理员 | 管理权限 + 所有房间权限          |
| `moderator` | 版主   | 大部分权限，不能踢出 admin/owner |
| `member`    | 成员   | 基础权限                         |
| `guest`     | 访客   | 只读权限                         |

### 权限列表

#### 房间权限 (7 种)

| 权限           | 说明     | Guest | Member | Moderator | Admin | Owner |
| -------------- | -------- | ----- | ------ | --------- | ----- | ----- |
| `room:join`    | 加入房间 | ✅    | ✅     | ✅        | ✅    | ✅    |
| `room:leave`   | 离开房间 | ✅    | ✅     | ✅        | ✅    | ✅    |
| `room:invite`  | 邀请用户 | ❌    | ❌     | ✅        | ✅    | ✅    |
| `room:kick`    | 踢出用户 | ❌    | ❌     | ✅        | ✅    | ✅    |
| `room:ban`     | 封禁用户 | ❌    | ❌     | ✅        | ✅    | ✅    |
| `room:promote` | 提升角色 | ❌    | ❌     | ❌        | ✅    | ✅    |
| `room:config`  | 修改配置 | ❌    | ❌     | ✅        | ✅    | ✅    |

#### 消息权限 (6 种)

| 权限                 | 说明           | Guest | Member | Moderator | Admin | Owner |
| -------------------- | -------------- | ----- | ------ | --------- | ----- | ----- |
| `message:send`       | 发送消息       | ❌    | ✅     | ✅        | ✅    | ✅    |
| `message:edit`       | 编辑自己的消息 | ✅    | ✅     | ✅        | ✅    | ✅    |
| `message:delete`     | 删除自己的消息 | ✅    | ✅     | ✅        | ✅    | ✅    |
| `message:edit_any`   | 编辑任何消息   | ❌    | ❌     | ✅        | ✅    | ✅    |
| `message:delete_any` | 删除任何消息   | ❌    | ❌     | ✅        | ✅    | ✅    |
| `message:pin`        | 置顶消息       | ❌    | ❌     | ✅        | ✅    | ✅    |

#### 管理权限 (3 种)

| 权限                 | 说明     | Guest | Member | Moderator | Admin | Owner |
| -------------------- | -------- | ----- | ------ | --------- | ----- | ----- |
| `admin:manage_users` | 管理用户 | ❌    | ❌     | ❌        | ✅    | ✅    |
| `admin:manage_roles` | 管理角色 | ❌    | ❌     | ❌        | ✅    | ✅    |
| `admin:delete_room`  | 删除房间 | ❌    | ❌     | ❌        | ✅    | ✅    |

### 权限检查

```json
{
  "type": "permission:check",
  "id": "msg-perm-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "roomId": "room-001",
    "permission": "message:send"
  }
}
```

响应:

```json
{
  "type": "permission:check:response",
  "id": "msg-perm-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "allowed": true,
    "permission": "message:send",
    "roomId": "room-001",
    "userRole": "member"
  }
}
```

---

## 消息系统

### 发送消息

```json
{
  "type": "message:send",
  "id": "msg-send-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "roomId": "room-001",
    "content": "这是一条消息",
    "type": "text",
    "metadata": {
      "mentions": ["user-002"]
    }
  }
}
```

### 消息类型

| 类型       | 说明         |
| ---------- | ------------ |
| `text`     | 文本消息     |
| `image`    | 图片消息     |
| `file`     | 文件消息     |
| `system`   | 系统消息     |
| `reaction` | 反应 (emoji) |

### 编辑消息

```json
{
  "type": "message:edit",
  "id": "msg-edit-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "messageId": "msg-001",
    "content": "编辑后的内容"
  }
}
```

### 删除消息

```json
{
  "type": "message:delete",
  "id": "msg-delete-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "messageId": "msg-001",
    "permanent": false // false = 软删除, true = 永久删除
  }
}
```

### 历史消息查询

```json
{
  "type": "message:history",
  "id": "msg-history-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "roomId": "room-001",
    "before": "2026-03-29T10:00:00.000Z",
    "limit": 50
  }
}
```

响应:

```json
{
  "type": "message:history:response",
  "id": "msg-history-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "messages": [
      {
        "id": "msg-001",
        "roomId": "room-001",
        "userId": "user-001",
        "userName": "John Doe",
        "content": "这是一条消息",
        "type": "text",
        "timestamp": "2026-03-29T10:00:00.000Z",
        "edited": false,
        "deleted": false,
        "reactions": [
          {
            "emoji": "👍",
            "count": 5,
            "users": ["user-001", "user-002"]
          }
        ]
      }
    ],
    "hasMore": true,
    "nextCursor": "2026-03-28T10:00:00.000Z"
  }
}
```

---

## 实时事件

### 用户在线状态

```json
{
  "type": "user:presence",
  "id": "msg-presence-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "userId": "user-001",
    "userName": "John Doe",
    "status": "online", // online | away | offline
    "location": "room-001",
    "lastSeen": "2026-03-29T10:00:00.000Z"
  }
}
```

### 用户输入状态

```json
{
  "type": "user:typing",
  "id": "msg-typing-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "roomId": "room-001",
    "userId": "user-001",
    "userName": "John Doe",
    "isTyping": true
  }
}
```

### 光标位置同步

```json
{
  "type": "cursor:move",
  "id": "msg-cursor-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "roomId": "room-001",
    "userId": "user-001",
    "userName": "John Doe",
    "position": {
      "line": 10,
      "column": 5,
      "path": "/document.md"
    }
  }
}
```

---

## 消息持久化

### 存储策略

- **内存存储**: 每房间最多 10,000 条消息
- **离线队列**: TTL 7 天，每用户 100 条
- **自动清理**: 超出限制时自动删除最旧消息

### 离线消息

用户重新连接时自动推送离线消息：

```json
{
  "type": "message:offline",
  "id": "msg-offline-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "messages": [
      {
        "id": "msg-001",
        "content": "离线时收到的消息",
        "timestamp": "2026-03-29T09:00:00.000Z"
      }
    ]
  }
}
```

---

## 错误处理

### 错误消息格式

```json
{
  "type": "error",
  "id": "msg-error-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "code": "PERMISSION_DENIED",
    "message": "您没有权限执行此操作",
    "details": {
      "permission": "message:send",
      "roomId": "room-001",
      "userRole": "guest"
    }
  }
}
```

### 常见错误码

| 错误码              | 描述           | HTTP 状态码 |
| ------------------- | -------------- | ----------- |
| `AUTH_FAILED`       | 认证失败       | 401         |
| `PERMISSION_DENIED` | 权限不足       | 403         |
| `ROOM_NOT_FOUND`    | 房间不存在     | 404         |
| `ROOM_FULL`         | 房间已满       | 409         |
| `RATE_LIMITED`      | 请求频率过高   | 429         |
| `INVALID_PAYLOAD`   | 无效的消息负载 | 400         |

---

## 心跳机制

### 客户端心跳

客户端每 30 秒发送一次心跳：

```json
{
  "type": "ping",
  "id": "msg-ping-001",
  "timestamp": "2026-03-29T10:00:00.000Z"
}
```

### 服务端心跳响应

```json
{
  "type": "pong",
  "id": "msg-ping-001",
  "timestamp": "2026-03-29T10:00:00.000Z",
  "payload": {
    "serverTime": "2026-03-29T10:00:00.000Z",
    "uptime": 3600
  }
}
```

### 超时处理

- **心跳超时**: 120 秒无心跳自动断开
- **连接超时**: 5 秒未完成握手自动断开

---

## 重连策略

### 指数退避算法

```
第 1 次重连: 3 秒
第 2 次重连: 6 秒
第 3 次重连: 12 秒
第 4 次重连: 24 秒
第 5 次重连: 60 秒 (最大延迟)
```

### 自动重连

```javascript
class AutoReconnectWebSocket {
  constructor(url, options = {}) {
    this.url = url
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5
    this.reconnectInterval = options.reconnectInterval || 3000
    this.autoReconnect = options.autoReconnect !== false

    this.connect()
  }

  connect() {
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    }

    this.ws.onclose = event => {
      console.log('WebSocket disconnected:', event.code)

      if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts), 60000)

        console.log(`Reconnecting in ${delay}ms...`)
        setTimeout(() => this.connect(), delay)
        this.reconnectAttempts++
      }
    }
  }
}
```

---

## 客户端实现示例

### 基础使用

```javascript
// 创建 WebSocket 连接
const ws = new WebSocket('wss://7zi.com?token=' + token)

// 连接打开
ws.onopen = () => {
  console.log('WebSocket connected')

  // 加入房间
  ws.send(
    JSON.stringify({
      type: 'room:join',
      id: generateId(),
      timestamp: new Date().toISOString(),
      payload: { roomId: 'room-001' },
    })
  )
}

// 接收消息
ws.onmessage = event => {
  const message = JSON.parse(event.data)

  switch (message.type) {
    case 'message:send':
      console.log('New message:', message.payload)
      break
    case 'user:presence':
      console.log('User status update:', message.payload)
      break
    case 'error':
      console.error('WebSocket error:', message.payload)
      break
  }
}

// 连接关闭
ws.onclose = event => {
  console.log('WebSocket disconnected:', event.code)
}

// 错误处理
ws.onerror = error => {
  console.error('WebSocket error:', error)
}
```

### React Hook 实现

```typescript
import { useEffect, useRef, useState } from 'react'

interface WebSocketMessage {
  type: string
  id: string
  timestamp: string
  payload?: unknown
}

interface UseWebSocketOptions {
  autoConnect?: boolean
  autoReconnect?: boolean
  maxReconnectAttempts?: number
  onMessage?: (message: WebSocketMessage) => void
  onError?: (error: Event) => void
  onOpen?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const connect = () => {
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = event => {
      setIsConnected(true)
      reconnectAttemptsRef.current = 0
      options.onOpen?.(event)
    }

    ws.onmessage = event => {
      const message = JSON.parse(event.data) as WebSocketMessage
      options.onMessage?.(message)
    }

    ws.onerror = error => {
      options.onError?.(error)
    }

    ws.onclose = event => {
      setIsConnected(false)
      options.onClose?.(event)

      // 自动重连
      if (options.autoReconnect) {
        const maxAttempts = options.maxReconnectAttempts || 5
        if (reconnectAttemptsRef.current < maxAttempts) {
          const delay = Math.min(3000 * Math.pow(2, reconnectAttemptsRef.current), 60000)

          setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, delay)
        }
      }
    }
  }

  const send = (data: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }

  const disconnect = () => {
    wsRef.current?.close()
  }

  useEffect(() => {
    if (options.autoConnect !== false) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [url])

  return {
    isConnected,
    send,
    disconnect,
    connect,
  }
}
```

---

## 性能优化

### 1. 消息批处理

```javascript
const messageQueue = []
let batchTimeout = null

function sendMessage(message) {
  messageQueue.push(message)

  if (!batchTimeout) {
    batchTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'batch',
            messages: messageQueue,
          })
        )
      }
      messageQueue.length = 0
      batchTimeout = null
    }, 100) // 100ms 批处理窗口
  }
}
```

### 2. 消息去重

```javascript
const messageCache = new Set()

function handleMessage(message) {
  const messageId = message.id

  if (messageCache.has(messageId)) {
    return // 已处理过，忽略
  }

  messageCache.add(messageId)

  // 处理消息
  processMessage(message)

  // 5 分钟后清理
  setTimeout(
    () => {
      messageCache.delete(messageId)
    },
    5 * 60 * 1000
  )
}
```

### 3. 心跳优化

```javascript
let lastPingTime = Date.now()
let pongTimeout = null

function sendPing() {
  if (ws.readyState === WebSocket.OPEN) {
    lastPingTime = Date.now()
    ws.send(
      JSON.stringify({
        type: 'ping',
        id: generateId(),
        timestamp: new Date().toISOString(),
      })
    )

    // 等待 pong 响应
    pongTimeout = setTimeout(() => {
      console.warn('Pong timeout, reconnecting...')
      ws.close()
    }, 5000)
  }
}

// 设置心跳间隔
setInterval(sendPing, 30000)

// 处理 pong 响应
ws.onmessage = event => {
  const message = JSON.parse(event.data)
  if (message.type === 'pong') {
    if (pongTimeout) {
      clearTimeout(pongTimeout)
    }
    const rtt = Date.now() - lastPingTime
    console.log('Round-trip time:', rtt, 'ms')
  }
}
```

---

## 安全最佳实践

### 1. Token 验证

```javascript
// 连接时验证 Token
ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: 'auth',
      payload: { token: getAuthToken() },
    })
  )
}

// 监听认证结果
ws.onmessage = event => {
  const message = JSON.parse(event.data)
  if (message.type === 'auth:success') {
    console.log('Authentication successful')
  } else if (message.type === 'auth:failed') {
    console.error('Authentication failed')
    ws.close()
  }
}
```

### 2. 消息验证

```javascript
function validateMessage(message) {
  // 验证必需字段
  if (!message.type || !message.id || !message.timestamp) {
    return false
  }

  // 验证时间戳 (防重放攻击)
  const messageTime = new Date(message.timestamp).getTime()
  const now = Date.now()
  if (Math.abs(now - messageTime) > 60000) {
    return false
  }

  // 验证消息类型
  const validTypes = ['message:send', 'room:join', 'room:leave', 'user:presence']

  return validTypes.includes(message.type)
}

ws.onmessage = event => {
  const message = JSON.parse(event.data)

  if (!validateMessage(message)) {
    console.warn('Invalid message received:', message)
    return
  }

  processMessage(message)
}
```

---

## 调试技巧

### 1. 消息日志

```javascript
ws.onmessage = event => {
  const message = JSON.parse(event.data)

  if (process.env.NODE_ENV === 'development') {
    console.log('[WebSocket]', message.type, message.payload)
  }

  handleMessage(message)
}
```

### 2. 连接状态监控

```javascript
const connectionStates = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}

setInterval(() => {
  console.log(
    'WebSocket state:',
    Object.keys(connectionStates)[ws.readyState],
    'Is connected:',
    ws.readyState === connectionStates.OPEN
  )
}, 5000)
```

---

## 相关文档

- [API.md](../API.md) - API 完整文档
- [RATINGS.md](./ratings.md) - 评分 API
- [SEARCH.md](./search.md) - 搜索 API

---

**维护者**: 🏗️ 架构师 (AI 团队)
**最后更新**: 2026-03-29
