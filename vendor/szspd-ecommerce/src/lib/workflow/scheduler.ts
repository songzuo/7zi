/**
 * 工作流调度器
 * 负责管理工作流的触发和执行调度
 */

import { WorkflowDefinition, WorkflowInstance, InstanceStatus } from '@/types/workflow'
import { enhancedWorkflowExecutor } from './executor'
import { TriggerManager, TriggerDefinition, TriggerType, TriggerStatus } from './triggers'

/**
 * 调度任务状态
 */
export enum ScheduleTaskStatus {
  PENDING = 'pending', // 待执行
  RUNNING = 'running', // 执行中
  COMPLETED = 'completed', // 已完成
  FAILED = 'failed', // 失败
  CANCELLED = 'cancelled', // 已取消
}

/**
 * 调度任务
 */
export interface ScheduleTask {
  id: string
  workflowId: string
  triggerId?: string
  status: ScheduleTaskStatus

  // 执行配置
  inputs?: Record<string, unknown>
  options?: {
    retryCount?: number
    timeout?: number
    triggeredBy?: string
    triggerType?: 'manual' | 'api' | 'scheduled' | 'webhook'
  }

  // 实例信息
  instanceId?: string

  // 元数据
  metadata: {
    createdAt: string
    startedAt?: string
    completedAt?: string
    duration?: number
    error?: string
  }
}

/**
 * 调度器配置
 */
export interface SchedulerConfig {
  maxConcurrentTasks?: number // 最大并发任务数
  taskQueueSize?: number // 任务队列大小
  taskTimeout?: number // 默认任务超时时间（毫秒）
  retryPolicy?: {
    maxRetries: number
    backoff: 'fixed' | 'exponential'
    interval: number
  }
}

/**
 * 工作流调度器
 */
export class WorkflowScheduler {
  private executor: typeof enhancedWorkflowExecutor
  private triggerManager: TriggerManager
  private tasks: Map<string, ScheduleTask> = new Map()
  private taskQueue: ScheduleTask[] = []
  private runningTasks: Set<string> = new Set()

  private config: Required<SchedulerConfig>

  constructor(config?: Partial<SchedulerConfig>) {
    this.executor = enhancedWorkflowExecutor
    this.triggerManager = new TriggerManager()
    this.config = {
      maxConcurrentTasks: config?.maxConcurrentTasks || 10,
      taskQueueSize: config?.taskQueueSize || 100,
      taskTimeout: config?.taskTimeout || 300000, // 5 分钟
      retryPolicy: config?.retryPolicy || {
        maxRetries: 3,
        backoff: 'exponential',
        interval: 1000,
      },
    }

    // 初始化触发器管理器
    this.setupTriggerManager()
  }

  /**
   * 注册工作流
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    // 注册到执行器
    this.executor.registerWorkflow(workflow)

    // 如果工作流有触发器，也注册触发器
    const triggers = this.triggerManager.getWorkflowTriggers(workflow.id)
    for (const trigger of triggers) {
      if (trigger.status === TriggerStatus.ACTIVE) {
        this.triggerManager.startTrigger(trigger.id).catch(error => {
          console.error(`启动触发器失败: ${error.message}`)
        })
      }
    }
  }

  /**
   * 注销工作流
   */
  unregisterWorkflow(workflowId: string): void {
    // 停止所有相关触发器
    const triggers = this.triggerManager.getWorkflowTriggers(workflowId)
    for (const trigger of triggers) {
      this.triggerManager.stopTrigger(trigger.id).catch(error => {
        console.error(`停止触发器失败: ${error.message}`)
      })
    }

    // 清理工作流实例
    this.executor.clearInstances(workflowId)
  }

  /**
   * 添加触发器
   */
  async addTrigger(trigger: TriggerDefinition): Promise<void> {
    await this.triggerManager.registerTrigger(trigger)
  }

  /**
   * 移除触发器
   */
  async removeTrigger(triggerId: string): Promise<void> {
    await this.triggerManager.unregisterTrigger(triggerId)
  }

  /**
   * 启动触发器
   */
  async startTrigger(triggerId: string): Promise<void> {
    await this.triggerManager.startTrigger(triggerId)
  }

  /**
   * 停止触发器
   */
  async stopTrigger(triggerId: string): Promise<void> {
    await this.triggerManager.stopTrigger(triggerId)
  }

