/**
 * Notification Types
 *
 * Shared types for notification system (works on both client and server)
 */

// Notification types as const object (for runtime use)
export const NotificationType = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  TASK_ASSIGNED: 'task_assigned',
  TASK_COMPLETED: 'task_completed',
  TASK_UPDATED: 'task_updated',
  MESSAGE: 'message',
  SYSTEM: 'system',
} as const;

// Type derived from the const
export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

// Priority levels as const object (for runtime use)
export const NotificationPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// Type derived from the const
export type NotificationPriority = typeof NotificationPriority[keyof typeof NotificationPriority];

// Notification interface
export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  userId?: string;
  teamId?: string;
  taskId?: string;
  read: boolean;
  createdAt: number;
  expiresAt?: number;
}

// Other interfaces
export interface NotificationSubscription {
  userId?: string;
  teamId?: string;
  channels: string[];
}

export interface NotificationFilter {
  type?: NotificationType | NotificationType[];
  priority?: NotificationPriority | NotificationPriority[];
  userId?: string;
  teamId?: string;
  taskId?: string;
  read?: boolean;
  since?: number;
  limit?: number;
  offset?: number;
  startTime?: number;
  endTime?: number;
}
