'use client';

import { useCallback } from 'react';
import { useNotificationStore, NotificationOptions, Notification, NotificationType } from '@/lib/notifications';

interface UseNotificationsReturn {
  // 基础方法
  push: (options: NotificationOptions) => Notification;
  dismiss: (id: string) => void;
  clearAll: () => void;
  
  // 快捷方法
  success: (title: string, message?: string) => Notification;
  error: (title: string, message?: string) => Notification;
  warning: (title: string, message?: string) => Notification;
  info: (title: string, message?: string) => Notification;
  
  // 当前通知列表
  notifications: Notification[];
}

/**
 * 通知 Hook - React 组件使用
 * 
 * @example
 * const { success, error } = useNotifications();
 * 
 * success('操作成功', '数据已保存');
 * error('操作失败', '请稍后重试');
 */
export function useNotifications(): UseNotificationsReturn {
  const store = useNotificationStore();

  // 包装方法，提供更好的类型提示
  const push = useCallback((options: NotificationOptions): Notification => {
    return store.push(options);
  }, [store]);

  const dismiss = useCallback((id: string): void => {
    store.dismiss(id);
  }, [store]);

  const clearAll = useCallback((): void => {
    store.clearAll();
  }, [store]);

  const success = useCallback((title: string, message?: string): Notification => {
    return store.success(title, message);
  }, [store]);

  const error = useCallback((title: string, message?: string): Notification => {
    return store.error(title, message);
  }, [store]);

  const warning = useCallback((title: string, message?: string): Notification => {
    return store.warning(title, message);
  }, [store]);

  const info = useCallback((title: string, message?: string): Notification => {
    return store.info(title, message);
  }, [store]);

  return {
    push,
    dismiss,
    clearAll,
    success,
    error,
    warning,
    info,
    notifications: store.notifications,
  };
}

export type { UseNotificationsReturn, NotificationOptions, Notification, NotificationType };