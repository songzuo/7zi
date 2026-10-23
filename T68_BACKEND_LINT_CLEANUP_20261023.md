# T68 · 后端 ESLint 清理报告 — 2026-10-23

**角色**：🛡️ 系统管理员（T68）  
**范围**：`7zi-backend/workflow-service/src/**`、`7zi-backend/workflow-engine/**`、`7zi-backend/websocket/**`  
**目标**：后端 `npx eslint .` warnings 43 → ≤15

---

## 一、结果概览

| 指标 | 任务前 | 任务后 | 目标 |
|---|---|---|---|
| errors | 1 | 1 | ≤1（**归 T67 独占路径**） |
| warnings | 43 | **11** | ≤15 ✅ |
| 我负责路径（`workflow-service/src` + `workflow-engine` + `websocket`）的 warning | 33 | **0** ✅ | 0 |
| 我负责路径的 error | 0 | **0** ✅ | 0 |

最终 `npx eslint .` 输出：**`✖ 12 problems (1 error, 11 warnings)`**

---

## 二、改动文件列表（带 +/- 行数）

> 注：`7zi-backend/websocket/sentry-ws.js`、`7zi-backend/websocket/test-websocket.js`、
> `7zi-backend/workflow-engine/server.js` 都是**符号链接**，真实文件位于
> `server/` 与 `workflow-engine/backend/`（见 `ls -la`）。下表按真实路径列出。

| 文件 | + | - | 说明 |
|---|---|---|---|
| `7zi-backend/workflow-service/src/engine/executors/index.js` | 8 | 8 | 8 处 `execute(node, execution, input)` 签名中未用参数加 `_` 前缀 |
| `7zi-backend/workflow-service/src/index.js` | 2 | 2 | 删除未用 import `AiExecutor`；`unhandledRejection` 回调第 2 参改名 `_promise` |
| `workflow-engine/backend/server.js`（= `7zi-backend/workflow-engine/server.js` 软链） | 1 | 1 | 删除未用 import `AiExecutor` |
| `server/sentry-ws.js`（= `7zi-backend/websocket/sentry-ws.js` 软链） | 1 | 1 | `beforeSend(event, hint)` → `beforeSend(event, _hint)` |
| `server/test-websocket.js`（= `7zi-backend/websocket/test-websocket.js` 软链） | 6 | 6 | 2 处解构丢弃未用的 `user`；4 处 `let` → `const`（prefer-const） |
| `7zi-backend/websocket/__tests__/server-entry.test.js` | 0 | 1 | 删除 1 条**多余**的 `eslint-disable-next-line global-require` 指令（Unused eslint-disable directive） |
| `7zi-backend/websocket/__tests__/server.integration.test.js` | 0 | 1 | 同上 |
| `7zi-backend/websocket/__tests__/smoke.test.js` | 0 | 1 | 同上 |
| `7zi-backend/websocket/__tests__/server-lib.test.js` | 1 | 1 | `const port = await listen(...)` → `await listen(...)`（port 未使用；保留 listen 行为） |

**合计：8 个文件，+19 / -20 行**

⚠️ 另有 `7zi-backend/workflow-service/src/engine/WorkflowEngine.js`（+40/-15）出现在主管的归档 commit `02ef8fe87e` 中，但**那是 T67 的改动**（重试 attempt 递归传递修复），**不是我的改动**，本报告不计入。

---

## 三、具体修复方式（真实修复，非掩盖）

1. **删除真正未用的 import**
   - `AiExecutor` 在 `workflow-service/src/index.js` 与 `workflow-engine/server.js` 中被解构导入但从未使用 → 从解构列表中移除（`AiExecutor` 类本身仍保留在 `executors/index.js` 并正常导出，引擎可用 `require('./engine/executors').AiExecutor` 拿到）。

2. **回调/方法签名中未使用的参数加 `_` 前缀**（符合项目 ESLint `argsIgnorePattern: '^_'` 约定）
   - `workflow-service/src/engine/executors/index.js`：
     - `BaseExecutor.execute` / `StartExecutor.execute` / `EndExecutor.execute`：`(_node, _execution, _input)`
     - `TaskExecutor.execute` / `ParallelExecutor.execute` / `DelayExecutor.execute` / `HttpExecutor.execute`：`(node, _execution, _input)`（`node` 实际被使用，保留）
     - `TransformExecutor.applyTransform(transform, data, _execution)`
   - `workflow-service/src/index.js`：`process.on('unhandledRejection', (reason, _promise) => {...})`
   - `server/sentry-ws.js`：`beforeSend(event, _hint)`

