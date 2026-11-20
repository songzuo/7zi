/**
 * RoomList Component
 *
 * Displays list of WebSocket rooms with search, filter, and create functionality
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import { useWebSocketStore } from './websocket-store'
import type { Room, RoomType, RoomVisibility } from '@/lib/websocket/rooms'

// ============================================================================
// Room Type Icons
// ============================================================================

const ROOM_TYPE_ICONS: Record<RoomType, string> = {
  task: '📋',
  project: '📁',
  chat: '💬',
  document: '📄',
  voice: '🎤',
  video: '📹',
}

const ROOM_VISIBILITY_ICONS: Record<RoomVisibility, string> = {
  public: '🌐',
  private: '🔒',
  'invite-only': '✉️',
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatMemberCount(count: number): string {
  if (count === 0) return '空房间'
  if (count === 1) return '1 人'
  return `${count} 人`
}

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-CN')
}

function getRoomMemberCount(room: Room): number {
  return room.participants?.size || 0
}

function isRoomOwner(room: Room, userId: string | null): boolean {
  return room.ownerId === userId
}

// ============================================================================
// Room Card Component
// ============================================================================

interface RoomCardProps {
  room: Room
  isSelected: boolean
  currentUserId: string | null
  onSelect: (roomId: string) => void
  onLeave: (roomId: string) => void
}

function RoomCard({ room, isSelected, currentUserId, onSelect, onLeave }: RoomCardProps) {
  const [showActions, setShowActions] = useState(false)
  const isOwner = isRoomOwner(room, currentUserId)
  const memberCount = getRoomMemberCount(room)

  return (
    <div
      className={`relative cursor-pointer rounded-lg p-3 transition-all duration-200 ${
        isSelected
          ? 'border-2 border-blue-500 bg-blue-100 dark:border-blue-400 dark:bg-blue-900/30'
          : 'border border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
      } `}
      onClick={() => onSelect(room.id)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Room Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{ROOM_TYPE_ICONS[room.type]}</span>
          <h3 className="max-w-[180px] truncate font-medium text-gray-900 dark:text-gray-100">
            {room.name}
          </h3>
        </div>
        <span className="text-sm">{ROOM_VISIBILITY_ICONS[room.visibility]}</span>
      </div>

      {/* Room Info */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>{formatMemberCount(memberCount)}</span>
        <span>{formatDate(room.lastActivity)}</span>
      </div>

      {/* Quick Actions */}
      {showActions && !isOwner && (
        <button
          className="absolute top-2 right-2 rounded bg-red-500 px-2 py-1 text-xs text-white transition-colors hover:bg-red-600"
          onClick={e => {
            e.stopPropagation()
            onLeave(room.id)
          }}
        >
          离开
        </button>
      )}

      {/* Owner Badge */}
      {isOwner && (
        <div className="absolute top-2 right-2">
          <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            管理员
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Create Room Modal
// ============================================================================

interface CreateRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (options: { name: string; type: RoomType; visibility: RoomVisibility }) => void
}

function CreateRoomModal({ isOpen, onClose, onCreate }: CreateRoomModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<RoomType>('chat')
  const [visibility, setVisibility] = useState<RoomVisibility>('public')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onCreate({ name: name.trim(), type, visibility })
      setName('')
      setType('chat')
      setVisibility('public')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">创建新房间</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              房间名称
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入房间名称..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              autoFocus
            />
          </div>

          {/* Room Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              房间类型
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['chat', 'task', 'project'] as RoomType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    type === t
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  } `}
                >
                  {ROOM_TYPE_ICONS[t]} {t === 'chat' ? '聊天' : t === 'task' ? '任务' : '项目'}
                </button>
              ))}
            </div>
          </div>

          {/* Room Visibility */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              可见性
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['public', 'private', 'invite-only'] as RoomVisibility[]).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    visibility === v
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  } `}
                >
                  {ROOM_VISIBILITY_ICONS[v]}{' '}
                  {v === 'public' ? '公开' : v === 'private' ? '私有' : '邀请'}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// RoomList Component
// ============================================================================

export interface RoomListProps {
  onCreateRoom?: (options: { name: string; type: RoomType; visibility: RoomVisibility }) => void
  onSelectRoom?: (roomId: string) => void
  onLeaveRoom?: (roomId: string) => void
}

export function RoomList({ onCreateRoom, onSelectRoom, onLeaveRoom }: RoomListProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)

  const {
    rooms,
    currentRoomId,
    currentUserId,
    roomsLoading,
    roomsError,
    searchQuery,
    filterType,
    filterVisibility,
    setSearchQuery,
    setFilterType,
    setFilterVisibility,
    setCurrentRoom,
  } = useWebSocketStore()

  // Filter rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!room.name.toLowerCase().includes(query) && !room.id.toLowerCase().includes(query)) {
          return false
        }
      }

      // Type filter
      if (filterType !== 'all' && room.type !== filterType) {
        return false
      }

      // Visibility filter
      if (filterVisibility !== 'all' && room.visibility !== filterVisibility) {
        return false
      }

      return true
    })
  }, [rooms, searchQuery, filterType, filterVisibility])

  // Handlers
  const handleSelectRoom = useCallback(
    (roomId: string) => {
      setCurrentRoom(roomId)
      onSelectRoom?.(roomId)
    },
    [setCurrentRoom, onSelectRoom]
  )

  const handleLeaveRoom = useCallback(
    (roomId: string) => {
      // In real app, this would call the WebSocket API
      onLeaveRoom?.(roomId)
    },
    [onLeaveRoom]
  )

  const handleCreateRoom = useCallback(
    (options: { name: string; type: RoomType; visibility: RoomVisibility }) => {
      // In real app, this would call the WebSocket API
      onCreateRoom?.(options)
    },
    [onCreateRoom]
  )

  // Loading state
  if (roomsLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    )
  }

  // Error state
  if (roomsError) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <span className="mb-4 text-4xl">⚠️</span>
        <p className="text-gray-600 dark:text-gray-400">{roomsError}</p>
        <button
          className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
          onClick={() => window.location.reload()}
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">房间列表</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            <span>+</span>
            <span>创建房间</span>
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索房间..."
          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />

        {/* Filters */}
        <div className="mt-3 flex gap-2">
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as RoomType | 'all')}
            className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="all">全部类型</option>
            <option value="chat">💬 聊天</option>
            <option value="task">📋 任务</option>
            <option value="project">📁 项目</option>
            <option value="document">📄 文档</option>
            <option value="voice">🎤 语音</option>
            <option value="video">📹 视频</option>
          </select>

          {/* Visibility Filter */}
          <select
            value={filterVisibility}
            onChange={e => setFilterVisibility(e.target.value as RoomVisibility | 'all')}
            className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="all">全部可见性</option>
            <option value="public">🌐 公开</option>
            <option value="private">🔒 私有</option>
            <option value="invite-only">✉️ 仅邀请</option>
          </select>
        </div>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredRooms.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="mb-4 text-4xl">🏠</span>
            <p className="mb-2 text-gray-600 dark:text-gray-400">
              {searchQuery || filterType !== 'all' || filterVisibility !== 'all'
                ? '没有找到匹配的房间'
                : '暂无房间'}
            </p>
            {!searchQuery && filterType === 'all' && filterVisibility === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
              >
                创建第一个房间
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRooms.map(room => (
              <RoomCard
                key={room.id}
                room={room}
                isSelected={room.id === currentRoomId}
                currentUserId={currentUserId}
                onSelect={handleSelectRoom}
                onLeave={handleLeaveRoom}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-gray-200 p-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
        <div className="flex items-center justify-between">
          <span>{filteredRooms.length} 个房间</span>
          <span>{rooms.reduce((sum, r) => sum + getRoomMemberCount(r), 0)} 位成员</span>
        </div>
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateRoom}
      />
    </div>
  )
}

export default RoomList
