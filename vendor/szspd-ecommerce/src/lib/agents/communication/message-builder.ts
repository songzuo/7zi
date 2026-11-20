/**
 * 消息构建器
 * Message Builder - 用于创建标准化的智能体消息
 */

import {
  AgentMessageEnvelope,
  AgentEndpoint,
  MessageType,
  MessagePriority,
  PROTOCOL_VERSION,
  MessageMetadata,
} from './types'
import { randomUUID } from 'crypto'

/**
 * 消息构建器
 */
export class MessageBuilder {
  private message: Partial<AgentMessageEnvelope>

  private constructor() {
    this.message = {
      version: PROTOCOL_VERSION,
      messageId: randomUUID(),
      timestamp: new Date(),
      priority: MessagePriority.NORMAL,
    }
  }

  /**
   * 创建新消息
   */
  static create(): MessageBuilder {
    return new MessageBuilder()
  }

  /**
   * 从现有消息创建（用于回复）
   */
  static from(originalMessage: AgentMessageEnvelope): MessageBuilder {
    const builder = new MessageBuilder()
    builder.message = {
      ...originalMessage,
      messageId: randomUUID(),
      timestamp: new Date(),
      correlationId: originalMessage.correlationId || originalMessage.messageId,
      replyTo: originalMessage.from.agentId,
    }
    return builder
  }

  /**
   * 设置发送方
   */
  from(endpoint: AgentEndpoint | string): this {
    if (typeof endpoint === 'string') {
      this.message.from = { agentId: endpoint }
    } else {
      this.message.from = endpoint
    }
    return this
  }

  /**
   * 设置接收方
   */
  to(endpoint: AgentEndpoint | AgentEndpoint[] | string | string[]): this {
    if (Array.isArray(endpoint)) {
      if (endpoint.length === 0) {
        throw new Error('Recipient list cannot be empty')
      }
      // Safely check first element
      const firstElement = endpoint[0]
      if (!firstElement) {
        throw new Error('First recipient cannot be null or undefined')
      }
      this.message.to =
        typeof firstElement === 'string'
          ? (endpoint as string[]).map(id => ({ agentId: id }))
          : (endpoint as AgentEndpoint[])
    } else if (typeof endpoint === 'string') {
      this.message.to = { agentId: endpoint }
    } else {
      this.message.to = endpoint
    }
    return this
  }

  /**
   * 添加接收方
   */
  addTo(endpoint: AgentEndpoint | string): this {
    const currentTo = this.message.to
    const newEndpoint = typeof endpoint === 'string' ? { agentId: endpoint } : endpoint

    if (!currentTo) {
      this.message.to = newEndpoint
    } else if (Array.isArray(currentTo)) {
      this.message.to = [...currentTo, newEndpoint]
    } else {
      this.message.to = [currentTo, newEndpoint]
    }
    return this
  }

  /**
   * 设置消息类型
   */
  type(type: MessageType): this {
    this.message.type = type
    return this
  }

  /**
   * 设置优先级
   */
  priority(priority: MessagePriority): this {
    this.message.priority = priority
    return this
  }

  /**
   * 设置高优先级
   */
  highPriority(): this {
    return this.priority(MessagePriority.HIGH)
  }

  /**
   * 设置紧急优先级
   */
  urgent(): this {
    return this.priority(MessagePriority.URGENT)
  }

  /**
   * 设置消息体
   */
  payload(payload: unknown): this {
    this.message.payload = payload
    return this
  }

  /**
   * 设置关联 ID
   */
  correlationId(id: string): this {
    this.message.correlationId = id
    return this
  }

  /**
   * 设置回复地址
   */
  replyTo(agentId: string): this {
    this.message.replyTo = agentId
    return this
  }

  /**
   * 设置 TTL
   */
  ttl(seconds: number): this {
    if (seconds <= 0) {
      throw new Error('TTL must be positive')
    }
    this.message.ttl = seconds
    return this
  }

  /**
   * 设置元数据
   */
  metadata(metadata: MessageMetadata): this {
    this.message.metadata = metadata
    return this
  }

  /**
   * 添加元数据字段
   */
  addMetadata(key: string, value: unknown): this {
    if (!this.message.metadata) {
      this.message.metadata = {}
    }
    this.message.metadata[key] = value
    return this
  }

