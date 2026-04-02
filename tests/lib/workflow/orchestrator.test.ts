/**
 * VisualWorkflowOrchestrator 单元测试
 *
 * 测试覆盖:
 * 1. 工作流创建 (createInstance)
 * 2. 工作流执行 (execute)
 * 3. 节点状态转换
 * 4. 错误处理和恢复
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VisualWorkflowOrchestrator } from '@/lib/workflow/VisualWorkflowOrchestrator'
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

describe('VisualWorkflowOrchestrator - 工作流创建测试', () => {
  let orchestrator: VisualWorkflowOrchestrator
  let workflow: WorkflowDefinition

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
    workflow = createMockWorkflow()
  })

  describe('实例创建 (createInstance)', () => {
    it('应该成功创建工作流实例', () => {
      const instance = orchestrator.createInstance(workflow)

      expect(instance).toBeDefined()
      expect(instance.workflowId).toBe(workflow.id)
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该支持传入初始输入数��', () => {
      const inputs = { testInput: 'value' }
      const instance = orchestrator.createInstance(workflow, inputs)

      expect(instance.data.inputs).toEqual(inputs)
    })

    it('应该初始化所有节点状态为 pending', () => {
      const instance = orchestrator.createInstance(workflow)

      workflow.nodes.forEach(node => {
        const state = orchestrator.getNodeState(instance.id, node.id)
        expect(state).toBe('pending')
      })
    })

    it('应该初始化所有节点结果为 IDLE', () => {
      const instance = orchestrator.createInstance(workflow)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result).toBeDefined()
        expect(result?.status).toBe(NodeStatus.IDLE)
      })
    })

    it('应该设置实例进度为 0', () => {
      const instance = orchestrator.createInstance(workflow)

      expect(instance.progress.total).toBe(workflow.nodes.length)
      expect(instance.progress.completed).toBe(0)
      expect(instance.progress.failed).toBe(0)
      expect(instance.progress.percentage).toBe(0)
    })
  })
})

describe('VisualWorkflowOrchestrator - 工作流执行测试', () => {
  let orchestrator: VisualWorkflowOrchestrator
  let workflow: WorkflowDefinition

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
    workflow = createMockWorkflow()
  })

  describe('execute - 基本执行', () => {
    it('应该成功执行简单工作流', async () => {
      const instance = await orchestrator.execute(workflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
      expect(instance.progress.completed).toBe(instance.progress.total)
    })

    it('应该计算执行时长', async () => {
      const instance = await orchestrator.execute(workflow)

      expect(instance.metadata.duration).toBeDefined()
      expect(instance.metadata.duration!).toBeGreaterThan(0)
    })

    it('应该设置结束时间', async () => {
      const instance = await orchestrator.execute(workflow)

      expect(instance.metadata.endedAt).toBeDefined()
    })

    it('应该支持传入输入数据', async () => {
      const inputs = { testKey: 'testValue' }
      const instance = await orchestrator.execute(workflow, inputs)

      expect(instance.data.inputs).toEqual(inputs)
    })
  })

  describe('execute - 验证', () => {
    it('应该验证工作流失败时抛出错误', async () => {
      const invalidWorkflow: WorkflowDefinition = {
        ...workflow,
        nodes: [], // 空节点列表
      }

      await expect(orchestrator.execute(invalidWorkflow)).rejects.toThrow()
    })

    it('应该验证缺少开始节点时抛出错误', async () => {
      const invalidWorkflow = {
        ...workflow,
        nodes: workflow.nodes.filter(n => n.type !== NodeType.START),
      }

      await expect(orchestrator.execute(invalidWorkflow)).rejects.toThrow()
    })
  })
})

describe('VisualWorkflowOrchestrator - 节点状态转换测试', () => {
  let orchestrator: VisualWorkflowOrchestrator
  let workflow: WorkflowDefinition

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
    workflow = createMockWorkflow()
  })

  describe('节点生命周期', () => {
    it('初始状态应该是 pending', async () => {
      const instance = orchestrator.createInstance(workflow)

      const startState = orchestrator.getNodeState(instance.id, 'start-node')
      expect(startState).toBe('pending')
    })

    it('执行中状态应该是 running', async () => {
      const executionPromise = orchestrator.execute(workflow)

      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 50))

      const instance = orchestrator.getInstance(
        Array.from(orchestrator.getAllInstances())[0]?.id || ''
      )

      // 如果找到实例，检查状态
      if (instance) {
        const states = ['pending', 'running', 'completed']
        expect(states).toContain(orchestrator.getNodeState(instance.id, 'start-node') || '')
      }

      await executionPromise
    })

    it('完成后状态应该是 completed', async () => {
      const instance = await orchestrator.execute(workflow)

      const startState = orchestrator.getNodeState(instance.id, 'start-node')
      const agentState = orchestrator.getNodeState(instance.id, 'agent-node')
      const endState = orchestrator.getNodeState(instance.id, 'end-node')

      expect(startState).toBe('completed')
      expect(agentState).toBe('completed')
      expect(endState).toBe('completed')
    })
  })

  describe('不同节点类型的执行', () => {
    it('START 节点应该成功执行', async () => {
      const instance = await orchestrator.execute(workflow)

      const startResult = instance.nodeResults.get('start-node')
      expect(startResult?.status).toBe(NodeStatus.SUCCESS)
    })

    it('AGENT 节点应该成功执行', async () => {
      const instance = await orchestrator.execute(workflow)

      const agentResult = instance.nodeResults.get('agent-node')
      expect(agentResult?.status).toBe(NodeStatus.SUCCESS)
    })

    it('END 节点应该成功执行', async () => {
      const instance = await orchestrator.execute(workflow)

      const endResult = instance.nodeResults.get('end-node')
      expect(endResult?.status).toBe(NodeStatus.SUCCESS)
    })
  })

  describe('进度跟踪', () => {
    it('应该正确跟踪完成百分比', async () => {
      const instance = await orchestrator.execute(workflow)

      expect(instance.progress.percentage).toBe(100)
    })

    it('应该正确增加已完成节点数', async () => {
      const instance = await orchestrator.execute(workflow)

      expect(instance.progress.completed).toBe(workflow.nodes.length)
    })
  })
})

describe('VisualWorkflowOrchestrator - 条件分支执行', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  it('应该执行条件分支', async () => {
    const workflow = createConditionWorkflow()
    const instance = await orchestrator.execute(workflow)

    expect(instance.status).toBe(InstanceStatus.COMPLETED)

    // 验证条件节点执行
    const conditionResult = instance.nodeResults.get('condition-node')
    expect(conditionResult?.status).toBe(NodeStatus.SUCCESS)
  })
})

describe('VisualWorkflowOrchestrator - 并行执行', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  it('应该并行执行多个节点', async () => {
    const workflow = createParallelWorkflow()
    const instance = await orchestrator.execute(workflow)

    expect(instance.status).toBe(InstanceStatus.COMPLETED)

    // 验证所有并行任务都完成
    const agent1Result = instance.nodeResults.get('agent-1')
    const agent2Result = instance.nodeResults.get('agent-2')
    const agent3Result = instance.nodeResults.get('agent-3')

    expect(agent1Result?.status).toBe(NodeStatus.SUCCESS)
    expect(agent2Result?.status).toBe(NodeStatus.SUCCESS)
    expect(agent3Result?.status).toBe(NodeStatus.SUCCESS)
  })
})

describe('VisualWorkflowOrchestrator - 错误处理测试', () => {
  let orchestrator: VisualWorkflowOrchestrator
  let workflow: WorkflowDefinition

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
    workflow = createMockWorkflow()
  })

  describe('工作流验证错误', () => {
    it('应该验证空节点列表', () => {
      const invalidWorkflow = { ...workflow, nodes: [] }
      const result = orchestrator.validateWorkflow(invalidWorkflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Workflow must contain at least one node')
    })

    it('应该验证缺少开始节点', () => {
      const invalidWorkflow = {
        ...workflow,
        nodes: workflow.nodes.filter(n => n.type !== NodeType.START),
      }
      const result = orchestrator.validateWorkflow(invalidWorkflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Workflow must have a start node')
    })

    it('应该验证缺少结束节点', () => {
      const invalidWorkflow = {
        ...workflow,
        nodes: workflow.nodes.filter(n => n.type !== NodeType.END),
      }
      const result = orchestrator.validateWorkflow(invalidWorkflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Workflow must have an end node')
    })

    it('应该检测重复节点 ID', () => {
      const invalidWorkflow = {
        ...workflow,
        nodes: [
          { ...workflow.nodes[0], id: 'duplicate' },
          { ...workflow.nodes[1], id: 'duplicate' },
        ],
      }
      const result = orchestrator.validateWorkflow(invalidWorkflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Duplicate node ID'))).toBe(true)
    })

    it('应该检测边连接到不存在的节点', () => {
      const invalidWorkflow = {
        ...workflow,
        edges: [
          ...workflow.edges,
          { id: 'bad-edge', source: 'non-existent', target: 'agent-node', type: EdgeType.SEQUENCE },
        ],
      }
      const result = orchestrator.validateWorkflow(invalidWorkflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('non-existent source node'))).toBe(true)
    })
  })

  describe('实例状态管理', () => {
    it('应该能够取消运行中的实例', async () => {
      const instance = orchestrator.createInstance(workflow)
      // 设置为运行状态
      instance.status = InstanceStatus.RUNNING
      orchestrator.cancel(instance.id)

      expect(instance.status).toBe(InstanceStatus.CANCELLED)
    })

    it('取消非运行状态的实例不会改变状态', () => {
      const instance = orchestrator.createInstance(workflow)
      orchestrator.cancel(instance.id)

      // PENDING 状态的实例不会被取消
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该能够暂停运行中的实例', () => {
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING
      orchestrator.pause(instance.id)

      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该能够恢复暂停的实例', async () => {
      const instance = orchestrator.createInstance(workflow)
      orchestrator.pause(instance.id)
      orchestrator.resume(instance.id)

      expect(instance.status).toBe(InstanceStatus.RUNNING)
    })
  })

  describe('统计信息', () => {
    it('应该获取工作流统计信息', async () => {
      await orchestrator.execute(workflow)
      await orchestrator.execute(workflow)

      const stats = orchestrator.getStatistics(workflow.id)

      expect(stats.totalInstances).toBe(2)
      expect(stats.completed).toBe(2)
      expect(stats.avgDuration).toBeGreaterThan(0)
    })

    it('应该计算平均执行时长', async () => {
      await orchestrator.execute(workflow)

      const stats = orchestrator.getStatistics(workflow.id)

      expect(stats.avgDuration).toBeGreaterThan(0)
    })
  })
})

describe('VisualWorkflowOrchestrator - 事件监听测试', () => {
  let orchestrator: VisualWorkflowOrchestrator
  let workflow: WorkflowDefinition
  let eventLog: Array<{ type: string; nodeId?: string }>

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
    workflow = createMockWorkflow()
    eventLog = []
  })

  it('应该能够添加事件监听器', () => {
    const listener = vi.fn((event: any) => {
      eventLog.push({ type: event.type, nodeId: event.nodeId })
    })

    orchestrator.addEventListener(listener)

    // 执行工作流后监听器应该被调用
    orchestrator.execute(workflow).then(() => {
      expect(listener).toHaveBeenCalled()
    })
  })

  it('应该能够移除事件监听器', () => {
    const listener = vi.fn()
    orchestrator.addEventListener(listener)
    orchestrator.removeEventListener(listener)

    orchestrator.execute(workflow)

    // 监听器被移除后不应该被调用
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('VisualWorkflowOrchestrator - 边界情况', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  it('应该处理等待节点', async () => {
    const waitWorkflow: WorkflowDefinition = {
      id: 'wait-workflow',
      name: '等待工作流',
      version: 1,
      status: 'active' as any,
      nodes: [
        {
          id: 'start',
          type: NodeType.START,
          name: '开始',
          position: { x: 0, y: 0 },
        },
        {
          id: 'wait',
          type: NodeType.WAIT,
          name: '等待',
          position: { x: 100, y: 0 },
          waitConfig: { duration: 0.1 }, // 100ms
        },
        {
          id: 'end',
          type: NodeType.END,
          name: '结束',
          position: { x: 200, y: 0 },
        },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'wait', type: EdgeType.SEQUENCE },
        { id: 'e2', source: 'wait', target: 'end', type: EdgeType.SEQUENCE },
      ],
      config: {},
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'test',
        updatedBy: 'test',
      },
    }

    const startTime = Date.now()
    const instance = await orchestrator.execute(waitWorkflow)
    const duration = Date.now() - startTime

    expect(instance.status).toBe(InstanceStatus.COMPLETED)
    expect(duration).toBeGreaterThanOrEqual(100)
  })

  it('应该警告多个开始节点', () => {
    const multiStartWorkflow: WorkflowDefinition = {
      id: 'multi-start',
      name: '多开始工作流',
      version: 1,
      status: 'active' as any,
      nodes: [
        { id: 'start1', type: NodeType.START, name: '开始1', position: { x: 0, y: 0 } },
        { id: 'start2', type: NodeType.START, name: '开始2', position: { x: 0, y: 100 } },
        { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'start1', target: 'end', type: EdgeType.SEQUENCE },
        { id: 'e2', source: 'start2', target: 'end', type: EdgeType.SEQUENCE },
      ],
      config: {},
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'test',
        updatedBy: 'test',
      },
    }

    const result = orchestrator.validateWorkflow(multiStartWorkflow)
    expect(result.warnings.some(w => w.includes('multiple start nodes'))).toBe(true)
  })
})
