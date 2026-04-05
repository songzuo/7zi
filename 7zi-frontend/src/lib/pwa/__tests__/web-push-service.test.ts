/**
 * Web Push Service Tests
 *
 * @version 1.12.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebPushService, webPushService } from '../web-push-service'
import type { PushSubscription, PushNotificationPayload } from '../web-push-service'

// Mock Service Worker API
const mockRegistration = {
  pushManager: {
    getSubscription: vi.fn(),
    subscribe: vi.fn(),
  },
  showNotification: vi.fn(),
}

const mockSubscription = {
  endpoint: 'https://example.com/push/subscription',
  keys: {
    p256dh: 'test-p256dh-key',
    auth: 'test-auth-key',
  },
  toJSON: vi.fn(),
  unsubscribe: vi.fn(),
}

describe('WebPushService', () => {
  let service: WebPushService

  beforeEach(() => {
    service = WebPushService.getInstance()
    vi.clearAllMocks()

    // Mock navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve(mockRegistration as any),
      },
      configurable: true,
    })

    // Mock Notification
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: vi.fn(),
      },
      configurable: true,
    })

    // Mock fetch
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialize', () => {
    it('should initialize successfully when Service Worker is supported', async () => {
      const result = await service.initialize()
      expect(result).toBe(true)
    })

    it('should return false when Service Worker is not supported', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true,
      })

      const result = await service.initialize()
      expect(result).toBe(false)
    })

    it('should return false when Push API is not supported', async () => {
      Object.defineProperty(window, 'PushManager', {
        value: undefined,
        configurable: true,
      })

      const result = await service.initialize()
      expect(result).toBe(false)
    })

    it('should load existing subscription', async () => {
      mockRegistration.pushManager.getSubscription.mockResolvedValue(mockSubscription)
      mockSubscription.toJSON.mockReturnValue(mockSubscription)

      await service.initialize()

      expect(service.getSubscription()).toEqual(mockSubscription)
    })
  })

  describe('isSupported', () => {
    it('should return true when Service Worker and Push API are supported', () => {
      expect(service.isSupported()).toBe(true)
    })

    it('should return false when Service Worker is not supported', () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true,
      })

      expect(service.isSupported()).toBe(false)
    })
  })

  describe('getPermissionState', () => {
    it('should return current permission state', async () => {
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'granted',
        },
        configurable: true,
      })

      const permission = await service.getPermissionState()
      expect(permission).toBe('granted')
    })

    it('should return denied when not supported', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true,
      })

      const permission = await service.getPermissionState()
      expect(permission).toBe('denied')
    })
  })

  describe('requestPermission', () => {
    it('should request notification permission', async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue('granted')
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: mockRequestPermission,
        },
        configurable: true,
      })

      const permission = await service.requestPermission()
      expect(permission).toBe('granted')
      expect(mockRequestPermission).toHaveBeenCalled()
    })

    it('should return denied on error', async () => {
      const mockRequestPermission = vi.fn().mockRejectedValue(new Error('Permission denied'))
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: mockRequestPermission,
        },
        configurable: true,
      })

      const permission = await service.requestPermission()
      expect(permission).toBe('denied')
    })
  })

  describe('subscribe', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should subscribe to push notifications', async () => {
      mockRegistration.pushManager.subscribe.mockResolvedValue(mockSubscription)
      mockSubscription.toJSON.mockReturnValue(mockSubscription)

      const vapidKey = 'test-vapid-key'
      const subscription = await service.subscribe(vapidKey)

      expect(subscription).toEqual(mockSubscription)
      expect(mockRegistration.pushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array),
      })
    })

    it('should return existing subscription if already subscribed', async () => {
      mockRegistration.pushManager.getSubscription.mockResolvedValue(mockSubscription)
      mockSubscription.toJSON.mockReturnValue(mockSubscription)

      await service.initialize()

      const vapidKey = 'test-vapid-key'
      const subscription = await service.subscribe(vapidKey)

      expect(subscription).toEqual(mockSubscription)
      expect(mockRegistration.pushManager.subscribe).not.toHaveBeenCalled()
    })

    it('should return null on error', async () => {
      mockRegistration.pushManager.subscribe.mockRejectedValue(new Error('Subscribe failed'))

      const vapidKey = 'test-vapid-key'
      const subscription = await service.subscribe(vapidKey)

      expect(subscription).toBe(null)
    })
  })

  describe('unsubscribe', () => {
    beforeEach(async () => {
      await service.initialize()
      mockRegistration.pushManager.getSubscription.mockResolvedValue(mockSubscription)
      mockSubscription.toJSON.mockReturnValue(mockSubscription)
      mockSubscription.unsubscribe.mockResolvedValue(true)
    })

    it('should unsubscribe from push notifications', async () => {
      const success = await service.unsubscribe()

      expect(success).toBe(true)
      expect(mockSubscription.unsubscribe).toHaveBeenCalled()
      expect(service.getSubscription()).toBe(null)
    })

    it('should return true when no subscription exists', async () => {
      mockRegistration.pushManager.getSubscription.mockResolvedValue(null)

      const success = await service.unsubscribe()

      expect(success).toBe(true)
    })

    it('should return false on error', async () => {
      mockSubscription.unsubscribe.mockRejectedValue(new Error('Unsubscribe failed'))

      const success = await service.unsubscribe()

      expect(success).toBe(false)
    })
  })

  describe('showLocalNotification', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should show local notification', async () => {
      const payload: PushNotificationPayload = {
        title: 'Test Notification',
        body: 'Test body',
      }

      await service.showLocalNotification(payload)

      expect(mockRegistration.showNotification).toHaveBeenCalledWith('Test Notification', {
        body: 'Test body',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        image: undefined,
        data: undefined,
        actions: undefined,
        vibrate: [200, 100, 200],
        tag: 'default',
        requireInteraction: false,
        silent: false,
        timestamp: expect.any(Number),
      })
    })

    it('should use custom icon and badge', async () => {
      const payload: PushNotificationPayload = {
        title: 'Test',
        body: 'Body',
        icon: '/custom-icon.png',
        badge: '/custom-badge.png',
      }

      await service.showLocalNotification(payload)

      expect(mockRegistration.showNotification).toHaveBeenCalledWith('Test', {
        body: 'Body',
        icon: '/custom-icon.png',
        badge: '/custom-badge.png',
        image: undefined,
        data: undefined,
        actions: undefined,
        vibrate: [200, 100, 200],
        tag: 'default',
        requireInteraction: false,
        silent: false,
        timestamp: expect.any(Number),
      })
    })
  })

  describe('sendSubscriptionToServer', () => {
    it('should send subscription to server', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true })
      global.fetch = mockFetch

      const subscription: PushSubscription = {
        endpoint: 'https://example.com/push/subscription',
        keys: {
          p256dh: 'test-key',
          auth: 'test-auth',
        },
      }

      const result = await service.sendSubscriptionToServer(subscription)

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/pwa/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      })
    })

    it('should return false on error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
      global.fetch = mockFetch

      const subscription: PushSubscription = {
        endpoint: 'https://example.com/push/subscription',
        keys: {
          p256dh: 'test-key',
          auth: 'test-auth',
        },
      }

      const result = await service.sendSubscriptionToServer(subscription)

      expect(result).toBe(false)
    })
  })

  describe('removeSubscriptionFromServer', () => {
    it('should remove subscription from server', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true })
      global.fetch = mockFetch

      const subscription: PushSubscription = {
        endpoint: 'https://example.com/push/subscription',
        keys: {
          p256dh: 'test-key',
          auth: 'test-auth',
        },
      }

      const result = await service.removeSubscriptionFromServer(subscription)

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/pwa/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      })
    })
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = WebPushService.getInstance()
      const instance2 = WebPushService.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should export singleton instance', () => {
      expect(webPushService).toBeInstanceOf(WebPushService)
    })
  })
})