# 7zi 平台实时协作系统设计

> 版本: 1.0  
> 日期: 2026-04-03  
> 状态: 设计文档  

---

## 1. 背景与目标

### 1.1 项目背景

7zi 平台正在开发 v1.12.0 实时协作功能，需要为多用户同时编辑工作流提供完整的协作支持。

### 1.2 现有基础设施

| 组件 | 状态 | 位置 |
|------|------|------|
| WebSocketManager | ✅ 已实现 | `src/lib/websocket-manager.ts` |
| ResourceManager | ✅ 已实现 | `src/lib/utils/ResourceManager.ts` |
| CollaborationStateManager | 🔧 测试中 | `src/__tests__/collaboration/` |
| CursorSyncService | 🔧 测试中 | `src/__tests__/collaboration/` |
| CollaborationMessageHandler | 🔧 测试中 | `src/__tests__/collaboration/` |
| ConflictDetector | 🔧 测试中 | `src/__tests__/collaboration/` |

### 1.3 设计目标

- 支持多用户同时编辑工作流节点
- 实时光标同步，显示其他用户位置
- 冲突解决（编辑-编辑、编辑-删除、移动-删除）
- 协作状态管理（在线用户、编辑锁）
- 离线支持与数据同步

---

## 2. 技术方案对比

### 2.1 CRDT vs OT

| 特性 | CRDT | OT |
|------|------|-----|
| **理论基础** | 无冲突复制数据类型 | 操作转换 |
| **复杂性** | 数学证明，算法复杂 | 实现相对简单 |
| **延迟容忍** | 高，可离线操作 | 低，需要服务器协调 |
| **服务器负担** | 轻（仅广播） | 重（需要转换操作） |
| **内存占用** | 较高（完整历史） | 较低 |
| **典型库** | Yjs, Automerge | ShareDB, Firepad |
| **适用场景** | 离线优先、去中心化 | 中心化、低延迟 |

### 2.2 推荐方案：混合架构

**结论：采用 CRDT (Yjs) 作为核心，配合 OT 风格的服务器协调**

理由：
1. 7zi 平台需要离线支持
2. 工作流节点编辑不是高实时性需求（不像文字编辑）
3. Yjs 有良好的 TypeScript 支持和活跃社区
4. 可与现有 WebSocketManager 无缝集成

---

## 3. 系统架构

