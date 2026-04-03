/**
 * Log Aggregator - v1.10.0
 * 企业级日志聚合和分析系统主入口
 */

import { EventEmitter } from 'events';
import type {
  LogAggregatorConfig,
  LogEntry,
  ILogCollector,
  ILogParser,
  ILogStorage,
  IAnalysisEngine,
  IAlertManager,
  ISearchApi,
  LogEvent,
  LogEventListener,
} from './types.js';

import { LogCollectorFactory } from './collector/LogCollector.js';
import { LogParserFactory } from './parser/LogParser.js';
import { LogStorageFactory } from './storage/LogStorage.js';
import { LogAnalysisEngine } from './analysis/AnalysisEngine.js';
import { AlertManager } from './alerting/AlertManager.js';
import { LogSearchApi } from './search/SearchApi.js';

/**
 * 日志聚合器主类
 */
export class LogAggregator extends EventEmitter {
  private _config: LogAggregatorConfig;
  private _collectors: Map<string, ILogCollector> = new Map();
  private _parsers: Map<string, ILogParser> = new Map();
  private _storage: ILogStorage;
  private _analysisEngine: IAnalysisEngine;
  private _alertManager: IAlertManager;
  private _searchApi: ISearchApi;
  private _isRunning = false;
  private _listeners: LogEventListener[] = [];
  private _processingQueue: LogEntry[] = [];
  private _processingTimer?: NodeJS.Timeout;

  constructor(config: LogAggregatorConfig) {
    super();
    this._config = config;
    this.setMaxListeners(100);

    // Initialize components
    this._storage = LogStorageFactory.create(config.storage);
    this._analysisEngine = new LogAnalysisEngine(config.analysis, this._storage);
    this._alertManager = new AlertManager(this._storage);
    this._searchApi = new LogSearchApi(config.search, this._storage);

    // Setup event forwarding
    this.setupEventForwarding();
  }

  /**
   * 启动日志聚合器
   */
  async start(): Promise<void> {
    if (this._isRunning) {
      throw new Error('LogAggregator is already running');
    }

    console.log('Starting LogAggregator...');

    // Initialize collectors
    for (const collectorConfig of this._config.collectors) {
      if (collectorConfig.enabled) {
        const collector = LogCollectorFactory.create(collectorConfig);
        this._collectors.set(collector.id, collector);
        
        // Setup batch event handler
        collector.on('batch', ((entries: unknown) => {
          this.processBatch(entries as LogEntry[]).catch(console.error);
        }) as (...args: unknown[]) => void);

        await collector.start();
        console.log(`Started collector: ${collector.id} (${collector.type})`);
      }
    }

    // Initialize parsers
    for (const parserConfig of this._config.parser) {
      if (parserConfig.enabled) {
        const parser = LogParserFactory.create(parserConfig);
        this._parsers.set(parserConfig.type, parser);
        console.log(`Initialized parser: ${parserConfig.type}`);
      }
    }

    // Start alert manager periodic evaluation
    this._alertManager.startPeriodicEvaluation(60000);

    // Start processing timer
    this._processingTimer = setInterval(() => {
      this.processQueue().catch(console.error);
    }, 1000);

    this._isRunning = true;
    this.emit('started');
    console.log('LogAggregator started successfully');
  }

  /**
   * 停止日志聚合器
   */
  async stop(): Promise<void> {
    if (!this._isRunning) {
      return;
    }

    console.log('Stopping LogAggregator...');

    // Stop collectors
    for (const collector of Array.from(this._collectors.values())) {
      await collector.stop();
      console.log(`Stopped collector: ${collector.id}`);
    }

    // Stop alert manager
    this._alertManager.stopPeriodicEvaluation();

    // Stop processing timer
    if (this._processingTimer) {
      clearInterval(this._processingTimer);
    }

    // Process remaining queue
    await this.processQueue();

    // Stop search API
    this._searchApi.stop();

    this._isRunning = false;
    this.emit('stopped');
    console.log('LogAggregator stopped');
  }

  /**
   * 处理日志批次
   */
  private async processBatch(entries: LogEntry[]): Promise<void> {
    // Add to queue
    this._processingQueue.push(...entries);

    // Process immediately if queue is large
    if (this._processingQueue.length >= this._config.performance.batchSize) {
      await this.processQueue();
    }
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    if (this._processingQueue.length === 0) {
      return;
    }

    const entries = [...this._processingQueue];
    this._processingQueue = [];

    try {
      // Parse entries
      const parsedEntries = await this.parseEntries(entries);

      // Store entries
      const storeResult = await this._storage.store(parsedEntries);

      // Evaluate alerts
      if (storeResult.stored > 0) {
        await this._alertManager.evaluate(parsedEntries);
      }

      // Emit event
      await this.emitEvent({
        type: 'log_stored',
        count: storeResult.stored,
        size: 0,
      });
    } catch (error) {
      console.error('Error processing log batch:', error);
      await this.emitEvent({
        type: 'error',
        component: 'log-aggregator',
        error: error as Error,
      });
    }
  }

