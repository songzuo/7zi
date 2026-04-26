/**
 * Document & Cursor Event Handlers
 *
 * Handles document operations (open, operation, sync) and
 * cursor/selection/presence updates
 */

import type { AuthenticatedSocket } from '../types'
import type { RoomParticipant } from '../rooms'
import { broadcastToRoom } from '../broadcast'
import { logger } from '@/lib/logger'

interface CursorData {
  position: number
  selection?: { start: number; end: number }
}

interface RoomManagerInterface {
  get: (roomId: string) => { data: { content: string; revision: number }; participants: Map<string, RoomParticipant> } | undefined
  getParticipant: (roomId: string, userId: string) => RoomParticipant | undefined
  updateData: (roomId: string, data: Record<string, unknown>) => boolean
  updateCursor: (roomId: string, userId: string, cursor: CursorData) => boolean
  updateTyping: (roomId: string, userId: string, isTyping: boolean) => boolean
}

interface PermissionManagerInterface {
  hasPermission: (userId: string, roomId: string, permission: string) => boolean
}

let roomManager: RoomManagerInterface | null = null
let permissionManager: PermissionManagerInterface | null = null

export function setRoomManager(rm: RoomManagerInterface): void {
  roomManager = rm
}

export function setPermissionManager(pm: PermissionManagerInterface): void {
  permissionManager = pm
}

export function setupDocumentHandlers(socket: AuthenticatedSocket): void {
  const user = socket.data.user

  // --------------------------------------------------------------------
  // Document Open
  // --------------------------------------------------------------------
  socket.on('doc:open', (data: { roomId: string; documentId: string }) => {
    try {
      const { roomId, documentId } = data

      if (!roomManager || !permissionManager) {
        socket.emit('system:error', { message: 'Managers not initialized' })
        return
      }

      if (!permissionManager.hasPermission(user.id, roomId, 'room:view')) {
        socket.emit('system:error', {
          message: 'No permission to view this room',
          code: 'NO_PERMISSION',
        })
        return
      }

      const room = roomManager.get(roomId)

      if (!room) {
        socket.emit('system:error', { message: 'Room not found' })
        return
      }

      socket.emit('doc:opened', {
        roomId,
        documentId,
        document: room.data,
      })

      logger.debug('Document opened', {
        socketId: socket.id,
        roomId,
        documentId,
        userId: user.id,
      })
    } catch (error) {
      logger.error('Error opening document', { socketId: socket.id, error })
      socket.emit('system:error', { message: 'Failed to open document' })
    }
  })

  // --------------------------------------------------------------------
  // Document Operation (insert/delete)
  // --------------------------------------------------------------------
  socket.on(
    'doc:operation',
    (data: {
      roomId: string
      operation: {
        type: 'insert' | 'delete' | 'retain'
        position: number
        content?: string
        length?: number
      }
    }) => {
      try {
        const { roomId, operation } = data

        if (!roomManager || !permissionManager) {
          socket.emit('system:error', { message: 'Managers not initialized' })
          return
        }

        if (!permissionManager.hasPermission(user.id, roomId, 'message:send')) {
          socket.emit('system:error', { message: 'No permission to edit', code: 'NO_PERMISSION' })
          return
        }

        const room = roomManager.get(roomId)

        if (!room) {
          socket.emit('system:error', { message: 'Room not found' })
          return
        }

        // Apply operation to document content
        let { content, revision } = room.data as { content: string; revision: number }

        if (operation.type === 'insert' && operation.content) {
          content =
            content.slice(0, operation.position) +
            operation.content +
            content.slice(operation.position)
        } else if (operation.type === 'delete' && operation.length) {
          content =
            content.slice(0, operation.position) +
            content.slice(operation.position + operation.length)
        }

        revision++

        roomManager.updateData(roomId, { content, revision })

        const operationMessage = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          userId: user.id,
          userName: user.name,
          operation,
          revision,
        }

        broadcastToRoom(roomId, 'doc:operation_applied', operationMessage)

        logger.debug('Document operation applied', {
          socketId: socket.id,
          roomId,
          operation,
          revision,
        })
      } catch (error) {
        logger.error('Error applying operation', { socketId: socket.id, error })
        socket.emit('system:error', { message: 'Failed to apply operation' })
      }
    }
  )

  // --------------------------------------------------------------------
  // Document Sync
  // --------------------------------------------------------------------
  socket.on('doc:sync', (data: { roomId: string }) => {
    try {
      const { roomId } = data

      if (!roomManager) {
        socket.emit('system:error', { message: 'Room manager not initialized' })
        return
      }

      const room = roomManager.get(roomId)

      if (!room) {
        socket.emit('system:error', { message: 'Room not found' })
        return
      }

      socket.emit('doc:sync', {
        roomId,
        document: room.data,
      })
    } catch (error) {
      logger.error('Error syncing document', { socketId: socket.id, error })
      socket.emit('system:error', { message: 'Failed to sync document' })
    }
  })

  // --------------------------------------------------------------------
  // Cursor Move
  // --------------------------------------------------------------------
  socket.on(
    'cursor:move',
    (data: {
      roomId: string
      position: number
      selection?: { start: number; end: number }
    }) => {
      try {
        const { roomId, position, selection } = data

        if (!roomManager) {
          socket.emit('system:error', { message: 'Room manager not initialized' })
          return
        }

        const room = roomManager.get(roomId)
        if (!room) return

        roomManager.updateCursor(roomId, user.id, { position, selection })

        const participant = roomManager.getParticipant(roomId, user.id)
        if (participant) {
          broadcastToRoom(roomId, 'cursor:update', {
            userId: user.id,
            userName: user.name,
            color: participant.color,
            position,
            selection,
          })
        }
      } catch (error) {
        logger.error('Error updating cursor', { socketId: socket.id, error })
      }
    }
  )

  // --------------------------------------------------------------------
  // Selection Update
  // --------------------------------------------------------------------
  socket.on(
    'selection:update',
    (data: { roomId: string; selection: { start: number; end: number } }) => {
      try {
        const { roomId, selection } = data

        if (!roomManager) {
          socket.emit('system:error', { message: 'Room manager not initialized' })
          return
        }

        const room = roomManager.get(roomId)
        if (!room) return

        const participant = roomManager.getParticipant(roomId, user.id)
        if (participant) {
          roomManager.updateCursor(roomId, user.id, {
            position: (participant as unknown as { cursor?: CursorData }).cursor?.position || 0,
            selection,
          })

          broadcastToRoom(roomId, 'selection:update', {
            userId: user.id,
            userName: user.name,
            color: participant.color,
            selection,
          })
        }
      } catch (error) {
        logger.error('Error updating selection', { socketId: socket.id, error })
      }
    }
  )

  // --------------------------------------------------------------------
  // Typing Status
  // --------------------------------------------------------------------
  socket.on('presence:typing', (data: { roomId: string; isTyping: boolean }) => {
    try {
      const { roomId, isTyping } = data

      if (!roomManager) {
        socket.emit('system:error', { message: 'Room manager not initialized' })
        return
      }

      const room = roomManager.get(roomId)
      if (!room) return

      roomManager.updateTyping(roomId, user.id, isTyping)

      socket.to(roomId).emit('presence:typing', {
        userId: user.id,
        userName: user.name,
        isTyping,
      })
    } catch (error) {
      logger.error('Error updating typing status', { socketId: socket.id, error })
    }
  })
}