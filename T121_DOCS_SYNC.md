# T121 · 文档同步报告（API.md analytics 核对 + CHANGELOG T115–T120 补记）

> 执行者：📚 咨询师 子代理
> 时间：2026-10-25 05:07–05:16 (GMT+8)
> 工作目录：`/root/.openclaw/workspace`
> 硬约束遵守：仅改动 `API.md` 与 `CHANGELOG.md`；未 `git add` / `commit` / `push`；
> 未改动任何 `src/` 代码或测试文件；未新增依赖；未回显任何真实凭据原文；
> `API.md` 与 `CHANGELOG.md` 均**只增不删**（删除行数 = 0）。

---

## 0. 结论速览

**结论：Yes**

| 任务 | 状态 | 说明 |
|---|---|---|
| A. 核对 API.md 中两个 analytics 端点 | ✅ | 原 API.md **完全没有** 这两个端点的文档；已新增 2 个小节 + 1 段范围说明，共 **+182 行 / 0 删除** |
| B. CHANGELOG 补记 T115–T120 | ✅ | 新增独立段落，**+109 行 / 0 删除** |
| C. 审计结论（行号区间 + 改动 + 原因） | ✅ | 见第 4 节 |

**关键发现**：这不是「文档与实现不符」的问题，而是「**文档整段缺失**」——
`/api/analytics/metrics` 与 `/api/analytics/export` 是发布树里唯二的 analytics 端点，
但 API.md 的「Analytics APIs」小节只覆盖了**旧嵌套树**（`7zi-frontend/src/app/api/analytics/*`）
里的 overview / nodes / resources / anomalies / trends 五个端点。
所以本次是**纯新增**而非「更正错误描述」，`API.md` 删除行数为 0。

---

## 1. 核对方法

1. **读实现原文**（未依赖任何二手描述）：
   - `src/app/api/analytics/metrics/route.ts`（18858 字节，561 行）
   - `src/app/api/analytics/export/route.ts`（6713 字节，223 行）
   - 配套类型：`src/lib/types/analytics.ts`（`AnalyticsFilters` / `AnalyticsMetrics` /
     `ExportOptions` / `ExportFormat` / `TimeRange`）
   - 错误契约来源：`src/lib/api/error-handler.ts`（`createSuccessResponse` /
     `createErrorResponse` / `createValidationError` / `buildErrorResponse`）、
     `src/lib/api/error-types.ts`（`ErrorType` 枚举）
   - 认证与限流：`src/proxy.ts`（matcher 覆盖全部路径，`/api/` 走通用限流 100 req/min）
2. **定位 API.md 中的 analytics 小节**：`grep -n -i "analytics" API.md` → 命中 17 处，
   主小节为 **第 3386 行 `## 📈 Analytics APIs`**（原 3386–3443，170 行）。
3. **逐条比对**：参数名 / 类型 / 必填性 / 默认值 / 返回体字段 / 错误码 / 响应头。
4. **交叉验证认证口径**：确认 `7zi-frontend/src/app/api/analytics/{overview,nodes,resources,anomalies,trends}/route.ts`
   均显式调用 `authenticateJWT`（→ 401），而发布树这两个端点**没有**该调用。

### ⏱ 核对基准时间点（重要）

| 文件 | md5 | mtime | 状态 |
|---|---|---|---|
| `src/app/api/analytics/metrics/route.ts` | `1cf3e40734554e93b33c53141f1de691` | 01:23:38 | **核对期间未变**（05:08 / 05:13 / 05:15 三次校验一致） |
| `src/app/api/analytics/export/route.ts` | `347568c89f56d051b9691b02f6eca3ff` | 19:21:01 | **核对期间未变** |

> **基准时间点：2026-10-25 05:15:16 (GMT+8)**，以上述两个 md5 为准。
>
> T120 在核对期间**确实在并行改动**（`src/test/vi-mocks.ts` mtime 连续变化：
> 05:13:18 → 05:14:42），且 05:13:57 复跑 vitest 时 `vi-mocks.ts` 处于**语法错误的中间态**
> （vite:oxc transform 失败，"no tests"）。但 **T120 的改动目标文件
> （两个 route.ts）本身未变**，故本文结论不受影响。
> T120 落地后需按第 6 节「遗留问题」复核一次。