### 3.1 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端 (Browser)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   UI Layer  │  │ State Store │  │  Collaboration Client   │  │
│  │  (React)    │  │   (Zustand) │  │    (CollabClient)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│         │                │                     │               │
│         └────────────────┼─────────────────────┘               │
│                          │                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Collaboration Engine (Yjs)                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │  Y.Doc       │  │  Awareness   │  │  UndoManager     │  │  │
│  │  │  (Document)  │  │  (Cursor/    │  │  (Undo/Redo)     │  │  │
│  │  │              │  │   Presence) │  │                  │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          │                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │          WebSocketManager (已实现)                          │  │
│  │          - 自动重连 / 心跳 / 资源清理                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │ WebSocket (wss://)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      服务器端 (Node.js)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Gateway    │  │  Collab     │  │     Redis              │  │
│  │  (WS Server)│  │  Server     │  │  - Presence             │  │
│  │             │  │  (Broadcast)│  │  - Locking             │  │
│  └─────────────┘  └─────────────┘  │  - Rate Limit          │  │
│                                    └─────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Persistence Layer                             │  │
│  │  - PostgreSQL (Document Store + Operation Log)            │  │
│  │  - S3/GCS (Binary State Snapshots)                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 核心组件

#### 3.2.1 CollabClient（客户端协作引擎）

```typescript
interface CollabClient {
  // 连接管理
  connect(sessionId: string, userId: string): Promise<void>;
  disconnect(): Promise<void>;
  
  // 文档操作
  getDocument(): Y.Doc;
  getNode(nodeId: string): Y.Map<any> | undefined;
  updateNode(nodeId: string, changes: Partial<NodeData>): void;
  
  // 光标同步 (通过 Awareness)
  updateCursor(position: CursorPosition): void;
  onCursorChange(callback: (cursors: Map<string, CursorPosition>) => void): void;
  
  // 状态
  getState(): 'connecting' | 'connected' | 'disconnected';
  getOnlineUsers(): CollaborationUser[];
}
```

#### 3.2.2 CollabServer（服务器端）

```typescript
interface CollabServer {
  // 房间管理
  createRoom(sessionId: string): Room;
  getRoom(sessionId: string): Room | undefined;
  
  // 消息处理
  handleJoin(ws: WebSocket, payload: JoinPayload): void;
  handleLeave(ws: WebSocket): void;
  handleSync(ws: WebSocket, data: Uint8Array): void;
  handleAwareness(ws: WebSocket, data: Uint8Array): void;
}
```

#### 3.2.3 Room（房间）

```typescript
interface Room {
  id: string;
  doc: Y.Doc;
  clients: Map<WebSocket, ClientState>;
  awareness: Awareness;
  locks: Map<string, LockInfo>;
  
  // 锁管理
  acquireLock(nodeId: string, userId: string): boolean;
  releaseLock(nodeId: string, userId: string): boolean;
  forceReleaseLock(nodeId: string): void;
  
  // 广播
  broadcast(message: Uint8Array, exclude?: WebSocket): void;
  broadcastAwareness(update: Uint8Array, exclude?: WebSocket): void;
}
```

---

## 4. 冲突解决策略

### 4.1 冲突类型

| 冲突类型 | 描述 | 检测方式 |
|---------|------|---------|
| edit-edit | 两个用户同时编辑同一节点 | 版本向量 + 节点ID |
| edit-delete | 一个编辑，另一个删除 | 操作类型组合 |
| move-delete | 一个移动，另一个删除 | 操作类型组合 |

### 4.2 解决策略

#### 4.2.1 节点级别：编辑锁 + CRDT 自动合并

```
用户A编辑节点 ──┐
               ├──▶ CRDT 自动合并 (Yjs) ──▶ 合并结果
用户B编辑节点 ──┘
```

**对于 JSON 结构的工作流节点**：
- 使用 Y.Map 存储每个节点的属性
- 不同字段的修改自动合并
- 同一字段修改采用 Last-Write-Wins（基于 Yjs 的 LWWRegister）

#### 4.2.2 锁机制（编辑锁）

```typescript
interface EditLock {
  nodeId: string;
  userId: string;
  userName: string;
  lockedAt: number;
  expiresAt: number;  // 30秒超时
}

// 获取锁
async function acquireLock(nodeId: string): Promise<boolean> {
  // 1. 检查 Redis 中是否已有锁
  // 2. 如果有且未过期，检查是否是当前用户
  // 3. 如果无锁或已过期，设置新锁
  // 4. 返回成功/失败
}

// 续期锁
async function renewLock(nodeId: string): Promise<boolean> {
  // 客户端每 10 秒调用一次
}

// 释放锁
async function releaseLock(nodeId: string): Promise<void> {
  // 删除 Redis 中的锁
}
```

#### 4.2.3 策略选择

| 场景 | 策略 |
|------|------|
| 不同字段同时编辑 | ✅ 自动合并 |
| 同一字段同时编辑 | Last-Write-Wins（时间戳） |
| 编辑 + 删除同一节点 | 删除优先（保护数据） |
| 移动 + 删除同一节点 | 删除优先 |
| 节点被其他用户锁定 | 提示用户等待 |

---

## 5. 实时光标同步

### 5.1 实现方案：Yjs Awareness

Awareness 是 Yjs 内置的用于同步本地状态（如光标位置、用户信息）的机制。

```typescript
// 客户端
const awareness = collabClient.awareness;

// 更新本地光标
awareness.setLocalState({
  cursor: {
    nodeId: 'node-123',
    x: 100,
    y: 200,
    selection: { start: 0, end: 10 }
  },
  user: {
    id: userId,
    name: userName,
    color: '#FF5733'
  }
});

// 监听远程光标变化
awareness.on('change', ({ added, updated, removed }) => {
  const states = awareness.getStates();
  // states 是 Map<clientId, localState>
  updateRemoteCursors(states);
});
```

### 5.2 光标数据结构

```typescript
interface CursorState {
  cursor: {
    nodeId?: string;      // 当前光标所在节点
    x: number;             // 屏幕坐标
    y: number;
    selection?: {
      start: number;
      end: number;
    };
  };
  user: {
    id: string;
    name: string;
    color: string;         // 用户颜色（用于区分）
    avatar?: string;
  };
  timestamp: number;
}
```

### 5.3 性能优化

| 优化项 | 策略 |
|--------|------|
| 节流 | 光标移动 16ms 节流（约 60fps） |
| 过滤 | 忽略微小移动（< 2px） |
| 批量 | 合并同一帧内的多次移动 |
| 超时 | 5秒无更新自动隐藏光标 |

---

## 6. 协作状态管理

### 6.1 用户状态

```typescript
interface CollaborationUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  isOnline: boolean;
  lastActivity: number;
  currentNodeId?: string;  // 正在编辑的节点
}
```

### 6.2 状态同步机制

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Client    │ ───▶ │   Server    │ ───▶ │   Redis     │
│  (本地状态)  │      │  (广播)     │      │  (持久化)   │
└─────────────┘      └─────────────┘      └─────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
   用户操作            广播到其他           存储最终状态
   更新本地            客户端
```

### 6.3 事件流

| 事件 | 触发条件 | 处理方式 |
|------|----------|----------|
| user:joined | 用户连接成功 | 更新用户列表，广播给所有人 |
| user:left | 用户断开连接 | 更新用户列表，释放其锁，广播 |
| user:activity | 用户编辑操作 | 更新最后活动时间 |
| lock:acquired | 获取编辑锁成功 | 广播锁状态给所有用户 |
| lock:released | 释放编辑锁 | 广播锁状态 |
| lock:expired | 锁超时 | 自动清理，通知客户端 |

---

## 7. 离线支持

### 7.1 离线架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端 (IndexedDB)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Y.Doc (内存)  ◀──同步──▶  IndexedDB (持久化)               ││
│  │                                                                  ││
│  │  • 操作日志 (yjs-update)                                       ││
│  │  • 文档快照 (定期保存)                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Pending Operations Queue (离线队列)                         ││
│  │  • 本地操作 ——队列──▶ 网络恢复时同步                         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 同步流程

```typescript
// 1. 监听网络状态
window.addEventListener('online', () => {
  syncPendingOperations();
});

// 2. 连接成功时同步
async function onConnected() {
  // 2.1 获取服务端状态
  const serverState = await fetchServerState();
  
  // 2.2 尝试合并
  const merged = Y.mergeRemoteUpdates(localDoc, serverState);
  
  // 2.3 上传本地更新
  const localUpdates = getPendingUpdates();
  await uploadUpdates(localUpdates);
  
  // 2.4 清空待处理队列
  clearPendingUpdates();
}
```

### 7.3 冲突处理（离线场景）

离线期间可能出现冲突，解决策略：

1. **结构冲突**（新增/删除同一节点）：以服务端为准
2. **内容冲突**（编辑同一字段）：Last-Write-Wins
3. **操作顺序**：通过版本向量保证

---

## 8. 消息协议

### 8.1 WebSocket 消息格式

```typescript
// 所有消息使用 Yjs 二进制格式
type YjsMessage = 
  | { type: 'sync-step-1'; data: Uint8Array }      // 同步请求
  | { type: 'sync-step-2'; data: Uint8Array }       // 同步响应
  | { type: 'sync-update'; data: Uint8Array }      // 更新
  | { type: 'awareness'; data: Uint8Array }         // 光标/状态
  | { type: 'lock'; action: 'acquire' | 'release'; nodeId: string }
  | { type: 'presence'; data: PresencePayload };
```

### 8.2 消息流程

```
Client A                  Server                   Client B
    │                        │                         │
    │──── sync-step-1 ──────▶│                         │
    │                        │──── sync-step-1 ───────▶│
    │                        │◀─── sync-step-2 ────────│
    │◀─── sync-step-2 ───────│                         │
    │                        │                         │
    │ (编辑操作)              │                         │
    │──── sync-update ──────▶│                         │
    │                        │──── sync-update ────────▶│
    │                        │                         │
    │ (光标移动)              │                         │
    │──── awareness ────────▶│                         │
    │                        │──── awareness ──────────▶│
    │                        │                         │
```

---

## 9. 数据库设计

### 9.1 PostgreSQL Schema

```sql
-- 协作会话表
CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP  -- 空闲会话过期时间
);

