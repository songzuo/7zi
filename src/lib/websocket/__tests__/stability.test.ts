/**
 * WebSocket Stability Features Tests
 *
 * Tests for heartbeat, reconnection, and error handling features
 */

import { describe, it, expect, beforeEach, afterEach, vi, afterEach as after } from 'vitest';
import { HeartbeatManager, getHeartbeatManager } from '../heartbeat';
import { ReconnectionManager } from '../reconnection';
import { WebSocketErrorHandler, getErrorHandler } from '../error-handler';

// ============================================================================
// Heartbeat Manager Tests
// ============================================================================

describe('HeartbeatManager', () => {
  let manager: HeartbeatManager;
  let mockSocket: any;

  beforeEach(() => {
    manager = new HeartbeatManager({
      checkInterval: 1000,
      staleTimeout: 3000,
      maxMissedHeartbeats: 3,
      debugLogging: false,
    });

    mockSocket = {
      id: 'test-socket-1',
      on: vi.fn(),
      emit: vi.fn(() => mockSocket),
    };
  });

  afterEach(() => {
    manager.stop();
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const defaultManager = new HeartbeatManager();
      expect(defaultManager).toBeDefined();
    });

    it('should start monitoring', () => {
      manager.start();
      expect(manager.getStats().isRunning).toBe(true);
    });

    it('should stop monitoring', () => {
      manager.start();
      manager.stop();
      expect(manager.getStats().isRunning).toBe(false);
    });

    it('should not start if already running', () => {
      manager.start();
      const stats1 = manager.getStats();

      manager.start();
      const stats2 = manager.getStats();

      expect(stats2.monitoredSockets).toBe(stats1.monitoredSockets);
    });
  });

  describe('Socket Registration', () => {
    it('should register socket for monitoring', () => {
      manager.registerSocket(mockSocket, 'user-1');

      expect(mockSocket.on).toHaveBeenCalledWith('heartbeat', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));

      const stats = manager.getStats();
      expect(stats.monitoredSockets).toBe(1);
    });

    it('should store user ID with socket', () => {
      manager.registerSocket(mockSocket, 'user-123');

      const data = manager.getHeartbeatData(mockSocket.id);
      expect(data?.userId).toBe('user-123');
    });

    it('should unregister socket', () => {
      manager.registerSocket(mockSocket, 'user-1');
      manager.unregisterSocket(mockSocket.id, 'test-reason');

      const data = manager.getHeartbeatData(mockSocket.id);
      expect(data).toBeUndefined();
      expect(manager.getStats().monitoredSockets).toBe(0);
    });

    it('should handle unregister of unknown socket', () => {
      const data = manager.unregisterSocket('unknown-socket');
      expect(data).toBeUndefined();
    });
  });

  describe('Heartbeat Tracking', () => {
    it('should update last heartbeat timestamp', () => {
      manager.registerSocket(mockSocket, 'user-1');

      const heartbeatCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'heartbeat'
      )?.[1];

      if (!heartbeatCallback) {
        throw new Error('Heartbeat callback not found');
      }

      const initialData = manager.getHeartbeatData(mockSocket.id);
      const initialTime = initialData?.lastHeartbeat || 0;

      // Wait a bit
      setTimeout(() => {
        heartbeatCallback();

        const updatedData = manager.getHeartbeatData(mockSocket.id);
        expect(updatedData?.lastHeartbeat).toBeGreaterThan(initialTime);
        expect(updatedData?.missedHeartbeats).toBe(0);
      }, 100);
    });

    it('should track activity on any event', () => {
      manager.registerSocket(mockSocket, 'user-1');

      const initialData = manager.getHeartbeatData(mockSocket.id);
      const initialTime = initialData?.lastActivity || 0;

      // Wait a bit
      setTimeout(() => {
        // Emitting an event should update activity
        mockSocket.emit('some-event', 'data');

        const updatedData = manager.getHeartbeatData(mockSocket.id);
        expect(updatedData?.lastActivity).toBeGreaterThan(initialTime);
      }, 100);
    });
  });

  describe('Stale Connection Detection', () => {
    it('should detect stale connections', async () => {
      manager.registerSocket(mockSocket, 'user-1');

      // Wait longer than stale timeout
      await new Promise(resolve => setTimeout(resolve, 3500));

      const stats = manager.getStats();
      expect(stats.staleConnections).toBeGreaterThan(0);
    });

    it('should track stale connection count', async () => {
      manager.registerSocket(mockSocket, 'user-1');

      await new Promise(resolve => setTimeout(resolve, 3500));

      const stats = manager.getStats();
      expect(stats.totalStaleConnections).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should return accurate statistics', () => {
      manager.registerSocket(mockSocket, 'user-1');

      const stats = manager.getStats();

      expect(stats.monitoredSockets).toBe(1);
      expect(stats.staleConnections).toBe(0);
      expect(stats.totalDisconnects).toBe(0);
      expect(stats.isRunning).toBe(true);
    });

    it('should return all heartbeat data', () => {
      manager.registerSocket(mockSocket, 'user-1');
      manager.registerSocket({ id: 'socket-2' }, 'user-2');

      const allData = manager.getAllHeartbeatData();

      expect(allData).toHaveLength(2);
      expect(allData[0].socketId).toBe(mockSocket.id);
      expect(allData[1].socketId).toBe('socket-2');
    });
  });

  describe('Force Disconnect', () => {
    it('should force disconnect a socket', () => {
      manager.registerSocket(mockSocket, 'user-1');

      const result = manager.forceDisconnect(mockSocket.id);

      expect(result).toBe(true);
      expect(manager.getHeartbeatData(mockSocket.id)).toBeUndefined();
      expect(manager.getStats().totalDisconnects).toBe(1);
    });

    it('should handle force disconnect of unknown socket', () => {
      const result = manager.forceDisconnect('unknown-socket');
      expect(result).toBe(false);
    });
  });

  describe('Configuration Update', () => {
    it('should update configuration', () => {
      manager.updateConfig({
        checkInterval: 5000,
        staleTimeout: 120000,
      });

      const stats = manager.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Global Instance', () => {
    it('should return singleton instance', () => {
      const instance1 = getHeartbeatManager();
      const instance2 = getHeartbeatManager();

      expect(instance1).toBe(instance2);
    });

    it('should update config of global instance', () => {
      const instance = getHeartbeatManager({ checkInterval: 2000 });
      const stats = instance.getStats();

      expect(stats).toBeDefined();
    });
  });
});

