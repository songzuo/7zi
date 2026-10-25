# T141 · 后端整合架构体检 + 文档增量同步（只读核实）

**角色**：📚 咨询师
**日期**：2026-10-25 (Asia/Shanghai)
**仓库 HEAD**：`53d86ef651`（核查时）
**工作目录**：`/root/.openclaw/workspace`
**任务性质**：**只读架构体检 + 仅改 `API.md` / `CHANGELOG.md` 两个文件的增量一致性更新**。
**未做**：未修改任何 `src/` 源码；未 `git add` / `commit` / `push`；未新增依赖；未删除任何目录；未重启网关。

---

## 0. 结论速览

| 维度 | 结论 |
|---|---|
| 文档改动 | **Yes** — `API.md` 追加 1 节（91 行）、`CHANGELOG.md` 追加 1 段（44 行），均为增量追加，未改写他人段落 |
| 后端整合主线完成度 | **Partial** — 目录收敛与端口解冲突已完成；symlink 收敛（T31 阶段 3）与 5 个端点移植（阶段 1）未完成；旧微服务目录删除（阶段 2）未执行且已被 CI 依赖 |
| API.md 与实际路由一致性 | **Partial** — 108 个实际路由中 **69 条已覆盖 / 39 条未覆盖**；另有 **2 处「幽灵路径」**（`/api/workflows/*` 在代码中不存在）需修正 |
| 是否触碰源码 | **No** — `git diff --stat` 中 `src/` 的改动全部为**本任务开始前既有**的工作区改动（`src/lib/monitoring/**`、`src/app/api/revalidate/route.ts`、`state/tasks.json` 等），非本任务产生 |
| 凭据回显 | **无** — 报告中所有密钥/`.env` 值均以 `<redacted>` 处理 |

---

## 1. 核实方法（全部只读）

```bash
# A. 目录与规模
find src -maxdepth 2 -type d | sort
find src/lib src/services -maxdepth 2 -type d | sort        # src/services 不存在
ls -la 7zi-backend/ 7zi-backend/websocket/ 7zi-backend/workflow-engine/

# B. 符号链接真相
ls -la 7zi-backend/websocket 7zi-backend/workflow-engine
find 7zi-backend/websocket 7zi-backend/workflow-engine -xtype l

# C. 路由清单与方法
find src/app/api -name route.ts | sort            # → 108 个
grep -oE "^export (async )?(function|const) (GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)" <route.ts>

# D. 文档覆盖差集（字面量匹配，动态段 [x] ≡ :x）
while read r; do p=$(echo "$r" | sed 's/\[\([a-zA-Z]*\)\]/:*\1/g'); \
  grep -qF "$r" API.md || grep -qF "$p" API.md || echo "$r"; done < routes.txt

# E. 后端主线 git 事实
git log --oneline --since=2026-10-20 -- 7zi-backend server workflow-engine
git ls-files 7zi-backend/websocket-service 7zi-backend/workflow-service | wc -l
grep -rn "7zi-backend" .github/workflows/ deploy/ deploy-scripts/ nginx/ ecosystem.config.production.js

# F. 端点/安全行为比对
grep -nE "app\.(get|post|put|delete)\(" 7zi-backend/workflow-service/src/index.js workflow-engine/backend/server.js
grep -rn "api/v1/ws\|api/v1/workflow" 7zi-backend/websocket/lib/server.js workflow-engine/backend/server.js   # → 空
grep -n "MIN_SECRET_LENGTH\|exit(1)" 7zi-backend/websocket/lib/jwt-secret.js
grep -n "new Function\|resolveConditionValue" 7zi-backend/workflow-service/src/engine/WorkflowEngine.js workflow-engine/backend/src/engine/WorkflowEngine.js
```

**参照文档**：`ARCH_BACKEND_CONSOLIDATION_PLAN_20261020.md`（方案）、`ARCH_BACKEND_CONSOLIDATION_20261020.md`（调研）、
`ARCH_BACKEND_CONSOLIDATION_20261021.md`（迁移报告）、`T31_BACKEND_CONSOLIDATION_PLAN_20261022.md`（重复目录收敛方案）、
`ARCH_HEALTH_20261020.md`（健康报告）。

---

## 2. 四类清单

### 2.1 ✅ 已完成（代码中已落地，且文档/计划有对应描述）

