# T71 — 后端 ESLint warnings 清理报告（🛡️ 系统管理员）

**日期**：2026-10-23 20:44 (Asia/Shanghai)
**任务书**：`DEV_TASKS_20261023_2035.md` → T71
**负责路径**：`7zi-backend/workflow-service/src/**`、`7zi-backend/workflow-engine/**`、`7zi-backend/websocket/**`
**排除路径**（T70 独占，未触碰）：`7zi-backend/websocket-service/**`、`7zi-backend/workflow-service/test/**`

---

## 1. 根因分析

### 1.1 两套 ESLint 配置并存，行为不一致

`7zi-backend/` 目录下同时存在两个 flat config：

| 文件 | 关键差异 |
|---|---|
| `eslint.config.js` | `no-unused-vars` 配了 `caughtErrorsIgnorePattern: '^_'`、`sourceType: 'module'`、`globals.node + globals.jest` |
| `eslint.config.mjs` | `no-unused-vars` **只有** `argsIgnorePattern` / `varsIgnorePattern`，**没有** `caughtErrorsIgnorePattern`；`sourceType: 'commonjs'`，globals 为手写白名单 |

ESLint 9 在同目录发现多个 flat config 时，优先加载 `eslint.config.js`（`.mjs` 会被忽略）。因此：

- `npx eslint .`（基线验证命令）走 `eslint.config.js`，`catch (_error) {}` 因 `caughtErrorsIgnorePattern` 而**不报警告**；
- 但 `eslint.config.mjs` 里 `catch (_error) {}` **必然报 warning**（`' _error' is defined but never used`）。

这是典型的「规则配置不一致导致的潜伏 warning」：CI 门禁（`npm run lint` → `eslint websocket/ workflow-engine/`）与本地双配置并存，一旦任一流程切换到 `.mjs`，warning 即浮现。

### 1.2 warning 本身的两类根因

1. **`catch (_error)` 绑定未使用**：异常被显式捕获后主动忽略，但捕获变量在块内从未引用。属于「有意忽略的异常」。
2. **解构/导入的未使用变量**（T70 路径内）：`websocket-service/smoke.js` 的 `'yellow','info'`，`websocket-service/src/index.js` 的 `'promise'`，测试文件中的 `'msg' / 'node' / 'execution' / 'input'`。这些**不在**我负责范围内。

### 1.3 修复手法选择

对 `catch (_error)` 类问题，采用 **可选 catch 绑定（optional catch binding，ES2019+）**：`catch (_error) { ... }` → `catch { ... }`。

选择理由：

- 是**语法级**的语义等价的真实修复 —— 语义完全不变（异常依旧被忽略，`ioClient = null` 依旧执行）；
- **不依赖**任何 ESLint 规则配置（含 `caughtErrorsIgnorePattern`），因此在 `eslint.config.js` 与 `eslint.config.mjs` **两套配置下均为 0 warning**；
- 比 `_` 前缀更严格：`_error` 只有在 `caughtErrorsIgnorePattern` 存在时才被豁免，`catch {}` 无条件豁免；
- 满足任务书「真实修复」要求，未使用任何 `eslint-disable` 注释，未改动任何 ESLint 规则配置。

---

## 2. 实际改动文件列表

共修改 **2 个文件，2 行**（均为 1 行替换）：

| 文件 | 行号 | 改动 | 改动前 → 改动后 |
|---|---|---|---|
| `7zi-backend/websocket/__tests__/server.integration.test.js` | 23 | 删除未使用的 catch 绑定 | `} catch (_error) {` → `} catch {` |
| `7zi-backend/websocket/__tests__/smoke.test.js` | 30 | 删除未使用的 catch 绑定 | `} catch (_error) {` → `} catch {` |

**改动 diff**（`git diff HEAD -- 7zi-backend/`）：

```diff
--- a/7zi-backend/websocket/__tests__/server.integration.test.js
+++ b/7zi-backend/websocket/__tests__/server.integration.test.js
@@ -20,7 +20,7 @@ const jwt = require('jsonwebtoken')
 let ioClient = null
 try {
   ioClient = require('socket.io-client')
-} catch (_error) {
+} catch {
   ioClient = null
 }

--- a/7zi-backend/websocket/__tests__/smoke.test.js
+++ b/7zi-backend/websocket/__tests__/smoke.test.js
@@ -27,7 +27,7 @@ const { spawn } = require('child_process')
 let ioClient = null
 try {
   ioClient = require('socket.io-client')
-} catch (_error) {
+} catch {
   ioClient = null
 }
```

两处 `catch` 块内均为 `ioClient = null`（socket.io-client 未安装时的降级分支），语义完全保持不变。

**未做**：未 `git add`、未 `git commit`；未触碰 `websocket-service/**` 与 `workflow-service/test/**`；未新增任何 `eslint-disable`；未修改 `eslint.config.js` / `eslint.config.mjs`。

