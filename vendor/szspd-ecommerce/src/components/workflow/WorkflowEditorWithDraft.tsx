/**
 * WorkflowEditorWithDraft.tsx
 * 带草稿存储功能的工作流编辑器
 * 
 * 功能:
 * - 自动保存草稿
 * - 草稿恢复
 * - 草稿列表
 * - 离线支持
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { WorkflowDefinition, WorkflowStatus } from '@/types/workflow'
import { WorkflowEditor } from './WorkflowEditor'
import { useWorkflowDraft } from '@/hooks/useWorkflowDraft'
import { WorkflowDraft, DraftMetadata } from '@/lib/storage/draft-storage'
import { cn } from '@/lib/utils'

interface WorkflowEditorWithDraftProps {
  /** 初始工作流 */
  initialWorkflow?: WorkflowDefinition
  /** 保存回调 */
  onSave?: (workflow: WorkflowDefinition) => void
  /** 只读模式 */
  readOnly?: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * 带草稿存储的工作流编辑器
 */
export function WorkflowEditorWithDraft({
  initialWorkflow,
  onSave,
  readOnly = false,
  className,
}: WorkflowEditorWithDraftProps) {
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowDefinition | undefined>(initialWorkflow)
  const [showDraftList, setShowDraftList] = useState(false)
  const [draftToRestore, setDraftToRestore] = useState<WorkflowDraft | null>(null)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)

  const {
    currentDraft,
    draftList,
    isLoading,
    isSaving,
    isAvailable,
    lastSavedAt,
    saveDraft,
    loadDraft,
    deleteDraft,
    triggerAutoSave,
  } = useWorkflowDraft({
    autoSaveInterval: 30000,
    enableAutoSave: true,
    onAutoSave: (draft) => {
      console.log('Auto-saved draft:', draft.name, 'at', draft.updatedAt)
    },
    onError: (error) => {
      console.error('Draft storage error:', error)
    },
  })

  /**
   * 检查是否有未保存的草稿
   */
  useEffect(() => {
    const checkForUnsavedDraft = async () => {
      if (!isAvailable || draftList.length === 0 || initialWorkflow) return

      // 找到最近更新的草稿
      const latestDraft = draftList[0]
      if (!latestDraft) return

      // 如果草稿更新时间在最近 24 小时内，提示用户恢复
      const draftTime = new Date(latestDraft.updatedAt).getTime()
      const now = Date.now()
      const hoursDiff = (now - draftTime) / (1000 * 60 * 60)

      if (hoursDiff < 24) {
        const shouldRestore = window.confirm(
          `检测到未保存的草稿 "${latestDraft.name}" (${new Date(latestDraft.updatedAt).toLocaleString()})\n\n是否恢复此草稿？`
        )

        if (shouldRestore) {
          const draft = await loadDraft(latestDraft.id)
          if (draft) {
            setCurrentWorkflow(draft.workflow)
          }
        }
      }
    }

    if (!isLoading) {
      checkForUnsavedDraft()
    }
  }, [isLoading, draftList, isAvailable, initialWorkflow, loadDraft])

  /**
   * 处理工作流变更
   */
  const handleWorkflowChange = useCallback((workflow: WorkflowDefinition) => {
    setCurrentWorkflow(workflow)
    // 触发自动保存
    if (isAvailable) {
      triggerAutoSave(workflow)
    }
  }, [isAvailable, triggerAutoSave])

  /**
   * 处理保存
   */
  const handleSave = useCallback(async (workflow: WorkflowDefinition) => {
    // 先保存到 IndexedDB
    if (isAvailable) {
      await saveDraft(workflow, false)
    }
    
    // 然后调用外部保存回调
    onSave?.(workflow)
  }, [isAvailable, saveDraft, onSave])

  /**
   * 恢复草稿
   */
  const handleRestoreDraft = useCallback(async (metadata: DraftMetadata) => {
    const draft = await loadDraft(metadata.id)
    if (draft) {
      setDraftToRestore(draft)
      setShowRestoreConfirm(true)
    }
  }, [loadDraft])

  /**
   * 确认恢复草稿
   */
  const confirmRestore = useCallback(() => {
    if (draftToRestore) {
      setCurrentWorkflow(draftToRestore.workflow)
      setShowRestoreConfirm(false)
      setDraftToRestore(null)
      setShowDraftList(false)
    }
  }, [draftToRestore])

  /**
   * 删除草稿
   */
  const handleDeleteDraft = useCallback(async (id: string) => {
    if (window.confirm('确定要删除此草稿吗？此操作不可撤销。')) {
      await deleteDraft(id)
    }
  }, [deleteDraft])

  /**
   * 格式化时间
   */
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes} 分钟前`
    if (hours < 24) return `${hours} 小时前`
    if (days < 7) return `${days} 天前`
    return date.toLocaleDateString()
  }

  return (
    <div className={cn('relative', className)}>
      {/* 状态栏 */}
      {isAvailable && (
        <div className="absolute top-0 right-0 z-10 flex items-center gap-2 p-2 bg-background/80 backdrop-blur-sm border-b border-l rounded-bl-lg">
          {isSaving && (
            <span className="text-xs text-muted-foreground animate-pulse">
              正在保存...
            </span>
          )}
          {lastSavedAt && !isSaving && (
            <span className="text-xs text-muted-foreground">
              上次保存: {lastSavedAt.toLocaleTimeString()}
            </span>
          )}
          {currentDraft?.autoSaved && (
            <span className="text-xs text-amber-500">
              自动保存
            </span>
          )}
        </div>
      )}

      {/* 草稿列表按钮 */}
      {isAvailable && draftList.length > 0 && (
        <button
          onClick={() => setShowDraftList(!showDraftList)}
          className="absolute top-2 left-2 z-10 px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          草稿 ({draftList.length})
        </button>
      )}

      {/* 草稿列表面板 */}
      {showDraftList && (
        <div className="absolute top-12 left-2 z-20 w-80 max-h-96 overflow-auto bg-background border rounded-lg shadow-lg">
          <div className="sticky top-0 bg-background p-2 border-b font-medium">
            已保存的草稿
          </div>
          <div className="p-2 space-y-2">
            {draftList.map((draft) => (
              <div
                key={draft.id}
                className="p-2 border rounded hover:bg-accent/50 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1" onClick={() => handleRestoreDraft(draft)}>
                    <div className="font-medium text-sm">{draft.name}</div>
                    {draft.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {draft.description}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatTime(draft.updatedAt)}
                      {draft.autoSaved && ' · 自动保存'}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteDraft(draft.id)
                    }}
                    className="text-xs text-destructive hover:underline"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 恢复确认对话框 */}
      {showRestoreConfirm && draftToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background p-6 rounded-lg shadow-xl max-w-md">
            <h3 className="text-lg font-semibold mb-2">恢复草稿</h3>
            <p className="text-sm text-muted-foreground mb-4">
              确定要恢复草稿 "{draftToRestore.name}" 吗？
              <br />
              当前未保存的更改将会丢失。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRestoreConfirm(false)
                  setDraftToRestore(null)
                }}
                className="px-4 py-2 text-sm border rounded hover:bg-accent"
              >
                取消
              </button>
              <button
                onClick={confirmRestore}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                恢复
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IndexedDB 不可用提示 */}
      {!isAvailable && !isLoading && (
        <div className="absolute top-2 right-2 z-10 px-3 py-1 text-xs bg-amber-100 text-amber-900 rounded border border-amber-200">
          离线存储不可用
        </div>
      )}

      {/* 工作流编辑器 */}
      <WorkflowEditor
        initialWorkflow={currentWorkflow}
        onChange={handleWorkflowChange}
        onSave={handleSave}
        readOnly={readOnly}
      />
    </div>
  )
}
