# 7zi 项目 v1.1.0 架构分析

**文档版本**: 1.0
**创建日期**: 2026-03-25
**创建者**: 🏗️ 架构师
**基于版本**: v1.0.9

---

## 1. 当前架构评估

### 1.1 技术栈全景

```
Next.js 15 (App Router) + TypeScript
├── 前端: React 19 + Zustand + Socket.IO Client
├── 后端: Next.js API Routes + Socket.IO Server
├── 数据库: SQLite (better-sqlite3) - 单文件
├── 缓存: 内存LRU + Redis
├── 认证: JWT + RBAC (45权限)
├── 实时: WebSocket + SSE
├── 存储: Redis (限流/会话/发布订阅)
└── 部署: 单体应用
```

### 1.2 目录结构分析

```
src/
├── app/                    # Next.js App Router (页面+API)
│   ├── [locale]/          # 国际化路由
│   ├── actions/          # Server Actions
│   ├── api/              # API Routes (25+ 分类)
│   │   ├── tasks/        # 任务管理
│   │   ├── users/        # 用户管理
│   │   ├── ws/           # WebSocket
│   │   └── ... (18+)
│   └── *.tsx             # 页面组件
├── components/            # 45+ 组件目录
│   ├── ui/               # 基础UI
│   ├── chat/             # 聊天相关
│   ├── dashboard/        # 仪表盘
│   ├── collaboration/     # 协作组件
│   ├── knowledge-lattice/ # 知识晶格
│   └── ... (40+)
├── lib/                   # 核心业务逻辑
│   ├── agents/           # AI Agent 核心
│   ├── agent-communication/ # Agent间通信
│   ├── a2a/             # Agent-to-Agent协议
│   ├── mcp/             # MCP服务器
│   ├── db/              # 数据库层
│   ├── cache/           # 缓存层
│   ├── redis/           # Redis客户端
│   ├── services/        # 业务服务
│   └── ... (30+)
├── contexts/             # React Context
├── hooks/                # 自定义Hooks
├── stores/               # Zustand状态管理
└── types/                # 类型定义
```

### 1.3 当前架构优势

| 方面         | 评价                                  |
| ------------ | ------------------------------------- |
| **代码组织** | ✅ 清晰的分层 (components/lib/stores) |
| **类型安全** | ✅ 零TypeScript错误，无any类型        |
| **测试覆盖** | ✅ 72-75%覆盖率，490+测试             |
| **RBAC**     | ✅ 5角色+45权限的细粒度控制           |
| **实时通信** | ✅ WebSocket + SSE双通道              |
| **性能优化** | ✅ 连接池/查询优化/React.memo         |
| **国际化**   | ✅ i18n完整支持                       |

---

## 2. 当前架构局限性

### 2.1 数据库层 - 单点瓶颈 ⚠️

**现状**:

- SQLite 单文件数据库
- better-sqlite3 同步API
- 连接池大小: MAX_CONNECTIONS = 10
- 无读写分离

**问题**:

```
v1.1.0 新功能影响:
├── 可视化工作流 → 工作流定义表 + 执行日志 → 数据量 10x
├── 知识管理 → 向量嵌入存储 → 单表数百万行
├── 智能监控 → 时序数据 → 高频写入
└── 审计日志 → 全量操作记录 → 数据量 100x
```

**瓶颈**:

1. SQLite 并发写入上限 ~1000 QPS（受文件锁限制）
2. 无垂直分表，历史数据无法归档
3. 无向量子集支持，语义搜索需全表扫描
4. 备份期间数据库锁定

### 2.2 缓存层 - 内存单点 ⚠️

**现状**:

- 内存LRU缓存 (Map-based, TTL支持)
- Redis 用于限流和会话
- 缓存粒度: API响应缓存 + 查询缓存

**问题**:

1. **无持久化** - 服务重启缓存全失
2. **无分布式** - 多实例缓存不一致
3. **无预热** - 冷启动延迟高
4. **Redis利用不足** - 仅用于限流，未充分利用 pub/sub 和 Stream

