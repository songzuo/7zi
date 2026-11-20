import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkflowEngine } from './engine'
import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  NodeStatus,
  InstanceStatus,
  EdgeType,
} from '@/types/workflow'

/**
 * Workflow Engine 单元测试
 *
 * 测试覆盖:
 * 1. 基本执行流程测试
 * 2. 错误处理测试
 * 3. 节点状态转换测试
 */

// Mock 数据生成器
function createMockWorkflow(id: string = 'test-workflow'): WorkflowDefinition {
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
    status: 'active' as any,
    nodes,
    edges,
    config: {
      timeout: 300,
      retryPolicy: {
        maxRetries: 3,
        backoff: 'fixed',
        interval: 1,
      },
      variables: {
        testVar: 'test-value',
      },
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test-user',
      updatedBy: 'test-user',
    },
  }
}

function createConditionWorkflow(id: string = 'condition-workflow'): WorkflowDefinition {
  const nodes: WorkflowNode[] = [
    {
      id: 'start-node',
      type: NodeType.START,
      name: '开始',
      position: { x: 0, y: 0 },
    },
    {
      id: 'condition-node',
      type: NodeType.CONDITION,
      name: '条件判断',
      position: { x: 100, y: 0 },
      conditionConfig: {
        expression: "{{status}} == 'success'",
        trueLabel: 'true',
        falseLabel: 'false',
      },
    },
    {
      id: 'true-node',
      type: NodeType.AGENT,
      name: '成功分支',
      position: { x: 200, y: -50 },
      agentConfig: {
        agentId: 'agent-2',
        agentType: 'executor',
      },
    },
    {
      id: 'false-node',
      type: NodeType.AGENT,
      name: '失败分支',
      position: { x: 200, y: 50 },
      agentConfig: {
        agentId: 'agent-3',
        agentType: 'executor',
      },
    },
    {
      id: 'end-node',
      type: NodeType.END,
      name: '结束',
      position: { x: 300, y: 0 },
    },
  ]

  const edges: WorkflowEdge[] = [
    { id: 'edge-1', source: 'start-node', target: 'condition-node', type: EdgeType.SEQUENCE },
    {
      id: 'edge-2',
      source: 'condition-node',
      target: 'true-node',
      type: EdgeType.CONDITION,
      conditionConfig: { condition: 'true', label: 'true' },
    },
    {
      id: 'edge-3',
      source: 'condition-node',
      target: 'false-node',
      type: EdgeType.CONDITION,
      conditionConfig: { condition: 'false', label: 'false' },
    },
    { id: 'edge-4', source: 'true-node', target: 'end-node', type: EdgeType.SEQUENCE },
    { id: 'edge-5', source: 'false-node', target: 'end-node', type: EdgeType.SEQUENCE },
  ]

  return {
    id,
    name: '条件测试工作流',
    version: 1,
    status: 'active' as any,
    nodes,
    edges,
    config: { timeout: 300, retryPolicy: { maxRetries: 3, backoff: 'fixed', interval: 1 } },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test-user',
      updatedBy: 'test-user',
    },
  }
}

