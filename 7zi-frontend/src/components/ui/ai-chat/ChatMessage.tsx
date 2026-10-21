'use client'

/**
 * ChatMessage - 聊天消息组件
 * 支持用户/助手消息、流式输出、代码高亮
 * v1.12.x
 */

import React, { useCallback, useMemo } from 'react'
import clsx from 'clsx'
import type { ChatMessageProps, AIMessage, AISuggestion } from './types'

// ============================================
// 代码块渲染
// ============================================

interface CodeBlockProps {
  code: string
  language?: string
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className="relative group rounded-lg bg-gray-900 overflow-hidden">
      {/* 代码头 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className={clsx(
            'text-xs px-2 py-1 rounded transition-colors',
            'text-gray-400 hover:text-white hover:bg-gray-700',
            'opacity-0 group-hover:opacity-100'
          )}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      {/* 代码内容 */}
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm text-gray-100 font-mono whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  )
}

// ============================================
// 消息内容解析
// ============================================

interface ParsedContent {
  type: 'text' | 'code'
  content: string
  language?: string
}

function parseContent(content: string): ParsedContent[] {
  const parts: ParsedContent[] = []
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // 添加代码块前的文本
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      })
    }
    // 添加代码块
    parts.push({
      type: 'code',
      language: match[1] || undefined,
      content: match[2].trim(),
    })
    lastIndex = match.index + match[0].length
  }

  // 添加剩余文本
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex),
    })
  }

  return parts.length > 0 ? parts : [{ type: 'text', content }]
}

// ============================================
// 流式光标
// ============================================

const StreamingCursor: React.FC = () => (
  <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse align-middle" />
)

// ============================================
// ChatMessage 组件
// ============================================

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onCopy,
  onRetry,
  onSuggestionClick,
  showActions = true,
}) => {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const parsedContent = useMemo(() => parseContent(message.content), [message.content])

  const handleCopy = useCallback(() => {
    onCopy?.(message.content)
  }, [message.content, onCopy])

  const handleRetry = useCallback(() => {
    onRetry?.()
  }, [onRetry])

  return (
    <div
      className={clsx(
        'flex gap-3 py-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* 头像 */}
      <div
        className={clsx(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
        )}
      >
        {isUser ? '👤' : '🤖'}
      </div>

      {/* 消息内容 */}
      <div
        className={clsx(
          'flex-1 max-w-[85%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm'
        )}
      >
        {/* 错误状态 */}
        {message.error && (
          <div className="flex items-center gap-2 text-red-500 text-sm mb-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{message.error}</span>
          </div>
        )}

        {/* 消息文本 */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {parsedContent.map((part, index) => {
            if (part.type === 'code') {
              return (
                <div key={index} className="my-3">
                  <CodeBlock code={part.content} language={part.language} />
                </div>
              )
            }
            return (
              <span key={index}>
                {part.content}
                {message.isStreaming && index === parsedContent.length - 1 && (
                  <StreamingCursor />
                )}
              </span>
            )
          })}
          {message.isStreaming && parsedContent.length === 0 && <StreamingCursor />}
        </div>

        {/* 操作按钮 */}
        {showActions && isAssistant && !message.error && (
          <div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleCopy}
              className={clsx(
                'p-1.5 rounded-lg text-xs transition-colors',
                'text-gray-500 hover:text-gray-700 hover:bg-gray-200',
                'dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
              )}
              title="复制"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={handleRetry}
              className={clsx(
                'p-1.5 rounded-lg text-xs transition-colors',
                'text-gray-500 hover:text-gray-700 hover:bg-gray-200',
                'dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
              )}
              title="重新生成"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatMessage
