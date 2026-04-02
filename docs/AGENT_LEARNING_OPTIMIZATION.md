# Agent 学习系统优化方案

**版本**: v1.5.0
**创建日期**: 2026-03-30
**作者**: 📚 咨询师
**状态**: 研究完成

---

## 📋 执行摘要

本文档是 Sprint 3 P1 的 Agent 学习优化功能的技术研究方案。经过深入分析，发现现有系统已具备基础学习框架（`AdaptiveLearner`），需要增强和完善以实现 v1.5.0 路线图中的优化目标。

**关键发现**:

- ✅ 学习系统基础架构已完成 60%
- ✅ 已实现权重自适应调整
- ⏳ 需要增强时间预测模型
- ⏳ 需要完善能力自动评估
- ⏳ 需要建立收敛判定标准

---

## 🎯 研究目标

根据 v1.5.0 ROADMAP，Agent 学习优化系统需要实现：

1. **任务完成时间预测模型** - 准确预测任务执行时间
2. **Agent 能力自动评估更新** - 动态调整能力评分
3. **历史数据分析学习** - 从历史数据中学习优化策略
4. **调度策略自动调优** - 自适应调整调度权重

---

## 1. 当前系统分析

### 1.1 架构概览

```
┌─────────────────────────────────────────────────────┐
│                    Scheduler Store                    │
│                  (Zustand 状态管理)                   │
├─────────────────────────────────────────────────────┤
│  • Agents 状态 (实时)                                │
│  • Task Queue (优先级队列)                           │
│  • Schedule Decisions (历史)                         │
│  • Learning Metrics (学习指标)                       │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              Agent Scheduler Core                     │
├─────────────────────────────────────────────────────┤
│  • Task Matcher (能力匹配)                           │
│  • Task Ranker (优先级排序)                          │
│  • Load Balancer (负载均衡)                          │
│  • Adaptive Learner (自适应学习) ⭐                   │
└─────────────────────────────────────────────────────┘
```

### 1.2 已实现的学习功能

#### 1.2.1 AdaptiveLearner 类 (`src/lib/agents/scheduler/core/adaptive-learner.ts`)

**核心功能**:

- ✅ 记录调度决策结果 (`recordDecision`)
- ✅ 计算 Agent 学习指标 (`AgentLearningMetrics`)
- ✅ 生成权重调整建议 (`getWeightAdjustments`)
- ✅ 获取优化的评分权重 (`getOptimizedWeights`)
- ✅ 数据持久化支持

**代码位置**: `src/lib/agents/scheduler/core/adaptive-learner.ts` (~520 行)

**关键接口**:

```typescript
interface AgentLearningMetrics {
  agentId: string;
  totalAssigned: number;
  totalCompleted: number;
  totalFailed: number;
  successRate: number;
  avgCompletionTime: number;
  byTaskType: Record<TaskType, {...}>;
  byPriority: Record<TaskPriority, {...}>;
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: number;
}
```

#### 1.2.2 学习类型定义 (`src/lib/agents/learning/types.ts`)

**已定义类型**:

```typescript
// 任务特征
interface TaskFeatures {
  taskType: TaskType
  inputSize: number
  priority: 'low' | 'normal' | 'high' | 'urgent'
  timeOfDay: number
  dayOfWeek: number
  historicalAvgTime: number
  queueDepth: number
  agentLoad: number
}

// 预测结果
interface PredictionResult {
  estimatedTime: number
  confidence: number
  factors: string[]
}

// 能力评分
interface CapabilityScore {
  taskType: TaskType
  avgCompletionTime: number
  successRate: number
  sampleCount: number
  lastTaskTime: number
  trend: 'improving' | 'stable' | 'declining'
}

// Agent 学习统计
interface AgentLearningStats {
  agentId: AgentId
  agentName: string
  capabilityScores: Map<TaskType, CapabilityScore>
  overallScore: number
  reliabilityScore: number
  speedScore: number
  qualityScore: number
  // ...
}
```

#### 1.2.3 调度器集成

**主调度器** (`src/lib/agents/scheduler/core/scheduler.ts`):

- ✅ 已集成 AdaptiveLearner
- ✅ 在任务完成时记录学习数据
- ✅ 支持启用/禁用学习功能
- ✅ 提供学习配置接口

**集成点**:

```typescript
// 任务完成时记录
completeTask(taskId: string): void {
  // ... 更新状态
  if (this.config.enableLearning) {
    const decision = this.scheduleHistory.getDecision(taskId);
    if (decision) {
      this.learner.recordDecision(decision, true, task.estimatedDuration);
    }
  }
}

// 调度时使用学习优化
async scheduleTask(taskId: string): Promise<ScheduleDecision | null> {
  // 获取优化权重
  if (this.config.enableLearning) {
    const optimizedWeights = this.learner.getOptimizedWeights(task.type, this.agents);
    if (optimizedWeights) {
      weights = { ...weights, ...optimizedWeights };
    }
  }
  // ... 执行调度
}
```

### 1.3 当前评分算法

**多维度评分**:

```typescript
const score =
  capabilityScore * 0.4 + // 能力匹配
  loadScore * 0.3 + // 负载均衡
  performanceScore * 0.2 + // 性能
  responseScore * 0.1 // 响应速度
```

**学习优化后**:

- 高成功率场景: `capability: 0.5, load: 0.25, performance: 0.15, response: 0.1`
- 低置信度场景: `capability: 0.25, load: 0.25, performance: 0.4, response: 0.1`

### 1.4 现有数据存储

**Zustand Store** (`src/lib/agents/scheduler/stores/scheduler-store.ts`):

- ✅ Agent 状态管理
- ✅ 任务队列管理
- ✅ 调度历史
- ⏳ 学习指标 (部分集成)

**持久化**:

- ✅ 支持 JSON 导出/导入
- ⏳ 文件持久化实现待完善

### 1.5 差距分析

