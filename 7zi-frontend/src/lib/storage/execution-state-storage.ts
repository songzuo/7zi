/**
 * Execution State Storage - 执行状态持久化
 *
 * 使用 sessionStorage 存储工作流执行状态
 * 支持页面刷新后恢复执行进度
 *
 * @package 7zi-frontend
 * @version 1.12.2
 */

import type { ExecutionState, WorkflowInstance, NodeStatus, NodeExecutionResult } from '@/components/WorkflowEditor/types'
import { logger } from '@/lib/logger'

/**
 * 执行状态存储接口
 */
export interface PersistentExecutionState {
  /** 执行实例 ID */
  executionId: string
  /** 工作流 ID */
  workflowId: string
  /** 当前执行的节点 ID */
  currentNodeId: string | null
  /** 节点执行状态 */
  nodeStates: Record<
    string,
    {
      status: NodeStatus
      result?: NodeExecutionResult
      timestamp?: string
    }
  >
  /** 工作流变量 */
  variables: Record<string, unknown>
  /** 开始时间 */
  startedAt: string
  /** 暂停时间 */
  pausedAt?: string
  /** 最后更新时间 */
  updatedAt: string
}

/**
 * SessionStorage 键名
 */
const STORAGE_KEY = '7zi_workflow_execution_state'

/**
 * 检查 sessionStorage 是否可用
 */
function isSessionStorageAvailable(): boolean {
  try {
    const testKey = '__sessionStorage_test__'
    sessionStorage.setItem(testKey, testKey)
    sessionStorage.removeItem(testKey)
    return true
  } catch (error) {
    console.warn('[ExecutionStateStorage] sessionStorage 不可用:', error)
    return false
  }
}

/**
 * 执行状态存储 API
 */
