// @ts-nocheck
/**
 * Logging Plugin
 * Advanced logging with multiple transports and formatters
 */

import {
  Plugin,
  PluginMetadata,
  PluginConfig,
  PluginContext,
  PluginHealthStatus,
  PluginMetrics,
  LogLevel,
  HookHandler,
  HookRegistry,
} from '../../types';

export interface LoggingPluginConfig {
  level: LogLevel;
  format: 'json' | 'text' | 'pretty';
  transports: LogTransport[];
  bufferSize: number;
  flushInterval: number;
}

export interface LogTransport {
  type: 'console' | 'file' | 'http' | 'syslog';
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  pluginId: string;
  message: string;
  meta?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface LogFilterInput {
  level?: LogLevel;
  pluginId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class LoggingPlugin implements Plugin {
  metadata: PluginMetadata = {
    id: '@openclaw/plugin-logging',
    name: 'Logging Plugin',
    version: '1.0.0',
    description: 'Advanced logging with multiple transports and formatters',
    category: 'logging',
    tags: ['logging', 'monitoring', 'debug'],
    author: {
      name: 'OpenClaw Team',
      email: 'team@openclaw.com',
    },
    license: 'MIT',
  };

  config: PluginConfig = {
    id: this.metadata.id,
    enabled: true,
    priority: 100,
    config: {
      level: 'info',
      format: 'json',
      transports: [
        { type: 'console', enabled: true },
      ],
      bufferSize: 1000,
      flushInterval: 5000,
    } as LoggingPluginConfig,
  };

  private context?: PluginContext;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private metrics = {
    totalLogs: 0,
    errorCount: 0,
    warnCount: 0,
    infoCount: 0,
    debugCount: 0,
  };

  /**
   * Initialize plugin
   */
  async init(context: PluginContext): Promise<void> {
    this.context = context;
    context.logger.info('Logging plugin initialized');

    // Start flush timer
    const config = this.config.config as LoggingPluginConfig;
    this.flushTimer = setInterval(
      () => this.flush(),
      config.flushInterval
    );
  }

  /**
   * Start plugin
   */
  async start(): Promise<void> {
    this.context?.logger.info('Logging plugin started');
  }

  /**
   * Stop plugin
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
    this.context?.logger.info('Logging plugin stopped');
  }

  /**
   * Destroy plugin
   */
  async destroy(): Promise<void> {
    this.logBuffer = [];
    this.context?.logger.info('Logging plugin destroyed');
  }

  /**
   * Register hooks
   */
  registerHooks(registry: HookRegistry): void {
    registry.register('onLog', this.handleLog.bind(this) as HookHandler, {
      priority: 100,
    });

    registry.register('onError', this.handleError.bind(this) as HookHandler, {
      priority: 100,
    });
  }

  /**
   * Execute plugin action
   */
  async execute<TInput = unknown, TOutput = unknown>(
    action: string,
    input?: TInput
  ): Promise<TOutput> {
    switch (action) {
      case 'log':
        return this.log(input as Partial<LogEntry>) as TOutput;

      case 'getLogs':
        return this.getLogs(input as LogFilterInput) as TOutput;

      case 'clearLogs':
        return this.clearLogs() as TOutput;

      case 'getStats':
        return this.getStats() as TOutput;

      case 'setLevel':
        return this.setLevel(input as LogLevel) as TOutput;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Log a message
   */
  private log(entry: Partial<LogEntry>): { success: boolean } {
    const config = this.config.config as LoggingPluginConfig;

    // Check log level
    if (!this.shouldLog(entry.level || 'info', config.level)) {
      return { success: false };
    }

    // Create log entry
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level: entry.level || 'info',
      pluginId: entry.pluginId || 'system',
      message: entry.message || '',
      meta: entry.meta,
      context: entry.context,
    };

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Update metrics
    this.metrics.totalLogs++;
    switch (logEntry.level) {
      case 'error':
        this.metrics.errorCount++;
        break;
      case 'warn':
        this.metrics.warnCount++;
        break;
      case 'info':
        this.metrics.infoCount++;
        break;
      case 'debug':
        this.metrics.debugCount++;
        break;
    }

    // Flush if buffer is full
    const bufferSize = config.bufferSize || 1000;
    if (this.logBuffer.length >= bufferSize) {
      this.flush();
    }

    return { success: true };
  }

  /**
   * Get logs
   */
  private getLogs(filter: LogFilterInput): LogEntry[] {
    let logs = [...this.logBuffer];

    if (filter.level) {
      logs = logs.filter((l) => l.level === filter.level);
    }

    if (filter.pluginId) {
      logs = logs.filter((l) => l.pluginId === filter.pluginId);
    }

    if (filter.startDate) {
      logs = logs.filter((l) => l.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      logs = logs.filter((l) => l.timestamp <= filter.endDate!);
    }

    if (filter.limit) {
      logs = logs.slice(-filter.limit);
    }

    return logs;
  }

  /**
   * Clear logs
   */
  private clearLogs(): { success: boolean; count: number } {
    const count = this.logBuffer.length;
    this.logBuffer = [];
    return { success: true, count };
  }

  /**
   * Get statistics
   */
  private getStats(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Set log level
   */
  private setLevel(level: LogLevel): { success: boolean } {
    const config = this.config.config as LoggingPluginConfig;
    config.level = level;
    return { success: true };
  }

  /**
   * Handle log hook
   */
  private handleLog(context: unknown, input: unknown): void {
    this.log({
      level: input.level || 'info',
      pluginId: input.pluginId,
      message: input.message,
      meta: input.meta,
    });
  }

  /**
   * Handle error hook
   */
  private handleError(context: unknown, input: unknown): void {
    this.log({
      level: 'error',
      pluginId: input.pluginId,
      message: input.error?.message || 'Unknown error',
      meta: {
        error: input.error?.stack,
        ...input.meta,
      },
    });
  }

  /**
   * Flush logs to transports
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const config = this.config.config as LoggingPluginConfig;
    const logs = [...this.logBuffer];
    this.logBuffer = [];

    for (const transport of config.transports) {
      if (!transport.enabled) {
        continue;
      }

      try {
        await this.flushToTransport(logs, transport);
      } catch (error) {
        console.error('Failed to flush logs to transport:', error);
      }
    }
  }

  /**
   * Flush logs to a specific transport
   */
  private async flushToTransport(logs: LogEntry[], transport: LogTransport): Promise<void> {
    const config = this.config.config as LoggingPluginConfig;
    const formattedLogs = logs.map((log) => this.formatLog(log, config.format));

    switch (transport.type) {
      case 'console':
        for (const log of formattedLogs) {
          console.log(log);
        }
        break;

      case 'file':
        // Write to file
        const fs = require('fs');
        const path = transport.config?.path || './logs/plugin.log';
        const content = formattedLogs.join('\n') + '\n';
        await fs.promises.appendFile(path, content);
        break;

      case 'http':
        // Send to HTTP endpoint
        await fetch(transport.config?.url || '', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logs),
        });
        break;

      case 'syslog':
        // Send to syslog
        // Implementation would use a syslog library
        break;
    }
  }

  /**
   * Format log entry
   */
  private formatLog(log: LogEntry, format: string): string {
    switch (format) {
      case 'json':
        return JSON.stringify(log);

      case 'text':
        return `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] [${log.pluginId}] ${log.message}`;

      case 'pretty':
        const colors: Record<LogLevel, string> = {
          debug: '\x1b[36m',
          info: '\x1b[32m',
          warn: '\x1b[33m',
          error: '\x1b[31m',
          fatal: '\x1b[35m',
        };
        const reset = '\x1b[0m';
        return `${colors[log.level]}[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] [${log.pluginId}]${reset} ${log.message}`;

      default:
        return JSON.stringify(log);
    }
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    return levels.indexOf(level) >= levels.indexOf(minLevel);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<PluginHealthStatus> {
    return {
      status: 'healthy',
      message: 'Logging plugin is running',
      timestamp: new Date(),
      checks: {
        buffer: {
          status: this.logBuffer.length < 10000 ? 'healthy' : 'degraded',
          message: `Buffer size: ${this.logBuffer.length}`,
        },
      },
    };
  }

  /**
   * Get metrics
   */
  async getMetrics(): Promise<PluginMetrics> {
    return {
      executionCount: this.metrics.totalLogs,
      successCount: this.metrics.totalLogs,
      failureCount: 0,
      memoryUsage: process.memoryUsage().heapUsed,
      custom: { ...this.metrics } as Record<string, number>,
      timestamp: new Date(),
    };
  }
}