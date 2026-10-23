# T67 后端 Bug 修复报告 — 2026-10-23

> ⚠️ **协作说明**：本任务期间，同一工作区存在并行的 T70/T75 子代理，正在修改
> `7zi-backend/websocket-service/**` 与 `7zi-backend/workflow-service/test/**`。
> 重复键修复（`src/index.js`）已由主管提交 `e68aba61cc` 先行落地；
> 测试 runner 的重构与失败清单由 T70 与本任务合并完成，最终由主管统一提交
> `a1914975fb`。本报告记录最终状态。

---

## 一、重复键 Bug（真 Bug，已修）

### 1.1 根因

`7zi-backend/websocket-service/src/index.js` 的 `/stats` 与 `/api/v1/ws/stats` 端点，
在同一个 JSON 响应对象字面量里出现了 **两个 `rooms` 键**：

```js
// 修复前（HEAD~1，commit e68aba61cc^）
res.end(JSON.stringify({
  connections: io.sockets.sockets.size,
  rooms: rooms.length,   // ← 数字：房间总数
  totalUsers,
  rooms,                 // ← 数组：房间列表。后者覆盖前者！
}))
```

ES 规范中对象字面量的重复键**后者覆盖前者**。因此运行时真实输出为：

```json
{ "connections": 0, "totalUsers": 0, "rooms": [] }
```

- `rooms` 永远拿不到房间数量（`rooms.length` 被数组覆盖）；
- 任何依赖 `rooms` 是数字的调用方（监控面板、健康检查、CI 断言）都会拿到 `undefined` 或
  被数组 `.length` 语义误导，属于**静默的语义破坏**。

ESLint `no-dupe-keys` 规则正是为此报错：
`websocket-service/src/index.js:567  error  'rooms' is used more than once  no-dupe-keys`

### 1.2 修复方案与调用方核查

修复前先 grep 了全部可能的调用方，确认无人依赖 `rooms === number`：

| 调用方 | 位置 | 是否消费 `rooms` 字段 |
|---|---|---|
| 前端 `7zi-frontend/src/**` | 全仓库检索 `ws/stats`、`/api/v1/ws` | **无**命中 |
| nginx 配置 `7zi-nginx.conf` | 检索 `ws/stats`、`ws/health` | **无**命中 |
| docker-compose / CI | `.github/workflows/backend-ci.yml` | 仅探活 `/api/v1/ws/health`，**不消费** `rooms` |
| 服务自身 README | `websocket-service/README.md` | **未**记录 `rooms` 字段契约 |
| `websocket/lib/server.js`（旧实现） | — | 已使用 `roomCount` + `rooms` 双字段语义，**佐证了正确命名** |

结论：**无外部调用方依赖旧的 `rooms: number`**，且旧版 `websocket/lib/server.js` 已经
采用 `roomCount`（数字）+ `rooms`（数组）的双字段结构 —— 这就是仓库内既有的既定契约。

因此采用与 `websocket/lib/server.js` **一致**的命名：

```js
// 修复后
res.end(JSON.stringify({
  connections: io.sockets.sockets.size,
  roomCount: rooms.length,   // 房间总数（数字）
  totalUsers,
  rooms,                     // 房间列表（数组）
}))
```

同时 `/api/v1/ws/health` 也统一为 `roomCount` + `rooms` 别名结构。

### 1.3 响应体前后对比

**修复前**（`rooms` 被数组覆盖，数量字段丢失）：

```json
{
  "connections": 0,
  "totalUsers": 0,
  "rooms": []
}
```

**修复后**（数量与列表语义分离，互不覆盖）：

```json
{
  "connections": 0,
  "roomCount": 0,
  "totalUsers": 0,
  "rooms": []
}
```

实测验证（启动 `createServer()` 后请求 `http://127.0.0.1:30099/stats`）：

```
STATUS 200
BODY {
  "connections": 0,
  "roomCount": 0,
  "totalUsers": 0,
  "rooms": []
}
```

---

## 二、测试 Runner 修复

### 2.1 `workflow-service/test/run.js`

**根因（问题 1：MODULE_NOT_FOUND）**

原实现用**相对路径** spawn 子测试，且未设置 `cwd`：