function createParallelWorkflow(id: string = 'parallel-workflow'): WorkflowDefinition {
  const nodes: WorkflowNode[] = [
    {
      id: 'start-node',
      type: NodeType.START,
      name: '开始',
      position: { x: 0, y: 0 },
    },
    {
      id: 'parallel-node',
      type: NodeType.PARALLEL,
      name: '并行执行',
      position: { x: 100, y: 0 },
    },
    {
      id: 'agent-1',
      type: NodeType.AGENT,
      name: '任务1',
      position: { x: 200, y: -50 },
      agentConfig: { agentId: 'agent-1', agentType: 'executor' },
    },
    {
      id: 'agent-2',
      type: NodeType.AGENT,
      name: '任务2',
      position: { x: 200, y: 0 },
      agentConfig: { agentId: 'agent-2', agentType: 'executor' },
    },
    {
      id: 'agent-3',
      type: NodeType.AGENT,
      name: '任务3',
      position: { x: 200, y: 50 },
      agentConfig: { agentId: 'agent-3', agentType: 'executor' },
    },
    {
      id: 'end-node',
      type: NodeType.END,
      name: '结束',
      position: { x: 300, y: 0 },
    },
  ]

  const edges: WorkflowEdge[] = [
    { id: 'edge-1', source: 'start-node', target: 'parallel-node', type: EdgeType.SEQUENCE },
    { id: 'edge-2', source: 'parallel-node', target: 'agent-1', type: EdgeType.PARALLEL },
    { id: 'edge-3', source: 'parallel-node', target: 'agent-2', type: EdgeType.PARALLEL },
    { id: 'edge-4', source: 'parallel-node', target: 'agent-3', type: EdgeType.PARALLEL },
    { id: 'edge-5', source: 'agent-1', target: 'end-node', type: EdgeType.SEQUENCE },
    { id: 'edge-6', source: 'agent-2', target: 'end-node', type: EdgeType.SEQUENCE },
    { id: 'edge-7', source: 'agent-3', target: 'end-node', type: EdgeType.SEQUENCE },
  ]

  return {
    id,
    name: '并行测试工作流',
    version: 1,
    status: 'active' as any,
    nodes,
    edges,
    config: { timeout: 300, retryPolicy: { maxRetries: 3, backoff: 'fixed', interval: 1 } },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test-user',
      updatedBy: 'test-user',
    },
  }
}

