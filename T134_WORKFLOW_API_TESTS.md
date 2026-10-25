# T134 — workflow API 测试补齐/加固报告

- **任务编号**：T134
- **执行角色**：🧪 测试员
- **执行时间**：2026-10-25 10:47 ~ 11:00 (Asia/Shanghai)
- **允许修改路径**：`src/app/api/workflow/history/**`、`src/app/api/workflow/templates/**`、`src/app/api/workflow/trigger/**`
- **结论**：**Partial**（在允许范围内已全部覆盖；`templates/` 与 `trigger/` 路由在本仓库中不存在）

---

## 1. 侦查结果：workflow 路由清单与测试覆盖情况

`ls src/app/api/workflow/` 实际结构：

| 路由 | 实现文件 | 原有测试 | 状态 |
|---|---|---|---|
| `GET/POST /api/workflow` | `src/app/api/workflow/route.ts` | `route.test.ts` (8) | 已覆盖 |
| `GET /api/workflow/[id]/history` | `src/app/api/workflow/[id]/history/route.ts` | `route.test.ts` (5) | 已覆盖（**并行任务锁定，禁止修改**） |
| `GET /api/workflow/[id]/metrics` | `.../[id]/metrics/route.ts` | ❌ 无 | 不在本任务允许路径内（位于 `[id]/` 下） |
| `GET /api/workflow/[id]/stream` (SSE) | `.../[id]/stream/route.ts` | ❌ 无 | 同上 |
| `GET /api/workflow/[id]/versions/compare` | `.../versions/compare/route.ts` | ❌ 无 | 同上 |
| `GET/PUT .../versions/settings` | `.../versions/settings/route.ts` | ❌ 无 | 同上 |
| `GET .../versions` | `.../versions/route.ts` | `__tests__/api.test.ts` (15) | 已覆盖 |
| `GET .../versions/[versionId]` | — | `route.test.ts` (5) | 已覆盖 |
| `POST .../versions/[versionId]/rollback` | — | `route.test.ts` (6) | 已覆盖 |
| `GET .../executions` | — | `route.test.ts` (1) | 已覆盖 |
| `GET .../executions/[execId]` | — | `route.test.ts` (4) | 已覆盖 |
| `POST .../executions/[execId]/cancel` | — | `route.test.ts` (7) | 已覆盖 |
| `GET .../run` | — | `route.test.ts` (2) | 已覆盖 |
| **`POST /api/workflow/history/export`** | `src/app/api/workflow/history/export/route.ts` | `route.test.ts` (5，**本次加固**) | ✅ 本次重点 |
| `templates/` | — | — | **目录不存在** |
| `trigger/` | — | — | **目录不存在** |

> **说明**：`src/app/api/workflow/templates/` 与 `src/app/api/workflow/trigger/` 在本仓库中**不存在**（`find src/app/api -type d` 全量确认；`/api/reports/templates` 是另一个路由，不属于本次允许路径）。因此本任务的有效工作面只有 `history/export` 一个路由。

---

## 2. 交付的测试文件

| 文件 | 状态 | 用例数 | 说明 |
|---|---|---|---|
| `src/app/api/workflow/history/export/route.test.ts` | 修改（加固） | 15 | 单元测试，沿用仓库既有 `vi.hoisted` + `vi.mock('@/lib/workflow/history')` mock 风格 |
| `src/app/api/workflow/history/export/integration.test.ts` | 新增 | 7 | 集成测试，接入**真实** `workflowHistoryService` + **真实** SQLite（`:memory:`） |

### 2.1 `route.test.ts`（单元，5 → 15）

原有 5 例全部保留未弱化，新增 10 例：

1. `filter: null` → 走 `|| {}` 兜底为空对象
2. 完整 9 字段 filter（workflowId/operation/userId/success/startTime/endTime/relatedVersionId/relatedInstanceId/relatedNodeId）原样透传给 service
3. `format=csv` 时 **不**调用 JSON exporter（互斥断言）
4. `format=json` 时 **不**调用 CSV exporter
5. 空导出场景：`csv=''` + `recordCount=0` + `filename=workflow_history_empty.csv`
6. 大小写敏感的 format（`'CSV'` → 400），确认实现不隐式归一化
7. CSV exporter 抛错 → 500 `INTERNAL_ERROR`
8. service reject 非 Error 值（字符串 `'boom'`）→ 500 且 message 正确
9. **非法 JSON 请求体** → 当前行为 500（见缺陷 D1）
10. **`null` JSON 请求体** → 当前行为 500（见缺陷 D2）

### 2.2 `integration.test.ts`（集成，新增，7 例）

