/**
 * Log Collector - v1.10.0
 * 日志收集器基类和实现
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import type {
  LogEntry,
  LogSource,
  LogCollectorConfig,
  ILogCollector,
  CollectorStatus,
  CollectorStats,
  LogSourceType,
  LogEvent,
  LogEventListener,
} from '../types.js';

/**
 * 日志收集器基类
 */
export abstract class BaseLogCollector extends EventEmitter implements ILogCollector {
  protected _isRunning = false;
  protected _startTime?: Date;
  protected _errorCount = 0;
  protected _lastError?: string;
  protected _totalCollected = 0;
  protected _lastHourCount = 0;
  protected _lastHourReset = Date.now();
  protected _buffer: LogEntry[] = [];
  protected _listeners: LogEventListener[] = [];

  constructor(
    public readonly id: string,
    public readonly type: LogSourceType,
    public readonly config: LogCollectorConfig
  ) {
    super();
    this.setMaxListeners(100);
  }

  /**
   * 启动收集器
   */
  async start(): Promise<void> {
    if (this._isRunning) {
      throw new Error(`Collector ${this.id} is already running`);
    }

    this._isRunning = true;
    this._startTime = new Date();
    this._errorCount = 0;
    this._lastError = undefined;
    this._totalCollected = 0;
    this._lastHourCount = 0;
    this._lastHourReset = Date.now();

    await this.doStart();
    this.emit('started', { id: this.id, type: this.type });
  }

  /**
   * 停止收集器
   */
  async stop(): Promise<void> {
    if (!this._isRunning) {
      return;
    }

    this._isRunning = false;
    
    // Flush remaining buffer
    if (this._buffer.length > 0) {
      await this.flushBuffer();
    }

    await this.doStop();
    this.emit('stopped', { id: this.id, type: this.type });
  }

  /**
   * 收集日志（由子类实现）
   */
  abstract collect(): AsyncGenerator<LogEntry[], void, unknown>;

  /**
   * 获取状态
   */
  getStatus(): CollectorStatus {
    return {
      isRunning: this._isRunning,
      lastCollection: this._startTime,
      errors: this._errorCount,
      lastError: this._lastError,
      uptime: this._startTime ? Date.now() - this._startTime.getTime() : 0,
    };
  }

  /**
   * 获取统计信息
   */
  getStats(): CollectorStats {
    const now = Date.now();
    const hourElapsed = now - this._lastHourReset > 3600000;
    
    if (hourElapsed) {
      this._lastHourCount = 0;
      this._lastHourReset = now;
    }

    const uptime = this._startTime ? Date.now() - this._startTime.getTime() : 0;
    const throughput = uptime > 0 ? (this._totalCollected / (uptime / 1000)) : 0;

    return {
      totalCollected: this._totalCollected,
      totalErrors: this._errorCount,
      avgBatchSize: this._totalCollected > 0 ? this._totalCollected / Math.max(1, this._buffer.length) : 0,
      throughput,
      bufferSize: this._buffer.length,
      lastHourCount: this._lastHourCount,
    };
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
   * 创建日志条目
   */
  protected createLogEntry(
    message: string,
    level: LogEntry['level'],
    metadata: LogEntry['metadata'] = {},
    raw?: string
  ): LogEntry {
    const id = createHash('sha256')
      .update(`${Date.now()}-${Math.random()}-${message}`)
      .digest('hex')
      .substring(0, 16);

    const source: LogSource = {
      type: this.type,
      name: this.config.id,
      host: metadata.host as string,
      service: metadata.service as string,
      environment: metadata.environment as string,
    };

    return {
      id,
      timestamp: new Date(),
      level,
      message,
      source,
      metadata,
      tags: [],
      raw,
    };
  }

  /**
   * 添加到缓冲区
   */
  protected async addToBuffer(entries: LogEntry[]): Promise<void> {
    this._buffer.push(...entries);
    this._totalCollected += entries.length;
    this._lastHourCount += entries.length;

    // Check if buffer should be flushed
    if (this._buffer.length >= this.config.batchSize) {
      await this.flushBuffer();
    }
  }

  /**
   * 刷新缓冲区
   */
  protected async flushBuffer(): Promise<void> {
    if (this._buffer.length === 0) {
      return;
    }

    const entries = [...this._buffer];
    this._buffer = [];

    this.emit('batch', entries);
    await this.emitEvent({
      type: 'log_collected',
      collectorId: this.id,
      count: entries.length,
    });
  }

  /**
   * 处理错误
   */
  protected handleError(error: Error): void {
    this._errorCount++;
    this._lastError = error.message;
    this.emit('error', error);
    this.emitEvent({
      type: 'error',
      component: `collector:${this.id}`,
      error,
    });
  }

  /**
   * 子类实现：启动逻辑
   */
  protected abstract doStart(): Promise<void>;

  /**
   * 子类实现：停止逻辑
   */
  protected abstract doStop(): Promise<void>;
}

/**
 * 文件日志收集器
 */
export class FileLogCollector extends BaseLogCollector {
  private _watcher?: import('fs').FSWatcher;
  private _fileHandle?: import('fs/promises').FileHandle;
  private _currentOffset = 0;
  private _flushTimer?: NodeJS.Timeout;

