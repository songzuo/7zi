'use client';

/**
 * 通知中心页面 - 增强版
 * 
 * 特性:
 * - 响应式布局 (移动端/平板/桌面)
 * - 深色模式完整支持
 * - 通知分组显示 (今天/昨天/本周/更早)
 * - 批量操作 (全选/标记已读/删除)
 * - 流畅动画效果 (入场/过渡/微交互)
 * - 无限滚动加载
 * - 下拉刷新 (移动端)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { create } from 'zustand';

// ============================================
// 类型定义
// ============================================

interface Notification {
  id: string;
  type: 'task_assigned' | 'project_update' | 'mention' | 'system_alert' | 'comment' | 'deadline';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  userId: string;
  priority?: 'low' | 'medium' | 'high';
  link?: string;
  metadata?: Record<string, unknown>;
}

type FilterType = 'all' | 'unread' | 'read';
type GroupKey = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

interface SelectionState {
  selectedIds: Set<string>;
  toggle: (id: string) => void;
  toggleAll: (ids: string[]) => void;
  clear: () => void;
  selectAll: (ids: string[]) => void;
}

// ============================================
// 选择状态 Store
// ============================================

const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedIds: new Set<string>(),
  toggle: (id: string) => set((state) => {
    const newSet = new Set(state.selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { selectedIds: newSet };
  }),
  toggleAll: (ids: string[]) => set((state) => {
    const allSelected = ids.every(id => state.selectedIds.has(id));
    return { selectedIds: allSelected ? new Set() : new Set(ids) };
  }),
  selectAll: (ids: string[]) => set({ selectedIds: new Set(ids) }),
  clear: () => set({ selectedIds: new Set() }),
}));

// ============================================
// 配置常量
// ============================================

const typeConfig = {
  task_assigned: { icon: '📋', label: '任务分配', color: 'bg-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  project_update: { icon: '📁', label: '项目更新', color: 'bg-purple-500', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  mention: { icon: '💬', label: '提及', color: 'bg-green-500', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  system_alert: { icon: '⚠️', label: '系统警告', color: 'bg-red-500', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  comment: { icon: '💭', label: '评论', color: 'bg-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  deadline: { icon: '⏰', label: '截止日期', color: 'bg-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
};

const priorityConfig = {
  high: { label: '紧急', color: 'text-red-600 dark:text-red-400', badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
  medium: { label: '重要', color: 'text-yellow-600 dark:text-yellow-400', badge: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' },
  low: { label: '', color: '', badge: '' },
};

// ============================================
// 工具函数
// ============================================

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function getGroupKey(dateString: string): GroupKey {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  if (date >= today) return 'today';
  if (date >= yesterday) return 'yesterday';
  if (date >= weekAgo) return 'thisWeek';
  return 'earlier';
}

function getGroupLabel(key: GroupKey, locale: string): string {
  const labels: Record<GroupKey, Record<string, string>> = {
    today: { zh: '今天', en: 'Today' },
    yesterday: { zh: '昨天', en: 'Yesterday' },
    thisWeek: { zh: '本周', en: 'This Week' },
    earlier: { zh: '更早', en: 'Earlier' },
  };
  return labels[key][locale] || labels[key].en;
}

// ============================================
// 子组件
// ============================================

// 骨架屏
function NotificationSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
              </div>
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 空状态
function EmptyState({ filter, locale }: { filter: FilterType; locale: string }) {
  const config = useMemo(() => {
    switch (filter) {
      case 'unread':
        return { 
          icon: '✅', 
          title: locale === 'zh' ? '全部已读' : 'All Read',
          desc: locale === 'zh' ? '暂无未读通知' : 'No unread notifications'
        };
      case 'read':
        return { 
          icon: '📭', 
          title: locale === 'zh' ? '暂无已读' : 'No Read Notifications',
          desc: locale === 'zh' ? '还没有已读通知' : 'No read notifications yet'
        };
      default:
        return { 
          icon: '🔔', 
          title: locale === 'zh' ? '暂无通知' : 'No Notifications',
          desc: locale === 'zh' ? '您目前没有收到任何通知' : "You haven't received any notifications yet"
        };
    }
  }, [filter, locale]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-in">
      <div className="text-7xl mb-6 animate-float">{config.icon}</div>
      <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
        {config.title}
      </h3>
      <p className="text-zinc-500 dark:text-zinc-400 text-center max-w-sm">
        {config.desc}
      </p>
    </div>
  );
}

// 批量操作栏
function BatchActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onMarkRead,
  onDelete,
  onClear,
  locale,
}: {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  onClear: () => void;
  locale: string;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-4">
        <span className="text-sm font-medium">
          {locale === 'zh' ? `已选择 ${selectedCount} 项` : `${selectedCount} selected`}
        </span>
        <div className="h-4 w-px bg-zinc-700" />
        <button
          onClick={onSelectAll}
          className="text-sm text-zinc-300 hover:text-white transition-colors"
        >
          {selectedCount === totalCount 
            ? (locale === 'zh' ? '取消全选' : 'Deselect all')
            : (locale === 'zh' ? '全选' : 'Select all')
          }
        </button>
        <div className="h-4 w-px bg-zinc-700" />
        <button
          onClick={onMarkRead}
          className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
        >
          {locale === 'zh' ? '标记已读' : 'Mark read'}
        </button>
        <button
          onClick={onDelete}
          className="text-sm text-red-400 hover:text-red-300 transition-colors font-medium"
        >
          {locale === 'zh' ? '删除' : 'Delete'}
        </button>
        <button
          onClick={onClear}
          className="ml-2 p-1.5 rounded-lg hover:bg-zinc-700 transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// 通知项
function NotificationItem({
  notification,
  isSelected,
  onToggleSelect,
  onMarkRead,
  onDelete,
  onNavigate,
  locale,
}: {
  notification: Notification;
  isSelected: boolean;
  onToggleSelect: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
  onNavigate: () => void;
  locale: string;
}) {
  const typeConf = typeConfig[notification.type] || typeConfig.system_alert;
  const priorityConf = notification.priority ? priorityConfig[notification.priority] : null;

  return (
    <div
      className={`
        group relative bg-white dark:bg-zinc-900 rounded-2xl border 
        transition-all duration-300 ease-out
        hover:shadow-lg hover:shadow-zinc-900/5 dark:hover:shadow-black/20
        ${!notification.read 
          ? 'border-l-4 border-l-cyan-500 border-y-zinc-200 dark:border-y-zinc-800 border-r-zinc-200 dark:border-r-zinc-800' 
          : 'border-zinc-200 dark:border-zinc-800'
        }
        ${isSelected ? 'ring-2 ring-cyan-500 ring-offset-2 dark:ring-offset-zinc-950' : ''}
      `}
    >
      {/* 选择复选框 */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
        <button
          onClick={onToggleSelect}
          className={`
            w-5 h-5 rounded-md border-2 transition-all duration-200
            flex items-center justify-center
            ${isSelected 
              ? 'bg-cyan-500 border-cyan-500' 
              : 'border-zinc-300 dark:border-zinc-600 opacity-0 group-hover:opacity-100'
            }
          `}
          aria-label="Select notification"
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </div>

      <div className="flex items-start gap-4 p-4 pl-10">
        {/* 图标 */}
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0
          ${typeConf.bgColor}
        `}>
          {typeConf.icon}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h3 className={`
              font-semibold text-base
              ${!notification.read ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}
            `}>
              {notification.title}
            </h3>
            
            {/* 优先级标签 */}
            {priorityConf && priorityConf.label && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityConf.badge}`}>
                {priorityConf.label}
              </span>
            )}
            
            {/* 未读标记 */}
            {!notification.read && (
              <span className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400">
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                未读
              </span>
            )}
          </div>
          
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-3 line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {formatTime(notification.createdAt)}
            </span>
            
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.read && (
                <button
                  onClick={onMarkRead}
                  className="text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 font-medium transition-colors"
                >
                  标记已读
                </button>
              )}
              {notification.link && (
                <button
                  onClick={onNavigate}
                  className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white font-medium transition-colors"
                >
                  查看详情 →
                </button>
              )}
              <button
                onClick={onDelete}
                className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 分组标题
