# T183 · ESLint 清理报告 — `src/lib/performance/**` + `src/lib/rate-limiting-gateway/**`

- **日期**: 2026-10-26
- **角色**: 代码质量工程师 T183
- **范围**: 仅 `src/lib/performance/**`、`src/lib/rate-limiting-gateway/**`（14 个文件）
- **原则**: 只做机械式、零运行时行为变更的清理；不改 API 契约 / 状态码 / 缓存键 / TTL / 监控指标字段

---

## 1. Warning 数对比

| 范围 | 修复前 | 修复后 | 降幅 |
|---|---|---|---|
| `src/lib/performance` | 15 | **0** | -100% |
| `src/lib/rate-limiting-gateway` | 15 | **0** | -100% |
| **两目录合计** | **30** | **0** | **-30 (-100%)** |
| 全仓 `npx eslint src`（参考） | 399（HEAD 基线） | 331 | -68（含其它并行任务的改动） |

修复前实测（HEAD 基线副本 `/tmp/t183-base2`）：

```
✖ 30 problems (0 errors, 30 warnings)
```

修复后实测：

```
$ npx eslint src/lib/performance src/lib/rate-limiting-gateway
exit=0        # 无任何输出 = 0 error 0 warning
```

---

## 2. 改动清单（带行数）

### 2.1 `src/lib/performance/**`（8 文件 / 15 warning）

| 文件 | 行 | 原代码 | 新代码 | 处理方式 |
|---|---|---|---|---|
| `alerting/escalation-policy.ts` | 741 | `step: EscalationStep` | `_step: EscalationStep` | 未使用形参 → 前缀 `_`（eslint `argsIgnorePattern: '^_'`） |
| `alerting/escalation-policy.ts` | 755 | `step: EscalationStep` | `_step: EscalationStep` | 同上 |
| `alerting/escalation-policy.ts` | 769 | `step: EscalationStep` | `_step: EscalationStep` | 同上 |
| `budget-control/budget-config.ts` | 290 | `const existing = mergedBudgets[existingIndex]` | （删除该行） | 纯读取、赋值后从未使用；下方 `mergedBudgets[existingIndex] = {...}` 本就重新赋值，删除不改变逻辑 |
| `budget-control/budget-config.ts` | 372 | `const config = await this.loadConfig()` | `await this.loadConfig()` | 保留 `await` 调用（`loadConfig()` 有副作用：读文件 + 写缓存），只去掉未使用的绑定 |
| `root-cause-analysis/analyzer.ts` | 221 | `criticalPath: CriticalPathNode[]` | `_criticalPath: CriticalPathNode[]` | 未使用形参 |
| `root-cause-analysis/analyzer.ts` | 593 | `apiAnalysis: APIAnalysis` | `_apiAnalysis: APIAnalysis` | 未使用形参 |
| `root-cause-analysis/analyzer.ts` | 887 | `hotPaths: HotPath[]` | `_hotPaths: HotPath[]` | 未使用形参 |
| `root-cause-analysis/api-tracker.ts` | 177 | `const slowRequests = requests.filter(...)` | （删除该行） | 局部变量赋值后从未被读取（`analyze()` 里的 `slowRequests` 是另一处同名变量，仍在用） |
| `root-cause-analysis/api-tracker.ts` | 473 | `const avgDuration = requests.reduce(...)/requests.length` | （删除该行） | `getIssueDescription()` 内计算后从未使用（`calculateImpact()` 中同名变量仍在用，未动） |
| `root-cause-analysis/call-chain-tracer.ts` | 431 | `summary: CallChainSummary` | `_summary: CallChainSummary` | 未使用形参 |
| `root-cause-analysis/correlation-engine.ts` | 450 | `key: keyof EventContext` | `_key: keyof EventContext` | 未使用形参 |
| `root-cause-analysis/correlation-engine.ts` | 680 | `primary: Correlation` | `_primary: Correlation` | 未使用形参 |
| `root-cause-analysis/index.ts` | 245 | `(anomaly: AnomalyDetectionEvent) =>` | `(_anomaly: AnomalyDetectionEvent) =>` | 回调形参未使用 |
| `root-cause-analysis/rendering-tracker.ts` | 553 | `metrics: RenderingMetrics[]` | `_metrics: RenderingMetrics[]` | 未使用形参 |