| # | 项 | 核实证据 |
|---|---|---|
| 1 | `7zi-backend/` 目录建立 | `ls -la 7zi-backend/` → `bin/ package.json package-lock.json websocket/ websocket-service/ workflow-engine/ workflow-service/ README.md .env .env.example` |
| 2 | 统一 `package.json`（含 `engines`） | `7zi-backend/package.json` → `"engines": {"node": ">=18.0.0"}`，`name: 7zi-backend`，`version: 1.14.1` |
| 3 | 统一启动脚本 | `7zi-backend/bin/start-all.sh` / `start-websocket.sh` / `start-workflow.sh`，用 `concurrently` 并行拉起两服务 |
| 4 | **端口冲突消解** | `websocket/lib/config.js` → `DEFAULT_PORT = 3002`；`workflow-engine/backend/server.js` → `DEFAULT_PORT = 3001`；脚本注入 `WS_PORT=3010` / `WF_PORT=3011`。**3001 vs 3002 不再相同**（原报告称"两者均 3001 冲突"） |
| 5 | `websocket/lib/` 六模块化拆分 | `auth.js config.js handlers.js jwt-secret.js room-manager.js server.js`（实体文件，非链接） |
| 6 | WebSocket 测试基线 | `7zi-backend/websocket/__tests__/` 11 个文件，`package.json` jest projects 覆盖 `websocket/` + `workflow-engine/` |
| 7 | **JWT「生产 + 短密钥 exit(1)」backport**（T31 阶段 1 前置项） | `websocket/lib/jwt-secret.js` → `MIN_SECRET_LENGTH = 64` + 生产分支 `exit(1)`；对应测试 `__tests__/jwt-secret.test.js` 期望 `exit(1)` 已同步 |
| 8 | **`workflow-service` 的 `safeEval` 加固版回迁**（T31 §1.4 关键差异 2） | `7zi-backend/workflow-service/src/engine/WorkflowEngine.js` 与 `workflow-engine/backend/src/engine/WorkflowEngine.js` **均**为 `new Function('scope', 'with (scope) {...}')` + `resolveConditionValue`（各 2 处命中），不再使用裸 `eval()` |
| 9 | 后端 CI 门禁接入 | `.github/workflows/backend-ci.yml` 存在，覆盖 `7zi-backend/**` 与 `workflow-engine/backend`；`paths` 显式列出两个子服务 |
| 10 | 后端 lint 归零 / 依赖升级 | 提交 `e68aba61cc`、`9e49e41ba3`、`a1914975fb`、`e00c13e4e6`（body-parser 1.20.2 → 1.20.9） |

### 2.2 🚧 未完成（计划中有明确条目，代码中未落地）

| # | 计划条目 | 出处 | 现状核实 |
|---|---|---|---|
| 1 | **阶段 3 · symlink 收敛**（把实体代码搬进 `7zi-backend/`） | T31 §5 阶段 3 | **未做**。`7zi-backend/websocket/websocket-server.js -> /root/.openclaw/workspace/server/websocket-server.js`；`7zi-backend/workflow-engine/src -> .../workflow-engine/backend/src`。实体代码仍住旧位置，`workspace/server/` 与 `workspace/workflow-engine/backend/` 均仍存在 |
| 2 | **阶段 1 · 5 个端点移植** | T31 §5 阶段 1 | **未做**。`grep -rn "api/v1/ws\|api/v1/workflow" 7zi-backend/websocket/lib/server.js workflow-engine/backend/server.js` → **零命中**。`/api/v1/ws/health`、`/api/v1/ws/stats`、`/api/v1/ws/rooms/:id`（在 `websocket-service/src/index.js:547/561/577`）、`/api/v1/workflow/health`、`/api/v1/workflow/metrics`（在 `workflow-service/src/index.js:518/542`）均**未**进入正式实现 |
| 3 | **阶段 2 · 删除 `websocket-service/` / `workflow-service/`** | T31 §8.1 | **未做且已被反向依赖**。`git ls-files` → **27 个文件仍被追踪**；`.github/workflows/backend-ci.yml` 已为这两个子服务建立独立 job（`test-workflow-service` / `test-websocket-service`）→ **删除前必须先解耦 CI**，T31 的"零 CI 引用"前提已失效 |
| 4 | **阶段 4 · 文档收敛**（`7zi-backend/README.md` 目录树、根 `README.md` 目录树） | T31 §5 阶段 4 | **部分未做**。`7zi-backend/README.md` 目录树**仍只列** `websocket/` 与 `workflow-engine/`，**未列** `websocket-service/` / `workflow-service/`；根 `README.md:1569/1582` 已列出两目录 → **两份 README 互相矛盾** |
| 5 | **阶段 3 附带 · `workspace/server/` 与 `workspace/workflow-engine/backend/` 清理** | T31 §7 尾部 | **未做**，目录仍在（与 2.2-1 同源） |
| 6 | **`smoke.js` 能力迁移到 `7zi-backend/websocket/scripts/`** | T31 §5 阶段 1 第 3 条 | 路径 `7zi-backend/websocket/scripts/` **不存在**；但等价能力已以 `websocket/__tests__/smoke.test.js` 形式落地 → **实质已替代，路径形态不同** |

