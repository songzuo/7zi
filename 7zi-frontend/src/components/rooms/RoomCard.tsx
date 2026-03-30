/**
 * Room Card Component
 *
 * Individual room card for room list display
 * Shows room info, member count, online status, etc.
 *
 * Features:
 * - Room name and description
 * - Online/total member count
 * - Room type indicator
 * - Last activity time
 * - Click to join/view room
 * - Dark/light mode support
 */

'use client';

import { useMemo } from 'react';
import { RoomStatusIndicator } from './RoomStatusIndicator';
import type { Room } from '@/types/rooms';
import clsx from 'clsx';

export interface RoomCardProps {
  /** Room data */
  room: Room;
  /** Click handler */
  onClick?: (room: Room) => void;
  /** Is current room (highlight) */
  isActive?: boolean;
  /** Show detailed info */
  showDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
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
    if (room.memberCount === 0) return 0;
    return Math.round((room.onlineCount / room.memberCount) * 100);
  }, [room.onlineCount, room.memberCount]);

  /**
   * Format last activity time
   */
  const formatLastActivity = useMemo(() => {
    const now = Date.now();
    const diff = now - room.lastActivityAt;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  }, [room.lastActivityAt]);

  /**
   * Get room type icon
   */
  const roomTypeIcon = useMemo(() => {
    if (room.password) return '🔒';
    return '🏠';
  }, [room.password]);

  return (
    <button
      onClick={() => onClick?.(room)}
      className={clsx(
        'w-full text-left p-4 rounded-lg border transition-all hover:shadow-md',
        isActive
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600',
        className
      )}
      type="button"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          {/* Room Name */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{roomTypeIcon}</span>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {room.name}
            </h3>
          </div>

          {/* Description */}
          {room.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {room.description}
            </p>
          )}
        </div>

        {/* Status Indicator */}
        <RoomStatusIndicator
          status="connected"
          onlineCount={room.onlineCount}
          totalCount={room.memberCount}
          size="sm"
          showDetails={showDetails}
        />
      </div>

      {/* Details Row */}
      {showDetails && (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
          {/* Online Percentage Bar */}
          <div className="flex items-center gap-2 flex-1">
            <div className="w-full max-w-[100px] bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all"
                style={{ width: `${onlinePercentage}%` }}
              />
            </div>
            <span className="whitespace-nowrap">{onlinePercentage}% 在线</span>
          </div>

          {/* Last Activity */}
          <div className="whitespace-nowrap">
            {formatLastActivity}
          </div>
        </div>
      )}

      {/* Compact View (when showDetails is false) */}
      {!showDetails && (
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 pt-2">
          <div className="flex items-center gap-1">
            <span className="text-green-500">●</span>
            <span>{room.onlineCount} 在线</span>
          </div>
          <span>•</span>
          <span>{formatLastActivity}</span>
        </div>
      )}
    </button>
  );
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
        'w-full text-left px-3 py-2 rounded-md transition-colors',
        isActive
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
        className
      )}
      type="button"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {/* Room Icon */}
          <span className="flex-shrink-0">{room.password ? '🔒' : '🏠'}</span>

          {/* Room Name */}
          <span className="font-medium truncate">{room.name}</span>
        </div>

        {/* Online Count */}
        {room.onlineCount > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            <span className="text-green-500">●</span>
            {room.onlineCount}
          </span>
        )}
      </div>
    </button>
  );
}

export default RoomCard;
