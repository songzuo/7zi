/**
 * Log Parser - v1.10.0
 * 日志解析器实现
 */

import type {
  LogEntry,
  LogParserConfig,
  ILogParser,
  ParsedLogData,
  LogFormatType,
  LogLevel,
  LogEvent,
  LogEventListener,
} from '../types.js';

/**
 * 日志解析器基类
 */
export abstract class BaseLogParser implements ILogParser {
  protected _listeners: LogEventListener[] = [];

  constructor(
    public readonly config: LogParserConfig
  ) {}

  /**
   * 获取日志格式类型
   */
  get type(): LogFormatType {
    return this.config.type;
  }

  /**
   * 解析日志
   */
  abstract parse(raw: string): Promise<ParsedLogData | null>;

  /**
   * 检测日志格式
   */
  abstract detectFormat(raw: string): LogFormatType | null;

  /**
   * 验证解析结果
   */
  validate(parsed: ParsedLogData): boolean {
    return (
      parsed.confidence > 0.5 &&
      parsed.fields !== null &&
      typeof parsed.fields === 'object'
    );
  }

  /**
   * 添加事件监听器
   */
  addEventListener(listener: LogEventListener): void {
    this._listeners.push(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: LogEventListener): void {
    const index = this._listeners.indexOf(listener);
    if (index > -1) {
      this._listeners.splice(index, 1);
    }
  }

  /**
   * 触发事件
   */
  protected async emitEvent(event: LogEvent): Promise<void> {
    for (const listener of this._listeners) {
      try {
        await listener(event);
      } catch (error) {
        console.error(`Error in event listener:`, error);
      }
    }
  }

  /**
   * 提取日志级别
   */
  protected extractLevel(text: string): LogLevel | undefined {
    const levelMatch = text.match(/\b(trace|debug|info|warn|error|fatal)\b/i);
    if (levelMatch) {
      const level = levelMatch[1].toLowerCase();
      if (this.config.levelMapping) {
        return this.config.levelMapping[level] || (level as LogLevel);
      }
      return level as LogLevel;
    }
    return undefined;
  }

  /**
   * 提取时间戳
   */
  protected extractTimestamp(text: string): Date | undefined {
    // ISO 8601
    const isoMatch = text.match(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/);
    if (isoMatch) {
      const date = new Date(isoMatch[0]);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Unix timestamp
    const unixMatch = text.match(/\b\d{10}(?:\d{3})?\b/);
    if (unixMatch) {
      const timestamp = parseInt(unixMatch[0], 10);
      const date = new Date(unixMatch[0].length === 10 ? timestamp * 1000 : timestamp);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Common log format
    const commonMatch = text.match(/\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2}/);
    if (commonMatch) {
      const date = new Date(commonMatch[0]);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return undefined;
  }

  /**
   * 提取消息
   */
  protected extractMessage(text: string, fields: Record<string, unknown>): string {
    // Remove timestamp and level from text
    let message = text;
    
    const timestamp = this.extractTimestamp(text);
    if (timestamp) {
      message = message.replace(timestamp.toISOString(), '').replace(timestamp.toISOString().replace('T', ' '), '');
    }

    const level = this.extractLevel(text);
    if (level) {
      message = message.replace(new RegExp(level, 'gi'), '');
    }

    // Remove common prefixes
    message = message.replace(/^\s*[\[\]\(\)\{\}]+\s*/, '');
    message = message.replace(/^\s*-\s*/, '');
    message = message.trim();

    return message || text;
  }
}

/**
 * JSON 日志解析器
 */
export class JsonLogParser extends BaseLogParser {
  async parse(raw: string): Promise<ParsedLogData | null> {
    try {
      const json = JSON.parse(raw);
      
      if (typeof json !== 'object' || json === null) {
        return null;
      }

      const fields: Record<string, unknown> = {};
      
      // Apply field mapping
      if (this.config.fieldMapping) {
        for (const [source, target] of Object.entries(this.config.fieldMapping)) {
          if (source in json) {
            fields[target] = json[source];
          }
        }
      } else {
        Object.assign(fields, json);
      }

      const timestamp = this.extractTimestampFromJson(json);
      const level = this.extractLevelFromJson(json);
      const message = this.extractMessageFromJson(json);

      const result: ParsedLogData = {
        fields,
        timestamp,
        level,
        message,
        parser: 'json',
        confidence: 0.95,
      };

      await this.emitEvent({
        type: 'log_parsed',
        parserType: 'json',
        count: 1,
      });

      return result;
    } catch {
      return null;
    }
  }

  detectFormat(raw: string): LogFormatType | null {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {
        return null;
      }
    }
    return null;
  }

  private extractTimestampFromJson(json: Record<string, unknown>): Date | undefined {
    const timestampFields = ['timestamp', 'time', '@timestamp', 'date', 'datetime'];
    
    for (const field of timestampFields) {
      if (field in json) {
        const value = json[field];
        if (typeof value === 'string') {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date;
          }
        } else if (typeof value === 'number') {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    }

    return undefined;
  }

  private extractLevelFromJson(json: Record<string, unknown>): LogLevel | undefined {
    const levelFields = ['level', 'severity', 'priority', 'log_level'];
    
    for (const field of levelFields) {
      if (field in json) {
        const value = json[field];
        if (typeof value === 'string') {
          const level = value.toLowerCase();
          if (this.config.levelMapping) {
            return this.config.levelMapping[level];
          }
          if (['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(level)) {
            return level as LogLevel;
          }
        }
      }
    }

    return undefined;
  }

  private extractMessageFromJson(json: Record<string, unknown>): string | undefined {
    const messageFields = ['message', 'msg', 'text', 'description'];
    
    for (const field of messageFields) {
      if (field in json) {
        const value = json[field];
        if (typeof value === 'string') {
          return value;
        }
      }
    }

    return undefined;
  }
}

/**
 * Nginx 日志解析器
 */
export class NginxLogParser extends BaseLogParser {
  private readonly defaultPattern = 
    /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+"(\S+ \S+ \S+)"\s+(\d+)\s+(\d+)\s+"([^"]*)"\s+"([^"]*)"/;

  async parse(raw: string): Promise<ParsedLogData | null> {
    const pattern = this.config.pattern || this.defaultPattern;
    const regex = new RegExp(pattern);
    const match = raw.match(regex);

    if (!match) {
      return null;
    }

    const fields: Record<string, unknown> = {
      remote_addr: match[1],
      remote_user: match[2],
      time_local: match[3],
      request: match[4],
      status: match[5],
      body_bytes_sent: match[6],
      http_referer: match[7],
      http_user_agent: match[8],
    };

    // Parse status
    if (fields.status && typeof fields.status === 'string') {
      fields.status = parseInt(fields.status, 10);
    }

    // Parse body bytes sent
    if (fields.body_bytes_sent && typeof fields.body_bytes_sent === 'string') {
      fields.body_bytes_sent = parseInt(fields.body_bytes_sent, 10);
    }

    // Extract timestamp
    const timestamp = this.extractTimestamp(raw);

    // Determine level based on status
    let level: LogLevel = 'info';
    const status = fields.status as number;
    if (status >= 500) {
      level = 'error';
    } else if (status >= 400) {
      level = 'warn';
    }

    const result: ParsedLogData = {
      fields,
      timestamp,
      level,
      message: `${fields.method} ${fields.path} - ${fields.status}`,
      parser: 'nginx',
      confidence: 0.9,
    };

    await this.emitEvent({
      type: 'log_parsed',
      parserType: 'nginx',
      count: 1,
    });

    return result;
  }

  detectFormat(raw: string): LogFormatType | null {
    // Check for Nginx common log format
    const nginxPattern = /^\S+\s+\S+\s+\[[^\]]+\]\s+"\S+ \S+ \S+"\s+\d+\s+\d+/;
    if (nginxPattern.test(raw)) {
      return 'nginx';
    }
    return null;
  }
}

/**
 * Apache 日志解析器
 */
export class ApacheLogParser extends BaseLogParser {
  private readonly defaultPattern = 
    /^(\S+)\s+(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+"(\S+ \S+ \S+)"\s+(\d+)\s+(\d+)/;

  async parse(raw: string): Promise<ParsedLogData | null> {
    const pattern = this.config.pattern || this.defaultPattern;
    const regex = new RegExp(pattern);
    const match = raw.match(regex);

    if (!match) {
      return null;
    }

    const fields: Record<string, unknown> = {
      remote_addr: match[1],
      remote_logname: match[2],
      remote_user: match[3],
      time_local: match[4],
      request: match[5],
      status: match[6],
      body_bytes_sent: match[7],
    };

    // Parse request
    if (fields.request && typeof fields.request === 'string') {
      const requestParts = fields.request.split(' ');
      fields.method = requestParts[0];
      fields.path = requestParts[1];
      fields.protocol = requestParts[2];
    }

    // Parse status
    if (fields.status && typeof fields.status === 'string') {
      fields.status = parseInt(fields.status, 10);
    }

    // Parse body bytes sent
    if (fields.body_bytes_sent && typeof fields.body_bytes_sent === 'string') {
      fields.body_bytes_sent = parseInt(fields.body_bytes_sent, 10);
    }

    // Extract timestamp
    const timestamp = this.extractTimestamp(raw);

    // Determine level based on status
    let level: LogLevel = 'info';
    const status = fields.status as number;
    if (status >= 500) {
      level = 'error';
    } else if (status >= 400) {
      level = 'warn';
    }

    const result: ParsedLogData = {
      fields,
      timestamp,
      level,
      message: `${fields.method} ${fields.path} - ${fields.status}`,
      parser: 'apache',
      confidence: 0.9,
    };

    await this.emitEvent({
      type: 'log_parsed',
      parserType: 'apache',
      count: 1,
    });

    return result;
  }

  detectFormat(raw: string): LogFormatType | null {
    // Check for Apache common log format
    const apachePattern = /^\S+\s+\S+\s+\S+\s+\[[^\]]+\]\s+"\S+ \S+ \S+"\s+\d+\s+\d+/;
    if (apachePattern.test(raw)) {
      return 'apache';
    }
    return null;
  }
}

/**
 * 应用日志解析器
 */
export class ApplicationLogParser extends BaseLogParser {
  private readonly defaultPattern = 
    /^\[([^\]]+)\]\s+\[(\w+)\]\s+\[([^\]]+)\]\s+(.*)/;

  async parse(raw: string): Promise<ParsedLogData | null> {
    const pattern = this.config.pattern || this.defaultPattern;
    const regex = new RegExp(pattern);
    const match = raw.match(regex);

    const fields: Record<string, unknown> = {};

    if (match) {
      fields.timestamp = match[1];
      fields.level = match[2];
      fields.logger = match[3];
      fields.message = match[4];

      // Parse timestamp
      const timestamp = this.extractTimestamp(raw);
      
      // Parse level
      const level = this.extractLevel(raw);

      const result: ParsedLogData = {
        fields,
        timestamp,
        level,
        message: fields.message as string,
        parser: 'application',
        confidence: 0.85,
      };

      await this.emitEvent({
        type: 'log_parsed',
        parserType: 'application',
        count: 1,
      });

      return result;
    }

    // Fallback: try to extract basic information
    const timestamp = this.extractTimestamp(raw);
    const level = this.extractLevel(raw);
    const message = this.extractMessage(raw, fields);

    const result: ParsedLogData = {
      fields,
      timestamp,
      level,
      message,
      parser: 'application',
      confidence: 0.6,
    };

    await this.emitEvent({
      type: 'log_parsed',
      parserType: 'application',
      count: 1,
    });

    return result;
  }

  detectFormat(raw: string): LogFormatType | null {
    // Check for common application log patterns
    const appPatterns = [
      /^\[[^\]]+\]\s+\[\w+\]/, // [timestamp] [level]
      /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+\s+\w+/, // timestamp level
      /^\w+\s+\d+\s+\d{2}:\d{2}:\d{2}\s+\w+/, // Mon DD HH:MM:SS level
    ];

    for (const pattern of appPatterns) {
      if (pattern.test(raw)) {
        return 'application';
      }
    }

    return null;
  }
}

