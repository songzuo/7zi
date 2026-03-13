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
 * Sensitive field names that should be redacted from logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'token',
  'apiKey',
  'apikey',
  'credential',
  'authorization',
  'accessToken',
  'refreshToken',
  'privateKey',
  'sessionId',
];

/**
 * Redact sensitive information from objects
 */
function redactSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Check if string looks like a token or contains sensitive patterns
    if (data.length > 20 && (data.includes('.') || /^[A-Za-z0-9+/=]+$/.test(data))) {
      return '[REDACTED]';
    }
    return data;
  }

  if (typeof data === 'object' && !(data instanceof Error)) {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitiveData(value);
      }
    }
    return redacted;
  }

  return data;
}

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

  /**
   * Sanitize args for logging - redact sensitive data
   */
  private sanitizeArgs(args: unknown[]): unknown[] {
    return args.map(arg => redactSensitiveData(arg));
  }

  debug(message: string, ...args: unknown[]): void {
    if (isDev) {
      console.debug(this.formatMessage('debug', message), ...this.sanitizeArgs(args));
    }
  }

  info(message: string, ...args: unknown[]): void {
    // INFO level: always log in dev, optionally in prod
    if (!isProd || isDev) {
      console.info(this.formatMessage('info', message), ...this.sanitizeArgs(args));
    }
  }

  warn(message: string, ...args: unknown[]): void {
    // WARN level: always log (important for production monitoring)
    console.warn(this.formatMessage('warn', message), ...this.sanitizeArgs(args));
  }

  error(message: string, ...args: unknown[]): void {
    // ERROR level: always log with stack trace
    const sanitizedArgs = this.sanitizeArgs(args);
    
    // Add stack trace if an Error is included and we're in dev or it's a fatal error
    if (args.some(arg => arg instanceof Error)) {
      console.error(this.formatMessage('error', message), ...sanitizedArgs);
    } else {
      console.error(this.formatMessage('error', message), ...sanitizedArgs);
    }
  }

  /**
   * Audit log - ALWAYS logs regardless of environment
   * This is critical for security and compliance
   */
  audit(action: string, data: Record<string, unknown>): void {
    const auditData = {
      ...data,
      timestamp: new Date().toISOString(),
      // Always include sanitized data, never raw sensitive info
      ...redactSensitiveData(data) as object,
    };

    // In development, log to console
    if (isDev) {
      console.log(`[Audit] ${action}`, auditData);
    }
    
    // TODO: In production, send to proper audit logging service
    // Examples: AWS CloudWatch, Datadog, Splunk, etc.
    // For now, we use console in production as fallback
    if (isProd) {
      console.log(`[Audit] ${action}`, auditData);
    }
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
