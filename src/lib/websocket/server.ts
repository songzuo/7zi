/**
 * WebSocket Server Implementation
 *
 * Socket.IO server for real-time collaboration features
 * Supports rooms, authentication, and message broadcasting
 */

'use server';

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { NextRequest } from 'next/server';
import { verifyJwtToken } from '@/lib/auth/service';
import { getUserById } from '@/lib/auth/repository';
import { logger } from '@/lib/logger';
import type { Socket } from 'socket.io';
import { setupVoiceMeetingHandlers } from '@/lib/voice-meeting/signaling';

// ============================================================================
// Types
// ============================================================================

export interface AuthenticatedSocket extends Socket {
  data: {
    user: {
      id: string;
      name: string;
      email?: string;
      avatar?: string;
    };
    lastHeartbeat: number;
    rooms: Set<string>;
  };
}

interface WebSocketMessage {
  type: string;
  id: string;
  timestamp: string;
  roomId?: string;
  userId?: string;
  payload?: unknown;
}

// ============================================================================
// Global Server Instance
// ============================================================================

let io: SocketIOServer | null = null;
let httpServer: HTTPServer | null = null;

// ============================================================================
// Room Management
// ============================================================================

interface RoomUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  joinedAt: Date;
  cursor?: {
    position: number;
    selection?: { start: number; end: number };
  };
  isTyping: boolean;
  lastActivity: Date;
}

interface Room {
  id: string;
  name: string;
  type: 'task' | 'project' | 'chat' | 'document';
  documentId: string;
  users: Map<string, RoomUser>;
  createdAt: Date;
  lastActivity: Date;
  document: {
    content: string;
    revision: number;
  };
}

const rooms = new Map<string, Room>();

// ============================================================================
// Room Utility Functions
// ============================================================================

function generateColor(userId: string): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
    '#d946ef', '#ec4899', '#f43f5e',
  ];
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

function createRoom(roomId: string, type: Room['type'], documentId: string, name?: string): Room {
  const room: Room = {
    id: roomId,
    name: name || `Room ${roomId}`,
    type,
    documentId,
    users: new Map(),
    createdAt: new Date(),
    lastActivity: new Date(),
    document: {
      content: '',
      revision: 0,
    },
  };

  rooms.set(roomId, room);
  logger.info('Room created', { roomId, type, documentId });

  return room;
}

function ensureRoom(roomId: string, type: Room['type'], documentId: string, name?: string): Room {
  return getRoom(roomId) || createRoom(roomId, type, documentId, name);
}

function addUserToRoom(room: Room, user: RoomUser): void {
  room.users.set(user.id, user);
  room.lastActivity = new Date();

  logger.info('User joined room', {
    roomId: room.id,
    userId: user.id,
    userName: user.name,
    userCount: room.users.size,
  });
}

function removeUserFromRoom(room: Room, userId: string): void {
  const user = room.users.get(userId);
  if (user) {
    room.users.delete(userId);
    room.lastActivity = new Date();

    logger.info('User left room', {
      roomId: room.id,
      userId,
      userName: user.name,
      userCount: room.users.size,
    });

    // Auto-destroy empty room after 30 minutes
    if (room.users.size === 0 && room.type !== 'project') {
      scheduleRoomCleanup(room.id, 30 * 60 * 1000);
    }
  }
}

function getRoomUsers(roomId: string): RoomUser[] {
  const room = getRoom(roomId);
  return room ? Array.from(room.users.values()) : [];
}

// ============================================================================
// Room Cleanup
// ============================================================================

const cleanupTimers = new Map<string, NodeJS.Timeout>();

function scheduleRoomCleanup(roomId: string, delay: number): void {
  // Cancel existing timer
  const existingTimer = cleanupTimers.get(roomId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Schedule cleanup
  const timer = setTimeout(() => {
    const room = getRoom(roomId);
    if (room && room.users.size === 0) {
      rooms.delete(roomId);
      cleanupTimers.delete(roomId);
      logger.info('Room destroyed (idle)', { roomId });
    }
  }, delay);

  cleanupTimers.set(roomId, timer);
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
  } catch (error) {
    logger.error('Authentication error', { socketId: socket.id, error });
    next(new Error('Authentication failed'));
  }
}

// ============================================================================
// Socket Event Handlers
// ============================================================================

