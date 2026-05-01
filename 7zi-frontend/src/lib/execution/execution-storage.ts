/**
 * Execution State Storage (v1.12.2)
 *
 * 执行状态持久化存储，基于 IndexedDB，防止工作流执行时刷新页面丢失进度
 *
 * Features:
 * - 保存执行状态到 IndexedDB
 * - 加载和恢复执行状态
 * - 更新执行进度
 * - 标记完成/失败
 * - 自动过期清理（24小时）
 */

import { getDraftStorageManager } from '@/lib/db/draft-storage'
import type { Draft } from '@/lib/db/draft-storage'
import { logger } from '@/lib/logger'

// ============================================
// 类型定义
// ============================================

/**
 * 执行状态
 */
export type ExecutionStatus =
  | 'pending'     // 待执行
  | 'running'     // 运行中
  | 'paused'      // 已暂停
  | 'completed'   // 已完成
  | 'failed'      // 执行失败
  | 'cancelled'   // 已取消

/**
 * 节点执行状态
 */
export type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'

/**
 * 节点执行结果
 */
export interface NodeExecutionResult {
  success: boolean
  data?: unknown
  error?: string
  duration?: number
  startTime?: number
  endTime?: number
  retries?: number
}

/**
 * 节点执行状态记录
 */
export interface NodeState {
  nodeId: string
  status: NodeExecutionStatus
  result?: NodeExecutionResult
  startTime?: number
  endTime?: number
}

/**
 * 执行进度
 */
export interface ExecutionProgress {
  totalNodes: number
  completedNodes: number
  failedNodes: number
  skippedNodes: number
  percentage: number
}

/**
 * 执行状态数据
 */
export interface ExecutionStateData {
  // 基本信息
  workflowId: string
  workflowName: string
  instanceId: string

  // 执行状态
  status: ExecutionStatus

  // 节点状态
  nodeStates: Record<string, NodeState>

  // 执行进度
  progress: ExecutionProgress

  // 输入输出
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>

  // 变量
  variables: Record<string, unknown>

  // 执行日志（简化版，详细日志存储在服务端）
  logs: Array<{
    timestamp: number
    level: 'info' | 'warn' | 'error'
    message: string
    nodeId?: string
  }>

  // 错误信息
  error?: string

  // 元数据
  startTime: number
  endTime?: number
  currentStep?: string

  // 更新时间（内部使用）
  updatedAt?: number
}

/**
 * 保存执行状态选项
 */
export interface SaveExecutionStateOptions {
  ttl?: number // 过期时间（毫秒），默认24小时
}

/**
 * 恢复执行结果
 */
export interface ResumeExecutionResult {
  success: boolean
  state: ExecutionStateData | null
  canResume: boolean
  reason?: string
}

// ============================================
// 常量
// ============================================

export const EXECUTION_TTL = 24 * 60 * 60 * 1000 // 24小时
export const DRAFT_TYPE = 'execution' as const

// ============================================
// 执行状态存储类
// ============================================

/**
 * 执行状态存储管理器
 */
export class ExecutionStorageManager {
  private static instance: ExecutionStorageManager

  private constructor() {}

  static getInstance(): ExecutionStorageManager {
    if (!ExecutionStorageManager.instance) {
      ExecutionStorageManager.instance = new ExecutionStorageManager()
    }
    return ExecutionStorageManager.instance
  }

