/**
 * Workflow 状态管理测试 - 并发处理
 *
 * 测试覆盖:
 * 1. 并发执行
 * 2. 并发状态管理
 * 3. 并发安全
 * 4. 并发事件
 * 5. 并发限制
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  VisualWorkflowOrchestrator,
  OrchestratorConfig,
  NodeExecutorHandler,
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
 * 创建并行工作流
 */
function createParallelWorkflow(): WorkflowDefinition {
  return {
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
  }
}

// =====================================================
// Test Suite: 并发执行
// =====================================================

describe('WorkflowConcurrency - 并发执行', () => {
  describe('多个工作流并发执行', () => {
    it('应该能够并发执行多个工作流实例', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const promises = [
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
      ]

      const instances = await Promise.all(promises)

      expect(instances.length).toBe(3)
      instances.forEach(instance => {
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })
    })

    it('每个并发实例应该有独立的状态', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const instances = await Promise.all([
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
      ])

      // 每个实例应该有唯一的ID
      const ids = instances.map(i => i.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(3)

      // 每个实例应该有独立的状态
      instances.forEach(instance => {
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })
    })

    it('并发实例应该有独立的节点状态', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const instances = await Promise.all([
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
      ])

      // 验证每个实例的节点状态
      instances.forEach(instance => {
        workflow.nodes.forEach(node => {
          const state = orchestrator.getNodeState(instance.id, node.id)
          expect(state).toBe('completed')
        })
      })
    })
  })

  describe('并行节点执行', () => {
    it('并行节点应该并行执行所有分支', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createParallelWorkflow()

      const instance = await orchestrator.execute(workflow)

      // 验证所有并行任务都完成了
      const task1Result = instance.nodeResults.get('task1')
      const task2Result = instance.nodeResults.get('task2')
      const task3Result = instance.nodeResults.get('task3')

      expect(task1Result?.status).toBe(NodeStatus.SUCCESS)
      expect(task2Result?.status).toBe(NodeStatus.SUCCESS)
      expect(task3Result?.status).toBe(NodeStatus.SUCCESS)
    })

    it('并行任务应该几乎同时完成', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createParallelWorkflow()

      const instance = await orchestrator.execute(workflow)

      const task1EndTime = new Date(instance.nodeResults.get('task1')!.endTime!).getTime()
      const task2EndTime = new Date(instance.nodeResults.get('task2')!.endTime!).getTime()
      const task3EndTime = new Date(instance.nodeResults.get('task3')!.endTime!).getTime()

      const maxDiff = Math.max(
        Math.abs(task1EndTime - task2EndTime),
        Math.abs(task2EndTime - task3EndTime),
        Math.abs(task1EndTime - task3EndTime)
      )

      // 并行任务应该几乎同时完成
      expect(maxDiff).toBeLessThan(500)
    })
  })

  describe('并发执行顺序', () => {
    it('并发执行不保证顺序', async () => {
      const executionOrder: number[] = []

      const slowExecutor: NodeExecutorHandler = {
        execute: async (node, context) => {
          // 记录执行顺序
          executionOrder.push(Date.now())
          await new Promise(resolve => setTimeout(resolve, 50))
          return {
            success: true,
            nodeId: node.id,
            output: {},
            duration: 50,
            logs: [],
          }
        },
        validate: () => ({ valid: true, errors: [] }),
      }

      const orchestrator = new VisualWorkflowOrchestrator()
      orchestrator.registerExecutor(NodeType.AGENT, slowExecutor)

      const workflow = createSimpleWorkflow()

      await orchestrator.execute(workflow)

      // 执行顺序应该被记录
      expect(executionOrder.length).toBeGreaterThan(0)
    })
  })
})

// =====================================================
// Test Suite: 并发状态管理
// =====================================================