---

## 2. 改动文件列表（带行数）

| 文件 | 动作 | 行数变化 | 字节 |
|---|---|---|---|
| `/root/.openclaw/workspace/API.md` | 纯新增 2 个端点小节 + 1 段范围说明 | **+182 / -0** | 165104 → 169688 |
| `/root/.openclaw/workspace/CHANGELOG.md` | 纯新增 1 个 `## [未发布]` 段落 | **+109 / -0** | 146988 → 150893 |
| `/root/.openclaw/workspace/T121_DOCS_SYNC.md` | 新增本报告 | 新文件 | — |

**未触碰**：`src/**`（全部代码与测试）、`HEARTBEAT.md`（T119 负责）、`src/test/vi-mocks.ts`（T120 负责）、
`DEV_TASKS_20261025_0500.md`、`state/tasks.json`、`memory/*`。
**未执行**：`git add` / `git commit` / `git push` / `git rm --cached` / 任何远端操作。

---

## 3. 逐条差异说明（API.md）

### 3.1 差异性质判定

| # | 差异 | 性质 | 处理 |
|---|---|---|---|
| D1 | `/api/analytics/metrics` 端点**完全无文档** | 缺失（不是写错） | 新增小节（纯增） |
| D2 | `/api/analytics/export` 端点**完全无文档** | 缺失 | 新增小节（纯增） |
| D3 | 小节开头声称「所有端点均要求 JWT 认证，未认证返回 401」 | **与发布树实现不符** | 追加「范围说明」限定范围（保留原句，未删改） |
| D4 | 未说明两个发布树端点的错误响应体字段名 | 缺失 | 在 Export 小节末尾补通用错误响应体示例 |
| D5 | 全局「Common Error Responses」用 `error.code`，实现用 `error.type` | 全局口径不一致 | **未改**（超出本次范围），仅在新增小节按实现口径记录 + 列为遗留 |

### 3.2 逐条明细（改了什么 + 为什么）

#### D3 — 「所有端点均要求 JWT 认证」限定（API.md 第 3391–3398 行，新增 8 行）

- **为什么改**：实测两个发布树端点的 `route.ts` 内**没有任何** `authenticateJWT` / `requireAuth` /
  `verifyToken` 调用；`src/proxy.ts` 只做限流 + 安全响应头，**不做认证**。
  而 overview / nodes / resources / anomalies / trends 五个端点在**旧嵌套树**里确实调用了
  `authenticateJWT`（→ 401）。原句若不加限定，会让调用方误以为 metrics/export 也会返回 401。
- **改法**：**保留原句不动**，在其后追加一段「范围说明（2026-10-25 补充）」，
  逐条说明两个树各自的认证现状。**未删除任何原文。**

#### D1 — `### Analytics Metrics（发布树）`（API.md 第 3453–3535 行，新增 83 行）

对照 `src/app/api/analytics/metrics/route.ts` 逐项录入：

