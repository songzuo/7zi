# T70 — 后端 3 个真实缺陷修复报告

- **任务**：T70（Executor ⚡）
- **执行时间**：2026-10-23 20:44 ~ 20:56 (Asia/Shanghai)
- **路径范围**：`7zi-backend/websocket-service/**`、`7zi-backend/workflow-service/test/**`
- **约束遵守**：未执行 `git add` / `git commit`；未新增 `eslint-disable`；未修改 eslint 配置

---

## 一、三个缺陷的根因与处理

### 缺陷 ① `websocket-service/src/index.js` 重复键 `rooms`（no-dupe-keys）

**状态：在本任务开始前，已由主管在 commit `e68aba61cc` 修复并提交。**

- 原代码在 `/stats` 响应体中把 `rooms` 键写了两次：
  ```js
  rooms: rooms.length,   // 数量
  ...
  rooms,                 // 数组（静默覆盖前者）
  ```
- 现有实现（已生效，语义清晰、无数据丢失）：
  ```js
  connections: io.sockets.sockets.size,
  roomCount: rooms.length,   // 数量
  totalUsers,
  rooms,                     // 数组
  ```
- 对外语义与 `websocket/lib/server.js` 一致（`roomCount` = 数量，`rooms` = 数组）。
- 本次任务在该文件上又追加了 2 处**与本缺陷无关但同属本次任务范围**的定时器清理（见下），未回退该修复。

**验证**：`npx eslint .` → `0 errors`，无 `no-dupe-keys` 报错。

---

### 缺陷 ② `workflow-service/test/run.js` 相对路径 → MODULE_NOT_FOUND + exit code 传递

**根因**
1. `spawn('node', ['test/engine.test.js'])` 使用**相对路径**，且没有设置 `cwd`。
   相对路径是相对于**调用者的 cwd** 解析的：
   - 从 `7zi-backend/workflow-service/` 运行 → 恰好能找到 `test/engine.test.js`（碰巧能用）
   - 从仓库根 `7zi-backend/` 运行 → 找 `7zi-backend/test/engine.test.js` → **MODULE_NOT_FOUND**
   - 从 `7zi-backend/workflow-service/test/` 运行 → 找 `test/test/engine.test.js` → **MODULE_NOT_FOUND**
2. 汇总逻辑只区分「通过 / 不通过」，没有区分**引擎失败**与**HTTP 失败**，且失败一律 `process.exit(1)`，失败来源在 CI 里无法定位。

**修复**（`7zi-backend/workflow-service/test/run.js`）
- 用 `path.join(__dirname, 'engine.test.js' / 'http.test.js')` 解析**绝对路径**，与调用者的 cwd 完全解耦。
- `spawn(process.execPath, [absolutePath], { cwd: __dirname })` —— 用 `process.execPath` 保证用同一个 Node 解释器。
- 增加 `child.on('error')` 处理（spawn 失败不再静默挂死）；`code === null`（被信号杀死）按失败计。
- 汇总结果区分引擎失败与 HTTP 失败，退出码细分：

  | 情况 | exit code |
  |---|---|
  | 全部通过 | `0` |
  | 仅引擎单测失败 | `1` |
  | 仅 HTTP 集成测试失败 | `2` |
  | 两者均失败 | `3` |
  | runner 自身异常 | `1` |

**验证**
```
$ cd /root/.openclaw/workspace && node 7zi-backend/workflow-service/test/run.js
...
 Engine unit tests : FAILED (exit 1)
 HTTP integration  : FAILED (exit 1)
EXIT=3
grep -c MODULE_NOT_FOUND → 0
```
→ 从仓库根运行不再出现 MODULE_NOT_FOUND，且退出码非 0（失败必须返回非 0 ✅）。
（注：当前 exit=3 是因为下游 6 个引擎单测断言 + 3 个 HTTP 断言真实失败，见"遗留问题"。）

---

### 缺陷 ③ `websocket-service/test/run.js` 进程不退出（60s 无输出）

**根因（多层，逐层定位）**
1. **测试自身从未关闭 socket 客户端**：集成测试里写的是 `t.test({ cleanup: () => socket.close() })`。
   `t.test()` 是 node:test 里**启动子测试**的 API，`{ cleanup }` 不是它的合法选项 —— 这行实际上启动了一个空子测试，
   **cleanup 回调从来不会被执行**。所有 socket.io 客户端都保持着活的 WebSocket 连接。
