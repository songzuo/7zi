/**
 * Toolbar - 工具栏
 *
 * 顶部工具栏，包含保存、运行、验证、撤销、重做等操作
 * v1.9.1 更新: 新增导出/导入功能
 */

import React from 'react'
import { useUndoRedo } from './stores/workflow-editor-store'
import { WorkflowExporter } from './WorkflowExporter'
import type { WorkflowDefinition, WorkflowExport } from './types'

interface ToolbarProps {
  onSave: () => void
  onRun: () => void
  onValidate: () => void
  onExport?: (exportData: WorkflowExport) => void
  onImport?: (workflow: WorkflowDefinition) => void
  workflow?: WorkflowDefinition
  isExecuting?: boolean
  readOnly?: boolean
  hasErrors?: boolean
}

export function Toolbar({
  onSave,
  onRun,
  onValidate,
  onExport,
  onImport,
  workflow,
  isExecuting = false,
  readOnly = false,
  hasErrors = false,
}: ToolbarProps) {
  const { undo, redo, canUndo, canRedo } = useUndoRedo()

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">工作流编辑器</h1>
        {hasErrors ? (
          <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <span>⚠️</span>
            <span>有验证错误</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <span>✅</span>
            <span>已验证</span>
          </span>
        )}
      </div>

      {/* 中间：撤销/重做 */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={readOnly || !canUndo}
          className="flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          title="撤销 (Ctrl+Z)"
        >
          <span>↩️</span>
          <span>撤销</span>
        </button>
        <button
          onClick={redo}
          disabled={readOnly || !canRedo}
          className="flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          title="重做 (Ctrl+Y)"
        >
          <span>↪️</span>
          <span>重做</span>
        </button>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2">
        {/* v1.9.1: 导出/导入 */}
        {workflow && (
          <WorkflowExporter
            workflow={workflow}
            onExport={onExport}
            onImport={onImport}
          />
        )}

        {/* 验证按钮 */}
        <button
          onClick={onValidate}
          disabled={readOnly}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          title="验证工作流 (Ctrl+Shift+V)"
        >
          <span>✅</span>
          <span>验证</span>
        </button>

        {/* 保存按钮 */}
        <button
          onClick={onSave}
          disabled={readOnly}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          title="保存工作流 (Ctrl+S)"
        >
          <span>💾</span>
          <span>保存</span>
        </button>

        {/* 运行按钮 */}
        <button
          onClick={onRun}
          disabled={readOnly || isExecuting || hasErrors}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600"
          title="运行工作流 (Ctrl+Enter)"
        >
          <span>{isExecuting ? '⏳' : '▶️'}</span>
          <span>{isExecuting ? '运行中...' : '运行'}</span>
        </button>
      </div>
    </div>
  )
}

export default Toolbar