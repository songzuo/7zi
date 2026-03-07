# 组件参考文档

**最后更新**: 2026-03-06  
**版本**: v1.1.0

---

## 目录

1. [核心组件](#核心组件)
2. [消息组件](#消息组件)
3. [通知组件](#通知组件)
4. [主题组件](#主题组件)
5. [导出组件](#导出组件)
6. [任务组件](#任务组件)
7. [UI 组件](#ui-组件)
8. [类型定义](#类型定义)

---

## 核心组件

### ActivityLog

实时活动日志组件，显示 GitHub 提交、任务和评论活动。

**文件位置**: `app/components/ActivityLog.tsx`

```tsx
import { ActivityLog } from '@/components/ActivityLog';
```

#### Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `activities` | `ActivityItem[]` | 是 | - | 活动列表数据 |

#### ActivityItem 类型

```typescript
interface ActivityItem {
  id: string;
  type: 'commit' | 'issue' | 'comment';
  title: string;
  author: string;
  avatar?: string;
  timestamp: string;
  url: string;
}
```

#### 使用示例

```tsx
const activities: ActivityItem[] = [
  {
    id: '1',
    type: 'commit',
    title: '添加用户认证功能',
    author: 'ai-agent',
    avatar: 'https://avatars.githubusercontent.com/u/123?v=4',
    timestamp: '2026-03-06T08:00:00Z',
    url: 'https://github.com/songzuo/7zi/commit/abc123'
  }
];

<ActivityLog activities={activities} />
```

#### 特性

- ✅ 支持深色模式
- ✅ 无障碍支持 (ARIA 标签)
- ✅ 键盘导航 (Enter/Space 打开链接)
- ✅ 自动刷新提示 (30 秒间隔)
- ✅ 空状态展示

---

### MemberPresenceBoard

团队成员在线状态看板。

**文件位置**: `app/components/MemberPresenceBoard.tsx`

```tsx
import { MemberPresenceBoard, MemberPresenceCard, PresenceIndicator, PresenceStats } from '@/components/MemberPresenceBoard';
```

#### Props

##### MemberPresenceBoard

无 props，组件内部自动加载成员状态数据。

##### MemberPresenceCard

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `presence` | `MemberPresence` | 是 | - | 成员状态数据 |
| `memberName` | `string` | 是 | - | 成员名称 |
| `memberEmoji` | `string` | 是 | - | 成员 emoji 标识 |
| `memberAvatar` | `string` | 是 | - | 成员头像 URL |

##### PresenceIndicator

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `presence` | `MemberPresence` | 是 | - | 成员状态数据 |

##### PresenceStats

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `stats` | `ReturnType<typeof getPresenceStats>` | 是 | - | 统计数据 |

#### 类型定义

```typescript
type MemberStatus = 'online' | 'offline' | 'away' | 'busy';

interface MemberPresence {
  memberId: string;
  status: MemberStatus;
  lastSeen: string;
  currentTask?: string;
  location?: 'workspace' | 'meeting' | 'break' | 'offline';
}
```

#### 使用示例

```tsx
// 完整看板
<MemberPresenceBoard />

// 单个成员卡片
<MemberPresenceCard
  presence={presenceData}
  memberName="架构师"
  memberEmoji="🏗️"
  memberAvatar="https://api.dicebear.com/7.x/bottts/svg?seed=architect"
/>

// 状态指示器
<PresenceIndicator presence={presenceData} />

// 统计信息
<PresenceStats stats={statsData} />
```

#### 特性

- ✅ 状态筛选 (全部/在线/忙碌/离开/离线)
- ✅ 自动排序 (在线优先)
- ✅ 10 秒自动刷新
- ✅ 深色模式支持

---

### Navigation

主导航组件，支持桌面端和移动端。

**文件位置**: `app/components/Navigation.tsx`

```tsx
import { Navigation } from '@/components/Navigation';
```

#### Props

无 props，组件内部使用 Next.js 路由。

#### 导航项配置

```typescript
interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: '首页', icon: '🏠' },
  { href: '/dashboard', label: '实时看板', icon: '📊' },
  { href: '/subagents', label: '子代理', icon: '🤖' },
  { href: '/tasks', label: '任务', icon: '📋' },
  { href: '/memory', label: '记忆', icon: '🧠' },
];
```

#### 使用示例

```tsx
// 在布局中使用
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Navigation />
        <main>{children}</main>
      </body>
    </html>
  );
}
```

#### 特性

- ✅ 响应式设计 (桌面端/移动端)
- ✅ 主题切换按钮
- ✅ 键盘导航 (方向键、Home、End)
- ✅ ESC 关闭移动端菜单
- ✅ 当前页面高亮
- ✅ 无障碍支持 (ARIA 属性)

---

### TaskBoard

GitHub 任务看板组件。

**文件位置**: `app/components/TaskBoard.tsx`

```tsx
import { TaskBoard, TaskCard } from '@/components/TaskBoard';
```

#### Props

##### TaskBoard

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `issues` | `GitHubIssue[]` | 是 | - | GitHub Issues 列表 |

##### TaskCard

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `issue` | `GitHubIssue` | 是 | - | 单个 Issue 数据 |

#### GitHubIssue 类型

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
  labels: Array<{
    name: string;
    color: string;
  }>;
  updated_at: string;
  html_url: string;
}
```

#### 使用示例

```tsx
const issues: GitHubIssue[] = [
  {
    id: 1,
    number: 1,
    title: '修复登录页面样式问题',
    state: 'open',
    user: { login: 'songzuo', avatar_url: '...' },
    assignee: { login: 'ai-agent', avatar_url: '...' },
    labels: [{ name: 'bug', color: 'd73a4a' }],
    updated_at: '2026-03-06T08:00:00Z',
    html_url: 'https://github.com/songzuo/7zi/issues/1'
  }
];

<TaskBoard issues={issues} />
```

#### 特性

- ✅ 状态筛选 (进行中/已完成/全部)
- ✅ 进度条显示
- ✅ 标签展示 (最多 5 个)
- ✅ 指派人头像
- ✅ 时间格式化
- ✅ useMemo 性能优化

---

## 消息组件

### MessageCenter

消息中心主组件，包含对话列表和消息区域。

**文件位置**: `app/components/messages/MessageCenter.tsx`

```tsx
import { MessageCenter } from '@/components/messages/MessageCenter';
```

#### Props

无 props，组件内部使用 `useMessages` hook。

#### 使用示例

```tsx
<MessageCenter />
```

#### 功能

- 对话列表
- 消息发送
- 右键菜单 (置顶/静音/删除)
- 搜索过滤
- 未读计数

---

### ConversationItem

对话列表项组件。

**文件位置**: `app/components/messages/ConversationItem.tsx`

#### Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `conversation` | `Conversation` | 是 | 对话数据 |
| `isActive` | `boolean` | 是 | 是否选中 |
| `onClick` | `() => void` | 是 | 点击回调 |
| `onContextMenu` | `(e: React.MouseEvent) => void` | 否 | 右键菜单回调 |

---

### MessageItem

消息项组件。

**文件位置**: `app/components/messages/MessageItem.tsx`

#### Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `message` | `Message` | 是 | 消息数据 |
| `isOwn` | `boolean` | 是 | 是否为自己发送 |

---

### MessageInput

消息输入框组件。

**文件位置**: `app/components/messages/MessageInput.tsx`

#### Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `onSend` | `(text: string) => void` | 是 | 发送回调 |
| `placeholder` | `string` | 否 | 输入提示 |
| `disabled` | `boolean` | 否 | 禁用状态 |

---

## 通知组件

### NotificationPanel

通知面板组件。

**文件位置**: `app/components/notifications/NotificationPanel.tsx`

```tsx
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
```

#### Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `isOpen` | `boolean` | 是 | - | 面板是否打开 |
| `onClose` | `() => void` | 是 | - | 关闭回调 |

#### 使用示例

```tsx
const [isOpen, setIsOpen] = useState(false);

<NotificationPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
```

#### 功能

- 类型筛选 (info/success/warning/error/task/system)
- 搜索过滤
- 全部已读
- 清空通知
- ESC/点击外部关闭

---

### NotificationBell

通知铃铛图标组件。

**文件位置**: `app/components/notifications/NotificationBell.tsx`

#### Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `count` | `number` | 是 | 未读数量 |
| `onClick` | `() => void` | 是 | 点击回调 |

---

### NotificationItem

通知项组件。

**文件位置**: `app/components/notifications/NotificationItem.tsx`

#### Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `notification` | `Notification` | 是 | 通知数据 |
| `onMarkAsRead` | `(id: string) => void` | 是 | 标记已读回调 |
| `onDismiss` | `(id: string) => void` | 是 | 删除回调 |

---

## 通知类型定义

**文件位置**: `app/components/notifications/types.ts`

```typescript
export type NotificationType = 
  | 'info'      // 普通信息
  | 'success'   // 成功
  | 'warning'   // 警告
  | 'error'     // 错误
  | 'task'      // 任务相关
  | 'system';   // 系统通知

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string | number;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  source?: string;
}

export interface NotificationGroup {
  date: string;
  notifications: Notification[];
}
```

---

## 主题组件

### ThemeProvider

主题提供者组件，提供全应用的主题状态管理。

**文件位置**: `app/components/ThemeProvider.tsx`

```tsx
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
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

#### useTheme Hook

```tsx
const { 
  theme,           // 当前主题设置 ('light' | 'dark' | 'system')
  resolvedTheme,   // 实际应用的主题 ('light' | 'dark')
  isTransitioning, // 是否正在切换 (boolean)
  setTheme,        // 设置主题 (theme: Theme) => void
  toggleTheme      // 切换主题 () => void
} = useTheme();
```

#### 功能特性

- ✅ 三种主题模式 (light/dark/system)
- ✅ localStorage 持久化
- ✅ 跟随系统主题变化（实时监听 prefers-color-scheme）
- ✅ 平滑过渡动画 (300ms)
- ✅ SSR 兼容（避免水合不匹配）

#### 使用示例

```tsx
// 在布局中使用
<ThemeProvider defaultTheme="system">
  <App />
</ThemeProvider>

// 在组件中使用
function MyComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme, isTransitioning } = useTheme();
  
  return (
    <div className={isTransitioning ? 'theme-transitioning' : ''}>
      <p>当前设置: {theme}</p>
      <p>实际主题: {resolvedTheme}</p>
      <button onClick={toggleTheme}>
        {resolvedTheme === 'dark' ? '🌙' : '☀️'}
      </button>
      <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
        <option value="light">浅色</option>
        <option value="dark">深色</option>
        <option value="system">跟随系统</option>
      </select>
    </div>
  );
}
```

---

### ThemeToggle

主题切换按钮组件，支持简单模式和下拉菜单模式。

**文件位置**: `app/components/ThemeToggle.tsx`

```tsx
import { ThemeToggle } from '@/components/ThemeToggle';
```

#### Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `showDropdown` | `boolean` | 否 | `false` | 显示下拉菜单 |
| `enableRipple` | `boolean` | 否 | `true` | 启用涟漪动画 |
| `size` | `'sm' \| 'md' \| 'lg'` | 否 | `'md'` | 按钮尺寸 |

#### 使用示例

```tsx
// 简单按钮模式（点击切换）
<ThemeToggle />

// 下拉菜单模式（选择主题）
<ThemeToggle showDropdown size="lg" />

// 禁用动画
<ThemeToggle enableRipple={false} />

// 不同尺寸
<ThemeToggle size="sm" />
<ThemeToggle size="md" />
<ThemeToggle size="lg" />
```

#### 功能特性

- ✅ 简单按钮切换（点击循环切换 light/dark）
- ✅ 下拉菜单选择（显示三个选项）
- ✅ 涟漪点击动画
- ✅ 键盘导航（方向键/Enter/Escape）
- ✅ 无障碍支持（ARIA 属性）

---

## 导出组件

导出功能通过工具函数实现，支持 PDF、CSV、JSON、Excel 格式。

**文件位置**: `app/lib/export.ts`

```tsx
import {
  // PDF 导出
  exportToPDF,
  exportTasksPDF,
  
  // CSV 导出
  exportMembersCSV,
  exportIssuesCSV,
  exportCommitsCSV,
  exportActivitiesCSV,
  exportTasksCSV,
  downloadCSV,
  
  // JSON 导出
  exportReportJSON,
  exportMembersJSON,
  exportTasksJSON,
  downloadJSON,
  
  // Excel 导出
  exportTasksExcel,
  
  // 批量导出
  exportCompleteReport,
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

### PDF 导出函数

#### exportToPDF

导出团队报告为 PDF 格式。

```tsx
exportToPDF(members, issues, commits, stats);
// 生成文件: ai-team-report-YYYY-MM-DD.pdf
```

#### exportTasksPDF

导出任务报告为 PDF 格式。

```tsx
exportTasksPDF(tasks, taskStats);
// 生成文件: task-report-YYYY-MM-DD.pdf
```

### CSV 导出函数

#### 通用函数

```tsx
// 通用 CSV 下载
downloadCSV(data: Record<string, unknown>[], filename: string): void
```

#### 专用函数

```tsx
// 导出成员
exportMembersCSV(members: AIMember[]): void
// 生成文件: ai-team-members.csv

// 导出 Issues
exportIssuesCSV(issues: GitHubIssue[]): void
// 生成文件: github-issues.csv

// 导出 Commits
exportCommitsCSV(commits: GitHubCommit[]): void
// 生成文件: github-commits.csv

// 导出活动日志
exportActivitiesCSV(activities: ActivityItem[]): void
// 生成文件: activity-log.csv

// 导出任务
exportTasksCSV(tasks: Task[]): void
// 生成文件: tasks.csv
```

### JSON 导出函数

```tsx
// 通用 JSON 下载
downloadJSON(data: unknown, filename: string): void

// 导出完整报告
exportReportJSON(reportData: ReportData): void
// 生成文件: report-YYYY-MM-DD.json

// 导出成员
exportMembersJSON(members: AIMember[]): void

// 导出任务
exportTasksJSON(tasks: Task[]): void
```

### Excel 导出函数

```tsx
// 导出任务为 Excel
exportTasksExcel(tasks: Task[]): void
// 生成文件: tasks.xlsx
```

### 批量导出

```tsx
// 一次性导出完整报告
exportCompleteReport(reportData: ReportData, format: ExportFormat): void

// 示例
exportCompleteReport(reportData, 'json');  // JSON 格式
exportCompleteReport(reportData, 'pdf');   // PDF 格式（会生成两个 PDF）
exportCompleteReport(reportData, 'csv');   // CSV 格式（会生成多个 CSV 文件）
```

### 使用示例

```tsx
import {
  exportToPDF,
  exportTasksPDF,
  exportMembersCSV,
  exportCompleteReport,
} from '@/lib/export';

function ExportButton({ members, issues, commits, tasks, stats, taskStats }) {
  const handleExportPDF = () => {
    // 导出团队报告
    exportToPDF(members, issues, commits, stats);
  };

  const handleExportTasksPDF = () => {
    // 导出任务报告
    exportTasksPDF(tasks, taskStats);
  };

  const handleExportCSV = () => {
    // 导出成员 CSV
    exportMembersCSV(members);
  };

  const handleExportAll = () => {
    // 导出完整报告
    exportCompleteReport({
      members,
      issues,
      commits,
      activities: [],
      tasks,
      stats,
      taskStats,
      generatedAt: new Date(),
    }, 'json');
  };

  return (
    <div className="flex gap-2">
      <button onClick={handleExportPDF}>导出 PDF</button>
      <button onClick={handleExportTasksPDF}>导出任务 PDF</button>
      <button onClick={handleExportCSV}>导出 CSV</button>
      <button onClick={handleExportAll}>导出完整报告</button>
    </div>
  );
}
```

---

## 任务组件

任务系统提供完整的任务管理功能，包括类型定义、API、Hooks 和数据仓库。

### 类型定义

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
  color: string; // Tailwind color class (e.g., 'blue', 'red', 'green')
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
  tags?: string[]; // Tag IDs
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
  completionRate: number; // 0-100
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
export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  high: { label: '高优先级', color: 'red', icon: '🔴' },
  medium: { label: '中优先级', color: 'yellow', icon: '🟡' },
  low: { label: '低优先级', color: 'green', icon: '🟢' },
};

// 状态配置
export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: '待办', color: 'gray' },
  in_progress: { label: '进行中', color: 'blue' },
  review: { label: '评审中', color: 'purple' },
  done: { label: '已完成', color: 'green' },
};
```

---

### useTasks Hook

任务管理 React Hook，提供完整的任务操作功能。

**文件位置**: `app/lib/tasks/useTasks.ts`

```tsx
import { useTasks } from '@/lib/tasks/useTasks';
```

#### 返回值

```typescript
interface UseTasksReturn {
  // ===== 状态 =====
  tasks: Task[];           // 过滤和排序后的任务
  allTasks: Task[];        // 所有任务（未过滤）
  customTags: TaskTag[];   // 自定义标签
  allTags: TaskTag[];      // 所有标签（默认 + 自定义）
  filter: TaskFilter;      // 当前筛选条件
  sortBy: 'priority' | 'dueDate' | 'createdAt'; // 排序方式
  isLoading: boolean;      // 是否正在加载
  error: string | null;    // 错误信息
  stats: TaskStats;        // 任务统计

  // ===== 任务操作 =====
  addTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  batchUpdateStatus: (taskIds: string[], status: TaskStatus) => Promise<void>;

  // ===== 标签操作 =====
  addCustomTag: (tag: Omit<TaskTag, 'id'>) => Promise<TaskTag>;
  deleteCustomTag: (tagId: string) => Promise<void>;

  // ===== 筛选和排序 =====
  updateFilter: (newFilter: Partial<TaskFilter>) => void;
  resetFilter: () => void;
  setSortBy: (sortBy: 'priority' | 'dueDate' | 'createdAt') => void;
  clearError: () => void;

  // ===== 查询 =====
  getTaskById: (taskId: string) => Task | undefined;
  getTasksByTag: (tagId: string) => Task[];
  getTasksByAssignee: (assigneeId: string) => Task[];
}
```

#### 使用示例

```tsx
function TaskManager() {
  const {
    // 状态
    tasks,
    allTags,
    stats,
    isLoading,
    error,
    filter,
    
    // 操作
    addTask,
    updateTask,
    deleteTask,
    batchUpdateStatus,
    updateFilter,
    resetFilter,
    setSortBy,
    
    // 查询
    getTaskById,
  } = useTasks();

  // 创建任务
  const handleCreate = async () => {
    try {
      const newTask = await addTask({
        title: '实现新功能',
        description: '详细描述...',
        priority: 'high',
        status: 'todo',
        tags: [allTags[0]], // 使用第一个标签
      });
      console.log('创建成功:', newTask);
    } catch (err) {
      console.error('创建失败:', err);
    }
  };

  // 更新任务状态
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await updateTask(taskId, { status: newStatus });
  };

  // 筛选任务
  const handleFilterChange = (status: TaskStatus | undefined) => {
    updateFilter({ status });
  };

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      {/* 统计信息 */}
      <div className="stats">
        <span>总数: {stats.total}</span>
        <span>已完成: {stats.done}</span>
        <span>完成率: {stats.completionRate}%</span>
      </div>

      {/* 筛选器 */}
      <div className="filters">
        <select onChange={(e) => handleFilterChange(e.target.value as TaskStatus)}>
          <option value="">全部状态</option>
          <option value="todo">待办</option>
          <option value="in_progress">进行中</option>
          <option value="review">评审中</option>
          <option value="done">已完成</option>
        </select>
        
        <select onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="priority">按优先级</option>
          <option value="dueDate">按截止日期</option>
          <option value="createdAt">按创建时间</option>
        </select>
        
        <button onClick={resetFilter}>重置筛选</button>
      </div>

      {/* 任务列表 */}
      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            <span>{task.title}</span>
            <span>{PRIORITY_CONFIG[task.priority].icon}</span>
            <button onClick={() => handleStatusChange(task.id, 'done')}>
              完成
            </button>
            <button onClick={() => deleteTask(task.id)}>
              删除
            </button>
          </li>
        ))}
      </ul>

      <button onClick={handleCreate}>创建任务</button>
    </div>
  );
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

| 函数 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `fetchTasks(filter?)` | `TaskFilter` | `Promise<Task[]>` | 获取任务列表 |
| `fetchTask(id)` | `string` | `Promise<Task \| null>` | 获取单个任务 |
| `createTaskApi(taskData)` | `Omit<Task, 'id' \| 'createdAt' \| 'updatedAt'>` | `Promise<Task>` | 创建任务 |
| `updateTaskApi(id, updates)` | `string, Partial<Task>` | `Promise<Task>` | 更新任务 |
| `deleteTaskApi(id)` | `string` | `Promise<void>` | 删除任务 |
| `batchUpdateStatusApi(ids, status)` | `string[], TaskStatus` | `Promise<number>` | 批量更新状态 |
| `fetchTaskStats()` | - | `Promise<TaskStats>` | 获取统计信息 |
| `fetchTags(customOnly?)` | `boolean` | `Promise<TaskTag[]>` | 获取标签列表 |
| `createTagApi(tagData)` | `Omit<TaskTag, 'id'>` | `Promise<TaskTag>` | 创建标签 |
| `deleteTagApi(id)` | `string` | `Promise<void>` | 删除标签 |

#### 使用示例

```tsx
import { fetchTasks, createTaskApi, updateTaskApi } from '@/lib/tasks/api';

// 获取所有任务
const tasks = await fetchTasks();

// 获取高优先级任务
const highPriorityTasks = await fetchTasks({ priority: 'high' });

// 创建任务
const newTask = await createTaskApi({
  title: '新任务',
  priority: 'medium',
  status: 'todo',
  tags: [],
});

// 更新任务
const updatedTask = await updateTaskApi(newTask.id, {
  status: 'in_progress',
});
```

---

### 任务数据仓库

**文件位置**: `app/lib/db/tasks.repository.ts`

服务端数据库操作模块，用于 API 路由。

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

## UI 组件

### ThemeProvider

主题提供者组件，提供全应用的主题状态管理。

**文件位置**: `app/components/ThemeProvider.tsx`

```tsx
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
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

#### useTheme Hook

```tsx
const { 
  theme,           // 当前主题设置
  resolvedTheme,   // 实际应用的主题
  isTransitioning, // 是否正在切换
  setTheme,        // 设置主题
  toggleTheme      // 切换主题
} = useTheme();
```

#### 功能特性

- ✅ 三种主题模式 (light/dark/system)
- ✅ localStorage 持久化
- ✅ 跟随系统主题变化
- ✅ 平滑过渡动画 (300ms)
- ✅ SSR 兼容

#### 使用示例

```tsx
// 在布局中使用
<ThemeProvider defaultTheme="system">
  <App />
</ThemeProvider>

// 在组件中使用
function MyComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      当前: {resolvedTheme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
```

---

### ThemeToggle

主题切换按钮组件，支持简单模式和下拉菜单模式。

**文件位置**: `app/components/ThemeToggle.tsx`

```tsx
import { ThemeToggle } from '@/components/ThemeToggle';
```

#### Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `showDropdown` | `boolean` | 否 | `false` | 显示下拉菜单 |
| `enableRipple` | `boolean` | 否 | `true` | 启用涟漪动画 |
| `size` | `'sm' \| 'md' \| 'lg'` | 否 | `'md'` | 按钮尺寸 |

#### 使用示例

```tsx
// 简单按钮模式
<ThemeToggle />

// 下拉菜单模式
<ThemeToggle showDropdown size="lg" />

// 禁用动画
<ThemeToggle enableRipple={false} />
```

#### 功能特性

- ✅ 简单按钮切换
- ✅ 下拉菜单选择
- ✅ 涟漪点击动画
- ✅ 键盘导航 (方向键/Enter/Escape)
- ✅ 无障碍支持

---

### ProgressBar

进度条组件。

**文件位置**: `app/components/ProgressBar.tsx`

```tsx
import { ProgressBar } from '@/components/ProgressBar';
```

#### Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `value` | `number` | 是 | - | 进度值 (0-100) |
| `size` | `'sm' \| 'md' \| 'lg'` | 否 | `'md'` | 尺寸 |
| `color` | `'blue' \| 'green' \| 'yellow' \| 'red'` | 否 | `'blue'` | 颜色 |
| `showPercentage` | `boolean` | 否 | `false` | 显示百分比 |
| `animated` | `boolean` | 否 | `false` | 动画效果 |

---

### Loading / LoadingSpinner

加载状态组件。

**文件位置**: `app/components/Loading.tsx`, `app/components/LoadingSpinner.tsx`

```tsx
import { Loading } from '@/components/Loading';
import { LoadingSpinner } from '@/components/LoadingSpinner';
```

#### Loading Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `text` | `string` | 否 | `'加载中...'` | 加载文本 |

---

### Skeleton

骨架屏组件。

**文件位置**: `app/components/Skeleton.tsx`

```tsx
import { Skeleton } from '@/components/Skeleton';
```

---

### ErrorBoundary

错误边界组件。

**文件位置**: `app/components/ErrorBoundary.tsx`

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';
```

---

### ThemeProvider

主题提供者组件。

**文件位置**: `app/components/ThemeProvider.tsx`

```tsx
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
```

#### useTheme Hook

```tsx
const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
```

---

### ContributionChart

贡献图表组件。

**文件位置**: `app/components/ContributionChart.tsx`

---

### OptimizedImage

优化图片组件。

**文件位置**: `app/components/OptimizedImage.tsx`

---

### TaskComments

任务评论组件，用于显示和管理 GitHub Issue 评论。

**文件位置**: `app/components/TaskComments.tsx`

```tsx
import { TaskComments } from '@/components/TaskComments';
```

#### Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `issueNumber` | `number` | 是 | GitHub Issue 编号 |
| `owner` | `string` | 是 | 仓库所有者用户名 |
| `repo` | `string` | 是 | 仓库名称 |
| `token` | `string` | 否 | GitHub Token (私有仓库或写操作必需) |

#### 类型定义

```typescript
interface TaskCommentsProps {
  issueNumber: number;
  owner: string;
  repo: string;
  token?: string;
}

interface GitHubComment {
  id: number;
  body: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
}
```

#### 使用示例

```tsx
// 基础用法
<TaskComments
  issueNumber={1}
  owner="songzuo"
  repo="7zi"
/>

// 带 Token (支持评论功能)
<TaskComments
  issueNumber={1}
  owner="songzuo"
  repo="7zi"
  token={process.env.GITHUB_TOKEN}
/>
```

#### 功能

- ✅ 加载 Issue 评论列表
- ✅ 添加新评论 (需要 Token)
- ✅ 删除评论 (需要 Token)
- ✅ 错误处理和加载状态
- ✅ 深色模式支持

---

### MemberCard

成员卡片组件。

**文件位置**: `app/components/MemberCard.tsx`

---

## 通用类型

### ActivityItem

```typescript
interface ActivityItem {
  id: string;
  type: 'commit' | 'issue' | 'comment';
  title: string;
  author: string;
  avatar?: string;
  timestamp: string;
  url: string;
}
```

### MemberPresence

```typescript
type MemberStatus = 'online' | 'offline' | 'away' | 'busy';

interface MemberPresence {
  memberId: string;
  status: MemberStatus;
  lastSeen: string;
  currentTask?: string;
  location?: 'workspace' | 'meeting' | 'break' | 'offline';
}
```

---

## 相关链接

- [API 参考文档](./API-REFERENCE.md)
- [开发指南](./DEVELOPMENT.md)
- [架构设计](./ARCHITECTURE.md)

---

## 通知 Toast 组件 (新增)

### NotificationToast

通知 Toast 弹窗组件，支持多种类型和位置配置。

**文件位置**: `app/components/NotificationToast.tsx`

```tsx
import { NotificationToast } from '@/components/NotificationToast';
```

#### Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `position` | `NotificationPosition` | 否 | `'top-right'` | Toast 位置 |
| `maxVisible` | `number` | 否 | `5` | 最大显示数量 |

#### NotificationPosition 类型

```typescript
type NotificationPosition = 
  | 'top-right' 
  | 'top-left' 
  | 'bottom-right' 
  | 'bottom-left' 
  | 'top-center' 
  | 'bottom-center';
```

#### 使用示例

```tsx
// 基础用法
<NotificationToast />

// 自定义位置和数量
<NotificationToast position="bottom-right" maxVisible={3} />
```

#### 功能特性

- ✅ 四种通知类型 (success/error/warning/info)
- ✅ 六种位置配置
- ✅ 自动入场动画
- ✅ 键盘关闭支持 (ESC/Enter)
- ✅ 无障碍支持 (ARIA)
- ✅ 深色模式适配

---

### useNotifications Hook

通知管理 Hook，提供便捷的通知操作方法。

**文件位置**: `app/hooks/useNotifications.ts`

```tsx
import { useNotifications } from '@/hooks/useNotifications';
```

#### 返回值

```typescript
interface UseNotificationsReturn {
  // 基础方法
  push: (options: NotificationOptions) => Notification;
  dismiss: (id: string) => void;
  clearAll: () => void;
  
  // 快捷方法
  success: (title: string, message?: string) => Notification;
  error: (title: string, message?: string) => Notification;
  warning: (title: string, message?: string) => Notification;
  info: (title: string, message?: string) => Notification;
  
  // 当前通知列表
  notifications: Notification[];
}
```

#### 使用示例

```tsx
function MyComponent() {
  const { success, error, warning, info } = useNotifications();
  
  const handleSave = async () => {
    try {
      await saveData();
      success('保存成功', '数据已保存到服务器');
    } catch (e) {
      error('保存失败', '请稍后重试');
    }
  };
  
  return <button onClick={handleSave}>保存</button>;
}
```

#### 功能特性

- ✅ 四种快捷通知方法
- ✅ 完整的类型支持
- ✅ 与 NotificationToast 无缝集成

---

*文档由 7zi Studio AI 团队维护 🤖*
*最后更新: 2026-03-06*
