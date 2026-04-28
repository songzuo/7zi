# 架构代码审查报告

**审查时间**: 2026-04-27  
**审查者**: 🏗️ 架构师子代理  
**项目**: 7zi-frontend (Next.js 16.2.4 + React 19.2.4)  
**版本**: 1.14.1

---

## 📊 项目概况

| 指标 | 数值 |
|------|------|
| `src/lib` 子模块数 | 73 |
| `src/components` 子目录数 | 38 |
| 顶层 lib/*.ts 文件（含测试） | 22 |
| 总代码文件（估） | ~2000+ |

---

## 🔴 严重问题（高优先级）

### 1. 存在两套重复的 Error 系统

**位置**: `src/lib/errors/` vs `src/lib/error/`

| 项目 | `src/lib/errors/` | `src/lib/error/` |
|------|-------------------|-----------------|
| 目录 | ✅ 存在 | ✅ 存在 |
| index.ts | ✅ | ❌ 无统一导出 |
| unified-error.ts | ✅ | ✅ (从 errors 导入) |
| unified-types.ts | ✅ | ✅ (从 errors 导入) |
| unified-response.ts | ✅ | ❌ |

**问题**:
- `src/lib/error/core/error-factory.ts` 从 `@/lib/errors/` 导入类型
- `src/lib/error/client/error-handler.ts` 从 `@/lib/errors/unified-error` 导入
- `src/lib/error/` 是对 `src/lib/errors/` 的包装层，但命名让人困惑
- 两套系统并存容易导致 import 混乱

**建议**: 统一为单一 `src/lib/errors/` 入口，`src/lib/error/` 作为内部子目录或废弃合并。

---

### 2. 存在两套重复的 Audit Log 系统

**位置**: `src/lib/audit-log/` vs `src/lib/audit/`

| 文件 | `src/lib/audit-log/` | `src/lib/audit/` |
|------|---------------------|-----------------|
| audit-logger.ts | ✅ | ✅ |
| types.ts | ✅ | ✅ |
| middleware.ts | ✅ | ✅ |
| index.ts | ✅ | ✅ |
| storage/ | ✅ | ✅ |
| websocket.ts | ✅ | ❌ |
| README.md | ✅ | ✅ |

**问题**:
- 两个功能高度重叠的审计日志模块并行存在
- `audit/` 可能是 v2 版本但未明确废弃 `audit-log/`
- 开发者可能在两个系统之间困惑

**建议**: 明确保留一个作为主版本，另一个标记为 deprecated 或合并。

---

### 3. `lib/` 顶层文件膨胀（God File 现象）

以下文件过大且功能混杂在 `src/lib/` 根目录：

| 文件 | 行数 | 问题 |
|------|------|------|
| `permissions.ts` | 945 | 包含 RBAC 类型、装饰器、helper，超出单一职责 |
| `search-filter.ts` | 886 | 搜索过滤逻辑过长 |
| `data-import-export.ts` | 709 | 导入导出混合在一起 |
| `web-vitals-db.ts` | 623 | Web Vitals 存储逻辑 |
| `lcp-optimization.ts` | 361 | 性能优化逻辑 |
| `user-preferences.ts` | 312 | 用户偏好设置 |

**建议**: 将这些文件按职责迁移到对应的 `lib/` 子目录，或创建新的子目录如 `lib/rbac/`、`lib/search/`、`lib/import/`。

---

### 4. 存在两套重复的 Collaboration 系统

**位置**: `src/lib/collab/` vs `src/lib/collaboration/` vs `src/lib/websocket/`

- `collab/`: CRDT 核心、client/server 分离
- `collaboration/`: manager.ts, rooms.ts, server.ts
- `websocket/`: collaboration-manager.ts, collab-session.ts, handlers/

**问题**:
- 协作用户可能在三个模块之间困惑
- 职责边界不清晰

**建议**: 合并为统一的 `lib/collaboration/` 目录。

---

## 🟡 中等问题（中优先级）

### 5. `lib/` 缺少统一的 barrel export (index.ts)

`src/lib/` 目录下 **没有顶层 index.ts**，这意味着：

- 导入路径必须写完整路径如 `@/lib/errors/index`
- 无法享受路径别名优化
- 模块间依赖不透明

**建议**: 创建 `src/lib/index.ts` 统一导出核心模块。

---

### 6. `src/lib/permissions.ts` 与 `src/lib/permissions/` 功能重叠

| 文件 | 内容 |
|------|------|
| `src/lib/permissions.ts` | 945 行，RBAC 系统主文件 |
| `src/lib/permissions/` | 目录，包含 middleware, rbac.ts, repository.ts, v2/ |

**问题**: 顶级文件 `permissions.ts` 可能是早期版本，与目录下的模块产生二义性。

**建议**: 统一使用 `src/lib/permissions/` 目录，废弃顶层 `permissions.ts`。

---

### 7. 组件库重复文件

`src/components/` 下存在功能重叠的组件：

| 重复 | 位置1 | 位置2 |
|------|-------|-------|
| ErrorBoundary | `components/ErrorBoundary.tsx` | `components/errors/error-boundary-factory.tsx` |
| StarRating | `components/StarRating.tsx` | `components/rating/StarRating.tsx` |
| Notification | `components/NotificationCenter/` | `src/lib/services/notification.ts` + `src/features/notifications/` |

**建议**: 统一为一处，删除重复。

---

### 8. `utils.ts` 行数相对较少（113 行），但 `utils/` 目录很大

**问题**: 顶层 `lib/utils.ts` 可能包含过时的 utility 函数，与 `lib/utils/` 目录中的函数重复。

**建议**: 检查 `lib/utils.ts` 与 `lib/utils/index.ts` 的导出内容，消除重复。

---

### 9. `lib/` 下存在测试文件污染根目录

以下测试文件不应该在 `lib/` 根目录：

- `csrf.test.ts`
- `date.test.ts`
- `utils.deepClone.test-light.ts`
- `utils.deepClone.test.ts`
- `performance-optimization.test.ts`
- `timing.test.ts`
- `search-filter.test.ts`
- `search-filter-enhanced.test.ts`
- `data-import-export.test.ts`
- `data-import-export.smoke.test.ts`

**建议**: 这些测试文件应该在其对应源码目录的 `__tests__/` 子目录中。

---

### 10. `src/features/` 目录只有一个子模块

**现状**: `src/features/` 只有 `notifications/` 一个子模块

**问题**: `features/` 目录的存在暗示了 Feature-Sliced Design 架构，但目前只有 notifications，其他功能散落在 `lib/` 和 `components/` 中。

**建议**: 
- 要么扩展 features 目录纳入更多功能模块
- 要么将 notifications 迁移到 `lib/notifications/` 并废弃 `features/`

---

## 🟢 低优先级问题（建议改进）

### 11. 命名不一致

- `src/lib/rate-limit/` vs `src/lib/rate-limiting-gateway/` — 限流相关有多个模块
- `src/lib/monitoring/` vs `src/lib/observability/` — 监控和可观测性是否相同？
- `src/lib/performance/` vs `src/lib/monitoring/` — 性能监控职责重叠

### 12. `src/middleware/` 与 `src/lib/middleware/` 重复

| 位置 | 内容 |
|------|------|
| `src/middleware/` | Next.js 中间件 (auth, cors) |
| `src/lib/middleware/` | Express 中间件 (rate-limit, security, etc.) |

**现状**: 两者实际上服务不同层（Next.js vs Express API），但命名容易混淆。

**建议**: 明确标注 `lib/middleware` 为 "API Middleware"。

### 13. `src/lib/multi-agent/` 与 `src/lib/agents/` 的关系不明确

- `lib/multi-agent/`: message-bus, task-decomposer, registry
- `lib/agents/`: MultiAgentOrchestrator, a2a, scheduler, learning

**问题**: 两个模块都处理 multi-agent 相关功能，但未明确谁是谁的子模块。

### 14. 部分模块缺少 README

`src/lib/` 下很多子模块没有 README.md，无法快速了解模块用途。

---

## 📈 改进建议（优先级排序）

| # | 建议 | 优先级 | 工作量 |
|---|------|--------|--------|
| 1 | 合并 `lib/error/` → `lib/errors/`，消除重复 error 系统 | 🔴 高 | 中 |
| 2 | 合并 `lib/audit-log/` → `lib/audit/`，消除重复 audit 系统 | 🔴 高 | 中 |
| 3 | 废弃 `lib/permissions.ts`，统一使用 `lib/permissions/` 目录 | 🔴 高 | 低 |
| 4 | 合并 `collab/` + `collaboration/` + `websocket/` 的协作用代码 | 🔴 高 | 高 |
| 5 | 清理 `lib/` 根目录的测试文件到 `__tests__/` 子目录 | 🟡 中 | 低 |
| 6 | 创建 `lib/index.ts` 统一导出核心模块 | 🟡 中 | 低 |
| 7 | 合并 `features/notifications/` → `lib/notifications/`，废弃 features | 🟡 中 | 中 |
| 8 | 清理 `components/` 重复文件（ErrorBoundary, StarRating 等） | 🟡 中 | 低 |
| 9 | 将大文件拆分：`permissions.ts`(945行) → `lib/rbac/` 目录 | 🟡 中 | 高 |
| 10 | 添加缺失的 README.md 到主要模块 | 🟢 低 | 低 |

---

## 📁 推荐的目录结构优化

```
src/lib/
├── index.ts              # 统一导出
├── errors/               # 统一错误系统 (保留)
│   ├── index.ts
│   ├── unified-*.ts
│   └── [废弃] error/     # 合并到此处
├── audit/                # 统一审计日志 (保留)
│   └── [废弃] audit-log/ # 合并到此处
├── permissions/          # 统一权限系统
│   └── [废弃] permissions.ts
├── collaboration/         # 统一协作用途
│   ├── crdt/
│   ├── websocket/
│   └── [废弃] collab/, collaboration/
├── notifications/
├── rbac/                 # 从 permissions.ts 拆分
├── search/               # 从 search-filter.ts 拆分
├── import-export/         # 从 data-import-export.ts 拆分
├── web-vitals/           # 从 web-vitals-db.ts 拆分
├── ...其他模块
```

---

## ✅ 总结

这是一个功能丰富的全栈 Next.js 项目，但 `src/lib/` 目录存在**模块膨胀**和**功能重叠**的问题。主要风险点：

1. **两套重复系统**（error/audit/collab）维护成本高
2. **God File**（permissions.ts 945行）难以维护
3. **测试文件散落**在 lib 根目录而非 `__tests__/` 子目录
4. **命名不一致**导致开发者困惑

建议按优先级逐步重构，短期优先消除重复系统，长期逐步拆分 God File。