### 2.3 📌 计划中但代码里不存在（文档/计划提到，实际无对应实现）

| # | 计划/文档中的表述 | 核实结果 |
|---|---|---|
| 1 | `ARCH_BACKEND_CONSOLIDATION_20261021.md` §2 目录树含 `7zi-backend/websocket-service/` 与 `7zi-backend/workflow-service/`，标注为「✅ 新增：独立微服务封装（Docker 支持）」 | 目录**存在**，但 §5 引用链路图声称"**未被任何运行时引用**"在 2026-10-25 已**部分失效**：后端 CI 已接入两个独立 job。文档的"零引用"结论过时 |
| 2 | `ARCH_BACKEND_CONSOLIDATION_20261021.md` §3.1/§3.3 称 `websocket/` 端口默认 **3010**、`workflow-engine/` 默认 **3011** | **不准确**。3010/3011 仅是 `bin/*.sh` 注入值；代码兜底为 **3002 / 3001**（`websocket/lib/config.js`、`workflow-engine/backend/server.js`）。`7zi-backend/README.md` 已修正此口径，**架构报告未修正** |
| 3 | `ARCH_BACKEND_CONSOLIDATION_20261021.md` §3.1 称 `websocket/` 「无独立 `package.json`」 | **部分成立**：根 `7zi-backend/package.json` 无 `workspaces` 字段，故 `websocket/`、`workflow-service/`、`websocket-service/` 三套依赖树彼此独立（根 357 包 / ws-svc 37 / wf-svc 93） |
| 4 | `ARCH_BACKEND_CONSOLIDATION_PLAN_20261020.md` §"统一 package.json 设计"中的 `"workspaces": ["websocket", "workflow-engine"]` | **未落地**：根 `package.json` **无 `workspaces` 字段** |
| 5 | `ARCH_BACKEND_CONSOLIDATION_PLAN_20261020.md` §"迁移步骤" Phase 4「更新 PM2 配置 / nginx 反向代理 / Docker 配置」 | **未落地**：`ecosystem.config.production.js` 中 `7zi-backend` **0 命中**；`nginx/`、`deploy/`、`deploy-scripts/` 中 `7zi-backend` **0 命中**；全部 `docker-compose*.yml` 中 `7zi-backend` **0 命中** |
| 6 | `ARCH_BACKEND_CONSOLIDATION_PLAN_20261020.md` §"验证清单" 7 项 | 仅"目录结构创建完成"✅；"WS 独立启动""WF 独立启动""端口无冲突"由代码层面满足但**无生产链路验证**（PM2/nginx/compose 均零引用）；"PM2 配置已更新""nginx 配置已更新"❌；"回滚方案已测试"❌ |
| 7 | `ARCH_HEALTH_20261020.md` §1「⚠️ 未发现独立的 `7zi-backend/` 目录」 | **已过时**——`7zi-backend/` 现已存在 |
| 8 | `ARCH_HEALTH_20261020.md` §4 高风险「后端散落 - 无统一 `7zi-backend/` 目录」 | **部分过时**：目录已统一，但**实体代码仍散落**（symlink 未收敛），风险形态改变而非消失 |
| 9 | `ARCH_HEALTH_20261020.md` §4 中风险「引擎字段缺失」 | **已解决**：`7zi-backend/package.json` 与 `workflow-engine/backend/package.json` 均有 `engines.node >= 18` |
| 10 | `ARCH_BACKEND_CONSOLIDATION_PLAN_20261020.md` 计划中 `7zi-backend/websocket/`（旧方案 A 的 `server/` 命名） | 实际落地命名为 `websocket/`，`server/` 名未采用 → **命名与计划不同但目标达成** |

