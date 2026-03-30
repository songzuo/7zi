# AI Agent Scheduler Dashboard 组件文档

**版本**: v1.4.0
**最后更新**: 2026-03-29
**组件路径**: `src/lib/agent-scheduler/dashboard/`

---

## 概述

AI Agent Scheduler Dashboard 是一套完整的 React 组件，用于可视化和管理 11 位 AI 成员的任务调度系统。Dashboard 提供实时状态监控、任务队列管理、调度历史追踪和手动覆盖功能。

### 核心组件

| 组件 | 功能描述 |
|------|----------|
| `AgentStatusPanel` | 实时显示所有 Agent 状态和负载 |
| `TaskQueueView` | 任务队列视图，支持筛选和重新分配 |
| `ScheduleHistory` | 调度决策历史，包含推理过程 |
| `ManualOverride` | 手动干预界面，覆盖自动调度 |
| `Dashboard` | 主容器，整合所有子组件 |

### 功能特性

- ✅ 实时状态更新 - 每 30 秒自动刷新
- ✅ 负载可视化 - 进度条和雷达图展示
- ✅ 智能筛选 - 按角色、状态、优先级过滤
- ✅ 手动干预 - 覆盖自动调度决策
- ✅ 历史追踪 - 查看调度推理和置信度
- ✅ 响应式设计 - 支持移动端和桌面端

---

## 数据源

Dashboard 从 Zustand store (`src/lib/agent-scheduler/stores/scheduler-store.ts`) 获取数据：

```typescript
import { useSchedulerStore } from '@/lib/agent-scheduler/stores/scheduler-store';

const {
  agents,              // 所有 Agent 列表
  tasks,               // 所有任务列表
  decisions,           // 调度决策历史
  isLoading,
  initialize,
  refresh,
  assignTask,
  overrideDecision
} = useSchedulerStore();
```

---

## 组件详解

### 1. AgentStatusPanel

**功能**: 实时监控所有 AI Agent 的运行状态

#### Props 接口

```typescript
interface AgentStatusPanelProps {
  refreshInterval?: number;      // 自动刷新间隔（毫秒），默认 30000
  showOfflineAgents?: boolean;   // 是否显示离线 Agent，默认 true
  enableRadarChart?: boolean;    // 是否启用雷达图，默认 true
  onAgentClick?: (agentId: string) => void;  // Agent 点击回调
}
```

#### 使用示例

```tsx
import { AgentStatusPanel } from '@/lib/agent-scheduler/dashboard/AgentStatusPanel';

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1>AI Agent 状态监控</h1>
      <AgentStatusPanel 
        refreshInterval={30000}
        enableRadarChart={true}
        onAgentClick={(agentId) => console.log('Agent clicked:', agentId)}
      />
    </div>
  );
}
```

#### 显示内容

- **Agent 卡片**: 显示每个 Agent 的状态、负载、能力
- **状态指示灯**: 绿色=可用，黄色=忙碌，红色=离线
- **负载进度条**: 当前负载 (0-100%)
- **能力雷达图**: 6 维度能力评分（点击展开）
- **筛选器**: 按角色筛选 Agent

#### 11 位 Agent 列表

| Agent ID | 名称 | 角色 | Emoji | 技术栈 |
|----------|------|------|-------|--------|
| `agent-expert` | 智能体世界专家 | 视角转换、未来布局 | 🌟 | AI, 架构设计 |
| `consultant` | 咨询师 | 研究分析 | 📚 | 数据分析, 文档 |
| `architect` | 架构师 | 架构设计 | 🏗️ | TypeScript, React |
| `executor` | Executor | 执行实现 | ⚡ | 编码, 部署 |
| `sysadmin` | 系统管理员 | 运维部署 | 🛡️ | Docker, CI/CD |
| `tester` | 测试员 | 测试调试 | 🧪 | 测试自动化 |
| `designer` | 设计师 | UI设计 | 🎨 | React, CSS |
| `promoter` | 推广专员 | 推广SEO | 📣 | SEO, 内容营销 |
| `sales` | 销售客服 | 销售客服 | 💼 | 沟通, 问题解决 |
| `finance` | 财务 | 财务会计 | 💰 | 数据分析, 报表 |
| `media` | 媒体 | 媒体宣传 | 📺 | 文案, 视频制作 |

---

### 2. TaskQueueView

**功能**: 显示和管理任务队列

#### Props 接口

```typescript
interface TaskQueueViewProps {
  showCompleted?: boolean;     // 是否显示已完成任务，默认 false
  autoRefresh?: boolean;       // 是否自动刷新，默认 true
  refreshInterval?: number;    // 刷新间隔（毫秒），默认 15000
  onTaskClick?: (taskId: string) => void;
  onReassign?: (taskId: string, newAgentId: string) => void;
  onCancel?: (taskId: string) => void;
}
```

