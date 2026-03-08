/**
 * Error Tracking Utilities
 * Enhanced error handling with custom implementation
 */

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
export class AppError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly metadata: Record<string, unknown>;
  public readonly userMessage: string;
  public readonly cause?: Error;

  constructor(options: {
    message: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    metadata?: Record<string, unknown>;
    userMessage?: string;
    cause?: Error;
  }) {
    super(options.message);
    
    this.name = 'AppError';
    this.category = options.category ?? ErrorCategory.APPLICATION;
    this.severity = options.severity ?? ErrorSeverity.ERROR;
    this.metadata = options.metadata ?? {};
    this.userMessage = options.userMessage ?? 'An unexpected error occurred';
    this.cause = options.cause;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Capture error with context
 */
export function captureError(
  error: Error | AppError | unknown,
  options?: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    user?: {
      id?: string;
      email?: string;
      username?: string;
    };
  }
): Record<string, unknown> {
  // Determine error details
  const isError = error instanceof Error;
  const isAppError = error instanceof AppError;
  
  // Set category and severity
  const category = options?.category ?? (isAppError ? error.category : ErrorCategory.APPLICATION);
  const severity = options?.severity ?? (isAppError ? error.severity : ErrorSeverity.ERROR);
  
  // Build error context
  const context: Record<string, unknown> = {
    category,
    severity,
    timestamp: new Date().toISOString(),
  };

  // Add tags
  if (options?.tags) {
    context.tags = options.tags;
  }

  // Add user info
  if (options?.user) {
    context.user = options.user;
  }

  // Add extra context
  if (options?.extra) {
    context.extra = options.extra;
  }

  // Add AppError metadata
  if (isAppError) {
    context.metadata = error.metadata;
    context.fingerprint = [error.category, error.message];
  }

  // Log the error based on severity
  const logMessage = `[Error Tracking] ${isError ? error.message : String(error)}`;
  
  switch (severity) {
    case ErrorSeverity.FATAL:
    case ErrorSeverity.ERROR:
      console.error(logMessage, context);
      break;
    case ErrorSeverity.WARNING:
      console.warn(logMessage, context);
      break;
    case ErrorSeverity.INFO:
      console.info(logMessage, context);
      break;
    case ErrorSeverity.DEBUG:
      console.debug(logMessage, context);
      break;
    default:
      console.log(logMessage, context);
  }
  
  return context;
}

/**
 * Wrap async function with error tracking
 */
export function withErrorTracking<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options?: {
    category?: ErrorCategory;
    tags?: Record<string, string>;
  }
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error, {
        category: options?.category,
        tags: options?.tags,
        extra: {
          args: args.map((arg) => {
            if (typeof arg === 'object' && arg !== null) {
              try {
                return JSON.stringify(arg).slice(0, 500);
              } catch {
                return '[Object]';
              }
            }
            return arg;
          }),
        },
      });
      throw error;
    }
  };
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
    });
    return {
      message: `API request failed with status ${error.status}`,
      status: error.status,
    };
  }

  if (error instanceof Error) {
    captureError(error, {
      category: ErrorCategory.NETWORK,
      tags: {
        endpoint,
      },
    });
    return {
      message: error.message,
      status: 0,
    };
  }

  captureError(String(error), {
    category: ErrorCategory.NETWORK,
    tags: {
      endpoint,
    },
  });
  
  return {
    message: 'Unknown error occurred',
    status: 0,
  };
}

/**
 * Log breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
) {
  console.log(`[${category}] ${message}`, data ?? '');
}