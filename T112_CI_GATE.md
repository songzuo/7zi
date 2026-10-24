# T112 · 后端 CI 盲区补齐报告（决策项 D14）

> 执行者：🛡️ 系统管理员 子代理
> 时间：2026-10-25 00:10 (GMT+8)
> 工作目录：`/root/.openclaw/workspace`
> 硬约束遵守：未 `git add` / `commit` / `push`；未删除或弱化任何现有 CI 步骤；未新增运行时依赖；改动仅限 `.github/workflows/**` 与 `7zi-backend/websocket-service/**`、`7zi-backend/workflow-service/**`；未回显任何真实凭据原文。

---

## 0. 结论速览

**结论：Partial**

| 维度 | 状态 |
| --- | --- |
| websocket-service CI（构建 + lint + test） | ✅ 已落地并本地全绿 |
| workflow-service CI（构建 + lint + test） | ✅ 已落地并本地全绿 |
| 各自目录变更可触发 | ✅ 已显式写入 path filter |
| 两个子服务自身 lint / test 门禁 | ✅ 补齐（D14 的核心诉求） |
| 整个 `Backend CI` workflow 能否绿灯跑完 | ❌ **仍红** —— `7zi-backend` 根目录存在同源 body-parser 漏洞，超出本次授权改动范围（见 §5 遗留问题 L1） |

---

## 1. 审查：`.github/workflows/` 现状

### 1.1 workflow 清单（9 个）

| 文件 | 名称 | 与后端的关系 |
| --- | --- | --- |
| `backend-ci.yml` | Backend CI | ★ 本次目标文件，后端唯一 CI 门禁 |
| `ci.yml` | CI/CD Pipeline | 纯前端（Next.js 7zi-frontend），无任何后端路径 |
| `tests.yml` | Tests | 纯前端单测（shard），无后端路径 |
| `performance-audit.yml` | Performance Audit | 性能审计 |
| `security-scan.yml` | Security Scan | 定时/手动，无 push 触发 |
| `preview.yml` | Preview | 预览环境 |
| `v191-e2e-tests.yml` | v191 E2E | E2E |
| `version-check.yml` | Version Check | 版本检查 |
| `README.md` | — | 文档（非 workflow） |

### 1.2 `backend-ci.yml` 原有 job 与 path filter（HEAD `f1fd650ddf`）

```
on.push / on.pull_request.paths:
  - '7zi-backend/**'                    ← 已覆盖两个子服务
  - 'workflow-engine/backend/**'
  - '.github/workflows/backend-ci.yml'
```

| # | Job ID | 名称 | steps | timeout | needs |
| --- | --- | --- | --- | --- | --- |
| 1 | `setup-7zi-backend` | 安装依赖 (7zi-backend) | 4 | 8m | — |
| 2 | `setup-workflow-engine` | 安装依赖 (workflow-engine) | 4 | 8m | — |
| 3 | `security-audit` | 依赖漏洞审计 | 6 | 8m | — |
| 4 | `test-7zi-backend` | 测试 (7zi-backend) | 7 | 15m | setup-7zi-backend |
| 5 | `test-workflow-engine` | 测试 (workflow-engine) | 7 | 15m | setup-workflow-engine |
| 6 | `test-workflow-service` | 测试 (workflow-service) | 7 | 12m | — |
| 7 | `test-websocket-service` | 测试 (websocket-service) | 7 | 12m | — |

### 1.3 关键发现（D14 原始描述已部分过期）

D14 描述称"CI **不调用**这两个子服务的 lint / test"。实测复核结论：

- ✅ Job 6 / Job 7 **在 HEAD 中已存在**（由 `05e0f30285` "feat(ci): 落地后端 CI 门禁" 于 2026-10-23 引入），已含 ESLint + `npm test`。
- ✅ path filter `'7zi-backend/**'` **本就覆盖** `7zi-backend/websocket-service/**` 与 `7zi-backend/workflow-service/**`（GitHub glob `**` 跨目录层级）。
- ❌ **但两个 job 都缺少"构建"步骤** —— 只有 lint + test，无 build 门禁。
- ❌ path filter 中**没有显式列出**两个子服务目录，触发依赖 `'7zi-backend/**'` 的通配推断，脆弱且不自解释。
- ❌ 更关键：`security-audit` job 对 `workflow-service` 执行 `npm audit --omit=dev --audit-level=moderate`，**本地实测 exit=1**（body-parser 1.20.8 存在 high 级漏洞），即该 workflow 在两个子服务被真正纳入门禁后**根本跑不绿**。

---

## 2. 改动文件列表（带行数）

