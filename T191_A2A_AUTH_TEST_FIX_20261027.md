# T191 — A2A 鉴权测试断言对齐修复报告

日期：2026-10-27
执行人：🧪 测试修复工程师 T191
范围：仅 `tests/api-integration/a2a-auth.test.ts`（src/ 下一字未改）

---

## 1. 根因

`src/lib/agents/a2a/auth.ts` 的 `unauthorized(message)` 返回的是仓库统一的 **ErrorResponse 信封**（注释中明确写了「形状与仓库统一的 ErrorResponse 契约一致：见 `src/lib/api/error-handler.ts`」）：

```json
{
  "success": false,
  "error": {
    "type": "UNAUTHORIZED",
    "message": "Missing or invalid credentials",
    "timestamp": "2026-10-27T00:51:xx.xxxZ"
  }
}
```

而测试 `it('401 响应体为统一的错误信封')` 里的断言写成了旧形状：

```ts
expect(await response.json()).toEqual({
  success: false,
  error: { code: 'UNAUTHORIZED', message: 'Missing or invalid credentials' },
})
```

差异点共两处：
1. 字段名：实现是 `error.type`，测试期望 `error.code`；
2. 结构：实现多出 `error.timestamp` 字段，测试没有。

基线报错 `expected { success: false, error: { …(3) } } to deeply equal { success: false, error: { …(2) } }` 中的 `(3)` / `(2)` 正是这 3 个 vs 2 个 error 字段。

**结论：实现正确，是测试断言过时。** 因此按「以实现为准对齐测试断言」的原则修测试，不动实现。

---

## 2. 改动

文件：`tests/api-integration/a2a-auth.test.ts`（该文件在 git 中为新增未跟踪文件 `?? tests/api-integration/a2a-auth.test.ts`）

改动位置：第 276–297 行，仅改动 **1 个 it 用例**（原 11 行 → 现 22 行，净增 11 行）。

diff 摘要：

```diff
     it('401 响应体为统一的错误信封', async () => {
       const response = await withA2AAuth(makeRequest(), vi.fn())
 
-      expect(await response.json()).toEqual({
-        success: false,
-        error: {
-          code: 'UNAUTHORIZED',
-          message: 'Missing or invalid credentials',
-        },
-      })
+      expect(response.status).toBe(401)
+
+      const body = (await response.json()) as {
+        success: boolean
+        error: {
+          type: string
+          message: string
+          timestamp: string
+        }
+      }
+
+      expect(body.success).toBe(false)
+      expect(body.error.type).toBe('UNAUTHORIZED')
+      expect(body.error.message).toMatch(/Missing or invalid credentials/i)
+      expect(body.error.timestamp).toMatch(
+        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
+      )
+      expect(Number.isNaN(Date.parse(body.error.timestamp))).toBe(false)
     })
```

断言覆盖：
- `status === 401`（HTTP 层）
- `success === false`
- `error.type === 'UNAUTHORIZED'`（对应实现的 `type` 字段，非旧 `code`）
- `error.message` 匹配 `/Missing or invalid credentials/i`
- `error.timestamp` 匹配 ISO-8601 UTC 毫秒格式正则，且 `Date.parse` 非 NaN（双重保证是合法 ISO 字符串）

约束遵守情况：
- ✅ 未 skip / 未删除 / 未弱化断言（无 `expect.anything()`、无 `toBeTruthy()` 之类糊弄式断言）
- ✅ 未新增 `as any` / `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` / `eslint-disable`（唯一类型断言是把 `response.json()` 的 `any` 收窄到具体结构体，非 `any`）
- ✅ 未改 vitest / tsconfig / eslint 配置，未新增依赖
- ✅ 未执行 git add / commit / push / stash / checkout / restore
- ✅ 未触碰任何 `src/` 实现文件
- ✅ 报告不含任何真实凭据原文

---

## 3. 验证（真实输出）

### 3.1 `npx vitest run tests/api-integration/a2a-auth.test.ts`

```
 RUN  v4.1.12 /root/.openclaw/workspace

 ✓ tests/api-integration/a2a-auth.test.ts (23 tests) 157ms

 Test Files  1 passed (1)
      Tests  23 passed (23)
   Start at  00:51:18
   Duration  7.34s (transform 2.26s, setup 2.82s, import 665ms, tests 157ms, environment 3.11s)
```

**23/23 全绿**（基线为 22 通过 / 1 失败）。

### 3.2 `npx tsc --noEmit`

```
EXIT=0
```

（无任何输出行，退出码 0，**0 error**。）

---

## 4. 遗留问题

1. **同类过时断言可能存在于其它 A2A 相关测试文件中。** 本次范围被限定为单一文件，未做全仓扫描。若后续需要，可安排一轮「A2A 路由统一 ErrorResponse 契约」的全量断言对齐排查（`code` → `type`、补 `timestamp`）。
2. **`error.code` 语义在新契约中丢失。** 统一契约用的是 `type`；若前端/客户端存在按 `error.code` 取值的代码，需另开任务确认兼容性（本次未改 src，未越界排查）。
3. **`timestamp` 断言依赖固定毫秒级 UTC ISO 格式。** 实现用 `new Date().toISOString()`，恒为该格式；但若未来实现方改为本地时间字符串或带偏移格式，此断言需同步更新（届时属正常契约演进，非缺陷）。
4. 该测试文件在 git 中尚未跟踪（`??`），需由主管在统一提交时纳入版本管理。

---

## 5. 结论

**Yes** — 任务完成。

- 根因定位准确（测试断言过时，实现正确）
- 改动仅限 `tests/api-integration/a2a-auth.test.ts` 一个用例，未越界
- `npx vitest run tests/api-integration/a2a-auth.test.ts` → **23 passed (23)**
- `npx tsc --noEmit` → **0 error（exit 0）**
- 报告已产出：`T191_A2A_AUTH_TEST_FIX_20261027.md`
