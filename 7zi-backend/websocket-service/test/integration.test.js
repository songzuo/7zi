'use strict'

const { test, describe, before, after } = require('node:test')
const assert = require('node:assert')
const { io } = require('socket.io-client')
const { createServer } = require('../src/index.js')

const TEST_PORT = 3003
const BASE_URL = `http://localhost:${TEST_PORT}`

describe('WebSocket Service Integration', () => {
  let httpServer

  before(async () => {
    process.env.PORT = String(TEST_PORT)
    process.env.JWT_SECRET = 'test-secret'
    process.env.LOG_LEVEL = 'error'
    httpServer = createServer()
    await new Promise((resolve) => httpServer.listen(TEST_PORT, resolve))
  })

  after(() => {
    httpServer.close()
  })

  // ── HTTP Endpoints ───────────────────────────────────────────────

  test('GET /health returns 200 with status ok', async () => {
    const res = await fetch(`${BASE_URL}/health`)
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.status, 'ok')
    assert.strictEqual(body.service, 'websocket-service')
    assert.ok(body.timestamp)
    assert.ok(typeof body.rooms === 'number')
    assert.ok(typeof body.connections === 'number')
  })

  test('GET /stats returns connection statistics', async () => {
    const res = await fetch(`${BASE_URL}/stats`)
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.ok(typeof body.connections === 'number')
    // Note: the stats endpoint returns rooms as an array (last key wins over rooms:rooms.length)
    assert.ok(Array.isArray(body.rooms))
    assert.ok(typeof body.totalUsers === 'number')
  })

  test('GET /api/v1/ws/health is an alias for /health', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/ws/health`)
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.status, 'ok')
  })

  test('GET /api/v1/ws/rooms/:id returns 404 for non-existent room', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/ws/rooms/nonexistent-room-xyz`)
    assert.strictEqual(res.status, 404)
  })

  // ── Connection ──────────────────────────────────────────────────

  test('connects without token (demo mode)', (t, done) => {
    const socket = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionDelay: 0,
      timeout: 5000,
    })
    socket.on('connect', () => { done() })
    socket.on('connect_error', (err) => { done(new Error(`Connection failed: ${err.message}`)) })
    t.test({ cleanup: () => socket.close() })
  })

  test('receives auth:authenticated on connection', (t, done) => {
    const socket = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionDelay: 0,
      timeout: 5000,
      auth: { userName: 'TestUser', userId: 'user-integration-1' },
    })
    socket.on('auth:authenticated', (data) => {
      try {
        assert.ok(data.userId)
        assert.strictEqual(data.name, 'TestUser')
        done()
      } catch (e) { done(e) }
    })
    socket.on('connect_error', (err) => done(new Error(`Connection failed: ${err.message}`)))
    t.test({ cleanup: () => socket.close() })
  })

  // ── Room Management ────────────────────────────────────────────

  test('room:join joins a room and receives room:joined', (t, done) => {
    const socket = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionDelay: 0,
      timeout: 5000,
      auth: { userId: 'user-join-1', userName: 'JoinUser' },
    })
    socket.on('auth:authenticated', () => {
      socket.emit('room:join', { roomId: 'test-room-join-1', type: 'document', documentId: 'doc-1', name: 'Join Test Room' })
    })
    socket.on('room:joined', (data) => {
      try {
        assert.strictEqual(data.roomId, 'test-room-join-1')
        assert.ok(Array.isArray(data.users))
        assert.strictEqual(data.users[0].name, 'JoinUser')
        assert.ok(data.document)
        done()
      } catch (e) { done(e) }
    })
    socket.on('connect_error', (err) => done(new Error(`Connection failed: ${err.message}`)))
    t.test({ cleanup: () => socket.close() })
  })

  test('room:leave leaves a room and receives room:left', (t, done) => {
    const socket = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionDelay: 0,
      timeout: 5000,
      auth: { userId: 'user-leave-1', userName: 'LeaveUser' },
    })
    socket.on('auth:authenticated', () => {
      socket.emit('room:join', { roomId: 'test-room-leave-1', type: 'document', documentId: 'doc-1', name: 'Leave Test Room' })
    })
    socket.on('room:joined', () => {
      socket.emit('room:leave', { roomId: 'test-room-leave-1' })
    })
    socket.on('room:left', (data) => {
      try {
        assert.strictEqual(data.roomId, 'test-room-leave-1')
        done()
      } catch (e) { done(e) }
    })
    socket.on('connect_error', (err) => done(new Error(`Connection failed: ${err.message}`)))
    t.test({ cleanup: () => socket.close() })
  })

  test('second user joining room triggers room:user_joined on first user', (t, done) => {
    const socket1 = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionDelay: 0,
      timeout: 5000,
      auth: { userId: 'user-multi-1', userName: 'UserOne' },
    })
    const socket2 = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionDelay: 0,
      timeout: 5000,
      auth: { userId: 'user-multi-2', userName: 'UserTwo' },
    })
    socket1.on('auth:authenticated', () => {
      socket1.emit('room:join', { roomId: 'test-room-multi', type: 'document', documentId: 'doc-multi', name: 'Multi User Room' })
    })
    socket1.on('room:joined', () => {
      socket2.emit('room:join', { roomId: 'test-room-multi', type: 'document', documentId: 'doc-multi', name: 'Multi User Room' })
    })
    socket1.on('room:user_joined', (data) => {
      try {
        assert.strictEqual(data.user.name, 'UserTwo')
        assert.strictEqual(data.userCount, 2)
        done()
      } catch (e) { done(e) }
    })
    const errors = []
    socket1.on('connect_error', (err) => errors.push(`S1: ${err.message}`))
    socket2.on('connect_error', (err) => errors.push(`S2: ${err.message}`))
    if (errors.length > 0) done(new Error(errors.join(', ')))
    t.test({ cleanup: () => { socket1.close(); socket2.close() } })
  })

  // ── Disconnect Cleanup ─────────────────────────────────────────

  test('disconnect removes user from room and broadcasts room:user_left', (t, done) => {
    const socket1 = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionDelay: 0,
      timeout: 5000,
      auth: { userId: 'user-disconnect-1', userName: 'DisconnectUser1' },
    })
    const socket2 = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionDelay: 0,
      timeout: 5000,
      auth: { userId: 'user-disconnect-2', userName: 'DisconnectUser2' },
    })
    socket1.on('auth:authenticated', () => {
      socket1.emit('room:join', { roomId: 'test-room-disconnect', type: 'document', documentId: 'doc-disconnect', name: 'Disconnect Room' })
    })
    socket1.on('room:joined', () => {
      socket2.emit('room:join', { roomId: 'test-room-disconnect', type: 'document', documentId: 'doc-disconnect', name: 'Disconnect Room' })
    })
    socket2.on('room:joined', () => {
      socket1.disconnect()
    })
    socket2.on('room:user_left', (data) => {
      try {
        assert.strictEqual(data.userId, 'user-disconnect-1')
        done()
      } catch (e) { done(e) }
    })
    socket1.on('connect_error', (err) => done(new Error(`S1: ${err.message}`)))
    socket2.on('connect_error', (err) => done(new Error(`S2: ${err.message}`)))
    t.test({ cleanup: () => { socket1.close(); socket2.close() } })
  })

  // ── Cursor & Presence ──────────────────────────────────────────

  test('cursor:move broadcasts cursor:update to other users', (t, done) => {
    const socket1 = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionDelay: 0,
      timeout: 5000,
      auth: { userId: 'user-cursor-1', userName: 'CursorUser1' },
    })
    const socket2 = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionDelay: 0,
      timeout: 5000,
      auth: { userId: 'user-cursor-2', userName: 'CursorUser2' },
    })
    socket1.on('auth:authenticated', () => {
      socket1.emit('room:join', { roomId: 'test-room-cursor', type: 'document', documentId: 'doc-cursor', name: 'Cursor Room' })
    })
    socket1.on('room:joined', () => {
      socket2.emit('room:join', { roomId: 'test-room-cursor', type: 'document', documentId: 'doc-cursor', name: 'Cursor Room' })
    })
    socket2.on('room:joined', () => {
      socket1.emit('cursor:move', { roomId: 'test-room-cursor', position: 42, selection: { start: 40, end: 45 } })
    })
    socket2.on('cursor:update', (data) => {
      try {
        assert.strictEqual(data.userId, 'user-cursor-1')
        assert.strictEqual(data.position, 42)
        done()
      } catch (e) { done(e) }
    })
    socket1.on('connect_error', (err) => done(new Error(`S1: ${err.message}`)))
    socket2.on('connect_error', (err) => done(new Error(`S2: ${err.message}`)))
    t.test({ cleanup: () => { socket1.close(); socket2.close() } })
  })

  test('presence:typing broadcasts typing status to other users', (t, done) => {
    const socket1 = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionDelay: 0,
      timeout: 5000,
      auth: { userId: 'user-typing-1', userName: 'TypingUser1' },
    })
    const socket2 = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionDelay: 0,
      timeout: 5000,
      auth: { userId: 'user-typing-2', userName: 'TypingUser2' },
    })
    socket1.on('auth:authenticated', () => {
      socket1.emit('room:join', { roomId: 'test-room-typing', type: 'document', documentId: 'doc-typing', name: 'Typing Room' })
    })
    socket1.on('room:joined', () => {
      socket2.emit('room:join', { roomId: 'test-room-typing', type: 'document', documentId: 'doc-typing', name: 'Typing Room' })
    })
    socket2.on('room:joined', () => {
      socket1.emit('presence:typing', { roomId: 'test-room-typing', isTyping: true })
    })
    socket2.on('presence:typing', (data) => {
      try {
        assert.strictEqual(data.userId, 'user-typing-1')
        assert.strictEqual(data.isTyping, true)
        done()
      } catch (e) { done(e) }
    })
    socket1.on('connect_error', (err) => done(new Error(`S1: ${err.message}`)))
    socket2.on('connect_error', (err) => done(new Error(`S2: ${err.message}`)))
    t.test({ cleanup: () => { socket1.close(); socket2.close() } })
  })

  // ── Document Operations ─────────────────────────────────────────

  test('doc:operation broadcasts doc:operation_applied to other users', (t, done) => {
    const socket1 = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionDelay: 0,
      timeout: 5000,
      auth: { userId: 'user-doc-1', userName: 'DocUser1' },
    })
    const socket2 = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionDelay: 0,
      timeout: 5000,
      auth: { userId: 'user-doc-2', userName: 'DocUser2' },
    })
    socket1.on('auth:authenticated', () => {
      socket1.emit('room:join', { roomId: 'test-room-doc', type: 'document', documentId: 'doc-ot', name: 'Doc Room' })
    })
    socket1.on('room:joined', () => {
      socket2.emit('room:join', { roomId: 'test-room-doc', type: 'document', documentId: 'doc-ot', name: 'Doc Room' })
    })
    socket2.on('room:joined', () => {
      socket1.emit('doc:operation', {
        roomId: 'test-room-doc',
        operation: { type: 'insert', position: 0, content: 'Hello World' },
      })
    })
    socket2.on('doc:operation_applied', (data) => {
      try {
        assert.strictEqual(data.operation.type, 'insert')
        assert.strictEqual(data.operation.content, 'Hello World')
        assert.strictEqual(data.userId, 'user-doc-1')
        done()
      } catch (e) { done(e) }
    })
    socket1.on('connect_error', (err) => done(new Error(`S1: ${err.message}`)))
    socket2.on('connect_error', (err) => done(new Error(`S2: ${err.message}`)))
    t.test({ cleanup: () => { socket1.close(); socket2.close() } })
  })

  // ── test:ping ──────────────────────────────────────────────────

  test('test:ping returns pong with payload', (t, done) => {
    const socket = io(BASE_URL, {
      transports: ['websocket'],
      reconnectionDelay: 0,
      timeout: 5000,
      auth: { userId: 'user-ping-1', userName: 'PingUser' },
    })
    socket.on('connect', () => {
      socket.emit('test:ping', { foo: 'bar' }, (response) => {
        try {
          assert.strictEqual(response.message, 'pong')
          assert.strictEqual(response.foo, 'bar')
          assert.ok(response.timestamp)
          done()
        } catch (e) { done(e) }
      })
    })
    socket.on('connect_error', (err) => done(new Error(`Connection failed: ${err.message}`)))
    t.test({ cleanup: () => socket.close() })
  })
})