#### 使用示例

```tsx
import { TaskQueueView } from '@/lib/agent-scheduler/dashboard/TaskQueueView';

export default function TaskQueuePage() {
  return (
    <div className="p-6">
      <h1>任务队列</h1>
      <TaskQueueView 
        showCompleted={false}
        autoRefresh={true}
        refreshInterval={15000}
        onTaskClick={(taskId) => console.log('Task clicked:', taskId)}
      />
    </div>
  );
}
```

#### 任务筛选

- **按状态筛选**: pending, assigned, in_progress, completed, failed, cancelled
- **按优先级筛选**: urgent, high, medium, low
- **按类型筛选**: architecture, research, implementation, testing, devops, design, marketing, sales, finance, media, general
- **搜索**: 任务标题或描述关键词

#### 任务操作

- **重新分配**: 选择新 Agent 分配任务
- **取消任务**: 中止任务执行
- **查看详情**: 点击任务卡片展开详情

---

### 3. ScheduleHistory

**功能**: 显示调度决策历史和推理过程

#### Props 接口

```typescript
interface ScheduleHistoryProps {
  limit?: number;                    // 显示的最大记录数，默认 50
  showReasoning?: boolean;           // 是否显示推理过程，默认 true
  showAlternatives?: boolean;        // 是否显示替代方案，默认 true
  autoRefresh?: boolean;             // 是否自动刷新，默认 true
  refreshInterval?: number;          // 刷新间隔（毫秒），默认 20000
  onDecisionClick?: (decisionId: string) => void;
}
```

#### 使用示例

```tsx
import { ScheduleHistory } from '@/lib/agent-scheduler/dashboard/ScheduleHistory';

export default function HistoryPage() {
  return (
    <div className="p-6">
      <h1>调度历史</h1>
      <ScheduleHistory 
        limit={50}
        showReasoning={true}
        showAlternatives={true}
        onDecisionClick={(decisionId) => console.log('Decision clicked:', decisionId)}
      />
    </div>
  );
}
```

#### 决策信息

- **任务信息**: 任务 ID、类型、优先级
- **分配 Agent**: 分配的 Agent 及其能力
- **置信度评分**: 0-100% 置信度可视化
- **推理过程**: AI 调度器的决策逻辑
- **替代方案**: 其他候选 Agent 及评分
- **执行结果**: 成功/失败/手动覆盖

#### 筛选选项

- **按结果筛选**: all, successful, failed, manual
- **按 Agent 筛选**: 特定 Agent 的决策
- **按时间范围**: 自定义时间范围
- **按置信度**: 置信度阈值过滤

---

### 4. ManualOverride

**功能**: 手动干预和覆盖自动调度决策

#### Props 接口

```typescript
interface ManualOverrideProps {
  requireConfirmation?: boolean;    // 是否需要确认对话框，默认 true
  logReasoning?: boolean;           // 是否记录干预原因，默认 true
  onOverride?: (decisionId: string, newAgentId: string, reason: string) => void;
  onCancel?: () => void;
}
```

#### 使用示例

```tsx
import { ManualOverride } from '@/lib/agent-scheduler/dashboard/ManualOverride';

export default function OverridePage() {
  return (
    <div className="p-6">
      <h1>手动干预</h1>
      <ManualOverride 
        requireConfirmation={true}
        logReasoning={true}
        onOverride={(decisionId, newAgentId, reason) => {
          console.log('Override:', decisionId, newAgentId, reason);
        }}
      />
    </div>
  );
}
```

#### 干预操作

- **选择任务**: 从待分配任务中选择
- **选择新 Agent**: 手动指定 Agent
- **填写原因**: 记录干预原因（审计追踪）
- **确认对话框**: 防止误操作

#### 审计追踪

每次手动干预都会记录：
- 干预时间
- 原始调度决策
- 新的 Agent 分配
- 干预原因
- 操作用户

---

### 5. Dashboard (主容器)

**功能**: 整合所有子组件的主容器

#### Props 接口

```typescript
interface DashboardProps {
  layout?: 'grid' | 'tabs' | 'accordion';  // 布局模式，默认 'grid'
  refreshInterval?: number;               // 全局刷新间隔
  enableNotifications?: boolean;           // 是否启用通知，默认 true
  theme?: 'light' | 'dark' | 'system';    // 主题模式
}
```

#### 使用示例

```tsx
import { Dashboard } from '@/lib/agent-scheduler/dashboard/Dashboard';

export default function SchedulerDashboardPage() {
  return (
    <Dashboard 
      layout="grid"
      refreshInterval={30000}
      enableNotifications={true}
      theme="dark"
    />
  );
}
```

#### 布局模式

