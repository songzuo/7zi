/**
 * Agent 协作协议 - 基于 A2A 的扩展协议
 * 支持任务委托、状态同步、结果交付
 */

import { EventEmitter } from 'events'
import { z } from 'zod'
import {
  A2AMessage,
  Message,
  MessageHeaders,
  MessageType,
  MessagePriority,
  MultiAgentError,
  MultiAgentErrorType,
} from './types'
import { MessageBus } from './message-bus'
import { AgentRegistry } from './registry'
import { TaskDecomposer } from './task-decomposer'

// 协议版本
export const PROTOCOL_VERSION = '1.0'

// 消息类型常量
export const PROTOCOL_MESSAGE_TYPES = {
  // 任务相关
  TASK_DELEGATE: 'task.delegate',
  TASK_STATUS: 'task.status',
  TASK_RESULT: 'task.result',
  TASK_CANCEL: 'task.cancel',
  TASK_PROGRESS: 'task.progress',

  // 状态同步
  STATE_SYNC: 'state.sync',
  STATE_QUERY: 'state.query',
  STATE_UPDATE: 'state.update',

  // 能力查询
  CAPABILITY_QUERY: 'capability.query',
  CAPABILITY_RESPONSE: 'capability.response',

  // 服务发现
  SERVICE_DISCOVER: 'service.discover',
  SERVICE_ANNOUNCE: 'service.announce',

  // 心跳
  HEARTBEAT: 'heartbeat',
  HEARTBEAT_RESPONSE: 'heartbeat.response',
} as const

// 任务委托消息载荷
// 使用 unknown 配合泛型实现更安全的类型定义
export interface TaskDelegatePayload<T = unknown> {
  taskId: string
  taskName: string
  taskDescription: string
  input: T
  requiredCapabilities: string[]
  priority: MessagePriority
  deadline?: number
  callback?: string // 结果回调地址
}

// 任务状态消息载荷
export interface TaskStatusPayload {
  taskId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress?: number // 0-100
  message?: string
  error?: string
}

// 任务结果消息载荷
// 使用泛型支持不同类型的输出
export interface TaskResultPayload<T = unknown> {
  taskId: string
  output: T
  completedAt: number
  executionTime: number
}

// 状态同步消息载荷
// values 使用 unknown[] 替代 any[]，使用时需要类型检查
export interface StateSyncPayload {
  keys: string[]
  values: unknown[]
  timestamp: number
  version?: number
}

// 状态查询消息载荷
export interface StateQueryPayload {
  keys: string[]
  since?: number
}

// 能力查询消息载荷
export interface CapabilityQueryPayload {
  capabilityIds?: string[]
  keywords?: string[]
  categories?: string[]
}

// 能力响应消息载荷
export interface CapabilityResponsePayload {
  agents: Array<{
    agentId: string
    agentName: string
    capabilities: Array<{
      id: string
      name: string
      description: string
      category: string
    }>
  }>
}

// Zod schemas for validation
export const TaskDelegatePayloadSchema = z.object({
  taskId: z.string(),
  taskName: z.string(),
  taskDescription: z.string(),
  // 使用 z.unknown() 替代 z.any()，使用时需要类型守卫
  input: z.unknown(),
  requiredCapabilities: z.array(z.string()),
  priority: z.nativeEnum(MessagePriority),
  deadline: z.number().optional(),
  callback: z.string().optional(),
})

export const TaskStatusPayloadSchema = z.object({
  taskId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  progress: z.number().min(0).max(100).optional(),
  message: z.string().optional(),
  error: z.string().optional(),
})

export const TaskResultPayloadSchema = z.object({
  taskId: z.string(),
  // 使用 z.unknown() 替代 z.any()，使用时需要类型守卫
  output: z.unknown(),
  completedAt: z.number(),
  executionTime: z.number(),
})

export const StateSyncPayloadSchema = z.object({
  keys: z.array(z.string()),
  // 使用 z.unknown() 替代 z.any()，使用时需要类型守卫
  values: z.array(z.unknown()),
  timestamp: z.number(),
  version: z.number().optional(),
})

