/**
 * Root Cause Analyzer
 * 根因分析器（增强版 - 集成缓存和高级分析规则）
 */

import {
  PerformanceContext,
  RootCause,
  RootCauseCandidate,
  RootCauseAnalysisConfig,
  DEFAULT_ROOT_CAUSE_CONFIG,
  SlowQuery,
  SlowAPICall,
  RenderingMetrics,
  MemoryMetrics,
  SlowResource,
  ResourceMetrics,
  NetworkInfo,
} from './types'
import { DatabaseTracker, QueryIssue } from './database-tracker'
import { APITracker, APIIssue } from './api-tracker'
import { RootCauseCache } from './cache'
import { AnalysisRuleEngine } from './analysis-rules'

/**
 * Custom error class for root cause analysis errors
 */
export class RootCauseAnalysisError extends Error {
  public readonly code: string
  public readonly metric?: string
  public readonly context?: PerformanceContext

  constructor(
    message: string,
    code: string,
    metric?: string,
    context?: PerformanceContext
  ) {
    super(message)
    this.name = 'RootCauseAnalysisError'
    this.code = code
    this.metric = metric
    this.context = context

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RootCauseAnalysisError)
    }
  }
}

/**
 * RootCauseAnalyzer - 根因分析核心类
 * 集成数据库追踪器、API追踪器、缓存机制和高级分析规则
 */
export class RootCauseAnalyzer {
  private config: RootCauseAnalysisConfig
  private databaseTracker: DatabaseTracker
  private apiTracker: APITracker
  private cache: RootCauseCache
  private ruleEngine: AnalysisRuleEngine
  private enableCache: boolean

  constructor(
    config: Partial<RootCauseAnalysisConfig> = {},
    databaseTracker?: DatabaseTracker,
    apiTracker?: APITracker,
    enableCache: boolean = true
  ) {
    this.config = { ...DEFAULT_ROOT_CAUSE_CONFIG, ...config }
    this.databaseTracker = databaseTracker || new DatabaseTracker()
    this.apiTracker = apiTracker || new APITracker()
    this.cache = new RootCauseCache(100, 5 * 60 * 1000) // 100 entries, 5 min TTL
    this.ruleEngine = new AnalysisRuleEngine()
    this.enableCache = enableCache

    // Cleanup cache periodically
    if (typeof window !== 'undefined') {
      setInterval(() => this.cache.cleanup(), 60000) // Every minute
    }
  }

  /**
   * Validate input parameters
   */
  private validateInput(metric: string, value: number, context: PerformanceContext): void {
    if (!metric || typeof metric !== 'string') {
      throw new RootCauseAnalysisError(
        'Invalid metric: must be a non-empty string',
        'INVALID_METRIC',
        metric,
        context
      )
    }

    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      throw new RootCauseAnalysisError(
        'Invalid value: must be a finite number',
        'INVALID_VALUE',
        metric,
        context
      )
    }

