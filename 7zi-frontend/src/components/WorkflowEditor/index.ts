/**
 * WorkflowEditor 组件导出
 *
 * 统一导出所有组件
 */

export { WorkflowEditor } from './WorkflowEditor';
export { Toolbar } from './Toolbar';
export { NodePalette } from './NodePalette';
export { StatusBar } from './StatusBar';
export { ExecutionPanel } from './ExecutionPanel';
export { ValidationPanel } from './ValidationPanel';

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
} from './types';

export type { WorkflowDefinition } from './stores/workflow-store';

export {
  NODE_TYPES,
  NODE_TEMPLATES,
  NODE_COLORS,
  KEYBOARD_SHORTCUTS,
  BREAKPOINTS,
  CANVAS_CONFIG,
  EXECUTION_STATUS_COLORS,
  VALIDATION_RULES,
} from './constants';

export {
  useWorkflowStore,
  workflowSelectors,
} from './stores/workflow-store';
