# AgentStatusPanel 使用示例

## 基本使用

```tsx
import { AgentStatusPanel } from '@/components/dashboard';

export default function Dashboard() {
  return (
    <div>
      <AgentStatusPanel />
    </div>
  );
}
```

## 带回调功能

```tsx
import { AgentStatusPanel } from '@/components/dashboard';
import { useSchedulerStore } from '@/lib/agents/scheduler/stores/scheduler-store';

export default function Dashboard() {
  const selectAgent = useSchedulerStore(state => state.selectAgent);

  const handleAgentClick = (agent) => {
    selectAgent(agent.agentId);
    // 显示 agent 详情或其他操作
  };

  return (
    <AgentStatusPanel onAgentClick={handleAgentClick} />
  );
}
```

## 自定义选项

```tsx
import { AgentStatusPanel } from '@/components/dashboard';

export default function Dashboard() {
  return (
    <AgentStatusPanel
      showRefresh={true}
      showMetrics={true}
      autoRefresh={true}
      refreshInterval={10000} // 10 秒刷新
      maxDisplay={8}
      initialFilter="busy" // 初始筛选忙碌状态
      className="my-4"
    />
  );
}
```

## 紧凑版本（用于侧边栏）

```tsx
import { AgentStatusCompact } from '@/components/dashboard';

export default function Sidebar() {
  return (
    <div className="sidebar">
      <AgentStatusCompact />
    </div>
  );
}
```

## 完整页面示例

```tsx
'use client';

import { AgentStatusPanel } from '@/components/dashboard';
import { useSchedulerStore } from '@/lib/agents/scheduler/stores/scheduler-store';
import { useEffect } from 'react';

export default function AgentDashboard() {
  const { initialize, isLoading, error } = useSchedulerStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleAgentClick = (agent) => {
    console.log('Selected agent:', agent);
  };

  if (isLoading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return <div>错误: {error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">智能体调度中心</h1>
      <AgentStatusPanel
        onAgentClick={handleAgentClick}
        showMetrics={true}
        autoRefresh={true}
        refreshInterval={10000}
      />
    </div>
  );
}
```

## Props 说明

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `showRefresh` | `boolean` | `true` | 是否显示刷新按钮 |
| `showMetrics` | `boolean` | `true` | 是否显示详细指标 |
| `autoRefresh` | `boolean` | `true` | 是否自动刷新 |
| `refreshInterval` | `number` | `10000` | 自动刷新间隔（毫秒） |
| `className` | `string` | `''` | 自定义 CSS 类名 |
| `onAgentClick` | `(agent: AgentCapability) => void` | `undefined` | 点击 Agent 卡片的回调 |
| `maxDisplay` | `number` | `undefined` | 最大显示数量 |
| `initialFilter` | `StatusFilter` | `'all'` | 初始状态筛选 |

## 状态说明

Agent 有四种状态：

- **idle (空闲)**: 蓝色指示器，Agent 可用但当前无任务
- **busy (忙碌)**: 绿色指示器，Agent 当前正在处理任务
- **offline (离线)**: 灰色指示器，Agent 不可用或长时间未活跃
- **error (错误)**: 红色指示器，Agent 遇到错误

状态根据以下规则确定：
- `!agent.availability` → offline
- `now - agent.lastActiveTime > 300000` (5分钟) → offline
- `agent.currentLoad < 0` → error
- `agent.currentLoad > 0` → busy
- 其他情况 → idle

## 状态筛选

支持通过顶部筛选按钮按状态筛选 Agent：

```tsx
<AgentStatusPanel initialFilter="busy" />
```

筛选选项：
- `all` - 显示全部
- `idle` - 仅显示空闲
- `busy` - 仅显示忙碌
- `offline` - 仅显示离线
- `error` - 仅显示错误

## 显示信息

每个 Agent 卡片显示：
- Agent ID 和名称
- 当前状态（idle/busy/offline/error）
- 当前任务（如有，显示任务标题、优先级、预计时间）
- CPU 和内存使用率
- Provider 信息
- 负载百分比
- 最后心跳时间
- 性能指标（可选显示）