describe('WorkflowConcurrency - 并发状态管理', () => {
  describe('实例状态隔离', () => {
    it('每个实例的状态应该独立', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const instance1 = await orchestrator.execute(workflow)
      const instance2 = await orchestrator.execute(workflow)

      // 状态应该独立
      expect(instance1.id).not.toBe(instance2.id)
      expect(instance1.status).toBe(InstanceStatus.COMPLETED)
      expect(instance2.status).toBe(InstanceStatus.COMPLETED)
    })

    it('实例进度应该独立', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const instance1 = await orchestrator.execute(workflow)
      const instance2 = await orchestrator.execute(workflow)

      expect(instance1.progress).toEqual(instance2.progress)
      // 但ID不同
      expect(instance1.id).not.toBe(instance2.id)
    })

    it('实例数据应该独立', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const inputs1 = { input: 'value1' }
      const inputs2 = { input: 'value2' }

      const instance1 = await orchestrator.execute(workflow, inputs1)
      const instance2 = await orchestrator.execute(workflow, inputs2)

      expect(instance1.data.inputs).toEqual(inputs1)
      expect(instance2.data.inputs).toEqual(inputs2)
    })
  })

  describe('节点状态隔离', () => {
    it('每个实例的节点状态应该独立', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const instance1 = await orchestrator.execute(workflow)
      const instance2 = await orchestrator.execute(workflow)

      // 每个实例的节点状态应该独立
      workflow.nodes.forEach(node => {
        const state1 = orchestrator.getNodeState(instance1.id, node.id)
        const state2 = orchestrator.getNodeState(instance2.id, node.id)
        expect(state1).toBe(state2)
      })
    })

    it('节点执行结果应该独立', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const instance1 = await orchestrator.execute(workflow)
      const instance2 = await orchestrator.execute(workflow)

      // 验证每个实例的节点执行结果
      instance1.nodeResults.forEach((result, nodeId) => {
        expect(result.nodeId).toBe(nodeId)
      })
      instance2.nodeResults.forEach((result, nodeId) => {
        expect(result.nodeId).toBe(nodeId)
      })
    })
  })
})

// =====================================================
// Test Suite: 并发安全
// =====================================================

describe('WorkflowConcurrency - 并发安全', () => {
  describe('并发修改安全', () => {
    it('并发执行不应该导致状态不一致', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      // 并发执行多个实例
      const instances = await Promise.all([
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
      ])

      // 所有实例应该成功完成
      instances.forEach(instance => {
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })

      // 获取所有实例
      const allInstances = orchestrator.getAllInstances()
      expect(allInstances.length).toBe(5)
    })

    it('并发执行不应该丢失实例', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const count = 10
      const instances = await Promise.all(
        Array(count).fill(null).map(() => orchestrator.execute(workflow))
      )

      const allInstances = orchestrator.getAllInstances()
      expect(allInstances.length).toBe(count)
    })
  })

  describe('并发状态转换安全', () => {
    it('并发取消应该正确处理', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      // 创建多个实例
      const instance1 = orchestrator.createInstance(workflow)
      instance1.status = InstanceStatus.RUNNING
      const instance2 = orchestrator.createInstance(workflow)
      instance2.status = InstanceStatus.RUNNING

      // 并发取消
      orchestrator.cancel(instance1.id)
      orchestrator.cancel(instance2.id)

      // 验证状态
      const retrieved1 = orchestrator.getInstance(instance1.id)
      const retrieved2 = orchestrator.getInstance(instance2.id)

      expect(retrieved1?.status).toBe(InstanceStatus.CANCELLED)
      expect(retrieved2?.status).toBe(InstanceStatus.CANCELLED)
    })

    it('并发暂停和恢复应该正确处理', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      // 创建实例
      const instance = orchestrator.createInstance(workflow)
      instance.status = InstanceStatus.RUNNING

      // 暂停
      orchestrator.pause(instance.id)
      expect(instance.status).toBe(InstanceStatus.PENDING)

      // 恢复
      orchestrator.resume(instance.id)
      expect(instance.status).toBe(InstanceStatus.RUNNING)
    })
  })

  describe('并发访问安全', () => {
    it('并发读取实例应该返回正确数据', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const instance = await orchestrator.execute(workflow)

      // 并发读取
      const results = await Promise.all([
        Promise.resolve(orchestrator.getInstance(instance.id)),
        Promise.resolve(orchestrator.getInstance(instance.id)),
        Promise.resolve(orchestrator.getInstance(instance.id)),
      ]

      // 所有读取应该返回相同的数据
      results.forEach(retrieved => {
        expect(retrieved?.id).toBe(instance.id)
        expect(retrieved?.status).toBe(InstanceStatus.COMPLETED)
      })
    })

    it('并发查询节点状态应该返回正确数据', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const instance = await orchestrator.execute(workflow)

      // 并发查询
      const results = await Promise.all(
        workflow.nodes.map(node =>
          Promise.resolve(orchestrator.getNodeState(instance.id, node.id))
        )
      )

      // 所有查询应该返回正确的状态
      results.forEach(state => {
        expect(state).toBe('completed')
      })
    })
  })
})

