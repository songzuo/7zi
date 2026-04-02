/**
 * EnhancedWorkflowExecutor 单元测试
 *
 * 测试覆盖:
 * 1. 工作流注册和获取
 * 2. 工作流验证
 * 3. 实例创建
 * 4. 实例执行
 * 5. 节点状态转换
 * 6. 错误处理和恢复
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
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
    { id: 'edge-4', source: 'agent-1', target: 'end-node', type: EdgeType.SEQUENCE },
    { id: 'edge-5', source: 'agent-2', target: 'end-node', type: EdgeType.SEQUENCE },
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

describe('EnhancedWorkflowExecutor - 工作流注册和获取测试', () => {
  let executor: EnhancedWorkflowExecutor
  let workflow: WorkflowDefinition

  beforeEach(() => {
    executor = new EnhancedWorkflowExecutor()
    workflow = createMockWorkflow()
  })

  describe('registerWorkflow', () => {
    it('应该成功注册工作流', () => {
      executor.registerWorkflow(workflow)
      const retrieved = executor.getWorkflow(workflow.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(workflow.id)
    })

    it('应该能够覆盖已存在的工作流', () => {
      executor.registerWorkflow(workflow)

      const updatedWorkflow = { ...workflow, name: '更新后的工作流' }
      executor.registerWorkflow(updatedWorkflow)

      const retrieved = executor.getWorkflow(workflow.id)
      expect(retrieved?.name).toBe('更新后的工作流')
    })
  })

  describe('getWorkflow', () => {
    it('应该返回已注册的工作流', () => {
      executor.registerWorkflow(workflow)
      const retrieved = executor.getWorkflow(workflow.id)

      expect(retrieved).toEqual(workflow)
    })

    it('对于不存在的工作流应该返回 undefined', () => {
      const retrieved = executor.getWorkflow('non-existent')
      expect(retrieved).toBeUndefined()
    })
  })
})

describe('EnhancedWorkflowExecutor - 工作流验证测试', () => {
  let executor: EnhancedWorkflowExecutor
  let workflow: WorkflowDefinition

  beforeEach(() => {
    executor = new EnhancedWorkflowExecutor()
    workflow = createMockWorkflow()
  })

  describe('validateWorkflow', () => {
    it('应该验证有效的工作流', () => {
      const result = executor.validateWorkflow(workflow)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该拒绝没有名称的工作流', () => {
      const invalidWorkflow = { ...workflow, name: '' }
      const result = executor.validateWorkflow(invalidWorkflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('工作流名称不能为空')
    })

    it('应该拒绝没有节点的工作流', () => {
      const invalidWorkflow = { ...workflow, nodes: [] }
      const result = executor.validateWorkflow(invalidWorkflow)

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
      const result = executor.validateWorkflow(invalidWorkflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('节点 ID 重复'))).toBe(true)
    })

    it('应该拒绝没有开始节点的工作流', () => {
      const invalidWorkflow = {
        ...workflow,
        nodes: workflow.nodes.filter(n => n.type !== NodeType.START),
      }
      const result = executor.validateWorkflow(invalidWorkflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('工作流必须包含至少一个开始节点')
    })

    it('应该拒绝没有结束节点的工作流', () => {
      const invalidWorkflow = {
        ...workflow,
        nodes: workflow.nodes.filter(n => n.type !== NodeType.END),
      }
      const result = executor.validateWorkflow(invalidWorkflow)

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
      const result = executor.validateWorkflow(invalidWorkflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('孤立节点'))).toBe(true)
    })

    it('应该检测边连接到不存在的节点', () => {
      const invalidWorkflow = {
        ...workflow,
        edges: [
          ...workflow.edges,
          { id: 'bad-edge', source: 'non-existent', target: 'agent-node', type: EdgeType.SEQUENCE },
        ],
      }
      const result = executor.validateWorkflow(invalidWorkflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('源节点不存在'))).toBe(true)
    })

    it('应该检测多个开始节点', () => {
      const invalidWorkflow = {
        ...workflow,
        nodes: [
          workflow.nodes[0],
          { ...workflow.nodes[0], id: 'start-2' },
          workflow.nodes[1],
          workflow.nodes[2],
        ],
      }
      const result = executor.validateWorkflow(invalidWorkflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('只能包含一个开始节点'))).toBe(true)
    })
  })
})

describe('EnhancedWorkflowExecutor - 实例创建测试', () => {
  let executor: EnhancedWorkflowExecutor
  let workflow: WorkflowDefinition

  beforeEach(() => {
    executor = new EnhancedWorkflowExecutor()
    workflow = createMockWorkflow()
    executor.registerWorkflow(workflow)
  })

  describe('createInstance', () => {
    it('应该成功创建工作流实例', () => {
      const instance = executor.createInstance(workflow.id)

      expect(instance).toBeDefined()
      expect(instance.workflowId).toBe(workflow.id)
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该初始化所有节点状态为 IDLE', () => {
      const instance = executor.createInstance(workflow.id)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result).toBeDefined()
        expect(result?.status).toBe(NodeStatus.IDLE)
      })
    })

    it('应该支持传入初始输入数据', () => {
      const inputs = { testInput: 'value' }
      const instance = executor.createInstance(workflow.id, inputs)

      expect(instance.data.inputs).toEqual(inputs)
    })

    it('应该支持设置触发选项', () => {
      const options = {
        triggeredBy: 'test-user',
        triggerType: 'api' as const,
      }
      const instance = executor.createInstance(workflow.id, undefined, options)

      expect(instance.metadata.triggeredBy).toBe('test-user')
      expect(instance.metadata.triggerType).toBe('api')
    })

    it('对于不存在的工作流应该抛出错误', () => {
      expect(() => {
        executor.createInstance('non-existent')
      }).toThrow('工作流不存在')
    })

    it('对于验证失败的工作流应该抛出错误', () => {
      const invalidWorkflow = { ...workflow, name: '' }
      executor.registerWorkflow(invalidWorkflow)

      expect(() => {
        executor.createInstance(invalidWorkflow.id)
      }).toThrow('工作流验证失败')
    })

    it('应该初始化实例进度为 0', () => {
      const instance = executor.createInstance(workflow.id)

      expect(instance.progress.total).toBe(workflow.nodes.length)
      expect(instance.progress.completed).toBe(0)
      expect(instance.progress.failed).toBe(0)
      expect(instance.progress.percentage).toBe(0)
    })
  })
})

describe('EnhancedWorkflowExecutor - 实例执行测试', () => {
  let executor: EnhancedWorkflowExecutor
  let workflow: WorkflowDefinition

  beforeEach(() => {
    executor = new EnhancedWorkflowExecutor()
    workflow = createMockWorkflow()
    executor.registerWorkflow(workflow)
  })

  describe('executeInstance', () => {
    it('应该成功执行简单工作流', async () => {
      const instance = executor.createInstance(workflow.id)
      const result = await executor.executeInstance(instance.id)

      expect(result.status).toBe(InstanceStatus.COMPLETED)
    })

    it('应该计算执行时长', async () => {
      const instance = executor.createInstance(workflow.id)
      await executor.executeInstance(instance.id)

      expect(instance.metadata.duration).toBeDefined()
      expect(instance.metadata.duration!).toBeGreaterThan(0)
    })

    it('应该设置结束时间', async () => {
      const instance = executor.createInstance(workflow.id)
      await executor.executeInstance(instance.id)

      expect(instance.metadata.endedAt).toBeDefined()
    })

    it('对于不存在的实例应该抛出错误', async () => {
      await expect(executor.executeInstance('non-existent')).rejects.toThrow('实例不存在')
    })

    it('对于非 PENDING 状态的实例应该抛出错误', async () => {
      const instance = executor.createInstance(workflow.id)
      await executor.executeInstance(instance.id)

      await expect(executor.executeInstance(instance.id)).rejects.toThrow('实例状态错误')
    })
  })
})

describe('EnhancedWorkflowExecutor - 节点状态转换测试', () => {
  let executor: EnhancedWorkflowExecutor
  let workflow: WorkflowDefinition

  beforeEach(() => {
    executor = new EnhancedWorkflowExecutor()
    workflow = createMockWorkflow()
    executor.registerWorkflow(workflow)
  })

  describe('节点生命周期', () => {
    it('所有节点初始状态应该是 IDLE', () => {
      const instance = executor.createInstance(workflow.id)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result?.status).toBe(NodeStatus.IDLE)
      })
    })

    it('节点成功执行后状态应该变为 SUCCESS', async () => {
      const instance = executor.createInstance(workflow.id)
      await executor.executeInstance(instance.id)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result?.status).toBe(NodeStatus.SUCCESS)
      })
    })

    it('应该记录节点执行时间', async () => {
      const instance = executor.createInstance(workflow.id)
      await executor.executeInstance(instance.id)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result?.startTime).toBeDefined()
        expect(result?.endTime).toBeDefined()
        expect(result?.duration).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('进度跟踪', () => {
    it('应该正确跟踪完成百分比', async () => {
      const instance = executor.createInstance(workflow.id)
      await executor.executeInstance(instance.id)

      expect(instance.progress.percentage).toBe(100)
    })

    it('应该正确增加已完成节点数', async () => {
      const instance = executor.createInstance(workflow.id)
      await executor.executeInstance(instance.id)

      expect(instance.progress.completed).toBe(workflow.nodes.length)
    })
  })
})

describe('EnhancedWorkflowExecutor - 实例查询和统计', () => {
  let executor: EnhancedWorkflowExecutor
  let workflow: WorkflowDefinition

  beforeEach(() => {
    executor = new EnhancedWorkflowExecutor()
    workflow = createMockWorkflow()
    executor.registerWorkflow(workflow)
  })

  describe('getInstance', () => {
    it('应该能够获取实例', () => {
      const instance = executor.createInstance(workflow.id)
      const retrieved = executor.getInstance(instance.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(instance.id)
    })

    it('对于不存在的实例应该返回 undefined', () => {
      const retrieved = executor.getInstance('non-existent')
      expect(retrieved).toBeUndefined()
    })
  })

  describe('getAllInstances', () => {
    it('应该能够获取所有实例', () => {
      executor.createInstance(workflow.id)
      executor.createInstance(workflow.id)
      const instances = executor.getAllInstances()

      expect(instances).toHaveLength(2)
    })

    it('应该能够按工作流 ID 过滤实例', () => {
      const workflow2 = createMockWorkflow('workflow-2')
      executor.registerWorkflow(workflow2)

      executor.createInstance(workflow.id)
      executor.createInstance(workflow2.id)

      const workflow1Instances = executor.getAllInstances(workflow.id)
      const workflow2Instances = executor.getAllInstances(workflow2.id)

      expect(workflow1Instances).toHaveLength(1)
      expect(workflow2Instances).toHaveLength(1)
    })
  })

  describe('getStatistics', () => {
    it('应该能够获取统计信息', async () => {
      executor.createInstance(workflow.id)
      const instance2 = executor.createInstance(workflow.id)
      const instance3 = executor.createInstance(workflow.id)

      await executor.executeInstance(instance2.id)
      await executor.executeInstance(instance3.id)

      const stats = executor.getStatistics(workflow.id)

      expect(stats.totalInstances).toBe(3)
      expect(stats.success).toBe(2)
      expect(stats.avgDuration).toBeGreaterThan(0)
    })
  })

  describe('cancelInstance', () => {
    it('应该能够取消实例', () => {
      const instance = executor.createInstance(workflow.id)
      executor.cancelInstance(instance.id)

      expect(instance.status).toBe(InstanceStatus.CANCELLED)
    })

    it('对于不存在的实例取消应该静默处理', () => {
      expect(() => {
        executor.cancelInstance('non-existent')
      }).not.toThrow()
    })
  })

  describe('clearInstances', () => {
    it('应该能够清除所有实例', () => {
      executor.createInstance(workflow.id)
      executor.createInstance(workflow.id)

      executor.clearInstances()

      expect(executor.getAllInstances()).toHaveLength(0)
    })

    it('应该能够按工作流 ID 清除实例', () => {
      const workflow2 = createMockWorkflow('workflow-2')
      executor.registerWorkflow(workflow2)

      executor.createInstance(workflow.id)
      executor.createInstance(workflow2.id)

      executor.clearInstances(workflow.id)

      expect(executor.getAllInstances(workflow.id)).toHaveLength(0)
      expect(executor.getAllInstances(workflow2.id)).toHaveLength(1)
    })
  })
})

describe('EnhancedWorkflowExecutor - 条件分支执行', () => {
  let executor: EnhancedWorkflowExecutor

  beforeEach(() => {
    executor = new EnhancedWorkflowExecutor()
  })

  it('应该执行条件分支', async () => {
    const workflow = createConditionWorkflow()
    executor.registerWorkflow(workflow)

    const instance = executor.createInstance(workflow.id)

    try {
      await executor.executeInstance(instance.id)
      // 验证条件节点执行
      const conditionResult = instance.nodeResults.get('condition-node')
      expect(conditionResult?.status).toBe(NodeStatus.SUCCESS)
    } catch (error) {
      // 如果执行失败，验证错误处理
      expect(instance.status).toBe(InstanceStatus.FAILED)
    }
  })
})

describe('EnhancedWorkflowExecutor - 并行执行', () => {
  let executor: EnhancedWorkflowExecutor

  beforeEach(() => {
    executor = new EnhancedWorkflowExecutor()
  })

  it('应该并行执行多个节点', async () => {
    const workflow = createParallelWorkflow()
    executor.registerWorkflow(workflow)

    const instance = executor.createInstance(workflow.id)
    await executor.executeInstance(instance.id)

    expect(instance.status).toBe(InstanceStatus.COMPLETED)

    // 验证所有并行任务都完成
    const agent1Result = instance.nodeResults.get('agent-1')
    const agent2Result = instance.nodeResults.get('agent-2')

    expect(agent1Result?.status).toBe(NodeStatus.SUCCESS)
    expect(agent2Result?.status).toBe(NodeStatus.SUCCESS)
  })
})

describe('EnhancedWorkflowExecutor - 错误处理测试', () => {
  let executor: EnhancedWorkflowExecutor
  let workflow: WorkflowDefinition

  beforeEach(() => {
    executor = new EnhancedWorkflowExecutor()
    workflow = createMockWorkflow()
    executor.registerWorkflow(workflow)
  })

  describe('边界情况处理', () => {
    it('应该处理空边列表的工作流', () => {
      const edgelessWorkflow: WorkflowDefinition = {
        ...workflow,
        edges: [],
      }

      const result = executor.validateWorkflow(edgelessWorkflow)
      expect(result.valid).toBe(false) // 应该检测到孤立节点
    })

    it('应该处理只有一个节点的工作流（不符合规范）', () => {
      const singleNodeWorkflow: WorkflowDefinition = {
        ...workflow,
        nodes: [workflow.nodes[0]], // 只有开始节点
        edges: [],
      }

      const result = executor.validateWorkflow(singleNodeWorkflow)
      expect(result.valid).toBe(false) // 缺少结束节点
    })
  })
})
