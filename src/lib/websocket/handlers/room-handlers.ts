// @ts-nocheck
/**
 * Room Event Handlers
 *
 * Handles all room-related socket events: create, join, leave, delete,
 * kick, ban, unban, invite, role changes, and room info queries
 */

import type { AuthenticatedSocket } from '../types'
import type { RoomType, RoomVisibility, RoomConfig, UserRole } from '../rooms'
import type { CreateRoomOptions, JoinRoomOptions } from '../rooms'
import { broadcastToRoom, broadcastToUser } from '../broadcast'
import { logger } from '@/lib/logger'

interface RoomManagerInterface {
  exists: (roomId: string) => boolean
  get: (roomId: string) => any
  create: (options: CreateRoomOptions) => any
  join: (roomId: string, options: JoinRoomOptions) => any
  leave: (roomId: string, userId: string) => any
  destroy: (roomId: string, userId: string) => boolean
  getParticipants: (roomId: string) => any[]
  changeRole: (roomId: string, userId: string, role: UserRole, changedBy: string) => any
  kick: (roomId: string, userId: string, kickedBy: string, reason?: string) => any
  ban: (roomId: string, userId: string, bannedBy: string, reason?: string) => any
  unban: (roomId: string, userId: string, unbannedBy: string) => any
  invite: (roomId: string, userId: string, invitedBy: string) => any
}

interface PermissionManagerInterface {
  hasPermission: (userId: string, roomId: string, permission: string) => boolean
  isUserBanned: (userId: string, roomId: string) => boolean
  getUserRole: (userId: string, roomId: string) => UserRole
}

let roomManager: RoomManagerInterface | null = null
let permissionManager: PermissionManagerInterface | null = null

export function setRoomManager(rm: RoomManagerInterface): void {
  roomManager = rm
}

export function setPermissionManager(pm: PermissionManagerInterface): void {
  permissionManager = pm
}