function setupSocketHandlers(socket: AuthenticatedSocket): void {
  const user = socket.data.user;

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

  socket.on('room:join', (data: { roomId: string; type: Room['type']; documentId: string; name?: string }) => {
    try {
      const { roomId, type, documentId, name } = data;

      // Check room access authorization here if needed
      // For now, allow any authenticated user to join any room

      // Get or create room
      const room = ensureRoom(roomId, type, documentId, name);

      // Add user to room
      socket.join(roomId);
      socket.data.rooms.add(roomId);

      const roomUser: RoomUser = {
        id: user.id,
        name: user.name,
        email: user.email || '',
        avatar: user.avatar,
        color: generateColor(user.id),
        joinedAt: new Date(),
        isTyping: false,
        lastActivity: new Date(),
      };

      addUserToRoom(room, roomUser);

      // Notify user
      socket.emit('room:joined', {
        roomId,
        users: getRoomUsers(roomId),
        document: room.document,
      });

      // Notify other users in room
      socket.to(roomId).emit('room:user_joined', {
        user: roomUser,
        userCount: room.users.size,
      });

      logger.info('Room joined', { socketId: socket.id, roomId, userId: user.id });
    } catch (error) {
      logger.error('Error joining room', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to join room' });
    }
  });

  socket.on('room:leave', (data: { roomId: string }) => {
    try {
      const { roomId } = data;

      const room = getRoom(roomId);
      if (!room) return;

      // Remove user from room
      removeUserFromRoom(room, user.id);
      socket.leave(roomId);
      socket.data.rooms.delete(roomId);

      // Notify user
      socket.emit('room:left', { roomId });

      // Notify other users in room
      socket.to(roomId).emit('room:user_left', {
        userId: user.id,
        userCount: room.users.size,
      });

      logger.info('Room left', { socketId: socket.id, roomId, userId: user.id });
    } catch (error) {
      logger.error('Error leaving room', { socketId: socket.id, error });
    }
  });

  socket.on('room:get_users', (data: { roomId: string }) => {
    const { roomId } = data;
    const users = getRoomUsers(roomId);
    socket.emit('room:user_list', { roomId, users });
  });

  // --------------------------------------------------------------------
  // Document Events
  // --------------------------------------------------------------------

  socket.on('doc:open', (data: { roomId: string; documentId: string }) => {
    try {
      const { roomId, documentId } = data;
      const room = ensureRoom(roomId, 'document', documentId);

      socket.emit('doc:opened', {
        roomId,
        documentId,
        document: room.document,
      });

      logger.debug('Document opened', { socketId: socket.id, roomId, documentId, userId: user.id });
    } catch (error) {
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
      const room = getRoom(roomId);

      if (!room) {
        socket.emit('system:error', { message: 'Room not found' });
        return;
      }

      // Apply operation to document
      let { content, revision } = room.document;

      if (operation.type === 'insert' && operation.content) {
        content = content.slice(0, operation.position) + operation.content + content.slice(operation.position);
      } else if (operation.type === 'delete' && operation.length) {
        content = content.slice(0, operation.position) + content.slice(operation.position + operation.length);
      }

      revision++;

      room.document = { content, revision };

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

      // Update room activity
      room.lastActivity = new Date();

      logger.debug('Document operation applied', { socketId: socket.id, roomId, operation, revision });
    } catch (error) {
      logger.error('Error applying operation', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to apply operation' });
    }
  });

  socket.on('doc:sync', (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      const room = getRoom(roomId);

      if (!room) {
        socket.emit('system:error', { message: 'Room not found' });
        return;
      }

      socket.emit('doc:sync', {
        roomId,
        document: room.document,
      });
    } catch (error) {
      logger.error('Error syncing document', { socketId: socket.id, error });
      socket.emit('system:error', { message: 'Failed to sync document' });
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
      const room = getRoom(roomId);

      if (!room) return;

      const roomUser = room.users.get(user.id);
      if (roomUser) {
        roomUser.cursor = { position, selection };
        roomUser.lastActivity = new Date();

        // Broadcast cursor update to room
        broadcastToRoom(roomId, 'cursor:update', {
          userId: user.id,
          userName: user.name,
          color: roomUser.color,
          position,
          selection,
        });
      }
    } catch (error) {
      logger.error('Error updating cursor', { socketId: socket.id, error });
    }
  });

  // --------------------------------------------------------------------
  // Presence Events
  // --------------------------------------------------------------------

  socket.on('presence:typing', (data: { roomId: string; isTyping: boolean }) => {
    try {
      const { roomId, isTyping } = data;
      const room = getRoom(roomId);

      if (!room) return;

      const roomUser = room.users.get(user.id);
      if (roomUser) {
        roomUser.isTyping = isTyping;
        roomUser.lastActivity = new Date();

        // Broadcast typing status to room
        socket.to(roomId).emit('presence:typing', {
          userId: user.id,
          userName: user.name,
          isTyping,
        });
      }
    } catch (error) {
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

    // Leave all rooms
    socket.data.rooms.forEach(roomId => {
      const room = getRoom(roomId);
      if (room) {
        removeUserFromRoom(room, user.id);

        // Notify other users
        socket.to(roomId).emit('room:user_left', {
          userId: user.id,
          userCount: room.users.size,
        });
      }
    });
  });
}

// ============================================================================
// Server Setup
// ============================================================================

function setupServer(ioServer: SocketIOServer): void {
  // Use authentication middleware
  ioServer.use(authenticateSocket as (socket: Socket, next: (err?: Error) => void) => void);

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

      // Disconnect if no heartbeat for 60 seconds
      if (now - lastHeartbeat > 60000) {
        logger.warn('Client disconnected (heartbeat timeout)', {
          socketId: socket.id,
          userId: authSocket.data.user?.id,
        });
        socket.disconnect(true);
      }
    });
  }, 10000);

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
  if (!io) {
    return {
      connected: 0,
      rooms: 0,
      totalUsers: 0,
    };
  }

  const connected = io.sockets.sockets.size;
  const totalUsers = Array.from(rooms.values()).reduce((acc, room) => acc + room.users.size, 0);

  return {
    connected,
    rooms: rooms.size,
    totalUsers,
  };
}

export async function getRoomInfo(roomId: string) {
  const room = getRoom(roomId);
  if (!room) return null;

  return {
    id: room.id,
    name: room.name,
    type: room.type,
    userCount: room.users.size,
    createdAt: room.createdAt,
    lastActivity: room.lastActivity,
    users: Array.from(room.users.values()).map(u => ({
      id: u.id,
      name: u.name,
      color: u.color,
      isTyping: u.isTyping,
      lastActivity: u.lastActivity,
    })),
  };
}

export async function getAllRooms() {
  return Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    type: room.type,
    userCount: room.users.size,
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

export default createServer;
