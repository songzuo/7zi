/**
 * Notification System Initialization Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initializeNotificationSystem,
  isNotificationSystemInitialized,
} from '../notification-init';
import { enhancedNotificationService } from '../services/notification-enhanced';

// Mock enhanced notification service
vi.mock('../services/notification-enhanced', () => ({
  enhancedNotificationService: {
    initialize: vi.fn(),
  },
}));

describe('Notification System Initialization', () => {
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enhancedNotificationService.initialize).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeNotificationSystem', () => {
    it('should initialize notification system successfully', async () => {
      await initializeNotificationSystem();

      expect(enhancedNotificationService.initialize).toHaveBeenCalled();
      expect(isNotificationSystemInitialized()).toBe(true);
    });

    it('should log success message after initialization', async () => {
      await initializeNotificationSystem();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[NotificationSystem] Successfully initialized'
      );
    });

    it('should not initialize multiple times', async () => {
      await initializeNotificationSystem();
      await initializeNotificationSystem();

      expect(enhancedNotificationService.initialize).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[NotificationSystem] Already initialized'
      );
    });

    it('should handle initialization failure', async () => {
      const mockError = new Error('Database connection failed');
      vi.mocked(enhancedNotificationService.initialize).mockRejectedValue(mockError);

      await expect(initializeNotificationSystem()).rejects.toThrow(
        'Database connection failed'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[NotificationSystem] Failed to initialize:',
        mockError
      );

      expect(isNotificationSystemInitialized()).toBe(false);
    });

    it('should log initialization error details', async () => {
      const mockError = new Error('Config missing');
      vi.mocked(enhancedNotificationService.initialize).mockRejectedValue(mockError);

      await expect(initializeNotificationSystem()).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[NotificationSystem] Failed to initialize:',
        mockError
      );
    });
  });

  describe('isNotificationSystemInitialized', () => {
    it('should return false before initialization', () => {
      expect(isNotificationSystemInitialized()).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      await initializeNotificationSystem();

      expect(isNotificationSystemInitialized()).toBe(true);
    });

    it('should return false after failed initialization', async () => {
      vi.mocked(enhancedNotificationService.initialize).mockRejectedValue(
        new Error('Failed')
      );

      try {
        await initializeNotificationSystem();
      } catch {
        // Expected to fail
      }

      expect(isNotificationSystemInitialized()).toBe(false);
    });
  });

  describe('Concurrent Initialization', () => {
    it('should handle concurrent initialization calls', async () => {
      const promises = [
        initializeNotificationSystem(),
        initializeNotificationSystem(),
        initializeNotificationSystem(),
      ];

      await Promise.all(promises);

      // Should only initialize once
      expect(enhancedNotificationService.initialize).toHaveBeenCalledTimes(1);
      expect(isNotificationSystemInitialized()).toBe(true);
    });
  });
});
