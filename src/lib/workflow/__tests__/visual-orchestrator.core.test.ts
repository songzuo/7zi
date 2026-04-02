/**
 * VisualWorkflowOrchestrator 核心功能测试
 *
 * 测试覆盖:
 * 1. 工作流创建 (createInstance)
 * 2. 节点注册和执行
 * 3. 边界情况：空工作流、单个节点
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  VisualWorkflowOrchestrator,
  OrchestratorNodeState,
  WorkflowExecutionEvent,
  EventListener,
  OrchestratorConfig,
  NodeExecutorHandler,
  ExecutionContext,
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
 * 创建简单工作流 (start -> task -> end)
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
 * 创建最小工作流 (start -> end)
 */
function createMinimalWorkflow(): WorkflowDefinition {
  return {
    id: 'minimal-workflow',
    name: '最小工作流',
    version: 1,
    status: 'active' as any,
    nodes: [createMockNode('start', NodeType.START), createMockNode('end', NodeType.END)],
    edges: [createMockEdge('e1', 'start', 'end')],
    config: {},
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test',
      updatedBy: 'test',
    },
  }
}

/**
 * 创建空工作流 (无节点)
 */
function createEmptyWorkflow(): WorkflowDefinition {
  return {
    id: 'empty-workflow',
    name: '空工作流',
    version: 1,
    status: 'active' as any,
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
}

/**
 * 创建无开始节点的工作流
 */
function createWorkflowWithoutStart(): WorkflowDefinition {
  return {
    id: 'no-start-workflow',
    name: '无开始节点工作流',
    version: 1,
    status: 'active' as any,
    nodes: [
      createMockNode('task', NodeType.AGENT, {
        agentConfig: { agentId: 'test-agent', agentType: 'test' },
      }),
      createMockNode('end', NodeType.END),
    ],
    edges: [createMockEdge('e1', 'task', 'end')],
    config: {},
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test',
      updatedBy: 'test',
    },
  }
}

/**
 * 创建无结束节点的工作流
 */
function createWorkflowWithoutEnd(): WorkflowDefinition {
  return {
    id: 'no-end-workflow',
    name: '无结束节点工作流',
    version: 1,
    status: 'active' as any,
    nodes: [createMockNode('start', NodeType.START)],
    edges: [],
    config: {},
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test',
      updatedBy: 'test',
    },
  }
}

/**
 * 创建重复节点ID的工作流
 */
function createWorkflowWithDuplicateNodeIds(): WorkflowDefinition {
  return {
    id: 'duplicate-ids-workflow',
    name: '重复节点ID工作流',
    version: 1,
    status: 'active' as any,
    nodes: [
      createMockNode('duplicate', NodeType.START),
      createMockNode('duplicate', NodeType.END), // 重复ID
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
}

/**
 * 创建包含孤立节点的工作流
 */
function createWorkflowWithIsolatedNode(): WorkflowDefinition {
  return {
    id: 'isolated-node-workflow',
    name: '孤立节点工作流',
    version: 1,
    status: 'active' as any,
    nodes: [
      createMockNode('start', NodeType.START),
      createMockNode('end', NodeType.END),
      createMockNode('isolated', NodeType.AGENT, {
        agentConfig: { agentId: 'isolated-agent', agentType: 'test' },
      }), // 孤立节点
    ],
    edges: [createMockEdge('e1', 'start', 'end')],
    config: {},
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test',
      updatedBy: 'test',
    },
  }
}

/**
 * 创建无效边的工作流 (引用不存在的节点)
 */
function createWorkflowWithInvalidEdge(): WorkflowDefinition {
  return {
    id: 'invalid-edge-workflow',
    name: '无效边工作流',
    version: 1,
    status: 'active' as any,
    nodes: [createMockNode('start', NodeType.START), createMockNode('end', NodeType.END)],
    edges: [
      createMockEdge('e1', 'start', 'non-existent'), // 无效目标
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
// Test Suite: 工作流创建 (createInstance)
// =====================================================

describe('VisualWorkflowOrchestrator - 工作流创建', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('createInstance', () => {
    it('应该成功创建工作流实例', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      expect(instance).toBeDefined()
      expect(instance.id).toMatch(/^instance_/)
      expect(instance.workflowId).toBe(workflow.id)
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该正确初始化节点状态', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      // 检查节点数量
      expect(instance.progress.total).toBe(3)
      expect(instance.progress.completed).toBe(0)
      expect(instance.progress.failed).toBe(0)

      // 检查节点结果映射
      expect(instance.nodeResults.size).toBe(3)
      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result).toBeDefined()
        expect(result!.status).toBe(NodeStatus.IDLE)
      })
    })

    it('应该正确初始化变量', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      expect(instance.data.variables).toEqual({ testVar: 'test-value' })
    })

    it('应该正确接收输入参数', () => {
      const workflow = createSimpleWorkflow()
      const inputs = { input1: 'value1', input2: 123 }
      const instance = orchestrator.createInstance(workflow, inputs)

      expect(instance.data.inputs).toEqual(inputs)
    })

    it('应该能够存储和获取实例', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)

      const retrieved = orchestrator.getInstance(instance.id)
      expect(retrieved).toBeDefined()
      expect(retrieved!.id).toBe(instance.id)
    })

    it('应该为每个实例生成唯一ID', () => {
      const workflow = createSimpleWorkflow()
      const instance1 = orchestrator.createInstance(workflow)
      const instance2 = orchestrator.createInstance(workflow)

      expect(instance1.id).not.toBe(instance2.id)
    })

    it('应该正确获取所有实例', () => {
      const workflow = createSimpleWorkflow()
      orchestrator.createInstance(workflow)
      orchestrator.createInstance(workflow)
      orchestrator.createInstance(workflow)

      const instances = orchestrator.getAllInstances()
      expect(instances.length).toBe(3)
    })
  })
})

