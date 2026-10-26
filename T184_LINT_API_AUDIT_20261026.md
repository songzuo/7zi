# T184 — ESLint Warning 清理报告：`src/lib/api/**` 与 `src/lib/audit/**`

- **任务编号**：T184（代码质量工程师）
- **日期**：2026-10-26
- **负责范围**：`src/lib/api/**`、`src/lib/audit/**`（唯一可改路径）
- **规则**：`@typescript-eslint/no-unused-vars`（warn 级，eslint.config.mjs 已配置 `varsIgnorePattern/argsIgnorePattern/caughtErrorsIgnorePattern: '^_'`）
- **原则**：零运行时行为变更；不使用 `eslint-disable`；不改 eslint / tsconfig / vitest 配置；不改对外契约。

---

## 1. 修复前后 warning 数

| 范围 | 修复前 | 修复后 | 变化 |
| --- | --- | --- | --- |
| `src/lib/api/**` | 14 warnings / 0 errors | **0 / 0** | −14 |
| `src/lib/audit/**` | 14 warnings / 0 errors | **0 / 0** | −14 |
| **合计（两个目录）** | **28 warnings / 0 errors** | **0 / 0** | **−28 (100%)** |

修复前 28 条全部是 `@typescript-eslint/no-unused-vars`，分布：

```
src/lib/api/api-logger.ts            2  (L214, L255)
src/lib/api/api-performance-logger.ts 1  (L8)
src/lib/api/error-handler.ts          1  (L20)
src/lib/api/error-logger.ts           2  (L325 ×2)
src/lib/api/error-middleware.ts       1  (L148)
src/lib/api/errors/middleware.ts      1  (L12)
src/lib/api/timeout-wrapper.ts        4  (L18, L19, L60, L130)
src/lib/api/utils.ts                  2  (L7, L77)
src/lib/audit/audit-logger.ts         2  (L9, L10)
src/lib/audit/middleware.ts          12  (L66, L193, L196×2, L199, L200, L204, L212, L225, L278, L328, L352)
```

> 全仓 `npx eslint src` 在本次测量时为 **289 warnings / 0 errors**（含其它并行子代理同时清理的结果）；`lib/api`、`lib/audit` 已不再出现在 TOP 目录分布中。

---

## 2. 改动清单（共 10 个文件，+24 / −54 行）

### 2.1 `src/lib/api/api-logger.ts`（−2/+2）
| 行 | 改动 | 说明 |
| --- | --- | --- |
| 214 | `catch (error) {` → `catch {` | `extractPath()`：URL 解析失败回退原串，异常对象从未被读取 → 可选 catch 绑定（行为等价） |
| 255 | `catch (error) {` → `catch {` | `sanitizeUrlForLogging()`：同上 |

### 2.2 `src/lib/api/api-performance-logger.ts`（−1）
| 行 | 改动 | 说明 |
| --- | --- | --- |
| 8 | 删除 `import { NextRequest } from 'next/server'` | 全文件未引用（0 处使用）；纯类型/值导入删除，零运行时影响 |

### 2.3 `src/lib/api/error-handler.ts`（−1）
| 行 | 改动 | 说明 |
| --- | --- | --- |
| 20 | 从 import 列表删除 `getUserFriendlyError` | 该文件仅使用 `getLocaleFromRequest` / `createUserErrorExtension` / `SupportedLocale`；`getUserFriendlyError` 仍由 `user-messages.ts` 正常导出，对外 API 不变 |

### 2.4 `src/lib/api/error-logger.ts`（−3/+3）
| 行 | 改动 | 说明 |
| --- | --- | --- |
| 322–323 | JSDoc `@param error/errorData` → `@param _error/_errorData`（补注 "reserved for external monitoring integration"） | 注释与形参名保持一致 |
| 325 | `sendToExternalMonitoring(error: Error, errorData: ErrorLogData)` → `(_error: Error, _errorData: ErrorLogData)` | 模块私有函数，参数仅出现在注释里的 Sentry/DataDog 占位实现中；调用点 `L231` 为位置传参，调用不变 |

