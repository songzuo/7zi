'use client';

import React, { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { useNotificationStore, Notification, NotificationType, NotificationOptions } from '@/lib/notifications';

// ============================================================================
// Types
// ============================================================================

export type { Notification, NotificationType, NotificationOptions };

export interface NotificationContextValue {
  // 状态
  notifications: Notification[];
  
  // 基础方法
  push: (options: NotificationOptions) => Notification;
  dismiss: (id: string) => void;
  clearAll: () => void;
  
  // 快捷方法
  success: (title: string, message?: string, duration?: number) => Notification;
  error: (title: string, message?: string, duration?: number) => Notification;
  warning: (title: string, message?: string, duration?: number) => Notification;
  info: (title: string, message?: string, duration?: number) => Notification;
  
  // 便捷方法 - Promise 支持
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => Promise<T>;
  
  // 便捷方法 - 异步操作
  tryAsync: <T>(
    operation: () => Promise<T>,
    successMessage?: string,
    errorMessage?: string
  ) => Promise<T | null>;
}

// ============================================================================
// Context
// ============================================================================

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export interface NotificationProviderProps {
  children: ReactNode;
  /** 默认自动关闭时间 (毫秒)，0 表示不自动关闭 */
  defaultDuration?: number;
  /** 错误通知的默认持续时间 */
  errorDuration?: number;
  /** 成功通知的默认持续时间 */
  successDuration?: number;
}

/**
 * 通知上下文提供者
 * 
 * 提供全局通知管理功能，可在应用任何位置使用
 * 
 * @example
 * ```tsx
 * // 在 app/layout.tsx 中包裹应用
 * <NotificationProvider>
 *   {children}
 * </NotificationProvider>
 * 
 * // 在组件中使用
 * const { success, error } = useNotifications();
 * success('操作成功');
 * ```
 */
export function NotificationProvider({ 
  children,
  defaultDuration = 5000,
  errorDuration = 8000,
  successDuration = 5000,
}: NotificationProviderProps) {
  const store = useNotificationStore();

  // 带默认持续时间的推送
  const pushWithDuration = useCallback((options: NotificationOptions): Notification => {
    let duration = options.duration;
    
    // 根据类型设置默认持续时间
    if (duration === undefined) {
      switch (options.type) {
        case 'error':
          duration = errorDuration;
          break;
        case 'success':
          duration = successDuration;
          break;
        default:
          duration = defaultDuration;
      }
    }

    return store.push({ ...options, duration });
  }, [store, defaultDuration, errorDuration, successDuration]);

  // 快捷方法
  const success = useCallback((title: string, message?: string, duration?: number) => {
    return pushWithDuration({ type: 'success', title, message, duration });
  }, [pushWithDuration]);

  const error = useCallback((title: string, message?: string, duration?: number) => {
    return pushWithDuration({ type: 'error', title, message, duration });
  }, [pushWithDuration]);

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    return pushWithDuration({ type: 'warning', title, message, duration });
  }, [pushWithDuration]);

  const info = useCallback((title: string, message?: string, duration?: number) => {
    return pushWithDuration({ type: 'info', title, message, duration });
  }, [pushWithDuration]);

  // Promise 支持
  const promise = useCallback(async <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ): Promise<T> => {
    // 显示加载通知
    const loadingNotification = info(options.loading, undefined, 0);

    try {
      const result = await promise;
      
      // 关闭加载通知
      store.dismiss(loadingNotification.id);
      
      // 显示成功通知
      const successMsg = typeof options.success === 'function' 
        ? options.success(result) 
        : options.success;
      success(successMsg);
      
      return result;
    } catch (err) {
      // 关闭加载通知
      store.dismiss(loadingNotification.id);
      
      // 显示错误通知
      const errorMsg = typeof options.error === 'function' 
        ? options.error(err) 
        : options.error;
      error(errorMsg);
      
      throw err;
    }
  }, [info, success, error, store]);

  // 异步操作便捷方法
  const tryAsync = useCallback(async <T,>(
    operation: () => Promise<T>,
    successMessage?: string,
    errorMessage?: string
  ): Promise<T | null> => {
    try {
      const result = await operation();
      if (successMessage) {
        success(successMessage);
      }
      return result;
    } catch (err) {
      const message = errorMessage || (err instanceof Error ? err.message : '操作失败');
      error(message);
      return null;
    }
  }, [success, error]);

  const value = useMemo<NotificationContextValue>(() => ({
    notifications: store.notifications,
    push: pushWithDuration,
    dismiss: store.dismiss,
    clearAll: store.clearAll,
    success,
    error,
    warning,
    info,
    promise,
    tryAsync,
  }), [
    store.notifications,
    store.dismiss,
    store.clearAll,
    pushWithDuration,
    success,
    error,
    warning,
    info,
    promise,
    tryAsync,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * 获取通知上下文
 * 
 * @throws 如果不在 NotificationProvider 内使用会抛出错误
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { success, error, promise } = useNotifications();
 *   
 *   const handleSubmit = async () => {
 *     await promise(
 *       submitForm(),
 *       {
 *         loading: '提交中...',
 *         success: '提交成功！',
 *         error: '提交失败'
 *       }
 *     );
 *   };
 *   
 *   return <button onClick={handleSubmit}>提交</button>;
 * }
 * ```
 */
export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider. ' +
      'Make sure to wrap your app with <NotificationProvider>.');
  }
  
  return context;
}

// ============================================================================
// 可选 Hook (不抛错)
// ============================================================================

/**
 * 安全获取通知上下文，不在 Provider 内时返回 null
 */
export function useNotificationsSafe(): NotificationContextValue | null {
  return useContext(NotificationContext);
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 创建通知操作辅助函数
 * 用于常见 CRUD 操作的通知
 */
export function createNotificationHelpers(notifications: NotificationContextValue) {
  return {
    /** 创建成功 */
    created: (name: string) => notifications.success(`${name}创建成功`),
    /** 更新成功 */
    updated: (name: string) => notifications.success(`${name}更新成功`),
    /** 删除成功 */
    deleted: (name: string) => notifications.success(`${name}已删除`),
    /** 操作失败 */
    failed: (action: string, reason?: string) => 
      notifications.error(`${action}失败`, reason),
    /** 复制成功 */
    copied: () => notifications.info('已复制到剪贴板', undefined, 2000),
    /** 保存中 */
    saving: () => notifications.info('保存中...', undefined, 0),
    /** 已保存 */
    saved: () => notifications.success('已保存'),
  };
}

export default NotificationProvider;