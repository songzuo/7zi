# T76 — error-reporting.ts 单元测试报告

**任务**：为 `7zi-frontend/src/lib/error-reporting/error-reporting.ts` 编写 vitest 单元测试（此前无任何测试文件），并顺手修掉 `retry.ts` 的 ESLint warning。

**状态**：✅ 完成（未执行 git add / commit）

---

## 1. 被测模块 API 摘要

文件：`7zi-frontend/src/lib/error-reporting/error-reporting.ts`（391 行）

### 导出类型
| 名称 | 说明 |
|---|---|
| `ErrorSeverity` | `'low' \| 'medium' \| 'high' \| 'critical'` |
| `ErrorCategory` | `'javascript' \| 'network' \| 'api' \| 'resource' \| 'rendering' \| 'performance' \| 'security' \| 'other'` |
| `ErrorReport` | 上报报告结构：`id / timestamp / type / message / severity / category / stack? / context / userAgent? / url? / userId? / sessionId?` |
| `ErrorReportingConfig` | `enabled / sampleRate / bufferSize / flushInterval / endpoint? / beforeSend? / onError?` |

### 导出类 `ErrorReportingService`
| 成员 | 行为 |
|---|---|
| `constructor(config?)` | 合并默认配置（enabled=true, sampleRate=1.0, bufferSize=100, flushInterval=10000），生成 `session_xxx` 会话 ID |
| `init()` | enabled=false 时直接返回；启动 `setInterval` 周期 flush；在 `window` 上注册 `error` / `unhandledrejection` / 捕获阶段 `error` 三个监听器 |
| `reportError(type, message, stack?, category='other', severity='medium', context={})` | 核心路径：enabled 检查 → 采样检查(`Math.random() > sampleRate` 则丢弃) → 构造报告 → `beforeSend` 钩子（返回 null 则丢弃）→ 入缓冲 → 缓冲区满自动 flush → 始终调用 `monitor.trackError` |
| `reportJavaScriptError(error, ctx?)` | type=error.name，severity='high'，category='javascript' |
| `reportAPIError(endpoint, statusCode, msg, ctx?)` | severity：≥500 critical / ≥400 medium / 其余 low；message=`${msg} (${status})` |
| `reportPerformanceError(metric, current, threshold, ctx?)` | message=`${metric} exceeded threshold: ${current} > ${threshold}` |
| `manualFlush()` | 手动 flush（空缓冲为 no-op） |
| `getBufferSize()` / `clearBuffer()` | 缓冲 introspection / 清理 |
| `updateConfig(partial)` | 浅合并配置；若已存在定时器则用新间隔重启 |
| `stop()` | 清定时器并 flush 剩余报告 |

### 模块级导出
- `errorReporting`：默认单例
- `initErrorReporting(config?)`：更新单例配置并 init，返回单例
- `reportError(error: Error|string, ctx?)`：字符串走 `Error/other/medium`，Error 实例走 `reportJavaScriptError`
- `reportAPIError(endpoint, statusCode, msg, ctx?)`

**去重/频率限制说明（实测结论）**：该模块**没有内置的去重逻辑**——"去重/限频"能力由两个可配置机制承担：`sampleRate`（采样限频）与 `beforeSend`（钩子，可返回 `null` 丢弃重复报告或改写报告）。测试按此真实行为断言，未臆造不存在的 API。

---

## 2. 测试用例清单

文件：`7zi-frontend/src/lib/error-reporting/__tests__/error-reporting.test.ts`（581 行，**40 个用例**）

**隔离手段**
- `vi.mock('../../monitoring')` → 只 mock `monitor.trackError`（避免真实监控存储/告警链路）
- `vi.mock('@/lib/utils')` → mock `generateSecureId`，使 id/sessionId 断言确定化（用 `vi.hoisted` 规避提升问题）
- `vi.stubGlobal('fetch', ...)` + `afterEach vi.unstubAllGlobals()` 隔离自定义端点上报
- `vi.spyOn(window, 'addEventListener')` 拦截并手动触发全局错误处理器的回调，`afterEach` 恢复
- `vi.useFakeTimers()` 测周期 flush / `updateConfig` 重启定时器 / `stop`
- `vi.spyOn(Math, 'random')` 精确控制采样分支
- `vi.spyOn(console, 'error')` 隔离失败刷写的日志输出

**分组与用例**

