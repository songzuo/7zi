/**
 * @fileoverview Client-Side Error Handler
 * @description Error handling and display utilities for React applications
 * @module error/client
 */

'use client'

import React from 'react'
import { toast } from '@/stores/uiStore'
import { UnifiedAppError, toUnifiedError, isUnifiedError } from '@/lib/errors/unified-error'
import { UnifiedErrorType, isRetryableErrorType } from '@/lib/errors/unified-types'

// ============================================================================
// Types (Re-export from unified system)
// ============================================================================

/**
 * AppError type alias - now unified with UnifiedAppError
 */
export type AppError = UnifiedAppError

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * Error categories (mapped from UnifiedErrorType)
 */
export type ErrorCategory = 'network' | 'validation' | 'auth' | 'server' | 'client' | 'unknown'

export interface ErrorHandlerConfig {
  showNotification?: boolean
  logToConsole?: boolean
  logToServer?: boolean
  showToast?: boolean
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Map UnifiedErrorType to ErrorCategory
 */
function mapToErrorCategory(type: UnifiedErrorType): ErrorCategory {
  switch (type) {
    case UnifiedErrorType.NETWORK_ERROR:
    case UnifiedErrorType.TIMEOUT:
      return 'network'
    case UnifiedErrorType.UNAUTHORIZED:
    case UnifiedErrorType.FORBIDDEN:
    case UnifiedErrorType.MISSING_TOKEN:
      return 'auth'
    case UnifiedErrorType.VALIDATION:
    case UnifiedErrorType.WEAK_PASSWORD:
    case UnifiedErrorType.REGISTRATION_FAILED:
      return 'validation'
    case UnifiedErrorType.INTERNAL:
    case UnifiedErrorType.SERVICE_UNAVAILABLE:
    case UnifiedErrorType.RATE_LIMIT:
      return 'server'
    default:
      return 'client'
  }
}

export function classifyError(error: Error | AppError): ErrorCategory {
  if (isUnifiedError(error)) {
    return mapToErrorCategory(error.type)
  }

  // Fallback for regular Error objects
  const message = error.message.toLowerCase()

  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return 'network'
  }

  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('auth')
  ) {
    return 'auth'
  }

  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required')
  ) {
    return 'validation'
  }

  if (message.includes('500') || message.includes('server error') || message.includes('internal')) {
    return 'server'
  }

  return 'client'
}

export function getErrorSeverity(error: Error | AppError): ErrorSeverity {
  if (isUnifiedError(error)) {
    // Use retryable flag and type to determine severity
    if (error.type === UnifiedErrorType.UNAUTHORIZED || error.type === UnifiedErrorType.FORBIDDEN) {
      return 'critical'
    }
    if (
      error.type === UnifiedErrorType.NETWORK_ERROR ||
      error.type === UnifiedErrorType.SERVICE_UNAVAILABLE
    ) {
      return 'high'
    }
    if (error.type === UnifiedErrorType.VALIDATION) {
      return 'low'
    }
    return 'medium'
  }

  const category = classifyError(error)

  switch (category) {
    case 'network':
    case 'server':
      return 'high'
    case 'auth':
      return 'critical'
    case 'validation':
      return 'low'
    default:
      return 'medium'
  }
}

// ============================================================================
// User-Friendly Messages
// ============================================================================

export function getUserFriendlyMessage(error: Error | AppError): string {
  if (isUnifiedError(error)) {
    return error.message
  }

  const category = classifyError(error)

  switch (category) {
    case 'network':
      return '网络连接失败，请检查您的网络连接'
    case 'auth':
      return '认证失败，请重新登录'
    case 'validation':
      return '输入无效，请检查后重试'
    case 'server':
      return '服务器错误，请稍后重试'
    case 'client':
      return '发生意外错误，请刷新页面'
    default:
      return '发生未知错误，请联系技术支持'
  }
}

export function getErrorTitle(error: Error | AppError): string {
  const category = classifyError(error)

  switch (category) {
    case 'network':
      return '网络错误'
    case 'auth':
      return '认证错误'
    case 'validation':
      return '验证失败'
    case 'server':
      return '服务器错误'
    case 'client':
      return '客户端错误'
    default:
      return '发生错误'
  }
}