export const StateQueryPayloadSchema = z.object({
  keys: z.array(z.string()),
  since: z.number().optional(),
})

export const CapabilityQueryPayloadSchema = z.object({
  capabilityIds: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
})

// 协议接口
export interface IProtocol {
  delegateTask(to: string, payload: TaskDelegatePayload): Promise<string>
  sendTaskStatus(to: string, payload: TaskStatusPayload): Promise<void>
  sendTaskResult(to: string, payload: TaskResultPayload): Promise<void>
  cancelTask(taskId: string, reason: string): Promise<void>
  queryCapabilities(payload: CapabilityQueryPayload): Promise<CapabilityResponsePayload>
  syncState(targetId: string, payload: StateSyncPayload): Promise<void>
  queryState(targetId: string, payload: StateQueryPayload): Promise<Record<string, unknown>>
}

// 协议处理器接口
export interface IProtocolHandler {
  handleTaskDelegate(message: Message<TaskDelegatePayload>): Promise<void>
  handleTaskStatus(message: Message<TaskStatusPayload>): Promise<void>
  handleTaskResult(message: Message<TaskResultPayload>): Promise<void>
  handleTaskCancel(message: Message<{ taskId: string; reason: string }>): Promise<void>
  handleCapabilityQuery(message: Message<CapabilityQueryPayload>): Promise<void>
  handleStateSync(message: Message<StateSyncPayload>): Promise<void>
  handleStateQuery(message: Message<StateQueryPayload>): Promise<void>
}

/**
 * Agent 协作协议主类
 */
export class AgentCollaborationProtocol extends EventEmitter implements IProtocol {
  private agentId: string
  private messageBus: MessageBus
  private registry: AgentRegistry
  private taskDecomposer: TaskDecomposer
  private pendingTasks: Map<
    string,
    {
      delegatedTo: string
      delegatedAt: number
      timeout: NodeJS.Timeout
    }
  > = new Map()
  private state: Map<string, unknown> = new Map()
  private stateVersion: number = 0

  constructor(
    agentId: string,
    messageBus: MessageBus,
    registry: AgentRegistry,
    taskDecomposer: TaskDecomposer
  ) {
    super()
    this.agentId = agentId
    this.messageBus = messageBus
    this.registry = registry
    this.taskDecomposer = taskDecomposer

    // 订阅协议消息
    this.setupMessageHandlers()
  }

  /**
   * 设置消息处理器
   */
  private setupMessageHandlers(): void {
    // 订阅所有发给我的消息
    this.messageBus.on(`message.to.${this.agentId}`, async (data: unknown) => {
      await this.handleIncomingMessage((data as { message: Message }).message as Message)
    })

    // 订阅协议相关主题
    this.messageBus.subscribe('protocol.task.*', async (data: unknown) => {
      await this.handleIncomingMessage((data as { message: Message }).message as Message)
    })

    this.messageBus.subscribe('protocol.state.*', async (data: unknown) => {
      await this.handleIncomingMessage((data as { message: Message }).message as Message)
    })

    this.messageBus.subscribe('protocol.capability.*', async (data: unknown) => {
      await this.handleIncomingMessage((data as { message: Message }).message as Message)
    })
  }

  /**
   * 处理传入消息
   */
  private async handleIncomingMessage(message: Message): Promise<void> {
    try {
      const messageType = message.headers.type

      switch (messageType) {
        case MessageType.TASK_DELEGATE:
          await this.handleTaskDelegate(message as Message<TaskDelegatePayload>)
          break

        case MessageType.TASK_STATUS:
          await this.handleTaskStatus(message as Message<TaskStatusPayload>)
          break

        case MessageType.TASK_RESULT:
          await this.handleTaskResult(message as Message<TaskResultPayload>)
          break

        case MessageType.TASK_CANCEL:
          await this.handleTaskCancel(message as Message<{ taskId: string; reason: string }>)
          break

        case MessageType.CAPABILITY_QUERY:
          await this.handleCapabilityQuery(message as Message<CapabilityQueryPayload>)
          break

        case MessageType.STATE_SYNC:
          await this.handleStateSync(message as Message<StateSyncPayload>)
          break

        case MessageType.STATE_QUERY:
          await this.handleStateQuery(message as Message<StateQueryPayload>)
          break

        default:
          // 忽略未知消息类型
          break
      }
    } catch (error) {
      this.emit('error', error)
    }
  }

