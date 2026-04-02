# WorkflowEditor - 可视化工作流编辑器

基于 React Flow 的工作流可视化编辑器，支持拖拽节点创建工作流。

## 功能特性

### 核心功能
- ✅ 可视化画布（React Flow）
- ✅ 拖拽节点创建
- ✅ 节点属性编辑
- ✅ 工作流验证
- ✅ 执行监控（模拟实现）
- ✅ 键盘快捷键
- ✅ 深色模式支持

### 节点类型
- **Start** - 工作流入口
- **End** - 工作流出口
- **Agent** - 执行 AI 任务
- **Condition** - 条件分支
- **Parallel** - 并行执行
- **Wait** - 等待时间或事件

## 安装

```bash
npm install reactflow zustand lucide-react react-hook-form zod
```

## 使用方法

### 基本使用

```tsx
import { WorkflowEditor } from '@/components/WorkflowEditor';

function App() {
  const handleSave = (workflow) => {
    console.log('Saved workflow:', workflow);
    // 调用 API 保存工作流
  };

  return (
    <WorkflowEditor
      onSave={handleSave}
      readOnly={false}
    />
  );
}
```

### 预设节点和边

```tsx
import { WorkflowEditor } from '@/components/WorkflowEditor';

function App() {
  const initialNodes = [
    { id: 'start', type: 'start', position: { x: 0, y: 0 } },
    { id: 'end', type: 'end', position: { x: 200, y: 0 } },
  ];

  const initialEdges = [
    { id: 'e1', source: 'start', target: 'end' },
  ];

  return (
    <WorkflowEditor
      workflowId="my-workflow"
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      onSave={handleSave}
    />
  );
}
```

### 只读模式

```tsx
<WorkflowEditor
  workflowId="view-workflow"
  readOnly={true}
/>
```

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+S | 保存工作流 |
| Ctrl+Enter | 运行工作流 |
| Ctrl+Shift+V | 验证工作流 |
| Delete / Backspace | 删除选中节点 |
| Ctrl+Z | 撤销 |
| Ctrl+Y | 重做 |
| Escape | 取消选择 |

## 组件结构

```
WorkflowEditor/
├── WorkflowEditor.tsx          # 主编辑器组件
├── Toolbar.tsx                 # 工具栏
├── NodePalette.tsx             # 节点面板
├── StatusBar.tsx               # 状态栏
├── ExecutionPanel.tsx          # 执行面板
├── ValidationPanel.tsx        # 验证面板
├── NodeTypes/                  # 节点类型
│   ├── StartNode.tsx
│   ├── EndNode.tsx
│   ├── AgentNode.tsx
│   ├── ConditionNode.tsx
│   ├── ParallelNode.tsx
│   └── WaitNode.tsx
├── EdgeTypes/                  # 边类型
│   └── index.ts
├── PropertiesPanel/            # 属性面板
│   ├── NodeProperties.tsx
│   └── index.ts
├── hooks/                      # 自定义 Hooks
│   ├── useWorkflowValidation.ts
│   └── useWorkflowExecution.ts
├── stores/                     # 状态管理
│   └── workflow-store.ts
├── constants.ts                # 常量定义
├── types.ts                    # TypeScript 类型
└── index.ts                    # 导出
```

## 与后端集成

### 保存工作流

```typescript
async function handleSave(workflow: WorkflowDefinition) {
  const response = await fetch('/api/workflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow),
  });

  if (!response.ok) {
    throw new Error('Failed to save workflow');
  }
}
```

### 执行工作流

```typescript
async function executeWorkflow(workflowId: string, inputs?: Record<string, any>) {
  const response = await fetch(`/api/workflows/${workflowId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs }),
  });

  if (!response.ok) {
    throw new Error('Failed to execute workflow');
  }

  return response.json();
}
```

### WebSocket 实时更新

```typescript
const ws = new WebSocket('/api/workflows/subscribe');

ws.onmessage = (event) => {
  const { type, payload } = JSON.parse(event.data);

  switch (type) {
    case 'instance.update':
      // 更新执行状态
      updateExecutionState(payload);
      break;
    case 'instance.completed':
      // 工作流执行完成
      handleCompletion(payload);
      break;
  }
};
```

## 自定义节点

创建自定义节点类型：

```tsx
import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { WorkflowNodeData } from '../types';

export const CustomNodeType = memo((props: NodeProps<WorkflowNodeData>) => {
  const { data, selected } = props;

  return (
    <div className={`workflow-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-content">
        <span className="icon">🎯</span>
        <span className="label">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

// 注册节点类型
import { addEdge } from 'reactflow';
import { CustomNodeType } from './CustomNode';

const nodeTypes = {
  custom: CustomNodeType,
  // ... 其他节点类型
};
```

## 样式自定义

### 修改节点颜色

编辑 `constants.ts` 中的 `NODE_COLORS`:

```typescript
export const NODE_COLORS = {
  start: {
    light: '#10B981',
    dark: '#34D399',
    bg: '#D1FAE5',
  },
  // ... 其他节点类型
};
```

### 修改主题

使用 Tailwind CSS 的 `dark:` 类：

```tsx
<div className="bg-white dark:bg-gray-800">
  <div className="text-gray-900 dark:text-white">
    Dark mode support
  </div>
</div>
```

## 验证规则

### 结构验证
- 必须有且只有一个 Start 节点
- 必须有且只有一个 End 节点
- 每个节点必须有入边（除了 Start）
- 每个节点必须有出边（除了 End）
- 不允许循环

### 配置验证
- Agent 节点必须配置 agentType
- Condition 节点必须配置条件表达式
- Wait 节点必须配置等待类型

## 开发计划

### Phase 1: 基础框架 ✅
- [x] 创建目录结构
- [x] 实现主编辑器组件
- [x] 集成 React Flow
- [x] 实现基础节点类型

### Phase 2: 节点编辑器 ✅
- [x] 实现属性面板
- [x] 节点配置表单
- [x] 表单验证

### Phase 3: 工作流操作 ✅
- [x] 节点拖放
- [x] 边连接
- [x] 快捷键
- [x] 撤销/重做

### Phase 4: 执行集成 🔄
- [x] 验证系统
- [x] 执行监控面板（模拟）
- [ ] 集成 EnhancedWorkflowExecutor
- [ ] WebSocket 实时更新

### Phase 5: 优化 📋
- [ ] 性能优化
- [ ] 响应式适配
- [ ] 模板系统
- [ ] 单元测试

## 许可证

MIT

---

**创建者**: 🎨 设计师
**版本**: v1.7.0
**日期**: 2026-04-01
