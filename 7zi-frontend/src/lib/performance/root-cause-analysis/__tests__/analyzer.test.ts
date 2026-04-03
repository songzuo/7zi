/**
 * Root Cause Analyzer Tests (Enhanced)
 * 根因分析器单元测试（增强版）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RootCauseAnalyzer, RootCauseAnalysisError } from '../analyzer'
import { DatabaseTracker } from '../database-tracker'
import { APITracker } from '../api-tracker'
import { PerformanceContext, SlowQuery, SlowAPICall, RenderingMetrics } from '../types'

describe('RootCauseAnalyzer', () => {
  let analyzer: RootCauseAnalyzer

  beforeEach(() => {
    analyzer = new RootCauseAnalyzer({ minConfidence: 0.1 }) // Lower confidence threshold for testing
  })

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      expect(analyzer).toBeDefined()
    })

    it('should accept custom config', () => {
      const customAnalyzer = new RootCauseAnalyzer({
        slowQueryThreshold: 500,
        slowAPIThreshold: 1000,
      })
      expect(customAnalyzer).toBeDefined()
    })

    it('should accept database tracker instance', () => {
      const tracker = new DatabaseTracker()
      const customAnalyzer = new RootCauseAnalyzer({}, tracker)
      expect(customAnalyzer.getDatabaseTracker()).toBe(tracker)
    })

    it('should accept API tracker instance', () => {
      const tracker = new APITracker()
      const customAnalyzer = new RootCauseAnalyzer({}, undefined, tracker)
      expect(customAnalyzer.getApiTracker()).toBe(tracker)
    })

    it('should respect enableCache parameter', () => {
      const analyzerWithCache = new RootCauseAnalyzer({}, undefined, undefined, true)
      const analyzerWithoutCache = new RootCauseAnalyzer({}, undefined, undefined, false)

      expect(analyzerWithCache).toBeDefined()
      expect(analyzerWithoutCache).toBeDefined()
    })
  })

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
      }

      const result = analyzer.analyze('LCP', 3000, context)

      expect(result.candidates.length).toBeGreaterThan(0)
      expect(result.primaryCause?.type).toBe('database')
    })

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
      }

      const result = analyzer.analyze('LCP', 5000, context)

      expect(result.primaryCause?.type).toBe('database')
      expect(result.primaryCause?.severity).toBe('critical')
    })
  })

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
      }

      const result = analyzer.analyze('FID', 150, context)

      expect(result.candidates.length).toBeGreaterThan(0)
      expect(result.primaryCause?.type).toBe('api')
    })

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
      }

      const result = analyzer.analyze('FID', 100, context)

      expect(result.primaryCause?.type).toBe('api')
    })

    it('should calculate error rate correctly', () => {
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
          {
            endpoint: '/api/users',
            method: 'GET',
            duration: 5000,
            statusCode: 200,
            timestamp: Date.now(),
          },
          {
            endpoint: '/api/users',
            method: 'GET',
            duration: 5000,
            statusCode: 500,
            timestamp: Date.now(),
          },
        ],
      }

      const result = analyzer.analyze('LCP', 4000, context)

      expect(result.primaryCause?.details.errorRate).toBeCloseTo(0.333, 2)
    })
  })

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
      }

      const result = analyzer.analyze('TTI', 4000, context)

      expect(result.candidates.length).toBeGreaterThan(0)
      expect(result.primaryCause?.type).toBe('rendering')
    })
  })

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
      }

      const result = analyzer.analyze('LCP', 4500, context)

      expect(result.candidates.some(c => c.type === 'resource')).toBe(true)
    })
  })

  describe('analyze - Network Issues', () => {
    it('should analyze network issues', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        network: {
          type: '2g',
          rtt: 500,
          downlink: 0.3,
        },
      }

      const result = analyzer.analyze('LCP', 5000, context)

      expect(result.candidates.some(c => c.type === 'network')).toBe(true)
    })
  })

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
      }

      const result = analyzer.analyze('LCP', 5000, context)

      // Database should be primary cause (more severe)
      expect(result.primaryCause?.type).toBe('database')
    })
  })

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
      }

      const rootCause = analyzer.analyze('LCP', 4000, context)
      const report = analyzer.generateReport(rootCause)

      expect(report.summary).toBeDefined()
      expect(report.metric).toBe('LCP')
      expect(report.recommendations.length).toBeGreaterThan(0)
    })
  })

  describe('updateConfig', () => {
    it('should update configuration', () => {
      analyzer.updateConfig({ slowQueryThreshold: 500 })

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
      }

      const result = analyzer.analyze('LCP', 2000, context)

      expect(result.candidates.length).toBeGreaterThan(0)
    })
  })

  describe('getDatabaseTracker', () => {
    it('should return database tracker instance', () => {
      const tracker = analyzer.getDatabaseTracker()
      expect(tracker).toBeDefined()
    })
  })

  describe('getApiTracker', () => {
    it('should return API tracker instance', () => {
      const tracker = analyzer.getApiTracker()
      expect(tracker).toBeDefined()
    })
  })

  describe('getRuleEngine', () => {
    it('should return rule engine instance', () => {
      const engine = analyzer.getRuleEngine()
      expect(engine).toBeDefined()
    })
  })

  describe('Cache Functionality', () => {
    it('should cache analysis results', () => {
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
      }

      // First analysis
      const result1 = analyzer.analyze('LCP', 3000, context)

      // Second analysis with same input (should use cache)
      const result2 = analyzer.analyze('LCP', 3000, context)

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
    })

    it('should provide cache statistics', () => {
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
      }

      analyzer.analyze('LCP', 3000, context)

      const stats = analyzer.getCacheStats()
      expect(stats.size).toBeGreaterThan(0)
      expect(stats.maxEntries).toBeDefined()
      expect(stats.ttl).toBeDefined()
    })

    it('should clear cache', () => {
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
      }

      analyzer.analyze('LCP', 3000, context)
      analyzer.clearCache()

      const stats = analyzer.getCacheStats()
      expect(stats.size).toBe(0)
    })

    it('should disable caching when setCacheEnabled(false)', () => {
      const analyzerNoCache = new RootCauseAnalyzer({ minConfidence: 0.1 }, undefined, undefined, false)
      
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
      }

      analyzerNoCache.analyze('LCP', 3000, context)

      const stats = analyzerNoCache.getCacheStats()
      expect(stats.size).toBe(0)
    })

    it('should enable/disable caching dynamically', () => {
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
      }

      // With cache enabled
      analyzer.analyze('LCP', 3000, context)
      expect(analyzer.getCacheStats().size).toBeGreaterThan(0)

      // Disable cache
      analyzer.setCacheEnabled(false)
      expect(analyzer.getCacheStats().size).toBe(0)

      // Re-enable cache
      analyzer.setCacheEnabled(true)
      analyzer.analyze('LCP', 4000, context)
      expect(analyzer.getCacheStats().size).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should throw RootCauseAnalysisError for invalid metric', () => {
      const context: PerformanceContext = { timestamp: Date.now() }

      expect(() => analyzer.analyze('', 100, context)).toThrow(RootCauseAnalysisError)
      expect(() => analyzer.analyze('', 100, context)).toThrow('Invalid metric')
    })

    it('should throw RootCauseAnalysisError for invalid value', () => {
      const context: PerformanceContext = { timestamp: Date.now() }

      expect(() => analyzer.analyze('LCP', NaN, context)).toThrow(RootCauseAnalysisError)
      expect(() => analyzer.analyze('LCP', NaN, context)).toThrow('Invalid value')
    })

    it('should throw RootCauseAnalysisError for infinite value', () => {
      const context: PerformanceContext = { timestamp: Date.now() }

      expect(() => analyzer.analyze('LCP', Infinity, context)).toThrow(RootCauseAnalysisError)
      expect(() => analyzer.analyze('LCP', Infinity, context)).toThrow('Invalid value')
    })

    it('should throw RootCauseAnalysisError for null context', () => {
      expect(() => analyzer.analyze('LCP', 100, null as any)).toThrow(RootCauseAnalysisError)
      expect(() => analyzer.analyze('LCP', 100, null as any)).toThrow('Invalid context')
    })

    it('should handle malformed query data gracefully', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        slowQueries: [
          {
            query: '', // Empty query
            duration: -100, // Negative duration
            rowCount: 0,
            timestamp: Date.now(),
            type: 'SELECT',
          },
        ],
      }

      // Should not throw
      const result = analyzer.analyze('LCP', 100, context)
      expect(result).toBeDefined()
    })

    it('should handle malformed API data gracefully', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        slowApis: [
          {
            endpoint: '', // Empty endpoint
            method: '', // Empty method
            duration: -100, // Negative duration
            statusCode: 0, // Invalid status code
            timestamp: Date.now(),
          },
        ],
      }

      // Should not throw
      const result = analyzer.analyze('LCP', 100, context)
      expect(result).toBeDefined()
    })

    it('should handle missing optional fields', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        slowQueries: [],
        slowApis: [],
        rendering: undefined,
        resources: undefined,
        network: undefined,
        memory: undefined,
        cpu: undefined,
      }

      const result = analyzer.analyze('LCP', 100, context)
      expect(result.candidates.length).toBe(0)
      expect(result.primaryCause).toBeNull()
    })
  })

  describe('Enhanced Analysis Rules', () => {
    it('should detect N+1 query pattern', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        slowQueries: Array(5).fill(null).map((_, i) => ({
          query: `SELECT * FROM users WHERE id = ${i}`,
          duration: 1200, // Above default threshold of 1000ms
          rowCount: 1,
          timestamp: Date.now(),
          type: 'SELECT' as const,
          table: 'users',
        })),
      }

      const result = analyzer.analyze('LCP', 2000, context)

      // N+1 pattern should be detected and produce suggestions
      expect(result.primaryCause?.suggestedActions.length).toBeGreaterThan(0)
    })

    it('should detect slow JOIN queries', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        slowQueries: [
          {
            query: 'SELECT * FROM users JOIN orders ON users.id = orders.user_id',
            duration: 600,
            rowCount: 1000,
            timestamp: Date.now(),
            type: 'SELECT',
          },
        ],
      }

      const result = analyzer.analyze('LCP', 2000, context)

      expect(result.primaryCause?.suggestedActions.some(
        s => s.toLowerCase().includes('join') || s.toLowerCase().includes('index')
      )).toBe(true)
    })

    it('should detect waterfall API requests', () => {
      const baseTime = Date.now()
      const context: PerformanceContext = {
        timestamp: baseTime,
        slowApis: Array(4).fill(null).map((_, i) => ({
          endpoint: `/api/data${i}`,
          method: 'GET',
          duration: 2500, // Above default threshold
          statusCode: 200,
          timestamp: baseTime + i * 50,
        })),
      }

      const result = analyzer.analyze('FID', 200, context)

      // Should have suggestions for API optimization
      expect(result.candidates.length).toBeGreaterThan(0)
      expect(result.candidates[0]?.suggestedActions.length).toBeGreaterThan(0)
    })

    it('should detect duplicate API requests', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        slowApis: Array(5).fill(null).map(() => ({
          endpoint: '/api/users',
          method: 'GET',
          duration: 2500, // Above default threshold
          statusCode: 200,
          timestamp: Date.now(),
        })),
      }

      const result = analyzer.analyze('FID', 100, context)

      // Should have suggestions for deduplication/caching
      expect(result.candidates.length).toBeGreaterThan(0)
      expect(result.candidates[0]?.suggestedActions.length).toBeGreaterThan(0)
    })

    it('should detect layout thrashing in rendering', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        rendering: {
          longTasks: 20,
          totalBlockingTime: 500,
          cumulativeLayoutShift: 0.35,
        },
      }

      const result = analyzer.analyze('CLS', 0.35, context)

      expect(result.primaryCause?.severity).toBe('critical')
    })

    it('should detect large bundle size', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        resources: {
          totalSize: 5 * 1024 * 1024, // 5MB
          count: 30,
          slowResources: [],
        },
      }

      const result = analyzer.analyze('LCP', 4000, context)

      expect(result.candidates.some(c =>
        c.type === 'resource' && c.severity === 'critical'
      )).toBe(true)
    })

    it('should detect unoptimized images', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        resources: {
          totalSize: 2 * 1024 * 1024,
          count: 10,
          slowResources: [
            { type: 'image', url: '/img1.jpg', size: 400 * 1024, duration: 500, timestamp: Date.now() },
            { type: 'image', url: '/img2.jpg', size: 300 * 1024, duration: 400, timestamp: Date.now() },
          ],
        },
      }

      const result = analyzer.analyze('LCP', 3000, context)

      expect(result.candidates.some(c =>
        c.type === 'resource' && c.suggestedActions.some(s =>
          s.includes('WebP') || s.includes('image')
        )
      )).toBe(true)
    })
  })

  describe('Enhanced Report Generation', () => {
    it('should generate report with prioritized suggestions', () => {
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
        slowApis: [
          {
            endpoint: '/api/data',
            method: 'GET',
            duration: 3000,
            statusCode: 200,
            timestamp: Date.now(),
          },
        ],
      }

      const rootCause = analyzer.analyze('LCP', 4000, context)
      const report = analyzer.generateReport(rootCause)

      expect(report.summary).toBeDefined()
      expect(report.metric).toBe('LCP')
      expect(report.recommendations.length).toBeGreaterThan(0)
      expect(report.prioritizedSuggestions).toBeDefined()
      expect(report.prioritizedSuggestions.highPriority).toBeDefined()
      expect(report.prioritizedSuggestions.mediumPriority).toBeDefined()
      expect(report.prioritizedSuggestions.lowPriority).toBeDefined()
    })

    it('should include impact analysis in report', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        slowQueries: [
          {
            query: 'SELECT * FROM large_table',
            duration: 8000,
            rowCount: 10000,
            timestamp: Date.now(),
            type: 'SELECT',
          },
        ],
      }

      const rootCause = analyzer.analyze('LCP', 5000, context)
      const report = analyzer.generateReport(rootCause)

      expect(report.impactAnalysis).toBeDefined()
      expect(report.impactAnalysis.length).toBeGreaterThan(0)
      expect(report.impactAnalysis[0].type).toBeDefined()
      expect(report.impactAnalysis[0].improvement).toBeDefined()
      expect(report.impactAnalysis[0].effort).toBeDefined()
      expect(report.impactAnalysis[0].roi).toBeDefined()
    })

    it('should generate quick wins', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        rendering: {
          longTasks: 15,
          totalBlockingTime: 300,
          largestContentfulPaint: 5000,
        },
      }

      const rootCause = analyzer.analyze('LCP', 5000, context)
      const report = analyzer.generateReport(rootCause)

      expect(report.quickWins).toBeDefined()
      expect(Array.isArray(report.quickWins)).toBe(true)
    })
  })

  describe('CPU Analysis', () => {
    it('should analyze high CPU usage', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        cpu: {
          usage: 85,
          threads: 8,
          tasks: 50,
        },
      }

      const result = analyzer.analyze('FID', 150, context)

      expect(result.candidates.some(c => c.type === 'cpu')).toBe(true)
    })

    it('should not flag normal CPU usage', () => {
      const context: PerformanceContext = {
        timestamp: Date.now(),
        cpu: {
          usage: 30,
          threads: 8,
          tasks: 10,
        },
      }

      const result = analyzer.analyze('FID', 50, context)

      expect(result.candidates.some(c => c.type === 'cpu')).toBe(false)
    })
  })
})

describe('RootCauseAnalyzer Integration', () => {
  it('should handle complex scenarios with multiple issues', () => {
    const analyzer = new RootCauseAnalyzer({ minConfidence: 0.1 })

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
    }

    const result = analyzer.analyze('LCP', 6000, context)

    expect(result.candidates.length).toBeGreaterThan(0)
    expect(result.primaryCause).not.toBeNull()
  })

  it('should handle cascading failures', () => {
    const analyzer = new RootCauseAnalyzer({ minConfidence: 0.1 })

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
    }

    const result = analyzer.analyze('LCP', 10000, context)

    expect(result.primaryCause?.severity).toBe('critical')
  })
})
