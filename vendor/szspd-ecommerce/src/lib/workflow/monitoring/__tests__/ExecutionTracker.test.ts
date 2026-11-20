/**
 * ExecutionTracker Tests
 * 测试工作流执行追踪器的核心功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExecutionTracker } from '../ExecutionTracker'
import { WorkflowExecutionStatus } from '../types'
import { InstanceStatus } from '@/types/workflow'

describe('ExecutionTracker', () => {
  let tracker: ExecutionTracker

  beforeEach(() => {
    tracker = new ExecutionTracker({ maxExecutions: 100, retentionMs: 60000 })
  })

  describe('createExecution', () => {
    it('应该创建新的执行记录', () => {
      const execution = tracker.createExecution({
        workflowId: 'wf-1',
        workflowName: '测试工作流',
        workflowVersion: 1,
        triggeredBy: 'test-user',
        triggerType: 'manual',
        inputs: { key: 'value' },
        nodeCount: 5,
      })

      expect(execution.id).toBeDefined()
      expect(execution.workflowId).toBe('wf-1')
      expect(execution.workflowName).toBe('测试工作流')
      expect(execution.status).toBe(WorkflowExecutionStatus.PENDING)
      expect(execution.startTime).toBeDefined()
      expect(execution.completedNodes).toBe(0)
      expect(execution.failedNodes).toBe(0)
    })

    it('应该为不同工作流维护独立的执行索引', () => {
      tracker.createExecution({
        workflowId: 'wf-1',
        workflowName: '工作流1',
        workflowVersion: 1,
        triggeredBy: 'user1',
        triggerType: 'manual',
        nodeCount: 3,
      })
      tracker.createExecution({
        workflowId: 'wf-2',
        workflowName: '工作流2',
        workflowVersion: 1,
        triggeredBy: 'user2',
        triggerType: 'api',
        nodeCount: 3,
      })

      const wf1Executions = tracker.getExecutions({ workflowId: 'wf-1', limit: 50 })
      const wf2Executions = tracker.getExecutions({ workflowId: 'wf-2', limit: 50 })

      expect(wf1Executions.executions.length).toBe(1)
      expect(wf2Executions.executions.length).toBe(1)
      expect(wf1Executions.total).toBe(1)
      expect(wf2Executions.total).toBe(1)
    })

    it('应该正确存储输入参数', () => {
      const inputs = { param1: 'value1', param2: 42 }
      const execution = tracker.createExecution({
        workflowId: 'wf-1',
        workflowName: '测试',
        workflowVersion: 1,
        triggeredBy: 'test',
        triggerType: 'manual',
        inputs,
        nodeCount: 2,
      })

      expect(execution.inputs).toEqual(inputs)
    })

    it('应该初始化变量为空对象', () => {
      const execution = tracker.createExecution({
        workflowId: 'wf-1',
        workflowName: '测试',
        workflowVersion: 1,
        triggeredBy: 'test',
        triggerType: 'manual',
        nodeCount: 2,
      })

      expect(execution.variables).toEqual({})
    })
  })

  describe('updateStatus', () => {
    it('应该更新执行状态为 RUNNING', () => {
      const execution = tracker.createExecution({
        workflowId: 'wf-1',
        workflowName: '测试',
        workflowVersion: 1,
        triggeredBy: 'test',
        triggerType: 'manual',
        nodeCount: 3,
      })

      const updated = tracker.updateStatus(execution.id, WorkflowExecutionStatus.RUNNING)

      expect(updated?.status).toBe(WorkflowExecutionStatus.RUNNING)
      expect(updated?.metadata.updatedAt).toBeDefined()
    })

    it('应该更新执行状态为 COMPLETED 并设置结束时间', () => {
      const execution = tracker.createExecution({
        workflowId: 'wf-1',
        workflowName: '测试',
        workflowVersion: 1,
        triggeredBy: 'test',
        triggerType: 'manual',
        nodeCount: 3,
      })

      tracker.updateStatus(execution.id, WorkflowExecutionStatus.RUNNING)
      const completed = tracker.updateStatus(execution.id, WorkflowExecutionStatus.COMPLETED)

      expect(completed?.status).toBe(WorkflowExecutionStatus.COMPLETED)
      expect(completed?.endTime).toBeDefined()
      expect(completed?.duration).toBeGreaterThanOrEqual(0)
    })

    it('应该更新执行状态为 FAILED 并记录错误', () => {
      const execution = tracker.createExecution({
        workflowId: 'wf-1',
        workflowName: '测试',
        workflowVersion: 1,
        triggeredBy: 'test',
        triggerType: 'manual',
        nodeCount: 3,
      })

      const error = {
        nodeId: 'node-1',
        code: 'EXECUTION_ERROR',
        message: '节点执行失败',
      }

      const failed = tracker.updateStatus(execution.id, WorkflowExecutionStatus.FAILED, error)

      expect(failed?.status).toBe(WorkflowExecutionStatus.FAILED)
      expect(failed?.error).toEqual(error)
      expect(failed?.endTime).toBeDefined()
    })

    it('应该返回 undefined 当执行不存在', () => {
      const result = tracker.updateStatus('non-existent-id', WorkflowExecutionStatus.RUNNING)
      expect(result).toBeUndefined()
    })
  })

  describe('updateProgress', () => {
    it('应该更新完成节点数', () => {
      const execution = tracker.createExecution({
        workflowId: 'wf-1',
        workflowName: '测试',
        workflowVersion: 1,
        triggeredBy: 'test',
        triggerType: 'manual',
        nodeCount: 5,
      })

      const updated = tracker.updateProgress(execution.id, { completed: 3 })

      expect(updated?.completedNodes).toBe(3)
    })

    it('应该同时更新失败和跳过节点数', () => {
      const execution = tracker.createExecution({
        workflowId: 'wf-1',
        workflowName: '测试',
        workflowVersion: 1,
        triggeredBy: 'test',
        triggerType: 'manual',
        nodeCount: 5,
      })

      const updated = tracker.updateProgress(execution.id, {
        completed: 3,
        failed: 1,
        skipped: 1,
      })

      expect(updated?.completedNodes).toBe(3)
      expect(updated?.failedNodes).toBe(1)
      expect(updated?.skippedNodes).toBe(1)
    })

    it('应该累加更新而不是覆盖', () => {
      const execution = tracker.createExecution({
        workflowId: 'wf-1',
        workflowName: '测试',
        workflowVersion: 1,
        triggeredBy: 'test',
        triggerType: 'manual',
        nodeCount: 10,
      })

      tracker.updateProgress(execution.id, { completed: 3 })
      const updated = tracker.updateProgress(execution.id, { completed: 5 })

      expect(updated?.completedNodes).toBe(5)
    })
  })

  describe('setOutputs / setVariables', () => {
    it('应该设置执行输出', () => {
      const execution = tracker.createExecution({
        workflowId: 'wf-1',
        workflowName: '测试',
        workflowVersion: 1,
        triggeredBy: 'test',
        triggerType: 'manual',
        nodeCount: 2,
      })

      tracker.setOutputs(execution.id, { result: 'success', data: [1, 2, 3] })

      const updated = tracker.getExecution(execution.id)
      expect(updated?.outputs).toEqual({ result: 'success', data: [1, 2, 3] })
    })

    it('应该合并更新变量', () => {
      const execution = tracker.createExecution({
        workflowId: 'wf-1',
        workflowName: '测试',
        workflowVersion: 1,
        triggeredBy: 'test',
        triggerType: 'manual',
        nodeCount: 2,
      })

      tracker.setVariables(execution.id, { var1: 'initial' })
      tracker.setVariables(execution.id, { var2: 'updated' })

      const updated = tracker.getExecution(execution.id)
      expect(updated?.variables).toEqual({ var1: 'initial', var2: 'updated' })
    })
  })

  describe('getExecutions', () => {
    beforeEach(() => {
      // 创建多个测试执行
      for (let i = 0; i < 10; i++) {
        const exec = tracker.createExecution({
          workflowId: 'wf-1',
          workflowName: '测试',
          workflowVersion: 1,
          triggeredBy: 'test',
          triggerType: i % 2 === 0 ? 'manual' : 'api',
          nodeCount: 5,
        })
        if (i < 5) {
          tracker.updateStatus(exec.id, WorkflowExecutionStatus.COMPLETED)
        } else if (i < 8) {
          tracker.updateStatus(exec.id, WorkflowExecutionStatus.FAILED)
        }
      }
    })

    it('应该分页返回执行列表', () => {
      const result = tracker.getExecutions({
        workflowId: 'wf-1',
        limit: 3,
        offset: 0,
      })

      expect(result.executions.length).toBe(3)
      expect(result.total).toBe(10)
    })

    it('应该支持按状态过滤', () => {
      const result = tracker.getExecutions({
        workflowId: 'wf-1',
        status: WorkflowExecutionStatus.COMPLETED,
        limit: 50,
      })

      expect(result.executions.length).toBe(5)
      expect(result.executions.every(e => e.status === WorkflowExecutionStatus.COMPLETED)).toBe(true)
    })

    it('应该支持按触发类型过滤', () => {
      const result = tracker.getExecutions({
        workflowId: 'wf-1',
        triggerType: 'api',
        limit: 50,
      })

      expect(result.executions.length).toBe(5)
      expect(result.executions.every(e => e.triggerType === 'api')).toBe(true)
    })

    it('应该支持按时间范围过滤', () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 3600000)

      const result = tracker.getExecutions({
        workflowId: 'wf-1',
        startDate: oneHourAgo.toISOString(),
        endDate: now.toISOString(),
        limit: 50,
      })

      expect(result.executions.length).toBe(10)
    })
  })

  describe('getSummary', () => {
    beforeEach(() => {
      // 创建不同状态的执行
      const statuses: WorkflowExecutionStatus[] = [
        WorkflowExecutionStatus.COMPLETED,
        WorkflowExecutionStatus.COMPLETED,
        WorkflowExecutionStatus.COMPLETED,
        WorkflowExecutionStatus.FAILED,
        WorkflowExecutionStatus.FAILED,
      ]

      for (const status of statuses) {
        const exec = tracker.createExecution({
          workflowId: 'wf-1',
          workflowName: '测试',
          workflowVersion: 1,
          triggeredBy: 'test',
          triggerType: 'manual',
          nodeCount: 5,
        })
        tracker.updateStatus(exec.id, WorkflowExecutionStatus.RUNNING)
        tracker.updateStatus(exec.id, status)
      }
    })

    it('应该返回正确的统计摘要', () => {
      const summary = tracker.getSummary('wf-1')

      expect(summary.totalExecutions).toBe(5)
      expect(summary.successCount).toBe(3)
      expect(summary.failureCount).toBe(2)
      expect(summary.cancellationCount).toBe(0)
      expect(summary.successRate).toBe(60)
    })

    it('应该返回0当没有执行记录', () => {
      const summary = tracker.getSummary('non-existent-workflow')

      expect(summary.totalExecutions).toBe(0)
      expect(summary.successCount).toBe(0)
      expect(summary.avgDuration).toBe(0)
    })
  })

  describe('deleteExecution', () => {
    it('应该删除执行记录', () => {
      const execution = tracker.createExecution({
        workflowId: 'wf-1',
        workflowName: '测试',
        workflowVersion: 1,
        triggeredBy: 'test',
        triggerType: 'manual',
        nodeCount: 3,
      })

      expect(tracker.getExecution(execution.id)).toBeDefined()

      const deleted = tracker.deleteExecution(execution.id)
      expect(deleted).toBe(true)
      expect(tracker.getExecution(execution.id)).toBeUndefined()
    })

    it('应该返回 false 当执行不存在', () => {
      const result = tracker.deleteExecution('non-existent-id')
      expect(result).toBe(false)
    })

    it('应该从工作流索引中移除', () => {
      const execution = tracker.createExecution({
        workflowId: 'wf-1',
        workflowName: '测试',
        workflowVersion: 1,
        triggeredBy: 'test',
        triggerType: 'manual',
        nodeCount: 3,
      })

      tracker.deleteExecution(execution.id)

      const result = tracker.getExecutions({ workflowId: 'wf-1', limit: 50 })
      expect(result.total).toBe(0)
    })
  })

  describe('getActiveCount', () => {
    it('应该返回所有工作流的活跃执行数', () => {
      for (let i = 0; i < 3; i++) {
        const exec = tracker.createExecution({
          workflowId: 'wf-1',
          workflowName: '测试',
          workflowVersion: 1,
          triggeredBy: 'test',
          triggerType: 'manual',
          nodeCount: 3,
        })
        tracker.updateStatus(exec.id, WorkflowExecutionStatus.RUNNING)
      }

      expect(tracker.getActiveCount()).toBe(3)
    })

    it('应该返回特定工作流的活跃执行数', () => {
      for (let i = 0; i < 2; i++) {
        const exec = tracker.createExecution({
          workflowId: 'wf-1',
          workflowName: '测试',
          workflowVersion: 1,
          triggeredBy: 'test',
          triggerType: 'manual',
          nodeCount: 3,
        })
        tracker.updateStatus(exec.id, WorkflowExecutionStatus.RUNNING)
      }

      const exec2 = tracker.createExecution({
        workflowId: 'wf-2',
        workflowName: '测试2',
        workflowVersion: 1,
        triggeredBy: 'test',
        triggerType: 'manual',
        nodeCount: 3,
      })
      tracker.updateStatus(exec2.id, WorkflowExecutionStatus.RUNNING)

      expect(tracker.getActiveCount('wf-1')).toBe(2)
      expect(tracker.getActiveCount('wf-2')).toBe(1)
    })
  })

  describe('toInstanceStatus', () => {
    it('应该正确映射执行状态到实例状态', () => {
      expect(ExecutionTracker.toInstanceStatus(WorkflowExecutionStatus.PENDING)).toBe(InstanceStatus.PENDING)
      expect(ExecutionTracker.toInstanceStatus(WorkflowExecutionStatus.RUNNING)).toBe(InstanceStatus.RUNNING)
      expect(ExecutionTracker.toInstanceStatus(WorkflowExecutionStatus.COMPLETED)).toBe(InstanceStatus.COMPLETED)
      expect(ExecutionTracker.toInstanceStatus(WorkflowExecutionStatus.FAILED)).toBe(InstanceStatus.FAILED)
      expect(ExecutionTracker.toInstanceStatus(WorkflowExecutionStatus.CANCELLED)).toBe(InstanceStatus.CANCELLED)
    })
  })
})