  /**
   * 设置追踪 ID
   */
  traceId(id: string): this {
    return this.addMetadata('traceId', id)
  }

  /**
   * 添加标签
   */
  addTag(key: string, value: string): this {
    if (!this.message.metadata) {
      this.message.metadata = {}
    }
    if (!this.message.metadata.tags) {
      this.message.metadata.tags = {}
    }
    this.message.metadata.tags[key] = value
    return this
  }

  /**
   * 构建消息
   */
  build(): AgentMessageEnvelope {
    this.validate()
    return this.message as AgentMessageEnvelope
  }

  /**
   * 验证消息
   */
  private validate(): void {
    if (!this.message.from) {
      throw new Error('Message must have a sender (from)')
    }
    if (!this.message.to) {
      throw new Error('Message must have a recipient (to)')
    }
    if (!this.message.type) {
      throw new Error('Message must have a type')
    }
    if (this.message.payload === undefined) {
      throw new Error('Message must have a payload')
    }
  }
}

/**
 * 快捷消息创建函数
 */
export const Message = {
  /**
   * 创建任务分配消息
   */
  taskAssign(
    from: string,
    to: string,
    task: {
      taskId: string
      taskType: string
      title: string
      description: string
      priority?: 'low' | 'medium' | 'high' | 'urgent'
      deadline?: Date
      dependencies?: string[]
      parameters?: Record<string, unknown>
      context?: Record<string, unknown>
    }
  ): AgentMessageEnvelope {
    return MessageBuilder.create()
      .from(from)
      .to(to)
      .type(MessageType.TASK_ASSIGN)
      .payload({
        ...task,
        priority: task.priority || 'medium',
      })
      .build()
  },

  /**
   * 创建任务完成消息
   */
  taskComplete(from: string, to: string, taskId: string, result?: unknown): AgentMessageEnvelope {
    return MessageBuilder.create()
      .from(from)
      .to(to)
      .type(MessageType.TASK_COMPLETE)
      .payload({
        taskId,
        result,
        completedAt: new Date(),
      })
      .build()
  },

  /**
   * 创建协作请求消息
   */
  collabRequest(
    from: string,
    to: string,
    collaboration: {
      collaborationId: string
      type: 'request' | 'share' | 'sync' | 'handoff'
      resource?: string
      action?: string
      data?: unknown
    }
  ): AgentMessageEnvelope {
    return MessageBuilder.create()
      .from(from)
      .to(to)
      .type(MessageType.COLLAB_REQUEST)
      .payload(collaboration)
      .build()
  },

  /**
   * 创建数据请求消息
   */
  dataRequest(
    from: string,
    to: string,
    request: {
      dataType: string
      action: 'read' | 'write' | 'update' | 'delete' | 'query'
      query?: Record<string, unknown>
      pagination?: { page: number; limit: number }
    }
  ): AgentMessageEnvelope {
    return MessageBuilder.create()
      .from(from)
      .to(to)
      .type(MessageType.DATA_REQUEST)
      .payload(request)
      .build()
  },

  /**
   * 创建数据响应消息
   */
  dataResponse(
    from: string,
    to: string,
    correlationId: string,
    data: unknown
  ): AgentMessageEnvelope {
    return MessageBuilder.create()
      .from(from)
      .to(to)
      .type(MessageType.DATA_RESPONSE)
      .correlationId(correlationId)
      .payload({ data })
      .build()
  },

  /**
   * 创建通知消息
   */
  notify(
    from: string,
    to: string | string[],
    notification: {
      title: string
      content: string
      level: 'info' | 'warning' | 'error' | 'success'
      action?: { type: string; target: string; label: string }
      persistent?: boolean
    }
  ): AgentMessageEnvelope {
    return MessageBuilder.create()
      .from(from)
      .to(to)
      .type(
        notification.level === 'info'
          ? MessageType.NOTIFY_INFO
          : notification.level === 'warning'
            ? MessageType.NOTIFY_WARNING
            : notification.level === 'error'
              ? MessageType.NOTIFY_ERROR
              : MessageType.NOTIFY_SUCCESS
      )
      .payload(notification)
      .build()
  },

  /**
   * 创建心跳消息
   */
  heartbeat(
    from: string,
    status: 'active' | 'busy' | 'idle' | 'offline',
    metrics?: {
      load?: number
      queueSize?: number
      uptime?: number
      metrics?: Record<string, number>
    }
  ): AgentMessageEnvelope {
    return MessageBuilder.create()
      .from(from)
      .to({ agentId: 'system' })
      .type(MessageType.HEARTBEAT)
      .payload({
        status,
        ...metrics,
      })
      .build()
  },

  /**
   * 创建心跳确认消息
   */
  heartbeatAck(from: string, to: string, correlationId: string): AgentMessageEnvelope {
    return MessageBuilder.create()
      .from(from)
      .to(to)
      .type(MessageType.HEARTBEAT_ACK)
      .correlationId(correlationId)
      .payload({ timestamp: new Date() })
      .build()
  },

  /**
   * 创建能力查询消息
   */
  capabilityQuery(from: string, to: string): AgentMessageEnvelope {
    return MessageBuilder.create()
      .from(from)
      .to(to)
      .type(MessageType.CAPABILITY_QUERY)
      .payload({})
      .build()
  },

  /**
   * 创建能力响应消息
   */
  capabilityResponse(
    from: string,
    to: string,
    correlationId: string,
    capabilities: {
      capabilities: string[]
      skills?: string[]
      limitations?: string[]
      preferences?: Record<string, unknown>
    }
  ): AgentMessageEnvelope {
    return MessageBuilder.create()
      .from(from)
      .to(to)
      .type(MessageType.CAPABILITY_RESPONSE)
      .correlationId(correlationId)
      .payload(capabilities)
      .build()
  },

  /**
   * 创建会议邀请消息
   */
  meetingInvite(
    from: string,
    to: string | string[],
    meeting: {
      meetingId: string
      title: string
      description?: string
      startTime: Date
      endTime?: Date
      participants: string[]
      agenda?: string[]
      type: 'standup' | 'planning' | 'review' | 'discussion' | 'vote'
    }
  ): AgentMessageEnvelope {
    return MessageBuilder.create()
      .from(from)
      .to(to)
      .type(MessageType.MEETING_INVITE)
      .payload({
        ...meeting,
        participants: meeting.participants.map(id => ({ agentId: id })),
      })
      .build()
  },

  /**
   * 创建投票开始消息
   */
  voteStart(
    from: string,
    to: string | string[],
    vote: {
      voteId: string
      topic: string
      description?: string
      options: Array<{ id: string; label: string; description?: string }>
      deadline?: Date
      anonymous?: boolean
      quorum?: number
    }
  ): AgentMessageEnvelope {
    return MessageBuilder.create()
      .from(from)
      .to(to)
      .type(MessageType.VOTE_START)
      .payload(vote)
      .build()
  },

  /**
   * 创建投票消息
   */
  voteCast(from: string, to: string, voteId: string, optionId: string): AgentMessageEnvelope {
    return MessageBuilder.create()
      .from(from)
      .to(to)
      .type(MessageType.VOTE_CAST)
      .payload({
        voteId,
        optionId,
        votedAt: new Date(),
      })
      .build()
  },

  /**
   * 创建自定义消息
   */
  custom(
    from: string,
    to: string | string[],
    payload: unknown,
    options?: {
      priority?: MessagePriority
      ttl?: number
      metadata?: MessageMetadata
    }
  ): AgentMessageEnvelope {
    let builder = MessageBuilder.create()
      .from(from)
      .to(to)
      .type(MessageType.CUSTOM)
      .payload(payload)

    if (options?.priority) {
      builder = builder.priority(options.priority)
    }
    if (options?.ttl) {
      builder = builder.ttl(options.ttl)
    }
    if (options?.metadata) {
      builder = builder.metadata(options.metadata)
    }

    return builder.build()
  },
}

