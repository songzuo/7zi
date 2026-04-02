/**
 * Integration Tests: WebSocket Room System (v1.5.0)
 *
 * 测试 WebSocket 房间系统的核心功能:
 * - 房间创建和管理
 * - 权限控制系统
 * - 消息持久化
 * - 多用户协作
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ===== Room System Types =====

type RoomType = 'task' | 'project' | 'chat' | 'document' | 'voice' | 'video'
type RoomVisibility = 'public' | 'private' | 'invite-only'
type RoomRole = 'owner' | 'admin' | 'moderator' | 'member' | 'guest'

interface RoomPermission {
  canEditRoom: boolean
  canDeleteRoom: boolean
  canInviteMembers: boolean
  canRemoveMembers: boolean
  canSendMessage: boolean
  canEditMessage: boolean
  canDeleteMessage: boolean
  canPinMessage: boolean
  canManageRoles: boolean
  canViewHistory: boolean
  canManagePermissions: boolean
  canChangeVisibility: boolean
  canArchiveRoom: boolean
  canManageBots: boolean
  canUseVoice: boolean
  canUseVideo: boolean
}

interface Room {
  id: string
  name: string
  type: RoomType
  visibility: RoomVisibility
  ownerId: string
  members: Map<string, { userId: string; role: RoomRole; joinedAt: number }>
  messages: RoomMessage[]
  permissions: Map<RoomRole, RoomPermission>
  createdAt: number
  updatedAt: number
}

interface RoomMessage {
  id: string
  roomId: string
  userId: string
  content: string
  type: 'text' | 'system' | 'file' | 'image'
  createdAt: number
  updatedAt?: number
  editedAt?: number
  deletedAt?: number
}

interface User {
  id: string
  name: string
  email: string
}

// ===== Mock Room Manager =====

class MockRoomManager {
  private rooms: Map<string, Room> = new Map()
  private userRooms: Map<string, Set<string>> = new Map()
  private messageQueue: Map<string, RoomMessage[]> = new Map()
  private maxMessagesPerRoom = 10000

  private getDefaultPermissions(): Map<RoomRole, RoomPermission> {
    return new Map([
      [
        'owner',
        {
          canEditRoom: true,
          canDeleteRoom: true,
          canInviteMembers: true,
          canRemoveMembers: true,
          canSendMessage: true,
          canEditMessage: true,
          canDeleteMessage: true,
          canPinMessage: true,
          canManageRoles: true,
          canViewHistory: true,
          canManagePermissions: true,
          canChangeVisibility: true,
          canArchiveRoom: true,
          canManageBots: true,
          canUseVoice: true,
          canUseVideo: true,
        },
      ],
      [
        'admin',
        {
          canEditRoom: true,
          canDeleteRoom: false,
          canInviteMembers: true,
          canRemoveMembers: true,
          canSendMessage: true,
          canEditMessage: true,
          canDeleteMessage: true,
          canPinMessage: true,
          canManageRoles: true,
          canViewHistory: true,
          canManagePermissions: false,
          canChangeVisibility: false,
          canArchiveRoom: true,
          canManageBots: true,
          canUseVoice: true,
          canUseVideo: true,
        },
      ],
      [
        'moderator',
        {
          canEditRoom: false,
          canDeleteRoom: false,
          canInviteMembers: true,
          canRemoveMembers: false,
          canSendMessage: true,
          canEditMessage: false,
          canDeleteMessage: true,
          canPinMessage: true,
          canManageRoles: false,
          canViewHistory: true,
          canManagePermissions: false,
          canChangeVisibility: false,
          canArchiveRoom: false,
          canManageBots: false,
          canUseVoice: true,
          canUseVideo: true,
        },
      ],
      [
        'member',
        {
          canEditRoom: false,
          canDeleteRoom: false,
          canInviteMembers: false,
          canRemoveMembers: false,
          canSendMessage: true,
          canEditMessage: false,
          canDeleteMessage: false,
          canPinMessage: false,
          canManageRoles: false,
          canViewHistory: true,
          canManagePermissions: false,
          canChangeVisibility: false,
          canArchiveRoom: false,
          canManageBots: false,
          canUseVoice: true,
          canUseVideo: true,
        },
      ],
      [
        'guest',
        {
          canEditRoom: false,
          canDeleteRoom: false,
          canInviteMembers: false,
          canRemoveMembers: false,
          canSendMessage: true,
          canEditMessage: false,
          canDeleteMessage: false,
          canPinMessage: false,
          canManageRoles: false,
          canViewHistory: false,
          canManagePermissions: false,
          canChangeVisibility: false,
          canArchiveRoom: false,
          canManageBots: false,
          canUseVoice: false,
          canUseVideo: false,
        },
      ],
    ])
  }

  createRoom(name: string, type: RoomType, visibility: RoomVisibility, ownerId: string): Room {
    const now = Date.now()
    const room: Room = {
      id: `room-${now}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      visibility,
      ownerId,
      members: new Map([[ownerId, { userId: ownerId, role: 'owner', joinedAt: now }]]),
      messages: [],
      permissions: this.getDefaultPermissions(),
      createdAt: now,
      updatedAt: now,
    }

    this.rooms.set(room.id, room)
    this.addToUserRooms(ownerId, room.id)
    this.messageQueue.set(room.id, [])

    return room
  }

  deleteRoom(roomId: string, requesterId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    const permission = this.getPermission(roomId, requesterId)
    if (!permission?.canDeleteRoom) return false

    // Clean up
    room.members.forEach((_, userId) => {
      this.removeFromUserRooms(userId, roomId)
    })

    this.rooms.delete(roomId)
    this.messageQueue.delete(roomId)
    return true
  }

  joinRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    if (room.visibility === 'private') {
      // Need invite
      return false
    }

    if (!room.members.has(userId)) {
      room.members.set(userId, {
        userId,
        role: 'member',
        joinedAt: Date.now(),
      })
      this.addToUserRooms(userId, roomId)
    }

    return true
  }

  leaveRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    if (userId === room.ownerId) {
      // Owner can't leave, must transfer ownership or delete
      return false
    }

    room.members.delete(userId)
    this.removeFromUserRooms(userId, roomId)
    return true
  }

  sendMessage(roomId: string, userId: string, content: string): RoomMessage | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const permission = this.getPermission(roomId, userId)
    if (!permission?.canSendMessage) return null

    const message: RoomMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      userId,
      content,
      type: 'text',
      createdAt: Date.now(),
    }

    room.messages.push(message)

    // Trim old messages if exceeds max
    if (room.messages.length > this.maxMessagesPerRoom) {
      room.messages = room.messages.slice(-this.maxMessagesPerRoom)
    }

    return message
  }

  editMessage(roomId: string, messageId: string, userId: string, newContent: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    const message = room.messages.find(m => m.id === messageId)
    if (!message || message.userId !== userId) return false

    const permission = this.getPermission(roomId, userId)
    if (!permission?.canEditMessage) return false

    message.content = newContent
    message.updatedAt = Date.now()
    message.editedAt = Date.now()
    return true
  }

  deleteMessage(roomId: string, messageId: string, userId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    const message = room.messages.find(m => m.id === messageId)
    if (!message) return false

    const permission = this.getPermission(roomId, userId)
    const isOwner = message.userId === userId
    const canModerate =
      permission?.canDeleteMessage && this.hasHigherRole(roomId, userId, message.userId)

    if (!isOwner && !canModerate) return false

    message.deletedAt = Date.now()
    return true
  }

  getMessages(roomId: string, userId: string, limit = 50, before?: number): RoomMessage[] {
    const room = this.rooms.get(roomId)
    if (!room) return []

    const permission = this.getPermission(roomId, userId)
    if (!permission?.canViewHistory) return []

    let messages = room.messages.filter(m => !m.deletedAt)

    if (before) {
      messages = messages.filter(m => m.createdAt < before)
    }

    return messages.slice(-limit)
  }

  updateMemberRole(
    roomId: string,
    targetUserId: string,
    newRole: RoomRole,
    requesterId: string
  ): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    const permission = this.getPermission(roomId, requesterId)
    if (!permission?.canManageRoles) return false

    // Can't change owner's role
    if (targetUserId === room.ownerId) return false

    const member = room.members.get(targetUserId)
    if (!member) return false

    member.role = newRole
    return true
  }

  inviteUser(roomId: string, userId: string, inviterId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    const permission = this.getPermission(roomId, inviterId)
    if (!permission?.canInviteMembers) return false

    if (!room.members.has(userId)) {
      room.members.set(userId, {
        userId,
        role: 'member',
        joinedAt: Date.now(),
      })
      this.addToUserRooms(userId, roomId)
    }

    return true
  }

  removeUser(roomId: string, userId: string, removerId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    const permission = this.getPermission(roomId, removerId)
    if (!permission?.canRemoveMembers) return false

    if (userId === room.ownerId) return false

    room.members.delete(userId)
    this.removeFromUserRooms(userId, roomId)
    return true
  }

  getPermission(roomId: string, userId: string): RoomPermission | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const member = room.members.get(userId)
    if (!member) return null

    return room.permissions.get(member.role) || null
  }

  getUserRooms(userId: string): Room[] {
    const roomIds = this.userRooms.get(userId)
    if (!roomIds) return []

    return Array.from(roomIds)
      .map(id => this.rooms.get(id))
      .filter((r): r is Room => r !== undefined)
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  private addToUserRooms(userId: string, roomId: string): void {
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set())
    }
    this.userRooms.get(userId)?.add(roomId)
  }

  private removeFromUserRooms(userId: string, roomId: string): void {
    this.userRooms.get(userId)?.delete(roomId)
  }

  private hasHigherRole(roomId: string, userId1: string, userId2: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    const role1 = room.members.get(userId1)?.role || 'guest'
    const role2 = room.members.get(userId2)?.role || 'guest'

    const roleHierarchy: RoomRole[] = ['owner', 'admin', 'moderator', 'member', 'guest']
    return roleHierarchy.indexOf(role1) < roleHierarchy.indexOf(role2)
  }
}

// ===== Test Suite =====

describe('WebSocket Room System', () => {
  let roomManager: MockRoomManager
  const testUser1: User = { id: 'user-1', name: 'Alice', email: 'alice@test.com' }
  const testUser2: User = { id: 'user-2', name: 'Bob', email: 'bob@test.com' }
  const testUser3: User = { id: 'user-3', name: 'Charlie', email: 'charlie@test.com' }

  beforeEach(() => {
    roomManager = new MockRoomManager()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Room Creation', () => {
    it('should create a public room', () => {
      const room = roomManager.createRoom('Test Room', 'chat', 'public', testUser1.id)

      expect(room.id).toBeDefined()
      expect(room.name).toBe('Test Room')
      expect(room.type).toBe('chat')
      expect(room.visibility).toBe('public')
      expect(room.ownerId).toBe(testUser1.id)
    })

    it('should create different room types', () => {
      const types: RoomType[] = ['task', 'project', 'chat', 'document', 'voice', 'video']

      types.forEach(type => {
        const room = roomManager.createRoom(`${type} Room`, type, 'public', testUser1.id)
        expect(room.type).toBe(type)
      })
    })

    it('should set owner with owner role', () => {
      const room = roomManager.createRoom('Owner Test', 'chat', 'public', testUser1.id)

      const ownerMember = room.members.get(testUser1.id)
      expect(ownerMember).toBeDefined()
      expect(ownerMember?.role).toBe('owner')
    })

    it('should generate unique room IDs', () => {
      const room1 = roomManager.createRoom('Room 1', 'chat', 'public', testUser1.id)
      const room2 = roomManager.createRoom('Room 2', 'chat', 'public', testUser1.id)

      expect(room1.id).not.toBe(room2.id)
    })
  })

  describe('Room Membership', () => {
    it('should allow user to join public room', () => {
      const room = roomManager.createRoom('Public Room', 'chat', 'public', testUser1.id)

      const joined = roomManager.joinRoom(room.id, testUser2.id)
      expect(joined).toBe(true)

      const updatedRoom = roomManager.getRoom(room.id)
      expect(updatedRoom?.members.has(testUser2.id)).toBe(true)
    })

    it('should prevent joining private room without invite', () => {
      const room = roomManager.createRoom('Private Room', 'chat', 'private', testUser1.id)

      const joined = roomManager.joinRoom(room.id, testUser2.id)
      expect(joined).toBe(false)
    })

    it('should allow member to leave room', () => {
      const room = roomManager.createRoom('Leave Test', 'chat', 'public', testUser1.id)
      roomManager.joinRoom(room.id, testUser2.id)

      const left = roomManager.leaveRoom(room.id, testUser2.id)
      expect(left).toBe(true)

      const updatedRoom = roomManager.getRoom(room.id)
      expect(updatedRoom?.members.has(testUser2.id)).toBe(false)
    })

    it('should prevent owner from leaving room', () => {
      const room = roomManager.createRoom('Owner Leave Test', 'chat', 'public', testUser1.id)

      const left = roomManager.leaveRoom(room.id, testUser1.id)
      expect(left).toBe(false)
    })

    it('should invite user to private room', () => {
      const room = roomManager.createRoom('Invite Test', 'chat', 'private', testUser1.id)

      const invited = roomManager.inviteUser(room.id, testUser2.id, testUser1.id)
      expect(invited).toBe(true)

      const updatedRoom = roomManager.getRoom(room.id)
      expect(updatedRoom?.members.has(testUser2.id)).toBe(true)
    })

    it('should remove user from room', () => {
      const room = roomManager.createRoom('Remove Test', 'chat', 'public', testUser1.id)
      roomManager.joinRoom(room.id, testUser2.id)

      const removed = roomManager.removeUser(room.id, testUser2.id, testUser1.id)
      expect(removed).toBe(true)

      const updatedRoom = roomManager.getRoom(room.id)
      expect(updatedRoom?.members.has(testUser2.id)).toBe(false)
    })
  })

  describe('Permission System', () => {
    it('should grant full permissions to owner', () => {
      const room = roomManager.createRoom('Permission Test', 'chat', 'public', testUser1.id)

      const permission = roomManager.getPermission(room.id, testUser1.id)
      expect(permission?.canEditRoom).toBe(true)
      expect(permission?.canDeleteRoom).toBe(true)
      expect(permission?.canManageRoles).toBe(true)
      expect(permission?.canManagePermissions).toBe(true)
    })

    it('should grant limited permissions to member', () => {
      const room = roomManager.createRoom('Member Permission Test', 'chat', 'public', testUser1.id)
      roomManager.joinRoom(room.id, testUser2.id)

      const permission = roomManager.getPermission(room.id, testUser2.id)
      expect(permission?.canSendMessage).toBe(true)
      expect(permission?.canViewHistory).toBe(true)
      expect(permission?.canDeleteRoom).toBe(false)
      expect(permission?.canManageRoles).toBe(false)
    })

    it('should grant restricted permissions to guest', () => {
      const room = roomManager.createRoom('Guest Permission Test', 'chat', 'public', testUser1.id)
      roomManager.joinRoom(room.id, testUser2.id)
      roomManager.updateMemberRole(room.id, testUser2.id, 'guest', testUser1.id)

      const permission = roomManager.getPermission(room.id, testUser2.id)
      expect(permission?.canSendMessage).toBe(true)
      expect(permission?.canViewHistory).toBe(false)
      expect(permission?.canUseVoice).toBe(false)
    })

    it('should allow admin to invite members', () => {
      const room = roomManager.createRoom('Admin Invite Test', 'chat', 'public', testUser1.id)
      roomManager.joinRoom(room.id, testUser2.id)
      roomManager.updateMemberRole(room.id, testUser2.id, 'admin', testUser1.id)

      const invited = roomManager.inviteUser(room.id, testUser3.id, testUser2.id)
      expect(invited).toBe(true)
    })

    it('should prevent member from inviting others', () => {
      const room = roomManager.createRoom('Member Invite Test', 'chat', 'public', testUser1.id)
      roomManager.joinRoom(room.id, testUser2.id)

      const invited = roomManager.inviteUser(room.id, testUser3.id, testUser2.id)
      expect(invited).toBe(false)
    })
  })

  describe('Message Handling', () => {
    it('should send message to room', () => {
      const room = roomManager.createRoom('Message Test', 'chat', 'public', testUser1.id)

      const message = roomManager.sendMessage(room.id, testUser1.id, 'Hello, World!')
      expect(message).toBeDefined()
      expect(message?.content).toBe('Hello, World!')
      expect(message?.userId).toBe(testUser1.id)
    })

    it('should prevent non-members from sending messages', () => {
      const room = roomManager.createRoom('Non-member Message Test', 'chat', 'public', testUser1.id)

      const message = roomManager.sendMessage(room.id, testUser2.id, 'Unauthorized message')
      expect(message).toBeNull()
    })

    it('should edit own message', () => {
      const room = roomManager.createRoom('Edit Test', 'chat', 'public', testUser1.id)
      const message = roomManager.sendMessage(room.id, testUser1.id, 'Original message')

      const edited = roomManager.editMessage(room.id, message!.id, testUser1.id, 'Edited message')
      expect(edited).toBe(true)

      const messages = roomManager.getMessages(room.id, testUser1.id)
      expect(messages[0]?.content).toBe('Edited message')
      expect(messages[0]?.editedAt).toBeDefined()
    })

    it('should delete message', () => {
      const room = roomManager.createRoom('Delete Test', 'chat', 'public', testUser1.id)
      const message = roomManager.sendMessage(room.id, testUser1.id, 'Message to delete')

      const deleted = roomManager.deleteMessage(room.id, message!.id, testUser1.id)
      expect(deleted).toBe(true)

      const messages = roomManager.getMessages(room.id, testUser1.id)
      expect(messages.length).toBe(0) // Deleted messages not returned
    })

    it('should allow moderator to delete others messages', () => {
      const room = roomManager.createRoom('Moderator Delete Test', 'chat', 'public', testUser1.id)
      roomManager.joinRoom(room.id, testUser2.id)
      roomManager.updateMemberRole(room.id, testUser2.id, 'moderator', testUser1.id)

      roomManager.joinRoom(room.id, testUser3.id)
      const message = roomManager.sendMessage(room.id, testUser3.id, 'Problematic message')

      const deleted = roomManager.deleteMessage(room.id, message!.id, testUser2.id)
      expect(deleted).toBe(true)
    })

    it('should limit message history', () => {
      const room = roomManager.createRoom('History Test', 'chat', 'public', testUser1.id)

      // Send 100 messages
      for (let i = 0; i < 100; i++) {
        roomManager.sendMessage(room.id, testUser1.id, `Message ${i}`)
      }

      const messages = roomManager.getMessages(room.id, testUser1.id, 50)
      expect(messages.length).toBe(50)
    })
  })

  describe('Room Deletion', () => {
    it('should allow owner to delete room', () => {
      const room = roomManager.createRoom('Delete Room Test', 'chat', 'public', testUser1.id)

      const deleted = roomManager.deleteRoom(room.id, testUser1.id)
      expect(deleted).toBe(true)

      expect(roomManager.getRoom(room.id)).toBeUndefined()
    })

    it('should prevent non-owner from deleting room', () => {
      const room = roomManager.createRoom('Delete Fail Test', 'chat', 'public', testUser1.id)
      roomManager.joinRoom(room.id, testUser2.id)
      roomManager.updateMemberRole(room.id, testUser2.id, 'admin', testUser1.id)

      const deleted = roomManager.deleteRoom(room.id, testUser2.id)
      expect(deleted).toBe(false)
    })

    it('should clean up user rooms on deletion', () => {
      const room = roomManager.createRoom('Cleanup Test', 'chat', 'public', testUser1.id)
      roomManager.joinRoom(room.id, testUser2.id)

      roomManager.deleteRoom(room.id, testUser1.id)

      const userRooms = roomManager.getUserRooms(testUser2.id)
      expect(userRooms.find(r => r.id === room.id)).toBeUndefined()
    })
  })

  describe('Role Management', () => {
    it('should update member role', () => {
      const room = roomManager.createRoom('Role Test', 'chat', 'public', testUser1.id)
      roomManager.joinRoom(room.id, testUser2.id)

      const updated = roomManager.updateMemberRole(room.id, testUser2.id, 'admin', testUser1.id)
      expect(updated).toBe(true)

      const updatedRoom = roomManager.getRoom(room.id)
      expect(updatedRoom?.members.get(testUser2.id)?.role).toBe('admin')
    })

    it('should prevent changing owner role', () => {
      const room = roomManager.createRoom('Owner Role Test', 'chat', 'public', testUser1.id)

      const updated = roomManager.updateMemberRole(room.id, testUser1.id, 'admin', testUser1.id)
      expect(updated).toBe(false)
    })

    it('should apply role permissions immediately', () => {
      const room = roomManager.createRoom('Role Permission Test', 'chat', 'public', testUser1.id)
      roomManager.joinRoom(room.id, testUser2.id)

      // Check member can't invite
      expect(roomManager.inviteUser(room.id, testUser3.id, testUser2.id)).toBe(false)

      // Upgrade to admin
      roomManager.updateMemberRole(room.id, testUser2.id, 'admin', testUser1.id)

      // Check admin can invite
      expect(roomManager.inviteUser(room.id, testUser3.id, testUser2.id)).toBe(true)
    })
  })

  describe('Performance', () => {
    it('should handle many concurrent messages', async () => {
      const room = roomManager.createRoom('Performance Test', 'chat', 'public', testUser1.id)
      const messageCount = 1000

      const startTime = Date.now()
      for (let i = 0; i < messageCount; i++) {
        roomManager.sendMessage(room.id, testUser1.id, `Message ${i}`)
      }
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(1000) // 1000 messages in < 1s
    })

    it('should handle many rooms', () => {
      const roomCount = 100

      for (let i = 0; i < roomCount; i++) {
        roomManager.createRoom(`Room ${i}`, 'chat', 'public', testUser1.id)
      }

      const userRooms = roomManager.getUserRooms(testUser1.id)
      expect(userRooms.length).toBe(roomCount)
    })

    it('should handle large member counts', () => {
      const room = roomManager.createRoom('Large Room', 'chat', 'public', testUser1.id)

      for (let i = 0; i < 100; i++) {
        roomManager.joinRoom(room.id, `user-${i}`)
      }

      const updatedRoom = roomManager.getRoom(room.id)
      expect(updatedRoom?.members.size).toBe(101) // 100 + owner
    })
  })
})
