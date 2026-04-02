/**
 * Chat Message Component
 *
 * Individual message bubble in room chat
 * Shows sender info, timestamp, message content
 * Supports system messages and regular messages
 *
 * Features:
 * - Different styles for system vs user messages
 * - Avatar display
 * - Timestamp formatting
 * - Message actions (reply, delete)
 * - Dark/light mode support
 */

'use client'

import { useMemo } from 'react'
import clsx from 'clsx'
import type { RoomMessage } from '@/types/rooms'

export interface ChatMessageProps {
  /** Message data */
  message: RoomMessage
  /** Current user ID (for highlighting own messages) */
  currentUserId?: string
  /** Show avatar */
  showAvatar?: boolean
  /** Show timestamp */
  showTimestamp?: boolean
  /** Enable message actions */
  enableActions?: boolean
  /** Additional CSS classes */
  className?: string
  /** Reply callback */
  onReply?: (message: RoomMessage) => void
  /** Delete callback */
  onDelete?: (message: RoomMessage) => void
}

/**
 * Chat Message Component
 */
export function ChatMessage({
  message,
  currentUserId,
  showAvatar = true,
  showTimestamp = true,
  enableActions = false,
  className,
  onReply,
  onDelete,
}: ChatMessageProps) {
  const isOwnMessage = message.senderId === currentUserId
  const isSystemMessage = message.type === 'system' || message.type === 'notification'

  /**
   * Format timestamp
   */
  const formattedTime = useMemo(() => {
    const date = new Date(message.timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [message.timestamp])

  /**
   * Get avatar content
   */
  const avatarContent = useMemo(() => {
    if (message.senderAvatar) {
      return (
        <img
          src={message.senderAvatar}
          alt={message.senderName}
          className="h-full w-full rounded-full object-cover"
        />
      )
    }

    return (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-medium text-white">
        {message.senderName.charAt(0).toUpperCase()}
      </div>
    )
  }, [message.senderAvatar, message.senderName])

  /**
   * Render system message
   */
  if (isSystemMessage) {
    return (
      <div className={clsx('flex justify-center py-1', className)}>
        <div className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          <span className="font-medium">{message.senderName}</span>
          <span className="mx-1">•</span>
          {message.content}
        </div>
      </div>
    )
  }

  /**
   * Render user message
   */
  return (
    <div
      className={clsx('flex gap-3 py-1', isOwnMessage ? 'flex-row-reverse' : 'flex-row', className)}
    >
      {/* Avatar */}
      {showAvatar && <div className="h-8 w-8 flex-shrink-0">{avatarContent}</div>}

      {/* Message Content */}
      <div
        className={clsx('flex max-w-[70%] flex-col', isOwnMessage ? 'items-end' : 'items-start')}
      >
        {/* Sender Name */}
        {!isOwnMessage && (
          <div className="mb-0.5 flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {message.senderName}
            </span>
            {showTimestamp && (
              <span className="text-xs text-gray-500 dark:text-gray-500">{formattedTime}</span>
            )}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={clsx(
            'rounded-2xl px-4 py-2 break-words',
            isOwnMessage
              ? 'rounded-br-md bg-blue-600 text-white'
              : 'rounded-bl-md border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'
          )}
        >
          {message.content}
        </div>

        {/* Timestamp for own messages */}
        {isOwnMessage && showTimestamp && (
          <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">{formattedTime}</span>
        )}

        {/* Message Actions */}
        {enableActions && (
          <div
            className={clsx(
              'mt-1 flex gap-1 opacity-0 transition-opacity hover:opacity-100',
              isOwnMessage ? 'justify-end' : 'justify-start'
            )}
          >
            {onReply && (
              <button
                onClick={() => onReply(message)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Reply"
                type="button"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
              </button>
            )}
            {isOwnMessage && onDelete && (
              <button
                onClick={() => onDelete(message)}
                className="p-1 text-gray-400 hover:text-red-500"
                title="Delete"
                type="button"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Compact Message - Minimal version for list view
 */
export function CompactMessage({
  message,
  isUnread = false,
  onClick,
}: {
  message: RoomMessage
  isUnread?: boolean
  onClick?: () => void
}) {
  return (
    <div
      className={clsx(
        'flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800',
        isUnread && 'bg-blue-50 dark:bg-blue-900/20'
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-medium text-white">
        {message.senderName.charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-gray-900 dark:text-gray-100">
            {message.senderName}
          </span>
          {isUnread && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />}
        </div>
        <p className="truncate text-sm text-gray-600 dark:text-gray-400">{message.content}</p>
      </div>

      {/* Timestamp */}
      <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-500">
        {new Date(message.timestamp).toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </div>
  )
}

export default ChatMessage
