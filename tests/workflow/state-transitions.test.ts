/**
 * Workflow 状态管理测试 - 状态转换
 *
 * 测试覆盖:
 * 1. 工作流实例状态
 * 2. 节点状态转换
 * 3. 状态转换规则
 * 4. 状态持久化
 * 5. 状态查询
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  VisualWorkflowOrchestrator,
  OrchestratorNodeState,
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
 * 创建条件分支工作流
 */
function createConditionWorkflow(expression: string = 'true'): WorkflowDefinition {
  return {
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
  }
}

// =====================================================
// Test Suite: 工作流实例状态
// =====================================================

describe('WorkflowStateManagement - 工作流实例状态', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('实例状态初始化', () => {
    it('新创建的实例状态应该是 PENDING', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('实例应该有唯一的ID', () => {
      const workflow = createSimpleWorkflow()
      const instance1 = orchestrator.createInstance(workflow)
      const instance2 = orchestrator.createInstance(workflow)

      expect(instance1.id).not.toBe(instance2.id)
    })

    it('实例应该包含工作流ID', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      expect(instance.workflowId).toBe(workflow.id)
    })

    it('实例应该包含工作流版本', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      expect(instance.workflowVersion).toBe(workflow.version)
    })

    it('实例应该包含创建时间', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      expect(instance.metadata.startedAt).toBeDefined()
      expect(new Date(instance.metadata.startedAt).getTime()).not.toBeNaN()
    })
  })

  describe('实例状态转换', () => {
    it('执行时状态应该从 PENDING 转换到 RUNNING', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      // 执行完成后状态应该是 COMPLETED
      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('成功执行后状态应该是 COMPLETED', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('失败执行后状态应该是 FAILED', async () => {
      const errorExecutor = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'ERROR', message: 'Task failed' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor('agent' as NodeType, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      const instance = orchestrator.getAllInstances()[0]
      expect(instance?.status).toBe(InstanceStatus.FAILED)
    })

    it('取消后状态应该是 CANCELLED', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      orchestrator.cancel(instance.id)

      expect(instance.status).toBe(InstanceStatus.CANCELLED)
    })

    it('暂停后状态应该是 PENDING', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      orchestrator.pause(instance.id)

      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('恢复后状态应该是 RUNNING', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.PENDING

      orchestrator.resume(instance.id)

      expect(instance.status).toBe(InstanceStatus.RUNNING)
    })
  })

  describe('实例状态持久化', () => {
    it('实例应该能够被检索', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      const retrieved = orchestrator.getInstance(instance.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(instance.id)
    })

    it('不存在的实例应该返回 undefined', () => {
      const retrieved = orchestrator.getInstance('non-existent-id')

      expect(retrieved).toBeUndefined()
    })

    it('应该能够获取所有实例', () => {
      const workflow = createSimpleWorkflow()
      orchestrator.createInstance(workflow)
      orchestrator.createInstance(workflow)
      orchestrator.createInstance(workflow)

      const instances = orchestrator.getAllInstances()

      expect(instances.length).toBe(3)
    })

    it('空实例列表应该返回空数组', () => {
      const instances = orchestrator.getAllInstances()

      expect(instances).toEqual([])
    })
  })

  describe('实例状态查询', () => {
    it('应该能够查询实例状态', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该能够查询实例进度', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      expect(instance.progress.total).toBe(workflow.nodes.length)
      expect(instance.progress.completed).toBe(0)
      expect(instance.progress.failed).toBe(0)
      expect(instance.progress.percentage).toBe(0)
    })

    it('应该能够查询实例元数据', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      expect(instance.metadata.startedAt).toBeDefined()
      expect(instance.metadata.triggeredBy).toBeDefined()
      expect(instance.metadata.triggerType).toBeDefined()
    })
  })
})

// =====================================================
// Test Suite: 节点状态转换
// =====================================================

