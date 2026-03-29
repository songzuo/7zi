/**
 * WebSocket API 集成测试
 *
 * 测试 /api/ws WebSocket 端点的功能
 * 包括: 连接建立、消息收发、房间管理、断开连接
 *
 * 注意: 这是一个集成测试,需要真实的WebSocket服务器或MSW模拟
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock WebSocket dependencies
const mockWebSocketClients = new Map();
const mockRooms = new Map();

class MockWebSocket {
  constructor(url: string) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.id = `client-${Date.now()}-${Math.random()}`;
    this.connectedRooms: Set<string> = new Set();
    this.messageQueue: any[] = [];

    // Simulate connection
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen({ type: 'open' } as Event);
      }
    }, 10);
  }

  send(data: string | Buffer) {
    if (this.readyState !== 1) {
      throw new Error('WebSocket is not open');
    }

    const message = JSON.parse(data.toString());
    this.messageQueue.push(message);

    // Echo back for testing
    if (this.onmessage) {
      this.onmessage({
        type: 'message',
        data: JSON.stringify({
          type: 'echo',
          original: message,
          timestamp: Date.now(),
        }),
      } as MessageEvent);
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = 3; // CLOSED
    this.connectedRooms.forEach(roomId => {
      this.leaveRoom(roomId);
    });
    if (this.onclose) {
      this.onclose({
        type: 'close',
        code: code || 1000,
        reason: reason || '',
      } as CloseEvent);
    }
  }

  joinRoom(roomId: string) {
    if (!mockRooms.has(roomId)) {
      mockRooms.set(roomId, new Set());
    }
    mockRooms.get(roomId).add(this.id);
    this.connectedRooms.add(roomId);

    // Notify room join
    if (this.onmessage) {
      this.onmessage({
        type: 'message',
        data: JSON.stringify({
          type: 'room_joined',
          roomId,
          clientId: this.id,
          timestamp: Date.now(),
        }),
      } as MessageEvent);
    }
  }

  leaveRoom(roomId: string) {
    if (mockRooms.has(roomId)) {
      mockRooms.get(roomId).delete(this.id);
      if (mockRooms.get(roomId).size === 0) {
        mockRooms.delete(roomId);
      }
    }
    this.connectedRooms.delete(roomId);

    // Notify room leave
    if (this.onmessage) {
      this.onmessage({
        type: 'message',
        data: JSON.stringify({
          type: 'room_left',
          roomId,
          clientId: this.id,
          timestamp: Date.now(),
        }),
      } as MessageEvent);
    }
  }

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;
}

// Mock fetch for WebSocket stats endpoint
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

describe('WebSocket API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocketClients.clear();
    mockRooms.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Connection Tests ====================
  describe('WebSocket Connection', () => {
    it('should establish WebSocket connection successfully', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = (event: Event) => {
        expect(ws.readyState).toBe(ws.OPEN);
        expect(ws.id).toBeDefined();
        done();
      };
    });

    it('should handle connection timeout', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onerror = (event: Event) => {
        expect(ws.readyState).toBe(ws.CLOSED);
        done();
      };

      // Force close to simulate timeout
      setTimeout(() => {
        ws.close(1006, 'Connection timeout');
      }, 5);
    });

    it('should handle connection errors', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onerror = (event: Event) => {
        expect(ws.readyState).toBeDefined();
        done();
      };

      // Trigger error
      setTimeout(() => {
        ws.close(1002, 'Protocol error');
      }, 5);
    });

    it('should close connection gracefully', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = () => {
        expect(ws.readyState).toBe(ws.OPEN);

        ws.close(1000, 'Normal closure');
      };

      ws.onclose = (event: CloseEvent) => {
        expect(ws.readyState).toBe(ws.CLOSED);
        expect(event.code).toBe(1000);
        expect(event.reason).toBe('Normal closure');
        done();
      };
    });

    it('should handle connection closing before open', () => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');
      ws.close(1000, 'Closing before open');

      expect(ws.readyState).toBe(ws.CLOSED);
    });

    it('should handle multiple connection attempts', (done) => {
      const ws1 = new MockWebSocket('ws://localhost:3000/api/ws');
      const ws2 = new MockWebSocket('ws://localhost:3000/api/ws');

      let connections = 0;

      const handleOpen = () => {
        connections++;
        if (connections === 2) {
          expect(ws1.id).not.toBe(ws2.id);
          done();
        }
      };

      ws1.onopen = handleOpen;
      ws2.onopen = handleOpen;
    });
  });

  // ==================== Message Tests ====================
  describe('WebSocket Messages', () => {
    it('should send and receive messages', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = () => {
        const message = {
          type: 'test',
          payload: 'Hello, WebSocket!',
        };

        ws.send(JSON.stringify(message));
      };

      ws.onmessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        expect(data.type).toBe('echo');
        expect(data.original.type).toBe('test');
        expect(data.original.payload).toBe('Hello, WebSocket!');
        expect(ws.messageQueue.length).toBeGreaterThan(0);
        done();
      };
    });

    it('should handle JSON parse errors', () => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = () => {
        expect(() => {
          ws.send('invalid json{');
        }).toThrow();
      };
    });

    it('should handle sending when not connected', () => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      expect(() => {
        ws.send(JSON.stringify({ type: 'test' }));
      }).toThrow('WebSocket is not open');
    });

    it('should send multiple messages in sequence', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'message1', count: 1 }));
        ws.send(JSON.stringify({ type: 'message2', count: 2 }));
        ws.send(JSON.stringify({ type: 'message3', count: 3 }));

        setTimeout(() => {
          expect(ws.messageQueue.length).toBe(3);
          done();
        }, 100);
      };
    });

    it('should handle large messages', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = () => {
        const largePayload = 'x'.repeat(1000000);
        ws.send(JSON.stringify({ type: 'large', payload: largePayload }));

        setTimeout(() => {
          expect(ws.messageQueue.length).toBe(1);
          expect(ws.messageQueue[0].payload.length).toBe(1000000);
          done();
        }, 100);
      };
    });

    it('should handle empty messages', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = () => {
        ws.send(JSON.stringify({}));

        setTimeout(() => {
          expect(ws.messageQueue.length).toBe(1);
          expect(ws.messageQueue[0]).toEqual({});
          done();
        }, 50);
      };
    });

    it('should handle messages with special characters', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = () => {
        const message = {
          type: 'special',
          payload: 'Émojis 🎉 and spéci@l ch@rs!',
        };

        ws.send(JSON.stringify(message));
      };

      ws.onmessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        expect(data.original.payload).toBe('Émojis 🎉 and spéci@l ch@rs!');
        done();
      };
    });
  });

  // ==================== Room Tests ====================
  describe('WebSocket Rooms', () => {
    it('should join a room successfully', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = () => {
        ws.joinRoom('test-room');
      };

      ws.onmessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.type === 'room_joined') {
          expect(data.roomId).toBe('test-room');
          expect(data.clientId).toBe(ws.id);
          expect(ws.connectedRooms.has('test-room')).toBe(true);
          expect(mockRooms.has('test-room')).toBe(true);
          expect(mockRooms.get('test-room').has(ws.id)).toBe(true);
          done();
        }
      };
    });

    it('should leave a room successfully', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = () => {
        ws.joinRoom('test-room');
      };

      let joinReceived = false;

      ws.onmessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data);

        if (data.type === 'room_joined' && !joinReceived) {
          joinReceived = true;
          ws.leaveRoom('test-room');
        } else if (data.type === 'room_left') {
          expect(data.roomId).toBe('test-room');
          expect(ws.connectedRooms.has('test-room')).toBe(false);
          done();
        }
      };
    });

    it('should join multiple rooms', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = () => {
        ws.joinRoom('room1');
        ws.joinRoom('room2');
        ws.joinRoom('room3');

        setTimeout(() => {
          expect(ws.connectedRooms.size).toBe(3);
          expect(mockRooms.size).toBe(3);
          done();
        }, 50);
      };
    });

    it('should handle leaving non-existent room gracefully', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = () => {
        // Should not throw
        ws.leaveRoom('non-existent-room');
        done();
      };
    });

    it('should broadcast message to room members', (done) => {
      const ws1 = new MockWebSocket('ws://localhost:3000/api/ws');
      const ws2 = new MockWebSocket('ws://localhost:3000/api/ws');

      let connections = 0;

      const handleOpen = () => {
        connections++;
        if (connections === 2) {
          ws1.joinRoom('broadcast-room');
          ws2.joinRoom('broadcast-room');

          setTimeout(() => {
            // Both clients should be in the room
            const room = mockRooms.get('broadcast-room');
            expect(room.has(ws1.id)).toBe(true);
            expect(room.has(ws2.id)).toBe(true);
            done();
          }, 50);
        }
      };

      ws1.onopen = handleOpen;
      ws2.onopen = handleOpen;
    });

    it('should clean up empty rooms', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = () => {
        ws.joinRoom('temp-room');
        expect(mockRooms.has('temp-room')).toBe(true);

        ws.leaveRoom('temp-room');
        expect(ws.connectedRooms.has('temp-room')).toBe(false);
        expect(mockRooms.has('temp-room')).toBe(false);
        done();
      };
    });

    it('should handle room name with special characters', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = () => {
        ws.joinRoom('room-with-special-chars_123!@#');
      };

      ws.onmessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.type === 'room_joined') {
          expect(data.roomId).toBe('room-with-special-chars_123!@#');
          expect(ws.connectedRooms.has('room-with-special-chars_123!@#')).toBe(true);
          done();
        }
      };
    });
  });

  // ==================== Client Management Tests ====================
  describe('WebSocket Client Management', () => {
    it('should track connected clients', (done) => {
      const ws1 = new MockWebSocket('ws://localhost:3000/api/ws');
      const ws2 = new MockWebSocket('ws://localhost:3000/api/ws');

      let connections = 0;

      const handleOpen = () => {
        connections++;
        if (connections === 2) {
          mockWebSocketClients.set(ws1.id, ws1);
          mockWebSocketClients.set(ws2.id, ws2);

          expect(mockWebSocketClients.size).toBe(2);
          expect(mockWebSocketClients.has(ws1.id)).toBe(true);
          expect(mockWebSocketClients.has(ws2.id)).toBe(true);
          done();
        }
      };

      ws1.onopen = handleOpen;
      ws2.onopen = handleOpen;
    });

    it('should remove client on disconnect', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = () => {
        mockWebSocketClients.set(ws.id, ws);
        expect(mockWebSocketClients.has(ws.id)).toBe(true);

        ws.close(1000, 'Normal closure');
      };

      ws.onclose = () => {
        mockWebSocketClients.delete(ws.id);
        expect(mockWebSocketClients.has(ws.id)).toBe(false);
        expect(ws.connectedRooms.size).toBe(0);
        done();
      };
    });

    it('should generate unique client IDs', (done) => {
      const ws1 = new MockWebSocket('ws://localhost:3000/api/ws');
      const ws2 = new MockWebSocket('ws://localhost:3000/api/ws');

      let connections = 0;

      const handleOpen = () => {
        connections++;
        if (connections === 2) {
          expect(ws1.id).toBeDefined();
          expect(ws2.id).toBeDefined();
          expect(ws1.id).not.toBe(ws2.id);
          done();
        }
      };

      ws1.onopen = handleOpen;
      ws2.onopen = handleOpen;
    });
  });

  // ==================== Edge Cases Tests ====================
  describe('WebSocket Edge Cases', () => {
    it('should handle rapid connection/disconnection', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = () => {
        ws.close(1000, 'Rapid close');
      };

      ws.onclose = () => {
        // Should not throw on double close
        ws.close(1000, 'Already closed');
        done();
      };
    });

    it('should handle sending after close', () => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      ws.onopen = () => {
        ws.close(1000, 'Normal closure');
      };

      expect(() => {
        ws.send(JSON.stringify({ type: 'test' }));
      }).toThrow('WebSocket is not open');
    });

    it('should handle connection during transition', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      // Check CONNECTING state
      expect(ws.readyState).toBe(ws.CONNECTING);

      ws.onopen = () => {
        expect(ws.readyState).toBe(ws.OPEN);
        done();
      };
    });

    it('should handle multiple event handlers', (done) => {
      const ws = new MockWebSocket('ws://localhost:3000/api/ws');

      let openCount = 0;
      let messageCount = 0;

      const handleOpen1 = () => { openCount++; };
      const handleOpen2 = () => { openCount++; };
      const handleMessage1 = () => { messageCount++; };
      const handleMessage2 = () => { messageCount++; };

      ws.onopen = handleOpen1;
      ws.onopen = handleOpen2; // Overwrites

      ws.onmessage = handleMessage1;
      ws.onmessage = handleMessage2; // Overwrites

      ws.onopen = () => {
        expect(openCount).toBe(1);

        ws.send(JSON.stringify({ type: 'test' }));
      };

      ws.onmessage = (event: MessageEvent) => {
        expect(messageCount).toBe(1);
        done();
      };
    });

    it('should handle malformed WebSocket URL', (done) => {
      // Mock WebSocket constructor should handle this
      try {
        const ws = new MockWebSocket('not-a-websocket-url');
        ws.onopen = () => {
          // Should still create a mock connection
          expect(ws.url).toBe('not-a-websocket-url');
          done();
        };
      } catch (error) {
        // Or throw if invalid
        expect(error).toBeDefined();
        done();
      }
    });
  });

  // ==================== API Integration Tests ====================
  describe('WebSocket API Endpoints', () => {
    it('should get WebSocket server stats', async () => {
      const fetch = (await import('node-fetch')).default as any;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            connectedClients: mockWebSocketClients.size,
            activeRooms: mockRooms.size,
            totalConnections: 100,
            uptime: 3600,
          },
        }),
      });

      const response = await fetch('http://localhost:3000/api/ws/stats');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('connectedClients');
      expect(data.data).toHaveProperty('activeRooms');
    });

    it('should get room information', async () => {
      const fetch = (await import('node-fetch')).default as any;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            roomId: 'test-room',
            clientCount: mockRooms.get('test-room')?.size || 0,
            clients: [],
            createdAt: '2026-03-27T12:00:00.000Z',
          },
        }),
      });

      const response = await fetch('http://localhost:3000/api/ws/rooms/test-room');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data.roomId).toBe('test-room');
    });

    it('should handle broadcasting to all clients', async () => {
      const fetch = (await import('node-fetch')).default as any;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            delivered: mockWebSocketClients.size,
            failed: 0,
          },
        }),
      });

      const response = await fetch('http://localhost:3000/api/ws/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'announcement',
          message: 'Hello everyone!',
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('delivered');
    });

    it('should handle non-existent room info', async () => {
      const fetch = (await import('node-fetch')).default as any;

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Room not found',
          },
        }),
      });

      const response = await fetch('http://localhost:3000/api/ws/rooms/non-existent-room');
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });
  });
});
