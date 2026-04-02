/**
 * @fileoverview Timeout Wrapper for API Operations
 * @description Provides timeout protection for long-running operations
 *
 * Features:
 * - Configurable timeout for any async operation
 * - Automatic cleanup on timeout
 * - Integration with error handler
 *
 * @example
 * const fetchData = withTimeout(
 *   async () => fetch('/api/data'),
 *   5000  // 5 second timeout
 * );
 */

import { logger } from '../logger'
import { createServiceUnavailableError, ErrorType } from './error-handler'
import { getLocaleFromRequest, SupportedLocale } from './user-messages'

/**
 * Timeout error for operation timeouts
 */
export class TimeoutError extends Error {
  constructor(message: string = 'Operation timed out') {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Wrap an async function with timeout protection
 *
 * @param fn - The async function to wrap
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @param locale - Locale for error messages (default: 'zh')
 * @returns Wrapped function with timeout protection
 *
 * @example
 * const fetchData = withTimeout(
 *   async () => fetch('/api/data'),
 *   5000
 * );
 *
 * const result = await fetchData();
 *
 * @example
 * // With custom error message
 * const slowOperation = withTimeout(
 *   async () => {
 *     await new Promise(resolve => setTimeout(resolve, 10000));
 *     return 'done';
 *   },
 *   3000
 * );
 */
export function withTimeout<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  timeoutMs: number = 30000,
  locale: SupportedLocale = 'zh'
): T {
  return (async (...args: Parameters<T>) => {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      // Store timeout ID for cleanup
      ;(timeoutPromise as { __timeoutId?: NodeJS.Timeout }).__timeoutId = timeoutId
    })

    try {
      // Race between the operation and the timeout
      const result = await Promise.race([fn(...args), timeoutPromise])

      // Clear timeout if operation completed first
      const timeoutId = (timeoutPromise as { __timeoutId?: NodeJS.Timeout }).__timeoutId
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      return result
    } catch (error) {
      // Clear timeout on error
      const timeoutId = (timeoutPromise as { __timeoutId?: NodeJS.Timeout }).__timeoutId
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // Handle timeout error
      if (error instanceof TimeoutError) {
        logger.warn(`Operation timed out: ${fn.name || 'anonymous'}`, {
          timeoutMs,
          args: args.length > 0 ? args : undefined,
        })

        throw error
      }

      // Re-throw other errors
      throw error
    }
  }) as T
}

/**
 * Create a promise with timeout that rejects with ApiError on timeout
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param locale - Locale for error messages
 * @returns Promise that rejects with ApiError on timeout
 *
 * @example
 * try {
 *   const result = await withTimeoutPromise(
 *     fetch('/api/data'),
 *     5000
 *   );
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     // Handle timeout error
 *   }
 * }
 */
export async function withTimeoutPromise<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  locale: SupportedLocale = 'zh'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    promise
      .then(result => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch(error => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

/**
 * Create a timeout wrapper that returns a service unavailable error
 *
 * @param fn - The async function to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param locale - Locale for error messages
 * @returns Wrapped function that returns NextResponse on timeout
 */
export function withTimeoutApi<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  timeoutMs: number = 30000,
  locale: SupportedLocale = 'zh'
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await withTimeout(fn, timeoutMs, locale)(...args)
    } catch (error) {
      if (error instanceof TimeoutError) {
        return await createServiceUnavailableError(`请求超时，请稍后重试 (${timeoutMs}ms)`, locale)
      }
      throw error
    }
  }) as T
}

/**
 * Timeout presets for common scenarios
 */
export const TimeoutPresets = {
  /** Very short timeout for simple operations (500ms) */
  veryFast: 500,

  /** Short timeout for quick operations (2s) */
  fast: 2000,

  /** Medium timeout for typical operations (10s) */
  medium: 10000,

  /** Long timeout for slow operations (30s) */
  long: 30000,

  /** Very long timeout for external API calls (60s) */
  veryLong: 60000,

  /** Extra long timeout for file operations (120s) */
  extraLong: 120000,
}

/**
 * Execute function with timeout and return result or default
 *
 * @param fn - Function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param defaultValue - Default value if timeout occurs
 * @returns Result or default value
 *
 * @example
 * const data = await withTimeoutDefault(
 *   async () => fetch('/api/data'),
 *   5000,
 *   null
 * );
 */
export async function withTimeoutDefault<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  defaultValue: T
): Promise<T> {
  try {
    return await withTimeout(fn, timeoutMs)()
  } catch (error) {
    if (error instanceof TimeoutError) {
      logger.warn('Operation timed out, returning default value')
      return defaultValue
    }
    throw error
  }
}

/**
 * Measure and log function execution time
 *
 * @param fn - Function to measure
 * @param name - Name for logging
 * @returns Result of the function
 *
 * @example
 * const result = await withMeasurement(
 *   () => fetchData(),
 *   'fetchData'
 * );
 */
export async function withMeasurement<T>(fn: () => Promise<T>, name: string): Promise<T> {
  const startTime = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - startTime
    logger.info(`Function ${name} completed`, { durationMs: duration })
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error(`Function ${name} failed`, error, { durationMs: duration })
    throw error
  }
}

/**
 * Combine timeout and measurement
 *
 * @param fn - Function to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param name - Name for logging
 * @returns Result of the function
 */
export async function withTimeoutAndMeasurement<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  name: string
): Promise<T> {
  return withMeasurement(() => withTimeout(fn, timeoutMs)(), name)
}
