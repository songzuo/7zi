# 实时通知系统实现总结

## 项目概述

为 7zi-project 添加了完整的实时通知系统，支持三种通知渠道：
1. **WebSocket 实时推送** - 使用 Socket.IO 实现实时浏览器通知
2. **站内消息通知** - 使用 SQLite 持久化存储，支持已读/未读追踪
3. **邮件通知（可选）** - 使用 Resend API 发送 HTML 格式邮件

## 实现的功能

### 1. 邮件通知服务 (`email.ts`)

**核心功能：**
- 使用 Resend API 发送邮件
- 支持自定义 HTML 邮件模板
- 支持纯文本备用内容
- 支持抄送（CC）和密送（BCC）
- 支持邮件标签追踪
- 标准化通知邮件模板，包含行动按钮

**主要接口：**
```typescript
class EmailService {
  initialize(config: EmailConfig): void
  sendEmail(notification: EmailNotification): Promise<Result>
  sendNotificationEmail(params): Promise<Result>
  isEnabled(): boolean
}
```

### 2. 持久化存储服务 (`notification-storage.ts`)

**核心功能：**
- SQLite 数据库存储（WAL 模式，高性能）
- 通知记录表（支持用户、团队、任务关联）
- 用户偏好设置表（自定义通知配置）
- 投递日志表（追踪所有通知投递）
- 支持过期通知自动清理
- 提供完整 CRUD 操作

**数据库表结构：**

```sql
-- 通知表
notifications (
  id, type, priority, title, message, data,
  user_id, team_id, task_id, read,
  email_sent, email_sent_at,
  created_at, expires_at
)

-- 用户偏好表
user_notification_preferences (
  user_id, email_enabled, email_threshold,
  push_enabled, push_threshold,
  digest_enabled, digest_frequency,
  quiet_hours_start, quiet_hours_end, timezone
)

-- 投递日志表
notification_delivery_log (
  notification_id, channel, recipient,
  status, error_message, sent_at, delivery_metadata
)
```

### 3. 增强通知服务 (`notification-enhanced.ts`)

**核心功能：**
- 整合 WebSocket、邮件、存储三种通知渠道
- 智能决策：基于用户偏好和通知优先级决定投递方式
- 支持静默时段（Quiet Hours）
- 支持强制邮件投递
- 通知投递日志记录
- 提供完整的统计信息

**通知流程：**

```
触发通知
    │
    ▼
┌──────────────────────────────────────┐
│ 1. 生成通知 ID 和完整数据             │
│    - 自动生成唯一 ID                   │
│    - 添加创建时间戳                     │
│    - 设置未读状态                       │
└──────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────┐
│ 2. 持久化到 SQLite 数据库             │
│    - 存储通知记录                     │
│    - 支持过期时间                      │
└──────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────┐
│ 3. WebSocket 实时推送                 │
│    - 推送到用户频道 (user:{userId})    │
│    - 推送到团队频道 (team:{teamId})    │
│    - 系统通知推送到 all 频道            │
└──────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────┐
│ 4. 检查用户偏好                       │
│    - 邮件是否启用？                     │
│    - 优先级是否达到阈值？               │
│    - 当前是否在静默时段？               │
└──────────────────────────────────────┘
    │
    ├── 是 ──▶ 5. 发送邮件通知
    │           - 使用 Resend API
    │           - 生成 HTML 模板
    │           - 记录投递状态
    │
    └── 否 ──▶ 跳过邮件
```

### 4. API 端点

#### `/api/notifications/enhanced`
- **GET** - 获取通知列表（支持过滤）
- **POST** - 创建并发送通知（多渠道）

#### `/api/notifications/preferences/{userId}`
- **GET** - 获取用户通知偏好
- **PUT** - 更新用户通知偏好

#### `/api/notifications/stats`
- **GET** - 获取通知系统统计信息

### 5. 用户偏好设置

用户可以自定义以下设置：

| 设置项 | 描述 | 默认值 |
|--------|------|--------|
| `emailEnabled` | 启用邮件通知 | `true` |
| `emailThreshold` | 邮件最低优先级 | `high` |
| `pushEnabled` | 启用推送通知 | `true` |
| `pushThreshold` | 推送最低优先级 | `medium` |
| `digestEnabled` | 启用摘要邮件（预留） | `false` |
| `digestFrequency` | 摘要频率 | `daily` |
| `quietHoursStart` | 静默时段开始 | - |
| `quietHoursEnd` | 静默时段结束 | - |
| `timezone` | 用户时区 | `UTC` |

