# T122 — analytics 遗留半成品收口 + 类型/实现不一致修复

**执行人**：⚡ Executor
**日期**：2026-10-25
**范围**：`src/app/api/analytics/**`、`src/lib/types/analytics.ts`
**结论**：**Yes**（见文末「结论」）

---

## 一、根因 / 问题清单

T120 修复了 analytics 的 400 契约并提交，但留下了 4 类半成品/缺陷。

### 1.1 `api.test.ts` 的 SQL 形状替身与真实 SQL 不符（**死分支**，最严重）

`vi.mock('@/lib/db/connection')` 里有一条：

```ts
if (/COUNT\(\*\) as count/i.test(sql)) {
  return [{ count: 42 }]
}
```

但实现里的真实 SQL 是（`metrics/route.ts` 时间序列总数查询）：

```sql
SELECT COUNT(DISTINCT DATE(created_at)) as count FROM (
  SELECT created_at FROM tasks UNION ALL SELECT created_at FROM revenue
) WHERE created_at >= ? AND created_at <= ?
```

正则 `/COUNT\(\*\) as count/i` **永远匹配不上**这条 SQL（且由于 `||` 短路，它排在 `GROUP BY` 分支之后，实际也永远轮不到执行）。
后果：`countResult[0].count` 为 `undefined` → 总条数回退到 `totalDays`（week=7），
**测试实际上从未验证过总数查询这条分支**，属于典型的「假绿」。

**已修正**：替身改为匹配真实 SQL 形状 `/COUNT\(DISTINCT DATE\(created_at\)\) as count/i`，
并新增断言 `expect(data.data.pagination.total).toBe(42)` 把它钉死——若日后实现再改 SQL 或替身再失配，该断言会立即失败。

### 1.2 断言层级/字段名复核结果

逐条对照 `metrics/route.ts` 的 `responseData`（约 499–515 行）与 `export/route.ts`：

| 断言项 | 实现位置 | 复核结论 |
|---|---|---|
| `data.metrics` | `responseData.metrics` | ✅ 一致 |
| `data.timeSeries` | `responseData.timeSeries`（= `timeSeries.data`） | ✅ **是 data 的子节点**，不是 metrics 的子节点 |
| `data.cacheStats` | `responseData.cacheStats`（hitRate/hits/misses） | ✅ **是 data 的子节点** |
| `data.pagination` | `responseData.pagination`（total/page/limit/totalPages） | ✅ 是 data 的子节点 |
| `data.metrics.performance.responseTime` | `fetchMetricsFromDatabase` 的 performance 聚合 | ✅ 字段名确为 `responseTime`（**不是** `response_time` / `avg_response_time`） |
| `data.metrics.agents.byProvider` | `GROUP BY provider` 聚合 | ✅ 存在，且以 provider 名为 key 的对象 |

**补充的负向断言**（防止后续回退）：
- `data.metrics` **不含** `timeSeries` / `cacheStats`
- `data.metrics.performance` **不含** `response_time` / `avg_response_time`
- `byProvider.anthropic` 字段名为 `count` / `tasksCompleted` / `tokensUsed`（驼峰，与实现一致）

### 1.3 实现缺陷：`body.page || 1` 使分页校验形同虚设（**新发现，已修**）

`metrics/route.ts` POST 原为：

```ts
const page = body.page || 1
const limit = body.limit || 100
if (page < 1 || limit < 1 || limit > 1000) { return createValidationError(...) }
```

`||` 会把 `0` 吞成默认值：`0 || 1 === 1`。于是 `page < 1` 分支**永远不可达**，
客户端传 `page=0` / `limit=0` 会被静默改成 `1` / `100`，返回 200 而非 400——与 T120 建立的「非法输入 → 400」契约相悖。
本轮补测试时被该断言打红（`expected 200 to be 400`），据此修实现为 `??` + 类型/有限性校验。

### 1.4 实现缺陷：JSON 合法但非对象 → 500 而非 400（**新发现，已修**）

`metrics` POST 与 `export` POST 在 `request.json()` 成功后直接解引用 `body.page` / 解构 `body`。
当 body 是 `null` / `[]` / `"text"` / `42` 时：
- `null` → `body.page` 抛 TypeError → 落入 catch → **500**
- `[]` → `body.page` 为 undefined → 走默认值（这个恰好是 200）

已加守卫：非对象 / 数组 → `createValidationError('Invalid request body')` → 400。

### 1.5 未提交半成品：文件尾部有多余的 `}\n}`

`metrics/route.ts` 工作区尾部存在两个多余的闭合花括号（HEAD 版本没有，属未提交残留），
导致 `oxc` 解析失败 `PARSE_ERROR: Unexpected token @ 624:3`，metrics 与 api 两个测试文件直接加载失败。
**已移除**（这是「半成品未提交」最直接的表现）。

### 1.6 eslint warning 3 处

