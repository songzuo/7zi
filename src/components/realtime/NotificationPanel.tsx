/**
 * Real-time Notifications Component
 *
 * Displays real-time notifications with support for filtering, marking as read,
 * and clearing notifications.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRealtimeNotifications } from '@/lib/realtime/useRealtimeNotifications';
import { Bell, X, Check, Filter, Trash2, Clock, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { RealtimeNotification, NotificationCategory, RealtimeNotificationType } from '@/lib/realtime/types';

// ============================================================================
// Types
// ============================================================================

export interface NotificationPanelProps {
  userId: string | null;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
  enableSound?: boolean;
  onClose?: () => void;
}

// ============================================================================
// Helper Components
// ============================================================================

function NotificationIcon({ category, type }: { category?: NotificationCategory; type?: RealtimeNotificationType }) {
  const baseClass = 'w-5 h-5';

  if (category === 'error' || type === 'task_assigned' && category === 'warning') {
    return <AlertTriangle className={`${baseClass} text-red-500`} />;
  }

  if (category === 'success') {
    return <CheckCircle className={`${baseClass} text-green-500`} />;
  }

  if (category === 'warning') {
    return <AlertTriangle className={`${baseClass} text-yellow-500`} />;
  }

  return <Info className={`${baseClass} text-blue-500`} />;
}

function PriorityBadge({ priority }: { priority: string }) {
  const variants = {
    low: 'bg-zinc-100 text-zinc-600',
    normal: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600',
  };

  const variant = variants[priority as keyof typeof variants] || variants.normal;

  return (
    <Badge className={variant}>
      {priority}
    </Badge>
  );
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onClear,
}: {
  notification: RealtimeNotification;
  onMarkAsRead: (id: string) => void;
  onClear: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`
        relative p-4 border-b border-zinc-100 dark:border-zinc-700
        transition-all duration-200
        ${notification.read ? 'opacity-60' : 'opacity-100'}
        ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-white dark:bg-zinc-800'}
        ${hovered ? 'shadow-md' : ''}
      `}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <NotificationIcon category={notification.category} type={notification.type} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`font-medium text-sm ${!notification.read ? 'font-semibold' : ''}`}>
              {notification.title}
            </h4>
            <PriorityBadge priority={notification.priority} />
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
            {notification.message}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(notification.timestamp)}
            </span>

            {hovered && (
              <div className="flex items-center gap-2">
                {!notification.read && (
                  <button
                    onClick={() => onMarkAsRead(notification.id)}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onClear(notification.id)}
                  className="text-xs text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400"
                  title="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Action Button */}
          {notification.actionUrl && notification.actionText && (
            <a
              href={notification.actionUrl}
              className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              {notification.actionText} →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

// ============================================================================
// Main Component
// ============================================================================

export function NotificationPanel({
  userId,
  position = 'top-right',
  maxVisible = 10,
  enableSound = false,
  onClose,
}: NotificationPanelProps) {
  const {
    notifications,
    unreadCount,
    loading,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    reconnect,
  } = useRealtimeNotifications(userId, {
    autoConnect: true,
    enableSound,
    maxNotifications: 100,
  });

  const [filter, setFilter] = useState<{
    showUnreadOnly: boolean;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }>({
    showUnreadOnly: false,
  });

  const [showAll, setShowAll] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Position styles
  const positionStyles: Record<string, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter.showUnreadOnly && n.read) return false;
    if (filter.priority && n.priority !== filter.priority) return false;
    return true;
  });

  const visibleNotifications = showAll
    ? filteredNotifications
    : filteredNotifications.slice(0, maxVisible);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Don't close if this is a standalone panel without onClose
        if (onClose) {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!userId) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className={`
        fixed ${positionStyles[position]} w-96 max-h-[600px]
        bg-white dark:bg-zinc-800 rounded-lg shadow-xl
        border border-zinc-200 dark:border-zinc-700
        flex flex-col
        animate-in fade-in slide-in-from-top-2
        z-50
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <Badge variant="default">
                {unreadCount}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              title="Mark all as read"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={notifications.length === 0}
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-zinc-500 dark:text-zinc-400">
            {isConnected ? 'Real-time connected' : 'Reconnecting...'}
          </span>
          {!isConnected && (
            <Button variant="link" size="xs" onClick={reconnect}>
              Reconnect
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
        <Filter className="w-4 h-4 text-zinc-400" />
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={filter.showUnreadOnly}
            onChange={(e) => setFilter({ ...filter, showUnreadOnly: e.target.checked })}
            className="rounded"
          />
          Unread only
        </label>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            Loading notifications...
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          visibleNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
              onClear={clearNotification}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {filteredNotifications.length > maxVisible && (
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-700 text-center">
          <Button
            variant="link"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show less' : `Show all (${filteredNotifications.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}

export default NotificationPanel;
