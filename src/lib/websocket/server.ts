/**
 * WebSocket Server Implementation
 *
 * Socket.IO server for real-time collaboration features
 * Supports rooms, authentication, permissions, and message broadcasting
 *
 * v1.4.0: Integrated RoomManager, PermissionManager, and MessageStore
 */

'use server';

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { NextRequest } from 'next/server';
import { verifyJwtToken } from '@/lib/auth/service';
import { getUserById } from '@/lib/auth/repository';
import { logger } from '@/lib/logger';
import { setupVoiceMeetingHandlers } from '@/lib/voice-meeting/signaling';
import type { AuthenticatedSocket } from './types';

// ============================================================================
// Core Module Imports (v1.4.0)
// ============================================================================

import {
  RoomManager,
  getRoomManager,
  type RoomType,
  type RoomVisibility,
  type RoomConfig,
  type CreateRoomOptions,
  type JoinRoomOptions,
  type RoomEventCallbacks,
} from './rooms';

import {
  PermissionManager,
  getPermissionManager,
  type UserRole,
  type Permission,
} from './permissions';

import {
  MessageStore,
  getMessageStore,
  type MessageHistoryOptions,
} from './message-store';

// Re-export types from core modules and shared types
export type { RoomType as WsRoomType, RoomVisibility, UserRole, RoomParticipant } from './rooms';
export type { Permission } from './permissions';
export type { StoredMessage, MessageHistoryOptions } from './message-store';
export type { AuthenticatedSocket, WebSocketMessage } from './types';

// ============================================================================
// Global Server Instance
// ============================================================================

let io: SocketIOServer | null = null;
let httpServer: HTTPServer | null = null;
let roomManager: RoomManager | null = null;
let permissionManager: PermissionManager | null = null;
let messageStore: MessageStore | null = null;

// ============================================================================
// Core Module Initialization
// ============================================================================

function initializeCoreModules(): void {
  if (!permissionManager) {
    permissionManager = getPermissionManager();
  }

  if (!messageStore) {
    messageStore = getMessageStore({
      maxHistorySize: 10000,
      offlineMessageTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxOfflineMessages: 100,
    });
  }

  if (!roomManager) {
    // Set up event callbacks for room manager
    const callbacks: RoomEventCallbacks = {
      onUserJoined: (room, participant) => {
        // Broadcast to room that user joined
        if (io) {
          io.to(room.id).emit('room:user_joined', {
            user: participant,
            userCount: room.participants.size,
          });
        }
      },
      onUserLeft: (room, participant) => {
        // Broadcast to room that user left
        if (io) {
          io.to(room.id).emit('room:user_left', {
            userId: participant.id,
            userCount: room.participants.size,
          });
        }
      },
      onUserBanned: (roomId, userId, bannedBy) => {
        // Notify user they were banned
        if (io) {
          io.to(`user:${userId}`).emit('room:banned', {
            roomId,
            bannedBy,
            timestamp: new Date().toISOString(),
          });
        }
      },
      onUserRoleChanged: (room, participant, oldRole) => {
        // Notify user of role change
        if (io) {
          io.to(`user:${participant.id}`).emit('room:role_changed', {
            roomId: room.id,
            oldRole,
            newRole: participant.role,
          });
        }
      },
    };

    roomManager = getRoomManager(callbacks);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique color for a user
 * Note: Duplicate of RoomManager.generateColor - kept for reference
 */
function _generateColor(userId: string): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
    '#d946ef', '#ec4899', '#f43f5e',
  ];
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// ============================================================================
// Message Broadcasting
// ============================================================================

function broadcastToRoom(roomId: string, event: string, data: unknown): void {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }

  io.to(roomId).emit(event, data);
  logger.debug('Broadcast to room', { roomId, event, data });
}

function broadcastToUser(userId: string, event: string, data: unknown): void {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }

  io.to(`user:${userId}`).emit(event, data);
  logger.debug('Broadcast to user', { userId, event, data });
}

function broadcastToAll(event: string, data: unknown): void {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }

  io.emit(event, data);
  logger.debug('Broadcast to all', { event, data });
}

// ============================================================================
// Authentication Middleware
// ============================================================================

