/**
 * 光标同步测试 - Cursor Synchronization Tests
 * 测试协作系统中的实时光标同步功能
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// =====================
// 类型定义
// =====================

// Mock DOM types
interface MockEvent {
  type: string;
}

interface MockMessageEvent extends MockEvent {
  data: string;
}

interface MockCloseEvent extends MockEvent {
  code?: number;
  reason?: string;
  wasClean?: boolean;
}

interface CursorPosition {
  userId: string;
  userName: string;
  x: number;
  y: number;
  nodeId?: string;
  timestamp: number;
}

interface CursorSyncConfig {
  broadcastInterval: number;
  maxCursors: number;
  cursorTimeout: number;
}

// =====================
// Mock WebSocket
// =====================

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.OPEN;
  url: string;
  
  onopen: ((event: MockEvent) => void) | null = null;
  onclose: ((event: MockCloseEvent) => void) | null = null;
  onerror: ((event: MockEvent) => void) | null = null;
  onmessage: ((event: MockMessageEvent) => void) | null = null;

  private sentMessages: unknown[] = [];

  constructor(url: string) {
    this.url = url;
    
    setTimeout(() => {
      if (this.onopen) {
        this.onopen({ type: 'open' } as Event);
      }
    }, 10);
  }

  send(data: string): void {
    this.sentMessages.push(JSON.parse(data));
  }

  close(_code?: number, _reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ type: 'close', code: 1000, reason: 'Normal closure' });
    }
  }

  getSentMessages(): unknown[] {
    return this.sentMessages;
  }

  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      this.onmessage({ type: 'message', data: JSON.stringify(data) } as MockMessageEvent);
    }
  }
}

// =====================
// 光标同步服务模拟
// =====================

class CursorSyncService {
  private ws: MockWebSocket | null = null;
  private cursors: Map<string, CursorPosition> = new Map();
  private userId: string;
  private userName: string;
  private config: CursorSyncConfig = {
    broadcastInterval: 16,
    maxCursors: 50,
    cursorTimeout: 5000,
  };
  private lastPosition: CursorPosition | null = null;

  constructor(userId: string, userName: string) {
    this.userId = userId;
    this.userName = userName;
  }

  connect(url: string): Promise<void> {
    return new Promise((resolve) => {
      this.ws = new MockWebSocket(url);
      this.ws.onopen = () => {
        this.startCursorCleanup();
        resolve();
      };
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cursors.clear();
  }

  updateCursor(x: number, y: number, nodeId?: string): void {
    const position: CursorPosition = {
      userId: this.userId,
      userName: this.userName,
      x,
      y,
      nodeId,
      timestamp: Date.now(),
    };

    this.lastPosition = position;
    this.broadcastCursor(position);
  }

  private broadcastCursor(position: CursorPosition): void {
    if (this.ws && this.ws.readyState === MockWebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'cursor:move',
        payload: position,
      }));
    }
  }

  handleRemoteCursor(data: CursorPosition): void {
    if (data.userId !== this.userId) {
      this.cursors.set(data.userId, data);
    }
  }

  getRemoteCursors(): CursorPosition[] {
    return Array.from(this.cursors.values());
  }

  getLastPosition(): CursorPosition | null {
    return this.lastPosition;
  }

  private startCursorCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [userId, cursor] of this.cursors.entries()) {
        if (now - cursor.timestamp > this.config.cursorTimeout) {
          this.cursors.delete(userId);
        }
      }
    }, this.config.cursorTimeout);
  }
}

// =====================
// 测试套件
// =====================

describe('CursorSyncService - 光标同步服务', () => {
  let cursorService: CursorSyncService;
  const testUserId = 'user-001';
  const testUserName = 'Test User';

  beforeEach(() => {
    cursorService = new CursorSyncService(testUserId, testUserName);
  });

  afterEach(() => {
    cursorService.disconnect();
  });

  describe('基础功能', () => {
    it('应该成功创建光标同步服务实例', () => {
      expect(cursorService).toBeDefined();
      expect(cursorService.getLastPosition()).toBeNull();
    });

    it('应该能够连接到 WebSocket 服务器', async () => {
      await cursorService.connect('wss://test.example.com/collab');
      // 连接成功后不应该抛出错误
      expect(true).toBe(true);
    });

    it('应该能够断开连接并清理资源', async () => {
      await cursorService.connect('wss://test.example.com/collab');
      cursorService.disconnect();
      // 断开后再次断开不应该抛出错误
      cursorService.disconnect();
      expect(true).toBe(true);
    });
  });

  describe('光标位置更新', () => {
    it('应该正确更新本地光标位置', async () => {
      await cursorService.connect('wss://test.example.com/collab');
      cursorService.updateCursor(100, 200, 'node-123');

      const lastPosition = cursorService.getLastPosition();
      expect(lastPosition).not.toBeNull();
      expect(lastPosition?.x).toBe(100);
      expect(lastPosition?.y).toBe(200);
      expect(lastPosition?.nodeId).toBe('node-123');
      expect(lastPosition?.userId).toBe(testUserId);
    });

    it('应该正确处理无 nodeId 的光标位置', async () => {
      await cursorService.connect('wss://test.example.com/collab');
      cursorService.updateCursor(50, 75);

      const lastPosition = cursorService.getLastPosition();
      expect(lastPosition).not.toBeNull();
      expect(lastPosition?.x).toBe(50);
      expect(lastPosition?.y).toBe(75);
      expect(lastPosition?.nodeId).toBeUndefined();
    });

    it('应该正确更新时间戳', async () => {
      await cursorService.connect('wss://test.example.com/collab');
      
      cursorService.updateCursor(100, 200);
      const firstTimestamp = cursorService.getLastPosition()?.timestamp;
      
      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 10));
      
      cursorService.updateCursor(150, 250);
      const secondTimestamp = cursorService.getLastPosition()?.timestamp;
      
      expect(secondTimestamp).toBeGreaterThan(firstTimestamp!);
    });
  });

  describe('远程光标处理', () => {
    it('应该正确接收和存储远程光标位置', async () => {
      await cursorService.connect('wss://test.example.com/collab');
      
      const remoteCursor: CursorPosition = {
        userId: 'user-002',
        userName: 'Remote User',
        x: 300,
        y: 400,
        timestamp: Date.now(),
      };
      
      cursorService.handleRemoteCursor(remoteCursor);
      
      const remoteCursors = cursorService.getRemoteCursors();
      expect(remoteCursors.length).toBe(1);
      expect(remoteCursors[0].userId).toBe('user-002');
      expect(remoteCursors[0].x).toBe(300);
    });

    it('应该忽略自己的光标更新', async () => {
      await cursorService.connect('wss://test.example.com/collab');
      
      const ownCursor: CursorPosition = {
        userId: testUserId,
        userName: testUserName,
        x: 500,
        y: 600,
        timestamp: Date.now(),
      };
      
      cursorService.handleRemoteCursor(ownCursor);
      
      const remoteCursors = cursorService.getRemoteCursors();
      expect(remoteCursors.length).toBe(0);
    });

    it('应该支持多个远程用户的光标', async () => {
      await cursorService.connect('wss://test.example.com/collab');
      
      for (let i = 1; i <= 5; i++) {
        cursorService.handleRemoteCursor({
          userId: `user-${(i + 100).toString().padStart(3, '0')}`,
          userName: `User ${i}`,
          x: i * 100,
          y: i * 100,
          timestamp: Date.now(),
        });
      }
      
      const remoteCursors = cursorService.getRemoteCursors();
      expect(remoteCursors.length).toBe(5);
    });
  });

  describe('边界情况', () => {
    it('应该处理负坐标位置', async () => {
      await cursorService.connect('wss://test.example.com/collab');
      cursorService.updateCursor(-100, -200);

      const lastPosition = cursorService.getLastPosition();
      expect(lastPosition?.x).toBe(-100);
      expect(lastPosition?.y).toBe(-200);
    });

    it('应该处理极大坐标值', async () => {
      await cursorService.connect('wss://test.example.com/collab');
      cursorService.updateCursor(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);

      const lastPosition = cursorService.getLastPosition();
      expect(lastPosition?.x).toBe(Number.MAX_SAFE_INTEGER);
      expect(lastPosition?.y).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('未连接时更新光标不应该抛出错误', () => {
      expect(() => {
        cursorService.updateCursor(100, 200);
      }).not.toThrow();
    });
  });
});