### 2.2 `src/lib/rate-limiting-gateway/**`（6 文件 / 15 warning）

| 文件 | 行 | 原代码 | 新代码 | 处理方式 |
|---|---|---|---|---|
| `algorithms/sliding-window.ts` | 14-15 | `import type { ..., StorageBackend }` | 移除 `StorageBackend` | 未使用的类型导入；`StorageBackend` 仍从 `../types` 正常导出，公共 API 不变 |
| `algorithms/token-bucket.ts` | 14-15 | `import type { ..., StorageBackend }` | 移除 `StorageBackend` | 同上 |
| `algorithms/token-bucket.ts` | 270 | `const newTokens = Math.min(maxCapacity, state.tokens + tokensToAdd)` | （删除该行） | 局部变量赋值后未使用；真正写入存储由下方 Lua 脚本 `addTokensLua` 完成，删除不改变行为 |
| `api/management.ts` | 9 | `import type { Request, Response, RequestHandler } from 'express'` | `import type { RequestHandler } from 'express'` | 未使用的类型导入 |
| `api/management.ts` | 47 | `const { storage, middleware, apiKey, readOnly = false } = config` | `const { storage, middleware: _middleware, apiKey, readOnly = false } = config` | `middleware` 解构后未使用；改名为 `_middleware` 保留解构本身（不改变 config 读取行为） |
| `api/management.ts` | 49 | `const slidingWindow = new SlidingWindow(storage)` | `const _slidingWindow = new SlidingWindow(storage)` | 保留对象实例化（`SlidingWindow` 构造有成员初始化），仅改名为 `_` 前缀 |
| `index.ts` | 114 | `import type { IStorageAdapter, MultiLayerRateLimitConfig, RateLimitContext }` | 移除 `RateLimitContext` | 未使用的类型导入（该类型在文件顶部 `export { ... } from './types'` 中仍对外导出） |
| `index.ts` | 115 | `import { RedisAdapter, createRedisAdapterFromEnv }` | `import { RedisAdapter }` | 未使用的导入；`createRedisAdapterFromEnv` 仍通过顶部 re-export 对外暴露 |
| `index.ts` | 117 | `import { MultiLayerMiddleware, DEFAULT_CONFIG }` | `import { MultiLayerMiddleware }` | 同上；`DEFAULT_CONFIG` 仍经顶部 re-export 暴露 |
| `index.ts` | 362 | `export default { ... }` | `const rateLimitingGateway = { ... }` + 末尾 `export default rateLimitingGateway` | 修 `import/no-anonymous-default-export`；导出对象内容与顺序完全一致，默认导出仍是同一个具名对象 |
| `middleware/express.ts` | 10 | `import { MultiLayerMiddleware, extractContext }` | `import { MultiLayerMiddleware }` | 未使用的导入；`extractContext` 仍从 `middleware/multi-layer` 正常导出 |
| `middleware/multi-layer.ts` | 16-18 | `import type { ..., TokenBucketConfig, SlidingWindowConfig }` | 移除两者 | 未使用的类型导入 |
| `middleware/multi-layer.ts` | 192 | `private async checkGlobal(context: RateLimitContext)` | `private async checkGlobal(_context: RateLimitContext)` | 未使用形参（该层用固定 key `'global'`，不看 context） |

**改动统计**：`14 files changed, 26 insertions(+), 34 deletions(-)`

---

## 3. 刻意保留项及原因

本轮 30 条 warning 全部属于「安全机械可修」类别，**无一条需要通过改行为来消除**，因此没有 `no-explicit-any` 类必须保留的项。以下是需要留意的「刻意保留」：

