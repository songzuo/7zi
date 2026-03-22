/**
 * useWebSocket Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWebSocket, WebSocketMessage } from './useWebSocket';

// WebSocket mock implementation
class MockWebSocket {
  url: string;
  readyState: number = WebSocket.CONNECTING;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  private listeners: Map<string, EventListener[]> = new Map();

  constructor(url: string) {
    this.url = url;
    this.send = vi.fn();
    this.close = vi.fn();
    this.addEventListener = vi.fn((event: string, callback: EventListener) => {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event)!.push(callback);

      // Simulate connection established
      if (event === 'open') {
        setTimeout(() => {
          this.readyState = WebSocket.OPEN;
          callback(new Event('open'));
        }, 0);
      }
    });
    this.removeEventListener = vi.fn((event: string, callback: EventListener) => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    });
  }

  // Helper to trigger events in tests
  triggerEvent(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        callback(data);
      });
    }
  }
}

describe('useWebSocket', () => {
  beforeEach(() => {
    // Mock global WebSocket
    global.WebSocket = MockWebSocket as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3000'));

      expect(result.current.isConnected).toBe(false);
      expect(result.current.lastMessage).toBeNull();
      expect(result.current.sendMessage).toBeDefined();
    });

    it('should create WebSocket connection with provided URL', () => {
      renderHook(() => useWebSocket('ws://localhost:3000'));

      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3000');
    });

    it('should create WebSocket connection with different URL', () => {
      renderHook(() => useWebSocket('wss://example.com/socket'));

      expect(global.WebSocket).toHaveBeenCalledWith('wss://example.com/socket');
    });
  });

  describe('connection management', () => {
    it('should connect successfully on mount', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3000'));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should disconnect on unmount', () => {
      const { unmount } = renderHook(() => useWebSocket('ws://localhost:3000'));

      const wsInstance = (global.WebSocket as any).mock.results[0]?.value;
      unmount();

      expect(wsInstance?.close).toHaveBeenCalled();
    });

    it('should reconnect when URL changes', async () => {
      const { result, rerender } = renderHook(
        (url: string) => useWebSocket(url),
        { initialProps: 'ws://localhost:3000' }
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const firstWsInstance = (global.WebSocket as any).mock.results[0]?.value;
      rerender('ws://localhost:4000');

      expect(firstWsInstance?.close).toHaveBeenCalled();
      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:4000');
    });
  });

  describe('message handling', () => {
    it('should receive and parse JSON message', async () => {
      const mockEvent = new MessageEvent('message', {
        data: JSON.stringify({ type: 'test', data: 'hello' }),
      });

      const { result } = renderHook(() => useWebSocket('ws://localhost:3000'));

      const wsInstance = (global.WebSocket as any).mock.results[0]?.value;
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        wsInstance?.triggerEvent('message', mockEvent);
      });

      await waitFor(() => {
        expect(result.current.lastMessage).toEqual({
          type: 'test',
          data: 'hello',
        });
      });
    });

    it('should handle non-JSON messages', async () => {
      const mockEvent = new MessageEvent('message', {
        data: 'plain text message',
      });

      const { result } = renderHook(() => useWebSocket('ws://localhost:3000'));

      const wsInstance = (global.WebSocket as any).mock.results[0]?.value;
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        wsInstance?.triggerEvent('message', mockEvent);
      });

      await waitFor(() => {
        expect(result.current.lastMessage).toEqual({
          type: 'error',
          data: 'plain text message',
        });
      });
    });

    it('should send message as JSON string', () => {
      const message: WebSocketMessage = { type: 'greeting', data: { hello: 'world' } };
      const { result } = renderHook(() => useWebSocket('ws://localhost:3000'));

      act(() => {
        result.current.sendMessage(message);
      });

      const wsInstance = (global.WebSocket as any).mock.results[0]?.value;
      expect(wsInstance?.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should not send message when connection is not open', () => {
      // Create a mock WebSocket that's closed
      class ClosedMockWebSocket extends MockWebSocket {
        readyState = WebSocket.CLOSED;
      }
      global.WebSocket = ClosedMockWebSocket as any;

      const message: WebSocketMessage = { type: 'test', data: 'test' };
      const { result } = renderHook(() => useWebSocket('ws://localhost:3000'));

      act(() => {
        result.current.sendMessage(message);
      });

      const wsInstance = (global.WebSocket as any).mock.results[0]?.value;
      expect(wsInstance?.send).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle close event', async () => {
      const mockEvent = new CloseEvent('close', { code: 1000, reason: 'Normal closure' });

      const { result } = renderHook(() => useWebSocket('ws://localhost:3000'));

      const wsInstance = (global.WebSocket as any).mock.results[0]?.value;
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        wsInstance?.triggerEvent('close', mockEvent);
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('should handle error event', async () => {
      const mockEvent = new Event('error');

      const { result } = renderHook(() => useWebSocket('ws://localhost:3000'));

      const wsInstance = (global.WebSocket as any).mock.results[0]?.value;

      act(() => {
        wsInstance?.triggerEvent('error', mockEvent);
      });

      // Error event doesn't change state in current implementation
      // but we verify it was handled without crashing
      expect(result.current.isConnected).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle connection with empty URL', () => {
      const { result } = renderHook(() => useWebSocket(''));

      expect(result.current.isConnected).toBe(false);
      expect(result.current.lastMessage).toBeNull();
      expect(result.current.sendMessage).toBeDefined();
    });

    it('should handle multiple sendMessage calls', () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3000'));

      act(() => {
        result.current.sendMessage({ type: 'test1', data: 1 });
        result.current.sendMessage({ type: 'test2', data: 2 });
        result.current.sendMessage({ type: 'test3', data: 3 });
      });

      const wsInstance = (global.WebSocket as any).mock.results[0]?.value;
      expect(wsInstance?.send).toHaveBeenCalledTimes(3);
    });

    it('should handle null data in message', async () => {
      const mockEvent = new MessageEvent('message', {
        data: JSON.stringify({ type: 'test', data: null }),
      });

      const { result } = renderHook(() => useWebSocket('ws://localhost:3000'));

      const wsInstance = (global.WebSocket as any).mock.results[0]?.value;
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        wsInstance?.triggerEvent('message', mockEvent);
      });

      await waitFor(() => {
        expect(result.current.lastMessage).toEqual({
          type: 'test',
          data: null,
        });
      });
    });

    it('should handle messages with undefined data', async () => {
      const mockEvent = new MessageEvent('message', {
        data: JSON.stringify({ type: 'test' }),
      });

      const { result } = renderHook(() => useWebSocket('ws://localhost:3000'));

      const wsInstance = (global.WebSocket as any).mock.results[0]?.value;
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        wsInstance?.triggerEvent('message', mockEvent);
      });

      await waitFor(() => {
        expect(result.current.lastMessage).toEqual({
          type: 'test',
          data: undefined,
        });
      });
    });

    it('should handle rapid message updates', async () => {
      const { result } = renderHook(() => useWebSocket('ws://localhost:3000'));

      const wsInstance = (global.WebSocket as any).mock.results[0]?.value;
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Send multiple messages rapidly
      for (let i = 0; i < 10; i++) {
        const mockEvent = new MessageEvent('message', {
          data: JSON.stringify({ type: 'test', data: i }),
        });
        act(() => {
          wsInstance?.triggerEvent('message', mockEvent);
        });
      }

      await waitFor(() => {
        expect(result.current.lastMessage).toEqual({
          type: 'test',
          data: 9,
        });
      });
    });
  });
});
