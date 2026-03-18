/**
 * 实时通知 Provider
 * 
 * 为应用提供实时通知上下文
 */

'use client';

import React, { createContext, useContext, useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useEnhancedWebSocket, ConnectionState } from './useEnhancedWebSocket';
import { useRealtimeNotificationStore, createNotificationFromMessage } from './store';
import type { WebSocketMessage, RealtimeNotification, RealtimeNotificationType, MemberOnlinePayload, MemberOfflinePayload } from './types';

// ============================================================================
// 类型定义
// ============================================================================

interface NotificationContextValue {
  // 通知状态
  notifications: RealtimeNotification[];
  unreadCount: number;
  
  // 连接状态
  isConnected: boolean;
  connectionState: ConnectionState;
  
  // 操作方法
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  
  // 订阅控制
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
  
  // 浏览器通知
  requestBrowserPermission: () => Promise<boolean>;
  browserPermission: NotificationPermission | 'unsupported';
  
  // 连接控制
  reconnect: () => void;
  disconnect: () => void;
  
  // 统计
  onlineUsers: string[];
  isUserOnline: (userId: string) => boolean;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
  
  // WebSocket 配置
  wsUrl?: string;
  token?: string;
  channels?: string[];
  
  // 行为配置
  autoConnect?: boolean;
  enableBrowserNotifications?: boolean;
  requestPermissionOnMount?: boolean;
  
  // 事件回调
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onNotification?: (notification: RealtimeNotification) => void;
}

// ============================================================================
// Provider 组件
// ============================================================================

export function NotificationProvider({
  children,
  wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001',
  token,
  channels = [],
  autoConnect = true,
  enableBrowserNotifications = true,
  requestPermissionOnMount = false,
  onConnect,
  onDisconnect,
  onError,
  onNotification,
}: NotificationProviderProps) {
  // Store
  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    setConnected,
  } = useRealtimeNotificationStore();

  // 浏览器通知权限
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  
  // 在线用户
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // WebSocket 连接
  const {
    isConnected,
    connectionState,
    subscribe: wsSubscribe,
    unsubscribe: wsUnsubscribe,
    reconnect: wsReconnect,
    disconnect: wsDisconnect,
    on: onMessage,
    onStateChange,
    onError: onWsError,
  } = useEnhancedWebSocket({
    url: wsUrl,
    token,
    channels,
    autoConnect,
  });

  // 浏览器通知支持检测
  const browserNotificationsSupported = typeof window !== 'undefined' && 'Notification' in window;

  // 请求浏览器通知权限
  const requestBrowserPermission = useCallback(async (): Promise<boolean> => {
    if (!browserNotificationsSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('[Notification] Failed to request permission:', error);
      return false;
    }
  }, [browserNotificationsSupported]);

  // 发送浏览器通知
  const sendBrowserNotification = useCallback((notification: RealtimeNotification) => {
    if (!browserNotificationsSupported || browserPermission !== 'granted') return;

    try {
      const browserNotif = new Notification(notification.title, {
        body: notification.message,
        icon: notification.icon || '/favicon.ico',
        tag: notification.id,
        data: {
          url: notification.actionUrl,
          id: notification.id,
        },
      });

      browserNotif.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        browserNotif.close();
        markAsRead(notification.id);
      };

      // 自动关闭
      setTimeout(() => browserNotif.close(), 5000);
    } catch (error) {
      console.error('[Notification] Failed to send browser notification:', error);
    }
  }, [browserNotificationsSupported, browserPermission, markAsRead]);

  // 处理 WebSocket 消息
  const handleMessage = useCallback((message: WebSocketMessage) => {
    // 创建通知
    const notification = createNotificationFromMessage(message);
    addNotification(notification);

    // 回调
    onNotification?.(notification);

    // 浏览器通知
    if (enableBrowserNotifications && browserPermission === 'granted') {
      sendBrowserNotification(notification);
    }

    // 更新在线用户列表
    if (message.type === 'member:online') {
      const userId = (message.payload as MemberOnlinePayload).userId;
      setOnlineUsers(prev => 
        prev.includes(userId) ? prev : [...prev, userId]
      );
    } else if (message.type === 'member:offline') {
      const userId = (message.payload as MemberOfflinePayload).userId;
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    }
  }, [addNotification, onNotification, enableBrowserNotifications, browserPermission, sendBrowserNotification]);

  // 检查用户是否在线
  const isUserOnline = useCallback((userId: string): boolean => {
    return onlineUsers.includes(userId);
  }, [onlineUsers]);

  // 订阅频道
  const subscribe = useCallback((newChannels: string[]) => {
    wsSubscribe(newChannels);
  }, [wsSubscribe]);

  // 取消订阅频道
  const unsubscribe = useCallback((removeChannels: string[]) => {
    wsUnsubscribe(removeChannels);
  }, [wsUnsubscribe]);

  // 重连
  const reconnect = useCallback(() => {
    wsReconnect();
  }, [wsReconnect]);

  // 断开连接
  const disconnect = useCallback(() => {
    wsDisconnect();
    setConnected(false);
  }, [wsDisconnect, setConnected]);

  // 初始化
  useEffect(() => {
    // 使用微任务延迟 setState，避免同步调用导致的级联渲染
    Promise.resolve().then(() => {
      if (browserNotificationsSupported) {
        setBrowserPermission(Notification.permission);

        if (requestPermissionOnMount) {
          requestBrowserPermission();
        }
      }
    });
  }, [browserNotificationsSupported, requestPermissionOnMount, requestBrowserPermission]);

  // 监听消息
  useEffect(() => {
    const messageTypes = [
      'task:status_changed',
      'task:assigned',
      'task:comment',
      'member:online',
      'member:offline',
      'member:status_changed',
      'system:announcement',
      'project:updated',
    ];

    const unsubscribers = messageTypes.map(type => 
      onMessage(type, handleMessage)
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [onMessage, handleMessage]);

  // 监听连接状态
  useEffect(() => {
    const unsub = onStateChange((state) => {
      setConnected(state === 'connected');
      
      if (state === 'connected') {
        onConnect?.();
      } else if (state === 'disconnected') {
        onDisconnect?.();
      }
    });

    return unsub;
  }, [onStateChange, setConnected, onConnect, onDisconnect]);

  // 监听错误
  useEffect(() => {
    const unsub = onWsError((error) => {
      onError?.(error);
    });

    return unsub;
  }, [onWsError, onError]);

  // Context 值
  const value = useMemo<NotificationContextValue>(() => ({
    notifications,
    unreadCount,
    isConnected,
    connectionState,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    subscribe,
    unsubscribe,
    requestBrowserPermission,
    browserPermission,
    reconnect,
    disconnect,
    onlineUsers,
    isUserOnline,
  }), [
    notifications,
    unreadCount,
    isConnected,
    connectionState,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    subscribe,
    unsubscribe,
    requestBrowserPermission,
    browserPermission,
    reconnect,
    disconnect,
    onlineUsers,
    isUserOnline,
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

export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}

// 导出类型
export type { NotificationContextValue, NotificationProviderProps };

export default NotificationProvider;