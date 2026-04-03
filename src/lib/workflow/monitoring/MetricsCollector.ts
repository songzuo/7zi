/**
 * 性能指标收集器
 * 收集性能指标（节点执行时间、吞吐量、成功率）
 */

import {
  ExecutionMetrics,
  NodeMetricsSummary,
  WorkflowExecutionStatus,
} from './types'
import { NodeStatus } from '@/types/workflow'
import { ExecutionTracker } from './ExecutionTracker'
import { StepRecorder, NodeExecution } from './StepRecorder'

/**
 * 性能指标收集器
 * 负责收集和分析工作流执行性能指标
 */
export class MetricsCollector {
  private executionTracker: ExecutionTracker
  private stepRecorder: StepRecorder

  // 指标缓存
  private metricsCache: Map<string, { metrics: ExecutionMetrics; timestamp: number }> = new Map()
  private cacheTtl: number = 60000 // 1分钟缓存

  constructor(
    executionTracker: ExecutionTracker,
    stepRecorder: StepRecorder,
    options?: { cacheTtl?: number }
  ) {
    this.executionTracker = executionTracker
    this.stepRecorder = stepRecorder
    this.cacheTtl = options?.cacheTtl || 60000
  }

  /**
   * 获取执行性能指标
   */
  getExecutionMetrics(workflowId: string, executionId: string): ExecutionMetrics | null {
    // 检查缓存
    const cacheKey = `${workflowId}:${executionId}`
    const cached = this.metricsCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.metrics
    }

    // 获取执行记录
    const execution = this.executionTracker.getExecution(executionId)
    if (!execution) return null

    // 获取节点执行记录
    const nodeExecutions = this.stepRecorder.getExecutionNodes(executionId)
    if (nodeExecutions.length === 0) return null

    // 计算指标
    const metrics = this.calculateMetrics(workflowId, executionId, nodeExecutions, execution)

    // 缓存结果
    this.metricsCache.set(cacheKey, { metrics, timestamp: Date.now() })

