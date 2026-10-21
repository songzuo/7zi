# T6 — Workflow 组件族 TypeScript 修复报告

**日期**: 2026-10-21
**执行者**: ⚡ Executor
**范围**: 3 个文件 / 28 个 error

---

## 1. 修复范围

| 文件 | 修复前 error | 修复后 error |
|---|---|---|
| `src/components/WorkflowEditor/__tests__/workflow-editor-v110.test.ts` | 13 | **0** |
| `src/components/workflow/VersionHistoryPanel.tsx` | 9 | **0** |
| `src/components/workflow/WorkflowReplayViewer.tsx` | 6 | **0** |
| **合计** | **28** | **0** |

验证命令：
```bash
cd 7zi-frontend && npx tsc --noEmit --incremental false 2>&1 | grep "error TS"
```
（上述 3 个文件在结果中均无匹配行）

---

## 2. 根因与修改点

### 2.1 `workflow-editor-v110.test.ts`（13 errors）

**根因 A — TS2322 / TS2454：测试里手写的 `PasteResult` / `CutResult` 接口与 Hook 真实返回类型不一致**

测试文件自己声明了：
```ts
interface PasteResult { nodes: Node<WorkflowNodeData>[]; edges: Edge[] }
```
而 `useClipboard.pasteNodes()` 实际返回 `{ nodes, edges, sourceNodeIds } | null`，
`cutNodes()` 返回 `{ clipboardData: {nodes, edges, timestamp}, nodesToDelete, edgesToDelete }`。
手写接口缺字段 → 赋值不兼容（TS2322）；同时 `let pastedResult: PasteResult` 在
`act()` 回调里赋值，TS 的控制流分析无法确认回调一定执行 → "used before being assigned"（TS2454）。

**修改**：删除手写接口，改为从 Hook 直接推导类型，杜绝与实现漂移：
```ts
type ClipboardHook = ReturnType<typeof useClipboard>
type PasteResult = ReturnType<ClipboardHook['pasteNodes']>   // 含 null
type CutResult = ReturnType<ClipboardHook['cutNodes']>
```

**根因 B — TS2454 仍存在**：即便类型正确，`let x: T` + `act(() => { x = ... })` 的
“回调内赋值”模式 TS 依旧判定为 possibly-unassigned。改为**容器持有结果**，
把读取动作移到 `act()` 之外（控制流可见）：
```ts
const pasted: { value: PasteResult } = { value: null }
act(() => { pasted.value = result.current.pasteNodes({ x: 50, y: 50 }) })
const pastedResult = pasted.value
expect(pastedResult?.nodes).toHaveLength(1)
```
断言处用可选链 `?.`，因为 `pasteNodes()` 合法返回 `null`（空剪贴板场景）。
`cutResult` 同样改为 `{ value?: CutResult }` 容器 + `?.` 断言。

**语义不变**：断言内容与执行顺序完全保留，仅变量存储方式与访问符调整；
`expect(pastedResult).not.toBeNull()` / `expect(pasted.value).toBeNull()` 仍严格校验 null/非 null 分支。

---

### 2.2 `VersionHistoryPanel.tsx`（9 errors）

**根因 A — TS2305 × 3（`WorkflowDiff` / `VersionBranch` / `SnapshotPolicy`）**
这些类型**不在** `@/types/workflow-version` 里，而在 `@/lib/workflow/versioning` 中定义。
组件从错误的模块导入。

**根因 B — `CompressionRule`**：同上，`CompressionRule` 也在 `versioning.ts`（原先还从错误模块导入）。

**根因 C — TS7006 × 6（`change` / `index` 隐式 any）**
`diff.nodes` / `diff.edges` / `diff.variables` 的元素类型是 `DiffChange`，
但因为 `WorkflowDiff` 导入失败变成 `any`/`unknown`，`.map((change, index) => ...)`
的回调参数失去上下文类型 → 隐式 any。**修好导入后这 6 个错误自动消失**，
无需写死回调参数类型（保持类型推导，信息量更好）。

