/**
 * @fileoverview 通知中心组件测试
 * @description 测试 NotificationCenter 组件的功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationCenter } from './NotificationCenter';
import type { Notification } from './types';

// Mock 通知数据
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: '系统通知',
    message: '这是一条测试通知消息',
    type: 'info',
    read: false,
    createdAt: new Date(),
  },
  {
    id: '2',
    title: '操作成功',
    message: '您的操作已成功完成',
    type: 'success',
    read: false,
    createdAt: new Date(Date.now() - 3600000), // 1小时前
  },
  {
    id: '3',
    title: '警告信息',
    message: '请注意这是一条警告',
    type: 'warning',
    read: true,
    createdAt: new Date(Date.now() - 86400000), // 1天前
    priority: 'high',
  },
];

describe('NotificationCenter', () => {
  const mockOnMarkAsRead = vi.fn();
  const mockOnMarkAllAsRead = vi.fn();
  const mockOnClearAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确渲染通知图标按钮', () => {
    render(
      <NotificationCenter
        notifications={[]}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.getByRole('button', { name: '通知中心' })).toBeInTheDocument();
  });

  it('应该显示未读徽章数量', () => {
    render(
      <NotificationCenter
        notifications={mockNotifications}
        showUnreadBadge={true}
      />
    );

    // 未读数量为2（id 1和2）
    expect(screen.getByLabelText('2 条未读通知')).toBeInTheDocument();
  });

  it('没有未读通知时不显示徽章', () => {
    const readNotifications = mockNotifications.map((n) => ({ ...n, read: true }));
    render(
      <NotificationCenter
        notifications={readNotifications}
        showUnreadBadge={true}
      />
    );

    expect(screen.queryByLabelText(/\d+ 条未读通知/)).not.toBeInTheDocument();
  });

  it('点击按钮应该打开通知面板', async () => {
    render(
      <NotificationCenter
        notifications={mockNotifications}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
      />
    );

    const button = screen.getByRole('button', { name: '通知中心' });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('通知中心')).toBeInTheDocument();
    });
  });

  it('应该显示通知列表', async () => {
    render(
      <NotificationCenter
        notifications={mockNotifications}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
      />
    );

    // 打开面板
    fireEvent.click(screen.getByRole('button', { name: '通知中心' }));

    await waitFor(() => {
      expect(screen.getByText('系统通知')).toBeInTheDocument();
      expect(screen.getByText('操作成功')).toBeInTheDocument();
      expect(screen.getByText('警告信息')).toBeInTheDocument();
    });
  });

  it('没有通知时显示空状态', async () => {
    render(
      <NotificationCenter
        notifications={[]}
        onClearAll={mockOnClearAll}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '通知中心' }));

    await waitFor(() => {
      expect(screen.getByText('暂无通知')).toBeInTheDocument();
    });
  });

  it('点击全部已读应该调用回调', async () => {
    render(
      <NotificationCenter
        notifications={mockNotifications}
        onMarkAllAsRead={mockOnMarkAllAsRead}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '通知中心' }));

    await waitFor(() => {
      expect(screen.getByText('全部已读')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('全部已读'));
    expect(mockOnMarkAllAsRead).toHaveBeenCalledTimes(1);
  });

  it('点击清空应该调用回调', async () => {
    render(
      <NotificationCenter
        notifications={mockNotifications}
        onClearAll={mockOnClearAll}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '通知中心' }));

    await waitFor(() => {
      expect(screen.getByText('清空')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('清空'));
    expect(mockOnClearAll).toHaveBeenCalledTimes(1);
  });

  it('点击遮罩层应该关闭面板', async () => {
    render(
      <NotificationCenter
        notifications={mockNotifications}
      />
    );

    // 打开面板
    fireEvent.click(screen.getByRole('button', { name: '通知中心' }));

    await waitFor(() => {
      expect(screen.getByText('通知中心')).toBeInTheDocument();
    });

    // 点击遮罩
    const overlay = document.querySelector('.fixed.inset-0');
    if (overlay) {
      fireEvent.click(overlay);
    }

    await waitFor(() => {
      expect(screen.queryByText('通知中心')).not.toBeInTheDocument();
    });
  });

  it('应该限制显示的通知数量', async () => {
    const manyNotifications: Notification[] = Array.from(
      { length: 15 },
      (_, i) => ({
        id: `notification-${i}`,
        title: `通知 ${i}`,
        message: `消息 ${i}`,
        type: 'info' as const,
        read: false,
        createdAt: new Date(),
      })
    );

    render(
      <NotificationCenter
        notifications={manyNotifications}
        maxVisible={10}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '通知中心' }));

    await waitFor(() => {
      expect(screen.getByText('还有 5 条通知')).toBeInTheDocument();
    });
  });

  it('应该支持自定义类名', () => {
    render(
      <NotificationCenter
        notifications={[]}
        className="custom-class"
      />
    );

    const container = document.querySelector('.custom-class');
    expect(container).toBeInTheDocument();
  });
});