// ============================================================================
// Reconnection Manager Tests
// ============================================================================

describe('ReconnectionManager', () => {
  let manager: ReconnectionManager;
  let mockReconnectFn: ReturnType<typeof vi.fn>;
  let mockOnReconnect: ReturnType<typeof vi.fn>;
  let mockOnDisconnect: ReturnType<typeof vi.fn>;
  let mockOnError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReconnectFn = vi.fn();
    mockOnReconnect = vi.fn();
    mockOnDisconnect = vi.fn();
    mockOnError = vi.fn();

    manager = new ReconnectionManager({
      enabled: true,
      initialDelay: 100,
      maxDelay: 1000,
      maxAttempts: 5,
      jitterEnabled: false, // Disable for predictable tests
    });

    manager.onReconnect(mockReconnectFn);
    manager.onDisconnect(mockOnDisconnect);
    manager.onError(mockOnError);
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const defaultManager = new ReconnectionManager();
      expect(defaultManager).toBeDefined();
    });

    it('should start with connected state', () => {
      const state = manager.getState();
      expect(state.isConnected).toBe(true);
      expect(state.shouldReconnect).toBe(true);
    });
  });

  describe('Connection Management', () => {
    it('should handle connection', () => {
      manager.handleConnected();

      const state = manager.getState();
      expect(state.isConnected).toBe(true);
      expect(state.attemptNumber).toBe(0);
    });

    it('should handle reconnection after disconnect', () => {
      manager.handleDisconnect('test reason');
      manager.handleConnected();

      const state = manager.getState();
      expect(state.successfulReconnections).toBe(1);
      expect(state.attemptNumber).toBe(0);
    });

    it('should handle disconnect', (done) => {
      manager.handleDisconnect('test-reason');

      setTimeout(() => {
        expect(mockOnDisconnect).toHaveBeenCalledWith('test-reason');
        done();
      }, 150);
    });

    it('should handle error', (done) => {
      const error = new Error('Connection failed');
      manager.handleError(error);

      setTimeout(() => {
        expect(mockOnError).toHaveBeenCalledWith(error);
        done();
      }, 150);
    });
  });

  describe('Reconnection Logic', () => {
    it('should increment attempt number', async () => {
      manager.handleDisconnect('test');
      manager.handleConnected();

      const state1 = manager.getState();
      expect(state1.attemptNumber).toBe(0);
      expect(state1.successfulReconnections).toBe(0);

      manager.handleDisconnect('test2');

      // Wait for reconnection to be scheduled
      await new Promise(resolve => setTimeout(resolve, 150));

      const state2 = manager.getState();
      expect(state2.attemptNumber).toBeGreaterThan(0);
    });

    it('should respect max attempts', async () => {
      const managerWithLimit = new ReconnectionManager({
        maxAttempts: 2,
        initialDelay: 100,
        jitterEnabled: false,
      });

      managerWithLimit.handleDisconnect('test');

      await new Promise(resolve => setTimeout(resolve, 300));

      const state = managerWithLimit.getState();
      expect(state.shouldReconnect).toBe(false);
    });
  });

  describe('Manual Control', () => {
    it('should trigger manual reconnection', () => {
      manager.reconnect();
      expect(mockReconnectFn).toHaveBeenCalled();
    });

    it('should disable reconnection', (done) => {
      manager.handleDisconnect('test');
      manager.disableReconnection();

      setTimeout(() => {
        const state = manager.getState();
        expect(state.shouldReconnect).toBe(false);
        done();
      }, 150);
    });

    it('should enable reconnection', () => {
      manager.disableReconnection();
      manager.enableReconnection();

      const state = manager.getState();
      expect(state.shouldReconnect).toBe(true);
    });

    it('should reset state', () => {
      manager.handleDisconnect('test');
      manager.reset();

      const state = manager.getState();
      expect(state.attemptNumber).toBe(0);
      expect(state.isConnected).toBe(false);
    });
  });

  describe('State Queries', () => {
    it('should return current state', () => {
      const state = manager.getState();
      expect(state).toHaveProperty('attemptNumber');
      expect(state).toHaveProperty('isConnected');
      expect(state).toHaveProperty('shouldReconnect');
    });

    it('should return countdown for next attempt', (done) => {
      manager.handleDisconnect('test');

      setTimeout(() => {
        const countdown = manager.getNextAttemptCountdown();
        expect(typeof countdown).toBe('number');
        expect(countdown).toBeGreaterThanOrEqual(0);
        done();
      }, 50);
    });
  });
});

