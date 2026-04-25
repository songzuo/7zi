// @ts-nocheck
/**
 * Message Event Handlers
 *
 * Handles all message-related socket events: send, edit, delete, react,
 * pin, and history retrieval
 */

import type { AuthenticatedSocket } from '../types'
import { broadcastToRoom } from '../broadcast'
import { logger } from '@/lib/logger'
import { Server as SocketIOServer } from 'socket.io'

interface MessageStoreInterface {
  store: (msg: any) => any
  edit: (messageId: string, content: string, userId: string) => any
  delete: (messageId: string, userId: string) => boolean
  addReaction: (messageId: string, emoji: string, userId: string, userName: string) => boolean
  pin: (messageId: string, userId: string) => any
  getInRoom: (roomId: string, messageId: string) => any
  getHistory: (options: any) => any[]
  getPinnedMessages: (roomId: string) => any[]
  queueOfflineMessage: (userId: string, message: any) => void
  getOfflineMessages: (userId: string) => any[]
  clearOfflineMessages: (userId: string) => void
}

interface RoomManagerInterface {
  get: (roomId: string) => any
  getParticipants: (roomId: string) => any[]
  updateData: (roomId: string, data: any) => boolean
}

interface PermissionManagerInterface {
  hasPermission: (userId: string, roomId: string, permission: string) => boolean
}

let messageStore: MessageStoreInterface | null = null
let roomManager: RoomManagerInterface | null = null
let permissionManager: PermissionManagerInterface | null = null
let io: SocketIOServer | null = null

export function setMessageStore(ms: MessageStoreInterface): void {
  messageStore = ms
}

export function setRoomManager(rm: RoomManagerInterface): void {
  roomManager = rm
}

export function setPermissionManager(pm: PermissionManagerInterface): void {
  permissionManager = pm
}

export function setIO(server: SocketIOServer): void {
  io = server
}

