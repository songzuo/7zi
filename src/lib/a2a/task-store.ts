/**
 * A2A Protocol v2 - Enhanced Task Store
 * 增强任务存储，支持优先级、异步状态跟踪、完成追踪
 */

import { EventEmitter } from 'events'
import {
  TaskWithPriority,
  AsyncTaskStatus,
  TaskStore,
  TaskPriority,
  A2AError,
  A2AErrorType,
  generateId,
  isValidPriority,
} from './types'

/**
 * 内存任务存储
 */
export class InMemoryTaskStore implements TaskStore {
  protected tasks: Map<string, TaskWithPriority> = new Map()
  protected asyncStatus: Map<string, AsyncTaskStatus> = new Map()
  private eventEmitter = new EventEmitter()

  /**
   * 创建带优先级的任务
   */
  createTaskWithPriority(
    context: string,
    message: Record<string, unknown>,
    priority: TaskPriority
  ): TaskWithPriority {
    if (!isValidPriority(priority)) {
      throw new A2AError(A2AErrorType.INVALID_PRIORITY, `Invalid priority: ${priority}`)
    }

    const id = generateId('task')
    const task: TaskWithPriority = {
      id,
      name: context,
      description: `Task created from context: ${context}`,
      requesterId: 'system',
      status: 'pending',
      priority,
      createdAt: new Date().toISOString(),
      input: message,
    }

    this.tasks.set(id, task)

    // 初始化异步状态
    this.asyncStatus.set(id, {
      state: 'pending',
      progress: 0,
    })

    // 发出事件
    this.eventEmitter.emit('task:created', { task })

    return task
  }

  /**
   * 更新任务优先级
   */
  updateTaskPriority(taskId: string, priority: TaskPriority): boolean {
    if (!isValidPriority(priority)) {
      return false
    }

    const task = this.tasks.get(taskId)
    if (!task) {
      return false
    }

    task.priority = priority
    this.tasks.set(taskId, task)

    // 发出事件
    this.eventEmitter.emit('task:updated', { task })

    return true
  }

  /**
   * 根据优先级获取任务
   */
  getTasksByPriority(priority: TaskPriority): TaskWithPriority[] {
    if (!isValidPriority(priority)) {
      return []
    }

    return Array.from(this.tasks.values()).filter(task => task.priority === priority)
  }

  /**
   * 获取最高优先级的任务
   */
  getHighestPriorityTasks(limit: number): TaskWithPriority[] {
    const priorityOrder: TaskPriority[] = ['critical', 'high', 'normal', 'low']

    const result: TaskWithPriority[] = []

    for (const priority of priorityOrder) {
      const tasks = this.getTasksByPriority(priority)
        .filter(t => t.status === 'pending')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      result.push(...tasks)

      if (result.length >= limit) {
        break
      }
    }

    return result.slice(0, limit)
  }

  /**
   * 标记任务为已完成
   */
  markTaskCompleted(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) {
      return false
    }

    task.status = 'completed'
    task.completedAt = new Date().toISOString()
    this.tasks.set(taskId, task)

    // 更新异步状态
    const status = this.asyncStatus.get(taskId)
    if (status) {
      status.state = 'completed'
      status.progress = 100
      this.asyncStatus.set(taskId, status)
    }

    // 发出事件
    this.eventEmitter.emit('task:completed', { task })

