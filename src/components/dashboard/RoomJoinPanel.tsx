'use client';

/**
 * RoomJoinPanel - 房间加入面板组件
 *
 * 支持通过房间 ID、邀请码加入房间
 * 显示可用房间列表
 * 支持搜索和过滤
 * 支持国际化 (i18n)
 */

import React, { useState, useMemo } from 'react';
import { Search, Users, Clock, ArrowRight, CheckCircle, AlertCircle, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { Room, RoomType, RoomVisibility } from '@/lib/websocket/rooms';

// ============================================================================
// 类型定义
// ============================================================================

export interface RoomJoinOptions {
  roomId: string;
  inviteCode?: string;
}

export interface RoomJoinPanelProps {
  /** 可用房间列表 */
  availableRooms?: Room[];
  /** 当前用户的 ID */
  currentUserId: string;
  /** 当前用户名称 */
  currentUserName: string;
  /** 已加入的房间 ID 列表 */
  joinedRoomIds?: string[];
  /** 提交回调 */
  onJoin: (options: RoomJoinOptions) => Promise<void> | void;
  /** 是否加载中 */
  isLoading?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 是否显示搜索框 */
  showSearch?: boolean;
  /** 是否显示过滤器 */
  showFilters?: boolean;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取房间类型图标
 */
function getRoomTypeIcon(type: RoomType) {
  const icons = {
    chat: <Globe className="w-4 h-4" />,
    task: <Search className="w-4 h-4" />,
    project: <Users className="w-4 h-4" />,
    document: <Lock className="w-4 h-4" />,
    voice: <CheckCircle className="w-4 h-4" />,
    video: <Globe className="w-4 h-4" />,
  };
  return icons[type] || <Globe className="w-4 h-4" />;
}

/**
 * 获取房间类型显示名称
 */
function getRoomTypeName(type: RoomType) {
  const names: Record<RoomType, string> = {
    chat: '聊天室',
    task: '任务协作',
    project: '项目协作',
    document: '文档协作',
    voice: '语音会议',
    video: '视频会议',
  };
  return names[type] || type;
}

/**
 * 获取可见性图标
 */
function getVisibilityIcon(visibility: RoomVisibility) {
  return visibility === 'public' ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />;
}

/**
 * 获取可见性显示名称
 */
function getVisibilityName(visibility: RoomVisibility) {
  const names: Record<RoomVisibility, string> = {
    public: '公开',
    private: '私有',
    'invite-only': '仅邀请',
  };
  return names[visibility] || visibility;
}

/**
 * 格式化时间差
 */
function formatTimeDiff(timestamp: Date): string {
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
// 子组件：房间卡片
// ============================================================================

interface RoomCardProps {
  room: Room;
  isJoined: boolean;
  onJoin: () => void;
  isLoading: boolean;
  isCurrentUserOwner: boolean;
}

const RoomCard: React.FC<RoomCardProps> = ({
  room,
  isJoined,
  onJoin,
  isLoading,
  isCurrentUserOwner,
}) => {
  const t = useTranslations('room.join');

  const isFull = room.participants.size >= room.config.maxParticipants!;
  const isPrivate = room.visibility !== 'public';

  return (
    <div
      className={`
        group relative overflow-hidden
        p-4 bg-white dark:bg-zinc-800/50
        rounded-xl border-2 transition-all duration-200
        ${
          isJoined
            ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
            : 'border-zinc-200 dark:border-zinc-700 hover:border-blue-500'
        }
        ${isLoading ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      {/* 顶部信息 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* 房间类型图标 */}
          <div className={`
            w-10 h-10 rounded-lg
            flex items-center justify-center flex-shrink-0
            ${
              isJoined
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-blue-50 dark:bg-blue-900/20'
            }
          `}>
            <span className={isJoined ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}>
              {getRoomTypeIcon(room.type)}
            </span>
          </div>

          {/* 房间信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {room.name}
              </h4>
              {/* 可见性图标 */}
              <span className="text-zinc-400" title={getVisibilityName(room.visibility)}>
                {getVisibilityIcon(room.visibility)}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {getRoomTypeName(room.type)} · ID: {room.id}
            </p>
          </div>
        </div>

        {/* 状态标签 */}
        {isJoined ? (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium">已加入</span>
          </div>
        ) : isFull ? (
          <div className="flex items-center gap-1 text-red-500">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-medium">已满</span>
          </div>
        ) : isPrivate ? (
          <div className="flex items-center gap-1 text-zinc-500">
            <Lock className="w-4 h-4" />
            <span className="text-xs">需邀请</span>
          </div>
        ) : null}
      </div>

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5" />
          <span>
            {room.participants.size}/{room.config.maxParticipants} {t('participants')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTimeDiff(room.lastActivity)}</span>
        </div>
      </div>

      {/* 加入按钮 */}
      {!isJoined && !isFull && !isCurrentUserOwner && (
        <Button
          size="sm"
          variant="primary"
          onClick={onJoin}
          disabled={isLoading}
          className="w-full"
        >
          <ArrowRight className="w-4 h-4" />
          {t('joinRoom')}
        </Button>
      )}
    </div>
  );
};

// ============================================================================
// 主组件
// ============================================================================

export const RoomJoinPanel: React.FC<RoomJoinPanelProps> = ({
  availableRooms = [],
  currentUserId,
  currentUserName,
  joinedRoomIds = [],
  onJoin,
  isLoading = false,
  className = '',
  showSearch = true,
  showFilters = true,
}) => {
  const t = useTranslations('room.join');

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤器状态
  const [filterType, setFilterType] = useState<RoomType | 'all'>('all');
  const [filterVisibility, setFilterVisibility] = useState<RoomVisibility | 'all'>('all');

  // 加入房间输入状态
  const [roomIdInput, setRoomIdInput] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  // 过滤房间列表
  const filteredRooms = useMemo(() => {
    return availableRooms.filter(room => {
      // 搜索过滤
      const matchesSearch =
        searchQuery === '' ||
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.id.toLowerCase().includes(searchQuery.toLowerCase());

      // 类型过滤
      const matchesType = filterType === 'all' || room.type === filterType;

      // 可见性过滤
      const matchesVisibility = filterVisibility === 'all' || room.visibility === filterVisibility;

      return matchesSearch && matchesType && matchesVisibility;
    });
  }, [availableRooms, searchQuery, filterType, filterVisibility]);

  // 检查是否已加入
  const isJoined = (roomId: string) => joinedRoomIds.includes(roomId);

  // 检查是否是房间拥有者
  const isOwner = (room: Room) => room.ownerId === currentUserId;

  // 处理通过输入框加入
  const handleJoinById = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomIdInput.trim()) return;

    await onJoin({
      roomId: roomIdInput.trim(),
      inviteCode: inviteCodeInput.trim() || undefined,
    });

    setRoomIdInput('');
    setInviteCodeInput('');
  };

  // 处理从列表加入
  const handleJoinFromList = async (roomId: string) => {
    await onJoin({ roomId });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* 通过 ID/邀请码加入 */}
      <div className="p-6 bg-white dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          {t('joinByCode')}
        </h3>
        <form onSubmit={handleJoinById} className="space-y-3">
          <Input
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            placeholder={t('roomIdPlaceholder')}
            required
            disabled={isLoading}
          />
          <Input
            value={inviteCodeInput}
            onChange={(e) => setInviteCodeInput(e.target.value)}
            placeholder={t('inviteCodePlaceholder')}
            disabled={isLoading}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !roomIdInput.trim()}
            className="w-full"
            loading={isLoading}
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            {t('join')}
          </Button>
        </form>
      </div>

      {/* 可用房间列表 */}
      {availableRooms.length > 0 && (
        <div>
          {/* 搜索和过滤 */}
          {(showSearch || showFilters) && (
            <div className="mb-4 space-y-3">
              {showSearch && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              )}

              {showFilters && (
                <div className="flex gap-2 flex-wrap">
                  {/* 类型过滤 */}
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as RoomType | 'all')}
                    disabled={isLoading}
                    className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="all">{t('allTypes')}</option>
                    <option value="chat">{t('chat')}</option>
                    <option value="task">{t('task')}</option>
                    <option value="project">{t('project')}</option>
                    <option value="document">{t('document')}</option>
                    <option value="voice">{t('voice')}</option>
                    <option value="video">{t('video')}</option>
                  </select>

                  {/* 可见性过滤 */}
                  <select
                    value={filterVisibility}
                    onChange={(e) => setFilterVisibility(e.target.value as RoomVisibility | 'all')}
                    disabled={isLoading}
                    className="px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="all">{t('allVisibilities')}</option>
                    <option value="public">{t('public')}</option>
                    <option value="private">{t('private')}</option>
                    <option value="invite-only">{t('inviteOnly')}</option>
                  </select>

                  {/* 显示统计 */}
                  <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 ml-auto">
                    <span>{filteredRooms.length}</span>
                    <span>{t('rooms')}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 房间卡片列表 */}
          {filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
              <p className="text-zinc-500 dark:text-zinc-400">{t('noRoomsFound')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  isJoined={isJoined(room.id)}
                  isCurrentUserOwner={isOwner(room)}
                  isLoading={isLoading}
                  onJoin={() => handleJoinFromList(room.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 无可用房间 */}
      {availableRooms.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-zinc-500 dark:text-zinc-400">{t('noAvailableRooms')}</p>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
            {t('createRoomOrInvite')}
          </p>
        </div>
      )}
    </div>
  );
};

export default RoomJoinPanel;