---

## 3. 验证命令与输出摘要

### 3.1 我负责范围 —— 0 warning（两套配置均验证）

```bash
cd 7zi-backend
# 默认配置（eslint.config.js）
npx eslint workflow-service/src workflow-engine websocket
# 输出：（空，0 errors 0 warnings）

# 显式指定 eslint.config.mjs（严格版）
npx eslint --config eslint.config.mjs workflow-service/src workflow-engine websocket
# 输出：（空，0 errors 0 warnings）  ← 修复前此处为 2 warnings
```

JSON 格式精确核对（确认不是「文件被忽略导致空跑」）：

```bash
npx eslint workflow-service/src workflow-engine websocket --format json
# → files: 28，逐文件 errorCount/warningCount 均为 0
```

分目录实际被 lint 的文件数：

| 目录 | 被 lint 文件数 |
|---|---|
| `workflow-service/src` | 3 |
| `workflow-engine` | 4 |
| `websocket` | 21 |
| **合计** | **28** |

### 3.2 语法与 CI 脚本校验

```bash
node --check websocket/__tests__/smoke.test.js
node --check websocket/__tests__/server.integration.test.js
# → 均为 syntax OK（可选 catch 绑定在 ES2019+ 有效，Node 22 支持）

npm run lint   # = eslint websocket/ workflow-engine/
# → 输出为空，exit 0
```

### 3.3 全仓库基线对比

```bash
cd 7zi-backend && npx eslint .
```

| 时点 | 结果 |
|---|---|
| 修复前 | `✖ 11 problems (0 errors, 11 warnings)` |
| 修复后 | `✖ 11 problems (0 errors, 11 warnings)` |

全仓库总数**未变**，因为剩余 11 条 warning **全部位于 T70 独占路径**，与我的范围零交集（见下表）。我的范围内从 2 条 warning（`.mjs` 配置下）降为 0 条。

剩余 11 条 warning 明细（**非本任务范围，由 T70 处理**）：

| 文件 | 行 | 规则 | 内容 |
|---|---|---|---|
| `websocket-service/smoke.js` | 32, 33 | `no-unused-vars` | `'yellow'` / `'info'` 未使用 |
| `websocket-service/src/index.js` | 686 | `no-unused-vars` | `'promise'` 未使用 |
| `websocket-service/test/jwt-secret.test.js` | 41, 69 | `no-unused-vars` | `'msg'` 未使用 |
| `workflow-service/test/engine.test.js` | 12, 19 | `no-unused-vars` | `'node'` / `'execution'` / `'input'` 未使用 |

> 注：任务书给出的 `websocket-service/src/index.js:684`，当前实际为 **686** 行（T70 并行改动导致行号漂移），不影响归属判定。

---

## 4. 遗留问题 / 需上游关注

1. **T70 范围内仍有 11 warnings 未清**（见 3.3 表）。全仓库 `npx eslint .` 目前仍为 `11 problems (0 errors, 11 warnings)`，需 T70 完成后才会归零。这部分**不是** T71 的锅。

2. **`7zi-backend/` 双 flat config 并存是隐患**（本次根因）：
   - `eslint.config.js` 会被 ESLint 9 自动选中，`eslint.config.mjs` 实际处于「死配置」状态，但因两套配置内容不一致，一旦有人手动 `--config eslint.config.mjs` 或删除 `.js`，lint 结果就会突变；
   - 建议上游**统一为单一配置**（保留 `eslint.config.js`，删除或用 `extends` 合并 `.mjs`），并把 `caughtErrorsIgnorePattern` 语义显式化，避免后续再出现「配置间潜伏 warning」。
   - 本次修复刻意选择了对两套配置都安全的写法（可选 catch 绑定），因此**未**触碰配置文件，符合任务书约束。

3. **`workflow-engine/websocket-integration-example.js` 被显式 ignore**，属「仅供复制粘贴的示例片段，非可运行模块」。用 `--no-ignore` 强跑会产生 16 个 `no-undef` error（`PORT` / `app` / `server` 未定义）。这是**设计上的 intentional ignore**，不是漏网 warning；本次未处理，也不建议处理。

4. **未提交**：按任务书约束，未执行 `git add` / `git commit`。改动已在 `git status` 中可见（`git diff HEAD -- 7zi-backend/` 显示 2 文件 2 行变更）。

---

## 5. 结论

| 指标 | 结果 |
|---|---|
| 我负责范围 warnings（默认 config） | **0** ✅ |
| 我负责范围 warnings（`.mjs` 严格 config） | **0** ✅（修复前 2） |
| `npm run lint`（CI 门禁脚本） | **exit 0，0 warning** ✅ |
| 实际改动 | 2 文件 / 2 行，均为语义等价真实修复 |
| eslint-disable / 改规则配置 | **0 处** ✅ |
| git add / commit | **未执行** ✅ |
