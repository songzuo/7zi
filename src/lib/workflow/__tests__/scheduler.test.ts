/**
 * 工作流调度器测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { vi } from 'vitest'
import { WorkflowScheduler, ScheduleTaskStatus } from '../scheduler'
import { enhancedWorkflowExecutor } from '../executor'
import { TriggerType, TriggerStatus } from '../triggers'
import { WorkflowDefinition, NodeType, EdgeType } from '@/types/workflow'

// Mock 执行器
vi.mock('../executor', () => ({
  enhancedWorkflowExecutor: {
    registerWorkflow: vi.fn(),
    createInstance: vi.fn(),
    executeInstance: vi.fn(),
    cancelInstance: vi.fn(),
    clearInstances: vi.fn(),
  },
}))

describe('WorkflowScheduler', () => {
  let scheduler: WorkflowScheduler
  let mockWorkflow: WorkflowDefinition

  beforeEach(() => {
    scheduler = new WorkflowScheduler({
      maxConcurrentTasks: 2,
      taskQueueSize: 10,
      taskTimeout: 5000,
    })

    // 创建模拟工作流
    mockWorkflow = {
      id: 'test-workflow',
      name: '测试工作流',
      version: 1,
      status: 'active' as any,
      nodes: [
        {
          id: 'start',
          type: NodeType.START,
          name: '开始',
          position: { x: 100, y: 100 },
        },
        {
          id: 'end',
          type: NodeType.END,
          name: '结束',
          position: { x: 300, y: 100 },
        },
      ],
      edges: [
        {
          id: 'edge1',
          source: 'start',
          target: 'end',
          type: EdgeType.SEQUENCE,
        },
      ],
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

    // Mock 实例创建
    vi.mocked(enhancedWorkflowExecutor.createInstance).mockReturnValue({
      id: 'instance-123',
      workflowId: 'test-workflow',
      workflowVersion: 1,
      status: 'pending' as any,
      progress: {
        total: 2,
        completed: 0,
        failed: 0,
        percentage: 0,
      },
      nodeResults: new Map(),
      data: {
        inputs: {},
        outputs: {},
        variables: {},
      },
      metadata: {
        startedAt: new Date().toISOString(),
        triggeredBy: 'system',
        triggerType: 'manual',
      },
    } as any)

    vi.mocked(enhancedWorkflowExecutor.executeInstance).mockResolvedValue({
      id: 'instance-123',
      workflowId: 'test-workflow',
      workflowVersion: 1,
      status: 'completed' as any,
      progress: {
        total: 2,
        completed: 2,
        failed: 0,
        percentage: 100,
      },
      nodeResults: new Map(),
      data: {
        inputs: {},
        outputs: {},
        variables: {},
      },
      metadata: {
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        duration: 1000,
        triggeredBy: 'system',
        triggerType: 'manual',
      },
    } as any)
  })

  afterEach(async () => {
    await scheduler.stop()
  })

  describe('工作流注册', () => {
    it('应该注册工作流到执行器', () => {
      scheduler.registerWorkflow(mockWorkflow)

      expect(enhancedWorkflowExecutor.registerWorkflow).toHaveBeenCalledWith(mockWorkflow)
    })
  })

  describe('工作流触发', () => {
    it('应该成功触发工作流', async () => {
      scheduler.registerWorkflow(mockWorkflow)

      const task = await scheduler.triggerWorkflow('test-workflow', { testData: 'value' })

      expect(task).toBeDefined()
      expect(task.workflowId).toBe('test-workflow')
      expect(task.status).toBe(ScheduleTaskStatus.PENDING)
      expect(task.inputs).toEqual({ testData: 'value' })
    })

    it('应该执行工作流实例', async () => {
      scheduler.registerWorkflow(mockWorkflow)
      const task = await scheduler.triggerWorkflow('test-workflow')

      // 等待任务开始执行
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(enhancedWorkflowExecutor.createInstance).toHaveBeenCalled()
    })

    it('应该限制并发任务数', async () => {
      scheduler.registerWorkflow(mockWorkflow)

      // 触发多个任务（超过最大并发数）
      const tasks: any[] = []
      for (let i = 0; i < 5; i++) {
        tasks.push(scheduler.triggerWorkflow('test-workflow'))
      }

      await Promise.all(tasks)

      const allTasks = scheduler.getAllTasks()
      const runningTasks = allTasks.filter(t => t.status === ScheduleTaskStatus.RUNNING)

      // 并发数不应超过配置的最大值
      expect(runningTasks.length).toBeLessThanOrEqual(2)
    })

    it('应该限制任务队列大小', async () => {
      scheduler = new WorkflowScheduler({
        maxConcurrentTasks: 1,
        taskQueueSize: 3, // 队列大小为 3
      })

      scheduler.registerWorkflow(mockWorkflow)

      // 触发大量任务
      const tasks: any[] = []
      for (let i = 0; i < 10; i++) {
        try {
          tasks.push(scheduler.triggerWorkflow('test-workflow'))
        } catch (error) {
          // 队列满了，应该抛出错误
          expect((error as Error).message).toBe('任务队列已满')
        }
      }

      // 前 3 个任务应该成功，后面的应该失败
      const successfulTasks = await Promise.allSettled(tasks)
      const successCount = successfulTasks.filter(r => r.status === 'fulfilled').length

      expect(successCount).toBeLessThanOrEqual(3)
    })
  })

  describe('任务状态', () => {
    it('应该更新任务状态', async () => {
      scheduler.registerWorkflow(mockWorkflow)

      const task = await scheduler.triggerWorkflow('test-workflow')

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 2000))

      const updatedTask = scheduler.getTask(task.id)
      expect(updatedTask?.status).toBe(ScheduleTaskStatus.COMPLETED)
      expect(updatedTask?.instanceId).toBeDefined()
    })

    it('应该处理任务失败', async () => {
      scheduler.registerWorkflow(mockWorkflow)

      // Mock 执行失败
      vi.mocked(enhancedWorkflowExecutor.executeInstance).mockRejectedValue(
        new Error('执行失败')
      )

      const task = await scheduler.triggerWorkflow('test-workflow')

      // 等待任务失败
      await new Promise(resolve => setTimeout(resolve, 2000))

      const updatedTask = scheduler.getTask(task.id)
      expect(updatedTask?.status).toBe(ScheduleTaskStatus.FAILED)
      expect(updatedTask?.metadata.error).toBe('执行失败')
    })
  })

  describe('任务取消', () => {
    it('应该取消任务', async () => {
      scheduler.registerWorkflow(mockWorkflow)

      const task = await scheduler.triggerWorkflow('test-workflow')
      await scheduler.cancelTask(task.id)

      const updatedTask = scheduler.getTask(task.id)
      expect(updatedTask?.status).toBe(ScheduleTaskStatus.CANCELLED)
    })

    it('应该取消运行中的实例', async () => {
      scheduler.registerWorkflow(mockWorkflow)

      const task = await scheduler.triggerWorkflow('test-workflow')

      // 等待任务开始运行
      await new Promise(resolve => setTimeout(resolve, 100))

      await scheduler.cancelTask(task.id)

      expect(enhancedWorkflowExecutor.cancelInstance).toHaveBeenCalled()
    })
  })

  describe('任务查询', () => {
    beforeEach(async () => {
      scheduler.registerWorkflow(mockWorkflow)

      // 创建多个任务
      for (let i = 0; i < 5; i++) {
        await scheduler.triggerWorkflow('test-workflow', { index: i })
      }
    })

    it('应该获取所有任务', () => {
      const tasks = scheduler.getAllTasks()
      expect(tasks.length).toBeGreaterThanOrEqual(5)
    })

    it('应该按工作流 ID 过滤任务', () => {
      const tasks = scheduler.getAllTasks({ workflowId: 'test-workflow' })
      expect(tasks.every(t => t.workflowId === 'test-workflow')).toBe(true)
    })

    it('应该按状态过滤任务', () => {
      // 等待一些任务完成
      return new Promise<void>(resolve => {
        setTimeout(() => {
          const completedTasks = scheduler.getAllTasks({
            status: ScheduleTaskStatus.COMPLETED,
          })
          expect(completedTasks.every(t => t.status === ScheduleTaskStatus.COMPLETED)).toBe(true)
          resolve()
        }, 2000)
      })
    })
  })

  describe('统计信息', () => {
    beforeEach(async () => {
      scheduler.registerWorkflow(mockWorkflow)

      // 创建一些任务
      for (let i = 0; i < 3; i++) {
        await scheduler.triggerWorkflow('test-workflow')
      }
    })

    it('应该返回调度器统计信息', () => {
      const stats = scheduler.getStatistics()

      expect(stats.totalTasks).toBeGreaterThanOrEqual(3)
      expect(stats.queueSize).toBeGreaterThanOrEqual(0)
      expect(typeof stats.pendingTasks).toBe('number')
      expect(typeof stats.runningTasks).toBe('number')
      expect(typeof stats.completedTasks).toBe('number')
      expect(typeof stats.failedTasks).toBe('number')
      expect(typeof stats.cancelledTasks).toBe('number')
    })

    it('应该返回工作流统计信息', () => {
      return new Promise<void>(resolve => {
        setTimeout(() => {
          const stats = scheduler.getWorkflowStatistics('test-workflow')

          expect(stats.totalTasks).toBeGreaterThanOrEqual(3)
          expect(typeof stats.successTasks).toBe('number')
          expect(typeof stats.failedTasks).toBe('number')
          expect(typeof stats.avgDuration).toBe('number')
          resolve()
        }, 2000)
      })
    })
  })

  describe('任务重试', () => {
    it('应该自动重试失败的任务', async () => {
      scheduler = new WorkflowScheduler({
        maxConcurrentTasks: 1,
        taskQueueSize: 10,
        taskTimeout: 1000,
        retryPolicy: {
          maxRetries: 2,
          backoff: 'fixed',
          interval: 100,
        },
      })

      scheduler.registerWorkflow(mockWorkflow)

      let attemptCount = 0
      vi.mocked(enhancedWorkflowExecutor.executeInstance).mockImplementation(async () => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('模拟失败')
        }
        return {
          id: 'instance-123',
          workflowId: 'test-workflow',
          workflowVersion: 1,
          status: 'completed' as any,
          progress: {
            total: 2,
            completed: 2,
            failed: 0,
            percentage: 100,
          },
          nodeResults: new Map(),
          data: {
            inputs: {},
            outputs: {},
            variables: {},
          },
          metadata: {
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
            duration: 1000,
            triggeredBy: 'system',
            triggerType: 'manual',
          },
        } as any
      })

      const task = await scheduler.triggerWorkflow('test-workflow')

      // 等待重试完成
      await new Promise(resolve => setTimeout(resolve, 2000))

      const updatedTask = scheduler.getTask(task.id)
      expect(updatedTask?.status).toBe(ScheduleTaskStatus.COMPLETED)
      expect(attemptCount).toBeGreaterThan(1)
    })
  })

  describe('任务超时', () => {
    it('应该超时长时间运行的任务', async () => {
      scheduler = new WorkflowScheduler({
        maxConcurrentTasks: 1,
        taskQueueSize: 10,
        taskTimeout: 500, // 500ms 超时
      })

      scheduler.registerWorkflow(mockWorkflow)

      // Mock 慢速执行
      vi.mocked(enhancedWorkflowExecutor.executeInstance).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({} as any), 10000))
      )

      const task = await scheduler.triggerWorkflow('test-workflow')

      // 等待超时
      await new Promise(resolve => setTimeout(resolve, 1000))

      const updatedTask = scheduler.getTask(task.id)
      expect(updatedTask?.status).toBe(ScheduleTaskStatus.FAILED)
      expect(updatedTask?.metadata.error).toBe('任务超时')
    })
  })

  describe('任务清理', () => {
    it('应该清理已完成的任务', async () => {
      scheduler.registerWorkflow(mockWorkflow)

      // 创建一些任务
      const tasks: any[] = []
      for (let i = 0; i < 5; i++) {
        tasks.push(scheduler.triggerWorkflow('test-workflow'))
      }

      await Promise.all(tasks)

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 清理已完成的任务
      scheduler.cleanupCompletedTasks(0) // 立即清理

      const allTasks = scheduler.getAllTasks()
      const completedTasks = allTasks.filter(
        t =>
          t.status === ScheduleTaskStatus.COMPLETED ||
          t.status === ScheduleTaskStatus.FAILED ||
          t.status === ScheduleTaskStatus.CANCELLED
      )

      // 已完成的任务应该被清理
      expect(completedTasks.length).toBe(0)
    })
  })

  describe('调度器停止', () => {
    it('应该停止所有运行的任务', async () => {
      scheduler.registerWorkflow(mockWorkflow)

      // 创建多个任务
      const tasks: any[] = []
      for (let i = 0; i < 5; i++) {
        tasks.push(scheduler.triggerWorkflow('test-workflow'))
      }

      await Promise.all(tasks)

      // 等待一些任务开始运行
      await new Promise(resolve => setTimeout(resolve, 100))

      // 停止调度器
      await scheduler.stop()

      const stats = scheduler.getStatistics()
      expect(stats.runningTasks).toBe(0)
    })
  })
})