| 位置 | 变量 | 处理方式 |
|---|---|---|
| `metrics/route.ts` 161 | `endDate` | 确认为**真未用**（聚合只按 `created_at >= startDate` 过滤，无任何 `endDate` 条件）→ 改为只解构 `{ startDate }` 并加注释说明 |
| `metrics/route.ts` 368 | `endIndex` | 确认为**真未用**（分页切片未使用下标边界）→ 删除该行 |
| `metrics/route.ts` 482 | `catch (error)` | **不删**（需保留错误对象）→ 改为 `logger.error('Analytics GET invalid customRange', error, { category: 'analytics' })` 记录日志，符合「禁止静默吞异常」 |

### 1.7 `ExportFormat` 类型与实现不一致

`src/lib/types/analytics.ts` 声明 `'csv' | 'xlsx' | 'json' | 'pdf'`，但 export 路由只接受 csv/xlsx/json，
传 `pdf` → 400。**类型放宽会让调用方以为 pdf 可用**。

**修正**：收窄为 `'csv' | 'xlsx' | 'json'`，并同步删掉 `export/route.ts` 中 `getContentType()` 的 `pdf` 映射
（该映射在收窄后不再是 `Record<ExportFormat, string>` 的合法成员，tsc 会直接报错，留着就是死代码）。

全仓引用核查（`grep -rn "ExportFormat" src/`）：

- `src/lib/types/analytics/index.ts:22` —— 仅 re-export，无需改
- `src/app/api/analytics/export/route.ts` —— 已同步
- `src/app/api/data/export/route.ts` —— 用的是 `src/lib/data-import-export` 的**另一个** `ExportFormat`（`'csv' | 'json'`），与本次无关
- `src/lib/backup/types.ts`、`src/lib/export/types.ts`、`src/lib/export/core/exporter.ts`、`src/lib/data-import-export.ts`、`src/components/ai-report/types.ts`、`src/components/DataExportPanel.tsx` —— 均为**同名但不同模块**的独立类型，不受影响
- `src/components/analytics/AnalyticsDashboard.tsx:235` `handleExport(format: ExportFormat)` —— 使用的是 analytics 那个类型；
  其调用方 `AnalyticsChart.tsx` 的 `onExport?: (format: 'csv' | 'xlsx' | 'json') => void` 本身就只列了这 3 个格式，
  **与收窄后的类型完全吻合**，无需改动
- `src/components/index.ts:55` —— 仅 re-export

结论：**收窄类型不影响任何调用方**，无编译破坏。

---

## 二、改动文件列表

| 文件 | 增/删 | 说明 |
|---|---|---|
| `src/app/api/analytics/__tests__/api.test.ts` | +262 / −45 | 修正 SQL 替身死分支；补层级/字段名正负断言；补 6 组边界测试 |
| `src/app/api/analytics/metrics/route.ts` | +22 / −5 | 移除文件尾部多余 `}`；`endDate`/`endIndex` 清理；catch 补 logger；非对象 body → 400；`||` → `??` + 分页校验加固 |
| `src/app/api/analytics/export/route.ts` | +5 / −1 | 删除 `pdf` content-type 映射；非对象 body → 400 |
| `src/lib/types/analytics.ts` | +5 / −1 | `ExportFormat` 收窄为 `'csv' \| 'xlsx' \| 'json'` + 注释 |

总计：`4 files changed, 300 insertions(+), 47 deletions(-)`

**新增测试清单**（`api.test.ts`，全部为真实契约断言，无 skip、无弱化）：

1. `should place cacheStats and pagination under data`
2. `should use responseTime (not response_time) for performance`
3. `should expose byProvider entries keyed by provider name`
4. `should return 400 for a JSON body that is not an object`（metrics，4 种 body）
5. `should reject invalid pagination parameters`（metrics，page=0 / limit=0 / limit=1001）
6. `should apply default filters when POST body omits optional fields`（metrics，timeRange=week / page=1 / limit=100）
7. `should reject every format outside csv/xlsx/json`（export，pdf/excel/xml/CSV/''/html）
8. `should default format to csv when omitted`（export）
9. `should return 400 for an export body that is not an object`（export，4 种 body）
10. `should return 400 for invalid JSON export body`（export）

（用例数由 25 → 35，文件总数 25 → 97）

---

## 三、验证命令与输出摘要

### 3.1 `npx vitest run src/app/api/analytics`

```
 ✓ src/app/api/analytics/__tests__/optimization.test.ts (20 tests) 235ms
 ✓ src/app/api/analytics/export/route.test.ts (20 tests) 1002ms
 ✓ src/app/api/analytics/__tests__/api.test.ts (35 tests) 918ms
 ✓ src/app/api/analytics/metrics/route.test.ts (22 tests) 81ms

 Test Files  4 passed (4)
      Tests  97 passed (97)
```

全绿，无 skip / 无 todo。

### 3.2 `npx eslint src/app/api/analytics src/lib/types/analytics.ts --ext .ts`

```
（无输出）
eslint_exit=0
```

0 errors、0 warnings（此前为 3 warnings）。

### 3.3 `npx tsc --noEmit`

