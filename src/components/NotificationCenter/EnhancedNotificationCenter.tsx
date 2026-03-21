/**
 * Enhanced Notification Center Component
 * Features:
 * - Notification types (task assignment, deadlines, mentions, team updates)
 * - Notification priorities (normal, important, urgent)
 * - Notification preferences (toggles per type)
 * - Unread count badge
 * - Real-time updates via WebSocket
 * - Mark as read/unread, delete, bulk actions
 * - Filter by type and priority
 */

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore, useFetchNotifications } from '@/lib/notifications/store';
import { NotificationType, NotificationPriority, NotificationStatus } from '@/types/notifications';
import { NotificationPreferences } from './NotificationPreferences';
import { NotificationFilter } from './NotificationFilter';

// ============================================================================
// Types
// ============================================================================

export interface NotificationCenterProps {
  className?: string;
  maxVisible?: number;
  showUnreadBadge?: boolean;
}

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  created_at: string;
  read_at?: string;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

const PRIORITY_ORDER = {
  [NotificationPriority.URGENT]: 1,
  [NotificationPriority.HIGH]: 2,
  [NotificationPriority.NORMAL]: 3,
  [NotificationPriority.LOW]: 4,
};

const PRIORITY_COLORS = {
  [NotificationPriority.URGENT]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  [NotificationPriority.HIGH]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  [NotificationPriority.NORMAL]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  [NotificationPriority.LOW]: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const TYPE_ICONS = {
  [NotificationType.TASK_ASSIGNED]: '📋',
  [NotificationType.TASK_UPDATED]: '✏️',
  [NotificationType.TASK_COMPLETED]: '✅',
  [NotificationType.TASK_OVERDUE]: '⚠️',
  [NotificationType.MEETING_REMINDER]: '📅',
  [NotificationType.MEETING_STARTED]: '🔔',
  [NotificationType.MEETING_CANCELED]: '🚫',
  [NotificationType.SYSTEM_ANNOUNCEMENT]: '📢',
  [NotificationType.USER_MENTION]: '💬',
  [NotificationType.PROJECT_UPDATE]: '📁',
  [NotificationType.REPORT_READY]: '📊',
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}

// ============================================================================
// Components
// ============================================================================

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
}

function NotificationBadge({ count, maxCount = 99 }: NotificationBadgeProps) {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className={`absolute -top-1 -right-1 flex items-center justify-center ${
        count > maxCount ? 'px-1.5' : 'w-5 h-5'
      } bg-red-500 text-white text-xs font-bold rounded-full`}
    >
      {count > maxCount ? `${maxCount}+` : count}
    </motion.span>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  preferences: NotificationPreferences;
}

function NotificationItem({ notification, onMarkAsRead, onDelete, preferences }: NotificationItemProps) {
  const isUnread = notification.status === NotificationStatus.UNREAD;
  const icon = TYPE_ICONS[notification.type] || '🔔';
  const priorityColor = PRIORITY_COLORS[notification.priority];
  const formattedTime = formatRelativeTime(notification.created_at);

  // Check if this notification type is enabled
  const isEnabled = preferences.enabled_types.includes(notification.type) && preferences.enabled;

  const handleClick = () => {
    if (isUnread) {
      onMarkAsRead(notification.id);
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead(notification.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`
        relative px-4 py-3 cursor-pointer transition-colors
        ${isUnread ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
        hover:bg-gray-50 dark:hover:bg-gray-800/50
        ${!isEnabled ? 'opacity-50 grayscale' : ''}
      `}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-2xl">{icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`text-sm font-medium truncate ${
                isUnread
                  ? 'text-gray-900 dark:text-white font-semibold'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {notification.title}
            </h4>
            {isUnread && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
            )}
          </div>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {notification.content}
          </p>

          <div className="mt-2 flex items-center gap-2">
            {/* Priority Badge */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityColor}`}
            >
              {notification.priority}
            </span>

            {/* Time */}
            <span className="text-xs text-gray-400">{formattedTime}</span>
          </div>

          {/* Action Button */}
          {notification.actionText && (
            <button className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
              {notification.actionText}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex flex-col gap-1">
          {isUnread && (
            <button
              onClick={handleMarkAsRead}
              className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              title="标记已读"
              aria-label="标记已读"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="删除"
            aria-label="删除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </motion.li>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export const EnhancedNotificationCenter: React.FC<NotificationCenterProps> = ({
  className = '',
  maxVisible = 10,
  showUnreadBadge = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [filter, setFilter] = useState<{ type?: NotificationType; priority?: NotificationPriority }>({});

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    preferences,
    updatePreferences,
  } = useNotificationStore();

  const { fetch } = useFetchNotifications();

  // Fetch notifications on mount
  useEffect(() => {
    fetch();
  }, [fetch]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter.type && n.type !== filter.type) return false;
      if (filter.priority && n.priority !== filter.priority) return false;
      return true;
    });
  }, [notifications, filter]);

  // Sort notifications
  const sortedNotifications = useMemo(() => {
    return [...filteredNotifications].sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredNotifications]);

  // Visible notifications
  const visibleNotifications = useMemo(() => {
    return sortedNotifications.slice(0, maxVisible);
  }, [sortedNotifications, maxVisible]);

  // Handlers
  const handleMarkAllAsRead = async () => {
    // Update local state
    markAllAsRead();

    // Bulk update via API
    const unreadIds = notifications
      .filter((n) => n.status === NotificationStatus.UNREAD)
      .map((n) => n.id);

    if (unreadIds.length > 0) {
      await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_ids: unreadIds,
          action: 'mark_read',
        }),
      });
    }
  };

  const handleClearAll = async () => {
    // Update local state
    clearAll();

    // Delete all via API
    const allIds = notifications.map((n) => n.id);

    if (allIds.length > 0) {
      await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_ids: allIds,
          action: 'delete',
        }),
      });
    }

    setIsOpen(false);
  };

  const handleMarkAsRead = async (id: string) => {
    // Update local state
    markAsRead(id);

    // Update via API
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'read' }),
    });
  };

  const handleDelete = async (id: string) => {
    // Update local state
    removeNotification(id);

    // Delete via API
    await fetch(`/api/notifications/${id}`, {
      method: 'DELETE',
    });
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="通知中心"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {showUnreadBadge && unreadCount > 0 && (
          <NotificationBadge count={unreadCount} />
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Notification Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
            >
              {showPreferences ? (
                /* Preferences Panel */
                <NotificationPreferences
                  preferences={preferences}
                  onClose={() => setShowPreferences(false)}
                  onSave={(newPrefs) => {
                    updatePreferences(newPrefs);
                    setShowPreferences(false);
                  }}
                />
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      通知中心
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowPreferences(true)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="通知设置"
                        aria-label="通知设置"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                        >
                          全部已读
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={handleClearAll}
                          className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                        >
                          清空
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter */}
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <NotificationFilter filter={filter} onChange={setFilter} />
                  </div>

                  {/* Notification List */}
                  <div className="max-h-96 overflow-y-auto">
                    {visibleNotifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                        <svg className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-sm font-medium">暂无通知</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        <AnimatePresence>
                          {visibleNotifications.map((notification) => (
                            <NotificationItem
                              key={notification.id}
                              notification={notification as Notification}
                              onMarkAsRead={handleMarkAsRead}
                              onDelete={handleDelete}
                              preferences={preferences}
                            />
                          ))}
                        </AnimatePresence>
                      </ul>
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > maxVisible && (
                    <div className="px-4 py-2 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      还有 {notifications.length - maxVisible} 条通知
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedNotificationCenter;
