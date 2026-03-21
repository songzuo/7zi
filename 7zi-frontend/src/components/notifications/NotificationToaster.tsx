/**
 * NotificationToaster Component
 *
 * Container for displaying notification toasts
 */

'use client';

import { Notification } from '@/lib/services/notification';
import { NotificationToast } from './NotificationToast';
import { useEffect, useState } from 'react';

interface NotificationToasterProps {
  notifications: Notification[];
  maxVisible?: number;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function NotificationToaster({
  notifications,
  maxVisible = 5,
  onMarkRead,
  onDelete,
  position = 'top-right',
}: NotificationToasterProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Keep only unread and recent notifications
    const recent = notifications
      .filter(n => !n.read)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, maxVisible);

    setVisibleNotifications(recent);
  }, [notifications, maxVisible]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const handleClose = (id: string) => {
    onDelete(id);
  };

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed z-50 ${getPositionClasses()} w-full max-w-sm pointer-events-none`}
    >
      <div className="pointer-events-auto">
        {visibleNotifications.map(notification => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={() => handleClose(notification.id)}
            onMarkRead={onMarkRead}
          />
        ))}
      </div>
    </div>
  );
}
