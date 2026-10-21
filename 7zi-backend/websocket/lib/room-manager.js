'use strict'

/**
 * Room management for the WebSocket server.
 *
 * Extracted from websocket-server.js (class RoomManager) into a pure module so
 * it can be unit tested without a running server. Behaviour is unchanged.
 */

const USER_COLORS = [
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

const DEFAULT_CLEANUP_DELAY_MS = 30 * 60 * 1000

class RoomManager {
  /**
   * @param {object} [options]
   * @param {object} [options.logger]   logger with .info/.debug/.warn/.error
   * @param {function}[options.setTimeoutFn] injectable timer (for tests)
   * @param {function}[options.clearTimeoutFn]
   */
  constructor(options = {}) {
    this.rooms = new Map()
    this.cleanupTimers = new Map()
    this.logger = options.logger || console
    this.setTimeoutFn = options.setTimeoutFn || setTimeout
    this.clearTimeoutFn = options.clearTimeoutFn || clearTimeout
  }

  log(level, message, data) {
    const fn = this.logger[level]
    if (typeof fn === 'function') fn.call(this.logger, message, data)
  }

  generateColor(userId) {
    const hash = String(userId)
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return USER_COLORS[hash % USER_COLORS.length]
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
    this.log('info', 'Room created', { roomId, type, documentId })

    return room
  }

  ensureRoom(roomId, type, documentId, name) {
    return this.getRoom(roomId) || this.createRoom(roomId, type, documentId, name)
  }

  addUserToRoom(room, user) {
    room.users.set(user.id, user)
    room.lastActivity = new Date()

    this.log('info', 'User joined room', {
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

      this.log('info', 'User left room', {
        roomId: room.id,
        userId,
        userName: user.name,
        userCount: room.users.size,
      })

      // Auto-destroy empty room after 30 minutes
      if (room.users.size === 0 && room.type !== 'project') {
        this.scheduleRoomCleanup(room.id, DEFAULT_CLEANUP_DELAY_MS)
      }
    }
  }

  getRoomUsers(roomId) {
    const room = this.getRoom(roomId)
    return room ? Array.from(room.users.values()) : []
  }

  scheduleRoomCleanup(roomId, delay) {
    const existingTimer = this.cleanupTimers.get(roomId)
    if (existingTimer) {
      this.clearTimeoutFn(existingTimer)
    }

    const timer = this.setTimeoutFn(() => {
      const room = this.getRoom(roomId)
      if (room && room.users.size === 0) {
        this.rooms.delete(roomId)
        this.cleanupTimers.delete(roomId)
        this.log('info', 'Room destroyed (idle)', { roomId })
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

  /** Test helper: cancel all pending cleanup timers. */
  disposeAllTimers() {
    this.cleanupTimers.forEach(timer => this.clearTimeoutFn(timer))
    this.cleanupTimers.clear()
  }
}

module.exports = { RoomManager, USER_COLORS, DEFAULT_CLEANUP_DELAY_MS }
