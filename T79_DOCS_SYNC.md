# T79 — 文档同步到真实基线（📚 咨询师）

**执行时间**：2026-10-24 00:08 ~ 00:25 (Asia/Shanghai)
**范围**：仅修改工作区根目录 `CHANGELOG.md`、`README.md`、`HEARTBEAT.md`，另写本报告
**约束遵守**：未执行 `git add` / `git commit` / `git push`；未触碰任何源码、配置或其他文档

---

## 0. 事实核对（全部先跑命令再落笔）

| 待写事实 | 核对命令 | 实测输出 | 结论 |
|---------|---------|---------|------|
| 后端 ESLint 归零 | `cd 7zi-backend && npx eslint .` | 无任何输出，exit 0 | ✅ 0 error / 0 warning |
| 前端 ESLint 归零 | `cd 7zi-frontend && npx eslint src` | 无任何输出，exit 0 | ✅ 0 error / 0 warning |
| 前端 TS 类型 | `cd 7zi-frontend && npx tsc --noEmit` | 无输出，exit 0 | ✅ 0 error |
| 根级 TS 类型 | `npx tsc --noEmit` | 无输出，exit 0 | ✅ 0 error |
| 后端 Jest | `cd 7zi-backend && npx jest` | `Test Suites: 16 passed, 16 total` / `Tests: 342 passed, 342 total` / `Ran all test suites in 2 projects.` | ✅ 16/342 全绿 |
| 前端 error-reporting | `cd 7zi-frontend && npx vitest run src/lib/error-reporting` | `Test Files 4 passed (4)` / `Tests 89 passed (89)` / Duration 4.81s | ✅ 4/89 全绿 |
| collab-client 遗留 | `cd 7zi-frontend && npx vitest run tests/features/collab-client.test.ts` | `Test Files 1 failed (1)` / `Tests 19 failed \| 19 passed (38)` / `Errors 2 errors` / Duration 2.18s | ❌ 确认遗留，归 T77 |
| 根级 eslint（**非**门禁路径） | `npx eslint src` | `✖ 1631 problems (1 error, 1630 warnings)`；唯一 error = `src/lib/utils/format.ts:47 prefer-const 'absNum' is never reassigned` | ⚠️ 单独记录为遗留 |

### 关于「根级 eslint 有 1 error」的说明
`7zi-frontend/src` 与根级 `src/` 是**两条不同的 lint 路径**（仓库根同时存在两套 `src/`）。
门禁口径是 `7zi-frontend/src`（0/0），根级 `src/` 仍有 1 error / 1630 warnings。
本文档**如实记录两者，未把根级数字冒充为门禁数字，也未修改根级代码**。

### 未验证项
- **后端 CI workflow 在真实 GitHub Actions 上的首次运行** —— 本地无 CI 执行环境，标注为「尚未跑过」。
- **后端覆盖率百分比（94.74% / 93.46% / 96.95%）** —— 本次未跑 `--coverage`（预算所限），
  这些数字沿用 CHANGELOG 2026-10-23 段落已有记录，未新增、未修改。

---

## 1. 改动摘要

### 1.1 `CHANGELOG.md`（+79 行，只加不删）

在顶部 `## [未发布] / 2026-10-23` 之前**新增** `## [未发布] / 2026-10-24` 段落，历史段落未改写：

- **🧹 代码质量门禁全清（T69–T76）**
  - 后端 ESLint 0/0（含 T68 → T71 → T75 的完整归零路径与根因）
  - 前端 ESLint 0/0（312 → T72 24→1 → T74 18→0 → 0）
  - 根级 `src/` TS 0 error
  - 明确标注根级 `npx eslint src` 仍有 1 error / 1630 warnings，未修复
- **🧪 测试**
  - 后端 Jest 16 套件 / 342 用例全绿
  - 前端 error-reporting 4 文件 / 89 用例全绿
  - T76 新增 `error-reporting.test.ts` 581 行 / 40 用例
  - `retry.ts` 3 个真 Bug 逐条列出 + 性能 245.04s → 3.80s
- **📄 文档同步**：T73 做了什么、T79 做了什么
- **❗ 当前遗留**：collab-client 19 failed / 19 passed + 2 Unhandled Rejection（归 T77）、
  根级 `format.ts:47` 1 error、CI 未首跑

### 1.2 `README.md`（改 4 处）

