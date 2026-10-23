/**
 * Notification System Initialization Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { enhancedNotificationService } from '../services/notification-enhanced'

// Mock enhanced notification service
vi.mock('../services/notification-enhanced', () => ({
  enhancedNotificationService: {
    initialize: vi.fn(),
  },
}))

// Mock logger：notification-init 通过 logger 记录日志，而非直接调用 console
const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}))

describe('Notification System Initialization', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(enhancedNotificationService.initialize).mockResolvedValue(undefined)

    // Re-import module to get fresh state
    vi.resetModules()
    const mod = await import('../notification-init')
    mod._resetNotificationSystem()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initializeNotificationSystem', () => {
    it('should initialize notification system successfully', async () => {
      const { initializeNotificationSystem } = await import('../notification-init')
      await initializeNotificationSystem()

      expect(enhancedNotificationService.initialize).toHaveBeenCalled()
    })

    it('should log success message after initialization', async () => {
      const { initializeNotificationSystem } = await import('../notification-init')
      await initializeNotificationSystem()

      expect(mockLogger.debug).toHaveBeenCalledWith('[NotificationSystem] Successfully initialized')
    })

    it('should not initialize multiple times', async () => {
      const { initializeNotificationSystem } = await import('../notification-init')
      await initializeNotificationSystem()
      await initializeNotificationSystem()

      expect(enhancedNotificationService.initialize).toHaveBeenCalledTimes(1)
      expect(mockLogger.debug).toHaveBeenCalledWith('[NotificationSystem] Already initialized')
    })

    it('should handle initialization failure', async () => {
      const mockError = new Error('Database connection failed')
      vi.mocked(enhancedNotificationService.initialize).mockRejectedValue(mockError)

      const { initializeNotificationSystem, _resetNotificationSystem } =
        await import('../notification-init')
      _resetNotificationSystem()

      await expect(initializeNotificationSystem()).rejects.toThrow('Database connection failed')

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[NotificationSystem] Failed to initialize:',
        mockError
      )
    })

    it('should log initialization error details', async () => {
      const mockError = new Error('Config missing')
      vi.mocked(enhancedNotificationService.initialize).mockRejectedValue(mockError)

      const { initializeNotificationSystem, _resetNotificationSystem } =
        await import('../notification-init')
      _resetNotificationSystem()

      await expect(initializeNotificationSystem()).rejects.toThrow()

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[NotificationSystem] Failed to initialize:',
        mockError
      )
    })
  })

  describe('isNotificationSystemInitialized', () => {
    it('should return false before initialization', async () => {
      const { isNotificationSystemInitialized } = await import('../notification-init')
      expect(isNotificationSystemInitialized()).toBe(false)
    })

    it('should return true after successful initialization', async () => {
      const { initializeNotificationSystem, isNotificationSystemInitialized } =
        await import('../notification-init')
      await initializeNotificationSystem()
      expect(isNotificationSystemInitialized()).toBe(true)
    })

    it('should return false after failed initialization', async () => {
      const mockError = new Error('Failed')
      vi.mocked(enhancedNotificationService.initialize).mockRejectedValue(mockError)

      const {
        initializeNotificationSystem,
        isNotificationSystemInitialized,
        _resetNotificationSystem,
      } = await import('../notification-init')
      _resetNotificationSystem()

      try {
        await initializeNotificationSystem()
      } catch {
        // Expected to fail
      }

      expect(isNotificationSystemInitialized()).toBe(false)
    })
  })

  describe('Concurrent Initialization', () => {
    it('should handle concurrent initialization calls', async () => {
      const { initializeNotificationSystem, _resetNotificationSystem } =
        await import('../notification-init')
      _resetNotificationSystem()

      const promises = [
        initializeNotificationSystem(),
        initializeNotificationSystem(),
        initializeNotificationSystem(),
      ]

      await Promise.all(promises)

      // Should only initialize once
      expect(enhancedNotificationService.initialize).toHaveBeenCalledTimes(1)
    })
  })
})
