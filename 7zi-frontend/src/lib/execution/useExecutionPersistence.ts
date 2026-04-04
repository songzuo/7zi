/**
 * React Hook: useExecutionPersistence (v1.12.2)
 *
 * 执行状态持久化 React Hook
 *
 * Features:
 * - 自动保存执行状态
 * - 自动恢复执行
 * - 进度更新
 * - 状态同步
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  ExecutionStateData,
  ExecutionProgress,
  NodeState,
  ResumeExecutionResult,
} from './execution-storage'
import { ExecutionStorageManager } from './execution-storage'

/**
 * Hook 返回值
 */
export interface UseExecutionPersistenceReturn {
  // 状态
  executionId: string | null
  executionState: ExecutionStateData | null
  isLoading: boolean
  error: string | null

  // 操作
  initializeExecution: (initialState: Partial<ExecutionStateData>) => Promise<string>
  loadExecution: (id: string) => Promise<void>
  saveState: (state?: Partial<ExecutionStateData>) => Promise<void>
  updateProgress: (progress: Partial<ExecutionProgress>) => Promise<void>
  updateNode: (nodeId: string, nodeState: NodeState) => Promise<void>
  complete: (outputs?: Record<string, unknown>) => Promise<void>
  fail: (error: string) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<ResumeExecutionResult>
  cancel: () => Promise<void>
  addLog: (level: 'info' | 'warn' | 'error', message: string, nodeId?: string) => Promise<void>
  updateVariables: (variables: Record<string, unknown>) => Promise<void>
  deleteExecution: () => Promise<void>

  // 状态检查
  canResume: () => boolean
  isCompleted: () => boolean
  isFailed: () => boolean
  isPaused: () => boolean
  isRunning: () => boolean
}

/**
 * Hook 选项
 */
export interface UseExecutionPersistenceOptions {
  autoSaveInterval?: number // 自动保存间隔（毫秒），默认 5000
  autoLoad?: boolean // 是否自动加载（如果 executionId 不为 null）
  onDelete?: () => void // 删除回调
  onError?: (error: string) => void // 错误回调
}

/**
 * 执行状态持久化 Hook
 */