覆盖 `POST /api/workflow/history/export` 真实链路（真实 service + 真实 SQLite 表 `workflow_history`）：

1. CSV 导出只包含过滤后的 workflow 行；断言完整 14 列表头、`X-Record-Count=2`、文件名正则 `workflow_history_*.csv`、不泄漏 `other_workflow`
2. CSV 双引号转义：`Created "quoted" workflow` → `"Created ""quoted"" workflow"`
3. JSON 导出完整载荷结构：`totalRecords` / `entries` / `exportedAt` / `summary.byUser` / `successRate=0.5` / `avgDuration=150`
4. `success=false` 过滤器生效，且 `errorCode` / `errorMessage` 被带出
5. `operation` + `userId` 组合过滤器生效
6. 无 filter 时导出全部 3 条（`X-Record-Count=3`）
7. 空结果导出：CSV body 为空串、`X-Record-Count=0`、`filename=workflow_history_empty.csv`

**技术说明**：仓库全局 `tests/setup.ts` → `src/test/vi-mocks.ts` 会把 `@/lib/db/connection` 替换成一个手写内存表替身。该替身的 WHERE 参数绑定不忠实（无法正确处理 `workflow_history` 的多条件查询），首轮集成测试因此 5 例失败。本文件用 `vi.mock('@/lib/db/connection', () => vi.importActual(...))` 在文件级恢复**真实** SQLite 实现，验证真实聚合与转义行为。

---

## 3. 真实 vitest 输出

命令（任务要求的可独立执行命令）：

```
npx vitest run src/app/api/workflow/history src/app/api/workflow/templates
```

```
 ✓ src/app/api/workflow/history/export/integration.test.ts  (7 tests) 160ms
 ✓ src/app/api/workflow/history/export/route.test.ts  (15 tests) 218ms

 Test Files  2 passed (2)
      Tests  22 passed (22)
   Start at  10:59:56
   Duration  5.38s (transform 1.42s, setup 1.67s, import 1.42s, tests 0.38s, environment 3.63s)
```

回归（整个 workflow API 目录）：

```
npx vitest run src/app/api/workflow

 Test Files  12 passed (12)
      Tests  82 passed (82)
```

- 修复前基线：`src/app/api/workflow/history` = 1 file / 5 tests
- 修复后：`src/app/api/workflow/history` = 2 files / **22 tests**（净增 17 例，覆盖强度提升 4.4×）
- `npx tsc --noEmit`：无 `workflow/history` 相关类型错误
- `npx eslint`：0 error（原 `as any` 已全部移除，现为 0 warning）

---

## 4. 发现缺陷清单（实现层，未擅自修改）

> 以下均位于 `src/app/api/workflow/history/export/route.ts`，**本任务只写测试、不改实现**，交由主管另行派单。

### D1 — 非法 JSON 请求体返回 500 而非 400

- **文件/行号**：`src/app/api/workflow/history/export/route.ts:20`（`const body = await request.json()`）
- **复现**：
  ```
  curl -X POST http://localhost:3000/api/workflow/history/export \
    -H 'Content-Type: application/json' -d '{not-json'
  ```
  实际响应：`500` + `error.type = "INTERNAL_ERROR"`（JSON.parse 的 SyntaxError 落入 catch 分支）
- **期望**：客户端输入错误应返回 `400 VALIDATION_ERROR`（参考同文件第 25 行对 `format` 的处理，以及 `src/app/api/workflow/[id]/history/route.ts` 的 validation 约定）
- **测试锚点**：`route.test.ts` 用例「should surface a malformed JSON body as a structured 500 error without invoking the exporter」——该用例**锁定当前行为**（断言 500），修复为 400 时会被显式看到并同步更新

### D2 — `null` JSON 请求体触发 TypeError 返回 500

- **文件/行号**：`src/app/api/workflow/history/export/route.ts:21`（`const format = body.format || 'json'`）
- **复现**：
  ```
  curl -X POST http://localhost:3000/api/workflow/history/export \
    -H 'Content-Type: application/json' -d 'null'
  ```
  实际响应：`500` + `error.type = "INTERNAL_ERROR"`（`body` 为 `null`，读取 `body.format` 抛 `TypeError: Cannot read properties of null`）
- **期望**：应与 D1 一并返回 `400 VALIDATION_ERROR`
- **测试锚点**：`route.test.ts` 用例「should surface a null JSON body as a structured 500 error without invoking the exporter」

### D3 — `X-Record-Count` 与 JSON 载荷 `totalRecords` 语义不一致

