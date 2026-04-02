/**
 * AgentScheduler Performance Benchmark Tests
 * Tests scheduler initialization, task operations, and algorithm performance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AgentScheduler, SchedulerConfig } from '@/lib/agent-scheduler/core/scheduler'
import { TaskMatcher } from '@/lib/agent-scheduler/core/matching'
import { TaskRanker } from '@/lib/agent-scheduler/core/ranking'
import { LoadBalancer } from '@/lib/agent-scheduler/core/load-balancer'
import { Task, createTask, TaskPriority } from '@/lib/agent-scheduler/models/task-model'
import { initializeAgents, AgentCapability } from '@/lib/agent-scheduler/models/agent-capability'

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  initialization: 100,
  singleTaskAdd: 5,
  batchAdd100: 50,
  batchAdd500: 250,
  batchAdd1000: 500,
  findCandidates: 10,
  rankCandidates: 50,
  calculateMatchScore: 1,
  scheduleDecision: 50,
  loadBalanceCalc: 10,
  fullScheduleCycle: 200,
}

// Helper to generate random tasks
function generateTasks(count: number, startId: number = 0): Task[] {
  const taskTypes = [
    'architecture',
    'research',
    'implementation',
    'testing',
    'devops',
    'design',
    'marketing',
    'sales',
    'finance',
    'media',
    'general',
  ] as const
  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

  return Array.from({ length: count }, (_, i) => {
    const type = taskTypes[(startId + i) % taskTypes.length]
    const priority = priorities[Math.floor(Math.random() * priorities.length)]

    return createTask({
      id: `perf-task-${startId + i}`,
      type,
      title: `Performance Test Task ${startId + i}`,
      priority,
      estimatedDuration: Math.floor(Math.random() * 60) + 10,
      requiredCapabilities: [],
    })
  })
}

// Performance measurement helper
function measureTime<T>(fn: () => T): { result: T; duration: number } {
  const start = performance.now()
  const result = fn()
  const duration = performance.now() - start
  return { result, duration }
}

// Async performance measurement helper
async function measureTimeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  return { result, duration }
}

describe('AgentScheduler Performance', () => {
  let scheduler: AgentScheduler

  beforeEach(() => {
    scheduler = new AgentScheduler({
      autoSchedule: false, // Disable auto-scheduling for tests
      maxBatchSize: 100,
    })
    scheduler.initialize()
  })

  afterEach(() => {
    scheduler.shutdown()
  })

  // ============================================
  // INITIALIZATION PERFORMANCE
  // ============================================
  describe('Initialization Performance', () => {
    it('should initialize within 100ms', () => {
      const { duration } = measureTime(() => {
        const testScheduler = new AgentScheduler({ autoSchedule: false })
        testScheduler.initialize()
        return testScheduler
      })

      console.log(`✓ Initialization time: ${duration.toFixed(2)}ms`)
      expect(duration).toBeLessThan(THRESHOLDS.initialization)
    })

    it('should reinitialize quickly after reset', () => {
      scheduler.reset()

      const { duration } = measureTime(() => {
        scheduler.initialize()
      })

      console.log(`✓ Reinitialization time: ${duration.toFixed(2)}ms`)
      expect(duration).toBeLessThan(THRESHOLDS.initialization / 2)
    })

    it('should initialize agents map efficiently', () => {
      const { result, duration } = measureTime(() => initializeAgents())

      console.log(`✓ Agents initialization time: ${duration.toFixed(2)}ms`)
      console.log(`  - Agents count: ${result.size}`)
      expect(duration).toBeLessThan(50)
      expect(result.size).toBe(11) // 11 agents in config
    })
  })

  // ============================================
  // TASK ADDITION PERFORMANCE
  // ============================================
  describe('Task Addition Performance', () => {
    it('should add a single task within 5ms', () => {
      const task = generateTasks(1)[0]

      const { duration } = measureTime(() => {
        scheduler.addTask(task)
      })

      console.log(`✓ Single task add time: ${duration.toFixed(2)}ms`)
      expect(duration).toBeLessThan(THRESHOLDS.singleTaskAdd)
    })

    it('should add 100 tasks within 50ms', () => {
      const tasks = generateTasks(100)

      const { duration } = measureTime(() => {
        tasks.forEach(task => scheduler.addTask(task))
      })

      const avgTime = duration / 100
      console.log(`✓ 100 tasks add time: ${duration.toFixed(2)}ms`)
      console.log(`  - Average per task: ${avgTime.toFixed(3)}ms`)
      expect(duration).toBeLessThan(THRESHOLDS.batchAdd100)
    })

    it('should add 500 tasks within 250ms', () => {
      const tasks = generateTasks(500)

      const { duration } = measureTime(() => {
        tasks.forEach(task => scheduler.addTask(task))
      })

      const avgTime = duration / 500
      console.log(`✓ 500 tasks add time: ${duration.toFixed(2)}ms`)
      console.log(`  - Average per task: ${avgTime.toFixed(3)}ms`)
      expect(duration).toBeLessThan(THRESHOLDS.batchAdd500)
    })

    it('should add 1000 tasks within 500ms', () => {
      const tasks = generateTasks(1000)

      const { duration } = measureTime(() => {
        tasks.forEach(task => scheduler.addTask(task))
      })

      const avgTime = duration / 1000
      console.log(`✓ 1000 tasks add time: ${duration.toFixed(2)}ms`)
      console.log(`  - Average per task: ${avgTime.toFixed(3)}ms`)
      expect(duration).toBeLessThan(THRESHOLDS.batchAdd1000)
    })

    it('should handle batch task addition efficiently', () => {
      const tasks = generateTasks(100)

      // Individual adds
      const individualStart = performance.now()
      tasks.forEach(task => scheduler.addTask(task))
      const individualTime = performance.now() - individualStart

      scheduler.clearTasks()

      // Batch add
      const batchStart = performance.now()
      scheduler.addTasks(tasks)
      const batchTime = performance.now() - batchStart

      console.log(`✓ Individual add: ${individualTime.toFixed(2)}ms`)
      console.log(`✓ Batch add: ${batchTime.toFixed(2)}ms`)

      // Batch should be similar or faster
      expect(batchTime).toBeLessThanOrEqual(individualTime * 1.1)
    })
  })

  // ============================================
  // MATCHING ALGORITHM PERFORMANCE
  // ============================================
  describe('Matching Algorithm Performance', () => {
    let taskMatcher: TaskMatcher
    let agents: Map<string, AgentCapability>

    beforeEach(() => {
      taskMatcher = new TaskMatcher()
      agents = initializeAgents()
    })

    it('should find candidates within 10ms per task', () => {
      const task = generateTasks(1)[0]

      const { result, duration } = measureTime(() => {
        return taskMatcher.findCandidates(task, agents)
      })

      console.log(`✓ Find candidates time: ${duration.toFixed(2)}ms`)
      console.log(`  - Candidates found: ${result.length}`)
      expect(duration).toBeLessThan(THRESHOLDS.findCandidates)
    })

    it('should find candidates for 100 tasks efficiently', () => {
      const tasks = generateTasks(100)
      let totalTime = 0

      for (const task of tasks) {
        const { duration } = measureTime(() => {
          taskMatcher.findCandidates(task, agents)
        })
        totalTime += duration
      }

      const avgTime = totalTime / 100
      console.log(`✓ 100 tasks candidate search time: ${totalTime.toFixed(2)}ms`)
      console.log(`  - Average per task: ${avgTime.toFixed(3)}ms`)
      expect(avgTime).toBeLessThan(THRESHOLDS.findCandidates)
    })

    it('should calculate match score within 1ms', () => {
      const task = generateTasks(1)[0]
      const agent = Array.from(agents.values())[0]

      const { duration } = measureTime(() => {
        return taskMatcher.calculateMatchScore(agent, task)
      })

      console.log(`✓ Match score calculation: ${duration.toFixed(3)}ms`)
      expect(duration).toBeLessThan(THRESHOLDS.calculateMatchScore)
    })

    it('should rank candidates within 50ms', () => {
      const task = generateTasks(1)[0]
      const candidates = taskMatcher.findCandidates(task, agents)

      const { duration } = measureTime(() => {
        return taskMatcher.rankCandidates(task, candidates)
      })

      console.log(`✓ Rank candidates time: ${duration.toFixed(2)}ms`)
      console.log(`  - Candidates ranked: ${candidates.length}`)
      expect(duration).toBeLessThan(THRESHOLDS.rankCandidates)
    })

    it('should find best candidate within 15ms', () => {
      const task = generateTasks(1)[0]

      const { result, duration } = measureTime(() => {
        return taskMatcher.findBestCandidate(task, agents)
      })

      console.log(`✓ Find best candidate time: ${duration.toFixed(2)}ms`)
      if (result) {
        console.log(
          `  - Best: ${result.agentName} (${(result.confidence * 100).toFixed(1)}% confidence)`
        )
      }
      expect(duration).toBeLessThan(15)
    })

    it('should handle repeated matching efficiently', () => {
      const tasks = generateTasks(50)
      const durations: number[] = []

      for (const task of tasks) {
        const { duration } = measureTime(() => {
          return taskMatcher.findBestCandidate(task, agents)
        })
        durations.push(duration)
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
      const maxDuration = Math.max(...durations)
      const p95Duration = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)]

      console.log(`✓ Repeated matching stats:`)
      console.log(`  - Average: ${avgDuration.toFixed(3)}ms`)
      console.log(`  - Max: ${maxDuration.toFixed(3)}ms`)
      console.log(`  - P95: ${p95Duration.toFixed(3)}ms`)
      expect(avgDuration).toBeLessThan(THRESHOLDS.findCandidates)
    })
  })

  // ============================================
  // LOAD BALANCING PERFORMANCE
  // ============================================
  describe('Load Balancing Performance', () => {
    let loadBalancer: LoadBalancer
    let agents: Map<string, AgentCapability>

    beforeEach(() => {
      loadBalancer = new LoadBalancer()
      agents = initializeAgents()
    })

    it('should calculate load within 10ms', () => {
      const task = generateTasks(1)[0]

      const { duration } = measureTime(() => {
        return loadBalancer.balanceLoad(agents, task)
      })

      console.log(`✓ Load balance calculation: ${duration.toFixed(2)}ms`)
      expect(duration).toBeLessThan(THRESHOLDS.loadBalanceCalc)
    })

    it('should get load stats efficiently', () => {
      const { result, duration } = measureTime(() => {
        return loadBalancer.getLoadStats(agents)
      })

      console.log(`✓ Get load stats time: ${duration.toFixed(2)}ms`)
      console.log(`  - Average load: ${result.averageLoad.toFixed(1)}%`)
      console.log(`  - Min/Max: ${result.minLoad.toFixed(1)}% / ${result.maxLoad.toFixed(1)}%`)
      expect(duration).toBeLessThan(5)
    })

    it('should suggest scaling efficiently', () => {
      const { result, duration } = measureTime(() => {
        return loadBalancer.suggestScaling(agents)
      })

      console.log(`✓ Scaling suggestion time: ${duration.toFixed(2)}ms`)
      console.log(`  - Action: ${result.action}`)
      console.log(`  - Reason: ${result.reason}`)
      expect(duration).toBeLessThan(5)
    })

    it('should handle load updates efficiently', () => {
      // Simulate load updates
      const task = generateTasks(1)[0]
      const agentIds = Array.from(agents.keys())

      const { duration } = measureTime(() => {
        agentIds.forEach(agentId => {
          loadBalancer.recordTaskCompletion(agentId, Math.random() > 0.1)
        })
      })

      console.log(`✓ Load updates for ${agentIds.length} agents: ${duration.toFixed(2)}ms`)
      expect(duration).toBeLessThan(5)
    })
  })

  // ============================================
  // SCHEDULING DECISION PERFORMANCE
  // ============================================
  describe('Scheduling Decision Performance', () => {
    it('should make a single scheduling decision within 50ms', async () => {
      const task = generateTasks(1)[0]
      scheduler.addTask(task)

      const { result, duration } = await measureTimeAsync(async () => {
        return scheduler.scheduleTask(task.id)
      })

      console.log(`✓ Single schedule decision time: ${duration.toFixed(2)}ms`)
      if (result) {
        console.log(`  - Assigned to: ${result.assignedAgent}`)
        console.log(`  - Confidence: ${(result.confidence * 100).toFixed(1)}%`)
      }
      expect(duration).toBeLessThan(THRESHOLDS.scheduleDecision)
    })

    it('should schedule batch of 100 tasks efficiently', async () => {
      const tasks = generateTasks(100)
      tasks.forEach(task => scheduler.addTask(task))

      const { result, duration } = await measureTimeAsync(async () => {
        return scheduler.scheduleNextBatch()
      })

      const avgTime = result.scheduled.length > 0 ? duration / result.scheduled.length : 0
      console.log(`✓ Batch schedule (100 tasks) time: ${duration.toFixed(2)}ms`)
      console.log(`  - Scheduled: ${result.scheduled.length}`)
      console.log(`  - Failed: ${result.failed.length}`)
      console.log(`  - Average per task: ${avgTime.toFixed(2)}ms`)
      expect(duration).toBeLessThan(THRESHOLDS.fullScheduleCycle * 2)
    })

    it('should handle full scheduling cycle efficiently', async () => {
      // Add mixed priority tasks
      const urgentTasks = generateTasks(10).map(t => ({ ...t, priority: 'urgent' as TaskPriority }))
      const highTasks = generateTasks(20).map(t => ({
        ...t,
        priority: 'high' as TaskPriority,
        id: `high-${t.id}`,
      }))
      const normalTasks = generateTasks(70).map(t => ({
        ...t,
        priority: 'medium' as TaskPriority,
        id: `medium-${t.id}`,
      }))

      ;[...urgentTasks, ...highTasks, ...normalTasks].forEach(task => scheduler.addTask(task))

      const { duration } = await measureTimeAsync(async () => {
        await scheduler.scheduleNextBatch()
      })

      console.log(`✓ Full scheduling cycle time: ${duration.toFixed(2)}ms`)
      expect(duration).toBeLessThan(THRESHOLDS.fullScheduleCycle)
    })
  })

  // ============================================
  // TASK RANKING PERFORMANCE
  // ============================================
  describe('Task Ranking Performance', () => {
    let taskRanker: TaskRanker

    beforeEach(() => {
      taskRanker = new TaskRanker()
    })

    it('should rank 100 tasks within 20ms', () => {
      const tasks = generateTasks(100)

      const { result, duration } = measureTime(() => {
        return taskRanker.rankTasks(tasks)
      })

      console.log(`✓ Rank 100 tasks time: ${duration.toFixed(2)}ms`)
      console.log(`  - Top task score: ${result[0]?.score.toFixed(2)}`)
      expect(duration).toBeLessThan(20)
    })

    it('should rank 1000 tasks within 100ms', () => {
      const tasks = generateTasks(1000)

      const { duration } = measureTime(() => {
        taskRanker.rankTasks(tasks)
      })

      console.log(`✓ Rank 1000 tasks time: ${duration.toFixed(2)}ms`)
      expect(duration).toBeLessThan(100)
    })

    it('should get top tasks efficiently', () => {
      const tasks = generateTasks(100)

      const { duration } = measureTime(() => {
        return taskRanker.getTopTasks(tasks, 10)
      })

      console.log(`✓ Get top 10 from 100 tasks: ${duration.toFixed(2)}ms`)
      expect(duration).toBeLessThan(10)
    })

    it('should get task stats efficiently', () => {
      const tasks = generateTasks(1000)

      const { result, duration } = measureTime(() => {
        return taskRanker.getTaskStats(tasks)
      })

      console.log(`✓ Get stats for 1000 tasks: ${duration.toFixed(2)}ms`)
      console.log(`  - Total: ${result.total}`)
      console.log(`  - Overdue: ${result.overdue}`)
      expect(duration).toBeLessThan(20)
    })
  })

  // ============================================
  // CONCURRENT OPERATIONS PERFORMANCE
  // ============================================
  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent task additions', async () => {
      const batchSize = 100
      const batches = 5

      const addBatch = async (batchId: number) => {
        const tasks = generateTasks(batchSize, batchId * batchSize)
        tasks.forEach(task => scheduler.addTask(task))
        return tasks.length
      }

      const { duration } = await measureTimeAsync(async () => {
        await Promise.all([addBatch(0), addBatch(1), addBatch(2), addBatch(3), addBatch(4)])
      })

      const stats = scheduler.getTaskStats()
      console.log(`✓ Concurrent ${batches}x${batchSize} task additions: ${duration.toFixed(2)}ms`)
      console.log(`  - Total tasks added: ${stats.total}`)
      expect(duration).toBeLessThan(THRESHOLDS.batchAdd100 * 2)
    })

    it('should handle concurrent scheduling decisions', async () => {
      // Add tasks first
      const tasks = generateTasks(50)
      tasks.forEach(task => scheduler.addTask(task))

      // Schedule in parallel
      const { result, duration } = await measureTimeAsync(async () => {
        return scheduler.scheduleNextBatch()
      })

      console.log(`✓ Concurrent scheduling of 50 tasks: ${duration.toFixed(2)}ms`)
      console.log(`  - Scheduled: ${result.scheduled.length}`)
      expect(duration).toBeLessThan(THRESHOLDS.fullScheduleCycle)
    })

    it('should maintain performance under load', async () => {
      const iterations = 10
      const tasksPerIteration = 100
      const durations: number[] = []

      for (let i = 0; i < iterations; i++) {
        scheduler.clearTasks()

        const { duration } = measureTime(() => {
          const tasks = generateTasks(tasksPerIteration, i * tasksPerIteration)
          tasks.forEach(task => scheduler.addTask(task))
        })

        durations.push(duration)
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
      const maxDuration = Math.max(...durations)
      const minDuration = Math.min(...durations)

      console.log(`✓ Sustained load test (${iterations} iterations):`)
      console.log(`  - Average: ${avgDuration.toFixed(2)}ms`)
      console.log(`  - Min/Max: ${minDuration.toFixed(2)}ms / ${maxDuration.toFixed(2)}ms`)

      // Performance should not degrade significantly
      expect(maxDuration).toBeLessThan(THRESHOLDS.batchAdd100 * 2)
    })
  })

  // ============================================
  // MEMORY AND RESOURCE PERFORMANCE
  // ============================================
  describe('Memory and Resource Performance', () => {
    it('should not leak memory with task churn', () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Add and remove tasks repeatedly
      for (let i = 0; i < 100; i++) {
        const tasks = generateTasks(10, i * 10)
        tasks.forEach(task => scheduler.addTask(task))
        scheduler.clearTasks()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      console.log(`✓ Memory churn test:`)
      console.log(`  - Initial heap: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`)
      console.log(`  - Final heap: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`)
      console.log(`  - Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)

      // Memory should not grow significantly (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })

    it('should handle export efficiently', () => {
      const tasks = generateTasks(1000)
      tasks.forEach(task => scheduler.addTask(task))

      const { duration } = measureTime(() => {
        return scheduler.export()
      })

      console.log(`✓ Export 1000 tasks: ${duration.toFixed(2)}ms`)
      expect(duration).toBeLessThan(100)
    })

    it('should handle reset efficiently', () => {
      const tasks = generateTasks(1000)
      tasks.forEach(task => scheduler.addTask(task))

      const { duration } = measureTime(() => {
        scheduler.reset()
      })

      console.log(`✓ Reset with 1000 tasks: ${duration.toFixed(2)}ms`)
      expect(duration).toBeLessThan(50)
    })
  })

  // ============================================
  // STRESS TESTS
  // ============================================
  describe('Stress Tests', () => {
    it('should handle 1000 concurrent tasks', async () => {
      const tasks = generateTasks(1000)
      tasks.forEach(task => scheduler.addTask(task))

      const stats = scheduler.getTaskStats()
      expect(stats.total).toBe(1000)

      const { result, duration } = await measureTimeAsync(async () => {
        return scheduler.scheduleNextBatch()
      })

      console.log(`✓ 1000 tasks handling:`)
      console.log(`  - Schedule time: ${duration.toFixed(2)}ms`)
      console.log(`  - Scheduled: ${result.scheduled.length}`)
      console.log(`  - Stats: ${JSON.stringify(result.stats)}`)

      expect(duration).toBeLessThan(500)
    })

    it('should handle rapid task operations', () => {
      const operations = 500

      const { duration } = measureTime(() => {
        for (let i = 0; i < operations; i++) {
          const task = generateTasks(1, i)[0]
          scheduler.addTask(task)

          if (i % 100 === 0) {
            scheduler.getTaskStats()
          }

          if (i % 200 === 0) {
            scheduler.getMetrics()
          }
        }
      })

      console.log(`✓ Rapid operations (${operations} ops): ${duration.toFixed(2)}ms`)
      console.log(`  - Avg per operation: ${(duration / operations).toFixed(3)}ms`)
      expect(duration).toBeLessThan(1000)
    })

    it('should handle mixed workload efficiently', async () => {
      // Mixed workload: add, schedule, query
      const tasks = generateTasks(200)

      const { duration } = await measureTimeAsync(async () => {
        // Add tasks
        tasks.forEach(task => scheduler.addTask(task))

        // Schedule
        await scheduler.scheduleNextBatch()

        // Query various stats
        scheduler.getTaskStats()
        scheduler.getMetrics()
        scheduler.getLoadStats()
        scheduler.getRecentDecisions(10)
        scheduler.getScalingSuggestion()

        // More operations
        await scheduler.scheduleNextBatch()
      })

      console.log(`✓ Mixed workload time: ${duration.toFixed(2)}ms`)
      expect(duration).toBeLessThan(500)
    })
  })
})

// ============================================
// PERFORMANCE BENCHMARK SUITE
// ============================================
describe('Performance Benchmark Suite', () => {
  it('should generate benchmark report', () => {
    console.log('\n📊 ========================================')
    console.log('📊 AgentScheduler Performance Benchmarks')
    console.log('📊 ========================================\n')

    const results: { name: string; target: number; actual: number }[] = []

    // Test initialization
    const initStart = performance.now()
    const testScheduler = new AgentScheduler({ autoSchedule: false })
    testScheduler.initialize()
    const initTime = performance.now() - initStart
    results.push({ name: 'Initialization', target: THRESHOLDS.initialization, actual: initTime })

    // Test task addition
    const tasks = generateTasks(1000)
    const addStart = performance.now()
    tasks.forEach(task => testScheduler.addTask(task))
    const addTime = performance.now() - addStart
    results.push({ name: 'Add 1000 tasks', target: THRESHOLDS.batchAdd1000, actual: addTime })

    // Test matching
    const taskMatcher = new TaskMatcher()
    const agents = initializeAgents()
    const task = tasks[0]
    const matchStart = performance.now()
    taskMatcher.findBestCandidate(task, agents)
    const matchTime = performance.now() - matchStart
    results.push({
      name: 'Find best candidate',
      target: THRESHOLDS.findCandidates,
      actual: matchTime,
    })

    // Test scheduling
    const scheduleStart = performance.now()
    testScheduler.scheduleNextBatch()
    const scheduleTime = performance.now() - scheduleStart
    results.push({
      name: 'Schedule batch',
      target: THRESHOLDS.fullScheduleCycle,
      actual: scheduleTime,
    })

    // Test load balance
    const loadBalancer = new LoadBalancer()
    const loadStart = performance.now()
    loadBalancer.getLoadStats(agents)
    const loadTime = performance.now() - loadStart
    results.push({ name: 'Load stats', target: THRESHOLDS.loadBalanceCalc, actual: loadTime })

    // Print results
    console.log('📊 Benchmark Results:')
    console.log('┌─────────────────────────┬──────────┬──────────┬────────┐')
    console.log('│ Test                    │ Target   │ Actual   │ Status │')
    console.log('├─────────────────────────┼──────────┼──────────┼────────┤')

    results.forEach(({ name, target, actual }) => {
      const status = actual <= target ? '✅ PASS' : '❌ FAIL'
      const namePad = name.padEnd(23)
      const targetPad = `${target.toFixed(0)}ms`.padStart(8)
      const actualPad = `${actual.toFixed(2)}ms`.padStart(8)
      console.log(`│ ${namePad} │ ${targetPad} │ ${actualPad} │ ${status} │`)
    })

    console.log('└─────────────────────────┴──────────┴──────────┴────────┘\n')

    // All tests should pass
    results.forEach(({ name, target, actual }) => {
      expect(actual).toBeLessThan(target)
    })

    testScheduler.shutdown()
  })
})
