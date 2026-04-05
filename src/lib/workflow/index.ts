/**
 * 工作流模块导出
 */

// 原有引擎
export { WorkflowEngine, workflowEngine } from './engine'

// 可视化工作流编排器
export {
  VisualWorkflowOrchestrator,
  visualWorkflowOrchestrator,
  type OrchestratorNodeState,
  type OrchestratorExecutionResult,
  type NodeExecutorHandler,
  type ExecutionContext,
  type WorkflowExecutionEvent,
  type EventListener,
  type OrchestratorConfig,
  type NodeStateMap,
} from './VisualWorkflowOrchestrator'

// 执行器
export * from './executor'

// 节点执行器
export * from './executors/registry'

// 高级节点类型
export {
  HumanInputNodeExecutor,
  humanInputNodeExecutor,
  type HumanInputConfig,
} from './executors/human-input-executor'

export {
  LoopNodeExecutor,
  loopNodeExecutor,
  type LoopConfig,
  type LoopType,
  type LoopIterationResult,
  type LoopExecutionResult,
} from './executors/loop-executor'

// 执行监控系统
export {
  WorkflowMonitoring,
  workflowMonitoring,
  type MonitoringConfig,
} from './monitoring'

export {
  ExecutionTracker,
  executionTracker,
} from './monitoring/ExecutionTracker'

export {
  StepRecorder,
  stepRecorder,
} from './monitoring/StepRecorder'

export {
  MetricsCollector,
  metricsCollector,
} from './monitoring/MetricsCollector'

export {
  AlertManager,
  alertManager,
} from './monitoring/AlertManager'

export {
  RealtimeService,
  realtimeService,
} from './monitoring/RealtimeService'

// 监控类型导出
export type {
  WorkflowExecution,
  NodeExecution,
  NodeExecutionMetrics,
  ExecutionMetrics,
  NodeMetricsSummary,
  AlertConfig,
  Alert,
  ExecutionSummary,
  ExecutionQueryParams,
  ExecutionEvent,
} from './monitoring/types'

export {
  WorkflowExecutionStatus,
  AlertLevel,
  AlertType,
} from './monitoring/types'

// 版本控制
export {
  WorkflowVersionService,
  workflowVersionService,
  type WorkflowVersion,
  type VersionDiff,
  type VersionSettings,
} from './version-service'

// 历史记录/审计
export {
  WorkflowHistoryService,
  workflowHistoryService,
  type WorkflowHistoryEntry,
  type OperationType,
  type HistoryQueryFilter,
  type HistoryQueryResult,
} from './history'
