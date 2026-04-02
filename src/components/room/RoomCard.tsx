/**
 * RoomCard Component
 *
 * Individual room card component for displaying room information
 */

'use client'

import { useState, useCallback } from 'react'
import type { Room, RoomType, RoomVisibility } from '@/lib/websocket/rooms'

// ============================================================================
// Types
// ============================================================================

export interface RoomCardProps {
  room: Room
  currentUserId?: string | null
  isSelected?: boolean
  onClick?: () => void
  onJoin?: (roomId: string) => void
  onLeave?: (roomId: string) => void
  onDelete?: (roomId: string) => void
  layout?: 'card' | 'list' | 'compact'
  showActions?: boolean
}

// ============================================================================
// Constants
// ============================================================================

const ROOM_TYPE_ICONS: Record<RoomType, string> = {
  task: '📋',
  project: '📁',
  chat: '💬',
  document: '📄',
  voice: '🎤',
  video: '📹',
}

const ROOM_VISIBILITY_ICONS: Record<RoomVisibility, string> = {
  public: '🌐',
  private: '🔒',
  'invite-only': '✉️',
}

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  task: '任务',
  project: '项目',
  chat: '聊天',
  document: '文档',
  voice: '语音',
  video: '视频',
}

const ROOM_VISIBILITY_LABELS: Record<RoomVisibility, string> = {
  public: '公开',
  private: '私有',
  'invite-only': '仅邀请',
}

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
  return date.toLocaleDateString('zh-CN')
}

function getMemberCountText(count: number): string {
  if (count === 0) return '空房间'
  if (count === 1) return '1 人在线'
  return `${count} 人在线`
}

// ============================================================================
// Card Layout Component
// ============================================================================

function CardLayout({
  room,
  currentUserId,
  isSelected,
  onClick,
  onJoin,
  onLeave,
  onDelete,
  showActions,
}: Omit<RoomCardProps, 'layout'>) {
  const [showMenu, setShowMenu] = useState(false)
  const memberCount = room.participants.size
  const isOwner = room.ownerId === currentUserId
  const isMember = room.participants.has(currentUserId || '')

  const handleMenuAction = useCallback(
    (action: 'leave' | 'delete') => {
      if (action === 'leave' && onLeave) {
        onLeave(room.id)
      } else if (action === 'delete' && onDelete) {
        onDelete(room.id)
      }
      setShowMenu(false)
    },
    [onLeave, onDelete, room.id]
  )

  return (
    <div
      data-testid="room-card"
      className={`group relative cursor-pointer rounded-xl p-4 transition-all duration-200 ${
        isSelected
          ? 'border-2 border-blue-500 bg-blue-50 shadow-md dark:border-blue-400 dark:bg-blue-900/20'
          : 'border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600'
      } `}
      onClick={onClick}
      onMouseEnter={() => showActions && setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Icon */}
          <div className="text-3xl">{ROOM_TYPE_ICONS[room.type]}</div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-gray-900 dark:text-gray-100">{room.name}</h3>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {ROOM_TYPE_LABELS[room.type]}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-sm" title={ROOM_VISIBILITY_LABELS[room.visibility]}>
                {ROOM_VISIBILITY_ICONS[room.visibility]}
              </span>
            </div>
          </div>
        </div>

        {/* Menu */}
        {showActions && (
          <div className="relative">
            <button
              onClick={e => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              aria-label="菜单"
              className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute top-full right-0 z-10 mt-1 min-w-[120px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {isOwner && onDelete && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      handleMenuAction('delete')
                    }}
                    aria-label="删除房间"
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    删除
                  </button>
                )}
                {!isOwner && isMember && onLeave && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      handleMenuAction('leave')
                    }}
                    aria-label="离开房间"
                    className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                  >
                    离开
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {Array.from(room.participants.values())
              .slice(0, 3)
              .map(participant => (
                <div
                  key={participant.id}
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs font-medium text-white dark:border-gray-800"
                  style={{ backgroundColor: participant.color }}
                  title={participant.name}
                >
                  {participant.name.charAt(0).toUpperCase()}
                </div>
              ))}
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {getMemberCountText(memberCount)}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {isOwner && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              所有者
            </span>
          )}
          <span>{formatTime(room.lastActivity)}</span>
        </div>
      </div>

      {/* Tags */}
      {room.config.allowGuests && (
        <div className="mt-2">
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
            允许访客
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// List Layout Component
// ============================================================================

function ListLayout({
  room,
  currentUserId,
  isSelected,
  onClick,
  onJoin,
  onLeave,
  showActions,
}: Omit<RoomCardProps, 'layout'>) {
  const memberCount = room.participants.size
  const isOwner = room.ownerId === currentUserId
  const isMember = room.participants.has(currentUserId || '')

  return (
    <div
      data-testid="room-card-list"
      className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors ${
        isSelected
          ? 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700'
      } `}
      onClick={onClick}
    >
      {/* Icon */}
      <div className="text-2xl">{ROOM_TYPE_ICONS[room.type]}</div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium text-gray-900 dark:text-gray-100">{room.name}</h3>
          {isOwner && (
            <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              所有者
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>{ROOM_TYPE_LABELS[room.type]}</span>
          <span>•</span>
          <span>{memberCount} 人</span>
          <span>•</span>
          <span>{formatTime(room.lastActivity)}</span>
        </div>
      </div>

      {/* Actions */}
      {showActions && !isMember && onJoin && (
        <button
          onClick={e => {
            e.stopPropagation()
            onJoin(room.id)
          }}
          aria-label="加入房间"
          className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-600"
        >
          加入
        </button>
      )}

      {showActions && isMember && !isOwner && onLeave && (
        <button
          onClick={e => {
            e.stopPropagation()
            onLeave(room.id)
          }}
          aria-label="离开房间"
          className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
        >
          离开
        </button>
      )}

      {/* Visibility Icon */}
      <span className="text-lg" title={ROOM_VISIBILITY_LABELS[room.visibility]}>
        {ROOM_VISIBILITY_ICONS[room.visibility]}
      </span>
    </div>
  )
}

// ============================================================================
// Compact Layout Component
// ============================================================================

function CompactLayout({
  room,
  currentUserId,
  isSelected,
  onClick,
}: Omit<RoomCardProps, 'layout' | 'showActions' | 'onJoin' | 'onLeave' | 'onDelete'>) {
  const memberCount = room.participants.size
  const isOwner = room.ownerId === currentUserId

  return (
    <div
      data-testid="room-card-compact"
      className={`flex cursor-pointer items-center gap-2 rounded p-2 transition-colors ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
      } `}
      onClick={onClick}
    >
      <span className="text-lg">{ROOM_TYPE_ICONS[room.type]}</span>
      <span className="flex-1 truncate text-sm text-gray-900 dark:text-gray-100">{room.name}</span>
      <span className="text-xs text-gray-600 dark:text-gray-400">{memberCount}</span>
      {isOwner && <span className="text-xs">👑</span>}
    </div>
  )
}

// ============================================================================
// Main RoomCard Component
// ============================================================================

export function RoomCard({ layout = 'card', showActions = true, ...props }: RoomCardProps) {
  if (layout === 'list') {
    return <ListLayout {...props} showActions={showActions} />
  }

  if (layout === 'compact') {
    return <CompactLayout {...props} />
  }

  return <CardLayout {...props} showActions={showActions} />
}

export default RoomCard
