# 7zi API 架构审查报告
**日期**: 2026-04-29  
**审查者**: 🏗️ 架构师  
**版本**: v1.9.x (进行中)

---

## 一、API 架构概览

### 1.1 路由结构统计

| 分类 | 数量 |
|------|------|
| 总 API Route 文件 | 48 个 (`route.ts`) |
| 代码行数总计 | ~8,230 行 |
| 主要模块 | 13 个 |

### 1.2 模块划分

```
/api/
├── a2a/          # Agent-to-Agent 协议 (3 routes: jsonrpc, queue, registry)
├── agents/       # 智能体管理 (3 routes: learning 相关)
├── ai/           # AI 对话 (4 routes: chat, chat/stream, conversations, suggestions)
├── alerts/       # 告警规则 (2 routes)
├── analytics/    # 分析数据 (5 routes)
├── auth/         # 认证 (1 route)
├── csrf/         # CSRF 令牌 (1 route)
├── data/         # 数据导入 (1 route)
├── feedback/     # 用户反馈 (4 routes)
├── health/       # 健康检查 (1 route)
├── mcp/          # MCP 协议 RPC (1 route, 383行 ⚠️)
├── notifications/# 通知系统 (6 routes)
├── performance/  # 性能监控 (4 routes)
├── projects/     # 项目管理 (1 route, 459行 ⚠️)
├── pwa/          # PWA 支持 (1 route)
├── reports/      # 报告生成 (1 route, 249行)
├── rooms/        # 房间系统 (5 routes)
├── search/       # 搜索 (1 route)
├── users/        # 用户管理 (1 route, 245行)
└── workflows/    # 工作流 (2 routes)
```

### 1.3 技术栈

- **框架**: Next.js 16 (App Router, TypeScript strict mode)
- **中间件**: CSRF、Rate Limiting、JWT Authentication
- **错误处理**: 统一 `ApiError` + `ErrorType` 枚举 + `withErrorHandling`
- **缓存**: `createHotDataCache` + `CachePresets`
- **数据库**: SQLite (Better-SQLite3)，多租户迁移脚本
- **实时**: WebSocket 集成 (room Store 模式)

---

## 二、数据流分析

### 2.1 请求/响应流程

```
Client Request
    ↓
[Middleware Stack]
  → CSRF Middleware (withCSRF)
  → Rate Limit Middleware
  → JWT Authentication (authenticateJWT)
    ↓
[API Route Handler]
  → Input Validation (手动)
  → Business Logic (service layer)
  → Cache Check (HotDataCache)
    ↓
[Response]
  → createSuccessResponse / createErrorResponse
  → ErrorType enum 标准化错误
```

### 2.2 核心数据模式

**房间系统 (Room Store)**:
- 内存存储 (`roomStore`) — 多房间共享状态
- WebSocket 实时同步

**多租户数据库**:
- `tenants` 表 — 租户隔离
- `tenant_members` 表 — 成员管理
- `roles` / `permissions` 表 — RBAC

**分析系统**:
- `analyticsService` — 统一分析服务
- 5 个分析端点 (overview, nodes, resources, anomalies, trends)

### 2.3 关键 Service 层

| Service | 用途 |
|---------|------|
| `analyticsService` | 节点/资源/异常/趋势分析 |
| `roomStore` | 房间内存存储 + CRUD |
| `createHotDataCache` | 热数据缓存抽象 |

---

## 三、潜在瓶颈或问题

### 3.1 🚨 大型 Route 文件风险

| 文件 | 行数 | 问题 |
|------|------|------|
| `performance/alerts/route.ts` | 435 行 | 单文件过大，职责不清 |
| `projects/route.ts` | 459 行 | 同上 |
| `feedback/route.ts` | 447 行 | 同上 |
| `mcp/rpc/route.ts` | 383 行 | 同上 |
| `ai/chat/route.ts` | 250 行 | 需要拆分 |

**问题**: 这些文件超过 300 行，难以维护和测试。

### 3.2 🚨 数据库无 Prisma ORM

项目使用原始 SQL 迁移脚本，无 ORM：
- **优点**: 轻量、直接、性能高
- **缺点**: 类型安全弱、迁移管理分散、无 schema 版本控制

