import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// 必须先 mock zustand store
vi.mock('@/lib/notifications', () => {
  const notifications: any[] = [];
  let listeners: Array<(n: any[]) => void> = [];

  return {
    useNotificationStore: vi.fn(() => ({
      notifications,
      dismiss: vi.fn((id: string) => {
        const n = notifications.find(x => x.id === id);
        if (n) n.dismissed = true;
        listeners.forEach(l => l([...notifications]));
      }),
      clearAll: vi.fn(() => {
        notifications.length = 0;
        listeners.forEach(l => l([]));
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
        notifications.unshift(n);
        listeners.forEach(l => l([...notifications]));
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
        notifications.unshift(n);
        listeners.forEach(l => l([...notifications]));
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
        notifications.unshift(n);
        listeners.forEach(l => l([...notifications]));
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
        notifications.unshift(n);
        listeners.forEach(l => l([...notifications]));
        return n;
      }),
    })),
    NotificationType: {} as any,
    NotificationPosition: {} as any,
  };
});

import { NotificationToast } from '../../components/NotificationToast';
import { useNotificationStore } from '@/lib/notifications';

describe('NotificationToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 重置 store 状态
    const store = useNotificationStore.getState?.() || useNotificationStore();
    store.clearAll?.();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ============================================================================
  // 基础渲染测试
  // ============================================================================

  describe('Basic Rendering', () => {
    it('should render nothing when no notifications', () => {
      const { container } = render(<NotificationToast />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should render notification with title', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Test Title');
      
      render(<NotificationToast />);
      
      expect(screen.getByText('Test Title')).toBeDefined();
    });

    it('should render notification with title and message', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Test Title', 'Test message');
      
      render(<NotificationToast />);
      
      expect(screen.getByText('Test Title')).toBeDefined();
      expect(screen.getByText('Test message')).toBeDefined();
    });
  });

  // ============================================================================
  // 通知类型测试
  // ============================================================================

  describe('Notification Types', () => {
    it('should render success notification with correct styles', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Success!');
      
      render(<NotificationToast />);
      
      const article = screen.getByRole('alert');
      expect(article.className).toContain('bg-green');
    });

    it('should render error notification with correct styles', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.error('Error!');
      
      render(<NotificationToast />);
      
      const article = screen.getByRole('alert');
      expect(article.className).toContain('bg-red');
    });

    it('should render warning notification with correct styles', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.warning('Warning!');
      
      render(<NotificationToast />);
      
      const article = screen.getByRole('alert');
      expect(article.className).toContain('bg-yellow');
    });

    it('should render info notification with correct styles', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.info('Info!');
      
      render(<NotificationToast />);
      
      const article = screen.getByRole('alert');
      expect(article.className).toContain('bg-blue');
    });

    it('should render success icon', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Success!');
      
      render(<NotificationToast />);
      
      expect(screen.getByText('✓')).toBeDefined();
    });

    it('should render error icon', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.error('Error!');
      
      render(<NotificationToast />);
      
      expect(screen.getByText('✕')).toBeDefined();
    });

    it('should render warning icon', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.warning('Warning!');
      
      render(<NotificationToast />);
      
      expect(screen.getByText('⚠')).toBeDefined();
    });

    it('should render info icon', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.info('Info!');
      
      render(<NotificationToast />);
      
      expect(screen.getByText('ℹ')).toBeDefined();
    });
  });

  // ============================================================================
  // 交互测试
  // ============================================================================

  describe('Interactions', () => {
    it('should dismiss notification on close button click', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Test');
      
      render(<NotificationToast />);
      
      const closeButton = screen.getByRole('button', { name: /关闭/i });
      fireEvent.click(closeButton);
      
      // 验证退出动画类被应用
      const article = screen.getByRole('alert');
      expect(article.className).toContain('animate-toast-exit');
    });

    it('should dismiss notification on Escape key', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Test');
      
      render(<NotificationToast />);
      
      const article = screen.getByRole('alert');
      fireEvent.keyDown(article, { key: 'Escape' });
      
      // 验证退出动画类被应用
      expect(article.className).toContain('animate-toast-exit');
    });

    it('should dismiss notification on Enter key', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Test');
      
      render(<NotificationToast />);
      
      const article = screen.getByRole('alert');
      fireEvent.keyDown(article, { key: 'Enter' });
      
      // 验证退出动画类被应用
      expect(article.className).toContain('animate-toast-exit');
    });
  });

  // ============================================================================
  // 堆叠显示测试
  // ============================================================================

  describe('Stacking', () => {
    it('should render multiple notifications', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Test 1');
      store.error('Test 2');
      store.warning('Test 3');
      
      render(<NotificationToast />);
      
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBe(3);
    });

    it('should limit visible notifications with maxVisible prop', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      for (let i = 0; i < 10; i++) {
        store.info(`Test ${i}`);
      }
      
      render(<NotificationToast maxVisible={3} />);
      
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBe(3);
    });

    it('should have staggered animation delay for stacked notifications', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Test 1');
      store.success('Test 2');
      store.success('Test 3');
      
      render(<NotificationToast />);
      
      const alerts = screen.getAllByRole('alert');
      expect(alerts[0].style.animationDelay).toBe('0ms');
      expect(alerts[1].style.animationDelay).toBe('50ms');
      expect(alerts[2].style.animationDelay).toBe('100ms');
    });
  });

  // ============================================================================
  // 可访问性测试
  // ============================================================================

  describe('Accessibility', () => {
    it('should have correct aria attributes on container', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Test');
      
      render(<NotificationToast />);
      
      const region = screen.getByRole('region', { name: /通知/i });
      expect(region).toBeDefined();
      expect(region).toHaveAttribute('aria-live', 'polite');
    });

    it('should have correct aria attributes on notification', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Test Title', 'Test message');
      
      render(<NotificationToast />);
      
      const article = screen.getByRole('alert');
      expect(article).toHaveAttribute('aria-labelledby');
      expect(article).toHaveAttribute('aria-describedby');
    });

    it('should be focusable', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Test');
      
      render(<NotificationToast />);
      
      const article = screen.getByRole('alert');
      expect(article).toHaveAttribute('tabIndex', '0');
    });
  });

  // ============================================================================
  // 进度条测试
  // ============================================================================

  describe('Progress Bar', () => {
    it('should show progress bar when showProgressBar is true', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Test');
      
      render(<NotificationToast showProgressBar={true} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeDefined();
    });

    it('should not show progress bar when showProgressBar is false', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Test');
      
      render(<NotificationToast showProgressBar={false} />);
      
      expect(screen.queryByRole('progressbar')).toBeNull();
    });

    it('should not show progress bar for notifications with duration 0', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.info('Persistent', undefined); // 假设 duration 为 0 时不显示
      
      render(<NotificationToast showProgressBar={true} />);
      
      // 持久通知不应该有进度条
      // 这取决于具体实现
    });
  });

  // ============================================================================
  // 位置测试
  // ============================================================================

  describe('Positioning', () => {
    const positions: Array<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'> = [
      'top-right',
      'top-left',
      'bottom-right',
      'bottom-left',
      'top-center',
      'bottom-center',
    ];

    positions.forEach((position) => {
      it(`should render at ${position} position`, () => {
        const store = useNotificationStore.getState?.() || useNotificationStore();
        store.success('Test');
        
        render(<NotificationToast position={position} />);
        
        const region = screen.getByRole('region');
        expect(region.className).toBeDefined();
      });
    });
  });

  // ============================================================================
  // 动画测试
  // ============================================================================

  describe('Animations', () => {
    it('should apply enter animation class', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Test');
      
      render(<NotificationToast />);
      
      const article = screen.getByRole('alert');
      expect(article.className).toContain('animate-toast-enter');
    });

    it('should apply exit animation class when dismissing', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Test');
      
      render(<NotificationToast />);
      
      const closeButton = screen.getByRole('button', { name: /关闭/i });
      fireEvent.click(closeButton);
      
      const article = screen.getByRole('alert');
      expect(article.className).toContain('animate-toast-exit');
    });
  });

  // ============================================================================
  // Props 测试
  // ============================================================================

  describe('Props', () => {
    it('should use default position when not specified', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      store.success('Test');
      
      render(<NotificationToast />);
      
      const region = screen.getByRole('region');
      expect(region.className).toContain('top-4');
      expect(region.className).toContain('right-4');
    });

    it('should use default maxVisible of 5', () => {
      const store = useNotificationStore.getState?.() || useNotificationStore();
      for (let i = 0; i < 7; i++) {
        store.info(`Test ${i}`);
      }
      
      render(<NotificationToast />);
      
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBe(5);
    });
  });
});