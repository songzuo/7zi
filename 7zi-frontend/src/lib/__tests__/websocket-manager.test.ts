/**
 * WebSocket Manager Tests
 *
 * Tests for WebSocket stability features:
 * - Heartbeat monitoring
 * - Exponential backoff reconnection
 * - Connection state management
 * - Message queuing
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { WebSocketManager, ConnectionState } from '@/lib/websocket-manager';
import { io, Socket } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('WebSocketManager', () => {
  let mockSocket: Partial<Socket>;
  let wsManager: WebSocketManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create mock socket
    mockSocket = {
      connected: false,
      emit: vi.fn(),
      on: vi.fn(),
      disconnect: vi.fn(),
      onAny: vi.fn(),
    };

    (io as Mock).mockReturnValue(mockSocket as Socket);
  });

  afterEach(() => {
    vi.useRealTimers();
    if (wsManager) {
      wsManager.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should connect to server and update state', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      });

      wsManager.connect();

      expect(io).toHaveBeenCalledWith('http://localhost:3001', expect.any(Object));
      expect(wsManager.getState()).toBe(ConnectionState.CONNECTING);
    });

    it('should handle successful connection', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      });

      wsManager.connect();

      // Simulate connection success
      const connectCallback = (mockSocket.on as Mock).mock.calls.find(
        (call: [string, Function]) => call[0] === 'connect'
      );
      if (connectCallback) {
        connectCallback[1]();
      }

      expect(wsManager.getState()).toBe(ConnectionState.CONNECTED);
    });

    it('should handle disconnection', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      });

      wsManager.connect();

      // Simulate connection
      const connectCallback = (mockSocket.on as Mock).mock.calls.find(
        (call: [string, Function]) => call[0] === 'connect'
      );
      if (connectCallback) {
        connectCallback[1]();
      }

      // Disconnect
      wsManager.disconnect();

      expect(wsManager.getState()).toBe(ConnectionState.DISCONNECTED);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should notify state change listeners', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      });

      const stateListener = vi.fn();
      wsManager.onStateChange(stateListener);

      wsManager.connect();

      expect(stateListener).toHaveBeenCalledWith(
        ConnectionState.CONNECTING,
        ConnectionState.DISCONNECTED
      );
    });
  });

  describe('Heartbeat Monitoring', () => {
    it('should start heartbeat when connected', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        heartbeatInterval: 25000,
      });

      wsManager.connect();

      // Simulate connection
      const connectCallback = (mockSocket.on as Mock).mock.calls.find(
        (call: [string, Function]) => call[0] === 'connect'
      );
      if (connectCallback) {
        connectCallback[1]();
      }

      // Fast-forward to first heartbeat
      vi.advanceTimersByTime(25000);

      expect(mockSocket.emit).toHaveBeenCalledWith('ping');
    });

    it('should handle pong response', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        heartbeatInterval: 25000,
      });

      wsManager.connect();

      // Simulate connection
      const connectCallback = (mockSocket.on as Mock).mock.calls.find(
        (call: [string, Function]) => call[0] === 'connect'
      );
      if (connectCallback) {
        connectCallback[1]();
      }

      // Simulate pong
      const pongCallback = (mockSocket.on as Mock).mock.calls.find(
        (call: [string, Function]) => call[0] === 'pong'
      );
      if (pongCallback) {
        pongCallback[1]();
      }

      // Should not reconnect after pong
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('Exponential Backoff Reconnection', () => {
    it('should schedule reconnection with exponential backoff', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
      });

      wsManager.connect();

      // Simulate connection
      const connectCallback = (mockSocket.on as Mock).mock.calls.find(
        (call: [string, Function]) => call[0] === 'connect'
      );
      if (connectCallback) {
        connectCallback[1]();
      }

      // Simulate disconnection
      const disconnectCallback = (mockSocket.on as Mock).mock.calls.find(
        (call: [string, Function]) => call[0] === 'disconnect'
      );
      if (disconnectCallback) {
        disconnectCallback[1]('transport close');
      }

      expect(wsManager.getState()).toBe(ConnectionState.RECONNECTING);

      // Fast-forward to reconnection
      vi.advanceTimersByTime(1000);

      expect(io).toHaveBeenCalledTimes(2); // Initial + first reconnection
    });

    it('should increase delay exponentially', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
      });

      wsManager.connect();

      // Simulate connection then immediate disconnect
      const connectCallback = (mockSocket.on as Mock).mock.calls.find(
        (call: [string, Function]) => call[0] === 'connect'
      );
      if (connectCallback) {
        connectCallback[1]();
      }

      const disconnectCallback = (mockSocket.on as Mock).mock.calls.find(
        (call: [string, Function]) => call[0] === 'disconnect'
      );
      if (disconnectCallback) {
        disconnectCallback[1]('transport close');
      }

      // First reconnection
      vi.advanceTimersByTime(1000);
      expect(io).toHaveBeenCalledTimes(2);

      // Second reconnection (2 seconds)
      vi.advanceTimersByTime(2000);
      expect(io).toHaveBeenCalledTimes(3);

      // Third reconnection (4 seconds)
      vi.advanceTimersByTime(4000);
      expect(io).toHaveBeenCalledTimes(4);
    });
  });

  describe('Message Queuing', () => {
    it('should queue messages when disconnected', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      });

      wsManager.emit('test_event', { data: 'test' });

      expect(wsManager.getQueueSize()).toBe(1);
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should send queued messages when connected', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      });

      // Queue a message
      wsManager.emit('test_event', { data: 'test' });
      expect(wsManager.getQueueSize()).toBe(1);

      // Connect
      wsManager.connect();

      // Simulate connection
      const connectCallback = (mockSocket.on as Mock).mock.calls.find(
        (call: [string, Function]) => call[0] === 'connect'
      );
      if (connectCallback) {
        connectCallback[1]();
      }

      // Queued message should be sent
      expect(mockSocket.emit).toHaveBeenCalledWith('test_event', { data: 'test' });
      expect(wsManager.getQueueSize()).toBe(0);
    });

    it('should remove expired messages from queue', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        queueExpiry: 60000, // 1 minute
      });

      wsManager.emit('test_event', { data: 'test' });

      // Fast-forward past expiry
      vi.advanceTimersByTime(61000);

      // Emit another message (triggers cleanup)
      wsManager.emit('test_event2', { data: 'test2' });

      expect(wsManager.getQueueSize()).toBe(1);
    });

    it('should respect max queue size', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
        maxQueueSize: 3,
      });

      // Add more messages than max
      wsManager.emit('msg1', { data: '1' });
      wsManager.emit('msg2', { data: '2' });
      wsManager.emit('msg3', { data: '3' });
      wsManager.emit('msg4', { data: '4' });

      expect(wsManager.getQueueSize()).toBe(3);
    });
  });

  describe('Message Handling', () => {
    it('should notify message listeners', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      });

      const listener = vi.fn();
      wsManager.on('test_event', listener);

      // Simulate incoming message
      const anyCallback = (mockSocket.onAny as Mock).mock.calls[0][1];
      anyCallback('test_event', { data: 'test' });

      expect(listener).toHaveBeenCalledWith('test_event', { data: 'test' });
    });

    it('should allow removing message listeners', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      });

      const listener = vi.fn();
      wsManager.on('test_event', listener);

      // Simulate incoming message
      const anyCallback = (mockSocket.onAny as Mock).mock.calls[0][1];
      anyCallback('test_event', { data: 'test' });

      expect(listener).toHaveBeenCalledTimes(1);

      // Remove listener
      wsManager.off('test_event', listener);

      // Simulate another message
      anyCallback('test_event', { data: 'test2' });

      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('Connection State', () => {
    it('should correctly report connection state', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      });

      expect(wsManager.isConnected()).toBe(false);

      wsManager.connect();

      const connectCallback = (mockSocket.on as Mock).mock.calls.find(
        (call: [string, Function]) => call[0] === 'connect'
      );
      if (connectCallback) {
        connectCallback[1]();
      }

      expect(wsManager.isConnected()).toBe(true);
    });
  });

  describe('Queue Management', () => {
    it('should clear queue', () => {
      wsManager = new WebSocketManager({
        url: 'http://localhost:3001',
        autoConnect: false,
      });

      wsManager.emit('msg1', { data: '1' });
      wsManager.emit('msg2', { data: '2' });

      expect(wsManager.getQueueSize()).toBe(2);

      wsManager.clearQueue();

      expect(wsManager.getQueueSize()).toBe(0);
    });
  });
});
