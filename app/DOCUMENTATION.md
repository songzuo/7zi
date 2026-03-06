# AI Team Dashboard - 文档

![TypeDoc](https://img.shields.io/badge/TypeDoc-API%20Docs-blue)
![Storybook](https://img.shields.io/badge/Storybook-Component%20Stories-ff4785)
![License](https://img.shields.io/badge/license-MIT-green)

## 📚 文档资源

本项目包含多种文档，满足不同需求：

### 1. API 文档 (TypeDoc)

自动生成的 TypeScript API 文档，包含所有类型、接口、函数和类的详细说明。

```bash
# 生成 API 文档
npm run docs:api

# 生成并监听变化
npm run docs:api:watch

# 清理文档
npm run docs:clean
```

生成的文档位于 `docs/api/` 目录。

**在线访问**: 部署后可通过 `/docs/api/` 路径访问。

### 2. 组件库 (Storybook)

交互式组件开发和测试环境，展示所有 UI 组件及其状态。

```bash
# 启动 Storybook
npm run storybook

# 构建 Storybook 静态文件
npm run build-storybook
```

**功能**:
- 🎨 组件可视化展示
- 📝 自动生成文档
- 🎛️ 交互式控制面板
- ♿ 可访问性测试
- 🌙 深色模式支持

**组件列表**:
- `LoadingSpinner` - 加载动画
- `MemberCard` - AI 团队成员卡片
- `ProgressBar` - 进度条
- `TaskBoard` - 任务看板
- `ActivityLog` - 活动日志
- `BatchOperationsToolbar` - 批量操作工具栏 ⭐
- `NotificationToast` - 通知提示 ⭐
- `ThemeCustomizer` - 主题定制器 ⭐
- `RealtimeCollaborationPanel` - 实时协作面板 ⭐

### 3. README

项目基本说明和使用指南。见 [README.md](./README.md)。

### 4. 贡献指南

开发规范和贡献流程。见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 开发命令

```bash
# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 代码检查
npm run lint

# 类型检查
npm run type-check

# 格式化代码
npm run format
```

---

## 📁 项目结构

```
app/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── page.tsx           # 首页
│   └── layout.tsx         # 根布局
├── components/            # React 组件
│   ├── Dashboard.tsx
│   ├── MemberCard.tsx
│   ├── ProgressBar.tsx
│   ├── BatchOperationsToolbar.tsx  ⭐
│   ├── NotificationToast.tsx       ⭐
│   ├── ThemeCustomizer.tsx         ⭐
│   └── ...
├── lib/                   # 核心库
│   ├── db/               # 数据库
│   ├── tasks/            # 任务管理
│   ├── realtime/         # 实时通信 ⭐
│   └── export.ts         # 导出功能
├── hooks/                 # React Hooks ⭐
│   ├── useThemeCustomization.ts  ⭐
│   ├── useUserPreferences.ts     ⭐
│   ├── useBatchOperations.ts     ⭐
│   ├── useWebSocket.ts           ⭐
│   ├── useExport.ts              ⭐
│   └── useNotifications.ts       ⭐
├── types/                 # TypeScript 类型定义
├── stories/               # Storybook 组件故事
├── __tests__/            # 测试文件
└── docs/                  # 文档输出目录
    └── api/              # TypeDoc API 文档
```

---

## 🪝 Hooks 使用指南

### useThemeCustomization

主题定制 Hook，支持自定义颜色、间距、圆角、字体等。

```typescript
import { useThemeCustomization } from '@/hooks/useThemeCustomization';

function ThemeCustomizer() {
  const {
    currentTheme,
    availableThemes,
    setTheme,
    customizeColors,
    customizeSpacing,
    customizeRadius,
    setFontFamily,
    setAnimationSpeed,
    saveAsCustomTheme,
    resetTheme,
    exportTheme,
    importTheme,
  } = useThemeCustomization();

  // 切换预设主题
  const handleThemeChange = (themeId: string) => {
    setTheme(themeId);
  };

  // 自定义颜色
  const handleColorChange = (color: string) => {
    customizeColors({ primary: color });
  };

  // 自定义间距
  const handleSpacingChange = (spacing: number) => {
    customizeSpacing({ baseUnit: spacing });
  };

  // 保存为自定义主题
  const handleSave = () => {
    const id = saveAsCustomTheme('我的主题');
    console.log('保存成功:', id);
  };

  // 导出主题
  const handleExport = () => {
    const json = exportTheme();
    // 保存到文件或分享
  };

  return (
    <div>
      <h2>当前主题: {currentTheme.name}</h2>
      
      {/* 预设主题选择 */}
      <select onChange={(e) => handleThemeChange(e.target.value)}>
        {Object.values(availableThemes).map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.name}
          </option>
        ))}
      </select>
      
      {/* 颜色选择器 */}
      <input
        type="color"
        value={currentTheme.colors.primary}
        onChange={(e) => handleColorChange(e.target.value)}
      />
      
      {/* 重置 */}
      <button onClick={resetTheme}>重置</button>
    </div>
  );
}
```

**预设主题**:
- `light-default` - 默认浅色
- `dark-default` - 默认深色
- `ocean-blue` - 海洋蓝
- `forest-green` - 森林绿
- `violet-dream` - 紫罗兰
- `midnight-dark` - 午夜深色
- `high-contrast` - 高对比度

---

### useUserPreferences

用户偏好设置 Hook，管理显示、通知、语言、隐私等设置。

```typescript
import { useUserPreferences } from '@/hooks/useUserPreferences';

function PreferencesPage() {
  const {
    preferences,
    updatePreference,
    updateTheme,
    resetPreferences,
    exportPreferences,
    importPreferences,
    hasAnyNotificationsEnabled,
    is12HourFormat,
    isCompactLayout,
    fontSizePx,
  } = useUserPreferences();

  // 更新显示设置
  const handleDisplayChange = () => {
    updatePreference('display', {
      animations: true,
      compactMode: false,
      fontSize: 'medium',
      sidebarExpanded: true,
    });
  };

  // 更新通知设置
  const handleNotificationChange = () => {
    updatePreference('notifications', {
      enabled: true,
      taskUpdates: true,
      sounds: false,
      duration: 5,
    });
  };

  // 更新语言设置
  const handleLocaleChange = () => {
    updatePreference('locale', {
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
    });
  };

  return (
    <div>
      <h2>显示设置</h2>
      <Switch
        checked={preferences.display.animations}
        onChange={(v) => updatePreference('display', { animations: v })}
      />
      
      <h2>通知设置</h2>
      <Switch
        checked={preferences.notifications.enabled}
        onChange={(v) => updatePreference('notifications', { enabled: v })}
      />
      
      <h2>主题</h2>
      <select
        value={preferences.theme}
        onChange={(e) => updateTheme(e.target.value as any)}
      >
        <option value="light">浅色</option>
        <option value="dark">深色</option>
        <option value="system">跟随系统</option>
      </select>
      
      <button onClick={resetPreferences}>重置所有设置</button>
    </div>
  );
}
```

**偏好设置类型**:

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

```typescript
import { useBatchOperations } from '@/hooks/useBatchOperations';

function BatchOperationsDemo() {
  const {
    loading,
    error,
    lastResult,
    updateStatus,
    updatePriority,
    assign,
    deleteTasks,
    addTags,
    removeTags,
    setDueDate,
    cancel,
    reset,
  } = useBatchOperations({
    onSuccess: (result) => {
      console.log('操作成功:', result);
    },
    onError: (error) => {
      console.error('操作失败:', error);
    },
  });

  const selectedTaskIds = ['task-1', 'task-2', 'task-3'];

  // 批量更新状态
  const handleStatusUpdate = async () => {
    const result = await updateStatus(selectedTaskIds, 'done');
    console.log('影响数量:', result.affected);
  };

  // 批量更新优先级
  const handlePriorityUpdate = async () => {
    await updatePriority(selectedTaskIds, 'high');
  };

  // 批量分配
  const handleAssign = async () => {
    await assign(selectedTaskIds, 'ai-agent-1');
  };

  // 批量删除
  const handleDelete = async () => {
    await deleteTasks(selectedTaskIds);
  };

  // 批量添加标签
  const handleAddTags = async () => {
    await addTags(selectedTaskIds, ['tag-1', 'tag-2']);
  };

  // 批量设置截止日期
  const handleSetDueDate = async () => {
    await setDueDate(selectedTaskIds, '2026-03-15');
  };

  // 取消操作
  const handleCancel = () => {
    cancel();
  };

  return (
    <div>
      <button onClick={handleStatusUpdate} disabled={loading}>
        {loading ? '处理中...' : '标记完成'}
      </button>
      
      {error && <div className="error">{error}</div>}
      
      {lastResult && (
        <div>
          操作结果: {lastResult.success ? '成功' : '失败'}
          影响: {lastResult.affected} 个任务
        </div>
      )}
    </div>
  );
}
```

**支持的操作类型**:
- `update-status` - 更新状态
- `update-priority` - 更新优先级
- `assign` - 分配任务
- `delete` - 删除任务
- `add-tags` - 添加标签
- `remove-tags` - 移除标签
- `set-due-date` - 设置截止日期

---

### useWebSocket

WebSocket Hook，用于实时通信。

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

function RealtimeComponent() {
  const {
    isConnected,
    lastMessage,
    subscribe,
    unsubscribe,
    send,
    disconnect,
    connect,
  } = useWebSocket({
    url: 'wss://api.example.com/ws',
    onMessage: (data) => {
      console.log('收到消息:', data);
    },
    onOpen: () => {
      console.log('连接已建立');
    },
    onClose: () => {
      console.log('连接已断开');
    },
    onError: (error) => {
      console.error('连接错误:', error);
    },
    reconnect: true,
    reconnectInterval: 3000,
  });

  // 订阅仓库更新
  const handleSubscribe = () => {
    subscribe('songzuo', '7zi');
  };

  // 取消订阅
  const handleUnsubscribe = () => {
    unsubscribe('songzuo', '7zi');
  };

  // 发送消息
  const handleSend = () => {
    send({
      type: 'ping',
      payload: { timestamp: Date.now() },
    });
  };

  return (
    <div>
      <div>连接状态: {isConnected ? '已连接' : '未连接'}</div>
      
      {lastMessage && (
        <div>
          最新消息: {JSON.stringify(lastMessage)}
        </div>
      )}
      
      <button onClick={handleSubscribe}>订阅更新</button>
      <button onClick={handleUnsubscribe}>取消订阅</button>
      <button onClick={handleSend}>发送消息</button>
    </div>
  );
}
```

---

### useExport

导出功能 Hook，支持 PDF、CSV、JSON、Excel 格式。

```typescript
import { useExport } from '@/hooks/useExport';

function ExportDemo() {
  const {
    loading,
    error,
    lastExport,
    exportTasksAsJSON,
    exportTasksAsCSV,
    exportTasksAsPDF,
    exportTasksAsExcel,
    exportStats,
    exportCustomData,
    downloadBlob,
    reset,
  } = useExport();

  const taskIds = ['task-1', 'task-2', 'task-3'];

  // 导出为 JSON
  const handleJSONExport = async () => {
    const result = await exportTasksAsJSON(taskIds);
    if (result.success) {
      console.log('导出成功:', result.filename);
    }
  };

  // 导出为 CSV
  const handleCSVExport = async () => {
    await exportTasksAsCSV(taskIds);
  };

  // 导出为 PDF
  const handlePDFExport = async () => {
    await exportTasksAsPDF(taskIds);
  };

  // 导出为 Excel
  const handleExcelExport = async () => {
    await exportTasksAsExcel(taskIds);
  };

  // 导出统计信息
  const handleStatsExport = async () => {
    await exportStats();
  };

  // 导出自定义数据
  const handleCustomExport = async () => {
    const data = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ];
    await exportCustomData(data, 'json');
  };

  return (
    <div>
      <button onClick={handleJSONExport} disabled={loading}>
        导出 JSON
      </button>
      <button onClick={handleCSVExport} disabled={loading}>
        导出 CSV
      </button>
      <button onClick={handlePDFExport} disabled={loading}>
        导出 PDF
      </button>
      <button onClick={handleExcelExport} disabled={loading}>
        导出 Excel
      </button>
      
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

---

### useNotifications

通知管理 Hook。

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function NotificationsDemo() {
  const {
    notifications,
    push,
    success,
    error,
    warning,
    info,
    dismiss,
    clearAll,
  } = useNotifications();

  // 快捷方法
  const handleSuccess = () => {
    success('操作成功', '数据已保存');
  };

  const handleError = () => {
    error('操作失败', '请稍后重试');
  };

  const handleWarning = () => {
    warning('注意', '数据可能不完整');
  };

  const handleInfo = () => {
    info('提示', '新功能已上线');
  };

  // 自定义通知
  const handleCustom = () => {
    push({
      type: 'success',
      title: '自定义通知',
      message: '这是一条自定义通知',
      duration: 5000,
      position: 'top-right',
    });
  };

  return (
    <div>
      <button onClick={handleSuccess}>成功通知</button>
      <button onClick={handleError}>错误通知</button>
      <button onClick={handleWarning}>警告通知</button>
      <button onClick={handleInfo}>信息通知</button>
      
      <button onClick={clearAll}>清除所有</button>
      
      <ul>
        {notifications.map((n) => (
          <li key={n.id}>
            {n.title}: {n.message}
            <button onClick={() => dismiss(n.id)}>关闭</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🔌 WebSocket 实时功能

项目使用 Socket.IO 实现实时通信功能。

### 服务端配置

```typescript
// lib/realtime/server.ts
import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('客户端连接:', socket.id);

  // 订阅仓库
  socket.on('subscribe', (owner, repo) => {
    socket.join(`${owner}/${repo}`);
  });

  // 取消订阅
  socket.on('unsubscribe', (owner, repo) => {
    socket.leave(`${owner}/${repo}`);
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log('客户端断开:', socket.id);
  });
});
```

### 客户端使用

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

function RealtimeDashboard() {
  const { isConnected, lastMessage, subscribe } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL,
    onMessage: (data) => {
      // 处理实时更新
      if (data.type === 'task_update') {
        // 更新任务状态
      }
    },
  });

  useEffect(() => {
    if (isConnected) {
      subscribe('songzuo', '7zi');
    }
  }, [isConnected]);

  return <div>{/* Dashboard 内容 */}</div>;
}
```

### 消息类型

```typescript
interface WebSocketMessage {
  type: 'task_update' | 'issue_update' | 'commit_update' | 'notification';
  payload: unknown;
  timestamp: string;
}
```

---

## 📦 API 缓存机制

项目实现了智能缓存机制，提升 API 请求性能。

### 缓存策略

```typescript
// lib/query/cache.ts
interface CacheConfig {
  ttl: number; // 缓存时间（毫秒）
  staleWhileRevalidate: boolean; // 后台更新
}

const DEFAULT_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5分钟
  staleWhileRevalidate: true,
};

export class APICache {
  private cache = new Map<string, { data: unknown; expiry: number }>();

  async fetch<T>(key: string, fetcher: () => Promise<T>, config = DEFAULT_CONFIG): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() < cached.expiry) {
      // 返回缓存数据
      if (config.staleWhileRevalidate) {
        // 后台更新
        fetcher().then((data) => this.set(key, data, config.ttl));
      }
      return cached.data as T;
    }

    // 获取新数据
    const data = await fetcher();
    this.set(key, data, config.ttl);
    return data;
  }

  private set(key: string, data: unknown, ttl: number) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}
```

### 使用示例

```typescript
import { apiCache } from '@/lib/query/cache';

// 带缓存的数据获取
const tasks = await apiCache.fetch(
  'tasks:all',
  () => fetchTasks({}),
  { ttl: 60 * 1000 } // 1分钟缓存
);

// 失效缓存
apiCache.invalidate('tasks:all');

// 清除所有缓存
apiCache.clear();
```

---

## 🧩 核心模块

### 任务管理 (`lib/tasks`)

```typescript
import { Task, TaskFilter, TaskStatus } from '@/lib/tasks/types';
import { fetchTasks, createTaskApi, updateTaskApi } from '@/lib/tasks/api';

// 获取任务列表
const tasks = await fetchTasks({ status: 'in_progress' });

// 创建任务
const newTask = await createTaskApi({
  title: '新任务',
  priority: 'high',
  status: 'todo',
  tags: [{ id: 'feature', name: 'Feature', color: 'blue' }],
});

// 更新任务状态
await updateTaskApi(taskId, { status: 'done' });
```

### 数据库 (`lib/db`)

使用 SQLite (better-sqlite3) 进行数据持久化。

```typescript
import { db } from '@/lib/db';
import { tasksRepository, tagsRepository } from '@/lib/db';

// 查询任务
const tasks = tasksRepository.findAll();

// 创建任务
const task = tasksRepository.create({
  title: '新任务',
  priority: 'high',
  // ...
});
```

---

## 📝 开发规范

### 命名规范

- **组件**: PascalCase (如 `MemberCard.tsx`)
- **文件**: camelCase (如 `useDashboardData.ts`)
- **常量**: SCREAMING_SNAKE_CASE (如 `DEFAULT_TAGS`)
- **类型/接口**: PascalCase (如 `TaskFilter`)

### 代码风格

项目使用 Prettier + ESLint 进行代码规范：

```bash
# 格式化代码
npm run format

# 检查格式
npm run format:check

# 修复 lint 问题
npm run lint:fix
```

### 提交规范

使用 Conventional Commits：

```
feat: 添加新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构
test: 测试
chore: 构建/工具
```

---

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Storybook 文档](https://storybook.js.org/docs)
- [TypeDoc 文档](https://typedoc.org/)

---

## 📄 License

MIT License - 详见 [LICENSE](./LICENSE) 文件。