// ============================================================================
// Error Logging
// ============================================================================

function logToConsole(error: Error | AppError): void {
  const category = classifyError(error)
  const severity = getErrorSeverity(error)

  console.group(`[${severity.toUpperCase()}] ${category.toUpperCase()} 错误`)

  console.error('错误:', error)
  console.error('消息:', error.message)
  console.error('堆栈:', error.stack)

  if (isUnifiedError(error)) {
    console.error('类型:', error.type)
    console.error('代码:', error.code)
    console.error('状态码:', error.statusCode)
    if (error.details) {
      console.error('详情:', error.details)
    }
  }

  console.groupEnd()
}

async function logToServer(error: Error | AppError): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const errorData = isUnifiedError(error)
      ? {
          ...error.toJSON(),
          url: window.location.href,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }
      : {
          message: error.message,
          stack: error.stack,
          category: classifyError(error),
          severity: getErrorSeverity(error),
          url: window.location.href,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }

    console.log('[错误日志器]', '准备发送到服务器的错误数据:', errorData)
  } catch (loggingError) {
    console.error('[错误日志器] 无法记录错误到服务器:', loggingError)
  }
}

// ============================================================================
// Error Handler
// ============================================================================

function isRetryable(error: Error | AppError): boolean {
  if (isUnifiedError(error)) {
    return error.retryable
  }

  const category = classifyError(error)
  return category === 'network' || category === 'server'
}

export function handleError(
  error: Error | AppError,
  config: ErrorHandlerConfig = {},
  customMessage?: string
): void {
  const {
    showNotification = true,
    logToConsole: doLogToConsole = true,
    logToServer: doLogToServer = true,
    showToast = true,
  } = config

  if (doLogToConsole) {
    logToConsole(error)
  }

  if (doLogToServer) {
    logToServer(error).catch(err => {
      console.error('[错误处理器] 无法记录错误:', err)
    })
  }

  if (showNotification && showToast) {
    const title = getErrorTitle(error)
    const message = customMessage || getUserFriendlyMessage(error)
    const severity = getErrorSeverity(error)

    toast.error(message, title, {
      priority: severity === 'critical' || severity === 'high' ? 'high' : 'medium',
      duration: severity === 'critical' ? 0 : 5000,
      action: isRetryable(error)
        ? {
            label: '重试',
            onClick: () => {
              console.log('[错误处理器] 请求重试')
            },
          }
        : undefined,
    })
  }
}

// ============================================================================
// Async Error Wrapper
// ============================================================================

export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  config: ErrorHandlerConfig = {}
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    handleError(error as Error, config)
    return null
  }
}

// ============================================================================
// Error Boundary Component (HOC)
// ============================================================================

interface ErrorBoundaryWrapperProps {
  fallback?: React.ReactNode
  onError?: (error: Error) => void
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: ErrorBoundaryWrapperProps = {}
): React.FC<P> {
  const WrappedComponent = (props: P) => {
    const [error, setError] = React.useState<Error | null>(null)

    React.useEffect(() => {
      const errorHandler = (event: ErrorEvent) => {
        setError(event.error)
        options.onError?.(event.error)
        handleError(event.error)
      }

      window.addEventListener('error', errorHandler)
      return () => window.removeEventListener('error', errorHandler)
    }, [])

    if (error) {
      return (
        options.fallback ||
        React.createElement('div', { className: 'p-6 text-center' }, [
          React.createElement(
            'p',
            { className: 'text-red-600 font-medium', key: 'msg' },
            '组件加载失败'
          ),
          React.createElement(
            'button',
            {
              key: 'btn',
              onClick: () => window.location.reload(),
              className: 'mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600',
            },
            '刷新页面'
          ),
        ])
      )
    }

    return React.createElement(Component, props)
  }

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`

  return WrappedComponent as React.FC<P>
}

// ============================================================================
// Exports
// ============================================================================

const ErrorHandler = {
  handleError,
  withErrorHandling,
  withErrorBoundary,
  classifyError,
  getErrorSeverity,
  getUserFriendlyMessage,
  getErrorTitle,
}

export default ErrorHandler