async function authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      logger.warn('Connection rejected: No token provided', { socketId: socket.id });
      return next(new Error('No token provided'));
    }

    const userContext = await verifyJwtToken(token);

    if (!userContext || !userContext.userId) {
      logger.warn('Connection rejected: Invalid token', { socketId: socket.id });
      return next(new Error('Invalid token'));
    }

    const user = await getUserById(userContext.userId);
    if (!user) {
      logger.warn('Connection rejected: User not found', { socketId: socket.id, userId: userContext.userId });
      return next(new Error('User not found'));
    }

    socket.data.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };
    socket.data.lastHeartbeat = Date.now();
    socket.data.rooms = new Set();

    logger.info('User authenticated', {
      socketId: socket.id,
      userId: user.id,
      userName: user.name,
    });

    next();
  } catch (_error) {
    logger.error('Authentication error', { socketId: socket.id, error });
    next(new Error('Authentication failed'));
  }
}

// ============================================================================
// Socket Event Handlers
// ============================================================================

function setupSocketHandlers(socket: AuthenticatedSocket): void {
  const user = socket.data.user;

  // Ensure core modules are initialized
  initializeCoreModules();

  // Join user's personal channel
  socket.join(`user:${user.id}`);

  // Send authentication success
  socket.emit('auth:authenticated', {
    userId: user.id,
    name: user.name,
    avatar: user.avatar,
  });

  // --------------------------------------------------------------------
  // Room Events
  // --------------------------------------------------------------------

  socket.on('room:create', (data: {
    roomId: string;
    type: RoomType;
    documentId: string;
    name?: string;
    visibility?: RoomVisibility;
    config?: RoomConfig;
  }) => {
    try {
      const { roomId, type, documentId, name, visibility, config } = data;

      // Check if room already exists
      if (roomManager!.exists(roomId)) {
        socket.emit('system:error', { message: 'Room already exists', code: 'ROOM_EXISTS' });
        return;
      }

      // Create room
      const createOptions: CreateRoomOptions = {
        id: roomId,
        type,
        documentId,
        ownerId: user.id,
        name,
        visibility: visibility ?? 'public',
        config,
      };

      const room = roomManager!.create(createOptions);

      // Notify creator
      socket.emit('room:created', {
        id: room.id,
        name: room.name,
        type: room.type,
        visibility: room.visibility,
        ownerId: room.ownerId,
        documentId: room.documentId,
        createdAt: room.createdAt,
      });

      logger.info('Room created', { roomId, type, ownerId: user.id });
    } catch (_error) {
      logger.error('Error creating room', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to create room' });
    }
  });

  socket.on('room:delete', (data: { roomId: string }) => {
    try {
      const { roomId } = data;

      const room = roomManager!.get(roomId);
      if (!room) {
        socket.emit('system:error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' });
        return;
      }

      // Check permission - only owner can delete
      if (room.ownerId !== user.id) {
        // Check if user has admin:manage_rooms permission
        if (!permissionManager!.hasPermission(user.id, roomId, 'admin:manage_rooms')) {
          socket.emit('system:error', { message: 'No permission to delete room', code: 'NO_PERMISSION' });
          return;
        }
      }

      // Notify all users in room before deletion
      broadcastToRoom(roomId, 'room:deleted', {
        roomId,
        deletedBy: user.id,
        timestamp: new Date().toISOString(),
      });

      // Destroy room
      const destroyed = roomManager!.destroy(roomId, user.id);

      if (destroyed) {
        socket.emit('room:delete_success', { roomId });
        logger.info('Room deleted', { roomId, deletedBy: user.id });
      } else {
        socket.emit('system:error', { message: 'Failed to delete room' });
      }
    } catch (_error) {
      logger.error('Error deleting room', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to delete room' });
    }
  });

  socket.on('room:join', (data: {
    roomId: string;
    type: RoomType;
    documentId: string;
    name?: string;
    visibility?: RoomVisibility;
  }) => {
    try {
      const { roomId, type, documentId, name, visibility } = data;

      // Check if room exists or create it
      let room = roomManager!.get(roomId);
      if (!room) {
        // Auto-create room
        const createOptions: CreateRoomOptions = {
          id: roomId,
          type,
          documentId,
          ownerId: user.id,
          name,
          visibility: visibility ?? 'public',
        };
        room = roomManager!.create(createOptions);
      }

      // Check if user is banned
      if (permissionManager!.isUserBanned(user.id, roomId)) {
        socket.emit('system:error', { message: 'You are banned from this room', code: 'BANNED' });
        return;
      }

      // Join room via RoomManager
      const joinOptions: JoinRoomOptions = {
        userId: user.id,
        userName: user.name,
        email: user.email,
        avatar: user.avatar,
        role: room.ownerId === user.id ? 'owner' : 'member',
      };

      const result = roomManager!.join(roomId, joinOptions);

      if (!result.success) {
        socket.emit('system:error', { message: result.error || 'Failed to join room', code: 'JOIN_FAILED' });
        return;
      }

      // Join socket.io room
      socket.join(roomId);
      socket.data.rooms.add(roomId);

      // Get room info
      const roomData = roomManager!.get(roomId)!;

      // Notify user
      socket.emit('room:joined', {
        roomId,
        users: roomManager!.getParticipants(roomId),
        document: roomData.data,
        role: result.participant?.role,
      });

      // Notify other users in room (via callback in RoomManager)
      logger.info('Room joined', { socketId: socket.id, roomId, userId: user.id });

      // Deliver any offline messages
      if (result.offlineMessages && result.offlineMessages.length > 0) {
        socket.emit('messages:offline', {
          messages: result.offlineMessages,
        });
      }
    } catch (_error) {
      logger.error('Error joining room', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to join room' });
    }
  });

  socket.on('room:leave', (data: { roomId: string }) => {
    try {
      const { roomId } = data;

      const _leaveResult = roomManager!.leave(roomId, user.id);

      // Leave socket.io room
      socket.leave(roomId);
      socket.data.rooms.delete(roomId);

      // Notify user
      socket.emit('room:left', { roomId });

      logger.info('Room left', { socketId: socket.id, roomId, userId: user.id });
    } catch (_error) {
      logger.error('Error leaving room', { socketId: socket.id, error });
    }
  });

  socket.on('room:get_users', (data: { roomId: string }) => {
    const { roomId } = data;
    const users = roomManager!.getParticipants(roomId);
    socket.emit('room:user_list', { roomId, users });
  });

  socket.on('room:get_info', (data: { roomId: string }) => {
    const { roomId } = data;
    const room = roomManager!.get(roomId);
    if (room) {
      socket.emit('room:info', {
        id: room.id,
        name: room.name,
        type: room.type,
        visibility: room.visibility,
        ownerId: room.ownerId,
        participantCount: room.participants.size,
        createdAt: room.createdAt,
      });
    } else {
      socket.emit('system:error', { message: 'Room not found' });
    }
  });

  // --------------------------------------------------------------------
  // Room Management Events (Kick, Ban, Invite)
  // --------------------------------------------------------------------

  socket.on('room:kick', (data: { roomId: string; userId: string; reason?: string }) => {
    try {
      const { roomId, userId, reason } = data;

      const result = roomManager!.kick(roomId, userId, user.id, reason);

      if (!result.success) {
        socket.emit('system:error', { message: result.error || 'Failed to kick user' });
        return;
      }

      // Notify kicked user
      broadcastToUser(userId, 'room:kicked', {
        roomId,
        kickedBy: user.id,
        reason,
        timestamp: new Date().toISOString(),
      });

      // Confirm to kicker
      socket.emit('room:kick_success', { roomId, userId });

      logger.info('User kicked', { roomId, userId, kickedBy: user.id, reason });
    } catch (_error) {
      logger.error('Error kicking user', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to kick user' });
    }
  });

  socket.on('room:ban', (data: { roomId: string; userId: string; reason?: string }) => {
    try {
      const { roomId, userId, reason } = data;

      const result = roomManager!.ban(roomId, userId, user.id, reason);

      if (!result.success) {
        socket.emit('system:error', { message: result.error || 'Failed to ban user' });
        return;
      }

      // Notify banned user
      broadcastToUser(userId, 'room:banned', {
        roomId,
        bannedBy: user.id,
        reason,
        timestamp: new Date().toISOString(),
      });

      // Confirm to banner
      socket.emit('room:ban_success', { roomId, userId });

      logger.info('User banned', { roomId, userId, bannedBy: user.id, reason });
    } catch (_error) {
      logger.error('Error banning user', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to ban user' });
    }
  });

  socket.on('room:unban', (data: { roomId: string; userId: string }) => {
    try {
      const { roomId, userId } = data;

      const result = roomManager!.unban(roomId, userId, user.id);

      if (!result.success) {
        socket.emit('system:error', { message: result.error || 'Failed to unban user' });
        return;
      }

      // Notify unbanned user
      broadcastToUser(userId, 'room:unbanned', {
        roomId,
        unbannedBy: user.id,
        timestamp: new Date().toISOString(),
      });

      // Confirm to unbanner
      socket.emit('room:unban_success', { roomId, userId });

      logger.info('User unbanned', { roomId, userId, unbannedBy: user.id });
    } catch (_error) {
      logger.error('Error unbanning user', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to unban user' });
    }
  });

  socket.on('room:invite', (data: { roomId: string; userId: string }) => {
    try {
      const { roomId, userId } = data;

      const result = roomManager!.invite(roomId, userId, user.id);

      if (!result.success) {
        socket.emit('system:error', { message: result.error || 'Failed to invite user' });
        return;
      }

      // Notify invited user
      broadcastToUser(userId, 'room:invited', {
        roomId,
        invitedBy: user.id,
        invitedByName: user.name,
        timestamp: new Date().toISOString(),
      });

      // Confirm to inviter
      socket.emit('room:invite_success', { roomId, userId });

      logger.info('User invited', { roomId, userId, invitedBy: user.id });
    } catch (_error) {
      logger.error('Error inviting user', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to invite user' });
    }
  });

  // --------------------------------------------------------------------
  // Role Management Events
  // --------------------------------------------------------------------

  socket.on('room:change_role', (data: { roomId: string; userId: string; role: UserRole }) => {
    try {
      const { roomId, userId, role } = data;

      const result = roomManager!.changeRole(roomId, userId, role, user.id);

      if (!result.success) {
        socket.emit('system:error', { message: result.error || 'Failed to change role' });
        return;
      }

      // Notify user of role change
      broadcastToUser(userId, 'room:role_changed', {
        roomId,
        oldRole: result.oldRole,
        newRole: role,
        changedBy: user.id,
        timestamp: new Date().toISOString(),
      });

      // Confirm to requester
      socket.emit('room:role_change_success', { roomId, userId, newRole: role });

      logger.info('User role changed', { roomId, userId, newRole: role, changedBy: user.id });
    } catch (_error) {
      logger.error('Error changing role', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to change role' });
    }
  });

  // --------------------------------------------------------------------
  // Document Events
  // --------------------------------------------------------------------

  socket.on('doc:open', (data: { roomId: string; documentId: string }) => {
    try {
      const { roomId, documentId } = data;

      // Check permission
      if (!permissionManager!.hasPermission(user.id, roomId, 'room:view')) {
        socket.emit('system:error', { message: 'No permission to view this room', code: 'NO_PERMISSION' });
        return;
      }

      const room = roomManager!.get(roomId);

      if (!room) {
        socket.emit('system:error', { message: 'Room not found' });
        return;
      }

      socket.emit('doc:opened', {
        roomId,
        documentId,
        document: room.data,
      });

      logger.debug('Document opened', { socketId: socket.id, roomId, documentId, userId: user.id });
    } catch (_error) {
      logger.error('Error opening document', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to open document' });
    }
  });

  socket.on('doc:operation', (data: {
    roomId: string;
    operation: {
      type: 'insert' | 'delete' | 'retain';
      position: number;
      content?: string;
      length?: number;
    };
  }) => {
    try {
      const { roomId, operation } = data;

      // Check permission
      if (!permissionManager!.hasPermission(user.id, roomId, 'message:send')) {
        socket.emit('system:error', { message: 'No permission to edit', code: 'NO_PERMISSION' });
        return;
      }

      const room = roomManager!.get(roomId);

      if (!room) {
        socket.emit('system:error', { message: 'Room not found' });
        return;
      }

      // Apply operation to document
      let { content, revision } = room.data;

      if (operation.type === 'insert' && operation.content) {
        content = content.slice(0, operation.position) + operation.content + content.slice(operation.position);
      } else if (operation.type === 'delete' && operation.length) {
        content = content.slice(0, operation.position) + content.slice(operation.position + operation.length);
      }

      revision++;

      // Update room data
      roomManager!.updateData(roomId, { content, revision });

      // Broadcast operation to room
      const operationMessage = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        operation,
        revision,
      };

      broadcastToRoom(roomId, 'doc:operation_applied', operationMessage);

      logger.debug('Document operation applied', { socketId: socket.id, roomId, operation, revision });
    } catch (_error) {
      logger.error('Error applying operation', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to apply operation' });
    }
  });

  socket.on('doc:sync', (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      const room = roomManager!.get(roomId);

      if (!room) {
        socket.emit('system:error', { message: 'Room not found' });
        return;
      }

      socket.emit('doc:sync', {
        roomId,
        document: room.data,
      });
    } catch (_error) {
      logger.error('Error syncing document', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to sync document' });
    }
  });

  // --------------------------------------------------------------------
  // Message Events
  // --------------------------------------------------------------------

  socket.on('message:send', (data: {
    roomId: string;
    content: string;
    type?: string;
    replyTo?: string;
    metadata?: Record<string, unknown>;
  }) => {
    try {
      const { roomId, content, type = 'text', replyTo, metadata } = data;

      // Check permission
      if (!permissionManager!.hasPermission(user.id, roomId, 'message:send')) {
        socket.emit('system:error', { message: 'No permission to send messages', code: 'NO_PERMISSION' });
        return;
      }

      // Create message
      const messageId = crypto.randomUUID();
      const storedMessage = messageStore!.store({
        id: messageId,
        roomId,
        userId: user.id,
        userName: user.name,
        type,
        content,
        replyTo,
        metadata,
      });

      // Get room participants to check for offline users
      const participants = roomManager!.getParticipants(roomId);
      const onlineUserIds = new Set(
        Array.from(io?.sockets.sockets.values() || [])
          .filter(s => (s as AuthenticatedSocket).data.rooms?.has(roomId))
          .map(s => (s as AuthenticatedSocket).data.user.id)
      );

      // Queue messages for offline participants
      for (const participant of participants) {
        if (!onlineUserIds.has(participant.id)) {
          messageStore!.queueOfflineMessage(participant.id, storedMessage);
        }
      }

      // Broadcast to room
      broadcastToRoom(roomId, 'message:new', storedMessage);

      logger.debug('Message sent', { messageId, roomId, userId: user.id });
    } catch (_error) {
      logger.error('Error sending message', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to send message' });
    }
  });

  socket.on('message:edit', (data: { roomId: string; messageId: string; content: string }) => {
    try {
      const { roomId, messageId, content } = data;

      // Check permission
      if (!permissionManager!.hasPermission(user.id, roomId, 'message:edit')) {
        socket.emit('system:error', { message: 'No permission to edit messages', code: 'NO_PERMISSION' });
        return;
      }

      const message = messageStore!.getInRoom(roomId, messageId);
      if (!message) {
        socket.emit('system:error', { message: 'Message not found' });
        return;
      }

      // Only allow editing own messages (unless admin/moderator)
      if (message.userId !== user.id) {
        if (!permissionManager!.hasPermission(user.id, roomId, 'admin:manage_users')) {
          socket.emit('system:error', { message: 'Cannot edit other users\' messages' });
          return;
        }
      }

      const editedMessage = messageStore!.edit(messageId, content, user.id);

      if (editedMessage) {
        broadcastToRoom(roomId, 'message:edited', editedMessage);
      }

      logger.debug('Message edited', { messageId, roomId, userId: user.id });
    } catch (_error) {
      logger.error('Error editing message', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to edit message' });
    }
  });

  socket.on('message:delete', (data: { roomId: string; messageId: string }) => {
    try {
      const { roomId, messageId } = data;

      // Check permission
      if (!permissionManager!.hasPermission(user.id, roomId, 'message:delete')) {
        socket.emit('system:error', { message: 'No permission to delete messages', code: 'NO_PERMISSION' });
        return;
      }

      const message = messageStore!.getInRoom(roomId, messageId);
      if (!message) {
        socket.emit('system:error', { message: 'Message not found' });
        return;
      }

      // Only allow deleting own messages (unless admin/moderator)
      if (message.userId !== user.id) {
        if (!permissionManager!.hasPermission(user.id, roomId, 'admin:manage_users')) {
          socket.emit('system:error', { message: 'Cannot delete other users\' messages' });
          return;
        }
      }

      const deleted = messageStore!.delete(messageId, user.id);

      if (deleted) {
        broadcastToRoom(roomId, 'message:deleted', { messageId, roomId });
      }

      logger.debug('Message deleted', { messageId, roomId, userId: user.id });
    } catch (_error) {
      logger.error('Error deleting message', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to delete message' });
    }
  });

  socket.on('message:react', (data: { roomId: string; messageId: string; emoji: string }) => {
    try {
      const { roomId, messageId, emoji } = data;

      // Check permission
      if (!permissionManager!.hasPermission(user.id, roomId, 'message:react')) {
        socket.emit('system:error', { message: 'No permission to react', code: 'NO_PERMISSION' });
        return;
      }

      const added = messageStore!.addReaction(messageId, emoji, user.id, user.name);

      if (added) {
        const message = messageStore!.getInRoom(roomId, messageId);
        broadcastToRoom(roomId, 'message:reaction', {
          messageId,
          emoji,
          userId: user.id,
          userName: user.name,
          reactions: message?.reactions,
        });
      }

      logger.debug('Reaction added', { messageId, emoji, userId: user.id });
    } catch (_error) {
      logger.error('Error adding reaction', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to add reaction' });
    }
  });

  socket.on('message:pin', (data: { roomId: string; messageId: string }) => {
    try {
      const { roomId, messageId } = data;

      // Check permission
      if (!permissionManager!.hasPermission(user.id, roomId, 'message:pin')) {
        socket.emit('system:error', { message: 'No permission to pin messages', code: 'NO_PERMISSION' });
        return;
      }

      const pinned = messageStore!.pin(messageId, user.id);

      if (pinned) {
        const message = messageStore!.getInRoom(roomId, messageId);
        broadcastToRoom(roomId, 'message:pinned', { messageId, pinnedBy: user.id, message });
      }

      logger.debug('Message pinned', { messageId, userId: user.id });
    } catch (_error) {
      logger.error('Error pinning message', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to pin message' });
    }
  });

  socket.on('message:get_history', (data: MessageHistoryOptions) => {
    try {
      const { roomId } = data;

      // Check permission
      if (!permissionManager!.hasPermission(user.id, roomId, 'message:view_history')) {
        socket.emit('system:error', { message: 'No permission to view history', code: 'NO_PERMISSION' });
        return;
      }

      const messages = messageStore!.getHistory(data);
      socket.emit('message:history', { roomId, messages });
    } catch (_error) {
      logger.error('Error getting history', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to get message history' });
    }
  });

  socket.on('message:get_pinned', (data: { roomId: string }) => {
    try {
      const { roomId } = data;

      // Check permission
      if (!permissionManager!.hasPermission(user.id, roomId, 'room:view')) {
        socket.emit('system:error', { message: 'No permission', code: 'NO_PERMISSION' });
        return;
      }

      const messages = messageStore!.getPinnedMessages(roomId);
      socket.emit('message:pinned_list', { roomId, messages });
    } catch (_error) {
      logger.error('Error getting pinned messages', { socketId: socket.id, error });
    }
  });

  // --------------------------------------------------------------------
  // Cursor Events
  // --------------------------------------------------------------------

  socket.on('cursor:move', (data: {
    roomId: string;
    position: number;
    selection?: { start: number; end: number };
  }) => {
    try {
      const { roomId, position, selection } = data;

      const room = roomManager!.get(roomId);
      if (!room) return;

      roomManager!.updateCursor(roomId, user.id, { position, selection });

      const participant = roomManager!.getParticipant(roomId, user.id);
      if (participant) {
        // Broadcast cursor update to room
        broadcastToRoom(roomId, 'cursor:update', {
          userId: user.id,
          userName: user.name,
          color: participant.color,
          position,
          selection,
        });
      }
    } catch (_error) {
      logger.error('Error updating cursor', { socketId: socket.id, error });
    }
  });

  // Selection update
  socket.on('selection:update', (data: {
    roomId: string;
    selection: { start: number; end: number };
  }) => {
    try {
      const { roomId, selection } = data;

      const room = roomManager!.get(roomId);
      if (!room) return;

      const participant = roomManager!.getParticipant(roomId, user.id);
      if (participant) {
        roomManager!.updateCursor(roomId, user.id, {
          position: participant.cursor?.position || 0,
          selection,
        });

        // Broadcast selection update to room
        broadcastToRoom(roomId, 'selection:update', {
          userId: user.id,
          userName: user.name,
          color: participant.color,
          selection,
        });
      }
    } catch (_error) {
      logger.error('Error updating selection', { socketId: socket.id, error });
    }
  });

  // --------------------------------------------------------------------
  // Presence Events
  // --------------------------------------------------------------------

  socket.on('presence:typing', (data: { roomId: string; isTyping: boolean }) => {
    try {
      const { roomId, isTyping } = data;

      const room = roomManager!.get(roomId);
      if (!room) return;

      roomManager!.updateTyping(roomId, user.id, isTyping);

      // Broadcast typing status to room
      socket.to(roomId).emit('presence:typing', {
        userId: user.id,
        userName: user.name,
        isTyping,
      });
    } catch (_error) {
      logger.error('Error updating typing status', { socketId: socket.id, error });
    }
  });

  // --------------------------------------------------------------------
  // Heartbeat
  // --------------------------------------------------------------------

  socket.on('heartbeat', () => {
    socket.data.lastHeartbeat = Date.now();
  });

  // --------------------------------------------------------------------
  // Disconnect
  // --------------------------------------------------------------------

  socket.on('disconnect', (reason: string) => {
    logger.info('Client disconnected', {
      socketId: socket.id,
      userId: user.id,
      userName: user.name,
      reason,
    });

    // Leave all rooms and notify other users
    const roomsToLeave = Array.from(socket.data.rooms);
    roomsToLeave.forEach(roomId => {
      const _result = roomManager!.leave(roomId, user.id);

      // Notify other users (handled by callback in RoomManager)
    });

    // Clear room references
    socket.data.rooms.clear();
  });
}

// ============================================================================
// Server Setup
// ============================================================================

function setupServer(ioServer: SocketIOServer): void {
  // Initialize core modules
  initializeCoreModules();

  // Use authentication middleware
  ioServer.use(authenticateSocket);

  // Handle connections
  ioServer.on('connection', (socket) => {
    logger.info('New connection', { socketId: socket.id });
    setupSocketHandlers(socket as AuthenticatedSocket);
  });

  // Setup voice meeting handlers
  setupVoiceMeetingHandlers(ioServer);

  // Start heartbeat monitoring
  setInterval(() => {
    const now = Date.now();
    ioServer?.sockets.sockets.forEach((socket) => {
      const authSocket = socket as AuthenticatedSocket;
      const lastHeartbeat = authSocket.data.lastHeartbeat || 0;

      // Disconnect if no heartbeat for 120 seconds (increased from 60s for better tolerance)
      const heartbeatTimeout = 120000; // 2 minutes
      if (now - lastHeartbeat > heartbeatTimeout) {
        logger.warn('Client disconnected (heartbeat timeout)', {
          socketId: socket.id,
          userId: authSocket.data.user?.id,
          lastHeartbeat,
          elapsed: now - lastHeartbeat,
        });
        socket.disconnect(true);
      }
    });
  }, 10000);

  // Start periodic cleanup of expired offline messages
  setInterval(() => {
    messageStore?.cleanupExpiredOfflineMessages();
  }, 60000); // Every minute

  logger.info('WebSocket server setup complete');
}

// ============================================================================
// Server Export
// ============================================================================

export async function createServer(req: NextRequest): Promise<Response> {
  // Create HTTP server if needed
  if (!httpServer) {
    httpServer = new HTTPServer();

    // Get allowed origin from environment variable
    const allowedOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio';

    // Initialize Socket.IO
    io = new SocketIOServer(httpServer, {
      path: '/api/ws',
      cors: {
        origin: allowedOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 45000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e8, // 100 MB
    });

    setupServer(io);
  }

  // Upgrade the HTTP connection to WebSocket
  const url = new URL(req.url);
  const wsUrl = `ws://${url.host}/api/ws`;

  return new Response(
    `WebSocket server is running. Connect to: ${wsUrl}`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.studio',
      },
    }
  );
}

// ============================================================================
// Server API (for monitoring and management)
// ============================================================================

export async function getServer(): Promise<SocketIOServer | null> {
  return io;
}

export async function getStats() {
  if (!io || !roomManager || !messageStore) {
    return {
      connected: 0,
      rooms: 0,
      totalUsers: 0,
      messages: 0,
    };
  }

  const connected = io.sockets.sockets.size;
  const roomStats = roomManager.getStats();
  const messageStats = messageStore.getStats();

  return {
    connected,
    rooms: roomStats.totalRooms,
    activeRooms: roomStats.activeRooms,
    totalUsers: roomStats.totalParticipants,
    messages: messageStats.totalMessages,
    offlineMessages: messageStats.totalOfflineMessages,
  };
}

export async function getRoomInfo(roomId: string) {
  if (!roomManager) return null;
  
  const room = roomManager.get(roomId);
  if (!room) return null;

  return {
    id: room.id,
    name: room.name,
    type: room.type,
    visibility: room.visibility,
    ownerId: room.ownerId,
    userCount: room.participants.size,
    createdAt: room.createdAt,
    lastActivity: room.lastActivity,
    users: Array.from(room.participants.values()).map(u => ({
      id: u.id,
      name: u.name,
      color: u.color,
      role: u.role,
      isTyping: u.isTyping,
      lastActivity: u.lastActivity,
      isOnline: u.isOnline,
    })),
  };
}

export async function getAllRooms() {
  if (!roomManager) return [];
  
  return roomManager.getAllRooms().map(room => ({
    id: room.id,
    name: room.name,
    type: room.type,
    visibility: room.visibility,
    ownerId: room.ownerId,
    userCount: room.participants.size,
    createdAt: room.createdAt,
    lastActivity: room.lastActivity,
  }));
}

export async function broadcastSystemAnnouncement(message: string): Promise<void> {
  broadcastToAll('system:announcement', {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    message,
  });
}

// ============================================================================
// Task Status Broadcast
// ============================================================================

export interface TaskStatusUpdate {
  taskId: string;
  status: string;
  state: 'submitted' | 'running' | 'completed' | 'failed' | 'cancelled';
  timestamp: string;
  userId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Broadcast task status update to all connected clients
 */
export async function broadcastTaskStatusUpdate(update: TaskStatusUpdate): Promise<void> {
  const message = {
    id: crypto.randomUUID(),
    type: 'task_status',
    taskId: update.taskId,
    status: update.status,
    state: update.state,
    userId: update.userId,
    projectId: update.projectId,
    metadata: update.metadata,
    timestamp: update.timestamp || new Date().toISOString(),
  };

  // Broadcast to all clients
  broadcastToAll('task:status_update', message);

  // Also broadcast to specific room if projectId provided
  if (update.projectId) {
    const roomId = `project:${update.projectId}`;
    broadcastToRoom(roomId, 'task:status_update', message);
  }

  logger.info('Task status update broadcasted', {
    taskId: update.taskId,
    status: update.status,
    state: update.state,
  });
}

/**
 * Broadcast task status update to specific user
 */
export async function broadcastTaskStatusToUser(
  userId: string,
  update: TaskStatusUpdate
): Promise<void> {
  const message = {
    id: crypto.randomUUID(),
    type: 'task_status',
    taskId: update.taskId,
    status: update.status,
    state: update.state,
    userId: update.userId,
    projectId: update.projectId,
    metadata: update.metadata,
    timestamp: update.timestamp || new Date().toISOString(),
  };

  broadcastToUser(userId, 'task:status_update', message);

  logger.info('Task status update sent to user', {
    userId,
    taskId: update.taskId,
    status: update.status,
  });
}

// ============================================================================
// Permission Helper Exports
// ============================================================================

/**
 * Check if user has permission in room (for external use)
 */
export async function checkUserPermission(userId: string, roomId: string, permission: Permission): Promise<boolean> {
  if (!permissionManager) return false;
  return permissionManager.hasPermission(userId, roomId, permission);
}

/**
 * Get user role in room (for external use)
 */
export async function getUserRoomRole(userId: string, roomId: string): Promise<UserRole> {
  if (!permissionManager) return 'guest';
  return permissionManager.getUserRole(userId, roomId);
}

/**
 * Check if user is banned from room (for external use)
 */
export async function isUserBannedFromRoom(userId: string, roomId: string): Promise<boolean> {
  if (!permissionManager) return false;
  return permissionManager.isUserBanned(userId, roomId);
}

export default createServer;