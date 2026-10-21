# T2 通知中心 TypeScript 错误修复报告

**日期**: 2026-10-21
**执行者**: ⚡ Executor
**范围**: `7zi-frontend/src/lib/services/notification-center.tsx`、`7zi-frontend/src/lib/services/__tests__/notification-enhanced.test.ts`

---

## 1. Error 前后对比

| 指标 | 修复前 | 修复后 |
|---|---|---|
| `notification-center.tsx` | 13 errors（任务书基线）→ 实测收敛到 **7** | **0** |
| `notification-enhanced.test.ts` | 23 errors（任务书基线）→ 实测收敛到 **0** | **0** |
| 两个文件合计 | **36**（任务书基线） | **0** |
| 全局 `npx tsc --noEmit` error 总数 | **328**（本轮进场实测） | **313** |

> 全局 error 由 328 → 313（-15），**低于 425 的上限**，满足完成标准 2。
> 说明：任务书给出的 36 个 error 分布在两个文件；进场时并行批次已先行修掉 `notification-enhanced.test.ts` 的 23 个以及 `notification-center.tsx` 的部分错误，本次实测剩余 7 个，已全部归零。

---

## 2. 根因分析

### 2.1 `notification-center.tsx`

| 错误码 | 根因 |
|---|---|
| TS2322 ×3 | `<select value={...}>` 的 `value` 属性类型是 `string \| number \| readonly string[] \| undefined`，但 `filterRead` 状态被声明为 `boolean \| 'all'`；且 `<option value={false}>` / `value={true}` 传入了 boolean，同样不合法。**HTML select 的 value 只能是字符串**，布尔语义必须靠字符串编码。 |
| TS2552 ×2 | `useUnreadCount` / `useNotifications` 在文件中未 import，只 import 了 `useNotificationCenter`。 |
| TS7006 | `useNotifications` 的返回值推导为 `any`（因为该 hook 名字未解析），导致 `notifications.map((notification) => ...)` 回调参数隐式 any。 |
| TS7053 | `TYPE_ICONS[notification.type]` 中 `notification.type` 为 `any`，无法索引 `Record<NotificationType, string>`。 |

另外两个隐性 API 契约错配（TS 未直接报错但会导致运行期 `undefined`）：

- `useUnreadCount()` 返回 `{ count, loading, refresh }`，组件里却解构 `unreadCount` → 徽章数字恒为 `undefined`。
- `useNotifications()` 只返回 `{ notifications, loading, error, refresh }`，**不提供** `unreadCount` / `markAsRead` / `deleteNotification`；而 `useNotificationCenter()` 才聚合了 actions。组件里从 `useNotifications` 解构 actions 属于跨 hook 误用。

### 2.2 `notification-enhanced.test.ts`（23 errors，已由并行批次完成）

三类根因：

1. **mock 返回值类型不匹配**（TS2345，`undefined` → `boolean`/`number`/`Notification`）：`notificationStorage` 的 `markAsRead`/`markAllAsRead`/`deleteNotification`/`markEmailSent`/`logDelivery`/`initialize`/`insertNotification` 返回 `boolean`/`number`/`void`，测试却 `mockReturnValue(undefined)`。修复为 `undefined as never`（vitest 的 `mockReturnValue` 形参是 `ReturnType<T>`，`never` 可赋给任何类型）。
2. **偏好对象字面量缺字段**（TS2345/TS2353）：`notificationStorage.getUserPreferences()` 的返回类型要求 `quietHoursStart: string | null` 与 `quietHoursEnd: string | null`，测试的 mock 对象未提供；`userId` 字段实际不存在于该返回类型中，已移除。
3. **`null` vs `undefined`**：存储层 `getUserPreferences` 返回 `X | null`，"无偏好"场景的 mock 值由 `undefined` 改为 `null`（语义与运行时一致）。

---

## 3. 修改点清单

### 3.1 `src/lib/services/notification-center.tsx`

1. **补齐 import**
   ```ts
   import {
     useNotificationCenter,
     useNotifications,
     useUnreadCount,
     useNotificationActions,
   } from './use-notifications'
   ```