### 2.3 服务层 - 紧耦合 ⚠️

**现状**:

- 所有业务逻辑在 `lib/services/` 和 `lib/agents/`
- API Routes 直接调用服务
- 无明确的服务边界

**问题**:

```
lib/services/ 和 lib/agents/ 承担了:
├── Agent 生命周期管理
├── A2A 通信协议处理
├── MCP 服务器工具调用
├── 任务优先级分析
├── 认证/钱包/权限
└── 备份/导出/通知
```

→ 新增工作流引擎 + 决策引擎将造成**服务膨胀**

### 2.4 API 层 - 扁平化 ⚠️

**现状**:

- 25+ API路由分类，65+端点
- 全部在 `/api/*` 下扁平组织
- 无 API 版本管理
- 无 GraphQL/结构化查询层

**问题**:

1. 工作流相关API与现有API混在一起
2. 知识管理需要灵活的图谱查询
3. 监控分析需要聚合查询
4. 向后兼容性风险（v1.1.0改动会影响现有API）

### 2.5 前端架构 - 状态管理碎片化 ⚠️

**现状**:

- Zustand stores (多 store)
- React Context (认证/主题/实时)
- Socket.IO 状态独立管理

**问题**:

1. 工作流设计器的状态（画布+节点+连线）需要专用状态机
2. 知识图谱可视化需要独立状态
3. 跨端同步需要 CRDT 状态层

---

## 3. v1.1.0 架构改进方案

### 3.1 架构演进路线图

```
当前架构 (v1.0.9)          v1.1.0 架构              v2.0.0 架构
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Next.js Monolith│  →  │ Next.js + Modules │  →  │  Microservices  │
│  + SQLite        │      │  + SQLite/Redis   │      │  + Kafka        │
│  + Memory LRU    │      │  + Redis Cluster  │      │  + PG/Vectordb  │
│  + Monolithic    │      │  + Service Layer  │      │  + Gateway      │
│    Services      │      │  + Workflow Engine│      │  + Event Sourcing│
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

### 3.2 模块化改造方案

#### 方案A: 渐进式模块化 (推荐 - v1.1.0)

**原则**: 不破坏现有架构，逐步引入模块边界

```
src/
├── modules/                    # 🆕 v1.1.0 模块化目录
│   ├── workflow/              # 🆕 工作流编排模块
│   │   ├── engine/            # 工作流引擎核心
│   │   ├── designer/          # 可视化设计器组件
│   │   ├── executor/          # 工作流执行器
│   │   ├── api/               # 工作流 API Routes
│   │   ├── stores/            # 工作流状态管理
│   │   └── types/             # 工作流类型定义
│   │
│   ├── knowledge/             # 🆕 知识管理模块
│   │   ├── ingestion/         # 知识采集 (文档/网页/GitHub)
│   │   ├── vector/            # 向量处理 (嵌入/检索)
│   │   ├── graph/              # 知识图谱
│   │   ├── api/               # 知识管理 API
│   │   └── services/          # 知识服务
│   │
│   ├── decision/              # 🆕 智能决策模块
│   │   ├── engine/             # 决策引擎
│   │   ├── rules/              # 规则库
│   │   ├── prediction/         # 预测分析
│   │   └── api/
│   │
│   ├── analytics/             # 🆕 智能分析模块
│   │   ├── collector/          # 数据收集
│   │   ├── aggregation/        # 聚合计算
│   │   ├── anomaly/            # 异常检测
│   │   └── api/
│   │
│   └── sync/                  # 🆕 跨平台同步模块
│       ├── crdt/               # CRDT 实现
│       ├── offline/             # 离线支持
│       ├── api/
│       └── stores/
│
├── lib/                        # 保留 - 核心共享库
│   ├── db/                     # 数据库层 (优化)
│   ├── cache/                  # 缓存层 (重构)
│   ├── redis/                  # Redis层
│   └── ... (现有模块不变)
│
└── components/                 # 保留 - 逐步迁移到 modules
```

**优点**:

- ✅ 不破坏现有代码结构
- ✅ 新功能完全隔离
- ✅ 便于后续拆分为微服务
- ✅ 便于单独测试和部署

**缺点**:

- ⚠️ 模块间可能有隐式依赖
- ⚠️ 需要 discipline 遵守边界

#### 方案B: 服务层拆分 (v2.0.0)

**适用场景**: v1.1.0 稳定后，用户量 > 10万时

```
Services (独立部署):
├── api-gateway          # 统一入口 + 路由
├── auth-service         # 认证/授权
├── agent-service        # AI Agent 管理
├── workflow-service     # 工作流引擎
├── knowledge-service    # 知识管理
├── analytics-service    # 数据分析
└── notification-service # 通知服务

