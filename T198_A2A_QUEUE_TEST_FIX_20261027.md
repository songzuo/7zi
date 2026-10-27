# T198：a2a-queue 集成测试失败修复报告

- 日期：2026-10-27
- 执行者：测试工程师（子代理）
- 任务：T198 a2a-queue 集成测试失败修复
- 唯一改动文件：`tests/api-integration/a2a-queue.test.ts`
- 结论：**Yes**

---

## 一、根因分析

### 总根因（一句话）

这份测试文件断言的**是一套从未存在过的「任务调度队列」API 契约**，
而生产实现 `src/app/api/a2a/queue/route.ts` 是一套**「A2A 消息队列」API**。
两者从落地那天起（commit `7d972bd00d`，2026-03-29）就对不上，
测试文件从诞生起就是 100% 失败的（模块都加载不了），
后来被 `agent-scheduler-compat.ts` 兼容层「救活」也只是让它跑起来，断言仍然全部对不上实现。

因此：这是**测试问题**，不是实现问题。实现侧契约有 `docs/API.md`、
`A2A_PROTOCOL_V2_IMPLEMENTATION.md`、A2A AgentCard 背书，属于对外契约，
按任务约束「以实现为准对齐测试」，本次**没有改任何实现代码**。

### 逐类失败对照

| # | 实际失败类型 | 代码位置 | 判定 | 处理方式 |
|---|---|---|---|---|
| 1 | `TypeError: PUT is not a function`（×5） | 测试第 10 行 `import { GET, POST, PUT, DELETE } from '@/app/api/a2a/queue/route'`；`src/app/api/a2a/queue/route.ts` 只导出 `GET/POST/DELETE` | **测试问题**：实现从来就没有 PUT（`7d972bd00d` 初版也只导出 GET/POST/DELETE） | 删除 PUT 导入与整块「PUT /api/a2a/queue」用例；任务状态更新语义在本 API 中不存在（队列只做入队/出队/清理） |
| 2 | `TypeError: Cannot read properties of undefined (reading 'task')`（×9）、`…'tasks'`（×6）、`…'stats'`（×4）、`…'taskId'`（×2） | 测试读 `json.data.*`；实现用 `NextResponse.json` 返回**扁平**信封：`GET → { status, stats, nextMessage, config }`、`POST → { message, queueSize, queuedMessage }`、`DELETE → { message, removed, queueSize }` | **测试问题**：测试自己 mock 的 `createSuccessResponse`（`{ success, data }`）**从未被该路由使用** —— 路由直接用 `NextResponse.json` | 全部断言改为读实现真实信封（`json.stats.*` / `json.queuedMessage.*` / `json.queueSize`）；移除已无意义的 `@/lib/api/error-handler` mock |
| 3 | `AssertionError: expected { type: 'UNAUTHORIZED', …(2) } to be 'Unauthorized'`（×1） | 测试断言 `json.error === 'Unauthorized'`；`src/lib/agents/a2a/auth.ts` 的 `unauthorized()` 返回 `{ success:false, error:{ type:'UNAUTHORIZED', message, timestamp } }` | **测试问题**：401 信封在 `8d4fb22e41`（A2A 鉴权接入）时统一为仓库 ErrorResponse 契约，属对外契约，未改 | 断言改为 `json.error.type === 'UNAUTHORIZED'`，并断言 `message`/`timestamp` 为字符串（**比原断言更强**，不是弱化） |
| 4 | `AssertionError: expected 200 to be 404`（×2） | 测试期望 `GET ?id=non-existent` 与 `PUT` 不存在任务 → 404；实现的 GET 无 `?id=` 参数语义，DELETE 无「单任务」概念，POST 无 PUT | **测试问题**：这些状态码针对的是不存在的 API 形态 | 删除这些针对不存在契约的用例；改为覆盖实现真实存在的 400（缺 taskId/agentId）、404 不再出现 |
| 5 | `AssertionError: expected undefined to be true`（×1） | 测试 `expect(json.success).toBe(true)`；实现的成功响应**没有** `success` 字段（`NextResponse.json` 直接返回业务载荷） | **测试问题**：实现不承诺 `success` 字段 | 改为断言实现真实字段（`json.message`、`json.queuedMessage.*`、`json.queueSize`），语义等价且更强 |
| 6 | （根因）测试 mock `@/lib/api/error-handler` 但路由根本不用它 | 测试第 27–45 行 | **测试问题** | 删除该 mock（它是「假装有信封」的根源） |
| 7 | （根因）测试用 `agent-scheduler-compat.ts` 的内存任务桩造数据 | 测试全文 `agentScheduler.scheduleTask(...)` | **测试问题**：该 queue 路由完全不碰 agent registry / task store，它操作的是 `getMessageQueue()` 单例 | 改用 `getMessageQueue()` / `resetMessageQueue()` 造数与断言；**兼容层文件未动**（归同事独占） |