/**
 * 自定义正则解析器
 */
export class CustomRegexParser extends BaseLogParser {
  async parse(raw: string): Promise<ParsedLogData | null> {
    if (!this.config.customRegex) {
      return null;
    }

    const regex = new RegExp(this.config.customRegex);
    const match = raw.match(regex);

    if (!match) {
      return null;
    }

    const fields: Record<string, unknown> = {};

    // Extract named groups if available
    if (match.groups) {
      for (const [key, value] of Object.entries(match.groups)) {
        fields[key] = value;
      }
    }

    // Extract timestamp
    const timestamp = this.extractTimestamp(raw);

    // Extract level
    const level = this.extractLevel(raw);

    // Extract message
    const message = this.extractMessage(raw, fields);

    const result: ParsedLogData = {
      fields,
      timestamp,
      level,
      message,
      parser: 'custom',
      confidence: 0.8,
    };

    await this.emitEvent({
      type: 'log_parsed',
      parserType: 'custom',
      count: 1,
    });

    return result;
  }

  detectFormat(raw: string): LogFormatType | null {
    if (!this.config.customRegex) {
      return null;
    }

    const regex = new RegExp(this.config.customRegex);
    return regex.test(raw) ? 'custom' : null;
  }
}

/**
 * 解析器工厂
 */
