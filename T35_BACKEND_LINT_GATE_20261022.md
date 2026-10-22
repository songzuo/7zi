# T35 · 后端 lint 门禁清零 + `/stats` 重复键真 Bug 修复

- 执行人：⚡ Executor（子代理）
- 时间：2026-10-22 18:41 ~ 19:20 (Europe/Berlin)
- 工作目录：`/root/.openclaw/workspace`（后端 `7zi-backend/`）

---

## 一、结论

✅ **任务完成，验收全绿。**

| 验收项 | 目标 | 实际 |
|---|---|---|
| `cd 7zi-backend && npx eslint websocket/ workflow-engine/` | EXIT=0 | **EXIT=0**（0 errors，12 warnings） |
| `cd 7zi-backend && npx jest` | 全绿，用例数 ≥ 341 | **16 套件 / 342 用例全绿**（341 + 新增 1） |
| `/stats` 重复键 Bug | 修复 + 补测 | 已修复（`roomCount`）+ 新增 1 条用例 + 更新 3 条既有用例 |
| 禁用项 | 不改 package.json / 不加 disable 压制 / 不删弱断言 / 不 commit | 均遵守 |

改前：**EXIT=1，19 errors / 14 warnings**。改后：**EXIT=0，0 errors / 12 warnings**（warning 由 14 → 12，只减不增）。

---

## 二、改动清单

### 1. `7zi-backend/websocket/lib/server.js` —— 修复 A（真实代码 Bug）

**Bug 现象**：`/stats` 响应对象字面量里 `rooms` 键出现两次：

```js
{
  connections: io.sockets.sockets.size,
  rooms: rooms.length,   // ← 数量
  totalUsers,
  rooms: rooms,          // ← 数组，同键覆盖前者
}
```

JS 对象字面量后写的同键覆盖先写的，`JSON.stringify` 只保留最后一个 → **房间数量被静默吞掉**，客户端拿不到房间数（`no-dupe-keys` 也正是 ESLint 报的那条 error）。

**修复**（`websocket/lib/server.js`）：

- `/stats`：数量改名为 `roomCount`，`rooms` 保留为房间数组 —— 对外响应语义与现状**完全一致**（`rooms` 仍是数组），数量信息以新名字补回。
- `/health`：同步补 `roomCount`（与 `/stats` 命名自洽），同时保留 `rooms` 作为**向后兼容别名**（`/health` 的 `rooms` 历来是数字，已有测试与 `server/test-websocket.js` 依赖它）。

```js
// /health
roomCount: roomManager.rooms.size,
rooms: roomManager.rooms.size,   // 兼容别名（历史语义：数字）

// /stats
roomCount: rooms.length,         // 数量
totalUsers,
rooms,                           // 数组
```

> 附带说明（重要）：`7zi-backend/websocket/lib/server.js` 与仓库根 `server/lib/server.js` 是**同一 inode 的硬链接**（`server/lib` 是指向 `../7zi-backend/websocket/lib` 的符号链接），因此本次修复**自动作用到真实运行时服务器** `server/websocket-server.js`（`require('./lib/server')`），无需二次改动、也不存在两边不一致的风险。

### 2. `7zi-backend/websocket/__tests__/smoke.test.js` + `server.integration.test.js` —— 修复 B（lint 规则缺失）

- `// eslint-disable-next-line global-require, import/no-extraneous-dependencies` → 去掉未注册的 `import/no-extraneous-dependencies`，**保留 `global-require`**（项目未安装 `eslint-plugin-import`，该规则不存在，ESLint 9 对未注册规则的 disable 注释直接报 **error**）。
- `catch (error) { ioClient = null }` → `catch (_error) { ioClient = null }`（遵循项目 `varsIgnorePattern: '^_'` 约定）。
- 两个文件其余内容未动。

### 3. `7zi-backend/eslint.config.js` —— 修复 C（生效配置 + 忽略示例文件）

先确认了**生效的是 `eslint.config.js`（不是 `.mjs`）**：

```
$ ls -la eslint.config.*
-rw-r--r-- 1 root root 1043 Oct 22 20:42 eslint.config.js
-rw-r--r-- 1 root root 1805 Oct 22 20:35 eslint.config.mjs
```