### 2.5 `src/lib/api/error-middleware.ts`（−1/+1）
| 行 | 改动 | 说明 |
| --- | --- | --- |
| 148 | `additionalTags: Record<string, string> = {}` → `_additionalTags: ...` | 导出函数 `createApiErrorHandler()` 的第 2 形参从未在返回闭包中使用；**仅重命名不改签名**，保持 arity/类型/默认值为不变（对外契约） |

### 2.6 `src/lib/api/errors/middleware.ts`（−1/+1）
| 行 | 改动 | 说明 |
| --- | --- | --- |
| 12 | `import { ApiError, ErrorType } from './index'` → `import { ApiError } from './index'` | `ErrorType` 在本文件代码中 0 引用；**L209 的 `export { ApiError, ErrorType } from './index'` 再导出语句原样保留**，外部 `import { ErrorType } from '@/lib/api/errors/middleware'` 仍可用 |

### 2.7 `src/lib/api/timeout-wrapper.ts`（−6/+6）
| 行 | 改动 | 说明 |
| --- | --- | --- |
| 18 | 删除 import 中的 `ErrorType` | `createServiceUnavailableError` 保留 |
| 19 | 删除 import 中的 `getLocaleFromRequest` | `SupportedLocale`（类型）保留 |
| 36 | JSDoc `@param locale` → `@param _locale`（注明 currently unused） | `withTimeout()` |
| 60 | `locale: SupportedLocale = 'zh'` → `_locale: SupportedLocale = 'zh'` | `withTimeout()` 形参未使用；**保留形参与默认值**（`withTimeoutApi` 内部以位置参数 `withTimeout(fn, timeoutMs, locale)` 传参，签名 arity 不变） |
| 112 | JSDoc `@param locale` → `@param _locale` | `withTimeoutPromise()` |
| 130 | `locale: SupportedLocale = 'zh'` → `_locale: SupportedLocale = 'zh'` | `withTimeoutPromise()` 形参未使用；仅重命名 |

### 2.8 `src/lib/api/utils.ts`（−26）
| 行 | 改动 | 说明 |
| --- | --- | --- |
| 7 | 删除 `import { ErrorType } from './error-handler'` | 本文件未引用，且本文件不导出/再导出 ErrorType |
| 62–86 | 删除死代码 `interface CookieOptions` + `function getDefaultCookieOptions()` | 二者均为**模块私有**（未 export）、全仓 0 引用、无副作用；删除后不产生新的 unused 警告（`CookieOptions` 唯一使用者即该函数）。对外导出清单不变 |

### 2.9 `src/lib/audit/audit-logger.ts`（−2）
| 行 | 改动 | 说明 |
| --- | --- | --- |
| 9 | 删除 `import type { AuditAction }` | `import type` 纯类型导入，删除后无运行时影响 |
| 10 | 删除 `import type { AuditStatus }` | 同上 |

### 2.10 `src/lib/audit/middleware.ts`（−11/+11）
| 行 | 改动 | 说明 |
| --- | --- | --- |
| 66 | `logResponseBody = false,` → `logResponseBody: _logResponseBody = false,` | 解构项未使用；改键名保留 `AuditMiddlewareOptions.logResponseBody` 的读取与默认值行为 |
| 193 | `const action = actionMap[method] \|\| 'READ'` → `const _action = ...` | 保留求值（`actionMap` 仍被使用，避免连带新增 unused 警告） |
| 196 | `const { resource, resourceId } = ...` → `const { resource: _resource, resourceId: _resourceId } = ...` | 保留 `parseResource()` 调用 |
| 199 | `const ipAddress = getClientIp(request)` → `_ipAddress` | 保留 `getClientIp()` 调用 |
| 200 | `const userAgent = getUserAgent(request)` → `_userAgent` | 保留 `getUserAgent()` 调用 |
| 204 | `const username = extractUsername ? await extractUsername(request) : null` → `_username` | **保留 await 与用户回调调用**（见 §3） |
| 212 | `const startTime = Date.now()` → `_startTime` | 保留 `Date.now()` 调用 |
| 225 | `catch (error) {` → `catch {` | 请求体 JSON 解析失败忽略 |
| 278 | `catch (error) {` → `catch {` | 响应体 JSON 解析失败忽略 |
| 328 | `catch (error) {` → `catch {` | `extractUserIdFromToken()` JWT 解析失败返回 null |
| 352 | `catch (error) {` → `catch {` | `extractUsernameFromToken()` JWT 解析失败返回 null |

