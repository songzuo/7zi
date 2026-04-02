/**
 * API Error Logger
 *
 * Simple error logging and statistics for API routes
 */

import { logger } from '../logger'

/**
 * Log an API error
 */
export function logApiError(error: Error, context: Record<string, unknown> = {}): void {
  logger.error('API Error:', error, {
    message: error.message,
    stack: error.stack,
    ...context,
  })
}

/**
 * Create an API context for error logging
 */
export function createApiContext(
  requestId: string,
  metadata: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    requestId,
    timestamp: new Date().toISOString(),
    ...metadata,
  }
}

/**
 * Error Statistics class for tracking errors
 */
export class ErrorStatistics {
  private errors: Map<string, number> = new Map()
  private windowMs: number

  constructor(windowMs: number = 60000) {
    this.windowMs = windowMs
  }

  record(errorType: string): void {
    const count = this.errors.get(errorType) || 0
    this.errors.set(errorType, count + 1)
  }

  getStats(): Record<string, number> {
    return Object.fromEntries(this.errors)
  }

  static getInstance(): ErrorStatistics {
    return new ErrorStatistics()
  }
}
