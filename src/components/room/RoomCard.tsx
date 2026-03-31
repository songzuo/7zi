/**
 * RoomCard Component
 *
 * Individual room card component for displaying room information
 */

'use client';

import { useState, useCallback } from 'react';
import type { Room, RoomType, RoomVisibility } from '@/lib/websocket/rooms';

// ============================================================================
// Types
// ============================================================================

export interface RoomCardProps {
  room: Room;
  currentUserId?: string | null;
  isSelected?: boolean;
  onClick?: () => void;
  onJoin?: (roomId: string) => void;
  onLeave?: (roomId: string) => void;
  onDelete?: (roomId: string) => void;
  layout?: 'card' | 'list' | 'compact';
  showActions?: boolean;
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
};

const ROOM_VISIBILITY_ICONS: Record<RoomVisibility, string> = {
  public: '🌐',
  private: '🔒',
  'invite-only': '✉️',
};

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  task: '任务',
  project: '项目',
  chat: '聊天',
  document: '文档',
  voice: '语音',
  video: '视频',
};

const ROOM_VISIBILITY_LABELS: Record<RoomVisibility, string> = {
  public: '公开',
  private: '私有',
  'invite-only': '仅邀请',
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return date.toLocaleDateString('zh-CN');
}

function getMemberCountText(count: number): string {
  if (count === 0) return '空房间';
  if (count === 1) return '1 人在线';
  return `${count} 人在线`;
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
  const [showMenu, setShowMenu] = useState(false);
  const memberCount = room.participants.size;
  const isOwner = room.ownerId === currentUserId;
  const isMember = room.participants.has(currentUserId || '');

  const handleMenuAction = useCallback((action: 'leave' | 'delete') => {
    if (action === 'leave' && onLeave) {
      onLeave(room.id);
    } else if (action === 'delete' && onDelete) {
      onDelete(room.id);
    }
    setShowMenu(false);
  }, [onLeave, onDelete, room.id]);

  return (
    <div
      data-testid="room-card"
      className={`
        relative p-4 rounded-xl cursor-pointer transition-all duration-200 group
        ${isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-400 shadow-md'
          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
        }
      `}
      onClick={onClick}
      onMouseEnter={() => showActions && setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div className="text-3xl">{ROOM_TYPE_ICONS[room.type]}</div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {room.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
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
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              aria-label="菜单"
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 min-w-[120px]">
                {isOwner && onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuAction('delete');
                    }}
                    aria-label="删除房间"
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    删除
                  </button>
                )}
                {!isOwner && isMember && onLeave && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuAction('leave');
                    }}
                    aria-label="离开房间"
                    className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
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
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {Array.from(room.participants.values()).slice(0, 3).map((participant) => (
              <div
                key={participant.id}
                className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-white"
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
            <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
              所有者
            </span>
          )}
          <span>{formatTime(room.lastActivity)}</span>
        </div>
      </div>

      {/* Tags */}
      {room.config.allowGuests && (
        <div className="mt-2">
          <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
            允许访客
          </span>
        </div>
      )}
    </div>
  );
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
  const memberCount = room.participants.size;
  const isOwner = room.ownerId === currentUserId;
  const isMember = room.participants.has(currentUserId || '');

  return (
    <div
      data-testid="room-card-list"
      className={`
        flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
        ${isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
          : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        }
      `}
      onClick={onClick}
    >
      {/* Icon */}
      <div className="text-2xl">{ROOM_TYPE_ICONS[room.type]}</div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {room.name}
          </h3>
          {isOwner && (
            <span className="text-xs px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
              所有者
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-sm text-gray-600 dark:text-gray-400">
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
          onClick={(e) => {
            e.stopPropagation();
            onJoin(room.id);
          }}
          aria-label="加入房间"
          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          加入
        </button>
      )}

      {showActions && isMember && !isOwner && onLeave && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLeave(room.id);
          }}
          aria-label="离开房间"
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          离开
        </button>
      )}

      {/* Visibility Icon */}
      <span className="text-lg" title={ROOM_VISIBILITY_LABELS[room.visibility]}>
        {ROOM_VISIBILITY_ICONS[room.visibility]}
      </span>
    </div>
  );
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
  const memberCount = room.participants.size;
  const isOwner = room.ownerId === currentUserId;

  return (
    <div
      data-testid="room-card-compact"
      className={`
        flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
        ${isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }
      `}
      onClick={onClick}
    >
      <span className="text-lg">{ROOM_TYPE_ICONS[room.type]}</span>
      <span className="flex-1 truncate text-sm text-gray-900 dark:text-gray-100">
        {room.name}
      </span>
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {memberCount}
      </span>
      {isOwner && (
        <span className="text-xs">👑</span>
      )}
    </div>
  );
}

// ============================================================================
// Main RoomCard Component
// ============================================================================

export function RoomCard({
  layout = 'card',
  showActions = true,
  ...props
}: RoomCardProps) {
  if (layout === 'list') {
    return <ListLayout {...props} showActions={showActions} />;
  }

  if (layout === 'compact') {
    return <CompactLayout {...props} />;
  }

  return <CardLayout {...props} showActions={showActions} />;
}

export default RoomCard;
