# 架构扩展性分析报告
**项目**: 7zi-frontend  
**日期**: 2026-04-27  
**架构师**: 🏗️ 架构师子代理  
**模型**: MiniMax-M2.7

---

## 一、项目结构与模块分析

### 1.1 整体架构

项目为 **Next.js 15** (App Router) 前端应用，采用 monorepo 风格但实际为单仓库。

```
/workspace
├── src/
│   ├── app/          # Next.js App Router 页面和 API
│   ├── components/   # React 组件 (~38 子目录)
│   ├── lib/          # 核心业务逻辑 (~105 子目录) ⚠️ 膨胀严重
│   ├── stores/       # Zustand 状态管理
│   ├── hooks/        # 自定义 React Hooks
│   ├── workflows/   # 工作流引擎
│   └── types/        # TypeScript 类型定义
├── server/           # 独立 WebSocket 服务器
├── bot6/             # OpenClaw 机器人
├── tests/            # 测试套件
├── docs/             # 文档
└── scripts/          # 构建/部署脚本
```

### 1.2 核心模块划分

| 模块 | 路径 | 问题 |
|------|------|------|
| **API 层** | `src/app/api/` | 40+ 子目录，部分路由过长 |
| **数据层** | `src/lib/db/` | SQLite + better-sqlite3，无连接池 |
| **状态管理** | `src/stores/` | Zustand 7个 store，WebSocket 状态耦合 |
| **WebSocket** | `src/lib/websocket/` + `server/` | 1473行单文件，需拆分 |
| **认证** | `src/lib/auth/` | JWT + OAuth，已实现多租户 |
| **租户** | `src/lib/tenant/` | 已实现但未完全集成 |
| **计费** | `src/lib/billing/` | 已实现 schema 和 service |
| **限流** | `src/lib/rate-limit/` | 已实现 Redis + 内存双模式 |
| **搜索** | `src/lib/search/` | Fuse.js，无 GROQ 查询 |

### 1.3 关键问题

| 问题 | 严重程度 | 说明 |
|------|----------|------|
| `src/lib/` 105个子目录 | 🔴 高 | 膨胀失控，耦合严重 |
| `websocket-manager.ts` 1473行 | 🔴 高 | 违反单一职责 |
| `any` 类型 922处 | 🟡 中 | 技术债，影响重构 |
| `console.*` 1582处 | 🟡 中 | 生产性能开销 |
| DraftStorage 重复3份 | 🟡 中 | ~1700行重复代码 |
| Notification 重复5+份 | 🟡 中 | ~2000+行重复代码 |

---

## 二、数据库架构扩展性评估

### 2.1 当前架构

**存储**: SQLite (better-sqlite3) + 内存缓存

```
src/lib/db/
├── connection.ts        # 单例连接
├── connection-pool.ts   # 连接池封装（但 SQLite 不支持真正连接池）
├── enhanced-db.ts       # 增强查询
├── cache.ts             # 内存缓存层
├── migrations/          # 迁移文件
└── *.ts                 # 各业务表操作
```

### 2.2 扩展性评估

| 维度 | 当前能力 | 扩展性评分 | 说明 |
|------|----------|------------|------|
| **并发写入** | 单写多读 | ⭐⭐ | SQLite 只支持单写，WAL模式最多1写 |
| **数据量** | < 10GB | ⭐⭐⭐ | SQLite 最佳 < 10GB |
| **连接数** | 1 | ⭐⭐ | 单文件数据库 |
| **分布式** | 不支持 | ⭐ | 无原生分布式方案 |
| **备份恢复** | 手动 | ⭐⭐ | 需外部工具 |
| **查询性能** | 尚可 | ⭐⭐⭐ | 已建索引，有 N+1 检测 |

### 2.3 SQLite vs GROQ 实际使用

项目中 **无 GROQ 使用**，GROQ 是 Sanity CMS 的查询语言。

