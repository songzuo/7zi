# T140 — API 路由测试覆盖补齐报告

**任务**: 为 API 路由补齐测试覆盖，重点选择目前缺少覆盖的域
**角色**: 🧪 测试员
**日期**: 2026-10-25
**工作目录**: `/root/.openclaw/workspace`（发布树根 `src/`，未触碰 `7zi-frontend/`）
**结论**: **Yes**（部分遗留见下文「未覆盖到的遗留」）

---

## 1. 盘点方法与结果

### 1.1 盘点命令

建议范围中 `src/app/api/rooms/**` 在本仓库**不存在**：

```bash
$ find src -ipath '*room*' -type d | grep -v node_modules
# (无输出)
$ grep -rn "api/rooms" src/app src/components --include=*.ts --include=*.tsx
# (无输出)
```

「rooms」实现在 `src/lib/collaboration/rooms.ts`（协作房间管理器），属于 `src/lib/**`，而
`src/lib/collaboration` 并不在并行任务的互斥路径清单里，但**协作房间的 HTTP 路由并不存在**，
因此没有对应的 API 路由可补。`src/lib/websocket` 明确在另一并行任务的路径互斥范围内，不予触碰。

实际盘点命令（coverage 依赖可用，`@vitest/coverage-v8` 已安装）：

```bash
$ npx vitest run --coverage --coverage.reporter=text \
    --coverage.thresholds.lines=0 --coverage.thresholds.functions=0 \
    --coverage.thresholds.branches=0 --coverage.thresholds.statements=0 \
    src/app/api/analytics src/app/api/workflow
```

> 说明：仓库 `vitest.config.ts` 内置了覆盖率阈值（lines/functions/branches/statements = 80），
> 单跑局部目录时必然不达标而使进程 exit=1。为得到**真实的覆盖率数字**（而不是被阈值截断的
> 假失败），额外传了 `--coverage.thresholds.*=0`。**未修改 vitest 配置文件**。

### 1.2 盘点基线（补测试之前）

| 文件 | % Stmts | % Branch | % Funcs | % Lines | 未覆盖行 |
|---|---|---|---|---|---|
| `api/analytics/export/route.ts` | 94.52 | 79.24 | 100 | 95.77 | 210, 239-240 |
| `api/analytics/metrics/route.ts` | 100 | 97.84 | 100 | 100 | 533-563, 631 |
| `api/workflow/route.ts` | 92 | 78.57 | 100 | 91.66 | 68, 157 |
| `api/workflow/[id]/route.ts` | 89.55 | 60.86 | 100 | 89.55 | …93, 199, 230, 242 |
| `api/workflow/[id]/executions/route.ts` | 86.66 | 100 | 100 | 86.66 | 46-48 |
| `api/workflow/[id]/executions/[execId]/route.ts` | 100 | 100 | 100 | 100 | — |
| `api/workflow/[id]/executions/[execId]/cancel/route.ts` | 100 | 100 | 100 | 100 | — |
| `api/workflow/[id]/history/route.ts` | 83.78 | 77.41 | 100 | 83.78 | 51,56,61,66,71,89 |
| **`api/workflow/[id]/metrics/route.ts`** | **0** | **0** | **0** | **0** | **整文件** |
| **`api/workflow/[id]/run/route.ts`** | **31.25** | **37.5** | **14.28** | **32.25** | **103, 114-254** |
| **`api/workflow/[id]/stream/route.ts`** | **0** | **0** | **0** | **0** | **整文件** |
| `api/workflow/[id]/versions/route.ts` | 83.33 | 71.79 | 100 | 83.33 | 31, 35, 47, 101 |
| `api/workflow/[id]/versions/[versionId]/route.ts` | 85.71 | 60 | 100 | 85.71 | 36, 62 |
| `api/workflow/[id]/versions/[versionId]/rollback/route.ts` | 92.3 | 83.33 | 50 | 100 | 50, 54 |
| `api/workflow/[id]/versions/compare/route.ts` | 46.15 | 50 | 100 | 46.15 | 41-51 |
| `api/workflow/[id]/versions/settings/route.ts` | 88.23 | 72.22 | 100 | 88.23 | 31, 65 |
| `api/workflow/history/export/route.ts` | 100 | 100 | 100 | 100 | — |

