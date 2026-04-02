# v1.5.0 快速入门指南

**最后更新**: 2026-03-31  
**版本**: v1.5.0  
**难度**: ⭐ 简单  
**时间**: 10-15 分钟

---

## 🎯 目标

快速了解 v1.5.0 的核心更新和新功能，包括：

- ✅ PermissionContext → Zustand 迁移
- ✅ lib/ 层优化
- ✅ Agent Learning System 使用

---

## 📋 v1.5.0 核心更新

### 1. 权限系统迁移到 Zustand

**背景**: 原 React Context-based 权限系统已迁移到 Zustand store，提升性能。

**变更**:

- ✅ Zustand store (`src/stores/permissionStore.ts`)
- ✅ 兼容层 (`src/contexts/PermissionContext.tsx`)
- ✅ 保持 API 向后兼容

**性能提升**:

- 精确订阅，减少不必要的重渲染
- 无需 Provider 嵌套
- 内置持久化支持

### 2. lib/ 层优化

**变更**:

- ✅ 无循环依赖（madge 检测通过）
- ✅ 模块职责清晰（43 个模块）
- ✅ 29/43 模块有统一导出

**文档**: [lib/ 层重构报告](./LIB_REFACTOR_REPORT_20260329.md)

### 3. Agent Learning System

**新增功能**:

- ✅ 任务完成时间预测模型
- ✅ Agent 能力自动评估
- ✅ 数据持久化增强

**文档**: [Agent Learning System 实现报告](./AGENT_LEARNING_IMPLEMENTATION_REPORT.md)

---

## 🚀 权限系统使用

### 推荐方式（性能更好）

```typescript
import {
  usePermissionStore,
  useIsAdmin,
  usePermissionLoading
} from '@/stores';

function AdminPanel() {
  const isAdmin = useIsAdmin();
  const loading = usePermissionLoading();

  if (loading) return <div>Loading...</div>;
  if (!isAdmin) return <div>Access denied</div>;

  return <div>Admin content</div>;
}
```

### 兼容方式（向后兼容）

```typescript
import { usePermissions } from '@/contexts/PermissionContext';

function MyComponent() {
  const { hasPermission, isAdmin, loading } = usePermissions();

  if (loading) return <div>Loading...</div>;

  if (!hasPermission('task:create')) {
    return <div>Access denied</div>;
  }

  return <div>Content</div>;
}
```

### Gate 组件

```typescript
import { PermissionGate, RoleGate } from '@/contexts/PermissionContext';

function MyPage() {
  return (
    <div>
      <PermissionGate permission="task:create">
        <button>Create Task</button>
      </PermissionGate>

      <RoleGate role="admin">
        <AdminPanel />
      </RoleGate>
    </div>
  );
}
```

---

## 🔧 lib/ 层工具使用

### 日志系统

```typescript
import { logger } from '@/lib/logger'

logger.info('User logged in', { userId: '123' })
logger.error('Failed to fetch data', error)
```

### 数据库

```typescript
import { db } from '@/lib/db'

const users = db.prepare('SELECT * FROM users').all()
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
```

### 缓存

```typescript
import { apiCache } from '@/lib/cache'

apiCache.set('user:123', userData)
const cached = apiCache.get('user:123')
```

### 搜索

```typescript
import { searchService } from '@/lib/search'

const results = await searchService.search({
  query: 'keyword',
  types: ['agents', 'tasks'],
})
```

### WebSocket

```typescript
import { wsClient } from '@/lib/websocket'

wsClient.connect()
wsClient.send('chat', { text: 'Hello' })
wsClient.on('message', data => console.log(data))
```

---

## 🤖 Agent Learning System 使用

### 任务时间预测

```typescript
import { predictCompletionTime } from '@/lib/agents/learning'

const prediction = predictCompletionTime(
  {
    taskType: 'text-generation',
    inputSize: 1000,
    priority: 'normal',
    timeOfDay: 14,
    dayOfWeek: 3,
    historicalAvgTime: 5000,
    queueDepth: 0,
    agentLoad: 0.5,
  },
  'agent-1'
)

console.log('Estimated time:', prediction.estimatedTime)
console.log('Confidence:', prediction.confidence)
```

### Agent 能力评估

