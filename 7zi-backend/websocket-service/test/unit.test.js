'use strict'

const { test, describe, beforeEach } = require('node:test')
const assert = require('node:assert')

// Import RoomManager by eval since src/index.js is CommonJS and creates singletons
const { RoomManager } = require('../src/index.js')

describe('RoomManager', () => {
  let roomManager

  beforeEach(() => {
    roomManager = new RoomManager()
  })

  test('generateColor returns consistent color for same userId', () => {
    const color1 = roomManager.generateColor('user-123')
    const color2 = roomManager.generateColor('user-123')
    assert.strictEqual(color1, color2)
  })

  test('generateColor returns different colors for different userIds', () => {
    const color1 = roomManager.generateColor('user-123')
    const color2 = roomManager.generateColor('user-456')
    assert.notStrictEqual(color1, color2)
  })

  test('createRoom creates a room with correct properties', () => {
    const room = roomManager.createRoom('room-1', 'document', 'doc-1', 'Test Room')
    assert.strictEqual(room.id, 'room-1')
    assert.strictEqual(room.name, 'Test Room')
    assert.strictEqual(room.type, 'document')
    assert.strictEqual(room.documentId, 'doc-1')
    assert.strictEqual(room.users.size, 0)
    assert.deepStrictEqual(room.document, { content: '', revision: 0 })
  })

  test('getRoom returns undefined for non-existent room', () => {
    const room = roomManager.getRoom('nonexistent')
    assert.strictEqual(room, undefined)
  })

  test('ensureRoom creates room if not exists', () => {
    const room = roomManager.ensureRoom('room-1', 'document', 'doc-1', 'Test Room')
    assert.strictEqual(room.id, 'room-1')
    assert.strictEqual(room.users.size, 0)
  })

  test('ensureRoom returns existing room if already exists', () => {
    const room1 = roomManager.ensureRoom('room-1', 'document', 'doc-1', 'Room 1')
    const room2 = roomManager.ensureRoom('room-1', 'project', 'doc-2', 'Room 2')
    assert.strictEqual(room1, room2)
    assert.strictEqual(room1.name, 'Room 1') // unchanged
    assert.strictEqual(room1.type, 'document')
  })

  test('addUserToRoom adds user and increments userCount', () => {
    const room = roomManager.createRoom('room-1', 'document', 'doc-1', 'Test Room')
    const user = { id: 'user-1', name: 'Alice', email: 'alice@test.com', avatar: null, color: '#ef4444', joinedAt: new Date(), isTyping: false, lastActivity: new Date() }
    roomManager.addUserToRoom(room, user)
    assert.strictEqual(room.users.size, 1)
    assert.strictEqual(room.users.get('user-1').name, 'Alice')
  })

  test('removeUserFromRoom removes user and decrements userCount', () => {
    const room = roomManager.createRoom('room-1', 'document', 'doc-1', 'Test Room')
    const user = { id: 'user-1', name: 'Alice', email: 'alice@test.com', avatar: null, color: '#ef4444', joinedAt: new Date(), isTyping: false, lastActivity: new Date() }
    roomManager.addUserToRoom(room, user)
    roomManager.removeUserFromRoom(room, 'user-1')
    assert.strictEqual(room.users.size, 0)
  })

  test('getRoomUsers returns array of users', () => {
    const room = roomManager.createRoom('room-1', 'document', 'doc-1', 'Test Room')
    const user1 = { id: 'user-1', name: 'Alice', email: '', avatar: null, color: '#ef4444', joinedAt: new Date(), isTyping: false, lastActivity: new Date() }
    const user2 = { id: 'user-2', name: 'Bob', email: '', avatar: null, color: '#3b82f6', joinedAt: new Date(), isTyping: false, lastActivity: new Date() }
    roomManager.addUserToRoom(room, user1)
    roomManager.addUserToRoom(room, user2)
    const users = roomManager.getRoomUsers('room-1')
    assert.strictEqual(users.length, 2)
  })

  test('getRoomInfo returns null for non-existent room', () => {
    const info = roomManager.getRoomInfo('nonexistent')
    assert.strictEqual(info, null)
  })

  test('getRoomInfo returns room details with users', () => {
    const room = roomManager.createRoom('room-1', 'document', 'doc-1', 'Test Room')
    const user = { id: 'user-1', name: 'Alice', email: '', avatar: null, color: '#ef4444', joinedAt: new Date(), isTyping: false, lastActivity: new Date() }
    roomManager.addUserToRoom(room, user)
    const info = roomManager.getRoomInfo('room-1')
    assert.strictEqual(info.id, 'room-1')
    assert.strictEqual(info.userCount, 1)
    assert.strictEqual(info.users[0].name, 'Alice')
  })

  test('getAllRooms returns all rooms', () => {
    roomManager.createRoom('room-1', 'document', 'doc-1', 'Room 1')
    roomManager.createRoom('room-2', 'project', null, 'Room 2')
    const rooms = roomManager.getAllRooms()
    assert.strictEqual(rooms.length, 2)
  })
})
