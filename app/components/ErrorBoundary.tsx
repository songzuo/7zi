'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 错误边界名称，用于日志标识 */
  name?: string;
  /** 是否显示详细错误信息（开发模式自动开启） */
  showDetails?: boolean;
  /** 自定义重试处理 */
  onRetry?: () => void;
  /** 最大重试次数 */
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  RENDER = 'RENDER_ERROR',
  ASYNC = 'ASYNC_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

/**
 * 分析错误类型
 */
function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();
  
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('abort') ||
    name.includes('typeerror') && message.includes('fetch')
  ) {
    return ErrorType.NETWORK;
  }
  
  if (
    name.includes('chunkerror') ||
    message.includes('chunk') ||
    message.includes('loading chunk')
  ) {
    return ErrorType.NETWORK;
  }
  
  return ErrorType.RENDER;
}

/**
 * 获取错误友好的显示信息
 */
function getErrorDisplay(error: Error, type: ErrorType): {
  title: string;
  message: string;
  icon: string;
  suggestion: string;
} {
  switch (type) {
    case ErrorType.NETWORK:
      return {
        title: '网络连接问题',
        message: '无法连接到服务器，请检查网络连接',
        icon: '🌐',
        suggestion: '请检查您的网络连接，然后重试',
      };
    case ErrorType.RENDER:
    default:
      return {
        title: '页面加载出错',
        message: error.message || '发生了未知错误',
        icon: '⚠️',
        suggestion: '请尝试刷新页面，如果问题持续存在请联系支持',
      };
  }
}

/**
 * Error Boundary 组件 - 捕获子组件错误
 * 
 * 功能：
 * - 捕获 React 组件树中的错误
 * - 显示友好的错误界面
 * - 提供错误报告机制
 * - 支持错误恢复和重试
 * - 自动上报错误到服务器
 * 
 * @example
 * ```tsx
 * <ErrorBoundary name="Dashboard">
 *   <Dashboard />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { name, onError } = this.props;
    
    // 更新状态
    this.setState({ errorInfo });
    
    // 记录错误到控制台
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ErrorBoundary${name ? `:${name}` : ''}] 捕获错误:`, error);
      console.error('组件堆栈:', errorInfo.componentStack);
    }

    // 调用错误回调
    onError?.(error, errorInfo);

    // 发送错误报告
    this.reportError(error, errorInfo);
  }

  /**
   * 上报错误到服务器
   * 同时发送到 Sentry
   */
  private async reportError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    if (typeof window === 'undefined') return;

    const { name } = this.props;
    const errorType = classifyError(error);

    const payload = {
      type: 'react-error',
      errorType,
      boundaryName: name,
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      retryCount: this.state.retryCount,
    };

    // Send to Sentry
    try {
      Sentry.withScope((scope) => {
        scope.setTag('error_type', errorType);
        scope.setTag('boundary_name', name || 'unknown');
        scope.setTag('retry_count', this.state.retryCount);

        scope.setExtra('componentStack', errorInfo.componentStack);
        scope.setExtra('url', window.location.href);

        // Set user context if available
        const userId = (window as any).__user_id__ || null;
        if (userId) {
          scope.setUser({ id: userId });
        }

        // Capture the exception
        Sentry.captureException(error);
      });
    } catch (sentryError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to send error to Sentry:', sentryError);
      }
    }

    // Still send to custom API endpoint
    try {
      if (window.navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        window.navigator.sendBeacon('/api/errors', blob);
      } else {
        await fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('错误上报失败:', e);
      }
    }
  }

  /**
   * 处理重试
   */
  handleRetry = (): void => {
    const { maxRetries = 3, onRetry } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      // 超过最大重试次数，刷新页面
      window.location.reload();
      return;
    }

    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));

    onRetry?.();
  };

  /**
   * 刷新页面
   */
  handleRefresh = (): void => {
    window.location.reload();
  };

  /**
   * 返回首页
   */
  handleGoHome = (): void => {
    window.location.href = '/';
  };

  /**
   * 复制错误信息
   */
  handleCopyError = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const errorText = [
      `错误: ${error.message}`,
      `类型: ${error.name}`,
      `时间: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      error.stack ? `\n堆栈:\n${error.stack}` : '',
      errorInfo?.componentStack ? `\n组件堆栈:\n${errorInfo.componentStack}` : '',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(errorText);
      alert('错误信息已复制到剪贴板');
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = errorText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('错误信息已复制到剪贴板');
    }
  };

  render(): ReactNode {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback, name, showDetails, maxRetries = 3 } = this.props;

    if (hasError && error) {
      // 如果有自定义 fallback
      if (fallback) {
        return fallback;
      }

      const errorType = classifyError(error);
      const display = getErrorDisplay(error, errorType);
      const isDev = process.env.NODE_ENV === 'development';
      const showDetailed = showDetails ?? isDev;
      const canRetry = retryCount < maxRetries;

      // 默认错误界面
      return (
        <div 
          className="min-h-[400px] flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900"
          role="alert"
          aria-live="assertive"
        >
          <div className="text-center max-w-lg w-full">
            {/* 错误图标 */}
            <div 
              className="text-7xl mb-6 animate-bounce"
              aria-hidden="true"
            >
              {display.icon}
            </div>
            
            {/* 错误标题 */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {display.title}
            </h2>
            
            {/* 错误描述 */}
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {display.message}
            </p>
            
            {/* 建议 */}
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              {display.suggestion}
            </p>

            {/* 边界名称（开发模式） */}
            {isDev && name && (
              <p className="text-xs text-gray-400 dark:text-gray-600 mb-4">
                错误边界: {name}
              </p>
            )}
            
            {/* 错误详情 (开发环境或明确要求) */}
            {showDetailed && error.stack && (
              <details className="text-left mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
                  <span>🔍</span>
                  <span>错误详情</span>
                </summary>
                <div className="mt-3 space-y-2">
                  <div className="text-xs text-red-600 dark:text-red-400 font-mono">
                    {error.name}: {error.message}
                  </div>
                  <pre className="text-xs text-red-500 dark:text-red-400 overflow-auto max-h-40 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </div>
              </details>
            )}
            
            {/* 重试计数 */}
            {retryCount > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-600 mb-4">
                已重试 {retryCount} 次
              </p>
            )}
            
            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-3 justify-center">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                    focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800
                    transition-colors font-medium flex items-center gap-2"
                >
                  <span>🔄</span>
                  <span>重试</span>
                </button>
              )}
              
              <button
                onClick={this.handleRefresh}
                className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 
                  rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 
                  focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600
                  transition-colors font-medium flex items-center gap-2"
              >
                <span>🔃</span>
                <span>刷新页面</span>
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="px-6 py-2.5 border-2 border-gray-300 dark:border-gray-600 
                  text-gray-700 dark:text-gray-200 rounded-lg 
                  hover:bg-gray-100 dark:hover:bg-gray-800 
                  focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600
                  transition-colors font-medium flex items-center gap-2"
              >
                <span>🏠</span>
                <span>返回首页</span>
              </button>
            </div>

            {/* 复制错误信息按钮 */}
            {showDetailed && (
              <button
                onClick={this.handleCopyError}
                className="mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 
                  dark:hover:text-gray-200 underline underline-offset-2"
              >
                📋 复制错误信息
              </button>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * 高阶组件：为组件添加错误边界
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps} name={errorBoundaryProps?.name || displayName}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  
  return ComponentWithErrorBoundary;
}

export default ErrorBoundary;