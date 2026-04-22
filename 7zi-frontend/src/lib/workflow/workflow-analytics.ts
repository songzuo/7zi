/**
 * Workflow Analytics
 *
 * 📊 工作流统计分析
 * 版本: v1.12.3
 *
 * 提供工作流执行数据的统计分析功能
 */

import type {
  ExecutionHistory,
  NodeExecution,
  ExecutionHistoryQuery,
} from './execution-history-store'
import { executionHistoryStore } from './execution-history-store'

/**
 * 节点性能指标
 */
export interface NodePerformanceMetrics {
  /** 节点 ID */
  nodeId: string
  /** 节点名称 */
  nodeName: string
  /** 节点类型 */
  nodeType: string
  /** 执行次数 */
  executionCount: number
  /** 平均执行时长（毫秒） */
  averageDuration: number
  /** 最快执行时长（毫秒） */
  minDuration: number
  /** 最慢执行时长（毫秒） */
  maxDuration: number
  /** 成功次数 */
  successCount: number
  /** 失败次数 */
  failureCount: number
  /** 成功率 */
  successRate: number
  /** 总执行时长（毫秒） */
  totalDuration: number
}

/**
 * 时间段分析
 */
export interface TimeRangeAnalysis {
  /** 开始时间 */
  startTime: number
  /** 结束时间 */
  endTime: number
  /** 执行次数 */
  executionCount: number
  /** 成功次数 */
  successCount: number
  /** 失败次数 */
  failureCount: number
  /** 平均执行时长 */
  averageDuration: number
}

/**
 * 执行趋势
 */
export interface ExecutionTrend {
  /** 时间点 */
  timestamp: number
  /** 执行次数 */
  count: number
  /** 成功率 */
  successRate: number
}

/**
 * 性能瓶颈分析
 */
export interface PerformanceBottleneck {
  /** 节点 ID */
  nodeId: string
  /** 节点名称 */
  nodeName: string
  /** 瓶颈类型 */
  type: 'slow' | 'frequent_failure' | 'inconsistent'
  /** 影响分数（0-100） */
  impactScore: number
  /** 详细信息 */
  details: {
    /** 平均执行时长 */
    averageDuration?: number
    /** 失败率 */
    failureRate?: number
    /** 执行时长方差 */
    durationVariance?: number
  }
}

/**
 * 执行报告
 */
export interface ExecutionReport {
  /** 报告 ID */
  reportId: string
  /** 工作流 ID */
  workflowId?: string
  /** 工作流名称 */
  workflowName?: string
  /** 报告生成时间 */
  generatedAt: number
  /** 时间范围 */
  timeRange: {
    from: number
    to: number
  }
  /** 执行统计 */
  statistics: {
    totalExecutions: number
    successCount: number
    failureCount: number
    cancelledCount: number
    runningCount: number
    successRate: number
    averageDuration: number
    minDuration: number
    maxDuration: number
  }
  /** 节点性能 */
  nodePerformance: NodePerformanceMetrics[]
  /** 时间趋势 */
  trends: ExecutionTrend[]
  /** 性能瓶颈 */
  bottlenecks: PerformanceBottleneck[]
}

/**
 * 分析选项
 */
export interface AnalyticsOptions {
  /** 包含的趋势点数 */
  trendPoints?: number
  /** 瓶颈分析阈值 */
  bottleneckThresholds?: {
    /** 慢节点阈值（毫秒） */
    slowNodeThreshold: number
    /** 高失败率阈值（0-1） */
    highFailureRateThreshold: number
    /** 不一致阈值（标准差/均值） */
    inconsistencyThreshold: number
  }
}

/**
 * 工作流分析器
 */
export class WorkflowAnalytics {
  private store = executionHistoryStore
  private defaultOptions: Required<AnalyticsOptions> = {
    trendPoints: 24,
    bottleneckThresholds: {
      slowNodeThreshold: 5000,
      highFailureRateThreshold: 0.2,
      inconsistencyThreshold: 0.5,
    },
  }

  constructor(options?: AnalyticsOptions) {
    if (options) {
      this.defaultOptions = {
        trendPoints: options.trendPoints ?? this.defaultOptions.trendPoints,
        bottleneckThresholds: {
          slowNodeThreshold:
            options.bottleneckThresholds?.slowNodeThreshold ??
            this.defaultOptions.bottleneckThresholds.slowNodeThreshold,
          highFailureRateThreshold:
            options.bottleneckThresholds?.highFailureRateThreshold ??
            this.defaultOptions.bottleneckThresholds.highFailureRateThreshold,
          inconsistencyThreshold:
            options.bottleneckThresholds?.inconsistencyThreshold ??
            this.defaultOptions.bottleneckThresholds.inconsistencyThreshold,
        },
      }
    }
  }

