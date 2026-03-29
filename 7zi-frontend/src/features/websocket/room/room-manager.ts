/**
 * Room Manager - WebSocket 房间管理核心
 * 提供房间创建、成员管理、权限检查等功能
 */

import { Room, RoomMember, RoomConfig, MemberRole, PermissionAction, RoomPermission } from './room-model';
import { logger } from '@/lib/logger';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private userRooms: Map<string, Set<string>> = new Map();

  /**
   * 生成房间 ID
   */
  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 哈希密码 (简单实现，生产环境应使用 bcrypt)
   */
  private async hashPassword(password: string): Promise<string> {
    // 这里使用简单的 Base64 编码，生产环境应使用 bcrypt
    return Buffer.from(password).toString('base64');
  }

  /**
   * 验证密码
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const computed = Buffer.from(password).toString('base64');
    return computed === hash;
  }

  /**
   * 获取角色的默认权限
   */
  private getDefaultPermissions(role: MemberRole): RoomPermission[] {
    const permissions: Record<MemberRole, RoomPermission[]> = {
      owner: [
        { action: 'read', allowed: true },
        { action: 'write', allowed: true },
        { action: 'manage', allowed: true },
        { action: 'moderate', allowed: true },
        { action: 'invite', allowed: true },
        { action: 'kick', allowed: true },
      ],
      admin: [
        { action: 'read', allowed: true },
        { action: 'write', allowed: true },
        { action: 'manage', allowed: false },
        { action: 'moderate', allowed: true },
        { action: 'invite', allowed: true },
        { action: 'kick', allowed: true },
      ],
      member: [
        { action: 'read', allowed: true },
        { action: 'write', allowed: true },
        { action: 'manage', allowed: false },
        { action: 'moderate', allowed: false },
        { action: 'invite', allowed: false },
        { action: 'kick', allowed: false },
      ],
      guest: [
        { action: 'read', allowed: true },
        { action: 'write', allowed: false },
        { action: 'manage', allowed: false },
        { action: 'moderate', allowed: false },
        { action: 'invite', allowed: false },
        { action: 'kick', allowed: false },
      ],
    };

    return permissions[role] || [];
  }

  /**
   * 创建房间
   */
  async createRoom(config: RoomConfig, userName: string): Promise<Room> {
    const roomId = this.generateRoomId();

    const member: RoomMember = {
      userId: config.ownerId,
      userName,
      role: 'owner',
      permissions: this.getDefaultPermissions('owner'),
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    const room: Room = {
      id: roomId,
      name: config.name,
      type: config.type,
      passwordHash: config.password ? await this.hashPassword(config.password) : undefined,
      ownerId: config.ownerId,
      members: [member],
      metadata: config.metadata || {},
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      maxMembers: config.maxMembers,
    };

    this.rooms.set(roomId, room);

    // 记录用户房间关联
    this.addUserRoom(config.ownerId, roomId);

    logger.info(`[RoomManager] Room created: ${roomId} by ${userName}`);
    return room;
  }

  /**
   * 加入房间
   */
  async joinRoom(
    roomId: string,
    userId: string,
    userName: string,
    password?: string,
    role: MemberRole = 'member'
  ): Promise<{ success: boolean; message?: string }> {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, message: 'Room not found' };
    }

    // 检查是否已加入
    if (room.members.find(m => m.userId === userId)) {
      return { success: true, message: 'Already in room' };
    }

    // 检查房间类型
    if (room.type === 'private') {
      return { success: false, message: 'Room is private' };
    }

    // 检查密码
    if (room.type === 'password-protected' && room.passwordHash) {
      if (!password || !await this.verifyPassword(password, room.passwordHash)) {
        return { success: false, message: 'Invalid password' };
      }
    }

    // 检查人数限制
    if (room.maxMembers && room.members.length >= room.maxMembers) {
      return { success: false, message: 'Room is full' };
    }

    // 添加成员
    const member: RoomMember = {
      userId,
      userName,
      role,
      permissions: this.getDefaultPermissions(role),
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    room.members.push(member);
    room.lastActivityAt = Date.now();

    // 记录用户房间关联
    this.addUserRoom(userId, roomId);

    logger.info(`[RoomManager] ${userName} joined room: ${roomId}`);
    return { success: true };
  }

  /**
   * 离开房间
   */
  leaveRoom(roomId: string, userId: string): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, message: 'Room not found' };
    }

    // 房主不能离开房间（只能转让或删除）
    if (room.ownerId === userId) {
      return { success: false, message: 'Owner cannot leave room' };
    }

    // 移除成员
    const index = room.members.findIndex(m => m.userId === userId);
    if (index === -1) {
      return { success: false, message: 'Not in room' };
    }

    room.members.splice(index, 1);
    room.lastActivityAt = Date.now();

    // 移除用户房间关联
    this.removeUserRoom(userId, roomId);

    logger.info(`[RoomManager] User ${userId} left room: ${roomId}`);
    return { success: true };
  }

  /**
   * 踢出成员
   */
  kickMember(roomId: string, userId: string, targetUserId: string): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, message: 'Room not found' };
    }

    // 不能踢出房主（这是一个硬性规则，优先于权限检查）
    if (targetUserId === room.ownerId) {
      return { success: false, message: 'Cannot kick owner' };
    }

    // 检查权限
    if (!this.checkPermission(roomId, userId, 'kick')) {
      return { success: false, message: 'No permission to kick' };
    }

    // 移除目标成员
    const index = room.members.findIndex(m => m.userId === targetUserId);
    if (index === -1) {
      return { success: false, message: 'Member not found' };
    }

    room.members.splice(index, 1);
    room.lastActivityAt = Date.now();

    // 移除用户房间关联
    this.removeUserRoom(targetUserId, roomId);

    logger.info(`[RoomManager] User ${targetUserId} kicked from room: ${roomId}`);
    return { success: true };
  }

  /**
   * 更新成员角色
   */
  updateMemberRole(
    roomId: string,
    userId: string,
    targetUserId: string,
    newRole: MemberRole
  ): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, message: 'Room not found' };
    }

    // 检查权限
    if (!this.checkPermission(roomId, userId, 'manage')) {
      return { success: false, message: 'No permission to manage' };
    }

    // 不能修改房主角色
    if (targetUserId === room.ownerId) {
      return { success: false, message: 'Cannot change owner role' };
    }

    // 更新角色
    const member = room.members.find(m => m.userId === targetUserId);
    if (!member) {
      return { success: false, message: 'Member not found' };
    }

    member.role = newRole;
    member.permissions = this.getDefaultPermissions(newRole);
    room.lastActivityAt = Date.now();

    logger.info(`[RoomManager] User ${targetUserId} role updated to ${newRole} in room: ${roomId}`);
    return { success: true };
  }

  /**
   * 检查权限
   */
  checkPermission(roomId: string, userId: string, action: PermissionAction): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    const member = room.members.find(m => m.userId === userId);
    if (!member) {
      return false;
    }

    const permission = member.permissions.find(p => p.action === action);
    return permission?.allowed ?? false;
  }

  /**
   * 获取房间
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * 获取所有房间
   */
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * 获取用户的房间列表
   */
  getUserRooms(userId: string): Room[] {
    const roomIds = this.userRooms.get(userId) || new Set();
    const rooms: Room[] = [];

    for (const roomId of roomIds) {
      const room = this.rooms.get(roomId);
      if (room) {
        rooms.push(room);
      }
    }

    return rooms;
  }

  /**
   * 删除房间
   */
  deleteRoom(roomId: string, userId: string): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, message: 'Room not found' };
    }

    // 只有房主可以删除房间
    if (room.ownerId !== userId) {
      return { success: false, message: 'Only owner can delete room' };
    }

    // 移除所有成员的房间关联
    for (const member of room.members) {
      this.removeUserRoom(member.userId, roomId);
    }

    this.rooms.delete(roomId);
    logger.info(`[RoomManager] Room deleted: ${roomId}`);
    return { success: true };
  }

  /**
   * 更新房间活动时间
   */
  updateActivity(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.lastActivityAt = Date.now();
    }
  }

  /**
   * 添加用户房间关联
   */
  private addUserRoom(userId: string, roomId: string): void {
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }
    this.userRooms.get(userId)!.add(roomId);
  }

  /**
   * 移除用户房间关联
   */
  private removeUserRoom(userId: string, roomId: string): void {
    const rooms = this.userRooms.get(userId);
    if (rooms) {
      rooms.delete(roomId);
      if (rooms.size === 0) {
        this.userRooms.delete(userId);
      }
    }
  }

  /**
   * 获取房间统计信息
   */
  getStats() {
    return {
      totalRooms: this.rooms.size,
      totalMembers: Array.from(this.rooms.values()).reduce((sum, room) => sum + room.members.length, 0),
      publicRooms: Array.from(this.rooms.values()).filter(r => r.type === 'public').length,
      privateRooms: Array.from(this.rooms.values()).filter(r => r.type === 'private').length,
    };
  }
}
