/**
 * 工作流组件导出
 */

// 设计器组件
export { WorkflowDesigner } from './designer'
export { WorkflowCanvas as WorkflowCanvasDesigner } from './designer/canvas'
export type { WorkflowCanvasRef as WorkflowCanvasDesignerRef } from './designer/canvas'
export { WorkflowNodeComponent, NodeTypeSelector } from './designer/node'
export { WorkflowEdgeComponent, EdgeTypeSelector } from './designer/edge'
export { DesignerToolbar, NodeToolbar, PropertyPanel } from './designer/toolbar'
export { InstanceViewer, InstanceList } from './designer/instance-viewer'

// v1.12.3 增强组件 - Workflow Editor 拖拽增强
export { WorkflowCanvas } from './WorkflowCanvas.enhanced'
export type { WorkflowCanvasRef } from './WorkflowCanvas.enhanced'

// 节点面板
export { NodePalette, getDefaultNodeConfig } from './NodePalette'
export type { PaletteNodeType, NodePaletteProps } from './NodePalette'

// 节点右键菜单
export { NodeContextMenu, useNodeContextMenu } from './NodeContextMenu'
export type { NodeContextMenuProps, ContextMenuItem, DEFAULT_MENU_ITEMS } from './NodeContextMenu'

// 增强工具栏
export { WorkflowToolbar, KeyboardShortcuts } from './WorkflowToolbar'
export type { WorkflowToolbarProps, WorkflowTemplate, WORKFLOW_TEMPLATES } from './WorkflowToolbar'

// 旧版可视化工作流画布组件（保留向后兼容）
export type {
  WorkflowNodeType,
  NodeState,
  WorkflowNodeData,
  WorkflowEdgeData,
  WorkflowDefinition as VisualWorkflowDefinition,
} from './WorkflowCanvas'

// 页面组件 - 暂时注释，等待实现
// export { WorkflowOrchestratorPage } from './WorkflowOrchestratorPage'
// export { useWorkflowOrchestrator } from './use-workflow-orchestrator'
// export type { UseWorkflowOrchestratorReturn } from './use-workflow-orchestrator'

// v1.9.0 新增组件
export { WorkflowEditor } from './WorkflowEditor'
export { NodeEditorPanel } from './NodeEditorPanel'
export {
  useWorkflowHistory,
  type HistoryActionType,
  type HistoryItem,
  type WorkflowHistoryState,
  type UseWorkflowHistoryOptions,
  type UseWorkflowHistoryResult,
} from './hooks/useWorkflowHistory'

// v1.9.0 AI 对话式任务创建
export { TaskCreationChat } from './TaskCreationChat'
export { TaskPreviewPanel } from './TaskPreviewPanel'
export { QuickTaskModal } from './QuickTaskModal'
export { useTaskCreation } from './hooks/useTaskCreation'

// v1.12.3 增强版工作流编辑器（集成示例）
export { WorkflowEditorEnhanced } from './WorkflowEditorEnhanced'
export type { WorkflowEditorEnhancedProps } from './WorkflowEditorEnhanced'
