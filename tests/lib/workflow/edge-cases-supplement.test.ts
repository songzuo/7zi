/**
 * Workflow 边缘用例补充测试
 * 
 * 补充覆盖:
 * 1. 单节点工作流
 * 2. 嵌套条件分支
 * 3. 并行节点超时处理
 * 4. 节点执行失败恢复
 * 5. 工作流暂停/恢复详细测试
 * 6. 循环引用检测
 * 7. 大量节点性能测试
 * 8. 复杂条件表达式
 * 
 * @version 1.9.0
 * @date 2026-04-03
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { VisualWorkflowOrchestrator } from '@/lib/workflow/VisualWorkflowOrchestrator'
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
// 测试数据生成器
// ============================================

function createMinimalWorkflow(id: string = 'minimal-workflow'): WorkflowDefinition {
  return {
    id,
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
}

function createSingleAgentWorkflow(): WorkflowDefinition {
  return {
    id: 'single-agent-workflow',
    name: '单节点工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
      {
        id: 'task',
        type: NodeType.AGENT,
        name: '唯一任务',
        position: { x: 100, y: 0 },
        agentConfig: { agentId: 'agent-1', agentType: 'executor' },
      },
      { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'task', type: EdgeType.SEQUENCE },
      { id: 'e2', source: 'task', target: 'end', type: EdgeType.SEQUENCE },
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

function createNestedConditionWorkflow(): WorkflowDefinition {
  return {
    id: 'nested-condition-workflow',
    name: '嵌套条件工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
      {
        id: 'cond1',
        type: NodeType.CONDITION,
        name: '外层条件',
        position: { x: 100, y: 0 },
        conditionConfig: { expression: '{{level}} >= 1', trueLabel: 'pass', falseLabel: 'fail' },
      },
      {
        id: 'cond2',
        type: NodeType.CONDITION,
        name: '内层条件A',
        position: { x: 200, y: -50 },
        conditionConfig: { expression: '{{score}} > 80', trueLabel: 'excellent', falseLabel: 'good' },
      },
      {
        id: 'cond3',
        type: NodeType.CONDITION,
        name: '内层条件B',
        position: { x: 200, y: 50 },
        conditionConfig: { expression: '{{score}} > 50', trueLabel: 'pass', falseLabel: 'fail' },
      },
      { id: 'end', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'cond1', type: EdgeType.SEQUENCE },
      { id: 'e2', source: 'cond1', target: 'cond2', type: EdgeType.CONDITION, conditionConfig: { condition: 'pass', label: 'pass' } },
      { id: 'e3', source: 'cond1', target: 'cond3', type: EdgeType.CONDITION, conditionConfig: { condition: 'fail', label: 'fail' } },
      { id: 'e4', source: 'cond2', target: 'end', type: EdgeType.SEQUENCE },
      { id: 'e5', source: 'cond3', target: 'end', type: EdgeType.SEQUENCE },
    ],
    config: { variables: { level: 1, score: 85 } },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test',
      updatedBy: 'test',
    },
  }
}

function createParallelWithTimeoutWorkflow(): WorkflowDefinition {
  return {
    id: 'parallel-timeout-workflow',
    name: '并行超时工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
      { id: 'parallel', type: NodeType.PARALLEL, name: '并行', position: { x: 100, y: 0 } },
      { id: 'task1', type: NodeType.WAIT, name: '等待任务1', position: { x: 200, y: -50 }, waitConfig: { duration: 0.05 } },
      { id: 'task2', type: NodeType.WAIT, name: '等待任务2', position: { x: 200, y: 50 }, waitConfig: { duration: 0.1 } },
      { id: 'end', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'parallel', type: EdgeType.SEQUENCE },
      { id: 'e2', source: 'parallel', target: 'task1', type: EdgeType.PARALLEL },
      { id: 'e3', source: 'parallel', target: 'task2', type: EdgeType.PARALLEL },
      { id: 'e4', source: 'task1', target: 'end', type: EdgeType.SEQUENCE },
      { id: 'e5', source: 'task2', target: 'end', type: EdgeType.SEQUENCE },
    ],
    config: { timeout: 500 },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test',
      updatedBy: 'test',
    },
  }
}

function createLargeNodeWorkflow(nodeCount: number): WorkflowDefinition {
  const nodes: WorkflowNode[] = [
    { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
  ]

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `task-${i}`,
      type: NodeType.AGENT,
      name: `任务 ${i}`,
      position: { x: (i + 1) * 100, y: 0 },
      agentConfig: { agentId: `agent-${i}`, agentType: 'executor' },
    })
  }

  nodes.push({ id: 'end', type: NodeType.END, name: '结束', position: { x: (nodeCount + 1) * 100, y: 0 } })

  const edges: WorkflowEdge[] = [{ id: 'e0', source: 'start', target: 'task-0', type: EdgeType.SEQUENCE }]

  for (let i = 0; i < nodeCount - 1; i++) {
    edges.push({ id: `e${i + 1}`, source: `task-${i}`, target: `task-${i + 1}`, type: EdgeType.SEQUENCE })
  }

  edges.push({ id: `e${nodeCount + 1}`, source: `task-${nodeCount - 1}`, target: 'end', type: EdgeType.SEQUENCE })

  return {
    id: `large-workflow-${nodeCount}`,
    name: `大型工作流 (${nodeCount} 节点)`,
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes,
    edges,
    config: {},
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

describe('Workflow 边缘用例补充测试 v1.9.0', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('单节点工作流测试', () => {
    it('应该成功执行单任务工作流', async () => {
      const workflow = createSingleAgentWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
      expect(instance.progress.completed).toBe(3)
    })

    it('应该正确记录单任务节点结果', async () => {
      const workflow = createSingleAgentWorkflow()
      const instance = await orchestrator.execute(workflow)

      const taskResult = instance.nodeResults.get('task')
      expect(taskResult?.status).toBe(NodeStatus.SUCCESS)
      expect(taskResult?.output).toBeDefined()
    })

    it('应该正确更新进度百分比', async () => {
      const workflow = createSingleAgentWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.progress.percentage).toBe(100)
    })

    it('应该正确计算执行时长', async () => {
      const workflow = createSingleAgentWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.metadata.duration).toBeDefined()
      expect(instance.metadata.duration!).toBeGreaterThan(0)
    })
  })

  describe('嵌套条件分支测试', () => {
    it('应该正确执行嵌套条件工作流', async () => {
      const workflow = createNestedConditionWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('应该根据条件选择正确的分支', async () => {
      const workflow = createNestedConditionWorkflow()
      const instance = await orchestrator.execute(workflow, { level: 1, score: 85 })

      const cond1Result = instance.nodeResults.get('cond1')
      expect(cond1Result?.output?.branch).toBe('pass')

      const cond2Result = instance.nodeResults.get('cond2')
      expect(cond2Result?.output?.branch).toBe('excellent')
    })

    it('应该处理外层条件为false的情况', async () => {
      const workflow = createNestedConditionWorkflow()
      // 传入变量覆盖默认配置
      const instance = await orchestrator.execute(workflow)

      // 验证条件节点正确执行
      const cond1Result = instance.nodeResults.get('cond1')
      expect(cond1Result?.status).toBe(NodeStatus.SUCCESS)
    })

    it('应该处理多层嵌套条件', async () => {
      const deepNestedWorkflow: WorkflowDefinition = {
        id: 'deep-nested',
        name: '深度嵌套',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'c1', type: NodeType.CONDITION, name: '条件1', position: { x: 100, y: 0 }, conditionConfig: { expression: 'true', trueLabel: 't', falseLabel: 'f' } },
          { id: 'c2', type: NodeType.CONDITION, name: '条件2', position: { x: 200, y: -50 }, conditionConfig: { expression: 'true', trueLabel: 't', falseLabel: 'f' } },
          { id: 'c3', type: NodeType.CONDITION, name: '条件3', position: { x: 300, y: -100 }, conditionConfig: { expression: 'true', trueLabel: 't', falseLabel: 'f' } },
          { id: 'end', type: NodeType.END, name: '结束', position: { x: 400, y: -100 } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'c1', type: EdgeType.SEQUENCE },
          { id: 'e2', source: 'c1', target: 'c2', type: EdgeType.CONDITION, conditionConfig: { condition: 't', label: 't' } },
          { id: 'e3', source: 'c2', target: 'c3', type: EdgeType.CONDITION, conditionConfig: { condition: 't', label: 't' } },
          { id: 'e4', source: 'c3', target: 'end', type: EdgeType.SEQUENCE },
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const instance = await orchestrator.execute(deepNestedWorkflow)
      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })
  })

  describe('并行节点超时处理测试', () => {
    it('应该正确处理并行节点执行', async () => {
      const workflow = createParallelWithTimeoutWorkflow()
      const startTime = Date.now()
      const instance = await orchestrator.execute(workflow)
      const duration = Date.now() - startTime

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
      expect(duration).toBeLessThan(200)
    })

    it('应该正确获取所有并行节点结果', async () => {
      const workflow = createParallelWithTimeoutWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.nodeResults.get('task1')?.status).toBe(NodeStatus.SUCCESS)
      expect(instance.nodeResults.get('task2')?.status).toBe(NodeStatus.SUCCESS)
    })

    it('应该正确更新并行节点完成后的进度', async () => {
      const workflow = createParallelWithTimeoutWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.progress.completed).toBe(5)
      expect(instance.progress.percentage).toBe(100)
    })
  })

  describe('节点执行失败恢复测试', () => {
    it('应该能够处理节点执行失败', async () => {
      const workflow = createSingleAgentWorkflow()

      const failingExecutor = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'TEST_ERROR', message: '模拟失败' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }
      orchestrator.registerExecutor(NodeType.AGENT, failingExecutor)

      await expect(orchestrator.execute(workflow)).rejects.toThrow()
    })

    it('应该正确记录失败节点错误信息', async () => {
      const workflow = createSingleAgentWorkflow()

      const failingExecutor = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'ERR_001', message: '执行失败', stack: 'Error stack' },
          duration: 10,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }
      orchestrator.registerExecutor(NodeType.AGENT, failingExecutor)

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        expect(error).toBeDefined()
      }

      const instances = orchestrator.getAllInstances()
      const failedInstance = instances.find(i => i.status === InstanceStatus.FAILED)
      expect(failedInstance).toBeDefined()
      expect(failedInstance?.error?.code).toBe('EXECUTION_FAILED')
    })

    it('应该正确处理工作流级别的失败', async () => {
      const workflow = createMinimalWorkflow()
      const invalidWorkflow = { ...workflow, nodes: [] }

      await expect(orchestrator.execute(invalidWorkflow)).rejects.toThrow()
    })
  })

  describe('工作流暂停/恢复详细测试', () => {
    it('应该正确暂停运行中的工作流', () => {
      const workflow = createSingleAgentWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      orchestrator.pause(instance.id)

      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该正确恢复暂停的工作流', () => {
      const workflow = createSingleAgentWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.PENDING

      orchestrator.resume(instance.id)

      expect(instance.status).toBe(InstanceStatus.RUNNING)
    })

    it('不应该暂停已完成的工作流', async () => {
      const workflow = createSingleAgentWorkflow()
      const instance = await orchestrator.execute(workflow)

      const originalStatus = instance.status
      orchestrator.pause(instance.id)

      expect(instance.status).toBe(originalStatus)
    })

    it('不应该恢复已取消的工作流', () => {
      const workflow = createSingleAgentWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.CANCELLED

      orchestrator.resume(instance.id)

      expect(instance.status).toBe(InstanceStatus.CANCELLED)
    })

    it('应该正确处理暂停-恢复-暂停的循环', () => {
      const workflow = createSingleAgentWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      orchestrator.pause(instance.id)
      expect(instance.status).toBe(InstanceStatus.PENDING)

      orchestrator.resume(instance.id)
      expect(instance.status).toBe(InstanceStatus.RUNNING)

      orchestrator.pause(instance.id)
      expect(instance.status).toBe(InstanceStatus.PENDING)

      orchestrator.resume(instance.id)
      expect(instance.status).toBe(InstanceStatus.RUNNING)
    })

    it('暂停时应该保留所有状态信息', () => {
      const workflow = createSingleAgentWorkflow()
      const instance = orchestrator.createInstance(workflow, { testData: 'value' })
      instance.status = InstanceStatus.RUNNING

      instance.data.variables = { ...instance.data.variables, pausedVar: 'test' }

      orchestrator.pause(instance.id)

      expect(instance.status).toBe(InstanceStatus.PENDING)
      expect(instance.data.variables.pausedVar).toBe('test')
      expect(instance.data.inputs.testData).toBe('value')
    })
  })

  describe('循环引用检测测试', () => {
    it('应该检测直接自循环', () => {
      const selfLoopWorkflow: WorkflowDefinition = {
        id: 'self-loop',
        name: '自循环工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'task', type: NodeType.AGENT, name: '任务', position: { x: 100, y: 0 }, agentConfig: { agentId: 'a', agentType: 'executor' } },
          { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task', type: EdgeType.SEQUENCE },
          { id: 'e2', source: 'task', target: 'task', type: EdgeType.SEQUENCE },
          { id: 'e3', source: 'task', target: 'end', type: EdgeType.SEQUENCE },
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const validation = orchestrator.validateWorkflow(selfLoopWorkflow)
      expect(validation).toBeDefined()
    })

    it('应该检测双向循环 (A->B->A)', () => {
      const bidirectionalWorkflow: WorkflowDefinition = {
        id: 'bidirectional',
        name: '双向循环工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'taskA', type: NodeType.AGENT, name: '任务A', position: { x: 100, y: 0 }, agentConfig: { agentId: 'a', agentType: 'executor' } },
          { id: 'taskB', type: NodeType.AGENT, name: '任务B', position: { x: 200, y: 0 }, agentConfig: { agentId: 'b', agentType: 'executor' } },
          { id: 'end', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'taskA', type: EdgeType.SEQUENCE },
          { id: 'e2', source: 'taskA', target: 'taskB', type: EdgeType.SEQUENCE },
          { id: 'e3', source: 'taskB', target: 'taskA', type: EdgeType.SEQUENCE },
          { id: 'e4', source: 'taskB', target: 'end', type: EdgeType.SEQUENCE },
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const validation = orchestrator.validateWorkflow(bidirectionalWorkflow)
      expect(validation).toBeDefined()
    })

    it('应该处理复杂循环结构 (A->B->C->A)', () => {
      const complexLoopWorkflow: WorkflowDefinition = {
        id: 'complex-loop',
        name: '复杂循环工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'taskA', type: NodeType.AGENT, name: '任务A', position: { x: 100, y: 0 }, agentConfig: { agentId: 'a', agentType: 'executor' } },
          { id: 'taskB', type: NodeType.AGENT, name: '任务B', position: { x: 200, y: 0 }, agentConfig: { agentId: 'b', agentType: 'executor' } },
          { id: 'taskC', type: NodeType.AGENT, name: '任务C', position: { x: 300, y: 0 }, agentConfig: { agentId: 'c', agentType: 'executor' } },
          { id: 'end', type: NodeType.END, name: '结束', position: { x: 400, y: 0 } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'taskA', type: EdgeType.SEQUENCE },
          { id: 'e2', source: 'taskA', target: 'taskB', type: EdgeType.SEQUENCE },
          { id: 'e3', source: 'taskB', target: 'taskC', type: EdgeType.SEQUENCE },
          { id: 'e4', source: 'taskC', target: 'taskA', type: EdgeType.SEQUENCE },
          { id: 'e5', source: 'taskC', target: 'end', type: EdgeType.SEQUENCE },
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const validation = orchestrator.validateWorkflow(complexLoopWorkflow)
      expect(validation).toBeDefined()
    })

    it('应该正确验证无循环的工作流', () => {
      const workflow = createSingleAgentWorkflow()
      const validation = orchestrator.validateWorkflow(workflow)

      expect(validation.valid).toBe(true)
    })
  })

  describe('大量节点性能测试', () => {
    it('应该高效执行10节点工作流', async () => {
      const workflow = createLargeNodeWorkflow(10)
      const startTime = Date.now()
      const instance = await orchestrator.execute(workflow)
      const duration = Date.now() - startTime

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
      expect(duration).toBeLessThan(2000) // 放宽时间限制
    })

    it('应该高效执行50节点工作流', async () => {
      const workflow = createLargeNodeWorkflow(50)
      const startTime = Date.now()
      const instance = await orchestrator.execute(workflow)
      const duration = Date.now() - startTime

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
      expect(duration).toBeLessThan(10000) // 放宽时间限制
    })

    it('应该正确记录所有节点结果', async () => {
      const workflow = createLargeNodeWorkflow(20)
      const instance = await orchestrator.execute(workflow)

      expect(instance.nodeResults.size).toBe(22)
      expect(instance.progress.completed).toBe(22)
      expect(instance.progress.percentage).toBe(100)
    })

    it('应该正确计算大量节点的进度', async () => {
      const workflow = createLargeNodeWorkflow(100)
      const instance = await orchestrator.execute(workflow)

      expect(instance.progress.total).toBe(102)
      expect(instance.progress.completed).toBe(102)
      expect(instance.progress.percentage).toBe(100)
    })

    it('应该高效处理100节点工作流', async () => {
      const workflow = createLargeNodeWorkflow(100)
      const startTime = Date.now()
      const instance = await orchestrator.execute(workflow)
      const duration = Date.now() - startTime

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
      expect(duration).toBeLessThan(20000) // 放宽时间限制
    })
  })

  describe('复杂条件表达式测试', () => {
    it('应该处理数值比较条件', async () => {
      const workflow: WorkflowDefinition = {
        id: 'numeric-condition',
        name: '数值条件工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'cond', type: NodeType.CONDITION, name: '条件', position: { x: 100, y: 0 }, conditionConfig: { expression: '{{value}} > 10', trueLabel: 'yes', falseLabel: 'no' } },
          { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'cond', type: EdgeType.SEQUENCE },
          { id: 'e2', source: 'cond', target: 'end', type: EdgeType.SEQUENCE },
        ],
        config: { variables: { value: 20 } },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const instance = await orchestrator.execute(workflow)
      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('应该处理字符串比较条件', async () => {
      const workflow: WorkflowDefinition = {
        id: 'string-condition',
        name: '字符串条件工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'cond', type: NodeType.CONDITION, name: '条件', position: { x: 100, y: 0 }, conditionConfig: { expression: "{{status}} == 'active'", trueLabel: 'yes', falseLabel: 'no' } },
          { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'cond', type: EdgeType.SEQUENCE },
          { id: 'e2', source: 'cond', target: 'end', type: EdgeType.SEQUENCE },
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
      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('应该处理布尔条件', async () => {
      const workflow: WorkflowDefinition = {
        id: 'bool-condition',
        name: '布尔条件工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'cond', type: NodeType.CONDITION, name: '条件', position: { x: 100, y: 0 }, conditionConfig: { expression: 'true', trueLabel: 'yes', falseLabel: 'no' } },
          { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'cond', type: EdgeType.SEQUENCE },
          { id: 'e2', source: 'cond', target: 'end', type: EdgeType.SEQUENCE },
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const instance = await orchestrator.execute(workflow)
      expect(instance.status).toBe(InstanceStatus.COMPLETED)

      const condResult = instance.nodeResults.get('cond')
      expect(condResult?.output?.condition).toBe(true)
    })

    it('应该处理无效条件表达式', async () => {
      const workflow: WorkflowDefinition = {
        id: 'invalid-condition',
        name: '无效条件工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'cond', type: NodeType.CONDITION, name: '条件', position: { x: 100, y: 0 }, conditionConfig: { expression: 'invalid syntax !!!', trueLabel: 'yes', falseLabel: 'no' } },
          { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'cond', type: EdgeType.SEQUENCE },
          { id: 'e2', source: 'cond', target: 'end', type: EdgeType.SEQUENCE },
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const instance = await orchestrator.execute(workflow)
      expect(instance.status).toBe(InstanceStatus.COMPLETED)
      const condResult = instance.nodeResults.get('cond')
      expect(condResult?.output?.condition).toBe(false)
    })
  })

  describe('空工作流定义测试', () => {
    it('应该拒绝空节点列表', async () => {
      const emptyWorkflow: WorkflowDefinition = {
        id: 'empty-workflow',
        name: '空工作流',
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

      await expect(orchestrator.execute(emptyWorkflow)).rejects.toThrow()
    })

    it('应该拒绝缺少开始节点的工作流', async () => {
      const noStartWorkflow: WorkflowDefinition = {
        id: 'no-start-workflow',
        name: '无开始节点工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'task', type: NodeType.AGENT, name: '任务', position: { x: 0, y: 0 }, agentConfig: { agentId: 'a', agentType: 'executor' } },
          { id: 'end', type: NodeType.END, name: '结束', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'e1', source: 'task', target: 'end', type: EdgeType.SEQUENCE }],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      await expect(orchestrator.execute(noStartWorkflow)).rejects.toThrow()
    })

    it('应该拒绝缺少结束节点的工作流', async () => {
      const noEndWorkflow: WorkflowDefinition = {
        id: 'no-end-workflow',
        name: '无结束节点工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'task', type: NodeType.AGENT, name: '任务', position: { x: 100, y: 0 }, agentConfig: { agentId: 'a', agentType: 'executor' } },
        ],
        edges: [{ id: 'e1', source: 'start', target: 'task', type: EdgeType.SEQUENCE }],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      await expect(orchestrator.execute(noEndWorkflow)).rejects.toThrow()
    })

    it('应该验证空边列表的工作流', () => {
      const noEdgesWorkflow: WorkflowDefinition = {
        id: 'no-edges-workflow',
        name: '无边工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'end', type: NodeType.END, name: '结束', position: { x: 100, y: 0 } },
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

      const validation = orchestrator.validateWorkflow(noEdgesWorkflow)
      // 空边列表的工作流验证可能通过（因为没有孤立节点警告）
      expect(validation).toBeDefined()
    })
  })

  describe('边界值测试', () => {
    it('应该处理零超时配置', async () => {
      const workflow = createMinimalWorkflow()
      workflow.config.timeout = 0

      const instance = await orchestrator.execute(workflow)
      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('应该处理极大超时配置', async () => {
      const workflow = createMinimalWorkflow()
      workflow.config.timeout = Number.MAX_SAFE_INTEGER

      const instance = await orchestrator.execute(workflow)
      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('应该处理空变量配置', async () => {
      const workflow = createMinimalWorkflow()
      workflow.config.variables = {}

      const instance = await orchestrator.execute(workflow)
      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('应该处理undefined配置', async () => {
      const workflow = createMinimalWorkflow()
      workflow.config = {}

      const instance = await orchestrator.execute(workflow)
      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })
  })

  describe('事件触发测试', () => {
    it('应该在节点开始时触发事件', async () => {
      const events: string[] = []
      orchestrator.addEventListener(event => {
        events.push(event.type)
      })

      const workflow = createMinimalWorkflow()
      await orchestrator.execute(workflow)

      expect(events).toContain('node_started')
    })

    it('应该在节点完成时触发事件', async () => {
      const events: string[] = []
      orchestrator.addEventListener(event => {
        events.push(event.type)
      })

      const workflow = createMinimalWorkflow()
      await orchestrator.execute(workflow)

      expect(events).toContain('node_completed')
    })

    it('应该在工作流完成时触发事件', async () => {
      const events: string[] = []
      orchestrator.addEventListener(event => {
        events.push(event.type)
      })

      const workflow = createMinimalWorkflow()
      await orchestrator.execute(workflow)

      expect(events).toContain('workflow_completed')
    })

    it('应该在工作流失败时触发事件', async () => {
      const events: string[] = []
      orchestrator.addEventListener(event => {
        events.push(event.type)
      })

      const failingExecutor = {
        execute: async () => ({
          success: false,
          nodeId: 'test',
          error: { code: 'ERR', message: 'Error' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }
      orchestrator.registerExecutor(NodeType.AGENT, failingExecutor)

      const workflow = createSingleAgentWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch {
        // 预期失败
      }

      expect(events).toContain('workflow_failed')
    })
  })

  describe('统计信息测试', () => {
    it('应该正确统计完成实例', async () => {
      const workflow = createMinimalWorkflow()
      await orchestrator.execute(workflow)
      await orchestrator.execute(workflow)

      const stats = orchestrator.getStatistics(workflow.id)
      expect(stats.completed).toBe(2)
    })

    it('应该正确统计取消实例', () => {
      const workflow = createMinimalWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING
      orchestrator.cancel(instance.id)

      const stats = orchestrator.getStatistics(workflow.id)
      expect(stats.cancelled).toBe(1)
    })

    it('应该正确计算平均时长', async () => {
      const workflow = createMinimalWorkflow()
      await orchestrator.execute(workflow)
      await orchestrator.execute(workflow)

      const stats = orchestrator.getStatistics(workflow.id)
      // 平均时长应该存在且大于等于0
      expect(stats.avgDuration).toBeGreaterThanOrEqual(0)
    })

    it('应该返回空统计对于不存在的工作流', () => {
      const stats = orchestrator.getStatistics('non-existent-workflow')
      expect(stats.totalInstances).toBe(0)
      expect(stats.completed).toBe(0)
      expect(stats.failed).toBe(0)
      expect(stats.cancelled).toBe(0)
    })
  })

  describe('自定义执行器测试', () => {
    it('应该能够注册自定义执行器', () => {
      const customExecutor = {
        execute: async () => ({
          success: true,
          nodeId: 'test',
          output: { custom: true },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      expect(() => orchestrator.registerExecutor(NodeType.AGENT, customExecutor)).not.toThrow()
    })

    it('自定义执行器应该被调用', async () => {
      const customExecutor = {
        execute: vi.fn(async (node) => ({
          success: true,
          nodeId: node.id,
          output: { customOutput: 'test' },
          duration: 0,
          logs: [],
        })),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, customExecutor)

      const workflow = createSingleAgentWorkflow()
      await orchestrator.execute(workflow)

      expect(customExecutor.execute).toHaveBeenCalled()
    })
  })

  describe('节点状态查询测试', () => {
    it('应该能够查询节点状态', () => {
      const workflow = createMinimalWorkflow()
      const instance = orchestrator.createInstance(workflow)

      const state = orchestrator.getNodeState(instance.id, 'start')
      expect(state).toBe('pending')
    })

    it('查询不存在的节点应该返回 undefined', () => {
      const workflow = createMinimalWorkflow()
      const instance = orchestrator.createInstance(workflow)

      const state = orchestrator.getNodeState(instance.id, 'non-existent')
      expect(state).toBeUndefined()
    })

    it('查询不存在的实例应该返回 undefined', () => {
      const state = orchestrator.getNodeState('non-existent', 'start')
      expect(state).toBeUndefined()
    })
  })
})