---

## 3. 刻意保留项及原因

### 3.1 没有任何 warning 被“刻意保留”（全部 28 条已消除）
这两个目录中**不存在** `no-explicit-any`、`no-useless-escape`、`prefer-optional-chain` 等需要改行为才能消的警告——28 条全部是纯 unused 类，因此**无需**使用 `@ts-ignore` / `as any` / `eslint-disable` 等任何压制手段。本报告未使用任何豁免写法。

### 3.2 “保留变量、只加 `_` 前缀”而非删除的项（重点说明）
以下 6 类未使用变量**选择重命名而非删除**，原因均为「删除会改变运行时行为或对外签名」：

| 位置 | 项 | 不删除的原因 |
| --- | --- | --- |
| `audit/middleware.ts:204` | `_username` | 初值是 `await extractUsername(request)`，即**用户提供的回调**。删除会停止调用该回调并少一个 await 微任务 → 可观测行为变化 |
| `audit/middleware.ts:193/196/199/200/212` | `_action/_resource/_resourceId/_ipAddress/_userAgent/_startTime` | 均保留原函数调用（`actionMap[method]`、`parseResource()`、`getClientIp()`、`getUserAgent()`、`Date.now()`），保证调用次数/时序不变 |
| `api/timeout-wrapper.ts:60,130` | `_locale` | 属于**导出函数签名**（`withTimeout` / `withTimeoutPromise`），删除会改变公开 API 的 arity 与调用约定 |
| `api/error-middleware.ts:148` | `_additionalTags` | 导出函数 `createApiErrorHandler()` 的第 2 形参，保留签名（调用方仍可传参） |
| `api/error-logger.ts:325` | `_error/_errorData` | 占位实现（未来 Sentry/DataDog 接入），保留形参与 JSDoc 说明 |
| `audit/middleware.ts:66` | `_logResponseBody` | `AuditMiddlewareOptions` 的公开选项，保留读取与默认值 |

### 3.3 唯一被删除的“死代码”
`src/lib/api/utils.ts` 的 `getDefaultCookieOptions()` 及其私有接口 `CookieOptions`：模块私有、0 引用、无副作用、无导出 → 属于纯粹的 unused 变量级死代码，删除不产生任何可观测差异。

---

## 4. 验证（真实输出）

### 4.1 `npx eslint src/lib/api src/lib/audit`（修复前 → 修复后）

修复前（28 warnings / 0 errors）：
```
/root/.openclaw/workspace/src/lib/api/api-logger.ts
  214:12  warning  'error' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars
  255:12  warning  'error' is defined but never used. Allowed unused caught errors must match /^_/u  @typescript-eslint/no-unused-vars
...
✖ 28 problems (0 errors, 28 warnings)
```

修复后：
```
$ npx eslint src/lib/api src/lib/audit
exit=0
=== warning count via json ===
files=23 errors=0 warnings=0
```
（无任何输出 → 0 error / 0 warning）

### 4.2 `npx tsc --noEmit`

修复前（基线，6 errors，**我的目录内 0 条**）：
```
$ grep -c "error TS" /tmp/tsc_baseline.txt
6
--- api/audit related ---
NONE
--- all errors ---
src/app/api/a2a/registry/[id]/route.ts(24,56): error TS2304: Cannot find name 'context'.
src/app/api/a2a/registry/[id]/route.ts(48,56): error TS2304: Cannot find name 'context'.
src/app/api/a2a/registry/[id]/route.ts(94,59): error TS2304: Cannot find name 'context'.
src/app/api/a2a/registry/[id]/route.ts(121,58): error TS2304: Cannot find name 'context'.
src/lib/rate-limit/examples/api-route-integration.ts(363,7): error TS2559: Type 'ProcessEnv' has no properties in common with type 'RateLimitRedisEnv'.
src/test/vi-mocks.ts(854,3): error TS2322: Type 'Mock<...>' is not assignable to type '(...) => Promise<DatabaseResult[]>'.
```

