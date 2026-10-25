# T123 — Workflow API 测试补齐报告

**任务**：为 `src/app/api/workflow/**` 路由族补齐 Vitest 测试（按风险优先级挑选写操作/路径参数/状态机流转类路由）
**执行人**：🧪 测试员子代理
**日期**：2026-10-25
**结论**：**Partial**（8 个路由已覆盖并全绿；4 个路由因预算/风险收益未覆盖；基线已有 4 个失败用例为 T123 之前既存，与本次改动无关）

---

## 1. 覆盖的路由清单与理由

| # | 路由 | 方法 | 用例数 | 选取理由（风险维度） |
|---|------|------|--------|--------------------|
| 1 | `src/app/api/workflow/route.ts` | POST, GET | 8 | **写操作**：创建工作流，含服务端校验（缺 name → 400、引擎校验失败 → 400）；列表含过滤/分页 |
| 2 | `src/app/api/workflow/[id]/route.ts` | GET, PUT, DELETE | 8 | **写操作 + 路径参数解析 + 缓存状态**：读详情（LRU 缓存命中/失效）、更新（版本自增 + 校验）、删除（级联清理） |
| 3 | `src/app/api/workflow/[id]/versions/[versionId]/route.ts` | GET, DELETE | 5 | **双重路径参数解析 + 归属校验 + 写操作**：版本号归属 workflow 校验；DELETE 被实现层禁止（403） |
| 4 | `src/app/api/workflow/[id]/versions/[versionId]/rollback/route.ts` | POST | 6 | **副作用最强的写操作**：回滚会产生新版本快照；覆盖 404/归属不符/500 |
| 5 | `src/app/api/workflow/[id]/executions/[execId]/cancel/route.ts` | POST | 7 | **状态机流转**：running→cancelled；终态（completed/failed/cancelled）拒绝取消；workflow 归属校验 |
| 6 | `src/app/api/workflow/[id]/executions/[execId]/route.ts` | GET | 4 | **路径参数解析 + 归属校验**：执行详情（execution/nodes/metrics/alerts） |
| 7 | `src/app/api/workflow/history/export/route.ts` | POST | 5 | **写操作 + 文件下载副作用**：CSV/JSON 导出，含 format 校验 400 与响应头断言 |
| 8 | `src/app/api/workflow/[id]/history/route.ts` | GET | 5 | **查询参数校验**：limit/offset 边界 400，filter 透传断言 |

**合计新增 48 个用例**，全部通过。

### 未覆盖路由及原因

| 路由 | 原因 |
|------|------|
| `src/app/api/workflow/[id]/versions/compare/route.ts` | 已有 `versions/__tests__/api.test.ts` 覆盖 2 条 400 分支；成功路径需构造完整版本快照 diff，成本高于收益 |
| `src/app/api/workflow/[id]/versions/settings/route.ts` | 已有 `versions/__tests__/api.test.ts` 覆盖 GET/PUT + 3 条 400 分支（maxVersions 上下界、retentionDays），无需重复 |
| `src/app/api/workflow/[id]/versions/route.ts` | 已有 `versions/__tests__/api.test.ts` 覆盖 POST 创建 + 校验 |
| `src/app/api/workflow/[id]/metrics/route.ts` | 只读聚合路由，无副作用、响应结构由 monitoring 内部决定；风险优先级最低，预算用尽 |
| `src/app/api/workflow/[id]/stream/route.ts` | SSE 长连接流，handler 返回 `ReadableStream` 且不返回、依赖 `realtimeService` 与 `TransformStream` 生命周期，单测难以稳定断言（易挂起）；风险收益最低 |
| `src/app/api/workflow/[id]/run/route.ts` | 已有 `run/route.test.ts`（当前 2 条用例处于失败基线，见 §5），避免与 T122 冲突 |
| `src/app/api/workflow/[id]/executions/route.ts` | 已有 `executions/route.test.ts`（当前 1 条用例处于失败基线，见 §5） |