| 文档项 | 实现依据 | 一致性 |
|---|---|---|
| GET query `timeRange`（string，可选，默认 `week`） | `searchParams.get('timeRange') as TimeRange \|\| 'week'` | ✅ |
| GET query `customRange`（JSON string，可选） | `searchParams.get('customRange')` + `JSON.parse` | ✅ |
| GET query `page`（number，默认 1，<1 → 400） | `parseInt(... \|\| '1')` + 校验 | ✅ |
| GET query `limit`（number，默认 100，1–1000，越界 → 400） | `parseInt(... \|\| '100')` + 校验 | ✅ |
| POST body `timeRange` / `customRange` / `agentIds` / `taskStatuses` / `taskPriorities` / `taskTypes` / `providers` / `metrics` / `compareWith` / `page` / `limit` | POST body 解构 11 个字段 | ✅ 全部录入 |
| 返回 `data.metrics` 子结构（agents / users / tasks / revenue / performance 共 5 组、41 个字段） | `fetchMetricsFromDatabase()` 返回值 + `src/lib/types/analytics.ts` `AnalyticsMetrics` | ✅ |
| 返回 `data.timeSeries` 点字段（timestamp/date/agents/users/tasks/tokens/revenue/errors） | `fetchTimeSeriesFromDatabase()` 的 `data` 映射 | ✅ |
| 返回 `data.pagination`（total/page/limit/totalPages） | 两个 handler 的 `pagination` 字面量 | ✅ |
| 返回 `data.timestamp` / `data.filters` / `data.cacheStats`（hitRate/hits/misses） | 同上 | ✅ |
| GET 响应头 `Cache-Control: public, s-maxage=60, stale-while-revalidate=30` | `NextResponse.json(..., { headers })` | ✅ |
| 错误 400：`page`/`limit` 越界 | `createValidationError(...)` | ✅ |
| 错误 400：`customRange` JSON 解析失败 | `createValidationError('Invalid customRange format')` | ✅ |
| 错误 400：非法 body（JSON 解析失败） | **目标契约**，当前实现为 500 → 已加显式标注 | ⚠️ 见 3.3 |
| 错误 500：内部异常 | `createErrorResponse(...)` | ✅ |
| 错误 429：proxy 通用限流 | `src/proxy.ts` `generalRateLimiter`（100 req/min，按 IP） | ✅ 新增（原文未提） |
| **无 401** | 路由内无认证调用 | ✅ 已注明 |
| 5 分钟内存缓存 | `cache.set(cacheKey, metrics, CachePresets.LONG)` | ✅ |
| 「随机/估算值」警示块 | `Math.random()` 出现在 `retentionRate` / `averageSessionDuration` / `averageCompletionTime` / `growthRate` / `conversionRate` / `cpuUsage` / `memoryUsage` / `uptime` / `throughput` / `cacheHitRate` / `byProvider.*.averageResponseTime`；源码注释 "Response time would need separate tracking" | ✅ 新增（防误导） |

#### D2 — `### Analytics Export（发布树）`（API.md 第 3537–3625 行，新增 89 行）

对照 `src/app/api/analytics/export/route.ts` 逐项录入：

| 文档项 | 实现依据 | 一致性 |
|---|---|---|
| GET 无参数，返回 `{formats:['csv','xlsx','json'], maxRecords:10000, options:{includeHeaders:['true','false'], timeRange:[...]}}` | `GET()` 的 `response.data` | ✅ |
| POST body `format`（string，默认 `csv`，仅 csv/xlsx/json，其余 → 400） | `['csv','xlsx','json'].includes(format)` 校验 | ✅ **注意 `pdf` 被显式拒绝**（类型里 `ExportFormat` 含 `pdf`，但实现不接受） |
| POST body `data`（array，**必填**，缺失/非数组/空 → 400） | `if (!data \|\| !Array.isArray(data) \|\| data.length === 0)` | ✅ |
| POST body `filename`（string，默认 `analytics-export`） | 解构默认值 | ✅ |
| POST body `includeHeaders`（boolean，默认 `true`） | 解构默认值 | ✅ |
| POST body `filters`（object，仅入日志，不影响结果） | 仅出现在 `logger.info` | ✅ 已注明 |
| POST body `dateRange`（object，`{start,end}`，影响文件名） | `getFilename(..., dateRange)` | ✅ |
| 响应：`Content-Type` / `Content-Disposition: attachment; filename="..."` / `Cache-Control: no-cache, no-store, must-revalidate` | `new Response(responseBody, { headers })` | ✅ |
| 返回**文件二进制流**（非 JSON 信封） | `Buffer.isBuffer(content) ? new Uint8Array(content) : new TextEncoder().encode(content)` | ✅ 已注明 |
| 文件名规则 `<name>_<YYYY-MM-DD>.<ext>`；有 `dateRange` 时 `<name>_<start>_to_<end>.<ext>`；xlsx 扩展名为 `xlsx` | `getFilename()` | ✅ |
| `maxRecords: 10000` **仅为声明值，POST 未强制校验** | 实现中无条数上限判断 | ✅ 已注明（防误导） |
| 错误 400：format 不支持 / data 缺失或空 | `createValidationError` | ✅ |
| 错误 400：非法 body | 目标契约，当前 500 → 已标注 | ⚠️ 见 3.3 |
| **无 401** | 路由内无认证调用 | ✅ 已注明 |