  /**
   * 委托任务给另一个 Agent
   */
  async delegateTask(to: string, payload: TaskDelegatePayload): Promise<string> {
    // 验证载荷
    const validated = TaskDelegatePayloadSchema.parse(payload)

    // 创建消息
    const message: Message<TaskDelegatePayload> = {
      headers: {
        id: this.generateId(),
        type: MessageType.TASK_DELEGATE,
        from: this.agentId,
        to,
        priority: validated.priority,
        timestamp: Date.now(),
        expiresAt: validated.deadline || Date.now() + 3600000, // 默认1小时
      },
      body: validated,
    }

    // 发送消息
    await this.messageBus.send(message)

    // 记录待处理任务
    const timeout = setTimeout(
      () => {
        this.pendingTasks.delete(validated.taskId)
        this.emit('task.timeout', { taskId: validated.taskId })
      },
      (validated.deadline || Date.now() + 3600000) - Date.now()
    )

    this.pendingTasks.set(validated.taskId, {
      delegatedTo: to,
      delegatedAt: Date.now(),
      timeout,
    })

    this.emit('task.delegated', {
      taskId: validated.taskId,
      to,
      payload: validated,
    })

    return validated.taskId
  }

  /**
   * 发送任务状态更新
   */
  async sendTaskStatus(to: string, payload: TaskStatusPayload): Promise<void> {
    const validated = TaskStatusPayloadSchema.parse(payload)

    const message: Message<TaskStatusPayload> = {
      headers: {
        id: this.generateId(),
        type: MessageType.TASK_STATUS,
        from: this.agentId,
        to,
        priority: MessagePriority.HIGH,
        timestamp: Date.now(),
      },
      body: validated,
    }

    await this.messageBus.send(message)
  }

