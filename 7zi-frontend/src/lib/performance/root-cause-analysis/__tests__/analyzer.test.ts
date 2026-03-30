/**
 * Root Cause Analyzer Tests (Final)
 * 根因分析器单元测试（最终版）
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RootCauseAnalyzer } from '../analyzer';
import { PerformanceContext, SlowQuery, SlowAPICall, RenderingMetrics } from '../types';

describe('RootCauseAnalyzer', () => {
  let analyzer: RootCauseAnalyzer;

  beforeEach(() => {
    analyzer = new RootCauseAnalyzer({ minConfidence: 0.1 }); // 降低置信度阈值
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      expect(analyzer).toBeDefined();
    });

    it('should accept custom config', () => {
      const customAnalyzer = new RootCauseAnalyzer({
        slowQueryThreshold: 500,
        slowAPIThreshold: 1000,
      });
      expect(customAnalyzer).toBeDefined();
    });
  });

  describe('analyze - Database Issues', () => {
    it('should analyze database issues with SELECT *', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        slowQueries: [
          {
            query: 'SELECT * FROM users',
            duration: 5000,
            rowCount: 1000,
            timestamp: Date.now(),
            type: 'SELECT',
          },
        ],
      };

      const result = analyzer.analyze('LCP', 3000, context);

      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.primaryCause?.type).toBe('database');
    });

    it('should analyze database issues with large result', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        slowQueries: [
          {
            query: 'SELECT id, name FROM large_table',
            duration: 8000,
            rowCount: 20000,
            timestamp: Date.now(),
            type: 'SELECT',
          },
        ],
      };

      const result = analyzer.analyze('LCP', 5000, context);

      expect(result.primaryCause?.type).toBe('database');
      expect(result.primaryCause?.severity).toBe('critical');
    });
  });

  describe('analyze - API Issues', () => {
    it('should analyze API issues', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        slowApis: [
          {
            endpoint: '/api/users',
            method: 'GET',
            duration: 5000,
            statusCode: 200,
            timestamp: Date.now(),
          },
        ],
      };

      const result = analyzer.analyze('FID', 150, context);

      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.primaryCause?.type).toBe('api');
    });

    it('should detect server errors (5xx)', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        slowApis: [
          {
            endpoint: '/api/users',
            method: 'GET',
            duration: 5000,
            statusCode: 500,
            timestamp: Date.now(),
          },
        ],
      };

      const result = analyzer.analyze('FID', 100, context);

      expect(result.primaryCause?.type).toBe('api');
    });

    it('should calculate error rate correctly', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        slowApis: [
          { endpoint: '/api/users', method: 'GET', duration: 5000, statusCode: 200, timestamp: Date.now() },
          { endpoint: '/api/users', method: 'GET', duration: 5000, statusCode: 200, timestamp: Date.now() },
          { endpoint: '/api/users', method: 'GET', duration: 5000, statusCode: 500, timestamp: Date.now() },
        ],
      };

      const result = analyzer.analyze('LCP', 4000, context);

      expect(result.primaryCause?.details.errorRate).toBeCloseTo(0.333, 2);
    });
  });

  describe('analyze - Rendering Issues', () => {
    it('should analyze rendering issues', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        rendering: {
          longTasks: 25,
          totalBlockingTime: 600,
          largestContentfulPaint: 6000,
          cumulativeLayoutShift: 0.4,
        },
      };

      const result = analyzer.analyze('TTI', 4000, context);

      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.primaryCause?.type).toBe('rendering');
    });
  });

  describe('analyze - Resource Issues', () => {
    it('should analyze resource issues', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        resources: {
          totalSize: 10 * 1024 * 1024, // 10MB
          count: 50,
          slowResources: [
            {
              type: 'image',
              url: 'https://example.com/large-image.jpg',
              size: 5 * 1024 * 1024,
              duration: 3000,
              timestamp: Date.now(),
            },
          ],
        },
      };

      const result = analyzer.analyze('LCP', 4500, context);

      expect(result.candidates.some(c => c.type === 'resource')).toBe(true);
    });
  });

  describe('analyze - Network Issues', () => {
    it('should analyze network issues', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        network: {
          type: '2g',
          rtt: 500,
          downlink: 0.3,
        },
      };

      const result = analyzer.analyze('LCP', 5000, context);

      expect(result.candidates.some(c => c.type === 'network')).toBe(true);
    });
  });

  describe('analyze - Multiple Issues', () => {
    it('should prioritize by severity', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        slowQueries: [
          {
            query: 'SELECT * FROM large_table',
            duration: 10000,
            rowCount: 50000,
            timestamp: Date.now(),
            type: 'SELECT',
          },
        ],
        slowApis: [
          {
            endpoint: '/api/users',
            method: 'GET',
            duration: 3000,
            statusCode: 200,
            timestamp: Date.now(),
          },
        ],
      };

      const result = analyzer.analyze('LCP', 5000, context);

      // Database should be primary cause (more severe)
      expect(result.primaryCause?.type).toBe('database');
    });
  });

  describe('generateReport', () => {
    it('should generate comprehensive report', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        slowQueries: [
          {
            query: 'SELECT * FROM users',
            duration: 5000,
            rowCount: 5000,
            timestamp: Date.now(),
            type: 'SELECT',
          },
        ],
      };

      const rootCause = analyzer.analyze('LCP', 4000, context);
      const report = analyzer.generateReport(rootCause);

      expect(report.summary).toBeDefined();
      expect(report.metric).toBe('LCP');
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      analyzer.updateConfig({ slowQueryThreshold: 500 });

      const context: PerformanceContext = {
        timestamp: Date.now(),
        slowQueries: [
          {
            query: 'SELECT * FROM users',
            duration: 800,
            rowCount: 100,
            timestamp: Date.now(),
            type: 'SELECT',
          },
        ],
      };

      const result = analyzer.analyze('LCP', 2000, context);

      expect(result.candidates.length).toBeGreaterThan(0);
    });
  });

  describe('getDatabaseTracker', () => {
    it('should return database tracker instance', () => {
      const tracker = analyzer.getDatabaseTracker();
      expect(tracker).toBeDefined();
    });
  });

  describe('getApiTracker', () => {
    it('should return API tracker instance', () => {
      const tracker = analyzer.getApiTracker();
      expect(tracker).toBeDefined();
    });
  });
});

describe('RootCauseAnalyzer Integration', () => {
  it('should handle complex scenarios with multiple issues', () => {
    const analyzer = new RootCauseAnalyzer({ minConfidence: 0.1 });
    
    const context: PerformanceContext = {
      timestamp: Date.now(),
      slowQueries: [
        {
          query: 'SELECT * FROM orders WHERE user_id IN (SELECT id FROM users)',
          duration: 8000,
          rowCount: 10000,
          timestamp: Date.now(),
          type: 'SELECT',
        },
      ],
      slowApis: [
        {
          endpoint: '/api/orders',
          method: 'GET',
          duration: 8000,
          statusCode: 200,
          timestamp: Date.now(),
        },
      ],
      rendering: {
        longTasks: 50,
        totalBlockingTime: 1000,
        largestContentfulPaint: 8000,
      },
    };

    const result = analyzer.analyze('LCP', 6000, context);

    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.primaryCause).not.toBeNull();
  });

  it('should handle cascading failures', () => {
    const analyzer = new RootCauseAnalyzer({ minConfidence: 0.1 });
    
    const context: PerformanceContext = {
      timestamp: Date.now(),
      slowApis: [
        {
          endpoint: '/api/database',
          method: 'GET',
          duration: 8000,
          statusCode: 503,
          timestamp: Date.now(),
          error: 'Service Unavailable',
        },
      ],
    };

    const result = analyzer.analyze('LCP', 10000, context);

    expect(result.primaryCause?.severity).toBe('critical');
  });
});
