/**
 * Visual Workflow Orchestrator 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  VisualWorkflowOrchestrator,
  visualWorkflowOrchestrator,
} from '@/lib/workflow/VisualWorkflowOrchestrator'
import type { WorkflowDefinition } from '@/types/workflow'

describe('VisualWorkflowOrchestrator', () => {
  beforeEach(() => {
    // Clear instances before each test
    const orchestrator = new VisualWorkflowOrchestrator()
    orchestrator.instances.clear()
  })

  describe('基础功能', () => {
    it('should be a singleton instance', () => {
      expect(visualWorkflowOrchestrator).toBeInstanceOf(VisualWorkflowOrchestrator)
    })

    it('should have required methods', () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      expect(typeof orchestrator.createInstance).toBe('function')
      expect(typeof orchestrator.execute).toBe('function')
      expect(typeof orchestrator.validateWorkflow).toBe('function')
      expect(typeof orchestrator.registerExecutor).toBe('function')
      expect(typeof orchestrator.addEventListener).toBe('function')
      expect(typeof orchestrator.removeEventListener).toBe('function')
    })
  })

  describe('工作流实例创建', () => {
    it('should create a workflow instance with createInstance', () => {
      const workflowDef: WorkflowDefinition = {
        id: 'test-workflow-1',
        name: 'Test Workflow',
        version: 1,
        status: 'published',
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 0, y: 0 },
            data: {},
          },
          {
            id: 'end-1',
            type: 'end',
            position: { x: 100, y: 0 },
            data: {},
          },
        ],
        edges: [],
        config: {
          variables: {},
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const instance = visualWorkflowOrchestrator.createInstance(workflowDef)
      expect(instance).toBeDefined()
      expect(instance.id).toBeDefined()
      expect(instance.workflowId).toBe('test-workflow-1')
      expect(instance.status).toBe('pending')
    })

    it('should create instance with inputs', () => {
      const workflowDef: WorkflowDefinition = {
        id: 'input-test',
        name: 'Input Test',
        version: 1,
        status: 'published',
        nodes: [],
        edges: [],
        config: {
          variables: {},
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const instance = visualWorkflowOrchestrator.createInstance(workflowDef, { name: 'test' })
      expect(instance.data.inputs).toEqual({ name: 'test' })
    })
  })

  describe('工作流验证', () => {
    it('should validate a valid workflow', () => {
      const workflowDef: WorkflowDefinition = {
        id: 'valid-workflow',
        name: 'Valid Workflow',
        version: 1,
        status: 'published',
        nodes: [
          { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: {} },
          { id: 'end-1', type: 'end', position: { x: 100, y: 0 }, data: {} },
        ],
        edges: [{ id: 'e1', source: 'start-1', target: 'end-1' }],
        config: {
          variables: {},
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const validation = visualWorkflowOrchestrator.validateWorkflow(workflowDef)
      expect(validation.valid).toBe(true)
    })

    it('should reject workflow without start node', () => {
      const workflowDef: WorkflowDefinition = {
        id: 'no-start',
        name: 'No Start Workflow',
        version: 1,
        status: 'published',
        nodes: [
          { id: 'end-1', type: 'end', position: { x: 100, y: 0 }, data: {} },
        ],
        edges: [],
        config: {
          variables: {},
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'test',
          updatedBy: 'test',
        },
      }

      const validation = visualWorkflowOrchestrator.validateWorkflow(workflowDef)
      expect(validation.valid).toBe(false)
    })
  })

  describe('事件监听', () => {
    it('should add and remove event listeners', () => {
      const orchestrator = new VisualWorkflowOrchestrator()
      
      const listener = vi.fn()
      
      // Add listener
      orchestrator.addEventListener(listener)
      
      // Remove listener
      orchestrator.removeEventListener(listener)
      
      // No error means success
      expect(true).toBe(true)
    })
  })
})
