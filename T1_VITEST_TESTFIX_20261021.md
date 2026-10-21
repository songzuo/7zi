# T1 任务报告：Vitest 测试类型修复 + WebSocket 边界用例补充

**执行人**：🧪 测试员（tester-vitest-fix）
**日期**：2026-10-21
**工作目录**：`/root/.openclaw/workspace/7zi-frontend`
**任务代号**：T1（测试编写 + 测试类型修复）

---

## 一、结论速览

| 指标 | 修复前 | 修复后 | 结论 |
|---|---|---|---|
| `npx tsc --noEmit` 总错误数（全局） | **556** | **267 ~ 308**（区间波动） | ✅ 远优于基线 |
| 我负责的 8 个测试文件内错误数 | **178** | **0** | ✅ 全部清零 |
| 目标测试文件 vitest 通过率 | 大量失败 | **291 passed / 1 skipped / 292** | ✅ 全绿 |
| 新增 websocket 边界用例 | 0 | **28 个** | ✅ 超过要求的 5 个 |

> 说明：全局错误数从 556 降到 267，其中 **178 个来自我负责的测试文件**，其余降幅来自本轮并行代理对被测源码的修复（源码归属另一位代理）。我的改动严格限制在测试文件内。
>
> ⚠️ **关于数值波动**：由于同一工作区有多个代理并行改源码，末次复测全局错误数回升到 **308**（期间主管还执行了 2 次提交）。**关键指标稳定**：我负责的 9 个测试文件在多次复测中始终保持 **0 错误**，且始终远低于 556 的基线上限。

---

## 二、逐文件改动明细

### 1. `src/components/performance/__tests__/PerformanceDashboard.test.tsx`
- 新增 `import { describe, it, expect, vi, beforeEach } from 'vitest'`
- **修正错误导入路径**：`./PerformanceDashboard` → `../PerformanceDashboard`
- 新增 `import { calculateWebVitalsScore } from '@/lib/performance/web-vitals'`（组件依赖但原测试未 mock）
- `jest.mock(...)` → `vi.mock(...)`；`as jest.Mock` → `as Mock`（`import type { Mock } from 'vitest'`）
- **修正 mock 路径**：`vi.mock('@/components/ui/tabs')` → `vi.mock('@/components/ui/Tabs')`（大小写不符导致 mock 未生效）
- 移除 `@testing-library/jest-dom` 导入（Vitest 环境无该扩展，`toBeInTheDocument` matcher 不可用 → 改用原生断言）
- 运行期修复：组件多处渲染相同文案（`/90\/100`、`Web Vitals`、`Custom Metrics`、`Performance Budget`、`LCP`），原 `getByText` 触发 "Found multiple elements" → 改用 `getAllByText(...).length` 断言

### 2. `src/lib/monitoring/channels/email-alert.test.ts`
- 补充 `import { describe, it, expect, vi, beforeEach } from 'vitest'`
- `jest.` → `vi.`；`jest.fn()` → `vi.fn()`
- `.mockResolvedValue()` → `.mockResolvedValue(undefined)`（TS 要求显式参数）
- `defaultConfig` 补 `enabled: true`（`BaseChannelConfig.enabled` 为必填）
- 新增 `import type { DedupConfig } from './base-alert-channel'`，`newDedupConfig` 显式标注类型
- **移除 `userId` 字段**（`getUserPreferences` 返回类型中无该字段）

### 3. `src/lib/monitoring/channels/sms-alert.test.ts`
- 补充 vitest 全局导入；`jest.` → `vi.`
- `defaultConfig` 补 `enabled: true`
- `newDedupConfig` 标注 `DedupConfig`
- `fetchCalls.map(call => ...)` 补 `call: any[]` 消除隐式 any
- `mockImplementation()` → `mockImplementation(() => undefined)`
- 运行期修复：源码走 `logger.debug` 而非 `console.log` → 断言改为 spy `console.debug` + `expect.stringContaining(...)`

### 4. `src/lib/monitoring/__tests__/slack-alert.test.ts`
> ⚠️ **路径纠正**：任务单写的是 `src/lib/monitoring/channels/slack-alert.test.ts`，实际文件在 `src/lib/monitoring/__tests__/slack-alert.test.ts`（`channels/` 下不存在）。已按实际路径处理。

