/**
 * Room Card Component
 *
 * Individual room card for room list display
 * Shows room info, member count, online status, etc.
 * v1.13.0: Enhanced mobile responsive support
 *
 * Features:
 * - Room name and description
 * - Online/total member count
 * - Room type indicator
 * - Last activity time
 * - Click to join/view room
 * - Dark/light mode support
 * - Mobile-first responsive design
 */

'use client'

import { useMemo } from 'react'
import { RoomStatusIndicator } from './RoomStatusIndicator'
import type { Room } from '@/types/rooms'
import clsx from 'clsx'

export interface RoomCardProps {
  /** Room data */
  room: Room
  /** Click handler */
  onClick?: (room: Room) => void
  /** Is current room (highlight) */
  isActive?: boolean
  /** Show detailed info */
  showDetails?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Room Card Component
 */
export function RoomCard({
  room,
  onClick,
  isActive = false,
  showDetails = false,
  className,
}: RoomCardProps) {
  /**
   * Calculate online percentage
   */
  const onlinePercentage = useMemo(() => {
    if (room.memberCount === 0) return 0
    return Math.round((room.onlineCount / room.memberCount) * 100)
  }, [room.onlineCount, room.memberCount])

  /**
   * Format last activity time
   */
  const formatLastActivity = useMemo(() => {
    const now = Date.now()
    const diff = now - room.lastActivityAt

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}天前`
    if (hours > 0) return `${hours}小时前`
    if (minutes > 0) return `${minutes}分钟前`
    return '刚刚'
  }, [room.lastActivityAt])

  /**
   * Get room type icon
   */
  const roomTypeIcon = useMemo(() => {
    return '🏠'
  }, [])

  return (
    <button
      onClick={() => onClick?.(room)}
      className={clsx(
        'w-full rounded-lg border p-3 sm:p-4 text-left transition-all',
        // 移动端阴影优化（禁用以提升性能）
        'sm:hover:shadow-md',
        // 激活状态
        isActive
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 dark:bg-blue-900/20'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
        // 最小触控区域
        'min-h-[60px] sm:min-h-[80px]',
        // 触摸反馈
        'active:scale-[0.99] active:opacity-95',
        // 移动端优化
        className
      )}
      type="button"
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* Room Name */}
          <div className="mb-1 flex items-center gap-2">
            <span className="text-base sm:text-lg">{roomTypeIcon}</span>
            <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100 sm:text-base">
              {room.name}
            </h3>
          </div>

          {/* Description - 移动端简化显示 */}
          {room.description && (
            <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
              {room.description}
            </p>
          )}
        </div>

        {/* Status Indicator - 移动端缩小 */}
        <div className="flex-shrink-0">
          <RoomStatusIndicator
            status="connected"
            onlineCount={room.onlineCount}
            totalCount={room.memberCount}
            size="xs"
            showDetails={false}
          />
        </div>
      </div>

      {/* Details Row - 移动端精简 */}
      {showDetails ? (
        <div className="flex flex-col gap-2 border-t border-gray-100 pt-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
          {/* Online Percentage Bar */}
          <div className="flex flex-1 items-center gap-2">
            <div className="h-1.5 w-full max-w-[80px] sm:max-w-[100px] rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-1.5 rounded-full bg-green-500 transition-all"
                style={{ width: `${onlinePercentage}%` }}
              />
            </div>
            <span className="whitespace-nowrap">{onlinePercentage}% 在线</span>
          </div>

          {/* Last Activity */}
          <div className="whitespace-nowrap">{formatLastActivity}</div>
        </div>
      ) : (
        /* Compact View (mobile optimized) */
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <span className="text-green-500">●</span>
            <span>{room.onlineCount} 在线</span>
          </div>
          <span>•</span>
          <span>{formatLastActivity}</span>
        </div>
      )}
    </button>
  )
}

/**
 * Compact Room Card - Minimal version for sidebar
 */
export function CompactRoomCard({
  room,
  onClick,
  isActive,
  className,
}: Pick<RoomCardProps, 'room' | 'onClick' | 'isActive' | 'className'>) {
  return (
    <button
      onClick={() => onClick?.(room)}
      className={clsx(
        'w-full rounded-md px-3 py-2 text-left transition-colors',
        isActive
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
        className
      )}
      type="button"
    >
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {/* Room Icon */}
          <span className="flex-shrink-0">🏠</span>

          {/* Room Name */}
          <span className="truncate font-medium">{room.name}</span>
        </div>

        {/* Online Count */}
        {room.onlineCount > 0 && (
          <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
            <span className="text-green-500">●</span>
            {room.onlineCount}
          </span>
        )}
      </div>
    </button>
  )
}

export default RoomCard