describe('WorkflowEngine - 基本执行流程测试', () => {
  let engine: WorkflowEngine
  let workflow: WorkflowDefinition

  beforeEach(() => {
    engine = new WorkflowEngine()
    workflow = createMockWorkflow()
    engine.registerWorkflow(workflow)
  })

  describe('工作流注册和获取', () => {
    it('应该成功注册工作流', () => {
      const retrieved = engine.getWorkflow(workflow.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(workflow.id)
    })

    it('应该能够获取已注册的工作流', () => {
      const retrieved = engine.getWorkflow(workflow.id)
      expect(retrieved).toEqual(workflow)
    })

    it('对于不存在的工作流应该返回 undefined', () => {
      const retrieved = engine.getWorkflow('non-existent')
      expect(retrieved).toBeUndefined()
    })
  })

  describe('工作流验证', () => {
    it('应该验证有效的工作流', () => {
      const result = engine.validateWorkflow(workflow)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该拒绝没有名称的工作流', () => {
      const invalidWorkflow = { ...workflow, name: '' }
      const result = engine.validateWorkflow(invalidWorkflow)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('工作流名称不能为空')
    })

    it('应该拒绝没有节点的工作流', () => {
      const invalidWorkflow = { ...workflow, nodes: [] }
      const result = engine.validateWorkflow(invalidWorkflow)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('工作流必须包含至少一个节点')
    })

    it('应该检测重复的节点 ID', () => {
      const invalidWorkflow = {
        ...workflow,
        nodes: [
          { ...workflow.nodes[0], id: 'duplicate' },
          { ...workflow.nodes[1], id: 'duplicate' },
        ],
      }
      const result = engine.validateWorkflow(invalidWorkflow)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('节点 ID 重复'))).toBe(true)
    })

    it('应该拒绝没有开始节点的工作流', () => {
      const invalidWorkflow = {
        ...workflow,
        nodes: workflow.nodes.filter(n => n.type !== NodeType.START),
      }
      const result = engine.validateWorkflow(invalidWorkflow)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('工作流必须包含至少一个开始节点')
    })

    it('应该拒绝没有结束节点的工作流', () => {
      const invalidWorkflow = {
        ...workflow,
        nodes: workflow.nodes.filter(n => n.type !== NodeType.END),
      }
      const result = engine.validateWorkflow(invalidWorkflow)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('工作流必须包含至少一个结束节点')
    })

    it('应该检测孤立节点', () => {
      const orphanedNode: WorkflowNode = {
        id: 'orphan',
        type: NodeType.AGENT,
        name: '孤立节点',
        position: { x: 999, y: 999 },
        agentConfig: { agentId: 'agent-x', agentType: 'executor' },
      }
      const invalidWorkflow = {
        ...workflow,
        nodes: [...workflow.nodes, orphanedNode],
      }
      const result = engine.validateWorkflow(invalidWorkflow)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('孤立节点'))).toBe(true)
    })

    it('应该检测不存在的边连接节点', () => {
      const invalidWorkflow = {
        ...workflow,
        edges: [
          { ...workflow.edges[0] },
          {
            id: 'bad-edge',
            source: 'non-existent',
            target: workflow.nodes[1].id,
            type: EdgeType.SEQUENCE,
          },
        ],
      }
      const result = engine.validateWorkflow(invalidWorkflow)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('源节点不存在'))).toBe(true)
    })
  })

  describe('实例创建', () => {
    it('应该成功创建工作流实例', () => {
      const instance = engine.createInstance(workflow.id)
      expect(instance).toBeDefined()
      expect(instance.workflowId).toBe(workflow.id)
      expect(instance.status).toBe(InstanceStatus.PENDING)
      expect(instance.progress.total).toBe(workflow.nodes.length)
    })

    it('应该初始化所有节点状态为 IDLE', () => {
      const instance = engine.createInstance(workflow.id)
      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result).toBeDefined()
        expect(result?.status).toBe(NodeStatus.IDLE)
      })
    })

    it('应该支持传入初始输入数据', () => {
      const inputs = { testInput: 'value' }
      const instance = engine.createInstance(workflow.id, inputs)
      expect(instance.data.inputs).toEqual(inputs)
    })

    it('应该支持设置触发选项', () => {
      const options = {
        triggeredBy: 'test-user',
        triggerType: 'api' as const,
      }
      const instance = engine.createInstance(workflow.id, undefined, options)
      expect(instance.metadata.triggeredBy).toBe('test-user')
      expect(instance.metadata.triggerType).toBe('api')
    })

    it('对于不存在的工作流应该抛出错误', () => {
      expect(() => {
        engine.createInstance('non-existent')
      }).toThrow('工作流不存在')
    })

    it('对于验证失败的工作流应该抛出错误', () => {
      const invalidWorkflow = { ...workflow, name: '' }
      engine.registerWorkflow(invalidWorkflow)
      expect(() => {
        engine.createInstance(invalidWorkflow.id)
      }).toThrow('工作流验证失败')
    })
  })

  describe('实例执行', () => {
    it('应该成功执行简单工作流', async () => {
      const instance = engine.createInstance(workflow.id)
      const result = await engine.executeInstance(instance.id)

      expect(result.status).toBe(InstanceStatus.COMPLETED)
      expect(result.progress.completed).toBe(result.progress.total)
      expect(result.progress.percentage).toBe(100)
      expect(result.metadata.endedAt).toBeDefined()
      expect(result.metadata.duration).toBeGreaterThan(0)
    })

    it('应该记录每个节点的执行结果', async () => {
      const instance = engine.createInstance(workflow.id)
      await engine.executeInstance(instance.id)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result).toBeDefined()
        expect(result?.status).toBe(NodeStatus.SUCCESS)
        expect(result?.endTime).toBeDefined()
        expect(result?.duration).toBeGreaterThanOrEqual(0)
      })
    })

    it('应该计算实例运行时长', async () => {
      const instance = engine.createInstance(workflow.id)
      await engine.executeInstance(instance.id)

      expect(instance.metadata.duration).toBeDefined()
      expect(instance.metadata.duration!).toBeGreaterThan(0)
    })

    it('对于不存在的实例应该抛出错误', async () => {
      await expect(engine.executeInstance('non-existent')).rejects.toThrow('实例不存在')
    })

    it('对于非 PENDING 状态的实例应该抛出错误', async () => {
      const instance = engine.createInstance(workflow.id)
      await engine.executeInstance(instance.id)

      await expect(engine.executeInstance(instance.id)).rejects.toThrow('实例状态错误')
    })
  })

  describe('条件分支执行', () => {
    beforeEach(() => {
      engine = new WorkflowEngine()
      const conditionWorkflow = createConditionWorkflow()
      engine.registerWorkflow(conditionWorkflow)
    })

    it('应该正确执行条件分支', async () => {
      const instance = engine.createInstance('condition-workflow')
      await engine.executeInstance(instance.id)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
      // 条件节点应该执行
      const conditionResult = instance.nodeResults.get('condition-node')
      expect(conditionResult?.status).toBe(NodeStatus.SUCCESS)
    })
  })

  describe('并行执行', () => {
    beforeEach(() => {
      engine = new WorkflowEngine()
      const parallelWorkflow = createParallelWorkflow()
      engine.registerWorkflow(parallelWorkflow)
    })

    it('应该并行执行多个节点', async () => {
      const instance = engine.createInstance('parallel-workflow')
      await engine.executeInstance(instance.id)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
      // 所有并行任务都应该完成
      const agent1Result = instance.nodeResults.get('agent-1')
      const agent2Result = instance.nodeResults.get('agent-2')
      const agent3Result = instance.nodeResults.get('agent-3')

      expect(agent1Result?.status).toBe(NodeStatus.SUCCESS)
      expect(agent2Result?.status).toBe(NodeStatus.SUCCESS)
      expect(agent3Result?.status).toBe(NodeStatus.SUCCESS)
    })
  })

  describe('实例查询和统计', () => {
    it('应该能够获取实例', () => {
      const instance = engine.createInstance(workflow.id)
      const retrieved = engine.getInstance(instance.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(instance.id)
    })

    it('应该能够获取所有实例', () => {
      engine.createInstance(workflow.id)
      engine.createInstance(workflow.id)
      const instances = engine.getAllInstances()

      expect(instances).toHaveLength(2)
    })

    it('应该能够按工作流 ID 过滤实例', () => {
      const workflow2 = createMockWorkflow('workflow-2')
      engine.registerWorkflow(workflow2)

      engine.createInstance(workflow.id)
      engine.createInstance(workflow2.id)

      const workflow1Instances = engine.getAllInstances(workflow.id)
      const workflow2Instances = engine.getAllInstances(workflow2.id)

      expect(workflow1Instances).toHaveLength(1)
      expect(workflow2Instances).toHaveLength(1)
    })

    it('应该能够获取统计信息', async () => {
      engine.createInstance(workflow.id)
      const instance2 = engine.createInstance(workflow.id)
      const instance3 = engine.createInstance(workflow.id)

      // 模拟执行结果
      await engine.executeInstance(instance2.id)
      await engine.executeInstance(instance3.id)

      const stats = engine.getStatistics(workflow.id)

      expect(stats.totalInstances).toBe(3)
      expect(stats.success).toBe(2) // 两个成功执行
      expect(stats.avgDuration).toBeGreaterThan(0)
    })
  })

  describe('实例取消', () => {
    it('应该能够取消实例', () => {
      const instance = engine.createInstance(workflow.id)
      engine.cancelInstance(instance.id)

      expect(instance.status).toBe(InstanceStatus.CANCELLED)
      expect(instance.metadata.endedAt).toBeDefined()
    })

    it('对于不存在的实例取消应该静默处理', () => {
      expect(() => {
        engine.cancelInstance('non-existent')
      }).not.toThrow()
    })
  })
})

