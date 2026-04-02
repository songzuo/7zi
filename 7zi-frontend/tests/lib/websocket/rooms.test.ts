/**
 * WebSocket 房间系统单元测试
 *
 * 测试覆盖率:
 * - 房间创建
 * - 房间加入/离开
 * - 权限验证
 * - 消息存储
 * - 房间状态管理
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { roomStore, type RoomData } from '@/lib/api/rooms/store'
import type { Room, RoomMember, RoomMessage } from '@/types/rooms'

// 由于 roomStore 是单例，我们需要保存原始状态并在测试后恢复
let originalRooms: Map<string, RoomData>

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('WebSocket 房间系统', () => {
  beforeEach(() => {
    // 保存原始状态并清空
    vi.clearAllMocks()
  })

  afterEach(() => {
    // 清理测试创建的房间
    // 由于单例特性，我们通过删除所有测试创建的房间来清理
    const rooms = roomStore.getAllRooms()
    rooms.forEach(room => {
      roomStore.deleteRoom(room.id)
    })
  })

  afterEach(() => {
    // 清理测试创建的房间
    const rooms = roomStore.getAllRooms()
    rooms.forEach(room => {
      roomStore.deleteRoom(room.id)
    })
  })

  // ============================================
  // 1. 房间创建测试
  // ============================================
  describe('房间创建', () => {
    it('应该成功创建公开房间', () => {
      const room = roomStore.createRoom({
        ownerId: 'user1',
        ownerName: '测试用户',
        name: '测试房间',
      })

      expect(room).toBeDefined()
      expect(room.id).toMatch(/^room_/)
      expect(room.name).toBe('测试房间')
      expect(room.ownerId).toBe('user1')
      expect(room.ownerName).toBe('测试用户')
      expect(room.inviteCode).toHaveLength(8)
      expect(room.members).toHaveLength(1)
      expect(room.members[0].role).toBe('owner')
      expect(room.members[0].isOnline).toBe(true)
      expect(room.memberCount).toBe(1)
      expect(room.onlineCount).toBe(1)
    })

    it('应该成功创建带描述的房间', () => {
      const room = roomStore.createRoom({
        ownerId: 'user1',
        ownerName: '测试用户',
        name: '测试房间',
        description: '这是一个测试房间描述',
      })

      expect(room.description).toBe('这是一个测试房间描述')
    })

    it('应该成功创建带密码的房间', () => {
      const room = roomStore.createRoom({
        ownerId: 'user1',
        ownerName: '测试用户',
        name: '私密房间',
        password: 'secret123',
      })

      expect(room.password).toBe('secret123')
    })

    it('应该成功创建私密房间', () => {
      const room = roomStore.createRoom({
        ownerId: 'user1',
        ownerName: '测试用户',
        name: '私密房间',
        isPrivate: true,
      })

      expect(room).toBeDefined()
      expect(room.name).toBe('私密房间')
    })

    it('应该为每个房间生成唯一的 ID', () => {
      const room1 = roomStore.createRoom({
        ownerId: 'user1',
        ownerName: '用户1',
        name: '房间1',
      })

      const room2 = roomStore.createRoom({
        ownerId: 'user2',
        ownerName: '用户2',
        name: '房间2',
      })

      expect(room1.id).not.toBe(room2.id)
    })

    it('应该为每个房间生成唯一的邀请码', () => {
      const room1 = roomStore.createRoom({
        ownerId: 'user1',
        ownerName: '用户1',
        name: '房间1',
      })

      const room2 = roomStore.createRoom({
        ownerId: 'user2',
        ownerName: '用户2',
        name: '房间2',
      })

      expect(room1.inviteCode).not.toBe(room2.inviteCode)
    })

    it('创建房间时应该正确设置时间戳', () => {
      const beforeCreate = Date.now()
      const room = roomStore.createRoom({
        ownerId: 'user1',
        ownerName: '测试用户',
        name: '测试房间',
      })
      const afterCreate = Date.now()

      expect(room.createdAt).toBeGreaterThanOrEqual(beforeCreate)
      expect(room.createdAt).toBeLessThanOrEqual(afterCreate)
      expect(room.updatedAt).toBe(room.createdAt)
      expect(room.lastActivityAt).toBe(room.createdAt)
    })
  })

  // ============================================
  // 2. 房间加入/离开测试
  // ============================================
  describe('房间加入/离开', () => {
    let testRoom: Room

    beforeEach(() => {
      testRoom = roomStore.createRoom({
        ownerId: 'owner1',
        ownerName: '房主',
        name: '测试房间',
      })
    })

    it('用户应该能成功加入房间', () => {
      const updatedRoom = roomStore.joinRoom(testRoom.id, {
        id: 'user1',
        name: '新用户',
      })

      expect(updatedRoom).toBeDefined()
      expect(updatedRoom!.members).toHaveLength(2)
      expect(updatedRoom!.memberCount).toBe(2)
      expect(updatedRoom!.onlineCount).toBe(2)

      const newMember = updatedRoom!.members.find(m => m.id === 'user1')
      expect(newMember).toBeDefined()
      expect(newMember!.role).toBe('member')
      expect(newMember!.isOnline).toBe(true)
    })

    it('用户应该能加入有密码的房间（正确密码）', () => {
      const passwordRoom = roomStore.createRoom({
        ownerId: 'owner1',
        ownerName: '房主',
        name: '密码房间',
        password: 'secret123',
      })

      const updatedRoom = roomStore.joinRoom(
        passwordRoom.id,
        {
          id: 'user1',
          name: '新用户',
        },
        'secret123'
      )

      expect(updatedRoom).toBeDefined()
      expect(updatedRoom!.members).toHaveLength(2)
    })

    it('用户加入有密码的房间时，密码错误应该抛出异常', () => {
      const passwordRoom = roomStore.createRoom({
        ownerId: 'owner1',
        ownerName: '房主',
        name: '密码房间',
        password: 'secret123',
      })

      expect(() => {
        roomStore.joinRoom(
          passwordRoom.id,
          {
            id: 'user1',
            name: '新用户',
          },
          'wrongpassword'
        )
      }).toThrow('Incorrect password')
    })

    it('用户加入有密码的房间时，未提供密码应该抛出异常', () => {
      const passwordRoom = roomStore.createRoom({
        ownerId: 'owner1',
        ownerName: '房主',
        name: '密码房间',
        password: 'secret123',
      })

      expect(() => {
        roomStore.joinRoom(passwordRoom.id, {
          id: 'user1',
          name: '新用户',
        })
      }).toThrow('Incorrect password')
    })

    it('用户加入不存在的房间应该返回 null', () => {
      const result = roomStore.joinRoom('non-existent-room', {
        id: 'user1',
        name: '新用户',
      })

      expect(result).toBeNull()
    })

    it('已在线用户再次加入应该更新在线状态', () => {
      // 用户先加入
      roomStore.joinRoom(testRoom.id, {
        id: 'user1',
        name: '新用户',
      })

      // 用户离开
      roomStore.leaveRoom(testRoom.id, 'user1')

      // 用户再次加入
      const updatedRoom = roomStore.joinRoom(testRoom.id, {
        id: 'user1',
        name: '新用户',
      })

      expect(updatedRoom!.members).toHaveLength(2) // 房主 + 用户
      expect(updatedRoom!.onlineCount).toBe(2)

      const member = updatedRoom!.members.find(m => m.id === 'user1')
      expect(member!.isOnline).toBe(true)
    })

    it('用户应该能成功离开房间', () => {
      // 用户加入
      roomStore.joinRoom(testRoom.id, {
        id: 'user1',
        name: '新用户',
      })

      // 用户离开
      const updatedRoom = roomStore.leaveRoom(testRoom.id, 'user1')

      expect(updatedRoom).toBeDefined()
      expect(updatedRoom!.onlineCount).toBe(1)

      const member = updatedRoom!.members.find(m => m.id === 'user1')
      expect(member!.isOnline).toBe(false)
    })

    it('用户离开不存在的房间应该返回 null', () => {
      const result = roomStore.leaveRoom('non-existent-room', 'user1')
      expect(result).toBeNull()
    })

    it('非成员离开房间应该返回 null', () => {
      const result = roomStore.leaveRoom(testRoom.id, 'non-member')
      expect(result).toBeNull()
    })

    it('加入房间后成员数量应该正确', () => {
      // 多个用户加入
      roomStore.joinRoom(testRoom.id, { id: 'user1', name: '用户1' })
      roomStore.joinRoom(testRoom.id, { id: 'user2', name: '用户2' })
      roomStore.joinRoom(testRoom.id, { id: 'user3', name: '用户3' })

      const room = roomStore.getRoomById(testRoom.id)
      expect(room!.memberCount).toBe(4) // 房主 + 3个用户
      expect(room!.onlineCount).toBe(4)
    })

    it('用户离开后在线数量应该正确更新', () => {
      // 多个用户加入
      roomStore.joinRoom(testRoom.id, { id: 'user1', name: '用户1' })
      roomStore.joinRoom(testRoom.id, { id: 'user2', name: '用户2' })

      // 一个用户离开
      roomStore.leaveRoom(testRoom.id, 'user1')

      const room = roomStore.getRoomById(testRoom.id)
      expect(room!.memberCount).toBe(3) // 房主 + 2个用户
      expect(room!.onlineCount).toBe(2) // 房主 + user2
    })

    it('用户加入时应该携带头像', () => {
      const updatedRoom = roomStore.joinRoom(testRoom.id, {
        id: 'user1',
        name: '新用户',
        avatar: 'https://example.com/avatar.png',
      })

      const member = updatedRoom!.members.find(m => m.id === 'user1')
      expect(member!.avatar).toBe('https://example.com/avatar.png')
    })
  })

  // ============================================
  // 3. 权限验证测试
  // ============================================
  describe('权限验证', () => {
    let testRoom: Room

    beforeEach(() => {
      testRoom = roomStore.createRoom({
        ownerId: 'owner1',
        ownerName: '房主',
        name: '测试房间',
      })
    })

    it('房主角色应该是 owner', () => {
      const owner = testRoom.members.find(m => m.id === 'owner1')
      expect(owner!.role).toBe('owner')
    })

    it('新加入用户角色应该是 member', () => {
      roomStore.joinRoom(testRoom.id, {
        id: 'user1',
        name: '普通用户',
      })

      const room = roomStore.getRoomById(testRoom.id)
      const member = room!.members.find(m => m.id === 'user1')
      expect(member!.role).toBe('member')
    })

    it('房主重新加入应该保持 owner 角色', () => {
      // 房主离开
      roomStore.leaveRoom(testRoom.id, 'owner1')

      // 房主重新加入
      const updatedRoom = roomStore.joinRoom(testRoom.id, {
        id: 'owner1',
        name: '房主',
      })

      const owner = updatedRoom!.members.find(m => m.id === 'owner1')
      expect(owner!.role).toBe('owner')
      expect(owner!.isOnline).toBe(true)
    })

    it('房间的 ownerId 应该正确设置', () => {
      expect(testRoom.ownerId).toBe('owner1')
      expect(testRoom.ownerName).toBe('房主')
    })

    it('非房主用户不应该有 owner 角色', () => {
      roomStore.joinRoom(testRoom.id, {
        id: 'user1',
        name: '普通用户',
      })

      const room = roomStore.getRoomById(testRoom.id)
      const member = room!.members.find(m => m.id === 'user1')
      expect(member!.role).not.toBe('owner')
    })

    it('房间成员角色应该是有效的角色类型', () => {
      const validRoles = ['owner', 'admin', 'member']

      roomStore.joinRoom(testRoom.id, { id: 'user1', name: '用户1' })

      const room = roomStore.getRoomById(testRoom.id)
      room!.members.forEach(member => {
        expect(validRoles).toContain(member.role)
      })
    })

    it('只有房主应该在创建时成为 owner', () => {
      const newRoom = roomStore.createRoom({
        ownerId: 'creator1',
        ownerName: '创建者',
        name: '新房间',
      })

      const owners = newRoom.members.filter(m => m.role === 'owner')
      expect(owners).toHaveLength(1)
      expect(owners[0].id).toBe('creator1')
    })
  })

  // ============================================
  // 4. 消息存储测试
  // ============================================
  describe('消息存储', () => {
    let testRoom: Room

    beforeEach(() => {
      testRoom = roomStore.createRoom({
        ownerId: 'owner1',
        ownerName: '房主',
        name: '测试房间',
      })
    })

    it('应该能添加消息到房间', () => {
      const message = roomStore.addMessage(testRoom.id, {
        roomId: testRoom.id,
        senderId: 'user1',
        senderName: '用户1',
        content: '你好，世界！',
        type: 'text',
      })

      expect(message).toBeDefined()
      expect(message!.id).toMatch(/^msg_/)
      expect(message!.content).toBe('你好，世界！')
      expect(message!.senderId).toBe('user1')
      expect(message!.type).toBe('text')
      expect(message!.timestamp).toBeGreaterThan(0)
    })

    it('添加消息到不存在的房间应该返回 null', () => {
      const message = roomStore.addMessage('non-existent-room', {
        roomId: 'non-existent-room',
        senderId: 'user1',
        senderName: '用户1',
        content: '测试消息',
        type: 'text',
      })

      expect(message).toBeNull()
    })

    it('应该能获取房间的消息列表', () => {
      roomStore.addMessage(testRoom.id, {
        roomId: testRoom.id,
        senderId: 'user1',
        senderName: '用户1',
        content: '消息1',
        type: 'text',
      })

      roomStore.addMessage(testRoom.id, {
        roomId: testRoom.id,
        senderId: 'user2',
        senderName: '用户2',
        content: '消息2',
        type: 'text',
      })

      const messages = roomStore.getRoomMessages(testRoom.id)
      expect(messages).toHaveLength(2)
    })

    it('应该能限制获取消息的数量', () => {
      // 添加多条消息
      for (let i = 0; i < 10; i++) {
        roomStore.addMessage(testRoom.id, {
          roomId: testRoom.id,
          senderId: 'user1',
          senderName: '用户1',
          content: `消息${i}`,
          type: 'text',
        })
      }

      const messages = roomStore.getRoomMessages(testRoom.id, 5)
      expect(messages).toHaveLength(5)
    })

    it('消息应该按时间倒序排列（最新的在前）', async () => {
      // 添加消息（模拟时间间隔）
      roomStore.addMessage(testRoom.id, {
        roomId: testRoom.id,
        senderId: 'user1',
        senderName: '用户1',
        content: '第一条消息',
        type: 'text',
      })

      // 短暂延迟
      await new Promise(resolve => setTimeout(resolve, 10))

      roomStore.addMessage(testRoom.id, {
        roomId: testRoom.id,
        senderId: 'user2',
        senderName: '用户2',
        content: '第二条消息',
        type: 'text',
      })

      const messages = roomStore.getRoomMessages(testRoom.id)
      expect(messages[0].content).toBe('第二条消息')
      expect(messages[1].content).toBe('第一条消息')
    })

    it('应该支持系统消息', () => {
      const message = roomStore.addMessage(testRoom.id, {
        roomId: testRoom.id,
        senderId: 'system',
        senderName: '系统',
        content: '用户加入了房间',
        type: 'system',
      })

      expect(message!.type).toBe('system')
    })

    it('应该支持通知消息', () => {
      const message = roomStore.addMessage(testRoom.id, {
        roomId: testRoom.id,
        senderId: 'system',
        senderName: '系统',
        content: '房间设置已更新',
        type: 'notification',
      })

      expect(message!.type).toBe('notification')
    })

    it('消息应该包含发送者头像', () => {
      const message = roomStore.addMessage(testRoom.id, {
        roomId: testRoom.id,
        senderId: 'user1',
        senderName: '用户1',
        senderAvatar: 'https://example.com/avatar.png',
        content: '带头像的消息',
        type: 'text',
      })

      expect(message!.senderAvatar).toBe('https://example.com/avatar.png')
    })

    it('不存在的房间消息列表应该为空', () => {
      const messages = roomStore.getRoomMessages('non-existent-room')
      expect(messages).toEqual([])
    })

    it('添加消息应该更新房间活跃时间', async () => {
      const beforeAdd = roomStore.getRoomById(testRoom.id)!.lastActivityAt

      // 短暂延迟
      await new Promise(resolve => setTimeout(resolve, 10))

      roomStore.addMessage(testRoom.id, {
        roomId: testRoom.id,
        senderId: 'user1',
        senderName: '用户1',
        content: '新消息',
        type: 'text',
      })

      const afterAdd = roomStore.getRoomById(testRoom.id)!.lastActivityAt
      expect(afterAdd).toBeGreaterThan(beforeAdd)
    })
  })

  // ============================================
  // 5. 房间状态管理测试
  // ============================================
  describe('房间状态管理', () => {
    let testRoom: Room

    beforeEach(() => {
      testRoom = roomStore.createRoom({
        ownerId: 'owner1',
        ownerName: '房主',
        name: '测试房间',
        description: '原始描述',
      })
    })

    it('应该能获取所有房间', () => {
      roomStore.createRoom({
        ownerId: 'user1',
        ownerName: '用户1',
        name: '房间2',
      })

      roomStore.createRoom({
        ownerId: 'user2',
        ownerName: '用户2',
        name: '房间3',
      })

      const rooms = roomStore.getAllRooms()
      expect(rooms).toHaveLength(3)
    })

    it('应该能根据 ID 获取房间', () => {
      const room = roomStore.getRoomById(testRoom.id)
      expect(room).toBeDefined()
      expect(room!.id).toBe(testRoom.id)
    })

    it('获取不存在的房间应该返回 undefined', () => {
      const room = roomStore.getRoomById('non-existent-id')
      expect(room).toBeUndefined()
    })

    it('应该能根据邀请码获取房间', () => {
      const room = roomStore.getRoomByInviteCode(testRoom.inviteCode)
      expect(room).toBeDefined()
      expect(room!.id).toBe(testRoom.id)
    })

    it('使用无效邀请码获取房间应该返回 undefined', () => {
      const room = roomStore.getRoomByInviteCode('INVALID')
      expect(room).toBeUndefined()
    })

    it('应该能更新房间名称', () => {
      const updatedRoom = roomStore.updateRoom(testRoom.id, {
        name: '更新后的房间名',
      })

      expect(updatedRoom!.name).toBe('更新后的房间名')
    })

    it('应该能更新房间描述', () => {
      const updatedRoom = roomStore.updateRoom(testRoom.id, {
        description: '更新后的描述',
      })

      expect(updatedRoom!.description).toBe('更新后的描述')
    })

    it('应该能更新房间密码', () => {
      const updatedRoom = roomStore.updateRoom(testRoom.id, {
        password: 'newPassword123',
      })

      expect(updatedRoom!.password).toBe('newPassword123')
    })

    it('更新不存在的房间应该返回 null', () => {
      const result = roomStore.updateRoom('non-existent-id', {
        name: '新名称',
      })

      expect(result).toBeNull()
    })

    it('更新房间时应该更新 updatedAt 时间戳', async () => {
      const beforeUpdate = testRoom.updatedAt

      // 短暂延迟
      await new Promise(resolve => setTimeout(resolve, 10))

      const updatedRoom = roomStore.updateRoom(testRoom.id, {
        name: '新名称',
      })

      expect(updatedRoom!.updatedAt).toBeGreaterThan(beforeUpdate)
    })

    it('应该能删除房间', () => {
      const result = roomStore.deleteRoom(testRoom.id)
      expect(result).toBe(true)

      const room = roomStore.getRoomById(testRoom.id)
      expect(room).toBeUndefined()
    })

    it('删除不存在的房间应该返回 false', () => {
      const result = roomStore.deleteRoom('non-existent-id')
      expect(result).toBe(false)
    })

    it('应该能获取房间的成员列表', () => {
      roomStore.joinRoom(testRoom.id, { id: 'user1', name: '用户1' })
      roomStore.joinRoom(testRoom.id, { id: 'user2', name: '用户2' })

      const members = roomStore.getRoomMembers(testRoom.id)
      expect(members).toHaveLength(3)
    })

    it('不存在房间的成员列表应该返回 null', () => {
      const members = roomStore.getRoomMembers('non-existent-id')
      expect(members).toBeNull()
    })

    it('应该能获取完整的房间数据（包含消息）', () => {
      roomStore.addMessage(testRoom.id, {
        roomId: testRoom.id,
        senderId: 'user1',
        senderName: '用户1',
        content: '测试消息',
        type: 'text',
      })

      const roomData = roomStore.getRoomData(testRoom.id)
      expect(roomData).toBeDefined()
      expect(roomData!.room.id).toBe(testRoom.id)
      expect(roomData!.messages).toHaveLength(1)
    })

    it('不存在房间的完整数据应该返回 undefined', () => {
      const roomData = roomStore.getRoomData('non-existent-id')
      expect(roomData).toBeUndefined()
    })

    it('删除房间后不应该出现在房间列表中', () => {
      const roomId = testRoom.id
      roomStore.deleteRoom(roomId)

      const rooms = roomStore.getAllRooms()
      expect(rooms.find(r => r.id === roomId)).toBeUndefined()
    })
  })

  // ============================================
  // 6. 边界情况和错误处理测试
  // ============================================
  describe('边界情况和错误处理', () => {
    it('创建房间时名称为空应该仍然创建成功', () => {
      const room = roomStore.createRoom({
        ownerId: 'user1',
        ownerName: '用户',
        name: '',
      })

      expect(room).toBeDefined()
      expect(room.name).toBe('')
    })

    it('邀请码应该是大写字母和数字的组合', () => {
      const inviteCode = roomStore.generateInviteCode()
      expect(inviteCode).toMatch(/^[A-Z0-9]{8}$/)
    })

    it('多个用户同时加入应该正确统计', () => {
      const room = roomStore.createRoom({
        ownerId: 'owner1',
        ownerName: '房主',
        name: '测试房间',
      })

      // 模拟多个用户同时加入
      for (let i = 0; i < 10; i++) {
        roomStore.joinRoom(room.id, {
          id: `user${i}`,
          name: `用户${i}`,
        })
      }

      const updatedRoom = roomStore.getRoomById(room.id)
      expect(updatedRoom!.memberCount).toBe(11) // 房主 + 10 个用户
      expect(updatedRoom!.onlineCount).toBe(11)
    })

    it('同一用户重复加入应该不增加成员数', () => {
      const room = roomStore.createRoom({
        ownerId: 'owner1',
        ownerName: '房主',
        name: '测试房间',
      })

      roomStore.joinRoom(room.id, { id: 'user1', name: '用户1' })
      roomStore.joinRoom(room.id, { id: 'user1', name: '用户1' })
      roomStore.joinRoom(room.id, { id: 'user1', name: '用户1' })

      const updatedRoom = roomStore.getRoomById(room.id)
      expect(updatedRoom!.memberCount).toBe(2) // 房主 + user1
    })

    it('大量消息应该正确存储', () => {
      const room = roomStore.createRoom({
        ownerId: 'owner1',
        ownerName: '房主',
        name: '测试房间',
      })

      const messageCount = 100
      for (let i = 0; i < messageCount; i++) {
        roomStore.addMessage(room.id, {
          roomId: room.id,
          senderId: 'user1',
          senderName: '用户1',
          content: `消息 ${i}`,
          type: 'text',
        })
      }

      const messages = roomStore.getRoomMessages(room.id)
      expect(messages).toHaveLength(messageCount)
    })
  })
})
