/**
 * Notification System Initialization
 *
 * This script initializes the enhanced notification service
 * on server startup. It should be imported in the app's entry point.
 */

import { enhancedNotificationService } from '@/lib/services/notification-enhanced'

export let _initialized = false
let _initPromise: Promise<void> | null = null

/**
 * Reset the notification system state (for testing only)
 */
export function _resetNotificationSystem(): void {
  _initialized = false
  _initPromise = null
}

/**
 * Initialize the notification system
 * Call this once during application startup
 */
export async function initializeNotificationSystem(): Promise<void> {
  // If already initialized, return immediately
  if (_initialized) {
    console.log('[NotificationSystem] Already initialized')
    return
  }

  // If initialization is in progress, wait for it
  if (_initPromise) {
    console.log('[NotificationSystem] Initialization in progress, waiting...')
    await _initPromise
    return
  }

  // Start new initialization
  _initPromise = (async () => {
    try {
      await enhancedNotificationService.initialize()
      _initialized = true
      console.log('[NotificationSystem] Successfully initialized')
    } catch (error) {
      console.error('[NotificationSystem] Failed to initialize:', error)
      _initPromise = null
      throw error
    }
  })()

  await _initPromise
}

/**
 * Get initialization status
 */
export function isNotificationSystemInitialized(): boolean {
  return _initialized
}
