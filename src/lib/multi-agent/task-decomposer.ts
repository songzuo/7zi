/**
 * 任务分解引擎 - 将复杂任务分解为子任务并分配给合适的 Agent
 */

import { EventEmitter } from 'events'
import {
  Task,
  SubTask,
  TaskStatus,
  MessagePriority,
  TaskEvent,
  MultiAgentError,
  MultiAgentErrorType,
  MessageType,
} from './types'
import { AgentRegistry } from './registry'
import { MessageBus } from './message-bus'
import { logger } from '@/lib/logger'

// 任务分解策略
export enum DecompositionStrategy {
  SEQUENTIAL = 'sequential', // 顺序执行
  PARALLEL = 'parallel', // 并行执行
  PIPELINE = 'pipeline', // 管道执行
  HIERARCHICAL = 'hierarchical', // 分层执行
}

// 子任务模板
export interface SubTaskTemplate {
  id: string
  name: string
  description: string
  requiredCapabilities: string[]
  dependencies?: string[]
}

// 任务模板
export interface TaskTemplate {
  type: string
  name: string
  description: string
  strategy: DecompositionStrategy
  subTasks: SubTaskTemplate[]
}

// 任务分解器接口
export interface ITaskDecomposer {
  decompose(task: Task, template?: TaskTemplate): Promise<SubTask[]>
  findAgentForTask(subTask: SubTask): Promise<string | null>
}

export class TaskDecomposer extends EventEmitter {
  private registry: AgentRegistry
  private messageBus: MessageBus
  private taskTemplates: Map<string, TaskTemplate> = new Map()
  private activeTasks: Map<string, Task> = new Map()
  private maxSubTasks: number
  private enableAutoRetry: boolean
  /** 最大重试次数（不含首次执行）—— 即总尝试次数 = 1 + maxRetries */
  private maxRetries: number
  /** 重试基础退避时长（毫秒），实际延迟 = base * 2^(第 n 次重试) */
  private retryBaseDelayMs: number
  /** 退避抖动上限（毫秒）—— 避免多个子任务同时重试打爆下游 */
  private retryJitterMs: number
  /** 注入的延迟函数 —— 测试可 mock，生产用真实定时器 */
  private sleep: (ms: number) => Promise<void>

