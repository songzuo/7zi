/**
 * WorkflowEditor 组件导出
 *
 * 统一导出所有组件
 * v1.9.1 更新
 */

// 主组件
export { WorkflowEditor } from './WorkflowEditor'
export { WorkflowEditorV110 } from './WorkflowEditorV110'
export { Toolbar } from './Toolbar'
export { NodePalette } from './NodePalette'
export { StatusBar } from './StatusBar'
export { ExecutionPanel } from './ExecutionPanel'
export { ValidationPanel } from './ValidationPanel'

// v1.9.1 新增组件
export { ExpressionEditor } from './ExpressionEditor'
export { WorkflowExporter } from './WorkflowExporter'

// 类型导出
export type {
  WorkflowNodeData,
  WorkflowEdgeData,
  ValidationError,
  ValidationResult,
  ExecutionState,
  ExecutionLog,
  NodeTemplate,
  PropertyField,
  PropertyGroup,
  NodePropertiesConfig,
  WorkflowStats,
  NodeType,
  NodeCategory,
  CustomNodeRegistration,
  WorkflowExport,
  WorkflowDefinition,
} from './types'

// 常量导出
export {
  NODE_TYPES,
  NODE_TEMPLATES,
  NODE_COLORS,
  NODE_CATEGORY_LABELS,
  KEYBOARD_SHORTCUTS,
  BREAKPOINTS,
  CANVAS_CONFIG,
  EXECUTION_STATUS_COLORS,
  VALIDATION_RULES,
  EDITOR_VERSION,
  EXPORT_CONFIG,
} from './constants'

// Store 导出
export { useWorkflowStore, workflowSelectors } from './stores/workflow-store'
export {
  useWorkflowEditorStore,
  useUndoRedo,
  workflowEditorSelectors,
} from './stores/workflow-editor-store'
export type {
  HistoryState,
  WorkflowEditorState,
} from './stores/workflow-editor-store'

// Hooks 导出
export { useWorkflowValidation } from './hooks/useWorkflowValidation'
export { useWorkflowExecution } from './hooks/useWorkflowExecution'

// v1.9.1 新增 Hooks
export { useCustomNodes } from './hooks/useCustomNodes'
export { useWorkflowExport } from './hooks/useWorkflowExport'
export { useClipboard } from './hooks/useClipboard'
export { applyLayout } from './AutoLayout'
export type { LayoutType } from './AutoLayout'