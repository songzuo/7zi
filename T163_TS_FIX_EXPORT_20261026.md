# T163b — TypeScript 错误修复报告（src/lib/export + src/components/fallbacks）

日期：2026-10-26
范围：`src/lib/export/**`、`src/components/fallbacks/**`（仅此二者）

---

## 一、根因分析

### 1. `src/components/fallbacks/AsyncBoundary.tsx`（7 个错误）
- **TS2304 `Cannot find name 'useRef'`**：react 导入行缺少 `useRef`。
- **TS2451 重复声明**：`executeRef` 在 `AsyncBoundary` 组件内被声明了两次（约 108/112 行）。
- **TS2304 `Cannot find name 'executeRef'`（299/306/326 行）**：`AsyncBoundaryFn` 组件内部使用了 `executeRef.current()`（自动重试定时器 + mount effect），但该组件从未声明 `executeRef`。

### 2. `src/lib/export/service/export-service.ts`（8 个错误）
- **TS2322（298 行）方差问题**：`ExportRequest<T>` 中的 `ExportField<T>.formatter: (value: T[keyof T], row: T) => string` 让类型参数 `T` **双向（不变）使用**，因此 `ExportRequest<T>` 不能赋值给 `ExportRequest<unknown>`，而 `ExportJob.request` 被写死为 `ExportRequest<unknown>`。
- **TS1205 / TS2484（553、557 行）**：`export { ExportServiceConfig, ExportRequest, ExportResponse }` 与声明处的 `export interface` 冲突；且 `isolatedModules` 开启时值导出语句再导出类型会报错。同理 `export type { ExportJobQueryResult }` 与本文件的 `export interface ExportJobQueryResult` 冲突。

### 3. `src/lib/export/queue/export-queue.ts`（3 个错误）
- **TS2345 × 3（357/368/378 行）**：`bull-stub.ts` 中 `BullEventHandler = (event: string, job: Job<unknown>) => void`，但导出队列按 Bull 真实语义注册的是 `(job)` / `(job, error)` / `(job, progress)` 三种签名，签名不匹配。

---

## 二、改动文件与行数

| 文件 | +/- | 说明 |
|---|---|---|
| `src/components/fallbacks/AsyncBoundary.tsx` | +25 / -6 | 补 `useRef` 导入；删除 `AsyncBoundary` 内重复的 `executeRef` 声明；在 `AsyncBoundaryFn` 内 `const execute` 之前补 `const executeRef = useRef<() => Promise<void>>(() => Promise.resolve())` |
| `src/lib/export/queue/export-queue.ts` | +31 / -18 | `ExportJob<T>` 泛型化（默认 `Record<string, unknown>`）；`ExportQueue<T>` 泛型化（`jobStore`、`submitJob`、`getJob`、`queryJobs`、`processExportJob`、`buildJobFromBullJob`、`getPriority` 全部跟随泛型）；新增 `isExportJobProgress()` 类型守卫；三个事件处理器改为 `(event, job, extra?)` 签名以匹配 `BullEventHandler` |
| `src/lib/export/service/export-service.ts` | +7 / -9 | `ExportJobQueryResult<T>` 泛型化；`private queue?: ExportQueue<T>`；`new ExportQueue<T>(...)`；`const job: ExportJob<T>`；`queryJobs(): Promise<ExportJobQueryResult<T>>`；删除与声明冲突的 `export { ExportServiceConfig, ExportRequest, ExportResponse }` 冗余再导出（类型已在声明处 export），保留 `export type { ExportJobStatus, ExportJobProgress }` |
| `src/lib/export/queue/bull-stub.ts` | +1 / -1 | `BullEventHandler` 增加可选第三参 `extra?: unknown`，以兼容 Bull 的 error / progress 事件负载 |
| `src/lib/export/utils/filter-parser.ts` | +0 / -1 | 移除 `@ts-nocheck`（早前任务遗留的未提交改动，非本次引入） |
| `src/lib/export/progress/export-progress.ts` | +0 / -1 | 同上 |

补充：`ExportJob` 新增必填字段 `expiresAt` 未被 `submitExportJob` 构造对象满足 → 已在构造时补 `expiresAt: this.getExpirationTime()`（与 `getStatusMessage` 之外的过期时间语义一致，对外响应结构不变）。

