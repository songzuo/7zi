'use strict'

/**
 * Unit tests for websocket/lib/room-manager.js - room join / leave logic.
 */

const { roomManager: { RoomManager, USER_COLORS }, createTestRoomManager } = require('./helpers')

describe('lib/room-manager', () => {
  let manager

  beforeEach(() => {
    manager = createTestRoomManager()
  })

  afterEach(() => {
    manager.disposeAllTimers()
  })

  test('createRoom initialises an empty room with a blank document', () => {
    const room = manager.createRoom('room-1', 'document', 'doc-1')

    expect(room.id).toBe('room-1')
    expect(room.name).toBe('Room room-1')
    expect(room.type).toBe('document')
    expect(room.documentId).toBe('doc-1')
    expect(room.users.size).toBe(0)
    expect(room.document).toEqual({ content: '', revision: 0 })
    expect(manager.getRoom('room-1')).toBe(room)
  })

  test('createRoom uses the provided name when given', () => {
    const room = manager.createRoom('room-2', 'chat', 'doc-2', 'My Room')
    expect(room.name).toBe('My Room')
  })

  test('ensureRoom returns the existing room and does not recreate it', () => {
    const first = manager.ensureRoom('room-3', 'document', 'doc-3')
    const second = manager.ensureRoom('room-3', 'document', 'doc-3', 'Other name')

    expect(second).toBe(first)
    expect(second.name).toBe('Room room-3')
    expect(manager.rooms.size).toBe(1)
  })

  test('addUserToRoom registers the user and updates lastActivity', () => {
    const room = manager.ensureRoom('room-4', 'document', 'doc-4')
    const before = room.lastActivity.getTime()

    manager.addUserToRoom(room, { id: 'u1', name: 'Alice' })

    expect(room.users.size).toBe(1)
    expect(room.users.get('u1').name).toBe('Alice')
    expect(room.lastActivity.getTime()).toBeGreaterThanOrEqual(before)
  })

  test('removeUserFromRoom removes the user', () => {
    const room = manager.ensureRoom('room-5', 'document', 'doc-5')
    manager.addUserToRoom(room, { id: 'u1', name: 'Alice' })
    manager.addUserToRoom(room, { id: 'u2', name: 'Bob' })

    manager.removeUserFromRoom(room, 'u1')

    expect(room.users.size).toBe(1)
    expect(room.users.has('u1')).toBe(false)
    expect(room.users.has('u2')).toBe(true)
  })

  test('removeUserFromRoom is a no-op for an unknown user', () => {
    const room = manager.ensureRoom('room-6', 'document', 'doc-6')
    manager.addUserToRoom(room, { id: 'u1', name: 'Alice' })

    manager.removeUserFromRoom(room, 'ghost')

    expect(room.users.size).toBe(1)
  })

  test('leaving the last user schedules an idle cleanup for non-project rooms', () => {
    const room = manager.ensureRoom('room-7', 'document', 'doc-7')
    manager.addUserToRoom(room, { id: 'u1', name: 'Alice' })

    manager.removeUserFromRoom(room, 'u1')

    expect(manager.cleanupTimers.has('room-7')).toBe(true)
  })

  test('project rooms are never scheduled for cleanup', () => {
    const room = manager.ensureRoom('room-8', 'project', 'doc-8')
    manager.addUserToRoom(room, { id: 'u1', name: 'Alice' })

    manager.removeUserFromRoom(room, 'u1')

    expect(manager.cleanupTimers.has('room-8')).toBe(false)
  })

  test('the idle cleanup timer destroys an empty room', () => {
    const room = manager.ensureRoom('room-9', 'document', 'doc-9')
    manager.addUserToRoom(room, { id: 'u1', name: 'Alice' })
    manager.removeUserFromRoom(room, 'u1')

    expect(manager.getRoom('room-9')).not.toBeUndefined()

    manager.runTimers()

    expect(manager.getRoom('room-9')).toBeUndefined()
    expect(manager.cleanupTimers.has('room-9')).toBe(false)
  })

  test('the idle cleanup timer keeps a room that has users again', () => {
    const room = manager.ensureRoom('room-10', 'document', 'doc-10')
    manager.addUserToRoom(room, { id: 'u1', name: 'Alice' })
    manager.removeUserFromRoom(room, 'u1')
    manager.addUserToRoom(room, { id: 'u2', name: 'Bob' })

    manager.runTimers()

    expect(manager.getRoom('room-10')).toBeDefined()
  })

  test('getRoomUsers returns [] for an unknown room', () => {
    expect(manager.getRoomUsers('does-not-exist')).toEqual([])
  })

  test('getRoomUsers returns the joined users', () => {
    const room = manager.ensureRoom('room-11', 'document', 'doc-11')
    manager.addUserToRoom(room, { id: 'u1', name: 'Alice' })
    manager.addUserToRoom(room, { id: 'u2', name: 'Bob' })

    const users = manager.getRoomUsers('room-11')
    expect(users).toHaveLength(2)
    expect(users.map(u => u.id)).toEqual(['u1', 'u2'])
  })

  test('getAllRooms returns a summary without the users map', () => {
    const room = manager.ensureRoom('room-12', 'document', 'doc-12')
    manager.addUserToRoom(room, { id: 'u1', name: 'Alice' })

    const all = manager.getAllRooms()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ id: 'room-12', type: 'document', userCount: 1 })
    expect(all[0].users).toBeUndefined()
  })

  test('getRoomInfo returns null for an unknown room', () => {
    expect(manager.getRoomInfo('nope')).toBeNull()
  })

  test('getRoomInfo returns a per-user summary', () => {
    const room = manager.ensureRoom('room-13', 'document', 'doc-13')
    manager.addUserToRoom(room, {
      id: 'u1',
      name: 'Alice',
      color: '#ef4444',
      isTyping: true,
      lastActivity: new Date(),
    })

    const info = manager.getRoomInfo('room-13')
    expect(info.userCount).toBe(1)
    expect(info.users[0]).toMatchObject({ id: 'u1', name: 'Alice', color: '#ef4444', isTyping: true })
  })

  test('generateColor is deterministic and always returns a known colour', () => {
    const a = manager.generateColor('user-1')
    const b = manager.generateColor('user-1')
    expect(a).toBe(b)
    expect(USER_COLORS).toContain(a)
  })

  test('generateColor distributes different users over the palette', () => {
    const colours = new Set(
      Array.from({ length: 50 }, (_, i) => manager.generateColor(`user-${i}`))
    )
    expect(colours.size).toBeGreaterThan(1)
  })

  test('generateColor tolerates a non-string user id', () => {
    expect(USER_COLORS).toContain(manager.generateColor(12345))
  })

  test('the default constructor works without options', () => {
    const plain = new RoomManager({ logger: { info() {}, debug() {}, warn() {}, error() {} } })
    const room = plain.ensureRoom('room-14', 'chat')
    expect(room.id).toBe('room-14')
    plain.disposeAllTimers()
  })
})