实际数据库栈：
- **SQLite**: 主数据存储 (better-sqlite3)
- **better-sqlite3**: 同步 API，高性能
- **内存缓存**: 热数据缓存 (src/lib/cache.ts)
- **索引**: 已实现 `index-analyzer.ts`, `index-unified.ts`

### 2.4 扩展性改进建议

#### 短期 (< 1000用户)
- 保持 SQLite + WAL 模式
- 优化索引和查询缓存
- 使用 `PRAGMA journal_mode=WAL`
- 定期 `VACUUM` 保持性能

#### 中期 (1000-10000用户)
```
建议迁移路径:
SQLite → PostgreSQL + Prisma
```
- Prisma ORM 提供统一接口
- PostgreSQL 支持 JSONB (类似 GROQ 灵活性)
- 支持真正连接池和高并发
- 支持数组和全文搜索

#### 长期 (> 10000用户)
```
建议架构:
PostgreSQL (主库) + Redis (缓存/会话) + S3 (文件存储)
```

---

## 三、多租户支持分析

### 3.1 已实现组件

| 组件 | 状态 | 文件 |
|------|------|------|
| 租户 Schema | ✅ 完成 | `migrations/001_multi_tenant.sql` |
| 租户 Service | ✅ 完成 | `src/lib/tenant/service.ts` |
| 计费 Service | ✅ 完成 | `src/lib/billing/service.ts` |
| 加密 Service | ✅ 完成 | `src/lib/security/encryption.ts` |
| 审计 Service | ✅ 完成 | `src/lib/security/audit.ts` |
| 数据脱敏 | ✅ 完成 | `src/lib/security/masking.ts` |

### 3.2 租户隔离模型

已设计三种隔离级别：

1. **共享数据库 + Schema 隔离** (当前实现)
   - 所有租户共用一个 PostgreSQL 实例
   - 通过 `tenant_id` 区分数据
   - 成本最低，运维简单

2. **独立数据库** (待实现)
   - 每个租户独立数据库
   - 隔离性最好，成本高

3. **混合模式** (待实现)
   - 大客户独立数据库
   - 小客户共享

### 3.3 多租户集成进度

| 功能 | 集成状态 |
|------|----------|
| 租户 CRUD | ⚠️ 已实现但未在 API 中间件集成 |
| 租户认证 JWT | ⚠️ 已设计，未强制 |
| 租户配额检查 | ✅ 已实现 `src/lib/billing/service.ts` |
| 租户数据隔离 | ⚠️ 部分完成，需数据审计 |
| 租户计费 | ✅ Plan/Subscription/Invoice |

### 3.4 多租户改进建议

```
P0:
1. 租户中间件集成到所有 API 路由
2. 数据层添加 tenant_id 强制校验
3. 实现租户上下文 (TenantContext)

P1:
1. 租户管理后台
2. 自助注册/订阅流程
3. 用量告警系统

P2:
1. 大客户独立数据库支持
2. 租户数据迁移工具
```

---

## 四、分布式部署方案评估

### 4.1 当前部署架构

```
7zi.com (主服务器)
├── Nginx (反向代理 + 静态资源)
├── Next.js (PM2 集群)
├── SQLite (本地文件)
└── Cloudflare CDN
```

### 4.2 扩展性瓶颈

| 瓶颈 | 影响 | 评分 |
|------|------|------|
| SQLite 单文件 | 无法水平扩展写 | 🔴 |
| 本地存储 | 多服务器无法共享 | 🔴 |
| 无消息队列 | 分布式任务困难 | 🟡 |
| Session 内存存储 | 无法跨服务器 | 🟡 |
| 无 Redis 集群 | 缓存无法共享 | 🟡 |

### 4.3 目标架构 (8服务器集群)

```
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │      CDN        │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐
        │  Web-1    │ │  Web-2    │ │  Web-N    │
        │ (Next.js) │ │ (Next.js) │ │ (Next.js) │
        └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
              │              │              │
        ┌─────┴──────────────┴──────────────┴─────┐
        │              │              │            │
   ┌────┴────┐   ┌────┴────┐   ┌────┴────┐   ┌───┴───┐
   │Redis-Session│ │Redis-Cache│ │PostgreSQL│   │  S3   │
   │  Cluster   │ │  Cluster  │ │ Primary+ │   │(Files)│
   └───────────┘ └───────────┘ │ Replica  │   └───────┘
                                └──────────┘
```

### 4.4 分布式部署实施步骤

| 阶段 | 改动 | 优先级 |
|------|------|--------|
| **Phase 1** | 迁移 SQLite → PostgreSQL | P0 |
| **Phase 2** | 添加 Redis (会话 + 缓存) | P0 |
| **Phase 3** | Nginx/负载均衡配置 | P1 |
| **Phase 4** | WebSocket 集群 (Socket.io Redis Adapter) | P1 |
| **Phase 5** | 任务队列 (Bull/BullMQ) | P2 |
| **Phase 6** | 文件存储迁移 S3 | P2 |
| **Phase 7** | Kubernetes 容器化 | P3 |

### 4.5 WebSocket 集群方案

当前 `server/websocket-server.js` 需要改造：

```typescript
// 需要添加 Redis Adapter
// npm install @socket.io/redis-adapter

import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient({ url: "redis://..." });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

### 4.6 状态共享问题

| 状态类型 | 当前方案 | 分布式方案 |
|----------|----------|------------|
| 用户会话 | 内存 | Redis Session Store |
| WebSocket | 本地 | Redis Pub/Sub |
| 实时协作 | 本地 | Redis + 数据库持久化 |
| 限流计数 | 内存/Redis | Redis (已实现) |
| 缓存 | 内存 | Redis Cluster |

---

## 五、API 速率限制与流量控制方案

### 5.1 当前实现

已实现完整的限流中间件 (`src/lib/rate-limit/`)：

| 组件 | 实现 |
|------|------|
| **滑动窗口** | Redis Sorted Sets |
| **令牌桶** | Redis Hash + Lua |
| **内存模式** | Map 后备 |
| **降级策略** | Redis 不可用时自动切内存 |

### 5.2 配置参数

```bash
RATE_LIMIT_WINDOW_MS=60000    # 时间窗口 1分钟
RATE_LIMIT_MAX_REQUESTS=100   # 每窗口最大请求
RATE_LIMIT_BY=ip              # 按 IP/用户/组合限流
ENABLE_REDIS_RATE_LIMIT=false # 生产需开启
RATE_LIMIT_FAIL_OPEN=true     # 失败时放行
```

### 5.3 流量控制层级

| 层级 | 位置 | 限流对象 |
|------|------|----------|
| **L7 负载均衡** | Nginx | IP/Geo |
| **API Gateway** | Next.js Middleware | IP + User |
| **业务层** | API Route | 用户 + 端点 |
| **数据库** | Connection Pool | 并发连接 |

### 5.4 改进建议

#### 5.4.1 分层限流实现

```
                    ┌────────────────────┐
                    │   Cloudflare WAF   │  ← DDoS 防护
                    │  (rate limit rule) │
                    └────────┬───────────┘
                             │
              ┌──────────────┴──────────────┐
              │      Nginx / Traefik        │  ← L7 限流
              │   (limit_req_zone + conn)   │
              └──────────────┬──────────────┘
                             │
              ┌──────────────┴──────────────┐
              │    Next.js Middleware       │  ← API 限流
              │   (rate-limit middleware)  │
              └──────────────┬──────────────┘
                             │
              ┌──────────────┴──────────────┐
              │      API Route Handler      │  ← 业务限流
              │   (endpoint-specific)      │
              └─────────────────────────────┘
```

#### 5.4.2 推荐配置

```typescript
// 全局限流
const globalLimit = {
  windowMs: 60 * 1000,    // 1分钟
  max: 100,               // 100请求/分钟/IP
  standardHeaders: true,
  legacyHeaders: false,
};

