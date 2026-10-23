# T73 文档同步报告

**执行日期**: 2026-10-23
**角色**: 📚 咨询师
**范围**: 把已落地事实同步到 4 个 `.md` 文档（**只改 .md，未改任何代码/配置，未执行 git add / commit**）

---

## 0. 事实核对（全部先验证再落笔）

| 待写事实 | 核对方式 | 结果 |
|---------|---------|------|
| 后端 CI 门禁落地 | 读 `.github/workflows/backend-ci.yml` | ✅ 5 个 job：`setup-7zi-backend` / `setup-workflow-engine` / `security-audit` / `test-7zi-backend` / `test-workflow-engine` |
| workflow-engine 覆盖率 0% → 93.46% | `npx jest --selectProjects workflow-engine --coverage` | ✅ 6 suites / 214 tests 全绿，All files **93.46%** |
| 全量后端测试 | `npx jest --coverage` | ✅ 16 suites / 342 tests 全绿，All files **94.74%** |
| websocket 覆盖率 | `npx jest --selectProjects websocket --coverage` | ✅ 10 suites / 128 tests，**96.95%** |
| 多 project 覆盖率冲突已修 | 读 `7zi-backend/package.json` 的 `jest.projects` | ✅ 两个 project 各自 `rootDir` / `collectCoverageFrom` / `coverageDirectory`，`coverageProvider: "v8"` |
| uuid 全部升级 `^11.1.1` | 检查 4 个子目录 `package.json` | ✅ `7zi-backend` / `workflow-service` / `websocket-service` / `workflow-engine/backend` 均为 `^11.1.1` |
| npm audit 干净 | `npm audit --omit=dev --audit-level=moderate`（`7zi-backend` + `workflow-engine/backend`） | ✅ 均 `found 0 vulnerabilities` |
| 前端 lint 312 → 24 | `cd 7zi-frontend && npx eslint src` | ✅ **0 errors / 24 warnings**（原文档写 25，**已修正为 24**） |
| 根级 `src/` 36 个 TS 错误已修 | `npx tsc --noEmit` | ✅ **0 errors** |
| 后端 ESLint 归零 | `cd 7zi-backend && npx eslint .` | ✅ **0 errors / 11 warnings**（warnings 全在 `workflow-service/test/`、`websocket-service/`） |
| 2 个 no-dupe-keys 真 Bug | `git show 288c81561a`（`websocket/lib/server.js`）+ `git show e68aba61cc`（`websocket-service/src/index.js`） | ✅ 确认：均把「房间数量」与「房间数组」写在同一 `rooms` 键上，后者覆盖前者；已改为 `roomCount` + `rooms` |
| 前端已迁移 vitest | 检查根级与 `7zi-frontend` 的 `package.json` | ✅ 两处 `jest` 依赖均已移除（根级 vitest `^4.1.12`，`7zi-frontend` vitest `^5.0.5`） |
| `error-reporting/retry.test.ts` 已迁 vitest 原生 API | 读 `7zi-frontend/src/lib/error-reporting/__tests__/retry.test.ts` | ✅ `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'`，文件内无任何 `jest.*` 调用 |

---

## 1. 改动的文件

### 1.1 `CHANGELOG.md`（+26 / -8 行）

改的是 `## [未发布] / 2026-10-23` 段落：

