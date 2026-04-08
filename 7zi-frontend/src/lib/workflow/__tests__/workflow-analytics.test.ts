/**
 * WorkflowAnalytics Unit Tests
 *
 * @version 1.12.3
 */

import { describe, it, expect } from 'vitest'
import {
  WorkflowAnalytics,
  type ExecutionHistory,
  type NodeExecution,
  type ExecutionHistoryQuery,
  type ExecutionReport,
  NodeExecutionStatus,
  TriggerType,
} from '../workflow-analytics'

describe('WorkflowAnalytics', () => {
  describe('constructor', () => {
    it('should create analytics with defaults', () => {
      const analytics = new WorkflowAnalytics()
      expect(analytics).toBeDefined()
    })

    it('should accept custom options', () => {
      const custom = new WorkflowAnalytics({
        trendPoints: 48,
        bottleneckThresholds: {
          slowNodeThreshold: 10000,
          highFailureRateThreshold: 0.3,
          inconsistencyThreshold: 0.6,
        },
      })
      expect(custom).toBeDefined()
    })

    it('should accept partial options', () => {
      const partial = new WorkflowAnalytics({
        trendPoints: 12,
      })
      expect(partial).toBeDefined()
    })

    it('should accept bottleneck thresholds only', () => {
      const partial = new WorkflowAnalytics({
        bottleneckThresholds: {
          slowNodeThreshold: 8000,
        },
      })
      expect(partial).toBeDefined()
    })
  })

  describe('type definitions', () => {
    describe('ExecutionReport', () => {
      it('should have required fields', () => {
        const report: ExecutionReport = {
          reportId: 'report-1',
          workflowId: 'wf-1',
          workflowName: 'Test',
          generatedAt: Date.now(),
          executionCount: 0,
          successCount: 0,
          failureCount: 0,
          averageDuration: 0,
          timeRange: { from: 0, to: 0 },
          statistics: {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageDuration: 0,
            successRate: 0,
          },
          nodePerformance: [],
          trends: [],
          bottlenecks: [],
        }
        expect(report.reportId).toBe('report-1')
        expect(report.executionCount).toBe(0)
      })

      it('should have optional fields', () => {
        const report: ExecutionReport = {
          reportId: 'report-1',
          workflowId: 'wf-1',
          workflowName: 'Test',
          generatedAt: Date.now(),
          executionCount: 5,
          successCount: 4,
          failureCount: 1,
          averageDuration: 5000,
          timeRange: { from: Date.now() - 86400000, to: Date.now() },
          statistics: {
            totalExecutions: 5,
            successfulExecutions: 4,
            failedExecutions: 1,
            averageDuration: 5000,
            successRate: 0.8,
          },
          nodePerformance: [],
          trends: [],
          bottlenecks: [],
        }
        expect(report.successCount).toBe(4)
        expect(report.statistics.successRate).toBe(0.8)
      })
    })

    describe('ExecutionHistoryQuery', () => {
      it('should accept query with all fields', () => {
        const query: ExecutionHistoryQuery = {
          workflowId: 'wf-1',
          status: 'completed',
          triggerType: 'manual',
          startTime: Date.now() - 86400000,
          endTime: Date.now(),
          limit: 100,
          offset: 0,
        }
        expect(query.workflowId).toBe('wf-1')
        expect(query.limit).toBe(100)
      })

      it('should accept partial query', () => {
        const query: ExecutionHistoryQuery = { workflowId: 'wf-1' }
        expect(query.workflowId).toBe('wf-1')
      })

      it('should accept status-only query', () => {
        const query: ExecutionHistoryQuery = { status: 'failed' }
        expect(query.status).toBe('failed')
      })
    })

    describe('NodeExecution', () => {
      it('should create completed node execution', () => {
        const node: NodeExecution = {
          nodeId: 'node-1',
          nodeName: 'Action Node',
          nodeType: 'action',
          enterTime: Date.now() - 1000,
          exitTime: Date.now(),
          duration: 1000,
          status: 'completed',
          input: { value: 42 },
          output: { result: 'success' },
        }
        expect(node.duration).toBe(1000)
        expect(node.status).toBe('completed')
      })

      it('should create failed node execution with error', () => {
        const node: NodeExecution = {
          nodeId: 'node-fail',
          nodeName: 'Failing Node',
          nodeType: 'action',
          enterTime: Date.now() - 1000,
          exitTime: Date.now(),
          duration: 1000,
          status: 'failed',
          error: 'Connection timeout',
        }
        expect(node.status).toBe('failed')
        expect(node.error).toBe('Connection timeout')
      })

      it('should create skipped node execution', () => {
        const node: NodeExecution = {
          nodeId: 'node-skip',
          nodeName: 'Skipped Node',
          nodeType: 'condition',
          enterTime: Date.now() - 1000,
          status: 'skipped',
        }
        expect(node.status).toBe('skipped')
      })

      it('should create running node execution', () => {
        const node: NodeExecution = {
          nodeId: 'node-running',
          nodeName: 'Running Node',
          nodeType: 'action',
          enterTime: Date.now(),
          status: 'running',
        }
        expect(node.status).toBe('running')
      })

      it('should create pending node execution', () => {
        const node: NodeExecution = {
          nodeId: 'node-pending',
          nodeName: 'Pending Node',
          nodeType: 'trigger',
          enterTime: Date.now(),
          status: 'pending',
        }
        expect(node.status).toBe('pending')
      })
    })

    describe('NodeExecutionStatus values', () => {
      it('should have all expected status values', () => {
        const statuses: NodeExecutionStatus[] = ['pending', 'running', 'completed', 'failed', 'skipped']
        expect(statuses).toHaveLength(5)
        expect(statuses).toContain('completed')
        expect(statuses).toContain('failed')
      })
    })

    describe('TriggerType values', () => {
      it('should have all expected trigger types', () => {
        const types: TriggerType[] = ['manual', 'scheduled', 'event', 'webhook']
        expect(types).toHaveLength(4)
        expect(types).toContain('manual')
        expect(types).toContain('webhook')
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
          triggerType: 'manual',
          triggerConfig: {},
          userId: 'user-1',
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
          context: {},
          createdAt: Date.now() - 60000,
          updatedAt: Date.now() - 60000,
        }
        expect(history.executionId).toBe('exec-1')
        expect(history.status).toBe('completed')
        expect(Object.keys(history.nodeExecutions)).toHaveLength(1)
      })

      it('should allow null endTime for running executions', () => {
        const history: ExecutionHistory = {
          executionId: 'exec-running',
          workflowId: 'wf-1',
          workflowName: 'Running Workflow',
          status: 'running',
          startTime: Date.now() - 60000,
          endTime: undefined,
          triggerType: 'manual',
          triggerConfig: {},
          userId: 'user-1',
          nodeExecutions: {},
          context: {},
          createdAt: Date.now() - 60000,
          updatedAt: Date.now(),
        }
        expect(history.status).toBe('running')
        expect(history.endTime).toBeUndefined()
      })
    })
  })
})
