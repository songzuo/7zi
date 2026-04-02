# CollaborationGraph 组件设计文档

**版本**: v1.7.0 Phase 3  
**创建日期**: 2026-04-02  
**作者**: AI Executor 子代理

---

## 概述

CollaborationGraph 是一个用于可视化 Agent 协作流程的 React 组件。它使用 React Flow 库实现交互式图形界面，展示 Agent 节点之间的任务流转关系。

## 功能特性

### 核心功能

1. **节点可视化**
   - 每个 Agent 显示为独立节点
   - 显示状态指示器（idle/running/error/offline）
   - 显示负载百分比和最后活动时间
   - 支持自定义头像（emoji 或 URL）

2. **连接可视化**
   - 边代表任务流转方向
   - 支持动画效果（活跃任务）
   - 支持标签显示任务类型

3. **交互功能**
   - 拖拽节点布局
   - 缩放和平移
   - 小地图导航
   - 节点/边点击事件

4. **实时更新**
   - 支持通过 WebSocket 接收状态变化
   - 自动更新节点状态和负载
   - 平滑的动画过渡

### UI/UX 设计

- **Glassmorphism 风格**: 半透明背景 + 模糊效果
- **深色/浅色主题**: 自动适应系统主题
- **状态颜色编码**:
  - 🟢 空闲 (Idle) - 翡翠绿
  - 🔵 运行中 (Running) - 蓝色
  - 🔴 错误 (Error) - 红色
  - ⚫ 离线 (Offline) - 灰色

## 技术架构

### 依赖

```json
{
  "@xyflow/react": "^12.10.2",
  "react": "^19.2.4"
}
```

### 类型定义

```typescript
// Agent 状态类型
export type AgentStatus = "idle" | "running" | "error" | "offline";

// Agent 节点数据
export interface AgentNode {
  id: string;
  name: string;
  status: AgentStatus;
  lastActivity: number;
  avatar?: string;
  currentTask?: string;
  load?: number;
}

// 连接数据
export interface ConnectionData {
  source: string;
  target: string;
  taskId?: string;
  taskType?: string;
  label?: string;
}

// 组件 Props
export interface CollaborationGraphProps {
  agentNodes: AgentNode[];
  connections: ConnectionData[];
  onAgentUpdate?: (agentId: string, updates: Partial<AgentNode>) => void;
  onConnectionClick?: (connection: ConnectionData) => void;
  className?: string;
  enableRealtime?: boolean;
}
```

### 组件结构

```
CollaborationGraph/
├── 主组件 (ReactFlow 容器)
│   ├── Background (网格背景)
│   ├── Controls (缩放/平移控制)
│   ├── MiniMap (小地图)
│   ├── Panel - 图例 (左上)
│   └── Panel - 统计 (右上)
├── AgentNode (自定义节点组件)
│   ├── 状态指示器
│   ├── 头像 + 名称
│   ├── 负载条
│   └── 当前任务信息
└── Edges (连接线)
    ├── 静态边 (默认样式)
    └── 活跃边 (动画效果)
```

## 使用示例

### 基础用法

```tsx
import { CollaborationGraph, AgentNode, ConnectionData } from "@/components/agent-dashboard/CollaborationGraph";

const agents: AgentNode[] = [
  { id: "executor", name: "Executor", status: "running", lastActivity: Date.now(), load: 75 },
  { id: "architect", name: "Architect", status: "idle", lastActivity: Date.now() - 60000, load: 0 },
  { id: "tester", name: "Tester", status: "idle", lastActivity: Date.now() - 120000, load: 20 },
];

const connections: ConnectionData[] = [
  { source: "executor", target: "tester", taskType: "code-review", label: "代码审查" },
  { source: "architect", target: "executor", taskType: "design", label: "设计方案" },
];

function Dashboard() {
  return (
    <div className="h-[600px]">
      <CollaborationGraph
        agentNodes={agents}
        connections={connections}
        enableRealtime={true}
      />
    </div>
  );
}
```

### 实时更新集成

```tsx
import { useEffect, useState } from "react";
import { CollaborationGraph, AgentNode, ConnectionData } from "@/components/agent-dashboard/CollaborationGraph";

function RealtimeDashboard() {
  const [agents, setAgents] = useState<AgentNode[]>([]);
  const [connections, setConnections] = useState<ConnectionData[]>([]);

  useEffect(() => {
    // 连接 WebSocket
    const ws = new WebSocket("wss://api.example.com/agent-status");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "agent-update") {
        setAgents((prev) =>
          prev.map((agent) =>
            agent.id === data.agentId
              ? { ...agent, ...data.updates }
              : agent
          )
        );
      }

      if (data.type === "connection-update") {
        setConnections(data.connections);
      }
    };

    return () => ws.close();
  }, []);

  return (
    <CollaborationGraph
      agentNodes={agents}
      connections={connections}
      enableRealtime={false} // 我们自己管理更新
    />
  );
}
```

## 性能优化

### 已实现的优化

1. **React.memo**: AgentNode 组件使用 memo 避免不必要重渲染
2. **useMemo**: 颜色、样式等计算使用 useMemo 缓存
3. **useCallback**: 事件处理函数使用 useCallback 稳定引用
4. **节点类型预定义**: nodeTypes 对象在组件外定义

### 推荐优化

1. **虚拟化**: 对于超过 100 个节点，考虑使用虚拟化渲染
2. **节流更新**: WebSocket 更新使用节流，避免过于频繁的状态更新
3. **Web Worker**: 复杂布局算法移至 Web Worker

## 可访问性

- 所有图标使用 `role="img"` 和 `aria-label`
- 颜色对比度符合 WCAG AA 标准
- 键盘导航支持（通过 React Flow）

## 未来扩展

### Phase 2 计划

- [ ] 支持节点分组（按团队/项目）
- [ ] 添加时间轴视图（任务历史回放）
- [ ] 支持导出为图片/PDF
- [ ] 添加搜索和过滤功能

### Phase 3 计划

- [ ] 3D 可视化视图
- [ ] 增强现实 (AR) 支持
- [ ] 语音交互

## 测试建议

### 单元测试

```typescript
import { render, screen } from "@testing-library/react";
import { CollaborationGraph } from "./CollaborationGraph";

test("renders agent nodes", () => {
  const agents = [
    { id: "test", name: "Test Agent", status: "idle", lastActivity: Date.now() }
  ];

  render(
    <CollaborationGraph
      agentNodes={agents}
      connections={[]}
    />
  );

  expect(screen.getByText("Test Agent")).toBeInTheDocument();
});
```

### 集成测试

- 测试节点拖拽功能
- 测试缩放和平移
- 测试实时更新
- 测试主题切换

## 相关文档

- [React Flow 官方文档](https://reactflow.dev/)
- [Agent Dashboard 设计文档](../src/lib/agents/scheduler/dashboard/README.md)
- [A2A 协议文档](../A2A_PROTOCOL_V2_1_DESIGN.md)

---

**维护者**: AI Team  
**最后更新**: 2026-04-02