    return true
  }

  /**
   * 获取异步任务状态
   */
  getAsyncTaskStatus(taskId: string): AsyncTaskStatus | null {
    const task = this.tasks.get(taskId)
    if (!task) {
      return null
    }

    const status = this.asyncStatus.get(taskId)
    return status || null
  }

  /**
   * 更新异步任务进度
   */
  updateAsyncTaskProgress(taskId: string, progress: number, step?: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) {
      return false
    }

    // 更新任务状态
    if (task.status === 'pending') {
      task.status = 'running'
      task.startedAt = new Date().toISOString()
      this.tasks.set(taskId, task)
    }

    // 更新异步状态
    const status = this.asyncStatus.get(taskId) || {
      state: 'running',
      progress: 0,
    }

    status.state = 'running'
    status.progress = Math.min(100, Math.max(0, progress))
    if (step) {
      status.currentStep = step
    }
    this.asyncStatus.set(taskId, status)

    // 发出事件
    this.eventEmitter.emit('task:progress', { taskId, progress, step })

    return true
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): TaskWithPriority | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): TaskWithPriority[] {
    return Array.from(this.tasks.values())
  }

  /**
   * 删除任务
   */
  deleteTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) {
      return false
    }

    this.tasks.delete(taskId)
    this.asyncStatus.delete(taskId)

    // 发出事件
    this.eventEmitter.emit('task:deleted', { taskId })

    return true
  }

  /**
   * 标记任务为失败
   */
  markTaskFailed(taskId: string, error: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) {
      return false
    }

    task.status = 'failed'
    task.error = error
    this.tasks.set(taskId, task)

    // 更新异步状态
    const status = this.asyncStatus.get(taskId)
    if (status) {
      status.state = 'failed'
      status.error = error
      this.asyncStatus.set(taskId, status)
    }

    // 发出事件
    this.eventEmitter.emit('task:failed', { task, error })

    return true
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) {
      return false
    }

    task.status = 'cancelled'
    this.tasks.set(taskId, task)

    // 更新异步状态
    const status = this.asyncStatus.get(taskId)
    if (status) {
      status.state = 'failed'
      status.error = 'Task cancelled'
      this.asyncStatus.set(taskId, status)
    }

    // 发出事件
    this.eventEmitter.emit('task:cancelled', { task })

    return true
  }

  /**
   * 重试任务
   */
  retryTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) {
      return false
    }

    if (task.status !== 'failed' && task.status !== 'cancelled') {
      return false
    }

    task.status = 'pending'
    task.error = undefined
    task.retryCount = (task.retryCount || 0) + 1
    this.tasks.set(taskId, task)

    // 重置异步状态
    this.asyncStatus.set(taskId, {
      state: 'pending',
      progress: 0,
    })

    // 发出事件
    this.eventEmitter.emit('task:retry', { task })

    return true
  }

  /**
   * 获取任务统计
   */
  getStats(): {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
    byPriority: Record<TaskPriority, number>
  } {
    const tasks = this.getAllTasks()

    const byPriority: Record<TaskPriority, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
    }

    for (const task of tasks) {
      byPriority[task.priority]++
    }

    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      byPriority,
    }
  }

  /**
   * 订阅事件
   */
  on(event: string, listener: (...args: unknown[]) => void): void {
    this.eventEmitter.on(event, listener)
  }

  /**
   * 取消订阅事件
   */
  off(event: string, listener: (...args: unknown[]) => void): void {
    this.eventEmitter.off(event, listener)
  }

  /**
   * 清空所有任务
   */
  clear(): void {
    this.tasks.clear()
    this.asyncStatus.clear()
    this.eventEmitter.emit('tasks:cleared')
  }
}

/**
 * 文件持久化任务存储
 */
export class FileTaskStore extends InMemoryTaskStore {
  private filePath: string
  private flushInterval: NodeJS.Timeout | null = null
  private dirty = false

  constructor(filePath: string) {
    super()
    this.filePath = filePath
    this.load()
    this.startAutoFlush()
  }

  /**
   * 从文件加载任务
   */
  private load(): void {
    try {
      const fs = require('fs')
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'))
        for (const task of data.tasks || []) {
          this.tasks.set(task.id, task)
          if (task.asyncStatus) {
            this.asyncStatus.set(task.id, task.asyncStatus)
          }
        }
      }
    } catch {
      // 文件不存在或解析失败，忽略
    }
  }

  /**
   * 保存任务到文件
   */
  private save(): void {
    try {
      const fs = require('fs')
      const data = {
        tasks: Array.from(this.tasks.values()),
      }
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2))
      this.dirty = false
    } catch (error) {
      console.error('Failed to save tasks:', error)
    }
  }

  /**
   * 开始自动刷新
   */
  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => {
      if (this.dirty) {
        this.save()
      }
    }, 30000) // 每30秒刷新一次
  }

  /**
   * 标记需要保存
   */
  override createTaskWithPriority(
    context: string,
    message: Record<string, unknown>,
    priority: TaskPriority
  ): TaskWithPriority {
    const task = super.createTaskWithPriority(context, message, priority)
    this.dirty = true
    return task
  }

  /**
   * 标记需要保存
   */
  override updateTaskPriority(taskId: string, priority: TaskPriority): boolean {
    const result = super.updateTaskPriority(taskId, priority)
    if (result) {
      this.dirty = true
    }
    return result
  }

  /**
   * 标记需要保存
   */
  override markTaskCompleted(taskId: string): boolean {
    const result = super.markTaskCompleted(taskId)
    if (result) {
      this.dirty = true
    }
    return result
  }

  /**
   * 标记需要保存
   */
  override updateAsyncTaskProgress(
    taskId: string,
    progress: number,
    step?: string
  ): boolean {
    const result = super.updateAsyncTaskProgress(taskId, progress, step)
    if (result) {
      this.dirty = true
    }
    return result
  }

  /**
   * 标记需要保存
   */
  override deleteTask(taskId: string): boolean {
    const result = super.deleteTask(taskId)
    if (result) {
      this.dirty = true
    }
    return result
  }

  /**
   * 手动刷新
   */
  flush(): void {
    if (this.dirty) {
      this.save()
    }
  }

  /**
   * 关闭存储
   */
  close(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flush()
  }
}

// 单例实例
let defaultStore: InMemoryTaskStore | null = null

/**
 * 获取默认任务存储实例
 */
export function getTaskStore(): InMemoryTaskStore {
  if (!defaultStore) {
    defaultStore = new InMemoryTaskStore()
  }
  return defaultStore
}

/**
 * 获取文件持久化任务存储实例
 */
export function getFileTaskStore(filePath: string): FileTaskStore {
  return new FileTaskStore(filePath)
}