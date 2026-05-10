// @ts-nocheck
/**
 * WebSocket Server Implementation
 *
 * Socket.IO server for real-time collaboration features
 * Supports rooms, authentication, permissions, and message broadcasting
 *
 * v1.4.0: Integrated RoomManager, PermissionManager, and MessageStore
 * v1.4.1: Modular - split into broadcast.ts, auth.ts, handlers/
 */

'use server'

import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { setupVoiceMeetingHandlers } from '@/lib/voice-meeting/signaling'
import type { AuthenticatedSocket } from './types'

// ============================================================================
// Core Module Imports (v1.4.0)
// ============================================================================

import {
  RoomManager,
  getRoomManager,
  type RoomType,
  type RoomVisibility,
  type RoomConfig,
  type CreateRoomOptions,
  type JoinRoomOptions,
  type RoomEventCallbacks,
} from './rooms'

import {
  PermissionManager,
  getPermissionManager,
  type UserRole,
  type Permission,
} from './permissions'

import { MessageStore, getMessageStore, type MessageHistoryOptions } from './message-store'

// ============================================================================
// Split Modules (v1.4.1)
// ============================================================================

import { authenticateSocket } from './auth'
import { broadcastToRoom, broadcastToUser, broadcastToAll, setIO } from './broadcast'
import { setupRoomHandlers, setRoomManager, setPermissionManager as setRoomPermissionManager } from './handlers/room-handlers'
import { setupMessageHandlers, setMessageStore, setPermissionManager as setMessagePermissionManager } from './handlers/message-handlers'
import { setupDocumentHandlers, setPermissionManager as setDocPermissionManager, setRoomManager as setDocRoomManager } from './handlers/doc-handlers'
import { broadcastTaskStatusUpdate, broadcastTaskStatusToUser, type TaskStatusUpdate } from './task-status'

// ============================================================================
// Re-export types from core modules and shared types
// ============================================================================

export type { RoomType as WsRoomType, RoomVisibility, UserRole, RoomParticipant } from './rooms'
export type { Permission } from './permissions'
export type { StoredMessage, MessageHistoryOptions } from './message-store'
export type { AuthenticatedSocket, WebSocketMessage } from './types'
export type { TaskStatusUpdate } from './task-status'

// ============================================================================
// Global Server Instance
// ============================================================================

let io: SocketIOServer | null = null
let httpServer: HTTPServer | null = null
let roomManager: RoomManager | null = null
let permissionManager: PermissionManager | null = null
let messageStore: MessageStore | null = null

// ============================================================================
// Core Module Initialization
// ============================================================================

function initializeCoreModules(): void {
  if (!permissionManager) {
    permissionManager = getPermissionManager()
  }

  if (!messageStore) {
    messageStore = getMessageStore({
      maxHistorySize: 10000,
      offlineMessageTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxOfflineMessages: 100,
    })
  }

  if (!roomManager) {
    // Set up event callbacks for room manager
    const callbacks: RoomEventCallbacks = {
      onUserJoined: (room, participant) => {
        broadcastToRoom(room.id, 'room:user_joined', {
          user: participant,
          userCount: room.participants.size,
        })
      },
      onUserLeft: (room, participant) => {
        broadcastToRoom(room.id, 'room:user_left', {
          userId: participant.id,
          userCount: room.participants.size,
        })
      },
      onUserBanned: (roomId, userId, bannedBy) => {
        broadcastToUser(userId, 'room:banned', {
          roomId,
          bannedBy,
          timestamp: new Date().toISOString(),
        })
      },
      onUserRoleChanged: (room, participant, oldRole) => {
        broadcastToUser(participant.id, 'room:role_changed', {
          roomId: room.id,
          oldRole,
          newRole: participant.role,
        })
      },
    }

    roomManager = getRoomManager(callbacks)
  }

  // Wire up the handler modules with manager instances
  // Define proper type for handler module interfaces
  setRoomManager(roomManager)
  setMessageStore(messageStore)
  setRoomPermissionManager(permissionManager)
  setMessagePermissionManager(permissionManager)
  setDocPermissionManager(permissionManager)
  setDocRoomManager(roomManager)
}

// ============================================================================
// Socket Event Handlers
// ============================================================================

function setupSocketHandlers(socket: AuthenticatedSocket): void {
  const user = socket.data.user

  // Ensure core modules are initialized
  initializeCoreModules()

  // Join user's personal channel
  socket.join(`user:${user.id}`)

  // Send authentication success
  socket.emit('auth:authenticated', {
    userId: user.id,
    name: user.name,
    avatar: user.avatar,
  })

  // Setup all handler groups
  setupRoomHandlers(socket)
  setupMessageHandlers(socket)
  setupDocumentHandlers(socket)

  // --------------------------------------------------------------------
  // Heartbeat
  // --------------------------------------------------------------------
  socket.on('heartbeat', () => {
    socket.data.lastHeartbeat = Date.now()
  })

  // --------------------------------------------------------------------
  // Disconnect
  // --------------------------------------------------------------------
  socket.on('disconnect', (reason: string) => {
    logger.info('Client disconnected', {
      socketId: socket.id,
      userId: user.id,
      userName: user.name,
      reason,
    })

    // Leave all rooms
    const roomsToLeave = Array.from(socket.data.rooms)
    roomsToLeave.forEach(roomId => {
      roomManager?.leave(roomId, user.id)
    })

    socket.data.rooms.clear()
  })
}

