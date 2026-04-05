/**
 * Editor Toolbar Component
 *
 * v1.12.2 - 富文本编辑器工具栏
 * 提供格式化按钮：粗体、斜体、下划线、删除线、标题、列表、引用、代码块、链接、撤销/重做
 */

import React from 'react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Undo,
  Redo,
  Link2Off as LinkOff,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolbarButtonProps {
  icon: React.ReactNode
  label: string
  isActive?: boolean
  disabled?: boolean
  onClick: () => void
}

function ToolbarButton({ icon, label, isActive, disabled, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        'rounded p-1.5 transition-colors',
        isActive
          ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {icon}
    </button>
  )
}

interface ToolbarDividerProps {
  className?: string
}

function ToolbarDivider({ className = '' }: ToolbarDividerProps) {
  return (
    <div
      className={cn(
        'mx-1 h-5 w-px bg-gray-200 dark:bg-gray-600',
        className
      )}
    />
  )
}

export interface EditorToolbarProps {
  // 格式化按钮状态
  isBold?: boolean
  isItalic?: boolean
  isUnderline?: boolean
  isStrike?: boolean
  isHeading1?: boolean
  isHeading2?: boolean
  isHeading3?: boolean
  isBulletList?: boolean
  isOrderedList?: boolean
  isBlockquote?: boolean
  isCodeBlock?: boolean
  isLink?: boolean

  // 操作状态
  canUndo?: boolean
  canRedo?: boolean

  // 点击处理
  onBold?: () => void
  onItalic?: () => void
  onUnderline?: () => void
  onStrike?: () => void
  onHeading1?: () => void
  onHeading2?: () => void
  onHeading3?: () => void
  onBulletList?: () => void
  onOrderedList?: () => void
  onBlockquote?: () => void
  onCodeBlock?: () => void
  onLink?: () => void
  onUnsetLink?: () => void
  onUndo?: () => void
  onRedo?: () => void

  // 是否显示高级选项
  showAdvanced?: boolean

  // 自定义类名
  className?: string
}

export function EditorToolbar({
  // 格式化按钮状态
  isBold = false,
  isItalic = false,
  isUnderline = false,
  isStrike = false,
  isHeading1 = false,
  isHeading2 = false,
  isHeading3 = false,
  isBulletList = false,
  isOrderedList = false,
  isBlockquote = false,
  isCodeBlock = false,
  isLink = false,

  // 操作状态
  canUndo = false,
  canRedo = false,

  // 点击处理
  onBold,
  onItalic,
  onUnderline,
  onStrike,
  onHeading1,
  onHeading2,
  onHeading3,
  onBulletList,
  onOrderedList,
  onBlockquote,
  onCodeBlock,
  onLink,
  onUnsetLink,
  onUndo,
  onRedo,

  // 配置
  showAdvanced = true,

  // 自定义类名
  className,
}: EditorToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      {/* 撤销/重做 */}
      <ToolbarButton
        icon={<Undo className="h-4 w-4" />}
        label="撤销 (Ctrl+Z)"
        disabled={!canUndo}
        onClick={onUndo || (() => {})}
      />
      <ToolbarButton
        icon={<Redo className="h-4 w-4" />}
        label="重做 (Ctrl+Shift+Z)"
        disabled={!canRedo}
        onClick={onRedo || (() => {})}
      />

      <ToolbarDivider />

      {/* 基础格式化 */}
      <ToolbarButton
        icon={<Bold className="h-4 w-4" />}
        label="粗体 (Ctrl+B)"
        isActive={isBold}
        onClick={onBold || (() => {})}
      />
      <ToolbarButton
        icon={<Italic className="h-4 w-4" />}
        label="斜体 (Ctrl+I)"
        isActive={isItalic}
        onClick={onItalic || (() => {})}
      />
      <ToolbarButton
        icon={<Underline className="h-4 w-4" />}
        label="下划线 (Ctrl+U)"
        isActive={isUnderline}
        onClick={onUnderline || (() => {})}
      />
      <ToolbarButton
        icon={<Strikethrough className="h-4 w-4" />}
        label="删除线 (Ctrl+Shift+S)"
        isActive={isStrike}
        onClick={onStrike || (() => {})}
      />

      <ToolbarDivider />

      {/* 标题 */}
      <ToolbarButton
        icon={<Heading1 className="h-4 w-4" />}
        label="标题 1"
        isActive={isHeading1}
        onClick={onHeading1 || (() => {})}
      />
      <ToolbarButton
        icon={<Heading2 className="h-4 w-4" />}
        label="标题 2"
        isActive={isHeading2}
        onClick={onHeading2 || (() => {})}
      />
      <ToolbarButton
        icon={<Heading3 className="h-4 w-4" />}
        label="标题 3"
        isActive={isHeading3}
        onClick={onHeading3 || (() => {})}
      />

      <ToolbarDivider />

      {/* 列表 */}
      <ToolbarButton
        icon={<List className="h-4 w-4" />}
        label="无序列表"
        isActive={isBulletList}
        onClick={onBulletList || (() => {})}
      />
      <ToolbarButton
        icon={<ListOrdered className="h-4 w-4" />}
        label="有序列表"
        isActive={isOrderedList}
        onClick={onOrderedList || (() => {})}
      />

      {showAdvanced && (
        <>
          <ToolbarDivider />

          {/* 高级格式化 */}
          <ToolbarButton
            icon={<Quote className="h-4 w-4" />}
            label="引用 (Ctrl+Shift+B)"
            isActive={isBlockquote}
            onClick={onBlockquote || (() => {})}
          />
          <ToolbarButton
            icon={<Code className="h-4 w-4" />}
            label="代码块 (Ctrl+Shift+C)"
            isActive={isCodeBlock}
            onClick={onCodeBlock || (() => {})}
          />

          <ToolbarDivider />

          {/* 链接 */}
          <ToolbarButton
            icon={isLink ? <LinkOff className="h-4 w-4" /> : <Link className="h-4 w-4" />}
            label={isLink ? '取消链接' : '插入链接 (Ctrl+K)'}
            isActive={isLink}
            onClick={isLink ? (onUnsetLink || (() => {})) : (onLink || (() => {}))}
          />
        </>
      )}
    </div>
  )
}

export default EditorToolbar
