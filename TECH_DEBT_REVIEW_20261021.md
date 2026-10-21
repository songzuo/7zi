# 7zi 项目技术债务审查报告

**审查日期:** 2026-10-21  
**审查范围:** `7zi-backend/` + `7zi-frontend/`  
**审查角色:** 📚 咨询师（Consultant）

---

## 📊 一、代码概览

### Backend (7zi-backend)

| 指标 | 数值 |
|------|------|
| 语言 | JavaScript (无 TypeScript) |
| 入口文件 | `websocket/websocket-server.js` (774行), `workflow-engine/server.js` (521行) |
| 依赖总数 | 9 个生产依赖 |
| 测试框架 | Jest (已配置但疑似未充分使用) |
| 代码规范 | ESLint (无 TypeScript 校验) |
| ES 模块 | ❌ 仅使用 `require()` |

### Frontend (7zi-frontend)

| 指标 | 数值 |
|------|------|
| 语言 | TypeScript (strict mode) |
| 最大文件 | `automation-engine.ts` (1236行), `websocket/core.ts` (1231行) |
| 依赖总数 | 50+ 生产依赖 |
| 框架 | Next.js 16.3.8, React 19.2.5 |
| 测试框架 | Vitest + Playwright |
| Lint | ESLint + jscpd (代码复制检测) |

---

## 🔴 P0 — 必须立即修复（业务/安全风险）