Data Layer:
├── PostgreSQL           # 关系数据
├── Redis Cluster        # 缓存/会话/限流
├── Qdrant/Pinecone      # 向量数据库
├── Elasticsearch        # 日志/审计
└── Kafka               # 事件总线
```

---

### 3.3 数据库分片策略

#### v1.1.0 阶段: SQLite 优化 + 读写分离准备

**不改数据库**，但做以下优化:

**1. 连接池优化**:

```typescript
// lib/db/connection-pool.ts - 现有优化基础上
- MAX_CONNECTIONS: 10 → 20
- 添加: Prepared Statement Cache
- 添加: Query Result Cache (TTL 30s)
```

**2. 表结构分区** (针对时序数据):

```sql
-- 工作流执行日志: 按月分区
CREATE TABLE workflow_runs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  metadata TEXT
) PARTITION BY RANGE (started_at);

-- 审计日志: 按天分区
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource TEXT,
  timestamp INTEGER NOT NULL
) PARTITION BY RANGE (timestamp);
```

**3. 索引策略**:

```sql
-- 现有查询优化索引
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_tasks_assignee_status ON tasks(assignee_id, status);
```

#### v2.0.0 阶段: PostgreSQL 迁移 + 分片

**迁移指北**:

1. SQLite → PostgreSQL (使用 Prisma/Drizzle)
2. 按用户 ID hash 分片 (4-8 片)
3. 向量数据迁移到 Qdrant
4. 时序数据使用 TimescaleDB

---

### 3.4 缓存策略优化

#### 当前缓存架构

```
请求 → Memory LRU → Redis → Database
      (5min TTL)   (API限流)
```

#### v1.1.0 缓存优化

**1. 多级缓存架构**:

```
请求 → Browser Cache → CDN/Edge → Memory LRU → Redis → Database
     (Static)         (5xx页面)   (5min)      (热点数据)
```

**2. Redis 利用增强**:

```typescript
// lib/cache/redis-cache.ts - 新增

interface CacheStrategy {
  // 热点数据: Redis SET + TTL
  workflowDefinitions: { ttl: 3600; prefix: 'wf:def:' }
  userSessions: { ttl: 86400; prefix: 'session:' }

  // 限流数据: Redis Stream (滑动窗口)
  rateLimits: { type: 'stream'; window: 60 }

  // 实时数据: Redis Pub/Sub
  notifications: { type: 'pubsub'; channel: 'notifs:' }

  // 热点查询: Redis + 预计算
  dashboardStats: { ttl: 300; prefix: 'stats:'; precompute: true }

