# v1.11.0 实时协作协议设计

**版本**: v1.11.0  
**创建日期**: 2026-04-03  
**状态**: 设计完成  
**架构师**: 🏗️ 架构师 (AI 团队)

---

## 目录

1. [概述](#概述)
2. [WebSocket 消息协议](#websocket-消息协议)
3. [Y.js 文档存储方案](#yjs-文档存储方案)
4. [多房间并发处理架构](#多房间并发处理架构)
5. [消息格式详解](#消息格式详解)
6. [错误处理](#错误处理)
7. [安全考虑](#安全考虑)
8. [性能优化](#性能优化)

---

## 概述

### 背景

v1.11.0 引入基于 **Y.js** 的实时协作引擎，支持多用户同时编辑文档、画布、工作流，实现操作级别（CRDT）的最终一致性。

### 核心目标

| 目标 | 描述 |
|------|------|
| **实时同步** | <50ms 延迟的操作传播 |
| **离线支持** | 本地操作队列，重连后自动合并 |
| **冲突解决** | 基于 Y.js CRDT 自动合并，无人工干预 |
| **多房间隔离** | 房间间完全独立，支持 1000+ 并发房间 |
| **持久化** | Redis + 文件双层存储，支持崩溃恢复 |

### 技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| **CRDT 引擎** | Y.js | 成熟稳定，Provider 生态完善 |
| **传输层** | WebSocket | 双向、低延迟 |
| **文档存储** | y-leveldb + Redis | 持久化 + 热数据缓存 |
| **消息协议** | 定制 JSON + Y.js update 二进制 | 平衡可读性和性能 |
| **房间管理** | In-Memory Map + Redis 持久化 | 高性能 + 分布式支持 |

---

## WebSocket 消息协议

### 连接建立

```
客户端                                服务端
  |                                     |
  |  1. HTTP/WS Upgrade                 |
  |----------------------------------->|
  |                                     |
  |  2. 101 Switching Protocols         |
  |<-----------------------------------|
  |                                     |
  |  3. Auth Message                    |
  |----------------------------------->|
  |                                     |
  |  4. Auth Response (success/fail)   |
  |<-----------------------------------|
  |                                     |
  |  5. Join Room                      |
  |----------------------------------->|
  |                                     |
  |  6. Room State + Y.js State        |
  |<-----------------------------------|
  |                                     |
  |  7. 实时协作开始                    |
  |<===================================>|
```

### 消息帧格式

所有 WebSocket 消息均为 JSON 格式（除 Y.js update）：

```typescript
interface WebSocketFrame {
  type: MessageType;           // 消息类型
  id: string;                 // 唯一消息 ID (UUID v4)
  timestamp: number;          // Unix timestamp (ms)
  roomId: string;             // 房间 ID
  userId: string;             // 用户 ID
  payload: MessagePayload;    // 消息负载
  meta?: MessageMeta;         // 可选元数据
}

type MessageType = 
  // 认证与房间
  | 'auth:request'
  | 'auth:response'
  | 'room:join'
  | 'room:leave'
  | 'room:state'
  
  // Y.js 同步
  | 'sync:step1'              // 客户端请求同步
  | 'sync:step2'              // 服务端返回同步
  | 'sync:update'             // Y.js 更新
  | 'sync:awareness'         // 光标/选择状态
  
  // 操作消息
  | 'doc:operation'           // 文档操作
  | 'canvas:operation'        // 画布操作
  | 'workflow:operation'       // 工作流操作
  
  // 状态消息
  | 'presence:update'          // 用户在线状态
  | 'cursor:move'             // 光标位置
  | 'selection:change'        // 选择变更
  
  // 心跳
  | 'ping'
  | 'pong';

interface MessageMeta {
  requestId?: string;         // 关联请求 ID
  version?: number;           // 消息版本
  retryCount?: number;        // 重试次数
  compression?: 'gzip' | 'lz4'; // 压缩算法
}
```

### 操作类型详解

#### 1. auth:request / auth:response

**请求**:
```typescript
interface AuthRequest {
  type: 'auth:request';
  payload: {
    token: string;            // JWT token
    clientId: string;         // 客户端唯一 ID
    clientVersion: string;     // 客户端版本
    capabilities: string[];   // 支持的能力
  };
}
```

**响应**:
```typescript
interface AuthResponse {
  type: 'auth:response';
  payload: {
    success: boolean;
    userId?: string;
    sessionId?: string;
    expiresAt?: number;
    error?: {
      code: string;
      message: string;
    };
  };
}
```

#### 2. room:join / room:leave

**加入请求**:
```typescript
interface RoomJoinRequest {
  type: 'room:join';
  payload: {
    roomId: string;
    roomType: 'document' | 'canvas' | 'workflow' | 'whiteboard';
    password?: string;        // 私有房间密码
    lastEventId?: string;     // 离线恢复用
  };
}
```

**加入响应**:
```typescript
interface RoomJoinResponse {
  type: 'room:state';
  payload: {
    roomId: string;
    participants: Participant[];
    yjsState: Uint8Array;     // Y.js 文档状态
    awareness: AwarenessState; // 当前光标/选择状态
    serverVersion: number;    // 服务器文档版本
    canWrite: boolean;       // 是否有写权限
  };
}

interface Participant {
  userId: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joinedAt: number;
  isOnline: boolean;
}
```

#### 3. sync:step1 / sync:step2 (Y.js 同步)

**Step 1 (客户端 → 服务端)**:
```typescript
interface SyncStep1 {
  type: 'sync:step1';
  payload: {
    clientId: string;
    stateVector: Uint8Array;  // 客户端当前状态向量
  };
}
```

**Step 2 (服务端 → 客户端)**:
```typescript
interface SyncStep2 {
  type: 'sync:step2';
  payload: {
    update: Uint8Array;       // 服务端缺失的更新
    stateVector: Uint8Array;  // 服务端完整状态向量
  };
}
```

#### 4. sync:update (Y.js 更新)

```typescript
interface SyncUpdate {
  type: 'sync:update';
  payload: {
    update: Uint8Array;      // Y.js update 二进制
    transactionId?: string;   // 事务 ID (用于调试)
    timestamp: number;        // 更新产生时间
  };
}
```

#### 5. sync:awareness (光标/选择状态)

```typescript
interface SyncAwareness {
  type: 'sync:awareness';
  payload: {
    clientId: string;
    state: {
      user: {
        id: string;
        name: string;
        color: string;        // 协作用户颜色
      };
      cursor?: {
        anchor: RelativePosition;  // 锚点位置
        head: RelativePosition;     // 光标位置
      };
      selection?: RelativePosition[]; // 选择范围
    };
  };
}
```

#### 6. doc:operation (文档操作)

```typescript
interface DocOperation {
  type: 'doc:operation';
  payload: {
    operation: 'insert' | 'delete' | 'format' | 'replace';
    path: (string | number)[];      // JSON path
    position?: { line: number; column: number };
    content?: string;
    length?: number;
    attributes?: Record<string, any>;
    timestamp: number;
  };
}
```

#### 7. canvas:operation (画布操作)

```typescript
interface CanvasOperation {
  type: 'canvas:operation';
  payload: {
    operation: 'add' | 'update' | 'delete' | 'move' | 'resize' | 'rotate';
    elementId: string;
    elementType: 'shape' | 'image' | 'text' | 'connector' | 'group';
    changes: {
      x?: number;
      y?: number;
      width?: number;
      height?:_number;
      rotation?: number;
      style?: Record<string, any>;
      content?: string;
    };
    timestamp: number;
  };
}
```

#### 8. workflow:operation (工作流操作)

```typescript
interface WorkflowOperation {
  type: 'workflow:operation';
  payload: {
    operation: 'node:add' | 'node:update' | 'node:delete' | 
               | 'edge:add' | 'edge:update' | 'edge:delete' |
               | 'execute' | 'pause' | 'resume' | 'cancel';
    nodeId?: string;
    edgeId?: string;
    data: Record<string, any>;
    timestamp: number;
  };
}
```

#### 9. presence:update (在线状态)

```typescript
interface PresenceUpdate {
  type: 'presence:update';
  payload: {
    userId: string;
    status: 'online' | 'away' | 'busy' | 'offline';
    lastSeen?: number;
    customStatus?: string;
  };
}
```

---

## Y.js 文档存储方案

### 存储架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      客户端 (Client)                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Y.Doc                                                    │   │
│  │  ├── Y.Text (document)     // 文档内容                    │   │
│  │  ├── Y.Map (canvas)        // 画布元素                    │   │
│  │  ├── Y.Map (workflow)      // 工作流节点/边              │   │
│  │  └── Y.Awareness           // 光标/选择/在线状态           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              │ WebSocket                        │
│                              ▼                                   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      服务端 (Server)                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Y.Doc (per room)                                        │   │
│  │  ├── Y.Text / Y.Map (共享文档状态)                        │   │
│  │  └── Persistence Layer                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                   │
│     ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│     │  L1 Cache  │  │  L2 Redis │  │ L3 LevelDB │             │
│     │  (Memory)  │  │ (热数据)  │  │  (持久化)  │             │
│     │  100 房间  │  │  1000 房间 │  │  无限     │             │
│     │  <1ms     │  │  <10ms    │  │  <100ms   │             │
│     └────────────┘  └────────────┘  └────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### 存储层详解

#### L1: 内存缓存 (In-Memory)

```typescript
interface L1CacheConfig {
  maxRooms: number;          // 最大缓存房间数 (默认: 100)
  maxUpdatesPerRoom: number;  // 每房间最大更新数 (默认: 10000)
  ttlMs: number;              // 过期时间 (默认: 1小时)
  evictionPolicy: 'lru' | 'lfu' | 'fifo'; // 淘汰策略
}

// 内存存储实现
class YjsMemoryStore {
  private docs: Map<string, Y.Doc> = new Map();
  private meta: Map<string, RoomMeta> = new Map();
  
  // LRU 淘汰
  private accessOrder: string[] = [];
  
  async getDoc(roomId: string): Promise<Y.Doc | null> {
    const doc = this.docs.get(roomId);
    if (doc) {
      this.touch(roomId); // 更新访问顺序
    }
    return doc || null;
  }
  
  async setDoc(roomId: string, doc: Y.Doc): Promise<void> {
    if (this.docs.size >= this.config.maxRooms) {
      await this.evict(); // 淘汰最久未使用的
    }
    this.docs.set(roomId, doc);
    this.meta.set(roomId, {
      createdAt: Date.now(),
      lastAccessAt: Date.now(),
      updateCount: 0
    });
  }
  
  async deleteDoc(roomId: string): Promise<void> {
    const doc = this.docs.get(roomId);
    if (doc) {
      doc.destroy();
      this.docs.delete(roomId);
      this.meta.delete(roomId);
    }
  }
}
```

#### L2: Redis (热数据)

```typescript
interface L2RedisConfig {
  keyPrefix: string;         // 键前缀 (默认: 'yjs:')
  maxRooms: number;          // 最大缓存房间数 (默认: 1000)
  ttlSeconds: number;        // 过期时间 (默认: 24小时)
  updateChannel: string;     // 更新通知频道
}

interface RedisStore {
  // Y.js 状态存储
  async saveState(roomId: string, state: Uint8Array): Promise<void>;
  async getState(roomId: string): Promise<Uint8Array | null>;
  
  // 增量更新
  async appendUpdate(roomId: string, update: Uint8Array): Promise<void>;
  async getUpdates(roomId: string, fromVersion: number): Promise<Uint8Array[]>;
  
  // 房间元数据
  async setRoomMeta(roomId: string, meta: RoomMeta): Promise<void>;
  async getRoomMeta(roomId: string): Promise<RoomMeta | null>;
  
  // 分布式锁
  async acquireLock(roomId: string, ttlMs: number): Promise<boolean>;
  async releaseLock(roomId: string): Promise<void>;
}

// Redis 数据结构设计
// yjs:state:{roomId}     -> Y.js 文档状态 (二进制)
// yjs:updates:{roomId}   -> List of Y.js updates (用于增量同步)
// yjs:meta:{roomId}      -> Hash of room metadata
// yjs:rooms:active       -> Set of active room IDs
// yjs:lock:{roomId}      -> Lock for write operations
```

#### L3: LevelDB (持久化)

```typescript
interface L3LevelDBConfig {
  dbPath: string;            // 数据库路径
  maxUpdates: number;        // 最大更新日志数 (默认: 1000)
  compactionIntervalMs: number; // 压缩间隔 (默认: 1小时)
}

interface LevelDBStore {
  async persistState(roomId: string, state: Uint8Array): Promise<void>;
  async loadState(roomId: string): Promise<Uint8Array | null>;
  async appendUpdate(roomId: string, update: Uint8Array): Promise<void>;
  async getUpdates(roomId: string, fromUpdateId: string): Promise<Uint8Array[]>;
  async compact(roomId: string): Promise<void>; // 合并更新为快照
}
```

### 持久化 Provider

```typescript
// Y.js Persistence Provider 链
class YjsPersistenceChain implements Y.Persistence {
  constructor(
    private memory: YjsMemoryStore,
    private redis: RedisStore,
    private leveldb: LevelDBStore,
    private options: {
      syncIntervalMs: number;      // 同步间隔
      persistThreshold: number;    // 持久化阈值
      compactionIntervalMs: number; // 压缩间隔
    }
  ) {}
  
  // 绑定文档
  bindState(roomId: string, ydoc: Y.Doc): void {
    // 1. 监听文档更新
    ydoc.on('update', (update: Uint8Array, origin: any) => {
      this.onUpdate(roomId, ydoc, update);
    });
    
    // 2. 加载初始状态 (Memory -> Redis -> LevelDB)
    await this.loadInitialState(roomId, ydoc);
    
    // 3. 启动定期同步
    this.startSyncInterval(roomId);
  }
  
  // 更新处理
  private async onUpdate(roomId: string, ydoc: Y.Doc, update: Uint8Array): Promise<void> {
    // 1. 更新内存
    await this.memory.appendUpdate(roomId, update);
    
    // 2. 更新 Redis (异步，不阻塞)
    this.redis.appendUpdate(roomId, update).catch(console.error);
    
    // 3. 达到阈值则持久化到 LevelDB
    if (this.shouldPersist(roomId)) {
      await this.persistToLevelDB(roomId, ydoc);
    }
  }
  
  // 加载初始状态
  private async loadInitialState(roomId: string, ydoc: Y.Doc): Promise<void> {
    // 1. 先检查内存
    let state = await this.memory.getState(roomId);
    if (state) {
      Y.applyUpdate(ydoc, state);
      return;
    }
    
    // 2. 检查 Redis
    state = await this.redis.getState(roomId);
    if (state) {
      Y.applyUpdate(ydoc, state);
      await this.memory.setState(roomId, state); // 回填内存
      return;
    }
    
    // 3. 检查 LevelDB
    state = await this.leveldb.loadState(roomId);
    if (state) {
      Y.applyUpdate(ydoc, state);
      await this.redis.setState(roomId, state); // 回填 Redis
      await this.memory.setState(roomId, state); // 回填内存
      return;
    }
    
    // 4. 新文档，无需加载
  }
}
```

### 存储策略决策

| 场景 | 存储层 | 理由 |
|------|--------|------|
| 新用户加入房间 | Memory → Redis → LevelDB | 层级回填，最快响应 |
| 文档更新 | Memory + Redis (async) | 低延迟，异步持久化 |
| 热点房间 | Memory | <1ms 访问 |
| 冷门房间 | Redis → LevelDB | 释放内存，LevelDB 压缩 |
| 服务重启 | LevelDB → Redis → Memory | 崩溃恢复 |
| 房间空闲 >24h | 移出 Memory | 释放内存给活跃房间 |

---

## 多房间并发处理架构

### 整体架构

```
                          ┌─────────────────────────────────────────┐
                          │            Load Balancer                │
                          │         (Nginx / Cloudflare)            │
                          └─────────────────┬───────────────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
          ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
          │   Node.js WS    │    │   Node.js WS    │    │   Node.js WS    │
          │    Server 1     │    │    Server 2     │    │    Server 3     │
          │                 │    │                 │    │                 │
          │  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
          │  │ Room A    │  │    │  │ Room B    │  │    │  │ Room C    │  │
          │  │ Room B    │  │    │  │ Room D    │  │    │  │ Room E    │  │
          │  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
          └────────┬────────┘    └────────┬────────┘    └────────┬────────┘
                   │                       │                       │
                   └───────────────────────┼───────────────────────┘
                                           │
                          ┌────────────────┴────────────────┐
                          │                                 │
                          ▼                                 ▼
                 ┌─────────────────┐              ┌─────────────────┐
                 │     Redis        │              │    LevelDB      │
                 │   (Pub/Sub +     │              │   (持久化存储)   │
                 │    共享状态)      │              │                  │
                 └─────────────────┘              └─────────────────┘
```

### 房间管理器 (RoomManager)

```typescript
interface RoomManagerConfig {
  maxRoomsPerServer: number;    // 每服务器最大房间数
  maxParticipantsPerRoom: number; // 每房间最大参与者
  roomIdleTimeoutMs: number;    // 房间空闲超时
  maxRoomsTotal: number;        // 全局最大房间数
}

class RoomManager {
  private rooms: Map<string, CollabRoom> = new Map();
  private redis: Redis;
  private config: RoomManagerConfig;
  
  // 房间路由 ( Consistent Hashing )
  private nodeRing: SortedArray<WebSocketServer>;
  
  // 创建或获取房间
  async getOrCreateRoom(roomId: string): Promise<CollabRoom> {
    // 1. 本地查找
    let room = this.rooms.get(roomId);
    if (room) return room;
    
    // 2. Redis 查找 (跨服务器)
    const remoteRoom = await this.redis.getRoom(roomId);
    if (remoteRoom) {
      // 创建本地引用
      room = this.createLocalRoomReference(roomId, remoteRoom);
      this.rooms.set(roomId, room);
      return room;
    }
    
    // 3. 创建新房间
    room = await this.createRoom(roomId);
    this.rooms.set(roomId, room);
    await this.redis.setRoom(roomId, room.meta);
    
    return room;
  }
  
  // 广播到房间所有参与者
  async broadcast(roomId: string, message: WebSocketFrame, exclude?: string[]): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    // 本地用户
    for (const [userId, conn] of room.connections) {
      if (!exclude?.includes(userId)) {
        conn.send(message);
      }
    }
    
    // 跨服务器用户 (通过 Redis Pub/Sub)
    if (room.hasRemoteParticipants) {
      await this.redis.publish(`room:${roomId}`, {
        ...message,
        excludeUsers: exclude
      });
    }
  }
  
  // 分布式锁
  async withRoomLock<T>(
    roomId: string, 
    fn: () => Promise<T>
  ): Promise<T> {
    const lockKey = `lock:room:${roomId}`;
    const lockValue = `${process.pid}:${Date.now()}`;
    
    // 尝试获取锁 (100ms 重试, 最多 3 次)
    let acquired = false;
    for (let i = 0; i < 3; i++) {
      acquired = await this.redis.setNX(lockKey, lockValue, 5000);
      if (acquired) break;
      await this.sleep(100);
    }
    
    if (!acquired) {
      throw new Error(`Failed to acquire lock for room ${roomId}`);
    }
    
    try {
      return await fn();
    } finally {
      await this.redis.del(lockKey);
    }
  }
}
```

### 协作房间 (CollabRoom)

```typescript
interface CollabRoomConfig {
  roomId: string;
  roomType: 'document' | 'canvas' | 'workflow' | 'whiteboard';
  maxParticipants: number;
  persistenceEnabled: boolean;
}

class CollabRoom {
  public ydoc: Y.Doc;
  public awareness: Y.Awareness;
  public meta: RoomMeta;
  
  private connections: Map<string, WebSocketConnection> = new Map();
  private persistence: YjsPersistenceChain;
  private updateDebouncer: Debouncer<string>;
  
  constructor(config: CollabRoomConfig) {
    this.ydoc = new Y.Doc();
    this.awareness = new Y.Awareness(this.ydoc);
    this.meta = { /* 初始化元数据 */ };
    this.persistence = new YjsPersistenceChain(/* ... */);
    
    // 监听 Y.js 更新
    this.ydoc.on('update', this.handleYjsUpdate.bind(this));
    
    // 监听 awareness 更新
    this.awareness.on('update', this.handleAwarenessUpdate.bind(this));
    
    // 绑定持久化
    this.persistence.bindState(config.roomId, this.ydoc);
    
    // 防抖更新广播
    this.updateDebouncer = new Debouncer(50); // 50ms
  }
  
  // 添加参与者
  addParticipant(conn: WebSocketConnection): void {
    if (this.connections.size >= this.meta.maxParticipants) {
      throw new Error('Room is full');
    }
    
    this.connections.set(conn.userId, conn);
    this.awareness.setLocalStateField('user', {
      id: conn.userId,
      name: conn.userName,
      color: this.assignUserColor(conn.userId)
    });
    
    // 广播加入
    this.broadcast({
      type: 'presence:update',
      payload: {
        userId: conn.userId,
        status: 'online'
      }
    }, [conn.userId]);
  }
  
  // 处理 Y.js 更新
  private async handleYjsUpdate(update: Uint8Array, origin: any): Promise<void> {
    // 防抖广播
    this.updateDebouncer.call(this.roomId, async () => {
      await this.broadcastYjsUpdate(update);
    });
    
    // 持久化 (异步)
    this.persistence.onUpdate(this.roomId, this.ydoc, update);
  }
  
  // 广播 Y.js 更新
  private async broadcastYjsUpdate(update: Uint8Array): Promise<void> {
    const message: WebSocketFrame = {
      type: 'sync:update',
      id: generateUUID(),
      timestamp: Date.now(),
      roomId: this.roomId,
      userId: 'server',
      payload: {
        update,
        transactionId: origin?.transactionId
      }
    };
    
    // 发送到所有连接
    for (const conn of this.connections.values()) {
      conn.send(message);
    }
  }
  
  // 用户颜色分配 (一致性哈希)
  private assignUserColor(userId: string): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    const hash = murmurhash3(userId);
    return colors[hash % colors.length];
  }
}
```

### Pub/Sub 跨服务器通信

```typescript
// Redis Pub/Sub 处理
class RedisPubSub {
  private subscriber: Redis;
  private handlers: Map<string, Handler[]> = new Map();
  
  constructor(private redis: Redis) {
    this.subscriber = this.redis.duplicate();
    this.subscriber.on('message', this.handleMessage.bind(this));
  }
  
  // 订阅房间消息
  async subscribe(roomId: string, handler: Handler): Promise<void> {
    const channel = `room:${roomId}`;
    
    if (!this.handlers.has(channel)) {
      await this.subscriber.subscribe(channel);
      this.handlers.set(channel, []);
    }
    
    this.handlers.get(channel)!.push(handler);
  }
  
  // 发布消息
  async publish(roomId: string, message: any): Promise<void> {
    await this.redis.publish(`room:${roomId}`, JSON.stringify(message));
  }
  
  // 消息处理
  private handleMessage(channel: string, message: string): void {
    const data = JSON.parse(message);
    const handlers = this.handlers.get(channel);
    
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }
}
```

### 连接管理

```typescript
interface WebSocketConnection {
  userId: string;
  roomId: string;
  socket: WebSocket;
  isAlive: boolean;        // 心跳状态
  lastPong: number;        // 最后 pong 时间
  pendingUpdates: Uint8Array[]; // 离线期间累积的更新
}

class ConnectionManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private heartbeatInterval: NodeJS.Timer;
  
  constructor() {
    // 每 30 秒检查一次心跳
    this.heartbeatInterval = setInterval(
      () => this.checkHeartbeats(),
      30000
    );
  }
  
  // 处理连接
  async handleConnection(socket: WebSocket, req: Request): Promise<void> {
    // 1. 解析认证
    const auth = await this.authenticate(req);
    if (!auth.success) {
      socket.close(4001, 'Authentication failed');
      return;
    }
    
    // 2. 等待 auth:request 消息
    const { roomId, roomType } = await this.receiveAuthRequest(socket, auth);
    
    // 3. 获取或创建房间
    const room = await this.roomManager.getOrCreateRoom(roomId);
    
    // 4. 创建连接对象
    const conn: WebSocketConnection = {
      userId: auth.userId,
      roomId,
      socket,
      isAlive: true,
      pendingUpdates: []
    };
    
    this.connections.set(`${roomId}:${auth.userId}`, conn);
    room.addParticipant(conn);
    
    // 5. 发送房间状态
    await this.sendRoomState(conn, room);
    
    // 6. 处理消息
    socket.on('message', (data) => this.handleMessage(conn, data));
    socket.on('close', () => this.handleDisconnect(conn));
    socket.on('pong', () => this.handlePong(conn));
  }
  
  // 发送 Y.js 同步
  private async sendRoomState(conn: WebSocketConnection, room: CollabRoom): Promise<void> {
    // Step 1: 发送服务端 Y.js 状态
    const state = Y.encodeStateAsUpdate(room.ydoc);
    
    conn.send({
      type: 'sync:step2',
      id: generateUUID(),
      timestamp: Date.now(),
      roomId: conn.roomId,
      userId: 'server',
      payload: {
        update: state
      }
    });
    
    // Step 2: 发送房间状态
    conn.send({
      type: 'room:state',
      id: generateUUID(),
      timestamp: Date.now(),
      roomId: conn.roomId,
      userId: 'server',
      payload: {
        participants: room.getParticipants(),
        serverVersion: room.meta.version
      }
    });
  }
  
  // 处理断开连接
  private async handleDisconnect(conn: WebSocketConnection): Promise<void> {
    const key = `${conn.roomId}:${conn.userId}`;
    this.connections.delete(key);
    
    const room = await this.roomManager.getRoom(conn.roomId);
    if (room) {
      room.removeParticipant(conn.userId);
      
      // 广播离线状态
      room.broadcast({
        type: 'presence:update',
        payload: {
          userId: conn.userId,
          status: 'offline',
          lastSeen: Date.now()
        }
      });
    }
  }
  
  // 心跳检查
  private checkHeartbeats(): void {
    const now = Date.now();
    const timeout = 60000; // 60 秒超时
    
    for (const conn of this.connections.values()) {
      if (!conn.isAlive || now - conn.lastPong > timeout) {
        conn.socket.terminate();
        this.handleDisconnect(conn);
        continue;
      }
      
      conn.isAlive = false;
      conn.socket.ping();
    }
  }
}
```

---

## 消息格式详解

### 完整消息示例

#### 用户加入房间

```json
// Client → Server
{
  "type": "room:join",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": 1743692400000,
  "roomId": "room-abc123",
  "userId": "user-xyz789",
  "payload": {
    "roomType": "document",
    "lastEventId": "event-456"
  }
}

// Server → Client
{
  "type": "room:state",
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "timestamp": 1743692400100,
  "roomId": "room-abc123",
  "userId": "server",
  "payload": {
    "roomId": "room-abc123",
    "participants": [
      {
        "userId": "user-xyz789",
        "name": "张三",
        "avatar": "https://...",
        "role": "member",
        "joinedAt": 1743692400100,
        "isOnline": true
      }
    ],
    "serverVersion": 42,
    "canWrite": true
  }
}
```

#### Y.js 同步流程

```json
// Step 1: Client → Server (请求同步)
{
  "type": "sync:step1",
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": 1743692400200,
  "roomId": "room-abc123",
  "userId": "user-xyz789",
  "payload": {
    "clientId": "client-001",
    "stateVector": "<base64 encoded Uint8Array>"
  }
}

// Step 2: Server → Client (返回缺失更新)
// 注意: update 字段为二进制数据，JSON 中用 base64 表示
{
  "type": "sync:step2",
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "timestamp": 1743692400210,
  "roomId": "room-abc123",
  "userId": "server",
  "payload": {
    "update": "<base64 encoded Uint8Array>",
    "stateVector": "<base64 encoded Uint8Array>"
  }
}

// 后续更新
{
  "type": "sync:update",
  "id": "550e8400-e29b-41d4-a716-446655440004",
  "timestamp": 1743692400300,
  "roomId": "room-abc123",
  "userId": "user-xyz789",
  "payload": {
    "update": "<base64 encoded Uint8Array>",
    "transactionId": "tx-789"
  }
}
```

#### 光标位置同步

```json
{
  "type": "sync:awareness",
  "id": "550e8400-e29b-41d4-a716-446655440005",
  "timestamp": 1743692400400,
  "roomId": "room-abc123",
  "userId": "user-xyz789",
  "payload": {
    "clientId": "client-001",
    "state": {
      "user": {
        "id": "user-xyz789",
        "name": "张三",
        "color": "#4ECDC4"
      },
      "cursor": {
        "anchor": "relative:0:5",
        "head": "relative:0:10"
      }
    }
  }
}
```

---

## 错误处理

### 错误码定义

| 错误码 | 名称 | 描述 | 处理建议 |
|--------|------|------|----------|
| 4001 | AUTH_FAILED | 认证失败 | 重新登录 |
| 4002 | AUTH_EXPIRED | Token 过期 | 刷新 Token |
| 4003 | ROOM_NOT_FOUND | 房间不存在 | 检查 roomId |
| 4004 | ROOM_FULL | 房间已满 | 等待或加入其他房间 |
| 4005 | PERMISSION_DENIED | 无写权限 | 申请权限 |
| 4006 | INVALID_MESSAGE | 消息格式错误 | 检查 payload |
| 4007 | VERSION_CONFLICT | 版本冲突 | 强制同步 |
| 4101 | RATE_LIMITED | 消息频率超限 | 降低发送频率 |
| 4102 | PAYLOAD_TOO_LARGE | Payload 过大 | 拆分消息 |
| 4103 | UNSUPPORTED_OP | 不支持的操作 | 检查版本兼容性 |
| 5001 | SERVER_ERROR | 服务器内部错误 | 重试或联系支持 |
| 5002 | REDIS_UNAVAILABLE | Redis 不可用 | 降级到本地模式 |
| 5003 | DOC_CORRUPTED | 文档损坏 | 从备份恢复 |

### 错误响应格式

```typescript
interface ErrorResponse {
  type: 'error';
  id: string;
  timestamp: number;
  roomId: string;
  userId: string;
  payload: {
    code: string;           // 错误码
    message: string;        // 错误消息
    details?: any;          // 详细错误信息
    recoverable: boolean;   // 是否可恢复
    retryAfter?: number;    // 重试间隔 (ms)
  };
  meta: {
    requestId: string;     // 关联请求 ID
  };
}
```

### 错误处理策略

| 错误类型 | 策略 |
|----------|------|
| 认证错误 (4001-4002) | 断开连接，提示重新登录 |
| 房间错误 (4003-4005) | 提示用户，阻止操作 |
| 消息错误 (4006-4007) | 拒绝消息，请求重发 |
| 限流错误 (4101-4103) | 退避重试 |
| 服务器错误 (5001-5003) | 降级或重试 |

---

## 安全考虑

### 认证流程

```typescript
// JWT Token 结构
interface AuthToken {
  sub: string;              // userId
  iat: number;               // 签发时间
  exp: number;               // 过期时间
  rooms: string[];            // 有权限的房间
  capabilities: string[];     // 能力列表
}

// 认证中间件
async function authenticateRequest(
  socket: WebSocket, 
  token: string
): Promise<AuthResult> {
  try {
    const decoded = await jwt.verify(token, process.env.JWT_SECRET);
    
    // 检查房间权限
    if (!decoded.rooms.includes(socket.roomId)) {
      return { success: false, error: 'ROOM_ACCESS_DENIED' };
    }
    
    return { 
      success: true, 
      userId: decoded.sub,
      capabilities: decoded.capabilities
    };
  } catch (err) {
    return { success: false, error: 'INVALID_TOKEN' };
  }
}
```

### 数据安全

| 安全措施 | 实现 |
|----------|------|
| **传输加密** | WSS (TLS) |
| **消息签名** | HMAC-SHA256 |
| **Payload 限制** | 最大 1MB |
| **频率限制** | 100 msg/s per user |
| **房间隔离** | Redis key 前缀隔离 |

---

## 性能优化

### 优化策略

| 优化项 | 策略 | 预期提升 |
|--------|------|----------|
| **消息压缩** | gzip/lz4 压缩 >1KB 消息 | 60-70% 带宽节省 |
| **增量同步** | 只传输 Y.js diff | 80-90% 带宽节省 |
| **批量更新** | 50ms 窗口内合并 | 50% 消息数减少 |
| **心跳优化** | 30s 间隔 + 5s 超时 | 最小化 keep-alive 开销 |
| **连接池** | Redis 连接复用 | 减少 90% 连接建立开销 |

### 监控指标

```typescript
interface RealtimeMetrics {
  // 连接指标
  activeConnections: number;
  connectionRate: number;        // 新连接/秒
  
  // 房间指标
  activeRooms: number;
  avgParticipantsPerRoom: number;
  maxParticipantsInRoom: number;
  
  // 消息指标
  messagesPerSecond: number;
  avgMessageLatencyMs: number;
  p99MessageLatencyMs: number;
  
  // Y.js 指标
  yjsUpdatesPerSecond: number;
  avgYjsUpdateSizeBytes: number;
  
  // 存储指标
  memoryUsageMB: number;
  redisHitRate: number;
  leveldbCompactionStatus: string;
}
```

---

## 附录

### A. 类型定义速查

```typescript
// 核心类型
type MessageType = 
  | 'auth:request' | 'auth:response'
  | 'room:join' | 'room:leave' | 'room:state'
  | 'sync:step1' | 'sync:step2' | 'sync:update' | 'sync:awareness'
  | 'doc:operation' | 'canvas:operation' | 'workflow:operation'
  | 'presence:update' | 'cursor:move' | 'selection:change'
  | 'ping' | 'pong' | 'error';

type RoomType = 'document' | 'canvas' | 'workflow' | 'whiteboard';
type UserRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest';
type UserStatus = 'online' | 'away' | 'busy' | 'offline';
```

### B. 配置参考

```typescript
const DEFAULT_CONFIG = {
  // WebSocket
  pingInterval: 30000,
  pongTimeout: 5000,
  maxMessageSize: 1024 * 1024, // 1MB
  
  // 房间
  maxRoomsPerServer: 1000,
  maxParticipantsPerRoom: 100,
  roomIdleTimeout: 3600000, // 1小时
  
  // Y.js 存储
  l1CacheMaxRooms: 100,
  l1CacheMaxUpdates: 10000,
  redisTtlSeconds: 86400, // 24小时
  
  // 性能
  updateBatchWindow: 50, // ms
  compressionThreshold: 1024, // bytes
  rateLimitPerUser: 100, // msg/s
};
```

---

**文档版本**: v1.11.0  
**最后更新**: 2026-04-03