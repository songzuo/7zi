/**
 * Room Detail Panel Component
 *
 * Displays room information, members list, invite options, and settings
 * Admin controls for room management
 *
 * Features:
 * - Room info display (name, description, creator, creation time)
 * - Member list with avatars, roles, online status
 * - Invite functionality (invite link / QR code)
 * - Room settings for admins (rename, password, transfer ownership)
 */

'use client'

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import type { Room, RoomMember, RoomSettings } from '@/types/rooms'
import { useRoomStore } from '@/stores/room-store'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { RoomInvite } from './RoomInvite'

export interface RoomDetailProps {
  /** Room data */
  room: Room
  /** Is current user admin/owner */
  isAdmin?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Room Detail Component
 */
export function RoomDetail({ room, isAdmin = false, className }: RoomDetailProps) {
  const { t } = useTranslation('rooms')
  const { updateRoom, addMember, removeMember, currentUserId } = useRoomStore()

  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'invite' | 'settings'>('info')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)

  const [settingsForm, setSettingsForm] = useState<RoomSettings>({
    name: room.name,
    description: room.description,
    password: '',
  })

  const [transferToId, setTransferToId] = useState('')

  // Format timestamp
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  // Format duration
  const formatDuration = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d`
    if (hours > 0) return `${hours}h`
    if (minutes > 0) return `${minutes}m`
    return 'Just now'
  }

  // Save settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/rooms/${room.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      })

      if (!response.ok) {
        throw new Error(t('messages.error'))
      }

      const updatedRoom = await response.json()

      // Update in store
      updateRoom(room.id, updatedRoom)

      setShowSettingsModal(false)
    } catch (error) {
      console.error('Failed to update room:', error)
    }
  }

  // Transfer ownership
  const handleTransferOwnership = async () => {
    if (!confirm(t('transferConfirm', { name: transferToId }))) return

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/rooms/${room.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId: transferToId }),
      })

      if (!response.ok) {
        throw new Error(t('messages.error'))
      }

      const updatedRoom = await response.json()

      // Update in store
      updateRoom(room.id, updatedRoom)

      setShowTransferModal(false)
      setTransferToId('')
    } catch (error) {
      console.error('Failed to transfer ownership:', error)
    }
  }

  // Delete room
  const handleDeleteRoom = async () => {
    if (!confirm(t('deleteConfirm'))) return

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/rooms/${room.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(t('messages.error'))
      }

      // Navigate back to room list
      window.location.href = '/rooms'
    } catch (error) {
      console.error('Failed to delete room:', error)
    }
  }

  // Member role badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            👑 {role}
          </span>
        )
      case 'admin':
        return (
          <span className="inline-flex items-center rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
            🛡️ {role}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            👤 {role}
          </span>
        )
    }
  }

  // Tab type
  type TabId = 'info' | 'members' | 'invite' | 'settings'

  // Tabs
  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'info', label: t('details') },
    { id: 'members', label: `${t('members')} (${room.memberCount})` },
    { id: 'invite', label: t('invite') },
    ...(isAdmin ? [{ id: 'settings' as const, label: t('settings') }] : []),
  ]

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Room Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {room.name}
            </h1>
            {room.description && (
              <p className="text-gray-600 dark:text-gray-400">{room.description}</p>
            )}
          </div>

          {room.password && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              🔒 {t('roomPassword')}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">👑</span>
            <span>
              {t('creator')}: {room.ownerName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">📅</span>
            <span>
              {t('createdAt')}: {formatDate(room.createdAt)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">⏱️</span>
            <span>
              {t('lastActivity')}: {formatDuration(room.lastActivityAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              )}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-900/50">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {room.memberCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('members')}</div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-900/50">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {room.onlineCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('online')}</div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-900/50">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {room.members.filter(m => m.role === 'admin').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Admins</div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-900/50">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatDuration(room.createdAt)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Age</div>
              </div>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-2">
            {room.members.length === 0 ? (
              <p className="py-8 text-center text-gray-500 dark:text-gray-400">No members yet</p>
            ) : (
              room.members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        'flex h-10 w-10 items-center justify-center rounded-full font-medium text-white',
                        member.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      )}
                    >
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        member.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {member.name}
                        </span>
                        {getRoleBadge(member.role)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {member.isOnline
                          ? 'Online'
                          : `Last seen: ${formatDuration(member.lastActiveAt)}`}
                      </div>
                    </div>
                  </div>

                  {isAdmin && member.id !== currentUserId && member.role !== 'owner' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeMember(room.id, member.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Invite Tab */}
        {activeTab === 'invite' && (
          <div>
            <div className="mb-4">
              <Button variant="primary" onClick={() => setShowInviteModal(true)}>
                Show Invite Options
              </Button>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-gray-400">📋</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quick Copy
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white px-3 py-2 font-mono text-sm dark:bg-gray-900">
                  {room.inviteCode}
                </code>
                <Button variant="outline" size="sm">
                  Copy
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab (Admin Only) */}
        {activeTab === 'settings' && isAdmin && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Button variant="outline" onClick={() => setShowSettingsModal(true)}>
                {t('rename')}
              </Button>

              <Button variant="outline" onClick={() => setShowSettingsModal(true)}>
                {t('changePassword')}
              </Button>

              <Button variant="outline" onClick={() => setShowTransferModal(true)}>
                {t('transferOwnership')}
              </Button>

              <Button variant="danger" onClick={handleDeleteRoom}>
                {t('delete')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title={t('invite')}>
        <RoomInvite inviteCode={room.inviteCode} />
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title={t('settings')}
      >
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <Input
            label={t('roomName')}
            value={settingsForm.name}
            onChange={e => setSettingsForm({ ...settingsForm, name: e.target.value })}
            required
          />

          <Input
            label={t('roomDescription')}
            value={settingsForm.description}
            onChange={e => setSettingsForm({ ...settingsForm, description: e.target.value })}
          />

          <Input
            label={t('roomPassword')}
            type="password"
            placeholder={t('placeholder.enterPassword')}
            value={settingsForm.password}
            onChange={e => setSettingsForm({ ...settingsForm, password: e.target.value })}
          />

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowSettingsModal(false)} type="button">
              {t('cancel')}
            </Button>
            <Button type="submit">{t('save')}</Button>
          </div>
        </form>
      </Modal>

      {/* Transfer Ownership Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title={t('transferOwnership')}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('transferTo')}
            </label>
            <select
              value={transferToId}
              onChange={e => setTransferToId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">Select member...</option>
              {room.members
                .filter(m => m.role !== 'owner' && m.id !== currentUserId)
                .map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.role})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowTransferModal(false)} type="button">
              {t('cancel')}
            </Button>
            <Button variant="primary" onClick={handleTransferOwnership} disabled={!transferToId}>
              {t('confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default RoomDetail
