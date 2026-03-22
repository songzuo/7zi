/**
 * API Logger
 * API 日志记录器
 */

import logger from '../logger';

let currentRequestId: string | null = null;

/**
 * Set the current request ID
 */
export function setRequestIdContext(requestId: string): void {
  currentRequestId = requestId;
}

/**
 * Get the current request ID
 */
export function getRequestIdContext(): string | null {
  return currentRequestId;
}

/**
 * Clear the current request ID
 */
export function clearRequestIdContext(): void {
  currentRequestId = null;
}

/**
 * Create a request-specific logger
 */
export function createRequestLogger(requestId: string) {
  return {
    debug: (message: string, context?: Record<string, unknown>) => {
      logger.debug(message, { requestId, ...context });
    },
    info: (message: string, context?: Record<string, unknown>) => {
      logger.info(message, { requestId, ...context });
    },
    warn: (message: string, context?: Record<string, unknown>) => {
      logger.warn(message, { requestId, ...context });
    },
    error: (message: string, error?: Error | unknown) => {
      logger.error(message, error);
    },
  };
}

/**
 * Log API request
 */
export function logApiRequest(method: string, path: string, requestId: string): void {
  logger.info(`API ${method} ${path}`, { requestId });
}

/**
 * Log API response
 */
export function logApiResponse(
  method: string,
  path: string,
  status: number,
  requestId: string,
  durationMs: number
): void {
  const logLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

  if (logLevel === 'error') {
    logger.error(`API ${method} ${path} ${status} (${durationMs}ms)`, { requestId });
  } else if (logLevel === 'warn') {
    logger.warn(`API ${method} ${path} ${status} (${durationMs}ms)`, { requestId });
  } else {
    logger.info(`API ${method} ${path} ${status} (${durationMs}ms)`, { requestId });
  }
}
