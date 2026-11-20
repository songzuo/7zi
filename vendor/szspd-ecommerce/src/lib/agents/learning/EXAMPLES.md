# TimePredictionEngine 使用示例

## 基础用法

```typescript
import { createTimePredictionEngine } from './time-prediction-engine'

// 创建引擎实例
const engine = createTimePredictionEngine({
  minSampleSize: 5,
  confidenceThreshold: 0.7,
  strategy: 'adaptive',
})

// 第一次预测（规则基础）
const prediction1 = await engine.predict({
  agentId: 'agent-1',
  taskType: 'code-analysis',
  taskComplexity: 'high',
})

console.log('初始预测:', {
  时间: prediction1.estimatedMinutes + '分钟',
  置信度: (prediction1.confidence * 100).toFixed(0) + '%',
  策略: prediction1.strategy,
})

// 添加历史数据
engine.updateHistory('agent-1', 'task-1', 28, true, 'code-analysis', 'high')
engine.updateHistory('agent-1', 'task-2', 32, true, 'code-analysis', 'high')
engine.updateHistory('agent-1', 'task-3', 25, true, 'code-analysis', 'high')
engine.updateHistory('agent-1', 'task-4', 30, true, 'code-analysis', 'high')
engine.updateHistory('agent-1', 'task-5', 29, true, 'code-analysis', 'high')

// 第二次预测（统计基础）
const prediction2 = await engine.predict({
  agentId: 'agent-1',
  taskType: 'code-analysis',
  taskComplexity: 'high',
})

console.log('学习后预测:', {
  时间: prediction2.estimatedMinutes + '分钟',
  置信度: (prediction2.confidence * 100).toFixed(0) + '%',
  策略: prediction2.strategy,
  基于: prediction2.basedOn,
})
```

## 高级用法：多任务类型学习

```typescript
const engine = createTimePredictionEngine()

// 为不同任务类型建立历史
engine.updateHistory('agent-1', 'task-1', 10, true, 'simple-task', 'low')
engine.updateHistory('agent-1', 'task-2', 12, true, 'simple-task', 'low')
engine.updateHistory('agent-1', 'task-3', 11, true, 'simple-task', 'low')

engine.updateHistory('agent-1', 'task-4', 60, true, 'complex-task', 'high')
engine.updateHistory('agent-1', 'task-5', 65, true, 'complex-task', 'high')
engine.updateHistory('agent-1', 'task-6', 55, true, 'complex-task', 'high')

// 预测不同任务类型
const simplePrediction = await engine.predict({
  agentId: 'agent-1',
  taskType: 'simple-task',
  taskComplexity: 'low',
})

const complexPrediction = await engine.predict({
  agentId: 'agent-1',
  taskType: 'complex-task',
  taskComplexity: 'high',
})

console.log('简单任务:', simplePrediction.estimatedMinutes + '分钟')
console.log('复杂任务:', complexPrediction.estimatedMinutes + '分钟')
```

## 准确率追踪

```typescript
const engine = createTimePredictionEngine()

// 预测并记录实际结果
async function predictAndTrack(agentId: string, taskType: string) {
  const prediction = await engine.predict({
    agentId,
    taskType,
    taskComplexity: 'medium',
  })

  console.log(`预测: ${prediction.estimatedMinutes}分钟`)

  // ... 执行任务 ...
  const actualTime = Math.round(20 + Math.random() * 10) // 模拟实际时间

  // 记录历史
  engine.updateHistory(agentId, `task-${Date.now()}`, actualTime, true, taskType, 'medium')

  // 记录预测与实际对比
  engine['recordPrediction'](agentId, prediction.estimatedMinutes, actualTime)

  // 获取准确率
  const accuracy = engine.getAgentAccuracy(agentId)
  console.log(`准确率: ${(accuracy * 100).toFixed(1)}%`)

  return actualTime
}

// 运行多次
await predictAndTrack('agent-1', 'test-task')
await predictAndTrack('agent-1', 'test-task')
await predictAndTrack('agent-1', 'test-task')
await predictAndTrack('agent-1', 'test-task')
await predictAndTrack('agent-1', 'test-task')
```