-- 操作日志表 (用于持久化和回放)
CREATE TABLE operation_logs (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES collaboration_sessions(id),
  client_id VARCHAR(255),
  operation_type VARCHAR(50),
  operation_data BYTEA,  -- Yjs 二进制更新
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 用户在线状态 (Redis 更适合，这里备用)
CREATE TABLE user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES collaboration_sessions(id),
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  color VARCHAR(7),
  current_node_id VARCHAR(255),
  last_activity TIMESTAMP DEFAULT NOW(),
  is_online BOOLEAN DEFAULT TRUE,
  UNIQUE(session_id, user_id)
);

-- 索引
CREATE INDEX idx_operation_logs_session ON operation_logs(session_id);
CREATE INDEX idx_operation_logs_timestamp ON operation_logs(timestamp);
CREATE INDEX idx_user_presence_session ON user_presence(session_id);
```

### 9.2 Redis 数据结构

```
# 编辑锁 (String with TTL)
lock:session:{sessionId}:node:{nodeId} = { userId, userName, lockedAt }
TTL: 30s (自动续期)

# 用户在线状态 (Hash)
presence:session:{sessionId}:users = {
  userId1: { name, color, lastActivity },
  userId2: { name, color, lastActivity }
}
TTL: 无 (心跳维持)

