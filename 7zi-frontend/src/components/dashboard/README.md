# AgentStatusPanel 组件使用文档

## 组件简介

AgentStatusPanel 是一个用于监控 AI Agent 状态的 Dashboard 组件，提供实时状态显示、任务追踪、资源监控等功能。

## 特性

- ✅ 实时状态显示（运行中/空闲/离线/错误）
- ✅ 任务进度追踪
- ✅ 资源使用监控（CPU、内存）
- ✅ 搜索和筛选功能
- ✅ 分页支持
- ✅ 自动刷新
- ✅ 响应式设计
- ✅ 支持暗色模式
- ✅ TypeScript 类型完整

## 基础用法

```tsx
import { AgentStatusPanel } from '@/components/dashboard'

function Dashboard() {
  const agents = [
    {
      id: '1',
      name: 'Designer',
      type: 'designer',
      status: 'active',
      description: 'UI/UX 设计专家',
      currentTask: {
        id: 'task-1',
        title: '设计 Dashboard 界面',
        type: 'design',
        status: 'running',
        progress: 65,
        startedAt: '2026-03-30T10:00:00Z',
      },
      resourceUsage: {
        cpu: 45,
        memory: 60,
      },
      lastActiveAt: '2026-03-30T14:00:00Z',
      enabled: true,
    },
    // ... 更多 agents
  ]

  return (
    <AgentStatusPanel
      agents={agents}
      showResourceDetails={true}
      refreshInterval={30000}
      onRefresh={() => console.log('refreshing...')}
      onViewDetails={agent => console.log('view details:', agent)}
      onToggleAgent={(agentId, enabled) => console.log('toggle:', agentId, enabled)}
    />
  )
}
```

## 实时数据获取

如果你需要从 API 获取实时数据，可以使用 `fetchAgents` 属性：

```tsx
import { AgentStatusPanel } from '@/components/dashboard'

function Dashboard() {
  const fetchAgents = async () => {
    const response = await fetch('/api/agents')
    const data = await response.json()
    return data
  }

  return (
    <AgentStatusPanel
      fetchAgents={fetchAgents}
      refreshInterval={30000} // 每 30 秒刷新一次
    />
  )
}
```

## Props 说明

### AgentStatusPanelProps

| 属性                  | 类型                                          | 默认值      | 说明                        |
| --------------------- | --------------------------------------------- | ----------- | --------------------------- |
| `agents`              | `Agent[] \| null \| undefined`                | `undefined` | Agent 列表数据              |
| `loading`             | `boolean`                                     | `false`     | 是否加载中                  |
| `error`               | `string \| null`                              | `null`      | 错误信息                    |
| `onRefresh`           | `() => void \| Promise<void>`                 | -           | 刷新回调                    |
| `onViewDetails`       | `(agent: Agent) => void`                      | -           | Agent 详情查看回调          |
| `onToggleAgent`       | `(agentId: string, enabled: boolean) => void` | -           | Agent 启用/禁用切换回调     |
| `className`           | `string`                                      | -           | 自定义类名                  |
| `pageSize`            | `number`                                      | `10`        | 每页显示数量                |
| `showResourceDetails` | `boolean`                                     | `true`      | 是否显示资源使用详情        |
| `refreshInterval`     | `number`                                      | -           | 刷新间隔（毫秒）            |
| `statusFilter`        | `Agent['status'][]`                           | -           | 状态筛选                    |
| `fetchAgents`         | `() => Promise<Agent[]>`                      | -           | 自定义获取 Agent 数据的函数 |

### Agent 接口

```typescript
interface Agent {
  id: string
  name: string
  type: 'designer' | 'developer' | 'tester' | 'manager' | 'custom'
  status: 'active' | 'idle' | 'offline' | 'error'
  description?: string
  currentTask?: AgentTask
  resourceUsage?: ResourceUsage
  lastActiveAt: string
  enabled: boolean
}
```

### AgentTask 接口

```typescript
interface AgentTask {
  id: string
  title: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number // 0-100
  startedAt: string
  estimatedCompletionAt?: string
}
```

### ResourceUsage 接口

```typescript
interface ResourceUsage {
  cpu: number // 0-100
  memory: number // 0-100
  network?: {
    inbound: number
    outbound: number
  }
  custom?: {
    name: string
    value: number
    unit: string
  }[]
}
```

## 状态说明

| 状态      | 颜色 | 说明                 |
| --------- | ---- | -------------------- |
| `active`  | 绿色 | Agent 正在执行任务   |
| `idle`    | 蓝色 | Agent 空闲，等待任务 |
| `offline` | 灰色 | Agent 离线           |
| `error`   | 红色 | Agent 发生错误       |

## Agent 类型说明

| 类型        | 图标 | 说明   |
| ----------- | ---- | ------ |
| `designer`  | 🎨   | 设计师 |
| `developer` | 💻   | 开发者 |
| `tester`    | 🧪   | 测试员 |
| `manager`   | 📋   | 管理者 |
| `custom`    | ⚙️   | 自定义 |

## 完整示例

```tsx
'use client'

import { AgentStatusPanel, type Agent } from '@/components/dashboard'
import { useState, useEffect } from 'react'

export default function AgentDashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/agents')
      const data = await response.json()
      setAgents(data)
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (agent: Agent) => {
    console.log('Viewing details for:', agent.name)
    // 打开详情弹窗或跳转到详情页
  }

  const handleToggleAgent = async (agentId: string, enabled: boolean) => {
    try {
      await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      await fetchAgents() // 刷新列表
    } catch (error) {
      console.error('Failed to toggle agent:', error)
    }
  }

  return (
    <div className="p-6">
      <AgentStatusPanel
        agents={agents}
        loading={loading}
        showResourceDetails={true}
        pageSize={12}
        onRefresh={fetchAgents}
        onViewDetails={handleViewDetails}
        onToggleAgent={handleToggleAgent}
        className="mx-auto max-w-7xl"
      />
    </div>
  )
}
```

## 注意事项

1. **性能优化**：组件使用了 `React.memo`、`useCallback` 和 `useMemo` 来优化渲染性能
2. **响应式设计**：在不同屏幕尺寸下会自动调整布局
3. **暗色模式**：支持暗色模式，会自动适应系统主题
4. **类型安全**：完整的 TypeScript 类型定义
5. **国际化**：组件内部使用 `react-i18next` 进行国际化

## 样式定制

组件使用 Tailwind CSS，你可以通过 `className` 属性来自定义样式：

```tsx
<AgentStatusPanel agents={agents} className="rounded-lg bg-gray-50 p-4" />
```

## 版本历史

- **v1.5.0** (2026-03-30): 初始版本
  - 基础 Agent 状态监控功能
  - 实时刷新支持
  - 搜索和筛选功能
  - 分页支持
  - 资源使用监控
