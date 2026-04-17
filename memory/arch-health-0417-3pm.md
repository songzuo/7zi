# 🏗️ 架构健康检查报告

**时间:** 2026-04-17 15:16 GMT+2  
**审查者:** 🏗️ 架构师子代理  
**版本:** v1.14.0  
**基准文档:** `ARCHITECTURE_V2_DETAILED_20260414.md`

---

## 一、文档完整性检查

### 1.1 目标文档

| 文档 | 状态 | 说明 |
|------|------|------|
| `ARCHITECTURE_V2.md` | ❌ **不存在** | 应为 `ARCHITECTURE_V2_DETAILED_20260414.md` |
| `ARCHITECTURE_V2_DETAILED_20260414.md` | ✅ 存在 | 1053 行，详细 Phase 计划 |
| `docs/ARCHITECTURE.md` | ✅ 存在 | 通用架构文档（最后更新 2026-03-22） |
| `REPORT_ARCHITECTURE_0417.md` | ✅ 存在 | 今日 02:15 架构审查报告 |

### 1.2 文档对齐问题

- **V2 文档缺失**: 任务引用 `ARCHITECTURE_V2.md` 但实际文件为 `ARCHITECTURE_V2_DETAILED_20260414.md`，命名不统一
- **文档版本滞后**: `docs/ARCHITECTURE.md` 最后更新 2026-03-22，与 v1.14.0 脱节 12 天
- **V2 文档指标已过时**: V2 文档称 `src/lib/` 有 55 个子目录，实际为 **105 个**（几乎翻倍）

---

## 二、代码结构 vs 架构文档对比

### 2.1 核心指标对比

| 指标 | V2 文档值 | 实际值 | 趋势 |
|------|-----------|--------|------|
| `src/lib/` 子目录数 | 55 | **105** | 📈 膨胀加剧 |
| TypeScript 文件 (lib/) | 1066 | ~1000+ | ➖ 持平 |
| `console.*` 调用 (lib/) | 1582 | **~1293** | 📉 部分清理 |
| `any` 类型 (lib/) | 922 处 | **77 处** | 📉✅ 显著改善 |
| WebSocket Manager 行数 | 1473 | **37** (stub) | 📉 已替换 |
| 超大文件 (>300行) | 7 个 | 存在（最大 1741 行） | ⚠️ 未改善 |
| DraftStorage 重复 | 3 份 | **1 份** (`storage/draft-storage.ts`) | ✅ 已统一 |
| Notification 重复 | 5+ 份 | 分散（`alerting/`, `services/`, `notifications/`） | ⚠️ 部分改善 |

### 2.2 Phase 1 进度

| P0 改动 | 状态 | 说明 |
|---------|------|------|
| P0-1: `db/feedback-storage.ts` @server-only | ⚠️ 需确认 | 文件仍存在 |
| P0-2: `services/notification-storage.ts` @server-only | ❌ **未完成** | 文件仍使用 `path.join`/`process.cwd()` |
| P0-3: WebSocket Manager 拆分 (→ 10 子模块) | ⚠️ **部分完成** | 原 1473 行 → 37 行 stub；实际实现在 `lib/websocket/` (16 文件) |
| P0-4: `console.*` → `logger` 替换 | 🔄 进行中 | 1582 → 1293，减少 18% |
| P0-5: `errors.ts` 简化 | ❌ 未开始 | `lib/errors.ts` 仍存在 |

| P1 改动 | 状态 | 说明 |
|---------|------|------|
| P1-1: DraftStorage 统一 | ✅ **已完成** | 仅剩 `storage/draft-storage.ts` |
| P1-2: Notification 合并 | ⚠️ 部分完成 | `alerting/`, `services/`, `notifications/` 仍分散 |
| P1-3: next.config.ts React Compiler 冲突 | ⚠️ 仍存在 | React Compiler 配置与 `optimizeCss` 潜在冲突 |
| P1-4: `lib/hooks/` 合并 | ❌ 未开始 | `lib/hooks/` 仍独立存在 |
| P1-5: `errors.ts` 拆分 | ❌ 未开始 | 364 行未拆分 |
| P1-6: `monitoring/` 与 `performance/` 重叠审计 | ❌ 未开始 | 两者仍并存 |

### 2.3 Phase 2/3 进度

| 改动 | 状态 | 说明 |
|------|------|------|
| P0-6: `lib/` → `modules/` 重构 | ❌ 未开始 | 105 个子目录，膨胀加剧 |
| P0-7: 统一 API Client | ❌ 未开始 | 散落 fetch 调用未收敛 |
| P0-8: ErrorBoundary 体系 | ❌ 未开始 | 错误处理仍分散 |
| P0-9: TypeScript 100% 覆盖 | 🔄 进行中 | `any` 从 922 降至 77 |
| P2-5: Plugin 系统完善 | ❌ 未开始 | `lib/plugins/` 存在但未标准化 |

---

## 三、架构 Debt 识别

### 🔴 高优先级 Debt

