'use strict'

/**
 * Socket event handlers for the WebSocket server.
 *
 * Extracted from websocket-server.js (setupSocketHandlers) into a pure module
 * so the room / document / cursor / presence / heartbeat behaviour can be unit
 * tested with a fake socket object (no network, no real Socket.IO server).
 *
 * The handler contract is identical to the original: it registers the same
 * event names and emits the same payloads.
 */

const crypto = require('crypto')

/**
 * Apply an OT operation to a document snapshot.
 * Pure function - returns a new { content, revision } object.
 *
 * @param {{content: string, revision: number}} document
 * @param {object} operation
 */
function applyOperation(document, operation) {
  let { content, revision } = document

  if (operation && operation.type === 'insert' && operation.content) {
    content =
      content.slice(0, operation.position) +
      operation.content +
      content.slice(operation.position)
  } else if (operation && operation.type === 'delete' && operation.length) {
    content =
      content.slice(0, operation.position) +
      content.slice(operation.position + operation.length)
  }

  revision++

  return { content, revision }
}

/**
 * @param {object} options
 * @param {object} options.roomManager  RoomManager instance
 * @param {object} [options.logger]
 */
function setupSocketHandlers(socket, options = {}) {
  const roomManager = options.roomManager
  const logger = options.logger || console
  const user = socket.data.user

  function log(level, message, data) {
    const fn = logger[level]
    if (typeof fn === 'function') fn.call(logger, message, data)
  }

  log('info', 'New connection', { socketId: socket.id, userId: user.id, userName: user.name })

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

      log('debug', 'Room join request', { socketId: socket.id, roomId, type, userId: user.id })

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

      log('info', 'Room joined', { socketId: socket.id, roomId, userId: user.id })
    } catch (error) {
      log('error', 'Error joining room', { socketId: socket.id, error })
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

      log('info', 'Room left', { socketId: socket.id, roomId, userId: user.id })
    } catch (error) {
      log('error', 'Error leaving room', { socketId: socket.id, error })
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

      log('debug', 'Document opened', { socketId: socket.id, roomId, documentId, userId: user.id })
    } catch (error) {
      log('error', 'Error opening document', { socketId: socket.id, error })
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

      const nextDocument = applyOperation(room.document, operation)
      room.document = nextDocument

      // Broadcast operation to room
      const operationMessage = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        operation,
        revision: nextDocument.revision,
      }

      socket.to(roomId).emit('doc:operation_applied', operationMessage)

      // Update room activity
      room.lastActivity = new Date()

      log('debug', 'Document operation applied', {
        socketId: socket.id,
        roomId,
        operation,
        revision: nextDocument.revision,
      })
    } catch (error) {
      log('error', 'Error applying operation', { socketId: socket.id, error })
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
      log('error', 'Error syncing document', { socketId: socket.id, error })
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
      log('error', 'Error updating cursor', { socketId: socket.id, error })
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
          position: (roomUser.cursor && roomUser.cursor.position) || 0,
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
      log('error', 'Error updating selection', { socketId: socket.id, error })
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
      log('error', 'Error updating typing status', { socketId: socket.id, error })
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
    if (typeof callback !== 'function') return
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
    log('info', 'Client disconnected', {
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

module.exports = { setupSocketHandlers, applyOperation }
