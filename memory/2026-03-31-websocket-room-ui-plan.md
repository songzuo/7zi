# WebSocket 房间系统 UI 规划报告

**设计师**: 🎨 设计师  
**日期**: 2026-03-31  
**版本**: v1.5.0 P1

---

## 1. 后端 API 分析

### 1.1 WebSocket 消息类型

**消息管理类**: `RoomManager` (`src/lib/websocket/rooms.ts`)

| 消息类型 | 操作 | 描述 |
|---------|------|------|
| `room:create` | 创建房间 | `create(options: CreateRoomOptions): Room` |
| `room:join` | 加入房间 | `join(roomId, options): { success, room, participant, offlineMessages }` |
| `room:leave` | 离开房间 | `leave(roomId, userId): { success, participant, roomDestroyed }` |
| `room:kick` | 踢出用户 | `kick(roomId, userId, kickedBy, reason?)` |
| `room:ban` | 封禁用户 | `ban(roomId, userId, bannedBy, reason?)` |
| `room:unban` | 解封用户 | `unban(roomId, userId, unbannedBy)` |
| `room:invite` | 邀请用户 | `invite(roomId, userId, invitedBy)` |
| `room:change-role` | 更改角色 | `changeRole(roomId, userId, newRole, changedBy)` |

### 1.2 事件回调 (EventCallbacks)

| 事件 | 回调签名 |
|------|---------|
| `onUserJoined` | `(room: Room, participant: RoomParticipant) => void` |
| `onUserLeft` | `(room: Room, participant: RoomParticipant) => void` |
| `onRoomCreated` | `(room: Room) => void` |
| `onRoomDestroyed` | `(room: Room) => void` |
| `onUserRoleChanged` | `(room: Room, participant: RoomParticipant, oldRole: UserRole) => void` |
| `onUserBanned` | `(roomId: string, userId: string, bannedBy: string) => void` |

### 1.3 REST API 端点 (TODO 实现)

| 端点 | 方法 | 描述 | 状态 |
|------|------|------|------|
| `/api/rooms` | POST | 创建房间 | ⚠️ TODO |
| `/api/rooms/join` | POST | 加入房间 | ⚠️ TODO |
| `/api/rooms/${roomId}/leave` | POST | 离开房间 | ⚠️ TODO |
| `/api/rooms/${roomId}` | PATCH | 更新房间 | ⚠️ TODO |
| `/api/rooms/${roomId}` | DELETE | 删除房间 | ⚠️ TODO |
| `/api/rooms/${roomId}/transfer` | POST | 转移所有权 | ⚠️ TODO |

### 1.4 核心数据类型

```typescript
// 房间类型
type RoomType = 'task' | 'project' | 'chat' | 'document' | 'voice' | 'video';

// 房间可见性
type RoomVisibility = 'public' | 'private' | 'invite-only';

// 用户角色
type UserRole = 'owner' | 'admin' | 'member' | 'guest';

// 房间参与者
interface RoomParticipant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  role: UserRole;
  joinedAt: Date;
  cursor?: { position: number; selection?: { start: number; end: number } };
  isTyping: boolean;
  lastActivity: Date;
  isOnline: boolean;
}

// 房间
interface Room {
  id: string;
  name: string;
  type: RoomType;
  documentId: string;
  visibility: RoomVisibility;
  ownerId: string;
  participants: Map<string, RoomParticipant>;
  data: RoomData;
  config: RoomConfig;
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
  invites: Set<string>;
  metadata?: Record<string, unknown>;
}
```

---

## 2. 现有 UI 组件状态

### 2.1 组件清单 ✅

| 组件 | 文件 | 状态 | 说明 |
|------|------|------|------|
| **RoomList** | `src/components/rooms/RoomList.tsx` | ✅ 完成 | 房间列表（创建/加入/离开/过滤/搜索） |
| **RoomDetail** | `src/components/rooms/RoomDetail.tsx` | ✅ 完成 | 房间详情（信息/成员/邀请/设置） |
| **RoomInvite** | `src/components/rooms/RoomInvite.tsx` | ✅ 完成 | 邀请组件（链接/二维码） |
| **RoomStatusIndicator** | `src/components/rooms/RoomStatusIndicator.tsx` | ✅ 完成 | 在线状态指示器 |
| **index** | `src/components/rooms/index.ts` | ✅ 完成 | 导出 |

### 2.2 状态管理 ✅

| Store | 文件 | 状态 |
|-------|------|------|
| **room-store** | `src/stores/room-store.ts` | ✅ Zustand store |
| **websocket-store** | `src/stores/websocket-store.ts` | ✅ Socket.IO 状态 |

### 2.3 WebSocket Hooks ✅