2. **socket.io 客户端默认无限重连**：连接用的是 `reconnectionDelay: 0`（一旦断开立刻重连），
   没有关闭 `reconnection`，于是断开的客户端会疯狂重连并一直持有事件循环。
3. **服务端后台定时器**：`createServer()` 里的 `setInterval`（心跳巡检 10s、房间清理日志 60s）
   和房间空闲清理 `setTimeout`（**30 分钟**）都是 ref 的，会单独把进程挂住。
4. **`httpServer.close()` 不会强制断开已建立的连接**，残留 keep-alive socket 依旧 hold 住事件循环。

**修复**
- `7zi-backend/websocket-service/test/integration.test.js`
  - `t.test({ cleanup: ... })` → **`t.after(() => ...)`**（node:test 正确的清理钩子），全部 10 处。
  - 所有客户端连接加 `reconnection: false`，杜绝无限重连。
  - `after()` 钩子改为：`httpServer.closeAllConnections?.()` + `await new Promise(r => httpServer.close(r))`，
    强制断开残留连接并等待关闭完成。
- `7zi-backend/websocket-service/src/index.js`
  - 心跳 / 清理两个 `setInterval` 提取为变量，调用 `.unref()`（不再 hold 事件循环），
    并在 `httpServer.on('close')` 时 `clearInterval` 清理。
  - 房间空闲清理 `setTimeout`（30 分钟）同样 `.unref()`。
- `7zi-backend/websocket-service/test/run.js`
  - 重写为基于 `__dirname` 绝对路径（与缺陷②同构）。
  - 每个子测试进程加 **60s 硬超时**（`SIGKILL`），超时按失败处理，杜绝 runner 永久挂起。
  - 汇总区分三个测试组并细分退出码：`0` 全通过 / `1` 单测失败 / `2` 集成失败 / `3` 全失败。
  - 结尾显式 `process.exit(...)`，不依赖事件循环自然排空。

**验证**
```
$ cd /root/.openclaw/workspace && time node 7zi-backend/websocket-service/test/run.js
 Unit tests (RoomManager) : PASSED
 Unit tests (jwt-secret)  : PASSED
 Integration tests        : PASSED
✅ All tests passed
EXIT=0
real 0m1.464s
```
→ **1.46s 内退出**（要求 60s 内），exit code 0 ✅
在 `/tmp` 下用绝对路径调用同样 1.4s / exit 0 ✅

---

## 二、附带修复：`workflow-service/test/http.test.js`（同属本次路径范围）

**根因**：`http.test.js` 写的是 `const { createServer } = require('../src/index.js')`，
但 `src/index.js` **根本没有导出 `createServer`**（导出的是 `{ app, engine, server }`），
且它在**模块加载时**就 `app.listen(PORT)` —— 此时 `process.env.PORT` 还没被设置（设置语句在 require 之后），
于是服务去抢默认端口 **3001** → `EADDRINUSE`（3001 已被 docker-proxy 占用）→ 整个 HTTP 套件全灭。

**修复**
- 在 `require('../src/index.js')` **之前**设置 `process.env.PORT / LOG_LEVEL / CHECKPOINT_INTERVAL`。
- 改用真实导出：`const { server: httpServer } = require('../src/index.js')`。
- `before` 等待 `httpServer` 进入 listening；`after` 用 `closeAllConnections()` + `await close()` 确保进程能退出。

**效果**：HTTP 套件从「41 个用例全部因 EADDRINUSE 崩溃」恢复为 **38 pass / 3 fail**。

---

## 三、实际改动文件列表（带行数）