```js
spawn('node', ['test/engine.test.js'], { stdio: 'inherit' })   // ← 相对 cwd
```

Node 解析 `require()` 相对的是**进程 cwd**，不是脚本所在目录。从工作区根
`/root/.openclaw/workspace` 执行时，子进程 cwd 是工作区根 → 引擎内
`require('../src/engine/WorkflowEngine')` 被解析成
`7zi-backend/test/http.test.js` → `MODULE_NOT_FOUND`。

**根因（问题 2：失败被误报为成功）**

原实现最后统一 `process.exit(0)`，无论子测试是否失败 —— 这正是"Engine/HTTP 失败
却退出码 0"的来源。子进程 `code` 虽被读取，但从未参与退出码决策。

**修复**

1. 全部测试文件用 `path.join(__dirname, ...)` 解析为**绝对路径**，与 cwd 完全解耦：

```js
const TEST_DIR = __dirname
const ENGINE_TEST  = path.join(TEST_DIR, 'engine.test.js')
const HTTP_TEST    = path.join(TEST_DIR, 'http.test.js')
```

2. 显式设置子进程 `cwd: TEST_DIR`，保证 `require('../src/...')` 解析正确。
3. **退出码传递**：`engineFailed` / `httpFailed` 分别决定退出码：
   - `0` = 全通过
   - `1` = 仅引擎单测失败
   - `2` = 仅 HTTP 集成失败
   - `3` = 两者均失败
   - `4` = runner 自身异常
4. **清晰的失败清单**：捕获子进程 stdout/stderr，解析 TAP 输出的 `not ok N - <name>`
   行（优先取带缩进的子测试名，更具体），在汇总区逐条打印 `✗ <测试名>`。
5. **动态空闲端口**：`findFreePort()` 用 `net.createServer().listen(0)` 找一个空闲端口，
   通过 `WORKFLOW_TEST_PORT` 传给 HTTP 测试，避免 EADDRINUSE。
6. 每个子测试 120s 硬超时 → SIGKILL，runner 自身不挂死。

**配套改动 `workflow-service/test/http.test.js`**

端口改为 `WORKFLOW_TEST_PORT || PORT || 3004`；`process.env.PORT` 在
`require('../src/index.js')` **之前**设置（`src/index.js` 模块加载时即读 `PORT`
并立即 listen）；`after()` 中 `closeAllConnections()` + `await server.close()`
确保 HTTP server 释放、进程正常退出。

### 2.2 `websocket-service/test/run.js`

**根因（问题 3：进程不退出）**

`RoomManager` 在用户离开房间后启动 30 分钟的空闲清理定时器（`setInterval`），
心跳/清理用的 `setInterval` 也未 `unref()`。这些定时器 **hold 住事件循环**，
即使所有测试断言已完成，Node 也不会退出 —— 表现为"60s 无输出、进程不退出"。

**根因（问题 4：失败被误报为成功）**

与 2.1 同因：汇总后统一 `process.exit(0)`，子测试失败不影响退出码。

**修复**

1. `src/index.js` 中所有 `setInterval` / 清理定时器加 `.unref()`（不再阻止事件循环退出）；
   server 关闭时 `closeAllConnections()` + `close()`。
2. runner 侧：
   - 测试文件路径同样用 `path.join(__dirname, ...)` 绝对路径 + `cwd: TEST_DIR`；
   - 每个子测试 60s 硬超时 → SIGKILL，防止挂死；
   - 子进程被信号杀死（`code === null`）时**按失败处理**（exit 1），不再当成成功；
   - 捕获输出并解析 TAP `not ok` 行，汇总区打印 `✗ <测试名>` 失败清单；
   - 全部通过 → `exit 0`；任一失败 → `exit 1`。

---

## 三、改动文件列表

