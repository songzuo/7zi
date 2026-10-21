# 开发任务生成器 — 2026-10-21 08:05 (Berlin)

**主管**: AI主管 (OpenClaw)
**模型**: minimax/MiniMax-M2.7 (已确认唯一可用供应商)

---

## 诊断

- 仓库 `git status`: 24 个已修改文件 + 多个未跟踪目录（7zi-backend/websocket-service、workflow-service 未纳入版本控制）
- `npx tsc --noEmit -p tsconfig.json` → **EXIT 0**（根项目类型干净）
- `src/` 中 `: any` 仍有 130 处
- `7zi-frontend` 版本 1.14.1，`7zi-backend` 全新整合目录，服务几乎无测试
- 技术债清单 `github-issues.md`（今日生成）：4 个 P0 + 7 个 P1

## 选定任务（3 个并行）

| # | 角色 | 任务 | 会话 |
|---|------|------|------|
| T1 | 🛡️ 系统管理员 / Bug修复 | **P0-1 JWT Secret 硬编码** — `7zi-backend/websocket-service/src/index.js:36` 回退 `demo-secret-key`，可伪造 token。参照 `server/websocket-server.js` 的 getJWTSecret() 逻辑，抽取到独立模块 + 补单测 | agent:main:subagent:0337ae01 |
| T2 | 🧪 测试员 | **workflow-service 测试套件** — 该服务 0 测试。建立 HTTP 层 + 引擎层自动化测试，覆盖率目标 ≥70%，产出 TEST_REPORT.md | agent:main:subagent:c9fec8e7 |
| T3 | 🏗️ 架构师 / 代码优化 | **P0-2/P0-3 客户端 bundle 泄漏** — better-sqlite3 / nodemailer 是否进客户端 bundle，证据化诊断 + 修复（邮件迁服务端 API Route）+ 修两个预存 TS 错误 | agent:main:subagent:bdb97dc6 |

**未选任务及原因**
- P0-4 删除 `WorkflowEditorV110.tsx`：经核实两文件 md5 不同（27186 vs 23757 bytes），且 V110 被 `index.ts`/`index.v110.ts`/`examples-v110.tsx` 真实引用 — 不是简单重复文件，误删会破坏构建。需先做功能对比，超出本轮范围。
- P1-1 清理 130 处 `any`、P1-4 拆分 4 个千行大文件：工程量 8-30 小时，不适合无人值守 cron 轮次。

## 约束（已下发给各子代理）
- 目录隔离：T1/T2 只动 `7zi-backend/websocket-service` 与 `workflow-service`；T3 只动 `7zi-frontend/`
- 统一由主管提交 git，子代理不 commit
- 不升级依赖版本，不引入新包

---
*状态：进行中*
