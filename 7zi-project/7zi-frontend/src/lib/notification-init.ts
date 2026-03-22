/**
 * Notification System Initialization
 *
 * This script initializes the enhanced notification service
 * on server startup. It should be imported in the app's entry point.
 */

import { enhancedNotificationService } from '@/lib/services/notification-enhanced';

let initialized = false;

/**
 * Initialize the notification system
 * Call this once during application startup
 */
export async function initializeNotificationSystem(): Promise<void> {
  if (initialized) {
    console.log('[NotificationSystem] Already initialized');
    return;
  }

  try {
    await enhancedNotificationService.initialize();
    initialized = true;
    console.log('[NotificationSystem] Successfully initialized');
  } catch (error) {
    console.error('[NotificationSystem] Failed to initialize:', error);
    throw error;
  }
}

/**
 * Get initialization status
 */
export function isNotificationSystemInitialized(): boolean {
  return initialized;
}