export function setupRoomHandlers(socket: AuthenticatedSocket): void {
  const user = socket.data.user

  // --------------------------------------------------------------------
  // Room Creation
  // --------------------------------------------------------------------
  socket.on(
    'room:create',
    (data: {
      roomId: string
      type: RoomType
      documentId: string
      name?: string
      visibility?: RoomVisibility
      config?: RoomConfig
    }) => {
      try {
        const { roomId, type, documentId, name, visibility, config } = data

        if (!roomManager) {
          socket.emit('system:error', { message: 'Room manager not initialized' })
          return
        }

        if (roomManager.exists(roomId)) {
          socket.emit('system:error', { message: 'Room already exists', code: 'ROOM_EXISTS' })
          return
        }

        const createOptions: CreateRoomOptions = {
          id: roomId,
          type,
          documentId,
          ownerId: user.id,
          name,
          visibility: visibility ?? 'public',
          config,
        }

        const room = roomManager.create(createOptions)

        socket.emit('room:created', {
          id: room.id,
          name: room.name,
          type: room.type,
          visibility: room.visibility,
          ownerId: room.ownerId,
          documentId: room.documentId,
          createdAt: room.createdAt,
        })

        logger.info('Room created', { roomId, type, ownerId: user.id })
      } catch (error) {
        logger.error('Error creating room', { socketId: socket.id, error })
        socket.emit('system:error', { message: 'Failed to create room' })
      }
    }
  )

  // --------------------------------------------------------------------
  // Room Deletion
  // --------------------------------------------------------------------
  socket.on('room:delete', (data: { roomId: string }) => {
    try {
      const { roomId } = data

      if (!roomManager || !permissionManager) {
        socket.emit('system:error', { message: 'Managers not initialized' })
        return
      }

      const room = roomManager.get(roomId)
      if (!room) {
        socket.emit('system:error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' })
        return
      }

      if (room.ownerId !== user.id) {
        if (!permissionManager.hasPermission(user.id, roomId, 'admin:manage_rooms')) {
          socket.emit('system:error', {
            message: 'No permission to delete room',
            code: 'NO_PERMISSION',
          })
          return
        }
      }

      broadcastToRoom(roomId, 'room:deleted', {
        roomId,
        deletedBy: user.id,
        timestamp: new Date().toISOString(),
      })

      const destroyed = roomManager.destroy(roomId, user.id)

      if (destroyed) {
        socket.emit('room:delete_success', { roomId })
        logger.info('Room deleted', { roomId, deletedBy: user.id })
      } else {
        socket.emit('system:error', { message: 'Failed to delete room' })
      }
    } catch (error) {
      logger.error('Error deleting room', { socketId: socket.id, error })
      socket.emit('system:error', { message: 'Failed to delete room' })
    }
  })

  // --------------------------------------------------------------------
  // Room Join
  // --------------------------------------------------------------------
  socket.on(
    'room:join',
    (data: {
      roomId: string
      type: RoomType
      documentId: string
      name?: string
      visibility?: RoomVisibility
    }) => {
      try {
        const { roomId, type, documentId, name, visibility } = data

        if (!roomManager || !permissionManager) {
          socket.emit('system:error', { message: 'Managers not initialized' })
          return
        }

        let room = roomManager.get(roomId)
        if (!room) {
          const createOptions: CreateRoomOptions = {
            id: roomId,
            type,
            documentId,
            ownerId: user.id,
            name,
            visibility: visibility ?? 'public',
          }
          room = roomManager.create(createOptions)
        }

        if (permissionManager.isUserBanned(user.id, roomId)) {
          socket.emit('system:error', { message: 'You are banned from this room', code: 'BANNED' })
          return
        }

        const joinOptions: JoinRoomOptions = {
          userId: user.id,
          userName: user.name,
          email: user.email,
          avatar: user.avatar,
          role: room.ownerId === user.id ? 'owner' : 'member',
        }

        const result = roomManager.join(roomId, joinOptions)

        if (!result.success) {
          socket.emit('system:error', {
            message: result.error || 'Failed to join room',
            code: 'JOIN_FAILED',
          })
          return
        }

        socket.join(roomId)
        socket.data.rooms.add(roomId)

        const roomData = roomManager.get(roomId)!

        socket.emit('room:joined', {
          roomId,
          users: roomManager.getParticipants(roomId),
          document: roomData.data,
          role: result.participant?.role,
        })

        if (result.offlineMessages && result.offlineMessages.length > 0) {
          socket.emit('messages:offline', {
            messages: result.offlineMessages,
          })
        }

        logger.info('Room joined', { socketId: socket.id, roomId, userId: user.id })
      } catch (error) {
        logger.error('Error joining room', { socketId: socket.id, error })
        socket.emit('system:error', { message: 'Failed to join room' })
      }
    }
  )

  // --------------------------------------------------------------------
  // Room Leave
  // --------------------------------------------------------------------
  socket.on('room:leave', (data: { roomId: string }) => {
    try {
      const { roomId } = data

      if (!roomManager) {
        socket.emit('system:error', { message: 'Room manager not initialized' })
        return
      }

      roomManager.leave(roomId, user.id)
      socket.leave(roomId)
      socket.data.rooms.delete(roomId)
      socket.emit('room:left', { roomId })

      logger.info('Room left', { socketId: socket.id, roomId, userId: user.id })
    } catch (error) {
      logger.error('Error leaving room', { socketId: socket.id, error })
    }
  })

  // --------------------------------------------------------------------
  // Get Room Users
  // --------------------------------------------------------------------
  socket.on('room:get_users', (data: { roomId: string }) => {
    const { roomId } = data
    if (roomManager) {
      const users = roomManager.getParticipants(roomId)
      socket.emit('room:user_list', { roomId, users })
    }
  })

  // --------------------------------------------------------------------
  // Get Room Info
  // --------------------------------------------------------------------
  socket.on('room:get_info', (data: { roomId: string }) => {
    const { roomId } = data
    if (roomManager) {
      const room = roomManager.get(roomId)
      if (room) {
        socket.emit('room:info', {
          id: room.id,
          name: room.name,
          type: room.type,
          visibility: room.visibility,
          ownerId: room.ownerId,
          participantCount: room.participants.size,
          createdAt: room.createdAt,
        })
      } else {
        socket.emit('system:error', { message: 'Room not found' })
      }
    }
  })

  // --------------------------------------------------------------------
  // Kick User
  // --------------------------------------------------------------------
  socket.on('room:kick', (data: { roomId: string; userId: string; reason?: string }) => {
    try {
      const { roomId, userId, reason } = data

      if (!roomManager) {
        socket.emit('system:error', { message: 'Room manager not initialized' })
        return
      }

      const result = roomManager.kick(roomId, userId, user.id, reason)

      if (!result.success) {
        socket.emit('system:error', { message: result.error || 'Failed to kick user' })
        return
      }

      broadcastToUser(userId, 'room:kicked', {
        roomId,
        kickedBy: user.id,
        reason,
        timestamp: new Date().toISOString(),
      })

      socket.emit('room:kick_success', { roomId, userId })
      logger.info('User kicked', { roomId, userId, kickedBy: user.id, reason })
    } catch (error) {
      logger.error('Error kicking user', { socketId: socket.id, error })
      socket.emit('system:error', { message: 'Failed to kick user' })
    }
  })

  // --------------------------------------------------------------------
  // Ban User
  // --------------------------------------------------------------------
  socket.on('room:ban', (data: { roomId: string; userId: string; reason?: string }) => {
    try {
      const { roomId, userId, reason } = data

      if (!roomManager) {
        socket.emit('system:error', { message: 'Room manager not initialized' })
        return
      }

      const result = roomManager.ban(roomId, userId, user.id, reason)

      if (!result.success) {
        socket.emit('system:error', { message: result.error || 'Failed to ban user' })
        return
      }

      broadcastToUser(userId, 'room:banned', {
        roomId,
        bannedBy: user.id,
        reason,
        timestamp: new Date().toISOString(),
      })

      socket.emit('room:ban_success', { roomId, userId })
      logger.info('User banned', { roomId, userId, bannedBy: user.id, reason })
    } catch (error) {
      logger.error('Error banning user', { socketId: socket.id, error })
      socket.emit('system:error', { message: 'Failed to ban user' })
    }
  })

  // --------------------------------------------------------------------
  // Unban User
  // --------------------------------------------------------------------
  socket.on('room:unban', (data: { roomId: string; userId: string }) => {
    try {
      const { roomId, userId } = data

      if (!roomManager) {
        socket.emit('system:error', { message: 'Room manager not initialized' })
        return
      }

      const result = roomManager.unban(roomId, userId, user.id)

      if (!result.success) {
        socket.emit('system:error', { message: result.error || 'Failed to unban user' })
        return
      }

      broadcastToUser(userId, 'room:unbanned', {
        roomId,
        unbannedBy: user.id,
        timestamp: new Date().toISOString(),
      })

      socket.emit('room:unban_success', { roomId, userId })
      logger.info('User unbanned', { roomId, userId, unbannedBy: user.id })
    } catch (error) {
      logger.error('Error unbanning user', { socketId: socket.id, error })
      socket.emit('system:error', { message: 'Failed to unban user' })
    }
  })

  // --------------------------------------------------------------------
  // Invite User
  // --------------------------------------------------------------------
  socket.on('room:invite', (data: { roomId: string; userId: string }) => {
    try {
      const { roomId, userId } = data

      if (!roomManager) {
        socket.emit('system:error', { message: 'Room manager not initialized' })
        return
      }

      const result = roomManager.invite(roomId, userId, user.id)

      if (!result.success) {
        socket.emit('system:error', { message: result.error || 'Failed to invite user' })
        return
      }

      broadcastToUser(userId, 'room:invited', {
        roomId,
        invitedBy: user.id,
        invitedByName: user.name,
        timestamp: new Date().toISOString(),
      })

      socket.emit('room:invite_success', { roomId, userId })
      logger.info('User invited', { roomId, userId, invitedBy: user.id })
    } catch (error) {
      logger.error('Error inviting user', { socketId: socket.id, error })
      socket.emit('system:error', { message: 'Failed to invite user' })
    }
  })

  // --------------------------------------------------------------------
  // Change User Role
  // --------------------------------------------------------------------
  socket.on('room:change_role', (data: { roomId: string; userId: string; role: UserRole }) => {
    try {
      const { roomId, userId, role } = data

      if (!roomManager) {
        socket.emit('system:error', { message: 'Room manager not initialized' })
        return
      }

      const result = roomManager.changeRole(roomId, userId, role, user.id)

      if (!result.success) {
        socket.emit('system:error', { message: result.error || 'Failed to change role' })
        return
      }

      broadcastToUser(userId, 'room:role_changed', {
        roomId,
        oldRole: result.oldRole,
        newRole: role,
        changedBy: user.id,
        timestamp: new Date().toISOString(),
      })

      socket.emit('room:role_change_success', { roomId, userId, newRole: role })
      logger.info('User role changed', { roomId, userId, newRole: role, changedBy: user.id })
    } catch (error) {
      logger.error('Error changing role', { socketId: socket.id, error })
      socket.emit('system:error', { message: 'Failed to change role' })
    }
  })
}
