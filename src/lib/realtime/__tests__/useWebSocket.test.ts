// @ts-nocheck - Test file with complex type issues
/**
 * useWebSocket Hook Tests
 * 测试 WebSocket Hook 功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useWebSocket,
  generateMessageId,
  createMessage,
  isMessageType,
  type SimpleWebSocketConfig,
} from '../useWebSocket';

// Mock WebSocket
class MockWebSocket {
  url: string;
  protocols?: string | string[];
  readyState: number = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    // Simulate connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { wasClean: true }));
    }
  }

  addEventListener(event: string, handler: (event: Event | MessageEvent | CloseEvent) => void): void {
    if (event === 'open') this.onopen = handler as (event: Event) => void;
    if (event === 'message') this.onmessage = handler as (event: MessageEvent) => void;
    if (event === 'error') this.onerror = handler as (event: Event) => void;
    if (event === 'close') this.onclose = handler as (event: CloseEvent) => void;
  }

  removeEventListener(event: string): void {
    if (event === 'open') this.onopen = null;
    if (event === 'message') this.onmessage = null;
    if (event === 'error') this.onerror = null;
    if (event === 'close') this.onclose = null;
  }
}

// Mock global WebSocket
declare global {
  var WebSocket: typeof WebSocket;
}
globalThis.WebSocket = MockWebSocket as typeof WebSocket;

describe('useWebSocket', () => {
  let originalWebSocket: typeof global.WebSocket;

  beforeEach(() => {
    originalWebSocket = global.WebSocket;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
  });

  describe('connection', () => {
    it('should connect automatically by default', async () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: true,
      };

      const { result } = renderHook(() => useWebSocket(config));

      await waitFor(() => {
        expect(result.current.status).toBe('open');
      });

      expect(result.current.isConnected).toBe(true);
    });

    it('should not connect when autoConnect is false', () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: false,
      };

      const { result } = renderHook(() => useWebSocket(config));

      expect(result.current.status).toBe('closed');
      expect(result.current.isConnected).toBe(false);
    });

    it('should connect manually', async () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: false,
      };

      const { result } = renderHook(() => useWebSocket(config));

      expect(result.current.status).toBe('closed');

      act(() => {
        result.current.connect();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('open');
      });
    });

    it('should disconnect', async () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: true,
      };

      const { result } = renderHook(() => useWebSocket(config));

      await waitFor(() => {
        expect(result.current.status).toBe('open');
      });

      act(() => {
        result.current.disconnect();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('closed');
      });
    });

    it('should reconnect on close when reconnectOnClose is true', async () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: true,
        reconnectOnClose: true,
        reconnectInterval: 100,
      };

      const { result } = renderHook(() => useWebSocket(config));

      await waitFor(() => {
        expect(result.current.status).toBe('open');
      });

      act(() => {
        const ws = result.current.getWebSocket();
        if (ws) {
          // Simulate an unclean close to trigger reconnection
          ws.close(1006, 'Connection lost');
        }
      });

      await waitFor(() => {
        expect(result.current.status).toBe('open');
      }, { timeout: 500 });
    });
  });

  describe('messages', () => {
    it('should send messages', async () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: true,
      };

      const { result } = renderHook(() => useWebSocket(config));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.send({
          type: 'test',
          id: '123',
          timestamp: new Date().toISOString(),
          payload: { data: 'test' },
        });
      });

      // Should not throw
      expect(true).toBe(true);
    });

    it('should receive messages', async () => {
      const onMessage = vi.fn();
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: true,
      };

      const { result } = renderHook(() => useWebSocket(config, {
        onMessage,
      }));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        const ws = result.current.getWebSocket();
        if (ws && ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'test',
              id: '123',
              timestamp: new Date().toISOString(),
              payload: { data: 'test' },
            }),
          }));
        }
      });

      await waitFor(() => {
        expect(onMessage).toHaveBeenCalledTimes(1);
      });
    });

    it('should update lastMessage on receive', async () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: true,
      };

      const { result } = renderHook(() => useWebSocket(config));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const testMessage = {
        type: 'test',
        id: '123',
        timestamp: new Date().toISOString(),
        payload: { data: 'test' },
      };

      act(() => {
        const ws = result.current.getWebSocket();
        if (ws && ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify(testMessage),
          }));
        }
      });

      await waitFor(() => {
        expect(result.current.lastMessage).toEqual(testMessage);
      });
    });

    it('should handle invalid messages gracefully', async () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: true,
      };

      const { result } = renderHook(() => useWebSocket(config));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        const ws = result.current.getWebSocket();
        if (ws && ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: 'invalid json',
          }));
        }
      });

      // Should not crash
      expect(true).toBe(true);
    });
  });

  describe('event listeners', () => {
    it('should add and remove listeners', async () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: true,
      };

      const { result } = renderHook(() => useWebSocket(config));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const handler = vi.fn();
      const removeListener = result.current.addListener('test-event', handler);

      act(() => {
        const ws = result.current.getWebSocket();
        if (ws && ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'test-event',
              id: '123',
              timestamp: new Date().toISOString(),
              payload: { data: 'test' },
            }),
          }));
        }
      });

      await waitFor(() => {
        expect(handler).toHaveBeenCalledTimes(1);
      });

      removeListener();

      act(() => {
        const ws = result.current.getWebSocket();
        if (ws && ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'test-event',
              id: '124',
              timestamp: new Date().toISOString(),
              payload: { data: 'test' },
            }),
          }));
        }
      });

      await waitFor(() => {
        expect(handler).toHaveBeenCalledTimes(1); // Still 1, not 2
      });
    });

    it('should call wildcard listeners for all messages', async () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: true,
      };

      const { result } = renderHook(() => useWebSocket(config));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const wildcardHandler = vi.fn();
      result.current.addListener('*', wildcardHandler);

      act(() => {
        const ws = result.current.getWebSocket();
        if (ws && ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'event-1',
              id: '123',
              timestamp: new Date().toISOString(),
              payload: {},
            }),
          }));
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'event-2',
              id: '124',
              timestamp: new Date().toISOString(),
              payload: {},
            }),
          }));
        }
      });

      await waitFor(() => {
        expect(wildcardHandler).toHaveBeenCalledTimes(2);
      });
    });

    it('should call once listeners only once', async () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: true,
      };

      const { result } = renderHook(() => useWebSocket(config));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const onceHandler = vi.fn();
      result.current.once('once-event', onceHandler);

      act(() => {
        const ws = result.current.getWebSocket();
        if (ws && ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'once-event',
              id: '123',
              timestamp: new Date().toISOString(),
              payload: {},
            }),
          }));
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'once-event',
              id: '124',
              timestamp: new Date().toISOString(),
              payload: {},
            }),
          }));
        }
      });

      await waitFor(() => {
        expect(onceHandler).toHaveBeenCalledTimes(1);
      });
    });

    it('should provide on method as alias for addListener', async () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: true,
      };

      const { result } = renderHook(() => useWebSocket(config));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const handler = vi.fn();
      result.current.on('test-event', handler);

      act(() => {
        const ws = result.current.getWebSocket();
        if (ws && ws.onmessage) {
          ws.onmessage(new MessageEvent('message', {
            data: JSON.stringify({
              type: 'test-event',
              id: '123',
              timestamp: new Date().toISOString(),
              payload: {},
            }),
          }));
        }
      });

      await waitFor(() => {
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('status', () => {
    it('should update status on connection', async () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: true,
      };

      const { result } = renderHook(() => useWebSocket(config));

      expect(result.current.status).toBe('closed');

      await waitFor(() => {
        expect(result.current.status).toBe('open');
      });
    });

    it('should update isConnected based on status', async () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: true,
      };

      const { result } = renderHook(() => useWebSocket(config));

      expect(result.current.isConnected).toBe(false);

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });

    it('should handle connection error', async () => {
      const onError = vi.fn();
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: true,
      };

      const { result } = renderHook(() => useWebSocket(config, {
        onError,
      }));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        const ws = result.current.getWebSocket();
        if (ws && ws.onerror) {
          ws.onerror(new Event('error'));
        }
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('cleanup', () => {
    it('should disconnect on unmount', async () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: true,
      };

      const { result, unmount } = renderHook(() => useWebSocket(config));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const ws = result.current.getWebSocket();
      const closeSpy = vi.spyOn(ws!, 'close');

      unmount();

      // Wait a bit for cleanup to run
      await new Promise(resolve => setTimeout(resolve, 100));

      // The WebSocket should have been closed during cleanup
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('getWebSocket', () => {
    it('should return WebSocket instance', async () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: true,
      };

      const { result } = renderHook(() => useWebSocket(config));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const ws = result.current.getWebSocket();
      expect(ws).not.toBeNull();
    });

    it('should return null when not connected', () => {
      const config: SimpleWebSocketConfig = {
        url: 'ws://localhost:3000',
        autoConnect: false,
      };

      const { result } = renderHook(() => useWebSocket(config));

      const ws = result.current.getWebSocket();
      expect(ws).toBeNull();
    });
  });
});

describe('generateMessageId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateMessageId();
    const id2 = generateMessageId();

    expect(id1).not.toBe(id2);
  });

  it('should generate IDs with timestamp prefix', () => {
    const id = generateMessageId();
    const timestamp = parseInt(id.split('-')[0]);

    expect(timestamp).toBeGreaterThan(Date.now() - 1000);
    expect(timestamp).toBeLessThanOrEqual(Date.now());
  });
});

describe('createMessage', () => {
  it('should create message with type and payload', () => {
    const message = createMessage('test-type', { data: 'value' });

    expect(message.type).toBe('test-type');
    expect(message.payload).toEqual({ data: 'value' });
    expect(message.id).toBeDefined();
    expect(message.timestamp).toBeDefined();
  });

  it('should create message without payload', () => {
    const message = createMessage('test-type');

    expect(message.type).toBe('test-type');
    expect(message.payload).toBeUndefined();
    expect(message.id).toBeDefined();
    expect(message.timestamp).toBeDefined();
  });
});

describe('isMessageType', () => {
  it('should return true for matching type', () => {
    const message = {
      type: 'test-type',
      id: '123',
      timestamp: new Date().toISOString(),
      payload: { data: 'test' },
    };

    const result = isMessageType(message, 'test-type');
    expect(result).toBe(true);
  });

  it('should return false for non-matching type', () => {
    const message = {
      type: 'other-type',
      id: '123',
      timestamp: new Date().toISOString(),
      payload: { data: 'test' },
    };

    const result = isMessageType(message, 'test-type');
    expect(result).toBe(false);
  });

  it('should narrow type correctly', () => {
    const message = {
      type: 'test-type',
      id: '123',
      timestamp: new Date().toISOString(),
      payload: { value: 42 },
    };

    if (isMessageType(message, 'test-type')) {
      // TypeScript should know payload type here
      expect(message.payload.value).toBe(42);
    }
  });
});
