# WorkflowEditor - 可视化工作流编辑器 v1.9.1

基于 React Flow 的工作流可视化编辑器，支持拖拽节点创建工作流，包含完整的撤销/重做功能。

## 🎉 v1.9.1 新功能

### 新增节点类型

- **Loop** - 循环节点，支持计数循环、条件循环、集合循环
- **Subworkflow** - 子工作流节点，用于调用和执行子工作流
- **Transform** - 数据转换节点，支持数据转换和处理

### 新增功能

- **节点搜索** - 在节点面板中快速搜索和过滤节点
- **导出/导入** - 支持将工作流导出为 JSON 文件，或从 JSON 文件导入
- **表达式编辑器** - 带语法高亮的表达式编辑器，支持变量自动完成
- **自定义节点注册** - 支持动态注册自定义节点类型
- **移动端优化** - 改进的响应式设计，更好的移动端支持

## 功能特性

### 核心功能

- ✅ 可视化画布（React Flow）
- ✅ 拖拽节点创建
- ✅ 节点属性编辑
- ✅ 工作流验证
- ✅ 执行监控（模拟实现）
- ✅ 键盘快捷键
- ✅ 撤销/重做功能
- ✅ 深色模式支持
- ✅ 响应式设计

### 节点类型

- **Start** - 工作流入口
- **End** - 工作流出口
- **Agent** - 执行 AI 任务
- **Condition** - 条件分支
- **Parallel** - 并行执行
- **Wait** - 等待时间或事件
- **Human Input** - 等待人工输入
- **Loop** - 循环执行（v1.9.1 新增）
- **Subworkflow** - 调用子工作流（v1.9.1 新增）
- **Transform** - 数据转换（v1.9.1 新增）

## 安装

```bash
npm install reactflow zustand zundo lucide-react react-hook-form zod
```

## 使用方法

### 基本使用

```tsx
import { WorkflowEditor } from '@/components/WorkflowEditor'

function App() {
  const handleSave = workflow => {
    console.log('Saved workflow:', workflow)
    // 调用 API 保存工作流
  }

  return <WorkflowEditor onSave={handleSave} readOnly={false} />
}
```

### 预设节点和边

```tsx
import { WorkflowEditor } from '@/components/WorkflowEditor'

function App() {
  const initialNodes = [
    { id: 'start', type: 'start', position: { x: 0, y: 0 } },
    { id: 'end', type: 'end', position: { x: 200, y: 0 } },
  ]

  const initialEdges = [{ id: 'e1', source: 'start', target: 'end' }]

  return (
    <WorkflowEditor
      workflowId="my-workflow"
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      onSave={handleSave}
    />
  )
}
```

### 只读模式

```tsx
<WorkflowEditor workflowId="view-workflow" readOnly={true} />
```

### 导出/导入工作流（v1.9.1）

```tsx
import { WorkflowEditor } from '@/components/WorkflowEditor'

function App() {
  const handleExport = (exportData) => {
    console.log('Exported:', exportData)
    // exportData 包含版本信息和完整工作流数据
  }

  const handleImport = (workflow) => {
    console.log('Imported:', workflow)
    // workflow 是导入的工作流定义
  }

  return (
    <WorkflowEditor
      onExport={handleExport}
      onImport={handleImport}
    />
  )
}
```

### 自定义节点注册（v1.9.1）

```tsx
import { useCustomNodes } from '@/components/WorkflowEditor'

function MyCustomNode({ data, selected }) {
  return (
    <div className={`custom-node ${selected ? 'selected' : ''}`}>
      <div>{data.label}</div>
    </div>
  )
}

function App() {
  const { registerNode } = useCustomNodes()

  useEffect(() => {
    registerNode({
      type: 'myCustom',
      label: 'My Custom Node',
      icon: '🎯',
      description: '自定义节点',
      category: 'custom',
      defaultConfig: {},
      render: MyCustomNode,
    })
  }, [registerNode])

  return <WorkflowEditor />
}
```

## 键盘快捷键