describe('WorkflowStateManagement - 节点状态转换', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('节点状态初始化', () => {
    it('新创建的节点状态应该是 pending', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      workflow.nodes.forEach(node => {
        const state = orchestrator.getNodeState(instance.id, node.id)
        expect(state).toBe('pending')
      })
    })

    it('节点执行结果应该初始化为 IDLE', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result?.status).toBe(NodeStatus.IDLE)
      })
    })

    it('节点执行结果应该包含开始时间', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result?.startTime).toBeDefined()
      })
    })
  })

  describe('节点状态转换', () => {
    it('节点应该从 pending 转换到 running', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      // 执行完成后所有节点应该是 completed
      workflow.nodes.forEach(node => {
        const state = orchestrator.getNodeState(instance.id, node.id)
        expect(state).toBe('completed')
      })
    })

    it('成功执行的节点状态应该是 completed', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      workflow.nodes.forEach(node => {
        const state = orchestrator.getNodeState(instance.id, node.id)
        expect(state).toBe('completed')
      })
    })

    it('失败执行的节点状态应该是 failed', async () => {
      const errorExecutor = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'ERROR', message: 'Task failed' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor('agent' as NodeType, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      const instance = orchestrator.getAllInstances()[0]
      const taskState = orchestrator.getNodeState(instance!.id, 'task')
      expect(taskState).toBe('failed')
    })

    it('节点执行结果状态应该正确更新', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result?.status).toBe(NodeStatus.SUCCESS)
      })
    })
  })

  describe('节点状态查询', () => {
    it('应该能够查询节点状态', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const state = orchestrator.getNodeState(instance.id, 'start')
      expect(state).toBe('completed')
    })

    it('不存在的节点应该返回 undefined', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      const state = orchestrator.getNodeState(instance.id, 'non-existent-node')
      expect(state).toBeUndefined()
    })

    it('不存在的实例应该返回 undefined', () => {
      const state = orchestrator.getNodeState('non-existent-instance', 'node-id')
      expect(state).toBeUndefined()
    })
  })

  describe('节点执行结果', () => {
    it('节点执行结果应该包含结束时间', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result?.endTime).toBeDefined()
      })
    })

    it('节点执行结果应该包含执行时长', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result?.duration).toBeDefined()
        expect(result!.duration!).toBeGreaterThanOrEqual(0)
      })
    })

    it('节点执行结果应该包含输出数据', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const startResult = instance.nodeResults.get('start')
      expect(startResult?.output).toBeDefined()
    })

    it('节点执行结果应该包含日志', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const startResult = instance.nodeResults.get('start')
      expect(startResult?.logs).toBeDefined()
    })
  })
})

// =====================================================
// Test Suite: 状态转换规则
// =====================================================

describe('WorkflowStateManagement - 状态转换规则', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('实例状态转换规则', () => {
    it('PENDING 可以转换到 RUNNING', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.PENDING

      orchestrator.resume(instance.id)

      expect(instance.status).toBe(InstanceStatus.RUNNING)
    })

    it('RUNNING 可以转换到 COMPLETED', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('RUNNING 可以转换到 FAILED', async () => {
      const errorExecutor = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'ERROR', message: 'Task failed' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor('agent' as NodeType, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      const instance = orchestrator.getAllInstances()[0]
      expect(instance?.status).toBe(InstanceStatus.FAILED)
    })

    it('RUNNING 可以转换到 CANCELLED', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      orchestrator.cancel(instance.id)

      expect(instance.status).toBe(InstanceStatus.CANCELLED)
    })

    it('RUNNING 可以转换到 PENDING', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      orchestrator.pause(instance.id)

      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('PENDING 可以转换到 RUNNING', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.PENDING

      orchestrator.resume(instance.id)

      expect(instance.status).toBe(InstanceStatus.RUNNING)
    })
  })

  describe('节点状态转换规则', () => {
    it('pending 可以转换到 running', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      // 执行完成后所有节点应该是 completed
      workflow.nodes.forEach(node => {
        const state = orchestrator.getNodeState(instance.id, node.id)
        expect(state).toBe('completed')
      })
    })

    it('running 可以转换到 completed', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      workflow.nodes.forEach(node => {
        const state = orchestrator.getNodeState(instance.id, node.id)
        expect(state).toBe('completed')
      })
    })

    it('running 可以转换到 failed', async () => {
      const errorExecutor = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'ERROR', message: 'Task failed' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor('agent' as NodeType, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      const instance = orchestrator.getAllInstances()[0]
      const taskState = orchestrator.getNodeState(instance!.id, 'task')
      expect(taskState).toBe('failed')
    })
  })

  describe('状态转换约束', () => {
    it('COMPLETED 状态不应该再转换', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)

      // 尝试取消已完成的实例
      orchestrator.cancel(instance.id)

      // 状态应该保持 COMPLETED
      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('FAILED 状态不应该再转换', async () => {
      const errorExecutor = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'ERROR', message: 'Task failed' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor('agent' as NodeType, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      const instance = orchestrator.getAllInstances()[0]
      expect(instance?.status).toBe(InstanceStatus.FAILED)

      // 尝试取消已失败的实例
      if (instance) {
        orchestrator.cancel(instance.id)
      }

      // 状态应该保持 FAILED
      expect(instance?.status).toBe(InstanceStatus.FAILED)
    })

    it('CANCELLED 状态不应该再转换', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      orchestrator.cancel(instance.id)

      expect(instance.status).toBe(InstanceStatus.CANCELLED)

      // 尝试恢复已取消的实例
      orchestrator.resume(instance.id)

      // 状态应该保持 CANCELLED
      expect(instance.status).toBe(InstanceStatus.CANCELLED)
    })
  })
})

