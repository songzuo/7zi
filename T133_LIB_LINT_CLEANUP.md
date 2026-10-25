# T133 — workflow 库层 ESLint warning 清理报告

- **任务编号**：T133
- **执行者**：⚡ Executor（子代理）
- **日期**：2026-10-25
- **范围**：`src/lib/workflow/executors/`、`src/lib/workflow/monitoring/`（仅发布树根 `src/`）

---

## 1. 根因

1. **`@typescript-eslint/no-unused-vars`（9 条）**
   - `context` 对象的**整体解构**把不需要的字段也解了出来。`ExecutionContext` 定义了 `instanceId / workflowId / node / variables / inputs / outputs / logs`，但各方法只用到其中一两个，多余解构出来的绑定即为未使用变量。
   - 未使用的 **import 符号**：`WorkflowExecutionStatus`（两个文件）、`NodeStatus`（index.ts）——这些类型在模块内从未被引用，属于历史遗留的复制粘贴残留。
   - **未使用的 catch 形参**：`catch (error)` 但函数体直接 `return false`，`error` 从未被读取。

2. **`@typescript-eslint/ban-ts-comment`（1 条）**
   - `loop-executor.ts` 原有 `// @ts-ignore`：该指令在当前类型定义下**已无必要**（`node.loopConfig` 的类型是 `LoopConfig | undefined`，`as LoopConfig` 断言本身合法，tsc 并不报错），而 `@ts-ignore` 在「后续行无错误」时会残留为无效抑制。

3. **关于任务书中的「约 51 条 warning」**
   - 实测基线为 **12 条 warning / 0 error**（详见 §3）。差异应为上一轮 T130 已顺带清理了部分文件，或基线统计口径包含其他目录/规则。本报告以**实测数字**为准。

---

## 2. 逐文件改动清单

共修改 **5 个文件**，净删除 5 行、无新增逻辑行。

| 文件 | 改动 | 行数 |
|---|---|---|
| `src/lib/workflow/executors/condition-executor.ts` | `catch (error)` → `catch (_error)`（`_` 前缀符合 eslint `allowed unused vars must match /^_/u` 规则；catch 体仍直接 `return false`，运行时语义不变） | 1 行 |
| `src/lib/workflow/executors/loop-executor.ts` (a) | `const { node, inputs, variables, instanceId } = context` → `const { node, instanceId } = context`（`inputs`/`variables` 在 `execute()` 内未使用；`node`/`instanceId` 仍用于 `addLog` / `stateKey` / catch 分支） | 1 行 |
| `src/lib/workflow/executors/loop-executor.ts` (b) | **删除** `// @ts-ignore - LoopConfig from types/workflow uses loopType` 注释行 | 1 行 |
| `src/lib/workflow/executors/loop-executor.ts` (c) | `executeLoop()` 中整行 `const { inputs, variables, instanceId } = context` 删除（该方法只透传 `context` 本身，不使用这三个字段） | 1 行 |
| `src/lib/workflow/executors/loop-executor.ts` (d) | `executeWhileLoop()` 中 `const { inputs, variables, instanceId, node } = context` → `const { inputs, variables } = context`（`instanceId`/`node` 未使用；`inputs`/`variables` 仍被 `evaluateCondition` 使用） | 1 行 |
| `src/lib/workflow/monitoring/AlertManager.ts` | 从 `./types` 的 import 列表中移除未使用的 `WorkflowExecutionStatus` | 1 行 |
| `src/lib/workflow/monitoring/MetricsCollector.ts` | 从 `./types` 的 import 列表中移除未使用的 `WorkflowExecutionStatus` | 1 行 |
| `src/lib/workflow/monitoring/index.ts` | 删除整行 `import { NodeStatus } from '@/types/workflow'`（模块内未使用该符号） | 1 行 |

### 关于 `loop-executor.ts:151` 的 `@ts-ignore` 处理说明

任务书允许「改成 `@ts-expect-error`（前提是 tsc 仍通过）」。实测：

- 换成 `@ts-expect-error` → `tsc` 报 `error TS2578: Unused '@ts-expect-error' directive.`，**exit 2**，不可接受。
- 原因：`node.loopConfig` 声明为 `LoopConfig | undefined`（`src/types/workflow.ts:207`），`node.loopConfig as LoopConfig` 是**合法的类型断言**，本身不产生类型错误，因此任何抑制指令都是多余的。
- 因此**彻底删除该注释行**是唯一能同时满足「eslint 0 warning」+「tsc exit 0」的方案。运行时语义完全不变：`as LoopConfig` 断言与原代码逐字一致（仅注释行被删），V8/TS 编译产物无任何差异。

### 明确未触碰

