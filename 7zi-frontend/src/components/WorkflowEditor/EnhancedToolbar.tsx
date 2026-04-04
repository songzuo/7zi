/**
 * 增强的工具栏组件 (v1.10.1 UX增强版)
 *
 * 🎨 设计师: Designer
 * 创建日期: 2026-04-03
 * 版本: v1.10.1
 *
 * 增强的工具栏，支持更多操作和快捷键
 * UX增强: 按钮状态指示器、悬停效果、加载动画、工具提示
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
  Loader2,
  AlertCircle,
} from 'lucide-react'
import type { WorkflowDefinition } from './types'
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

/**
 * 工具栏按钮组件 - 统一的按钮样式和状态
 */
const ToolbarButton = React.memo<{
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  active?: boolean
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning'
  icon: React.ReactNode
  label?: string
  title?: string
  className?: string
}>(({ 
  onClick, 
  disabled = false, 
  loading = false, 
  active = false,
  variant = 'default',
  icon, 
  label, 
  title,
  className = ''
}) => {
  const baseStyles = 'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200'
  
  const variantStyles = {
    default: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600',
    success: 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600',
  }

  const disabledStyles = 'disabled:cursor-not-allowed disabled:opacity-50'
  const activeStyles = active ? 'ring-2 ring-indigo-300 ring-offset-2 dark:ring-offset-gray-800' : ''
  const loadingStyles = loading ? 'cursor-wait' : ''

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${activeStyles} ${loadingStyles} ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        icon
      )}
      {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  )
})

ToolbarButton.displayName = 'ToolbarButton'

/**
 * 图标按钮组件 - 仅显示图标
 */
const IconButton = React.memo<{
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  icon: React.ReactNode
  title?: string
  className?: string
}>(({ onClick = () => {}, disabled = false, active = false, icon, title, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`rounded-lg p-1.5 text-gray-700 transition-all duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700 ${
      active ? 'ring-2 ring-indigo-300 ring-offset-2 dark:ring-offset-gray-800' : ''
    } ${className}`}
  >
    {icon}
  </button>
))

IconButton.displayName = 'IconButton'

/**
 * 分隔线组件
 */
const Divider = () => (
  <div className="mx-2 h-6 w-px bg-gray-300 dark:bg-gray-600" />
)

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
  const [isSaving, setIsSaving] = useState(false)

  const handleExport = () => {
    const exportData = {
      version: '1.10.1',
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

    onExport?.(workflow)
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

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave()
    } finally {
      setTimeout(() => setIsSaving(false), 500)
    }
  }

  return (
    <>
      {/* 主工具栏 */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {/* 左侧：主要操作 */}
        <div className="flex items-center gap-2">
          {/* 保存 */}
          <ToolbarButton
            onClick={handleSave}
            disabled={readOnly}
            loading={isSaving}
            icon={<Save className="h-4 w-4" />}
            label="保存"
            title="保存 (Ctrl+S)"
          />

          {/* 运行 */}
          <ToolbarButton
            onClick={onRun}
            disabled={isExecuting || hasErrors || readOnly}
            loading={isExecuting}
            variant={hasErrors ? 'danger' : isExecuting ? 'warning' : 'success'}
            icon={isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            label={isExecuting ? '运行中...' : hasErrors ? '修复错误' : '运行'}
            title="运行 (Ctrl+Enter)"
          />

          {/* 验证 */}
          <ToolbarButton
            onClick={onValidate}
            disabled={readOnly}
            variant={hasErrors ? 'danger' : 'success'}
            icon={hasErrors ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            label={hasErrors ? '错误' : '验证'}
            title="验证工作流"
          />

          <Divider />

          {/* 撤销/重做 */}
          <div className="flex items-center gap-1">
            <IconButton
              onClick={onUndo}
              disabled={!canUndo || readOnly}
              icon={<Undo className="h-4 w-4" />}
              title={`撤销 (Ctrl+Z) ${canUndo ? '' : '(不可用)'}`}
            />
            <IconButton
              onClick={onRedo}
              disabled={!canRedo || readOnly}
              icon={<Redo className="h-4 w-4" />}
              title={`重做 (Ctrl+Y) ${canRedo ? '' : '(不可用)'}`}
            />
          </div>

          <Divider />

          {/* 复制/删除 */}
          <div className="flex items-center gap-1">
            <IconButton
              onClick={onDuplicate}
              disabled={readOnly}
              icon={<Copy className="h-4 w-4" />}
              title="复制 (Ctrl+D)"
            />
            <IconButton
              onClick={onDelete}
              disabled={readOnly}
              icon={<Trash2 className="h-4 w-4" />}
              title="删除 (Delete)"
            />
          </div>
        </div>

        {/* 中间：视图操作 */}
        <div className="flex items-center gap-2">
          {/* 自动布局 */}
          <div className="relative">
            <ToolbarButton
              onClick={() => setShowLayoutPanel(!showLayoutPanel)}
              disabled={readOnly}
              active={showLayoutPanel}
              icon={<Layout className="h-4 w-4" />}
              label="布局"
              title="自动布局 (Ctrl+L)"
            />

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
            <IconButton
              onClick={onZoomOut}
              icon={<ZoomOut className="h-4 w-4" />}
              title="缩小 (Ctrl+-)"
            />
            <IconButton
              onClick={onFitView}
              icon={<Maximize className="h-4 w-4" />}
              title="适应视图 (Ctrl+Shift+F)"
            />
            <IconButton
              onClick={onZoomIn}
              icon={<ZoomIn className="h-4 w-4" />}
              title="放大 (Ctrl+=)"
            />
          </div>

          <Divider />

          {/* 视图选项 */}
          <div className="flex items-center gap-1">
            <IconButton
              onClick={onToggleGrid}
              icon={<Grid className="h-4 w-4" />}
              title="切换网格"
            />
            <IconButton
              onClick={onToggleMiniMap}
              icon={<Layers className="h-4 w-4" />}
              title="切换小地图"
            />
          </div>
        </div>

        {/* 右侧：辅助功能 */}
        <div className="flex items-center gap-2">
          {/* 搜索 */}
          <IconButton
            onClick={onShowSearch}
            icon={<Search className="h-4 w-4" />}
            title="搜索节点 (Ctrl+F)"
          />

          {/* 快捷键 */}
          <IconButton
            onClick={onShowShortcuts}
            icon={<Keyboard className="h-4 w-4" />}
            title="快捷键 (?)"
          />

          <Divider />

          {/* 导入/导出 */}
          <div className="flex items-center gap-1">
            <IconButton
              onClick={handleImport}
              disabled={readOnly}
              icon={<Upload className="h-4 w-4" />}
              title="导入 (Ctrl+I)"
            />
            <IconButton
              onClick={handleExport}
              icon={<Download className="h-4 w-4" />}
              title="导出 (Ctrl+E)"
            />
          </div>

          {/* 更多菜单 */}
          <div className="relative">
            <IconButton
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              active={showMoreMenu}
              icon={<MoreVertical className="h-4 w-4" />}
              title="更多选项"
            />

            {showMoreMenu && (
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-gray-900/10 dark:bg-gray-800 dark:ring-gray-700">
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