ESLint 9 flat config 解析优先级 `eslint.config.js` → `.mjs` → `.cjs`，且 `--print-config` 输出显示 `sourceType: "module"`、`globals` 为 node+jest 全量（与 `.js` 一致，`.mjs` 是 `commonjs` + 手写 globals 列表）→ 确认生效的是 **`eslint.config.js`**。

`.mjs` 里其实**已经写了**这条 ignore（`"workflow-engine/websocket-integration-example.js"`），但因 `.mjs` 未生效而不起作用。现把忽略项补进生效的 `eslint.config.js`：

```js
ignores: [
  ...
  // 示例片段：仅供复制粘贴，不是可运行模块（引用了外部的 server/engine/app/PORT 变量）
  'workflow-engine/websocket-integration-example.js',
  '**/websocket-integration-example.js',
],
```

> 同时加了 `'**/websocket-integration-example.js'` 通配，因为 `7zi-backend/workflow-engine/websocket-integration-example.js` 是指向 `workflow-engine/backend/websocket-integration-example.js` 的**断链 symlink**（目标文件不存在），ESLint 遍历时按路径匹配，用通配更稳。示例文件**内容一字未改**。

**另外**：`no-unused-vars` 增加 `caughtErrorsIgnorePattern: '^_'`，与项目既有 `^_` 命名约定对齐，使 `catch (_error)` 不再产生噪音警告（这正是任务书要求的 `_error` 约定的落地方式，而非压制新问题）。

### 4. `7zi-backend/websocket/__tests__/server-lib.test.js` —— 补测试 + 更新旧断言

- **新增 1 条用例**：`'/stats exposes the room array AND the room count at the same time'`
  —— 建 2 个房间（3 个用户），断言 `roomCount === 2`、`rooms` 是数组且长度 === `roomCount`、房间 id 集合正确、`totalUsers === 3`，并断言 `rooms` 键在 JSON 里只出现 1 次（防重复键回归）。
- **更新 3 条既有用例**（原注释把它们标成 "KNOWN DEFECT / roomsCount is undefined"，现在 Bug 已修，断言必须更新，否则是错误断言）：
  - `serves the /stats endpoint`：`expect(json.roomsCount).toBeUndefined()` → `expect(json.roomCount).toBe(0)`
  - `the /stats endpoint reflects the current room state`：补 `expect(json.roomCount).toBe(1)`
  - `serves the /health endpoint` / `the /health endpoint reports the room count`：补 `expect(json.roomCount)` 断言（**未删除或弱化任何原有断言**，只做增补）

### 未触碰的文件（遵守冲突矩阵）

- ❌ `7zi-backend/package.json`（T36 负责）—— 只见其 `M` 状态，那是 T36 并行改动，非本任务所致
- ❌ `7zi-backend/eslint.config.mjs`
- ❌ `7zi-backend/websocket/` 以外的任何 lib 文件
- ❌ `workflow-engine/backend/**`
- ❌ 未执行任何 `git add` / `git commit`

---

## 三、验证命令与原始输出

### 3.1 复现（改前）

```
$ cd 7zi-backend && npx eslint websocket/ workflow-engine/ > /tmp/lint.before.txt 2>&1; echo $?
1
```

原始输出片段（`/tmp/lint.before.txt`，19 errors / 14 warnings）：