- `src/app/**`、`src/lib/workflow/scheduler.ts`、`src/lib/workflow/triggers.ts`、`src/lib/workflow/monitoring/types.ts` —— 全部未修改。
- `7zi-frontend/` 旧副本树 —— 未修改。
- vitest 配置 / tsconfig / package.json —— 未修改；未新增任何依赖。
- 未使用 `as any`、`@ts-ignore`、`eslint-disable`、未删改任何断言。
- 未执行 `git add` / `commit` / `push` / `rm --cached`，未做远端部署或历史重写。

---

## 3. 验证命令与真实输出

### 3.1 ESLint 基线（修复前）

```
$ npx eslint src/lib/workflow/executors src/lib/workflow/monitoring
/root/.openclaw/workspace/src/lib/workflow/executors/condition-executor.ts
  139:14  warning  'error' is defined but never used. ...  @typescript-eslint/no-unused-vars

/root/.openclaw/workspace/src/lib/workflow/executors/loop-executor.ts
  150:19  warning  'inputs' is assigned a value but never used. ...
  150:27  warning  'variables' is assigned a value but never used. ...
  151:5   warning  Use "@ts-expect-error" instead of "@ts-ignore" ...  @typescript-eslint/ban-ts-comment
  227:13  warning  'inputs' is assigned a value but never used. ...
  227:21  warning  'variables' is assigned a value but never used. ...
  227:32  warning  'instanceId' is assigned a value but never used. ...
  271:32  warning  'instanceId' is assigned a value but never used. ...
  271:44  warning  'node' is assigned a value but never used. ...

/root/.openclaw/workspace/src/lib/workflow/monitoring/AlertManager.ts
  11:3  warning  'WorkflowExecutionStatus' is defined but never used. ...
/root/.openclaw/workspace/src/lib/workflow/monitoring/MetricsCollector.ts
  9:3  warning  'WorkflowExecutionStatus' is defined but never used. ...
/root/.openclaw/workspace/src/lib/workflow/monitoring/index.ts
  10:10  warning  'NodeStatus' is defined but never used. ...

✖ 12 problems (0 errors, 12 warnings)
```

### 3.2 ESLint 修复后

```
$ npx eslint src/lib/workflow/executors src/lib/workflow/monitoring
ESLINT_EXIT=0
```
（无任何输出 → 0 error / 0 warning）

### 3.3 TypeScript 类型检查

```
$ npx tsc --noEmit
TSC_EXIT=0
```
（无任何输出 → exit 0，与 T130 交付状态保持一致，未回退）

### 3.4 相关单元测试回归（monitoring 目录现有测试）

```
$ npx vitest run src/lib/workflow/monitoring
 ✓ src/lib/workflow/monitoring/__tests__/StepRecorder.test.ts (17 tests)
 ✓ src/lib/workflow/monitoring/__tests__/ExecutionTracker.test.ts (25 tests)
 ✓ src/lib/workflow/monitoring/__tests__/monitoring.test.ts (21 tests)

 Test Files  3 passed (3)
      Tests  63 passed (63)
```
（vitest 退出码 0；`executors/` 目录下当前无对应测试文件，故无额外回归用例）

### 3.5 汇总对比

| 指标 | 修复前 | 修复后 |
|---|---|---|
| ESLint problems | **12** (0 error, 12 warning) | **0** (0 error, 0 warning) |
| `npx tsc --noEmit` exit code | 0 | **0** |
| 修改文件数 | — | **5** |
| `monitoring` 测试 | — | 63/63 passed |

---

## 4. 遗留问题

1. **任务书基线数字不符**：任务书称约 51 条 warning，实测基线为 12 条。本任务仅覆盖 `executors/` + `monitoring/` 两目录；若 51 条来自更广范围（如 `src/app/**`、`src/lib/workflow/*.ts` 顶层），那些目录本轮被明确锁定（硬约束 4），未做处理。
2. **`@ts-ignore` 的语义核对已完成**，但需提醒后续轮次：`loop-executor.ts` 中本地 `LoopConfig`（第 11 行，loopType 为 `'while' | 'doWhile' | 'for' | 'foreach'`）与 `src/types/workflow.ts` 的 `LoopConfig`（第 51 行，loopType 为 `'fixed' | 'conditional' | 'foreach'`）是**同名但不同构**的两个类型，靠断言桥接。这属于既存设计债，本轮未做类型统一（超出授权范围，且会牵动 `monitoring/types.ts` 等锁定文件）。
3. **`executors/` 目录无单元测试**，本次改动的运行时正确性主要由「纯解构删除 + catch 形参改名」的结构性论证 + tsc/eslint 通过来保证，未能由测试直接覆盖。

---

## 5. 结论

**Yes** —— 目标达成。

- ESLint warning：**12 → 0**（0 error）
- `npx tsc --noEmit`：**exit 0**（未回退）
- 相关测试：63/63 通过
- 所有改动严格限定在 `src/lib/workflow/executors/` 与 `src/lib/workflow/monitoring/` 内，共 5 个文件
- 未提交（交由主管统一提交）
