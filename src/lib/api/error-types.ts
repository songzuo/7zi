/**
 * @fileoverview API Error Types
 * @description Centralized error type enum to avoid circular dependencies
 *
 * This file should NOT import from other API modules to prevent circular dependency issues.
 */

/**
 * Error types for different error categories
 * Use these values for error.type (not error.code)
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  INTERNAL = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  MISSING_TOKEN = 'MISSING_TOKEN',
  CONFLICT = 'CONFLICT',
}

/**
 * Type alias for the ErrorType enum values
 */
export type ErrorTypeValue = ErrorType
