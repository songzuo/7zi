/**
 * Workflow Module - Index
 *
 * 📦 工作流模块导出
 * 版本: v1.12.3
 *
 * 统一导出工作流相关的所有类、类型和组件
 */

// ============================================
// Execution History Store
// ============================================
export {
  ExecutionHistoryStore,
  executionHistoryStore,
} from './execution-history-store'
export type {
  ExecutionStatus,
  TriggerType,
  NodeExecutionStatus,
  NodeExecution,
  TriggerConfig,
  ExecutionHistory,
  ExecutionHistoryQuery,
  ExecutionStatistics,
} from './execution-history-store'

// ============================================
// Replay Engine
// ============================================
export {
  WorkflowReplayEngine,
  workflowReplayEngine,
} from './replay-engine'
export type {
  ReplayStepType,
  ReplayStep,
  ReplayState,
  ReplayConfig,
  ReplayEventType,
  ReplayEvent,
  ReplayEventListener,
} from './replay-engine'

// ============================================
// Workflow Analytics
// ============================================
export {
  WorkflowAnalytics,
  workflowAnalytics,
} from './workflow-analytics'
export type {
  NodePerformanceMetrics,
  TimeRangeAnalysis,
  ExecutionTrend,
  PerformanceBottleneck,
  ExecutionReport,
  AnalyticsOptions,
} from './workflow-analytics'

// ============================================
// Template System
// ============================================
export { TemplateManager, templateManager } from './template-system'
export type {
  TemplateCategory,
  Template,
} from './template-system'

// ============================================
// Visual Workflow Orchestrator
// ============================================
export {
  VisualWorkflowOrchestrator,
  visualWorkflowOrchestrator,
} from './VisualWorkflowOrchestrator'
export type {
  ExecutionEventType,
  ExecutionEvent,
  ExecutionEventListener,
  ExecutionConfig,
  ExecutionResult,
} from './VisualWorkflowOrchestrator'
