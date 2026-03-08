# Tasks 模块文档

> AI 驱动的任务管理系统

**版本**: 1.0.0  
**更新日期**: 2026-03-08

---

## 📖 概述

Tasks 模块是 7zi 平台的核心功能之一，提供完整的 AI 驱动任务管理能力。该模块支持任务的创建、分配、追踪和完成，并与 AI 团队成员智能集成。

### 核心特性

- **🎯 AI 智能分配** - 根据任务类型自动匹配最适合的 AI 成员
- **📊 状态追踪** - 完整的任务生命周期管理
- **💬 评论系统** - 支持任务讨论和反馈
- **📝 历史记录** - 记录所有状态变更
- **🔄 Dashboard 集成** - 与团队看板实时同步

---

## 🏗️ 架构设计

### 目录结构

```
src/
├── lib/
│   ├── types/
│   │   └── task-types.ts      # 类型定义
│   ├── utils/
│   │   └── task-utils.ts      # 工具函数
│   ├── store/
│   │   └── tasks-store.ts     # Zustand 状态管理
│   └── data/
│       └── sample-tasks.ts    # 示例数据
├── app/
│   ├── tasks/                 # 任务页面
│   │   ├── page.tsx
│   │   └── components/
│   │       ├── TaskCard.tsx
│   │       └── TaskForm.tsx
│   └── api/tasks/             # REST API
│       ├── route.ts
│       └── [id]/route.ts
└── test/tasks/                # 测试文件
    ├── tasks-store.test.ts
    ├── TasksPage.test.tsx
    ├── TaskCard.test.tsx
    └── TaskForm.test.tsx
```

### 数据流

```
用户操作 → TaskForm/TaskCard 
         → tasks-store (Zustand)
         → Dashboard Store (联动更新)
         → UI 响应更新
```

---

## 📦 数据结构

### Task (任务)

```typescript
interface Task {
  id: string;                    // 唯一标识
  title: string;                 // 任务标题
  description: string;           // 任务描述
  type: TaskType;                // 任务类型
  priority: TaskPriority;        // 优先级
  status: TaskStatus;            // 当前状态
  assignee?: string;             // AI 成员 ID
  createdBy: 'user' | 'ai';      // 创建者
  createdAt: string;             // 创建时间 (ISO 8601)
  updatedAt: string;             // 更新时间 (ISO 8601)
  comments: TaskComment[];       // 评论列表
  history: StatusChange[];       // 状态历史
}
```

### TaskType (任务类型)

```typescript
type TaskType = 'development' | 'design' | 'research' | 'marketing' | 'other';
```

| 类型 | 说明 | 默认分配角色 |
|------|------|-------------|
| `development` | 开发任务 | EXECUTOR |
| `design` | 设计任务 | DESIGNER |
| `research` | 研究任务 | CONSULTANT |
| `marketing` | 营销任务 | PROMOTER |
| `other` | 其他任务 | GENERAL |

### TaskPriority (优先级)

```typescript
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
```

| 优先级 | 级别值 | 说明 |
|--------|--------|------|
| `low` | 1 | 低优先级 |
| `medium` | 2 | 中优先级 |
| `high` | 3 | 高优先级 |
| `urgent` | 4 | 紧急 |

### TaskStatus (状态)

```typescript
type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';
```

| 状态 | 排序值 | 说明 |
|------|--------|------|
| `pending` | 1 | 待处理 |
| `assigned` | 2 | 已分配 |
| `in_progress` | 3 | 进行中 |
| `completed` | 4 | 已完成 |

### AI_MEMBER_ROLES (AI 成员角色)

```typescript
enum AI_MEMBER_ROLES {
  EXECUTOR = 'executor',      // 执行者 - 开发任务
  DESIGNER = 'designer',      // 设计师 - 设计任务
  CONSULTANT = 'consultant',  // 咨询师 - 研究任务
  PROMOTER = 'promoter',      // 推广专员 - 营销任务
  GENERAL = 'general'         // 通用 - 其他任务
}
```

### TaskComment (评论)

```typescript
interface TaskComment {
  id: string;          // 评论 ID
  author: string;      // 作者
  content: string;     // 内容
  timestamp: string;   // 时间戳
}
```

### StatusChange (状态变更记录)

