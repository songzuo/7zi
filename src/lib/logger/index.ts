/**
 * 统一日志系统
 * Unified Logging System
 * 
 * 提供统一的日志接口，支持多输出目标：
 * - Console (开发环境)
 * - Sentry (错误追踪)
 * - 自定义输出 (可扩展)
 */

import * as Sentry from '@sentry/nextjs';

// ============================================
// 类型定义
// ============================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export type LogCategory = 
  | 'app'        // 应用日志
  | 'api'        // API 请求
  | 'auth'       // 认证相关
  | 'db'         // 数据库操作
  | 'cache'      // 缓存操作
  | 'perf'       // 性能指标
  | 'user'       // 用户行为
  | 'system'     // 系统事件
  | 'security'   // 安全事件
  | 'business';  // 业务逻辑

export interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
  error?: Error;
  context?: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    route?: string;
    component?: string;
  };
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableSentry: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  includeContext: boolean;
  sanitizeFields: string[];
}

// ============================================
// 日志级别优先级
// ============================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// ============================================
// 缓存的样式前缀（避免重复创建）
// ============================================

const STYLE_PREFIXES: Record<LogLevel, string> = {
  debug: '\x1b[36m[DEBUG]\x1b[0m',   // Cyan
  info: '\x1b[32m[INFO]\x1b[0m',     // Green
  warn: '\x1b[33m[WARN]\x1b[0m',     // Yellow
  error: '\x1b[31m[ERROR]\x1b[0m',   // Red
  fatal: '\x1b[35m[FATAL]\x1b[0m',   // Magenta
};

// ============================================
// 默认配置
// ============================================

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  enableConsole: process.env.NODE_ENV !== 'test',
  enableSentry: true,
  enableRemote: false,
  includeContext: true,
  sanitizeFields: [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'creditCard',
    'ssn',
  ],
};

// ============================================
// Logger 类
// ============================================

