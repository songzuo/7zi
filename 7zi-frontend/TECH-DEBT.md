# 7zi Frontend 技术债务报告

> 分析时间: 2026-04-10  
> 分析目录: `src/lib/`  
> 总文件数: ~400 个源文件 + 测试

---

## 1. 文件概览

### 顶级目录结构

| 目录 | 文件数 | 主要模块 |
|---|---|---|
| `__tests__/` | ~30 | 根级单元测试 |
| `agents/` | 7 | learning, scheduler |
| `ai/dialogue/` | 9 | 对话系统 |
| `alerting/` | 10+ | 多渠道告警 |
| `analytics/` | 4 | 分析指标 |
| `api/rooms/` | 4 | 房间 API |
| `audio/` | 10+ | 语音处理 |
| `auth/` | 4 | 认证 |
| `automation/` | 5 | 自动化引擎 |
| `cache/` | 2 | 热数据缓存 |
| `collab/` | 8 | 协作/CRDT |
| `db/` | 8 | 数据库存储 |
| `error-reporting/` | 5 | 错误上报 |
| `execution/` | 5 | 执行持久化 |
| `i18n/` | 5 | 国际化 |
| `keyboard/` | 4 | 快捷键 |
| `knowledge/` | 6 | RAG/知识库 |
| `middleware/` | 3 | CSRF/限流中间件 |
| `monitoring/` | 30+ | 监控/告警 |
| `offline/` | 5 | 离线支持 |
| `performance/` | 40+ | 性能优化/异常检测/根因分析 |
| `rate-limit/` | 6 | 限流 |
| `reporting/` | 5 | 报告生成 |
| `search/` | 6 | 搜索 |
| `security/` | 3 | 安全头/原型链污染防护 |
| `services/` | 15+ | 通知/邮件服务 |
| `storage/` | 3 | 草稿存储 |
| `theme/` | 9 | 主题系统 |
| `validation/` | 9 | 验证 |
| `webhook/` | 6 | Webhook |
| `workflow/` | 10+ | 工作流 |
| `workflows/` | 3 | 工作流版本 |
| `pwa/` | 4 | PWA |

### 根级大文件

| 文件 | 行数 | 问题 |
|---|---|---|
| `websocket-manager.ts` | 1473 | **超高行数**，需拆分 |
| `permissions.ts` | 955 | 权限逻辑过重 |
| `auth.ts` | 477 | 认证逻辑合并 |
| `websocket-compression.ts` | 412 | 压缩逻辑 |
| `errors.ts` | 364 | 错误定义 |
| `validation-schemas.ts` | 357 | 验证 schema |
| `websocket-instance-manager.ts` | 345 | WebSocket 实例管理 |
| `validation.ts` | 291 | 验证 |
| `logger.ts` | 256 | 日志 |
| `api-rate-limit.ts` | 241 | API 限流 |

---

## 2. 代码重复问题

### 2.1 DraftStorage 三份拷贝 ⚠️ 严重

- `db/draft-storage.ts` (723 行)
- `storage/draft-storage.ts` (342 行)
- `execution/execution-storage.ts` (618 行)
- `execution/execution-storage.ts` 与 `storage/execution-state-storage.ts` (336 行) 功能高度重叠

**问题**: 同一模式 (IndexedDB + localStorage fallback) 被复制多份，无统一抽象层。

### 2.2 Notification 多重实现 ⚠️ 严重

- `services/notification.ts`
- `services/notification-enhanced.ts`
- `services/notification-manager.ts`
- `services/notifications.ts` (聚合 barrel)
- `services/client-notification-manager.ts`
- `alerting/MultiChannelAlertService.ts`
- `alerting/channels/` (Discord/Slack/Webhook/Email 各自独立)

**问题**: 通知系统存在至少 5 个不同实现，职责不清。

### 2.3 WebSocket 管理器三件套

- `websocket-manager.ts` (1473 行)
- `websocket-instance-manager.ts` (345 行)
- `websocket-compression.ts` (412 行)
- `socket.ts` (44 行)

**问题**: 三者高度耦合，应统一为单一模块或清晰的分层架构。

### 2.4 限流逻辑分散

- `api-rate-limit.ts` (根级, 241 行)
- `rate-limit/limiter.ts`
- `rate-limit/memory-storage.ts`
- `rate-limit/redis-storage.ts`
- `rate-limit/middleware.ts`
- `middleware/rate-limit-middleware.ts`
- `api/error-handler.ts` (含限流处理)

### 2.5 错误处理模式重复

473 处 `console.log/warn/error/info` 散落各处，无统一日志抽象。

多个文件自己实现错误转换:
```ts
err instanceof Error ? err : new Error(String(err))
```

### 2.6 存储层重复

- `db/` 目录: 有自己的 storage 实现
- `storage/` 目录: 有自己的 storage 实现
- `offline/storage.ts`: 又是另一套
- `performance/offline-storage.ts`: 又一套

---

## 3. 过时 / 废弃模式

### 3.1 服务端 API 在前端使用 ⚠️ 严重

`db/feedback-storage.ts` 和 `services/notification-storage.ts` 使用:
```ts
this.dbPath = dbPath || join(process.cwd(), 'data', 'feedback.db')
import { join } from 'path'
```

这是 **Node.js 服务端 API**，在浏览器前端代码中完全无法工作。说明这些模块是从服务端代码库直接复制过来的，未做适配。

### 3.2 `any` / `unknown` 类型滥用

约 85 个文件使用 `any` 或 `unknown`，其中许多是不必要的类型宽恕，降低了 TypeScript 类型安全性。

### 3.3 console.* 调试残留

473 处 `console.*` 调用，**生产代码中应全部移除或替换为统一日志服务**。

