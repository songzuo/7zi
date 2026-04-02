import type {
  AgentId,
  AgentLearningStats,
  CapabilityScore,
  TaskFeatures,
  TaskHistoryRecord,
  TaskType,
  PredictionResult,
  WeightAdjustment,
  LearningSystemStats,
  AggregatedStats,
} from './types'

export class AdaptiveLearner {
  private agentStats: Map<AgentId, AgentLearningStats> = new Map()
  private taskHistory: TaskHistoryRecord[] = []
  private taskTypeStats: Map<TaskType, { totalTime: number; count: number }> = new Map()
  private maxHistorySize: number = 10000
  private minSamplesForPrediction: number = 5

  recordTaskCompletion(
    taskId: string,
    taskType: TaskType,
    agentId: AgentId,
    createdAt: number,
    startedAt: number,
    completedAt: number,
    status: 'completed' | 'failed' | 'cancelled',
    priority: 'low' | 'normal' | 'high' | 'urgent',
    inputSize: number,
    outputSize: number,
    retryCount: number,
    agentLoadAtStart: number,
    errorType?: string
  ): void {
    const record: TaskHistoryRecord = {
      taskId,
      taskType,
      agentId,
      createdAt,
      startedAt,
      completedAt,
      queueWaitTime: startedAt - createdAt,
      executionTime: completedAt - startedAt,
      status,
      outputSize,
      errorType,
      retryCount,
      priority,
      inputSize,
      agentLoadAtStart,
    }
    this.taskHistory.push(record)
    if (this.taskHistory.length > this.maxHistorySize) {
      this.taskHistory = this.taskHistory.slice(-this.maxHistorySize)
    }
    if (status === 'completed') {
      this.updateAgentStats(record)
      this.updateTaskTypeStats(taskType, record.executionTime)
    }
  }

  private updateAgentStats(record: TaskHistoryRecord): void {
    const { agentId, taskType, executionTime } = record
    let stats = this.agentStats.get(agentId)
    if (!stats) {
      stats = {
        agentId,
        agentName: agentId,
        capabilityScores: new Map(),
        overallScore: 0.5,
        reliabilityScore: 0.5,
        speedScore: 0.5,
        qualityScore: 0.5,
        currentLoad: 0,
        avgResponseTime: executionTime,
        successRate: 1.0,
        lastUpdated: Date.now(),
        totalTasksCompleted: 0,
        totalTasksFailed: 0,
      }
      this.agentStats.set(agentId, stats)
    }
    let capScore = stats.capabilityScores.get(taskType)
    if (!capScore) {
      capScore = {
        taskType,
        avgCompletionTime: executionTime,
        successRate: 1.0,
        sampleCount: 0,
        lastTaskTime: record.completedAt,
        trend: 'stable',
      }
      stats.capabilityScores.set(taskType, capScore)
    }
    capScore.sampleCount++
    capScore.avgCompletionTime =
      (capScore.avgCompletionTime * (capScore.sampleCount - 1) + executionTime) /
      capScore.sampleCount
    capScore.lastTaskTime = record.completedAt
    stats.totalTasksCompleted++
    const recent = this.taskHistory.filter(
      h => h.agentId === agentId && h.completedAt > Date.now() - 86400000
    )
    stats.successRate =
      recent.length > 0 ? recent.filter(h => h.status === 'completed').length / recent.length : 1.0
    stats.avgResponseTime =
      (stats.avgResponseTime * (stats.totalTasksCompleted - 1) + executionTime) /
      stats.totalTasksCompleted
    this.recalculateAgentScores(stats)
    stats.lastUpdated = Date.now()
  }

  private recalculateAgentScores(stats: AgentLearningStats): void {
    const recent = this.taskHistory.filter(
      h => h.agentId === stats.agentId && h.completedAt > Date.now() - 7 * 86400000
    )
    if (recent.length === 0) return
    stats.reliabilityScore = stats.successRate
    const avgTime = recent.reduce((s, h) => s + h.executionTime, 0) / recent.length
    stats.speedScore = Math.max(0, Math.min(1, 1000 / (avgTime + 1000)))
    const failed = recent.filter(h => h.status === 'failed').length
    stats.qualityScore = Math.max(0, 1 - failed / recent.length)
    stats.overallScore =
      stats.reliabilityScore * 0.4 + stats.speedScore * 0.3 + stats.qualityScore * 0.3
  }

  private updateTaskTypeStats(taskType: TaskType, executionTime: number): void {
    const stats = this.taskTypeStats.get(taskType) || { totalTime: 0, count: 0 }
    stats.totalTime += executionTime
    stats.count++
    this.taskTypeStats.set(taskType, stats)
  }

  getTaskTypeAvgTime(taskType: TaskType): number {
    const stats = this.taskTypeStats.get(taskType)
    return stats && stats.count > 0 ? stats.totalTime / stats.count : 0
  }