| 快捷键             | 功能         |
| ------------------ | ------------ |
| Ctrl+S             | 保存工作流   |
| Ctrl+Enter         | 运行工作流   |
| Ctrl+Shift+V       | 验证工作流   |
| Delete / Backspace | 删除选中节点 |
| Ctrl+Z             | 撤销         |
| Ctrl+Y             | 重做         |
| Escape             | 取消选择     |
| Ctrl+=             | 放大         |
| Ctrl+-             | 缩小         |
| Ctrl+0             | 重置缩放     |

## 撤销/重做功能

### 功能说明

编辑器内置了完整的撤销/重做功能，基于 Zustand + zundo 实现：

- **历史记录限制**: 最多保存 50 步操作
- **支持的操作**:
  - 添加/删除节点
  - 添加/删除边
  - 更新节点属性
  - 移动节点位置
- **快捷键**: Ctrl+Z (撤销), Ctrl+Y (重做)
- **工具栏按钮**: 顶部工具栏提供撤销/重做按钮

### 使用示例

```tsx
import { useUndoRedo } from '@/components/WorkflowEditor'

function MyComponent() {
  const { undo, redo, canUndo, canRedo, historySize } = useUndoRedo()

  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>
        撤销 ({historySize})
      </button>
      <button onClick={redo} disabled={!canRedo}>
        重做
      </button>
    </div>
  )
}
```

## 表达式编辑器（v1.9.1）

### 功能说明

表达式编辑器提供语法高亮和自动完成功能：

- **语法高亮**: 支持 JavaScript 表达式语法
- **变量自动完成**: 输入 `{{` 时自动显示可用变量
- **多语言支持**: JavaScript、JSON、表达式模式

### 使用示例

```tsx
import { ExpressionEditor } from '@/components/WorkflowEditor'

function MyForm() {
  const [expression, setExpression] = useState('return data * 2')

  return (
    <ExpressionEditor
      value={expression}
      onChange={setExpression}
      language="javascript"
      variables={['data', 'index', 'count']}
    />
  )
}
```

## 组件结构

```
WorkflowEditor/
├── WorkflowEditor.tsx          # 主编辑器组件
├── Toolbar.tsx                 # 工具栏（含撤销/重做按钮）
├── NodePalette.tsx             # 节点面板（含搜索功能）
├── StatusBar.tsx               # 状态栏
├── ExecutionPanel.tsx          # 执行面板
├── ValidationPanel.tsx        # 验证面板
├── ExpressionEditor.tsx        # 表达式编辑器（v1.9.1）
├── WorkflowExporter.tsx        # 导出/导入组件（v1.9.1）
├── NodeTypes/                  # 节点类型
│   ├── StartNode.tsx
│   ├── EndNode.tsx
│   ├── AgentNode.tsx
│   ├── ConditionNode.tsx
│   ├── ParallelNode.tsx
│   ├── WaitNode.tsx
│   ├── HumanInputNode.tsx
│   ├── LoopNode.tsx            # v1.9.1
│   ├── SubworkflowNode.tsx     # v1.9.1
│   ├── TransformNode.tsx       # v1.9.1
│   └── index.tsx
├── EdgeTypes/                  # 边类型
│   └── index.ts
├── PropertiesPanel/            # 属性面板
│   ├── NodeProperties.tsx
│   └── index.ts
├── hooks/                      # 自定义 Hooks
│   ├── useWorkflowValidation.ts
│   ├── useWorkflowExecution.ts
│   ├── useCustomNodes.ts       # v1.9.1
│   └── useWorkflowExport.ts    # v1.9.1
├── stores/                     # 状态管理
│   ├── workflow-store.ts       # 基础 store
│   └── workflow-editor-store.ts # 带撤销/重做的 store
├── constants.ts                # 常量定义
├── types.ts                    # TypeScript 类型
├── index.ts                    # 导出
└── __tests__/                  # 测试文件
    ├── workflow-editor-store.test.ts
    ├── LoopNode.test.tsx       # v1.9.1
    ├── SubworkflowNode.test.tsx # v1.9.1
    └── TransformNode.test.tsx  # v1.9.1
```

## 与后端集成

### 保存工作流

