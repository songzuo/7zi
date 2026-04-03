/**
 * 工作流执行监控系统
 * 整合执行追踪、节点记录、指标收集和告警管理
 */

import { ExecutionTracker } from './ExecutionTracker'
import { StepRecorder } from './StepRecorder'
import { MetricsCollector } from './MetricsCollector'
import { AlertManager } from './AlertManager'
import {
  WorkflowExecution,
  NodeExecution,
  ExecutionMetrics,
  Alert,
  ExecutionEvent,
  WorkflowExecutionStatus,
  NodeStatus,
} from './types'

/**
 * 监控系统配置
 */
export interface MonitoringConfig {
  maxExecutions?: number
  maxRecords?: number
  retentionMs?: number
  cacheTtl?: number
}

/**
 * 监控系统
 * 整合所有监控组件
 */
export class WorkflowMonitoring {
  public executionTracker: ExecutionTracker
  public stepRecorder: StepRecorder
  public metricsCollector: MetricsCollector
  public alertManager: AlertManager

  // 事件监听器
  private eventListeners: Map<string, Set<(event: ExecutionEvent) => void>> = new Map()

  constructor(config?: MonitoringConfig) {
    this.executionTracker = new ExecutionTracker({
      maxExecutions: config?.maxExecutions,
      retentionMs: config?.retentionMs,
    })

    this.stepRecorder = new StepRecorder({
      maxRecords: config?.maxRecords,
    })

    this.metricsCollector = new MetricsCollector(
      this.executionTracker,
      this.stepRecorder,
      { cacheTtl: config?.cacheTtl }
    )

    this.alertManager = new AlertManager()
  }

  /**
   * 开始监控执行
   */
  startExecution(params: {
    workflowId: string
    workflowName: string
    workflowVersion: number
    triggeredBy: string
    triggerType: 'manual' | 'api' | 'scheduled' | 'webhook'
    inputs?: Record<string, unknown>
    variables?: Record<string, unknown>
    nodeCount: number
    timeoutMs?: number
  }): WorkflowExecution {
    // 创建执行记录
    const execution = this.executionTracker.createExecution(params)

    // 设置超时检测
    if (params.timeoutMs) {
      this.alertManager.setTimeoutDetection(
        execution.id,
        params.timeoutMs,
        () => {
          this.executionTracker.updateStatus(execution.id, WorkflowExecutionStatus.FAILED, {
            code: 'TIMEOUT',
            message: `执行超时 (${params.timeoutMs}ms)`,
          })
        }
      )
    }

    // 发送事件
    this.emitEvent({
      type: 'started',
      executionId: execution.id,
      timestamp: new Date().toISOString(),
      data: { workflowId: params.workflowId, triggeredBy: params.triggeredBy },
    })

    return execution
  }

  /**
   * 更新执行状态
   */
  updateExecutionStatus(
    executionId: string,
    status: WorkflowExecutionStatus,
    error?: { nodeId?: string; code: string; message: string; stack?: string }
  ): WorkflowExecution | undefined {
    const execution = this.executionTracker.updateStatus(executionId, status, error)

    // 清除超时检测
    if (
      status === WorkflowExecutionStatus.COMPLETED ||
      status === WorkflowExecutionStatus.FAILED ||
      status === WorkflowExecutionStatus.CANCELLED
    ) {
      this.alertManager.clearTimeoutDetection(executionId)
    }

    // 发送事件
    if (execution) {
      this.emitEvent({
        type: status === WorkflowExecutionStatus.COMPLETED ? 'completed' : 
              status === WorkflowExecutionStatus.FAILED ? 'failed' : 'cancelled',
        executionId,
        timestamp: new Date().toISOString(),
        data: { status, error },
      })
    }

    return execution
  }

  /**
   * 开始节点执行
   */
  startNode(
    executionId: string,
    nodeId: string,
    nodeName: string,
    nodeType: string,
    inputs?: Record<string, unknown>,
    dependencies?: string[]
  ): NodeExecution {
    // 创建节点执行记录
    const nodeExecution = this.stepRecorder.createNodeExecution({
      executionId,
      nodeId,
      nodeName,
      nodeType,
      inputs,
      dependencies,
    })

    // 更新依赖缓存（用于循环依赖检测）
    if (dependencies) {
      this.alertManager.updateDependencyCache(nodeId, dependencies)
    }

    // 开始执行
    this.stepRecorder.startNodeExecution(executionId, nodeId, inputs)

    // 发送事件
    this.emitEvent({
      type: 'node_started',
      executionId,
      nodeId,
      timestamp: new Date().toISOString(),
      data: { nodeName, nodeType },
    })

    return nodeExecution
  }

