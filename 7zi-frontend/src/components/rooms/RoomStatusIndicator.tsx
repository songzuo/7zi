/**
 * Room Status Indicator Component
 *
 * Displays real-time connection status and member activity
 * Shows connection state, online member count, and unread messages
 *
 * Features:
 * - Connection status: connected/connecting/disconnected
 * - Real-time member count
 * - Message unread badge
 * - Dark/light mode support
 */

'use client'

import { memo, useMemo } from 'react'
import clsx from 'clsx'
import type { ConnectionStatus } from '@/types/rooms'

export interface RoomStatusIndicatorProps {
  /** Connection status */
  status: ConnectionStatus
  /** Online member count */
  onlineCount: number
  /** Total member count */
  totalCount: number
  /** Unread message count */
  unreadCount?: number
  /** Show detailed status */
  showDetails?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

/**
 * Status indicator configuration
 */
const statusConfig: Record<
  ConnectionStatus,
  {
    icon: string
    label: string
    colorClass: string
    bgClass: string
    animate?: boolean
  }
> = {
  connected: {
    icon: '●',
    label: 'Connected',
    colorClass: 'text-green-500 dark:text-green-400',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
  },
  connecting: {
    icon: '◐',
    label: 'Connecting',
    colorClass: 'text-yellow-500 dark:text-yellow-400',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    animate: true,
  },
  disconnected: {
    icon: '○',
    label: 'Disconnected',
    colorClass: 'text-gray-400 dark:text-gray-500',
    bgClass: 'bg-gray-100 dark:bg-gray-800',
  },
  reconnecting: {
    icon: '↻',
    label: 'Reconnecting',
    colorClass: 'text-orange-500 dark:text-orange-400',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    animate: true,
  },
}

/**
 * Size classes
 */
const sizeClasses = {
  sm: {
    container: 'text-xs gap-1.5 px-2 py-1',
    icon: 'text-sm',
    badge: 'min-w-4 h-4 text-xs',
  },
  md: {
    container: 'text-sm gap-2 px-3 py-1.5',
    icon: 'text-base',
    badge: 'min-w-5 h-5 text-xs',
  },
  lg: {
    container: 'text-base gap-2.5 px-4 py-2',
    icon: 'text-lg',
    badge: 'min-w-6 h-6 text-sm',
  },
}

/**
 * Room Status Indicator Component
 */
export const RoomStatusIndicator = memo(function RoomStatusIndicator({
  status,
  onlineCount,
  totalCount,
  unreadCount = 0,
  showDetails = false,
  size = 'md',
  className,
}: RoomStatusIndicatorProps) {
  const config = statusConfig[status]
  const sizeStyle = sizeClasses[size]

  const displayText = useMemo(() => {
    if (!showDetails) return config.label
    return `${onlineCount}/${totalCount} online`
  }, [config.label, onlineCount, showDetails, totalCount])

  return (
    <div className={clsx('inline-flex items-center', sizeStyle.container, className)}>
      {/* Connection Status */}
      <div
        className={clsx('flex items-center', config.bgClass, 'rounded-full', sizeStyle.container)}
        title={config.label}
      >
        <span
          className={clsx(sizeStyle.icon, config.colorClass, config.animate && 'animate-spin')}
          style={{ animationDuration: config.animate ? '2s' : undefined }}
        >
          {config.icon}
        </span>
        {showDetails && (
          <span className={clsx('font-medium', config.colorClass)}>{displayText}</span>
        )}
      </div>

      {/* Online Count (when not showing details) */}
      {!showDetails && (
        <div className="flex items-center gap-1">
          <span className="text-green-500 dark:text-green-400">●</span>
          <span className="font-medium text-gray-600 dark:text-gray-300">{onlineCount}</span>
        </div>
      )}

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <span
          className={clsx(
            'flex items-center justify-center',
            'rounded-full bg-red-500 font-semibold text-white',
            sizeStyle.badge,
            'px-1.5'
          )}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  )
})

/**
 * Compact Status Badge - Minimal version
 */
export const StatusBadge = memo(function StatusBadge({
  status,
  className,
}: Pick<RoomStatusIndicatorProps, 'status' | 'className'>) {
  const config = statusConfig[status]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-xs font-medium',
        config.colorClass,
        className
      )}
      title={config.label}
    >
      <span className={clsx(config.animate && 'animate-spin')}>{config.icon}</span>
    </span>
  )
})

export default RoomStatusIndicator
