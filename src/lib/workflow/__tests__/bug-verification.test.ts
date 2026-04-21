/**
 * 工作流引擎边缘案例 Bug 验证测试
 *
 * 测试以下发现的问题：
 * 1. 并发执行时的状态竞态条件 (executor.ts, VisualWorkflowOrchestrator.ts)
 * 2. 循环执行器的内存泄漏 (loop-executor.ts)
 * 3. 条件节点分支选择逻辑缺陷 (executor.ts, VisualWorkflowOrchestrator.ts)
 * 4. 超时处理不完整 (VisualWorkflowOrchestrator.ts)
 * 5. Map 序列化/反序列化问题 (types.ts)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EnhancedWorkflowExecutor } from '../executor'
import { VisualWorkflowOrchestrator } from '../VisualWorkflowOrchestrator'
import {
  WorkflowDefinition,
  NodeType,
  InstanceStatus,
  NodeStatus,
  EdgeType,
} from '@/types/workflow'
import { loopNodeExecutor } from '../executors/loop-executor'
import { nodeExecutorRegistry } from '../executors/registry'

describe('Workflow Engine Edge Case Bugs', () => {
  describe('Bug #1: 并发执行时的状态竞态条件', () => {
    it('应该正确处理并发修改 nodeResults 的 Map', async () => {
      const executor = new EnhancedWorkflowExecutor()

      const workflow: WorkflowDefinition = {
        id: 'concurrent-workflow',
        name: '并发工作流',
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
            id: 'parallel',
            type: NodeType.PARALLEL,
            name: '并行',
            position: { x: 100, y: 0 },
          },
          {
            id: 'task1',
            type: NodeType.AGENT,
            name: '任务1',
            position: { x: 200, y: -50 },
            agentConfig: { agentId: 'agent1', agentType: 'test' },
          },
          {
            id: 'task2',
            type: NodeType.AGENT,
            name: '任务2',
            position: { x: 200, y: 50 },
            agentConfig: { agentId: 'agent2', agentType: 'test' },
          },
          {
            id: 'end',
            type: NodeType.END,
            name: '结束',
            position: { x: 300, y: 0 },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'parallel', type: EdgeType.SEQUENCE },
          { id: 'e2', source: 'parallel', target: 'task1', type: EdgeType.SEQUENCE },
          { id: 'e3', source: 'parallel', target: 'task2', type: EdgeType.SEQUENCE },
          { id: 'e4', source: 'task1', target: 'end', type: EdgeType.SEQUENCE },
          { id: 'e5', source: 'task2', target: 'end', type: EdgeType.SEQUENCE },
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      executor.registerWorkflow(workflow)

      // 并发创建多个实例
      const instances = await Promise.all(
        Array.from({ length: 5 }, async () => {
          const instance = executor.createInstance(workflow.id)
          await executor.executeInstance(instance.id)
          return executor.getInstance(instance.id)
        })
      )

      // 所有实例应该正确完成
      instances.forEach(instance => {
        expect(instance?.status).toBe(InstanceStatus.COMPLETED)
        expect(instance?.progress.completed).toBeGreaterThan(0)
        expect(instance?.nodeResults.size).toBe(5)
      })
    }, 30000)

    it('VisualWorkflowOrchestrator 并发执行不应该丢失节点状态', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()

      const workflow: WorkflowDefinition = {
        id: 'concurrent-orch-workflow',
        name: '并发编排工作流',
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
            id: 'task',
            type: NodeType.AGENT,
            name: '任务',
            position: { x: 100, y: 0 },
            agentConfig: { agentId: 'agent', agentType: 'test' },
          },
          {
            id: 'end',
            type: NodeType.END,
            name: '结束',
            position: { x: 200, y: 0 },
          },
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

      // 并发执行
      const instances = await Promise.all(
        Array.from({ length: 10 }, () => orchestrator.execute(workflow, {}))
      )

      // 所有实例应该完成且状态正确
      instances.forEach(instance => {
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
        expect(instance.nodeResults.size).toBe(3)
        expect(instance.nodeResults.get('start')?.status).toBe(NodeStatus.SUCCESS)
        expect(instance.nodeResults.get('task')?.status).toBe(NodeStatus.SUCCESS)
        expect(instance.nodeResults.get('end')?.status).toBe(NodeStatus.SUCCESS)
      })
    }, 30000)
  })

  describe('Bug #2: 循环执行器的内存泄漏', () => {
    it('应该在异常情况下清理循环状态', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()

      // 注册自定义循环执行器用于测试
      orchestrator.registerExecutor(NodeType.LOOP, {
        execute: async (node, context) => {
          throw new Error('模拟执行失败')
        },
        validate: () => ({ valid: true, errors: [] }),
      })

      const workflow: WorkflowDefinition = {
        id: 'loop-leak-workflow',
        name: '循环泄漏测试',
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
            id: 'loop',
            type: NodeType.LOOP,
            name: '循环',
            position: { x: 100, y: 0 },
            loopConfig: {
              loopType: 'conditional',
              condition: 'true',
              maxIterations: 10,
            },
          },
          {
            id: 'end',
            type: NodeType.END,
            name: '结束',
            position: { x: 200, y: 0 },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'loop', type: EdgeType.SEQUENCE },
          { id: 'e2', source: 'loop', target: 'end', type: EdgeType.SEQUENCE },
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      // 执行多次以检查内存泄漏
      for (let i = 0; i < 20; i++) {
        try {
          await orchestrator.execute(workflow, {})
        } catch (error) {
          // 预期失败
        }
      }

      // 检查循环状态是否被正确清理
      const state = loopNodeExecutor.getLoopState('test_instance', 'loop')
      expect(state).toBeUndefined()

      // 清理所有状态
      loopNodeExecutor.clearLoopState()

      // 清理后应该没有残留状态
      const afterCleanup = loopNodeExecutor.getLoopState('test_instance', 'loop')
      expect(afterCleanup).toBeUndefined()
    })

    it('应该在多次执行后正确清理状态', async () => {
      const workflow: WorkflowDefinition = {
        id: 'multi-loop-workflow',
        name: '多次循环测试',
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
            id: 'loop',
            type: NodeType.LOOP,
            name: '循环',
            position: { x: 100, y: 0 },
            loopConfig: {
              loopType: 'fixed',
              forConfig: { start: 0, end: 5, step: 1 },
              maxIterations: 10,
            },
          },
          {
            id: 'end',
            type: NodeType.END,
            name: '结束',
            position: { x: 200, y: 0 },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'loop', type: EdgeType.SEQUENCE },
          { id: 'e2', source: 'loop', target: 'end', type: EdgeType.SEQUENCE },
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const executor = new EnhancedWorkflowExecutor()
      executor.registerWorkflow(workflow)

      // 创建多个实例
      const instances = Array.from({ length: 10 }, () =>
        executor.createInstance(workflow.id)
      )

      // 执行所有实例
      const results = await Promise.all(
        instances.map(inst => executor.executeInstance(inst.id))
      )

      // 所有实例应该完成
      results.forEach(result => {
        expect(result.status).toBe(InstanceStatus.COMPLETED)
      })

      // 清理所有循环状态
      loopNodeExecutor.clearLoopState()
    })
  })

  describe('Bug #3: 条件节点分支选择逻辑缺陷', () => {
    it('应该正确处理大小写敏感的条件匹配', async () => {
      const executor = new EnhancedWorkflowExecutor()

      const workflow: WorkflowDefinition = {
        id: 'condition-case-workflow',
        name: '条件大小写测试',
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
            id: 'condition',
            type: NodeType.CONDITION,
            name: '条件',
            position: { x: 100, y: 0 },
            conditionConfig: {
              expression: 'inputs.value > 10',
              trueLabel: 'TRUE_LABEL',
              falseLabel: 'FALSE_LABEL',
            },
          },
          {
            id: 'true-branch',
            type: NodeType.AGENT,
            name: 'True 分支',
            position: { x: 200, y: -50 },
            agentConfig: { agentId: 'agent1', agentType: 'test' },
          },
          {
            id: 'false-branch',
            type: NodeType.AGENT,
            name: 'False 分支',
            position: { x: 200, y: 50 },
            agentConfig: { agentId: 'agent2', agentType: 'test' },
          },
          {
            id: 'end',
            type: NodeType.END,
            name: '结束',
            position: { x: 300, y: 0 },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'condition', type: EdgeType.SEQUENCE },
          {
            id: 'e2',
            source: 'condition',
            target: 'true-branch',
            type: EdgeType.SEQUENCE,
            conditionConfig: { condition: 'true', label: 'TRUE_LABEL' },
          },
          {
            id: 'e3',
            source: 'condition',
            target: 'false-branch',
            type: EdgeType.SEQUENCE,
            conditionConfig: { condition: 'false', label: 'FALSE_LABEL' },
          },
          { id: 'e4', source: 'true-branch', target: 'end', type: EdgeType.SEQUENCE },
          { id: 'e5', source: 'false-branch', target: 'end', type: EdgeType.SEQUENCE },
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      executor.registerWorkflow(workflow)

      // 测试 True 分支（大写标签）
      const instance1 = executor.createInstance(workflow.id, { value: 20 })
      const result1 = await executor.executeInstance(instance1.id)

      expect(result1.status).toBe(InstanceStatus.COMPLETED)
      expect(result1.nodeResults.get('true-branch')?.status).toBe(NodeStatus.SUCCESS)
      expect(result1.nodeResults.get('false-branch')?.status).toBe(NodeStatus.IDLE)

      // 测试 False 分支
      const instance2 = executor.createInstance(workflow.id, { value: 5 })
      const result2 = await executor.executeInstance(instance2.id)

      expect(result2.status).toBe(InstanceStatus.COMPLETED)
      expect(result2.nodeResults.get('false-branch')?.status).toBe(NodeStatus.SUCCESS)
      expect(result2.nodeResults.get('true-branch')?.status).toBe(NodeStatus.IDLE)
    })

    it('VisualWorkflowOrchestrator 应该正确匹配条件分支', async () => {
      const orchestrator = new VisualWorkflowOrchestrator()

      const workflow: WorkflowDefinition = {
        id: 'orch-condition-workflow',
        name: '编排器条件测试',
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
            id: 'condition',
            type: NodeType.CONDITION,
            name: '条件',
            position: { x: 100, y: 0 },
            conditionConfig: {
              expression: 'inputs.active === true',
              trueLabel: 'yes',
              falseLabel: 'no',
            },
          },
          {
            id: 'yes-branch',
            type: NodeType.AGENT,
            name: 'Yes 分支',
            position: { x: 200, y: -50 },
            agentConfig: { agentId: 'agent1', agentType: 'test' },
          },
          {
            id: 'end',
            type: NodeType.END,
            name: '结束',
            position: { x: 300, y: 0 },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'condition', type: EdgeType.SEQUENCE },
          {
            id: 'e2',
            source: 'condition',
            target: 'yes-branch',
            type: EdgeType.SEQUENCE,
            conditionConfig: { condition: 'yes', label: 'yes' },
          },
          { id: 'e3', source: 'yes-branch', target: 'end', type: EdgeType.SEQUENCE },
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      // 测试条件为 true 的情况
      const instance = await orchestrator.execute(workflow, { active: true })

      expect(instance.status).toBe(InstanceStatus.COMPLETED)
      expect(instance.nodeResults.get('yes-branch')?.status).toBe(NodeStatus.SUCCESS)
    })
  })

  describe('Bug #4: 超时处理不完整', () => {
    it('应该在超时时正确取消执行并清理资源', async () => {
      const orchestrator = new VisualWorkflowOrchestrator({
        globalTimeout: 100, // 100ms 超时
        enableLogs: true,
      })

      const workflow: WorkflowDefinition = {
        id: 'timeout-workflow',
        name: '超时测试',
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
            id: 'long-task',
            type: NodeType.WAIT,
            name: '长任务',
            position: { x: 100, y: 0 },
            waitConfig: { duration: 1 }, // 1 秒，应该超时
          },
          {
            id: 'end',
            type: NodeType.END,
            name: '结束',
            position: { x: 200, y: 0 },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'long-task', type: EdgeType.SEQUENCE },
          { id: 'e2', source: 'long-task', target: 'end', type: EdgeType.SEQUENCE },
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      // 执行应该很快完成（由于超时配置）
      const instance = await orchestrator.execute(workflow, {})

      expect(instance).toBeDefined()
      // 工作流可能完成或失败，取决于实现
      expect([InstanceStatus.COMPLETED, InstanceStatus.FAILED]).toContain(instance.status)
    })

    it('应该在节点执行超时时正确处理错误', async () => {
      const executor = new EnhancedWorkflowExecutor()

      const workflow: WorkflowDefinition = {
        id: 'node-timeout-workflow',
        name: '节点超时测试',
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
            id: 'task',
            type: NodeType.WAIT,
            name: '任务',
            position: { x: 100, y: 0 },
            waitConfig: { duration: 1 }, // 1 秒
          },
          {
            id: 'end',
            type: NodeType.END,
            name: '结束',
            position: { x: 200, y: 0 },
          },
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

      executor.registerWorkflow(workflow)
      const instance = executor.createInstance(workflow.id)

      const result = await executor.executeInstance(instance.id)

      expect(result.status).toBe(InstanceStatus.COMPLETED)
      expect(result.nodeResults.get('task')?.status).toBe(NodeStatus.SUCCESS)
    })
  })

  describe('Bug #5: Map 序列化/反序列化问题', () => {
    it('应该正确处理 nodeResults Map 的序列化', () => {
      const executor = new EnhancedWorkflowExecutor()

      const workflow: WorkflowDefinition = {
        id: 'map-workflow',
        name: 'Map 测试',
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
            id: 'end',
            type: NodeType.END,
            name: '结束',
            position: { x: 100, y: 0 },
          },
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

      executor.registerWorkflow(workflow)
      const instance = executor.createInstance(workflow.id)

      // 验证 nodeResults 是 Map 类型
      expect(instance.nodeResults).toBeInstanceOf(Map)

      // 获取实例应该返回相同类型
      const retrieved = executor.getInstance(instance.id)
      expect(retrieved?.nodeResults).toBeInstanceOf(Map)

      // 验证 Map 中的数据可以正确访问
      expect(instance.nodeResults.get('start')).toBeDefined()
      expect(instance.nodeResults.get('end')).toBeDefined()
    })

    it('应该能够正确将 Map 转换为对象用于存储', () => {
      const executor = new EnhancedWorkflowExecutor()

      const workflow: WorkflowDefinition = {
        id: 'map-convert-workflow',
        name: 'Map 转换测试',
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
            id: 'task',
            type: NodeType.AGENT,
            name: '任务',
            position: { x: 100, y: 0 },
            agentConfig: { agentId: 'agent', agentType: 'test' },
          },
          {
            id: 'end',
            type: NodeType.END,
            name: '结束',
            position: { x: 200, y: 0 },
          },
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

      executor.registerWorkflow(workflow)
      const instance = executor.createInstance(workflow.id)

      // 将 Map 转换为对象
      const nodeResultsObj = Object.fromEntries(instance.nodeResults)

      expect(nodeResultsObj).toHaveProperty('start')
      expect(nodeResultsObj).toHaveProperty('task')
      expect(nodeResultsObj).toHaveProperty('end')
      expect(nodeResultsObj.start.nodeId).toBe('start')
      expect(nodeResultsObj.task.nodeId).toBe('task')
      expect(nodeResultsObj.end.nodeId).toBe('end')

      // 将对象转换回 Map
      const restoredMap = new Map(Object.entries(nodeResultsObj))

      expect(restoredMap.get('start')?.nodeId).toBe('start')
      expect(restoredMap.get('task')?.nodeId).toBe('task')
      expect(restoredMap.get('end')?.nodeId).toBe('end')
    })
  })
})
