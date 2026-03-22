/**
 * 日志模块 - Logger Module
 * Provides structured logging functionality
 */

// ============================================================================
// Types
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  category?: string;
}

// ============================================================================
// Logger Implementation
// ============================================================================

class Logger {
  private context: LogContext = {};

  /**
   * 设置上下文
   */
  setContext(ctx: LogContext): void {
    this.context = { ...this.context, ...ctx };
  }

  /**
   * 清除上下文
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * 创建子 logger
   */
  child(ctx: LogContext): Logger {
    const child = new Logger();
    child.context = { ...this.context, ...ctx };
    return child;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    // Config update logic
  }

  // ============================================================================
  // Log Methods
  // ============================================================================

  private log(level: LogLevel, message: string, context?: unknown, category?: string): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: context && typeof context === 'object' ? { ...this.context, ...context as LogContext } : this.context,
      category,
    };

    // Console output with colors
    const colors: Record<LogLevel, string> = {
      debug: '\x1b[36m',    // Cyan
      info: '\x1b[32m',     // Green
      warn: '\x1b[33m',     // Yellow
      error: '\x1b[31m',    // Red
      fatal: '\x1b[35m',    // Magenta
    };

    const reset = '\x1b[0m';
    const prefix = colors[level] ? `${colors[level]}[${level.toUpperCase()}]${reset}` : `[${level.toUpperCase()}]`;
    const catPrefix = category ? `[${category}] ` : '';

    console.log(`${prefix} ${catPrefix}${message}`, entry.context || '');
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown): void {
    const context: LogContext | undefined = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error && typeof error === 'object'
      ? error as LogContext
      : undefined;
    this.log('error', message, context);
  }

  fatal(message: string, context?: LogContext): void {
    this.log('fatal', message, context);
  }

  // ============================================================================
  // Category-specific Methods
  // ============================================================================

  api(message: string, context?: LogContext): void {
    this.log('info', message, context, 'api');
  }

  auth(message: string, context?: LogContext): void {
    this.log('info', message, context, 'auth');
  }

  perf(message: string, context?: LogContext): void {
    this.log('debug', message, context, 'perf');
  }

  user(message: string, context?: LogContext): void {
    this.log('info', message, context, 'user');
  }

  security(message: string, context?: LogContext): void {
    this.log('warn', message, context, 'security');
  }

  business(message: string, context?: LogContext): void {
    this.log('info', message, context, 'business');
  }
}

export interface LoggerConfig {
  level: LogLevel;
  pretty: boolean;
  context: LogContext;
}

// ============================================================================
// Singleton Instance
// ============================================================================

const logger = new Logger();

export default logger;
