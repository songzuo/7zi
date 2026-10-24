# T100 — 安全模块单元测试（重跑版）

执行人：测试员子代理 · 日期：2026-10-24 · 工作目录：`/root/.openclaw/workspace`

---

## 1. 覆盖目标概述

本次为 `src/lib/security/` 下三个安全模块补齐正式单元测试，**全部断言均以源码真实行为为准**（逐行读过生产代码后编写），与直觉不符的行为用 `// BUG:` 注释固化并记入第 4 节疑似 bug 清单。

### 1.1 `src/lib/security/log-sanitizer.ts`（52 用例）

| 导出函数 | 覆盖要点 |
| --- | --- |
| `maskValue` | 中段掩码；长度 ≤ prefix+suffix（4）时整体掩码；空串原样返回；自定义 config |
| `maskEmail` | localPart > 2 → 首+`***`+尾；localPart ≤ 2 → `****`；非邮箱退化为 `maskValue`；空串 |
| `maskPhone` | 保留后 4 位；位数 < 7 整体掩码；忽略分隔符 |
| `maskCreditCard` | 首尾 4 位保留；非数字字符剔除；< 4 位整体掩码；4–7 位抛 `RangeError`；忽略 config |
| `redactValue` | 默认 `[REDACTED]`；自定义 `redactedText` |
| `isSensitiveField` | password/apiKey/userEmail/sessionId 分类；未知字段返回 `undefined`；`refreshToken` 分类固化 |
| `sanitizeValue` | full/partial 各分支；null/undefined 透传；非敏感字段仍做值内模式扫描；非字符串透传 |
| `sanitizeStringValue` | email/信用卡/JWT/UUID 掩码；普通文本不变 |
| `sanitizeObject` | 递归脱敏；数组 map；原始值透传；深度 > 10 → `[MAX_DEPTH_EXCEEDED]` |
| `sanitizeLogEntry` | 整条日志记录脱敏 |
| `sanitizeHeaders` | 普通对象与 `Headers` 实例两种入参 |
| `sanitizeURL` | query 参数脱敏；无 query 只留 origin+pathname；非法 URL 回退字符串脱敏 |
| `sanitizeError` | Error 的 message/stack 脱敏；非 Error 走 `sanitizeObject` |
| `addSensitivePattern` / `addValuePattern` / `resetPatterns` | 自定义模式生效；`resetPatterns()` 缩减集与 value pattern 残留（BUG 固化） |

### 1.2 `src/lib/security/sql-injection.ts`（45 用例）

模块依赖重量级 `@/lib/logger`（含 `@sentry/nextjs`），测试文件内用 `vi.mock('@/lib/logger', ...)` 打桩（未改任何生产代码/配置）。

| 导出函数 | 覆盖要点 |
| --- | --- |
| `checkSQLInjection` | keyword(high)/comment(medium)/boolean(critical)/union(critical)/time-based/stacked/hex(low)/危险函数(medium)；`logDetections` 开关；大小写不敏感的危险函数误判固化 |
| `checkObjectForSQLInjection` | 安全对象；嵌套对象路径 `root.user.name`；数组路径 `root.list[1]` |
| `escapeSQLString` | 单引号加倍 |
| `removeSQLComments` | `--` / `#` / `/* */` |
| `sanitizeSQLInput` | 转义引号、去 null 字节、去 `\%` `\_` 反斜杠 |
| `validateAndSanitizeSQLInput` | 安全原样返回；`sanitizeInput`；`throwOnDetection` 抛错 |
| `isValidIdentifier` / `isValidSortDirection` | 白名单正反例 |
| `validateLimit` / `validateOffset` | 钳制到 max；非法值回落 10 / 0 |
| `buildSafeCondition` | 合法条件 + operator 大写；非法字段/操作符/含注入的值 → `null` |
| `buildSafeOrder` | 合法排序；默认 ASC；非法 → `null` |
| `createSQLInjectionMiddleware` | query 注入 → 400；POST body 注入 → 400；安全请求 → 200 透传；非 JSON body 忽略 |
| `isRequestSafe` | URL 参数注入/安全 |

