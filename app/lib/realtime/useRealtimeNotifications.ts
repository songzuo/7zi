/**
 * 实时通知 Hook
 * 
 * 提供 WebSocket 连接和实时通知管理的 React Hook
 */

'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { socketManager } from './socket-client';
import { 
  useRealtimeNotificationStore, 
  createNotificationFromMessage 
} from './store';
import type { 
  WebSocketMessage, 
  RealtimeNotification,
  NotificationHandler,
  RealtimeConnectionOptions 
} from './types';

export interface UseRealtimeNotificationsOptions {
  /** WebSocket 服务地址 */
  url?: string;
  /** 认证 Token */
  token?: string;
  /** 订阅的频道 */
  channels?: string[];
  /** 是否自动连接 */
  autoConnect?: boolean;
  /** 连接成功回调 */
  onConnect?: () => void;
  /** 断开连接回调 */
  onDisconnect?: () => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 收到通知回调 */
  onNotification?: (notification: RealtimeNotification) => void;
  /** 是否显示浏览器通知 */
  enableBrowserNotifications?: boolean;
  /** 浏览器通知权限请求 */
  requestBrowserPermission?: boolean;
}

export interface UseRealtimeNotificationsReturn {
  /** 通知列表 */
  notifications: RealtimeNotification[];
  /** 未读数量 */
  unreadCount: number;
  /** 是否已连接 */
  isConnected: boolean;
  /** 连接状态 */
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
  /** 最后心跳时间 */
  lastHeartbeat: string | null;
  /** 标记单个已读 */
  markAsRead: (id: string) => void;
  /** 标记全部已读 */
  markAllAsRead: () => void;
  /** 删除通知 */
  removeNotification: (id: string) => void;
  /** 清空所有通知 */
  clearAll: () => void;
  /** 手动连接 */
  connect: () => void;
  /** 断开连接 */
  disconnect: () => void;
  /** 重连 */
  reconnect: () => void;
  /** 订阅频道 */
  subscribe: (channels: string[]) => void;
  /** 取消订阅 */
  unsubscribe: (channels: string[]) => void;
  /** 监听特定消息类型 */
  onMessage: <T extends WebSocketMessage>(type: string, handler: NotificationHandler<T>) => () => void;
  /** 请求浏览器通知权限 */
  requestNotificationPermission: () => Promise<boolean>;
  /** 浏览器通知是否支持 */
  browserNotificationsSupported: boolean;
  /** 浏览器通知权限状态 */
  notificationPermission: NotificationPermission | 'unsupported';
}