### 3.3 🚨 房间系统内存存储

- `roomStore` 是纯内存存储，**无持久化**
- 服务器重启后房间状态丢失
- 多实例部署时状态不一致

### 3.4 ⚠️ CSRF 中间件混用

部分 route 使用 `withCSRF` 包裹 `withErrorHandling`，顺序不一致：
- ✅ `/api/rooms/[id]/join` — `withErrorHandling(withCSRF(...))`
- ⚠️ `/api/rooms/[id]/leave` — `withCSRF` (缺少 withErrorHandling)

### 3.5 ⚠️ 缺少 API Versioning

所有端点直接暴露 `/api/` 前缀，无版本控制：
- `GET /api/ai/chat`
- `GET /api/ai/suggestions`

未来兼容性风险高。

### 3.6 ⚠️ 缺少 Request/Response DTO 校验

输入校验分散在 handler 内部，无统一 schema validation (如 Zod)。

---

## 四、改进建议（至少2项）

### 4.1 🔧 建议一：Route 文件拆分与 Service 提取

**问题**: 400+ 行的 route 文件难以维护。

**方案**: 将大型 route 的业务逻辑提取到 `lib/services/` 目录：

```
src/lib/services/
├── PerformanceAlertService.ts   # 从 performance/alerts/route.ts 提取
├── ProjectService.ts            # 从 projects/route.ts 提取
├── FeedbackService.ts           # 从 feedback/route.ts 提取
├── MCPService.ts                # 从 mcp/rpc/route.ts 提取
```

**收益**:
- Route 文件控制在 ~80 行以内
- 业务逻辑可独立测试
- 易于找到和修复 bug

### 4.2 🔧 建议二：引入 API Versioning 中间件

**问题**: 无 API 版本控制，破坏未来兼容性。

**方案**: 添加版本前缀策略：

```
/api/v1/rooms    # 稳定版本
/api/v2/rooms    # 新版本 (breaking changes)
/api/experimental/rooms  # 实验性功能
```

同时实现版本协商响应头：
```
X-API-Version: v1
X-API-Deprecation: true (未来弃用提醒)
```

### 4.3 🔧 建议三：房间状态持久化

**问题**: `roomStore` 纯内存存储，服务重启即丢失。

**方案**: 引入 SQLite 持久化或 Redis 共享存储：

```sql
-- 房间表
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_private BOOLEAN DEFAULT FALSE,
  password_hash TEXT,
  status TEXT DEFAULT 'active'
);
```

### 4.4 🔧 建议四：统一 Zod Schema Validation

**问题**: 输入校验分散，无统一 DTO 类型。

**方案**: 在 `lib/api/` 下建立 schema 文件：

```typescript
// lib/api/schemas/room.schema.ts
import { z } from 'zod'

export const CreateRoomSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  password: z.string().optional(),
  isPrivate: z.boolean().optional(),
})

export const RoomParamsSchema = z.object({
  id: z.string().uuid(),
})
```

---

## 五、架构评分

| 维度 | 评分 (1-10) | 说明 |
|------|-------------|------|
| **模块化** | 6 | 13 个模块清晰，但大文件问题严重 |
| **可扩展性** | 5 | 无 API versioning，房间无持久化 |
| **类型安全** | 6 | TypeScript strict，但 schema validation 弱 |
| **错误处理** | 8 | ✅ 统一 ApiError + ErrorType，成熟 |
| **安全性** | 7 | CSRF + JWT + Rate Limit，但混用不一致 |
| **可测试性** | 5 | 大文件 + 缺少 service 层分离，测试困难 |
| **性能** | 7 | HotDataCache 缓存机制良好 |
| **总计** | **6.3** | 中等偏上，需重点改进扩展性和可测试性 |

---

## 六、优先修复清单

| 优先级 | 任务 | 影响 |
|--------|------|------|
| P0 | 修复 CSRF 中间件顺序不一致问题 | 安全性 |
| P1 | 提取大型 Route → Service 层 | 可维护性 |
| P2 | 房间状态持久化 | 可靠性 |
| P3 | 引入 Zod schema validation | 类型安全 |
| P4 | 规划 API versioning 策略 | 长期扩展性 |

---

*报告生成时间: 2026-04-29 12:15 GMT+2*
