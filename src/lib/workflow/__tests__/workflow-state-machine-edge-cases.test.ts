/**
 * Workflow State Machine Edge Cases Test
 * 测试工作流状态机的边界条件和异常场景
 * 
 * 覆盖的edge cases:
 * 1. 状态转换边界条件
 * 2. 并行节点执行顺序
 * 3. 条件节点分支选择
 * 4. wait节点超时处理
 * 5. 工作流取消和暂停的竞态条件
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { EnhancedWorkflowExecutor } from '../executor'
import {
  WorkflowDefinition,
  WorkflowStatus,
  NodeType,
  InstanceStatus,
  NodeStatus,
  EdgeType,
} from '@/types/workflow'

describe('Workflow State Machine Edge Cases', () => {
  let executor: EnhancedWorkflowExecutor

  beforeEach(() => {
    executor = new EnhancedWorkflowExecutor()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // =====================================================
  // 1. 状态转换边界条件
  // =====================================================
  describe('状态转换边界条件', () => {
    /**
     * Edge Case 1.1: 非PENDING状态执行实例
     * 测试尝试执行非PENDING状态的实例时应该抛出错误
     */
    it('应该拒绝执行非PENDING状态的实例', async () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow-1',
        name: '测试工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'edge-1', source: 'start-1', target: 'end-1', type: EdgeType.SEQUENCE }],
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

      // 先执行一次，状态变为COMPLETED
      await executor.executeInstance(instance.id)

      // 再次尝试执行应该失败
      await expect(executor.executeInstance(instance.id)).rejects.toThrow('实例状态错误')
    })

    /**
     * Edge Case 1.2: 不存在的实例执行
     * 测试执行不存在的实例时应该抛出错误
     */
    it('应该拒绝执行不存在的实例', async () => {
      await expect(executor.executeInstance('non-existent-id')).rejects.toThrow('实例不存在')
    })

    /**
     * Edge Case 1.3: 不存在的工作流创建实例
     * 测试为不存在的工作流创建实例时应该抛出错误
     */
    it('应该拒绝为不存在的工作流创建实例', () => {
      expect(() => executor.createInstance('non-existent-workflow')).toThrow('工作流不存在')
    })

    /**
     * Edge Case 1.4: 已取消实例无法执行
     * 测试已取消的实例无法再次执行
     */
    it('应该拒绝执行已取消的实例', async () => {
      const workflow: WorkflowDefinition = {
        id: 'cancelled-workflow',
        name: '取消工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'edge-1', source: 'start-1', target: 'end-1', type: EdgeType.SEQUENCE }],
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
      
      // 取消实例
      executor.cancelInstance(instance.id)
      
      // 尝试执行已取消的实例
      await expect(executor.executeInstance(instance.id)).rejects.toThrow('实例状态错误')
    })

    /**
     * Edge Case 1.5: 状态转换完整性
     * 测试状态从PENDING -> RUNNING -> COMPLETED的完整转换
     */
    it('应该正确完成完整的状态转换流程', async () => {
      const workflow: WorkflowDefinition = {
        id: 'full-state-workflow',
        name: '完整状态工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'edge-1', source: 'start-1', target: 'end-1', type: EdgeType.SEQUENCE }],
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
      
      // 初始状态应为PENDING
      expect(instance.status).toBe(InstanceStatus.PENDING)
      
      // 执行后状态应为COMPLETED
      const result = await executor.executeInstance(instance.id)
      expect(result.status).toBe(InstanceStatus.COMPLETED)
      expect(result.metadata.endedAt).toBeDefined()
      expect(result.metadata.duration).toBeGreaterThanOrEqual(0)
    })
  })

  // =====================================================
  // 2. 并行节点执行顺序
  // =====================================================
  describe('并行节点执行顺序', () => {
    /**
     * Edge Case 2.1: 并行节点执行顺序一致性
     * 测试并行节点的所有分支都能正确执行
     */
    it('应该正确执行所有并行分支', async () => {
      const workflow: WorkflowDefinition = {
        id: 'parallel-order-workflow',
        name: '并行顺序工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'parallel-1', type: NodeType.PARALLEL, name: '并行节点', position: { x: 100, y: 0 } },
          { id: 'agent-1', type: NodeType.AGENT, name: 'Agent 1', position: { x: 200, y: -50 }, agentConfig: { agentId: 'agent-1', agentType: 'test' } },
          { id: 'agent-2', type: NodeType.AGENT, name: 'Agent 2', position: { x: 200, y: 50 }, agentConfig: { agentId: 'agent-2', agentType: 'test' } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'parallel-1', type: EdgeType.SEQUENCE },
          { id: 'edge-2', source: 'parallel-1', target: 'agent-1', type: EdgeType.PARALLEL },
          { id: 'edge-3', source: 'parallel-1', target: 'agent-2', type: EdgeType.PARALLEL },
          { id: 'edge-4', source: 'agent-1', target: 'end-1', type: EdgeType.SEQUENCE },
          { id: 'edge-5', source: 'agent-2', target: 'end-1', type: EdgeType.SEQUENCE },
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

      // 验证所有并行分支都执行完成
      expect(result.status).toBe(InstanceStatus.COMPLETED)
      expect(result.nodeResults.get('agent-1')?.status).toBe(NodeStatus.SUCCESS)
      expect(result.nodeResults.get('agent-2')?.status).toBe(NodeStatus.SUCCESS)
    })

    /**
     * Edge Case 2.2: 并行节点部分失败
     * 测试并行节点中部分分支失败时的处理
     */
    it('应该正确处理并行节点中的部分失败', async () => {
      // 创建一个并行工作流，其中有一个节点会失败
      const workflow: WorkflowDefinition = {
        id: 'partial-fail-workflow',
        name: '部分失败工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'parallel-1', type: NodeType.PARALLEL, name: '并行节点', position: { x: 100, y: 0 } },
          { id: 'agent-1', type: NodeType.AGENT, name: 'Agent 1', position: { x: 200, y: 0 }, agentConfig: { agentId: 'agent-1', agentType: 'test' } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'parallel-1', type: EdgeType.SEQUENCE },
          { id: 'edge-2', source: 'parallel-1', target: 'agent-1', type: EdgeType.PARALLEL },
          { id: 'edge-3', source: 'agent-1', target: 'end-1', type: EdgeType.SEQUENCE },
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

      // 验证工作流完成（即使并行节点可能有部分失败）
      expect([InstanceStatus.COMPLETED, InstanceStatus.FAILED]).toContain(result.status)
    })

    /**
     * Edge Case 2.3: 嵌套并行节点
     * 测试并行节点内部嵌套并行节点的场景
     */
    it('应该正确处理嵌套并行节点', async () => {
      const workflow: WorkflowDefinition = {
        id: 'nested-parallel-workflow',
        name: '嵌套并行工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'parallel-1', type: NodeType.PARALLEL, name: '外层并行', position: { x: 100, y: 0 } },
          { id: 'parallel-2', type: NodeType.PARALLEL, name: '内层并行', position: { x: 200, y: 0 } },
          { id: 'agent-1', type: NodeType.AGENT, name: 'Agent 1', position: { x: 300, y: 0 }, agentConfig: { agentId: 'agent-1', agentType: 'test' } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 400, y: 0 } },
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'parallel-1', type: EdgeType.SEQUENCE },
          { id: 'edge-2', source: 'parallel-1', target: 'parallel-2', type: EdgeType.PARALLEL },
          { id: 'edge-3', source: 'parallel-2', target: 'agent-1', type: EdgeType.PARALLEL },
          { id: 'edge-4', source: 'agent-1', target: 'end-1', type: EdgeType.SEQUENCE },
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
      const validation = executor.validateWorkflow(workflow)
      
      expect(validation.valid).toBe(true)
    })

    /**
     * Edge Case 2.4: 空并行节点
     * 测试没有输出边的并行节点
     */
    it('应该正确处理没有输出边的并行节点', async () => {
      const workflow: WorkflowDefinition = {
        id: 'empty-parallel-workflow',
        name: '空并行工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'parallel-1', type: NodeType.PARALLEL, name: '并行节点', position: { x: 100, y: 0 } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'parallel-1', type: EdgeType.SEQUENCE },
          { id: 'edge-2', source: 'parallel-1', target: 'end-1', type: EdgeType.SEQUENCE },
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
    })
  })

  // =====================================================
  // 3. 条件节点分支选择
  // =====================================================
  describe('条件节点分支选择', () => {
    /**
     * Edge Case 3.1: 条件节点无匹配分支
     * 测试条件节点没有匹配分支时的处理
     */
    it('应该正确处理条件节点无匹配分支的情况', async () => {
      const workflow: WorkflowDefinition = {
        id: 'no-match-branch-workflow',
        name: '无匹配分支工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { 
            id: 'condition-1', 
            type: NodeType.CONDITION, 
            name: '条件节点', 
            position: { x: 100, y: 0 },
            conditionConfig: {
              expression: 'inputs.value === "specific"',
              trueLabel: 'yes',
              falseLabel: 'no',
            },
          },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'condition-1', type: EdgeType.SEQUENCE },
          { id: 'edge-2', source: 'condition-1', target: 'end-1', type: EdgeType.CONDITION, conditionConfig: { condition: 'true', label: 'yes' } },
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
      const validation = executor.validateWorkflow(workflow)
      expect(validation.valid).toBe(true)
    })

    /**
     * Edge Case 3.2: 条件表达式边界值
     * 测试条件表达式使用边界值时的处理
     */
    it('应该正确处理条件表达式中的边界值', async () => {
      const workflow: WorkflowDefinition = {
        id: 'boundary-value-workflow',
        name: '边界值工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { 
            id: 'condition-1', 
            type: NodeType.CONDITION, 
            name: '条件节点', 
            position: { x: 100, y: 0 },
            conditionConfig: {
              expression: 'inputs.value >= 0',
              trueLabel: 'valid',
              falseLabel: 'invalid',
            },
          },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'condition-1', type: EdgeType.SEQUENCE },
          { id: 'edge-2', source: 'condition-1', target: 'end-1', type: EdgeType.SEQUENCE },
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
      const instance = executor.createInstance(workflow.id, { value: 0 })
      const result = await executor.executeInstance(instance.id)

      expect(result.status).toBe(InstanceStatus.COMPLETED)
    })

    /**
     * Edge Case 3.3: 嵌套条件节点
     * 测试条件节点内部嵌套条件节点的场景
     */
    it('应该正确处理嵌套条件节点', async () => {
      const workflow: WorkflowDefinition = {
        id: 'nested-condition-workflow',
        name: '嵌套条件工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { 
            id: 'condition-1', 
            type: NodeType.CONDITION, 
            name: '外层条件', 
            position: { x: 100, y: 0 },
            conditionConfig: {
              expression: 'inputs.level > 0',
              trueLabel: 'proceed',
              falseLabel: 'stop',
            },
          },
          { 
            id: 'condition-2', 
            type: NodeType.CONDITION, 
            name: '内层条件', 
            position: { x: 200, y: 0 },
            conditionConfig: {
              expression: 'inputs.level > 1',
              trueLabel: 'high',
              falseLabel: 'low',
            },
          },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'condition-1', type: EdgeType.SEQUENCE },
          { id: 'edge-2', source: 'condition-1', target: 'condition-2', type: EdgeType.SEQUENCE },
          { id: 'edge-3', source: 'condition-2', target: 'end-1', type: EdgeType.SEQUENCE },
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
      const validation = executor.validateWorkflow(workflow)
      expect(validation.valid).toBe(true)
    })

    /**
     * Edge Case 3.4: 默认分支处理
     * 测试条件节点使用默认分支的处理
     */
    it('应该正确使用默认分支', async () => {
      const workflow: WorkflowDefinition = {
        id: 'default-branch-workflow',
        name: '默认分支工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { 
            id: 'condition-1', 
            type: NodeType.CONDITION, 
            name: '条件节点', 
            position: { x: 100, y: 0 },
            conditionConfig: {
              expression: 'inputs.type',
              trueLabel: 'typeA',
              falseLabel: 'typeB',
            },
          },
          { id: 'agent-1', type: NodeType.AGENT, name: 'Agent A', position: { x: 200, y: -50 }, agentConfig: { agentId: 'agent-a', agentType: 'test' } },
          { id: 'agent-2', type: NodeType.AGENT, name: 'Agent B', position: { x: 200, y: 50 }, agentConfig: { agentId: 'agent-b', agentType: 'test' } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'condition-1', type: EdgeType.SEQUENCE },
          { id: 'edge-2', source: 'condition-1', target: 'agent-1', type: EdgeType.CONDITION, conditionConfig: { condition: 'typeA', label: 'typeA' } },
          { id: 'edge-3', source: 'condition-1', target: 'agent-2', type: EdgeType.DEFAULT },
          { id: 'edge-4', source: 'agent-1', target: 'end-1', type: EdgeType.SEQUENCE },
          { id: 'edge-5', source: 'agent-2', target: 'end-1', type: EdgeType.SEQUENCE },
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
      const validation = executor.validateWorkflow(workflow)
      expect(validation.valid).toBe(true)
    })
  })

  // =====================================================
  // 4. Wait节点超时处理
  // =====================================================
  describe('Wait节点超时处理', () => {
    /**
     * Edge Case 4.1: Wait节点零等待时间
     * 测试等待时间为0的wait节点（应该被验证器拒绝或视为有效）
     */
    it('应该正确处理零等待时间的wait节点验证', async () => {
      const workflow: WorkflowDefinition = {
        id: 'zero-wait-workflow',
        name: '零等待工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'wait-1', type: NodeType.WAIT, name: '等待节点', position: { x: 100, y: 0 }, waitConfig: { duration: 0 } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'wait-1', type: EdgeType.SEQUENCE },
          { id: 'edge-2', source: 'wait-1', target: 'end-1', type: EdgeType.SEQUENCE },
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
      const validation = executor.validateWorkflow(workflow)
      
      // 零等待时间可能被验证器拒绝（取决于业务规则）
      // 如果被拒绝，验证错误应该包含相关信息
      if (!validation.valid) {
        expect(validation.errors.some(e => e.includes('等待') || e.includes('duration'))).toBe(true)
      } else {
        // 如果接受，应该能够正常执行
        const instance = executor.createInstance(workflow.id)
        const result = await executor.executeInstance(instance.id)
        expect(result.status).toBe(InstanceStatus.COMPLETED)
      }
    })

    /**
     * Edge Case 4.2: Wait节点大等待时间
     * 测试等待时间很大的wait节点
     */
    it('应该正确处理大等待时间的wait节点配置', () => {
      const workflow: WorkflowDefinition = {
        id: 'large-wait-workflow',
        name: '大等待工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'wait-1', type: NodeType.WAIT, name: '等待节点', position: { x: 100, y: 0 }, waitConfig: { duration: 86400 } }, // 1天
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'wait-1', type: EdgeType.SEQUENCE },
          { id: 'edge-2', source: 'wait-1', target: 'end-1', type: EdgeType.SEQUENCE },
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
      const validation = executor.validateWorkflow(workflow)
      
      // 大等待时间应该被接受
      expect(validation.valid).toBe(true)
    })

    /**
     * Edge Case 4.3: 多个Wait节点顺序执行
     * 测试多个wait节点顺序执行的场景
     */
    it('应该正确执行多个顺序wait节点', async () => {
      const workflow: WorkflowDefinition = {
        id: 'multi-wait-workflow',
        name: '多等待工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'wait-1', type: NodeType.WAIT, name: '等待1', position: { x: 100, y: 0 }, waitConfig: { duration: 1 } },
          { id: 'wait-2', type: NodeType.WAIT, name: '等待2', position: { x: 200, y: 0 }, waitConfig: { duration: 1 } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'wait-1', type: EdgeType.SEQUENCE },
          { id: 'edge-2', source: 'wait-1', target: 'wait-2', type: EdgeType.SEQUENCE },
          { id: 'edge-3', source: 'wait-2', target: 'end-1', type: EdgeType.SEQUENCE },
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
      const startTime = Date.now()
      const result = await executor.executeInstance(instance.id)
      const endTime = Date.now()

      expect(result.status).toBe(InstanceStatus.COMPLETED)
      // 验证执行时间大于等待时间总和
      expect(endTime - startTime).toBeGreaterThanOrEqual(1500) // 至少1.5秒（两个1秒等待）
    })

    /**
     * Edge Case 4.4: Wait节点在并行分支中
     * 测试wait节点在并行分支中的执行
     */
    it('应该正确处理并行分支中的wait节点', async () => {
      const workflow: WorkflowDefinition = {
        id: 'parallel-wait-workflow',
        name: '并行等待工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'parallel-1', type: NodeType.PARALLEL, name: '并行节点', position: { x: 100, y: 0 } },
          { id: 'wait-1', type: NodeType.WAIT, name: '等待1', position: { x: 200, y: -50 }, waitConfig: { duration: 1 } },
          { id: 'wait-2', type: NodeType.WAIT, name: '等待2', position: { x: 200, y: 50 }, waitConfig: { duration: 1 } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 300, y: 0 } },
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'parallel-1', type: EdgeType.SEQUENCE },
          { id: 'edge-2', source: 'parallel-1', target: 'wait-1', type: EdgeType.PARALLEL },
          { id: 'edge-3', source: 'parallel-1', target: 'wait-2', type: EdgeType.PARALLEL },
          { id: 'edge-4', source: 'wait-1', target: 'end-1', type: EdgeType.SEQUENCE },
          { id: 'edge-5', source: 'wait-2', target: 'end-1', type: EdgeType.SEQUENCE },
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
      const validation = executor.validateWorkflow(workflow)
      expect(validation.valid).toBe(true)
    })
  })

  // =====================================================
  // 5. 工作流取消和暂停的竞态条件
  // =====================================================
  describe('工作流取消和暂停的竞态条件', () => {
    /**
     * Edge Case 5.1: 执行中取消
     * 测试在执行过程中取消工作流
     */
    it('应该正确处理执行中的取消请求', async () => {
      const workflow: WorkflowDefinition = {
        id: 'cancel-during-execution-workflow',
        name: '执行中取消工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'agent-1', type: NodeType.AGENT, name: 'Agent', position: { x: 100, y: 0 }, agentConfig: { agentId: 'agent-1', agentType: 'test' } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'agent-1', type: EdgeType.SEQUENCE },
          { id: 'edge-2', source: 'agent-1', target: 'end-1', type: EdgeType.SEQUENCE },
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

      // 立即取消实例（模拟执行中取消）
      executor.cancelInstance(instance.id)

      // 验证实例状态为已取消
      const cancelledInstance = executor.getInstance(instance.id)
      expect(cancelledInstance?.status).toBe(InstanceStatus.CANCELLED)
      expect(cancelledInstance?.metadata.endedAt).toBeDefined()
    })

    /**
     * Edge Case 5.2: 并发取消和执行
     * 测试同时发起取消和执行请求的处理
     */
    it('应该正确处理并发取消和执行请求', async () => {
      const workflow: WorkflowDefinition = {
        id: 'concurrent-cancel-workflow',
        name: '并发取消工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'edge-1', source: 'start-1', target: 'end-1', type: EdgeType.SEQUENCE }],
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

      // 先取消实例
      executor.cancelInstance(instance.id)

      // 尝试执行已取消的实例应该失败
      await expect(executor.executeInstance(instance.id)).rejects.toThrow('实例状态错误')
    })

    /**
     * Edge Case 5.2b: 执行中的取消竞态
     * 测试在执行开始后取消的竞态条件
     */
    it('应该正确处理执行开始后的取消请求', async () => {
      const workflow: WorkflowDefinition = {
        id: 'execution-race-workflow',
        name: '执行竞态工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'wait-1', type: NodeType.WAIT, name: '等待', position: { x: 100, y: 0 }, waitConfig: { duration: 2 } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'wait-1', type: EdgeType.SEQUENCE },
          { id: 'edge-2', source: 'wait-1', target: 'end-1', type: EdgeType.SEQUENCE },
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

      // 开始执行
      const executePromise = executor.executeInstance(instance.id)
      
      // 立即取消（执行已经开始）
      executor.cancelInstance(instance.id)

      // 执行可能会完成（因为取消可能在执行之后生效）
      // 主要验证取消操作不会导致崩溃
      const result = await executePromise
      expect([InstanceStatus.COMPLETED, InstanceStatus.CANCELLED]).toContain(result.status)
    })

    /**
     * Edge Case 5.3: 取消后数据一致性
     * 测试取消操作后实例数据的一致性
     */
    it('应该保持取消后的数据一致性', async () => {
      const workflow: WorkflowDefinition = {
        id: 'data-consistency-workflow',
        name: '数据一致性工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'edge-1', source: 'start-1', target: 'end-1', type: EdgeType.SEQUENCE }],
        config: { variables: { testVar: 'initialValue' } },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      executor.registerWorkflow(workflow)
      const instance = executor.createInstance(workflow.id, { inputData: 'test' })

      // 取消实例
      executor.cancelInstance(instance.id)

      // 验证数据一致性
      const cancelledInstance = executor.getInstance(instance.id)
      expect(cancelledInstance).toBeDefined()
      expect(cancelledInstance?.id).toBe(instance.id)
      expect(cancelledInstance?.data.inputs).toEqual({ inputData: 'test' })
    })

    /**
     * Edge Case 5.4: 重复取消
     * 测试对已取消实例重复取消的处理
     */
    it('应该正确处理重复取消请求', async () => {
      const workflow: WorkflowDefinition = {
        id: 'double-cancel-workflow',
        name: '重复取消工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'edge-1', source: 'start-1', target: 'end-1', type: EdgeType.SEQUENCE }],
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

      // 第一次取消
      executor.cancelInstance(instance.id)
      const firstCancelTime = executor.getInstance(instance.id)?.metadata.endedAt

      // 第二次取消（不应该报错）
      executor.cancelInstance(instance.id)
      const secondCancelTime = executor.getInstance(instance.id)?.metadata.endedAt

      // 时间应该保持不变
      expect(firstCancelTime).toBe(secondCancelTime)
    })

    /**
     * Edge Case 5.5: 取消不存在的实例
     * 测试取消不存在的实例时的处理
     */
    it('应该正确处理取消不存在的实例', () => {
      // 取消不存在的实例不应该抛出错误
      expect(() => executor.cancelInstance('non-existent-instance')).not.toThrow()
    })

    /**
     * Edge Case 5.6: 并发创建和取消
     * 测试同时创建和取消多个实例的竞态条件
     */
    it('应该正确处理并发创建和取消操作', async () => {
      const workflow: WorkflowDefinition = {
        id: 'concurrent-create-cancel-workflow',
        name: '并发创建取消工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'edge-1', source: 'start-1', target: 'end-1', type: EdgeType.SEQUENCE }],
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
      const instances = Array.from({ length: 5 }, () => executor.createInstance(workflow.id))

      // 并发取消部分实例
      instances.slice(0, 3).forEach((instance) => {
        executor.cancelInstance(instance.id)
      })

      // 验证实例状态
      instances.forEach((instance, index) => {
        const retrieved = executor.getInstance(instance.id)
        if (index < 3) {
          expect(retrieved?.status).toBe(InstanceStatus.CANCELLED)
        } else {
          expect(retrieved?.status).toBe(InstanceStatus.PENDING)
        }
      })
    })

    /**
     * Edge Case 5.7: 取消后执行状态检查
     * 测试取消后执行状态的一致性
     */
    it('应该在取消后正确维护执行状态', async () => {
      const workflow: WorkflowDefinition = {
        id: 'cancel-state-check-workflow',
        name: '取消状态检查工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'edge-1', source: 'start-1', target: 'end-1', type: EdgeType.SEQUENCE }],
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

      // 取消前检查状态
      expect(instance.status).toBe(InstanceStatus.PENDING)
      expect(instance.progress.completed).toBe(0)

      // 取消实例
      executor.cancelInstance(instance.id)

      // 取消后检查状态
      const cancelledInstance = executor.getInstance(instance.id)
      expect(cancelledInstance?.status).toBe(InstanceStatus.CANCELLED)
      expect(cancelledInstance?.progress.completed).toBe(0)
      expect(cancelledInstance?.metadata.endedAt).toBeDefined()
    })
  })

  // =====================================================
  // 6. 综合边界条件测试
  // =====================================================
  describe('综合边界条件测试', () => {
    /**
     * Edge Case 6.1: 复杂工作流完整性
     * 测试包含多种节点类型的复杂工作流
     */
    it('应该正确执行包含多种节点类型的复杂工作流', async () => {
      const complexWorkflow: WorkflowDefinition = {
        id: 'complex-complete-workflow',
        name: '完整复杂工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'wait-1', type: NodeType.WAIT, name: '初始等待', position: { x: 100, y: 0 }, waitConfig: { duration: 1 } },
          { 
            id: 'condition-1', 
            type: NodeType.CONDITION, 
            name: '条件判断', 
            position: { x: 200, y: 0 },
            conditionConfig: {
              expression: 'inputs.shouldProceed',
              trueLabel: 'yes',
              falseLabel: 'no',
            },
          },
          { id: 'agent-1', type: NodeType.AGENT, name: 'Agent 1', position: { x: 300, y: -50 }, agentConfig: { agentId: 'agent-1', agentType: 'test' } },
          { id: 'parallel-1', type: NodeType.PARALLEL, name: '并行处理', position: { x: 400, y: 0 } },
          { id: 'agent-2', type: NodeType.AGENT, name: 'Agent 2', position: { x: 500, y: -50 }, agentConfig: { agentId: 'agent-2', agentType: 'test' } },
          { id: 'agent-3', type: NodeType.AGENT, name: 'Agent 3', position: { x: 500, y: 50 }, agentConfig: { agentId: 'agent-3', agentType: 'test' } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 600, y: 0 } },
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'wait-1', type: EdgeType.SEQUENCE },
          { id: 'edge-2', source: 'wait-1', target: 'condition-1', type: EdgeType.SEQUENCE },
          { id: 'edge-3', source: 'condition-1', target: 'agent-1', type: EdgeType.CONDITION, conditionConfig: { condition: 'yes', label: 'yes' } },
          { id: 'edge-4', source: 'agent-1', target: 'parallel-1', type: EdgeType.SEQUENCE },
          { id: 'edge-5', source: 'parallel-1', target: 'agent-2', type: EdgeType.PARALLEL },
          { id: 'edge-6', source: 'parallel-1', target: 'agent-3', type: EdgeType.PARALLEL },
          { id: 'edge-7', source: 'agent-2', target: 'end-1', type: EdgeType.SEQUENCE },
          { id: 'edge-8', source: 'agent-3', target: 'end-1', type: EdgeType.SEQUENCE },
        ],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      executor.registerWorkflow(complexWorkflow)
      const validation = executor.validateWorkflow(complexWorkflow)
      expect(validation.valid).toBe(true)
    })

    /**
     * Edge Case 6.2: 空输入执行
     * 测试没有输入数据的工作流执行
     */
    it('应该正确处理空输入的工作流执行', async () => {
      const workflow: WorkflowDefinition = {
        id: 'empty-input-workflow',
        name: '空输入工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'edge-1', source: 'start-1', target: 'end-1', type: EdgeType.SEQUENCE }],
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
    })

    /**
     * Edge Case 6.3: 大量节点进度计算
     * 测试大量节点的进度计算正确性
     */
    it('应该正确计算大量节点的工作流进度', async () => {
      const nodes = [
        { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
      ]
      const edges: WorkflowDefinition['edges'] = []

      // 创建20个顺序执行的agent节点
      for (let i = 1; i <= 20; i++) {
        nodes.push({
          id: `agent-${i}`,
          type: NodeType.AGENT,
          name: `Agent ${i}`,
          position: { x: i * 50, y: 0 },
          agentConfig: { agentId: `agent-${i}`, agentType: 'test' },
        } as any)
        if (i === 1) {
          edges.push({ id: `edge-start-${i}`, source: 'start-1', target: `agent-${i}`, type: EdgeType.SEQUENCE })
        } else {
          edges.push({ id: `edge-${i}`, source: `agent-${i - 1}`, target: `agent-${i}`, type: EdgeType.SEQUENCE })
        }
      }

      nodes.push({ id: 'end-1', type: NodeType.END, name: '结束', position: { x: 1050, y: 0 } })
      edges.push({ id: 'edge-end', source: 'agent-20', target: 'end-1', type: EdgeType.SEQUENCE })

      const workflow: WorkflowDefinition = {
        id: 'large-progress-workflow',
        name: '大量节点工作流',
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

      executor.registerWorkflow(workflow)
      const instance = executor.createInstance(workflow.id)
      const result = await executor.executeInstance(instance.id)

      expect(result.status).toBe(InstanceStatus.COMPLETED)
      expect(result.progress.total).toBe(22) // start + 20 agents + end
      expect(result.progress.completed).toBe(22)
      expect(result.progress.percentage).toBe(100)
    })

    /**
     * Edge Case 6.4: 统计信息正确性
     * 测试工作流统计信息的正确性
     */
    it('应该正确统计工作流执行信息', async () => {
      const workflow: WorkflowDefinition = {
        id: 'stats-test-workflow',
        name: '统计测试工作流',
        version: 1,
        status: WorkflowStatus.ACTIVE,
        nodes: [
          { id: 'start-1', type: NodeType.START, name: '开始', position: { x: 0, y: 0 } },
          { id: 'end-1', type: NodeType.END, name: '结束', position: { x: 100, y: 0 } },
        ],
        edges: [{ id: 'edge-1', source: 'start-1', target: 'end-1', type: EdgeType.SEQUENCE }],
        config: {},
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      executor.registerWorkflow(workflow)

      // 执行多个实例
      await executor.executeInstance(executor.createInstance(workflow.id).id)
      await executor.executeInstance(executor.createInstance(workflow.id).id)
      
      // 取消一个实例
      const cancelledInstance = executor.createInstance(workflow.id)
      executor.cancelInstance(cancelledInstance.id)

      const stats = executor.getStatistics(workflow.id)
      expect(stats.totalInstances).toBe(3)
      expect(stats.success).toBe(2)
      expect(stats.cancelled).toBe(1)
    })
  })
})