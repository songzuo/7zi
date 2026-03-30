'use client';

/**
 * RoomSettingsPanel - 房间设置面板组件
 *
 * 管理房间配置和权限
 * 支持房间信息编辑
 * 支持成员管理和权限控制
 * 支持国际化 (i18n)
 */

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Shield,
  Bell,
  Trash2,
  Save,
  Clock,
  Lock,
  Globe,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { Room, RoomType, RoomVisibility, RoomConfig, UserRole } from '@/lib/websocket/rooms';

// ============================================================================
// 类型定义
// ============================================================================

export interface RoomSettingsPanelProps {
  /** 房间数据 */
  room: Room | null;
  /** 当前用户 ID */
  currentUserId: string;
  /** 当前用户角色 */
  currentUserRole: UserRole;
  /** 更新房间信息回调 */
  onUpdateRoom?: (updates: Partial<Room>) => Promise<void> | void;
  /** 更新房间配置回调 */
  onUpdateConfig?: (config: Partial<RoomConfig>) => Promise<void> | void;
  /** 销毁房间回调 */
  onDestroyRoom?: () => Promise<void> | void;
  /** 是否加载中 */
  isLoading?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ============================================================================
// 标签页配置
// ============================================================================

type TabType = 'general' | 'members' | 'permissions' | 'notifications';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: 'general', label: '基本设置', icon: <Settings className="w-4 h-4" /> },
  { id: 'members', label: '成员管理', icon: <Users className="w-4 h-4" /> },
  { id: 'permissions', label: '权限设置', icon: <Shield className="w-4 h-4" /> },
  { id: 'notifications', label: '通知设置', icon: <Bell className="w-4 h-4" /> },
];

// ============================================================================
// 房间类型配置
// ============================================================================

const ROOM_TYPES: { type: RoomType; label: string }[] = [
  { type: 'chat', label: '聊天室' },
  { type: 'task', label: '任务协作' },
  { type: 'project', label: '项目协作' },
  { type: 'document', label: '文档协作' },
  { type: 'voice', label: '语音会议' },
  { type: 'video', label: '视频会议' },
];

const VISIBILITY_OPTIONS: { type: RoomVisibility; label: string; icon: React.ReactNode }[] = [
  { type: 'public', label: '公开', icon: <Globe className="w-4 h-4" /> },
  { type: 'private', label: '私有', icon: <Lock className="w-4 h-4" /> },
  { type: 'invite-only', label: '仅邀请', icon: <Mail className="w-4 h-4" /> },
];

// ============================================================================
// 子组件：基本设置标签页
// ============================================================================

interface GeneralTabProps {
  room: Room;
  currentUserId: string;
  currentUserRole: UserRole;
  onUpdateRoom?: (updates: Partial<Room>) => Promise<void> | void;
  onUpdateConfig?: (config: Partial<RoomConfig>) => Promise<void> | void;
  isLoading: boolean;
}

