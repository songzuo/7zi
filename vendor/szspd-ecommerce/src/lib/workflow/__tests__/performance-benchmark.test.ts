/**
 * 工作流引擎性能基准测试
 * v1.11 - 测试并行执行、缓存、批量操作的性能提升
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EnhancedWorkflowExecutor } from '../executor'
import { OptimizedWorkflowExecutor } from '../executor-optimized'
import { BatchWorkflowExecutor } from '../executor-batch'
import { WorkflowDefinition, NodeType, WorkflowStatus, EdgeType, NodeStatus } from '@/types/workflow'

/**
 * 创建测试工作流
 */
function createTestWorkflow(nodeCount: number, parallel: boolean = false): WorkflowDefinition {
  const nodes = []
  const edges = []

  // 创建开始节点
  nodes.push({
    id: 'start',
    type: NodeType.START,
    name: 'Start',
    position: { x: 100, y: 100 },
  })

  // 创建中间节点
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `node_${i}`,
      type: NodeType.AGENT,
      name: `Node ${i}`,
      position: { x: 200 + i * 150, y: 100 },
      agentConfig: {
        agentId: `agent_${i}`,
        agentType: 'test',
        prompt: `Test prompt ${i}`,
      },
    })
  }

  // 创建结束节点
  nodes.push({
    id: 'end',
    type: NodeType.END,
    name: 'End',
    position: { x: 200 + nodeCount * 150, y: 100 },
  })

  // 创建边
  if (parallel) {
    // 并行结构：start -> 所有节点 -> end
    for (let i = 0; i < nodeCount; i++) {
      edges.push({
        id: `edge_start_${i}`,
        source: 'start',
        target: `node_${i}`,
        type: EdgeType.PARALLEL,
      })
      edges.push({
        id: `edge_${i}_end`,
        source: `node_${i}`,
        target: 'end',
        type: EdgeType.SEQUENCE,
      })
    }
  } else {
    // 顺序结构：start -> node_0 -> node_1 -> ... -> end
    edges.push({
      id: 'edge_start_0',
      source: 'start',
      target: 'node_0',
      type: EdgeType.SEQUENCE,
    })

    for (let i = 0; i < nodeCount - 1; i++) {
      edges.push({
        id: `edge_${i}_${i + 1}`,
        source: `node_${i}`,
        target: `node_${i + 1}`,
        type: EdgeType.SEQUENCE,
      })
    }

    edges.push({
      id: `edge_${nodeCount - 1}_end`,
      source: `node_${nodeCount - 1}`,
      target: 'end',
      type: EdgeType.SEQUENCE,
    })
  }

  return {
    id: `test_workflow_${nodeCount}`,
    name: `Test Workflow ${nodeCount}`,
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes,
    edges,
    config: {
      variables: {},
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test',
      updatedBy: 'test',
    },
  }
}

/**
 * 性能测试结果
 */
interface BenchmarkResult {
  name: string
  duration: number
  nodeCount: number
  parallel: boolean
  cacheHits: number
  cacheMisses: number
  parallelExecutions: number
}

