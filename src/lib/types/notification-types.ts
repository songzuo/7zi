/**
 * 通知类型定义
 * 定义通知系统的所有类型和接口
 * 
 * @module types/notification-types
 */

import { z } from 'zod';

/**
 * 通知类型枚举
 */
export type NotificationType = 
  | 'task_assigned'    // 任务被分配
  | 'project_update'   // 项目更新
  | 'mention'          // 被提及
  | 'system_alert';    // 系统警告

/**
 * 通知优先级
 */
export type NotificationPriority = 'low' | 'medium' | 'high';

/**
 * 通知接口
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  userId: string;
  priority?: NotificationPriority;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 创建通知请求体
 */
export interface CreateNotificationBody {
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  priority?: NotificationPriority;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 更新通知请求体
 */
export interface UpdateNotificationBody {
  read?: boolean;
}

/**
 * 通知查询参数
 */
export interface NotificationQueryParams {
  userId?: string;
  type?: NotificationType;
  read?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * 通知列表响应
 */
export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

/**
 * Zod 验证模式 - 创建通知
 */
export const createNotificationSchema = z.object({
  type: z.enum(['task_assigned', 'project_update', 'mention', 'system_alert']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  userId: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  link: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Zod 验证模式 - 更新通知
 */
export const updateNotificationSchema = z.object({
  read: z.boolean().optional(),
});

/**
 * 通知类型映射 - 用于前端显示
 */
export const NotificationTypeLabels: Record<NotificationType, string> = {
  task_assigned: '任务分配',
  project_update: '项目更新',
  mention: '提及',
  system_alert: '系统警告',
};

/**
 * 通知类型图标 - 用于前端显示
 */
export const NotificationTypeIcons: Record<NotificationType, string> = {
  task_assigned: '📋',
  project_update: '📁',
  mention: '💬',
  system_alert: '⚠️',
};

/**
 * 通知优先级映射
 */
export const NotificationPriorityColors: Record<NotificationPriority, string> = {
  low: '#6b7280',
  medium: '#f59e0b',
  high: '#ef4444',
};

export default Notification;
