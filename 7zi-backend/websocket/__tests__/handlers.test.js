'use strict'

/**
 * Unit tests for websocket/lib/handlers.js - event routing and invalid
 * message handling.
 *
 * Uses a fake socket (no network, no real Socket.IO server).
 */

const {
  handlers: { setupSocketHandlers, applyOperation },
  createFakeSocket,
  createTestRoomManager,
  createSilentLogger,
} = require('./helpers')

describe('lib/handlers', () => {
  let manager
  let socket

  const USER = {
    id: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
    avatar: null,
  }

  beforeEach(() => {
    manager = createTestRoomManager()
    socket = createFakeSocket({ user: { ...USER } })
    setupSocketHandlers(socket, { roomManager: manager, logger: createSilentLogger() })
  })

  afterEach(() => {
    manager.disposeAllTimers()
  })

  // ------------------------------------------------------------------
  // Connection bootstrap
  // ------------------------------------------------------------------

  test('joins the personal user channel and emits auth:authenticated on connect', () => {
    expect(socket.joinedRooms).toContain('user:user-1')
    expect(socket.lastEmitted('auth:authenticated')).toEqual({
      userId: 'user-1',
      name: 'Alice',
      avatar: null,
    })
  })

  // ------------------------------------------------------------------
  // room:join
  // ------------------------------------------------------------------

  test('room:join creates the room, registers the user and emits room:joined', () => {
    socket.trigger('room:join', { roomId: 'r1', type: 'document', documentId: 'd1' })

    const room = manager.getRoom('r1')
    expect(room).toBeDefined()
    expect(room.users.size).toBe(1)
    expect(room.users.get('user-1').name).toBe('Alice')
    expect(room.users.get('user-1').color).toMatch(/^#/)

    expect(socket.joinedRooms).toContain('r1')
    expect(socket.data.rooms.has('r1')).toBe(true)

    const joined = socket.lastEmitted('room:joined')
    expect(joined.roomId).toBe('r1')
    expect(joined.users).toHaveLength(1)
    expect(joined.document).toEqual({ content: '', revision: 0 })
  })

  test('room:join broadcasts room:user_joined to the rest of the room', () => {
    socket.trigger('room:join', { roomId: 'r1', type: 'document' })

    const broadcast = socket.broadcastedOf('room:user_joined')
    expect(broadcast).toHaveLength(1)
    expect(broadcast[0].user.id).toBe('user-1')
    expect(broadcast[0].userCount).toBe(1)
  })

  test('room:join without payload emits system:error instead of crashing', () => {
    expect(() => socket.trigger('room:join')).not.toThrow()
    // The original implementation destructures `data` directly, so a missing
    // payload throws inside the handler and is caught by its try/catch.
    expect(socket.lastEmitted('system:error')).toEqual({ message: 'Failed to join room' })
    expect(socket.lastEmitted('room:joined')).toBeUndefined()
  })

  test('room:join on an existing room reuses it and appends the user', () => {
    socket.trigger('room:join', { roomId: 'r2', type: 'document' })
    const createdAt = manager.getRoom('r2').createdAt.getTime()

    socket.trigger('room:join', { roomId: 'r2', type: 'document' })

    expect(manager.getRoom('r2').createdAt.getTime()).toBe(createdAt)
    expect(manager.getRoom('r2').users.size).toBe(1)
  })

  // ------------------------------------------------------------------
  // room:leave
  // ------------------------------------------------------------------

  test('room:leave removes the user from the room and emits room:left', () => {
    socket.trigger('room:join', { roomId: 'r3', type: 'document' })
    socket.trigger('room:leave', { roomId: 'r3' })

    expect(manager.getRoom('r3').users.size).toBe(0)
    expect(socket.leftRooms).toContain('r3')
    expect(socket.data.rooms.has('r3')).toBe(false)
    expect(socket.lastEmitted('room:left')).toEqual({ roomId: 'r3' })
  })

  test('room:leave broadcasts room:user_left with the remaining user count', () => {
    socket.trigger('room:join', { roomId: 'r4', type: 'document' })
    socket.trigger('room:leave', { roomId: 'r4' })

    const broadcast = socket.broadcastedOf('room:user_left')
    expect(broadcast).toHaveLength(1)
    expect(broadcast[0].userId).toBe('user-1')
    expect(broadcast[0].userCount).toBe(0)
  })

  test('room:leave for an unknown room is a silent no-op', () => {
    expect(() => socket.trigger('room:leave', { roomId: 'ghost' })).not.toThrow()
    expect(socket.lastEmitted('room:left')).toBeUndefined()
  })

  // ------------------------------------------------------------------
  // room:get_users
  // ------------------------------------------------------------------

  test('room:get_users returns the current user list', () => {
    socket.trigger('room:join', { roomId: 'r5', type: 'document' })
    socket.trigger('room:get_users', { roomId: 'r5' })

    const list = socket.lastEmitted('room:user_list')
    expect(list.roomId).toBe('r5')
    expect(list.users).toHaveLength(1)
  })

  test('room:get_users for an unknown room returns an empty list', () => {
    socket.trigger('room:get_users', { roomId: 'ghost' })
    expect(socket.lastEmitted('room:user_list')).toEqual({ roomId: 'ghost', users: [] })
  })

  // ------------------------------------------------------------------
  // doc:open / doc:operation / doc:sync
  // ------------------------------------------------------------------

  test('doc:open emits doc:opened with the document snapshot', () => {
    socket.trigger('doc:open', { roomId: 'r6', documentId: 'd6' })

    const opened = socket.lastEmitted('doc:opened')
    expect(opened.roomId).toBe('r6')
    expect(opened.documentId).toBe('d6')
    expect(opened.document).toEqual({ content: '', revision: 0 })
  })

  test('doc:operation inserts text and bumps the revision', () => {
    socket.trigger('doc:open', { roomId: 'r7', documentId: 'd7' })
    socket.trigger('doc:operation', {
      roomId: 'r7',
      operation: { type: 'insert', position: 0, content: 'hello' },
    })

    const room = manager.getRoom('r7')
    expect(room.document.content).toBe('hello')
    expect(room.document.revision).toBe(1)

    const applied = socket.broadcastedOf('doc:operation_applied')
    expect(applied).toHaveLength(1)
    expect(applied[0].revision).toBe(1)
    expect(applied[0].userId).toBe('user-1')
    expect(applied[0].id).toEqual(expect.any(String))
  })

  test('doc:operation deletes text', () => {
    socket.trigger('doc:open', { roomId: 'r8', documentId: 'd8' })
    socket.trigger('doc:operation', {
      roomId: 'r8',
      operation: { type: 'insert', position: 0, content: 'hello world' },
    })
    socket.trigger('doc:operation', {
      roomId: 'r8',
      operation: { type: 'delete', position: 5, length: 6 },
    })

    const room = manager.getRoom('r8')
    expect(room.document.content).toBe('hello')
    expect(room.document.revision).toBe(2)
  })

  test('doc:operation on an unknown room emits system:error', () => {
    socket.trigger('doc:operation', {
      roomId: 'ghost',
      operation: { type: 'insert', position: 0, content: 'x' },
    })

    expect(socket.lastEmitted('system:error')).toEqual({ message: 'Room not found' })
  })

  test('doc:operation with a malformed operation still bumps the revision but not the content', () => {
    socket.trigger('doc:open', { roomId: 'r9', documentId: 'd9' })
    socket.trigger('doc:operation', { roomId: 'r9', operation: { type: 'unknown' } })

    const room = manager.getRoom('r9')
    expect(room.document.content).toBe('')
    expect(room.document.revision).toBe(1)
  })

  test('doc:operation without an operation payload does not throw', () => {
    socket.trigger('doc:open', { roomId: 'r10', documentId: 'd10' })
    expect(() => socket.trigger('doc:operation', { roomId: 'r10' })).not.toThrow()
  })

  test('doc:sync returns the current document', () => {
    socket.trigger('doc:open', { roomId: 'r11', documentId: 'd11' })
    socket.trigger('doc:operation', {
      roomId: 'r11',
      operation: { type: 'insert', position: 0, content: 'abc' },
    })
    socket.trigger('doc:sync', { roomId: 'r11' })

    expect(socket.lastEmitted('doc:sync')).toEqual({
      roomId: 'r11',
      document: { content: 'abc', revision: 1 },
    })
  })

  test('doc:sync on an unknown room emits system:error', () => {
    socket.trigger('doc:sync', { roomId: 'ghost' })
    expect(socket.lastEmitted('system:error')).toEqual({ message: 'Room not found' })
  })

  // ------------------------------------------------------------------
  // cursor / selection / presence
  // ------------------------------------------------------------------

  test('cursor:move updates the room user cursor and broadcasts it', () => {
    socket.trigger('room:join', { roomId: 'r12', type: 'document' })
    socket.trigger('cursor:move', { roomId: 'r12', position: 12, selection: [1, 5] })

    const roomUser = manager.getRoom('r12').users.get('user-1')
    expect(roomUser.cursor).toEqual({ position: 12, selection: [1, 5] })

    const updates = socket.broadcastedOf('cursor:update')
    expect(updates).toHaveLength(1)
    expect(updates[0]).toMatchObject({ userId: 'user-1', position: 12 })
  })

  test('cursor:move for an unknown room is a no-op', () => {
    expect(() => socket.trigger('cursor:move', { roomId: 'ghost', position: 1 })).not.toThrow()
    expect(socket.broadcastedOf('cursor:update')).toHaveLength(0)
  })

  test('selection:update keeps the previous cursor position', () => {
    socket.trigger('room:join', { roomId: 'r13', type: 'document' })
    socket.trigger('cursor:move', { roomId: 'r13', position: 30, selection: null })
    socket.trigger('selection:update', { roomId: 'r13', selection: [2, 8] })

    const roomUser = manager.getRoom('r13').users.get('user-1')
    expect(roomUser.cursor).toEqual({ position: 30, selection: [2, 8] })
    expect(socket.broadcastedOf('selection:update')).toHaveLength(1)
  })

  test('selection:update defaults the position to 0 when there is no cursor yet', () => {
    socket.trigger('room:join', { roomId: 'r14', type: 'document' })
    socket.trigger('selection:update', { roomId: 'r14', selection: [0, 1] })

    const roomUser = manager.getRoom('r14').users.get('user-1')
    expect(roomUser.cursor.position).toBe(0)
  })

  test('presence:typing toggles the isTyping flag and broadcasts it', () => {
    socket.trigger('room:join', { roomId: 'r15', type: 'document' })
    socket.trigger('presence:typing', { roomId: 'r15', isTyping: true })

    expect(manager.getRoom('r15').users.get('user-1').isTyping).toBe(true)
    expect(socket.broadcastedOf('presence:typing')[0]).toMatchObject({
      userId: 'user-1',
      isTyping: true,
    })
  })

  test('presence:typing for an unknown room is a no-op', () => {
    expect(() => socket.trigger('presence:typing', { roomId: 'ghost', isTyping: true })).not.toThrow()
  })

  // ------------------------------------------------------------------
  // heartbeat / test:ping / disconnect
  // ------------------------------------------------------------------

  test('heartbeat updates lastHeartbeat', () => {
    socket.data.lastHeartbeat = 0
    socket.trigger('heartbeat')
    expect(socket.data.lastHeartbeat).toBeGreaterThan(0)
  })

  test('test:ping responds with a pong payload', () => {
    const callback = jest.fn()
    socket.trigger('test:ping', { echo: 'hi' }, callback)

    expect(callback).toHaveBeenCalledTimes(1)
    const payload = callback.mock.calls[0][0]
    expect(payload.message).toBe('pong')
    expect(payload.echo).toBe('hi')
    expect(payload.timestamp).toEqual(expect.any(String))
  })

  test('test:ping without a callback does not throw', () => {
    expect(() => socket.trigger('test:ping', {})).not.toThrow()
  })

  test('disconnect removes the user from every joined room', () => {
    socket.trigger('room:join', { roomId: 'r16', type: 'document' })
    socket.trigger('room:join', { roomId: 'r17', type: 'document' })

    socket.trigger('disconnect', 'client namespace disconnect')

    expect(manager.getRoom('r16').users.size).toBe(0)
    expect(manager.getRoom('r17').users.size).toBe(0)
    expect(socket.broadcastedOf('room:user_left')).toHaveLength(2)
  })
})

describe('lib/handlers - applyOperation (pure)', () => {
  test('insert at position 0 prepends', () => {
    expect(applyOperation({ content: 'world', revision: 3 }, {
      type: 'insert',
      position: 0,
      content: 'hello ',
    })).toEqual({ content: 'hello world', revision: 4 })
  })

  test('insert in the middle', () => {
    expect(applyOperation({ content: 'ac', revision: 0 }, {
      type: 'insert',
      position: 1,
      content: 'b',
    })).toEqual({ content: 'abc', revision: 1 })
  })

  test('delete removes the requested range', () => {
    expect(applyOperation({ content: 'abcdef', revision: 2 }, {
      type: 'delete',
      position: 1,
      length: 3,
    })).toEqual({ content: 'aef', revision: 3 })
  })

  test('an unknown operation type only bumps the revision', () => {
    expect(applyOperation({ content: 'abc', revision: 0 }, { type: 'noop' })).toEqual({
      content: 'abc',
      revision: 1,
    })
  })

  test('an insert without content only bumps the revision', () => {
    expect(applyOperation({ content: 'abc', revision: 0 }, { type: 'insert', position: 0 })).toEqual({
      content: 'abc',
      revision: 1,
    })
  })

  test('a delete without length only bumps the revision', () => {
    expect(applyOperation({ content: 'abc', revision: 0 }, { type: 'delete', position: 0 })).toEqual({
      content: 'abc',
      revision: 1,
    })
  })

  test('a null operation only bumps the revision', () => {
    expect(applyOperation({ content: 'abc', revision: 0 }, null)).toEqual({
      content: 'abc',
      revision: 1,
    })
  })
})
