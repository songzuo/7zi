/**
 * WebSocket v1.4.0 Integration Tests
 *
 * 完整的集成测试套件，测试 WebSocket v1.4.0 的核心功能：
 * - 房间系统（创建、加入、离开、销毁）
 * - 权限控制系统（角色验证、权限检查）
 * - 消息持久化（存储、检索、离线队列）
 * - 重连机制（连接恢复、状态同步）
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getRoomManager, resetRoomManager, RoomManager } from '@/lib/websocket/rooms'
import {
  getPermissionManager,
  resetPermissionManager,
  PermissionManager,
  DEFAULT_ROLE_PERMISSIONS,
  type UserRole,
} from '@/lib/websocket/permissions'
import { getMessageStore, resetMessageStore, MessageStore } from '@/lib/websocket/message-store'

describe('WebSocket v1.4.0 Integration Tests', () => {
  let roomManager: RoomManager
  let permissionManager: PermissionManager
  let messageStore: MessageStore

  beforeEach(() => {
    resetPermissionManager()
    resetMessageStore()
    resetRoomManager()
    roomManager = getRoomManager()
    permissionManager = getPermissionManager()
    messageStore = getMessageStore()
  })

  afterEach(() => {
    resetPermissionManager()
    resetMessageStore()
    resetRoomManager()
  })

  // ============================================================================
  // 房间系统集成测试
  // ============================================================================

  describe('房间系统集成', () => {
    describe('房间创建流程', () => {
      it('应该成功创建公开房间', () => {
        const room = roomManager.create({
          id: 'public-room',
          type: 'chat',
          documentId: 'doc-1',
          ownerId: 'user-1',
        })

        expect(room).toBeDefined()
        expect(room.id).toBe('public-room')
        expect(room.type).toBe('chat')
        expect(room.visibility).toBe('public')
      })

      it('应该成功创建私有房间', () => {
        const room = roomManager.create({
          id: 'private-room',
          type: 'project',
          documentId: 'doc-2',
          visibility: 'private',
          ownerId: 'user-1',
        })

        expect(room).toBeDefined()
        expect(room.visibility).toBe('private')
      })

      it('应该支持不同类型的房间', () => {
        const types: Array<'task' | 'project' | 'chat' | 'document'> = [
          'task',
          'project',
          'chat',
          'document',
        ]

        types.forEach((type, i) => {
          const room = roomManager.create({
            id: `room-${type}-${i}`,
            type,
            documentId: `doc-${i}`,
            ownerId: 'user-1',
          })
          expect(room.type).toBe(type)
        })
      })
    })

    describe('房间加入流程', () => {
      beforeEach(() => {
        roomManager.create({
          id: 'join-test-room',
          type: 'chat',
          documentId: 'doc-join',
          visibility: 'public',
          ownerId: 'user-1',
        })

        roomManager.create({
          id: 'private-join-room',
          type: 'chat',
          documentId: 'doc-private',
          visibility: 'private',
          ownerId: 'user-1',
        })
      })

      it('应该允许用户加入公开房间', () => {
        const result = roomManager.join('join-test-room', {
          userId: 'user-2',
          userName: 'Bob',
          email: 'bob@example.com',
        })

        expect(result.success).toBe(true)
        expect(result.participant?.id).toBe('user-2')
      })

      it('应该拒绝未邀请用户加入私有房间', () => {
        const result = roomManager.join('private-join-room', {
          userId: 'user-2',
          userName: 'Bob',
          email: 'bob@example.com',
        })

        expect(result.success).toBe(false)
      })

      it('应该允许被邀请用户加入私有房间', () => {
        roomManager.invite('private-join-room', 'user-2', 'user-1')

        const result = roomManager.join('private-join-room', {
          userId: 'user-2',
          userName: 'Bob',
          email: 'bob@example.com',
        })

        expect(result.success).toBe(true)
      })
    })

    describe('房间离开流程', () => {
      beforeEach(() => {
        roomManager.create({
          id: 'leave-test-room',
          type: 'chat',
          documentId: 'doc-leave',
          ownerId: 'user-1',
        })

        roomManager.join('leave-test-room', {
          userId: 'user-1',
          userName: 'Alice',
          email: 'alice@example.com',
        })

        roomManager.join('leave-test-room', {
          userId: 'user-2',
          userName: 'Bob',
          email: 'bob@example.com',
        })
      })

      it('应该正确处理用户离开房间', () => {
        const result = roomManager.leave('leave-test-room', 'user-2')
        expect(result.success).toBe(true)

        const room = roomManager.get('leave-test-room')
        expect(room?.participants.has('user-2')).toBe(false)
      })
    })

    describe('房间销毁流程', () => {
      beforeEach(() => {
        roomManager.create({
          id: 'destroy-test-room',
          type: 'chat',
          documentId: 'doc-destroy',
          ownerId: 'user-1',
        })
      })

      it('应该正确销毁房间', () => {
        const result = roomManager.destroy('destroy-test-room')
        expect(result).toBe(true)

        const room = roomManager.get('destroy-test-room')
        expect(room).toBeUndefined()
      })
    })
  })

  // ============================================================================
  // 权限控制集成测试
  // ============================================================================

  describe('权限控制集成', () => {
    beforeEach(() => {
      roomManager.create({
        id: 'perm-test-room',
        type: 'chat',
        documentId: 'doc-perm',
        ownerId: 'user-1',
      })
    })

    describe('角色管理', () => {
      it('应该正确设置用户角色', () => {
        permissionManager.setUserRole('user-1', 'perm-test-room', 'admin')

        const role = permissionManager.getUserRole('user-1', 'perm-test-room')
        expect(role).toBe('admin')
      })

      it('应该支持多种角色类型', () => {
        const roles: UserRole[] = ['owner', 'admin', 'moderator', 'member', 'guest']

        roles.forEach((role, i) => {
          permissionManager.setUserRole(`user-${i}`, 'perm-test-room', role)
          const assignedRole = permissionManager.getUserRole(`user-${i}`, 'perm-test-room')
          expect(assignedRole).toBe(role)
        })
      })

      it('应该为每个角色分配默认权限', () => {
        const ownerPerms = DEFAULT_ROLE_PERMISSIONS['owner']
        const memberPerms = DEFAULT_ROLE_PERMISSIONS['member']
        const guestPerms = DEFAULT_ROLE_PERMISSIONS['guest']

        expect(ownerPerms).toContain('room:manage')
        expect(memberPerms).toContain('message:send')
        expect(guestPerms).toContain('room:view')
      })
    })

    describe('权限检查', () => {
      it('应该根据角色正确检查权限', () => {
        permissionManager.setUserRole('user-1', 'perm-test-room', 'owner')
        permissionManager.setUserRole('user-2', 'perm-test-room', 'member')

        expect(permissionManager.hasPermission('user-1', 'perm-test-room', 'room:manage')).toBe(
          true
        )
        expect(permissionManager.hasPermission('user-2', 'perm-test-room', 'room:manage')).toBe(
          false
        )
        expect(permissionManager.hasPermission('user-2', 'perm-test-room', 'message:send')).toBe(
          true
        )
      })

      it('应该支持用户封禁', () => {
        permissionManager.setUserRole('user-1', 'perm-test-room', 'owner')
        permissionManager.banUser('user-2', 'perm-test-room', 'user-1', 'Spamming')

        const bannedUsers = permissionManager.getBannedUsers('perm-test-room')
        expect(bannedUsers).toContain('user-2')
      })
    })
  })

  // ============================================================================
  // 消息持久化集成测试
  // ============================================================================

  describe('消息持久化集成', () => {
    beforeEach(() => {
      roomManager.create({
        id: 'msg-test-room',
        type: 'chat',
        documentId: 'doc-msg',
        ownerId: 'user-1',
      })
    })

    describe('消息存储和检索', () => {
      it('应该成功存储和检索消息', () => {
        const message = messageStore.store({
          id: 'msg-1',
          roomId: 'msg-test-room',
          userId: 'user-1',
          userName: 'Alice',
          type: 'text',
          content: 'Hello!',
        })

        expect(message).toBeDefined()
        expect(message.id).toBe('msg-1')

        const retrieved = messageStore.get('msg-1')
        expect(retrieved?.content).toBe('Hello!')
      })

      it('应该支持消息编辑', () => {
        messageStore.store({
          id: 'msg-2',
          roomId: 'msg-test-room',
          userId: 'user-1',
          userName: 'Alice',
          type: 'text',
          content: 'Original',
        })

        const edited = messageStore.edit('msg-2', 'Edited', 'user-1')
        expect(edited?.content).toBe('Edited')
        expect(edited?.edited).toBe(true)
      })

      it('应该支持消息删除', () => {
        messageStore.store({
          id: 'msg-3',
          roomId: 'msg-test-room',
          userId: 'user-1',
          userName: 'Alice',
          type: 'text',
          content: 'To be deleted',
        })

        const deleted = messageStore.delete('msg-3', 'user-1')
        expect(deleted).toBe(true)

        const retrieved = messageStore.get('msg-3')
        // 删除通过 metadata.deleted 标记
        expect(retrieved?.metadata?.deleted).toBe(true)
      })
    })

    describe('离线消息队列', () => {
      it('应该为离线用户存储消息', () => {
        const message = messageStore.store({
          id: 'offline-msg',
          roomId: 'msg-test-room',
          userId: 'user-1',
          userName: 'Alice',
          type: 'text',
          content: 'For offline user',
        })

        messageStore.queueOfflineMessage('user-2', message)

        const offlineMessages = messageStore.getOfflineMessages('user-2')
        expect(offlineMessages.length).toBeGreaterThan(0)
      })
    })
  })

  // ============================================================================
  // 重连机制集成测试
  // ============================================================================

  describe('重连机制集成', () => {
    beforeEach(() => {
      roomManager.create({
        id: 'reconnect-room',
        type: 'chat',
        documentId: 'doc-reconnect',
        ownerId: 'user-1',
      })
    })

    describe('连接状态恢复', () => {
      it('应该正确处理用户重连', () => {
        const joinResult = roomManager.join('reconnect-room', {
          userId: 'user-1',
          userName: 'Alice',
          email: 'alice@example.com',
        })
        expect(joinResult.success).toBe(true)

        roomManager.leave('reconnect-room', 'user-1')

        const reconnectResult = roomManager.join('reconnect-room', {
          userId: 'user-1',
          userName: 'Alice',
          email: 'alice@example.com',
        })
        expect(reconnectResult.success).toBe(true)
      })

      it('应该在重连时保留用户权限', () => {
        roomManager.join('reconnect-room', {
          userId: 'user-1',
          userName: 'Alice',
          email: 'alice@example.com',
        })

        // 用户1是房间创建者，角色为 owner
        const roleBefore = permissionManager.getUserRole('user-1', 'reconnect-room')
        expect(roleBefore).toBe('owner')

        roomManager.leave('reconnect-room', 'user-1')
        roomManager.join('reconnect-room', {
          userId: 'user-1',
          userName: 'Alice',
          email: 'alice@example.com',
        })

        // 角色应该保持为 owner
        const role = permissionManager.getUserRole('user-1', 'reconnect-room')
        expect(role).toBe('owner')
      })
    })

    describe('房间状态同步', () => {
      it('应该在重连后同步房间状态', () => {
        roomManager.join('reconnect-room', {
          userId: 'user-1',
          userName: 'Alice',
          email: 'alice@example.com',
        })

        roomManager.updateData('reconnect-room', {
          content: 'Updated content',
          revision: 2,
        })

        roomManager.leave('reconnect-room', 'user-1')

        roomManager.join('reconnect-room', {
          userId: 'user-1',
          userName: 'Alice',
          email: 'alice@example.com',
        })

        const room = roomManager.get('reconnect-room')
        expect(room?.data.content).toBe('Updated content')
      })
    })
  })

  // ============================================================================
  // 多用户协作场景测试
  // ============================================================================

  describe('多用户协作场景', () => {
    beforeEach(() => {
      roomManager.create({
        id: 'collab-room',
        type: 'document',
        documentId: 'doc-collab',
        ownerId: 'user-1',
      })
    })

    it('应该支持多用户同时加入房间', async () => {
      const userIds = ['user-1', 'user-2', 'user-3']

      const results = userIds.map(userId =>
        roomManager.join('collab-room', {
          userId,
          userName: `User ${userId}`,
          email: `${userId}@example.com`,
        })
      )

      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      const room = roomManager.get('collab-room')
      expect(room?.participants.size).toBe(3)
    })

    it('应该正确处理管理员管理用户', () => {
      roomManager.join('collab-room', {
        userId: 'user-1',
        userName: 'Alice',
        email: 'alice@example.com',
      })

      roomManager.join('collab-room', {
        userId: 'user-2',
        userName: 'Bob',
        email: 'bob@example.com',
      })

      permissionManager.setUserRole('user-1', 'collab-room', 'owner')
      permissionManager.setUserRole('user-2', 'collab-room', 'member')

      expect(permissionManager.canManageUser('user-1', 'user-2', 'collab-room')).toBe(true)
    })
  })

  // ============================================================================
  // 完整流程测试
  // ============================================================================

  describe('完整流程测试', () => {
    it('应该验证端到端协作流程', () => {
      // 1. 创建房间
      const room = roomManager.create({
        id: 'e2e-room',
        type: 'chat',
        documentId: 'doc-e2e',
        ownerId: 'user-1',
      })
      expect(room).toBeDefined()

      // 2. 用户加入
      const joinResult = roomManager.join('e2e-room', {
        userId: 'user-1',
        userName: 'Alice',
        email: 'alice@example.com',
      })
      expect(joinResult.success).toBe(true)

      // 3. 发送消息
      const message = messageStore.store({
        id: 'e2e-msg',
        roomId: 'e2e-room',
        userId: 'user-1',
        userName: 'Alice',
        type: 'text',
        content: 'Test message',
      })
      expect(message).toBeDefined()

      // 4. 查询消息
      const history = messageStore.getHistory({ roomId: 'e2e-room' })
      expect(history.length).toBeGreaterThan(0)

      // 5. 用户离开
      const leaveResult = roomManager.leave('e2e-room', 'user-1')
      expect(leaveResult.success).toBe(true)

      // 6. 销毁房间
      const destroyResult = roomManager.destroy('e2e-room')
      expect(destroyResult).toBe(true)

      // 7. 验证房间已销毁
      expect(roomManager.get('e2e-room')).toBeUndefined()
    })
  })
})
