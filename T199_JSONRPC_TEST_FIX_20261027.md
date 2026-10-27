# T199 — A2A JSON-RPC 集成测试修复报告

- **日期**：2026-10-27
- **执行人**：🧪 测试修复工程师（子代理 T199）
- **任务来源**：DEV_TASKS_20261027_1045.md
- **目标文件**：`tests/api-integration/a2a-jsonrpc.test.ts`
- **基线**：36 failed（全部失败，主管亲测）
- **结果**：**47 passed（全部通过）**
- **结论**：**Yes**

---

## 一、基线复现

主管亲测基线：

```
npx vitest run tests/api-integration/a2a-jsonrpc.test.ts
→ 36 failed（全部）
```

失败形态：`TypeError: Cannot read properties of undefined (reading 'taskId')` /
`(reading 'stats')` —— 即测试在读取 `json.data.task.taskId`、`json.data.stats` 等字段时，
`json.data` 本身是 `undefined`。

---

## 二、根因分类

### 根因 A（主因）：测试断言的是一套从未存在过的 JSON-RPC 方法契约

旧测试断言了 10 个方法名：

| 旧测试断言的方法 | 实现里是否存在 |
| --- | --- |
| `agent.list` / `agent.get` / `agent.discover` / `agent.heartbeat` | ❌ 不存在 |
| `task.create` / `task.get` / `task.status` / `task.update` / `task.cancel` | ❌ 不存在 |
| `queue.stats` | ❌ 不存在 |

实现侧（`src/lib/agents/a2a/jsonrpc-handler.ts`）真实支持的方法只有：

```
message/send          message/stream
tasks/get             tasks/list             tasks/cancel
agent/getCard         agent/getExtendedCard
```

旧测试里的 `agent.*` / `task.*` / `queue.stats` 全部落在 handler 的 `default` 分支，
一律返回 `-32601 Method not found`。**这不是实现有 bug，而是测试写的是一套幻觉 API。**

证据：实现侧自己的单测
`src/lib/agents/a2a/__tests__/jsonrpc-handler.test.ts` 用的也是
`tasks/get` / `tasks/cancel` 这套真方法名，从未出现过 `task.get`。

### 根因 B：响应信封形状搞错

旧测试断言统一信封 `{ success: true, data: { task, taskId, agents, stats } }`。

但 `/api/a2a/jsonrpc` 返回的是**裸 JSON-RPC 2.0 信封**：

```jsonc
{ "jsonrpc": "2.0", "result": { ... }, "id": "..." }     // 成功
{ "jsonrpc": "2.0", "error": { code, message, data? }, "id": "..." }  // 失败
```

`{ success, data }` 那套是 **REST 路由**（`/api/a2a/registry`、`/api/a2a/queue`）的契约，
被错误地套到了 JSON-RPC 端点上。这正是 `reading 'taskId'`（`json.data` 为 undefined）的直接来源。

### 根因 C：错误码与 HTTP 状态码期望全部错位

| 旧测试期望 | 实现真实行为 |
| --- | --- |
| `-32602` Invalid params | schema 失败 → `-32600 "Invalid request format"` |
| `-32002` agent not found | 不适用（无 agent.* 方法） |
| `-32004` task not found | `-32603`，message 内含 `Task not found: <id>` |
| 未知方法 → `-32601` | ✅ 这条唯一是对的 |

HTTP 状态码由 `determineErrorStatusCode()` 映射：
`-32700/-32600/-32602 → 400`，`-32601 → 404`，`-32603` 及其他 → `500`。

> **关于 A2AErrorCodes.TASK_NOT_FOUND (-32001) 的说明（未改实现的论证）**
>
> `createA2AError()` 确实会把 -32001 挂到 `Error` 对象上，但 `handleRequest` 的 catch 分支
> 只取 `error.message`，统一包成 `-32603 Internal error` 并保留原始 message。
> 这个行为由实现侧单测
> `jsonrpc-handler.test.ts:250` 与 `:442` 明确背书（注释写着
> `INTERNAL_ERROR (all errors are caught and wrapped)`）。
>
> 因此判定：**实现行为有明确意图且有测试背书，不算 bug**，改它会破坏既有对外契约。
> 本次以实现为准，测试断言 `-32603` + message 包含 `Task not found: <id>`。
> **未修改任何实现文件。**

### 根因 D：测试基础设施缺失（鉴权 mock）

旧测试直接 `import { POST } from '@/app/api/a2a/jsonrpc/route'`，
但该路由被 `withA2AAuth` 包裹（`src/lib/agents/a2a/auth.ts`），
没有 mock `@/lib/auth/service` 的 `authenticateToken` 就会一律 401。
同目录的 `a2a-registry.test.ts` / `a2a-queue.test.ts`（T197/T198 已修）
都已建立正确范式，本文件沿用同一套。

