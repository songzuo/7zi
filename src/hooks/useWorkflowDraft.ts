/**
 * useWorkflowDraft Hook
 * 工作流草稿管理 Hook
 * 
 * 功能:
 * - 自动保存草稿
 * - 草稿列表管理
 * - 恢复草稿
 * - 删除草稿
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { WorkflowDefinition } from '@/types/workflow'
import { 
  DraftStorage, 
  WorkflowDraft, 
  DraftMetadata, 
  getDraftStorage, 
  isIndexedDBAvailable 
} from '@/lib/storage/draft-storage'

/**
 * Hook 配置
 */
interface UseWorkflowDraftOptions {
  /** 自动保存间隔（毫秒），默认 30000 (30秒) */
  autoSaveInterval?: number
  /** 是否启用自动保存，默认 true */
  enableAutoSave?: boolean
  /** 草稿变更回调 */
  onDraftChange?: (draft: WorkflowDraft | null) => void
  /** 自动保存回调 */
  onAutoSave?: (draft: WorkflowDraft) => void
  /** 错误回调 */
  onError?: (error: Error) => void
}

/**
 * Hook 返回值
 */
interface UseWorkflowDraftReturn {
  /** 当前草稿 */
  currentDraft: WorkflowDraft | null
  /** 所有草稿元数据 */
  draftList: DraftMetadata[]
  /** 是否正在加载 */
  isLoading: boolean
  /** 是否正在保存 */
  isSaving: boolean
  /** IndexedDB 是否可用 */
  isAvailable: boolean
  /** 最后保存时间 */
  lastSavedAt: Date | null
  /** 保存草稿 */
  saveDraft: (workflow: WorkflowDefinition, autoSaved?: boolean) => Promise<void>
  /** 加载草稿 */
  loadDraft: (id: string) => Promise<WorkflowDraft | null>
  /** 删除草稿 */
  deleteDraft: (id: string) => Promise<void>
  /** 刷新草稿列表 */
  refreshDraftList: () => Promise<void>
  /** 手动触发自动保存 */
  triggerAutoSave: (workflow: WorkflowDefinition) => void
  /** 清空所有草稿 */
  clearAllDrafts: () => Promise<void>
}

/**
 * 工作流草稿管理 Hook
 */
export function useWorkflowDraft(options: UseWorkflowDraftOptions = {}): UseWorkflowDraftReturn {
  const {
    autoSaveInterval = 30000,
    enableAutoSave = true,
    onDraftChange,
    onAutoSave,
    onError,
  } = options

  const storageRef = useRef<DraftStorage | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingWorkflowRef = useRef<WorkflowDefinition | null>(null)

  const [currentDraft, setCurrentDraft] = useState<WorkflowDraft | null>(null)
  const [draftList, setDraftList] = useState<DraftMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAvailable, setIsAvailable] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  /**
   * 初始化
   */
  useEffect(() => {
    const init = async () => {
      try {
        const available = await isIndexedDBAvailable()
        setIsAvailable(available)

        if (available) {
          storageRef.current = getDraftStorage()
          await refreshDraftList()
        }
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Failed to initialize draft storage'))
      } finally {
        setIsLoading(false)
      }
    }

    init()

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [])

  /**
   * 自动保存逻辑
   */
  useEffect(() => {
    if (!enableAutoSave || !isAvailable) return

    const performAutoSave = async () => {
      if (!pendingWorkflowRef.current || !storageRef.current) return

      try {
        setIsSaving(true)
        const draft = storageRef.current.createDraftFromWorkflow(pendingWorkflowRef.current, true)
        await storageRef.current.saveDraft(draft)
        
        setCurrentDraft(draft)
        setLastSavedAt(new Date())
        onAutoSave?.(draft)
        await refreshDraftList()
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Auto-save failed'))
      } finally {
        setIsSaving(false)
      }
    }

    autoSaveTimerRef.current = setInterval(performAutoSave, autoSaveInterval)

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [enableAutoSave, autoSaveInterval, isAvailable, onAutoSave, onError])

  /**
   * 保存草稿
   */
  const saveDraft = useCallback(async (workflow: WorkflowDefinition, autoSaved: boolean = false) => {
    if (!storageRef.current) {
      throw new Error('Draft storage not initialized')
    }

    try {
      setIsSaving(true)
      const draft = storageRef.current.createDraftFromWorkflow(workflow, autoSaved)
      await storageRef.current.saveDraft(draft)
      
      setCurrentDraft(draft)
      setLastSavedAt(new Date())
      onDraftChange?.(draft)
      await refreshDraftList()
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to save draft'))
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [onDraftChange, onError])

  /**
   * 加载草稿
   */
  const loadDraft = useCallback(async (id: string): Promise<WorkflowDraft | null> => {
    if (!storageRef.current) {
      throw new Error('Draft storage not initialized')
    }

    try {
      setIsLoading(true)
      const draft = await storageRef.current.getDraft(id)
      
      if (draft) {
        setCurrentDraft(draft)
        onDraftChange?.(draft)
      }
      
      return draft
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to load draft'))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [onDraftChange, onError])

  /**
   * 删除草稿
   */
  const deleteDraft = useCallback(async (id: string) => {
    if (!storageRef.current) {
      throw new Error('Draft storage not initialized')
    }

    try {
      await storageRef.current.deleteDraft(id)
      
      if (currentDraft?.id === id) {
        setCurrentDraft(null)
        onDraftChange?.(null)
      }
      
      await refreshDraftList()
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to delete draft'))
      throw error
    }
  }, [currentDraft, onDraftChange, onError])

  /**
   * 刷新草稿列表
   */
  const refreshDraftList = useCallback(async () => {
    if (!storageRef.current) return

    try {
      const list = await storageRef.current.getAllDraftMetadata()
      setDraftList(list)
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to refresh draft list'))
    }
  }, [onError])

  /**
   * 手动触发自动保存
   */
  const triggerAutoSave = useCallback((workflow: WorkflowDefinition) => {
    pendingWorkflowRef.current = workflow
  }, [])

  /**
   * 清空所有草稿
   */
  const clearAllDrafts = useCallback(async () => {
    if (!storageRef.current) {
      throw new Error('Draft storage not initialized')
    }

    try {
      await storageRef.current.clearAllDrafts()
      setCurrentDraft(null)
      setDraftList([])
      onDraftChange?.(null)
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to clear all drafts'))
      throw error
    }
  }, [onDraftChange, onError])

  return {
    currentDraft,
    draftList,
    isLoading,
    isSaving,
    isAvailable,
    lastSavedAt,
    saveDraft,
    loadDraft,
    deleteDraft,
    refreshDraftList,
    triggerAutoSave,
    clearAllDrafts,
  }
}