#### D4 — 通用错误响应体（API.md 第 3614–3625 行，新增 12 行）

- **为什么加**：两个端点的错误都经 `createErrorResponse` → `buildErrorResponse`，返回体字段是
  **`error.type`**（`ErrorType` 枚举值，如 `VALIDATION_ERROR` / `INTERNAL_ERROR`），
  且带 `userMessage` / `action` / `help` / `details` / `timestamp` / 顶层 `requestId`。
  原文档「Common Error Responses」（约 3190 行）用的是 `error.code`，两处口径不同。
  在新增小节里按**实现**口径给出完整示例，并在末尾显式点出该差异（只增不删）。

### 3.3 唯一「文档领先于实现」的地方（400 契约）

**这是本次唯一需要跨任务对齐的点，已在文档中显式标注而非掩盖。**

- **现状实测**：`npx vitest run src/app/api/analytics/__tests__/api.test.ts`
  → **24 passed / 1 failed**，唯一失败为
  `should handle invalid POST body` → `AssertionError: expected 500 to be 400`。
- **根因**：`route.ts` 的 `await request.json()` 抛错后落入 `catch` 分支的
  `createErrorResponse(error instanceof Error ? error : new Error('Invalid request body'))`，
  而 `createErrorResponse` 对普通 `Error` 走 `ErrorType.INTERNAL` + **status 500**。
- **处理方式**：T121 的职责是「文档与实现一致」，但 T120 的明确目标是「非法 body → 400」。
  若此刻按**当前实现**写 500，等 T120 落地立刻又变成错的。
  故本报告采取：**按目标契约 400 记录 + 用 📌 标注块显式写明「T120 在途，实测当前为 500，
  落地后请复核」**。这是两份文档中最需要主管复核的一处。
- **复核方法**：T120 落地后跑 `grep -n "createValidationError\|createErrorResponse" src/app/api/analytics/{metrics,export}/route.ts`
  + 复跑上述 vitest，确认状态码为 400，并删除 API.md 中的「T120 在途」标注。

---

## 4. API.md 审计结论（行号区间 + 改了什么 + 为什么）

| 行号区间（改后） | 内容 | 动作 | 行数 | 为什么 |
|---|---|---|---|---|
| **3391–3398** | 「范围说明（2026-10-25 补充）」 | 新增 | +8 | 原「所有端点均要求 JWT 认证，未认证返回 401」对发布树的 metrics/export 不成立（这两个路由无 `authenticateJWT`）。保留原句 + 追加限定，避免误导调用方 |
| **3453–3535** | `### Analytics Metrics（发布树）` — GET/POST 参数表、返回结构（`data` + `metrics` 5 组 41 字段）、GET 响应头、错误码表、随机值警示 | 新增 | +83 | 该端点此前**在 API.md 中完全没有文档**，而它是发布树 analytics 的主端点 |
| **3537–3625** | `### Analytics Export（发布树）` — GET 选项响应、POST body 参数表、文件流响应头、文件名规则、错误码表 | 新增 | +89 | 该端点此前**在 API.md 中完全没有文档** |
| **3614–3625** | 通用错误响应体示例（`error.type` 口径）+ 与全局 `error.code` 的差异提示 | 新增 | +12 | 实现用 `error.type`，调用方按全局示例的 `error.code` 取值会拿到 undefined |
| — | 其余全部 | **未改动** | 0 | 原 API.md 的 7300 行内容一字未删、一字未改 |