### 为什么不能改实现来「迁就」测试

若为了满足旧测试而给 `/api/a2a/queue` 加 `PUT`、加 `{ success, data }` 信封、
加 `?id=` 单任务查询，就是**凭空发明一个对外 API**，会与
`docs/API.md`（§GET/POST/DELETE /api/a2a/queue）、
`A2A_PROTOCOL_V2_IMPLEMENTATION.md`、A2A AgentCard 的声明冲突，
并违反任务约束「禁止改对外契约」。故一律以实现为准改测试。

### 一个「实现看着像 bug、但按契约不改」的点

`POST /api/a2a/queue` 传入非法 `priority`（如 `urgent`）时，
实现走到 `PriorityMessageQueue.enqueue()` 抛 `Invalid priority: urgent`，
被路由 catch 成 **500**（而不是 400）。
从语义上 400 更合理，但：
- 路由的 400 分支只覆盖「缺 taskId/agentId」；
- 改成 400 属于改对外状态码契约，超出本任务授权范围。

因此测试按**实现现状**断言 500，并把它写进下面的「遗留项」交回主管裁决。

---

## 二、改动清单

**文件：`tests/api-integration/a2a-queue.test.ts`（唯一改动文件）**

`git diff --stat`：`335 insertions(+), 680 deletions(-)`（旧 1026 行 → 新 681 行）

| 改动 | 说明 |
|---|---|
| 删除 `PUT` 导入 | queue 路由无 PUT handler |
| 删除 `import { agentScheduler } from './mocks/agent-scheduler-compat'` | 该路由不涉及 agent registry / task 桩；**兼容层文件本身未修改** |
| 删除 `@/lib/api/error-handler` 的 `vi.mock` | 路由不用 `createSuccessResponse`，此 mock 是「假信封」根源 |
| 保留并修正 `@/lib/auth/service` mock | 与 `src/lib/agents/a2a/auth.ts` 实际依赖一致（`authenticateToken` 返回 `{ user, context }`） |
| 新增 `anonRequest()` | 401 用例必须**不带**凭据（旧测试带假 Bearer 却断言 401，语义自相矛盾） |
| 新增 `enqueue()` 测试助手 | 统一 POST 造数与 201 断言 |
| 改用 `getMessageQueue()` / `resetMessageQueue()` | 直接对真实队列单例造数/断言（`stats.byAgent` 是 Map，JSON 序列化会丢，所以查原始实例） |
| GET 段 | 重写为 `status:'ok'` / `stats.total` / `stats.byPriority` 四桶 / `stats.byAgent` / `nextMessage` 优先级 peek（peek 不出队）/ `config` 三项 |
| POST 段 | 重写为 400 缺 taskId、400 缺 agentId、500 非法 priority、201 入队成功、id 自动生成/保留、priority 默认 normal/自定义、payload 默认 `{}`、maxAttempts 默认 3/自定义、attempts 默认 0、createdAt 自动打/保留、queueSize 递增、按 agent 隔离 |
| PUT 段 | **整段删除**（实现无此 handler；任务状态更新语义不属于本 API） |
| DELETE 段 | 重写为 401、200 全量清空、?agentId= 精确删除、?agentId= 无命中删 0 条、?priority= 精确删除、?priority= 无命中删 0 条 |
| 集成段 | 重写为「入队→观测→清空」全生命周期、优先级出队顺序、按 agent 清理不影响他人、retry 计数递增、超过 maxAttempts 停止 retry |
| 文件头注释 | 记录「整份重写」的原因、依据的实现文件路径、以及重写原则 |

未触碰：`src/app/api/a2a/queue/route.ts`、`src/lib/agents/a2a/*`、
`tests/api-integration/mocks/agent-scheduler-compat.ts`、
`tests/api-integration/a2a-registry.test.ts`、`tests/api-integration/a2a-jsonrpc.test.ts`、
`vitest.config.ts` / `tsconfig*.json` / `eslint.config.mjs` / `package.json`，
以及工作树中已有的未提交文件（`src/lib/api/timeout-wrapper.ts`、
`src/lib/logger/__tests__/logger.test.ts`、`src/test/vi-mocks.ts`、`tests/setup.ts`、
`memory/*`、`state/tasks.json`）。

---

## 三、验证（真实输出）

### 1. `npx vitest run tests/api-integration/a2a-queue.test.ts`

