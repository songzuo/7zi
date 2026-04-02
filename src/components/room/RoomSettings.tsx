/**
 * RoomSettings Component
 *
 * Room settings panel for managing room configuration, permissions, and members
 */

'use client'

import { useState, useCallback } from 'react'
import type {
  Room,
  RoomConfig,
  RoomVisibility,
  RoomType,
  RoomParticipant,
  UserRole,
} from '@/lib/websocket/rooms'

// ============================================================================
// Types
// ============================================================================

export interface RoomSettingsProps {
  room: Room
  currentUserId: string | null
  canManage: boolean
  onUpdateConfig: (roomId: string, config: Partial<RoomConfig>) => void
  onChangeVisibility: (roomId: string, visibility: RoomVisibility) => void
  onChangeRole: (roomId: string, userId: string, newRole: UserRole) => void
  onKickUser: (roomId: string, userId: string) => void
  onBanUser: (roomId: string, userId: string) => void
  onUnbanUser: (roomId: string, userId: string) => void
  onDestroyRoom: (roomId: string) => void
  onClose: () => void
  bannedUsers?: string[] // Array of banned user IDs
}

// ============================================================================
// Tab Component
// ============================================================================

interface TabProps {
  activeTab: string
  onChange: (tab: string) => void
}

function Tabs({ activeTab, onChange }: TabProps) {
  const tabs = [
    { id: 'general', label: '通用设置', icon: '⚙️' },
    { id: 'permissions', label: '权限管理', icon: '🔐' },
    { id: 'members', label: '成员管理', icon: '👥' },
    { id: 'danger', label: '危险区域', icon: '⚠️' },
  ]

  return (
    <div className="mb-4 flex border-b border-gray-200 dark:border-gray-700">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          } `}
        >
          <span className="mr-1">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// General Settings Tab
// ============================================================================

interface GeneralSettingsProps {
  room: Room
  canManage: boolean
  onUpdateConfig: (config: Partial<RoomConfig>) => void
  onChangeVisibility: (visibility: RoomVisibility) => void
}

function GeneralSettings({
  room,
  canManage,
  onUpdateConfig,
  onChangeVisibility,
}: GeneralSettingsProps) {
  const [roomName, setRoomName] = useState(room.name)
  const [maxParticipants, setMaxParticipants] = useState(room.config.maxParticipants || 100)
  const [autoCleanup, setAutoCleanup] = useState(room.config.autoCleanupMinutes || 0)
  const [allowGuests, setAllowGuests] = useState(room.config.allowGuests || false)
  const [messageHistory, setMessageHistory] = useState(room.config.messageHistoryEnabled || true)

  const handleSaveName = () => {
    // TODO: Need to add a callback to update room metadata, not just config
    // if (roomName !== room.name && canManage) {
    //   onUpdateConfig({ metadata: { ...room.metadata, name: roomName } });
    // }
    console.debug('Room name update not yet implemented:', roomName)
  }

  return (
    <div className="space-y-6">
      {/* Room Name */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          房间名称
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            name="roomName"
            data-testid="room-name-input"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            disabled={!canManage}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          {canManage && roomName !== room.name && (
            <button
              onClick={handleSaveName}
              className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              保存
            </button>
          )}
        </div>
      </div>

      {/* Visibility */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          可见性
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'public' as RoomVisibility, label: '🌐 公开', desc: '任何人可加入' },
            { value: 'private' as RoomVisibility, label: '🔒 私有', desc: '仅受邀用户' },
            { value: 'invite-only' as RoomVisibility, label: '✉️ 仅邀请', desc: '仅邀请码' },
          ].map(option => (
            <button
              key={option.value}
              data-testid={`visibility-${option.value}`}
              onClick={() => canManage && onChangeVisibility(option.value)}
              disabled={!canManage}
              className={`rounded-lg p-3 text-sm transition-all ${
                room.visibility === option.value
                  ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <div className="mb-1 font-medium">{option.label}</div>
              <div className="text-xs opacity-80">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Max Participants */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          最大参与人数: {maxParticipants}
        </label>
        <input
          type="range"
          name="maxParticipants"
          data-testid="max-participants-input"
          min="2"
          max="500"
          value={maxParticipants}
          onChange={e => setMaxParticipants(Number(e.target.value))}
          disabled={!canManage}
          onMouseUp={() => canManage && onUpdateConfig({ maxParticipants })}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>2</span>
          <span>100</span>
          <span>200</span>
          <span>500</span>
        </div>
      </div>

      {/* Auto Cleanup */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          空房间自动清理: {autoCleanup === 0 ? '永不' : `${autoCleanup} 分钟`}
        </label>
        <input
          type="range"
          min="0"
          max="120"
          step="5"
          value={autoCleanup}
          onChange={e => setAutoCleanup(Number(e.target.value))}
          disabled={!canManage}
          onMouseUp={() => canManage && onUpdateConfig({ autoCleanupMinutes: autoCleanup })}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700"
        />
        <div className="mt-1 flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>永不</span>
          <span>30 分钟</span>
          <span>60 分钟</span>
          <span>120 分钟</span>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">允许访客</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">未登录用户可以查看房间</div>
          </div>
          <button
            name="allowGuests"
            data-testid="toggle-allow-guests"
            onClick={() => canManage && onUpdateConfig({ allowGuests: !allowGuests })}
            disabled={!canManage}
            className={`relative h-6 w-12 rounded-full transition-colors ${allowGuests ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <div
              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${allowGuests ? 'left-7' : 'left-1'} `}
            />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">消息历史</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">保存和显示历史消息</div>
          </div>
          <button
            onClick={() => canManage && onUpdateConfig({ messageHistoryEnabled: !messageHistory })}
            disabled={!canManage}
            className={`relative h-6 w-12 rounded-full transition-colors ${messageHistory ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <div
              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${messageHistory ? 'left-7' : 'left-1'} `}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Permissions Tab
// ============================================================================

interface PermissionsProps {
  room: Room
  canManage: boolean
  onToggleEnforce: (enforce: boolean) => void
}

function Permissions({ room, canManage, onToggleEnforce }: PermissionsProps) {
  const permissions = [
    { key: 'room:manage', label: '管理房间', desc: '修改房间设置' },
    { key: 'room:invite', label: '邀请用户', desc: '邀请新用户加入' },
    { key: 'room:kick', label: '踢出用户', desc: '移除房间成员' },
    { key: 'room:ban', label: '封禁用户', desc: '禁止用户再次加入' },
    { key: 'message:send', label: '发送消息', desc: '在房间中发送消息' },
    { key: 'message:edit', label: '编辑消息', desc: '编辑已发送的消息' },
    { key: 'message:delete', label: '删除消息', desc: '删除已发送的消息' },
    { key: 'message:pin', label: '置顶消息', desc: '置顶重要消息' },
  ]

  const roles: UserRole[] = ['owner', 'admin', 'member', 'guest']

  return (
    <div className="space-y-4">
      {/* Permission Enforcement */}
      <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">启用权限检查</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">根据用户角色限制操作权限</div>
        </div>
        <button
          onClick={() => canManage && onToggleEnforce(!room.config.enforcePermissions)}
          disabled={!canManage}
          className={`relative h-6 w-12 rounded-full transition-colors ${room.config.enforcePermissions ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <div
            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${room.config.enforcePermissions ? 'left-7' : 'left-1'} `}
          />
        </button>
      </div>

      {/* Permission Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="p-2 text-left font-medium text-gray-700 dark:text-gray-300">权限</th>
              {roles.map(role => (
                <th
                  key={role}
                  className="p-2 text-center font-medium text-gray-700 dark:text-gray-300"
                >
                  {role === 'owner'
                    ? '所有者'
                    : role === 'admin'
                      ? '管理员'
                      : role === 'member'
                        ? '成员'
                        : '访客'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map(perm => (
              <tr key={perm.key} className="border-b border-gray-200 dark:border-gray-700">
                <td className="p-2">
                  <div className="text-gray-900 dark:text-gray-100">{perm.label}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{perm.desc}</div>
                </td>
                {roles.map(role => {
                  // Simple permission check logic
                  const hasPermission =
                    role === 'owner' ||
                    (role === 'admin' && !perm.key.includes('room:manage')) ||
                    (role === 'member' && ['message:send', 'message:edit'].includes(perm.key))

                  return (
                    <td key={role} className="p-2 text-center">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${hasPermission ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}
                      >
                        {hasPermission ? '✓' : '✗'}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================================
// Members Tab
// ============================================================================

interface MembersProps {
  room: Room
  currentUserId: string | null
  canManage: boolean
  participants: RoomParticipant[]
  bannedUsers?: string[]
  onChangeRole: (userId: string, newRole: UserRole) => void
  onKickUser: (userId: string) => void
  onBanUser: (userId: string) => void
  onUnbanUser: (userId: string) => void
}

function Members({
  room,
  currentUserId,
  canManage,
  participants,
  bannedUsers = [],
  onChangeRole,
  onKickUser,
  onBanUser,
  onUnbanUser,
}: MembersProps) {
  const [showBanned, setShowBanned] = useState(false)
  const roles: UserRole[] = ['owner', 'admin', 'member', 'guest']

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowBanned(false)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            !showBanned
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          } `}
        >
          成员 ({participants.length})
        </button>
        <button
          onClick={() => setShowBanned(true)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            showBanned
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          } `}
        >
          已封禁 ({bannedUsers.length})
        </button>
      </div>

      {!showBanned ? (
        /* Members List */
        <div className="space-y-2">
          {participants.map(participant => (
            <div
              key={participant.id}
              className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
            >
              {/* Avatar */}
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-semibold text-white"
                style={{ backgroundColor: participant.color }}
              >
                {participant.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                    {participant.name}
                  </span>
                  {participant.id === currentUserId && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">(你)</span>
                  )}
                  {participant.id === room.ownerId && (
                    <span className="rounded bg-yellow-100 px-1.5 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                      所有者
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span
                    className={`h-2 w-2 rounded-full ${participant.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
                  />
                  <span>{participant.isOnline ? '在线' : '离线'}</span>
                  <span>•</span>
                  <span>加入于 {new Date(participant.joinedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              {canManage && participant.id !== room.ownerId && participant.id !== currentUserId && (
                <div className="flex gap-2">
                  <select
                    value={participant.role}
                    onChange={e => onChangeRole(participant.id, e.target.value as UserRole)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>
                        {role === 'owner'
                          ? '所有者'
                          : role === 'admin'
                            ? '管理员'
                            : role === 'member'
                              ? '成员'
                              : '访客'}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => onKickUser(participant.id)}
                    className="rounded p-1.5 text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    title="踢出"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => onBanUser(participant.id)}
                    className="rounded p-1.5 text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    title="封禁"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Banned Users List */
        <div className="space-y-2">
          {bannedUsers.length === 0 ? (
            <div className="py-8 text-center text-gray-600 dark:text-gray-400">
              暂无被封禁的用户
            </div>
          ) : (
            bannedUsers.map(userId => (
              <div
                key={userId}
                className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
              >
                <span className="text-sm text-gray-900 dark:text-gray-100">{userId}</span>
                <button
                  onClick={() => onUnbanUser(userId)}
                  className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
                >
                  解封
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Danger Zone Tab
// ============================================================================

interface DangerZoneProps {
  room: Room
  canManage: boolean
  onDestroyRoom: () => void
}

function DangerZone({ room, canManage, onDestroyRoom }: DangerZoneProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = () => {
    if (confirmDelete) {
      onDestroyRoom()
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <h3 className="mb-2 text-lg font-semibold text-red-900 dark:text-red-400">危险区域</h3>
        <p className="mb-4 text-sm text-red-700 dark:text-red-300">以下操作不可逆，请谨慎操作</p>

        {/* Delete Room */}
        <div className="border-t border-red-200 pt-4 dark:border-red-800">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h4 className="font-medium text-red-900 dark:text-red-400">删除房间</h4>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                永久删除房间及其所有消息和设置
              </p>
            </div>
            {canManage ? (
              <button
                onClick={handleDelete}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  confirmDelete
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/40'
                } `}
              >
                {confirmDelete ? '确认删除' : '删除房间'}
              </button>
            ) : (
              <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                仅所有者可操作
              </span>
            )}
          </div>
          {confirmDelete && (
            <div className="mt-3 text-xs text-red-600 dark:text-red-400">
              此操作将删除房间 "{room.name}"，所有消息和数据将永久丢失
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main RoomSettings Component
// ============================================================================

export function RoomSettings({
  room,
  currentUserId,
  canManage,
  onUpdateConfig,
  onChangeVisibility,
  onChangeRole,
  onKickUser,
  onBanUser,
  onUnbanUser,
  onDestroyRoom,
  onClose,
  bannedUsers,
}: RoomSettingsProps) {
  const [activeTab, setActiveTab] = useState('general')
  const participants = Array.from(room.participants.values())

  const isOwner = room.ownerId === currentUserId

  return (
    <div data-testid="room-settings" className="flex h-full flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">房间设置</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{room.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'general' && (
          <GeneralSettings
            room={room}
            canManage={canManage}
            onUpdateConfig={config => onUpdateConfig(room.id, config)}
            onChangeVisibility={visibility => onChangeVisibility(room.id, visibility)}
          />
        )}

        {activeTab === 'permissions' && (
          <Permissions
            room={room}
            canManage={canManage}
            onToggleEnforce={enforce => onUpdateConfig(room.id, { enforcePermissions: enforce })}
          />
        )}

        {activeTab === 'members' && (
          <Members
            room={room}
            currentUserId={currentUserId}
            canManage={canManage}
            participants={participants}
            bannedUsers={bannedUsers}
            onChangeRole={(userId, role) => onChangeRole(room.id, userId, role)}
            onKickUser={userId => onKickUser(room.id, userId)}
            onBanUser={userId => onBanUser(room.id, userId)}
            onUnbanUser={userId => onUnbanUser(room.id, userId)}
          />
        )}

        {activeTab === 'danger' && (
          <DangerZone
            room={room}
            canManage={isOwner}
            onDestroyRoom={() => onDestroyRoom(room.id)}
          />
        )}
      </div>
    </div>
  )
}

export default RoomSettings
