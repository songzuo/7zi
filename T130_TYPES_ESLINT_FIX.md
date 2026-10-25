# T130 — 类型错误修复 + eslint 死代码清理

日期：2026-10-25
执行者：⚡ Executor 子代理

---

## 1. 根因分析

### 1.1 TS2538（`src/app/api/workflow/[id]/route.test.ts`）

**现象**：`npx tsc --noEmit` 报 6 处 `TS2538: Type 'undefined' cannot be used as an index type`，位于第 28/29/30/39/44/45 行。

**根因**：测试文件的 mock DB 里，`exec` mock 的签名是：

```ts
exec: vi.fn((sql: string, params?: unknown[]) => {
  const id = params?.[params.length - 1] as string | undefined
```

`params` 是可选参数（`params?: unknown[]`），因此 `params?.` 的短路会让 `params.length` 处于"可能为 undefined"的分支里。TS 在 `noUncheckedIndexedAccess` 语义下把 `params.length - 1` 推断为 `number | undefined`，而 `params?.[...]` 的结果类型被扩散成 `unknown | undefined` —— 断言 `as string | undefined` 之后，`id` 的类型是 `string | undefined`，再拿它做 `dbRows[id]` 的索引签名访问时，索引类型含 `undefined` 即触发 TS2538。

换句话说：**问题不在 `params` 的 Promise 类型上，而在 mock 里对"可能不存在/长度不足的数组"取下标后，未先做 undefined 收窄就直接用作索引**。

**修复方式（类型安全，未使用任何 `as any` / `@ts-ignore` / `eslint-disable`）**：

```ts
exec: vi.fn((sql: string, params?: unknown[]) => {
  const rawId = params?.[params.length - 1]
  const id = typeof rawId === 'string' ? rawId : undefined
  if (!id) return { changes: 0 }
  ...
```

先取出原始值，再用 `typeof` 运行时守卫把索引类型收窄为 `string`，并在进入分支前用 `if (!id) return` 提前返回。行为等价（原来 `if (!dbRows[id]) return { changes: 0 }` 对 `undefined` 也会短路），但类型上 `id` 在后续所有使用点都被收窄为 `string`，TS2538 全部消失。

> 注：同一 mock 里的 `get` 分支本身已有 `if (!id) return null` 的收窄，所以它没有报错。

### 1.2 eslint unused-vars（4 个文件的 import/参数）

这些 import 之所以被"留着"，是因为历史演进中类型定义被搬走/重命名，但 import 行没同步清理；它们在本文件中已无任何引用点：

| 文件 | 位置 | 未使用符号 | 为什么留着（历史原因） | 处理 |
|---|---|---|---|---|
| `src/lib/workflow/scheduler.ts` | L6 | `WorkflowInstance`、`InstanceStatus` | 调度器早期版本直接操作实例对象与状态枚举，后来改为委托 `enhancedWorkflowExecutor` / `TriggerManager`，类型引用随之消失 | 从 import 中删除 |
| `src/lib/workflow/scheduler.ts` | L8 | `TriggerType` | 触发器类型抽到 `./triggers` 后本地别名不再被引用 | 从 import 中删除 |
| `src/lib/workflow/monitoring/types.ts` | L6 | `InstanceStatus` | 监控模型早期直接用实例状态枚举，后改为本文件自定义的 `WorkflowExecutionStatus` | 从 import 中删除 |
| `src/app/api/workflow/history/export/route.ts` | L9 | `createSuccessResponse` | 导出接口只用到 `createErrorResponse` / `createValidationError`，成功分支手工构造响应体 | 从 import 中删除 |
| `src/lib/workflow/triggers.ts` | L826 | 参数 `timezone` | `getDateInTimezone()` 是预留的时区转换接口（P3 TODO，实现上直接 `return new Date()`），形参目前没有读取 | 重命名为 `_timezone`（eslint 规则允许 `^_` 前缀），保留接口契约与调用点 `this.getDateInTimezone(timezone)` 不变，行为零变化 |

---

## 2. 改动文件列表