// =====================================================
// Test Suite: 工作流验证
// =====================================================

describe('VisualWorkflowOrchestrator - 工作流验证', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('validateWorkflow', () => {
    it('应该验证通过有效的工作流', () => {
      const workflow = createSimpleWorkflow()
      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('应该拒绝空工作流', () => {
      const workflow = createEmptyWorkflow()
      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Workflow must contain at least one node')
    })

    it('应该拒绝没有开始节点的工作流', () => {
      const workflow = createWorkflowWithoutStart()
      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Workflow must have a start node')
    })

    it('应该拒绝没有结束节点的工作流', () => {
      const workflow = createWorkflowWithoutEnd()
      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Workflow must have an end node')
    })

    it('应该检测重复的节点ID', () => {
      const workflow = createWorkflowWithDuplicateNodeIds()
      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Duplicate node ID'))).toBe(true)
    })

    it('应该检测无效的边（引用不存在的节点）', () => {
      const workflow = createWorkflowWithInvalidEdge()
      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('non-existent'))).toBe(true)
    })

    it('应该警告孤立节点', () => {
      const workflow = createWorkflowWithIsolatedNode()
      const result = orchestrator.validateWorkflow(workflow)

      expect(result.warnings.some(w => w.includes('Isolated node'))).toBe(true)
    })

    it('应该警告多个开始节点', () => {
      const workflow: WorkflowDefinition = {
        id: 'multi-start-workflow',
        name: '多开始节点工作流',
        version: 1,
        status: 'active' as any,
        nodes: [
          createMockNode('start1', NodeType.START),
          createMockNode('start2', NodeType.START),
          createMockNode('end', NodeType.END),
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
      const result = orchestrator.validateWorkflow(workflow)

      expect(result.warnings.some(w => w.includes('multiple start nodes'))).toBe(true)
    })
  })
})

// =====================================================
// Test Suite: 节点执行器注册
// =====================================================

describe('VisualWorkflowOrchestrator - 执行器注册', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('registerExecutor', () => {
    it('应该成功注册自定义执行器', () => {
      const customHandler: NodeExecutorHandler = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          nodeId: 'test',
          duration: 10,
          logs: [],
        }),
        validate: vi.fn().mockReturnValue({ valid: true, errors: [] }),
      }

      // 注册自定义执行器
      orchestrator.registerExecutor(NodeType.AGENT, customHandler)

      // 验证执行器已注册（通过执行工作流测试）
      const workflow = createSimpleWorkflow()
      return expect(orchestrator.execute(workflow)).resolves.toBeDefined()
    })

    it('应该使用最新的注册覆盖之前的执行器', async () => {
      const customHandler: NodeExecutorHandler = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          nodeId: 'task',
          output: { custom: true },
          duration: 10,
          logs: [],
        }),
        validate: vi.fn().mockReturnValue({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, customHandler)

      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      // 验证自定义执行器被调用
      expect(customHandler.execute).toHaveBeenCalled()
      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })
  })
})

