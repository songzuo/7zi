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
 */

'use client';

import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import {
  teamMembers,
  quickActions,
  ChatHeader,
  TeamStatusPanel,
  ChatMessage,
  TypingIndicator,
  QuickActions,
  useChat,
} from './chat';

/**
 * 优化的 AI 聊天组件
 */
export function AIChat() {
  // 窗口状态
  const [isOpen, setIsOpen] = useState(false);
  const [showTeamStatus, setShowTeamStatus] = useState(false);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visualViewportHeight, setVisualViewportHeight] = useState(100);
  
  // Refs
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // 聊天逻辑
  const {
    messages,
    inputValue,
    isTyping,
    selectedMemberId,
    messagesEndRef: chatMessagesEndRef,
    inputRef: chatInputRef,
    setInputValue,
    handleSend,
    handleQuickAction,
    setSelectedMemberId,
  } = useChat(teamMembers);

  // 在线成员数量
  const onlineCount = teamMembers.filter((m) => m.status === 'online').length;

  // 检测屏幕尺寸决定是否全屏
  useEffect(() => {
    const checkFullscreen = () => {
      setIsFullscreen(window.innerWidth < 480);
    };
    
    checkFullscreen();
    window.addEventListener('resize', checkFullscreen);
    return () => window.removeEventListener('resize', checkFullscreen);
  }, []);

  // 监听视觉视口变化（键盘弹出）
  useEffect(() => {
    if (typeof window === 'undefined' || !('visualViewport' in window)) return;
    
    const visualViewport = window.visualViewport as VisualViewport;
    
    const handleResize = () => {
      const vh = (visualViewport.height / window.innerHeight) * 100;
      setVisualViewportHeight(vh);
    };
    
    visualViewport.addEventListener('resize', handleResize);
    return () => visualViewport.removeEventListener('resize', handleResize);
  }, []);

  // 打开窗口时聚焦输入框
  useEffect(() => {
    if (isOpen && chatInputRef.current) {
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, chatInputRef]);

  // 防止背景滚动（全屏模式）
  useEffect(() => {
    if (isOpen && isFullscreen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    }
    
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    };
  }, [isOpen, isFullscreen]);

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessagesEndRef]);

  // 新消息时滚动
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  return (
    <>
      {/* 聊天切换按钮 - 优化触摸目标和安全区域 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed z-50 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center touch-active"
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
          className={`fixed z-50 bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-300 ${
            isFullscreen
              ? 'inset-0 rounded-none'
              : 'bottom-24 right-6 w-[calc(100vw-32px)] max-w-[384px] rounded-2xl'
          }`}
          style={{
            paddingBottom: isFullscreen ? 'max(16px, env(safe-area-inset-bottom))' : undefined,
            height: isFullscreen 
              ? `${visualViewportHeight}vh` 
              : undefined,
          }}
          role="dialog"
          aria-label="AI 聊天"
        >
          {/* 头部 */}
          <ChatHeader
            teamMembers={teamMembers}
            onlineCount={onlineCount}
            showTeamStatus={showTeamStatus}
            onToggleTeamStatus={() => setShowTeamStatus(!showTeamStatus)}
            selectedMemberId={selectedMemberId}
            onSelectMember={(id) => setSelectedMemberId(id)}
            showMemberSelector={showMemberSelector}
            onToggleMemberSelector={() => setShowMemberSelector(!showMemberSelector)}
          />

          {/* 团队状态面板 */}
          {showTeamStatus && <TeamStatusPanel teamMembers={teamMembers} />}

          {/* 消息列表 */}
          <div 
            className={`overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-900 ${
              isFullscreen ? 'h-[calc(var(--vh,1vh)*100-240px)]' : 'h-80'
            }`}
            style={{
              '--vh': `${visualViewportHeight * 0.01}px`,
            } as React.CSSProperties}
          >
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                teamMembers={teamMembers}
              />
            ))}
            
            {/* 打字指示器 */}
            {isTyping && <TypingIndicator />}
            
            {/* 滚动锚点 */}
            <div ref={chatMessagesEndRef} />
          </div>

          {/* 快捷操作 */}
          <div className="flex-shrink-0">
            <QuickActions actions={quickActions} onAction={handleQuickAction} />
          </div>

          {/* 输入框 - 优化触摸目标 */}
          <div className="flex-shrink-0">
            <ChatInputOptimized
              ref={chatInputRef}
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSend}
            />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * 优化的聊天输入组件
 * - 更大的触摸目标
 * - 键盘友好
 */

interface ChatInputOptimizedProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

const ChatInputOptimized = forwardRef<HTMLInputElement, ChatInputOptimizedProps>(
  function ChatInputOptimized({ value, onChange, onSend }, ref) {
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    };

    return (
      <div className="p-3 sm:p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-2 items-center">
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-full text-base focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white min-h-[48px]"
            style={{ fontSize: '16px' }} // 防止 iOS 缩放
          />
          <button
            onClick={onSend}
            disabled={!value.trim()}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white flex items-center justify-center hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-active flex-shrink-0"
            aria-label="发送消息"
          >
            <span className="text-lg">➤</span>
          </button>
        </div>
      </div>
    );
  }
);

export default AIChat;