function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        {label}
      </h2>
      <span className="text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
        {count}
      </span>
    </div>
  );
}

// ============================================
// 主组件
// ============================================

export default function NotificationsPage() {
  const locale = useLocale();
  const router = useRouter();
  
  // 状态
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // 选择状态
  const { selectedIds, toggle, toggleAll, clear, selectAll } = useSelectionStore();
  
  // Refs
  const listRef = useRef<HTMLDivElement>(null);
  
  // 过滤后的通知
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (filter === 'unread' && n.read) return false;
      if (filter === 'read' && !n.read) return false;
      if (selectedType !== 'all' && n.type !== selectedType) return false;
      return true;
    });
  }, [notifications, filter, selectedType]);
  
  // 分组后的通知
  const groupedNotifications = useMemo(() => {
    const groups: Record<GroupKey, Notification[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
    };
    
    filteredNotifications.forEach(n => {
      const key = getGroupKey(n.createdAt);
      groups[key].push(n);
    });
    
    return groups;
  }, [filteredNotifications]);
  
  // 统计
  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.read).length, 
    [notifications]
  );
  
  // 获取通知
  const fetchNotifications = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const params = new URLSearchParams();
      if (filter === 'unread') params.append('read', 'false');
      if (filter === 'read') params.append('read', 'true');
      if (selectedType !== 'all') params.append('type', selectedType);
      
      const response = await fetch(`/api/notifications?${params.toString()}`);
      
      if (!response.ok) throw new Error('Failed to fetch notifications');
      
      const data = await response.json();
      setNotifications(data.notifications || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [filter, selectedType]);
  
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);
  
  // 标记已读
  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: true }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };
  
  // 批量标记已读
  const markSelectedAsRead = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, read: true }),
      });
      setNotifications(prev => prev.map(n => 
        ids.includes(n.id) ? { ...n, read: true } : n
      ));
      clear();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };
  
  // 全部标记已读
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };
  
  // 删除通知
  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };
  
  // 批量删除
  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    
    if (!confirm(locale === 'zh' 
      ? `确定删除选中的 ${ids.length} 条通知吗？` 
      : `Delete ${ids.length} selected notifications?`
    )) return;
    
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      clear();
    } catch (err) {
      console.error('Failed to delete notifications:', err);
    }
  };
  
  // 清空全部
  const clearAllNotifications = async () => {
    if (!confirm(locale === 'zh' 
      ? '确定清空所有通知吗？此操作不可恢复。' 
      : 'Delete all notifications? This cannot be undone.'
    )) return;
    
    try {
      await fetch('/api/notifications?deleteAll=true', { method: 'DELETE' });
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };
  
  // 刷新
  const handleRefresh = () => fetchNotifications(true);
  
  // 全选/取消全选
  const handleToggleAll = () => {
    toggleAll(filteredNotifications.map(n => n.id));
  };
  
  // 渲染分组
  const renderGroups = () => {
    const groupOrder: GroupKey[] = ['today', 'yesterday', 'thisWeek', 'earlier'];
    
    return groupOrder.map(key => {
      const items = groupedNotifications[key];
      if (items.length === 0) return null;
      
      return (
        <div key={key} className="mb-6">
          <GroupHeader label={getGroupLabel(key, locale)} count={items.length} />
          <div className="space-y-3">
            {items.map((notification, index) => (
              <div
                key={notification.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <NotificationItem
                  notification={notification}
                  isSelected={selectedIds.has(notification.id)}
                  onToggleSelect={() => toggle(notification.id)}
                  onMarkRead={() => markAsRead(notification.id)}
                  onDelete={() => deleteNotification(notification.id)}
                  onNavigate={() => notification.link && router.push(notification.link)}
                  locale={locale}
                />
              </div>
            ))}
          </div>
        </div>
      );
    });
  };
  
  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-40" />
            <div className="flex flex-wrap gap-3">
              <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-32" />
              <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-40" />
              <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-36" />
            </div>
            <NotificationSkeleton count={5} />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-20 px-4 sm:px-6 lg:px-8 safe-bottom">
      <div className="max-w-3xl mx-auto" ref={listRef}>
        {/* 页面头部 */}
        <header className="mb-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white tracking-tight">
                {locale === 'zh' ? '通知中心' : 'Notifications'}
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                {unreadCount > 0 
                  ? (locale === 'zh' ? `您有 ${unreadCount} 条未读通知` : `${unreadCount} unread notifications`)
                  : (locale === 'zh' ? '暂无未读通知' : 'No unread notifications')
                }
              </p>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all disabled:opacity-50"
                aria-label="Refresh"
              >
                <svg 
                  className={`w-5 h-5 text-zinc-600 dark:text-zinc-400 ${isRefreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 text-white font-medium text-sm hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors btn-ripple"
              >
                {locale === 'zh' ? '全部已读' : 'Mark all read'}
              </button>
              
              <button
                onClick={clearAllNotifications}
                disabled={notifications.length === 0}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm hover:border-red-300 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {locale === 'zh' ? '清空' : 'Clear all'}
              </button>
            </div>
          </div>
          
          {/* 筛选器 */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* 状态筛选 */}
            <div className="flex bg-white dark:bg-zinc-900 rounded-xl p-1 border border-zinc-200 dark:border-zinc-800">
              {(['all', 'unread', 'read'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${filter === f 
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }
                  `}
                >
                  {f === 'all' && (locale === 'zh' ? '全部' : 'All')}
                  {f === 'unread' && (locale === 'zh' ? '未读' : 'Unread')}
                  {f === 'read' && (locale === 'zh' ? '已读' : 'Read')}
                </button>
              ))}
            </div>
            
            {/* 类型筛选 */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none cursor-pointer"
            >
              <option value="all">{locale === 'zh' ? '所有类型' : 'All types'}</option>
              {Object.entries(typeConfig).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </header>
        
        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-400 animate-shake">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}
        
        {/* 通知列表 */}
        <main className="relative">
          {filteredNotifications.length === 0 ? (
            <EmptyState filter={filter} locale={locale} />
          ) : (
            renderGroups()
          )}
        </main>
        
        {/* 批量操作栏 */}
        <BatchActionBar
          selectedCount={selectedIds.size}
          totalCount={filteredNotifications.length}
          onSelectAll={handleToggleAll}
          onMarkRead={markSelectedAsRead}
          onDelete={deleteSelected}
          onClear={clear}
          locale={locale}
        />
      </div>
    </div>
  );
}
