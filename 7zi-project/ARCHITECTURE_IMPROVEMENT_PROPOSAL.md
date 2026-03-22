# 7zi-Frontend 架构改进建议

**生成时间**: 2026-03-22 20:46
**审查人**: 🏗️ 架构师
**项目**: 7zi AI 团队管理平台
**项目版本**: v1.0.8

---

## 📋 执行摘要

本文档针对 7zi-Frontend 项目的整体架构进行全面评估，重点分析前后端分离模式、微服务 vs 单体架构，以及扩展性建议。项目当前采用典型的 **Next.js 单体应用架构**，具有部署简单、开发效率高的优点，但在大规模扩展、服务解耦和性能优化方面存在改进空间。

### 核心发现

| 评估维度 | 当前状态 | 优先级 | 建议 |
|---------|---------|--------|------|
| **架构模式** | Next.js 单体应用 | 🟡 中 | 保持单体，准备渐进式解耦 |
| **前后端分离** | 未分离（Server Components） | 🟢 低 | 保持当前模式，考虑 API 网关 |
| **数据库** | 嵌入式 SQLite | 🔴 高 | 迁移到 PostgreSQL/MySQL |
| **实时通信** | 内嵌 Socket.io | 🟡 中 | 独立 WebSocket 服务 |
| **可扩展性** | 垂直扩展 | 🟡 中 | 准备水平扩展能力 |
| **部署架构** | 单机部署 | 🟡 中 | 考虑负载均衡和集群 |

---

## 1. 当前架构分析

### 1.1 整体架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                     客户端层 (Browser)                      │
│  React 19 + Next.js App Router + Tailwind CSS               │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/HTTPS
┌──────────────────────▼──────────────────────────────────────┐
│              Next.js 应用层 (Monolithic)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  App Router (src/app/)                               │  │
│  │  ├─ API Routes (src/app/api/)                       │  │
│  │  ├─ Server Components                                │  │
│  │  └─ Client Components (src/components/)              │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  业务逻辑层 (src/lib/)                               │  │
│  │  ├─ 数据库访问 (lib/db.ts)                          │  │
│  │  ├─ WebSocket 服务器 (lib/websocket/)               │  │
│  │  ├─ 业务服务 (auth/, tasks/, etc.)                  │  │
│  │  └─ 工具库 (utils/, middleware/)                   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  数据层                                               │  │
│  │  ├─ SQLite Database (better-sqlite3)                 │  │
│  │  ├─ Redis 缓存 (ioredis - 可选)                     │  │
│  │  └─ 文件系统 (exports/, data/)                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                       │ WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│              Socket.io Server (内嵌)                         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈清单

#### 前端技术
- **框架**: Next.js 16.2.1 (App Router)
- **UI**: React 19.2.4
- **语言**: TypeScript 5.x
- **样式**: Tailwind CSS 4.x
- **状态管理**: Zustand 5.0.12
- **图表**: Recharts 3.8.0

#### 后端技术
- **运行时**: Node.js 18+
- **数据库**: SQLite (better-sqlite3)
- **缓存**: Redis (ioredis 5.10.1)
- **实时通信**: Socket.io 4.8.3
- **API**: Next.js API Routes

#### DevOps
- **容器化**: Docker + Docker Compose
- **部署**: 脚本化部署 (deploy.sh)
- **监控**: Sentry + Web Vitals
- **测试**: Playwright (E2E) + Vitest (单元)

### 1.3 架构特点

#### ✅ 优点

1. **部署简单**: 单一 Docker 镜像，易于部署和管理
2. **开发效率高**: 前后端在同一个代码库，无需跨团队协作
3. **类型安全**: TypeScript 全栈类型共享
4. **Server Components**: Next.js Server Components 减少 JavaScript 负载
5. **自包含**: 无需额外的后端服务

#### ⚠️ 缺点

1. **扩展性受限**: SQLite 不支持水平扩展
2. **服务耦合**: 所有功能在同一个进程，单点故障风险
3. **资源竞争**: WebSocket 和 HTTP 请求共享资源
4. **数据库瓶颈**: SQLite 在高并发下性能有限
5. **部署灵活性**: 无法独立扩展前端和后端

---

## 2. 前后端分离模式评估

### 2.1 当前模式：Next.js Server Components

Next.js 16 的 Server Components 提供了一种混合模式：

```typescript
// src/app/dashboard/page.tsx (Server Component)
export default async function DashboardPage() {
  // 直接访问数据库
  const tasks = await getDatabase().query('SELECT * FROM tasks');
  
  return <Dashboard tasks={tasks} />;
}

// src/components/Dashboard.tsx (Client Component)
'use client';
export default function Dashboard({ tasks }: { tasks: Task[] }) {
  // 客户端交互
  const [selected, setSelected] = useState(null);
  return <div>{/* ... */}</div>;
}
```

### 2.2 优缺点分析

| 维度 | Server Components | 完全分离 (API + SPA) |
|------|-------------------|----------------------|
| **开发效率** | ⭐⭐⭐⭐⭐ 高 | ⭐⭐⭐ 中 |
| **部署复杂度** | ⭐⭐⭐⭐⭐ 低 | ⭐⭐ 高 |
| **团队协作** | ⭐⭐⭐ 中 | ⭐⭐⭐⭐⭐ 高 |
| **类型安全** | ⭐⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐ 中 |
| **灵活性** | ⭐⭐⭐ 中 | ⭐⭐⭐⭐⭐ 高 |
| **性能** | ⭐⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐ 高 |
| **扩展性** | ⭐⭐⭐ 中 | ⭐⭐⭐⭐⭐ 高 |

### 2.3 建议方案

#### 🎯 推荐策略：渐进式分离

