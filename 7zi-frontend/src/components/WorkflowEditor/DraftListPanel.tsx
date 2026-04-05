/**
 * DraftListPanel - 草稿列表面板
 * 
 * 显示所有工作流草稿，支持加载、删除等操作
 * 
 * @package 7zi-frontend
 */

import React, { useState } from 'react'
import { useDraftList, type WorkflowDraft } from '../../hooks/useWorkflowDraft'

interface DraftListPanelProps {
  isOpen: boolean
  onClose: () => void
  onLoadDraft: (draft: WorkflowDraft) => void
  currentWorkflowId?: string
}

export function DraftListPanel({ isOpen, onClose, onLoadDraft, currentWorkflowId }: DraftListPanelProps) {
  const { drafts, isLoading, error, refresh, clearAll } = useDraftList()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  if (!isOpen) return null

  const handleLoadDraft = (draft: WorkflowDraft) => {
    onLoadDraft(draft)
    onClose()
  }

  const handleDeleteDraft = async (workflowId: string) => {
    if (confirmDelete === workflowId) {
      // 确认删除
      const { draftStorage } = await import('../../lib/storage/draft-storage')
      await draftStorage.deleteDraft(workflowId)
      setConfirmDelete(null)
      refresh()
    } else {
      // 第一次点击，显示确认
      setConfirmDelete(workflowId)
      // 3秒后自动取消确认
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  const handleClearAll = async () => {
    if (confirmDelete === 'all') {
      await clearAll()
      setConfirmDelete(null)
    } else {
      setConfirmDelete('all')
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins} 分钟前`
    if (diffHours < 24) return `${diffHours} 小时前`
    if (diffDays < 7) return `${diffDays} 天前`
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[600px] w-[800px] flex-col rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            工作流草稿
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              title="刷新列表"
            >
              🔄 刷新
            </button>
            <button
              onClick={handleClearAll}
              className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              title="清空所有草稿"
            >
              🗑️ 清空
            </button>
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
              加载中...
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-red-600 dark:text-red-400">
              加载失败: {error.message}
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="mb-4 text-4xl">📝</div>
              <p>暂无草稿</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                    draft.workflowId === currentWorkflowId
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {draft.name}
                      </h3>
                      {draft.workflowId === currentWorkflowId && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          当前
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>📦 {draft.nodes.length} 节点</span>
                      <span>🔗 {draft.edges.length} 边</span>
                      <span>🕐 {formatDate(draft.metadata?.updatedAt || '')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoadDraft(draft)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    >
                      加载
                    </button>
                    <button
                      onClick={() => handleDeleteDraft(draft.workflowId)}
                      className={`rounded-lg px-3 py-1.5 text-sm ${
                        confirmDelete === draft.workflowId
                          ? 'bg-red-600 text-white'
                          : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                      }`}
                    >
                      {confirmDelete === draft.workflowId ? '确认删除?' : '删除'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="border-t border-gray-200 px-6 py-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <div className="flex items-center justify-between">
            <span>共 {drafts.length} 个草稿</span>
            <span>草稿自动保存在浏览器本地存储中</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DraftListPanel