| 项 | 原因 |
|---|---|
| `budget-control/budget-config.ts:371` 保留 `await this.loadConfig()`（而非直接删掉整行） | `loadConfig()` 有副作用（读 `/budget.json`、写 `cachedConfig` / `cacheExpiresAt`）。若整行删除会改变缓存预热行为 → 只去掉未使用的变量绑定，保留 await 调用。 |
| `api/management.ts:47,49` 保留解构与 `new SlidingWindow(storage)` 实例化，仅改名为 `_` 前缀 | 删除 `new SlidingWindow(...)` 会移除一次构造调用（虽有构造函数只做成员赋值，但属于可观察的调用次数变化），改名是零行为差异的最小改动。 |
| `algorithms/token-bucket.ts:270` 删除 `newTokens` 而不改用 | 该 `newTokens` 是死代码（真正生效的是 Lua 脚本内的同名局部变量）；若保留并"顺手使用"反而会改变 `addTokens()` 的返回值语义（当前返回 Lua 的 `result`）。 |
| `root-cause-analysis/api-tracker.ts:148` 的 `slowRequests` 保留 | 该变量在 `analyze()` 返回对象中被使用，是对外数据结构的一部分；只删除 `calculateStatistics()` 内部那个同名死变量。 |
| `root-cause-analysis/api-tracker.ts:492` 的 `avgDuration` 保留 | `calculateImpact()` 中该变量参与 `'slow-response'` / `'timeout'` 文案输出，属对外可观测文案，不可删。 |
| `rate-limiting-gateway/index.ts` 顶部 re-export 全部保留 | `RateLimitContext` / `createRedisAdapterFromEnv` / `DEFAULT_CONFIG` / `extractContext` 等虽是本文件内部未使用，但它们是**公共 API 出口**（`export { ... } from ...`），删除会破坏对外契约。仅清理了文件内重复的 `import` 语句。 |
| `root-cause-analysis/*` 中多个"形参在注释里被提及但代码未用"（如 `criticalPath`、`hotPaths`、`primary`、`summary`） | 只重命名形参（`_` 前缀），**没有删除形参本身**——形参位置是接口签名的一部分，删除会改变函数 `length` 与调用契约。 |
| `correlation-engine.ts:680` `primary` 形参 | 同上；该函数注释写着"Use primary correlation's hypothesis"，与实际实现不符，属**潜在逻辑缺陷**而非 lint 问题，修它属于改行为，超出本轮范围 → 已在「遗留」中标注，建议另开任务。 |

**未使用任何抑制手段**：`eslint-disable` / `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` / `as any` 均未出现（已用 grep 校验，见下）。

```
$ git diff src/lib/performance src/lib/rate-limiting-gateway | grep -E "^\+" \
    | grep -E "eslint-disable|as any|@ts-ignore|@ts-expect-error|@ts-nocheck"
NONE (good)
```

---

## 4. 验证（真实输出）

### 4.1 目标目录 lint

```
$ npx eslint src/lib/performance src/lib/rate-limiting-gateway
exit=0
```
（无输出 = 0 error / 0 warning；修复前同命令输出 `✖ 30 problems (0 errors, 30 warnings)`）

### 4.2 全仓 lint 仍 0 error

```
$ npx eslint src --quiet
exit=0
```

### 4.3 全仓 lint warning 总数

```
$ npx eslint src
✖ 331 problems (0 errors, 331 warnings)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```
HEAD 基线（`/tmp/t183-base2`，同一 node_modules）：`✖ 399 problems (0 errors, 399 warnings)`

### 4.4 TypeScript 编译

```
$ npx tsc --noEmit
src/app/api/a2a/registry/[id]/route.ts(24,56): error TS2304: Cannot find name 'context'.
src/app/api/a2a/registry/[id]/route.ts(48,56): error TS2304: Cannot find name 'context'.
src/app/api/a2a/registry/[id]/route.ts(94,59): error TS2304: Cannot find name 'context'.
src/app/api/a2a/registry/[id]/route.ts(121,58): error TS2304: Cannot find name 'context'.
```
（同一时刻 `src/test/vi-mocks.ts` 的 error 已被其它并行任务修掉；本轮实测 4 个 error）

**对比 HEAD 基线**（`/tmp/t183-base2`，`git archive HEAD` 干净副本）：
```
src/app/api/a2a/registry/[id]/route.ts(24,56): error TS2304: Cannot find name 'context'.
src/app/api/a2a/registry/[id]/route.ts(48,56): error TS2304: Cannot find name 'context'.
src/app/api/a2a/registry/[id]/route.ts(94,59): error TS2304: Cannot find name 'context'.
src/app/api/a2a/registry/[id]/route.ts(121,58): error TS2304: Cannot find name 'context'.
src/test/vi-mocks.ts(854,3): error TS2322: ... (已被并行任务修复)
```
→ 剩余 4 个 error 全部位于 `src/app/api/a2a/registry/`（T179/T182 范围，HEAD 上已存在），**与本轮改动无关**。