  /**
   * 解析日志条目
   */
  private async parseEntries(entries: LogEntry[]): Promise<LogEntry[]> {
    const parsed: LogEntry[] = [];

    for (const entry of entries) {
      // Try to parse raw log
      if (entry.raw) {
        const parserType = LogParserFactory.detectFormat(entry.raw);
        if (parserType) {
          const parser = this._parsers.get(parserType);
          if (parser) {
            const parsedData = await parser.parse(entry.raw);
            if (parsedData && parser.validate(parsedData)) {
              entry.parsed = parsedData;
              
              // Update entry with parsed data
              if (parsedData.timestamp) {
                entry.timestamp = parsedData.timestamp;
              }
              if (parsedData.level) {
                entry.level = parsedData.level;
              }
              if (parsedData.message) {
                entry.message = parsedData.message;
              }
              
              // Merge parsed fields into metadata
              if (parsedData.fields) {
                entry.metadata = { ...entry.metadata, ...parsedData.fields };
              }
            }
          }
        }
      }
      
      parsed.push(entry);
    }

    return parsed;
  }

  /**
   * 设置事件转发
   */
  private setupEventForwarding(): void {
    // Forward storage events
    if (this._storage instanceof EventEmitter) {
      this._storage.on('batch', (entries: LogEntry[]) => {
        this.emit('batch', entries);
      });
    }

    // Forward alert events
    this._alertManager.on('alert:created', (alert) => {
      this.emit('alert:created', alert);
    });

    this._alertManager.on('alert:acknowledged', (alert) => {
      this.emit('alert:acknowledged', alert);
    });

    this._alertManager.on('alert:resolved', (alert) => {
      this.emit('alert:resolved', alert);
    });
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
  private async emitEvent(event: LogEvent): Promise<void> {
    for (const listener of this._listeners) {
      try {
        await listener(event);
      } catch (error) {
        console.error(`Error in event listener:`, error);
      }
    }
  }

  /**
   * 获取配置
   */
  get config(): LogAggregatorConfig {
    return this._config;
  }

  /**
   * 获取存储
   */
  get storage(): ILogStorage {
    return this._storage;
  }

  /**
   * 获取分析引擎
   */
  get analysisEngine(): IAnalysisEngine {
    return this._analysisEngine;
  }

  /**
   * 获取告警管理器
   */
  get alertManager(): IAlertManager {
    return this._alertManager;
  }

  /**
   * 获取搜索 API
   */
  get searchApi(): ISearchApi {
    return this._searchApi;
  }

  /**
   * 获取收集器
   */
  get collectors(): Map<string, ILogCollector> {
    return this._collectors;
  }

  /**
   * 获取解析器
   */
  get parsers(): Map<string, ILogParser> {
    return this._parsers;
  }

  /**
   * 获取状态
   */
  getStatus(): {
    isRunning: boolean;
    collectors: Array<{ id: string; type: string; status: unknown }>;
    storage: unknown;
    queueSize: number;
  } {
    return {
      isRunning: this._isRunning,
      collectors: Array.from(this._collectors.values()).map((collector) => ({
        id: collector.id,
        type: collector.type,
        status: collector.getStatus(),
      })),
      storage: this._storage.getStats(),
      queueSize: this._processingQueue.length,
    };
  }

  /**
   * 获取健康状态
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
  }> {
    const checks: Record<string, boolean> = {
      running: this._isRunning,
      collectors: this._collectors.size > 0,
      storage: true,
      queue: this._processingQueue.length < 10000,
    };

    const healthyCount = Object.values(checks).filter(Boolean).length;
    const totalCount = Object.keys(checks).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      status = 'healthy';
    } else if (healthyCount >= totalCount / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, checks };
  }
}

/**
 * 创建日志聚合器实例
 */
export function createLogAggregator(config: LogAggregatorConfig): LogAggregator {
  return new LogAggregator(config);
}

/**
 * 默认配置
 */
export function getDefaultConfig(): Partial<LogAggregatorConfig> {
  return {
    collectors: [
      {
        id: 'stdout-collector',
        type: 'stdout',
        enabled: true,
        batchSize: 100,
        flushInterval: 5000,
        retryAttempts: 3,
        retryDelay: 1000,
        bufferSize: 1000,
      },
    ],
    parser: [
      { type: 'json', enabled: true },
      { type: 'nginx', enabled: true },
      { type: 'apache', enabled: true },
      { type: 'application', enabled: true },
    ],
    storage: {
      type: 'memory',
      retentionDays: 7,
      indexPattern: 'logs-*',
      shardCount: 1,
      replicaCount: 1,
      compressionEnabled: true,
      compressionAlgorithm: 'gzip',
    },
    analysis: {
      enabled: true,
      anomalyDetection: {
        enabled: true,
        algorithms: ['zscore'],
        sensitivity: 2,
        windowSize: 60,
        minSamples: 10,
      },
      trendAnalysis: {
        enabled: true,
        methods: ['linear'],
        forecastHorizon: 24,
        confidenceLevel: 0.95,
      },
      statisticalReport: {
        enabled: true,
        schedule: '0 0 * * *',
        metrics: ['total_logs', 'error_rate', 'avg_response_time'],
        comparison: 'previous_period',
      },
    },
    alerting: [],
    search: {
      enabled: true,
      port: 3001,
      maxResults: 100,
      timeout: 30,
      cacheEnabled: true,
      cacheTTL: 300,
      rateLimit: {
        enabled: true,
        requestsPerMinute: 60,
        burstSize: 10,
      },
    },
    performance: {
      maxMemoryMB: 512,
      workerCount: 4,
      batchSize: 100,
      queueSize: 10000,
      processingTimeout: 30000,
    },
    monitoring: {
      enabled: true,
      metricsPort: 9090,
      healthCheckPort: 8080,
      prometheusEnabled: true,
    },
  };
}