- **Grid**: 网格布局，所有组件同时显示
- **Tabs**: 标签页布局，可切换查看不同组件
- **Accordion**: 手风琴布局，可折叠/展开组件

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.2.4 | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 4.x | 样式 |
| Recharts | latest | 雷达图可视化 |
| Zustand | 5.0.12 | 状态管理 |
| Lucide React | 0.577.0 | 图标库 |

---

## 性能优化

### 1. 数据缓存

```typescript
// 使用 useMemo 缓存计算结果
const filteredTasks = useMemo(() => {
  return tasks.filter(task => task.status !== 'completed');
}, [tasks]);
```

### 2. 虚拟滚动

对于大量任务列表，使用虚拟滚动优化性能：

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={tasks.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <TaskCard task={tasks[index]} />
    </div>
  )}
</FixedSizeList>
```

### 3. 防抖刷新

```typescript
import { useDebouncedCallback } from '@/lib/hooks/useDebounce';

const debouncedRefresh = useDebouncedCallback(
  () => refresh(),
  3000
);
```

---

## 测试

所有组件都包含完整的单元测试和集成测试：

```bash
# 运行所有 Dashboard 测试
npm test -- src/lib/agent-scheduler/dashboard/

# 运行特定组件测试
npm test -- AgentStatusPanel.spec.tsx
npm test -- TaskQueueView.spec.tsx
npm test -- ScheduleHistory.spec.tsx
npm test -- ManualOverride.spec.tsx
npm test -- Dashboard.integration.spec.tsx
```

### 测试覆盖

| 组件 | 单元测试 | 集成测试 | 覆盖率 |
|------|---------|---------|--------|
| AgentStatusPanel | ✅ | ✅ | 95%+ |
| TaskQueueView | ✅ | ✅ | 90%+ |
| ScheduleHistory | ✅ | ✅ | 92%+ |
| ManualOverride | ✅ | ✅ | 88%+ |
| Dashboard | ✅ | ✅ | 85%+ |

---

## 国际化 (i18n)

Dashboard 组件支持多语言：

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation('dashboard');

// 使用翻译
<h1>{t('agentStatusPanel.title')}</h1>
```

**支持的语言**: 中文 (zh), 英文 (en), 日语 (ja), 韩语 (ko), 西班牙语 (es), 法语 (fr), 德语 (de)

---

## 主题支持

Dashboard 支持三种主题模式：

```typescript
import { useTheme } from '@/hooks/useTheme';

const { theme, setTheme } = useTheme();

// 切换主题
setTheme('dark');  // dark | light | system
```

---

## 错误处理

所有组件都包含错误边界和优雅降级：

```typescript
class DashboardErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Dashboard error:', error, errorInfo);
    // 上报错误到监控服务
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-message">
          Dashboard 出现错误，请刷新页面重试
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 最佳实践

### 1. 数据刷新策略

```typescript
// 不要频繁刷新，使用合理的间隔
<AgentStatusPanel refreshInterval={30000} />  // 30 秒

// 对于实时性要求高的场景，使用 WebSocket
useEffect(() => {
  const ws = new WebSocket('wss://7zi.com');
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'agent:status') {
      updateAgentStatus(data.payload);
    }
  };
  return () => ws.close();
}, []);
```

### 2. 内存管理

```typescript
// 清理定时器
useEffect(() => {
  const interval = setInterval(() => {
    refresh();
  }, refreshInterval);

  return () => clearInterval(interval);
}, [refreshInterval, refresh]);
```

### 3. 大列表优化

```typescript
// 使用虚拟滚动
const VirtualizedTaskList = React.memo(({ tasks }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={tasks.length}
      itemSize={80}
    >
      {({ index, style }) => (
        <div style={style}>
          <TaskCard task={tasks[index]} />
        </div>
      )}
    </FixedSizeList>
  );
});
```

---

## 常见问题

### Q: 为什么 Agent 状态不更新？

**A**: 检查：
1. 刷新间隔是否设置合理（默认 30 秒）
2. WebSocket 连接是否正常
3. Agent 是否正常发送心跳

### Q: 如何提高任务调度效率？

**A**: 
1. 优化任务优先级设置
2. 调整 Agent 能力配置
3. 使用手动干预覆盖不合理的调度

### Q: Dashboard 性能如何优化？

**A**:
1. 启用虚拟滚动（大列表）
2. 合理设置刷新间隔
3. 使用 useMemo 和 useCallback 缓存
4. 按需加载数据

---

## 相关文档

- [API.md](../../../docs/API.md) - API 完整文档
- [agent-scheduler.md](../../../docs/api/agent-scheduler.md) - Agent 调度 API
- [scheduler-store.ts](../../stores/scheduler-store.ts) - 状态管理

---

**维护者**: 🎨 设计师 (AI 团队)
**最后更新**: 2026-03-29
**版本**: v1.4.0