| 文件 | +/- | 说明 |
|---|---|---|
| `7zi-backend/websocket-service/src/index.js` | +15 / −3 | **重复键修复**：`rooms: rooms.length` → `roomCount`，`rooms` 保留为数组；`/api/v1/ws/health` 同步统一 |
| `7zi-backend/websocket-service/test/run.js` | +147 / −22 | 绝对路径解析、cwd 固定、超时 SIGKILL、失败清单、退出码传递 |
| `7zi-backend/websocket-service/test/integration.test.js` | +30 / −12 | server 关闭时 `closeAllConnections()` + `close()`，测试进程可退出 |
| `7zi-backend/websocket-service/test/jwt-secret.test.js` | +2 / −2 | 未用形参加 `_` 前缀（lint） |
| `7zi-backend/websocket-service/smoke.js` | +0 / −2 | 删除未用辅助函数（lint） |
| `7zi-backend/workflow-service/test/run.js` | +158 / −16 | 绝对路径解析、动态空闲端口、TAP 失败名解析、退出码分级、硬超时 |
| `7zi-backend/workflow-service/test/http.test.js` | +25 / −11 | 端口动态化、`process.env.PORT` 前置、server 关闭释放 |
| `7zi-backend/workflow-service/test/engine.test.js` | +2 / −2 | 未用形参加 `_` 前缀（lint） |

> 全部改动**未**执行 `git add` / `git commit`，由主管统一提交（`a1914975fb`）。

---

## 四、验证

### 4.1 ESLint

```
$ cd 7zi-backend && npx eslint .
（无输出，exit 0）
```

**0 errors / 0 warnings**（基线为 1 error + 43 warnings）。

### 4.2 websocket-service runner

```
$ cd 7zi-backend/websocket-service && node test/run.js
...
# pass 36
# fail 0
────────────────────────────────────────────────────────────
 Final Results
────────────────────────────────────────────────────────────
 Unit tests (RoomManager) : PASSED
 Unit tests (jwt-secret)  : PASSED
 Integration tests        : PASSED
✅ All tests passed

real 0m1.3s   →  exit 0
```

从工作区根执行同样正常（路径已解耦）：
```
$ cd /root/.openclaw/workspace && node 7zi-backend/websocket-service/test/run.js
→ exit 0
```

### 4.3 workflow-service runner

```
$ cd 7zi-backend/workflow-service && node test/run.js
...
────────────────────────────────────────────────────────────
 Final Results
────────────────────────────────────────────────────────────
 Engine unit tests : FAILED (exit 1)
 HTTP integration  : FAILED (exit 1)
X Engine unit tests failed (exit 1)

   失败详情 — Engine Unit Tests:
     ✗ executeNextNodes executes in parallel when output.parallel is true
     ✗ evaluateCondition evaluates simple comparison
     ✗ evaluateCondition returns false on evaluation error
     ✗ safeEval resolves ${} placeholders
     ✗ runExecution throws when workflow has no start node
     ✗ edges with false conditions are skipped
X HTTP integration tests failed (exit 1)

   失败详情 — HTTP Integration Tests:
     ✗ POST /api/workflows returns 400 when engine rejects invalid workflow
     ✗ POST /api/workflows missing version returns 400
     ✗ POST /api/workflows accepts large but valid workflow

real 0m1.2s   →  exit 3
```

**关键改进**：这 9 个失败此前被静默吞掉（退出码 0，CI 显示绿灯）。现在 runner
**正确返回非零退出码并逐条列出失败测试名**，真实问题暴露出来。

从工作区根执行不再出现 `MODULE_NOT_FOUND`：
```
$ cd /root/.openclaw/workspace && node 7zi-backend/workflow-service/test/run.js
→ exit 3，grep "MODULE_NOT_FOUND" 计数 = 0
```

### 4.4 失败路径验证（注入式）

在 `websocket-service/test/unit.test.js` 临时注入一个失败用例：

```
EXIT=1
 Unit tests (RoomManager) : FAILED (exit 1)
❌ Unit tests failed (exit 1)

   失败详情 — Unit Tests (RoomManager):
     ✗ T67 injected failure
```

失败 → 非零退出码 + 精确失败名，行为正确。注入代码已回滚。

### 4.5 无残留进程

```
$ ps aux | grep -E "http.test|unit.test|integration.test"
（无输出）
```

两个 runner 结束后无孤儿 node 进程，无端口残留。

---

## 五、遗留问题（不属 T67 边界，需 T68 处理）

### 5.1 workflow-service 引擎 6 个单测失败 —— `src/**` 真实 Bug

