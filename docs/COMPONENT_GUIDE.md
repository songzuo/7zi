# 组件开发规范

**版本**: v1.4.0  
**最后更新**: 2026-03-29  
**适用对象**: 所有开发者

---

## 📋 目录

1. [组件命名规范](#组件命名规范)
2. [组件结构](#组件结构)
3. [Props 规范](#props-规范)
4. [状态管理](#状态管理)
5. [事件处理](#事件处理)
6. [样式规范](#样式规范)
7. [国际化](#国际化)
8. [测试规范](#测试规范)
9. [性能优化](#性能优化)
10. [最佳实践](#最佳实践)

---

## 组件命名规范

### 文件命名

**基础规则**:
- 使用 **PascalCase** 命名组件文件
- 文件名与组件名一致
- 一个文件一个组件（复杂组件除外）

**示例**:
```
✅ 正确
TaskCard.tsx
UserProfile.tsx
AgentStatusPanel.tsx

❌ 错误
task-card.tsx
user_profile.tsx
agent-status-panel.tsx
```

**组件文件夹结构**:
```
TaskCard/
├── TaskCard.tsx          # 主组件
├── TaskCard.test.tsx     # 测试文件
├── TaskCard.module.css   # 样式文件（可选）
├── TaskCardSkeleton.tsx  # 加载骨架
└── index.ts              # 导出文件
```

### 组件命名

**命名模式**:
```tsx
// ✅ 功能性命名
TaskCard
UserProfile
AgentStatusPanel

// ✅ 状态描述命名
LoadingSpinner
ErrorBoundary
EmptyState

// ❌ 过于通用的命名
Card
Component
Item
```

**Props 接口命名**:
```tsx
// ✅ 使用 Props 后缀
interface TaskCardProps {
  task: Task;
  onEdit: (taskId: string) => void;
}

// ❌ 避免使用 I 前缀
interface ITaskCard { ... }
```

**事件处理函数命名**:
```tsx
// ✅ 使用 on 前缀 + 动作
onClick
onSubmit
onTaskDelete
onUserUpdate

// ✅ 内部处理函数使用 handle 前缀
const handleClick = () => { ... };
const handleSubmit = (e: FormEvent) => { ... };
```

---

## 组件结构

### 基础组件模板

```tsx
/**
 * TaskCard - 任务卡片组件
 * 
 * @description 显示单个任务的详细信息
 * @version 1.0.0
 * @author 开发者姓名
 */

import { useState, useCallback } from 'react';
import { Task } from '@/types';
import { useTranslation } from '@/lib/i18n';
import { logger } from '@/lib/logger';

// ==================== 类型定义 ====================

export interface TaskCardProps {
  /** 任务数据 */
  task: Task;
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 编辑回调 */
  onEdit?: (taskId: string) => void;
  /** 删除回调 */
  onDelete?: (taskId: string) => void;
}

// ==================== 主组件 ====================

export function TaskCard({
  task,
  showDetails = false,
  onEdit,
  onDelete
}: TaskCardProps) {
  // Hooks
  const { t } = useTranslation('common');
  const [isExpanded, setIsExpanded] = useState(false);

  // Event Handlers
  const handleEdit = useCallback(() => {
    logger.info('Task edit clicked', { taskId: task.id });
    onEdit?.(task.id);
  }, [task.id, onEdit]);

  const handleDelete = useCallback(() => {
    logger.info('Task delete clicked', { taskId: task.id });
    onDelete?.(task.id);
  }, [task.id, onDelete]);

  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Render
  return (
    <div className="task-card rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{task.title}</h3>
        <div className="flex gap-2">
          <button
            onClick={handleEdit}
            className="btn btn-primary"
            aria-label={t('task.edit')}
          >
            {t('common.edit')}
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-danger"
            aria-label={t('task.delete')}
          >
            {t('common.delete')}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-2 text-gray-600">
          <p>{task.description}</p>
          <div className="mt-2 flex items-center gap-4">
            <span>{t('task.status')}: {task.status}</span>
            <span>{t('task.priority')}: {task.priority}</span>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="mt-4 border-t pt-4">
          <p>{t('task.details')}: {task.details}</p>
        </div>
      )}
    </div>
  );
}

// ==================== 默认导出 ====================

export default TaskCard;
```

### 组件组织顺序

```tsx
// 1. 导入语句（按类型分组）
// React 相关
import { useState, useCallback, useEffect } from 'react';

// 第三方库
import { useTranslation } from 'react-i18next';

// 项目内部模块
import { Task } from '@/types';
import { logger } from '@/lib/logger';

// 组件
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

// 样式
import styles from './TaskCard.module.css';

// 2. 类型定义
interface Props { ... }
interface State { ... }

// 3. 常量定义
const MAX_ITEMS = 10;
const DEFAULT_PAGE_SIZE = 20;

// 4. 辅助函数
function formatTaskDate(date: Date): string { ... }

// 5. 主组件
export function Component() { ... }

// 6. 子组件
function SubComponent() { ... }

// 7. 默认导出
export default Component;
```

---

## Props 规范

### Props 定义

**使用 TypeScript 接口**:
```tsx
// ✅ 清晰的类型定义
interface UserCardProps {
  /** 用户 ID */
  userId: string;
  /** 用户数据（可选，用于乐观更新） */
  user?: User;
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 编辑回调 */
  onEdit: (userId: string) => void;
  /** 删除回调（可选） */
  onDelete?: (userId: string) => void;
  /** 自定义类名 */
  className?: string;
}
```

### 默认值处理

**使用默认参数**:
```tsx
// ✅ 推荐：使用默认参数
export function UserCard({
  user,
  showDetails = false,
  className = ''
}: UserCardProps) {
  // ...
}

// ❌ 避免：在组件内部设置默认值
export function UserCard({ user, showDetails, className }: UserCardProps) {
  const show = showDetails || false; // 不推荐
  // ...
}
```

### 可选 Props 检查

```tsx
// ✅ 使用可选链和 nullish coalescing
function TaskCard({ task, onEdit, onDelete }: Props) {
  // 可选回调
  const handleEdit = () => {
    onEdit?.(task.id);
  };

  // 默认值
  const status = task.status ?? 'pending';
  
  // 条件渲染
  return (
    <div>
      {onDelete && (
        <button onClick={() => onDelete(task.id)}>Delete</button>
      )}
    </div>
  );
}
```

### Props 解构

```tsx
// ✅ 推荐：直接解构
export function UserCard({ userId, user, onEdit }: Props) {
  // ...
}

// ❌ 避免：使用 props 对象
export function UserCard(props: Props) {
  const userId = props.userId;
  // ...
}
```

---

## 状态管理

### 本地状态

```tsx
// ✅ 简单状态
const [isOpen, setIsOpen] = useState(false);
const [count, setCount] = useState(0);

// ✅ 对象状态（使用函数式更新）
const [user, setUser] = useState<User | null>(null);

const updateUserName = (name: string) => {
  setUser(prev => prev ? { ...prev, name } : null);
};

// ✅ 数组状态
const [items, setItems] = useState<Item[]>([]);

const addItem = (item: Item) => {
  setItems(prev => [...prev, item]);
};

const removeItem = (id: string) => {
  setItems(prev => prev.filter(item => item.id !== id));
};
```

### 全局状态（Zustand）

```tsx
// stores/taskStore.ts
import { create } from 'zustand';

interface TaskState {
  tasks: Task[];
  addTask: (task: Task) => void;
  removeTask: (id: string) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task]
  })),
  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter(t => t.id !== id)
  }))
}));

// 组件中使用
function TaskList() {
  const { tasks, addTask } = useTaskStore();
  
  return (
    <div>
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
```

### 状态提升

```tsx
// ✅ 将共享状态提升到共同父组件
function TaskManager() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  return (
    <div>
      <TaskList
        selectedId={selectedTaskId}
        onSelect={setSelectedTaskId}
      />
      <TaskDetail taskId={selectedTaskId} />
    </div>
  );
}
```

---

## 事件处理

### 事件处理函数

```tsx
// ✅ 使用 useCallback 缓存
const handleSubmit = useCallback((e: FormEvent) => {
  e.preventDefault();
  // 处理逻辑
}, [dependency1, dependency2]);

const handleClick = useCallback(() => {
  logger.info('Button clicked');
  onAction?.();
}, [onAction]);

// ❌ 避免内联函数（性能敏感场景）
<button onClick={() => doSomething()}>Click</button>
```

### 表单处理

```tsx
import { useState } from 'react';

interface FormData {
  title: string;
  description: string;
}

function TaskForm({ onSubmit }: Props) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: ''
  });

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  }, [formData, onSubmit]);

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="title"
        value={formData.title}
        onChange={handleChange}
      />
      <input
        name="description"
        value={formData.description}
        onChange={handleChange}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## 样式规范

### Tailwind CSS 使用

```tsx
// ✅ 使用 Tailwind 类名
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
  <span className="text-sm text-gray-500">{date}</span>
</div>

// ✅ 使用 clsx 处理条件样式
import clsx from 'clsx';

<div className={clsx(
  'task-card',
  isActive && 'active',
  isDisabled && 'disabled',
  className
)}>
  {/* ... */}
</div>

// ✅ 使用 @apply 提取复用样式
// styles/globals.css
.btn {
  @apply px-4 py-2 rounded font-medium transition-colors;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}
```

### CSS Modules

```tsx
// TaskCard.module.css
.taskCard {
  @apply rounded-lg border p-4;
}

.title {
  @apply text-lg font-semibold;
}

.active {
  @apply border-blue-500 bg-blue-50;
}

// TaskCard.tsx
import styles from './TaskCard.module.css';

export function TaskCard({ isActive }: Props) {
  return (
    <div className={clsx(styles.taskCard, isActive && styles.active)}>
      <h3 className={styles.title}>{title}</h3>
    </div>
  );
}
```

---

## 国际化

### 使用翻译

```tsx
import { useTranslation } from 'react-i18next';

function TaskCard({ task }: Props) {
  const { t } = useTranslation('tasks');

  return (
    <div>
      <h3>{task.title}</h3>
      <p>{t('status')}: {task.status}</p>
      <button>{t('common.edit')}</button>
    </div>
  );
}
```

### 翻译键命名

```json
// public/locales/zh/tasks.json
{
  "title": "任务标题",
  "status": "状态",
  "priority": "优先级",
  "actions": {
    "edit": "编辑",
    "delete": "删除",
    "assign": "分配"
  },
  "messages": {
    "createSuccess": "任务创建成功",
    "updateSuccess": "任务更新成功",
    "deleteConfirm": "确定要删除这个任务吗？"
  }
}
```

---

## 测试规范

### 单元测试

```tsx
// TaskCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from './TaskCard';

describe('TaskCard', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'pending',
    priority: 'medium'
  };

  it('should render task title', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('should call onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    render(<TaskCard task={mockTask} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith('1');
  });

  it('should expand details when showDetails is true', () => {
    render(<TaskCard task={mockTask} showDetails />);
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });
});
```

### 集成测试

```tsx
// TaskList.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskList } from './TaskList';

describe('TaskList Integration', () => {
  it('should load and display tasks', async () => {
    const queryClient = new QueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <TaskList />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
  });
});
```

### 测试覆盖率要求

| 类型 | 最低覆盖率 | 推荐覆盖率 |
|------|-----------|-----------|
| **语句覆盖率** | 80% | 90% |
| **分支覆盖率** | 75% | 85% |
| **函数覆盖率** | 80% | 90% |
| **行覆盖率** | 80% | 90% |

```bash
# 运行测试覆盖率
npm run test:coverage

# 查看覆盖率报告
open coverage/lcov-report/index.html
```

---

## 性能优化

### React.memo

```tsx
// ✅ 对纯组件使用 memo
export const TaskCard = memo(function TaskCard({ task }: Props) {
  return <div>{task.title}</div>;
});

// ✅ 自定义比较函数
export const TaskList = memo(function TaskList({ tasks }: Props) {
  return (
    <div>
      {tasks.map(task => <TaskCard key={task.id} task={task} />)}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.tasks.length === nextProps.tasks.length;
});
```

### useCallback 和 useMemo

```tsx
function TaskManager({ tasks, onUpdate }: Props) {
  // ✅ 缓存回调函数
  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<Task>) => {
    onUpdate(taskId, updates);
  }, [onUpdate]);

  // ✅ 缓存计算结果
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => a.priority - b.priority);
  }, [tasks]);

  // ✅ 缓存过滤结果
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => task.status === 'active');
  }, [tasks]);

  return <TaskList tasks={sortedTasks} onUpdate={handleTaskUpdate} />;
}
```

### 代码分割

```tsx
import { lazy, Suspense } from 'react';

// ✅ 懒加载大型组件
const TaskDashboard = lazy(() => import('./TaskDashboard'));
const AnalyticsPanel = lazy(() => import('./AnalyticsPanel'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TaskDashboard />
    </Suspense>
  );
}
```

### React Compiler (v1.4.0)

```tsx
// ✅ 启用 React Compiler（可选）
// next.config.ts
const nextConfig = {
  experimental: {
    reactCompiler: true
  }
};

// ✅ 手动优化（编译器会自动处理）
function TaskCard({ task }: Props) {
  // React Compiler 会自动优化这个组件
  return <div>{task.title}</div>;
}

// ✅ 忽略特定组件（如果需要）
// @ts-ignore
TaskCard.displayName = 'TaskCard';
```

---

## 最佳实践

### 组件设计原则

1. **单一职责**: 一个组件只做一件事
2. **可复用性**: 组件应该可复用
3. **可测试性**: 组件应该易于测试
4. **可访问性**: 支持键盘导航和屏幕阅读器

### 代码质量

```tsx
// ✅ 保持组件简洁（< 300 行）
// ✅ 避免过深的嵌套（< 3 层）
// ✅ 使用有意义的变量名
// ✅ 添加必要的注释
// ✅ 处理边界情况

// ❌ 避免反模式
// ❌ 不要在渲染中调用 setState
// ❌ 不要直接修改 props
// ❌ 不要使用内联样式（除非动态）
// ❌ 不要忽略 ESLint 警告
```

### 错误处理

```tsx
// ✅ 使用 Error Boundary
import { ErrorBoundary } from 'react-error-boundary';

function TaskList() {
  return (
    <ErrorBoundary
      fallback={<div>Something went wrong</div>}
      onError={(error) => logger.error('TaskList error:', error)}
    >
      <TaskListContent />
    </ErrorBoundary>
  );
}

// ✅ 处理异步错误
function TaskDetail({ taskId }: Props) {
  const { data, error, isLoading } = useQuery(['task', taskId], () =>
    fetchTask(taskId)
  );

  if (error) {
    return <ErrorState message={error.message} />;
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <TaskContent task={data} />;
}
```

### 可访问性

```tsx
// ✅ 使用语义化标签
<button onClick={handleClick}>
  {t('common.submit')}
</button>

// ✅ 添加 aria 属性
<div
  role="alert"
  aria-live="polite"
  aria-label={t('notifications.new')}
>
  {message}
</div>

// ✅ 支持键盘导航
<div
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleActivate();
    }
  }}
>
  {content}
</div>
```

---

## 检查清单

### 组件开发检查清单

- [ ] 组件命名符合规范
- [ ] Props 类型定义完整
- [ ] 添加了必要的默认值
- [ ] 状态管理合理（本地 vs 全局）
- [ ] 事件处理函数使用 useCallback
- [ ] 样式使用 Tailwind CSS
- [ ] 国际化字符串已提取
- [ ] 单元测试覆盖率 ≥ 80%
- [ ] 性能优化（memo、useMemo、useCallback）
- [ ] 错误处理完善
- [ ] 可访问性支持
- [ ] 代码通过 Lint 检查
- [ ] 类型检查通过

### Code Review 检查清单

- [ ] 代码风格一致
- [ ] 没有重复代码
- [ ] 没有硬编码值
- [ ] 注释清晰有用
- [ ] 测试覆盖充分
- [ ] 性能无明显问题
- [ ] 安全性考虑周全
- [ ] 文档更新完整

---

## 相关文档

- [开发者快速入门指南](./DEVELOPER_GUIDE.md)
- [API 文档](./API.md)
- [架构决策记录](./adr/)
- [测试指南](../tests/README.md)

---

**遵循这些规范，让代码更易维护、更易协作！** 🚀
