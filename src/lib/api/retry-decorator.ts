/**
 * @fileoverview Retry Decorator with Exponential Backoff
 * @description Provides automatic retry mechanism with exponential backoff for API calls
 *
 * Features:
 * - Configurable retry attempts and delays
 * - Exponential backoff with jitter
 * - Configurable retryable error codes
 * - Retry condition callback
 *
 * @example
 * const fetchWithRetry = withRetry(
 *   async (url: string) => fetch(url),
 *   { maxRetries: 3, initialDelay: 1000 }
 * );
 */

import { logger } from '../logger';

/**
 * Retry configuration options
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Error codes/statuses that should trigger retry (default: [503, 502, 504, 'ECONNRESET', 'ETIMEDOUT']) */
  retryableErrors?: (number | string)[];
  /** Custom function to determine if an error should be retried */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Add jitter to prevent thundering herd (default: true) */
  jitter?: boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [503, 502, 504, 429, 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'],
  shouldRetry: () => true,
  jitter: true,
};

/**
 * Calculate delay with exponential backoff and optional jitter
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  const baseDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  const delay = Math.min(baseDelay, config.maxDelay);

  // Add jitter to prevent thundering herd
  if (config.jitter) {
    const jitterAmount = delay * 0.1; // 10% jitter
    const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
    return Math.max(0, Math.round(delay + jitter));
  }

  return Math.round(delay);
}

/**
 * Check if an error is retryable based on configuration
 *
 * @param error - The error to check
 * @param config - Retry configuration
 * @param attempt - Current attempt number
 * @returns True if the error should be retried
 */
function isRetryable(error: Error, config: Required<RetryConfig>, attempt: number): boolean {
  // Check custom retry condition first
  if (!config.shouldRetry(error, attempt)) {
    return false;
  }

  // Check if error matches retryable error codes
  const errorMessage = error.message.toLowerCase();
  const errorStack = error.stack?.toLowerCase() || '';

  return config.retryableErrors.some(code => {
    const codeStr = String(code).toLowerCase();
    return errorMessage.includes(codeStr) || errorStack.includes(codeStr);
  });
}

/**
 * Add retry metadata to an error for tracking
 *
 * @param error - Original error
 * @param totalAttempts - Total attempts made
 * @param config - Retry configuration used
 * @returns Error with retry metadata
 */
function enrichErrorWithRetryInfo(
  error: Error,
  totalAttempts: number,
  config: Required<RetryConfig>
): Error & { __retryAttempts?: number; __retryConfig?: Partial<RetryConfig> } {
  const enrichedError = error as Error & { __retryAttempts?: number; __retryConfig?: Partial<RetryConfig> };
  enrichedError.__retryAttempts = totalAttempts;
  enrichedError.__retryConfig = {
    maxRetries: config.maxRetries,
    initialDelay: config.initialDelay,
    backoffMultiplier: config.backoffMultiplier,
  };
  return enrichedError;
}

/**
 * Wrap a function with automatic retry logic with exponential backoff
 *
 * @param fn - The async function to wrap
 * @param config - Retry configuration options
 * @returns Wrapped function with retry logic
 *
 * @example
 * // Basic usage
 * const fetchWithRetry = withRetry(fetch, { maxRetries: 3 });
 *
 * @example
 * // With custom retry condition
 * const apiCall = withRetry(
 *   async (id: string) => fetch(`/api/data/${id}`),
 *   {
 *     maxRetries: 5,
 *     initialDelay: 2000,
 *     shouldRetry: (error) => error.message.includes('timeout'),
 *   }
 * );
 *
 * @example
 * // Retry specific HTTP status codes
 * const githubApi = withRetry(
 *   async (url: string) => {
 *     const response = await fetch(url);
 *     if (!response.ok) throw new Error(`HTTP ${response.status}`);
 *     return response.json();
 *   },
 *   {
 *     maxRetries: 3,
 *     retryableErrors: [403, 502, 503, 504],  // GitHub rate limit (403) is retryable
 *   }
 * );
 */
export function withRetry<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  config: RetryConfig = {}
): T {
  const options = { ...DEFAULT_RETRY_CONFIG, ...config };

  return (async (...args: Parameters<T>) => {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt <= options.maxRetries) {
      try {
        // Execute the function
        const result = await fn(...args);

        // Log successful retry if this was a retry attempt
        if (attempt > 0) {
          logger.info(`Retry succeeded on attempt ${attempt + 1}`, {
            function: fn.name || 'anonymous',
            attempts: attempt + 1,
            totalDelay: calculateTotalDelay(attempt, options),
          });
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        if (!isRetryable(lastError, options, attempt)) {
          logger.debug('Error is not retryable', {
            function: fn.name || 'anonymous',
            attempt: attempt + 1,
            error: lastError.message,
          });
          break;
        }

        // Check if we've reached max retries
        if (attempt === options.maxRetries) {
          logger.warn('Max retries reached', {
            function: fn.name || 'anonymous',
            maxRetries: options.maxRetries,
            finalError: lastError.message,
          });
          break;
        }

        // Calculate delay and wait
        const delay = calculateDelay(attempt, options);

        logger.warn(`Retry attempt ${attempt + 1}/${options.maxRetries + 1}`, {
          function: fn.name || 'anonymous',
          error: lastError.message,
          delayMs: delay,
        });

        await new Promise(resolve => setTimeout(resolve, delay));

        attempt++;
      }
    }

    // Enrich error with retry information before throwing
    throw enrichErrorWithRetryInfo(lastError!, attempt, options);
  }) as T;
}

/**
 * Calculate total delay time for all retry attempts
 *
 * @param attempts - Number of attempts completed
 * @param config - Retry configuration
 * @returns Total delay in milliseconds
 */
function calculateTotalDelay(attempts: number, config: Required<RetryConfig>): number {
  let total = 0;
  for (let i = 0; i < attempts; i++) {
    total += calculateDelay(i, config);
  }
  return total;
}

/**
 * Create a retry configuration preset for common scenarios
 */
export const RetryPresets = {
  /** Conservative retry for critical operations */
  conservative: {
    maxRetries: 5,
    initialDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
  } as RetryConfig,

  /** Aggressive retry for non-critical operations */
  aggressive: {
    maxRetries: 3,
    initialDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
    jitter: true,
  } as RetryConfig,

  /** Retry for external APIs with rate limits */
  rateLimited: {
    maxRetries: 5,
    initialDelay: 3000,
    maxDelay: 60000,
    backoffMultiplier: 2,
    retryableErrors: [429, 503, 502, 504],
    jitter: true,
  } as RetryConfig,

  /** No retry for idempotent operations */
  once: {
    maxRetries: 0,
  } as RetryConfig,
};

/**
 * Extract retry information from an error
 *
 * @param error - Error that may have retry metadata
 * @returns Retry information or null if not available
 */
export function getRetryInfo(
  error: Error | unknown
): { attempts: number; config: Partial<RetryConfig> } | null {
  if (error instanceof Error) {
    const enriched = error as Error & { __retryAttempts?: number; __retryConfig?: Partial<RetryConfig> };
    if (enriched.__retryAttempts !== undefined) {
      return {
        attempts: enriched.__retryAttempts,
        config: enriched.__retryConfig || {},
      };
    }
  }
  return null;
}
