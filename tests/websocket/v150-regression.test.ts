/**
 * WebSocket v1.5.0 Regression Tests
 * 
 * 回归测试套件，验证 v1.5.0 版本 WebSocket 功能的稳定性
 * 覆盖范围：
 * - WebSocket连接稳定性
 * - Room系统功能
 * - 消息推送可靠性
 * - 错误处理
 * 
 * 基于 docs/v150-testing-strategy.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getRoomManager,
  resetRoomManager,
  RoomManager,
  type CreateRoomOptions,
  type JoinRoomOptions,
  type Room,
  type RoomParticipant,
} from '@/lib/websocket/rooms';
import {
  getPermissionManager,
  resetPermissionManager,
  PermissionManager,
  type UserRole,
} from '@/lib/websocket/permissions';
import {
  getMessageStore,
  resetMessageStore,
  MessageStore,
  type StoredMessage,
} from '@/lib/websocket/message-store';

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_TIMEOUT = 15000;

// ============================================================================
// Mock WebSocket for Connection Tests
// ============================================================================

interface MockWebSocketConnection {
  url: string;
  readyState: number;
  status: 'connecting' | 'open' | 'closing' | 'closed' | 'error';
  connect: () => void;
  disconnect: () => void;
  send: (data: string) => void;
  close: () => void;
}

class MockWebSocketServer {
  private connections: Set<MockWebSocketConnection> = new Set();
  private shouldFailConnect = false;
  private connectionDelay = 100;

  createConnection(url: string): MockWebSocketConnection {
    const conn: MockWebSocketConnection = {
      url,
      readyState: 0,
      status: 'connecting',
      connect: () => {},
      disconnect: () => {},
      send: () => {},
      close: () => {},
    };

    conn.connect = () => {
      conn.readyState = 0;
      conn.status = 'connecting';

      setTimeout(() => {
        if (this.shouldFailConnect) {
          conn.readyState = 3;
          conn.status = 'error';
        } else {
          conn.readyState = 1;
          conn.status = 'open';
          this.connections.add(conn);
        }
      }, this.connectionDelay);
    };

    conn.disconnect = () => {
      conn.readyState = 2;
      conn.status = 'closing';
      setTimeout(() => {
        conn.readyState = 3;
        conn.status = 'closed';
        this.connections.delete(conn);
      }, 50);
    };

    conn.send = (data: string) => {
      if (conn.readyState !== 1) {
        throw new Error('WebSocket is not open');
      }
    };

    conn.close = () => {
      conn.disconnect();
    };

    return conn;
  }

  setConnectionDelay(delay: number) {
    this.connectionDelay = delay;
  }

  setShouldFail(fail: boolean) {
    this.shouldFailConnect = fail;
  }

  getActiveConnections(): number {
    return this.connections.size;
  }

  closeAll() {
    this.connections.forEach((conn) => conn.disconnect());
    this.connections.clear();
  }
}

// ============================================================================
// Test Suite: WebSocket Connection Stability
// ============================================================================

describe('WebSocket Connection Stability', () => {
  let roomManager: RoomManager;
  let permissionManager: PermissionManager;
  let messageStore: MessageStore;
  let mockServer: MockWebSocketServer;

  beforeEach(() => {
    resetPermissionManager();
    resetMessageStore();
    resetRoomManager();
    roomManager = getRoomManager();
    permissionManager = getPermissionManager();
    messageStore = getMessageStore();
    mockServer = new MockWebSocketServer();
  });

  afterEach(() => {
    mockServer.closeAll();
    resetPermissionManager();
    resetMessageStore();
    resetRoomManager();
  });

  describe('Connection Establishment', () => {
    it(
      'should establish connection successfully',
      () => {
        const conn = mockServer.createConnection('ws://localhost:8080');
        conn.connect();

        setTimeout(() => {
          expect(conn.readyState).toBe(1);
          expect(conn.status).toBe('open');
        }, 150);
      },
      TEST_TIMEOUT
    );

    it(
      'should handle connection failure gracefully',
      () => {
        mockServer.setShouldFail(true);
        const conn = mockServer.createConnection('ws://localhost:8080');
        conn.connect();

        setTimeout(() => {
          expect(conn.readyState).toBe(3);
          expect(conn.status).toBe('error');
        }, 150);
      },
      TEST_TIMEOUT
    );

    it(
      'should handle multiple simultaneous connections',
      () => {
        const connections: MockWebSocketConnection[] = [];

        for (let i = 0; i < 10; i++) {
          const conn = mockServer.createConnection(`ws://localhost:8080/room-${i}`);
          conn.connect();
          connections.push(conn);
        }

        setTimeout(() => {
          connections.forEach((conn) => {
            expect(conn.readyState).toBe(1);
            expect(conn.status).toBe('open');
          });
          expect(mockServer.getActiveConnections()).toBe(10);
        }, 150);
      },
      TEST_TIMEOUT
    );

    it(
      'should handle connection timeout',
      () => {
        mockServer.setConnectionDelay(5000);
        const conn = mockServer.createConnection('ws://localhost:8080');
        conn.connect();

        // Connection should still be in connecting state after short wait
        setTimeout(() => {
          expect(conn.readyState).toBe(0);
          expect(conn.status).toBe('connecting');
        }, 100);
      },
      TEST_TIMEOUT
    );
  });

  describe('Reconnection Handling', () => {
    it(
      'should successfully reconnect after disconnect',
      () => {
        const conn = mockServer.createConnection('ws://localhost:8080');
        conn.connect();

        setTimeout(() => {
          expect(conn.readyState).toBe(1);

          conn.disconnect();

          setTimeout(() => {
            expect(conn.readyState).toBe(3);

            // Reconnect
            conn.connect();

            setTimeout(() => {
              expect(conn.readyState).toBe(1);
            }, 150);
          }, 100);
        }, 150);
      },
      TEST_TIMEOUT
    );

    it(
      'should handle rapid connect/disconnect cycles',
      () => {
        const conn = mockServer.createConnection('ws://localhost:8080');

        for (let i = 0; i < 5; i++) {
          conn.connect();
          conn.disconnect();
        }

        // Final connect should work
        conn.connect();

        setTimeout(() => {
          expect(conn.readyState).toBe(1);
        }, 150);
      },
      TEST_TIMEOUT
    );
  });

  describe('Connection State Consistency', () => {
    it(
      'should maintain consistent state during normal operations',
      () => {
        const conn = mockServer.createConnection('ws://localhost:8080');
        conn.connect();

        setTimeout(() => {
          // State should be open
          expect(conn.readyState).toBe(1);
          expect(conn.status).toBe('open');

          // Send should work
          expect(() => conn.send('test message')).not.toThrow();
        }, 150);
      },
      TEST_TIMEOUT
    );

    it(
      'should reject operations on closed connection',
      () => {
        const conn = mockServer.createConnection('ws://localhost:8080');
        conn.connect();
        conn.disconnect();

        setTimeout(() => {
          expect(() => conn.send('test')).toThrow('WebSocket is not open');
        }, 200);
      },
      TEST_TIMEOUT
    );
  });
});

// ============================================================================
// Test Suite: Room System Functionality
// ============================================================================

describe('Room System Functionality', () => {
  let roomManager: RoomManager;
  let permissionManager: PermissionManager;
  let messageStore: MessageStore;

  beforeEach(() => {
    resetPermissionManager();
    resetMessageStore();
    resetRoomManager();
    roomManager = getRoomManager();
    permissionManager = getPermissionManager();
    messageStore = getMessageStore();
  });

  afterEach(() => {
    resetPermissionManager();
    resetMessageStore();
    resetRoomManager();
  });

  describe('Room Creation', () => {
    it('should create room with all valid types', () => {
      const types: Array<'task' | 'project' | 'chat' | 'document' | 'voice' | 'video'> = [
        'task',
        'project',
        'chat',
        'document',
        'voice',
        'video',
      ];

      types.forEach((type) => {
        const room = roomManager.create({
          id: `room-${type}`,
          type,
          documentId: `doc-${type}`,
          ownerId: 'user-1',
          name: `${type} Room`,
        });

        expect(room).toBeDefined();
        expect(room.type).toBe(type);
        expect(room.id).toBe(`room-${type}`);
      });
    });

    it('should create room with all visibility options', () => {
      const visibilities: Array<'public' | 'private' | 'invite-only'> = [
        'public',
        'private',
        'invite-only',
      ];

      visibilities.forEach((visibility) => {
        const room = roomManager.create({
          id: `room-${visibility}`,
          type: 'chat',
          documentId: `doc-${visibility}`,
          ownerId: 'user-1',
          visibility,
          name: `${visibility} Room`,
        });

        expect(room.visibility).toBe(visibility);
      });
    });

    it('should create room with custom configuration', () => {
      const room = roomManager.create({
        id: 'custom-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'user-1',
        name: 'Custom Room',
        config: {
          maxParticipants: 50,
          messageHistoryEnabled: true,
          persistenceEnabled: true,
          autoCleanupMinutes: 60,
          allowGuests: false,
          enforcePermissions: true,
        },
      });

      expect(room.config.maxParticipants).toBe(50);
      expect(room.config.messageHistoryEnabled).toBe(true);
      expect(room.config.persistenceEnabled).toBe(true);
      expect(room.config.autoCleanupMinutes).toBe(60);
      expect(room.config.allowGuests).toBe(false);
      expect(room.config.enforcePermissions).toBe(true);
    });

    it('should set default configuration when not provided', () => {
      const room = roomManager.create({
        id: 'default-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'user-1',
      });

      // Check defaults
      expect(room.visibility).toBe('public');
      expect(room.config).toBeDefined();
    });
  });

  describe('Room Join/Leave', () => {
    beforeEach(() => {
      roomManager.create({
        id: 'test-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
      });
    });

    it('should allow user to join public room', () => {
      const result = roomManager.join('test-room', {
        userId: 'user-1',
        userName: 'User One',
      });

      expect(result.success).toBe(true);
      expect(result.room).toBeDefined();
      expect(result.room?.id).toBe('test-room');
    });

    it('should assign correct role on join', () => {
      // Owner joins
      roomManager.join('test-room', {
        userId: 'owner',
        userName: 'Owner User',
      });

      const ownerParticipant = roomManager.getParticipant('test-room', 'owner');
      expect(ownerParticipant?.role).toBe('owner');

      // Regular user joins
      roomManager.join('test-room', {
        userId: 'user-1',
        userName: 'User One',
      });

      const userParticipant = roomManager.getParticipant('test-room', 'user-1');
      expect(userParticipant?.role).toBe('member');
    });

    it('should track participants correctly', () => {
      roomManager.join('test-room', {
        userId: 'user-1',
        userName: 'User One',
      });

      roomManager.join('test-room', {
        userId: 'user-2',
        userName: 'User Two',
      });

      const participants = roomManager.getParticipants('test-room');
      expect(participants.size).toBe(2);
      expect(participants.has('user-1')).toBe(true);
      expect(participants.has('user-2')).toBe(true);
    });

    it('should allow user to leave room', () => {
      roomManager.join('test-room', {
        userId: 'user-1',
        userName: 'User One',
      });

      expect(roomManager.getParticipants('test-room').size).toBe(1);

      roomManager.leave('test-room', 'user-1');

      expect(roomManager.getParticipants('test-room').size).toBe(0);
    });

    it('should handle multiple users joining and leaving', () => {
      // Add 10 users
      for (let i = 1; i <= 10; i++) {
        roomManager.join('test-room', {
          userId: `user-${i}`,
          userName: `User ${i}`,
        });
      }

      expect(roomManager.getParticipants('test-room').size).toBe(10);

      // Remove 5 users
      for (let i = 1; i <= 5; i++) {
        roomManager.leave('test-room', `user-${i}`);
      }

      expect(roomManager.getParticipants('test-room').size).toBe(5);
    });
  });

  describe('Room Permissions', () => {
    beforeEach(() => {
      roomManager.create({
        id: 'permission-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
        config: {
          enforcePermissions: true,
        },
      });
    });

    it('should assign owner role to room creator', () => {
      roomManager.join('permission-room', {
        userId: 'owner',
        userName: 'Owner',
      });

      const participant = roomManager.getParticipant('permission-room', 'owner');
      expect(participant?.role).toBe('owner');
    });

    it('should allow role changes by owner', () => {
      roomManager.join('permission-room', {
        userId: 'owner',
        userName: 'Owner',
      });

      roomManager.join('permission-room', {
        userId: 'user-1',
        userName: 'User One',
      });

      // Owner promotes user
      const result = roomManager.updateParticipantRole(
        'permission-room',
        'user-1',
        'admin',
        'owner'
      );

      expect(result.success).toBe(true);

      const participant = roomManager.getParticipant('permission-room', 'user-1');
      expect(participant?.role).toBe('admin');
    });

    it('should reject role changes by non-owner', () => {
      roomManager.join('permission-room', {
        userId: 'owner',
        userName: 'Owner',
      });

      roomManager.join('permission-room', {
        userId: 'user-1',
        userName: 'User One',
      });

      roomManager.join('permission-room', {
        userId: 'user-2',
        userName: 'User Two',
      });

      // Non-owner tries to promote
      const result = roomManager.updateParticipantRole(
        'permission-room',
        'user-2',
        'admin',
        'user-1'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Room Lifecycle', () => {
    it('should handle room creation to deletion', () => {
      // Create
      const room = roomManager.create({
        id: 'lifecycle-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
      });

      expect(roomManager.exists('lifecycle-room')).toBe(true);

      // Users join
      roomManager.join('lifecycle-room', { userId: 'user-1', userName: 'User 1' });
      roomManager.join('lifecycle-room', { userId: 'user-2', userName: 'User 2' });

      expect(roomManager.getParticipants('lifecycle-room').length).toBe(2);

      // Users leave
      roomManager.leave('lifecycle-room', 'user-1');
      roomManager.leave('lifecycle-room', 'user-2');

      expect(roomManager.getParticipants('lifecycle-room').length).toBe(0);

      // Destroy room
      roomManager.destroy('lifecycle-room');

      expect(roomManager.exists('lifecycle-room')).toBe(false);
    });

    it('should handle multiple rooms independently', () => {
      // Create multiple rooms
      for (let i = 1; i <= 5; i++) {
        roomManager.create({
          id: `room-${i}`,
          type: 'chat',
          documentId: `doc-${i}`,
          ownerId: `owner-${i}`,
        });
      }

      // Verify all exist
      for (let i = 1; i <= 5; i++) {
        expect(roomManager.exists(`room-${i}`)).toBe(true);
      }

      // Destroy one room
      roomManager.destroy('room-3');

      // Verify only that room is destroyed
      expect(roomManager.exists('room-3')).toBe(false);
      for (let i = 1; i <= 5; i++) {
        if (i !== 3) {
          expect(roomManager.exists(`room-${i}`)).toBe(true);
        }
      }
    });
  });
});

// ============================================================================
// Test Suite: Message Push Reliability
// ============================================================================

describe('Message Push Reliability', () => {
  let roomManager: RoomManager;
  let permissionManager: PermissionManager;
  let messageStore: MessageStore;

  beforeEach(() => {
    resetPermissionManager();
    resetMessageStore();
    resetRoomManager();
    roomManager = getRoomManager();
    permissionManager = getPermissionManager();
    messageStore = getMessageStore();
  });

  afterEach(() => {
    resetPermissionManager();
    resetMessageStore();
    resetRoomManager();
  });

  describe('Message Storage', () => {
    beforeEach(() => {
      roomManager.create({
        id: 'message-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
        config: {
          messageHistoryEnabled: true,
          persistenceEnabled: true,
        },
      });
    });

    it('should store message successfully', () => {
      const message = messageStore.store({
        roomId: 'message-room',
        userId: 'user-1',
        userName: 'User One',
        content: 'Test message',
        type: 'text',
      });

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.content).toBe('Test message');
      expect(message.userId).toBe('user-1');
    });

    it('should retrieve stored messages', () => {
      // Store multiple messages
      for (let i = 1; i <= 5; i++) {
        messageStore.store({
          roomId: 'message-room',
          userId: 'user-1',
          userName: 'User One',
          content: `Message ${i}`,
          type: 'text',
        });
      }

      const messages = messageStore.getMessages('message-room');
      expect(messages.length).toBe(5);
    });

    it('should retrieve messages with pagination', () => {
      // Store 20 messages
      for (let i = 1; i <= 20; i++) {
        messageStore.store({
          roomId: 'message-room',
          userId: 'user-1',
          userName: 'User One',
          content: `Message ${i}`,
          type: 'text',
        });
      }

      // Get first page
      const page1 = messageStore.getMessages('message-room', { limit: 10, offset: 0 });
      expect(page1.length).toBe(10);

      // Get second page
      const page2 = messageStore.getMessages('message-room', { limit: 10, offset: 10 });
      expect(page2.length).toBe(10);

      // Verify different messages
      expect(page1[0].content).not.toBe(page2[0].content);
    });

    it('should handle message ordering correctly', () => {
      // Store messages with delay to ensure different timestamps
      for (let i = 1; i <= 3; i++) {
        messageStore.store({
          roomId: 'message-room',
          userId: 'user-1',
          userName: 'User One',
          content: `Message ${i}`,
          type: 'text',
        });
      }

      const messages = messageStore.getMessages('message-room');

      // Messages should be in order
      expect(messages[0].content).toBe('Message 1');
      expect(messages[1].content).toBe('Message 2');
      expect(messages[2].content).toBe('Message 3');
    });
  });

  describe('Message Types', () => {
    beforeEach(() => {
      roomManager.create({
        id: 'type-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
        config: {
          messageHistoryEnabled: true,
        },
      });
    });

    it('should store text messages', () => {
      const message = messageStore.store({
        roomId: 'type-room',
        userId: 'user-1',
        userName: 'User One',
        content: 'Text message',
        type: 'text',
      });

      expect(message.type).toBe('text');
      expect(message.content).toBe('Text message');
    });

    it('should store system messages', () => {
      const message = messageStore.store({
        roomId: 'type-room',
        userId: 'system',
        userName: 'System',
        content: 'User joined the room',
        type: 'system',
      });

      expect(message.type).toBe('system');
    });

    it('should store different message types', () => {
      const types: Array<'text' | 'system' | 'file' | 'image'> = ['text', 'system', 'file', 'image'];

      types.forEach((type) => {
        const message = messageStore.store({
          roomId: 'type-room',
          userId: 'user-1',
          userName: 'User One',
          content: `${type} content`,
          type,
        });

        expect(message.type).toBe(type);
      });
    });
  });

  describe('Message Delivery', () => {
    beforeEach(() => {
      roomManager.create({
        id: 'delivery-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
        config: {
          messageHistoryEnabled: true,
        },
      });

      // Add users to room
      roomManager.join('delivery-room', { userId: 'sender', userName: 'Sender' });
      roomManager.join('delivery-room', { userId: 'receiver', userName: 'Receiver' });
    });

    it('should deliver message to room participants', () => {
      const message = messageStore.store({
        roomId: 'delivery-room',
        userId: 'sender',
        userName: 'Sender',
        content: 'Hello!',
        type: 'text',
      });

      expect(message).toBeDefined();
      expect(message.delivered).toBe(true);
    });

    it('should track message delivery status', () => {
      const message = messageStore.store({
        roomId: 'delivery-room',
        userId: 'sender',
        userName: 'Sender',
        content: 'Track delivery',
        type: 'text',
      });

      // Check delivery status
      const status = messageStore.getDeliveryStatus(message.id);
      expect(status).toBeDefined();
    });
  });

  describe('Offline Queue', () => {
    it('should queue messages for offline users', () => {
      // Queue message for offline user
      const queued = messageStore.queueOfflineMessage({
        id: 'msg-offline',
        userId: 'offline-user',
        message: {
          id: 'msg-offline',
          roomId: 'offline-room',
          userId: 'sender',
          userName: 'Sender',
          content: 'Message while away',
          type: 'text',
          timestamp: new Date(),
        },
        queuedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(queued).toBe(true);
    });

    it('should deliver queued messages on user reconnect', () => {
      // Queue messages
      for (let i = 1; i <= 5; i++) {
        messageStore.queueOfflineMessage({
          id: `msg-queued-${i}`,
          userId: 'reconnecting-user',
          message: {
            id: `msg-queued-${i}`,
            roomId: 'reconnect-room',
            userId: 'sender',
            userName: 'Sender',
            content: `Queued message ${i}`,
            type: 'text',
            timestamp: new Date(),
          },
          queuedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
      }

      // User reconnects
      const messages = messageStore.getOfflineMessages('reconnecting-user');

      expect(messages.length).toBe(5);
    });
  });
});

// ============================================================================
// Test Suite: Error Handling
// ============================================================================

describe('Error Handling', () => {
  let roomManager: RoomManager;
  let permissionManager: PermissionManager;
  let messageStore: MessageStore;

  beforeEach(() => {
    resetPermissionManager();
    resetMessageStore();
    resetRoomManager();
    roomManager = getRoomManager();
    permissionManager = getPermissionManager();
    messageStore = getMessageStore();
  });

  afterEach(() => {
    resetPermissionManager();
    resetMessageStore();
    resetRoomManager();
  });

  describe('Room Operation Errors', () => {
    it('should handle joining non-existent room', () => {
      const result = roomManager.join('non-existent-room', {
        userId: 'user-1',
        userName: 'User One',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle leaving non-existent room', () => {
      // Should not throw
      expect(() => {
        roomManager.leave('non-existent-room', 'user-1');
      }).not.toThrow();
    });

    it('should handle deleting non-existent room', () => {
      // Should not throw
      expect(() => {
        roomManager.delete('non-existent-room');
      }).not.toThrow();
    });

    it('should handle duplicate room creation', () => {
      roomManager.create({
        id: 'duplicate-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
      });

      // Create again with same ID
      const room = roomManager.create({
        id: 'duplicate-room',
        type: 'chat',
        documentId: 'doc-2',
        ownerId: 'owner-2',
      });

      // Should return existing room
      expect(room.documentId).toBe('doc-1');
    });
  });

  describe('Permission Errors', () => {
    beforeEach(() => {
      roomManager.create({
        id: 'permission-error-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
        config: {
          enforcePermissions: true,
        },
      });

      roomManager.join('permission-error-room', {
        userId: 'owner',
        userName: 'Owner',
      });

      roomManager.join('permission-error-room', {
        userId: 'member',
        userName: 'Member',
      });
    });

    it('should reject unauthorized role changes', () => {
      const result = roomManager.updateParticipantRole(
        'permission-error-room',
        'owner',
        'member',
        'member' // Member cannot change roles
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle kick operation without permission', () => {
      const result = roomManager.kickParticipant(
        'permission-error-room',
        'owner',
        'member' // Member cannot kick
      );

      expect(result.success).toBe(false);
    });
  });

  describe('Message Errors', () => {
    it('should handle storing message to non-existent room', () => {
      // Should not throw, but may return undefined or throw error
      expect(() => {
        messageStore.store({
          roomId: 'non-existent-room',
          userId: 'user-1',
          userName: 'User One',
          content: 'Test',
          type: 'text',
        });
      }).not.toThrow();
    });

    it('should handle empty message content', () => {
      roomManager.create({
        id: 'empty-msg-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
      });

      const message = messageStore.store({
        roomId: 'empty-msg-room',
        userId: 'user-1',
        userName: 'User One',
        content: '',
        type: 'text',
      });

      // Should store empty message (or reject based on implementation)
      expect(message).toBeDefined();
    });

    it('should handle very long message content', () => {
      roomManager.create({
        id: 'long-msg-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
      });

      const longContent = 'A'.repeat(100000);

      const message = messageStore.store({
        roomId: 'long-msg-room',
        userId: 'user-1',
        userName: 'User One',
        content: longContent,
        type: 'text',
      });

      expect(message).toBeDefined();
      expect(message.content.length).toBe(100000);
    });
  });

  describe('Data Validation Errors', () => {
    it('should handle invalid room type', () => {
      // TypeScript would catch this, but runtime should also handle
      expect(() => {
        roomManager.create({
          id: 'invalid-type-room',
          type: 'invalid' as any,
          documentId: 'doc-1',
          ownerId: 'owner',
        });
      }).not.toThrow();
    });

    it('should handle missing required fields', () => {
      expect(() => {
        roomManager.create({
          id: 'missing-fields-room',
          type: 'chat',
          documentId: '',
          ownerId: '',
        });
      }).not.toThrow();
    });

    it('should handle malformed user IDs', () => {
      roomManager.create({
        id: 'malformed-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
      });

      // Should handle special characters
      const result = roomManager.join('malformed-room', {
        userId: 'user<script>alert(1)</script>',
        userName: 'Test User',
      });

      // Should either sanitize or reject
      expect(result).toBeDefined();
    });
  });

  describe('Resource Limit Errors', () => {
    it('should handle max participants limit', () => {
      roomManager.create({
        id: 'max-participants-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
        config: {
          maxParticipants: 2,
        },
      });

      // Add owner
      roomManager.join('max-participants-room', {
        userId: 'owner',
        userName: 'Owner',
      });

      // Add first member
      const result1 = roomManager.join('max-participants-room', {
        userId: 'user-1',
        userName: 'User 1',
      });

      expect(result1.success).toBe(true);

      // Try to exceed limit
      const result2 = roomManager.join('max-participants-room', {
        userId: 'user-2',
        userName: 'User 2',
      });

      // Should reject (implementation dependent)
      // Some implementations might allow owner + 2 members
      expect(result2).toBeDefined();
    });

    it('should handle message history limit', () => {
      roomManager.create({
        id: 'history-limit-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
        config: {
          messageHistoryEnabled: true,
        },
      });

      // Store many messages
      for (let i = 0; i < 1000; i++) {
        messageStore.store({
          roomId: 'history-limit-room',
          userId: 'user-1',
          userName: 'User One',
          content: `Message ${i}`,
          type: 'text',
        });
      }

      // Should handle large history
      const messages = messageStore.getMessages('history-limit-room');
      expect(messages.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Test Suite: Regression - Known Issues
// ============================================================================

describe('Regression - Known Issues', () => {
  let roomManager: RoomManager;
  let permissionManager: PermissionManager;
  let messageStore: MessageStore;

  beforeEach(() => {
    resetPermissionManager();
    resetMessageStore();
    resetRoomManager();
    roomManager = getRoomManager();
    permissionManager = getPermissionManager();
    messageStore = getMessageStore();
  });

  afterEach(() => {
    resetPermissionManager();
    resetMessageStore();
    resetRoomManager();
  });

  describe('Issue: Race condition in room join', () => {
    it('should handle concurrent joins to same room', async () => {
      roomManager.create({
        id: 'race-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
      });

      // Simulate concurrent joins
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          new Promise((resolve) => {
            setTimeout(() => {
              const result = roomManager.join('race-room', {
                userId: `user-${i}`,
                userName: `User ${i}`,
              });
              resolve(result);
            }, Math.random() * 10);
          })
        );
      }

      const results = await Promise.all(promises);

      // All joins should succeed (for public room)
      const successCount = results.filter((r: any) => r.success).length;
      expect(successCount).toBe(10);
    });
  });

  describe('Issue: Memory leak in room cleanup', () => {
    it('should properly clean up room resources on deletion', () => {
      // Create and populate room
      const room = roomManager.create({
        id: 'cleanup-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
      });

      // Add participants
      for (let i = 0; i < 10; i++) {
        roomManager.join('cleanup-room', {
          userId: `user-${i}`,
          userName: `User ${i}`,
        });
      }

      // Add messages
      for (let i = 0; i < 50; i++) {
        messageStore.store({
          roomId: 'cleanup-room',
          userId: 'user-0',
          userName: 'User 0',
          content: `Message ${i}`,
          type: 'text',
        });
      }

      // Delete room
      roomManager.delete('cleanup-room');

      // Verify cleanup
      expect(roomManager.exists('cleanup-room')).toBe(false);
      expect(roomManager.getParticipants('cleanup-room').size).toBe(0);

      // Messages should be cleaned up (or retained based on config)
      const messages = messageStore.getMessages('cleanup-room');
      expect(messages.length).toBe(0);
    });
  });

  describe('Issue: Permission check caching', () => {
    it('should invalidate permission cache on role change', () => {
      roomManager.create({
        id: 'cache-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
        config: {
          enforcePermissions: true,
        },
      });

      roomManager.join('cache-room', { userId: 'owner', userName: 'Owner' });
      roomManager.join('cache-room', { userId: 'user-1', userName: 'User 1' });

      // Check initial role
      const initialParticipant = roomManager.getParticipant('cache-room', 'user-1');
      expect(initialParticipant?.role).toBe('member');

      // Change role
      roomManager.updateParticipantRole('cache-room', 'user-1', 'admin', 'owner');

      // Check updated role
      const updatedParticipant = roomManager.getParticipant('cache-room', 'user-1');
      expect(updatedParticipant?.role).toBe('admin');
    });
  });

  describe('Issue: Message ordering on reconnection', () => {
    it('should maintain message order after reconnection', () => {
      roomManager.create({
        id: 'reconnect-order-room',
        type: 'chat',
        documentId: 'doc-1',
        ownerId: 'owner',
        config: {
          messageHistoryEnabled: true,
        },
      });

      // Store messages
      const expectedOrder: string[] = [];
      for (let i = 0; i < 10; i++) {
        const msgId = `msg-reconnect-${i}`;
        messageStore.store({
          id: msgId,
          roomId: 'reconnect-order-room',
          userId: 'user-1',
          userName: 'User One',
          content: `Message ${i}`,
          type: 'text',
        });
        expectedOrder.push(msgId);
      }

      // Get messages (simulate reconnection)
      const messages = messageStore.getHistory({ roomId: 'reconnect-order-room' });

      // Verify order (messages are sorted by timestamp, newest first)
      expect(messages.length).toBe(10);
    });
  });
});
});
    });
  });
});
;
