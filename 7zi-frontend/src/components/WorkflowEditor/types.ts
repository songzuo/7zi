/**
 * WorkflowEditor 类型定义
 * 
 * 版本: v1.9.1
 * 更新日期: 2026-04-03
 * 
 * 定义工作流编辑器中使用的所有 TypeScript 类型
 */

import type { Node, Edge, NodeProps } from 'reactflow'

// ============================================
// 后端类型定义
// ============================================

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
  | 'success'
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
  value?: unknown
  type: string
  defaultValue?: unknown
}

// ============================================
// 节点类型定义 (v1.9.1 扩展)
// ============================================

/**
 * 节点类型枚举
 * v1.9.1 新增: loop, subworkflow, transform
 */
export type NodeType =
  | 'start'
  | 'end'
  | 'agent'
  | 'condition'
  | 'parallel'
  | 'wait'
  | 'humanInput'
  | 'loop' // v1.9.1: 循环节点
  | 'subworkflow' // v1.9.1: 子工作流节点
  | 'transform' // v1.9.1: 数据转换节点

/**
 * 节点类别
 * v1.9.1 新增: custom 类别
 */
export type NodeCategory = 'basic' | 'agent' | 'logic' | 'flow' | 'custom'

// ============================================
// 工作流数据类型
// ============================================

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

  // 分组（v1.10.0）
  groupId?: string
}

/**
 * 工作流边数据（React Flow）
 * v1.10.0 更新: 新增样式配置支持
 */
export interface WorkflowEdgeData {
  id: string
  source: string
  target: string
  conditionConfig?: {
    edgeType?: 'default' | 'conditional' | 'animated'
    condition?: string | boolean
    label?: string
    expression?: string
  }
  // 样式配置
  strokeColor?: string
  strokeWidth?: number
  // 执行状态（仅运行时）
  executionStatus?: 'pending' | 'running' | 'completed' | 'failed'
}

/**
 * 节点配置
 */
export interface NodeConfig {
  // Agent 配置
  agentType?: string
  agentId?: string
  prompt?: string
  inputs?: Record<string, unknown>
  agentOutputMapping?: Record<string, string>
  timeout?: number
  retryConfig?: {
    maxRetries: number
    retryDelay: number
    backoffStrategy: 'fixed' | 'exponential'
  }
  maxRetries?: number // 重试次数的简写形式
  isActive?: boolean // 节点是否激活（仅用于UI显示）

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

  // 循环配置 (v1.9.1)
  loopType?: 'fixed' | 'while' | 'forEach' | 'count' | 'condition' | 'collection'
  loopCount?: number
  loopCondition?: string
  loopArray?: string
  collectionPath?: string
  iterationVariable?: string

  // 子工作流配置 (v1.9.1)
  subworkflowId?: string
  subworkflowInputs?: Record<string, unknown>
  subworkflowInputMapping?: string
  subworkflowOutputMapping?: string

  // 数据转换配置 (v1.9.1)
  transformType?: 'javascript' | 'jsonPath' | 'template'
  transformScript?: string
  jsonPath?: string
  template?: string
  transformExpression?: string
  outputFormat?: 'json' | 'xml' | 'csv' | 'text'

  // 通用配置
  enabled?: boolean

  // 参数管理
  parameters?: Array<{ key: string; value: string }>
}

// ============================================
// 验证相关类型
// ============================================

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

// ============================================
// 执行相关类型
// ============================================

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

// ============================================
// 节点模板和属性配置
// ============================================

/**
 * 节点模板
 */
export interface NodeTemplate {
  type: NodeType
  label: string
  icon: string
  description: string
  category: NodeCategory
  defaultConfig: NodeConfig
}

/**
 * 属性面板配置
 */
export interface PropertyField {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'boolean' | 'code' | 'json' | 'expression'
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

// ============================================
// v1.9.1 新增: 自定义节点注册
// ============================================

/**
 * 自定义节点注册配置 (v1.9.1)
 */
export interface CustomNodeRegistration {
  type: string
  label: string
  icon: string
  description: string
  category: NodeCategory
  defaultConfig: NodeConfig
  propertiesConfig?: NodePropertiesConfig
  render?: React.ComponentType<NodeProps<WorkflowNodeData>>
}

// ============================================
// v1.9.1 新增: 导出/导入类型
// ============================================

/**
 * 工作流导出格式 (v1.9.1)
 */
export interface WorkflowExport {
  version: '1.9.1'
  exportedAt: string
  workflow: WorkflowDefinition
  metadata?: {
    name?: string
    description?: string
    author?: string
    tags?: string[]
  }
}

/**
 * 工作流定义
 *
 * 注意：这里的 nodes 和 edges 使用简化的数据结构（仅包含数据）
 * 如果需要完整的 ReactFlow 格式，请在编辑器内部使用
 * 如果需要导出/导入格式，请使用 WorkflowExport 接口
 */
export interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  nodes: WorkflowNodeData[]
  edges: Array<{
    id: string
    source: string
    target: string
    conditionConfig?: WorkflowEdgeData['conditionConfig']
  }>
  variables?: WorkflowVariable[]
  metadata?: {
    createdAt?: string
    updatedAt?: string
    createdBy?: string
    version?: string
  }
}

// ============================================
// 统计类型
// ============================================

/**
 * 工作流统计
 */
export interface WorkflowStats {
  nodesCount: number
  edgesCount: number
  estimatedDuration?: number
  complexityScore: number
}
