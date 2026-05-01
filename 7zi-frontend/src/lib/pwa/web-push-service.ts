/**
 * Web Push Notification Service
 *
 * Handles Web Push API for push notifications
 *
 * @version 1.12.0
 */

import { logger } from '@/lib/logger'

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface PushSubscriptionData extends PushSubscription {
  userId?: string
  createdAt: number
  updatedAt: number
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: Record<string, unknown>
  actions?: {
    action: string
    title: string
    icon?: string
  }[]
  vibrate?: number[]
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
  timestamp?: number
}

/**
 * Web Push Service
 */
export class WebPushService {
  private static instance: WebPushService
  private swRegistration: ServiceWorkerRegistration | null = null
  private subscription: PushSubscription | null = null

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): WebPushService {
    if (!WebPushService.instance) {
      WebPushService.instance = new WebPushService()
    }
    return WebPushService.instance
  }

  /**
   * Initialize Web Push service
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported')
        return false
      }

      // Check if push manager is supported
      if (!('PushManager' in window)) {
        console.warn('Push API not supported')
        return false
      }

      // Wait for service worker to be ready
      this.swRegistration = await navigator.serviceWorker.ready

      // Check for existing subscription
      this.subscription = await this.swRegistration.pushManager.getSubscription()

      if (this.subscription) {
        logger.debug('Found existing push subscription')
      }

      return true
    } catch (error) {
      logger.error('Failed to initialize Web Push service:', error)
      return false
    }
  }

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window
  }

  /**
   * Check if user has granted permission
   */
  async getPermissionState(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied'
    }

    return Notification.permission
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    try {
      const permission = await Notification.requestPermission()
      logger.debug('Notification permission:', permission)
      return permission
    } catch (error) {
      logger.error('Failed to request notification permission:', error)
      return 'denied'
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(applicationServerKey: string): Promise<PushSubscription | null> {
    try {
      if (!this.swRegistration) {
        throw new Error('Service Worker not initialized')
      }

      // Check if already subscribed
      if (this.subscription) {
        logger.debug('Already subscribed to push notifications')
        return this.subscription.toJSON() as PushSubscription
      }

      // Convert VAPID key to Uint8Array
      const convertedVapidKey = this.urlBase64ToUint8Array(applicationServerKey)

      // Subscribe
      this.subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      })

      logger.debug('Successfully subscribed to push notifications')
      return this.subscription.toJSON() as PushSubscription
    } catch (error) {
      logger.error('Failed to subscribe to push notifications:', error)
      return null
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.subscription) {
        logger.debug('No active subscription to unsubscribe')
        return true
      }

      const success = await this.subscription.unsubscribe()

      if (success) {
        logger.debug('Successfully unsubscribed from push notifications')
        this.subscription = null
      }

      return success
    } catch (error) {
      logger.error('Failed to unsubscribe from push notifications:', error)
      return false
    }
  }

  /**
   * Get current subscription
   */
  getSubscription(): PushSubscription | null {
    return this.subscription
  }

  /**
   * Check if subscribed
   */
  isSubscribed(): boolean {
    return this.subscription !== null
  }

  /**
   * Send test notification (local only)
   */
  async showLocalNotification(payload: PushNotificationPayload): Promise<void> {
    try {
      if (!this.swRegistration) {
        throw new Error('Service Worker not initialized')
      }

      await this.swRegistration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/icon-72x72.png',
        image: payload.image,
        data: payload.data,
        actions: payload.actions,
        vibrate: payload.vibrate || [200, 100, 200],
        tag: payload.tag || 'default',
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        timestamp: payload.timestamp || Date.now(),
      })
    } catch (error) {
      logger.error('Failed to show local notification:', error)
    }
  }

  /**
   * Convert URL base64 to Uint8Array
   * Required for Web Push API
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }

  /**
   * Send subscription to server
   */
  async sendSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
    try {
      const response = await fetch('/api/pwa/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      })

      return response.ok
    } catch (error) {
      logger.error('Failed to send subscription to server:', error)
      return false
    }
  }

  /**
   * Remove subscription from server
   */
  async removeSubscriptionFromServer(subscription: PushSubscription): Promise<boolean> {
    try {
      const response = await fetch('/api/pwa/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      })

      return response.ok
    } catch (error) {
      logger.error('Failed to remove subscription from server:', error)
      return false
    }
  }
}

// Export singleton
export const webPushService = WebPushService.getInstance()
