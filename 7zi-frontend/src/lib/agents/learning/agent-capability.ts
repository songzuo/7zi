/**
 * Agent Capability Assessment System
 *
 * Multi-dimensional scoring model for automatic agent capability evaluation
 *
 * @module agent-capability
 */

import type {
  AgentId,
  TaskType,
  CapabilityScore,
  AgentLearningStats,
  TaskHistoryRecord,
} from './types'

/**
 * Capability assessment result
 */
export interface CapabilityAssessmentResult {
  agentId: string
  timestamp: number

  // Overall scores
  overallScore: number // 0-100
  confidence: number // 0-1

  // Dimension scores
  dimensions: {
    technical: {
      score: number // 0-100
      byTaskType: Map<TaskType, number>
      bestTaskTypes: TaskType[]
      weakTaskTypes: TaskType[]
    }
    speed: {
      score: number // 0-100
      avgCompletionTime: number
      percentiles: {
        p50: number
        p90: number
        p95: number
      }
    }
    reliability: {
      score: number // 0-100
      onTimeRate: number
      failureRate: number
      cancellationRate: number
    }
    quality: {
      score: number // 0-100
      avgOutputQuality: number
      revisionRate: number
      errorRate: number
    }
  }

  // Trend analysis
  changes: {
    improved: TaskType[]
    declined: TaskType[]
    stable: TaskType[]
  }

  // Recommendations
  recommendations: string[]
}

/**
 * Trend analysis result
 */
export interface CapabilityTrend {
  taskType: TaskType
  currentScore: number
  previousScore: number
  change: number
  direction: 'improving' | 'stable' | 'declining'
  confidence: number
}

/**
 * Assessment configuration
 */
interface AssessmentConfig {
  /**
   * Minimum tasks for reliable assessment
   */
  minTasksForAssessment: number

  /**
   * Minimum tasks for trend analysis
   */
  minTasksForTrend: number

  /**
   * History window for trend analysis (ms)
   */
  trendAnalysisWindow: number

  /**
   * History window for current performance (ms)
   */
  currentPerformanceWindow: number

  /**
   * Baseline completion time for speed scoring (ms)
   */
  baselineCompletionTime: number

  /**
   * Weight for each dimension in overall score
   */
  dimensionWeights: {
    technical: number
    speed: number
    reliability: number
    quality: number
  }
}

/**
 * Export data type for persistence
 */
interface CapabilityAssessmentExportData {
  capabilityScores?: Record<string, Record<TaskType, CapabilityScore>>
  previousScores?: Record<string, Record<TaskType, number>>
  config?: Partial<AssessmentConfig>
}

/**
 * Dimension scores for recommendations
 */
interface DimensionScores {
  technical: {
    score: number
    weakTaskTypes: TaskType[]
  }
  speed: {
    score: number
  }
  reliability: {
    score: number
  }
  quality: {
    score: number
  }
}

/**
 * Changes for recommendations
 */
interface Changes {
  improved: TaskType[]
  declined: TaskType[]
  stable: TaskType[]
}

/**
 * Agent Capability Assessor
 *
 * Evaluates agent capability across multiple dimensions:
 * - Technical: Task type success rates
 * - Speed: Completion time
 * - Reliability: Success/failure/cancellation rates
 * - Quality: Output quality metrics
 */
export class AgentCapabilityAssessor {
  private taskHistory: TaskHistoryRecord[] = []
  private capabilityScores: Map<string, Map<TaskType, CapabilityScore>> = new Map()
  private previousScores: Map<string, Map<TaskType, number>> = new Map()
  private config: AssessmentConfig

  constructor(config?: Partial<AssessmentConfig>) {
    this.config = {
      minTasksForAssessment: 10,
      minTasksForTrend: 20,
      trendAnalysisWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
      currentPerformanceWindow: 24 * 60 * 60 * 1000, // 1 day
      baselineCompletionTime: 30000, // 30 seconds
      dimensionWeights: {
        technical: 0.35,
        speed: 0.25,
        reliability: 0.25,
        quality: 0.15,
      },
      ...config,
    }
  }