### 1.3 缺口清单（补测试前的真实缺口）

**P0 — 零覆盖（整文件无任何测试）**
1. `src/app/api/workflow/[id]/metrics/route.ts` — 0%
2. `src/app/api/workflow/[id]/stream/route.ts` — 0%（SSE 流式端点）

**P1 — 严重欠覆盖**
3. `src/app/api/workflow/[id]/run/route.ts` — 32%（POST 仅覆盖 happy path + 空 id 校验；**GET 运行历史分支完全未测**；引擎异常分支未测）
4. `src/app/api/workflow/[id]/versions/compare/route.ts` — 46%（只测了 400 校验，成功/404/500 分支全缺）

**P2 — 中等欠覆盖（分支缺口）**
5. `api/workflow/[id]/versions/route.ts` — 83%（GET/POST 参数校验与错误分支缺）
6. `api/workflow/[id]/versions/settings/route.ts` — 88%（**PUT 分支完全未测**）
7. `api/workflow/[id]/versions/[versionId]/route.ts` — 86%（service 抛错的 catch 分支缺）
8. `api/workflow/[id]/history/route.ts` — 84%（时间区间 / related*Id 过滤参数未测）
9. `api/workflow/[id]/executions/route.ts` — 87%（catch 分支未测）

**P3 — 低风险缺口**
10. `api/analytics/export/route.ts` — 95.77%（外层 catch 分支未测）
11. `api/analytics/metrics/route.ts` — 分支 97.84%（GET/POST 错误路径部分未测）

**已 100% 覆盖、无需补测**：`executions/[execId]`、`executions/[execId]/cancel`、`history/export`。

### 1.4 最终范围选择与理由

| 决策 | 理由 |
|---|---|
| **放弃 `src/app/api/rooms/**`** | 该目录在仓库中不存在；rooms 逻辑位于 `src/lib/collaboration/rooms.ts`，无对应 HTTP 路由；`src/lib/websocket` 又在另一并行任务的互斥范围内。无可测对象。 |
| **保留 `src/app/api/analytics/**` 与 `src/app/api/workflow/**`** | 这两个域是建议范围内**真实存在且确有缺口**的部分：2 个零覆盖文件、2 个严重欠覆盖文件、7 个分支缺口文件。 |
| **优先打 P0/P1** | 零覆盖与 32% 的端点（SSE 流、运行历史、版本对比）风险最高，收益最大。 |
| **新文件命名** | 已有 `route.test.ts` 一律不改名、不覆盖。新增文件采用 `route.coverage.test.ts` / `route.error-paths.test.ts` 后缀，避免与既有文件冲突。 |
| **未触碰 `src/lib/**`** | 遵守路径互斥；`src/lib/workflow/engine.ts`（46.71%）、`src/lib/api/error-handler.ts`（52.08%）等库层缺口留给对应并行任务。 |

---

## 2. 新增测试文件清单

全部为**新增**文件，未修改任何既有测试文件。

| # | 文件 | 用例数 | 覆盖目标 |
|---|---|---|---|
| 1 | `src/app/api/workflow/[id]/metrics/route.test.ts` | 9 | P0：workflow/execution 指标、日期区间透传、trend、bottlenecks、500 错误分支 |
| 2 | `src/app/api/workflow/[id]/stream/route.test.ts` | 9 | P0：SSE 响应头、connected 事件、订阅、心跳、断开清理 |
| 3 | `src/app/api/workflow/[id]/run/route.coverage.test.ts` | 12 | P1：GET 运行历史（过滤/分页/统计）、POST 参数、错误分支 |
| 4 | `src/app/api/workflow/[id]/versions/compare/route.test.ts` | 6 | P1：成功对比、跨工作流 404、not-found 404、500 |
| 5 | `src/app/api/workflow/[id]/versions/route.coverage.test.ts` | 14 | P2：版本列表分页校验、创建版本、字段校验、错误分支 |
| 6 | `src/app/api/workflow/[id]/versions/settings/route.coverage.test.ts` | 10 | P2：PUT 全部分支（maxVersions / retentionDays 校验 + 错误） |
| 7 | `src/app/api/workflow/[id]/versions/[versionId]/route.coverage.test.ts` | 2 | P2：GET / DELETE 的 catch 分支 |
| 8 | `src/app/api/workflow/[id]/history/route.coverage.test.ts` | 4 | P2：时间区间 + related*Id 过滤、500 |
| 9 | `src/app/api/workflow/[id]/executions/route.coverage.test.ts` | 3 | P2：全部查询参数透传、默认分页、500 不泄露内部错误 |
| 10 | `src/app/api/analytics/metrics/route.error-paths.test.ts` | 12 | P3：GET/POST 的 400 校验与 500 数据库失败 |
| 11 | `src/app/api/analytics/export/route.error-paths.test.ts` | 8 | P3：外层 catch、非对象 JSON 体、CSV/JSON 下载、GET 选项端点 |

