/**
 * @fileoverview 通知中心组件
 * @description 展示通知列表，支持标记已读和清空功能
 */

'use client';

import React, { useState, useMemo } from 'react';
import { NotificationItem } from './NotificationItem';
import { NotificationBadge } from './NotificationBadge';
import type { NotificationCenterProps } from './types';

/** 通知中心组件 */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onDelete,
  showUnreadBadge = true,
  maxVisible = 10,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // 计算未读数量
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // 显示的通知列表（限制数量）
  const visibleNotifications = useMemo(
    () => notifications.slice(0, maxVisible),
    [notifications, maxVisible]
  );

  // 按优先级和时间排序
  const sortedNotifications = useMemo(() => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...visibleNotifications].sort((a, b) => {
      const priorityDiff =
        (priorityOrder[a.priority || 'medium'] ?? 1) -
        (priorityOrder[b.priority || 'medium'] ?? 1);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [visibleNotifications]);

  // 处理标记全部已读
  const handleMarkAllAsRead = () => {
    onMarkAllAsRead?.();
  };

  // 处理清空所有
  const handleClearAll = () => {
    onClearAll?.();
    setIsOpen(false);
  };

  // 处理单个通知标记已读
  const handleMarkAsRead = (id: string) => {
    onMarkAsRead?.(id);
  };

  // 处理删除单个通知
  const handleDelete = (id: string) => {
    onDelete?.(id);
  };

  return (
    <div className={`relative ${className}`}>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="通知中心"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* 铃铛图标 */}
        <svg
          className="w-6 h-6 text-gray-600 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* 未读徽章 */}
        {showUnreadBadge && unreadCount > 0 && (
          <NotificationBadge count={unreadCount} />
        )}
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* 通知面板 */}
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                通知中心
              </h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  >
                    全部已读
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                  >
                    清空
                  </button>
                )}
              </div>
            </div>

            {/* 通知列表 */}
            <div className="max-h-96 overflow-y-auto">
              {sortedNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                  <svg
                    className="w-12 h-12 mb-2 text-gray-300 dark:text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <p className="text-sm">暂无通知</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* 底部 */}
            {notifications.length > maxVisible && (
              <div className="px-4 py-2 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                还有 {notifications.length - maxVisible} 条通知
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