  // AI Agent 上下文: Redis + LRU 淘汰
  agentContext: { ttl: 1800; max: 10000; prefix: 'agent:ctx:' }
}
```

**3. 缓存预热策略**:

```typescript
// lib/cache/warmup.ts
async function warmupCache() {
  // 1. 加载活跃工作流定义
  const workflows = await db.query('SELECT * FROM workflows WHERE status = "active" LIMIT 100')
  workflows.forEach(wf => redis.set(`wf:def:${wf.id}`, JSON.stringify(wf), 'EX', 3600))

  // 2. 加载常用知识条目
  const knowledge = await db.query('SELECT * FROM knowledge WHERE access_count > 10 LIMIT 500')
  knowledge.forEach(k => redis.set(`knowledge:${k.id}`, JSON.stringify(k), 'EX', 7200))

  // 3. 加载团队成员上下文
  const agents = await db.query('SELECT * FROM agents WHERE status = "online"')
  agents.forEach(a => redis.set(`agent:ctx:${a.id}`, JSON.stringify(a.context), 'EX', 1800))
}
```

**4. 知识库向量缓存**:

```typescript
// lib/knowledge/vector-cache.ts
interface VectorCache {
  // 查询缓存 (近似最近邻)
  queryCache: { ttl: 3600; maxSize: 10000 }

  // 嵌入结果缓存 (避免重复计算)
  embeddingCache: { ttl: 86400; storage: 'redis' }
}
```

---

### 3.5 微服务/模块化可行性评估

#### 模块化得分矩阵

| 模块           | 独立性 | 复杂度 | 依赖度 | 推荐方式                         |
| -------------- | ------ | ------ | ------ | -------------------------------- |
| **工作流编排** | 高     | 高     | 中     | 🟢 新模块 (modules/workflow)     |
| **知识管理**   | 中     | 高     | 低     | 🟢 新模块 (modules/knowledge)    |
| **智能决策**   | 高     | 中     | 中     | 🟢 新模块 (modules/decision)     |
| **智能监控**   | 中     | 中     | 低     | 🟢 新模块 (modules/analytics)    |
| **跨平台同步** | 高     | 高     | 低     | 🟢 新模块 (modules/sync)         |
| **Agent通信**  | 高     | 中     | 无     | 🟢 保留在 lib/agents (成熟)      |
| **RBAC权限**   | 高     | 低     | 无     | 🟢 保留在 lib/permissions (成熟) |
| **实时通信**   | 中     | 中     | 无     | 🟢 保留在 lib/realtime (成熟)    |
| **数据库层**   | -      | -      | -      | ⚠️ 保留但优化 (lib/db)           |
| **缓存层**     | -      | -      | -      | ⚠️ 重构但保留 (lib/cache)        |

#### 推荐: 渐进式模块化 + 事件驱动

**核心原则**:

1. **新功能走新模块** (`src/modules/xxx`)
2. **共享代码走 lib**
3. **模块间通过事件通信** (而非直接调用)

**模块间通信示例**:

```typescript
// modules/workflow/api/execute.ts
import { eventBus } from '@/lib/events'

// 工作流执行完成后发布事件
await eventBus.publish('workflow.completed', {
  workflowId: wf.id,
  runId: run.id,
  duration: run.completedAt - run.startedAt,
  output: run.result,
})

// modules/analytics/collector/index.ts
// 订阅事件进行数据收集
eventBus.subscribe('workflow.completed', async event => {
  await analytics.record({
    type: 'workflow_completion',
    data: event,
    timestamp: Date.now(),
  })
})

// modules/knowledge/api/recommend.ts
// 订阅事件进行知识推荐
eventBus.subscribe('workflow.completed', async event => {
  const relevant = await knowledge.findRelevant(event.output)
  await notification.send(event.userId, 'knowledge_suggestion', relevant)
})
```

**事件总线实现** (基于 Redis Pub/Sub):

```typescript
// lib/events/index.ts
import { redis } from '@/lib/redis'

class EventBus {
  private subscriptions = new Map<string, Function[]>()

  async publish(channel: string, data: unknown) {
    await redis.publish(channel, JSON.stringify(data))
  }