- **文件/行号**：`src/app/api/workflow/history/export/route.ts:44`（`X-Record-Count: result.recordCount`）vs `src/lib/workflow/history.ts:391`（`totalRecords: result.total`）与 `:400`（`recordCount: result.entries.length`）
- **说明**：`exportToJSON` 的 `recordCount` 取 `entries.length`（受 `limit: 10000` 截断），而 JSON 正文里的 `totalRecords` 取数据库**未截断**的 `total`。当命中记录数 > 10000 时，`X-Record-Count` 响应头与 JSON 正文 `totalRecords` 会给出两个不同的数字，客户端无法判断是否被截断。
- **复现**：在 `workflow_history` 表中插入 > 10000 条记录后调用导出接口，对比 `X-Record-Count` 与 `payload.totalRecords`
- **附带问题**：CSV 导出没有对应的「total」信息，客户端完全无从得知是否被截断
- **测试锚点**：本次集成测试用小数据集断言 `X-Record-Count === payload.totalRecords`（当前一致），但**未能**覆盖 >10000 截断场景（测试环境数据量过大，不适合在本任务预算内做）

### D4 — `format` 校验无法区分「非法值」与「未提供」以外的类型

- **文件/行号**：`src/app/api/workflow/history/export/route.ts:21,25`
- **说明**：`body.format` 若为非字符串（如数字 `1`、数组 `[]`），会被 `!== 'csv' && !== 'json'` 判定为非法并返回 400——这部分行为正确；但 `body.format` 为 `0` 或 `''`（falsy）时会被 `|| 'json'` 静默改写为 `'json'`，即「非法输入被当作合法默认值处理」。属于校验宽松度问题，非崩溃缺陷。

### D5 — 测试基础设施：全局 DB 替身 WHERE 参数绑定不忠实（影响面：全仓库，非本任务范围）

- **文件/行号**：`src/test/vi-mocks.ts`（`executeAll` / `executeGet` 的 `whereWorkflowMatch` 与 `parseWhereClause` 参数下标处理）
- **现象**：全局替身对 `WHERE workflow_id = ?` 做了特判并单独消费第 0 个参数，随后通用 `parseWhereClause` 分支又用未偏移的 `paramIndex` 二次匹配，导致多条件查询（如 `workflow_id = ? AND operation = ?`）在替身上结果不可信。首轮集成测试 5 例失败即由此暴露。
- **规避方式**：本任务在 `integration.test.ts` 内用 `vi.importActual` 恢复真实 SQLite；**未修改** `src/test/vi-mocks.ts`（不在允许路径内，且属 `src/test/` 而非 `src/lib/`）
- **建议**：主管另行派单修复替身，或在 `vi-mocks.ts` 注释中明确该替身不支持多条件 WHERE，强制集成测试走真实 DB

---

## 5. 遗留

1. `src/app/api/workflow/templates/`、`src/app/api/workflow/trigger/` 不存在，无可测路由；若主管预期它们存在，说明存在路由缺失或路径变更，需确认需求。
2. `src/app/api/workflow/[id]/metrics`、`/[id]/stream`、`/[id]/versions/compare`、`/[id]/versions/settings` **仍无测试文件**，但位于 `[id]/` 目录（并行任务锁定），本任务越界未动。共 4 个路由待派单。
3. `POST /api/workflow/history/export` 的 >10000 条截断行为（D3）未做数据量级测试。
4. SSE（`/[id]/stream`）的路由级测试需要 TransformStream / 定时器控制，成本较高，建议单独立单。
5. 未执行 `git add` / `commit` / `push`，全部改动留在工作区待主管统一提交。

---

## 6. 结论

**Partial**

- 理由：允许修改路径 `history/**`、`templates/**`、`trigger/**` 中，**实际存在的只有 `history/export` 一个路由**，已做到 100% 覆盖（单元 15 例 + 集成 7 例，共 22 例，全绿，且 `npx vitest run src/app/api/workflow/history src/app/api/workflow/templates` 可独立通过，退出码 0）。
- 未达 Yes 的原因：任务描述隐含假设 `templates/` 与 `trigger/` 路由存在，实际不存在；另有 4 个无测试的 workflow 路由位于被锁定的 `[id]/` 路径下，需主管另行派单。
- 质量约束全部满足：无 `git add/commit/push`；无 skip / 弱化断言；无 `as any` / `@ts-ignore` / `eslint-disable`；未改 vitest 配置；未新增依赖；未改 `src/lib/**`；未改 `src/app/api/workflow/[id]/**`；未擅自修改实现层代码（5 个缺陷全部写入报告待派单）。