### 6. 通知类型和优先级

**通知类型：**
- `info` - 一般信息
- `success` - 成功消息
- `warning` - 警告消息
- `error` - 错误消息
- `task_assigned` - 任务分配
- `task_completed` - 任务完成
- `task_updated` - 任务更新
- `message` - 直接消息
- `system` - 系统通知

**优先级（从高到低）：**
1. `urgent` - 紧急（所有渠道）
2. `high` - 高优先级（推送 + 邮件）
3. `medium` - 中优先级（推送 + 有条件邮件）
4. `low` - 低优先级（仅推送）

## 通知流程详解

### 完整的通知投递生命周期

```
1. 通知触发
   ├─ 任务分配
   ├─ 任务完成
   ├─ 任务更新
   ├─ 系统消息
   └─ 用户消息

   │

2. 创建通知对象
   ├─ 生成唯一 ID
   ├─ 设置类型和优先级
   ├─ 添加标题和消息
   ├─ 附加元数据（可选）
   ├─ 关联用户/团队/任务（可选）
   ├─ 设置过期时间（可选）
   └─ 标记为未读

   │

3. 持久化存储
   ├─ 写入 SQLite notifications 表
   ├─ 索引：user_id, team_id, task_id, type, priority
   └─ 支持快速查询和过滤

   │

4. WebSocket 推送
   ├─ 建立 Socket.IO 连接
   ├─ 订阅相关频道
   │   ├─ user:{userId}
   │   ├─ team:{teamId}
   │   └─ all (系统通知)
   ├─ 实时推送通知
   ├─ 客户端接收并显示
   └─ 记录投递日志 (channel: 'websocket')

   │

5. 邮件发送决策
   ├─ 检查邮件服务是否启用
   ├─ 获取用户偏好设置
   ├─ 验证以下条件：
   │   ├─ emailEnabled === true
   │   ├─ 通知优先级 >= emailThreshold
   │   ├─ 当前时间不在静默时段内
   │   └─ （或）forceEmail === true
   │
   ├─ 满足条件 → 发送邮件
   │   ├─ 生成 HTML 邮件模板
   │   ├─ 添加行动按钮
   │   ├─ 调用 Resend API
   │   ├─ 标记 email_sent = true
   │   ├─ 记录 messageId
   │   └─ 记录投递日志 (channel: 'email')
   │
   └─ 不满足条件 → 跳过邮件

   │

6. 客户端处理
   ├─ 接收 WebSocket 事件
   ├─ 更新通知列表
   ├─ 更新未读计数
   ├─ 显示浏览器通知（如果已授权）
   ├─ 显示 Toast 通知
   └─ 更新通知中心徽章

   │

7. 用户交互
   ├─ 查看通知
   ├─ 标记为已读
   │   ├─ 客户端乐观更新
   │   ├─ 发送 mark_read 事件到服务器
   │   ├─ 更新数据库
   │   └─ 广播更新给所有订阅者
   ├─ 标记全部为已读
   ├─ 删除通知
   │   ├─ 客户端乐观更新
   │   ├─ 发送 delete 请求到服务器
   │   └─ 从数据库删除
   └─ 点击通知跳转
       ├─ 跳转到相关页面
       ├─ 自动标记为已读
       └─ 关联上下文

   │

8. 后台维护
   ├─ 定期清理过期通知
   │   ├─ 每 5 分钟执行一次
   │   ├─ 删除 expires_at < now 的通知
   │   └─ 返回清理数量
   └─ 数据库统计
       ├─ 总通知数
       ├─ 未读数
       ├─ 活跃用户数
       └─ 总投递数
```

### 通知投递决策树

