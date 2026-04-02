/**
 * Standalone WebSocket Server
 *
 * This is an independent Socket.IO server that runs separately from Next.js.
 * It provides real-time collaboration features including:
 * - Room management
 * - Document collaboration (OT operations)
 * - Cursor tracking
 * - Typing indicators
 * - User presence
 *
 * Usage:
 *   node server/websocket-server.js
 *
 * Environment variables:
 *   PORT - WebSocket server port (default: 3001)
 *   NEXT_PUBLIC_SITE_URL - Allowed CORS origin (default: http://localhost:3000)
 *   LOG_LEVEL - Logging level (default: info)
 */

const { Server: SocketIOServer } = require('socket.io')
const http = require('http')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT || '3002', 10)
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'

// JWT Secret (should match the one in Next.js app)
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key'

// ============================================================================
// Logger
// ============================================================================

const logger = {
  info: (message, data = {}) => {
    if (['info', 'debug'].includes(LOG_LEVEL)) {
      console.log(`[INFO] ${message}`, JSON.stringify(data, null, 2))
    }
  },
  debug: (message, data = {}) => {
    if (LOG_LEVEL === 'debug') {
      console.log(`[DEBUG] ${message}`, JSON.stringify(data, null, 2))
    }
  },
  warn: (message, data = {}) => {
    console.warn(`[WARN] ${message}`, JSON.stringify(data, null, 2))
  },
  error: (message, data = {}) => {
    console.error(`[ERROR] ${message}`, JSON.stringify(data, null, 2))
  },
}

// ============================================================================
// Room Management
// ============================================================================

class RoomManager {
  constructor() {
    this.rooms = new Map()
    this.cleanupTimers = new Map()
  }

  generateColor(userId) {
    const colors = [
      '#ef4444',
      '#f97316',
      '#f59e0b',
      '#84cc16',
      '#10b981',
      '#06b6d4',
      '#0ea5e9',
      '#3b82f6',
      '#6366f1',
      '#8b5cf6',
      '#d946ef',
      '#ec4899',
      '#f43f5e',
    ]
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  getRoom(roomId) {
    return this.rooms.get(roomId)
  }

  createRoom(roomId, type, documentId, name) {
    const room = {
      id: roomId,
      name: name || `Room ${roomId}`,
      type,
      documentId,
      users: new Map(),
      createdAt: new Date(),
      lastActivity: new Date(),
      document: {
        content: '',
        revision: 0,
      },
    }

    this.rooms.set(roomId, room)
    logger.info('Room created', { roomId, type, documentId })

    return room
  }

  ensureRoom(roomId, type, documentId, name) {
    return this.getRoom(roomId) || this.createRoom(roomId, type, documentId, name)
  }

  addUserToRoom(room, user) {
    room.users.set(user.id, user)
    room.lastActivity = new Date()

    logger.info('User joined room', {
      roomId: room.id,
      userId: user.id,
      userName: user.name,
      userCount: room.users.size,
    })
  }

  removeUserFromRoom(room, userId) {
    const user = room.users.get(userId)
    if (user) {
      room.users.delete(userId)
      room.lastActivity = new Date()

      logger.info('User left room', {
        roomId: room.id,
        userId,
        userName: user.name,
        userCount: room.users.size,
      })

      // Auto-destroy empty room after 30 minutes
      if (room.users.size === 0 && room.type !== 'project') {
        this.scheduleRoomCleanup(room.id, 30 * 60 * 1000)
      }
    }
  }

  getRoomUsers(roomId) {
    const room = this.getRoom(roomId)
    return room ? Array.from(room.users.values()) : []
  }

  scheduleRoomCleanup(roomId, delay) {
    // Cancel existing timer
    const existingTimer = this.cleanupTimers.get(roomId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Schedule cleanup
    const timer = setTimeout(() => {
      const room = this.getRoom(roomId)
      if (room && room.users.size === 0) {
        this.rooms.delete(roomId)
        this.cleanupTimers.delete(roomId)
        logger.info('Room destroyed (idle)', { roomId })
      }
    }, delay)

    this.cleanupTimers.set(roomId, timer)
  }

  getAllRooms() {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      type: room.type,
      userCount: room.users.size,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity,
    }))
  }

  getRoomInfo(roomId) {
    const room = this.getRoom(roomId)
    if (!room) return null

    return {
      id: room.id,
      name: room.name,
      type: room.type,
      userCount: room.users.size,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity,
      users: Array.from(room.users.values()).map(u => ({
        id: u.id,
        name: u.name,
        color: u.color,
        isTyping: u.isTyping,
        lastActivity: u.lastActivity,
      })),
    }
  }
}

