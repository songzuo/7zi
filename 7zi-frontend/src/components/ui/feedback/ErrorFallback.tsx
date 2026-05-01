/**
 * ErrorFallback Component
 *
 * Error fallback UI with recovery mechanisms
 * Used by ErrorBoundary and can be used standalone
 *
 * @example
 * <ErrorFallback
 *   error={new Error('Something went wrong')}
 *   errorInfo={errorInfo}
 *   resetError={() => {}}
 * />
 */

'use client'

import React, { memo, useState } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug, FileText, Copy, Check, RotateCcw, ArrowLeft } from 'lucide-react'
import type { ErrorFallbackProps } from './ErrorBoundary'
import { withRetry } from '@/lib/error-reporting/retry'
import { logger } from '@/lib/logger'
import { addErrorLog } from '@/lib/error-reporting/error-log-history'

interface ErrorFallbackConfig {
  /**
   * Custom title
   * @default 'Something went wrong'
   */
  title?: string

  /**
   * Custom message
   * @default 'An unexpected error occurred. Please try again.'
   */
  message?: string

  /**
   * Whether to show error details
   * @default true in development
   */
  showErrorDetails?: boolean

  /**
   * Whether to show recovery options
   * @default true
   */
  showRecoveryOptions?: boolean

  /**
   * Whether to show support link
   * @default true
   */
  showSupportLink?: boolean

  /**
   * Support email or URL
   * @default 'mailto:support@example.com'
   */
  supportContact?: string

  /**
   * Additional actions to show
   */
  additionalActions?: Array<{
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }>

  /**
   * Retry configuration
   */
  retryConfig?: {
    maxAttempts?: number
    initialDelay?: number
  }

  /**
   * Retry callback
   */
  onRetry?: (attempt: number, lastError?: Error) => Promise<void>

  /**
   * Custom styles
   */
  className?: string
}

/**
 * Simple error fallback for minimal UI
 */
export function SimpleErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="text-center">
        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <p className="mb-4 text-gray-600 dark:text-gray-400">Something went wrong</p>
        <button
          onClick={resetError}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

/**
 * Full-featured error fallback with recovery options
 */