---

## 2. 改动文件列表（仅新增测试文件，未改动任何实现）

| 文件 | 行数 |
|------|------|
| `src/app/api/workflow/route.test.ts` | 185 |
| `src/app/api/workflow/[id]/route.test.ts` | 270 |
| `src/app/api/workflow/[id]/history/route.test.ts` | 143 |
| `src/app/api/workflow/[id]/versions/[versionId]/route.test.ts` | 150 |
| `src/app/api/workflow/[id]/versions/[versionId]/rollback/route.test.ts` | 189 |
| `src/app/api/workflow/[id]/executions/[execId]/route.test.ts` | 158 |
| `src/app/api/workflow/[id]/executions/[execId]/cancel/route.test.ts` | 141 |
| `src/app/api/workflow/history/export/route.test.ts` | 136 |
| **合计** | **1372 行** |

未执行 git add / commit / push（按约束留给主管统一提交）。
未修改 `src/app/api/workflow/**` 下任何 `route.ts` 实现文件；未触碰 `src/app/api/analytics/**`、`src/lib/types/analytics.ts`、`API.md`、`CHANGELOG.md`；未新增任何依赖。

---

## 3. 测试写法要点

- 直接 `import { GET, POST, PUT, DELETE } from './route'`，用 `new NextRequest(new URL(url,'http://localhost'), { method, headers, body })` 调用，参数用 `Promise.resolve({ id, versionId, execId })`。
- 外部依赖全部 `vi.mock` + `vi.hoisted` 提供**确定性**数据：
  - `@/lib/db/connection` → 手写内存行表（`dbRows`），`get/exec` 按 SQL 关键字分流，模拟 version 自增与删除。
  - `@/lib/workflow/version-service` → `getVersion` / `rollbackToVersion` / `getVersionSettings` / `createVersion` / `deleteAllVersions` 全部 mock。
  - `@/lib/workflow/monitoring` → `getExecution` / `cancelExecution` / `getExecutionDetails` mock。
  - `@/lib/workflow/history` → `queryHistory` / `exportToCSV` / `exportToJSON` mock。
  - `@/lib/logger` → 静音（避免 `createErrorResponse` 内部 logger 副作用）。
- 唯一非确定性值是 `POST /api/workflow` 返回的 `id`（实现用 `Date.now()+Math.random()`），断言只用 **前缀正则** `/^workflow_/`，不做值断言。
- 断言均针对**真实响应体结构**（`data.data.*` / `data.error.type` / `data.execution.*` / 响应头 `Content-Disposition`、`X-Record-Count`），未使用仅断言 `res.ok`/`status` 的空断言。

---

## 4. 验证命令与输出摘要

### 4.1 `npx vitest run src/app/api/workflow`

```
 Test Files  3 failed | 8 passed (11)
      Tests  4 failed | 62 passed (66)
```

新增的 8 个测试文件 **48/48 全绿**：

```
 ✓ src/app/api/workflow/route.test.ts (8 tests)
 ✓ src/app/api/workflow/[id]/route.test.ts (8 tests)
 ✓ src/app/api/workflow/[id]/history/route.test.ts (5 tests)
 ✓ src/app/api/workflow/[id]/versions/[versionId]/route.test.ts (5 tests)
 ✓ src/app/api/workflow/[id]/versions/[versionId]/rollback/route.test.ts (6 tests)
 ✓ src/app/api/workflow/[id]/executions/[execId]/route.test.ts (4 tests)
 ✓ src/app/api/workflow/[id]/executions/[execId]/cancel/route.test.ts (7 tests)
 ✓ src/app/api/workflow/history/export/route.test.ts (5 tests)
```

### 4.2 `npx eslint src/app/api/workflow --ext .ts`

```
✖ 5 problems (0 errors, 5 warnings)
EXIT=0
```

