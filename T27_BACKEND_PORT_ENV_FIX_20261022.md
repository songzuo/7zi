# T27 — 后端端口环境变量被静默忽略 Bug 修复报告

日期：2026-10-22
执行角色：⚡ Executor
工作目录：`/root/.openclaw/workspace/7zi-backend`

---

## 1. 根因

`bin/start-all.sh` 为两个后端服务分别注入了**专用**端口变量，但服务代码只读取**通用**变量 `PORT`，导致注入的变量被静默忽略，服务回落到各自的默认端口：

| 服务 | start-all.sh 注入 | 代码原先只读 | 实际监听（修复前） | 期望 |
|------|------------------|--------------|------------------|------|
| WebSocket | `WS_PORT`（默认 3010） | `PORT` | 3002 ❌ | 3010 |
| 工作流引擎 | `WF_PORT`（默认 3011） | `PORT` | 3001 ❌ | 3011 |

具体代码位置：

- `7zi-backend/websocket/lib/config.js` → `loadConfig()` 中 `const rawPort = env.PORT`
- `workflow-engine/backend/server.js`（在 `7zi-backend/workflow-engine/server.js` 中为符号链接）→ 第 16 行 `const PORT = process.env.PORT || 3001;`

附带文档错误：`7zi-backend/README.md` 端口速查表把工作流引擎"直接运行"端口写成 `3002`，实际代码默认是 `3001`。

---

## 2. 修改文件与行号

### 2.1 `7zi-backend/websocket/lib/config.js`（第 16–24 行）

```js
function loadConfig(env = process.env) {
  // 支持两种端口环境变量：
  // - PORT   通用端口变量（优先级最高）
  // - WS_PORT WebSocket 专用端口变量（bin/start-all.sh 注入的就是它）
  // 两者都未设置时使用 DEFAULT_PORT，默认端口语义保持不变。
  const rawPort = env.PORT || env.WS_PORT
  const parsedPort = Number.parseInt(rawPort, 10)
  ...
```

`DEFAULT_PORT = 3002` 未改动。

### 2.2 `workflow-engine/backend/server.js`（第 15–26 行，导出行 ~530）

```js
const app = express();

const DEFAULT_PORT = 3001;

/**
 * 解析监听端口。
 * 优先级：PORT（通用变量） > WF_PORT（bin/start-all.sh 注入） > 3001（默认）。
 * 保持与历史行为完全一致：只有 PORT/WF_PORT 完全未设置时才使用默认端口。
 */
function resolvePort(env = process.env) {
  return env.PORT || env.WF_PORT || DEFAULT_PORT;
}

const PORT = resolvePort(process.env);
```

导出改为：`module.exports = { app, engine, resolvePort, DEFAULT_PORT };`
（新增 `resolvePort` 纯粹为了可单测，运行时监听端口逻辑与原来完全等价。）

> 注：`7zi-backend/workflow-engine/server.js` 是指向 `workflow-engine/backend/server.js` 的符号链接，改动落在真实文件上。

### 2.3 `7zi-backend/README.md`（第 68–92 行、第 154 行）

- WebSocket 环境变量表：新增 `WS_PORT` 行（默认 3002，`bin/start-all.sh` 注入默认 3010，仅在未设置 `PORT` 时生效），`PORT` 行说明改为"优先级高于 `WS_PORT`"。
- 工作流引擎环境变量表：新增 `WF_PORT` 行（默认 **3001**，说明同上）；`PORT` 行默认值由错误的 `3002` 修正为 `3001`。
- 端口速查表：工作流引擎"直接运行"由 `3002` 修正为 `3001`（WebSocket 3002 / start-all 3010；工作流 3001 / 3011 保持）。
- 最后更新日期：`2026-10-20` → `2026-10-22`。

未触碰其他任何文档（`docs/`、`memory/`、`state/` 均未修改）。

---

## 3. 新增测试清单

### 3.1 `7zi-backend/websocket/__tests__/config.test.js`（新增 `describe('WS_PORT support')` 块，6 个用例）

| # | 用例 | 断言要点 |
|---|------|---------|
| 1 | reads WS_PORT when PORT is not set | `loadConfig({ WS_PORT: '3010' }).PORT === 3010` |
| 2 | PORT takes precedence over WS_PORT when both are set | `{PORT:'4001',WS_PORT:'3010'}` → 4001 |
| 3 | falls back to WS_PORT when PORT is an empty string | `{PORT:'',WS_PORT:'3010'}` → 3010 |
| 4 | falls back to the default port when neither PORT nor WS_PORT is set | `{}` 与 `{PORT:'',WS_PORT:''}` → `DEFAULT_PORT`(3002) |
| 5 | falls back to the default port for a non-numeric WS_PORT | `{WS_PORT:'not-a-port'}` → 3002 |
| 6 | reads WS_PORT from process.env by default | 删掉 `process.env.PORT`、设 `WS_PORT=3010` → 3010（finally 完整还原环境变量） |

### 3.2 `7zi-backend/workflow-engine/__tests__/port.test.js`（**新建文件**，8 个用例）

| # | 用例 | 断言要点 |
|---|------|---------|
| 1 | 默认端口为 3001 | `DEFAULT_PORT === 3001` |
| 2 | 未设置任何端口变量时使用默认端口 | `resolvePort({})` / `resolvePort({PORT:'',WF_PORT:''})` → 3001 |
| 3 | 读取 PORT | `{PORT:'4001'}` → `'4001'` |
| 4 | 读取 WF_PORT（start-all.sh 注入的变量） | `{WF_PORT:'3011'}` → `'3011'` |
| 5 | PORT 优先于 WF_PORT | `{PORT:'4001',WF_PORT:'3011'}` → `'4001'` |
| 6 | PORT 为空字符串时回退到 WF_PORT | `{PORT:'',WF_PORT:'3011'}` → `'3011'` |
| 7 | 默认从 process.env 读取 WF_PORT | 删 `PORT`、设 `WF_PORT=3011` → `'3011'` |
| 8 | PORT 优先于 WF_PORT（process.env） | `PORT=4001` + `WF_PORT=3011` → `'4001'` |