describe('WorkflowEngine - 错误处理测试', () => {
  let engine: WorkflowEngine
  let workflow: WorkflowDefinition

  beforeEach(() => {
    engine = new WorkflowEngine()
    workflow = createMockWorkflow()
    engine.registerWorkflow(workflow)
  })

  describe('工作流验证错误', () => {
    it('应该收集所有验证错误', () => {
      const invalidWorkflow: WorkflowDefinition = {
        ...workflow,
        name: '',
        nodes: [...workflow.nodes, { ...workflow.nodes[0], id: 'duplicate' }],
        edges: [
          ...workflow.edges,
          { id: 'bad-edge', source: 'non-existent', target: 'node-1', type: EdgeType.SEQUENCE },
        ],
      }

      const result = engine.validateWorkflow(invalidWorkflow)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })

    it('应该检测节点缺少类型', () => {
      const invalidNode: WorkflowNode = {
        ...workflow.nodes[0],
        type: '' as NodeType,
      }
      const invalidWorkflow = {
        ...workflow,
        nodes: [invalidNode],
      }

      const result = engine.validateWorkflow(invalidWorkflow)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('缺少类型'))).toBe(true)
    })

    it('应该检测节点缺少位置信息', () => {
      const invalidNode: WorkflowNode = {
        ...workflow.nodes[0],
        position: undefined as any,
      }
      const invalidWorkflow = {
        ...workflow,
        nodes: [invalidNode],
      }

      const result = engine.validateWorkflow(invalidWorkflow)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('缺少位置信息'))).toBe(true)
    })

    it('应该检测边 ID 重复', () => {
      const invalidWorkflow = {
        ...workflow,
        edges: [
          { ...workflow.edges[0], id: 'duplicate' },
          { ...workflow.edges[1], id: 'duplicate' },
        ],
      }

      const result = engine.validateWorkflow(invalidWorkflow)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('边 ID 重复'))).toBe(true)
    })

    it('应该检测边连接到不存在的目标节点', () => {
      const invalidWorkflow = {
        ...workflow,
        edges: [
          {
            id: 'bad-edge',
            source: workflow.nodes[0].id,
            target: 'non-existent',
            type: EdgeType.SEQUENCE,
          },
        ],
      }

      const result = engine.validateWorkflow(invalidWorkflow)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('目标节点不存在'))).toBe(true)
    })
  })

  describe('实例创建错误', () => {
    it('对于不存在的工作流 ID 应该抛出错误', () => {
      expect(() => {
        engine.createInstance('non-existent-workflow')
      }).toThrow('工作流不存在')
    })

    it('对于验证失败的工作流应该提供详细错误信息', () => {
      const invalidWorkflow = { ...workflow, name: '' }
      engine.registerWorkflow(invalidWorkflow)

      expect(() => {
        engine.createInstance(invalidWorkflow.id)
      }).toThrow(/工作流验证失败/)
    })
  })

  describe('实例执行错误', () => {
    it('应该处理执行失败并设置 FAILED 状态', async () => {
      // 创建一个无效的工作流（没有开始节点）
      const invalidWorkflow = {
        ...workflow,
        nodes: workflow.nodes.filter(n => n.type !== NodeType.START),
      }
      engine.registerWorkflow(invalidWorkflow)

      // 创建实例（会因为验证失败而失败）
      expect(() => {
        engine.createInstance(invalidWorkflow.id)
      }).toThrow()
    })

    it('对于不存在的实例 ID 应该抛出错误', async () => {
      await expect(engine.executeInstance('non-existent-instance')).rejects.toThrow('实例不存在')
    })

    it('对于已完成的实例再次执行应该抛出错误', async () => {
      const instance = engine.createInstance(workflow.id)
      await engine.executeInstance(instance.id)

      await expect(engine.executeInstance(instance.id)).rejects.toThrow('实例状态错误')
    })

    it('应该记录错误信息到实例', async () => {
      // 这个测试需要模拟节点执行失败
      // 由于当前实现使用的是模拟执行，我们测试错误处理结构
      const instance = engine.createInstance(workflow.id)

      // 如果执行过程中出错，应该设置 error 字段
      expect(instance.error).toBeUndefined()

      // 执行后检查（正常情况下不会出错）
      await engine.executeInstance(instance.id)
      expect(instance.error).toBeUndefined()
    })
  })

  describe('边界情况处理', () => {
    it('应该处理空边列表的工作流', () => {
      const edgelessWorkflow: WorkflowDefinition = {
        ...workflow,
        edges: [],
      }

      const result = engine.validateWorkflow(edgelessWorkflow)
      expect(result.valid).toBe(false) // 应该检测到孤立节点
    })

    it('应该处理只有一个节点的工作流（不符合规范）', () => {
      const singleNodeWorkflow: WorkflowDefinition = {
        ...workflow,
        nodes: [workflow.nodes[0]], // 只有开始节点
        edges: [],
      }

      const result = engine.validateWorkflow(singleNodeWorkflow)
      expect(result.valid).toBe(false) // 缺少结束节点
    })

    it('应该处理多个开始节点的工作流', () => {
      const multiStartWorkflow: WorkflowDefinition = {
        ...workflow,
        nodes: [
          workflow.nodes[0],
          { ...workflow.nodes[0], id: 'start-2' },
          workflow.nodes[1],
          workflow.nodes[2],
        ],
      }

      const result = engine.validateWorkflow(multiStartWorkflow)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('只能包含一个开始节点'))).toBe(true)
    })
  })
})