// =====================================================
// Test Suite: 工作流执行
// =====================================================

describe('VisualWorkflowOrchestrator - 工作流执行', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('execute', () => {
    it('应该成功执行简单工作流', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
      expect(instance.progress.completed).toBe(3)
      expect(instance.progress.failed).toBe(0)
    })

    it('应该正确更新节点状态', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      workflow.nodes.forEach(node => {
        const state = orchestrator.getNodeState(instance.id, node.id)
        expect(state).toBe('completed')
      })
    })

    it('应该正确记录执行结果', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        expect(result).toBeDefined()
        expect(result!.status).toBe(NodeStatus.SUCCESS)
        expect(result!.duration).toBeDefined()
        expect(result!.duration!).toBeGreaterThanOrEqual(0)
      })
    })

    it('应该正确处理输入参数', async () => {
      const workflow = createSimpleWorkflow()
      const inputs = { testInput: 'test-value' }
      const instance = await orchestrator.execute(workflow, inputs)

      expect(instance.data.inputs).toEqual(inputs)
    })

    it('应该计算并记录执行时长', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.metadata.duration).toBeDefined()
      expect(instance.metadata.duration!).toBeGreaterThanOrEqual(0)
    })
  })

  describe('execute - 最小工作流', () => {
    it('应该成功执行只有开始和结束节点的工作流', async () => {
      const workflow = createMinimalWorkflow()
      const instance = await orchestrator.execute(workflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
      expect(instance.progress.total).toBe(2)
      expect(instance.progress.completed).toBe(2)
    })
  })

  describe('execute - 错误处理', () => {
    it('应该在空工作流时抛出错误', async () => {
      const workflow = createEmptyWorkflow()

      await expect(orchestrator.execute(workflow)).rejects.toThrow()
    })

    it('应该在无开始节点时抛出错误', async () => {
      const workflow = createWorkflowWithoutStart()

      await expect(orchestrator.execute(workflow)).rejects.toThrow('Workflow validation failed')
    })
  })
})

// =====================================================
// Test Suite: 事件系统
// =====================================================

describe('VisualWorkflowOrchestrator - 事件系统', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('addEventListener', () => {
    it('应该触发节点开始事件', async () => {
      const workflow = createSimpleWorkflow()
      const listener = vi.fn()
      orchestrator.addEventListener(listener)

      await orchestrator.execute(workflow)

      const startEvents = listener.mock.calls.filter(call => call[0].type === 'node_started')
      expect(startEvents.length).toBeGreaterThan(0)
    })

    it('应该触发节点完成事件', async () => {
      const workflow = createSimpleWorkflow()
      const listener = vi.fn()
      orchestrator.addEventListener(listener)

      await orchestrator.execute(workflow)

      const completeEvents = listener.mock.calls.filter(call => call[0].type === 'node_completed')
      expect(completeEvents.length).toBeGreaterThan(0)
    })

    it('应该触发工作流完成事件', async () => {
      const workflow = createSimpleWorkflow()
      const listener = vi.fn()
      orchestrator.addEventListener(listener)

      await orchestrator.execute(workflow)

      const workflowEvent = listener.mock.calls.find(call => call[0].type === 'workflow_completed')
      expect(workflowEvent).toBeDefined()
    })

    it('事件应该包含正确的实例ID', async () => {
      const workflow = createSimpleWorkflow()
      const listener = vi.fn()
      orchestrator.addEventListener(listener)

      const instance = await orchestrator.execute(workflow)

      listener.mock.calls.forEach(call => {
        expect(call[0].instanceId).toBe(instance.id)
      })
    })

    it('事件应该包含正确的节点ID', async () => {
      const workflow = createSimpleWorkflow()
      const listener = vi.fn()
      orchestrator.addEventListener(listener)

      await orchestrator.execute(workflow)

      const nodeEvents = listener.mock.calls.filter(call => call[0].nodeId !== undefined)
      nodeEvents.forEach(call => {
        expect(workflow.nodes.some(n => n.id === call[0].nodeId)).toBe(true)
      })
    })
  })

  describe('removeEventListener', () => {
    it('应该正确移除事件监听器', async () => {
      const workflow = createSimpleWorkflow()
      const listener = vi.fn()

      orchestrator.addEventListener(listener)
      orchestrator.removeEventListener(listener)

      await orchestrator.execute(workflow)

      expect(listener).not.toHaveBeenCalled()
    })
  })
})