```
notify(notification, options)
│
├─ skipStorage? ──┬─ 是 ──▶ 跳过存储
│                 └─ 否 ──▶ 存储到 SQLite
│
├─ skipPush? ────┬─ 是 ──▶ 跳过 WebSocket
│                 └─ 否 ──▶ WebSocket 推送
│
└─ skipEmail? ───┬─ 是 ──▶ 跳过邮件
                  └─ 否 ──▶ 检查邮件发送条件
                      │
                      ├─ forceEmail? ──┬─ 是 ──▶ 发送邮件
                      │                 └─ 否 ──▶ 继续检查
                      │
                      ├─ 有 emailRecipients? ──┬─ 是 ──▶ 发送邮件
                      │                      └─ 否 ──▶ 继续检查
                      │
                      ├─ 有 userId?
                      │   ├─ 是 ──▶ 获取用户偏好
                      │   │           │
                      │   │           ├─ emailEnabled === true?
                      │   │           │   ├─ 是 ──▶ 继续
                      │   │           │   └─ 否 ──▶ 跳过
                      │   │           │
                      │   │           ├─ 在静默时段?
                      │   │           │   ├─ 是 ──▶ 跳过
                      │   │           │   └─ 否 ──▶ 继续
                      │   │           │
                      │   │           └─ 优先级 >= emailThreshold?
                      │   │               ├─ 是 ──▶ 发送邮件
                      │   │               └─ 否 ──▶ 跳过
                      │   │
                      │   └─ 否 ──▶ 跳过（无用户信息）
                      │
                      └─ 结果 ──▶ 记录投递日志
```

## 使用示例

### 服务端：发送通知

```typescript
import { enhancedNotificationService } from '@/lib/services/notification-enhanced';

// 发送任务分配通知
await enhancedNotificationService.notify(
  {
    type: 'task_assigned',
    priority: 'high',
    title: 'New Task Assigned',
    message: 'You have been assigned to review PR #456',
    userId: 'user123',
    taskId: 'task456',
    data: {
      taskUrl: 'https://7zi.com/tasks/task456',
      assignee: 'John Doe',
    },
  },
  {
    forceEmail: true, // 强制发送邮件
  }
);
```

### 客户端：使用通知 Hook

```typescript
'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { NotificationProvider } from '@/components/notifications';

function Dashboard() {
  const { notifications, unreadCount, markAsRead } = useNotifications({
    autoConnect: true,
    userId: 'user123',
    teamId: 'team456',
  });

  return (
    <div>
      <BellIcon />
      <span>{unreadCount}</span>
      {notifications.map(n => (
        <NotificationItem
          key={n.id}
          notification={n}
          onRead={() => markAsRead(n.id)}
        />
      ))}
    </div>
  );
}
```

### 客户端：更新用户偏好

```typescript
// 更新通知偏好
await fetch('/api/notifications/preferences/user123', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emailEnabled: true,
    emailThreshold: 'high',
    pushEnabled: true,
    pushThreshold: 'medium',
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    timezone: 'Europe/Berlin',
  }),
});
```

## 环境配置

### 必需的环境变量

```bash
# 邮件服务配置
RESEND_API_KEY=re_xxxxxxxxxxxxx          # Resend API 密钥
FROM_EMAIL=noreply@7zi.studio             # 发件人邮箱
CONTACT_EMAIL=business@7zi.studio         # 联系邮箱

# Socket.IO 配置
NEXT_PUBLIC_NOTIFICATION_SOCKET_URL=http://localhost:3001  # 客户端 URL
NOTIFICATION_SOCKET_PORT=3001             # 服务端端口

# 数据库路径
DATABASE_PATH=/data/7zi.db               # 主数据库
NOTIFICATION_DATABASE_PATH=/data/notifications.db  # 通知数据库
```

### 获取 Resend API 密钥

1. 访问 https://resend.com/
2. 注册并登录
3. 进入 API Keys 页面
4. 创建新的 API 密钥
5. 复制密钥到 `.env.local`

## 数据库表结构

### notifications 表

| 字段 | 类型 | 描述 |
|------|------|------|
| id | TEXT | 通知唯一 ID（主键） |
| type | TEXT | 通知类型 |
| priority | TEXT | 优先级（low/medium/high/urgent） |
| title | TEXT | 通知标题 |
| message | TEXT | 通知内容 |
| data | TEXT | 附加数据（JSON） |
| user_id | TEXT | 用户 ID |
| team_id | TEXT | 团队 ID |
| task_id | TEXT | 任务 ID |
| read | INTEGER | 已读状态（0/1） |
| email_sent | INTEGER | 邮件已发送（0/1） |
| email_sent_at | INTEGER | 邮件发送时间戳 |
| created_at | INTEGER | 创建时间戳 |
| expires_at | INTEGER | 过期时间戳（可选） |