| 文件 | +/− | 改动要点 |
|---|---|---|
| `7zi-backend/websocket-service/src/index.js` | +14 / −2 | 心跳/清理 `setInterval` 变量化 + `unref()` + `close` 时 `clearInterval`；房间空闲 `setTimeout` 加 `unref()` |
| `7zi-backend/websocket-service/test/run.js` | +78 / −21 | `__dirname` 绝对路径；60s 子进程超时；三分组汇总 + 细分退出码；显式 `process.exit` |
| `7zi-backend/websocket-service/test/integration.test.js` | +30 / −12 | `t.test({cleanup})` → `t.after()`（10 处）；客户端加 `reconnection:false`；`after` 强制 `closeAllConnections()` |
| `7zi-backend/workflow-service/test/run.js` | +43 / −10 | `__dirname` 绝对路径 + `cwd`；`child.on('error')`；区分引擎/HTTP 失败；退出码 0/1/2/3 |
| `7zi-backend/workflow-service/test/http.test.js` | +19 / −10 | env 前置到 require 之前；改用 `{ server }` 真实导出；`closeAllConnections()` 清理 |

> 同目录下的 `websocket-service/test/jwt-secret.test.js` 与 `workflow-service/test/engine.test.js`
> 也有 diff，但那是并行执行的 **T71**（ESLint warnings 清理）改的 `_msg` / `_node` 前缀，不属于本任务改动，未回退。

---

## 四、验证命令与输出摘要

```bash
cd /root/.openclaw/workspace/7zi-backend && npx eslint .
# ✖ 6 problems (0 errors, 6 warnings)   ← 0 errors ✅，warnings 归 T71
# 无 no-dupe-keys 报错

cd /root/.openclaw/workspace && node 7zi-backend/websocket-service/test/run.js
# Unit tests (RoomManager) : PASSED
# Unit tests (jwt-secret)  : PASSED
# Integration tests        : PASSED
# ✅ All tests passed
# EXIT=0        real 0m1.464s   ← 60s 内退出 ✅

cd /root/.openclaw/workspace && node 7zi-backend/workflow-service/test/run.js
# Engine unit tests : FAILED (exit 1)
# HTTP integration  : FAILED (exit 1)
# EXIT=3            ← 非 0 ✅，且区分了引擎失败 / HTTP 失败

# 从任意 cwd 验证无 MODULE_NOT_FOUND
cd /tmp && node /root/.openclaw/workspace/7zi-backend/websocket-service/test/run.js   # EXIT=0
cd /root/.openclaw/workspace && node 7zi-backend/workflow-service/test/run.js         # EXIT=3, grep -c MODULE_NOT_FOUND = 0
```

---

## 五、遗留问题（超出本任务路径范围，未动）

### 1. `workflow-service/src/engine/WorkflowEngine.js` 引擎缺陷 → 6 个引擎单测失败
**路径属于 T71 独占范围（`workflow-service/src/**`），本任务不得修改。**

- `safeEval('${count} > 3')` 返回 `false`（期望 `true`）
  → 根因：`resolvePath('count', context)` 在 context `{ variables, output, $ }` 上找不到顶层 `count`
  （`count` 在 `execution.variables.count`），替换后得到字符串 `"undefined > 3"` → `eval` 得 `false`。
  同时 `resolved.includes('>')` 会先命中 `!==`/`>=` 之类的子串，判断顺序也是脆弱点。
- `safeEval('${x} == 5')` 同理返回 `false`。
- `evaluateCondition('${invalid..path}')` 期望 `false` + 触发 `condition:error`，实际返回 `true`（不抛错 → 不发事件）。
- `executeNextNodes` 的并行分支：`maxRunning=1`，并行没真正生效。
- `runExecution` 无 start 节点时抛的是 `Invalid workflow: no start node`，断言期望的是另一条消息。

### 2. `workflow-service/src/index.js` 校验缺失 → 3 个 HTTP 断言失败
**路径属于 T71 独占范围。**

- `POST /api/workflows` 缺 `version` 返回 **201**（期望 400）→ 源码里 `workflow.version = workflow.version || '1.0.0'` 自动补默认值。
- 缺 `id`/`version`/`nodes` 时报错文案是 `Invalid workflow: no nodes defined`，断言期望包含 `missing required fields`。
- 「large but valid workflow」→ **413 PayloadTooLarge**（`raw-body` 限制），期望 201。

### 3. `websocket-service/src/index.js:698` 仍有一个 `no-unused-vars` warning
`'promise' is defined but never used` —— 归 T71（warnings 负责人），本任务不动。

### 4. 未提交
按硬约束，未执行 `git add` / `git commit`，全部改动以工作区 diff 形式可见（`git status` / `git diff` 可查）。