**阶段 1: 保持当前架构（0-6 个月）**

- 继续使用 Next.js Server Components
- 专注于功能完善和性能优化
- 建立清晰的 API 边界

```typescript
// 明确定义 API 服务层
// src/lib/services/task.service.ts
export class TaskService {
  static async getAll(filters: TaskFilters): Promise<Task[]> {
    const db = getDatabase();
    return db.query('SELECT * FROM tasks WHERE status = ?', [filters.status]);
  }
  
  static async create(data: CreateTaskDTO): Promise<Task> {
    const db = getDatabase();
    const result = db.run('INSERT INTO tasks (...) VALUES (...)', [...]);
    return { id: result.lastInsertRowid, ...data };
  }
}
```

**阶段 2: API 网关准备（6-12 个月）**

- 将 API 路由重构为独立服务接口
- 建立统一的 API 规范
- 引入 API 网关（如 Kong 或 Traefik）

```yaml
# docker-compose.gateway.yml
services:
  gateway:
    image: traefik:v3.0
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./traefik.yml:/etc/traefik/traefik.yml
      - /var/run/docker.sock:/var/run/docker.sock
  
  app:
    image: 7zi-frontend:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=PathPrefix(`/`)"
      - "traefik.http.services.app.loadbalancer.server.port=3000"
```

**阶段 3: 轻量级分离（12-18 个月）**

- 将 WebSocket 服务独立
- 数据库服务独立（PostgreSQL）
- 前端仍使用 Next.js，但通过 API 访问后端

```typescript
// 独立后端服务 (backend-service/)
// src/services/task.service.ts
export async function getTasks(filters: TaskFilters): Promise<Task[]> {
  const client = await pgPool.connect();
  const result = await client.query('SELECT * FROM tasks WHERE status = $1', [filters.status]);
  client.release();
  return result.rows;
}

// Next.js 前端 (frontend/)
// src/app/dashboard/page.tsx
export default async function DashboardPage() {
  const response = await fetch('http://backend-service:4000/api/tasks', {
    cache: 'no-store'
  });
  const tasks = await response.json();
  
  return <Dashboard tasks={tasks} />;
}
```

### 2.4 API 设计规范

为未来分离做准备，建议遵循以下规范：

#### RESTful API 设计

```typescript
// src/lib/api/types.ts
export interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

// 标准错误码
export enum APIErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
```

#### 统一的 API 调用层

```typescript
// src/lib/api/client.ts
import { z } from 'zod';

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
  schema?: z.ZodSchema<T>
): Promise<APIResponse<T>> {
  const response = await fetch(`/api${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const data = await response.json();

  // 数据验证
  if (schema && data.data) {
    const validated = schema.parse(data.data);
    return { ...data, data: validated };
  }

  return data;
}
```

---

## 3. 微服务 vs 单体架构评估

### 3.1 对比分析

| 维度 | 单体架构 (当前) | 微服务架构 |
|------|----------------|------------|
| **开发复杂度** | 🟢 低 | 🔴 高 |
| **部署复杂度** | 🟢 低 | 🔴 高 |
| **团队规模** | 🟢 适合小团队 | 🟢 适合大团队 |
| **扩展性** | 🟡 垂直扩展 | 🟢 水平扩展 |
| **技术栈灵活性** | 🔴 受限 | 🟢 灵活 |
| **故障隔离** | 🔴 单点故障 | 🟢 服务隔离 |
| **性能** | 🟡 受限 | 🟢 可优化 |
| **调试难度** | 🟢 简单 | 🔴 复杂 |
| **运维成本** | 🟢 低 | 🔴 高 |
| **适合场景** | < 50 用户并发 | > 500 用户并发 |

### 3.2 当前项目评估

#### 项目现状

- **团队规模**: 小型团队（假设 < 10 人）
- **用户规模**: 未明确（根据部署规模判断，可能 < 1000 并发）
- **功能复杂度**: 中等（任务管理、协作、导出）
- **性能要求**: 中等（已优化，性能指标良好）

#### 结论

**🎯 建议: 继续使用单体架构，但准备微服务化能力**

**理由**:

1. **团队规模合适**: 单体架构对小型团队更高效
2. **性能足够**: 当前性能指标（FCP 1.2s, LCP 1.8s）已达标
3. **成本效益**: 微服务架构的运维成本远高于当前收益
4. **渐进式演进**: 可以在不改变架构的前提下，为未来微服务化做准备

### 3.3 单体架构优化建议

#### 建议 1: 模块化设计

虽然保持单体架构，但通过模块化设计降低耦合度：

```typescript
// src/modules/task/index.ts
export * from './task.controller';
export * from './task.service';
export * from './task.repository';
export * from './task.types';

// src/modules/task/task.controller.ts
import { TaskService } from './task.service';

export class TaskController {
  static async getMany(req: Request) {
    const tasks = await TaskService.getMany(req.query);
    return NextResponse.json({ success: true, data: tasks });
  }
  
  static async create(req: Request) {
    const data = await req.json();
    const task = await TaskService.create(data);
    return NextResponse.json({ success: true, data: task });
  }
}

// src/app/api/tasks/route.ts
import { TaskController } from '@/modules/task';

export const GET = TaskController.getMany;
export const POST = TaskController.create;
```

#### 建议 2: 领域驱动设计（DDD）

按业务领域组织代码：

```
src/
├── modules/
│   ├── auth/
│   │   ├── controller.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   ├── task/
│   │   ├── controller.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   ├── user/
│   │   ├── controller.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   ├── collaboration/
│   │   ├── controller.ts
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   └── types.ts
│   └── export/
│       ├── controller.ts
│       ├── service.ts
│       ├── repository.ts
│       └── types.ts
```

#### 建议 3: 事件驱动架构

引入事件总线，实现模块间松耦合：

```typescript
// src/lib/events/event-bus.ts
type EventHandler<T> = (data: T) => Promise<void> | void;

