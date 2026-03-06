'use client';

import React, { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';

// ============================================================================
// 类型定义
// ============================================================================

type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
type NotificationCategory = 'task' | 'system' | 'mention' | 'message' | 'alert';

interface EnhancedNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  dismissed: boolean;
  
  // 扩展字段
  icon?: string;
  avatar?: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, unknown>;
  
  // 分组
  groupId?: string;
  groupCount?: number;
}

interface NotificationCenterProps {
  className?: string;
  maxVisible?: number;
  onNotificationClick?: (notification: EnhancedNotification) => void;
  onMarkAllRead?: () => void;
}

// ============================================================================
// Mock 数据生成
// ============================================================================

const generateMockNotifications = (): EnhancedNotification[] => [
  {
    id: '1',
    type: 'success',
    category: 'task',
    priority: 'high',
    title: '任务完成',
    message: 'Executor 完成了"实现团队协作功能"任务',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    read: false,
    dismissed: false,
    icon: '✅',
    sender: { id: 'executor', name: 'Executor' },
    actionUrl: '/tasks/123',
    actionText: '查看详情',
  },
  {
    id: '2',
    type: 'info',
    category: 'mention',
    priority: 'normal',
    title: '有人@了你',
    message: '架构师 在"数据库优化"任务评论中提到了你',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    read: false,
    dismissed: false,
    icon: '@',
    sender: { id: 'architect', name: '架构师' },
    actionUrl: '/tasks/456#comment-789',
    actionText: '查看评论',
  },
  {
    id: '3',
    type: 'warning',
    category: 'alert',
    priority: 'high',
    title: '系统维护通知',
    message: '系统将于今晚 22:00-23:00 进行例行维护，届时部分功能可能不可用',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    read: true,
    dismissed: false,
    icon: '⚠️',
  },
  {
    id: '4',
    type: 'info',
    category: 'message',
    priority: 'normal',
    title: '新消息',
    message: '咨询师: 你好，关于调研报告有个问题想讨论一下...',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
    read: true,
    dismissed: false,
    icon: '💬',
    sender: { id: 'consultant', name: '咨询师' },
    actionUrl: '/messages/dm-consultant',
    actionText: '回复',
  },
  {
    id: '5',
    type: 'success',
    category: 'task',
    priority: 'normal',
    title: '新任务分配',
    message: '架构师 给你分配了新任务"API性能优化"',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: true,
    dismissed: false,
    icon: '📋',
    sender: { id: 'architect', name: '架构师' },
    actionUrl: '/tasks/789',
    actionText: '查看任务',
  },
  {
    id: '6',
    type: 'error',
    category: 'alert',
    priority: 'urgent',
    title: '部署失败',
    message: '生产环境部署失败，请检查日志并重试',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    read: false,
    dismissed: false,
    icon: '🚨',
    actionUrl: '/deploy/logs',
    actionText: '查看日志',
  },
];

// ============================================================================
// 辅助函数
// ============================================================================

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

const getPriorityColor = (priority: NotificationPriority): string => {
  const colors = {
    low: 'border-gray-300 dark:border-gray-600',
    normal: 'border-blue-400 dark:border-blue-600',
    high: 'border-orange-400 dark:border-orange-600',
    urgent: 'border-red-500 dark:border-red-600',
  };
  return colors[priority];
};

const getCategoryIcon = (category: NotificationCategory): string => {
  const icons = {
    task: '📋',
    system: '⚙️',
    mention: '@',
    message: '💬',
    alert: '🔔',
  };
  return icons[category];
};

// ============================================================================
// 通知项组件
// ============================================================================

interface NotificationItemProps {
  notification: EnhancedNotification;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onClick?: (notification: EnhancedNotification) => void;
}