```typescript
import { assessAgentCapability } from '@/lib/agents/learning'

const assessment = assessAgentCapability('agent-1')
console.log('Overall score:', assessment.overallScore)
console.log('Technical score:', assessment.dimensions.technical.score)
console.log('Recommendations:', assessment.recommendations)
```

### 学习数据持久化

```typescript
import {
  initializeLearningPersistence,
  addTaskRecord,
  saveLearningData,
} from '@/lib/agents/learning'

// 初始化
const { persistence } = await initializeLearningPersistence()

// 添加任务记录
await addTaskRecord({
  taskId: '123',
  taskType: 'text-generation',
  agentId: 'agent-1',
  createdAt: Date.now(),
  startedAt: Date.now(),
  completedAt: Date.now() + 5000,
  executionTime: 5000,
  status: 'completed',
  inputSize: 1000,
  priority: 'normal',
  agentLoadAtStart: 0.5,
})

// 保存
await saveLearningData()
```

---

## 📝 代码示例：完整页面

### Dashboard 页面（使用 Zustand）

```typescript
'use client';

import {
  useDashboardStore,
  usePermissionStore,
  useIsAdmin,
  toast
} from '@/stores';

import { logger } from '@/lib/logger';

export default function Dashboard() {
  // Dashboard 数据
  const members = useDashboardStore(state => state.members);
  const loading = useDashboardStore(state => state.loading);

  // 权限检查
  const isAdmin = useIsAdmin();

  const handleRefresh = async () => {
    try {
      logger.info('Refreshing dashboard');
      await useDashboardStore.getState().refresh();
      toast.success('刷新成功', '数据已更新');
    } catch (error) {
      logger.error('Failed to refresh dashboard', error);
      toast.error('刷新失败', error.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={handleRefresh}>刷新</button>

      {isAdmin && (
        <button>管理员功能</button>
      )}

      <div>
        {members.map(member => (
          <div key={member.id}>{member.name}</div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🚀 从 v1.4.0 迁移

### 权限系统迁移

如果你使用了旧的 `usePermissions()` hook，无需修改代码，它仍然可用。

如果想使用新的 Zustand API：

```typescript
// 旧方式（仍然可用）
import { usePermissions } from '@/contexts/PermissionContext'
const { hasPermission } = usePermissions()

// 新方式（推荐）
import { usePermissionStore } from '@/stores'
const hasPermission = usePermissionStore(state => state.hasPermission('task:create'))
```

### lib/ 层更新

lib/ 层的导入路径保持不变：

```typescript
import { logger } from '@/lib/logger'
import { db } from '@/lib/db'
import { searchService } from '@/lib/search'
// ...
```

### Agent Learning System 新增

Agent Learning System 是全新功能，需要手动集成：

```typescript
import { initializeLearningPersistence, predictCompletionTime } from '@/lib/agents/learning'

// 在应用初始化时
const { persistence, timePredictor } = await initializeLearningPersistence()

// 在任务调度时
const prediction = predictCompletionTime(features, agentId)
```

---

## 📝 代码示例：完整页面

### Dashboard 页面（使用 Zustand）

```typescript
'use client';

import {
  useDashboardStore,
  usePermissionStore,
  useIsAdmin,
  toast
} from '@/stores';

import { logger } from '@/lib/logger';

