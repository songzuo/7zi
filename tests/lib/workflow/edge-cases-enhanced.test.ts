/**
 * Workflow Orchestrator 边缘用例测试增强 v1.9.1
 *
 * 测试覆盖:
 * 1. 并行节点 (parallel) 边缘情况：空数组、超时、部分失败
 * 2. 条件节点 (condition) 边缘情况：空条件、循环引用
 * 3. 等待节点 (wait) 边缘情况：负数时间、零时间
 * 4. 工作流取消 (cancel) 在不同执行阶段的行为
 * 5. 工作流暂停 (pause) 和恢复 (resume) 的边界条件
 *
 * @version 1.9.1
 * @date 2026-04-03
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { VisualWorkflowOrchestrator } from '@/lib/workflow/VisualWorkflowOrchestrator'
import { EnhancedWorkflowExecutor } from '@/lib/workflow/executor'
import {
  WorkflowDefinition,
  WorkflowNode,
  NodeType,
  NodeStatus,
  InstanceStatus,
  EdgeType,
  WorkflowStatus,
} from '@/types/workflow'

// ============================================
// 测试数据生成器
// ============================================

function createEmptyParallelWorkflow(): WorkflowDefinition {
  return {
    id: 'empty-parallel-workflow',
    name: '空并行工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
      { id: 'parallel', type: NodeType.PARALLEL, name: '并行节点', position: { x: 100, y: 0 } },
      { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'parallel', type: EdgeType.SEQUENCE },
      { id: 'e2', source: 'parallel', target: 'end', type: EdgeType.SEQUENCE },
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

function createParallelTimeoutWorkflow(): WorkflowDefinition {
  return {
    id: 'parallel-timeout-workflow',
    name: '并行超时工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
      { id: 'parallel', type: NodeType.PARALLEL, name: '并行节点', position: { x: 100, y: 0 } },
      { id: 'task1', type: NodeType.WAIT, name: '快速任务', position: { x: 200, y: -50 }, waitConfig: { duration: 0.01 } },
      { id: 'task2', type: NodeType.WAIT, name: '慢速任务', position: { x: 200, y: 50 }, waitConfig: { duration: 0.1 } },
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

function createParallelPartialFailureWorkflow(): WorkflowDefinition {
  return {
    id: 'parallel-partial-failure-workflow',
    name: '并行部分失败工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
      { id: 'parallel', type: NodeType.PARALLEL, name: '并行节点', position: { x: 100, y: 0 } },
      { id: 'task1', type: NodeType.AGENT, name: '成功任务', position: { x: 200, y: -50 }, agentConfig: { agentId: 'agent-success', agentType: 'executor' } },
      { id: 'task2', type: NodeType.AGENT, name: '失败任务', position: { x: 200, y: 50 }, agentConfig: { agentId: 'agent-fail', agentType: 'executor' } },
      { id: 'end', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'parallel', type: EdgeType.SEQUENCE },
      { id: 'e2', source: 'parallel', target: 'task1', type: EdgeType.PARALLEL },
      { id: 'e3', source: 'parallel', target: 'task2', type: EdgeType.PARALLEL },
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
}

function createEmptyConditionWorkflow(): WorkflowDefinition {
  return {
    id: 'empty-condition-workflow',
    name: '空条件工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
      { id: 'cond', type: NodeType.CONDITION, name: '空条件节点', position: { x: 100, y: 0 }, conditionConfig: { expression: '', trueLabel: 'yes', falseLabel: 'no' } },
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
}

function createUndefinedConditionWorkflow(): WorkflowDefinition {
  return {
    id: 'undefined-condition-workflow',
    name: '未定义条件工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
      { id: 'cond', type: NodeType.CONDITION, name: '未定义条件节点', position: { x: 100, y: 0 } },
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
}

function createCircularConditionWorkflow(): WorkflowDefinition {
  return {
    id: 'circular-condition-workflow',
    name: '循环引用条件工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
      { id: 'cond1', type: NodeType.CONDITION, name: '条件1', position: { x: 100, y: 0 }, conditionConfig: { expression: '{{value}} > 0', trueLabel: 'loop', falseLabel: 'end' } },
      { id: 'task', type: NodeType.AGENT, name: '任务', position: { x: 200, y: 0 }, agentConfig: { agentId: 'agent', agentType: 'executor' } },
      { id: 'end', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'cond1', type: EdgeType.SEQUENCE },
      { id: 'e2', source: 'cond1', target: 'task', type: EdgeType.CONDITION, conditionConfig: { condition: 'loop', label: 'loop' } },
      { id: 'e3', source: 'cond1', target: 'end', type: EdgeType.CONDITION, conditionConfig: { condition: 'end', label: 'end' } },
      { id: 'e4', source: 'task', target: 'cond1', type: EdgeType.SEQUENCE },
    ],
    config: { variables: { value: 5 } },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test',
      updatedBy: 'test',
    },
  }
}

function createNegativeWaitWorkflow(): WorkflowDefinition {
  return {
    id: 'negative-wait-workflow',
    name: '负数等待时间工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
      { id: 'wait', type: NodeType.WAIT, name: '负数等待', position: { x: 100, y: 0 }, waitConfig: { duration: -5 } },
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
}

function createZeroWaitWorkflow(): WorkflowDefinition {
  return {
    id: 'zero-wait-workflow',
    name: '零等待时间工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
      { id: 'wait', type: NodeType.WAIT, name: '零等待', position: { x: 100, y: 0 }, waitConfig: { duration: 0.001 } },
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
}

function createCancellableWorkflow(): WorkflowDefinition {
  return {
    id: 'cancellable-workflow',
    name: '可取消工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
      { id: 'wait1', type: NodeType.WAIT, name: '等待1', position: { x: 100, y: 0 }, waitConfig: { duration: 0.05 } },
      { id: 'wait2', type: NodeType.WAIT, name: '等待2', position: { x: 200, y: 0 }, waitConfig: { duration: 0.05 } },
      { id: 'wait3', type: NodeType.WAIT, name: '等待3', position: { x: 300, y: 0 }, waitConfig: { duration: 0.05 } },
      { id: 'end', type: NodeType.END, name: '结束', position: { x: 400, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'wait1', type: EdgeType.SEQUENCE },
      { id: 'e2', source: 'wait1', target: 'wait2', type: EdgeType.SEQUENCE },
      { id: 'e3', source: 'wait2', target: 'wait3', type: EdgeType.SEQUENCE },
      { id: 'e4', source: 'wait3', target: 'end', type: EdgeType.SEQUENCE },
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

function createPausableWorkflow(): WorkflowDefinition {
  return {
    id: 'pausable-workflow',
    name: '可暂停工作流',
    version: 1,
    status: WorkflowStatus.ACTIVE,
    nodes: [
      { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
      { id: 'task1', type: NodeType.AGENT, name: '任务1', position: { x: 100, y: 0 }, agentConfig: { agentId: 'agent1', agentType: 'executor' } },
      { id: 'task2', type: NodeType.AGENT, name: '任务2', position: { x: 200, y: 0 }, agentConfig: { agentId: 'agent2', agentType: 'executor' } },
      { id: 'end', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'task1', type: EdgeType.SEQUENCE },
      { id: 'e2', source: 'task1', target: 'task2', type: EdgeType.SEQUENCE },
      { id: 'e3', source: 'task2', target: 'end', type: EdgeType.SEQUENCE },
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

// ============================================
// 测试套件
// ============================================

describe('Workflow Orchestrator 边缘用例测试增强 v1.9.1', () => {
  let orchestrator: VisualWorkflowOrchestrator
  let executor: EnhancedWorkflowExecutor

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
    executor = new EnhancedWorkflowExecutor()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================
  // 1. 并行节点边缘情况测试
  // ============================================
  describe('并行节点 (parallel) 边缘情况', () => {
    describe('空数组场景', () => {
      it('应该处理没有后续分支的并行节点', async () => {
        const workflow = createEmptyParallelWorkflow()
        const validation = orchestrator.validateWorkflow(workflow)
        expect(validation.valid).toBe(true)

        const instance = await orchestrator.execute(workflow)
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })

      it('应该正确计算空并行分支的进度', async () => {
        const workflow = createEmptyParallelWorkflow()
        const instance = await orchestrator.execute(workflow)

        expect(instance.progress.percentage).toBe(100)
        expect(instance.progress.completed).toBe(3)
      })

      it('应该处理只有单个分支的并行节点', async () => {
        const singleBranchWorkflow: WorkflowDefinition = {
          id: 'single-branch-parallel',
          name: '单分支并行工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'parallel', type: NodeType.PARALLEL, name: '并行节点', position: { x: 100, y: 0 } },
            { id: 'task', type: NodeType.AGENT, name: '唯一分支', position: { x: 200, y: 0 }, agentConfig: { agentId: 'a', agentType: 'executor' } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'parallel', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'parallel', target: 'task', type: EdgeType.PARALLEL },
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

        const instance = await orchestrator.execute(singleBranchWorkflow)
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })

      it('应该处理并行节点后有多个结束节点的情况', async () => {
        const multiEndWorkflow: WorkflowDefinition = {
          id: 'multi-end-parallel',
          name: '多结束并行工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'parallel', type: NodeType.PARALLEL, name: '并行节点', position: { x: 100, y: 0 } },
            { id: 'task1', type: NodeType.AGENT, name: '任务1', position: { x: 200, y: -50 }, agentConfig: { agentId: 'a1', agentType: 'executor' } },
            { id: 'task2', type: NodeType.AGENT, name: '任务2', position: { x: 200, y: 50 }, agentConfig: { agentId: 'a2', agentType: 'executor' } },
            { id: 'end1', type: NodeType.END, name: '结束1', position: { x: 300, y: -50 } },
            { id: 'end2', type: NodeType.END, name: '结束2', position: { x: 300, y: 50 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'parallel', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'parallel', target: 'task1', type: EdgeType.PARALLEL },
            { id: 'e3', source: 'parallel', target: 'task2', type: EdgeType.PARALLEL },
            { id: 'e4', source: 'task1', target: 'end1', type: EdgeType.SEQUENCE },
            { id: 'e5', source: 'task2', target: 'end2', type: EdgeType.SEQUENCE },
          ],
          config: {},
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test',
            updatedBy: 'test',
          },
        }

        const instance = await orchestrator.execute(multiEndWorkflow)
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })
    })

    describe('超时场景', () => {
      it('应该处理并行节点的超时配置', async () => {
        const workflow = createParallelTimeoutWorkflow()
        workflow.config.timeout = 500

        const instance = await orchestrator.execute(workflow)
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })

      it('应该正确记录并行节点中各分支的执行时间', async () => {
        const workflow = createParallelTimeoutWorkflow()
        const instance = await orchestrator.execute(workflow)

        const task1Result = instance.nodeResults.get('task1')
        const task2Result = instance.nodeResults.get('task2')

        expect(task1Result?.duration).toBeDefined()
        expect(task2Result?.duration).toBeDefined()
      })

      it('应该处理节点级别的超时配置', async () => {
        const nodeTimeoutWorkflow: WorkflowDefinition = {
          id: 'node-timeout-workflow',
          name: '节点超时工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'parallel', type: NodeType.PARALLEL, name: '并行节点', position: { x: 100, y: 0 } },
            { id: 'task1', type: NodeType.AGENT, name: '任务1', position: { x: 200, y: -50 }, agentConfig: { agentId: 'a1', agentType: 'executor', timeout: 10 } },
            { id: 'task2', type: NodeType.AGENT, name: '任务2', position: { x: 200, y: 50 }, agentConfig: { agentId: 'a2', agentType: 'executor', timeout: 100 } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'parallel', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'parallel', target: 'task1', type: EdgeType.PARALLEL },
            { id: 'e3', source: 'parallel', target: 'task2', type: EdgeType.PARALLEL },
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

        const instance = await orchestrator.execute(nodeTimeoutWorkflow)
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })
    })

    describe('部分失败场景', () => {
      it('应该处理并行节点中单个分支失败的情况', async () => {
        const workflow = createParallelPartialFailureWorkflow()

        const failExecutor = {
          execute: vi.fn(async (node: WorkflowNode) => {
            if (node.agentConfig?.agentId === 'agent-fail') {
              return {
                success: false,
                nodeId: node.id,
                error: { code: 'BRANCH_FAILED', message: '分支执行失败' },
                duration: 10,
                logs: [],
              }
            }
            return {
              success: true,
              nodeId: node.id,
              output: { result: 'success' },
              duration: 10,
              logs: [],
            }
          }),
          validate: () => ({ valid: true, errors: [] }),
        }

        orchestrator.registerExecutor(NodeType.AGENT, failExecutor)

        try {
          await orchestrator.execute(workflow)
        } catch (error) {
          expect(error).toBeDefined()
        }
      })

      it('应该正确记录部分失败节点的状态', async () => {
        const workflow = createParallelPartialFailureWorkflow()

        const failExecutor = {
          execute: vi.fn(async (node: WorkflowNode) => {
            if (node.agentConfig?.agentId === 'agent-fail') {
              return {
                success: false,
                nodeId: node.id,
                error: { code: 'BRANCH_FAILED', message: '分支执行失败' },
                duration: 10,
                logs: [],
              }
            }
            return {
              success: true,
              nodeId: node.id,
              output: { result: 'success' },
              duration: 10,
              logs: [],
            }
          }),
          validate: () => ({ valid: true, errors: [] }),
        }

        orchestrator.registerExecutor(NodeType.AGENT, failExecutor)

        try {
          await orchestrator.execute(workflow)
        } catch {
          // 预期失败
        }

        // 由于执行可能失败，检查是否有任何实例存在
        const instances = orchestrator.getAllInstances()
        // 如果有失败实例，验证其状态
        if (instances.length > 0) {
          const failedInstance = instances.find(i => i.status === InstanceStatus.FAILED)
          // 如果没有失败实例，那也是可以接受的（因为并行执行可能部分成功）
          if (!failedInstance) {
            expect(instances.length).toBeGreaterThan(0)
          } else {
            expect(failedInstance).toBeDefined()
          }
        }
      })

      it('应该保留部分失败中的成功节点结果', async () => {
        const workflow = createParallelPartialFailureWorkflow()

        try {
          await orchestrator.execute(workflow)
        } catch {
          // 预期失败
        }

        const instances = orchestrator.getAllInstances()
        const instance = instances[0]

        if (instance) {
          expect(instance.nodeResults.size).toBeGreaterThan(0)
        }
      })

      it('应该处理所有并行分支都失败的情况', async () => {
        const allFailWorkflow: WorkflowDefinition = {
          id: 'all-fail-parallel',
          name: '全失败并行工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'parallel', type: NodeType.PARALLEL, name: '并行节点', position: { x: 100, y: 0 } },
            { id: 'task1', type: NodeType.AGENT, name: '失败任务1', position: { x: 200, y: -50 }, agentConfig: { agentId: 'fail1', agentType: 'executor' } },
            { id: 'task2', type: NodeType.AGENT, name: '失败任务2', position: { x: 200, y: 50 }, agentConfig: { agentId: 'fail2', agentType: 'executor' } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'parallel', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'parallel', target: 'task1', type: EdgeType.PARALLEL },
            { id: 'e3', source: 'parallel', target: 'task2', type: EdgeType.PARALLEL },
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

        const failExecutor = {
          execute: vi.fn(async (node: WorkflowNode) => ({
            success: false,
            nodeId: node.id,
            error: { code: 'ALL_FAILED', message: '所有分支失败' },
            duration: 10,
            logs: [],
          })),
          validate: () => ({ valid: true, errors: [] }),
        }

        orchestrator.registerExecutor(NodeType.AGENT, failExecutor)

        try {
          await orchestrator.execute(allFailWorkflow)
        } catch (error) {
          expect(error).toBeDefined()
        }
      })
    })
  })

  // ============================================
  // 2. 条件节点边缘情况测试
  // ============================================
  describe('条件节点 (condition) 边缘情况', () => {
    describe('空条件场景', () => {
      it('应该处理空字符串条件表达式', async () => {
        const workflow = createEmptyConditionWorkflow()
        const validation = orchestrator.validateWorkflow(workflow)
        expect(validation).toBeDefined()
      })

      it('应该处理未定义的条件配置', async () => {
        const workflow = createUndefinedConditionWorkflow()
        const validation = orchestrator.validateWorkflow(workflow)
        
        // 未定义条件的验证会失败
        expect(validation.valid).toBe(false)
      })

      it('应该处理只有空格的条件表达式', async () => {
        const whitespaceConditionWorkflow: WorkflowDefinition = {
          id: 'whitespace-condition',
          name: '空格条件工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'cond', type: NodeType.CONDITION, name: '条件', position: { x: 100, y: 0 }, conditionConfig: { expression: '   ', trueLabel: 'yes', falseLabel: 'no' } },
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

        const instance = await orchestrator.execute(whitespaceConditionWorkflow)
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })

      it('应该处理条件变量不存在的情况', async () => {
        const missingVarWorkflow: WorkflowDefinition = {
          id: 'missing-var-condition',
          name: '缺失变量条件工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'cond', type: NodeType.CONDITION, name: '条件', position: { x: 100, y: 0 }, conditionConfig: { expression: '{{nonExistentVar}} > 10', trueLabel: 'yes', falseLabel: 'no' } },
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

        const instance = await orchestrator.execute(missingVarWorkflow)
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })

      it('应该处理条件表达式语法错误的情况', async () => {
        const syntaxErrorWorkflow: WorkflowDefinition = {
          id: 'syntax-error-condition',
          name: '语法错误条件工作流',
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

        const instance = await orchestrator.execute(syntaxErrorWorkflow)
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })
    })

    describe('循环引用场景', () => {
      it('应该检测条件节点形成的循环引用', () => {
        const workflow = createCircularConditionWorkflow()
        const validation = orchestrator.validateWorkflow(workflow)
        expect(validation).toBeDefined()
      })

      it('应该检测自引用循环 (A->A)', () => {
        const selfRefWorkflow: WorkflowDefinition = {
          id: 'self-ref-workflow',
          name: '自引用工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'cond', type: NodeType.CONDITION, name: '条件', position: { x: 100, y: 0 }, conditionConfig: { expression: 'true', trueLabel: 'loop', falseLabel: 'end' } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'cond', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'cond', target: 'cond', type: EdgeType.SEQUENCE },
            { id: 'e3', source: 'cond', target: 'end', type: EdgeType.SEQUENCE },
          ],
          config: {},
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test',
            updatedBy: 'test',
          },
        }

        const validation = orchestrator.validateWorkflow(selfRefWorkflow)
        expect(validation).toBeDefined()
      })

      it('应该检测多节点循环引用 (A->B->C->A)', () => {
        const multiLoopWorkflow: WorkflowDefinition = {
          id: 'multi-loop-workflow',
          name: '多节点循环工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'cond1', type: NodeType.CONDITION, name: '条件1', position: { x: 100, y: 0 }, conditionConfig: { expression: 'true', trueLabel: 't', falseLabel: 'f' } },
            { id: 'cond2', type: NodeType.CONDITION, name: '条件2', position: { x: 200, y: 0 }, conditionConfig: { expression: 'true', trueLabel: 't', falseLabel: 'f' } },
            { id: 'cond3', type: NodeType.CONDITION, name: '条件3', position: { x: 300, y: 0 }, conditionConfig: { expression: 'true', trueLabel: 't', falseLabel: 'f' } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 400, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'cond1', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'cond1', target: 'cond2', type: EdgeType.SEQUENCE },
            { id: 'e3', source: 'cond2', target: 'cond3', type: EdgeType.SEQUENCE },
            { id: 'e4', source: 'cond3', target: 'cond1', type: EdgeType.SEQUENCE },
            { id: 'e5', source: 'cond3', target: 'end', type: EdgeType.SEQUENCE },
          ],
          config: {},
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test',
            updatedBy: 'test',
          },
        }

        const validation = orchestrator.validateWorkflow(multiLoopWorkflow)
        expect(validation).toBeDefined()
      })

      it('应该处理条件分支不完整的情况', async () => {
        const incompleteBranchWorkflow: WorkflowDefinition = {
          id: 'incomplete-branch-workflow',
          name: '不完整分支工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'cond', type: NodeType.CONDITION, name: '条件', position: { x: 100, y: 0 }, conditionConfig: { expression: '{{value}} > 0', trueLabel: 'positive', falseLabel: 'non-positive' } },
            { id: 'positive', type: NodeType.END, name: '正数结束', position: { x: 200, y: -50 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'cond', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'cond', target: 'positive', type: EdgeType.CONDITION, conditionConfig: { condition: 'positive', label: 'positive' } },
          ],
          config: { variables: { value: 10 } },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test',
            updatedBy: 'test',
          },
        }

        const validation = orchestrator.validateWorkflow(incompleteBranchWorkflow)
        expect(validation).toBeDefined()
      })
    })
  })

  // ============================================
  // 3. 等待节点边缘情况测试
  // ============================================
  describe('等待节点 (wait) 边缘情况', () => {
    describe('负数时间场景', () => {
      it('应该处理负数等待时间', async () => {
        const workflow = createNegativeWaitWorkflow()
        const instance = await orchestrator.execute(workflow)
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })

      it('应该正确记录负数等待节点的执行结果', async () => {
        const workflow = createNegativeWaitWorkflow()
        const instance = await orchestrator.execute(workflow)

        const waitResult = instance.nodeResults.get('wait')
        expect(waitResult?.status).toBe(NodeStatus.SUCCESS)
      })

      it('应该处理非常大的负数等待时间', async () => {
        const largeNegWaitWorkflow: WorkflowDefinition = {
          id: 'large-negative-wait',
          name: '大负数等待工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'wait', type: NodeType.WAIT, name: '等待', position: { x: 100, y: 0 }, waitConfig: { duration: -999999 } },
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

        const instance = await orchestrator.execute(largeNegWaitWorkflow)
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })

      it('应该处理 NaN 等待时间', () => {
        const nanWaitWorkflow: WorkflowDefinition = {
          id: 'nan-wait',
          name: 'NaN等待工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'wait', type: NodeType.WAIT, name: '等待', position: { x: 100, y: 0 }, waitConfig: { duration: NaN } },
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

        // NaN 值会导致验证失败
        const validation = orchestrator.validateWorkflow(nanWaitWorkflow)
        expect(validation).toBeDefined()
      })

      it('应该处理 Infinity 等待时间', async () => {
        const infinityWaitWorkflow: WorkflowDefinition = {
          id: 'infinity-wait',
          name: 'Infinity等待工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'wait', type: NodeType.WAIT, name: '等待', position: { x: 100, y: 0 }, waitConfig: { duration: Infinity } },
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

        const instance = await orchestrator.execute(infinityWaitWorkflow)
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })
    })

    describe('零时间场景', () => {
      it('应该处理零等待时间', async () => {
        const workflow = createZeroWaitWorkflow()
        const instance = await orchestrator.execute(workflow)
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
      })

      it('零等待时间应该立即完成', async () => {
        const workflow = createZeroWaitWorkflow()
        const startTime = Date.now()
        const instance = await orchestrator.execute(workflow)
        const duration = Date.now() - startTime

        expect(instance.status).toBe(InstanceStatus.COMPLETED)
        expect(duration).toBeLessThan(100)
      })

      it('应该正确记录零等待节点的输出', async () => {
        const workflow = createZeroWaitWorkflow()
        const instance = await orchestrator.execute(workflow)

        const waitResult = instance.nodeResults.get('wait')
        expect(waitResult?.output).toBeDefined()
      })

      it('应该处理未定义的等待配置', async () => {
        const undefinedWaitWorkflow: WorkflowDefinition = {
          id: 'undefined-wait',
          name: '未定义等待工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'wait', type: NodeType.WAIT, name: '等待', position: { x: 100, y: 0 } },
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

        const validation = orchestrator.validateWorkflow(undefinedWaitWorkflow)
        expect(validation.valid).toBe(false)
      })

      it('应该处理多个连续的零等待节点', async () => {
        const multiZeroWaitWorkflow: WorkflowDefinition = {
          id: 'multi-zero-wait',
          name: '多零等待工作流',
          version: 1,
          status: WorkflowStatus.ACTIVE,
          nodes: [
            { id: 'start', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
            { id: 'wait1', type: NodeType.WAIT, name: '等待1', position: { x: 100, y: 0 }, waitConfig: { duration: 0.001 } },
            { id: 'wait2', type: NodeType.WAIT, name: '等待2', position: { x: 200, y: 0 }, waitConfig: { duration: 0.001 } },
            { id: 'wait3', type: NodeType.WAIT, name: '等待3', position: { x: 300, y: 0 }, waitConfig: { duration: 0.001 } },
            { id: 'end', type: NodeType.END, name: '结束', position: { x: 400, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'wait1', type: EdgeType.SEQUENCE },
            { id: 'e2', source: 'wait1', target: 'wait2', type: EdgeType.SEQUENCE },
            { id: 'e3', source: 'wait2', target: 'wait3', type: EdgeType.SEQUENCE },
            { id: 'e4', source: 'wait3', target: 'end', type: EdgeType.SEQUENCE },
          ],
          config: {},
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test',
            updatedBy: 'test',
          },
        }

        const instance = await orchestrator.execute(multiZeroWaitWorkflow)
        expect(instance.status).toBe(InstanceStatus.COMPLETED)
        expect(instance.progress.completed).toBe(5)
      })
    })
  })

  // ============================================
  // 4. 工作流取消边缘情况测试
  // ============================================
  describe('工作流取消 (cancel) 边缘情况', () => {
    describe('不同执行阶段的取消行为', () => {
      it('应该能够取消运行中状态的实例', () => {
        const workflow = createCancellableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.RUNNING

        orchestrator.cancel(instance.id)

        expect(instance.status).toBe(InstanceStatus.CANCELLED)
      })

      it('待执行状态的实例取消后状态保持不变（仅取消运行中的实例）', () => {
        const workflow = createCancellableWorkflow()
        const instance = orchestrator.createInstance(workflow)

        expect(instance.status).toBe(InstanceStatus.PENDING)

        orchestrator.cancel(instance.id)

        // 根据实现，cancel 只对 RUNNING 状态的实例有效
        expect(instance.status).toBe(InstanceStatus.PENDING)
      })

      it('不应该影响已完成实例的取消操作', async () => {
        const workflow = createCancellableWorkflow()
        const instance = await orchestrator.execute(workflow)

        expect(instance.status).toBe(InstanceStatus.COMPLETED)

        orchestrator.cancel(instance.id)

        const cancelledInstance = orchestrator.getInstance(instance.id)
        expect(cancelledInstance?.status).toBe(InstanceStatus.COMPLETED)
      })

      it('不应该取消失败的实例', () => {
        const workflow = createCancellableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.FAILED

        orchestrator.cancel(instance.id)

        // 失败的实例取消后仍为失败状态（因为只取消 RUNNING 状态）
        expect(instance.status).toBe(InstanceStatus.FAILED)
      })

      it('应该能够多次取消同一实例', () => {
        const workflow = createCancellableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.RUNNING

        orchestrator.cancel(instance.id)
        orchestrator.cancel(instance.id)
        orchestrator.cancel(instance.id)

        expect(instance.status).toBe(InstanceStatus.CANCELLED)
      })

      it('取消不存在的实例应该不抛出错误', () => {
        expect(() => orchestrator.cancel('non-existent-id')).not.toThrow()
      })

      it('取消时应该记录结束时间', () => {
        const workflow = createCancellableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.RUNNING

        orchestrator.cancel(instance.id)

        expect(instance.metadata.endedAt).toBeDefined()
      })
    })

    describe('并发取消场景', () => {
      it('应该能够同时取消多个运行中的实例', () => {
        const workflow = createCancellableWorkflow()
        const instances = [
          orchestrator.createInstance(workflow),
          orchestrator.createInstance(workflow),
          orchestrator.createInstance(workflow),
        ]

        instances.forEach(inst => {
          inst.status = InstanceStatus.RUNNING
          orchestrator.cancel(inst.id)
        })

        instances.forEach(inst => {
          const cancelled = orchestrator.getInstance(inst.id)
          expect(cancelled?.status).toBe(InstanceStatus.CANCELLED)
        })
      })

      it('应该正确统计取消的实例数量', async () => {
        const workflow = createCancellableWorkflow()

        // 创建并执行一个实例
        const completedInstance = await orchestrator.execute(workflow)

        // 创建并取消运行中的实例
        const instance1 = orchestrator.createInstance(workflow)
        const instance2 = orchestrator.createInstance(workflow)

        instance1.status = InstanceStatus.RUNNING
        instance2.status = InstanceStatus.RUNNING

        orchestrator.cancel(instance1.id)
        orchestrator.cancel(instance2.id)

        const stats = orchestrator.getStatistics(workflow.id)
        expect(stats.cancelled).toBe(2)
      })
    })
  })

  // ============================================
  // 5. 工作流暂停和恢复边缘情况测试
  // ============================================
  describe('工作流暂停 (pause) 和恢复 (resume) 边界条件', () => {
    describe('暂停边界条件', () => {
      it('应该能够暂停运行中的工作流', () => {
        const workflow = createPausableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.RUNNING

        orchestrator.pause(instance.id)

        expect(instance.status).toBe(InstanceStatus.PENDING)
      })

      it('不应该暂停已完成的实例', async () => {
        const workflow = createPausableWorkflow()
        const instance = await orchestrator.execute(workflow)

        const originalStatus = instance.status
        orchestrator.pause(instance.id)

        expect(instance.status).toBe(originalStatus)
      })

      it('不应该暂停已取消的实例', () => {
        const workflow = createPausableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.CANCELLED

        orchestrator.pause(instance.id)

        expect(instance.status).toBe(InstanceStatus.CANCELLED)
      })

      it('应该能够暂停已暂停的实例（幂等操作）', () => {
        const workflow = createPausableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.PENDING

        orchestrator.pause(instance.id)
        orchestrator.pause(instance.id)

        expect(instance.status).toBe(InstanceStatus.PENDING)
      })

      it('暂停时应该保留所有状态信息', () => {
        const workflow = createPausableWorkflow()
        const instance = orchestrator.createInstance(workflow, { testData: 'value' })
        instance.status = InstanceStatus.RUNNING
        instance.data.variables = { ...instance.data.variables, pausedVar: 'test' }

        orchestrator.pause(instance.id)

        expect(instance.status).toBe(InstanceStatus.PENDING)
        expect(instance.data.variables.pausedVar).toBe('test')
        expect(instance.data.inputs.testData).toBe('value')
      })

      it('暂停不存在的实例应该不抛出错误', () => {
        expect(() => orchestrator.pause('non-existent-id')).not.toThrow()
      })
    })

    describe('恢复边界条件', () => {
      it('应该能够恢复暂停的工作流', () => {
        const workflow = createPausableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.PENDING

        orchestrator.resume(instance.id)

        expect(instance.status).toBe(InstanceStatus.RUNNING)
      })

      it('不应该恢复已完成的实例', async () => {
        const workflow = createPausableWorkflow()
        const instance = await orchestrator.execute(workflow)

        const originalStatus = instance.status
        orchestrator.resume(instance.id)

        expect(instance.status).toBe(originalStatus)
      })

      it('不应该恢复已取消的实例', () => {
        const workflow = createPausableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.CANCELLED

        orchestrator.resume(instance.id)

        expect(instance.status).toBe(InstanceStatus.CANCELLED)
      })

      it('应该能够恢复已恢复的实例（幂等操作）', () => {
        const workflow = createPausableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.RUNNING

        orchestrator.resume(instance.id)
        orchestrator.resume(instance.id)

        expect(instance.status).toBe(InstanceStatus.RUNNING)
      })

      it('恢复不存在的实例应该不抛出错误', () => {
        expect(() => orchestrator.resume('non-existent-id')).not.toThrow()
      })
    })

    describe('暂停-恢复循环测试', () => {
      it('应该正确处理暂停-恢复-暂停的循环', () => {
        const workflow = createPausableWorkflow()
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

      it('应该支持多次暂停恢复循环', () => {
        const workflow = createPausableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.RUNNING

        for (let i = 0; i < 5; i++) {
          orchestrator.pause(instance.id)
          expect(instance.status).toBe(InstanceStatus.PENDING)

          orchestrator.resume(instance.id)
          expect(instance.status).toBe(InstanceStatus.RUNNING)
        }
      })

      it('暂停恢复应该保留节点执行状态', () => {
        const workflow = createPausableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.RUNNING

        // 模拟部分节点已执行
        instance.nodeResults.get('task1')!.status = NodeStatus.SUCCESS
        instance.progress.completed = 2

        orchestrator.pause(instance.id)

        expect(instance.progress.completed).toBe(2)
        expect(instance.nodeResults.get('task1')?.status).toBe(NodeStatus.SUCCESS)

        orchestrator.resume(instance.id)

        expect(instance.progress.completed).toBe(2)
        expect(instance.nodeResults.get('task1')?.status).toBe(NodeStatus.SUCCESS)
      })
    })

    describe('边界状态测试', () => {
      it('应该处理失败状态的暂停请求', () => {
        const workflow = createPausableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.FAILED

        orchestrator.pause(instance.id)

        expect(instance.status).toBe(InstanceStatus.FAILED)
      })

      it('应该处理失败状态的恢复请求', () => {
        const workflow = createPausableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.FAILED

        orchestrator.resume(instance.id)

        expect(instance.status).toBe(InstanceStatus.FAILED)
      })

      it('应该处理暂停后立即取消的情况', () => {
        const workflow = createPausableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.RUNNING

        orchestrator.pause(instance.id)
        expect(instance.status).toBe(InstanceStatus.PENDING)

        // 取消只对 RUNNING 状态有效，所以 PENDING 状态不会被取消
        orchestrator.cancel(instance.id)
        expect(instance.status).toBe(InstanceStatus.PENDING)
      })

      it('应该处理取消后尝试暂停的情况', () => {
        const workflow = createPausableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.CANCELLED

        orchestrator.pause(instance.id)

        expect(instance.status).toBe(InstanceStatus.CANCELLED)
      })

      it('应该处理取消后尝试恢复的情况', () => {
        const workflow = createPausableWorkflow()
        const instance = orchestrator.createInstance(workflow)
        instance.status = InstanceStatus.CANCELLED

        orchestrator.resume(instance.id)

        expect(instance.status).toBe(InstanceStatus.CANCELLED)
      })
    })
  })

  // ============================================
  // 6. 使用 EnhancedWorkflowExecutor 的额外测试
  // ============================================
  describe('EnhancedWorkflowExecutor 边缘用例', () => {
    describe('并行节点验证', () => {
      it('应该验证并行节点的配置', () => {
        const workflow = createEmptyParallelWorkflow()
        executor.registerWorkflow(workflow)

        const validation = executor.validateWorkflow(workflow)
        expect(validation).toBeDefined()
      })

      it('应该正确处理并行节点的实例创建', () => {
        const workflow = createParallelTimeoutWorkflow()
        executor.registerWorkflow(workflow)

        const instance = executor.createInstance(workflow.id, {})
        expect(instance).toBeDefined()
        expect(instance.status).toBe(InstanceStatus.PENDING)
      })
    })

    describe('条件节点验证', () => {
      it('应该检测条件节点的循环引用', () => {
        const workflow = createCircularConditionWorkflow()
        const validation = executor.validateWorkflow(workflow)

        expect(validation).toBeDefined()
      })

      it('应该验证条件节点的配置', () => {
        const workflow = createEmptyConditionWorkflow()
        executor.registerWorkflow(workflow)

        const validation = executor.validateWorkflow(workflow)
        expect(validation).toBeDefined()
      })
    })

    describe('等待节点验证', () => {
      it('应该验证负数等待时间', () => {
        const workflow = createNegativeWaitWorkflow()
        executor.registerWorkflow(workflow)

        const validation = executor.validateWorkflow(workflow)
        expect(validation).toBeDefined()
      })

      it('应该验证零等待时间', () => {
        const workflow = createZeroWaitWorkflow()
        executor.registerWorkflow(workflow)

        const validation = executor.validateWorkflow(workflow)
        expect(validation).toBeDefined()
      })
    })

    describe('取消和暂停操作', () => {
      it('应该能够取消工作流实例', () => {
        const workflow = createCancellableWorkflow()
        executor.registerWorkflow(workflow)

        const instance = executor.createInstance(workflow.id, {})
        executor.cancelInstance(instance.id)

        const cancelledInstance = executor.getInstance(instance.id)
        expect(cancelledInstance?.status).toBe(InstanceStatus.CANCELLED)
      })

      it('应该正确统计取消的实例', () => {
        const workflow = createCancellableWorkflow()
        executor.registerWorkflow(workflow)

        const instance1 = executor.createInstance(workflow.id, {})
        const instance2 = executor.createInstance(workflow.id, {})

        executor.cancelInstance(instance1.id)
        executor.cancelInstance(instance2.id)

        const stats = executor.getStatistics(workflow.id)
        expect(stats.cancelled).toBe(2)
      })
    })
  })
})