/**
 * Error Handling & Monitoring System
 *
 * Comprehensive error handling, logging, and monitoring for 7zi-project
 *
 * @packageDocumentation
 */

// ============================================================
// API Error Handling
// ============================================================

export {
  // Types
  type ApiErrorResponse,
  type ApiSuccessResponse,
  type ApiResponse,
  ApiErrorCode,
  STATUS_CODE_TO_ERROR,
  ERROR_CODE_TO_STATUS,
  ERROR_MESSAGES,

  // Error classes
  ApiError,
  ValidationError,
} from './api/api-error'

export {
  // Response wrappers
  success,
  error as apiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooManyRequests,
  internalError,
  serviceUnavailable,

  // Handler wrapper
  withApiHandler,
  parseResponse,
} from './api/api-response-wrapper'

// ============================================================
// Error Logging Middleware
// ============================================================

export {
  // Main functions
  logApiError,
  withErrorLogging,

  // Utilities
  extractErrorInfo,
  isRetryableError,
  getRetryDelay,

  // Configuration
  type ErrorLoggingMiddlewareConfig,
} from './middleware/api-error-logging'

// ============================================================
// Fallback & Degradation Components
// ============================================================

export {
  // Component fallback
  ComponentFallback,
  withFallback,
  type FallbackVariant,
  type ComponentFallbackProps,
} from '../components/fallbacks/ComponentFallback'

export {
  // Async boundary
  AsyncBoundary,
  AsyncBoundaryFn,
  type AsyncStatus,
  type AsyncBoundaryProps,
  type AsyncBoundaryFnProps,
  type AsyncChildren,
} from '../components/fallbacks/AsyncBoundary'

// ============================================================
// Circuit Breaker & Graceful Degradation
// ============================================================

export {
  // Circuit breaker
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitBreakerOpenError,
  withCircuitBreaker,
  getCircuitBreaker,
  CircuitState,
  type CircuitBreakerConfig,
} from './fallback/circuit-breaker'

export {
  // Graceful degradation
  DegradationManager,
  FeatureFlags,
  NetworkCondition,
  withDegradation,
  getDegradationManager,
  getNetworkCondition,
  type DegradationStrategy,
  type DegradationConfig,
  type DegradationLevel,
} from './fallback/graceful-degradation'

// ============================================================
// Error Tracking & Monitoring
// ============================================================

export {
  // Error tracking
  TrackedError,
  captureError,
  withErrorTracking,
  handleApiError,
  addBreadcrumb,

  // Types
  ErrorCategory,
  ErrorSeverity,
} from './monitoring/errors'

// ============================================================
// Error Boundaries
// ============================================================

export {
  // React error boundaries
  ErrorBoundary as UIErrorBoundary,
  ErrorBoundary as PageErrorBoundary,
  type ErrorBoundaryProps,
} from '../components/ErrorBoundary'
export type { ErrorDisplayProps, ErrorVariant, ErrorType } from '../components/ErrorDisplay'

// ============================================================
// Logger
// ============================================================

export { logger, log } from './logger'

export type { LogLevel, LogEntry } from './logger'

export {
  createAppError,
  formatErrorMessage,
  isNetworkError,
  getErrorCode,
  getUserFriendlyMessage,
  type AppError,
} from './errors'

export { setupGlobalErrorHandlers, setupBrowserErrorHandlers } from './global-error-handlers'

export {
  retry,
  retryWithResult,
  retryFetch,
  RetryCache,
  createRetryCache,

  // Types
  type RetryOptions,
  type RetryResult,
} from './utils/retry'
