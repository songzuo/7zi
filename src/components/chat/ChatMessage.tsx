/**
 * @fileoverview 聊天消息组件
 * @description 显示单条聊天消息，支持用户和助手两种角色
 */

'use client'

import { Message } from './types'
import { useChatMembers } from '@/contexts/ChatContext'

interface ChatMessageProps {
  message: Message
}

/**
 * 聊天消息组件
 * 不再接收 teamMembers prop，从 context 中获取
 * @param message - 消息数据
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  // 从 context 获取团队成员数据并查找发送者
  const { getMemberById } = useChatMembers()
  const member = message.memberId ? getMemberById(message.memberId) : null

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl p-3 ${
          isUser
            ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
            : 'bg-white text-zinc-800 shadow-md dark:bg-zinc-800 dark:text-zinc-200'
        }`}
      >
        {/* 显示回复的团队成员 */}
        {!isUser && member && (
          <div className="mb-1 text-xs font-medium text-cyan-600 dark:text-cyan-400">
            {member.emoji} {member.name}
          </div>
        )}

        {/* 消息内容 */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* 时间戳 */}
        <span className={`mt-1 block text-[10px] ${isUser ? 'text-white/70' : 'text-zinc-400'}`}>
          {message.timestamp.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}

/**
 * 打字指示器组件
 * @description 显示 AI 正在输入的动画效果
 */
export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl bg-white p-3 shadow-md dark:bg-zinc-800">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"
            style={{ animationDelay: '0.1s' }}
          />
          <span
            className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"
            style={{ animationDelay: '0.2s' }}
          />
        </div>
      </div>
    </div>
  )
}