---

## 三、改动文件与行数

| 文件 | 变更 | 说明 |
| --- | --- | --- |
| `tests/api-integration/a2a-jsonrpc.test.ts` | **+632 / -874**（1126 行 → 884 行） | 唯一改动文件 |

**未改动任何实现文件。** 实现侧参考（只读）：
- `src/app/api/a2a/jsonrpc/route.ts`
- `src/lib/agents/a2a/jsonrpc-handler.ts`
- `src/lib/agents/a2a/task-store.ts`
- `src/lib/agents/a2a/executor.ts`
- `src/lib/agents/a2a/agent-card.ts`
- `src/lib/agents/a2a/auth.ts`
- `src/lib/api/validation.ts`

> 说明：`git status` 里另有大量 `M src/...` 文件，那是本轮其他并行子代理（T197/T198/T200 等）
> 与历史遗留的改动，**非本任务所为**。本任务只写了 `tests/api-integration/a2a-jsonrpc.test.ts`
> 一个文件（mtime 11:00:21），且**全程无任何 git 写操作**（无 add/commit/checkout/stash）。

### 断言强度：未弱化，未 skip

- ❌ 无 `it.skip` / `describe.skip` / `test.skip` / `.todo`
- ❌ 无 `expect.soft`
- ❌ 无删除断言或改成 `toBeDefined()` 敷衍了事
- ✅ 全部 47 条用例均为**具体值断言**（具体错误码、具体状态码、具体字段值）
- ✅ 用例数从 36 → **47**，覆盖面**扩大**（新增鉴权、批量请求、
  AgentCard 能力声明、分页、includeArtifacts、终态任务拒绝取消、
  历史长度截断、旧方法名回归等）

---

## 四、新测试的契约映射（实现为准）

| 测试分组 | 对应实现 |
| --- | --- |
| Authentication | `auth.ts` → 401 `{ success:false, error:{ type:'UNAUTHORIZED' } }`；X-API-Key 走 `A2A_API_KEY` |
| Protocol Validation | `route.ts` `processSingleRequest` → `-32600` + `data` 字段级 zod 错误 |
| Parse error | `SyntaxError` → `-32700` "Parse error"，HTTP 400 |
| Batch | `jsonRpcBatchRequestSchema` = `z.array(jsonRpcRequestSchema).min(1)`，整体校验 |
| Agent Card | `agent/getCard` / `agent/getExtendedCard` → `agent-card.ts` |
| Message | `message/send` / `message/stream` → `executor.ts` + `task-store.ts` |
| Tasks | `tasks/get` / `tasks/list` / `tasks/cancel` → `task-store.ts` |
| Unknown Methods | `default` 分支 → `-32601`，HTTP 404 |
| CORS | `getCorsHeaders()` / `OPTIONS()` |

### 实现中若干「反直觉」但已按实现对齐的点

1. **批量请求只要有一条不合法，整批被拒**，返回**长度为 1** 的错误数组
   （`Invalid batch request format`），而不是逐条处理。
2. **`message/send` 是同步执行**，返回时任务已是 `completed` 终态；
   而实现明确**拒绝取消终态任务**（`Task cannot be canceled in state: completed`）。
   故全生命周期用例改为：另建一个非终态任务来验证取消链路，
   并单独保留一条「拒绝取消终态任务」的负向用例。
3. **鉴权判定顺序**：Bearer 优先于 X-API-Key。
   测「无效 API Key → 401」时必须**只带** X-API-Key，不能同时带 Bearer。
4. **`tasks/list` 默认不返回 artifacts**，需显式传 `includeArtifacts: true`。
5. **`tasks/get` 的 `historyLength`** 截断保留**最近** N 条。

---

## 五、验证输出（真实命令输出）

### 1) 目标测试文件 —— 全绿

```
$ npx vitest run tests/api-integration/a2a-jsonrpc.test.ts

 RUN  v4.1.12 /root/.openclaw/workspace

 ✓ tests/api-integration/a2a-jsonrpc.test.ts (47 tests) 539ms

 Test Files  1 passed (1)
      Tests  47 passed (47)
   Start at  11:00:45
   Duration  13.30s (transform 3.91s, setup 3.76s, import 4.50s, tests 539ms, environment 3.75s)
```

### 2) ESLint —— 0 error

```
$ npx eslint tests/api-integration/a2a-jsonrpc.test.ts --no-ignore
eslint exit=0
（无任何输出 = 0 error 0 warning）
```