| 文件 | 变更 | +/- 行数（相对改动前） |
|---|---|---|
| `src/app/api/workflow/[id]/route.test.ts` | `exec` mock 中新增 `rawId` 局部变量 + `typeof` 收窄 + 提前返回 | +3 / -1 |
| `src/lib/workflow/scheduler.ts` | L6 import 去掉 `WorkflowInstance`、`InstanceStatus`；L8 import 去掉 `TriggerType` | +2 / -2 |
| `src/lib/workflow/triggers.ts` | L826 形参 `timezone` → `_timezone` | +1 / -1 |
| `src/lib/workflow/monitoring/types.ts` | L6 import 去掉 `InstanceStatus` | +1 / -1 |
| `src/app/api/workflow/history/export/route.ts` | L9 import 去掉 `createSuccessResponse` | +0 / -1 |

未触碰任何其它文件；未执行 `git add` / `git commit` / `git push` / `git rm --cached`；未新增依赖；未修改 `API.md` / `CHANGELOG.md` / `README.md`；未修改被禁改的 `run/`、`executions/`、`versions/` 路由及其测试。

> ⚠️ 并行改动说明：执行过程中 `src/lib/workflow/scheduler.ts` 曾被其它子代理并发写回（import 行被还原）。已重新应用并复核，最终状态确认无误（见下方验证输出）。

---

## 3. 验证命令与真实输出摘要

### 3.1 `npx tsc --noEmit`

```
$ npx tsc --noEmit
TSC_EXIT:0
```

**无任何输出，exit code 0。** 6 处 TS2538 全部消除，且仓库中未出现新的、属于其它文件的类型错误。

### 3.2 `npx eslint src/lib/workflow src/app/api/workflow/history/export/route.ts`

```
✖ 51 problems (0 errors, 51 warnings)
```

- **0 error**（本次任务的目标）。
- warnings 由 57 降至 51，减少的 6 条正是本任务列出的 5 个文件中的 6 处 unused 声明（含 scheduler.ts 的 3 个类型 import）。
- 剩余 51 条 warning 全部位于**本任务范围之外**的文件，属于其它并行子代理负责的区域，本次按约束未处理，例如：
  - `src/lib/workflow/executors/loop-executor.ts` — `inputs` / `variables` / `instanceId` / `node` 未使用（L150/151/227/271），另有 1 处 `@ts-ignore` 提示改用 `@ts-expect-error`
  - `src/lib/workflow/monitoring/AlertManager.ts` L11 — `WorkflowExecutionStatus` 未使用
  - `src/lib/workflow/monitoring/MetricsCollector.ts` L9 — `WorkflowExecutionStatus` 未使用
  - `src/lib/workflow/monitoring/index.ts` L10 — `NodeStatus` 未使用

针对本任务涉及的 4 个文件单独跑 eslint：

```
$ npx eslint src/lib/workflow/scheduler.ts src/lib/workflow/triggers.ts \
    src/lib/workflow/monitoring/types.ts src/app/api/workflow/history/export/route.ts
(无输出)  → 0 problems
```

### 3.3 `npx vitest run "src/app/api/workflow/[id]/route.test.ts"`

```
 ✓ src/app/api/workflow/[id]/route.test.ts (8 tests) 53ms

 Test Files  1 passed (1)
      Tests  8 passed (8)
   Duration  4.15s
```

**8/8 全绿。**

---

## 4. 遗留问题

1. **eslint 仍有 51 条 warning（0 error）**，全部在本任务授权范围之外（`executors/loop-executor.ts`、`monitoring/AlertManager.ts`、`monitoring/MetricsCollector.ts`、`monitoring/index.ts`）。如需清零，需另行授权扩展文件范围。
2. `src/lib/workflow/executors/loop-executor.ts:151` 存在 `@ts-ignore`，eslint 提示应改为 `@ts-expect-error`。属他人文件，本次未动。
3. `src/lib/workflow/triggers.ts` 的 `getDateInTimezone()` 仍是 P3 TODO 空实现（直接返回 `new Date()`），真实时区转换尚未实现；本次仅消除 lint 警告，逻辑未变。
4. `src/app/api/workflow/[id]/route.test.ts` 的 `createRequest()` 中仍有 `as any`（`NextRequest` init 的 body 构造），该文件由他人新写且本次任务只授权修 TS2538；**该 `as any` 是原文件既有内容，非本次引入**，未做改动以免越界。

---

## 5. 结论

**Yes** — TS2538 全部消除（`npx tsc --noEmit` exit 0），指定 4 个文件的 eslint unused-vars 已清理（0 error），目标测试 8/8 全绿。
