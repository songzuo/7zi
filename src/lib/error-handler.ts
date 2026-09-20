/**
 * @fileoverview Server-Side Error Handling Utilities
 * @description Error handling utilities for server-side code (API routes, server components).
 *              For client-side error handling with toast notifications, use @/lib/error/client/error-handler
 */

'use server'

import React from 'react'

// ============================================================================
// Types
// ============================================================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export type ErrorCategory = 'network' | 'validation' | 'auth' | 'server' | 'client' | 'unknown'

export interface AppError extends Error {
  code?: string
  category?: ErrorCategory
  severity?: ErrorSeverity
  userMessage?: string
  retryable?: boolean
  context?: Record<string, unknown>
}

export interface ErrorHandlerConfig {
  showNotification?: boolean
  logToConsole?: boolean
  logToServer?: boolean
  showToast?: boolean
}

// ============================================================================
// Error Classification
// ============================================================================

export function classifyError(error: Error | AppError): ErrorCategory {
  const appError = error as AppError

  if (appError.category) {
    return appError.category
  }

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
  const appError = error as AppError

  if (appError.severity) {
    return appError.severity
  }

  const category = classifyError(appError)

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
  const appError = error as AppError

  if (appError.userMessage) {
    return appError.userMessage
  }

  const category = classifyError(appError)

  switch (category) {
    case 'network':
      return 'Network connection failed, please check your network connection'
    case 'auth':
      return 'Authentication failed, please login again'
    case 'validation':
      return 'Invalid input, please check and try again'
    case 'server':
      return 'Server error occurred, please try again later'
    case 'client':
      return 'An unexpected error occurred, please refresh the page'
    default:
      return 'An unknown error occurred, please contact technical support'
  }
}

export function getErrorTitle(error: Error | AppError): string {
  const category = classifyError(error)

  switch (category) {
    case 'network':
      return 'Network Error'
    case 'auth':
      return 'Authentication Error'
    case 'validation':
      return 'Validation Failed'
    case 'server':
      return 'Server Error'
    case 'client':
      return 'Client Error'
    default:
      return 'Error Occurred'
  }
}

// ============================================================================
// Error Logging (Server-Safe)
// ============================================================================

function logToConsole(error: Error | AppError): void {
  const category = classifyError(error)
  const severity = getErrorSeverity(error)

  console.group(`[${severity.toUpperCase()}] ${category.toUpperCase()} Error`)

  console.error('Error:', error)
  console.error('Message:', error.message)
  console.error('Stack:', error.stack)

  if ('code' in error) {
    console.error('Code:', (error as AppError).code)
  }

  if ('context' in error && (error as AppError).context) {
    console.error('Context:', (error as AppError).context)
  }

  console.groupEnd()
}

async function logToServer(error: Error | AppError): Promise<void> {
  if (typeof window !== 'undefined') return

  try {
    const errorData = {
      message: error.message,
      stack: error.stack,
      category: classifyError(error),
      severity: getErrorSeverity(error),
      code: (error as AppError).code,
      context: (error as AppError).context,
      timestamp: new Date().toISOString(),
    }

    console.log('[Error Logger]', 'Error data prepared for server:', errorData)
  } catch (loggingError) {
    console.error('[Error Logger] Failed to log error to server:', loggingError)
  }
}

// ============================================================================
// Error Handler (Server-Safe - No Toast)
// ============================================================================

function isRetryable(error: Error | AppError): boolean {
  const appError = error as AppError

  if (typeof appError.retryable === 'boolean') {
    return appError.retryable
  }

  const category = classifyError(error)

  return category === 'network' || category === 'server'
}

/**
 * Server-side error handler - logs errors but does NOT show toast
 * For client-side with toast, use @/lib/error/client/error-handler
 */
export function handleError(
  error: Error | AppError,
  config: ErrorHandlerConfig = {},
  customMessage?: string
): void {
  const {
    showNotification = false,  // Default to false for server
    logToConsole: doLogToConsole = true,
    logToServer: doLogToServer = true,
    showToast = false,  // Always false for server
  } = config

  if (doLogToConsole) {
    logToConsole(error)
  }

  if (doLogToServer) {
    logToServer(error).catch(err => {
      console.error('[Error Handler] Failed to log error:', err)
    })
  }

  // Server-side: no toast notifications
  if (process.env.NODE_ENV === 'development') {
    console.log('[Error Handler] Error handled (server mode, no toast):', customMessage || getUserFriendlyMessage(error))
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
// Error Boundary Component (Client-Side Only)
// ============================================================================

interface ErrorBoundaryWrapperProps {
  fallback?: React.ReactNode
  onError?: (error: Error) => void
}

/**
 * Error Boundary HOC - FOR CLIENT USE ONLY
 * For server components, use error.tsx files instead
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: ErrorBoundaryWrapperProps = {}
): React.FC<P> {
  // This is a client-side only component - imported dynamically
  console.warn('[Error Handler] withErrorBoundary is client-side only')
  
  return props => {
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
            'Component loading failed'
          ),
          React.createElement(
            'button',
            {
              key: 'btn',
              onClick: () => window.location.reload(),
              className: 'mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600',
            },
            'Refresh Page'
          ),
        ])
      )
    }

    return React.createElement(Component, props)
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  handleError,
  withErrorHandling,
  withErrorBoundary,
  classifyError,
  getErrorSeverity,
  getUserFriendlyMessage,
  getErrorTitle,
}
