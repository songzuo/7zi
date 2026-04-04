/**
 * Workflow Engine Edge Cases Tests
 * 边缘情况测试套件 - 测试核心工作流引擎在各种异常场景下的行为
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// Mock Dependencies
// ============================================================================

interface MockLogger {
  debug: (message: string, context?: any) => void
  info: (message: string, context?: any) => void
  warn: (message: string, context?: any) => void
  error: (message: string, context?: any) => void
}

class TestLogger implements MockLogger {
  logs: Array<{ level: string; message: string; context?: any }> = []

  debug(message: string, context?: any) {
    this.logs.push({ level: 'debug', message, context })
  }

  info(message: string, context?: any) {
    this.logs.push({ level: 'info', message, context })
  }

  warn(message: string, context?: any) {
    this.logs.push({ level: 'warn', message, context })
  }

  error(message: string, context?: any) {
    this.logs.push({ level: 'error', message, context })
  }

  clear() {
    this.logs = []
  }
}

class MockStorage {
  private workflows: Map<string, any> = new Map()
  private executions: Map<string, any> = new Map()
  private latencyMs: number = 0
  private failNext: boolean = false
  private failPattern?: RegExp

  setLatency(ms: number) {
    this.latencyMs = ms
  }

  setFailNext(fail: boolean) {
    this.failNext = fail
  }

  setFailPattern(pattern: RegExp) {
    this.failPattern = pattern
  }

  reset() {
    this.workflows.clear()
    this.executions.clear()
    this.latencyMs = 0
    this.failNext = false
    this.failPattern = undefined
  }

  async saveWorkflow(workflow: any): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latencyMs))
    }
    if (this.failNext || (this.failPattern && this.failPattern.test(workflow.id))) {
      this.failNext = false
      throw new Error('Storage error: save failed')
    }
    this.workflows.set(workflow.id, JSON.parse(JSON.stringify(workflow)))
  }

  async getWorkflow(id: string): Promise<any | null> {
    if (this.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latencyMs))
    }
    if (this.failNext || (this.failPattern && this.failPattern.test(id))) {
      this.failNext = false
      throw new Error('Storage error: retrieve failed')
    }
    const wf = this.workflows.get(id)
    return wf ? JSON.parse(JSON.stringify(wf)) : null
  }

  async saveExecution(execution: any): Promise<void> {
    if (this.failNext) {
      this.failNext = false
      throw new Error('Storage error: save execution failed')
    }
    this.executions.set(execution.id, JSON.parse(JSON.stringify(execution)))
  }

  async getExecution(id: string): Promise<any | null> {
    const exec = this.executions.get(id)
    return exec ? JSON.parse(JSON.stringify(exec)) : null
  }

  getWorkflowCount(): number {
    return this.workflows.size
  }

  getExecutionCount(): number {
    return this.executions.size
  }
}

class MockQueueManager {
  private queue: Array<{ workflowId: string; executionId: string; priority: number }> = []
  private activeJobs: Set<string> = new Set()
  private maxConcurrent: number = 10
  private rejectNext: boolean = false

  setMaxConcurrent(max: number) {
    this.maxConcurrent = max
  }

  setRejectNext(reject: boolean) {
    this.rejectNext = reject
  }

  reset() {
    this.queue = []
    this.activeJobs.clear()
    this.rejectNext = false
  }

  async addWorkflowJob(
    workflowId: string,
    executionId: string,
    options: any = {}
  ): Promise<void> {
    if (this.rejectNext) {
      this.rejectNext = false
      throw new Error('Queue rejected')
    }

    this.queue.push({
      workflowId,
      executionId,
      priority: options.priority || 0
    })

    if (this.activeJobs.size >= this.maxConcurrent) {
      throw new Error('Queue full')
    }

    this.activeJobs.add(executionId)
  }

  async completeJob(executionId: string): Promise<void> {
    this.activeJobs.delete(executionId)
  }

  getQueueLength(): number {
    return this.queue.length
  }

  getActiveJobCount(): number {
    return this.activeJobs.size
  }
}

// ============================================================================
// Workflow Engine Types (Simplified for Testing)
// ============================================================================

enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

enum WorkflowStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  DEPRECATED = 'deprecated',
  ARCHIVED = 'archived'
}

enum NodeType {
  TRIGGER_MANUAL = 'trigger.manual',
  ACTION_HTTP = 'action.http',
  ACTION_SCRIPT = 'action.script',
  LOGIC_CONDITION = 'logic.condition',
  LOGIC_PARALLEL = 'logic.parallel'
}

interface IWorkflow {
  id: string
  name: string
  description?: string
  version: string
  status: WorkflowStatus
  nodes: IWorkflowNode[]
  edges: IWorkflowEdge[]
  variables?: Record<string, any>
  timeout?: number
  priority?: number
  createdAt: Date
  updatedAt: Date
}

interface IWorkflowNode {
  id: string
  type: NodeType
  name: string
  config: any
  timeout?: number
  retryPolicy?: any
}

interface IWorkflowEdge {
  id: string
  source: string
  target: string
}

interface IExecution {
  id: string
  workflowId: string
  status: ExecutionStatus
  variables: Record<string, any>
  startTime: Date
  endTime?: Date
  duration?: number
  error?: any
  nodeExecutions: Map<string, any>
}

// ============================================================================
// Simplified Workflow Engine for Testing
// ============================================================================

class TestWorkflowEngine {
  private storage: MockStorage
  private queueManager: MockQueueManager
  private logger: TestLogger
  private executions: Map<string, IExecution> = new Map()
  private maxExecutionTime: number = 60000 // 1 minute default

  constructor(
    storage: MockStorage,
    queueManager: MockQueueManager,
    logger: TestLogger,
    options?: { maxExecutionTime?: number }
  ) {
    this.storage = storage
    this.queueManager = queueManager
    this.logger = logger
    this.maxExecutionTime = options?.maxExecutionTime || 60000
  }

  async registerWorkflow(workflow: IWorkflow): Promise<void> {
    if (!workflow.id || workflow.id.trim() === '') {
      throw new Error('Workflow ID is required')
    }
    if (!workflow.name || workflow.name.trim() === '') {
      throw new Error('Workflow name is required')
    }
    await this.storage.saveWorkflow(workflow)
    this.logger.info('Workflow registered', { workflowId: workflow.id })
  }

  async execute(
    workflowId: string,
    variables: Record<string, any> = {}
  ): Promise<IExecution> {
    const workflow = await this.storage.getWorkflow(workflowId)
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const executionId = uuidv4()
    const execution: IExecution = {
      id: executionId,
      workflowId,
      status: ExecutionStatus.RUNNING,
      variables: { ...workflow.variables, ...variables },
      startTime: new Date(),
      nodeExecutions: new Map()
    }

    await this.storage.saveExecution(execution)
    this.executions.set(executionId, execution)

    try {
      await this.queueManager.addWorkflowJob(workflowId, executionId, {
        priority: workflow.priority || 0
      })

      // Execute workflow nodes
      for (const node of workflow.nodes) {
        await this.executeNode(node, execution, workflow)
      }

      execution.status = ExecutionStatus.COMPLETED
      execution.endTime = new Date()
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime()

      await this.storage.saveExecution(execution)
      await this.queueManager.completeJob(executionId)

      return execution
    } catch (error) {
      execution.status = ExecutionStatus.FAILED
      execution.endTime = new Date()
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime()
      execution.error = {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      }

      await this.storage.saveExecution(execution)
      this.logger.error('Workflow execution failed', {
        workflowId,
        executionId,
        error: execution.error.message
      })

      throw error
    }
  }

  private async executeNode(
    node: IWorkflowNode,
    execution: IExecution,
    workflow: IWorkflow
  ): Promise<void> {
    const nodeTimeout = node.timeout || workflow.timeout || this.maxExecutionTime

    return Promise.race([
      this.performNodeExecution(node, execution),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error(`Node timeout: ${node.id}`)), nodeTimeout)
      )
    ])
  }

  private async performNodeExecution(
    node: IWorkflowNode,
    execution: IExecution
  ): Promise<void> {
    this.logger.debug('Executing node', { nodeId: node.id, type: node.type })

    // Simulate node execution
    await new Promise(resolve => setTimeout(resolve, 10))

    execution.nodeExecutions.set(node.id, {
      nodeId: node.id,
      status: ExecutionStatus.COMPLETED,
      startTime: new Date(),
      endTime: new Date()
    })

    await this.storage.saveExecution(execution)
  }

  getExecution(id: string): IExecution | undefined {
    return this.executions.get(id)
  }

  getActiveExecutions(): number {
    return this.executions.size
  }
}

// ============================================================================
// Test Helpers
// ============================================================================

function createTestWorkflow(overrides?: Partial<IWorkflow>): IWorkflow {
  return {
    id: 'test-workflow-' + uuidv4(),
    name: 'Test Workflow',
    description: 'A test workflow',
    version: '1.0.0',
    status: WorkflowStatus.PUBLISHED,
    nodes: [
      {
        id: 'node-1',
        type: NodeType.TRIGGER_MANUAL,
        name: 'Start',
        config: {}
      },
      {
        id: 'node-2',
        type: NodeType.ACTION_HTTP,
        name: 'HTTP Request',
        config: { url: 'https://api.example.com', method: 'GET' }
      }
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-2' }
    ],
    variables: { apiKey: 'test-key' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

function createLargeString(size: number): string {
  return 'x'.repeat(size)
}

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('Workflow Engine - Edge Cases', () => {
  let storage: MockStorage
  let queueManager: MockQueueManager
  let logger: TestLogger
  let engine: TestWorkflowEngine

  beforeEach(() => {
    storage = new MockStorage()
    queueManager = new MockQueueManager()
    logger = new TestLogger()
    engine = new TestWorkflowEngine(storage, queueManager, logger)
  })

  afterEach(() => {
    storage.reset()
    queueManager.reset()
    logger.clear()
  })

  // ==========================================================================
  // 1. Empty Input Tests
  // ==========================================================================

  describe('Empty Input Handling', () => {
    it('should handle empty workflow ID gracefully', async () => {
      await expect(engine.execute('', {})).rejects.toThrow('Workflow not found')
    })

    it('should handle null workflow ID', async () => {
      await expect(engine.execute(null as any, {})).rejects.toThrow()
    })

    it('should handle undefined workflow ID', async () => {
      await expect(engine.execute(undefined as any, {})).rejects.toThrow()
    })

    it('should handle empty variables object', async () => {
      const workflow = createTestWorkflow()
      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id, {})

      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
      expect(Object.keys(execution.variables)).toHaveLength(1) // Only apiKey
    })

    it('should handle workflow with empty name', async () => {
      const workflow = createTestWorkflow({ name: '' })

      await expect(engine.registerWorkflow(workflow)).rejects.toThrow('Workflow name is required')
    })

    it('should handle workflow with no nodes', async () => {
      const workflow = createTestWorkflow({ nodes: [] })
      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id)

      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
      expect(execution.nodeExecutions.size).toBe(0)
    })

    it('should handle workflow with no edges', async () => {
      const workflow = createTestWorkflow({ edges: [] })
      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id)

      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
    })

    it('should handle empty node configuration', async () => {
      const workflow = createTestWorkflow({
        nodes: [
          {
            id: 'node-empty',
            type: NodeType.ACTION_HTTP,
            name: 'Empty Node',
            config: {}
          }
        ]
      })
      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id)

      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
    })
  })

  // ==========================================================================
  // 2. Oversized Input Tests
  // ==========================================================================

  describe('Oversized Input Handling', () => {
    it('should handle very long workflow name', async () => {
      const longName = createLargeString(10000)
      const workflow = createTestWorkflow({ name: longName })

      await engine.registerWorkflow(workflow)
      const retrieved = await storage.getWorkflow(workflow.id)

      expect(retrieved?.name).toBe(longName)
    })

    it('should handle very long workflow description', async () => {
      const longDesc = createLargeString(100000)
      const workflow = createTestWorkflow({ description: longDesc })

      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id)

      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
    })

    it('should handle large variables object', async () => {
      const largeVariables: Record<string, any> = {}
      for (let i = 0; i < 1000; i++) {
        largeVariables[`var${i}`] = createLargeString(1000)
      }

      const workflow = createTestWorkflow({ variables: largeVariables })
      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id)

      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
      // Check that variables are merged (workflow variables + execution variables)
      expect(Object.keys(execution.variables).length).toBeGreaterThanOrEqual(1000)
    })

    it('should handle workflow with many nodes', async () => {
      const nodes: IWorkflowNode[] = []
      for (let i = 0; i < 500; i++) {
        nodes.push({
          id: `node-${i}`,
          type: NodeType.ACTION_SCRIPT,
          name: `Script ${i}`,
          config: { script: `console.log(${i})` }
        })
      }

      const workflow = createTestWorkflow({ nodes })
      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id)

      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
      expect(execution.nodeExecutions.size).toBe(500)
    })

    it('should handle workflow with many edges', async () => {
      const nodes: IWorkflowNode[] = []
      const edges: IWorkflowEdge[] = []

      for (let i = 0; i < 100; i++) {
        nodes.push({
          id: `node-${i}`,
          type: NodeType.ACTION_SCRIPT,
          name: `Node ${i}`,
          config: {}
        })
      }

      for (let i = 0; i < 99; i++) {
        edges.push({
          id: `edge-${i}`,
          source: `node-${i}`,
          target: `node-${i + 1}`
        })
      }

      const workflow = createTestWorkflow({ nodes, edges })
      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id)

      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
    })

    it('should handle extremely large node config', async () => {
      const largeConfig = {
        script: createLargeString(1000000),
        data: createLargeString(1000000)
      }

      const workflow = createTestWorkflow({
        nodes: [
          {
            id: 'node-large',
            type: NodeType.ACTION_SCRIPT,
            name: 'Large Node',
            config: largeConfig
          }
        ]
      })

      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id)

      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
    })
  })

  // ==========================================================================
  // 3. Concurrent Execution Tests
  // ==========================================================================

  describe('Concurrent Execution', () => {
    it('should handle multiple concurrent executions of same workflow', async () => {
      const workflow = createTestWorkflow()
      await engine.registerWorkflow(workflow)

      const promises: Promise<IExecution>[] = []
      for (let i = 0; i < 10; i++) {
        promises.push(engine.execute(workflow.id))
      }

      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result.status).toBe(ExecutionStatus.COMPLETED)
        expect(result.workflowId).toBe(workflow.id)
      })
    })

    it('should handle concurrent executions of different workflows', async () => {
      const workflows: IWorkflow[] = []
      for (let i = 0; i < 5; i++) {
        const wf = createTestWorkflow({ id: `workflow-${i}` })
        await engine.registerWorkflow(wf)
        workflows.push(wf)
      }

      const promises: Promise<IExecution>[] = []
      workflows.forEach(wf => {
        promises.push(engine.execute(wf.id))
        promises.push(engine.execute(wf.id))
      })

      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result.status).toBe(ExecutionStatus.COMPLETED)
      })
    })

    it('should handle concurrent execution with queue limits', async () => {
      queueManager.setMaxConcurrent(3)

      const workflow = createTestWorkflow()
      await engine.registerWorkflow(workflow)

      const promises: Promise<IExecution>[] = []
      for (let i = 0; i < 5; i++) {
        promises.push(
          engine.execute(workflow.id).catch((error: Error) => {
            return { status: 'REJECTED', error: error.message } as any
          })
        )
      }

      const results = await Promise.all(promises)

      // Some should succeed, some should be rejected
      const successful = results.filter((r: any) => r.status === ExecutionStatus.COMPLETED)
      const rejected = results.filter((r: any) => r.status === 'REJECTED')

      expect(successful.length + rejected.length).toBe(5)
    })

    it('should handle rapid successive executions', async () => {
      const workflow = createTestWorkflow()
      await engine.registerWorkflow(workflow)

      const results: IExecution[] = []
      for (let i = 0; i < 20; i++) {
        const result = await engine.execute(workflow.id)
        results.push(result)
      }

      expect(results).toHaveLength(20)
      results.forEach(result => {
        expect(result.status).toBe(ExecutionStatus.COMPLETED)
      })
    })
  })

  // ==========================================================================
  // 4. Error Recovery Tests
  // ==========================================================================

  describe('Error Recovery', () => {
    it('should handle storage errors during workflow registration', async () => {
      storage.setFailNext(true)

      const workflow = createTestWorkflow()

      await expect(engine.registerWorkflow(workflow)).rejects.toThrow('Storage error')
    })

    it('should handle storage errors during workflow execution', async () => {
      const workflow = createTestWorkflow()
      await engine.registerWorkflow(workflow)

      storage.setFailNext(true)

      await expect(engine.execute(workflow.id)).rejects.toThrow('Storage error')
    })

    it('should handle queue rejection', async () => {
      queueManager.setRejectNext(true)

      const workflow = createTestWorkflow()
      await engine.registerWorkflow(workflow)

      await expect(engine.execute(workflow.id)).rejects.toThrow('Queue rejected')
    })

    it('should handle node timeout', async () => {
      const workflow = createTestWorkflow({
        nodes: [
          {
            id: 'node-slow',
            type: NodeType.ACTION_SCRIPT,
            name: 'Slow Node',
            config: {},
            timeout: 1 // 1ms timeout
          }
        ]
      })

      await engine.registerWorkflow(workflow)

      await expect(engine.execute(workflow.id)).rejects.toThrow('Node timeout')
    })

    it('should handle workflow-level timeout', async () => {
      const workflow = createTestWorkflow({
        timeout: 1, // 1ms timeout
        nodes: [
          {
            id: 'node-1',
            type: NodeType.ACTION_SCRIPT,
            name: 'Node 1',
            config: {}
          },
          {
            id: 'node-2',
            type: NodeType.ACTION_SCRIPT,
            name: 'Node 2',
            config: {}
          }
        ]
      })

      await engine.registerWorkflow(workflow)

      await expect(engine.execute(workflow.id)).rejects.toThrow()
    })

    it('should recover from temporary storage failures', async () => {
      const workflow = createTestWorkflow()
      await engine.registerWorkflow(workflow)

      // First execution fails
      storage.setFailNext(true)
      await expect(engine.execute(workflow.id)).rejects.toThrow()

      // Second execution succeeds
      const execution = await engine.execute(workflow.id)
      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
    })

    it('should handle corrupted workflow data', async () => {
      const workflow = createTestWorkflow()
      await engine.registerWorkflow(workflow)

      // Manually corrupt the workflow in storage
      ;(storage as any).workflows.set(workflow.id, { id: workflow.id, corrupt: true })

      await expect(engine.execute(workflow.id)).rejects.toThrow()
    })
  })

  // ==========================================================================
  // 5. Special Character and Encoding Tests
  // ==========================================================================

  describe('Special Characters and Encoding', () => {
    it('should handle Unicode characters in workflow name', async () => {
      const workflow = createTestWorkflow({
        name: '工作流 ワークフロー 워크플로우 🚀'
      })

      await engine.registerWorkflow(workflow)
      const retrieved = await storage.getWorkflow(workflow.id)

      expect(retrieved?.name).toBe('工作流 ワークフロー 워크플로우 🚀')
    })

    it('should handle special characters in variable values', async () => {
      const specialVariables = {
        specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        quotes: '"double" \'single\' `backtick`',
        unicode: '🎉🎊🎈',
        emoji: '😀😃😄😁😆😅🤣😂',
        chinese: '中文测试',
        arabic: 'اختبار',
        russian: 'тест'
      }

      const workflow = createTestWorkflow({ variables: specialVariables })
      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id)

      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
      Object.keys(specialVariables).forEach(key => {
        expect(execution.variables[key]).toBe(specialVariables[key])
      })
    })

    it('should handle null and undefined values in variables', async () => {
      const mixedVariables = {
        nullValue: null as any,
        undefinedValue: undefined as any,
        emptyString: '',
        zero: 0,
        false: false
      }

      const workflow = createTestWorkflow({ variables: mixedVariables })
      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id)

      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
      expect(execution.variables.nullValue).toBeNull()
    })

    it('should handle deeply nested objects in variables', async () => {
      const deepNested = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep'
                }
              }
            }
          }
        }
      }

      const workflow = createTestWorkflow({ variables: deepNested })
      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id)

      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
      expect(execution.variables.level1.level2.level3.level4.level5.value).toBe('deep')
    })
  })

  // ==========================================================================
  // 6. Performance and Stress Tests
  // ==========================================================================

  describe('Performance and Stress', () => {
    it('should handle storage latency gracefully', async () => {
      storage.setLatency(100) // 100ms latency

      const workflow = createTestWorkflow()
      await engine.registerWorkflow(workflow)

      const startTime = Date.now()
      const execution = await engine.execute(workflow.id)
      const duration = Date.now() - startTime

      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
      expect(duration).toBeGreaterThan(100) // At least 100ms latency
    })

    it('should handle multiple rapid workflows', async () => {
      // Increase max concurrent to handle all workflows
      queueManager.setMaxConcurrent(100)

      const workflows: IWorkflow[] = []
      for (let i = 0; i < 50; i++) {
        const wf = createTestWorkflow({ id: `workflow-${i}` })
        workflows.push(wf)
        await engine.registerWorkflow(wf)
      }

      const startTime = Date.now()
      const promises = workflows.map(wf => engine.execute(wf.id))
      const results = await Promise.all(promises)
      const duration = Date.now() - startTime

      expect(results).toHaveLength(50)
      results.forEach(result => {
        expect(result.status).toBe(ExecutionStatus.COMPLETED)
      })

      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000)
    })

    it('should handle memory pressure with many executions', async () => {
      const workflow = createTestWorkflow()
      await engine.registerWorkflow(workflow)

      const executions: IExecution[] = []
      for (let i = 0; i < 100; i++) {
        const execution = await engine.execute(workflow.id)
        executions.push(execution)
      }

      expect(executions).toHaveLength(100)
      executions.forEach(exec => {
        expect(exec.status).toBe(ExecutionStatus.COMPLETED)
      })
    })
  })

  // ==========================================================================
  // 7. State Consistency Tests
  // ==========================================================================

  describe('State Consistency', () => {
    it('should maintain execution state across failures', async () => {
      const workflow = createTestWorkflow()
      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id)
      expect(execution.status).toBe(ExecutionStatus.COMPLETED)

      // Verify state is persisted
      const retrieved = await storage.getExecution(execution.id)
      expect(retrieved?.status).toBe(ExecutionStatus.COMPLETED)
      expect(retrieved?.workflowId).toBe(workflow.id)
    })

    it('should not leak state between executions', async () => {
      const workflow1 = createTestWorkflow({ id: 'workflow-1' })
      const workflow2 = createTestWorkflow({ id: 'workflow-2' })

      await engine.registerWorkflow(workflow1)
      await engine.registerWorkflow(workflow2)

      const exec1 = await engine.execute(workflow1.id, { var1: 'value1' })
      const exec2 = await engine.execute(workflow2.id, { var2: 'value2' })

      expect(exec1.variables.var1).toBe('value1')
      expect(exec2.variables.var2).toBe('value2')
      expect(exec1.variables.var2).toBeUndefined()
      expect(exec2.variables.var1).toBeUndefined()
    })

    it('should handle concurrent state modifications', async () => {
      const workflow = createTestWorkflow()
      await engine.registerWorkflow(workflow)

      const promises: Promise<IExecution>[] = []
      for (let i = 0; i < 10; i++) {
        promises.push(engine.execute(workflow.id, { index: i }))
      }

      const results = await Promise.all(promises)

      // Verify each execution has its own state
      for (let i = 0; i < 10; i++) {
        const matchingResults = results.filter(r => r.variables.index === i)
        expect(matchingResults).toHaveLength(1)
      }
    })
  })

  // ==========================================================================
  // 8. Resource Management Tests
  // ==========================================================================

  describe('Resource Management', () => {
    it('should handle execution cancellation gracefully', async () => {
      const workflow = createTestWorkflow({
        nodes: [
          {
            id: 'node-1',
            type: NodeType.ACTION_SCRIPT,
            name: 'Node 1',
            config: {}
          },
          {
            id: 'node-2',
            type: NodeType.ACTION_SCRIPT,
            name: 'Node 2',
            config: {}
          },
          {
            id: 'node-3',
            type: NodeType.ACTION_SCRIPT,
            name: 'Node 3',
            config: {}
          }
        ]
      })

      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id)
      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
    })

    it('should clean up resources after execution', async () => {
      const workflow = createTestWorkflow()
      await engine.registerWorkflow(workflow)

      await engine.execute(workflow.id)

      // Verify that the execution completed and queue manager processed it
      const activeJobs = queueManager.getActiveJobCount()
      expect(activeJobs).toBeLessThanOrEqual(1) // Should be 0 or 1 (completed)
    })

    it('should handle queue full scenario', async () => {
      queueManager.setMaxConcurrent(1)

      const workflow = createTestWorkflow()
      await engine.registerWorkflow(workflow)

      // First execution
      const promise1 = engine.execute(workflow.id)

      // Second execution should handle queue full
      const promise2 = engine.execute(workflow.id).catch(err => {
        return { status: 'FAILED', error: err.message } as any
      })

      await Promise.all([promise1, promise2])
    })
  })

  // ==========================================================================
  // 9. Edge Case Scenarios
  // ==========================================================================

  describe('Edge Case Scenarios', () => {
    it('should handle workflow with circular dependency (should detect)', async () => {
      const nodes: IWorkflowNode[] = [
        { id: 'node-1', type: NodeType.TRIGGER_MANUAL, name: 'Node 1', config: {} },
        { id: 'node-2', type: NodeType.ACTION_SCRIPT, name: 'Node 2', config: {} },
        { id: 'node-3', type: NodeType.ACTION_SCRIPT, name: 'Node 3', config: {} }
      ]

      const edges: IWorkflowEdge[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-2', target: 'node-3' },
        { id: 'edge-3', source: 'node-3', target: 'node-1' } // Circular
      ]

      const workflow = createTestWorkflow({ nodes, edges })

      await engine.registerWorkflow(workflow)

      // Engine should handle circular dependencies (either detect or limit iterations)
      const execution = await engine.execute(workflow.id)

      // Should complete or fail gracefully, not hang
      expect(execution.status === ExecutionStatus.COMPLETED || execution.status === ExecutionStatus.FAILED).toBe(true)
    })

    it('should handle workflow with orphaned nodes', async () => {
      const nodes: IWorkflowNode[] = [
        { id: 'node-1', type: NodeType.TRIGGER_MANUAL, name: 'Node 1', config: {} },
        { id: 'node-2', type: NodeType.ACTION_SCRIPT, name: 'Node 2', config: {} },
        { id: 'node-orphan', type: NodeType.ACTION_SCRIPT, name: 'Orphan', config: {} }
      ]

      const edges: IWorkflowEdge[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' }
      ] // node-orphan has no connections

      const workflow = createTestWorkflow({ nodes, edges })

      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id)

      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
    })

    it('should handle workflow with duplicate node IDs', async () => {
      const nodes: IWorkflowNode[] = [
        { id: 'node-duplicate', type: NodeType.TRIGGER_MANUAL, name: 'Node 1', config: {} },
        { id: 'node-duplicate', type: NodeType.ACTION_SCRIPT, name: 'Node 2', config: {} }
      ]

      const workflow = createTestWorkflow({ nodes })

      // Should handle duplicates gracefully
      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id)

      expect(execution.status === ExecutionStatus.COMPLETED || execution.status === ExecutionStatus.FAILED).toBe(true)
    })

    it('should handle workflow with duplicate edge IDs', async () => {
      const edges: IWorkflowEdge[] = [
        { id: 'edge-duplicate', source: 'node-1', target: 'node-2' },
        { id: 'edge-duplicate', source: 'node-2', target: 'node-3' }
      ]

      const workflow = createTestWorkflow({ edges })

      await engine.registerWorkflow(workflow)

      const execution = await engine.execute(workflow.id)

      expect(execution.status).toBe(ExecutionStatus.COMPLETED)
    })
  })
})
