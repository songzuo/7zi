'use client'

/**
 * ChatWindow - AI 聊天主窗口组件
 * 整合消息列表、输入框、建议面板
 * v1.12.x
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { SuggestionPanel } from './SuggestionPanel'
import { useAIChatStore } from './store'
import type { ChatWindowProps, AIMessage } from './types'

// ============================================
// Icons
// ============================================

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const MaximizeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
)

const MinimizeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
)

const NewChatIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const HistoryIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

// ============================================
// ChatWindow 组件
// ============================================

export const ChatWindow: React.FC<ChatWindowProps> = ({
  className,
  showSidebar = false,
  showSuggestions = true,
  minimized: initialMinimized = false,
}) => {
  const [minimized, setMinimized] = useState(initialMinimized)
  const [inputValue, setInputValue] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 从 store 获取状态和操作
  const {
    _state,
    createConversation,
    sendMessageStream,
    stopGeneration,
    retryMessage,
    copyMessage,
    executeSuggestion,
    fetchSuggestions,
    toggleSuggestions,
    selectConversation,
    deleteConversation,
    clearCurrentConversation,
  } = useAIChatStore()

  const {
    messages,
    status,
    isLoading,
    suggestions,
    showSuggestions: storeShowSuggestions,
    streamStats,
    conversations,
    currentConversation,
  } = _state

  const isStreaming = status === 'streaming'

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 发送消息
  const handleSubmit = useCallback(
    (value: string) => {
      setInputValue('')
      sendMessageStream(value)
    },
    [sendMessageStream]
  )

  // 停止生成
  const handleStop = useCallback(() => {
    stopGeneration()
  }, [stopGeneration])

  // 复制消息
  const handleCopy = useCallback(
    (content: string) => {
      navigator.clipboard.writeText(content)
    },
    []
  )

  // 重试
  const handleRetry = useCallback(
    (messageId: string) => {
      retryMessage(messageId)
    },
    [retryMessage]
  )

  // 新对话
  const handleNewChat = useCallback(() => {
    createConversation()
    setInputValue('')
    setShowHistory(false)
  }, [createConversation])

  // 切换最小化
  const handleToggleMinimize = useCallback(() => {
    setMinimized((prev) => !prev)
  }, [])

  // 建议点击
  const handleSuggestionClick = useCallback(
    (suggestion: { id: string; text: string; executed?: boolean }) => {
      executeSuggestion(suggestion.id)
    },
    [executeSuggestion]
  )

  // 刷新建议
  const handleRefreshSuggestions = useCallback(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'user') {
        fetchSuggestions({
          userInput: lastMessage.content,
          conversationHistory: messages.slice(0, -1),
          limit: 8,
        })
      }
    }
  }, [messages, fetchSuggestions])

  // 切换历史
  const handleToggleHistory = useCallback(() => {
    setShowHistory((prev) => !prev)
  }, [])

  // 切换设置
  const handleToggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev)
  }, [])

  // 最小化模式
  if (minimized) {
    return (
      <div
        className={clsx(
          'fixed bottom-4 right-4 z-50',
          className
        )}
      >
        <button
          onClick={handleToggleMinimize}
          className={clsx(
            'flex items-center gap-3 px-4 py-3 rounded-2xl',
            'bg-gradient-to-r from-blue-600 to-purple-600',
            'text-white shadow-2xl shadow-blue-500/30',
            'hover:shadow-3xl hover:scale-105',
            'transition-all duration-300',
            'group'
          )}
        >
          <span className="text-xl">🤖</span>
          <span className="font-semibold">7zi 助手</span>
          {isStreaming && (
            <span className="flex gap-1">
              <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'fixed bottom-4 right-4 z-50 w-[420px] h-[600px]',
        'flex flex-col rounded-2xl overflow-hidden',
        'bg-white dark:bg-gray-900',
        'shadow-2xl shadow-gray-900/20',
        'border border-gray-200 dark:border-gray-700',
        'transition-all duration-300',
        className
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center gap-3">
          <span className="text-xl">🤖</span>
          <div>
            <h2 className="text-white font-semibold">7zi 助手</h2>
            {currentConversation && (
              <p className="text-blue-100 text-xs">{currentConversation.title}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewChat}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="新对话"
          >
            <NewChatIcon />
          </button>
          <button
            onClick={handleToggleHistory}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              showHistory ? 'text-white bg-white/20' : 'text-white/80 hover:text-white hover:bg-white/10'
            )}
            title="历史记录"
          >
            <HistoryIcon />
          </button>
          <button
            onClick={handleToggleSettings}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              showSettings ? 'text-white bg-white/20' : 'text-white/80 hover:text-white hover:bg-white/10'
            )}
            title="设置"
          >
            <SettingsIcon />
          </button>
          <button
            onClick={handleToggleMinimize}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="最小化"
          >
            <MinimizeIcon />
          </button>
        </div>
      </div>

      {/* 历史面板 */}
      {showHistory && (
        <div className="flex-1 overflow-y-auto border-b border-gray-200 dark:border-gray-700">
          <div className="p-3 space-y-2">
            {conversations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">暂无历史对话</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    selectConversation(conv.id)
                    setShowHistory(false)
                  }}
                  className={clsx(
                    'w-full p-3 rounded-xl text-left transition-colors',
                    currentConversation?.id === conv.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {conv.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(conv.updatedAt).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* 设置面板 */}
      {showSettings && (
        <div className="flex-1 overflow-y-auto border-b border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">设置</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">显示建议面板</span>
                <input
                  type="checkbox"
                  checked={storeShowSuggestions}
                  onChange={(e) => toggleSuggestions(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
              <div className="space-y-2">
                <label className="block">
                  <span className="text-sm text-gray-700 dark:text-gray-300">系统提示</span>
                  <textarea
                    value={_state.systemPrompt}
                    onChange={(e) => useAIChatStore.getState().updateSystemPrompt?.(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                    rows={3}
                  />
                </label>
              </div>
              <button
                onClick={clearCurrentConversation}
                className="w-full px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                清空当前对话
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      {!showHistory && !showSettings && (
        <>
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="text-6xl mb-4">👋</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  你好！我是 7zi 助手
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                  我可以帮助你处理工作流程、代码调试、数据分析等问题
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onCopy={handleCopy}
                    onRetry={() => handleRetry(message.id)}
                    showActions={!message.isStreaming}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* 建议面板 */}
          {showSuggestions && storeShowSuggestions && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-3">
              <SuggestionPanel
                suggestions={suggestions}
                isLoading={isLoading && suggestions.length === 0}
                onSuggestionClick={handleSuggestionClick}
                onRefresh={handleRefreshSuggestions}
                compact
              />
            </div>
          )}

          {/* 流式状态 */}
          {isStreaming && streamStats && (
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
              <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400">
                <span>正在生成...</span>
                <span>
                  {streamStats.totalCharacters} 字符 · {streamStats.chunksPerSecond.toFixed(1)} 块/秒
                </span>
              </div>
            </div>
          )}

          {/* 输入框 */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSubmit}
              onStop={handleStop}
              disabled={isLoading}
              isStreaming={isStreaming}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default ChatWindow
