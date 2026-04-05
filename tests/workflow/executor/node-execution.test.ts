/**
 * Workflow Executor 测试 - 节点执行逻辑
 *
 * 测试覆盖:
 * 1. 节点执行器接口
 * 2. START 节点执行
 * 3. END 节点执行
 * 4. AGENT 节点执行
 * 5. CONDITION 节点执行
 * 6. PARALLEL 节点执行
 * 7. WAIT 节点执行
 * 8. 自定义执行器
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  VisualWorkflowOrchestrator,
  OrchestratorExecutionResult,
  NodeExecutorHandler,
  ExecutionContext,
  OrchestratorConfig,
} from '@/lib/workflow/VisualWorkflowOrchestrator'
import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  NodeStatus,
  InstanceStatus,
  EdgeType,
} from '@/types/workflow'

// =====================================================
// Helper Functions
// =====================================================

/**
 * 创建模拟节点
 */
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

/**
 * 创建模拟边
 */
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

/**
 * 创建简单工作流
 */
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

/**
 * 创建执行上下文
 */
function createMockExecutionContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    instanceId: 'test-instance',
    workflowId: 'test-workflow',
    variables: {},
    inputs: {},
    outputs: {},
    logs: [],
    ...overrides,
  }
}

// =====================================================
// Test Suite: 节点执行器接口
// =====================================================

describe('WorkflowExecutor - 节点执行器接口', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('NodeExecutorHandler 接口', () => {
    it('应该包含 execute 方法', () => {
      const handler: NodeExecutorHandler = {
        execute: async (node, context) => ({
          success: true,
          nodeId: node.id,
          output: {},
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      expect(handler.execute).toBeDefined()
      expect(typeof handler.execute).toBe('function')
    })

    it('应该包含 validate 方法', () => {
      const handler: NodeExecutorHandler = {
        execute: async () => ({
          success: true,
          nodeId: '',
          output: {},
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      expect(handler.validate).toBeDefined()
      expect(typeof handler.validate).toBe('function')
    })

    it('execute 方法应该返回 OrchestratorExecutionResult', async () => {
      const handler: NodeExecutorHandler = {
        execute: async (node, context) => ({
          success: true,
          nodeId: node.id,
          output: { result: 'test' },
          duration: 100,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      const node = createMockNode('test', NodeType.AGENT)
      const context = createMockExecutionContext()
      const result = await handler.execute(node, context)

      expect(result.success).toBe(true)
      expect(result.nodeId).toBe('test')
      expect(result.output).toEqual({ result: 'test' })
      expect(result.duration).toBe(100)
      expect(result.logs).toEqual([])
    })
  })

  describe('registerExecutor', () => {
    it('应该能够注册自定义执行器', () => {
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

      expect(() => {
        orchestrator.registerExecutor('custom' as NodeType, customExecutor)
      }).not.toThrow()
    })

    it('应该能够覆盖默认执行器', () => {
      const customExecutor: NodeExecutorHandler = {
        execute: async (node, context) => ({
          success: true,
          nodeId: node.id,
          output: { overridden: true },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, customExecutor)
      // 验证没有抛出错误
    })
  })
})

// =====================================================
// Test Suite: START 节点执行
// =====================================================

describe('WorkflowExecutor - START 节点执行', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('START 节点行为', () => {
    it('START 节点应该成功执行', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const startResult = instance.nodeResults.get('start')
      expect(startResult?.status).toBe(NodeStatus.SUCCESS)
    })

    it('START 节点应该输出正确的消息', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const startResult = instance.nodeResults.get('start')
      expect(startResult?.output?.message).toBe('Workflow started')
    })

    it('START 节点应该记录执行时长', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const startResult = instance.nodeResults.get('start')
      expect(startResult?.duration).toBeDefined()
      expect(startResult!.duration!).toBeGreaterThanOrEqual(0)
    })

    it('START 节点应该是第一个执行的节点', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const startResult = instance.nodeResults.get('start')
      const taskResult = instance.nodeResults.get('task')

      const startStartTime = new Date(startResult!.startTime).getTime()
      const taskStartTime = new Date(taskResult!.startTime).getTime()

      expect(startStartTime).toBeLessThanOrEqual(taskStartTime)
    })

    it('START 节点失败应该导致工作流失败', async () => {
      const customExecutor: NodeExecutorHandler = {
        execute: async () => ({
          success: false,
          nodeId: 'start',
          error: { code: 'START_FAILED', message: 'Start node failed' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.START, customExecutor)

      const workflow = createSimpleWorkflow()

      await expect(orchestrator.execute(workflow)).rejects.toThrow()
    })
  })
})

// =====================================================
// Test Suite: END 节点执行
// =====================================================

describe('WorkflowExecutor - END 节点执行', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('END 节点行为', () => {
    it('END 节点应该成功执行', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const endResult = instance.nodeResults.get('end')
      expect(endResult?.status).toBe(NodeStatus.SUCCESS)
    })

    it('END 节点应该输出完成消息', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const endResult = instance.nodeResults.get('end')
      expect(endResult?.output?.message).toBe('Workflow completed')
    })

    it('END 节点应该是最后一个执行的节点', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const taskResult = instance.nodeResults.get('task')
      const endResult = instance.nodeResults.get('end')

      const taskEndTime = new Date(taskResult!.endTime!).getTime()
      const endStartTime = new Date(endResult!.startTime).getTime()

      expect(endStartTime).toBeGreaterThanOrEqual(taskEndTime)
    })

    it('END 节点执行完成后应该标记工作流完成', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
      expect(instance.metadata.endedAt).toBeDefined()
    })
  })
})

// =====================================================
// Test Suite: AGENT 节点执行
// =====================================================

describe('WorkflowExecutor - AGENT 节点执行', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('AGENT 节点行为', () => {
    it('AGENT 节点应该成功执行', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const taskResult = instance.nodeResults.get('task')
      expect(taskResult?.status).toBe(NodeStatus.SUCCESS)
    })

    it('AGENT 节点应该返回任务完成结果', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const taskResult = instance.nodeResults.get('task')
      expect(taskResult?.output?.result).toBe('Task completed')
    })

    it('AGENT 节点应该接收输入数据', async () => {
      const inputs = { input1: 'value1', input2: 123 }
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow, inputs)

      const taskResult = instance.nodeResults.get('task')
      expect(taskResult?.output?.data).toEqual(inputs)
    })

    it('AGENT 节点应该能够访问工作流变量', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      // 验证变量在上下文中可用
      expect(instance.data.variables).toBeDefined()
    })

    it('AGENT 节点失败应该导致工作流失败', async () => {
      const customExecutor: NodeExecutorHandler = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'TASK_FAILED', message: 'Task execution failed' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, customExecutor)

      const workflow = createSimpleWorkflow()

      await expect(orchestrator.execute(workflow)).rejects.toThrow()
    })

    it('AGENT 节点应该记录执行日志', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const taskResult = instance.nodeResults.get('task')
      expect(taskResult?.logs).toBeDefined()
    })
  })
})