无新增依赖、无 `as any`、未删除或弱化任何既有断言。

---

## 4. 测试输出结果

### 4.1 `npx jest websocket/ --silent`

修复前基线：
```
Test Suites: 9 passed, 9 total
Tests:       110 passed, 110 total
```
（任务书写的基线为"10 套件 / 111 用例"，实测工作区为 9 套件 / 110 用例，差异来自仓库当前状态，非本次改动导致。）

修复后：
```
PASS websocket/__tests__/server-lib.test.js
PASS websocket/__tests__/server-entry.test.js
PASS websocket/__tests__/handlers.test.js
PASS websocket/__tests__/server.integration.test.js
PASS websocket/__tests__/config.test.js
PASS websocket/__tests__/auth.test.js
PASS websocket/__tests__/room-manager.test.js
PASS websocket/__tests__/jwt-secret.test.js
PASS websocket/__tests__/production-guard.test.js (12.758 s)

Test Suites: 9 passed, 9 total
Tests:       116 passed, 116 total
Snapshots:   0 total
Time:        13.91 s
```
✅ 全绿，且用例数 110 → 116（+6 新增）。

### 4.2 `npx jest workflow-engine/ --silent`

```
PASS workflow-engine/__tests__/port.test.js
PASS workflow-engine/__tests__/basic.test.js

Test Suites: 2 passed, 2 total
Tests:       9 passed, 9 total
Snapshots:   0 total
Time:        2.437 s
```
✅ 全绿（1 → 9 用例）。

### 4.3 端到端手工验证

```bash
$ WS_PORT=3010 node websocket/websocket-server.js
║   Port: 3010                                          ║
║   Health Check: http://localhost:3010/health          ║
║   Stats: http://localhost:3010/stats                   ║
║   WebSocket: ws://localhost:3010                      ║
  "PORT": 3010,

$ WF_PORT=3011 node workflow-engine/server.js
Workflow Engine API running on port 3011
Health check: http://localhost:3011/health
```
✅ 两个服务均已正确使用 `start-all.sh` 注入的专用端口变量。

---

## 5. 语义兼容性确认

| 场景 | 修复前 | 修复后 | 是否变化 |
|------|--------|--------|---------|
| 不设任何端口变量（WebSocket） | 3002 | 3002 | 否 ✅ |
| 不设任何端口变量（工作流引擎） | 3001 | 3001 | 否 ✅ |
| `PORT` 已设置（任意服务） | 以 `PORT` 为准 | 以 `PORT` 为准 | 否 ✅ |
| `PORT=''` + `WS_PORT` 未设 | 3002（空串 parse 失败回落） | 3002（空串 falsy → WS_PORT 未设 → parse 失败回落） | 否 ✅ |
| `PORT='0'` | 0 | 0（`env.PORT` 为真值字符串，优先命中） | 否 ✅ |
| `PORT` 非数字 | 回落默认 | 回落默认 | 否 ✅ |
| 新增 `WS_PORT` / `WF_PORT` 单独生效 | 静默忽略 | 生效 | 是（本次修复目标） |

---

## 6. 组外问题（仅记录，未修改）

1. `7zi-backend/websocket/websocket-server.js` 是指向 `/root/.openclaw/workspace/server/websocket-server.js` 的符号链接；`workflow-engine/server.js` 指向 `/root/.openclaw/workspace/workflow-engine/backend/server.js`。真正的源文件分布在 `server/` 与 `workflow-engine/backend/` 两个目录，仓库结构上存在多处重复实体，建议后续统一（本次按要求只改必要文件）。
2. `bin/start-all.sh` 中 `export $(cat .env | grep -v '^#' | xargs)` 未对含空格的值做引号处理，`.env` 中带空格的条目会解析异常（未修改）。
3. `workflow-engine/test/`、`workflow-engine/src/` 均为符号链接，Jest haste map 不遍历符号链接，故 `workflow-engine/jest.config.js` 必须显式声明 `roots`（现有配置已处理，未修改）。
4. `7zi-backend/coverage/` 与 `workflow-engine/coverage/` 为生成产物目录，建议加入 `.gitignore`（未修改）。

---

## 7. Git 状态说明

按要求**未执行任何 `git add` / `git commit`**。但在本任务执行期间（16:27），仓库出现了一次外部提交 `1f075b35a "docs: 同步 7zi-frontend 文档与 hooks 重构"`，该提交**顺带包含**了本次的全部改动文件：

```
7zi-backend/README.md                              | 10 +--
7zi-backend/websocket/__tests__/config.test.js     | 40 ++++++++++++
7zi-backend/websocket/lib/config.js                |  6 +-
7zi-backend/workflow-engine/__tests__/port.test.js | 67 +++++++++++++++++++
workflow-engine/backend/server.js                  | 16 ++++-
```

即：工作区当前相对 HEAD 无未提交差异（`git status --short 7zi-backend/ workflow-engine/ server/` 为空），改动已不在工作区待提交区。**请主管知悉：如需以独立提交形式留痕，需重新 revert/cherry-pick 处理该外部提交，或接受现状。**

---

## 8. 结论

✅ 3 个 Bug 全部修复，默认端口语义零变化，websocket（9 套件 / 116 用例）与 workflow-engine（2 套件 / 9 用例）测试全绿，端到端验证 `WS_PORT=3010` / `WF_PORT=3011` 均正确生效。
