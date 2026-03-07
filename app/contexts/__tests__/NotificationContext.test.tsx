import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { 
  NotificationProvider, 
  useNotifications,
  createNotificationHelpers 
} from '../NotificationContext';

// Mock the zustand store
vi.mock('@/lib/notifications', () => {
  let notifications: any[] = [];
  
  return {
    useNotificationStore: vi.fn(() => ({
      get notifications() { return notifications; },
      push: vi.fn((options: any) => {
        const n = {
          id: `test-${Date.now()}-${Math.random()}`,
          type: options.type || 'info',
          title: options.title,
          message: options.message,
          duration: options.duration ?? 5000,
          createdAt: Date.now(),
          dismissed: false,
        };
        notifications = [n, ...notifications];
        return n;
      }),
      dismiss: vi.fn((id: string) => {
        const n = notifications.find(x => x.id === id);
        if (n) n.dismissed = true;
      }),
      clearAll: vi.fn(() => {
        notifications = [];
      }),
      success: vi.fn((title: string, message?: string) => {
        const n = {
          id: `test-${Date.now()}`,
          type: 'success',
          title,
          message,
          duration: 5000,
          createdAt: Date.now(),
          dismissed: false,
        };
        notifications = [n, ...notifications];
        return n;
      }),
      error: vi.fn((title: string, message?: string) => {
        const n = {
          id: `test-${Date.now()}`,
          type: 'error',
          title,
          message,
          duration: 8000,
          createdAt: Date.now(),
          dismissed: false,
        };
        notifications = [n, ...notifications];
        return n;
      }),
      warning: vi.fn((title: string, message?: string) => {
        const n = {
          id: `test-${Date.now()}`,
          type: 'warning',
          title,
          message,
          duration: 5000,
          createdAt: Date.now(),
          dismissed: false,
        };
        notifications = [n, ...notifications];
        return n;
      }),
      info: vi.fn((title: string, message?: string) => {
        const n = {
          id: `test-${Date.now()}`,
          type: 'info',
          title,
          message,
          duration: 5000,
          createdAt: Date.now(),
          dismissed: false,
        };
        notifications = [n, ...notifications];
        return n;
      }),
    })),
  };
});

// Test component that uses the hook
function TestComponent({ onMount }: { onMount?: (notifications: ReturnType<typeof useNotifications>) => void }) {
  const notifications = useNotifications();
  
  React.useEffect(() => {
    onMount?.(notifications);
  }, []);
  
  return (
    <div>
      <button onClick={() => notifications.success('Success!')} data-testid="success-btn">
        Success
      </button>
      <button onClick={() => notifications.error('Error!')} data-testid="error-btn">
        Error
      </button>
      <button onClick={() => notifications.warning('Warning!')} data-testid="warning-btn">
        Warning
      </button>
      <button onClick={() => notifications.info('Info!')} data-testid="info-btn">
        Info
      </button>
      <button onClick={() => notifications.clearAll()} data-testid="clear-btn">
        Clear
      </button>
      <div data-testid="count">{notifications.notifications.length}</div>
    </div>
  );
}

describe('NotificationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('NotificationProvider', () => {
    it('should provide notification context to children', () => {
      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );
      
      expect(screen.getByTestId('success-btn')).toBeDefined();
    });

    it('should throw error when useNotifications is used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useNotifications must be used within a NotificationProvider');
      
      consoleError.mockRestore();
    });
  });

  describe('useNotifications hook', () => {
    it('should provide success method', async () => {
      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );
      
      fireEvent.click(screen.getByTestId('success-btn'));
      
      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('1');
      });
    });

    it('should provide error method', async () => {
      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );
      
      fireEvent.click(screen.getByTestId('error-btn'));
      
      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('1');
      });
    });

    it('should provide warning method', async () => {
      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );
      
      fireEvent.click(screen.getByTestId('warning-btn'));
      
      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('1');
      });
    });

    it('should provide info method', async () => {
      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );
      
      fireEvent.click(screen.getByTestId('info-btn'));
      
      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('1');
      });
    });

    it('should provide clearAll method', async () => {
      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );
      
      fireEvent.click(screen.getByTestId('success-btn'));
      fireEvent.click(screen.getByTestId('error-btn'));
      
      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('2');
      });
      
      fireEvent.click(screen.getByTestId('clear-btn'));
      
      await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('0');
      });
    });
  });

  describe('createNotificationHelpers', () => {
    it('should create helper functions', () => {
      let capturedNotifications: any = null;
      
      render(
        <NotificationProvider>
          <TestComponent onMount={(n) => { capturedNotifications = n; }} />
        </NotificationProvider>
      );
      
      const helpers = createNotificationHelpers(capturedNotifications!);
      
      expect(helpers.created).toBeInstanceOf(Function);
      expect(helpers.updated).toBeInstanceOf(Function);
      expect(helpers.deleted).toBeInstanceOf(Function);
      expect(helpers.failed).toBeInstanceOf(Function);
      expect(helpers.copied).toBeInstanceOf(Function);
      expect(helpers.saving).toBeInstanceOf(Function);
      expect(helpers.saved).toBeInstanceOf(Function);
    });
  });
});