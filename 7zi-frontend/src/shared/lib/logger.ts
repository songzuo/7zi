/**
 * Logger Utility
 *
 * 提供统一的日志记录功能，支持不同日志级别、格式化和输出目标
 */

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * 日志级别名称映射
 */
const LogLevelNames: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
};

/**
 * 日志级别颜色映射（用于控制台输出）
 */
const LogLevelColors: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[36m', // Cyan
  [LogLevel.INFO]: '\x1b[32m', // Green
  [LogLevel.WARN]: '\x1b[33m', // Yellow
  [LogLevel.ERROR]: '\x1b[31m', // Red
  [LogLevel.FATAL]: '\x1b[35m', // Magenta
};

/**
 * 重置颜色
 */
const ResetColor = '\x1b[0m';

/**
 * 日志条目接口
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
  stack?: string;
}

/**
 * 日志传输接口
 */
export interface LogTransport {
  name: string;
  log(entry: LogEntry): void | Promise<void>;
}

/**
 * 控制台传输
 */
export class ConsoleTransport implements LogTransport {
  name = 'console';

  constructor(
    private options: {
      colorize?: boolean;
      includeTimestamp?: boolean;
      includeContext?: boolean;
    } = {}
  ) {
    this.options = {
      colorize: true,
      includeTimestamp: true,
      includeContext: true,
      ...options,
    };
  }

  log(entry: LogEntry): void {
    const { colorize, includeTimestamp, includeContext } = this.options;
    const levelName = LogLevelNames[entry.level];
    const color = colorize ? LogLevelColors[entry.level] : '';
    const reset = colorize ? ResetColor : '';

    let output = '';

    // 添加时间戳
    if (includeTimestamp) {
      output += `[${entry.timestamp.toISOString()}] `;
    }

    // 添加日志级别
    output += `${color}[${levelName}]${reset} `;

    // 添加消息
    output += `${entry.message}`;

    // 添加上下文
    if (includeContext && entry.context && Object.keys(entry.context).length > 0) {
      output += ` ${JSON.stringify(entry.context)}`;
    }

    // 添加错误信息
    if (entry.error) {
      output += `\n  Error: ${entry.error.message}`;
      if (entry.stack) {
        output += `\n  Stack: ${entry.stack}`;
      }
    }

    // 根据日志级别输出到不同的控制台方法
    switch (entry.level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output);
        break;
    }
  }
}

/**
 * 内存传输（用于测试）
 */
export class MemoryTransport implements LogTransport {
  name = 'memory';
  logs: LogEntry[] = [];

  log(entry: LogEntry): void {
    this.logs.push(entry);
  }

  clear(): void {
    this.logs = [];
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  getLastLog(): LogEntry | undefined {
    return this.logs[this.logs.length - 1];
  }
}

/**
 * 过滤传输（包装其他传输以过滤日志）
 */
export class FilterTransport implements LogTransport {
  name = 'filter';

  constructor(
    private transport: LogTransport,
    private minLevel: LogLevel
  ) {
    this.name = `filter(${transport.name}, ${LogLevelNames[minLevel]})`;
  }

  log(entry: LogEntry): void | Promise<void> {
    if (entry.level >= this.minLevel) {
      return this.transport.log(entry);
    }
  }
}

/**
 * Logger 类
 */
export class Logger {
  private transports: LogTransport[] = [];
  private level: LogLevel = LogLevel.INFO;
  private context: Record<string, unknown> = {};

  constructor(options?: {
    level?: LogLevel;
    context?: Record<string, unknown>;
    transports?: LogTransport[];
  }) {
    if (options) {
      if (options.level !== undefined) {
        this.level = options.level;
      }
      if (options.context) {
        this.context = { ...options.context };
      }
      if (options.transports) {
        this.transports = [...options.transports];
      }
    }

    // 默认添加控制台传输
    if (this.transports.length === 0) {
      this.addTransport(new ConsoleTransport());
    }
  }

  /**
   * 添加日志传输
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  /**
   * 移除日志传输
   */
  removeTransport(transportName: string): void {
    this.transports = this.transports.filter(t => t.name !== transportName);
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * 添加上下文
   */
  addContext(context: Record<string, unknown>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * 清除上下文
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * 创建子 Logger（继承上下文）
   */
  child(context: Record<string, unknown>): Logger {
    const childLogger = new Logger({
      level: this.level,
      context: { ...this.context, ...context },
      transports: this.transports,
    });
    return childLogger;
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: Object.keys(this.context).length > 0 || (context && Object.keys(context).length > 0)
        ? { ...this.context, ...context }
        : undefined,
      error,
      stack: error?.stack,
    };

    for (const transport of this.transports) {
      try {
        transport.log(entry);
      } catch (err) {
        // 防止日志传输中的错误导致应用崩溃
        console.error('Error in log transport:', err);
      }
    }
  }

  /**
   * DEBUG 级别日志
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * INFO 级别日志
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * WARN 级别日志
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * ERROR 级别日志
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * FATAL 级别日志
   */
  fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, context, error);
  }
}

/**
 * 默认 Logger 实例
 */
export const logger = new Logger();

/**
 * 便捷函数：创建带有上下文的子 Logger
 */
export function createLogger(context: Record<string, unknown>, level?: LogLevel): Logger {
  return logger.child(context);
}
