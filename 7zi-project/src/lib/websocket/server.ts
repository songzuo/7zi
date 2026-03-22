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
import { getUserById } from '@/lib/auth/repository-optimized';
import logger from '@/lib/logger';
import type { Socket } from 'socket.io';
import { setupVoiceMeetingHandlers } from '@/lib/voice-meeting/signaling';

// Performance monitoring
let broadcastCount = 0;
let broadcastLatencies: number[] = [];
const MAX_LATENCY_SAMPLES = 100;

// Utility to record broadcast latency
function recordBroadcastLatency(latency: number): void {
  broadcastLatencies.push(latency);
  if (broadcastLatencies.length > MAX_LATENCY_SAMPLES) {
    broadcastLatencies.shift();
  }
}

function getAverageBroadcastLatency(): number {
  if (broadcastLatencies.length === 0) return 0;
  return broadcastLatencies.reduce((a, b) => a + b, 0) / broadcastLatencies.length;
}

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
// Rate Limiting for WebSocket Connections
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const connectionRateLimit = new Map<string, RateLimitEntry>();

const WS_RATE_LIMIT_CONFIG = {
  maxConnections: 60, // 每分钟最多 60 个新连接
  windowMs: 60 * 1000, // 1 分钟窗口
};

/**
 * 检查 WebSocket 连接速率限制
 */
function checkWebSocketRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const entry = connectionRateLimit.get(identifier);

  // 如果没有记录或已过期，创建新记录
  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + WS_RATE_LIMIT_CONFIG.windowMs,
    };
    connectionRateLimit.set(identifier, newEntry);

    return {
      allowed: true,
      remaining: WS_RATE_LIMIT_CONFIG.maxConnections - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // 检查是否超过限制
  if (entry.count >= WS_RATE_LIMIT_CONFIG.maxConnections) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // 增加计数
  entry.count++;
  return {
    allowed: true,
    remaining: WS_RATE_LIMIT_CONFIG.maxConnections - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * 获取客户端标识符（用于速率限制）
 */
function getClientIdentifier(socket: Socket): string {
  const handshake = socket.handshake;
  const ip = socket.handshake.address;

  // 优先使用用户 ID（如果已认证）
  if ((socket as AuthenticatedSocket).data?.user?.id) {
    return `ws:user:${(socket as AuthenticatedSocket).data.user.id}`;
  }

  // 使用 IP 地址
  return `ws:ip:${ip}`;
}

// ============================================================================
// Room Management
// ============================================================================

export interface RoomUser {
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

export interface Room {
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
// Message Broadcasting (Optimized)
// ============================================================================

const broadcastQueue: Map<string, { event: string; data: unknown }[]> = new Map();
const broadcastTimers: Map<string, NodeJS.Timeout> = new Map();

/**
 * Batch broadcasts to the same room to reduce network roundtrips
 */
function queueBroadcastToRoom(roomId: string, event: string, data: unknown, immediate = false): void {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }

  if (immediate) {
    // Immediate broadcast (bypass queue for critical messages)
    const startTime = Date.now();
    io.to(roomId).emit(event, data);
    const latency = Date.now() - startTime;
    broadcastCount++;
    recordBroadcastLatency(latency);
    logger.debug('Broadcast to room (immediate)', { roomId, event, latency });
  } else {
    // Queue broadcast for batching
    if (!broadcastQueue.has(roomId)) {
      broadcastQueue.set(roomId, []);
    }

    const queue = broadcastQueue.get(roomId)!;
    queue.push({ event, data });

    // Limit queue size
    if (queue.length > 50) {
      flushBroadcastQueue(roomId);
    } else {
      // Schedule flush if not already scheduled
      if (!broadcastTimers.has(roomId)) {
        const timer = setTimeout(() => {
          flushBroadcastQueue(roomId);
        }, 50); // 50ms batch window
        broadcastTimers.set(roomId, timer);
      }
    }
  }
}

function flushBroadcastQueue(roomId: string): void {
  const queue = broadcastQueue.get(roomId);
  if (!queue || queue.length === 0) return;

  // Clear timer
  const timer = broadcastTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    broadcastTimers.delete(roomId);
  }

  // Send all messages
  const startTime = Date.now();
  queue.forEach(({ event, data }) => {
    io!.to(roomId).emit(event, data);
  });

  const latency = Date.now() - startTime;
  broadcastCount += queue.length;
  recordBroadcastLatency(latency);

  // Clear queue
  broadcastQueue.set(roomId, []);

  logger.debug('Batch broadcast to room', { roomId, count: queue.length, latency });
}

function broadcastToRoom(roomId: string, event: string, data: unknown): void {
  queueBroadcastToRoom(roomId, event, data, false);
}

function broadcastToUser(userId: string, event: string, data: unknown): void {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }

  const startTime = Date.now();
  io.to(`user:${userId}`).emit(event, data);
  const latency = Date.now() - startTime;
  broadcastCount++;
  recordBroadcastLatency(latency);

  logger.debug('Broadcast to user', { userId, event, data, latency });
}

function broadcastToAll(event: string, data: unknown): void {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }

  const startTime = Date.now();
  io.emit(event, data);
  const latency = Date.now() - startTime;
  broadcastCount++;
  recordBroadcastLatency(latency);

  logger.debug('Broadcast to all', { event, data, latency });
}

// ============================================================================
// Authentication Middleware (with Rate Limiting)
// ============================================================================

async function authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  try {
    // 1. 检查速率限制
    const identifier = getClientIdentifier(socket);
    const rateLimitResult = checkWebSocketRateLimit(identifier);

    if (!rateLimitResult.allowed) {
      logger.warn('WebSocket connection rejected: Rate limit exceeded', {
        socketId: socket.id,
        identifier,
        resetTime: new Date(rateLimitResult.resetTime).toISOString(),
      });
      return next(new Error('Too many connection attempts. Please try again later.'));
    }

    logger.debug('WebSocket rate limit check passed', {
      socketId: socket.id,
      identifier,
      remaining: rateLimitResult.remaining,
    });

    // 2. 验证认证 token
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
      name: user.name || user.username || user.email,
      email: user.email,
      avatar: user.avatar,
    };
    socket.data.lastHeartbeat = Date.now();
    socket.data.rooms = new Set();

    logger.info('User authenticated', {
      socketId: socket.id,
      userId: user.id,
      userName: user.name,
      identifier,
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

  // Selection update
  socket.on('selection:update', (data: {
    roomId: string;
    selection: { start: number; end: number };
  }) => {
    try {
      const { roomId, selection } = data;
      const room = getRoom(roomId);

      if (!room) return;

      const roomUser = room.users.get(user.id);
      if (roomUser) {
        roomUser.cursor = {
          position: roomUser.cursor?.position || 0,
          selection,
        };
        roomUser.lastActivity = new Date();

        // Broadcast selection update to room
        broadcastToRoom(roomId, 'selection:update', {
          userId: user.id,
          userName: user.name,
          color: roomUser.color,
          selection,
        });
      }
    } catch (error) {
      logger.error('Error updating selection', { socketId: socket.id, error });
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
      broadcasts: 0,
      avgBroadcastLatency: 0,
    };
  }

  const connected = io.sockets.sockets.size;
  const totalUsers = Array.from(rooms.values()).reduce((acc, room) => acc + room.users.size, 0);

  return {
    connected,
    rooms: rooms.size,
    totalUsers,
    broadcasts: broadcastCount,
    avgBroadcastLatency: getAverageBroadcastLatency(),
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

export default createServer;