| 改动 | 内容 |
|------|------|
| **新增小节** `### 🐛 真 Bug 修复（no-dupe-keys）` | 记录 2 处 no-dupe-keys 缺陷：`websocket/lib/server.js` `getStats()`（提交 `288c81561a`）与 `websocket-service/src/index.js` `/stats`（提交 `e68aba61cc`），说明「数量 vs 数组」被静默覆盖的根因与 `roomCount` 修复方案；补上后端 ESLint 现状（0 errors / 11 warnings） |
| **修正** 前端 lint 数字 | 原写「312 → 37 → **25**」，实测为 **24**，改为「312 → 37 → 25 → **24**」并写明构成：23 条 `react-hooks/exhaustive-deps` + 1 条 `@typescript-eslint/no-unused-vars`（`retry.ts:11` 未使用泛型 `T`）。原「当前 25」那行是错的，已删 |
| **补充** 根级 TS 复测 | 增加 `npx tsc --noEmit` → **0 errors** 的复测结论 |
| **补充** 后端 ESLint 现状 | `cd 7zi-backend && npx eslint .` → 0 errors / 11 warnings |
| **补充** 测试实测数字 | 补 workflow-engine project「6 套件 / 214 用例 / 93.46%」；全量补「All files 94.74%」 |
| **改写** 前端测试小节 | 原「⚠️ vitest 仍存在问题（300s 超时）」→ 改为：迁移已完成（3 个测试文件全部 vitest 原生 import，`7zi-frontend/package.json` 无 `jest` 依赖）+ **但仍不全绿**，给出实测数字 34 passed / 11 failed / 245.04s 与失败根因（fake timers 不推进真实 `setTimeout`）。**没有把未完成的语义修复写成已完成** |

### 1.2 `README.md`（+29 / -3 行）