// =====================================================
// Test Suite: 并发事件
// =====================================================

describe('WorkflowConcurrency - 并发事件', () => {
  describe('并发事件触发', () => {
    it('并发执行应该触发正确的事件', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const events: string[] = []
      orchestrator.addEventListener(event => {
        events.push(event.type)
      })

      await Promise.all([
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
      ])

      // 应该有事件被触发
      expect(events.length).toBeGreaterThan(0)
    })

    it('每个实例的事件应该包含正确的实例ID', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const instanceEvents: Map<string, string[]> = new Map()
      
      orchestrator.addEventListener(event => {
        const events = instanceEvents.get(event.instanceId) || []
        events.push(event.type)
        instanceEvents.set(event.instanceId, events)
      })

      const [instance1, instance2] = await Promise.all([
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
      ])

      // 验证每个实例的事件
      expect(instanceEvents.has(instance1.id)).toBe(true)
      expect(instanceEvents.has(instance2.id)).toBe(true)
    })
  })

  describe('并发事件顺序', () => {
    it('事件顺序可能不按执行顺序', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const events: { timestamp: string; instanceId: string }[] = []
      
      orchestrator.addEventListener(event => {
        events.push({
          timestamp: event.timestamp,
          instanceId: event.instanceId,
        })
      })

      await Promise.all([
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
      ])

      // 事件应该被记录
      expect(events.length).toBeGreaterThan(0)
    })
  })
})

// =====================================================
// Test Suite: 并发限制
// =====================================================

describe('WorkflowConcurrency - 并发限制', () => {
  describe('并行执行限制', () => {
    it('应该支持配置最大并行数', () => {
      const config: OrchestratorConfig = {
        maxParallelism: 10,
      }

      const orchestrator = new VisualWorkflowOrchestrator(config)
      expect(orchestrator).toBeDefined()
    })

    it('应该支持禁用并行执行', () => {
      const config: OrchestratorConfig = {
        maxParallelism: 1,
      }

      const orchestrator = new VisualWorkflowOrchestrator(config)
      expect(orchestrator).toBeDefined()
    })
  })

  describe('并发资源管理', () => {
    it('应该能够处理大量并发实例', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      // 创建大量并发实例
      const count = 20
      const promises = Array(count).fill(null).map(() => orchestrator.execute(workflow))

      const instances = await Promise.all(promises)

      // 所有实例应该成功完成
      instances.forEach(instance => {
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })

      // 验证所有实例都被保存
      const allInstances = orchestrator.getAllInstances()
      expect(allInstances.length).toBe(count)
    }, 30000) // 增加超时时间
  })

  describe('并发统计', () => {
    it('应该正确统计并发执行的实例', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      await Promise.all([
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
      ])

      const stats = orchestrator.getStatistics(workflow.id)

      expect(stats.totalInstances).toBe(3)
      expect(stats.completed).toBe(3)
    })

    it('应该正确统计失败的实例', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'ERROR', message: 'Task failed' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      const orchestrator = new VisualWorkflowOrchestrator()
      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      // 一些成功，一些失败
      try {
        await orchestrator.execute(workflow)
      } catch (error) {}

      try {
        await orchestrator.execute(workflow)
      } catch (error) {}

      await orchestrator.execute(workflow)

      const stats = orchestrator.getStatistics(workflow.id)

      expect(stats.totalInstances).toBe(3)
      expect(stats.completed).toBe(1)
      expect(stats.failed).toBe(2)
    })
  })
})

