# 架构v2改进方案 - 细化版

**项目**: 7zi-frontend  
**日期**: 2026-04-14  
**状态**: 细化方案（基于 `REPORT_ARCHITECTURE_V2_0414.md` + `ARCHITECTURE_WEBSOCKET_REFACTOR_20260413.md`）  
**架构师**: 🏗️ 架构师子代理

---

## 一、当前架构问题全景

### 1.1 量化现状

| 指标 | 数值 | 说明 |
|------|------|------|
| `src/lib/` 子目录数 | **55** | 膨胀失控 |
| TypeScript 文件总数 | **1066** | lib/ 内 |
| `console.*` 调用数 | **1582** | 生产残留 |
| `any` 类型使用 | **922 处** | 仅 lib/ 内 |
| WebSocket Manager 引用 | **4 个文件** | 影响范围可控 |
| 最大单文件行数 | **1473** | `websocket-manager.ts` |
| 超大文件 (>300行) | **7 个** | 违规单一职责 |
| DraftStorage 重复 | **3 份** | ~1700 行总 |
| Notification 重复 | **5+ 份** | ~2000+ 行总 |

### 1.2 关键问题分析

#### 问题域 A: 服务间通信模式

**当前问题**:
- `db/feedback-storage.ts` + `services/notification-storage.ts` 使用 Node.js 服务端 API (`path.join`, `process.cwd()`)
- 纯前端构建时会静默失败或运行时崩溃
- 无统一 API Client，散落各处 `fetch` 调用

**受影响文件**:
- `src/lib/db/feedback-storage.ts`
- `src/lib/services/notification-storage.ts`
- 约 15+ 文件直接使用 `fetch` 而非统一封装

#### 问题域 B: 状态管理层次

**当前问题**:
- Zustand store 7 个，分散在 `src/stores/`
- WebSocket 状态与业务状态混合
- 持久化逻辑散落在 WebSocketManager 内部

**受影响文件**:
- `src/stores/` 全部
- `src/lib/websocket-manager.ts` (状态持久化部分 ~30 行)

#### 问题域 C: 错误处理架构

**当前问题**:
- `errors.ts` 364 行定义了错误类型
- 但实际使用分散，无统一 ErrorBoundary 体系
- 38+ Manager/Service 类各有各的错误处理风格

**受影响文件**:
- `src/lib/errors.ts`
- `src/lib/error-handler.ts`
- `src/lib/middleware/error-handler.ts`
- 所有 Manager/Service 类

#### 问题域 D: 性能瓶颈

**当前问题**:
- WebSocket Manager 1473 行 → V8 解析慢
- 1582 处 console.* → 性能开销 + 无法关闭
- Bundle 无 CI 监控，膨胀不可控
- React Compiler 与 `optimizeCss` 可能冲突

---

## 二、具体改动文件清单

### Phase 1: 止血 (v1.14.x) — 预计 1 周

#### P0 改动（必须，本周完成）

| # | 改动文件 | 操作 | 预计工时 | 风险 | 说明 |
|---|----------|------|----------|------|------|
| P0-1 | `src/lib/db/feedback-storage.ts` | 删除或标记 `@server-only` | 0.5h | 低 | 服务端 API 误用 |
| P0-2 | `src/lib/services/notification-storage.ts` | 删除或标记 `@server-only` | 0.5h | 低 | 服务端 API 误用 |
| P0-3 | `src/lib/websocket-manager.ts` | 拆分 10 个子模块 | 23h | **高** | 核心重构，见下方详细拆解 |
| P0-4 | `src/lib/console.*` → `src/lib/logger` | 批量替换 1582 处 | 4h | 低 | 需先确认 logger.ts 覆盖能力 |
| P0-5 | `src/lib/errors.ts` | 简化 + 迁移部分到 `modules/` | 2h | 中 | 保持向后兼容的 error 类型 |