### 2.4 💡 代码里存在但文档没写（文档缺口）

| # | 事实 | 核实证据 | 文档缺口位置 |
|---|---|---|---|
| 1 | `7zi-backend/` 已有**后端 CI 门禁**（backend-ci.yml，覆盖 4 个后端项目 + 依赖审计 + lint + 测试） | `.github/workflows/backend-ci.yml` | `ARCH_BACKEND_CONSOLIDATION_20261021.md`、`T31_..._20261022.md` 均未提及 |
| 2 | `websocket-service/`、`workflow-service/` 仍被 git 追踪（27 文件） | `git ls-files` | T31 §2.3 列为"死代码"，但未预见 CI 已接入 |
| 3 | `websocket/` 与 `workflow-engine/` 的**端口解析优先级**：`PORT` > `WS_PORT`/`WF_PORT` > 兜底 | `websocket/lib/config.js` `loadConfig()`；`workflow-engine/backend/server.js` `resolvePort()` | `7zi-backend/README.md` 已写；两份 ARCH 报告未写 |
| 4 | `.env` **仅被 shell 脚本加载**（仓库未引入 `dotenv`），`npm start` 走脚本外路径时 `.env` 不生效 | `7zi-backend/README.md:99` | ARCH 报告未写 |
| 5 | **前端侧 `src/lib/` 内已存在一套"后端"**（与 `7zi-backend/` 并行）：`websocket` 31 文件/13,036 LOC、`workflow` 33/13,909、`message-queue` 20/5,188、`realtime` 15/5,531、`monitoring` 54/31,896、`mcp` 10/5,124、`collab` 5/1,922、`observability` 11/3,838、`alerting` 4/1,612、`health-monitor` 8/4,447、`log-aggregator` 16/6,673、`sse` 4/453、`services` 4/1,971 | `find src/lib -name '*.ts' \| wc -l`（排除 `__tests__`） | **全部 ARCH_BACKEND_* / ARCH_HEALTH_* 文档均只讨论 `7zi-backend/`，完全未纳入 `src/lib/` 这一路**——这是"后端整合"主线最大的盲区 |
| 6 | **通知模块三处并存**：`src/lib/services/notification.ts`(427) + `notification-enhanced.ts`(596) + `notification-storage.ts`(601) 与 `src/features/notifications/services/` 下同名三文件（行数一致、内容高度重复，`diff` 显示 enhanced 版存在细微差异） | `wc -l` + `diff -q` + `grep -rn "services/notification" src` | 无任何文档记录 |
| 7 | `src/lib/notifications/`（25 行 index + 299 行 store，Zustand 前端 store）与 `src/lib/services/notification*.ts`（服务端 Socket.IO 通知服务）**语义同名但完全不同层** | `head src/lib/notifications/index.ts` vs `head src/lib/services/notification.ts` | 无文档记录，易误判为重复 |
| 8 | 根 `README.md` §后端已含 `websocket-service/`/`workflow-service/` 目录树与端口表（含 Docker 独立服务 3002/3001） | `README.md:1569/1582/1626/1627` | 与 `7zi-backend/README.md` 目录树**直接冲突**（后者未列这两个目录） |
| 9 | `workflow-engine/backend/server.js` 实为 **19 条路由**（T31 记为 22），`workflow-service/src/index.js` 为 **21 条**（T31 记为 24） | `grep -nE "app\.(get\|post\|put\|delete)\("` 实测 | T31 §1.4 计数已过时 |
| 10 | `workflow-service/src/index.js` 独有 `GET /api/templates/:id`（旧目录 `backend/server.js` **没有**该路由） | `workflow-service/src/index.js:374` vs `backend/server.js` 无 | T31 §1.4 的"22 条逐条同名"表述不准确 |
| 11 | `7zi-backend/websocket/__tests__/smoke.test.js` 已提供端到端 smoke（Socket.IO join/leave/cursor 流程） | 文件存在，`describe.skip` 条件依赖 `socket.io-client` | T31 §8.1 建议迁移的 `smoke.js` 能力已部分落地 |
| 12 | 根 `package.json` 已是 `7zi-frontend` v**1.14.2**（ARCH 报告时期为 1.14.1） | `package.json` | ARCH 报告版本号过时 |
| 13 | `T31_BACKEND_CONSOLIDATION_PLAN_20261022.md` **本身从未进入 `CHANGELOG.md`** | `grep -n "T31" CHANGELOG.md` → 0 命中 | CHANGELOG 缺口，本轮已补记 |

