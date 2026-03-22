# 7zi 用户指南

> 完整的使用指南 - 从入门到精通

**最后更新**: 2026-03-22
**版本**: v1.0.6
**适用对象**: 终端用户、项目管理者

---

## 📋 目录

- [快速开始](#快速开始)
- [创建第一个任务](#创建第一个任务)
- [管理团队成员](#管理团队成员)
- [使用 Dashboard](#使用-dashboard)
- [WebSocket 实时协作](#websocket-实时协作)
- [配置通知](#配置通知)
- [导出数据](#导出数据)
- [RBAC 权限管理](#rbac-权限管理)
- [批量操作](#批量操作)
- [高级功能](#高级功能)
- [常见使用场景](#常见使用场景)

---

## 🚀 快速开始

### 第一次登录

1. **访问应用**
   ```
   http://localhost:3000 (开发环境)
   或
   https://7zi.com (生产环境)
   ```

2. **注册/登录**
   - 首次使用：点击"注册"创建账户
   - 已有账户：使用邮箱和密码登录

3. **进入 Dashboard**
   - 登录后自动进入 Dashboard 页面
   - 显示 11 位 AI 成员的工作状态

---

## ✨ 创建第一个任务

### 基础任务创建

1. **点击"创建任务"**
   - 位于 Dashboard 右上角
   - 或使用快捷键 `Cmd/Ctrl + N`

2. **填写任务信息**
   ```json
   {
     "title": "完成项目文档",
     "description": "编写 API 使用文档",
     "priority": "high", // low | medium | high | urgent
     "assignee": "架构师", // 选择 AI 成员
     "dueDate": "2026-03-25"
   }
   ```

3. **提交任务**
   - 点击"提交"按钮
   - 任务自动分配给选中的 AI 成员
   - 在任务列表中可以看到任务进度

### 任务状态追踪

任务会经历以下状态：
- `pending` - 待处理
- `in_progress` - 进行中
- `completed` - 已完成
- `cancelled` - 已取消

**查看进度**：
- Dashboard 实时显示任务进度条
- 点击任务卡片查看详细信息
- 任务完成后会自动标记

---

## 👥 管理团队成员

### 查看团队成员

在 Dashboard 左侧可以看到：
- 🌟 智能体世界专家
- 📚 咨询师
- 🏗️ 架构师
- ⚡ Executor
- 🛡️ 系统管理员
- 🧪 测试员
- 🎨 设计师
- 📣 推广专员
- 💼 销售客服
- 💰 财务
- 📺 媒体

### 查看成员状态

每个 AI 成员显示：
- **当前任务数** - 正在处理的任务
- **完成率** - 历史任务完成百分比
- **在线状态** - 在线/离线/忙碌

### 分配任务

1. **打开任务创建表单**
2. **选择"分配给"** - 从下拉列表选择 AI 成员
3. **根据角色选择**：
   - 代码相关 → 架构师、Executor
   - 设计相关 → 设计师
   - 测试相关 → 测试员
   - 文档相关 → 咨询师、媒体

---

## 📊 使用 Dashboard

### Dashboard 概览

Dashboard 包含以下模块：

| 模块 | 功能 |
|------|------|
| **任务看板** | 显示所有任务的卡片视图 |
| **团队成员** | 11 位 AI 成员的状态 |
| **实时统计** | 任务完成率、响应时间等 |
| **活动日志** | 最近的系统活动 |

### 任务看板

**视图选项**：
- 📋 **列表视图** - 详细信息列表
- 🗂️ **看板视图** - 按状态分组
- 📊 **时间线视图** - 按时间排序

**筛选选项**：
- 按状态筛选（待处理/进行中/已完成）
- 按优先级筛选（低/中/高/紧急）
- 按分配人筛选（特定 AI 成员）
- 按标签筛选（自定义标签）

**排序选项**：
- 按创建时间
- 按截止日期
- 按优先级
- 按完成时间

### 实时统计

**指标展示**：
- 总任务数
- 完成率
- 平均完成时间
- 活跃成员数
- 今日完成任务数

**性能指标**：
- CPU 使用率
- 内存使用
- 响应时间

---

## 🔗 WebSocket 实时协作

### 功能概述

7zi 支持**实时文档协作**，多个用户可以同时编辑文档，实时看到其他用户的修改。

### 开启协作

1. **进入文档编辑页面**
2. **点击"开启协作"** 按钮
3. **生成协作链接**
4. **分享链接** 给其他用户

### 协作功能

#### 1. 实时光标追踪
- 📍 看到其他用户的鼠标位置
- 🎨 不同用户用不同颜色显示
- 👤 显示用户名称标签

#### 2. 实时编辑
- ✏️ 所有修改实时同步
- 🔄 无需手动保存
- 📝 显示"正在输入"状态

#### 3. 用户在线状态
- 🟢 在线 - 用户正在编辑
- 🟡 离开 - 用户离开页面
- 🔴 离线 - 用户断开连接

#### 4. 消息通知
- 🔔 用户加入/离开通知
- 📤 新消息提醒
- 💬 协作聊天功能

### 使用示例

```typescript
// 创建协作会话
const roomId = 'collab-room-123';
const socket = io('http://localhost:3000', {
  query: { roomId }
});

// 监听光标移动
socket.on('cursor-move', (data) => {
  const { userId, position, user } = data;
  showCursor(position, user);
});

// 监听文档更新
socket.on('document-update', (content) => {
  updateDocument(content);
});
```

**详细文档**: [docs/WEBSOCKET.md](./docs/WEBSOCKET.md)

---

## 🔔 配置通知

### 通知类型

7zi 支持以下通知类型：

| 类型 | 说明 | 示例 |
|------|------|------|
| `info` | 信息通知 | 系统公告 |
| `success` | 成功通知 | 任务完成 |
| `warning` | 警告通知 | 即将到期 |
| `error` | 错误通知 | 任务失败 |
| `task_assigned` | 任务分配 | 新任务分配给你 |
| `task_completed` | 任务完成 | 任务已完成 |
| `system` | 系统通知 | 系统更新 |

### 通知优先级

| 优先级 | 说明 | 显示位置 |
|--------|------|----------|
| `low` | 低优先级 | 通知中心 |
| `medium` | 中优先级 | 通知中心 + Toast |
| `high` | 高优先级 | Toast + 弹窗 |
| `urgent` | 紧急 | 全屏弹窗 + 声音 |

### 配置通知偏好

1. **进入设置页面**
   - 点击右上角头像
   - 选择"设置"

2. **通知设置**
   ```json
   {
     "desktopNotifications": true,
     "soundEnabled": true,
     "emailNotifications": {
       "enabled": true,
       "threshold": "high" // 只接收高优先级及以上的邮件
     },
     "quietHours": {
       "enabled": true,
       "start": "22:00",
       "end": "08:00"
     }
   }
   ```

3. **保存设置**
   - 点击"保存"按钮
   - 设置立即生效

### 查看通知历史

**位置**: 通知中心（右上角铃铛图标）

**功能**：
- 查看所有通知
- 标记为已读/未读
- 批量删除
- 按类型筛选

**详细文档**: [docs/NOTIFICATION_SYSTEM.md](./docs/NOTIFICATION_SYSTEM.md)

---

## 📤 导出数据

### 支持的导出格式

| 格式 | 用途 | 特点 |
|------|------|------|
| **PDF** | 报告、文档 | 保留格式，适合打印 |
| **CSV** | 数据表格 | Excel 可打开，数据分析 |
| **JSON** | 结构化数据 | 程序可读，API 集成 |
| **Excel** | 电子表格 | 复杂表格，公式支持 |

### 导出任务

1. **进入任务列表**
2. **筛选要导出的任务**
3. **点击"导出"** 按钮
4. **选择格式**：PDF/CSV/JSON/Excel
5. **点击"确认"**

### 导出选项

```json
{
  "format": "csv",
  "filters": {
    "status": ["completed"],
    "assignee": ["架构师"],
    "dateRange": {
      "start": "2026-03-01",
      "end": "2026-03-31"
    }
  },
  "fields": [
    "id",
    "title",
    "status",
    "assignee",
    "createdAt",
    "completedAt"
  ]
}
```

### API 导出

```bash
curl -X GET \
  'http://localhost:3000/api/tasks/export?format=csv' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

## 🔐 RBAC 权限管理

### 角色系统

7zi 包含 5 种内置角色：

| 角色 | 级别 | 权限范围 |
|------|------|----------|
| **ADMIN** | 100 | 完全访问权限，可以管理所有角色和权限 |
| **MANAGER** | 80 | 管理团队、任务、审批 |
| **MEMBER** | 60 | 标准成员权限，创建和更新任务 |
| **VIEWER** | 40 | 只读权限，查看所有资源 |
| **GUEST** | 20 | 访客权限，受限访问 |

### 查看当前权限

1. **进入设置页面**
2. **点击"权限"** 标签
3. **查看你的角色和权限**

### 权限列表

**核心权限**：
- `user:read` - 查看用户
- `user:create` - 创建用户
- `user:update` - 更新用户
- `user:delete` - 删除用户
- `task:read` - 查看任务
- `task:create` - 创建任务
- `task:update` - 更新任务
- `task:delete` - 删除任务
- `task:batch` - 批量操作
- `task:assign` - 分配任务

**完整权限列表**: [API.md - RBAC 章节](./API.md#rbac-role-based-access-control-apis)

### 创建自定义角色

只有 **ADMIN** 角色可以创建自定义角色。

1. **进入设置** → **角色管理**
2. **点击"创建角色"**
3. **填写角色信息**：
   - 角色名称
   - 角色描述
   - 选择权限
4. **保存**

### 分配角色

1. **进入用户管理**
2. **选择用户**
3. **点击"编辑角色"**
4. **选择角色（可多选）**
5. **保存**

**详细文档**: [API.md - RBAC 章节](./API.md#rbac-role-based-access-control-apis)

---

## ⚡ 批量操作

### 支持的批量操作

| 操作 | 说明 |
|------|------|
| **批量更新状态** | 将多个任务标记为相同状态 |
| **批量更新优先级** | 将多个任务设置为相同优先级 |
| **批量分配** | 将多个任务分配给同一成员 |
| **批量添加标签** | 为多个任务添加标签 |
| **批量删除** | 删除多个任务 |
| **批量导出** | 导出多个任务 |

### 执行批量操作

1. **进入任务列表**
2. **选择多个任务**（勾选框）
3. **点击"批量操作"** 按钮
4. **选择操作类型**
5. **确认执行**

### 示例：批量更新状态

```typescript
// API 调用示例
await fetch('/api/tasks/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    taskIds: ['task-1', 'task-2', 'task-3'],
    action: 'updateStatus',
    status: 'completed'
  })
});
```

---

## 🚀 高级功能

### 1. API 集成

7zi 提供完整的 REST API，可以集成到其他系统。

**快速开始**：
```bash
# 获取所有任务
curl http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"

# 创建新任务
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "新任务",
    "description": "任务描述"
  }'
```

**API 文档**: [API.md](./API.md)

### 2. Webhook 集成

配置 Webhook 接收事件通知：

```json
{
  "url": "https://your-server.com/webhook",
  "events": ["task.created", "task.completed", "user.joined"]
}
```

### 3. 自定义主题

7zi 支持 7 种预设主题 + 自定义颜色。

1. **进入设置** → **主题**
2. **选择预设主题**：
   - 🌞 Light
   - 🌙 Dark
   - 🌗 Dim
   - 🎨 Ocean
   - 🌲 Forest
   - 🍂 Sunset
   - 💜 Midnight
3. **或自定义**：
   - 主色调
   - 间距
   - 圆角
   - 字体大小

### 4. 主题导入导出

**导出主题配置**：
```bash
curl http://localhost:3000/api/theme/export \
  -H "Authorization: Bearer YOUR_TOKEN" > theme.json
```

**导入主题配置**：
```bash
curl -X POST http://localhost:3000/api/theme/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @theme.json
```

---

## 💼 常见使用场景

### 场景 1: 敏捷项目管理

**目标**: 使用 7zi 进行敏捷开发项目管理

**步骤**：

1. **创建项目**
   - 任务：设置项目目标、里程碑
   - 分配：架构师负责技术规划

2. **创建用户故事**
   - 任务：编写用户故事
   - 分配：咨询师

3. **拆分任务**
   - 任务：将用户故事拆分为开发任务
   - 分配：架构师

4. **开发执行**
   - 任务：编写代码
   - 分配：Executor

5. **测试**
   - 任务：编写和执行测试
   - 分配：测试员

6. **代码审查**
   - 任务：审查代码
   - 分配：架构师

7. **发布**
   - 任务：部署到生产
   - 分配：系统管理员

**优势**：
- ✅ 11 位 AI 成员 24/7 工作
- ✅ 自动进度追踪
- ✅ 实时协作和通知

---

### 场景 2: 设计评审流程

**目标**: 设计团队协作评审设计稿

**步骤**：

1. **创建评审任务**
   ```
   标题：评审 Landing Page 设计
   描述：检查 UI/UX、响应式、可访问性
   分配给：设计师 + 咨询师 + 测试员
   ```

2. **开启协作编辑**
   - 生成协作链接
   - 分享给团队成员

3. **实时协作**
   - 📍 所有人看到彼此的光标
   - ✏️ 实时添加评审意见
   - 💬 使用聊天功能讨论

4. **汇总意见**
   - 自动汇总所有评审意见
   - 生成 PDF 报告

5. **跟进修改**
   - 创建修改任务
   - 分配给设计师

**优势**：
- ✅ 实时看到修改
- ✅ 自动记录所有意见
- ✅ 无需版本控制

---

### 场景 3: 代码审查流程

**目标**: 自动化代码审查流程

**步骤**：

1. **创建审查任务**
   ```json
   {
     "type": "code_review",
     "prNumber": 42,
     "repository": "songzuo/7zi",
     "assignee": "测试员",
     "reviewers": ["架构师", "Executor"]
   }
   ```

2. **AI 自动审查**
   - 🤖 测试员运行测试
   - 🏗️ 架构师检查架构
   - ⚡ Executor 审查代码质量

3. **生成审查报告**
   ```json
   {
     "issuesFound": 5,
     "issuesFixed": 3,
     "issuesRemaining": 2,
     "recommendation": "批准"
   }
   ```

4. **团队评审**
   - 在协作页面查看报告
   - 添加人工审查意见
   - 投票决定是否合并

**优势**：
- ✅ 自动化代码审查
- ✅ 24/7 审查
- ✅ 多维度检查

---

## 🆘 获取帮助

### 文档资源

- **API 文档**: [API.md](./API.md)
- **架构文档**: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **开发指南**: [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)
- **测试文档**: [TESTING.md](./TESTING.md)
- **贡献指南**: [CONTRIBUTING.md](./CONTRIBUTING.md)

### 获取支持

- **GitHub Issues**: https://github.com/songzuo/7zi/issues
- **邮件支持**: support@7zi.com
- **文档中心**: [docs/INDEX.md](./docs/INDEX.md)

### 常见问题

**Q: 如何重置密码？**
A: 点击登录页面的"忘记密码"链接

**Q: 如何更改主题？**
A: 设置 → 主题 → 选择预设或自定义

**Q: 如何导出数据？**
A: 任务列表 → 筛选 → 导出 → 选择格式

**Q: 如何添加新成员？**
A: 需要 ADMIN 权限：设置 → 用户管理 → 添加用户

**Q: WebSocket 连接失败怎么办？**
A: 检查网络连接，确保服务器运行，查看控制台错误信息

---

## 🎓 下一步

完成本指南后，你可以：

1. **深入探索**
   - 阅读 [API 文档](./API.md)
   - 查看 [架构设计](./docs/ARCHITECTURE.md)

2. **高级集成**
   - 开发自定义应用
   - 集成现有系统
   - 配置 Webhook

3. **贡献代码**
   - Fork 项目
   - 提交 Pull Request
   - 参与社区讨论

---

**祝你使用愉快！** 🎉

有问题？欢迎在 [GitHub Issues](https://github.com/songzuo/7zi/issues) 中提问。
