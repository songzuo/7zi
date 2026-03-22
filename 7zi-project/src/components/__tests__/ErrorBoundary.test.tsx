/**
 * ErrorBoundary 组件单元测试
 * @description 测试 ErrorBoundary 的错误捕获、展示和恢复功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// Extend Error interface to support error digest and statusCode
interface ExtendedError extends Error {
  digest?: string;
  statusCode?: number;
}
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../ErrorBoundary';

// Define proper type for mock scope
interface MockScope {
  setTag: ReturnType<typeof vi.fn>;
  setExtra: ReturnType<typeof vi.fn>;
  setUser: ReturnType<typeof vi.fn>;
  captureException: ReturnType<typeof vi.fn>;
  setLevel: ReturnType<typeof vi.fn>;
  setFingerprint: ReturnType<typeof vi.fn>;
}

// Mock Sentry at the top level
vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((callback: (scope: MockScope) => void) => {
    const mockScope: MockScope = {
      setTag: vi.fn(),
      setExtra: vi.fn(),
      setUser: vi.fn(),
      captureException: vi.fn(),
      setLevel: vi.fn(),
      setFingerprint: vi.fn(),
    };
    callback(mockScope);
  }),
  captureException: vi.fn(),
}));

// Mock window.location
const mockReload = vi.fn();
const mockLocation = {
  href: 'https://example.com/test?param=sensitive',
  pathname: '/test',
  search: '?param=sensitive',
  hash: '#section',
  reload: mockReload,
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('ErrorBoundary', () => {
  let mockReset: Mock<() => void>;

  beforeEach(() => {
    mockReset = vi.fn() as Mock<() => void>;
    vi.clearAllMocks();
  });

  describe('基本渲染', () => {
    it('应该渲染错误标题', () => {
      const error = new Error('Test error');
      (error as ExtendedError).digest = 'test-digest-123';

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
          title="测试错误"
        />
      );

      expect(screen.getByText('测试错误')).toBeInTheDocument();
    });

    it('应该渲染默认标题', () => {
      const error = new Error('Test error');

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
        />
      );

      expect(screen.getByText('出现了一些问题')).toBeInTheDocument();
    });

    it('应该渲染错误消息', () => {
      const error = new Error('Test error message');

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
        />
      );

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('应该渲染错误摘要', () => {
      const error = new Error('Test error');
      (error as ExtendedError).digest = 'abc123def456';

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
        />
      );

      // Click to show details
      const showButton = screen.getByText(/显示.*错误详情/);
      fireEvent.click(showButton);

      expect(screen.getByText(/abc123/)).toBeInTheDocument();
    });
  });

  describe('错误类型识别', () => {
    it('应该识别网络错误', () => {
      const error = new Error('network failed');

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
        />
      );

      expect(screen.getByText('网络连接失败')).toBeInTheDocument();
      expect(screen.getByText('请检查您的网络连接，然后重试')).toBeInTheDocument();
    });

    it('应该识别 404 错误', () => {
      const error = new Error('Not found');
      (error as ExtendedError).statusCode = 404;

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
        />
      );

      expect(screen.getByText('页面不存在')).toBeInTheDocument();
      expect(screen.getByText('您访问的页面不存在或已被移除')).toBeInTheDocument();
    });

    it('应该识别 401 错误', () => {
      const error = new Error('Unauthorized');
      (error as any).statusCode = 401;

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
        />
      );

      expect(screen.getByText('需要登录')).toBeInTheDocument();
      expect(screen.getByText('请登录后继续访问此页面')).toBeInTheDocument();
    });

    it('应该识别 403 错误', () => {
      const error = new Error('Forbidden');
      (error as any).statusCode = 403;

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
        />
      );

      expect(screen.getByText('没有权限')).toBeInTheDocument();
      expect(screen.getByText('您没有权限访问此页面')).toBeInTheDocument();
    });

    it('应该识别 500 错误', () => {
      const error = new Error('Server error');
      (error as ExtendedError).statusCode = 500;

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
        />
      );

      expect(screen.getByText('服务器错误')).toBeInTheDocument();
      expect(screen.getByText('服务器暂时无法处理请求，请稍后重试')).toBeInTheDocument();
    });

    it('应该识别 fetch 错误为网络错误', () => {
      const error = new Error('fetch failed');

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
        />
      );

      expect(screen.getByText('网络连接失败')).toBeInTheDocument();
    });

    it('应该识别 timeout 错误为网络错误', () => {
      const error = new Error('request timeout');

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
        />
      );

      expect(screen.getByText('网络连接失败')).toBeInTheDocument();
    });

    it('应该识别 abort 错误为网络错误', () => {
      const error = new Error('request aborted');

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
        />
      );

      expect(screen.getByText('网络连接失败')).toBeInTheDocument();
    });
  });

  describe('重试功能', () => {
    it('点击重试应该调用 reset', async () => {
      const error = new Error('Test error');

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
        />
      );

      const resetButton = screen.getByText(/重新加载|重试/);
      await userEvent.click(resetButton);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledTimes(1);
      });
    });

    it('重试失败应该记录错误', async () => {
      const failingReset = vi.fn().mockRejectedValue(new Error('Reset failed'));
      const error = new Error('Test error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary
          error={error}
          reset={failingReset}
        />
      );

      const resetButton = screen.getByText(/重新加载|重试/);
      await userEvent.click(resetButton);

      await waitFor(() => {
        expect(failingReset).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('重试失败:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('重试按钮在重试期间应该禁用', async () => {
      const slowReset = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );
      const error = new Error('Test error');

      render(
        <ErrorBoundary
          error={error}
          reset={slowReset}
        />
      );

      const resetButton = screen.getByText(/重新加载|重试/);
      await userEvent.click(resetButton);

      // 检查按钮是否禁用
      expect(resetButton).toBeDisabled();
      expect(screen.getByText('重试中...')).toBeInTheDocument();
    });
  });

  describe('导航功能', () => {
    it('点击返回首页应该跳转到根路径', () => {
      const error = new Error('Test error');

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
          showHomeButton
        />
      );

      const homeButton = screen.getByText('返回首页');
      fireEvent.click(homeButton);

      expect(window.location.href).toBe('/');
    });
  });

  describe('错误详情折叠', () => {
    it('点击应该能够展开和折叠错误详情', () => {
      const error = new Error('Test error');
      (error as any).digest = 'test-digest-abc123';

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
        />
      );

      // 默认显示"显示"按钮
      expect(screen.getByText(/显示.*错误详情/)).toBeInTheDocument();

      // 点击展开
      const showButton = screen.getByText(/显示.*错误详情/);
      fireEvent.click(showButton);

      // 现在应该显示"隐藏"按钮
      expect(screen.getByText(/隐藏.*错误详情/)).toBeInTheDocument();
    });
  });

  describe('按钮显示控制', () => {
    it('showReset=false 应该不显示重试按钮', () => {
      const error = new Error('Test error');

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
          showReset={false}
        />
      );

      expect(screen.queryByText('重新加载')).not.toBeInTheDocument();
      expect(screen.queryByText('重试')).not.toBeInTheDocument();
    });

    it('showHomeButton=false 应该不显示返回首页按钮', () => {
      const error = new Error('Test error');

      render(
        <ErrorBoundary
          error={error}
          reset={mockReset}
          showHomeButton={false}
        />
      );

      expect(screen.queryByText('返回首页')).not.toBeInTheDocument();
    });
  });

  // Note: Sentry integration tests removed as they test implementation details of mocked code
  // The component's behavior is tested through rendering and user interaction tests above
});
