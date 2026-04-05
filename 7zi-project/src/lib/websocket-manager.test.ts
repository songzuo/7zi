/**
 * WebSocketManager Tests
 */

import { WebSocketManager, WebSocketConfig, ConnectionState } from './websocket-manager';

// Mock WebSocket
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

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.OPEN;
  url: string;
  protocols?: string | string[];

  onopen: ((event: MockEvent) => void) | null = null;
  onclose: ((event: MockCloseEvent) => void) | null = null;
  onerror: ((event: MockEvent) => void) | null = null;
  onmessage: ((event: MockMessageEvent) => void) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    
    // Simulate async connection
    setTimeout(() => {
      if (this.onopen) {
        this.onopen({ type: 'open' } as Event);
      }
    }, 10);
  }

  send(_data: string | ArrayBuffer | Blob | ArrayBufferView): void {
    // Mock send
  }

  close(_code?: number, _reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ type: 'close', code: 1000, reason: 'Normal closure' });
    }
  }
}

// Replace global WebSocket
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).WebSocket = MockWebSocket;

describe('WebSocketManager', () => {
  const defaultConfig: WebSocketConfig = {
    url: 'wss://test.example.com/ws',
    reconnect: false,
    pingInterval: 1000,
    pongTimeout: 500,
  };

  let wsManager: WebSocketManager;

  afterEach(async () => {
    if (wsManager) {
      await wsManager.dispose();
    }
  });

  describe('构造函数', () => {
    test('应该使用默认配置创建实例', () => {
      wsManager = new WebSocketManager({ url: 'wss://test.com' });
      expect(wsManager.isConnected()).toBe(false);
      expect(wsManager.getState()).toBe('disconnected');
    });

    test('应该合并自定义配置', () => {
      wsManager = new WebSocketManager({
        url: 'wss://test.com',
        reconnect: true,
        reconnectInterval: 3000,
        maxReconnectAttempts: 10,
      });
      expect(wsManager.isConnected()).toBe(false);
    });

    test('应该接受协议参数', () => {
      wsManager = new WebSocketManager({
        url: 'wss://test.com',
        protocols: ['proto1', 'proto2'],
      });
      expect(wsManager.isConnected()).toBe(false);
    });
  });

  describe('连接管理', () => {
    test('应该能够连接到 WebSocket 服务器', async () => {
      wsManager = new WebSocketManager(defaultConfig);
      await wsManager.connect();
      expect(wsManager.isConnected()).toBe(true);
      expect(wsManager.getState()).toBe('connected');
    });

    test('重复调用 connect 应该是幂等的', async () => {
      wsManager = new WebSocketManager(defaultConfig);
      await wsManager.connect();
      await wsManager.connect(); // 第二次调用
      expect(wsManager.isConnected()).toBe(true);
    });

    test('应该能够断开连接', async () => {
      wsManager = new WebSocketManager(defaultConfig);
      await wsManager.connect();
      await wsManager.disconnect();
      expect(wsManager.isConnected()).toBe(false);
      expect(wsManager.getState()).toBe('disconnected');
    });

    test('重复调用 disconnect 应该是幂等的', async () => {
      wsManager = new WebSocketManager(defaultConfig);
      await wsManager.connect();
      await wsManager.disconnect();
      await wsManager.disconnect(); // 第二次调用
      expect(wsManager.isConnected()).toBe(false);
    });
  });

  describe('消息处理', () => {
    beforeEach(async () => {
      wsManager = new WebSocketManager(defaultConfig);
      await wsManager.connect();
    });

    test('应该能够发送字符串消息', () => {
      expect(() => wsManager.send('test message')).not.toThrow();
    });

    test('未连接时发送消息应该抛出错误', async () => {
      wsManager = new WebSocketManager(defaultConfig);
      expect(() => wsManager.send('test')).toThrow('未连接');
    });

    test('应该能够添加消息监听器', () => {
      const listener = jest.fn();
      const unsubscribe = wsManager.onMessage(listener);
      expect(typeof unsubscribe).toBe('function');
    });

    test('应该能够移除消息监听器', () => {
      const listener = jest.fn();
      const unsubscribe = wsManager.onMessage(listener);
      unsubscribe();
      // 监听器已移除
    });
  });

  describe('事件监听', () => {
    test('应该能够添加 open 事件监听器', () => {
      wsManager = new WebSocketManager(defaultConfig);
      const listener = jest.fn();
      const unsubscribe = wsManager.on('open', listener);
      expect(typeof unsubscribe).toBe('function');
    });

    test('应该能够添加 close 事件监听器', () => {
      wsManager = new WebSocketManager(defaultConfig);
      const listener = jest.fn();
      const unsubscribe = wsManager.on('close', listener);
      expect(typeof unsubscribe).toBe('function');
    });

    test('应该能够添加 error 事件监听器', () => {
      wsManager = new WebSocketManager(defaultConfig);
      const listener = jest.fn();
      const unsubscribe = wsManager.on('error', listener);
      expect(typeof unsubscribe).toBe('function');
    });

    test('应该能够移除事件监听器', () => {
      wsManager = new WebSocketManager(defaultConfig);
      const listener = jest.fn();
      const unsubscribe = wsManager.on('open', listener);
      unsubscribe();
      // 监听器已移除
    });
  });

  describe('资源管理', () => {
    test('dispose 应该清理所有资源', async () => {
      wsManager = new WebSocketManager(defaultConfig);
      await wsManager.connect();
      await wsManager.dispose();
      expect(wsManager.isConnected()).toBe(false);
    });

    test('应该支持多次调用 dispose', async () => {
      wsManager = new WebSocketManager(defaultConfig);
      await wsManager.connect();
      await wsManager.dispose();
      await wsManager.dispose(); // 第二次调用
      expect(wsManager.isConnected()).toBe(false);
    });
  });

  describe('状态管理', () => {
    test('getState 应该返回当前状态', () => {
      wsManager = new WebSocketManager(defaultConfig);
      const state: ConnectionState = wsManager.getState();
      expect(['connecting', 'connected', 'disconnecting', 'disconnected', 'error']).toContain(state);
    });

    test('isConnected 应该返回连接状态', () => {
      wsManager = new WebSocketManager(defaultConfig);
      expect(wsManager.isConnected()).toBe(false);
    });
  });
});
