/**
 * Notification System - 统一导出
 *
 * 导出所有通知系统相关的模块
 *
 * @package 7zi-frontend
 * @version v1.12.2
 */

// Types
export {
  NotificationType,
  NotificationPriority,
  type Notification,
  type NotificationFilter,
  type NotificationSubscription,
} from './notification-types'

// Server-side services
export { NotificationService, notificationService } from './notification'
export { EnhancedNotificationService, enhancedNotificationService, type UserNotificationPreferences, type NotificationDeliveryOptions } from './notification-enhanced'
export { NotificationStorage, notificationStorage } from './notification-storage'
export { NotificationManager, notificationManager, type NotificationGroup, type GroupingConfig, type NotificationManagerConfig } from './notification-manager'

// Client-side services
export { NotificationIndexedDBStorage, notificationIndexedDB } from './notification-indexeddb'
export { ClientNotificationManager, clientNotificationManager, type NotificationStats, type NotificationEvent, type NotificationEventListener } from './client-notification-manager'

// React Hooks
export {
  useNotifications,
  useNotificationGroups,
  useUnreadCount,
  useNotificationStats,
  useNotificationActions,
  useNotificationPreferences,
  useQuietHours,
  useNotificationListener,
  useNotificationCenter,
} from './use-notifications'

// React Components
export { NotificationCenter, NotificationBadge, NotificationPopup } from './notification-center'
