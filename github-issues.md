# 7zi 项目 GitHub Issues — 技术债务修复

> 基于 `TECH_DEBT_REVIEW_20261021.md` 生成
> 共计: **4 个 P0** + **7 个 P1** = **11 个 Issue**

---

## 🔴 P0 — 必须立即修复

---

### P0-1: [安全] JWT Secret 硬编码为 demo 值

**文件:** `7zi-backend/websocket/websocket-server.js` (约第30行)

```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key'
```

**问题描述:**
若环境变量 `JWT_SECRET` 未设置，系统将使用弱密钥 `demo-secret-key`，攻击者可伪造任意 JWT token 完全接管认证。

**复现步骤:**
1. 在未设置 `JWT_SECRET` 环境变量的情况下启动后端服务
2. 使用任何 JWT 库（如 `jwt.io`）用 `demo-secret-key` 签名一个伪造 token
3. 使用该 token 调用需要认证的 API 接口，验证成功绕过认证

**优先级:** 🔴 Critical
**标签:** `security`, `p0-critical`
**估计工时:** 1-2 小时

**修复方案:**
启动时检查环境变量是否存在，若未设置则抛出错误并退出，禁止使用 fallback 值。

---

### P0-2: [安全] better-sqlite3 在客户端打包

**文件:** `7zi-frontend/src/lib/db/feedback-storage.ts`, `notification-storage.ts`

**问题描述:**
`better-sqlite3` 是 Node.js 原生模块，无法在浏览器环境运行。当前配置下可能被前端 bundle 引入，导致构建警告或运行时崩溃，同时暴露数据库操作逻辑到客户端。

**复现步骤:**
1. 执行 `cd 7zi-frontend && pnpm build`
2. 检查构建输出是否有 `better-sqlite3` 相关警告
3. 检查 `.next/static/chunks/` 中是否包含 `better-sqlite3` 相关文件
4. 在浏览器控制台访问页面，验证是否存在原生模块加载错误

**优先级:** 🔴 Critical
**标签:** `security`, `p0-critical`, `build`
**估计工时:** 2-3 小时

**修复方案:**
在 `next.config.js` 中将 `better-sqlite3` 添加到 `serverExternalPackages` 或配置为 `external`，确保仅在服务端运行。

---

### P0-3: [安全] nodemailer 在客户端打包

**文件:** `7zi-frontend/src/lib/services/email.ts`

**问题描述:**
nodemailer 是纯 Node.js 包，不应进入前端 bundle。当前实现将 SMTP 凭据和邮件发送逻辑暴露在客户端，攻击者可提取凭据或滥用邮件服务。

**复现步骤:**
1. 执行 `cd 7zi-frontend && pnpm build`
2. 在构建输出中搜索 `nodemailer` 或 `SMTP`
3. 检查 `.next/static/chunks/` 中是否包含 nodemailer 相关代码
4. 在浏览器 DevTools 的 Sources 面板搜索 SMTP 配置字符串

**优先级:** 🔴 Critical
**标签:** `security`, `p0-critical`, `build`
**估计工时:** 3-4 小时

**修复方案:**
将 nodemailer 逻辑迁移到 Next.js API Route（`/app/api/email/route.ts`），前端通过 `fetch` 调用，API Route 中加载 nodemailer。

---

### P0-4: [质量] WorkflowEditorV110.tsx 重复文件未清理

**文件:** `7zi-frontend/src/components/WorkflowEditor/WorkflowEditorV110.tsx`

**问题描述:**
`WorkflowEditorV110.tsx` 与 `WorkflowEditor.tsx` 文件大小完全相同 (27186 bytes)，疑似版本迭代遗留但未清理。维护混乱，开发者在错误文件修改代码导致更改丢失。

**复现步骤:**
1. 对比两个文件内容，确认是否完全相同
2. 检查 `git log` 中两个文件的提交历史
3. 检查项目中是否有 import 引用 `WorkflowEditorV110.tsx`

**优先级:** 🔴 Critical
**标签:** `bug`, `p0-critical`, `cleanup`
**估计工时:** 0.5-1 小时

**修复方案:**
1. 确认哪个文件是正式版本（建议以 `WorkflowEditor.tsx` 为准）
2. 删除重复文件
3. 全局搜索确认无 import 引用被删除的文件
4. 若有引用，更新 import 路径

---

## 🟠 P1 — 高优先级

---

### P1-1: [类型安全] 20+ 文件使用 `any` 类型绕过类型检查

**涉及文件:** `websocket/core.ts`, `storage.ts`, `notification.ts`, `automation-engine.ts`, `PermissionGate.tsx` 等

**问题描述:**
项目配置了 `strict: true` 的 TypeScript，但 20+ 文件中大量使用 `any` 类型，完全绕过了编译时类型检查。这导致运行时类型错误难以追踪，重构风险极高。