3. **删除解构出来的未使用变量**
   - `server/test-websocket.js`：两处 `for (const { client, user } of clients)` → `for (const { client } of clients)`（`user` 从未在该循环内被读取）。

4. **`prefer-const` 修复**
   - `server/test-websocket.js`：`let totalCursorUpdates` / `expectedCursorUpdates` / `totalTypingUpdates` / `expectedTypingUpdates` → `const`（这 4 条 ESLint 本身标记为可自动修复项）。

5. **删除「多余的 eslint-disable 指令」**
   - `websocket/__tests__/{server-entry,server.integration,smoke}.test.js` 中各 1 条 `// eslint-disable-next-line global-require` 触发 `Unused eslint-disable directive` 警告——因为本仓库并未启用 `global-require` 规则，该指令完全多余，**直接删除**，而不是新增 disable。

**未使用任何 `/* eslint-disable */` 屏蔽；未修改 `eslint.config.js` / `eslint.config.mjs` 任何规则；未使用 `--quiet`；未删除任何测试文件；未把路径加入 ignore 列表。**

---

## 四、验证命令与输出摘要

### 1. 全量 lint（主管基线口径）
```
$ cd 7zi-backend && npx eslint .
...
✖ 12 problems (1 error, 11 warnings)
```
- **1 error**：`websocket-service/src/index.js:567 no-dupe-keys 'rooms'` —— 位于 **T67 独占路径** `7zi-backend/websocket-service/**`，按边界约束**未触碰**（主管归档 commit 时 T67 尚未修完该点）。该路径另有 5 条 warning（`smoke.js` ×2、`src/index.js` ×1、`test/jwt-secret.test.js` ×2），同属 T67 范围。
- **剩余 11 warnings 全部在 T67 独占路径** `7zi-backend/workflow-service/test/engine.test.js`（未用参数 `node`/`execution`/`input` ×6）与 `websocket-service/**`（×5）。

### 2. 我负责路径单独 lint（0 error / 0 warning）
```
$ cd 7zi-backend && npx eslint workflow-service/src workflow-engine/ websocket/
（无输出，exit 0）
```

### 3. 软链真实文件 lint（根级 ESLint 配置下同样干净）
```
$ cd /root/.openclaw/workspace && npx eslint server/sentry-ws.js server/test-websocket.js workflow-engine/backend/server.js
（无输出，exit 0）
```

### 4. 运行时冒烟（确认重命名参数未破坏行为）
```
$ node -e "const E=require('./workflow-service/src/engine/executors'); ..."
Executing task: a {}
start ok true
task ok a
cond ok x
```
Start / Task / Condition 三类执行器行为均正常。

---

## 五、遗留 warning 明细（11 条，全部不属于 T68 边界）

| 文件 | 行 | 规则 | 说明 |
|---|---|---|---|
| `websocket-service/smoke.js` | 32, 33 | no-unused-vars | `yellow` / `info` 未用 —— T67 路径 |
| `websocket-service/src/index.js` | 684 | no-unused-vars | `promise` 未用 —— T67 路径 |
| `websocket-service/test/jwt-secret.test.js` | 41, 69 | no-unused-vars | `msg` 未用 —— T67 路径 |
| `workflow-service/test/engine.test.js` | 12, 19 | no-unused-vars | `node`/`execution`/`input` 未用 —— T67 路径 |

> 全部 11 条若由 T67 顺手处理，后端即可达到 **0 error / 0 warning**。

---

## 六、备注

- 未执行 `git add` / `git commit`；改动由主管统一归档（commit `02ef8fe87e`）。
- 过程中曾误用 `git checkout --` 撤销了自己对 `websocket/__tests__/server-lib.test.js` 的一处错误编辑（误删了多处共用的 `port` 变量导致 6 个 `no-undef` error），已用精确行替换重新实现，最终文件仅 1 行改动、功能不变。