## 使用历史数据调整预测

```typescript
const engine = createTimePredictionEngine()

// 包含 Agent 可靠性数据
const prediction = await engine.predict({
  agentId: 'agent-1',
  taskType: 'critical-task',
  taskComplexity: 'critical',
  historicalData: {
    avgCompletionTime: 120,
    successRate: 0.75,
    agentReliability: 0.8,
  },
})

console.log('预测结果:', {
  预估时间: prediction.estimatedMinutes + '分钟',
  置信度: (prediction.confidence * 100).toFixed(0) + '%',
  置信区间: `${prediction.confidenceInterval[0]}-${prediction.confidenceInterval[1]}分钟`,
  影响因素: prediction.factors,
})
```

## 性能监控

```typescript
const engine = createTimePredictionEngine()

// 获取引擎统计
const stats = engine.getStats()

console.log('引擎统计:', {
  总Agent数: stats.totalAgents,
  总历史记录: stats.totalHistories,
  整体准确率: (stats.overallAccuracy * 100).toFixed(1) + '%',
  跟踪的任务类型数: stats.taskTypesTracked,
})

// 获取按任务类型的准确率
const accuracyByType = engine.getAccuracyByTaskType()

accuracyByType.forEach((stats, taskType) => {
  console.log(`${taskType}:`, {
    准确率: (stats.accuracy * 100).toFixed(1) + '%',
    样本数: stats.count,
  })
})
```

## 自定义配置

```typescript
const customEngine = createTimePredictionEngine({
  minSampleSize: 10, // 需要更多样本才切换到统计
  confidenceThreshold: 0.8, // 更高的准确率阈值
  accuracyWindowSize: 30, // 跟踪更多历史预测
  maxHistoryPerAgent: 200, // 保留更多历史
  strategy: 'statistical', // 固定使用统计策略
  defaultTimesByComplexity: {
    low: 3,
    medium: 10,
    high: 30,
    critical: 90,
  },
  complexityMultipliers: {
    low: 0.7,
    medium: 1.0,
    high: 1.8,
    critical: 2.5,
  },
})
```

## 与调度器集成

```typescript
class SmartScheduler {
  private timePredictor = createTimePredictionEngine()

  async schedule(task) {
    // 预测每个 Agent 的完成时间
    const predictions = await Promise.all(
      agents.map(async agent => {
        const prediction = await this.timePredictor.predict({
          agentId: agent.id,
          taskType: task.type,
          taskComplexity: this.getComplexity(task),
          historicalData: this.getHistoricalData(agent),
        })

        return {
          agent,
          predictedTime: prediction.estimatedMinutes,
          confidence: prediction.confidence,
          factors: prediction.factors,
        }
      })
    )

    // 选择最佳 Agent（时间最短 + 置信度最高）
    const best = predictions.sort((a, b) => {
      const scoreA = a.predictedTime * (1 - a.confidence * 0.5)
      const scoreB = b.predictedTime * (1 - b.confidence * 0.5)
      return scoreA - scoreB
    })[0]

    console.log(`选择 ${best.agent.id}: 预计 ${best.predictedTime} 分钟`)

    // 执行任务
    const result = await this.executeTask(best.agent, task)

    // 记录实际结果
    this.timePredictor.updateHistory(
      best.agent.id,
      task.id,
      result.executionTime,
      result.success,
      task.type,
      this.getComplexity(task)
    )

    return best
  }
}
```

## 清除历史（测试用）

```typescript
const engine = createTimePredictionEngine()

// ... 添加历史和运行预测 ...

// 清除所有历史
engine.clearHistory()

const stats = engine.getStats()
console.log('清除后:', stats) // 应该全为零
```