    if (!context || typeof context !== 'object') {
      throw new RootCauseAnalysisError(
        'Invalid context: must be a non-null object',
        'INVALID_CONTEXT',
        metric,
        context
      )
    }
  }

  /**
   * Analyze root cause for a performance issue
   * 分析性能问题的根因
   */
  analyze(metric: string, value: number, context: PerformanceContext): RootCause {
    // Validate inputs
    this.validateInput(metric, value, context)

    // Check cache first
    if (this.enableCache) {
      const cached = this.cache.get(metric, value, context)
      if (cached) {
        return {
          ...cached,
          analyzedAt: Date.now(),
          context,
        }
      }
    }

    const candidates: RootCauseCandidate[] = []

    try {
      // First, track all data so trackers have it
      if (context.slowQueries && context.slowQueries.length > 0) {
        for (const query of context.slowQueries) {
          this.databaseTracker.trackQuery(query.query, query.duration, query.rowCount, {
            table: query.table,
            type: query.type,
          })
        }
      }

      if (context.slowApis && context.slowApis.length > 0) {
        for (const api of context.slowApis) {
          this.apiTracker.trackApiCall(api.endpoint, api.method, api.duration, api.statusCode, {
            error: api.error,
            requestSize: api.requestSize,
            responseSize: api.responseSize,
          })
        }
      }

      // Check database queries
      if (context.slowQueries && context.slowQueries.length > 0) {
        const dbCandidate = this.analyzeDatabaseIssues(context.slowQueries)
        if (dbCandidate) {
          candidates.push(dbCandidate)
        }
      }

      // Check API calls
      if (context.slowApis && context.slowApis.length > 0) {
        const apiCandidate = this.analyzeApiIssues(context.slowApis)
        if (apiCandidate) {
          candidates.push(apiCandidate)
        }
      }

      // Check rendering performance
      if (context.rendering) {
        const renderingCandidate = this.analyzeRenderingIssues(context.rendering)
        if (renderingCandidate) {
          candidates.push(renderingCandidate)
        }
      }

      // Check resource loading
      if (context.resources) {
        const resourceCandidate = this.analyzeResources(context.resources)
        if (resourceCandidate) {
          candidates.push(resourceCandidate)
        }
      }

      // Check network
      if (context.network) {
        const networkCandidate = this.analyzeNetwork(context)
        if (networkCandidate) {
          candidates.push(networkCandidate)
        }
      }

      // Check memory (if available)
      if (context.memory) {
        const memoryCandidate = this.analyzeMemory(context.memory)
        if (memoryCandidate) {
          candidates.push(memoryCandidate)
        }
      }

      // Check CPU (if available)
      if (context.cpu) {
        const cpuCandidate = this.analyzeCPU(context.cpu)
        if (cpuCandidate) {
          candidates.push(cpuCandidate)
        }
      }
    } catch (error) {
      // Log error but continue with partial results
      console.error('Error during root cause analysis:', error)
    }

    // Sort by severity and confidence
    candidates.sort((a, b) => {
      const severityScore = this.severityScore(b.severity) - this.severityScore(a.severity)
      if (severityScore !== 0) return severityScore
      return b.confidence - a.confidence
    })

    // Filter low confidence candidates
    const filteredCandidates = candidates.filter(c => c.confidence >= this.config.minConfidence)

    // Limit candidate count
    const finalCandidates = filteredCandidates.slice(0, this.config.maxCandidates)

    const result: RootCause = {
      metric,
      timestamp: context.timestamp || Date.now(),
      candidates: finalCandidates,
      primaryCause: finalCandidates.length > 0 ? finalCandidates[0] : null,
      analyzedAt: Date.now(),
      context,
    }

    // Cache the result
    if (this.enableCache) {
      this.cache.set(metric, value, context, result)
    }

    return result
  }

  /**
   * Analyze database queries
   * 分析数据库查询
   */
  private analyzeDatabaseIssues(queries: SlowQuery[]): RootCauseCandidate | null {
    try {
      const issues = this.databaseTracker.identifyQueryIssues(queries)

      if (issues.length === 0) return null

      // Find slowest query
      const slowest = queries.reduce((a, b) => (a.duration > b.duration ? a : b))

      // Statistics
      const totalSlowQueries = queries.length
      const avgDuration = queries.reduce((sum, q) => sum + q.duration, 0) / totalSlowQueries
      const maxDuration = Math.max(...queries.map(q => q.duration))

      // Determine severity
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
      if (avgDuration > this.config.slowQueryThreshold * 3 || totalSlowQueries > 10) {
        severity = 'critical'
      } else if (avgDuration > this.config.slowQueryThreshold * 2 || totalSlowQueries > 5) {
        severity = 'high'
      } else if (avgDuration > this.config.slowQueryThreshold || totalSlowQueries > 2) {
        severity = 'medium'
      }

      // Calculate confidence
      const confidence = Math.min(avgDuration / (this.config.slowQueryThreshold * 2.5), 1)

      // Generate suggestions using rule engine
      const { suggestions: ruleSuggestions, severity: ruleSeverity } = this.ruleEngine.analyzeDatabaseRules(queries)

      // Override severity if rule engine found critical issues
      if (ruleSeverity === 'critical') severity = 'critical'
      else if (ruleSeverity === 'high' && severity === 'low') severity = 'high'

      // Generate suggestions
      const suggestedActions = new Set<string>()
      for (const issue of issues) {
        suggestedActions.add(issue.suggestion)
      }
      ruleSuggestions.forEach(s => suggestedActions.add(s))

      // Add general suggestions
      if (avgDuration > 2000) {
        suggestedActions.add('Review database indexing strategy')
        suggestedActions.add('Consider adding database connection pooling')
      }
      if (totalSlowQueries > 5) {
        suggestedActions.add('Check for N+1 query patterns')
        suggestedActions.add('Implement query result caching')
      }

      return {
        type: 'database',
        severity,
        confidence,
        description: `${totalSlowQueries} slow database queries detected (avg: ${avgDuration.toFixed(0)}ms, max: ${maxDuration.toFixed(0)}ms)`,
        details: {
          totalSlowQueries,
          avgDuration,
          maxDuration,
          slowestQuery: {
            query: slowest.query.substring(0, 200) + '...',
            duration: slowest.duration,
            type: slowest.type,
            rowCount: slowest.rowCount,
          },
          issues: issues.slice(0, 5),
        },
        suggestedActions: Array.from(suggestedActions),
        estimatedFixTime: this.estimateDatabaseFixTime(issues, avgDuration),
        relatedMetrics: ['LCP', 'FID', 'TTI', 'INP'],
      }
    } catch (error) {
      console.error('Error analyzing database issues:', error)
      return null
    }
  }

  /**
   * Analyze API calls
   * 分析 API 调用
   */
  private analyzeApiIssues(apis: SlowAPICall[]): RootCauseCandidate | null {
    try {
      if (apis.length === 0) return null

      const issues = this.apiTracker.identifyAPIIssues(apis)

      // Statistics
      const totalSlowApis = apis.length
      const avgDuration = apis.reduce((sum, a) => sum + a.duration, 0) / totalSlowApis
      const errorCount = apis.filter(a => a.statusCode >= 400 || a.error).length
      const errorRate = errorCount / totalSlowApis

      // Find slowest API
      const slowestApi = apis.reduce((a, b) => (a.duration > b.duration ? a : b), apis[0])

      // Determine severity
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
      if (errorRate > 0.3 || avgDuration > this.config.slowAPIThreshold * 5 || totalSlowApis > 15) {
        severity = 'critical'
      } else if (
        errorRate > 0.1 ||
        avgDuration > this.config.slowAPIThreshold * 3 ||
        totalSlowApis > 10
      ) {
        severity = 'high'
      } else if (
        errorRate > 0.05 ||
        avgDuration > this.config.slowAPIThreshold * 2 ||
        totalSlowApis > 5
      ) {
        severity = 'medium'
      } else if (avgDuration > this.config.slowAPIThreshold) {
        severity = 'medium'
      }

      // Calculate confidence
      const confidence = Math.min(avgDuration / (this.config.slowAPIThreshold * 2.5), 1)

      // Use rule engine for enhanced analysis
      const { suggestions: ruleSuggestions, severity: ruleSeverity } = this.ruleEngine.analyzeAPIRules(apis)

      // Override severity if rule engine found critical issues
      if (ruleSeverity === 'critical') severity = 'critical'
      else if (ruleSeverity === 'high' && severity === 'low') severity = 'high'

      // Generate suggestions
      const suggestedActions = new Set<string>()
      for (const issue of issues) {
        suggestedActions.add(issue.suggestion)
      }
      ruleSuggestions.forEach(s => suggestedActions.add(s))

      // Add general suggestions
      if (avgDuration > 3000) {
        suggestedActions.add('Implement API response caching')
        suggestedActions.add('Consider implementing pagination for large datasets')
      }
      if (errorRate > 0.1) {
        suggestedActions.add('Review and improve error handling')
        suggestedActions.add('Implement retry logic with exponential backoff')
      }
      suggestedActions.add('Review API payload sizes and implement compression')
      suggestedActions.add('Monitor API performance trends and set up alerts')

      if (suggestedActions.size === 0) {
        suggestedActions.add('Analyze API response patterns and optimize endpoints')
        suggestedActions.add('Check network latency and server response times')
      }

      return {
        type: 'api',
        severity,
        confidence,
        description: `${totalSlowApis} slow API calls detected (avg: ${avgDuration.toFixed(0)}ms, errors: ${errorCount}, error rate: ${(errorRate * 100).toFixed(1)}%)`,
        details: {
          totalSlowApis,
          avgDuration,
          errorCount,
          errorRate,
          slowestApi: {
            endpoint: slowestApi.endpoint,
            method: slowestApi.method,
            duration: slowestApi.duration,
            statusCode: slowestApi.statusCode,
          },
          issues: issues.slice(0, 5),
        },
        suggestedActions: Array.from(suggestedActions),
        estimatedFixTime: this.estimateAPIFixTime(issues, avgDuration),
        relatedMetrics: ['LCP', 'FID', 'INP'],
      }
    } catch (error) {
      console.error('Error analyzing API issues:', error)
      return null
    }
  }

  /**
   * Analyze rendering metrics
   * 分析渲染指标
   */
  private analyzeRenderingIssues(rendering: RenderingMetrics): RootCauseCandidate | null {
    try {
      const issues: string[] = []

      if (rendering.longTasks > 10) {
        issues.push(`${rendering.longTasks} long tasks detected`)
      }

      if (rendering.totalBlockingTime > 300) {
        issues.push(`High total blocking time: ${rendering.totalBlockingTime.toFixed(0)}ms`)
      }

      if (rendering.largestContentfulPaint && rendering.largestContentfulPaint > 4000) {
        issues.push(`Slow LCP: ${rendering.largestContentfulPaint.toFixed(0)}ms`)
      }

      if (rendering.cumulativeLayoutShift && rendering.cumulativeLayoutShift > 0.25) {
        issues.push(`High CLS: ${rendering.cumulativeLayoutShift.toFixed(3)}`)
      }

      if (rendering.firstInputDelay && rendering.firstInputDelay > 100) {
        issues.push(`Poor FID: ${rendering.firstInputDelay.toFixed(0)}ms`)
      }

      if (issues.length === 0) return null

      // Use rule engine for enhanced analysis
      const { suggestions: ruleSuggestions, severity: ruleSeverity } = this.ruleEngine.analyzeRenderingRules(rendering)

      // Determine severity
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
      if (
        rendering.longTasks > 50 ||
        rendering.totalBlockingTime > 1000 ||
        (rendering.largestContentfulPaint && rendering.largestContentfulPaint > 8000) ||
        (rendering.cumulativeLayoutShift && rendering.cumulativeLayoutShift > 0.5)
      ) {
        severity = 'critical'
      } else if (
        rendering.longTasks > 20 ||
        rendering.totalBlockingTime > 500 ||
        (rendering.largestContentfulPaint && rendering.largestContentfulPaint > 6000) ||
        (rendering.cumulativeLayoutShift && rendering.cumulativeLayoutShift > 0.35)
      ) {
        severity = 'high'
      } else if (
        rendering.longTasks > 10 ||
        rendering.totalBlockingTime > 300 ||
        (rendering.largestContentfulPaint && rendering.largestContentfulPaint > 4000) ||
        (rendering.cumulativeLayoutShift && rendering.cumulativeLayoutShift > 0.25)
      ) {
        severity = 'medium'
      }

      // Override severity if rule engine found more severe issues
      if (ruleSeverity === 'critical') severity = 'critical'
      else if (ruleSeverity === 'high' && severity === 'low') severity = 'high'

      // Calculate confidence
      const blockingTimeScore = Math.min(rendering.totalBlockingTime / 500, 1)
      const longTaskScore = Math.min(rendering.longTasks / 25, 1)
      const confidence = (blockingTimeScore + longTaskScore) / 2

      // Generate suggestions
      const suggestedActions: string[] = []
      ruleSuggestions.forEach(s => suggestedActions.push(s))

      if (rendering.longTasks > 10) {
        suggestedActions.push('Identify and break up long-running JavaScript tasks')
        suggestedActions.push('Use code splitting and lazy loading')
        suggestedActions.push('Consider using Web Workers for heavy computations')
        suggestedActions.push('Review and optimize component rendering logic')
      }
      if (rendering.totalBlockingTime > 300) {
        suggestedActions.push('Defer non-critical JavaScript execution')
        suggestedActions.push('Use requestIdleCallback for non-essential work')
        suggestedActions.push('Optimize event handlers and prevent layout thrashing')
      }
      if (rendering.largestContentfulPaint && rendering.largestContentfulPaint > 4000) {
        suggestedActions.push('Optimize LCP: preload critical resources')
        suggestedActions.push('Remove render-blocking resources')
        suggestedActions.push('Optimize images and use next-gen formats')
        suggestedActions.push('Minify and compress CSS/JS')
      }
      if (rendering.cumulativeLayoutShift && rendering.cumulativeLayoutShift > 0.25) {
        suggestedActions.push('Reserve space for images and ads')
        suggestedActions.push('Avoid inserting content above existing content')
        suggestedActions.push('Use CSS transforms for animations')
        suggestedActions.push('Ensure consistent font loading with font-display')
      }
      suggestedActions.push('Consider using React Compiler to reduce re-renders')
      suggestedActions.push('Implement virtual scrolling for long lists')

      return {
        type: 'rendering',
        severity,
        confidence,
        description: issues.join('; '),
        details: rendering,
        suggestedActions,
        estimatedFixTime: this.estimateRenderingFixTime(rendering),
        relatedMetrics: ['FID', 'TTI', 'LCP', 'CLS', 'INP'],
      }
    } catch (error) {
      console.error('Error analyzing rendering issues:', error)
      return null
    }
  }

  /**
   * Analyze resource loading
   * 分析资源加载
   */
  private analyzeResources(resources: ResourceMetrics): RootCauseCandidate | null {
    try {
      const slowResources = resources.slowResources || []
      const totalSize = resources.totalSize || 0

      if (slowResources.length === 0 && totalSize < this.config.resourceSizeThreshold * 2) {
        return null
      }

      // Use rule engine for enhanced analysis
      const { suggestions: ruleSuggestions, severity: ruleSeverity } = this.ruleEngine.analyzeResourceRules(resources)

      // Group by type
      const resourcesByType: Record<string, { count: number; totalSize: number }> = {}
      slowResources.forEach((r: SlowResource) => {
        if (!resourcesByType[r.type]) {
          resourcesByType[r.type] = { count: 0, totalSize: 0 }
        }
        resourcesByType[r.type].count++
        resourcesByType[r.type].totalSize += r.size
      })

      // Determine severity
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
      if (totalSize > this.config.resourceSizeThreshold * 5 || slowResources.length > 10) {
        severity = 'critical'
      } else if (totalSize > this.config.resourceSizeThreshold * 3 || slowResources.length > 5) {
        severity = 'high'
      } else if (totalSize > this.config.resourceSizeThreshold * 2 || slowResources.length > 3) {
        severity = 'medium'
      }

      // Override severity if rule engine found more severe issues
      if (ruleSeverity === 'critical') severity = 'critical'
      else if (ruleSeverity === 'high' && severity === 'low') severity = 'high'

      // Calculate confidence
      const confidence = Math.min(totalSize / (this.config.resourceSizeThreshold * 5), 1)

      // Generate suggestions
      const suggestedActions: string[] = []
      ruleSuggestions.forEach(s => suggestedActions.push(s))

      if (resourcesByType.image?.count > 0) {
        suggestedActions.push('Optimize images: use WebP format, resize, compress')
        suggestedActions.push('Implement responsive images with srcset and sizes')
      }
      if (resourcesByType.script?.count > 0) {
        suggestedActions.push('Minify and compress JavaScript files')
        suggestedActions.push('Implement code splitting for large bundles')
      }
      if (resourcesByType.stylesheet?.count > 0) {
        suggestedActions.push('Minify CSS and remove unused styles')
        suggestedActions.push('Inline critical CSS for above-the-fold content')
      }
      suggestedActions.push('Enable gzip/brotli compression')
      suggestedActions.push('Implement browser caching')
      suggestedActions.push('Use CDNs for static assets')

      return {
        type: 'resource',
        severity,
        confidence,
        description: `${slowResources.length} slow resources, total size: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`,
        details: {
          totalSize,
          slowResourcesCount: slowResources.length,
          resourcesByType,
        },
        suggestedActions,
        estimatedFixTime: this.estimateResourceFixTime(resourcesByType, totalSize),
        relatedMetrics: ['LCP', 'FCP', 'TTFB'],
      }
    } catch (error) {
      console.error('Error analyzing resource issues:', error)
      return null
    }
  }

  /**
   * Analyze network
   * 分析网络
   */
  private analyzeNetwork(context: PerformanceContext): RootCauseCandidate | null {
    try {
      if (!context.network) return null

      const { network } = context
      const issues: string[] = []

      if (network.type === 'unknown' || network.type === '2g') {
        issues.push('Slow or unknown network connection')
      }

      if (network.rtt && network.rtt > 300) {
        issues.push(`High network latency: ${network.rtt.toFixed(0)}ms RTT`)
      }

      if (network.downlink && network.downlink < 1) {
        issues.push(`Low network bandwidth: ${network.downlink.toFixed(1)}Mbps`)
      }

      if (issues.length === 0) return null

      const severity = 'medium'
      const confidence = 0.7

      return {
        type: 'network',
        severity,
        confidence,
        description: issues.join('; '),
        details: network,
        suggestedActions: [
          'Implement service worker caching for offline support',
          'Use progressive loading for large content',
          'Provide fallback content for slow connections',
          'Consider adaptive bitrate for media content',
        ],
        estimatedFixTime: '1-2 hours',
        relatedMetrics: ['LCP', 'FCP', 'TTFB'],
      }
    } catch (error) {
      console.error('Error analyzing network issues:', error)
      return null
    }
  }

  /**
   * Analyze memory usage
   * 分析内存使用
   */
  private analyzeMemory(memory: MemoryMetrics): RootCauseCandidate | null {
    try {
      const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100

      if (memoryUsage < 70) return null

      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
      if (memoryUsage > 90) {
        severity = 'critical'
      } else if (memoryUsage > 80) {
        severity = 'high'
      } else if (memoryUsage > 70) {
        severity = 'medium'
      }

      const confidence = memoryUsage / 100

      return {
        type: 'memory',
        severity,
        confidence,
        description: `High memory usage: ${memoryUsage.toFixed(1)}%`,
        details: {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          memoryUsage,
        },
        suggestedActions: [
          'Check for memory leaks (event listeners, closures)',
          'Implement object pooling and reuse',
          'Clear unnecessary references and caches',
          'Use weak references where appropriate',
          'Profile memory usage with DevTools',
        ],
        estimatedFixTime: '4-8 hours',
        relatedMetrics: ['FID', 'TTI'],
      }
    } catch (error) {
      console.error('Error analyzing memory issues:', error)
      return null
    }
  }

  /**
   * Analyze CPU usage
   * 分析 CPU 使用
   */
  private analyzeCPU(cpu: any): RootCauseCandidate | null {
    try {
      if (!cpu || !cpu.usage) return null

      const usage = cpu.usage
      if (usage < 50) return null

      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
      if (usage > 90) {
        severity = 'critical'
      } else if (usage > 75) {
        severity = 'high'
      } else if (usage > 50) {
        severity = 'medium'
      }

      const confidence = usage / 100

      return {
        type: 'cpu',
        severity,
        confidence,
        description: `High CPU usage: ${usage.toFixed(1)}%`,
        details: cpu,
        suggestedActions: [
          'Identify and optimize CPU-intensive JavaScript operations',
          'Use Web Workers for heavy computations',
          'Break up large tasks into smaller chunks',
          'Review and optimize event handlers',
          'Consider debouncing/throttling frequent operations',
        ],
        estimatedFixTime: '4-8 hours',
        relatedMetrics: ['FID', 'TTI'],
      }
    } catch (error) {
      console.error('Error analyzing CPU issues:', error)
      return null
    }
  }

  /**
   * Estimate database fix time
   * 估算数据库修复时间
   */
  private estimateDatabaseFixTime(issues: QueryIssue[], avgDuration: number): string {
    const hasCritical = issues.some(i => i.severity === 'critical')
    const hasLargeResult = issues.some(i => i.type === 'large-result')

    if (hasCritical) {
      return '8-16 hours'
    } else if (hasLargeResult || avgDuration > 3000) {
      return '4-8 hours'
    } else {
      return '2-4 hours'
    }
  }

  /**
   * Estimate API fix time
   * 估算 API 修复时间
   */
  private estimateAPIFixTime(issues: APIIssue[], avgDuration: number): string {
    const hasCritical = issues.some(i => i.severity === 'critical')
    const hasTimeout = issues.some(i => i.type === 'timeout')
    const hasServerError = issues.some(i => i.type === 'server-error')

    if (hasServerError) {
      return '4-8 hours'
    } else if (hasTimeout || hasCritical) {
      return '4-6 hours'
    } else if (avgDuration > 3000) {
      return '2-4 hours'
    } else {
      return '1-2 hours'
    }
  }

  /**
   * Estimate rendering fix time
   * 估算渲染修复时间
   */
  private estimateRenderingFixTime(rendering: RenderingMetrics): string {
    const totalBlockingTime = rendering.totalBlockingTime
    const longTasks = rendering.longTasks

    if (totalBlockingTime > 1000 || longTasks > 50) {
      return '8-16 hours'
    } else if (totalBlockingTime > 500 || longTasks > 20) {
      return '4-8 hours'
    } else {
      return '2-4 hours'
    }
  }

  /**
   * Estimate resource fix time
   * 估算资源修复时间
   */
  private estimateResourceFixTime(resourcesByType: Record<string, any>, totalSize: number): string {
    const hasImages = !!resourcesByType.image
    const hasScripts = !!resourcesByType.script

    if (totalSize > 5 * 1024 * 1024) {
      return '4-8 hours'
    } else if (hasImages && hasScripts) {
      return '2-4 hours'
    } else {
      return '1-2 hours'
    }
  }

  /**
   * Convert severity to numeric score
   * 将严重程度转换为数值分数
   */
  private severityScore(severity: string): number {
    return (
      {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
      }[severity] || 0
    )
  }

  /**
   * Update configuration
   * 更新配置
   */
  updateConfig(partialConfig: Partial<RootCauseAnalysisConfig>): void {
    this.config = { ...this.config, ...partialConfig }

    // Update cache settings if changed
    if (partialConfig.maxCandidates !== undefined) {
      // Recreate cache with new settings if needed
    }
  }

  /**
   * Enable or disable caching
   */
  setCacheEnabled(enabled: boolean): void {
    this.enableCache = enabled
    if (!enabled) {
      this.cache.clear()
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats()
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get database tracker
   * 获取数据库追踪器
   */
  getDatabaseTracker(): DatabaseTracker {
    return this.databaseTracker
  }

  /**
   * Get API tracker
   * 获取 API 追踪器
   */
  getApiTracker(): APITracker {
    return this.apiTracker
  }

  /**
   * Get rule engine
   * 获取规则引擎
   */
  getRuleEngine(): AnalysisRuleEngine {
    return this.ruleEngine
  }

  /**
   * Generate comprehensive report
   * 生成综合报告
   */
  generateReport(rootCause: RootCause): {
    summary: string
    metric: string
    timestamp: number
    severity: string
    candidates: RootCauseCandidate[]
    primaryCause: RootCauseCandidate | null
    recommendations: string[]
    quickWins: string[]
    prioritizedSuggestions: {
      highPriority: string[]
      mediumPriority: string[]
      lowPriority: string[]
    }
    impactAnalysis: Array<{
      type: string
      improvement: string
      effort: string
      roi: string
    }>
  } {
    const summary = rootCause.primaryCause
      ? `Primary cause: ${rootCause.primaryCause.type} (${rootCause.primaryCause.severity})`
      : 'No clear root cause identified'

    // Collect all suggestions
    const allSuggestions = new Set<string>()
    rootCause.candidates.forEach(c => {
      c.suggestedActions.forEach(s => allSuggestions.add(s))
    })

    // Extract quick wins
    const quickWins = Array.from(allSuggestions)
      .filter(s => s.length < 100 && !s.includes('implement') && !s.includes('consider'))
      .slice(0, 5)

    // Get prioritized suggestions from rule engine
    const prioritizedSuggestions = this.ruleEngine.prioritizeSuggestions(
      rootCause.candidates,
      rootCause.context || {} as PerformanceContext
    )

    // Generate impact analysis
    const impactAnalysis = rootCause.candidates.map(candidate => {
      const impact = this.ruleEngine.estimateImpact(candidate)
      return {
        type: candidate.type,
        improvement: impact.metricImprovement,
        effort: impact.effort,
        roi: impact.roi,
      }
    })

    return {
      summary,
      metric: rootCause.metric,
      timestamp: rootCause.timestamp,
      severity: rootCause.primaryCause?.severity || 'low',
      candidates: rootCause.candidates,
      primaryCause: rootCause.primaryCause,
      recommendations: Array.from(allSuggestions),
      quickWins,
      prioritizedSuggestions,
      impactAnalysis,
    }
  }
}

// Export singleton instance
export const rootCauseAnalyzer = new RootCauseAnalyzer()

// Export all types and modules
export * from './types'
export * from './database-tracker'
export * from './api-tracker'
export * from './cache'
export * from './analysis-rules'
