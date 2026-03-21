/**
 * Notifications Library - Exports
 */

// Store
export { useNotificationStore, useFetchNotifications, useCreateNotification } from './store';
export type { NotificationState } from './store';

// Re-export types
export type {
  Notification,
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationFilters,
  NotificationListResponse,
  NotificationStats,
  NotificationPreferences,
  NotificationTemplate,
  NotificationEvent,
  NotificationStatus,
} from '@/types/notifications';

export {
  NotificationType,
  NotificationPriority,
} from '@/types/notifications';

export { NOTIFICATION_TEMPLATES } from '@/types/notifications';