**索引：**
- idx_user (user_id)
- idx_team (team_id)
- idx_task (task_id)
- idx_read (read)
- idx_created_at (created_at)
- idx_type (type)
- idx_priority (priority)

### user_notification_preferences 表

| 字段 | 类型 | 描述 |
|------|------|------|
| id | INTEGER | 自增 ID（主键） |
| user_id | TEXT | 用户 ID（唯一） |
| email_enabled | INTEGER | 启用邮件（0/1） |
| email_threshold | TEXT | 邮件最低优先级 |
| push_enabled | INTEGER | 启用推送（0/1） |
| push_threshold | TEXT | 推送最低优先级 |
| digest_enabled | INTEGER | 启用摘要（0/1） |
| digest_frequency | TEXT | 摘要频率 |
| quiet_hours_start | TEXT | 静默时段开始（HH:mm） |
| quiet_hours_end | TEXT | 静默时段结束（HH:mm） |
| timezone | TEXT | 用户时区 |
| created_at | INTEGER | 创建时间戳 |
| updated_at | INTEGER | 更新时间戳 |

### notification_delivery_log 表

| 字段 | 类型 | 描述 |
|------|------|------|
| id | INTEGER | 自增 ID（主键） |
| notification_id | TEXT | 通知 ID（外键） |
| channel | TEXT | 投递渠道（websocket/email） |
| recipient | TEXT | 接收者 |
| status | TEXT | 投递状态（sent/failed） |
| error_message | TEXT | 错误信息 |
| sent_at | INTEGER | 发送时间戳 |
| delivery_metadata | TEXT | 投递元数据（JSON） |

## API 响应示例

### 创建通知响应

```json
{
  "success": true,
  "data": {
    "id": "notif_1711000000000_abc123",
    "emailSent": true,
    "message": "Notification sent"
  }
}
```

### 获取通知响应

```json
{
  "success": true,
  "data": [
    {
      "id": "notif_1711000000000_abc123",
      "type": "task_assigned",
      "priority": "high",
      "title": "New Task Assigned",
      "message": "You have been assigned to review PR #456",
      "data": {
        "taskUrl": "https://7zi.com/tasks/task456"
      },
      "userId": "user123",
      "taskId": "task456",
      "read": false,
      "createdAt": 1711000000000
    }
  ],
  "meta": {
    "count": 1,
    "unreadCount": 5
  }
}
```

### 获取统计响应

```json
{
  "success": true,
  "data": {
    "totalNotifications": 1523,
    "unreadNotifications": 45,
    "totalUsers": 23,
    "totalDeliveries": 3200,
    "emailEnabled": true
  }
}
```

## 性能优化

### 数据库优化
- 使用 WAL 模式提高并发性能
- 为常用查询字段建立索引
- 定期清理过期通知（每 5 分钟）
- 限制历史记录大小（默认 1000 条）

### WebSocket 优化
- 使用 WebSocket 优先，降级到 polling
- 自动重连机制（最多 5 次）
- 心跳检测保持连接活跃
- 房间（Room）机制精确投递

### 内存优化
- 客户端乐观更新减少请求
- 分页加载通知列表
- 只订阅必要的频道
- 事件去重处理

## 安全考虑

### API 密钥保护
- `RESEND_API_KEY` 仅在服务端使用
- 不使用 `NEXT_PUBLIC_` 前缀
- 通过环境变量管理

### 输入验证
- 所有 API 端点验证输入
- 限制通知标题和消息长度
- 验证优先级和类型枚举值
- 防止 SQL 注入（使用参数化查询）

### 访问控制
- 用户只能访问自己的通知
- 用户只能更新自己的偏好
- 管理员权限检查（待实现）

### 隐私保护
- 邮件地址不暴露给其他用户
- 静默时段尊重用户时间
- 提供退订和偏好管理
- 不存储敏感信息

## 故障排查

### WebSocket 连接失败
1. 检查 `NEXT_PUBLIC_NOTIFICATION_SOCKET_URL`
2. 验证 Socket.IO 服务器是否运行
3. 检查网络连接和防火墙
4. 查看浏览器控制台错误

