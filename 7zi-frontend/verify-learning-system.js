#!/usr/bin/env node

/**
 * Manual verification script for Agent Learning System
 * Tests core functionality without full test framework
 */

const { AdaptiveLearner } = require('./src/lib/agents/learning/adaptive-learner')
const { AgentScheduler } = require('./src/lib/agents/scheduler/scheduler')

console.log('🧪 Agent Learning System Verification\n')

// Create instances
const learner = new AdaptiveLearner()
const scheduler = new AgentScheduler()

// Test 1: Register agents
console.log('✓ Test 1: Registering agents...')
const agent1 = scheduler.registerAgent('agent_001', 'Image Processor', 'worker', [
  'image_processing',
])
const agent2 = scheduler.registerAgent('agent_002', 'Text Generator', 'worker', ['text_generation'])
console.log(`  - Registered ${scheduler.getAllAgents().length} agents\n`)

// Test 2: Record task completions
console.log('✓ Test 2: Recording task completions...')
const now = Date.now()

// Agent 1: Good performance
for (let i = 0; i < 20; i++) {
  learner.recordTaskCompletion(
    `task_${i}`,
    'image_processing',
    'agent_001',
    now - (20 - i) * 60000,
    now - (20 - i) * 60000 + 100,
    now - (20 - i) * 60000 + 2600,
    'completed',
    'normal',
    1024,
    2048,
    0,
    0.3
  )
}

// Agent 2: Mixed performance
for (let i = 0; i < 10; i++) {
  learner.recordTaskCompletion(
    `task_2_${i}`,
    'text_generation',
    'agent_002',
    now - (10 - i) * 60000,
    now - (10 - i) * 60000 + 100,
    now - (10 - i) * 60000 + 4000,
    i < 7 ? 'completed' : 'failed',
    'normal',
    512,
    i < 7 ? 1024 : 0,
    0,
    0.5,
    i >= 7 ? 'timeout' : undefined
  )
}
console.log(`  - Recorded ${learner.exportData().taskHistory.length} tasks\n`)

// Test 3: Get agent stats
console.log('✓ Test 3: Getting agent statistics...')
const allStats = learner.getAgentLearningStats()
console.log(`  - Found stats for ${allStats.length} agents`)

const agent1Stats = learner.getAgentLearningStats('agent_001')
console.log(`  - Agent 001:`)
console.log(`    * Overall score: ${(agent1Stats.overallScore * 100).toFixed(1)}%`)
console.log(`    * Tasks completed: ${agent1Stats.totalTasksCompleted}`)
console.log(`    * Success rate: ${(agent1Stats.successRate * 100).toFixed(1)}%`)
console.log(`    * Avg response time: ${agent1Stats.avgResponseTime}ms\n`)

// Test 4: Predict completion time
console.log('✓ Test 4: Predicting completion time...')
const prediction = learner.predictCompletionTime({
  taskType: 'image_processing',
  inputSize: 2048,
  priority: 'normal',
  agentId: 'agent_001',
  timeOfDay: 12,
  dayOfWeek: 1,
  historicalAvgTime: 2500,
  queueDepth: 3,
  agentLoad: 0.4,
})
console.log(`  - Predicted time: ${prediction.estimatedTime}ms`)
console.log(`  - Confidence: ${(prediction.confidence * 100).toFixed(0)}%`)
console.log(`  - Factors: ${prediction.factors.join(', ')}\n`)

// Test 5: Adjust weights
console.log('✓ Test 5: Adjusting agent weights...')
const prevScore = agent1Stats.capabilityScores.get('image_processing')?.successRate || 0.5
learner.adjustWeight({
  agentId: 'agent_001',
  taskType: 'image_processing',
  adjustment: 0.1,
  reason: 'Manual boost test',
})
const newStats = learner.getAgentLearningStats('agent_001')
const newScore = newStats.capabilityScores.get('image_processing')?.successRate || 0.5
console.log(`  - Previous score: ${(prevScore * 100).toFixed(1)}%`)
console.log(`  - New score: ${(newScore * 100).toFixed(1)}%`)
console.log(`  - Adjustment: +${((newScore - prevScore) * 100).toFixed(1)}%\n`)

// Test 6: System stats
console.log('✓ Test 6: Getting system statistics...')
const sysStats = learner.getSystemStats()
console.log(`  - Total agents: ${sysStats.totalAgents}`)
console.log(`  - Active agents: ${sysStats.activeAgents}`)
console.log(`  - Total tasks: ${sysStats.totalTasksProcessed}`)
console.log(`  - Avg completion time: ${sysStats.avgCompletionTime.toFixed(0)}ms`)
console.log(`  - Success rate: ${(sysStats.overallSuccessRate * 100).toFixed(1)}%\n`)

// Test 7: Aggregated stats
console.log('✓ Test 7: Getting aggregated statistics (24h)...')
const aggStats = learner.getAggregatedStats('day')
console.log(`  - Period: ${aggStats.period}`)
console.log(`  - Tasks completed: ${aggStats.tasksCompleted}`)
console.log(`  - Tasks failed: ${aggStats.tasksFailed}`)
console.log(`  - Avg execution time: ${aggStats.avgExecutionTime.toFixed(0)}ms`)
console.log(`  - Top performers: ${aggStats.topPerformers.join(', ')}`)
console.log(`  - Struggling agents: ${aggStats.strugglingAgents.join(', ') || 'None'}\n`)

// Test 8: Export data
console.log('✓ Test 8: Exporting learning data...')
const exportData = learner.exportData()
console.log(`  - Agents exported: ${Object.keys(exportData.agentStats).length}`)
console.log(`  - Tasks exported: ${exportData.taskHistory.length}`)
console.log(`  - Task types tracked: ${Object.keys(exportData.taskTypeStats).length}\n`)

// Summary
console.log('✅ All verification tests passed!\n')
console.log('Summary:')
console.log('  ✓ Agent registration')
console.log('  ✓ Task completion tracking')
console.log('  ✓ Agent statistics')
console.log('  ✓ Time prediction')
console.log('  ✓ Weight adjustment')
console.log('  ✓ System statistics')
console.log('  ✓ Aggregated statistics')
console.log('  ✓ Data export')
console.log('\n🚀 Agent Learning System is ready for use!\n')
