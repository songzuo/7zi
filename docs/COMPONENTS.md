# 7zi 组件库文档

> 可复用组件完整文档

**版本**: 1.0.0  
**更新日期**: 2026-03-08

---

## 📋 目录

- [组件概览](#组件概览)
- [基础组件](#基础组件)
- [业务组件](#业务组件)
- [布局组件](#布局组件)
- [使用指南](#使用指南)

---

## 组件概览

### 组件分类

| 类别 | 路径 | 说明 |
|------|------|------|
| 基础组件 | `src/components/shared/` | 按钮、输入框、卡片等 |
| 业务组件 | `src/components/*/` | 任务、Dashboard、Portfolio 等 |
| 布局组件 | `src/components/shared/Layout*` | 导航、页脚、侧边栏 |
| 图表组件 | `src/components/charts/` | 数据可视化 |
| 3D 组件 | `src/components/home/` | Three.js 3D 效果 |

---

## 基础组件

### Button (按钮)

**路径**: `src/components/shared/Button.tsx`

```tsx
import { Button } from '@/components/shared/Button';

// 基础用法
<Button>点击我</Button>

// 变体
<Button variant="primary">主要按钮</Button>
<Button variant="secondary">次要按钮</Button>
<Button variant="outline">边框按钮</Button>
<Button variant="ghost">幽灵按钮</Button>

// 尺寸
<Button size="sm">小</Button>
<Button size="md">中</Button>
<Button size="lg">大</Button>

// 状态
<Button disabled>禁用</Button>
<Button loading>加载中</Button>
```

**Props**:

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `variant` | `primary \| secondary \| outline \| ghost` | `primary` | 按钮样式 |
| `size` | `sm \| md \| lg` | `md` | 按钮尺寸 |
| `disabled` | `boolean` | `false` | 禁用状态 |
| `loading` | `boolean` | `false` | 加载状态 |
| `onClick` | `() => void` | - | 点击事件 |
| `className` | `string` | - | 自定义类名 |

---

### Card (卡片)

**路径**: `src/components/shared/Card.tsx`

```tsx
import { Card, CardHeader, CardContent, CardFooter } from '@/components/shared/Card';

<Card>
  <CardHeader>
    <h3>卡片标题</h3>
  </CardHeader>
  <CardContent>
    <p>卡片内容</p>
  </CardContent>
  <CardFooter>
    <Button>操作</Button>
  </CardFooter>
</Card>
```

---

### Input (输入框)

**路径**: `src/components/shared/Input.tsx`

```tsx
import { Input } from '@/components/shared/Input';

<Input
  type="text"
  placeholder="请输入..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
  error={errorMessage}
  disabled={isDisabled}
/>
```

**Props**:

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | `string` | `text` | 输入类型 |
| `value` | `string` | - | 输入值 |
| `onChange` | `(e) => void` | - | 变化事件 |
| `placeholder` | `string` | - | 占位符 |
| `error` | `string` | - | 错误信息 |
| `disabled` | `boolean` | `false` | 禁用状态 |

---

## 业务组件

### TaskCard (任务卡片)

**路径**: `src/components/tasks/TaskCard.tsx`

```tsx
import { TaskCard } from '@/components/tasks/TaskCard';

<TaskCard
  task={{
    id: 'task-001',
    title: '完成 API 文档',
    description: '编写完整的 API 参考文档',
    type: 'development',
    priority: 'high',
    status: 'in_progress',
    assignee: 'architect',
  }}
  onStatusChange={(newStatus) => handleUpdate(task.id, newStatus)}
  onAssigneeChange={(assignee) => handleAssign(task.id, assignee)}
/>
```

**Props**:

| 属性 | 类型 | 说明 |
|------|------|------|
| `task` | `Task` | 任务对象 |
| `onStatusChange` | `(status) => void` | 状态变更回调 |
| `onAssigneeChange` | `(assignee) => void` | 分配者变更回调 |

---

### TaskBoard (任务看板)

**路径**: `src/components/tasks/TaskBoard.tsx`

```tsx
import { TaskBoard } from '@/components/tasks/TaskBoard';

<TaskBoard
  tasks={tasks}
  filter={{ status: 'in_progress' }}
  onTaskUpdate={handleTaskUpdate}
/>
```

---

### Dashboard (仪表盘)

**路径**: `src/components/dashboard/Dashboard.tsx`

```tsx
import { Dashboard } from '@/components/dashboard/Dashboard';

<Dashboard
  stats={{
    totalTasks: 50,
    completedTasks: 35,
    inProgressTasks: 10,
    activeAgents: 8,
  }}
  recentTasks={recentTasks}
  agentStatus={agentStatus}
/>
```

---

### PortfolioCard (项目卡片)

**路径**: `src/components/portfolio/PortfolioCard.tsx`

```tsx
import { PortfolioCard } from '@/components/portfolio/PortfolioCard';

<PortfolioCard
  project={{
    id: 'proj-001',
    title: 'AI 团队管理平台',
    description: '11 位 AI 成员自主工作的创新平台',
    image: '/images/portfolio/7zi.png',
    tags: ['Next.js', 'AI', 'TypeScript'],
    status: 'completed',
    url: 'https://7zi.com',
  }}
/>
```

---

### KnowledgeLattice (知识晶格)

**路径**: `src/components/knowledge-lattice/KnowledgeLattice.tsx`

```tsx
import { KnowledgeLattice } from '@/components/knowledge-lattice/KnowledgeLattice';

<KnowledgeLattice
  nodes={nodes}
  edges={edges}
  onNodeClick={handleNodeClick}
  onEdgeClick={handleEdgeClick}
/>
```

---

## 布局组件

### Navbar (导航栏)

**路径**: `src/components/shared/Navbar.tsx`

```tsx
import { Navbar } from '@/components/shared/Navbar';

<Navbar
  links={[
    { href: '/', label: '首页' },
    { href: '/tasks', label: '任务' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/portfolio', label: '项目' },
    { href: '/about', label: '关于' },
  ]}
  user={currentUser}
  onLogout={handleLogout}
/>
```

---

### Footer (页脚)

**路径**: `src/components/shared/Footer.tsx`

```tsx
import { Footer } from '@/components/shared/Footer';

<Footer
  links={[
    { href: '/privacy', label: '隐私政策' },
    { href: '/terms', label: '服务条款' },
    { href: '/contact', label: '联系我们' },
  ]}
  socialLinks={[
    { platform: 'github', url: 'https://github.com/songzuo/7zi' },
    { platform: 'twitter', url: 'https://twitter.com/7zi' },
  ]}
/>
```

---

## 图表组件

### TaskChart (任务图表)

**路径**: `src/components/charts/TaskChart.tsx`

```tsx
import { TaskChart } from '@/components/charts/TaskChart';

<TaskChart
  data={taskData}
  type="bar"
  title="任务完成情况"
  xAxis="date"
  yAxis="count"
/>
```

---

### AgentActivityChart (代理活动图表)

**路径**: `src/components/charts/AgentActivityChart.tsx`

```tsx
import { AgentActivityChart } from '@/components/charts/AgentActivityChart';

<AgentActivityChart
  agents={agentData}
  period="7d"
/>
```

---

## 使用指南

### 导入组件

```tsx
// 单个导入
import { Button } from '@/components/shared/Button';

// 批量导入
import { Button, Card, Input } from '@/components/shared';

// 业务组件
import { TaskCard } from '@/components/tasks';
import { Dashboard } from '@/components/dashboard';
```

### 样式定制

```tsx
// 使用 className
<Button className="custom-class">按钮</Button>

// 使用 style
<Card style={{ backgroundColor: '#f0f0f0' }}>卡片</Card>

// 组合使用
<Input
  className="w-full"
  style={{ borderColor: '#0070f3' }}
  error={error}
/>
```

### 响应式设计

所有组件都支持响应式：

```tsx
// 移动端优先
<div className="flex flex-col md:flex-row">
  <Card className="w-full md:w-1/2">内容</Card>
  <Card className="w-full md:w-1/2">内容</Card>
</div>
```

---

## 最佳实践

### 1. 组件复用

```tsx
// ✅ 好的做法：复用现有组件
import { TaskCard } from '@/components/tasks';

// ❌ 避免：重复造轮子
function MyTaskCard() { ... }
```

### 2. Props 类型定义

```tsx
// ✅ 使用 TypeScript 接口
interface TaskCardProps {
  task: Task;
  onStatusChange: (status: TaskStatus) => void;
}

export function TaskCard({ task, onStatusChange }: TaskCardProps) {
  // ...
}
```

### 3. 错误边界

```tsx
import { ErrorBoundary } from '@/lib/errors';

<ErrorBoundary fallback={<ErrorFallback />}>
  <TaskCard task={task} />
</ErrorBoundary>
```

---

## 测试组件

### 单元测试

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/shared/Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>点击</Button>);
    expect(screen.getByText('点击')).toBeInTheDocument();
  });

  it('handles click', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>点击</Button>);
    screen.getByText('点击').click();
    expect(handleClick).toHaveBeenCalled();
  });
});
```

---

*组件文档由设计师子代理维护*
