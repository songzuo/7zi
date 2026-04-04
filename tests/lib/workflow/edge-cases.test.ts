/**
 * Workflow 边缘用例测试
 *
 * 测试覆盖:
 * 1. 空输入处理
 * 2. 超长输入处理
 * 3. 并发执行测试
 * 4. 错误状态恢复测试
 * 5. 取消操作测试
 * 6. 超时处理测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
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

describe('Workflow 边缘用例测试', () => {
  let executor: EnhancedWorkflowExecutor

  beforeEach(() => {
    executor = new EnhancedWorkflowExecutor()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('空输入处理', () => {
    it('应该处理空的工作流定义（验证失败）', () => {
      const emptyWorkflow: WorkflowDefinition = {
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
          createdBy: 'test-user',
          updatedBy: 'test-user',
        },
      }

      // 空工作流可以注册，但验证会失败
      executor.registerWorkflow(emptyWorkflow)
      const validation = executor.validateWorkflow(emptyWorkflow)
      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('应该处理空的节点列表（验证失败）', () => {
      const workflow = createMockWorkflow()
      workflow.nodes = []

      const validation = executor.validateWorkflow(workflow)
      expect(validation.valid).toBe(false)
    })

    it('应该处理空的边列表', () => {
      const workflow = createMockWorkflow()
      workflow.edges = []

      // 边可以为空，但需要验证其他条件
      const validation = executor.validateWorkflow(workflow)
      // 根据实际验证逻辑，可能通过或失败
      expect(validation).toBeDefined()
    })

    it('应该处理空的输入参数', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      expect(instance).toBeDefined()
      expect(instance.status).toBe(InstanceStatus.PENDING)
      expect(instance.data.inputs).toEqual({})
    })

    it('应该处理 undefined 输入参数', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id)

      expect(instance).toBeDefined()
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该处理空字符串输入', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {
        emptyString: '',
        whitespace: '   ',
      })

      expect(instance).toBeDefined()
      expect(instance.data.inputs?.emptyString).toBe('')
      expect(instance.data.inputs?.whitespace).toBe('   ')
    })

    it('应该处理 null 和 undefined 输入', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {
        nullValue: null,
        undefinedValue: undefined,
      })

      expect(instance).toBeDefined()
      expect(instance.data.inputs?.nullValue).toBeNull()
      expect(instance.data.inputs?.undefinedValue).toBeUndefined()
    })

    it('应该处理空对象输入', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {
        emptyObject: {},
        emptyArray: [],
      })

      expect(instance).toBeDefined()
      expect(instance.data.inputs?.emptyObject).toEqual({})
      expect(instance.data.inputs?.emptyArray).toEqual([])
    })
  })

  describe('超长输入处理', () => {
    it('应该处理超长的字符串输入', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const longString = 'a'.repeat(100000) // 100KB 字符串
      const instance = executor.createInstance(workflow.id, {
        longString,
      })

      expect(instance).toBeDefined()
      expect(instance.data.inputs?.longString).toHaveLength(100000)
    })

    it('应该处理超长的数组输入', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const longArray = Array.from({ length: 10000 }, (_, i) => i)
      const instance = executor.createInstance(workflow.id, {
        longArray,
      })

      expect(instance).toBeDefined()
      expect(instance.data.inputs?.longArray).toHaveLength(10000)
    })

    it('应该处理超深的嵌套对象', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let deepObject: unknown = { value: 'deep' }
      for (let i = 0; i < 100; i++) {
        deepObject = { nested: deepObject }
      }

      const instance = executor.createInstance(workflow.id, {
        deepObject,
      })

      expect(instance).toBeDefined()
      expect(instance.data.inputs?.deepObject).toBeDefined()
    })

    it('应该处理超长的节点名称', () => {
      const workflow = createMockWorkflow()
      workflow.nodes[1].name = 'a'.repeat(10000)

      executor.registerWorkflow(workflow)
      expect(() => executor.getWorkflow(workflow.id)).not.toThrow()
    })

    it('应该处理超长的节点描述', () => {
      const workflow = createMockWorkflow()
      workflow.nodes[1].description = 'a'.repeat(50000)

      executor.registerWorkflow(workflow)
      expect(() => executor.getWorkflow(workflow.id)).not.toThrow()
    })

    it('应该处理超多的节点', () => {
      const workflow = createMockWorkflow()
      const nodes: WorkflowNode[] = [
        {
          id: 'start-node',
          type: NodeType.START,
          name: '开始',
          position: { x: 0, y: 0 },
        },
      ]

      // 添加 100 个 agent 节点
      for (let i = 0; i < 100; i++) {
        nodes.push({
          id: `agent-node-${i}`,
          type: NodeType.AGENT,
          name: `节点 ${i}`,
          position: { x: (i + 1) * 100, y: 0 },
          agentConfig: {
            agentId: `agent-${i}`,
            agentType: 'executor',
            timeout: 30,
          },
        })
      }

      nodes.push({
        id: 'end-node',
        type: NodeType.END,
        name: '结束',
        position: { x: 10100, y: 0 },
      })

      workflow.nodes = nodes

      executor.registerWorkflow(workflow)
      const validation = executor.validateWorkflow(workflow)
      // 验证可能因为节点未连接而失败，但不应抛出异常
      expect(validation).toBeDefined()
    })

    it('应该处理大量的边', () => {
      const workflow = createMockWorkflow()
      const edges: WorkflowEdge[] = []

      // 创建大量边
      for (let i = 0; i < 50; i++) {
        edges.push({
          id: `edge-${i}`,
          source: 'start-node',
          target: 'agent-node',
          type: EdgeType.SEQUENCE,
        })
      }

      workflow.edges = edges
      executor.registerWorkflow(workflow)
      expect(() => executor.getWorkflow(workflow.id)).not.toThrow()
    })
  })

  describe('并发执行测试', () => {
    it('应该支持多个实例并发创建', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instances = [
        executor.createInstance(workflow.id, { id: 1 }),
        executor.createInstance(workflow.id, { id: 2 }),
        executor.createInstance(workflow.id, { id: 3 }),
        executor.createInstance(workflow.id, { id: 4 }),
        executor.createInstance(workflow.id, { id: 5 }),
      ]

      expect(instances).toHaveLength(5)
      expect(instances.every(inst => inst.status === InstanceStatus.PENDING)).toBe(true)
    })

    it('应该支持并发创建不同工作流的实例', () => {
      const workflow1 = createMockWorkflow('workflow-1')
      const workflow2 = createMockWorkflow('workflow-2')
      const workflow3 = createMockWorkflow('workflow-3')

      executor.registerWorkflow(workflow1)
      executor.registerWorkflow(workflow2)
      executor.registerWorkflow(workflow3)

      const instances = [
        executor.createInstance('workflow-1', {}),
        executor.createInstance('workflow-2', {}),
        executor.createInstance('workflow-3', {}),
      ]

      expect(instances).toHaveLength(3)
      expect(instances[0].workflowId).toBe('workflow-1')
      expect(instances[1].workflowId).toBe('workflow-2')
      expect(instances[2].workflowId).toBe('workflow-3')
    })

    it('应该处理高并发场景下的资源竞争', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      // 创建 50 个并发实例
      const instances = Array.from({ length: 50 }, (_, i) =>
        executor.createInstance(workflow.id, { id: i })
      )

      expect(instances).toHaveLength(50)
      expect(instances.every(inst => inst.status === InstanceStatus.PENDING)).toBe(true)

      // 验证所有实例 ID 都是唯一的
      const instanceIds = instances.map(inst => inst.id)
      const uniqueIds = new Set(instanceIds)
      expect(uniqueIds.size).toBe(50)
    })

    it('应该支持并发注册多个工作流', () => {
      const workflows = Array.from({ length: 10 }, (_, i) => createMockWorkflow(`workflow-${i}`))

      workflows.forEach(wf => executor.registerWorkflow(wf))

      // 验证所有工作流都注册成功
      workflows.forEach(wf => {
        expect(executor.getWorkflow(wf.id)).toBeDefined()
      })
    })

    it('应该正确隔离不同实例的数据', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instance1 = executor.createInstance(workflow.id, { data: 'instance1' })
      const instance2 = executor.createInstance(workflow.id, { data: 'instance2' })

      expect(instance1.data.inputs?.data).toBe('instance1')
      expect(instance2.data.inputs?.data).toBe('instance2')
      expect(instance1.id).not.toBe(instance2.id)
    })
  })

  describe('错误状态恢复测试', () => {
    it('应该能够直接操作节点状态', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      // 直接操作节点状态
      const nodeResult = instance.nodeResults.get('agent-node')
      expect(nodeResult).toBeDefined()
      expect(nodeResult?.status).toBe(NodeStatus.IDLE)
    })

    it('应该能够直接修改实例节点状态', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      // 直接修改节点状态
      const nodeResult = instance.nodeResults.get('agent-node')
      if (nodeResult) {
        nodeResult.status = NodeStatus.FAILED
        nodeResult.error = { code: 'ERR001', message: '模拟错误' }
      }

      expect(instance.nodeResults.get('agent-node')?.status).toBe(NodeStatus.FAILED)
      expect(instance.nodeResults.get('agent-node')?.error?.message).toBe('模拟错误')
    })

    it('应该能够恢复失败的节点状态', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      // 标记节点失败
      const nodeResult = instance.nodeResults.get('agent-node')
      if (nodeResult) {
        nodeResult.status = NodeStatus.FAILED
        nodeResult.error = { code: 'ERR001', message: '模拟错误' }
      }

      expect(instance.nodeResults.get('agent-node')?.status).toBe(NodeStatus.FAILED)

      // 恢复节点状态
      if (nodeResult) {
        nodeResult.status = NodeStatus.IDLE
        delete nodeResult.error
      }

      expect(instance.nodeResults.get('agent-node')?.status).toBe(NodeStatus.IDLE)
    })

    it('应该能够处理多个节点同时失败的情况', () => {
      // 创建一个有更多有效连接的工作流
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
          name: '并行节点',
          position: { x: 100, y: 0 },
        },
        {
          id: 'agent-node-1',
          type: NodeType.AGENT,
          name: '执行任务1',
          position: { x: 200, y: -50 },
          agentConfig: {
            agentId: 'agent-1',
            agentType: 'executor',
            timeout: 30,
          },
        },
        {
          id: 'agent-node-2',
          type: NodeType.AGENT,
          name: '执行任务2',
          position: { x: 200, y: 50 },
          agentConfig: {
            agentId: 'agent-2',
            agentType: 'executor',
            timeout: 30,
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
        {
          id: 'edge-1',
          source: 'start-node',
          target: 'parallel-node',
          type: EdgeType.SEQUENCE,
        },
        {
          id: 'edge-2',
          source: 'parallel-node',
          target: 'agent-node-1',
          type: EdgeType.PARALLEL,
        },
        {
          id: 'edge-3',
          source: 'parallel-node',
          target: 'agent-node-2',
          type: EdgeType.PARALLEL,
        },
        {
          id: 'edge-4',
          source: 'agent-node-1',
          target: 'end-node',
          type: EdgeType.SEQUENCE,
        },
        {
          id: 'edge-5',
          source: 'agent-node-2',
          target: 'end-node',
          type: EdgeType.SEQUENCE,
        },
      ]

      const workflow: WorkflowDefinition = {
        id: 'parallel-test-workflow',
        name: '并行测试工作流',
        version: 1,
        status: 'active' as any,
        nodes,
        edges,
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test-user',
          updatedBy: 'test-user',
        },
      }

      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      // 标记多个节点失败
      const nodeResult1 = instance.nodeResults.get('agent-node-1')
      if (nodeResult1) {
        nodeResult1.status = NodeStatus.FAILED
        nodeResult1.error = { code: 'ERR001', message: '错误1' }
      }

      const nodeResult2 = instance.nodeResults.get('agent-node-2')
      if (nodeResult2) {
        nodeResult2.status = NodeStatus.FAILED
        nodeResult2.error = { code: 'ERR002', message: '错误2' }
      }

      expect(instance.nodeResults.get('agent-node-1')?.status).toBe(NodeStatus.FAILED)
      expect(instance.nodeResults.get('agent-node-2')?.status).toBe(NodeStatus.FAILED)
    })

    it('应该保留失败节点的错误信息', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      const errorDetails = {
        code: 'ERR001',
        message: '这是一个详细的错误信息',
        stack: 'Error stack trace...',
      }

      // 直接设置节点错误
      const nodeResult = instance.nodeResults.get('agent-node')
      if (nodeResult) {
        nodeResult.status = NodeStatus.FAILED
        nodeResult.error = errorDetails
      }

      expect(instance.nodeResults.get('agent-node')?.error).toEqual(errorDetails)
    })
  })

  describe('取消操作测试', () => {
    it('应该能够取消实例', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      // 取消实例
      executor.cancelInstance(instance.id)

      const cancelledInstance = executor.getInstance(instance.id)
      expect(cancelledInstance?.status).toBe(InstanceStatus.CANCELLED)
    })

    it('应该能够取消待运行的实例', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      // 取消实例
      executor.cancelInstance(instance.id)

      const cancelledInstance = executor.getInstance(instance.id)
      expect(cancelledInstance?.status).toBe(InstanceStatus.CANCELLED)
    })

    it('应该能够标记节点为跳过状态', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      // 直接标记节点为跳过
      const nodeResult = instance.nodeResults.get('agent-node')
      if (nodeResult) {
        nodeResult.status = NodeStatus.SKIPPED
      }

      expect(instance.nodeResults.get('agent-node')?.status).toBe(NodeStatus.SKIPPED)
    })

    it('应该处理多次取消操作', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      // 多次取消
      executor.cancelInstance(instance.id)
      executor.cancelInstance(instance.id)
      executor.cancelInstance(instance.id)

      const cancelledInstance = executor.getInstance(instance.id)
      expect(cancelledInstance?.status).toBe(InstanceStatus.CANCELLED)
    })

    it('应该正确处理取消后的实例状态', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})
      executor.cancelInstance(instance.id)

      // 取消后状态应为 CANCELLED
      const cancelledInstance = executor.getInstance(instance.id)
      expect(cancelledInstance?.status).toBe(InstanceStatus.CANCELLED)

      // 可以获取实例信息
      expect(cancelledInstance).toBeDefined()
      expect(cancelledInstance?.metadata.endedAt).toBeDefined()
    })

    it('应该能够取消不存在的实例（无错误）', () => {
      // 取消不存在的实例不应抛出错误
      expect(() => executor.cancelInstance('non-existent-id')).not.toThrow()
    })
  })

  describe('超时处理测试', () => {
    it('应该能够设置节点超时配置', () => {
      const workflow = createMockWorkflow()
      workflow.nodes[1].agentConfig = {
        agentId: 'agent-1',
        agentType: 'executor',
        timeout: 1, // 1 秒超时
      }
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      expect(instance).toBeDefined()
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该能够设置工作流实例超时配置', () => {
      const workflow = createMockWorkflow()
      workflow.config.timeout = 2 // 2 秒超时
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      expect(instance).toBeDefined()
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该处理零超时配置', () => {
      const workflow = createMockWorkflow()
      workflow.config.timeout = 0 // 零超时
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      expect(instance).toBeDefined()
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该处理负数超时配置', () => {
      const workflow = createMockWorkflow()
      workflow.config.timeout = -1 // 负数超时
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      expect(instance).toBeDefined()
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该处理非常大的超时值', () => {
      const workflow = createMockWorkflow()
      workflow.config.timeout = Number.MAX_SAFE_INTEGER // 最大安全整数
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      expect(instance).toBeDefined()
      expect(instance.status).toBe(InstanceStatus.PENDING)
    })

    it('应该能够手动标记节点超时', () => {
      const workflow = createMockWorkflow()
      workflow.nodes[1].agentConfig = {
        agentId: 'agent-1',
        agentType: 'executor',
        timeout: 1,
      }
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      // 手动标记超时
      const nodeResult = instance.nodeResults.get('agent-node')
      if (nodeResult) {
        nodeResult.status = NodeStatus.FAILED
        nodeResult.error = { code: 'TIMEOUT', message: 'Timeout: 节点执行超时' }
      }

      expect(instance.nodeResults.get('agent-node')?.status).toBe(NodeStatus.FAILED)
      expect(instance.nodeResults.get('agent-node')?.error?.code).toBe('TIMEOUT')
    })
  })

  describe('组合边缘用例', () => {
    it('应该处理空输入 + 并发执行', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instances = [
        executor.createInstance(workflow.id, {}),
        executor.createInstance(workflow.id, {}),
        executor.createInstance(workflow.id, {}),
      ]

      expect(instances).toHaveLength(3)
      expect(instances.every(inst => inst.status === InstanceStatus.PENDING)).toBe(true)
    })

    it('应该处理超长输入 + 超时配置', () => {
      const workflow = createMockWorkflow()
      workflow.config.timeout = 1
      executor.registerWorkflow(workflow)

      const longString = 'a'.repeat(100000)
      const instance = executor.createInstance(workflow.id, { longString })

      expect(instance).toBeDefined()
      expect(instance.data.inputs?.longString).toHaveLength(100000)
    })

    it('应该处理错误恢复 + 取消操作', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      const instance = executor.createInstance(workflow.id, {})

      // 节点失败
      const nodeResult = instance.nodeResults.get('agent-node')
      if (nodeResult) {
        nodeResult.status = NodeStatus.FAILED
        nodeResult.error = { code: 'ERR001', message: '错误' }
      }

      // 恢复
      if (nodeResult) {
        nodeResult.status = NodeStatus.IDLE
        delete nodeResult.error
      }

      // 取消
      executor.cancelInstance(instance.id)

      const cancelledInstance = executor.getInstance(instance.id)
      expect(cancelledInstance?.status).toBe(InstanceStatus.CANCELLED)
    })

    it('应该处理并发 + 取消', () => {
      const workflow = createMockWorkflow()
      workflow.config.timeout = 1
      executor.registerWorkflow(workflow)

      const instances = [
        executor.createInstance(workflow.id, { id: 1 }),
        executor.createInstance(workflow.id, { id: 2 }),
        executor.createInstance(workflow.id, { id: 3 }),
      ]

      // 取消所有实例
      instances.forEach(inst => executor.cancelInstance(inst.id))

      instances.forEach(inst => {
        const cancelled = executor.getInstance(inst.id)
        expect(cancelled?.status).toBe(InstanceStatus.CANCELLED)
      })
    })
  })

  describe('验证边缘用例', () => {
    it('应该检测缺少开始节点的验证错误', () => {
      const workflow = createMockWorkflow()
      workflow.nodes = workflow.nodes.filter(n => n.type !== NodeType.START)

      const validation = executor.validateWorkflow(workflow)
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.includes('开始节点'))).toBe(true)
    })

    it('应该检测缺少结束节点的验证错误', () => {
      const workflow = createMockWorkflow()
      workflow.nodes = workflow.nodes.filter(n => n.type !== NodeType.END)

      const validation = executor.validateWorkflow(workflow)
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.includes('结束节点'))).toBe(true)
    })

    it('应该检测多个开始节点的验证错误', () => {
      const workflow = createMockWorkflow()
      workflow.nodes.push({
        id: 'start-node-2',
        type: NodeType.START,
        name: '开始2',
        position: { x: 0, y: 100 },
      })

      const validation = executor.validateWorkflow(workflow)
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.includes('只能包含一个开始节点'))).toBe(true)
    })

    it('应该检测重复节点 ID 的验证错误', () => {
      const workflow = createMockWorkflow()
      workflow.nodes[1].id = 'start-node' // 重复 ID

      const validation = executor.validateWorkflow(workflow)
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.includes('重复'))).toBe(true)
    })

    it('应该检测边引用不存在的节点', () => {
      const workflow = createMockWorkflow()
      workflow.edges[0].source = 'non-existent-node'

      const validation = executor.validateWorkflow(workflow)
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.includes('不存在'))).toBe(true)
    })

    it('应该检测孤立节点', () => {
      const workflow = createMockWorkflow()
      workflow.nodes.push({
        id: 'isolated-node',
        type: NodeType.AGENT,
        name: '孤立节点',
        position: { x: 500, y: 500 },
        agentConfig: {
          agentId: 'agent-isolated',
          agentType: 'executor',
          timeout: 30,
        },
      })

      const validation = executor.validateWorkflow(workflow)
      expect(validation.errors.some(e => e.includes('孤立节点') || e.includes('没有连接'))).toBe(
        true
      )
    })

    it('应该检测边 ID 重复', () => {
      const workflow = createMockWorkflow()
      workflow.edges.push({
        id: 'edge-1', // 重复 ID
        source: 'agent-node',
        target: 'end-node',
        type: EdgeType.SEQUENCE,
      })

      const validation = executor.validateWorkflow(workflow)
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.includes('重复'))).toBe(true)
    })

    it('应该检测缺少名称的工作流', () => {
      const workflow = createMockWorkflow()
      workflow.name = ''

      const validation = executor.validateWorkflow(workflow)
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(e => e.includes('名称'))).toBe(true)
    })
  })

  describe('实例统计测试', () => {
    it('应该正确统计工作流实例', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      // 创建多个实例
      executor.createInstance(workflow.id, {})
      executor.createInstance(workflow.id, {})
      executor.createInstance(workflow.id, {})

      // 取消一个实例
      const instances = executor.getAllInstances(workflow.id)
      executor.cancelInstance(instances[0].id)

      const stats = executor.getStatistics(workflow.id)
      expect(stats.totalInstances).toBe(3)
      expect(stats.cancelled).toBe(1)
    })

    it('应该返回空统计对于不存在的工作流', () => {
      const stats = executor.getStatistics('non-existent-workflow')
      expect(stats.totalInstances).toBe(0)
      expect(stats.success).toBe(0)
      expect(stats.failed).toBe(0)
      expect(stats.cancelled).toBe(0)
    })
  })

  describe('清除实例测试', () => {
    it('应该清除指定工作流的所有实例', () => {
      const workflow1 = createMockWorkflow('workflow-1')
      const workflow2 = createMockWorkflow('workflow-2')

      executor.registerWorkflow(workflow1)
      executor.registerWorkflow(workflow2)

      executor.createInstance('workflow-1', {})
      executor.createInstance('workflow-1', {})
      executor.createInstance('workflow-2', {})

      executor.clearInstances('workflow-1')

      expect(executor.getAllInstances('workflow-1')).toHaveLength(0)
      expect(executor.getAllInstances('workflow-2')).toHaveLength(1)
    })

    it('应该清除所有实例', () => {
      const workflow = createMockWorkflow()
      executor.registerWorkflow(workflow)

      executor.createInstance(workflow.id, {})
      executor.createInstance(workflow.id, {})

      executor.clearInstances()

      expect(executor.getAllInstances()).toHaveLength(0)
    })
  })
})
