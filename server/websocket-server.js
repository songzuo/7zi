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
 *   PORT - WebSocket server port (default: 3002)
 *   NEXT_PUBLIC_SITE_URL - Allowed CORS origin (default: http://localhost:3000)
 *   LOG_LEVEL - Logging level (default: info)
 *   JWT_SECRET - Required in production (>= 64 chars recommended for HS256)
 *   WS_STRICT_AUTH - Set to "true" to reject connections without a valid JWT
 *                     instead of falling back to demo mode (default: false)
 *
 * Note: the testable logic lives in ./lib/*.js (pure modules) so it can be
 * unit tested without booting a server. This file stays the thin composition
 * root / process entry point.
 */

const { loadConfig } = require('./lib/config')
const { getJWTSecret } = require('./lib/jwt-secret')
const { RoomManager } = require('./lib/room-manager')
const { createAuthenticator } = require('./lib/auth')
const { setupSocketHandlers } = require('./lib/handlers')
const { createServer: createSocketServer } = require('./lib/server')

// ============================================================================
// Configuration
// ============================================================================

const { PORT, ALLOWED_ORIGIN, LOG_LEVEL } = loadConfig(process.env)

// JWT Secret (should match the one in Next.js app)
// Security: Must be set in production; only has dev fallback for non-production environments
const JWT_SECRET = getJWTSecret()

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

const roomManager = new RoomManager({ logger })

// ============================================================================
// Authentication
// ============================================================================

const STRICT_AUTH = String(process.env.WS_STRICT_AUTH || '').toLowerCase() === 'true'

const authenticateSocket = createAuthenticator({
  jwtSecret: JWT_SECRET,
  allowDemoMode: !STRICT_AUTH,
  logger,
})

// ============================================================================
// Server Setup
// ============================================================================

function createServer() {
  const { httpServer } = createSocketServer({
    roomManager,
    authenticateSocket,
    logger,
    config: { PORT, ALLOWED_ORIGIN, LOG_LEVEL },
    setupSocketHandlers: socket => setupSocketHandlers(socket, { roomManager, logger }),
  })

  return httpServer
}

// ============================================================================
// Start Server
// ============================================================================

function startServer(port = PORT) {
  const httpServer = createServer()

  httpServer.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   WebSocket Server Started                                ║
║                                                           ║
║   Port: ${port.toString().padEnd(46)}║
║   CORS Origin: ${ALLOWED_ORIGIN.padEnd(39)}║
║   Log Level: ${LOG_LEVEL.padEnd(42)}║
║                                                           ║
║   Health Check: http://localhost:${port.toString()}/health${' '.repeat(20)}║
║   Stats: http://localhost:${port.toString()}/stats${' '.repeat(23)}║
║   WebSocket: ws://localhost:${port.toString()}${' '.repeat(27)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `)

    logger.info('WebSocket server started', { PORT: port, ALLOWED_ORIGIN, LOG_LEVEL })
  })

  // ==========================================================================
  // Graceful Shutdown
  // ==========================================================================

  const shutdown = signal => {
    logger.info(`${signal} received, shutting down gracefully...`)
    httpServer.close(() => {
      logger.info('WebSocket server closed')
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  return httpServer
}

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

module.exports = {
  createServer,
  startServer,
  roomManager,
  logger,
  config: { PORT, ALLOWED_ORIGIN, LOG_LEVEL },
  jwtSecret: JWT_SECRET,
  strictAuth: STRICT_AUTH,
}

// Only boot the server when executed directly (keeps `node websocket-server.js`
// behaviour unchanged while making the module require-able from tests).
if (require.main === module) {
  startServer()
}
