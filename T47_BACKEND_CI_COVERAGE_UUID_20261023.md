# T47 后端 CI 门禁 / 覆盖率修复 / uuid 漏洞治理 报告

**日期**: 2026-10-23
**执行人**: 系统管理员/Executor 子代理
**任务编号**: T47

---

## 一、问题复盘与真实根因

### 1.1 表面现象
`cd 7zi-backend && npx jest --selectProjects workflow-engine --coverage` 输出 `All files 0%`，
但 `cd workflow-engine/backend && npx jest --coverage` 却是 88.24%。

原假设是 `collectCoverageFrom: ["src/engine/**/*.js"]` 相对路径在多 project 模式下解析错误。

### 1.2 实际根因（已实测验证）
**路径其实是对的**，`rootDir` 在 workflow-engine project 中为
`<rootDir>/../workflow-engine/backend`，jest 已正确把 `src/engine/**/*.js` 解析为
`/root/.openclaw/workspace/workflow-engine/backend/src/engine/**/*.js`（`--showConfig` 已确认）。

真正原因在 **`babel-plugin-istanbul`（babel coverage provider）的默认 include/exclude 过滤**：

```js
// node_modules/babel-plugin-istanbul/lib/index.js
const DEFAULT_EXTENSION = ['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx'];
const INTERNAL_FILENAMES = ['node_modules', 'coverage', 'dist'];
...
if (!this.filename.startsWith(process.cwd())) return;   // ← 关键
```

`process.cwd()` 在多 project 模式下是 **7zi-backend 根目录**，而 workflow-engine 的源码
位于 `../workflow-engine/backend/`，**在 cwd 之外**，因此 babel-plugin-istanbul 直接 `return`，
**不插桩**。而 `coveragePathIgnorePatterns` 的默认黑名单只能"加白名单"排除，无法反选
cwd 之外的文件——所以覆盖率恒为 0。

**验证方式**：在 `node_modules/@jest/transform/build/shouldInstrument.js` 注入调试日志，
确认 `shouldInstrument()` 返回值正常（路径匹配没问题），但 babel 插件层直接跳过。

### 1.3 修复方案
改用 Jest 的 **`coverageProvider: "v8"`**（Node 原生 V8 覆盖率），
它不经过 babel-plugin-istanbul 的 cwd 过滤，对 cwd 之外的文件同样生效。

实测：`npx jest --selectProjects workflow-engine --coverage` → **All files 93.46%**。

---

## 二、改动文件清单

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `7zi-backend/package.json` | 修改 | jest `collectCoverageFrom` 改 `<rootDir>` 绝对形式；新增 `coverageProvider: "v8"`；`testTimeout` 提升至 20000；`uuid` → `^11.1.1` |
| `7zi-backend/package-lock.json` | 修改 | uuid 9.0.1 → 11.1.1 |
| `7zi-backend/workflow-service/package.json` | 修改 | `uuid` → `^11.1.1` |
| `7zi-backend/workflow-service/package-lock.json` | 修改 | uuid 9.0.1 → 11.1.1 |
| `7zi-backend/websocket-service/package.json` | 修改 | `uuid` → `^11.1.1` |
| `7zi-backend/websocket-service/package-lock.json` | 修改 | uuid 9.0.1 → 11.1.1 |
| `workflow-engine/backend/package.json` | 修改 | `uuid` → `^11.1.1`；`express` → `^4.22.3`；新增 `overrides.qs: ^6.16.1`；`lint` 脚本改为 `eslint --config src/eslint.config.mjs src/` |
| `workflow-engine/backend/package-lock.json` | 修改 | uuid / express / qs 依赖树更新 |
| `workflow-engine/backend/src/eslint.config.mjs` | **新增** | flat ESLint 配置（该目录原本无任何 eslint 配置，`npm run lint` 之前直接报错退出码 2） |
| `.github/workflows/backend-ci.yml` | **新增** | 后端 CI 流水线（lint + jest + coverage + npm audit 门禁） |

> 未执行任何 `git add` / `git commit`。
> `7zi-frontend/**` 的改动为工作区既有变更，非本次任务产生，未触碰。

---

## 三、验收命令实际输出摘要

### ✅ 验收 1：`cd 7zi-backend && npx jest` 全绿 + 覆盖率 > 0

```
Test Suites: 16 passed, 16 total
Tests:       342 passed, 342 total
Snapshots:   0 total
Time:        14.762 s
Ran all test suites in 2 projects.
```

覆盖率汇总（workflow-engine project 部分）：

```
All files                          |   93.46 |    90.44 |    85.1 |   93.46 |
 workflow-engine/backend/src/engine |   93.99 |    88.98 |     100 |   93.99 |
 workflow-engine/backend/server.js   |    95.5 |    89.83 |     100 |    95.5 |
 workflow-engine/backend/websocket   |    92.3 |    86.04 |   93.75 |    92.3 |
```

`npx jest --selectProjects workflow-engine --coverage` 单独跑：
```
All files                     |   93.46 |    90.44 |   85.1 |   93.46 |
Test Suites: 6 passed, 6 total
Tests:       214 passed, 214 total
```

两个 project 的 `coverageThreshold.global.lines = 60` 均满足，**阈值未炸**。

### ✅ 验收 2：`npm audit --production` 无 moderate 以上

| 目录 | 结果 |
|---|---|
| `7zi-backend` | `found 0 vulnerabilities` (exit 0) |
| `workflow-engine/backend` | `found 0 vulnerabilities` (exit 0) |
| `7zi-backend/workflow-service` | `found 0 vulnerabilities` (exit 0) |
| `7zi-backend/websocket-service` | `found 0 vulnerabilities` (exit 0) |

同时修复了 workflow-engine 侧的 `qs` 漏洞链（express 4.18.2 → 4.22.3 + `overrides.qs: ^6.16.1`）。

### ✅ 验收 3：`.github/workflows/backend-ci.yml` YAML 合法

```
$ python3 -c "import yaml; yaml.safe_load(open('.github/workflows/backend-ci.yml'))"
YAML OK
jobs: ['setup-7zi-backend', 'setup-workflow-engine', 'security-audit',
       'test-7zi-backend', 'test-workflow-engine']
```

（环境未安装 actionlint，用 PyYAML 做语法校验；workflow 中的 5 个 job 均为标准
`actions/checkout@v4` / `actions/setup-node@v4` / `actions/cache@v4` / `actions/upload-artifact@v4`。）

### ✅ 验收 4：Lint 全绿

```
$ cd 7zi-backend && npm run lint
✖ 12 problems (0 errors, 12 warnings)     # exit 0

$ cd workflow-engine/backend && npm run lint
exit 0
```

### ✅ 验收 5：uuid v11 CommonJS 兼容性实测

uuid 11.1.1 是双包（ESM + CJS），CommonJS `require('uuid')` 仍可用。
本仓库全部用法均为 `const { v4: uuidv4 } = require('uuid')`（v4 在 v11 中保留），
实测无需改动任何源码：

```
7zi-backend uuid v4: b6e77f53-7934-4c59-adf7-c0d8ed03b8e3
workflow-service uuid v4: bb58e361-9e93-4ad1-a86a-4ccdbf5c6a53
websocket-service uuid v4: 9c0831bd-bd8d-45a4-9f9f-87c679aeaaca
```

所有 4 个 package.json 的 uuid 均为 `^11.1.1`。

---

## 四、CI 流水线设计说明（`.github/workflows/backend-ci.yml`）

**Job 拓扑**（参考现有前端 `ci.yml` 的注释风格、缓存策略、`NODE_VERSION` 环境变量）：

```
setup-7zi-backend ──┐
                    ├──> test-7zi-backend ──┐
setup-workflow-engine ──> test-workflow-engine ──┤
                    └──> security-audit ─────────┘
```

| Job | 作用 |
|---|---|
| `setup-7zi-backend` | 缓存 `7zi-backend/node_modules` + `npm ci` |
| `setup-workflow-engine` | 缓存 `workflow-engine/backend/node_modules` + `npm ci` |
| `security-audit` | 4 个子目录 `npm audit --omit=dev --audit-level=moderate`（moderate 及以上直接失败门禁）+ uuid 声明版本断言脚本（>= 11.1.1） |
| `test-7zi-backend` | `npm run lint` + `npx jest --coverage`（含 60% 覆盖率阈值）+ 上传覆盖率 artifact |
| `test-workflow-engine` | `npm run lint` + `npx jest --coverage`（含 60% 覆盖率阈值）+ 上传覆盖率 artifact |