| 改动 | 内容 |
|------|------|
| **版本历史表** | 「未发布 2026-10-23」行补上 `🐛 修复 2 处 no-dupe-keys 真 Bug`、`后端 ESLint 0 errors`，lint 数字 25 → **24** |
| **新增小节** `### 代码质量现状（2026-10-23 实测）` | 一张 5 行表：后端 eslint 0 errors/11 warnings、前端 eslint 0 errors/**24 warnings**、根级 `tsc --noEmit` 0 errors、4 个子目录 `npm audit` 0 vulnerabilities、uuid 统一 `^11.1.1`；并附 no-dupe-keys 修复说明 |
| **改写** `### 运行测试（前端 / Vitest）` | 明确前端测试框架已统一为 Vitest（根级 `^4.1.12`、`7zi-frontend` `^5.0.5`，两处均无 `jest` 依赖，`@testing-library/jest-dom` 仅作 matcher 库）；给出 `retry.test.ts` 的 vitest 原生 import 范例；**保留并具体化已知问题**（45 用例 34 passed / 11 failed，245s） |
| **修正** 目录树注释 | `websocket/__tests__/` 由「10 个文件 / 111 用例」改为实测「**10 套件 / 128 用例**」 |
| **修正** 测试统计表 | 删除重复的「测试通过率」行 |

### 1.3 `docs/BACKEND_TESTING_GUIDE.md`（+56 / -9 行）

| 改动 | 内容 |
|------|------|
| **页头** | 增加「最后更新: 2026-10-23」 |
| **§2 快速开始表** | `npm run lint` 行补全量 lint 实测（0 errors）；表下补一句「上述数字均为 2026-10-23 实测值」并列出 3 条 jest 实测输出 |
| **§4.2 后端 CI 门禁** | 由 3 行散文扩写为 **5 个 job 的完整表格** + 触发条件 / Node 版本 / 最小权限 / concurrency / 本地等价验证 / 「尚未在真实 Actions 上跑过首次运行」的诚实提示 |
| **新增 §4.3 依赖安全状态** | uuid `^11.1.1` × 4 处、`npm audit` 0 vulnerabilities、`workflow-engine/backend` 的 `express ^4.22.3` + `overrides.qs ^6.16.1` |
| **新增 §4.4 后端 ESLint 现状** | 0 errors / 11 warnings 的构成；2 处 no-dupe-keys 的「原状 / 修复后」对照表；提醒改统计接口时同步更新 `server-lib.test.js` 与 `websocket-service/test/integration.test.js` 断言 |
| **§6 已知问题表** | 新增一行：`workflow-service` / `websocket-service` 子服务 `npm test` 报 `EADDRINUSE`（实跑验证：端口 3001 被占用 → `X Engine unit tests failed`），标注为 T70 修复范围、**当前仍未修复** |
| **§7 自检清单** | 新增 `npx eslint .` 无 error、`npm audit --omit=dev --audit-level=moderate` 无漏洞 两项 |
| **§8 相关文档** | 增加 T47 / T68 两份报告的链接；页脚日期 2026-10-21 → 2026-10-23 |

### 1.4 `DEPLOYMENT.md`（+约 100 / -30 行）

该文档与现状**偏离较大**，本轮做了较实质的纠正：

| 改动 | 内容 |
|------|------|
| **页头版本** | 「当前版本 v1.14.1（2026-04-17）」→ 改为「根级 v1.14.2 / `7zi-frontend` v1.14.1（Next.js 16.4.2）」，日期更新为 2026-10-23 |
| **新增** `### 后端 CI 门禁 (backend-ci.yml)` | 新增独立小节，说明前端 `ci.yml` 不覆盖后端，`backend-ci.yml` 才是后端硬门禁（lint + jest 覆盖率阈值 + npm audit + uuid 版本断言），含 job 表、触发条件、最小权限、本地等价验证、首次运行待观察提示 |
| **修正** CI 步骤表 | 「Security Scan: npm audit + **Snyk**」→ 去掉 Snyk（仓库无 Snyk）；补实际 job 名清单；**明确指出 `ci.yml` 的 `security` job 用 `|| true`，不阻断构建**，真正的硬门禁在 `backend-ci.yml` |
| **修正** CD 流程 | 原描述独立 workflow `cd-blue-green.yml` → **该文件不存在**，改为说明部署已内嵌在 `ci.yml` 的 `deploy-staging` / `deploy-production` 两个 job，给出各自触发条件，并注明使用 SSH 密钥认证 |
| **修正** 手动部署 | 「选择 "CD (Blue-Green)" workflow」→ 改为实际的 "CI/CD Pipeline" workflow；`cd /root/7zi-frontend` + `./scripts/deploy/blue-green-deploy.sh` → 改为 `cd /opt/7zi-frontend` + `./deploy.sh deploy`（并附 `deploy.sh` 的子命令清单） |
| **重写** 部署脚本列表 | 删除 4 个**不存在**的脚本（`scripts/deploy/blue-green-deploy.sh`、`verify-deploy.sh`、`rollback.sh`、`quick-deploy.sh`），换成实际存在的 `deploy.sh` / `docker-deploy.sh` / `deploy-scripts/*`，并显式标注旧脚本已不存在 |
| **修正** 回滚章节 | `./scripts/deploy/rollback.sh` / `--force` → 改为 `./deploy.sh rollback-quick` / `./deploy.sh rollback <version>`（与 `deploy.sh` 的 `help()` 实际用法一致） |
| **修正** 健康检查响应示例 | 原示例 `"status": "ok", "version": "1.3.0"` → 按 `src/app/api/health/route.ts` 实际结构改为 `status: "healthy" \| "unhealthy"` + `checks.memory` / `checks.node`，并补 `/api/health/ready|live|detailed` 子端点 |
| **修正** Turbopack 构建示例 | 原 `build: next build --turbo` → 实际是 `build: next build` + `build:turbo: TURBOPACK=1 next build --turbopack`，并注明 CI 用的是 `npm run build` |

---

## 2. 明确**没有**写入的内容（避免编造）

- ❌ 没有写「workflow-service / websocket-service 的测试已修复」—— 实测 `npm test` 仍因 `EADDRINUSE` 失败
- ❌ 没有写「前端 vitest 全部通过」—— 实测 11 个用例仍失败，只写明「迁移已完成、语义修复未完成」
- ❌ 没有写「backend-ci.yml 已在 GitHub Actions 上跑过」—— 仓库内无运行记录，只写「尚未跑过首次运行」
- ❌ 没有给 `T70`/`T71`/`T72` 编造结论（这些任务在本仓库无对应报告文件）
- ❌ 没有改动任何 `.ts` / `.tsx` / `.js` / `.json` / `.yml` 文件
- ❌ 没有 `git add` / `git commit`

---

## 3. 遗留问题

### 3.1 代码层面（不在本任务范围，需后续 Executor / 测试员处理）

| # | 问题 | 证据 |
|---|------|------|
| 1 | **`retry.test.ts` 11 个用例失败**：`vi.useFakeTimers()` 与 `retry.ts` 的真实 `setTimeout` 睡眠不兼容，假时钟不推进 → 挂到 24s 超时；另有 `withRetrySync` 对不可重试错误的返回值断言失败（`expected true to be false`） | `npx vitest run src/lib/error-reporting` → 3 files / 45 tests，34 passed / **11 failed**，Duration 245.04s |
| 2 | **`workflow-service` / `websocket-service` 子服务测试不可用**：`npm test` 时子进程真实 listen 3001/3002，`EADDRINUSE`；runner 未正确收敛子进程退出码 | 实跑 `cd 7zi-backend/workflow-service && npm test` → `X Engine unit tests failed (exit 1)` |
| 3 | **后端残余 11 条 lint warning**（`no-unused-vars`，在 `workflow-service/test/engine.test.js`、`websocket-service/**`） | `npx eslint .` → 11 warnings |
| 4 | **前端残余 24 条 lint warning**（23 条 `react-hooks/exhaustive-deps` + 1 条未使用泛型） | `npx eslint src` → 24 warnings |
| 5 | **根级 `eslint.config.mjs` 在 HEAD 上是空文件（0 字节）**：提交 `7671e8544a` 声称「恢复配置」，但该提交本身就是把 124 行配置**删除**成空文件。实测 `npx eslint src` 因此只剩 1 个 error（`src/components/ui/__tests__/verify-components.js`，已跟踪文件），当前根级 lint 实际处于**失效**状态 | `git show 7671e8544a:eslint.config.mjs` → 0 字节；`git show 7671e8544a^:eslint.config.mjs` → 4415 字节 |
| 6 | 根级 `src/lib/workflow/__tests__/dsl.test.ts` 仍 `import { describe, it, expect, beforeEach } from '@jest/globals'`，是**最后残留的 Jest 引用**（根级已无 `jest` 依赖，该文件目前跑不起来） | `grep -rln "@jest/globals" src` → 1 个文件 |

### 3.2 文档层面（未改动的相关文档）

- `docs/CI-CD-SETUP.md` / `docs/CICD-*.md` / `docs/CI_CD_*.md`（5+ 份）同样描述了旧的 `cd-blue-green.yml` 与旧脚本路径，**本轮未在任务范围内**，建议下一轮统一订正
- `docs/TEST_STRATEGY.md` 未提及后端 Jest 门禁与 vitest 迁移状态
- `README.md` 中仍有若干历史性能数字（如「测试覆盖率 94.2%」「测试通过率 94.2%」）来自 v1.x 旧数据，未在本轮改动
- `DEPLOYMENT.md` 的「性能基准」表（CI 总时间 8-12 分钟等）为**目标值**，无实测数据支撑，本轮保留原样未加标注

---

## 4. 变更文件清单

```
CHANGELOG.md                  | 26 ++++++--
DEPLOYMENT.md                 | 130 ++++++++++++++++++--------------
README.md                     | 29 ++++++-
docs/BACKEND_TESTING_GUIDE.md | 56 +++++++++--
T73_DOCS_SYNC.md              | 新建（本报告）
```

> 注：`memory/2026-10-23.md` 亦在 `git diff` 中出现，但那是 T70 子代理的并发写入，**非本任务改动**。

---

*报告完毕。全程只读代码/配置 + 只写 `.md`，未执行 git add / git commit。*