describe('Workflow Engine Performance Benchmark', () => {
  let originalExecutor: EnhancedWorkflowExecutor
  let optimizedExecutor: OptimizedWorkflowExecutor
  let batchExecutor: BatchWorkflowExecutor

  beforeAll(() => {
    originalExecutor = new EnhancedWorkflowExecutor()
    optimizedExecutor = new OptimizedWorkflowExecutor()
    batchExecutor = new BatchWorkflowExecutor(optimizedExecutor)
  })

  afterAll(() => {
    // 清理
  })

  describe('Sequential Execution Performance', () => {
    it('should execute 10 nodes sequentially', async () => {
      const workflow = createTestWorkflow(10, false)
      originalExecutor.registerWorkflow(workflow)

      const instance = originalExecutor.createInstance(workflow.id, { test: 'data' })
      const startTime = Date.now()

      await originalExecutor.executeInstance(instance.id)

      const duration = Date.now() - startTime

      expect(instance.status).toBe('completed')
      expect(duration).toBeGreaterThan(0)

      console.log(`Sequential 10 nodes: ${duration}ms`)
    })

    it('should execute 50 nodes sequentially', async () => {
      const workflow = createTestWorkflow(50, false)
      originalExecutor.registerWorkflow(workflow)

      const instance = originalExecutor.createInstance(workflow.id, { test: 'data' })
      const startTime = Date.now()

      await originalExecutor.executeInstance(instance.id)

      const duration = Date.now() - startTime

      expect(instance.status).toBe('completed')
      expect(duration).toBeGreaterThan(0)

      console.log(`Sequential 50 nodes: ${duration}ms`)
    })
  })

  describe('Parallel Execution Performance', () => {
    it('should execute 10 nodes in parallel', async () => {
      const workflow = createTestWorkflow(10, true)
      optimizedExecutor.registerWorkflow(workflow)

      const instance = optimizedExecutor.createInstance(workflow.id, { test: 'data' })
      const startTime = Date.now()

      await optimizedExecutor.executeInstance(instance.id)

      const duration = Date.now() - startTime
      const metrics = optimizedExecutor.getPerformanceMetrics()

      expect(instance.status).toBe('completed')
      expect(duration).toBeGreaterThan(0)
      expect(metrics.parallelExecutions).toBeGreaterThan(0)

      console.log(`Parallel 10 nodes: ${duration}ms, parallel executions: ${metrics.parallelExecutions}`)
    })

    it('should execute 50 nodes in parallel', async () => {
      const workflow = createTestWorkflow(50, true)
      optimizedExecutor.registerWorkflow(workflow)

      const instance = optimizedExecutor.createInstance(workflow.id, { test: 'data' })
      const startTime = Date.now()

      await optimizedExecutor.executeInstance(instance.id)

      const duration = Date.now() - startTime
      const metrics = optimizedExecutor.getPerformanceMetrics()

      expect(instance.status).toBe('completed')
      expect(duration).toBeGreaterThan(0)
      expect(metrics.parallelExecutions).toBeGreaterThan(0)

      console.log(`Parallel 50 nodes: ${duration}ms, parallel executions: ${metrics.parallelExecutions}`)
    })
  })

  describe('Cache Performance', () => {
    it('should benefit from cache on repeated executions', async () => {
      const workflow = createTestWorkflow(10, false)
      optimizedExecutor.registerWorkflow(workflow)

      // 第一次执行（缓存未命中）
      const instance1 = optimizedExecutor.createInstance(workflow.id, { test: 'data' })
      await optimizedExecutor.executeInstance(instance1.id)

      const metrics1 = optimizedExecutor.getPerformanceMetrics()
      const cacheStats1 = optimizedExecutor.getCacheStats()

      // 第二次执行（缓存命中）
      const instance2 = optimizedExecutor.createInstance(workflow.id, { test: 'data' })
      await optimizedExecutor.executeInstance(instance2.id)

      const metrics2 = optimizedExecutor.getPerformanceMetrics()
      const cacheStats2 = optimizedExecutor.getCacheStats()

      expect(cacheStats2.hits).toBeGreaterThan(cacheStats1.hits)
      expect(cacheStats2.hitRate).toBeGreaterThan(0)

      console.log(
        `Cache hit rate: ${(cacheStats2.hitRate * 100).toFixed(2)}%, hits: ${cacheStats2.hits}, misses: ${cacheStats2.misses}`
      )
    })
  })

  describe('Batch Execution Performance', () => {
    it('should execute multiple instances in batch', async () => {
      const workflow = createTestWorkflow(5, false)
      optimizedExecutor.registerWorkflow(workflow)

      const inputs = Array.from({ length: 10 }, (_, i) => ({ test: `data_${i}` }))

      const startTime = Date.now()

      const result = await batchExecutor.executeBatch({
        workflowId: workflow.id,
        inputs,
        options: {
          triggeredBy: 'test',
          triggerType: 'manual',
          parallel: true,
          maxConcurrency: 5,
        },
      })

      const duration = Date.now() - startTime

      expect(result.total).toBe(10)
      expect(result.completed).toBeGreaterThan(0)
      expect(duration).toBeGreaterThan(0)

      console.log(
        `Batch execution: ${result.total} instances, ${result.completed} completed, ${result.failed} failed, ${duration}ms`
      )
    })

    it('should execute batch with sequential mode', async () => {
      const workflow = createTestWorkflow(5, false)
      optimizedExecutor.registerWorkflow(workflow)

      const inputs = Array.from({ length: 10 }, (_, i) => ({ test: `data_${i}` }))

      const startTime = Date.now()

      const result = await batchExecutor.executeBatch({
        workflowId: workflow.id,
        inputs,
        options: {
          triggeredBy: 'test',
          triggerType: 'manual',
          parallel: false,
        },
      })

      const duration = Date.now() - startTime

      expect(result.total).toBe(10)
      expect(result.completed).toBeGreaterThan(0)
      expect(duration).toBeGreaterThan(0)

      console.log(
        `Sequential batch: ${result.total} instances, ${result.completed} completed, ${result.failed} failed, ${duration}ms`
      )
    })
  })

  describe('Performance Comparison', () => {
    it('should compare sequential vs parallel execution', async () => {
      const nodeCount = 20

      // 顺序执行
      const sequentialWorkflow = createTestWorkflow(nodeCount, false)
      originalExecutor.registerWorkflow(sequentialWorkflow)

      const sequentialInstance = originalExecutor.createInstance(sequentialWorkflow.id, {
        test: 'data',
      })
      const sequentialStart = Date.now()
      await originalExecutor.executeInstance(sequentialInstance.id)
      const sequentialDuration = Date.now() - sequentialStart

      // 并行执行
      const parallelWorkflow = createTestWorkflow(nodeCount, true)
      optimizedExecutor.registerWorkflow(parallelWorkflow)

      const parallelInstance = optimizedExecutor.createInstance(parallelWorkflow.id, {
        test: 'data',
      })
      const parallelStart = Date.now()
      await optimizedExecutor.executeInstance(parallelInstance.id)
      const parallelDuration = Date.now() - parallelStart

      const speedup = sequentialDuration / parallelDuration

      console.log(
        `Performance comparison: Sequential ${sequentialDuration}ms vs Parallel ${parallelDuration}ms, Speedup: ${speedup.toFixed(2)}x`
      )

      expect(speedup).toBeGreaterThan(1)
    })
  })

  describe('Incremental State Updates', () => {
    it('should track incremental state updates', async () => {
      const workflow = createTestWorkflow(5, false)
      optimizedExecutor.registerWorkflow(workflow)

      const instance = optimizedExecutor.createInstance(workflow.id, { test: 'data' })

      // 添加状态变更监听器
      const stateChanges: any[] = []
      batchExecutor.addStateChangeListener(event => {
        stateChanges.push(event)
      })

      // 手动记录一些增量更新（模拟执行过程中的状态变化）
      batchExecutor.recordIncrementalUpdate(instance.id, 'node_0', {
        status: NodeStatus.RUNNING,
      })
      batchExecutor.recordIncrementalUpdate(instance.id, 'node_0', {
        status: NodeStatus.SUCCESS,
        output: { result: 'test' },
      })

      await optimizedExecutor.executeInstance(instance.id)

      // 获取增量更新
      const updates = batchExecutor.getIncrementalUpdates(instance.id)

      expect(updates.length).toBeGreaterThan(0)
      expect(stateChanges.length).toBeGreaterThan(0)

      console.log(`Incremental updates: ${updates.length} state changes tracked`)
    })
  })

  describe('Memory Efficiency', () => {
    it('should manage cache size efficiently', async () => {
      const workflow = createTestWorkflow(10, false)
      optimizedExecutor.registerWorkflow(workflow)

      // 执行多次以填充缓存
      for (let i = 0; i < 20; i++) {
        const instance = optimizedExecutor.createInstance(workflow.id, { test: `data_${i}` })
        await optimizedExecutor.executeInstance(instance.id)
      }

      const cacheStats = optimizedExecutor.getCacheStats()

      expect(cacheStats.size).toBeLessThanOrEqual(cacheStats.maxSize)

      console.log(
        `Cache efficiency: ${cacheStats.size}/${cacheStats.maxSize} entries, hit rate: ${(cacheStats.hitRate * 100).toFixed(2)}%`
      )
    })
  })
})

