// Log utility functions extracted from Logger class for reusability
// These can be used standalone or imported by the Logger class

export interface LogEntry {
  level: LogLevel
  category: LogCategory
  message: string
  timestamp: string
  data?: Record<string, unknown>
  error?: Error
  context?: {
    userId?: string
    sessionId?: string
    requestId?: string
    route?: string
    component?: string
  }
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export type LogCategory =
  | 'app'
  | 'api'
  | 'auth'
  | 'db'
  | 'cache'
  | 'perf'
  | 'user'
  | 'system'
  | 'security'
  | 'business'

export interface LoggerConfig {
  minLevel: LogLevel
  enableConsole: boolean
  enableSentry: boolean
  enableRemote: boolean
  remoteEndpoint?: string
  includeContext: boolean
  sanitizeFields: string[]
}

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
}

export const STYLE_PREFIXES: Record<LogLevel, string> = {
  debug: '\x1b[36m[DEBUG]\x1b[0m', // Cyan
  info: '\x1b[32m[INFO]\x1b[0m', // Green
  warn: '\x1b[33m[WARN]\x1b[0m', // Yellow
  error: '\x1b[31m[ERROR]\x1b[0m', // Red
  fatal: '\x1b[35m[FATAL]\x1b[0m', // Magenta
}

/**
 * Create a log entry
 */
export function createLogEntry(
  level: LogLevel,
  category: LogCategory,
  message: string,
  data?: Record<string, unknown>,
  error?: Error,
  context?: LogEntry['context']
): LogEntry {
  return {
    level,
    category,
    message,
    timestamp: new Date().toISOString(),
    data: data ? sanitize(data, []) : undefined,
    error,
    context,
  }
}

/**
 * Sanitize sensitive data from log entries
 */
export function sanitize<T extends Record<string, unknown>>(data: T, sanitizeFields: string[]): T {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()

    const shouldSanitize = sanitizeFields.some(field => lowerKey.includes(field.toLowerCase()))

    if (shouldSanitize) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value as Record<string, unknown>, sanitizeFields)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized as T
}

/**
 * Check if a log level should be logged based on min level
 */
export function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel]
}
