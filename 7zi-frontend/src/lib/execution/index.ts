/**
 * Execution State Persistence (v1.12.2)
 *
 * 执行状态持久化模块
 *
 * Provides:
 * - Execution state storage (IndexedDB + localStorage fallback)
 * - React hooks for persistent execution state
 * - Utilities for resuming paused executions
 */

// 核心存储模块
export * from './execution-storage'

// React Hooks
export * from './useExecutionPersistence'

// 重新导出类型
export type {
  ExecutionStatus,
  NodeExecutionStatus,
  NodeExecutionResult,
  NodeState,
  ExecutionProgress,
  ExecutionStateData,
  SaveExecutionStateOptions,
  ResumeExecutionResult,
} from './execution-storage'

export type {
  UseExecutionPersistenceReturn,
  UseExecutionPersistenceOptions,
} from './useExecutionPersistence'

// 便捷函数
export {
  saveExecutionState,
  loadExecutionState,
  updateExecutionProgress,
  updateNodeState,
  completeExecution,
  failExecution,
  pauseExecution,
  resumeExecution,
  cancelExecution,
  addExecutionLog,
  updateVariables,
  listExecutions,
  deleteExecution,
  clearExpiredExecutions,
  getExecutionStorage,
} from './execution-storage'

export { useExecutionPersistence } from './useExecutionPersistence'