```typescript
interface StatusChange {
  timestamp: string;    // 变更时间
  status: TaskStatus;   // 新状态
  changedBy: string;    // 操作者
  assignee?: string;    // 分配对象 (可选)
}
```

### AITeamMember (AI 团队成员)

```typescript
interface AITeamMember {
  id: string;                      // 成员 ID
  name: string;                    // 名称
  role: string;                    // 角色
  expertise: TaskType[];           // 专业领域
  status: 'available' | 'busy' | 'offline';  // 状态
  completedTasks: number;          // 完成任务数
  avatar?: string;                 // 头像
}
```

### AssignmentSuggestion (分配建议)

```typescript
interface AssignmentSuggestion {
  memberId: string;      // 成员 ID
  memberName: string;    // 成员名称
  confidence: number;    // 置信度 (0-100)
  reason: string;        // 推荐理由
}
```

---

## 🛠️ 工具函数

### 导入

```typescript
import {
  getRoleForTaskType,
  getPriorityLevel,
  getStatusOrder,
  sortTasks,
  filterTasksByType,
  filterTasksByStatus,
  getTaskStats,
  validateTaskData
} from '@/lib/utils/task-utils';
```

### getRoleForTaskType

根据任务类型获取推荐的 AI 角色。

```typescript
const role = getRoleForTaskType('development');  // AI_MEMBER_ROLES.EXECUTOR
const role = getRoleForTaskType('design');       // AI_MEMBER_ROLES.DESIGNER
```

### getPriorityLevel

获取优先级的数值（用于排序）。

```typescript
getPriorityLevel('urgent');  // 4
getPriorityLevel('high');    // 3
getPriorityLevel('medium');  // 2
getPriorityLevel('low');     // 1
```

### getStatusOrder

获取状态的排序值。

```typescript
getStatusOrder('pending');     // 1
getStatusOrder('assigned');    // 2
getStatusOrder('in_progress'); // 3
getStatusOrder('completed');   // 4
```

### sortTasks

按状态、优先级和创建时间排序任务。

```typescript
const sortedTasks = sortTasks(tasks);
// 排序规则:
// 1. 状态: pending → assigned → in_progress → completed
// 2. 优先级: urgent → high → medium → low
// 3. 创建时间: 最新优先
```

### filterTasksByType

按类型筛选任务。

```typescript
const devTasks = filterTasksByType(tasks, 'development');
const allTasks = filterTasksByType(tasks, 'all');
```

### filterTasksByStatus

按状态筛选任务。

```typescript
const pendingTasks = filterTasksByStatus(tasks, 'pending');
const allTasks = filterTasksByStatus(tasks, 'all');
```

### getTaskStats

获取任务统计信息。

```typescript
const stats = getTaskStats(tasks);
// 返回: {
//   total: number,
//   pending: number,
//   assigned: number,
//   inProgress: number,
//   completed: number,
//   completionRate: number  // 百分比
// }
```

### validateTaskData

验证任务表单数据。

```typescript
const result = validateTaskData({
  title: '新任务',
  description: '任务描述',
  type: 'development',
  priority: 'high'
});
// 返回: { isValid: boolean, errors: string[] }
```

---

## 🗃️ 状态管理

### useTasksStore (Zustand)

```typescript
import { useTasksStore } from '@/lib/store/tasks-store';

function TaskComponent() {
  const { 
    tasks,           // 任务列表
    addTask,         // 添加任务
    updateTask,      // 更新任务
    deleteTask,      // 删除任务
    assignTask,      // 分配任务
    completeTask,    // 完成任务
    addComment       // 添加评论
  } = useTasksStore();
  
  // 使用示例...
}
```

### Store 方法详解

#### addTask

创建新任务。

```typescript
addTask({
  title: '实现用户认证功能',
  description: '添加 OAuth 2.0 登录支持',
  type: 'development',
  priority: 'high',
  status: 'pending',
  createdBy: 'user'
});
```

#### updateTask

更新任务信息。

```typescript
updateTask('task_123', {
  priority: 'urgent',
  description: '更新后的描述'
});
```

#### deleteTask

删除任务。

```typescript
deleteTask('task_123');
```

#### assignTask

分配任务给 AI 成员。

```typescript
assignTask('task_123', 'ai_executor');
// 会自动:
// 1. 更新任务状态为 'assigned'
// 2. 添加历史记录
// 3. 更新 Dashboard 中 AI 成员状态
```