```typescript
async function handleSave(workflow: WorkflowDefinition) {
  const response = await fetch('/api/workflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow),
  })

  if (!response.ok) {
    throw new Error('Failed to save workflow')
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
  })

  if (!response.ok) {
    throw new Error('Failed to execute workflow')
  }

  return response.json()
}
```

### WebSocket 实时更新

```typescript
const ws = new WebSocket('/api/workflows/subscribe')

ws.onmessage = event => {
  const { type, payload } = JSON.parse(event.data)

  switch (type) {
    case 'instance.update':
      // 更新执行状态
      updateExecutionState(payload)
      break
    case 'instance.completed':
      // 工作流执行完成
      handleCompletion(payload)
      break
  }
}
```

## 自定义节点

创建自定义节点类型：

```tsx
import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { WorkflowNodeData } from '../types'

export const CustomNodeType = memo((props: NodeProps<WorkflowNodeData>) => {
  const { data, selected } = props

  return (
    <div className={`workflow-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-content">
        <span className="icon">🎯</span>
        <span className="label">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
})

// 注册节点类型
import { addEdge } from 'reactflow'
import { CustomNodeType } from './CustomNode'

const nodeTypes = {
  custom: CustomNodeType,
  // ... 其他节点类型
}
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
}
```

### 修改主题

使用 Tailwind CSS 的 `dark:` 类：

```tsx
<div className="bg-white dark:bg-gray-800">
  <div className="text-gray-900 dark:text-white">Dark mode support</div>
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
- Loop 节点必须配置循环类型（v1.9.1）
- Subworkflow 节点必须配置子工作流 ID（v1.9.1）

## 测试

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test workflow-editor-store.test.ts

# 监听模式
pnpm test --watch
```

### 测试覆盖

- ✅ Store 基础操作测试
- ✅ 撤销/重做功能测试
- ✅ 选择操作测试
- ✅ 视图操作测试
- ✅ 状态标记测试
- ✅ 重置操作测试
- ✅ Loop 节点测试（v1.9.1）
- ✅ Subworkflow 节点测试（v1.9.1）
- ✅ Transform 节点测试（v1.9.1）

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
- [x] 撤销/重做 ✨

### Phase 4: 执行集成 🔄

- [x] 验证系统
- [x] 执行监控面板（模拟）
- [ ] 集成 EnhancedWorkflowExecutor
- [ ] WebSocket 实时更新

### Phase 5: v1.9.1 新功能 ✅

- [x] 循环节点
- [x] 子工作流节点
- [x] 数据转换节点
- [x] 节点搜索
- [x] 导出/导入
- [x] 表达式编辑器
- [x] 自定义节点注册

### Phase 6: 优化 📋

- [ ] 性能优化
- [ ] 响应式适配
- [ ] 模板系统
- [ ] 单元测试

## 版本历史

### v1.9.1 (2026-04-03)

**新增功能**:
- ✨ 新增循环节点（Loop）
- ✨ 新增子工作流节点（Subworkflow）
- ✨ 新增数据转换节点（Transform）
- ✨ 节点面板新增搜索功能
- ✨ 新增导出/导入功能
- ✨ 新增表达式编辑器
- ✨ 支持自定义节点注册
- ✨ 优化移动端支持

**改进**:
- 📝 更新文档说明
- 🧪 添加新节点测试用例
- 🔧 优化类型定义
- 🎨 改进 UI/UX

### v1.9.0 (2026-04-03)

**新增功能**:
- ✨ 添加完整的撤销/重做功能
- ✨ 集成 zundo middleware
- ✨ 工具栏新增撤销/重做按钮
- ✨ 支持键盘快捷键 Ctrl+Z / Ctrl+Y
- ✨ 历史记录限制（最多 50 步）

**改进**:
- 📝 更新文档说明
- 🧪 添加撤销/重做测试用例
- 🔧 优化 store 结构

### v1.7.0 (2026-04-01)

**初始版本**:
- ✅ 基础编辑器框架
- ✅ 节点拖放和连接
- ✅ 属性面板
- ✅ 验证系统
- ✅ 执行监控（模拟）

## 许可证

MIT

---

**创建者**: 🎨 设计师
**版本**: v1.9.1
**日期**: 2026-04-03