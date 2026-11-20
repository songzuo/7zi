/**
 * 工作流编排器类型定义
 * 用于 Multi-Agent 协作的可视化工作流编排系统
 */

/**
 * 节点类型
 */
export enum NodeType {
  START = 'start', // 开始节点
  END = 'end', // 结束节点
  AGENT = 'agent', // Agent 节点
  CONDITION = 'condition', // 条件节点
  PARALLEL = 'parallel', // 并行节点
  WAIT = 'wait', // 等待节点
  HUMAN_INPUT = 'human_input', // 人工输入节点
  LOOP = 'loop', // 循环节点
  SUBWORKFLOW = 'subworkflow', // 子工作流节点
}

/**
 * 表单字段定义
 */
export interface FormField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'radio' | 'date' | 'file'
  required?: boolean
  options?: string[]
  defaultValue?: unknown
  placeholder?: string
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

/**
 * 表单 Schema
 */
export interface FormSchema {
  fields: FormField[]
  title?: string
  description?: string
}

/**
 * 循环节点配置
 */
export interface LoopConfig {
  loopType: 'fixed' | 'conditional' | 'foreach'
  iterations?: number // 固定次数循环
  condition?: string // 条件循环的条件表达式
  iterator?: string // foreach 循环的迭代变量
  collection?: string // foreach 循环的数据源
  maxIterations?: number // 最大迭代次数（防止无限循环）
  // for 循环配置
  forConfig?: {
    start: number
    end: number
    step?: number
    variableName?: string
  }
  // foreach 配置
  forEachConfig?: {
    array: string
    variableName: string
    indexVariableName?: string
  }
  timeout?: number
}

/**
 * 子工作流节点配置
 */
export interface SubWorkflowConfig {
  subWorkflowId: string
  inputs?: Record<string, unknown>
  outputMapping?: Record<string, string> // 子工作流输出到当前工作流的映射
  waitForCompletion?: boolean
  timeout?: number
}

/**
 * 高级条件配置
 */
export interface AdvancedCondition {
  expression: string
  variables?: Record<string, string>
  timeout?: number
}

/**
 * 并行执行配置
 */
export interface ParallelConfig {
  maxConcurrency?: number // 最大并发数
  failurePolicy: 'fail-fast' | 'continue' | 'wait-all' // 失败处理策略
  dependencies?: Array<{
    nodeId: string
    dependsOn: string[]
  }>
}

/**
 * AI Agent 配置
 */
export interface AIAgentConfig {
  agentId: string
  model?: string
  temperature?: number
  maxTokens?: number
  tools?: string[]
  systemPrompt?: string
  timeout?: number
}

/**
 * 节点状态
 */
export enum NodeStatus {
  IDLE = 'idle', // 待执行
  RUNNING = 'running', // 运行中
  SUCCESS = 'success', // 成功
  FAILED = 'failed', // 失败
  SKIPPED = 'skipped', // 跳过
  PENDING = 'pending', // 等待中
}

/**
 * 边类型
 */
export enum EdgeType {
  SEQUENCE = 'sequence', // 顺序连接
  CONDITION = 'condition', // 条件连接
  PARALLEL = 'parallel', // 并行连接
  DEFAULT = 'default', // 默认分支
}

/**
 * 工作流状态
 */
export enum WorkflowStatus {
  DRAFT = 'draft', // 草稿
  ACTIVE = 'active', // 激活
  PAUSED = 'paused', // 暂停
  ARCHIVED = 'archived', // 已归档
}

/**
 * 运行实例状态
 */
export enum InstanceStatus {
  PENDING = 'pending', // 待运行
  RUNNING = 'running', // 运行中
  COMPLETED = 'completed', // 已完成
  FAILED = 'failed', // 失败
  CANCELLED = 'cancelled', // 已取消
}

/**
 * 工作流节点定义
 */
export interface WorkflowNode {
  id: string // 节点唯一标识
  type: NodeType // 节点类型
  name: string // 节点名称
  description?: string // 节点描述

  // 节点位置（用于可视化）
  position: {
    x: number
    y: number
  }

  // Agent 节点特定配置
  agentConfig?: {
    agentId: string // Agent ID
    agentType: string // Agent 类型
    prompt?: string // 提示词
    model?: string // 使用的模型
    timeout?: number // 超时时间（秒）
    retryCount?: number // 重试次数
  }

  // 条件节点特定配置
  conditionConfig?: {
    expression: string // 条件表达式
    trueLabel?: string // true 分支标签
    falseLabel?: string // false 分支标签
  }

  // 等待节点配置
  waitConfig?: {
    duration?: number // 等待时长（秒）
    waitForEvent?: string // 等待的事件
  }

  // 人工输入节点配置
  humanInputConfig?: {
    formSchema: FormSchema // 表单 schema
    requiredApprovals?: number // 需要的审批人数
  }

