# WebSocket API 文档更新报告

**更新日期:** 2026-03-29  
**更新版本:** v1.4.0  
**执行者:** 媒体专员 (子代理)

---

## 📋 任务概述

将 v1.4.0 新增的 WebSocket 高级功能 API 文档添加到 `API.md`，确保文档与代码实现同步。

---

## ✅ 完成情况

### 1. API.md 版本更新

| 项目           | 更新前     | 更新后     |
| -------------- | ---------- | ---------- |
| 版本           | v1.2.0     | v1.4.0     |
| 最后更新日期   | 2026-03-26 | 2026-03-29 |
| 端点数量       | 50+        | 60+        |
| WebSocket APIs | 简要列表   | 完整文档   |

### 2. 新增 WebSocket API 文档

#### 房间管理 API (10 个消息类型)

| 消息类型         | 功能描述     | 权限要求      |
| ---------------- | ------------ | ------------- |
| `createRoom`     | 创建新房间   | 无            |
| `joinRoom`       | 加入房间     | `room:join`   |
| `leaveRoom`      | 离开房间     | 无            |
| `kickUser`       | 踢出用户     | `room:kick`   |
| `banUser`        | 封禁用户     | `room:ban`    |
| `unbanUser`      | 解除封禁     | `room:ban`    |
| `changeUserRole` | 更改用户角色 | `room:manage` |
| `inviteUser`     | 邀请用户     | `room:invite` |
| `updateCursor`   | 更新光标位置 | 无            |
| `updateTyping`   | 更新输入状态 | 无            |

#### 权限控制 API (4 个消息类型)

| 消息类型             | 功能描述     | 权限要求                   |
| -------------------- | ------------ | -------------------------- |
| `grantPermission`    | 授予权限     | `admin:manage_permissions` |
| `revokePermission`   | 撤销权限     | `admin:manage_permissions` |
| `checkPermission`    | 检查权限     | 无                         |
| `getUserPermissions` | 获取用户权限 | 无                         |

#### 消息持久化 API (9 个消息类型)

| 消息类型            | 功能描述     | 权限要求               |
| ------------------- | ------------ | ---------------------- |
| `storeMessage`      | 存储消息     | `message:send`         |
| `editMessage`       | 编辑消息     | `message:edit`         |
| `deleteMessage`     | 删除消息     | `message:delete`       |
| `addReaction`       | 添加反应     | `message:react`        |
| `removeReaction`    | 移除反应     | `message:react`        |
| `pinMessage`        | 置顶消息     | `message:pin`          |
| `unpinMessage`      | 取消置顶     | `message:pin`          |
| `getHistory`        | 获取历史     | `message:view_history` |
| `getPinnedMessages` | 获取置顶消息 | `message:view_history` |

### 3. 权限系统文档

#### 用户角色 (5 种)

| 角色        | 层级 | 描述                     |
| ----------- | ---- | ------------------------ |
| `owner`     | 1    | 房间所有者，拥有所有权限 |
| `admin`     | 2    | 管理员，拥有管理权限     |
| `moderator` | 3    | 版主，可以管理内容       |
| `member`    | 4    | 成员，基本功能权限       |
| `guest`     | 5    | 访客，受限权限           |

#### 权限类型 (16 种)

**房间权限 (7 种):**

- `room:join` - 加入房间
- `room:leave` - 离开房间
- `room:manage` - 管理房间设置
- `room:view` - 查看房间信息
- `room:invite` - 邀请用户
- `room:kick` - 踢出用户
- `room:ban` - 封禁用户

**消息权限 (6 种):**

- `message:send` - 发送消息
- `message:edit` - 编辑消息
- `message:delete` - 删除消息
- `message:react` - 添加反应
- `message:pin` - 置顶消息
- `message:view_history` - 查看历史

**管理权限 (6 种):**

- `admin:manage_users` - 管理用户
- `admin:manage_rooms` - 管理房间
- `admin:manage_permissions` - 管理权限
- `admin:ban_users` - 封禁用户
- `admin:view_logs` - 查看日志
- `admin:system_announce` - 系统公告

### 4. 配置参数文档

#### 房间配置 (RoomConfig)

| 参数                    | 类型    | 默认值 | 描述               |
| ----------------------- | ------- | ------ | ------------------ |
| `maxParticipants`       | number  | 100    | 最大参与者数量     |
| `messageHistoryEnabled` | boolean | true   | 启用消息历史       |
| `persistenceEnabled`    | boolean | true   | 启用持久化         |
| `autoCleanupMinutes`    | number  | 30     | 自动清理时间(分钟) |
| `allowGuests`           | boolean | true   | 允许访客           |
| `enforcePermissions`    | boolean | true   | 强制权限检查       |

#### 消息存储配置

| 参数                 | 默认值 | 描述                 |
| -------------------- | ------ | -------------------- |
| `maxHistorySize`     | 10000  | 每房间最大消息数     |
| `offlineMessageTTL`  | 7天    | 离线消息存活时间     |
| `maxOfflineMessages` | 100    | 每用户最大离线消息数 |

---

## 📊 源码文件分析

### rooms.ts (847 行)

**主要功能:**

- 房间生命周期管理 (创建、销毁、自动清理)
- 参与者管理 (加入、离开、踢出、封禁)
- 角色管理 (角色变更、权限检查)
- 状态追踪 (光标、输入状态、在线状态)

**关键接口:**

- `Room` - 房间数据结构
- `RoomParticipant` - 参与者信息
- `RoomConfig` - 房间配置
- `CreateRoomOptions` - 创建房间选项
- `JoinRoomOptions` - 加入房间选项

### permissions.ts (436 行)

**主要功能:**

- 角色权限管理 (设置角色、获取权限)
- 权限授予/撤销 (带过期时间支持)
- 用户封禁系统
- 层级检查 (只能管理低层级用户)

**关键接口:**

- `Permission` - 权限类型
- `UserRole` - 用户角色
- `PermissionGrant` - 权限授予记录
- `UserRoomPermissions` - 用户房间权限

### message-store.ts (623 行)

**主要功能:**

- 消息存储和检索
- 消息编辑和删除 (软删除)
- 消息反应和置顶
- 离线消息队列

**关键接口:**

- `StoredMessage` - 存储的消息
- `MessageReaction` - 消息反应
- `OfflineMessage` - 离线消息
- `MessageHistoryOptions` - 历史查询选项

---

## 🔗 相关文档链接

已在 API.md 中添加以下相关文档链接:

- [WebSocket v1.4.0 实现报告](./WEBSOCKET_V1.4.0_IMPLEMENTATION_REPORT.md)
- [房间管理源码](./src/lib/websocket/rooms.ts)
- [权限控制源码](./src/lib/websocket/permissions.ts)
- [消息存储源码](./src/lib/websocket/message-store.ts)

---

## 📝 文档格式

保持与现有 API.md 格式一致:

- 使用 Markdown 表格
- 提供请求/响应 JSON 示例
- 参数说明使用表格形式
- 错误码和错误响应示例

---

## ✅ 验证清单

- [x] 读取 API.md 了解当前结构
- [x] 读取 rooms.ts 源码
- [x] 读取 permissions.ts 源码
- [x] 读取 message-store.ts 源码
- [x] 检查 v1.4.0 新增 WebSocket API
- [x] 更新 API.md 版本信息
- [x] 添加房间管理 API 文档
- [x] 添加权限控制 API 文档
- [x] 添加消息持久化 API 文档
- [x] 添加配置参数文档
- [x] 添加 v1.4.0 更新记录
- [x] 生成更新报告

---

## 📈 统计数据

| 指标             | 数值     |
| ---------------- | -------- |
| 新增消息类型文档 | 23 个    |
| 新增权限类型文档 | 16 种    |
| 新增角色类型文档 | 5 种     |
| 新增配置参数文档 | 9 个     |
| 源码分析文件     | 3 个     |
| 总代码行数       | 1,906 行 |

---

**报告生成时间:** 2026-03-29T12:10:00.000Z  
**执行者:** 媒体专员 (子代理)
