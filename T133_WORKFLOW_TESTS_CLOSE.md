# T133 — 收口 T131 未完成的 workflow 失败用例修复

- 任务：T133（承接 T131 被中止的半成品）
- 执行：⚡ Executor
- 时间：2026-10-25 10:45 ~ 11:05 (Asia/Shanghai)
- 仓库根目录：`/root/.openclaw/workspace`

---

## 1. 四个缺陷的根因与修法

### 缺陷 1 — `src/app/api/workflow/[id]/run/route.ts`：**实现缺陷**（已修）

- **根因**：T131 在该文件新增了路径参数校验，第 26 行（POST）与第 128 行（GET）调用 `createValidationError('Workflow ID is required')`，但第 10 行的 import 只有 `createSuccessResponse, createErrorResponse` → `TS2304: Cannot find name 'createValidationError'`（`npx tsc --noEmit` exit=1，共 2 处）。
- **前置确认**：已读 `src/lib/api/error-handler.ts` —— `createValidationError(message, details?, locale?, requestId?)` 确实导出，签名 `Promise<NextResponse<ErrorResponse>>`，内部构造 `new ApiError(ErrorType.VALIDATION, message, 400, details)` → **status = 400**，与测试期望的 400 一致，用法无偏差。
- **修法**：第 10 行 import 补上 `createValidationError`：
  ```ts
  import { createSuccessResponse, createErrorResponse, createValidationError } from '@/lib/api/error-handler'
  ```
- **性质**：实现缺陷（漏 import），非测试问题。

### 缺陷 2 — `src/app/api/workflow/[id]/run/route.test.ts`：**测试契约过时**（已修）

- **根因**：用例 `should execute workflow and return execution id` 断言 `data.executionId` 有值、`data.success === true`。但实现返回 `createSuccessResponse({ instanceId, workflowId, status, message, metadata })`，响应体结构是 `{ success, data: { instanceId, ... }, timestamp }`；`API.md` 记录的契约同样是 `data.instanceId`。**实现是对的，是测试断言停留在旧契约**。
- **修法**（只改测试，未动实现）：
  ```ts
  expect(data.success).toBe(true)
  expect(data.data.instanceId).toBeDefined()
  expect(typeof data.data.instanceId).toBe('string')
  ```
  注：`expect(data.data.instanceId).toBeDefined()` 是**信封内字段**的存在性断言，配合 `typeof === 'string'` 精确表达契约，未用弱化断言替代精确值；核心契约点（`data.success === true`、字段位于 `data.data`）均为精确断言。
- **按要求保留**：文件顶部 `vi.mock('@/lib/workflow/executor', ...)` 是无效 mock（路由实际使用 `workflowEngine`），**保持原样**，未为迁就它改实现。

### 缺陷 3 — `src/app/api/workflow/[id]/executions/route.test.ts`：**测试契约过时**（已修）

- **根因**：`should return list of executions` 断言 `Array.isArray(data)` 为 true；但实现 `src/app/api/workflow/[id]/executions/route.ts` 返回 `NextResponse.json(result)`，`result` 来自 `workflowMonitoring.getExecutions()`（`src/lib/workflow/monitoring/ExecutionTracker.ts:171` 签名 → `{ executions: WorkflowExecution[]; total: number }`），是**对象而非裸数组**。裸数组断言还会丢掉 `total`。**实现是对的，测试断言过时**。
- **附带问题**：文件顶部 `vi.mock('@/lib/db', ...)` 是**无效 mock**（路由根本不 import db），所以原测试其实跑的是真实 `workflowMonitoring`（内存中无数据 → `{executions: [], total: 0}`），断言既弱又不确定。
- **修法**（只改测试，未动实现）：
  1. 把无效的 `vi.mock('@/lib/db', ...)` 换成 `vi.mock('@/lib/workflow/monitoring', ...)`，`workflowMonitoring.getExecutions` 返回确定 fixture：`{ executions: [exec-1, exec-2], total: 2 }`；
  2. 断言改为精确契约：
     ```ts
     expect(Array.isArray(data.executions)).toBe(true)
     expect(data.executions).toHaveLength(2)
     expect(data.executions[0].id).toBe('exec-1')
     expect(data.total).toBe(2)
     ```
