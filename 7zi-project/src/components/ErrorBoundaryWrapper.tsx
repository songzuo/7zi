'use client';

import { Component, ReactNode, ReactElement } from 'react';
import * as Sentry from '@sentry/nextjs';
import { ErrorDisplay, ErrorType } from './ErrorDisplay';
import { getErrorCode, ErrorCodes, isNetworkError } from '@/lib/errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  title?: string;
  showReset?: boolean;
  variant?: 'default' | 'compact' | 'fullscreen';
  /** 错误发生时的回调，可用于日志记录 */
  logError?: boolean;
  /** 是否显示报告错误的链接 */
  showReportLink?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * 分析错误类型
 */
function analyzeErrorType(error: Error): ErrorType {
  if (isNetworkError(error)) {
    return 'network';
  }

  const code = getErrorCode(error);
  
  switch (code) {
    case ErrorCodes.NOT_FOUND:
      return 'not-found';
    case ErrorCodes.UNAUTHORIZED:
      return 'unauthorized';
    case ErrorCodes.FORBIDDEN:
      return 'forbidden';
    case ErrorCodes.SERVER_ERROR:
      return 'server';
    case ErrorCodes.NETWORK_ERROR:
      return 'network';
    default:
      return 'generic';
  }
}

/**
 * 类组件形式的 ErrorBoundary
 * 用于捕获组件树中的 JavaScript 错误
 * 
 * 特性：
 * - 自动捕获子组件错误
 * - 支持自定义 fallback UI
 * - 集成 Sentry 错误监控
 * - 提供错误重置机制
 * - 支持错误报告链接
 * 
 * 使用示例：
 * ```tsx
 * <ErrorBoundaryWrapper title="组件加载失败" showReset>
 *   <SomeComponent />
 * </ErrorBoundaryWrapper>
 * 
 * // 或使用 HOC
 * const SafeComponent = withErrorBoundary(MyComponent, { title: '加载失败' });
 * ```
 */
export class ErrorBoundaryWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // 调用自定义错误处理
    this.props.onError?.(error, errorInfo);

    // 记录错误到 Sentry
    if (this.props.logError !== false) {
      Sentry.withScope((scope) => {
        scope.setTag('source', 'ErrorBoundaryWrapper');
        scope.setTag('error_type', analyzeErrorType(error));
        scope.setExtra('componentStack', errorInfo.componentStack);
        Sentry.captureException(error);
      });
    }

    // 开发环境日志
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 ErrorBoundaryWrapper 捕获到错误');
      console.error('错误信息:', error.message);
      console.error('错误堆栈:', error.stack);
      console.error('组件堆栈:', errorInfo.componentStack);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorType = this.state.error ? analyzeErrorType(this.state.error) : 'generic';

      // 否则使用默认的错误展示
      return (
        <ErrorDisplay
          title={this.props.title || '组件加载失败'}
          message={this.state.error?.message || '发生意外错误'}
          showReset={this.props.showReset !== false}
          onReset={this.handleReset}
          variant={this.props.variant || 'compact'}
          errorType={errorType}
          showHomeButton={false}
          showBackButton={false}
          showRefreshButton={false}
          showCopyError={false}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * 函数式包装器 - 用于简化使用
 * 
 * 使用示例：
 * ```tsx
 * const SafeMyComponent = withErrorBoundary(MyComponent, {
 *   title: '加载失败',
 *   showReset: true,
 * });
 * 
 * // 在 JSX 中使用
 * <SafeMyComponent {...props} />
 * ```
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const ComponentWithErrorBoundary = (props: P): ReactElement => (
    <ErrorBoundaryWrapper {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundaryWrapper>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}



export default ErrorBoundaryWrapper;