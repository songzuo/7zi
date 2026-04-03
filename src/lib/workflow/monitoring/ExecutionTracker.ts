/**
 * 工作流执行追踪器
 * 追踪工作流执行状态 (pending/running/completed/failed)
 */

import {
  WorkflowExecution,
  WorkflowExecutionStatus,
  ExecutionQueryParams,
  ExecutionSummary,
} from './types'
import { InstanceStatus } from '@/types/workflow'

/**
 * 执行追踪器
 * 负责追踪和管理工作流执行状态
 */
export class ExecutionTracker {
  private executions: Map<string, WorkflowExecution> = new Map()
  private workflowExecutions: Map<string, Set<string>> = new Map() // workflowId -> executionIds
  private maxExecutions: number
  private retentionMs: number

  constructor(options?: { maxExecutions?: number; retentionMs?: number }) {
    this.maxExecutions = options?.maxExecutions || 10000
    this.retentionMs = options?.retentionMs || 7 * 24 * 60 * 60 * 1000 // 7天默认
  }

  /**
   * 创建新的执行记录
   */
  createExecution(params: {
    workflowId: string
    workflowName: string
    workflowVersion: number
    triggeredBy: string
    triggerType: 'manual' | 'api' | 'scheduled' | 'webhook'
    inputs?: Record<string, unknown>
    variables?: Record<string, unknown>
    nodeCount: number
  }): WorkflowExecution {
    const now = new Date().toISOString()
    const id = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const execution: WorkflowExecution = {
      id,
      workflowId: params.workflowId,
      workflowName: params.workflowName,
      workflowVersion: params.workflowVersion,
      status: WorkflowExecutionStatus.PENDING,
      startTime: now,
      nodeCount: params.nodeCount,
      completedNodes: 0,
      failedNodes: 0,
      skippedNodes: 0,
      triggeredBy: params.triggeredBy,
      triggerType: params.triggerType,
      inputs: params.inputs,
      variables: params.variables || {},
      metadata: {
        createdAt: now,
        updatedAt: now,
      },
    }

    // 存储执行记录
    this.executions.set(id, execution)

    // 更新工作流执行索引
    if (!this.workflowExecutions.has(params.workflowId)) {
      this.workflowExecutions.set(params.workflowId, new Set())
    }
    this.workflowExecutions.get(params.workflowId)!.add(id)

    // 清理旧记录
    this.cleanup()

    return execution
  }

  /**
   * 更新执行状态
   */
  updateStatus(
    executionId: string,
    status: WorkflowExecutionStatus,
    error?: { nodeId?: string; code: string; message: string; stack?: string }
  ): WorkflowExecution | undefined {
    const execution = this.executions.get(executionId)
    if (!execution) return undefined

    const now = new Date().toISOString()
    execution.status = status
    execution.metadata.updatedAt = now

    if (error) {
      execution.error = error
    }

    // 如果执行结束，更新结束时间
    if (
      status === WorkflowExecutionStatus.COMPLETED ||
      status === WorkflowExecutionStatus.FAILED ||
      status === WorkflowExecutionStatus.CANCELLED
    ) {
      execution.endTime = now
      execution.duration = new Date(now).getTime() - new Date(execution.startTime).getTime()
    }

    this.executions.set(executionId, execution)
    return execution
  }

  /**
   * 更新执行进度
   */
  updateProgress(
    executionId: string,
    progress: { completed?: number; failed?: number; skipped?: number }
  ): WorkflowExecution | undefined {
    const execution = this.executions.get(executionId)
    if (!execution) return undefined

    if (progress.completed !== undefined) {
      execution.completedNodes = progress.completed
    }
    if (progress.failed !== undefined) {
      execution.failedNodes = progress.failed
    }
    if (progress.skipped !== undefined) {
      execution.skippedNodes = progress.skipped
    }

    execution.metadata.updatedAt = new Date().toISOString()
    this.executions.set(executionId, execution)
    return execution
  }

  /**
   * 设置执行输出
   */
  setOutputs(executionId: string, outputs: Record<string, unknown>): void {
    const execution = this.executions.get(executionId)
    if (execution) {
      execution.outputs = outputs
      execution.metadata.updatedAt = new Date().toISOString()
    }
  }

  /**
   * 设置执行变量
   */
  setVariables(executionId: string, variables: Record<string, unknown>): void {
    const execution = this.executions.get(executionId)
    if (execution) {
      execution.variables = { ...execution.variables, ...variables }
      execution.metadata.updatedAt = new Date().toISOString()
    }
  }

