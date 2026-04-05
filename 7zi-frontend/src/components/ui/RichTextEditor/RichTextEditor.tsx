'use client'

/**
 * RichTextEditor - 富文本编辑器组件
 *
 * v1.12.x 新增
 * 支持富文本编辑、Markdown语法、撤销/重做功能
 * 支持深色模式和移动端适配
 */

import React, { useState, useCallback, useRef, useEffect, KeyboardEvent } from 'react'
import { useTheme } from '@/shared/context/ThemeContext'
import { cn } from '@/lib/utils'

// ============================================
// 类型定义
// ============================================

export interface RichTextEditorProps {
  /** 初始内容 */
  value?: string
  /** 内容变化回调 */
  onChange?: (value: string, html?: string) => void
  /** 占位符 */
  placeholder?: string
  /** 是否只读 */
  readOnly?: boolean
  /** 最大高度 */
  maxHeight?: string | number
  /** 最小高度 */
  minHeight?: string | number
  /** 是否显示工具栏 */
  showToolbar?: boolean
  /** 是否启用 Markdown 模式 */
  enableMarkdown?: boolean
  /** 自定义工具栏按钮 */
  customButtons?: React.ReactNode
  /** 错误信息 */
  error?: string
  /** 帮助文本 */
  helperText?: string
  /** 工具栏位置 */
  toolbarPosition?: 'top' | 'bottom'
  /** 类名 */
  className?: string
  /** 工具栏类名 */
  toolbarClassName?: string
}

interface HistoryEntry {
  html: string
  cursorPosition: number | null
}

// ============================================
// 工具栏按钮配置
// ============================================

interface ToolbarButton {
  name: string
  icon: React.ReactNode
  command: string
  value?: string
  shortcut?: string
  title: string
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  {
    name: 'bold',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6V4zM6 12h9a4 4 0 014 4 4 4 0 01-4 4H6v-8z" />
      </svg>
    ),
    command: 'bold',
    shortcut: 'Ctrl+B',
    title: '粗体',
  },
  {
    name: 'italic',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0v16m-4 0h8" />
      </svg>
    ),
    command: 'italic',
    shortcut: 'Ctrl+I',
    title: '斜体',
  },
  {
    name: 'underline',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v7a5 5 0 0010 0V4M5 20h14" />
      </svg>
    ),
    command: 'underline',
    shortcut: 'Ctrl+U',
    title: '下划线',
  },
  {
    name: 'strikethrough',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 12H7m10 0a4 4 0 01-4 4H7m10-4a4 4 0 00-4-4H7m10 8H7" />
      </svg>
    ),
    command: 'strikeThrough',
    title: '删除线',
  },
  {
    name: 'divider',
    icon: <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />,
    command: '',
    title: '',
  },
  {
    name: 'h1',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h8M4 6v12m8-12v12M18 6v8" />
      </svg>
    ),
    command: 'formatBlock',
    value: 'h1',
    title: '标题 1',
  },
  {
    name: 'h2',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h6M4 8v8m6-8v8M16 8v5" />
      </svg>
    ),
    command: 'formatBlock',
    value: 'h2',
    title: '标题 2',
  },
  {
    name: 'h3',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 10h4M4 10v4m4-4v4M14 10v3" />
      </svg>
    ),
    command: 'formatBlock',
    value: 'h3',
    title: '标题 3',
  },
  {
    name: 'divider',
    icon: <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />,
    command: '',
    title: '',
  },
  {
    name: 'ul',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16M2 6h1m-1 6h1m-1 6h1" />
      </svg>
    ),
    command: 'insertUnorderedList',
    shortcut: 'Ctrl+Shift+L',
    title: '无序列表',
  },
  {
    name: 'ol',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
      </svg>
    ),
    command: 'insertOrderedList',
    shortcut: 'Ctrl+Shift+O',
    title: '有序列表',
  },
  {
    name: 'divider',
    icon: <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />,
    command: '',
    title: '',
  },
  {
    name: 'link',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    command: 'createLink',
    value: 'https://',
    shortcut: 'Ctrl+K',
    title: '插入链接',
  },
  {
    name: 'divider',
    icon: <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />,
    command: '',
    title: '',
  },
  {
    name: 'undo',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
    command: 'undo',
    shortcut: 'Ctrl+Z',
    title: '撤销',
  },
  {
    name: 'redo',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
      </svg>
    ),
    command: 'redo',
    shortcut: 'Ctrl+Y',
    title: '重做',
  },
]

// ============================================
// Markdown 转换器
// ============================================

