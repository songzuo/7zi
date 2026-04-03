/**
 * OpenClaw Workflow Engine v1.11.0
 * Logger Interface and Implementation
 */

import winston from 'winston';

/**
 * 日志级别
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

/**
 * 日志上下文
 */
export interface ILogContext {
  [key: string]: any;
}

/**
 * Logger 接口
 */
export interface ILogger {
  error(message: string, context?: ILogContext): void;
  warn(message: string, context?: ILogContext): void;
  info(message: string, context?: ILogContext): void;
  debug(message: string, context?: ILogContext): void;
  verbose(message: string, context?: ILogContext): void;
}

/**
 * Winston Logger 实现
 */
export class WinstonLogger implements ILogger {
  private logger: winston.Logger;

  constructor(options?: {
    level?: LogLevel;
    service?: string;
    transports?: winston.transport[];
  }) {
    const level = options?.level || LogLevel.INFO;
    const service = options?.service || 'openclaw-workflow';

    const transports = options?.transports || [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, ...context }) => {
            const ctxStr = Object.keys(context).length > 0 
              ? JSON.stringify(context, null, 2) 
              : '';
            return `${timestamp} [${level}] ${message} ${ctxStr}`;
          })
        )
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    ];

    this.logger = winston.createLogger({
      level,
      defaultMeta: { service },
      transports
    });
  }

  error(message: string, context?: ILogContext): void {
    this.logger.error(message, context);
  }

  warn(message: string, context?: ILogContext): void {
    this.logger.warn(message, context);
  }

  info(message: string, context?: ILogContext): void {
    this.logger.info(message, context);
  }

  debug(message: string, context?: ILogContext): void {
    this.logger.debug(message, context);
  }

  verbose(message: string, context?: ILogContext): void {
    this.logger.verbose(message, context);
  }

  /**
   * 创建子 Logger
   */
  child(defaultContext: ILogContext): ILogger {
    const childLogger = this.logger.child(defaultContext);
    return {
      error: (message: string, context?: ILogContext) => 
        childLogger.error(message, context),
      warn: (message: string, context?: ILogContext) => 
        childLogger.warn(message, context),
      info: (message: string, context?: ILogContext) => 
        childLogger.info(message, context),
      debug: (message: string, context?: ILogContext) => 
        childLogger.debug(message, context),
      verbose: (message: string, context?: ILogContext) => 
        childLogger.verbose(message, context)
    };
  }
}

/**
 * 创建默认 Logger
 */
export function createLogger(options?: {
  level?: LogLevel;
  service?: string;
}): ILogger {
  return new WinstonLogger(options);
}