  /**
   * 生成执行状态 ID
   */
  private generateExecutionId(workflowId: string): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 9)
    return `EXEC-${workflowId}-${timestamp}-${random}`
  }

  /**
   * 保存执行状态
   */
  async saveExecutionState(
    state: ExecutionStateData,
    options: SaveExecutionStateOptions = {}
  ): Promise<string> {
    const manager = getDraftStorageManager()
    const ttl = options.ttl || EXECUTION_TTL

    // 更新时间戳
    const now = Date.now()
    const dataToSave: ExecutionStateData = {
      ...state,
      updatedAt: now,
    }

    // 使用 instanceId 作为草稿 ID，如果不存在则生成
    const draftId = state.instanceId || this.generateExecutionId(state.workflowId)

    const draft: Draft<ExecutionStateData> = {
      id: draftId,
      type: DRAFT_TYPE,
      data: dataToSave,
      createdAt: state.startTime,
      updatedAt: now,
      expiresAt: now + ttl,
    }

    await manager.save(draft)
    logger.debug(`[ExecutionStorage] Saved execution state: ${draftId}`)
    return draftId
  }

  /**
   * 加载执行状态
   */
  async loadExecutionState(id: string): Promise<ExecutionStateData | null> {
    const manager = getDraftStorageManager()
    const draft = await manager.loadDraft<ExecutionStateData>(id)

    if (!draft) {
      console.warn(`[ExecutionStorage] Execution state not found: ${id}`)
      return null
    }

    logger.debug(`[ExecutionStorage] Loaded execution state: ${id}`)
    return draft.data
  }

  /**
   * 更新执行进度
   */
  async updateExecutionProgress(
    id: string,
    progress: Partial<ExecutionProgress>
  ): Promise<void> {
    const state = await this.loadExecutionState(id)
    if (!state) {
      throw new Error(`Execution state not found: ${id}`)
    }

    const updatedState: ExecutionStateData = {
      ...state,
      progress: {
        ...state.progress,
        ...progress,
        // 自动计算百分比
        percentage: progress.totalNodes
          ? Math.round(((progress.completedNodes || state.progress.completedNodes) / progress.totalNodes) * 100)
          : state.progress.percentage,
      },
    }

    await this.saveExecutionState(updatedState)
  }

  /**
   * 更新节点状态
   */
  async updateNodeState(id: string, nodeId: string, nodeState: NodeState): Promise<void> {
    const state = await this.loadExecutionState(id)
    if (!state) {
      throw new Error(`Execution state not found: ${id}`)
    }

    const updatedState: ExecutionStateData = {
      ...state,
      nodeStates: {
        ...state.nodeStates,
        [nodeId]: nodeState,
      },
    }

    // 更新进度统计
    const nodeStates = Object.values(updatedState.nodeStates)
    const completedCount = nodeStates.filter(s => s.status === 'completed').length
    const failedCount = nodeStates.filter(s => s.status === 'failed').length
    const skippedCount = nodeStates.filter(s => s.status === 'skipped').length

    updatedState.progress = {
      ...updatedState.progress,
      completedNodes: completedCount,
      failedNodes: failedCount,
      skippedNodes: skippedCount,
      percentage: updatedState.progress.totalNodes
        ? Math.round((completedCount / updatedState.progress.totalNodes) * 100)
        : updatedState.progress.percentage,
    }

    await this.saveExecutionState(updatedState)
  }

  /**
   * 标记完成
   */
  async completeExecution(id: string, outputs?: Record<string, unknown>): Promise<void> {
    const state = await this.loadExecutionState(id)
    if (!state) {
      throw new Error(`Execution state not found: ${id}`)
    }

    const completedState: ExecutionStateData = {
      ...state,
      status: 'completed',
      endTime: Date.now(),
      outputs: outputs || state.outputs,
    }

    await this.saveExecutionState(completedState)
    logger.debug(`[ExecutionStorage] Execution completed: ${id}`)
  }

  /**
   * 标记失败
   */
  async failExecution(id: string, error: string): Promise<void> {
    const state = await this.loadExecutionState(id)
    if (!state) {
      throw new Error(`Execution state not found: ${id}`)
    }

    const failedState: ExecutionStateData = {
      ...state,
      status: 'failed',
      endTime: Date.now(),
      error,
    }

    await this.saveExecutionState(failedState)
    logger.debug(`[ExecutionStorage] Execution failed: ${id}`)
  }

  /**
   * 标记暂停
   */
  async pauseExecution(id: string): Promise<void> {
    const state = await this.loadExecutionState(id)
    if (!state) {
      throw new Error(`Execution state not found: ${id}`)
    }

    const pausedState: ExecutionStateData = {
      ...state,
      status: 'paused',
    }

    await this.saveExecutionState(pausedState)
    logger.info(`[ExecutionStorage] Execution paused: ${id}`)
  }

  /**
   * 恢复执行
   */
  async resumeExecution(id: string): Promise<ResumeExecutionResult> {
    const state = await this.loadExecutionState(id)

    if (!state) {
      return {
        success: false,
        state: null,
        canResume: false,
        reason: 'Execution state not found',
      }
    }

    // 检查是否可以恢复
    if (state.status === 'completed') {
      return {
        success: false,
        state,
        canResume: false,
        reason: 'Execution already completed',
      }
    }

    if (state.status === 'cancelled') {
      return {
        success: false,
        state,
        canResume: false,
        reason: 'Execution was cancelled',
      }
    }

    if (state.status === 'failed' && !state.nodeStates) {
      return {
        success: false,
        state,
        canResume: false,
        reason: 'Execution failed without recoverable state',
      }
    }

    // 可以恢复
    return {
      success: true,
      state,
      canResume: true,
    }
  }

  /**
   * 取消执行
   */
  async cancelExecution(id: string): Promise<void> {
    const state = await this.loadExecutionState(id)
    if (!state) {
      throw new Error(`Execution state not found: ${id}`)
    }

    const cancelledState: ExecutionStateData = {
      ...state,
      status: 'cancelled',
      endTime: Date.now(),
    }

    await this.saveExecutionState(cancelledState)
    logger.debug(`[ExecutionStorage] Execution cancelled: ${id}`)
  }

  /**
   * 添加执行日志
   */
  async addExecutionLog(
    id: string,
    level: 'info' | 'warn' | 'error',
    message: string,
    nodeId?: string
  ): Promise<void> {
    const state = await this.loadExecutionState(id)
    if (!state) {
      throw new Error(`Execution state not found: ${id}`)
    }

    const logEntry = {
      timestamp: Date.now(),
      level,
      message,
      nodeId,
    }

    // 保留最近100条日志
    const logs = [...state.logs, logEntry].slice(-100)

    const updatedState: ExecutionStateData = {
      ...state,
      logs,
    }

    await this.saveExecutionState(updatedState)
  }

  /**
   * 更新变量
   */
  async updateVariables(id: string, variables: Record<string, unknown>): Promise<void> {
    const state = await this.loadExecutionState(id)
    if (!state) {
      throw new Error(`Execution state not found: ${id}`)
    }

    const updatedState: ExecutionStateData = {
      ...state,
      variables: {
        ...state.variables,
        ...variables,
      },
    }

    await this.saveExecutionState(updatedState)
  }

  /**
   * 列出所有执行状态
   */
  async listExecutions(workflowId?: string): Promise<Array<ExecutionStateData & { id: string }>> {
    const manager = getDraftStorageManager()
    const drafts = await manager.listDrafts<ExecutionStateData>(DRAFT_TYPE)

    return drafts
      .filter(draft => !workflowId || draft.data.workflowId === workflowId)
      .map(draft => ({
        ...draft.data,
        id: draft.id,
      }))
  }

  /**
   * 删除执行状态
   */
  async deleteExecution(id: string): Promise<void> {
    const manager = getDraftStorageManager()
    await manager.deleteDraft(id)
    logger.debug(`[ExecutionStorage] Deleted execution state: ${id}`)
  }

  /**
   * 清理过期的执行状态
   */
  async clearExpiredExecutions(): Promise<number> {
    const manager = getDraftStorageManager()
    return await manager.clearExpiredDrafts()
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 获取执行存储管理器实例
 */
export function getExecutionStorage(): ExecutionStorageManager {
  return ExecutionStorageManager.getInstance()
}

/**
 * 保存执行状态
 */
export async function saveExecutionState(
  state: ExecutionStateData,
  options?: SaveExecutionStateOptions
): Promise<string> {
  return getExecutionStorage().saveExecutionState(state, options)
}

/**
 * 加载执行状态
 */
export async function loadExecutionState(id: string): Promise<ExecutionStateData | null> {
  return getExecutionStorage().loadExecutionState(id)
}

/**
 * 更新执行进度
 */
export async function updateExecutionProgress(
  id: string,
  progress: Partial<ExecutionProgress>
): Promise<void> {
  return getExecutionStorage().updateExecutionProgress(id, progress)
}

/**
 * 更新节点状态
 */
export async function updateNodeState(id: string, nodeId: string, nodeState: NodeState): Promise<void> {
  return getExecutionStorage().updateNodeState(id, nodeId, nodeState)
}

/**
 * 标记完成
 */
export async function completeExecution(id: string, outputs?: Record<string, unknown>): Promise<void> {
  return getExecutionStorage().completeExecution(id, outputs)
}

/**
 * 标记失败
 */
export async function failExecution(id: string, error: string): Promise<void> {
  return getExecutionStorage().failExecution(id, error)
}

/**
 * 标记暂停
 */
export async function pauseExecution(id: string): Promise<void> {
  return getExecutionStorage().pauseExecution(id)
}

/**
 * 恢复执行
 */
export async function resumeExecution(id: string): Promise<ResumeExecutionResult> {
  return getExecutionStorage().resumeExecution(id)
}

/**
 * 取消执行
 */
export async function cancelExecution(id: string): Promise<void> {
  return getExecutionStorage().cancelExecution(id)
}

/**
 * 添加执行日志
 */
export async function addExecutionLog(
  id: string,
  level: 'info' | 'warn' | 'error',
  message: string,
  nodeId?: string
): Promise<void> {
  return getExecutionStorage().addExecutionLog(id, level, message, nodeId)
}

/**
 * 更新变量
 */
export async function updateVariables(id: string, variables: Record<string, unknown>): Promise<void> {
  return getExecutionStorage().updateVariables(id, variables)
}

/**
 * 列出所有执行状态
 */
export async function listExecutions(workflowId?: string): Promise<Array<ExecutionStateData & { id: string }>> {
  return getExecutionStorage().listExecutions(workflowId)
}

/**
 * 删除执行状态
 */
export async function deleteExecution(id: string): Promise<void> {
  return getExecutionStorage().deleteExecution(id)
}

/**
 * 清理过期的执行状态
 */
export async function clearExpiredExecutions(): Promise<number> {
  return getExecutionStorage().clearExpiredExecutions()
}

