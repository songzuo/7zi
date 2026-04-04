/**
 * React Hooks for Draft Storage
 *
 * 提供 React 组件使用的草稿存储 hooks
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Draft,
  DraftType,
  SaveDraftOptions,
  getDraftStorageManager,
} from './draft-storage'

/**
 * 草稿列表状态
 */
interface UseDraftsResult<T> {
  drafts: Draft<T>[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * 草稿操作状态
 */
interface UseDraftResult<T> {
  draft: Draft<T> | null
  loading: boolean
  saving: boolean
  error: Error | null
  save: (data: T, options?: SaveDraftOptions) => Promise<string>
  update: (data: Partial<T>) => Promise<void>
  remove: () => Promise<void>
}

/**
 * 自动保存配置
 */
interface UseAutoSaveOptions {
  debounceMs?: number
  ttl?: number
  onSave?: (draftId: string) => void
  onError?: (error: Error) => void
}

/**
 * 自动保存结果
 */
interface UseAutoSaveResult<T> {
  isSaving: boolean
  lastSavedAt: number | null
  draftId: string | null
  error: Error | null
  saveNow: () => Promise<void>
  discardDraft: () => Promise<void>
}

/**
 * Hook: 获取草稿列表
 */
export function useDrafts<T = unknown>(type?: DraftType): UseDraftsResult<T> {
  const [drafts, setDrafts] = useState<Draft<T>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const manager = getDraftStorageManager()
      const result = await manager.listDrafts<T>(type)
      setDrafts(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load drafts'))
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { drafts, loading, error, refresh }
}

/**
 * Hook: 管理单个草稿
 */
export function useDraft<T = unknown>(
  draftId: string | null,
  type?: DraftType
): UseDraftResult<T> {
  const [draft, setDraft] = useState<Draft<T> | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // 加载草稿
  useEffect(() => {
    if (!draftId) {
      setDraft(null)
      return
    }

    setLoading(true)
    setError(null)

    getDraftStorageManager()
      .loadDraft<T>(draftId)
      .then(setDraft)
      .catch((err) => setError(err instanceof Error ? err : new Error('Failed to load draft')))
      .finally(() => setLoading(false))
  }, [draftId])

  // 保存草稿
  const save = useCallback(
    async (data: T, options?: SaveDraftOptions): Promise<string> => {
      setSaving(true)
      setError(null)

      try {
        const manager = getDraftStorageManager()
        const id = await manager.saveDraft(type || 'workflow', data, options)
        const newDraft = await manager.loadDraft<T>(id)
        setDraft(newDraft)
        return id
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to save draft')
        setError(error)
        throw error
      } finally {
        setSaving(false)
      }
    },
    [type]
  )

  // 更新草稿
  const update = useCallback(
    async (data: Partial<T>): Promise<void> => {
      if (!draft?.id) {
        throw new Error('No draft to update')
      }

      setSaving(true)
      setError(null)

      try {
        const manager = getDraftStorageManager()
        await manager.updateDraft(draft.id, data)
        const updatedDraft = await manager.loadDraft<T>(draft.id)
        setDraft(updatedDraft)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update draft')
        setError(error)
        throw error
      } finally {
        setSaving(false)
      }
    },
    [draft?.id]
  )

  // 删除草稿
  const remove = useCallback(async (): Promise<void> => {
    if (!draft?.id) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const manager = getDraftStorageManager()
      await manager.deleteDraft(draft.id)
      setDraft(null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete draft')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [draft?.id])

  return { draft, loading, saving, error, save, update, remove }
}

/**
 * Hook: 自动保存功能
 */
export function useAutoSave<T = unknown>(
  type: DraftType,
  data: T | null,
  options: UseAutoSaveOptions = {}
): UseAutoSaveResult<T> {
  const { debounceMs = 2000, ttl, onSave, onError } = options

  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dataRef = useRef<T | null>(null)
  const draftIdRef = useRef<string | null>(null)

  // 更新 ref
  useEffect(() => {
    dataRef.current = data
  }, [data])

  useEffect(() => {
    draftIdRef.current = draftId
  }, [draftId])

  // 保存函数
  const doSave = useCallback(async () => {
    if (dataRef.current === null) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const manager = getDraftStorageManager()

      if (draftIdRef.current) {
        await manager.updateDraft(draftIdRef.current, dataRef.current)
      } else {
        const id = await manager.saveDraft(type, dataRef.current, ttl ? { ttl } : undefined)
        setDraftId(id)
        draftIdRef.current = id
      }

      setLastSavedAt(Date.now())
      onSave?.(draftIdRef.current!)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to auto-save')
      setError(error)
      onError?.(error)
    } finally {
      setIsSaving(false)
    }
  }, [type, ttl, onSave, onError])

  // 防抖保存
  useEffect(() => {
    if (data === null) {
      return
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      doSave()
    }, debounceMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [data, debounceMs, doSave])

  // 立即保存
  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    await doSave()
  }, [doSave])

  // 丢弃草稿
  const discardDraft = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    if (draftIdRef.current) {
      try {
        const manager = getDraftStorageManager()
        await manager.deleteDraft(draftIdRef.current)
        setDraftId(null)
        draftIdRef.current = null
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to discard draft')
        setError(error)
        onError?.(error)
      }
    }
  }, [onError])

  return { isSaving, lastSavedAt, draftId, error, saveNow, discardDraft }
}

/**
 * Hook: 页面初始化时清理过期草稿
 */
export function useDraftInitialization(): { initialized: boolean; clearedCount: number } {
  const [initialized, setInitialized] = useState(false)
  const [clearedCount, setClearedCount] = useState(0)

  useEffect(() => {
    const manager = getDraftStorageManager()
    manager
      .clearExpiredDrafts()
      .then((count) => {
        setClearedCount(count)
        setInitialized(true)
      })
      .catch((error) => {
        console.warn('[useDraftInitialization] Failed to initialize:', error)
        setInitialized(true)
      })
  }, [])

  return { initialized, clearedCount }
}

/**
 * Hook: 恢复最近的草稿
 */
export function useDraftRecovery<T = unknown>(
  type: DraftType
): {
  draft: Draft<T> | null
  loading: boolean
  accept: () => void
  discard: () => Promise<void>
} {
  const [draft, setDraft] = useState<Draft<T> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)

    getDraftStorageManager()
      .listDrafts<T>(type)
      .then((drafts) => {
        if (drafts.length > 0) {
          // 获取最新的草稿
          const latest = drafts.sort((a, b) => b.updatedAt - a.updatedAt)[0]
          setDraft(latest)
        }
      })
      .catch((error) => {
        console.warn('[useDraftRecovery] Failed to load drafts:', error)
      })
      .finally(() => setLoading(false))
  }, [type])

  const accept = useCallback(() => {
    // 用户接受草稿，草稿会被保留
    setDraft(null)
  }, [])

  const discard = useCallback(async () => {
    if (draft?.id) {
      const manager = getDraftStorageManager()
      await manager.deleteDraft(draft.id)
    }
    setDraft(null)
  }, [draft?.id])

  return { draft, loading, accept, discard }
}
