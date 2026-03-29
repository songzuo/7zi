/**
 * WebSocket Advanced Service - WebSocket 高级服务
 * 整合房间管理、消息持久化、权限控制
 */

import { RoomManager } from '../room/room-manager';
import { PermissionManager } from '../room/permission-manager';
import { MessagePersistence } from '../message/persistence';
import { Room, RoomConfig, MemberRole, PermissionAction } from '../room/room-model';
import { Message, MessageContent, MessageSearchOptions } from '../message/message-model';
import { logger } from '@/lib/logger';

export class WebSocketAdvancedService {
  private roomManager: RoomManager;
  private permissionManager: PermissionManager;
  private messagePersistence: MessagePersistence;
  private userLastOnline: Map<string, number> = new Map();

  constructor() {
    this.roomManager = new RoomManager();
    this.permissionManager = new PermissionManager();
    this.messagePersistence = new MessagePersistence();
  }

  // ==================== 房间管理 ====================

  /**
   * 创建房间
   */
  async createRoom(config: RoomConfig, userName: string): Promise<{ room: Room }> {
    const room = await this.roomManager.createRoom(config, userName);

    return { room };
  }

  /**
   * 加入房间
   */
  async joinRoom(
    roomId: string,
    userId: string,
    userName: string,
    password?: string
  ): Promise<{ success: boolean; message?: string }> {
    return this.roomManager.joinRoom(roomId, userId, userName, password);
  }

  /**
   * 离开房间
   */
  leaveRoom(roomId: string, userId: string): { success: boolean; message?: string } {
    return this.roomManager.leaveRoom(roomId, userId);
  }

  /**
   * 删除房间
   */
  deleteRoom(roomId: string, userId: string): { success: boolean; message?: string } {
    return this.roomManager.deleteRoom(roomId, userId);
  }

  /**
   * 获取房间信息
   */
  getRoom(roomId: string): Room | undefined {
    return this.roomManager.getRoom(roomId);
  }

  /**
   * 获取用户的房间列表
   */
  getUserRooms(userId: string): Room[] {
    return this.roomManager.getUserRooms(userId);
  }

  /**
   * 获取所有公开房间
   */
  getPublicRooms(): Room[] {
    return this.roomManager.getAllRooms().filter(r => r.type === 'public');
  }

  // ==================== 消息管理 ====================

  /**
   * 发送消息
   */
  async sendMessage(
    roomId: string,
    senderId: string,
    senderName: string,
    content: MessageContent,
    type: 'text' | 'file' | 'notification' = 'text',
    replyTo?: string
  ): Promise<{ message: Message }> {
    // 检查房间是否存在
    const room = this.roomManager.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // 检查用户是否在房间中
    const member = room.members.find(m => m.userId === senderId);
    if (!member) {
      throw new Error('User not in room');
    }

    // 检查发送权限
    if (!this.permissionManager.checkPermission(
      { userId: senderId, roomId, role: member.role },
      'write'
    )) {
      throw new Error('No permission to send messages');
    }

    // 创建消息
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      senderId,
      senderName,
      type,
      content,
      replyTo,
      readBy: [senderId],
      createdAt: Date.now(),
    };

    // 如果有回复，获取回复消息内容
    if (replyTo) {
      const replyMessage = await this.messagePersistence.getMessage(replyTo);
      if (replyMessage) {
        message.replyToContent = replyMessage.content;
      }
    }

    // 保存消息
    await this.messagePersistence.saveMessage(message);

    // 更新房间活动
    this.roomManager.updateActivity(roomId);

