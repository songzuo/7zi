'use client';

/**
 * 通知中心页面
 * 显示和管理用户通知
 * 
 * 优化特性:
 * - 响应式布局
 * - 空状态显示
 * - 加载状态动画
 * - 平滑过渡效果
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'next-intl';

// 通知类型定义
interface Notification {
  id: string;
  type: 'task_assigned' | 'project_update' | 'mention' | 'system_alert';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  userId: string;
  priority?: 'low' | 'medium' | 'high';
  link?: string;
  metadata?: Record<string, unknown>;
}

// 通知图标映射
const typeIcons: Record<string, string> = {
  task_assigned: '📋',
  project_update: '📁',
  mention: '💬',
  system_alert: '⚠️',
};

// 优先级颜色
const priorityColors: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-yellow-500',
  high: 'text-red-500',
};

// Skeleton 加载骨架屏组件
function NotificationSkeleton() {
  return (
    <div className="animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 mb-3"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-700 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-full" />
              <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 空状态组件
function EmptyState({ filter }: { filter: string }) {
  const getMessage = () => {
    switch (filter) {
      case 'unread':
        return { emoji: '✅', title: '全部已读', desc: '暂无未读通知' };
      case 'read':
        return { emoji: '📭', title: '暂无已读', desc: '还没有已读通知' };
      default:
        return { emoji: '🔔', title: '暂无通知', desc: '您目前没有收到任何通知' };
    }
  };

  const { emoji, title, desc } = getMessage();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-6xl mb-4 animate-bounce">{emoji}</div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-500 dark:text-zinc-400 text-center max-w-sm">{desc}</p>
    </div>
  );
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // 获取通知列表
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filter === 'unread') params.append('read', 'false');
      if (filter === 'read') params.append('read', 'true');
      if (selectedType !== 'all') params.append('type', selectedType);
      
      const response = await fetch(`/api/notifications?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filter, selectedType]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // 标记单个通知为已读
  const markAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: true }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  // 标记全部为已读
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // 删除单个通知
  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // 清空所有通知
  const clearAllNotifications = async () => {
    if (!confirm('Are you sure you want to delete all notifications?')) return;
    
    try {
      const response = await fetch('/api/notifications?deleteAll=true', {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-1/4 mb-6" />
          <div className="flex gap-4 mb-6">
            <div className="h-10 bg-gray-200 dark:bg-zinc-700 rounded w-32" />
            <div className="h-10 bg-gray-200 dark:bg-zinc-700 rounded w-40" />
          </div>
          <NotificationSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 页面头部 - 响应式布局 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">通知中心</h1>
          <p className="text-gray-600 dark:text-zinc-400 mt-1">
            {unreadCount > 0 ? `您有 ${unreadCount} 条未读通知` : '暂无未读通知'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            全部标为已读
          </button>
          <button
            onClick={clearAllNotifications}
            disabled={notifications.length === 0}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            清空全部
          </button>
        </div>
      </div>

      {/* 筛选器 - 响应式布局 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={filter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
          className="px-4 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全部</option>
          <option value="unread">未读</option>
          <option value="read">已读</option>
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">所有类型</option>
          <option value="task_assigned">任务分配</option>
          <option value="project_update">项目更新</option>
          <option value="mention">提及</option>
          <option value="system_alert">系统警告</option>
        </select>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* 通知列表 */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border transition-all hover:shadow-md ${
                !notification.read 
                  ? 'border-l-4 border-l-blue-500 border-y-gray-200 dark:border-y-zinc-700 border-r-gray-200 dark:border-r-zinc-700' 
                  : 'border-gray-200 dark:border-zinc-700'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* 图标 */}
                <div className="text-2xl flex-shrink-0">
                  {typeIcons[notification.type]}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className={`font-semibold ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-zinc-300'}`}>
                      {notification.title}
                    </h3>
                    {notification.priority && notification.priority !== 'low' && (
                      <span className={`text-xs ${priorityColors[notification.priority]}`}>
                        {notification.priority === 'high' ? '紧急' : '重要'}
                      </span>
                    )}
                    {!notification.read && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                        未读
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 dark:text-zinc-400 text-sm mb-2">{notification.message}</p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-xs text-gray-400">
                      {formatTime(notification.createdAt)}
                    </span>
                    
                    <div className="flex gap-2 flex-wrap">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          标记已读
                        </button>
                      )}
                      {notification.link && (
                        <button
                          onClick={() => router.push(notification.link!)}
                          className="text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          查看详情
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