export default function Dashboard() {
  // Dashboard 数据
  const members = useDashboardStore(state => state.members);
  const loading = useDashboardStore(state => state.loading);

  // 权限检查
  const isAdmin = useIsAdmin();

  const handleRefresh = async () => {
    try {
      logger.info('Refreshing dashboard');
      await useDashboardStore.getState().refresh();
      toast.success('刷新成功', '数据已更新');
    } catch (error) {
      logger.error('Failed to refresh dashboard', error);
      toast.error('刷新失败', error.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={handleRefresh}>刷新</button>

      {isAdmin && (
        <button>管理员功能</button>
      )}

      <div>
        {members.map(member => (
          <div key={member.id}>{member.name}</div>
        ))}
      </div>
    </div>
  );
}
```

### Agent Dashboard UI 使用

```typescript
'use client';

import {
  AgentStatusPanel,
  TaskQueueView,
  ScheduleHistory,
  ManualOverride
} from '@/components/agent-scheduler';

export default function AgentSchedulerPage() {
  return (
    <div className="space-y-6">
      {/* 实时状态面板 */}
      <AgentStatusPanel />

      {/* 任务队列视图 */}
      <TaskQueueView />

      {/* 历史调度记录 */}
      <ScheduleHistory />

      {/* 手动干预面板 */}
      <ManualOverride />
    </div>
  );
}
```

---

## 🌐 WebSocket 房间系统使用

```typescript
'use client';

import { useEffect } from 'react';
import { wsClient } from '@/lib/websocket';

export default function RoomManager() {
  useEffect(() => {
    // 连接到房间
    wsClient.connect();
    wsClient.joinRoom('project-123');

    // 监听消息
    wsClient.on('message', (data) => {
      console.log('收到消息:', data);
    });

    return () => {
      wsClient.leaveRoom('project-123');
      wsClient.disconnect();
    };
  }, []);

  return (
    <div>
      <h2>房间管理</h2>
      <button onClick={() => wsClient.joinRoom('project-123')}>
        加入房间
      </button>
      <button onClick={() => wsClient.leaveRoom('project-123')}>
        离开房间
      </button>
    </div>
  );
}
```

---

## 🧪 测试

### 测试权限系统

```typescript
import { renderHook } from '@testing-library/react'
import { usePermissionStore } from '@/stores'

describe('Permission Tests', () => {
  beforeEach(() => {
    usePermissionStore.getState().reset()
  })

  it('should check admin permission', () => {
    usePermissionStore.getState().initializeFromAuthData({
      user: { id: '1', roles: ['admin'] },
      permissions: ['all'],
    })

    const isAdmin = usePermissionStore.getState().isAdmin()
    expect(isAdmin).toBe(true)
  })
})
```

### 测试 Agent Learning

```typescript
import { TaskTimePredictor } from '@/lib/agents/learning/time-prediction'

describe('Task Time Prediction', () => {
  it('should predict task time', () => {
    const predictor = new TaskTimePredictor()

    const result = predictor.predict(
      {
        taskType: 'text-generation',
        inputSize: 1000,
        priority: 'normal',
        timeOfDay: 14,
        dayOfWeek: 3,
        historicalAvgTime: 5000,
        queueDepth: 0,
        agentLoad: 0.5,
      },
      'agent-1'
    )

    expect(result.estimatedTime).toBeGreaterThan(0)
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })
})
```

---

## 📚 相关文档

- [用户使用指南](./USER_GUIDE.md) - 完整使用指南
- [Zustand Stores 使用示例](./zustand-stores-usage.md)
- [PermissionContext 迁移报告](./permission-context-migration-report.md)
- [lib/ 层重构报告](./LIB_REFACTOR_REPORT_20260329.md)
- [Agent Learning System 实现报告](./AGENT_LEARNING_IMPLEMENTATION_REPORT.md)
- [快速开始](./QUICKSTART.md) - 项目部署快速开始

---

## 🐛 常见问题

### 权限系统

**Q: 权限系统迁移后，旧的代码还能用吗？**

A: 可以。`usePermissions()` hook 和 `PermissionProvider` 组件仍然可用，内部已切换到 Zustand。

**Q: 如何选择使用 Zustand 还是兼容层？**

A:

- **新代码**: 直接使用 Zustand（性能更好）
- **旧代码**: 继续使用 `usePermissions()`（无需修改）

**Q: 如何测试权限逻辑？**

A: 使用 Zustand store 的测试工具：

```typescript
import { usePermissionStore } from '@/stores'

describe('Permission Check', () => {
  it('should check admin permission', () => {
    // 设置测试状态
    usePermissionStore.getState().initializeFromAuthData({
      user: { id: '1', roles: ['admin'] },
      permissions: ['all'],
    })

    // 测试
    const isAdmin = usePermissionStore.getState().isAdmin()
    expect(isAdmin).toBe(true)
  })
})
```

### Agent Learning System

**Q: Agent Learning System 必须启用吗？**

A: 不是。调度器有 `enableLearning` 配置项，可以随时开启或关闭。

**Q: 学习数据会持久化吗？**

A: 会。使用 `LearningPersistence` 自动保存到 localStorage，并支持导出/导入。

**Q: 如何查看 Agent 的学习数据？**

A: 使用 Agent Dashboard UI 或调用 API：

```typescript
import { assessAgentCapability } from '@/lib/agents/learning'

const assessment = assessAgentCapability('agent-1')
console.log('Overall score:', assessment.overallScore)
console.log('Dimensions:', assessment.dimensions)
console.log('Recommendations:', assessment.recommendations)
```

### WebSocket 房间系统

**Q: 如何创建一个新房间？**

A: 使用 WebSocket 客户端 API：

```typescript
import { wsClient } from '@/lib/websocket'

// 创建房间
await wsClient.createRoom({
  id: 'project-123',
  name: 'Project 123',
  visibility: 'private',
  permissions: {
    admin: ['user-1', 'user-2'],
    member: ['user-3'],
  },
})
```

**Q: 房间的权限如何管理？**

A: 使用房间权限配置：

```typescript
// 设置房间权限
await wsClient.setRoomPermissions('project-123', {
  admin: ['user-1'],
  moderator: ['user-2'],
  member: ['user-3', 'user-4'],
  guest: ['user-5'],
})

// 检查用户权限
const hasPermission = await wsClient.checkPermission('project-123', 'user-3', 'message:send')
```

**Q: 房间消息会持久化吗？**

A: 会。每个房间默认保留 10,000 条消息在内存中，离线消息会保存 7 天。

### 性能优化

**Q: 如何启用 React Compiler？**

A: 在环境变量中配置：

```bash
# .env.local
ENABLE_REACT_COMPILER=true
REACT_COMPILER_MODE=opt-out
```

或在应用中动态启用：

```typescript
import { enableReactCompiler } from 'react-compiler-runtime'

if (process.env.NEXT_PUBLIC_ENABLE_REACT_COMPILER === 'true') {
  enableReactCompiler()
}
```

**Q: 如何使用 Turbopack 加速开发？**

A: 使用以下命令：

```bash
# Turbopack 开发模式
pnpm dev:turbo

# Turbopack 构建
pnpm build --turbopack
```

Turbopack 比 Webpack 快 40-60%。

**Q: 如何监控生产环境性能？**

A: 集成性能监控系统：

```typescript
import { performanceMonitor } from '@/lib/performance/monitor'

// 记录自定义指标
performanceMonitor.recordMetric({
  operation: 'task-completion',
  duration: 1500,
  status: 'success',
  metadata: {
    agentId: 'agent-1',
    taskType: 'text-generation',
  },
})

// 查看异常检测报告
const anomalies = await performanceMonitor.getAnomalies({
  threshold: 3.0, // Z-score 阈值
  timeRange: '1h',
})
```

### 部署相关

**Q: 如何在生产环境启用 Agent Learning？**

A: 在环境变量中配置：

```bash
# .env.production
AGENT_LEARNING_ENABLED=true
AGENT_LEARNING_PERSISTENCE=true
AGENT_LEARNING_DATA_PATH=/data/learning
```

**Q: 部署后如何验证功能正常？**

A: 运行健康检查：

```bash
# 检查应用健康状态
curl http://localhost:3000/api/health

# 检查 Agent 调度状态
curl http://localhost:3000/api/agent-scheduler/status

# 检查 WebSocket 连接
curl http://localhost:3000/api/websocket/status
```

---

## 🎉 下一步

完成快速入门后，你可以：

1. **阅读完整文档**
   - [用户使用指南](./USER_GUIDE.md) ⭐
   - [开发指南](./DEVELOPMENT.md)
   - [API 文档](./API.md)

2. **探索示例代码**
   - [Zustand Stores 使用示例](./zustand-stores-usage.md)
   - [组件使用指南](./COMPONENTS-USAGE-GUIDE.md)
   - [Agent Dashboard 文档](./lib/agent-scheduler/dashboard/README.md)

3. **查看技术文档**
   - [权限系统迁移报告](./permission-context-migration-report.md)
   - [lib/ 层重构报告](./LIB_REFACTOR_REPORT_20260329.md)
   - [Agent Learning System 实现报告](./AGENT_LEARNING_IMPLEMENTATION_REPORT.md)
   - [WebSocket API 文档](./api/websocket.md)
   - [Agent 调度系统 API](./api/agent-scheduler.md)

4. **部署到生产环境**
   - [部署指南](../DEPLOYMENT.md)
   - [CI/CD 配置](../.github/workflows/)
   - [Docker 配置](../docker-compose.prod.yml)

---

**🎉 恭喜！你已掌握 v1.5.0 核心功能！**
