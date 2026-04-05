# 📄 工作流组件文档

## 概述

工作流组件库提供完整的可视化工作流编辑器功能，支持拖拽设计、节点配置、版本管理等功能。

## 组件列表

| 组件 | 文件 | 说明 |
|------|------|------|
| WorkflowCanvas | `WorkflowCanvas.tsx` | 基础画布组件 |
| WorkflowCanvas.enhanced | `WorkflowCanvas.enhanced.tsx` | 增强画布（拖拽支持） |
| NodePalette | `NodePalette.tsx` | 节点面板 |
| NodeContextMenu | `NodeContextMenu.tsx` | 右键菜单 |
| WorkflowToolbar | `WorkflowToolbar.tsx` | 工具栏 |
| WorkflowEditor | `WorkflowEditor.tsx` | 工作流编辑器 |
| WorkflowEditorEnhanced | `WorkflowEditorEnhanced.tsx` | 增强编辑器 |
| WorkflowEditorWithDraft | `WorkflowEditorWithDraft.tsx` | 草稿支持编辑器 |
| NodeEditorPanel | `NodeEditorPanel.tsx` | 节点编辑器面板 |
| QuickTaskModal | `QuickTaskModal.tsx` | 快速任务创建 |
| TaskCreationChat | `TaskCreationChat.tsx` | 对话式任务创建 |
| TaskPreviewPanel | `TaskPreviewPanel.tsx` | 任务预览面板 |
| WorkflowVersionHistory | `WorkflowVersionHistory.tsx` | 版本历史 |
| WorkflowVersionHistory | `WorkflowVersionHistory.tsx` | 任务版本历史 |

---

## 1. NodePalette 节点面板

### 用途说明

提供所有可用节点类型的快速访问，支持拖拽和点击添加到画布。

### Props 接口

```typescript
interface NodePaletteProps {
  /** 是否禁用 */
  disabled?: boolean
  /** 节点点击回调 */
  onNodeClick?: (type: NodeType) => void
  /** 自定义样式类 */
  className?: string
}
```

### 使用示例

```tsx
import { NodePalette, NodeType } from '@/components/workflow'

<NodePalette
  disabled={false}
  onNodeClick={(type: NodeType) => {
    console.log('Selected node type:', type)
  }}
/>
```

### 注意事项

- 支持 6 种节点类型：start, end, task, condition, parallel, wait
- 每个节点类型有对应的图标、标签和描述
- 卡片式设计，带颜色编码

---

## 2. WorkflowCanvas.enhanced 增强画布

### 用途说明

功能丰富的画布组件，支持拖拽放置、节点移动、连接线绘制等功能。

### Props 接口

```typescript
interface WorkflowCanvasProps {
  /** 节点列表 */
  nodes: WorkflowNodeData[]
  /** 边列表 */
  edges: WorkflowEdgeData[]
  /** 选中的节点ID */
  selectedNodeId?: string
  /** 节点选择回调 */
  onNodeSelect?: (nodeId: string | undefined) => void
  /** 节点移动回调 */
  onNodeMove?: (nodeId: string, position: { x: number; y: number }) => void
  /** 节点添加回调 */
  onNodeAdd?: (type: NodeType, position: { x: number; y: number }) => void
  /** 节点删除回调 */
  onNodeDelete?: (nodeId: string) => void
  /** 边添加回调 */
  onEdgeAdd?: (sourceId: string, targetId: string) => void
  /** 边删除回调 */
  onEdgeDelete?: (edgeId: string) => void
  /** 只读模式 */
  readOnly?: boolean
  /** 自定义类名 */
  className?: string
  /** 画布宽度 */
  width?: number | string
  /** 画布高度 */
  height?: number | string
}
```

### 使用示例

```tsx
import { WorkflowCanvas } from '@/components/workflow'

<WorkflowCanvas
  ref={canvasRef}
  nodes={nodes}
  edges={edges}
  selectedNodeId={selectedNodeId}
  onNodeSelect={setSelectedNodeId}
  onNodeMove={handleNodeMove}
  onNodeAdd={handleNodeAdd}
  onNodeDelete={handleNodeDelete}
  onEdgeAdd={handleEdgeAdd}
  readOnly={false}
/>
```

### 注意事项

- ✅ 支持从节点面板拖拽节点到画布
- ✅ 节点拖拽移动（自动网格对齐，20px 步长）
- ✅ 画布平移（右键拖拽或空格+左键拖拽）
- ✅ 滚轮缩放（Ctrl+滚轮）
- ✅ 双击节点打开配置
- ✅ Delete 键删除选中节点

---

## 3. NodeContextMenu 节点右键菜单

### 用途说明

右键点击节点显示上下文菜单，提供常用操作。

### Props 接口

```typescript
interface NodeContextMenuProps {
  /** 菜单位置 X 坐标 */
  x: number
  /** 菜单位置 Y 坐标 */
  y: number
  /** 节点 ID */
  nodeId: string
  /** 是否为开始节点 */
  isStartNode: boolean
  /** 是否为结束节点 */
  isEndNode: boolean
  /** 菜单项点击回调 */
  onItemClick: (action: string) => void
  /** 关闭回调 */
  onClose: () => void
}
```

### 使用示例

```tsx
import { NodeContextMenu, useNodeContextMenu } from '@/components/workflow'

const { menuState, openMenu, closeMenu } = useNodeContextMenu()

<div onContextMenu={(e) => openMenu(e, nodeId, isStartNode, isEndNode)}>

{menuState.isOpen && (
  <NodeContextMenu
    x={menuState.x}
    y={menuState.y}
    nodeId={menuState.nodeId}
    isStartNode={isStartNode}
    isEndNode={isEndNode}
    onItemClick={handleItemClick}
    onClose={closeMenu}
  />
)}
```