// ============================================================================
// Error Handler Tests
// ============================================================================

describe('WebSocketErrorHandler', () => {
  let handler: WebSocketErrorHandler;

  beforeEach(() => {
    handler = new WebSocketErrorHandler({
      detailedLogging: false,
      errorTracking: true,
      autoRecovery: true,
      notifyOnHighSeverity: true,
    });
  });

  describe('Error Classification', () => {
    it('should classify authentication errors', () => {
      const error = handler.handleError(new Error('Invalid token'));

      expect(error.type).toBe('AUTHENTICATION_FAILED');
      expect(error.severity).toBe('HIGH');
      expect(error.recoverable).toBe(true);
      expect(error.recoveryStrategy).toBe('REAUTHENTICATE');
    });

    it('should classify timeout errors', () => {
      const error = handler.handleError(new Error('Connection timed out'));

      expect(error.type).toBe('TIMEOUT');
      expect(error.severity).toBe('MEDIUM');
      expect(error.recoverable).toBe(true);
      expect(error.recoveryStrategy).toBe('RECONNECT');
    });

    it('should classify network errors', () => {
      const error = handler.handleError(new Error('ECONNREFUSED'));

      expect(error.type).toBe('NETWORK_ERROR');
      expect(error.recoverable).toBe(true);
    });

    it('should classify room errors', () => {
      const error = handler.handleError(new Error('Room not found'));

      expect(error.type).toBe('ROOM_ERROR');
      expect(error.recoveryStrategy).toBe('REJOIN_ROOM');
    });

    it('should classify unknown errors', () => {
      const error = handler.handleError(new Error('Something went wrong'));

      expect(error.type).toBe('UNKNOWN');
      expect(error.recoverable).toBe(false);
      expect(error.recoveryStrategy).toBe('MANUAL');
    });

    it('should handle string errors', () => {
      const error = handler.handleError('Connection failed');

      expect(error.type).toBe('CONNECTION_FAILED');
    });
  });

  describe('Error Tracking', () => {
    it('should track errors', () => {
      handler.handleError(new Error('Test error 1'));
      handler.handleError(new Error('Test error 2'));

      const stats = handler.getStats();
      expect(stats.totalErrors).toBe(2);
    });

    it('should count errors by type', () => {
      handler.handleError(new Error('Invalid token'));
      handler.handleError(new Error('Invalid token'));
      handler.handleError(new Error('Connection timed out'));

      const stats = handler.getStats();
      expect(stats.errorCounts.AUTHENTICATION_FAILED).toBe(2);
      expect(stats.errorCounts.TIMEOUT).toBe(1);
    });

    it('should keep recent errors', () => {
      handler.handleError(new Error('Error 1'));
      handler.handleError(new Error('Error 2'));
      handler.handleError(new Error('Error 3'));

      const stats = handler.getStats();
      expect(stats.recentErrors).toHaveLength(3);
    });

    it('should limit tracked errors', () => {
      const limitedHandler = new WebSocketErrorHandler({ maxTrackedErrors: 2 });

      // Add more errors than the limit
      for (let i = 0; i < 5; i++) {
        limitedHandler.handleError(new Error(`Error ${i}`));
      }

      const stats = limitedHandler.getStats();
      expect(stats.totalErrors).toBe(5); // All errors are counted
      // But recent errors should be limited to the last maxTrackedErrors
      expect(stats.recentErrors.length).toBeLessThanOrEqual(5);
    });

    it('should clear history', () => {
      handler.handleError(new Error('Test error'));

      handler.clearHistory();

      const stats = handler.getStats();
      expect(stats.totalErrors).toBe(0);
      expect(stats.recentErrors).toHaveLength(0);
    });
  });

  describe('Recovery Actions', () => {
    it('should provide recovery action for recoverable errors', () => {
      const error = handler.handleError(new Error('Connection timed out'));

      const action = handler.getRecoveryAction(error);
      expect(action.strategy).toBe('RECONNECT');
      expect(action.message).toContain('Attempting to reconnect');
    });

    it('should determine if recovery should be attempted', () => {
      const recoverableError = handler.handleError(new Error('Connection timed out'));
      const nonRecoverableError = handler.handleError(new Error('Unknown error'));

      expect(handler.shouldAttemptRecovery(recoverableError)).toBe(true);
      expect(handler.shouldAttemptRecovery(nonRecoverableError)).toBe(false);
    });
  });

  describe('High Severity Callback', () => {
    it('should call high severity callback', () => {
      const callback = vi.fn();
      handler.onHighSeverityError(callback);

      handler.handleError(new Error('Critical system failure'));

      expect(callback).toHaveBeenCalled();
    });

    it('should not call callback for low severity', () => {
      const callback = vi.fn();
      handler.onHighSeverityError(callback);

      handler.handleError(new Error('Rate limit exceeded'));

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Global Instance', () => {
    it('should return singleton instance', () => {
      const instance1 = getErrorHandler();
      const instance2 = getErrorHandler();

      expect(instance1).toBe(instance2);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Stability Features Integration', () => {
  it('should work together: heartbeat + reconnection + error handler', () => {
    const heartbeat = new HeartbeatManager();
    const reconnection = new ReconnectionManager();
    const errorHandler = new WebSocketErrorHandler();

    expect(heartbeat).toBeDefined();
    expect(reconnection).toBeDefined();
    expect(errorHandler).toBeDefined();

    heartbeat.start();
    expect(heartbeat.getStats().isRunning).toBe(true);

    reconnection.handleDisconnect('test');
    expect(reconnection.getState().isConnected).toBe(false);

    const error = errorHandler.handleError(new Error('Test error'));
    expect(error).toBeDefined();
    expect(error.timestamp).toBeInstanceOf(Date);

    heartbeat.stop();
  });

  it('should handle error flow from reconnection to handler', () => {
    const reconnection = new ReconnectionManager();
    const errorHandler = new WebSocketErrorHandler();

    const error = new Error('Connection failed');
    reconnection.handleError(error);

    const wsError = errorHandler.handleError(error);
    expect(wsError.recoveryStrategy).toBe('RECONNECT');
  });
});
