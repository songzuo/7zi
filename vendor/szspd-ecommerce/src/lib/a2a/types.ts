/**
 * A2A Protocol v2 - Extended Type Definitions
 * 扩展类型定义，支持优先级队列、Agent 注册表、增强任务存储
 */

import { z } from 'zod'

// ============ 任务优先级 ============

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'

export const TaskPrioritySchema = z.enum(['low', 'normal', 'high', 'critical'])

// ============ 消息队列类型 ============

export interface QueueMessage {
  id: string
  taskId: string
  agentId: string
  priority: TaskPriority
  payload: Record<string, unknown>
  createdAt: string
  attempts: number
  maxAttempts: number
  nextRetryAt?: string
}

export const QueueMessageSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  agentId: z.string(),
  priority: TaskPrioritySchema,
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  attempts: z.number().min(0),
  maxAttempts: z.number().min(0).default(3),
  nextRetryAt: z.string().optional(),
})

export interface QueueConfig {
  maxRetries: number
  retryDelayMs: number
  maxQueueSize: number
}

export const QueueConfigSchema = z.object({
  maxRetries: z.number().min(0).default(3),
  retryDelayMs: z.number().min(0).default(5000),
  maxQueueSize: z.number().min(1).default(1000),
})

export interface QueueStats {
  total: number
  byPriority: Record<TaskPriority, number>
  byAgent: Record<string, number>
}

export interface MessageQueue {
  enqueue(message: QueueMessage): void
  dequeue(): QueueMessage | null
  peek(): QueueMessage | null
  remove(messageId: string): boolean
  size(): number
  getMessagesByAgent(agentId: string): QueueMessage[]
  getMessagesByPriority(priority: TaskPriority): QueueMessage[]
  retry(messageId: string): boolean
  getStats(): QueueStats
  subscribe(listener: (event: QueueEvent) => void): () => void
  updateConfig(config: Partial<QueueConfig>): void
}

// ============ 队列事件 ============

export interface QueueEvent {
  type: 'enqueued' | 'dequeued' | 'retry' | 'failed' | 'completed'
  message: QueueMessage
  timestamp: string
  error?: string
}

// ============ Agent 注册表类型 ============

export interface AgentRegistration {
  id: string
  name: string
  url: string
  capabilities: string[]
  skills: string[]
  status: 'online' | 'offline' | 'busy'
  lastHeartbeat: string
  load?: number
  metadata?: Record<string, unknown>
}

export const AgentRegistrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  capabilities: z.array(z.string()),
  skills: z.array(z.string()),
  status: z.enum(['online', 'offline', 'busy']),
  lastHeartbeat: z.string(),
  load: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export interface AgentRegistry {
  register(agent: AgentRegistration): void
  unregister(agentId: string): void
  get(agentId: string): AgentRegistration | undefined
  getAll(): AgentRegistration[]
  getByCapability(capability: string): AgentRegistration[]
  getBySkill(skill: string): AgentRegistration[]
  getAvailable(): AgentRegistration[]
  updateStatus(agentId: string, status: 'online' | 'offline' | 'busy'): void
  updateHeartbeat(agentId: string, load?: number): void
  cleanupInactive(timeoutMs: number): number
  findBestAgent(options: {
    capabilities?: string[]
    skills?: string[]
    maxLoad?: number
  }): AgentRegistration | null
  getStats(): RegistryStats
}

export interface RegistryStats {
  total: number
  online: number
  offline: number
  busy: number
  byCapability: Record<string, number>
  bySkill: Record<string, number>
}

// ============ 增强任务类型 ============

export interface TaskWithPriority {
  id: string
  name: string
  description: string
  requesterId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  priority: TaskPriority
  createdAt: string
  scheduledAt?: string
  startedAt?: string
  completedAt?: string
  retryCount?: number
  input: Record<string, unknown>
  output?: Record<string, unknown>
  error?: string
  metadata?: Record<string, unknown>
}

export const TaskWithPrioritySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  requesterId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  priority: TaskPrioritySchema,
  createdAt: z.string(),
  scheduledAt: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  retryCount: z.number().min(0).optional(),
  input: z.record(z.string(), z.unknown()),
  output: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export interface AsyncTaskStatus {
  state: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  currentStep?: string
  error?: string
}

export const AsyncTaskStatusSchema = z.object({
  state: z.enum(['pending', 'running', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  currentStep: z.string().optional(),
  error: z.string().optional(),
})

export interface TaskStore {
  createTaskWithPriority(
    context: string,
    message: Record<string, unknown>,
    priority: TaskPriority
  ): TaskWithPriority
  updateTaskPriority(taskId: string, priority: TaskPriority): boolean
  getTasksByPriority(priority: TaskPriority): TaskWithPriority[]
  getHighestPriorityTasks(limit: number): TaskWithPriority[]
  markTaskCompleted(taskId: string): boolean
  getAsyncTaskStatus(taskId: string): AsyncTaskStatus | null
  updateAsyncTaskProgress(
    taskId: string,
    progress: number,
    step?: string
  ): boolean
  getTask(taskId: string): TaskWithPriority | undefined
  getAllTasks(): TaskWithPriority[]
  deleteTask(taskId: string): boolean
}

// ============ 优先级权重 ============

export const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
}

// ============ 错误类型 ============

export enum A2AErrorType {
  QUEUE_FULL = 'QUEUE_FULL',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  AGENT_OFFLINE = 'AGENT_OFFLINE',
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  INVALID_PRIORITY = 'INVALID_PRIORITY',
  MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED',
}

export class A2AError extends Error {
  constructor(
    public type: A2AErrorType,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'A2AError'
  }
}

// ============ 工具函数 ============

/**
 * 比较两个优先级，返回 -1, 0, 1
 */
export function comparePriority(a: TaskPriority, b: TaskPriority): number {
  const weightA = PRIORITY_WEIGHTS[a]
  const weightB = PRIORITY_WEIGHTS[b]
  return weightA - weightB
}

/**
 * 检查优先级是否有效
 */
export function isValidPriority(priority: string): priority is TaskPriority {
  return ['low', 'normal', 'high', 'critical'].includes(priority)
}

/**
 * 生成唯一 ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`
}