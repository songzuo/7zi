/**
 * Log Aggregator Tests - v1.10.0
 * 日志聚合系统测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  LogAggregator,
  createLogAggregator,
  getDefaultConfig,
  JsonLogParser,
  NginxLogParser,
  MemoryLogStorage,
  AlertManager,
  LogSearchApi,
} from '../index.js';
import type {
  LogAggregatorConfig,
  LogEntry,
  TimeRange,
} from '../types.js';

describe('LogAggregator', () => {
  let aggregator: LogAggregator;
  let config: LogAggregatorConfig;

  beforeEach(() => {
    config = getDefaultConfig() as LogAggregatorConfig;
  });

  afterEach(async () => {
    if (aggregator) {
      await aggregator.stop();
    }
  });

  describe('createLogAggregator', () => {
    it('should create a log aggregator instance', () => {
      aggregator = createLogAggregator(config);
      expect(aggregator).toBeInstanceOf(LogAggregator);
    });

    it('should have default configuration', () => {
      const defaultConfig = getDefaultConfig();
      expect(defaultConfig.collectors).toBeDefined();
      expect(defaultConfig.storage).toBeDefined();
      expect(defaultConfig.analysis).toBeDefined();
    });
  });

  describe('start and stop', () => {
    it('should start successfully', async () => {
      aggregator = createLogAggregator(config);
      await aggregator.start();
      expect(aggregator.getStatus().isRunning).toBe(true);
    });

    it('should stop successfully', async () => {
      aggregator = createLogAggregator(config);
      await aggregator.start();
      await aggregator.stop();
      expect(aggregator.getStatus().isRunning).toBe(false);
    });

    it('should not start twice', async () => {
      aggregator = createLogAggregator(config);
      await aggregator.start();
      await expect(aggregator.start()).rejects.toThrow('already running');
    });
  });

  describe('getHealth', () => {
    it('should return healthy status when running', async () => {
      aggregator = createLogAggregator(config);
      await aggregator.start();
      const health = await aggregator.getHealth();
      expect(health.status).toBe('healthy');
      expect(health.checks.running).toBe(true);
    });
  });
});

describe('JsonLogParser', () => {
  let parser: JsonLogParser;

  beforeEach(() => {
    parser = new JsonLogParser({ type: 'json', enabled: true });
  });

  describe('parse', () => {
    it('should parse valid JSON log', async () => {
      const raw = JSON.stringify({
        level: 'info',
        message: 'Test message',
        timestamp: '2024-01-01T00:00:00Z',
      });
      
      const result = await parser.parse(raw);
      
      expect(result).not.toBeNull();
      expect(result?.level).toBe('info');
      expect(result?.message).toBe('Test message');
      expect(result?.confidence).toBeGreaterThan(0.9);
    });

    it('should return null for invalid JSON', async () => {
      const result = await parser.parse('not json');
      expect(result).toBeNull();
    });

    it('should extract nested fields', async () => {
      const raw = JSON.stringify({
        msg: 'Test',
        lvl: 'error',
        extra: { foo: 'bar' },
      });
      
      const result = await parser.parse(raw);
      expect(result?.fields.extra).toEqual({ foo: 'bar' });
    });
  });

  describe('detectFormat', () => {
    it('should detect JSON format', () => {
      const raw = JSON.stringify({ test: 'value' });
      const format = parser.detectFormat(raw);
      expect(format).toBe('json');
    });

    it('should return null for non-JSON', () => {
      const format = parser.detectFormat('plain text');
      expect(format).toBeNull();
    });
  });

  describe('validate', () => {
    it('should validate parsed result', async () => {
      const raw = JSON.stringify({ message: 'test' });
      const result = await parser.parse(raw);
      expect(parser.validate(result!)).toBe(true);
    });
  });
});

describe('NginxLogParser', () => {
  let parser: NginxLogParser;

  beforeEach(() => {
    parser = new NginxLogParser({ type: 'nginx', enabled: true });
  });

  describe('parse', () => {
    it('should parse Nginx combined log format', async () => {
      const raw = '192.168.1.1 - - [01/Jan/2024:00:00:00 +0000] "GET /test HTTP/1.1" 200 1234 "-" "Mozilla/5.0"';
      
      const result = await parser.parse(raw);
      
      expect(result).not.toBeNull();
      expect(result?.fields.remote_addr).toBe('192.168.1.1');
      expect(result?.fields.status).toBe(200);
      expect(result?.fields.method).toBe('GET');
      expect(result?.fields.path).toBe('/test');
    });

    it('should detect error status codes', async () => {
      const raw = '192.168.1.1 - - [01/Jan/2024:00:00:00 +0000] "GET /error HTTP/1.1" 500 0 "-" "Mozilla/5.0"';
      
      const result = await parser.parse(raw);
      
      expect(result?.level).toBe('error');
    });

    it('should detect warn status codes', async () => {
      const raw = '192.168.1.1 - - [01/Jan/2024:00:00:00 +0000] "GET /notfound HTTP/1.1" 404 0 "-" "Mozilla/5.0"';
      
      const result = await parser.parse(raw);
      
      expect(result?.level).toBe('warn');
    });
  });

  describe('detectFormat', () => {
    it('should detect Nginx format', () => {
      const raw = '192.168.1.1 - - [01/Jan/2024:00:00:00 +0000] "GET / HTTP/1.1" 200 1234';
      const format = parser.detectFormat(raw);
      expect(format).toBe('nginx');
    });
  });
});

describe('MemoryLogStorage', () => {
  let storage: MemoryLogStorage;
  let sampleEntry: LogEntry;

  beforeEach(() => {
    storage = new MemoryLogStorage({
      type: 'memory',
      retentionDays: 7,
      indexPattern: 'logs-*',
      shardCount: 1,
      replicaCount: 1,
      compressionEnabled: false,
      compressionAlgorithm: 'gzip',
    });

    sampleEntry = {
      id: 'test-1',
      timestamp: new Date(),
      level: 'info',
      message: 'Test message',
      source: {
        type: 'file',
        name: 'test',
      },
      metadata: {},
      tags: [],
    };
  });

  describe('store', () => {
    it('should store log entries', async () => {
      const result = await storage.store([sampleEntry]);
      
      expect(result.success).toBe(true);
      expect(result.stored).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should store multiple entries', async () => {
      const entries = [
        { ...sampleEntry, id: 'test-1' },
        { ...sampleEntry, id: 'test-2' },
        { ...sampleEntry, id: 'test-3' },
      ];
      
      const result = await storage.store(entries);
      
      expect(result.stored).toBe(3);
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await storage.store([
        { ...sampleEntry, id: 'test-1', level: 'info' },
        { ...sampleEntry, id: 'test-2', level: 'error' },
        { ...sampleEntry, id: 'test-3', level: 'warn' },
      ]);
    });

    it('should query all entries', async () => {
      const result = await storage.query({
        timeRange: {
          start: new Date(Date.now() - 60000),
          end: new Date(),
        },
      });

      expect(result.total).toBe(3);
      expect(result.entries.length).toBe(3);
    });

    it('should filter by level', async () => {
      const result = await storage.query({
        timeRange: {
          start: new Date(Date.now() - 60000),
          end: new Date(),
        },
        filters: [
          { field: 'level', operator: 'eq', value: 'error' },
        ],
      });

      expect(result.total).toBe(1);
      expect(result.entries[0].level).toBe('error');
    });

    it('should support pagination', async () => {
      const result = await storage.query({
        timeRange: {
          start: new Date(Date.now() - 60000),
          end: new Date(),
        },
        pagination: { offset: 0, limit: 2 },
      });

      expect(result.entries.length).toBe(2);
    });
  });

  describe('aggregate', () => {
    beforeEach(async () => {
      await storage.store([
        { ...sampleEntry, id: 'test-1', level: 'info', metadata: { duration: 100 } },
        { ...sampleEntry, id: 'test-2', level: 'error', metadata: { duration: 200 } },
        { ...sampleEntry, id: 'test-3', level: 'info', metadata: { duration: 150 } },
      ]);
    });

    it('should count by level', async () => {
      const result = await storage.aggregate({
        timeRange: {
          start: new Date(Date.now() - 60000),
          end: new Date(),
        },
        groupBy: ['level'],
        aggregations: [{ type: 'count', field: 'id', name: 'count' }],
        granularity: 'hour',
      });

      expect(result.buckets.length).toBe(2); // info and error
    });
  });

  describe('getStats', () => {
    it('should return storage statistics', async () => {
      await storage.store([sampleEntry]);
      
      const stats = storage.getStats();
      
      expect(stats.totalEntries).toBe(1);
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await storage.store([
        { ...sampleEntry, id: 'test-1', level: 'info' },
        { ...sampleEntry, id: 'test-2', level: 'error' },
      ]);
    });

    it('should delete entries by filter', async () => {
      const result = await storage.delete({
        filters: [{ field: 'level', operator: 'eq', value: 'error' }],
      });

      expect(result.deleted).toBe(1);
    });
  });
});

describe('AlertManager', () => {
  let alertManager: AlertManager;
  let storage: MemoryLogStorage;

  beforeEach(async () => {
    storage = new MemoryLogStorage({
      type: 'memory',
      retentionDays: 7,
      indexPattern: 'logs-*',
      shardCount: 1,
      replicaCount: 1,
      compressionEnabled: false,
      compressionAlgorithm: 'gzip',
    });

    alertManager = new AlertManager(storage);
  });

  describe('addRule', () => {
    it('should add an alert rule', async () => {
      await alertManager.addRule({
        id: 'test-rule',
        name: 'Test Rule',
        enabled: true,
        severity: 'high',
        condition: {
          type: 'threshold',
          field: 'level',
          operator: 'eq',
          value: 'error',
          timeWindow: 60,
        },
        actions: [],
        throttle: { enabled: false, period: 60, maxAlerts: 10 },
        notification: { channels: [] },
        tags: [],
      });

      const rules = await alertManager.getRules();
      expect(rules.length).toBe(1);
    });
  });

  describe('evaluate', () => {
    it('should evaluate logs and trigger alerts', async () => {
      await alertManager.addRule({
        id: 'error-threshold',
        name: 'Error Threshold',
        enabled: true,
        severity: 'high',
        condition: {
          type: 'threshold',
          field: 'level',
          operator: 'eq',
          value: 'error',
          timeWindow: 60,
          minOccurrences: 1,
        },
        actions: [],
        throttle: { enabled: false, period: 60, maxAlerts: 10 },
        notification: { channels: [] },
        tags: [],
      });

      const logs: LogEntry[] = [
        {
          id: 'log-1',
          timestamp: new Date(),
          level: 'error',
          message: 'Error occurred',
          source: { type: 'file', name: 'test' },
          metadata: {},
          tags: [],
        },
      ];

      const alerts = await alertManager.evaluate(logs);
      expect(alerts.length).toBe(1);
    });
  });
});

describe('LogSearchApi', () => {
  let searchApi: LogSearchApi;
  let storage: MemoryLogStorage;

  beforeEach(async () => {
    storage = new MemoryLogStorage({
      type: 'memory',
      retentionDays: 7,
      indexPattern: 'logs-*',
      shardCount: 1,
      replicaCount: 1,
      compressionEnabled: false,
      compressionAlgorithm: 'gzip',
    });

    searchApi = new LogSearchApi({
      enabled: true,
      port: 3001,
      maxResults: 100,
      timeout: 30,
      cacheEnabled: true,
      cacheTTL: 300,
    }, storage);

    // Add sample data
    await storage.store([
      {
        id: 'log-1',
        timestamp: new Date(),
        level: 'info',
        message: 'Application started',
        source: { type: 'file', name: 'app.log' },
        metadata: {},
        tags: [],
      },
      {
        id: 'log-2',
        timestamp: new Date(),
        level: 'error',
        message: 'Database connection failed',
        source: { type: 'file', name: 'app.log' },
        metadata: { error: 'ECONNREFUSED' },
        tags: [],
      },
    ]);
  });

  afterEach(() => {
    searchApi.stop();
  });

  describe('search', () => {
    it('should search logs by text', async () => {
      const result = await searchApi.search({
        query: 'Database',
        timeRange: {
          start: new Date(Date.now() - 60000),
          end: new Date(),
        },
      });

      expect(result.total).toBe(1);
      expect(result.hits[0].entry.message).toContain('Database');
    });

    it('should search with filters', async () => {
      const result = await searchApi.search({
        query: '*',
        timeRange: {
          start: new Date(Date.now() - 60000),
          end: new Date(),
        },
        filters: [
          { field: 'level', operator: 'eq', value: 'error' },
        ],
      });

      expect(result.total).toBe(1);
      expect(result.hits[0].entry.level).toBe('error');
    });
  });

  describe('validate', () => {
    it('should validate a valid query', async () => {
      const result = await searchApi.validate('level:error');

      expect(result.valid).toBe(true);
    });

    it('should detect invalid query syntax', async () => {
      const result = await searchApi.validate('level:"unclosed');

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});

describe('Utility Functions', () => {
  describe('formatBytes', () => {
    it('should format bytes correctly', async () => {
      const { formatBytes } = await import('../utils/helpers.js');
      
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
    });
  });

  describe('parseTimeRange', () => {
    it('should parse relative time ranges', async () => {
      const { parseTimeRange } = await import('../utils/helpers.js');
      
      const range = parseTimeRange('last 1 hour');
      
      expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
      const diff = range.end.getTime() - range.start.getTime();
      expect(diff).toBe(3600000); // 1 hour in ms
    });
  });

  describe('calculateStats', () => {
    it('should calculate statistics correctly', async () => {
      const { calculateStats } = await import('../utils/helpers.js');
      
      const stats = calculateStats([1, 2, 3, 4, 5]);
      
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(5);
      expect(stats.avg).toBe(3);
      expect(stats.sum).toBe(15);
      expect(stats.count).toBe(5);
    });
  });
});
