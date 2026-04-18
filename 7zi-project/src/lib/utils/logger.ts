/**
 * Logger - 统一的日志工具
 *
 * 提供结构化的日志接口，支持日志级别控制
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * 日志选项
 */
export interface LoggerOptions {
  /** 日志名称，用于标识日志来源 */
  name: string
  /** 最小日志级别，低于此级别的日志不会输出 */
  level?: LogLevel
  /** 是否启用时间戳 */
  timestamp?: boolean
  /** 自定义输出函数 */
  output?: (level: LogLevel, name: string, args: unknown[]) => void
}

/**
 * 默认输出函数
 */
function defaultOutput(level: LogLevel, name: string, args: unknown[]): void {
  const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR']
  const levelName = levelNames[level]
  const prefix = `[${name}]`

  switch (level) {
    case LogLevel.DEBUG:
      console.debug(prefix, ...args)
      break
    case LogLevel.INFO:
      console.info(prefix, ...args)
      break
    case LogLevel.WARN:
      console.warn(prefix, ...args)
      break
    case LogLevel.ERROR:
      console.error(prefix, ...args)
      break
  }
}

/**
 * Logger 类
 */
export class Logger {
  private name: string
  private level: LogLevel
  private timestamp: boolean
  private output: (level: LogLevel, name: string, args: unknown[]) => void

  constructor(options: LoggerOptions) {
    this.name = options.name
    this.level = options.level ?? LogLevel.INFO
    this.timestamp = options.timestamp ?? false
    this.output = options.output ?? defaultOutput
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.level
  }

  /**
   * 输出 DEBUG 级别日志
   */
  debug(...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      const outputArgs = this.timestamp ? [new Date().toISOString(), ...args] : args
      this.output(LogLevel.DEBUG, this.name, outputArgs)
    }
  }

  /**
   * 输出 INFO 级别日志
   */
  info(...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      const outputArgs = this.timestamp ? [new Date().toISOString(), ...args] : args
      this.output(LogLevel.INFO, this.name, outputArgs)
    }
  }

  /**
   * 输出 WARN 级别日志
   */
  warn(...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      const outputArgs = this.timestamp ? [new Date().toISOString(), ...args] : args
      this.output(LogLevel.WARN, this.name, outputArgs)
    }
  }

  /**
   * 输出 ERROR 级别日志
   */
  error(...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      const outputArgs = this.timestamp ? [new Date().toISOString(), ...args] : args
      this.output(LogLevel.ERROR, this.name, outputArgs)
    }
  }

  /**
   * 创建子 Logger
   * @param suffix 子 Logger 名称后缀
   */
  child(suffix: string): Logger {
    return new Logger({
      name: `${this.name}:${suffix}`,
      level: this.level,
      timestamp: this.timestamp,
      output: this.output,
    })
  }
}

/**
 * 创建 Logger 实例
 */
export function createLogger(name: string, level?: LogLevel): Logger {
  return new Logger({ name, level })
}

/**
 * 全局日志级别
 */
let globalLogLevel: LogLevel = LogLevel.INFO

/**
 * 设置全局日志级别
 */
export function setGlobalLogLevel(level: LogLevel): void {
  globalLogLevel = level
}

/**
 * 获取全局日志级别
 */
export function getGlobalLogLevel(): LogLevel {
  return globalLogLevel
}

/**
 * 创建带全局日志级别的 Logger
 */
export function createLoggerWithGlobalLevel(name: string): Logger {
  return new Logger({ name, level: globalLogLevel })
}

export default Logger