export function setupMessageHandlers(socket: AuthenticatedSocket): void {
  const user = socket.data.user

  // --------------------------------------------------------------------
  // Send Message
  // --------------------------------------------------------------------
  socket.on(
    'message:send',
    (data: {
      roomId: string
      content: string
      type?: string
      replyTo?: string
      metadata?: Record<string, unknown>
    }) => {
      try {
        const { roomId, content, type = 'text', replyTo, metadata } = data

        if (!messageStore || !roomManager || !permissionManager) {
          socket.emit('system:error', { message: 'Managers not initialized' })
          return
        }

        if (!permissionManager.hasPermission(user.id, roomId, 'message:send')) {
          socket.emit('system:error', {
            message: 'No permission to send messages',
            code: 'NO_PERMISSION',
          })
          return
        }

        const messageId = crypto.randomUUID()
        const storedMessage = messageStore.store({
          id: messageId,
          roomId,
          userId: user.id,
          userName: user.name,
          type,
          content,
          replyTo,
          metadata,
        })

        // Queue messages for offline participants
        const participants = roomManager.getParticipants(roomId)
        const onlineUserIds = new Set(
          Array.from(io?.sockets.sockets.values() || [])
            .filter((s: any) => s.data.rooms?.has(roomId))
            .map((s: any) => s.data.user?.id)
        )

        for (const participant of participants) {
          if (!onlineUserIds.has(participant.id)) {
            messageStore.queueOfflineMessage(participant.id, storedMessage)
          }
        }

        broadcastToRoom(roomId, 'message:new', storedMessage)
        logger.debug('Message sent', { messageId, roomId, userId: user.id })
      } catch (error) {
        logger.error('Error sending message', { socketId: socket.id, error })
        socket.emit('system:error', { message: 'Failed to send message' })
      }
    }
  )

  // --------------------------------------------------------------------
  // Edit Message
  // --------------------------------------------------------------------
  socket.on('message:edit', (data: { roomId: string; messageId: string; content: string }) => {
    try {
      const { roomId, messageId, content } = data

      if (!messageStore || !permissionManager) {
        socket.emit('system:error', { message: 'Managers not initialized' })
        return
      }

      if (!permissionManager.hasPermission(user.id, roomId, 'message:edit')) {
        socket.emit('system:error', {
          message: 'No permission to edit messages',
          code: 'NO_PERMISSION',
        })
        return
      }

      const message = messageStore.getInRoom(roomId, messageId)
      if (!message) {
        socket.emit('system:error', { message: 'Message not found' })
        return
      }

      if (message.userId !== user.id) {
        if (!permissionManager.hasPermission(user.id, roomId, 'admin:manage_users')) {
          socket.emit('system:error', { message: "Cannot edit other users' messages" })
          return
        }
      }

      const editedMessage = messageStore.edit(messageId, content, user.id)

      if (editedMessage) {
        broadcastToRoom(roomId, 'message:edited', editedMessage)
      }

      logger.debug('Message edited', { messageId, roomId, userId: user.id })
    } catch (error) {
      logger.error('Error editing message', { socketId: socket.id, error })
      socket.emit('system:error', { message: 'Failed to edit message' })
    }
  })

  // --------------------------------------------------------------------
  // Delete Message
  // --------------------------------------------------------------------
  socket.on('message:delete', (data: { roomId: string; messageId: string }) => {
    try {
      const { roomId, messageId } = data

      if (!messageStore || !permissionManager) {
        socket.emit('system:error', { message: 'Managers not initialized' })
        return
      }

      if (!permissionManager.hasPermission(user.id, roomId, 'message:delete')) {
        socket.emit('system:error', {
          message: 'No permission to delete messages',
          code: 'NO_PERMISSION',
        })
        return
      }

      const message = messageStore.getInRoom(roomId, messageId)
      if (!message) {
        socket.emit('system:error', { message: 'Message not found' })
        return
      }

      if (message.userId !== user.id) {
        if (!permissionManager.hasPermission(user.id, roomId, 'admin:manage_users')) {
          socket.emit('system:error', { message: "Cannot delete other users' messages" })
          return
        }
      }

      const deleted = messageStore.delete(messageId, user.id)

      if (deleted) {
        broadcastToRoom(roomId, 'message:deleted', { messageId, roomId })
      }

      logger.debug('Message deleted', { messageId, roomId, userId: user.id })
    } catch (error) {
      logger.error('Error deleting message', { socketId: socket.id, error })
      socket.emit('system:error', { message: 'Failed to delete message' })
    }
  })

  // --------------------------------------------------------------------
  // Add Reaction
  // --------------------------------------------------------------------
  socket.on('message:react', (data: { roomId: string; messageId: string; emoji: string }) => {
    try {
      const { roomId, messageId, emoji } = data

      if (!messageStore || !permissionManager) {
        socket.emit('system:error', { message: 'Managers not initialized' })
        return
      }

      if (!permissionManager.hasPermission(user.id, roomId, 'message:react')) {
        socket.emit('system:error', { message: 'No permission to react', code: 'NO_PERMISSION' })
        return
      }

      const added = messageStore.addReaction(messageId, emoji, user.id, user.name)

      if (added) {
        const message = messageStore.getInRoom(roomId, messageId)
        broadcastToRoom(roomId, 'message:reaction', {
          messageId,
          emoji,
          userId: user.id,
          userName: user.name,
          reactions: message?.reactions,
        })
      }

      logger.debug('Reaction added', { messageId, emoji, userId: user.id })
    } catch (error) {
      logger.error('Error adding reaction', { socketId: socket.id, error })
      socket.emit('system:error', { message: 'Failed to add reaction' })
    }
  })

  // --------------------------------------------------------------------
  // Pin Message
  // --------------------------------------------------------------------
  socket.on('message:pin', (data: { roomId: string; messageId: string }) => {
    try {
      const { roomId, messageId } = data

      if (!messageStore || !permissionManager) {
        socket.emit('system:error', { message: 'Managers not initialized' })
        return
      }

      if (!permissionManager.hasPermission(user.id, roomId, 'message:pin')) {
        socket.emit('system:error', {
          message: 'No permission to pin messages',
          code: 'NO_PERMISSION',
        })
        return
      }

      const pinned = messageStore.pin(messageId, user.id)

      if (pinned) {
        const message = messageStore.getInRoom(roomId, messageId)
        broadcastToRoom(roomId, 'message:pinned', { messageId, pinnedBy: user.id, message })
      }

      logger.debug('Message pinned', { messageId, userId: user.id })
    } catch (error) {
      logger.error('Error pinning message', { socketId: socket.id, error })
      socket.emit('system:error', { message: 'Failed to pin message' })
    }
  })

  // --------------------------------------------------------------------
  // Get Message History
  // --------------------------------------------------------------------
  socket.on('message:get_history', (data: any) => {
    try {
      const { roomId } = data

      if (!messageStore || !permissionManager) {
        socket.emit('system:error', { message: 'Managers not initialized' })
        return
      }

      if (!permissionManager.hasPermission(user.id, roomId, 'message:view_history')) {
        socket.emit('system:error', {
          message: 'No permission to view history',
          code: 'NO_PERMISSION',
        })
        return
      }

      const messages = messageStore.getHistory(data)
      socket.emit('message:history', { roomId, messages })
    } catch (error) {
      logger.error('Error getting history', { socketId: socket.id, error })
      socket.emit('system:error', { message: 'Failed to get message history' })
    }
  })

  // --------------------------------------------------------------------
  // Get Pinned Messages
  // --------------------------------------------------------------------
  socket.on('message:get_pinned', (data: { roomId: string }) => {
    try {
      const { roomId } = data

      if (!messageStore || !permissionManager) {
        socket.emit('system:error', { message: 'Managers not initialized' })
        return
      }

      if (!permissionManager.hasPermission(user.id, roomId, 'room:view')) {
        socket.emit('system:error', { message: 'No permission', code: 'NO_PERMISSION' })
        return
      }

      const messages = messageStore.getPinnedMessages(roomId)
      socket.emit('message:pinned_list', { roomId, messages })
    } catch (error) {
      logger.error('Error getting pinned messages', { socketId: socket.id, error })
    }
  })
}