**P0-3 详细拆分**（`websocket-manager.ts` 1473 行）:

```
新建: src/lib/websocket/
├── types.ts              (从 manager 提取 ~150 行类型定义)  → 1h
├── config.ts             (DEFAULT_OPTIONS + mergeConfig)    → 0.5h
├── message-queue.ts       (队列逻辑 ~80 行)                   → 2h
├── heartbeat.ts          (心跳 ~60 行)                       → 2h
├── reconnection.ts       (重连 ~80 行)                       → 2h
├── socket-adapter.ts     (Socket.io 封装 ~100 行)            → 3h
├── network-status.ts     (网络监听 ~50 行)                   → 1.5h
├── connection-quality.ts (质量监控 ~80 行)                   → 2h
├── state-persistence.ts  (持久化 ~60 行)                     → 1.5h
└── websocket-manager.ts  (Facade 重构，缩减到 ~400 行)       → 3h
+ index.ts + 更新 4 个引用方的 import 路径                    → 1h
+ 全量回归测试                                        → 4h
总计: ~23h (3 个工作日)
```

**P0-4 详细方案**:
```bash
# 统计各文件 console 调用分布
grep -rn "console\." src/ --include="*.ts" --include="*.tsx" | \
  awk -F: '{print $1}' | sort | uniq -c | sort -rn | head -30
```
需确认 `src/lib/logger/index.ts` 或 `src/lib/log-aggregator/` 是否已提供分级日志 API。若无，需先补充 logger 实现后再批量替换。

#### P1 改动（应该，本周完成）

| # | 改动文件 | 操作 | 预计工时 | 风险 | 说明 |
|---|----------|------|----------|------|------|
| P1-1 | `src/lib/storage/draft-storage.ts` | 统一草稿存储，删除 `db/draft-storage.ts` 和 `execution/execution-storage.ts` | 2d | 中 | 需更新所有调用方 |
| P1-2 | `src/lib/alerting/MultiChannelAlertService.ts` | 统一通知服务，删除 4 个旧实现 | 2d | 中 | Notification 重复合并 |
| P1-3 | `src/next.config.ts` | 修复 React Compiler 重复配置 + `optimizeCss` 冲突 | 1h | 低 | 清理配置 |
| P1-4 | `src/lib/hooks/` | 合并到 `src/hooks/` | 1h | 低 | 路径整合 |
| P1-5 | `src/lib/errors.ts` 364行 | 拆分出 `modules/error/` 或保持但简化 | 2h | 低 | 提前识别 error 边界 |
| P1-6 | `src/lib/monitoring/` 43文件 | 与 `performance/` 40+ 文件职责重叠审计 | 2h | 低 | 确认重叠范围 |

#### P2 改动（可以，本周完成）

| # | 改动文件 | 操作 | 预计工时 | 风险 |
|---|----------|------|----------|------|
| P2-1 | `src/components/index.ts` ~450行 | 按域拆分为 `ui/index.ts`, `ai-report/index.ts` | 2h | 低 |
| P2-2 | `src/lib/permissions.ts` 955行 | 拆分 `policy-engine.ts` + `role-resolver.ts` + `permission-guard.ts` | 3d | 中 |
| P2-3 | 85 处以上 `any` 类型 | 逐步替换为具体类型 | 2d | 低 |

---

### Phase 2: 重构基础 (v1.15.x - v1.16.x) — 预计 4-6 周

#### P0 改动

| # | 改动文件 | 操作 | 预计工时 | 风险 |
|---|----------|------|----------|------|
| P0-6 | `src/lib/` → `src/modules/` | 按领域重组织，55 子目录 → <20 | 1 周 | **高** |
| P0-7 | 新建 `src/lib/api/client.ts` | 统一 API Client（fetch/axios 封装） | 3d | 中 |
| P0-8 | 新建 `src/lib/error-boundary/` | 统一 ErrorBoundary 体系 | 2d | 中 |