class Logger {
  private config: LoggerConfig;
  private context: LogEntry['context'] = {};

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 设置全局上下文
   */
  setContext(context: Partial<NonNullable<LogEntry['context']>>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * 清除上下文
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * 创建子 Logger（带预设上下文）
   */
  child(context: Partial<NonNullable<LogEntry['context']>>): Logger {
    const childLogger = new Logger(this.config);
    childLogger.setContext({ ...this.context, ...context });
    return childLogger;
  }

  // ============================================
  // 日志方法
  // ============================================

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', 'app', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', 'app', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', 'app', message, data);
  }

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    this.log('error', 'app', message, data, error instanceof Error ? error : undefined);
  }

  fatal(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    this.log('fatal', 'app', message, data, error instanceof Error ? error : undefined);
  }

  // ============================================
  // 分类日志方法
  // ============================================

  api(message: string, data?: Record<string, unknown>, level: LogLevel = 'info'): void {
    this.log(level, 'api', message, data);
  }

  auth(message: string, data?: Record<string, unknown>, level: LogLevel = 'info'): void {
    this.log(level, 'auth', message, data);
  }

  perf(message: string, data?: Record<string, unknown>): void {
    this.log('info', 'perf', message, data);
  }

  user(message: string, data?: Record<string, unknown>): void {
    this.log('info', 'user', message, data);
  }

  security(message: string, data?: Record<string, unknown>, level: LogLevel = 'warn'): void {
    this.log(level, 'security', message, data);
  }

  business(message: string, data?: Record<string, unknown>): void {
    this.log('info', 'business', message, data);
  }

  // ============================================
  // 核心日志方法
  // ============================================

  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): void {
    // 检查日志级别
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      level,
      category,
      message,
      timestamp: new Date().toISOString(),
      data: data ? this.sanitize(data) : undefined,
      error,
      context: this.config.includeContext ? this.context : undefined,
    };

    // 输出到控制台
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // 发送到 Sentry
    if (this.config.enableSentry && (level === 'error' || level === 'fatal')) {
      this.logToSentry(entry);
    }

    // 发送到远程服务
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.logToRemote(entry);
    }
  }

  // ============================================
  // 输出目标
  // ============================================

  private logToConsole(entry: LogEntry): void {
    const styledPrefix = STYLE_PREFIXES[entry.level];

    const logData = entry.data ? { ...entry.data } : {};
    if (entry.context) {
      logData._context = entry.context;
    }

    switch (entry.level) {
      case 'debug':
        console.debug(styledPrefix, entry.message, logData);
        break;
      case 'info':
        console.info(styledPrefix, entry.message, logData);
        break;
      case 'warn':
        console.warn(styledPrefix, entry.message, logData);
        break;
      case 'error':
      case 'fatal':
        console.error(styledPrefix, entry.message, entry.error || '', logData);
        break;
    }
  }

  private logToSentry(entry: LogEntry): void {
    Sentry.withScope((scope) => {
      // 设置标签
      scope.setTag('category', entry.category);
      scope.setTag('level', entry.level);
      scope.setLevel(entry.level === 'fatal' ? 'fatal' : 'error');

      // 设置上下文
      if (entry.context) {
        if (entry.context.userId) {
          scope.setUser({ id: entry.context.userId });
        }
        if (entry.context.requestId) {
          scope.setTag('request_id', entry.context.requestId);
        }
        if (entry.context.route) {
          scope.setTag('route', entry.context.route);
        }
      }

      // 设置额外数据
      if (entry.data) {
        scope.setContext('log_data', entry.data);
      }

      // 添加面包屑
      Sentry.addBreadcrumb({
        message: entry.message,
        category: entry.category,
        level: (entry.level === 'fatal' ? 'error' : entry.level) as Sentry.SeverityLevel,
        data: entry.data,
      });

      // 发送错误
      if (entry.error) {
        Sentry.captureException(entry.error);
      } else {
        Sentry.captureMessage(entry.message, entry.level === 'fatal' ? 'fatal' : 'error');
      }
    });
  }

  private async logToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      // 使用 sendBeacon 或 fetch
      const payload = JSON.stringify(entry);
      
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(this.config.remoteEndpoint, payload);
      } else {
        await fetch(this.config.remoteEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        });
      }
    } catch {
      // 静默失败，避免日志系统本身导致问题
    }
  }

  // ============================================
  // 数据脱敏
  // ============================================

  private sanitize(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // 检查是否需要脱敏
      const shouldSanitize = this.config.sanitizeFields.some(
        (field) => lowerKey.includes(field.toLowerCase())
      );

      if (shouldSanitize) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

// ============================================
// 导出单例
// ============================================

export const logger = new Logger();

// ============================================
// 便捷函数
// ============================================

export const log = {
  debug: (message: string, data?: Record<string, unknown>) => logger.debug(message, data),
  info: (message: string, data?: Record<string, unknown>) => logger.info(message, data),
  warn: (message: string, data?: Record<string, unknown>) => logger.warn(message, data),
  error: (message: string, error?: Error | unknown, data?: Record<string, unknown>) => 
    logger.error(message, error, data),
  fatal: (message: string, error?: Error | unknown, data?: Record<string, unknown>) => 
    logger.fatal(message, error, data),
  api: (message: string, data?: Record<string, unknown>, level?: LogLevel) => 
    logger.api(message, data, level),
  auth: (message: string, data?: Record<string, unknown>, level?: LogLevel) => 
    logger.auth(message, data, level),
  perf: (message: string, data?: Record<string, unknown>) => logger.perf(message, data),
  user: (message: string, data?: Record<string, unknown>) => logger.user(message, data),
  security: (message: string, data?: Record<string, unknown>, level?: LogLevel) => 
    logger.security(message, data, level),
  business: (message: string, data?: Record<string, unknown>) => logger.business(message, data),
};

export default logger;