export function useExecutionPersistence(
  executionId: string | null = null,
  options: UseExecutionPersistenceOptions = {}
): UseExecutionPersistenceReturn {
  const {
    autoSaveInterval = 5000,
    autoLoad = true,
    onDelete,
    onError,
  } = options

  // 本地状态
  const [state, setState] = useState<ExecutionStateData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ref 用于避免闭包问题
  const stateRef = useRef<ExecutionStateData | null>(state)
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null)
  const storageRef = useRef<ExecutionStorageManager | null>(null)

  // 获取存储管理器实例
  if (!storageRef.current) {
    storageRef.current = ExecutionStorageManager.getInstance()
  }

  // 更新 stateRef
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // 自动加载
  useEffect(() => {
    if (autoLoad && executionId) {
      loadExecution(executionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionId, autoLoad])

  // 自动保存
  useEffect(() => {
    if (autoSaveInterval > 0 && stateRef.current) {
      autoSaveRef.current = setInterval(() => {
        if (stateRef.current && stateRef.current.status === 'running') {
          saveState(stateRef.current).catch(err => {
            console.error('[useExecutionPersistence] Auto-save failed:', err)
          })
        }
      }, autoSaveInterval)
    }

    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current)
      }
    }
  }, [autoSaveInterval])

  /**
   * 初始化新执行
   */
  const initializeExecution = useCallback(async (initialState: Partial<ExecutionStateData>): Promise<string> => {
    setIsLoading(true)
    setError(null)

    try {
      const now = Date.now()
      const newState: ExecutionStateData = {
        workflowId: initialState.workflowId || '',
        workflowName: initialState.workflowName || '',
        instanceId: initialState.instanceId || '',
        status: initialState.status || 'pending',
        nodeStates: initialState.nodeStates || {},
        progress: initialState.progress || {
          totalNodes: 0,
          completedNodes: 0,
          failedNodes: 0,
          skippedNodes: 0,
          percentage: 0,
        },
        inputs: initialState.inputs || {},
        outputs: initialState.outputs || {},
        variables: initialState.variables || {},
        logs: [],
        startTime: initialState.startTime || now,
      }

      const id = await storageRef.current?.saveExecutionState(newState) || ''
      setState(newState)
      return id
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize execution'
      setError(errorMessage)
      onError?.(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [onError])

  /**
   * 加载执行
   */
  const loadExecution = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const loadedState = await storageRef.current?.loadExecutionState(id)

      if (!loadedState) {
        setError('Execution not found')
        onError?.('Execution not found')
        return
      }

      setState(loadedState)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load execution'
      setError(errorMessage)
      onError?.(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [onError])

  /**
   * 保存状态
   */
  const saveState = useCallback(async (stateUpdate?: Partial<ExecutionStateData>) => {
    setError(null)

    try {
      const currentState = stateRef.current
      if (!currentState) {
        throw new Error('No execution state to save')
      }

      const stateToSave: ExecutionStateData = stateUpdate
        ? { ...currentState, ...stateUpdate }
        : currentState

      await storageRef.current?.saveExecutionState(stateToSave)
      setState(stateToSave)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save execution state'
      setError(errorMessage)
      onError?.(errorMessage)
      throw err
    }
  }, [onError])

  /**
   * 更新进度
   */
  const updateProgress = useCallback(async (progress: Partial<ExecutionProgress>) => {
    setError(null)

    try {
      const currentState = stateRef.current
      if (!currentState) {
        throw new Error('No execution state')
      }

      await storageRef.current?.updateExecutionProgress(currentState.instanceId, progress)

      // 更新本地状态
      setState(prev => {
        if (!prev) return prev
        return {
          ...prev,
          progress: {
            ...prev.progress,
            ...progress,
          },
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update progress'
      setError(errorMessage)
      onError?.(errorMessage)
      throw err
    }
  }, [onError])

  /**
   * 更新节点状态
   */
  const updateNode = useCallback(async (nodeId: string, nodeState: NodeState) => {
    setError(null)

    try {
      const currentState = stateRef.current
      if (!currentState) {
        throw new Error('No execution state')
      }

      await storageRef.current?.updateNodeState(currentState.instanceId, nodeId, nodeState)

      // 更新本地状态
      setState(prev => {
        if (!prev) return prev
        return {
          ...prev,
          nodeStates: {
            ...prev.nodeStates,
            [nodeId]: nodeState,
          },
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update node state'
      setError(errorMessage)
      onError?.(errorMessage)
      throw err
    }
  }, [onError])

  /**
   * 标记完成
   */
  const complete = useCallback(async (outputs?: Record<string, unknown>) => {
    setError(null)

    try {
      const currentState = stateRef.current
      if (!currentState) {
        throw new Error('No execution state')
      }

      await storageRef.current?.completeExecution(currentState.instanceId, outputs)

      setState(prev => {
        if (!prev) return prev
        return {
          ...prev,
          status: 'completed',
          endTime: Date.now(),
          outputs: outputs || prev.outputs,
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete execution'
      setError(errorMessage)
      onError?.(errorMessage)
      throw err
    }
  }, [onError])

  /**
   * 标记失败
   */
  const fail = useCallback(async (error: string) => {
    setError(null)

    try {
      const currentState = stateRef.current
      if (!currentState) {
        throw new Error('No execution state')
      }

      await storageRef.current?.failExecution(currentState.instanceId, error)

      setState(prev => {
        if (!prev) return prev
        return {
          ...prev,
          status: 'failed',
          endTime: Date.now(),
          error,
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fail execution'
      setError(errorMessage)
      onError?.(errorMessage)
      throw err
    }
  }, [onError])

  /**
   * 标记暂停
   */
  const pause = useCallback(async () => {
    setError(null)

    try {
      const currentState = stateRef.current
      if (!currentState) {
        throw new Error('No execution state')
      }

      await storageRef.current?.pauseExecution(currentState.instanceId)

      setState(prev => {
        if (!prev) return prev
        return {
          ...prev,
          status: 'paused',
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause execution'
      setError(errorMessage)
      onError?.(errorMessage)
      throw err
    }
  }, [onError])

  /**
   * 恢复执行
   */
  const resume = useCallback(async (): Promise<ResumeExecutionResult> => {
    setError(null)

    try {
      const currentState = stateRef.current
      if (!currentState) {
        throw new Error('No execution state')
      }

      const result = await storageRef.current?.resumeExecution(currentState.instanceId) || {
        success: false,
        state: null,
        canResume: false,
        reason: 'Storage not available',
      }

      if (result.success && result.canResume) {
        setState(result.state!)
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume execution'
      setError(errorMessage)
      onError?.(errorMessage)
      return {
        success: false,
        state: null,
        canResume: false,
        reason: errorMessage,
      }
    }
  }, [onError])

  /**
   * 取消执行
   */
  const cancel = useCallback(async () => {
    setError(null)

    try {
      const currentState = stateRef.current
      if (!currentState) {
        throw new Error('No execution state')
      }

      await storageRef.current?.cancelExecution(currentState.instanceId)

      setState(prev => {
        if (!prev) return prev
        return {
          ...prev,
          status: 'cancelled',
          endTime: Date.now(),
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel execution'
      setError(errorMessage)
      onError?.(errorMessage)
      throw err
    }
  }, [onError])

  /**
   * 添加日志
   */
  const addLog = useCallback(async (
    level: 'info' | 'warn' | 'error',
    message: string,
    nodeId?: string
  ) => {
    setError(null)

    try {
      const currentState = stateRef.current
      if (!currentState) {
        throw new Error('No execution state')
      }

      await storageRef.current?.addExecutionLog(currentState.instanceId, level, message, nodeId)

      setState(prev => {
        if (!prev) return prev
        return {
          ...prev,
          logs: [...prev.logs, { timestamp: Date.now(), level, message, nodeId }].slice(-100),
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add log'
      setError(errorMessage)
      onError?.(errorMessage)
      throw err
    }
  }, [onError])

  /**
   * 更新变量
   */
  const updateVariables = useCallback(async (variables: Record<string, unknown>) => {
    setError(null)

    try {
      const currentState = stateRef.current
      if (!currentState) {
        throw new Error('No execution state')
      }

      await storageRef.current?.updateVariables(currentState.instanceId, variables)

      setState(prev => {
        if (!prev) return prev
        return {
          ...prev,
          variables: {
            ...prev.variables,
            ...variables,
          },
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update variables'
      setError(errorMessage)
      onError?.(errorMessage)
      throw err
    }
  }, [onError])

  /**
   * 删除执行
   */
  const deleteExecution = useCallback(async () => {
    setError(null)

    try {
      const currentState = stateRef.current
      if (!currentState) {
        throw new Error('No execution state')
      }

      await storageRef.current?.deleteExecution(currentState.instanceId)
      setState(null)
      onDelete?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete execution'
      setError(errorMessage)
      onError?.(errorMessage)
      throw err
    }
  }, [onDelete, onError])

  /**
   * 状态检查函数
   */
  const canResume = useCallback(() => {
    const currentState = stateRef.current
    if (!currentState) return false
    return ['pending', 'running', 'paused'].includes(currentState.status)
  }, [])

  const isCompleted = useCallback(() => {
    return stateRef.current?.status === 'completed'
  }, [])

  const isFailed = useCallback(() => {
    return stateRef.current?.status === 'failed'
  }, [])

  const isPaused = useCallback(() => {
    return stateRef.current?.status === 'paused'
  }, [])

  const isRunning = useCallback(() => {
    return stateRef.current?.status === 'running'
  }, [])

  return {
    // 状态
    executionId,
    executionState: state,
    isLoading,
    error,

    // 操作
    initializeExecution,
    loadExecution,
    saveState,
    updateProgress,
    updateNode,
    complete,
    fail,
    pause,
    resume,
    cancel,
    addLog,
    updateVariables,
    deleteExecution,

    // 状态检查
    canResume,
    isCompleted,
    isFailed,
    isPaused,
    isRunning,
  }
}