| 功能               | 当前状态        | 目标状态    | 差距 |
| ------------------ | --------------- | ----------- | ---- |
| 权重自适应调整     | ✅ 已实现       | ✅ 完成     | 0%   |
| 任务完成时间预测   | 🟡 类型定义完成 | ⏳ 需要实现 | 70%  |
| Agent 能力自动评估 | 🟡 基础实现     | ⏳ 需要增强 | 40%  |
| 历史数据分析       | ✅ 已实现       | ✅ 完成     | 0%   |
| 收敛判定标准       | ❌ 未实现       | ⏳ 需要实现 | 100% |
| 数据持久化         | 🟡 部分实现     | ⏳ 需要完善 | 50%  |
| 学习可视化         | ❌ 未实现       | ⏳ 需要实现 | 100% |

---

## 2. 优化方案设计

### 2.1 任务完成时间预测模型

#### 2.1.1 设计方案

**算法选择**: 加权移动平均 + 贝叶斯估计

```typescript
interface TimePredictionModel {
  /**
   * 预测任务完成时间
   * @param task 任务信息
   * @param agent 目标 Agent
   * @returns 预测结果
   */
  predict(task: Task, agent: AgentCapability): PredictionResult

  /**
   * 更新模型
   * @param task 完成的任务
   * @param actualTime 实际耗时
   */
  update(task: Task, actualTime: number): void

  /**
   * 获取预测准确率
   */
  getAccuracy(): number
}
```

**实现策略**:

```typescript
class TaskTimePredictor implements TimePredictionModel {
  private historicalTimes: Map<string, number[]> // Agent + TaskType -> times
  private featureWeights: Map<string, number> // 特征权重

  predict(task: Task, agent: AgentCapability): PredictionResult {
    // 1. 获取历史数据
    const key = `${agent.agentId}:${task.type}`
    const history = this.historicalTimes.get(key) || []

    // 2. 基础预测 - 加权移动平均
    const baseEstimate = this.weightedMovingAverage(history)

    // 3. 特征调整
    const featureAdjustment = this.calculateFeatureAdjustment(task, agent)

    // 4. 贝叶斯估计（结合先验知识）
    const prior = this.getPriorKnowledge(task.type)
    const estimatedTime = this.bayesianEstimate(baseEstimate, featureAdjustment, prior)

    // 5. 计算置信度
    const confidence = this.calculateConfidence(history.length, agent.successRate)

    return {
      estimatedTime,
      confidence,
      factors: this.getContributingFactors(task, agent),
    }
  }

  private weightedMovingAverage(values: number[]): number {
    if (values.length === 0) return 0

    // 最近的数据权重更高
    const weights = values.map((_, i) => Math.pow(0.9, values.length - 1 - i))
    const totalWeight = weights.reduce((a, b) => a + b, 0)

    return values.reduce((sum, val, i) => sum + val * weights[i], 0) / totalWeight
  }

  private calculateFeatureAdjustment(task: Task, agent: AgentCapability): number {
    let adjustment = 1.0

    // 输入大小影响
    adjustment *= this.estimateInputSizeFactor(task.inputSize || 1)

    // 时间段影响（某些 Agent 在特定时间段表现更好）
    adjustment *= this.getTimeOfDayFactor(agent, new Date().getHours())

    // 负载影响
    adjustment *= 1 + agent.currentLoad / 200 // 负载越高，时间越长

    // 队列深度影响
    adjustment *= 1 + this.getQueueDepth(task.type) * 0.05

    return adjustment
  }

  private calculateConfidence(sampleSize: number, successRate: number): number {
    // 样本量因子
    const sampleFactor = Math.min(1, sampleSize / 10)

    // 成功率因子
    const successFactor = successRate

    // 综合置信度
    return sampleFactor * successFactor
  }
}
```

**集成方式**:

```typescript
// 在 AdaptiveLearner 中添加
class AdaptiveLearner {
  private timePredictor: TimePredictionModel

  predictTaskTime(task: Task, agent: AgentCapability): PredictionResult {
    return this.timePredictor.predict(task, agent)
  }

  recordDecision(decision: ScheduleDecision, success: boolean, completionTime: number): void {
    // ... 现有逻辑

    // 更新时间预测模型
    const task = this.getTask(decision.taskId)
    const agent = this.agents.get(decision.assignedAgent)
    if (task && agent) {
      this.timePredictor.update(task, completionTime)
    }
  }
}
```

### 2.2 Agent 能力自动评估更新

#### 2.2.1 设计方案

**能力评分维度**:

- **技术能力** (Technical): 特定任务类型的成功率
- **响应速度** (Speed): 平均完成时间
- **可靠性** (Reliability): 按时完成率
- **质量** (Quality): 输出质量评分

```typescript
interface CapabilityAssessment {
  /**
   * 自动评估 Agent 能力
   * @param agentId Agent ID
   * @returns 评估结果
   */
  assess(agentId: string): CapabilityAssessmentResult

  /**
   * 更新 Agent 能力评分
   * @param agentId Agent ID
   * @param assessment 评估结果
   */
  update(agentId: string, assessment: CapabilityAssessmentResult): void

  /**
   * 获取能力趋势
   * @param agentId Agent ID
   * @param taskType 任务类型
   * @returns 趋势分析
   */
  getTrend(agentId: string, taskType: TaskType): CapabilityTrend
}

interface CapabilityAssessmentResult {
  agentId: string
  timestamp: number

  // 综合评分
  overallScore: number // 0-100
  confidence: number // 0-1

  // 分维度评分
  dimensions: {
    technical: {
      score: number
      byTaskType: Map<TaskType, number>
    }
    speed: {
      score: number
      avgCompletionTime: number
      percentiles: {
        p50: number
        p90: number
        p95: number
      }
    }
    reliability: {
      score: number
      onTimeRate: number
      failureRate: number
    }
    quality: {
      score: number
      avgOutputQuality: number
      revisionRate: number
    }
  }

  // 能力变化
  changes: {
    improved: TaskType[]
    declined: TaskType[]
    stable: TaskType[]
  }

  // 建议
  recommendations: string[]
}
```

**实现策略**:

```typescript
class CapabilityAssessor implements CapabilityAssessment {
  private metrics: AgentLearningMetrics
  private historyWindow: number = 100 // 分析最近 100 个任务

  assess(agentId: string): CapabilityAssessmentResult {
    const metrics = this.metrics.get(agentId)
    if (!metrics) {
      return this.createDefaultAssessment(agentId)
    }

    // 1. 计算技术能力评分
    const technical = this.calculateTechnicalScore(metrics)

    // 2. 计算速度评分
    const speed = this.calculateSpeedScore(metrics)

    // 3. 计算可靠性评分
    const reliability = this.calculateReliabilityScore(metrics)

    // 4. 计算质量评分
    const quality = this.calculateQualityScore(metrics)

    // 5. 综合评分
    const overallScore = this.calculateOverallScore({
      technical: technical.score,
      speed: speed.score,
      reliability: reliability.score,
      quality: quality.score,
    })

    // 6. 检测变化
    const changes = this.detectChanges(agentId, metrics)

    // 7. 生成建议
    const recommendations = this.generateRecommendations(
      overallScore,
      { technical, speed, reliability, quality },
      changes
    )

    return {
      agentId,
      timestamp: Date.now(),
      overallScore,
      confidence: this.calculateConfidence(metrics),
      dimensions: { technical, speed, reliability, quality },
      changes,
      recommendations,
    }
  }

  private calculateTechnicalScore(metrics: AgentLearningMetrics): {
    score: number
    byTaskType: Map<TaskType, number>
  } {
    const byTaskType = new Map<TaskType, number>()
    let totalScore = 0
    let count = 0

    for (const [taskType, typeMetrics] of Object.entries(metrics.byTaskType)) {
      // 基于成功率和样本量计算评分
      const sampleFactor = Math.min(1, typeMetrics.assigned / 5)
      const score = typeMetrics.successRate * 100 * sampleFactor

      byTaskType.set(taskType as TaskType, score)
      totalScore += score
      count++
    }

    return {
      score: count > 0 ? totalScore / count : 50, // 默认中性评分
      byTaskType,
    }
  }

  private calculateSpeedScore(metrics: AgentLearningMetrics): {
    score: number
    avgCompletionTime: number
    percentiles: { p50: number; p90: number; p95: number }
  } {
    // 假设平均完成时间基准为 30 分钟
    const baselineTime = 30
    const avgTime = metrics.avgCompletionTime

    // 时间越短分数越高
    const score = Math.max(0, Math.min(100, 100 - ((avgTime - baselineTime) / baselineTime) * 50))

    // 计算百分位数（需要历史数据）
    const percentiles = this.calculatePercentiles(metrics)

    return {
      score,
      avgCompletionTime: avgTime,
      percentiles,
    }
  }

  private detectChanges(
    agentId: string,
    metrics: AgentLearningMetrics
  ): { improved: TaskType[]; declined: TaskType[]; stable: TaskType[] } {
    const improved: TaskType[] = []
    const declined: TaskType[] = []
    const stable: TaskType[] = []

    for (const [taskType, typeMetrics] of Object.entries(metrics.byTaskType)) {
      if (typeMetrics.assigned < 5) continue // 样本不足

      // 比较最近 10 个任务与之前的表现
      const recentSuccessRate = this.calculateRecentSuccessRate(agentId, taskType as TaskType, 10)
      const historicalSuccessRate = this.calculateHistoricalSuccessRate(
        agentId,
        taskType as TaskType
      )

      const diff = recentSuccessRate - historicalSuccessRate

      if (diff > 0.15) {
        improved.push(taskType as TaskType)
      } else if (diff < -0.15) {
        declined.push(taskType as TaskType)
      } else {
        stable.push(taskType as TaskType)
      }
    }

    return { improved, declined, stable }
  }

  private generateRecommendations(overallScore: number, dimensions: any, changes: any): string[] {
    const recommendations: string[] = []

    // 基于整体评分
    if (overallScore > 90) {
      recommendations.push('表现优秀，适合承担高优先级任务')
    } else if (overallScore < 60) {
      recommendations.push('建议减少任务分配，进行能力评估')
    }

    // 基于维度评分
    if (dimensions.speed.score < 50) {
      recommendations.push('响应速度较慢，建议检查资源瓶颈')
    }
    if (dimensions.reliability.score < 50) {
      recommendations.push('可靠性较低，需要调查失败原因')
    }

    // 基于趋势
    if (changes.declined.length > 0) {
      recommendations.push(`以下能力下降: ${changes.declined.join(', ')}`)
    }

    return recommendations
  }
}
```

**自动更新机制**:

```typescript
class AdaptiveLearner {
  private assessor: CapabilityAssessor
  private updateInterval: number = 3600000 // 1 小时

  startAutoAssessment(): void {
    setInterval(() => {
      this.performPeriodicAssessment()
    }, this.updateInterval)
  }

  private async performPeriodicAssessment(): Promise<void> {
    for (const [agentId, metrics] of this.metrics.entries()) {
      // 只有样本量足够才评估
      if (metrics.totalAssigned >= this.config.minTasksForLearning) {
        const assessment = this.assessor.assess(agentId)
        this.applyAssessment(agentId, assessment)
      }
    }
  }

  private applyAssessment(agentId: string, assessment: CapabilityAssessmentResult): void {
    const agent = this.agents.get(agentId)
    if (!agent) return

    // 更新能力评分
    agent.performanceScore = assessment.overallScore / 100

    // 更新成功率
    agent.successRate = assessment.dimensions.reliability.onTimeRate

    // 更新平均响应时间
    agent.avgResponseTime = assessment.dimensions.speed.avgCompletionTime

    // 触发重新计算权重
    if (assessment.changes.improved.length > 0 || assessment.changes.declined.length > 0) {
      this.recalculateWeights(agentId)
    }
  }
}
```

### 2.3 学习收敛判定标准

#### 2.3.1 设计方案

**收敛判定维度**:

1. **权重稳定性** - 权重调整幅度趋近于零
2. **性能稳定性** - 成功率和完成时间趋于稳定
3. **预测准确性** - 预测值与实际值差异小
4. **样本充足性** - 有足够的历史数据支撑