/**
 * 运行完整基准测试
 */
export async function runFullBenchmark(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = []

  const nodeCounts = [10, 20, 50, 100]

  for (const nodeCount of nodeCounts) {
    // 顺序执行
    const sequentialWorkflow = createTestWorkflow(nodeCount, false)
    const originalExecutor = new EnhancedWorkflowExecutor()
    originalExecutor.registerWorkflow(sequentialWorkflow)

    const sequentialInstance = originalExecutor.createInstance(sequentialWorkflow.id, {
      test: 'data',
    })
    const sequentialStart = Date.now()
    await originalExecutor.executeInstance(sequentialInstance.id)
    const sequentialDuration = Date.now() - sequentialStart

    results.push({
      name: `Sequential ${nodeCount} nodes`,
      duration: sequentialDuration,
      nodeCount,
      parallel: false,
      cacheHits: 0,
      cacheMisses: 0,
      parallelExecutions: 0,
    })

    // 并行执行
    const parallelWorkflow = createTestWorkflow(nodeCount, true)
    const optimizedExecutor = new OptimizedWorkflowExecutor()
    optimizedExecutor.registerWorkflow(parallelWorkflow)

    const parallelInstance = optimizedExecutor.createInstance(parallelWorkflow.id, {
      test: 'data',
    })
    const parallelStart = Date.now()
    await optimizedExecutor.executeInstance(parallelInstance.id)
    const parallelDuration = Date.now() - parallelStart

    const metrics = optimizedExecutor.getPerformanceMetrics()

    results.push({
      name: `Parallel ${nodeCount} nodes`,
      duration: parallelDuration,
      nodeCount,
      parallel: true,
      cacheHits: metrics.cacheHits,
      cacheMisses: metrics.cacheMisses,
      parallelExecutions: metrics.parallelExecutions,
    })
  }

  return results
}