const GeneralTab: React.FC<GeneralTabProps> = ({
  room,
  currentUserId,
  currentUserRole,
  onUpdateRoom,
  onUpdateConfig,
  isLoading,
}) => {
  const t = useTranslations('room.settings.general');

  const [name, setName] = useState(room.name);
  const [visibility, setVisibility] = useState(room.visibility);
  const [maxParticipants, setMaxParticipants] = useState(room.config.maxParticipants || 100);
  const [allowGuests, setAllowGuests] = useState(room.config.allowGuests ?? true);
  const [messageHistoryEnabled, setMessageHistoryEnabled] = useState(room.config.messageHistoryEnabled ?? true);
  const [autoCleanupMinutes, setAutoCleanupMinutes] = useState(room.config.autoCleanupMinutes || 30);

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handleSave = async () => {
    if (onUpdateRoom) {
      await onUpdateRoom({
        name,
        visibility,
      });
    }
    if (onUpdateConfig) {
      await onUpdateConfig({
        maxParticipants,
        allowGuests,
        messageHistoryEnabled,
        autoCleanupMinutes,
      });
    }
  };

  const hasChanges =
    name !== room.name ||
    visibility !== room.visibility ||
    maxParticipants !== room.config.maxParticipants ||
    allowGuests !== room.config.allowGuests ||
    messageHistoryEnabled !== room.config.messageHistoryEnabled ||
    autoCleanupMinutes !== room.config.autoCleanupMinutes;

  return (
    <div className="space-y-6">
      {/* 房间名称 */}
      <div>
        <label htmlFor="room-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          {t('roomName')}
        </label>
        <Input
          id="room-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading || !canEdit}
          maxLength={100}
        />
      </div>

      {/* 房间 ID（只读） */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          {t('roomId')}
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm text-zinc-600 dark:text-zinc-400">
            {room.id}
          </code>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigator.clipboard.writeText(room.id)}
          >
            {t('copy')}
          </Button>
        </div>
      </div>

      {/* 可见性 */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          {t('visibility')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {VISIBILITY_OPTIONS.map((vo) => (
            <button
              key={vo.type}
              type="button"
              onClick={() => setVisibility(vo.type)}
              disabled={isLoading || !canEdit}
              className={`
                flex items-center gap-3 p-3 rounded-lg border-2 transition-all
                ${
                  visibility === vo.type
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <span className={visibility === vo.type ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400'}>
                {vo.icon}
              </span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {vo.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 最大参与者数 */}
      <div>
        <label htmlFor="max-participants" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          {t('maxParticipants')}
        </label>
        <div className="flex items-center gap-3">
          <input
            id="max-participants"
            type="range"
            min="2"
            max="500"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
            disabled={isLoading || !canEdit}
            className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
          />
          <span className="w-16 text-right text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {maxParticipants}
          </span>
        </div>
      </div>

      {/* 选项开关 */}
      <div className="space-y-3">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">{t('allowGuests')}</span>
          <input
            type="checkbox"
            checked={allowGuests}
            onChange={(e) => setAllowGuests(e.target.checked)}
            disabled={isLoading || !canEdit}
            className="w-5 h-5 text-blue-600 border-zinc-300 rounded focus:ring-blue-500 disabled:opacity-50"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">{t('messageHistory')}</span>
          <input
            type="checkbox"
            checked={messageHistoryEnabled}
            onChange={(e) => setMessageHistoryEnabled(e.target.checked)}
            disabled={isLoading || !canEdit}
            className="w-5 h-5 text-blue-600 border-zinc-300 rounded focus:ring-blue-500 disabled:opacity-50"
          />
        </label>
      </div>

      {/* 自动清理时间 */}
      <div>
        <label htmlFor="auto-cleanup" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          {t('autoCleanup')}
        </label>
        <select
          id="auto-cleanup"
          value={autoCleanupMinutes}
          onChange={(e) => setAutoCleanupMinutes(parseInt(e.target.value))}
          disabled={isLoading || !canEdit}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value={0}>{t('neverCleanup')}</option>
          <option value={5}>5 {t('minutes')}</option>
          <option value={15}>15 {t('minutes')}</option>
          <option value={30}>30 {t('minutes')}</option>
          <option value={60}>1 {t('hour')}</option>
          <option value={120}>2 {t('hours')}</option>
          <option value={240}>4 {t('hours')}</option>
        </select>
      </div>

      {/* 保存按钮 */}
      {canEdit && hasChanges && (
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <Button
            onClick={handleSave}
            disabled={isLoading}
            loading={isLoading}
          >
            <Save className="w-4 h-4" />
            {t('saveChanges')}
          </Button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 子组件：成员管理标签页
// ============================================================================

interface MembersTabProps {
  room: Room;
  currentUserId: string;
  currentUserRole: UserRole;
  isLoading: boolean;
}

const MembersTab: React.FC<MembersTabProps> = ({
  room,
  currentUserId,
  currentUserRole,
  isLoading,
}) => {
  const t = useTranslations('room.settings.members');

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  // 计算成员统计
  const stats = {
    total: room.participants.size,
    owners: Array.from(room.participants.values()).filter(p => p.role === 'owner').length,
    admins: Array.from(room.participants.values()).filter(p => p.role === 'admin').length,
    moderators: Array.from(room.participants.values()).filter(p => p.role === 'moderator').length,
    members: Array.from(room.participants.values()).filter(p => p.role === 'member').length,
    guests: Array.from(room.participants.values()).filter(p => p.role === 'guest').length,
  };

  return (
    <div className="space-y-6">
      {/* 成员统计 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {stats.total}
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('totalMembers')}</div>
        </div>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="text-2xl font-semibold text-yellow-700 dark:text-yellow-300">
            {stats.owners}
          </div>
          <div className="text-sm text-yellow-600 dark:text-yellow-400">{t('owners')}</div>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-2xl font-semibold text-red-700 dark:text-red-300">
            {stats.admins}
          </div>
          <div className="text-sm text-red-600 dark:text-red-400">{t('admins')}</div>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-2xl font-semibold text-purple-700 dark:text-purple-300">
            {stats.moderators}
          </div>
          <div className="text-sm text-purple-600 dark:text-purple-400">{t('moderators')}</div>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl font-semibold text-blue-700 dark:text-blue-300">
            {stats.members}
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400">{t('members')}</div>
        </div>
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <div className="text-2xl font-semibold text-zinc-700 dark:text-zinc-300">
            {stats.guests}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">{t('guests')}</div>
        </div>
      </div>

      {/* 邀请新成员 */}
      {canManageMembers && (
        <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">
            {t('inviteNewMember')}
          </h4>
          <div className="flex gap-2">
            <Input
              placeholder={t('emailPlaceholder')}
              type="email"
              disabled={isLoading}
              className="flex-1"
            />
            <Button disabled={isLoading}>
              {t('sendInvite')}
            </Button>
          </div>
        </div>
      )}

      {/* 权限提示 */}
      {!canManageMembers && (
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <Lock className="w-4 h-4" />
          <span>{t('noPermission')}</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 子组件：权限设置标签页
// ============================================================================

interface PermissionsTabProps {
  room: Room;
  currentUserId: string;
  currentUserRole: UserRole;
  isLoading: boolean;
}

const PermissionsTab: React.FC<PermissionsTabProps> = ({
  room,
  currentUserId,
  currentUserRole,
  isLoading,
}) => {
  const t = useTranslations('room.settings.permissions');

  const isOwner = currentUserRole === 'owner';

  return (
    <div className="space-y-6">
      {/* 权限设置说明 */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          {t('permissionLevels')}
        </h4>
        <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="font-medium">拥有者:</span>
            <span>{t('ownerDesc')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="font-medium">管理员:</span>
            <span>{t('adminDesc')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="font-medium">版主:</span>
            <span>{t('moderatorDesc')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="font-medium">成员:</span>
            <span>{t('memberDesc')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
            <span className="font-medium">访客:</span>
            <span>{t('guestDesc')}</span>
          </div>
        </div>
      </div>

      {/* 权限矩阵 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left py-3 px-4 font-medium text-zinc-700 dark:text-zinc-300">
                {t('permission')}
              </th>
              <th className="text-center py-3 px-2 font-medium text-zinc-700 dark:text-zinc-300">
                {t('owner')}
              </th>
              <th className="text-center py-3 px-2 font-medium text-zinc-700 dark:text-zinc-300">
                {t('admin')}
              </th>
              <th className="text-center py-3 px-2 font-medium text-zinc-700 dark:text-zinc-300">
                {t('moderator')}
              </th>
              <th className="text-center py-3 px-2 font-medium text-zinc-700 dark:text-zinc-300">
                {t('member')}
              </th>
              <th className="text-center py-3 px-2 font-medium text-zinc-700 dark:text-zinc-300">
                {t('guest')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            <tr>
              <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{t('manageRoom')}</td>
              <td className="py-3 px-2 text-center"><span className="text-green-500">✓</span></td>
              <td className="py-3 px-2 text-center"><span className="text-green-500">✓</span></td>
              <td className="py-3 px-2 text-center"><span className="text-red-500">✗</span></td>
              <td className="py-3 px-2 text-center"><span className="text-red-500">✗</span></td>
              <td className="py-3 px-2 text-center"><span className="text-red-500">✗</span></td>
            </tr>
            <tr>
              <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{t('kickUsers')}</td>
              <td className="py-3 px-2 text-center"><span className="text-green-500">✓</span></td>
              <td className="py-3 px-2 text-center"><span className="text-green-500">✓</span></td>
              <td className="py-3 px-2 text-center"><span className="text-green-500">✓</span></td>
              <td className="py-3 px-2 text-center"><span className="text-red-500">✗</span></td>
              <td className="py-3 px-2 text-center"><span className="text-red-500">✗</span></td>
            </tr>
            <tr>
              <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{t('banUsers')}</td>
              <td className="py-3 px-2 text-center"><span className="text-green-500">✓</span></td>
              <td className="py-3 px-2 text-center"><span className="text-green-500">✓</span></td>
              <td className="py-3 px-2 text-center"><span className="text-red-500">✗</span></td>
              <td className="py-3 px-2 text-center"><span className="text-red-500">✗</span></td>
              <td className="py-3 px-2 text-center"><span className="text-red-500">✗</span></td>
            </tr>
            <tr>
              <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{t('sendMessage')}</td>
              <td className="py-3 px-2 text-center"><span className="text-green-500">✓</span></td>
              <td className="py-3 px-2 text-center"><span className="text-green-500">✓</span></td>
              <td className="py-3 px-2 text-center"><span className="text-green-500">✓</span></td>
              <td className="py-3 px-2 text-center"><span className="text-green-500">✓</span></td>
              <td className="py-3 px-2 text-center"><span className="text-green-500">✓</span></td>
            </tr>
            <tr>
              <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{t('editMessage')}</td>
              <td className="py-3 px-2 text-center"><span className="text-green-500">✓</span></td>
              <td className="py-3 px-2 text-center"><span className="text-green-500">✓</span></td>
              <td className="py-3 px-2 text-center"><span className="text-green-500">✓</span></td>
              <td className="py-3 px-2 text-center"><span className="text-green-500">✓</span></td>
              <td className="py-3 px-2 text-center"><span className="text-red-500">✗</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 权限不足提示 */}
      {!isOwner && (
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <Lock className="w-4 h-4" />
          <span>{t('ownerOnly')}</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 子组件：通知设置标签页
// ============================================================================

interface NotificationsTabProps {
  room: Room;
  currentUserId: string;
  isLoading: boolean;
}

const NotificationsTab: React.FC<NotificationsTabProps> = ({
  room,
  currentUserId,
  isLoading,
}) => {
  const t = useTranslations('room.settings.notifications');

  const [messageNotifications, setMessageNotifications] = useState(true);
  const [memberNotifications, setMemberNotifications] = useState(true);
  const [mentionNotifications, setMentionNotifications] = useState(true);

  return (
    <div className="space-y-6">
      {/* 通知说明 */}
      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t('notificationDesc')}
        </p>
      </div>

      {/* 通知开关 */}
      <div className="space-y-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t('messageNotifications')}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {t('messageNotificationsDesc')}
            </div>
          </div>
          <input
            type="checkbox"
            checked={messageNotifications}
            onChange={(e) => setMessageNotifications(e.target.checked)}
            disabled={isLoading}
            className="w-5 h-5 text-blue-600 border-zinc-300 rounded focus:ring-blue-500 disabled:opacity-50"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t('memberNotifications')}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {t('memberNotificationsDesc')}
            </div>
          </div>
          <input
            type="checkbox"
            checked={memberNotifications}
            onChange={(e) => setMemberNotifications(e.target.checked)}
            disabled={isLoading}
            className="w-5 h-5 text-blue-600 border-zinc-300 rounded focus:ring-blue-500 disabled:opacity-50"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t('mentionNotifications')}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {t('mentionNotificationsDesc')}
            </div>
          </div>
          <input
            type="checkbox"
            checked={mentionNotifications}
            onChange={(e) => setMentionNotifications(e.target.checked)}
            disabled={isLoading}
            className="w-5 h-5 text-blue-600 border-zinc-300 rounded focus:ring-blue-500 disabled:opacity-50"
          />
        </label>
      </div>
    </div>
  );
};

// ============================================================================
// 主组件
// ============================================================================

export const RoomSettingsPanel: React.FC<RoomSettingsPanelProps> = ({
  room,
  currentUserId,
  currentUserRole,
  onUpdateRoom,
  onUpdateConfig,
  onDestroyRoom,
  isLoading = false,
  className = '',
}) => {
  const t = useTranslations('room.settings');
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!room) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <Settings className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
        <p className="text-zinc-500 dark:text-zinc-400">{t('noRoomSelected')}</p>
      </div>
    );
  }

  const isOwner = currentUserRole === 'owner';

  const handleDeleteRoom = async () => {
    if (onDestroyRoom) {
      await onDestroyRoom();
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className={cn('bg-white dark:bg-zinc-900 rounded-xl shadow-lg overflow-hidden', className)}>
      {/* 标签页导航 */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={isLoading}
              className={`
                flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap
                transition-colors duration-200
                ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }
                disabled:opacity-50
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 标签页内容 */}
      <div className="p-6">
        {activeTab === 'general' && (
          <GeneralTab
            room={room}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onUpdateRoom={onUpdateRoom}
            onUpdateConfig={onUpdateConfig}
            isLoading={isLoading}
          />
        )}
        {activeTab === 'members' && (
          <MembersTab
            room={room}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            isLoading={isLoading}
          />
        )}
        {activeTab === 'permissions' && (
          <PermissionsTab
            room={room}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            isLoading={isLoading}
          />
        )}
        {activeTab === 'notifications' && (
          <NotificationsTab
            room={room}
            currentUserId={currentUserId}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* 危险区域 */}
      {isOwner && onDestroyRoom && (
        <div className="p-6 border-t border-zinc-200 dark:border-zinc-700 bg-red-50/50 dark:bg-red-900/10">
          <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
            {t('dangerZone')}
          </h4>
          <p className="text-sm text-red-500 dark:text-red-400 mb-4">
            {t('dangerZoneDesc')}
          </p>

          {!showDeleteConfirm ? (
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4" />
              {t('deleteRoom')}
            </Button>
          ) : (
            <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-800">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="font-medium text-red-700 dark:text-red-300">
                  {t('confirmDelete')}
                </span>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                {t('confirmDeleteDesc')}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="danger"
                  onClick={handleDeleteRoom}
                  disabled={isLoading}
                  loading={isLoading}
                >
                  {t('confirmDeleteButton')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isLoading}
                >
                  {t('cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomSettingsPanel;