  constructor(config: LogCollectorConfig) {
    super(config.id, 'file', config);
    
    if (!config.filePath) {
      throw new Error('filePath is required for file collector');
    }
  }

  /**
   * 启动文件收集器
   */
  protected async doStart(): Promise<void> {
    const fs = await import('fs/promises');
    const fsModule = await import('fs');

    // Ensure file exists
    try {
      await fs.access(this.config.filePath!);
    } catch {
      await fs.writeFile(this.config.filePath!, '', 'utf8');
    }

    // Open file for reading
    this._fileHandle = await fs.open(this.config.filePath!, 'r');
    
    // Get current file size
    const stats = await fs.stat(this.config.filePath!);
    this._currentOffset = stats.size;

    // Start watching for changes
    this._watcher = fsModule.watch(this.config.filePath!, async (eventType) => {
      if (eventType === 'change') {
        await this.collectNewLines();
      }
    });

    // Start periodic flush
    this._flushTimer = setInterval(() => {
      this.flushBuffer().catch((error) => this.handleError(error));
    }, this.config.flushInterval);

    // Initial collection
    await this.collectNewLines();
  }

  /**
   * 停止文件收集器
   */
  protected async doStop(): Promise<void> {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = undefined;
    }

    if (this._fileHandle) {
      await this._fileHandle.close();
      this._fileHandle = undefined;
    }

    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = undefined;
    }
  }

  /**
   * 收集新行
   */
  private async collectNewLines(): Promise<void> {
    if (!this._fileHandle) {
      return;
    }

    const fs = await import('fs/promises');
    
    try {
      const stats = await fs.stat(this.config.filePath!);
      
      if (stats.size <= this._currentOffset) {
        return;
      }

      const buffer = Buffer.alloc(stats.size - this._currentOffset);
      const { bytesRead } = await this._fileHandle.read(buffer, 0, buffer.length, this._currentOffset);
      
      if (bytesRead > 0) {
        const content = buffer.toString(this.config.encoding || 'utf8');
        const lines = content.split('\n').filter((line) => line.trim());
        
        const entries: LogEntry[] = [];
        for (const line of lines) {
          const entry = this.parseLine(line);
          if (entry) {
            entries.push(entry);
          }
        }

        if (entries.length > 0) {
          await this.addToBuffer(entries);
        }

        this._currentOffset += bytesRead;
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * 解析日志行
   */
  private parseLine(line: string): LogEntry | null {
    try {
      // Try JSON first
      if (line.startsWith('{')) {
        const json = JSON.parse(line);
        return this.createLogEntry(
          json.message || line,
          json.level || 'info',
          json,
          line
        );
      }

      // Simple text parsing
      const levelMatch = line.match(/\b(trace|debug|info|warn|error|fatal)\b/i);
      const level = (levelMatch?.[1]?.toLowerCase() || 'info') as LogEntry['level'];

      return this.createLogEntry(line, level, {}, line);
    } catch {
      return this.createLogEntry(line, 'info', {}, line);
    }
  }

  /**
   * 收集日志（同步生成器）
   */
  async *collect(): AsyncGenerator<LogEntry[], void, unknown> {
    while (this._isRunning) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      if (this._buffer.length > 0) {
        const entries = [...this._buffer];
        this._buffer = [];
        yield entries;
      }
    }
  }
}

/**
 * HTTP 日志收集器
 */
export class HttpLogCollector extends BaseLogCollector {
  private _server?: import('http').Server;
  private _flushTimer?: NodeJS.Timeout;

  constructor(config: LogCollectorConfig) {
    super(config.id, 'http', config);
  }

  /**
   * 启动 HTTP 收集器
   */
  protected async doStart(): Promise<void> {
    const http = await import('http');

    this._server = http.createServer(async (req, res) => {
      try {
        if (req.method === 'POST' && req.url === '/logs') {
          const body = await this.readRequestBody(req);
          const entries = this.parseRequestBody(body);
          
          await this.addToBuffer(entries);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, received: entries.length }));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } catch (error) {
        this.handleError(error as Error);
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });

    await new Promise<void>((resolve, reject) => {
      this._server!.listen(3000, () => {
        resolve();
      });
      this._server!.on('error', reject);
    });

    // Start periodic flush
    this._flushTimer = setInterval(() => {
      this.flushBuffer().catch((error) => this.handleError(error));
    }, this.config.flushInterval);
  }

  /**
   * 停止 HTTP 收集器
   */
  protected async doStop(): Promise<void> {
    if (this._server) {
      await new Promise<void>((resolve) => {
        this._server!.close(() => resolve());
      });
      this._server = undefined;
    }

    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = undefined;
    }
  }

  /**
   * 读取请求体
   */
  private async readRequestBody(req: import('http').IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks).toString()));
      req.on('error', reject);
    });
  }

  /**
   * 解析请求体
   */
  private parseRequestBody(body: string): LogEntry[] {
    try {
      const data = JSON.parse(body);
      
      if (Array.isArray(data)) {
        return data.map((item) => this.createLogEntry(
          item.message || JSON.stringify(item),
          item.level || 'info',
          item,
          JSON.stringify(item)
        ));
      } else {
        return [this.createLogEntry(
          data.message || body,
          data.level || 'info',
          data,
          body
        )];
      }
    } catch {
      return [this.createLogEntry(body, 'info', {}, body)];
    }
  }

  /**
   * 收集日志（同步生成器）
   */
  async *collect(): AsyncGenerator<LogEntry[], void, unknown> {
    while (this._isRunning) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      if (this._buffer.length > 0) {
        const entries = [...this._buffer];
        this._buffer = [];
        yield entries;
      }
    }
  }
}

