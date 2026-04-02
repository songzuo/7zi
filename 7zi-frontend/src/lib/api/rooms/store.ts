/**
 * Room Data Store (In-Memory)
 *
 * 内存存储房间数据。在生产环境中应该使用数据库。
 */

import type { Room, RoomMember, RoomMessage } from '@/types/rooms'

export interface RoomData {
  room: Room
  messages: RoomMessage[]
}

/**
 * 房间数据存储类（单例）
 */
class RoomDataStore {
  private rooms: Map<string, RoomData> = new Map()

  /**
   * 生成随机 ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 生成邀请码（8位随机字符串）
   */
  generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  /**
   * 创建房间
   */
  createRoom(data: {
    ownerId: string
    ownerName: string
    name: string
    description?: string
    password?: string
    isPrivate?: boolean
  }): Room {
    const id = this.generateId('room')
    const inviteCode = this.generateInviteCode()
    const now = Date.now()

    // 创建房主成员
    const owner: RoomMember = {
      id: data.ownerId,
      name: data.ownerName,
      role: 'owner',
      isOnline: true,
      joinedAt: now,
      lastActiveAt: now,
    }

    const room: Room = {
      id,
      name: data.name,
      description: data.description,
      ownerId: data.ownerId,
      ownerName: data.ownerName,
      password: data.password,
      inviteCode,
      members: [owner],
      onlineCount: 1,
      memberCount: 1,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    }

    this.rooms.set(id, { room, messages: [] })

    return room
  }

  /**
   * 获取所有房间
   */
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values()).map(data => data.room)
  }

  /**
   * 根据 ID 获取房间
   */
  getRoomById(id: string): Room | undefined {
    const data = this.rooms.get(id)
    return data?.room
  }

  /**
   * 根据邀请码获取房间
   */
  getRoomByInviteCode(code: string): Room | undefined {
    return Array.from(this.rooms.values())
      .map(data => data.room)
      .find(room => room.inviteCode === code)
  }

  /**
   * 更新房间
   */
  updateRoom(id: string, updates: Partial<Room>): Room | null {
    const data = this.rooms.get(id)
    if (!data) return null

    data.room = {
      ...data.room,
      ...updates,
      updatedAt: Date.now(),
      lastActivityAt: Date.now(),
    }

    this.rooms.set(id, data)
    return data.room
  }

  /**
   * 删除房间
   */
  deleteRoom(id: string): boolean {
    return this.rooms.delete(id)
  }

  /**
   * 加入房间
   */
  joinRoom(
    roomId: string,
    user: { id: string; name: string; avatar?: string },
    password?: string
  ): Room | null {
    const data = this.rooms.get(roomId)
    if (!data) return null

    // 验证密码
    if (data.room.password && data.room.password !== password) {
      throw new Error('Incorrect password')
    }

    // 检查是否已经在房间中
    const existingMember = data.room.members.find(m => m.id === user.id)
    if (existingMember) {
      // 更新在线状态
      existingMember.isOnline = true
      existingMember.lastActiveAt = Date.now()
    } else {
      // 添加新成员
      const newMember: RoomMember = {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: 'member',
        isOnline: true,
        joinedAt: Date.now(),
        lastActiveAt: Date.now(),
      }
      data.room.members.push(newMember)
      data.room.memberCount++
    }

    // 更新在线人数
    data.room.onlineCount = data.room.members.filter(m => m.isOnline).length
    data.room.lastActivityAt = Date.now()

    this.rooms.set(roomId, data)
    return data.room
  }

  /**
   * 离开房间
   */
  leaveRoom(roomId: string, userId: string): Room | null {
    const data = this.rooms.get(roomId)
    if (!data) return null

    // 设置为离线
    const member = data.room.members.find(m => m.id === userId)
    if (member) {
      member.isOnline = false
      member.lastActiveAt = Date.now()

      data.room.onlineCount = data.room.members.filter(m => m.isOnline).length
      data.room.lastActivityAt = Date.now()

      this.rooms.set(roomId, data)
      return data.room
    }

    return null
  }

  /**
   * 获取房间的所有成员
   */
  getRoomMembers(roomId: string): RoomMember[] | null {
    const data = this.rooms.get(roomId)
    return data?.room.members ?? null
  }

  /**
   * 添加消息到房间
   */
  addMessage(roomId: string, message: Omit<RoomMessage, 'id' | 'timestamp'>): RoomMessage | null {
    const data = this.rooms.get(roomId)
    if (!data) return null

    const newMessage: RoomMessage = {
      ...message,
      id: this.generateId('msg'),
      timestamp: Date.now(),
    }

    data.messages.push(newMessage)

    // 更新房间活跃时间
    data.room.lastActivityAt = Date.now()
    this.rooms.set(roomId, data)

    return newMessage
  }

  /**
   * 获取房间消息
   */
  getRoomMessages(roomId: string, limit?: number): RoomMessage[] {
    const data = this.rooms.get(roomId)
    if (!data) return []

    const messages = data.messages.sort((a, b) => b.timestamp - a.timestamp)

    return limit ? messages.slice(0, limit) : messages
  }

  /**
   * 获取房间数据（包含消息）
   */
  getRoomData(roomId: string): RoomData | undefined {
    return this.rooms.get(roomId)
  }
}

// 导出单例
export const roomStore = new RoomDataStore()
