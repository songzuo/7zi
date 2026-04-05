'use client'

/**
 * WorkflowToolbar.tsx
 * 增强版工作流工具栏组件
 */

import React, { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

/**
 * 工具栏属性
 */
export interface WorkflowToolbarProps {
  /** 当前缩放比例 */
  zoom: number
  /** 是否对齐网格 */
  snapToGrid: boolean
  /** 是否只读 */
  readOnly?: boolean
  /** 缩放进回调 */
  onZoomIn: () => void
  /** 缩小回调 */
  onZoomOut: () => void
  /** 重置视图回调 */
  onResetView: () => void
  /** 适应内容回调 */
  onFitToContent: () => void
  /** 切换网格对齐回调 */
  onToggleSnapToGrid: () => void
  /** 导入模板回调 */
  onImportTemplate?: () => void
  /** 导出 JSON 回调 */
  onExportJson?: () => void
  /** 全屏回调 */
  onFullscreen?: () => void
  /** 保存回调 */
  onSave?: () => void
  /** 撤销回调 */
  onUndo?: () => void
  /** 重做回调 */
  onRedo?: () => void
  /** 自定义类名 */
  className?: string
}

/**
 * 预设模板类型
 */
export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
}

/**
 * 预设工作流模板
 */
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'simple-agent',
    name: '简单任务',
    description: '单个 Agent 执行任务',
    category: '基础',
  },
  {
    id: 'approval-flow',
    name: '审批流程',
    description: '需要人工审批的流程',
    category: '工作流',
  },
  {
    id: 'data-processing',
    name: '数据处理',
    description: '多步骤数据转换流程',
    category: '数据处理',
  },
  {
    id: 'error-handling',
    name: '错误处理',
    description: '包含错误检测和恢复的流程',
    category: '高级',
  },
]

/**
 * 工具栏按钮组件
 */
function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
  active,
  danger,
  className,
}: {
  icon: React.ReactNode
  label?: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  danger?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm transition-colors',
        'rounded hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50',
        active && 'bg-blue-50 text-blue-700 hover:bg-blue-100',
        danger && 'text-red-600 hover:bg-red-50',
        className
      )}
      title={label || icon}
    >
      {icon}
      {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  )
}

/**
 * 增强版工作流工具栏组件
 */
export function WorkflowToolbar({
  zoom,
  snapToGrid,
  readOnly = false,
  onZoomIn,
  onZoomOut,
  onResetView,
  onFitToContent,
  onToggleSnapToGrid,
  onImportTemplate,
  onExportJson,
  onFullscreen,
  onSave,
  onUndo,
  onRedo,
  className,
}: WorkflowToolbarProps) {
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false)
  const templateMenuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭模板菜单
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      templateMenuRef.current &&
      !templateMenuRef.current.contains(event.target as Node)
    ) {
      setTemplateMenuOpen(false)
    }
  }, [])

  React.useEffect(() => {
    if (templateMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [templateMenuOpen, handleClickOutside])

  return (
    <div
      className={cn(
        'absolute top-4 right-4 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm',
        className
      )}
    >
      {/* 文件操作 */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        {onSave && (
          <ToolbarButton
            icon={<span>💾</span>}
            label="保存"
            onClick={onSave}
          />
        )}

        {onExportJson && (
          <ToolbarButton
            icon={<span>📤</span>}
            label="导出"
            onClick={onExportJson}
          />
        )}

        <div className="relative">
          <ToolbarButton
            icon={<span>📥</span>}
            label="导入模板"
            onClick={() => setTemplateMenuOpen(!templateMenuOpen)}
            active={templateMenuOpen}
          />
          
          {/* 模板菜单 */}
          {templateMenuOpen && (
            <div
              ref={templateMenuRef}
              className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-white py-2 shadow-lg"
            >
              <div className="border-b border-gray-200 px-4 py-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">
                  预设模板
                </div>
              </div>
              {WORKFLOW_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => {
                    onImportTemplate?.()
                    setTemplateMenuOpen(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <div className="font-medium text-gray-900">
                    {template.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {template.description}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 编辑操作 */}
      {!readOnly && (
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
          <ToolbarButton
            icon={<span>↶</span>}
            label="撤销"
            onClick={onUndo}
            disabled={!onUndo}
          />
          <ToolbarButton
            icon={<span>↷</span>}
            label="重做"
            onClick={onRedo}
            disabled={!onRedo}
          />
        </div>
      )}

      {/* 视图操作 */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <ToolbarButton
          icon={<span>➖</span>}
          onClick={onZoomOut}
          title="缩小 (Ctrl + 滚轮)"
        />
        <span className="min-w-[50px] px-2 text-center text-sm text-gray-700">
          {Math.round(zoom * 100)}%
        </span>
        <ToolbarButton
          icon={<span>➕</span>}
          onClick={onZoomIn}
          title="放大 (Ctrl + 滚轮)"
        />
        <ToolbarButton
          icon={<span>⛶</span>}
          onClick={onFitToContent}
          title="适应内容"
        />
        <ToolbarButton
          icon={<span>↺</span>}
          onClick={onResetView}
          title="重置视图"
        />
        {onFullscreen && (
          <ToolbarButton
            icon={<span>⛶</span>}
            onClick={onFullscreen}
            title="全屏编辑"
          />
        )}
      </div>

      {/* 网格控制 */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          icon={<span>⊞</span>}
          label="网格"
          onClick={onToggleSnapToGrid}
          active={snapToGrid}
          title={snapToGrid ? '关闭网格对齐' : '开启网格对齐'}
        />
      </div>
    </div>
  )
}

/**
 * 快捷键提示组件
 */
export function KeyboardShortcuts() {
  const shortcuts = [
    { keys: ['Ctrl', 'S'], action: '保存工作流' },
    { keys: ['Ctrl', 'Z'], action: '撤销' },
    { keys: ['Ctrl', 'Y'], action: '重做' },
    { keys: ['Ctrl', '滚轮'], action: '缩放画布' },
    { keys: ['Delete'], action: '删除选中节点' },
    { keys: ['Right Click'], action: '显示上下文菜单' },
  ]

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">快捷键</h3>
      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key, i) => (
                <React.Fragment key={i}>
                  <kbd className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs font-mono">
                    {key}
                  </kbd>
                  {i < shortcut.keys.length - 1 && (
                    <span className="text-gray-400">+</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <span className="text-gray-600">{shortcut.action}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default WorkflowToolbar
