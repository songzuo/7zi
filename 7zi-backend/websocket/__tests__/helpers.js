'use strict'

/**
 * Shared helpers for the WebSocket server test suite.
 * No network access, no real timers, no production ports.
 */

const path = require('path')

const LIB_DIR = path.join(__dirname, '..', 'lib')

const config = require(path.join(LIB_DIR, 'config'))
const jwtSecret = require(path.join(LIB_DIR, 'jwt-secret'))
const roomManager = require(path.join(LIB_DIR, 'room-manager'))
const auth = require(path.join(LIB_DIR, 'auth'))
const handlers = require(path.join(LIB_DIR, 'handlers'))

/** 64-char secret (HS256 recommended minimum). */
const TEST_SECRET = 't'.repeat(64)

/** Silent logger used by most tests. */
function createSilentLogger() {
  const noop = () => {}
  return { info: noop, debug: noop, warn: noop, error: noop }
}

/** Logger that records everything it receives. */
function createRecordingLogger() {
  const records = { info: [], debug: [], warn: [], error: [] }
  const logger = {
    info: (msg, data) => records.info.push({ msg, data }),
    debug: (msg, data) => records.debug.push({ msg, data }),
    warn: (msg, data) => records.warn.push({ msg, data }),
    error: (msg, data) => records.error.push({ msg, data }),
  }
  logger.records = records
  /** Test helper: all messages logged at a given level, joined. */
  logger.messages = level => records[level].map(r => r.msg).join('\n')
  return logger
}

/**
 * Minimal Socket.IO socket double.
 * Records emitted events, joined/left rooms, and lets tests trigger handlers.
 */
function createFakeSocket(options = {}) {
  const { user, handshakeAuth = {}, socketId = 'socket-test' } = options

  const handlersByEvent = new Map()
  const emitted = []
  const joinedRooms = []
  const leftRooms = []
  const broadcasted = []

  const socket = {
    id: socketId,
    data: {
      user: user || {
        id: 'user-1',
        name: 'User One',
        email: 'user1@example.com',
        avatar: null,
      },
      lastHeartbeat: 0,
      rooms: new Set(),
    },
    handshake: { auth: handshakeAuth },

    on(event, handler) {
      if (!handlersByEvent.has(event)) handlersByEvent.set(event, [])
      handlersByEvent.get(event).push(handler)
      return socket
    },

    emit(event, payload) {
      emitted.push({ event, payload })
      return true
    },

    join(room) {
      joinedRooms.push(room)
    },

    leave(room) {
      leftRooms.push(room)
    },

    to(room) {
      return {
        emit(event, payload) {
          broadcasted.push({ room, event, payload })
        },
      }
    },

    /** Test helper: fire a registered event handler. */
    trigger(event, ...args) {
      const list = handlersByEvent.get(event)
      if (!list || list.length === 0) {
        throw new Error(`No handler registered for event "${event}"`)
      }
      list.forEach(handler => handler(...args))
    },

    /** Test helper: last emitted event of a given name. */
    lastEmitted(event) {
      for (let i = emitted.length - 1; i >= 0; i--) {
        if (emitted[i].event === event) return emitted[i].payload
      }
      return undefined
    },

    /** Test helper: all emitted events of a given name. */
    emittedOf(event) {
      return emitted.filter(e => e.event === event).map(e => e.payload)
    },

    /** Test helper: all broadcasts of a given name. */
    broadcastedOf(event) {
      return broadcasted.filter(b => b.event === event).map(b => b.payload)
    },
  }

  socket.emitted = emitted
  socket.joinedRooms = joinedRooms
  socket.leftRooms = leftRooms
  socket.broadcasted = broadcasted
  socket.handlersByEvent = handlersByEvent

  return socket
}

/**
 * RoomManager with fake timers so no real timers are left dangling.
 */
function createTestRoomManager() {
  const timers = new Map()
  let nextTimerId = 1

  const manager = new roomManager.RoomManager({
    logger: createSilentLogger(),
    setTimeoutFn: (fn, delay) => {
      const id = nextTimerId++
      timers.set(id, { fn, delay })
      return id
    },
    clearTimeoutFn: id => {
      timers.delete(id)
    },
  })

  manager.fakeTimers = timers
  /** Manually fire a scheduled cleanup timer. */
  manager.runTimers = () => {
    const pending = Array.from(timers.values())
    timers.clear()
    pending.forEach(t => t.fn())
  }
  return manager
}

/** Build a valid JWT for the given payload using the test secret. */
function signToken(payload, options = {}) {
  const jwt = require('jsonwebtoken')
  return jwt.sign(payload, options.secret || TEST_SECRET, {
    expiresIn: options.expiresIn || '1h',
    ...(options.signOptions || {}),
  })
}

module.exports = {
  LIB_DIR,
  config,
  jwtSecret,
  roomManager,
  auth,
  handlers,
  TEST_SECRET,
  createSilentLogger,
  createRecordingLogger,
  createFakeSocket,
  createTestRoomManager,
  signToken,
}
