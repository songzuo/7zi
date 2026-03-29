/**
 * 生产环境日志配置
 * 
 * 提供统一的日志管理，包括：
 * - 日志级别控制
 * - 结构化日志输出
 * - 错误报告
 * - 性能监控
 * 
 * @version 1.0.0
 * @date 2026-03-28
 */

// ============================================
// 日志级别定义
// ============================================
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// ============================================
// 日志配置
// ============================================
interface LogConfig {
  level: LogLevel;
  format: 'json' | 'text';
  includeTimestamp: boolean;
  includeContext: boolean;
  sanitizeSensitiveData: boolean;
  enableRemoteLogging: boolean;
  remoteEndpoint?: string;
}

const DEFAULT_CONFIG: LogConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) || 
         (process.env.NODE_ENV === 'production' ? 'warn' : 'debug'),
  format: process.env.NODE_ENV === 'production' ? 'json' : 'text',
  includeTimestamp: true,
  includeContext: true,
  sanitizeSensitiveData: true,
  enableRemoteLogging: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.LOG_ENDPOINT,
};

// ============================================
// 敏感数据过滤
// ============================================
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'session',
  'privateKey',
  'private_key',
];

function sanitizeData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ============================================
// Logger 类
// ============================================
export class Logger {
  private context: string;
  private config: LogConfig;

  constructor(context: string, config?: Partial<LogConfig>) {
    this.context = context;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.level];
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): string | object {
    const timestamp = new Date().toISOString();
    const logData = this.config.sanitizeSensitiveData ? sanitizeData(data) : data;

    const errorInfo = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    } : {};

    const prodInfo = process.env.NODE_ENV === 'production' ? {
      env: process.env.NODE_ENV,
      version: process.env.npm_package_version,
    } : {};

    const logObject: Record<string, unknown> = {
      timestamp,
      level,
      context: this.context,
      message,
      ...(logData && typeof logData === 'object' ? { data: logData } : {}),
      ...errorInfo,
      ...prodInfo,
    };

    if (this.config.format === 'json') {
      return logObject;
    }

    // 文本格式
    const parts = [
      `[${timestamp}]`,
      `[${level.toUpperCase()}]`,
      `[${this.context}]`,
      message,
    ];

    if (logData) {
      parts.push(JSON.stringify(logData, null, 2));
    }

    if (error) {
      parts.push(`\nError: ${error.message}`);
      if (error.stack) {
        parts.push(`\nStack: ${error.stack}`);
      }
    }

    return parts.join(' ');
  }

  private async log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): Promise<void> {
    if (!this.shouldLog(level)) {
      return;
    }

    const formatted = this.formatMessage(level, message, data, error);

    // 控制台输出
    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
      case 'fatal':
        console.error(formatted);
        break;
    }

    // 远程日志 (生产环境)
    if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
      try {
        await fetch(this.config.remoteEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formatted),
        }).catch(() => {
          // 静默失败，避免日志循环
        });
      } catch {
        // 静默失败
      }
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log('error', message, data, error);
  }

  fatal(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log('fatal', message, data, error);
  }

  // 性能计时器
  time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.debug(`Timer [${label}]`, { duration: `${duration}ms` });
    };
  }

  // 创建子 Logger
  child(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`, this.config);
  }
}

// ============================================
// 全局 Logger 实例
// ============================================
export const logger = new Logger('app');

// ============================================
// 便捷导出
// ============================================
export function createLogger(context: string, config?: Partial<LogConfig>): Logger {
  return new Logger(context, config);
}

export default logger;
