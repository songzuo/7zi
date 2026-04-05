/**
 * StatusBar - 状态栏
 *
 * 底部状态栏，显示节点数量、边数量、验证状态、草稿状态等
 */

import React from 'react'

interface StatusBarProps {
  nodesCount: number
  edgesCount: number
  validationStatus: 'valid' | 'invalid' | 'unknown'
  executionStatus?: string
  onShowShortcuts?: () => void
  /** 草稿保存状态 */
  draftStatus?: {
    isSaving: boolean
    hasUnsavedChanges: boolean
    lastSavedAt: string | null
  }
}

export function StatusBar({
  nodesCount,
  edgesCount,
  validationStatus,
  executionStatus,
  onShowShortcuts,
  draftStatus,
}: StatusBarProps) {
  const getValidationIcon = () => {
    switch (validationStatus) {
      case 'valid':
        return '✅'
      case 'invalid':
        return '❌'
      default:
        return '⚠️'
    }
  }

  const getValidationText = () => {
    switch (validationStatus) {
      case 'valid':
        return '验证通过'
      case 'invalid':
        return '验证失败'
      default:
        return '未验证'
    }
  }

  const getDraftStatusText = () => {
    if (draftStatus?.isSaving) {
      return '💾 保存中...'
    }
    if (draftStatus?.hasUnsavedChanges) {
      return '⚠️ 未保存'
    }
    if (draftStatus?.lastSavedAt) {
      const time = new Date(draftStatus.lastSavedAt).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })
      return `💾 已保存 ${time}`
    }
    return null
  }

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
      {/* 左侧：状态信息 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <span>📦</span>
          <span>节点: {nodesCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>🔗</span>
          <span>边: {edgesCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>{getValidationIcon()}</span>
          <span className={validationStatus === 'invalid' ? 'text-red-600 dark:text-red-400' : ''}>
            {getValidationText()}
          </span>
        </div>
        {getDraftStatusText() && (
          <div className="flex items-center gap-1">
            <span className={draftStatus?.hasUnsavedChanges ? 'text-orange-600 dark:text-orange-400' : ''}>
              {getDraftStatusText()}
            </span>
          </div>
        )}
      </div>

      {/* 右侧：执行状态和快捷键帮助 */}
      <div className="flex items-center gap-4">
        {executionStatus && (
          <div className="flex items-center gap-1">
            <span>🔄</span>
            <span>状态: {executionStatus}</span>
          </div>
        )}
        <button
          onClick={onShowShortcuts}
          className="cursor-pointer rounded px-2 py-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          title="查看键盘快捷键"
        >
          ⌨️ 快捷键
        </button>
      </div>
    </div>
  )
}

export default StatusBar
