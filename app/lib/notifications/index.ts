'use client';

import { create } from 'zustand';
import { 
  Notification, 
  NotificationOptions, 
  NotificationType,
  NotificationPosition,
  notificationManager 
} from './NotificationManager';

interface NotificationState {
  notifications: Notification[];
  push: (options: NotificationOptions) => Notification;
  dismiss: (id: string) => void;
  clearAll: () => void;
  success: (title: string, message?: string) => Notification;
  error: (title: string, message?: string) => Notification;
  warning: (title: string, message?: string) => Notification;
  info: (title: string, message?: string) => Notification;
}

// Zustand store 用于 React 组件
export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  push: (options) => {
    const notification = notificationManager.push(options);
    set({ notifications: notificationManager.getAll() });
    return notification;
  },

  dismiss: (id) => {
    notificationManager.dismiss(id);
    set({ notifications: notificationManager.getAll() });
  },

  clearAll: () => {
    notificationManager.clearAll();
    set({ notifications: [] });
  },

  success: (title, message) => {
    return get().push({ type: 'success', title, message });
  },

  error: (title, message) => {
    return get().push({ type: 'error', title, message });
  },

  warning: (title, message) => {
    return get().push({ type: 'warning', title, message });
  },

  info: (title, message) => {
    return get().push({ type: 'info', title, message });
  },
}));

// 同步 notificationManager 到 store
if (typeof window !== 'undefined') {
  notificationManager.subscribe((notifications) => {
    useNotificationStore.setState({ notifications });
  });
}

export type { Notification, NotificationOptions, NotificationType, NotificationPosition };