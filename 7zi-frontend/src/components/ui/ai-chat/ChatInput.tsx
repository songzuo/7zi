'use client'

/**
 * ChatInput - 聊天输入组件
 * 支持多行输入、自动调整高度、发送/停止
 * v1.12.x
 */

import React, { useCallback, useRef, useEffect, useState } from 'react'
import clsx from 'clsx'

// ============================================
// Icons
// ============================================

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

const StopIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
  </svg>
)

// ============================================
// ChatInput 组件
// ============================================

export interface ChatInputProps {
  /** 输入值 */
  value: string
  /** 值变化回调 */
  onChange: (value: string) => void
  /** 发送回调 */
  onSubmit: (value: string) => void
  /** 停止回调 */
  onStop?: () => void
  /** 是否禁用 */
  disabled?: boolean
  /** 是否正在流式传输 */
  isStreaming?: boolean
  /** placeholder */
  placeholder?: string
  /** 最大行数 */
  maxRows?: number
  /** 自定义类名 */
  className?: string
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  onStop,
  disabled = false,
  isStreaming = false,
  placeholder = '输入消息... (Shift+Enter 换行，Enter 发送)',
  maxRows = 6,
  className,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const lineHeight = 24
    const maxHeight = lineHeight * maxRows
    const newHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${newHeight}px`
  }, [value, maxRows])

  // 处理按键
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (value.trim() && !disabled && !isStreaming) {
          onSubmit(value.trim())
        }
      }
    },
    [value, disabled, isStreaming, onSubmit]
  )

  // 处理提交
  const handleSubmit = useCallback(() => {
    if (value.trim() && !disabled && !isStreaming) {
      onSubmit(value.trim())
    }
  }, [value, disabled, isStreaming, onSubmit])

  // 处理停止
  const handleStop = useCallback(() => {
    onStop?.()
  }, [onStop])

  // 监听草稿保存（如果需要）
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (value.trim()) {
        localStorage.setItem('ai-chat-draft', value)
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [value])

  // 恢复草稿
  useEffect(() => {
    const draft = localStorage.getItem('ai-chat-draft')
    if (draft && !value) {
      onChange(draft)
      localStorage.removeItem('ai-chat-draft')
    }
  }, [])

  const canSend = value.trim().length > 0 && !disabled && !isStreaming
  const canStop = isStreaming && !disabled

  return (
    <div
      className={clsx(
        'flex items-end gap-3 p-4 rounded-2xl border transition-colors',
        isFocused
          ? 'border-blue-500 bg-white dark:bg-gray-800 shadow-lg shadow-blue-500/10'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
        className
      )}
    >
      {/* 输入框 */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={clsx(
            'w-full resize-none bg-transparent text-sm leading-relaxed',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'text-gray-900 dark:text-gray-100',
            'focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          style={{
            minHeight: '24px',
            maxHeight: `${24 * maxRows}px`,
          }}
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        {isStreaming ? (
          <button
            onClick={handleStop}
            disabled={disabled}
            className={clsx(
              'p-2.5 rounded-xl font-medium transition-all',
              'bg-red-500 hover:bg-red-600 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'shadow-lg shadow-red-500/25 hover:shadow-red-500/40',
              'active:scale-95'
            )}
            title="停止生成"
          >
            <StopIcon />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className={clsx(
              'p-2.5 rounded-xl font-medium transition-all',
              'bg-blue-600 hover:bg-blue-700 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40',
              'active:scale-95'
            )}
            title="发送 (Enter)"
          >
            <SendIcon />
          </button>
        )}
      </div>

      {/* 字符计数 */}
      {value.length > 0 && (
        <div className="absolute bottom-1 right-20 text-xs text-gray-400">
          {value.length} 字符
        </div>
      )}
    </div>
  )
}

export default ChatInput