T67 边界为「不改 `workflow-service/src/**` 和 `workflow-engine/**`」（T68 地盘）。
经 `git stash` 验证：把 `test/**` 全部还原到 HEAD 状态后，这 6 个失败**依然存在**，
属**既有失败**，非本次改动引入。

| 失败测试 | 疑似根因（`src/engine/WorkflowEngine.js`） |
|---|---|
| `evaluateCondition evaluates simple comparison` | `safeEval()` 用 `eval(resolved)` 直接求值 `'5 > 3'` 这类**纯数字字符串**；JS 中 `'5 > 3'` 为 true，但 `'${count} < 3'` 分支落到 `resolved.includes('>')` 先命中（`'5 < 3'` 不含 `>`，但 `5 < 3` 顺序错乱时 `'3'` 与 `'5'` 混淆），比较运算符**未按优先级分派**（`>` 先于 `<` 判断），导致错误结果 |
| `evaluateCondition returns false on evaluation error` | 同上，`'${invalid..path}'` 解析成 `undefined` 后 `eval` 抛错路径与 `condition:error` 事件触发时机不符 |
| `safeEval resolves ${} placeholders` | 占位符替换后未做类型/引号处理 |
| `executeNextNodes executes in parallel when output.parallel is true` | 并行分支用 `Promise.all` + `map`，未保证并发可观测性 |
| `runExecution throws when workflow has no start node` | 缺失 start 节点时未走 `validateWorkflow()` 的抛错路径 |
| `edges with false conditions are skipped` | 条件求值错误导致边未被正确跳过 |

**建议 T68 重点**：`safeEval()` 重写为**不依赖 `eval`** 的安全比较器
（按 `>=`/`<=`/`>`/`<`/`==`/`!=` 顺序匹配 + 类型归一），并修正
`evaluateCondition` 的 context 作用域（`variables` vs 顶层变量名）。

### 5.2 workflow-service HTTP 3 个测试失败 —— `src/**` 契约不一致

| 失败测试 | 疑似根因（`src/engine/WorkflowEngine.js` `validateWorkflow`） |
|---|---|
| `POST /api/workflows returns 400 when engine rejects invalid workflow` | `validateWorkflow()` 抛 `Error('Invalid workflow: missing required fields')`，但 HTTP 层可能只捕获部分错误类型，导致 500 而非 400 |
| `POST /api/workflows missing version returns 400` | `validateWorkflow()` 检查 `!workflow.version` 抛错；HTTP 层未把该错误映射为 400 |
| `POST /api/workflows accepts large but valid workflow` | 大工作流的校验/序列化路径问题 |

**建议 T68**：在 HTTP 路由层统一把引擎校验异常映射为 `400`，并对
`version` 缺失做前置校验。

### 5.3 其他

- `websocket-service/src/index.js` 的 `/stats` 响应**新增** `roomCount` 字段属于
  **破坏性变更**（旧字段 `rooms` 语义从数字变为数组）。已确认仓库内无调用方，
  且与旧版 `websocket/lib/server.js` 契约一致；但若线上有仓库外的监控脚本依赖
  `rooms` 为数字，部署前需同步告知。
- `workflow-service/test/http.test.js` 现依赖 `src/index.js` 导出 `server`。
  若 T68 重构该文件的导出结构，需同步调整此测试。
- `7zi-backend/workflow-service/src/**` 与 `7zi-backend/workflow-engine/**`
  本次**完全未触碰**。

---

## 六、结论

| 目标 | 状态 |
|---|---|
| 1. 修掉 `websocket-service/src/index.js:567` 重复键（真 Bug） | ✅ 已修（`roomCount` + `rooms`），响应体实测验证 |
| 2. `workflow-service/test/run.js` 用 `path.join(__dirname,...)` 解析 + 非零退出码 + 失败清单 | ✅ 已完成 |
| 3. `websocket-service/test/run.js` 能正常退出（≤120s）+ 非零退出码 | ✅ 已完成（实测 1.3s，exit 0/1） |
| 4. 两条 runner 均能结束并输出汇总 | ✅ 已验证（含从工作区根执行） |
| 附加：ESLint 全绿 | ✅ 0 errors / 0 warnings |
| 附加：暴露 9 个既有 `src/**` 真实 Bug | ✅ 已逐条列名，移交 T68 |
