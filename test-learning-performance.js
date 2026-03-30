/**
 * Performance Test for Agent Learning System
 * Tests scheduling efficiency with learning enabled
 */

const { AgentScheduler } = require('./src/lib/agents/scheduler/core/scheduler.ts');
const { createTask } = require('./src/lib/agents/scheduler/models/task-model.ts');

// Test configuration
const CONFIG = {
  taskCount: 100,
  maxBatchSize: 10,
  enableLearning: true,
  learningThreshold: 5
};

// Metrics tracking
const metrics = {
  scheduleTime: [],
  decisionAccuracy: [],
  totalTasks: 0,
  scheduledTasks: 0,
  failedTasks: 0,
  averageSuccessRate: 0,
  executionTime: null
};

console.log('🚀 Starting Agent Learning System Performance Test\n');
console.log('Configuration:', JSON.stringify(CONFIG, null, 2));

async function runPerformanceTest() {
  const startTime = Date.now();

  // 1. Initialize scheduler
  console.log('\n📋 Step 1: Initializing scheduler...');
  const scheduler = new AgentScheduler({
    autoSchedule: false,
    maxBatchSize: CONFIG.maxBatchSize,
    enableLearning: CONFIG.enableLearning,
    learning: {
      minTasksForLearning: CONFIG.learningThreshold,
      adjustmentFactor: 0.3,
      autoUpdateWeights: true
    }
  });
  scheduler.initialize();

  // 2. Create tasks
  console.log(`\n📦 Step 2: Creating ${CONFIG.taskCount} tasks...`);
  const taskTypes = ['architecture', 'research', 'implementation', 'testing', 'devops', 'design'];
  const priorities = ['low', 'medium', 'high', 'urgent'];

  for (let i = 0; i < CONFIG.taskCount; i++) {
    const task = createTask({
      id: `perf-task-${i}`,
      title: `Performance test task ${i}`,
      type: taskTypes[i % taskTypes.length],
      priority: priorities[i % priorities.length],
      estimatedDuration: Math.floor(Math.random() * 30) + 10,
      requiredCapabilities: [],
      description: `Performance test task ${i}`
    });
    scheduler.addTask(task);
  }

  metrics.totalTasks = CONFIG.taskCount;
  console.log(`✓ Created ${metrics.totalTasks} tasks`);

  // 3. Schedule tasks in batches
  console.log(`\n⚡ Step 3: Scheduling tasks in batches of ${CONFIG.maxBatchSize}...`);
  let batchCount = 0;
  let totalScheduled = 0;

  while (true) {
    const batchStart = Date.now();
    const result = await scheduler.scheduleNextBatch();
    const batchTime = Date.now() - batchStart;

    metrics.scheduleTime.push(batchTime);
    totalScheduled += result.scheduled.length;
    batchCount++;

    console.log(`  Batch ${batchCount}: ${result.scheduled.length} tasks (${batchTime}ms)`);

    if (result.scheduled.length === 0) {
      break;
    }

    // Complete tasks to trigger learning
    result.scheduled.forEach(decision => {
      // 90% success rate
      const success = Math.random() > 0.1;
      if (success) {
        scheduler.completeTask(decision.taskId);
      } else {
        scheduler.failTask(decision.taskId, 'Simulated failure');
      }
    });
  }

  metrics.scheduledTasks = totalScheduled;
  metrics.failedTasks = metrics.totalTasks - metrics.scheduledTasks;
  console.log(`\n✓ Scheduled ${metrics.scheduledTasks}/${metrics.totalTasks} tasks in ${batchCount} batches`);

  // 4. Get learning summary
  console.log('\n📊 Step 4: Collecting learning metrics...');
  const learner = scheduler.getLearner();
  const summary = learner.getSummary();

  console.log(`  Total decisions: ${summary.totalDecisions}`);
  console.log(`  Total agents: ${summary.totalAgents}`);
  console.log(`  Agents with learning data: ${summary.agentsWithLearningData}`);
  console.log(`  Average success rate: ${(summary.averageSuccessRate * 100).toFixed(2)}%`);
  console.log(`  Learning enabled: ${summary.learningEnabled}`);

  // 5. Get weight adjustments
  console.log('\n⚖️  Step 5: Checking weight adjustments...');
  const adjustments = scheduler.getWeightAdjustments();
  console.log(`  Suggested adjustments: ${adjustments.length}`);

  if (adjustments.length > 0) {
    console.log('  Sample adjustments:');
    adjustments.slice(0, 3).forEach(adj => {
      console.log(`    - ${adj.agentId} (${adj.taskType}): ${adj.currentWeight.toFixed(2)} → ${adj.suggestedWeight.toFixed(2)}`);
      console.log(`      Reason: ${adj.reason}`);
      console.log(`      Confidence: ${adj.confidence.toFixed(2)}`);
    });
  }

  // 6. Calculate performance metrics
  metrics.executionTime = Date.now() - startTime;
  metrics.averageSuccessRate = summary.averageSuccessRate;

  const avgScheduleTime = metrics.scheduleTime.reduce((a, b) => a + b, 0) / metrics.scheduleTime.length;
  const maxScheduleTime = Math.max(...metrics.scheduleTime);
  const minScheduleTime = Math.min(...metrics.scheduleTime);

  // 7. Print results
  console.log('\n' + '='.repeat(60));
  console.log('📈 PERFORMANCE RESULTS');
  console.log('='.repeat(60));
  console.log(`\nTotal Execution Time: ${metrics.executionTime}ms`);
  console.log(`Tasks Per Second: ${(metrics.totalTasks / (metrics.executionTime / 1000)).toFixed(2)}`);
  console.log(`\nScheduling Performance:`);
  console.log(`  Total batches: ${batchCount}`);
  console.log(`  Average batch time: ${avgScheduleTime.toFixed(2)}ms`);
  console.log(`  Min batch time: ${minScheduleTime}ms`);
  console.log(`  Max batch time: ${maxScheduleTime}ms`);
  console.log(`\nTask Distribution:`);
  console.log(`  Total tasks: ${metrics.totalTasks}`);
  console.log(`  Scheduled: ${metrics.scheduledTasks} (${((metrics.scheduledTasks / metrics.totalTasks) * 100).toFixed(2)}%)`);
  console.log(`  Failed: ${metrics.failedTasks}`);
  console.log(`\nLearning Effectiveness:`);
  console.log(`  Agents with learning data: ${summary.agentsWithLearningData}/${summary.totalAgents}`);
  console.log(`  Average success rate: ${(metrics.averageSuccessRate * 100).toFixed(2)}%`);
  console.log(`  Weight adjustments generated: ${adjustments.length}`);
  console.log('\n' + '='.repeat(60));

  // 8. Export learning data
  console.log('\n💾 Step 6: Exporting learning data...');
  const learningData = learner.exportData();
  console.log(`✓ Exported ${learningData.length} bytes of learning data`);

  // 9. Conclusion
  console.log('\n✅ Performance Test Complete!');
  console.log('\nSummary:');
  console.log(`  • System handled ${metrics.totalTasks} tasks in ${metrics.executionTime}ms`);
  console.log(`  • Average batch processing time: ${avgScheduleTime.toFixed(2)}ms`);
  console.log(`  • Learning system tracked ${summary.totalDecisions} decisions`);
  console.log(`  • Success rate: ${(metrics.averageSuccessRate * 100).toFixed(2)}%`);
  console.log(`  • Generated ${adjustments.length} weight adjustment suggestions`);

  if (adjustments.length > 0) {
    console.log('\n✓ Learning system is active and generating optimizations!');
  } else {
    console.log('\n⚠️  Learning system active but no weight adjustments yet.');
  }

  scheduler.shutdown();
}

// Run the test
runPerformanceTest().catch(error => {
  console.error('❌ Performance test failed:', error);
  process.exit(1);
});