  constructor(
    registry: AgentRegistry,
    messageBus: MessageBus,
    options?: {
      maxSubTasks?: number
      enableAutoRetry?: boolean
      /**
       * 最大**重试**次数（不含首次执行）。
       * 默认 2 → 总尝试次数 3（首次 + 2 次重试）。
       */
      maxRetries?: number
      /** 重试基础退避时长（毫秒），默认 1000 */
      retryBaseDelayMs?: number
      /** 退避抖动上限（毫秒），默认 500 */
      retryJitterMs?: number
      /** 注入延迟函数 —— 测试用 vi.fn() 替代真实等待 */
      sleep?: (ms: number) => Promise<void>
    }
  ) {
    super()
    this.registry = registry
    this.messageBus = messageBus
    this.maxSubTasks = options?.maxSubTasks || 10
    this.enableAutoRetry = options?.enableAutoRetry ?? true
    this.maxRetries = options?.maxRetries ?? 2
    this.retryBaseDelayMs = options?.retryBaseDelayMs ?? 1000
    this.retryJitterMs = options?.retryJitterMs ?? 500
    this.sleep =
      options?.sleep ??
      ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)))

    // 注册内置任务模板
    this.registerBuiltInTemplates()
  }

  /**
   * 创建并分解任务
   */
  async createTask(
    name: string,
    description: string,
    input: Record<string, unknown>,
    options?: {
      requesterId?: string
      template?: TaskTemplate
      priority?: MessagePriority
      deadline?: number
    }
  ): Promise<Task> {
    const taskId = this.generateId()

    const task: Task = {
      id: taskId,
      name,
      description,
      requesterId: options?.requesterId || 'system',
      status: TaskStatus.PENDING,
      subTasks: [],
      input,
      createdAt: Date.now(),
      priority: options?.priority || MessagePriority.NORMAL,
      deadline: options?.deadline,
    }

    // 分解任务
    if (options?.template) {
      task.subTasks = await this.decomposeWithTemplate(task, options.template)
    } else {
      task.subTasks = await this.autoDecompose(task)
    }

    // 保存任务
    this.activeTasks.set(taskId, task)

    // 发出事件
    this.emit('task.created', {
      type: 'created',
      taskId: task.id,
      task,
    } as TaskEvent)

    return task
  }

  /**
   * 使用模板分解任务
   */
  async decomposeWithTemplate(task: Task, template: TaskTemplate): Promise<SubTask[]> {
    const subTasks: SubTask[] = []

    for (const templateSubTask of template.subTasks) {
      const subTask: SubTask = {
        id: `${task.id}-${templateSubTask.id}`,
        parentTaskId: task.id,
        name: templateSubTask.name,
        description: templateSubTask.description,
        requiredCapabilities: templateSubTask.requiredCapabilities,
        dependencies:
          templateSubTask.dependencies?.map(depId => ({
            taskId: `${task.id}-${depId}`,
            required: true,
          })) || [],
        status: TaskStatus.PENDING,
        input: null, // 从父任务输入继承
        createdAt: Date.now(),
        priority: task.priority,
      }

      subTasks.push(subTask)
    }

    return subTasks
  }

  /**
   * 自动分解任务（基于任务类型和能力匹配）
   */
  async autoDecompose(task: Task): Promise<SubTask[]> {
    const subTasks: SubTask[] = []

    // 分析任务类型
    const taskType = this.analyzeTaskType(task)

    // 根据任务类型生成子任务
    const subTaskTemplates = await this.generateSubTaskTemplates(task, taskType)

    // 创建子任务
    for (let i = 0; i < subTaskTemplates.length; i++) {
      const template = subTaskTemplates[i]

      const subTask: SubTask = {
        id: `${task.id}-${i + 1}`,
        parentTaskId: task.id,
        name: template.name,
        description: template.description,
        requiredCapabilities: template.requiredCapabilities,
        dependencies:
          template.dependencies?.map(depId => ({
            taskId: `${task.id}-${depId}`,
            required: true,
          })) || [],
        status: TaskStatus.PENDING,
        input: null,
        createdAt: Date.now(),
        priority: task.priority,
      }

      subTasks.push(subTask)
    }

    return subTasks
  }

  /**
   * 分析任务类型
   */
  private analyzeTaskType(task: Task): string {
    const description = task.description.toLowerCase()

    // 简单的关键词匹配
    if (description.includes('analyze') || description.includes('research')) {
      return 'analysis'
    }
    if (description.includes('code') || description.includes('implement')) {
      return 'development'
    }
    if (description.includes('test') || description.includes('verify')) {
      return 'testing'
    }
    if (description.includes('review') || description.includes('audit')) {
      return 'review'
    }
    if (description.includes('deploy') || description.includes('publish')) {
      return 'deployment'
    }

    return 'general'
  }

  /**
   * 生成子任务模板
   */
  private async generateSubTaskTemplates(task: Task, taskType: string): Promise<SubTaskTemplate[]> {
    const templates: SubTaskTemplate[] = []

    // 根据任务类型生成默认分解
    switch (taskType) {
      case 'analysis':
        templates.push(
          {
            id: 'gather',
            name: '收集信息',
            description: '收集相关数据和信息',
            requiredCapabilities: ['web-search', 'data-collection'],
          },
          {
            id: 'analyze',
            name: '分析数据',
            description: '分析收集的数据',
            requiredCapabilities: ['data-analysis', 'reasoning'],
            dependencies: ['gather'],
          },
          {
            id: 'report',
            name: '生成报告',
            description: '生成分析报告',
            requiredCapabilities: ['report-generation', 'writing'],
            dependencies: ['analyze'],
          }
        )
        break

      case 'development':
        templates.push(
          {
            id: 'design',
            name: '设计方案',
            description: '设计技术方案',
            requiredCapabilities: ['architecture', 'design'],
          },
          {
            id: 'implement',
            name: '实现代码',
            description: '编写代码实现',
            requiredCapabilities: ['coding', 'implementation'],
            dependencies: ['design'],
          },
          {
            id: 'test',
            name: '测试验证',
            description: '测试代码正确性',
            requiredCapabilities: ['testing', 'verification'],
            dependencies: ['implement'],
          }
        )
        break

      case 'testing':
        templates.push(
          {
            id: 'plan',
            name: '制定测试计划',
            description: '设计测试用例和策略',
            requiredCapabilities: ['test-planning', 'quality-assurance'],
          },
          {
            id: 'execute',
            name: '执行测试',
            description: '运行测试用例',
            requiredCapabilities: ['test-execution', 'automation'],
            dependencies: ['plan'],
          },
          {
            id: 'report',
            name: '生成测试报告',
            description: '汇总测试结果',
            requiredCapabilities: ['reporting', 'analysis'],
            dependencies: ['execute'],
          }
        )
        break

      default:
        // 通用任务分解
        templates.push({
          id: 'execute',
          name: '执行任务',
          description: task.description,
          requiredCapabilities: ['general-task-execution'],
        })
    }

    // 限制子任务数量
    return templates.slice(0, this.maxSubTasks)
  }

  /**
   * 为子任务分配 Agent
   */
  async assignAgent(subTask: SubTask): Promise<string | null> {
    const agent = this.registry.findBestAgent(subTask.requiredCapabilities)
    if (!agent) {
      return null
    }

    subTask.assignedAgentId = agent.id
    return agent.id
  }

  /**
   * 执行任务
   */
  async executeTask(taskId: string): Promise<unknown> {
    const task = this.activeTasks.get(taskId)
    if (!task) {
      throw new MultiAgentError(MultiAgentErrorType.VALIDATION_ERROR, `Task ${taskId} not found`)
    }

    if (task.status !== TaskStatus.PENDING) {
      throw new MultiAgentError(
        MultiAgentErrorType.VALIDATION_ERROR,
        `Task ${taskId} is not in pending state`
      )
    }

    // 更新任务状态
    task.status = TaskStatus.RUNNING
    task.startedAt = Date.now()
    this.emit('task.started', {
      type: 'started',
      taskId,
      task,
    } as TaskEvent)

    try {
      // 验证无循环依赖
      this.validateNoCircularDependencies(task.subTasks)

      // 按依赖顺序执行子任务
      const results = await this.executeSubTasks(task)

      // 汇总结果
      task.output = this.aggregateResults(results)
      task.status = TaskStatus.COMPLETED
      task.completedAt = Date.now()

      this.emit('task.completed', {
        type: 'completed',
        taskId,
        task,
      } as TaskEvent)

      return task.output
    } catch (error) {
      task.status = TaskStatus.FAILED
      task.error = error instanceof Error ? error.message : String(error)
      task.completedAt = Date.now()

      this.emit('task.failed', {
        type: 'failed',
        taskId,
        task,
        error,
      } as TaskEvent)

      throw error
    }
  }

  /**
   * 执行子任务
   */
  private async executeSubTasks(task: Task): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>()
    const completed = new Set<string>()

    // 持续执行直到所有子任务完成或无法继续
    while (completed.size < task.subTasks.length) {
      // 找到可以执行的子任务
      const readyTasks = task.subTasks.filter(
        subTask =>
          subTask.status === TaskStatus.PENDING && this.areDependenciesMet(subTask, completed)
      )

      if (readyTasks.length === 0) {
        // 检查是否有未完成但依赖未满足的任务
        const waitingTasks = task.subTasks.filter(
          subTask =>
            subTask.status === TaskStatus.PENDING && !this.areDependenciesMet(subTask, completed)
        )

        if (waitingTasks.length > 0) {
          throw new MultiAgentError(
            MultiAgentErrorType.DEPENDENCY_FAILED,
            'Cannot proceed: some dependencies cannot be satisfied'
          )
        }

        // 检查是否有失败的任务
        const failedTask = task.subTasks.find(subTask => subTask.status === TaskStatus.FAILED)
        if (failedTask) {
          throw new MultiAgentError(
            MultiAgentErrorType.DEPENDENCY_FAILED,
            `Sub-task ${failedTask.id} failed`
          )
        }

        break
      }

      // 并行执行就绪的子任务
      const executionPromises = readyTasks.map(subTask => this.executeSubTask(subTask, results))

      await Promise.all(executionPromises)

      // 更新完成状态
      for (const subTask of readyTasks) {
        if (subTask.status === TaskStatus.COMPLETED) {
          completed.add(subTask.id)
        }
      }
    }

    return results
  }

  /**
   * 执行单个子任务
   */
  private async executeSubTask(
    subTask: SubTask,
    previousResults: Map<string, unknown>
  ): Promise<void> {
    // 分配 Agent
    if (!subTask.assignedAgentId) {
      const agentId = await this.assignAgent(subTask)
      if (!agentId) {
        subTask.status = TaskStatus.FAILED
        subTask.error = `No available agent with capabilities: ${subTask.requiredCapabilities.join(', ')}`
        this.emit('task.updated', {
          type: 'updated',
          taskId: subTask.parentTaskId,
          data: subTask as unknown as Record<string, unknown>,
        } as TaskEvent)
        return
      }
    }

    // 更新状态
    subTask.status = TaskStatus.RUNNING
    subTask.startedAt = Date.now()

    this.emit('task.updated', {
      type: 'updated',
      taskId: subTask.parentTaskId,
      data: subTask as unknown as Record<string, unknown>,
    } as TaskEvent)

    try {
      await this.executeSubTaskWithRetry(subTask, previousResults)
    } catch (error) {
      // 重试全部用尽 —— executeSubTaskWithRetry 已经把状态和错误写好了
      subTask.status = TaskStatus.FAILED
      subTask.completedAt = Date.now()

      this.emit('task.updated', {
        type: 'updated',
        taskId: subTask.parentTaskId,
        data: subTask as unknown as Record<string, unknown>,
      } as TaskEvent)
    }
  }

  /**
   * 执行子任务，失败时按配置自动重试
   *
   * 重试策略：
   *   - 总尝试次数 = 1 + maxRetries（默认 1 + 2 = 3 次）
   *   - 退避：指数退避 base * 2^(已重试次数)，上限由 baseDelayMs 决定
   *   - 抖动：额外加一个 [0, jitterMs] 的随机偏移，避免多个子任务同时重试
   *   - 全部失败后，错误信息里带上尝试次数
   */
  private async executeSubTaskWithRetry(
    subTask: SubTask,
    previousResults: Map<string, unknown>
  ): Promise<void> {
    const maxAttempts = this.enableAutoRetry ? this.maxRetries + 1 : 1
    let lastError: unknown

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // 准备输入（包含之前子任务的输出）
        const input = this.prepareSubTaskInput(subTask, previousResults)

        // 通过消息总线发送任务给 Agent
        const response = await this.messageBus.request(
          subTask.assignedAgentId!,
          {
            type: 'task.execute',
            subTaskId: subTask.id,
            input,
          },
          {
            priority: subTask.priority,
            timeout: 60000, // 60秒超时
          }
        )

        // 更新结果
        subTask.output = response
        subTask.status = TaskStatus.COMPLETED
        subTask.completedAt = Date.now()
        previousResults.set(subTask.id, response)

        this.emit('task.updated', {
          type: 'updated',
          taskId: subTask.parentTaskId,
          data: subTask as unknown as Record<string, unknown>,
        } as TaskEvent)

        return
      } catch (error) {
        lastError = error

        const isLastAttempt = attempt === maxAttempts - 1
        if (isLastAttempt) {
          break
        }

        // 指数退避 + 抖动
        const backoff = this.retryBaseDelayMs * Math.pow(2, attempt)
        const jitter = this.retryJitterMs > 0 ? Math.random() * this.retryJitterMs : 0
        const delay = backoff + jitter

        logger.warn('[multi-agent] 子任务执行失败，准备重试', {
          subTaskId: subTask.id,
          attempt: attempt + 1,
          maxAttempts,
          delayMs: Math.round(delay),
          error: error instanceof Error ? error.message : String(error),
        })

        // 重试期间回到 RUNNING —— 表示"正在重新尝试"
        subTask.status = TaskStatus.RUNNING
        this.emit('task.updated', {
          type: 'updated',
          taskId: subTask.parentTaskId,
          data: subTask as unknown as Record<string, unknown>,
        } as TaskEvent)

        await this.sleep(delay)
      }
    }

    // 全部失败
    const message = lastError instanceof Error ? lastError.message : String(lastError)
    subTask.status = TaskStatus.FAILED
    subTask.error =
      maxAttempts > 1
        ? `${message}（已重试 ${maxAttempts - 1} 次，共尝试 ${maxAttempts} 次）`
        : message
    subTask.completedAt = Date.now()
  }

  /**
   * 检查依赖是否满足
   */
  private areDependenciesMet(subTask: SubTask, completed: Set<string>): boolean {
    return subTask.dependencies.every(dep => {
      if (!dep.required) {
        return true
      }
      return completed.has(dep.taskId)
    })
  }

  /**
   * 准备子任务输入
   */
  private prepareSubTaskInput(
    subTask: SubTask,
    previousResults: Map<string, unknown>
  ): Record<string, unknown> {
    const input: Record<string, unknown> = {
      ...(typeof subTask.input === 'object' && subTask.input !== null ? subTask.input : {}),
      dependencyResults: {} as Record<string, unknown>,
    }

    // 添加依赖任务的输出
    const depResults = input.dependencyResults as Record<string, unknown>
    for (const dep of subTask.dependencies) {
      const result = previousResults.get(dep.taskId)
      if (result) {
        depResults[dep.taskId] = result
      }
    }

    return input
  }

  /**
   * 汇总结果
   */
  private aggregateResults(results: Map<string, unknown>): Record<string, unknown> {
    const subTaskResults: Record<string, unknown> = {}
    results.forEach((value, key) => {
      subTaskResults[key] = value
    })
    return { subTaskResults }
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<void> {
    const task = this.activeTasks.get(taskId)
    if (!task) {
      throw new MultiAgentError(MultiAgentErrorType.VALIDATION_ERROR, `Task ${taskId} not found`)
    }

    // 取消所有运行中的子任务
    for (const subTask of task.subTasks) {
      if (subTask.status === TaskStatus.RUNNING) {
        subTask.status = TaskStatus.CANCELLED

        // 发送取消消息
        if (subTask.assignedAgentId) {
          await this.messageBus.send({
            headers: {
              id: this.generateId(),
              type: MessageType.TASK_CANCEL,
              from: 'task-decomposer',
              to: subTask.assignedAgentId,
              priority: MessagePriority.HIGH,
              timestamp: Date.now(),
            },
            body: {
              subTaskId: subTask.id,
              reason: 'Task cancelled by user',
            },
          })
        }
      }
    }

    task.status = TaskStatus.CANCELLED
    task.completedAt = Date.now()

    this.emit('task.cancelled', {
      type: 'cancelled',
      taskId,
      task,
    } as TaskEvent)
  }

  /**
   * 获取任务状态
   */
  getTask(taskId: string): Task | undefined {
    return this.activeTasks.get(taskId)
  }

  /**
   * 获取所有活动任务
   */
  getAllTasks(): Task[] {
    return Array.from(this.activeTasks.values())
  }

  /**
   * 注册任务模板
   */
  registerTemplate(template: TaskTemplate): void {
    this.taskTemplates.set(template.type, template)
  }

  /**
   * 获取任务模板
   */
  getTemplate(type: string): TaskTemplate | undefined {
    return this.taskTemplates.get(type)
  }

  /**
   * 注册内置模板
   */
  private registerBuiltInTemplates(): void {
    // 代码审查模板
    this.registerTemplate({
      type: 'code-review',
      name: '代码审查',
      description: '自动代码审查流程',
      strategy: DecompositionStrategy.PIPELINE,
      subTasks: [
        {
          id: 'parse',
          name: '解析代码',
          description: '解析代码结构',
          requiredCapabilities: ['code-parsing', 'ast-analysis'],
        },
        {
          id: 'analyze',
          name: '分析代码质量',
          description: '分析代码质量和潜在问题',
          requiredCapabilities: ['code-analysis', 'static-analysis'],
          dependencies: ['parse'],
        },
        {
          id: 'security',
          name: '安全检查',
          description: '检查安全漏洞',
          requiredCapabilities: ['security-analysis', 'vulnerability-detection'],
          dependencies: ['parse'],
        },
        {
          id: 'report',
          name: '生成审查报告',
          description: '汇总审查结果',
          requiredCapabilities: ['report-generation', 'writing'],
          dependencies: ['analyze', 'security'],
        },
      ],
    })

    // 文档生成模板
    this.registerTemplate({
      type: 'doc-generation',
      name: '文档生成',
      description: '自动生成项目文档',
      strategy: DecompositionStrategy.PARALLEL,
      subTasks: [
        {
          id: 'api-docs',
          name: 'API 文档',
          description: '生成 API 文档',
          requiredCapabilities: ['api-documentation', 'code-analysis'],
        },
        {
          id: 'readme',
          name: 'README 文档',
          description: '生成 README 文档',
          requiredCapabilities: ['readme-generation', 'writing'],
        },
        {
          id: 'examples',
          name: '示例代码',
          description: '生成示例代码',
          requiredCapabilities: ['code-generation', 'example-writing'],
        },
      ],
    })
  }

  /**
   * 清理完成的任务
   */
  cleanupCompletedTasks(): void {
    const toRemove: string[] = []

    this.activeTasks.forEach((task, id) => {
      if (
        task.status === TaskStatus.COMPLETED ||
        task.status === TaskStatus.FAILED ||
        task.status === TaskStatus.CANCELLED
      ) {
        toRemove.push(id)
      }
    })

    toRemove.forEach(id => this.activeTasks.delete(id))
  }

  /**
   * 验证子任务无循环依赖
   * 防止死锁：如果存在循环依赖，抛出错误
   */
  private validateNoCircularDependencies(subTasks: SubTask[]): void {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const dfs = (taskId: string): boolean => {
      visited.add(taskId)
      recursionStack.add(taskId)

      const task = subTasks.find(t => t.id === taskId)
      if (task) {
        for (const dep of task.dependencies) {
          if (!visited.has(dep.taskId)) {
            if (dfs(dep.taskId)) return true
          } else if (recursionStack.has(dep.taskId)) {
            throw new MultiAgentError(
              MultiAgentErrorType.VALIDATION_ERROR,
              `Circular dependency detected: ${taskId} -> ${dep.taskId}`
            )
          }
        }
      }

      recursionStack.delete(taskId)
      return false
    }

    for (const task of subTasks) {
      if (!visited.has(task.id)) {
        dfs(task.id)
      }
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
