# 🧩 组件使用指南

> 7zi Platform 核心组件完整使用说明

最后更新：2026-03-18

---

## 📋 目录

- [概述](#概述)
- [布局组件](#布局组件)
- [Dashboard 组件](#dashboard-组件)
- [任务管理组件](#任务管理组件)
- [表单组件](#表单组件)
- [UI 基础组件](#ui-基础组件)
- [Hooks](#hooks)
- [最佳实践](#最佳实践)

---

## 📖 概述

### 组件分类

7zi Platform 的组件分为以下几类：

| 类别 | 说明 | 位置 |
|------|------|------|
| **布局组件** | 页面结构和导航 | `src/components/` |
| **Dashboard 组件** | 数据展示和可视化 | `src/components/` |
| **任务组件** | 任务管理和操作 | `src/components/` |
| **表单组件** | 用户输入和提交 | `src/components/` |
| **UI 基础组件** | 可复用的 UI 元素 | `src/components/ui/` |
| **工具组件** | 特殊功能实现 | `src/components/` |

### 组件导入约定

```typescript
// 从统一入口导入 (推荐)
import {
  Navigation,
  ThemeToggle,
  TaskBoard,
  // ...
} from '@/components';

// 或直接从文件导入
import Navigation from '@/components/Navigation';
```

---

## 🏗️ 布局组件

### Navigation - 导航栏

#### 功能特性

- 响应式设计
- 支持深色/浅色主题
- 集成主题切换
- 移动端菜单支持

#### 使用示例

```typescript
import { Navigation } from '@/components';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <main>{children}</main>
    </>
  );
}
```

#### Props

```typescript
interface NavigationProps {
  className?: string;  // 自定义类名
}
```

---

### Footer - 页脚

#### 功能特性

- 包含社交链接
- 版权信息
- 多语言支持

#### 使用示例

```typescript
import { Footer } from '@/components';

export default function Page() {
  return (
    <>
      {/* 页面内容 */}
      <Footer />
    </>
  );
}
```

---

### ThemeProvider - 主题提供者

#### 功能特性

- 支持浅色/深色/系统主题
- localStorage 持久化
- 平滑过渡动画

#### 使用示例

```typescript
'use client';

import { ThemeProvider } from '@/components';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </ThemeProvider>
  );
}
```

#### Props

```typescript
interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string;          // 主题属性名，默认 "class"
  defaultTheme?: string;       // 默认主题："light" | "dark" | "system"
  enableSystem?: boolean;      // 是否启用系统主题
  disableTransitionOnChange?: boolean;  // 禁用切换动画
}
```

---

### ThemeToggle - 主题切换按钮

#### 功能特性

- 切换浅色/深色模式
- 显示当前主题图标
- 支持系统主题跟随

#### 使用示例

```typescript
'use client';

import { ThemeToggle } from '@/components';

export default function Header() {
  return (
    <header>
      <h1>7zi Platform</h1>
      <ThemeToggle />
    </header>
  );
}
```

---

### LanguageSwitcher - 语言切换器

#### 功能特性

- 多语言支持
- 自动保存偏好
- 实时切换

#### 使用示例

```typescript
'use client';

import { LanguageSwitcher } from '@/components';

export default function Header() {
  return (
    <header>
      <LanguageSwitcher />
    </header>
  );
}
```

---

### MobileMenu - 移动端菜单

#### 功能特性

- 滑出式菜单
- 触摸友好
- 动画过渡

#### 使用示例

```typescript
'use client';

import { MobileMenu } from '@/components';
import { useState } from 'react';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        菜单
      </button>
      <MobileMenu
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
```

#### Props

```typescript
interface MobileMenuProps {
  isOpen: boolean;      // 是否打开
  onClose: () => void;   // 关闭回调
}
```

---

## 📊 Dashboard 组件

### Dashboard - 主仪表盘

#### 功能特性

- 实时数据展示
- 团队成员状态
- 任务进度追踪
- 活动日志

#### 使用示例

```typescript
'use client';

import { Dashboard } from '@/components';

export default function DashboardPage() {
  return (
    <div className="container">
      <Dashboard />
    </div>
  );
}
```

#### 数据结构

```typescript
interface DashboardData {
  members: TeamMember[];
  tasks: Task[];
  activities: Activity[];
}
```

---

### RealtimeDashboard - 实时仪表盘

#### 功能特性

- WebSocket 实时更新
- 数据缓存优化
- 自动重连

#### 使用示例

```typescript
'use client';

import { RealtimeDashboard } from '@/components';

export default function DashboardPage() {
  return (
    <RealtimeDashboard />
  );
}
```

---

### ProjectDashboard - 项目仪表盘

#### 功能特性

- 项目概览
- 进度统计
- 团队贡献

#### 使用示例

```typescript
'use client';

import { ProjectDashboard } from '@/components';

export default function ProjectPage() {
  return (
    <ProjectDashboard projectId="project-123" />
  );
}
```

---

### ActivityLog - 活动日志

#### 功能特性

- 实时活动记录
- 自动滚动
- 时间戳显示

#### 使用示例

```typescript
'use client';

import { ActivityLog } from '@/components';

export default function ActivityPage() {
  return (
    <ActivityLog activities={activities} />
  );
}
```

#### Props

```typescript
interface ActivityLogProps {
  activities: Activity[];  // 活动列表
  maxItems?: number;        // 最大显示条数
  autoScroll?: boolean;     // 自动滚动
}
```

---

### ContributionChart - 贡献图表

#### 功能特性

- GitHub 风格贡献图
- 热力图展示
- 交互式提示

#### 使用示例

```typescript
'use client';

import { ContributionChart } from '@/components';

export default function ProfilePage() {
  return (
    <ContributionChart
      data={contributionData}
      startDate={new Date('2026-01-01')}
      endDate={new Date('2026-12-31')}
    />
  );
}
```

#### Props

```typescript
interface ContributionChartProps {
  data: ContributionData[];   // 贡献数据
  startDate: Date;            // 开始日期
  endDate: Date;              // 结束日期
  color?: string;            // 颜色主题
}
```

---

### HealthDashboard - 健康监控仪表盘

#### 功能特性

- 系统健康状态
- 性能指标
- 实时更新

#### 使用示例

```typescript
'use client';

import { HealthDashboard } from '@/components';

export default function MonitorPage() {
  return (
    <HealthDashboard />
  );
}
```

---

## ✅ 任务管理组件

### TaskBoard - 任务看板

#### 功能特性

- 看板视图
- 拖拽支持
- 状态过滤
- 批量操作

#### 使用示例

```typescript
'use client';

import { TaskBoard } from '@/components';

export default function TasksPage() {
  return (
    <TaskBoard />
  );
}
```

#### 高级用法

```typescript
'use client';

import { TaskBoard } from '@/components';

export default function TasksPage() {
  return (
    <TaskBoard
      filter={{ status: 'in_progress' }}
      sortBy="priority"
      view="board"  // "board" | "list" | "calendar"
    />
  );
}
```

#### Props

```typescript
interface TaskBoardProps {
  tasks?: Task[];
  filter?: TaskFilter;      // 过滤条件
  sortBy?: string;          // 排序字段
  view?: 'board' | 'list' | 'calendar';  // 视图模式
  onTaskUpdate?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
}
```

---

### TaskBoardSearch - 任务搜索

#### 功能特性

- 实时搜索
- 高级过滤
- 保存搜索

#### 使用示例

```typescript
'use client';

import { TaskBoardSearch } from '@/components';
import { useState } from 'react';

export default function TasksPage() {
  const [searchResults, setSearchResults] = useState([]);

  return (
    <div>
      <TaskBoardSearch onResults={setSearchResults} />
      <TaskBoard tasks={searchResults} />
    </div>
  );
}
```

---

## 📝 表单组件

### ContactForm - 联系表单

#### 功能特性

- 表单验证
- EmailJS 集成
- 加载状态
- 错误处理

#### 使用示例

```typescript
'use client';

import { ContactForm } from '@/components';

export default function ContactPage() {
  return (
    <div className="container">
      <h1>联系我们</h1>
      <ContactForm />
    </div>
  );
}
```

#### Props

```typescript
interface ContactFormProps {
  serviceId?: string;       // EmailJS Service ID
  templateId?: string;      // EmailJS Template ID
  publicKey?: string;      // EmailJS Public Key
  onSuccess?: () => void;   // 成功回调
  onError?: (error: Error) => void;
}
```

---

### EnhancedContactForm - 增强联系表单

#### 功能特性

- 字段验证
- 实时反馈
- 自定义字段

#### 使用示例

```typescript
'use client';

import { EnhancedContactForm } from '@/components';

export default function ContactPage() {
  return (
    <EnhancedContactForm
      fields={['name', 'email', 'subject', 'message']}
    />
  );
}
```

---

## 🎨 UI 基础组件

### Button - 按钮

#### 使用示例

```typescript
'use client';

import { Button } from '@/components/ui/button';

export default function Example() {
  return (
    <div>
      <Button variant="default">默认按钮</Button>
      <Button variant="primary">主要按钮</Button>
      <Button variant="secondary">次要按钮</Button>
      <Button variant="outline">轮廓按钮</Button>
      <Button variant="ghost">幽灵按钮</Button>
      <Button variant="danger">危险按钮</Button>
      <Button disabled>禁用按钮</Button>
      <Button loading>加载中</Button>
    </div>
  );
}
```

#### Props

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}
```

---

### Input - 输入框

#### 使用示例

```typescript
'use client';

import { Input } from '@/components/ui/input';

export default function Example() {
  return (
    <div>
      <Input
        type="text"
        placeholder="请输入内容"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Input
        type="email"
        placeholder="请输入邮箱"
        error="请输入有效的邮箱"
      />
      <Input
        type="password"
        placeholder="请输入密码"
      />
    </div>
  );
}
```

---

### Select - 下拉选择

#### 使用示例

```typescript
'use client';

import { Select } from '@/components/ui/select';

export default function Example() {
  const options = [
    { value: 'option1', label: '选项 1' },
    { value: 'option2', label: '选项 2' },
    { value: 'option3', label: ' 选项 3' },
  ];

  return (
    <Select
      options={options}
      value={selected}
      onChange={setSelected}
      placeholder="请选择"
    />
  );
}
```

---

### Modal - 模态框

#### 使用示例

```typescript
'use client';

import { Modal } from '@/components/ui/modal';
import { useState } from 'react';

export default function Example() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        打开模态框
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="标题"
      >
        <p>模态框内容</p>
      </Modal>
    </>
  );
}
```

#### Props

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}
```

---

### Toast - 通知提示

#### 使用示例

```typescript
'use client';

import { Toast } from '@/components/ui/toast';

export default function Example() {
  const showToast = () => {
    Toast.success('操作成功！');
    // 或
    Toast.error('操作失败！');
    Toast.warning('警告信息');
    Toast.info('提示信息');
  };

  return <Button onClick={showToast}>显示通知</Button>;
}
```

---

### Skeleton - 骨架屏

#### 使用示例

```typescript
'use client';

import { Skeleton } from '@/components/ui/skeleton';

export default function Example() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-4 w-[300px]" />
    </div>
  );
}
```

---

## 🪝 Hooks

### useTheme - 主题管理

#### 功能

管理应用主题状态。

#### 使用示例

```typescript
'use client';

import { useTheme } from '@/hooks';

export default function ThemeComponent() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <p>当前主题: {theme}</p>
      <button onClick={() => setTheme('light')}>浅色</button>
      <button onClick={() => setTheme('dark')}>深色</button>
      <button onClick={() => setTheme('system')}>跟随系统</button>
    </div>
  );
}
```

---

### useDashboardData - Dashboard 数据

#### 功能

获取和管理 Dashboard 数据。

#### 使用示例

```typescript
'use client';

import { useDashboardData } from '@/hooks';

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboardData();

  if (loading) return <div>加载中...</div>;
  if (error) return <div>加载失败</div>;

  return <Dashboard data={data} />;
}
```

---

### useBatchSelection - 批量选择

#### 功能

管理任务批量选择。

#### 使用示例

```typescript
'use client';

import { useBatchSelection } from '@/hooks';
import { Button } from '@/components/ui/button';

export default function TaskList() {
  const {
    selectedItems,
    isSelected,
    toggleSelection,
    clearSelection,
    selectAll
  } = useBatchSelection();

  return (
    <div>
      <Button onClick={selectAll}>全选</Button>
      <Button onClick={clearSelection}>清空</Button>
      {/* 任务列表 */}
    </div>
  );
}
```

---

### useFetch - 通用数据获取

#### 功能

封装的 HTTP 请求 Hook。

#### 使用示例

```typescript
'use client';

import { useFetch } from '@/hooks';

export default function UserList() {
  const { data, loading, error } = useFetch<User[]>('/api/users');

  if (loading) return <Skeleton />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <ul>
      {data?.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

---

### useLocalStorage - 本地存储

#### 功能

同步 localStorage 的 Hook。

#### 使用示例

```typescript
'use client';

import { useLocalStorage } from '@/hooks';

export default function Settings() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">浅色</option>
      <option value="dark">深色</option>
    </select>
  );
}
```

---

### useIntersectionObserver - 滚动监听

#### 功能

监听元素是否进入视口。

#### 使用示例

```typescript
'use client';

import { useIntersectionObserver } from '@/hooks';

export default function LazyImage() {
  const [isVisible, ref] = useIntersectionObserver();

  return (
    <div ref={ref}>
      {isVisible ? (
        <img src="image.jpg" alt="延迟加载" />
      ) : (
        <Skeleton className="h-64 w-full" />
      )}
    </div>
  );
}
```

---

### usePerformance - 性能监控

#### 功能

收集 Web Vitals 性能指标。

#### 使用示例

```typescript
'use client';

import { usePerformance } from '@/hooks';

export default function App() {
  const metrics = usePerformance();

  console.log('性能指标:', metrics);

  return <>{/* 应用内容 */}</>;
}
```

---

## 🎯 最佳实践

### 1. 组件组合

优先组合小型组件而不是创建大型组件：

```typescript
// ✅ 好
<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
  </CardHeader>
  <CardContent>内容</CardContent>
  <CardFooter>
    <Button>操作</Button>
  </CardFooter>
</Card>

// ❌ 不好
<BigCardWithEverythingInside />
```

### 2. Props 命名

使用描述性的名称：

```typescript
// ✅ 好
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  onClick?: () => void;
}

// ❌ 不好
interface ButtonProps {
  v?: string;
  s?: string;
  l?: boolean;
  o?: () => void;
}
```

### 3. 错误处理

使用 ErrorBoundary 捕获组件错误：

```typescript
'use client';

import { ErrorBoundary } from '@/components';

export default function Page() {
  return (
    <ErrorBoundary fallback={<ErrorDisplay />}>
      <SomeComponent />
    </ErrorBoundary>
  );
}
```

### 4. 加载状态

使用 Skeleton 而不是简单的加载文字：

```typescript
'use client';

import { useFetch } from '@/hooks';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserList() {
  const { data, loading } = useFetch('/api/users');

  return (
    <div>
      {loading ? (
        <>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </>
      ) : (
        <ul>
          {data?.map(user => <li key={user.id}>{user.name}</li>)}
        </ul>
      )}
    </div>
  );
}
```

### 5. 性能优化

使用 React.memo 和 useMemo：

```typescript
'use client';

import { memo } from 'react';

const ExpensiveComponent = memo(function ExpensiveComponent({
  data
}: { data: SomeData }) {
  // 计算密集型操作
  return <div>{/* 渲染内容 */}</div>;
});
```

### 6. 类型安全

始终使用 TypeScript 类型：

```typescript
// ✅ 好
interface User {
  id: string;
  name: string;
  email: string;
}

function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>;
}

// ❌ 不好
function UserCard({ user }: { user: any }) {
  return <div>{user.name}</div>;
}
```

---

## 📚 更多资源

- [API 文档](./API-REFERENCE.md)
- [架构设计](./ARCHITECTURE.md)
- [开发指南](./DEVELOPMENT.md)
- [测试指南](./TESTING.md)

---

**Made with ❤️ by 7zi AI Team**