  /**
   * 发送任务结果
   */
  async sendTaskResult(to: string, payload: TaskResultPayload): Promise<void> {
    const validated = TaskResultPayloadSchema.parse(payload)

    const message: Message<TaskResultPayload> = {
      headers: {
        id: this.generateId(),
        type: MessageType.TASK_RESULT,
        from: this.agentId,
        to,
        priority: MessagePriority.HIGH,
        timestamp: Date.now(),
      },
      body: validated,
    }

    await this.messageBus.send(message)

    // 清理待处理任务
    const pending = this.pendingTasks.get(validated.taskId)
    if (pending) {
      clearTimeout(pending.timeout)
      this.pendingTasks.delete(validated.taskId)
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string, reason: string): Promise<void> {
    const pending = this.pendingTasks.get(taskId)
    if (!pending) {
      throw new MultiAgentError(
        MultiAgentErrorType.VALIDATION_ERROR,
        `Task ${taskId} not found or not delegated`
      )
    }

    const message: Message<{ taskId: string; reason: string }> = {
      headers: {
        id: this.generateId(),
        type: MessageType.TASK_CANCEL,
        from: this.agentId,
        to: pending.delegatedTo,
        priority: MessagePriority.CRITICAL,
        timestamp: Date.now(),
      },
      body: { taskId, reason },
    }

    await this.messageBus.send(message)

    // 清理待处理任务
    clearTimeout(pending.timeout)
    this.pendingTasks.delete(taskId)

    this.emit('task.cancelled', { taskId, reason })
  }

  /**
   * 查询能力
   */
  async queryCapabilities(payload: CapabilityQueryPayload): Promise<CapabilityResponsePayload> {
    const validated = CapabilityQueryPayloadSchema.parse(payload)

    const message: Message<CapabilityQueryPayload> = {
      headers: {
        id: this.generateId(),
        type: MessageType.CAPABILITY_QUERY,
        from: this.agentId,
        priority: MessagePriority.NORMAL,
        timestamp: Date.now(),
      },
      body: validated,
    }

    // 广播查询（或发送给特定的注册表服务）
    // 这里简化为发送给自己，实际应用中可以发送给专门的目录服务
    await this.messageBus.send(message)

    // 等待响应（简化版，实际应该有请求-响应机制）
    // 这里直接返回本地查询结果
    const agents = this.registry.searchAgents({
      capability: validated.capabilityIds?.[0],
      keyword: validated.keywords?.[0],
    })

    return {
      agents: agents.map(agent => ({
        agentId: agent.id,
        agentName: agent.name,
        capabilities: agent.capabilities.map(cap => ({
          id: cap.id,
          name: cap.name,
          description: cap.description,
          category: cap.category,
        })),
      })),
    }
  }

  /**
   * 同步状态到目标 Agent
   */
  async syncState(targetId: string, payload: StateSyncPayload): Promise<void> {
    const validated = StateSyncPayloadSchema.parse(payload)

    const message: Message<StateSyncPayload> = {
      headers: {
        id: this.generateId(),
        type: MessageType.STATE_SYNC,
        from: this.agentId,
        to: targetId,
        priority: MessagePriority.NORMAL,
        timestamp: Date.now(),
      },
      body: validated,
    }

    await this.messageBus.send(message)
  }

  /**
   * 查询目标 Agent 的状态
   */
  async queryState(targetId: string, payload: StateQueryPayload): Promise<Record<string, unknown>> {
    const validated = StateQueryPayloadSchema.parse(payload)

    const response = await this.messageBus.request<unknown>(
      targetId,
      {
        type: MessageType.STATE_QUERY,
        ...validated,
      },
      {
        priority: MessagePriority.NORMAL,
        timeout: 10000, // 10秒超时
      }
    )

    return response as Record<string, unknown>
  }

  /**
   * 处理任务委托（由接收方实现）
   */
  async handleTaskDelegate(message: Message<TaskDelegatePayload>): Promise<void> {
    const payload = message.body

    // 验证我们是否具备所需能力
    const myAgent = this.registry.getAgent(this.agentId)
    if (!myAgent) {
      throw new MultiAgentError(MultiAgentErrorType.AGENT_NOT_FOUND, 'Agent not registered')
    }

    const myCapabilityIds = myAgent.capabilities.map(c => c.id)
    const hasAllCapabilities = payload.requiredCapabilities.every(cap =>
      myCapabilityIds.includes(cap)
    )

    if (!hasAllCapabilities) {
      // 返回拒绝消息
      await this.sendTaskStatus(message.headers.from!, {
        taskId: payload.taskId,
        status: 'failed',
        error: `Missing required capabilities: ${payload.requiredCapabilities
          .filter(cap => !myCapabilityIds.includes(cap))
          .join(', ')}`,
      })
      return
    }

    // 接受任务
    this.emit('task.received', {
      taskId: payload.taskId,
      from: message.headers.from,
      payload,
    })

    // 创建本地任务
    const task = await this.taskDecomposer.createTask(
      payload.taskName,
      payload.taskDescription,
      payload.input as Record<string, unknown>,
      {
        requesterId: message.headers.from,
        priority: payload.priority,
        deadline: payload.deadline,
      }
    )

    // 发送状态更新
    await this.sendTaskStatus(message.headers.from!, {
      taskId: payload.taskId,
      status: 'running',
      message: 'Task accepted and processing',
    })

    // 执行任务
    try {
      const result = await this.taskDecomposer.executeTask(task.id)

      // 发送结果
      await this.sendTaskResult(message.headers.from!, {
        taskId: payload.taskId,
        output: result,
        completedAt: Date.now(),
        executionTime: Date.now() - task.createdAt,
      })
    } catch (error) {
      // 发送失败状态
      await this.sendTaskStatus(message.headers.from!, {
        taskId: payload.taskId,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * 处理任务状态更新
   */
  async handleTaskStatus(message: Message<TaskStatusPayload>): Promise<void> {
    const payload = message.body

    this.emit('task.status.updated', {
      taskId: payload.taskId,
      from: message.headers.from,
      status: payload.status,
      progress: payload.progress,
      message: payload.message,
      error: payload.error,
    })
  }

  /**
   * 处理任务结果
   */
  async handleTaskResult(message: Message<TaskResultPayload>): Promise<void> {
    const payload = message.body

    this.emit('task.result.received', {
      taskId: payload.taskId,
      from: message.headers.from,
      output: payload.output,
      completedAt: payload.completedAt,
      executionTime: payload.executionTime,
    })
  }

  /**
   * 处理任务取消
   */
  async handleTaskCancel(message: Message<{ taskId: string; reason: string }>): Promise<void> {
    const payload = message.body

    try {
      await this.taskDecomposer.cancelTask(payload.taskId)

      this.emit('task.cancelled.received', {
        taskId: payload.taskId,
        from: message.headers.from,
        reason: payload.reason,
      })
    } catch (error) {
      this.emit('error', error)
    }
  }

  /**
   * 处理能力查询
   */
  async handleCapabilityQuery(message: Message<CapabilityQueryPayload>): Promise<void> {
    const payload = message.body

    const agents = this.registry.searchAgents({
      capability: payload.capabilityIds?.[0],
      keyword: payload.keywords?.[0],
    })

    const response: CapabilityResponsePayload = {
      agents: agents.map(agent => ({
        agentId: agent.id,
        agentName: agent.name,
        capabilities: agent.capabilities.map(cap => ({
          id: cap.id,
          name: cap.name,
          description: cap.description,
          category: cap.category,
        })),
      })),
    }

    // 发送响应
    const responseMessage: Message<CapabilityResponsePayload> = {
      headers: {
        id: this.generateId(),
        type: MessageType.CAPABILITY_RESPONSE,
        from: this.agentId,
        to: message.headers.from,
        correlationId: message.headers.id,
        priority: MessagePriority.NORMAL,
        timestamp: Date.now(),
      },
      body: response,
    }

    await this.messageBus.send(responseMessage)
  }

  /**
   * 处理状态同步
   */
  async handleStateSync(message: Message<StateSyncPayload>): Promise<void> {
    const payload = message.body

    // 更新本地状态
    for (let i = 0; i < payload.keys.length; i++) {
      this.state.set(payload.keys[i], payload.values[i])
    }

    this.stateVersion = payload.version || this.stateVersion + 1

    this.emit('state.synced', {
      from: message.headers.from,
      keys: payload.keys,
      version: this.stateVersion,
    })
  }

  /**
   * 处理状态查询
   */
  async handleStateQuery(message: Message<StateQueryPayload>): Promise<void> {
    const payload = message.body

    const result: Record<string, unknown> = {}

    for (const key of payload.keys) {
      result[key] = this.state.get(key)
    }

    // 发送响应
    const responseMessage: Message<Record<string, unknown>> = {
      headers: {
        id: this.generateId(),
        type: MessageType.RESPONSE,
        from: this.agentId,
        to: message.headers.from,
        correlationId: message.headers.id,
        priority: MessagePriority.NORMAL,
        timestamp: Date.now(),
      },
      body: result,
    }

    await this.messageBus.send(responseMessage)
  }

  /**
   * 获取本地状态
   */
  getState(): Record<string, unknown> {
    return Object.fromEntries(this.state)
  }

  /**
   * 设置本地状态
   */
  setState(key: string, value: unknown): void {
    this.state.set(key, value)
    this.stateVersion++
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    // 清理所有待处理任务的超时定时器
    this.pendingTasks.forEach(({ timeout }) => clearTimeout(timeout))
    this.pendingTasks.clear()

    // 清理状态
    this.state.clear()

    // 移除所有监听器
    this.removeAllListeners()
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `${this.agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
