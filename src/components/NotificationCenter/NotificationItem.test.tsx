/**
 * @fileoverview 通知项组件测试
 * @description 测试 NotificationItem 组件的功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationItem } from './NotificationItem';
import type { Notification } from './types';

describe('NotificationItem', () => {
  const mockNotification: Notification = {
    id: 'test-1',
    title: '测试通知',
    message: '这是一条测试消息',
    type: 'info',
    read: false,
    createdAt: new Date(),
  };

  const mockOnMarkAsRead = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确渲染通知内容', () => {
    render(
      <NotificationItem
        notification={mockNotification}
        onMarkAsRead={mockOnMarkAsRead}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('测试通知')).toBeInTheDocument();
    expect(screen.getByText('这是一条测试消息')).toBeInTheDocument();
  });

  it('应该显示相对时间', () => {
    const oldNotification = {
      ...mockNotification,
      createdAt: new Date(Date.now() - 3600000), // 1小时前
    };

    render(
      <NotificationItem
        notification={oldNotification}
      />
    );

    expect(screen.getByText('1 小时前')).toBeInTheDocument();
  });

  it('未读通知应该显示未读指示器', () => {
    render(
      <NotificationItem
        notification={mockNotification}
      />
    );

    // 未读指示器是一个圆点
    const unreadDot = document.querySelector('.bg-blue-500.w-2.h-2');
    expect(unreadDot).toBeInTheDocument();
  });

  it('已读通知不应该显示未读指示器', () => {
    const readNotification = { ...mockNotification, read: true };

    render(
      <NotificationItem
        notification={readNotification}
      />
    );

    const unreadDot = document.querySelector('.bg-blue-500.w-2.h-2');
    expect(unreadDot).not.toBeInTheDocument();
  });

  it('点击标记已读按钮应该调用回调', () => {
    render(
      <NotificationItem
        notification={mockNotification}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    const markAsReadButton = screen.getByLabelText('标记已读');
    fireEvent.click(markAsReadButton);

    expect(mockOnMarkAsRead).toHaveBeenCalledWith('test-1');
  });

  it('已读通知不显示标记已读按钮', () => {
    const readNotification = { ...mockNotification, read: true };

    render(
      <NotificationItem
        notification={readNotification}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    expect(screen.queryByLabelText('标记已读')).not.toBeInTheDocument();
  });

  it('点击删除按钮应该调用回调', () => {
    render(
      <NotificationItem
        notification={mockNotification}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByLabelText('删除通知');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('test-1');
  });

  it('没有 onDelete 时不显示删除按钮', () => {
    render(
      <NotificationItem notification={mockNotification} />
    );

    expect(screen.queryByLabelText('删除通知')).not.toBeInTheDocument();
  });

  it('不同类型应该显示不同的图标样式', () => {
    const { rerender } = render(
      <NotificationItem notification={{ ...mockNotification, type: 'success' }} />
    );
    expect(document.querySelector('.bg-green-50')).toBeInTheDocument();

    rerender(
      <NotificationItem notification={{ ...mockNotification, type: 'warning' }} />
    );
    expect(document.querySelector('.bg-yellow-50')).toBeInTheDocument();

    rerender(
      <NotificationItem notification={{ ...mockNotification, type: 'error' }} />
    );
    expect(document.querySelector('.bg-red-50')).toBeInTheDocument();

    rerender(
      <NotificationItem notification={{ ...mockNotification, type: 'info' }} />
    );
    expect(document.querySelector('.bg-blue-50')).toBeInTheDocument();
  });

  it('支持自定义图标', () => {
    const customIconNotification = {
      ...mockNotification,
      icon: '🔔',
    };

    render(
      <NotificationItem notification={customIconNotification} />
    );

    expect(screen.getByText('🔔')).toBeInTheDocument();
  });

  it('点击通知项应该标记已读', () => {
    render(
      <NotificationItem
        notification={mockNotification}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    // 点击 li 元素本身，不是内部的按钮
    const item = document.querySelector('li[role="button"]');
    expect(item).toBeInTheDocument();
    fireEvent.click(item!);

    expect(mockOnMarkAsRead).toHaveBeenCalledWith('test-1');
  });
});