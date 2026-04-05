/**
 * RichTextEditor Component
 *
 * v1.12.2 - 富文本编辑器增强
 * 基于 TipTap 的功能完整的富文本编辑器组件
 */

'use client'

import React, { useCallback, useState } from 'react'
import { useRichTextEditor, type RichTextEditorOptions } from '@/hooks/useRichTextEditor'
import { EditorToolbar, type EditorToolbarProps } from './EditorToolbar'
import { cn } from '@/lib/utils'

// TipTap 不需要导入 CSS，使用 Tailwind 样式

export interface RichTextEditorProps extends Omit<RichTextEditorOptions, 'onUpdate'> {
  /**
   * 内容变化时回调
   */
  onChange?: (html: string) => void
  /**
   * 是否显示工具栏
   */
  showToolbar?: boolean
  /**
   * 是否显示边框
   */
  showBorder?: boolean
  /**
   * 占位符文本
   */
  placeholder?: string
  /**
   * 自定义工具栏配置
   */
  toolbarProps?: Partial<EditorToolbarProps>
  /**
   * 错误状态
   */
  error?: string
  /**
   * 标签
   */
  label?: string
  /**
   * 是否必填
   */
  required?: boolean
  /**
   * 帮助文本
   */
  helperText?: string
  /**
   * 自定义类名
   */
  className?: string
}

/**
 * 富文本编辑器组件
 *
 * @example
 * ```tsx
 * <RichTextEditor
 *   label="内容"
 *   required
 *   placeholder="输入富文本内容..."
 *   onChange={(html) => console.log(html)}
 * />
 * ```
 */
export function RichTextEditor({
  // 内容管理
  content,
  onChange,
  // 编辑器配置
  preset = 'basic',
  editable = true,
  extensions,
  minHeight = 150,
  maxHeight = 400,
  placeholder,
  // UI 配置
  showToolbar = true,
  showBorder = true,
  // 工具栏配置
  toolbarProps,
  // 表单配置
  label,
  required,
  helperText,
  error,
  // 自定义类名
  className,
}: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)

  // 使用 hook 管理编辑器
  const {
    editor,
    EditorContent,
    getHTML,
    toggleBold,
    toggleItalic,
    toggleUnderline,
    toggleStrike,
    toggleHeading,
    toggleBulletList,
    toggleOrderedList,
    toggleBlockquote,
    toggleCodeBlock,
    setLink,
    unsetLink,
    undo,
    redo,
    isActive,
    canUndo,
    canRedo,
    handleKeyDown,
  } = useRichTextEditor({
    content,
    preset,
    editable,
    extensions,
    minHeight,
    maxHeight,
    placeholder,
    onUpdate: ({ html }) => {
      onChange?.(html)
    },
  })

  // 处理链接插入
  const handleLinkClick = useCallback(() => {
    if (isActive('link')) {
      unsetLink()
    } else {
      setShowLinkInput(true)
      setLinkUrl('')
    }
  }, [isActive, unsetLink])

  const handleLinkSubmit = useCallback(() => {
    if (linkUrl) {
      setLink(linkUrl)
      setShowLinkInput(false)
      setLinkUrl('')
    }
  }, [linkUrl, setLink])

  const handleLinkCancel = useCallback(() => {
    setShowLinkInput(false)
    setLinkUrl('')
  }, [])

  // 渲染工具栏
  const renderToolbar = () => {
    if (!showToolbar || !editor) return null

    return (
      <div className="mb-2">
        <EditorToolbar
          isBold={isActive('bold')}
          isItalic={isActive('italic')}
          isUnderline={isActive('underline')}
          isStrike={isActive('strike')}
          isHeading1={isActive('heading', { level: 1 })}
          isHeading2={isActive('heading', { level: 2 })}
          isHeading3={isActive('heading', { level: 3 })}
          isBulletList={isActive('bulletList')}
          isOrderedList={isActive('orderedList')}
          isBlockquote={isActive('blockquote')}
          isCodeBlock={isActive('codeBlock')}
          isLink={isActive('link')}
          canUndo={canUndo()}
          canRedo={canRedo()}
          onBold={toggleBold}
          onItalic={toggleItalic}
          onUnderline={toggleUnderline}
          onStrike={toggleStrike}
          onHeading1={() => toggleHeading(1)}
          onHeading2={() => toggleHeading(2)}
          onHeading3={() => toggleHeading(3)}
          onBulletList={toggleBulletList}
          onOrderedList={toggleOrderedList}
          onBlockquote={toggleBlockquote}
          onCodeBlock={toggleCodeBlock}
          onLink={handleLinkClick}
          onUnsetLink={unsetLink}
          onUndo={undo}
          onRedo={redo}
          {...toolbarProps}
        />

        {/* 链接输入框 */}
        {showLinkInput && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
            <input
              type="url"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="输入链接地址 (https://...)"
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleLinkSubmit()
                } else if (e.key === 'Escape') {
                  handleLinkCancel()
                }
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={handleLinkSubmit}
              className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
            >
              确定
            </button>
            <button
              type="button"
              onClick={handleLinkCancel}
              className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              取消
            </button>
          </div>
        )}
      </div>
    )
  }

  // 渲染编辑器内容区域
  const renderEditor = () => {
    return (
      <div
        className={cn(
          'relative rounded-lg bg-white dark:bg-gray-900',
          showBorder && 'border border-gray-300 dark:border-gray-600',
          !editable && 'opacity-75'
        )}
        onKeyDown={handleKeyDown}
      >
        {/* 编辑器内容 */}
        <div
          className={cn(
            'overflow-y-auto rounded-lg p-3',
            showBorder && 'border-0'
          )}
          style={{ minHeight, maxHeight }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/* 标签 */}
      {label && (
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* 工具栏 */}
      {renderToolbar()}

      {/* 编辑器 */}
      {renderEditor()}

      {/* 帮助文本 / 错误信息 */}
      {(helperText || error) && (
        <p
          className={cn(
            'text-xs',
            error
              ? 'text-red-500 dark:text-red-400'
              : 'text-gray-500 dark:text-gray-400'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  )
}

/**
 * 富文本编辑器 - 简洁版（无工具栏）
 * 用于需要在其他地方使用工具栏的场景
 */
export function RichTextEditorSimple({
  content,
  onChange,
  preset = 'basic',
  editable = true,
  minHeight = 100,
  maxHeight = 300,
  placeholder,
  className,
}: Omit<RichTextEditorProps, 'showToolbar' | 'toolbarProps'>) {
  const { editor, EditorContent, handleKeyDown } = useRichTextEditor({
    content,
    preset,
    editable,
    minHeight,
    maxHeight,
    placeholder,
    onUpdate: ({ html }) => {
      onChange?.(html)
    },
  })

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800',
        className
      )}
      onKeyDown={handleKeyDown}
    >
      <div className="overflow-y-auto" style={{ minHeight, maxHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

/**
 * 富文本编辑器 - 只读版
 * 用于预览已保存的内容
 */
export function RichTextEditorReadOnly({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  const { editor, EditorContent } = useRichTextEditor({
    content,
    editable: false,
  })

  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50',
        className
      )}
    >
      <EditorContent editor={editor} />
    </div>
  )
}

export default RichTextEditor
