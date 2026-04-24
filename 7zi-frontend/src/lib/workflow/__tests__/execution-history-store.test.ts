/**
 * ExecutionHistoryStore Unit Tests
 *
 * @version 1.12.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  type ExecutionHistory,
  type ExecutionHistoryQuery,
  type NodeExecution,
  type ExecutionStatistics,
  type ExecutionStatus,
  type NodeExecutionStatus,
  type TriggerType,
  type TriggerConfig,
  executionHistoryStore,
} from '../execution-history-store'

describe('ExecutionHistoryStore', () => {
  describe('singleton export', () => {
    it('should export executionHistoryStore singleton', () => {
      expect(executionHistoryStore).toBeDefined()
    })

    it('should have query method', () => {
      expect(typeof executionHistoryStore.query).toBe('function')
    })

    it('should have save method', () => {
      expect(typeof executionHistoryStore.save).toBe('function')
    })

    it('should have load method', () => {
      expect(typeof executionHistoryStore.load).toBe('function')
    })

    it('should have delete method', () => {
      expect(typeof executionHistoryStore.delete).toBe('function')
    })

    it('should have clear method', () => {
      expect(typeof executionHistoryStore.clear).toBe('function')
    })

    it('should have getWorkflowExecutions method', () => {
      expect(typeof executionHistoryStore.getWorkflowExecutions).toBe('function')
    })

    it('should have getRunningExecutions method', () => {
      expect(typeof executionHistoryStore.getRunningExecutions).toBe('function')
    })

    it('should have getFailedExecutions method', () => {
      expect(typeof executionHistoryStore.getFailedExecutions).toBe('function')
    })

    it('should have deleteMany method', () => {
      expect(typeof executionHistoryStore.deleteMany).toBe('function')
    })

    it('should have exportAsJson method', () => {
      expect(typeof executionHistoryStore.exportAsJson).toBe('function')
    })
  })

  describe('type definitions', () => {
    describe('ExecutionStatus', () => {
      it('should have all expected status values', () => {
        const statuses: ExecutionStatus[] = ['running', 'completed', 'failed', 'cancelled']
        expect(statuses).toHaveLength(4)
        expect(statuses).toContain('running')
        expect(statuses).toContain('completed')
        expect(statuses).toContain('failed')
        expect(statuses).toContain('cancelled')
      })
    })

    describe('NodeExecutionStatus', () => {
      it('should have all expected status values', () => {
        const statuses: NodeExecutionStatus[] = ['pending', 'running', 'completed', 'failed', 'skipped']
        expect(statuses).toHaveLength(5)
      })
    })

    describe('TriggerType', () => {
      it('should have all expected trigger types', () => {
        const types: TriggerType[] = ['manual', 'scheduled', 'event', 'webhook']
        expect(types).toHaveLength(4)
        expect(types).toContain('manual')
        expect(types).toContain('webhook')
      })
    })

    describe('TriggerConfig', () => {
      it('should accept trigger config with type', () => {
        const config: TriggerConfig = {
          type: 'manual',
        }
        expect(config.type).toBe('manual')
      })

      it('should accept trigger config with userId', () => {
        const config: TriggerConfig = {
          type: 'manual',
          userId: 'user-1',
        }
        expect(config.userId).toBe('user-1')
      })
    })

    describe('NodeExecution', () => {
      it('should create valid node execution object', () => {
        const node: NodeExecution = {
          nodeId: 'node-1',
          nodeName: 'Test Node',
          nodeType: 'action',
          enterTime: Date.now(),
          status: 'running',
        }
        expect(node.nodeId).toBe('node-1')
        expect(node.status).toBe('running')
      })

      it('should create node execution with all fields', () => {
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

      it('should allow error field on failed nodes', () => {
        const node: NodeExecution = {
          nodeId: 'node-fail',
          nodeName: 'Fail',
          nodeType: 'action',
          enterTime: 1000,
          exitTime: 2000,
          duration: 1000,
          status: 'failed',
          error: 'Something went wrong',
        }
        expect(node.error).toBe('Something went wrong')
      })
    })

    describe('ExecutionHistoryQuery', () => {
      it('should create query with all fields', () => {
        const query: ExecutionHistoryQuery = {
          workflowId: 'wf-1',
          status: 'completed',
          trigger: 'manual',
          startTimeRange: { from: Date.now() - 86400000, to: Date.now() },
          limit: 50,
          offset: 0,
        }
        expect(query.workflowId).toBe('wf-1')
        expect(query.limit).toBe(50)
        expect(query.offset).toBe(0)
      })

      it('should accept minimal query', () => {
        const query: ExecutionHistoryQuery = {}
        expect(Object.keys(query)).toHaveLength(0)
      })
    })

    describe('ExecutionStatistics', () => {
      it('should create valid statistics', () => {
        const stats: ExecutionStatistics = {
          totalExecutions: 100,
          statusCounts: {
            running: 0,
            completed: 90,
            failed: 10,
            cancelled: 0,
          },
          triggerCounts: {
            manual: 80,
            scheduled: 10,
            event: 5,
            webhook: 5,
          },
          successRate: 90,
          averageDuration: 5000,
          minDuration: 1000,
          maxDuration: 15000,
        }
        expect(stats.totalExecutions).toBe(100)
        expect(stats.successRate).toBe(90)
      })
    })

    describe('ExecutionHistory', () => {
      it('should create valid execution history', () => {
        const history: ExecutionHistory = {
          executionId: 'exec-1',
          workflowId: 'wf-1',
          workflowName: 'Test Workflow',
          status: 'completed',
          startTime: Date.now() - 60000,
          endTime: Date.now(),
          trigger: 'manual',
          triggerConfig: { type: 'manual' },
          workflowSnapshot: { nodes: [], edges: [] },
          nodeExecutions: {
            'node-1': {
              nodeId: 'node-1',
              nodeName: 'Start',
              nodeType: 'start',
              enterTime: Date.now() - 60000,
              exitTime: Date.now() - 55000,
              duration: 5000,
              status: 'completed',
            },
          },
          createdAt: Date.now() - 60000,
        }
        expect(history.executionId).toBe('exec-1')
        expect(history.status).toBe('completed')
        expect(Object.keys(history.nodeExecutions)).toHaveLength(1)
      })

      it('should allow running execution without endTime', () => {
        const history: ExecutionHistory = {
          executionId: 'exec-running',
          workflowId: 'wf-1',
          workflowName: 'Running',
          status: 'running',
          startTime: Date.now() - 60000,
          endTime: undefined,
          trigger: 'scheduled',
          triggerConfig: { type: 'scheduled', schedule: { cron: '0 * * * *' } },
          workflowSnapshot: { nodes: [], edges: [] },
          nodeExecutions: {},
          createdAt: Date.now() - 60000,
        }
        expect(history.status).toBe('running')
        expect(history.endTime).toBeUndefined()
      })

      it('should allow cancelled execution', () => {
        const history: ExecutionHistory = {
          executionId: 'exec-cancelled',
          workflowId: 'wf-1',
          workflowName: 'Cancelled',
          status: 'cancelled',
          startTime: Date.now() - 60000,
          endTime: Date.now(),
          trigger: 'event',
          triggerConfig: { type: 'event', event: { eventType: 'user.logout', source: 'system' } },
          workflowSnapshot: { nodes: [], edges: [] },
          nodeExecutions: {},
          createdAt: Date.now() - 60000,
        }
        expect(history.status).toBe('cancelled')
      })
    })
  })
})