| 文件 | 状态 | 总行数 | 改动 |
| --- | --- | --- | --- |
| `.github/workflows/backend-ci.yml` | M | 361 → **393** (+32) | path filter 显式化 ×2 处；两个 job 各加 1 个"构建校验"步骤（13 行/处，含注释） |
| `7zi-backend/workflow-service/package.json` | M | 29 | `body-parser`: `^1.20.2` → `^1.20.9`（同 minor 线 patch，修复 GHSA-27r3-jxmh-p828） |
| `7zi-backend/workflow-service/package-lock.json` | M | 1198 | 同步 lockfile：body-parser 1.20.8 → 1.20.9（含 resolved / integrity） |

**未改动**：`7zi-backend/websocket-service/**` 下无任何文件变更 —— 该子服务已具备完整配置（package.json / package-lock.json / eslint.config.js / test/run.js），无需补齐最小配置。

### 2.1 diff 摘要

```diff
 on:
   push:
     branches: [main, develop]
     paths:
       - '7zi-backend/**'
+      # T112: 显式列出两个独立子服务目录，保证其自身变更必定触发对应 job
+      - '7zi-backend/websocket-service/**'
+      - '7zi-backend/workflow-service/**'
       - 'workflow-engine/backend/**'
       - '.github/workflows/backend-ci.yml'
   pull_request:
     branches: [main, develop]
     paths:
       - '7zi-backend/**'
+      # T112: 显式列出两个独立子服务目录，保证其自身变更必定触发对应 job
+      - '7zi-backend/websocket-service/**'
+      - '7zi-backend/workflow-service/**'
       - 'workflow-engine/backend/**'
       - '.github/workflows/backend-ci.yml'

@@ test-workflow-service @@
+      # 构建校验：本服务为 CommonJS 无编译产物，构建阶段校验
+      # ①生产依赖树可完整解析 ②全部源文件语法合法 ③入口文件存在。
+      - name: 构建校验（依赖树 + 语法）
+        run: |
+          set -e
+          echo "--- 生产依赖树解析 ---"
+          npm ls --omit=dev
+          echo "--- 源文件语法检查 ---"
+          find src -name '*.js' -print0 | xargs -0 -n1 node --check
+          echo "--- 入口文件检查 ---"
+          test -f src/index.js
+          echo "✅ 构建校验通过"

@@ test-websocket-service @@
+      （同上，13 行）
```

### 2.2 为什么这样设计"构建"步骤

两个子服务都是**独立 CommonJS Node 服务，无 TypeScript / 无编译产物**（`package.json` 中 `scripts` 只有 `start` / `dev` / `test` / `lint` / `docker:*`，无 `build`）。因此不引入"新范式"（不装 tsc / esbuild / webpack），而是按仓库既有风格把"构建"落成**产物就绪度校验**：

1. `npm ls --omit=dev` —— 生产依赖树必须能完整解析（缺包 / 版本冲突即红），与既有 `security-audit` 的 `--omit=dev` 口径一致；
2. `find src -name '*.js' -print0 | xargs -0 -n1 node --check` —— 全部源文件语法校验（对标 `docker build` 阶段实际会执行的 `node src/index.js` 前置解析）；
3. `test -f src/index.js` —— 入口文件必须存在（对齐两个 Dockerfile 的 `CMD ["node", "src/index.js"]`）。

> 已评估但**未采用**的方案：`npm run docker:build`。理由 —— 镜像构建需拉取 `node:20-alpine` 基础镜像 + 容器内 `npm ci --only=production`，在 CI 中网络/时间成本高（本地实测一次 ~90s+），且与仓库既有的 4/5 号 job（纯 Node 服务，同样无 build 步骤）风格不一致。`docker build` 仍可用 `workflow_dispatch` 手工触发验证（本地已实测 websocket-service 镜像构建成功）。

---

## 3. CI job 覆盖对照表

| 后端单元 | 目录 | 构建 | Lint | Test | 依赖安装 | 漏洞审计 | uuid 版本门禁 | 路径触发 | CI Job |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | --- |
| 7zi-backend（根） | `7zi-backend/` | ❌ 无编译 | ✅ `npm run lint` | ✅ `npx jest --coverage` | ✅ | ⚠️ **红** | ✅ | ✅ | `test-7zi-backend` / `setup-7zi-backend` |
| workflow-engine | `workflow-engine/backend/` | ❌ 无编译 | ✅ `npm run lint` | ✅ `npx jest --coverage` | ✅ | ✅ 0 vuln | ✅ | ✅ | `test-workflow-engine` / `setup-workflow-engine` |
| **websocket-service** | `7zi-backend/websocket-service/` | ✅ **新增** | ✅ `npx eslint src/` | ✅ `npm test`（node --test，14+ 单测/集成全绿） | ✅ | ✅ 0 vuln | ✅ | ✅ **显式** | `test-websocket-service` |
| **workflow-service** | `7zi-backend/workflow-service/` | ✅ **新增** | ✅ `npx eslint src/` | ✅ `npm test`（node --test，41 项全绿） | ✅ | ✅ **已修复** 0 vuln | ✅ | ✅ **显式** | `test-workflow-service` |