```typescript
interface ConvergenceCriteria {
  /**
   * 检查学习是否收敛
   * @returns 收敛状态
   */
  checkConvergence(): ConvergenceStatus

  /**
   * 设置收敛阈值
   * @param thresholds 阈值配置
   */
  setThresholds(thresholds: ConvergenceThresholds): void
}

interface ConvergenceStatus {
  converged: boolean
  timestamp: number

  // 各维度收敛状态
  dimensions: {
    weights: {
      converged: boolean
      stability: number // 0-1, 越高越稳定
      lastAdjustment: number // 最后调整幅度
    }
    performance: {
      converged: boolean
      successRateStability: number
      timeStability: number
    }
    prediction: {
      converged: boolean
      accuracy: number
      errorRate: number
    }
    samples: {
      converged: boolean
      totalCount: number
      recentCount: number
      sufficiency: number // 0-1
    }
  }

  // 收敛进度
  progress: {
    overall: number // 0-100%
    byDimension: Map<string, number>
  }

  // 建议
  recommendation: string
}

interface ConvergenceThresholds {
  // 权重调整阈值
  weightAdjustmentMax: number // 最大允许调整幅度

  // 性能稳定性阈值
  successRateVarianceMax: number // 成功率方差上限
  timeVarianceMax: number // 时间方差上限

  // 预测准确性阈值
  predictionErrorMax: number // 预测误差上限

  // 样本量阈值
  minSamplesForConvergence: number // 收敛所需最小样本
}
```

**默认阈值**:

```typescript
const DEFAULT_THRESHOLDS: ConvergenceThresholds = {
  weightAdjustmentMax: 0.05, // 权重调整 < 5%
  successRateVarianceMax: 0.05, // 成功率方差 < 5%
  timeVarianceMax: 0.1, // 时间方差 < 10%
  predictionErrorMax: 0.15, // 预测误差 < 15%
  minSamplesForConvergence: 50, // 至少 50 个样本
}
```

**实现策略**:

```typescript
class ConvergenceChecker implements ConvergenceCriteria {
  private thresholds: ConvergenceThresholds
  private history: {
    weights: number[][]
    successRates: number[]
    times: number[]
    predictionErrors: number[]
  }

  constructor(thresholds?: Partial<ConvergenceThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds }
    this.history = {
      weights: [],
      successRates: [],
      times: [],
      predictionErrors: [],
    }
  }

  checkConvergence(): ConvergenceStatus {
    const weightsConverged = this.checkWeightsConvergence()
    const performanceConverged = this.checkPerformanceConvergence()
    const predictionConverged = this.checkPredictionConvergence()
    const samplesSufficient = this.checkSampleSufficiency()

    // 整体收敛判定
    const converged =
      weightsConverged.converged &&
      performanceConverged.converged &&
      predictionConverged.converged &&
      samplesSufficient.converged

    // 计算进度
    const progress = this.calculateProgress({
      weights: weightsConverged,
      performance: performanceConverged,
      prediction: predictionConverged,
      samples: samplesSufficient,
    })

    return {
      converged,
      timestamp: Date.now(),
      dimensions: {
        weights: weightsConverged,
        performance: performanceConverged,
        prediction: predictionConverged,
        samples: samplesSufficient,
      },
      progress,
      recommendation: this.generateRecommendation(converged, progress),
    }
  }

  private checkWeightsConvergence(): {
    converged: boolean
    stability: number
    lastAdjustment: number
  } {
    const recentWeights = this.history.weights.slice(-10)
    if (recentWeights.length < 5) {
      return { converged: false, stability: 0, lastAdjustment: 1 }
    }

    // 计算权重变化的标准差
    const adjustments = recentWeights
      .map((w, i) => {
        if (i === 0) return 0
        return this.calculateAdjustment(recentWeights[i - 1], w)
      })
      .slice(1)

    const avgAdjustment = adjustments.reduce((a, b) => a + b, 0) / adjustments.length
    const variance = this.calculateVariance(adjustments)
    const stability = 1 - Math.sqrt(variance)

    return {
      converged:
        avgAdjustment < this.thresholds.weightAdjustmentMax &&
        variance < Math.pow(this.thresholds.weightAdjustmentMax, 2),
      stability,
      lastAdjustment: adjustments[adjustments.length - 1] || 0,
    }
  }

  private checkPerformanceConvergence(): {
    converged: boolean
    successRateStability: number
    timeStability: number
  } {
    const recentSuccessRates = this.history.successRates.slice(-20)
    const recentTimes = this.history.times.slice(-20)

    // 成功率稳定性
    const successRateVariance = this.calculateVariance(recentSuccessRates)
    const successRateStability = 1 - Math.sqrt(successRateVariance)

    // 时间稳定性
    const timeVariance = this.calculateVariance(recentTimes)
    const timeStability = 1 - Math.sqrt(timeVariance)

    return {
      converged:
        successRateVariance < Math.pow(this.thresholds.successRateVarianceMax, 2) &&
        timeVariance < Math.pow(this.thresholds.timeVarianceMax, 2),
      successRateStability,
      timeStability,
    }
  }

  private checkPredictionConvergence(): {
    converged: boolean
    accuracy: number
    errorRate: number
  } {
    const recentErrors = this.history.predictionErrors.slice(-20)
    if (recentErrors.length < 5) {
      return { converged: false, accuracy: 0, errorRate: 1 }
    }

    const avgError = recentErrors.reduce((a, b) => a + b, 0) / recentErrors.length
    const accuracy = 1 - avgError

    return {
      converged: avgError < this.thresholds.predictionErrorMax,
      accuracy,
      errorRate: avgError,
    }
  }

  private checkSampleSufficiency(): {
    converged: boolean
    totalCount: number
    recentCount: number
    sufficiency: number
  } {
    const totalCount = this.getTotalSampleCount()
    const recentCount = this.history.successRates.length
    const sufficiency = Math.min(1, totalCount / this.thresholds.minSamplesForConvergence)

    return {
      converged: totalCount >= this.thresholds.minSamplesForConvergence,
      totalCount,
      recentCount,
      sufficiency,
    }
  }

  private calculateProgress(statuses: any): {
    overall: number
    byDimension: Map<string, number>
  } {
    const byDimension = new Map<string, number>()

    byDimension.set('weights', statuses.weights.stability * 100)
    byDimension.set(
      'performance',
      ((statuses.performance.successRateStability + statuses.performance.timeStability) / 2) * 100
    )
    byDimension.set('prediction', statuses.prediction.accuracy * 100)
    byDimension.set('samples', statuses.samples.sufficiency * 100)

    const overall = Array.from(byDimension.values()).reduce((a, b) => a + b, 0) / byDimension.size

    return { overall, byDimension }
  }

  private generateRecommendation(converged: boolean, progress: any): string {
    if (converged) {
      return '学习已收敛，系统性能稳定'
    }

    const lowProgressDimensions = Array.from(progress.byDimension.entries())
      .filter(([_, p]) => p < 70)
      .map(([d, _]) => d)

    if (lowProgressDimensions.length > 0) {
      return `以下维度需要更多数据: ${lowProgressDimensions.join(', ')}`
    }

    return `学习进度: ${progress.overall.toFixed(1)}%`
  }
}
```

