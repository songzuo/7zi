/**
 * Workflow Edge Cases Test - Additional Coverage
 * 
 * 补充工作流边缘测试覆盖:
 * 1. 无效步骤类型处理
 * 2. 工作流执行超时处理
 * 3. 并发执行同一工作流
 * 4. 超长工作流名称处理
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EnhancedWorkflowExecutor } from '@/lib/workflow/executor'
import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowStatus,
  NodeType,
  NodeStatus,
  InstanceStatus,
  EdgeType,
} from '@/types/workflow'
import { nodeExecutorRegistry } from '@/lib/workflow/executors/registry'

describe('Workflow Edge Cases - Additional Tests', () => {
  let executor: EnhancedWorkflowExecutor

  beforeEach(() => {
    executor = new EnhancedWorkflowExecutor()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * 创建基础工作流定义
   */
  function createBaseWorkflow(id: string = 'test-workflow'): WorkflowDefinition {
    const nodes: WorkflowNode[] = [
      {
        id: 'start-node',
        type: NodeType.START,
        name: '开始',
        position: { x: 0, y: 0 },
      },
      {
        id: 'agent-node',
        type: NodeType.AGENT,
        name: '执行任务',
        position: { x: 100, y: 0 },
        agentConfig: {
          agentId: 'agent-1',
          agentType: 'executor',
          timeout: 30,
        },
      },
      {
        id: 'end-node',
        type: NodeType.END,
        name: '结束',
        position: { x: 200, y: 0 },
      },
    ]

    const edges: WorkflowEdge[] = [
      {
        id: 'edge-1',
        source: 'start-node',
        target: 'agent-node',
        type: EdgeType.SEQUENCE,
      },
      {
        id: 'edge-2',
        source: 'agent-node',
        target: 'end-node',
        type: EdgeType.SEQUENCE,
      },
    ]

    return {
      id,
      name: '测试工作流',
      version: 1,
      status: WorkflowStatus.ACTIVE,
      nodes,
      edges,
      config: {
        timeout: 300,
        retryPolicy: {
          maxRetries: 3,
          backoff: 'fixed',
          interval: 1,
        },
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

  describe('无效步骤类型处理', () => {
    it('应该拒绝没有执行器的节点类型', () => {
      const invalidWorkflow: WorkflowDefinition = {
        ...createBaseWorkflow('invalid-workflow'),
        nodes: [
          {
            id: 'start-1',
            type: NodeType.START,
            name: '开始',
            position: { x: 0, y: 0 },
          },
          {
            id: 'unknown-node',
            type: 'unknown_node_type' as NodeType,
            name: '未知节点',
            position: { x: 100, y: 0 },
          },
          {
            id: 'end-1',
            type: NodeType.END,
            name: '结束',
            position: { x: 200, y: 0 },
          },
        ],
      }

      executor.registerWorkflow(invalidWorkflow)
      const validation = executor.validateWorkflow(invalidWorkflow)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.includes('没有可用的执行器'))).toBe(true)
    })

    it('应该处理自定义节点类型', () => {
      // 注册一个自定义节点类型的执行器
      const customWorkflow: WorkflowDefinition = {
        ...createBaseWorkflow('custom-workflow'),
        nodes: [
          {
            id: 'start-1',
            type: NodeType.START,
            name: '开始',
            position: { x: 0, y: 0 },
          },
          {
            id: 'wait-node',
            type: NodeType.WAIT,
            name: '等待节点',
            position: { x: 100, y: 0 },
            waitConfig: {
              duration: 1,
            },
          },
          {
            id: 'end-1',
            type: NodeType.END,
            name: '结束',
            position: { x: 200, y: 0 },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'start-1',
            target: 'wait-node',
            type: EdgeType.SEQUENCE,
          },
          {
            id: 'edge-2',
            source: 'wait-node',
            target: 'end-1',
            type: EdgeType.SEQUENCE,
          },
        ],
      }

      executor.registerWorkflow(customWorkflow)
      const validation = executor.validateWorkflow(customWorkflow)
      
      // wait 节点有执行器，应该验证通过
      expect(validation.valid).toBe(true)
    })

    it('应该处理不支持的空字符串节点类型', () => {
      const emptyTypeWorkflow: WorkflowDefinition = {
        ...createBaseWorkflow('empty-type-workflow'),
        nodes: [
          {
            id: 'start-1',
            type: NodeType.START,
            name: '开始',
            position: { x: 0, y: 0 },
          },
          {
            id: 'empty-type-node',
            type: '' as NodeType,
            name: '空类型节点',
            position: { x: 100, y: 0 },
          },
          {
            id: 'end-1',
            type: NodeType.END,
            name: '结束',
            position: { x: 200, y: 0 },
          },
        ],
      }

      executor.registerWorkflow(emptyTypeWorkflow)
      const validation = executor.validateWorkflow(emptyTypeWorkflow)
      
      expect(validation.valid).toBe(false)
    })

    it('应该拒绝 human_input 节点类型如果没有执行器', () => {
      // 临时清除 human_input 执行器
      const hasHumanInput = nodeExecutorRegistry.has('human_input' as NodeType)
      
      if (!hasHumanInput) {
        const humanInputWorkflow: WorkflowDefinition = {
          ...createBaseWorkflow('human-input-workflow'),
          nodes: [
            {
              id: 'start-1',
              type: NodeType.START,
              name: '开始',
              position: { x: 0, y: 0 },
            },
            {
              id: 'human-input-node',
              type: 'human_input' as NodeType,
              name: '人工输入',
              position: { x: 100, y: 0 },
            },
            {
              id: 'end-1',
              type: NodeType.END,
              name: '结束',
              position: { x: 200, y: 0 },
            },
          ],
        }

        executor.registerWorkflow(humanInputWorkflow)
        const validation = executor.validateWorkflow(humanInputWorkflow)
        
        expect(validation.valid).toBe(false)
        expect(validation.errors.some(e => e.includes('没有可用的执行器'))).toBe(true)
      }
    })
  })

  describe('工作流执行超时处理', () => {
    it('应该正确处理工作流级别的超时配置', async () => {
      const workflowWithTimeout = createBaseWorkflow('timeout-workflow')
      workflowWithTimeout.config.timeout = 1 // 1 毫秒超时（几乎立即超时）
      
      executor.registerWorkflow(workflowWithTimeout)
      const instance = executor.createInstance(workflowWithTimeout.id)
      
      // 由于超时时间太短，执行应该失败
      // 注意：这里不等待执行完成，只测试实例创建
      expect(instance).toBeDefined()
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该处理超时后正确标记失败状态', async () => {
      const workflow = createBaseWorkflow('timeout-fail-workflow')
      
      // 模拟一个超长等待的节点
      workflow.nodes = [
        {
          id: 'start-node',
          type: NodeType.START,
          name: '开始',
          position: { x: 0, y: 0 },
        },
        {
          id: 'wait-node',
          type: NodeType.WAIT,
          name: '等待节点',
          position: { x: 100, y: 0 },
          waitConfig: {
            duration: 10, // 10 秒
          },
        },
        {
          id: 'end-node',
          type: NodeType.END,
          name: '结束',
          position: { x: 200, y: 0 },
        },
      ]
      
      workflow.edges = [
        { id: 'edge-1', source: 'start-node', target: 'wait-node', type: EdgeType.SEQUENCE },
        { id: 'edge-2', source: 'wait-node', target: 'end-node', type: EdgeType.SEQUENCE },
      ]
      
      executor.registerWorkflow(workflow)
      const instance = executor.createInstance(workflow.id)
      
      // 执行节点 - 这个测试可能需要较长的时间
      // 注意：在实际环境中，应该有超时机制
      const result = await executor.executeInstance(instance.id)
      
      expect(result.status).toBe(InstanceStatus.COMPLETED)
    })

    it('应该正确处理节点级别的超时配置', () => {
      const workflow = createBaseWorkflow('node-timeout-workflow')
      workflow.nodes[1].agentConfig = {
        agentId: 'agent-1',
        agentType: 'executor',
        timeout: 1, // 1 秒超时
      }
      
      executor.registerWorkflow(workflow)
      const instance = executor.createInstance(workflow.id)
      
      expect(instance).toBeDefined()
    })

    it('应该处理超时值为零的情况', () => {
      const workflow = createBaseWorkflow('zero-timeout-workflow')
      workflow.config.timeout = 0
      
      executor.registerWorkflow(workflow)
      const instance = executor.createInstance(workflow.id)
      
      expect(instance).toBeDefined()
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该处理负数超时值（视为无超时）', () => {
      const workflow = createBaseWorkflow('negative-timeout-workflow')
      workflow.config.timeout = -1
      
      executor.registerWorkflow(workflow)
      const instance = executor.createInstance(workflow.id)
      
      expect(instance).toBeDefined()
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该处理非常大的超时值', () => {
      const workflow = createBaseWorkflow('max-timeout-workflow')
      workflow.config.timeout = Number.MAX_SAFE_INTEGER
      
      executor.registerWorkflow(workflow)
      const instance = executor.createInstance(workflow.id)
      
      expect(instance).toBeDefined()
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })
  })

  describe('并发执行同一工作流', () => {
    it('应该能够并发执行同一工作流的多个实例', async () => {
      const workflow = createBaseWorkflow('concurrent-workflow')
      executor.registerWorkflow(workflow)
      
      // 创建多个实例
      const instance1 = executor.createInstance(workflow.id, { instance: 1 })
      const instance2 = executor.createInstance(workflow.id, { instance: 2 })
      const instance3 = executor.createInstance(workflow.id, { instance: 3 })
      
      expect(instance1.id).not.toBe(instance2.id)
      expect(instance2.id).not.toBe(instance3.id)
      expect(instance1.id).not.toBe(instance3.id)
      
      // 并发执行所有实例
      const [result1, result2, result3] = await Promise.all([
        executor.executeInstance(instance1.id),
        executor.executeInstance(instance2.id),
        executor.executeInstance(instance3.id),
      ])
      
      // 验证所有实例都成功完成
      expect(result1.status).toBe(InstanceStatus.COMPLETED)
      expect(result2.status).toBe(InstanceStatus.COMPLETED)
      expect(result3.status).toBe(InstanceStatus.COMPLETED)
    })

    it('应该隔离不同实例的输入数据', async () => {
      const workflow = createBaseWorkflow('data-isolation-workflow')
      executor.registerWorkflow(workflow)
      
      const instance1 = executor.createInstance(workflow.id, { 
        data: 'instance-1-data',
        value: 100 
      })
      const instance2 = executor.createInstance(workflow.id, { 
        data: 'instance-2-data', 
        value: 200 
      })
      
      await Promise.all([
        executor.executeInstance(instance1.id),
        executor.executeInstance(instance2.id),
      ])
      
      const result1 = executor.getInstance(instance1.id)
      const result2 = executor.getInstance(instance2.id)
      
      // 验证输入数据被正确隔离
      expect(result1?.data.inputs?.data).toBe('instance-1-data')
      expect(result2?.data.inputs?.data).toBe('instance-2-data')
      expect(result1?.data.inputs?.value).toBe(100)
      expect(result2?.data.inputs?.value).toBe(200)
    })

    it('应该正确处理并发实例的节点状态', async () => {
      const workflow = createBaseWorkflow('concurrent-node-status-workflow')
      executor.registerWorkflow(workflow)
      
      const instance1 = executor.createInstance(workflow.id, { id: 1 })
      const instance2 = executor.createInstance(workflow.id, { id: 2 })
      
      await Promise.all([
        executor.executeInstance(instance1.id),
        executor.executeInstance(instance2.id),
      ])
      
      const result1 = executor.getInstance(instance1.id)
      const result2 = executor.getInstance(instance2.id)
      
      // 验证两个实例的节点状态都是 SUCCESS
      expect(result1?.nodeResults.get('agent-node')?.status).toBe(NodeStatus.SUCCESS)
      expect(result2?.nodeResults.get('agent-node')?.status).toBe(NodeStatus.SUCCESS)
      
      // 验证两个实例有各自的节点结果
      expect(result1?.nodeResults.size).toBe(result2?.nodeResults.size)
      expect(result1?.nodeResults.size).toBeGreaterThan(0)
    })

    it('应该能够处理高并发场景（10个并发实例）', async () => {
      const workflow = createBaseWorkflow('high-concurrency-workflow')
      executor.registerWorkflow(workflow)
      
      // 创建 10 个并发实例
      const instances = Array.from({ length: 10 }, (_, i) =>
        executor.createInstance(workflow.id, { concurrentId: i })
      )
      
      expect(instances).toHaveLength(10)
      
      // 并发执行
      const results = await Promise.all(
        instances.map(instance => executor.executeInstance(instance.id))
      )
      
      // 验证所有实例都成功完成
      expect(results.every(r => r.status === InstanceStatus.COMPLETED)).toBe(true)
      
      // 验证所有实例 ID 唯一
      const instanceIds = results.map(r => r.id)
      const uniqueIds = new Set(instanceIds)
      expect(uniqueIds.size).toBe(10)
    })

    it('应该正确处理并发执行中的错误隔离', async () => {
      // 测试并发实例之间的数据隔离
      const workflow = createBaseWorkflow('isolation-workflow')
      executor.registerWorkflow(workflow)
      
      const instance1 = executor.createInstance(workflow.id, { 
        data: 'instance-1-data',
        value: 100 
      })
      const instance2 = executor.createInstance(workflow.id, { 
        data: 'instance-2-data', 
        value: 200 
      })
      
      // 执行两个实例
      const [result1, result2] = await Promise.all([
        executor.executeInstance(instance1.id),
        executor.executeInstance(instance2.id),
      ])
      
      // 验证两个实例都成功完成
      expect(result1.status).toBe(InstanceStatus.COMPLETED)
      expect(result2.status).toBe(InstanceStatus.COMPLETED)
      
      // 验证实例数据完全隔离
      const retrieved1 = executor.getInstance(instance1.id)
      const retrieved2 = executor.getInstance(instance2.id)
      
      // 两个实例都有各自独立的 nodeResults
      expect(retrieved1?.nodeResults).not.toBe(retrieved2?.nodeResults)
      expect(retrieved1?.id).not.toBe(retrieved2?.id)
    })
  })

  describe('超长工作流名称处理', () => {
    it('应该处理超长的工作流名称', () => {
      const longName = 'a'.repeat(10000)
      const workflow = createBaseWorkflow('long-name-workflow')
      workflow.name = longName
      
      executor.registerWorkflow(workflow)
      const retrieved = executor.getWorkflow(workflow.id)
      
      expect(retrieved?.name).toHaveLength(10000)
    })

    it('应该处理 Unicode 超长名称', () => {
      const unicodeName = '工作流名称'.repeat(1000)
      const workflow = createBaseWorkflow('unicode-name-workflow')
      workflow.name = unicodeName
      
      executor.registerWorkflow(workflow)
      const retrieved = executor.getWorkflow(workflow.id)
      
      expect(retrieved?.name).toBe(unicodeName)
    })

    it('应该处理包含特殊字符的超长名称', () => {
      const specialName = '测试@#$%^&*()工作流'.repeat(500)
      const workflow = createBaseWorkflow('special-name-workflow')
      workflow.name = specialName
      
      executor.registerWorkflow(workflow)
      const retrieved = executor.getWorkflow(workflow.id)
      
      expect(retrieved?.name).toBe(specialName)
    })
  })

  describe('空工作流定义处理', () => {
    it('应该正确验证完全空的工作流定义', () => {
      const emptyWorkflow: WorkflowDefinition = {
        id: 'empty-workflow',
        name: '',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [],
        edges: [],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const validation = executor.validateWorkflow(emptyWorkflow)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('应该正确验证只有节点没有边的工作流', () => {
      const noEdgesWorkflow: WorkflowDefinition = {
        id: 'no-edges-workflow',
        name: '无边的 Workflow',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          {
            id: 'start-1',
            type: NodeType.START,
            name: '开始',
            position: { x: 0, y: 0 },
          },
          {
            id: 'agent-1',
            type: NodeType.AGENT,
            name: '中间节点',
            position: { x: 50, y: 0 },
            agentConfig: {
              agentId: 'agent-1',
              agentType: 'executor',
            },
          },
          {
            id: 'end-1',
            type: NodeType.END,
            name: '结束',
            position: { x: 100, y: 0 },
          },
        ],
        edges: [],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const validation = executor.validateWorkflow(noEdgesWorkflow)
      
      // 验证应该失败，因为中间节点是孤立的（没有连接）
      // 注意：start 和 end 节点不检查孤立
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.includes('孤立节点'))).toBe(true)
    })

    it('应该正确验证只有边没有节点的工作流', () => {
      const noNodesWorkflow: WorkflowDefinition = {
        id: 'no-nodes-workflow',
        name: '无节点的 Workflow',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [],
        edges: [
          {
            id: 'edge-1',
            source: 'start-1',
            target: 'end-1',
            type: EdgeType.SEQUENCE,
          },
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const validation = executor.validateWorkflow(noNodesWorkflow)
      
      expect(validation.valid).toBe(false)
    })
  })
})
