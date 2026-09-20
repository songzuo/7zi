/**
 * 工作流执行监控数据模型
 * 包含工作流执行、节点执行和性能指标的定义
 */

import { NodeStatus, InstanceStatus } from '@/types/workflow'

/**
 * 工作流执行状态
 */
export enum WorkflowExecutionStatus {
  PENDING = 'pending',      // 待执行
  RUNNING = 'running',      // 运行中
  COMPLETED = 'completed',  // 已完成
  FAILED = 'failed',       // 失败
  CANCELLED = 'cancelled', // 已取消
  PAUSED = 'paused',       // 已暂停
}

/**
 * 告警级别
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * 告警类型
 */
export enum AlertType {
  EXECUTION_TIMEOUT = 'execution_timeout',      // 执行超时
  NODE_FAILURE = 'node_failure',               // 节点失败
  CIRCULAR_DEPENDENCY = 'circular_dependency',  // 循环依赖
  RESOURCE_EXHAUSTED = 'resource_exhausted',   // 资源耗尽
  THRESHOLD_BREACHED = 'threshold_breached',   // 阈值突破
}

/**
 * 工作流执行记录
 */
export interface WorkflowExecution {
  id: string                     // 执行ID
  workflowId: string             // 工作流ID
  workflowName: string           // 工作流名称
  workflowVersion: number        // 工作流版本
  status: WorkflowExecutionStatus // 执行状态
  
  // 执行时间
  startTime: string              // 开始时间 (ISO)
  endTime?: string              // 结束时间 (ISO)
  duration?: number             // 执行时长 (毫秒)
  
  // 执行统计
  nodeCount: number             // 节点总数
  completedNodes: number        // 已完成节点数
  failedNodes: number           // 失败节点数
  skippedNodes: number          // 跳过节点数
  
  // 触发信息
  triggeredBy: string           // 触发者
  triggerType: 'manual' | 'api' | 'scheduled' | 'webhook' // 触发类型
  
  // 输入输出
  inputs?: Record<string, unknown>  // 输入数据
  outputs?: Record<string, unknown> // 输出数据
  
  // 错误信息
  error?: {
    nodeId?: string
    code: string
    message: string
    stack?: string
  }
  
  // 元数据
  metadata: {
    createdAt: string
    updatedAt: string
    tags?: string[]
  }
  
  // 变量
  variables: Record<string, unknown>
}

/**
 * 节点执行记录
 */
export interface NodeExecution {
  id: string                     // 记录ID
  executionId: string             // 所属执行ID
  nodeId: string                 // 节点ID
  nodeName: string               // 节点名称
  nodeType: string               // 节点类型
  
  // 执行状态
  status: NodeStatus             // 节点状态
  
  // 执行时间
  startTime: string              // 开始时间 (ISO)
  endTime?: string              // 结束时间 (ISO)
  duration?: number             // 执行时长 (毫秒)
  
  // 执行数据
  inputs?: Record<string, unknown>   // 输入数据
  outputs?: Record<string, unknown>  // 输出数据
  
  // 错误信息
  error?: {
    code: string
    message: string
    stack?: string
  }
  
  // 重试信息
  retryCount: number             // 重试次数
  retryHistory: Array<{
    attempt: number
    timestamp: string
    error?: string
  }>
  
  // 执行日志
  logs: Array<{
    timestamp: string
    level: 'info' | 'warn' | 'error' | 'debug'
    message: string
    data?: Record<string, unknown>
  }>
  
  // 性能指标
  metrics?: NodeExecutionMetrics
  
  // 依赖节点
  dependencies: string[]         // 依赖的节点ID列表
}

/**
 * 节点执行性能指标
 */
export interface NodeExecutionMetrics {
  cpuTime?: number              // CPU时间 (毫秒)
  memoryUsage?: number          // 内存使用 (字节)
  networkCalls?: number         // 网络调用次数
  apiCalls?: number            // API调用次数
  tokensUsed?: number          // 使用的token数
  cost?: number                // 成本 (美元)
}

/**
 * 性能指标汇总
 */
export interface ExecutionMetrics {
  // 工作流级别指标
  workflowId: string
  executionId: string
  
  // 时间指标
  totalDuration: number        // 总执行时长 (毫秒)
  avgNodeDuration: number      // 平均节点执行时长 (毫秒)
  maxNodeDuration: number      // 最长节点执行时长 (毫秒)
  minNodeDuration: number      // 最短节点执行时长 (毫秒)
  
  // 吞吐量指标
  throughput: number           // 节点/秒
  successRate: number          // 成功率 (0-100)
  
  // 资源使用
  totalCpuTime: number         // 总CPU时间
  totalMemoryUsage: number     // 总内存使用
  totalNetworkCalls: number    // 总网络调用
  totalApiCalls: number        // 总API调用
  
  // 成本
  totalCost: number            // 总成本 (美元)
  totalTokensUsed: number      // 总token使用
  
  // 节点详情
  nodeMetrics: NodeMetricsSummary[]
  
  // 时间范围
  timeRange: {
    start: string
    end: string
  }
}

/**
 * 节点指标摘要
 */
export interface NodeMetricsSummary {
  nodeId: string
  nodeName: string
  nodeType: string
  executionCount: number      // 执行次数
  successCount: number        // 成功次数
  failureCount: number        // 失败次数
  avgDuration: number        // 平均执行时长
  minDuration: number        // 最短执行时长
  maxDuration: number        // 最长执行时长
  totalDuration: number      // 总执行时长
  successRate: number        // 成功率
  avgCpuTime: number        // 平均CPU时间
  avgMemoryUsage: number    // 平均内存使用
}

/**
 * 告警配置
 */
export interface AlertConfig {
  id: string
  name: string
  type: AlertType
  level: AlertLevel
  
  // 阈值
  threshold?: {
    value: number
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  }
  
  // 超时配置
  timeout?: {
    duration: number  // 毫秒
  }
  
  // 启用状态
  enabled: boolean
  
  // 通知配置
  notify: {
    email?: boolean
    webhook?: boolean
    websocket?: boolean
  }
  
  // 创建时间
  createdAt: string
  updatedAt: string
}

/**
 * 告警记录
 */
export interface Alert {
  id: string
  executionId: string
  nodeId?: string
  type: AlertType
  level: AlertLevel
  message: string
  details?: Record<string, unknown>
  
  // 时间
  timestamp: string
  resolvedAt?: string
  
  // 状态
  status: 'active' | 'resolved' | 'acknowledged'
}

/**
 * 执行统计摘要
 */
export interface ExecutionSummary {
  workflowId: string
  
  // 总体统计
  totalExecutions: number
  successCount: number
  failureCount: number
  cancellationCount: number
  
  // 性能统计
  avgDuration: number
  minDuration: number
  maxDuration: number
  
  // 成功率
  successRate: number
  
  // 时间范围
  timeRange: {
    start: string
    end: string
  }
}

/**
 * 执行历史查询参数
 */
export interface ExecutionQueryParams {
  workflowId: string
  status?: WorkflowExecutionStatus
  triggerType?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
  orderBy?: 'startTime' | 'duration' | 'status'
  order?: 'asc' | 'desc'
}

/**
 * 实时执行事件
 */
export interface ExecutionEvent {
  type: 'started' | 'node_started' | 'node_completed' | 'node_failed' | 'completed' | 'failed' | 'cancelled' | 'progress'
  executionId: string
  nodeId?: string
  timestamp: string
  data: Record<string, unknown>
}