### 2.4 数据持久化增强

#### 2.4.1 设计方案

**存储架构**:

```
┌─────────────────────────────────────────────────────┐
│                  Persistence Layer                   │
├─────────────────────────────────────────────────────┤
│  • LocalStorage (浏览器端)                           │
│  • IndexedDB (大数据量)                              │
│  • Redis (服务端缓存)                                │
│  • Database (持久存储)                               │
└─────────────────────────────────────────────────────┘
```

**数据模型**:

```typescript
interface LearningPersistence {
  /**
   * 保存学习状态
   */
  save(state: LearningState): Promise<void>

  /**
   * 加载学习状态
   */
  load(): Promise<LearningState | null>

  /**
   * 导出学习数据
   */
  export(): Promise<string>

  /**
   * 导入学习数据
   */
  import(data: string): Promise<void>

  /**
   * 清除学习数据
   */
  clear(): Promise<void>
}

interface LearningState {
  version: string
  timestamp: number

  // Agent 学习指标
  agentMetrics: Map<string, AgentLearningMetrics>

  // 时间预测模型数据
  timePredictionData: {
    historicalTimes: Map<string, number[]>
    featureWeights: Map<string, number>
  }

  // 权重缓存
  weightCache: Map<string, Map<TaskType, number>>

  // 决策历史
  decisionHistory: Array<{
    decision: ScheduleDecision
    success: boolean
    completionTime: number
    timestamp: number
  }>

  // 收敛状态
  convergenceStatus: ConvergenceStatus
}
```

**实现策略**:

```typescript
class LearningPersistenceManager implements LearningPersistence {
  private storageKey: string = 'scheduler-learning-v1'
  private maxHistorySize: number = 1000

  async save(state: LearningState): Promise<void> {
    try {
      // 1. 序列化状态
      const serialized = this.serialize(state)

      // 2. 压缩数据
      const compressed = await this.compress(serialized)

      // 3. 存储到 LocalStorage
      localStorage.setItem(this.storageKey, compressed)

      // 4. 同步到服务端（如果可用）
      await this.syncToServer(compressed)
    } catch (error) {
      console.error('[LearningPersistence] Save failed:', error)
      throw error
    }
  }

  async load(): Promise<LearningState | null> {
    try {
      // 1. 从 LocalStorage 加载
      const compressed = localStorage.getItem(this.storageKey)
      if (!compressed) return null

      // 2. 解压数据
      const serialized = await this.decompress(compressed)

      // 3. 反序列化
      const state = this.deserialize(serialized)

      // 4. 版本检查
      if (state.version !== CURRENT_VERSION) {
        return this.migrate(state)
      }

      return state
    } catch (error) {
      console.error('[LearningPersistence] Load failed:', error)
      return null
    }
  }

  private serialize(state: LearningState): string {
    return JSON.stringify({
      version: state.version,
      timestamp: state.timestamp,
      agentMetrics: Array.from(state.agentMetrics.entries()),
      timePredictionData: {
        historicalTimes: Array.from(state.timePredictionData.historicalTimes.entries()),
        featureWeights: Array.from(state.timePredictionData.featureWeights.entries()),
      },
      weightCache: Array.from(state.weightCache.entries()).map(([k, v]) => [
        k,
        Array.from(v.entries()),
      ]),
      decisionHistory: state.decisionHistory.slice(-this.maxHistorySize),
      convergenceStatus: state.convergenceStatus,
    })
  }

  private deserialize(data: string): LearningState {
    const parsed = JSON.parse(data)

    return {
      version: parsed.version,
      timestamp: parsed.timestamp,
      agentMetrics: new Map(parsed.agentMetrics),
      timePredictionData: {
        historicalTimes: new Map(parsed.timePredictionData.historicalTimes),
        featureWeights: new Map(parsed.timePredictionData.featureWeights),
      },
      weightCache: new Map(parsed.weightCache.map(([k, v]: [string, any[]]) => [k, new Map(v)])),
      decisionHistory: parsed.decisionHistory,
      convergenceStatus: parsed.convergenceStatus,
    }
  }

  private async compress(data: string): Promise<string> {
    // 使用 LZ-String 或类似库进行压缩
    // 简单实现：直接返回
    return data
  }

  private async decompress(data: string): Promise<string> {
    return data
  }

  private async syncToServer(data: string): Promise<void> {
    // 如果有服务端 API，同步数据
    try {
      await fetch('/api/a2a/learning/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
    } catch (error) {
      // 同步失败不影响本地存储
      console.warn('[LearningPersistence] Server sync failed:', error)
    }
  }
}
```

### 2.5 学习可视化

#### 2.5.1 Dashboard 组件设计

