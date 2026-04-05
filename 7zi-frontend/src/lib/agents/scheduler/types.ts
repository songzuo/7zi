/**
 * Agent Scheduler Types
 *
 * Type definitions for the A2A (Agent-to-Agent) scheduler system
 */

export type AgentStatus = 'idle' | 'busy' | 'offline' | 'error'
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Agent {
  id: string
  name: string
  type: string
  status: AgentStatus
  capabilities: string[]
  metadata?: Record<string, unknown>
  createdAt: number
  updatedAt: number
  lastHeartbeat?: number
  success?: boolean
  agentId?: string
  endpoint?: string
}

export interface Task {
  id: string
  agentId?: string
  type: string
  priority: TaskPriority
  status: TaskStatus
  input: Record<string, unknown>
  output?: Record<string, unknown>
  error?: string
  metadata?: Record<string, unknown>
  createdAt: number
  updatedAt: number
  startedAt?: number
  completedAt?: number
  retries: number
  maxRetries: number
}

export interface QueueStats {
  pending: number
  running: number
  completed: number
  failed: number
  total: number
}

export interface ScheduleTaskRequest {
  type: string
  priority?: TaskPriority
  input: Record<string, unknown>
  agentId?: string
  metadata?: Record<string, unknown>
  maxRetries?: number
  timeout?: number
}

export interface ScheduleTaskResponse {
  success: boolean
  taskId?: string
  error?: string
}

export interface JSONRPCRequest {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
  id?: string | number
}

export interface JSONRPCResponse {
  jsonrpc: '2.0'
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
  id?: string | number
}

export interface RegisterAgentRequest {
  name: string
  type: string
  capabilities: string[]
  metadata?: Record<string, unknown>
}

export interface UpdateTaskRequest {
  taskId: string
  status?: TaskStatus
  output?: Record<string, unknown>
  error?: string
}