### 注意事项

- 支持操作：设为开始节点、复制节点、删除节点
- 开始/结束节点自动禁用删除选项
- ESC 键关闭菜单

---

## 4. WorkflowToolbar 工具栏

### 用途说明

功能丰富的工具栏，提供画布控制和工作流操作。

### Props 接口

```typescript
interface WorkflowToolbarProps {
  /** 当前缩放级别 */
  zoom: number
  /** 是否网格对齐 */
  snapToGrid: boolean
  /** 只读模式 */
  readOnly: boolean
  /** 放大 */
  onZoomIn: () => void
  /** 缩小 */
  onZoomOut: () => void
  /** 重置视图 */
  onResetView: () => void
  /** 适应内容 */
  onFitToContent: () => void
  /** 切换网格对齐 */
  onToggleSnapToGrid: () => void
  /** 导入模板 */
  onImportTemplate: (template: string) => void
  /** 导出 JSON */
  onExportJson: () => void
  /** 全屏 */
  onFullscreen: () => void
  /** 保存 */
  onSave: () => void
  /** 撤销 */
  onUndo: () => void
  /** 重做 */
  onRedo: () => void
}
```

### 使用示例

```tsx
import { WorkflowToolbar } from '@/components/workflow'

<WorkflowToolbar
  zoom={zoom}
  snapToGrid={snapToGrid}
  readOnly={readOnly}
  onZoomIn={handleZoomIn}
  onZoomOut={handleZoomOut}
  onSave={handleSave}
  onUndo={handleUndo}
  onRedo={handleRedo}
/>
```

### 注意事项

- 支持缩放控制（放大/缩小/重置/适应内容）
- 支持网格对齐开关
- 支持导入模板和导出 JSON

---

## 5. QuickTaskModal 快速任务创建

### 用途说明

在工作流编辑器中快速创建任务的模态框组件，支持对话式任务创建。

### Props 接口

```typescript
interface QuickTaskModalProps {
  /** 是否显示 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 创建成功回调 */
  onCreate: (workflow: WorkflowDefinition) => void
  /** 自定义类名 */
  className?: string
}
```

### 使用示例

```tsx
import { QuickTaskModal } from '@/components/workflow'

const [isModalOpen, setIsModalOpen] = useState(false)

<QuickTaskModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onCreate={(workflow) => {
    console.log('Created workflow:', workflow)
    setIsModalOpen(false)
  }}
/>

<button onClick={() => setIsModalOpen(true)}>
  快速创建任务
</button>
```

### 注意事项

- 支持自然语言输入
- 实时任务预览
- 支持多种任务意图类型（自动化、通知、监控等）

---

## 6. TaskCreationChat 对话式任务创建

### 用途说明

让用户通过自然语言描述来创建自动化任务的组件。

### Props 接口

```typescript
interface TaskCreationChatProps {
  /** 任务创建成功回调 */
  onCreateTask?: (workflow: WorkflowDefinition) => void
  /** 取消回调 */
  onCancel?: () => void
  /** 初始提示 */
  initialPrompt?: string
  /** 自定义类名 */
  className?: string
}
```

### 使用示例

```tsx
import { TaskCreationChat } from '@/components/workflow'

<TaskCreationChat
  onCreateTask={(workflow) => {
    console.log('Created:', workflow)
  }}
  onCancel={() => console.log('Cancelled')}
  initialPrompt="描述您想要创建的任务..."
/>
```

### 注意事项

- 支持自然语言输入
- 实时任务预览
- 内置意图识别（automation, notification, webhook, scheduled 等）

---

## 7. TaskPreviewPanel 任务预览面板

### 用途说明

显示解析后的任务预览，提供编辑确认机制。

### 使用示例

```tsx
import { TaskPreviewPanel } from '@/components/workflow'

<TaskPreviewPanel
  parsedTask={parsedTask}
  onConfirm={() => handleConfirm()}
  onEdit={() => setEditing(true)}
/>
```

---

## 8. WorkflowEditorEnhanced 增强编辑器

### 用途说明

完整的编辑器集成示例，展示所有增强功能的使用。

### Props 接口

```typescript
interface WorkflowEditorEnhancedProps {
  /** 初始工作流 */
  initialWorkflow?: WorkflowDefinition
  /** 变更回调 */
  onChange?: (workflow: WorkflowDefinition) => void
  /** 保存回调 */
  onSave?: (workflow: WorkflowDefinition) => void
  /** 只读模式 */
  readOnly?: boolean
  /** 显示节点面板 */
  showPalette?: boolean
}
```

### 使用示例

```tsx
import { WorkflowEditorEnhanced } from '@/components/workflow'

<WorkflowEditorEnhanced
  initialWorkflow={workflow}
  onChange={handleChange}
  onSave={handleSave}
  readOnly={false}
  showPalette={true}
/>
```

---

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + S` | 保存工作流 |
| `Ctrl + Z` | 撤销 |
| `Ctrl + Y` | 重做 |
| `Ctrl + 滚轮` | 缩放画布 |
| `Delete` | 删除选中节点 |
| `空格 + 左键拖拽` | 平移画布 |
| `右键拖拽` | 平移画布 |
| `右键点击节点` | 显示上下文菜单 |
| `双击节点` | 打开配置 |
| `ESC` | 关闭菜单 |

---

## 相关文档

- [Workflow Types](../../types/workflow.ts)
- [Task Parser](../../lib/workflow/TaskParser.ts)
- [主 README](../README.md)
