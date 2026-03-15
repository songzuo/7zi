/**
 * 通知数据存储
 * 使用文件系统持久化存储通知数据
 * 
 * @module store/notifications-store
 */

import { ArrayStore } from './persistent-store';
import { Notification } from '@/lib/types/notification-types';

/**
 * 初始通知数据
 */
const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    type: 'task_assigned',
    title: '新任务分配',
    message: '您被分配了新任务"系统架构评审"，请及时查看。',
    read: false,
    createdAt: '2026-03-13T08:00:00Z',
    userId: 'user-001',
    priority: 'high',
    link: '/tasks/task-003',
  },
  {
    id: 'notif-002',
    type: 'project_update',
    title: '项目进度更新',
    message: '项目"AI 助手平台"已更新至 v2.0 版本。',
    read: true,
    createdAt: '2026-03-12T15:30:00Z',
    userId: 'user-001',
    priority: 'medium',
    link: '/projects/proj-001',
  },
  {
    id: 'notif-003',
    type: 'mention',
    title: '被提及',
    message: 'architect 在评论中提到了您。',
    read: false,
    createdAt: '2026-03-13T10:15:00Z',
    userId: 'user-001',
    priority: 'medium',
    link: '/tasks/task-003',
  },
  {
    id: 'notif-004',
    type: 'system_alert',
    title: '系统维护通知',
    message: '系统将于 2026-03-14 02:00 进行维护，预计持续 30 分钟。',
    read: true,
    createdAt: '2026-03-13T09:00:00Z',
    userId: 'user-001',
    priority: 'low',
  },
];

/**
 * 通知存储实例
 */
const notificationsStore = new ArrayStore<Notification>('notifications', INITIAL_NOTIFICATIONS);

/**
 * 获取通知存储
 */
export function getNotificationsStore(): ArrayStore<Notification> {
  return notificationsStore;
}

/**
 * 重新初始化存储（用于测试）
 */
export function resetNotificationsStore(): void {
  notificationsStore.clear();
  INITIAL_NOTIFICATIONS.forEach(n => notificationsStore.add(n));
}

export default notificationsStore;