    return metrics
  }

  /**
   * 计算性能指标
   */
  private calculateMetrics(
    workflowId: string,
    executionId: string,
    nodeExecutions: NodeExecution[],
    execution: { startTime: string; endTime?: string; duration?: number }
  ): ExecutionMetrics {
    // 时间指标
    const durations = nodeExecutions
      .filter(n => n.duration !== undefined)
      .map(n => n.duration!)

    const totalDuration = execution.duration || 0
    const avgNodeDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0
    const maxNodeDuration = durations.length > 0 ? Math.max(...durations) : 0
    const minNodeDuration = durations.length > 0 ? Math.min(...durations) : 0

    // 吞吐量指标
    const successCount = nodeExecutions.filter(n => n.status === NodeStatus.SUCCESS).length
    const totalCount = nodeExecutions.length
    const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0
    const throughput = totalDuration > 0 ? Math.round((totalCount / totalDuration) * 1000) : 0 // 节点/秒

    // 资源使用
    const metricsSum = nodeExecutions
      .filter(n => n.metrics)
      .reduce(
        (acc, n) => ({
          cpuTime: acc.cpuTime + (n.metrics?.cpuTime || 0),
          memoryUsage: acc.memoryUsage + (n.metrics?.memoryUsage || 0),
          networkCalls: acc.networkCalls + (n.metrics?.networkCalls || 0),
          apiCalls: acc.apiCalls + (n.metrics?.apiCalls || 0),
          tokensUsed: acc.tokensUsed + (n.metrics?.tokensUsed || 0),
          cost: acc.cost + (n.metrics?.cost || 0),
        }),
        { cpuTime: 0, memoryUsage: 0, networkCalls: 0, apiCalls: 0, tokensUsed: 0, cost: 0 }
      )

    // 节点指标摘要
    const nodeMetrics = this.calculateNodeMetrics(nodeExecutions)

    return {
      workflowId,
      executionId,
      totalDuration,
      avgNodeDuration,
      maxNodeDuration,
      minNodeDuration,
      throughput,
      successRate,
      totalCpuTime: metricsSum.cpuTime,
      totalMemoryUsage: metricsSum.memoryUsage,
      totalNetworkCalls: metricsSum.networkCalls,
      totalApiCalls: metricsSum.apiCalls,
      totalTokensUsed: metricsSum.tokensUsed,
      totalCost: metricsSum.cost,
      nodeMetrics,
      timeRange: {
        start: execution.startTime,
        end: execution.endTime || execution.startTime,
      },
    }
  }

  /**
   * 计算节点级别指标
   */
  private calculateNodeMetrics(nodeExecutions: NodeExecution[]): NodeMetricsSummary[] {
    // 按节点分组
    const nodeGroups = new Map<string, NodeExecution[]>()
    for (const nodeExec of nodeExecutions) {
      const key = nodeExec.nodeId
      if (!nodeGroups.has(key)) {
        nodeGroups.set(key, [])
      }
      nodeGroups.get(key)!.push(nodeExec)
    }

    // 计算每个节点的指标
    const metrics: NodeMetricsSummary[] = []

    nodeGroups.forEach((execs, nodeId) => {
      const durations = execs
        .filter(e => e.duration !== undefined)
        .map(e => e.duration!)

      const successCount = execs.filter(e => e.status === NodeStatus.SUCCESS).length
      const failureCount = execs.filter(e => e.status === NodeStatus.FAILED).length

      const cpuTimes = execs.filter(e => e.metrics?.cpuTime).map(e => e.metrics!.cpuTime!)
      const memoryUsages = execs.filter(e => e.metrics?.memoryUsage).map(e => e.metrics!.memoryUsage!)

      metrics.push({
        nodeId,
        nodeName: execs[0]?.nodeName || nodeId,
        nodeType: execs[0]?.nodeType || 'unknown',
        executionCount: execs.length,
        successCount,
        failureCount,
        avgDuration: durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0,
        minDuration: durations.length > 0 ? Math.min(...durations) : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
        totalDuration: durations.reduce((a, b) => a + b, 0),
        successRate: execs.length > 0 ? Math.round((successCount / execs.length) * 100) : 0,
        avgCpuTime: cpuTimes.length > 0
          ? Math.round(cpuTimes.reduce((a, b) => a + b, 0) / cpuTimes.length)
          : 0,
        avgMemoryUsage: memoryUsages.length > 0
          ? Math.round(memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length)
          : 0,
      })
    })

    return metrics
  }

  /**
   * 获取工作流历史性能指标
   */
  getWorkflowMetrics(
    workflowId: string,
    options?: {
      startDate?: string
      endDate?: string
    }
  ): {
    avgDuration: number
    avgSuccessRate: number
    avgThroughput: number
    totalExecutions: number
    totalCost: number
    totalTokensUsed: number
    nodeMetrics: NodeMetricsSummary[]
  } {
    // 获取执行历史
    const { executions } = this.executionTracker.getExecutions({
      workflowId,
      startDate: options?.startDate,
      endDate: options?.endDate,
      limit: 1000, // 获取足够多的记录用于统计
    })

    if (executions.length === 0) {
      return {
        avgDuration: 0,
        avgSuccessRate: 0,
        avgThroughput: 0,
        totalExecutions: 0,
        totalCost: 0,
        totalTokensUsed: 0,
        nodeMetrics: [],
      }
    }

    // 汇总指标
    let totalDuration = 0
    let totalSuccessRate = 0
    let totalThroughput = 0
    let totalCost = 0
    let totalTokensUsed = 0
    const allNodeExecutions: NodeExecution[] = []

    for (const execution of executions) {
      const metrics = this.getExecutionMetrics(workflowId, execution.id)
      if (metrics) {
        totalDuration += metrics.totalDuration
        totalSuccessRate += metrics.successRate
        totalThroughput += metrics.throughput
        totalCost += metrics.totalCost
        totalTokensUsed += metrics.totalTokensUsed
      }

      // 收集节点执行记录
      const nodeExecs = this.stepRecorder.getExecutionNodes(execution.id)
      allNodeExecutions.push(...nodeExecs)
    }

    const count = executions.length

    return {
      avgDuration: Math.round(totalDuration / count),
      avgSuccessRate: Math.round(totalSuccessRate / count),
      avgThroughput: Math.round(totalThroughput / count),
      totalExecutions: count,
      totalCost: Math.round(totalCost * 100) / 100,
      totalTokensUsed,
      nodeMetrics: this.calculateNodeMetrics(allNodeExecutions),
    }
  }

  /**
   * 获取性能趋势
   */
  getPerformanceTrend(
    workflowId: string,
    days: number = 7
  ): Array<{
    date: string
    executions: number
    avgDuration: number
    successRate: number
  }> {
    const trend: Array<{
      date: string
      executions: number
      avgDuration: number
      successRate: number
    }> = []

    const now = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const { executions } = this.executionTracker.getExecutions({
        workflowId,
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        limit: 1000,
      })

      let totalDuration = 0
      let totalSuccessRate = 0

      for (const exec of executions) {
        const metrics = this.getExecutionMetrics(workflowId, exec.id)
        if (metrics) {
          totalDuration += metrics.totalDuration
          totalSuccessRate += metrics.successRate
        }
      }

      trend.push({
        date: dateStr,
        executions: executions.length,
        avgDuration: executions.length > 0 ? Math.round(totalDuration / executions.length) : 0,
        successRate: executions.length > 0 ? Math.round(totalSuccessRate / executions.length) : 0,
      })
    }

    return trend
  }

  /**
   * 获取瓶颈节点
   * 返回执行时间最长的节点
   */
  getBottleneckNodes(
    workflowId: string,
    limit: number = 5
  ): NodeMetricsSummary[] {
    const metrics = this.getWorkflowMetrics(workflowId)
    
    return metrics.nodeMetrics
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit)
  }

  /**
   * 获取失败率最高的节点
   */
  getHighFailureNodes(
    workflowId: string,
    limit: number = 5
  ): NodeMetricsSummary[] {
    const metrics = this.getWorkflowMetrics(workflowId)
    
    return metrics.nodeMetrics
      .filter(n => n.failureCount > 0)
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, limit)
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.metricsCache.clear()
  }

  /**
   * 清除特定工作流的缓存
   */
  clearWorkflowCache(workflowId: string): void {
    for (const key of this.metricsCache.keys()) {
      if (key.startsWith(workflowId)) {
        this.metricsCache.delete(key)
      }
    }
  }
}

// 创建实例
import { executionTracker } from './ExecutionTracker'
import { stepRecorder } from './StepRecorder'
export const metricsCollector = new MetricsCollector(executionTracker, stepRecorder)
