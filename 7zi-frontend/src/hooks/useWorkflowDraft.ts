/**
 * useWorkflowDraft - 工作流草稿管理 Hook
 * 
 * 提供草稿的自动保存、恢复和状态管理功能
 * 
 * @package 7zi-frontend
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { draftStorage, type WorkflowDraft } from '../lib/storage/draft-storage'

/**
 * Hook 配置选项
 */
export interface UseWorkflowDraftOptions {
  /** 工作流 ID */
  workflowId: string
  /** 自动保存延迟（毫秒），默认 2000ms */
  autoSaveDelay?: number
  /** 是否启用自动保存，默认 true */
  autoSaveEnabled?: boolean
  /** 草稿加载完成后的回调 */
  onDraftLoaded?: (draft: WorkflowDraft | null) => void
  /** 草稿保存完成后的回调 */
  onDraftSaved?: (draft: WorkflowDraft) => void
  /** 草稿删除后的回调 */
  onDraftDeleted?: () => void
  /** 错误回调 */
  onError?: (error: Error) => void
}

/**
 * Hook 返回状态
 */
export interface UseWorkflowDraftState {
  /** 当前草稿数据 */
  draft: WorkflowDraft | null
  /** 是否正在加载 */
  isLoading: boolean
  /** 是否正在保存 */
  isSaving: boolean
  /** 是否有未保存的更改 */
  hasUnsavedChanges: boolean
  /** 错误信息 */
  error: Error | null
  /** 最后保存时间 */
  lastSavedAt: string | null
}

/**
 * Hook 返回方法
 */
export interface UseWorkflowDraftActions {
  /** 保存草稿 */
  saveDraft: (data: Omit<WorkflowDraft, 'id' | 'workflowId'> & { metadata?: Partial<WorkflowDraft['metadata']> }) => Promise<void>
  /** 加载草稿 */
  loadDraft: () => Promise<void>
  /** 删除草稿 */
  deleteDraft: () => Promise<void>
  /** 标记为有未保存更改 */
  markDirty: () => void
  /** 清除错误 */
  clearError: () => void
  /** 手动触发保存 */
  triggerSave: () => Promise<void>
}

/**
 * 组合返回类型
 */
export type UseWorkflowDraftReturn = UseWorkflowDraftState & UseWorkflowDraftActions

/**
 * 工作流节点和边的类型（与 React Flow 兼容）
 */
interface FlowNode {
  id: string
  type?: string
  position: { x: number; y: number }
  data?: Record<string, unknown>
}

interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  data?: Record<string, unknown>
}

/**
 * 草稿数据输入类型
 */
interface DraftInput {
  name?: string
  nodes?: FlowNode[]
  edges?: FlowEdge[]
  variables?: Array<{
    name: string
    type: string
    defaultValue?: unknown
  }>
  metadata?: {
    createdBy?: string
    description?: string
  }
}

/**
 * useWorkflowDraft Hook
 * 
 * @example
 * ```tsx
 * const {
 *   draft,
 *   isLoading,
 *   isSaving,
 *   hasUnsavedChanges,
 *   saveDraft,
 *   loadDraft,
 *   deleteDraft,
 * } = useWorkflowDraft({
 *   workflowId: 'workflow-123',
 *   autoSaveDelay: 2000,
 *   autoSaveEnabled: true,
 * })
 * ```
 */
