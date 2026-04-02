/**
 * StatusBar - 状态栏
 *
 * 底部状态栏，显示节点数量、边数量、验证状态等
 */

import React from 'react'

interface StatusBarProps {
  nodesCount: number
  edgesCount: number
  validationStatus: 'valid' | 'invalid' | 'unknown'
  executionStatus?: string
}

export function StatusBar({
  nodesCount,
  edgesCount,
  validationStatus,
  executionStatus,
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
      </div>

      {/* 右侧：执行状态 */}
      <div className="flex items-center gap-4">
        {executionStatus && (
          <div className="flex items-center gap-1">
            <span>🔄</span>
            <span>状态: {executionStatus}</span>
          </div>
        )}
        <div className="text-gray-400">按 ? 查看快捷键</div>
      </div>
    </div>
  )
}
