/**
 * Notification Types and Models
 * Defines all notification-related types for the 7zi platform
 */

/**
 * Notification type enum
 */
export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  TASK_OVERDUE = 'task_overdue',
  MEETING_REMINDER = 'meeting_reminder',
  MEETING_STARTED = 'meeting_started',
  MEETING_CANCELED = 'meeting_canceled',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  USER_MENTION = 'user_mention',
  PROJECT_UPDATE = 'project_update',
  REPORT_READY = 'report_ready',
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Notification status
 */
export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
}

/**
 * Notification database record
 */
export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  content: string
  priority: NotificationPriority
  status: NotificationStatus
  group_id?: string
  related_id?: string
  related_type?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  read_at?: string
}

/**
 * Notification creation payload
 */
export interface CreateNotificationDto {
  user_id: string
  type: NotificationType
  title: string
  content: string
  priority?: NotificationPriority
  group_id?: string
  related_id?: string
  related_type?: string
  metadata?: Record<string, unknown>
}

/**
 * Notification update payload
 */
export interface UpdateNotificationDto {
  title?: string
  content?: string
  status?: NotificationStatus
  metadata?: Record<string, unknown>
}

/**
 * Notification query filters
 */
export interface NotificationFilters {
  user_id?: string
  type?: NotificationType | NotificationType[]
  status?: NotificationStatus
  priority?: NotificationPriority
  group_id?: string
  related_id?: string
  related_type?: string
  start_date?: string
  end_date?: string
  search?: string
}

/**
 * Notification list response with pagination
 */
export interface NotificationListResponse {
  notifications: Notification[]
  meta: {
    total: number
    unread_count: number
    page: number
    per_page: number
    total_pages: number
  }
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  total: number
  unread: number
  by_type: Record<NotificationType, number>
  by_priority: Record<NotificationPriority, number>
}

/**
 * WebSocket notification event
 */
export interface NotificationEvent {
  type: 'notification_created' | 'notification_updated' | 'notification_deleted'
  notification: Notification
  user_id: string
}

/**
 * Bulk action options
 */
export interface BulkNotificationAction {
  notification_ids: string[]
  action: 'mark_read' | 'mark_unread' | 'archive' | 'delete'
}

/**
 * Notification preferences per user
 */
export interface NotificationPreferences {
  user_id: string
  enabled_types: NotificationType[]
  enabled: boolean
  email_enabled: boolean
  sound_enabled: boolean
}

/**
 * Template for notification messages
 */
export interface NotificationTemplate {
  type: NotificationType
  default_title: string
  default_content: string
  priority: NotificationPriority
}

/**
 * Predefined notification templates
 */
export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  [NotificationType.TASK_ASSIGNED]: {
    type: NotificationType.TASK_ASSIGNED,
    default_title: 'New Task Assigned',
    default_content: 'You have been assigned to task "{{task_name}}"',
    priority: NotificationPriority.NORMAL,
  },
  [NotificationType.TASK_UPDATED]: {
    type: NotificationType.TASK_UPDATED,
    default_title: 'Task Updated',
    default_content: 'Task "{{task_name}}" has been updated',
    priority: NotificationPriority.LOW,
  },
  [NotificationType.TASK_COMPLETED]: {
    type: NotificationType.TASK_COMPLETED,
    default_title: 'Task Completed',
    default_content: 'Task "{{task_name}}" has been completed',
    priority: NotificationPriority.NORMAL,
  },
  [NotificationType.TASK_OVERDUE]: {
    type: NotificationType.TASK_OVERDUE,
    default_title: 'Task Overdue',
    default_content: 'Task "{{task_name}}" is overdue',
    priority: NotificationPriority.HIGH,
  },
  [NotificationType.MEETING_REMINDER]: {
    type: NotificationType.MEETING_REMINDER,
    default_title: 'Meeting Reminder',
    default_content: 'Meeting "{{meeting_title}}" starts in {{minutes}} minutes',
    priority: NotificationPriority.HIGH,
  },
  [NotificationType.MEETING_STARTED]: {
    type: NotificationType.MEETING_STARTED,
    default_title: 'Meeting Started',
    default_content: 'Meeting "{{meeting_title}}" has started',
    priority: NotificationPriority.NORMAL,
  },
  [NotificationType.MEETING_CANCELED]: {
    type: NotificationType.MEETING_CANCELED,
    default_title: 'Meeting Canceled',
    default_content: 'Meeting "{{meeting_title}}" has been canceled',
    priority: NotificationPriority.NORMAL,
  },
  [NotificationType.SYSTEM_ANNOUNCEMENT]: {
    type: NotificationType.SYSTEM_ANNOUNCEMENT,
    default_title: 'System Announcement',
    default_content: '{{message}}',
    priority: NotificationPriority.HIGH,
  },
  [NotificationType.USER_MENTION]: {
    type: NotificationType.USER_MENTION,
    default_title: 'You were mentioned',
    default_content: '{{user}} mentioned you in {{context}}',
    priority: NotificationPriority.NORMAL,
  },
  [NotificationType.PROJECT_UPDATE]: {
    type: NotificationType.PROJECT_UPDATE,
    default_title: 'Project Update',
    default_content: 'Project "{{project_name}}" has been updated',
    priority: NotificationPriority.LOW,
  },
  [NotificationType.REPORT_READY]: {
    type: NotificationType.REPORT_READY,
    default_title: 'Report Ready',
    default_content: 'Your report "{{report_name}}" is ready for download',
    priority: NotificationPriority.NORMAL,
  },
}