```
total errors: 6
--- analytics-related ---
(none)
--- files with errors ---
src/app/api/workflow/[id]/route.test.ts
```

**6 个错误全部位于 `src/app/api/workflow/[id]/route.test.ts`（TS2538: Type 'undefined' cannot be used as an index type）**，
该文件是 **另一代理负责路径下的未跟踪文件**（`git status` 显示 `?? src/app/api/workflow/**`，8 个未跟踪测试文件），
按硬约束 3「禁止修改他人负责路径」**未做任何改动**。

已用 stash 对照验证该错误为**存量问题、与本次改动无关**：

```
# 带本次改动
npx tsc --noEmit | grep -c "error TS"  →  6
# stash 掉本次改动后
git stash push -- src/app/api/analytics src/lib/types/analytics.ts
npx tsc --noEmit | grep -c "error TS"  →  6   # 完全一致
```

即：**本次改动范围（analytics + analytics types）零类型错误**；`tsc` 非 exit 0 完全由他人未跟踪文件引起。

### 3.4 旁证：`src/components/analytics` 组件测试

```
# 带本次改动：Test Files 2 failed | 5 passed，Tests 1 failed | 150 passed
# stash 本次改动后：Test Files 2 failed | 1 passed，Tests 1 failed | 53 passed
```

失败项（`integration.test.tsx` 套件加载失败 + `AnalyticsChart.test.tsx > should render bar component`）
在 stash 前后**同样存在**，确认为存量失败，与本次改动无关（且该路径不属本任务范围）。

---

## 四、遗留问题

1. **`src/app/api/workflow/[id]/route.test.ts` 6 个 TS2538 错误**（`src/app/api/workflow/[id]/route.test.ts` 第 28/29/30/39/44/45 行）
   —— 属另一代理负责路径，本任务按约束未触碰。**需由 workflow 负责人修正后 `tsc --noEmit` 方能全局 exit 0。**
2. **`src/components/analytics/__tests__/integration.test.tsx` 套件加载失败** + `AnalyticsChart.test.tsx > should render bar component` 断言失败
   —— 存量问题，本任务范围外，未处理。
3. **`ExportFormat` 收窄后，PDF 导出能力实际缺失**。类型现在诚实地反映实现（只支持 3 种格式），
   但若产品后续需要 PDF，需**实现**而非扩类型（当前 UI 侧 `AnalyticsChart` 的导出下拉本来就只提供 csv/xlsx/json，无 pdf 入口，故暂无用户可见缺口）。
4. **`export/route.ts` 的 `getContentType()` 与实际返回**已一致；但 `export/route.test.ts` 把 `@/lib/api/error-handler` 整个 mock 掉了，
   因此该文件里的 400 断言只验证了 mock 自身的形状，**不反映真实错误体**。
   本轮新增的边界测试全部写在 `__tests__/api.test.ts`（**不 mock error-handler**，走真实实现）以覆盖真实契约。
5. `metrics/route.ts` 的 `fetchMetricsFromDatabase` 仍有多处 `|| 1` 风格的默认值（`taskStatus || 'all'` 等），
   本轮仅修与分页契约直接相关的 `page`/`limit`，其余属风格性取舍，未扩大改动面。

---

## 五、结论

**Yes**

- A（复核并收口 `api.test.ts`）：完成。**如实指出并修正了 SQL 形状替身的失真**（死分支 `COUNT(*) as count` → `COUNT(DISTINCT DATE(created_at)) as count`），
  并新增 `pagination.total === 42` 断言把它钉死；层级（timeSeries/cacheStats/pagination 属 data）与字段名（`responseTime`、`byProvider` 驼峰键）已逐条核对并补正负断言。
- 3 个 eslint warning：全部修复（2 个真未用 → 删除/收窄解构；1 个 catch → 用 `logger.error` 记录，不静默吞异常）。
- B（`ExportFormat`）：已收窄为 `'csv' | 'xlsx' | 'json'`，并核查全仓引用确认**无调用方受影响**（UI 侧本就只列这 3 种）；未新增任何依赖。
- C（边界测试）：补了 10 组（非法 body→400、非对象 body→400、非法分页→400、POST 缺字段默认值、不支持 format→400、format 缺省→csv、非法 JSON→400）。
- **额外发现并修复 2 个实现缺陷**：`||` 导致分页校验不可达（page=0 返回 200 应为 400）、非对象 JSON body 导致 500。
- **额外修复 1 个未提交半成品**：`metrics/route.ts` 尾部多余 `}`（曾直接导致 oxc 解析失败、两个测试文件无法加载）。
- 验证：`vitest` 97/97 全绿；`eslint` 0 error 0 warning；`tsc` 的 6 个错误经 stash 对照确认**全为他人未跟踪 workflow 文件的存量问题**，本次改动范围零类型错误。

**未做**：未执行任何 `git add` / `commit` / `push` / `rm --cached`；未修改 `src/app/api/workflow/**`、`API.md`、`CHANGELOG.md`；未新增依赖；未改动 `7zi-frontend/` 旧副本树；未 skip/删除/弱化任何测试。
