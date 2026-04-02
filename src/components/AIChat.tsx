/**
 * @fileoverview AI 聊天组件 - 响应式优化版
 * @description 7zi Studio 的 AI 助手聊天窗口，针对移动端优化
 *
 * 优化点:
 * 1. 小屏幕自动全屏
 * 2. 触摸目标尺寸优化
 * 3. 安全区域适配
 * 4. 键盘弹出适配
 * 5. 流畅动画
 * 6. 使用 ChatContext 消除 prop drilling
 */

'use client'

import { useState, useEffect, useRef, forwardRef } from 'react'
import {
  ChatHeader,
  TeamStatusPanel,
  ChatMessage,
  TypingIndicator,
  QuickActions,
  useChat,
} from './chat'
import { ChatProvider, useChatContext } from '@/contexts/ChatContext'
import { UnifiedTeamMember } from '@/types/members'
import { Message } from './chat/types'
import { isBelowBreakpoint, BREAKPOINTS } from '@/lib/utils/breakpoints'

// 导入聊天数据
import { teamMembers, quickActions } from './chat/data'

/**
 * 聊天内容组件
 * 使用 ChatContext 获取共享状态
 */
function AIChatContent() {
  // 窗口状态
  const [isOpen, setIsOpen] = useState(false)
  const [showTeamStatus, setShowTeamStatus] = useState(false)
  const [showMemberSelector, setShowMemberSelector] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [visualViewportHeight, setVisualViewportHeight] = useState(100)

  // Refs
  const chatWindowRef = useRef<HTMLDivElement>(null)
  const scrollAnchorRef = useRef<HTMLDivElement>(null)

  // 从 ChatContext 获取聊天状态
  const { messages, inputValue, isTyping, setInputValue, handleSend, handleQuickAction } =
    useChatContext()

  // 在线成员数量现在从 context 获取，不再需要手动计算

  // 检测屏幕尺寸决定是否全屏（使用统一断点工具）
  useEffect(() => {
    const checkFullscreen = () => {
      setIsFullscreen(isBelowBreakpoint('sm'))
    }

    checkFullscreen()
    window.addEventListener('resize', checkFullscreen)
    return () => window.removeEventListener('resize', checkFullscreen)
  }, [])

  // 监听视觉视口变化（键盘弹出）
  useEffect(() => {
    if (typeof window === 'undefined' || !('visualViewport' in window)) return

    const visualViewport = window.visualViewport as VisualViewport

    const handleResize = () => {
      const vh = (visualViewport.height / window.innerHeight) * 100
      setVisualViewportHeight(vh)
    }

    visualViewport.addEventListener('resize', handleResize)
    return () => visualViewport.removeEventListener('resize', handleResize)
  }, [])

  // 打开窗口时聚焦输入框
  // Note: We can't access inputRef directly from context, so this is simplified

  // 防止背景滚动（全屏模式）
  useEffect(() => {
    if (isOpen && isFullscreen) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
    }

    return () => {
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }
  }, [isOpen, isFullscreen])

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <>
      {/* 聊天切换按钮 - 优化触摸目标和安全区域 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="touch-active fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95"
        style={{
          bottom: 'max(24px, calc(16px + env(safe-area-inset-bottom)))',
          right: 'max(16px, env(safe-area-inset-right))',
        }}
        aria-label={isOpen ? '关闭聊天' : '打开聊天'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <span className="text-2xl font-light">×</span>
        ) : (
          <span className="text-2xl">💬</span>
        )}
      </button>

      {/* 聊天窗口 */}
      {isOpen && (
        <div
          ref={chatWindowRef}
          className={`animate-in slide-in-from-bottom-4 fixed z-50 overflow-hidden border border-zinc-200 bg-white shadow-2xl duration-300 dark:border-zinc-800 dark:bg-zinc-900 ${
            isFullscreen
              ? 'inset-0 rounded-none'
              : 'right-6 bottom-24 w-[calc(100vw-32px)] max-w-[384px] rounded-2xl'
          }`}
          style={{
            paddingBottom: isFullscreen ? 'max(16px, env(safe-area-inset-bottom))' : undefined,
            height: isFullscreen ? `${visualViewportHeight}vh` : undefined,
          }}
          role="dialog"
          aria-label="AI 聊天"
        >
          {/* 头部 */}
          <ChatHeader
            showTeamStatus={showTeamStatus}
            onToggleTeamStatus={() => setShowTeamStatus(!showTeamStatus)}
            showMemberSelector={showMemberSelector}
            onToggleMemberSelector={() => setShowMemberSelector(!showMemberSelector)}
          />

          {/* 团队状态面板 */}
          {showTeamStatus && <TeamStatusPanel />}

          {/* 消息列表 */}
          <div
            className={`space-y-4 overflow-y-auto bg-zinc-50 p-4 dark:bg-zinc-900 ${
              isFullscreen ? 'h-[calc(var(--vh,1vh)*100-240px)]' : 'h-80'
            }`}
            style={
              {
                '--vh': `${visualViewportHeight * 0.01}px`,
              } as React.CSSProperties
            }
          >
            {messages.map((message: Message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {/* 打字指示器 */}
            {isTyping && <TypingIndicator />}

            {/* 滚动锚点 */}
            <div ref={scrollAnchorRef} />
          </div>

          {/* 快捷操作 */}
          <div className="flex-shrink-0">
            <QuickActions actions={quickActions} onAction={handleQuickAction} />
          </div>

          {/* 输入框 - 优化触摸目标 */}
          <div className="flex-shrink-0">
            <ChatInputOptimized value={inputValue} onChange={setInputValue} onSend={handleSend} />
          </div>
        </div>
      )}
    </>
  )
}

/**
 * 优化的聊天输入组件
 * - 更大的触摸目标
 * - 键盘友好
 */

interface ChatInputOptimizedProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
}

const ChatInputOptimized = forwardRef<HTMLInputElement, ChatInputOptimizedProps>(
  function ChatInputOptimized({ value, onChange, onSend }, ref) {
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onSend()
      }
    }

    return (
      <div className="border-t border-zinc-200 bg-white p-3 sm:p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            className="min-h-[48px] flex-1 rounded-full bg-zinc-100 px-4 py-3 text-base focus:ring-2 focus:ring-cyan-500 focus:outline-none dark:bg-zinc-800 dark:text-white"
            style={{ fontSize: '16px' }} // 防止 iOS 缩放
          />
          <button
            onClick={onSend}
            disabled={!value.trim()}
            className="touch-active flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white transition-all hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="发送消息"
          >
            <span className="text-lg">➤</span>
          </button>
        </div>
      </div>
    )
  }
)

/**
 * 主 AIChat 组件
 * 初始化 useChat hook 并提供 ChatProvider
 */
export default function AIChat() {
  // 使用 useChat hook 初始化聊天状态
  const {
    messages,
    inputValue,
    isTyping,
    selectedMemberId,
    setInputValue,
    handleSend,
    handleQuickAction,
    setSelectedMemberId,
  } = useChat(teamMembers as UnifiedTeamMember[])

  return (
    <ChatProvider
      teamMembers={teamMembers as UnifiedTeamMember[]}
      messages={messages}
      inputValue={inputValue}
      isTyping={isTyping}
      selectedMemberId={selectedMemberId}
      setInputValue={setInputValue}
      handleSend={handleSend}
      handleQuickAction={handleQuickAction}
      setSelectedMemberId={setSelectedMemberId}
    >
      <AIChatContent />
    </ChatProvider>
  )
}