**复现步骤:**
1. 在项目根目录执行 `grep -r ": any" src/ --include="*.ts" --include="*.tsx" | wc -l`
2. 执行 `pnpm tsc --noEmit` 查看类型错误数量
3. 检查核心类型文件是否已定义正确类型

**优先级:** 🟠 High
**标签:** `type-safety`, `p1-high`, `technical-debt`
**估计工时:** 8-16 小时（建议分 sprint 处理）

**修复方案:**
1. 优先替换核心类型文件（`websocket/types.ts`, `automation/types.ts`）的类型定义
2. 使用 `eslint-disable-next-line @typescript-eslint/no-explicit-any` 注释标记需要修复的位置
3. 制定分阶段清理计划，每期 sprint 清理 3-5 个文件
4. 考虑引入 `ts-reset` 增强内置类型

---

### P1-2: [依赖] Next.js 版本号异常 (16.3.8)

**文件:** `7zi-frontend/package.json`

**问题描述:**
`package.json` 中声明 `"next": "^16.3.8"`，但 Next.js 官方最新稳定版为 15.x（截至 2026 年初）。16.x 可能是内部 fork 或测试版本，存在未知兼容性问题和安全补丁滞后风险。

**复现步骤:**
1. 检查 `npm info next versions` 确认 16.x 是否为官方发布版本
2. 检查 `7zi-frontend/node_modules/next/package.json` 中的实际安装版本
3. 检查是否有自定义 patch 或 private registry 配置

**优先级:** 🟠 High
**标签:** `dependencies`, `p1-high`, `compatibility`
**估计工时:** 2-3 小时（调研+测试验证）

**修复方案:**
1. 确认 16.3.8 的来源（内部fork / private npm registry / 错误发布）
2. 若为非官方版本，评估是否可以升级到 Next.js 15.x 官方最新版
3. 若因业务原因必须使用 fork 版本，制定维护计划确保安全补丁同步

---

### P1-3: [依赖] nodemailer 版本锁定在 8.0.11 (2019年)

**文件:** `7zi-frontend/package.json`

**问题描述:**
nodemailer 版本锁定在 8.0.11（2019年发布），虽然 pnpm overrides 强制覆盖了 10+ 个次版本修复，但仍使用旧主版本。SMTP 协议兼容性、安全补丁严重落后于当前标准。

**复现步骤:**
1. 检查 `cat package.json | grep nodemailer`
2. 检查 `pnpm.overrides` 中的 nodemailer 配置
3. 对比 8.x 和 6.9.x（最新稳定版）的 changelog

**优先级:** 🟠 High
**标签:** `dependencies`, `p1-high`, `security`
**估计工时:** 2-3 小时

**修复方案:**
1. 升级到 nodemailer v6.9.x 最新稳定版
2. 同步修复因 API 变更导致的代码适配
3. （推荐）考虑迁移到更现代的邮件服务（Resend, SendGrid）减少运维负担

---

### P1-4: [代码质量] 多个大文件违反单一职责原则

**涉及文件:**

| 文件 | 行数 | 问题 |
|------|------|------|
| `automation-engine.ts` | 1236 | 自动化引擎过于臃肿 |
| `websocket/core.ts` | 1231 | WebSocket 客户端承担过多职责 |
| `alert-engine.ts` | 988 | 告警引擎单体 |
| `VisualWorkflowOrchestrator.ts` | 842 | 工作流编排器过大 |

**问题描述:**
多个核心文件超过 800 行，单一文件承担过多职责。代码可读性差、维护困难、测试覆盖率难以提升。

**复现步骤:**
1. 检查各文件的代码行数 `wc -l src/lib/**/*.ts`
2. 分析每个文件中的 import 数量和职责种类
3. 识别可以独立拆分的模块

**优先级:** 🟠 High
**标签:** `refactoring`, `p1-high`, `technical-debt`
**估计工时:** 20-30 小时（每个文件 5-8 小时）

**修复方案:**
1. 拆分 `automation-engine.ts`：
   - `automation/trigger-handler.ts` — 触发器处理
   - `automation/action-executor.ts` — 动作执行
   - `automation/condition-evaluator.ts` — 条件评估
2. 拆分 `websocket/core.ts`：
   - `websocket/connection-manager.ts` — 连接管理
   - `websocket/message-handler.ts` — 消息处理
   - `websocket/reconnection.ts` — 重连逻辑
3. 拆分 `alert-engine.ts`：
   - `alerting/rule-engine.ts` — 规则引擎
   - `alerting/channel-dispatcher.ts` — 渠道分发
4. 拆分 `VisualWorkflowOrchestrator.ts`：
   - `workflow/orchestration/state-machine.ts` — 状态机
   - `workflow/orchestration/execution-engine.ts` — 执行引擎

---

### P1-5: [代码质量] 大量 TODO/FIXME 未处理

**问题描述:**
代码库中存在多处 TODO 和 FIXME 注释，长期未处理形成技术债务积累。TODO 长期不处理会变成死代码或被遗忘的缺陷。

**高发位置:**

| 文件 | TODO/FIXME 数量 |
|------|-----------------|
| `src/lib/performance/alerting/channels.ts` | 6 处 |
| `src/lib/automation/automation-engine.ts` | 3 处 |
| `src/components/rooms/RoomPanel.tsx` | 3 处 |
| `src/components/WorkflowEditor/stores/workflow-editor-store-v110.ts` | 3 处 |

**复现步骤:**
1. 执行 `grep -rn "TODO\|FIXME\|XXX\|HACK" src/ --include="*.ts" --include="*.tsx"`

**优先级:** 🟠 High
**标签:** `technical-debt`, `p1-high`, `good-first-issue`
**估计工时:** 6-10 小时（分类+逐个处理）

**修复方案:**
1. 将 TODO 分类：功能性缺失 / 临时 workaround / 性能优化 / 安全加固
2. 可立即修复的转为 PR 合并
3. 需要较大重构的创建独立 Issue
4. 无实际意义或已过时的 TODO 直接删除

---

### P1-6: [架构] 存在两个 WebSocket 客户端实现

**涉及文件:**

- `src/lib/websocket/core.ts` (1231行，`WebSocketClient` 类)
- `src/features/websocket/lib/websocket-manager.ts`

**问题描述:**
项目中存在两套 WebSocket 客户端实现，重复代码，维护成本高，且两套实现的行为可能不一致导致难以追踪的 bug。

**复现步骤:**
1. 对比两个文件的导出接口和核心功能
2. 检查各自的 import 使用情况
3. 检查是否有功能差异

**优先级:** 🟠 High
**标签:** `architecture`, `p1-high`, `refactoring`
**估计工时:** 6-8 小时（分析 + 合并）

**修复方案:**
1. 分析两个实现的差异化功能需求
2. 保留更完善的一个作为主实现
3. 将差异化需求合并到主实现
4. 统一所有调用方使用单一入口

---

### P1-7: [测试] 后端测试覆盖严重不足

**涉及目录:** `7zi-backend/websocket/`, `7zi-backend/workflow-engine/`

**问题描述:**
Jest 配置存在但主代码目录下无正式测试文件，仅有 `test-*.js` 示例文件。重构风险极高，任何修改都可能破坏现有功能且无法及时发现。

**复现步骤:**
1. 检查 `ls 7zi-backend/websocket/` 下的测试文件
2. 检查 `ls 7zi-backend/workflow-engine/` 下的测试文件
3. 执行 `cd 7zi-backend && pnpm test` 查看覆盖率报告

**优先级:** 🟠 High
**标签:** `testing`, `p1-high`, `backend`
**估计工时:** 12-16 小时（补充核心业务逻辑测试）

**修复方案:**
1. 为 `websocket-server.js` 核心功能编写单元测试：
   - JWT 认证流程
   - 连接管理
   - 消息路由
2. 为 `workflow-engine/server.js` 编写单元测试：
   - 工作流创建/更新/删除
   - 状态机转换
   - 错误处理
3. 添加集成测试验证端到端流程
4. 配置 CI 确保 PR 必须通过测试

---

## 📋 Issue 汇总表

| # | ID | 标题 | 优先级 | 标签 | 估计工时 |
|---|-----|------|--------|------|----------|
| 1 | P0-1 | JWT Secret 硬编码为 demo 值 | 🔴 Critical | security, p0-critical | 1-2h |
| 2 | P0-2 | better-sqlite3 在客户端打包 | 🔴 Critical | security, p0-critical, build | 2-3h |
| 3 | P0-3 | nodemailer 在客户端打包 | 🔴 Critical | security, p0-critical, build | 3-4h |
| 4 | P0-4 | WorkflowEditorV110.tsx 重复文件 | 🔴 Critical | bug, p0-critical, cleanup | 0.5-1h |
| 5 | P1-1 | 20+ 文件使用 `any` 类型 | 🟠 High | type-safety, p1-high | 8-16h |
| 6 | P1-2 | Next.js 版本号异常 (16.3.8) | 🟠 High | dependencies, p1-high | 2-3h |
| 7 | P1-3 | nodemailer 版本锁定在 8.0.11 | 🟠 High | dependencies, p1-high, security | 2-3h |
| 8 | P1-4 | 多个大文件违反单一职责原则 | 🟠 High | refactoring, p1-high | 20-30h |
| 9 | P1-5 | 大量 TODO/FIXME 未处理 | 🟠 High | technical-debt, p1-high | 6-10h |
| 10 | P1-6 | 存在两个 WebSocket 客户端实现 | 🟠 High | architecture, p1-high | 6-8h |
| 11 | P1-7 | 后端测试覆盖严重不足 | 🟠 High | testing, p1-high, backend | 12-16h |

**总计:** P0: 4 个 (~9h) | P1: 7 个 (~58h) | **总计约 67h**

---

*生成时间: 2026-10-21 | 来源: TECH_DEBT_REVIEW_20261021.md*
