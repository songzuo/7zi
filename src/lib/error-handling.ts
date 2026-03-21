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

  // Type guards
  isSuccessResponse,
  isErrorResponse,
} from './lib/api/api-error';

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
} from './lib/api/api-response-wrapper';

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
} from './lib/middleware/api-error-logging';

// ============================================================
// Fallback & Degradation Components
// ============================================================

export {
  // Component fallback
  ComponentFallback,
  withFallback,
  type FallbackVariant,
  type ComponentFallbackProps,

  // Async boundary
  AsyncBoundary,
  AsyncBoundaryFn,
  type AsyncStatus,
  type AsyncBoundaryProps,
  type AsyncBoundaryFnProps,
  type AsyncChildren,
} from './components/fallbacks/ComponentFallback';
export {
  AsyncBoundary,
  AsyncBoundaryFn,
  type AsyncStatus,
  type AsyncBoundaryProps,
  type AsyncBoundaryFnProps,
  type AsyncChildren,
} from './components/fallbacks/AsyncBoundary';

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
  type CircuitStats,
} from './lib/fallback/circuit-breaker';

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
} from './lib/fallback/graceful-degradation';

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
} from './lib/monitoring/errors';

// ============================================================
// Error Boundaries
// ============================================================

export {
  // React error boundaries
  ErrorBoundary as UIErrorBoundary,
  withErrorBoundary,
  createErrorBoundaryWrapper,

  // Next.js page error boundaries
  ErrorBoundary as PageErrorBoundary,
  type ErrorBoundaryProps,
} from './components/ErrorBoundary';
export {
  // Error display components
  ErrorDisplay,
  type ErrorDisplayProps,
  type ErrorVariant,
  type ErrorType,
} from './components/ErrorDisplay';

// ============================================================
// Logger
// ============================================================

export {
  Logger,
  ConsoleTransport,
  MemoryTransport,
  FilterTransport,
  logger,
  createLogger,

  // Types
  LogLevel,
  type LogEntry,
  type LogTransport,
} from './lib/logger';

// ============================================================
// Error Utilities
// ============================================================

export {
  createAppError,
  formatErrorMessage,
  isNetworkError,
  getErrorCode,
  getUserFriendlyMessage,
  type AppError,
} from './lib/errors';

// ============================================================
// Global Error Handlers
// ============================================================

export {
  setupGlobalErrorHandlers,
  setupBrowserErrorHandlers,
} from './lib/global-error-handlers';

// ============================================================
// Retry Mechanism
// ============================================================

export {
  retry,
  retryWithResult,
  retryFetch,
  RetryCache,
  createRetryCache,

  // Types
  type RetryOptions,
  type RetryResult,
} from './lib/utils/retry';
