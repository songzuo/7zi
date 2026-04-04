/**
 * Common API Types
 *
 * Shared types for API responses and errors
 */

/**
 * API Error interface
 * Extends the standard Error with additional properties
 */
export interface ApiError extends Error {
  /** HTTP status code */
  status?: number
  /** Error code from the server */
  code?: string
  /** Error message */
  message: string
  /** Additional error details */
  details?: Record<string, unknown>
}

/**
 * Check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && ('status' in error || 'code' in error)
}

/**
 * Create an ApiError from an unknown error
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    return error as ApiError
  }
  return new Error(String(error)) as ApiError
}
