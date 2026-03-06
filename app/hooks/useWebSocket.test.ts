/**
 * useWebSocket Hook Tests
 * 
 * 测试覆盖:
 * - WebSocket连接建立
 * - 消息发送和接收
 * - 连接状态管理（连接中、已连接、断开、错误）
 * - 重连机制
 * - 清理和断开连接
 * - Mock WebSocket API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket, WebSocketMessage } from './useWebSocket';

// Mock WebSocket class
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  private sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    
    // Store instance for access in tests
    MockWebSocket.instances.push(this);
    
    // Simulate async connection
    setTimeout(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN;
        this.onopen?.(new Event('open'));
      }
    }, 0);
  }

  send(data: string) {
    if (this.readyState === MockWebSocket.OPEN) {
      this.sentMessages.push(data);
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Helper methods for testing
  simulateMessage(data: WebSocketMessage) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  simulateError() {
    this.onerror?.(new Event('error'));
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  getSentMessages() {
    return [...this.sentMessages];
  }

  clearSentMessages() {
    this.sentMessages = [];
  }

  // Static helper for tests
  static instances: MockWebSocket[] = [];
  
  static clearInstances() {
    MockWebSocket.instances = [];
  }
  
  static getLastInstance(): MockWebSocket | undefined {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }
}

// Create mock WebSocket constructor
const MockWebSocketConstructor = vi.fn((url: string) => new MockWebSocket(url)) as any;

// Set static properties
MockWebSocketConstructor.CONNECTING = 0;
MockWebSocketConstructor.OPEN = 1;
MockWebSocketConstructor.CLOSING = 2;
MockWebSocketConstructor.CLOSED = 3;

// Override global WebSocket before tests
const originalWebSocket = global.WebSocket;

beforeEach(() => {
  global.WebSocket = MockWebSocketConstructor;
  MockWebSocket.clearInstances();
});

afterEach(() => {
  global.WebSocket = originalWebSocket;
});

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    MockWebSocket.clearInstances();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Connection Establishment', () => {
    it('should establish WebSocket connection when url is provided', async () => {
      const url = 'wss://example.com/ws';
      
      const { result } = renderHook(() => useWebSocket({ url }));

      // Initially not connected
      expect(result.current.isConnected).toBe(false);

      // Wait for connection to establish
      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.isConnected).toBe(true);
      expect(MockWebSocket.instances.length).toBe(1);
      expect(MockWebSocket.instances[0].url).toBe(url);
    });

    it('should not connect when url is not provided', () => {
      const { result } = renderHook(() => useWebSocket({}));

      expect(result.current.isConnected).toBe(false);
      expect(MockWebSocket.instances.length).toBe(0);
    });

    it('should not create duplicate connections when already connected', async () => {
      const url = 'wss://example.com/ws';
      
      const { result } = renderHook(() => useWebSocket({ url }));

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.isConnected).toBe(true);
      const initialCount = MockWebSocket.instances.length;

      // Try to connect again
      act(() => {
        result.current.connect();
      });

      await act(async () => {
        vi.runAllTimers();
      });

      expect(MockWebSocket.instances.length).toBe(initialCount);
    });

    it('should call onOpen callback when connection opens', async () => {
      const onOpen = vi.fn();
      
      renderHook(() => useWebSocket({
        url: 'wss://example.com/ws',
        onOpen,
      }));

      await act(async () => {
        vi.runAllTimers();
      });

      expect(onOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message Sending and Receiving', () => {
    it('should receive and parse messages correctly', async () => {
      const onMessage = vi.fn();
      const testMessage: WebSocketMessage = {
        type: 'test',
        payload: { data: 'hello' },
        timestamp: new Date().toISOString(),
      };

      const { result } = renderHook(() => useWebSocket({
        url: 'wss://example.com/ws',
        onMessage,
      }));

      await act(async () => {
        vi.runAllTimers();
      });

      // Simulate receiving a message
      await act(async () => {
        MockWebSocket.instances[0].simulateMessage(testMessage);
      });

      expect(onMessage).toHaveBeenCalledWith(testMessage);
      expect(result.current.lastMessage).toEqual(testMessage);
    });

    it('should send messages correctly', async () => {
      const { result } = renderHook(() => useWebSocket({
        url: 'wss://example.com/ws',
      }));

      await act(async () => {
        vi.runAllTimers();
      });

      const message: WebSocketMessage = {
        type: 'ping',
        payload: {},
      };

      act(() => {
        result.current.send(message);
      });

      const sentMessages = MockWebSocket.instances[0].getSentMessages();
      expect(sentMessages.length).toBe(1);
      expect(JSON.parse(sentMessages[0])).toEqual(message);
    });

    it('should not send messages when not connected', async () => {
      const { result } = renderHook(() => useWebSocket({}));

      const message: WebSocketMessage = {
        type: 'ping',
        payload: {},
      };

      // Should not throw and should not send
      act(() => {
        result.current.send(message);
      });

      expect(MockWebSocket.instances.length).toBe(0);
    });

    it('should handle invalid JSON messages gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      renderHook(() => useWebSocket({
        url: 'wss://example.com/ws',
      }));

      await act(async () => {
        vi.runAllTimers();
      });

      // Simulate receiving invalid JSON
      await act(async () => {
        MockWebSocket.instances[0].onmessage?.(new MessageEvent('message', { 
          data: 'invalid json' 
        }));
      });

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('Connection State Management', () => {
    it('should track connection state correctly', async () => {
      const { result } = renderHook(() => useWebSocket({
        url: 'wss://example.com/ws',
      }));

      // Initial state: not connected
      expect(result.current.isConnected).toBe(false);

      // After connection
      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.isConnected).toBe(true);

      // After disconnect
      act(() => {
        result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should call onClose callback when connection closes', async () => {
      const onClose = vi.fn();
      
      renderHook(() => useWebSocket({
        url: 'wss://example.com/ws',
        onClose,
        reconnect: false,
      }));

      await act(async () => {
        vi.runAllTimers();
      });

      // Close the connection
      act(() => {
        MockWebSocket.instances[0].close();
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onError callback when error occurs', async () => {
      const onError = vi.fn();
      
      renderHook(() => useWebSocket({
        url: 'wss://example.com/ws',
        onError,
      }));

      await act(async () => {
        vi.runAllTimers();
      });

      // Simulate error
      act(() => {
        MockWebSocket.instances[0].simulateError();
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Reconnection Mechanism', () => {
    it('should attempt to reconnect after connection closes when reconnect is enabled', async () => {
      const { result } = renderHook(() => useWebSocket({
        url: 'wss://example.com/ws',
        reconnect: true,
        reconnectInterval: 1000,
      }));

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.isConnected).toBe(true);
      expect(MockWebSocket.instances.length).toBe(1);

      // Simulate connection close
      act(() => {
        MockWebSocket.instances[0].simulateClose();
      });

      expect(result.current.isConnected).toBe(false);

      // Advance timers for reconnect
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // Should have created a new WebSocket instance
      expect(MockWebSocket.instances.length).toBe(2);
    });

    it('should not reconnect when reconnect is disabled', async () => {
      const { result } = renderHook(() => useWebSocket({
        url: 'wss://example.com/ws',
        reconnect: false,
        reconnectInterval: 1000,
      }));

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.isConnected).toBe(true);

      // Simulate connection close
      act(() => {
        MockWebSocket.instances[0].simulateClose();
      });

      // Advance timers
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Should NOT have created a new WebSocket instance
      expect(MockWebSocket.instances.length).toBe(1);
    });

    it('should use custom reconnect interval', async () => {
      const reconnectInterval = 5000;
      
      renderHook(() => useWebSocket({
        url: 'wss://example.com/ws',
        reconnect: true,
        reconnectInterval,
      }));

      await act(async () => {
        vi.runAllTimers();
      });

      // Simulate connection close
      act(() => {
        MockWebSocket.instances[0].simulateClose();
      });

      // Advance time by less than reconnect interval
      await act(async () => {
        vi.advanceTimersByTime(reconnectInterval - 1);
      });

      expect(MockWebSocket.instances.length).toBe(1);

      // Advance past reconnect interval
      await act(async () => {
        vi.advanceTimersByTime(1);
      });

      expect(MockWebSocket.instances.length).toBe(2);
    });
  });

  describe('Cleanup and Disconnection', () => {
    it('should disconnect properly', async () => {
      const { result } = renderHook(() => useWebSocket({
        url: 'wss://example.com/ws',
        reconnect: true,
      }));

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.isConnected).toBe(true);

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);
      expect(MockWebSocket.instances[0].readyState).toBe(MockWebSocket.CLOSED);
    });

    it('should cleanup on unmount', async () => {
      const { unmount } = renderHook(() => useWebSocket({
        url: 'wss://example.com/ws',
      }));

      await act(async () => {
        vi.runAllTimers();
      });

      expect(MockWebSocket.instances[0].readyState).toBe(MockWebSocket.OPEN);

      unmount();

      expect(MockWebSocket.instances[0].readyState).toBe(MockWebSocket.CLOSED);
    });

    it('should clear reconnect timeout on disconnect', async () => {
      const { result } = renderHook(() => useWebSocket({
        url: 'wss://example.com/ws',
        reconnect: true,
        reconnectInterval: 5000,
      }));

      await act(async () => {
        vi.runAllTimers();
      });

      // Simulate connection close (starts reconnect timer)
      act(() => {
        MockWebSocket.instances[0].simulateClose();
      });

      // Disconnect before reconnect happens
      act(() => {
        result.current.disconnect();
      });

      // Advance past reconnect interval
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });

      // Should not have reconnected (only initial connection)
      expect(MockWebSocket.instances.length).toBe(1);
    });
  });

  describe('Subscribe/Unsubscribe', () => {
    it('should subscribe to a repository', async () => {
      const { result } = renderHook(() => useWebSocket({
        url: 'wss://example.com/ws',
      }));

      await act(async () => {
        vi.runAllTimers();
      });

      act(() => {
        result.current.subscribe('owner', 'repo');
      });

      const sentMessages = MockWebSocket.instances[0].getSentMessages();
      const lastMessage = JSON.parse(sentMessages[sentMessages.length - 1]);
      
      expect(lastMessage).toEqual({
        type: 'subscribe',
        owner: 'owner',
        repo: 'repo',
      });
    });

    it('should unsubscribe from a repository', async () => {
      const { result } = renderHook(() => useWebSocket({
        url: 'wss://example.com/ws',
      }));

      await act(async () => {
        vi.runAllTimers();
      });

      act(() => {
        result.current.unsubscribe('owner', 'repo');
      });

      const sentMessages = MockWebSocket.instances[0].getSentMessages();
      const lastMessage = JSON.parse(sentMessages[sentMessages.length - 1]);
      
      expect(lastMessage).toEqual({
        type: 'unsubscribe',
        owner: 'owner',
        repo: 'repo',
      });
    });

    it('should not subscribe when not connected', () => {
      const { result } = renderHook(() => useWebSocket({}));

      act(() => {
        result.current.subscribe('owner', 'repo');
      });

      // No WebSocket instance should exist
      expect(MockWebSocket.instances.length).toBe(0);
    });
  });

  describe('Manual Connect', () => {
    it('should allow manual reconnection after disconnect', async () => {
      const { result } = renderHook(() => useWebSocket({
        url: 'wss://example.com/ws',
        reconnect: false,
      }));

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.isConnected).toBe(true);
      expect(MockWebSocket.instances.length).toBe(1);

      // Disconnect
      act(() => {
        result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);

      // Manual reconnect
      await act(async () => {
        result.current.connect();
        vi.runAllTimers();
      });

      expect(result.current.isConnected).toBe(true);
      expect(MockWebSocket.instances.length).toBe(2);
    });
  });
});