  /**
   * 手动触发工作流
   */
  async triggerWorkflow(
    workflowId: string,
    inputs?: Record<string, unknown>,
    options?: {
      triggeredBy?: string
      triggerType?: 'manual' | 'api' | 'scheduled' | 'webhook'
    }
  ): Promise<ScheduleTask> {
    // 创建调度任务
    const task: ScheduleTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      status: ScheduleTaskStatus.PENDING,
      inputs,
      options: {
        ...options,
        triggeredBy: options?.triggeredBy || 'system',
        triggerType: options?.triggerType || 'manual',
      },
      metadata: {
        createdAt: new Date().toISOString(),
      },
    }

    // 添加到任务队列
    if (this.taskQueue.length >= this.config.taskQueueSize) {
      throw new Error('任务队列已满')
    }

    this.taskQueue.push(task)
    this.tasks.set(task.id, task)

    // 尝试执行任务
    this.processQueue()

    return task
  }

  /**
   * 获取任务状态
   */
  getTask(taskId: string): ScheduleTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * 获取所有任务
   */
  getAllTasks(filters?: {
    workflowId?: string
    status?: ScheduleTaskStatus
  }): ScheduleTask[] {
    let tasks = Array.from(this.tasks.values())

    if (filters?.workflowId) {
      tasks = tasks.filter(t => t.workflowId === filters.workflowId)
    }

    if (filters?.status) {
      tasks = tasks.filter(t => t.status === filters.status)
    }

    return tasks.sort((a, b) =>
      new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
    )
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`)
    }

    // 如果任务正在运行，取消实例
    if (task.status === ScheduleTaskStatus.RUNNING && task.instanceId) {
      this.executor.cancelInstance(task.instanceId)
    }

    // 更新任务状态
    task.status = ScheduleTaskStatus.CANCELLED
    task.metadata.completedAt = new Date().toISOString()
    if (task.metadata.startedAt) {
      task.metadata.duration =
        new Date(task.metadata.completedAt).getTime() - new Date(task.metadata.startedAt).getTime()
    }

    // 从运行任务列表中移除
    this.runningTasks.delete(taskId)
  }

  /**
   * 获取调度器统计信息
   */
  getStatistics(): {
    totalTasks: number
    pendingTasks: number
    runningTasks: number
    completedTasks: number
    failedTasks: number
    cancelledTasks: number
    queueSize: number
    activeTriggers: number
  } {
    const tasks = Array.from(this.tasks.values())

    return {
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => t.status === ScheduleTaskStatus.PENDING).length,
      runningTasks: tasks.filter(t => t.status === ScheduleTaskStatus.RUNNING).length,
      completedTasks: tasks.filter(t => t.status === ScheduleTaskStatus.COMPLETED).length,
      failedTasks: tasks.filter(t => t.status === ScheduleTaskStatus.FAILED).length,
      cancelledTasks: tasks.filter(t => t.status === ScheduleTaskStatus.CANCELLED).length,
      queueSize: this.taskQueue.length,
      activeTriggers: this.triggerManager.getAllTriggers({
        status: TriggerStatus.ACTIVE,
      }).length,
    }
  }

  /**
   * 获取工作流统计信息
   */
  getWorkflowStatistics(workflowId: string): {
    totalTasks: number
    successTasks: number
    failedTasks: number
    avgDuration: number
  } {
    const tasks = this.getAllTasks({ workflowId })
    const completed = tasks.filter(t => t.status === ScheduleTaskStatus.COMPLETED)
    const failed = tasks.filter(t => t.status === ScheduleTaskStatus.FAILED)

    const avgDuration =
      completed.length > 0
        ? completed.reduce((sum, t) => sum + (t.metadata.duration || 0), 0) / completed.length
        : 0

    return {
      totalTasks: tasks.length,
      successTasks: completed.length,
      failedTasks: failed.length,
      avgDuration: Math.round(avgDuration),
    }
  }

  /**
   * 停止调度器
   */
  async stop(): Promise<void> {
    // 停止所有触发器
    await this.triggerManager.stopAll()

    // 取消所有运行中的任务
    const runningTaskIds = Array.from(this.runningTasks)
    await Promise.all(runningTaskIds.map(id => this.cancelTask(id).catch(() => {})))

    // 清空队列
    this.taskQueue = []
    this.runningTasks.clear()
  }

  /**
   * 设置触发器管理器
   */
  private setupTriggerManager(): void {
    // 监听触发器激活事件
    this.triggerManager.on('trigger:activated', async (event: {
      triggerId: string
      workflowId: string
      timestamp: string
      payload?: Record<string, unknown>
    }) => {
      try {
        // 获取触发器信息
        const trigger = this.triggerManager.getTrigger(event.triggerId)
        if (!trigger) {
          console.error(`触发器不存在: ${event.triggerId}`)
          return
        }

        // 创建调度任务
        const task = await this.triggerWorkflow(event.workflowId, {
          ...trigger.executionConfig?.inputs,
          ...event.payload,
        }, {
          triggeredBy: 'trigger',
          triggerType: 'scheduled',
        })

        // 记录触发器关联
        task.triggerId = event.triggerId
        this.tasks.set(task.id, task)
      } catch (error) {
        console.error(`处理触发器事件失败: ${error instanceof Error ? error.message : error}`)

        // 更新触发器错误计数
        const trigger = this.triggerManager.getTrigger(event.triggerId)
        if (trigger) {
          trigger.metadata.errorCount++
        }
      }
    })

    // 监听触发器错误事件
    this.triggerManager.on('trigger:error', (event: { triggerId: string; error: Error }) => {
      console.error(`触发器错误 [${event.triggerId}]: ${event.error.message}`)
    })
  }

  /**
   * 处理任务队列
   */
  private processQueue(): void {
    // 如果没有待处理任务或达到最大并发数，直接返回
    if (this.taskQueue.length === 0 || this.runningTasks.size >= this.config.maxConcurrentTasks) {
      return
    }

    // 从队列中取出任务
    const task = this.taskQueue.shift()
    if (!task) {
      return
    }

    // 执行任务
    this.executeTask(task).catch(error => {
      console.error(`任务执行失败 [${task.id}]: ${error.message}`)
    })

    // 继续处理队列
    this.processQueue()
  }

  /**
   * 执行任务
   */
  private async executeTask(task: ScheduleTask): Promise<void> {
    // 更新任务状态
    task.status = ScheduleTaskStatus.RUNNING
    task.metadata.startedAt = new Date().toISOString()
    this.runningTasks.add(task.id)
    this.tasks.set(task.id, task)

    try {
      // 创建工作流实例
      const instance = this.executor.createInstance(
        task.workflowId,
        task.inputs,
        {
          triggeredBy: task.options?.triggeredBy || 'system',
          triggerType: task.options?.triggerType || 'manual',
        }
      )

      // 保存实例 ID
      task.instanceId = instance.id
      this.tasks.set(task.id, task)

      // 设置超时
      const timeoutMs = task.options?.timeout || this.config.taskTimeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('任务超时')), timeoutMs)
      })

      // 执行工作流实例
      await Promise.race([
        this.executor.executeInstance(instance.id),
        timeoutPromise,
      ])

      // 任务成功完成
      task.status = ScheduleTaskStatus.COMPLETED
    } catch (error) {
      // 任务执行失败
      task.status = ScheduleTaskStatus.FAILED
      task.metadata.error = error instanceof Error ? error.message : '未知错误'

      // 尝试重试
      const retryCount = task.options?.retryCount || 0
      if (retryCount < this.config.retryPolicy.maxRetries) {
        // 计算重试延迟
        let delay = this.config.retryPolicy.interval
        if (this.config.retryPolicy.backoff === 'exponential') {
          delay *= Math.pow(2, retryCount)
        }

        // 延迟后重新加入队列
        setTimeout(() => {
          task.status = ScheduleTaskStatus.PENDING
          task.options!.retryCount = retryCount + 1
          this.taskQueue.push(task)
          this.processQueue()
        }, delay)

        return
      }
    } finally {
      // 更新任务完成信息
      task.metadata.completedAt = new Date().toISOString()
      if (task.metadata.startedAt) {
        task.metadata.duration =
          new Date(task.metadata.completedAt).getTime() - new Date(task.metadata.startedAt).getTime()
      }

      // 从运行任务列表中移除
      this.runningTasks.delete(task.id)
      this.tasks.set(task.id, task)

      // 继续处理队列
      this.processQueue()
    }
  }

  /**
   * 清理已完成的任务
   */
  cleanupCompletedTasks(olderThan: number = 3600000): void {
    const now = Date.now()
    const completedTasks = this.getAllTasks().filter(
      t =>
        (t.status === ScheduleTaskStatus.COMPLETED ||
          t.status === ScheduleTaskStatus.FAILED ||
          t.status === ScheduleTaskStatus.CANCELLED) &&
        t.metadata.completedAt &&
        now - new Date(t.metadata.completedAt).getTime() > olderThan
    )

    for (const task of completedTasks) {
      this.tasks.delete(task.id)
    }
  }
}

// 导出单例实例
export const workflowScheduler = new WorkflowScheduler()
