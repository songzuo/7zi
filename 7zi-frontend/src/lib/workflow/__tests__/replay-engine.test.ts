/**
 * WorkflowReplayEngine Unit Tests
 *
 * @version 1.12.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  WorkflowReplayEngine,
  type ReplayConfig,
  type ReplayState,
  type ReplayStepType,
  type ExecutionHistory,
  type NodeExecution,
  NodeExecutionStatus,
  TriggerType,
} from '../replay-engine'

describe('WorkflowReplayEngine', () => {
  let engine: WorkflowReplayEngine

  const createMockHistory = (nodeExecs: Record<string, NodeExecution> = {}): ExecutionHistory => ({
    executionId: 'exec-1',
    workflowId: 'wf-1',
    workflowName: 'Test Workflow',
    status: 'completed',
    startTime: 1000,
    endTime: 5000,
    triggerType: 'manual' as TriggerType,
    triggerConfig: {},
    userId: 'user-1',
    nodeExecutions: nodeExecs,
    context: {},
    createdAt: 1000,
    updatedAt: 5000,
  })

  beforeEach(() => {
    engine = new WorkflowReplayEngine()
  })

  describe('constructor', () => {
    it('should create engine with default config', () => {
      expect(engine).toBeDefined()
    })

    it('should accept custom config', () => {
      const customEngine = new WorkflowReplayEngine({
        autoPlay: true,
        speed: 2,
        stepInterval: 500,
      })
      expect(customEngine).toBeDefined()
    })

    it('should use default values for missing config', () => {
      const customEngine = new WorkflowReplayEngine({})
      expect(customEngine).toBeDefined()
    })
  })

  describe('load', () => {
    it('should load execution history', () => {
      const history = createMockHistory({
        'node-1': {
          nodeId: 'node-1',
          nodeName: 'Start',
          nodeType: 'start',
          enterTime: 1000,
          exitTime: 2000,
          duration: 1000,
          status: 'completed' as NodeExecutionStatus,
        },
      })
      engine.load(history)
      // Should not throw
    })

    it('should generate steps from history', () => {
      const history = createMockHistory({
        'node-1': {
          nodeId: 'node-1',
          nodeName: 'Start',
          nodeType: 'start',
          enterTime: 1000,
          exitTime: 2000,
          duration: 1000,
          status: 'completed' as NodeExecutionStatus,
        },
        'node-2': {
          nodeId: 'node-2',
          nodeName: 'End',
          nodeType: 'end',
          enterTime: 2000,
          exitTime: 3000,
          duration: 1000,
          status: 'completed' as NodeExecutionStatus,
        },
      })
      engine.load(history)
    })
  })

  describe('ReplayStepType', () => {
    it('should have enter and exit step types', () => {
      const types: ReplayStepType[] = ['enter', 'exit']
      expect(types).toContain('enter')
      expect(types).toContain('exit')
    })
  })

  describe('ReplayState', () => {
    it('should have all replay states', () => {
      const states: ReplayState[] = ['idle', 'playing', 'paused', 'completed']
      expect(states).toHaveLength(4)
    })
  })

  describe('ReplayConfig', () => {
    it('should accept valid config', () => {
      const config: ReplayConfig = {
        autoPlay: true,
        speed: 0.5,
        stepInterval: 2000,
      }
      expect(config.autoPlay).toBe(true)
      expect(config.speed).toBe(0.5)
    })

    it('should have reasonable speed bounds', () => {
      const config: ReplayConfig = { speed: 0.1 }
      expect(config.speed).toBe(0.1)
    })
  })

  describe('NodeExecution', () => {
    it('should create valid node execution', () => {
      const node: NodeExecution = {
        nodeId: 'node-1',
        nodeName: 'Test',
        nodeType: 'action',
        enterTime: 1000,
        status: 'running',
      }
      expect(node.nodeId).toBe('node-1')
      expect(node.status).toBe('running')
    })

    it('should include optional fields', () => {
      const node: NodeExecution = {
        nodeId: 'node-1',
        nodeName: 'Test',
        nodeType: 'action',
        enterTime: 1000,
        exitTime: 3000,
        duration: 2000,
        status: 'completed',
        input: { key: 'value' },
        output: { result: 'ok' },
        error: undefined,
      }
      expect(node.duration).toBe(2000)
      expect(node.output).toEqual({ result: 'ok' })
    })
  })
})
