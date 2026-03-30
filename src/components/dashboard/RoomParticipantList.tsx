'use client';

/**
 * RoomParticipantList - 房间参与者列表组件
 *
 * 显示房间内所有参与者
 * 支持管理操作（踢出、禁言、更改角色）
 * 显示在线状态和活动信息
 * 支持国际化 (i18n)
 */

import React, { useState, useMemo } from 'react';
import { Users, MoreVertical, Crown, Shield, User, Clock, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { RoomParticipant, UserRole } from '@/lib/websocket/rooms';

// ============================================================================
// 类型定义
// ============================================================================

export interface RoomParticipantListProps {
  /** 参与者列表 */
  participants: RoomParticipant[];
  /** 当前用户 ID */
  currentUserId: string;
  /** 当前用户角色 */
  currentUserRole: UserRole;
  /** 是否只读（无操作权限） */
  readOnly?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 最大显示数量 */
  maxDisplay?: number;
  /** 是否显示所有参与者（不限制） */
  showAll?: boolean;
  /** 踢出用户回调 */
  onKick?: (participantId: string) => Promise<void> | void;
  /** 禁言用户回调 */
  onMute?: (participantId: string, muted: boolean) => Promise<void> | void;
  /** 更改角色回调 */
  onChangeRole?: (participantId: string, newRole: UserRole) => Promise<void> | void;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取角色图标
 */
function getRoleIcon(role: UserRole) {
  const icons = {
    owner: <Crown className="w-4 h-4" />,
    admin: <Shield className="w-4 h-4" />,
    moderator: <Shield className="w-4 h-4" />,
    member: <User className="w-4 h-4" />,
    guest: <User className="w-4 h-4" />,
  };
  return icons[role] || <User className="w-4 h-4" />;
}

/**
 * 获取角色显示名称
 */
function getRoleName(role: UserRole) {
  const names: Record<UserRole, string> = {
    owner: '拥有者',
    admin: '管理员',
    moderator: '版主',
    member: '成员',
    guest: '访客',
  };
  return names[role] || role;
}

/**
 * 获取角色颜色类名
 */
function getRoleColorClass(role: UserRole) {
  const classes: Record<UserRole, string> = {
    owner: 'text-yellow-600 dark:text-yellow-400',
    admin: 'text-red-600 dark:text-red-400',
    moderator: 'text-purple-600 dark:text-purple-400',
    member: 'text-blue-600 dark:text-blue-400',
    guest: 'text-zinc-600 dark:text-zinc-400',
  };
  return classes[role] || 'text-zinc-600 dark:text-zinc-400';
}

/**
 * 检查是否可以管理用户
 */
function canManageUser(actorRole: UserRole, targetRole: UserRole): boolean {
  const roleHierarchy: UserRole[] = ['owner', 'admin', 'moderator', 'member', 'guest'];
  return roleHierarchy.indexOf(actorRole) < roleHierarchy.indexOf(targetRole);
}

/**
 * 格式化时间差
 */
function formatLastActive(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();

  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} 分钟前`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} 小时前`;
  } else {
    const days = Math.floor(diff / 86400000);
    return `${days} 天前`;
  }
}

// ============================================================================
// 子组件：操作菜单
// ============================================================================

interface ParticipantActionsMenuProps {
  participant: RoomParticipant;
  currentUserId: string;
  currentUserRole: UserRole;
  isOpen: boolean;
  onClose: () => void;
  onKick?: (participantId: string) => Promise<void> | void;
  onMute?: (participantId: string, muted: boolean) => Promise<void> | void;
  onChangeRole?: (participantId: string, newRole: UserRole) => Promise<void> | void;
}

