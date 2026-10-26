# T188 — 修复 tests/api-integration/notifications.test.ts（收集阶段失败）

日期：2026-10-27
执行人：🧪 测试修复工程师 T188

---

## 1. 根因

`tests/api-integration/notifications.test.ts` 在 vitest **collect 阶段**整体失败（0 用例），根因三处失效导入：

| 位置 | 失效导入 | 原因 |
|---|---|---|
| 第 77 行 | `import { GET, POST } from '@/app/api/notifications/route'` | 该 HTTP 路由已在提交 `1305b89038` 中被**删除**，`src/app/api/notifications/` 目录现完全不存在 |
| 第 78 行 | `import { authenticateJWT } from '@/lib/auth/api-auth'` | `@/lib/auth/api-auth` 模块不存在 |
| 第 11 行 | `vi.mock('@/lib/auth/api-auth', ...)` | 同上，mock 目标模块不存在 |

原文件共 1238 行、约 60 个用例，全部围绕已删除的 GET/POST 路由编写（鉴权 401、角色授权、按 type/priority/status 过滤、分页 limit、创建校验、错误处理、通知类型/优先级枚举、集成流程等）。

现存的 notifications 能力：
- `src/lib/notifications/store.ts` — zustand store（含 `persist`/`devtools`），提供通知增删改、未读计数、状态流转、过滤筛选、100 条上限、偏好管理，并导出 `selectUnreadCount / selectNotifications / selectPreferences / selectIsLoading` 选择器。
- `src/lib/notifications/index.ts` — 对外导出 store 与类型/模板。
- `src/types/notifications.ts` — `NotificationType` / `NotificationPriority` / `NotificationStatus` 枚举、`Notification` / `CreateNotificationDto` / `UpdateNotificationDto` / `NotificationFilters` / `NotificationListResponse` / `NotificationStats` / `NotificationPreferences` 等类型，以及 `NOTIFICATION_TEMPLATES` 纯数据常量。

另注：`src/lib/notifications/__tests__/store.test.ts` 已存在 store 单元测试；本次改造不删改它，本文件定位为**通知能力契约测试**（跨 store + 类型 + 已删除路由的业务规则），覆盖面与断言侧重与该单测互补。

## 2. 选择方案与理由

采用 **方案 A + 方案 B + 契约测试兜底** 的组合（以 A 为主）：

- **方案 A（主）**：把测试改为直接测试仍存在的 zustand store 行为 —— 创建通知、未读计数、标记已读/全部已读、状态流转、过滤筛选、100 条上限、偏好管理、选择器。
  理由：原测试想验证的核心业务语义（未读计数、状态流转、筛选、创建）**在 store 中仍然完整存在**，只是暴露方式从 HTTP 变成了状态容器。这是唯一不改动 `src/`、不复活已删除路由，又能保留原业务语义覆盖的路径。
- **方案 B（辅）**：测试 `src/types/notifications` 的枚举取值与 `NOTIFICATION_TEMPLATES` 契约（每个类型都有模板、占位符成对、默认优先级符合业务约定）。
  理由：这些是通知系统对外的**数据契约**，纯函数、无副作用、长期稳定，值得单独固化。
- **契约测试（兜底）**：从 `git show 1305b89038^:src/app/api/notifications/route.ts` 提取已删除路由的业务规则（优先级排序 urgent>high>normal>low、单页上限 100、默认优先级 NORMAL、默认状态 UNREAD、必填字段 user_id/type/title/content、`NotificationFilters` 全部过滤维度），断言现有实现与之保持一致。
  理由：路由虽然删了，但它代表的业务规则不应无声消失；契约测试让"删除实现但保留语义"这件事显式且可验证。

**未采用的方案**：重建 `src/app/api/notifications` 路由 —— 硬约束禁止，且与提交 `1305b89038` 的删除决策相悖。
**明确未采用**：删除文件 / 全部 skip / 空壳断言 —— 硬约束禁止。

## 3. 改动

唯一改动文件：**`tests/api-integration/notifications.test.ts`**（整文件重写，1238 行 → 570 行）