#### P1 改动

| # | 改动文件 | 操作 | 预计工时 | 风险 |
|---|----------|------|----------|------|
| P1-7 | `src/lib/` 清理后残余 | 纯 utils 保留，领域代码移至 `modules/` | 3d | 中 |
| P1-8 | Bundle 监控 CI 集成 | 强制 bundle 大小检查 | 1d | 低 |
| P1-9 | `src/features/` 审计 | 确认 feature 边界清晰化 | 2d | 低 |

#### P2 改动

| # | 改动文件 | 操作 | 预计工时 | 风险 |
|---|----------|------|----------|------|
| P2-4 | `src/lib/` 残余 utils | 统一迁移到 `src/utils/` | 1d | 低 |
| P2-5 | 完善 Plugin 系统 | Agent Plugin 标准化 | 1 周 | 中 |

---

### Phase 3: 架构升级 (v2.0) — 预计 8+ 周

| # | 改动文件 | 操作 | 预计工时 | 风险 |
|---|----------|------|----------|------|
| P0-9 | 完成 `modules/` 重构 | 完整 Feature-Sliced 架构 | 2 周 | 中 |
| P0-10 | TypeScript 100% 覆盖 | 消除所有 `any`，CI 强制检查 | 1 周 | 低 |
| P1-10 | Turbopack 生产构建评估 | 验证稳定性后替换 Webpack | 1 周 | 中 |
| P2-6 | 微前端架构探索 | 可选，取决于业务需求 | - | - |

---

## 三、优先级汇总

### P0（立即执行，止血）

```
1. 删除/标记 @server-only:
   - src/lib/db/feedback-storage.ts
   - src/lib/services/notification-storage.ts

2. WebSocket Manager 拆分 (23h = 3天):
   新建 src/lib/websocket/ 目录，10 个子模块

3. console.* → logger 替换 (4h):
   1582 处批量替换

4. errors.ts 简化 (2h):
   保持向后兼容，分离关注点
```

### P1（本周可完成）

```
5. DraftStorage 统一 (2d)
6. Notification 合并 (2d)
7. next.config.ts 清理 (1h)
8. lib/hooks/ 合并 (1h)
9. permissions.ts 拆分 (3d) — 可并行
10. any 类型清理 (2d) — 可并行
```

### P2（计划中）

```
11. components/index.ts 拆分 (2h)
12. lib/ → modules/ 重构 (1周)
13. 统一 API Client (3d)
14. ErrorBoundary 体系 (2d)
15. Bundle 监控 (1d)
```

---

## 四、风险评估

| 风险项 | 影响 | 概率 | 缓解措施 |
|--------|------|------|----------|
| WebSocket 重构破坏现有协作功能 | 高 | 中 | 11 个引用方需逐一验证；保持 Facade 接口不变；每次拆分后运行现有测试 |
| Phase 1 期间业务需求插入 | 高 | 高 | 预留 20% buffer 时间；止血任务不超过 1 周 |
| DraftStorage 合并影响调用方 | 中 | 中 | 先审计所有调用方 (grep -rn "draft-storage\|DraftStorage") 再动手 |
| Notification 合并影响消息推送 | 中 | 低 | 保留 `alerting/MultiChannelAlertService.ts` 作为标准实现 |
| lib/ → modules/ 重构产生大量冲突 | 高 | 中 | 分支隔离；每个 feature 单独 PR；主干保护 |
| 1582 处 console.* 替换遗漏 | 低 | 低 | 分批次替换，每批后搜索验证 |
| React Compiler + optimizeCss 冲突未发现 | 中 | 中 | Phase 1 先验证 `next build` 是否成功，再合入主干 |

### 风险最高的 3 个改动

1. **WebSocket Manager 拆分** (P0-3) — 定时器 + 状态 + 事件耦合最复杂
2. **lib/ → modules/ 重构** (P0-6) — 影响面最大，涉及 55 个子目录
3. **DraftStorage 统一** (P1-1) — 3 个位置略有不同的 API，统一难度高

