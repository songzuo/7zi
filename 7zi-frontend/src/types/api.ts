/**
 * Common API Types
 *
 * Shared types for API responses and errors
 * Based on OpenAPI 3.0 specification patterns
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
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      status: (error as ApiError).status,
      code: (error as ApiError).code,
      details: (error as ApiError).details,
    }
  }
  return {
    name: 'Error',
    message: String(error),
  }
}

// ============================================
// Pagination Types
// ============================================

/**
 * Pagination request parameters
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page?: number
  /** Number of items per page */
  limit?: number
  /** Sort field */
  sortBy?: string
  /** Sort order */
  sortOrder?: 'asc' | 'desc'
}

/**
 * Paginated response wrapper
 * @template T - The type of items in the response
 */
export interface PaginatedResponse<T> {
  /** Array of items */
  items: T[]
  /** Total number of items */
  total: number
  /** Current page number */
  page: number
  /** Number of items per page */
  limit: number
  /** Whether there are more pages */
  hasMore: boolean
  /** Total number of pages */
  totalPages: number
}

/**
 * Create a paginated response
 * @template T - The type of items
 * @param items - Array of items
 * @param page - Current page
 * @param limit - Items per page
 * @returns Paginated response object
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number
): PaginatedResponse<T> {
  const total = items.length
  const totalPages = Math.ceil(total / limit)
  
  return {
    items,
    total,
    page,
    limit,
    hasMore: page < totalPages,
    totalPages,
  }
}

// ============================================
// API Response Types
// ============================================

/**
 * Standard API success response
 * @template T - The type of data being returned
 */
export interface ApiSuccessResponse<T = unknown> {
  /** Response success status */
  success: true
  /** Response data */
  data: T
  /** ISO 8601 timestamp */
  timestamp: string
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  /** Response success status */
  success: false
  /** Error details */
  error: {
    /** Error type code */
    type: string
    /** Human-readable error message */
    message: string
    /** Additional error details */
    details?: Record<string, unknown>
    /** ISO 8601 timestamp */
    timestamp: string
  }
}

/**
 * Union type for all API responses
 * @template T - The type of data for success responses
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * API response metadata
 */
export interface ApiResponseMeta {
  /** Request ID for tracing */
  requestId?: string
  /** API version */
  version?: string
  /** Rate limit information */
  rateLimit?: {
    /** Maximum requests allowed */
    limit: number
    /** Remaining requests */
    remaining: number
    /** Reset timestamp */
    reset: string
  }
}

// ============================================
// Request/Response Types for Common Operations
// ============================================

/**
 * Generic create request
 */
export interface CreateRequest<T> {
  /** Data to create */
  data: T
}

/**
 * Generic update request
 */
export interface UpdateRequest<T> {
  /** Partial data to update */
  data: Partial<T>
  /** Update mask for PATCH operations */
  updateMask?: string[]
}

/**
 * Generic delete response
 */
export interface DeleteResponse {
  /** Whether deletion was successful */
  success: boolean
  /** ID of deleted resource */
  deletedId: string
}

/**
 * Generic ID parameter for routes
 */
export interface IdParam {
  /** Resource ID */
  id: string
}

// ============================================
// OpenAPI-style Type Annotations
// ============================================

/**
 * Schema for OpenAPI documentation
 * @example
 * ```typescript
 * interface UserResponse {
 *   id: string
 *   name: string
 *   email: string
 * }
 * 
 * // OpenAPI annotation example:
 * // @openapi {
 * //   path: /users/{id}
 * //   method: GET
 * //   summary: Get user by ID
 * //   tags: [users]
 * // }
 * ```
 */

/**
 * API endpoint metadata for documentation
 */
export interface ApiEndpointMeta {
  /** OpenAPI path */
  path: string
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Endpoint summary */
  summary?: string
  /** Endpoint description */
  description?: string
  /** OpenAPI tags */
  tags?: string[]
  /** Request body schema */
  requestBody?: {
    /** Content type */
    contentType: string
    /** Schema reference */
    schema: string
    /** Required flag */
    required?: boolean
  }
  /** Response schemas */
  responses?: Record<string, {
    /** Response description */
    description: string
    /** Schema reference */
    schema?: string
    /** Response code */
    code: number
  }>
}

/**
 * Decorator function for API endpoint metadata
 */
export function apiEndpoint(meta: ApiEndpointMeta) {
  return function <T extends new (...args: unknown[]) => unknown>(constructor: T) {
    return constructor
  }
}