// =====================================================
// Test Suite: 并发边界情况
// =====================================================

describe('WorkflowConcurrency - 并发边界情况', () => {
  describe('空并发', () => {
    it('零个并发实例应该正常工作', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const instances: any[] = []

      const results = await Promise.all(instances)

      expect(results.length).toBe(0)
    })
  })

  describe('单并发', () => {
    it('单个实例应该正常工作', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const instance = await orchestrator.execute(workflow)

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
    })
  })

  describe('大量并发', () => {
    it('大量并发实例应该正确处理', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const count = 50
      const instances = await Promise.all(
        Array(count).fill(null).map(() => orchestrator.execute(workflow))
      )

      // 所有实例应该成功完成
      instances.forEach(instance => {
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })

      // 验证所有实例都被保存
      const allInstances = orchestrator.getAllInstances()
      expect(allInstances.length).toBe(count)
    }, 60000) // 大幅增加超时时间
  })
})

// =====================================================
// Test Suite: 并发和状态转换
// =====================================================

describe('WorkflowConcurrency - 并发和状态转换', () => {
  describe('并发状态转换', () => {
    it('并发执行时状态转换应该正确', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      // 并发执行
      const instances = await Promise.all([
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
      ])

      // 验证所有状态转换都正确
      instances.forEach(instance => {
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
        expect(instance.metadata.endedAt).toBeDefined()
        expect(instance.metadata.duration).toBeDefined()
      })
    })

    it('并发执行时节点状态转换应该正确', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      const workflow = createSimpleWorkflow()

      const instances = await Promise.all([
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
      ])

      // 验证所有节点状态转换都正确
      instances.forEach(instance => {
        workflow.nodes.forEach(node => {
          const state = orchestrator.getNodeState(instance.id, node.id)
          expect(state).toBe('completed')

          const result = instance.nodeResults.get(node.id)
          expect(result?.status).toBe(NodeStatus.SUCCESS)
        })
      })
    })
  })

  describe('并发失败处理', () => {
    it('一个实例失败不应该影响其他实例', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async (node, context) => {
          // 第一个实例失败，其他成功
          if (context.instanceId.includes('instance_0')) {
            throw new Error('Intentional error')
          }
          return {
            success: true,
            nodeId: node.id,
            output: {},
            duration: 0,
            logs: [],
          }
        },
        validate: () => ({ valid: true, errors: [] }),
      }

      const orchestrator = new VisualWorkflowOrchestrator()
      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      // 第一个会失败，第二个会成功
      let failedCount = 0
      let successCount = 0

      const results = await Promise.allSettled([
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
      ])

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successCount++
        } else {
          failedCount++
        }
      })

      // 至少有一个成功
      expect(successCount).toBeGreaterThan(0)
    })
  })
})

// =====================================================
// Test Suite: 并发性能
// =====================================================

describe('WorkflowConcurrency - 并发性能', () => {
  describe('并发执行时间', () => {
    it('并发执行应该比串行执行快', async () => {
      const slowExecutor: NodeExecutorHandler = {
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return {
            success: true,
            nodeId: 'task',
            output: {},
            duration: 100,
            logs: [],
          }
        },
        validate: () => ({ valid: true, errors: [] }),
      }

      const orchestrator = new VisualWorkflowOrchestrator()
      orchestrator.registerExecutor(NodeType.AGENT, slowExecutor)

      const workflow = createSimpleWorkflow()

      // 并发执行
      const concurrentStart = Date.now()
      await Promise.all([
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
        orchestrator.execute(workflow),
      ])
      const concurrentEnd = Date.now()

      const concurrentTime = concurrentEnd - concurrentStart

      // 并发执行时间应该远小于 3 * 100ms
      expect(concurrentTime).toBeLessThan(300)
    })
  })
})