### 3.4 根级 vs 子目录职责混乱

根级存在大量独立文件 (`auth.ts`, `errors.ts`, `utils.ts`, `validation.ts`, `validation-schemas.ts`, `socket.ts`, `permissions.ts`)，同时同名的子目录如 `auth/`, `validation/` 也存在。职责边界不清晰。

### 3.5 多 Manager 类分散

发现 **38 个 `*Manager` 类**分布在不同目录，无统一抽象模式:
- `ShortcutManager`, `SyncManager`, `WebPushService`, `NotificationManager`...
- 命名风格不统一 (Manager vs Service vs Client)

---

## 4. 缺失错误处理

### 4.1 fetch/axios 无统一错误处理

`api/rooms/client.ts`, `analytics/service.ts`, `mcp/server.ts`, `knowledge/rag-qa.ts` 等直接使用 fetch/axios，缺少统一的错误封装和重试逻辑。

### 4.2 WebSocket 错误处理缺失

`websocket-manager.ts` 的 1473 行中，连接错误、断开重连、心跳超时等逻辑可能存在边界情况未覆盖。

### 4.3 IndexedDB 错误处理不完整

`db/draft-storage.ts` 中多处 `request.onerror` 直接 reject，但缺少:
- 错误分类 (网络 vs 配额 vs 权限)
- 重试机制
- 用户友好的错误信息

### 4.4 异步操作无错误边界

大量 Hooks (`use-notifications.ts`, `performance-hooks.ts`, `db/draft-storage-hooks.ts`) 中的 async 操作未统一处理 Loading/Error 状态。

---

## 5. 重构优先级清单

### 🔴 P0 - 必须立即修复 (可能影响生产)

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| P0-1 | **服务端 Node.js API 在前端** | `db/feedback-storage.ts`, `services/notification-storage.ts` | 删除或标记为服务端专用，使用 `/* @server-only */` |
| P0-2 | **DraftStorage 三份拷贝** | `db/`, `storage/`, `execution/` | 统一为 `lib/storage/` 一个抽象层 |
| P0-3 | **Notification 系统混乱** | `services/`, `alerting/` | 合并为一个统一的 notification 模块 |
| P0-4 | **console.* 生产残留** | 全部 | 用 `logger.ts` 替换所有 `console.*` |

### 🟠 P1 - 高优先级 (影响开发效率)

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| P1-1 | **websocket-manager.ts 1473 行** | 根级 | 拆分为 connection-manager, message-handler, reconnection-manager |
| P1-2 | **permissions.ts 955 行** | 根级 | 拆分为 policy-engine, role-resolver, permission-guard |
| P1-3 | **根级 vs 子目录职责重叠** | `auth.ts` + `auth/`, `validation.ts` + `validation/` | 统一为子目录，删除根级散落文件 |
| P1-4 | **38 个 Manager/Service 命名混乱** | 全局 | 统一命名规范 (Service = 业务逻辑, Manager = 资源生命周期) |

### 🟡 P2 - 中优先级 (技术债务)

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| P2-1 | **any 类型** | 85 个文件 | 全部替换为具体类型 |
| P2-2 | **限流逻辑分散** | `api-rate-limit.ts`, `rate-limit/`, `middleware/` | 统一为单一 `lib/rate-limit/` 模块 |
| P2-3 | **存储层分散** | `db/`, `storage/`, `offline/`, `performance/offline-storage.ts` | 统一为 `lib/storage/` 抽象 |
| P2-4 | **无统一 API Client** | 散落在各模块 | 建立 `lib/api/` 统一封装 fetch/axios |

### 🟢 P3 - 低优先级 (优化)

| # | 问题 | 位置 | 建议 |
|---|---|---|---|
| P3-1 | **多版本 AlertChannel 实现** | `alerting/channels/`, `monitoring/channels/` | 共享基础 Channel 接口 |
| P3-2 | **Workflow 重复类** | `workflow/`, `workflows/` | 合并或明确区分 |
| P3-3 | **缺少 API 文档** | 大部分模块 | 使用 TSDoc 补全 |
| P3-4 | **未使用的 exports** | `reporting/index.ts` 注释 "No unused exports to remove" | 清理死代码 |

---

## 6. 关键重构路线图

### 阶段 1: 清理核心重复 (1-2 周)
1. 创建 `lib/storage/` 统一存储抽象，废弃 `db/` 和 `storage/` 的重复实现
2. 统一 Notification 服务，废弃 `services/notification*.ts` 多版本
3. 清理 `console.*` → `logger.ts`
4. 标记/删除服务端专用模块

### 阶段 2: 拆分超大文件 (2-3 周)
1. `websocket-manager.ts` 拆分为 3-4 个专门模块
2. `permissions.ts` 按职责拆分为独立策略模块
3. 统一根级散落文件到对应子目录

### 阶段 3: 类型安全和架构 (持续)
1. 消除 `any` 类型
2. 建立统一 API 客户端
3. 建立统一的错误处理边界

---

## 7. 总结

| 指标 | 数值 |
|---|---|
| 总源文件 | ~400 |
| 超大文件 (>300行) | 7 |
| 严重重复模块 | 3 组 (DraftStorage, Notification, WebSocket) |
| 含 `any` 的文件 | 85+ |
| `console.*` 调用 | 473 |
| Manager/Service 类 | 38+ |
| 服务端 API 误用 | 2 处 |

**核心问题**: 该代码库呈现"快速迭代"特征——功能不断添加但缺乏顶层架构设计，导致大量重复实现、过大的单文件和无统一的错误处理体系。建议从 **统一存储层** 和 **合并 Notification 系统** 入手，这两个是最容易产出可见成果的切入点。
