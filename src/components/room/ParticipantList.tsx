/**
 * ParticipantList Component
 *
 * Displays list of participants in a room with roles, status, and actions
 */

'use client';

import { useState, useMemo } from 'react';
import type { RoomParticipant, UserRole } from '@/lib/websocket/rooms';

// ============================================================================
// Types
// ============================================================================

export interface ParticipantListProps {
  participants: RoomParticipant[];
  currentUserId?: string | null;
  ownerId?: string;
  canManage?: boolean;
  showActions?: boolean;
  onChangeRole?: (userId: string, newRole: UserRole) => void;
  onKickUser?: (userId: string) => void;
  onBanUser?: (userId: string) => void;
  onUnbanUser?: (userId: string) => void;
  maxVisible?: number;
  layout?: 'list' | 'grid' | 'compact';
  emptyMessage?: string;
  bannedUsers?: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

function getRoleBadgeColor(role: UserRole): string {
  switch (role) {
    case 'owner':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700';
    case 'admin':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700';
    case 'member':
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    case 'guest':
      return 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
  }
}

function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'owner':
      return '所有者';
    case 'admin':
      return '管理员';
    case 'member':
      return '成员';
    case 'guest':
      return '访客';
    default:
      return '成员';
  }
}

function formatLastActivity(date: Date): string {
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

// ============================================================================
// Participant Item Component
// ============================================================================

interface ParticipantItemProps {
  participant: RoomParticipant;
  isCurrentUser: boolean;
  isOwner: boolean;
  canManage: boolean;
  showActions: boolean;
  layout: 'list' | 'grid' | 'compact';
  onChangeRole?: (userId: string, newRole: UserRole) => void;
  onKickUser?: (userId: string) => void;
  onBanUser?: (userId: string) => void;
}

function ParticipantItem({
  participant,
  isCurrentUser,
  isOwner,
  canManage,
  showActions,
  layout,
  onChangeRole,
  onKickUser,
  onBanUser,
}: ParticipantItemProps) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const roles: UserRole[] = ['owner', 'admin', 'member', 'guest'];

  if (layout === 'compact') {
    return (
      <div className="relative group">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold cursor-pointer"
          style={{ backgroundColor: participant.color }}
          title={participant.name}
        >
          {participant.name.charAt(0).toUpperCase()}
        </div>
        {participant.isOnline && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
        )}
      </div>
    );
  }

  if (layout === 'grid') {
    return (
      <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="relative mb-2">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: participant.color }}
          >
            {participant.name.charAt(0).toUpperCase()}
          </div>
          {participant.isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
          )}
        </div>
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center truncate w-full">
          {participant.name}
          {isCurrentUser && ' (你)'}
        </div>
        <div className={`text-xs px-2 py-0.5 rounded-full border ${getRoleBadgeColor(participant.role)}`}>
          {getRoleLabel(participant.role)}
        </div>
      </div>
    );
  }

  // Default: list layout
  const itemClasses = `flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors group ${isCurrentUser ? 'current-user bg-blue-50 dark:bg-blue-900/20' : ''}`;

  return (
    <div data-testid="participant-item" data-user-id={participant.id} className={itemClasses}>
      {/* Avatar */}
      <div className="relative">
        <div
          data-testid="avatar-initial"
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
          style={{ backgroundColor: participant.color }}
        >
          {participant.avatar ? (
            <img data-testid="participant-avatar" src={participant.avatar} alt={participant.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            participant.name.charAt(0).toUpperCase()
          )}
        </div>
        {participant.isOnline && (
          <span data-status="online" className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
        )}
        {!participant.isOnline && (
          <span data-status="offline" className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 rounded-full border-2 border-white dark:border-gray-900" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {participant.name}
          </span>
          {isCurrentUser && (
            <span className="text-xs text-gray-500 dark:text-gray-400">(你)</span>
          )}
          {isOwner && (
            <span className="text-xs">👑</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <span className={`px-1.5 py-0.5 rounded-full border ${getRoleBadgeColor(participant.role)}`}>
            {getRoleLabel(participant.role)}
          </span>
          <span>•</span>
          <span>{participant.isOnline ? '在线' : '离线'}</span>
          {!participant.isOnline && (
            <>
              <span>•</span>
              <span>{formatLastActivity(participant.lastActivity)}</span>
            </>
          )}
          {participant.isTyping && (
            <span data-testid="typing-indicator" className="text-xs text-blue-600 dark:text-blue-400">
              正在输入...
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {showActions && canManage && !isOwner && !isCurrentUser && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Role Menu */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              aria-label="操作"
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="操作"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showRoleMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 min-w-[100px]">
                {roles.map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      onChangeRole?.(participant.id, role);
                      setShowRoleMenu(false);
                    }}
                    className={`
                      w-full px-3 py-1.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700
                      ${participant.role === role ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}
                    `}
                  >
                    {getRoleLabel(role)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Kick */}
          <button
            onClick={() => onKickUser?.(participant.id)}
            aria-label="踢出用户"
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
            title="踢出"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>

          {/* Ban */}
          <button
            onClick={() => onBanUser?.(participant.id)}
            aria-label="封禁用户"
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="封禁"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main ParticipantList Component
// ============================================================================

export function ParticipantList({
  participants,
  currentUserId,
  ownerId,
  canManage = false,
  showActions = true,
  onChangeRole,
  onKickUser,
  onBanUser,
  onUnbanUser,
  maxVisible,
  layout = 'list',
  emptyMessage = '没有参与者',
  bannedUsers = [],
}: ParticipantListProps) {
  const [showAll, setShowAll] = useState(false);

  // Sort participants: online first, then by role
  const sortedParticipants = useMemo(() => {
    const roleOrder: Record<UserRole, number> = {
      owner: 0,
      admin: 1,
      moderator: 2,
      member: 3,
      guest: 4,
    };

    return [...participants].sort((a, b) => {
      // Online users first
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }
      // Then by role
      return roleOrder[a.role] - roleOrder[b.role];
    });
  }, [participants]);

  const visibleParticipants = useMemo(() => {
    if (maxVisible && !showAll) {
      return sortedParticipants.slice(0, maxVisible);
    }
    return sortedParticipants;
  }, [sortedParticipants, maxVisible, showAll]);

  const hiddenCount = maxVisible ? sortedParticipants.length - maxVisible : 0;

  // Compact layout: horizontal stack
  if (layout === 'compact') {
    return (
      <div data-testid="participant-compact" className="flex items-center gap-1">
        <div data-testid="avatar-stack" className="flex items-center gap-1">
          {visibleParticipants.map((participant) => (
            <ParticipantItem
              key={participant.id}
              participant={participant}
              isCurrentUser={participant.id === currentUserId}
              isOwner={participant.id === ownerId}
              canManage={canManage}
              showActions={false}
              layout="compact"
            />
          ))}
        </div>
        {maxVisible && hiddenCount > 0 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-600 dark:text-gray-400"
          >
            +{hiddenCount}
          </button>
        )}
      </div>
    );
  }

  // Grid layout
  if (layout === 'grid') {
    return (
      <div>
        <div data-testid="participant-grid" className="grid grid-cols-3 gap-3">
          {visibleParticipants.map((participant) => (
            <ParticipantItem
              key={participant.id}
              participant={participant}
              isCurrentUser={participant.id === currentUserId}
              isOwner={participant.id === ownerId}
              canManage={canManage}
              showActions={showActions}
              layout="grid"
              onChangeRole={onChangeRole}
              onKickUser={onKickUser}
              onBanUser={onBanUser}
            />
          ))}
        </div>
        {maxVisible && hiddenCount > 0 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full mt-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors"
          >
            显示全部 {sortedParticipants.length} 位参与者
          </button>
        )}
      </div>
    );
  }

  // Default: list layout
  return (
    <div data-testid="participant-list" role="list" aria-label="参与者列表">
      {/* Stats */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {participants.filter((p) => p.isOnline).length} 在线 / {participants.length} 总计
        </div>
      </div>

      {/* Participant List */}
      <div className="space-y-1">
        {visibleParticipants.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {emptyMessage}
          </div>
        ) : (
          visibleParticipants.map((participant) => (
            <ParticipantItem
              key={participant.id}
              participant={participant}
              isCurrentUser={participant.id === currentUserId}
              isOwner={participant.id === ownerId}
              canManage={canManage}
              showActions={showActions}
              layout="list"
              onChangeRole={onChangeRole}
              onKickUser={onKickUser}
              onBanUser={onBanUser}
            />
          ))
        )}
      </div>

      {/* Banned Users Section */}
      {bannedUsers && bannedUsers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            封禁用户 ({bannedUsers.length})
          </h4>
          <div className="space-y-2">
            {bannedUsers.map((userId) => (
              <div
                key={userId}
                className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded"
              >
                <span className="text-sm text-gray-900 dark:text-gray-100">{userId}</span>
                <button
                  onClick={() => onUnbanUser?.(userId)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                  aria-label="解除封禁"
                >
                  解除封禁
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show More Button */}
      {maxVisible && hiddenCount > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full mt-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors"
        >
          显示全部 {sortedParticipants.length} 位参与者
        </button>
      )}
    </div>
  );
}

export default ParticipantList;
