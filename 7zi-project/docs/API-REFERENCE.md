# API 参考文档

**最后更新**: 2026-03-06  
**版本**: v1.1.0

---

## 目录

1. [概述](#概述)
2. [GitHub API](#github-api)
3. [Web API](#web-api)
4. [主题系统 API](#主题系统-api)
5. [导出功能 API](#导出功能-api)
6. [任务系统 API](#任务系统-api)
7. [数据类型](#数据类型)
8. [使用示例](#使用示例)
9. [错误处理](#错误处理)

---

## 概述

7zi Studio 项目提供以下 API 集成：

- **GitHub API** - 同步 Issues 和 Commits
- **Web API** - 内部看板数据接口

---

## GitHub API

项目使用 GitHub REST API v3 获取团队数据。

### 基础配置

```typescript
const headers = {
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
  Authorization: `token ${GITHUB_TOKEN}`
};
```

### 获取 Issues

```http
GET https://api.github.com/repos/{owner}/{repo}/issues?state=all&per_page=50
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| owner | string | 是 | 仓库所有者用户名 |
| repo | string | 是 | 仓库名称 |
| state | string | 否 | `open`, `closed`, `all` (默认 all) |
| per_page | number | 否 | 每页数量 (最大 100) |

**请求示例**:

```bash
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     "https://api.github.com/repos/songzuo/7zi/issues?state=all&per_page=50"
```

**响应示例**:

```json
[
  {
    "id": 123456789,
    "number": 1,
    "title": "修复登录页面样式问题",
    "state": "open",
    "user": {
      "login": "songzuo",
      "avatar_url": "https://avatars.githubusercontent.com/u/1234567?v=4"
    },
    "assignee": {
      "login": "ai-agent",
      "avatar_url": "https://avatars.githubusercontent.com/u/9876543?v=4"
    },
    "updated_at": "2026-03-06T08:00:00Z",
    "html_url": "https://github.com/songzuo/7zi/issues/1"
  }
]
```

---

### 获取 Commits

```http
GET https://api.github.com/repos/{owner}/{repo}/commits?per_page=30
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| owner | string | 是 | 仓库所有者用户名 |
| repo | string | 是 | 仓库名称 |
| per_page | number | 否 | 每页数量 (最大 100) |

**请求示例**:

```bash
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     "https://api.github.com/repos/songzuo/7zi/commits?per_page=30"
```

**响应示例**:

```json
[
  {
    "sha": "abc123def456",
    "commit": {
      "message": "添加用户认证功能\n\n- 实现 JWT 登录\n- 添加注册接口",
      "author": {
        "name": "AI Agent",
        "date": "2026-03-06T07:30:00Z",
        "email": "agent@7zi.com"
      }
    },
    "author": {
      "login": "ai-agent",
      "avatar_url": "https://avatars.githubusercontent.com/u/9876543?v=4"
    },
    "html_url": "https://github.com/songzuo/7zi/commit/abc123def456"
  }
]
```

---

## Web API

### 认证 API

#### 登录

**端点**: `POST /api/auth/login`

**请求体**:

```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**响应示例** (200 OK):

```json
{
  "message": "Login successful",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "用户名",
    "role": "user"
  }
}
```

**错误响应**:

| 状态码 | 说明 |
|--------|------|
| 400 | 邮箱或密码缺失 |
| 401 | 凭据无效 |
| 500 | 服务器内部错误 |

---

#### 注册

**端点**: `POST /api/auth/register`

**请求体**:

```json
{
  "email": "user@example.com",
  "password": "your-password",
  "name": "用户名"
}
```

**密码要求**: 最少 6 个字符

**响应示例** (200 OK):

```json
{
  "message": "Registration successful",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "用户名",
    "role": "user"
  }
}
```

**错误响应**:

| 状态码 | 说明 |
|--------|------|
| 400 | 必填字段缺失或密码过短 |
| 409 | 邮箱已被注册 |
| 500 | 服务器内部错误 |

---

#### 获取当前用户

**端点**: `GET /api/auth/me`

**认证**: 需要 `auth-token` Cookie

**响应示例** (200 OK):

```json
{
  "userId": "123",
  "email": "user@example.com",
  "role": "user"
}
```

**错误响应**:

| 状态码 | 说明 |
|--------|------|
| 401 | 未认证 |

---

#### 登出

**端点**: `POST /api/auth/logout`

**响应**: 清除 `auth-token` Cookie

---

#### 受保护路由

**端点**: `GET /api/protected`

**认证**: 需要 `auth-token` Cookie

**响应示例** (200 OK):

```json
{
  "message": "This is a protected route",
  "user": {
    "userId": "123",
    "email": "user@example.com",
    "role": "user"
  },
  "data": {
    "projects": ["7zi Studio", "AI Dashboard", "OpenClaw"],
    "stats": {
      "totalIssues": 42,
      "openIssues": 12,
      "closedIssues": 30,
      "totalCommits": 156
    }
  }
}
```

---

### Dashboard 数据接口

项目使用 Next.js API 路由提供看板数据。

**端点**: `GET /api/dashboard`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| owner | string | 是 | GitHub 仓库所有者 |
| repo | string | 是 | GitHub 仓库名称 |

**响应格式**:

```typescript
interface DashboardData {
  issues: GitHubIssue[];
  commits: GitHubCommit[];
  activities: ActivityItem[];
  lastUpdated: string;
}
```

---

### 认证机制

项目使用 JWT Token 认证：

- **Token 存储**: HttpOnly Cookie (`auth-token`)
- **Token 有效期**: 7 天
- **安全属性**: 
  - `httpOnly: true` (防止 XSS)
  - `secure: true` (生产环境 HTTPS)
  - `sameSite: 'lax'` (CSRF 防护)

**Token 载荷**:

```typescript
interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}
```

---

## 主题系统 API

主题系统提供浅色/深色/跟随系统三种模式，支持平滑过渡动画。

### ThemeProvider 组件

**文件位置**: `app/components/ThemeProvider.tsx`

```tsx
import { ThemeProvider } from '@/components/ThemeProvider';
```

#### Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `children` | `React.ReactNode` | 是 | - | 子组件 |
| `defaultTheme` | `Theme` | 否 | `'system'` | 默认主题 |

#### Theme 类型

```typescript
type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';
```

#### 使用示例

```tsx
// 在根布局中使用
<ThemeProvider defaultTheme="system">
  <App />
</ThemeProvider>
```

---

### useTheme Hook

获取和操作主题状态的 Hook。

**文件位置**: `app/components/ThemeProvider.tsx`

```tsx
import { useTheme } from '@/components/ThemeProvider';
```

#### 返回值

```typescript
interface ThemeContextType {
  /** 当前主题设置 */
  theme: Theme;
  /** 实际应用的主题（如果 theme 是 system，则返回系统当前主题） */
  resolvedTheme: ResolvedTheme;
  /** 是否正在切换主题（用于动画） */
  isTransitioning: boolean;
  /** 设置主题 */
  setTheme: (theme: Theme) => void;
  /** 切换主题（light <-> dark） */
  toggleTheme: () => void;
}
```

#### 使用示例

```tsx
function MyComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme, isTransitioning } = useTheme();
  
  return (
    <div>
      <p>当前主题: {theme}</p>
      <p>实际主题: {resolvedTheme}</p>
      <button onClick={toggleTheme}>切换主题</button>
      <button onClick={() => setTheme('system')}>跟随系统</button>
    </div>
  );
}
```

#### 功能特性

- ✅ 三种主题模式 (light/dark/system)
- ✅ localStorage 持久化
- ✅ 跟随系统主题变化（实时监听 `prefers-color-scheme`）
- ✅ 平滑过渡动画 (300ms)
- ✅ SSR 兼容（避免水合不匹配）

---

## 导出功能 API

支持 PDF、CSV、JSON、Excel 四种格式的数据导出。

### 导出工具函数

**文件位置**: `app/lib/export.ts`

```tsx
import {
  exportToPDF,
  exportTasksPDF,
  exportMembersCSV,
  exportIssuesCSV,
  exportCommitsCSV,
  exportTasksCSV,
  exportReportJSON,
  exportCompleteReport,
  downloadCSV,
  downloadJSON,
} from '@/lib/export';
```

### 导出格式类型

```typescript
export type ExportFormat = 'csv' | 'json' | 'pdf' | 'excel';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeStats?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ReportData {
  members: AIMember[];
  issues: GitHubIssue[];
  commits: GitHubCommit[];
  activities: ActivityItem[];
  tasks?: Task[];
  stats: {
    totalMembers: number;
    working: number;
    busy: number;
    idle: number;
    offline: number;
    openIssues: number;
    closedIssues: number;
  };
  taskStats?: TaskStats;
  generatedAt: Date;
}
```

---

### PDF 导出

#### exportToPDF()

导出团队报告为 PDF 格式。

```tsx
export function exportToPDF(
  members: AIMember[],
  issues: GitHubIssue[],
  commits: GitHubCommit[],
  stats: {
    totalMembers: number;
    working: number;
    busy: number;
    idle: number;
    offline: number;
    openIssues: number;
    closedIssues: number;
  }
): void
```

**使用示例**:

```tsx
import { exportToPDF } from '@/lib/export';

// 导出团队报告
exportToPDF(members, issues, commits, {
  totalMembers: 11,
  working: 5,
  busy: 3,
  idle: 2,
  offline: 1,
  openIssues: 12,
  closedIssues: 30,
});
```

#### exportTasksPDF()

导出任务报告为 PDF 格式。

```tsx
export function exportTasksPDF(tasks: Task[], stats: TaskStats): void
```

**使用示例**:

```tsx
import { exportTasksPDF } from '@/lib/export';

exportTasksPDF(tasks, {
  total: 50,
  done: 30,
  inProgress: 10,
  todo: 8,
  review: 2,
  overdue: 3,
  dueSoon: 5,
  completionRate: 60,
  byPriority: { high: 10, medium: 25, low: 15 },
});
```

---

### CSV 导出

#### downloadCSV()

通用 CSV 下载函数。

```tsx
export function downloadCSV(
  data: Record<string, unknown>[], 
  filename: string
): void
```

#### exportMembersCSV()

导出 AI 团队成员数据为 CSV。

```tsx
export function exportMembersCSV(members: AIMember[]): void
```

#### exportIssuesCSV()

导出 GitHub Issues 数据为 CSV。

```tsx
export function exportIssuesCSV(issues: GitHubIssue[]): void
```

#### exportCommitsCSV()

导出 GitHub Commits 数据为 CSV。

```tsx
export function exportCommitsCSV(commits: GitHubCommit[]): void
```

#### exportTasksCSV()

导出任务数据为 CSV。

```tsx
export function exportTasksCSV(tasks: Task[]): void
```

---

### JSON 导出

#### downloadJSON()

通用 JSON 下载函数。

```tsx
export function downloadJSON(data: unknown, filename: string): void
```

#### exportReportJSON()

导出完整报告为 JSON 格式。

```tsx
export function exportReportJSON(reportData: ReportData): void
```

---

### Excel 导出

#### exportTasksExcel()

导出任务数据为 Excel 文件。

```tsx
import { exportTasksExcel } from '@/lib/export';

exportTasksExcel(tasks);
```

---

### 批量导出

#### exportCompleteReport()

一次性导出完整报告（支持多种格式）。

```tsx
export function exportCompleteReport(
  reportData: ReportData,
  format: ExportFormat = 'json'
): void
```

**使用示例**:

```tsx
import { exportCompleteReport } from '@/lib/export';

// JSON 格式
exportCompleteReport(reportData, 'json');

// PDF 格式
exportCompleteReport(reportData, 'pdf');

// CSV 格式（会生成多个 CSV 文件）
exportCompleteReport(reportData, 'csv');
```

---

### 导出 API 路由

**端点**: `/api/export`

#### GET /api/export

获取导出数据。

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `format` | `'json' \| 'csv'` | 否 | `'json'` | 导出格式 |
| `type` | `'tasks' \| 'stats'` | 否 | `'tasks'` | 数据类型 |

**响应示例**:

```json
{
  "tasks": [...],
  "stats": {
    "total": 50,
    "done": 30,
    "inProgress": 10,
    "todo": 8,
    "review": 2
  },
  "exportedAt": "2026-03-06T12:00:00Z"
}
```

#### POST /api/export

处理自定义导出请求。

**请求体**:

```json
{
  "format": "csv",
  "type": "tasks",
  "data": null,
  "options": {}
}
```

---

## 任务系统 API

任务系统提供任务的 CRUD 操作、筛选、统计等功能。

### 任务类型定义

**文件位置**: `app/lib/tasks/types.ts`

```typescript
// 任务优先级
export type TaskPriority = 'high' | 'medium' | 'low';

// 任务状态
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

// 任务标签
export interface TaskTag {
  id: string;
  name: string;
  color: string; // Tailwind color class
}

// 任务实体
export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  tags: TaskTag[];
  assignee?: string; // 子代理 ID
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// 任务筛选条件
export interface TaskFilter {
  priority?: TaskPriority;
  status?: TaskStatus;
  tags?: string[];
  assignee?: string;
  search?: string;
}

// 任务统计
export interface TaskStats {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  review: number;
  overdue: number;
  dueSoon: number;
  completionRate: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
}
```

### 预定义常量

```typescript
// 默认标签
export const DEFAULT_TAGS: TaskTag[] = [
  { id: 'bug', name: 'Bug', color: 'red' },
  { id: 'feature', name: 'Feature', color: 'blue' },
  { id: 'enhancement', name: 'Enhancement', color: 'purple' },
  { id: 'documentation', name: 'Docs', color: 'green' },
  { id: 'urgent', name: 'Urgent', color: 'orange' },
  { id: 'ai-agent', name: 'AI Agent', color: 'pink' },
];

// 优先级配置
export const PRIORITY_CONFIG = {
  high: { label: '高优先级', color: 'red', icon: '🔴' },
  medium: { label: '中优先级', color: 'yellow', icon: '🟡' },
  low: { label: '低优先级', color: 'green', icon: '🟢' },
};

// 状态配置
export const STATUS_CONFIG = {
  todo: { label: '待办', color: 'gray' },
  in_progress: { label: '进行中', color: 'blue' },
  review: { label: '评审中', color: 'purple' },
  done: { label: '已完成', color: 'green' },
};
```

---

### 任务 API 路由

**基础端点**: `/api/tasks`

#### GET /api/tasks

获取任务列表（支持筛选）。

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `priority` | `TaskPriority` | 否 | 按优先级筛选 |
| `status` | `TaskStatus` | 否 | 按状态筛选 |
| `assignee` | `string` | 否 | 按负责人筛选 |
| `search` | `string` | 否 | 搜索标题或描述 |
| `tags` | `string` | 否 | 标签 ID 列表（逗号分隔） |

**响应示例**:

```json
{
  "tasks": [
    {
      "id": "task_123",
      "title": "实现用户认证功能",
      "description": "添加登录和注册功能",
      "priority": "high",
      "status": "in_progress",
      "tags": [{ "id": "feature", "name": "Feature", "color": "blue" }],
      "assignee": "executor",
      "dueDate": "2026-03-10T00:00:00Z",
      "createdAt": "2026-03-06T08:00:00Z",
      "updatedAt": "2026-03-06T10:00:00Z"
    }
  ]
}
```

#### POST /api/tasks

创建新任务。

**请求体**:

```json
{
  "title": "实现用户认证功能",
  "description": "添加登录和注册功能",
  "priority": "high",
  "status": "todo",
  "tags": [{ "id": "feature", "name": "Feature", "color": "blue" }],
  "assignee": "executor",
  "dueDate": "2026-03-10T00:00:00Z"
}
```

**响应** (201 Created):

```json
{
  "task": {
    "id": "task_123",
    "title": "实现用户认证功能",
    ...
  }
}
```

#### GET /api/tasks/[id]

获取单个任务详情。

#### PUT /api/tasks/[id]

更新任务。

**请求体**:

```json
{
  "status": "done",
  "completedAt": "2026-03-06T12:00:00Z"
}
```

#### DELETE /api/tasks/[id]

删除任务。

#### POST /api/tasks/batch

批量更新任务状态。

**请求体**:

```json
{
  "ids": ["task_1", "task_2", "task_3"],
  "status": "done"
}
```

**响应**:

```json
{
  "updated": 3
}
```

#### GET /api/tasks/stats

获取任务统计信息。

**响应示例**:

```json
{
  "stats": {
    "total": 50,
    "done": 30,
    "inProgress": 10,
    "todo": 8,
    "review": 2,
    "overdue": 3,
    "dueSoon": 5,
    "completionRate": 60,
    "byPriority": {
      "high": 10,
      "medium": 25,
      "low": 15
    }
  }
}
```

---

### 任务 API 客户端

**文件位置**: `app/lib/tasks/api.ts`

```tsx
import {
  fetchTasks,
  fetchTask,
  createTaskApi,
  updateTaskApi,
  deleteTaskApi,
  batchUpdateStatusApi,
  fetchTaskStats,
  fetchTags,
  createTagApi,
  deleteTagApi,
} from '@/lib/tasks/api';
```

#### 函数列表

| 函数 | 说明 |
|------|------|
| `fetchTasks(filter?)` | 获取任务列表 |
| `fetchTask(id)` | 获取单个任务 |
| `createTaskApi(taskData)` | 创建任务 |
| `updateTaskApi(id, updates)` | 更新任务 |
| `deleteTaskApi(id)` | 删除任务 |
| `batchUpdateStatusApi(ids, status)` | 批量更新状态 |
| `fetchTaskStats()` | 获取统计信息 |
| `fetchTags(customOnly?)` | 获取标签列表 |
| `createTagApi(tagData)` | 创建标签 |
| `deleteTagApi(id)` | 删除标签 |

---

### useTasks Hook

任务管理 React Hook。

**文件位置**: `app/lib/tasks/useTasks.ts`

```tsx
import { useTasks } from '@/lib/tasks/useTasks';
```

#### 返回值

```typescript
interface UseTasksReturn {
  // 状态
  tasks: Task[];           // 过滤后的任务
  allTasks: Task[];        // 所有任务
  customTags: TaskTag[];   // 自定义标签
  allTags: TaskTag[];      // 所有标签（含默认）
  filter: TaskFilter;      // 当前筛选条件
  sortBy: string;          // 排序方式
  isLoading: boolean;      // 加载状态
  error: string | null;    // 错误信息
  stats: TaskStats;        // 统计信息

  // 操作
  addTask: (data) => Promise<Task>;
  updateTask: (id, updates) => Promise<void>;
  deleteTask: (id) => Promise<void>;
  batchUpdateStatus: (ids, status) => Promise<void>;
  addCustomTag: (tag) => Promise<TaskTag>;
  deleteCustomTag: (id) => Promise<void>;
  updateFilter: (filter) => void;
  resetFilter: () => void;
  setSortBy: (sort) => void;
  clearError: () => void;

  // 查询
  getTaskById: (id) => Task | undefined;
  getTasksByTag: (tagId) => Task[];
  getTasksByAssignee: (assigneeId) => Task[];
}
```

#### 使用示例

```tsx
function TaskManager() {
  const {
    tasks,
    stats,
    isLoading,
    addTask,
    updateTask,
    deleteTask,
    updateFilter,
    filter,
  } = useTasks();

  const handleCreate = async () => {
    await addTask({
      title: '新任务',
      priority: 'high',
      status: 'todo',
      tags: [],
    });
  };

  if (isLoading) return <Loading />;

  return (
    <div>
      <h1>任务总数: {stats.total}</h1>
      <h2>完成率: {stats.completionRate}%</h2>
      
      <select onChange={(e) => updateFilter({ status: e.target.value })}>
        <option value="">全部状态</option>
        <option value="todo">待办</option>
        <option value="in_progress">进行中</option>
        <option value="done">已完成</option>
      </select>
      
      <ul>
        {tasks.map(task => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
      
      <button onClick={handleCreate}>创建任务</button>
    </div>
  );
}
```

---

### 任务数据仓库

**文件位置**: `app/lib/db/tasks.repository.ts`

服务端数据库操作模块。

#### 函数列表

| 函数 | 说明 |
|------|------|
| `getAllTasks()` | 获取所有任务 |
| `getTaskById(id)` | 根据 ID 获取任务 |
| `filterTasks(filter)` | 按条件筛选任务 |
| `createTask(taskData)` | 创建任务 |
| `updateTask(id, updates)` | 更新任务 |
| `deleteTask(id)` | 删除任务 |
| `batchUpdateStatus(ids, status)` | 批量更新状态 |
| `getTaskStats()` | 获取统计信息 |

---

## 数据类型

### GitHubIssue

```typescript
interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  user: {
    login: string;
    avatar_url: string;
  };
  assignee: {
    login: string;
    avatar_url: string;
  } | null;
  updated_at: string;
  html_url: string;
  pull_request?: object; // 如果存在则是 PR
}
```

### GitHubCommit

```typescript
interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
      email: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  html_url: string;
}
```

### ActivityItem

```typescript
interface ActivityItem {
  id: string;
  type: 'commit' | 'issue';
  title: string;
  author: string;
  avatar?: string;
  timestamp: string;
  url: string;
}
```

---

## 使用示例

### React Hook 使用

```tsx
import { useDashboardData } from './hooks/useDashboardData';

function Dashboard() {
  const { issues, commits, activities, isLoading, error, refreshData } = 
    useDashboardData('songzuo', '7zi', process.env.GITHUB_TOKEN);

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      <button onClick={refreshData}>刷新数据</button>
      <div>Issues: {issues.length}</div>
      <div>Commits: {commits.length}</div>
      <ul>
        {activities.map(activity => (
          <li key={activity.id}>{activity.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 原生 Fetch 使用

```javascript
async function fetchDashboardData(owner, repo, token) {
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    ...(token && { Authorization: `token ${token}` })
  };

  const [issuesRes, commitsRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=50`, 
      { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=30`, 
      { headers })
  ]);

  const issues = await issuesRes.json();
  const commits = await commitsRes.json();

  return { issues, commits };
}
```

### 使用 GitHub CLI

```bash
# 获取 Issues
gh issue list --repo songzuo/7zi --state all --limit 50

# 获取 Commits
gh repo view songzuo/7zi --json defaultBranchRef
```

---

## 错误处理

### 常见错误码

| 状态码 | 说明 | 解决方案 |
|--------|------|----------|
| 401 | GitHub Token 无效 | 检查并更新 GITHUB_TOKEN |
| 403 | API 速率限制 | 等待后重试或使用 Token |
| 404 | 仓库不存在 | 检查 owner 和 repo 参数 |

### 错误响应示例

```json
{
  "message": "Not Found",
  "documentation_url": "https://docs.github.com/rest"
}
```

---

## 速率限制

GitHub API 速率限制：

- **未认证**: 60 次/小时
- **认证用户**: 5000 次/小时

查看剩余配额：

```bash
curl -H "Authorization: token YOUR_TOKEN" \
     https://api.github.com/rate_limit
```

---

## 相关链接

- [GitHub REST API 文档](https://docs.github.com/rest)
- [GitHub GraphQL API](https://docs.github.com/graphql)
- [Next.js 文档](https://nextjs.org/docs)
- [项目 GitHub](https://github.com/songzuo/7zi)

---

*文档由 7zi Studio AI 团队维护 🤖*