**本轮两个目录内 error 数**：
```
$ npx tsc --noEmit 2>&1 | grep -E "src/lib/performance|rate-limiting-gateway"
NONE
```
→ **未引入任何新 error**。

### 4.5 相关单元测试（行为回归）

```
$ npx vitest run src/lib/rate-limiting-gateway
 Test Files  4 failed (4)
      Tests  29 failed | 39 passed (68)
```
**HEAD 基线同目录**（`/tmp/t183-base2`）：
```
 Test Files  4 failed (4)
      Tests  29 failed | 39 passed (68)
```
→ 失败数与通过数**完全一致**，29 条失败是**改动前既有**（根因：`MemoryAdapter.eval` 不支持 Lua 脚本、`extractContext` 的 userId 取值等，均为既有实现缺陷，与 lint 清理无关）。本轮未新增任何测试失败。

```
$ npx vitest run src/lib/performance/__tests__
 Test Files  1 passed (1)
      Tests  46 passed (46)
```

---

## 5. 遗留

1. **`rate-limiting-gateway` 既有测试失败 29 条（非本轮引入）**
   - `MemoryAdapter.eval` 抛 `Memory adapter does not support Lua scripts`，导致 `SlidingWindow` / `TokenBucket` 的 Lua 路径用例全挂 → 需要补 Memory 版 Lua 模拟或改用 `Memory*Algorithm` 类。
   - `extractContext()` 的 `userId` 取 `req.user?.id ?? req.user?.userId`，与测试期望的 header 提取不一致。
   - `MemoryAdapter.store` 在 `set()` 中为 `undefined`（类字段初始化与 `super`/子类构造交互问题）。
   → 建议另开 T18x 任务，本轮不越界（属行为/实现改动）。
2. **`correlation-engine.ts:680` `inferRootCause(correlations, primary)`** 注释声明用 `primary` 的 hypothesis，实际实现只用 `correlations` —— 疑似潜在逻辑缺陷，本轮仅按 lint 规则改形参名，**未改行为**。
3. **`analyzer.ts` / `rendering-tracker.ts` / `call-chain-tracer.ts`** 多个形参（`criticalPath` / `hotPaths` / `apiAnalysis` / `metrics` / `summary`）在函数体内完全未使用，可能存在「分析维度未接入」的逻辑缺口，同样超出 lint 范畴。
4. **全仓剩余 331 warning** 中，本目录已清零；其它密集区（`lib/api` 14、`lib/audit` 14、`workflows/nodes` 13、`lib/export` 12 等）由其它并行任务负责。

---

## 6. 约束遵守自查

| 约束 | 状态 |
|---|---|
| 只改 `src/lib/performance/**` + `src/lib/rate-limiting-gateway/**` | ✅ `git diff --stat` 仅 14 个目标文件 |
| 未改测试 / 配置 / tsconfig / eslint 配置 | ✅ |
| 无 `eslint-disable` / `as any` / `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` | ✅ grep 校验 NONE |
| 无 git add / commit / push / stash / checkout -- / restore | ✅ 仅用 `git archive` 导出只读基线副本到 `/tmp` |
| 未改对外契约（响应信封 / 状态码 / 缓存键 / TTL / 监控指标字段） | ✅ 全部 re-export、导出对象、返回值语义保持不变 |
| 未改 `HEARTBEAT.md` / `state/tasks.json` / `memory/*` | ✅ |
| 运行时行为不变 | ✅ 测试通过/失败数与基线完全一致 |

---

## 7. 结论

**Yes**

两个目标目录的 eslint warning 由 **30 → 0**（-100%），全部为机械式、零运行时行为变更的清理（未使用导入 / 变量 / 形参重命名 + 一处 anonymous default export 具名化）。`npx eslint src --quiet` 仍为 0 error；`npx tsc --noEmit` 在本轮两个目录内 **0 error**，未引入新 error（仓库剩余 4 个 error 属 T179/T182 范围且 HEAD 已存在）；相关 vitest 通过/失败数与 HEAD 基线**逐项一致**，无新增回归。
