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

## 七、v13 已修：`keyboard-shortcuts.test.ts` 同步死循环 —— 「分片 3 被 cancelled」的第二真凶

v12 修掉 `draft-storage.test.ts`（700456ms）之后，分片 3 依然 `cancelled`。
这次把范围从「哪个文件慢」改成「哪个文件**没有结果行**」，一击命中：

    分片3 日志提及 180 个文件 / 179 个有结果行 / 缺失 1 个
      → src/lib/keyboard-shortcuts/keyboard-shortcuts.test.ts
    该文件最后输出：38 行 `[ShortcutManager] Registered:`（59ms 内）
    之后静默 1316.6 秒，直到 `##[error]The operation was canceled.`
    该文件零 await / 零 Promise / 零定时器 ⇒ 是**同步**卡死

| 现象 | 根因 | 处理 |
|---|---|---|
| 单个测试文件吃满 `timeout-minutes: 25` → job `conclusion: cancelled`（不是 failure）→ 整个 run 判红 → 一封邮件 | `enableAll()` / `disableAll()` 写成 `this.shortcuts.forEach((_, id) => this.enable(id))`，而 `enable()` → `update()` → `unregister()` + `register()`，等于 `Map.delete(id)` 后立刻 `Map.set(id, …)`，被删的 key 被**追加到 Map 末尾**。`Map.prototype.forEach` 的规范语义是「迭代期间新追加的条目也会被访问」⇒ 迭代指针永远追不上末尾 ⇒ **同步死循环** | 先 `Array.from(this.shortcuts.keys())` 快照，再逐个改 |

这不是测试写错，是**库自己的生产 bug**：设置页点一次「全部启用 / 全部禁用」，
浏览器主线程就焊死。所以修在生产文件 `src/lib/keyboard-shortcuts/shortcut-manager.ts` 里。

独立性证明（`_site4/_ops/ci/sim_map_foreach_loop.js`）：3 个 key 的 Map，
按 `delete` + 重新 `set` 的方式 forEach，迭代 200001 次后 `map.size` 仍是 3。

不死循环之后，同一文件剩下的 8 个红一并收掉（本地真 vitest：`8 failed | 51 passed` → `59 passed`）：

| 用途例 | 报错 | 根因 | 处理 |
|---|---|---|---|
| event handling × 5 | `TypeError: Cannot read properties of null (reading 'tagName')` | `handleKeyDown` 里 `const target = event.target as HTMLElement` 之后直接读 `target.tagName`；由 document 派发的事件一定有 target，但 `new KeyboardEvent(...)` 构造出来的事件 target 是 `null` | 生产代码加非空守卫：`target && (…)` |
| event handling × 2 | `TypeError: Cannot set property target of #<Event> which has only a getter` | 测试里写 `event.target = { tagName: 'INPUT' }`，而 `Event.target` 是只读 getter | 改用 `Object.defineProperty(event, 'target', { value: …, configurable: true })` |
| global instance × 1 | `expected ShortcutManager{} not to be ShortcutManager{}` | 测试写错：`expect(getShortcutManager()).not.toBe(getShortcutManager())` 两次拿到同一个新单例，恒失败 | 先留住销毁前那个实例，再断言销毁后是新实例 |

判据：`单元测试 (分片 3/4)` 与 `Unit Tests (shard 3)` 的 `conclusion` 从 `cancelled`
变 `success`，耗时 ≤ 8 分钟（本地单文件实测 8.32s，v12 前是 1316.6s 后被杀）。

## 八、v13 已修：Lighthouse 第四层 —— Navigation / Footer 在 intl provider 之外

v12 修掉三个旧 digest 后，服务器确实起得来（`server up, first status=307 (after 2s)`），
但 SSR 立刻换成新的一次崩溃：

    ⨯ Error:                              ← message 是空字符串
        at <unknown> (.next/server/chunks/ssr/_154m4eyzlbn7l._.js:1:734)
        at <unknown> (.next/server/chunks/ssr/_0ym-q82le7ws5._.js:9:13654) {
      digest: '3442073182'
    }
    runtimeError.code = "NO_FCP"
    finalDisplayedUrl = "http://127.0.0.1:3000/en"

| 根因 | 处理 |
|---|---|
| v12 的 `src/app/[locale]/layout.tsx` 把 `<Navigation />` 与 `<Footer />` 放在 `<NextIntlClientProvider>` **外面**。两者都是 `'use client'` 且都要 intl context：`Navigation` 调 `useTranslations('nav')` 并通过 `<LanguageSwitcherCompact/>` 调 `useLocale()`；`Footer` 调 `useTranslations('footer')`。根 layout 的 `Providers` → `ClientProviders` 是纯 client-side 副作用宿主，不提供 intl context。缺 context 时 `use-intl` 在生产构建里 `throw new Error(undefined)`，所以 digest 有、message 是空的 | 两个组件搬进 `NextIntlClientProvider` 内部；`Analytics` / `PerformanceOptimizer` / `ServiceWorkerRegistration` / `PWAInstallPrompt` / `SettingsButton` / `ThemeToggle` / `SocialLinks` 已逐个确认不碰 intl，位置不动 |