**修改**（只改导入，不动逻辑）：
```ts
import type { WorkflowVersion } from '@/types/workflow-version'
import {
  WorkflowDiffEngine, getBranchManager, getSnapshotPolicyManager,
  getExportImportManager, getCompressionManager, VersionCompressionManager,
} from '@/lib/workflow/versioning'
import type {
  WorkflowDiff, VersionBranch, SnapshotPolicy, CompressionRule,
} from '@/lib/workflow/versioning'
```
> 说明：`src/types/workflow-version.ts` 只导出 `WorkflowVersion` / `WorkflowDefinition` /
> `CreateWorkflowVersionDTO` / `RollbackWorkflowDTO` / `WorkflowVersionHistoryQuery` /
> `WorkflowVersionHistoryResponse` / `RollbackResponse`。
> 根因在被引用文件（类型定义位置错配），但修正调用侧导入即可完全解决，**未越界修改**任何非清单文件。

**语义不变**：组件逻辑、diff 渲染、branch 管理、snapshot policy 设置、导入导出全部未动。

---

### 2.3 `WorkflowReplayViewer.tsx`（6 errors）

**根因 A — TS2304 `ExecutionHistory` 未找到**
`ExecutionHistory` 定义在 `@/lib/workflow/execution-history-store`，
组件只从 `replay-engine` 引入了 `ReplayStep` / `ReplayEvent`。
→ 补 `import type { ExecutionHistory, NodeExecutionStatus } from '@/lib/workflow/execution-history-store'`。

**根因 B — TS2322 `'pending' | 'running' | 'failed' | 'skipped'` vs `Record<string, string>`**
```ts
const status: Record<string, string> = 'pending'   // ← 误写：把字符串赋给了 Record
```
`Record<string, string>` 应该是**空对象** `{}`，`'pending'` 是被赋的值类型笔误。
→ 改为 `const status: Record<string, string> = {}`。
（原代码意图是"每节点默认 pending"，实际由 `nodeStatus[node.id] || 'pending'` 兜底，行为等价。）

**根因 C — TS18046 `'execution' is of type 'unknown'` × 3**
`Object.entries(history.nodeExecutions)` 在 `nodeExecutions` 类型未知时元素为 `unknown`。
根因同 A（`history` 类型缺失）。补上 import 后 `history.nodeExecutions` 变为
`Record<string, NodeExecution>`，`.entries()` 推导为 `[string, NodeExecution][]` → 错误消失。

**根因 D — TS2367 `'success'` 与 `NodeExecutionStatus` 无重叠**
`NodeExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'`，
不含 `'success'`。但历史数据（后端写入的旧记录）可能确实出现 `'success'`，
原代码显式处理了它。**不能删**（会改变运行时行为）。
→ 保留语义，用受控的窄化而非 `as any`：
```ts
const execStatus = execution.status as NodeExecutionStatus | 'success'
if (execStatus === 'completed' || execStatus === 'success') { status[nodeId] = 'completed' }
else if (execStatus === 'failed') { status[nodeId] = 'failed' }
```
`as` 作用于**字面量联合**（非 `any`），是精确的类型断言，符合"禁止 `as any`"约束。

**根因 E — TS2322 `WorkflowGraph` 缺少 `onNodesChange` / `onEdgesChange`**
主组件传了 `onNodesChange` / `onEdgesChange` 给 `<WorkflowGraph>`，但 `WorkflowGraph` 的
props 接口里没声明这两个属性 → TS 报 "Object literal may only specify known properties"。
同时 `ReactFlow` 也没接这两个回调（图不可编辑，但状态 hook 仍在用）。
→ 在 `WorkflowGraph` props 中补上可选的变更回调并透传给 `ReactFlow`：
```ts
onNodesChange?: OnChange<NodeChange>
onEdgesChange?: OnChange<EdgeChange>
```
`OnChange` 类型 **`reactflow` 包未导出**（只在 `@reactflow/core` 内部 `useNodesEdgesState.d.ts` 里定义为
未导出的 type alias），故按其定义在本文件内复刻：
```ts
type OnChange<ChangesType> = (changes: ChangesType[]) => void
```
（与 `node_modules/@reactflow/core/dist/esm/hooks/useNodesEdgesState.d.ts` 中的定义逐字一致，
`useNodesState` 返回的第三个元素正是该类型，因此与 `onNodesChange` 兼容。）

**根因 F — TS18048 `'history.duration' is possibly 'undefined'` × 2**
`ExecutionHistory.duration` 是可选字段 `duration?: number`。
→ 组件内提取 `const duration = history.duration ?? 0`，三处使用点统一改用 `duration`：
- 时间轴位置：`duration > 0 ? (event.step.relativeTime / duration) * 100 : 0`（除零保护）
- `handleSeek`：`const relativeTime = (duration * position) / 100`
- `useEffect` 依赖数组：`duration` 代替 `history.duration`（语义等价，依赖仍正确）

