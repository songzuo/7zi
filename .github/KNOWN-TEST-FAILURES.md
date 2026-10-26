# 已知测试失败清单（CI 止血期）

> `tests.yml` 的 `Run unit tests` 目前设了 `continue-on-error: true`。
> 本文件把「哪些是配置问题、哪些是真断言不一致」列清楚；
> 清空第二节之后删掉 `continue-on-error`，恢复阻断。

采集自 run `40285921954` / `40230968371`（2026-10-26，4 个 shard 全失败）。

## 一、配置类 —— 已修，无需再动

| 现象 | 根因 | 处理 |
|---|---|---|
| `Cannot find module '@/lib/middleware/api-performance'`<br>`requireStack: src/lib/monitoring/prometheus.js` | `prometheus.js` 是 tsc 编译产物，与 `prometheus.ts` 同名共存；`.js` 优先命中，内部是裸 `require('@/...')` | 已删除 `src/lib/monitoring/prometheus.js` |
| `Cannot find module '@/lib/multimodal/bailian-provider'`<br>`requireStack: .../audio/__tests__/route.test.ts` | 测试文件是 ESM 却在用例里用 `require('@/...')`，裸 require 不走 alias | 已改顶层 `import` + `vi.mocked()` |

## 二、真断言不一致 —— 待修

### shard 1

- `TypeError: Cannot read properties of undefined (reading 'get')`
- `AssertionError: expected { success: true, …(3) } to have property "data"`
- `AssertionError: expected -32700 to be -32600`（JSON-RPC 错误码）
- `TypeError: Cannot read properties of undefined (reading 'code')`
- `AssertionError: expected 200 to be 404`
- `AssertionError: expected 200 to be 400`
- `TypeError: Cannot read properties of undefined (reading 'data')`
- `AssertionError: expected 'declining' to be 'stable'`
- `TypeError: Cannot read properties of undefined (reading 'reason')`
- `AssertionError: expected 1 to be greater than 1`

### shard 2

- `AssertionError: expected "vi.fn()" to be called with arguments: [ 'mock-jwt-token-user-456' ]`
- `TypeError: Cannot convert undefined or null to object`
- `TypeError: Cannot read properties of undefined (reading 'apiPerformance')`
- `TypeError: Cannot read properties of undefined (reading 'rateLimiting')`
- `TypeError: Cannot read properties of undefined (reading 'system')`
- `TypeError: vi.mocked(...).mockImplementationOnce is not a function`
- `RangeError: Invalid time value`
- `ReferenceError: Cannot access 'mockLogger' before initialization`（`vi.mock` 工厂引用了未被提升的变量）

### shard 4

- `AssertionError: expected 400 to be 500`
- `AssertionError: expected 400 to be 200`
- `AssertionError: expected 401 to be 200`
- `AssertionError: expected 'Login failed' to contain 'Invalid email or password'`
- `AssertionError: expected 401 to be 500`
- `AssertionError: expected true to be false`
- `AssertionError: expected false to be true`
- `AssertionError: expected +0 to be 1`
- `AssertionError: expected "vi.fn()" to be called with arguments: [ { format: 'json', …(4) }, …(1) ]`
- `AssertionError: expected 'Validation error' to be 'Invalid import options'`
- `AssertionError: expected 200 to be 500`

## 三、修法建议（按投入产出排序）

1. **先归堆**：`expected 200 to be 400/404/500` 这一族大概率是同一类问题 ——
   API 路由的错误分支没走到，统一返回 200。挑一个路由读实现，能一次修掉一片。
2. **`Cannot access 'mockLogger' before initialization`** 是 `vi.mock` 工厂里引用了
   模块作用域的变量（`vi.mock` 被提升到 import 之前）。改成 `vi.hoisted()`。
3. **`expected 'Login failed' to contain 'Invalid email or password'`** 是错误信息不匹配，
   看是实现该改还是断言该改，二选一，不要两边都留。
4. 最后再删 `continue-on-error`。

## 四、为什么这些失败以前没被发现

`main` 没有分支保护（`GET /branches/main/protection` 返回 `Branch not protected`），
任何 push 都能直接进 main，红了也没人挡。CI 红了半年，失败通知被当噪音忽略。