修复后（4 errors，**我的目录内 0 条**）：
```
=== tsc after ===
4
--- errors in lib/api|lib/audit ---
NONE
--- full list ---
src/app/api/a2a/registry/[id]/route.ts(24,56): error TS2304: Cannot find name 'context'.
src/app/api/a2a/registry/[id]/route.ts(48,56): error TS2304: Cannot find name 'context'.
src/app/api/a2a/registry/[id]/route.ts(94,59): error TS2304: Cannot find name 'context'.
src/app/api/a2a/registry/[id]/route.ts(121,58): error TS2304: Cannot find name 'context'.
```
> 基线里的 `src/lib/rate-limit/examples/...` 与 `src/test/vi-mocks.ts` 两条在本次复测时已消失——由**其它并行子代理**（T182 等）修复，与本次改动无关（我未触碰这两个文件）。
> **结论：未引入任何新的 TS error；`src/lib/api`、`src/lib/audit` 全部 0 error。**

### 4.3 `npx eslint src --quiet`
```
=== [3] npx eslint src --quiet ===
eslint_quiet_exit=0
```
（无输出 → 全仓 src 仍为 0 error）

### 4.4 附加验证：两目录单测（行为未变）

```
$ npx vitest run src/lib/api src/lib/audit
 Test Files  1 failed | 5 passed (6)
      Tests  5 failed | 176 passed (181)
```
失败集中在 `src/lib/api/__tests__/validation.test.ts` 的 `githubIssuesQuerySchema` 默认值断言。**已证明为存量失败、非本次改动引入**：把 `src/lib/api/error-handler.ts` 临时还原为 HEAD 原版后重跑，失败数完全一致：
```
--- running validation.test.ts with PRISTINE (HEAD) error-handler.ts ---
 Test Files  1 failed (1)
      Tests  5 failed | 40 passed (45)
```
随后立即恢复本次版本（`git diff` 复核：仅剩 import 行删除这一处改动）。

---

## 5. 遗留 / 建议后续

1. **存量测试失败（非本任务范围）**：`src/lib/api/__tests__/validation.test.ts` 5 条断言失败（`githubIssuesQuerySchema` 默认值）与 `src/lib/api/validation.ts` 自 2026-04 起未变更，属历史遗留；本任务禁止改测试文件，建议另开任务修复 schema 默认值或修正断言。
2. **`createAuditMiddleware` 的功能缺口（刻意不修）**：该中间件目前只收集 `action/resource/ipAddress/userAgent/username/startTime` 等字段后**直接 `return null`，从不写入审计日志**；`AuditMiddlewareOptions.logResponseBody`、`actionMap` 等选项因此“接收但不生效”。补齐它会产生真实审计事件 → 改变运行时行为（触及“审计事件字段与顺序”契约），故本轮只做消警不改逻辑，建议单独排期（配合 `wrapResponseForAudit` 的既有字段顺序）。
3. **`src/lib/api/utils.ts` 的 cookie 选项**：`setAuthCookies` / `clearAuthCookies` 自带 cookie 参数，未复用被删除的 `getDefaultCookieOptions()`；如后续要统一 cookie 策略，建议在新位置重建并导出（当前无调用方，属于有意删除的私有工具函数）。
4. **全仓剩余 warning**：本次全量扫描为 289 warnings（`lib/observability` 11、`lib/keyboard-shortcuts` 10、`lib/realtime` 10、`lib/audit-log` 9 …），均由其它并行任务负责；`lib/api`、`lib/audit` 已清零。

---

## 6. 结论

**Yes（已完成）**

- `src/lib/api/**` + `src/lib/audit/**`：**28 warnings → 0 warnings**，0 error。
- 全部为机械安全修复（未使用 import / 变量、私有死代码、`catch` 可选绑定），**未改变任何运行时行为**，未改任何对外契约（API 响应信封、状态码、鉴权语义、审计事件字段与顺序均未触碰）。
- 未使用 `eslint-disable` / `as any` / `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`；未改 eslint / tsconfig / vitest 配置；未 git add / commit / push / stash / checkout / restore；未触碰 `src/lib/api`、`src/lib/audit` 以外的任何路径。
- `npx tsc --noEmit`：基线 6 error → 现 4 error（减少的 2 条由并行任务修复），**我的目录 0 error，未引入新 error**。
- `npx eslint src --quiet`：**exit 0，全仓 0 error**。
