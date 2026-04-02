/**
 * Error Tracking Utilities
 * Enhanced error handling with Sentry integration
 */

import * as Sentry from '@sentry/nextjs'

/**
 * Error categories for better organization
 */
export enum ErrorCategory {
  // Application errors
  APPLICATION = 'application',
  API = 'api',
  NETWORK = 'network',
  VALIDATION = 'validation',

  // User errors
  USER_INPUT = 'user_input',
  PERMISSION = 'permission',

  // System errors
  INFRASTRUCTURE = 'infrastructure',
  EXTERNAL_SERVICE = 'external_service',
  THIRD_PARTY = 'third_party',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  FATAL = 'fatal',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * Custom error class with metadata
 */
export class TrackedError extends Error {
  public readonly category: ErrorCategory
  public readonly severity: ErrorSeverity
  public readonly metadata: Record<string, unknown>
  public readonly userMessage: string
  public readonly cause?: Error

  constructor(options: {
    message: string
    category?: ErrorCategory
    severity?: ErrorSeverity
    metadata?: Record<string, unknown>
    userMessage?: string
    cause?: Error
  }) {
    super(options.message)

    this.name = 'TrackedError'
    this.category = options.category ?? ErrorCategory.APPLICATION
    this.severity = options.severity ?? ErrorSeverity.ERROR
    this.metadata = options.metadata ?? {}
    this.userMessage = options.userMessage ?? 'An unexpected error occurred'
    this.cause = options.cause

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TrackedError)
    }
  }
}

/**
 * Capture error with context
 */
export function captureError(
  error: Error | TrackedError | unknown,
  options?: {
    category?: ErrorCategory
    severity?: ErrorSeverity
    tags?: Record<string, string>
    extra?: Record<string, unknown>
    user?: {
      id?: string
      email?: string
      username?: string
    }
  }
) {
  // Determine error details
  const isError = error instanceof Error
  const isTrackedError = error instanceof TrackedError

  // Build Sentry context
  Sentry.withScope(scope => {
    // Set tags
    if (options?.tags) {
      Object.entries(options.tags).forEach(([key, value]) => {
        scope.setTag(key, value)
      })
    }

    // Set category and severity
    const category =
      options?.category ?? (isTrackedError ? error.category : ErrorCategory.APPLICATION)
    const severity = options?.severity ?? (isTrackedError ? error.severity : ErrorSeverity.ERROR)

    scope.setTag('category', category)
    scope.setLevel(severity)

    // Set user
    if (options?.user) {
      scope.setUser(options.user)
    }

    // Set extra context
    if (options?.extra) {
      Object.entries(options.extra).forEach(([key, value]) => {
        scope.setExtra(key, value)
      })
    }

    // Add TrackedError metadata
    if (isTrackedError) {
      Object.entries(error.metadata).forEach(([key, value]) => {
        scope.setExtra(key, value)
      })
    }

    // Add fingerprint for grouping
    if (isTrackedError) {
      scope.setFingerprint([error.category, error.message])
    }

    // Capture the error
    if (isError) {
      Sentry.captureException(error)
    } else {
      Sentry.captureMessage(String(error))
    }
  })
}

/**
 * Wrap async function with error tracking
 */
export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options?: {
    category?: ErrorCategory
    tags?: Record<string, string>
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      captureError(error, {
        category: options?.category,
        tags: options?.tags,
        extra: {
          args: args.map(arg => {
            if (typeof arg === 'object' && arg !== null) {
              try {
                return JSON.stringify(arg).slice(0, 500)
              } catch (error) {
                return '[Object]'
              }
            }
            return arg
          }),
        },
      })
      throw error
    }
  }) as T
}

/**
 * API Error handler
 */
export function handleApiError(error: unknown, endpoint: string) {
  if (error instanceof Response) {
    captureError(new Error(`API Error: ${error.status}`), {
      category: ErrorCategory.API,
      tags: {
        endpoint,
        status: String(error.status),
      },
      extra: {
        statusText: error.statusText,
        url: error.url,
      },
    })
    return {
      message: `API request failed with status ${error.status}`,
      status: error.status,
    }
  }

  if (error instanceof Error) {
    captureError(error, {
      category: ErrorCategory.NETWORK,
      tags: {
        endpoint,
      },
    })
    return {
      message: error.message,
      status: 0,
    }
  }

  captureError(String(error), {
    category: ErrorCategory.NETWORK,
    tags: {
      endpoint,
    },
  })

  return {
    message: 'Unknown error occurred',
    status: 0,
  }
}

/**
 * Log breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
  })
}