```
/root/.openclaw/workspace/7zi-backend/websocket/__tests__/server.integration.test.js
  22:3   error    Definition for rule 'import/no-extraneous-dependencies' was not found              import/no-extraneous-dependencies
  22:3   warning  Unused eslint-disable directive (no problems were reported from 'global-require')
  24:10  warning  'error' is defined but never used                                                  no-unused-vars

/root/.openclaw/workspace/7zi-backend/websocket/__tests__/smoke.test.js
  29:3   error    Definition for rule 'import/no-extraneous-dependencies' was not found              import/no-extraneous-dependencies
  29:3   warning  Unused eslint-disable directive (no problems were reported from 'global-require')
  31:10  warning  'error' is defined but never used                                                  no-unused-vars

/root/.openclaw/workspace/7zi-backend/websocket/lib/server.js
  56:11  error  Duplicate key 'rooms'  no-dupe-keys

/root/.openclaw/workspace/7zi-backend/workflow-engine/websocket-integration-example.js
   15:40  error  'server' is not defined  no-undef
   15:48  error  'engine' is not defined  no-undef
   22:1   error  'app' is not defined     no-undef
   40:1   error  'app' is not defined     no-undef
   70:1   error  'app' is not defined     no-undef
   82:23  error  'engine' is not defined  no-undef
   91:5   error  'engine' is not defined  no-undef
  118:3   error  'server' is not defined  no-undef
  135:1   error  'server' is not defined  no-undef
  135:15  error  'PORT' is not defined    no-undef
  139:49  error  'PORT' is not defined    no-undef
  140:47  error  'PORT' is not defined    no-undef
  141:49  error  'PORT' is not defined    no-undef
  142:49  error  'PORT' is not defined    no-undef
  148:20  error  'app' is not defined     no-undef
  148:25  error  'server' is not defined  no-undef

✖ 33 problems (19 errors, 14 warnings)
```

### 3.2 确认生效的 ESLint 配置

```
$ ls -la eslint.config.*
-rw-r--r-- 1 root root 1043 Oct 22 20:42 eslint.config.js
-rw-r--r-- 1 root root 1805 Oct 22 20:35 eslint.config.mjs

$ npx eslint --print-config websocket/lib/server.js | head
{
  "linterOptions": {
    "reportUnusedDisableDirectives": 1
  },
  "rules": { ... }
```

`--print-config` 解析出的 `languageOptions`：

```
{'sourceType': 'module', 'ecmaVersion': 2023, 'parser': 'espree@10.4.0',
 'globals': {'__dirname': False, ..., 'require': False, ..., 'describe': False, 'expect': False, 'it': False, 'jest': False, ...}}
```

→ `sourceType: module` + `globals.node` + `globals.jest` 全量，与 **`eslint.config.js`** 一致（`.mjs` 是 `commonjs` + 手写 globals 白名单）。**生效配置 = `eslint.config.js`**。

### 3.3 验收（改后）

```
$ cd 7zi-backend && npx eslint websocket/ workflow-engine/ ; echo "EXIT=$?"
/root/.openclaw/workspace/7zi-backend/websocket/__tests__/server-entry.test.js
  26:3  warning  Unused eslint-disable directive (no problems were reported from 'global-require')

/root/.openclaw/workspace/7zi-backend/websocket/__tests__/server-lib.test.js
  220:11  warning  'port' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars

/root/.openclaw/workspace/7zi-backend/websocket/__tests__/server.integration.test.js
  22:3   warning  Unused eslint-disable directive (no problems were reported from 'global-require')

/root/.openclaw/workspace/7zi-backend/websocket/__tests__/smoke.test.js
  29:3   warning  Unused eslint-disable directive (no problems were reported from 'global-require')

/root/.openclaw/workspace/7zi-backend/websocket/sentry-ws.js
  57:23  warning  'hint' is defined but never used. Allowed unused args must match /^_/u  no-unused-vars

/root/.openclaw/workspace/7zi-backend/websocket/test-websocket.js
  246:24  warning  'user' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars
  255:7   warning  'totalCursorUpdates' is never reassigned. Use 'const' instead                    prefer-const
  256:7   warning  'expectedCursorUpdates' is never reassigned. Use 'const' instead                 prefer-const
  282:24  warning  'user' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars
  291:7   warning  'totalTypingUpdates' is never reassigned. Use 'const' instead                   prefer-const
  292:7   warning  'expectedTypingUpdates' is never reassigned. Use 'const' instead                prefer-const

/root/.openclaw/workspace/7zi-backend/workflow-engine/server.js
  12:17  warning  'AiExecutor' is assigned a value but never used. Allowed unused vars must match /^_/u  no-unused-vars

✖ 12 problems (0 errors, 12 warnings)
  0 errors and 7 warnings potentially fixable with the `--fix` option.

EXIT=0
```