| 分组 | 用例 | 断言要点 |
|---|---|---|
| constructor & defaults (3) | 默认配置 / 配置覆盖生效 / 实例独立 | bufferSize 生效触发自动 flush；实例互不相同 |
| reportError 核心路径 (3) | 入缓冲并调用 trackError / 报告字段完整 / 默认 category+severity | id 前缀 `error_`、timestamp 为数字、sessionId 前缀 `session_`、userAgent/url 取自 window |
| 采样与限频 (4) | random > sampleRate 丢弃 / ≤ sampleRate 上报 / 默认 sampleRate=1 必报 / enabled=false 完全不上报 | 缓冲区与 mock 调用次数双向断言 |
| beforeSend 去重/改写 (2) | 返回 null 丢弃报告 / 改写后的报告被投递 | hook 收到原始报告；投递出去的是改写后版本 |
| 类型化 helper (4) | reportJavaScriptError / reportAPIError 状态码分级(500/404/200) / context 合并 / reportPerformanceError 文案 | category、severity、message、context 全字段断言 |
| 缓冲与刷新 (4) | 满 bufferSize 自动 flush / manualFlush 清空并发送 / 空缓冲 no-op / clearBuffer | getBufferSize + trackError 调用次数 |
| 自定义端点 (4) | POST 到 endpoint（URL/method/header/body 结构） / 未配置 endpoint 不调 fetch / 失败时回滚缓冲并调用 onError / 非 Error 异常被包装成 Error | 缓冲恢复为 1、onError 收到 (Error, report)、console.error 被调用 |
| init / 定时器 / stop (6) | disabled 不设定时器 / init 周期 flush / updateConfig 重启定时器 / updateConfig 合并配置 / stop 刷写并清定时器 / stop 未 init 不抛错 | fake timers 推进断言 trackError 时机 |
| 全局错误处理器 (6) | 注册 error/unhandledrejection 监听器 / unhandledrejection 上报 / 非对象 reason 字符串化 / 资源加载失败(Element target) / target===window 时忽略 / 未捕获 JS 错误上报 | 类型、message、stack、context 精确断言 |
| 模块级便捷函数 (4) | initErrorReporting 返回单例 / reportError 字符串分支 / reportError Error 分支 / reportAPIError 转发 | 转发参数完整断言 |

---

## 3. 实际新增 / 修改文件

| 文件 | 状态 | 行数 |
|---|---|---|
| `7zi-frontend/src/lib/error-reporting/__tests__/error-reporting.test.ts` | 新增 | 581 |
| `7zi-frontend/src/lib/error-reporting/retry.ts` | 修改（仅 1 行） | 610 |

retry.ts 修复（第 11 行，未用泛型参数改为下划线前缀，类型行为不变）：

```diff
-export interface RetryOptions<T = unknown> {
+export interface RetryOptions<_T = unknown> {
```

未改动 `retry.test.ts` / `error-log-history.test.ts` / `global-error-handler.test.ts`（git status 确认它们未出现在改动列表中）；未触碰 `src/lib/error-reporting/` 以外任何文件；未执行 git add / commit。

---

## 4. 验证命令与输出摘要

```
$ cd /root/.openclaw/workspace/7zi-frontend && npx vitest run src/lib/error-reporting
 Test Files  4 passed (4)
      Tests  89 passed (89)
   Duration  3.84s → 5.59s   ✅ (≤30s)
```

4 个测试文件全部通过：新增 `error-reporting.test.ts` 40 例 + 既有 retry 21 例 / error-log-history 21 例 / global-error-handler 7 例。

```
$ npx eslint src/lib/error-reporting
（无输出）
ESLINT_EXIT=0   ✅ 0 warnings / 0 errors
```

覆盖率（仅 error-reporting.ts）：
```
 File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered
 All files          |     100 |    86.88 |     100 |     100 |
 ...r-reporting.ts |     100 |    86.88 |     100 |     100 | ...97,360,375,390
```

---

## 5. 遗留问题 / 建议

1. **模块本身没有内置去重**：`error-reporting.ts` 对同一错误重复上报不做合并/抑制，只能靠 `sampleRate` 与 `beforeSend` 钩子实现。若产品需要"相同错误 N 秒内只报一次"，应在实现中补充（本次未改实现，测试按现状断言）。
2. **无敏感信息脱敏**：`ErrorReport.context` 原样透传，模块不做 PII/token 脱敏。测试中以 `beforeSend` 钩子模拟脱敏场景（验证 hook 返回 null 可丢弃、返回改写报告可生效），但**生产代码仍缺少默认脱敏层**——建议后续在 `reportError` 内置 token/手机号/身份证等敏感字段过滤。
3. **分支覆盖率 86.88%**：未覆盖的主要是 `typeof window !== 'undefined'` 为 false 的 SSR 分支（jsdom 环境恒为 true）与 `fetch` 不存在的极端分支。需 Node 环境测试才能补齐。
4. **`RetryOptions<T>` 的 `T` 本就没被使用**（仅是历史遗留的泛型参数），本次改为 `_T` 只是消除 lint 警告，未改变任何运行时行为；若后续想真正使用泛型，可让它约束 `onError`/结果类型。
5. **`monitor.trackError` 被调用时机**：无论是否配置 `endpoint`，`reportError` 都会立即调用 `monitor.trackError`，而自定义 endpoint 的上报要等到 flush。这会导致监控通道与自定义通道的数据量/时机不一致，属实现设计现状，测试已如实记录。