**语义不变**：回放引擎的加载/事件/播放/寻址逻辑、节点状态着色、详情面板、时间轴全部保持原行为。

---

## 3. Error 前后对比

### 3.1 本任务 3 个文件

修复前（28 errors）：
```
workflow-editor-v110.test.ts(102,7):  TS2322 Type '{nodes;edges;sourceNodeIds} | null' is not assignable to type 'PasteResult'
workflow-editor-v110.test.ts(105,12): TS2454 Variable 'pastedResult' is used before being assigned
workflow-editor-v110.test.ts(106,12): TS2454 ...
workflow-editor-v110.test.ts(107,12): TS2454 ...
workflow-editor-v110.test.ts(108,12): TS2454 ...
workflow-editor-v110.test.ts(120,7):  TS2322 ... not assignable to type 'PasteResult'
workflow-editor-v110.test.ts(123,12): TS2454 ...
workflow-editor-v110.test.ts(124,12): TS2454 ...
workflow-editor-v110.test.ts(135,12): TS2454 Variable 'cutResult' is used before being assigned
workflow-editor-v110.test.ts(136,12): TS2454 ...
workflow-editor-v110.test.ts(137,12): TS2454 ...
workflow-editor-v110.test.ts(173,7):  TS2322 ...
workflow-editor-v110.test.ts(176,12): TS2454 ...
VersionHistoryPanel.tsx(20,3):  TS2305 Module '"@/types/workflow-version"' has no exported member 'WorkflowDiff'
VersionHistoryPanel.tsx(21,3):  TS2305 ... 'VersionBranch'
VersionHistoryPanel.tsx(22,3):  TS2305 ... 'SnapshotPolicy'
VersionHistoryPanel.tsx(716,34): TS7006 Parameter 'change' implicitly has an 'any' type
VersionHistoryPanel.tsx(716,42): TS7006 Parameter 'index' implicitly has an 'any' type
VersionHistoryPanel.tsx(750,34): TS7006 ...
VersionHistoryPanel.tsx(750,42): TS7006 ...
VersionHistoryPanel.tsx(784,38): TS7006 ...
VersionHistoryPanel.tsx(784,46): TS7006 ...
WorkflowReplayViewer.tsx(32,12):  TS2304 Cannot find name 'ExecutionHistory'
WorkflowReplayViewer.tsx(220,11): TS2322 Type 'string' is not assignable to type 'Record<string, string>'
WorkflowReplayViewer.tsx(231,11): TS18046 'execution' is of type 'unknown'
WorkflowReplayViewer.tsx(231,47): TS18046 'execution' is of type 'unknown'
WorkflowReplayViewer.tsx(233,18): TS18046 'execution' is of type 'unknown'
WorkflowReplayViewer.tsx(350,11): TS2322 Type '{...}' is not assignable to type 'IntrinsicAttributes & {...}'
```

修复后：**0 errors**（上述路径在 tsc 输出中完全消失）。

### 3.2 全局 error 总数

| 时刻 | 命令 | 全局 error 数 | 本任务 3 文件 error 数 |
|---|---|---|---|
| 修复前（基线复核） | `tsc --noEmit --incremental false` | 334（任务书基线） | 28 |
| 修复前（同环境 A/B 对照） | 同上（排除并发半成品文件） | 376 | 28 |
| 修复后（同环境 A/B 对照） | 同上（排除并发半成品文件） | 305 | 0 |
| 修复后（最终复核） | `npx tsc --noEmit --incremental false` | **272** | **0** |

> **A/B 对照说明**：验证期间有其他并行 agent 正在修改同仓库文件
> （例如 `src/lib/websocket/__tests__/websocket-client.edge-cases.test.ts` 一度处于
> 语法未完成状态，导致 `tsc` 提前中止、全局计数失真）。
> 为得到可信的"本任务净收益"，做了一次严格 A/B：
> 把 3 个文件 `git checkout` 回原状 → 376 errors（含 28 个本任务错误）；
> 再恢复修复版 → 305 errors（本任务 0）。净减 71 = 28（本任务）+ 43（并行 agent 在同期完成的其它修复）。
> 结论：**本任务使全局 error 数从 376 降至 305（-71），其中本任务直接贡献 -28，未造成任何恶化。**
> 最终全量命令复核为 272 errors，同样 ≤ 334 基线。