  /**
   * 分析工作流执行数据
   */
  async analyzeWorkflow(
    workflowId: string,
    query?: Omit<ExecutionHistoryQuery, 'workflowId'>
  ): Promise<ExecutionReport> {
    const histories = await this.store.query({
      workflowId,
      ...query,
    })

    return this.generateReport(histories)
  }

  /**
   * 分析所有执行数据
   */
  async analyzeAll(query?: ExecutionHistoryQuery): Promise<ExecutionReport> {
    const histories = await this.store.query(query || {})

    return this.generateReport(histories)
  }

  /**
   * 生成执行报告
   */
  private generateReport(histories: ExecutionHistory[]): ExecutionReport {
    if (histories.length === 0) {
      return this.createEmptyReport()
    }

    const workflowId = histories[0].workflowId
    const workflowName = histories[0].workflowName

    const timeRange = {
      from: Math.min(...histories.map(h => h.startTime)),
      to: Math.max(...histories.map(h => h.endTime || Date.now())),
    }

    const statistics = this.calculateStatistics(histories)
    const nodePerformance = this.analyzeNodePerformance(histories)
    const trends = this.analyzeTrends(histories)
    const bottlenecks = this.identifyBottlenecks(nodePerformance, statistics)

    return {
      reportId: `report-${Date.now()}`,
      workflowId,
      workflowName,
      generatedAt: Date.now(),
      timeRange,
      statistics,
      nodePerformance,
      trends,
      bottlenecks,
    }
  }

  /**
   * 计算基础统计
   */
  private calculateStatistics(histories: ExecutionHistory[]): ExecutionReport['statistics'] {
    const totalExecutions = histories.length
    const successCount = histories.filter(h => h.status === 'completed').length
    const failureCount = histories.filter(h => h.status === 'failed').length
    const cancelledCount = histories.filter(h => h.status === 'cancelled').length
    const runningCount = histories.filter(h => h.status === 'running').length

    const successRate = totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0

    const completedHistories = histories.filter(h => h.duration !== undefined)
    const durations = completedHistories.map(h => h.duration!)

    const averageDuration =
      durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0

    return {
      totalExecutions,
      successCount,
      failureCount,
      cancelledCount,
      runningCount,
      successRate,
      averageDuration,
      minDuration,
      maxDuration,
    }
  }

  /**
   * 分析节点性能
   */
  private analyzeNodePerformance(histories: ExecutionHistory[]): NodePerformanceMetrics[] {
    const nodeMap = new Map<string, NodePerformanceMetrics>()

    for (const history of histories) {
      for (const [nodeId, execution] of Object.entries(history.nodeExecutions)) {
        if (!nodeMap.has(nodeId)) {
          nodeMap.set(nodeId, {
            nodeId,
            nodeName: execution.nodeName || nodeId,
            nodeType: execution.nodeType || 'unknown',
            executionCount: 0,
            averageDuration: 0,
            minDuration: Infinity,
            maxDuration: 0,
            successCount: 0,
            failureCount: 0,
            successRate: 0,
            totalDuration: 0,
          })
        }

        const metrics = nodeMap.get(nodeId)!
        const duration = execution.exitTime ? execution.exitTime - execution.enterTime : 0

        metrics.executionCount++
        metrics.totalDuration += duration

        if (duration > 0) {
          metrics.minDuration = Math.min(metrics.minDuration, duration)
          metrics.maxDuration = Math.max(metrics.maxDuration, duration)
        }

        if (execution.status === 'completed') {
          metrics.successCount++
        } else if (execution.status === 'failed') {
          metrics.failureCount++
        }
      }
    }

    // 计算最终指标
    for (const metrics of nodeMap.values()) {
      if (metrics.executionCount > 0) {
        metrics.averageDuration = metrics.totalDuration / metrics.executionCount
        metrics.successRate = (metrics.successCount / metrics.executionCount) * 100
      }

      // 修正 minDuration
      if (metrics.minDuration === Infinity) {
        metrics.minDuration = 0
      }
    }

    return Array.from(nodeMap.values())
  }

  /**
   * 分析执行趋势
   */
  private analyzeTrends(histories: ExecutionHistory[]): ExecutionTrend[] {
    const trendCount = this.defaultOptions.trendPoints

    if (histories.length === 0) {
      return []
    }

    const startTime = Math.min(...histories.map(h => h.startTime))
    const endTime = Math.max(...histories.map(h => h.endTime || Date.now()))
    const interval = Math.ceil((endTime - startTime) / trendCount)

    const trends: ExecutionTrend[] = []

    for (let i = 0; i < trendCount; i++) {
      const from = startTime + i * interval
      const to = from + interval

      const inRange = histories.filter(h => h.startTime >= from && h.startTime < to)
      const count = inRange.length
      const successCount = inRange.filter(h => h.status === 'completed').length
      const successRate = count > 0 ? (successCount / count) * 100 : 0

      trends.push({
        timestamp: from,
        count,
        successRate,
      })
    }

    return trends
  }