```typescript
interface LearningDashboardProps {
  learner: AdaptiveLearner;
  className?: string;
}

// 学习指标面板
const LearningMetricsPanel: React.FC<{ metrics: AgentLearningMetrics }> = ({ metrics }) => {
  return (
    <div className="learning-metrics-panel">
      <h3>Agent 学习指标</h3>
      <div className="metrics-grid">
        <MetricCard
          title="成功率"
          value={(metrics.successRate * 100).toFixed(1) + '%'}
          trend={metrics.trend}
        />
        <MetricCard
          title="平均完成时间"
          value={metrics.avgCompletionTime.toFixed(1) + ' 分钟'}
        />
        <MetricCard
          title="置信度"
          value={(metrics.confidence * 100).toFixed(0) + '%'}
        />
      </div>
    </div>
  );
};

// 收敛状态面板
const ConvergenceStatusPanel: React.FC<{ status: ConvergenceStatus }> = ({ status }) => {
  return (
    <div className="convergence-status-panel">
      <h3>学习收敛状态</h3>
      <div className={`status-indicator ${status.converged ? 'converged' : 'learning'}`}>
        {status.converged ? '✅ 已收敛' : '🔄 学习中'}
      </div>
      <ProgressBar value={status.progress.overall} label="整体进度" />
      <div className="dimension-progress">
        {Array.from(status.progress.byDimension.entries()).map(([dim, progress]) => (
          <ProgressBar key={dim} value={progress} label={dim} />
        ))}
      </div      </div>
      <div className="recommendation">
        <strong>建议:</strong> {status.recommendation}
      </div>
    </div>
  );
};

// 权重调整历史
const WeightAdjustmentHistory: React.FC<{
  adjustments: WeightAdjustment[]
}> = ({ adjustments }) => {
  return (
    <div className="weight-adjustment-history">
      <h3>权重调整历史</h3>
      <table className="adjustments-table">
        <thead>
          <tr>
            <th>Agent</th>
            <th>任务类型</th>
            <th>当前权重</th>
            <th>建议权重</th>
            <th>置信度</th>
            <th>原因</th>
          </tr>
        </thead>
        <tbody>
          {adjustments.map((adj, i) => (
            <tr key={i}>
              <td>{adj.agentId}</td>
              <td>{adj.taskType}</td>
              <td>{adj.currentWeight.toFixed(2)}</td>
              <td className={adj.suggestedWeight > adj.currentWeight ? 'increase' : 'decrease'}>
                {adj.suggestedWeight.toFixed(2)}
              </td>
              <td>{(adj.confidence * 100).toFixed(0)}%</td>
              <td>{adj.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## 3. 实现路线图

### 3.1 阶段划分

#### Phase 1: 基础增强 (1-2 天)

**目标**: 完善现有学习系统，修复已知问题

| 任务                            | 工作量 | 优先级 | 负责人      |
| ------------------------------- | ------ | ------ | ----------- |
| 完善 AdaptiveLearner 数据持久化 | 0.5 天 | P0     | ⏳ Executor |
| 添加学习指标导出功能            | 0.5 天 | P0     | ⏳ Executor |
| 修复权重调整逻辑                | 0.5 天 | P0     | ⏳ Executor |
| 单元测试补充                    | 0.5 天 | P1     | ⏳ 测试员   |

**交付物**:

- ✅ 数据持久化完整实现
- ✅ 导出/导入功能
- ✅ 测试覆盖率达到 95%+

---

#### Phase 2: 时间预测模型 (2-3 天)

**目标**: 实现任务完成时间预测

| 任务                         | 工作量 | 优先级 | 负责人    |
| ---------------------------- | ------ | ------ | --------- |
| 实现 TimePredictionModel     | 1 天   | P0     | 🏗️ 架构师 |
| 集成加权移动平均算法         | 0.5 天 | P0     | 🏗️ 架构师 |
| 实现贝叶斯估计               | 0.5 天 | P1     | 🏗️ 架构师 |
| 特征工程（输入大小、时间等） | 0.5 天 | P1     | 🏗️ 架构师 |
| 预测准确率评估               | 0.5 天 | P0     | 🧪 测试员 |

**交付物**:

- ✅ 可用的时间预测模型
- ✅ 预测准确率 ≥ 80%
- ✅ 完整的测试用例

---

#### Phase 3: 能力自动评估 (2-3 天)

**目标**: 实现 Agent 能力自动评估和更新

| 任务                    | 工作量 | 优先级 | 负责人      |
| ----------------------- | ------ | ------ | ----------- |
| 实现 CapabilityAssessor | 1 天   | P0     | 🏗️ 架构师   |
| 计算多维能力评分        | 0.5 天 | P0     | 🏗️ 架构师   |
| 实现趋势检测算法        | 0.5 天 | P0     | 🏗️ 架构师   |
| 自动更新机制            | 0.5 天 | P1     | ⚡ Executor |
| 生成评估报告            | 0.5 天 | P1     | 🎨 设计师   |

**交付物**:

- ✅ 自动能力评估系统
- ✅ 多维度评分模型
- ✅ 趋势分析和建议生成

---

#### Phase 4: 收敛判定 (1-2 天)

**目标**: 实现学习收敛判定标准

| 任务                    | 工作量 | 优先级 | 负责人    |
| ----------------------- | ------ | ------ | --------- |
| 实现 ConvergenceChecker | 0.5 天 | P0     | 🏗️ 架构师 |
| 多维度收敛判定          | 0.5 天 | P0     | 🏗️ 架构师 |
| 收敛进度计算            | 0.5 天 | P1     | 🏗️ 架构师 |
| 建议生成系统            | 0.5 天 | P1     | 🏗️ 架构师 |

**交付物**:

- ✅ 完整的收敛判定系统
- ✅ 收敛进度可视化
- ✅ 智能建议生成

---

#### Phase 5: Dashboard 可视化 (2-3 天)

**目标**: 实现学习系统 Dashboard UI

| 任务           | 工作量 | 优先级 | 负责人    |
| -------------- | ------ | ------ | --------- |
| 学习指标面板   | 0.5 天 | P1     | 🎨 设计师 |
| 收敛状态面板   | 0.5 天 | P1     | 🎨 设计师 |
| 权重调整历史   | 0.5 天 | P1     | 🎨 设计师 |
| 预测准确率图表 | 0.5 天 | P1     | 🎨 设计师 |
| Agent 能力对比 | 0.5 天 | P2     | 🎨 设计师 |
| 学习控制面板   | 0.5 天 | P2     | 🎨 设计师 |

**交付物**:

- ✅ 完整的学习系统 Dashboard
- ✅ 实时数据更新
- ✅ 用户友好的交互

---

#### Phase 6: 集成和优化 (1-2 天)

**目标**: 系统集成和性能优化

| 任务                     | 工作量 | 优先级 | 负责人      |
| ------------------------ | ------ | ------ | ----------- |
| 学习系统集成到 Scheduler | 0.5 天 | P0     | ⚡ Executor |
| 性能优化                 | 0.5 天 | P1     | ⚡ Executor |
| 集成测试                 | 0.5 天 | P0     | 🧪 测试员   |
| 文档更新                 | 0.5 天 | P1     | 📚 咨询师   |

**交付物**:

- ✅ 完整的集成系统
- ✅ 性能测试报告
- ✅ 更新的文档

---

### 3.2 时间线

```
Week 1 (2026-04-01 ~ 04-07)
├── Day 1-2: Phase 1 - 基础增强
├── Day 3-5: Phase 2 - 时间预测模型
└── Day 6-7: Phase 3 - 能力自动评估 (部分)