const ParticipantActionsMenu: React.FC<ParticipantActionsMenuProps> = ({
  participant,
  currentUserId,
  currentUserRole,
  isOpen,
  onClose,
  onKick,
  onMute,
  onChangeRole,
}) => {
  const t = useTranslations('room.participants');

  if (!isOpen) return null;

  const canManage = canManageUser(currentUserRole, participant.role);
  const isSelf = participant.id === currentUserId;

  if (isSelf || !canManage || readOnly) {
    return null;
  }

  const availableRoles: UserRole[] = ['member', 'moderator', 'admin'];
  const filteredRoles = availableRoles.filter(r => canManageUser(currentUserRole, r));

  return (
    <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1">
      {/* 更改角色 */}
      {onChangeRole && filteredRoles.length > 0 && (
        <div className="px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {t('changeRole')}
        </div>
      )}
      {onChangeRole && filteredRoles.map(role => (
        <button
          key={role}
          onClick={() => {
            onChangeRole(participant.id, role);
            onClose();
          }}
          disabled={participant.role === role}
          className={`
            w-full px-3 py-2 text-left text-sm
            flex items-center gap-2
            hover:bg-zinc-100 dark:hover:bg-zinc-700/50
            disabled:opacity-50 disabled:cursor-not-allowed
            ${participant.role === role ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-700 dark:text-zinc-300'}
          `}
        >
          {getRoleIcon(role)}
          <span>{getRoleName(role)}</span>
        </button>
      ))}

      {/* 禁言/解除禁言 */}
      {onMute && (
        <button
          onClick={() => {
            onMute(participant.id, !participant.isTyping);
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{participant.isTyping ? t('unmute') : t('mute')}</span>
        </button>
      )}

      {/* 分隔线 */}
      {(onChangeRole || onMute) && onKick && <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />}

      {/* 踢出 */}
      {onKick && participant.role !== 'owner' && (
        <button
          onClick={() => {
            onKick(participant.id);
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
        >
          <X className="w-4 h-4" />
          <span>{t('kick')}</span>
        </button>
      )}
    </div>
  );
};

// ============================================================================
// 子组件：单个参与者项
// ============================================================================

interface ParticipantItemProps {
  participant: RoomParticipant;
  currentUserId: string;
  currentUserRole: UserRole;
  readOnly?: boolean;
  onKick?: (participantId: string) => Promise<void> | void;
  onMute?: (participantId: string, muted: boolean) => Promise<void> | void;
  onChangeRole?: (participantId: string, newRole: UserRole) => Promise<void> | void;
}

const ParticipantItem: React.FC<ParticipantItemProps> = ({
  participant,
  currentUserId,
  currentUserRole,
  readOnly = false,
  onKick,
  onMute,
  onChangeRole,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const isSelf = participant.id === currentUserId;
  const canManage = !readOnly && !isSelf && canManageUser(currentUserRole, participant.role);

  return (
    <div className="relative">
      <div
        className={`
          group flex items-center gap-3 p-3 rounded-lg
          transition-colors duration-200
          ${participant.isOnline ? 'bg-white dark:bg-zinc-800/50' : 'bg-zinc-50 dark:bg-zinc-800/30 opacity-75'}
          ${canManage ? 'hover:bg-zinc-100 dark:hover:bg-zinc-700/50' : ''}
        `}
      >
        {/* 头像 */}
        <div
          className="relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-white text-sm"
          style={{ backgroundColor: participant.color }}
        >
          {participant.avatar ? (
            <img src={participant.avatar} alt={participant.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span>{participant.name.charAt(0).toUpperCase()}</span>
          )}

          {/* 在线状态指示器 */}
          <div
            className={`
              absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-800
              ${participant.isOnline ? 'bg-green-500' : 'bg-zinc-400'}
            `}
          />
        </div>

        {/* 用户信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`
              font-medium truncate
              ${isSelf ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}
            `}>
              {participant.name}
              {isSelf && <span className="text-xs text-zinc-400 dark:text-zinc-500">（你）</span>}
            </h4>
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {/* 角色 */}
            <div className={cn('flex items-center gap-1', getRoleColorClass(participant.role))}>
              {getRoleIcon(participant.role)}
              <span>{getRoleName(participant.role)}</span>
            </div>

            {/* 最后活跃 */}
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatLastActive(participant.lastActivity)}</span>
            </div>

            {/* 输入状态 */}
            {participant.isTyping && (
              <div className="flex items-center gap-1 text-blue-500">
                <MessageSquare className="w-3 h-3 animate-pulse" />
                <span>输入中...</span>
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        {canManage && (
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            aria-label="更多操作"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 操作菜单 */}
      {canManage && (
        <ParticipantActionsMenu
          participant={participant}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          isOpen={showMenu}
          onClose={() => setShowMenu(false)}
          onKick={onKick}
          onMute={onMute}
          onChangeRole={onChangeRole}
        />
      )}
    </div>
  );
};

// ============================================================================
// 主组件
// ============================================================================

export const RoomParticipantList: React.FC<RoomParticipantListProps> = ({
  participants,
  currentUserId,
  currentUserRole,
  readOnly = false,
  className = '',
  maxDisplay,
  showAll = false,
  onKick,
  onMute,
  onChangeRole,
}) => {
  const t = useTranslations('room.participants');

  // 排序参与者：在线优先，按活跃时间排序
  const sortedParticipants = useMemo(() => {
    const sorted = [...participants].sort((a, b) => {
      // 自己优先显示
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;

      // 在线优先
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;

      // 按角色排序
      const roleHierarchy: UserRole[] = ['owner', 'admin', 'moderator', 'member', 'guest'];
      const roleDiff = roleHierarchy.indexOf(a.role) - roleHierarchy.indexOf(b.role);
      if (roleDiff !== 0) return roleDiff;

      // 按最后活跃时间排序
      return b.lastActivity.getTime() - a.lastActivity.getTime();
    });

    return sorted;
  }, [participants, currentUserId]);

  // 限制显示数量
  const displayedParticipants = showAll ? sortedParticipants : sortedParticipants.slice(0, maxDisplay);
  const hasMore = !showAll && maxDisplay && sortedParticipants.length > maxDisplay;

  // 统计信息
  const stats = useMemo(() => {
    const online = participants.filter(p => p.isOnline).length;
    const typing = participants.filter(p => p.isTyping).length;
    return { total: participants.length, online, typing };
  }, [participants]);

  return (
    <div className={className}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t('title')}
          </h3>

          {/* 统计徽章 */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                {stats.online} {t('online')}
              </span>
            </div>

            {stats.typing > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-pulse" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  {stats.typing} {t('typing')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 总数 */}
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Users className="w-4 h-4" />
          <span>{stats.total} {t('total')}</span>
        </div>
      </div>

      {/* 参与者列表 */}
      {sortedParticipants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-zinc-500 dark:text-zinc-400">{t('noParticipants')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedParticipants.map((participant) => (
            <ParticipantItem
              key={participant.id}
              participant={participant}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              readOnly={readOnly}
              onKick={onKick}
              onMute={onMute}
              onChangeRole={onChangeRole}
            />
          ))}

          {/* 显示更多 */}
          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={() => {/* TODO: 显示全部 */}}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                {t('showMore', { count: sortedParticipants.length - displayedParticipants.length })}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 紧凑版本组件
// ============================================================================

export interface RoomParticipantListCompactProps {
  participants: RoomParticipant[];
  currentUserId?: string;
  className?: string;
  maxDisplay?: number;
}

/**
 * 紧凑版参与者列表，适合侧边栏或小空间使用
 */
export const RoomParticipantListCompact: React.FC<RoomParticipantListCompactProps> = ({
  participants,
  currentUserId,
  className = '',
  maxDisplay = 5,
}) => {
  const t = useTranslations('room.participants');

  const onlineParticipants = participants.filter(p => p.isOnline);
  const displayed = onlineParticipants.slice(0, maxDisplay);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {t('title')}
        </h4>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {onlineParticipants.length}/{participants.length}
        </span>
      </div>

      <div className="flex -space-x-2">
        {displayed.map((participant) => (
          <div
            key={participant.id}
            className={`
              w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900
              flex items-center justify-center text-xs font-medium text-white
              ${participant.id === currentUserId ? 'ring-2 ring-blue-500' : ''}
            `}
            style={{ backgroundColor: participant.color }}
            title={`${participant.name} (${getRoleName(participant.role)})`}
          >
            {participant.avatar ? (
              <img src={participant.avatar} alt={participant.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span>{participant.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
        ))}

        {onlineParticipants.length > maxDisplay && (
          <div className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-600 dark:text-zinc-400">
            +{onlineParticipants.length - maxDisplay}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomParticipantList;
