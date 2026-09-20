/**
 * RoomManager Component
 *
 * Main room management component integrating RoomList, RoomView, and RoomSettings
 * Handles WebSocket connections and room operations
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import RoomList from '@/lib/websocket/dashboard/RoomList'
import RoomView, { RoomViewProps } from '@/lib/websocket/dashboard/RoomView'
import RoomSettings from './RoomSettings'
import { useWebSocketStore } from '@/lib/websocket/dashboard/websocket-store'
import type {
  Room,
  RoomType,
  RoomVisibility,
  RoomConfig,
  RoomParticipant,
  UserRole,
} from '@/lib/websocket/rooms'

// ============================================================================
// Types
// ============================================================================

export interface RoomManagerProps {
  wsUrl?: string
  userId?: string
  userName?: string
  userAvatar?: string
  autoConnect?: boolean
}

// ============================================================================
// RoomManager Component
// ============================================================================

export function RoomManager({
  wsUrl = 'ws://localhost:3001',
  userId = 'user-' + Math.random().toString(36).substring(7),
  userName = '匿名用户',
  userAvatar,
  autoConnect = true,
}: RoomManagerProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)
  const [bannedUsers] = useState<Set<string>>(new Set())

  const {
    currentRoomId,
    currentUserId,
    currentUserName,
    rooms,
    setCurrentRoom,
    setCurrentUser,
    setRooms,
    addRoom,
    updateRoom,
    removeRoom,
    setRoomsLoading,
    setRoomsError,
  } = useWebSocketStore()

  // Initialize current user
  useEffect(() => {
    setCurrentUser(userId, userName)
  }, [userId, userName, setCurrentUser])

  // Mock WebSocket connection (replace with real implementation)
  useEffect(() => {
    if (!autoConnect) return

    setIsConnecting(true)
    setError(null)

    // Simulate connection
    const connectTimer = setTimeout(() => {
      setIsConnected(true)
      setIsConnecting(false)

      // Load mock rooms
      const mockRooms: Room[] = [
        {
          id: 'room-1',
          name: '项目讨论组',
          type: 'project',
          documentId: 'doc-1',
          visibility: 'public',
          ownerId: userId,
          participants: new Map([
            [
              userId,
              {
                id: userId,
                name: userName,
                avatar: userAvatar,
                color: '#3b82f6',
                role: 'owner',
                joinedAt: new Date(),
                isTyping: false,
                lastActivity: new Date(),
                isOnline: true,
              },
            ],
          ]),
          data: {
            content: '',
            revision: 0,
          },
          config: {
            maxParticipants: 100,
            messageHistoryEnabled: true,
            persistenceEnabled: true,
            autoCleanupMinutes: 30,
            allowGuests: false,
            enforcePermissions: true,
          },
          createdAt: new Date(Date.now() - 86400000),
          updatedAt: new Date(),
          lastActivity: new Date(Date.now() - 3600000),
          invites: new Set(),
        },
        {
          id: 'room-2',
          name: '日常聊天',
          type: 'chat',
          documentId: 'doc-2',
          visibility: 'public',
          ownerId: 'other-user',
          participants: new Map([
            [
              'other-user',
              {
                id: 'other-user',
                name: '张三',
                color: '#f97316',
                role: 'owner',
                joinedAt: new Date(Date.now() - 172800000),
                isTyping: false,
                lastActivity: new Date(),
                isOnline: true,
              },
            ],
            [
              userId,
              {
                id: userId,
                name: userName,
                avatar: userAvatar,
                color: '#3b82f6',
                role: 'member',
                joinedAt: new Date(Date.now() - 86400000),
                isTyping: false,
                lastActivity: new Date(),
                isOnline: true,
              },
            ],
          ]),
          data: {
            content: '',
            revision: 0,
          },
          config: {
            maxParticipants: 50,
            messageHistoryEnabled: true,
            persistenceEnabled: true,
            autoCleanupMinutes: 10,
            allowGuests: true,
            enforcePermissions: true,
          },
          createdAt: new Date(Date.now() - 172800000),
          updatedAt: new Date(),
          lastActivity: new Date(Date.now() - 300000),
          invites: new Set(),
        },
      ]

      setRooms(mockRooms)
    }, 1000)

    return () => {
      clearTimeout(connectTimer)
    }
  }, [autoConnect, userId, userName, userAvatar, setRooms])

  // Check if current user can manage room
  const canManageCurrentRoom = useMemo(() => {
    if (!currentRoomId) return false
    const room = rooms.find(r => r.id === currentRoomId)
    if (!room) return false

    const participant = room.participants.get(userId)
    if (!participant) return false

    return participant.role === 'owner' || participant.role === 'admin'
  }, [currentRoomId, rooms, userId])

  // Get current room
  const currentRoom = useMemo(() => {
    return rooms.find(r => r.id === currentRoomId)
  }, [rooms, currentRoomId])

  // Handlers
  const handleCreateRoom = useCallback(
    (options: { name: string; type: RoomType; visibility: RoomVisibility }) => {
      const newRoomId = 'room-' + Date.now()
      const newRoom: Room = {
        id: newRoomId,
        name: options.name,
        type: options.type,
        documentId: `doc-${newRoomId}`,
        visibility: options.visibility,
        ownerId: userId,
        participants: new Map([
          [
            userId,
            {
              id: userId,
              name: userName,
              avatar: userAvatar,
              color: '#3b82f6',
              role: 'owner',
              joinedAt: new Date(),
              isTyping: false,
              lastActivity: new Date(),
              isOnline: true,
            },
          ],
        ]),
        data: {
          content: '',
          revision: 0,
        },
        config: {
          maxParticipants: 100,
          messageHistoryEnabled: true,
          persistenceEnabled: true,
          autoCleanupMinutes: options.type === 'project' ? 0 : 30,
          allowGuests: options.visibility === 'public',
          enforcePermissions: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date(),
        invites: new Set(),
      }

      addRoom(newRoom)
      setCurrentRoom(newRoomId)
    },
    [addRoom, setCurrentRoom, userId, userName, userAvatar]
  )

  const handleSelectRoom = useCallback(
    (roomId: string) => {
      setCurrentRoom(roomId)
      setShowSettingsPanel(false)
    },
    [setCurrentRoom]
  )

  const handleLeaveRoom = useCallback(
    (roomId: string) => {
      const room = rooms.find(r => r.id === roomId)
      if (!room) return

      if (room.ownerId === userId) {
        alert('作为房主，请先删除房间或转让所有权')
        return
      }

      if (currentRoomId === roomId) {
        setCurrentRoom(null)
        setShowSettingsPanel(false)
      }

      // Remove from participants
      const updatedParticipants = new Map(room.participants)
      updatedParticipants.delete(userId)

      updateRoom(roomId, {
        participants: updatedParticipants,
        updatedAt: new Date(),
      })
    },
    [rooms, userId, currentRoomId, setCurrentRoom, updateRoom]
  )

  const handleSendMessage: RoomViewProps['onSendMessage'] = useCallback(
    (content: string, replyTo?: string) => {
      console.log('Send message:', content, 'reply to:', replyTo)
      // Implement WebSocket message sending
    },
    []
  )

  const handleReactMessage: RoomViewProps['onReactMessage'] = useCallback(
    (messageId: string, emoji: string) => {
      console.debug('React to message:', messageId, 'emoji:', emoji)
      // Implement WebSocket message reaction
    },
    []
  )

  const handleUpdateConfig = useCallback(
    (roomId: string, config: Partial<RoomConfig>) => {
      updateRoom(roomId, {
        config: { ...currentRoom?.config, ...config },
        updatedAt: new Date(),
      })
    },
    [updateRoom, currentRoom?.config]
  )

  const handleChangeVisibility = useCallback(
    (roomId: string, visibility: RoomVisibility) => {
      updateRoom(roomId, {
        visibility,
        updatedAt: new Date(),
      })
    },
    [updateRoom]
  )

  const handleChangeRole = useCallback(
    (roomId: string, targetUserId: string, newRole: UserRole) => {
      const room = rooms.find(r => r.id === roomId)
      if (!room) return

      const participant = room.participants.get(targetUserId)
      if (!participant) return

      const updatedParticipants = new Map(room.participants)
      updatedParticipants.set(targetUserId, {
        ...participant,
        role: newRole,
      })

      updateRoom(roomId, {
        participants: updatedParticipants,
        updatedAt: new Date(),
      })
    },
    [rooms, updateRoom]
  )

  const handleKickUser = useCallback(
    (roomId: string, targetUserId: string) => {
      if (!confirm(`确定要踢出用户吗？`)) return

      const room = rooms.find(r => r.id === roomId)
      if (!room) return

      const updatedParticipants = new Map(room.participants)
      updatedParticipants.delete(targetUserId)

      updateRoom(roomId, {
        participants: updatedParticipants,
        updatedAt: new Date(),
      })
    },
    [rooms, updateRoom]
  )

  const handleBanUser = useCallback(
    (roomId: string, targetUserId: string) => {
      if (!confirm(`确定要封禁用户吗？`)) return

      bannedUsers.add(targetUserId)
      handleKickUser(roomId, targetUserId)
    },
    [bannedUsers, handleKickUser]
  )

  const handleUnbanUser = useCallback(
    (roomId: string, targetUserId: string) => {
      bannedUsers.delete(targetUserId)
    },
    [bannedUsers]
  )

  const handleDestroyRoom = useCallback(
    (roomId: string) => {
      const room = rooms.find(r => r.id === roomId)
      if (!room) return

      if (!confirm(`确定要删除房间 "${room.name}" 吗？此操作不可撤销！`)) return

      removeRoom(roomId)
      setCurrentRoom(null)
      setShowSettingsPanel(false)
    },
    [rooms, removeRoom, setCurrentRoom]
  )

  // Connection status
  const ConnectionStatus = () => {
    if (isConnecting) {
      return (
        <div
          data-testid="connection-status"
          data-status="connecting"
          className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400"
        >
          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-yellow-600" />
          <span>连接中...</span>
        </div>
      )
    }

    if (isConnected) {
      return (
        <div
          data-testid="connection-status"
          data-status="connected"
          className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
        >
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span>已连接</span>
        </div>
      )
    }

    return (
      <div
        data-testid="connection-status"
        data-status="disconnected"
        className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
      >
        <span className="h-2 w-2 rounded-full bg-red-500" />
        <span>未连接</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
          <div className="text-center">
            <span className="mb-4 block text-6xl">⚠️</span>
            <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
              连接错误
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-blue-500 px-6 py-2 text-white hover:bg-blue-600"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="room-manager" className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <div
        data-testid="room-manager-header"
        className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            💬 WebSocket 房间
          </h1>
          <ConnectionStatus />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">{userName}</div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-medium text-white">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Room List Sidebar */}
        <div
          data-testid="room-list-sidebar"
          className="flex w-80 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        >
          <RoomList
            onCreateRoom={handleCreateRoom}
            onSelectRoom={handleSelectRoom}
            onLeaveRoom={handleLeaveRoom}
          />
        </div>

        {/* Room View / Settings */}
        <div data-testid="room-view-container" className="flex flex-1 overflow-hidden">
          {showSettingsPanel && currentRoom ? (
            /* Settings Panel */
            <RoomSettings
              room={currentRoom}
              currentUserId={userId}
              canManage={canManageCurrentRoom}
              onUpdateConfig={handleUpdateConfig}
              onChangeVisibility={handleChangeVisibility}
              onChangeRole={handleChangeRole}
              onKickUser={handleKickUser}
              onBanUser={handleBanUser}
              onUnbanUser={handleUnbanUser}
              onDestroyRoom={handleDestroyRoom}
              onClose={() => setShowSettingsPanel(false)}
              bannedUsers={Array.from(bannedUsers)}
            />
          ) : (
            /* Room View */
            <div className="flex flex-1">
              <RoomView
                onSendMessage={handleSendMessage}
                onReactMessage={handleReactMessage}
                onLeaveRoom={() => currentRoomId && handleLeaveRoom(currentRoomId)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RoomManager