  /**
   * 识别性能瓶颈
   */
  private identifyBottlenecks(
    nodePerformance: NodePerformanceMetrics[],
    statistics: ExecutionReport['statistics']
  ): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = []
    const thresholds = this.defaultOptions.bottleneckThresholds

    for (const node of nodePerformance) {
      // 检查是否是慢节点
      if (node.averageDuration > thresholds.slowNodeThreshold) {
        bottlenecks.push({
          nodeId: node.nodeId,
          nodeName: node.nodeName,
          type: 'slow',
          impactScore: Math.min(100, (node.averageDuration / thresholds.slowNodeThreshold) * 50),
          details: {
            averageDuration: node.averageDuration,
          },
        })
      }

      // 检查是否是频繁失败节点
      const failureRate = 1 - node.successRate / 100
      if (failureRate > thresholds.highFailureRateThreshold) {
        bottlenecks.push({
          nodeId: node.nodeId,
          nodeName: node.nodeName,
          type: 'frequent_failure',
          impactScore: failureRate * 100,
          details: {
            failureRate,
          },
        })
      }

      // 检查性能是否不稳定
      const coefficientOfVariation =
        node.averageDuration > 0
          ? (Math.sqrt(this.calculateVariance(node, nodePerformance)) / node.averageDuration)
          : 0

      if (coefficientOfVariation > thresholds.inconsistencyThreshold) {
        bottlenecks.push({
          nodeId: node.nodeId,
          nodeName: node.nodeName,
          type: 'inconsistent',
          impactScore: Math.min(100, coefficientOfVariation * 50),
          details: {
            durationVariance: this.calculateVariance(node, nodePerformance),
          },
        })
      }
    }

    // 按影响分数排序
    bottlenecks.sort((a, b) => b.impactScore - a.impactScore)

    return bottlenecks
  }

  /**
   * 计算方差（用于不一致性分析）
   */
  private calculateVariance(
    node: NodePerformanceMetrics,
    allNodes: NodePerformanceMetrics[]
  ): number {
    // 简化版本：使用 min 和 max 之间的差异
    const range = node.maxDuration - node.minDuration
    return (range / node.averageDuration) ** 2
  }

  /**
   * 创建空报告
   */
  private createEmptyReport(): ExecutionReport {
    return {
      reportId: `report-${Date.now()}`,
      generatedAt: Date.now(),
      timeRange: {
        from: Date.now(),
        to: Date.now(),
      },
      statistics: {
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        cancelledCount: 0,
        runningCount: 0,
        successRate: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
      },
      nodePerformance: [],
      trends: [],
      bottlenecks: [],
    }
  }

  /**
   * 获取最慢的节点
   */
  async getSlowestNodes(
    workflowId: string,
    limit: number = 5
  ): Promise<NodePerformanceMetrics[]> {
    const histories = await this.store.query({ workflowId })
    const nodePerformance = this.analyzeNodePerformance(histories)

    return nodePerformance
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, limit)
  }

  /**
   * 获取失败率最高的节点
   */
  async getHighestFailureNodes(
    workflowId: string,
    limit: number = 5
  ): Promise<NodePerformanceMetrics[]> {
    const histories = await this.store.query({ workflowId })
    const nodePerformance = this.analyzeNodePerformance(histories)

    return nodePerformance
      .sort((a, b) => (a.successRate - b.successRate) / 100)
      .slice(0, limit)
  }

  /**
   * 获取执行趋势数据
   */
  async getExecutionTrend(
    workflowId: string,
    hours: number = 24
  ): Promise<ExecutionTrend[]> {
    const to = Date.now()
    const from = to - hours * 60 * 60 * 1000

    const histories = await this.store.query({
      workflowId,
      startTimeRange: { from, to },
    })

    return this.analyzeTrends(histories)
  }

  /**
   * 导出报告为 JSON
   */
  exportReport(report: ExecutionReport): string {
    return JSON.stringify(report, null, 2)
  }

  /**
   * 从 JSON 导入报告
   */
  importReport(json: string): ExecutionReport {
    return JSON.parse(json) as ExecutionReport
  }
}

// 导出单例实例
export const workflowAnalytics = new WorkflowAnalytics()