### 3.1 步骤级对照（两个子服务 job）

| 步骤 | websocket-service | workflow-service | 备注 |
| --- | :-: | :-: | --- |
| `actions/checkout@v4` | ✅ | ✅ | 未改动 |
| 缓存 `node_modules` + `~/.npm` | ✅ | ✅ | 未改动，key 按各自 lock 文件 hash 隔离 |
| `actions/setup-node@v4` (Node 22) | ✅ | ✅ | 未改动 |
| `npm ci --prefer-offline`（子服务自身） | ✅ | ✅ | 未改动 |
| `npm ci --prefer-offline`（7zi-backend 根，供 ESLint 提升） | ✅ | ✅ | 未改动 |
| **构建校验（依赖树 + 语法 + 入口）** | ✅ **新增** | ✅ **新增** | T112 新增 |
| `npx eslint src/` | ✅ | ✅ | 未改动（弱化 = 零） |
| `npm test`（node --test runner） | ✅ | ✅ | 未改动 |
| `npm audit --omit=dev --audit-level=moderate`（在 `security-audit` job） | ✅ 0 vuln | ✅ **本次修复至 0 vuln** | 修复 body-parser 1.20.8→1.20.9 |

**现有步骤零删除、零弱化** —— 全部为纯增量。

---

## 4. YAML 校验输出摘要

本地无 `act`（`command -v act` → 未安装），且**不安装新工具**（硬约束），故按要求改用逐条 YAML 语法校验。

### 4.1 解析与结构校验

```
$ python3 -c "import yaml; yaml.safe_load(open('.github/workflows/backend-ci.yml'))"
YAML PARSE: OK — .github/workflows/backend-ci.yml
push paths (5):
   - 7zi-backend/**
   - 7zi-backend/websocket-service/**
   - 7zi-backend/workflow-service/**
   - workflow-engine/backend/**
   - .github/workflows/backend-ci.yml
pull_request paths (5):
   - 7zi-backend/**
   - 7zi-backend/websocket-service/**
   - 7zi-backend/workflow-service/**
   - workflow-engine/backend/**
   - .github/workflows/backend-ci.yml
jobs: 7
  setup-7zi-backend: 4 steps, timeout=8m
  setup-workflow-engine: 4 steps, timeout=8m
  security-audit: 6 steps, timeout=8m
  test-7zi-backend: 7 steps, timeout=15m
  test-workflow-engine: 7 steps, timeout=15m
  test-workflow-service: 8 steps, timeout=12m
  test-websocket-service: 8 steps, timeout=12m
```

### 4.2 全 workflow 目录逐条解析

```
OK  .github/workflows/backend-ci.yml
OK  .github/workflows/ci.yml
OK  .github/workflows/performance-audit.yml
OK  .github/workflows/preview.yml
OK  .github/workflows/security-scan.yml
OK  .github/workflows/tests.yml
OK  .github/workflows/v191-e2e-tests.yml
OK  .github/workflows/version-check.yml
```

### 4.3 Job 结构完整性断言

```
所有 job 结构校验通过（runs-on / steps / uses|run 均存在）
job 总数: 7
```

### 4.4 所有 `run` 块的 Bash 语法校验

```
$ python3  # 抽取全部 run 块 → /tmp/runblocks.sh
$ bash -n /tmp/runblocks.sh
✅ BASH SYNTAX OK for all run blocks (86 lines extracted)
```

### 4.5 两个子服务全链路本地实跑（模拟 CI 步骤）

**workflow-service**

```
=== AUDIT ===      found 0 vulnerabilities            AUDIT EXIT=0
=== BUILD ===      ✅ 构建校验通过
=== LINT ===       ✅ LINT PASS
=== TEST ===       Engine unit tests : PASSED
                   HTTP integration  : PASSED
                   ALL TESTS PASSED                   TEST EXIT=0
```

**websocket-service**

```
=== AUDIT ===      found 0 vulnerabilities            AUDIT EXIT=0
=== BUILD ===      ✅ 构建校验通过
=== LINT ===       ✅ LINT PASS
=== TEST ===       Unit tests (RoomManager) : PASSED
                   Unit tests (jwt-secret)  : PASSED
                   Integration tests        : PASSED
                   ✅ All tests passed                   TEST EXIT=0
```

### 4.6 `npm ci` 幂等性复现（CI 真实路径）

```
$ cd 7zi-backend/workflow-service && rm -rf node_modules && npm ci --prefer-offline
added 98 packages in 4s                    CI EXIT=0
installed: 1.20.9
found 0 vulnerabilities                    AUDIT EXIT=0
```

