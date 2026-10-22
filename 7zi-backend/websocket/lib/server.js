'use strict'

/**
 * HTTP + Socket.IO server factory for the WebSocket service.
 *
 * Extracted from server/websocket-server.js so the wiring (health/stats
 * endpoints, Socket.IO CORS options, heartbeat monitoring, room cleanup
 * interval, graceful shutdown) can be unit tested without booting a process.
 */

const http = require('http')
const { Server: SocketIOServer } = require('socket.io')

const HEARTBEAT_TIMEOUT_MS = 60000
const HEARTBEAT_INTERVAL_MS = 10000
const ROOM_CLEANUP_INTERVAL_MS = 60000

/**
 * @param {object} options
 * @param {object} options.roomManager
 * @param {function} options.authenticateSocket  Socket.IO middleware
 * @param {object} options.logger
 * @param {object} options.config               { PORT, ALLOWED_ORIGIN, LOG_LEVEL }
 * @returns {{ httpServer: import('http').Server, io: SocketIOServer }}
 */
function createServer(options = {}) {
  const { roomManager, authenticateSocket, logger = console, config = {} } = options
  const { ALLOWED_ORIGIN = 'http://localhost:3000' } = config

  const httpServer = http.createServer((req, res) => {
    // Simple health check endpoint
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          // `roomCount` is the canonical name of the room counter.
          // `rooms` is kept as a backwards-compatible alias (it has always
          // been a number on /health).
          roomCount: roomManager.rooms.size,
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
          // `roomCount` carries the number of rooms, `rooms` carries the
          // room array itself. Previously both were declared under the key
          // `rooms`, so the count was silently overwritten by the array.
          roomCount: rooms.length,
          totalUsers,
          rooms,
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
  if (authenticateSocket) {
    io.use(authenticateSocket)
  }

  // Handle connections
  io.on('connection', socket => {
    if (options.setupSocketHandlers) {
      options.setupSocketHandlers(socket)
    }
  })

  // Start heartbeat monitoring
  const heartbeatInterval = setInterval(() => {
    const now = Date.now()
    io.sockets.sockets.forEach(socket => {
      const lastHeartbeat = socket.data.lastHeartbeat || 0

      // Disconnect if no heartbeat for 60 seconds
      if (now - lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
        logger.warn('Client disconnected (heartbeat timeout)', {
          socketId: socket.id,
          userId: socket.data.user?.id,
        })
        socket.disconnect(true)
      }
    })
  }, HEARTBEAT_INTERVAL_MS)

  // Periodic room cleanup check
  const cleanupInterval = setInterval(() => {
    const rooms = roomManager.getAllRooms()
    logger.debug('Room cleanup check', {
      roomCount: rooms.length,
      totalUsers: rooms.reduce((acc, r) => acc + r.userCount, 0),
    })
  }, ROOM_CLEANUP_INTERVAL_MS)

  // Allow the intervals to be unref'd so a test process can exit cleanly.
  if (typeof heartbeatInterval.unref === 'function') heartbeatInterval.unref()
  if (typeof cleanupInterval.unref === 'function') cleanupInterval.unref()

  httpServer.on('close', () => {
    clearInterval(heartbeatInterval)
    clearInterval(cleanupInterval)
  })

  httpServer.io = io

  return { httpServer, io }
}

module.exports = {
  createServer,
  HEARTBEAT_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  ROOM_CLEANUP_INTERVAL_MS,
}