0 errors。5 条 warning 全部落在**既存实现文件**（`[id]/history/route.ts`、`[id]/route.ts`、`[id]/versions/route.ts`、`history/export/route.ts` 的未使用 import 与一处 `any`），**新增测试文件 0 warning**（eslint 配置忽略 `**/*.test.ts`，因此测试文件不参与 lint；实现文件 warning 为改动前既存状态）。

---

## 5. 既存失败基线（如实记录，非本次引入）

以下 4 个失败在 T123 开始前的基线运行中**已存在**（首跑 `npx vitest run src/app/api/workflow` 即为 `3 failed | 14 passed`），与本次新增测试无关：

| 文件 | 失败用例 | 现象 |
|------|---------|------|
| `src/app/api/workflow/[id]/executions/route.test.ts` | `should return list of executions` | 期望数组，实际返回对象 |
| `src/app/api/workflow/[id]/run/route.test.ts` | `should execute workflow and return execution id` | 期望 400，实际 200（实现无 id 校验） |
| `src/app/api/workflow/[id]/run/route.test.ts` | `should validate required workflow id` | 期望 400，实际 200 |
| `src/app/api/workflow/[id]/versions/__tests__/api.test.ts` | `should support pagination parameters` | `data.data.limit` 为 `undefined` |

按约束**未 skip / 未删除 / 未弱化**这些用例，交由 T122 或主管处理。

---

## 6. 暴露的实现缺陷清单（未擅自修改实现）

### D1 — `GET /api/workflow?limit=abc` 未校验分页参数，返回 `limit: null`（高）

- 位置：`src/app/api/workflow/route.ts`（GET）
- 复现：`GET /api/workflow?limit=abc` → HTTP 200，响应体 `{"workflows":[],"total":1,"limit":null,"offset":0}`
- 原因：`parseInt(...)` 结果未做 `isNaN` 校验，且 `parseInt('abc')` → `NaN` → JSON 序列化为 `null`；随后 `slice(NaN, NaN)` 得空数组，导致 `total` 与 `workflows.length` 自相矛盾（total=1 但数组为空）。
- 对比：`[id]/history/route.ts` 同一模式有 `isNaN(limit) || limit < 1 || limit > 1000` 校验，说明这里是遗漏。
- 建议：`if (isNaN(limit) || limit < 1) return createValidationError(...)`，offset 同理。

### D2 — `GET /api/workflow` 过滤与分页的 `total` 语义不一致（中）

- 位置：`src/app/api/workflow/route.ts`（GET）
- 现象：`total` 取自 `filtered.length`（过滤后），但 `workflows` 已被 `slice` 截断；当 `limit < filtered.length` 时 `total !== workflows.length`，前端无法据此计算总页数。
- 建议：`total` 应为过滤后总数，另加 `filteredTotal` 或 `hasMore`。

### D3 — `POST /api/workflow` 请求体非法 JSON 返回 500 而非 400（中）

- 位置：`src/app/api/workflow/route.ts`（POST）
- 复现：body = `'{not-json'` → HTTP 500，`error.type = INTERNAL_ERROR`，message 为 JSON 解析器原文 `Expected property name or '}' in JSON at position 1 ...`
- 原因：`await request.json()` 的 SyntaxError 落入通用 catch，被 `createErrorResponse` 归类为内部错误。
- 建议：在 catch 中对 `SyntaxError` 单独返回 `createValidationError('请求体不是合法 JSON')`（400）。

### D4 — `POST /api/workflow` 未校验 `nodes` / `edges` 类型，可能把非数组传入 `validateWorkflow`（中）

- 位置：`src/app/api/workflow/route.ts`（POST）
- 现象：`body.nodes` 传入对象（如 `{a:1}`）时，`workflow.nodes = body.nodes || []` 会保留该对象，`validateWorkflow` 内 `workflow.nodes.length === 0` 判定不成立，随后 `workflow.nodes.forEach` 抛 `TypeError` → 500。
- 建议：构造 workflow 前显式校验 `Array.isArray(body.nodes)` / `Array.isArray(body.edges)`，非法返回 400。

