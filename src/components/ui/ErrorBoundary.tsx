'use client';

/**
 * UI Error Boundary Component
 * 一个健壮的 React 错误边界组件，用于捕获 React 组件树中的错误
 *
 * 特性：
 * - 捕获子组件中的 JavaScript 错误
 * - 显示降级的 UI
 * - 记录错误信息
 * - 提供错误恢复选项
 * - 支持多种显示变体
 * - 集成 Sentry 错误监控
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from './Button';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  variant?: 'full-page' | 'inline' | 'modal';
  showDetails?: boolean;
  resetOnPropsChange?: boolean;
  enableLogging?: boolean;
  maxErrorCount?: number;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number | null;
}

/**
 * 错误边界默认的降级 UI
 */
function DefaultFallback({
  error,
  errorInfo,
  variant,
  showDetails,
  onReset,
  onReload,
}: {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  variant: 'full-page' | 'inline' | 'modal';
  showDetails: boolean;
  onReset: () => void;
  onReload: () => void;
}) {
  const isFullPage = variant === 'full-page';

  return (
    <div
      className={`flex flex-col items-center justify-center ${
        isFullPage ? 'min-h-screen bg-background' : 'p-6'
      }`}
    >
      <div className={`max-w-md ${isFullPage ? 'text-center' : ''}`}>
        {/* 错误图标 */}
        <div className="mb-4">
          <svg
            className={`mx-auto ${isFullPage ? 'h-16 w-16' : 'h-12 w-12'} text-destructive`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* 错误标题 */}
        <h2
          className={`font-bold ${isFullPage ? 'text-2xl' : 'text-xl'} mb-2 text-foreground`}
        >
          出现了一些问题
        </h2>

        {/* 错误消息 */}
        <p className="text-muted-foreground mb-6">
          {error?.message || '组件加载失败'}
        </p>

        {/* 操作按钮 */}
        <div className={`flex gap-3 ${isFullPage ? 'justify-center' : ''}`}>
          <Button onClick={onReset} variant="primary">
            重试
          </Button>
          <Button onClick={onReload} variant="outline">
            刷新页面
        </Button>
        </div>

        {/* 错误详情（仅在开发环境或 showDetails 为 true 时显示） */}
        {(showDetails || process.env.NODE_ENV === 'development') && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
              错误详情
            </summary>
            <div className="bg-muted p-4 rounded text-xs font-mono overflow-auto max-h-40">
              {error && (
                <>
                  <div className="font-bold mb-1">Error:</div>
                  <div className="mb-2">{error.toString()}</div>
                  {error.stack && (
                    <>
                      <div className="font-bold mb-1">Stack:</div>
                      <pre className="whitespace-pre-wrap">{error.stack}</pre>
                    </>
                  )}
                </>
              )}
              {errorInfo && (
                <>
                  <div className="font-bold mb-1 mt-2">Component Stack:</div>
                  <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                </>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * Error Boundary 组件
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 更新状态
    this.setState({
      errorInfo,
      errorCount: this.state.errorCount + 1,
      lastErrorTime: Date.now(),
    });

    // 记录到 Sentry
    if (this.props.enableLogging !== false) {
      Sentry.withScope((scope) => {
        scope.setTag('error_boundary', 'true');
        scope.setTag('variant', this.props.variant || 'inline');
        scope.setExtra('errorCount', this.state.errorCount + 1);
        scope.setContext('react', {
          componentStack: errorInfo.componentStack,
        });
        Sentry.captureException(error);
      });
    }

    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 控制台输出
    console.error('ErrorBoundary 捕获到错误:', error);
    console.error('组件堆栈:', errorInfo.componentStack);
  }

  /**
   * 当 props 变化时重置错误状态
   */
  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.props.resetOnPropsChange &&
      this.state.hasError &&
      JSON.stringify(prevProps.children) !== JSON.stringify(this.props.children)
    ) {
      this.resetError();
    }
  }

  /**
   * 重置错误状态
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * 重新加载页面
   */
  reloadPage = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    // 如果有自定义 fallback，使用它
    if (this.state.hasError && this.props.fallback) {
      return this.props.fallback;
    }

    // 如果有错误，显示默认的降级 UI
    if (this.state.hasError) {
      return (
        <DefaultFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          variant={this.props.variant || 'inline'}
          showDetails={this.props.showDetails || false}
          onReset={this.resetError}
          onReload={this.reloadPage}
        />
      );
    }

    // 正常渲染子组件
    return this.props.children;
  }
}

/**
 * Hook 形式的错误边界包装器
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * 函数式错误边界包装器（使用 HOC 模式）
 */
export function createErrorBoundaryWrapper(
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function<P extends object>(Component: React.ComponentType<P>) {
    return withErrorBoundary(Component, errorBoundaryProps);
  };
}