  subscribe(channel: string, handler: Function) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, [])
      // 订阅 Redis channel
    }
    this.subscriptions.get(channel)!.push(handler)
  }
}
```

---

## 4. 具体架构改进清单

### 4.1 v1.1.0 必做项 (核心)

| 序号 | 改进项                 | 优先级  | 预计工时 | 影响                 |
| ---- | ---------------------- | ------- | -------- | -------------------- |
| 1    | **模块目录结构创建**   | 🔴 必须 | 2天      | 为新功能建立隔离空间 |
| 2    | **事件总线实现**       | 🔴 必须 | 2天      | 模块间松耦合通信     |
| 3    | **Redis 多级缓存重构** | 🔴 必须 | 3天      | 性能提升 2-3x        |
| 4    | **数据库连接池增强**   | 🔴 必须 | 1天      | 并发能力提升         |
| 5    | **表分区策略实施**     | 🟡 推荐 | 2天      | 时序数据性能优化     |
| 6    | **API 版本化**         | 🟡 推荐 | 2天      | 向后兼容保障         |
| 7    | **工作流状态机**       | 🔴 必须 | 5天      | 工作流核心           |
| 8    | **向量缓存层**         | 🔴 必须 | 3天      | 知识检索性能         |

### 4.2 v1.1.0 选做项 (增强)

| 序号 | 改进项           | 优先级  | 预计工时 | 影响       |
| ---- | ---------------- | ------- | -------- | ---------- |
| 9    | 缓存预热脚本     | 🟢 可选 | 1天      | 冷启动优化 |
| 10   | 查询结果物化视图 | 🟢 可选 | 2天      | 仪表盘性能 |
| 11   | 审计日志异步写入 | 🟢 可选 | 2天      | 写入性能   |
| 12   | 静态资源 CDN     | 🟢 可选 | 1天      | 首屏加载   |

### 4.3 架构质量指标

| 指标                 | 当前值        | v1.1.0 目标 |
| -------------------- | ------------- | ----------- |
| **模块耦合度**       | 高 (monolith) | 中 (模块化) |
| **缓存命中率**       | ~60% (估算)   | >85%        |
| **API 响应时间 P99** | ~500ms (估算) | <200ms      |
| **数据库并发写入**   | ~100 QPS      | ~500 QPS    |
| **服务启动时间**     | ~30s (估算)   | <15s        |
| **代码模块化程度**   | 30%           | 60%         |

---

## 5. 风险与建议

### 5.1 主要风险

| 风险               | 影响         | 概率 | 缓解              |
| ------------------ | ------------ | ---- | ----------------- |
| **模块化不彻底**   | 架构继续恶化 | 中   | 严格执行目录边界  |
| **Redis 单点**     | 缓存失效     | 低   | 后续 Cluster 部署 |
| **SQLite 天花板**  | 性能瓶颈     | 中   | 提前规划 PG 迁移  |
| **事件总线复杂度** | 调试困难     | 中   | 完善的日志和追踪  |
| **工作流引擎选型** | 技术债务     | 中   | 优先自研 + 成熟库 |

### 5.2 技术债务清单

```
存量技术债务 (v1.1.0 不解决，v2.0.0 处理):
├── SQLite → PostgreSQL 迁移
├── Next.js → 独立前端框架 (如需要)
├── 单体 → 微服务拆分
├── REST → GraphQL/更灵活的查询
└── 内存缓存 → Redis Cluster
```

---

## 6. 总结

### 架构改进核心思路

```
v1.1.0 = 渐进式模块化 + 缓存增强 + 事件驱动

不追求: 彻底重写 / 微服务化 / 新数据库
追求:   新功能隔离 / 性能提升 / 可扩展性
```

### 关键决策点

1. **模块 vs 微服务**: v1.1.0 用模块化，v2.0.0 再考虑微服务
2. **SQLite vs PostgreSQL**: v1.1.0 继续 SQLite + 优化，v2.0.0 迁移 PG
3. **内存 vs Redis**: v1.1.0 强化 Redis 利用，保留内存 LRU 作为 L1
4. **自研 vs 引入**: 工作流引擎自研 + React Flow UI，决策引擎用 Drools

---

_本文档由 🏗️ 架构师 创建于 2026-03-25_
_供 v1.1.0 架构决策参考_
