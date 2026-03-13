/**
 * Unified Logging Utility
 * 
 * Provides structured logging with environment-aware output.
 * In production, logs are minimized; in development, all logs are shown.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

/**
 * Logger instance with namespaced logging
 */
class Logger {
  private namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  private formatMessage(level: LogLevel, message: string): string {
    return `[${this.namespace}] ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (isDev) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (!isProd) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (isDev) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    console.error(this.formatMessage('error', message), ...args);
  }

  /**
   * Audit log - only logs in development; in production, use proper audit system
   */
  audit(action: string, data: Record<string, unknown>): void {
    if (isDev) {
      console.log(`[Audit] ${action}`, {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
    // In production, audit logs should be sent to a proper audit/logging service
    // rather than console.log which is stripped by Terser
  }
}

/**
 * Create a namespaced logger
 */
export function createLogger(namespace: string): Logger {
  return new Logger(namespace);
}

// Pre-configured loggers for common use cases
export const apiLogger = createLogger('API');
export const authLogger = createLogger('Auth');
export const cacheLogger = createLogger('Cache');
export const securityLogger = createLogger('Security');
export const evomapLogger = createLogger('Evomap');
export const pwaLogger = createLogger('PWA');
export const swLogger = createLogger('SW');
export const dbLogger = createLogger('DB');

export default createLogger;
