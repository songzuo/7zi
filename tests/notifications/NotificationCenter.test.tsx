/**
 * Tests for NotificationCenter Component
 * Tests component rendering and user interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationCenter } from '@/components/NotificationCenter/NotificationCenter';
import type { Notification } from '@/components/NotificationCenter/types';

// Mock NotificationItem component
vi.mock('@/components/NotificationCenter/NotificationItem', () => ({
  NotificationItem: ({
    notification,
    onMarkAsRead,
    onDelete,
  }: {
    notification: Notification;
    onMarkAsRead?: (id: string) => void;
    onDelete?: (id: string) => void;
  }) => (
    <li data-testid={`notification-${notification.id}`}>
      <div data-testid={`title-${notification.id}`}>{notification.title}</div>
      <div data-testid={`message-${notification.id}`}>{notification.message}</div>
      <button
        onClick={() => onMarkAsRead?.(notification.id)}
        data-testid={`mark-read-${notification.id}`}
      >
        Mark as Read
      </button>
      <button
        onClick={() => onDelete?.(notification.id)}
        data-testid={`delete-${notification.id}`}
      >
        Delete
      </button>
    </li>
  ),
}));

// Mock NotificationBadge component
vi.mock('@/components/NotificationCenter/NotificationBadge', () => ({
  NotificationBadge: ({ count }: { count: number }) => (
    <span data-testid="notification-badge" aria-label={`${count} 条未读通知`}>
      {count}
    </span>
  ),
}));

describe('NotificationCenter Component', () => {
  const mockNotifications: Notification[] = [
    {
      id: '1',
      title: '系统通知',
      message: '这是一条测试通知消息',
      type: 'info',
      read: false,
      createdAt: new Date('2024-01-15T10:00:00Z'),
    },
    {
      id: '2',
      title: '操作成功',
      message: '您的操作已成功完成',
      type: 'success',
      read: false,
      createdAt: new Date('2024-01-15T09:00:00Z'),
    },
    {
      id: '3',
      title: '警告信息',
      message: '请注意这是一条警告',
      type: 'warning',
      read: true,
      createdAt: new Date('2024-01-14T10:00:00Z'),
      priority: 'high',
    },
  ];

  const mockOnMarkAsRead = vi.fn();
  const mockOnMarkAllAsRead = vi.fn();
  const mockOnClearAll = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render notification button', () => {
      render(
        <NotificationCenter
          notifications={mockNotifications}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      const button = screen.getByRole('button', { name: '通知中心' });
      expect(button).toBeInTheDocument();
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('should display notification badge with unread count', () => {
      render(
        <NotificationCenter
          notifications={mockNotifications}
          showUnreadBadge={true}
        />
      );

      const badge = screen.getByTestId('notification-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('2'); // 2 unread notifications
    });

    it('should not display badge when showUnreadBadge is false', () => {
      render(
        <NotificationCenter
          notifications={mockNotifications}
          showUnreadBadge={false}
        />
      );

      expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
    });

    it('should not display badge when there are no unread notifications', () => {
      const allReadNotifications = mockNotifications.map((n) => ({
        ...n,
        read: true,
      }));

      render(
        <NotificationCenter
          notifications={allReadNotifications}
          showUnreadBadge={true}
        />
      );

      expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <NotificationCenter
          notifications={[]}
          className="custom-class-name"
        />
      );

      expect(container.querySelector('.custom-class-name')).toBeInTheDocument();
    });

    it('should have correct ARIA attributes', () => {
      const { container } = render(
        <NotificationCenter
          notifications={mockNotifications}
        />
      );

      const button = screen.getByRole('button', { name: '通知中心' });
      expect(button).toHaveAttribute('aria-haspopup', 'true');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Dropdown Panel', () => {
    it('should open dropdown when button is clicked', async () => {
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

      const buttonAfterClick = screen.getByRole('button', { name: '通知中心' });
      expect(buttonAfterClick).toHaveAttribute('aria-expanded', 'true');
    });

    it('should close dropdown when overlay is clicked', async () => {
      render(
        <NotificationCenter
          notifications={mockNotifications}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: '通知中心' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('通知中心')).toBeInTheDocument();
      });

      // Click overlay
      const overlay = document.querySelector('.fixed.inset-0');
      if (overlay) {
        fireEvent.click(overlay);
      }

      await waitFor(() => {
        expect(screen.queryByText('通知中心')).not.toBeInTheDocument();
      });
    });

    it('should toggle dropdown when button is clicked twice', async () => {
      render(
        <NotificationCenter
          notifications={mockNotifications}
        />
      );

      const button = screen.getByRole('button', { name: '通知中心' });

      // Open
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('通知中心')).toBeInTheDocument();
      });

      // Close
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.queryByText('通知中心')).not.toBeInTheDocument();
      });
    });
  });

  describe('Notification List', () => {
    it('should display notification list in dropdown', async () => {
      render(
        <NotificationCenter
          notifications={mockNotifications}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '通知中心' }));

      await waitFor(() => {
        expect(screen.getByText('系统通知')).toBeInTheDocument();
        expect(screen.getByText('操作成功')).toBeInTheDocument();
        expect(screen.getByText('警告信息')).toBeInTheDocument();
      });
    });

    it('should limit visible notifications to maxVisible', async () => {
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

      // Check that only 10 notifications are rendered
      const items = screen.getAllByTestId(/^notification-\d+$/);
      expect(items.length).toBe(10);
    });

    it('should show empty state when no notifications', async () => {
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

    it('should not show "more" message when notifications count <= maxVisible', async () => {
      render(
        <NotificationCenter
          notifications={mockNotifications}
          maxVisible={10}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '通知中心' }));

      await waitFor(() => {
        expect(screen.queryByText(/还有 \d+ 条通知/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Actions', () => {
    it('should show "Mark All as Read" button when there are unread notifications', async () => {
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
    });

    it('should call onMarkAllAsRead when "Mark All as Read" is clicked', async () => {
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

    it('should show "Clear" button when there are notifications', async () => {
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
    });

    it('should call onClearAll when "Clear" is clicked and close dropdown', async () => {
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

      await waitFor(() => {
        expect(screen.queryByText('通知中心')).not.toBeInTheDocument();
      });
    });

    it('should not show "Mark All as Read" when all notifications are read', async () => {
      const allReadNotifications = mockNotifications.map((n) => ({
        ...n,
        read: true,
      }));

      render(
        <NotificationCenter
          notifications={allReadNotifications}
          onMarkAllAsRead={mockOnMarkAllAsRead}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '通知中心' }));

      await waitFor(() => {
        expect(screen.queryByText('全部已读')).not.toBeInTheDocument();
      });
    });

    it('should not show "Clear" when there are no notifications', async () => {
      render(
        <NotificationCenter
          notifications={[]}
          onClearAll={mockOnClearAll}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '通知中心' }));

      await waitFor(() => {
        expect(screen.queryByText('清空')).not.toBeInTheDocument();
      });
    });

    it('should call onMarkAsRead when individual notification is marked as read', async () => {
      render(
        <NotificationCenter
          notifications={mockNotifications}
          onMarkAsRead={mockOnMarkAsRead}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '通知中心' }));

      await waitFor(() => {
        expect(screen.getByTestId('mark-read-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('mark-read-1'));
      expect(mockOnMarkAsRead).toHaveBeenCalledWith('1');
    });

    it('should call onDelete when individual notification is deleted', async () => {
      render(
        <NotificationCenter
          notifications={mockNotifications}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '通知中心' }));

      await waitFor(() => {
        expect(screen.getByTestId('delete-2')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('delete-2'));
      expect(mockOnDelete).toHaveBeenCalledWith('2');
    });
  });

  describe('Sorting', () => {
    it('should sort notifications by priority and time', async () => {
      const unsortedNotifications: Notification[] = [
        {
          id: '1',
          title: 'Low Priority',
          message: 'Low',
          type: 'info',
          read: false,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          priority: 'low',
        },
        {
          id: '2',
          title: 'High Priority',
          message: 'High',
          type: 'warning',
          read: false,
          createdAt: new Date('2024-01-15T09:00:00Z'),
          priority: 'high',
        },
        {
          id: '3',
          title: 'Another High',
          message: 'Another',
          type: 'warning',
          read: false,
          createdAt: new Date('2024-01-15T08:00:00Z'),
          priority: 'high',
        },
      ];

      render(
        <NotificationCenter
          notifications={unsortedNotifications}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '通知中心' }));

      await waitFor(() => {
        const titles = screen.getAllByTestId(/^title-/);
        expect(titles[0]).toHaveTextContent('Another High'); // High priority, oldest
        expect(titles[1]).toHaveTextContent('High Priority'); // High priority, newer
        expect(titles[2]).haveTextContent('Low Priority'); // Low priority
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle maxVisible = 0', async () => {
      render(
        <NotificationCenter
          notifications={mockNotifications}
          maxVisible={0}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '通知中心' }));

      await waitFor(() => {
        expect(screen.getByText('还有 3 条通知')).toBeInTheDocument();
        expect(screen.queryByTestId(/^notification-\d+$/)).not.toBeInTheDocument();
      });
    });

    it('should handle large maxVisible value', async () => {
      render(
        <NotificationCenter
          notifications={mockNotifications}
          maxVisible={1000}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '通知中心' }));

      await waitFor(() => {
        expect(screen.queryByText(/还有 \d+ 条通知/)).not.toBeInTheDocument();
        expect(screen.getByTestId('notification-1')).toBeInTheDocument();
        expect(screen.getByTestId('notification-2')).toBeInTheDocument();
        expect(screen.getByTestId('notification-3')).toBeInTheDocument();
      });
    });

    it('should handle notifications without priority', async () => {
      const notificationsWithoutPriority: Notification[] = [
        {
          id: '1',
          title: 'No Priority',
          message: 'Test',
          type: 'info',
          read: false,
          createdAt: new Date(),
        },
      ];

      render(
        <NotificationCenter
          notifications={notificationsWithoutPriority}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '通知中心' }));

      await waitFor(() => {
        expect(screen.getByText('No Priority')).toBeInTheDocument();
      });
    });
  });
});
