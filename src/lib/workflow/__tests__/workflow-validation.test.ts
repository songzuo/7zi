/**
 * 工作流验证测试
 * 测试环形依赖检测、孤立节点检测、必填字段验证
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { VisualWorkflowOrchestrator } from '../VisualWorkflowOrchestrator'
import { WorkflowDefinition, NodeType, EdgeType, WorkflowStatus } from '@/types/workflow'

describe('Workflow Validation Tests', () => {
  let orchestrator: VisualWorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new VisualWorkflowOrchestrator()
  })

  // 辅助函数：创建基础工作流
  function createBaseWorkflow(id: string, name: string): WorkflowDefinition {
    return {
      id,
      name,
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
  }

  // ==================== 环形依赖检测测试 ====================
  describe('Circular Dependency Detection', () => {
    // 注意：当前 VisualWorkflowOrchestrator 没有实现环形依赖检测
    // 这些测试验证行为，但可能需要在实际实现中添加该功能

    it('should accept simple workflow (no circular detection implemented)', () => {
      const workflow = createBaseWorkflow('simple-valid', 'Simple Valid')
      workflow.nodes = [
        { id: 'start', type: NodeType.START, name: 'Start', position: { x: 0, y: 0 } },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 100, y: 0 } },
      ]
      workflow.edges = [{ id: 'e1', source: 'start', target: 'end', type: EdgeType.SEQUENCE }]

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(true)
    })

    it('should accept valid non-circular workflow', () => {
      const workflow = createBaseWorkflow('valid', 'Valid Workflow')
      workflow.nodes = [
        { id: 'start', type: NodeType.START, name: 'Start', position: { x: 0, y: 0 } },
        { id: 'task1', type: NodeType.AGENT, name: 'Task 1', position: { x: 100, y: 0 } },
        { id: 'task2', type: NodeType.AGENT, name: 'Task 2', position: { x: 200, y: 0 } },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 300, y: 0 } },
      ]
      // 有效的线性流程
      workflow.edges = [
        { id: 'e1', source: 'start', target: 'task1', type: EdgeType.SEQUENCE },
        { id: 'e2', source: 'task1', target: 'task2', type: EdgeType.SEQUENCE },
        { id: 'e3', source: 'task2', target: 'end', type: EdgeType.SEQUENCE },
      ]

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept valid diamond-shaped workflow', () => {
      const workflow = createBaseWorkflow('diamond', 'Diamond Workflow')
      workflow.nodes = [
        { id: 'start', type: NodeType.START, name: 'Start', position: { x: 0, y: 0 } },
        { id: 'split', type: NodeType.PARALLEL, name: 'Split', position: { x: 100, y: 0 } },
        {
          id: 'task1',
          type: NodeType.AGENT,
          name: 'Task 1',
          position: { x: 200, y: -50 },
          agentConfig: { agentId: 'agent-1', agentType: 'test' },
        },
        {
          id: 'task2',
          type: NodeType.AGENT,
          name: 'Task 2',
          position: { x: 200, y: 50 },
          agentConfig: { agentId: 'agent-2', agentType: 'test' },
        },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 300, y: 0 } },
      ]
      // 菱形结构：start -> split -> (task1, task2) -> end
      workflow.edges = [
        { id: 'e1', source: 'start', target: 'split', type: EdgeType.SEQUENCE },
        { id: 'e2', source: 'split', target: 'task1', type: EdgeType.PARALLEL },
        { id: 'e3', source: 'split', target: 'task2', type: EdgeType.PARALLEL },
        { id: 'e4', source: 'task1', target: 'end', type: EdgeType.SEQUENCE },
        { id: 'e5', source: 'task2', target: 'end', type: EdgeType.SEQUENCE },
      ]

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(true)
    })
  })

  // ==================== 孤立节点检测测试 ====================
  describe('Isolated Node Detection', () => {
    it('should warn about completely isolated node', () => {
      const workflow = createBaseWorkflow('isolated', 'Isolated Node')
      workflow.nodes = [
        { id: 'start', type: NodeType.START, name: 'Start', position: { x: 0, y: 0 } },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 200, y: 0 } },
        {
          id: 'isolated',
          type: NodeType.AGENT,
          name: 'Isolated',
          position: { x: 500, y: 500 },
          agentConfig: { agentId: 'agent', agentType: 'test' },
        },
      ]
      workflow.edges = [{ id: 'e1', source: 'start', target: 'end', type: EdgeType.SEQUENCE }]
      // isolated 节点没有连接任何边

      const result = orchestrator.validateWorkflow(workflow)

      // 孤立节点应该产生警告（不是错误）
      expect(result.warnings.some(w => w.includes('Isolated') || w.includes('isolated'))).toBe(true)
    })

    it('should accept workflow with all nodes connected', () => {
      const workflow = createBaseWorkflow('fully-connected', 'Fully Connected')
      workflow.nodes = [
        { id: 'start', type: NodeType.START, name: 'Start', position: { x: 0, y: 0 } },
        {
          id: 'task1',
          type: NodeType.AGENT,
          name: 'Task 1',
          position: { x: 100, y: 0 },
          agentConfig: { agentId: 'agent-1', agentType: 'test' },
        },
        {
          id: 'task2',
          type: NodeType.AGENT,
          name: 'Task 2',
          position: { x: 200, y: 0 },
          agentConfig: { agentId: 'agent-2', agentType: 'test' },
        },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 300, y: 0 } },
      ]
      workflow.edges = [
        { id: 'e1', source: 'start', target: 'task1', type: EdgeType.SEQUENCE },
        { id: 'e2', source: 'task1', target: 'task2', type: EdgeType.SEQUENCE },
        { id: 'e3', source: 'task2', target: 'end', type: EdgeType.SEQUENCE },
      ]

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  // ==================== 必填字段验证测试 ====================
  describe('Required Field Validation', () => {
    it('should reject workflow without any nodes', () => {
      const workflow = createBaseWorkflow('no-nodes', 'No Nodes')
      workflow.nodes = []

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('node'))).toBe(true)
    })

    it('should reject workflow without start node', () => {
      const workflow = createBaseWorkflow('no-start', 'No Start')
      workflow.nodes = [
        {
          id: 'task',
          type: NodeType.AGENT,
          name: 'Task',
          position: { x: 0, y: 0 },
          agentConfig: { agentId: 'agent', agentType: 'test' },
        },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 100, y: 0 } },
      ]
      workflow.edges = [{ id: 'e1', source: 'task', target: 'end', type: EdgeType.SEQUENCE }]

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('start'))).toBe(true)
    })

    it('should reject workflow without end node', () => {
      const workflow = createBaseWorkflow('no-end', 'No End')
      workflow.nodes = [
        { id: 'start', type: NodeType.START, name: 'Start', position: { x: 0, y: 0 } },
        {
          id: 'task',
          type: NodeType.AGENT,
          name: 'Task',
          position: { x: 100, y: 0 },
          agentConfig: { agentId: 'agent', agentType: 'test' },
        },
      ]
      workflow.edges = [{ id: 'e1', source: 'start', target: 'task', type: EdgeType.SEQUENCE }]

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('end'))).toBe(true)
    })

    it('should reject condition node without expression', () => {
      const workflow = createBaseWorkflow('no-condition-expr', 'No Condition Expression')
      workflow.nodes = [
        { id: 'start', type: NodeType.START, name: 'Start', position: { x: 0, y: 0 } },
        {
          id: 'condition',
          type: NodeType.CONDITION,
          name: 'Condition',
          position: { x: 100, y: 0 },
          conditionConfig: { expression: '' }, // 空表达式
        },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 200, y: 0 } },
      ]
      workflow.edges = [
        { id: 'e1', source: 'start', target: 'condition', type: EdgeType.SEQUENCE },
        { id: 'e2', source: 'condition', target: 'end', type: EdgeType.SEQUENCE },
      ]

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('expression') || e.includes('Condition'))).toBe(
        true
      )
    })

    it('should reject wait node without config', () => {
      const workflow = createBaseWorkflow('no-wait-config', 'No Wait Config')
      workflow.nodes = [
        { id: 'start', type: NodeType.START, name: 'Start', position: { x: 0, y: 0 } },
        {
          id: 'wait',
          type: NodeType.WAIT,
          name: 'Wait',
          position: { x: 100, y: 0 },
        },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 200, y: 0 } },
      ]
      workflow.edges = [
        { id: 'e1', source: 'start', target: 'wait', type: EdgeType.SEQUENCE },
        { id: 'e2', source: 'wait', target: 'end', type: EdgeType.SEQUENCE },
      ]

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('duration') || e.includes('Wait'))).toBe(true)
    })

    it('should reject edge referencing non-existent source node', () => {
      const workflow = createBaseWorkflow('bad-edge-source', 'Bad Edge Source')
      workflow.nodes = [
        { id: 'start', type: NodeType.START, name: 'Start', position: { x: 0, y: 0 } },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 100, y: 0 } },
      ]
      workflow.edges = [
        { id: 'e1', source: 'start', target: 'end', type: EdgeType.SEQUENCE },
        { id: 'e2', source: 'non-existent-node', target: 'end', type: EdgeType.SEQUENCE },
      ]

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('source') || e.includes('non-existent'))).toBe(true)
    })

    it('should reject edge referencing non-existent target node', () => {
      const workflow = createBaseWorkflow('bad-edge-target', 'Bad Edge Target')
      workflow.nodes = [
        { id: 'start', type: NodeType.START, name: 'Start', position: { x: 0, y: 0 } },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 100, y: 0 } },
      ]
      workflow.edges = [
        { id: 'e1', source: 'start', target: 'non-existent-node', type: EdgeType.SEQUENCE },
      ]

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('target') || e.includes('non-existent'))).toBe(true)
    })

    it('should reject duplicate node IDs', () => {
      const workflow = createBaseWorkflow('duplicate-ids', 'Duplicate IDs')
      workflow.nodes = [
        { id: 'node1', type: NodeType.START, name: 'Start', position: { x: 0, y: 0 } },
        { id: 'node1', type: NodeType.AGENT, name: 'Duplicate', position: { x: 100, y: 0 } },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 200, y: 0 } },
      ]
      workflow.edges = [
        { id: 'e1', source: 'node1', target: 'node1', type: EdgeType.SEQUENCE },
        { id: 'e2', source: 'node1', target: 'end', type: EdgeType.SEQUENCE },
      ]

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true)
    })

    it('should warn about multiple start nodes', () => {
      const workflow = createBaseWorkflow('multi-start', 'Multi Start')
      workflow.nodes = [
        { id: 'start1', type: NodeType.START, name: 'Start 1', position: { x: 0, y: 0 } },
        { id: 'start2', type: NodeType.START, name: 'Start 2', position: { x: 0, y: 100 } },
        {
          id: 'task',
          type: NodeType.AGENT,
          name: 'Task',
          position: { x: 100, y: 0 },
          agentConfig: { agentId: 'agent', agentType: 'test' },
        },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 200, y: 0 } },
      ]
      workflow.edges = [
        { id: 'e1', source: 'start1', target: 'task', type: EdgeType.SEQUENCE },
        { id: 'e2', source: 'start2', target: 'task', type: EdgeType.SEQUENCE },
        { id: 'e3', source: 'task', target: 'end', type: EdgeType.SEQUENCE },
      ]

      const result = orchestrator.validateWorkflow(workflow)

      // 多个开始节点应该产生警告
      expect(result.warnings.some(w => w.includes('start'))).toBe(true)
    })

    it('should accept valid workflow with all required fields', () => {
      const workflow = createBaseWorkflow('valid-full', 'Valid Full')
      workflow.nodes = [
        { id: 'start', type: NodeType.START, name: 'Start', position: { x: 0, y: 0 } },
        {
          id: 'task',
          type: NodeType.AGENT,
          name: 'Task',
          position: { x: 100, y: 0 },
          agentConfig: { agentId: 'agent', agentType: 'test' },
        },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 200, y: 0 } },
      ]
      workflow.edges = [
        { id: 'e1', source: 'start', target: 'task', type: EdgeType.SEQUENCE },
        { id: 'e2', source: 'task', target: 'end', type: EdgeType.SEQUENCE },
      ]

      const result = orchestrator.validateWorkflow(workflow)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})