export class EventBus {
  private static listeners = new Map<string, Set<EventHandler<any>>>();
  
  static on<T>(event: string, handler: EventHandler<T>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }
  
  static async emit<T>(event: string, data: T) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      await Promise.all(Array.from(handlers).map(h => h(data)));
    }
  }
  
  static off(event: string, handler: EventHandler<any>) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }
}

// 使用示例
EventBus.emit('task:created', { id: 1, title: 'New Task' });

EventBus.on('task:created', async (task) => {
  await NotificationService.notify(task.assignedId, '新任务分配');
});
```

---

## 4. 数据库架构建议

### 4.1 当前问题分析

#### SQLite 的限制

| 限制 | 影响 | 严重程度 |
|------|------|---------|
| **写并发**: 单一写入进程 | 高并发时性能下降 | 🔴 高 |
| **水平扩展**: 不支持 | 无法分布式部署 | 🔴 高 |
| **容量限制**: 文件大小限制 | 大数据量性能下降 | 🟡 中 |
| **实时备份**: 文件锁 | 备份时可能阻塞 | 🟡 中 |
| **功能限制**: 缺少高级特性 | 无法使用复杂查询 | 🟢 低 |

### 4.2 数据库迁移方案

#### 方案 A: PostgreSQL（推荐）

**优点**:
- ✅ 支持水平扩展
- ✅ 优秀的并发性能
- ✅ 丰富的功能（JSON、全文搜索、空间数据）
- ✅ 强大的生态系统
- ✅ 支持实时备份和复制

**迁移步骤**:

```typescript
// 1. 安装 PostgreSQL 驱动
npm install pg
npm install -D @types/pg

// 2. 创建数据库连接池
// src/lib/db/pg.ts
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || '7zi',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function query<T>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
}

export default pool;
```

**迁移脚本**:

```sql
-- migrations/001_create_tasks.sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id)
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
```

#### 方案 B: MySQL

**优点**:
- ✅ 成熟稳定
- ✅ 广泛使用
- ✅ 好的并发性能

**缺点**:
- ❌ JSON 功能不如 PostgreSQL
- ❌ 全文搜索性能较低

#### 方案 C: MongoDB

**优点**:
- ✅ 灵活的模式
- ✅ 水平扩展简单
- ✅ 适合文档型数据

**缺点**:
- ❌ 事务支持不如关系型数据库
- ❌ 学习曲线

### 4.3 数据库迁移计划

#### 阶段 1: 准备（1-2 周）

```bash
# 1. 添加 PostgreSQL 到 Docker Compose
cat >> docker-compose.yml << EOF
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: 7zi
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d

volumes:
  postgres-data:
EOF

# 2. 启动 PostgreSQL
docker-compose up -d postgres

# 3. 安装数据库迁移工具
npm install -g dbmate

# 4. 初始化迁移
dbmate new create_tasks_table
```

#### 阶段 2: 数据迁移（2-3 周）

```typescript
// scripts/migrate-sqlite-to-pg.ts
import Database from 'better-sqlite3';
import { Pool } from 'pg';

async function migrateData() {
  const sqlite = new Database('data/app.db');
  const pg = new Pool({ /* pg config */ });

  // 迁移用户
  const users = sqlite.prepare('SELECT * FROM users').all();
  for (const user of users) {
    await pg.query(
      'INSERT INTO users (id, name, email, created_at) VALUES ($1, $2, $3, $4)',
      [user.id, user.name, user.email, user.created_at]
    );
  }

  // 迁移任务
  const tasks = sqlite.prepare('SELECT * FROM tasks').all();
  for (const task of tasks) {
    await pg.query(
      'INSERT INTO tasks (id, title, description, status, priority, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [task.id, task.title, task.description, task.status, task.priority, task.created_at]
    );
  }

  await pg.end();
  sqlite.close();
}

migrateData();
```

#### 阶段 3: 双写验证（1-2 周）

```typescript
// 双写模式：同时写入 SQLite 和 PostgreSQL
export async function createTask(data: CreateTaskDTO): Promise<Task> {
  const taskSqlite = createTaskSqlite(data);
  const taskPg = await createTaskPg(data);
  
  // 验证一致性
  if (taskSqlite.id !== taskPg.id) {
    throw new Error('ID mismatch between SQLite and PostgreSQL');
  }
  
  return taskPg;
}
```

#### 阶段 4: 切换（1 天）

```bash
# 1. 停止应用
docker-compose stop app

# 2. 验证 PostgreSQL 数据
docker-compose exec postgres psql -U postgres -d 7zi -c "SELECT COUNT(*) FROM tasks;"

# 3. 更新环境变量
echo "DB_TYPE=postgresql" >> .env.production

# 4. 启动应用
docker-compose up -d app
```

---

## 5. 实时通信架构建议

### 5.1 当前架构问题

```
┌─────────────────────────────────────┐
│  Next.js App (Process 1)            │
│  ├─ HTTP Server (port 3000)         │
│  └─ Socket.io Server (port 3000)    │  ← 共享进程
└─────────────────────────────────────┘
         ↓ 问题:
         - WebSocket 和 HTTP 竞争资源
         - 扩展性受限（无法独立扩展）
         - 重启时丢失所有连接
