/**
 * Sentry APM Integration for WebSocket Server
 *
 * Provides distributed tracing and performance monitoring for:
 * - Socket connections
 * - Room management (join/leave)
 * - Message operations
 * - Document collaboration
 *
 * Usage:
 *   const sentryWS = require('./sentry-ws');
 *   sentryWS.init();
 */

const Sentry = require('@sentry/node')

// ============================================================================
// Configuration
// ============================================================================

const config = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate:
    parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) ||
    (process.env.NODE_ENV === 'production' ? 0.1 : 1.0),
  enabled: !!process.env.SENTRY_DSN || !!process.env.NEXT_PUBLIC_SENTRY_DSN,
}

// Track active transactions
const activeTransactions = new Map()

// ============================================================================
// Initialization
// ============================================================================

function init() {
  if (!config.enabled) {
    console.log('[Sentry-WS] Sentry APM disabled (no DSN configured)')
    return
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,
    release: process.env.SENTRY_RELEASE || 'websocket-server@1.0.0',
    debug: process.env.NODE_ENV === 'development',

    // integrations
    integrations: [
      // HTTP integration for outgoing requests
      new Sentry.httpIntegration(),
    ],

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove auth headers
      if (event.request?.headers) {
        delete event.request.headers.authorization
        delete event.request.headers.cookie
      }
      return event
    },
  })

  console.log(
    '[Sentry-WS] Initialized with DSN:',
    config.dsn ? config.dsn.substring(0, 20) + '...' : 'none'
  )
  console.log('[Sentry-WS] Environment:', config.environment)
  console.log('[Sentry-WS] Traces sample rate:', config.tracesSampleRate)
}

// ============================================================================
// Transaction Management
// ============================================================================

/**
 * Start a new transaction for socket connection
 */
function startConnectionTransaction(socketId, userId) {
  if (!config.enabled) return null

  const transaction = Sentry.startSpan(
    {
      name: `socket.connection`,
      op: 'websocket.connection',
      attributes: {
        'socket.id': socketId,
        'user.id': userId,
      },
    },
    () => transaction
  )

  activeTransactions.set(socketId, transaction)
  return transaction
}

/**
 * End a connection transaction
 */
function endConnectionTransaction(socketId, error = null) {
  const transaction = activeTransactions.get(socketId)
  if (!transaction) return

  if (error) {
    transaction.setStatus({
      code: Sentry.SpanStatusCode.ERROR,
      message: error.message || 'Connection error',
    })
    Sentry.captureException(error)
  } else {
    transaction.setStatus({ code: Sentry.SpanStatusCode.OK })
  }

  transaction.end()
  activeTransactions.delete(socketId)
}

/**
 * Start a span for room operation
 */
function startRoomSpan(socketId, operation, roomId, userId) {
  if (!config.enabled) return null

  const transaction = activeTransactions.get(socketId)
  if (!transaction) return null

  const span = transaction.startChild({
    op: `room.${operation}`,
    description: `room:${operation} - ${roomId}`,
    attributes: {
      'room.id': roomId,
      'user.id': userId,
    },
  })

  return span
}

/**
 * End a room span
 */
function endRoomSpan(span, error = null) {
  if (!span) return

  if (error) {
    span.setStatus({
      code: Sentry.SpanStatusCode.ERROR,
      message: error.message || 'Room operation error',
    })
  } else {
    span.setStatus({ code: Sentry.SpanStatusCode.OK })
  }

  span.end()
}

/**
 * Start a span for message operation
 */
function startMessageSpan(socketId, operation, roomId) {
  if (!config.enabled) return null

  const transaction = activeTransactions.get(socketId)
  if (!transaction) return null

  const span = transaction.startChild({
    op: `message.${operation}`,
    description: `message:${operation}`,
    attributes: {
      'room.id': roomId,
      'message.operation': operation,
    },
  })

  return span
}

// ============================================================================
// Error Capture Helpers
// ============================================================================

/**
 * Capture an error with context
 */
function captureError(error, context = {}) {
  if (!config.enabled) return

  Sentry.withScope(scope => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value)
    })
    Sentry.captureException(error)
  })
}

/**
 * Capture a message event
 */
function captureMessage(message, level = 'info', context = {}) {
  if (!config.enabled) return

  Sentry.withScope(scope => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value)
    })
    Sentry.captureMessage(message, level)
  })
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Get Sentry APM status
 */
function getStatus() {
  return {
    enabled: config.enabled,
    dsn: config.dsn ? config.dsn.substring(0, 20) + '...' : null,
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,
    activeTransactions: activeTransactions.size,
  }
}

// ============================================================================
// Export
// ============================================================================

module.exports = {
  init,
  startConnectionTransaction,
  endConnectionTransaction,
  startRoomSpan,
  endRoomSpan,
  startMessageSpan,
  captureError,
  captureMessage,
  getStatus,
  Sentry,
}
