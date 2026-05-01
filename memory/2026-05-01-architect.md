# 🏗️ 架构重构优先级报告
**架构师 | 2026-05-01 03:42 UTC**

---

## 1. 项目状态检查

### Git 状态
- **分支**: main，本地领先 origin/main 1 个 commit
- **未提交**: 15 个文件（frontend 配置、dashboard UI、API routes 等）

### TypeScript 编译
- **错误数**: ~105 errors (`tsc --noEmit` 在 `7zi-frontend/`)
- **注**: 相比 2026-04-26 的 517 errors 大幅下降，但仍有未解决错误
- **主要错误模式**:
  - `Cannot find name 'logger'` (3 处: workflow-store, pwa route, socket route)
  - `Cannot find name 'identifyUser'` (login/page.tsx)
  - 测试文件中的类型不匹配（未初始化变量 `pastedResult`/`cutResult`）
  - WorkflowTemplate 类型不一致

### `as any` 使用统计
- **总计**: 318 处（7zi-frontend/src 内，排除 node_modules）
- **Top 文件**（测试文件为主）:
  - `webhook-alert.test.ts`: 35 处
  - `email.test.ts`: 25 处
  - `sms-alert.test.ts`: 24 处
  - `email-alert.test.ts`: 22 处
  - 业务代码中: collab/server.ts, collab/client.ts, websocket-manager.ts, performance-hooks.ts 等

---

## 2. 重构优先级列表

### 🔴 P0 - 阻断编译错误（立即处理）

| 优先级 | 问题 | 涉及文件 | 错误数 |
|--------|------|----------|--------|
| P0-1 | `logger` 未定义 | `workflow-store.ts`, `pwa/route.ts`, `socket/route.ts` | 3 |
| P0-2 | `identifyUser` 未定义 | `login/page.tsx` | 1 |
| P0-3 | 测试文件未初始化变量 | `workflow-editor-v110.test.ts` | ~10 |

**工时估算**: 0.5h（缺失导入/变量声明，纯粹工程修复）

### 🟡 P1 - 高价值重构（1-2 周）

| 优先级 | 问题 | 涉及文件 | 说明 |
|--------|------|----------|------|
| P1-1 | Notification 系统重复 | 8 个文件，3470 行 | `notification.ts` + `notifications.ts` + `notification-manager.ts` + `notification-enhanced.ts` + `notification-storage.ts` + `notification-indexeddb.ts` + `notification-center.tsx` + `notification-types.ts` |
| P1-2 | collab 模块 `as any` | `collab/server.ts`, `collab/client.ts` | OperationData、CursorData 类型守卫缺失 |
| P1-3 | validation 模块类型 | 约 30+ errors | AsyncValidator 接口设计问题 |

### 🟢 P2 - 长期技术债务

| 优先级 | 问题 | 说明 |
|--------|------|------|
| P2-1 | 测试文件 `as any` 清理 | ~120+ 处，主要在 monitoring、audio、workflow 测试 |
| P2-2 | lib/ 目录膨胀 | 47+ 子目录，边界模糊 |
| P2-3 | WebSocket 重构未完成 | ConnectionState 缺失（4 月报告中） |

---

## 3. 最优先的 3 个可执行任务

### 🏆 任务 1: 修复 4 个阻断编译错误
**文件**: 
- `workflow-store.ts` (logger)
- `api/pwa/route.ts` (logger)
- `api/notifications/socket/route.ts` (logger)
- `login/page.tsx` (identifyUser)

**操作**: 补齐缺失的导入或定义
**工时**: **15-30 分钟**
**价值**: 修复后 `tsc --noEmit` 通过率提升，开发者体验立即改善

---

### 🥈 任务 2: Notification 系统去重整合
**现状**: 8 个文件，3470 行，功能高度重叠
```
notification.ts          (224 行)    - 基础定义
notifications.ts         (10 行)     - 重导出
notification-types.ts    (69 行)     - 类型
notification-manager.ts  (648 行)    - 管理器
notification-enhanced.ts  (676 行)    - 增强版
notification-storage.ts   (634 行)    - 存储
notification-indexeddb.ts (662 行)   - IndexedDB
notification-center.tsx   (547 行)    - React 组件
```

**建议**: 合并为 3 个模块
- `notification-types.ts` — 类型定义（保留）
- `notification-core.ts` — 核心逻辑（合并 manager+enhanced+storage）
- `notification-ui.tsx` — React 组件（从 center.tsx 提取）

**工时**: **4-6 小时**（分析 + 重构 + 测试）
**价值**: 减少 2000+ 行重复代码，长期维护成本大幅下降

---

### 🥉 任务 3: collab 模块类型守卫建立
**文件**: `collab/server.ts`, `collab/client.ts`
**问题**: 10+ 处 `as any` 强制转换，数据类型不安全

**操作**: 
1. 定义 `OperationData` / `CursorData` / `SyncData` 接口
2. 建立类型守卫函数
3. 替换 `as any` 为类型守卫

**工时**: **2-3 小时**
**价值**: 协作核心模块类型安全，运行时错误风险降低

---

## 4. 总结

| 维度 | 当前状态 | 目标 |
|------|----------|------|
| TS 错误 | ~105 | <20 |
| `as any` | 318 | <50（业务代码） |
| Notification 文件 | 8 | 3 |
| 编译状态 | 部分阻断 | 全通过 |

**推荐行动顺序**: P0修复(0.5h) → collab类型(2.5h) → notification去重(5h) → P1/P2持续推进

---
*报告生成：🏗️ 架构师子代理 | 时间：2026-05-01 03:42 UTC*