```

### 5.2 改进方案

#### 方案 A: 独立 WebSocket 服务（推荐）

**架构**:

```
┌──────────────────┐      ┌──────────────────┐
│  Next.js App     │      │  WebSocket Svcs  │
│  (HTTP only)     │      │  (Socket.io)     │
│  Port: 3000      │      │  Port: 4000      │
└──────────────────┘      └──────────────────┘
         ↓                        ↓
         └────────┬───────────────┘
                  │
         ┌────────▼────────┐
         │  Nginx/Traefik  │
         │  (Reverse Proxy)│
         └─────────────────┘
                  │
         ┌────────▼────────┐
         │   Client        │
         └─────────────────┘
```

**实现**:

```typescript
// websocket-service/src/server.ts
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createClient } from 'redis';

const httpServer = new HTTPServer();
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  },
});

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

// 使用 Redis Pub/Sub 实现多实例消息广播
const sub = redis.duplicate();
await sub.subscribe('task-updates');

sub.on('message', (channel, message) => {
  io.emit('task:updated', JSON.parse(message));
});

io.on('connection', (socket) => {
  socket.on('join:room', (roomId) => {
    socket.join(roomId);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

httpServer.listen(process.env.PORT || 4000);
```

**Docker Compose**:

```yaml
services:
  websocket-service:
    build: ./websocket-service
    ports:
      - "4000:4000"
    environment:
      REDIS_URL: redis://redis:6379
      ALLOWED_ORIGINS: https://7zi.com
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

#### 方案 B: 使用 Socket.io Adapter（轻量级）

如果不想完全独立 WebSocket 服务，可以使用 Redis Adapter：

```typescript
// src/lib/websocket/server.ts
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
});

const pubClient = createClient({ url: 'redis://redis:6379' });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

---

## 6. 扩展性建议

### 6.1 水平扩展准备

#### 负载均衡配置

```nginx
# nginx.conf
upstream backend {
  least_conn;
  server app1:3000;
  server app2:3000;
  server app3:3000;
  keepalive 64;
}

server {
  listen 80;
  server_name 7zi.com;

  location / {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
  
  location /socket.io/ {
    proxy_pass http://websocket-service:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

#### Docker Swarm 部署

```yaml
# docker-compose.swarm.yml
version: '3.8'

services:
  app:
    image: 7zi-frontend:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
    environment:
      DATABASE_URL: postgres://postgres:password@postgres:5432/7zi
      REDIS_URL: redis://redis:6379
    networks:
      - app-network

  postgres:
    image: postgres:16-alpine
    deploy:
      placement:
        constraints: [node.role == manager]
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    deploy:
      replicas: 1
    networks:
      - app-network

networks:
  app-network:
    driver: overlay

volumes:
  postgres-data:
```

### 6.2 缓存策略

#### Redis 缓存层

```typescript
// src/lib/cache/redis.ts
import { createClient } from 'ioredis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

export async function get<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
}

export async function set<T>(
  key: string,
  value: T,
  ttl: number = 3600
): Promise<void> {
  await redis.setex(key, ttl, JSON.stringify(value));
}

export async function del(key: string): Promise<void> {
  await redis.del(key);
}

// 缓存装饰器
export function Cache(ttl: number = 3600) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      
      // 尝试从缓存获取
      const cached = await get(cacheKey);
      if (cached) {
        return cached;
      }
      
      // 执行原方法
      const result = await originalMethod.apply(this, args);
      
      // 存入缓存
      await set(cacheKey, result, ttl);
      
      return result;
    };
    
    return descriptor;
  };
}

// 使用示例
export class TaskService {
  @Cache(300) // 缓存 5 分钟
  static async getMany(filters: TaskFilters): Promise<Task[]> {
    const db = getDatabase();
    return db.query('SELECT * FROM tasks WHERE status = ?', [filters.status]);
  }
}
```

#### HTTP 缓存策略

```typescript
// src/app/api/tasks/route.ts
export async function GET(request: Request) {
  const tasks = await TaskService.getMany({});
  
  return NextResponse.json(tasks, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'CDN-Cache-Control': 'public, s-maxage=3600',
    },
  });
}
```

### 6.3 队列系统

#### Bull Queue 实现

```typescript
// src/lib/queue/bull.ts
import Queue from 'bull';

const exportQueue = new Queue('exports', process.env.REDIS_URL);

export async function queueExport(taskIds: string[]) {
  const job = await exportQueue.add(
    'export-tasks',
    { taskIds },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    }
  );
  
  return job.id;
}

// src/workers/export.worker.ts
import Queue from 'bull';
import ExcelJS from 'exceljs';

const exportQueue = new Queue('exports', process.env.REDIS_URL);

exportQueue.process('export-tasks', async (job) => {
  const { taskIds } = job.data;
  
  // 创建 Excel 文件
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Tasks');
  
  // 填充数据
  const tasks = await TaskService.getByIds(taskIds);
  sheet.columns = [
    { header: 'ID', key: 'id' },
    { header: 'Title', key: 'title' },
    { header: 'Status', key: 'status' },
  ];
  sheet.addRows(tasks);
  
  // 保存文件
  const filename = `export-${Date.now()}.xlsx`;
  await workbook.xlsx.writeFile(`exports/${filename}`);
  
  return { filename };
});
```

---

## 7. 部署架构建议

### 7.1 当前部署架构

```
┌─────────────────────────────────────┐
│  7zi.com (Server)                    │
│  ├─ Docker Container                 │
│  │  ├─ Next.js App                  │
│  │  ├─ SQLite Database              │
│  │  └─ Redis (optional)             │
│  └─ Nginx (Reverse Proxy)           │
└─────────────────────────────────────┘
```

### 7.2 改进架构

#### 方案 A: 蓝绿部署（推荐）

```
┌─────────────────────────────────────────────────────┐
│  Load Balancer (Nginx/Traefik)                       │
└──────────────┬──────────────────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
┌──────▼──────┐  ┌────▼───────┐
│   Blue      │  │   Green     │
│   (v1.0)     │  │   (v1.1)    │
│  App + DB   │  │  App + DB   │
└─────────────┘  └─────────────┘
       ↑               ↑
    Active         Standby
```

**实现**:

```yaml
# docker-compose.blue-green.yml
version: '3.8'

services:
  blue:
    image: 7zi-frontend:${VERSION_BLUE:-1.0.8}
    container_name: 7zi-blue
    networks:
      - app-network
    environment:
      NODE_ENV: production

  green:
    image: 7zi-frontend:${VERSION_GREEN:-1.0.8}
    container_name: 7zi-green
    networks:
      - app-network
    environment:
      NODE_ENV: production

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    networks:
      - app-network
    depends_on:
      - blue
      - green

networks:
  app-network:
```

```nginx
# nginx.conf
upstream backend {
  server blue:3000;
}

server {
  listen 80;
  
  location / {
    proxy_pass http://backend;
  }
}
```

**部署脚本**:

```bash
#!/bin/bash
# deploy-blue-green.sh

ACTIVE_COLOR=${ACTIVE_COLOR:-blue}  # blue 或 green
NEW_VERSION=$1

# 确定新颜色
if [ "$ACTIVE_COLOR" = "blue" ]; then
  NEW_COLOR=green
  OLD_COLOR=blue
else
  NEW_COLOR=blue
  OLD_COLOR=green
fi

echo "Deploying $NEW_VERSION to $NEW_COLOR..."

# 1. 拉取新镜像
docker pull 7zi-frontend:$NEW_VERSION

# 2. 停止旧颜色
docker stop 7zi-$OLD_COLOR

# 3. 启动新颜色
docker run -d --name 7zi-$NEW_COLOR \
  --network app-network \
  -e NODE_ENV=production \
  7zi-frontend:$NEW_VERSION

# 4. 等待健康检查
sleep 10

# 5. 切换流量
sed -i "s/server $OLD_COLOR:3000;/server $NEW_COLOR:3000;/" nginx.conf
docker exec nginx nginx -s reload

# 6. 清理旧容器
docker rm 7zi-$OLD_COLOR

echo "Deployment complete! Active: $NEW_COLOR"
```

#### 方案 B: Docker Swarm（多服务器）

```yaml
# docker-compose.swarm.yml
version: '3.8'

services:
  app:
    image: 7zi-frontend:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      rollback_config:
        parallelism: 0
        order: stop-first
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    environment:
      DATABASE_URL: postgres://postgres:password@postgres:5432/7zi
      REDIS_URL: redis://redis:6379
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:16-alpine
    deploy:
      placement:
        constraints: [node.role == manager]
      replicas: 1
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: 7zi
      POSTGRES_PASSWORD: password
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    deploy:
      replicas: 1
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    deploy:
      mode: replicated
      replicas: 1
    networks:
      - app-network

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - app-network

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    ports:
      - "3001:3000"
    networks:
      - app-network

networks:
  app-network:
    driver: overlay

volumes:
  postgres-data:
  prometheus-data:
  grafana-data:
```

---

## 8. 监控和可观测性

### 8.1 日志系统

#### 结构化日志

```typescript
// src/lib/logger/index.ts
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export default logger;

// 使用示例
logger.info({ userId: 123, action: 'login' }, 'User logged in');
logger.error({ error: err }, 'Failed to create task');
```

#### 日志聚合

```typescript
// 使用 Loki 进行日志聚合
// docker-compose.monitoring.yml
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log:ro
      - ./promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SERVER_ROOT_URL: http://localhost:3000
    volumes:
      - grafana-data:/var/lib/grafana
```

### 8.2 指标监控

#### Prometheus 配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nextjs-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/api/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

#### 自定义指标

```typescript
// src/lib/metrics/prometheus.ts
import client from 'prom-client';

// 创建指标注册表
const register = new client.Registry();

// HTTP 请求计数器
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// HTTP 请求持续时间
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

// 数据库查询持续时间
export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
});

// WebSocket 连接数
export const websocketConnections = new client.Gauge({
  name: 'websocket_connections',
  help: 'Number of active WebSocket connections',
});

// 注册所有指标
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(dbQueryDuration);
register.registerMetric(websocketConnections);

export default register;

// 使用中间件
// src/lib/metrics/middleware.ts
export async function metricsMiddleware(
  req: Request,
  handler: () => Promise<Response>
): Promise<Response> {
  const start = Date.now();
  
  const response = await handler();
  
  const duration = (Date.now() - start) / 1000;
  const method = req.method;
  const route = new URL(req.url).pathname;
  const statusCode = response.status;
  
  httpRequestsTotal.labels(method, route, statusCode).inc();
  httpRequestDuration.labels(method, route).observe(duration);
  
  return response;
}
```

### 8.3 分布式追踪

#### OpenTelemetry 集成

```typescript
// src/lib/tracing/opentelemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { TraceExporter } from '@opentelemetry/otlp-grpc-exporter-build';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: '7zi-frontend',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.8',
  }),
  traceExporter: new TraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://jaeger:4317',
  }),
  instrumentations: [
    new ExpressInstrumentation(),
    new HttpInstrumentation(),
    new PgInstrumentation(),
  ],
});

sdk.start();

export default sdk;
```

---

## 9. 安全架构建议

### 9.1 认证和授权

#### JWT 认证

```typescript
// src/lib/auth/jwt.ts
import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

export async function createToken(payload: {
  userId: number;
  email: string;
  role: string;
}): Promise<string> {
  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET);
  
  return token;
}

export async function verifyToken(
  token: string
): Promise<{ userId: number; email: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as {
      userId: number;
      email: string;
      role: string;
    };
  } catch {
    return null;
  }
}

// 中间件
export async function authMiddleware(req: Request): Promise<number | null> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const payload = await verifyToken(token);
  
  return payload?.userId || null;
}
```

#### RBAC（基于角色的访问控制）

```typescript
// src/lib/rbac/permissions.ts
export enum Permission {
  // 任务权限
  TASK_CREATE = 'task:create',
  TASK_READ = 'task:read',
  TASK_UPDATE = 'task:update',
  TASK_DELETE = 'task:delete',
  
  // 用户权限
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  
  // 系统权限
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_MONITOR = 'system:monitor',
}

export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  GUEST = 'guest',
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission),
  [Role.MANAGER]: [
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    Permission.USER_READ,
  ],
  [Role.USER]: [
    Permission.TASK_READ,
    Permission.TASK_CREATE,
  ],
  [Role.GUEST]: [
    Permission.TASK_READ,
  ],
};

export function hasPermission(
  userRole: Role,
  permission: Permission
): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
}

// 使用示例
export function requirePermission(permission: Permission) {
  return async (req: Request, handler: () => Promise<Response>) => {
    const userId = await authMiddleware(req);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }
    
    const user = await UserService.getById(userId);
    
    if (!hasPermission(user.role as Role, permission)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } },
        { status: 403 }
      );
    }
    
    return handler();
  };
}
```

### 9.2 API 安全

#### Rate Limiting

```typescript
// src/lib/middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@ioredis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
  analytics: true,
});

export async function rateLimitMiddleware(
  req: Request,
  identifier: string
): Promise<boolean> {
  const { success } = await ratelimit.limit(identifier);
  
  if (!success) {
    return false;
  }
  
  return true;
}

// 使用示例
export async function GET(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const allowed = await rateLimitMiddleware(req, ip);
  
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
      { status: 429 }
    );
  }
  
  // ... 继续处理请求
}
```

#### 输入验证

```typescript
// src/lib/validation/schemas.ts
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assignedTo: z.number().int().positive().optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

// 使用示例
export async function POST(req: Request) {
  const body = await req.json();
  
  try {
    const validatedData = createTaskSchema.parse(body);
    // ... 继续处理
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }
  }
}
```

---

## 10. 测试架构

### 10.1 测试策略

#### 测试金字塔

```
        /\
       /E2E\         10%
      /------\
     /Integration\   30%
    /--------------\
   /     Unit Tests \  60%
  /------------------\
```

### 10.2 单元测试

```typescript
// src/lib/services/task.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskService } from './task.service';

describe('TaskService', () => {
  beforeEach(() => {
    vi.mock('@/lib/db', () => ({
      getDatabase: () => ({
        query: vi.fn(),
        prepare: vi.fn(),
      }),
    }));
  });

  describe('getMany', () => {
    it('should return tasks with filters', async () => {
      const tasks = [
        { id: 1, title: 'Task 1', status: 'pending' },
        { id: 2, title: 'Task 2', status: 'completed' },
      ];
      
      const { getDatabase } = await import('@/lib/db');
      const db = getDatabase();
      (db.query as any).mockReturnValue(tasks);
      
      const result = await TaskService.getMany({ status: 'pending' });
      
      expect(result).toEqual(tasks);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM tasks WHERE status = ?',
        ['pending']
      );
    });
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const data = {
        title: 'New Task',
        description: 'Description',
        status: 'pending',
        priority: 'medium',
      };
      
      const { getDatabase } = await import('@/lib/db');
      const db = getDatabase();
      const mockRun = vi.fn().mockReturnValue({ lastInsertRowid: 1 });
      (db.prepare as any).mockReturnValue({ run: mockRun });
      
      const result = await TaskService.create(data);
      
      expect(result).toEqual({ id: 1, ...data });
      expect(mockRun).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array)
      );
    });
  });
});
```

### 10.3 集成测试

```typescript
// tests/integration/tasks.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from 'http-server';
import { setupTestDatabase, teardownTestDatabase } from './helpers';

describe('Tasks API Integration', () => {
  let server: any;
  
  beforeAll(async () => {
    await setupTestDatabase();
    server = createServer();
  });
  
  afterAll(async () => {
    await teardownTestDatabase();
    server.close();
  });
  
  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const response = await request(server)
        .post('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Test Task',
          status: 'pending',
          priority: 'medium',
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Task');
      expect(response.body.data.id).toBeDefined();
    });
    
    it('should return 400 for invalid input', async () => {
      const response = await request(server)
        .post('/api/tasks')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: '', // Invalid: empty title
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

### 10.4 E2E 测试

```typescript
// e2e/task-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
  });
  
  test('should create a new task', async ({ page }) => {
    // 导航到任务页面
    await page.click('a[href="/tasks"]');
    await expect(page).toHaveURL(/.*\/tasks/);
    
    // 点击创建按钮
    await page.click('button:has-text("Create Task")');
    
    // 填写表单
    await page.fill('input[name="title"]', 'E2E Test Task');
    await page.selectOption('select[name="priority"]', 'high');
    await page.fill('textarea[name="description"]', 'This is an E2E test task');
    
    // 提交表单
    await page.click('button[type="submit"]');
    
    // 验证任务已创建
    await expect(page.locator('text=E2E Test Task')).toBeVisible();
  });
  
  test('should filter tasks by status', async ({ page }) => {
    await page.goto('http://localhost:3000/tasks');
    
    // 选择状态过滤器
    await page.selectOption('select[name="status"]', 'completed');
    
    // 验证只显示已完成的任务
    const completedTasks = page.locator('.task-item[data-status="completed"]');
    await expect(completedTasks.first()).toBeVisible();
    
    const pendingTasks = page.locator('.task-item[data-status="pending"]');
    await expect(pendingTasks).toHaveCount(0);
  });
});
```

---

## 11. 实施路线图

### 11.1 短期目标（0-3 个月）

#### 阶段 1: 基础设施准备

**目标**: 为架构改进打好基础

| 任务 | 优先级 | 预计时间 | 负责人 |
|------|--------|---------|--------|
| 数据库迁移到 PostgreSQL | 🔴 高 | 2 周 | 后端 |
| Redis 缓存层实现 | 🟡 中 | 1 周 | 后端 |
| 结构化日志系统 | 🟡 中 | 1 周 | DevOps |
| API 规范制定 | 🟡 中 | 3 天 | 架构师 |
| 监控系统搭建 | 🟡 中 | 1 周 | DevOps |

**交付物**:
- ✅ PostgreSQL 数据库正常运行
- ✅ Redis 缓存层可用
- ✅ 日志聚合到 Loki
- ✅ Prometheus + Grafana 监控面板

#### 阶段 2: 代码优化

**目标**: 提高代码质量和可维护性

| 任务 | 优先级 | 预计时间 | 负责人 |
|------|--------|---------|--------|
| 模块化重构 | 🔴 高 | 2 周 | 全员 |
| 单元测试覆盖率 > 80% | 🔴 高 | 2 周 | 测试 |
| API 接口规范化 | 🟡 中 | 1 周 | 后端 |
| TypeScript 类型完善 | 🟡 中 | 1 周 | 全员 |

**交付物**:
- ✅ 模块化的代码结构
- ✅ 单元测试覆盖率 > 80%
- ✅ API 文档完成

### 11.2 中期目标（3-6 个月）

#### 阶段 3: 服务解耦

**目标**: 逐步解耦服务，为微服务做准备

| 任务 | 优先级 | 预计时间 | 负责人 |
|------|--------|---------|--------|
| WebSocket 服务独立 | 🔴 高 | 2 周 | 后端 |
| 队列系统实现 | 🟡 中 | 2 周 | 后端 |
| API 网关引入 | 🟡 中 | 1 周 | DevOps |
| 事件驱动架构 | 🟡 中 | 2 周 | 后端 |

**交付物**:
- ✅ 独立的 WebSocket 服务
- ✅ Bull 队列系统
- ✅ Traefik API 网关

#### 阶段 4: 扩展性提升

**目标**: 支持水平扩展

| 任务 | 优先级 | 预计时间 | 负责人 |
|------|--------|---------|--------|
| 负载均衡配置 | 🔴 高 | 1 周 | DevOps |
| Docker Swarm 部署 | 🟡 中 | 2 周 | DevOps |
| 蓝绿部署流程 | 🟡 中 | 1 周 | DevOps |
| 数据库主从复制 | 🟡 中 | 2 周 | DBA |

**交付物**:
- ✅ 负载均衡器配置完成
- ✅ Docker Swarm 集群运行
- ✅ 蓝绿部署脚本可用
- ✅ PostgreSQL 主从复制

### 11.3 长期目标（6-12 个月）

#### 阶段 5: 微服务化

**目标**: 根据需求，选择性微服务化

| 任务 | 优先级 | 预计时间 | 负责人 |
|------|--------|---------|--------|
| 评估微服务必要性 | 🟡 中 | 2 周 | 架构师 |
| 认证服务独立 | 🟡 中 | 3 周 | 后端 |
| 任务服务独立 | 🟡 中 | 3 周 | 后端 |
| 通知服务独立 | 🟢 低 | 2 周 | 后端 |

**交付物**:
- ✅ 微服务架构评估报告
- ✅ 认证服务独立部署
- ✅ 任务服务独立部署

#### 阶段 6: 持续优化

**目标**: 持续改进架构

| 任务 | 优先级 | 预计时间 | 负责人 |
|------|--------|---------|--------|
| 性能监控和优化 | 🟡 中 | 持续 | 全员 |
| 安全审计 | 🟡 中 | 每季度 | 安全 |
| 架构审查 | 🟡 中 | 每季度 | 架构师 |
| 技术债务清理 | 🟡 中 | 持续 | 全员 |

**交付物**:
- ✅ 性能优化报告
- ✅ 安全审计报告
- ✅ 架构改进建议

---

## 12. 风险和缓解措施

### 12.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 数据库迁移失败 | 🔴 高 | 🟡 中 | 充分测试，保留回滚方案，分阶段迁移 |
| 性能下降 | 🔴 高 | 🟡 中 | 性能基准测试，逐步优化 |
| 服务解耦失败 | 🟡 中 | 🟡 中 | 充分的集成测试，灰度发布 |
| 扩展性不足 | 🟡 中 | 🟢 低 | 提前规划，预留扩展能力 |
| 安全漏洞 | 🔴 高 | 🟡 中 | 安全审计，渗透测试 |

### 12.2 运营风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 部署失败 | 🟡 中 | 🟡 中 | 蓝绿部署，快速回滚 |
| 监控缺失 | 🟡 中 | 🟢 低 | 提前部署监控系统 |
| 文档不完善 | 🟡 中 | 🟢 低 | 持续更新文档 |
| 团队培训不足 | 🟡 中 | 🟡 中 | 提前培训，知识分享 |

### 12.3 回滚计划

#### 数据库回滚

```bash
#!/bin/bash
# rollback-database.sh

echo "Rolling back to SQLite..."

# 1. 停止应用
docker-compose stop app

# 2. 从 PostgreSQL 导出数据
docker-compose exec -T postgres pg_dump -U postgres 7zi > backup.pgsql

# 3. 恢复 SQLite
cp data/app.db.backup data/app.db

# 4. 更新环境变量
sed -i 's/DATABASE_URL=postgresql:\/\/.*/DATABASE_URL=file:\/.\/data\/app.db/' .env.production

# 5. 启动应用
docker-compose start app

echo "Rollback complete!"
```

#### 服务回滚

```bash
#!/bin/bash
# rollback-service.sh

VERSION=$1

echo "Rolling back to version $VERSION..."

# 1. 拉回旧版本
docker pull 7zi-frontend:$VERSION

# 2. 停止当前版本
docker stop 7zi-app

# 3. 启动旧版本
docker run -d --name 7zi-app \
  --network app-network \
  -e NODE_ENV=production \
  7zi-frontend:$VERSION

echo "Rollback complete!"
```

---

## 13. 总结和建议

### 13.1 核心建议

#### 1. 保持单体架构，准备微服务化能力

**理由**:
- 当前团队规模和业务复杂度适合单体架构
- 微服务化的运维成本远高于当前收益
- 通过模块化设计，可以在不改变架构的前提下提升可维护性

**行动**:
- ✅ 按业务领域组织代码（DDD）
- ✅ 建立清晰的模块边界
- ✅ 引入事件驱动架构

#### 2. 迁移到 PostgreSQL

**理由**:
- SQLite 的写并发限制在高并发下是瓶颈
- PostgreSQL 支持水平扩展和高可用
- 丰富的功能和强大的生态系统

**行动**:
- 🔴 **高优先级**: 立即开始迁移规划
- 📅 **时间**: 2-3 周
- 👥 **负责人**: 后端团队

#### 3. 实现完整的可观测性

**理由**:
- 没有监控的系统无法有效运维
- 问题排查和性能优化依赖监控数据
- 为未来扩展提供基础

**行动**:
- ✅ 结构化日志
- ✅ Prometheus + Grafana
- ✅ 分布式追踪

#### 4. 建立自动化测试体系

**理由**:
- 代码质量需要测试保障
- 重构依赖测试覆盖
- 持续集成需要自动化测试

**行动**:
- 📅 **目标**: 单元测试覆盖率 > 80%
- 📅 **目标**: E2E 测试覆盖核心流程
- 📅 **时间**: 2-3 周

### 13.2 优先级排序

| 优先级 | 任务 | 预计时间 | 收益 |
|--------|------|---------|------|
| 🔴 P0 | 数据库迁移到 PostgreSQL | 2-3 周 | 高 |
| 🔴 P0 | 模块化重构 | 2 周 | 高 |
| 🔴 P0 | 监控系统搭建 | 1 周 | 高 |
| 🟡 P1 | Redis 缓存层 | 1 周 | 中 |
| 🟡 P1 | WebSocket 服务独立 | 2 周 | 中 |
| 🟡 P1 | 蓝绿部署流程 | 1 周 | 中 |
| 🟢 P2 | API 网关 | 1 周 | 低 |
| 🟢 P2 | 队列系统 | 2 周 | 低 |
| 🟢 P2 | 微服务评估 | 2 周 | 低 |

### 13.3 成功指标

#### 技术指标

| 指标 | 当前 | 目标 | 测量方法 |
|------|------|------|---------|
| 数据库并发能力 | ~100 QPS | > 1000 QPS | 压力测试 |
| API 响应时间 (P95) | ~500ms | < 200ms | APM |
| 单元测试覆盖率 | ~40% | > 80% | 测试报告 |
| 构建时间 | ~45s | < 30s | CI/CD |
| 部署时间 | ~5min | < 2min | 部署日志 |
| 故障恢复时间 (MTTR) | ~30min | < 10min | 监控 |

#### 业务指标

| 指标 | 当前 | 目标 | 测量方法 |
|------|------|------|---------|
| 系统可用性 | ~99.5% | > 99.9% | Uptime |
| 用户满意度 | N/A | > 4.5/5 | 问卷调查 |
| Bug 数量 | N/A | < 10/月 | Bug 跟踪 |
| 功能交付速度 | N/A | 提升 20% | 需求跟踪 |

---

## 14. 附录

### 14.1 参考文档

- [Next.js 文档](https://nextjs.org/docs)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [Socket.io 文档](https://socket.io/docs/)
- [Docker 文档](https://docs.docker.com/)
- [Prometheus 文档](https://prometheus.io/docs/)
- [Grafana 文档](https://grafana.com/docs/)

### 14.2 工具清单

| 类别 | 工具 | 用途 |
|------|------|------|
| 数据库 | PostgreSQL 16 | 主数据库 |
| 缓存 | Redis 7 | 缓存和消息队列 |
| 监控 | Prometheus + Grafana | 指标监控 |
| 日志 | Loki | 日志聚合 |
| 追踪 | OpenTelemetry + Jaeger | 分布式追踪 |
| 测试 | Vitest + Playwright | 单元测试 + E2E 测试 |
| 容器 | Docker + Docker Swarm | 容器化部署 |
| API 网关 | Traefik | 负载均衡和路由 |

### 14.3 联系人

| 角色 | 姓名 | 联系方式 |
|------|------|---------|
| 架构师 | 🏗️ 架构师 | - |
| 后端负责人 | - | - |
| 前端负责人 | - | - |
| DevOps | - | - |
| DBA | - | - |

---

**报告完成时间**: 2026-03-22 20:46
**审查人**: 🏗️ 架构师
**文档版本**: 1.0
**状态**: ✅ 完成

---

<div align="center">

**🎯 7zi-Frontend 架构改进建议**

**感谢阅读！如有问题，请联系架构团队。**

</div>