### P0-1: [安全] JWT Secret 硬编码为 demo 值
**文件:** `7zi-backend/websocket/websocket-server.js` (约第30行)
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key'
```
**风险:** 若环境变量未设置，攻击者可伪造任意 JWT token。  
**修复:** 启动失败若未设置 `JWT_SECRET`，移除 fallback 值。

### P0-2: [安全] better-sqlite3 在客户端打包
**文件:** `7zi-frontend/src/lib/db/feedback-storage.ts`, `notification-storage.ts`
**风险:** `better-sqlite3` 是 Node.js 原生模块，无法在浏览器运行。若被前端 bundle 引入会导致构建失败或运行时错误。需确认是否通过 Next.js 插件规则正确排除。
**修复:** 检查 `next.config.js` 是否将 `better-sqlite3` 正确external化。

### P0-3: [安全] nodemailer 在客户端打包
**文件:** `7zi-frontend/src/lib/services/email.ts`
**风险:** nodemailer 是纯 Node.js 包，不应进入前端 bundle。暴露 SMTP 凭据或邮件逻辑到客户端。
**修复:** 将 nodemailer 移到 API Route (服务端)，前端通过 fetch 调用。

### P0-4: [质量] WorkflowEditorV110.tsx 疑似重复文件
**文件:** `7zi-frontend/src/components/WorkflowEditor/WorkflowEditorV110.tsx`
**说明:** 与 `WorkflowEditor.tsx` 文件大小完全相同 (27186 bytes)，疑似版本遗留但未清理。
**风险:** 维护混乱，可能导致开发者在错误文件修改。
**修复:** 确认哪个是正式版本，删除另一个。

---

## 🟠 P1 — 高优先级（影响开发效率或稳定性）

### P1-1: [类型安全] 20+ 文件使用 `any` 类型
**涉及文件:** `websocket/core.ts`, `storage.ts`, `notification.ts`, `automation-engine.ts`, `PermissionGate.tsx` 等
**风险:** `strict: true` 的 TypeScript 项目大量使用 `any` 绕过了类型检查，失去 TS 价值。线上运行时类型错误难以追踪。
**修复:** 优先替换核心类型文件 (`websocket/types.ts`, `automation/types.ts`)，制定 `any` 清理计划。

### P1-2: [依赖] Next.js 版本号异常
**当前:** `"next": "^16.3.8"`  
**说明:** Next.js 最新稳定版为 15.x（截至2026年初）。16.x 可能是内部fork或测试版本，存在未知的兼容性问题或安全补丁滞后。
**修复:** 确认 `16.3.8` 来源。若为 npm 发布版则升级到官方最新稳定版。

### P1-3: [依赖] nodemailer 版本锁定在 8.0.11
**当前:** `"nodemailer": "^8.0.11"` (2019年发布)  
**说明:** pnpm overrides 强制覆盖了 10+ 次版本修复，但仍使用旧主版本。SMTP 协议兼容性、安全补丁落后。
**修复:** 升级到 nodemailer v6.x 最新版 (v6.9.x)，或在 P0 规划中迁移到更现代的邮件服务（如 Resend, SendGrid）。

### P1-4: [代码质量] 大文件单体问题
| 文件 | 行数 | 问题 |
|------|------|------|
| `automation-engine.ts` | 1236 | 自动化引擎过于臃肿，单一责任原则违反 |
| `websocket/core.ts` | 1231 | WebSocket 客户端承担过多职责 |
| `alert-engine.ts` | 988 | 告警引擎单体 |
| `VisualWorkflowOrchestrator.ts` | 842 | 工作流编排器过大 |

**修复:** 拆分为多个小模块/类，每个不超过 300 行。

### P1-5: [代码质量] 大量 TODO/FIXME 未处理
**Top 位置:**
- `src/lib/performance/alerting/channels.ts` — 6 处
- `src/lib/automation/automation-engine.ts` — 3 处
- `src/components/rooms/RoomPanel.tsx` — 3 处
- `src/components/WorkflowEditor/stores/workflow-editor-store-v110.ts` — 3 处

**风险:** 技术债累积，TODO 长期无人处理变成死代码。
**修复:** 分配专题 sprint 清理或转化为 GitHub Issues。

### P1-6: [架构] 存在两个 WebSocket 客户端实现
**位置:**
- `src/lib/websocket/core.ts` (1231行，WebSocketClient 类)
- `src/features/websocket/lib/websocket-manager.ts`

**风险:** 重复实现，维护成本高，行为可能不一致。
**修复:** 统一为一个实现，分析是否有差异化需求。

### P1-7: [测试] 后端测试覆盖严重不足
**说明:** Jest 配置存在但主代码 `websocket/` 和 `workflow-engine/` 下无正式测试文件，仅有 `test-*.js` 示例文件。
**风险:** 重构风险高，任何修改都可能破坏现有功能。
**修复:** 补充核心业务逻辑的单元测试。

---

## 🟡 P2 — 中优先级（改进项）

### P2-1: [依赖] 大量 pnpm overrides 反映依赖管理混乱
**当前:** 40+ 条 override 规则，主要针对 `brace-expansion`, `nodemailer`, `fast-uri` 等间接依赖。
**说明:** 过度 override 说明依赖版本树有冲突，可能是间接依赖锁死了老版本。
**修复:** 定期审查依赖，更新主版本使 override 规则最小化。

### P2-2: [类型安全] evomap 模块测试文件使用 `any`
**文件:** `src/lib/evomap/__tests__/gateway.test.ts`
**说明:** 测试文件大量使用 `any`，测试本身的类型安全无法保证。
**修复:** 为测试文件补充正确的 mock 类型。

### P2-3: [工程化] jscpd (代码复制检测) 未集成 CI
**说明:** `jscpd ^5.4.1` 在 devDependencies 中但未见 npm script 引用。代码复制检测未自动化。
**修复:** 添加 `npm run check:duplicates` 到 CI pipeline。

### P2-4: [架构] socket.io-client 在多处使用
**文件:** 至少 7 处直接导入 `socket.io-client`
**说明:** 应统一通过 `websocket-store` 或 `websocket-manager` 封装，避免组件直接依赖 Socket 实例。
**修复:** 审查并强制通过 store 层访问 WebSocket。

### P2-5: [代码质量] Backend 无 TypeScript
**说明:** 后端纯 JS，无类型检查，与前端 TS 项目割裂。
**修复:** 中期规划将后端迁移到 TypeScript，或至少添加 JSDoc 类型注释。

### P2-6: [文档] websocket-server.js 头部注释过期
**文件:** `7zi-backend/websocket/websocket-server.js`
**注释:** `PORT - WebSocket server port (default: 3001)` 但代码中 `default: 3002`
**修复:** 修正注释或统一端口约定。

---

## 📋 优先级汇总

| 优先级 | 数量 | 主要类别 |
|--------|------|----------|
| **P0** | 4 | 安全漏洞 × 3，代码混乱 × 1 |
| **P1** | 7 | 类型安全 × 1，依赖 × 2，大文件 × 1，TODO × 1，多实现 × 1，测试 × 1 |
| **P2** | 6 | 依赖管理 × 1，类型 × 1，CI × 1，架构 × 2，文档 × 1 |

---

## 🎯 推荐行动

### 本周内 (P0 修复)
1. ✅ 修复 JWT secret fallback（阻止生产环境使用 demo key）
2. ✅ 验证 better-sqlite3 和 nodemailer 未进入 client bundle
3. ✅ 清理 WorkflowEditorV110.tsx 重复文件

### 本月内 (P1 修复)
1. 制定 `any` 类型清理计划，优先处理核心模块
2. 确认 Next.js 16.3.8 版本来源
3. 拆分 >1000 行的大文件（automation-engine, websocket/core）
4. 将 TODO/FIXME 转化为 GitHub Issues
5. 统一 WebSocket 客户端实现

### 中期规划 (P2)
1. 清理 pnpm overrides，减少间接依赖冲突
2. 后端 TypeScript 迁移评估
3. 将 jscpd 集成到 CI
4. 补充后端测试覆盖

---

*报告生成: 7zi 技术债务审查 | 审查人: 咨询师 (Consultant)*
