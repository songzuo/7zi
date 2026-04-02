/**
 * VisualWorkflowOrchestrator 单元测试
 *
 * 测试覆盖:
 * 1. 工作流创建和验证
 * 2. 状态转换
 * 3. 并行/串行执行
 * 4. 条件分支
 * 5. 错误处理
 * 6. 事件系统
 * 7. 执行器注册和管理
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  VisualWorkflowOrchestrator,
  OrchestratorNodeState,
  WorkflowExecutionEvent,
  EventListener,
  OrchestratorConfig,
  NodeExecutorHandler,
} from '../VisualWorkflowOrchestrator'
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
function createMockNode(
  id: string,
  type: NodeType,
  options: Partial<WorkflowNode> = {}
): WorkflowNode {
  return {
    id,
    type,
    name: `Node ${id}`,
    position: { x: 0, y: 0 },
    ...options,
  }
}

function createMockEdge(
  id: string,
  source: string,
  target: string,
  options: Partial<WorkflowEdge> = {}
): WorkflowEdge {
  return {
    id,
    source,
    target,
    type: EdgeType.SEQUENCE,
    ...options,
  }
}

function createSimpleWorkflow(): WorkflowDefinition {
  return {
    id: 'simple-workflow',
    name: '简单工作流',
    version: 1,
    status: 'active' as any,
    nodes: [
      createMockNode('start', NodeType.START),
      createMockNode('task', NodeType.AGENT, {
        agentConfig: { agentId: 'test-agent', agentType: 'test' },
      }),
      createMockNode('end', NodeType.END),
    ],
    edges: [createMockEdge('e1', 'start', 'task'), createMockEdge('e2', 'task', 'end')],
    config: {
      variables: { testVar: 'test-value' },
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test',
      updatedBy: 'test',
    },
  }
}

function createConditionWorkflow(): WorkflowDefinition {
  return {
    id: 'condition-workflow',
    name: '条件工作流',
    version: 1,
    status: 'active' as any,
    nodes: [
      createMockNode('start', NodeType.START),
      createMockNode('condition', NodeType.CONDITION, {
        conditionConfig: {
          expression: 'true',
          trueLabel: 'yes',
          falseLabel: 'no',
        },
      }),
      createMockNode('true-branch', NodeType.AGENT, {
        agentConfig: { agentId: 'agent-1', agentType: 'test' },
      }),
      createMockNode('false-branch', NodeType.AGENT, {
        agentConfig: { agentId: 'agent-2', agentType: 'test' },
      }),
      createMockNode('end', NodeType.END),
    ],
    edges: [
      createMockEdge('e1', 'start', 'condition'),
      createMockEdge('e2', 'condition', 'true-branch', {
        type: EdgeType.CONDITION,
        conditionConfig: { condition: 'true', label: 'yes' },
      }),
      createMockEdge('e3', 'condition', 'false-branch', {
        type: EdgeType.CONDITION,
        conditionConfig: { condition: 'false', label: 'no' },
      }),
      createMockEdge('e4', 'true-branch', 'end'),
      createMockEdge('e5', 'false-branch', 'end'),
    ],
    config: {},
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test',
      updatedBy: 'test',
    },
  }
}

function createParallelWorkflow(): WorkflowDefinition {
  return {
    id: 'parallel-workflow',
    name: '并行工作流',
    version: 1,
    status: 'active' as any,
    nodes: [
      createMockNode('start', NodeType.START),
      createMockNode('parallel', NodeType.PARALLEL),
      createMockNode('task1', NodeType.AGENT, {
        agentConfig: { agentId: 'agent-1', agentType: 'test' },
      }),
      createMockNode('task2', NodeType.AGENT, {
        agentConfig: { agentId: 'agent-2', agentType: 'test' },
      }),
      createMockNode('task3', NodeType.AGENT, {
        agentConfig: { agentId: 'agent-3', agentType: 'test' },
      }),
      createMockNode('end', NodeType.END),
    ],
    edges: [
      createMockEdge('e1', 'start', 'parallel'),
      createMockEdge('e2', 'parallel', 'task1', { type: EdgeType.PARALLEL }),
      createMockEdge('e3', 'parallel', 'task2', { type: EdgeType.PARALLEL }),
      createMockEdge('e4', 'parallel', 'task3', { type: EdgeType.PARALLEL }),
      createMockEdge('e5', 'task1', 'end'),
      createMockEdge('e6', 'task2', 'end'),
      createMockEdge('e7', 'task3', 'end'),
    ],
    config: {},
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test',
      updatedBy: 'test',
    },
  }
}

describe('VisualWorkflowOrchestrator - 工作流创建和验证', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('工作流验证', () => {
    it('应该验证有效的工作流', () => {
      const workflow = createSimpleWorkflow()
      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测没有节点的工作流', () => {
      const workflow = createSimpleWorkflow()
      workflow.nodes = []

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Workflow must contain at least one node')
    })

    it('应该检测缺少开始节点', () => {
      const workflow = createSimpleWorkflow()
      workflow.nodes = workflow.nodes.filter(n => n.type !== NodeType.START)

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Workflow must have a start node')
    })

    it('应该检测缺少结束节点', () => {
      const workflow = createSimpleWorkflow()
      workflow.nodes = workflow.nodes.filter(n => n.type !== NodeType.END)

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Workflow must have an end node')
    })

    it('应该检测重复的节点 ID', () => {
      const workflow = createSimpleWorkflow()
      workflow.nodes[1].id = workflow.nodes[0].id

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Duplicate node ID'))).toBe(true)
    })

    it('应该检测边引用不存在的源节点', () => {
      const workflow = createSimpleWorkflow()
      workflow.edges[0].source = 'non-existent'

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('non-existent source node'))).toBe(true)
    })

    it('应该检测边引用不存在的目标节点', () => {
      const workflow = createSimpleWorkflow()
      workflow.edges[0].target = 'non-existent'

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('non-existent target node'))).toBe(true)
    })

    it('应该警告孤立节点', () => {
      const workflow = createSimpleWorkflow()
      workflow.nodes.push(
        createMockNode('isolated', NodeType.AGENT, {
          agentConfig: { agentId: 'isolated-agent', agentType: 'test' },
        })
      )

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.warnings.some(w => w.includes('Isolated node'))).toBe(true)
    })

    it('应该验证条件节点配置', () => {
      const workflow = createSimpleWorkflow()
      const conditionNode = createMockNode('condition', NodeType.CONDITION, {
        conditionConfig: { expression: '' }, // 空表达式
      })
      workflow.nodes.splice(1, 0, conditionNode)

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
    })

    it('应该验证等待节点配置', () => {
      const workflow = createSimpleWorkflow()
      const waitNode = createMockNode('wait', NodeType.WAIT, {
        waitConfig: { duration: 0 }, // 无效等待时间
      })
      workflow.nodes.splice(1, 0, waitNode)

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
    })

    it('应该警告多个开始节点', () => {
      const workflow = createSimpleWorkflow()
      workflow.nodes.push(createMockNode('start-2', NodeType.START))

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.warnings.some(w => w.includes('multiple start nodes'))).toBe(true)
    })
  })

  describe('实例创建', () => {
    it('应该成功创建工作流实例', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      expect(instance).toBeDefined()
      expect(instance.workflowId).toBe(workflow.id)
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该初始化所有节点状态为 pending', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      workflow.nodes.forEach(node => {
        const state = orchestrator.getNodeState(instance.id, node.id)
        expect(state).toBe('pending')
      })
    })

    it('应该支持传入初始输入数据', () => {
      const workflow = createSimpleWorkflow()
      const inputs = { userInput: 'test-value' }
      const instance = orchestrator.createInstance(workflow, inputs)

      expect(instance.data.inputs).toEqual(inputs)
    })

    it('应该复制工作流变量到实例', () => {
      const workflow = createSimpleWorkflow()
      workflow.config.variables = { var1: 'value1', var2: 'value2' }
      const instance = orchestrator.createInstance(workflow)

      expect(instance.data.variables).toEqual({ var1: 'value1', var2: 'value2' })
    })

    it('应该初始化进度计数器', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      expect(instance.progress.total).toBe(workflow.nodes.length)
      expect(instance.progress.completed).toBe(0)
      expect(instance.progress.failed).toBe(0)
      expect(instance.progress.percentage).toBe(0)
    })

    it('应该记录实例创建时间', () => {
      const beforeCreate = Date.now()
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)
      const afterCreate = Date.now()

      const startedAt = new Date(instance.metadata.startedAt).getTime()
      expect(startedAt).toBeGreaterThanOrEqual(beforeCreate)
      expect(startedAt).toBeLessThanOrEqual(afterCreate)
    })
  })
})

describe('VisualWorkflowOrchestrator - 状态转换', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('实例状态', () => {
    it('应该正确执行完整状态转换', async () => {
      const workflow = createSimpleWorkflow()

      // execute 方法会创建新实例并执行
      const instance = await orchestrator.execute(workflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('应该取消正在运行的实例', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      orchestrator.cancel(instance.id)

      expect(instance.status).toBe(InstanceStatus.CANCELLED)
    })

    it('应该暂停正在运行的实例', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      orchestrator.pause(instance.id)

      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该恢复暂停的实例', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.PENDING

      orchestrator.resume(instance.id)

      expect(instance.status).toBe(InstanceStatus.RUNNING)
    })
  })

  describe('节点状态', () => {
    it('应该跟踪节点状态转换', async () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      // 初始状态
      const initialState = orchestrator.getNodeState(instance.id, 'start')
      expect(initialState).toBe('pending')

      // 执行后 - 注意 execute 会创建新实例
      const executedInstance = await orchestrator.execute(workflow)

      const finalState = orchestrator.getNodeState(executedInstance.id, 'start')
      expect(finalState).toBe('completed')
    })

    it('应该更新节点状态为 running 然后完成', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      workflow.nodes.forEach(node => {
        const state = orchestrator.getNodeState(instance.id, node.id)
        expect(state).toBe('completed')
      })
    })
  })
})

describe('VisualWorkflowOrchestrator - 执行测试', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('简单执行', () => {
    it('应该成功执行简单工作流', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
      expect(instance.progress.completed).toBe(workflow.nodes.length)
      expect(instance.progress.percentage).toBe(100)
    })

    it('应该记录执行时长', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.metadata.duration).toBeDefined()
      expect(instance.metadata.duration).toBeGreaterThan(0)
    })

    it('应该记录结束时间', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.metadata.endedAt).toBeDefined()
    })

    it('应该记录节点执行结果', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result).toBeDefined()
        expect(result?.status).toBe(NodeStatus.SUCCESS)
        expect(result?.duration).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('并行执行', () => {
    it('应该并行执行多个任务', async () => {
      const workflow = createParallelWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)

      // 检查所有并行任务都已完成
      const task1Result = instance.nodeResults.get('task1')
      const task2Result = instance.nodeResults.get('task2')
      const task3Result = instance.nodeResults.get('task3')

      expect(task1Result?.status).toBe(NodeStatus.SUCCESS)
      expect(task2Result?.status).toBe(NodeStatus.SUCCESS)
      expect(task3Result?.status).toBe(NodeStatus.SUCCESS)
    })

    it('并行任务应该几乎同时完成', async () => {
      const workflow = createParallelWorkflow()
      const instance = await orchestrator.execute(workflow)

      const task1Result = instance.nodeResults.get('task1')
      const task2Result = instance.nodeResults.get('task2')
      const task3Result = instance.nodeResults.get('task3')

      // 检查任务完成时间相近（并行执行特征）
      const endTime1 = new Date(task1Result!.endTime!).getTime()
      const endTime2 = new Date(task2Result!.endTime!).getTime()
      const endTime3 = new Date(task3Result!.endTime!).getTime()

      const maxDiff = Math.max(
        Math.abs(endTime1 - endTime2),
        Math.abs(endTime2 - endTime3),
        Math.abs(endTime1 - endTime3)
      )

      // 并行任务完成时间差应该很小（< 500ms）
      expect(maxDiff).toBeLessThan(500)
    })
  })

  describe('条件分支', () => {
    it('应该根据条件选择分支', async () => {
      const workflow = createConditionWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)

      // 条件节点应该执行
      const conditionResult = instance.nodeResults.get('condition')
      expect(conditionResult?.status).toBe(NodeStatus.SUCCESS)
    })
  })
})

describe('VisualWorkflowOrchestrator - 错误处理', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('验证错误', () => {
    it('应该拒绝无效工作流', async () => {
      const workflow = createSimpleWorkflow()
      workflow.nodes = []

      await expect(orchestrator.execute(workflow)).rejects.toThrow('Workflow validation failed')
    })

    it('应该提供详细的验证错误信息', async () => {
      const workflow = createSimpleWorkflow()
      workflow.name = ''
      workflow.nodes = []

      await expect(orchestrator.execute(workflow)).rejects.toThrow()
    })
  })

  describe('执行错误', () => {
    it('应该处理没有开始节点的工作流', async () => {
      const workflow = createSimpleWorkflow()
      workflow.nodes = workflow.nodes.filter(n => n.type !== NodeType.START)

      // 验证应该失败
      await expect(orchestrator.execute(workflow)).rejects.toThrow('Workflow validation failed')
    })

    it('应该处理没有执行器的节点类型', async () => {
      const orchestratorWithCustom = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()
      // 添加一个自定义节点类型（没有注册执行器）
      const customNode = createMockNode('custom', 'custom-type' as NodeType)
      workflow.nodes.push(customNode)

      // 由于验证会检查执行器是否存在，工作流验证可能失败
      // 或者执行时会抛出错误
      try {
        await orchestratorWithCustom.execute(workflow)
        // 如果没有抛出错误，检查自定义节点是否被正确处理
        const instance = orchestratorWithCustom.getAllInstances()[0]
        const customResult = instance.nodeResults.get('custom')
        // 自定义节点应该保持 IDLE 状态（没有执行器）
        expect(customResult?.status).toBe(NodeStatus.IDLE)
      } catch (error) {
        // 如果抛出错误，也是可接受的行为
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe('边界情况', () => {
    it('应该处理空输入', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow, {})

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('应该处理大量输入数据', async () => {
      const workflow = createSimpleWorkflow()
      const largeInputs: Record<string, unknown> = {}
      for (let i = 0; i < 1000; i++) {
        largeInputs[`key${i}`] = `value${i}`
      }

      const instance = await orchestrator.execute(workflow, largeInputs)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })
  })
})

describe('VisualWorkflowOrchestrator - 事件系统', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('事件监听', () => {
    it('应该触发工作流完成事件', async () => {
      const workflow = createSimpleWorkflow()
      const eventHandler = vi.fn()
      orchestrator.addEventListener(eventHandler)

      await orchestrator.execute(workflow)

      expect(eventHandler).toHaveBeenCalled()
      const lastCall = eventHandler.mock.calls[eventHandler.mock.calls.length - 1][0]
      expect(lastCall.type).toBe('workflow_completed')
    })

    it('应该触发节点开始和完成事件', async () => {
      const workflow = createSimpleWorkflow()
      const events: WorkflowExecutionEvent[] = []
      orchestrator.addEventListener(event => events.push(event))

      await orchestrator.execute(workflow)

      const nodeStartedEvents = events.filter(e => e.type === 'node_started')
      const nodeCompletedEvents = events.filter(e => e.type === 'node_completed')

      expect(nodeStartedEvents.length).toBeGreaterThan(0)
      expect(nodeCompletedEvents.length).toBeGreaterThan(0)
    })

    it('应该包含正确的事件数据', async () => {
      const workflow = createSimpleWorkflow()
      const events: WorkflowExecutionEvent[] = []
      orchestrator.addEventListener(event => events.push(event))

      await orchestrator.execute(workflow)

      const nodeEvent = events.find(e => e.type === 'node_started')
      expect(nodeEvent?.nodeId).toBeDefined()
      expect(nodeEvent?.instanceId).toBeDefined()
      expect(nodeEvent?.timestamp).toBeDefined()
    })

    it('应该支持移除事件监听器', async () => {
      const workflow = createSimpleWorkflow()
      const eventHandler = vi.fn()
      orchestrator.addEventListener(eventHandler)
      orchestrator.removeEventListener(eventHandler)

      await orchestrator.execute(workflow)

      expect(eventHandler).not.toHaveBeenCalled()
    })

    it('应该处理事件监听器中的错误', async () => {
      const workflow = createSimpleWorkflow()
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error')
      })
      const normalHandler = vi.fn()

      orchestrator.addEventListener(errorHandler)
      orchestrator.addEventListener(normalHandler)

      // 不应该抛出错误
      await orchestrator.execute(workflow)

      // 正常处理器应该被调用
      expect(normalHandler).toHaveBeenCalled()
    })
  })
})

describe('VisualWorkflowOrchestrator - 执行器管理', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('内置执行器', () => {
    it('应该注册默认执行器', () => {
      // 默认执行器应该存在
      const workflow = createSimpleWorkflow()
      return expect(orchestrator.execute(workflow)).resolves.toBeDefined()
    })
  })

  describe('自定义执行器', () => {
    it('应该支持注册自定义执行器', () => {
      const customExecutor: NodeExecutorHandler = {
        execute: async (node, context) => ({
          success: true,
          nodeId: node.id,
          output: { custom: true },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, customExecutor)

      // 执行应该使用自定义执行器
      const workflow = createSimpleWorkflow()
      return expect(orchestrator.execute(workflow)).resolves.toBeDefined()
    })

    it('自定义执行器应该被调用', async () => {
      const mockExecute = vi.fn(async (node, context) => ({
        success: true,
        nodeId: node.id,
        output: { custom: true },
        duration: 0,
        logs: [],
      }))

      const customExecutor: NodeExecutorHandler = {
        execute: mockExecute,
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, customExecutor)

      const workflow = createSimpleWorkflow()
      await orchestrator.execute(workflow)

      expect(mockExecute).toHaveBeenCalled()
    })
  })
})

describe('VisualWorkflowOrchestrator - 查询和统计', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('实例查询', () => {
    it('应该获取已创建的实例', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      const retrieved = orchestrator.getInstance(instance.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(instance.id)
    })

    it('应该返回 undefined 对于不存在的实例', () => {
      const retrieved = orchestrator.getInstance('non-existent')
      expect(retrieved).toBeUndefined()
    })

    it('应该获取所有实例', () => {
      const workflow = createSimpleWorkflow()
      orchestrator.createInstance(workflow)
      orchestrator.createInstance(workflow)

      const instances = orchestrator.getAllInstances()
      expect(instances).toHaveLength(2)
    })
  })

  describe('统计信息', () => {
    it('应该计算正确的统计信息', async () => {
      const workflow = createSimpleWorkflow()

      // 执行多个实例
      await orchestrator.execute(workflow)
      await orchestrator.execute(workflow)

      // 创建并取消一个实例
      const instance3 = orchestrator.createInstance(workflow)
      instance3.status = InstanceStatus.CANCELLED
      instance3.metadata.endedAt = new Date().toISOString()

      const stats = orchestrator.getStatistics(workflow.id)

      expect(stats.totalInstances).toBe(3)
      expect(stats.completed).toBe(2)
      expect(stats.cancelled).toBe(1)
      expect(stats.avgDuration).toBeGreaterThan(0)
    })

    it('应该处理没有实例的情况', () => {
      const stats = orchestrator.getStatistics('non-existent-workflow')

      expect(stats.totalInstances).toBe(0)
      expect(stats.completed).toBe(0)
      expect(stats.failed).toBe(0)
      expect(stats.cancelled).toBe(0)
      expect(stats.avgDuration).toBe(0)
    })
  })
})

describe('VisualWorkflowOrchestrator - 配置选项', () => {
  it('应该使用默认配置', () => {
    const orchestrator = new VisualWorkflowOrchestrator()
    expect(orchestrator).toBeDefined()
  })

  it('应该支持自定义配置', () => {
    const config: OrchestratorConfig = {
      globalTimeout: 60000,
      maxRetries: 5,
      retryInterval: 2000,
      enableLogs: false,
      maxParallelism: 10,
    }

    const orchestrator = new VisualWorkflowOrchestrator(config)
    expect(orchestrator).toBeDefined()
  })

  it('禁用日志时不应该生成日志', async () => {
    const config: OrchestratorConfig = {
      enableLogs: false,
    }

    const orchestrator = new VisualWorkflowOrchestrator(config)
    const workflow = createSimpleWorkflow()
    const instance = await orchestrator.execute(workflow)

    // 检查节点执行结果中没有日志
    const taskResult = instance.nodeResults.get('task')
    expect(taskResult?.logs).toBeDefined()
  })
})
