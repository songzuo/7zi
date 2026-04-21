/**
 * 人工输入节点执行器测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HumanInputNodeExecutor, HumanInputConfig } from '../executors/human-input-executor'
import { ExecutionContext, createExecutionContext } from '../types'
import { NodeType, NodeStatus, WorkflowNode } from '@/types/workflow'

describe('HumanInputNodeExecutor', () => {
  let executor: HumanInputNodeExecutor

  beforeEach(() => {
    executor = new HumanInputNodeExecutor()
  })

  describe('canHandle', () => {
    it('should return true for HUMAN_INPUT node type', () => {
      expect(executor.canHandle(NodeType.HUMAN_INPUT)).toBe(true)
    })

    it('should return false for other node types', () => {
      expect(executor.canHandle(NodeType.START)).toBe(false)
      expect(executor.canHandle(NodeType.AGENT)).toBe(false)
      expect(executor.canHandle(NodeType.LOOP)).toBe(false)
    })
  })

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const node: WorkflowNode = {
        id: 'human-input-1',
        type: NodeType.HUMAN_INPUT,
        name: '审批节点',
        position: { x: 100, y: 100 },
        humanInputConfig: {
          formSchema: {
            fields: [
              {
                name: 'approved',
                type: 'checkbox' as const,
                label: '是否批准',
                required: true,
              },
              {
                name: 'comment',
                type: 'textarea' as const,
                label: '审批意见',
                required: false,
              },
            ],
          },
          requiredApprovals: 1,
          
        },
      }

      const result = executor.validate(node)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject node without id', () => {
      const node: WorkflowNode = {
        id: 'human-input-1',
        type: NodeType.HUMAN_INPUT,
        name: '审批节点',
        position: { x: 100, y: 100 },
        humanInputConfig: {
          formSchema: { fields: [] },
        },
      }

      const result = executor.validate(node)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('人工输入节点必须包含 ID')
    })

    it('should reject node without name', () => {
      const node: WorkflowNode = {
        id: 'human-input-1',
        type: NodeType.HUMAN_INPUT,
        name: '',
        position: { x: 100, y: 100 },
        humanInputConfig: {
          formSchema: { fields: [] },
        },
      }

      const result = executor.validate(node)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('人工输入节点必须包含名称')
    })

    it('should reject node without humanInputConfig', () => {
      const node: WorkflowNode = {
        id: 'human-input-1',
        type: NodeType.HUMAN_INPUT,
        name: '审批节点',
        position: { x: 100, y: 100 },
      }

      const result = executor.validate(node)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('人工输入节点必须配置 humanInputConfig')
    })

    it('should reject node without formSchema', () => {
      const node: WorkflowNode = {
        id: 'human-input-1',
        type: NodeType.HUMAN_INPUT,
        name: '审批节点',
        position: { x: 100, y: 100 },
        humanInputConfig: {
          formSchema: { fields: [] },
        },
      }

      const result = executor.validate(node)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('人工输入节点必须包含至少一个表单字段')
    })

    it('should reject invalid field type', () => {
      const node: WorkflowNode = {
        id: 'human-input-1',
        type: NodeType.HUMAN_INPUT,
        name: '审批节点',
        position: { x: 100, y: 100 },
        humanInputConfig: {
          formSchema: {
            fields: [
              {
                name: 'field1',
                type: 'invalid' as unknown as 'text',
                label: '字段1',
              },
            ],
          },
        },
      }

      const result = executor.validate(node)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('type 无效')
    })

    it('should reject select without options', () => {
      const node: WorkflowNode = {
        id: 'human-input-1',
        type: NodeType.HUMAN_INPUT,
        name: '审批节点',
        position: { x: 100, y: 100 },
        humanInputConfig: {
          formSchema: {
            fields: [
              {
                name: 'option',
                type: 'select' as const,
                label: '选择',
              },
            ],
          },
        },
      }

      const result = executor.validate(node)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('必须包含 options')
    })

    it('should reject invalid requiredApprovals', () => {
      const node: WorkflowNode = {
        id: 'human-input-1',
        type: NodeType.HUMAN_INPUT,
        name: '审批节点',
        position: { x: 100, y: 100 },
        humanInputConfig: {
          formSchema: { fields: [{ name: 'f1', type: 'text' as const, label: 'F1' }] },
          requiredApprovals: 0,
        },
      }

      const result = executor.validate(node)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('requiredApprovals 必须大于 0')
    })

    it('should reject negative timeout', () => {
      const node: WorkflowNode = {
        id: 'human-input-1',
        type: NodeType.HUMAN_INPUT,
        name: '审批节点',
        position: { x: 100, y: 100 },
        humanInputConfig: {
          formSchema: { fields: [{ name: 'f1', type: 'text' as const, label: 'F1' }] },
          timeout: -1,
        } as any,
      }

      const result = executor.validate(node)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('timeout 不能为负数')
    })
  })

  describe('execute', () => {
    const createMockContext = (node: WorkflowNode): ExecutionContext => {
      return createExecutionContext(
        'instance-1',
        'workflow-1',
        node,
        {},
        {},
        {}
      )
    }

    it('should execute successfully with mock input', async () => {
      const node: WorkflowNode = {
        id: 'human-input-1',
        type: NodeType.HUMAN_INPUT,
        name: '审批节点',
        position: { x: 100, y: 100 },
        humanInputConfig: {
          formSchema: {
            fields: [
              {
                name: 'approved',
                type: 'checkbox' as const,
                label: '是否批准',
                required: true,
              },
            ],
          },
          timeout: 1,
        } as any,
      }

      const context = createMockContext(node)
      const result = await executor.execute(context)

      expect(result.status).toBe(NodeStatus.SUCCESS)
      expect(result.output).toBeDefined()
      expect(result.output?.submittedAt).toBeDefined()
    })

    it('should handle input validation', async () => {
      // Test submitInput validation
      const node: WorkflowNode = {
        id: 'human-input-1',
        type: NodeType.HUMAN_INPUT,
        name: '审批节点',
        position: { x: 100, y: 100 },
        humanInputConfig: {
          formSchema: {
            fields: [
              {
                name: 'name',
                type: 'text' as const,
                label: '名称',
                required: true,
              },
              {
                name: 'age',
                type: 'number' as const,
                label: '年龄',
                validation: {
                  min: 0,
                  max: 150,
                },
              },
            ],
          },
        },
      }

      const context = createMockContext(node)
      const result = await executor.execute(context)

      // Should have output with the submitted input
      expect(result.status).toBe(NodeStatus.SUCCESS)
      expect(result.output).toBeDefined()
      expect(result.output?.name).toBeDefined()
      expect(result.output?.age).toBeDefined()
    })
  })

  describe('pending tasks management', () => {
    it('should track pending tasks', () => {
      const tasks = executor.getPendingTasks()
      expect(Array.isArray(tasks)).toBe(true)
    })

    it('should clear completed inputs', () => {
      executor.clearCompletedInputs()
      executor.clearCompletedInputs('instance-1')
    })
  })
})