  /**
   * 获取执行记录
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId)
  }

  /**
   * 获取工作流的所有执行记录
   */
  getExecutions(params: ExecutionQueryParams): {
    executions: WorkflowExecution[]
    total: number
  } {
    const { workflowId, status, triggerType, startDate, endDate, limit = 50, offset = 0, orderBy = 'startTime', order = 'desc' } = params

    // 获取该工作流的所有执行ID
    const executionIds = this.workflowExecutions.get(workflowId)
    if (!executionIds) {
      return { executions: [], total: 0 }
    }

    // 获取执行记录
    let executions = Array.from(executionIds)
      .map(id => this.executions.get(id)!)
      .filter(Boolean)

    // 应用过滤条件
    if (status) {
      executions = executions.filter(e => e.status === status)
    }
    if (triggerType) {
      executions = executions.filter(e => e.triggerType === triggerType)
    }
    if (startDate) {
      const start = new Date(startDate).getTime()
      executions = executions.filter(e => new Date(e.startTime).getTime() >= start)
    }
    if (endDate) {
      const end = new Date(endDate).getTime()
      executions = executions.filter(e => new Date(e.startTime).getTime() <= end)
    }

    // 排序
    executions.sort((a, b) => {
      let valueA: number | string
      let valueB: number | string

      switch (orderBy) {
        case 'duration':
          valueA = a.duration || 0
          valueB = b.duration || 0
          break
        case 'status':
          valueA = a.status
          valueB = b.status
          break
        default:
          valueA = new Date(a.startTime).getTime()
          valueB = new Date(b.startTime).getTime()
      }

      if (order === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0
      }
      return valueA > valueB ? -1 : valueA < valueB ? 1 : 0
    })

    const total = executions.length

    // 分页
    executions = executions.slice(offset, offset + limit)

    return { executions, total }
  }

  /**
   * 获取执行摘要统计
   */
  getSummary(workflowId: string, startDate?: string, endDate?: string): ExecutionSummary {
    const executionIds = this.workflowExecutions.get(workflowId)
    if (!executionIds) {
      const now = new Date().toISOString()
      return {
        workflowId,
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        cancellationCount: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
        timeRange: { start: now, end: now },
      }
    }

    let executions = Array.from(executionIds)
      .map(id => this.executions.get(id)!)
      .filter(Boolean)

    // 时间过滤
    if (startDate) {
      const start = new Date(startDate).getTime()
      executions = executions.filter(e => new Date(e.startTime).getTime() >= start)
    }
    if (endDate) {
      const end = new Date(endDate).getTime()
      executions = executions.filter(e => new Date(e.startTime).getTime() <= end)
    }

    // 计算统计
    const total = executions.length
    const successCount = executions.filter(e => e.status === WorkflowExecutionStatus.COMPLETED).length
    const failureCount = executions.filter(e => e.status === WorkflowExecutionStatus.FAILED).length
    const cancellationCount = executions.filter(e => e.status === WorkflowExecutionStatus.CANCELLED).length

    const durations = executions
      .filter(e => e.duration !== undefined)
      .map(e => e.duration!)

    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0

    // 时间范围
    const times = executions.map(e => new Date(e.startTime).getTime())
    const timeRange = {
      start: times.length > 0 ? new Date(Math.min(...times)).toISOString() : new Date().toISOString(),
      end: times.length > 0 ? new Date(Math.max(...times)).toISOString() : new Date().toISOString(),
    }

    return {
      workflowId,
      totalExecutions: total,
      successCount,
      failureCount,
      cancellationCount,
      avgDuration,
      minDuration,
      maxDuration,
      successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
      timeRange,
    }
  }

  /**
   * 删除执行记录
   */
  deleteExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId)
    if (!execution) return false

    // 从工作流索引中移除
    const workflowExecs = this.workflowExecutions.get(execution.workflowId)
    if (workflowExecs) {
      workflowExecs.delete(executionId)
    }

    // 删除执行记录
    return this.executions.delete(executionId)
  }

  /**
   * 清理过期记录
   */
  private cleanup(): void {
    if (this.executions.size <= this.maxExecutions) return

    const cutoffTime = Date.now() - this.retentionMs
    const toDelete: string[] = []

    this.executions.forEach((execution, id) => {
      // 保留运行中的执行
      if (execution.status === WorkflowExecutionStatus.RUNNING) return

      // 删除过期记录
      if (new Date(execution.startTime).getTime() < cutoffTime) {
        toDelete.push(id)
      }
    })

    // 删除过期记录
    toDelete.forEach(id => this.deleteExecution(id))
  }

  /**
   * 获取活跃执行数量
   */
  getActiveCount(workflowId?: string): number {
    if (workflowId) {
      const executionIds = this.workflowExecutions.get(workflowId)
      if (!executionIds) return 0
      return Array.from(executionIds)
        .filter(id => {
          const exec = this.executions.get(id)
          return exec?.status === WorkflowExecutionStatus.RUNNING
        }).length
    }

    return Array.from(this.executions.values())
      .filter(e => e.status === WorkflowExecutionStatus.RUNNING).length
  }

  /**
   * 转换为实例状态
   */
  static toInstanceStatus(status: WorkflowExecutionStatus): InstanceStatus {
    const mapping: Record<WorkflowExecutionStatus, InstanceStatus> = {
      [WorkflowExecutionStatus.PENDING]: InstanceStatus.PENDING,
      [WorkflowExecutionStatus.RUNNING]: InstanceStatus.RUNNING,
      [WorkflowExecutionStatus.COMPLETED]: InstanceStatus.COMPLETED,
      [WorkflowExecutionStatus.FAILED]: InstanceStatus.FAILED,
      [WorkflowExecutionStatus.CANCELLED]: InstanceStatus.CANCELLED,
      [WorkflowExecutionStatus.PAUSED]: InstanceStatus.PENDING,
    }
    return mapping[status] || InstanceStatus.PENDING
  }
}

// 导出单例
export const executionTracker = new ExecutionTracker()
