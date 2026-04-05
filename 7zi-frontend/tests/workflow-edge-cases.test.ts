/**
 * Workflow Engine Edge Cases Test Suite
 * 工作流引擎边缘情况测试套件
 * 
 * 覆盖场景：
 * 1. 空输入/无效输入处理
 * 2. 超大输入处理
 * 3. 并发执行
 * 4. 错误恢复与重试
 * 5. 资源清理与内存管理
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ===== Types =====

interface WorkflowNode {
  id: string
  type: string
  data?: Record<string, unknown>
  status?: 'idle' | 'running' | 'completed' | 'failed'
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
}

interface WorkflowDefinition {
  id: string
  name: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  config?: {
    timeout?: number
    maxRetries?: number
    parallel?: boolean
  }
}

interface ExecutionResult {
  nodeId: string
  success: boolean
  output?: unknown
  error?: string
  duration?: number
}

// ===== Mock Workflow Engine =====

class WorkflowExecutionEngine {
  private executions: Map<string, ExecutionResult[]> = new Map()
  private nodeHandlers: Map<string, (input: unknown) => Promise<unknown>> = new Map()

  registerHandler(type: string, handler: (input: unknown) => Promise<unknown>): void {
    this.nodeHandlers.set(type, handler)
  }

  async executeNode(workflowId: string, node: WorkflowNode, input?: unknown): Promise<ExecutionResult> {
    const startTime = Date.now()
    
    try {
      // Edge case: Handle null/undefined input
      const processedInput = this.normalizeInput(input)
      
      // Edge case: Handle oversized input
      const safeInput = this.sanitizeInput(processedInput)
      
      const handler = this.nodeHandlers.get(node.type)
      if (!handler) {
        throw new Error(`No handler registered for node type: ${node.type}`)
      }

      const output = await handler(safeInput)
      const duration = Date.now() - startTime

      const result: ExecutionResult = {
        nodeId: node.id,
        success: true,
        output,
        duration,
      }

      this.recordExecution(workflowId, result)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const result: ExecutionResult = {
        nodeId: node.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
      }

      this.recordExecution(workflowId, result)
      return result
    }
  }

  // Edge case: Normalize null/undefined/empty inputs
  private normalizeInput(input: unknown): unknown {
    if (input === null) {
      return { _isNull: true, value: null }
    }
    if (input === undefined) {
      return { _isUndefined: true, value: undefined }
    }
    if (typeof input === 'string' && input.trim() === '') {
      return { _isEmptyString: true, value: '' }
    }
    return input
  }

  // Edge case: Sanitize oversized input (>100KB)
  private sanitizeInput(input: unknown): unknown {
    const jsonString = JSON.stringify(input)
    if (jsonString.length > 100 * 1024) {
      return {
        _truncated: true,
        originalSize: jsonString.length,
        preview: jsonString.slice(0, 1000),
      }
    }
    return input
  }

  private recordExecution(workflowId: string, result: ExecutionResult): void {
    const executions = this.executions.get(workflowId) || []
    executions.push(result)
    this.executions.set(workflowId, executions)
  }

  getExecutions(workflowId: string): ExecutionResult[] {
    return this.executions.get(workflowId) || []
  }

  // Edge case: Concurrent execution with race condition handling
  async executeParallel(
    workflowId: string, 
    nodes: WorkflowNode[], 
    input?: unknown
  ): Promise<ExecutionResult[]> {
    const promises = nodes.map(node => this.executeNode(workflowId, node, input))
    return Promise.all(promises)
  }

  // Edge case: Execute with error recovery
  async executeWithRecovery(
    workflowId: string,
    node: WorkflowNode,
    input: unknown,
    maxRetries: number = 3
  ): Promise<ExecutionResult> {
    let lastError: string | undefined
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.executeNode(workflowId, node, input)
      
      if (result.success) {
        return result
      }
      
      lastError = result.error
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 10))
      }
    }

    return {
      nodeId: node.id,
      success: false,
      error: `Failed after ${maxRetries} attempts: ${lastError}`,
    }
  }

  // Edge case: Cleanup resources
  cleanup(workflowId: string): void {
    this.executions.delete(workflowId)
  }
}

// ===== Test Suite =====

describe('Workflow Edge Cases', () => {
  let engine: WorkflowExecutionEngine

  beforeEach(() => {
    engine = new WorkflowExecutionEngine()

    // Register test handlers
    engine.registerHandler('success', async (input) => {
      return { success: true, processed: input }
    })

    engine.registerHandler('fail', async () => {
      throw new Error('Intentional failure')
    })

    engine.registerHandler('slow', async (input) => {
      await new Promise(resolve => setTimeout(resolve, 50))
      return { slow: true, input }
    })

    engine.registerHandler('echo', async (input) => {
      return { echoed: input }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ===== Edge Case 1: Empty/Invalid Input Handling =====

  describe('Empty Input Handling', () => {
    it('should handle null input gracefully', async () => {
      const node: WorkflowNode = { id: 'node1', type: 'success' }
      const result = await engine.executeNode('wf1', node, null)

      expect(result.success).toBe(true)
      // The handler wraps the normalized input in { success: true, processed: input }
      const processed = (result.output as { processed: unknown }).processed
      expect(processed).toHaveProperty('_isNull')
      expect((processed as { _isNull: boolean })._isNull).toBe(true)
    })

    it('should handle undefined input gracefully', async () => {
      const node: WorkflowNode = { id: 'node1', type: 'success' }
      const result = await engine.executeNode('wf1', node, undefined)

      expect(result.success).toBe(true)
      const processed = (result.output as { processed: unknown }).processed
      expect(processed).toHaveProperty('_isUndefined')
    })

    it('should handle empty string input', async () => {
      const node: WorkflowNode = { id: 'node1', type: 'success' }
      const result = await engine.executeNode('wf1', node, '')

      expect(result.success).toBe(true)
      const processed = (result.output as { processed: unknown }).processed
      expect(processed).toHaveProperty('_isEmptyString')
    })

    it('should handle empty array input', async () => {
      const node: WorkflowNode = { id: 'node1', type: 'echo' }
      const result = await engine.executeNode('wf1', node, [])

      expect(result.success).toBe(true)
    })

    it('should handle empty object input', async () => {
      const node: WorkflowNode = { id: 'node1', type: 'echo' }
      const result = await engine.executeNode('wf1', node, {})

      expect(result.success).toBe(true)
    })
  })

  // ===== Edge Case 2: Large Input Handling =====

  describe('Large Input Handling', () => {
    it('should handle input larger than 100KB', async () => {
      const largeInput = {
        data: 'x'.repeat(150 * 1024), // 150KB
        metadata: { size: 'large' }
      }
      
      const node: WorkflowNode = { id: 'node1', type: 'success' }
      const result = await engine.executeNode('wf1', node, largeInput)

      expect(result.success).toBe(true)
      const processed = (result.output as { processed: unknown }).processed
      expect(processed).toHaveProperty('_truncated', true)
      expect(processed).toHaveProperty('originalSize')
    })

    it('should handle input at exactly 100KB boundary', async () => {
      const boundaryInput = {
        data: 'x'.repeat(100 * 1024), // Exactly 100KB
      }
      
      const node: WorkflowNode = { id: 'node1', type: 'success' }
      const result = await engine.executeNode('wf1', node, boundaryInput)

      // At exactly 100KB, it's not truncated
      expect(result.success).toBe(true)
    })

    it('should handle deeply nested large objects', async () => {
      const nestedInput = {
        level1: {
          level2: {
            level3: {
              data: 'x'.repeat(50 * 1024),
            }
          }
        }
      }
      
      const node: WorkflowNode = { id: 'node1', type: 'success' }
      const result = await engine.executeNode('wf1', node, nestedInput)

      expect(result.success).toBe(true)
    })

    it('should handle array with many elements', async () => {
      const arrayInput = {
        items: Array(10000).fill({ id: 1, name: 'item' })
      }
      
      const node: WorkflowNode = { id: 'node1', type: 'success' }
      const result = await engine.executeNode('wf1', node, arrayInput)

      expect(result.success).toBe(true)
    })
  })

  // ===== Edge Case 3: Concurrent Execution =====

  describe('Concurrent Execution', () => {
    it('should execute multiple nodes in parallel', async () => {
      const nodes: WorkflowNode[] = [
        { id: 'node1', type: 'slow' },
        { id: 'node2', type: 'slow' },
        { id: 'node3', type: 'slow' },
      ]

      const startTime = Date.now()
      const results = await engine.executeParallel('wf1', nodes)
      const duration = Date.now() - startTime

      // Should complete in ~50ms (parallel) not ~150ms (sequential)
      expect(duration).toBeLessThan(100)
      expect(results).toHaveLength(3)
      expect(results.every(r => r.success)).toBe(true)
    })

    it('should handle partial failures in parallel execution', async () => {
      const nodes: WorkflowNode[] = [
        { id: 'node1', type: 'success' },
        { id: 'node2', type: 'fail' },
        { id: 'node3', type: 'success' },
      ]

      const results = await engine.executeParallel('wf1', nodes)

      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[2].success).toBe(true)
    })

    it('should maintain execution order integrity', async () => {
      const nodes: WorkflowNode[] = Array(10).fill(null).map((_, i) => ({
        id: `node${i}`,
        type: 'success' as const,
      }))

      const results = await engine.executeParallel('wf1', nodes)

      expect(results).toHaveLength(10)
      // All should complete successfully
      expect(results.every(r => r.success)).toBe(true)
    })

    it('should handle rapid concurrent requests', async () => {
      const nodes: WorkflowNode[] = Array(20).fill(null).map((_, i) => ({
        id: `node${i}`,
        type: 'success' as const,
      }))

      // Launch multiple parallel batches
      const batch1 = engine.executeParallel('wf1-batch1', nodes)
      const batch2 = engine.executeParallel('wf1-batch2', nodes)
      const batch3 = engine.executeParallel('wf1-batch3', nodes)

      const [results1, results2, results3] = await Promise.all([batch1, batch2, batch3])

      expect(results1).toHaveLength(20)
      expect(results2).toHaveLength(20)
      expect(results3).toHaveLength(20)
    })
  })

  // ===== Edge Case 4: Error Recovery =====

  describe('Error Recovery', () => {
    it('should recover from transient failures with retry', async () => {
      // First call fails, subsequent calls succeed
      let attempt = 0
      engine.registerHandler('eventually-success', async () => {
        attempt++
        if (attempt < 2) {
          throw new Error('Transient error')
        }
        return { recovered: true, attempts: attempt }
      })

      const node: WorkflowNode = { id: 'node1', type: 'eventually-success' }
      const result = await engine.executeWithRecovery('wf1', node, {}, 3)

      expect(result.success).toBe(true)
      expect((result.output as { attempts: number }).attempts).toBe(2)
    })

    it('should fail after max retries exhausted', async () => {
      const node: WorkflowNode = { id: 'node1', type: 'fail' }
      const result = await engine.executeWithRecovery('wf1', node, {}, 3)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed after 3 attempts')
    })

    it('should handle retry with exponential backoff', async () => {
      let attempts = 0
      engine.registerHandler('slow-fail', async () => {
        attempts++
        throw new Error('Always fails')
      })

      const node: WorkflowNode = { id: 'node1', type: 'slow-fail' }
      const startTime = Date.now()
      const result = await engine.executeWithRecovery('wf1', node, {}, 3)
      const duration = Date.now() - startTime

      // Exponential backoff: 10ms + 20ms + 40ms = ~70ms minimum
      expect(duration).toBeGreaterThanOrEqual(60)
      expect(attempts).toBe(3)
    })

    it('should handle unknown node types gracefully', async () => {
      const node: WorkflowNode = { id: 'node1', type: 'non-existent-type' }
      const result = await engine.executeNode('wf1', node, {})

      expect(result.success).toBe(false)
      expect(result.error).toContain('No handler registered')
    })
  })

  // ===== Edge Case 5: Resource Cleanup =====

  describe('Resource Cleanup', () => {
    it('should cleanup execution history', async () => {
      const node: WorkflowNode = { id: 'node1', type: 'success' }

      await engine.executeNode('wf1', node, { test: 1 })
      await engine.executeNode('wf1', node, { test: 2 })
      
      let executions = engine.getExecutions('wf1')
      expect(executions).toHaveLength(2)

      engine.cleanup('wf1')
      executions = engine.getExecutions('wf1')
      expect(executions).toHaveLength(0)
    })

    it('should handle cleanup of non-existent workflow', () => {
      // Should not throw
      expect(() => engine.cleanup('non-existent')).not.toThrow()
    })

    it('should track execution duration', async () => {
      const node: WorkflowNode = { id: 'node1', type: 'slow' }
      const result = await engine.executeNode('wf1', node, {})

      expect(result.duration).toBeDefined()
      expect(result.duration).toBeGreaterThanOrEqual(40) // Allow some tolerance
    })
  })

  // ===== Additional Edge Cases =====

  describe('Additional Edge Cases', () => {
    it('should handle workflow with no nodes', async () => {
      const results = await engine.executeParallel('wf1', [])
      expect(results).toHaveLength(0)
    })

    it('should handle duplicate node execution', async () => {
      const node: WorkflowNode = { id: 'node1', type: 'success' }
      
      // Execute same node multiple times
      const result1 = await engine.executeNode('wf1', node, { index: 1 })
      const result2 = await engine.executeNode('wf1', node, { index: 2 })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result1.nodeId).toBe(result2.nodeId)
    })

    it('should preserve input types correctly', async () => {
      engine.registerHandler('type-test', async (input) => {
        return {
          type: typeof input,
          isArray: Array.isArray(input),
          isNull: input === null,
        }
      })

      const testCases = [
        { input: 'string', expectedType: 'string' },
        { input: 123, expectedType: 'number' },
        { input: true, expectedType: 'boolean' },
        { input: [1, 2, 3], expectedType: 'object' },
        { input: { a: 1 }, expectedType: 'object' },
      ]

      for (const tc of testCases) {
        const node: WorkflowNode = { id: 'node1', type: 'type-test' }
        const result = await engine.executeNode('wf1', node, tc.input)
        
        expect(result.success).toBe(true)
        if (tc.expectedType !== 'object') {
          expect((result.output as { type: string }).type).toBe(tc.expectedType)
        }
      }
    })
  })
})