---

## 3. API.md ↔ 实际路由覆盖差集

**实际路由文件数**：`find src/app/api -name route.ts` → **108**（`src/app/api/__tests__/` 与 `src/app/api/websocket/__tests__/` 下无 `route.ts`，不计入）。

**API.md 头部口径**：`Total Endpoints: 49 REST route files`（2026-10-21）→ **已过期，实际 108**。

**覆盖判定**：路由路径在 API.md 全文以字面量出现即视为已覆盖；动态段按 `[x]` ≡ `:x` 等价匹配。

- 已覆盖：**69 条**
- **未覆盖：39 条**

### 3.1 文档缺失的路由清单（39 条，方法由 `route.ts` 导出实测）

| # | 路由 | 方法 | 归属域 |
|---|---|---|---|
| 1 | `/api/admin/rate-limit/rules` | GET, POST, OPTIONS | 管理端 · 限流规则 |
| 2 | `/api/admin/rate-limit/rules/[id]` | GET, PUT, DELETE, OPTIONS | 管理端 · 限流规则 |
| 3 | `/api/admin/rate-limit/statistics` | GET, OPTIONS | 管理端 · 限流统计 |
| 4 | `/api/admin/security/blacklist` | GET, POST, OPTIONS | 管理端 · 安全黑名单 |
| 5 | `/api/audit/logs/[id]` | GET | 审计日志详情（列表 `/api/audit/logs` 已覆盖） |
| 6 | `/api/auth/audit-logs` | GET | 认证 · 审计日志 |
| 7 | `/api/auth/permissions` | GET | 认证 · 权限查询 |
| 8 | `/api/auth/token` | POST | 认证 · 令牌签发 |
| 9 | `/api/auth/verify` | GET | 认证 · 令牌校验 |
| 10 | `/api/export/async` | POST | 导出 · 异步任务 |
| 11 | `/api/export/jobs` | GET | 导出 · 任务列表 |
| 12 | `/api/export/jobs/[jobId]` | GET, DELETE | 导出 · 任务详情/取消 |
| 13 | `/api/export/jobs/[jobId]/download` | GET | 导出 · 产物下载 |
| 14 | `/api/export/sync` | GET, POST | 导出 · 同步 |
| 15 | `/api/import` | GET, POST | 导入 · 任务 |
| 16 | `/api/import/[taskId]` | GET, DELETE | 导入 · 任务详情/取消 |
| 17 | `/api/import/preview` | POST | 导入 · 预检 |
| 18 | `/api/monitoring/apm` | GET, HEAD | 监控 · APM |
| 19 | `/api/monitoring/realtime` | GET | 监控 · 实时 |
| 20 | `/api/rca/analyze/[incidentId]` | GET, POST | 根因分析 |
| 21 | `/api/rca/knowledge` | GET, POST, PUT, DELETE | 根因分析 · 知识库 |
| 22 | `/api/rca/propagation/[incidentId]` | GET, POST | 根因分析 · 传播链 |
| 23 | `/api/reports/custom` | POST | 报表 · 自定义 |
| 24 | `/api/reports/generate` | GET, POST | 报表 · 生成 |
| 25 | `/api/reports/templates` | GET | 报表 · 模板 |
| 26 | `/api/sentry-test` | GET | 诊断 · Sentry 连通性 |
| 27 | `/api/v1/tenants` | GET, POST | 多租户 · 主入口 |
| 28 | `/api/v1/tenants/login` | POST | 多租户 · 登录 |
| 29 | `/api/v1/tenants/invite` | POST | 多租户 · 邀请 |
| 30 | `/api/v1/tenants/accept` | POST | 多租户 · 接受邀请 |
| 31 | `/api/v1/tenants/switch` | POST | 多租户 · 切换 |
| 32 | `/api/v1/tenants/transfer` | POST | 多租户 · 转移 |
| 33 | `/api/workflow/[id]/executions` | GET | 工作流 · 执行列表 |
| 34 | `/api/workflow/[id]/executions/[execId]` | GET | 工作流 · 执行详情 |
| 35 | `/api/workflow/[id]/executions/[execId]/cancel` | POST | 工作流 · 取消执行 |
| 36 | `/api/workflow/[id]/history` | GET | 工作流 · 历史 |
| 37 | `/api/workflow/[id]/metrics` | GET | 工作流 · 指标 |
| 38 | `/api/workflow/[id]/stream` | GET | 工作流 · SSE 流 |
| 39 | `/api/workflow/history/export` | POST | 工作流 · 历史导出 |