```
 RUN  v4.1.12 /root/.openclaw/workspace

 ✓ tests/api-integration/a2a-queue.test.ts (36 tests) 136ms

 Test Files  1 passed (1)
      Tests  36 passed (36)
   Start at  05:48:58
   Duration  3.47s (transform 882ms, setup 1.34s, import 352ms, tests 136ms, environment 1.34s)
```

修复前：`Tests 35 failed | 5 passed (40)` → 修复后：`Tests 36 passed (36)`。

（stderr 里有一条 `Queue POST error: Error: Invalid priority: urgent`，
是「非法 priority 返回 500」那条用例的预期路径日志，非失败。）

### 2. `npx tsc --noEmit`

```
EXIT:0
```
（无任何输出，0 error。）

### 3. `npx eslint tests/api-integration/a2a-queue.test.ts`

```
/root/.openclaw/workspace/tests/api-integration/a2a-queue.test.ts
  0:0  warning  File ignored because of a matching ignore pattern. Use "--no-ignore" to disable file ignore settings or use "--no-warn-ignored" to suppress this warning

✖ 1 problem (0 errors, 1 warning)

EXIT:0
```

**0 error**。该 warning 来自 `eslint.config.mjs` 的 `ignores` 里已有 `'tests/**'`
（第 76 行）—— 仓库配置把整个 `tests/` 目录排除在 lint 之外，
**属既有配置，不是本次引入**，且按约束不得改 `eslint.config.mjs`。
故 `npx eslint` 对本文件实际不生效；为确保代码质量，
额外用 `grep` 确认本次改动**未引入**任何被禁项：

```
$ grep -n "as any\|@ts-ignore\|@ts-expect-error\|@ts-nocheck\|eslint-disable\|it.skip\|describe.skip" tests/api-integration/a2a-queue.test.ts
grep-exit:1   # 无匹配
```

### 4. 回归：`npx vitest run tests/api-integration/`

```
 Test Files  2 failed | 30 passed (32)
      Tests  65 failed | 931 passed (996)
```

两个失败文件为 `a2a-registry.test.ts`（29 failed）与 `a2a-jsonrpc.test.ts`（36 failed），
**均属其他同事独占范围，本任务未修改**，且其失败原因与本次改动无关
（registry/jsonrpc 各自对着自己的旧契约）。
`a2a-queue.test.ts` 在此轮为 `1 passed`。

---

## 四、遗留项

1. **非法 priority 返回 500 而非 400**（`src/app/api/a2a/queue/route.ts` POSTHandler）
   - 现状：非法 `priority` 在 `enqueue()` 抛错 → 被 catch → 500。
   - 建议：语义上 400（参数校验失败）更合理，但改状态码 = 改对外契约，
     超出本任务授权。**未动手**，交主管裁决是否另开任务。
2. **`tests/api-integration/mocks/agent-scheduler-compat.ts` 的去留**
   - 本次已不再使用它（queue 路由不碰 agent registry / task store）。
   - 但 `a2a-registry.test.ts` / `a2a-jsonrpc.test.ts` 仍在用，
     归属其他同事。**本次未修改该文件。**
3. **`a2a-registry.test.ts`（29 failed）/ `a2a-jsonrpc.test.ts`（36 failed）**
   - 归属其他同事，本次未触碰。二者失败模式与 queue 类似（对着旧契约断言），
     可参考本报告的根因分析思路。
4. **`stats.byAgent` 是 `Map`**，经 `NextResponse.json` 序列化后变成 `{}`，
   对外拿不到按 agent 的分组。实现层若要对外暴露，需转成普通对象
   （属对外契约变更，未动手）。
5. **`getMessageQueue()` 是模块级单例**，生产无状态隔离手段；
   测试用 `resetMessageQueue()` 重置。当前实现可测，但若未来加持久化需留意。

---

## 五、结论

**Yes**

- `tests/api-integration/a2a-queue.test.ts`：35 failed / 5 passed → **36 passed / 0 failed**
- `npx tsc --noEmit`：**0 error**
- `npx eslint tests/api-integration/a2a-queue.test.ts`：**0 error**（1 个既有 ignore warning）
- 未改任何实现代码，未改对外契约，未新增 skip/弱化断言/`as any`/`@ts-ignore`，
  未触碰他人独占文件与工作树既有未提交文件。
- 未执行任何 git 写操作（无 add/commit/push/stash/checkout/restore）。

### 附：一句话根因

**测试断言的是一套从未实现的「任务调度队列」API（PUT、`{success,data}` 信封、`?id=` 单任务、404 语义），
而实现是「消息队列」API（GET/POST/DELETE、扁平 `NextResponse.json` 信封、`?agentId=`/`?priority=` 清理）；
按「以实现为准」重写测试即全部通过。**
