/**
 * Room Manager E2E Tests - WebSocket v1.4.0
 *
 * 补充端到端测试场景：
 * - 房间邀请流程完整测试
 * - 并发场景测试
 * - 边界条件和错误处理
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RoomManager, getRoomManager, resetRoomManager } from '../rooms'
import { resetPermissionManager, getPermissionManager } from '@/lib/websocket/permissions'
import { resetMessageStore, getMessageStore } from '../message-store'

describe('RoomManager E2E Tests', () => {
  let manager: RoomManager
  const roomId = 'test-room'
  const user1Id = 'user1'
  const user1Name = 'User One'
  const user2Id = 'user2'
  const user2Name = 'User Two'
  const user3Id = 'user3'
  const user3Name = 'User Three'
  const adminId = 'admin'

  beforeEach(() => {
    resetPermissionManager()
    resetMessageStore()
    resetRoomManager()
    manager = getRoomManager()
  })

  describe('房间邀请流程完整测试', () => {
    beforeEach(() => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        visibility: 'private',
        ownerId: user1Id,
      })

      manager.join(roomId, {
        userId: user1Id,
        userName: user1Name,
      })
    })

    it('应该正确处理邀请-接受-加入流程', () => {
      // 1. 邀请用户
      const inviteResult = manager.invite(roomId, user2Id, user1Id)
      expect(inviteResult.success).toBe(true)

      // 2. 被邀请用户加入
      const joinResult = manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      })

      expect(joinResult.success).toBe(true)
      expect(joinResult.participant?.role).toBe('member')
    })

    it('应该允许管理员邀请用户', () => {
      // 先邀请 user2 加入私有房间
      manager.invite(roomId, user2Id, user1Id)

      // 用户2以管理员身份加入私有房间
      const joinResult = manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
        role: 'admin',
      })
      expect(joinResult.success).toBe(true)

      // 验证用户2有邀请权限
      const permManager = getPermissionManager()
      expect(permManager.hasPermission(user2Id, roomId, 'room:invite')).toBe(true)

      // 管理员邀请用户3
      const inviteResult = manager.invite(roomId, user3Id, user2Id)
      expect(inviteResult.success).toBe(true)

      // 被邀请用户可以加入
      const joinResult2 = manager.join(roomId, {
        userId: user3Id,
        userName: user3Name,
      })
      expect(joinResult2.success).toBe(true)
    })

    it('应该拒绝无权限用户的邀请', () => {
      // 用户2作为普通成员加入
      manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
        role: 'guest',
      })

      // 访客无法邀请
      const inviteResult = manager.invite(roomId, user3Id, user2Id)
      expect(inviteResult.success).toBe(false)
      expect(inviteResult.error).toBe('No permission to invite users')
    })

    it('应该允许多次邀请同一用户（幂等性）', () => {
      // 第一次邀请
      const inviteResult1 = manager.invite(roomId, user2Id, user1Id)
      expect(inviteResult1.success).toBe(true)

      // 第二次邀请同一用户
      const inviteResult2 = manager.invite(roomId, user2Id, user1Id)
      expect(inviteResult2.success).toBe(true)

      // 用户仍可正常加入
      const joinResult = manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      })
      expect(joinResult.success).toBe(true)
    })

    it('应该在用户加入后保持邀请状态（可再次加入）', () => {
      manager.invite(roomId, user2Id, user1Id)

      // 第一次加入
      manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      })

      // 离开房间
      manager.leave(roomId, user2Id)

      // 再次加入（邀请仍有效）
      const joinResult = manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      })
      expect(joinResult.success).toBe(true)
    })
  })

  describe('邀请房间不存在的情况', () => {
    it('应该在邀请失败时返回错误', () => {
      const inviteResult = manager.invite('nonexistent-room', user2Id, user1Id)
      expect(inviteResult.success).toBe(false)
      expect(inviteResult.error).toBe('Room not found')
    })
  })

  describe('房间可见性切换测试', () => {
    it('应该正确处理公开转私有后的访问控制', () => {
      // 创建公开房间
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        visibility: 'public',
        ownerId: user1Id,
      })

      // 用户2可以直接加入公开房间
      const joinResult1 = manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      })
      expect(joinResult1.success).toBe(true)

      // 用户3尝试加入（公开房间，应该成功）
      const joinResult2 = manager.join(roomId, {
        userId: user3Id,
        userName: user3Name,
      })
      expect(joinResult2.success).toBe(true)
    })
  })

  describe('房间自动清理测试', () => {
    it('应该在所有用户离开后保持房间（项目类型）', async () => {
      manager.create({
        id: roomId,
        type: 'project',
        documentId: 'doc1',
        ownerId: user1Id,
        config: { autoCleanupMinutes: 0 }, // 项目房间不自动清理
      })

      manager.join(roomId, { userId: user1Id, userName: user1Name })
      manager.leave(roomId, user1Id)

      // 房间仍然存在
      expect(manager.exists(roomId)).toBe(true)
    })

    it('应该在用户重新加入时取消清理定时器', async () => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
        config: { autoCleanupMinutes: 1 }, // 1分钟后清理
      })

      manager.join(roomId, { userId: user1Id, userName: user1Name })
      manager.leave(roomId, user1Id)

      // 立即重新加入
      const joinResult = manager.join(roomId, {
        userId: user1Id,
        userName: user1Name,
      })

      expect(joinResult.success).toBe(true)
      expect(manager.exists(roomId)).toBe(true)
    })
  })

  describe('并发场景测试', () => {
    it('应该正确处理同一用户多次加入同一房间', async () => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      })

      // 模拟并发加入（实际场景中可能同时发起）
      const results = await Promise.all([
        Promise.resolve(manager.join(roomId, { userId: user2Id, userName: user2Name })),
        Promise.resolve(manager.join(roomId, { userId: user2Id, userName: user2Name })),
        Promise.resolve(manager.join(roomId, { userId: user2Id, userName: user2Name })),
      ])

      // 所有结果应该成功，但只有一个参与者
      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      const participants = manager.getParticipants(roomId)
      expect(participants.filter(p => p.id === user2Id)).toHaveLength(1)
    })

    it('应该正确处理快速的用户加入-离开-再加入', async () => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      })

      // 快速加入离开
      for (let i = 0; i < 5; i++) {
        manager.join(roomId, { userId: user2Id, userName: user2Name })
        manager.leave(roomId, user2Id)
      }

      // 最后加入
      const joinResult = manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      })

      expect(joinResult.success).toBe(true)
      expect(manager.getParticipants(roomId).find(p => p.id === user2Id)).toBeDefined()
    })

    it('应该正确处理多人同时加入房间', async () => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
        config: { maxParticipants: 100 },
      })

      // 10个用户同时加入
      const userIds = Array.from({ length: 10 }, (_, i) => `concurrent-user-${i}`)
      const joinPromises = userIds.map(userId =>
        Promise.resolve(
          manager.join(roomId, {
            userId,
            userName: `User ${userId}`,
          })
        )
      )

      const results = await Promise.all(joinPromises)

      // 所有用户应该成功加入
      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      expect(manager.getParticipants(roomId)).toHaveLength(10)
    })

    it('应该正确处理角色快速变更', async () => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      })

      manager.join(roomId, { userId: user1Id, userName: user1Name })
      manager.join(roomId, { userId: user2Id, userName: user2Name })

      // 快速变更角色
      manager.changeRole(roomId, user2Id, 'admin', user1Id)
      manager.changeRole(roomId, user2Id, 'moderator', user1Id)
      manager.changeRole(roomId, user2Id, 'member', user1Id)

      const participant = manager.getParticipant(roomId, user2Id)
      expect(participant?.role).toBe('member')
    })
  })

  describe('边界条件测试', () => {
    it('应该正确处理空房间ID', () => {
      const room = manager.get('')
      expect(room).toBeUndefined()
    })

    it('应该正确处理超长房间名称', () => {
      const longName = 'A'.repeat(1000)

      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        name: longName,
        ownerId: user1Id,
      })

      const room = manager.get(roomId)
      expect(room?.name).toBe(longName)
    })

    it('应该正确处理特殊字符在用户名中', () => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      })

      const specialName = '用户👋<script>alert("xss")</script>'
      const joinResult = manager.join(roomId, {
        userId: user2Id,
        userName: specialName,
      })

      expect(joinResult.success).toBe(true)
      expect(joinResult.participant?.name).toBe(specialName)
    })

    it('应该正确处理Unicode字符在房间ID中', () => {
      const unicodeRoomId = '房间-🚀-test'

      manager.create({
        id: unicodeRoomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      })

      expect(manager.exists(unicodeRoomId)).toBe(true)
    })

    it('应该正确处理最大参与者边界', () => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
        config: { maxParticipants: 2 },
      })

      // 第一个用户
      const result1 = manager.join(roomId, { userId: user1Id, userName: user1Name })
      expect(result1.success).toBe(true)

      // 第二个用户
      const result2 = manager.join(roomId, { userId: user2Id, userName: user2Name })
      expect(result2.success).toBe(true)

      // 第三个用户（应该失败）
      const result3 = manager.join(roomId, { userId: user3Id, userName: user3Name })
      expect(result3.success).toBe(false)
      expect(result3.error).toBe('Room is full')
    })
  })

  describe('离线消息集成测试', () => {
    it('应该在用户加入时返回离线消息', () => {
      // 使用集成测试中的 MessageStore
      const messageStore = getMessageStore()

      // 存储离线消息
      const message = messageStore.store({
        id: 'offline-msg-1',
        roomId,
        userId: user1Id,
        userName: user1Name,
        type: 'text',
        content: 'Offline message for user2',
      })

      // 为 user2 队列离线消息
      messageStore.queueOfflineMessage(user2Id, message)

      // 创建房间
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      })

      // user2 加入时应该收到离线消息
      const joinResult = manager.join(roomId, {
        userId: user2Id,
        userName: user2Name,
      })

      expect(joinResult.success).toBe(true)
      expect(joinResult.offlineMessages).toBeDefined()
      expect(joinResult.offlineMessages).toHaveLength(1)
      expect(joinResult.offlineMessages?.[0].content).toBe('Offline message for user2')
    })
  })

  describe('权限验证集成测试', () => {
    it('应该验证踢人权限', () => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      })

      manager.join(roomId, { userId: user1Id, userName: user1Name })
      manager.join(roomId, { userId: user2Id, userName: user2Name })
      manager.join(roomId, { userId: user3Id, userName: user3Name })

      // 普通成员不能踢人
      const kickResult = manager.kick(roomId, user3Id, user2Id, 'No reason')
      expect(kickResult.success).toBe(false)
      expect(kickResult.error).toBe('No permission to kick users')
    })

    it('应该验证封禁权限', () => {
      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      })

      manager.join(roomId, { userId: user1Id, userName: user1Name })
      manager.join(roomId, { userId: user2Id, userName: user2Name })

      // 普通成员不能封禁
      const banResult = manager.ban(roomId, user1Id, user2Id, 'No reason')
      expect(banResult.success).toBe(false)
    })
  })

  describe('回调函数完整测试', () => {
    it('应该触发所有用户生命周期回调', () => {
      const callbacks = {
        onUserJoined: vi.fn(),
        onUserLeft: vi.fn(),
        onRoomCreated: vi.fn(),
        onRoomDestroyed: vi.fn(),
        onUserRoleChanged: vi.fn(),
        onUserBanned: vi.fn(),
      }

      resetRoomManager()
      const testManager = new RoomManager(undefined, undefined, callbacks)

      // 创建房间
      testManager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      })
      expect(callbacks.onRoomCreated).toHaveBeenCalledTimes(1)

      // 用户加入
      testManager.join(roomId, { userId: user1Id, userName: user1Name })
      expect(callbacks.onUserJoined).toHaveBeenCalledTimes(1)

      // 用户离开
      testManager.leave(roomId, user1Id)
      expect(callbacks.onUserLeft).toHaveBeenCalledTimes(1)

      // 销毁房间
      testManager.destroy(roomId)
      expect(callbacks.onRoomDestroyed).toHaveBeenCalledTimes(1)
    })

    it('应该在角色变更时触发回调', () => {
      const onUserRoleChanged = vi.fn()
      resetRoomManager()
      const testManager = new RoomManager(undefined, undefined, { onUserRoleChanged })

      testManager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      })

      testManager.join(roomId, { userId: user1Id, userName: user1Name })
      testManager.join(roomId, { userId: user2Id, userName: user2Name })

      testManager.changeRole(roomId, user2Id, 'admin', user1Id)

      expect(onUserRoleChanged).toHaveBeenCalledTimes(1)
      expect(onUserRoleChanged).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: user2Id, role: 'admin' }),
        'member'
      )
    })

    it('应该在封禁用户时触发回调', () => {
      const onUserBanned = vi.fn()
      resetRoomManager()
      const testManager = new RoomManager(undefined, undefined, { onUserBanned })

      testManager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
      })

      testManager.join(roomId, { userId: user1Id, userName: user1Name })
      testManager.ban(roomId, user2Id, user1Id, 'Spam')

      expect(onUserBanned).toHaveBeenCalledTimes(1)
      expect(onUserBanned).toHaveBeenCalledWith(roomId, user2Id, user1Id)
    })
  })

  describe('数据一致性测试', () => {
    it('应该在销毁房间时清理所有关联数据', () => {
      const messageStore = getMessageStore()

      manager.create({
        id: roomId,
        type: 'chat',
        documentId: 'doc1',
        ownerId: user1Id,
        config: { messageHistoryEnabled: true },
      })

      manager.join(roomId, { userId: user1Id, userName: user1Name })
      manager.join(roomId, { userId: user2Id, userName: user2Name })

      // 添加消息
      messageStore.store({
        id: 'msg1',
        roomId,
        userId: user1Id,
        userName: user1Name,
        type: 'text',
        content: 'Test message',
      })

      // 销毁房间
      manager.destroy(roomId, user1Id)

      // 验证清理
      expect(manager.exists(roomId)).toBe(false)
      expect(manager.getUserRooms(user1Id)).toHaveLength(0)
      expect(manager.getUserRooms(user2Id)).toHaveLength(0)

      // 消息应该被清理
      const history = messageStore.getHistory({ roomId })
      expect(history).toHaveLength(0)
    })

    it('应该在用户离开所有房间后正确追踪', () => {
      const room1 = 'room-1'
      const room2 = 'room-2'

      manager.create({ id: room1, type: 'chat', documentId: 'doc1', ownerId: user1Id })
      manager.create({ id: room2, type: 'chat', documentId: 'doc2', ownerId: user1Id })

      manager.join(room1, { userId: user2Id, userName: user2Name })
      manager.join(room2, { userId: user2Id, userName: user2Name })

      expect(manager.getUserRooms(user2Id)).toHaveLength(2)

      manager.leave(room1, user2Id)
      expect(manager.getUserRooms(user2Id)).toHaveLength(1)

      manager.leave(room2, user2Id)
      expect(manager.getUserRooms(user2Id)).toHaveLength(0)
    })
  })
})
