import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary, withErrorBoundary, ErrorType } from '../ErrorBoundary';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((callback) => callback({
    setTag: vi.fn(),
    setExtra: vi.fn(),
    setUser: vi.fn(),
  })),
  captureException: vi.fn(),
}));

// Mock window.location
const mockReload = vi.fn();
const mockAssign = vi.fn();
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000/test',
    reload: mockReload,
    assign: mockAssign,
  },
  writable: true,
});

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'test-agent',
    sendBeacon: vi.fn(() => true),
    clipboard: {
      writeText: vi.fn(() => Promise.resolve()),
    },
  },
  writable: true,
});

// Mock fetch
global.fetch = vi.fn(() => Promise.resolve({ ok: true }));

// Component that throws an error
const ThrowError: React.FC<{ message?: string }> = ({ message = 'Test error' }) => {
  throw new Error(message);
};

// Suppress console.error in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  vi.clearAllMocks();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  describe('正常渲染', () => {
    it('正常渲染子组件', () => {
      render(
        <ErrorBoundary>
          <div>正常内容</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('正常内容')).toBeInTheDocument();
    });

    it('有多个子组件时正常渲染', () => {
      render(
        <ErrorBoundary name="TestBoundary">
          <div>子组件1</div>
          <div>子组件2</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('子组件1')).toBeInTheDocument();
      expect(screen.getByText('子组件2')).toBeInTheDocument();
    });
  });

  describe('错误捕获', () => {
    it('捕获子组件错误并显示错误界面', () => {
      render(
        <ErrorBoundary name="TestBoundary">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('页面加载出错')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('显示网络错误信息', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Network error: Failed to fetch" />
        </ErrorBoundary>
      );

      expect(screen.getByText('网络连接问题')).toBeInTheDocument();
      expect(screen.getByText('无法连接到服务器，请检查网络连接')).toBeInTheDocument();
    });

    it('显示超时错误信息', () => {
      render(
        <ErrorBoundary>
          <ThrowError message="Request timeout" />
        </ErrorBoundary>
      );

      expect(screen.getByText('网络连接问题')).toBeInTheDocument();
    });

    it('调用 onError 回调', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('使用自定义 fallback', () => {
      render(
        <ErrorBoundary fallback={<div>自定义错误界面</div>}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('自定义错误界面')).toBeInTheDocument();
    });
  });

  describe('重试功能', () => {
    it('显示重试按钮', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('重试')).toBeInTheDocument();
    });

    it('点击重试重置错误状态', () => {
      const onRetry = vi.fn();

      render(
        <ErrorBoundary onRetry={onRetry} maxRetries={3}>
          <ThrowError />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('重试'));
      expect(onRetry).toHaveBeenCalled();
    });

    it('显示重试计数', () => {
      render(
        <ErrorBoundary maxRetries={3}>
          <ThrowError />
        </ErrorBoundary>
      );

      // 第一次重试
      fireEvent.click(screen.getByText('重试'));
      expect(screen.getByText(/已重试 1 次/)).toBeInTheDocument();

      // 第二次重试
      fireEvent.click(screen.getByText('重试'));
      expect(screen.getByText(/已重试 2 次/)).toBeInTheDocument();
    });

    it('超过最大重试次数时刷新页面', () => {
      render(
        <ErrorBoundary maxRetries={1}>
          <ThrowError />
        </ErrorBoundary>
      );

      // 第一次重试
      fireEvent.click(screen.getByText('重试'));
      // 此时已经重试过1次，应该没有重试按钮了，只有刷新按钮
      expect(screen.queryByText('重试')).not.toBeInTheDocument();
    });
  });

  describe('操作按钮', () => {
    it('点击刷新页面按钮刷新页面', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('刷新页面'));
      expect(mockReload).toHaveBeenCalled();
    });

    it('点击返回首页按钮导航到首页', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('返回首页'));
      expect(window.location.href).toBe('/');
    });
  });

  describe('错误详情', () => {
    it('开发环境显示错误详情', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary showDetails>
          <ThrowError />
        </ErrorBoundary>
      );

      // 查找错误详情区域
      expect(screen.getByText('🔍')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('无障碍性', () => {
    it('错误界面具有正确的角色', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

describe('withErrorBoundary HOC', () => {
  it('包装组件并提供错误边界', () => {
    const TestComponent: React.FC<{ text: string }> = ({ text }) => <div>{text}</div>;
    const WrappedComponent = withErrorBoundary(TestComponent, { name: 'TestComponent' });

    render(<WrappedComponent text="测试内容" />);

    expect(screen.getByText('测试内容')).toBeInTheDocument();
  });

  it('捕获包装组件的错误', () => {
    const TestComponent = () => {
      throw new Error('HOC error');
    };
    const WrappedComponent = withErrorBoundary(TestComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('页面加载出错')).toBeInTheDocument();
  });
});

describe('ErrorType 枚举', () => {
  it('导出正确的错误类型', () => {
    expect(ErrorType.NETWORK).toBe('NETWORK_ERROR');
    expect(ErrorType.RENDER).toBe('RENDER_ERROR');
    expect(ErrorType.ASYNC).toBe('ASYNC_ERROR');
    expect(ErrorType.UNKNOWN).toBe('UNKNOWN_ERROR');
  });
});