| 位置 | 改动 |
|------|------|
| `## 🧪 测试` → `### 测试统计` | 表格重写：删除过期的「测试通过率 94.2% (279/296+)」「96% 覆盖率」，改为后端 16/342 全绿、前端 error-reporting 4/89 全绿；补一行说明历史口径已不代表当前状态 |
| `### 运行测试（前端 / Vitest）` 后的 `⚠️ 已知问题` 块 | **删除**「`retry.test.ts` 11 个用例仍失败 / Duration 245s」的过期表述，改为 ✅ 已全绿的实测数据 + 修复三点原因；同时新增 ❗ 块指出唯一已知失败是 collab-client（归 T77） |
| `### 代码质量现状（2026-10-23 实测）` | 标题日期改为 2026-10-24；后端「0 errors / 11 warnings」→「✅ 0 errors / 0 warnings」；前端「0 errors / 24 warnings」→「✅ 0 errors / 0 warnings」；新增两行实测（后端 Jest、前端 vitest）；补 T68→T71→T75 / T72→T74 归零路径说明 |
| `## 📋 版本历史` 表 | 在 2026-10-23 行**上方**新增 2026-10-24 一行（门禁全清 + 测试基线 + retry 修复 + 文档同步） |

另新增 `### ❗ 当前遗留（2026-10-24 实测，均未修复）` 三行表：collab-client / `format.ts:47` / CI 首跑未验证。

### 1.3 `HEARTBEAT.md`（新增 1 节 + 修 1 行）

- 在 `2026-10-23 20:55` 小节之后新增 **`## 2026-10-24 00:20 北京时间 — 仓库门禁基线（T79 实测复现）`**：
  - 5 条门禁命令 + 实测结果的表格（可作为心跳复检基线）
  - T69–T76 成果摘要 + 指向 `T79_DOCS_SYNC.md`
  - `### ❗ 遗留` 三项，含 T77 落地后需重跑全部 5 条命令的提示
  - `### 心跳复检脚本`（一次跑完 5 条的 bash 片段）
- 旧小节的「遗留：全仓 `npx eslint .` 剩余 11 warnings」**保留原文**（属历史记录），
  仅追加一行箭头注释 → 「已于 T75 清理完毕（11 → 0）」

---

## 2. 检查并修正的过期表述

| 位置 | 过期表述 | 处理 |
|------|---------|------|
| README `### 测试统计` | 「测试通过率 94.2% (279/296+)」「96% 覆盖率」 | 已替换为当前实测基线 + 口径说明 |
| README 前端 vitest 段 | 「11 个用例当前仍然失败 … 3 文件 / 45 用例，34 passed / 11 failed，Duration 245s」 | 已替换为 ✅ 4 文件 / 89 用例全绿 |
| README 代码质量现状 | 「后端 0 errors / 11 warnings」「前端 0 errors / 24 warnings」 | 已更新为 0/0，并标注实测日期 |
| README 版本历史 | 缺 2026-10-24 行 | 已新增 |
| CHANGELOG | 缺 2026-10-24 段落 | 已新增（只加不删历史） |
| HEARTBEAT | 无 2026-10-24 基线 | 已新增小节 + 复检脚本 |

**未改动**：`CHANGELOG.md` 第 2710 / 2993 / 3377 行的「待修复」等表述属**更早版本的历史段落**
（v1.x 时期），按任务要求「只加新段落，不要重写历史段落」保留原样。

---

## 3. 遗留问题

1. **`7zi-frontend/tests/features/collab-client.test.ts` 19 failed / 19 passed + 2 Unhandled Rejection**
   → 归 **T77**。失败栈指向 `CollabClient.send` → `MockWebSocketManager.emit`
   （`src/lib/collab/CollabClient.ts`），疑为 `handleMessage` 读取 `undefined` message 的 `message.type`。
   本任务按约束**未触碰**该路径。
2. **根级 `src/lib/utils/format.ts:47`** 仍有 1 个 `prefer-const` error
   （`let absNum` → `const absNum`）。根级 `npx eslint src` 整体为 1 error / 1630 warnings。
   未派单，建议单独处理。
3. **后端 CI workflow 尚未在真实 GitHub Actions 上跑过首次运行** —— 已在 README 与 HEARTBEAT 中如实标注。
4. **后端覆盖率数字未在本任务复测**（未跑 `--coverage`）—— 沿用 2026-10-23 已有记录，未新增断言。

---

## 4. 建议下一步

- T77 修复 collab-client 后，重跑 HEARTBEAT 里新增的「心跳复检脚本」5 条命令，
  再把三个文档里的 collab-client 遗留项改为已修复。
- 派单清理根级 `src/` 的 1 error + 1630 warnings（与 `7zi-frontend/src` 的门禁口径分离，
  建议先确认根级 `src/` 是否仍在发布路径上，再决定是修还是 ignore）。