export const executionStateStorage = {
  /**
   * 保存执行状态
   *
   * @param state - 执行状态
   * @returns 保存是否成功
   */
  async saveExecutionState(state: PersistentExecutionState): Promise<boolean> {
    if (!isSessionStorageAvailable()) {
      console.warn('[ExecutionStateStorage] sessionStorage 不可用，无法保存状态')
      return false
    }

    try {
      const data = {
        ...state,
        updatedAt: new Date().toISOString(),
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      logger.debug(`[ExecutionStateStorage] 执行状态已保存: ${state.executionId}`)
      return true
    } catch (error) {
      logger.error('[ExecutionStateStorage] 保存执行状态失败:', error)
      return false
    }
  },

  /**
   * 从执行实例创建持久化状态
   *
   * @param executionId - 执行 ID
   * @param workflowId - 工作流 ID
   * @param instance - 工作流实例
   * @param currentNodeId - 当前节点 ID
   * @param nodeStates - 节点状态
   * @returns 持久化执行状态
   */
  createPersistentState(
    executionId: string,
    workflowId: string,
    instance: WorkflowInstance,
    currentNodeId: string | null,
    nodeStates: Record<string, { status: NodeStatus; result?: NodeExecutionResult }>
  ): PersistentExecutionState {
    // 处理 variables - 可能是数组或对象
    let variables: Record<string, unknown> = {}
    
    if (Array.isArray(instance.variables)) {
      // 数组格式: { name: string, value?: unknown, defaultValue?: unknown }[]
      for (const v of instance.variables) {
        variables[v.name] = v.value ?? v.defaultValue
      }
    } else if (instance.variables) {
      // 对象格式: Record<string, WorkflowVariable>
      variables = Object.fromEntries(
        Object.entries(instance.variables).map(([key, variable]) => [
          key,
          variable.value ?? variable.defaultValue,
        ])
      )
    }

    return {
      executionId,
      workflowId,
      currentNodeId,
      nodeStates,
      variables,
      startedAt: typeof instance.startTime === 'string'
        ? instance.startTime
        : new Date(instance.startTime).toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },

  /**
   * 加载执行状态
   *
   * @returns 持久化执行状态，不存在则返回 null
   */
  async loadExecutionState(): Promise<PersistentExecutionState | null> {
    if (!isSessionStorageAvailable()) {
      console.warn('[ExecutionStateStorage] sessionStorage 不可用')
      return null
    }

    try {
      const data = sessionStorage.getItem(STORAGE_KEY)
      if (!data) {
        logger.debug('[ExecutionStateStorage] 未找到执行状态')
        return null
      }

      const state = JSON.parse(data) as PersistentExecutionState

      // 验证数据完整性
      if (!state.executionId || !state.workflowId) {
        console.warn('[ExecutionStateStorage] 执行状态数据无效')
        await this.clearExecutionState()
        return null
      }

      logger.debug(`[ExecutionStateStorage] 执行状态已加载: ${state.executionId}`)
      return state
    } catch (error) {
      logger.error('[ExecutionStateStorage] 加载执行状态失败:', error)
      return null
    }
  },

  /**
   * 更新节点状态
   *
   * @param nodeId - 节点 ID
   * @param status - 节点状态
   * @param result - 执行结果
   * @returns 更新是否成功
   */
  async updateNodeState(
    nodeId: string,
    status: NodeStatus,
    result?: NodeExecutionResult
  ): Promise<boolean> {
    const state = await this.loadExecutionState()
    if (!state) {
      console.warn('[ExecutionStateStorage] 未找到执行状态，无法更新节点')
      return false
    }

    state.nodeStates[nodeId] = {
      status,
      result,
      timestamp: new Date().toISOString(),
    }
    state.currentNodeId = status === 'running' ? nodeId : null

    return await this.saveExecutionState(state)
  },

  /**
   * 更新变量
   *
   * @param variables - 变量对象
   * @returns 更新是否成功
   */
  async updateVariables(variables: Record<string, unknown>): Promise<boolean> {
    const state = await this.loadExecutionState()
    if (!state) {
      console.warn('[ExecutionStateStorage] 未找到执行状态，无法更新变量')
      return false
    }

    state.variables = { ...state.variables, ...variables }
    return await this.saveExecutionState(state)
  },

  /**
   * 暂停执行
   *
   * @returns 暂停是否成功
   */
  async pauseExecution(): Promise<boolean> {
    const state = await this.loadExecutionState()
    if (!state) {
      console.warn('[ExecutionStateStorage] 未找到执行状态，无法暂停')
      return false
    }

    state.pausedAt = new Date().toISOString()
    state.updatedAt = new Date().toISOString()
    return await this.saveExecutionState(state)
  },

  /**
   * 恢复执行
   *
   * @returns 恢复是否成功
   */
  async resumeExecution(): Promise<boolean> {
    const state = await this.loadExecutionState()
    if (!state) {
      console.warn('[ExecutionStateStorage] 未找到执行状态，无法恢复')
      return false
    }

    delete state.pausedAt
    state.updatedAt = new Date().toISOString()
    return await this.saveExecutionState(state)
  },

  /**
   * 清除执行状态
   *
   * @returns 清除是否成功
   */
  async clearExecutionState(): Promise<boolean> {
    if (!isSessionStorageAvailable()) {
      return false
    }

    try {
      sessionStorage.removeItem(STORAGE_KEY)
      logger.debug('[ExecutionStateStorage] 执行状态已清除')
      return true
    } catch (error) {
      logger.error('[ExecutionStateStorage] 清除执行状态失败:', error)
      return false
    }
  },

  /**
   * 检查是否存在执行状态
   *
   * @returns 是否存在执行状态
   */
  async hasExecutionState(): Promise<boolean> {
    const state = await this.loadExecutionState()
    return state !== null
  },

  /**
   * 获取执行状态摘要（用于 UI 显示）
   *
   * @returns 执行状态摘要
   */
  async getExecutionSummary(): Promise<{
    hasState: boolean
    executionId?: string
    workflowId?: string
    isPaused?: boolean
    startedAt?: string
    pausedAt?: string
    totalNodes: number
    completedNodes: number
    runningNodes: number
    failedNodes: number
  }> {
    const state = await this.loadExecutionState()

    if (!state) {
      return {
        hasState: false,
        totalNodes: 0,
        completedNodes: 0,
        runningNodes: 0,
        failedNodes: 0,
      }
    }

    const nodeStatuses = Object.values(state.nodeStates)
    const totalNodes = nodeStatuses.length
    const completedNodes = nodeStatuses.filter(n => n.status === 'completed' || n.status === 'success').length
    const runningNodes = nodeStatuses.filter(n => n.status === 'running').length
    const failedNodes = nodeStatuses.filter(n => n.status === 'failed').length

    return {
      hasState: true,
      executionId: state.executionId,
      workflowId: state.workflowId,
      isPaused: !!state.pausedAt,
      startedAt: state.startedAt,
      pausedAt: state.pausedAt,
      totalNodes,
      completedNodes,
      runningNodes,
      failedNodes,
    }
  },
}

// 导出类型
export type { PersistentExecutionState }