### 1.3 `src/lib/security/prototype-pollution-guard.ts`（23 用例）

| 导出函数 | 覆盖要点 |
| --- | --- |
| `protectPrototype` | 不抛错；import 副作用已冻结 `Object.prototype`（风险固化） |
| `sanitizeObjectFromPrototypePollution` | 清理 `__proto__`/`constructor`/`prototype`/`__defineGetter__` 等；嵌套递归；不污染 `Object.prototype` |
| `safeAssign` | 复制自有属性；不改动 target；跳过危险键；忽略非法 source |
| `safeMerge` | 浅合并/覆盖/深合并嵌套；跳过危险键；非法 source 返回副本 |
| `safeParseJSON` | 合法 JSON；非法 JSON → `null`；移除 `__proto__`；原始值透传 |
| `isPolluted` | 非对象 → false；含 `__proto__` → true；**普通对象也被判为 true**（BUG 固化） |

---

## 2. 新增文件列表

| 文件 | 行数 | 测试用例数 |
| --- | --- | --- |
| `src/lib/security/__tests__/log-sanitizer.test.ts` | 377 | 52 |
| `src/lib/security/__tests__/sql-injection.test.ts` | 366 | 45 |
| `src/lib/security/__tests__/prototype-pollution-guard.test.ts` | 187 | 23 |
| **合计** | **930** | **120** |

约束遵守情况：
- 未修改任何 `src/lib/security/*.ts` 生产代码（`git status` 显示 `src/lib/security/` 下仅新增 `__tests__/` 目录）。
- 未修改任何已有测试文件、`vitest.config.ts`、`src/test/setup.ts` / `tests/setup.ts`。
- 未新增依赖；无 `it.skip` / `describe.skip` / `it.todo` / `expect.soft`。
- 每模块独立文件，文件间无 import 依赖；`resetPatterns()` 的全局副作用只影响 `log-sanitizer.test.ts` 自身。
- 未使用 scratch 探针文件（上一轮遗留的 5 个 scratch 文件已由主管清理，本轮未再创建）。

---

## 3. 验证命令与真实输出

```bash
cd /root/.openclaw/workspace
npx vitest run src/lib/security/ 2>&1 | tail -40
```

真实输出摘要（末段）：

```
 ✓ src/lib/security/__tests__/sql-injection.test.ts (45 tests) 146ms
 ✓ src/lib/security/rbac/__tests__/audit-logger.test.ts (39 tests) 23ms
 ✓ src/lib/security/rbac/__tests__/rbac-cache.test.ts (23 tests) 1934ms
 ✓ src/lib/security/headers.test.ts (48 tests) 96ms
 ✓ src/lib/security/__tests__/prototype-pollution-guard.test.ts (23 tests) 75ms
 ✓ src/lib/security/__tests__/log-sanitizer.test.ts (52 tests) 107ms
 ✓ src/lib/security/rbac/__tests__/permission-inheritance.test.ts (25 tests) 76ms

 Test Files  7 passed (7)
      Tests  255 passed (255)
   Duration  26.56s (transform 3.0s, setup 4.9s, import 2.0s, tests 2.5s, environment 51.2s)
```

**7 个测试文件全部通过，255 个用例全绿（其中本次新增 120 个）。**

---

## 4. 发现的疑似 bug 清单