const roomManager = new RoomManager()

// ============================================================================
// Authentication
// ============================================================================

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth.token

    // For demo purposes, allow connections without token
    if (!token) {
      logger.warn('Connection accepted: No token provided (demo mode)', { socketId: socket.id })

      // Create demo user
      const demoUserId =
        socket.handshake.auth.userId || `user-${Math.random().toString(36).substr(2, 9)}`
      const demoUserName =
        socket.handshake.auth.userName || `User ${Math.floor(Math.random() * 1000)}`

      socket.data.user = {
        id: demoUserId,
        name: demoUserName,
        email: `${demoUserId}@demo.local`,
        avatar: null,
      }
      socket.data.lastHeartbeat = Date.now()
      socket.data.rooms = new Set()

      return next()
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET)

    if (!decoded || !decoded.userId) {
      logger.warn('Connection rejected: Invalid token', { socketId: socket.id })
      return next(new Error('Invalid token'))
    }

    // Create user from token (in production, fetch from database)
    socket.data.user = {
      id: decoded.userId,
      name: decoded.name || decoded.userId,
      email: decoded.email,
      avatar: decoded.avatar,
    }
    socket.data.lastHeartbeat = Date.now()
    socket.data.rooms = new Set()

    logger.info('User authenticated', {
      socketId: socket.id,
      userId: socket.data.user.id,
      userName: socket.data.user.name,
    })

    next()
  } catch (error) {
    // For demo purposes, accept the connection even with invalid token
    logger.warn('Connection accepted with invalid token (demo mode)', {
      socketId: socket.id,
      error: error.message,
    })

    const demoUserId =
      socket.handshake.auth.userId || `user-${Math.random().toString(36).substr(2, 9)}`
    const demoUserName =
      socket.handshake.auth.userName || `User ${Math.floor(Math.random() * 1000)}`

    socket.data.user = {
      id: demoUserId,
      name: demoUserName,
      email: `${demoUserId}@demo.local`,
      avatar: null,
    }
    socket.data.lastHeartbeat = Date.now()
    socket.data.rooms = new Set()

    next()
  }
}

// ============================================================================
// Socket Event Handlers
// ============================================================================