`npm run lint`（= `eslint websocket/ workflow-engine/`）同样 **EXIT=0**。

### 3.4 回归测试

```
$ cd 7zi-backend && npx jest
PASS websocket websocket/__tests__/production-guard.test.js (11.202 s)
...
Test Suites: 16 passed, 16 total
Tests:       342 passed, 342 total
Snapshots:   0 total
Time:        12.14 s
Ran all test suites in 2 projects.

Process exited with code 0
```

> 342 = 341（基线）+ 1（本次新增的 `/stats` 用例）。**无用例减少。**

### 3.5 `git status --short`（限定本任务负责路径）

```
$ git status --short -- 7zi-backend/websocket/ 7zi-backend/eslint.config.js
 M 7zi-backend/eslint.config.js
 M 7zi-backend/websocket/__tests__/server-lib.test.js
 M 7zi-backend/websocket/__tests__/server.integration.test.js
 M 7zi-backend/websocket/__tests__/smoke.test.js
 M 7zi-backend/websocket/lib/server.js
```

`git diff --stat`（同一路径）：

```
 7zi-backend/eslint.config.js                       |  3 ++
 7zi-backend/websocket/__tests__/server-lib.test.js | 43 ++++++++++++++++++----
 .../websocket/__tests__/server.integration.test.js  |  4 +-
 7zi-backend/websocket/__tests__/smoke.test.js       |  4 +-
 7zi-backend/websocket/lib/server.js                 | 11 +++++-
 5 files changed, 52 insertions(+), 13 deletions(-)
```

**未执行 `git add` / `git commit`。**

---

## 四、组外问题（记录，未动手）

1. **`eslint.config.js` 与 `eslint.config.mjs` 并存且内容冲突**
   `.mjs` 里已写了本次所需的两项配置（`websocket-integration-example.js` ignore、`no-empty` allowEmptyCatch），但因 `.js` 优先级更高而**完全未生效** —— 属"死配置"。建议后续**删除 `.mjs`**（T35 权限内不擅自删文件，仅记录）。

2. **`eslint.config.js` 与仓库根 `eslint.config.mjs` 的关系**
   仓库根配置把 `7zi-backend/**` 列入 ignores（这也是当初 `npm run lint` 空跑的原因）。本次不动。

3. **多条 "Unused eslint-disable directive" 警告**
   `global-require` 规则在本项目**未启用**（`--print-config` 的 rules 里只有 `no-global-assign`，无 `global-require`），所以这些 disable 注释都是空转。任务书明确要求**保留 `global-require`**，故未删。若允许，可统一清理以消除 3 条噪音警告。

4. **`workflow-engine/websocket-integration-example.js` 是断链 symlink**
   指向 `workflow-engine/backend/websocket-integration-example.js`（该文件不存在）。真实示例文件在仓库根 `workflow-engine/backend/` 下。属 T37 地盘，未动。

5. **`websocket/sentry-ws.js`、`websocket/test-websocket.js`、`workflow-engine/server.js` 的 9 条 warning**（unused var / prefer-const）均为历史遗留，与本任务无关，未动（规则未降级）。

6. **Jest "worker process failed to exit gracefully"**
   全量 `npx jest` 结束时提示有 worker 未优雅退出（疑似定时器泄漏），属既有现象，非本次引入（改动前后一致）。**T36 的 CI job `test` 建议留意**：CI 环境可能因进程不退出而超时。

7. **T36 依赖关系**
   T35 完成后，`npm run lint` 已 EXIT=0，**T36 的 CI job `lint` 现在可以绿了**。本任务未修改 `package.json`（T36 地盘）。

---

## 五、给主管的备注

- `/stats` 的语义变化：`rooms` 仍是数组（**对外语义与现状一致**），新增 `roomCount` 字段承载数量，**纯增量、不破坏任何现有客户端**。
- `/health` 新增 `roomCount`（与 `rooms` 数值相同），`rooms` 保留为数字别名以兼容既有测试与 `server/test-websocket.js`。
- `server/lib/` 与 `7zi-backend/websocket/lib/` 是硬链接/软链接同源，**运行时服务器已同步获得修复**，无需额外改动。