→ lockfile 与实际安装一致，CI 上 `npm ci` 可复现修复后的依赖树。

### 4.7 门禁有效性反向验证（确认能"红"）

```
$ npm audit --omit=dev --audit-level=moderate --prefix 7zi-backend/workflow-service
body-parser  <1.20.9
Severity: high
... GHSA-27r3-jxmh-p828
1 high severity vulnerability               EXIT=1   ← 修复前，门禁确实会红
```

→ 证明 `security-audit` 门禁是真实有效的，不是空跑。

---

## 5. 遗留问题

| # | 级别 | 问题 | 影响 | 建议 |
| --- | --- | --- | --- | --- |
| **L1** | 🔴 高 | `7zi-backend` **根目录** `package.json` 仍声明 `body-parser: ^1.20.2`，lockfile 解析为 1.20.8（GHSA-27r3-jxmh-p828，high / DoS）。`security-audit` job 对 7zi-backend 根执行 `npm audit --omit=dev --audit-level=moderate`，**当前 exit=1**，整个 Backend CI 因此仍会红。 | `Backend CI` workflow 无法整体转绿；本任务两个新 job 的绿灯也会被同 workflow 的失败 job 拖累（GitHub job 独立判定，但 PR 整体 checks 红） | 本次改动范围被限定为 `.github/workflows/**` + 两个子服务目录，**根 `7zi-backend/package.json` 不在授权内，故未改**。建议单独派单：同样做 `^1.20.2 → ^1.20.9` 的 patch bump（改动量与本次 workflow-service 完全一致，已在本报告验证该路径可行且可复现）。 |
| **L2** | 🟡 中 | 两个子服务 job **无覆盖率采集/上传**（其余两个 job 有 `npx jest --coverage` + `upload-artifact`）。子服务用 `node --test`，需 `--experimental-test-coverage` 才能出覆盖率，且 `test/run.js` 是自定义 spawn runner，透传覆盖率需要改 runner 逻辑。 | 无覆盖率门禁，子服务回归率不可见 | 后续可选：为 `test/run.js` 增加 `--experimental-test-coverage` 透传 + `actions/upload-artifact` 上传 `coverage/`。本次**未做**，以免改动自定义 runner 引入新失败面。 |
| **L3** | 🟡 中 | 两个子服务 job **未做 `needs:` 依赖** `setup-*` 类 job（自行 checkout + 装依赖）。这是既有写法，保留未动。 | runner 时间略浪费（重复 checkout/装依赖） | 与既有 4/5 号 job 保持一致即好，暂不优化。 |
| **L4** | 🟢 低 | `7zi-backend/websocket-service/smoke.js`（端到端冒烟脚本，需先起服务）**未被 CI 调用**。 | 冒烟能力无门禁 | 如需，可后续加一个"起服务 → 跑 smoke.js → 收服务"的 job；本次为控制风险未新增。 |
| **L5** | 🟢 低 | 无 `actionlint`（本地未安装，本次不新增工具），故 GitHub Actions **schema 级**校验（表达式上下文合法性、action 输入合法性）未做，只做了 YAML 语法 + 结构断言 + Bash 语法三层校验。 | 理论上仍可能存在 GitHub 侧语义问题 | 建议后续在 CI 加一个 `docker://rhysd/actionlint` 一次性检查步骤（CI 工具类依赖，符合约束）。 |

---

## 6. 结论

**Partial**

- ✅ **D14 核心诉求已满足**：`websocket-service` 与 `workflow-service` 现在各有一个独立的 CI job，完整覆盖 **构建 + lint + test**，且两者目录被**显式写入** push / pull_request 的 path filter，各自变更必定触发对应 job。
- ✅ 两个子服务的配置（package.json / package-lock.json / eslint.config.js / test/run.js）**已齐备且符合仓库既有约定**，未发明新范式、未新增任何运行时依赖。
- ✅ 顺带修复了 `workflow-service` 的 high 级生产依赖漏洞（body-parser 1.20.8 → 1.20.9），使该子服务的 `security-audit` 门禁由红转绿。
- ⚠️ **未达成"整个 Backend CI 绿灯"**：`7zi-backend` 根目录存在同源 body-parser 漏洞，位于本次授权改动范围之外（见 L1），需单独派单处理。

### 决策项对应

| 决策项 | 状态 | 说明 |
| --- | --- | --- |
| **D14** —— 补 backend-ci 的 `websocket-service` / `workflow-service` 两个 job？ | ✅ 已落实（附带修复 L1 同源漏洞的 workflow-service 侧） | 建议主人确认后单独派单处理 L1（`7zi-backend` 根 body-parser patch bump） |

---

**T112_DONE**