function setupSocketHandlers(socket) {
  const user = socket.data.user

  logger.info('New connection', { socketId: socket.id, userId: user.id, userName: user.name })

  // Join user's personal channel
  socket.join(`user:${user.id}`)

  // Send authentication success
  socket.emit('auth:authenticated', {
    userId: user.id,
    name: user.name,
    avatar: user.avatar,
  })

  // --------------------------------------------------------------------
  // Room Events
  // --------------------------------------------------------------------

  socket.on('room:join', data => {
    try {
      const { roomId, type, documentId, name } = data

      logger.debug('Room join request', { socketId: socket.id, roomId, type, userId: user.id })

      // Get or create room
      const room = roomManager.ensureRoom(roomId, type, documentId, name)

      // Add user to room
      socket.join(roomId)
      socket.data.rooms.add(roomId)

      const roomUser = {
        id: user.id,
        name: user.name,
        email: user.email || '',
        avatar: user.avatar,
        color: roomManager.generateColor(user.id),
        joinedAt: new Date(),
        isTyping: false,
        lastActivity: new Date(),
      }

      roomManager.addUserToRoom(room, roomUser)

      // Notify user
      socket.emit('room:joined', {
        roomId,
        users: roomManager.getRoomUsers(roomId),
        document: room.document,
      })

      // Notify other users in room
      socket.to(roomId).emit('room:user_joined', {
        user: roomUser,
        userCount: room.users.size,
      })

      logger.info('Room joined', { socketId: socket.id, roomId, userId: user.id })
    } catch (error) {
      logger.error('Error joining room', { socketId: socket.id, error })
      socket.emit('system:error', { message: 'Failed to join room' })
    }
  })

  socket.on('room:leave', data => {
    try {
      const { roomId } = data

      const room = roomManager.getRoom(roomId)
      if (!room) return

      // Remove user from room
      roomManager.removeUserFromRoom(room, user.id)
      socket.leave(roomId)
      socket.data.rooms.delete(roomId)

      // Notify user
      socket.emit('room:left', { roomId })

      // Notify other users in room
      socket.to(roomId).emit('room:user_left', {
        userId: user.id,
        userCount: room.users.size,
      })

      logger.info('Room left', { socketId: socket.id, roomId, userId: user.id })
    } catch (error) {
      logger.error('Error leaving room', { socketId: socket.id, error })
    }
  })

  socket.on('room:get_users', data => {
    const { roomId } = data
    const users = roomManager.getRoomUsers(roomId)
    socket.emit('room:user_list', { roomId, users })
  })

  // --------------------------------------------------------------------
  // Document Events
  // --------------------------------------------------------------------

  socket.on('doc:open', data => {
    try {
      const { roomId, documentId } = data
      const room = roomManager.ensureRoom(roomId, 'document', documentId)

      socket.emit('doc:opened', {
        roomId,
        documentId,
        document: room.document,
      })

      logger.debug('Document opened', { socketId: socket.id, roomId, documentId, userId: user.id })
    } catch (error) {
      logger.error('Error opening document', { socketId: socket.id, error })
      socket.emit('system:error', { message: 'Failed to open document' })
    }
  })

  socket.on('doc:operation', data => {
    try {
      const { roomId, operation } = data
      const room = roomManager.getRoom(roomId)

      if (!room) {
        socket.emit('system:error', { message: 'Room not found' })
        return
      }

      // Apply operation to document
      let { content, revision } = room.document

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

      room.document = { content, revision }

      // Broadcast operation to room
      const operationMessage = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        operation,
        revision,
      }

      socket.to(roomId).emit('doc:operation_applied', operationMessage)

      // Update room activity
      room.lastActivity = new Date()

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
  })

  socket.on('doc:sync', data => {
    try {
      const { roomId } = data
      const room = roomManager.getRoom(roomId)

      if (!room) {
        socket.emit('system:error', { message: 'Room not found' })
        return
      }

      socket.emit('doc:sync', {
        roomId,
        document: room.document,
      })
    } catch (error) {
      logger.error('Error syncing document', { socketId: socket.id, error })
      socket.emit('system:error', { message: 'Failed to sync document' })
    }
  })

  // --------------------------------------------------------------------
  // Cursor Events
  // --------------------------------------------------------------------

  socket.on('cursor:move', data => {
    try {
      const { roomId, position, selection } = data
      const room = roomManager.getRoom(roomId)

      if (!room) return

      const roomUser = room.users.get(user.id)
      if (roomUser) {
        roomUser.cursor = { position, selection }
        roomUser.lastActivity = new Date()

        // Broadcast cursor update to room
        socket.to(roomId).emit('cursor:update', {
          userId: user.id,
          userName: user.name,
          color: roomUser.color,
          position,
          selection,
        })
      }
    } catch (error) {
      logger.error('Error updating cursor', { socketId: socket.id, error })
    }
  })

  socket.on('selection:update', data => {
    try {
      const { roomId, selection } = data
      const room = roomManager.getRoom(roomId)

      if (!room) return

      const roomUser = room.users.get(user.id)
      if (roomUser) {
        roomUser.cursor = {
          position: roomUser.cursor?.position || 0,
          selection,
        }
        roomUser.lastActivity = new Date()

        // Broadcast selection update to room
        socket.to(roomId).emit('selection:update', {
          userId: user.id,
          userName: user.name,
          color: roomUser.color,
          selection,
        })
      }
    } catch (error) {
      logger.error('Error updating selection', { socketId: socket.id, error })
    }
  })

  // --------------------------------------------------------------------
  // Presence Events
  // --------------------------------------------------------------------

  socket.on('presence:typing', data => {
    try {
      const { roomId, isTyping } = data
      const room = roomManager.getRoom(roomId)

      if (!room) return

      const roomUser = room.users.get(user.id)
      if (roomUser) {
        roomUser.isTyping = isTyping
        roomUser.lastActivity = new Date()

        // Broadcast typing status to room
        socket.to(roomId).emit('presence:typing', {
          userId: user.id,
          userName: user.name,
          isTyping,
        })
      }
    } catch (error) {
      logger.error('Error updating typing status', { socketId: socket.id, error })
    }
  })

  // --------------------------------------------------------------------
  // Heartbeat
  // --------------------------------------------------------------------

  socket.on('heartbeat', () => {
    socket.data.lastHeartbeat = Date.now()
  })

  // --------------------------------------------------------------------
  // Test Events (for demo)
  // --------------------------------------------------------------------

  socket.on('test:ping', (data, callback) => {
    callback({
      timestamp: new Date().toISOString(),
      message: 'pong',
      ...data,
    })
  })

  // --------------------------------------------------------------------
  // Disconnect
  // --------------------------------------------------------------------

  socket.on('disconnect', reason => {
    logger.info('Client disconnected', {
      socketId: socket.id,
      userId: user.id,
      userName: user.name,
      reason,
    })

    // Leave all rooms
    socket.data.rooms.forEach(roomId => {
      const room = roomManager.getRoom(roomId)
      if (room) {
        roomManager.removeUserFromRoom(room, user.id)

        // Notify other users
        socket.to(roomId).emit('room:user_left', {
          userId: user.id,
          userCount: room.users.size,
        })
      }
    })
  })
}

