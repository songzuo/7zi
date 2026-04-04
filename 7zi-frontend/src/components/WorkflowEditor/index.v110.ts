/**
 * WorkflowEditor 导出文件
 *
 * 🎨 设计师: Designer
 * 创建日期: 2026-04-03
 * 版本: v1.10.0
 */

// ============================================
// 主编辑器组件
// ============================================

// v1.9.1 版本（向后兼容）
export { WorkflowEditor } from './WorkflowEditor'
export { default } from './WorkflowEditor'

// v1.10.0 版本（增强版）
export { WorkflowEditorV110 } from './WorkflowEditorV110'

// ============================================
// 子组件
// ============================================

export { Toolbar } from './Toolbar'
export { EnhancedToolbar } from './EnhancedToolbar'
export { NodePalette } from './NodePalette'
export { PropertiesPanel } from './PropertiesPanel'
export { StatusBar } from './StatusBar'
export { ExecutionPanel } from './ExecutionPanel'
export { ValidationPanel } from './ValidationPanel'
export { ExpressionEditor } from './ExpressionEditor'
export { WorkflowExporter } from './WorkflowExporter'

// v1.10.0 新增组件
export { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel'
export { NodeSearchPanel } from './NodeSearchPanel'
export { AutoLayoutPanel, applyLayout } from './AutoLayout'
export type { LayoutType } from './AutoLayout'

// ============================================
// 节点类型
// ============================================

export { nodeTypes } from './NodeTypes'
export { StartNode } from './NodeTypes/StartNode'
export { EndNode } from './NodeTypes/EndNode'
export { AgentNode } from './NodeTypes/AgentNode'
export { ConditionNode } from './NodeTypes/ConditionNode'
export { ParallelNode } from './NodeTypes/ParallelNode'
export { WaitNode } from './NodeTypes/WaitNode'
export { HumanInputNode } from './NodeTypes/HumanInputNode'
export { LoopNode } from './NodeTypes/LoopNode'
export { SubworkflowNode } from './NodeTypes/SubworkflowNode'
export { TransformNode } from './NodeTypes/TransformNode'

// ============================================
// 边类型
// ============================================

export { conditionalEdgeType, animatedEdgeType } from './EdgeTypes'

// ============================================
// Hooks
// ============================================

export { useWorkflowValidation } from './hooks/useWorkflowValidation'
export { useWorkflowExecution } from './hooks/useWorkflowExecution'
export { useCustomNodes } from './hooks/useCustomNodes'
export { useWorkflowExport } from './hooks/useWorkflowExport'

// v1.10.0 新增 hooks
export { useClipboard } from './hooks/useClipboard'

// ============================================
// Stores
// ============================================

export {
  useWorkflowStore,
} from './stores/workflow-store'

export {
  useWorkflowEditorStore,
  useUndoRedo,
} from './stores/workflow-editor-store'

// v1.10.0 增强版 store
export {
  useWorkflowEditorStore as useWorkflowEditorStoreV110,
} from './stores/workflow-editor-store-v110'

// ============================================
// 类型定义
// ============================================

export type {
  // 工作流类型
  WorkflowDefinition,
  WorkflowNodeData,
  WorkflowEdgeData,
  WorkflowInstance,
  WorkflowVariable,
  WorkflowStats,

  // 节点类型
  NodeType,
  NodeCategory,
  NodeConfig,
  NodeTemplate,
  NodePropertiesConfig,
  PropertyField,
  PropertyGroup,
  NodeStatus,
  NodeExecutionResult,

  // 验证类型
  ValidationError,
  ValidationResult,

  // 执行类型
  ExecutionState,
  ExecutionLog,

  // 自定义节点
  CustomNodeRegistration,

  // 导出类型
  WorkflowExport,

  // 后端类型
  BackendWorkflowNode,
  BackendWorkflowEdge,
} from './types'

// ============================================
// 常量
// ============================================

export {
  NODE_TYPES,
  NODE_TEMPLATES,
  NODE_CATEGORY_LABELS,
  NODE_COLORS,
  KEYBOARD_SHORTCUTS,
  BREAKPOINTS,
  CANVAS_CONFIG,
  EXECUTION_STATUS_COLORS,
  VALIDATION_RULES,
  EDITOR_VERSION,
  EXPORT_CONFIG,
} from './constants'