class MarkdownConverter {
  static htmlToMarkdown(html: string): string {
    let markdown = html

    // 转换标题
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')

    // 转换粗体
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')

    // 转换斜体
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')

    // 转换删除线
    markdown = markdown.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~')
    markdown = markdown.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~')
    markdown = markdown.replace(/<strike[^>]*>(.*?)<\/strike>/gi, '~~$1~~')

    // 转换下划线
    markdown = markdown.replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>')

    // 转换链接
    markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')

    // 转换代码
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```')

    // 转换块引用
    markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (match, content) => {
      const lines = content.trim().split('\n')
      return lines.map(line => `> ${line.trim()}`).join('\n') + '\n\n'
    })

    // 转换列表
    markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
      const items = content.match(/<li[^>]*>(.*?)<\/li>/gi) || []
      return items.map(item => `- ${item.replace(/<[^>]*>/g, '').trim()}`).join('\n') + '\n\n'
    })

    markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
      const items = content.match(/<li[^>]*>(.*?)<\/li>/gi) || []
      return items.map((item, index) => `${index + 1}. ${item.replace(/<[^>]*>/g, '').trim()}`).join('\n') + '\n\n'
    })

    // 转换换行
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n')

    // 转换段落
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, (match, content) => {
      return content.trim() + '\n\n'
    })

    // 清理多余空行
    markdown = markdown.replace(/\n{3,}/g, '\n\n')

    // 解码 HTML 实体
    markdown = markdown.replace(/&nbsp;/g, ' ')
    markdown = markdown.replace(/&lt;/g, '<')
    markdown = markdown.replace(/&gt;/g, '>')
    markdown = markdown.replace(/&amp;/g, '&')

    return markdown.trim()
  }

  static markdownToHtml(markdown: string): string {
    let html = markdown

    // 转换标题
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>')
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>')
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')

    // 转换粗体
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

    // 转换斜体
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

    // 转换删除线
    html = html.replace(/~~(.*?)~~/g, '<s>$1</s>')

    // 转换链接
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

    // 转换代码
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    html = html.replace(/`(.*?)`/g, '<code>$1</code>')

    // 转换块引用
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')

    // 转换无序列表
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>')

    // 转换有序列表
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>')

    // 转换换行
    html = html.replace(/\n/g, '<br>')

    return html
  }
}

// ============================================
// 主组件
// ============================================

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = '输入内容...',
  readOnly = false,
  maxHeight,
  minHeight = 120,
  showToolbar = true,
  enableMarkdown = true,
  customButtons,
  error,
  helperText,
  toolbarPosition = 'top',
  className,
  toolbarClassName,
}: RichTextEditorProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const editorRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  // 历史记录（撤销/重做）
  const [history, setHistory] = useState<HistoryEntry[]>([
    { html: value, cursorPosition: null },
  ])
  const [historyIndex, setHistoryIndex] = useState(0)
  const historyRef = useRef<HistoryEntry[]>(history)
  const historyIndexRef = useRef(historyIndex)

  // 同步历史记录引用
  useEffect(() => {
    historyRef.current = history
    historyIndexRef.current = historyIndex
  }, [history, historyIndex])

  // 更新历史记录
  const updateHistory = useCallback((html: string, cursorPosition: number | null = null) => {
    const currentHistory = historyRef.current
    const currentIndex = historyIndexRef.current

    // 获取实际光标位置
    const selection = window.getSelection()
    const actualCursorPosition = cursorPosition !== null ? cursorPosition :
      (selection?.rangeCount || 0) > 0 ? selection!.getRangeAt(0).startOffset : null

    // 如果不是在历史记录中间，删除后面的记录
    const newHistory = currentHistory.slice(0, currentIndex + 1)

    // 如果内容有变化，添加新记录
    if (newHistory[newHistory.length - 1].html !== html) {
      newHistory.push({ html, cursorPosition: actualCursorPosition })
      // 限制历史记录大小
      if (newHistory.length > 100) {
        newHistory.shift()
      }
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }
  }, [])

  // 执行编辑命令
  const executeCommand = useCallback((command: string, value?: string) => {
    if (!editorRef.current || readOnly) return

    // 保存当前状态
    const currentHtml = editorRef.current.innerHTML
    const selection = window.getSelection()
    const cursorPosition = (selection?.rangeCount || 0) > 0 ? selection!.getRangeAt(0).startOffset : null

    // 执行撤销/重做
    if (command === 'undo') {
      const newHistory = historyRef.current
      const newIndex = historyIndexRef.current
      if (newIndex > 0) {
        const previousState = newHistory[newIndex - 1]
        editorRef.current.innerHTML = previousState.html
        setHistoryIndex(newIndex - 1)
        handleChange()
      }
      return
    }

    if (command === 'redo') {
      const newHistory = historyRef.current
      const newIndex = historyIndexRef.current
      if (newIndex < newHistory.length - 1) {
        const nextState = newHistory[newIndex + 1]
        editorRef.current.innerHTML = nextState.html
        setHistoryIndex(newIndex + 1)
        handleChange()
      }
      return
    }

    // 特殊处理链接
    if (command === 'createLink') {
      const url = prompt('请输入链接地址:', value || 'https://')
      if (url) {
        document.execCommand(command, false, url)
      }
      return
    }

    // 执行其他命令
    document.execCommand(command, false, value || '')

    // 保存新状态
    updateHistory(editorRef.current.innerHTML, cursorPosition)

    // 触发变化回调
    handleChange()
  }, [readOnly, updateHistory])

  // 处理内容变化
  const handleChange = useCallback(() => {
    if (!editorRef.current || readOnly) return

    const html = editorRef.current.innerHTML
    const text = editorRef.current.innerText || ''

    let markdownValue = text
    if (enableMarkdown) {
      markdownValue = MarkdownConverter.htmlToMarkdown(html)
    }

    onChange?.(markdownValue, html)
  }, [readOnly, enableMarkdown, onChange])

  // 处理粘贴事件
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (readOnly) return

    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')

    if (enableMarkdown) {
      const html = MarkdownConverter.markdownToHtml(text)
      document.execCommand('insertHTML', false, html)
    } else {
      document.execCommand('insertText', false, text)
    }

    handleChange()
  }, [readOnly, enableMarkdown, handleChange])

  // 处理键盘事件
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return

    // 快捷键
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault()
          executeCommand('bold')
          break
        case 'i':
          e.preventDefault()
          executeCommand('italic')
          break
        case 'u':
          e.preventDefault()
          executeCommand('underline')
          break
        case 'k':
          e.preventDefault()
          executeCommand('createLink')
          break
        case 'z':
          e.preventDefault()
          executeCommand(e.shiftKey ? 'redo' : 'undo')
          break
        case 'y':
          e.preventDefault()
          executeCommand('redo')
          break
      }
    }

    // Tab 键插入空格
    if (e.key === 'Tab') {
      e.preventDefault()
      document.execCommand('insertText', false, '  ')
    }
  }, [readOnly, executeCommand])

  // 处理输入事件
  const handleInput = useCallback(() => {
    if (readOnly) return

    const currentHtml = editorRef.current?.innerHTML || ''
    const lastHistory = historyRef.current[historyRef.current.length - 1]

    // 只在内容真正变化时更新历史
    if (lastHistory && lastHistory.html !== currentHtml) {
      const selection = window.getSelection()
      const cursorPosition = (selection?.rangeCount || 0) > 0 ? selection!.getRangeAt(0).startOffset : null
      updateHistory(currentHtml, cursorPosition)
    }

    handleChange()
  }, [readOnly, updateHistory, handleChange])

  // 初始化内容
  useEffect(() => {
    if (editorRef.current && value) {
      const html = enableMarkdown ? MarkdownConverter.markdownToHtml(value) : value
      editorRef.current.innerHTML = html
      setHistory([{ html, cursorPosition: null }])
      setHistoryIndex(0)
    }
  }, [])

  // 渲染工具栏
  const renderToolbar = () => {
    if (!showToolbar) return null

    return (
      <div
        className={cn(
          'flex flex-wrap items-center gap-1 rounded-t-lg border-b border-gray-200 p-2 transition-colors dark:border-gray-700',
          isDark ? 'bg-gray-800' : 'bg-gray-50',
          toolbarClassName
        )}
      >
        {TOOLBAR_BUTTONS.map((button, index) => {
          if (button.name === 'divider') {
            return <div key={`divider-${index}`} className="mx-1">{button.icon}</div>
          }

          return (
            <button
              key={button.name}
              type="button"
              onClick={() => executeCommand(button.command, button.value)}
              disabled={readOnly}
              className={cn(
                'rounded p-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                isDark
                  ? 'hover:bg-gray-700 focus:bg-gray-700 text-gray-300'
                  : 'hover:bg-gray-200 focus:bg-gray-200 text-gray-600'
              )}
              title={`${button.title}${button.shortcut ? ` (${button.shortcut})` : ''}`}
            >
              {button.icon}
            </button>
          )
        })}
        {customButtons}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative w-full rounded-lg border transition-all',
        isFocused
          ? 'border-indigo-500 ring-2 ring-indigo-500/20'
          : error
            ? 'border-red-500'
            : 'border-gray-300 dark:border-gray-600',
        readOnly ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800',
        className
      )}
    >
      {toolbarPosition === 'top' && renderToolbar()}

      {/* 编辑区域 */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          'w-full overflow-y-auto p-4 outline-none empty:before:content-[attr(placeholder)] empty:before:text-gray-400',
          isDark ? 'text-gray-100' : 'text-gray-900'
        )}
        style={{
          maxHeight,
          minHeight,
        }}
        data-placeholder={placeholder}
        role="textbox"
        aria-multiline="true"
        aria-readonly={readOnly}
      />

      {toolbarPosition === 'bottom' && renderToolbar()}

      {/* 错误信息 */}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}

      {/* 帮助文本 */}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}

      {/* 快捷键提示 */}
      {!readOnly && showToolbar && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          快捷键: <kbd className="rounded border px-1">Ctrl+B</kbd> 粗体
          {' '}
          <kbd className="rounded border px-1">Ctrl+I</kbd> 斜体
          {' '}
          <kbd className="rounded border px-1">Ctrl+K</kbd> 链接
          {' '}
          <kbd className="rounded border px-1">Ctrl+Z</kbd> 撤销
          {' '}
          <kbd className="rounded border px-1">Ctrl+Y</kbd> 重做
        </div>
      )}
    </div>
  )
}

// ============================================
// 默认导出
// ============================================

export default RichTextEditor