Week 2 (2026-04-08 ~ 04-14)
├── Day 1-2: Phase 3 - 能力自动评估 (完成)
├── Day 3-4: Phase 4 - 收敛判定
├── Day 5-6: Phase 5 - Dashboard 可视化
└── Day 7: Phase 6 - 集成和优化

Week 3 (2026-04-15 ~ 04-19)
├── Day 1-2: 测试和 Bug 修复
├── Day 3-4: 性能优化
└── Day 5: 发布准备
```

---

### 3.3 资源需求

| 角色        | 投入时间 | 主要任务                |
| ----------- | -------- | ----------------------- |
| 🏗️ 架构师   | 5-6 天   | 核心算法设计、Phase 2-4 |
| ⚡ Executor | 3-4 天   | 系统集成、Phase 1 & 6   |
| 🎨 设计师   | 2-3 天   | Dashboard UI、Phase 5   |
| 🧪 测试员   | 2-3 天   | 测试用例、验证          |
| 📚 咨询师   | 1-2 天   | 文档、方案设计          |

**总工作量**: 13-18 人天
**建议周期**: 3 周

---

## 4. 风险评估

### 4.1 技术风险

#### 风险 1: 冷启动问题

**描述**: 新系统缺乏历史数据，学习效果差

**影响**: 高
**概率**: 高

**缓解措施**:

- ✅ 使用预定义的初始权重
- ✅ 设置较低的收敛阈值
- ✅ 前期手动调整权重
- ✅ 使用合成数据进行预热

**应急方案**:

- 前 50 个任务使用固定权重
- 使用迁移学习（从其他项目导入数据）

---

#### 风险 2: 预测准确性低

**描述**: 时间预测模型预测误差大

**影响**: 中
**概率**: 中

**缓解措施**:

- ✅ 采用多种预测算法（加权平均 + 贝叶斯）
- ✅ 特征工程优化
- ✅ 逐步调整权重
- ✅ 设置预测误差上限

**应急方案**:

- 降级到简单的平均时间预测
- 提供手动覆盖选项

---

#### 风险 3: 学习不收敛

**描述**: 学习系统无法达到收敛状态

**影响**: 高
**概率**: 低

**缓解措施**:

- ✅ 多维度收敛判定
- ✅ 设置学习率上限
- ✅ 检测震荡现象并调整
- ✅ 提供学习重置功能

**应急方案**:

- 使用固定权重
- 降低学习频率
- 减少历史数据窗口

---

#### 风险 4: 性能影响

**描述**: 学习系统拖慢调度性能

**影响**: 中
**概率**: 中

**缓解措施**:

- ✅ 异步执行学习任务
- ✅ 批量处理学习数据
- ✅ 限制历史数据大小
- ✅ 缓存学习结果

**应急方案**:

- 禁用学习系统
- 延迟学习到空闲时段

---

### 4.2 业务风险

#### 风险 5: 调度质量下降

**描述**: 学习系统导致调度决策变差

**影响**: 高
**概率**: 低

**缓解措施**:

- ✅ A/B 测试对比
- ✅ 保留手动干预能力
- ✅ 监控调度指标
- ✅ 快速回滚机制

**应急方案**:

- 立即禁用学习系统
- 恢复到固定权重
- 人工审核重要决策

---

#### 风险 6: 用户体验问题

**描述**: Dashboard 或学习功能影响用户体验

**影响**: 中
**概率**: 低

**缓解措施**:

- ✅ 渐进式展示
- ✅ 提供关闭选项
- ✅ 用户反馈收集
- ✅ 灰度发布

**应急方案**:

- 隐藏学习相关功能
- 简化 UI 界面

---

### 4.3 风险矩阵

| 风险         | 影响 | 概率 | 等级  | 优先级 |
| ------------ | ---- | ---- | ----- | ------ |
| 冷启动问题   | 高   | 高   | 🔴 高 | P0     |
| 调度质量下降 | 高   | 低   | 🟡 中 | P0     |
| 学习不收敛   | 高   | 低   | 🟡 中 | P1     |
| 性能影响     | 中   | 中   | 🟡 中 | P1     |
| 预测准确性低 | 中   | 中   | 🟢 低 | P2     |
| 用户体验问题 | 中   | 低   | 🟢 低 | P2     |

---

## 5. 成功标准

### 5.1 功能指标

| 指标           | 目标  | 当前 | 差距 |
| -------------- | ----- | ---- | ---- |
| 学习系统覆盖率 | 100%  | 60%  | 40%  |
| 时间预测准确率 | ≥ 85% | N/A  | 85%  |
| 能力评估准确率 | ≥ 80% | N/A  | 80%  |
| 收敛判定准确率 | ≥ 90% | N/A  | 90%  |
| 学习数据持久化 | 100%  | 50%  | 50%  |

### 5.2 性能指标

| 指标               | 目标    | 当前    | 差距  |
| ------------------ | ------- | ------- | ----- |
| 调度响应时间       | < 100ms | < 100ms | 0%    |
| 学习计算时间       | < 500ms | N/A     | 500ms |
| 数据存储大小       | < 10MB  | N/A     | 10MB  |
| Dashboard 加载时间 | < 2s    | N/A     | 2s    |

### 5.3 业务指标

| 指标             | 目标    | 当前   | 差距   |
| ---------------- | ------- | ------ | ------ |
| 调度准确率提升   | 15-25%  | N/A    | 15-25% |
| 任务完成时间减少 | 10-15%  | N/A    | 10-15% |
| Agent 负载均衡度 | 90-95%  | 85-95% | 0-10%  |
| 用户满意度       | ≥ 4.5/5 | N/A    | 4.5/5  |

### 5.4 质量指标

| 指标              | 目标  | 当前 | 差距 |
| ----------------- | ----- | ---- | ---- |
| 测试覆盖率        | ≥ 95% | N/A  | 95%  |
| TypeScript 错误数 | 0     | 0    | 0    |
| ESLint 警告数     | 0     | N/A  | 0    |
| 文档完整度        | 100%  | N/A  | 100% |

---

## 6. 后续优化方向

### 6.1 短期优化 (v1.5.1)

1. **引入强化学习**
   - 使用 Q-learning 优化调度策略
   - 实现奖励函数设计
   - 探索-利用平衡

2. **多 Agent 协作学习**
   - 学习 Agent 之间的协作模式
   - 优化多 Agent 任务分配
   - 协作效果评估

3. **实时在线学习**
   - 实时更新模型
   - 增量学习算法
   - 流式数据处理

---

### 6.2 中期优化 (v1.6.0)

1. **深度学习模型**
   - 神经网络时间预测
   - 特征自动提取
   - 端到端学习

2. **跨项目学习**
   - 迁移学习应用
   - 知识共享机制
   - 通用能力建模

3. **A/B 测试系统**
   - 自动化 A/B 测试
   - 统计显著性检验
   - 实验结果可视化

---

### 6.3 长期优化 (v1.7.0+)

1. **联邦学习**
   - 分布式学习架构
   - 隐私保护
   - 模型聚合

2. **因果推理**
   - 因果关系分析
   - 反事实推理
   - 可解释性增强

3. **自适应架构**
   - 动态模型选择
   - 自动超参数调优
   - 元学习框架

---

## 7. 总结

### 7.1 关键成果

本研究完成了 Agent 学习系统优化方案的设计，包括：

1. ✅ **系统分析** - 深入分析了现有学习系统架构
2. ✅ **差距分析** - 识别了需要完善的功能点
3. ✅ **方案设计** - 设计了时间预测、能力评估、收敛判定等核心功能
4. ✅ **实施路线** - 制定了清晰的 6 阶段实施计划
5. ✅ **风险评估** - 识别了关键风险并制定了缓解措施
6. ✅ **成功标准** - 定义了量化的成功指标

### 7.2 核心价值

- **调度准确率提升 15-25%** - 通过自适应学习和权重优化
- **任务完成时间减少 10-15%** - 通过准确的时间预测和优化调度
- **负载均衡度提升至 90-95%** - 通过智能负载分配
- **自动化程度提升** - 减少手动干预，提高系统自主性
- **可观测性增强** - 通过 Dashboard 可视化学习过程

### 7.3 下一步行动

1. **立即开始** (本周):
   - 📋 组织评审会议，讨论方案细节
   - ✅ 确认优先级和时间线
   - 🏗️ 分配任务给各角色

2. **第一周**:
   - ⚡ 完成 Phase 1: 基础增强
   - 🏗️ 启动 Phase 2: 时间预测模型

3. **持续跟进**:
   - 📊 每日站会同步进度
   - 🧪 每周进行代码审查
   - 📚 持续更新文档

---

## 附录

### A. 参考资料

1. **现有文档**
   - [ADR-0006: Agent Scheduler 架构决策](./adr/0006-agent-scheduler-architecture.md)
   - [Agent 调度系统 API 文档](./api/agent-scheduler.md)
   - [v1.5.0 ROADMAP](../ROADMAP_v1.5.0.md)

2. **技术论文**
   - "Learning to Route for Job Shop Scheduling" (2023)
   - "Multi-Agent Reinforcement Learning for Scheduling" (2022)
   - "Adaptive Task Scheduling with Bayesian Estimation" (2021)

3. **开源项目**
   - Apache Airflow - 任务调度系统
   - Celery - 分布式任务队列
   - Kubernetes Scheduler - 容器调度

### B. 术语表

| 术语                  | 解释                        |
| --------------------- | --------------------------- |
| Agent                 | AI 智能体，负责执行特定任务 |
| Task                  | 需要调度的任务单元          |
| Scheduling            | 任务分配给 Agent 的过程     |
| Learning System       | 从历史数据中学习的系统      |
| Convergence           | 学习达到稳定状态            |
| Weight Adjustment     | 动态调整评分权重            |
| Capability Assessment | Agent 能力评估              |
| Time Prediction       | 任务完成时间预测            |

### C. 联系方式

| 角色        | 姓名 | 职责               |
| ----------- | ---- | ------------------ |
| 📚 咨询师   | -    | 方案设计、文档编写 |
| 🏗️ 架构师   | -    | 核心算法设计       |
| ⚡ Executor | -    | 系统集成           |
| 🧪 测试员   | -    | 测试验证           |
| 🎨 设计师   | -    | Dashboard UI       |

---

**文档版本**: v1.0
**最后更新**: 2026-03-30
**状态**: ✅ 研究完成，待评审
