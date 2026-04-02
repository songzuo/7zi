/**
 * @fileoverview 任务创建 Hook
 * @description 管理对话式任务创建的状态和逻辑
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import { WorkflowDefinition } from '@/types/workflow'
import {
  parseTaskFromText,
  parsedTaskToWorkflowDefinition,
  validateParsedTask,
  ParsedTask,
} from '@/lib/workflow/TaskParser'

/**
 * 任务创建状态
 */
export interface TaskCreationState {
  /** 当前步骤 */
  step: 'input' | 'preview' | 'confirm' | 'success'
  /** 解析后的任务 */
  parsedTask: ParsedTask | null
  /** 生成的工组流 */
  workflow: WorkflowDefinition | null
  /** 错误信息 */
  error: string | null
  /** 是否正在处理 */
  isProcessing: boolean
  /** 历史输入记录 */
  history: string[]
  /** 历史索引 */
  historyIndex: number
}

/**
 * Hook 返回值
 */
export interface UseTaskCreationReturn {
  /** 状态 */
  state: TaskCreationState
  /** 解析文本 */
  parseText: (text: string) => Promise<ParsedTask | null>
  /** 确认创建 */
  confirmCreation: () => WorkflowDefinition | null
  /** 重新开始 */
  reset: () => void
  /** 更新工作流 */
  updateWorkflow: (updates: Partial<WorkflowDefinition>) => void
  /** 浏览历史 */
  navigateHistory: (direction: 'prev' | 'next') => string | null
  /** 设置错误 */
  setError: (error: string | null) => void
}

/**
 * 初始状态
 */
const initialState: TaskCreationState = {
  step: 'input',
  parsedTask: null,
  workflow: null,
  error: null,
  isProcessing: false,
  history: [],
  historyIndex: -1,
}

/**
 * 任务创建 Hook
 */
export function useTaskCreation(): UseTaskCreationReturn {
  const [state, setState] = useState<TaskCreationState>(initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  /**
   * 解析用户输入的文本
   */
  const parseText = useCallback(async (text: string): Promise<ParsedTask | null> => {
    if (!text.trim()) {
      setState(prev => ({ ...prev, error: '请输入任务描述' }))
      return null
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }))

    try {
      // 解析文本
      const parsedTask = parseTaskFromText(text)

      // 验证解析结果
      const validation = validateParsedTask(parsedTask)

      if (!validation.isValid) {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: validation.errors.join('; '),
        }))
        return null
      }

      // 生成工作流定义
      const workflow = parsedTaskToWorkflowDefinition(parsedTask)

      // 更新历史记录
      setState(prev => {
        const newHistory = [...prev.history, text]
        return {
          ...prev,
          step: 'preview',
          parsedTask,
          workflow,
          isProcessing: false,
          history: newHistory.slice(-20), // 保留最近20条
          historyIndex: newHistory.length - 1,
        }
      })

      return parsedTask
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '解析失败，请重试'
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }))
      return null
    }
  }, [])

  /**
   * 确认创建任务
   */
  const confirmCreation = useCallback((): WorkflowDefinition | null => {
    const currentState = stateRef.current

    if (!currentState.workflow) {
      setState(prev => ({ ...prev, error: '没有可创建的工作流' }))
      return null
    }

    setState(prev => ({ ...prev, step: 'success' }))
    return currentState.workflow
  }, [])

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setState({
      ...initialState,
      history: stateRef.current.history, // 保留历史记录
    })
  }, [])

  /**
   * 更新工作流
   */
  const updateWorkflow = useCallback((updates: Partial<WorkflowDefinition>) => {
    setState(prev => {
      if (!prev.workflow) return prev

      return {
        ...prev,
        workflow: {
          ...prev.workflow,
          ...updates,
          metadata: {
            ...prev.workflow.metadata,
            updatedAt: new Date().toISOString(),
          },
        },
      }
    })
  }, [])

  /**
   * 浏览历史记录
   */
  const navigateHistory = useCallback((direction: 'prev' | 'next'): string | null => {
    const currentState = stateRef.current
    const { history, historyIndex } = currentState

    if (history.length === 0) return null

    let newIndex: number
    if (direction === 'prev') {
      newIndex = Math.max(0, historyIndex - 1)
    } else {
      newIndex = Math.min(history.length - 1, historyIndex + 1)
    }

    if (newIndex === historyIndex) return null

    setState(prev => ({ ...prev, historyIndex: newIndex }))
    return history[newIndex]
  }, [])

  /**
   * 设置错误
   */
  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }, [])

  return {
    state,
    parseText,
    confirmCreation,
    reset,
    updateWorkflow,
    navigateHistory,
    setError,
  }
}

export default useTaskCreation