/**
 * 生成性能报告
 */
export function generatePerformanceReport(results: BenchmarkResult[]): string {
  let report = '# Workflow Engine Performance Report\n\n'
  report += '## Benchmark Results\n\n'

  for (const result of results) {
    report += `### ${result.name}\n`
    report += `- Duration: ${result.duration}ms\n`
    report += `- Node Count: ${result.nodeCount}\n`
    report += `- Parallel: ${result.parallel}\n`

    if (result.parallel) {
      report += `- Cache Hits: ${result.cacheHits}\n`
      report += `- Cache Misses: ${result.cacheMisses}\n`
      report += `- Parallel Executions: ${result.parallelExecutions}\n`
    }

    report += '\n'
  }

  // 计算平均性能提升
  const sequentialResults = results.filter(r => !r.parallel)
  const parallelResults = results.filter(r => r.parallel)

  if (sequentialResults.length > 0 && parallelResults.length > 0) {
    const avgSequential =
      sequentialResults.reduce((sum, r) => sum + r.duration, 0) / sequentialResults.length
    const avgParallel =
      parallelResults.reduce((sum, r) => sum + r.duration, 0) / parallelResults.length
    const avgSpeedup = avgSequential / avgParallel

    report += '## Summary\n\n'
    report += `- Average Sequential Duration: ${avgSequential.toFixed(2)}ms\n`
    report += `- Average Parallel Duration: ${avgParallel.toFixed(2)}ms\n`
    report += `- Average Speedup: ${avgSpeedup.toFixed(2)}x\n`
  }

  return report
}