  // 循环节点配置 (from workflows/nodes/LoopNode.ts)
  loopConfig?: LoopConfig

  // 子工作流节点配置 (from workflows/nodes/SubWorkflowNode.ts)
  subWorkflowConfig?: SubWorkflowConfig

  // 通用配置（支持高级节点配置）
  config?: {
    timeout?: number // 超时时间（秒）
    retryPolicy?: {
      maxRetries: number // 最大重试次数
      backoff: 'fixed' | 'exponential' // 退避策略
      interval: number // 重试间隔（秒）
    }
    inputs?: Record<string, unknown> // 输入参数定义
    outputs?: Record<string, unknown> // 输出参数定义
    // 高级配置（可选，用于扩展）
    advancedCondition?: AdvancedCondition
    parallel?: ParallelConfig
    aiAgent?: AIAgentConfig
  }
}

/**
 * 工作流边定义
 */
export interface WorkflowEdge {
  id: string // 边唯一标识
  source: string // 源节点 ID
  target: string // 目标节点 ID
  type: EdgeType // 边类型

  // 条件边特定配置
  conditionConfig?: {
    condition: string // 条件表达式
    label?: string // 条件标签
  }

  // 样式配置
  style?: {
    color?: string
    width?: number
    style?: 'solid' | 'dashed' | 'dotted'
  }
}

/**
 * 工作流定义
 */
export interface WorkflowDefinition {
  id: string // 工作流 ID
  name: string // 工作流名称
  description?: string // 工作流描述
  version: number // 版本号
  status: WorkflowStatus // 状态

  // 工作流图
  nodes: WorkflowNode[] // 节点列表
  edges: WorkflowEdge[] // 边列表

  // 全局配置
  config: {
    timeout?: number // 全局超时时间（秒）
    retryPolicy?: {
      maxRetries: number
      backoff: 'fixed' | 'exponential'
      interval: number
    }
    variables?: Record<string, unknown> // 全局变量
  }

  // 元数据
  metadata: {
    createdAt: string
    updatedAt: string
    createdBy: string
    updatedBy: string
  }
}

/**
 * 节点执行结果
 */
export interface NodeExecutionResult {
  nodeId: string // 节点 ID
  status: NodeStatus // 执行状态
  startTime: string // 开始时间
  endTime?: string // 结束时间
  duration?: number // 执行时长（毫秒）

  // 执行数据
  input?: Record<string, unknown> // 输入数据
  output?: Record<string, unknown> // 输出数据
  error?: {
    code: string
    message: string
    stack?: string
  }

  // 执行日志
  logs?: Array<{
    timestamp: string
    level: 'info' | 'warn' | 'error' | 'debug'
    message: string
    data?: Record<string, unknown>
  }>

  // 重试信息
  retryCount?: number // 重试次数
  retryHistory?: Array<{
    attempt: number
    timestamp: string
    error?: string
  }>

  // 性能优化相关
  cached?: boolean // 是否来自缓存
  cacheKey?: string // 缓存键
}

/**
 * 工作流运行实例
 */
export interface WorkflowInstance {
  id: string // 实例 ID
  workflowId: string // 工作流 ID
  workflowVersion: number // 工作流版本
  status: InstanceStatus // 实例状态

  // 执行进度
  progress: {
    total: number // 总节点数
    completed: number // 已完成节点数
    failed: number // 失败节点数
    percentage: number // 完成百分比
  }

  // 节点执行结果
  nodeResults: Map<string, NodeExecutionResult>

  // 实例数据
  data: {
    inputs?: Record<string, unknown> // 初始输入
    outputs?: Record<string, unknown> // 最终输出
    variables?: Record<string, unknown> // 运行时变量
  }

  // 错误信息
  error?: {
    nodeId: string
    code: string
    message: string
    stack?: string
  }

  // 元数据
  metadata: {
    startedAt: string
    endedAt?: string
    duration?: number // 运行时长（毫秒）
    triggeredBy: string // 触发者
    triggerType: 'manual' | 'api' | 'scheduled' | 'webhook' // 触发类型
  }
}

/**
 * 工作流历史记录
 */
export interface WorkflowHistory {
  instances: WorkflowInstance[] // 运行实例列表
  summary: {
    total: number // 总运行次数
    success: number // 成功次数
    failed: number // 失败次数
    avgDuration?: number // 平均时长（毫秒）
  }
}

/**
 * 工作流统计信息
 */
export interface WorkflowStatistics {
  totalWorkflows: number // 总工作流数
  activeWorkflows: number // 激活的工作流数
  totalInstances: number // 总运行次数
  successRate: number // 成功率 (0-100)
  avgDuration: number // 平均运行时长（毫秒）
  popularNodes: Array<{
    // 常用节点
    type: NodeType
    count: number
  }>
}