| Hook | 文件 | 状态 |
|------|------|------|
| **useWebSocketStatus** | `src/features/websocket/hooks/useWebSocketStatus.ts` | ✅ 连接状态追踪 |

### 2.4 现有功能覆盖

```
✅ RoomList:
   - 显示房间列表（名称、成员数、在线状态、最近活动）
   - 创建房间 Modal
   - 加入房间 Modal
   - 离开房间
   - 过滤：全部/我创建的/我加入的
   - 搜索功能

✅ RoomDetail:
   - 房间信息展示（名称、描述、创建者、时间）
   - 成员列表（头像、角色、在线状态）
   - 邀请功能（邀请码）
   - 管理设置（重命名、密码、转移所有权、删除）

✅ RoomInvite:
   - 邀请链接生成
   - 二维码显示
   - 复制功能

✅ RoomStatusIndicator:
   - 在线/离线状态
   - 在线人数统计
```

### 2.5 缺失部分 ⚠️

| 缺失项 | 优先级 | 说明 |
|--------|--------|------|
| **WebSocket 事件绑定** | P0 | 组件未绑定 RoomManager 事件回调 |
| **REST API 实现** | P0 | 组件中的 API 调用为 TODO |
| **房间类型选择** | P1 | 创建房间时未选择房间类型 |
| **权限管理 UI** | P1 | 管理员踢人/禁言 UI |
| **实时消息** | P1 | 聊天消息显示组件 |
| **光标共享** | P2 | 协作文档光标显示 |
| **Typing 指示器** | P2 | 正在输入提示 |

---

## 3. UI 组件架构设计

### 3.1 组件层级

```
┌─────────────────────────────────────────────────────────────┐
│                     RoomPage (页面)                         │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │   RoomSidebar   │  │        RoomContent              │  │
│  │  ┌───────────┐  │  │  ┌─────────────────────────────┐ │  │
│  │  │RoomList   │  │  │  │      RoomChat / RoomDoc    │ │  │
│  │  │(筛选/搜索)│  │  │  │    (实时消息/协作)          │ │  │
│  │  └───────────┘  │  │  └─────────────────────────────┘ │  │
│  │  ┌───────────┐  │  │  ┌─────────────────────────────┐ │  │
│  │  │RoomDetail │  │  │  │    RoomMembers (侧栏)      │ │  │
│  │  │(详情/成员)│  │  │  │    (在线成员列表)           │ │  │
│  │  └───────────┘  │  │  └─────────────────────────────┘ │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 新增组件

| 组件 | 路径 | 职责 |
|------|------|------|
| **RoomChat** | `components/rooms/RoomChat.tsx` | 实时消息显示和发送 |
| **RoomTypingIndicator** | `components/rooms/RoomTypingIndicator.tsx` | 显示正在输入的用户 |
| **RoomCursorOverlay** | `components/rooms/RoomCursorOverlay.tsx` | 协作者光标显示 |
| **RoomConnectionStatus** | `components/rooms/RoomConnectionStatus.tsx` | WebSocket 连接状态 |
| **useRoomEvents** | `hooks/useRoomEvents.ts` | WebSocket 事件绑定 Hook |

### 3.3 Hook 设计

```typescript
// useRoomEvents.ts - WebSocket 房间事件绑定
interface UseRoomEventsOptions {
  roomId: string;
  onUserJoined?: (participant: RoomParticipant) => void;
  onUserLeft?: (participant: RoomParticipant) => void;
  onTypingUpdate?: (userId: string, isTyping: boolean) => void;
  onCursorUpdate?: (userId: string, cursor: CursorPosition) => void;
  onMessageReceived?: (message: RoomMessage) => void;
}

// 用法
function RoomChat() {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  
  useRoomEvents({
    roomId: currentRoom.id,
    onMessageReceived: (msg) => setMessages(prev => [...prev, msg]),
    onTypingUpdate: (userId, isTyping) => { /* ... */ },
  });
}
```

### 3.4 状态流

```
┌──────────────────────────────────────────────────────────────────┐
│                      WebSocket 连接                               │
│                         │                                        │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    RoomManager                               │ │
│  │  • onUserJoined → useRoomStore.addMember()                  │ │
│  │  • onUserLeft → useRoomStore.removeMember()                 │ │
│  │  • onUserRoleChanged → useRoomStore.updateMember()          │ │
│  │  • room:message → useRoomStore.addMessage()                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Zustand Store                             │ │
│  │  rooms: Room[]                                               │ │
│  │  currentRoom: Room | null                                    │ │
│  │  messages: Record<roomId, RoomMessage[]>                     │ │
│  │  unreadCounts: Record<roomId, number>                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    React Components                          │ │
│  │  RoomList → RoomDetail → RoomChat → RoomMembers              │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. 实现工作量评估

### 4.1 P0 - 核心功能