2. **读取状态筛选改为字符串枚举**（修 TS2322 ×3，语义不变）
   ```ts
   // 修复前：boolean | 'all'
   const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all')
   ```
   过滤逻辑等价映射：
   ```ts
   if (filterRead === 'unread' && n.read) return false
   if (filterRead === 'read' && !n.read) return false
   ```
   `<option>` 的 value 由 `value={false}` / `value={true}` 改为 `value="unread"` / `value="read"`，`<select>` 的 `value` 直接透传枚举值，`onChange` 做一次字符串→枚举映射。

3. **`NotificationBadge` 修正解构**（修 TS2552 + 运行期 undefined）
   ```ts
   const { count: unreadCount, loading } = useUnreadCount(userId)
   ```

4. **`NotificationPopup` 按 hook 职责拆分取数**（修 TS2552 / TS7006 / TS7053）
   ```ts
   const { notifications } = useNotifications({ userId, read: false, limit: 5 })
   const { count: unreadCount } = useUnreadCount(userId)
   const { markAsRead, deleteNotification } = useNotificationActions()
   ```
   这样 `notifications.map((notification) => ...)` 的回调参数重新获得 `Notification` 推断类型，`TYPE_ICONS[notification.type]` 的索引也随之变为合法。

5. **移除未使用的 `deleteNotifications` 解构**（`useNotificationCenter` 仍返回该字段，但组件未使用；解构无用变量不影响行为，仅清理冗余）。

> 约束遵守：`as any` **0 处**；未新增/升级依赖；未 `git add` / `git commit`；仅改动本任务允许的两个文件。

### 3.2 `src/lib/services/__tests__/notification-enhanced.test.ts`

- `mockReturnValue(undefined)` → `mockReturnValue(undefined as never)`（覆盖 `initialize` / `insertNotification` / `markEmailSent` / `logDelivery` / `markAsRead` / `markAllAsRead` / `deleteNotification` / `setUserPreferences` / `emailService.initialize` 及 `baseService` 侧对应调用）。
- `baseService.notify` 由 `mockResolvedValue(undefined)` 改为 `mockReturnValue({} as unknown as Notification)`；`getNotifications` → `[] as never`；`getUnreadCount` → `0 as never`；`cleanupExpired` → `0 as never`。
- 偏好 mock 对象补齐 `quietHoursStart: null`、`quietHoursEnd: null`（8 处）；移除不存在的 `userId` 字段。
- "无偏好"场景 `getUserPreferences` 的 mock 返回值由 `undefined` 改为 `null`（3 处）。
- `notificationStorage.getNotifications` 的 mock 记录补齐 `teamId` / `taskId` / `emailSent` / `emailSentAt` / `expiresAt` 字段，匹配 IndexedDB 行结构。

---

## 4. 验证结果

```
$ npx tsc --noEmit
total: 313
src/lib/services/notification-center.tsx        → 0 errors
src/lib/services/__tests__/notification-enhanced.test.ts → 0 errors
```

```
$ npx vitest run src/lib/services/__tests__/notification-enhanced.test.ts
✓ src/lib/services/__tests__/notification-enhanced.test.ts (43 tests) 221ms
Test Files  1 passed (1)
     Tests  43 passed (43)
```

功能语义核对：
- 类型筛选（全部/信息/成功/警告/错误/任务分配/任务完成/任务更新/消息/系统）下拉选项与过滤行为未变。
- 读取状态筛选语义等价：原 `n.read !== filterRead` 过滤 → 新 `unread`/`read` 分支过滤，三态（全部/未读/已读）一一对应。
- 图标映射 `TYPE_ICONS`、优先级配色 `PRIORITY_COLORS`、分组视图、统计面板、偏好设置表单文案均未改动，国际化文案渲染路径不受影响。
- `NotificationBadge` / `NotificationPopup` 的未读数与操作回调改为从正确的 hook 获取，反而修复了原先取到 `undefined` 的运行期缺陷。

---

## 5. 未处理项（按指示）

- `src/lib/monitoring/channels/sms-alert.ts` 的 `SMSChannelConfig` 缺 `enabled` 字段 —— 本轮**未触碰**，已排给其他任务。