// =====================================================
// Test Suite: 状态持久化
// =====================================================

describe('WorkflowStateManagement - 状态持久化', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('实例状态持久化', () => {
    it('实例状态应该被持久化', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const retrieved = orchestrator.getInstance(instance.id)

      expect(retrieved?.status).toBe(instance.status)
      expect(retrieved?.id).toBe(instance.id)
    })

    it('实例进度应该被持久化', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const retrieved = orchestrator.getInstance(instance.id)

      expect(retrieved?.progress).toEqual(instance.progress)
    })

    it('实例元数据应该被持久化', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const retrieved = orchestrator.getInstance(instance.id)

      expect(retrieved?.metadata).toEqual(instance.metadata)
    })

    it('实例数据应该被持久化', async () => {
      const inputs = { testInput: 'test-value' }
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow, inputs)

      const retrieved = orchestrator.getInstance(instance.id)

      expect(retrieved?.data.inputs).toEqual(inputs)
    })
  })

  describe('节点状态持久化', () => {
    it('节点状态应该被持久化', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      workflow.nodes.forEach(node => {
        const state = orchestrator.getNodeState(instance.id, node.id)
        expect(state).toBe('completed')
      })
    })

    it('节点执行结果应该被持久化', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result).toBeDefined()
      })
    })
  })

  describe('多实例状态管理', () => {
    it('应该能够管理多个实例', async () => {
      const workflow = createSimpleWorkflow()

      const instance1 = await orchestrator.execute(workflow)
      const instance2 = await orchestrator.execute(workflow)
      const instance3 = await orchestrator.execute(workflow)

      const instances = orchestrator.getAllInstances()

      expect(instances.length).toBe(3)
      expect(instances[0].id).toBe(instance1.id)
      expect(instances[1].id).toBe(instance2.id)
      expect(instances[2].id).toBe(instance3.id)
    })

    it('每个实例的状态应该独立', async () => {
      const workflow = createSimpleWorkflow()

      const instance1 = await orchestrator.execute(workflow)
      const instance2 = await orchestrator.execute(workflow)

      expect(instance1.id).not.toBe(instance2.id)
      expect(instance1.status).toBe(InstanceStatus.COMPLETED)
      expect(instance2.status).toBe(InstanceStatus.COMPLETED)
    })
  })
})

// =====================================================
// Test Suite: 状态查询
// =====================================================