- **按要求保持**：响应体仍为 raw `{executions,total}`，**未**改成 `createSuccessResponse` 信封（契约变更风险大，本轮不做 → 见"遗留问题"）。

### 缺陷 4 — `src/app/api/workflow/[id]/versions/__tests__/api.test.ts`：**验证通过，无需改动**

- 实现（T131 改动，已保留）：`src/app/api/workflow/[id]/versions/route.ts`
  - L31：`if (isNaN(limit) || limit < 1 || limit > 1000)` → 400
  - L35：`if (isNaN(offset) || offset < 0)` → 400
  - L42-45：`createSuccessResponse({ ...result, limit, offset })` → 回显分页参数
- 用例 `should support pagination parameters` 断言 `data.data.limit === 10`、`data.data.offset === 5` → **通过**。
- **冲突排查**：全量 workflow 测试跑完（`src/app/api/workflow` 11 个测试文件 / `src/app/api/__tests__/integration` 5 个测试文件），**没有任何用例因新增分页校验而挂**（不存在传 `limit=0` / `limit=2000` 期望 200 的用例）。因此 **未改动** `versions/route.ts` 与 `versions/__tests__/api.test.ts`。

---

## 2. 改动文件列表

| 文件 | +/- | 说明 |
| --- | --- | --- |
| `src/app/api/workflow/[id]/run/route.ts` | +1 / -1 | 第 10 行 import 补 `createValidationError`（实现缺陷） |
| `src/app/api/workflow/[id]/run/route.test.ts` | +2 / -1 | 断言改为信封契约 `data.success` / `data.data.instanceId` |
| `src/app/api/workflow/[id]/executions/route.test.ts` | +26 / -11 | 无效 `@/lib/db` mock → `@/lib/workflow/monitoring` mock + 确定性 fixture；断言改为 `{executions,total}` 契约 |

合计：**3 个文件，+29 / -13 行**。未触碰 `versions/route.ts`、`versions/__tests__/api.test.ts`、`executions/route.ts`。
（说明：本轮改动在任务期间被并发提交 `b610fc2105` 带入仓库历史，工作区与 HEAD 一致，`git status` 无残留差异；本代理**未执行** `git add` / `commit` / `push`。）

---

## 3. 验证命令与真实输出摘要

### 3.1 修复前基线（本地实测：把本轮 3 个文件回退到 T131 之前的版本重跑）

```
$ npx vitest run src/app/api/workflow
 Test Files  2 failed | 9 passed (11)
      Tests  3 failed | 63 passed (66)
 FAIL  src/app/api/workflow/[id]/run/route.test.ts > should execute workflow and return execution id
 FAIL  src/app/api/workflow/[id]/run/route.test.ts > should validate required workflow id
 FAIL  src/app/api/workflow/[id]/executions/route.test.ts > should return list of executions
```
（主管转述的 T131 中止时基线为 **4 failed / 159 passed**；本机实测同一批路径为 3 failed / 63 passed，差异源于并发新增的 `src/app/api/__tests__/integration/workflow-*.test.ts` 5 个文件共 113 个用例在基线时点数量不同，且 `run/route.test.ts` 的 TS2304 编译错误不计入 vitest 统计。）

### 3.2 `npx tsc --noEmit`

```
$ npx tsc --noEmit
TSC_EXIT=0        # 无任何输出，exit 0（修复前为 exit=1，2 处 TS2304）
```

### 3.3 `npx vitest run src/app/api/workflow`（修复后）