# 会话在线用户计数 (Set)
session:{sessionId}:online_users = [userId1, userId2, ...]
```

---

## 10. 实施计划

### 10.1 Phase 1: 基础架构 (Week 1-2)

- [ ] 集成 Yjs 到项目依赖
- [ ] 实现 CollabClient 类
- [ ] 实现 CollabServer (房间管理、消息广播)
- [ ] 与现有 WebSocketManager 集成
- [ ] 单元测试基础连接流程

### 10.2 Phase 2: 核心功能 (Week 3-4)

- [ ] 实现文档同步（Y.Doc）
- [ ] 实现 Awareness 光标同步
- [ ] 实现编辑锁机制（Redis）
- [ ] 实现协作状态管理
- [ ] 前端 UI：在线用户列表、光标显示

### 10.3 Phase 3: 冲突解决 (Week 5-6)

- [ ] 实现 ConflictDetector（检测）
- [ ] 实现冲突解决策略
- [ ] 实现 UndoManager（用户撤销）
- [ ] 测试各种冲突场景

### 10.4 Phase 4: 离线支持 (Week 7-8)

- [ ] IndexedDB 持久化
- [ ] 离线操作队列
- [ ] 网络恢复同步
- [ ] 冲突解决（离线场景）

### 10.5 Phase 5: 生产准备 (Week 9-10)

- [ ] 性能测试与优化
- [ ] 安全审计
- [ ] 文档编写
- [ ] 灰度发布

---

## 11. 技术栈

| 组件 | 技术选型 |
|------|----------|
| CRDT 引擎 | Yjs |
| WebSocket | 现有 WebSocketManager |
| 状态存储 | Redis + PostgreSQL |
| 离线存储 | IndexedDB (via y-indexeddb) |
| 前端状态 | Zustand (现有) |
| 后端框架 | Node.js (现有) |

---

## 12. 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| Yjs 集成复杂度 | 高 | 使用 y-websocket 简化 |
| 离线冲突难以测试 | 中 | 增加集成测试覆盖率 |
| Redis 单点故障 | 高 | 使用 Redis Cluster |
| WebSocket 连接不稳定 | 中 | 依赖现有重连机制 |
| 大文档同步性能 | 中 | 增量同步 + 压缩 |

---

## 13. 附录

### A. Yjs 集成示例

```typescript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

// 1. 创建文档
const doc = new Y.Doc();

// 2. 持久化到 IndexedDB
const persistence = new IndexeddbPersistence('workflow-doc', doc);

// 3. 连接 WebSocket
const wsProvider = new WebsocketProvider(
  'wss://api.7zi.com/collab',
  'room-id',
  doc
);

// 4. 获取节点数据
const nodesMap = doc.getMap('nodes');

// 5. 监听变化
nodesMap.observe(event => {
  console.log('Nodes changed:', event.changes.keys);
});

// 6. 更新节点
doc.transact(() => {
  const node = nodesMap.get(nodeId) as Y.Map<any>;
  node.set('title', 'New Title');
});
```

### B. 参考资料

- [Yjs Documentation](https://docs.yjs.dev/)
- [y-websocket](https://github.com/yjs/y-websocket)
- [CRDT Research Paper](https://arxiv.org/abs/2010.12117)
- [Conflict Resolution in Collaborative Systems](https://research.google/pubs/pub44178/)
