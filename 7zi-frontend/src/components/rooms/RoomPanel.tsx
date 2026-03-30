/**
 * Room Panel Component
 *
 * Room details panel with participants list, permissions management, and settings
 *
 * Features:
 * - Room info header with status
 * - Participants list with roles
 * - Permission management UI (for owners/admins)
 * - Room settings management
 * - Dark/light mode support
 * - Responsive design
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useRoomStore } from '@/stores/room-store';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { RoomStatusIndicator } from './RoomStatusIndicator';
import { InviteCard } from './RoomInvite';
import type { Room, RoomMember, RoomMemberRole, RoomSettings } from '@/types/rooms';

export interface RoomPanelProps {
  /** Room to display */
  room: Room;
  /** Current user ID */
  currentUserId: string;
  /** Additional CSS classes */
  className?: string;
  /** Show compact mode */
  compact?: boolean;
  /** Close panel callback */
  onClose?: () => void;
}

/**
 * Role badge colors
 */
const roleColors: Record<RoomMemberRole, string> = {
  owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  member: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

/**
 * Role icons
 */
const roleIcons: Record<RoomMemberRole, string> = {
  owner: '👑',
  admin: '🛡️',
  member: '👤',
};

/**
 * Check if user can manage permissions
 */
function canManagePermissions(currentRole: RoomMemberRole, targetRole: RoomMemberRole): boolean {
  if (currentRole === 'owner') return targetRole !== 'owner';
  if (currentRole === 'admin') return targetRole === 'member';
  return false;
}

/**
 * Check if user can edit settings
 */
function canEditSettings(role: RoomMemberRole): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Room Panel Component
 */
export function RoomPanel({
  room,
  currentUserId,
  className,
  compact = false,
  onClose,
}: RoomPanelProps) {
  const { t } = useTranslation('rooms');
  const { updateRoom, removeMember, updateMember } = useRoomStore();

  const [activeTab, setActiveTab] = useState<'participants' | 'settings' | 'invite'>('participants');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<RoomMember | null>(null);
  const [settingsForm, setSettingsForm] = useState<RoomSettings>({
    name: room.name,
    description: room.description,
    password: '',
    maxMembers: undefined,
    isPublic: true,
  });

  // Get current user's role
  const currentUserMember = room.members.find((m) => m.id === currentUserId);
  const currentUserRole: RoomMemberRole = currentUserMember?.role || 'member';

  // Separate online and offline members
  const { onlineMembers, offlineMembers } = useMemo(() => {
    const online: RoomMember[] = [];
    const offline: RoomMember[] = [];

    room.members.forEach((member) => {
      if (member.isOnline) {
        online.push(member);
      } else {
        offline.push(member);
      }
    });

    return { onlineMembers: online, offlineMembers: offline };
  }, [room.members]);

  // Update settings handler
  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/rooms/${room.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });

      if (!response.ok) throw new Error('Failed to update settings');

      updateRoom(room.id, settingsForm);
      setShowSettingsModal(false);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  // Change member role handler
  const handleChangeRole = async (memberId: string, newRole: RoomMemberRole) => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/rooms/${room.id}/members/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) throw new Error('Failed to change role');

      updateMember(room.id, memberId, { role: newRole });
      setShowPermissionsModal(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  };

  // Kick member handler
  const handleKickMember = async (memberId: string) => {
    if (!confirm(t('kickConfirm'))) return;

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/rooms/${room.id}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to kick member');

      removeMember(room.id, memberId);
    } catch (error) {
      console.error('Failed to kick member:', error);
    }
  };

  // Format time
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={clsx('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {room.name}
            </h3>
            {room.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {room.description}
              </p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              type="button"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Row */}
        <div className="flex items-center gap-3 mt-3">
          <RoomStatusIndicator
            status="connected"
            onlineCount={room.onlineCount}
            totalCount={room.memberCount}
            size="sm"
            showDetails
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('createdAt')}: {formatTime(room.createdAt)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      {!compact && (
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(['participants', 'settings', 'invite'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
              type="button"
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Participants Tab */}
        {activeTab === 'participants' && (
          <div className="p-4 space-y-4">
            {/* Online Members */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('online')} ({onlineMembers.length})
              </h4>
              <div className="space-y-2">
                {onlineMembers.map((member) => (
                  <MemberItem
                    key={member.id}
                    member={member}
                    isCurrentUser={member.id === currentUserId}
                    canManage={canManagePermissions(currentUserRole, member.role)}
                    onChangeRole={() => {
                      setSelectedMember(member);
                      setShowPermissionsModal(true);
                    }}
                    onKick={() => handleKickMember(member.id)}
                  />
                ))}
              </div>
            </div>

            {/* Offline Members */}
            {offlineMembers.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('offline')} ({offlineMembers.length})
                </h4>
                <div className="space-y-2 opacity-60">
                  {offlineMembers.map((member) => (
                    <MemberItem
                      key={member.id}
                      member={member}
                      isCurrentUser={member.id === currentUserId}
                      canManage={canManagePermissions(currentUserRole, member.role)}
                      onChangeRole={() => {
                        setSelectedMember(member);
                        setShowPermissionsModal(true);
                      }}
                      onKick={() => handleKickMember(member.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="p-4 space-y-4">
            {canEditSettings(currentUserRole) ? (
              <>
                {/* Room Info */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('roomInfo')}
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        {t('roomName')}
                      </label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{room.name}</p>
                    </div>
                    {room.description && (
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">
                          {t('roomDescription')}
                        </label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">{room.description}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">
                        {t('owner')}
                      </label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{room.ownerName}</p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowSettingsModal(true)}
                  className="w-full"
                >
                  {t('editSettings')}
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t('noPermission')}
              </div>
            )}
          </div>
        )}

        {/* Invite Tab */}
        {activeTab === 'invite' && (
          <div className="p-4">
            <InviteCard inviteCode={room.inviteCode} />
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title={t('editSettings')}
      >
        <form onSubmit={handleUpdateSettings} className="space-y-4">
          <Input
            label={t('roomName')}
            value={settingsForm.name}
            onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('roomDescription')}
            </label>
            <textarea
              value={settingsForm.description}
              onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              rows={3}
            />
          </div>

          <Input
            label={t('newPassword')}
            type="password"
            placeholder={t('placeholder.leaveEmptyToRemove')}
            value={settingsForm.password}
            onChange={(e) => setSettingsForm({ ...settingsForm, password: e.target.value })}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={settingsForm.isPublic}
              onChange={(e) => setSettingsForm({ ...settingsForm, isPublic: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="isPublic" className="text-sm text-gray-700 dark:text-gray-300">
              {t('isPublic')}
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowSettingsModal(false)} type="button">
              {t('cancel')}
            </Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </Modal>

      {/* Permissions Modal */}
      <Modal
        isOpen={showPermissionsModal}
        onClose={() => {
          setShowPermissionsModal(false);
          setSelectedMember(null);
        }}
        title={t('managePermissions')}
      >
        {selectedMember && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                {selectedMember.avatar ? (
                  <img src={selectedMember.avatar} alt="" className="w-full h-full rounded-full" />
                ) : (
                  <span>👤</span>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedMember.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('currentRole')}: {t(`roles.${selectedMember.role}`)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('changeRole')}
              </label>
              <div className="space-y-2">
                {(['admin', 'member'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleChangeRole(selectedMember.id, role)}
                    disabled={selectedMember.role === role}
                    className={clsx(
                      'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors',
                      selectedMember.role === role
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                    )}
                    type="button"
                  >
                    <span>{roleIcons[role]}</span>
                    <span className="flex-1 text-left">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {t(`roles.${role}`)}
                      </span>
                    </span>
                    {selectedMember.role === role && (
                      <span className="text-blue-500">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="ghost"
                onClick={() => {
                  handleKickMember(selectedMember.id);
                  setShowPermissionsModal(false);
                }}
                className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                {t('kickMember')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/**
 * Member Item Component
 */
interface MemberItemProps {
  member: RoomMember;
  isCurrentUser: boolean;
  canManage: boolean;
  onChangeRole: () => void;
  onKick: () => void;
}

function MemberItem({ member, isCurrentUser, canManage, onChangeRole }: MemberItemProps) {
  const { t } = useTranslation('rooms');

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
      {/* Avatar */}
      <div className="relative">
        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
          {member.avatar ? (
            <img src={member.avatar} alt="" className="w-full h-full" />
          ) : (
            <span className="text-sm">👤</span>
          )}
        </div>
        {member.isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {member.name}
          </span>
          {isCurrentUser && (
            <span className="text-xs text-blue-500 font-medium">({t('you')})</span>
          )}
        </div>
        <span className={clsx('text-xs px-1.5 py-0.5 rounded', roleColors[member.role])}>
          {roleIcons[member.role]} {t(`roles.${member.role}`)}
        </span>
      </div>

      {/* Actions */}
      {canManage && !isCurrentUser && (
        <button
          onClick={onChangeRole}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          type="button"
        >
          ⋯
        </button>
      )}
    </div>
  );
}

export default RoomPanel;
