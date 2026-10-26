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

## 五、v12 已修：`draft-storage.test.ts` 挂死 —— 「分片 3/4 被 cancelled」的真凶

| 现象 | 根因 | 处理 |
|---|---|---|
| `src/lib/storage/__tests__/draft-storage.test.ts (9 tests / 8 failed) 700456ms`；分片 3/4 撞 20 分钟上限 → job `conclusion: cancelled` → 整个 run 判红 | 测试里的 fake `IDBOpenDBRequest` 只把 `onsuccess` 初始化成 `null`，**从不回调**；而 `DraftStorage` 每个方法都是 `request.onsuccess = () => resolve()`，Promise 永不 settle → 撞 `testTimeout: 60000`，CI 里 `retry: 1` 再跑一遍 → 单用例 120s+ | 重写该测试文件，用会真正回调的 `fakeRequest()`；`afterEach` 不再 `await clearAllDrafts()`，`close()` 包 try/catch |

还有两个连带因素：

- `afterEach` 无条件 `await storage.clearAllDrafts()`：mock 的 `clear()` 不回调就吃满
  `hookTimeout(10s)`，CI retry 再翻倍 —— 连**纯同步**的用例（「应该创建草稿从
  WorkflowDefinition」）都被拖成 20s 红。
- `afterEach` 里 `storage.close()` 直接 `this.db.close()`，而手工塞的 mock db 没有
  `close` → `TypeError` 抛出 → 用例判红。

判定「超时被杀」而不是「断言失败」的判据：job 的 `conclusion` 是 `cancelled`，
日志末尾是 `##[error]The operation was canceled.` + `Terminate orphan process: pid (...)`
并且**没有** `Test Suites:` 汇总行。

顺带清掉：

- `vitest.config.ts` 的 `fileTimeout: 120000` **不是 vitest 的合法选项**，一直被静默忽略。
- CI 里 `retry: 1`（失败用例重试一次，耗时翻倍）→ 改为 `retry: 0`。
- `timeout-minutes` 20 → 25，留一点余量。

判据：`单元测试 (分片 3/4)` 的 `conclusion` 从 `cancelled` 变 `success`，耗时 ≤ 8 分钟。

## 六、v12 已修：Lighthouse 第三层 —— 应用自身渲染崩溃

`.next/standalone/.next/**`（BUILD_ID / required-server-files.json / server/）与
探活判据都修好之后，服务器终于起得来（`server up, first status=307 (after 2s)`），
于是暴露出真正的第三层：**页面自己 500**。

    TypeError: Cannot destructure property 'locale' of '(intermediate value)'
                as it is undefined.
        digest: '356995916'   chunk src_app_[locale]_not-found_tsx
    Error:                                    ← 没有消息
        digest: '97180869'    chunk _0ym-q82le7ws5
    TypeError: Cannot read properties of undefined (reading 'siteName')
        digest: '630639053'   chunk _0d-50zh49tb-h

| 错误 | 根因 | 处理 |
|---|---|---|
| digest `97180869`（无消息） | `src/app/layout.tsx` 与 `src/app/[locale]/layout.tsx` **都**渲染了 `<html>`/`<body>`，SSR 结果是嵌套 `<html>`；Next.js 16 只允许根 layout 渲染一次 | `[locale]/layout.tsx` 去掉 `<html>/<head>/<body>`、字体、`globals.css`、`Providers`，只保留 i18n 消息 / 导航 / 页脚 / 结构化数据 |
| digest `356995916` | `src/app/[locale]/not-found.tsx` 对 `params` 做 `await` 解构，而 Next.js 16 的 `not-found` **不传 params** | 改为 `getLocale()` + `defaultLocale` 兜底，不再碰 `params` |
| digest `630639053` | `src/lib/seo-metadata.ts` 直接 `seoConfig[locale].siteName`，而 `seoConfig` 只有 `zh`/`en`，`src/i18n/config.ts` 的 `locales` 有 7 项 | 新增 `normalizeSeoLocale()`，不在表里的语言一律落到 `zh`；`SEOProps.locale` 从 `'zh' \| 'en'` 宽成 `string` |

判据：`lhci 步骤结论: success`，Parse 打出 performance / accessibility /
best-practices / seo 四项分数，`.lighthouseci/` 非空。

附注：`7zi.studio` 目前**没有上线**（本机与服务器双向 curl 全 `000`，
`/etc/nginx/sites-enabled/` 里没有它的配置），所以这些崩溃只影响 CI 采集，
不影响真实用户 —— 但它同样是线上部署后必然踩到的坑。