/**
 * 实时通知 Hook
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { 
 *     notifications, 
 *     unreadCount, 
 *     isConnected,
 *     markAsRead 
 *   } = useRealtimeNotifications({
 *     url: 'wss://api.example.com',
 *     token: userToken,
 *     channels: ['tasks', 'projects'],
 *   });
 *   
 *   return (
 *     <div>
 *       <span>未读: {unreadCount}</span>
 *       <ul>
 *         {notifications.map(n => (
 *           <li key={n.id} onClick={() => markAsRead(n.id)}>
 *             {n.title}
 *           </li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useRealtimeNotifications(
  options: UseRealtimeNotificationsOptions = {}
): UseRealtimeNotificationsReturn {
  const {
    url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001',
    token,
    channels = [],
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError,
    onNotification,
    enableBrowserNotifications = true,
    requestBrowserPermission = false,
  } = options;

  // Store
  const {
    notifications,
    unreadCount,
    isConnected,
    lastHeartbeat,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    setConnected,
    updateHeartbeat,
  } = useRealtimeNotificationStore();

  // State
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'
  >('disconnected');
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >('unsupported');

  // Refs
  const unsubscribersRef = useRef<Array<() => void>>([]);

  // 浏览器通知支持检测
  const browserNotificationsSupported = typeof window !== 'undefined' && 'Notification' in window;

  // 请求浏览器通知权限
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!browserNotificationsSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [browserNotificationsSupported]);

  // 发送浏览器通知
  const sendBrowserNotification = useCallback((notification: RealtimeNotification) => {
    if (!browserNotificationsSupported || notificationPermission !== 'granted') return;

    try {
      const browserNotif = new Notification(notification.title, {
        body: notification.message,
        icon: notification.avatar || '/favicon.ico',
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
      console.error('Failed to send browser notification:', error);
    }
  }, [browserNotificationsSupported, notificationPermission, markAsRead]);

  // 处理 WebSocket 消息
  const handleMessage = useCallback((message: WebSocketMessage) => {
    // 创建通知
    const notification = createNotificationFromMessage(message);
    addNotification(notification);

    // 回调
    onNotification?.(notification);

    // 浏览器通知
    if (enableBrowserNotifications && notificationPermission === 'granted') {
      sendBrowserNotification(notification);
    }
  }, [addNotification, onNotification, enableBrowserNotifications, notificationPermission, sendBrowserNotification]);

  // 连接
  const connect = useCallback(() => {
    const connectionOptions: RealtimeConnectionOptions = {
      url,
      token,
      channels,
      reconnect: true,
    };

    socketManager.connect(connectionOptions);

    // 监听连接状态
    const unsubConnect = socketManager.onConnectionState((state) => {
      setConnectionState(state);
      setConnected(state === 'connected');
      
      if (state === 'connected') {
        onConnect?.();
      } else if (state === 'disconnected') {
        onDisconnect?.();
      }
    });

    // 监听错误
    const unsubError = socketManager.onError((error) => {
      onError?.(error);
    });

    // 监听所有消息类型
    const messageTypes = [
      'task:status_changed',
      'task:assigned',
      'task:comment',
      'member:online',
      'member:offline',
      'member:status_changed',
      'system:announcement',
      'project:updated',
      'heartbeat',
      'connection:confirmed',
    ];

    const unsubs = messageTypes.map(type => 
      socketManager.on(type, handleMessage)
    );

    // 监听心跳
    const unsubHeartbeat = socketManager.on('heartbeat', (message) => {
      updateHeartbeat(message.timestamp);
    });

    unsubscribersRef.current = [
      unsubConnect,
      unsubError,
      ...unsubs,
      unsubHeartbeat,
    ];
  }, [url, token, channels, onConnect, onDisconnect, onError, handleMessage, setConnected, updateHeartbeat]);

  // 断开连接
  const disconnect = useCallback(() => {
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];
    socketManager.disconnect();
    setConnectionState('disconnected');
    setConnected(false);
  }, [setConnected]);

  // 重连
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  // 订阅频道
  const subscribe = useCallback((newChannels: string[]) => {
    socketManager.subscribe(newChannels);
  }, []);

  // 取消订阅
  const unsubscribe = useCallback((removeChannels: string[]) => {
    socketManager.unsubscribe(removeChannels);
  }, []);

  // 监听特定消息类型
  const onMessage = useCallback(<T extends WebSocketMessage>(
    type: string, 
    handler: NotificationHandler<T>
  ): (() => void) => {
    return socketManager.on(type, handler as NotificationHandler);
  }, []);

  // 初始化
  useEffect(() => {
    // 检测浏览器通知权限
    if (browserNotificationsSupported) {
      setNotificationPermission(Notification.permission);
      
      if (requestBrowserPermission) {
        requestNotificationPermission();
      }
    }

    // 自动连接
    if (autoConnect) {
      connect();
    }

    // 清理
    return () => {
      disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    notifications,
    unreadCount,
    isConnected,
    connectionState,
    lastHeartbeat,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    connect,
    disconnect,
    reconnect,
    subscribe,
    unsubscribe,
    onMessage,
    requestNotificationPermission,
    browserNotificationsSupported,
    notificationPermission,
  };
}

export default useRealtimeNotifications;