| # | 函数 / 位置 | 现象 | 影响 | 建议修法 |
| --- | --- | --- | --- | --- |
| 1 | `log-sanitizer.ts` → `resetPatterns()` | 重置后 `SENSITIVE_PATTERNS` 只剩 4 条（`password` / `secret` / `api_key` / `token`），`email`、`phone`、`ssn`、`credit_card`、`authorization`、`bearer`、`private_key`、`access_key`、`refresh_token`、`session_id`、`database_url`、`connection_string` **全部丢失**；同时 `VALUE_PATTERNS` **不被重置**，自定义 value pattern 残留 | 该函数一旦被调用（注释写的是 "for testing"），之后所有 email/phone/信用卡等 PII 字段**不再被脱敏**，日志直接泄露 PII；且 value pattern 状态前后不一致 | 把默认模式抽成 `DEFAULT_SENSITIVE_PATTERNS` 常量，`resetPatterns()` 用 `SENSITIVE_PATTERNS.length = 0` + 重新 push **完整**默认集；同时对称重置 `VALUE_PATTERNS`（或干脆删除该函数，改为 `vi.resetModules()`） |
| 2 | `log-sanitizer.ts` → `isSensitiveField()` | 模式按数组顺序匹配、先命中先返回；通用 `/token/i` 排在专用 `/refresh[_-]?token/i` 之前，导致 `refreshToken` 被判为 `token/partial`（只做部分掩码）而非预期的 `token/full`（整体脱敏） | refresh token 泄漏部分明文（`re********en`），高危凭据脱敏不足 | 把更具体的模式前置（`refresh_token`、`access_key`、`private_key`、`session_id` 放到通用 `token` 之前），或改用「最具体匹配优先」的排序/打分策略 |
| 3 | `log-sanitizer.ts` → `maskCreditCard()` | 形参 `config`（`SanitizationConfig`）**完全未被使用**，函数体全部使用 `DEFAULT_CONFIG`；调用方传入的 `maskChar`/`maskLength`/`preservePrefixLength`/`preserveSuffixLength` 一律无效 | 配置形同虚设，调用方无法定制掩码样式；也与其他 `mask*` 函数行为不一致 | 改为 `const finalConfig = { ...DEFAULT_CONFIG, ...config }` 并使用 `finalConfig` |
| 4 | `log-sanitizer.ts` → `maskCreditCard()` | 掩码长度计算为 `digits.length - 8`；当卡号数字位数为 4–7 时该值为负数，`String.prototype.repeat(负数)` 抛 `RangeError: Invalid count value` | 短卡号（残缺/测试卡号）直接让调用方崩溃，而不是返回掩码值 | 掩码长度改为 `Math.max(0, Math.min(digits.length - 8, maskLength))`，位数不足 8 时整体掩码 |
| 5 | `log-sanitizer.ts` → `sanitizeObject()` | 对字符串字段先 `sanitizeObject`（走 `sanitizeStringValue`）再 `sanitizeValue`（字段名敏感则再掩一次 / 非敏感字段再扫一次），导致**重复脱敏**、结果不幂等 | 例：`{ message: 'login for john@example.com' }` → `'login for j*******@example.com'`（掩码被二次套用，`e`/`n` 已被 `*` 覆盖，语义失真）；同一对象被 sanitize 两次结果不同 | `sanitizeObject` 对字符串值只做一次处理（字段名判定与值扫描二选一），或在 `sanitizeValue` 中检测已脱敏的 `*` 片段跳过 |
| 6 | `sql-injection.ts` → `checkSQLInjection()` 危险函数表 | 用 `upperInput.includes(func)` 做**子串**匹配，且表内混用大小写（`EXEC`/`SYS`/`COPY` 为大写，`xp_cmdshell`/`sp_`/`fn_`/`LOAD_FILE` 为小写） | ① **误报**：`system`（含 `SYS`）、`copyright`（含 `COPY`）、`mysql` 等普通词被判为 SQL 注入；② **漏报**：输入被转大写后，`xp_cmdshell` / `sp_` / `fn_` / `LOAD_FILE` 等小写条目**永远匹配不到** | 改为大小写不敏感的**词边界**正则：`/\b(xp_cmdshell|sp_\w+|fn_\w+|load_file|...)\b/i`，并统一表项大小写 |
| 7 | `prototype-pollution-guard.ts` → `isPolluted()` | 使用 `key in obj` 而非 `Object.prototype.hasOwnProperty.call(obj, key)`，`in` 会命中原型链属性 | `isPolluted({})` 返回 **true**（`constructor`/`__proto__` 恒在原型链上），该函数实际上对任何普通对象都返回 true，失去检测意义 | 改用 `hasOwnProperty` 判断自有属性；同时把 `__proto__` 从自有键检查改为 `Object.getPrototypeOf(obj) !== Object.prototype` 判定 |
| 8 | `prototype-pollution-guard.ts` 模块顶层 `if (typeof window !== 'undefined') protectPrototype()` | 在任何浏览器/jsdom 环境下 **import 即冻结 `Object.prototype`**，且不可逆 | 冻结是全局的、影响整个 JS realm；后续任何扩展 `Object.prototype` 的代码（polyfill、mock 库、测试断言库）在严格模式下会静默失败或抛错；在本仓库的 jsdom 测试环境中已实测 `Object.isFrozen(Object.prototype) === true` | 不要在模块顶层自动执行。改为导出一个显式 `initPrototypeProtection()` 由应用入口（`instrumentation.ts` / `layout.tsx`）调用一次；或仅在 `process.env.NODE_ENV === 'production'` 时执行 |