// 认证端点 (严格)
const authLimit = {
  windowMs: 15 * 60 * 1000,  // 15分钟
  max: 10,                     // 10次/15分钟
  skipSuccessfulRequests: true,
};

// 搜索端点 (中等)
const searchLimit = {
  windowMs: 60 * 1000,
  max: 30,
};

// 写入端点 (较严格)
const writeLimit = {
  windowMs: 60 * 1000,
  max: 20,
};

// 公开端点 (宽松)
const publicLimit = {
  windowMs: 60 * 1000,
  max: 200,
};
```

#### 5.4.3 流量控制策略

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| **Rate Limit** | 固定速率限流 | API 保护 |
| **Token Bucket** | 允许突发 | 突发流量 |
| **Sliding Window** | 平滑限流 | 精确控制 |
| **Circuit Breaker** | 熔断降级 | 外部服务 |
| **Backpressure** | 背压传递 | 队列满时 |

---

## 六、实施路线图

### 6.1 v1.14.x (1-2周) - 止血

| 优先级 | 任务 | 工作量 |
|--------|------|--------|
| P0 | 拆分 websocket-manager.ts (1473行) | 23h |
| P0 | 统一 console.* → logger | 4h |
| P0 | 租户中间件集成 | 8h |
| P1 | any 类型清理 (30%) | 16h |
| P1 | 重复代码合并 | 8h |

### 6.2 v1.15.x (1个月) - 扩展准备

| 优先级 | 任务 | 工作量 |
|--------|------|--------|
| P0 | SQLite → PostgreSQL 迁移 | 40h |
| P0 | Redis 集群部署 | 16h |
| P1 | WebSocket Redis Adapter | 16h |
| P1 | 租户数据隔离审计 | 24h |
| P2 | BullMQ 任务队列 | 32h |

### 6.3 v2.0 (2-3个月) - 分布式

| 优先级 | 任务 | 工作量 |
|--------|------|--------|
| P0 | 负载均衡配置 | 8h |
| P0 | 多服务器部署 | 24h |
| P1 | S3 文件存储 | 16h |
| P1 | 租户自助服务 | 40h |
| P2 | Kubernetes 迁移 | 80h |

---

## 七、风险评估

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| SQLite 迁移失败 | 中 | 高 | 充分测试，灰度发布 |
| 多租户数据泄露 | 低 | 极高 | 严格审计，自动化测试 |
| 限流误杀正常用户 | 中 | 中 | 优雅降级，多层限流 |
| WebSocket 集群消息丢失 | 中 | 中 | 消息持久化 + 确认机制 |
| 性能回退 | 低 | 中 | 性能测试，覆盖率 > 80% |

---

## 八、结论

### 8.1 当前架构评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 功能完整性 | ⭐⭐⭐⭐ | 核心功能齐全 |
| 代码质量 | ⭐⭐ | 技术债较重，膨胀失控 |
| 扩展性 | ⭐⭐ | SQLite 单点瓶颈 |
| 多租户 | ⭐⭐⭐ | 已实现但未完全集成 |
| 分布式支持 | ⭐ | 无原生支持 |
| 性能 | ⭐⭐⭐ | 尚可，需持续优化 |

### 8.2 关键建议

1. **立即**: 拆分巨型 websocket-manager.ts
2. **1个月内**: 完成 SQLite → PostgreSQL 迁移评估
3. **1个月内**: Redis 集群部署准备
4. **持续**: any 类型清理，降低重构风险
5. **3个月**: 实现 8 服务器集群部署

### 8.3 技术选型建议

| 组件 | 当前 | 建议 |
|------|------|------|
| 数据库 | SQLite | PostgreSQL 16+ |
| ORM | 手写SQL | Prisma |
| 缓存 | 内存 | Redis Cluster |
| 消息队列 | 无 | BullMQ |
| 文件存储 | 本地 | S3/MinIO |
| 容器化 | Docker | Kubernetes |
| 负载均衡 | Nginx | Traefik/Envoy |

---

*报告生成时间: 2026-04-27 10:20 GMT+2*
