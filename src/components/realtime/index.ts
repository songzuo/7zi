/**
 * Real-time Notifications Index
 * Exports real-time notification components and hooks
 */

// Components
export { NotificationPanel } from './NotificationPanel'
export type { NotificationPanelProps } from './NotificationPanel'

export { TaskUpdateFeed } from './TaskUpdateFeed'
export type { TaskUpdateFeedProps } from './TaskUpdateFeed'

// Hooks
export { useRealtimeNotifications } from '@/lib/realtime/useRealtimeNotifications'
export { useTaskRealtime } from '@/lib/realtime/useTaskRealtime'

// Types
export type {
  RealtimeNotification,
  RealtimeNotificationType,
  NotificationCategory,
} from '@/lib/realtime/types'
