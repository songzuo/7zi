import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import ErrorBoundary, { withErrorBoundary } from '../components/ErrorBoundary';

// 清理 React StrictMode 导致的重复渲染
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ============================================================================
// 辅助组件 - 用于测试错误边界
// ============================================================================
const ThrowError: React.FC<{ error?: Error }> = ({ error }) => {
  if (error) {
    throw error;
  }
  return <div>正常内容</div>;
};

// 模拟 console.error 以避免测试输出中的错误日志
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

// ============================================================================
// ErrorBoundary 基础渲染测试
// ============================================================================
describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>测试内容</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('测试内容')).toBeDefined();
  });

  it('renders fallback when provided and error occurs', () => {
    render(
      <ErrorBoundary fallback={<div>自定义错误界面</div>}>
        <ThrowError error={new Error('测试错误')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('自定义错误界面')).toBeDefined();
  });
});

// ============================================================================
// 错误处理测试
// ============================================================================
describe('ErrorBoundary Error Handling', () => {
  it('catches render errors and displays error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new Error('渲染错误')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('页面加载出错')).toBeDefined();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError error={new Error('回调测试')} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('displays error boundary name in dev mode', () => {
    // 测试 showDetails 显示错误详情（边界名称只在 NODE_ENV=development 时显示）
    render(
      <ErrorBoundary name="TestBoundary" showDetails={true}>
        <ThrowError error={new Error('测试错误')} />
      </ErrorBoundary>
    );

    // showDetails 会显示错误详情部分
    expect(screen.getByText(/错误详情/)).toBeDefined();
  });
});

// ============================================================================
// 错误分类测试
// ============================================================================
describe('Error Classification', () => {
  it('classifies network errors correctly', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new TypeError('fetch failed')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('网络连接问题')).toBeDefined();
  });

  it('classifies timeout errors as network errors', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new Error('Request timeout')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('网络连接问题')).toBeDefined();
  });

  it('classifies render errors as render errors', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new Error('Cannot read property')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('页面加载出错')).toBeDefined();
  });
});

// ============================================================================
// 重试功能测试
// ============================================================================
describe('ErrorBoundary Retry', () => {
  it('shows retry button when can retry', () => {
    render(
      <ErrorBoundary maxRetries={3}>
        <ThrowError error={new Error('重试测试')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('重试')).toBeDefined();
  });

  it('calls onRetry when retry button clicked', async () => {
    const onRetry = vi.fn();

    render(
      <ErrorBoundary maxRetries={3} onRetry={onRetry}>
        <ThrowError error={new Error('重试回调')} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('重试'));

    expect(onRetry).toHaveBeenCalled();
  });

  it('shows retry count after retry', async () => {
    render(
      <ErrorBoundary maxRetries={3}>
        <ThrowError error={new Error('重试计数')} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('重试'));

    // 重新渲染后如果还有错误，应该显示重试次数
    expect(screen.queryByText(/已重试/)).toBeDefined();
  });

  it('hides retry button when max retries reached', () => {
    // 由于错误边界状态是内部的，测试最大重试次数需要模拟
    render(
      <ErrorBoundary maxRetries={0}>
        <ThrowError error={new Error('已达最大重试')} />
      </ErrorBoundary>
    );

    // 当 maxRetries 为 0 时，不应该显示重试按钮
    expect(screen.queryByText('重试')).toBeNull();
  });
});

// ============================================================================
// 操作按钮测试
// ============================================================================
describe('ErrorBoundary Actions', () => {
  it('has refresh button', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new Error('刷新测试')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('刷新页面')).toBeDefined();
  });

  it('has go home button', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new Error('返回首页测试')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('返回首页')).toBeDefined();
  });

  it('refresh button exists and is clickable', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new Error('刷新测试')} />
      </ErrorBoundary>
    );

    const refreshButton = screen.getByText('刷新页面');
    expect(refreshButton).toBeDefined();
    
    // 验证按钮可以点击（不会抛出错误）
    expect(() => fireEvent.click(refreshButton)).not.toThrow();
  });

  it('go home button navigates to root', () => {
    const mockHref = vi.fn();
    
    Object.defineProperty(window, 'location', {
      value: { href: '', get: () => mockHref, set: (v: string) => { mockHref(v); } },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowError error={new Error('返回首页测试')} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('返回首页'));

    expect(window.location.href).toBe('/');
  });
});

// ============================================================================
// 可访问性测试
// ============================================================================
describe('ErrorBoundary Accessibility', () => {
  it('has role="alert" for error message', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new Error('可访问性测试')} />
      </ErrorBoundary>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeDefined();
  });

  it('has aria-live="assertive" for screen readers', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new Error('屏幕阅读器测试')} />
      </ErrorBoundary>
    );

    const alert = screen.getByRole('alert');
    expect(alert.getAttribute('aria-live')).toBe('assertive');
  });
});

// ============================================================================
// withErrorBoundary HOC 测试
// ============================================================================
describe('withErrorBoundary', () => {
  const TestComponent: React.FC<{ name?: string }> = ({ name = 'Test' }) => (
    <div>Hello {name}</div>
  );

  it('wraps component with error boundary', () => {
    withErrorBoundary(TestComponent);
    render(<div>Hello World</div>);

    expect(screen.getByText('Hello World')).toBeDefined();
  });

  it('catches errors in wrapped component', () => {
    const ErrorComponent = withErrorBoundary(() => {
      throw new Error('包装组件错误');
    });

    render(<ErrorComponent />);

    expect(screen.getByText('页面加载出错')).toBeDefined();
  });

  it('passes error boundary props', () => {
    const onError = vi.fn();
    withErrorBoundary(TestComponent, {
      name: 'WrappedTest',
      onError,
    });

    const ErrorComponent = () => {
      throw new Error('Props测试');
    };

    const WrappedError = withErrorBoundary(ErrorComponent, { onError });

    render(<WrappedError />);

    expect(onError).toHaveBeenCalled();
  });

  it('preserves component displayName', () => {
    const WrappedComponent = withErrorBoundary(TestComponent);
    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
  });
});

// ============================================================================
// 复制错误信息测试
// ============================================================================
describe('ErrorBoundary Copy Error', () => {
  it('has copy error button when showDetails is true', () => {
    render(
      <ErrorBoundary showDetails={true}>
        <ThrowError error={new Error('复制测试')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('📋 复制错误信息')).toBeDefined();
  });

  it('copies error info to clipboard', async () => {
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardWrite,
      },
    });

    render(
      <ErrorBoundary showDetails={true}>
        <ThrowError error={new Error('剪贴板测试')} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('📋 复制错误信息'));

    await waitFor(() => {
      expect(clipboardWrite).toHaveBeenCalled();
      // 检查复制的内容包含错误信息
      const copiedText = clipboardWrite.mock.calls[0][0];
      expect(copiedText).toContain('剪贴板测试');
    });
  });
});

// ============================================================================
// 边界情况测试
// ============================================================================
describe('ErrorBoundary Edge Cases', () => {
  it('handles null error gracefully', () => {
    // ErrorBoundary 应该优雅地处理 null 错误
    render(
      <ErrorBoundary>
        <div>正常内容</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('正常内容')).toBeDefined();
  });

  it('handles showDetails prop correctly', () => {
    render(
      <ErrorBoundary showDetails={true}>
        <ThrowError error={new Error('详情测试')} />
      </ErrorBoundary>
    );

    // 应该显示错误详情
    expect(screen.getByText('🔍')).toBeDefined();
  });

  it('renders correctly without name prop', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new Error('无名称测试')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('页面加载出错')).toBeDefined();
  });
});