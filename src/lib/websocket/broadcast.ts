// @ts-nocheck
/**
 * WebSocket Broadcast Utilities
 *
 * Helper functions for broadcasting messages to rooms, users, or all clients
 */

import { Server as SocketIOServer } from 'socket.io'
import { logger } from '@/lib/logger'
import type { AuthenticatedSocket } from './types'

let io: SocketIOServer | null = null

export function setIO(server: SocketIOServer): void {
  io = server
}

export function getIO(): SocketIOServer | null {
  return io
}

/**
 * Broadcast an event to all users in a specific room
 */
export function broadcastToRoom(roomId: string, event: string, data: unknown): void {
  if (!io) {
    logger.warn('WebSocket server not initialized')
    return
  }

  io.to(roomId).emit(event, data)
  logger.debug('Broadcast to room', { roomId, event })
}

/**
 * Broadcast an event to a specific user (via their personal channel)
 */
export function broadcastToUser(userId: string, event: string, data: unknown): void {
  if (!io) {
    logger.warn('WebSocket server not initialized')
    return
  }

  io.to(`user:${userId}`).emit(event, data)
  logger.debug('Broadcast to user', { userId, event })
}

/**
 * Broadcast an event to all connected clients
 */
export function broadcastToAll(event: string, data: unknown): void {
  if (!io) {
    logger.warn('WebSocket server not initialized')
    return
  }

  io.emit(event, data)
  logger.debug('Broadcast to all', { event })
}

/**
 * Get all connected sockets in a room
 */
export function getRoomSockets(roomId: string): Set<string> {
  if (!io) return new Set()

  const sockets = io.sockets.sockets
  const result = new Set<string>()

  sockets.forEach((socket, socketId) => {
    if (socket.rooms.has(roomId)) {
      result.add(socketId)
    }
  })

  return result
}

/**
 * Get all online user IDs in a room
 */
export function getOnlineUserIdsInRoom(roomId: string, roomParticipants: Map<string, unknown>): Set<string> {
  const onlineUserIds = new Set<string>()

  if (!io) return onlineUserIds

  const sockets = io.sockets.sockets
  sockets.forEach((socket) => {
    const authSocket = socket as AuthenticatedSocket
    if (authSocket.data.rooms?.has(roomId)) {
      const userId = authSocket.data.user?.id
      if (userId) {
        onlineUserIds.add(userId)
      }
    }
  })

  return onlineUserIds
}