**API.md 净变化：+182 行 / -0 行**（`diff /tmp/API.md.bak API.md | grep -c '^<'` = 0，
`grep -c '^>'` = 182）。

---

## 5. CHANGELOG 补记（T115–T120）

在 `## [未发布]` 下新增独立段落 **`## [未发布] / 2026-10-25（T115–T120 补记，由 T121 同步）`**，
位置：**第 277–385 行**（紧接 T115 段落之后、`## [未发布] / 2026-10-24 ~ 2026-10-25（T87–T110 补记）` 之前）。

结构：
1. **段头说明** — 核实口径（`git log` / `git show --stat` / 已落地报告 md / 工作区实际 diff），
   声明「未产出报告的条目（T116/T117/T118）只记录派单原文口径，不补写未经证实的细节」。
2. **任务条目速览表** — T115–T120 六行的角色/类型/摘要/产出物。
3. **六个分节（每节 3–6 行）** — T115 / T116 / T117 / T118 / T119 / T120 / T121，
   每节均含「做了什么 / 影响哪些文件 / 验证方式」。
4. **遗留提示** — `error.code` vs `error.type` 的全局口径差异。
5. **待拍板项指引** — 指向 `DECISION_PENDING_20261024.md`（与既有段落风格一致）。

### 各节事实核实来源

| 节 | 核实命令 / 依据 | 状态 |
|---|---|---|
| T115 | `git show --stat 9295d821df`（666 insertions / 5 deletions） | ✅ 已核实 |
| T116 | `git show --stat d892253cb9`（8 files, +480 / -30）+ `4e3bcda68a` | ✅ 已核实 |
| T117 | `git show --stat 568cee6677`（4 files, +121 / -9），「17/17 通过」取自提交正文 | ✅ 已核实 |
| T118 | `git show --stat e00c13e4e6` / `af18945a09` / `d401c0588f` / `68f9bdcd02` | ✅ 已核实 |
| T119 | `T119_CLAWMESH_HEARTBEAT_FIX.md`（已落地报告）+ `git diff --stat HEAD -- HEARTBEAT.md` → 删除 0 行 | ✅ 已核实 |
| T120 | 工作区实际 diff（`git diff --stat`）+ vitest 实跑 | ✅ 已核实（并注明在途） |

> ⚠️ **诚实标注**：T116 / T117 / T118 三个编号在仓库中**没有对应的独立报告 md**，
> 且其派单内容与实际落地提交的对应关系存在歧义（例：T116 派单写「文档同步」，
> 但仓库中实际对应的是 tenant/billing 安全修复提交 `d892253cb9`）。
> 本段对这三项**只写「派单口径 + 已核实提交」，不编造报告文件名、不编造具体行数**，
> 并在速览表的「产出物」列显式标注「**无独立报告**」。

**CHANGELOG 净变化：+109 行 / -0 行**（`diff /tmp/CHANGELOG.md.bak CHANGELOG.md | grep -c '^<'` = 0）。

---

## 6. 验证命令与输出摘要

```bash
$ diff /tmp/API.md.bak API.md | grep -c '^<'          # 删除行数
0
$ diff /tmp/API.md.bak API.md | grep -c '^>'          # 新增行数
182

$ diff /tmp/CHANGELOG.md.bak CHANGELOG.md | grep -c '^<'
0
$ diff /tmp/CHANGELOG.md.bak CHANGELOG.md | grep -c '^>'
109

$ grep -n "Analytics Metrics（发布树）\|Analytics Export（发布树）\|范围说明" API.md
3391:> **范围说明（2026-10-25 补充）**：...
3453:### Analytics Metrics（发布树）
3537:### Analytics Export（发布树）

$ grep -n "T115–T120 补记" CHANGELOG.md
279:## [未发布] / 2026-10-25（T115–T120 补记，由 T121 同步）

$ git status --short
 M CHANGELOG.md
 M API.md
 M memory/claw-mesh-state.json
 M src/app/api/analytics/__tests__/api.test.ts
 M src/app/api/analytics/metrics/route.ts
 M src/test/vi-mocks.ts
 M state/tasks.json
?? DEV_TASKS_20261025_0500.md
?? T119_CLAWMESH_HEARTBEAT_FIX.md
?? T121_DOCS_SYNC.md
（API.md / CHANGELOG.md 之外无本次新增改动；其余为 T119/T120/主管的工作区改动）

$ npx vitest run src/app/api/analytics/__tests__/api.test.ts   # 05:09 首次
 Test Files  1 failed (1)
      Tests  1 failed | 24 passed (25)
   AssertionError: expected 500 to be 400
   ❯ src/app/api/analytics/__tests__/api.test.ts:204:29

$ npx vitest run src/app/api/analytics/__tests__/api.test.ts   # 05:13 复跑（T120 编辑中）
 Test Files  1 failed (1)
      Tests  no tests
   vite:oxc transform 失败于 src/test/vi-mocks.ts（T120 的中间态，非本次改动）
```

