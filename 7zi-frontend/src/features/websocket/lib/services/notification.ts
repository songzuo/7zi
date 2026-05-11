/**
 * Empty notification service stub
 * This file was missing, creating a minimal stub
 */

import { logger } from '@/lib/logger'

export function sendNotification(message: string): void {
  logger.debug('[NotificationService]', message)
}
