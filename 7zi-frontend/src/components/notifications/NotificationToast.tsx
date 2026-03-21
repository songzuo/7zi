/**
 * NotificationToast Component
 *
 * Displays individual notification toasts with animations
 */

'use client';

import { Notification, NotificationType } from '@/lib/services/notification';
import { X, Info, CheckCircle, AlertTriangle, XCircle, MessageSquare, Bell } from 'lucide-react';
import { useEffect, useState } from 'react';

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function NotificationToast({
  notification,
  onClose,
  onMarkRead,
  autoHide = true,
  autoHideDelay = 5000,
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animation in
    requestAnimationFrame(() => setIsVisible(true));

    // Auto hide
    if (autoHide) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay]);

  const handleClose = () => {
    setIsLeaving(true);
    onMarkRead(notification.id);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case NotificationType.SUCCESS:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case NotificationType.WARNING:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case NotificationType.ERROR:
        return <XCircle className="h-5 w-5 text-red-500" />;
      case NotificationType.MESSAGE:
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case NotificationType.TASK_ASSIGNED:
      case NotificationType.TASK_COMPLETED:
      case NotificationType.TASK_UPDATED:
        return <Bell className="h-5 w-5 text-purple-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case NotificationType.SUCCESS:
        return 'border-green-500';
      case NotificationType.WARNING:
        return 'border-yellow-500';
      case NotificationType.ERROR:
        return 'border-red-500';
      case NotificationType.MESSAGE:
        return 'border-blue-500';
      case NotificationType.TASK_ASSIGNED:
      case NotificationType.TASK_COMPLETED:
      case NotificationType.TASK_UPDATED:
        return 'border-purple-500';
      default:
        return 'border-gray-500';
    }
  };

  return (
    <div
      className={`
        relative bg-white dark:bg-gray-800 rounded-lg shadow-lg border-l-4 ${getBorderColor()}
        p-4 mb-2 transition-all duration-300 transform
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isLeaving ? 'translate-x-full opacity-0' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {notification.title}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {notification.message}
          </p>

          {notification.data && Object.keys(notification.data).length > 0 && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
              <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                {JSON.stringify(notification.data, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