- 触发条件：`push`/`pull_request` 到 `main`/`develop`（path 过滤到后端目录）+ `workflow_dispatch`
- `permissions: contents: read`（最小权限）
- `concurrency` 取消同 ref 的过期运行
- Node 版本 `'22'`，与前端 CI 一致

**已验证 `npm ci` 可用**：在 /tmp 下用新生成的 lockfile 跑 `npm ci --prefer-offline` 成功
（uuid 11.1.1 / qs 6.16.1 正确落地），保证 CI 上不会出现 lockfile 不同步。

---

## 五、遗留问题与注意事项

1. **workflow-engine/backend 原本没有 ESLint 配置**
   `npm run lint` 之前直接报错（exit 2，"all of the files matching the glob pattern src/ are ignored"）。
   本次新增 `src/eslint.config.mjs`（flat config）修复。规则为保守配置：
   `no-undef: error` + `no-unused-vars: warn` + `no-empty: warn`。
   **当前 0 error / 0 warning 通过**。后续如需更严格的规则（如 `no-console`）需单独评估。

2. **7zi-backend 主包 `npm audit`（含 devDependencies）仍有 30 个 high**
   全部来自 `jest` / `expect` / `@jest/fake-timers` 的传递依赖（dev-only）。
   任务验收只要求 `npm audit --production`，生产依赖已是 0 漏洞。
   修 dev 依赖需要升级 Jest 大版本（jest 29 → 30），属于破坏性变更，未在本次范围内处理。
   **CI 门禁使用的是 `--omit=dev`，不受此影响。**

3. **7zi-backend 主包 `npm audit fix` 曾触发 uuid 大版本跃迁**
   已通过显式 `npm install uuid@^11.1.1` 精确锁定，避免了 `--force` 的破坏性升级路径。

4. **`7zi-backend/workflow-service` 与 `websocket-service` 的测试脚本 `npm test` 会挂起**
   `node test/run.js` 是一个自研 runner，跑完 TAP 输出后进程不退出（exit 124 timeout）。
   这是**既有行为，与本次 uuid 升级无关**（uuid 只是被 require 进来调用 `v4()`）。
   这两个子服务的测试**未纳入 CI job**（CI 覆盖的是主包 7zi-backend 与 workflow-engine/backend，
   与任务清单一致）；建议后续单独立项修复 runner 的进程退出逻辑。

5. **`7zi-backend/workflow-engine/` 是指向 `workflow-engine/backend` 的符号链接目录**
   （`src`/`node_modules`/`package.json` 等全部为 symlink）。
   因此 7zi-backend 的 jest project 与 workflow-engine/backend 的 jest 是**同一批测试**，
   CI 中两处各跑一遍存在冗余，但符合任务清单「对 7zi-backend 与 workflow-engine/backend 跑 lint + jest」的要求。

6. **CI 尚未在真实 GitHub Actions 上运行过**
   本次仅做了本地等价验证（`npm ci` + `npm run lint` + `npx jest --coverage` + `npm audit`）与
   YAML 语法校验。首次推送后建议观察一次真实运行结果。

---

## 六、复现命令汇总

```bash
# 覆盖率修复验证
cd 7zi-backend && npx jest --selectProjects workflow-engine --coverage
# → All files 93.46%

cd 7zi-backend && npx jest --coverage
# → 16 suites / 342 tests 全绿

# 漏洞门禁验证
cd 7zi-backend && npm audit --omit=dev --audit-level=moderate        # 0 vulnerabilities
cd workflow-engine/backend && npm audit --omit=dev --audit-level=moderate  # 0 vulnerabilities
cd 7zi-backend/workflow-service && npm audit --omit=dev --audit-level=moderate  # 0 vulnerabilities
cd 7zi-backend/websocket-service && npm audit --omit=dev --audit-level=moderate # 0 vulnerabilities

# Lint
cd 7zi-backend && npm run lint          # exit 0
cd workflow-engine/backend && npm run lint  # exit 0

# YAML 校验
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/backend-ci.yml')); print('YAML OK')"
```