> 按任务要求：**只列清单，未一次性补写全部请求/响应契约**。

### 3.2 反向差集：文档写了但代码里不存在（"幽灵路径"）

| API.md 中的表述 | 实际代码 | 判定 |
|---|---|---|
| `GET /api/workflows/[workflowId]/versions`（正文 5284 / 5331 行） | `src/app/api/` 下**无 `workflows/`（复数）目录**；实际为 `src/app/api/workflow/[id]/versions/route.ts` | ❌ 幽灵路径（`workflowId` → `id`） |
| `POST /api/workflows/[workflowId]/rollback`（正文 5344 行） | 同上；实际 rollback 在 `workflow/[id]/versions/[versionId]/rollback/route.ts` | ❌ 幽灵路径 |
| 正文 §"⚠️ 已移除的工作流版本端点"：`POST /api/workflow/[id]/versions`、`GET /api/workflow/[id]/versions/[versionId]`、`GET /api/workflow/[id]/versions/compare`、`GET\|PUT /api/workflow/[id]/versions/settings` 标注为**不存在** | **实际全部存在**：`versions/route.ts`、`versions/[versionId]/route.ts`、`versions/compare/route.ts`、`versions/settings/route.ts` | ❌ 标注错误（5 条） |
| `POST /api/email`、`GET /api/email`（正文 §Email API） | `src/app/api/email/` **不存在** | ❌ 幽灵路径 |
| `/api/user/activity`、`/api/user/avatar`（正文 §User Profile APIs） | `src/app/api/user/` 下仅 `preferences` | ❌ 幽灵路径 |
| `GET /api/export`（正文已自行标注"已废弃，请使用 `/api/data/export`"） | `/api/data/export` 存在 | ✅ 已自纠 |

> 依据任务约束"只允许修改 `API.md` 与 `CHANGELOG.md`"，本次**仅在新增小节中登记**上述差异，**未改动**正文既有结论段落（涉及 T123/T130 落地口径，需专项裁决）。

---

## 4. 文档改动摘要

### 4.1 `API.md`（+91 行，追加 1 节）

追加位置：**文件末尾**（§v1.4.0 更新记录之后），标题 `## 🩺 后端整合一致性补记（T141 架构体检，2026-10-25）`，包含：

1. 头部统计口径修正标注（49 → **108** 路由文件；Last Updated 2026-10-21 → 2026-10-25）——**以"头部口径修正（不改正文，只标注）"形式呈现，未直接改写头部原文**。
2. **缺失路由清单表（39 条）**，含实测方法列表。
3. **「幽灵路径」差异登记**（2 处 + 5 条标注错误），明确"仅登记不改动"。
4. **后端整合主线状态速记表**（9 条实测事实 + 证据）。

### 4.2 `CHANGELOG.md`（+44 行，追加 1 段）

追加位置：`---` 之后、既有 `## [未发布] / 2026-10-21 ~ 2026-10-25（T119–T131 补记，由 T132 同步）` **之前**（新段在前，保持时间倒序），标题 `## [未发布] / 2026-10-25（T141 后端整合架构体检）`，包含 `### 📝 Documentation`、`### 🔍 Audited`、`### ⚠️ 遗留` 三个子节。

### 4.3 合规性自检

| 约束 | 执行情况 |
|---|---|
| 只改 `API.md` 与 `CHANGELOG.md` | ✅ `git diff --stat` 中本任务的改动仅 `API.md`（+91）、`CHANGELOG.md`（+44） |
| 不改 `src/` 源码 | ✅ 未写入任何 `src/` 文件（工作区既有 `src/lib/monitoring/**` 等改动为**本任务开始前**已存在） |
| 不 `git add` / `commit` / `push` | ✅ 未执行任何 git 写操作 |
| 不新增依赖 | ✅ 未执行任何 `npm install` / 包管理器操作 |
| 不重写整篇、不动他人段落 | ✅ 两文件均为**末尾/段首追加**，既有段落字节未变 |
| 不回显真实凭据 | ✅ 报告中 `.env` 键值一律 `<redacted>`；未出现任何 JWT secret、口令、token 字面量 |