**未执行的验证**（原因）：
- `npx tsc --noEmit`：本次**未改动任何 `.ts` 文件**，且全量类型检查约需 2 分钟（预算 10 分钟内已紧张）；
  主管基线（05:00–05:07）已实测 `exit 0`，本次不重复。
- `git add/commit/push`：硬约束禁止，由主管统一提交。

---

## 7. 遗留问题

| # | 问题 | 严重度 | 归属 | 建议动作 |
|---|---|---|---|---|
| L1 | **POST 非法 body 契约**：API.md 按目标契约写 400，实测当前为 500（T120 在途） | 中 | T120 / 主管 | T120 落地后复跑 vitest，确认 400 后**删除 API.md 两处「T120 在途」标注** |
| L2 | 全局「Common Error Responses」小节（约 3190 行）示例用 `error.code`，实现用 `error.type` | 中 | 后续任务 | 单独派单统一全局口径；本次仅在新增小节按实现记录，**未改全局段** |
| L3 | `Analytics Export` 的 `maxRecords: 10000` 只是声明值，POST 未强制校验条数上限 | 低 | 实现方 | 要么补校验，要么在实现里去掉该声明 |
| L4 | `ExportFormat` 类型含 `pdf`，但实现只接受 `csv`/`xlsx`/`json`（`pdf` → 400） | 低 | 实现方 | 类型与实现不一致，调用方可能误用 |
| L5 | `metrics` 返回中约 11 个字段是 `Math.random()` 估算值（retentionRate / cpuUsage / uptime 等），已在文档中警示 | 低 | 实现方 | 建议后续接真实度量或明确标记为估算 |
| L6 | `src/test/vi-mocks.ts` 在 05:13–05:14 处于 T120 编辑中间态（语法错误），该窗口内 vitest 全量失败 | 低 | T120 | T120 完成后自行复跑确认 |

---

## 8. 结论

**Yes**

- API.md 的两个发布树 analytics 端点已从「**零文档**」补齐为完整契约：
  GET/POST 参数表（名/类型/必填/默认值）、返回体字段（`data` 6 个顶层字段 + `metrics` 5 组 41 字段）、
  响应头、错误码表（含 429 限流与「无 401」说明）、以及随机值与 `maxRecords` 的防误导标注。
- API.md **删除 0 行**，CHANGELOG **删除 0 行**，严格「只增不删」。
- CHANGELOG 已补齐 T115–T120 口径，并对**无报告的 T116/T117/T118 显式标注「无独立报告」**，
  未编造任何事实。
- 唯一需跨任务复核项（L1，400 契约）已在两处文档中显式标注为「T120 在途」，
  主管收口时按第 6 节方法复核即可。

> 供主管 review 的三个重点：
> 1. **L1**（400 vs 500）——T120 落地后必须回来删标注；
> 2. **L2**（`error.code` vs `error.type`）——建议单独派单做全局统一；
> 3. **T116/T117/T118 的编号归属**存疑（派单内容与实际提交对不上号），
>    本段已按「派单口径 + 已核实提交」双写，请主管确认归属是否需要修订。
