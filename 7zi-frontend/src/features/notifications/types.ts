/**
 * Notifications Feature Types
 */

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  browserEnabled: boolean;
  mobileEnabled: boolean;
  types: NotificationType[];
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}

export interface NotificationStorage {
  save(notifications: Notification[]): void;
  load(): Notification[];
  clear(): void;
}