    return { message };
  }

  /**
   * 获取消息列表
   */
  async getMessages(
    roomId: string,
    userId: string,
    options: { limit?: number; before?: number; after?: number } = {}
  ): Promise<Message[]> {
    // 检查权限
    const room = this.roomManager.getRoom(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const member = room.members.find(m => m.userId === userId);
    if (!member) {
      throw new Error('User not in room');
    }

    if (!this.permissionManager.checkPermission(
      { userId, roomId, role: member.role },
      'read'
    )) {
      throw new Error('No permission to read messages');
    }

    return this.messagePersistence.getMessages(roomId, options);
  }

  /**
   * 编辑消息
   */
  async editMessage(
    messageId: string,
    editorId: string,
    newContent: MessageContent
  ): Promise<{ success: boolean; message?: string }> {
    // 检查消息是否存在
    const message = await this.messagePersistence.getMessage(messageId);
    if (!message) {
      return { success: false, message: 'Message not found' };
    }

    // 检查房间权限
    const room = this.roomManager.getRoom(message.roomId);
    if (room) {
      const member = room.members.find(m => m.userId === editorId);
      if (member && !this.permissionManager.checkPermission(
        { userId: editorId, roomId: message.roomId, role: member.role },
        'write'
      )) {
        return { success: false, message: 'No permission to edit messages' };
      }
    }

    return this.messagePersistence.editMessage(messageId, newContent, editorId);
  }

  /**
   * 删除消息
   */
  async deleteMessage(
    messageId: string,
    deleterId: string
  ): Promise<{ success: boolean; message?: string }> {
    // 检查消息是否存在
    const message = await this.messagePersistence.getMessage(messageId);
    if (!message) {
      return { success: false, message: 'Message not found' };
    }

    // 检查权限（发送者或管理员可以删除）
    const room = this.roomManager.getRoom(message.roomId);
    let isModerator = false;

    if (room) {
      const member = room.members.find(m => m.userId === deleterId);
      if (member && this.permissionManager.checkPermission(
        { userId: deleterId, roomId: message.roomId, role: member.role },
        'moderate'
      )) {
        isModerator = true;
      }
    }

    return this.messagePersistence.deleteMessage(messageId, deleterId, isModerator);
  }

  /**
   * 搜索消息
   */
  async searchMessages(
    userId: string,
    options: MessageSearchOptions
  ): Promise<Message[]> {
    // 如果指定了房间，检查权限
    if (options.roomId) {
      const room = this.roomManager.getRoom(options.roomId);
      if (room) {
        const member = room.members.find(m => m.userId === userId);
        if (!member) {
          throw new Error('User not in room');
        }

        if (!this.permissionManager.checkPermission(
          { userId, roomId: options.roomId, role: member.role },
          'read'
        )) {
          throw new Error('No permission to search messages');
        }
      }
    }

    return this.messagePersistence.searchMessages(options);
  }

  /**
   * 标记已读
   */
  async markAsRead(roomId: string, userId: string): Promise<void> {
    await this.messagePersistence.markRoomAsRead(roomId, userId);
  }

  // ==================== 离线同步 ====================

  /**
   * 用户上线
   */
  userOnline(userId: string): void {
    this.userLastOnline.set(userId, Date.now());
  }

  /**
   * 用户离线
   */
  userOffline(userId: string): void {
    this.userLastOnline.set(userId, Date.now());
  }

  /**
   * 同步离线消息
   */
  async syncOfflineMessages(userId: string): Promise<Message[]> {
    const lastOnline = this.userLastOnline.get(userId) || 0;
    const rooms = this.roomManager.getUserRooms(userId);
    const roomIds = rooms.map(r => r.id);

    return this.messagePersistence.syncOfflineMessages(userId, lastOnline, roomIds);
  }

  /**
   * 获取未读消息数
   */
  async getUnreadCounts(userId: string): Promise<Record<string, number>> {
    const rooms = this.roomManager.getUserRooms(userId);
    const counts: Record<string, number> = {};
    const lastOnline = this.userLastOnline.get(userId) || 0;

    for (const room of rooms) {
      counts[room.id] = await this.messagePersistence.getUnreadCount(room.id, userId, lastOnline);
    }

    return counts;
  }

  // ==================== 权限管理 ====================

  /**
   * 检查权限
   */
  checkPermission(
    roomId: string,
    userId: string,
    action: PermissionAction
  ): boolean {
    const room = this.roomManager.getRoom(roomId);
    if (!room) {
      return false;
    }

    const member = room.members.find(m => m.userId === userId);
    if (!member) {
      return false;
    }

    return this.permissionManager.checkPermission(
      { userId, roomId, role: member.role },
      action
    );
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
    return this.roomManager.updateMemberRole(roomId, userId, targetUserId, newRole);
  }

  /**
   * 踢出成员
   */
  kickMember(
    roomId: string,
    userId: string,
    targetUserId: string
  ): { success: boolean; message?: string } {
    return this.roomManager.kickMember(roomId, userId, targetUserId);
  }

  // ==================== 统计信息 ====================

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      rooms: this.roomManager.getStats(),
      messages: this.messagePersistence.getStats(),
      users: {
        online: this.userLastOnline.size,
      },
    };
  }
}

// 单例实例
export const websocketAdvancedService = new WebSocketAdvancedService();