// ============================================================================
// Server Setup
// ============================================================================

function setupServer(ioServer: SocketIOServer): void {
  // Initialize core modules
  initializeCoreModules()

  // Set IO for broadcast module
  setIO(ioServer)

  // Use authentication middleware
  ioServer.use(authenticateSocket)

  // Handle connections
  ioServer.on('connection', socket => {
    logger.info('New connection', { socketId: socket.id })
    setupSocketHandlers(socket as AuthenticatedSocket)
  })

  // Setup voice meeting handlers
  setupVoiceMeetingHandlers(ioServer)

  // Start heartbeat monitoring
  setInterval(() => {
    const now = Date.now()
    ioServer?.sockets.sockets.forEach(socket => {
      const authSocket = socket as AuthenticatedSocket
      const lastHeartbeat = authSocket.data.lastHeartbeat || 0

      // Disconnect if no heartbeat for 120 seconds
      const heartbeatTimeout = 120000 // 2 minutes
      if (now - lastHeartbeat > heartbeatTimeout) {
        logger.warn('Client disconnected (heartbeat timeout)', {
          socketId: socket.id,
          userId: authSocket.data.user?.id,
          lastHeartbeat,
          elapsed: now - lastHeartbeat,
        })
        socket.disconnect(true)
      }
    })
  }, 10000)

  // Start periodic cleanup of expired offline messages
  setInterval(() => {
    messageStore?.cleanupExpiredOfflineMessages()
  }, 60000) // Every minute

  logger.info('WebSocket server setup complete')
}

// ============================================================================
// Server Export
// ============================================================================

export async function createServer(req: NextRequest): Promise<Response> {
  // Create HTTP server if needed
  if (!httpServer) {
    httpServer = new HTTPServer()

    // Get allowed origin from environment variable
    const allowedOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio'

    // Initialize Socket.IO
    io = new SocketIOServer(httpServer, {
      path: '/api/ws',
      cors: {
        origin: allowedOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 45000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e8, // 100 MB
    })

    setupServer(io)
  }

  // Upgrade the HTTP connection to WebSocket
  const url = new URL(req.url)
  const wsUrl = `ws://${url.host}/api/ws`

  return new Response(`WebSocket server is running. Connect to: ${wsUrl}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio',
    },
  })
}

// ============================================================================
// Server API (for monitoring and management)
// ============================================================================

export async function getServer(): Promise<SocketIOServer | null> {
  return io
}

export async function getStats() {
  if (!io || !roomManager || !messageStore) {
    return {
      connected: 0,
      rooms: 0,
      totalUsers: 0,
      messages: 0,
    }
  }

  const connected = io.sockets.sockets.size
  const roomStats = roomManager.getStats()
  const messageStats = messageStore.getStats()

  return {
    connected,
    rooms: roomStats.totalRooms,
    activeRooms: roomStats.activeRooms,
    totalUsers: roomStats.totalParticipants,
    messages: messageStats.totalMessages,
    offlineMessages: messageStats.totalOfflineMessages,
  }
}

export async function getRoomInfo(roomId: string) {
  if (!roomManager) return null

  const room = roomManager.get(roomId)
  if (!room) return null

  return {
    id: room.id,
    name: room.name,
    type: room.type,
    visibility: room.visibility,
    ownerId: room.ownerId,
    userCount: room.participants.size,
    createdAt: room.createdAt,
    lastActivity: room.lastActivity,
    users: Array.from(room.participants.values()).map(u => ({
      id: u.id,
      name: u.name,
      color: u.color,
      role: u.role,
      isTyping: u.isTyping,
      lastActivity: u.lastActivity,
      isOnline: u.isOnline,
    })),
  }
}

export async function getAllRooms() {
  if (!roomManager) return []

  return roomManager.getAllRooms().map(room => ({
    id: room.id,
    name: room.name,
    type: room.type,
    visibility: room.visibility,
    ownerId: room.ownerId,
    userCount: room.participants.size,
    createdAt: room.createdAt,
    lastActivity: room.lastActivity,
  }))
}

export async function broadcastSystemAnnouncement(message: string): Promise<void> {
  broadcastToAll('system:announcement', {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    message,
  })
}

// ============================================================================
// Permission Helper Exports
// ============================================================================

export async function checkUserPermission(
  userId: string,
  roomId: string,
  permission: Permission
): Promise<boolean> {
  if (!permissionManager) return false
  return permissionManager.hasPermission(userId, roomId, permission)
}

export async function getUserRoomRole(userId: string, roomId: string): Promise<UserRole> {
  if (!permissionManager) return 'guest'
  return permissionManager.getUserRole(userId, roomId)
}

export async function isUserBannedFromRoom(userId: string, roomId: string): Promise<boolean> {
  if (!permissionManager) return false
  return permissionManager.isUserBanned(userId, roomId)
}

// ============================================================================
// Task Status Broadcast (from task-status.ts)
// ============================================================================

export { broadcastTaskStatusUpdate, broadcastTaskStatusToUser }

export default createServer
