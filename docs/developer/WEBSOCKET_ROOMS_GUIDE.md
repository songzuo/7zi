# WebSocket 房间系统教程

本文档详细介绍 7zi 项目的 WebSocket 房间系统，包括系统架构、房间创建/加入流程、权限配置以及实时协作功能。

## 目录

- [概述](#概述)
- [房间系统架构](#房间系统架构)
- [如何创建/加入房间](#如何创建加入房间)
- [权限配置说明](#权限配置说明)
- [实时协作功能](#实时协作功能)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)

---

## 概述

WebSocket 房间系统是 7zi 平台实时协作的核心基础设施，支持多用户实时通信、状态同步和协作编辑。

### 核心特性

- **实时通信**：毫秒级消息传递，支持文本、二进制数据
- **房间隔离**：每个房间独立的消息空间和状态管理
- **权限控制**：细粒度的房间访问和操作权限
- **状态同步**：自动同步房间状态到所有成员
- **历史记录**：可选的消息历史存储和回放
- **弹性连接**：自动重连、心跳检测、断线恢复

### 技术栈

```yaml
WebSocket:
  library: "ws" / "socket.io"
  protocol: "wss://"
  port: 3001
  
消息格式:
  encoding: "JSON"
  compression: "gzip" (可选)
  
状态管理:
  storage: "Redis"
  persistence: "可选"
```

---

## 房间系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           客户端层                                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │ Web 客户端│  │移动客户端 │  │桌面客户端 │  │  API 客户端│                │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘                │
└───────┼─────────────┼─────────────┼─────────────┼──────────────────────┘
        │             │             │             │
        └─────────────┴──────┬──────┴─────────────┘
                             │ WebSocket 连接
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       WebSocket Gateway                                  │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        连接管理器                                    │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │ │
│  │  │ 连接池      │  │ 心跳检测    │  │ 负载均衡    │                │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        房间管理器                                    │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │ │
│  │  │ 房间注册表  │  │ 成员管理    │  │ 权限检查    │                │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        消息路由器                                    │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │ │
│  │  │ 消息分发    │  │ 广播管理    │  │ 消息过滤    │                │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         服务层                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ 认证服务    │  │ 权限服务    │  │ 状态服务    │  │ 存储服务    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         存储层                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                          Redis Cluster                               ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 ││
│  │  │ 房间状态    │  │ 成员列表    │  │ 消息历史    │                 ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### 核心组件

#### 1. 连接管理器 (Connection Manager)

负责管理所有 WebSocket 连接的生命周期。

```typescript
interface ConnectionManager {
  // 连接池
  connections: Map<string, WebSocketConnection>;
  
  // 方法
  register(socket: WebSocket, userId: string): Connection;
  unregister(connectionId: string): void;
  getConnection(connectionId: string): Connection | undefined;
  getConnectionsByUser(userId: string): Connection[];
  broadcast(message: Message, filter?: Filter): void;
}

interface WebSocketConnection {
  id: string;
  socket: WebSocket;
  userId: string;
  rooms: Set<string>;
  metadata: ConnectionMetadata;
  lastActivity: Date;
  state: 'connecting' | 'connected' | 'disconnecting' | 'disconnected';
}
```

#### 2. 房间管理器 (Room Manager)

管理房间的创建、销毁和成员管理。

```typescript
interface RoomManager {
  // 房间注册表
  rooms: Map<string, Room>;
  
  // 方法
  createRoom(options: CreateRoomOptions): Promise<Room>;
  destroyRoom(roomId: string): Promise<void>;
  getRoom(roomId: string): Room | undefined;
  joinRoom(roomId: string, userId: string, options?: JoinOptions): Promise<void>;
  leaveRoom(roomId: string, userId: string): Promise<void>;
  getMembers(roomId: string): RoomMember[];
}

interface Room {
  id: string;
  name: string;
  type: RoomType;
  owner: string;
  members: Map<string, RoomMember>;
  state: RoomState;
  settings: RoomSettings;
  createdAt: Date;
  updatedAt: Date;
}

type RoomType = 'public' | 'private' | 'invitation-only';

interface RoomMember {
  userId: string;
  role: RoomRole;
  joinedAt: Date;
  lastSeen: Date;
  metadata?: MemberMetadata;
}

type RoomRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest';
```

#### 3. 消息路由器 (Message Router)

处理消息的分发和广播。

```typescript
interface MessageRouter {
  // 方法
  route(message: IncomingMessage): void;
  broadcast(roomId: string, message: Message, exclude?: string[]): void;
  sendToUser(userId: string, message: Message): void;
  sendToRoom(roomId: string, message: Message): void;
}

interface Message {
  id: string;
  type: MessageType;
  roomId?: string;
  sender: string;
  payload: any;
  timestamp: Date;
  metadata?: MessageMetadata;
}

type MessageType = 
  | 'join'           // 加入房间
  | 'leave'          // 离开房间
  | 'message'        // 普通消息
  | 'state_update'   // 状态更新
  | 'action'         // 动作消息
  | 'system'         // 系统消息
  | 'error';         // 错误消息
```

### 房间类型

| 类型 | 访问方式 | 可见性 | 用例 |
|------|----------|--------|------|
| `public` | 任何人可加入 | 公开可见 | 公开聊天室、公告板 |
| `private` | 需要邀请或密码 | 不公开可见 | 私密讨论、项目协作 |
| `invitation-only` | 仅限邀请 | 不公开可见 | 敏感话题、内部会议 |

---

## 如何创建/加入房间

### 客户端 SDK 使用

#### 安装

```bash
npm install @7zi/websocket-client
# 或
yarn add @7zi/websocket-client
```

#### 初始化连接

```typescript
import { WebSocketClient } from '@7zi/websocket-client';

// 创建客户端实例
const client = new WebSocketClient({
  url: 'wss://api.7zi.com/ws',
  auth: {
    token: 'your-auth-token',
    // 或使用 API Key
    apiKey: 'your-api-key',
  },
  options: {
    reconnect: true,
    reconnectInterval: 1000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
  },
});

// 连接到服务器
await client.connect();

// 监听连接状态
client.on('connected', () => {
  console.log('WebSocket 已连接');
});

client.on('disconnected', (reason) => {
  console.log('WebSocket 已断开:', reason);
});

client.on('error', (error) => {
  console.error('WebSocket 错误:', error);
});
```

### 创建房间

#### 基础创建

```typescript
// 创建公开房间
const publicRoom = await client.createRoom({
  name: '技术讨论区',
  type: 'public',
  maxMembers: 100,
  settings: {
    allowAnonymous: false,
    enableHistory: true,
    historyLimit: 1000,
  },
});

console.log('房间创建成功:', publicRoom.id);
```

#### 创建私密房间

```typescript
// 创建私密房间（密码保护）
const privateRoom = await client.createRoom({
  name: '项目内部讨论',
  type: 'private',
  password: 'secure-password-123',
  maxMembers: 20,
  settings: {
    enableHistory: true,
    enableEncryption: true,
    retentionDays: 30,
  },
});

console.log('私密房间创建成功:', privateRoom.id);
```

#### 创建邀请制房间

```typescript
// 创建仅限邀请的房间
const inviteRoom = await client.createRoom({
  name: '董事会会议',
  type: 'invitation-only',
  maxMembers: 10,
  settings: {
    enableRecording: false,
    enableHistory: false,
  },
});

// 生成邀请链接
const inviteLink = await client.generateInviteLink(inviteRoom.id, {
  expiresIn: 3600,        // 1小时有效
  maxUses: 5,             // 最多使用5次
  role: 'member',         // 邀请的用户角色
});

console.log('邀请链接:', inviteLink.url);
```

### 加入房间

#### 通过房间 ID 加入

```typescript
try {
  // 加入公开房间
  await client.joinRoom({
    roomId: 'room-abc123',
  });
  
  console.log('成功加入房间');
} catch (error) {
  console.error('加入失败:', error.message);
}
```

#### 使用密码加入私密房间

```typescript
try {
  // 加入私密房间
  await client.joinRoom({
    roomId: 'room-private-123',
    password: 'secure-password-123',
  });
  
  console.log('成功加入私密房间');
} catch (error) {
  if (error.code === 'INVALID_PASSWORD') {
    console.error('密码错误');
  }
}
```

#### 通过邀请链接加入

```typescript
try {
  // 通过邀请链接加入
  const result = await client.joinByInvite({
    inviteToken: 'invite-token-xyz',
  });
  
  console.log('成功加入房间:', result.roomId);
  console.log('房间角色:', result.role);
} catch (error) {
  if (error.code === 'INVITE_EXPIRED') {
    console.error('邀请已过期');
  } else if (error.code === 'INVITE_USED') {
    console.error('邀请已被使用');
  }
}
```

### 离开房间

```typescript
// 离开房间
await client.leaveRoom('room-abc123');

// 离开所有房间
await client.leaveAllRooms();
```

### 房间管理操作

#### 获取房间信息

```typescript
// 获取单个房间信息
const roomInfo = await client.getRoomInfo('room-abc123');

console.log('房间名称:', roomInfo.name);
console.log('成员数:', roomInfo.memberCount);
console.log('房间类型:', roomInfo.type);

// 获取成员列表
const members = await client.getRoomMembers('room-abc123');

members.forEach(member => {
  console.log(`${member.userId}: ${member.role}`);
});
```

#### 更新房间设置

```typescript
// 更新房间设置（需要管理员权限）
await client.updateRoom('room-abc123', {
  name: '新的房间名称',
  maxMembers: 200,
  settings: {
    enableHistory: false,
  },
});
```

#### 转移房间所有权

```typescript
// 转移房间所有权给其他成员
await client.transferOwnership('room-abc123', 'new-owner-user-id');
```

### 消息发送与接收

#### 发送消息

```typescript
// 发送文本消息
await client.sendMessage({
  roomId: 'room-abc123',
  type: 'message',
  payload: {
    content: '大家好！',
    mimeType: 'text/plain',
  },
});

// 发送富文本消息
await client.sendMessage({
  roomId: 'room-abc123',
  type: 'message',
  payload: {
    content: '<p><strong>重要通知</strong></p>',
    mimeType: 'text/html',
  },
});

// 发送数据消息
await client.sendMessage({
  roomId: 'room-abc123',
  type: 'action',
  payload: {
    action: 'cursor_move',
    position: { x: 100, y: 200 },
  },
});
```

#### 接收消息

```typescript
// 监听房间消息
client.on('message', (message) => {
  console.log('收到消息:', message);
  
  switch (message.type) {
    case 'message':
      console.log(`${message.sender}: ${message.payload.content}`);
      break;
      
    case 'state_update':
      console.log('状态更新:', message.payload);
      break;
      
    case 'action':
      handleAction(message.payload);
      break;
  }
});

// 监听特定房间的消息
client.on('message:room-abc123', (message) => {
  console.log('房间 room-abc123 收到消息:', message);
});

// 监听系统消息
client.on('system', (message) => {
  console.log('系统消息:', message);
  
  // 示例：成员加入/离开通知
  if (message.event === 'member_joined') {
    console.log(`${message.userId} 加入了房间`);
  }
});
```

---

## 权限配置说明

### 权限模型

WebSocket 房间系统采用基于角色的访问控制 (RBAC) 模型。

#### 房间角色

| 角色 | 权限级别 | 主要权限 |
|------|----------|----------|
| `owner` | 最高 | 所有权限 + 转移所有权 + 删除房间 |
| `admin` | 高 | 管理成员 + 修改设置 + 删除消息 |
| `moderator` | 中 | 踢出成员 + 禁言 + 置顶消息 |
| `member` | 标准 | 发送消息 + 查看历史 |
| `guest` | 最低 | 仅发送消息（受限） |

#### 权限矩阵

```typescript
const PERMISSION_MATRIX = {
  // 房间管理
  'room:read': ['owner', 'admin', 'moderator', 'member', 'guest'],
  'room:update': ['owner', 'admin'],
  'room:delete': ['owner'],
  'room:transfer': ['owner'],
  
  // 成员管理
  'member:invite': ['owner', 'admin', 'moderator'],
  'member:kick': ['owner', 'admin', 'moderator'],
  'member:ban': ['owner', 'admin'],
  'member:role:update': ['owner', 'admin'],
  
  // 消息管理
  'message:send': ['owner', 'admin', 'moderator', 'member', 'guest'],
  'message:delete:own': ['owner', 'admin', 'moderator', 'member', 'guest'],
  'message:delete:other': ['owner', 'admin', 'moderator'],
  'message:pin': ['owner', 'admin', 'moderator'],
  
  // 历史记录
  'history:read': ['owner', 'admin', 'moderator', 'member'],
  'history:clear': ['owner', 'admin'],
  
  // 设置
  'settings:read': ['owner', 'admin', 'moderator', 'member'],
  'settings:update': ['owner', 'admin'],
};
```

### 配置示例

#### 房间权限配置文件

```yaml
# /config/rooms/permissions.yaml

rooms:
  default:
    # 默认权限配置
    roles:
      owner:
        permissions:
          - room:*
          - member:*
          - message:*
          - history:*
          - settings:*
          
      admin:
        permissions:
          - room:read
          - room:update
          - member:invite
          - member:kick
          - member:ban
          - message:*
          - history:*
          - settings:*
          
      moderator:
        permissions:
          - room:read
          - member:invite
          - member:kick
          - message:*
          - history:read
          
      member:
        permissions:
          - room:read
          - member:invite
          - message:send
          - message:delete:own
          - history:read
          
      guest:
        permissions:
          - room:read
          - message:send
          
  # 自定义房间权限
  custom:
    - roomId: 'vip-room-123'
      permissions:
        member:
          - message:send
          - history:read
          - special:feature    # 自定义权限
```

#### 动态权限检查

```typescript
// 服务端权限检查中间件
import { PermissionChecker } from '@7zi/permissions';

const checker = new PermissionChecker();

// 检查权限
async function checkPermission(
  userId: string,
  roomId: string,
  permission: string
): Promise<boolean> {
  // 获取用户在房间中的角色
  const role = await roomManager.getMemberRole(roomId, userId);
  
  if (!role) {
    return false;
  }
  
  // 检查权限
  return checker.hasPermission(role, permission);
}

// 在消息处理中使用
client.on('message', async (message) => {
  const hasPermission = await checkPermission(
    message.sender,
    message.roomId,
    'message:send'
  );
  
  if (!hasPermission) {
    client.sendError(message.sender, 'PERMISSION_DENIED', '你没有发送消息的权限');
    return;
  }
  
  // 处理消息...
});
```

### 角色管理 API

```typescript
// 更新成员角色
await client.updateMemberRole({
  roomId: 'room-abc123',
  userId: 'target-user-id',
  role: 'moderator',
});

// 获取成员权限列表
const permissions = await client.getMemberPermissions({
  roomId: 'room-abc123',
  userId: 'user-id',
});

console.log('用户权限:', permissions);
// ['room:read', 'message:send', 'history:read', ...]
```

---

## 实时协作功能

### 协作编辑

#### 文档协作

```typescript
import { DocumentCollaboration } from '@7zi/collaboration';

// 初始化协作文档
const doc = new DocumentCollaboration({
  roomId: 'room-abc123',
  documentId: 'doc-123',
  client: wsClient,
});

// 监听文档变化
doc.on('change', (delta) => {
  console.log('文档变化:', delta);
  applyDelta(delta);
});

// 发送本地变化
doc.applyChange({
  type: 'insert',
  position: 10,
  content: '新插入的文本',
});

// 获取文档状态
const content = doc.getContent();
```

#### 光标同步

```typescript
// 发送光标位置
await client.sendCursorPosition({
  roomId: 'room-abc123',
  documentId: 'doc-123',
  position: {
    line: 10,
    column: 5,
  },
  selection: {
    start: { line: 10, column: 5 },
    end: { line: 10, column: 15 },
  },
});

// 接收其他用户的光标
client.on('cursor_update', (data) => {
  console.log(`用户 ${data.userId} 的光标位置:`, data.position);
  updateCursorDisplay(data.userId, data.position, data.selection);
});
```

### 实时状态同步

#### 在线状态

```typescript
// 设置用户状态
await client.setUserStatus({
  status: 'online',  // online | away | busy | offline
  message: '正在编码中...',
});

// 监听其他用户状态变化
client.on('user_status', (data) => {
  console.log(`用户 ${data.userId} 状态:`, data.status);
});
```

#### 输入状态

```typescript
// 发送输入状态（正在输入...）
let typingTimeout: NodeJS.Timeout;

function onTyping() {
  client.sendTypingIndicator({
    roomId: 'room-abc123',
    isTyping: true,
  });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    client.sendTypingIndicator({
      roomId: 'room-abc123',
      isTyping: false,
    });
  }, 3000);
}

// 监听其他用户的输入状态
client.on('typing', (data) => {
  if (data.isTyping) {
    showTypingIndicator(data.userId);
  } else {
    hideTypingIndicator(data.userId);
  }
});
```

### 文件共享

```typescript
// 上传文件
const fileUpload = await client.uploadFile({
  roomId: 'room-abc123',
  file: fileBlob,
  metadata: {
    name: 'document.pdf',
    mimeType: 'application/pdf',
  },
  onProgress: (progress) => {
    console.log(`上传进度: ${progress}%`);
  },
});

console.log('文件上传成功:', fileUpload.url);

// 发送文件消息
await client.sendMessage({
  roomId: 'room-abc123',
  type: 'message',
  payload: {
    type: 'file',
    fileId: fileUpload.id,
    name: 'document.pdf',
    size: fileUpload.size,
    url: fileUpload.url,
  },
});
```

### 屏幕共享

```typescript
// 开始屏幕共享
const screenShare = await client.startScreenShare({
  roomId: 'room-abc123',
  quality: 'high',
  audio: true,
});

console.log('屏幕共享已开始:', screenShare.streamId);

// 其他用户观看屏幕共享
client.on('screen_share_started', async (data) => {
  const stream = await client.subscribeToScreenShare({
    roomId: data.roomId,
    streamId: data.streamId,
  });
  
  // 显示共享画面
  displayScreenShare(stream);
});

// 停止屏幕共享
await client.stopScreenShare({
  roomId: 'room-abc123',
});
```

### 白板协作

```typescript
import { Whiteboard } from '@7zi/whiteboard';

// 初始化白板
const whiteboard = new Whiteboard({
  roomId: 'room-abc123',
  client: wsClient,
});

// 绘制操作
whiteboard.draw({
  type: 'line',
  points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
  color: '#ff0000',
  width: 2,
});

whiteboard.draw({
  type: 'rectangle',
  bounds: { x: 50, y: 50, width: 200, height: 100 },
  fill: '#00ff00',
});

// 监听其他用户的绘制
whiteboard.on('draw', (action) => {
  console.log('用户绘制:', action);
  renderAction(action);
});

// 撤销/重做
whiteboard.undo();
whiteboard.redo();

// 清空白板
whiteboard.clear();
```

---

## 最佳实践

### 连接管理

```typescript
// 推荐：使用单例模式管理 WebSocket 连接
class WebSocketManager {
  private static instance: WebSocketClient;
  
  static getInstance(): WebSocketClient {
    if (!this.instance) {
      this.instance = new WebSocketClient({
        url: process.env.WS_URL,
        auth: { token: getAuthToken() },
        options: {
          reconnect: true,
          maxReconnectAttempts: 5,
        },
      });
    }
    return this.instance;
  }
}

// 使用
const client = WebSocketManager.getInstance();
```

### 消息处理

```typescript
// 推荐：使用消息处理器模式
class MessageHandler {
  private handlers: Map<string, Handler[]>;
  
  on(type: string, handler: Handler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }
  
  async handle(message: Message) {
    const handlers = this.handlers.get(message.type) || [];
    for (const handler of handlers) {
      await handler(message);
    }
  }
}

// 注册处理器
const handler = new MessageHandler();

handler.on('message', async (msg) => {
  displayMessage(msg);
});

handler.on('state_update', async (msg) => {
  updateState(msg.payload);
});

// 统一处理
client.on('message', (msg) => handler.handle(msg));
```

### 错误处理

```typescript
// 推荐：完善的错误处理
client.on('error', (error) => {
  console.error('WebSocket 错误:', error);
  
  switch (error.code) {
    case 'AUTH_FAILED':
      // 重新认证
      refreshToken().then(token => {
        client.updateAuth({ token });
      });
      break;
      
    case 'ROOM_NOT_FOUND':
      // 房间不存在，可能已被删除
      showNotification('房间已关闭');
      redirectToRoomList();
      break;
      
    case 'PERMISSION_DENIED':
      showNotification('你没有权限执行此操作');
      break;
      
    default:
      showNotification('发生错误，请稍后重试');
  }
});
```

### 性能优化

```typescript
// 推荐：消息节流
import { throttle } from 'lodash';

const throttledSend = throttle((position) => {
  client.sendCursorPosition(position);
}, 100);  // 每 100ms 最多发送一次

document.addEventListener('mousemove', (e) => {
  throttledSend({ x: e.clientX, y: e.clientY });
});

// 推荐：消息批量处理
let messageQueue: Message[] = [];
let flushTimeout: NodeJS.Timeout;

function queueMessage(message: Message) {
  messageQueue.push(message);
  
  clearTimeout(flushTimeout);
  flushTimeout = setTimeout(() => {
    client.sendBatch(messageQueue);
    messageQueue = [];
  }, 50);
}
```

---

## 故障排除

### 常见问题

#### 1. 连接频繁断开

**症状**：WebSocket 连接不稳定，频繁断开重连

**诊断**：
```bash
# 检查服务器状态
curl http://localhost:3000/api/health

# 查看 WebSocket 服务器日志
kubectl logs -l app=websocket-server --tail=100

# 检查网络状况
ping api.7zi.com
```

**解决方案**：
```typescript
// 增加心跳频率
const client = new WebSocketClient({
  options: {
    heartbeatInterval: 15000,  // 15秒心跳
    reconnectInterval: 2000,   // 2秒重连间隔
  },
});
```

#### 2. 消息丢失

**症状**：部分消息未被接收

**诊断**：
```typescript
// 启用消息确认机制
client.enableMessageAck({
  timeout: 5000,
  retryCount: 3,
});

client.on('message:ack', (ack) => {
  console.log('消息确认:', ack.messageId);
});

client.on('message:ack:timeout', (msg) => {
  console.warn('消息确认超时，重试:', msg.id);
});
```

#### 3. 房间加入失败

**症状**：无法加入房间，收到错误

**常见错误及解决方案**：

| 错误码 | 原因 | 解决方案 |
|--------|------|----------|
| `ROOM_NOT_FOUND` | 房间不存在 | 检查房间 ID 或创建新房间 |
| `ROOM_FULL` | 房间已满 | 等待有成员离开或联系管理员 |
| `INVALID_PASSWORD` | 密码错误 | 检查密码是否正确 |
| `BANNED` | 被禁止进入 | 联系房间管理员 |
| `PERMISSION_DENIED` | 权限不足 | 获取邀请或提升权限 |

#### 4. 消息延迟高

**症状**：消息传输延迟明显

**诊断步骤**：
```bash
# 检查服务器负载
kubectl top pods -l app=websocket-server

# 检查 Redis 连接
redis-cli ping

# 查看网络延迟
traceroute api.7zi.com
```

**优化方案**：
```yaml
# 增加 WebSocket 服务器实例
websocket-server:
  replicas: 3
  
# 启用消息压缩
websocket:
  compression:
    enabled: true
    threshold: 1024  # 超过 1KB 的消息压缩
```

### 调试工具

```typescript
// 启用调试模式
const client = new WebSocketClient({
  debug: true,
  logger: console,
});

// 查看连接状态
console.log('连接状态:', client.getState());

// 查看房间列表
console.log('已加入房间:', client.getRooms());

// 查看消息队列
console.log('待发送消息:', client.getPendingMessages());
```

---

## API 参考

### WebSocket 客户端 API

完整 API 文档请参考：[WebSocket API 文档](../WEBSOCKET.md)

### 服务器端 API

```typescript
// 房间管理
POST   /api/rooms                    // 创建房间
GET    /api/rooms/:roomId            // 获取房间信息
PUT    /api/rooms/:roomId            // 更新房间
DELETE /api/rooms/:roomId            // 删除房间

// 成员管理
GET    /api/rooms/:roomId/members    // 获取成员列表
POST   /api/rooms/:roomId/members    // 添加成员
DELETE /api/rooms/:roomId/members/:userId  // 移除成员
PUT    /api/rooms/:roomId/members/:userId/role  // 更新角色

// 邀请管理
POST   /api/rooms/:roomId/invites    // 创建邀请
GET    /api/invites/:inviteId        // 获取邀请信息
POST   /api/invites/:inviteId/accept // 接受邀请
```

---

## 参考资料

- [Agent Scheduler 完整使用指南](./AGENT_SCHEDULER_GUIDE.md)
- [性能监控最佳实践](./PERFORMANCE_MONITORING.md)
- [API 参考文档](../API.md)
- [权限系统文档](../PERMISSIONS.md)

---

*最后更新: 2026-03-31*
*版本: 1.5.0*
