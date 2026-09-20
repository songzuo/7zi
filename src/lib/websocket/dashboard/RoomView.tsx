/**
 * RoomView Component
 *
 * Main room view with messages, input, and member panel
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useWebSocketStore } from './websocket-store'
import type { Room, RoomType } from '@/lib/websocket/rooms'
import type { StoredMessage, MessageReaction } from '@/lib/websocket/message-store'

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function isOwnMessage(message: StoredMessage, currentUserId: string | null): boolean {
  return message.userId === currentUserId
}

function getReactionUsers(reaction: MessageReaction, currentUserName: string | null): string {
  const users = [reaction.userName]
  if (reaction.userName !== currentUserName && currentUserName) {
    users.push(currentUserName)
  }
  return users.slice(0, 3).join(', ') + (users.length > 3 ? ' 等' : '')
}

// ============================================================================
// Message Item Component
// ============================================================================

interface MessageItemProps {
  message: StoredMessage
  currentUserId: string | null
  currentUserName: string | null
  onReact?: (messageId: string, emoji: string) => void
  onReply?: (messageId: string) => void
}

function MessageItem({
  message,
  currentUserId,
  currentUserName,
  onReact,
  onReply,
}: MessageItemProps) {
  const isOwn = isOwnMessage(message, currentUserId)
  const [showReactions, setShowReactions] = useState(false)

  // Common emojis for quick reactions
  const commonEmojis = ['👍', '❤️', '😂', '🎉', '👏', '🤔']

  return (
    <div
      className={`mb-4 flex gap-3 rounded-lg p-3 transition-all duration-200 ${isOwn ? 'flex-row-reverse' : ''} ${message.pinned ? 'border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10' : ''} `}
    >
      {/* Avatar */}
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-semibold text-white ${isOwn ? 'bg-blue-500' : 'bg-gray-400'} `}
      >
        {message.userName.charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className={`min-w-0 flex-1 ${isOwn ? 'text-right' : ''}`}>
        {/* Header */}
        <div className={`mb-1 flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="font-medium text-gray-900 dark:text-gray-100">{message.userName}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatMessageTime(message.timestamp)}
          </span>
          {message.edited && (
            <span className="text-xs text-gray-500 dark:text-gray-400">(已编辑)</span>
          )}
          {message.pinned && <span className="text-xs">📌</span>}
        </div>

        {/* Message Content */}
        <div
          className={`max-w-[70%] rounded-lg p-3 ${
            isOwn
              ? 'ml-auto bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
          } `}
        >
          {message.content}
        </div>

        {/* Reply Reference */}
        {message.replyTo && (
          <div
            className={`mt-2 text-sm text-gray-600 dark:text-gray-400 ${isOwn ? 'text-right' : ''}`}
          >
            <span className="font-medium">回复消息</span>
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={`mt-2 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {message.reactions.map((reaction, idx) => (
              <button
                key={`${reaction.emoji}-${reaction.userId}-${idx}`}
                className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                onClick={() => onReact?.(message.id, reaction.emoji)}
              >
                <span>{reaction.emoji}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {message.reactions!.filter(r => r.emoji === reaction.emoji).length}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        {isOwn && (
          <div className={`mt-2 flex gap-2 text-xs ${isOwn ? 'justify-end' : ''}`}>
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              😊 表情
            </button>
            <button
              onClick={() => onReply?.(message.id)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ↩️ 回复
            </button>
          </div>
        )}

        {/* Quick Reactions */}
        {showReactions && (
          <div className={`mt-2 flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {commonEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  onReact?.(message.id, emoji)
                  setShowReactions(false)
                }}
                className="rounded-lg bg-white px-2 py-1 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Message Input Component
// ============================================================================

interface MessageInputProps {
  disabled?: boolean
  replyingTo?: StoredMessage | null
  onCancelReply?: () => void
  onSendMessage: (content: string, replyTo?: string) => void
}

function MessageInput({ disabled, replyingTo, onCancelReply, onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
    }
  }, [message])

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim(), replyingTo?.id)
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      {/* Reply Context */}
      {replyingTo && (
        <div className="mb-3 flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">回复:</span>
            <span className="max-w-[300px] truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {replyingTo.userName}
            </span>
            <span className="max-w-[200px] truncate text-sm text-gray-600 dark:text-gray-400">
              {replyingTo.content}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            disabled={disabled}
            className="max-h-[150px] min-h-[50px] w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            rows={1}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>发送</span>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="mt-3 flex gap-2 text-sm text-gray-500 dark:text-gray-400">
        <button
          disabled={disabled}
          className="flex items-center gap-1 hover:text-gray-700 disabled:opacity-50 dark:hover:text-gray-200"
        >
          📎 附件
        </button>
        <button
          disabled={disabled}
          className="flex items-center gap-1 hover:text-gray-700 disabled:opacity-50 dark:hover:text-gray-200"
        >
          😊 表情
        </button>
        <button
          disabled={disabled}
          className="flex items-center gap-1 hover:text-gray-700 disabled:opacity-50 dark:hover:text-gray-200"
        >
          @ 提及
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Room Header Component
// ============================================================================

interface RoomHeaderProps {
  room: Room
  onToggleSettings: () => void
  onToggleMembers: () => void
  memberCount: number
}

function RoomHeader({ room, onToggleSettings, onToggleMembers, memberCount }: RoomHeaderProps) {
  const ROOM_TYPE_ICONS: Record<RoomType, string> = {
    task: '📋',
    project: '📁',
    chat: '💬',
    document: '📄',
    voice: '🎤',
    video: '📹',
  }

  return (
    <div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        {/* Room Info */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">{ROOM_TYPE_ICONS[room.type]}</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{room.name}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>{room.type === 'chat' ? '聊天' : room.type === 'task' ? '任务' : '项目'}</span>
              <span>•</span>
              <span>{memberCount} 位成员</span>
              <span>•</span>
              <span>{formatTime(room.lastActivity)}活跃</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMembers}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            title="成员列表"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </button>
          <button
            onClick={onToggleSettings}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            title="房间设置"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Member Panel Component
// ============================================================================

interface MemberPanelProps {
  isOpen: boolean
  onClose: () => void
  participants: import('@/lib/websocket/rooms').RoomParticipant[]
  currentUserId: string | null
}

function MemberPanel({ isOpen, onClose, participants, currentUserId }: MemberPanelProps) {
  if (!isOpen) return null

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            成员列表 ({participants.length})
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Member List */}
      <div className="flex-1 overflow-y-auto p-4">
        {participants.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">暂无成员</div>
        ) : (
          <div className="space-y-2">
            {participants.map(participant => (
              <div
                key={participant.id}
                className="flex items-center gap-3 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {/* Avatar */}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full font-semibold text-white"
                  style={{ backgroundColor: participant.color }}
                >
                  {participant.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                      {participant.name}
                    </span>
                    {participant.id === currentUserId && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">(你)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span
                      className={`h-2 w-2 rounded-full ${participant.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
                    />
                    <span>{participant.isOnline ? '在线' : '离线'}</span>
                    <span>•</span>
                    <span className="capitalize">{participant.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main RoomView Component
// ============================================================================

export interface RoomViewProps {
  onSendMessage?: (content: string, replyTo?: string) => void
  onReactMessage?: (messageId: string, emoji: string) => void
  onLeaveRoom?: () => void
}

export function RoomView({ onSendMessage, onReactMessage, onLeaveRoom }: RoomViewProps) {
  const [replyingTo, setReplyingTo] = useState<StoredMessage | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const {
    currentRoomId,
    currentUserId,
    currentUserName,
    showMemberPanel,
    showRoomSettings,
    toggleRoomSettings,
    toggleMemberPanel,
    getCurrentRoom,
    getCurrentMessages,
    getCurrentParticipants,
  } = useWebSocketStore()

  const currentRoom = getCurrentRoom()
  const messages = getCurrentMessages()
  const participants = getCurrentParticipants()

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  const handleSendMessage = useCallback(
    (content: string, replyTo?: string) => {
      onSendMessage?.(content, replyTo)
      setReplyingTo(null)
    },
    [onSendMessage]
  )

  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      onReactMessage?.(messageId, emoji)
    },
    [onReactMessage]
  )

  const handleReply = useCallback(
    (messageId: string) => {
      const message = messages.find(m => m.id === messageId)
      if (message) {
        setReplyingTo(message)
        // Focus input
        const input = document.querySelector('textarea')
        if (input instanceof HTMLTextAreaElement) {
          input.focus()
        }
      }
    },
    [messages]
  )

  // No room selected
  if (!currentRoom) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white p-8 text-center dark:bg-gray-900">
        <span className="mb-4 text-6xl">👋</span>
        <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
          欢迎来到 WebSocket 房间
        </h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          从左侧选择一个房间，或创建新房间开始聊天
        </p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <RoomHeader
        room={currentRoom}
        onToggleSettings={toggleRoomSettings}
        onToggleMembers={toggleMemberPanel}
        memberCount={participants.length}
      />

      {/* Member Panel Overlay */}
      <MemberPanel
        isOpen={showMemberPanel}
        onClose={() => toggleMemberPanel(false)}
        participants={participants}
        currentUserId={currentUserId}
      />

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-800"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="mb-4 text-4xl">💬</span>
            <p className="text-gray-600 dark:text-gray-400">暂无消息，开始第一条对话吧！</p>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <MessageItem
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                onReact={handleReact}
                onReply={handleReply}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <MessageInput
        disabled={!currentRoom}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSendMessage={handleSendMessage}
      />

      {/* Room Settings Overlay */}
      {showRoomSettings && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
              房间设置
            </h2>
            <p className="mb-4 text-gray-600 dark:text-gray-400">房间设置功能正在开发中...</p>
            <button
              onClick={() => toggleRoomSettings(false)}
              className="rounded-lg bg-gray-200 px-4 py-2 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoomView
