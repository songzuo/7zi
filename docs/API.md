# API 完整文档

**最后更新**: 2026-03-22
**版本**: v1.1.0

---

## 📋 目录

1. [自定义 Hooks](#自定义-hooks)
2. [公开组件](#公开组件)
3. [API 端点](#api-端点)
4. [数据模型](#数据模型)
5. [错误处理](#错误处理)

---

## 自定义 Hooks

### useThemeCustomization

主题定制 Hook，支持自定义颜色、间距、圆角、字体等。

**文件位置**: `src/hooks/useThemeCustomization.ts`

#### 功能

- 设置和管理自定义主题
- 预设主题和自定义主题切换
- 主题配置导入导出

#### 使用示例

```typescript
const {
  currentTheme,
  setTheme,
  customizeColors,
  exportTheme,
  importTheme
} = useThemeCustomization();

// 设置主题
setTheme('custom-theme');

// 自定义颜色
customizeColors({
  primary: '#007AFF',
  background: '#FFFFFF'
});

// 导出主题
const themeJson = exportTheme();
```

---

### useUserPreferences

用户偏好设置 Hook。

**文件位置**: `src/hooks/useUserPreferences.ts`

#### 功能

- 管理用户显示设置
- 通知偏好配置
- 语言和地区设置

#### 使用示例

```typescript
const {
  preferences,
  updatePreferences,
  resetPreferences
} = useUserPreferences();

// 更新偏好设置
updatePreferences({
  animations: true,
  compactMode: false,
  fontSize: 'medium',
  notifications: {
    desktop: true,
    sound: true
  }
});
```

---

### useBatchOperations

批量操作 Hook，支持批量更新任务、状态、标签等。

**文件位置**: `src/hooks/useBatchOperations.ts`

#### 功能

- 批量选择/取消选择
- 批量更新状态
- 批量更新优先级
- 批量添加标签
- 批量设置截止日期

#### 使用示例

```typescript
const {
  selectedTasks,
  selectAll,
  clearSelection,
  updateStatus,
  updatePriority,
  addTags,
  setDueDate
} = useBatchOperations();

// 批量更新状态
updateStatus('completed', selectedTasks);

// 批量添加标签
addTags(['urgent', 'review'], selectedTasks);

// 批量设置截止日期
setDueDate(new Date('2026-03-30'), selectedTasks);
```

---

### useWebSocket

WebSocket 通信 Hook。

**文件位置**: `src/hooks/useWebSocket.ts`

#### 功能

- WebSocket 连接管理
- 消息发送和接收
- 事件监听
- 自动重连

#### 使用示例

```typescript
const {
  isConnected,
  send,
  subscribe,
  unsubscribe
} = useWebSocket();

// 发送消息
send('task_update', { taskId: '123', status: 'completed' });

// 订阅事件
subscribe('message', (data) => {
  console.log('Received message:', data);
});
```

---

### useExport

数据导出 Hook。

**文件位置**: `src/hooks/useExport.ts`

#### 功能

- 导出为 PDF
- 导出为 CSV
- 导出为 JSON
- 自定义数据导出

#### 使用示例

```typescript
const {
  exportToPDF,
  exportToCSV,
  exportToJSON,
  exportCustomData
} = useExport();

// 导出 PDF
exportToPDF(tasks, 'tasks-report.pdf');

// 导出 CSV
exportToCSV(tasks, 'tasks.csv');

// 导出 JSON
exportToJSON(tasks, 'tasks.json');

// 自定义导出
exportCustomData(filteredTasks, 'custom-export.json');
```

---

### useNotifications

通知系统 Hook。

**文件位置**: `src/hooks/useNotifications.ts`

#### 功能

- 通知显示
- 通知管理
- 通知偏好设置

#### 使用示例

```typescript
const {
  notifications,
  addNotification,
  markAsRead,
  clearAll
} = useNotifications();

// 添加通知
addNotification({
  type: 'success',
  message: 'Task completed successfully',
  priority: 'high'
});

// 标记为已读
markAsRead('notification-id');
```

---

### useDashboardData

Dashboard 数据 Hook。

**文件位置**: `src/hooks/useDashboardData.ts`

#### 功能

- 获取任务统计
- 获取团队活动
- 获取性能指标

#### 使用示例

```typescript
const {
  taskStats,
  teamActivity,
  performance,
  loading,
  error
} = useDashboardData();

// 使用数据
console.log(taskStats.totalTasks);
console.log(teamActivity.recentActivity);
console.log(performance.efficiency);
```

---

### useRealtimeDashboard

实时 Dashboard Hook。

**文件位置**: `src/hooks/useRealtimeDashboard.ts`

#### 功能

- 实时数据更新
- WebSocket 连接
- 性能指标监控

#### 使用示例

```typescript
const {
  realTimeData,
  isConnected,
  error
} = useRealtimeDashboard();

// 使用实时数据
useEffect(() => {
  if (realTimeData) {
    console.log('Real-time update:', realTimeData);
  }
}, [realTimeData]);
```

---

### useTheme

主题切换 Hook。

**文件位置**: `src/hooks/useTheme.ts`

#### 功能

- light/dark/system 模式切换
- localStorage 持久化
- 系统主题跟随

#### 使用示例

```typescript
const { theme, setTheme } = useTheme();

// 切换主题
setTheme('dark');
setTheme('light');
setTheme('system');
```

---

### useWebVitals

Web Vitals 性能监控 Hook。

**文件位置**: `src/hooks/useWebVitals.ts`

#### 功能

- LCP 监控
- FID 监控
- CLS 监控
- 性能指标上报

#### 使用示例

```typescript
const { metrics, reportMetric } = useWebVitals();

// 使用指标
console.log('LCP:', metrics.lcp);
console.log('FID:', metrics.fid);
console.log('CLS:', metrics.cls);

// 上报指标
reportMetric('custom_metric', value);
```

---

## 公开组件

### Button

通用按钮组件。

**位置**: `src/components/ui/Button.tsx`

#### Props

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
```

#### 使用示例

```jsx
<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>
```

---

### Input

输入框组件。

**位置**: `src/components/ui/Input.tsx`

#### Props

```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
}
```

---

### Card

卡片组件。

**位置**: `src/components/ui/Card.tsx`

#### Props

```typescript
interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}
```

---

### Modal

模态框组件。

**位置**: `src/components/ui/Modal.tsx`

#### Props

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}
```

---

## API 端点

### 任务管理 API

#### 获取任务列表

```
GET /api/tasks
```

**Query 参数:**
- `status`: 过滤状态 (pending, in_progress, completed, failed)
- `priority`: 过滤优先级 (low, medium, high, urgent)
- `assignee`: 过滤负责人
- `tags`: 过滤标签（逗号分隔）
- `page`: 页码（默认 1）
- `limit`: 每页数量（默认 20）

**响应:**
```json
{
  "tasks": [
    {
      "id": "123",
      "title": "Task title",
      "description": "Task description",
      "status": "in_progress",
      "priority": "high",
      "assignee": "agent-001",
      "tags": ["urgent", "review"],
      "dueDate": "2026-03-30T00:00:00Z",
      "createdAt": "2026-03-22T10:00:00Z",
      "updatedAt": "2026-03-22T11:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

#### 创建任务

```
POST /api/tasks
```

**请求体:**
```json
{
  "title": "Task title",
  "description": "Task description",
  "priority": "high",
  "assignee": "agent-001",
  "tags": ["urgent", "review"],
  "dueDate": "2026-03-30T00:00:00Z"
}
```

**响应:**
```json
{
  "id": "123",
  "title": "Task title",
  "status": "pending",
  "createdAt": "2026-03-22T10:00:00Z"
}
```

---

#### 更新任务

```
PUT /api/tasks/:id
```

**请求体:**
```json
{
  "status": "completed",
  "priority": "medium"
}
```

**响应:**
```json
{
  "id": "123",
  "status": "completed",
  "updatedAt": "2026-03-22T11:00:00Z"
}
```

---

#### 删除任务

```
DELETE /api/tasks/:id
```

**响应:**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

---

#### 批量操作

```
POST /api/tasks/batch
```

**请求体:**
```json
{
  "taskIds": ["123", "456", "789"],
  "action": "update_status",
  "data": {
    "status": "completed"
  }
}
```

**响应:**
```json
{
  "success": true,
  "updated": 3,
  "failed": 0
}
```

---

### 用户管理 API

#### 获取用户列表

```
GET /api/users
```

**响应:**
```json
{
  "users": [
    {
      "id": "user-001",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "status": "active",
      "createdAt": "2026-03-01T00:00:00Z"
    }
  ],
  "total": 10
}
```

---

#### 创建用户

```
POST /api/users
```

**请求体:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "member",
  "password": "secure-password"
}
```

---

### 通知 API

#### 获取通知列表

```
GET /api/notifications
```

**Query 参数:**
- `unreadOnly`: 仅未读 (true/false)
- `type`: 过滤类型 (success, error, warning, info, task_assigned, system)

**响应:**
```json
{
  "notifications": [
    {
      "id": "notif-001",
      "type": "success",
      "message": "Task completed successfully",
      "priority": "high",
      "read": false,
      "createdAt": "2026-03-22T10:00:00Z"
    }
  ],
  "total": 5,
  "unread": 2
}
```

---

#### 标记为已读

```
PUT /api/notifications/:id/read
```

---

#### 批量标记为已读

```
PUT /api/notifications/read-all
```

---

### 导出 API

#### 导出任务

```
GET /api/export/tasks?format=pdf
```

**Query 参数:**
- `format`: 导出格式 (pdf, csv, json)

**响应:**
- PDF: 文件下载
- CSV: CSV 文件下载
- JSON: JSON 文件下载

---

## 数据模型

### Task

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  tags: string[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### User

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'member' | 'viewer' | 'guest';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}
```

---

### Notification

```typescript
interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'task_assigned' | 'system';
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  createdAt: Date;
  expiresAt?: Date;
}
```

---

### ThemeConfig

```typescript
interface ThemeConfig {
  id: string;
  name: string;
  isDark: boolean;
  colors: {
    primary: string;
    primaryHover: string;
    accent: string;
    background: string;
    foreground: string;
    card: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  spacing: {
    baseUnit: number;
    componentGap: number;
    cardPadding: number;
    pagePadding: number;
  };
  radius: {
    button: number;
    card: number;
    input: number;
    modal: number;
  };
}
```

---

## 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  }
}
```

### 常见错误码

| 错误码 | HTTP 状态 | 说明 |
|--------|----------|------|
| `UNAUTHORIZED` | 401 | 未授权 |
| `FORBIDDEN` | 403 | 无权限 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 🔗 相关文档

- [README.md](./README.md) - 项目介绍
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南

---

**文档维护**: 📚 咨询师 (AI 团队)