判据：`lhci 步骤结论: success`，`Parse Lighthouse results` 打出四项分数，`.lighthouseci/` 非空。

---

## v14 已修：3 条 event handling 用例自身写错（与挂死无关）

这三条在 v13 之前就一直是红的，只是被 8 个失败一起盖住了。它们**不是**产品 bug，
是用例把断言写在了不可能成立的配置/键位上：

| 用例 | 原来的写法 | 为什么不成立 | v14 改法 |
|---|---|---|---|
| `should prevent default behavior` | `key:'p'`，用 `beforeEach` 里 `{ preventDefaultAll: false }` 的 manager，断言 `event.preventDefault` 被调用 | `preventDefault` 只由 `ShortcutManagerConfig.preventDefaultAll` 控制（构造默认 `true`），`KeyboardShortcut` 上没有 shortcut 级开关。配置是 `false`，代码根本不调 `preventDefault()` | 单独 `new ShortcutManager({ preventDefaultAll: true })` 断言被调用；再用原 manager（`false`）反向断言不被调用 |
| `should respect shift modifier` | 注册 `key:'?'` + `shift:true` 的 `test.shift` | `DEFAULT_SHORTCUTS` 里已有 `global.help`（`key:'?'`、`shift:true`）。`findMatchingShortcut` 按 `getActiveShortcuts()` 的插入序返回**第一个**命中项，默认项先入 Map ⇒ 命中 `global.help`，`test.shift.action` 从不执行 | 注册前 `manager.unregister('global.help')`，隔离掉冲突 |
| `should handle Escape key in input field` | 注册 `key:'Escape'` 的 `test.escape` | 同理撞 `global.escape` | 注册前 `manager.unregister('global.escape')` |

判据：`vitest run src/lib/keyboard-shortcuts/keyboard-shortcuts.test.ts` → `59 passed (59)`。

---

## v16：为什么加一道 i18n key 门禁

v15（`69e349f`）给 7 个语种的 `nav` 补齐了 8 个 key，Performance Audit 才从
`NO_FCP` 里出来。回头复盘，这个 bug 能活这么久是因为**三层都在替它掩护**：

1. `Navigation.tsx` 是 `useTranslations('nav')`，但要的 key 分散在
   `common.*` / `mobileMenu.*` / 顶层 `tasks|subagents|memory` 里，命名空间错配；
2. `Navigation.test.tsx` 把 `useTranslations` mock 掉了，硬编码返回所有 key，
   于是「key 一定存在」这个前提根本没被验证 —— 测试绿、生产崩；
3. Lighthouse 只会说 `NO_FCP` + `finalDisplayedUrl`，不会告诉你缺哪个 key，
   真正的 `MISSING_MESSAGE` 只在 job 日志里，前面又被 8 个失败的测试刷过去。

所以补的不是某一个 key，而是**一条自动化判据**：`scripts/check-i18n-keys.mjs`
静态扫 `src/**/*.{ts,tsx}`（排除测试文件），把每个文件里
`useTranslations('ns')` / `getTranslations({namespace:'ns'})` 和 `t('key')`
字面量配对，去 `en.json` 里查。

- 退出码：有**新增**缺失 → 1；只报既有缺失 → 0。
- 基线 `.github/i18n-missing-baseline.json`：当前 161 条既有缺失
  （`dashboard/*`、`RoomCreateModal`、`RoomJoinPanel`、`RoomSettingsPanel`、
  `multimodal/*`），补完一批就 `--update` 一次把基线缩下去。
- 当前审计结果：`/` 这条链路（`[locale]/page.tsx`、`layout.tsx`、
  `Navigation.tsx`、`Footer.tsx`）**零缺失**；161 条全在没有被 Lighthouse
  审计的路由里。

同时顺手修掉 `Navigation.test.tsx` 两条陈旧用例：mock 里补 `siteNameShort`，
断言串从旧品牌 `'AI 团队'` 改成 catalog 真值 `'7ziStudio'`
（组件早在用 `t('siteNameShort')`，测试一直没跟上，靠 `continue-on-error` 兜着）。

**还没做（下一步）**：把那 161 条既有缺失补齐 —— 那些页面一旦被访问就是
`MISSING_MESSAGE` 崩页，只是 Lighthouse 只审 `/` 所以没暴露。真正的解法是把
`nav.mobileMenu.*` / `nav.siteNameShort` 这些重复项删掉、组件改成
`useTranslations('mobileMenu')` / `useTranslations('common')`，而不是继续往
`nav` 里堆副本。
