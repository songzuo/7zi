/**
 * Workflow Executor 测试 - 错误处理
 *
 * 测试覆盖:
 * 1. 节点执行错误
 * 2. 工作流验证错误
 * 3. 执行器错误
 * 4. 错误恢复
 * 5. 错误日志
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  VisualWorkflowOrchestrator,
  NodeExecutorHandler,
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

// =====================================================
// Test Suite: 节点执行错误
// =====================================================

describe('WorkflowExecutorErrorHandling - 节点执行错误', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('节点执行失败', () => {
    it('节点执行失败应该导致工作流失败', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'EXECUTION_ERROR', message: 'Task execution failed' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      await expect(orchestrator.execute(workflow)).rejects.toThrow()
    })

    it('节点执行失败应该设置错误信息', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'EXECUTION_ERROR', message: 'Task execution failed' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      // 检查实例错误信息
      const instance = orchestrator.getAllInstances()[0]
      expect(instance?.error).toBeDefined()
    })

    it('节点执行失败应该记录失败的节点', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'EXECUTION_ERROR', message: 'Task execution failed' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      const instance = orchestrator.getAllInstances()[0]
      const taskResult = instance?.nodeResults.get('task')
      expect(taskResult?.status).toBe(NodeStatus.FAILED)
    })

    it('节点执行失败应该增加失败计数', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'EXECUTION_ERROR', message: 'Task execution failed' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      const instance = orchestrator.getAllInstances()[0]
      expect(instance?.progress.failed).toBeGreaterThan(0)
    })
  })

  describe('节点执行抛出异常', () => {
    it('节点执行抛出异常应该导致工作流失败', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async () => {
          throw new Error('Unexpected error')
        },
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      await expect(orchestrator.execute(workflow)).rejects.toThrow()
    })

    it('节点执行异常应该记录错误信息', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async () => {
          throw new Error('Unexpected error')
        },
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      const instance = orchestrator.getAllInstances()[0]
      expect(instance?.error).toBeDefined()
      expect(instance?.error?.message).toContain('Unexpected error')
    })

    it('异常应该包含错误堆栈', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async () => {
          throw new Error('Unexpected error')
        },
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      let thrownError: Error | null = null
      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        thrownError = error as Error
      }

      expect(thrownError).toBeDefined()
      expect(thrownError?.message).toBe('Unexpected error')
    })
  })

  describe('节点执行返回错误对象', () => {
    it('应该正确处理错误代码', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'CUSTOM_ERROR_CODE', message: 'Custom error message' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      const instance = orchestrator.getAllInstances()[0]
      expect(instance?.error?.code).toBe('CUSTOM_ERROR_CODE')
    })

    it('应该正确处理错误消息', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'ERROR', message: 'This is a custom error message' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      const instance = orchestrator.getAllInstances()[0]
      expect(instance?.error?.message).toBe('This is a custom error message')
    })

    it('应该包含错误堆栈信息', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { 
            code: 'ERROR', 
            message: 'Error with stack',
            stack: 'Error: Error with stack\n    at Object.execute' 
          },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      const instance = orchestrator.getAllInstances()[0]
      expect(instance?.error?.stack).toBeDefined()
    })
  })
})

// =====================================================
// Test Suite: 工作流验证错误
// =====================================================

describe('WorkflowExecutorErrorHandling - 工作流验证错误', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('工作流验证失败', () => {
    it('验证失败应该抛出错误', async () => {
      const workflow: WorkflowDefinition = {
        id: 'invalid-workflow',
        name: '无效工作流',
        version: 1,
        status: 'active' as any,
        nodes: [], // 空节点列表
        edges: [],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      await expect(orchestrator.execute(workflow)).rejects.toThrow()
    })

    it('验证错误应该包含错误消息', async () => {
      const workflow: WorkflowDefinition = {
        id: 'invalid-workflow',
        name: '无效工作流',
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

      let errorMessage = ''
      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        errorMessage = (error as Error).message
      }

      expect(errorMessage).toContain('Workflow validation failed')
    })

    it('缺少开始节点应该抛出错误', async () => {
      const workflow: WorkflowDefinition = {
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

      await expect(orchestrator.execute(workflow)).rejects.toThrow()
    })

    it('缺少结束节点应该抛出错误', async () => {
      const workflow: WorkflowDefinition = {
        id: 'no-end-workflow',
        name: '无结束节点工作流',
        version: 1,
        status: 'active' as any,
        nodes: [
          createMockNode('start', NodeType.START),
          createMockNode('task', NodeType.AGENT, {
            agentConfig: { agentId: 'test-agent', agentType: 'test' },
          }),
        ],
        edges: [createMockEdge('e1', 'start', 'task')],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      await expect(orchestrator.execute(workflow)).rejects.toThrow()
    })
  })

  describe('工作流验证返回详细信息', () => {
    it('验证应该返回所有错误', () => {
      const workflow: WorkflowDefinition = {
        id: 'invalid-workflow',
        name: '无效工作流',
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

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('验证应该返回警告', () => {
      const workflow: WorkflowDefinition = {
        id: 'isolated-workflow',
        name: '孤立节点工作流',
        version: 1,
        status: 'active' as any,
        nodes: [
          createMockNode('start', NodeType.START),
          createMockNode('end', NodeType.END),
          createMockNode('isolated', NodeType.AGENT, {
            agentConfig: { agentId: 'isolated', agentType: 'test' },
          }),
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

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })
})

// =====================================================
// Test Suite: 执行器错误
// =====================================================

describe('WorkflowExecutorErrorHandling - 执行器错误', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('未找到执行器', () => {
    it('未找到执行器应该抛出错误', async () => {
      const workflow: WorkflowDefinition = {
        id: 'custom-node-workflow',
        name: '自定义节点工作流',
        version: 1,
        status: 'active' as any,
        nodes: [
          createMockNode('start', NodeType.START),
          createMockNode('custom', 'custom' as NodeType), // 未注册的自定义节点类型
          createMockNode('end', NodeType.END),
        ],
        edges: [
          createMockEdge('e1', 'start', 'custom'),
          createMockEdge('e2', 'custom', 'end'),
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      await expect(orchestrator.execute(workflow)).rejects.toThrow()
    })

    it('未找到执行器错误应该说明原因', async () => {
      const workflow: WorkflowDefinition = {
        id: 'custom-node-workflow',
        name: '自定义节点工作流',
        version: 1,
        status: 'active' as any,
        nodes: [
          createMockNode('start', NodeType.START),
          createMockNode('custom', 'custom' as NodeType),
          createMockNode('end', NodeType.END),
        ],
        edges: [
          createMockEdge('e1', 'start', 'custom'),
          createMockEdge('e2', 'custom', 'end'),
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      let errorMessage = ''
      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        errorMessage = (error as Error).message
      }

      expect(errorMessage).toContain('No executor found')
    })
  })

  describe('执行器验证失败', () => {
    it('节点配置验证失败应该导致工作流失败', async () => {
      const workflow: WorkflowDefinition = {
        id: 'invalid-condition-workflow',
        name: '无效条件节点工作流',
        version: 1,
        status: 'active' as any,
        nodes: [
          createMockNode('start', NodeType.START),
          createMockNode('condition', NodeType.CONDITION, {
            conditionConfig: { expression: '' }, // 空表达式
          }),
          createMockNode('end', NodeType.END),
        ],
        edges: [
          createMockEdge('e1', 'start', 'condition'),
          createMockEdge('e2', 'condition', 'end'),
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      // 验证应该失败
      const result = orchestrator.validateWorkflow(workflow)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Condition expression is required'))).toBe(true)
    })

    it('等待节点配置验证失败', async () => {
      const workflow: WorkflowDefinition = {
        id: 'invalid-wait-workflow',
        name: '无效等待节点工作流',
        version: 1,
        status: 'active' as any,
        nodes: [
          createMockNode('start', NodeType.START),
          createMockNode('wait', NodeType.WAIT, {
            waitConfig: {}, // 缺少 duration
          }),
          createMockNode('end', NodeType.END),
        ],
        edges: [
          createMockEdge('e1', 'start', 'wait'),
          createMockEdge('e2', 'wait', 'end'),
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const result = orchestrator.validateWorkflow(workflow)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Wait duration is required'))).toBe(true)
    })
  })
})

// =====================================================
// Test Suite: 错误恢复
// =====================================================

describe('WorkflowExecutorErrorHandling - 错误恢复', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('部分执行后的错误', () => {
    it('部分节点应该被标记为已完成', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async (node) => {
          if (node.id === 'task') {
            throw new Error('Task failed')
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

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      const instance = orchestrator.getAllInstances()[0]
      const startResult = instance?.nodeResults.get('start')
      expect(startResult?.status).toBe(NodeStatus.SUCCESS)
    })

    it('失败的节点应该被标记为失败', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async (node) => {
          if (node.id === 'task') {
            throw new Error('Task failed')
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

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      const instance = orchestrator.getAllInstances()[0]
      const taskResult = instance?.nodeResults.get('task')
      expect(taskResult?.status).toBe(NodeStatus.FAILED)
    })
  })

  describe('错误后的工作流状态', () => {
    it('失败的工作流状态应该是 FAILED', async () => {
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

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      const instance = orchestrator.getAllInstances()[0]
      expect(instance?.status).toBe(InstanceStatus.FAILED)
    })

    it('失败的工作流应该有结束时间', async () => {
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

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      const instance = orchestrator.getAllInstances()[0]
      expect(instance?.metadata.endedAt).toBeDefined()
    })
  })
})

// =====================================================
// Test Suite: 错误日志
// =====================================================

describe('WorkflowExecutorErrorHandling - 错误日志', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator({ enableLogs: true })
  })

  describe('错误日志记录', () => {
    it('应该记录节点失败的日志', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'ERROR', message: 'Task failed' },
          duration: 0,
          logs: [
            { level: 'error', message: 'Task execution failed', timestamp: new Date().toISOString() }
          ],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      const instance = orchestrator.getAllInstances()[0]
      const taskResult = instance?.nodeResults.get('task')
      expect(taskResult?.logs?.length).toBeGreaterThan(0)
    })

    it('应该记录工作流失败的日志', async () => {
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

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      let failedEventEmitted = false
      orchestrator.addEventListener((event) => {
        if (event.type === 'workflow_failed') {
          failedEventEmitted = true
        }
      })

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      expect(failedEventEmitted).toBe(true)
    })
  })

  describe('禁用日志时的错误处理', () => {
    it('禁用日志时不应该生成日志', async () => {
      const noLogOrchestrator = new VisualWorkflowOrchestrator({ enableLogs: false })
      const workflow = createSimpleWorkflow()
      const instance = await noLogOrchestrator.execute(workflow)

      // 检查节点执行结果中的日志
      workflow.nodes.forEach(node => {
        const result = instance.nodeResults.get(node.id)
        if (result?.logs) {
          expect(result.logs.length).toBe(0)
        }
      })
    })
  })
})

// =====================================================
// Test Suite: 错误事件
// =====================================================

describe('WorkflowExecutorErrorHandling - 错误事件', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('错误事件触发', () => {
    it('节点失败时应该触发 node_failed 事件', async () => {
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

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

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

    it('工作流失败时应该触发 workflow_failed 事件', async () => {
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

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

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

    it('错误事件应该包含错误数据', async () => {
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

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      let eventData: any = null
      orchestrator.addEventListener((event) => {
        if (event.type === 'workflow_failed') {
          eventData = event.data
        }
      })

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        // 预期抛出错误
      }

      expect(eventData).toBeDefined()
      expect(eventData?.error).toBeDefined()
    })
  })
})

// =====================================================
// Test Suite: 错误类型
// =====================================================

describe('WorkflowExecutorErrorHandling - 错误类型', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  describe('不同类型的错误', () => {
    it('应该处理字符串错误消息', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'ERROR', message: 'String error' } as any,
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('应该处理空错误消息', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: { code: 'ERROR', message: '' },
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('应该处理无错误消息的情况', async () => {
      const errorExecutor: NodeExecutorHandler = {
        execute: async () => ({
          success: false,
          nodeId: 'task',
          error: undefined,
          duration: 0,
          logs: [],
        }),
        validate: () => ({ valid: true, errors: [] }),
      }

      orchestrator.registerExecutor(NodeType.AGENT, errorExecutor)

      const workflow = createSimpleWorkflow()

      try {
        await orchestrator.execute(workflow)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })
})
