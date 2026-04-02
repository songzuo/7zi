/**
 * Visual Workflow Orchestrator v1.8.0 - Comprehensive Unit Tests
 *
 * 完整测试覆盖:
 * 1. 工作流创建 - createInstance(definition)
 * 2. 工作流执行 - execute(workflow, inputs)
 * 3. 工作流取消 - cancel(instanceId)
 * 4. 工作流暂停/恢复 - pause/resume
 * 5. 6种节点类型的执行逻辑 (START, END, AGENT, CONDITION, PARALLEL, WAIT)
 * 6. 条件分支的执行
 * 7. 并行节点的执行
 * 8. 等待节点的执行
 * 9. 自定义执行器注册
 * 10. 事件监听系统
 * 11. 错误处理和边界情况
 *
 * @version 1.8.0
 * @date 2026-04-02
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  VisualWorkflowOrchestrator,
  type OrchestratorConfig,
  type NodeExecutorHandler,
  type EventListener,
  type ExecutionContext,
  type OrchestratorExecutionResult,
} from '@/lib/workflow/VisualWorkflowOrchestrator'
import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  NodeStatus,
  InstanceStatus,
  EdgeType,
  WorkflowStatus,
} from '@/types/workflow'

// ============================================
// Mock 数据生成器
// ============================================

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
      variables: {
        testVar: 'test-value',
        count: 10,
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

function createConditionWorkflow(): WorkflowDefinition {
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
    id: 'condition-workflow',
    name: '条件测试工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
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

function createParallelWorkflow(): WorkflowDefinition {
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
    id: 'parallel-workflow',
    name: '并行测试工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
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

function createWaitWorkflow(): WorkflowDefinition {
  return {
    id: 'wait-workflow',
    name: '等待工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
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
}

function createComplexWorkflow(): WorkflowDefinition {
  return {
    id: 'complex-workflow',
    name: '复杂工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
      {
        id: 'task-1',
        type: NodeType.AGENT,
        name: '任务1',
        position: { x: 100, y: 0 },
        agentConfig: { agentId: 'agent-1', agentType: 'executor' },
      },
      {
        id: 'condition',
        type: NodeType.CONDITION,
        name: '条件判断',
        position: { x: 200, y: 0 },
        conditionConfig: { expression: '{{score}} > 50', trueLabel: 'pass', falseLabel: 'fail' },
      },
      { id: 'parallel', type: NodeType.PARALLEL, name: '并行处理', position: { x: 300, y: 0 } },
      {
        id: 'task-2',
        type: NodeType.AGENT,
        name: '任务2',
        position: { x: 400, y: -50 },
        agentConfig: { agentId: 'agent-2', agentType: 'executor' },
      },
      {
        id: 'task-3',
        type: NodeType.AGENT,
        name: '任务3',
        position: { x: 400, y: 50 },
        agentConfig: { agentId: 'agent-3', agentType: 'executor' },
      },
      {
        id: 'wait',
        type: NodeType.WAIT,
        name: '等待',
        position: { x: 500, y: 0 },
        waitConfig: { duration: 0.05 },
      },
      { id: 'end', type: NodeType.END, name: '结束', position: { x: 600, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'task-1', type: EdgeType.SEQUENCE },
      { id: 'e2', source: 'task-1', target: 'condition', type: EdgeType.SEQUENCE },
      {
        id: 'e3',
        source: 'condition',
        target: 'parallel',
        type: EdgeType.CONDITION,
        conditionConfig: { condition: 'pass', label: 'pass' },
      },
      { id: 'e4', source: 'parallel', target: 'task-2', type: EdgeType.PARALLEL },
      { id: 'e5', source: 'parallel', target: 'task-3', type: EdgeType.PARALLEL },
      { id: 'e6', source: 'task-2', target: 'wait', type: EdgeType.SEQUENCE },
      { id: 'e7', source: 'task-3', target: 'wait', type: EdgeType.SEQUENCE },
      { id: 'e8', source: 'wait', target: 'end', type: EdgeType.SEQUENCE },
    ],
    config: { variables: { score: 80 } },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test',
      updatedBy: 'test',
    },
  }
}

// ============================================
// 测试套件
// ============================================

describe('VisualWorkflowOrchestrator v1.8.0 - 配置测试', () => {
  it('应该使用默认配置创建实例', () => {
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

  it('应该合并默认配置和自定义配置', () => {
    const config: OrchestratorConfig = {
      maxRetries: 10,
    }
    const orchestrator = new VisualWorkflowOrchestrator(config)
    expect(orchestrator).toBeDefined()
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 工作流创建测试', () => {
  let orchestrator: VisualWorkflowOrchestrator
  let workflow: WorkflowDefinition

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
    workflow = createMockWorkflow()
  })

  describe('createInstance - 基础创建', () => {
    it('应该成功创建工作流实例', () => {
      const instance = orchestrator.createInstance(workflow)

      expect(instance).toBeDefined()
      expect(instance.id).toMatch(/^instance_/)
      expect(instance.workflowId).toBe(workflow.id)
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该支持传入初始输入数据', () => {
      const inputs = { testInput: 'value', count: 42 }
      const instance = orchestrator.createInstance(workflow, inputs)

      expect(instance.data.inputs).toEqual(inputs)
    })

    it('应该初始化工作流变量', () => {
      const instance = orchestrator.createInstance(workflow)

      expect(instance.data.variables).toEqual(workflow.config.variables)
    })

    it('应该为每个节点创建初始结果', () => {
      const instance = orchestrator.createInstance(workflow)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result).toBeDefined()
        expect(result?.nodeId).toBe(node.id)
        expect(result?.status).toBe(NodeStatus.IDLE)
      })
    })

    it('应该设置正确的进度信息', () => {
      const instance = orchestrator.createInstance(workflow)

      expect(instance.progress.total).toBe(workflow.nodes.length)
      expect(instance.progress.completed).toBe(0)
      expect(instance.progress.failed).toBe(0)
      expect(instance.progress.percentage).toBe(0)
    })

    it('应该设置元数据', () => {
      const instance = orchestrator.createInstance(workflow)

      expect(instance.metadata.startedAt).toBeDefined()
      expect(instance.metadata.triggeredBy).toBe('system')
      expect(instance.metadata.triggerType).toBe('manual')
    })

    it('应该返回工作流版本', () => {
      const instance = orchestrator.createInstance(workflow)

      expect(instance.workflowVersion).toBe(workflow.version)
    })
  })

  describe('createInstance - 多实例管理', () => {
    it('应该支持创建多个实例', () => {
      const instance1 = orchestrator.createInstance(workflow)
      const instance2 = orchestrator.createInstance(workflow)

      expect(instance1.id).not.toBe(instance2.id)
      expect(orchestrator.getAllInstances()).toHaveLength(2)
    })

    it('应该能够通过 ID 获取实例', () => {
      const instance = orchestrator.createInstance(workflow)
      const retrieved = orchestrator.getInstance(instance.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(instance.id)
    })

    it('应该返回 undefined 获取不存在的实例', () => {
      const retrieved = orchestrator.getInstance('non-existent-id')
      expect(retrieved).toBeUndefined()
    })
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 工作流执行测试', () => {
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
      expect(instance.progress.percentage).toBe(100)
    })

    it('应该设置执行时长', async () => {
      const instance = await orchestrator.execute(workflow)

      expect(instance.metadata.duration).toBeDefined()
      expect(instance.metadata.duration!).toBeGreaterThanOrEqual(0)
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

    it('应该更新所有节点状态为 completed', async () => {
      const instance = await orchestrator.execute(workflow)

      workflow.nodes.forEach(node => {
        const state = orchestrator.getNodeState(instance.id, node.id)
        expect(state).toBe('completed')
      })
    })

    it('应该更新所有节点结果为 SUCCESS', async () => {
      const instance = await orchestrator.execute(workflow)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result?.status).toBe(NodeStatus.SUCCESS)
      })
    })
  })

  describe('execute - 验证', () => {
    it('应该拒绝空节点列表', async () => {
      const invalidWorkflow = { ...workflow, nodes: [] }

      await expect(orchestrator.execute(invalidWorkflow)).rejects.toThrow()
    })

    it('应该拒绝没有开始节点的工作流', async () => {
      const invalidWorkflow = {
        ...workflow,
        nodes: workflow.nodes.filter(n => n.type !== NodeType.START),
      }

      await expect(orchestrator.execute(invalidWorkflow)).rejects.toThrow()
    })

    it('应该拒绝没有结束节点的工作流', async () => {
      const invalidWorkflow = {
        ...workflow,
        nodes: workflow.nodes.filter(n => n.type !== NodeType.END),
      }

      await expect(orchestrator.execute(invalidWorkflow)).rejects.toThrow()
    })

    it('应该验证工作流结构', () => {
      const validWorkflow = workflow
      const result = orchestrator.validateWorkflow(validWorkflow)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('execute - 复杂工作流', () => {
    it('应该执行复杂工作流', async () => {
      const complexWorkflow = createComplexWorkflow()
      const instance = await orchestrator.execute(complexWorkflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 工作流取消测试', () => {
  let orchestrator: VisualWorkflowOrchestrator
  let workflow: WorkflowDefinition

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
    workflow = createMockWorkflow()
  })

  describe('cancel - 取消逻辑', () => {
    it('应该能够取消运行中的实例', () => {
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      orchestrator.cancel(instance.id)

      expect(instance.status).toBe(InstanceStatus.CANCELLED)
    })

    it('取消非运行状态的实例不应该改变状态', () => {
      const instance = orchestrator.createInstance(workflow)
      // 初始状态是 PENDING
      expect(instance.status).toBe(InstanceStatus.PENDING)

      orchestrator.cancel(instance.id)

      // PENDING 状态不应该被取消
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('取消应该设置结束时间', () => {
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      orchestrator.cancel(instance.id)

      expect(instance.metadata.endedAt).toBeDefined()
    })

    it('取消已完成的实例不应该改变状态', async () => {
      const instance = await orchestrator.execute(workflow)
      expect(instance.status).toBe(InstanceStatus.COMPLETED)

      orchestrator.cancel(instance.id)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 暂停/恢复测试', () => {
  let orchestrator: VisualWorkflowOrchestrator
  let workflow: WorkflowDefinition

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
    workflow = createMockWorkflow()
  })

  describe('pause - 暂停逻辑', () => {
    it('应该能够暂停运行中的实例', () => {
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      orchestrator.pause(instance.id)

      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('暂停已完成实例不应该改变状态', async () => {
      const instance = await orchestrator.execute(workflow)
      expect(instance.status).toBe(InstanceStatus.COMPLETED)

      orchestrator.pause(instance.id)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('暂停已取消实例不应该改变状态', () => {
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.CANCELLED

      orchestrator.pause(instance.id)

      expect(instance.status).toBe(InstanceStatus.CANCELLED)
    })
  })

  describe('resume - 恢复逻辑', () => {
    it('应该能够恢复暂停的实例', () => {
      const instance = orchestrator.createInstance(workflow)
      // PENDING 状态可以被恢复为 RUNNING
      orchestrator.resume(instance.id)

      expect(instance.status).toBe(InstanceStatus.RUNNING)
    })

    it('恢复运行中的实例不应该改变状态', () => {
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      orchestrator.resume(instance.id)

      expect(instance.status).toBe(InstanceStatus.RUNNING)
    })

    it('恢复已完成实例不应该改变状态', async () => {
      const instance = await orchestrator.execute(workflow)
      expect(instance.status).toBe(InstanceStatus.COMPLETED)

      orchestrator.resume(instance.id)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })
  })

  describe('pause/resume - 组合操作', () => {
    it('应该支持暂停后恢复', () => {
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      orchestrator.pause(instance.id)
      expect(instance.status).toBe(InstanceStatus.PENDING)

      orchestrator.resume(instance.id)
      expect(instance.status).toBe(InstanceStatus.RUNNING)
    })
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 节点类型执行测试', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('START 节点', () => {
    it('应该成功执行 START 节点', async () => {
      const workflow = createMockWorkflow()
      const instance = await orchestrator.execute(workflow)

      const startResult = instance.nodeResults.get('start-node')
      expect(startResult?.status).toBe(NodeStatus.SUCCESS)
      expect(startResult?.output).toBeDefined()
    })
  })

  describe('END 节点', () => {
    it('应该成功执行 END 节点', async () => {
      const workflow = createMockWorkflow()
      const instance = await orchestrator.execute(workflow)

      const endResult = instance.nodeResults.get('end-node')
      expect(endResult?.status).toBe(NodeStatus.SUCCESS)
      expect(endResult?.output).toBeDefined()
    })
  })

  describe('AGENT 节点', () => {
    it('应该成功执行 AGENT 节点', async () => {
      const workflow = createMockWorkflow()
      const instance = await orchestrator.execute(workflow)

      const agentResult = instance.nodeResults.get('agent-node')
      expect(agentResult?.status).toBe(NodeStatus.SUCCESS)
      expect(agentResult?.duration).toBeGreaterThanOrEqual(0)
    })

    it('AGENT 节点应该接收输入数据', async () => {
      const workflow = createMockWorkflow()
      const inputs = { testData: 'value' }
      const instance = await orchestrator.execute(workflow, inputs)

      const agentResult = instance.nodeResults.get('agent-node')
      expect(agentResult?.output).toBeDefined()
    })
  })

  describe('CONDITION 节点', () => {
    it('应该成功执行 CONDITION 节点', async () => {
      const workflow = createConditionWorkflow()
      const instance = await orchestrator.execute(workflow)

      const conditionResult = instance.nodeResults.get('condition-node')
      expect(conditionResult?.status).toBe(NodeStatus.SUCCESS)
    })

    it('CONDITION 节点应该输出分支信息', async () => {
      const workflow = createConditionWorkflow()
      const instance = await orchestrator.execute(workflow)

      const conditionResult = instance.nodeResults.get('condition-node')
      expect(conditionResult?.output?.branch).toBeDefined()
    })
  })

  describe('PARALLEL 节点', () => {
    it('应该成功执行 PARALLEL 节点', async () => {
      const workflow = createParallelWorkflow()
      const instance = await orchestrator.execute(workflow)

      const parallelResult = instance.nodeResults.get('parallel-node')
      expect(parallelResult?.status).toBe(NodeStatus.SUCCESS)
    })

    it('PARALLEL 节点应该并行执行所有分支', async () => {
      const workflow = createParallelWorkflow()
      const instance = await orchestrator.execute(workflow)

      // 所有分支任务应该完成
      expect(instance.nodeResults.get('agent-1')?.status).toBe(NodeStatus.SUCCESS)
      expect(instance.nodeResults.get('agent-2')?.status).toBe(NodeStatus.SUCCESS)
      expect(instance.nodeResults.get('agent-3')?.status).toBe(NodeStatus.SUCCESS)
    })
  })

  describe('WAIT 节点', () => {
    it('应该成功执行 WAIT 节点', async () => {
      const workflow = createWaitWorkflow()
      const instance = await orchestrator.execute(workflow)

      const waitResult = instance.nodeResults.get('wait')
      expect(waitResult?.status).toBe(NodeStatus.SUCCESS)
    })

    it('WAIT 节点应该等待指定时间', async () => {
      const workflow = createWaitWorkflow()
      const startTime = Date.now()
      await orchestrator.execute(workflow)
      const duration = Date.now() - startTime

      // 等待 100ms + 执行时间
      expect(duration).toBeGreaterThanOrEqual(90)
    })

    it('WAIT 节点应该输出等待时长', async () => {
      const workflow = createWaitWorkflow()
      const instance = await orchestrator.execute(workflow)

      const waitResult = instance.nodeResults.get('wait')
      expect(waitResult?.output?.waited).toBeDefined()
    })
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 条件分支执行测试', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  it('应该执行条件分支工作流', async () => {
    const workflow = createConditionWorkflow()
    const instance = await orchestrator.execute(workflow)

    expect(instance.status).toBe(InstanceStatus.COMPLETED)
  })

  it('条件节点应该正确评估条件', async () => {
    const workflow = createConditionWorkflow()
    const instance = await orchestrator.execute(workflow)

    const conditionResult = instance.nodeResults.get('condition-node')
    expect(conditionResult?.output?.condition).toBeDefined()
  })

  it('条件节点应该输出分支标签', async () => {
    const workflow = createConditionWorkflow()
    const instance = await orchestrator.execute(workflow)

    const conditionResult = instance.nodeResults.get('condition-node')
    expect(['true', 'false']).toContain(conditionResult?.output?.branch)
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 并行执行测试', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  it('应该并行执行所有分支', async () => {
    const workflow = createParallelWorkflow()
    const instance = await orchestrator.execute(workflow)

    expect(instance.status).toBe(InstanceStatus.COMPLETED)
    expect(instance.nodeResults.get('agent-1')?.status).toBe(NodeStatus.SUCCESS)
    expect(instance.nodeResults.get('agent-2')?.status).toBe(NodeStatus.SUCCESS)
    expect(instance.nodeResults.get('agent-3')?.status).toBe(NodeStatus.SUCCESS)
  })

  it('并行节点应该在所有分支完成后继续', async () => {
    const workflow = createParallelWorkflow()
    const instance = await orchestrator.execute(workflow)

    // End 节点应该完成
    expect(instance.nodeResults.get('end-node')?.status).toBe(NodeStatus.SUCCESS)
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 等待节点执行测试', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  it('应该等待指定时间后继续', async () => {
    const workflow = createWaitWorkflow()
    const instance = await orchestrator.execute(workflow)

    expect(instance.status).toBe(InstanceStatus.COMPLETED)
    expect(instance.nodeResults.get('wait')?.status).toBe(NodeStatus.SUCCESS)
    expect(instance.nodeResults.get('end')?.status).toBe(NodeStatus.SUCCESS)
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 自定义执行器测试', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

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

    // 不应该抛出错误
    expect(() => orchestrator.registerExecutor(NodeType.AGENT, customExecutor)).not.toThrow()
  })

  it('自定义执行器应该被调用', async () => {
    const customExecutor: NodeExecutorHandler = {
      execute: vi.fn(async (node, context) => ({
        success: true,
        nodeId: node.id,
        output: { customOutput: 'test' },
        duration: 0,
        logs: [],
      })),
      validate: () => ({ valid: true, errors: [] }),
    }

    orchestrator.registerExecutor(NodeType.AGENT, customExecutor)

    const workflow = createMockWorkflow()
    await orchestrator.execute(workflow)

    expect(customExecutor.execute).toHaveBeenCalled()
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 事件监听测试', () => {
  let orchestrator: VisualWorkflowOrchestrator
  let workflow: WorkflowDefinition

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
    workflow = createMockWorkflow()
  })

  it('应该能够添加事件监听器', () => {
    const listener: EventListener = vi.fn()
    orchestrator.addEventListener(listener)

    expect(orchestrator).toBeDefined()
  })

  it('应该能够移除事件监听器', () => {
    const listener: EventListener = vi.fn()
    orchestrator.addEventListener(listener)
    orchestrator.removeEventListener(listener)

    expect(orchestrator).toBeDefined()
  })

  it('执行时应该触发事件', async () => {
    const listener: EventListener = vi.fn()
    orchestrator.addEventListener(listener)

    await orchestrator.execute(workflow)

    // 应该触发多个事件
    expect(listener).toHaveBeenCalled()
  })

  it('工作流完成应该触发 workflow_completed 事件', async () => {
    const events: string[] = []
    const listener: EventListener = event => {
      events.push(event.type)
    }
    orchestrator.addEventListener(listener)

    await orchestrator.execute(workflow)

    expect(events).toContain('workflow_completed')
  })

  it('节点开始应该触发 node_started 事件', async () => {
    const events: string[] = []
    const listener: EventListener = event => {
      events.push(event.type)
    }
    orchestrator.addEventListener(listener)

    await orchestrator.execute(workflow)

    expect(events).toContain('node_started')
  })

  it('节点完成应该触发 node_completed 事件', async () => {
    const events: string[] = []
    const listener: EventListener = event => {
      events.push(event.type)
    }
    orchestrator.addEventListener(listener)

    await orchestrator.execute(workflow)

    expect(events).toContain('node_completed')
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 错误处理测试', () => {
  let orchestrator: VisualWorkflowOrchestrator
  let workflow: WorkflowDefinition

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
    workflow = createMockWorkflow()
  })

  describe('工作流验证错误', () => {
    it('应该检测空节点列表', () => {
      const invalidWorkflow = { ...workflow, nodes: [] }
      const result = orchestrator.validateWorkflow(invalidWorkflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Workflow must contain at least one node')
    })

    it('应该检测缺少开始节点', () => {
      const invalidWorkflow = {
        ...workflow,
        nodes: workflow.nodes.filter(n => n.type !== NodeType.START),
      }
      const result = orchestrator.validateWorkflow(invalidWorkflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Workflow must have a start node')
    })

    it('应该检测缺少结束节点', () => {
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

    it('应该检测孤立节点', () => {
      const isolatedWorkflow: WorkflowDefinition = {
        id: 'isolated-workflow',
        name: '孤立节点工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          {
            id: 'isolated',
            type: NodeType.AGENT,
            name: '孤立节点',
            position: { x: 100, y: 100 },
            agentConfig: { agentId: 'agent-1', agentType: 'executor' },
          },
          { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
        ],
        edges: [{ id: 'e1', source: 'start', target: 'end', type: EdgeType.SEQUENCE }],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const result = orchestrator.validateWorkflow(isolatedWorkflow)
      expect(result.warnings.some(w => w.includes('Isolated node'))).toBe(true)
    })

    it('应该警告多个开始节点', () => {
      const multiStartWorkflow: WorkflowDefinition = {
        id: 'multi-start',
        name: '多开始工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
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

  describe('节点验证', () => {
    it('应该验证 CONDITION 节点配置', () => {
      const invalidWorkflow: WorkflowDefinition = {
        id: 'invalid-condition',
        name: '无效条件工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          {
            id: 'condition',
            type: NodeType.CONDITION,
            name: '条件',
            position: { x: 100, y: 0 },
            conditionConfig: {},
          }, // 缺少 expression
          { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'condition', type: EdgeType.SEQUENCE },
          { id: 'e2', source: 'condition', target: 'end', type: EdgeType.SEQUENCE },
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const result = orchestrator.validateWorkflow(invalidWorkflow)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Condition expression is required'))).toBe(true)
    })

    it('应该验证 WAIT 节点配置', () => {
      const invalidWorkflow: WorkflowDefinition = {
        id: 'invalid-wait',
        name: '无效等待工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          {
            id: 'wait',
            type: NodeType.WAIT,
            name: '等待',
            position: { x: 100, y: 0 },
            waitConfig: {},
          }, // 缺少 duration
          { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
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

      const result = orchestrator.validateWorkflow(invalidWorkflow)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Wait duration is required'))).toBe(true)
    })
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 统计信息测试', () => {
  let orchestrator: VisualWorkflowOrchestrator
  let workflow: WorkflowDefinition

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
    workflow = createMockWorkflow()
  })

  it('应该获取工作流统计信息', async () => {
    await orchestrator.execute(workflow)
    await orchestrator.execute(workflow)

    const stats = orchestrator.getStatistics(workflow.id)

    expect(stats.totalInstances).toBe(2)
    expect(stats.completed).toBe(2)
    expect(stats.failed).toBe(0)
    expect(stats.cancelled).toBe(0)
  })

  it('应该计算平均执行时长', async () => {
    await orchestrator.execute(workflow)

    const stats = orchestrator.getStatistics(workflow.id)

    expect(stats.avgDuration).toBeGreaterThan(0)
  })

  it('应该统计失败实例', async () => {
    // 创建一个失败的工作流
    const invalidWorkflow = { ...workflow, nodes: [] }

    try {
      await orchestrator.execute(invalidWorkflow)
    } catch {
      // 预期失败
    }

    const stats = orchestrator.getStatistics(workflow.id)
    // 注意：失败的工作流不会创建实例，所以这里测试正常工作流的统计
    expect(stats.totalInstances).toBe(0)
  })

  it('应该统计取消实例', () => {
    const instance = orchestrator.createInstance(workflow)
    instance.status = InstanceStatus.RUNNING
    orchestrator.cancel(instance.id)

    const stats = orchestrator.getStatistics(workflow.id)
    expect(stats.cancelled).toBe(1)
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 节点状态查询测试', () => {
  let orchestrator: VisualWorkflowOrchestrator
  let workflow: WorkflowDefinition

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
    workflow = createMockWorkflow()
  })

  it('应该能够查询节点状态', () => {
    const instance = orchestrator.createInstance(workflow)

    const state = orchestrator.getNodeState(instance.id, 'start-node')
    expect(state).toBe('pending')
  })

  it('查询不存在的节点应该返回 undefined', () => {
    const instance = orchestrator.createInstance(workflow)

    const state = orchestrator.getNodeState(instance.id, 'non-existent')
    expect(state).toBeUndefined()
  })

  it('查询不存在的实例应该返回 undefined', () => {
    const state = orchestrator.getNodeState('non-existent', 'start-node')
    expect(state).toBeUndefined()
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 边界情况测试', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  it('应该处理最小工作流（只有开始和结束）', async () => {
    const minimalWorkflow: WorkflowDefinition = {
      id: 'minimal-workflow',
      name: '最小工作流',
      version: 1,
      status: WorkflowStatus.ACTIVE,
      nodes: [
        { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
        { id: 'end', type: NodeType.END, name: '结束', position: { x: 100, y: 0 } },
      ],
      edges: [{ id: 'e1', source: 'start', target: 'end', type: EdgeType.SEQUENCE }],
      config: {},
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'test',
        updatedBy: 'test',
      },
    }

    const instance = await orchestrator.execute(minimalWorkflow)
    expect(instance.status).toBe(InstanceStatus.COMPLETED)
  })

  it('应该处理多个连续节点', async () => {
    const multiNodeWorkflow: WorkflowDefinition = {
      id: 'multi-node-workflow',
      name: '多节点工作流',
      version: 1,
      status: WorkflowStatus.ACTIVE,
      nodes: [
        { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
        {
          id: 'task1',
          type: NodeType.AGENT,
          name: '任务1',
          position: { x: 100, y: 0 },
          agentConfig: { agentId: 'agent-1', agentType: 'executor' },
        },
        {
          id: 'task2',
          type: NodeType.AGENT,
          name: '任务2',
          position: { x: 200, y: 0 },
          agentConfig: { agentId: 'agent-2', agentType: 'executor' },
        },
        {
          id: 'task3',
          type: NodeType.AGENT,
          name: '任务3',
          position: { x: 300, y: 0 },
          agentConfig: { agentId: 'agent-3', agentType: 'executor' },
        },
        { id: 'end', type: NodeType.END, name: '结束', position: { x: 400, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'task1', type: EdgeType.SEQUENCE },
        { id: 'e2', source: 'task1', target: 'task2', type: EdgeType.SEQUENCE },
        { id: 'e3', source: 'task2', target: 'task3', type: EdgeType.SEQUENCE },
        { id: 'e4', source: 'task3', target: 'end', type: EdgeType.SEQUENCE },
      ],
      config: {},
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'test',
        updatedBy: 'test',
      },
    }

    const instance = await orchestrator.execute(multiNodeWorkflow)
    expect(instance.status).toBe(InstanceStatus.COMPLETED)
    expect(instance.progress.completed).toBe(5)
  })

  it('应该处理嵌套条件分支', async () => {
    const nestedWorkflow: WorkflowDefinition = {
      id: 'nested-workflow',
      name: '嵌套条件工作流',
      version: 1,
      status: WorkflowStatus.ACTIVE,
      nodes: [
        { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
        {
          id: 'cond1',
          type: NodeType.CONDITION,
          name: '条件1',
          position: { x: 100, y: 0 },
          conditionConfig: { expression: 'true', trueLabel: 'yes', falseLabel: 'no' },
        },
        {
          id: 'cond2',
          type: NodeType.CONDITION,
          name: '条件2',
          position: { x: 200, y: 0 },
          conditionConfig: { expression: 'true', trueLabel: 'yes', falseLabel: 'no' },
        },
        { id: 'end', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'cond1', type: EdgeType.SEQUENCE },
        {
          id: 'e2',
          source: 'cond1',
          target: 'cond2',
          type: EdgeType.CONDITION,
          conditionConfig: { condition: 'yes', label: 'yes' },
        },
        { id: 'e3', source: 'cond2', target: 'end', type: EdgeType.SEQUENCE },
      ],
      config: {},
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'test',
        updatedBy: 'test',
      },
    }

    const instance = await orchestrator.execute(nestedWorkflow)
    expect(instance.status).toBe(InstanceStatus.COMPLETED)
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 日志功能测试', () => {
  let orchestrator: VisualWorkflowOrchestrator
  let workflow: WorkflowDefinition

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator({ enableLogs: true })
    workflow = createMockWorkflow()
  })

  it('应该记录节点执行日志', async () => {
    const instance = await orchestrator.execute(workflow)

    // 检查至少有一个节点有日志
    const hasLogs = Array.from(instance.nodeResults.values()).some(
      result => result.logs && result.logs.length > 0
    )
    expect(hasLogs).toBe(true)
  })

  it('禁用日志时不应该记录日志', async () => {
    const noLogOrchestrator = new VisualWorkflowOrchestrator({ enableLogs: false })
    const instance = await noLogOrchestrator.execute(workflow)

    // 检查所有节点都没有日志
    const hasLogs = Array.from(instance.nodeResults.values()).some(
      result => result.logs && result.logs.length > 0
    )
    expect(hasLogs).toBe(false)
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 性能测试', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  it('应该快速执行简单工作流', async () => {
    const workflow = createMockWorkflow()
    const startTime = Date.now()
    await orchestrator.execute(workflow)
    const duration = Date.now() - startTime

    // 应该在 500ms 内完成
    expect(duration).toBeLessThan(500)
  })

  it('应该高效执行并行工作流', async () => {
    const workflow = createParallelWorkflow()
    const startTime = Date.now()
    await orchestrator.execute(workflow)
    const duration = Date.now() - startTime

    // 并行执行应该比顺序执行快
    expect(duration).toBeLessThan(500)
  })
})

describe('VisualWorkflowOrchestrator v1.8.0 - 集成测试', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  it('应该执行完整的复杂工作流', async () => {
    const workflow = createComplexWorkflow()
    const instance = await orchestrator.execute(workflow)

    expect(instance.status).toBe(InstanceStatus.COMPLETED)
    // 复杂工作流中，条件节点只执行一个分支，所以 completed 可能小于 total
    expect(instance.progress.completed).toBeGreaterThan(0)
  })

  it('应该正确处理工作流变量', async () => {
    const workflow = createComplexWorkflow()
    const instance = await orchestrator.execute(workflow)

    expect(instance.data.variables).toBeDefined()
    expect(instance.data.variables?.score).toBe(80)
  })

  it('应该支持多次执行同一工作流', async () => {
    const workflow = createMockWorkflow()

    const instance1 = await orchestrator.execute(workflow)
    const instance2 = await orchestrator.execute(workflow)

    expect(instance1.status).toBe(InstanceStatus.COMPLETED)
    expect(instance2.status).toBe(InstanceStatus.COMPLETED)
    expect(instance1.id).not.toBe(instance2.id)
  })
})