  /**
   * Assess agent capability
   *
   * @param agentId Agent ID
   * @returns Assessment result
   */
  assess(agentId: AgentId): CapabilityAssessmentResult {
    const agentHistory = this.taskHistory.filter(h => h.agentId === agentId)

    // Not enough data
    if (agentHistory.length < this.config.minTasksForAssessment) {
      return this.createDefaultAssessment(agentId)
    }

    // Calculate each dimension
    const technical = this.calculateTechnicalScore(agentId, agentHistory)
    const speed = this.calculateSpeedScore(agentId, agentHistory)
    const reliability = this.calculateReliabilityScore(agentId, agentHistory)
    const quality = this.calculateQualityScore(agentId, agentHistory)

    // Overall score
    const overallScore = this.calculateOverallScore({
      technical: technical.score,
      speed: speed.score,
      reliability: reliability.score,
      quality: quality.score,
    })

    // Confidence
    const confidence = this.calculateConfidence(agentHistory.length)

    // Detect changes
    const changes = this.detectChanges(agentId, agentHistory)

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      overallScore,
      { technical, speed, reliability, quality },
      changes
    )

    // Store current scores for next trend analysis
    this.storeCurrentScores(agentId, technical.byTaskType)

    return {
      agentId,
      timestamp: Date.now(),
      overallScore,
      confidence,
      dimensions: {
        technical,
        speed,
        reliability,
        quality,
      },
      changes,
      recommendations,
    }
  }

  /**
   * Record task completion for learning
   */
  recordTask(record: TaskHistoryRecord): void {
    this.taskHistory.push(record)

    // Trim history
    if (this.taskHistory.length > 10000) {
      this.taskHistory = this.taskHistory.slice(-10000)
    }

    // Update capability scores
    this.updateCapabilityScore(record)
  }

  /**
   * Get capability trend for a task type
   */
  getTrend(agentId: AgentId, taskType: TaskType): CapabilityTrend {
    const currentScores = this.capabilityScores.get(agentId)?.get(taskType)
    const previousScores = this.previousScores.get(agentId)?.get(taskType)

    if (!currentScores || !previousScores) {
      return {
        taskType,
        currentScore: 0,
        previousScore: 0,
        change: 0,
        direction: 'stable',
        confidence: 0,
      }
    }

    const currentScore = currentScores.successRate * 100
    const previousScore = previousScores
    const change = currentScore - previousScore

    let direction: 'improving' | 'stable' | 'declining'
    if (change > 5) {
      direction = 'improving'
    } else if (change < -5) {
      direction = 'declining'
    } else {
      direction = 'stable'
    }

    // Confidence based on sample count
    const confidence = Math.min(1, currentScores.sampleCount / 20)

    return {
      taskType,
      currentScore,
      previousScore,
      change,
      direction,
      confidence,
    }
  }

  /**
   * Calculate technical score
   *
   * Based on success rates by task type
   */
  private calculateTechnicalScore(
    agentId: AgentId,
    history: TaskHistoryRecord[]
  ): {
    score: number
    byTaskType: Map<TaskType, number>
    bestTaskTypes: TaskType[]
    weakTaskTypes: TaskType[]
  } {
    const byTaskType = new Map<TaskType, number>()
    const taskTypeCount: Record<string, number> = {}
    const taskTypeSuccess: Record<string, number> = {}

    // Count by task type
    for (const record of history) {
      if (!taskTypeCount[record.taskType]) {
        taskTypeCount[record.taskType] = 0
        taskTypeSuccess[record.taskType] = 0
      }
      taskTypeCount[record.taskType]++
      if (record.status === 'completed') {
        taskTypeSuccess[record.taskType]++
      }
    }

    // Calculate scores
    for (const [taskType, count] of Object.entries(taskTypeCount)) {
      if (count < 5) continue // Skip if not enough samples

      const successRate = taskTypeSuccess[taskType] / count
      // Sample factor: more samples = higher confidence in score
      const sampleFactor = Math.min(1, count / 10)
      const score = successRate * 100 * sampleFactor

      byTaskType.set(taskType, score)
    }

    // Overall technical score
    const scores = Array.from(byTaskType.values())
    const score = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 50

    // Find best and weak task types
    const sorted = Array.from(byTaskType.entries()).sort((a, b) => b[1] - a[1])
    const bestTaskTypes = sorted.slice(0, 3).map(([t]) => t)
    const weakTaskTypes = sorted.slice(-3).map(([t]) => t)

    return { score, byTaskType, bestTaskTypes, weakTaskTypes }
  }

  /**
   * Calculate speed score
   *
   * Based on completion times
   */
  private calculateSpeedScore(
    agentId: AgentId,
    history: TaskHistoryRecord[]
  ): {
    score: number
    avgCompletionTime: number
    percentiles: { p50: number; p90: number; p95: number }
  } {
    const completed = history.filter(h => h.status === 'completed')

    if (completed.length === 0) {
      return {
        score: 50,
        avgCompletionTime: 0,
        percentiles: { p50: 0, p90: 0, p95: 0 },
      }
    }

    const times = completed.map(h => h.executionTime).sort((a, b) => a - b)

    // Calculate average
    const avgCompletionTime = times.reduce((a, b) => a + b, 0) / times.length

    // Calculate percentiles
    const p50 = times[Math.floor(times.length * 0.5)]
    const p90 = times[Math.floor(times.length * 0.9)]
    const p95 = times[Math.floor(times.length * 0.95)]

    // Score: faster is better
    // Baseline: 30 seconds = 50 points
    // Half baseline = 100 points
    // Double baseline = 0 points
    const baseline = this.config.baselineCompletionTime
    const score = Math.max(
      0,
      Math.min(100, 100 - ((avgCompletionTime - baseline / 2) / (baseline * 1.5)) * 100)
    )

    return {
      score,
      avgCompletionTime,
      percentiles: { p50, p90, p95 },
    }
  }

  /**
   * Calculate reliability score
   *
   * Based on success, failure, and cancellation rates
   */
  private calculateReliabilityScore(
    _agentId: AgentId,
    history: TaskHistoryRecord[]
  ): {
    score: number
    onTimeRate: number
    failureRate: number
    cancellationRate: number
  } {
    const total = history.length
    if (total === 0) {
      return {
        score: 50,
        onTimeRate: 1,
        failureRate: 0,
        cancellationRate: 0,
      }
    }

    const completed = history.filter(h => h.status === 'completed').length
    const failed = history.filter(h => h.status === 'failed').length
    const cancelled = history.filter(h => h.status === 'cancelled').length

    const onTimeRate = completed / total
    const failureRate = failed / total
    const cancellationRate = cancelled / total

    // Score: high completion rate, low failure and cancellation
    const score = onTimeRate * 100 - failureRate * 50 - cancellationRate * 30
    return {
      score: Math.max(0, Math.min(100, score)),
      onTimeRate,
      failureRate,
      cancellationRate,
    }
  }

  /**
   * Calculate quality score
   *
   * Based on output quality metrics (when available)
   */
  private calculateQualityScore(
    agentId: AgentId,
    history: TaskHistoryRecord[]
  ): {
    score: number
    avgOutputQuality: number
    revisionRate: number
    errorRate: number
  } {
    const completed = history.filter(h => h.status === 'completed')

    if (completed.length === 0) {
      return {
        score: 50,
        avgOutputQuality: 0.5,
        revisionRate: 0,
        errorRate: 0,
      }
    }

    // Error rate (from errorType)
    const withError = completed.filter(h => h.errorType).length
    const errorRate = withError / completed.length

    // Revision rate (from retryCount > 0)
    const withRetry = completed.filter(h => h.retryCount > 0).length
    const revisionRate = withRetry / completed.length

    // Output quality (heuristic based on outputSize and executionTime)
    // This is a placeholder - in production, use actual quality metrics
    const qualityScores = completed.map(h => {
      // Larger output might indicate better quality
      const outputFactor = Math.min(1, h.outputSize / 10000)
      // Shorter time might indicate efficiency
      const timeFactor = Math.min(1, 10000 / (h.executionTime + 100))
      return (outputFactor + timeFactor) / 2
    })
    const avgOutputQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length

    // Overall score
    const score = avgOutputQuality * 100 * (1 - errorRate * 0.5) * (1 - revisionRate * 0.3)

    return {
      score: Math.max(0, Math.min(100, score)),
      avgOutputQuality,
      revisionRate,
      errorRate,
    }
  }

  /**
   * Calculate overall score from dimensions
   */
  private calculateOverallScore(dimensions: {
    technical: number
    speed: number
    reliability: number
    quality: number
  }): number {
    const { dimensionWeights } = this.config

    return (
      dimensions.technical * dimensionWeights.technical +
      dimensions.speed * dimensionWeights.speed +
      dimensions.reliability * dimensionWeights.reliability +
      dimensions.quality * dimensionWeights.quality
    )
  }

  /**
   * Calculate confidence based on sample size
   */
  private calculateConfidence(sampleSize: number): number {
    // Minimum confidence of 0.3, max of 0.95
    return Math.min(0.95, 0.3 + Math.min(1, sampleSize / 30) * 0.65)
  }

  /**
   * Detect capability changes
   */
  private detectChanges(
    agentId: AgentId,
    history: TaskHistoryRecord[]
  ): {
    improved: TaskType[]
    declined: TaskType[]
    stable: TaskType[]
  } {
    const improved: TaskType[] = []
    const declined: TaskType[] = []
    const stable: TaskType[] = []

    const now = Date.now()
    const trendWindow = this.config.trendAnalysisWindow

    // Analyze each task type
    const agentScores = this.capabilityScores.get(agentId)
    for (const [taskType, capScore] of agentScores ? Array.from(agentScores.entries()) : []) {
      if (capScore.sampleCount < this.config.minTasksForTrend) continue

      // Recent performance (last half of window)
      const recentHistory = history.filter(
        h => h.taskType === taskType && h.completedAt > now - trendWindow / 2
      )

      // Previous performance (earlier half of window)
      const previousHistory = history.filter(
        h =>
          h.taskType === taskType &&
          h.completedAt > now - trendWindow &&
          h.completedAt <= now - trendWindow / 2
      )

      if (recentHistory.length < 5 || previousHistory.length < 5) {
        stable.push(taskType)
        continue
      }

      // Calculate success rates
      const recentSuccessRate =
        recentHistory.filter(h => h.status === 'completed').length / recentHistory.length
      const previousSuccessRate =
        previousHistory.filter(h => h.status === 'completed').length / previousHistory.length

      const diff = recentSuccessRate - previousSuccessRate

      if (diff > 0.15) {
        improved.push(taskType)
      } else if (diff < -0.15) {
        declined.push(taskType)
      } else {
        stable.push(taskType)
      }
    }

    return { improved, declined, stable }
  }

  /**
   * Generate recommendations based on assessment
   */
  private generateRecommendations(overallScore: number, dimensions: DimensionScores, changes: Changes): string[] {
    const recommendations: string[] = []

    // Overall score
    if (overallScore > 90) {
      recommendations.push('表现优秀，适合承担高优先级任务')
    } else if (overallScore > 75) {
      recommendations.push('表现良好，继续维护当前状态')
    } else if (overallScore > 60) {
      recommendations.push('表现一般，建议针对性改进')
    } else {
      recommendations.push('表现较差，建议减少任务分配并进行能力评估')
    }

    // Dimension-specific
    if (dimensions.technical.score < 50) {
      recommendations.push(
        `技术能力较弱，建议培训：${dimensions.technical.weakTaskTypes.slice(0, 2).join(', ')}`
      )
    }
    if (dimensions.speed.score < 50) {
      recommendations.push('响应速度较慢，建议检查资源瓶颈')
    }
    if (dimensions.reliability.score < 50) {
      recommendations.push('可靠性较低，需要调查失败原因')
    }
    if (dimensions.quality.score < 50) {
      recommendations.push('输出质量有待提升，建议加强质量检查')
    }

    // Trend-based
    if (changes.improved.length > 0) {
      recommendations.push(`能力提升：${changes.improved.join(', ')}`)
    }
    if (changes.declined.length > 0) {
      recommendations.push(`能力下降：${changes.declined.join(', ')}`)
    }

    return recommendations
  }

  /**
   * Store current scores for trend analysis
   */
  private storeCurrentScores(agentId: AgentId, byTaskType: Map<TaskType, number>): void {
    const previousScores = this.previousScores.get(agentId) || new Map()
    this.previousScores.set(agentId, previousScores)

    // Update previous scores with current scores
    for (const [taskType, score] of byTaskType.entries()) {
      previousScores.set(taskType, score)
    }
  }

  /**
   * Update capability score from task record
   */
  private updateCapabilityScore(record: TaskHistoryRecord): void {
    const { agentId, taskType } = record

    if (!this.capabilityScores.has(agentId)) {
      this.capabilityScores.set(agentId, new Map())
    }

    const agentScores = this.capabilityScores.get(agentId)!

    if (!agentScores.has(taskType)) {
      agentScores.set(taskType, {
        taskType,
        avgCompletionTime: record.executionTime,
        successRate: record.status === 'completed' ? 1 : 0,
        sampleCount: 0,
        lastTaskTime: record.completedAt,
        trend: 'stable',
      })
    }

    const capScore = agentScores.get(taskType)!
    capScore.sampleCount++

    // Update average completion time
    capScore.avgCompletionTime =
      (capScore.avgCompletionTime * (capScore.sampleCount - 1) + record.executionTime) /
      capScore.sampleCount

    // Update success rate
    const completedCount = this.taskHistory.filter(
      h => h.agentId === agentId && h.taskType === taskType && h.status === 'completed'
    ).length
    capScore.successRate = completedCount / capScore.sampleCount

    capScore.lastTaskTime = record.completedAt
  }

  /**
   * Create default assessment for new agents
   */
  private createDefaultAssessment(agentId: AgentId): CapabilityAssessmentResult {
    return {
      agentId,
      timestamp: Date.now(),
      overallScore: 50,
      confidence: 0,
      dimensions: {
        technical: {
          score: 50,
          byTaskType: new Map(),
          bestTaskTypes: [],
          weakTaskTypes: [],
        },
        speed: {
          score: 50,
          avgCompletionTime: 0,
          percentiles: { p50: 0, p90: 0, p95: 0 },
        },
        reliability: {
          score: 50,
          onTimeRate: 1,
          failureRate: 0,
          cancellationRate: 0,
        },
        quality: {
          score: 50,
          avgOutputQuality: 0.5,
          revisionRate: 0,
          errorRate: 0,
        },
      },
      changes: {
        improved: [],
        declined: [],
        stable: [],
      },
      recommendations: ['数据不足，需要更多任务进行评估'],
    }
  }

  /**
   * Export assessment data
   */
  exportData() {
    return {
      capabilityScores: Object.fromEntries(
        Array.from(this.capabilityScores.entries()).map(([agentId, scores]) => [
          agentId,
          Object.fromEntries(Array.from(scores.entries())),
        ])
      ),
      previousScores: Object.fromEntries(
        Array.from(this.previousScores.entries()).map(([agentId, scores]) => [
          agentId,
          Object.fromEntries(Array.from(scores.entries())),
        ])
      ),
      config: this.config,
    }
  }

  /**
   * Import assessment data
   */
  public importData(data: unknown): void {
  if (!data || typeof data !== 'object') return
  
  const typedData = data as CapabilityAssessmentExportData
  if (typedData.capabilityScores) {
    this.capabilityScores = new Map(
      Object.entries(typedData.capabilityScores).map(([agentId, scores]) => [
        agentId,
        new Map(Object.entries(scores) as [TaskType, CapabilityScore][]),
      ])
    )
  }
  if (typedData.previousScores) {
    this.previousScores = new Map(
      Object.entries(typedData.previousScores).map(([agentId, scores]) => [
        agentId,
        new Map(Object.entries(scores) as [TaskType, number][]),
      ])
    )
  }
  if (typedData.config) {
    this.config = { ...this.config, ...typedData.config }
  }
}

  /**
   * Clear all data
   */
  clear(): void {
    this.taskHistory = []
    this.capabilityScores.clear()
    this.previousScores.clear()
  }
}

/**
 * Singleton instance
 */
export const agentCapabilityAssessor = new AgentCapabilityAssessor()

/**
 * Convenience function to assess agent
 */
export function assessAgentCapability(agentId: AgentId): CapabilityAssessmentResult {
  return agentCapabilityAssessor.assess(agentId)
}

/**
 * Convenience function to record task for capability assessment
 */
export function recordTaskForCapability(record: TaskHistoryRecord): void {
  agentCapabilityAssessor.recordTask(record)
}