  predictCompletionTime(features: TaskFeatures): PredictionResult {
    const factors: string[] = []
    let estimatedTime = 0
    let confidence = 0.5
    const historicalAvg = this.getTaskTypeAvgTime(features.taskType)
    if (historicalAvg > 0 && features.agentId) {
      const agentStats = this.agentStats.get(features.agentId)
      const capScore = agentStats?.capabilityScores.get(features.taskType)
      if (capScore && capScore.sampleCount >= this.minSamplesForPrediction) {
        estimatedTime = capScore.avgCompletionTime
        confidence = Math.min(0.9, 0.5 + capScore.sampleCount / 100)
        factors.push('agent_experience')
      } else if (historicalAvg > 0) {
        estimatedTime = historicalAvg
        factors.push('task_type_average')
      }
      if (features.inputSize > 0) estimatedTime *= 1 + features.inputSize / 1000000
      if (features.priority === 'high' || features.priority === 'urgent') estimatedTime *= 1.2
      if (features.agentLoad > 0.7) estimatedTime *= 1 + features.agentLoad
      if (features.timeOfDay >= 9 && features.timeOfDay <= 17) estimatedTime *= 1.1
    } else {
      estimatedTime = 5000
      confidence = 0.2
      factors.push('default_estimate')
    }
    return {
      estimatedTime: Math.round(Math.max(100, Math.min(3600000, estimatedTime))),
      confidence: Math.round(confidence * 100) / 100,
      factors,
    }
  }

  getAgentLearningStats(agentId?: AgentId): AgentLearningStats | AgentLearningStats[] {
    if (agentId) {
      const stats = this.agentStats.get(agentId)
      if (!stats) throw new Error('Agent not found in learning system')
      return stats
    }
    return Array.from(this.agentStats.values())
  }

  adjustWeight(adjustment: WeightAdjustment): void {
    const stats = this.agentStats.get(adjustment.agentId)
    if (!stats) throw new Error('Agent not found in learning system')
    let capScore = stats.capabilityScores.get(adjustment.taskType)
    if (!capScore) {
      capScore = {
        taskType: adjustment.taskType,
        avgCompletionTime: 1000,
        successRate: 0.5,
        sampleCount: 0,
        lastTaskTime: Date.now(),
        trend: 'stable',
      }
      stats.capabilityScores.set(adjustment.taskType, capScore)
    }
    capScore.successRate = Math.max(0, Math.min(1, capScore.successRate + adjustment.adjustment))
    this.recalculateAgentScores(stats)
    stats.lastUpdated = Date.now()
  }

  getSystemStats(): LearningSystemStats {
    const total = this.taskHistory.length
    const completed = this.taskHistory.filter(h => h.status === 'completed')
    return {
      totalAgents: this.agentStats.size,
      activeAgents: Array.from(this.agentStats.values()).filter(
        s => Date.now() - s.lastUpdated < 3600000
      ).length,
      totalTasksProcessed: total,
      avgCompletionTime:
        completed.length > 0
          ? completed.reduce((s, h) => s + h.executionTime, 0) / completed.length
          : 0,
      overallSuccessRate: total > 0 ? completed.length / total : 0,
      predictionsAccuracy: 0.75,
      lastUpdated: Date.now(),
    }
  }

  getAggregatedStats(period: 'hour' | 'day' | 'week' | 'month'): AggregatedStats {
    const ms: Record<string, number> = {
      hour: 3600000,
      day: 86400000,
      week: 604800000,
      month: 2592000000,
    }
    const now = Date.now()
    const start = now - ms[period]
    const relevant = this.taskHistory.filter(h => h.createdAt >= start)
    const completed = relevant.filter(h => h.status === 'completed')
    return {
      period,
      startTime: start,
      endTime: now,
      tasksCompleted: completed.length,
      tasksFailed: relevant.filter(h => h.status === 'failed').length,
      avgExecutionTime:
        completed.length > 0
          ? completed.reduce((s, h) => s + h.executionTime, 0) / completed.length
          : 0,
      avgQueueWaitTime:
        relevant.length > 0
          ? relevant.reduce((s, h) => s + h.queueWaitTime, 0) / relevant.length
          : 0,
      avgAgentUtilization: 0,
      topPerformers: Array.from(this.agentStats.values())
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, 3)
        .map(s => s.agentId),
      strugglingAgents: Array.from(this.agentStats.values())
        .filter(s => s.totalTasksCompleted >= 5)
        .sort((a, b) => a.overallScore - b.overallScore)
        .slice(0, 3)
        .map(s => s.agentId),
      predictionAccuracy: 0.75,
      predictionCount: 0,
    }
  }

  updateAgentName(agentId: AgentId, name: string): void {
    const stats = this.agentStats.get(agentId)
    if (stats) stats.agentName = name
  }

  clear(): void {
    this.agentStats.clear()
    this.taskHistory = []
    this.taskTypeStats.clear()
  }

  exportData() {
    return {
      agentStats: Object.fromEntries(
        Array.from(this.agentStats.entries()).map(([id, s]) => [
          id,
          { ...s, capabilityScores: Object.fromEntries(s.capabilityScores) },
        ])
      ),
      taskHistory: this.taskHistory,
      taskTypeStats: Object.fromEntries(this.taskTypeStats),
    }
  }
}

export const adaptiveLearner = new AdaptiveLearner()