> 注：`tests/**` 在 `eslint.config.mjs` 的 ignores 里，默认跑 `npx eslint <file>`
> 只会输出「File ignored because of a matching ignore pattern」警告；
> 加 `--no-ignore` 才是真实 lint 结果，退出码 0。

### 3) TypeScript —— 本文件 0 error

```
$ npx tsc --noEmit --strict ... tests/api-integration/a2a-jsonrpc.test.ts
--- errors mentioning a2a-jsonrpc ---
（空）
--- count for my file ---
0
```

仓库级 `npx tsc --noEmit` 的整体结果：

```
$ npx tsc --noEmit 2>&1 | grep "error TS" | cut -d'(' -f1 | sort -u
src/app/[locale]/dashboard/page.tsx
src/components/GlobalLoader.tsx
src/components/SettingsPanel.tsx
src/components/__tests__/GlobalLoader.test.tsx
src/components/examples/StoreUsageExample.tsx
src/components/room/RoomManager.tsx
src/components/ui/toast.tsx
src/components/undo-redo/HistoryViewer.tsx
src/contexts/PermissionContext.tsx
src/lib/notifications/__tests__/store.test.ts
src/lib/notifications/store.ts
src/lib/undo-redo/manager.ts
src/lib/undo-redo/middleware.ts
src/lib/websocket/dashboard/RoomList.tsx
src/lib/websocket/dashboard/RoomView.tsx
src/lib/websocket/dashboard/websocket-store.ts
src/stores/__tests__/dashboardStore.test.ts
src/stores/__tests__/uiStore.test.ts
src/stores/__tests__/walletStore.test.ts
src/stores/dashboardStore.ts
src/stores/filterStore.ts
src/stores/permissionStore.ts
src/stores/preferencesStore.ts
src/stores/uiStore.ts
src/stores/walletStore.ts

共 257 条 error，全部在上述 25 个文件里，**没有一条来自本次改动的测试文件**。
```

这些是**仓库既有的存量类型错误**（集中在 `src/stores/*`、`src/components/*` 的
zustand `set` 回调隐式 any 等），与本任务无关，也不在本任务可改范围内。
按任务书「npx tsc --noEmit 0 error」的门槛，这部分需要单独立项清理
（建议归入「前端 store 类型整改」批次）。**本任务范围内已达成 0 error。**

### 4) 回归 —— 整个 api-integration 目录全绿

```
$ npx vitest run tests/api-integration/

 Test Files  32 passed (32)
      Tests  1000 passed (1000)
   Start at  11:06:26
   Duration  68.27s
```

（含 a2a-registry 32 / a2a-queue 36 / a2a-auth 23 等同批文件，确认无交叉污染）

---

## 六、遗留项

1. **仓库级 `npx tsc --noEmit` 仍有 257 条存量 error**（25 个文件，全在 `src/stores/*`
   与 `src/components/*`）。与本任务无关，本任务范围内已 0 error。建议单独立项。
2. **`tests/**` 被 ESLint 全局 ignore**（`eslint.config.mjs` ignores 含 `'tests/**'`）。
   本文件用 `--no-ignore` 验证为 0 error，但 CI 的 `npm run lint` 实际不会覆盖 tests 目录。
   这是仓库级策略问题，非本文件问题。
3. **A2AErrorCodes 的细粒度错误码（-32001/-32002 等）在 JSON-RPC 层被压平为 -32603**，
   仅 message 保留原因。判断为「有测试背书的既定行为」，本次未改。
   若后续希望 JSON-RPC 层透传细粒度错误码，那是**实现侧的契约变更**，
   需要同步改 `jsonrpc-handler.ts` 及其单测，需另开任务。
4. **`message/stream` 当前返回的是 Task 而非 SSE 流**（AgentCard 声明 `streaming: true`）。
   实现与声明存在语义落差，本次按实现断言，未改实现。可作为后续项跟进。

---

## 七、结论

**Yes** —— 任务完成。

- ✅ 目标文件 36 failed → **47 passed（0 failed）**
- ✅ ESLint 该文件 **0 error**（`--no-ignore` 实测退出码 0）
- ✅ TypeScript 该文件 **0 error**（仓库级存量 257 条与本任务无关，已在遗留项说明）
- ✅ api-integration 全目录回归 **1000 passed / 32 files**
- ✅ **未弱化、未 skip 任何断言**，用例数反而从 36 增至 47
- ✅ **仅改动 1 个文件**：`tests/api-integration/a2a-jsonrpc.test.ts`
- ✅ **未改动任何实现文件**（实现即对外契约，无充分理由不动）
- ✅ **全程零 git 写操作**
