/**
 * Room Chat Component
 *
 * Real-time chat interface for rooms
 * Message input, message list, scroll to bottom, etc.
 *
 * Features:
 * - Real-time message updates
 * - Auto-scroll to new messages
 * - Message input with send button
 * - Typing indicators
 * - Message reactions (future)
 * - File attachments (future)
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChatMessage } from './ChatMessage'
import { useRoomStore } from '@/stores/room-store'
import type { Room, RoomMessage } from '@/types/rooms'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import clsx from 'clsx'

export interface RoomChatProps {
  /** Room to display chat for */
  room: Room
  /** Current user ID */
  currentUserId: string
  /** WebSocket manager for sending messages */
  sendMessage?: (event: string, data: unknown) => boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Room Chat Component
 */
export function RoomChat({ room, currentUserId, sendMessage, className }: RoomChatProps) {
  // Store state
  const messages = useRoomStore(state => state.messages[room.id] || [])
  const markAsRead = useRoomStore(state => state.markAsRead)

  // Local state
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isScrolledToBottomRef = useRef(true)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  /**
   * Scroll to bottom
   */
  const scrollToBottom = useCallback((force = false) => {
    if (messagesEndRef.current && (isScrolledToBottomRef.current || force)) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  /**
   * Handle scroll to detect if user is at bottom
   */
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    isScrolledToBottomRef.current = distanceFromBottom < 100
  }, [])

  /**
   * Effect: Scroll to bottom when messages change
   */
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  /**
   * Effect: Mark room as read when chat is opened
   */
  useEffect(() => {
    markAsRead(room.id)
  }, [room.id, markAsRead])

  /**
   * Send message
   */
  const handleSendMessage = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    // Send via WebSocket
    if (sendMessage) {
      const success = sendMessage('room:send_message', {
        roomId: room.id,
        content: trimmed,
        type: 'text',
      })

      if (success) {
        setInputValue('')
        setIsTyping(false)

        // Scroll to bottom after sending
        setTimeout(() => scrollToBottom(true), 100)
      }
    }
  }, [inputValue, sendMessage, room.id, scrollToBottom])

  /**
   * Handle input change (typing indicator)
   */
  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value)

      if (!isTyping && value.trim()) {
        setIsTyping(true)

        // Send typing indicator
        if (sendMessage) {
          sendMessage('room:typing', { roomId: room.id, isTyping: true })
        }

        // Clear typing indicator after 3 seconds of inactivity
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }

        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false)

          if (sendMessage) {
            sendMessage('room:typing', { roomId: room.id, isTyping: false })
          }
        }, 3000)
      }
    },
    [isTyping, sendMessage, room.id]
  )

  /**
   * Handle key press (Enter to send)
   */
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    },
    [handleSendMessage]
  )

  /**
   * Handle reply
   */
  const handleReply = useCallback((message: RoomMessage) => {
    setInputValue(`> ${message.senderName}: ${message.content}\n\n`)
    // Focus input
  }, [])

  /**
   * Handle delete
   */
  const handleDelete = useCallback(
    (message: RoomMessage) => {
      // Send delete request
      if (sendMessage) {
        sendMessage('room:delete_message', { roomId: room.id, messageId: message.id })
      }
    },
    [sendMessage, room.id]
  )

  return (
    <div className={clsx('flex h-full flex-col', className)}>
      {/* Messages Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 space-y-2 overflow-y-auto px-4 py-4"
      >
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-4 text-6xl">💬</div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                欢迎来到 {room.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">发送第一条消息开始聊天吧！</p>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map(message => (
          <ChatMessage
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            showAvatar
            showTimestamp
            enableActions
            onReply={handleReply}
            onDelete={handleDelete}
          />
        ))}

        {/* Scroll to bottom anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-sm text-gray-500 dark:text-gray-400">
          {typingUsers.length === 1
            ? `${typingUsers[0]} 正在输入...`
            : `${typingUsers[0]} 和其他 ${typingUsers.length - 1} 人正在输入...`}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-end gap-3">
          {/* Attachment Button (future) */}
          <button
            type="button"
            className="p-2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            title="Attach file"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>

          {/* Message Input */}
          <Textarea
            value={inputValue}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyPress as unknown as React.KeyboardEventHandler<HTMLTextAreaElement>}
            placeholder="输入消息..."
            rows={1}
            className="min-h-0 flex-1 resize-none"
          />

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            variant="primary"
            size="md"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </Button>
        </div>

        {/* Hint */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          按 Enter 发送，Shift + Enter 换行
        </div>
      </div>
    </div>
  )
}

export default RoomChat
