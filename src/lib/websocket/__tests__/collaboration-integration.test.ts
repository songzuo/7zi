/**
 * Collaboration System Integration Tests
 *
 * 集成测试：WebSocket 协作系统
 * 测试 CRDT 同步、冲突解决、房间管理、光标同步
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RoomManager } from '../rooms'
import { CollaborationManager, getCollaborationManager } from '../collaboration-manager'
import type { CreateRoomOptions } from '../rooms'

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * 创建测试房间
 */
function createTestRoom(roomId: string, ownerId: string): CreateRoomOptions {
  return {
    id: roomId,
    name: `Test Room ${roomId}`,
    type: 'task',
    documentId: `doc-${roomId}`,
    visibility: 'public',
    ownerId,
    config: {
      maxParticipants: 10,
      messageHistoryEnabled: true,
      persistenceEnabled: true,
      autoCleanupMinutes: 0, // 不自动清理
    },
  }
}

/**
 * 创建测试用户
 */
function createTestUser(userId: string, userName: string) {
  return {
    id: userId,
    name: userName,
    email: `${userName.toLowerCase()}@test.com`,
    avatar: `avatar-${userId}.png`,
  }
}

// ============================================================================
// Setup & Teardown
// ============================================================================

describe('Collaboration System Integration Tests', () => {
  let roomManager: RoomManager
  let collabManager: CollaborationManager

  beforeEach(() => {
    // 重置单例
    vi.clearAllMocks()

    // 创建实例
    roomManager = new RoomManager()
    collabManager = new CollaborationManager({
      lockTimeout: 30000, // 30秒
      cursorThrottle: 16,
      enableConflictResolution: true,
      conflictResolutionStrategy: 'last-write-wins',
    })
  })

  afterEach(() => {
    // 清理
    if (collabManager) {
      collabManager.destroyAll()
    }
    if (roomManager) {
      // 重置房间管理器
    }
  })

  // ============================================================================
  // Test Suite 1: Room Management
  // ============================================================================

  describe('Room Management', () => {
    it('should create a room', () => {
      const roomId = 'room-1'
      const owner = createTestUser('user-1', 'Alice')

      const room = roomManager.create({
        ...createTestRoom(roomId, owner.id),
        ownerId: owner.id,
      })

      expect(room).toBeDefined()
      expect(room.id).toBe(roomId)
      expect(room.ownerId).toBe(owner.id)
      expect(room.participants.size).toBe(0)
    })

    it('should allow user to join room', () => {
      const roomId = 'room-2'
      const owner = createTestUser('user-1', 'Alice')
      const user = createTestUser('user-2', 'Bob')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, owner.id),
        ownerId: owner.id,
      })

      // 用户加入
      const result = roomManager.join(roomId, {
        userId: user.id,
        userName: user.name,
        email: user.email,
        avatar: user.avatar,
        role: 'member',
      })

      expect(result.success).toBe(true)
      expect(result.participant).toBeDefined()
      expect(result.participant?.id).toBe(user.id)
      expect(result.participant?.name).toBe(user.name)
    })

    it('should allow user to leave room', () => {
      const roomId = 'room-3'
      const user = createTestUser('user-1', 'Alice')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user.id),
        ownerId: user.id,
      })

      // 用户加入
      roomManager.join(roomId, {
        userId: user.id,
        userName: user.name,
      })

      // 用户离开
      const result = roomManager.leave(roomId, user.id)

      expect(result.success).toBe(true)
      expect(result.participant).toBeDefined()
    })

    it('should get room participants', () => {
      const roomId = 'room-4'
      const user1 = createTestUser('user-1', 'Alice')
      const user2 = createTestUser('user-2', 'Bob')
      const user3 = createTestUser('user-3', 'Charlie')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user1.id),
        ownerId: user1.id,
      })

      // 用户加入
      roomManager.join(roomId, { userId: user1.id, userName: user1.name })
      roomManager.join(roomId, { userId: user2.id, userName: user2.name })
      roomManager.join(roomId, { userId: user3.id, userName: user3.name })

      // 获取参与者
      const participants = roomManager.getParticipants(roomId)

      expect(participants).toHaveLength(3)
      expect(participants.map(p => p.id)).toEqual(
        expect.arrayContaining([user1.id, user2.id, user3.id])
      )
    })

    it('should update participant cursor', () => {
      const roomId = 'room-5'
      const user = createTestUser('user-1', 'Alice')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user.id),
        ownerId: user.id,
      })

      // 用户加入
      roomManager.join(roomId, { userId: user.id, userName: user.name })

      // 更新光标
      const success = roomManager.updateCursor(roomId, user.id, {
        position: 100,
        selection: { start: 100, end: 150 },
      })

      expect(success).toBe(true)

      const participant = roomManager.getParticipant(roomId, user.id)
      expect(participant?.cursor?.position).toBe(100)
      expect(participant?.cursor?.selection?.start).toBe(100)
    })
  })

  // ============================================================================
  // Test Suite 2: Collaboration Session
  // ============================================================================

  describe('Collaboration Session', () => {
    it('should create a collaboration session', () => {
      const sessionId = 'session-1'
      const roomId = 'room-1'
      const userId = 'user-1'

      const session = collabManager.createSession(sessionId, roomId, userId)

      expect(session).toBeDefined()
      expect(session.id).toBe(sessionId)
      expect(session.roomId).toBe(roomId)
      expect(session.participants.size).toBe(0)
    })

    it('should allow user to join collaboration', async () => {
      const sessionId = 'session-2'
      const roomId = 'room-2'
      const user = createTestUser('user-1', 'Alice')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user.id),
        ownerId: user.id,
      })

      // 用户加入房间
      roomManager.join(roomId, {
        userId: user.id,
        userName: user.name,
        email: user.email,
        avatar: user.avatar,
      })

      // 创建协作会话
      collabManager.createSession(sessionId, roomId, user.id)

      // 用户加入协作
      const result = await collabManager.joinCollaboration(
        sessionId,
        user.id,
        user.name,
        user.email,
        user.avatar
      )

      expect(result.success).toBe(true)
      expect(result.session).toBeDefined()
      expect(result.participant).toBeDefined()
      expect(result.participant?.id).toBe(user.id)
    })

    it('should allow user to leave collaboration', async () => {
      const sessionId = 'session-3'
      const roomId = 'room-3'
      const user = createTestUser('user-1', 'Alice')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user.id),
        ownerId: user.id,
      })

      // 用户加入房间
      roomManager.join(roomId, {
        userId: user.id,
        userName: user.name,
        email: user.email,
        avatar: user.avatar,
      })

      // 创建协作会话
      collabManager.createSession(sessionId, roomId, user.id)

      // 用户加入
      await collabManager.joinCollaboration(sessionId, user.id, user.name)

      // 用户离开
      const result = await collabManager.leaveCollaboration(sessionId, user.id)

      expect(result.success).toBe(true)
    })

    it('should destroy empty session', async () => {
      const sessionId = 'session-4'
      const roomId = 'room-4'
      const user = createTestUser('user-1', 'Alice')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user.id),
        ownerId: user.id,
      })

      // 用户加入房间
      roomManager.join(roomId, {
        userId: user.id,
        userName: user.name,
        email: user.email,
        avatar: user.avatar,
      })

      // 创建协作会话
      collabManager.createSession(sessionId, roomId, user.id)

      // 用户加入
      await collabManager.joinCollaboration(sessionId, user.id, user.name)

      // 用户离开
      await collabManager.leaveCollaboration(sessionId, user.id)

      // 检查会话是否被销毁
      const session = collabManager.getSession(sessionId)
      expect(session).toBeUndefined()
    })
  })

  // ============================================================================
  // Test Suite 3: Node Operations
  // ============================================================================

  describe('Node Operations', () => {
    it('should create and update node', async () => {
      const sessionId = 'session-5'
      const roomId = 'room-5'
      const user = createTestUser('user-1', 'Alice')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user.id),
        ownerId: user.id,
      })

      // 用户加入房间
      roomManager.join(roomId, {
        userId: user.id,
        userName: user.name,
      })

      // 创建协作会话
      const session = collabManager.createSession(sessionId, roomId, user.id)

      // 创建节点
      session.docManager.createNode('node-1', {
        title: 'Test Node',
        type: 'task',
        position: { x: 100, y: 100 },
      })

      // 更新节点
      const result = await collabManager.updateNode(sessionId, user.id, 'node-1', {
        title: 'Updated Node',
      })

      expect(result.success).toBe(true)

      const node = session.docManager.getNode('node-1')
      expect(node?.get('title')).toBe('Updated Node')
    })

    it('should delete node', async () => {
      const sessionId = 'session-6'
      const roomId = 'room-6'
      const user = createTestUser('user-1', 'Alice')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user.id),
        ownerId: user.id,
      })

      // 用户加入房间
      roomManager.join(roomId, {
        userId: user.id,
        userName: user.name,
      })

      // 创建协作会话
      const session = collabManager.createSession(sessionId, roomId, user.id)

      // 创建节点
      session.docManager.createNode('node-1', {
        title: 'Test Node',
        type: 'task',
      })

      // 删除节点
      const result = await collabManager.deleteNode(sessionId, user.id, 'node-1')

      expect(result.success).toBe(true)

      const node = session.docManager.getNode('node-1')
      expect(node).toBeUndefined()
    })

    it('should move node', async () => {
      const sessionId = 'session-7'
      const roomId = 'room-7'
      const user = createTestUser('user-1', 'Alice')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user.id),
        ownerId: user.id,
      })

      // 用户加入房间
      roomManager.join(roomId, {
        userId: user.id,
        userName: user.name,
      })

      // 创建协作会话
      const session = collabManager.createSession(sessionId, roomId, user.id)

      // 创建节点
      session.docManager.createNode('node-1', {
        title: 'Test Node',
        type: 'task',
        position: { x: 100, y: 100 },
      })

      // 移动节点
      const result = await collabManager.moveNode(sessionId, user.id, 'node-1', {
        x: 200,
        y: 300,
      })

      expect(result.success).toBe(true)

      const node = session.docManager.getNode('node-1')
      expect(node?.get('position')).toEqual({ x: 200, y: 300 })
    })
  })

  // ============================================================================
  // Test Suite 4: Edit Locks
  // ============================================================================

  describe('Edit Locks', () => {
    it('should acquire lock', async () => {
      const sessionId = 'session-8'
      const roomId = 'room-8'
      const user = createTestUser('user-1', 'Alice')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user.id),
        ownerId: user.id,
      })

      // 用户加入房间
      roomManager.join(roomId, {
        userId: user.id,
        userName: user.name,
      })

      // 创建协作会话
      collabManager.createSession(sessionId, roomId, user.id)

      // 用户加入
      await collabManager.joinCollaboration(sessionId, user.id, user.name)

      // 获取锁
      const result = await collabManager.acquireLock(sessionId, user.id, 'node-1')

      expect(result.success).toBe(true)

      const lock = collabManager.getLock('node-1')
      expect(lock).toBeDefined()
      expect(lock?.userId).toBe(user.id)
    })

    it('should prevent multiple locks on same node', async () => {
      const sessionId = 'session-9'
      const roomId = 'room-9'
      const user1 = createTestUser('user-1', 'Alice')
      const user2 = createTestUser('user-2', 'Bob')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user1.id),
        ownerId: user1.id,
      })

      // 用户加入房间
      roomManager.join(roomId, {
        userId: user1.id,
        userName: user1.name,
      })
      roomManager.join(roomId, {
        userId: user2.id,
        userName: user2.name,
      })

      // 创建协作会话
      collabManager.createSession(sessionId, roomId, user1.id)

      // 用户加入
      await collabManager.joinCollaboration(sessionId, user1.id, user1.name)
      await collabManager.joinCollaboration(sessionId, user2.id, user2.name)

      // User1 获取锁
      const result1 = await collabManager.acquireLock(sessionId, user1.id, 'node-1')
      expect(result1.success).toBe(true)

      // User2 尝试获取锁
      const result2 = await collabManager.acquireLock(sessionId, user2.id, 'node-1')
      expect(result2.success).toBe(false)
      expect(result2.error).toContain('locked by another user')
    })

    it('should release lock', async () => {
      const sessionId = 'session-10'
      const roomId = 'room-10'
      const user = createTestUser('user-1', 'Alice')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user.id),
        ownerId: user.id,
      })

      // 用户加入房间
      roomManager.join(roomId, {
        userId: user.id,
        userName: user.name,
      })

      // 创建协作会话
      collabManager.createSession(sessionId, roomId, user.id)

      // 用户加入
      await collabManager.joinCollaboration(sessionId, user.id, user.name)

      // 获取锁
      await collabManager.acquireLock(sessionId, user.id, 'node-1')

      // 释放锁
      const success = collabManager.releaseLock('node-1', user.id)

      expect(success).toBe(true)

      const lock = collabManager.getLock('node-1')
      expect(lock).toBeUndefined()
    })

    it('should renew lock', async () => {
      const sessionId = 'session-11'
      const roomId = 'room-11'
      const user = createTestUser('user-1', 'Alice')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user.id),
        ownerId: user.id,
      })

      // 用户加入房间
      roomManager.join(roomId, {
        userId: user.id,
        userName: user.name,
      })

      // 创建协作会话
      collabManager.createSession(sessionId, roomId, user.id)

      // 用户加入
      await collabManager.joinCollaboration(sessionId, user.id, user.name)

      // 获取锁
      await collabManager.acquireLock(sessionId, user.id, 'node-1')

      const lock1 = collabManager.getLock('node-1')
      const originalExpiresAt = lock1?.expiresAt

      // 续期锁
      const success = collabManager.renewLock('node-1', user.id)

      expect(success).toBe(true)

      const lock2 = collabManager.getLock('node-1')
      expect(lock2?.expiresAt).toBeGreaterThan(originalExpiresAt!)
    })

    it('should cleanup expired locks', async () => {
      const sessionId = 'session-12'
      const roomId = 'room-12'
      const user = createTestUser('user-1', 'Alice')

      // 创建协作会话管理器（短超时）
      const shortTimeoutManager = new CollaborationManager({
        lockTimeout: 100, // 100ms
      })

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user.id),
        ownerId: user.id,
      })

      // 用户加入房间
      roomManager.join(roomId, {
        userId: user.id,
        userName: user.name,
      })

      // 创建协作会话
      shortTimeoutManager.createSession(sessionId, roomId, user.id)

      // 用户加入
      await shortTimeoutManager.joinCollaboration(sessionId, user.id, user.name)

      // 获取锁
      await shortTimeoutManager.acquireLock(sessionId, user.id, 'node-1')

      // 等待锁过期
      await new Promise(resolve => setTimeout(resolve, 150))

      // 清理过期锁
      shortTimeoutManager.cleanupExpiredLocks()

      const lock = shortTimeoutManager.getLock('node-1')
      expect(lock).toBeUndefined()

      // 清理
      shortTimeoutManager.destroyAll()
    })
  })

  // ============================================================================
  // Test Suite 5: Cursor & Selection Sync
  // ============================================================================

  describe('Cursor & Selection Sync', () => {
    it('should update cursor', async () => {
      const sessionId = 'session-13'
      const roomId = 'room-13'
      const user = createTestUser('user-1', 'Alice')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user.id),
        ownerId: user.id,
      })

      // 用户加入房间
      roomManager.join(roomId, {
        userId: user.id,
        userName: user.name,
      })

      // 创建协作会话
      collabManager.createSession(sessionId, roomId, user.id)

      // 用户加入
      await collabManager.joinCollaboration(sessionId, user.id, user.name)

      // 更新光标
      const success = collabManager.updateCursor(sessionId, user.id, {
        userId: user.id,
        userName: user.name,
        color: '#FF5733',
        position: 100,
      })

      expect(success).toBe(true)

      const participant = collabManager.getParticipant(sessionId, user.id)
      expect(participant?.cursor?.position).toBe(100)
    })

    it('should update selection', async () => {
      const sessionId = 'session-14'
      const roomId = 'room-14'
      const user = createTestUser('user-1', 'Alice')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user.id),
        ownerId: user.id,
      })

      // 用户加入房间
      roomManager.join(roomId, {
        userId: user.id,
        userName: user.name,
      })

      // 创建协作会话
      collabManager.createSession(sessionId, roomId, user.id)

      // 用户加入
      await collabManager.joinCollaboration(sessionId, user.id, user.name)

      // 更新选择
      const success = collabManager.updateSelection(sessionId, user.id, {
        userId: user.id,
        userName: user.name,
        color: '#FF5733',
        selection: { start: 0, end: 10 },
      })

      expect(success).toBe(true)

      const participant = collabManager.getParticipant(sessionId, user.id)
      expect(participant?.selection?.selection?.start).toBe(0)
      expect(participant?.selection?.selection?.end).toBe(10)
    })
  })

  // ============================================================================
  // Test Suite 6: Statistics
  // ============================================================================

  describe('Statistics', () => {
    it('should return room stats', () => {
      const roomId = 'room-15'
      const user1 = createTestUser('user-1', 'Alice')
      const user2 = createTestUser('user-2', 'Bob')
      const user3 = createTestUser('user-3', 'Charlie')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user1.id),
        ownerId: user1.id,
      })

      // 用户加入
      roomManager.join(roomId, { userId: user1.id, userName: user1.name })
      roomManager.join(roomId, { userId: user2.id, userName: user2.name })
      roomManager.join(roomId, { userId: user3.id, userName: user3.name })

      const stats = roomManager.getStats()

      expect(stats.totalRooms).toBe(1)
      expect(stats.totalParticipants).toBe(3)
      expect(stats.activeRooms).toBe(1)
    })

    it('should return collaboration stats', async () => {
      const sessionId1 = 'session-16'
      const sessionId2 = 'session-17'
      const roomId1 = 'room-16'
      const roomId2 = 'room-17'
      const user1 = createTestUser('user-1', 'Alice')
      const user2 = createTestUser('user-2', 'Bob')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId1, user1.id),
        ownerId: user1.id,
      })
      roomManager.join(roomId1, { userId: user1.id, userName: user1.name })

      roomManager.create({
        ...createTestRoom(roomId2, user2.id),
        ownerId: user2.id,
      })
      roomManager.join(roomId2, { userId: user2.id, userName: user2.name })

      // 创建协作会话
      collabManager.createSession(sessionId1, roomId1, user1.id)
      collabManager.createSession(sessionId2, roomId2, user2.id)

      // 用户加入协作
      await collabManager.joinCollaboration(sessionId1, user1.id, user1.name, user1.email, user1.avatar)
      await collabManager.joinCollaboration(sessionId2, user2.id, user2.name, user2.email, user2.avatar)

      const stats = collabManager.getStats()

      expect(stats.totalSessions).toBe(2)
      expect(stats.totalParticipants).toBe(2)
      expect(stats.sessionsByRoom[roomId1]).toBe(1)
      expect(stats.sessionsByRoom[roomId2]).toBe(1)
    })
  })

  // ============================================================================
  // Test Suite 7: Event Callbacks
  // ============================================================================

  describe('Event Callbacks', () => {
    it('should trigger user_joined event', async () => {
      const sessionId = 'session-18'
      const roomId = 'room-18'
      const user = createTestUser('user-1', 'Alice')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user.id),
        ownerId: user.id,
      })
      roomManager.join(roomId, { userId: user.id, userName: user.name })

      // 创建协作会话
      collabManager.createSession(sessionId, roomId, user.id)

      // 注册事件回调
      const eventCallback = vi.fn()
      collabManager.on('user_joined', eventCallback)

      // 用户加入协作
      await collabManager.joinCollaboration(sessionId, user.id, user.name)

      expect(eventCallback).toHaveBeenCalled()
      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user_joined',
          sessionId,
          roomId,
          userId: user.id,
        })
      )
    })

    it('should trigger lock_acquired event', async () => {
      const sessionId = 'session-19'
      const roomId = 'room-19'
      const user = createTestUser('user-1', 'Alice')

      // 创建房间
      roomManager.create({
        ...createTestRoom(roomId, user.id),
        ownerId: user.id,
      })
      roomManager.join(roomId, { userId: user.id, userName: user.name })

      // 创建协作会话
      collabManager.createSession(sessionId, roomId, user.id)

      // 用户加入
      await collabManager.joinCollaboration(sessionId, user.id, user.name)

      // 注册事件回调
      const eventCallback = vi.fn()
      collabManager.on('lock_acquired', eventCallback)

      // 获取锁
      await collabManager.acquireLock(sessionId, user.id, 'node-1')

      expect(eventCallback).toHaveBeenCalled()
    })
  })
})
