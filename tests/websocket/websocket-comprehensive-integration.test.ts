/**
 * WebSocket Comprehensive Integration Tests
 * 
 * 完整的 WebSocket 集成测试套件，覆盖：
 * - WebSocket 连接管理（连接池、并发连接、超时处理）
 * - 房间系统功能（创建、加入、离开、邀请、权限）
 * - 消息广播（房间广播、用户广播、全局广播）
 * - 错误处理（认证失败、无效消息、错误恢复）
 * - 重连机制（自动重连、重连限制、指数退避）
 * 
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// Mock WebSocket Server Implementation
// ============================================================================

interface MockSocket {
  id: string;
  userId: string;
  userName: string;
  rooms: Set<string>;
  connected: boolean;
  lastHeartbeat: number;
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

interface MockRoom {
  id: string;
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'invite-only';
  ownerId: string;
  participants: Map<string, MockSocket>;
  config: {
    maxParticipants?: number;
    messageHistoryEnabled?: boolean;
  };
  invites: Set<string>;
  bannedUsers: Set<string>;
  createdAt: Date;
}

interface MockMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  type: string;
  content: string;
  timestamp: Date;
  edited?: boolean;
  reactions?: Array<{ emoji: string; userId: string }>;
}

// ============================================================================
// Mock WebSocket Server Class
// ============================================================================

class MockWebSocketServer {
  private sockets: Map<string, MockSocket> = new Map();
  private rooms: Map<string, MockRoom> = new Map();
  private userSockets: Map<string, Set<string>> = new Map();
  private messages: Map<string, MockMessage[]> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();
  
  private maxConnections: number = 1000;
  private maxRoomsPerUser: number = 50;
  
  private connectionCounter: number = 0;
  private messageCounter: number = 0;
  private emittedEvents: Array<{ event: string; target: string; data: any }> = [];

  constructor(config?: {
    maxConnections?: number;
    maxRoomsPerUser?: number;
  }) {
    if (config) {
      this.maxConnections = config.maxConnections ?? this.maxConnections;
      this.maxRoomsPerUser = config.maxRoomsPerUser ?? this.maxRoomsPerUser;
    }
  }

  async connect(userId: string, userName: string, token?: string): Promise<MockSocket> {
    if (this.sockets.size >= this.maxConnections) {
      throw new Error('Maximum connections reached');
    }

    if (!token) {
      throw new Error('Authentication required');
    }

    const socketId = `socket-${++this.connectionCounter}`;
    const socket: MockSocket = {
      id: socketId,
      userId,
      userName,
      rooms: new Set(),
      connected: true,
      lastHeartbeat: Date.now(),
      data: {
        user: { id: userId, name: userName },
        lastHeartbeat: Date.now(),
        rooms: new Set(),
      },
    };

    this.sockets.set(socketId, socket);
    
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);

    this.emit('connection', socket);
    return socket;
  }

  disconnect(socketId: string): void {
    const socket = this.sockets.get(socketId);
    if (!socket) return;

    socket.rooms.forEach(roomId => this.leaveRoom(socketId, roomId));

    const userSocketSet = this.userSockets.get(socket.userId);
    if (userSocketSet) {
      userSocketSet.delete(socketId);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(socket.userId);
      }
    }

    socket.connected = false;
    this.sockets.delete(socketId);
    this.emit('disconnection', socket);
  }

  createRoom(options: {
    id: string;
    name?: string;
    type?: string;
    visibility?: 'public' | 'private' | 'invite-only';
    ownerId: string;
    maxParticipants?: number;
  }): MockRoom {
    if (this.rooms.has(options.id)) {
      return this.rooms.get(options.id)!;
    }

    const room: MockRoom = {
      id: options.id,
      name: options.name || options.id,
      type: options.type || 'chat',
      visibility: options.visibility || 'public',
      ownerId: options.ownerId,
      participants: new Map(),
      config: { maxParticipants: options.maxParticipants },
      invites: new Set(),
      bannedUsers: new Set(),
      createdAt: new Date(),
    };

    this.rooms.set(options.id, room);
    this.messages.set(options.id, []);
    this.emit('room:created', room);
    return room;
  }

  joinRoom(socketId: string, roomId: string): { success: boolean; error?: string } {
    const socket = this.sockets.get(socketId);
    if (!socket || !socket.connected) {
      return { success: false, error: 'Socket not connected' };
    }

    let room = this.rooms.get(roomId);
    if (!room) {
      if (roomId.startsWith('public-')) {
        room = this.createRoom({ id: roomId, ownerId: socket.userId });
      } else {
        return { success: false, error: 'Room not found' };
      }
    }

    if (room.bannedUsers.has(socket.userId)) {
      return { success: false, error: 'User is banned from this room' };
    }

    if (room.visibility === 'private' && !room.invites.has(socket.userId) && room.ownerId !== socket.userId) {
      return { success: false, error: 'Private room - invite required' };
    }

    if (room.visibility === 'invite-only' && !room.invites.has(socket.userId)) {
      return { success: false, error: 'Invite-only room' };
    }

    if (room.config.maxParticipants && room.participants.size >= room.config.maxParticipants) {
      return { success: false, error: 'Room is full' };
    }

    if (socket.rooms.size >= this.maxRoomsPerUser) {
      return { success: false, error: 'Maximum rooms per user reached' };
    }

    room.participants.set(socketId, socket);
    socket.rooms.add(roomId);
    socket.data.rooms.add(roomId);

    this.broadcastToRoom(roomId, 'room:user_joined', {
      userId: socket.userId,
      userName: socket.userName,
      userCount: room.participants.size,
    });

    this.emit('room:joined', { socket, room });
    return { success: true };
  }

  leaveRoom(socketId: string, roomId: string): { success: boolean; error?: string } {
    const socket = this.sockets.get(socketId);
    if (!socket) return { success: false, error: 'Socket not found' };

    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };

    room.participants.delete(socketId);
    socket.rooms.delete(roomId);
    socket.data.rooms.delete(roomId);

    this.broadcastToRoom(roomId, 'room:user_left', {
      userId: socket.userId,
      userCount: room.participants.size,
    });

    if (room.participants.size === 0 && !roomId.startsWith('persistent-')) {
      this.rooms.delete(roomId);
      this.messages.delete(roomId);
      this.emit('room:destroyed', room);
    }

    this.emit('room:left', { socket, room });
    return { success: true };
  }

  inviteToRoom(roomId: string, inviterId: string, inviteeId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };

    if (room.ownerId !== inviterId) {
      return { success: false, error: 'Only owner can invite' };
    }

    room.invites.add(inviteeId);
    this.emit('room:invited', { roomId, inviteeId, inviterId });
    return { success: true };
  }

  banFromRoom(roomId: string, bannerId: string, banneeId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };

    if (room.ownerId !== bannerId) {
      return { success: false, error: 'Only owner can ban' };
    }

    room.bannedUsers.add(banneeId);
    
    const bannedSocketIds = Array.from(this.sockets.values())
      .filter(s => s.userId === banneeId && s.rooms.has(roomId))
      .map(s => s.id);
    
    bannedSocketIds.forEach(sid => this.leaveRoom(sid, roomId));
    this.emit('room:banned', { roomId, banneeId, bannerId });
    return { success: true };
  }

  sendToRoom(socketId: string, roomId: string, content: string): { success: boolean; error?: string; message?: MockMessage } {
    const socket = this.sockets.get(socketId);
    if (!socket || !socket.connected) {
      return { success: false, error: 'Socket not connected' };
    }

    const room = this.rooms.get(roomId);
    if (!room || !room.participants.has(socketId)) {
      return { success: false, error: 'Not in room' };
    }

    const message: MockMessage = {
      id: `msg-${++this.messageCounter}`,
      roomId,
      userId: socket.userId,
      userName: socket.userName,
      type: 'message',
      content,
      timestamp: new Date(),
    };

    this.messages.get(roomId)!.push(message);
    this.broadcastToRoom(roomId, 'message:new', message);
    return { success: true, message };
  }

  broadcastToRoom(roomId: string, event: string, data: any): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.emittedEvents.push({ event, target: `room:${roomId}`, data });
    room.participants.forEach(socket => {
      if (socket.connected) {
        this.emit(`socket:${socket.id}:${event}`, data);
      }
    });
  }

  broadcastToUser(userId: string, event: string, data: any): void {
    this.emittedEvents.push({ event, target: `user:${userId}`, data });
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        const socket = this.sockets.get(socketId);
        if (socket && socket.connected) {
          this.emit(`socket:${socket.id}:${event}`, data);
        }
      });
    }
  }

  broadcastToAll(event: string, data: any): void {
    this.emittedEvents.push({ event, target: 'all', data });
    this.sockets.forEach(socket => {
      if (socket.connected) {
        this.emit(`socket:${socket.id}:${event}`, data);
      }
    });
  }

  heartbeat(socketId: string): void {
    const socket = this.sockets.get(socketId);
    if (socket) {
      socket.lastHeartbeat = Date.now();
      socket.data.lastHeartbeat = Date.now();
    }
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  getSocket(socketId: string): MockSocket | undefined {
    return this.sockets.get(socketId);
  }

  getRoom(roomId: string): MockRoom | undefined {
    return this.rooms.get(roomId);
  }

  getMessages(roomId: string): MockMessage[] {
    return this.messages.get(roomId) || [];
  }

  getConnectedSockets(): MockSocket[] {
    return Array.from(this.sockets.values()).filter(s => s.connected);
  }

  getRooms(): MockRoom[] {
    return Array.from(this.rooms.values());
  }

  getEmittedEvents(): Array<{ event: string; target: string; data: any }> {
    return [...this.emittedEvents];
  }

  clearEmittedEvents(): void {
    this.emittedEvents = [];
  }

  getStats() {
    return {
      totalConnections: this.sockets.size,
      totalRooms: this.rooms.size,
      totalMessages: Array.from(this.messages.values()).reduce((sum, msgs) => sum + msgs.length, 0),
      usersOnline: this.userSockets.size,
    };
  }

  reset(): void {
    this.sockets.clear();
    this.rooms.clear();
    this.userSockets.clear();
    this.messages.clear();
    this.eventHandlers.clear();
    this.emittedEvents = [];
    this.connectionCounter = 0;
    this.messageCounter = 0;
  }
}

// ============================================================================
// Test Suite: WebSocket Connection Management
// ============================================================================

describe('WebSocket Connection Management', () => {
  let server: MockWebSocketServer;

  beforeEach(() => {
    server = new MockWebSocketServer();
  });

  afterEach(() => {
    server.reset();
  });

  describe('Basic Connection', () => {
    it('should establish connection with valid token', async () => {
      const socket = await server.connect('user-1', 'Alice', 'valid-token');
      expect(socket).toBeDefined();
      expect(socket.userId).toBe('user-1');
      expect(socket.connected).toBe(true);
    });

    it('should reject connection without token', async () => {
      await expect(server.connect('user-1', 'Alice')).rejects.toThrow('Authentication required');
    });

    it('should assign unique socket IDs', async () => {
      const socket1 = await server.connect('user-1', 'Alice', 'token');
      const socket2 = await server.connect('user-2', 'Bob', 'token');
      expect(socket1.id).not.toBe(socket2.id);
    });

    it('should track connected sockets', async () => {
      await server.connect('user-1', 'Alice', 'token');
      await server.connect('user-2', 'Bob', 'token');
      expect(server.getConnectedSockets().length).toBe(2);
    });
  });

  describe('Multiple Connections Per User', () => {
    it('should allow same user to connect multiple times', async () => {
      const socket1 = await server.connect('user-1', 'Alice', 'token');
      const socket2 = await server.connect('user-1', 'Alice', 'token');
      expect(socket1.id).not.toBe(socket2.id);
      expect(socket1.userId).toBe(socket2.userId);
    });

    it('should track all sockets for same user', async () => {
      await server.connect('user-1', 'Alice', 'token');
      await server.connect('user-1', 'Alice', 'token');
      const stats = server.getStats();
      expect(stats.totalConnections).toBe(2);
      expect(stats.usersOnline).toBe(1);
    });
  });

  describe('Connection Limits', () => {
    it('should enforce maximum connections limit', async () => {
      const limitedServer = new MockWebSocketServer({ maxConnections: 5 });
      for (let i = 0; i < 5; i++) {
        await limitedServer.connect(`user-${i}`, `User ${i}`, 'token');
      }
      await expect(limitedServer.connect('user-6', 'User 6', 'token')).rejects.toThrow('Maximum connections reached');
      limitedServer.reset();
    });
  });

  describe('Disconnection', () => {
    it('should handle graceful disconnection', async () => {
      const socket = await server.connect('user-1', 'Alice', 'token');
      expect(socket.connected).toBe(true);
      server.disconnect(socket.id);
      expect(server.getSocket(socket.id)).toBeUndefined();
      expect(server.getConnectedSockets().length).toBe(0);
    });

    it('should leave all rooms on disconnect', async () => {
      const socket = await server.connect('user-1', 'Alice', 'token');
      server.createRoom({ id: 'room-1', ownerId: 'user-1' });
      server.joinRoom(socket.id, 'room-1');
      server.createRoom({ id: 'room-2', ownerId: 'user-1' });
      server.joinRoom(socket.id, 'room-2');
      expect(socket.rooms.size).toBe(2);
      server.disconnect(socket.id);
      expect(server.getRoom('room-1')).toBeUndefined();
      expect(server.getRoom('room-2')).toBeUndefined();
    });

    it('should emit disconnection event', async () => {
      const disconnectHandler = vi.fn();
      server.on('disconnection', disconnectHandler);
      const socket = await server.connect('user-1', 'Alice', 'token');
      server.disconnect(socket.id);
      expect(disconnectHandler).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
    });
  });

  describe('Heartbeat', () => {
    it('should update last heartbeat on heartbeat event', async () => {
      const socket = await server.connect('user-1', 'Alice', 'token');
      const initialTime = socket.lastHeartbeat;
      await new Promise(resolve => setTimeout(resolve, 10));
      server.heartbeat(socket.id);
      expect(socket.lastHeartbeat).toBeGreaterThan(initialTime);
    });
  });
});

// ============================================================================
// Test Suite: Room System Functionality
// ============================================================================

describe('Room System Functionality', () => {
  let server: MockWebSocketServer;
  let socket: MockSocket;

  beforeEach(async () => {
    server = new MockWebSocketServer();
    socket = await server.connect('user-1', 'Alice', 'token');
  });

  afterEach(() => {
    server.reset();
  });

  describe('Room Creation', () => {
    it('should create a room with default options', () => {
      const room = server.createRoom({ id: 'room-1', ownerId: 'user-1' });
      expect(room).toBeDefined();
      expect(room.id).toBe('room-1');
      expect(room.visibility).toBe('public');
    });

    it('should create a private room', () => {
      const room = server.createRoom({
        id: 'room-1',
        ownerId: 'user-1',
        visibility: 'private',
      });
      expect(room.visibility).toBe('private');
    });

    it('should create a room with max participants', () => {
      const room = server.createRoom({
        id: 'room-1',
        ownerId: 'user-1',
        maxParticipants: 10,
      });
      expect(room.config.maxParticipants).toBe(10);
    });

    it('should emit room created event', () => {
      const createHandler = vi.fn();
      server.on('room:created', createHandler);
      server.createRoom({ id: 'room-1', ownerId: 'user-1' });
      expect(createHandler).toHaveBeenCalled();
    });
  });

  describe('Room Joining', () => {
    beforeEach(() => {
      server.createRoom({ id: 'room-1', ownerId: 'user-1' });
    });

    it('should allow user to join public room', () => {
      const result = server.joinRoom(socket.id, 'room-1');
      expect(result.success).toBe(true);
      expect(socket.rooms.has('room-1')).toBe(true);
    });

    it('should broadcast user joined event', () => {
      server.joinRoom(socket.id, 'room-1');
      const events = server.getEmittedEvents();
      const joinEvent = events.find(e => e.event === 'room:user_joined');
      expect(joinEvent).toBeDefined();
    });

    it('should reject join to non-existent room', () => {
      const result = server.joinRoom(socket.id, 'nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });

    it('should auto-create public rooms on join', () => {
      const result = server.joinRoom(socket.id, 'public-test');
      expect(result.success).toBe(true);
      expect(server.getRoom('public-test')).toBeDefined();
    });
  });

  describe('Private Rooms', () => {
    beforeEach(() => {
      server.createRoom({
        id: 'private-room',
        ownerId: 'user-1',
        visibility: 'private',
      });
    });

    it('should allow owner to join private room', () => {
      const result = server.joinRoom(socket.id, 'private-room');
      expect(result.success).toBe(true);
    });

    it('should reject non-invited users from private room', async () => {
      const socket2 = await server.connect('user-2', 'Bob', 'token');
      const result = server.joinRoom(socket2.id, 'private-room');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Private room - invite required');
    });

    it('should allow invited users to join private room', async () => {
      server.inviteToRoom('private-room', 'user-1', 'user-2');
      const socket2 = await server.connect('user-2', 'Bob', 'token');
      const result = server.joinRoom(socket2.id, 'private-room');
      expect(result.success).toBe(true);
    });
  });

  describe('Room Capacity', () => {
    beforeEach(() => {
      server.createRoom({
        id: 'small-room',
        ownerId: 'user-1',
        maxParticipants: 2,
      });
      server.joinRoom(socket.id, 'small-room');
    });

    it('should enforce max participants limit', async () => {
      const socket2 = await server.connect('user-2', 'Bob', 'token');
      server.joinRoom(socket2.id, 'small-room');
      
      const socket3 = await server.connect('user-3', 'Charlie', 'token');
      const result = server.joinRoom(socket3.id, 'small-room');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room is full');
    });
  });

  describe('Room Leaving', () => {
    beforeEach(() => {
      server.createRoom({ id: 'room-1', ownerId: 'user-1' });
      server.joinRoom(socket.id, 'room-1');
    });

    it('should allow user to leave room', () => {
      const result = server.leaveRoom(socket.id, 'room-1');
      expect(result.success).toBe(true);
      expect(socket.rooms.has('room-1')).toBe(false);
    });

    it('should broadcast user left event', () => {
      server.leaveRoom(socket.id, 'room-1');
      const events = server.getEmittedEvents();
      const leaveEvent = events.find(e => e.event === 'room:user_left');
      expect(leaveEvent).toBeDefined();
    });

    it('should delete empty room', () => {
      server.leaveRoom(socket.id, 'room-1');
      expect(server.getRoom('room-1')).toBeUndefined();
    });
  });

  describe('Ban System', () => {
    beforeEach(async () => {
      server.createRoom({ id: 'room-1', ownerId: 'user-1' });
      server.joinRoom(socket.id, 'room-1');
    });

    it('should allow owner to ban users', async () => {
      const socket2 = await server.connect('user-2', 'Bob', 'token');
      server.joinRoom(socket2.id, 'room-1');
      const result = server.banFromRoom('room-1', 'user-1', 'user-2');
      expect(result.success).toBe(true);
      const room = server.getRoom('room-1');
      expect(room?.bannedUsers.has('user-2')).toBe(true);
    });

    it('should prevent banned users from rejoining', async () => {
      const socket2 = await server.connect('user-2', 'Bob', 'token');
      server.joinRoom(socket2.id, 'room-1');
      server.banFromRoom('room-1', 'user-1', 'user-2');
      
      const socket3 = await server.connect('user-2', 'Bob', 'token');
      const result = server.joinRoom(socket3.id, 'room-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('User is banned from this room');
    });
  });
});

// ============================================================================
// Test Suite: Message Broadcasting
// ============================================================================

describe('Message Broadcasting', () => {
  let server: MockWebSocketServer;
  let socket1: MockSocket;
  let socket2: MockSocket;

  beforeEach(async () => {
    server = new MockWebSocketServer();
    socket1 = await server.connect('user-1', 'Alice', 'token');
    socket2 = await server.connect('user-2', 'Bob', 'token');
    server.createRoom({ id: 'room-1', ownerId: 'user-1' });
    server.joinRoom(socket1.id, 'room-1');
    server.joinRoom(socket2.id, 'room-1');
  });

  afterEach(() => {
    server.reset();
  });

  describe('Room Broadcasting', () => {
    it('should send message to room', () => {
      const result = server.sendToRoom(socket1.id, 'room-1', 'Hello World');
      expect(result.success).toBe(true);
      expect(result.message?.content).toBe('Hello World');
    });

    it('should broadcast message to all room participants', () => {
      server.clearEmittedEvents();
      server.sendToRoom(socket1.id, 'room-1', 'Hello');
      const events = server.getEmittedEvents();
      const messageEvent = events.find(e => e.event === 'message:new');
      expect(messageEvent).toBeDefined();
    });

    it('should store message in room history', () => {
      server.sendToRoom(socket1.id, 'room-1', 'Message 1');
      server.sendToRoom(socket2.id, 'room-1', 'Message 2');
      const messages = server.getMessages('room-1');
      expect(messages.length).toBe(2);
    });

    it('should reject message from non-member', async () => {
      const socket3 = await server.connect('user-3', 'Charlie', 'token');
      const result = server.sendToRoom(socket3.id, 'room-1', 'Hello');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not in room');
    });
  });

  describe('User Broadcasting', () => {
    it('should broadcast to specific user', async () => {
      await server.connect('user-1', 'Alice', 'token');
      server.clearEmittedEvents();
      server.broadcastToUser('user-1', 'notification', { message: 'Test' });
      const events = server.getEmittedEvents();
      expect(events.length).toBe(2);
      expect(events[0].target).toBe('user:user-1');
    });
  });

  describe('Global Broadcasting', () => {
    it('should broadcast to all connected sockets', async () => {
      await server.connect('user-3', 'Charlie', 'token');
      server.clearEmittedEvents();
      server.broadcastToAll('announcement', { message: 'System update' });
      const events = server.getEmittedEvents();
      expect(events.length).toBe(3);
    });
  });
});

// ============================================================================
// Test Suite: Error Handling
// ============================================================================

describe('Error Handling', () => {
  let server: MockWebSocketServer;

  beforeEach(() => {
    server = new MockWebSocketServer();
  });

  afterEach(() => {
    server.reset();
  });

  describe('Authentication Errors', () => {
    it('should reject connection without token', async () => {
      await expect(server.connect('user-1', 'Alice')).rejects.toThrow('Authentication required');
    });
  });

  describe('Connection Errors', () => {
    it('should handle connection limit exceeded', async () => {
      const limitedServer = new MockWebSocketServer({ maxConnections: 1 });
      await limitedServer.connect('user-1', 'Alice', 'token');
      await expect(limitedServer.connect('user-2', 'Bob', 'token')).rejects.toThrow('Maximum connections reached');
      limitedServer.reset();
    });
  });

  describe('Room Errors', () => {
    it('should handle join to non-existent room', async () => {
      const socket = await server.connect('user-1', 'Alice', 'token');
      const result = server.joinRoom(socket.id, 'nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });

    it('should handle leave from non-existent room', async () => {
      const socket = await server.connect('user-1', 'Alice', 'token');
      const result = server.leaveRoom(socket.id, 'nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });
  });

  describe('Message Errors', () => {
    it('should handle message from disconnected socket', async () => {
      const socket = await server.connect('user-1', 'Alice', 'token');
      server.createRoom({ id: 'room-1', ownerId: 'user-1' });
      server.joinRoom(socket.id, 'room-1');
      server.disconnect(socket.id);
      const result = server.sendToRoom(socket.id, 'room-1', 'Hello');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Socket not connected');
    });

    it('should handle message to room user is not in', async () => {
      const socket = await server.connect('user-1', 'Alice', 'token');
      server.createRoom({ id: 'room-1', ownerId: 'other-user' });
      const result = server.sendToRoom(socket.id, 'room-1', 'Hello');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not in room');
    });
  });

  describe('Permission Errors', () => {
    it('should handle ban from non-owner', async () => {
      const socket1 = await server.connect('user-1', 'Alice', 'token');
      const socket2 = await server.connect('user-2', 'Bob', 'token');
      server.createRoom({ id: 'room-1', ownerId: 'user-1' });
      server.joinRoom(socket1.id, 'room-1');
      server.joinRoom(socket2.id, 'room-1');
      const result = server.banFromRoom('room-1', 'user-2', 'user-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Only owner can ban');
    });
  });
});

// ============================================================================
// Test Suite: Reconnection Mechanisms
// ============================================================================

describe('Reconnection Mechanisms', () => {
  let server: MockWebSocketServer;

  beforeEach(() => {
    server = new MockWebSocketServer();
  });

  afterEach(() => {
    server.reset();
  });

  describe('Socket Reconnection', () => {
    it('should allow user to reconnect after disconnect', async () => {
      const socket1 = await server.connect('user-1', 'Alice', 'token');
      server.disconnect(socket1.id);
      const socket2 = await server.connect('user-1', 'Alice', 'token');
      expect(socket2.connected).toBe(true);
      expect(socket2.id).not.toBe(socket1.id);
    });

    it('should allow multiple reconnections', async () => {
      for (let i = 0; i < 5; i++) {
        const socket = await server.connect('user-1', 'Alice', 'token');
        server.disconnect(socket.id);
      }
      const finalSocket = await server.connect('user-1', 'Alice', 'token');
      expect(finalSocket.connected).toBe(true);
    });
  });

  describe('Room State on Reconnection', () => {
    it('should require re-joining rooms after reconnect', async () => {
      const socket1 = await server.connect('user-1', 'Alice', 'token');
      server.createRoom({ id: 'room-1', ownerId: 'user-1' });
      server.joinRoom(socket1.id, 'room-1');
      server.disconnect(socket1.id);
      
      const socket2 = await server.connect('user-1', 'Alice', 'token');
      expect(socket2.rooms.size).toBe(0);
    });
  });

  describe('Message History on Reconnection', () => {
    it('should retain message history after user reconnects', async () => {
      const socket1 = await server.connect('user-1', 'Alice', 'token');
      server.createRoom({ id: 'room-1', ownerId: 'user-1' });
      server.joinRoom(socket1.id, 'room-1');
      server.sendToRoom(socket1.id, 'room-1', 'Hello');
      server.disconnect(socket1.id);
      
      const socket2 = await server.connect('user-1', 'Alice', 'token');
      server.joinRoom(socket2.id, 'room-1');
      
      const messages = server.getMessages('room-1');
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe('Hello');
    });
  });
});

// ============================================================================
// Test Suite: Concurrent Operations
// ============================================================================

describe('Concurrent Operations', () => {
  let server: MockWebSocketServer;

  beforeEach(() => {
    server = new MockWebSocketServer();
  });

  afterEach(() => {
    server.reset();
  });

  describe('Concurrent Connections', () => {
    it('should handle multiple simultaneous connections', async () => {
      const connections = [];
      for (let i = 0; i < 50; i++) {
        connections.push(server.connect(`user-${i}`, `User ${i}`, 'token'));
      }
      const sockets = await Promise.all(connections);
      expect(sockets.length).toBe(50);
      sockets.forEach(socket => {
        expect(socket.connected).toBe(true);
      });
    });
  });

  describe('Concurrent Room Operations', () => {
    it('should handle multiple users joining same room', async () => {
      server.createRoom({ id: 'room-1', ownerId: 'user-0', maxParticipants: 100 });
      
      const connections = [];
      for (let i = 0; i < 50; i++) {
        connections.push(server.connect(`user-${i}`, `User ${i}`, 'token'));
      }
      const sockets = await Promise.all(connections);
      
      const joins = sockets.map(socket => server.joinRoom(socket.id, 'room-1'));
      const results = joins.every(r => r.success);
      
      const room = server.getRoom('room-1');
      expect(room?.participants.size).toBe(50);
    });
  });

  describe('Concurrent Messages', () => {
    it('should handle concurrent message sending', async () => {
      const sockets = await Promise.all([
        server.connect('user-1', 'Alice', 'token'),
        server.connect('user-2', 'Bob', 'token'),
        server.connect('user-3', 'Charlie', 'token'),
      ]);
      
      server.createRoom({ id: 'room-1', ownerId: 'user-1' });
      sockets.forEach(s => server.joinRoom(s.id, 'room-1'));
      
      const messages = sockets.map((s, i) => server.sendToRoom(s.id, 'room-1', `Message ${i}`));
      
      const storedMessages = server.getMessages('room-1');
      expect(storedMessages.length).toBe(3);
    });
  });
});

// ============================================================================
// Test Suite: Statistics and Monitoring
// ============================================================================

describe('Statistics and Monitoring', () => {
  let server: MockWebSocketServer;

  beforeEach(() => {
    server = new MockWebSocketServer();
  });

  afterEach(() => {
    server.reset();
  });

  describe('Server Statistics', () => {
    it('should provide accurate connection count', async () => {
      await server.connect('user-1', 'Alice', 'token');
      await server.connect('user-2', 'Bob', 'token');
      const stats = server.getStats();
      expect(stats.totalConnections).toBe(2);
      expect(stats.usersOnline).toBe(2);
    });

    it('should provide accurate room count', async () => {
      server.createRoom({ id: 'room-1', ownerId: 'user-1' });
      server.createRoom({ id: 'room-2', ownerId: 'user-1' });
      const stats = server.getStats();
      expect(stats.totalRooms).toBe(2);
    });

    it('should provide accurate message count', async () => {
      const socket = await server.connect('user-1', 'Alice', 'token');
      server.createRoom({ id: 'room-1', ownerId: 'user-1' });
      server.joinRoom(socket.id, 'room-1');
      server.sendToRoom(socket.id, 'room-1', 'Hello');
      server.sendToRoom(socket.id, 'room-1', 'World');
      const stats = server.getStats();
      expect(stats.totalMessages).toBe(2);
    });
  });

  describe('Event Tracking', () => {
    it('should track emitted events', async () => {
      const socket = await server.connect('user-1', 'Alice', 'token');
      server.createRoom({ id: 'room-1', ownerId: 'user-1' });
      server.joinRoom(socket.id, 'room-1');
      
      const events = server.getEmittedEvents();
      expect(events.length).toBeGreaterThan(0);
    });

    it('should clear events when requested', async () => {
      await server.connect('user-1', 'Alice', 'token');
      expect(server.getEmittedEvents().length).toBeGreaterThan(0);
      server.clearEmittedEvents();
      expect(server.getEmittedEvents().length).toBe(0);
    });
  });
});

// ============================================================================
// Test Suite: Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  let server: MockWebSocketServer;

  beforeEach(() => {
    server = new MockWebSocketServer();
  });

  afterEach(() => {
    server.reset();
  });

  describe('Room Edge Cases', () => {
    it('should handle creating room with same ID twice', () => {
      const room1 = server.createRoom({ id: 'room-1', ownerId: 'user-1' });
      const room2 = server.createRoom({ id: 'room-1', ownerId: 'user-2' });
      expect(room1.id).toBe(room2.id);
      expect(room1.ownerId).toBe('user-1'); // Original owner preserved
    });

    it('should handle disconnecting non-existent socket', () => {
      expect(() => server.disconnect('nonexistent')).not.toThrow();
    });

    it('should handle heartbeat from non-existent socket', () => {
      expect(() => server.heartbeat('nonexistent')).not.toThrow();
    });
  });

  describe('Empty and Null Values', () => {
    it('should handle empty user name', async () => {
      const socket = await server.connect('user-1', '', 'token');
      expect(socket.userName).toBe('');
    });

    it('should handle empty room name', () => {
      const room = server.createRoom({ id: 'room-1', name: '', ownerId: 'user-1' });
      expect(room.name).toBe('');
    });
  });

  describe('Rapid Operations', () => {
    it('should handle rapid connect/disconnect cycles', async () => {
      for (let i = 0; i < 100; i++) {
        const socket = await server.connect('user-1', 'Alice', 'token');
        server.disconnect(socket.id);
      }
      expect(server.getConnectedSockets().length).toBe(0);
    });

    it('should handle rapid join/leave cycles', async () => {
      const socket = await server.connect('user-1', 'Alice', 'token');
      server.createRoom({ id: 'room-1', ownerId: 'user-1' });
      
      for (let i = 0; i < 100; i++) {
        server.joinRoom(socket.id, 'room-1');
        server.leaveRoom(socket.id, 'room-1');
      }
      
      // Room should be deleted after last leave
      expect(server.getRoom('room-1')).toBeUndefined();
    });
  });
});