```
 Test Files  11 passed (11)
      Tests  66 passed (66)
```
逐文件：
```
✓ src/app/api/workflow/[id]/executions/route.test.ts (1 test)
✓ src/app/api/workflow/[id]/run/route.test.ts (2 tests)
✓ src/app/api/workflow/[id]/versions/__tests__/api.test.ts (15 tests)
✓ src/app/api/workflow/[id]/versions/[versionId]/rollback/route.test.ts (6 tests)
✓ src/app/api/workflow/[id]/versions/[versionId]/route.test.ts (5 tests)
✓ src/app/api/workflow/route.test.ts (8 tests)
✓ src/app/api/workflow/[id]/executions/[execId]/route.test.ts (4 tests)
✓ src/app/api/workflow/history/export/route.test.ts (5 tests)
✓ src/app/api/workflow/[id]/route.test.ts (8 tests)
✓ src/app/api/workflow/[id]/executions/[execId]/cancel/route.test.ts (7 tests)
✓ src/app/api/workflow/[id]/history/route.test.ts (5 tests)
```

### 3.4 含 workflow 集成用例的合并范围（复现"≥163 用例"口径）

```
$ npx vitest run src/app/api/workflow src/app/api/__tests__/integration
 Test Files  16 passed (16)
      Tests  188 passed (188)        # 末次运行；并发新增用例后总数上升，全程 0 failed、0 skipped
```
其中 `src/app/api/__tests__/integration`（workflow-execution-cancel 15 / workflow-run 20 / workflow-history 36 / workflow-execution-details 16 / workflow-executions 26 = 113）**全部通过**。
→ **0 failed、0 skipped，总用例数 ≥163 ✅**

### 3.5 `npx eslint src/app/api/workflow`

```
✖ 4 problems (0 errors, 4 warnings)
ESLINT_EXIT=0
```
4 条 warning 均为**既有**的未使用 import / `no-explicit-any`（`[id]/history/route.ts:13`、`[id]/route.ts:9,187`、`[id]/versions/route.ts:13`），**0 error**，且均不在本轮改动文件内。

---

## 4. 遗留问题（只记录，未擅自修改）

1. **`executions` 路由未使用 `createSuccessResponse` 信封**：`src/app/api/workflow/[id]/executions/route.ts` 直接 `NextResponse.json(result)`，返回 raw `{executions,total}`，与 `run` / `versions` 等其余 workflow 路由的 `{success, data, timestamp}` 信封**不一致**。改成信封属对外契约变更（会影响前端与 `src/app/api/__tests__/integration/workflow-executions.test.ts` 等调用方），本轮**不做**，建议单独立项并同步 API.md 与前端。
2. **分页校验可能影响旧调用方**：`versions` 路由新增 `limit ∈ [1,1000]`、`offset >= 0` 校验，越界现在返回 **400** 而非静默取默认。当前仓库内无调用方触发，但**外部/旧客户端**若传 `limit=0` 或 `limit>1000` 会被拒；需在 API.md 中补充错误码说明或做向后兼容。
3. **`src/lib/workflow/**` 存在与本轮无关的失败用例**：额外执行 `npx vitest run src/lib/workflow` 时为 **15 failed files / 88 failed / 622 passed (710)**。该目录属于其他子代理的受管路径（且当前有并发未提交改动：`executors/condition-executor.ts`、`executors/loop-executor.ts`、`monitoring/AlertManager.ts`、`monitoring/MetricsCollector.ts`、`monitoring/index.ts`），**本轮未做任何改动**，仅作提示。
4. **无效 mock 残留**：`run/route.test.ts` 顶部 `vi.mock('@/lib/workflow/executor', ...)` 对被测路由无效（路由用 `workflowEngine`），按要求保留原样；若后续要真正隔离执行副作用，应改为 mock `@/lib/workflow/engine`。
5. **并发提交风险**：本轮工作区改动被并发提交 `b610fc2105` 带入历史；后续若需按文件级归因，建议以该提交为基线做 diff。

---

## 5. 结论

**Yes** — 4 个缺陷全部收口：`tsc --noEmit` exit 0、workflow 范围 0 failed / 0 skipped（188 用例全绿）、eslint 0 error；实现只改了 1 行 import，测试契约对齐真实实现，未使用 skip / 弱化断言 / `as any` / `@ts-ignore`。