export class LogParserFactory {
  private static _parsers: Map<LogFormatType, ILogParser> = new Map();

  /**
   * 创建解析器
   */
  static create(config: LogParserConfig): ILogParser {
    switch (config.type) {
      case 'json':
        return new JsonLogParser(config);
      case 'nginx':
        return new NginxLogParser(config);
      case 'apache':
        return new ApacheLogParser(config);
      case 'application':
        return new ApplicationLogParser(config);
      case 'custom':
        return new CustomRegexParser(config);
      default:
        throw new Error(`Unsupported parser type: ${config.type}`);
    }
  }

  /**
   * 批量创建解析器
   */
  static createMany(configs: LogParserConfig[]): ILogParser[] {
    return configs.map((config) => this.create(config));
  }

  /**
   * 自动检测格式
   */
  static detectFormat(raw: string): LogFormatType | null {
    const parsers = [
      new JsonLogParser({ type: 'json', enabled: true }),
      new NginxLogParser({ type: 'nginx', enabled: true }),
      new ApacheLogParser({ type: 'apache', enabled: true }),
      new ApplicationLogParser({ type: 'application', enabled: true }),
    ];

    for (const parser of parsers) {
      const format = parser.detectFormat(raw);
      if (format) {
        return format;
      }
    }

    return null;
  }

  /**
   * 智能解析（自动检测格式并解析）
   */
  static async parse(raw: string): Promise<ParsedLogData | null> {
    const format = this.detectFormat(raw);
    if (!format) {
      return null;
    }

    const parser = this.create({ type: format, enabled: true });
    return parser.parse(raw);
  }
}