/**
 * Multi-Agent 协作框架核心类型定义
 * 定义 Agent、消息、任务等核心数据结构
 */

import { z } from 'zod'

// ============ Agent 能力 ============

export interface AgentCapability {
  id: string
  name: string
  description: string
  category: string
  version: string
  requiredResources?: string[]
  outputCapabilities?: string[]
}

// ============ Agent 信息 ============

export interface AgentInfo {
  id: string
  name: string
  type: 'llm' | 'tool' | 'human' | 'composite'
  capabilities: AgentCapability[]
  status: 'online' | 'offline' | 'busy' | 'error'
  heartbeat?: number
  lastSeen: number
  metadata: Record<string, unknown>
}

// ============ 消息类型 ============

export enum MessageType {
  // 基础消息
  REQUEST = 'request',
  RESPONSE = 'response',
  NOTIFICATION = 'notification',

  // 协作消息
  TASK_DELEGATE = 'task.delegate',
  TASK_STATUS = 'task.status',
  TASK_RESULT = 'task.result',
  TASK_CANCEL = 'task.cancel',
  TASK_PROGRESS = 'task.progress',

  // 心跳和发现
  HEARTBEAT = 'heartbeat',
  DISCOVERY = 'discovery',
  REGISTER = 'register',
  UNREGISTER = 'unregister',

  // 订阅和广播
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  BROADCAST = 'broadcast',

  // 状态同步
  STATE_SYNC = 'state.sync',
  STATE_QUERY = 'state.query',

  // 能力查询
  CAPABILITY_QUERY = 'capability.query',
  CAPABILITY_RESPONSE = 'capability.response',

  // 服务发现
  SERVICE_DISCOVER = 'service.discover',
  SERVICE_ANNOUNCE = 'service.announce',
}

export enum MessagePriority {
  CRITICAL = 0, // 紧急，立即处理
  HIGH = 1, // 高优先级
  NORMAL = 2, // 正常优先级
  LOW = 3, // 低优先级
  BACKGROUND = 4, // 后台任务
}

export interface MessageHeaders {
  id: string
  type: MessageType
  from: string // 发送者 Agent ID
  to?: string // 接收者 Agent ID（单播）
  toAll?: boolean // 是否广播
  topic?: string // 订阅主题
  correlationId?: string // 关联 ID（用于请求-响应）
  replyTo?: string // 回复地址
  priority: MessagePriority
  timestamp: number
  expiresAt?: number // 过期时间
  retryCount?: number // 重试次数
  maxRetries?: number // 最大重试次数
}

export interface Message<T = unknown> {
  headers: MessageHeaders
  body: T
}

// ============ 任务类型 ============

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  WAITING = 'waiting', // 等待依赖任务完成
}

export interface TaskDependency {
  taskId: string
  required: boolean
}

export interface SubTask {
  id: string
  parentTaskId: string
  name: string
  description: string
  assignedAgentId?: string
  requiredCapabilities: string[]
  dependencies: TaskDependency[]
  status: TaskStatus
  input: unknown
  output?: unknown
  error?: string
  createdAt: number
  startedAt?: number
  completedAt?: number
  priority: MessagePriority
}

export interface Task {
  id: string
  name: string
  description: string
  requesterId: string
  status: TaskStatus
  subTasks: SubTask[]
  input: unknown
  output?: unknown
  error?: string
  createdAt: number
  startedAt?: number
  completedAt?: number
  deadline?: number
  priority: MessagePriority
}

// ============ A2A 协议消息 ============

export const A2AMessageSchema = z.object({
  version: z.string().default('1.0'),
  source: z.string(), // 源 Agent ID
  target: z.string(), // 目标 Agent ID
  type: z.string(),
  timestamp: z.number(),
  payload: z.unknown(),
  id: z.string(),
  correlationId: z.string().optional(),
  expiresAt: z.number().optional(),
})

export type A2AMessage = z.infer<typeof A2AMessageSchema>

// ============ 消息传输配置 ============

export enum TransportType {
  MEMORY = 'memory',
  WEBSOCKET = 'websocket',
}

export interface TransportConfig {
  type: TransportType
  options?: {
    // WebSocket 配置
    url?: string
    reconnectInterval?: number
    maxRetries?: number

    // 内存传输配置
    bufferSize?: number
    enablePersistence?: boolean
  }
}

// ============ 订阅配置 ============

export interface Subscription {
  id: string
  subscriberId: string
  topic: string
  filter?: (message: Message) => boolean
  createdAt: number
}

// ============ 事件类型 ============

export interface MessageBusEvent {
  type: 'message' | 'subscribe' | 'unsubscribe' | 'error'
  data: unknown
}

export interface AgentRegistryEvent {
  type: 'register' | 'unregister' | 'heartbeat' | 'status_change'
  agentId: string
  data?: Record<string, unknown>
}

export interface TaskEvent {
  type: 'created' | 'started' | 'updated' | 'completed' | 'failed' | 'cancelled'
  taskId: string
  data?: Record<string, unknown>
}

// ============ 错误类型 ============

export enum MultiAgentErrorType {
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  AGENT_OFFLINE = 'AGENT_OFFLINE',
  TASK_TIMEOUT = 'TASK_TIMEOUT',
  MESSAGE_EXPIRED = 'MESSAGE_EXPIRED',
  CAPABILITY_MISMATCH = 'CAPABILITY_MISMATCH',
  DEPENDENCY_FAILED = 'DEPENDENCY_FAILED',
  TRANSPORT_ERROR = 'TRANSPORT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export class MultiAgentError extends Error {
  constructor(
    public type: MultiAgentErrorType,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'MultiAgentError'
  }
}

// ============ 配置类型 ============

export interface MultiAgentConfig {
  // 消息总线配置
  messageBus: {
    defaultTimeout: number
    maxRetryCount: number
    retryDelay: number
    bufferSize: number
  }

  // 注册表配置
  registry: {
    heartbeatInterval: number
    heartbeatTimeout: number
    cleanupInterval: number
  }

  // 任务分解配置
  taskDecomposer: {
    maxSubTasks: number
    defaultPriority: MessagePriority
    enableAutoRetry: boolean
  }

  // 传输配置
  transport: TransportConfig
}
