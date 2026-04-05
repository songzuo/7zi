/**
 * WebSocket 协作消息测试 - WebSocket Collaboration Message Tests
 * 测试协作系统中 WebSocket 消息的发送、接收和处理
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

interface CollabMessage {
  type: string;
  payload: unknown;
  senderId: string;
  timestamp: number;
  messageId: string;
}

type MessageHandler = (message: CollabMessage) => void;

// =====================
// Mock WebSocket
// =====================

class MockCollabWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockCollabWebSocket.OPEN;
  url: string;
  
  onopen: ((event: MockEvent) => void) | null = null;
  onclose: ((event: MockCloseEvent) => void) | null = null;
  onerror: ((event: MockEvent) => void) | null = null;
  onmessage: ((event: MockMessageEvent) => void) | null = null;

  private sentMessages: CollabMessage[] = [];
  private messageQueue: CollabMessage[] = [];
  private shouldFail: boolean = false;

  constructor(url: string) {
    this.url = url;
    
    setTimeout(() => {
      if (this.onopen && !this.shouldFail) {
        this.onopen({ type: 'open' } as Event);
      } else if (this.onerror && this.shouldFail) {
        this.onerror({ type: 'error' } as Event);
      }
    }, 10);
  }

  send(data: string): void {
    try {
      const message = JSON.parse(data);
      this.sentMessages.push(message);
    } catch (e) {
      throw new Error('Invalid message format');
    }
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockCollabWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ type: 'close', code: code || 1000, reason: reason || 'Normal closure' });
    }
  }

  simulateMessage(message: CollabMessage): void {
    if (this.onmessage) {
      this.onmessage({ type: "message", data: JSON.stringify(message) } as MockMessageEvent);
    }
  }

  simulateError(): void {
    this.shouldFail = true;
    if (this.onerror) {
      this.onerror({ type: 'error' } as Event);
    }
  }

  getSentMessages(): CollabMessage[] {
    return [...this.sentMessages];
  }

  clearSentMessages(): void {
    this.sentMessages = [];
  }
}

// =====================
// 协作消息处理器
// =====================

class CollaborationMessageHandler {
  private ws: MockCollabWebSocket | null = null;
  private userId: string;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private messageIdCounter: number = 0;

  constructor(userId: string) {
    this.userId = userId;
  }

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new MockCollabWebSocket(url);
      
      this.ws.onopen = () => {
        this.setupDefaultHandlers();
        resolve();
      };
      
      this.ws.onerror = () => {
        reject(new Error('Connection failed'));
      };
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
  }

  private setupDefaultHandlers(): void {
    // 默认消息处理器
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
    
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  send(type: string, payload: unknown): boolean {
    if (!this.ws || this.ws.readyState !== MockCollabWebSocket.OPEN) {
      return false;
    }

    const message: CollabMessage = {
      type,
      payload,
      senderId: this.userId,
      timestamp: Date.now(),
      messageId: `msg-${++this.messageIdCounter}`,
    };

    this.ws.send(JSON.stringify(message));
    return true;
  }

  handleMessage(data: string): void {
    try {
      const message: CollabMessage = JSON.parse(data);
      const handlers = this.handlers.get(message.type);
      
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error('Handler error:', error);
          }
        });
      }
      
      // 处理通配符
      const wildcardHandlers = this.handlers.get('*');
      if (wildcardHandlers) {
        wildcardHandlers.forEach(handler => handler(message));
      }
    } catch (error) {
      console.error('Message parse error:', error);
    }
  }

  // 协作特定消息方法
  broadcastCursor(x: number, y: number, nodeId?: string): void {
    this.send('cursor:move', { x, y, nodeId });
  }

  broadcastLock(nodeId: string): void {
    this.send('lock:acquire', { nodeId });
  }

  broadcastUnlock(nodeId: string): void {
    this.send('lock:release', { nodeId });
  }

  broadcastJoin(userName: string): void {
    this.send('user:join', { userName });
  }

  broadcastLeave(): void {
    this.send('user:leave', {});
  }

  broadcastEdit(nodeId: string, changes: unknown): void {
    this.send('node:edit', { nodeId, changes });
  }

  getSentMessages(): CollabMessage[] {
    return this.ws ? this.ws.getSentMessages() : [];
  }
}

// =====================
// 测试套件
// =====================

describe('CollaborationMessageHandler - 协作消息处理器', () => {
  let handler: CollaborationMessageHandler;
  const testUserId = 'user-001';
  const testUrl = 'wss://test.example.com/collab';

  beforeEach(() => {
    handler = new CollaborationMessageHandler(testUserId);
  });

  afterEach(async () => {
    handler.disconnect();
  });

  describe('连接管理', () => {
    it('应该成功连接到 WebSocket 服务器', async () => {
      await handler.connect(testUrl);
      expect(handler).toBeDefined();
    });

    it('应该能够断开连接', async () => {
      await handler.connect(testUrl);
      handler.disconnect();
      expect(handler.getSentMessages()).toHaveLength(0);
    });

    it('多次断开连接不应该抛出错误', async () => {
      await handler.connect(testUrl);
      handler.disconnect();
      handler.disconnect();
      expect(true).toBe(true);
    });
  });

  describe('消息发送', () => {
    beforeEach(async () => {
      await handler.connect(testUrl);
    });

    it('应该能够发送光标移动消息', () => {
      handler.broadcastCursor(100, 200, 'node-001');
      
      const messages = handler.getSentMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('cursor:move');
      expect((messages[0].payload as { x: number; y: number }).x).toBe(100);
      expect((messages[0].payload as { x: number; y: number }).y).toBe(200);
      expect(messages[0].senderId).toBe(testUserId);
    });

    it('应该能够发送锁获取消息', () => {
      handler.broadcastLock('node-001');
      
      const messages = handler.getSentMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('lock:acquire');
      expect((messages[0].payload as { nodeId: string }).nodeId).toBe('node-001');
    });

    it('应该能够发送锁释放消息', () => {
      handler.broadcastUnlock('node-001');
      
      const messages = handler.getSentMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('lock:release');
    });

    it('应该能够发送用户加入消息', () => {
      handler.broadcastJoin('Test User');
      
      const messages = handler.getSentMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('user:join');
      expect((messages[0].payload as { userName: string }).userName).toBe('Test User');
    });

    it('应该能够发送用户离开消息', () => {
      handler.broadcastLeave();
      
      const messages = handler.getSentMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('user:leave');
    });

    it('应该能够发送节点编辑消息', () => {
      handler.broadcastEdit('node-001', { content: 'Updated content' });
      
      const messages = handler.getSentMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('node:edit');
      expect((messages[0].payload as { nodeId: string }).nodeId).toBe('node-001');
      expect((messages[0].payload as { changes: { content: string } }).changes.content).toBe('Updated content');
    });

    it('发送的消息应该包含唯一消息ID', () => {
      handler.send('test', {});
      handler.send('test', {});
      
      const messages = handler.getSentMessages();
      expect(messages[0].messageId).not.toBe(messages[1].messageId);
    });

    it('发送的消息应该包含时间戳', () => {
      handler.send('test', {});
      
      const messages = handler.getSentMessages();
      expect(messages[0].timestamp).toBeDefined();
      expect(typeof messages[0].timestamp).toBe('number');
    });
  });

  describe('消息接收', () => {
    beforeEach(async () => {
      await handler.connect(testUrl);
    });

    it('应该能够注册消息处理器', () => {
      const processor = jest.fn();
      handler.on('test:type', processor);
      
      handler.handleMessage(JSON.stringify({
        type: 'test:type',
        payload: { data: 'test' },
        senderId: 'other-user',
        timestamp: Date.now(),
        messageId: 'msg-001',
      }));
      
      expect(processor).toHaveBeenCalledTimes(1);
    });

    it('应该能够注册通配符处理器', () => {
      const wildcardHandler = jest.fn();
      handler.on('*', wildcardHandler);
      
      handler.handleMessage(JSON.stringify({
        type: 'any:type',
        payload: {},
        senderId: 'other-user',
        timestamp: Date.now(),
        messageId: 'msg-001',
      }));
      
      expect(wildcardHandler).toHaveBeenCalledTimes(1);
    });

    it('应该能够注销消息处理器', () => {
      const processor = jest.fn();
      const unsubscribe = handler.on('test:type', processor);
      
      unsubscribe();
      
      handler.handleMessage(JSON.stringify({
        type: 'test:type',
        payload: {},
        senderId: 'other-user',
        timestamp: Date.now(),
        messageId: 'msg-001',
      }));
      
      expect(processor).not.toHaveBeenCalled();
    });

    it('应该忽略无效的 JSON 消息', () => {
      const errorHandler = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      handler.handleMessage('invalid json');
      
      expect(errorHandler).toHaveBeenCalled();
      errorHandler.mockRestore();
    });

    it('应该处理处理器中的错误而不影响其他处理器', () => {
      const badHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = jest.fn();
      
      handler.on('test:type', badHandler);
      handler.on('test:type', goodHandler);
      
      handler.handleMessage(JSON.stringify({
        type: 'test:type',
        payload: {},
        senderId: 'other-user',
        timestamp: Date.now(),
        messageId: 'msg-001',
      }));
      
      expect(goodHandler).toHaveBeenCalled();
    });
  });

  describe('边界情况', () => {
    it('未连接时发送消息应该返回 false', async () => {
      const result = handler.send('test', {});
      expect(result).toBe(false);
    });

    it('断开后发送消息应该返回 false', async () => {
      await handler.connect(testUrl);
      handler.disconnect();
      
      const result = handler.send('test', {});
      expect(result).toBe(false);
    });

    it('应该能够发送多种类型的消息', async () => {
      await handler.connect(testUrl);
      
      handler.send('type-a', { a: 1 });
      handler.send('type-b', { b: 2 });
      handler.send('type-c', { c: 3 });
      
      const messages = handler.getSentMessages();
      expect(messages).toHaveLength(3);
      expect(messages.map(m => m.type)).toEqual(['type-a', 'type-b', 'type-c']);
    });
  });
});

// =====================
// WebSocket 集成测试
// =====================

describe('WebSocket Collaboration Integration', () => {
  it('应该支持完整的光标同步流程', async () => {
    const handler1 = new CollaborationMessageHandler('user-001');
    const handler2 = new CollaborationMessageHandler('user-002');

    await handler1.connect(testUrl);
    await handler2.connect(testUrl);

    const cursorReceived = jest.fn();
    handler2.on('cursor:move', cursorReceived);

    // 用户1发送光标位置
    handler1.broadcastCursor(150, 250, 'node-123');

    // 用户2接收消息
    const messages = handler1.getSentMessages();
    if (messages.length > 0) {
      handler2.handleMessage(JSON.stringify(messages[0]));
    }

    expect(cursorReceived).toHaveBeenCalled();
    const receivedPayload = (cursorReceived.mock.calls[0][0] as CollabMessage).payload;
    expect((receivedPayload as { x: number }).x).toBe(150);
    expect((receivedPayload as { y: number }).y).toBe(250);

    handler1.disconnect();
    handler2.disconnect();
  });

  it('应该支持完整的锁获取流程', async () => {
    const handler1 = new CollaborationMessageHandler('user-001');
    const handler2 = new CollaborationMessageHandler('user-002');

    await handler1.connect(testUrl);
    await handler2.connect(testUrl);

    const lockReceived = jest.fn();
    handler2.on('lock:acquire', lockReceived);

    // 用户1获取锁
    handler1.broadcastLock('node-456');

    // 用户2接收消息
    const messages = handler1.getSentMessages();
    if (messages.length > 0) {
      handler2.handleMessage(JSON.stringify(messages[0]));
    }

    expect(lockReceived).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((lockReceived.mock.calls[0][0] as any).payload.nodeId).toBe('node-456');

    handler1.disconnect();
    handler2.disconnect();
  });

  it('应该支持用户加入/离开流程', async () => {
    const handler = new CollaborationMessageHandler('user-001');
    await handler.connect(testUrl);

    const joinHandler = jest.fn();
    const leaveHandler = jest.fn();

    handler.on('user:join', joinHandler);
    handler.on('user:leave', leaveHandler);

    // 模拟用户加入
    handler.handleMessage(JSON.stringify({
      type: 'user:join',
      payload: { userName: 'Alice' },
      senderId: 'user-002',
      timestamp: Date.now(),
      messageId: 'msg-001',
    }));

    expect(joinHandler).toHaveBeenCalledTimes(1);

    // 模拟用户离开
    handler.handleMessage(JSON.stringify({
      type: 'user:leave',
      payload: {},
      senderId: 'user-002',
      timestamp: Date.now(),
      messageId: 'msg-002',
    }));

    expect(leaveHandler).toHaveBeenCalledTimes(1);

    handler.disconnect();
  });
});

const testUrl = 'wss://test.example.com/collab';
;
