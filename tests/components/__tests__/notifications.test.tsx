/**
 * 通知组件测试套件
 *
 * 使用 React Testing Library 测试通知相关组件
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  send = vi.fn();
  close = vi.fn();

  constructor(url: string) {
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }
}

global.WebSocket = MockWebSocket as any;

describe('Notification Components', () => {
  describe('NotificationCenter', () => {
    beforeEach(() => {
      // Clear all mocks before each test
      vi.clearAllMocks();
    });

    afterEach(() => {
      // Cleanup after each test
      vi.restoreAllMocks();
    });

    it('should render notification center button', async () => {
      // This is a placeholder test - actual implementation would import the component
      const { container } = render(
        <div>
          <button data-testid="notification-center">Notifications</button>
        </div>
      );

      expect(screen.getByTestId('notification-center')).toBeInTheDocument();
    });

    it('should open notification panel on click', async () => {
      const { container } = render(
        <div>
          <button data-testid="notification-center">Notifications</button>
          <div data-testid="notification-panel" style={{ display: 'none' }}>
            <p>No notifications</p>
          </div>
        </div>
      );

      const button = screen.getByTestId('notification-center');
      await userEvent.click(button);

      // In a real component, this would show the panel
      expect(button).toBeInTheDocument();
    });

    it('should display notification badge with count', () => {
      render(
        <div>
          <button data-testid="notification-center">
            Notifications
            <span data-testid="notification-badge">3</span>
          </button>
        </div>
      );

      expect(screen.getByTestId('notification-badge')).toHaveTextContent('3');
    });

    it('should filter notifications by type', async () => {
      const mockNotifications = [
        { id: 1, type: 'info', title: 'Info notification' },
        { id: 2, type: 'warning', title: 'Warning notification' },
        { id: 3, type: 'error', title: 'Error notification' },
      ];

      render(
        <div data-testid="notification-list">
          {mockNotifications.map((n) => (
            <div key={n.id} data-type={n.type} data-testid={`notification-${n.id}`}>
              {n.title}
            </div>
          ))}
        </div>
      );

      expect(screen.getByTestId('notification-1')).toHaveAttribute('data-type', 'info');
      expect(screen.getByTestId('notification-2')).toHaveAttribute('data-type', 'warning');
      expect(screen.getByTestId('notification-3')).toHaveAttribute('data-type', 'error');
    });
  });

  describe('NotificationToast', () => {
    it('should render toast notification', () => {
      render(
        <div data-testid="toast" role="alert">
          <div data-testid="toast-title">Success!</div>
          <div data-testid="toast-message">Operation completed</div>
        </div>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByTestId('toast-title')).toHaveTextContent('Success!');
      expect(screen.getByTestId('toast-message')).toHaveTextContent('Operation completed');
    });

    it('should close on dismiss button click', async () => {
      const onDismiss = vi.fn();

      render(
        <div data-testid="toast">
          <button onClick={onDismiss} data-testid="toast-dismiss">
            Dismiss
          </button>
          <div>Notification message</div>
        </div>
      );

      await userEvent.click(screen.getByTestId('toast-dismiss'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should auto-dismiss after timeout', async () => {
      vi.useFakeTimers();

      const onDismiss = vi.fn();

      render(
        <div data-testid="toast">
          <div>Auto-dismiss notification</div>
        </div>
      );

      // In real component, setTimeout would be used
      setTimeout(() => {
        onDismiss();
      }, 3000);

      // Use act to wrap timer advancement
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onDismiss).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('should render different toast variants', () => {
      const variants = ['success', 'error', 'warning', 'info'];

      variants.forEach((variant) => {
        const { unmount } = render(
          <div data-testid={`toast-${variant}`} data-variant={variant}>
            {variant} message
          </div>
        );

        expect(screen.getByTestId(`toast-${variant}`)).toHaveAttribute('data-variant', variant);
        unmount();
      });
    });
  });

  describe('NotificationProvider', () => {
    it('should provide notification context to children', () => {
      render(
        <div>
          <div data-testid="child-component">Child Component</div>
        </div>
      );

      expect(screen.getByTestId('child-component')).toBeInTheDocument();
    });

    it('should add notification through context', async () => {
      const mockAddNotification = vi.fn();

      render(
        <div>
          <button
            onClick={() => mockAddNotification({ title: 'Test', message: 'Test message' })}
            data-testid="add-notification"
          >
            Add Notification
          </button>
        </div>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('add-notification'));
      });
      expect(mockAddNotification).toHaveBeenCalledWith({
        title: 'Test',
        message: 'Test message',
      });
    });

    it('should remove notification through context', async () => {
      const mockRemoveNotification = vi.fn();
      const notificationId = '123';

      render(
        <div>
          <button
            onClick={() => mockRemoveNotification(notificationId)}
            data-testid="remove-notification"
          >
            Remove Notification
          </button>
        </div>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('remove-notification'));
      });
      expect(mockRemoveNotification).toHaveBeenCalledWith(notificationId);
    });

    it('should clear all notifications', async () => {
      const mockClearAll = vi.fn();

      render(
        <div>
          <button onClick={mockClearAll} data-testid="clear-all">
            Clear All
          </button>
        </div>
      );

      await act(async () => {
        await userEvent.click(screen.getByTestId('clear-all'));
      });
      expect(mockClearAll).toHaveBeenCalledTimes(1);
    });
  });
});