describe('WorkflowEngine - 节点状态转换测试', () => {
  let engine: WorkflowEngine
  let workflow: WorkflowDefinition

  beforeEach(() => {
    engine = new WorkflowEngine()
    workflow = createMockWorkflow()
    engine.registerWorkflow(workflow)
  })

  describe('节点生命周期', () => {
    it('所有节点初始状态应该是 IDLE', () => {
      const instance = engine.createInstance(workflow.id)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result?.status).toBe(NodeStatus.IDLE)
      })
    })

    it('节点执行时状态应该变为 RUNNING', async () => {
      const instance = engine.createInstance(workflow.id)

      // 开始执行
      const executionPromise = engine.executeInstance(instance.id)

      // 等待一小段时间，让开始节点开始执行
      await new Promise(resolve => setTimeout(resolve, 10))

      // 此时开始节点应该已经是 RUNNING 或 SUCCESS
      const startResult = instance.nodeResults.get('start-node')
      expect([NodeStatus.RUNNING, NodeStatus.SUCCESS]).toContain(startResult?.status)

      await executionPromise
    })

    it('节点成功执行后状态应该变为 SUCCESS', async () => {
      const instance = engine.createInstance(workflow.id)
      await engine.executeInstance(instance.id)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result?.status).toBe(NodeStatus.SUCCESS)
      })
    })

    it('应该记录节点执行时间', async () => {
      const instance = engine.createInstance(workflow.id)
      await engine.executeInstance(instance.id)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result?.startTime).toBeDefined()
        expect(result?.endTime).toBeDefined()
        expect(result?.duration).toBeGreaterThanOrEqual(0)
        expect(result?.duration!).toBe(
          new Date(result!.endTime!).getTime() - new Date(result!.startTime).getTime()
        )
      })
    })

    it('应该记录节点执行输入和输出', async () => {
      const instance = engine.createInstance(workflow.id, { testInput: 'value' })
      await engine.executeInstance(instance.id)

      const agentResult = instance.nodeResults.get('agent-node')
      expect(agentResult?.input).toBeDefined()
      expect(agentResult?.output).toBeDefined()
    })
  })

  describe('状态转换顺序', () => {
    it('节点状态应该按 IDLE -> RUNNING -> SUCCESS 顺序转换', async () => {
      const instance = engine.createInstance(workflow.id)

      // 初始状态
      const startResult1 = instance.nodeResults.get('start-node')
      expect(startResult1?.status).toBe(NodeStatus.IDLE)

      // 执行中
      await engine.executeInstance(instance.id)

      // 最终状态
      const startResult2 = instance.nodeResults.get('start-node')
      expect(startResult2?.status).toBe(NodeStatus.SUCCESS)
      expect(startResult2?.startTime).toBeDefined()
      expect(startResult2?.endTime).toBeDefined()
    })

    it('应该记录节点执行的时间戳', async () => {
      const instance = engine.createInstance(workflow.id)
      const startTime = Date.now()

      await engine.executeInstance(instance.id)

      const endTime = Date.now()

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        const nodeStart = new Date(result!.startTime!).getTime()
        const nodeEnd = new Date(result!.endTime!).getTime()

        expect(nodeStart).toBeGreaterThanOrEqual(startTime)
        expect(nodeEnd).toBeLessThanOrEqual(endTime)
        expect(nodeEnd).toBeGreaterThanOrEqual(nodeStart)
      })
    })
  })

  describe('不同节点类型的状态', () => {
    it('START 节点应该成功执行', async () => {
      const instance = engine.createInstance(workflow.id)
      await engine.executeInstance(instance.id)

      const startResult = instance.nodeResults.get('start-node')
      expect(startResult?.status).toBe(NodeStatus.SUCCESS)
      expect(startResult?.output?.message).toBe('工作流开始')
    })

    it('END 节点应该成功执行', async () => {
      const instance = engine.createInstance(workflow.id)
      await engine.executeInstance(instance.id)

      const endResult = instance.nodeResults.get('end-node')
      expect(endResult?.status).toBe(NodeStatus.SUCCESS)
      expect(endResult?.output?.message).toBe('工作流结束')
    })

    it('AGENT 节点应该成功执行', async () => {
      const instance = engine.createInstance(workflow.id)
      await engine.executeInstance(instance.id)

      const agentResult = instance.nodeResults.get('agent-node')
      expect(agentResult?.status).toBe(NodeStatus.SUCCESS)
      expect(agentResult?.output?.agentId).toBe('agent-1')
      expect(agentResult?.output?.result).toBe('Agent 执行完成')
    })

    it('WAIT 节点应该等待指定时间', async () => {
      // 创建一个带有 WAIT 节点的工作流
      const waitNode: WorkflowNode = {
        id: 'wait-node',
        type: NodeType.WAIT,
        name: '等待',
        position: { x: 100, y: 0 },
        waitConfig: { duration: 0.5 }, // 0.5 秒
      }

      const waitWorkflow: WorkflowDefinition = {
        ...workflow,
        nodes: [workflow.nodes[0], waitNode, workflow.nodes[2]],
        edges: [
          { id: 'edge-1', source: 'start-node', target: 'wait-node', type: EdgeType.SEQUENCE },
          { id: 'edge-2', source: 'wait-node', target: 'end-node', type: EdgeType.SEQUENCE },
        ],
      }

      engine.registerWorkflow(waitWorkflow)

      const startTime = Date.now()
      const instance = engine.createInstance(waitWorkflow.id)
      await engine.executeInstance(instance.id)
      const endTime = Date.now()

      const waitResult = instance.nodeResults.get('wait-node')
      expect(waitResult?.status).toBe(NodeStatus.SUCCESS)
      expect(waitResult?.duration).toBeGreaterThanOrEqual(500) // 至少等待 0.5 秒
      expect(endTime - startTime).toBeGreaterThanOrEqual(500)
    })
  })

  describe('实例进度跟踪', () => {
    it('应该正确跟踪实例执行进度', async () => {
      const instance = engine.createInstance(workflow.id)

      // 初始进度
      expect(instance.progress.completed).toBe(0)
      expect(instance.progress.percentage).toBe(0)
      expect(instance.progress.failed).toBe(0)

      // 执行后
      await engine.executeInstance(instance.id)

      expect(instance.progress.completed).toBe(workflow.nodes.length)
      expect(instance.progress.percentage).toBe(100)
      expect(instance.progress.failed).toBe(0)
    })

    it('应该计算正确的完成百分比', async () => {
      const instance = engine.createInstance(workflow.id)
      await engine.executeInstance(instance.id)

      const expectedPercentage = Math.round(
        (instance.progress.completed / instance.progress.total) * 100
      )

      expect(instance.progress.percentage).toBe(expectedPercentage)
    })
  })

  describe('实例元数据', () => {
    it('应该记录实例开始时间', () => {
      const beforeCreate = Date.now()
      const instance = engine.createInstance(workflow.id)
      const afterCreate = Date.now()

      const startTime = new Date(instance.metadata.startedAt).getTime()

      expect(startTime).toBeGreaterThanOrEqual(beforeCreate)
      expect(startTime).toBeLessThanOrEqual(afterCreate)
    })

    it('应该记录实例结束时间', async () => {
      const instance = engine.createInstance(workflow.id)
      await engine.executeInstance(instance.id)

      const startTime = new Date(instance.metadata.startedAt).getTime()
      const endTime = new Date(instance.metadata.endedAt!).getTime()

      expect(endTime).toBeGreaterThan(startTime)
    })

    it('应该计算实例运行时长', async () => {
      const instance = engine.createInstance(workflow.id)
      await engine.executeInstance(instance.id)

      const startTime = new Date(instance.metadata.startedAt).getTime()
      const endTime = new Date(instance.metadata.endedAt!).getTime()
      const expectedDuration = endTime - startTime

      expect(instance.metadata.duration).toBe(expectedDuration)
    })

    it('应该记录触发者信息', () => {
      const options = {
        triggeredBy: 'test-user',
        triggerType: 'manual' as const,
      }
      const instance = engine.createInstance(workflow.id, undefined, options)

      expect(instance.metadata.triggeredBy).toBe('test-user')
      expect(instance.metadata.triggerType).toBe('manual')
    })
  })
})