  /**
   * 完成节点执行
   */
  completeNode(
    executionId: string,
    nodeId: string,
    outputs?: Record<string, unknown>,
    metrics?: {
      cpuTime?: number
      memoryUsage?: number
      networkCalls?: number
      apiCalls?: number
      tokensUsed?: number
      cost?: number
    }
  ): NodeExecution | undefined {
    const nodeExecution = this.stepRecorder.completeNodeExecution(
      executionId,
      nodeId,
      outputs,
      metrics
    )

    // 更新执行进度
    if (nodeExecution) {
      const execution = this.executionTracker.getExecution(executionId)
      if (execution) {
        this.executionTracker.updateProgress(executionId, {
          completed: execution.completedNodes + 1,
        })
      }
    }

    // 发送事件
    this.emitEvent({
      type: 'node_completed',
      executionId,
      nodeId,
      timestamp: new Date().toISOString(),
      data: { outputs, metrics },
    })

    return nodeExecution
  }

  /**
   * 节点执行失败
   */
  failNode(
    executionId: string,
    nodeId: string,
    error: { code: string; message: string; stack?: string }
  ): NodeExecution | undefined {
    const nodeExecution = this.stepRecorder.failNodeExecution(executionId, nodeId, error)

    // 检测节点失败告警
    if (nodeExecution) {
      this.alertManager.checkNodeFailure(nodeExecution)

      // 更新执行进度
      const execution = this.executionTracker.getExecution(executionId)
      if (execution) {
        this.executionTracker.updateProgress(executionId, {
          failed: execution.failedNodes + 1,
        })
      }
    }

    // 发送事件
    this.emitEvent({
      type: 'node_failed',
      executionId,
      nodeId,
      timestamp: new Date().toISOString(),
      data: { error },
    })

    return nodeExecution
  }

  /**
   * 跳过节点
   */
  skipNode(
    executionId: string,
    nodeId: string,
    reason: string
  ): NodeExecution | undefined {
    const nodeExecution = this.stepRecorder.skipNodeExecution(executionId, nodeId, reason)

    // 更新执行进度
    if (nodeExecution) {
      const execution = this.executionTracker.getExecution(executionId)
      if (execution) {
        this.executionTracker.updateProgress(executionId, {
          skipped: execution.skippedNodes + 1,
        })
      }
    }

    return nodeExecution
  }

  /**
   * 记录节点重试
   */
  recordNodeRetry(
    executionId: string,
    nodeId: string,
    error?: string
  ): NodeExecution | undefined {
    return this.stepRecorder.recordRetry(executionId, nodeId, error)
  }

  /**
   * 添加节点日志
   */
  addNodeLog(
    executionId: string,
    nodeId: string,
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    data?: Record<string, unknown>
  ): void {
    const nodeExec = this.stepRecorder.findNodeExecution(executionId, nodeId)
    if (nodeExec) {
      this.stepRecorder.addLog(nodeExec.id, level, message, data)
    }
  }

  /**
   * 设置执行输出
   */
  setExecutionOutputs(executionId: string, outputs: Record<string, unknown>): void {
    this.executionTracker.setOutputs(executionId, outputs)
  }

  /**
   * 设置执行变量
   */
  setExecutionVariables(executionId: string, variables: Record<string, unknown>): void {
    this.executionTracker.setVariables(executionId, variables)
  }

  /**
   * 获取执行记录
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executionTracker.getExecution(executionId)
  }

  /**
   * 获取执行历史
   */
  getExecutions(params: {
    workflowId: string
    status?: WorkflowExecutionStatus
    triggerType?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
    orderBy?: 'startTime' | 'duration' | 'status'
    order?: 'asc' | 'desc'
  }) {
    return this.executionTracker.getExecutions(params)
  }