#### completeTask

标记任务完成。

```typescript
completeTask('task_123');
// 会自动:
// 1. 更新任务状态为 'completed'
// 2. 添加历史记录
// 3. 更新 AI 成员状态为空闲
```

#### addComment

添加任务评论。

```typescript
addComment('task_123', {
  author: 'user',
  content: '请优先处理这个任务'
});
```

---

## 🌐 API 端点

### 任务列表

```http
GET /api/tasks
```

**响应**:
```json
{
  "tasks": [
    {
      "id": "task_123",
      "title": "任务标题",
      ...
    }
  ]
}
```

### 创建任务

```http
POST /api/tasks
Content-Type: application/json

{
  "title": "新任务",
  "description": "任务描述",
  "type": "development",
  "priority": "high"
}
```

### 获取/更新/删除单个任务

```http
GET    /api/tasks/:id
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

### AI 智能分配

```http
POST /api/tasks/:id/assign
```

---

## 💡 使用示例

### 基础任务管理

```tsx
import { useTasksStore } from '@/lib/store/tasks-store';
import { sortTasks, getTaskStats } from '@/lib/utils/task-utils';

function TaskBoard() {
  const { tasks, addTask, completeTask } = useTasksStore();
  
  const sortedTasks = sortTasks(tasks);
  const stats = getTaskStats(tasks);
  
  return (
    <div>
      <div className="stats">
        <span>总任务: {stats.total}</span>
        <span>完成率: {stats.completionRate}%</span>
      </div>
      
      {sortedTasks.map(task => (
        <TaskCard 
          key={task.id} 
          task={task}
          onComplete={() => completeTask(task.id)}
        />
      ))}
    </div>
  );
}
```

### 创建新任务

```tsx
import { useTasksStore } from '@/lib/store/tasks-store';
import { validateTaskData } from '@/lib/utils/task-utils';

function TaskForm() {
  const addTask = useTasksStore(state => state.addTask);
  
  const handleSubmit = (formData) => {
    const { isValid, errors } = validateTaskData(formData);
    
    if (!isValid) {
      alert(errors.join(', '));
      return;
    }
    
    addTask({
      ...formData,
      status: 'pending',
      createdBy: 'user'
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* 表单字段 */}
    </form>
  );
}
```

### 任务筛选

```tsx
import { useTasksStore } from '@/lib/store/tasks-store';
import { filterTasksByType, filterTasksByStatus, sortTasks } from '@/lib/utils/task-utils';

function FilteredTaskList({ type, status }) {
  const tasks = useTasksStore(state => state.tasks);
  
  const filtered = sortTasks(
    filterTasksByStatus(
      filterTasksByType(tasks, type),
      status
    )
  );
  
  return filtered.map(task => <TaskCard key={task.id} task={task} />);
}
```

### AI 分配集成

```tsx
import { useTasksStore } from '@/lib/store/tasks-store';
import { getRoleForTaskType, AI_MEMBER_ROLES } from '@/lib/types/task-types';

function TaskAssignButton({ task }) {
  const assignTask = useTasksStore(state => state.assignTask);
  
  const handleAssign = async () => {
    // 获取推荐角色
    const role = getRoleForTaskType(task.type);
    
    // 调用 AI 分配 API
    const response = await fetch(`/api/tasks/${task.id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ role })
    });
    
    const { assigneeId } = await response.json();
    
    // 更新本地状态
    assignTask(task.id, assigneeId);
  };
  
  return <button onClick={handleAssign}>AI 智能分配</button>;
}
```

---

## 🧪 测试

### 测试文件

- `tasks-store.test.ts` - Store 状态管理测试
- `TasksPage.test.tsx` - 页面组件测试
- `TaskCard.test.tsx` - 任务卡片组件测试
- `TaskForm.test.tsx` - 表单组件测试

### 运行测试

```bash
# 运行所有任务相关测试
pnpm test tasks

# 运行单个测试文件
pnpm test tasks-store.test.ts
```

---

## 📚 相关文档

- [Dashboard 模块](./MONITORING_DESIGN.md)
- [状态管理迁移](./STATE_MANAGEMENT_MIGRATION.md)
- [API 文档](./DEPLOYMENT.md)

---

*文档更新时间: 2026-03-08*