---

## 五、依赖关系图

```
Phase 1
├── P0-1/P0-2 (删除服务端误用文件)          ← 无依赖，最先做
├── P0-4 (console → logger)                ← 需先确认 logger.ts 能力
├── P0-5 (errors.ts 简化)                 ← 无依赖
├── P1-3 (next.config.ts)                  ← 无依赖
├── P1-4 (lib/hooks/ 合并)                ← 无依赖
│
├── P0-3 (WebSocket 拆分)                 ← 无依赖，但工时最长
│   └── Step 1: types.ts + config.ts
│   └── Step 2-8: 各子模块
│   └── Step 9: websocket-manager.ts 重构
│   └── Step 10: index.ts + import 更新
│
└── P1-1 (DraftStorage 统一)             ← 需先 P0-1/P0-2 清理完毕
└── P1-2 (Notification 合并)              ← 需先 P0-1/P0-2 清理完毕

Phase 2 (依赖 Phase 1 完成)
└── P0-6 (lib/ → modules/)                ← 依赖 P0-3、P1-1、P1-2 完成
└── P0-7 (统一 API Client)                ← 独立，可与 P0-6 并行

Phase 3 (依赖 Phase 2 完成)
└── P0-9 (modules/ 完成)                  ← 依赖 P0-6 完成
```

---

## 六、立即行动清单

### 今天 (Day 1)

```bash
# 1. 确认 logger.ts 能力
cat src/lib/logger/index.ts

# 2. 确认 WebSocket Manager 引用方
grep -rn "websocket-manager\|WebSocketManager" src/ --include="*.ts" --include="*.tsx"

# 3. 确认 DraftStorage 3 个位置
grep -rln "draft-storage\|DraftStorage" src/ --include="*.ts"

# 4. 确认 Notification 5+ 个位置
grep -rln "notification" src/lib/ --include="*.ts" | head -20

# 5. 删除服务端误用文件（或加 @server-only）
```

### Day 2-3

```bash
# 6. WebSocket Manager 拆分开始
mkdir -p src/lib/websocket/
# 按依赖顺序: types.ts → config.ts → message-queue.ts → heartbeat.ts → ...

# 7. console.* 统计分布
grep -rn "console\." src/ --include="*.ts" --include="*.tsx" | \
  awk -F: '{print $1}' | sort | uniq -c | sort -rn | head -30
```

### Day 4-5

```bash
# 8. DraftStorage 统一
# 9. Notification 合并
# 10. next.config.ts 清理
```

---

## 七、Phase 1 里程碑检查清单

完成 Phase 1 后必须满足：

- [ ] `src/lib/db/feedback-storage.ts` 已删除或加 `@server-only`
- [ ] `src/lib/services/notification-storage.ts` 已删除或加 `@server-only`
- [ ] `src/lib/websocket-manager.ts` 已拆分为 10 个子模块，原文件删除或仅保留 Facade
- [ ] `src/lib/websocket/` 下所有子模块单元测试通过
- [ ] WebSocket 协作功能 (RemoteCursor/CollabClient) 回归测试通过
- [ ] `console.*` 调用数降至 0（或 <10 合理保留）
- [ ] `src/lib/logger/` 承担所有日志输出
- [ ] `next.config.ts` 无 React Compiler 重复配置
- [ ] `optimizeCss` 与 React Compiler 冲突已验证/修复
- [ ] DraftStorage 统一为 1 个实现，所有调用方已更新
- [ ] Notification 统一为 1 个实现，所有调用方已更新

---

*细化方案生成时间: 2026-04-14 08:37 GMT+2*  
*基于: REPORT_ARCHITECTURE_V2_0414.md + ARCHITECTURE_WEBSOCKET_REFACTOR_20260413.md + 实时代码扫描*