/**
 * 消息解析器
 */
export class MessageParser {
  /**
   * 解析 JSON 字符串为消息
   */
  static parse(json: string): AgentMessageEnvelope {
    try {
      const data = JSON.parse(json)
      return this.parseObject(data)
    } catch (error) {
      throw new Error(
        `Failed to parse message: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * 解析对象为消息
   */
  static parseObject(data: unknown): AgentMessageEnvelope {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid message: must be an object')
    }

    const obj = data as Record<string, unknown>

    // 验证必需字段
    if (!obj.version) {
      throw new Error('Invalid message: missing version')
    }
    if (!obj.messageId) {
      throw new Error('Invalid message: missing messageId')
    }
    if (!obj.from) {
      throw new Error('Invalid message: missing from')
    }
    if (!obj.to) {
      throw new Error('Invalid message: missing to')
    }
    if (!obj.type) {
      throw new Error('Invalid message: missing type')
    }
    if (obj.payload === undefined) {
      throw new Error('Invalid message: missing payload')
    }

    // 转换日期字段
    const message: AgentMessageEnvelope = {
      version: String(obj.version),
      messageId: String(obj.messageId),
      timestamp: obj.timestamp ? new Date(obj.timestamp as string) : new Date(),
      from:
        typeof obj.from === 'string'
          ? { agentId: String(obj.from) }
          : this.parseSingleEndpoint(obj.from),
      to: this.parseEndpoint(obj.to),
      type: obj.type as MessageType,
      priority: (obj.priority as MessagePriority) || MessagePriority.NORMAL,
      payload: obj.payload,
    }

    // 可选字段
    if (obj.ttl !== undefined) {
      message.ttl = Number(obj.ttl)
    }
    if (obj.correlationId) {
      message.correlationId = String(obj.correlationId)
    }
    if (obj.replyTo) {
      message.replyTo = String(obj.replyTo)
    }
    if (obj.metadata) {
      message.metadata = obj.metadata as MessageMetadata
    }

    return message
  }

  /**
   * 解析端点
   */
  private static parseEndpoint(data: unknown): AgentEndpoint | AgentEndpoint[] {
    if (!data) {
      throw new Error('Invalid endpoint')
    }

    // 字符串 -> 简单端点
    if (typeof data === 'string') {
      return { agentId: data }
    }

    // 数组 -> 端点数组
    if (Array.isArray(data)) {
      return data.map(item => {
        if (typeof item === 'string') {
          return { agentId: item }
        }
        return this.parseSingleEndpoint(item)
      })
    }

    // 单个端点对象
    return this.parseSingleEndpoint(data)
  }

  /**
   * 解析单个端点
   */
  private static parseSingleEndpoint(data: unknown): AgentEndpoint {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid endpoint object')
    }
    const obj = data as Record<string, unknown>
    if (!obj.agentId) {
      throw new Error('Invalid endpoint: missing agentId')
    }

    const endpoint: AgentEndpoint = {
      agentId: String(obj.agentId),
    }

    if (obj.role) endpoint.role = String(obj.role)
    if (obj.name) endpoint.name = String(obj.name)
    if (obj.sessionId) endpoint.sessionId = String(obj.sessionId)

    return endpoint
  }

  /**
   * 序列化消息为 JSON
   */
  static stringify(message: AgentMessageEnvelope): string {
    return JSON.stringify(message, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString()
      }
      return value
    })
  }

  /**
   * 验证消息
   */
  static validate(message: AgentMessageEnvelope): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 检查版本
    if (!message.version) {
      errors.push('Missing version')
    }

    // 检查消息 ID
    if (!message.messageId) {
      errors.push('Missing messageId')
    }

    // 检查发送方
    if (!message.from || !message.from.agentId) {
      errors.push('Missing or invalid from field')
    }

    // 检查接收方
    if (!message.to) {
      errors.push('Missing to field')
    } else if (Array.isArray(message.to)) {
      if (message.to.length === 0) {
        errors.push('Recipient list cannot be empty')
      } else if (!message.to.every(e => e.agentId)) {
        errors.push('Invalid recipient in list')
      }
    } else if (!message.to.agentId) {
      errors.push('Invalid recipient')
    }

    // 检查类型
    if (!message.type) {
      errors.push('Missing type')
    } else if (!Object.values(MessageType).includes(message.type)) {
      errors.push(`Invalid message type: ${message.type}`)
    }

    // 检查 TTL
    if (message.ttl !== undefined && message.ttl <= 0) {
      errors.push('TTL must be positive')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}