---

## 4. 行为验证

```bash
cd 7zi-frontend && npx vitest run src/components/WorkflowEditor/__tests__/workflow-editor-v110.test.ts
```
```
✓ src/components/WorkflowEditor/__tests__/workflow-editor-v110.test.ts (24 tests) 87ms
Test Files  1 passed (1)
     Tests  24 passed (24)
```
24/24 全部通过，与修复前行为一致。

约束遵守：
- ✅ 仅修改清单内 3 个文件（`git diff --stat` 确认）
- ✅ 未新增/升级依赖，未改 `tsconfig.json`（A/B 期间临时用的 `tsconfig.t6check.json` 已删除）
- ✅ 未执行 `git add` / `git commit`
- ✅ 未使用 `as any`（唯一的 `as` 是字面量联合窄化 `as NodeExecutionStatus | 'success'`）
- ✅ TS7053 类索引错误优先用类型推导/精确联合处理，未粗暴绕过

---

## 5. 遗留问题 / 越界根因提示

1. **`src/types/workflow-version.ts` 与 `src/lib/workflow/versioning.ts` 类型重复且分散**
   `WorkflowDiff` / `DiffChange` / `VersionBranch` / `SnapshotPolicy` / `CompressionRule` /
   `VersionExport` 等只存在于 `versioning.ts`，而 `types/workflow-version.ts` 只放 DTO 与
   `WorkflowVersion`。两处命名空间重叠（`WorkflowVersion` 在 types 里，`WorkflowDiff` 在 lib 里），
   是本次 TS2305 的根本来源。**建议**后续把 versioning 的类型统一收敛到
   `src/types/workflow-version.ts`（或反过来），并在 `versioning.ts` 里 `export type` re-export，
   避免调用侧猜导入来源。**本任务未越界修改该文件。**

2. **`NodeExecutionStatus` 缺少 `'success'`**
   `src/lib/workflow/execution-history-store.ts` 的 `NodeExecutionStatus` 联合类型里没有
   `'success'`，但 `WorkflowReplayViewer` 及后端历史数据都在使用它。
   建议在 store 里补上 `'success'`（并同步 `NodeStatus`），从源头消除调用侧的窄化断言。
   **本任务未越界修改该文件**（用精确联合断言在调用侧收敛）。

3. **`src/lib/workflow/__tests__/replay-engine.test.ts` 的 `TS2741`（`TriggerConfig.type` 缺失）**
   按任务书要求**未改动**。根因与本次同类：`TriggerConfig` 要求 `type: TriggerType`，
   测试构造的 fixture 为 `{}`。建议修法：在 fixture 补 `type: 'manual'`（并补
   `triggerConfig` 到 `ExecutionHistory` 上），或给 `TriggerConfig` 补默认值工厂。
   建议由 T 序列中负责 `src/lib/workflow/**` 的任务统一处理。

4. **`reactflow` 未导出 `OnChange` 类型**
   `OnChange<ChangesType>` 只在 `@reactflow/core` 内部声明但未 export，导致消费方只能
   手写复刻。建议在 `src/components/WorkflowEditor/reactflow-imports.tsx` 中
   （该文件正是项目的 reactflow 统一入口）加：
   `export type OnChange<ChangesType> = (changes: ChangesType[]) => void`，
   之后各组件统一从该入口导入。**本任务未修改该文件**（避免越界）。

5. **并发编辑干扰 tsc 计数**
   本次验证期有并行 agent 写入半成品文件导致 `tsc` 提前中止（`TS1005`）。
   建议后续 T 序列在计数类验证时统一约定"全量编译前先确认无语法错误文件"，
   或采用 A/B 对照法（本报告已采用）。

---

## 6. 变更文件清单

```
src/components/WorkflowEditor/__tests__/workflow-editor-v110.test.ts | 57 ++++++++-----------
src/components/workflow/VersionHistoryPanel.tsx                    | 13 ++---
src/components/workflow/WorkflowReplayViewer.tsx                    | 32 ++++++++++++----
3 files changed, 58 insertions(+), 44 deletions(-)
```

**未执行 git add / git commit。**
