/**
 * TimePredictionEngine 演示脚本
 */

import { createTimePredictionEngine } from './src/lib/agents/learning/time-prediction-engine.ts';

async function demo() {
  console.log('=== TimePredictionEngine 演示 ===\n');

  // 创建引擎
  const engine = createTimePredictionEngine();

  console.log('1. 初始预测（无历史数据）');
  const prediction1 = await engine.predict({
    agentId: 'agent-1',
    taskType: 'code-analysis',
    taskComplexity: 'high'
  });
  console.log(`   预估时间: ${prediction1.estimatedMinutes} 分钟`);
  console.log(`   置信度: ${(prediction1.confidence * 100).toFixed(0)}%`);
  console.log(`   策略: ${prediction1.strategy}`);
  console.log(`   基于: ${prediction1.basedOn}\n`);

  console.log('2. 添加历史数据');
  const historicalTimes = [25, 28, 22, 30, 27, 24, 26, 29, 23, 25];
  historicalTimes.forEach((time, i) => {
    engine.updateHistory('agent-1', `task-${i}`, time, true, 'code-analysis', 'high');
  });
  console.log(`   已添加 ${historicalTimes.length} 条历史记录\n`);

  console.log('3. 学习后预测（有历史数据）');
  const prediction2 = await engine.predict({
    agentId: 'agent-1',
    taskType: 'code-analysis',
    taskComplexity: 'high'
  });
  console.log(`   预估时间: ${prediction2.estimatedMinutes} 分钟`);
  console.log(`   置信度: ${(prediction2.confidence * 100).toFixed(0)}%`);
  console.log(`   策略: ${prediction2.strategy}`);
  console.log(`   基于: ${prediction2.basedOn}`);
  console.log(`   置信区间: ${prediction2.confidenceInterval[0]} - ${prediction2.confidenceInterval[1]} 分钟\n`);

  console.log('4. 引擎统计');
  const stats = engine.getStats();
  console.log(`   总 Agent 数: ${stats.totalAgents}`);
  console.log(`   总历史记录: ${stats.totalHistories}`);
  console.log(`   跟踪任务类型: ${stats.taskTypesTracked}\n`);

  console.log('5. 不同任务类型预测');
  engine.updateHistory('agent-1', 'task-10', 8, true, 'simple-task', 'low');
  engine.updateHistory('agent-1', 'task-11', 10, true, 'simple-task', 'low');
  engine.updateHistory('agent-1', 'task-12', 9, true, 'simple-task', 'low');

  const simplePrediction = await engine.predict({
    agentId: 'agent-1',
    taskType: 'simple-task',
    taskComplexity: 'low'
  });

  console.log(`   简单任务: ${simplePrediction.estimatedMinutes} 分钟`);
  console.log(`   复杂任务: ${prediction2.estimatedMinutes} 分钟\n`);

  console.log('6. 按任务类型的准确率');
  const accuracyByType = engine.getAccuracyByTaskType();
  accuracyByType.forEach((data, type) => {
    console.log(`   ${type}: ${(data.accuracy * 100).toFixed(1)}% (${data.count} 样本)`);
  });

  console.log('\n=== 演示完成 ===');
}

demo().catch(console.error);
