/**
 * Socket.IO Initialization Unit Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initializeSocketIO, getSocketIO } from '../socket';
import { notificationService } from '../services/notification';

// Mock notification service
vi.mock('../services/notification', () => ({
  notificationService: {
    initialize: vi.fn(),
    getIO: vi.fn(),
    cleanupExpired: vi.fn(),
  },
}));

// Mock setInterval
vi.mock('node:timers', () => ({
  setInterval: vi.fn(),
}));

describe('Socket.IO Initialization', () => {
  let mockHttpServer: HTTPServer;
  let mockIOServer: SocketIOServer;

  beforeEach(() => {
    // Create mock HTTP server
    mockHttpServer = {
      on: vi.fn(),
      listen: vi.fn(),
      close: vi.fn(),
    } as unknown as HTTPServer;

    // Create mock Socket.IO server
    mockIOServer = {
      on: vi.fn(),
      to: vi.fn(),
      emit: vi.fn(),
    } as unknown as SocketIOServer;

    // Clear all mocks
    vi.clearAllMocks();

    // Mock notificationService.getIO to return mock IO server
    vi.mocked(notificationService.getIO).mockReturnValue(mockIOServer);

    // Mock notificationService.initialize
    vi.mocked(notificationService.initialize).mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeSocketIO', () => {
    it('should initialize Socket.IO server successfully', () => {
      const result = initializeSocketIO(mockHttpServer);

      expect(result).toBe(mockIOServer);
      expect(notificationService.initialize).toHaveBeenCalledWith(mockHttpServer);
      expect(notificationService.getIO).toHaveBeenCalled();
    });

    it('should throw error if Socket.IO server initialization fails', () => {
      vi.mocked(notificationService.getIO).mockReturnValue(null);

      expect(() => {
        initializeSocketIO(mockHttpServer);
      }).toThrow('Failed to initialize Socket.IO server');
    });

    it('should set up periodic cleanup interval', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      initializeSocketIO(mockHttpServer);

      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        5 * 60 * 1000 // 5 minutes
      );

      setIntervalSpy.mockRestore();
    });

    it('should log initialization success', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      initializeSocketIO(mockHttpServer);

      expect(consoleSpy).toHaveBeenCalledWith('[Socket.IO] Server initialized and ready');

      consoleSpy.mockRestore();
    });
  });

  describe('getSocketIO', () => {
    it('should return Socket.IO instance when initialized', () => {
      vi.mocked(notificationService.getIO).mockReturnValue(mockIOServer);

      const result = getSocketIO();

      expect(result).toBe(mockIOServer);
    });

    it('should return null when not initialized', () => {
      vi.mocked(notificationService.getIO).mockReturnValue(null);

      const result = getSocketIO();

      expect(result).toBeNull();
    });
  });

  describe('Periodic Cleanup', () => {
    it('should call cleanupExpired periodically', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval').mockImplementation(
        (callback: () => void, _delay: number) => {
          // Call immediately for testing
          callback();
          return 1 as NodeJS.Timeout;
        }
      );

      initializeSocketIO(mockHttpServer);

      expect(notificationService.cleanupExpired).toHaveBeenCalled();

      setIntervalSpy.mockRestore();
    });
  });
});
