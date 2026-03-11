'use client';

import { Component, ReactNode } from 'react';
import { ErrorDisplay } from './ErrorDisplay';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  title?: string;
  showReset?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 类组件形式的 ErrorBoundary
 * 用于捕获组件树中的 JavaScript 错误
 * 
 * 使用示例：
 * <ErrorBoundaryWrapper title="组件加载失败">
 *   <SomeComponent />
 * </ErrorBoundaryWrapper>
 */
export class ErrorBoundaryWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 调用自定义错误处理
    this.props.onError?.(error, errorInfo);

    // 开发环境日志
    logger.error('ErrorBoundary caught:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // 生产环境发送到错误服务
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  private async logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    try {
      await fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
    } catch {
      // 静默失败
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 否则使用默认的错误展示
      return (
        <ErrorDisplay
          title={this.props.title || '组件加载失败'}
          message={this.state.error?.message || '发生意外错误'}
          showReset={this.props.showReset !== false}
          onReset={this.handleReset}
          variant="compact"
        />
      );
    }

    return this.props.children;
  }
}

/**
 * 函数式包装器 - 用于简化使用
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundaryWrapper {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundaryWrapper>
    );
  };
}

export default ErrorBoundaryWrapper;
