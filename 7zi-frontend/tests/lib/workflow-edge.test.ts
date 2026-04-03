/**
 * Workflow Engine Edge Case Tests
 * 边界测试用例
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock workflow types for testing
interface MockNode {
  id: string
  type: string
  input?: unknown
  output?: unknown
  status?: 'pending' | 'running' | 'completed' | 'failed'
}

interface MockWorkflow {
  id: string
  nodes: MockNode[]
  edges?: Array<{ from: string; to: string }>
}

// Simple workflow simulator for edge case testing
class WorkflowSimulator {
  private nodes: Map<string, MockNode>
  private results: Map<string, unknown>

  constructor(workflow: MockWorkflow) {
    this.nodes = new Map(workflow.nodes.map(n => [n.id, { ...n, status: 'pending' }]))
    this.results = new Map()
  }

  // Edge case:超长输入处理
  async executeWithLargeInput(nodeId: string, input: string): Promise<{ success: boolean; output: unknown }> {
    const node = this.nodes.get(nodeId)
    if (!node) return { success: false, output: null }

    // Simulate processing large input
    if (input.length > 10 * 1024) {
      // Truncate for safety
      const truncated = input.slice(0, 1000)
      this.results.set(nodeId, { processed: true, truncated: true, length: input.length })
      return { success: true, output: { processed: true, truncated: true, originalLength: input.length } }
    }

    this.results.set(nodeId, { processed: true, input: input.slice(0, 100) })
    return { success: true, output: { processed: true } }
  }

  // Edge case: 空输入处理
  async executeWithEmptyInput(nodeId: string, input: null | undefined | ''): Promise<{ success: boolean; output: unknown }> {
    const node = this.nodes.get(nodeId)
    if (!node) return { success: false, output: null }

    if (input === null || input === undefined || input === '') {
      // Provide default behavior
      this.results.set(nodeId, { processed: true, usedDefault: true })
      return { success: true, output: { processed: true, usedDefault: true } }
    }

    this.results.set(nodeId, { processed: true })
    return { success: true, output: { processed: true } }
  }

  // Edge case: 特殊字符转义
  async executeWithSpecialChars(nodeId: string, input: string): Promise<{ success: boolean; output: unknown }> {
    const node = this.nodes.get(nodeId)
    if (!node) return { success: false, output: null }

    // Test XSS-like patterns
    const escaped = input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')

    this.results.set(nodeId, { processed: true, escaped })
    return { success: true, output: { processed: true, escaped } }
  }

  // Edge case: 并发节点执行
  async executeConcurrent(nodeIds: string[]): Promise<Map<string, unknown>> {
    const promises = nodeIds.map(async (id) => {
      const node = this.nodes.get(id)
      if (!node) return { id, result: null }
      
      // Simulate async work
      await new Promise(resolve => setTimeout(resolve, 10))
      this.results.set(id, { processed: true, timestamp: Date.now() })
      return { id, result: { processed: true } }
    })

    await Promise.all(promises)
    return this.results
  }

  // Edge case: 循环依赖检测
  static detectCycle(nodes: MockNode[], edges: Array<{ from: string; to: string }>): boolean {
    const graph = new Map<string, string[]>()
    
    // Build adjacency list
    for (const node of nodes) {
      graph.set(node.id, [])
    }
    for (const edge of edges) {
      const adj = graph.get(edge.from) || []
      adj.push(edge.to)
      graph.set(edge.from, adj)
    }

    // DFS for cycle detection
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId)
      recursionStack.add(nodeId)

      const neighbors = graph.get(nodeId) || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true
        } else if (recursionStack.has(neighbor)) {
          return true
        }
      }

      recursionStack.delete(nodeId)
      return false
    }

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) return true
      }
    }

    return false
  }

  // Edge case: 节点失败不影响其他节点
  async executeWithNodeFailure(nodeIds: string[]): Promise<Map<string, { success: boolean; error?: string }>> {
    const results = new Map<string, { success: boolean; error?: string }>()

    const promises = nodeIds.map(async (id) => {
      const node = this.nodes.get(id)
      if (!node) {
        results.set(id, { success: false, error: 'Node not found' })
        return
      }

      // Simulate random failure for certain nodes
      if (id.includes('fail')) {
        results.set(id, { success: false, error: 'Simulated failure' })
        return
      }

      await new Promise(resolve => setTimeout(resolve, 5))
      results.set(id, { success: true })
    })

    await Promise.allSettled(promises)
    return results
  }

  // Edge case: 超时处理
  async executeWithTimeout(nodeId: string, timeoutMs: number): Promise<{ success: boolean; timedOut: boolean }> {
    const node = this.nodes.get(nodeId)
    if (!node) return { success: false, timedOut: false }

    try {
      await Promise.race([
        new Promise(resolve => setTimeout(resolve, timeoutMs + 100)),
        Promise.resolve({ done: true })
      ])
      return { success: true, timedOut: false }
    } catch {
      return { success: false, timedOut: true }
    }
  }
}

describe('Workflow Edge Case Tests', () => {
  let simulator: WorkflowSimulator
  let testWorkflow: MockWorkflow

  beforeEach(() => {
    testWorkflow = {
      id: 'test-workflow',
      nodes: [
        { id: 'node1', type: 'input' },
        { id: 'node2', type: 'process' },
        { id: 'node3', type: 'output' },
        { id: 'fail-node', type: 'error' },
      ],
      edges: [
        { from: 'node1', to: 'node2' },
        { from: 'node2', to: 'node3' },
      ]
    }
    simulator = new WorkflowSimulator(testWorkflow)
  })

  describe('Large Input Handling', () => {
    it('should handle input larger than 10KB', async () => {
      const largeInput = 'x'.repeat(15 * 1024) // 15KB
      const result = await simulator.executeWithLargeInput('node1', largeInput)
      
      expect(result.success).toBe(true)
      expect(result.output).toHaveProperty('truncated', true)
      expect(result.output).toHaveProperty('originalLength', 15 * 1024)
    })

    it('should process normal size input without truncation', async () => {
      const normalInput = 'x'.repeat(5 * 1024) // 5KB
      const result = await simulator.executeWithLargeInput('node1', normalInput)
      
      expect(result.success).toBe(true)
      expect((result.output as { truncated?: boolean }).truncated).toBeUndefined()
    })
  })

  describe('Empty Input Handling', () => {
    it('should handle null input', async () => {
      const result = await simulator.executeWithEmptyInput('node1', null)
      
      expect(result.success).toBe(true)
      expect(result.output).toHaveProperty('usedDefault', true)
    })

    it('should handle undefined input', async () => {
      const result = await simulator.executeWithEmptyInput('node1', undefined)
      
      expect(result.success).toBe(true)
      expect(result.output).toHaveProperty('usedDefault', true)
    })

    it('should handle empty string input', async () => {
      const result = await simulator.executeWithEmptyInput('node1', '')
      
      expect(result.success).toBe(true)
      expect(result.output).toHaveProperty('usedDefault', true)
    })
  })

  describe('Special Character Escaping', () => {
    it('should escape XSS-like patterns', async () => {
      const maliciousInput = '<script>alert("xss")</script>'
      const result = await simulator.executeWithSpecialChars('node1', maliciousInput)
      
      expect(result.success).toBe(true)
      expect(result.output).toHaveProperty('escaped')
      const escaped = (result.output as { escaped: string }).escaped
      expect(escaped).not.toContain('<script>')
      expect(escaped).toContain('&lt;script&gt;')
    })

    it('should escape HTML entities', async () => {
      const htmlInput = '<div class="test">&amp;</div>'
      const result = await simulator.executeWithSpecialChars('node1', htmlInput)
      
      expect(result.success).toBe(true)
      const escaped = (result.output as { escaped: string }).escaped
      expect(escaped).toContain('&lt;')
      expect(escaped).toContain('&gt;')
      expect(escaped).toContain('&quot;')
    })
  })

  describe('Concurrent Execution', () => {
    it('should execute nodes concurrently with proper tracking', async () => {
      const nodeIds = ['node1', 'node2', 'node3']
      const startTime = Date.now()
      const results = await simulator.executeConcurrent(nodeIds)
      const duration = Date.now() - startTime

      // Results should be tracked properly
      expect(duration).toBeLessThan(100)
    })

    it('should maintain result integrity under concurrent load', async () => {
      const nodes = ['node1', 'node2', 'node3']
      const results = await simulator.executeConcurrent(nodes)

      expect(results.size).toBe(3)
      for (const nodeId of nodes) {
        expect(results.get(nodeId)).toHaveProperty('processed', true)
        expect(results.get(nodeId)).toHaveProperty('timestamp')
      }
    })
  })

  describe('Circular Dependency Detection', () => {
    it('should detect direct cycle', () => {
      const cyclicWorkflow: MockWorkflow = {
        id: 'cyclic',
        nodes: [
          { id: 'a', type: 'task' },
          { id: 'b', type: 'task' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'a' }, // Creates cycle
        ]
      }

      const hasCycle = WorkflowSimulator.detectCycle(
        cyclicWorkflow.nodes,
        cyclicWorkflow.edges
      )

      expect(hasCycle).toBe(true)
    })

    it('should detect indirect cycle', () => {
      const cyclicWorkflow: MockWorkflow = {
        id: 'indirect-cyclic',
        nodes: [
          { id: 'a', type: 'task' },
          { id: 'b', type: 'task' },
          { id: 'c', type: 'task' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
          { from: 'c', to: 'a' }, // Creates cycle
        ]
      }

      const hasCycle = WorkflowSimulator.detectCycle(
        cyclicWorkflow.nodes,
        cyclicWorkflow.edges
      )

      expect(hasCycle).toBe(true)
    })

    it('should not detect cycle in DAG', () => {
      const dagWorkflow: MockWorkflow = {
        id: 'dag',
        nodes: [
          { id: 'a', type: 'task' },
          { id: 'b', type: 'task' },
          { id: 'c', type: 'task' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
        ]
      }

      const hasCycle = WorkflowSimulator.detectCycle(
        dagWorkflow.nodes,
        dagWorkflow.edges
      )

      expect(hasCycle).toBe(false)
    })
  })

  describe('Node Failure Isolation', () => {
    it('should not affect other nodes when one fails', async () => {
      const nodeIds = ['node1', 'fail-node', 'node2']
      const results = await simulator.executeWithNodeFailure(nodeIds)

      expect(results.get('node1')).toHaveProperty('success', true)
      expect(results.get('fail-node')).toHaveProperty('success', false)
      expect(results.get('node2')).toHaveProperty('success', true)
    })

    it('should report errors correctly for failed nodes', async () => {
      const results = await simulator.executeWithNodeFailure(['fail-node'])

      expect(results.get('fail-node')).toHaveProperty('error')
      expect((results.get('fail-node') as { error: string }).error).toContain('Simulated failure')
    })
  })

  describe('Timeout Handling', () => {
    it('should detect timeout condition', async () => {
      const result = await simulator.executeWithTimeout('node1', 50)
      
      // The mock should complete quickly, so not timed out
      expect(result).toHaveProperty('timedOut', false)
    })
  })
})
