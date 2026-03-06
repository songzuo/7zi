'use client';

import React, { useEffect, useCallback, useMemo, memo, useState } from 'react';
import { useRealtimeNotificationStore, createNotificationFromMessage, useHighPriorityNotifications } from '@/lib/realtime/store';
import { socketManager } from '@/lib/realtime/socket-client';
import type { WebSocketMessage, RealtimeNotification } from '@/lib/realtime/types';
import { formatRelativeTime } from '@/lib/realtime/utils';

// ============================================================================
// 类型定义
// ============================================================================

interface RealtimeCollaborationPanelProps {
  className?: string;
  userId?: string;
  projectId?: string;
  maxNotifications?: number;
  onNotificationClick?: (notification: RealtimeNotification) => void;
}

interface OnlineMember {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: string;
}

// ============================================================================
// 在线成员指示器组件
// ============================================================================

const OnlineIndicator = memo(function OnlineIndicator({ status }: { status: OnlineMember['status'] }) {
  const colorMap = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400',
  };

  return (
    <span 
      className={`w-2.5 h-2.5 rounded-full ${colorMap[status]} ring-2 ring-white dark:ring-gray-800`}
      title={status === 'online' ? '在线' : status === 'away' ? '离开' : status === 'busy' ? '忙碌' : '离线'}
    />
  );
});

// ============================================================================
// 通知项组件
// ============================================================================

interface NotificationItemProps {
  notification: RealtimeNotification;
  onMarkRead: (id: string) => void;
  onRemove: (id: string) => void;
  onClick?: (notification: RealtimeNotification) => void;
}

const NotificationItem = memo(function NotificationItem({ 
  notification, 
  onMarkRead, 
  onRemove,
  onClick,
}: NotificationItemProps) {
  const priorityStyles = {
    high: 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10',
    normal: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10',
    low: 'border-l-gray-300 dark:border-l-gray-600',
  };

  const handleClick = useCallback(() => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    onClick?.(notification);
  }, [notification, onMarkRead, onClick]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(notification.id);
  }, [onRemove, notification.id]);

  return (
    <div
      className={`
        relative p-3 border-l-4 rounded-r-lg cursor-pointer
        transition-all duration-200 hover:shadow-md
        ${priorityStyles[notification.priority || 'normal']}
        ${!notification.read ? 'font-medium' : 'opacity-70'}
      `}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <span className="text-lg flex-shrink-0" role="img" aria-label={notification.type}>
          {notification.icon}
        </span>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {notification.title}
            </h4>
            <button
              onClick={handleRemove}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-0.5"
              aria-label="删除通知"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex items-center gap-2 mt-1.5">
            <time className="text-xs text-gray-400 dark:text-gray-500">
              {formatRelativeTime(notification.timestamp)}
            </time>
            {notification.actionText && (
              <span className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400">
                {notification.actionText} →
              </span>
            )}
          </div>
        </div>

        {/* 未读指示器 */}
        {!notification.read && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
        )}
      </div>
    </div>
  );
});

// ============================================================================
// 主面板组件
// ============================================================================

export const RealtimeCollaborationPanel: React.FC<RealtimeCollaborationPanelProps> = memo(function RealtimeCollaborationPanel({
  className = '',
  userId = 'anonymous',
  projectId,
  maxNotifications = 20,
  onNotificationClick,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'notifications' | 'members'>('notifications');
  
  // 模拟在线成员（实际应从 WebSocket 获取）
  const [onlineMembers] = useState<OnlineMember[]>([
    { id: '1', name: '张三', status: 'online', avatar: '' },
    { id: '2', name: '李四', status: 'away', avatar: '' },
    { id: '3', name: '王五', status: 'busy', avatar: '' },
  ]);

  const { 
    notifications, 
    unreadCount, 
    isConnected,
    markAsRead, 
    markAllAsRead, 
    removeNotification,
    clearAll,
    setConnected,
    updateHeartbeat,
  } = useRealtimeNotificationStore();

  const highPriorityNotifications = useHighPriorityNotifications();
  const displayNotifications = useMemo(() => 
    notifications.slice(0, maxNotifications), 
    [notifications, maxNotifications]
  );

  // 处理 WebSocket 消息
  const handleMessage = useCallback((message: WebSocketMessage) => {
    const notification = createNotificationFromMessage(message);
    useRealtimeNotificationStore.getState().addNotification(notification);
  }, []);

  // 初始化 WebSocket 连接
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    
    socketManager.connect({
      url: wsUrl,
      token: `user-${userId}`,
      channels: projectId ? [`project:${projectId}`] : ['global'],
      reconnect: true,
    });

    // 监听所有消息类型
    const unsubscribe = socketManager.on('*', handleMessage);

    // 监听连接状态
    const unsubscribeState = socketManager.onConnectionState((state) => {
      setConnected(state === 'connected');
    });

    // 监听心跳
    const unsubscribeHeartbeat = socketManager.on('heartbeat', (msg) => {
      updateHeartbeat(msg.timestamp);
    });

    return () => {
      unsubscribe();
      unsubscribeState();
      unsubscribeHeartbeat();
      socketManager.disconnect();
    };
  }, [userId, projectId, handleMessage, setConnected, updateHeartbeat]);

  // 标记所有已读
  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  // 清空所有
  const handleClearAll = useCallback(() => {
    clearAll();
  }, [clearAll]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-xs font-bold bg-red-500 rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <h3 className="font-semibold">实时协作</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 连接状态 */}
          <span 
            className={`flex items-center gap-1 text-xs ${isConnected ? 'text-green-200' : 'text-yellow-200'}`}
            title={isConnected ? '已连接' : '未连接'}
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-300' : 'bg-yellow-300'} animate-pulse`} />
            {isConnected ? '在线' : '离线'}
          </span>
          
          {/* 折叠按钮 */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label={isExpanded ? '折叠' : '展开'}
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isExpanded ? '' : 'rotate-180'}`} 
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* 标签切换 */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors relative
                ${activeTab === 'notifications' 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              通知
              {unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full">
                  {unreadCount}
                </span>
              )}
              {activeTab === 'notifications' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors relative
                ${activeTab === 'members' 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              在线成员
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full">
                {onlineMembers.filter(m => m.status === 'online').length}
              </span>
              {activeTab === 'members' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          </div>

          {/* 内容区域 */}
          <div className="max-h-80 overflow-y-auto">
            {activeTab === 'notifications' ? (
              <>
                {/* 高优先级通知横幅 */}
                {highPriorityNotifications.length > 0 && (
                  <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="font-medium">{highPriorityNotifications.length} 条重要通知需要处理</span>
                    </div>
                  </div>
                )}

                {/* 通知列表 */}
                {displayNotifications.length > 0 ? (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {displayNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={markAsRead}
                        onRemove={removeNotification}
                        onClick={onNotificationClick}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-sm">暂无通知</p>
                  </div>
                )}

                {/* 底部操作栏 */}
                {notifications.length > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <button
                      onClick={handleMarkAllRead}
                      disabled={unreadCount === 0}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      全部已读
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                    >
                      清空全部
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* 在线成员列表 */
              <div className="p-2">
                {onlineMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {member.name[0]}
                      </div>
                      <OnlineIndicator status={member.status} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {member.status === 'online' ? '在线' : 
                         member.status === 'away' ? '离开' : 
                         member.status === 'busy' ? '忙碌' : '离线'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});

export default RealtimeCollaborationPanel;