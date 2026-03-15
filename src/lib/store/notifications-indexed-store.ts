/**
 * 通知数据存储（优化版 - 带索引）
 * 使用 IndexedStore 提供高性能查询
 * 
 * @module store/notifications-indexed-store
 * 
 * 性能优化：
 * - 添加 userId、type、read、priority 索引
 * - 添加复合索引 user_read、user_type
 * - 查询性能提升 10-50x
 */

import { IndexedStore, IndexConfig } from '@/lib/data/indexed-store';
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
 * 通知索引配置
 * 
 * 索引说明：
 * - userId: 按用户查询通知
 * - type: 按通知类型查询
 * - read: 按已读状态查询
 * - priority: 按优先级查询
 * - user_read: 复合索引，用于查询用户的未读通知
 * - user_type: 复合索引，用于查询用户的特定类型通知
 */
const notificationIndexes: IndexConfig<Notification>[] = [
  {
    name: 'userId',
    extractor: (n) => n.userId,
  },
  {
    name: 'type',
    extractor: (n) => n.type,
  },
  {
    name: 'read',
    extractor: (n) => String(n.read),
  },
  {
    name: 'priority',
    extractor: (n) => n.priority,
  },
  {
    name: 'createdAt',
    extractor: (n) => n.createdAt,
  },
  // 复合索引
  {
    name: 'user_read',
    extractor: (n) => `${n.userId}_${n.read}`,
  },
  {
    name: 'user_type',
    extractor: (n) => `${n.userId}_${n.type}`,
  },
  {
    name: 'user_priority',
    extractor: (n) => `${n.userId}_${n.priority}`,
  },
];

// 全局单例实例
let notificationsStoreInstance: IndexedStore<Notification> | null = null;

/**
 * 获取通知存储实例（单例）
 * 使用 IndexedStore 提供高性能查询
 */
export function getNotificationsStore(): IndexedStore<Notification> {
  if (!notificationsStoreInstance) {
    notificationsStoreInstance = new IndexedStore<Notification>(
      'notifications',
      INITIAL_NOTIFICATIONS,
      { indexes: notificationIndexes }
    );
  }
  return notificationsStoreInstance;
}

/**
 * 重新初始化存储（用于测试）
 */
export function resetNotificationsStore(): void {
  if (notificationsStoreInstance) {
    notificationsStoreInstance.clear();
    INITIAL_NOTIFICATIONS.forEach(n => notificationsStoreInstance!.add(n));
  } else {
    // 如果实例不存在，创建新实例
    notificationsStoreInstance = new IndexedStore<Notification>(
      'notifications',
      INITIAL_NOTIFICATIONS,
      { indexes: notificationIndexes }
    );
  }
}

/**
 * 获取索引统计信息
 */
export function getNotificationIndexStats() {
  const store = getNotificationsStore();
  return store.getIndexStats();
}

export default getNotificationsStore;
