'use strict'

/**
 * Socket authentication middleware factory.
 *
 * Extracted from websocket-server.js (authenticateSocket) so it can be unit
 * tested without booting a Socket.IO server.
 *
 * Two modes:
 *
 *  - strict mode (allowDemoMode === false)
 *      Missing token     -> rejected with Error('Authentication token required')
 *      Invalid token     -> rejected with Error('Invalid token')
 *      Expired token     -> rejected with Error('Invalid token')
 *      Valid token       -> socket.data.user populated from claims
 *
 *  - demo mode (allowDemoMode === true, the historical/default behaviour)
 *      Missing / invalid / expired token -> connection is still accepted and a
 *      synthetic demo user is created. This is the behaviour that the original
 *      websocket-server.js had unconditionally; see the defect list in
 *      P1-7_WEBSOCKET_TESTS_20261021.md.
 */

const jwt = require('jsonwebtoken')

/**
 * @param {object}  options
 * @param {string}  options.jwtSecret
 * @param {boolean} [options.allowDemoMode=false]
 * @param {object}  [options.logger]
 * @param {function}[options.randomId] injectable random id generator
 */
function createAuthenticator(options = {}) {
  const jwtSecret = options.jwtSecret
  const allowDemoMode = options.allowDemoMode === true
  const logger = options.logger || console
  const randomId = options.randomId || (() => `user-${Math.random().toString(36).substr(2, 9)}`)

  function log(level, message, data) {
    const fn = logger[level]
    if (typeof fn === 'function') fn.call(logger, message, data)
  }

  function buildDemoUser(socket) {
    const auth = socket.handshake.auth || {}
    const demoUserId = auth.userId || randomId()
    const demoUserName = auth.userName || `User ${Math.floor(Math.random() * 1000)}`

    return {
      id: demoUserId,
      name: demoUserName,
      email: `${demoUserId}@demo.local`,
      avatar: null,
    }
  }

  function initSocketData(socket, user) {
    socket.data.user = user
    socket.data.lastHeartbeat = Date.now()
    socket.data.rooms = new Set()
  }

  /**
   * @param {object} socket  a Socket.IO socket-like object
   * @param {function} next  continuation
   */
  return async function authenticateSocket(socket, next) {
    try {
      const auth = socket.handshake.auth || {}
      const token = auth.token

      if (!token) {
        if (!allowDemoMode) {
          log('warn', 'Connection rejected: No token provided', { socketId: socket.id })
          return next(new Error('Authentication token required'))
        }

        log('warn', 'Connection accepted: No token provided (demo mode)', { socketId: socket.id })
        initSocketData(socket, buildDemoUser(socket))
        return next()
      }

      let decoded
      try {
        decoded = jwt.verify(token, jwtSecret)
      } catch (error) {
        if (!allowDemoMode) {
          log('warn', 'Connection rejected: Invalid token', {
            socketId: socket.id,
            error: error.message,
          })
          return next(new Error('Invalid token'))
        }

        log('warn', 'Connection accepted with invalid token (demo mode)', {
          socketId: socket.id,
          error: error.message,
        })
        initSocketData(socket, buildDemoUser(socket))
        return next()
      }

      if (!decoded || !decoded.userId) {
        log('warn', 'Connection rejected: Invalid token', { socketId: socket.id })
        return next(new Error('Invalid token'))
      }

      socket.data.user = {
        id: decoded.userId,
        name: decoded.name || decoded.userId,
        email: decoded.email,
        avatar: decoded.avatar,
      }
      socket.data.lastHeartbeat = Date.now()
      socket.data.rooms = new Set()

      log('info', 'User authenticated', {
        socketId: socket.id,
        userId: socket.data.user.id,
        userName: socket.data.user.name,
      })

      next()
    } catch (error) {
      if (!allowDemoMode) {
        log('error', 'Connection rejected: authentication error', {
          socketId: socket.id,
          error: error.message,
        })
        return next(new Error('Invalid token'))
      }

      log('warn', 'Connection accepted with invalid token (demo mode)', {
        socketId: socket.id,
        error: error.message,
      })
      initSocketData(socket, buildDemoUser(socket))
      next()
    }
  }
}

module.exports = { createAuthenticator }
