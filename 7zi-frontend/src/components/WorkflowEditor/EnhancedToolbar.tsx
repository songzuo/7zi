/**
 * 增强的工具栏组件
 *
 * 🎨 设计师: Designer
 * 创建日期: 2026-04-03
 * 版本: v1.10.0
 *
 * 增强的工具栏，支持更多操作和快捷键
 */

import React, { useState } from 'react'
import {
  Save,
  Play,
  CheckCircle,
  Download,
  Upload,
  Undo,
  Redo,
  Copy,
  Trash2,
  Layout,
  Search,
  Keyboard,
  Grid,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize,
  MoreVertical,
} from 'lucide-react'
import type { WorkflowDefinition } from '../types'
import { AutoLayoutPanel, type LayoutType } from './AutoLayout'

interface EnhancedToolbarProps {
  onSave: () => void
  onRun: () => void
  onValidate: () => void
  onExport?: (exportData: WorkflowDefinition) => void
  onImport?: (workflow: WorkflowDefinition) => void
  workflow: WorkflowDefinition
  isExecuting: boolean
  readOnly?: boolean
  hasErrors?: boolean
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFitView?: () => void
  onToggleGrid?: () => void
  onToggleMiniMap?: () => void
  onShowShortcuts?: () => void
  onShowSearch?: () => void
  onAutoLayout?: (type: LayoutType) => void
}

export const EnhancedToolbar: React.FC<EnhancedToolbarProps> = ({
  onSave,
  onRun,
  onValidate,
  onExport,
  onImport,
  workflow,
  isExecuting,
  readOnly = false,
  hasErrors = false,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onDuplicate,
  onDelete,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleGrid,
  onToggleMiniMap,
  onShowShortcuts,
  onShowSearch,
  onAutoLayout,
}) => {
  const [showLayoutPanel, setShowLayoutPanel] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  const handleExport = () => {
    const exportData = {
      version: '1.10.0',
      exportedAt: new Date().toISOString(),
      workflow,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workflow.name || 'workflow'}.json`
    a.click()
    URL.revokeObjectURL(url)

    onExport?.(exportData)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string)
          if (data.workflow) {
            onImport?.(data.workflow)
          }
        } catch (error) {
          console.error('Failed to import workflow:', error)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <>
      {/* 主工具栏 */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
        {/* 左侧：主要操作 */}
        <div className="flex items-center gap-2">
          {/* 保存 */}
          <button
            onClick={onSave}
            disabled={readOnly}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
            title="保存 (Ctrl+S)"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">保存</span>
          </button>

          {/* 运行 */}
          <button
            onClick={onRun}
            disabled={isExecuting || hasErrors || readOnly}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              hasErrors
                ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-900/30'
                : isExecuting
                  ? 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-900/30'
                  : 'bg-green-600 hover:bg-green-700 disabled:bg-green-900/30'
            } text-white disabled:cursor-not-allowed disabled:opacity-50`}
            title="运行 (Ctrl+Enter)"
          >
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">{isExecuting ? '运行中...' : hasErrors ? '修复错误' : '运行'}</span>
          </button>

          {/* 验证 */}
          <button
            onClick={onValidate}
            disabled={readOnly}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              hasErrors
                ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
            }`}
            title="验证 (Ctrl+Shift+V)"
          >
            <CheckCircle className="h-4 w-4" />
            <span>验证</span>
          </button>

          <div className="mx-2 h-6 w-px bg-gray-300 dark:bg-gray-600" />

          {/* 撤销/重做 */}
          <div className="flex items-center gap-1">
            <button
              onClick={onUndo}
              disabled={!canUndo || readOnly}
              className="rounded-lg p-1.5 text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
              title="撤销 (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo || readOnly}
              className="rounded-lg p-1.5 text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
              title="重做 (Ctrl+Y)"
            >
              <Redo className="h-4 w-4" />
            </button>
          </div>

          <div className="mx-2 h-6 w-px bg-gray-300 dark:bg-gray-600" />

          {/* 复制/删除 */}
          <div className="flex items-center gap-1">
            <button
              onClick={onDuplicate}
              disabled={readOnly}
              className="rounded-lg p-1.5 text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
              title="复制 (Ctrl+D)"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              disabled={readOnly}
              className="rounded-lg p-1.5 text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
              title="删除 (Delete)"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 中间：视图操作 */}
        <div className="flex items-center gap-2">
          {/* 自动布局 */}
          <div className="relative">
            <button
              onClick={() => setShowLayoutPanel(!showLayoutPanel)}
              disabled={readOnly}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
              title="自动布局 (Ctrl+L)"
            >
              <Layout className="h-4 w-4" />
              <span>布局</span>
            </button>

            {showLayoutPanel && (
              <div className="absolute top-full left-0 z-50 mt-2">
                <AutoLayoutPanel
                  onLayout={(type) => {
                    onAutoLayout?.(type)
                    setShowLayoutPanel(false)
                  }}
                  disabled={readOnly}
                />
              </div>
            )}
          </div>

          {/* 缩放 */}
          <div className="flex items-center gap-1">
            <button
              onClick={onZoomOut}
              className="rounded-lg p-1.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              title="缩小 (Ctrl+-)"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={onFitView}
              className="rounded-lg p-1.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              title="适应视图 (Ctrl+Shift+F)"
            >
              <Maximize className="h-4 w-4" />
            </button>
            <button
              onClick={onZoomIn}
              className="rounded-lg p-1.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              title="放大 (Ctrl+=)"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          <div className="mx-2 h-6 w-px bg-gray-300 dark:bg-gray-600" />

          {/* 视图选项 */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleGrid}
              className="rounded-lg p-1.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              title="切换网格"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={onToggleMiniMap}
              className="rounded-lg p-1.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              title="切换小地图"
            >
              <Layers className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 右侧：辅助功能 */}
        <div className="flex items-center gap-2">
          {/* 搜索 */}
          <button
            onClick={onShowSearch}
            className="rounded-lg p-1.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            title="搜索节点 (Ctrl+F)"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* 快捷键 */}
          <button
            onClick={onShowShortcuts}
            className="rounded-lg p-1.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            title="快捷键 (?)"
          >
            <Keyboard className="h-4 w-4" />
          </button>

          <div className="mx-2 h-6 w-px bg-gray-300 dark:bg-gray-600" />

          {/* 导入/导出 */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleImport}
              disabled={readOnly}
              className="rounded-lg p-1.5 text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
              title="导入 (Ctrl+I)"
            >
              <Upload className="h-4 w-4" />
            </button>
            <button
              onClick={handleExport}
              className="rounded-lg p-1.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              title="导出 (Ctrl+E)"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>

          {/* 更多菜单 */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="rounded-lg p-1.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg bg-white py-1 shadow-lg dark:bg-gray-800">
                <button
                  onClick={() => {
                    onToggleGrid?.()
                    setShowMoreMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  切换网格
                </button>
                <button
                  onClick={() => {
                    onToggleMiniMap?.()
                    setShowMoreMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  切换小地图
                </button>
                <button
                  onClick={() => {
                    onShowShortcuts?.()
                    setShowMoreMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  快捷键帮助
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default EnhancedToolbar