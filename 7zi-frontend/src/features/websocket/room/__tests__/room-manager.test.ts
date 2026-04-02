/**
 * Room Manager Tests - 房间管理器测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { RoomManager } from '../room-manager'
import { RoomType, MemberRole } from '../room-model'

describe('RoomManager', () => {
  let roomManager: RoomManager

  beforeEach(() => {
    roomManager = new RoomManager()
  })

  describe('createRoom', () => {
    it('should create a public room', async () => {
      const config = {
        name: 'Test Room',
        type: 'public' as RoomType,
        ownerId: 'user1',
      }

      const room = await roomManager.createRoom(config, 'John Doe')

      expect(room.id).toBeDefined()
      expect(room.name).toBe('Test Room')
      expect(room.type).toBe('public')
      expect(room.ownerId).toBe('user1')
      expect(room.members).toHaveLength(1)
      expect(room.members[0].userId).toBe('user1')
      expect(room.members[0].role).toBe('owner')
    })

    it('should create a password-protected room', async () => {
      const config = {
        name: 'Secret Room',
        type: 'password-protected' as RoomType,
        password: 'secret123',
        ownerId: 'user1',
      }

      const room = await roomManager.createRoom(config, 'John Doe')

      expect(room.passwordHash).toBeDefined()
      expect(room.passwordHash).not.toBe('secret123')
    })

    it('should create a private room', async () => {
      const config = {
        name: 'Private Room',
        type: 'private' as RoomType,
        ownerId: 'user1',
      }

      const room = await roomManager.createRoom(config, 'John Doe')

      expect(room.type).toBe('private')
    })
  })

  describe('joinRoom', () => {
    it('should allow joining a public room', async () => {
      const config = {
        name: 'Test Room',
        type: 'public' as RoomType,
        ownerId: 'user1',
      }
      await roomManager.createRoom(config, 'Owner')

      const result = await roomManager.joinRoom(
        roomManager.getRoom(roomManager.getAllRooms()[0].id)!.id,
        'user2',
        'Jane Doe'
      )

      expect(result.success).toBe(true)
      const room = roomManager.getAllRooms()[0]
      expect(room.members).toHaveLength(2)
    })

    it('should require password for password-protected room', async () => {
      const config = {
        name: 'Secret Room',
        type: 'password-protected' as RoomType,
        password: 'secret123',
        ownerId: 'user1',
      }
      await roomManager.createRoom(config, 'Owner')

      const roomId = roomManager.getAllRooms()[0].id

      // Wrong password
      const wrongResult = await roomManager.joinRoom(roomId, 'user2', 'Jane', 'wrong')
      expect(wrongResult.success).toBe(false)
      expect(wrongResult.message).toBe('Invalid password')

      // Correct password
      const correctResult = await roomManager.joinRoom(roomId, 'user2', 'Jane', 'secret123')
      expect(correctResult.success).toBe(true)
    })

    it('should not allow joining private room', async () => {
      const config = {
        name: 'Private Room',
        type: 'private' as RoomType,
        ownerId: 'user1',
      }
      await roomManager.createRoom(config, 'Owner')

      const roomId = roomManager.getAllRooms()[0].id

      const result = await roomManager.joinRoom(roomId, 'user2', 'Jane')
      expect(result.success).toBe(false)
      expect(result.message).toBe('Room is private')
    })

    it('should not allow duplicate joins', async () => {
      const config = {
        name: 'Test Room',
        type: 'public' as RoomType,
        ownerId: 'user1',
      }
      await roomManager.createRoom(config, 'Owner')

      const roomId = roomManager.getAllRooms()[0].id

      await roomManager.joinRoom(roomId, 'user2', 'Jane')
      await roomManager.joinRoom(roomId, 'user2', 'Jane')

      const room = roomManager.getRoom(roomId)
      expect(room?.members).toHaveLength(2)
    })
  })

  describe('leaveRoom', () => {
    it('should allow non-owner to leave room', async () => {
      const config = {
        name: 'Test Room',
        type: 'public' as RoomType,
        ownerId: 'user1',
      }
      await roomManager.createRoom(config, 'Owner')

      const roomId = roomManager.getAllRooms()[0].id
      await roomManager.joinRoom(roomId, 'user2', 'Jane')

      const result = roomManager.leaveRoom(roomId, 'user2')
      expect(result.success).toBe(true)

      const room = roomManager.getRoom(roomId)
      expect(room?.members).toHaveLength(1)
    })

    it('should not allow owner to leave room', async () => {
      const config = {
        name: 'Test Room',
        type: 'public' as RoomType,
        ownerId: 'user1',
      }
      await roomManager.createRoom(config, 'Owner')

      const roomId = roomManager.getAllRooms()[0].id

      const result = roomManager.leaveRoom(roomId, 'user1')
      expect(result.success).toBe(false)
      expect(result.message).toBe('Owner cannot leave room')
    })
  })

  describe('kickMember', () => {
    it('should allow admin to kick member', async () => {
      const config = {
        name: 'Test Room',
        type: 'public' as RoomType,
        ownerId: 'user1',
      }
      await roomManager.createRoom(config, 'Owner')

      const roomId = roomManager.getAllRooms()[0].id
      await roomManager.joinRoom(roomId, 'user2', 'Jane')
      await roomManager.joinRoom(roomId, 'user3', 'Bob')

      // Promote user2 to admin
      roomManager.updateMemberRole(roomId, 'user1', 'user2', 'admin')

      // Kick user3
      const result = roomManager.kickMember(roomId, 'user2', 'user3')
      expect(result.success).toBe(true)

      const room = roomManager.getRoom(roomId)
      expect(room?.members).toHaveLength(2)
    })

    it('should not allow non-admin to kick member', async () => {
      const config = {
        name: 'Test Room',
        type: 'public' as RoomType,
        ownerId: 'user1',
      }
      await roomManager.createRoom(config, 'Owner')

      const roomId = roomManager.getAllRooms()[0].id
      await roomManager.joinRoom(roomId, 'user2', 'Jane')
      await roomManager.joinRoom(roomId, 'user3', 'Bob')

      const result = roomManager.kickMember(roomId, 'user2', 'user3')
      expect(result.success).toBe(false)
      expect(result.message).toBe('No permission to kick')
    })

    it('should not allow kicking owner', async () => {
      const config = {
        name: 'Test Room',
        type: 'public' as RoomType,
        ownerId: 'user1',
      }
      await roomManager.createRoom(config, 'Owner')

      const roomId = roomManager.getAllRooms()[0].id
      await roomManager.joinRoom(roomId, 'user2', 'Jane')

      // Try to kick owner
      const result = roomManager.kickMember(roomId, 'user2', 'user1')
      expect(result.success).toBe(false)
      expect(result.message).toBe('Cannot kick owner')
    })
  })

  describe('checkPermission', () => {
    it('should grant correct permissions to owner', async () => {
      const config = {
        name: 'Test Room',
        type: 'public' as RoomType,
        ownerId: 'user1',
      }
      await roomManager.createRoom(config, 'Owner')

      const roomId = roomManager.getAllRooms()[0].id

      expect(roomManager.checkPermission(roomId, 'user1', 'read')).toBe(true)
      expect(roomManager.checkPermission(roomId, 'user1', 'write')).toBe(true)
      expect(roomManager.checkPermission(roomId, 'user1', 'manage')).toBe(true)
      expect(roomManager.checkPermission(roomId, 'user1', 'moderate')).toBe(true)
      expect(roomManager.checkPermission(roomId, 'user1', 'invite')).toBe(true)
      expect(roomManager.checkPermission(roomId, 'user1', 'kick')).toBe(true)
    })

    it('should grant correct permissions to member', async () => {
      const config = {
        name: 'Test Room',
        type: 'public' as RoomType,
        ownerId: 'user1',
      }
      await roomManager.createRoom(config, 'Owner')

      const roomId = roomManager.getAllRooms()[0].id
      await roomManager.joinRoom(roomId, 'user2', 'Jane')

      expect(roomManager.checkPermission(roomId, 'user2', 'read')).toBe(true)
      expect(roomManager.checkPermission(roomId, 'user2', 'write')).toBe(true)
      expect(roomManager.checkPermission(roomId, 'user2', 'manage')).toBe(false)
      expect(roomManager.checkPermission(roomId, 'user2', 'moderate')).toBe(false)
      expect(roomManager.checkPermission(roomId, 'user2', 'invite')).toBe(false)
      expect(roomManager.checkPermission(roomId, 'user2', 'kick')).toBe(false)
    })

    it('should grant correct permissions to guest', async () => {
      const config = {
        name: 'Test Room',
        type: 'public' as RoomType,
        ownerId: 'user1',
      }
      await roomManager.createRoom(config, 'Owner')

      const roomId = roomManager.getAllRooms()[0].id
      await roomManager.joinRoom(roomId, 'user2', 'Jane', undefined, 'guest')

      expect(roomManager.checkPermission(roomId, 'user2', 'read')).toBe(true)
      expect(roomManager.checkPermission(roomId, 'user2', 'write')).toBe(false)
    })
  })

  describe('getUserRooms', () => {
    it('should return rooms user is member of', async () => {
      await roomManager.createRoom(
        {
          name: 'Room 1',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'User 1'
      )

      await roomManager.createRoom(
        {
          name: 'Room 2',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'User 1'
      )

      await roomManager.createRoom(
        {
          name: 'Room 3',
          type: 'public' as RoomType,
          ownerId: 'user2',
        },
        'User 2'
      )

      const roomId1 = roomManager.getAllRooms()[0].id
      const roomId2 = roomManager.getAllRooms()[1].id
      const roomId3 = roomManager.getAllRooms()[2].id

      await roomManager.joinRoom(roomId2, 'user2', 'User 2')

      const user1Rooms = roomManager.getUserRooms('user1')
      expect(user1Rooms).toHaveLength(2)
      expect(user1Rooms.map(r => r.id)).toContain(roomId1)
      expect(user1Rooms.map(r => r.id)).toContain(roomId2)

      const user2Rooms = roomManager.getUserRooms('user2')
      expect(user2Rooms).toHaveLength(2)
      expect(user2Rooms.map(r => r.id)).toContain(roomId2)
      expect(user2Rooms.map(r => r.id)).toContain(roomId3)
    })
  })

  describe('deleteRoom', () => {
    it('should allow owner to delete room', async () => {
      await roomManager.createRoom(
        {
          name: 'Test Room',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      )

      const roomId = roomManager.getAllRooms()[0].id

      const result = roomManager.deleteRoom(roomId, 'user1')
      expect(result.success).toBe(true)

      expect(roomManager.getRoom(roomId)).toBeUndefined()
    })

    it('should not allow non-owner to delete room', async () => {
      await roomManager.createRoom(
        {
          name: 'Test Room',
          type: 'public' as RoomType,
          ownerId: 'user1',
        },
        'Owner'
      )

      const roomId = roomManager.getAllRooms()[0].id
      await roomManager.joinRoom(roomId, 'user2', 'Jane')

      const result = roomManager.deleteRoom(roomId, 'user2')
      expect(result.success).toBe(false)
      expect(result.message).toBe('Only owner can delete room')
    })
  })
})
