/**
 * Service Worker Manager
 *
 * Manages Service Worker lifecycle and communication
 *
 * @version 1.12.0
 */

import { logger } from '@/lib/logger'

export interface SWMessage {
  type: string
  payload?: unknown
}

export interface SWUpdateAvailable {
  type: 'UPDATE_AVAILABLE'
  version: string
}

export interface SWCacheUpdate {
  type: 'CACHE_UPDATED'
  url: string
}

/**
 * Service Worker Manager
 */
export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager
  private registration: ServiceWorkerRegistration | null = null
  private updateCallbacks: Set<(registration: ServiceWorkerRegistration) => void> = new Set()
  private messageCallbacks: Set<(message: SWMessage) => void> = new Set()

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager()
    }
    return ServiceWorkerManager.instance
  }

  /**
   * Initialize Service Worker
   */
  async initialize(): Promise<boolean> {
    try {
      if (!('serviceWorker' in navigator)) {
        logger.warn('Service Worker not supported')
        return false
      }

      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none',
      })

      logger.debug('Service Worker registered:', this.registration)

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              this.notifyUpdateAvailable(this.registration!)
            }
          })
        }
      })

      // Listen for messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleMessage(event.data)
      })

      // Check for updates periodically
      this.startUpdateCheck()

      return true
    } catch (error) {
      logger.error('Failed to register Service Worker:', error)
      return false
    }
  }

  /**
   * Get Service Worker registration
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration
  }

  /**
   * Check if Service Worker is supported
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator
  }

  /**
   * Check if Service Worker is ready
   */
  async isReady(): Promise<boolean> {
    try {
      await navigator.serviceWorker.ready
      return true
    } catch {
      return false
    }
  }

  /**
   * Check for updates
   */
  async checkForUpdates(): Promise<boolean> {
    try {
      if (!this.registration) {
        return false
      }

      await this.registration.update()
      return true
    } catch (error) {
      logger.error('Failed to check for updates:', error)
      return false
    }
  }

  /**
   * Skip waiting and activate new Service Worker
   */
  async skipWaiting(): Promise<void> {
    try {
      if (!this.registration || !this.registration.waiting) {
        return
      }

      // Send message to waiting worker to skip waiting
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })

      // Reload page
      window.location.reload()
    } catch (error) {
      logger.error('Failed to skip waiting:', error)
    }
  }

  /**
   * Send message to Service Worker
   */
  async sendMessage(message: SWMessage): Promise<void> {
    try {
      if (!this.registration || !this.registration.active) {
        throw new Error('Service Worker not active')
      }

      this.registration.active.postMessage(message)
    } catch (error) {
      logger.error('Failed to send message to Service Worker:', error)
    }
  }

  /**
   * Register callback for update available
   */
  onUpdateAvailable(callback: (registration: ServiceWorkerRegistration) => void): () => void {
    this.updateCallbacks.add(callback)
    return () => this.updateCallbacks.delete(callback)
  }

  /**
   * Register callback for messages
   */
  onMessage(callback: (message: SWMessage) => void): () => void {
    this.messageCallbacks.add(callback)
    return () => this.messageCallbacks.delete(callback)
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    try {
      await this.sendMessage({ type: 'CLEAR_CACHES' })
    } catch (error) {
      logger.error('Failed to clear caches:', error)
    }
  }

  /**
   * Preload URLs
   */
  async preloadUrls(urls: string[]): Promise<void> {
    try {
      await this.sendMessage({ type: 'PRELOAD_URLS', payload: urls })
    } catch (error) {
      logger.error('Failed to preload URLs:', error)
    }
  }

  /**
   * Get cache size
   */
  async getCacheSize(): Promise<number> {
    try {
      const response = await fetch('/api/pwa/cache-size')
      if (response.ok) {
        const data = await response.json()
        return data.size || 0
      }
    } catch (error) {
      logger.error('Failed to get cache size:', error)
    }
    return 0
  }

  /**
   * Notify update available
   */
  private notifyUpdateAvailable(registration: ServiceWorkerRegistration): void {
    this.updateCallbacks.forEach(callback => callback(registration))
  }

  /**
   * Handle message from Service Worker
   */
  private handleMessage(message: SWMessage): void {
    this.messageCallbacks.forEach(callback => callback(message))
  }

  /**
   * Start periodic update check
   */
  private startUpdateCheck(): void {
    // Check for updates every hour
    setInterval(() => {
      this.checkForUpdates()
    }, 60 * 60 * 1000)
  }
}

// Export singleton
export const serviceWorkerManager = ServiceWorkerManager.getInstance()