'use client';

import React, { useEffect, useCallback, memo, useState, useRef } from 'react';
import { useNotificationStore, Notification, NotificationType, NotificationPosition } from '@/lib/notifications';

interface NotificationToastProps {
  position?: NotificationPosition;
  maxVisible?: number;
  showProgressBar?: boolean;
  pauseOnHover?: boolean;
}

// 通知类型配置
const TYPE_CONFIG: Record<NotificationType, {
  icon: string;
  bgClass: string;
  borderClass: string;
  titleClass: string;
  iconBgClass: string;
  progressClass: string;
}> = {
  success: {
    icon: '✓',
    bgClass: 'bg-green-50 dark:bg-green-900/20',
    borderClass: 'border-green-200 dark:border-green-800',
    titleClass: 'text-green-800 dark:text-green-300',
    iconBgClass: 'bg-green-100 dark:bg-green-800',
    progressClass: 'bg-green-500',
  },
  error: {
    icon: '✕',
    bgClass: 'bg-red-50 dark:bg-red-900/20',
    borderClass: 'border-red-200 dark:border-red-800',
    titleClass: 'text-red-800 dark:text-red-300',
    iconBgClass: 'bg-red-100 dark:bg-red-800',
    progressClass: 'bg-red-500',
  },
  warning: {
    icon: '⚠',
    bgClass: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderClass: 'border-yellow-200 dark:border-yellow-800',
    titleClass: 'text-yellow-800 dark:text-yellow-300',
    iconBgClass: 'bg-yellow-100 dark:bg-yellow-800',
    progressClass: 'bg-yellow-500',
  },
  info: {
    icon: 'ℹ',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    borderClass: 'border-blue-200 dark:border-blue-800',
    titleClass: 'text-blue-800 dark:text-blue-300',
    iconBgClass: 'bg-blue-100 dark:bg-blue-800',
    progressClass: 'bg-blue-500',
  },
};

// 位置配置
const POSITION_CONFIG: Record<NotificationPosition, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

/**
 * 通知 Toast 组件
 * 
 * Features:
 * - 支持 4 种通知类型 (success, error, warning, info)
 * - 可配置的自动关闭超时
 * - 堆叠显示多条通知
 * - 进入/退出动画效果
 * - 可选进度条显示剩余时间
 * - 鼠标悬停时暂停自动关闭
 * - 完整的键盘和屏幕阅读器支持
 */
export const NotificationToast: React.FC<NotificationToastProps> = memo(function NotificationToast({
  position = 'top-right',
  maxVisible = 5,
  showProgressBar = true,
  pauseOnHover = true,
}) {
  const { notifications, dismiss } = useNotificationStore();
  
  // 只显示未关闭的通知
  const visibleNotifications = notifications
    .filter(n => !n.dismissed)
    .slice(0, maxVisible);

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed z-50 flex flex-col gap-2 ${POSITION_CONFIG[position]}`}
      role="region"
      aria-label="通知"
      aria-live="polite"
    >
      {visibleNotifications.map((notification, index) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onDismiss={() => dismiss(notification.id)}
          index={index}
          showProgressBar={showProgressBar}
          pauseOnHover={pauseOnHover}
        />
      ))}
    </div>
  );
});

// ============================================================================
// 单个通知卡片
// ============================================================================

interface NotificationCardProps {
  notification: Notification;
  onDismiss: () => void;
  index: number;
  showProgressBar?: boolean;
  pauseOnHover?: boolean;
}

const NotificationCard = memo(function NotificationCard({ 
  notification, 
  onDismiss, 
  index,
  showProgressBar = true,
  pauseOnHover = true,
}: NotificationCardProps) {
  const config = TYPE_CONFIG[notification.type];
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(notification.duration || 0);
  const animationFrameRef = useRef<number | null>(null);

  // 键盘支持
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault();
      handleDismiss();
    }
  }, [onDismiss]);

  // 处理关闭（带动画）
  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 300); // 与动画时长匹配
  }, [onDismiss]);

  // 进度条动画
  useEffect(() => {
    if (!notification.duration || notification.duration === 0 || !showProgressBar) {
      return;
    }

    const animate = () => {
      if (isPaused) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      const remaining = remainingTimeRef.current - elapsed;
      const newProgress = Math.max(0, (remaining / notification.duration!) * 100);
      
      setProgress(newProgress);

      if (remaining <= 0) {
        handleDismiss();
      } else {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [notification.duration, isPaused, showProgressBar, handleDismiss]);

  // 悬停暂停处理
  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover && notification.duration && notification.duration > 0) {
      setIsPaused(true);
      // 保存剩余时间
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - (Date.now() - startTimeRef.current));
    }
  }, [pauseOnHover, notification.duration]);

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover && notification.duration && notification.duration > 0) {
      setIsPaused(false);
      // 重置开始时间
      startTimeRef.current = Date.now();
    }
  }, [pauseOnHover, notification.duration]);

  // 入场动画延迟
  const animationDelay = index * 50;

  return (
    <article
      className={`
        w-80 p-4 rounded-lg border shadow-lg
        ${config.bgClass} ${config.borderClass}
        transition-all duration-300 ease-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${isExiting ? 'animate-toast-exit opacity-0 translate-x-4' : 'animate-toast-enter'}
        hover:shadow-xl
      `}
      style={{ 
        animationDelay: `${animationDelay}ms`,
        animationFillMode: 'backwards',
      }}
      role="alert"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-labelledby={`notification-title-${notification.id}`}
      aria-describedby={notification.message ? `notification-message-${notification.id}` : undefined}
    >
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div 
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${config.iconBgClass} ${config.titleClass}`}
          aria-hidden="true"
        >
          {config.icon}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <h4 
            id={`notification-title-${notification.id}`}
            className={`text-sm font-semibold ${config.titleClass}`}
          >
            {notification.title}
          </h4>
          {notification.message && (
            <p 
              id={`notification-message-${notification.id}`}
              className="mt-1 text-sm text-gray-600 dark:text-gray-400 break-words"
            >
              {notification.message}
            </p>
          )}
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 rounded
                     transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="关闭通知"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 进度条 */}
      {showProgressBar && notification.duration && notification.duration > 0 && (
        <div className="mt-2 h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.progressClass} transition-[width] duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}
    </article>
  );
});

// ============================================================================
// CSS 动画定义（需要添加到 globals.css）
// ============================================================================

export const NOTIFICATION_ANIMATIONS = `
@keyframes toast-enter {
  from {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes toast-exit {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
  }
}

.animate-toast-enter {
  animation: toast-enter 0.3s ease-out forwards;
}

.animate-toast-exit {
  animation: toast-exit 0.3s ease-out forwards;
}

/* 左侧位置的动画变体 */
@keyframes toast-enter-left {
  from {
    opacity: 0;
    transform: translateX(-100%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes toast-exit-left {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(-100%) scale(0.9);
  }
}

/* 底部位置的动画变体 */
@keyframes toast-enter-bottom {
  from {
    opacity: 0;
    transform: translateY(100%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toast-exit-bottom {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(100%) scale(0.9);
  }
}
`;

export default NotificationToast;