// ============================================================================
// Server Setup
// ============================================================================

function createServer() {
  // Create HTTP server
  const httpServer = http.createServer((req, res) => {
    // Simple health check endpoint
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          rooms: roomManager.rooms.size,
          connections: io.sockets.sockets.size,
        })
      )
      return
    }

    // Stats endpoint
    if (req.url === '/stats') {
      const rooms = roomManager.getAllRooms()
      const totalUsers = rooms.reduce((acc, room) => acc + room.userCount, 0)

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          connections: io.sockets.sockets.size,
          rooms: rooms.length,
          totalUsers,
          rooms: rooms,
        })
      )
      return
    }

    // Default response
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('WebSocket server is running')
  })

  // Create Socket.IO server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: ALLOWED_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 120000, // 120 seconds - increased to match client heartbeat detection (25s * 3 + margin)
    pingInterval: 25000, // 25 seconds - matches client heartbeat interval
    maxHttpBufferSize: 1e8, // 100 MB
  })

  // Use authentication middleware
  io.use(authenticateSocket)

  // Handle connections
  io.on('connection', socket => {
    setupSocketHandlers(socket)
  })

  // Start heartbeat monitoring
  setInterval(() => {
    const now = Date.now()
    io.sockets.sockets.forEach(socket => {
      const lastHeartbeat = socket.data.lastHeartbeat || 0

      // Disconnect if no heartbeat for 60 seconds
      if (now - lastHeartbeat > 60000) {
        logger.warn('Client disconnected (heartbeat timeout)', {
          socketId: socket.id,
          userId: socket.data.user?.id,
        })
        socket.disconnect(true)
      }
    })
  }, 10000)

  // Periodic room cleanup check
  setInterval(() => {
    const rooms = roomManager.getAllRooms()
    logger.debug('Room cleanup check', {
      roomCount: rooms.length,
      totalUsers: rooms.reduce((acc, r) => acc + r.userCount, 0),
    })
  }, 60000)

  return httpServer
}

// ============================================================================
// Start Server
// ============================================================================

const httpServer = createServer()

httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   WebSocket Server Started                                ║
║                                                           ║
║   Port: ${PORT.toString().padEnd(46)}║
║   CORS Origin: ${ALLOWED_ORIGIN.padEnd(39)}║
║   Log Level: ${LOG_LEVEL.padEnd(42)}║
║                                                           ║
║   Health Check: http://localhost:${PORT.toString()}/health${' '.repeat(20)}║
║   Stats: http://localhost:${PORT.toString()}/stats${' '.repeat(23)}║
║   WebSocket: ws://localhost:${PORT.toString()}${' '.repeat(27)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `)

  logger.info('WebSocket server started', { PORT, ALLOWED_ORIGIN, LOG_LEVEL })
})

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...')
  httpServer.close(() => {
    logger.info('WebSocket server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...')
  httpServer.close(() => {
    logger.info('WebSocket server closed')
    process.exit(0)
  })
})

// ============================================================================
// Error Handling
// ============================================================================

process.on('uncaughtException', error => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack })
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise })
})