- 补充 vitest 全局导入；`jest.` → `vi.`
- 所有 `new SlackAlertChannel({...})` 补 `enabled: true`
- `error.code = 'ECONNREFUSED'` → `Object.assign(new Error(...), { code: 'ECONNREFUSED' })`（`Error` 无 `code` 属性）
- `global.fetch = mockFetch` → `global.fetch = mockFetch as unknown as typeof global.fetch`

### 5. `src/lib/monitoring/channels/webhook-alert.test.ts`
- 补充 vitest 全局导入；`jest.` → `vi.`
- `defaultConfig` 补 `enabled: true`
- `newDedupConfig` 标注 `DedupConfig`
- **该文件 tsc 原本就 0 错误**，仅做一致性清理

### 6. `src/lib/monitoring/__tests__/integration.test.ts`
- 补充 vitest 全局导入；`jest.` → `vi.`
- **所有 `addRule({...})` 调用补 `description` 字段**（`AlertRule` 接口必填）
- `EmailAlertChannel` / `SlackAlertChannel` 构造补 `enabled: true`
- `globalThis.fetch = async (...)` → 显式 `as unknown as typeof globalThis.fetch`（返回 `Promise<Response>` 类型不匹配）
- `capturedAlert?.ruleName` → `(capturedAlert as Alert | null)?.ruleName`（TS 控制流收窄问题）

### 7. `src/lib/services/__tests__/notification-enhanced.test.ts`
- 补充 vitest 全局导入；`jest.` → `vi.`
- **23 个错误 → 0**，本文件是任务单中错误最密集的文件：
  - 所有 void 返回的 mock 加 `as never` 断言：`vi.mocked(x).mockReturnValue(undefined as never)`
  - `getUserPreferences` mock 补 `quietHoursStart` / `quietHoursEnd`（共 4 处对象字面量），并把 `undefined` 改 `null`（返回类型为 `UserPreferences | null`）
  - `baseService.notify` → `mockReturnValue({} as unknown as Notification)`
  - `getNotifications` / `getUnreadCount` / `cleanupExpired` → `as never`
  - 通知行对象补全 `teamId` / `taskId` / `emailSent` / `emailSentAt` / `expiresAt` 字段

### 8. `src/lib/search/__tests__/fuzzy-search.spec.ts`
- 补充 vitest 全局导入；`jest.` → `vi.`
- **关键修复**：泛型约束为 `T extends { text?: string }`，原 `const items = [{ id, name }]` 推断为无 `text` 属性的类型 → 无法满足约束。
  - 方案（**未改动源码**）：在测试文件内新增模块级 `interface TestItem { id: number; name: string; text?: string }`，并将 `items` 与性能测试的 1000 条数组标注为 `TestItem[]`
  - 严格遵守「不修改被测源码」的约束

### 9. 🆕 `src/lib/websocket/__tests__/websocket-client.edge-cases.test.ts`（新增文件）
**28 个边界用例**，覆盖任务要求的全部 5 个维度：

| 维度 | 用例数 | 代表用例 |
|---|---|---|
| **重连** | 7 | 传输层关闭 → `reconnecting`；`io client disconnect` / `io server disconnect` 不重连；达到最大次数 → `error` + `max_attempts_reached` 历史；重连中再次断开 → `aborted`；`online` 事件触发快速重连；`clearReconnectionHistory` 幂等 |
| **消息去重** | 6 | 同一监听器重复注册只回调一次（Set 语义）；`off()` 后不再收到；状态监听器重复注册去重；离线队列过期消息清理；超过 `maxQueueSize` 淘汰最旧；`clearQueue` 清空 |
| **超时** | 4 | 连续丢失 3 次心跳 → 断连并上报 `WebSocketHeartbeatTimeout`；`pong` 重置丢失计数；告警文案含丢失次数；`disconnect` 后心跳定时器被清理 |
| **错误事件** | 5 | `connect_error` → `error` 状态 + 日志；`connect_error` 后安排重连；`error` 事件不改变连接状态；消息监听器抛异常不影响其它监听器；状态监听器抛异常不影响其它监听器 |
| **鉴权失败** | 6 | `auth` 参数透传给 socket.io；未配置时传 `{}`；鉴权失败 → `error` 状态；失败达上限 → `max_attempts_reached`；上报 `WebSocketReconnectFailed` 指标；重连成功后清零尝试次数并累计 `totalReconnections` |