/**
 * Stdout 日志收集器
 */
export class StdoutLogCollector extends BaseLogCollector {
  private _flushTimer?: NodeJS.Timeout;

  constructor(config: LogCollectorConfig) {
    super(config.id, 'stdout', config);
  }

  /**
   * 启动 Stdout 收集器
   */
  protected async doStart(): Promise<void> {
    // Hook into console methods
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };

    const capture = (level: LogEntry['level'], method: typeof console.log) => {
      return (...args: unknown[]) => {
        const message = args.map((arg) => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');

        const entry = this.createLogEntry(message, level, {
          args: args.map((arg) => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ),
        });

        this.addToBuffer([entry]).catch((error) => this.handleError(error));
        
        // Call original method
        method.apply(console, args);
      };
    };

    console.log = capture('info', originalConsole.log);
    console.error = capture('error', originalConsole.error);
    console.warn = capture('warn', originalConsole.warn);
    console.info = capture('info', originalConsole.info);
    console.debug = capture('debug', originalConsole.debug);

    // Start periodic flush
    this._flushTimer = setInterval(() => {
      this.flushBuffer().catch((error) => this.handleError(error));
    }, this.config.flushInterval);
  }

  /**
   * 停止 Stdout 收集器
   */
  protected async doStop(): Promise<void> {
    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = undefined;
    }
  }

  /**
   * 收集日志（同步生成器）
   */
  async *collect(): AsyncGenerator<LogEntry[], void, unknown> {
    while (this._isRunning) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      if (this._buffer.length > 0) {
        const entries = [...this._buffer];
        this._buffer = [];
        yield entries;
      }
    }
  }
}

/**
 * 收集器工厂
 */
export class LogCollectorFactory {
  /**
   * 创建收集器
   */
  static create(config: LogCollectorConfig): ILogCollector {
    switch (config.type) {
      case 'file':
        return new FileLogCollector(config);
      case 'http':
        return new HttpLogCollector(config);
      case 'stdout':
        return new StdoutLogCollector(config);
      default:
        throw new Error(`Unsupported collector type: ${config.type}`);
    }
  }

  /**
   * 批量创建收集器
   */
  static createMany(configs: LogCollectorConfig[]): ILogCollector[] {
    return configs.map((config) => this.create(config));
  }
}