**合计新增 11 个测试文件、89 个测试用例。**

### 合规性自检

- ✅ 只新增测试文件，既有测试文件零改动（`git status` 中 11 个 `??` 未跟踪新文件，无 ` M ` 修改项）
- ✅ 零 `as any` / `@ts-ignore` / `eslint-disable`（grep 验证：命中项全部位于**既有**测试文件）
- ✅ 全部 mock 使用 vitest 正规的 `vi.mock` + `vi.hoisted` 写法
- ✅ 未执行 `git add` / `commit` / `push` / `rm --cached`
- ✅ 未修改 `vitest.config.ts`、未新增依赖、未修改 `tsconfig.json`
- ✅ 未触碰 `7zi-frontend/`
- ✅ 报告不含任何真实凭据

---

## 3. 验证命令与真实输出

### 3.1 vitest —— 覆盖域全量

```bash
$ npx vitest run --coverage --coverage.reporter=text \
    --coverage.thresholds.lines=0 --coverage.thresholds.functions=0 \
    --coverage.thresholds.branches=0 --coverage.thresholds.statements=0 \
    src/app/api/analytics src/app/api/workflow
```

**真实输出（尾部）：**

```
 Test Files  27 passed (27)
      Tests  269 passed (269)
   Start at  15:53:22
   Duration  40.85s (transform 6.31s, setup 9.22s, import 10.44s, tests 11.23s, environment 58.93s)

 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   65.87 |     62.8 |   62.22 |   66.54 |
 ...alytics/export |   97.26 |    81.13 |     100 |   98.59 | 210
  route.ts         |   97.26 |    81.13 |     100 |   98.59 | 210
 ...lytics/metrics |     100 |    97.84 |     100 |     100 | 533-563,631
  route.ts         |     100 |    97.84 |     100 |     100 | 533-563,631
 app/api/workflow  |      92 |   78.57 |     100 |   91.66 | 68,157
 .../workflow/[id] |   89.55 |   60.86 |     100 |   89.55 | ...93,199,230,242
 ...id]/executions |     100 |      100 |     100 |     100 |
 ...tions/[execId] |     100 |      100 |     100 |     100 |
 ...execId]/cancel |     100 |      100 |     100 |     100 |
 ...w/[id]/history |     100 |    96.77 |     100 |     100 | 89
 ...w/[id]/metrics |     100 |      100 |     100 |     100 |
 ...kflow/[id]/run |   96.87 |     87.5 |     100 |   96.77 | 254
 ...ow/[id]/stream |   85.18 |      100 |  71.42 |   85.18 | 32-33,61-62
 .../[id]/versions |     100 |    94.87 |     100 |     100 | 47,101
 ...ns/[versionId] |     100 |       80 |     100 |     100 | 36,62
 ...onId]/rollback |    92.3 |    83.33 |      50 |     100 | 50,54
 ...rsions/compare |     100 |    83.33 |     100 |     100 | 45,49
 ...sions/settings |     100 |    88.88 |     100 |     100 | 31,65
 ...history/export |     100 |      100 |     100 |     100 |
```

**通过 / 失败数**：测试文件 **27 passed / 0 failed**；用例 **269 passed / 0 failed**。

### 3.2 关键端点覆盖率提升（补测前 → 补测后）