const NotificationItem = memo(function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
  onClick,
}: NotificationItemProps) {
  const handleClick = useCallback(() => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    onClick?.(notification);
  }, [notification, onMarkRead, onClick]);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss(notification.id);
  }, [onDismiss, notification.id]);

  const typeStyles = {
    success: 'bg-green-50 dark:bg-green-900/20',
    error: 'bg-red-50 dark:bg-red-900/20',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20',
    info: 'bg-blue-50 dark:bg-blue-900/20',
  };

  return (
    <div
      className={`relative p-4 border-l-4 rounded-r-lg cursor-pointer
                  transition-all duration-200 hover:shadow-md
                  ${getPriorityColor(notification.priority)}
                  ${typeStyles[notification.type]}
                  ${!notification.read ? 'font-medium' : 'opacity-75'}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="flex items-start gap-3">
        {/* 图标/头像 */}
        <div className="flex-shrink-0">
          {notification.sender?.avatar ? (
            <img 
              src={notification.sender.avatar} 
              alt={notification.sender.name}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 
                            flex items-center justify-center text-xl">
              {notification.icon || getCategoryIcon(notification.category)}
            </div>
          )}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                {notification.title}
              </h4>
              {notification.sender && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  来自 {notification.sender.name}
                </span>
              )}
            </div>
            
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 
                         dark:hover:text-gray-300 focus:outline-none focus:ring-2 
                         focus:ring-blue-500 rounded"
              aria-label="关闭"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between mt-2">
            <time className="text-xs text-gray-400 dark:text-gray-500">
              {formatRelativeTime(notification.timestamp)}
            </time>
            
            {notification.actionText && (
              <span className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium">
                {notification.actionText} →
              </span>
            )}
          </div>
        </div>

        {/* 未读指示器 */}
        {!notification.read && (
          <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        )}
        
        {/* 紧急标识 */}
        {notification.priority === 'urgent' && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 text-xs font-bold 
                           bg-red-500 text-white rounded animate-pulse">
            紧急
          </span>
        )}
      </div>
    </div>
  );
});

// ============================================================================
// 主组件
// ============================================================================

export const NotificationCenter: React.FC<NotificationCenterProps> = memo(function NotificationCenter({
  className = '',
  maxVisible = 20,
  onNotificationClick,
  onMarkAllRead,
}) {
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | NotificationCategory | 'unread'>('all');
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 初始化模拟数据
  useEffect(() => {
    setNotifications(generateMockNotifications());
  }, []);

  // 统计
  const stats = useMemo(() => {
    const unread = notifications.filter(n => !n.read && !n.dismissed);
    return {
      total: notifications.filter(n => !n.dismissed).length,
      unread: unread.length,
      urgent: unread.filter(n => n.priority === 'urgent').length,
      byCategory: {
        task: notifications.filter(n => n.category === 'task' && !n.dismissed).length,
        system: notifications.filter(n => n.category === 'system' && !n.dismissed).length,
        mention: notifications.filter(n => n.category === 'mention' && !n.dismissed).length,
        message: notifications.filter(n => n.category === 'message' && !n.dismissed).length,
        alert: notifications.filter(n => n.category === 'alert' && !n.dismissed).length,
      },
    };
  }, [notifications]);

  // 过滤
  const filteredNotifications = useMemo(() => {
    let result = notifications.filter(n => !n.dismissed);
    
    if (activeFilter === 'unread') {
      result = result.filter(n => !n.read);
    } else if (activeFilter !== 'all') {
      result = result.filter(n => n.category === activeFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }
    
    // 按优先级和时间排序
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    result.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
    
    return result.slice(0, maxVisible);
  }, [notifications, activeFilter, searchQuery, maxVisible]);

  // 标记已读
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  // 全部已读
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onMarkAllRead?.();
  }, [onMarkAllRead]);

  // 关闭通知
  const dismiss = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, dismissed: true } : n)
    );
  }, []);

  // 清空已读
  const clearRead = useCallback(() => {
    setNotifications(prev => prev.filter(n => !n.read));
  }, []);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* 头部 */}
      <div className="relative px-4 py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {stats.unread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 text-xs font-bold bg-white text-rose-600 
                                 rounded-full flex items-center justify-center">
                  {stats.unread > 99 ? '99+' : stats.unread}
                </span>
              )}
            </div>
            <h3 className="font-semibold">通知中心</h3>
          </div>
          
          <div className="flex items-center gap-2">
            {stats.urgent > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-red-500 rounded-full animate-pulse">
                {stats.urgent} 紧急
              </span>
            )}
            
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

        {/* 快速统计 */}
        <div className="flex gap-3 mt-2 text-sm text-white/80">
          <span>{stats.unread} 未读</span>
          <span>·</span>
          <span>{stats.total} 全部</span>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* 过滤标签 */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {[
                { key: 'all', label: '全部', count: stats.total },
                { key: 'unread', label: '未读', count: stats.unread },
                { key: 'task', label: '任务', count: stats.byCategory.task },
                { key: 'mention', label: '@我', count: stats.byCategory.mention },
                { key: 'message', label: '消息', count: stats.byCategory.message },
                { key: 'system', label: '系统', count: stats.byCategory.system },
                { key: 'alert', label: '警告', count: stats.byCategory.alert },
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key as typeof activeFilter)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap
                             ${activeFilter === filter.key 
                               ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' 
                               : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  {filter.label}
                  {filter.count > 0 && (
                    <span className="ml-1">({filter.count})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 搜索 */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" 
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="搜索通知..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 
                           border-0 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* 通知列表 */}
          <div className="max-h-[500px] overflow-y-auto">
            {filteredNotifications.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredNotifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={markAsRead}
                    onDismiss={dismiss}
                    onClick={onNotificationClick}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm">
                  {searchQuery ? '没有找到匹配的通知' : '暂无通知'}
                </p>
              </div>
            )}
          </div>

          {/* 底部操作 */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 
                            border-t border-gray-200 dark:border-gray-700 
                            bg-gray-50 dark:bg-gray-900/50">
              <div className="flex gap-2">
                <button
                  onClick={markAllAsRead}
                  disabled={stats.unread === 0}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline 
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  全部已读
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  onClick={clearRead}
                  className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                >
                  清除已读
                </button>
              </div>
              
              <button
                onClick={() => setNotifications([])}
                className="text-xs text-gray-500 hover:text-red-500 transition-colors"
              >
                清空全部
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default NotificationCenter;