| 区块 | 行号 | 内容 | 用例数 |
|---|---|---|---|
| 文件头注释（1-27） | 说明历史背景、删除的路由引用、本次三段式改造方案 | — | — |
| Fixtures（40-71） | `makeNotification()` 工厂（46）、`resetStore()`（63） | — | — |
| 方案 A-1 状态与未读计数（77-161） | 初始化、addNotification 置顶+计数、已读不计数、setNotifications 重算、updateNotification 合并、removeNotification、clearAll | 7 | 7 |
| 方案 A-2 状态流转（163-215） | markAsRead 置 READ + 写 read_at + 递减计数、不影响其它通知、markAllAsRead、getUnreadNotifications 与 unreadCount 一致 | 4 | 4 |
| 方案 A-3 过滤筛选（217-279） | filterByType、filterByPriority、过滤不改变全局状态、无匹配返回空 | 4 | 4 |
| 方案 A-4 上限与偏好（281-346） | 120 条压入保留最新 100 条、updatePreferences 合并、resetPreferences 恢复默认、setLoading/setError、selectors 与 state 一致 | 6 | 6 |
| 方案 B 类型与模板契约（352-427） | 枚举覆盖、优先级/状态枚举值稳定、TEMPLATES 全类型覆盖、占位符成对、默认优先级业务约定、store 默认启用类型合法 | 6 | 6 |
| 契约测试（434-570） | 路由排序规则与枚举一致、单页上限 100 与 store 上限一致、默认 NORMAL/UNREAD、CreateNotificationDto 必填、UpdateNotificationDto 字段、NotificationFilters 维度、路由过滤语义由 store 等价表达 | 6 | 6 |

合计 **33 个用例**，无 skip、无 `as any` / `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` / `eslint-disable`。

关键技术点：
- store 选择器 `selectUnreadCount` 等**未**从 `@/lib/notifications`（index.ts）导出，仅 `store.ts` 导出 → 单独从 `@/lib/notifications/store` 引入。
- `useNotificationStore.setState(...)` 直接重置 store 状态 + `resetPreferences()`，隔离 `persist` 中间件在 localStorage 中的持久化残留（未直接清 localStorage，避免依赖 window 存在性差异）。
- 类型契约用 `import { type X }` 内联类型导入，`verbatimModuleSyntax` 安全。

## 4. 验证（真实输出）

命令：`npx vitest run tests/api-integration/notifications.test.ts 2>&1 | tail -12`

```
 [1m[30m[46m RUN [49m[22m [36mv4.1.12 [0m/root/.openclaw/workspace[0m

 [32m✓[39m tests/api-integration/notifications.test.ts [2m([0m[33m33 tests[0m)[2m 58[0mms[2m

 [2m Test Files [2m [1m[22m[1m passed[0m (1)[0m
 [2m      Tests [2m [1m[32m[1m[32m33 passed[0m[32m (33)[0m
   Start at  00:14:23
   Duration  2.20s (transform 481ms, setup 714ms, import 100ms, tests 58ms, environment 1.09s)
```

补充检查（真实执行）：
- `grep -n "as any\|@ts-ignore\|@ts-expect-error\|ts-nocheck\|eslint-disable\|\.skip\|todo" tests/api-integration/notifications.test.ts` → **无匹配**（输出仅 "grep done"）。
- `npx tsc --noEmit -p tsconfig.json | grep notifications.test` → **无该文件的任何类型错误**（输出仅 "tsc done"）。

用例数 **33 > 0**，全绿，非假绿。

## 5. 遗留

1. **HTTP 层通知能力目前无端到端测试**：`src/app/api/notifications/` 已不存在，`useFetchNotifications` / `useCreateNotification` 仍会 fetch `/api/notifications`，但服务端无对应路由 —— 这属于**产品侧遗留**（store hook 与后端不一致），不在本任务可改范围（禁止改 src/）。
2. `src/lib/notifications/__tests__/store.test.ts` 与本文件在 store 行为上有部分重叠；本文件侧重"契约 + 边界（100 上限、模板契约、已删路由规则）"。后续可考虑合并，但不建议在本次改动。
3. 本文件现位于 `tests/api-integration/` 目录但已**不再做 API 集成测试**，目录归属略有失真；未移动文件（移动会扩大 diff 面、且主管统一提交）。

## 6. 结论

**Yes** —— 原 collect 阶段整体失败的测试文件已修复为可运行且有实质断言的 33 个用例，覆盖未读计数、状态流转（未读→已读）、过滤筛选、数量上限、偏好管理、类型与模板契约，以及已删除 HTTP 路由遗留业务规则的契约断言。未改动 `src/` 下任何文件，未新增依赖，未改任何配置，未使用禁用手段，未删除文件、未 skip 任何用例，未执行任何 git 写操作。
