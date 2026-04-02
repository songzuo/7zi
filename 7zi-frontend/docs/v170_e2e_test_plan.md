# 7zi 项目 v1.7.0 E2E 测试扩展计划

**版本**: v1.7.0  
**制定日期**: 2026-04-02  
**制定者**: 🧪 测试员  
**状态**: 规划中

---

## 📋 目录

- [1. 项目概述](#1-项目概述)
- [2. 现有测试架构分析](#2-现有测试架构分析)
- [3. 关键用户流程识别](#3-关键用户流程识别)
- [4. 测试用例设计](#4-测试用例设计)
- [5. 测试数据准备方案](#5-测试数据准备方案)
- [6. 测试执行计划](#6-测试执行计划)
- [7. 代码示例](#7-代码示例)
- [8. 附录](#8-附录)

---

## 1. 项目概述

### 1.1 项目背景

7zi 项目 v1.7.0 是一个基于 Next.js 16 + React 19 构建的现代化前端应用，集成了 AI Agent 智能调度、WebSocket 实时协作、多语言国际化等企业级功能。

### 1.2 测试目标

扩展 E2E 测试覆盖，确保以下核心功能的质量：

- ✅ 用户认证和授权
- ✅ AI Agent 系统协作
- ✅ WebSocket 实时通信
- ✅ 任务管理和工作流
- ✅ 通知系统
- ✅ 性能监控
- ✅ 多语言支持
- ✅ 响应式布局

### 1.3 测试框架

- **E2E 框架**: Playwright 1.58+
- **配置文件**: `playwright.config.ts`
- **测试目录**: `e2e/`
- **辅助工具**: `e2e/helpers/`, `e2e/fixtures/`

---

## 2. 现有测试架构分析

### 2.1 现有测试文件

```
e2e/
├── fixtures/
│   ├── test.fixtures.ts      # 自定义测试夹具
│   └── types.ts               # 页面对象模型
├── helpers/
│   └── test-helpers.ts        # 测试辅助函数
├── core-features.spec.ts      # 核心功能测试
├── error-handling.spec.ts     # 错误处理测试
├── login-flow.spec.ts         # 登录流程测试
├── notifications.spec.ts      # 通知系统测试
├── register-flow.spec.ts      # 注册流程测试
├── visual-regression.spec.ts  # 视觉回归测试
└── websocket.spec.ts          # WebSocket 测试
```

### 2.2 测试夹具 (Test Fixtures)

现有测试夹具：

| 夹具 | 说明 |
|------|------|
| `authenticatedPage` | 已认证的页面实例 |
| `user` | 模拟用户数据 |
| `mockAPI` | API 模拟函数 |

### 2.3 页面对象模型 (Page Objects)

| 类 | 说明 |
|----|------|
| `LoginPage` | 登录页面对象 |
| `NotificationPage` | 通知页面对象 |
| `WebSocketPage` | WebSocket 页面对象 |

### 2.4 现有测试覆盖

| 模块 | 测试文件 | 测试用例数 | 覆盖率 |
|------|---------|-----------|--------|
| 登录流程 | `login-flow.spec.ts` | 10+ | ✅ 85% |
| 注册流程 | `register-flow.spec.ts` | 10+ | ✅ 85% |
| 通知系统 | `notifications.spec.ts` | 12+ | ✅ 90% |
| WebSocket | `websocket.spec.ts` | 15+ | ✅ 90% |
| 错误处理 | `error-handling.spec.ts` | 18+ | ✅ 85% |
| 核心功能 | `core-features.spec.ts` | 20+ | ✅ 80% |
| 视觉回归 | `visual-regression.spec.ts` | 5+ | ✅ 70% |
| **总计** | **7 个文件** | **90+** | **~85%** |

### 2.5 现有测试覆盖的功能

根据 `README.md` 和 `CHANGELOG.md`，v1.6.0 已完成的核心功能：

- ✅ WebSocket 高级功能（房间系统、权限控制、消息持久化）
- ✅ AI Agent 智能调度
- ✅ 性能监控升级
- ✅ React Compiler 可选
- ✅ 国际化 (i18n)
- ✅ 图片优化
- ✅ 安全加固
- ✅ 深色模式

---

## 3. 关键用户流程识别

### 3.1 用户旅程地图

基于项目功能分析，识别出以下 **12 个关键用户流程**：

#### 🎯 核心用户流程（优先级 P0）

| # | 流程名称 | 描述 | 复杂度 | 风险 |
|---|---------|------|--------|------|
| 1 | **用户注册** | 新用户注册账号 → 邮箱验证 → 首次登录 | 中 | 高 |
| 2 | **用户登录** | 输入凭证 → 验证 → 跳转 Dashboard | 低 | 中 |
| 3 | **创建任务** | 进入任务页面 → 填写信息 → 提交 → Agent 分配 | 高 | 高 |
| 4 | **Agent 协作** | 多 Agent 协同完成任务 → 结果聚合 | 高 | 高 |
| 5 | **实时协作** | 加入房间 → 发送消息 → 实时同步 | 高 | 高 |
| 6 | **通知接收** | 触发通知 → 显示提醒 → 标记已读 | 中 | 中 |

#### 📈 扩展用户流程（优先级 P1）

| # | 流程名称 | 描述 | 复杂度 | 风险 |
|---|---------|------|--------|------|
| 7 | **工作流编排** | 创建工作流 → 配置节点 → 执行 → 监控 | 高 | 高 |
| 8 | **性能监控** | 查看性能数据 → 异常检测 → 告警 | 中 | 中 |
| 9 | **语言切换** | 切换语言 → 界面翻译 → 数据持久化 | 低 | 低 |
| 10 | **深色模式** | 切换主题 → 界面适配 → 保存偏好 | 低 | 低 |
| 11 | **图片优化** | 上传图片 → 自动优化 → 预览/下载 | 中 | 中 |
| 12 | **用户设置** | 修改个人信息 → 更新密码 → 通知偏好 | 中 | 中 |

### 3.2 流程依赖关系图

```
用户注册 → 用户登录 → [创建任务 / 工作流编排]
                          ↓
                      Agent 协作
                          ↓
                      实时协作
                          ↓
                      通知接收

并行流程:
- 性能监控 (独立)
- 语言切换 (独立)
- 深色模式 (独立)
- 图片优化 (独立)
- 用户设置 (依赖登录)
```

---

## 4. 测试用例设计

### 4.1 P0 核心流程测试用例

#### TC-001: 用户注册流程

| ID | 测试场景 | 步骤 | 预期结果 |
|----|---------|------|---------|
| TC-001-01 | 正常注册 | 1. 访问注册页面<br>2. 填写有效邮箱、用户名、密码<br>3. 提交表单<br>4. 收到验证邮件<br>5. 点击验证链接 | 注册成功，跳转到登录页，邮箱已验证 |
| TC-001-02 | 邮箱格式验证 | 1. 输入无效邮箱格式<br>2. 提交表单 | 显示"邮箱格式无效"错误提示 |
| TC-001-03 | 密码强度验证 | 1. 输入弱密码（少于8位）<br>2. 提交表单 | 显示"密码强度不足"错误提示 |
| TC-001-04 | 用户名重复 | 1. 使用已存在的用户名<br>2. 提交表单 | 显示"用户名已存在"错误提示 |
| TC-001-05 | 邮箱验证超时 | 1. 注册成功<br>2. 等待验证链接过期（24h）<br>3. 点击过期链接 | 显示"验证链接已过期，请重新发送" |
| TC-001-06 | 重新发送验证邮件 | 1. 注册成功<br>2. 点击"重新发送验证"<br>3. 收到新邮件 | 成功发送新的验证邮件 |

#### TC-002: 用户登录流程

| ID | 测试场景 | 步骤 | 预期结果 |
|----|---------|------|---------|
| TC-002-01 | 正常登录 | 1. 访问登录页面<br>2. 输入有效邮箱和密码<br>3. 点击登录 | 登录成功，跳转到 Dashboard，显示用户信息 |
| TC-002-02 | 错误密码 | 1. 输入正确邮箱，错误密码<br>2. 点击登录 | 显示"密码错误"错误提示 |
| TC-002-03 | 未验证邮箱登录 | 1. 使用未验证的邮箱登录<br>2. 点击登录 | 显示"邮箱未验证，请查收验证邮件" |
| TC-002-04 | 记住我功能 | 1. 勾选"记住我"<br>2. 登录成功<br>3. 关闭浏览器重新打开 | 自动登录，无需重新输入凭证 |
| TC-002-05 | Token 过期 | 1. 登录成功<br>2. 等待 Token 过期<br>3. 执行需要认证的操作 | 自动跳转到登录页，显示"会话已过期" |
| TC-002-06 | 登出功能 | 1. 点击登出按钮<br>2. 确认登出 | 登出成功，跳转到首页，清除 Session |

#### TC-003: 创建任务流程

| ID | 测试场景 | 步骤 | 预期结果 |
|----|---------|------|---------|
| TC-003-01 | 创建简单任务 | 1. 登录<br>2. 进入任务页面<br>3. 填写任务标题、描述<br>4. 选择优先级<br>5. 提交 | 任务创建成功，显示在任务列表，Agent 自动分配 |
| TC-003-02 | 创建复杂任务 | 1. 填写任务信息<br>2. 添加子任务<br>3. 设置依赖关系<br>4. 添加标签<br>5. 提交 | 任务创建成功，子任务和依赖关系正确保存 |
| TC-003-03 | 任务表单验证 | 1. 不填写必填字段<br>2. 提交表单 | 显示"标题不能为空"错误提示 |
| TC-003-04 | Agent 自动分配 | 1. 创建任务<br>2. 查看 Agent 分配结果 | 根据任务类型和能力匹配自动分配 Agent |
| TC-003-05 | 手动选择 Agent | 1. 创建任务<br>2. 手动选择特定 Agent<br>3. 提交 | 任务分配给指定 Agent |
| TC-003-06 | 任务优先级排序 | 1. 创建多个不同优先级任务<br>2. 查看任务列表 | 任务按优先级排序（高 > 中 > 低） |

#### TC-004: Agent 协作流程

| ID | 测试场景 | 步骤 | 预期结果 |
|----|---------|------|---------|
| TC-004-01 | 单 Agent 执行任务 | 1. 创建任务<br>2. Agent 接收任务<br>3. Agent 执行<br>4. 返回结果 | 任务完成，结果正确显示 |
| TC-004-02 | 多 Agent 并行执行 | 1. 创建并行任务<br>2. 多 Agent 同时执行<br>3. 聚合结果 | 所有 Agent 完成任务，结果正确聚合 |
| TC-004-03 | Agent 任务依赖 | 1. 创建有依赖的任务<br>2. Agent 按依赖顺序执行 | 任务按依赖顺序执行，无冲突 |
| TC-004-04 | Agent 超时处理 | 1. 创建任务<br>2. Agent 执行超时<br>3. 查看处理结果 | 任务标记为超时，显示错误信息 |
| TC-004-05 | Agent 错误重试 | 1. 创建任务<br>2. Agent 执行失败<br>3. 自动重试 | Agent 自动重试，最终成功或达到最大重试次数 |
| TC-004-06 | 结果聚合策略 | 1. 创建任务选择不同聚合策略<br>2. 多 Agent 执行<br>3. 查看聚合结果 | 根据选择的策略正确聚合结果 |

#### TC-005: 实时协作流程

| ID | 测试场景 | 步骤 | 预期结果 |
|----|---------|------|---------|
| TC-005-01 | 加入房间 | 1. 登录<br>2. 点击加入协作房间<br>3. 验证连接 | 成功加入房间，显示在线用户 |
| TC-005-02 | 发送消息 | 1. 在房间输入消息<br>2. 发送<br>3. 其他用户接收 | 消息实时显示在所有用户的聊天窗口 |
| TC-005-03 | 实时光标同步 | 1. 多用户同时编辑<br>2. 移动光标 | 光标位置实时同步到所有用户 |
| TC-005-04 | 房间权限控制 | 1. 普通用户尝试管理员操作<br>2. 验证权限 | 操作被拒绝，显示"权限不足" |
| TC-005-05 | 房间历史记录 | 1. 加入房间<br>2. 查看历史消息 | 显示房间内历史消息记录 |
| TC-005-06 | 断线重连 | 1. 网络断开<br>2. 恢复网络<br>3. 自动重连 | 自动重连成功，恢复房间状态 |

#### TC-006: 通知接收流程

| ID | 测试场景 | 步骤 | 预期结果 |
|----|---------|------|---------|
| TC-006-01 | 接收任务通知 | 1. 分配任务给用户<br>2. 用户登录 | 显示"您有新任务"通知 |
| TC-006-02 | 接收 Agent 完成通知 | 1. Agent 完成任务<br>2. 用户查看 | 显示"任务已完成"通知 |
| TC-006-03 | 标记已读 | 1. 点击通知<br>2. 标记为已读 | 通知标记为已读，未读计数减少 |
| TC-006-04 | 批量标记已读 | 1. 打开通知中心<br>2. 点击"全部标记已读" | 所有通知标记为已读 |
| TC-006-05 | 删除通知 | 1. 点击删除按钮<br>2. 确认删除 | 通知从列表中移除 |
| TC-006-06 | 通知偏好设置 | 1. 进入设置<br>2. 修改通知偏好<br>3. 保存 | 通知偏好更新生效 |

### 4.2 P1 扩展流程测试用例

#### TC-007: 工作流编排流程

| ID | 测试场景 | 步骤 | 预期结果 |
|----|---------|------|---------|
| TC-007-01 | 创建工作流 | 1. 进入工作流页面<br>2. 添加节点<br>3. 连接节点<br>4. 保存 | 工作流创建成功，可执行 |
| TC-007-02 | 执行工作流 | 1. 选择工作流<br>2. 点击执行<br>3. 监控执行 | 工作流按节点顺序执行 |
| TC-007-03 | 工作流节点配置 | 1. 编辑节点配置<br>2. 设置参数<br>3. 保存 | 节点配置正确保存 |
| TC-007-04 | 工作流暂停/恢复 | 1. 执行中暂停<br>2. 恢复执行 | 工作流暂停，恢复后继续执行 |
| TC-007-05 | 工作流错误处理 | 1. 节点执行失败<br>2. 查看错误日志 | 显示错误信息，可重试 |

#### TC-008: 性能监控流程

| ID | 测试场景 | 步骤 | 预期结果 |
|----|---------|------|---------|
| TC-008-01 | 查看性能数据 | 1. 进入性能页面<br>2. 查看指标 | 显示 LCP, FID, CLS 等指标 |
| TC-008-02 | 异常检测 | 1. 触发性能异常<br>2. 查看检测结果 | 显示异常告警 |
| TC-008-03 | 导出性能报告 | 1. 点击导出按钮<br>2. 选择格式<br>3. 下载 | 成功下载性能报告文件 |
| TC-008-04 | 历史数据查看 | 1. 选择时间范围<br>2. 查看历史数据 | 显示指定时间范围内的性能数据 |

#### TC-009: 语言切换流程

| ID | 测试场景 | 步骤 | 预期结果 |
|----|---------|------|---------|
| TC-009-01 | 切换到英文 | 1. 点击语言选择器<br>2. 选择 English | 界面切换为英文 |
| TC-009-02 | 切换到中文 | 1. 点击语言选择器<br>2. 选择 简体中文 | 界面切换为中文 |
| TC-009-03 | 语言持久化 | 1. 切换语言<br>2. 刷新页面 | 语言选择保持不变 |
| TC-009-04 | 自动语言检测 | 1. 首次访问（浏览器语言为中文） | 自动显示中文界面 |

#### TC-010: 深色模式流程

| ID | 测试场景 | 步骤 | 预期结果 |
|----|---------|------|---------|
| TC-010-01 | 切换到深色模式 | 1. 点击主题切换按钮<br>2. 选择深色 | 界面切换为深色主题 |
| TC-010-02 | 切换到浅色模式 | 1. 点击主题切换按钮<br>2. 选择浅色 | 界面切换为浅色主题 |
| TC-010-03 | 跟随系统主题 | 1. 选择跟随系统<br>2. 修改系统主题 | 界面跟随系统主题变化 |
| TC-010-04 | 主题持久化 | 1. 切换主题<br>2. 刷新页面 | 主题选择保持不变 |

#### TC-011: 图片优化流程

| ID | 测试场景 | 步骤 | 预期结果 |
|----|---------|------|---------|
| TC-011-01 | 上传图片 | 1. 选择图片文件<br>2. 上传 | 图片上传成功，自动优化 |
| TC-011-02 | 预览优化结果 | 1. 查看原图和优化图对比 | 显示优化前后对比 |
| TC-011-03 | 下载优化图片 | 1. 点击下载按钮<br>2. 选择格式 | 成功下载优化后的图片 |
| TC-011-04 | 批量上传 | 1. 选择多张图片<br>2. 批量上传 | 所有图片上传并优化成功 |

#### TC-012: 用户设置流程

| ID | 测试场景 | 步骤 | 预期结果 |
|----|---------|------|---------|
| TC-012-01 | 修改个人信息 | 1. 进入设置<br>2. 修改姓名<br>3. 保存 | 信息更新成功 |
| TC-012-02 | 修改密码 | 1. 进入密码设置<br>2. 输入当前密码<br>3. 输入新密码<br>4. 保存 | 密码修改成功，需要重新登录 |
| TC-012-03 | 通知偏好设置 | 1. 进入通知设置<br>2. 勾选通知类型<br>3. 保存 | 通知偏好更新生效 |
| TC-012-04 | 删除账户 | 1. 进入账户设置<br>2. 点击删除账户<br>3. 确认删除 | 账户删除成功，跳转到首页 |

---

## 5. 测试数据准备方案

### 5.1 测试数据管理策略

#### 5.1.1 数据分类

| 类型 | 说明 | 存储位置 | 生命周期 |
|------|------|---------|---------|
| **固定测试数据** | 不变的测试账号、配置等 | `e2e/fixtures/test-data.ts` | 永久 |
| **动态测试数据** | 每次运行生成的数据（邮箱、ID） | 运行时生成 | 测试周期 |
| **Mock API 数据** | 模拟 API 响应数据 | `e2e/fixtures/mock-data/` | 永久 |
| **状态文件** | 浏览器状态（登录态） | `e2e/.auth/` | 持久化 |

#### 5.1.2 数据隔离

- ✅ 使用独立测试数据库或命名空间
- ✅ 每个测试独立的事务管理
- ✅ 测试后自动清理数据
- ✅ 随机化动态数据（邮箱、用户名）

### 5.2 固定测试数据

#### 5.2.1 测试用户

```typescript
// e2e/fixtures/test-data.ts
export const testUsers = {
  admin: {
    id: 'test-admin-1',
    username: 'admin',
    email: 'admin@7zi.test',
    password: 'Admin123456!',
    role: 'admin',
    verified: true,
  },
  user: {
    id: 'test-user-1',
    username: 'testuser',
    email: 'user@7zi.test',
    password: 'Test123456!',
    role: 'user',
    verified: true,
  },
  unverified: {
    id: 'test-unverified-1',
    username: 'unverified',
    email: 'unverified@7zi.test',
    password: 'Test123456!',
    role: 'user',
    verified: false,
  },
};
```

#### 5.2.2 测试任务

```typescript
export const testTasks = {
  simple: {
    title: '简单测试任务',
    description: '这是一个简单的测试任务',
    priority: 'medium',
    type: 'general',
  },
  complex: {
    title: '复杂测试任务',
    description: '这是一个包含子任务的复杂测试任务',
    priority: 'high',
    type: 'collaboration',
    subtasks: [
      { title: '子任务1', status: 'pending' },
      { title: '子任务2', status: 'pending' },
    ],
  },
};
```

#### 5.2.3 测试房间

```typescript
export const testRooms = {
  public: {
    name: '公共测试房间',
    type: 'public',
    visibility: 'public',
  },
  private: {
    name: '私有测试房间',
    type: 'chat',
    visibility: 'private',
  },
};
```

### 5.3 动态测试数据生成

#### 5.3.1 数据生成器

```typescript
// e2e/helpers/data-generator.ts
export function generateEmail(): string {
  return `test-${Date.now()}@7zi.test`;
}

export function generateUsername(): string {
  return `testuser${Date.now()}`;
}

export function generateTaskTitle(): string {
  return `测试任务-${Date.now()}`;
}

export function generateRoomName(): string {
  return `测试房间-${Date.now()}`;
}
```

### 5.4 Mock API 数据

#### 5.4.1 Agent Mock 数据

```typescript
// e2e/fixtures/mock-data/agents.ts
export const mockAgents = [
  {
    id: 'agent-1',
    name: '研究专家',
    type: 'consultant',
    capabilities: ['research', 'analysis', 'writing'],
    status: 'online',
    load: 0.3,
  },
  {
    id: 'agent-2',
    name: '执行专员',
    type: 'executor',
    capabilities: ['execution', 'automation', 'testing'],
    status: 'online',
    load: 0.5,
  },
  {
    id: 'agent-3',
    name: '架构师',
    type: 'architect',
    capabilities: ['design', 'planning', 'architecture'],
    status: 'online',
    load: 0.2,
  },
];
```

#### 5.4.2 通知 Mock 数据

```typescript
export const mockNotifications = [
  {
    id: 'notif-1',
    title: '任务分配',
    message: '您有一个新任务待处理',
    type: 'info',
    read: false,
    createdAt: '2026-04-02T10:00:00Z',
  },
  {
    id: 'notif-2',
    title: 'Agent 完成',
    message: 'Agent 已完成任务',
    type: 'success',
    read: false,
    createdAt: '2026-04-02T11:00:00Z',
  },
];
```

### 5.5 状态文件管理

#### 5.5.1 生成认证状态

```bash
# 生成管理员认证状态
npx playwright codegen --save-storage=e2e/.auth/admin.json --target=javascript http://localhost:3000

# 生成普通用户认证状态
npx playwright codegen --save-storage=e2e/.auth/user.json --target=javascript http://localhost:3000
```

#### 5.5.2 使用认证状态

```typescript
test.use({ storageState: 'e2e/.auth/admin.json' });

test('管理员功能测试', async ({ page }) => {
  // 已自动登录为管理员
  await page.goto('/admin');
  // ...
});
```

---

## 6. 测试执行计划

### 6.1 测试优先级

| 优先级 | 测试模块 | 测试用例数 | 预计时间 | 依赖 |
|--------|---------|-----------|---------|------|
| **P0** | TC-001: 用户注册 | 6 | 5 分钟 | - |
| **P0** | TC-002: 用户登录 | 6 | 3 分钟 | TC-001 |
| **P0** | TC-003: 创建任务 | 6 | 8 分钟 | TC-002 |
| **P0** | TC-004: Agent 协作 | 6 | 10 分钟 | TC-003 |
| **P0** | TC-005: 实时协作 | 6 | 10 分钟 | TC-002 |
| **P0** | TC-006: 通知接收 | 6 | 5 分钟 | TC-002 |
| **P1** | TC-007: 工作流编排 | 5 | 12 分钟 | TC-003, TC-004 |
| **P1** | TC-008: 性能监控 | 4 | 6 分钟 | - |
| **P1** | TC-009: 语言切换 | 4 | 3 分钟 | - |
| **P1** | TC-010: 深色模式 | 4 | 3 分钟 | - |
| **P1** | TC-011: 图片优化 | 4 | 6 分钟 | - |
| **P1** | TC-012: 用户设置 | 4 | 6 分钟 | TC-002 |
| **总计** | **12 个模块** | **61 个用例** | **~77 分钟** | - |

### 6.2 执行计划

#### 阶段 1: P0 核心流程（Week 1）

| 天 | 任务 | 产出 |
|----|------|------|
| Day 1 | TC-001, TC-002: 认证流程 | `authentication-flow.spec.ts` |
| Day 2 | TC-003: 创建任务流程 | `task-creation.spec.ts` |
| Day 3 | TC-004: Agent 协作流程 | `agent-collaboration.spec.ts` |
| Day 4 | TC-005: 实时协作流程 | `realtime-collaboration.spec.ts` |
| Day 5 | TC-006: 通知接收流程 | `notification-receive.spec.ts` + 回归测试 |

#### 阶段 2: P1 扩展流程（Week 2）

| 天 | 任务 | 产出 |
|----|------|------|
| Day 1 | TC-007: 工作流编排流程 | `workflow-orchestration.spec.ts` |
| Day 2 | TC-008: 性能监控流程 | `performance-monitoring.spec.ts` |
| Day 3 | TC-009, TC-010: i18n + 主题 | `i18n-theme.spec.ts` |
| Day 4 | TC-011: 图片优化流程 | `image-optimization.spec.ts` |
| Day 5 | TC-012: 用户设置流程 | `user-settings.spec.ts` + 全量回归测试 |

#### 阶段 3: 集成与优化（Week 3）

| 天 | 任务 | 产出 |
|----|------|------|
| Day 1 | 并行执行优化、性能调优 | 测试报告 |
| Day 2 | 跨浏览器测试（Chrome, Firefox, Safari） | 兼容性报告 |
| Day 3 | 移动端测试（Pixel 5, iPhone 12） | 移动端报告 |
| Day 4 | 视觉回归测试 | 视觉报告 |
| Day 5 | CI/CD 集成、文档更新 | 完整测试套件 |

### 6.3 CI/CD 集成

#### 6.3.1 GitHub Actions 配置

```yaml
name: E2E Tests v1.7.0

on:
  push:
    branches: [main, develop]
    paths:
      - 'e2e/**'
      - 'src/**'
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * *'  # 每日凌晨 2 点运行

jobs:
  e2e:
    runs-on: ubuntu-latest
    
    strategy:
      fail-fast: false
      matrix:
        project: [chromium, firefox, webkit]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps ${{ matrix.project }}
      
      - name: Run E2E tests
        run: npx playwright test --project=${{ matrix.project }}
        env:
          BASE_URL: http://localhost:3000
          CI: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ matrix.project }}
          path: playwright-report/
          retention-days: 7
      
      - name: Upload test screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: screenshots-${{ matrix.project }}
          path: test-results/
          retention-days: 7
```

#### 6.3.2 触发条件

- ✅ 推送到 `main` 或 `develop` 分支
- ✅ 创建 Pull Request
- ✅ 每日定时任务（凌晨 2 点）
- ✅ 手动触发

### 6.4 测试环境配置

#### 6.4.1 本地开发环境

```bash
# 启动开发服务器
npm run dev

# 运行 E2E 测试（开发模式 - 仅 Chromium）
npm run test:e2e

# 运行特定测试文件
npx playwright test authentication-flow.spec.ts

# UI 模式（推荐用于调试）
npm run test:e2e:ui

# 调试模式
npm run test:e2e:debug
```

#### 6.4.2 CI 环境

```bash
# 运行所有浏览器测试
CI=true npm run test:e2e

# 运行特定浏览器
npx playwright test --project=chromium

# 并行执行（2 workers）
CI=true npx playwright test --workers=2
```

---

## 7. 代码示例

### 7.1 新增页面对象模型

#### TaskPage

```typescript
// e2e/fixtures/pages/task-page.ts
import { Page, Locator } from '@playwright/test';

export class TaskPage {
  readonly page: Page;
  readonly createTaskButton: Locator;
  readonly taskTitleInput: Locator;
  readonly taskDescriptionInput: Locator;
  readonly taskPrioritySelect: Locator;
  readonly submitButton: Locator;
  readonly taskList: Locator;
  readonly agentSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createTaskButton = page.getByRole('button', { name: /创建任务|create task/i });
    this.taskTitleInput = page.getByLabel(/标题|title/i);
    this.taskDescriptionInput = page.getByLabel(/描述|description/i);
    this.taskPrioritySelect = page.getByLabel(/优先级|priority/i);
    this.submitButton = page.getByRole('button', { name: /提交|submit/i });
    this.taskList = page.getByTestId('task-list');
    this.agentSelect = page.getByLabel(/agent|代理人/i);
  }

  async goto() {
    await this.page.goto('/tasks');
  }

  async createTask(title: string, description: string, priority: string = 'medium') {
    await this.createTaskButton.click();
    await this.taskTitleInput.fill(title);
    await this.taskDescriptionInput.fill(description);
    await this.taskPrioritySelect.selectOption(priority);
    await this.submitButton.click();
  }

  async selectAgent(agentName: string) {
    await this.agentSelect.selectOption(agentName);
  }

  async getTaskCount() {
    return await this.taskList.getByRole('listitem').count();
  }

  async expectTaskVisible(title: string) {
    await expect(this.taskList.getByText(title)).toBeVisible();
  }
}
```

#### AgentCollaborationPage

```typescript
// e2e/fixtures/pages/agent-collaboration-page.ts
import { Page, Locator } from '@playwright/test';

export class AgentCollaborationPage {
  readonly page: Page;
  readonly agentList: Locator;
  readonly agentStatus: Locator;
  readonly taskResult: Locator;
  readonly aggregateStrategy: Locator;

  constructor(page: Page) {
    this.page = page;
    this.agentList = page.getByTestId('agent-list');
    this.agentStatus = page.getByTestId('agent-status');
    this.taskResult = page.getByTestId('task-result');
    this.aggregateStrategy = page.getByLabel(/聚合策略|aggregate strategy/i);
  }

  async goto(taskId: string) {
    await this.page.goto(`/tasks/${taskId}/collaboration`);
  }

  async getOnlineAgentCount() {
    const agents = await this.agentList.locator('[data-status="online"]').all();
    return agents.length;
  }

  async expectAgentOnline(agentName: string) {
    await expect(this.agentList.getByText(agentName)).toBeVisible();
    await expect(this.agentList.getByText(agentName)).toHaveAttribute('data-status', 'online');
  }

  async selectAggregateStrategy(strategy: 'first' | 'last' | 'all' | 'majority' | 'best' | 'average' | 'merge' | 'custom') {
    await this.aggregateStrategy.selectOption(strategy);
  }

  async expectResultVisible() {
    await expect(this.taskResult).toBeVisible();
  }
}
```

#### WorkflowPage

```typescript
// e2e/fixtures/pages/workflow-page.ts
import { Page, Locator } from '@playwright/test';

export class WorkflowPage {
  readonly page: Page;
  readonly createWorkflowButton: Locator;
  readonly workflowCanvas: Locator;
  readonly nodePalette: Locator;
  readonly executeButton: Locator;
  readonly executionStatus: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createWorkflowButton = page.getByRole('button', { name: /创建工作流|create workflow/i });
    this.workflowCanvas = page.getByTestId('workflow-canvas');
    this.nodePalette = page.getByTestId('node-palette');
    this.executeButton = page.getByRole('button', { name: /执行|execute/i });
    this.executionStatus = page.getByTestId('execution-status');
  }

  async goto() {
    await this.page.goto('/workflows');
  }

  async dragNodeToCanvas(nodeType: string) {
    const node = this.nodePalette.getByTestId(`node-${nodeType}`);
    const canvas = this.workflowCanvas;
    await node.dragTo(canvas);
  }

  async executeWorkflow() {
    await this.executeButton.click();
  }

  async expectExecutionStatus(status: 'running' | 'completed' | 'failed') {
    await expect(this.executionStatus).toHaveText(new RegExp(status, 'i'));
  }
}
```

### 7.2 测试文件示例

#### TC-001 & TC-002: 认证流程测试

```typescript
// e2e/authentication-flow.spec.ts
import { test, expect } from '../fixtures/test.fixtures';
import { LoginPage } from '../fixtures/types';
import { generateEmail, generateUsername } from '../helpers/data-generator';
import { testUsers } from '../fixtures/test-data';

test.describe('用户注册流程', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC-001-01: 正常注册', async ({ page }) => {
    // 1. 访问注册页面
    await page.getByRole('link', { name: /注册|register/i }).click();
    
    // 2. 填写注册表单
    const email = generateEmail();
    const username = generateUsername();
    
    await page.getByLabel(/邮箱|email/i).fill(email);
    await page.getByLabel(/用户名|username/i).fill(username);
    await page.getByLabel('密码', { exact: true }).fill('Test123456!');
    await page.getByLabel(/确认密码|confirm password/i).fill('Test123456!');
    
    // 3. 提交表单
    await page.getByRole('button', { name: /注册|register/i }).click();
    
    // 4. 验证注册成功
    await expect(page.getByText(/注册成功|registration successful/i)).toBeVisible();
    await expect(page.getByText(/验证邮件已发送/i)).toBeVisible();
  });

  test('TC-001-02: 邮箱格式验证', async ({ page }) => {
    await page.getByRole('link', { name: /注册|register/i }).click();
    
    await page.getByLabel(/邮箱|email/i).fill('invalid-email');
    await page.getByLabel(/用户名|username/i).fill('testuser');
    await page.getByLabel('密码', { exact: true }).fill('Test123456!');
    await page.getByLabel(/确认密码|confirm password/i).fill('Test123456!');
    await page.getByRole('button', { name: /注册|register/i }).click();
    
    await expect(page.getByText(/邮箱格式无效|invalid email/i)).toBeVisible();
  });

  test('TC-001-03: 密码强度验证', async ({ page }) => {
    await page.getByRole('link', { name: /注册|register/i }).click();
    
    await page.getByLabel(/邮箱|email/i).fill(generateEmail());
    await page.getByLabel(/用户名|username/i).fill(generateUsername());
    await page.getByLabel('密码', { exact: true }).fill('123');
    await page.getByLabel(/确认密码|confirm password/i).fill('123');
    await page.getByRole('button', { name: /注册|register/i }).click();
    
    await expect(page.getByText(/密码强度不足|password too weak/i)).toBeVisible();
  });
});

test.describe('用户登录流程', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC-002-01: 正常登录', async ({ page }) => {
    await loginPage.login(testUsers.user.email, testUsers.user.password);
    
    // 验证登录成功
    await expect(page).toHaveURL(/dashboard|home/);
    await expect(page.getByText(/欢迎|welcome/i)).toBeVisible();
  });

  test('TC-002-02: 错误密码', async ({ page }) => {
    await loginPage.login(testUsers.user.email, 'wrongpassword');
    await loginPage.expectError(/密码错误|incorrect password/i);
  });

  test('TC-002-03: 未验证邮箱登录', async ({ page }) => {
    await loginPage.login(testUsers.unverified.email, testUsers.unverified.password);
    await loginPage.expectError(/邮箱未验证|email not verified/i);
  });

  test('TC-002-04: 记住我功能', async ({ page, context }) => {
    await page.getByLabel(/记住我|remember me/i).check();
    await loginPage.login(testUsers.user.email, testUsers.user.password);
    
    // 验证登录成功
    await expect(page).toHaveURL(/dashboard/);
    
    // 获取 cookies
    const cookies = await context.cookies();
    const rememberCookie = cookies.find(c => c.name === 'remember_me');
    expect(rememberCookie).toBeTruthy();
  });

  test('TC-002-06: 登出功能', async ({ authenticatedPage }) => {
    // 点击登出按钮
    await authenticatedPage.getByRole('button', { name: /登出|logout/i }).click();
    
    // 确认登出
    await authenticatedPage.getByRole('button', { name: /确认|confirm/i }).click();
    
    // 验证跳转到首页
    await expect(authenticatedPage).toHaveURL('/');
  });
});
```

#### TC-003: 创建任务流程测试

```typescript
// e2e/task-creation.spec.ts
import { test, expect } from '../fixtures/test.fixtures';
import { TaskPage } from '../fixtures/pages/task-page';
import { testTasks } from '../fixtures/test-data';
import { generateTaskTitle } from '../helpers/data-generator';

test.describe('创建任务流程', () => {
  let taskPage: TaskPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    taskPage = new TaskPage(authenticatedPage);
    await taskPage.goto();
  });

  test('TC-003-01: 创建简单任务', async ({ authenticatedPage }) => {
    const title = generateTaskTitle();
    
    await taskPage.createTask(title, '这是一个测试任务', 'medium');
    
    // 验证任务创建成功
    await expect(authenticatedPage.getByText(/创建成功|created successfully/i)).toBeVisible();
    await taskPage.expectTaskVisible(title);
    
    // 验证 Agent 自动分配
    await expect(authenticatedPage.getByText(/已分配|assigned/i)).toBeVisible();
  });

  test('TC-003-02: 创建复杂任务', async ({ authenticatedPage }) => {
    const title = generateTaskTitle();
    
    await taskPage.createTaskButton.click();
    await taskPage.taskTitleInput.fill(title);
    await taskPage.taskDescriptionInput.fill('这是一个复杂任务');
    
    // 添加子任务
    await authenticatedPage.getByRole('button', { name: /添加子任务|add subtask/i }).click();
    await authenticatedPage.getByLabel(/子任务标题/i).first().fill('子任务1');
    await authenticatedPage.getByRole('button', { name: /添加子任务|add subtask/i }).click();
    await authenticatedPage.getByLabel(/子任务标题/i).nth(1).fill('子任务2');
    
    // 设置依赖关系
    await authenticatedPage.getByLabel(/依赖关系|dependencies/i).click();
    await authenticatedPage.getByRole('option', { name: /任务A/i }).click();
    
    // 添加标签
    await authenticatedPage.getByLabel(/标签|tags/i).fill('测试,自动化');
    
    await taskPage.submitButton.click();
    
    // 验证任务创建成功
    await expect(authenticatedPage.getByText(/创建成功/i)).toBeVisible();
  });

  test('TC-003-03: 任务表单验证', async ({ authenticatedPage }) => {
    await taskPage.createTaskButton.click();
    await taskPage.submitButton.click();
    
    // 验证必填字段错误提示
    await expect(authenticatedPage.getByText(/标题不能为空|title required/i)).toBeVisible();
  });

  test('TC-003-05: 手动选择 Agent', async ({ authenticatedPage }) => {
    const title = generateTaskTitle();
    
    await taskPage.createTaskButton.click();
    await taskPage.taskTitleInput.fill(title);
    await taskPage.taskDescriptionInput.fill('手动分配任务');
    
    // 手动选择 Agent
    await taskPage.selectAgent('研究专家');
    
    await taskPage.submitButton.click();
    
    // 验证任务分配给指定 Agent
    await expect(authenticatedPage.getByText(/研究专家/i)).toBeVisible();
  });
});
```

#### TC-004: Agent 协作流程测试

```typescript
// e2e/agent-collaboration.spec.ts
import { test, expect } from '../fixtures/test.fixtures';
import { AgentCollaborationPage } from '../fixtures/pages/agent-collaboration-page';
import { mockAgents } from '../fixtures/mock-data/agents';

test.describe('Agent 协作流程', () => {
  let agentPage: AgentCollaborationPage;

  test.beforeEach(async ({ authenticatedPage, mockAPI }) => {
    // Mock Agent API
    await mockAPI('/api/agents', { agents: mockAgents });
    agentPage = new AgentCollaborationPage(authenticatedPage);
  });

  test('TC-004-01: 单 Agent 执行任务', async ({ authenticatedPage }) => {
    // 创建任务
    await authenticatedPage.goto('/tasks');
    await authenticatedPage.getByRole('button', { name: /创建任务/i }).click();
    await authenticatedPage.getByLabel(/标题/i).fill('单 Agent 任务');
    await authenticatedPage.getByRole('button', { name: /提交/i }).click();
    
    // 等待任务分配
    await expect(authenticatedPage.getByText(/任务已分配/i)).toBeVisible();
    
    // 查看执行进度
    await authenticatedPage.getByRole('button', { name: /查看详情/i }).click();
    await expect(authenticatedPage.getByTestId('task-status')).toHaveText(/执行中|executing/i);
    
    // 等待完成
    await expect(authenticatedPage.getByTestId('task-status')).toHaveText(/已完成|completed/i, { timeout: 30000 });
  });

  test('TC-004-02: 多 Agent 并行执行', async ({ authenticatedPage }) => {
    // 创建并行任务
    await authenticatedPage.goto('/tasks');
    await authenticatedPage.getByRole('button', { name: /创建任务/i }).click();
    await authenticatedPage.getByLabel(/标题/i).fill('并行协作任务');
    await authenticatedPage.getByLabel(/执行模式/i).selectOption('parallel');
    await authenticatedPage.getByRole('button', { name: /提交/i }).click();
    
    // 验证多 Agent 参与
    await agentPage.goto('task-123');
    const agentCount = await agentPage.getOnlineAgentCount();
    expect(agentCount).toBeGreaterThan(1);
    
    // 验证结果聚合
    await agentPage.expectResultVisible();
  });

  test('TC-004-06: 结果聚合策略', async ({ authenticatedPage }) => {
    await agentPage.goto('task-123');
    
    // 选择聚合策略
    await agentPage.selectAggregateStrategy('majority');
    await expect(authenticatedPage.getByText(/多数投票结果/i)).toBeVisible();
    
    // 切换策略
    await agentPage.selectAggregateStrategy('best');
    await expect(authenticatedPage.getByText(/最佳质量结果/i)).toBeVisible();
  });
});
```

#### TC-005: 实时协作流程测试

```typescript
// e2e/realtime-collaboration.spec.ts
import { test, expect } from '../fixtures/test.fixtures';
import { testRooms } from '../fixtures/test-data';

test.describe('实时协作流程', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('TC-005-01: 加入房间', async ({ page }) => {
    await page.goto('/collaboration');
    
    // 点击加入房间
    await page.getByRole('button', { name: /加入房间/i }).click();
    await page.getByLabel(/房间名称/i).fill(testRooms.public.name);
    await page.getByRole('button', { name: /确认/i }).click();
    
    // 验证加入成功
    await expect(page.getByText(/已加入房间/i)).toBeVisible();
    await expect(page.getByTestId('online-users')).toBeVisible();
  });

  test('TC-005-02: 发送消息', async ({ browser }) => {
    // 创建两个浏览器上下文（模拟多用户）
    const context1 = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const context2 = await browser.newContext({ storageState: 'e2e/.auth/admin.json' });
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // 两个用户都进入同一房间
    await page1.goto('/rooms/test-room');
    await page2.goto('/rooms/test-room');
    
    // 用户1发送消息
    await page1.getByLabel(/消息/i).fill('Hello from User1');
    await page1.getByRole('button', { name: /发送/i }).click();
    
    // 验证用户2收到消息
    await expect(page2.getByText('Hello from User1')).toBeVisible();
    
    await context1.close();
    await context2.close();
  });

  test('TC-005-04: 房间权限控制', async ({ page }) => {
    // 普通用户尝试管理员操作
    await page.goto('/rooms/test-room');
    
    // 尝试踢出用户（管理员权限）
    const kickButton = page.getByRole('button', { name: /踢出/i });
    if (await kickButton.count() > 0) {
      await kickButton.click();
      await expect(page.getByText(/权限不足|permission denied/i)).toBeVisible();
    }
  });

  test('TC-005-06: 断线重连', async ({ page, context }) => {
    await page.goto('/rooms/test-room');
    await expect(page.getByText(/已连接/i)).toBeVisible();
    
    // 模拟网络断开
    await context.setOffline(true);
    await page.waitForTimeout(1000);
    await expect(page.getByText(/已断开|disconnected/i)).toBeVisible();
    
    // 恢复网络
    await context.setOffline(false);
    await page.waitForTimeout(2000);
    await expect(page.getByText(/已重连|reconnected/i)).toBeVisible();
  });
});
```

### 7.3 测试辅助函数扩展

```typescript
// e2e/helpers/test-helpers-extended.ts
import { Page } from '@playwright/test';

/**
 * 等待 WebSocket 连接
 */
export async function waitForWebSocket(page: Page, timeout = 5000) {
  await page.waitForFunction(
    () => (window as any).wsConnected === true,
    { timeout }
  );
}

/**
 * Mock Agent 响应
 */
export async function mockAgentResponse(page: Page, response: any) {
  await page.route('**/api/agents/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * 创建测试任务
 */
export async function createTestTask(page: Page, title: string, options: any = {}) {
  await page.goto('/tasks');
  await page.getByRole('button', { name: /创建任务/i }).click();
  await page.getByLabel(/标题/i).fill(title);
  
  if (options.description) {
    await page.getByLabel(/描述/i).fill(options.description);
  }
  if (options.priority) {
    await page.getByLabel(/优先级/i).selectOption(options.priority);
  }
  if (options.agent) {
    await page.getByLabel(/Agent/i).selectOption(options.agent);
  }
  
  await page.getByRole('button', { name: /提交/i }).click();
}

/**
 * 验证性能指标
 */
export async function assertPerformanceMetrics(page: Page) {
  const metrics = await page.evaluate(() => {
    return {
      lcp: (window as any).webVitals?.lcp || 0,
      fid: (window as any).webVitals?.fid || 0,
      cls: (window as any).webVitals?.cls || 0,
    };
  });
  
  // 验证 Core Web Vitals
  expect(metrics.lcp).toBeLessThan(2500); // LCP < 2.5s
  expect(metrics.fid).toBeLessThan(100);  // FID < 100ms
  expect(metrics.cls).toBeLessThan(0.1);  // CLS < 0.1
}

/**
 * 截图对比
 */
export async function compareScreenshot(page: Page, name: string) {
  await expect(page).toHaveScreenshot(`${name}.png`, {
    maxDiffPixels: 100,
  });
}

/**
 * 清理测试数据
 */
export async function cleanupTestData(page: Page, userId: string) {
  await page.request.delete(`/api/test/cleanup?userId=${userId}`);
}
```

---

## 8. 附录

### 8.1 测试文件命名规范

```
e2e/
├── [功能模块]-[子模块].spec.ts    # 功能测试
├── [功能模块]-flow.spec.ts        # 流程测试
├── visual-regression.spec.ts      # 视觉回归测试
└── accessibility.spec.ts          # 无障碍测试
```

### 8.2 测试用例命名规范

```typescript
// 格式: [TC-XXX-NN] 测试场景描述
test('[TC-001-01] 正常注册', async ({ page }) => { ... });
test('[TC-002-03] 未验证邮箱登录', async ({ page }) => { ... });
```

### 8.3 测试标签

```typescript
// 使用标签分类测试
test('[TC-003-01] 创建简单任务 @smoke @p0', async ({ page }) => { ... });
test('[TC-004-02] 多 Agent 并行执行 @agent @collaboration', async ({ page }) => { ... });

// 运行特定标签的测试
// npx playwright test --grep @smoke
// npx playwright test --grep @p0
```

### 8.4 测试报告

测试运行后生成以下报告：

1. **HTML 报告**: `playwright-report/index.html`
2. **JSON 报告**: `test-results/results.json`
3. **截图**: `test-results/**/*.png`
4. **视频**: `test-results/**/*.webm`
5. **追踪**: `test-results/**/*.zip`

### 8.5 调试技巧

```bash
# 调试特定测试
npx playwright test --debug authentication-flow.spec.ts

# 查看测试追踪
npx playwright show-trace trace.zip

# UI 模式（推荐）
npx playwright test --ui

# 慢动作执行
npx playwright test --headed --slow-mo=1000
```

### 8.6 常见问题处理

#### 问题 1: 测试超时

```typescript
// 增加测试超时时间
test.setTimeout(60000);

// 或在配置中全局设置
// playwright.config.ts
export default defineConfig({
  timeout: 60000,
});
```

#### 问题 2: 元素未找到

```typescript
// 使用更宽松的选择器
await page.getByText(/登录/i).click();

// 或等待元素出现
await page.getByRole('button', { name: /登录/i }).waitFor({ state: 'visible' });
```

#### 问题 3: 测试不稳定 (Flaky)

```typescript
// 使用重试
test.describe.configure({ retries: 2 });

// 或使用更稳定的等待策略
await expect(page.getByText('成功')).toBeVisible({ timeout: 10000 });
```

---

## 9. 总结

### 9.1 测试覆盖目标

| 指标 | 当前值 | 目标值 | 状态 |
|------|--------|--------|------|
| E2E 测试用例数 | 90+ | 150+ | 📈 扩展中 |
| 关键流程覆盖率 | 85% | 95% | 📈 提升中 |
| 测试通过率 | 95% | 99% | ✅ 目标 |
| 测试执行时间 | ~30 分钟 | ~45 分钟 | ✅ 合理 |

### 9.2 下一步行动

1. **立即执行**（P0）
   - [ ] 实现 TC-001, TC-002 认证流程测试
   - [ ] 实现 TC-003 创建任务测试
   - [ ] 实现 TC-004 Agent 协作测试

2. **本周完成**（P1）
   - [ ] 实现 TC-005 实时协作测试
   - [ ] 实现 TC-006 通知接收测试
   - [ ] 实现 TC-007 工作流编排测试

3. **下周完成**（P2）
   - [ ] 实现 TC-008~TC-012 扩展流程测试
   - [ ] CI/CD 集成
   - [ ] 文档完善

---

**文档版本**: v1.0.0  
**最后更新**: 2026-04-02  
**维护者**: 🧪 测试员