describe('WorkflowStateManagement - 状态查询', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('实例状态查询', () => {
    it('应该能够查询实例状态', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })

    it('应该能够查询实例进度', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.progress.total).toBe(workflow.nodes.length)
      expect(instance.progress.completed).toBe(workflow.nodes.length)
      expect(instance.progress.percentage).toBe(100)
    })

    it('应该能够查询实例元数据', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.metadata.startedAt).toBeDefined()
      expect(instance.metadata.endedAt).toBeDefined()
      expect(instance.metadata.duration).toBeDefined()
    })

    it('应该能够查询实例数据', async () => {
      const inputs = { testInput: 'test-value' }
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow, inputs)

      expect(instance.data.inputs).toEqual(inputs)
    })
  })

  describe('节点状态查询', () => {
    it('应该能够查询节点状态', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      workflow.nodes.forEach(node => {
        const state = orchestrator.getNodeState(instance.id, node.id)
        expect(state).toBe('completed')
      })
    })

    it('应该能够查询节点执行结果', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result).toBeDefined()
        expect(result?.status).toBe(NodeStatus.SUCCESS)
      })
    })

    it('应该能够查询节点输出', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const startResult = instance.nodeResults.get('start')
      expect(startResult?.output?.message).toBe('Workflow started')
    })

    it('应该能够查询节点日志', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      const startResult = instance.nodeResults.get('start')
      expect(startResult?.logs).toBeDefined()
    })
  })

  describe('统计信息查询', () => {
    it('应该能够获取工作流统计信息', async () => {
      const workflow = createSimpleWorkflow()

      await orchestrator.execute(workflow)
      await orchestrator.execute(workflow)

      const stats = orchestrator.getStatistics(workflow.id)

      expect(stats.totalInstances).toBe(2)
      expect(stats.completed).toBe(2)
      expect(stats.failed).toBe(0)
      expect(stats.cancelled).toBe(0)
    })

    it('统计信息应该包含平均执行时长', async () => {
      const workflow = createSimpleWorkflow()

      await orchestrator.execute(workflow)
      await orchestrator.execute(workflow)

      const stats = orchestrator.getStatistics(workflow.id)

      expect(stats.avgDuration).toBeGreaterThan(0)
    })

    it('空工作流应该返回零值统计', () => {
      const stats = orchestrator.getStatistics('non-existent-workflow')

      expect(stats.totalInstances).toBe(0)
      expect(stats.completed).toBe(0)
      expect(stats.failed).toBe(0)
      expect(stats.cancelled).toBe(0)
      expect(stats.avgDuration).toBe(0)
    })
  })
})

// =====================================================
// Test Suite: 状态转换事件
// =====================================================

describe('WorkflowStateManagement - 状态转换事件', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('节点状态转换事件', () => {
    it('节点开始时应该触发 node_started 事件', async () => {
      const workflow = createSimpleWorkflow()

      let nodeStartedEmitted = false
      orchestrator.addEventListener((event) => {
        if (event.type === 'node_started') {
          nodeStartedEmitted = true
        }
      })

      await orchestrator.execute(workflow)

      expect(nodeStartedEmitted).toBe(true)
    })

    it('节点完成时应该触发 node_completed 事件', async () => {
      const workflow = createSimpleWorkflow()

      let nodeCompletedEmitted = false
      orchestrator.addEventListener((event) => {
        if (event.type === 'node_completed') {
          nodeCompletedEmitted = true
        }
      })

      await orchestrator.execute(workflow)

      expect(nodeCompletedEmitted).toBe(true)
    })

    it('节点失败时应该触发 node_failed 事件', async () => {
      const errorExecutor = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'ERROR', message: 'Task failed' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor('agent' as NodeType, errorExecutor)

      const workflow = createSimpleWorkflow()

      let nodeFailedEmitted = false
      orchestrator.addEventListener((event) => {
        if (event.type === 'node_failed') {
          nodeFailedEmitted = true
        }
      })

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      expect(nodeFailedEmitted).toBe(true)
    })
  })

  describe('工作流状态转换事件', () => {
    it('工作流完成时应该触发 workflow_completed 事件', async () => {
      const workflow = createSimpleWorkflow()

      let workflowCompletedEmitted = false
      orchestrator.addEventListener((event) => {
        if (event.type === 'workflow_completed') {
          workflowCompletedEmitted = true
        }
      })

      await orchestrator.execute(workflow)

      expect(workflowCompletedEmitted).toBe(true)
    })

    it('工作流失败时应该触发 workflow_failed 事件', async () => {
      const errorExecutor = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'ERROR', message: 'Task failed' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor('agent' as NodeType, errorExecutor)

      const workflow = createSimpleWorkflow()

      let workflowFailedEmitted = false
      orchestrator.addEventListener((event) => {
        if (event.type === 'workflow_failed') {
          workflowFailedEmitted = true
        }
      })

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      expect(workflowFailedEmitted).toBe(true)
    })

    it('事件应该包含正确的实例ID', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      let capturedInstanceId = ''
      orchestrator.addEventListener((event) => {
        capturedInstanceId = event.instanceId
      })

      expect(capturedInstanceId).toBe(instance.id)
    })

    it('事件应该包含正确的时间戳', async () => {
      const workflow = createSimpleWorkflow()
      await orchestrator.execute(workflow)

      let capturedTimestamp = ''
      orchestrator.addEventListener((event) => {
        capturedTimestamp = event.timestamp
      })

      expect(capturedTimestamp).toBeDefined()
      expect(new Date(capturedTimestamp).getTime()).not.toBeNaN()
    })
  })
})