| 任务 | 复杂度 | 工作量 | 优先级 |
|------|--------|--------|--------|
| **实现 REST API 端点** | 中 | 4-6h | P0 |
| **WebSocket 事件绑定 Hook** | 高 | 3-4h | P0 |
| **RoomChat 组件** | 中 | 4-5h | P0 |
| **组件集成 WebSocket** | 中 | 3-4h | P0 |

### 4.2 P1 - 重要功能

| 任务 | 复杂度 | 工作量 | 优先级 |
|------|--------|--------|--------|
| **房间类型选择 UI** | 低 | 1-2h | P1 |
| **Typing 指示器** | 低 | 1-2h | P1 |
| **成员管理 UI（踢出/禁言）** | 中 | 3-4h | P1 |
| **权限检查集成** | 中 | 2-3h | P1 |

### 4.3 P2 - 增强功能

| 任务 | 复杂度 | 工作量 | 优先级 |
|------|--------|--------|--------|
| **Cursor 共享** | 高 | 6-8h | P2 |
| **消息历史加载** | 中 | 3-4h | P2 |
| **通知集成** | 中 | 2-3h | P2 |

### 4.4 总工作量

| 优先级 | 任务数 | 总工作量 |
|--------|--------|---------|
| P0 | 4 | 14-19h |
| P1 | 4 | 9-13h |
| P2 | 3 | 11-15h |
| **总计** | **11** | **34-47h** |

---

## 5. 推荐实现顺序

### Phase 1: 核心连接 (6-8h)

```
1. 实现 REST API 端点
   - POST /api/rooms
   - POST /api/rooms/join
   - POST /api/rooms/${roomId}/leave
   - PATCH /api/rooms/${roomId}
   - DELETE /api/rooms/${roomId}

2. 创建 useRoomEvents Hook
   - 封装 RoomManager 事件订阅
   - 自动更新 Zustand store

3. 集成到现有组件
   - RoomList → 绑定 WebSocket
   - RoomDetail → 绑定 WebSocket
```

### Phase 2: 实时消息 (6-8h)

```
4. 创建 RoomChat 组件
   - 消息列表显示
   - 消息输入框
   - 消息发送

5. 创建 RoomTypingIndicator 组件
   - 显示正在输入的用户

6. 集成消息功能
   - WebSocket 消息事件处理
   - 离线消息加载
```

### Phase 3: 成员管理 (4-6h)

```
7. 成员管理 UI
   - 踢出成员按钮
   - 禁言功能
   - 角色切换

8. 权限检查
   - 根据角色显示/隐藏功能
   - 权限不足提示
```

### Phase 4: 协作功能 (6-8h)

```
9. Cursor 共享
   - 光标位置同步
   - 光标颜色区分

10. 消息历史
    - 分页加载
    - 滚动加载更多

11. 通知集成
    - 新消息通知
    - 成员加入/离开通知
```

---

## 6. 技术要点

### 6.1 WebSocket 重连策略

```typescript
// 自动重连 + 状态同步
useEffect(() => {
  const wsManager = getWebSocketManager();
  
  wsManager.on('reconnect', () => {
    // 重新加入房间
    roomManager.join(currentRoom.id, currentUser);
  });
  
  return () => {
    wsManager.off('reconnect');
  };
}, []);
```

### 6.2 乐观更新

```typescript
// 发送消息时乐观更新
const sendMessage = async (content: string) => {
  const tempId = `temp-${Date.now()}`;
  const tempMessage = { id: tempId, content, sender: currentUser, timestamp: Date.now() };
  
  // 乐观添加
  addMessage(tempMessage);
  
  try {
    // 发送
    const realMessage = await api.sendMessage(roomId, content);
    // 替换临时消息
    replaceMessage(tempId, realMessage);
  } catch (error) {
    // 移除临时消息
    removeMessage(tempId);
    showError('Failed to send message');
  }
};
```

### 6.3 离线支持

```typescript
// 离线时队列消息
if (!navigator.onLine) {
  queueMessage({ roomId, content, timestamp: Date.now() });
  return;
}

// 上线时发送队列
window.addEventListener('online', () => {
  const queued = getQueuedMessages();
  queued.forEach(msg => sendMessage(msg));
  clearQueue();
});
```

---

## 7. 测试策略

| 测试类型 | 覆盖内容 | 工具 |
|---------|---------|------|
| 单元测试 | Hooks, Store, 工具函数 | Vitest |
| 组件测试 | UI 渲染, 用户交互 | React Testing Library |
| E2E 测试 | 完整房间流程 | Playwright |
| 集成测试 | WebSocket 事件 | Mock WebSocket |

---

**报告完成时间**: 2026-03-31 05:24 GMT+2
**设计师**: 🎨 设计师