---

## 5. 遗留问题

1. **未覆盖的模块**：`src/lib/security/` 下还有 `audit.ts`、`csrf.ts`、`encryption.ts`、`headers.ts`（已有 48 用例）、`masking.ts`、`signature.ts`、`websocket-security.ts` 未纳入本任务范围。
2. **`masking.ts` 与 `log-sanitizer.ts` 功能重叠**（两套脱敏实现，配置与行为不一致），建议后续统一或明确分工，否则调用方容易用错。
3. **`sanitizeURL` 的编码副作用**：脱敏后的 `*` 会被 `URLSearchParams` 编码成 `%2A`、`@` 编码成 `%40`，返回的 URL 不再是人眼可读的掩码串；若日志系统需要可读性，建议自建序列化而非直接用 `URLSearchParams.toString()`。本轮测试只断言「不再包含原始敏感值」。
4. **`sanitizeHeaders` 对 `Headers` 实例**：jsdom/undici 的 `Headers` 会把键名小写化，测试已按实际行为断言；若未来浏览器行为变化需同步更新。
5. **`protectPrototype()` 的冻结不可逆**：在 jsdom 下测试运行结束后 `Object.prototype` 仍被冻结，同一 worker 内后续测试文件若依赖原型扩展会受影响（当前 `forks` 池 + `isolate: true` 隔离了各文件，未观察到问题）。
6. **无法用类型系统验证的边界**：`maskCreditCard` 的 `RangeError` 行为已用断言固化，但生产端未做保护；建议在修复 bug 前不要直接对外暴露该函数。

---

## 6. 结论

**Partial（测试目标 Yes，缺陷修复待排期）**

- 三个正式测试文件已交付：**120 个新增用例，全绿**；`src/lib/security/` 目录整体 **7 文件 / 255 用例全部通过**。
- 覆盖了三个模块全部导出函数的核心分支与边界，断言与源码真实行为一致。
- 但在编写过程中发现 **8 项疑似 bug / 风险**（含任务重点关注的 3 条：`resetPatterns()` 缩减集、`refreshToken` 被通用 token 抢先匹配、`maskCreditCard` 忽略 config，另加 5 条），按要求**已用断言固化当前真实行为**而非修改生产代码，因此「测试目标达成、生产缺陷未修复」。
- 后续建议：按第 4 节表格的优先级（#1 #2 #7 #8 属安全语义问题，#3 #4 #5 属健壮性问题，#6 属误报/漏报）安排修复任务，修复后本套测试中的 `// BUG:` 断言需同步更新为期望行为。
