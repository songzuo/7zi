/**
 * Error Boundary Component
 * 错误边界组件 - 捕获 React 组件树中的错误并上报
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { monitor } from '@/lib/monitoring'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

/**
 * Extended Performance interface for memory info (Chrome only)
 */
interface ExtendedPerformance extends Performance {
  memory?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
}

/**
 * Error Boundary 组件
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private prevResetKeys?: Array<string | number>

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    }
    this.prevResetKeys = props.resetKeys
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    this.setState({
      errorInfo,
      errorId,
    })

    // 上报错误到监控系统
    this.reportError(error, errorInfo, errorId)

    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  /**
   * 上报错误到监控系统
   */
  private async reportError(error: Error, errorInfo: ErrorInfo, errorId: string): Promise<void> {
    try {
      // 收集错误上下文信息
      const context: Record<string, unknown> = {
        errorId,
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        timestamp: new Date().toISOString(),
      }

      // 收集性能指标
      if (typeof window !== 'undefined' && 'performance' in window) {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (perfData) {
          const extPerf = performance as ExtendedPerformance
          context.performance = {
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
            loadComplete: perfData.loadEventEnd - perfData.fetchStart,
            memory: extPerf.memory
              ? {
                  usedJSHeapSize: extPerf.memory.usedJSHeapSize,
                  totalJSHeapSize: extPerf.memory.totalJSHeapSize,
                }
              : undefined,
          }
        }
      }

      // 上报错误
      await monitor.trackError(
        error.name || 'ReactError',
        error.message,
        error.stack,
        context
      )

      // 控制台输出 (开发环境)
      if (process.env.NODE_ENV === 'development') {
        console.error('[ErrorBoundary]', {
          errorId,
          error,
          errorInfo,
          context,
        })
      }
    } catch (reportingError) {
      // 防止错误上报本身出错
      console.error('[ErrorBoundary] Failed to report error:', reportingError)
    }
  }

  /**
   * 重置错误状态
   */
  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    })
  }

  /**
   * 检查是否需要重置
   */
  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetKeys, resetOnPropsChange } = this.props

    // 检查 resetKeys 是否变化
    if (resetKeys && this.prevResetKeys) {
      const hasResetKeyChanged = resetKeys.some((key, index) => key !== this.prevResetKeys?.[index])

      if (hasResetKeyChanged) {
        this.resetErrorBoundary()
      }
    }

    // 检查 props 是否变化
    if (resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary()
    }

    this.prevResetKeys = resetKeys
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // 使用自定义 fallback 或默认错误 UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      )
    }

    return this.props.children
  }
}

/**
 * 默认错误回退 UI
 */
interface DefaultErrorFallbackProps {
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
  resetErrorBoundary: () => void
}

export function DefaultErrorFallback({
  error,
  errorInfo,
  errorId,
  resetErrorBoundary,
}: DefaultErrorFallbackProps): React.ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <svg
              className="h-8 w-8 text-red-600 dark:text-red-400"
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
        </div>

        <h2 className="mb-2 text-center text-xl font-semibold text-gray-900 dark:text-white">
          Something went wrong
        </h2>

        <p className="mb-4 text-center text-sm text-gray-600 dark:text-gray-400">
          An unexpected error occurred. We've been notified and are working to fix it.
        </p>

        {errorId && (
          <div className="mb-4 rounded bg-gray-100 p-2 text-xs font-mono dark:bg-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Error ID: </span>
            <span className="text-gray-900 dark:text-white">{errorId}</span>
          </div>
        )}

        {error && process.env.NODE_ENV === 'development' && (
          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
              Error Details
            </summary>
            <div className="mt-2 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-700">
              <div className="mb-2 font-mono text-red-600 dark:text-red-400">
                {error.name}: {error.message}
              </div>
              {error.stack && (
                <pre className="whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300">
                  {error.stack}
                </pre>
              )}
              {errorInfo?.componentStack && (
                <div className="mt-2">
                  <div className="mb-1 font-semibold text-gray-700 dark:text-gray-300">
                    Component Stack:
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-gray-600 dark:text-gray-400">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        <div className="flex gap-3">
          <button
            onClick={resetErrorBoundary}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook: 使用错误边界重置
 */
export function useErrorBoundaryReset(resetKeys?: Array<string | number>): () => void {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)

  React.useEffect(() => {
    if (resetKeys) {
      forceUpdate()
    }
  }, resetKeys)

  return () => forceUpdate()
}

/**
 * Hook: 抛出错误到错误边界
 */
export function useErrorHandler(): (error: Error) => void {
  return React.useCallback((error: Error) => {
    throw error
  }, [])
}