### D5 — `GET /api/workflow/[id]` 的 LRU 缓存无失效兜底，PUT/DELETE 之外路径可能读到陈旧数据（中）

- 位置：`src/app/api/workflow/[id]/route.ts`
- 现象：缓存键为 `workflow:${id}`，PUT/DELETE 会 `delete` + `invalidateTag('workflow')`，但 `invalidateTag` 只清理注册到 `cacheTags` 的键；而 `registerTag('workflow', cacheKey)` 只在 GET 的缓存写入分支执行，且 **删除后 `cacheTags` 里仍残留其它 workflow 的键**，标签清理与键集合并非严格一致。
- 另一处不一致：GET 命中缓存时**直接返回缓存值**，若工作流已被其它进程删除，GET 仍返回 200 + 旧数据，直到 TTL（5 分钟）过期。
- 建议：GET 命中缓存后可选做一次存在性校验；或改为按 workflowId 精确失效。

### D6 — `POST /api/workflow/[id]/versions/[versionId]/rollback` 归属不匹配返回 404 而非 403/400（低）

- 位置：`src/app/api/workflow/[id]/versions/[versionId]/rollback/route.ts`
- 现象：version 存在但 `version.workflowId !== workflowId` 时，统一按 `Version not found` 返回 404。
- 说明：404 可避免资源枚举泄漏，属于**可接受的设计选择**，但与同仓其它路由（如执行详情 400 `Execution does not belong to this workflow`）不一致，建议统一约定并在 API.md 记录。

### D7 — `DELETE /api/workflow/[id]/versions/[versionId]` 拒绝删除时返回 403 但 `error.type` 为 `INTERNAL_ERROR`（低）

- 位置：`src/app/api/workflow/[id]/versions/[versionId]/route.ts`
- 现象：状态码是 403，但响应体 `error.type` 是 `INTERNAL_ERROR`（实现走 `createErrorResponse` 的默认分支）。
- 建议：改用 `createErrorResponse(new ApiError(ErrorType.FORBIDDEN, ...), 403)` 或已有的 `createForbiddenError`，使 `error.type` 与状态码一致。

### D8 — `GET /api/workflow/[id]/metrics` 未做参数合法性校验（低）

- 位置：`src/app/api/workflow/[id]/metrics/route.ts`
- 现象：`trendDays`、`bottleneckLimit` 直接 `parseInt` 未校验 `isNaN`，非法值会原样透传给 `workflowMonitoring`。
- 说明：本次未覆盖该路由（预算），仅在代码走查中记录。

### D9 — 若干实现文件存在未使用的 import（低，lint warning）

- `src/app/api/workflow/[id]/history/route.ts:13` `createNotFoundError` 未使用
- `src/app/api/workflow/[id]/versions/route.ts:13` `createNotFoundError` 未使用
- `src/app/api/workflow/history/export/route.ts:9` `createSuccessResponse` 未使用
- `src/app/api/workflow/[id]/route.ts:9` `WorkflowEngine` 未使用
- 另：`[id]/route.ts:187` 存在 `any`（`createVersion(updatedWorkflow as any, ...)`）

---

## 7. 结论

**Partial**

- 已完成：8 个高风险路由的 API 测试补齐，新增 **48 个用例，全部通过**；`eslint` 0 errors；未改动任何实现文件，未提交 git。
- 未完成（受 12 分钟预算约束主动收敛）：`metrics`、`stream` 两个低风险只读路由，以及已被既有测试覆盖的 `compare` / `settings` / `versions` 三个路由。
- 发现 **9 项实现缺陷**（D1–D9），其中 D1/D3/D4 为可直接被外部请求触发的输入校验缺口，建议优先修复（修复路径与 T122 可能重叠，需主管协调）。