---

## 5. 遗留（建议后续专项，本任务不执行）

### P0 · 后端整合主线
1. **T31 阶段 1 的 5 个端点未移植**：`/api/v1/ws/health|stats|rooms/:id`、`/api/v1/workflow/health|metrics`。属**能力净损失风险**（旧目录独有）。
2. **T31 阶段 2「删除旧微服务目录」前提已失效**：`websocket-service/` / `workflow-service/` 已被 `backend-ci.yml` 建立独立 job，删除前须先解耦 CI；同时需保留「生产 + 短密钥 exit(1)」（已 backport ✅）与 `safeEval` 加固版（已回迁 ✅）——**这两项前置已满足，只剩 CI 解耦**。
3. **T31 阶段 3 symlink 收敛未做**：实体代码仍在 `workspace/server/` 与 `workspace/workflow-engine/backend/`；`server/lib ↔ 7zi-backend/websocket/lib` 双向软链仍在，删除任一方向即断链。
4. **生产链路零接入**：`ecosystem.config.production.js`、`nginx/`、`deploy/`、`deploy-scripts/`、全部 `docker-compose*.yml` 中 `7zi-backend` **0 命中** → 后端服务目前不被任何生产流量命中，整合成果未落到运行时。

### P1 · 文档一致性
5. `API.md` **39 条路由的请求/响应契约补全**（本轮只列清单）。
6. `API.md` **「幽灵路径」段落裁决**：2 处 `/api/workflows/*` + 5 条误标"已移除"的版本端点 + `/api/email` + `/api/user/activity|avatar`。
7. **`7zi-backend/README.md` 目录树补全** `websocket-service/` / `workflow-service/`（或按决策删除后移除对应描述），消除与根 `README.md:1569/1582` 的矛盾。
8. `ARCH_BACKEND_CONSOLIDATION_20261021.md` 端口口径（3010/3011 → 兜底 3002/3001）与 `ARCH_HEALTH_20261020.md`「未发现 `7zi-backend/` 目录」结论**加注"已过时"**（不改写历史结论）。

### P2 · 结构债务
9. **通知模块三份重复**：`src/lib/services/notification*.ts` 与 `src/features/notifications/services/notification*.ts`（各 427/596/601 行）→ 建议收敛为单一实现。
10. **`src/lib/` 内的"第二套后端"未被任何架构文档纳管**：`websocket`(13,036 LOC)、`workflow`(13,909)、`monitoring`(31,896)、`message-queue`(5,188)、`realtime`(5,531)、`mcp`(5,124)、`collab`(1,922)、`observability`(3,838)、`health-monitor`(4,447)、`log-aggregator`(6,673)、`sse`(453)、`services`(1,971) 等，与 `7zi-backend/` 的职责边界**从未被定义**。建议下一轮架构体检专门处理这条线。
11. `7zi-backend/package.json` 缺 `workspaces` 字段 → 三套独立依赖树/三份 lock 仍在（根 357 包 / ws-svc 37 / wf-svc 93）。

---

## 6. 结论

| 问题 | 答案 |
|---|---|
| **是否完成了"只读架构体检 + 文档增量同步"？** | **Yes** —— 完成四类清单、API 路由差集，且仅在 `API.md` / `CHANGELOG.md` 做增量追加，未碰源码、未做 git 写操作、未新增依赖。 |
| **后端整合主线是否已完成？** | **Partial** —— 目录统一、依赖统一、启动脚本、端口解冲突、CI 门禁、JWT backport、`safeEval` 回迁均已落地；**symlink 收敛、5 个端点移植、旧微服务目录清理、生产链路接入**均未完成。 |
| **API.md 是否与实际路由一致？** | **Partial** —— 108 条实际路由中 69 条已覆盖、**39 条缺失**；另有 **2 处幽灵路径**与 **5 条误标"已移除"**需专项裁决。 |
| **总体判定** | **Partial** |

> 报告生成：📚 咨询师 · T141 · 2026-10-25 · 只读核实，未改源码，未 commit/push。