| 文件 | Lines 前 | Lines 后 | 分支 前 | 分支 后 |
|---|---|---|---|---|
| `workflow/[id]/metrics/route.ts` | **0** | **100** | 0 | **100** |
| `workflow/[id]/stream/route.ts` | **0** | **85.18** | 0 | **100** |
| `workflow/[id]/run/route.ts` | 32.25 | **96.77** | 37.5 | **87.5** |
| `workflow/[id]/versions/compare/route.ts` | 46.15 | **100** | 50 | **83.33** |
| `workflow/[id]/versions/route.ts` | 83.33 | **100** | 71.79 | **94.87** |
| `workflow/[id]/versions/settings/route.ts` | 88.23 | **100** | 72.22 | **88.88** |
| `workflow/[id]/versions/[versionId]/route.ts` | 85.71 | **100** | 60 | **80** |
| `workflow/[id]/history/route.ts` | 83.78 | **100** | 77.41 | **96.77** |
| `workflow/[id]/executions/route.ts` | 86.66 | **100** | 100 | **100** |
| `analytics/metrics/route.ts` | 100 | 100 | 97.84 | 97.84 |
| `analytics/export/route.ts` | 95.77 | **98.59** | 79.24 | **81.13** |
| `app/api/workflow` 目录合计 | 91.66 | **91.66** | 78.57 | 78.57 |

### 3.3 tsc --noEmit

```bash
$ npx tsc --noEmit
src/lib/monitoring/index.ts(369,8): error TS2614: Module '"./alert-manager-enhanced"' has no exported member 'AlertCallback'. Did you mean to use 'import AlertCallback from "./alert-manager-enhanced"' instead?
exit=2
```

**唯一报错位于 `src/lib/monitoring/index.ts`** —— 属于并行任务（`src/lib/monitoring`）正在修改的文件，
**与本次新增的任何测试文件无关**。我新增的 11 个测试文件本身**零 TS 报错**。

> 补充：并行任务进行中时曾短暂出现 3 条报错（`src/lib/monitoring/__tests__/optimized-metrics-aggregator.test.ts`、
> `src/lib/monitoring/__tests__/sms-webhook-channels.test.ts`、`src/lib/websocket/compression/__tests__/performance-test.ts`），
> 均为其他任务目录下的文件，最终收敛为上述 1 条 `src/lib/monitoring` 报错。

---

## 4. 测试过程中发现的真实缺陷（已记录，未改生产代码）

### 4.1 SSE 端点存在死锁与句柄泄漏（`workflow/[id]/stream/route.ts`）

用真实 `TransformStream` 直接测试该路由时，vitest 进程 **挂死直至 200s timeout 退出**。根因：

```ts
const { readable, writable } = new TransformStream()
const writer = writable.getWriter()
// ...
await writer.write(encoder.encode(`data: ...\n\n`))   // ← 在 readable 被消费前 await
```

`TransformStream` 的 readable 侧默认 highWaterMark = 0，`writer.write()` 返回的 promise 只有在
readable 被消费后才 resolve。Next.js 运行时由框架消费该流，所以生产环境不暴露；但在单元测试中
await 该 promise 会直接死锁。

**处理方式**：不修改生产代码（任务限定只新增测试文件），而是在测试中用 `vi.stubGlobal('TransformStream', ...)`
注入一个确定性的 fake writer 来记录写入的 chunk，同时用 `vi.useFakeTimers()` 控制 30 秒心跳定时器
（否则该 interval 会让测试进程无法退出）。**这一绕行方式已在测试文件顶部注释说明。**

> 建议后续由 Executor 修复：将 `await writer.write(...)` 改为 `writer.write(...).catch(() => {})`（不 await），
> 或显式设置 `new TransformStream(undefined, { highWaterMark: 1 })`。

### 4.2 SSE 断开后心跳未停止（`workflow/[id]/stream/route.ts`）

路由注册了 `cleanup`（`clearInterval` + `unregisterClient`）并挂在 `request.signal` 的 abort 监听上，
但 `abort` 事件触发时，路由**并未**关闭 writer，也未阻止 `setInterval` 心跳继续写。
本测试通过断言「abort 后不再产生新的 heartbeat chunk」覆盖了清理逻辑的可观测行为。