#### Debt-1: 服务端 API 误用（严重）
- **位置:** `src/lib/services/notification-storage.ts`
- **问题:** 使用 `path.join`, `process.cwd()` 等 Node.js API，在前端构建时静默失败
- **影响:** 纯前端构建可能崩溃
- **修复:** 标记 `@server-only` 或迁移到服务端模块
- **工作量:** 0.5h

#### Debt-2: WebSocket Manager Stub 陷阱
- **位置:** `src/lib/websocket-manager.ts` (37 行 stub)
- **位置:** `src/lib/websocket/` (16 文件真实实现)
- **问题:** stub 仅导出空实现；真实实现在 `lib/websocket/`
- **影响:** 2 个引用方 (`RemoteCursorContainer`, `useRemoteCursors`) 使用 stub，实际功能依赖独立模块
- **风险:** 中 — stub 可能让新开发者困惑
- **修复:** 删除 stub，迁移引用方到 `lib/websocket/`
- **工作量:** 2h

#### Debt-3: lib/ 目录膨胀失控
- **位置:** `src/lib/` (105 个子目录)
- **问题:** 相比 V2 文档的 55 个，膨胀近一倍
- **影响:** 维护性降低，模块边界模糊
- **根因:** 无模块化准入规则，新模块直接塞入 lib/
- **工作量:** 长期（Phase 2/3）

### 🟠 中优先级 Debt

#### Debt-4: 重复 Notification 实现
- **位置:** `alerting/`, `services/`, `notifications/`
- **问题:** 3 个目录处理通知，职责重叠
- **工作量:** 2d

#### Debt-5: 错误处理碎片化
- **位置:** `lib/errors.ts`, `lib/error-handler.ts`, `lib/middleware/error-handler.ts`
- **问题:** 3 处错误处理定义，无统一 ErrorBoundary
- **工作量:** 2d

#### Debt-6: 超大文件未改善
- **问题:** 最大单文件 1741 行 (`VisualWorkflowOrchestrator.test.ts`)
- **实际业务文件:** `websocket/server.ts` 1403 行, `query-builder.ts` 1300 行
- **工作量:** 持续重构

#### Debt-7: React Compiler 配置冲突风险
- **位置:** `next.config.ts`
- **问题:** React Compiler 与 `optimizeCss` 潜在冲突未验证
- **工作量:** 1h

### 🟡 低优先级 Debt

#### Debt-8: `lib/hooks/` 未合并
- **位置:** `src/lib/hooks/` vs `src/hooks/`
- **问题:** 两处 hooks 目录，路径不一致

#### Debt-9: 文档与实现脱节
- **问题:** `docs/ARCHITECTURE.md` 滞后 12 天
- **工作量:** 2h 更新

---

## 四、改进建议

### 立即行动（本周）

1. **删除/修复 `notification-storage.ts`** — 服务端 API 误用是 P0 安全隐患
2. **清理 WebSocket stub** — 迁移 2 个引用方到 `lib/websocket/`，删除 stub
3. **继续 `console.*` → `logger` 替换** — 剩余 ~1293 处需分批清理

### 短期计划（2 周）

4. **建立 `lib/` 准入规则** — 新模块必须归属现有域，禁止无限膨胀
5. **统一 Notification** — 合并 `alerting/`, `services/notification*.ts`, `notifications/` 为单一模块
6. **更新 `docs/ARCHITECTURE.md`** — 对齐 v1.14.0

### 中期计划（1-2 月）

7. **Phase 2 重构启动** — `lib/` → `modules/` 按领域重组
8. **统一 API Client** — 消除散落 fetch 调用
9. **ErrorBoundary 体系** — 统一错误处理架构

---

## 五、架构健康评分

| 维度 | 评分 | 趋势 | 说明 |
|------|------|------|------|
| **文档完整性** | 6/10 | ➖ | V2 文档存在但命名/指标脱节 |
| **代码组织** | 5/10 | 📉 | lib/ 105 目录，膨胀失控 |
| **TypeScript 质量** | 8/10 | 📈 | `any` 从 922 降至 77 |
| **WebSocket 架构** | 7/10 | 📈 | 已拆分但 stub 需清理 |
| **错误处理** | 5/10 | ➖ | 碎片化，无统一边界 |
| **模块职责** | 6/10 | ➖ | Notification/DraftStorage 部分改善 |
| **配置安全** | 6/10 | ⚠️ | 仍存在服务端 API 误用 |

**综合评分: 6.0/10** （上周期望 7.0，实际偏低）

---

## 六、风险提醒

1. **`notification-storage.ts` 使用 Node.js API** — 如被前端 bundle 引入，会导致运行时错误
2. **lib/ 膨胀速度超过清理速度** — 如不控制，6 个月后可能突破 200 目录
3. **Phase 1 进度滞后** — V2 文档发布 3 天，但大部分 P0 改动未开始

---

*报告生成: 2026-04-17 15:16 GMT+2*  
*🏗️ 架构师 | 任务: arch-health-0417-3pm*