// =====================================================
// Test Suite: 实例管理
// =====================================================

describe('VisualWorkflowOrchestrator - 实例管理', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('getInstance', () => {
    it('应该返回存在的实例', async () => {
      const workflow = createSimpleWorkflow()
      const executed = await orchestrator.execute(workflow)

      const instance = orchestrator.getInstance(executed.id)
      expect(instance).toBeDefined()
      expect(instance!.id).toBe(executed.id)
    })

    it('应该对不存在的实例返回 undefined', () => {
      const instance = orchestrator.getInstance('non-existent-id')
      expect(instance).toBeUndefined()
    })
  })

  describe('getNodeState', () => {
    it('应该返回正确的节点状态', async () => {
      const workflow = createSimpleWorkflow()
      const instance = await orchestrator.execute(workflow)

      workflow.nodes.forEach(node => {
        const state = orchestrator.getNodeState(instance.id, node.id)
        expect(state).toBe('completed')
      })
    })

    it('应该对不存在的实例返回 undefined', () => {
      const state = orchestrator.getNodeState('non-existent', 'node-id')
      expect(state).toBeUndefined()
    })
  })

  describe('getAllInstances', () => {
    it('应该返回所有实例', async () => {
      const workflow = createSimpleWorkflow()
      await orchestrator.execute(workflow)
      await orchestrator.execute(workflow)
      await orchestrator.execute(workflow)

      const instances = orchestrator.getAllInstances()
      expect(instances.length).toBe(3)
    })
  })

  describe('cancel', () => {
    it('应该能够取消运行中的实例', async () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      orchestrator.cancel(instance.id)

      expect(instance.status).toBe(InstanceStatus.CANCELLED)
    })
  })

  describe('pause / resume', () => {
    it('应该能够暂停运行中的实例', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      orchestrator.pause(instance.id)

      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该能够恢复暂停的实例', () => {
      const workflow = createSimpleWorkflow()
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.PENDING

      orchestrator.resume(instance.id)

      expect(instance.status).toBe(InstanceStatus.RUNNING)
    })
  })
})

// =====================================================
// Test Suite: 统计信息
// =====================================================

describe('VisualWorkflowOrchestrator - 统计信息', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('getStatistics', () => {
    it('应该正确计算完成数量', async () => {
      const workflow = createSimpleWorkflow()
      await orchestrator.execute(workflow)
      await orchestrator.execute(workflow)

      const stats = orchestrator.getStatistics(workflow.id)

      expect(stats.totalInstances).toBe(2)
      expect(stats.completed).toBe(2)
    })

    it('应该正确计算平均时长', async () => {
      const workflow = createSimpleWorkflow()
      await orchestrator.execute(workflow)
      await orchestrator.execute(workflow)

      const stats = orchestrator.getStatistics(workflow.id)

      expect(stats.avgDuration).toBeGreaterThanOrEqual(0)
    })

    it('应该对没有实例的工作流返回零值', () => {
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
// Test Suite: 配置选项
// =====================================================

describe('VisualWorkflowOrchestrator - 配置选项', () => {
  it('应该使用默认配置', () => {
    const orchestrator = new VisualWorkflowOrchestrator()
    expect(orchestrator).toBeDefined()
  })

  it('应该接受自定义配置', () => {
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

  it('应该在禁用日志时不记录日志', async () => {
    const orchestrator = new VisualWorkflowOrchestrator({ enableLogs: false })
    const workflow = createSimpleWorkflow()
    const instance = await orchestrator.execute(workflow)

    // 日志应该为空或未定义
    workflow.nodes.forEach(node => {
      const result = instance.nodeResults.get(node.id)
      if (result!.logs) {
        expect(result!.logs.length).toBe(0)
      }
    })
  })
})
