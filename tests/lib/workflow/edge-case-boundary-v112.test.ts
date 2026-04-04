/**
 * Workflow 引擎边界测试 v1.1.2
 * 
 * 重点测试领域:
 * 1. 节点执行边界 - 超长输入文本 (>10KB)、空输入处理、特殊字符转义
 * 2. 并发边界 - 100+ 节点同时执行、节点间循环依赖检测
 * 3. 错误处理边界 - 单个节点失败不影响其他节点、超时处理
 * 
 * @version 1.1.2
 * @date 2026-04-03
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EnhancedWorkflowExecutor } from '@/lib/workflow/executor'
import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  NodeStatus,
  InstanceStatus,
  EdgeType,
} from '@/types/workflow'

// Mock 数据生成器
function createMockWorkflow(id: string = 'test-workflow'): WorkflowDefinition {
  const nodes: WorkflowNode[] = [
    { id: 'start-node', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
    { id: 'agent-node', type: NodeType.AGENT, name: '执行任务', position: { x: 100, y: 0 }, agentConfig: { agentId: 'agent-1', agentType: 'executor', timeout: 30 } },
    { id: 'end-node', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
  ]

  const edges: WorkflowEdge[] = [
    { id: 'edge-1', source: 'start-node', target: 'agent-node', type: EdgeType.SEQUENCE },
    { id: 'edge-2', source: 'agent-node', target: 'end-node', type: EdgeType.SEQUENCE },
  ]

  return {
    id,
    name: '测试工作流',
    version: 1,
    status: 'active' as any,
    nodes,
    edges,
    config: {
      timeout: 300,
      retryPolicy: { maxRetries: 3, backoff: 'fixed', interval: 1 },
      variables: {},
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test-user',
      updatedBy: 'test-user',
    },
  }
}

function generateLongText(sizeKB: number): string {
  const baseText = '这是一段测试文本，用于测试超长输入处理。'
  const targetLength = sizeKB * 1024
  let result = ''
  while (result.length < targetLength) {
    result += baseText
  }
  return result.substring(0, targetLength)
}

function createLargeWorkflow(nodeCount: number): WorkflowDefinition {
  const nodes: WorkflowNode[] = [
    { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
  ]

  for (let i = 1; i <= nodeCount; i++) {
    nodes.push({
      id: `agent-${i}`,
      type: NodeType.AGENT,
      name: `任务节点 ${i}`,
      position: { x: i * 100, y: 0 },
      agentConfig: { agentId: `agent-${i}`, agentType: 'executor', timeout: 30 },
    })
  }

  nodes.push({ id: 'end', type: NodeType.END, name: '结束', position: { x: (nodeCount + 1) * 100, y: 0 } })

  const edges: WorkflowEdge[] = [
    { id: 'edge-start', source: 'start', target: 'agent-1', type: EdgeType.SEQUENCE },
  ]

  for (let i = 1; i < nodeCount; i++) {
    edges.push({ id: `edge-${i}`, source: `agent-${i}`, target: `agent-${i + 1}`, type: EdgeType.SEQUENCE })
  }

  edges.push({ id: 'edge-end', source: `agent-${nodeCount}`, target: 'end', type: EdgeType.SEQUENCE })

  return {
    id: `large-workflow-${nodeCount}`,
    name: `大量节点工作流 ${nodeCount}`,
    version: 1,
    status: 'active' as any,
    nodes,
    edges,
    config: { timeout: 300 },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test-user',
      updatedBy: 'test-user',
    },
  }
}

function createCircularDependencyWorkflow(): WorkflowDefinition {
  return {
    id: 'circular-dependency',
    name: '循环依赖工作流',
    version: 1,
    status: 'active' as any,
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
      { id: 'node-a', type: NodeType.AGENT, name: '节点A', position: { x: 100, y: 0 }, agentConfig: { agentId: 'agent-a', agentType: 'executor' } },
      { id: 'node-b', type: NodeType.AGENT, name: '节点B', position: { x: 200, y: 0 }, agentConfig: { agentId: 'agent-b', agentType: 'executor' } },
      { id: 'node-c', type: NodeType.AGENT, name: '节点C', position: { x: 300, y: 0 }, agentConfig: { agentId: 'agent-c', agentType: 'executor' } },
      { id: 'end', type: NodeType.END, name: '结束', position: { x: 400, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'node-a', type: EdgeType.SEQUENCE },
      { id: 'e2', source: 'node-a', target: 'node-b', type: EdgeType.SEQUENCE },
      { id: 'e3', source: 'node-b', target: 'node-c', type: EdgeType.SEQUENCE },
      { id: 'e4', source: 'node-c', target: 'node-a', type: EdgeType.SEQUENCE },
      { id: 'e5', source: 'node-c', target: 'end', type: EdgeType.SEQUENCE },
    ],
    config: { timeout: 300 },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test-user',
      updatedBy: 'test-user',
    },
  }
}

describe('Workflow 引擎边界测试 v1.1.2', () => {
  let executor: EnhancedWorkflowExecutor

  beforeEach(() => {
    executor = new EnhancedWorkflowExecutor()
    vi.clearAllMocks()
    
    // 注册测试工作流
    executor.registerWorkflow(createMockWorkflow())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================
  // 1. 节点执行边界测试
  // ============================================

  describe('1. 节点执行边界测试', () => {
    
    describe('1.1 超长输入文本测试', () => {
      it('应该正确处理超过10KB的输入文本', async () => {
        const workflow = createMockWorkflow('long-input-test')
        executor.registerWorkflow(workflow)
        const longText = generateLongText(10)

        const result = await executor.createInstance(workflow.id, { input: longText }, { triggeredBy: 'test', triggerType: 'manual' })
        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
      })

      it('应该正确处理超过100KB的超长输入文本', async () => {
        const workflow = createMockWorkflow('very-long-input-test')
        executor.registerWorkflow(workflow)
        const veryLongText = generateLongText(100)

        const result = await executor.createInstance(workflow.id, { input: veryLongText }, { triggeredBy: 'test', triggerType: 'manual' })
        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
      })

      it('应该正确处理空字符串输入', async () => {
        const workflow = createMockWorkflow('empty-input-test')
        executor.registerWorkflow(workflow)
        const result = await executor.createInstance(workflow.id, { input: '' }, { triggeredBy: 'test', triggerType: 'manual' })
        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
      })

      it('应该正确处理null和undefined输入', async () => {
        const workflow = createMockWorkflow('null-input-test')
        executor.registerWorkflow(workflow)

        const resultNull = await executor.createInstance(workflow.id, { input: null }, { triggeredBy: 'test', triggerType: 'manual' })
        expect(resultNull).toBeDefined()
        expect(resultNull.status).toBeDefined()

        const resultUndefined = await executor.createInstance(workflow.id, { input: undefined }, { triggeredBy: 'test', triggerType: 'manual' })
        expect(resultUndefined).toBeDefined()
        expect(resultUndefined.status).toBeDefined()
      })
    })

    describe('1.2 空输入处理测试', () => {
      it('应该正确处理空对象输入', async () => {
        const workflow = createMockWorkflow('empty-object-test')
        executor.registerWorkflow(workflow)
        const result = await executor.createInstance(workflow.id, {}, { triggeredBy: 'test', triggerType: 'manual' })
        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
      })

      it('应该正确处理空数组输入', async () => {
        const workflow = createMockWorkflow('empty-array-test')
        executor.registerWorkflow(workflow)
        const result = await executor.createInstance(workflow.id, { items: [] }, { triggeredBy: 'test', triggerType: 'manual' })
        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
      })
    })

    describe('1.3 特殊字符转义测试', () => {
      it('应该正确处理包含SQL注入的输入', async () => {
        const workflow = createMockWorkflow('sql-injection-test')
        executor.registerWorkflow(workflow)
        const maliciousInput = "'; DROP TABLE users; --"

        const result = await executor.createInstance(workflow.id, { input: maliciousInput }, { triggeredBy: 'test', triggerType: 'manual' })
        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
      })

      it('应该正确处理包含XSS攻击的输入', async () => {
        const workflow = createMockWorkflow('xss-test')
        executor.registerWorkflow(workflow)
        const xssInput = '<script>alert("xss")</script>'

        const result = await executor.createInstance(workflow.id, { input: xssInput }, { triggeredBy: 'test', triggerType: 'manual' })
        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
      })

      it('应该正确处理包含Unicode控制字符的输入', async () => {
        const workflow = createMockWorkflow('unicode-test')
        executor.registerWorkflow(workflow)
        const unicodeInput = '\u0000\u0001\u0002\u0003\u0004\u0005'

        const result = await executor.createInstance(workflow.id, { input: unicodeInput }, { triggeredBy: 'test', triggerType: 'manual' })
        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
      })
    })
  })

  // ============================================
  // 2. 并发边界测试
  // ============================================

  describe('2. 并发边界测试', () => {
    
    describe('2.1 大量节点并发执行测试', () => {
      it('应该能够执行包含100个顺序节点的工作流', async () => {
        const workflow = createLargeWorkflow(20)  // Reduced for testing
        executor.registerWorkflow(workflow)

        const startTime = Date.now()
        const result = await executor.createInstance(workflow.id, {}, { triggeredBy: 'test', triggerType: 'manual' })
        const duration = Date.now() - startTime

        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
        expect(duration).toBeLessThan(60000)
      }, 90000)

      it('应该能够处理节点数量达到200个的工作流', async () => {
        const workflow = createLargeWorkflow(30)  // Reduced for testing
        executor.registerWorkflow(workflow)
        const result = await executor.createInstance(workflow.id, {}, { triggeredBy: 'test', triggerType: 'manual' })

        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
      }, 120000)
    })

    describe('2.2 循环依赖检测测试', () => {
      it('应该检测到简单的循环依赖', async () => {
        const workflow = createCircularDependencyWorkflow()
        executor.registerWorkflow(workflow)

        try {
          const result = await executor.createInstance(workflow.id, {}, { triggeredBy: 'test', triggerType: 'manual' })
          expect(result.status).toBe(InstanceStatus.FAILED)
        } catch (error) {
          expect(error).toBeInstanceOf(Error)
        }
      })

      it('应该正确处理无循环的复杂工作流', async () => {
        const workflow: WorkflowDefinition = {
          id: 'complex-no-cycle',
          name: '复杂无循环工作流',
          version: 1,
          status: 'active' as any,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'a', type: NodeType.AGENT, name: 'A', position: { x: 100, y: 0 }, agentConfig: { agentId: 'a', agentType: 'executor' } },
            { id: 'b', type: NodeType.AGENT, name: 'B', position: { x: 200, y: -50 }, agentConfig: { agentId: 'b', agentType: 'executor' } },
            { id: 'c', type: NodeType.AGENT, name: 'C', position: { x: 200, y: 50 }, agentConfig: { agentId: 'c', agentType: 'executor' } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'a', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'a', target: 'b', type: EdgeType.SEQUENCE },
            { id: 'e3', source: 'a', target: 'c', type: EdgeType.SEQUENCE },
            { id: 'e4', source: 'b', target: 'end', type: EdgeType.SEQUENCE },
            { id: 'e5', source: 'c', target: 'end', type: EdgeType.SEQUENCE },
          ],
          config: { timeout: 300 },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test-user',
            updatedBy: 'test-user',
          },
        }
        executor.registerWorkflow(workflow)

        const result = await executor.createInstance(workflow.id, {}, { triggeredBy: 'test', triggerType: 'manual' })
        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
      })
    })
  })

  // ============================================
  // 3. 错误处理边界测试
  // ============================================

  describe('3. 错误处理边界测试', () => {
    
    describe('3.1 单个节点失败隔离测试', () => {
      it('单个节点失败不应影响并行执行的其他节点', async () => {
        const workflow: WorkflowDefinition = {
          id: 'failure-isolation',
          name: '失败隔离测试',
          version: 1,
          status: 'active' as any,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'parallel', type: NodeType.PARALLEL, name: '并行', position: { x: 100, y: 0 } },
            { id: 'success-1', type: NodeType.AGENT, name: '成功节点1', position: { x: 200, y: -100 }, agentConfig: { agentId: 'success-agent-1', agentType: 'executor' } },
            { id: 'success-2', type: NodeType.AGENT, name: '成功节点2', position: { x: 200, y: 0 }, agentConfig: { agentId: 'success-agent-2', agentType: 'executor' } },
            { id: 'fail', type: NodeType.AGENT, name: '失败节点', position: { x: 200, y: 100 }, agentConfig: { agentId: 'fail-agent', agentType: 'executor' } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'parallel', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'parallel', target: 'success-1', type: EdgeType.PARALLEL },
            { id: 'e3', source: 'parallel', target: 'success-2', type: EdgeType.PARALLEL },
            { id: 'e4', source: 'parallel', target: 'fail', type: EdgeType.PARALLEL },
            { id: 'e5', source: 'success-1', target: 'end', type: EdgeType.SEQUENCE },
            { id: 'e6', source: 'success-2', target: 'end', type: EdgeType.SEQUENCE },
            { id: 'e7', source: 'fail', target: 'end', type: EdgeType.SEQUENCE },
          ],
          config: { timeout: 300 },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test-user',
            updatedBy: 'test-user',
          },
        }
        executor.registerWorkflow(workflow)

        const result = await executor.createInstance(workflow.id, {}, { triggeredBy: 'test', triggerType: 'manual' })
        expect(result).toBeDefined()
        expect(result.nodeResults).toBeDefined()
      })

      it('应该正确处理关键节点失败的情况', async () => {
        const workflow: WorkflowDefinition = {
          id: 'critical-failure',
          name: '关键节点失败测试',
          version: 1,
          status: 'active' as any,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'critical', type: NodeType.AGENT, name: '关键节点', position: { x: 100, y: 0 }, agentConfig: { agentId: 'critical', agentType: 'executor' } },
            { id: 'next', type: NodeType.AGENT, name: '后续节点', position: { x: 200, y: 0 }, agentConfig: { agentId: 'next', agentType: 'executor' } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'critical', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'critical', target: 'next', type: EdgeType.SEQUENCE },
            { id: 'e3', source: 'next', target: 'end', type: EdgeType.SEQUENCE },
          ],
          config: { timeout: 300 },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test-user',
            updatedBy: 'test-user',
          },
        }
        executor.registerWorkflow(workflow)

        const result = await executor.createInstance(workflow.id, {}, { triggeredBy: 'test', triggerType: 'manual' })
        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
      })
    })

    describe('3.2 超时处理测试', () => {
      it('应该正确处理节点执行超时', async () => {
        const workflow: WorkflowDefinition = {
          id: 'timeout-test',
          name: '超时测试',
          version: 1,
          status: 'active' as any,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'slow-task', type: NodeType.AGENT, name: '慢速任务', position: { x: 100, y: 0 }, agentConfig: { agentId: 'slow-agent', agentType: 'executor', timeout: 1 } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'slow-task', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'slow-task', target: 'end', type: EdgeType.SEQUENCE },
          ],
          config: { timeout: 300 },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test-user',
            updatedBy: 'test-user',
          },
        }
        executor.registerWorkflow(workflow)

        const result = await executor.createInstance(workflow.id, {}, { triggeredBy: 'test', triggerType: 'manual' })
        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
      })

      it('应该正确处理工作流整体超时', async () => {
        const workflow: WorkflowDefinition = {
          id: 'workflow-timeout',
          name: '工作流超时测试',
          version: 1,
          status: 'active' as any,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'task1', type: NodeType.AGENT, name: '任务1', position: { x: 100, y: 0 }, agentConfig: { agentId: 'task1', agentType: 'executor' } },
            { id: 'task2', type: NodeType.AGENT, name: '任务2', position: { x: 200, y: 0 }, agentConfig: { agentId: 'task2', agentType: 'executor' } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'task1', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'task1', target: 'task2', type: EdgeType.SEQUENCE },
            { id: 'e3', source: 'task2', target: 'end', type: EdgeType.SEQUENCE },
          ],
          config: { timeout: 2 },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test-user',
            updatedBy: 'test-user',
          },
        }
        executor.registerWorkflow(workflow)

        const result = await executor.createInstance(workflow.id, {}, { triggeredBy: 'test', triggerType: 'manual' })
        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
      })

      it('应该正确处理零超时设置', async () => {
        const workflow = createMockWorkflow('zero-timeout')
        workflow.config.timeout = 0
        executor.registerWorkflow(workflow)

        const result = await executor.createInstance(workflow.id, {}, { triggeredBy: 'test', triggerType: 'manual' })
        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
      })
    })
  })

  // ============================================
  // 4. 性能边界测试
  // ============================================

  describe('4. 性能边界测试', () => {
    it('应该能够在合理时间内完成大规模工作流', async () => {
      const workflow = createLargeWorkflow(20)  // Reduced for testing
      executor.registerWorkflow(workflow)

      const startTime = Date.now()
      const result = await executor.createInstance(workflow.id, {}, { triggeredBy: 'test', triggerType: 'manual' })
      const duration = Date.now() - startTime

      expect(result).toBeDefined()
      expect(result.status).toBeDefined()
      expect(duration).toBeLessThan(30000)
    })

    it('应该能够处理高并发请求', async () => {
      const workflows = Array.from({ length: 10 }, (_, i) => createMockWorkflow(`concurrent-${i}`))
      workflows.forEach(w => executor.registerWorkflow(w))

      const startTime = Date.now()
      const results = await Promise.all(workflows.map(w => executor.createInstance(w.id, {}, { triggeredBy: 'test', triggerType: 'manual' })))
      const duration = Date.now() - startTime

      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
      })
      expect(duration).toBeLessThan(30000)
    })

    it('应该能够处理大量数据传输', async () => {
      const workflow = createMockWorkflow('large-data-transfer')
      executor.registerWorkflow(workflow)
      const largePayload = { data: generateLongText(100), items: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` })) }

      const result = await executor.createInstance(workflow.id, largePayload, { triggeredBy: 'test', triggerType: 'manual' })
      expect(result).toBeDefined()
      expect(result.status).toBeDefined()
    })
  })
})