技术实现要点：
- 用 `vi.hoisted` 构建**每次 `io()` 返回全新 socket 实例**的 mock（原生 mock 复用同一实例，无法精确控制"哪一次连接"的事件）
- socket mock 自带 `__fire` / `__fireAny` 辅助方法，用于触发 `connect` / `disconnect` / `connect_error` / `error` / `pong` 事件及 `onAny` 消息
- `vi.stubGlobal('window', ...)` 提供 `localStorage` 与 `addEventListener` 桩，捕获 `online` 事件监听器
- 全程使用 `vi.useFakeTimers()` 精确控制心跳/重连退避计时

---

## 三、Vitest 运行结果

```
npx vitest run <10 个目标文件>

 Test Files  10 passed (10)
      Tests  291 passed | 1 skipped (292)
   Duration  ...
```

| 测试文件 | 结果 |
|---|---|
| `PerformanceDashboard.test.tsx` | ✅ PASS |
| `monitoring/channels/email-alert.test.ts` | ✅ PASS |
| `monitoring/channels/sms-alert.test.ts` | ✅ PASS |
| `monitoring/__tests__/slack-alert.test.ts` | ✅ PASS |
| `monitoring/channels/webhook-alert.test.ts` | ✅ PASS |
| `monitoring/__tests__/integration.test.ts` | ✅ PASS |
| `services/__tests__/notification-enhanced.test.ts` | ✅ PASS |
| `search/__tests__/fuzzy-search.spec.ts` | ✅ PASS |
| `websocket/__tests__/websocket-client.test.ts` | ✅ PASS |
| `websocket/__tests__/websocket-client.edge-cases.test.ts`（新增） | ✅ PASS (28/28) |

**无环境问题导致的无法运行文件。** 1 个 skipped 为原有 `Performance Benchmark Tests` 中的跳过用例，非本次引入。

---

## 四、约束遵守情况自查

| 约束 | 状态 | 证据 |
|---|---|---|
| 只改指定测试文件 + `src/lib/websocket/__tests__/` 新文件 | ✅ | `git status` 确认；唯一新增文件为 `websocket-client.edge-cases.test.ts` |
| 禁止改动 `src/lib/websocket/core.ts` | ✅ | `git status src/lib/websocket/core.ts` 为空 |
| 禁止改动任何非测试源码 | ✅ | 我未改任何 `.ts` 源码文件；`sms-alert.ts` / `webhook-alert.ts` / `email-alert.ts` 的改动来自并行的源码修复代理，非本人操作 |
| 禁止 `git commit` / `git add` | ✅ | 本人未执行任何 git 写操作（中途的提交由主管执行） |
| 不新增/升级依赖 | ✅ | `package.json` 未改动 |
| tsc 错误总数 ≤ 556 | ✅ | 末次实测 **308**（区间 267~308），始终 ≤ 556 |
| 源码缺失导出时用 `as unknown as X` 最小断言 | ✅ | 见 fuzzy-search（`TestItem` 接口）、integration（`as Alert | null`）、notification-enhanced（`as never`） |

---

## 五、遗留 / 需主管关注

1. **`src/lib/monitoring/channels/email-alert.ts:400` 仍有 1 个 tsc 错误**（`Argument of type 'unknown' is not assignable to parameter of type 'Error | undefined'`）—— 属源码问题，已交由源码修复代理处理，我未越界修改。
2. **任务单路径与实际不符**：`slack-alert.test.ts` 实际位于 `src/lib/monitoring/__tests__/` 而非 `channels/`。已按实际路径修复，建议后续任务单以此为准。
3. **本轮有并行代理在同一工作区活动**：源码修复代理、websocket 服务代理等同时在改文件，且主管在 14:50 执行了一次提交（`d09b67899`），把我工作区里尚未提交的改动一并纳入。建议后续并行任务明确文件隔离范围，避免互相覆盖。
4. **vitest.config.ts 中 `retry: 1`** 会在失败时自动重跑一次，排障时可能掩盖 flaky 问题（本次 3 个初版失败用例即在 retry 时才暴露为真实逻辑差异）。
