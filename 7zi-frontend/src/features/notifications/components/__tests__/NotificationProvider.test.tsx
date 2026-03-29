/**
 * NotificationProvider Component Tests
 *
 * 测试通知提供者组件的功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import NotificationProvider, { useNotificationContext } from '../NotificationProvider';

// Mock the useNotifications hook
vi.mock('@/hooks/useNotifications', () => ({
  default: vi.fn(() => ({
    notifications: [],
    unreadCount: 0,
    status: 'disconnected',
    isConnected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    refreshNotifications: vi.fn(),
  })),
}));

// Mock Notification API
const mockNotification = {
  permission: 'default' as NotificationPermission,
  requestPermission: vi.fn(() => Promise.resolve('granted')),
};

global.Notification = mockNotification as any;

describe('NotificationProvider Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render children', () => {
      render(
        <NotificationProvider>
          <div>Test Child</div>
        </NotificationProvider>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <NotificationProvider>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </NotificationProvider>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });

    it('should render nested components', () => {
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <div className="wrapper">{children}</div>
      );

      render(
        <NotificationProvider>
          <Wrapper>
            <div>Nested Content</div>
          </Wrapper>
        </NotificationProvider>
      );

      expect(screen.getByText('Nested Content')).toBeInTheDocument();
    });
  });

  describe('Context Provision', () => {
    it('should provide notification context to children', () => {
      const TestComponent = () => {
        const context = useNotificationContext();
        expect(context).toBeDefined();
        expect(context.notifications).toEqual([]);
        expect(context.unreadCount).toBe(0);
        return <div>Context Available</div>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      expect(screen.getByText('Context Available')).toBeInTheDocument();
    });

    it('should provide all context properties', () => {
      let contextValue: any = null;

      const TestComponent = () => {
        const context = useNotificationContext();
        contextValue = context;
        return <div>Test</div>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      expect(contextValue).toHaveProperty('notifications');
      expect(contextValue).toHaveProperty('unreadCount');
      expect(contextValue).toHaveProperty('status');
      expect(contextValue).toHaveProperty('isConnected');
      expect(contextValue).toHaveProperty('connect');
      expect(contextValue).toHaveProperty('disconnect');
      expect(contextValue).toHaveProperty('markAsRead');
      expect(contextValue).toHaveProperty('markAllAsRead');
      expect(contextValue).toHaveProperty('deleteNotification');
      expect(contextValue).toHaveProperty('refreshNotifications');
    });
  });

  describe('Options Propagation', () => {
    it('should pass options to useNotifications', () => {
      const useNotifications = require('@/hooks/useNotifications').default;

      render(
        <NotificationProvider
          userId="user-123"
          teamId="team-456"
          autoConnect={false}
        >
          <div>Test</div>
        </NotificationProvider>
      );

      expect(useNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          teamId: 'team-456',
          autoConnect: false,
        })
      );
    });

    it('should pass custom socket URL', () => {
      const useNotifications = require('@/hooks/useNotifications').default;

      render(
        <NotificationProvider socketUrl="http://custom:3002">
          <div>Test</div>
        </NotificationProvider>
      );

      expect(useNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          socketUrl: 'http://custom:3002',
        })
      );
    });

    it('should pass channels array', () => {
      const useNotifications = require('@/hooks/useNotifications').default;

      render(
        <NotificationProvider channels={['channel1', 'channel2']}>
          <div>Test</div>
        </NotificationProvider>
      );

      expect(useNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          channels: ['channel1', 'channel2'],
        })
      );
    });

    it('should pass all options together', () => {
      const useNotifications = require('@/hooks/useNotifications').default;

      render(
        <NotificationProvider
          userId="user-1"
          teamId="team-1"
          autoConnect={true}
          socketUrl="http://localhost:3001"
          channels={['user:1', 'team:1', 'global']}
        >
          <div>Test</div>
        </NotificationProvider>
      );

      expect(useNotifications).toHaveBeenCalledWith({
        userId: 'user-1',
        teamId: 'team-1',
        autoConnect: true,
        socketUrl: 'http://localhost:3001',
        channels: ['user:1', 'team:1', 'global'],
      });
    });
  });

  describe('Context Consumption', () => {
    it('should allow multiple children to consume context', () => {
      let context1: any = null;
      let context2: any = null;

      const TestComponent1 = () => {
        context1 = useNotificationContext();
        return <div>Component 1</div>;
      };

      const TestComponent2 = () => {
        context2 = useNotificationContext();
        return <div>Component 2</div>;
      };

      render(
        <NotificationProvider>
          <TestComponent1 />
          <TestComponent2 />
        </NotificationProvider>
      );

      expect(context1).toBeDefined();
      expect(context2).toBeDefined();
      expect(screen.getByText('Component 1')).toBeInTheDocument();
      expect(screen.getByText('Component 2')).toBeInTheDocument();
    });

    it('should share same context instance across all consumers', () => {
      const contexts: any[] = [];

      const TestComponent = ({ id }: { id: number }) => {
        const context = useNotificationContext();
        contexts[id] = context;
        return <div>Component {id}</div>;
      };

      render(
        <NotificationProvider>
          <TestComponent id={0} />
          <TestComponent id={1} />
          <TestComponent id={2} />
        </NotificationProvider>
      );

      // All components should receive the same context instance
      expect(contexts[0]).toBe(contexts[1]);
      expect(contexts[1]).toBe(contexts[2]);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when useNotificationContext used outside provider', () => {
      const TestComponent = () => {
        try {
          useNotificationContext();
          return <div>No Error</div>;
        } catch (error) {
          return <div>Error Caught: {(error as Error).message}</div>;
        }
      };

      render(<TestComponent />);

      expect(screen.getByText(/Error Caught/)).toBeInTheDocument();
    });

    it('should provide error context when useNotifications fails', () => {
      const useNotifications = require('@/hooks/useNotifications').default;
      useNotifications.mockImplementation(() => {
        throw new Error('useNotifications failed');
      });

      expect(() => {
        render(
          <NotificationProvider>
            <div>Test</div>
          </NotificationProvider>
        );
      }).toThrow('useNotifications failed');
    });
  });

  describe('Re-render Optimization', () => {
    it('should not cause unnecessary re-renders', () => {
      let renderCount = 0;

      const TestComponent = () => {
        const context = useNotificationContext();
        renderCount++;
        return <div>Renders: {renderCount}</div>;
      };

      const { rerender } = render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      const initialRenderCount = renderCount;

      // Rerender parent
      rerender(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      // Context value should be memoized, so child shouldn't re-render unnecessarily
      // However, with memo, it should still only render once
      expect(renderCount).toBe(initialRenderCount);
    });
  });

  describe('Integration with useNotifications', () => {
    it('should expose connect function', () => {
      let contextConnect: any = null;

      const TestComponent = () => {
        const context = useNotificationContext();
        contextConnect = context.connect;
        return <div>Test</div>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      expect(typeof contextConnect).toBe('function');
    });

    it('should expose disconnect function', () => {
      let contextDisconnect: any = null;

      const TestComponent = () => {
        const context = useNotificationContext();
        contextDisconnect = context.disconnect;
        return <div>Test</div>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      expect(typeof contextDisconnect).toBe('function');
    });

    it('should expose markAsRead function', () => {
      let contextMarkAsRead: any = null;

      const TestComponent = () => {
        const context = useNotificationContext();
        contextMarkAsRead = context.markAsRead;
        return <div>Test</div>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      expect(typeof contextMarkAsRead).toBe('function');
    });
  });

  describe('Browser Notification Permission', () => {
    it('should request notification permission on mount', async () => {
      render(
        <NotificationProvider>
          <div>Test</div>
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(mockNotification.requestPermission).toHaveBeenCalled();
      });
    });

    it('should handle granted permission', async () => {
      mockNotification.permission = 'granted';

      render(
        <NotificationProvider>
          <div>Test</div>
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(mockNotification.requestPermission).not.toHaveBeenCalled();
      });
    });

    it('should handle denied permission', async () => {
      mockNotification.permission = 'denied';

      render(
        <NotificationProvider>
          <div>Test</div>
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(mockNotification.requestPermission).not.toHaveBeenCalled();
      });
    });
  });
});