  /**
   * 获取执行详情
   */
  getExecutionDetails(executionId: string): {
    execution: WorkflowExecution | undefined
    nodes: NodeExecution[]
    metrics: ExecutionMetrics | null
    alerts: Alert[]
  } {
    const execution = this.executionTracker.getExecution(executionId)
    const nodes = this.stepRecorder.getExecutionNodes(executionId)
    const metrics = execution
      ? this.metricsCollector.getExecutionMetrics(execution.workflowId, executionId)
      : null
    const alerts = this.alertManager.getExecutionAlerts(executionId)

    return { execution, nodes, metrics, alerts }
  }

  /**
   * 获取性能指标
   */
  getMetrics(workflowId: string, executionId?: string): ExecutionMetrics | null {
    if (executionId) {
      return this.metricsCollector.getExecutionMetrics(workflowId, executionId)
    }
    return null
  }

  /**
   * 获取工作流指标
   */
  getWorkflowMetrics(workflowId: string, options?: { startDate?: string; endDate?: string }) {
    return this.metricsCollector.getWorkflowMetrics(workflowId, options)
  }

  /**
   * 获取性能趋势
   */
  getPerformanceTrend(workflowId: string, days?: number) {
    return this.metricsCollector.getPerformanceTrend(workflowId, days)
  }

  /**
   * 获取瓶颈节点
   */
  getBottleneckNodes(workflowId: string, limit?: number) {
    return this.metricsCollector.getBottleneckNodes(workflowId, limit)
  }

  /**
   * 获取告警
   */
  getAlert(alertId: string): Alert | undefined {
    return this.alertManager.getAlert(alertId)
  }

  /**
   * 获取执行告警
   */
  getExecutionAlerts(executionId: string): Alert[] {
    return this.alertManager.getExecutionAlerts(executionId)
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): Alert[] {
    return this.alertManager.getActiveAlerts()
  }

  /**
   * 解决议警
   */
  resolveAlert(alertId: string): boolean {
    return this.alertManager.resolveAlert(alertId)
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string): boolean {
    return this.alertManager.acknowledgeAlert(alertId)
  }

  /**
   * 取消执行
   */
  cancelExecution(executionId: string): WorkflowExecution | undefined {
    // 清除超时检测
    this.alertManager.clearTimeoutDetection(executionId)

    // 更新状态
    return this.executionTracker.updateStatus(executionId, WorkflowExecutionStatus.CANCELLED)
  }

  /**
   * 删除执行记录
   */
  deleteExecution(executionId: string): boolean {
    // 清理告警
    this.alertManager.cleanupExecutionAlerts(executionId)

    // 清理节点记录
    this.stepRecorder.deleteExecutionNodes(executionId)

    // 清除缓存
    const execution = this.executionTracker.getExecution(executionId)
    if (execution) {
      this.metricsCollector.clearWorkflowCache(execution.workflowId)
    }

    // 删除执行记录
    return this.executionTracker.deleteExecution(executionId)
  }

  /**
   * 注册事件监听器
   */
  on(eventType: string, listener: (event: ExecutionEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(listener)
  }

  /**
   * 移除事件监听器
   */
  off(eventType: string, listener: (event: ExecutionEvent) => void): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  /**
   * 发送事件
   */
  private emitEvent(event: ExecutionEvent): void {
    const listeners = this.eventListeners.get(event.type)
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event)
        } catch (error) {
          console.error('Error in event listener:', error)
        }
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats(workflowId?: string): {
    executions: {
      total: number
      active: number
      completed: number
      failed: number
      cancelled: number
    }
    alerts: ReturnType<AlertManager['getAlertStats']>
  } {
    const executions = this.executionTracker.getExecutions({
      workflowId: workflowId || '',
      limit: 10000,
    })

    return {
      executions: {
        total: executions.total,
        active: executions.executions.filter(e => e.status === WorkflowExecutionStatus.RUNNING).length,
        completed: executions.executions.filter(e => e.status === WorkflowExecutionStatus.COMPLETED).length,
        failed: executions.executions.filter(e => e.status === WorkflowExecutionStatus.FAILED).length,
        cancelled: executions.executions.filter(e => e.status === WorkflowExecutionStatus.CANCELLED).length,
      },
      alerts: this.alertManager.getAlertStats(),
    }
  }

  /**
   * 清理旧数据
   */
  cleanup(): void {
    this.alertManager.cleanupOldAlerts()
    this.metricsCollector.clearCache()
  }
}

// 导出单例
export const workflowMonitoring = new WorkflowMonitoring()