export function FullErrorFallback({
  error,
  errorInfo,
  resetError,
  config = {},
}: ErrorFallbackProps & { config?: ErrorFallbackConfig }) {
  const [copied, setCopied] = useState(false)
  const [showDetails, setShowDetails] = useState(
    config.showErrorDetails ?? process.env.NODE_ENV === 'development'
  )
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [retryError, setRetryError] = useState<Error | undefined>()

  const {
    title = 'Something went wrong',
    message = 'An unexpected error occurred. Please try again.',
    showErrorDetails: showErrorDetailsProp,
    showRecoveryOptions = true,
    showSupportLink = true,
    supportContact = 'mailto:support@example.com',
    additionalActions = [],
    retryConfig = { maxAttempts: 3, initialDelay: 1000 },
    onRetry,
    className = '',
  } = config

  const handleCopyError = () => {
    const errorText = `
Error: ${error?.toString()}
Time: ${new Date().toISOString()}
URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}
Stack Trace:
${errorInfo?.componentStack || 'N/A'}
    `.trim()

    navigator.clipboard.writeText(errorText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRetry = async () => {
    setIsRetrying(true)
    setRetryError(undefined)

    try {
      const result = await withRetry(
        async () => {
          // 记录重试日志
          await addErrorLog(
            'ErrorBoundaryRetry',
            `Attempting to recover from error: ${error?.message || 'Unknown error'}`,
            'low',
            'recovery',
            {
              attempt: retryAttempt + 1,
              errorId: errorInfo?.digest || 'unknown',
            }
          )

          // 调用自定义重试回调
          if (onRetry) {
            await onRetry(retryAttempt + 1, error || undefined)
          }

          // 重置错误边界
          resetError()

          // 等待一小段时间以确保渲染完成
          await new Promise(resolve => setTimeout(resolve, 100))

          throw new Error('Success') // 用于触发成功逻辑
        },
        {
          maxAttempts: retryConfig.maxAttempts || 3,
          initialDelay: retryConfig.initialDelay || 1000,
          label: 'ErrorBoundaryRetry',
        }
      )

      if (result.success) {
        logger.info('Error boundary retry succeeded', { attempt: result.attempts })
      } else {
        setRetryError(result.error)
        logger.warn('Error boundary retry failed', { attempts: result.attempts, error: result.error })
      }
    } catch (e) {
      // 成功重置时会抛出 'Success' 错误，这是预期的
      const err = e as Error
      if (err.message !== 'Success') {
        setRetryError(err)
      }
    } finally {
      setIsRetrying(false)
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div
      className={`flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900 ${className}`}
    >
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
          <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>

        {/* Title and message */}
        <h1 className="mb-3 text-center text-3xl font-bold text-gray-900 dark:text-white">
          {title}
        </h1>

        <p className="mb-8 text-center text-gray-600 dark:text-gray-400">{message}</p>

        {/* Retry status */}
        {isRetrying && (
          <div className="mb-6 flex items-center justify-center rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <RefreshCw className="mr-3 h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Retrying... ({retryAttempt + 1}/{retryConfig.maxAttempts})
            </span>
          </div>
        )}

        {/* Retry error */}
        {retryError && (
          <div className="mb-6 flex items-start gap-3 rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600 dark:text-orange-400" />
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-sm font-medium text-orange-900 dark:text-orange-100">
                Retry Failed
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                {retryError.message || 'An error occurred while attempting to recover.'}
              </p>
            </div>
          </div>
        )}

        {/* Error details toggle */}
        {(config.showErrorDetails ?? process.env.NODE_ENV === 'development') && (
          <div className="mb-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mb-2 flex w-full items-center justify-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 dark:bg-gray-700 dark:text-gray-300 dark:hover:text-white"
            >
              <Bug className="mr-2 h-4 w-4" />
              {showDetails ? 'Hide Error Details' : 'Show Error Details'}
            </button>

            {showDetails && error && (
              <div className="mb-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-700">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Error Information
                  </h3>
                  <button
                    onClick={handleCopyError}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-1 h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Error Message
                    </p>
                    <p className="rounded bg-red-50 p-2 font-mono text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                      {error.toString()}
                    </p>
                  </div>

                  {errorInfo && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                        Component Stack
                      </p>
                      <pre className="max-h-40 overflow-auto rounded bg-gray-200 p-2 font-mono text-xs whitespace-pre-wrap text-gray-700 dark:bg-gray-600 dark:text-gray-300">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recovery options */}
        {showRecoveryOptions && (
          <div className="mb-8 space-y-3">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-5 w-5" />
                  Try Again
                </>
              )}
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRetrying}
              className="flex w-full items-center justify-center rounded-lg bg-gray-200 px-6 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-300 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Refresh Page
            </button>

            <button
              onClick={handleGoBack}
              disabled={isRetrying}
              className="flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:focus:ring-offset-gray-800"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Go Back
            </button>

            <button
              onClick={() => (window.location.href = '/')}
              disabled={isRetrying}
              className="flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:focus:ring-offset-gray-800"
            >
              <Home className="mr-2 h-5 w-5" />
              Go to Home
            </button>

            {additionalActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                disabled={isRetrying}
                className="flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:focus:ring-offset-gray-800"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Support link */}
        {showSupportLink && (
          <div className="text-center">
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">Problem still persists?</p>
            <a
              href={supportContact}
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <FileText className="mr-1 h-4 w-4" />
              Contact Support
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Card-style error fallback for inline use
 */
export function CardErrorFallback({
  error,
  resetError,
  config = {},
}: ErrorFallbackProps & {
  config?: Omit<ErrorFallbackConfig, 'showErrorDetails' | 'showSupportLink' | 'retryConfig' | 'onRetry'>
}) {
  const {
    title = 'Error',
    message = 'An error occurred',
    showRecoveryOptions = true,
    additionalActions = [],
    className = '',
  } = config

  return (
    <div
      className={`rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20 ${className}`}
    >
      <div className="flex items-start gap-4">
        <AlertTriangle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600 dark:text-red-400" />

        <div className="min-w-0 flex-1">
          <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">{message}</p>

          {showRecoveryOptions && (
            <div className="flex gap-2">
              <button
                onClick={resetError}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Retry
              </button>
              {additionalActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Default ErrorFallback component
 */
export function ErrorFallback({
  error,
  errorInfo,
  resetError,
  config,
}: ErrorFallbackProps & { config?: ErrorFallbackConfig }) {
  // Use full-featured fallback by default
  return (
    <FullErrorFallback
      error={error}
      errorInfo={errorInfo}
      resetError={resetError}
      config={config}
    />
  )
}

export default memo(ErrorFallback)