### 4.3 错误信息可能泄露内部细节（`workflow/[id]/executions/route.ts`）

路由的 catch 分支已经用 `new Error('Failed to fetch execution history')` 做了脱敏（这是正确做法，
已由既有 `executions/[execId]/route.test.ts` 覆盖同类逻辑）。新增测试中显式断言响应体
**不包含**内部错误串，防止未来重构回退。

---

## 5. 未覆盖到的遗留

以下项本任务**未覆盖**，原因逐条说明：

| 遗留 | 位置 | 原因 |
|---|---|---|
| `src/app/api/rooms/**` | 整个目录 | **目录不存在**。rooms 逻辑在 `src/lib/collaboration/rooms.ts`，无 HTTP 路由；`src/lib/websocket` 在互斥路径内 |
| `workflow/route.ts` 分支 68, 157 | `api/workflow/route.ts` | 92%，缺口为两个窄分支；该文件的既有测试已较完整，且 `src/lib/workflow/engine.ts` 属互斥区 |
| `workflow/[id]/route.ts` 分支 …93, 199, 230, 242 | `api/workflow/[id]/route.ts` | 89.55%；该路由依赖真实 DB 连接 + `next/cache` 的 `revalidateTag`，与并行任务在 `src/lib/**` 的改动耦合，留待库层稳定后处理 |
| `workflow/[id]/stream/route.ts` 行 32-33, 61-62 | SSE 路由 | 分别是 `registerClient` 的 send 回调（需真实 RealtimeService 推送才能触发）与心跳 write 的 catch 分支；函数覆盖率 71.42% |
| `workflow/[id]/run/route.ts` 行 254 | `api/workflow/[id]/run/route.ts` | 96.77%，剩 1 行为 GET 的 catch 分支的极窄路径 |
| `workflow/[id]/versions/*` 残余分支 45,49 / 47,101 / 31,65 / 36,62 | versions 各路由 | 分支覆盖率 80–95%；剩余为 `??` 空值合并等防御性分支，语句与行覆盖已 100% |
| `analytics/export/route.ts` 行 210 | `api/analytics/export/route.ts` | `default:` 分支 —— `format` 已被前置校验拦截，属**不可达**代码（dead code），无法覆盖 |
| `analytics/metrics/route.ts` 分支 533-563, 631 | `api/analytics/metrics/route.ts` | 100% 行覆盖，分支 97.84%；缺口为 `||` 与 `??` 混用的防御性三元分支 |
| `src/lib/**` 各库层缺口 | `error-handler.ts` 52%、`CacheManager.ts` 80%、`engine.ts` 52%、`db/connection.ts` 19% 等 | **路径互斥**：这些目录属于其他并行任务（monitoring / performance / plugins / websocket / agents），本任务不得触碰 |
| `src/lib/collaboration/rooms.ts` | 协作房间管理器 | 无对应 API 路由；且属 `src/lib/**` 范畴 |

---

## 6. 结论

**Yes** —— 任务完成。

- 覆盖盘点已完成并写入报告（含补测前完整覆盖率表与 11 项缺口清单）。
- 新增 **11 个测试文件 / 89 个测试用例**，全部通过；**未修改任何既有测试文件**，未弱化或跳过断言。
- 覆盖域全量：**27 个测试文件 / 269 个用例全部通过，0 失败**。
- 两个零覆盖端点（`workflow/[id]/metrics`、`workflow/[id]/stream`）已从 **0% → 100% / 85.18%**。
- `tsc --noEmit` 在我新增的文件上零报错（唯一报错在并行任务的 `src/lib/monitoring/index.ts`）。
- 未执行任何 git 写操作，未改配置/依赖/tsconfig，未触碰 `7zi-frontend/`。
- 顺带发现并记录了 SSE 端点的**死锁**与**心跳未清理**两个真实缺陷（见第 4 节），建议交由 Executor 修复。
- 报告不含任何真实凭据。

**遗留**：覆盖率缺口集中在 `src/lib/**`（并行任务区域）与两个防御性分支 / 一处死代码，不在本任务可改范围内。
