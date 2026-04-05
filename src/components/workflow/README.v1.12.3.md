# Workflow Editor v1.12.3 - 拖拽增强功能

## 📦 概述

v1.12.3 版本为 7zi-frontend 项目的工作流编辑器带来了全面的拖拽增强功能，大幅提升了用户体验和工作流设计效率。

## 🎯 新增功能

### 1. 节点面板 (NodePalette)

位于画布左侧的垂直面板，提供所有可用节点类型的快速访问。

**特性：**
- 显示 6 种节点类型：start, end, task (agent), condition, parallel, wait
- 每个节点类型包含图标、标签和简短描述
- 支持拖拽到画布
- 支持点击添加到画布中心
- 美观的卡片式设计，带颜色编码

**使用示例：**
```tsx
import { NodePalette } from '@/components/workflow'

<NodePalette
  disabled={false}
  onNodeClick={(type) => {
    // 处理节点点击
  }}
/>
```

### 2. 增强画布 (WorkflowCanvas)

完全重写的画布组件，支持丰富的交互功能。

**特性：**
- ✅ 从节点面板拖拽节点到画布
- ✅ 节点拖拽移动（自动网格对齐，20px 步长）
- ✅ 画布平移（右键拖拽或空格+左键拖拽）
- ✅ 滚轮缩放（Ctrl+滚轮）
- ✅ 双击节点打开配置
- ✅ 选中节点显示蓝色边框 + 操作按钮
- ✅ 键盘快捷键（Delete 删除节点）

**使用示例：**
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
  onNodeCopy={handleNodeCopy}
  onNodeSetStart={handleNodeSetStart}
  onNodeDoubleClick={handleNodeDoubleClick}
  onEdgeAdd={handleEdgeAdd}
  onEdgeDelete={handleEdgeDelete}
  readOnly={false}
/>
```

### 3. 节点右键菜单 (NodeContextMenu)

右键点击节点显示上下文菜单，提供常用操作。

**特性：**
- 设为开始节点
- 复制节点
- 删除节点
- 开始/结束节点自动禁用删除选项
- 自动调整位置防止超出视口
- ESC 键关闭菜单

**使用示例：**
```tsx
import { NodeContextMenu, useNodeContextMenu } from '@/components/workflow'

const { menuState, openMenu, closeMenu } = useNodeContextMenu()

// 在节点上绑定右键事件
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

### 4. 增强工具栏 (WorkflowToolbar)

功能丰富的工具栏，提供画布控制和工作流操作。

**特性：**
- 缩放控制（放大/缩小/重置/适应内容）
- 网格对齐开关
- 导入模板（预设模板菜单）
- 导出 JSON
- 全屏编辑
- 保存工作流
- 撤销/重做

**使用示例：**
```tsx
import { WorkflowToolbar } from '@/components/workflow'

<WorkflowToolbar
  zoom={zoom}
  snapToGrid={snapToGrid}
  readOnly={readOnly}
  onZoomIn={handleZoomIn}
  onZoomOut={handleZoomOut}
  onResetView={handleResetView}
  onFitToContent={handleFitToContent}
  onToggleSnapToGrid={handleToggleSnapToGrid}
  onImportTemplate={handleImportTemplate}
  onExportJson={handleExportJson}
  onFullscreen={handleFullscreen}
  onSave={handleSave}
  onUndo={handleUndo}
  onRedo={handleRedo}
/>
```

### 5. 增强连接线

条件节点支持 YES/NO 两条分支线，不同颜色区分。

**特性：**
- 条件节点显示 YES（绿色）和 NO（红色）两个连接点
- 连接点悬停时放大高亮
- 连接线颜色根据类型区分：
  - 顺序连接：灰色
  - YES 分支：绿色
  - NO 分支：红色
  - 并行连接：紫色
- 贝塞尔曲线平滑连接

### 6. 集成示例 (WorkflowEditorEnhanced)

完整的编辑器集成示例，展示所有增强功能的使用。

**特性：**
- 左侧节点面板
- 中间画布区域
- 右上角工具栏
- 右键菜单支持
- 历史记录（撤销/重做）
- 导入/导出功能

**使用示例：**
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

## 📁 文件结构

```
src/components/workflow/
├── NodePalette.tsx              # 节点面板组件
├── NodeContextMenu.tsx          # 节点右键菜单组件
├── WorkflowToolbar.tsx          # 增强工具栏组件
├── WorkflowCanvas.enhanced.tsx  # 增强画布组件
├── WorkflowEditorEnhanced.tsx   # 集成示例
└── index.ts                     # 导出文件
```

## 🔧 技术实现

### 拖拽实现

使用 HTML5 Drag and Drop API：

```tsx
// 节点面板 - 开始拖拽
const handleDragStart = (e: React.DragEvent, nodeType: NodeType) => {
  e.dataTransfer.setData('application/workflow-node-type', nodeType)
  e.dataTransfer.effectAllowed = 'copy'
}

// 画布 - 处理放置
const handleDrop = (e: React.DragEvent) => {
  const nodeType = e.dataTransfer.getData('application/workflow-node-type')
  const pos = getCanvasPosition(e.clientX, e.clientY)
  onNodeAdd(nodeType as NodeType, snapToGrid(pos))
}
```

### 网格对齐

```tsx
const snapToGrid = (position: { x: number; y: number }) => {
  const gridSize = 20
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  }
}
```

### 画布平移

```tsx
// 右键拖拽或空格+左键拖拽
const handleMouseDown = (e: React.MouseEvent) => {
  if (e.button === 2 || (e.button === 0 && isSpacePressed)) {
    setIsPanning(true)
    setPanStart({
      x: e.clientX - panX,
      y: e.clientY - panY,
    })
  }
}
```

## ⌨️ 快捷键

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

## 🎨 样式定制

所有组件使用 Tailwind CSS，可以通过 className 自定义样式：

```tsx
<NodePalette className="w-72" />
<WorkflowCanvas className="border-2 border-blue-500" />
<WorkflowToolbar className="top-2 left-2" />
```

## 🔄 向后兼容

旧版 `WorkflowCanvas` 组件保留在 `WorkflowCanvas.tsx` 中，新增强版本为 `WorkflowCanvas.enhanced.tsx`。

导出时，`WorkflowCanvas` 指向增强版本，如需使用旧版：

```tsx
import { WorkflowCanvas as OldWorkflowCanvas } from './WorkflowCanvas'
```

## 📝 待实现功能

- [ ] 节点配置对话框（双击节点）
- [ ] 模板导入功能
- [ ] 属性面板（右侧）
- [ ] 节点搜索过滤
- [ ] 批量操作（多选节点）
- [ ] 键盘快捷键自定义
- [ ] 主题切换

## 🐛 已知问题

- 无

## 📚 相关文档

- [Workflow Types](../../types/workflow.ts)
- [Workflow Editor](./WorkflowEditor.tsx)
- [Node Editor Panel](./NodeEditorPanel.tsx)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT