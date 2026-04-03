/**
 * 节点执行记录器
 * 记录每个节点的执行详情（输入/输出/耗时/状态）
 */

import {
  NodeExecution,
  NodeExecutionMetrics,
} from './types'
import { NodeStatus } from '@/types/workflow'

/**
 * 节点执行记录器
 * 负责记录和管理节点执行详情
 */
export class StepRecorder {
  private nodeExecutions: Map<string, NodeExecution> = new Map()
  private executionNodes: Map<string, Set<string>> = new Map() // executionId -> nodeExecutionIds
  private maxRecords: number

  constructor(options?: { maxRecords?: number }) {
    this.maxRecords = options?.maxRecords || 50000
  }

  /**
   * 创建节点执行记录
   */
  createNodeExecution(params: {
    executionId: string
    nodeId: string
    nodeName: string
    nodeType: string
    inputs?: Record<string, unknown>
    dependencies?: string[]
  }): NodeExecution {
    const now = new Date().toISOString()
    const id = `node_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const nodeExecution: NodeExecution = {
      id,
      executionId: params.executionId,
      nodeId: params.nodeId,
      nodeName: params.nodeName,
      nodeType: params.nodeType,
      status: NodeStatus.IDLE,
      startTime: now,
      inputs: params.inputs,
      retryCount: 0,
      retryHistory: [],
      logs: [],
      dependencies: params.dependencies || [],
    }

    // 存储记录
    this.nodeExecutions.set(id, nodeExecution)

    // 更新执行节点索引
    if (!this.executionNodes.has(params.executionId)) {
      this.executionNodes.set(params.executionId, new Set())
    }
    this.executionNodes.get(params.executionId)!.add(id)

    // 清理旧记录
    this.cleanup()

    return nodeExecution
  }

  /**
   * 开始节点执行
   */
  startNodeExecution(
    executionId: string,
    nodeId: string,
    inputs?: Record<string, unknown>
  ): NodeExecution | undefined {
    // 查找该节点的执行记录
    const nodeExec = this.findNodeExecution(executionId, nodeId)
    if (!nodeExec) return undefined

    const now = new Date().toISOString()
    nodeExec.status = NodeStatus.RUNNING
    nodeExec.startTime = now
    if (inputs) {
      nodeExec.inputs = inputs
    }

    this.addLog(nodeExec.id, 'info', `节点 ${nodeId} 开始执行`, { inputs })
    this.nodeExecutions.set(nodeExec.id, nodeExec)
    return nodeExec
  }

  /**
   * 完成节点执行
   */
  completeNodeExecution(
    executionId: string,
    nodeId: string,
    outputs?: Record<string, unknown>,
    metrics?: NodeExecutionMetrics
  ): NodeExecution | undefined {
    const nodeExec = this.findNodeExecution(executionId, nodeId)
    if (!nodeExec) return undefined

    const now = new Date().toISOString()
    nodeExec.status = NodeStatus.SUCCESS
    nodeExec.endTime = now
    nodeExec.duration = new Date(now).getTime() - new Date(nodeExec.startTime).getTime()
    
    if (outputs) {
      nodeExec.outputs = outputs
    }
    if (metrics) {
      nodeExec.metrics = metrics
    }

    this.addLog(nodeExec.id, 'info', `节点 ${nodeId} 执行成功`, { 
      duration: nodeExec.duration,
      outputs 
    })
    this.nodeExecutions.set(nodeExec.id, nodeExec)
    return nodeExec
  }

  /**
   * 节点执行失败
   */
  failNodeExecution(
    executionId: string,
    nodeId: string,
    error: { code: string; message: string; stack?: string }
  ): NodeExecution | undefined {
    const nodeExec = this.findNodeExecution(executionId, nodeId)
    if (!nodeExec) return undefined

    const now = new Date().toISOString()
    nodeExec.status = NodeStatus.FAILED
    nodeExec.endTime = now
    nodeExec.duration = new Date(now).getTime() - new Date(nodeExec.startTime).getTime()
    nodeExec.error = error

    this.addLog(nodeExec.id, 'error', `节点 ${nodeId} 执行失败: ${error.message}`, { error })
    this.nodeExecutions.set(nodeExec.id, nodeExec)
    return nodeExec
  }

  /**
   * 跳过节点执行
   */
  skipNodeExecution(
    executionId: string,
    nodeId: string,
    reason: string
  ): NodeExecution | undefined {
    const nodeExec = this.findNodeExecution(executionId, nodeId)
    if (!nodeExec) return undefined

    const now = new Date().toISOString()
    nodeExec.status = NodeStatus.SKIPPED
    nodeExec.endTime = now
    nodeExec.duration = 0

    this.addLog(nodeExec.id, 'info', `节点 ${nodeId} 被跳过: ${reason}`)
    this.nodeExecutions.set(nodeExec.id, nodeExec)
    return nodeExec
  }

  /**
   * 记录节点重试
   */
  recordRetry(
    executionId: string,
    nodeId: string,
    error?: string
  ): NodeExecution | undefined {
    const nodeExec = this.findNodeExecution(executionId, nodeId)
    if (!nodeExec) return undefined

    nodeExec.retryCount++
    nodeExec.retryHistory.push({
      attempt: nodeExec.retryCount,
      timestamp: new Date().toISOString(),
      error,
    })

    this.addLog(
      nodeExec.id,
      'warn',
      `节点 ${nodeId} 重试 #${nodeExec.retryCount}`,
      { error }
    )
    this.nodeExecutions.set(nodeExec.id, nodeExec)
    return nodeExec
  }

  /**
   * 添加执行日志
   */
  addLog(
    nodeExecutionId: string,
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    data?: Record<string, unknown>
  ): void {
    const nodeExec = this.nodeExecutions.get(nodeExecutionId)
    if (nodeExec) {
      nodeExec.logs.push({
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
      })
    }
  }

  /**
   * 查找节点执行记录
   */
  findNodeExecution(executionId: string, nodeId: string): NodeExecution | undefined {
    const nodeExecutionIds = this.executionNodes.get(executionId)
    if (!nodeExecutionIds) return undefined

    for (const id of nodeExecutionIds) {
      const nodeExec = this.nodeExecutions.get(id)
      if (nodeExec?.nodeId === nodeId) {
        return nodeExec
      }
    }
    return undefined
  }

  /**
   * 获取节点执行记录
   */
  getNodeExecution(nodeExecutionId: string): NodeExecution | undefined {
    return this.nodeExecutions.get(nodeExecutionId)
  }

  /**
   * 获取执行的所有节点记录
   */
  getExecutionNodes(executionId: string): NodeExecution[] {
    const nodeExecutionIds = this.executionNodes.get(executionId)
    if (!nodeExecutionIds) return []

    return Array.from(nodeExecutionIds)
      .map(id => this.nodeExecutions.get(id)!)
      .filter(Boolean)
  }

  /**
   * 获取节点执行统计
   */
  getNodeStats(executionId: string): {
    total: number
    completed: number
    failed: number
    skipped: number
    running: number
    pending: number
  } {
    const nodes = this.getExecutionNodes(executionId)

    return {
      total: nodes.length,
      completed: nodes.filter(n => n.status === NodeStatus.SUCCESS).length,
      failed: nodes.filter(n => n.status === NodeStatus.FAILED).length,
      skipped: nodes.filter(n => n.status === NodeStatus.SKIPPED).length,
      running: nodes.filter(n => n.status === NodeStatus.RUNNING).length,
      pending: nodes.filter(n => n.status === NodeStatus.IDLE || n.status === NodeStatus.PENDING).length,
    }
  }

  /**
   * 获取执行路径
   * 返回节点执行的顺序路径
   */
  getExecutionPath(executionId: string): NodeExecution[] {
    const nodes = this.getExecutionNodes(executionId)

    // 按开始时间排序
    return nodes.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
  }

  /**
   * 获取关键路径
   * 返回执行时间最长的路径
   */
  getCriticalPath(executionId: string): NodeExecution[] {
    const nodes = this.getExecutionNodes(executionId)
    
    // 按执行时长降序排序
    return nodes
      .filter(n => n.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
  }

  /**
   * 删除执行的节点记录
   */
  deleteExecutionNodes(executionId: string): number {
    const nodeExecutionIds = this.executionNodes.get(executionId)
    if (!nodeExecutionIds) return 0

    let count = 0
    for (const id of nodeExecutionIds) {
      if (this.nodeExecutions.delete(id)) {
        count++
      }
    }
    this.executionNodes.delete(executionId)
    return count
  }

  /**
   * 清理旧记录
   */
  private cleanup(): void {
    if (this.nodeExecutions.size <= this.maxRecords) return

    // 获取所有记录并按时间排序
    const entries = Array.from(this.nodeExecutions.entries())
      .sort((a, b) => 
        new Date(b[1].startTime).getTime() - new Date(a[1].startTime).getTime()
      )

    // 保留最新的记录
    const toDelete = entries.slice(this.maxRecords)
    for (const [id, nodeExec] of toDelete) {
      this.nodeExecutions.delete(id)
      
      // 从执行节点索引中移除
      const execNodes = this.executionNodes.get(nodeExec.executionId)
      if (execNodes) {
        execNodes.delete(id)
      }
    }
  }

  /**
   * 导出执行详情
   */
  exportExecutionDetails(executionId: string): {
    nodes: NodeExecution[]
    summary: ReturnType<StepRecorder['getNodeStats']>
    path: NodeExecution[]
    criticalPath: NodeExecution[]
  } | null {
    const nodes = this.getExecutionNodes(executionId)
    if (nodes.length === 0) return null

    return {
      nodes,
      summary: this.getNodeStats(executionId),
      path: this.getExecutionPath(executionId),
      criticalPath: this.getCriticalPath(executionId),
    }
  }
}

// 导出单例
export const stepRecorder = new StepRecorder()
