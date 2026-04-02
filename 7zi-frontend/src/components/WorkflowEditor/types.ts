/**
 * WorkflowEditor 类型定义
 *
 * 定义工作流编辑器中使用的所有 TypeScript 类型
 */

// 定义本地类型替代 @/types/workflow
export interface BackendWorkflowNode {
  id: string
  type: string
  config: Record<string, unknown>
}

export interface BackendWorkflowEdge {
  id: string
  source: string
  target: string
  condition?: Record<string, unknown>
}

export interface WorkflowInstance {
  id: string
  workflowId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'COMPLETED'
  startTime: string | number
  endTime?: string | number
  progress: {
    total: number
    completed: number
    failed: number
    progress?: number
    percentage?: number
  }
  inputs?: Record<string, unknown>
  outputs?: Record<string, unknown>
  variables?: Record<string, WorkflowVariable>
  error?: string
}

export type NodeStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'SUCCESS'
  | 'FAILED'

export interface NodeExecutionResult {
  success: boolean
  data?: unknown
  error?: string
  duration?: number
}

export interface WorkflowVariable {
  name: string
  value: unknown
  type: string
}

import type { Edge, Node } from 'reactflow'
// import type {
//   WorkflowNode as BackendWorkflowNode,
//   WorkflowEdge as BackendWorkflowEdge,
//   WorkflowInstance,
//   NodeStatus,
//   NodeExecutionResult,
//   WorkflowVariable,
// } from '@/types/workflow';

/**
 * 节点类型枚举
 */
export type NodeType = 'start' | 'end' | 'agent' | 'condition' | 'parallel' | 'wait' | 'humanInput'

/**
 * 工作流节点数据（React Flow）
 */
export interface WorkflowNodeData {
  id: string
  type: NodeType
  label: string
  description?: string

  // 节点配置
  config: NodeConfig

  // 验证状态
  validation?: {
    valid: boolean
    errors: string[]
  }

  // 执行状态（仅运行时）
  executionStatus?: NodeStatus
  executionResult?: NodeExecutionResult
}

/**
 * 工作流边数据（React Flow）
 */
export interface WorkflowEdgeData {
  id: string
  source: string
  target: string
  conditionConfig?: {
    condition?: string | boolean
    label?: string
  }
}

/**
 * 节点配置
 */
export interface NodeConfig {
  // Agent 配置
  agentType?: string
  agentId?: string
  inputs?: Record<string, unknown>
  outputMapping?: Record<string, string>
  timeout?: number
  retryConfig?: {
    maxRetries: number
    retryDelay: number
    backoffStrategy: 'fixed' | 'exponential'
  }

  // 条件配置
  condition?: string
  trueBranchLabel?: string
  falseBranchLabel?: string

  // 等待配置
  waitType?: 'duration' | 'event'
  duration?: number
  waitForEvent?: string

  // 并行配置
  maxConcurrency?: number

  // 通用配置
  enabled?: boolean
}

/**
 * 验证错误
 */
export interface ValidationError {
  type: 'structure' | 'config' | 'logic'
  severity: 'error' | 'warning'
  message: string
  nodeId?: string
  edgeId?: string
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * 执行状态
 */
export interface ExecutionState {
  instance: WorkflowInstance | null
  nodeStates: Record<
    string,
    {
      status: NodeStatus
      result?: NodeExecutionResult
    }
  >
}

/**
 * 执行日志
 */
export interface ExecutionLog {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  nodeId?: string
  message: string
  data?: unknown
}

/**
 * 节点模板
 */
export interface NodeTemplate {
  type: NodeType
  label: string
  icon: string
  description: string
  category: 'basic' | 'agent' | 'logic' | 'flow'
  defaultConfig: NodeConfig
}

/**
 * 属性面板配置
 */
export interface PropertyField {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'boolean' | 'code' | 'json'
  description?: string
  required?: boolean
  options?: Array<{ value: string; label: string }>
  placeholder?: string
  validation?: (value: unknown) => string | null
}

/**
 * 属性组
 */
export interface PropertyGroup {
  label: string
  fields: PropertyField[]
  expanded?: boolean
}

/**
 * 节点属性配置
 */
export interface NodePropertiesConfig {
  groups: PropertyGroup[]
  validation?: (data: WorkflowNodeData) => ValidationResult
}

/**
 * 工作流统计
 */
export interface WorkflowStats {
  nodesCount: number
  edgesCount: number
  estimatedDuration?: number
  complexityScore: number
}