### 邮件发送失败
1. 验证 `RESEND_API_KEY` 是否正确
2. 检查 Resend API 配额
3. 查看数据库中的投递日志
4. 验证邮件地址格式

### 通知未持久化
1. 确保 `/data` 目录存在
2. 检查数据库文件权限
3. 验证 `DATABASE_PATH` 配置
4. 查看服务器日志

## 未来改进

### 计划功能
- [ ] 摘要邮件（hourly/daily/weekly）
- [ ] 移动端推送通知
- [ ] SMS 通知集成
- [ ] 通知模板系统
- [ ] A/B 测试支持
- [ ] 分析仪表板
- [ ] 通知分组
- [ ] 通知内操作按钮

### 性能优化
- [ ] Redis 缓存层
- [ ] 批量操作优化
- [ ] 数据库分片
- [ ] CDN 加速邮件模板

### 功能增强
- [ ] 通知模板编辑器
- [ ] 自定义通知规则
- [ ] 通知统计分析
- [ ] 用户行为追踪
- [ ] 多语言支持扩展

## 文件清单

### 核心服务文件
- `src/lib/services/notification.ts` - 基础 WebSocket 通知服务
- `src/lib/services/notification-enhanced.ts` - 增强通知服务（整合三渠道）
- `src/lib/services/notification-storage.ts` - SQLite 持久化存储
- `src/lib/services/email.ts` - 邮件服务（Resend API）

### API 路由
- `src/app/api/notifications/enhanced/route.ts` - 增强通知 API
- `src/app/api/notifications/preferences/[userId]/route.ts` - 用户偏好 API
- `src/app/api/notifications/stats/route.ts` - 统计信息 API

### 组件和 Hooks
- `src/hooks/useNotifications.ts` - React 通知 Hook
- `src/components/notifications/NotificationProvider.tsx` - React Context Provider
- `src/components/notifications/NotificationCenter.tsx` - 通知中心 UI
- `src/components/notifications/NotificationToast.tsx` - Toast 通知组件
- `src/components/notifications/NotificationToaster.tsx` - Toast 管理器

### 工具和初始化
- `src/lib/notification-init.ts` - 通知系统初始化
- `src/lib/socket.ts` - Socket.IO 服务器初始化

### 文档
- `docs/NOTIFICATION_SYSTEM.md` - 完整系统文档
- `NOTIFICATION_IMPLEMENTATION_SUMMARY.md` - 本实现总结

### 演示页面
- `src/app/notification-demo/enhanced/page.tsx` - 增强通知演示页

## Git 提交信息

已提交到 Git 的提交记录：

```
commit 292c3ec
feat: Add comprehensive real-time notification system

- Add email notification service using Resend API
- Add persistent SQLite storage for notifications
- Add enhanced notification service integrating WebSocket, email, and storage
- Add user notification preferences with priority thresholds and quiet hours
- Add notification delivery logging and tracking
- Add API endpoints for enhanced notifications, preferences, and statistics
- Add demo page for testing all notification features
- Update environment configuration for notification system
- Add comprehensive documentation
```

## 总结

本次实现为 7zi-project 添加了一个功能完整、性能优化、易于扩展的实时通知系统。系统支持多种通知渠道，提供灵活的用户偏好设置，具备完善的日志记录和统计分析功能。

**核心优势：**
1. **多渠道投递** - WebSocket + 邮件 + 持久化存储
2. **智能决策** - 基于用户偏好和优先级自动选择投递方式
3. **高性能** - SQLite WAL 模式、索引优化、WebSocket 实时推送
4. **易用性** - 完整的 React Hook、API 端点、演示页面
5. **可扩展** - 模块化设计、插件式架构、预留扩展点

**通知流程概述：**

```
触发通知 → 持久化存储 → WebSocket 推送 → 检查用户偏好
    ↓
    ├─ 满足条件 → 发送邮件 → 记录投递日志
    └─ 不满足   → 跳过邮件  → 完成
```

系统已就绪，可通过以下方式开始使用：
1. 配置环境变量（`.env.local`）
2. 初始化通知服务（调用 `enhancedNotificationService.initialize()`）
3. 发送通知（调用 `enhancedNotificationService.notify()`）
4. 客户端接收（使用 `useNotifications` Hook）

详细文档请参考 `docs/NOTIFICATION_SYSTEM.md`。
