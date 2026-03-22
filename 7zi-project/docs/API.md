# API 文档

**最后更新**: 2026-03-07  
**版本**: v1.1.0

---

## 目录

1. [自定义 Hooks](#自定义-hooks)
   - [useThemeCustomization](#usethemecustomization)
   - [useUserPreferences](#useuserpreferences)
   - [useBatchOperations](#usebatchoperations)
   - [useWebSocket](#usewebsocket)
   - [useExport](#useexport)
   - [useNotifications](#usenotifications)
   - [useDashboardData](#usedashboarddata)
   - [useRealtimeDashboard](#userealtimedashboard)
   - [useTheme](#usetheme)
   - [useWebVitals](#usewebvitals)
2. [公开组件](#公开组件)
3. [API 端点](#api-端点)

---

## 自定义 Hooks

### useThemeCustomization

主题定制 Hook，支持自定义颜色、间距、圆角、字体等。

**文件位置**: `app/hooks/useThemeCustomization.ts`

#### 签名

```typescript
function useThemeCustomization(): {
  // 状态
  currentTheme: ThemeConfig;
  availableThemes: Record<string, ThemeConfig>;
  presetThemes: Record<string, ThemeConfig>;
  customThemes: Record<string, ThemeConfig>;
  mounted: boolean;

  // 设置方法
  setTheme: (themeId: string) => void;
  customizeColors: (colors: Partial<ThemeColors>) => void;
  customizeSpacing: (spacing: Partial<ThemeSpacing>) => void;
  customizeRadius: (radius: Partial<ThemeRadius>) => void;
  setFontFamily: (fontFamily: string) => void;
  setAnimationSpeed: (speed: number) => void;

  // 自定义主题
  saveAsCustomTheme: (name: string) => string;

  // 重置
  resetTheme: () => void;

  // 导入导出
  exportTheme: () => string;
  importTheme: (json: string) => { success: boolean; error?: string };
}
```

#### 类型定义

```typescript
interface ThemeColors {
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
}

interface ThemeSpacing {
  baseUnit: number;
  componentGap: number;
  cardPadding: number;
  pagePadding: number;
}

interface ThemeRadius {
  button: number;
  card: number;
  input: number;
  modal: number;
}

interface ThemeConfig {
  name: string;
  id: string;
  isDark: boolean;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  fontFamily: string;
  animationSpeed: number;
}
```

#### 预设主题

| 主题 ID | 名称 | 说明 |
|---------|------|------|
| `light-default` | 默认浅色 | 标准浅色主题 |
| `dark-default` | 默认深色 | 标准深色主题 |
| `ocean-blue` | 海洋蓝 | 蓝色系浅色主题 |
| `forest-green` | 森林绿 | 绿色系浅色主题 |
| `violet-dream` | 紫罗兰 | 紫色系浅色主题 |
| `midnight-dark` | 午夜深色 | 深色高对比主题 |
| `high-contrast` | 高对比度 | 无障碍高对比主题 |

---

### useUserPreferences

用户偏好设置 Hook，管理显示、通知、语言、隐私等设置。

**文件位置**: `app/hooks/useUserPreferences.ts`

#### 签名

```typescript
function useUserPreferences(): {
  // 状态
  preferences: UserPreferences;
  mounted: boolean;
  hasChanges: boolean;
  lastSaved: Date | null;

  // 更新方法
  updatePreference: <K extends keyof UserPreferences>(
    category: K,
    updates: Partial<UserPreferences[K]>
  ) => void;
  updateTheme: (theme: UserPreferences['theme']) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;

  // 重置方法
  resetPreferences: () => void;
  resetCategory: <K extends keyof UserPreferences>(category: K) => void;

  // 导入导出
  exportPreferences: () => string;
  importPreferences: (json: string) => { success: boolean; error?: string };

  // 派生值
  hasAnyNotificationsEnabled: boolean;
  is12HourFormat: boolean;
  isCompactLayout: boolean;
  fontSizePx: number;
}
```

#### 类型定义

```typescript
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  display: {
    animations: boolean;
    compactMode: boolean;
    fontSize: 'small' | 'medium' | 'large';
    sidebarExpanded: boolean;
    showAvatars: boolean;
    showStatusIndicators: boolean;
  };
  notifications: {
    enabled: boolean;
    taskUpdates: boolean;
    mentions: boolean;
    system: boolean;
    sounds: boolean;
    duration: number;
  };
  locale: {
    language: string;
    timezone: string;
    dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
    timeFormat: '24h' | '12h';
    weekStartsOn: 0 | 1 | 6;
  };
  privacy: {
    showOnlineStatus: boolean;
    allowAnalytics: boolean;
    publicProfile: boolean;
  };
  advanced: {
    autoSaveInterval: number;
    pageSize: number;
    experimentalFeatures: boolean;
    debugMode: boolean;
  };
}
```

---

### useBatchOperations

批量操作 Hook，支持任务的批量更新、删除、标签管理等。

**文件位置**: `app/hooks/useBatchOperations.ts`

#### 签名

```typescript
function useBatchOperations(options?: BatchOperationOptions): {
  // 状态
  loading: boolean;
  error: string | null;
  lastResult: BatchOperationResult | null;

  // 操作方法
  updateStatus: (ids: string[], status: TaskStatus) => Promise<BatchOperationResult>;
  updatePriority: (ids: string[], priority: TaskPriority) => Promise<BatchOperationResult>;
  assign: (ids: string[], assignee: string | null) => Promise<BatchOperationResult>;
  deleteTasks: (ids: string[]) => Promise<BatchOperationResult>;
  addTags: (ids: string[], tagIds: string[]) => Promise<BatchOperationResult>;
  removeTags: (ids: string[], tagIds: string[]) => Promise<BatchOperationResult>;
  setDueDate: (ids: string[], dueDate: string | null) => Promise<BatchOperationResult>;

  // 通用操作
  executeOperation: (
    ids: string[],
    operation: BatchOperationType,
    payload: unknown
  ) => Promise<BatchOperationResult>;

  // 控制
  reset: () => void;
  cancel: () => void;
}
```

#### 类型定义

```typescript
type BatchOperationType =
  | 'update-status'
  | 'update-priority'
  | 'assign'
  | 'delete'
  | 'add-tags'
  | 'remove-tags'
  | 'set-due-date';

interface BatchOperationResult {
  success: boolean;
  operation: BatchOperationType;
  affected: number;
  ids: string[];
  error?: string;
}

interface BatchOperationOptions {
  onSuccess?: (result: BatchOperationResult) => void;
  onError?: (error: Error) => void;
}
```

---

### useWebSocket

WebSocket Hook，用于实时通信。

**文件位置**: `app/hooks/useWebSocket.ts`

#### 签名

```typescript
function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn

interface UseWebSocketOptions {
  url?: string;
  onMessage?: (data: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  subscribe: (owner: string, repo: string) => void;
  unsubscribe: (owner: string, repo: string) => void;
  send: (data: WebSocketMessage) => void;
  disconnect: () => void;
  connect: () => void;
}

interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp?: string;
  [key: string]: unknown;
}
```

---

### useExport

导出功能 Hook，支持 PDF、CSV、JSON、Excel 格式。

**文件位置**: `app/hooks/useExport.ts`

#### 签名

```typescript
function useExport(): UseExportReturn

interface UseExportReturn {
  // 状态
  loading: boolean;
  error: string | null;
  lastExport: ExportResult | null;

  // 导出方法
  exportTasks: (options: ExportOptions) => Promise<ExportResult>;
  exportTasksAsJSON: (taskIds?: string[]) => Promise<ExportResult>;
  exportTasksAsCSV: (taskIds?: string[]) => Promise<ExportResult>;
  exportTasksAsPDF: (taskIds?: string[]) => Promise<ExportResult>;
  exportTasksAsExcel: (taskIds?: string[]) => Promise<ExportResult>;
  exportStats: () => Promise<ExportResult>;
  exportCustomData: (data: unknown[], format: 'json' | 'csv') => Promise<ExportResult>;

  // 下载方法
  downloadBlob: (blob: Blob, filename: string) => void;

  // 重置
  reset: () => void;
}
```

#### 类型定义

```typescript
type ExportFormat = 'json' | 'csv' | 'pdf' | 'excel';
type ExportType = 'tasks' | 'stats' | 'all' | 'custom';

interface ExportOptions {
  format: ExportFormat;
  type?: ExportType;
  startDate?: string;
  endDate?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignee?: string;
  tags?: string[];
  includeCompleted?: boolean;
  taskIds?: string[];
}

interface ExportResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
}
```

---

### useNotifications

通知管理 Hook。

**文件位置**: `app/hooks/useNotifications.ts`

#### 签名

```typescript
function useNotifications(): UseNotificationsReturn

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

---

### useDashboardData

Dashboard 数据获取 Hook。

**文件位置**: `app/hooks/useDashboardData.ts`

#### 签名

```typescript
function useDashboardData(
  owner: string,
  repo: string,
  token?: string
): {
  issues: GitHubIssue[];
  commits: GitHubCommit[];
  activities: ActivityItem[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}
```

---

### useRealtimeDashboard

实时 Dashboard Hook。

**文件位置**: `app/hooks/useRealtimeDashboard.ts`

#### 签名

```typescript
function useRealtimeDashboard(): {
  data: DashboardData | null;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}
```

---

### useTheme

基础主题管理 Hook。

**文件位置**: `app/hooks/useTheme.ts`

#### 签名

```typescript
function useTheme(): {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
}
```

---

### useWebVitals

性能指标收集 Hook。

**文件位置**: `app/hooks/useWebVitals.ts`

#### 签名

```typescript
function useWebVitals(): {
  metrics: WebVitalsMetrics;
  reportWebVitals: (metric: Metric) => void;
}

interface WebVitalsMetrics {
  CLS: number | null;  // Cumulative Layout Shift
  FCP: number | null;  // First Contentful Paint
  FID: number | null;  // First Input Delay
  LCP: number | null;  // Largest Contentful Paint
  TTFB: number | null; // Time to First Byte
}
```

---

## 公开组件

### UI 组件

| 组件 | 文件 | 说明 |
|------|------|------|
| `LoadingSpinner` | `components/LoadingSpinner.tsx` | 加载动画 |
| `Loading` | `components/Loading.tsx` | 加载状态 |
| `Skeleton` | `components/Skeleton.tsx` | 骨架屏 |
| `ProgressBar` | `components/ProgressBar.tsx` | 进度条 |
| `Rating` | `components/Rating.tsx` | 评分组件 |
| `OptimizedImage` | `components/OptimizedImage.tsx` | 优化图片组件 |

### 布局组件

| 组件 | 文件 | 说明 |
|------|------|------|
| `Navigation` | `components/Navigation.tsx` | 导航栏 |
| `Dashboard` | `components/Dashboard.tsx` | 仪表盘 |
| `ErrorBoundary` | `components/ErrorBoundary.tsx` | 错误边界 |

### 业务组件

| 组件 | 文件 | 说明 |
|------|------|------|
| `TaskBoard` | `components/TaskBoard.tsx` | 任务看板 |
| `MemberCard` | `components/MemberCard.tsx` | 成员卡片 |
| `ActivityLog` | `components/ActivityLog.tsx` | 活动日志 |
| `ContributionChart` | `components/ContributionChart.tsx` | 贡献图表 |
| `RealtimeChart` | `components/RealtimeChart.tsx` | 实时图表 |

### 主题组件

| 组件 | 文件 | 说明 |
|------|------|------|
| `ThemeProvider` | `components/ThemeProvider.tsx` | 主题提供者 |
| `ThemeToggle` | `components/ThemeToggle.tsx` | 主题切换 |
| `ThemeCustomizer` | `components/ThemeCustomizer.tsx` | 主题定制器 |

### 通知组件

| 组件 | 文件 | 说明 |
|------|------|------|
| `NotificationToast` | `components/NotificationToast.tsx` | 通知提示 |

### 批量操作组件

| 组件 | 文件 | 说明 |
|------|------|------|
| `BatchOperationsToolbar` | `components/BatchOperationsToolbar.tsx` | 批量操作工具栏 |

### 协作组件

| 组件 | 文件 | 说明 |
|------|------|------|
| `RealtimeCollaborationPanel` | `components/RealtimeCollaborationPanel.tsx` | 实时协作面板 |
| `FeedbackSystem` | `components/FeedbackSystem.tsx` | 反馈系统 |

### 其他组件

| 组件 | 文件 | 说明 |
|------|------|------|
| `LanguageSwitcher` | `components/LanguageSwitcher.tsx` | 语言切换 |
| `ProfilePage` | `components/ProfilePage.tsx` | 个人资料页 |
| `GlobalErrorHandler` | `components/GlobalErrorHandler.tsx` | 全局错误处理 |

---

## API 端点

### 认证 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 登录 |
| `/api/auth/register` | POST | 注册 |
| `/api/auth/logout` | POST | 登出 |
| `/api/auth/me` | GET | 获取当前用户 |

### 任务 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/tasks` | GET | 获取任务列表 |
| `/api/tasks` | POST | 创建任务 |
| `/api/tasks/[id]` | GET | 获取单个任务 |
| `/api/tasks/[id]` | PUT | 更新任务 |
| `/api/tasks/[id]` | DELETE | 删除任务 |
| `/api/tasks/batch` | POST | 批量操作 |
| `/api/tasks/stats` | GET | 获取统计信息 |

### 标签 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/tags` | GET | 获取标签列表 |
| `/api/tags` | POST | 创建标签 |
| `/api/tags/[id]` | DELETE | 删除标签 |

### 导出 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/export` | GET | 导出数据（查询参数） |
| `/api/export` | POST | 导出数据（请求体） |

### Dashboard API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/dashboard` | GET | 获取 Dashboard 数据 |

### 用户 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/users` | GET | 获取用户列表 |
| `/api/users/[id]` | GET | 获取用户详情 |
| `/api/users/[id]` | PUT | 更新用户信息 |

### 反馈 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/feedback` | GET | 获取反馈列表 |
| `/api/feedback` | POST | 提交反馈 |

### 报告 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/reports` | GET | 获取报告列表 |
| `/api/reports` | POST | 生成报告 |

### 通知 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/notifications` | GET | 获取通知列表 |
| `/api/notifications/[id]/read` | PUT | 标记为已读 |

### 健康检查 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |

---

## 相关文档

- [API 参考](./API-REFERENCE.md) - 详细的 API 文档
- [组件文档](./COMPONENTS.md) - 组件使用指南
- [测试指南](./TESTING.md) - 测试相关文档

---

*文档由 7zi Studio AI 团队维护 🤖*