// =====================================================
// Test Suite: CONDITION 节点执行
// =====================================================

describe('WorkflowExecutor - CONDITION 节点执行', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  const createConditionWorkflow = (expression: string = 'true'): WorkflowDefinition => ({
    id: 'condition-workflow',
    name: '条件分支工作流',
    version: 1,
    status: 'active' as any,
    nodes: [
      createMockNode('start', NodeType.START),
      createMockNode('condition', NodeType.CONDITION, {
        conditionConfig: {
          expression,
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
  })

  describe('CONDITION 节点行为', () => {
    it('CONDITION 节点应该成功执行', async () => {
      const workflow = createConditionWorkflow('true')
      const instance = await orchestrator.execute(workflow)

      const conditionResult = instance.nodeResults.get('condition')
      expect(conditionResult?.status).toBe(NodeStatus.SUCCESS)
    })

    it('CONDITION 节点应该返回条件结果', async () => {
      const workflow = createConditionWorkflow('true')
      const instance = await orchestrator.execute(workflow)

      const conditionResult = instance.nodeResults.get('condition')
      expect(conditionResult?.output?.condition).toBe(true)
    })

    it('CONDITION 节点应该返回分支标签', async () => {
      const workflow = createConditionWorkflow('true')
      const instance = await orchestrator.execute(workflow)

      const conditionResult = instance.nodeResults.get('condition')
      expect(conditionResult?.output?.branch).toBe('yes')
    })

    it('true 条件应该执行 true 分支', async () => {
      const workflow = createConditionWorkflow('true')
      const instance = await orchestrator.execute(workflow)

      const trueBranchResult = instance.nodeResults.get('true-branch')
      expect(trueBranchResult?.status).toBe(NodeStatus.SUCCESS)
    })

    it('false 条件应该执行 false 分支', async () => {
      const workflow = createConditionWorkflow('false')
      const instance = await orchestrator.execute(workflow)

      const falseBranchResult = instance.nodeResults.get('false-branch')
      expect(falseBranchResult?.status).toBe(NodeStatus.SUCCESS)
    })

    it('true 分支执行时 false 分支不应该执行', async () => {
      const workflow = createConditionWorkflow('true')
      const instance = await orchestrator.execute(workflow)

      const falseBranchResult = instance.nodeResults.get('false-branch')
      expect(falseBranchResult?.status).toBe(NodeStatus.IDLE)
    })

    it('应该支持复杂条件表达式', async () => {
      const workflow = createConditionWorkflow('1 > 0 && 2 < 3')
      const instance = await orchestrator.execute(workflow)

      const conditionResult = instance.nodeResults.get('condition')
      expect(conditionResult?.output?.condition).toBe(true)
    })

    it('应该支持算术表达式', async () => {
      const workflow = createConditionWorkflow('10 + 5 > 14')
      const instance = await orchestrator.execute(workflow)

      const conditionResult = instance.nodeResults.get('condition')
      expect(conditionResult?.output?.condition).toBe(true)
    })

    it('应该支持变量引用', async () => {
      const workflow: WorkflowDefinition = {
        id: 'var-condition-workflow',
        name: '变量条件工作流',
        version: 1,
        status: 'active' as any,
        nodes: [
          createMockNode('start', NodeType.START),
          createMockNode('condition', NodeType.CONDITION, {
            conditionConfig: {
              expression: '{{status}} === "active"',
              trueLabel: 'yes',
              falseLabel: 'no',
            },
          }),
          createMockNode('end', NodeType.END),
        ],
        edges: [
          createMockEdge('e1', 'start', 'condition'),
          createMockEdge('e2', 'condition', 'end'),
        ],
        config: { variables: { status: 'active' } },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const instance = await orchestrator.execute(workflow)

      const conditionResult = instance.nodeResults.get('condition')
      expect(conditionResult?.output?.condition).toBe(true)
    })

    it('无效条件表达式应该返回 false', async () => {
      const workflow = createConditionWorkflow('invalid expression {{{{')
      const instance = await orchestrator.execute(workflow)

      const conditionResult = instance.nodeResults.get('condition')
      expect(conditionResult?.output?.condition).toBe(false)
    })
  })
})

// =====================================================
// Test Suite: PARALLEL 节点执行
// =====================================================

describe('WorkflowExecutor - PARALLEL 节点执行', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  const createParallelWorkflow = (): WorkflowDefinition => ({
    id: 'parallel-workflow',
    name: '并行执行工作流',
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
  })

  describe('PARALLEL 节点行为', () => {
    it('PARALLEL 节点应该成功执行', async () => {
      const workflow = createParallelWorkflow()
      const instance = await orchestrator.execute(workflow)

      const parallelResult = instance.nodeResults.get('parallel')
      expect(parallelResult?.status).toBe(NodeStatus.SUCCESS)
    })

    it('PARALLEL 节点应该标记并行执行', async () => {
      const workflow = createParallelWorkflow()
      const instance = await orchestrator.execute(workflow)

      const parallelResult = instance.nodeResults.get('parallel')
      expect(parallelResult?.output?.parallel).toBe(true)
    })

    it('应该并行执行所有分支任务', async () => {
      const workflow = createParallelWorkflow()
      const instance = await orchestrator.execute(workflow)

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

    it('所有并行任务完成后应该汇聚到结束节点', async () => {
      const workflow = createParallelWorkflow()
      const instance = await orchestrator.execute(workflow)

      const endResult = instance.nodeResults.get('end')
      expect(endResult?.status).toBe(NodeStatus.SUCCESS)
    })
  })
})

// =====================================================
// Test Suite: WAIT 节点执行
// =====================================================

describe('WorkflowExecutor - WAIT 节点执行', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  const createWaitWorkflow = (duration: number = 0.1): WorkflowDefinition => ({
    id: 'wait-workflow',
    name: '等待节点工作流',
    version: 1,
    status: 'active' as any,
    nodes: [
      createMockNode('start', NodeType.START),
      createMockNode('wait', NodeType.WAIT, {
        waitConfig: { duration },
      }),
      createMockNode('task', NodeType.AGENT, {
        agentConfig: { agentId: 'test-agent', agentType: 'test' },
      }),
      createMockNode('end', NodeType.END),
    ],
    edges: [
      createMockEdge('e1', 'start', 'wait'),
      createMockEdge('e2', 'wait', 'task'),
      createMockEdge('e3', 'task', 'end'),
    ],
    config: {},
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test',
      updatedBy: 'test',
    },
  })

  describe('WAIT 节点行为', () => {
    it('WAIT 节点应该成功执行', async () => {
      const workflow = createWaitWorkflow(0.1)
      const instance = await orchestrator.execute(workflow)

      const waitResult = instance.nodeResults.get('wait')
      expect(waitResult?.status).toBe(NodeStatus.SUCCESS)
    })

    it('WAIT 节点应该等待指定时间', async () => {
      const workflow = createWaitWorkflow(0.2)
      const startTime = Date.now()
      await orchestrator.execute(workflow)
      const endTime = Date.now()

      const duration = endTime - startTime
      expect(duration).toBeGreaterThanOrEqual(200)
    })

    it('WAIT 节点应该记录等待时长', async () => {
      const workflow = createWaitWorkflow(0.1)
      const instance = await orchestrator.execute(workflow)

      const waitResult = instance.nodeResults.get('wait')
      expect(waitResult?.output?.waited).toBe(100)
    })

    it('WAIT 节点后应该继续执行后续节点', async () => {
      const workflow = createWaitWorkflow(0.1)
      const instance = await orchestrator.execute(workflow)

      const taskResult = instance.nodeResults.get('task')
      expect(taskResult?.status).toBe(NodeStatus.SUCCESS)
    })

    it('后续节点应该在等待完成后执行', async () => {
      const workflow = createWaitWorkflow(0.1)
      const instance = await orchestrator.execute(workflow)

      const waitResult = instance.nodeResults.get('wait')
      const taskResult = instance.nodeResults.get('task')

      const waitEndTime = new Date(waitResult!.endTime!).getTime()
      const taskStartTime = new Date(taskResult!.startTime).getTime()

      expect(taskStartTime).toBeGreaterThanOrEqual(waitEndTime - 200)
    })
  })
})

// =====================================================
// Test Suite: 自定义执行器
// =====================================================

describe('WorkflowExecutor - 自定义执行器', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('自定义执行器注册', () => {
    it('应该支持注册自定义执行器', async () => {
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

      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('自定义执行器应该被调用', async () => {
      const mockExecute = vi.fn(async () => ({
        success: true,
        nodeId: 'test',
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

    it('应该使用最新的注册覆盖之前的执行器', async () => {
      const customExecutor1: NodeExecutorHandler = {
        execute: async () => ({
          success: true,
          nodeId: 'test',
          output: { version: 1 },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      const customExecutor2: NodeExecutorHandler = {
        execute: async () => ({
          success: true,
          nodeId: 'test',
          output: { version: 2 },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, customExecutor1)
      orchestrator.registerExecutor(NodeType.AGENT, customExecutor2)

      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const taskResult = instance.nodeResults.get('task')
      expect(taskResult?.output?.version).toBe(2)
    })
  })

  describe('自定义执行器验证', () => {
    it('自定义验证器应该被调用', () => {
      const mockValidate = vi.fn(() => ({ valid: true, errors: [] }))

      const customExecutor: NodeExecutorHandler = {
        execute: async () => ({
          success: true,
          nodeId: 'test',
          output: {},
          duration: 0,
          logs: [],
        }),
        validate: mockValidate,
      }

      orchestrator.registerExecutor(NodeType.AGENT, customExecutor)

      const workflow = createSimpleWorkflow()
      orchestrator.validateWorkflow(workflow)

      expect(mockValidate).toHaveBeenCalled()
    })
  })
})

// =====================================================
// Test Suite: 执行上下文
// =====================================================

describe('WorkflowExecutor - 执行上下文', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('ExecutionContext 属性', () => {
    it('执行上下文应该包含实例ID', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.id).toBeDefined()
    })

    it('执行上下文应该包含工作流ID', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.workflowId).toBe(workflow.id)
    })

    it('执行上下文应该包含变量', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.data.variables).toBeDefined()
    })

    it('执行上下文应该包含输入数据', async () => {
      const inputs = { testInput: 'test-value' }
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow, inputs)

      expect(instance.data.inputs).toEqual(inputs)
    })

    it('执行上下文应该包含输出数据', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.data.outputs).toBeDefined()
    })

    it('执行上下文应该包含日志', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const startResult = instance.nodeResults.get('start')
      expect(startResult?.logs).toBeDefined()
    })
  })
})

// =====================================================
// Test Suite: 执行结果
// =====================================================

describe('WorkflowExecutor - 执行结果', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('OrchestratorExecutionResult 属性', () => {
    it('执行结果应该包含 success 字段', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const startResult = instance.nodeResults.get('start')
      expect(startResult?.status).toBe(NodeStatus.SUCCESS)
    })

    it('执行结果应该包含 nodeId 字段', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const startResult = instance.nodeResults.get('start')
      expect(startResult?.nodeId).toBe('start')
    })

    it('执行结果应该包含 output 字段', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const startResult = instance.nodeResults.get('start')
      expect(startResult?.output).toBeDefined()
    })

    it('执行结果应该包含 duration 字段', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const startResult = instance.nodeResults.get('start')
      expect(startResult?.duration).toBeDefined()
    })

    it('执行结果应该包含 logs 字段', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const startResult = instance.nodeResults.get('start')
      expect(startResult?.logs).toBeDefined()
    })
  })
})