export function useWorkflowDraft(options: UseWorkflowDraftOptions): UseWorkflowDraftReturn {
  const {
    workflowId,
    autoSaveDelay = 2000,
    autoSaveEnabled = true,
    onDraftLoaded,
    onDraftSaved,
    onDraftDeleted,
    onError,
  } = options

  // 状态
  const [draft, setDraft] = useState<WorkflowDraft | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  // Refs
  const pendingDataRef = useRef<DraftInput | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // 清理函数
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  /**
   * 保存草稿
   */
  const saveDraft = useCallback(async (data: DraftInput) => {
    if (!workflowId) return

    // 更新待保存数据
    pendingDataRef.current = data
    setHasUnsavedChanges(true)

    if (!autoSaveEnabled) {
      // 如果不启用自动保存，直接保存
      setIsSaving(true)
      try {
        const savedDraft = await draftStorage.saveDraft(workflowId, data)
        if (isMountedRef.current) {
          setDraft(savedDraft)
          setLastSavedAt(savedDraft.autoSavedAt || null)
          setHasUnsavedChanges(false)
          onDraftSaved?.(savedDraft)
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('保存草稿失败')
        if (isMountedRef.current) {
          setError(error)
          onError?.(error)
        }
      } finally {
        if (isMountedRef.current) {
          setIsSaving(false)
        }
      }
      return
    }

    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // 设置新的自动保存定时器
    saveTimeoutRef.current = setTimeout(async () => {
      const dataToSave = pendingDataRef.current
      if (!dataToSave) return

      setIsSaving(true)
      try {
        const savedDraft = await draftStorage.saveDraft(workflowId, dataToSave)
        if (isMountedRef.current) {
          setDraft(savedDraft)
          setLastSavedAt(savedDraft.autoSavedAt || null)
          setHasUnsavedChanges(false)
          pendingDataRef.current = null
          onDraftSaved?.(savedDraft)
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('保存草稿失败')
        if (isMountedRef.current) {
          setError(error)
          onError?.(error)
        }
      } finally {
        if (isMountedRef.current) {
          setIsSaving(false)
        }
      }
    }, autoSaveDelay)
  }, [workflowId, autoSaveEnabled, autoSaveDelay, onDraftSaved, onError])

  /**
   * 手动触发保存
   */
  const triggerSave = useCallback(async () => {
    // 清除定时器并立即保存
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    const dataToSave = pendingDataRef.current
    if (!dataToSave && !hasUnsavedChanges) return

    setIsSaving(true)
    try {
      const saveData = dataToSave || {
        name: draft?.name || '未命名草稿',
        nodes: draft?.nodes || [],
        edges: draft?.edges || [],
        variables: draft?.variables,
        metadata: draft?.metadata,
      }
      const savedDraft = await draftStorage.saveDraft(workflowId, saveData)
      if (isMountedRef.current) {
        setDraft(savedDraft)
        setLastSavedAt(savedDraft.autoSavedAt || null)
        setHasUnsavedChanges(false)
        pendingDataRef.current = null
        onDraftSaved?.(savedDraft)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('保存草稿失败')
      if (isMountedRef.current) {
        setError(error)
        onError?.(error)
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false)
      }
    }
  }, [workflowId, draft, hasUnsavedChanges, onDraftSaved, onError])

  /**
   * 加载草稿
   */
  const loadDraft = useCallback(async () => {
    if (!workflowId) return

    setIsLoading(true)
    setError(null)

    try {
      const loadedDraft = await draftStorage.loadDraft(workflowId)
      if (isMountedRef.current) {
        setDraft(loadedDraft)
        setLastSavedAt(loadedDraft?.autoSavedAt || null)
        setHasUnsavedChanges(false)
        onDraftLoaded?.(loadedDraft)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('加载草稿失败')
      if (isMountedRef.current) {
        setError(error)
        onError?.(error)
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [workflowId, onDraftLoaded, onError])

  /**
   * 删除草稿
   */
  const deleteDraft = useCallback(async () => {
    if (!workflowId) return

    try {
      const deleted = await draftStorage.deleteDraft(workflowId)
      if (deleted && isMountedRef.current) {
        setDraft(null)
        setHasUnsavedChanges(false)
        setLastSavedAt(null)
        pendingDataRef.current = null
        onDraftDeleted?.()
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('删除草稿失败')
      if (isMountedRef.current) {
        setError(error)
        onError?.(error)
      }
    }
  }, [workflowId, onDraftDeleted, onError])

  /**
   * 标记为有未保存更改
   */
  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true)
  }, [])

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // 初始加载
  useEffect(() => {
    if (workflowId) {
      loadDraft()
    }
  }, [workflowId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 组合返回对象
  const state = useMemo<UseWorkflowDraftState>(() => ({
    draft,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    error,
    lastSavedAt,
  }), [draft, isLoading, isSaving, hasUnsavedChanges, error, lastSavedAt])

  const actions = useMemo<UseWorkflowDraftActions>(() => ({
    saveDraft,
    loadDraft,
    deleteDraft,
    markDirty,
    clearError,
    triggerSave,
  }), [saveDraft, loadDraft, deleteDraft, markDirty, clearError, triggerSave])

  return { ...state, ...actions }
}

/**
 * 列出所有草稿的 Hook
 * 
 * @example
 * ```tsx
 * const { drafts, isLoading, refresh } = useDraftList()
 * ```
 */
export function useDraftList() {
  const [drafts, setDrafts] = useState<WorkflowDraft[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadDrafts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const loadedDrafts = await draftStorage.listDrafts()
      setDrafts(loadedDrafts)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载草稿列表失败'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  return {
    drafts,
    isLoading,
    error,
    refresh: loadDrafts,
    clearAll: async () => {
      await draftStorage.clearAllDrafts()
      await loadDrafts()
    },
  }
}

export type { WorkflowDraft }
