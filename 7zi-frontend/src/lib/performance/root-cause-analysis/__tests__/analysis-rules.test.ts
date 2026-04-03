/**
 * Analysis Rules Tests
 * 分析规则模块测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AnalysisRuleEngine } from '../analysis-rules'
import {
  SlowQuery,
  SlowAPICall,
  RenderingMetrics,
  ResourceMetrics,
} from '../types'

describe('AnalysisRuleEngine', () => {
  let engine: AnalysisRuleEngine

  beforeEach(() => {
    engine = new AnalysisRuleEngine()
  })

  describe('Database Rule Analysis', () => {
    it('should detect N+1 query pattern', () => {
      const queries: SlowQuery[] = [
        { query: 'SELECT * FROM users WHERE id = 1', duration: 100, rowCount: 1, timestamp: Date.now(), type: 'SELECT', table: 'users' },
        { query: 'SELECT * FROM users WHERE id = 2', duration: 100, rowCount: 1, timestamp: Date.now(), type: 'SELECT', table: 'users' },
        { query: 'SELECT * FROM users WHERE id = 3', duration: 100, rowCount: 1, timestamp: Date.now(), type: 'SELECT', table: 'users' },
        { query: 'SELECT * FROM users WHERE id = 4', duration: 100, rowCount: 1, timestamp: Date.now(), type: 'SELECT', table: 'users' },
      ]

      const result = engine.analyzeDatabaseRules(queries)

      expect(result.patterns).toContain('n-plus-one')
      expect(result.issues.some(i => i.includes('N+1 query pattern'))).toBe(true)
      expect(result.severity).toBe('critical')
    })

    it('should detect large result sets', () => {
      const queries: SlowQuery[] = [
        { query: 'SELECT * FROM orders', duration: 500, rowCount: 5000, timestamp: Date.now(), type: 'SELECT', table: 'orders' },
      ]

      const result = engine.analyzeDatabaseRules(queries)

      expect(result.patterns).toContain('large-result')
      expect(result.suggestions.some(s => s.includes('pagination'))).toBe(true)
    })

    it('should detect possible full table scans', () => {
      const queries: SlowQuery[] = [
        { query: 'SELECT * FROM products WHERE name LIKE "%test%"', duration: 800, rowCount: 100, timestamp: Date.now(), type: 'SELECT', table: 'products' },
      ]

      const result = engine.analyzeDatabaseRules(queries)

      expect(result.patterns).toContain('missing-index')
      expect(result.suggestions.some(s => s.includes('index'))).toBe(true)
    })

    it('should detect slow JOIN queries', () => {
      const queries: SlowQuery[] = [
        { query: 'SELECT * FROM users JOIN orders ON users.id = orders.user_id', duration: 500, rowCount: 100, timestamp: Date.now(), type: 'SELECT' },
        { query: 'SELECT * FROM products JOIN categories ON products.cat_id = categories.id', duration: 400, rowCount: 50, timestamp: Date.now(), type: 'SELECT' },
      ]

      const result = engine.analyzeDatabaseRules(queries)

      expect(result.patterns).toContain('slow-joins')
      expect(result.suggestions.some(s => s.includes('JOIN'))).toBe(true)
    })

    it('should detect slow aggregation queries', () => {
      const queries: SlowQuery[] = [
        { query: 'SELECT COUNT(*) FROM logs GROUP BY user_id', duration: 600, rowCount: 1000, timestamp: Date.now(), type: 'SELECT' },
      ]

      const result = engine.analyzeDatabaseRules(queries)

      expect(result.patterns).toContain('slow-aggregation')
      expect(result.suggestions.some(s => s.includes('GROUP BY') || s.includes('index'))).toBe(true)
    })

    it('should detect sequential slow queries', () => {
      const queries: SlowQuery[] = Array(5).fill(null).map((_, i) => ({
        query: `SELECT * FROM table${i}`,
        duration: 150,
        rowCount: 100,
        timestamp: Date.now() + i * 10,
        type: 'SELECT' as const,
      }))

      const result = engine.analyzeDatabaseRules(queries)

      expect(result.patterns).toContain('sequential-queries')
      expect(result.suggestions.some(s => s.includes('parallel') || s.includes('Promise.all'))).toBe(true)
    })

    it('should return low severity for normal queries', () => {
      const queries: SlowQuery[] = [
        { query: 'SELECT * FROM users WHERE id = 1', duration: 50, rowCount: 1, timestamp: Date.now(), type: 'SELECT' },
      ]

      const result = engine.analyzeDatabaseRules(queries)

      expect(result.severity).toBe('low')
      expect(result.patterns.length).toBe(0)
    })
  })

  describe('API Rule Analysis', () => {
    it('should detect waterfall request pattern', () => {
      const baseTime = Date.now()
      const apis: SlowAPICall[] = [
        { endpoint: '/api/users', method: 'GET', duration: 200, statusCode: 200, timestamp: baseTime },
        { endpoint: '/api/posts', method: 'GET', duration: 200, statusCode: 200, timestamp: baseTime + 50 },
        { endpoint: '/api/comments', method: 'GET', duration: 200, statusCode: 200, timestamp: baseTime + 100 },
        { endpoint: '/api/likes', method: 'GET', duration: 200, statusCode: 200, timestamp: baseTime + 150 },
      ]

      const result = engine.analyzeAPIRules(apis)

      expect(result.patterns).toContain('waterfall-requests')
      expect(result.suggestions.some(s => s.includes('Promise.all') || s.includes('parallel'))).toBe(true)
    })

    it('should detect over-fetching', () => {
      const apis: SlowAPICall[] = [
        { endpoint: '/api/large-data', method: 'GET', duration: 500, statusCode: 200, timestamp: Date.now(), responseSize: 600 * 1024 },
      ]

      const result = engine.analyzeAPIRules(apis)

      expect(result.patterns).toContain('over-fetching')
      expect(result.suggestions.some(s => s.includes('field selection') || s.includes('compression'))).toBe(true)
    })

    it('should detect unauthorized requests', () => {
      const apis: SlowAPICall[] = [
        { endpoint: '/api/protected', method: 'GET', duration: 100, statusCode: 401, timestamp: Date.now() },
        { endpoint: '/api/protected', method: 'GET', duration: 100, statusCode: 401, timestamp: Date.now() },
      ]

      const result = engine.analyzeAPIRules(apis)

      expect(result.patterns).toContain('auth-issues')
      expect(result.severity).toBe('critical')
    })

    it('should detect rate limiting', () => {
      const apis: SlowAPICall[] = [
        { endpoint: '/api/data', method: 'GET', duration: 100, statusCode: 429, timestamp: Date.now() },
        { endpoint: '/api/data', method: 'GET', duration: 100, statusCode: 429, timestamp: Date.now() },
      ]

      const result = engine.analyzeAPIRules(apis)

      expect(result.patterns).toContain('rate-limited')
      expect(result.suggestions.some(s => s.includes('backoff'))).toBe(true)
    })

    it('should detect duplicate requests', () => {
      const apis: SlowAPICall[] = [
        { endpoint: '/api/users', method: 'GET', duration: 200, statusCode: 200, timestamp: Date.now() },
        { endpoint: '/api/users', method: 'GET', duration: 200, statusCode: 200, timestamp: Date.now() },
        { endpoint: '/api/users', method: 'GET', duration: 200, statusCode: 200, timestamp: Date.now() },
        { endpoint: '/api/users', method: 'GET', duration: 200, statusCode: 200, timestamp: Date.now() },
      ]

      const result = engine.analyzeAPIRules(apis)

      expect(result.patterns).toContain('duplicate-requests')
      expect(result.suggestions.some(s => s.includes('deduplication') || s.includes('caching'))).toBe(true)
    })

    it('should detect slow endpoints', () => {
      const apis: SlowAPICall[] = [
        { endpoint: '/api/slow', method: 'GET', duration: 4000, statusCode: 200, timestamp: Date.now() },
        { endpoint: '/api/slow', method: 'GET', duration: 3500, statusCode: 200, timestamp: Date.now() },
        { endpoint: '/api/slow', method: 'GET', duration: 3200, statusCode: 200, timestamp: Date.now() },
      ]

      const result = engine.analyzeAPIRules(apis)

      expect(result.patterns).toContain('slow-endpoint')
      expect(result.suggestions.some(s => s.includes('/api/slow'))).toBe(true)
    })

    it('should detect server errors', () => {
      const apis: SlowAPICall[] = [
        { endpoint: '/api/error', method: 'GET', duration: 100, statusCode: 500, timestamp: Date.now() },
        { endpoint: '/api/error', method: 'GET', duration: 100, statusCode: 502, timestamp: Date.now() },
      ]

      const result = engine.analyzeAPIRules(apis)

      expect(result.patterns).toContain('server-error')
      expect(result.severity).toBe('critical')
    })
  })

  describe('Rendering Rule Analysis', () => {
    it('should detect excessive re-renders', () => {
      const rendering: RenderingMetrics = {
        longTasks: 25,
        totalBlockingTime: 200,
      }

      const result = engine.analyzeRenderingRules(rendering)

      expect(result.patterns).toContain('excessive-renders')
      expect(result.suggestions.some(s => s.includes('React.memo') || s.includes('useMemo'))).toBe(true)
    })

    it('should detect layout thrashing', () => {
      const rendering: RenderingMetrics = {
        longTasks: 15,
        totalBlockingTime: 400,
        cumulativeLayoutShift: 0.3,
      }

      const result = engine.analyzeRenderingRules(rendering)

      expect(result.patterns).toContain('layout-thrashing')
      expect(result.severity).toBe('critical')
    })

    it('should detect slow critical rendering path', () => {
      const rendering: RenderingMetrics = {
        longTasks: 5,
        totalBlockingTime: 100,
        largestContentfulPaint: 5000,
      }

      const result = engine.analyzeRenderingRules(rendering)

      expect(result.patterns).toContain('slow-crp')
      expect(result.suggestions.some(s => s.includes('preload') || s.includes('render-blocking'))).toBe(true)
    })

    it('should detect poor input responsiveness', () => {
      const rendering: RenderingMetrics = {
        longTasks: 5,
        totalBlockingTime: 100,
        firstInputDelay: 150,
      }

      const result = engine.analyzeRenderingRules(rendering)

      expect(result.patterns).toContain('poor-input-responsiveness')
      expect(result.suggestions.some(s => s.includes('JavaScript') || s.includes('task'))).toBe(true)
    })

    it('should detect layout shifts', () => {
      const rendering: RenderingMetrics = {
        longTasks: 5,
        totalBlockingTime: 100,
        cumulativeLayoutShift: 0.35,
      }

      const result = engine.analyzeRenderingRules(rendering)

      expect(result.patterns).toContain('layout-shift')
      expect(result.suggestions.some(s => s.includes('space') || s.includes('transform'))).toBe(true)
    })

    it('should detect slow interaction to next paint', () => {
      const rendering: RenderingMetrics = {
        longTasks: 5,
        totalBlockingTime: 100,
        interactionToNextPaint: 300,
      }

      const result = engine.analyzeRenderingRules(rendering)

      expect(result.patterns).toContain('slow-interaction')
      expect(result.severity).toBe('critical')
    })
  })

  describe('Resource Rule Analysis', () => {
    it('should detect large bundle size', () => {
      const resources: ResourceMetrics = {
        totalSize: 4 * 1024 * 1024, // 4MB
        count: 20,
        slowResources: [],
      }

      const result = engine.analyzeResourceRules(resources)

      expect(result.patterns).toContain('large-bundle')
      expect(result.suggestions.some(s => s.includes('code splitting') || s.includes('tree shaking'))).toBe(true)
    })

    it('should detect unoptimized images', () => {
      const resources: ResourceMetrics = {
        totalSize: 1024 * 1024,
        count: 10,
        slowResources: [
          { type: 'image', url: '/img1.jpg', size: 300 * 1024, duration: 500, timestamp: Date.now() },
          { type: 'image', url: '/img2.jpg', size: 250 * 1024, duration: 400, timestamp: Date.now() },
        ],
      }

      const result = engine.analyzeResourceRules(resources)

      expect(result.patterns).toContain('unoptimized-images')
      expect(result.suggestions.some(s => s.includes('WebP') || s.includes('lazy loading'))).toBe(true)
    })

    it('should detect third-party script impact', () => {
      const resources: ResourceMetrics = {
        totalSize: 1024 * 1024,
        count: 10,
        slowResources: [
          { type: 'script', url: 'https://cdn.analytics.com/script.js', size: 50 * 1024, duration: 300, timestamp: Date.now() },
          { type: 'script', url: 'https://cdn.tracking.com/track.js', size: 30 * 1024, duration: 250, timestamp: Date.now() },
          { type: 'script', url: 'https://cdn.ads.com/ad.js', size: 40 * 1024, duration: 350, timestamp: Date.now() },
          { type: 'script', url: 'https://cdn.social.com/widget.js', size: 20 * 1024, duration: 200, timestamp: Date.now() },
        ],
      }

      const result = engine.analyzeResourceRules(resources)

      expect(result.patterns).toContain('third-party-scripts')
      expect(result.suggestions.some(s => s.includes('defer') || s.includes('self-host'))).toBe(true)
    })

    it('should detect render-blocking resources', () => {
      const resources: ResourceMetrics = {
        totalSize: 512 * 1024,
        count: 5,
        slowResources: [
          { type: 'script', url: '/script.js', size: 100 * 1024, duration: 300, timestamp: Date.now() },
          { type: 'stylesheet', url: '/style.css', size: 50 * 1024, duration: 250, timestamp: Date.now() },
        ],
      }

      const result = engine.analyzeResourceRules(resources)

      expect(result.patterns).toContain('render-blocking')
      expect(result.suggestions.some(s => s.includes('async') || s.includes('defer'))).toBe(true)
    })

    it('should detect unused CSS', () => {
      const resources: ResourceMetrics = {
        totalSize: 512 * 1024,
        count: 5,
        slowResources: [
          { type: 'stylesheet', url: '/style1.css', size: 50 * 1024, duration: 100, timestamp: Date.now() },
          { type: 'stylesheet', url: '/style2.css', size: 40 * 1024, duration: 100, timestamp: Date.now() },
          { type: 'stylesheet', url: '/style3.css', size: 30 * 1024, duration: 100, timestamp: Date.now() },
          { type: 'stylesheet', url: '/style4.css', size: 20 * 1024, duration: 100, timestamp: Date.now() },
        ],
      }

      const result = engine.analyzeResourceRules(resources)

      expect(result.patterns).toContain('unused-css')
      expect(result.suggestions.some(s => s.includes('PurgeCSS') || s.includes('unused'))).toBe(true)
    })

    it('should detect cache issues', () => {
      const resources: ResourceMetrics = {
        totalSize: 1024 * 1024,
        count: 15,
        slowResources: [
          { type: 'script', url: '/script1.js', size: 50 * 1024, duration: 200, timestamp: Date.now() },
          { type: 'script', url: '/script2.js', size: 50 * 1024, duration: 200, timestamp: Date.now() },
          { type: 'stylesheet', url: '/style1.css', size: 30 * 1024, duration: 150, timestamp: Date.now() },
          { type: 'image', url: '/img1.jpg', size: 100 * 1024, duration: 300, timestamp: Date.now() },
          { type: 'font', url: '/font.woff2', size: 80 * 1024, duration: 250, timestamp: Date.now() },
          { type: 'script', url: '/script3.js', size: 40 * 1024, duration: 180, timestamp: Date.now() },
        ],
      }

      const result = engine.analyzeResourceRules(resources)

      expect(result.patterns).toContain('cache-issues')
      expect(result.suggestions.some(s => s.includes('caching') || s.includes('service worker'))).toBe(true)
    })
  })

  describe('Suggestion Prioritization', () => {
    it('should prioritize critical severity suggestions', () => {
      const candidates = [
        {
          type: 'database' as const,
          severity: 'critical' as const,
          confidence: 0.9,
          description: 'Critical database issue',
          details: {},
          suggestedActions: ['Add indexes', 'Optimize query'],
        },
        {
          type: 'api' as const,
          severity: 'low' as const,
          confidence: 0.5,
          description: 'Minor API issue',
          details: {},
          suggestedActions: ['Check cache headers'],
        },
      ]

      const result = engine.prioritizeSuggestions(candidates, {} as any)

      expect(result.highPriority).toContain('Add indexes')
      expect(result.highPriority).toContain('Optimize query')
      expect(result.lowPriority).toContain('Check cache headers')
    })

    it('should return empty arrays for no candidates', () => {
      const result = engine.prioritizeSuggestions([], {} as any)

      expect(result.highPriority).toEqual([])
      expect(result.mediumPriority).toEqual([])
      expect(result.lowPriority).toEqual([])
    })
  })

  describe('Impact Estimation', () => {
    it('should estimate high impact for critical database issues', () => {
      const candidate = {
        type: 'database' as const,
        severity: 'critical' as const,
        confidence: 0.9,
        description: 'Critical database issue',
        details: {},
        suggestedActions: [],
      }

      const result = engine.estimateImpact(candidate)

      expect(result.metricImprovement).toBe('40-60%')
      expect(result.effort).toBe('high')
      expect(result.roi).toBe('high')
    })

    it('should estimate medium impact for medium severity issues', () => {
      const candidate = {
        type: 'api' as const,
        severity: 'medium' as const,
        confidence: 0.7,
        description: 'Medium API issue',
        details: {},
        suggestedActions: [],
      }

      const result = engine.estimateImpact(candidate)

      expect(result.metricImprovement).toBe('10-15%')
      expect(result.effort).toBe('low')
      expect(result.roi).toBe('medium')
    })

    it('should estimate high ROI for rendering critical issues', () => {
      const candidate = {
        type: 'rendering' as const,
        severity: 'critical' as const,
        confidence: 0.95,
        description: 'Critical rendering issue',
        details: {},
        suggestedActions: [],
      }

      const result = engine.estimateImpact(candidate)

      expect(result.metricImprovement).toBe('50-70%')
      expect(result.effort).toBe('high')
      expect(result.roi).toBe('high')
    })

    it('should estimate low effort for resource optimization', () => {
      const candidate = {
        type: 'resource' as const,
        severity: 'medium' as const,
        confidence: 0.6,
        description: 'Resource optimization needed',
        details: {},
        suggestedActions: [],
      }

      const result = engine.estimateImpact(candidate)

      expect(result.effort).toBe('low')
    })
  })
})