**约束遵守**：未新增 `as any` / `@ts-ignore` / `@ts-expect-error` / `eslint-disable` / `@ts-nocheck`；未改 tsconfig / eslint / vitest 配置；未新增依赖；未执行任何 git 写操作（add/commit/push 均未执行）。类型参数一律使用 `Record<string, unknown>` 默认值，未使用 `any`。

---

## 三、验证（真实输出）

### 1. 目标范围错误数
```
$ npx tsc --noEmit 2>&1 | grep -cE "src/lib/export|AsyncBoundary"
0
```
✅ 达标（原 18 个 → 0）

### 2. 全仓 TS 错误总数
```
$ npx tsc --noEmit 2>&1 | grep -cE "error TS"
1
```
✅ 达标（调度前基线 39 → 1，≤ 39）

唯一剩余错误（**不在本任务范围内**，属 `src/app/api/workflow/**`，由其他并发任务改动引起）：
```
src/app/api/workflow/[id]/stream/route.ts(51,9): error TS1109: Expression expected.
```

### 3. ESLint
```
$ npx eslint src/lib/export src/components/fallbacks
✖ 16 problems (0 errors, 16 warnings)
```
✅ **0 errors**，无新增 error。16 个 warning 全部为既有告警（`no-unused-vars` 未使用变量、`import/no-anonymous-default-export`、`Unused eslint-disable directive`），非本次引入。

### 4. Vitest
```
$ npx vitest run src/lib/export
 ❯ src/lib/export/__tests__/export.test.ts (0 test)
 ✓ src/lib/export/__tests__/batch-exporter.test.ts (15 tests) 558ms
 ✓ src/lib/export/__tests__/pdf-exporter.test.ts (16 tests) 460ms
 ✓ src/lib/export/__tests__/html-exporter.test.ts (20 tests) 232ms
 FAIL src/lib/export/__tests__/export.test.ts
 TypeError: booleanFormatter is not a function
   at src/lib/export/__tests__/export.test.ts:83:44

 Test Files  1 failed | 3 passed (4)
      Tests  51 passed (51)
```
⚠️ 3/4 文件通过，51 个测试全绿。失败文件 `export.test.ts` 在**模块加载阶段**即抛错：它从 `../index` 导入 `booleanFormatter`、`dateFormatter`、`arrayFormatter` 等一批 formatter 工具函数，但 `src/lib/export/core/exporter.ts` 与 `src/lib/export/index.ts` 中**从不存在**这些导出（`git show HEAD` 校验 HEAD 版本同样为 0 命中）。即该测试文件是**先于本任务的既有失败**，与本次改动无关（本任务未触碰 `core/exporter.ts` 与 `index.ts` 的导出面）。
该文件首行带有 `// @ts-nocheck - Test file with complex type issues`，说明其类型问题被长期忽略。

---

## 四、遗留事项

1. **`src/lib/export/__tests__/export.test.ts` 既有失败**：缺失 `booleanFormatter` / `dateFormatter` / `arrayFormatter` / `truncateFormatter` / `numberFormatter` / `currencyFormatter` / `percentFormatter` / `enumFormatter` / `jsonFormatter` / `linkFormatter` / `conditionalFormatter` / `createFields` / `createEnhancedFields` / `getFieldsByGroup` / `registerTemplate` 等导出。需要单独任务决定：补实现（进 `core/exporter.ts`）还是改测试（当前测试文件在 `src/lib/export/**` 范围内，但改动会触及导出公共 API 面，需另开任务评估语义）。**未在本任务处理**，避免超出"不改导出功能语义与对外响应结构"的约束。
2. **`src/app/api/workflow/[id]/stream/route.ts(51,9) TS1109`**：不在本任务范围内，未处理。
3. **`src/lib/export/utils/filter-parser.ts` 与 `progress/export-progress.ts` 的 `@ts-nocheck` 移除**：这两个文件在本次会话开始前（05:22）已被改动，git 中处于未提交状态。本任务沿用其现状，未回退。

---

## 五、结论

**Yes** —— 本任务范围内的 18 个 TypeScript 错误全部清零：`src/lib/export/**` 与 `src/components/fallbacks/AsyncBoundary.tsx` 在 `tsc --noEmit` 下零错误，全仓总错误从基线 39 降至 1（剩余 1 个属 `src/app/api/workflow/**`，不在本任务范围）。ESLint 0 error，导出模块 3/4 测试文件通过、51 个用例全绿，唯一失败文件为改动前既有的缺失 formatter 导出问题，不涉及本次改动面。
