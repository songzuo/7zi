/**
 * Root Cause Analyzer
 *
 * Core module for automated root cause analysis of performance issues
 */

import {
  RootCause,
  RootCauseType,
  Severity,
  SeverityLevel,
  AnalysisReport,
  ReportSummary,
  PrioritizedAction,
  PerformanceMetrics,
  FixRecommendation,
  WaterfallAnalysis,
  WaterfallEntry,
  WaterfallBottleneck,
  OptimizationOpportunity,
  CriticalPathNode,
  RootCauseAnalysisConfig,
  DEFAULT_CONFIG,
  Impact,
  DatabaseAnalysis,
  APIAnalysis,
  RenderingAnalysis,
  DatabaseIssue,
  DatabaseQuery,
  APIRequest,
  RenderingMetrics,
  APIIssue,
} from './types'

import { DatabaseTracker } from './database-tracker'
import { APITracker } from './api-tracker'
import { RenderingTracker } from './rendering-tracker'

// ============================================================================
// Root Cause Analyzer Class
// ============================================================================

/**
 * Root Cause Analyzer
 *
 * Core module for automated root cause analysis of performance issues.
 * Provides comprehensive analysis capabilities including:
 * - Performance waterfall analysis
 * - Slow request tracing
 * - Resource usage analysis
 * - Code-level hot path identification
 *
 * @example
 * ```typescript
 * const analyzer = new RootCauseAnalyzer();
 *
 * // Track some performance data
 * analyzer.trackDatabaseQuery({ query: 'SELECT * FROM users', duration: 500, operation: 'SELECT' });
 * analyzer.trackAPIRequest({ endpoint: '/api/users', method: 'GET', duration: 300, statusCode: 200 });
 *
 * // Generate report
 * const report = analyzer.generateReport();
 * console.log(report.summary);
 * ```
 */
export class RootCauseAnalyzer {
  private config: RootCauseAnalysisConfig
  private databaseTracker: DatabaseTracker
  private apiTracker: APITracker
  private renderingTracker: RenderingTracker
  private analysisHistory: AnalysisReport[] = []

  constructor(config: Partial<RootCauseAnalysisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.databaseTracker = new DatabaseTracker(this.config)
    this.apiTracker = new APITracker(this.config)
    this.renderingTracker = new RenderingTracker(this.config)
  }

  // ============================================================================
  // Performance Waterfall Analysis
  // ============================================================================

  /**
   * Analyze performance waterfall for bottlenecks
   *
   * @param entries - Array of performance entries from Performance API
   * @returns Detailed waterfall analysis with bottlenecks and optimization opportunities
   *
   * @example
   * ```typescript
   * const entries = performance.getEntriesByType('navigation');
   * const analysis = analyzer.analyzeWaterfall(entries);
   * console.log(analysis.bottlenecks);
   * ```
   */
  analyzeWaterfall(entries: PerformanceEntry[]): WaterfallAnalysis {
    const waterfallEntries = this.convertToWaterfallEntries(entries)
    const criticalPath = this.calculateCriticalPath(waterfallEntries)
    const bottlenecks = this.identifyWaterfallBottlenecks(waterfallEntries, criticalPath)
    const optimizationOpportunities = this.identifyOptimizationOpportunities(waterfallEntries)
    const summary = this.calculateWaterfallSummary(waterfallEntries, criticalPath)

    return {
      entries: waterfallEntries,
      criticalPath,
      bottlenecks,
      optimizationOpportunities,
      summary,
    }
  }

  /**
   * Convert PerformanceEntry[] to WaterfallEntry[]
   */
  private convertToWaterfallEntries(entries: PerformanceEntry[]): WaterfallEntry[] {
    return entries.map((entry, index) => {
      const type = this.classifyEntryType(entry)
      const blockingTime = this.calculateBlockingTime(entry)

      return {
        id: `entry-${index}`,
        name: entry.name,
        type,
        startTime: entry.startTime,
        duration: entry.duration,
        status: 'complete',
        blockingTime,
        criticalPath: false,
        priority: this.estimatePriority(type),
      }
    })
  }

  /**
   * Classify performance entry type
   */
  private classifyEntryType(entry: PerformanceEntry): WaterfallEntry['type'] {
    const name = entry.name.toLowerCase()

    if (name.includes('navigate') || name.includes('document')) {
      return 'navigation'
    }
    if (name.endsWith('.js') || name.includes('script')) {
      return 'script'
    }
    if (name.endsWith('.css') || name.includes('stylesheet')) {
      return 'stylesheet'
    }
    if (name.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)/i)) {
      return 'image'
    }
    if (name.includes('/api/') || name.includes('xhr') || name.includes('fetch')) {
      return 'fetch'
    }

    return 'resource'
  }

  /**
   * Calculate blocking time for an entry
   */
  private calculateBlockingTime(entry: PerformanceEntry): number {
    const name = entry.name.toLowerCase()
    if (name.endsWith('.js') && !name.includes('async') && !name.includes('defer')) {
      return entry.duration
    }
    if (name.endsWith('.css')) {
      return entry.duration
    }
    return 0
  }

  /**
   * Estimate priority for an entry
   */
  private estimatePriority(type: WaterfallEntry['type']): number {
    const priorities: Record<WaterfallEntry['type'], number> = {
      navigation: 100,
      stylesheet: 90,
      script: 80,
      fetch: 70,
      xhr: 65,
      image: 50,
      resource: 30,
    }
    return priorities[type] || 50
  }

  /**
   * Calculate critical path
   */
  private calculateCriticalPath(entries: WaterfallEntry[]): CriticalPathNode[] {
    const criticalEntries = entries
      .filter(e => e.blockingTime > 0)
      .sort((a, b) => a.startTime - b.startTime)

    const nodes: CriticalPathNode[] = []
    let previousEntry: WaterfallEntry | null = null

    for (const entry of criticalEntries) {
      const blockers = previousEntry ? [previousEntry] : []
      const blockedBy = blockers

      nodes.push({
        entry: { ...entry, criticalPath: true },
        blockers,
        blockedBy,
        level: nodes.length,
      })

      previousEntry = entry
    }

    return nodes
  }

  /**
   * Identify waterfall bottlenecks
   */
  private identifyWaterfallBottlenecks(
    entries: WaterfallEntry[],
    criticalPath: CriticalPathNode[]
  ): WaterfallBottleneck[] {
    const bottlenecks: WaterfallBottleneck[] = []

    // Sequential loading bottleneck
    const sequentialEntries = entries.filter((entry, i) => {
      const prevEntry = entries[i - 1]
      return prevEntry && entry.startTime > prevEntry.startTime + prevEntry.duration
    })

    if (sequentialEntries.length > 3) {
      bottlenecks.push({
        id: `bottleneck-sequential-${Date.now()}`,
        type: 'sequential-loading',
        severity: this.calculateSequentialSeverity(sequentialEntries),
        description: `${sequentialEntries.length} resources loaded sequentially instead of in parallel`,
        affectedEntries: sequentialEntries,
        impact: `${sequentialEntries.length}x potential slowdown`,
        recommendation: 'Use preloading or parallel loading strategies',
      })
    }

    // Large resource bottleneck
    const largeResources = entries.filter(e => e.duration > 1000)
    if (largeResources.length > 0) {
      bottlenecks.push({
        id: `bottleneck-large-${Date.now()}`,
        type: 'large-resource',
        severity: {
          level: 'medium',
          score: 60 + largeResources.length * 5,
          label: '🟡 Medium - Large resources detected',
        },
        description: `${largeResources.length} large resources slow loading`,
        affectedEntries: largeResources,
        impact: 'Increased load time',
        recommendation: 'Compress resources and use modern formats',
      })
    }

    // Blocking resource bottleneck
    const blockingResources = entries.filter(e => e.blockingTime > 50)
    if (blockingResources.length > 0) {
      bottlenecks.push({
        id: `bottleneck-blocking-${Date.now()}`,
        type: 'blocking-resource',
        severity: {
          level: 'high',
          score: 70 + Math.min(blockingResources.length * 3, 25),
          label: '🟠 High - Blocking resources detected',
        },
        description: `${blockingResources.length} resources block rendering`,
        affectedEntries: blockingResources,
        impact: 'Delayed rendering',
        recommendation: 'Use async/defer for scripts, inline critical CSS',
      })
    }

    return bottlenecks
  }

  /**
   * Calculate severity for sequential loading
   */
  private calculateSequentialSeverity(entries: WaterfallEntry[]): Severity {
    const totalGap = entries.reduce((sum, entry, i) => {
      const prev = entries[i - 1]
      if (prev) {
        return sum + (entry.startTime - (prev.startTime + prev.duration))
      }
      return sum
    }, 0)

    const level: SeverityLevel = totalGap > 3000 ? 'high' : totalGap > 1500 ? 'medium' : 'low'
    const score = level === 'high' ? 80 : level === 'medium' ? 60 : 40

    return {
      level,
      score,
      label: this.getSeverityLabel(level),
    }
  }

  /**
   * Identify optimization opportunities
   */
  private identifyOptimizationOpportunities(entries: WaterfallEntry[]): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = []

    // Preload opportunities
    const criticalResources = entries.filter(e => e.type === 'script' || e.type === 'stylesheet')

    criticalResources.forEach(entry => {
      if (entry.duration > 100) {
        opportunities.push({
          id: `opt-preload-${entry.id}`,
          type: 'preload',
          target: entry.name,
          estimatedImprovement: 20,
          complexity: 'low',
          description: `Preload ${entry.name} for faster loading`,
        })
      }
    })

    // Lazy load opportunities
    const images = entries.filter(e => e.type === 'image')
    images.forEach(entry => {
      if (entry.startTime > 2000) {
        opportunities.push({
          id: `opt-lazy-${entry.id}`,
          type: 'lazy-load',
          target: entry.name,
          estimatedImprovement: 15,
          complexity: 'low',
          description: `Lazy load image ${entry.name}`,
        })
      }
    })

    return opportunities
  }

  /**
   * Calculate waterfall summary
   */
  private calculateWaterfallSummary(
    entries: WaterfallEntry[],
    criticalPath: CriticalPathNode[]
  ): {
    totalDuration: number
    criticalPathDuration: number
    potentialImprovement: number
    parallelizationScore: number
  } {
    const totalDuration =
      entries.length > 0 ? Math.max(...entries.map(e => e.startTime + e.duration)) : 0

    const criticalPathDuration =
      criticalPath.length > 0 ? criticalPath.reduce((sum, node) => sum + node.entry.duration, 0) : 0

    const potentialImprovement =
      entries.length > 0
        ? Math.min((entries.filter(e => e.duration > 500).length / entries.length) * 40, 50)
        : 0

    const overlapping = entries.filter((entry, i) => {
      const prevEntry = entries[i - 1]
      return prevEntry && entry.startTime < prevEntry.startTime + prevEntry.duration
    })

    const parallelizationScore =
      entries.length > 0 ? Math.round((overlapping.length / entries.length) * 100) : 100

    return {
      totalDuration,
      criticalPathDuration,
      potentialImprovement,
      parallelizationScore,
    }
  }

  // ============================================================================
  // Slow Request Tracing
  // ============================================================================

  /**
   * Trace a slow request to identify root causes
   *
   * @param requestId - Unique identifier for the request
   * @returns Detailed trace of the slow request with root causes
   */
  traceSlowRequest(requestId: string): SlowRequestTrace {
    const history = this.apiTracker.getHistory()
    const request = history.find(r => r.id === requestId)

    if (!request) {
      return {
        requestId,
        found: false,
        rootCauses: [],
        timeline: [],
      }
    }

    const relatedQueries = this.databaseTracker
      .getHistory()
      .filter(q => Math.abs(q.timestamp - request.timestamp) < 1000)

    const rootCauses = this.identifyRequestRootCauses(request, relatedQueries)
    const timeline = this.buildRequestTimeline(request, relatedQueries)

    return {
      requestId,
      found: true,
      request,
      relatedQueries,
      rootCauses,
      timeline,
      totalDuration: request.duration,
    }
  }

  /**
   * Identify root causes for a slow request
   */
  private identifyRequestRootCauses(
    request: APIRequest,
    relatedQueries: DatabaseQuery[]
  ): RootCause[] {
    const causes: RootCause[] = []

    const slowQueries = relatedQueries.filter(
      q => q.duration > this.config.database.slowQueryThreshold
    )
    if (slowQueries.length > 0) {
      const totalQueryTime = slowQueries.reduce((sum, q) => sum + q.duration, 0)
      const contribution = (totalQueryTime / request.duration) * 100

      causes.push({
        id: `cause-db-${Date.now()}`,
        type: 'database',
        severity: this.calculateDatabaseSeverity(slowQueries),
        confidence: Math.min(70 + contribution, 95),
        title: 'Slow Database Queries',
        description: `${slowQueries.length} slow database queries detected during request`,
        evidence: slowQueries.map(q => `Query: ${q.query.substring(0, 50)}... (${q.duration}ms)`),
        impact: {
          userExperience: 'Increased response time',
          performance: `${contribution.toFixed(1)}% of request time`,
        },
        fixRecommendations: this.generateDatabaseFixes(slowQueries),
        estimatedFixTime: '2-8 hours',
        priority: Math.min(8 + Math.floor(contribution / 10), 10),
        detectedAt: Date.now(),
      })
    }

    if (request.issues.includes('timeout')) {
      causes.push({
        id: `cause-timeout-${Date.now()}`,
        type: 'network',
        severity: { level: 'critical', score: 95, label: '🔴 Critical' },
        confidence: 90,
        title: 'Request Timeout',
        description: 'Request exceeded timeout threshold',
        evidence: [`Duration: ${request.duration}ms`],
        impact: {
          userExperience: 'Request failed',
          performance: 'Complete failure',
        },
        fixRecommendations: [
          {
            id: 'fix-timeout',
            title: 'Optimize or increase timeout',
            description: 'Either optimize the underlying operation or increase timeout',
            actionItems: [
              'Profile the operation',
              'Optimize bottlenecks',
              'Increase timeout if needed',
            ],
            complexity: 'medium',
            estimatedTime: '2-6 hours',
            risk: 'low',
          },
        ],
        estimatedFixTime: '2-6 hours',
        priority: 10,
        detectedAt: Date.now(),
      })
    }

    return causes.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Build request timeline
   */
  private buildRequestTimeline(
    request: APIRequest,
    relatedQueries: DatabaseQuery[]
  ): TimelineEntry[] {
    const timeline: TimelineEntry[] = []

    timeline.push({
      timestamp: request.timestamp,
      type: 'request',
      name: `API Request: ${request.endpoint}`,
      duration: request.duration,
    })

    relatedQueries.forEach(query => {
      timeline.push({
        timestamp: query.timestamp,
        type: 'database',
        name: `DB Query: ${query.operation}`,
        duration: query.duration,
      })
    })

    return timeline.sort((a, b) => a.timestamp - b.timestamp)
  }

  // ============================================================================
  // Resource Usage Analysis
  // ============================================================================

  /**
   * Analyze resource usage for performance bottlenecks
   *
   * @returns Comprehensive resource usage analysis
   */
  analyzeResourceUsage(): ResourceAnalysis {
    const dbAnalysis = this.databaseTracker.analyze()
    const apiAnalysis = this.apiTracker.analyze()
    const renderingAnalysis = this.renderingTracker.analyze()

    const longTasks = this.renderingTracker.getLongTasks()
    const cpuBottlenecks = this.identifyCPUBottlenecks(longTasks)
    const memoryBottlenecks = this.identifyMemoryBottlenecks(dbAnalysis, apiAnalysis)
    const networkBottlenecks = this.identifyNetworkBottlenecks(apiAnalysis)

    return {
      cpu: {
        utilization: this.calculateCPUUtilization(longTasks),
        bottlenecks: cpuBottlenecks,
        recommendations: this.generateCPURecommendations(cpuBottlenecks),
      },
      memory: {
        usage: this.estimateMemoryUsage(dbAnalysis, apiAnalysis),
        bottlenecks: memoryBottlenecks,
        recommendations: this.generateMemoryRecommendations(memoryBottlenecks),
      },
      network: {
        latency: this.calculateAverageLatency(apiAnalysis),
        bottlenecks: networkBottlenecks,
        recommendations: this.generateNetworkRecommendations(networkBottlenecks),
      },
      database: dbAnalysis,
      api: apiAnalysis,
      rendering: renderingAnalysis,
    }
  }

  /**
   * Identify CPU bottlenecks
   */
  private identifyCPUBottlenecks(
    longTasks: Array<{ duration: number; attribution?: string }>
  ): ResourceBottleneck[] {
    const bottlenecks: ResourceBottleneck[] = []

    const totalBlockingTime = longTasks.reduce((sum, t) => sum + t.duration, 0)
    if (totalBlockingTime > this.config.rendering.tbtThreshold) {
      bottlenecks.push({
        type: 'javascript',
        severity:
          totalBlockingTime > 600 ? 'critical' : totalBlockingTime > 300 ? 'high' : 'medium',
        description: `Total blocking time: ${totalBlockingTime.toFixed(0)}ms`,
        impact: 'Main thread is blocked',
        source: longTasks[0]?.attribution || 'unknown',
      })
    }

    return bottlenecks
  }

  /**
   * Identify memory bottlenecks
   */
  private identifyMemoryBottlenecks(
    dbAnalysis: DatabaseAnalysis,
    apiAnalysis: APIAnalysis
  ): ResourceBottleneck[] {
    const bottlenecks: ResourceBottleneck[] = []

    const largeResults =
      dbAnalysis.criticalIssues?.filter((issue: DatabaseIssue) => issue.type === 'large-result') ||
      []

    if (largeResults.length > 0) {
      bottlenecks.push({
        type: 'memory',
        severity: 'medium',
        description: `${largeResults.length} queries returning large result sets`,
        impact: 'High memory usage',
        source: 'Database queries',
      })
    }

    return bottlenecks
  }

  /**
   * Identify network bottlenecks
   */
  private identifyNetworkBottlenecks(apiAnalysis: APIAnalysis): ResourceBottleneck[] {
    const bottlenecks: ResourceBottleneck[] = []

    if (apiAnalysis.requestStatistics?.errorRate > this.config.api.errorRateThreshold) {
      bottlenecks.push({
        type: 'network',
        severity: 'high',
        description: `Error rate: ${(apiAnalysis.requestStatistics.errorRate * 100).toFixed(2)}%`,
        impact: 'Unreliable connections',
        source: 'API requests',
      })
    }

    return bottlenecks
  }

  /**
   * Calculate CPU utilization
   */
  private calculateCPUUtilization(longTasks: Array<{ duration: number }>): number {
    const totalBlockingTime = longTasks.reduce((sum, t) => sum + t.duration, 0)
    return Math.min(totalBlockingTime / 100, 100)
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(dbAnalysis: DatabaseAnalysis, apiAnalysis: APIAnalysis): number {
    const dbRows =
      dbAnalysis.queryStatistics?.topSlowQueries?.reduce(
        (sum: number, q: DatabaseQuery) => sum + (q.rowCount || 0),
        0
      ) || 0

    const apiPayloads = apiAnalysis.requestStatistics?.averagePayloadSize || 0
    return Math.min((dbRows / 100000 + apiPayloads / 10485760) * 50, 100)
  }

  /**
   * Calculate average latency
   */
  private calculateAverageLatency(apiAnalysis: APIAnalysis): number {
    return apiAnalysis.requestStatistics?.averageDuration || 0
  }

  /**
   * Generate CPU recommendations
   */
  private generateCPURecommendations(bottlenecks: ResourceBottleneck[]): string[] {
    return bottlenecks.map(b => {
      if (b.type === 'javascript') {
        return 'Split long tasks using setTimeout or Web Workers'
      }
      return `Address ${b.type} bottleneck`
    })
  }

  /**
   * Generate memory recommendations
   */
  private generateMemoryRecommendations(bottlenecks: ResourceBottleneck[]): string[] {
    return bottlenecks.map(b => {
      if (b.type === 'memory') {
        return 'Implement pagination and limit result set sizes'
      }
      return `Address ${b.type} bottleneck`
    })
  }

  /**
   * Generate network recommendations
   */
  private generateNetworkRecommendations(bottlenecks: ResourceBottleneck[]): string[] {
    return bottlenecks.map(b => {
      if (b.type === 'network') {
        return 'Implement retry logic and optimize API calls'
      }
      return `Address ${b.type} bottleneck`
    })
  }

  // ============================================================================
  // Hot Path Identification
  // ============================================================================

  /**
   * Identify code-level hot paths
   *
   * @returns Array of hot paths with performance impact
   */
  identifyHotPath(): HotPath[] {
    const hotPaths: HotPath[] = []

    // Analyze database queries for hot paths
    const dbAnalysis = this.databaseTracker.analyze()
    dbAnalysis.queryStatistics?.topSlowQueries
      ?.slice(0, 5)
      .forEach((query: DatabaseQuery, index: number) => {
        hotPaths.push({
          id: `hotpath-db-${index}`,
          location: query.table || 'unknown',
          type: 'database',
          frequency: this.countQueryFrequency(query),
          totalDuration: query.duration,
          averageDuration: query.duration,
          impact: query.duration * this.countQueryFrequency(query),
          recommendations: this.generateQueryHotPathRecommendations(query),
        })
      })

    // Analyze API requests for hot paths
    const apiAnalysis = this.apiTracker.analyze()
    const slowEndpoints = apiAnalysis.requestStatistics.topSlowEndpoints
    slowEndpoints.forEach((request: APIRequest, index: number) => {
      hotPaths.push({
        id: `hotpath-api-${index}`,
        location: request.endpoint,
        type: 'api',
        frequency: this.countRequestFrequency(request),
        totalDuration: request.duration,
        averageDuration: request.duration,
        impact: request.duration * this.countRequestFrequency(request),
        recommendations: this.generateAPIHotPathRecommendations(request),
      })
    })

    // Analyze rendering for hot paths
    const longTasks = this.renderingTracker.getLongTasks()
    longTasks.slice(0, 5).forEach((task, index: number) => {
      hotPaths.push({
        id: `hotpath-render-${index}`,
        location: task.attribution || 'unknown',
        type: 'rendering',
        frequency: 1,
        totalDuration: task.duration,
        averageDuration: task.duration,
        impact: task.duration,
        recommendations: [
          'Optimize JavaScript execution',
          'Use Web Workers for CPU-intensive work',
        ],
      })
    })

    return hotPaths.sort((a, b) => b.impact - a.impact)
  }

  /**
   * Count query frequency
   */
  private countQueryFrequency(query: DatabaseQuery): number {
    const history = this.databaseTracker.getHistory()
    return history.filter(q => this.isSimilarQuery(q.query, query.query)).length
  }

  /**
   * Check if queries are similar
   */
  private isSimilarQuery(a: string, b: string): boolean {
    const normalize = (q: string) => q.replace(/\s+/g, ' ').toLowerCase()
    return normalize(a) === normalize(b)
  }

  /**
   * Count request frequency
   */
  private countRequestFrequency(request: APIRequest): number {
    const history = this.apiTracker.getHistory()
    return history.filter(r => r.endpoint === request.endpoint).length
  }

  /**
   * Generate query hot path recommendations
   */
  private generateQueryHotPathRecommendations(query: DatabaseQuery): string[] {
    const recommendations: string[] = []

    if (query.issues.includes('full-scan')) {
      recommendations.push('Add index to avoid full table scan')
    }
    if (query.issues.includes('n-plus-1')) {
      recommendations.push('Use batching or JOINs instead of N+1 queries')
    }
    if (query.issues.includes('missing-index')) {
      recommendations.push('Add index on frequently queried columns')
    }

    return recommendations.length > 0
      ? recommendations
      : ['Review query for optimization opportunities']
  }

  /**
   * Generate API hot path recommendations
   */
  private generateAPIHotPathRecommendations(request: APIRequest): string[] {
    const recommendations: string[] = []

    if (request.issues.includes('slow-response')) {
      recommendations.push('Optimize endpoint performance')
    }
    if (request.issues.includes('timeout')) {
      recommendations.push('Implement caching or background processing')
    }

    return recommendations.length > 0
      ? recommendations
      : ['Review endpoint for optimization opportunities']
  }

  // ============================================================================
  // Comprehensive Analysis Report
  // ============================================================================

  /**
   * Generate a comprehensive analysis report
   *
   * @returns Complete analysis report with prioritized actions
   */
  generateReport(): AnalysisReport {
    const startTime = Date.now()

    const resourceAnalysis = this.analyzeResourceUsage()
    const hotPaths = this.identifyHotPath()
    const rootCauses = this.compileRootCauses(resourceAnalysis, hotPaths)
    const summary = this.generateSummary(rootCauses)
    const prioritizedActions = this.prioritizeActions(rootCauses)

    const metrics: PerformanceMetrics = {
      lcp: resourceAnalysis.rendering.metrics[resourceAnalysis.rendering.metrics.length - 1]?.lcp,
      cls: resourceAnalysis.rendering.metrics.reduce(
        (sum: number, m: RenderingMetrics) => sum + (m.cls || 0),
        0
      ),
      fid: resourceAnalysis.rendering.metrics[resourceAnalysis.rendering.metrics.length - 1]?.fid,
      tbt: resourceAnalysis.rendering.metrics.reduce(
        (sum: number, m: RenderingMetrics) => sum + (m.tbt || 0),
        0
      ),
      databaseQueries: resourceAnalysis.database.queryStatistics.totalQueries,
      averageQueryTime: resourceAnalysis.database.queryStatistics.averageDuration,
      apiRequests: resourceAnalysis.api.requestStatistics.totalRequests,
      averageApiResponseTime: resourceAnalysis.api.requestStatistics.averageDuration,
      errorRate: resourceAnalysis.api.requestStatistics.errorRate,
      totalBlockingTime: resourceAnalysis.rendering.metrics.reduce(
        (sum: number, m: RenderingMetrics) => sum + m.longTaskDuration,
        0
      ),
    }

    const report: AnalysisReport = {
      id: `report-${Date.now()}`,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      summary,
      rootCauses,
      prioritizedActions,
      metrics,
      nextSteps: this.generateNextSteps(rootCauses),
    }

    this.analysisHistory.push(report)
    this.pruneHistory()

    return report
  }

  /**
   * Compile root causes from all analyses
   */
  private compileRootCauses(resourceAnalysis: ResourceAnalysis, hotPaths: HotPath[]): RootCause[] {
    const causes: RootCause[] = []

    // Add database root causes
    resourceAnalysis.database.criticalIssues.forEach((issue: DatabaseIssue) => {
      causes.push({
        id: `cause-${issue.id}`,
        type: 'database',
        severity: issue.severity,
        confidence: 80,
        title: issue.description,
        description: `Database issue: ${issue.type}`,
        evidence: issue.affectedQueries.map((q: DatabaseQuery) => q.query.substring(0, 50)),
        impact: {
          userExperience: 'Slow data operations',
          performance: issue.impact,
        },
        fixRecommendations: [
          {
            id: `fix-${issue.id}`,
            title: `Fix ${issue.type}`,
            description: 'Address the database issue',
            actionItems: ['Review and fix the issue'],
            complexity: 'medium',
            estimatedTime: '2-6 hours',
            risk: 'low',
          },
        ],
        estimatedFixTime: '2-6 hours',
        priority: this.severityToPriority(issue.severity),
        detectedAt: Date.now(),
      })
    })

    // Add API root causes
    resourceAnalysis.api.criticalIssues.forEach((issue: APIIssue) => {
      causes.push({
        id: `cause-${issue.id}`,
        type: 'api',
        severity: issue.severity,
        confidence: 85,
        title: issue.description,
        description: `API issue: ${issue.type}`,
        evidence: [issue.impact],
        impact: {
          userExperience: 'Slow API responses',
          performance: issue.impact,
        },
        fixRecommendations: [
          {
            id: `fix-${issue.id}`,
            title: `Fix ${issue.type}`,
            description: 'Address the API issue',
            actionItems: ['Review and fix the issue'],
            complexity: 'medium',
            estimatedTime: '2-6 hours',
            risk: 'low',
          },
        ],
        estimatedFixTime: '2-6 hours',
        priority: this.severityToPriority(issue.severity),
        detectedAt: Date.now(),
      })
    })

    return causes.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Generate summary from root causes
   */
  private generateSummary(rootCauses: RootCause[]): ReportSummary {
    const total = rootCauses.length
    const critical = rootCauses.filter(r => r.severity.level === 'critical').length
    const high = rootCauses.filter(r => r.severity.level === 'high').length
    const medium = rootCauses.filter(r => r.severity.level === 'medium').length
    const low = rootCauses.filter(r => r.severity.level === 'low').length

    const primaryRootCauses = rootCauses.slice(0, 3).map(r => r.title)
    const score = Math.max(100 - (critical * 25 + high * 15 + medium * 5 + low * 2), 0)

    return {
      totalIssues: total,
      criticalIssues: critical,
      highIssues: high,
      mediumIssues: medium,
      lowIssues: low,
      primaryRootCauses,
      overallScore: score,
    }
  }

  /**
   * Prioritize actions
   */
  private prioritizeActions(rootCauses: RootCause[]): PrioritizedAction[] {
    return rootCauses.map((cause, index) => ({
      priority: index + 1,
      rootCauseId: cause.id,
      action: cause.title,
      estimatedImpact: cause.impact.performance,
      estimatedTime: cause.estimatedFixTime,
      complexity: cause.fixRecommendations[0]?.complexity || 'medium',
    }))
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(rootCauses: RootCause[]): string[] {
    const steps: string[] = []
    const topCauses = rootCauses.slice(0, 5)

    topCauses.forEach((cause, index) => {
      steps.push(`${index + 1}. Address: ${cause.title}`)
    })

    return steps
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Calculate database severity
   */
  private calculateDatabaseSeverity(queries: DatabaseQuery[]): Severity {
    const avgDuration = queries.reduce((sum, q) => sum + q.duration, 0) / queries.length
    const level: SeverityLevel =
      avgDuration > 5000 ? 'critical' : avgDuration > 2000 ? 'high' : 'medium'
    const score = level === 'critical' ? 95 : level === 'high' ? 80 : 60

    return {
      level,
      score,
      label: this.getSeverityLabel(level),
    }
  }

  /**
   * Generate database fixes
   */
  private generateDatabaseFixes(queries: DatabaseQuery[]): FixRecommendation[] {
    return queries.slice(0, 3).map((query, index) => ({
      id: `fix-db-${index}`,
      title: `Optimize query ${index + 1}`,
      description: `Optimize slow query: ${query.query.substring(0, 30)}...`,
      actionItems: ['Add appropriate indexes', 'Review query structure'],
      complexity: 'medium' as const,
      estimatedTime: '2-4 hours',
      risk: 'low' as const,
    }))
  }

  /**
   * Convert severity to priority
   */
  private severityToPriority(severity: Severity): number {
    switch (severity.level) {
      case 'critical':
        return 10
      case 'high':
        return 7
      case 'medium':
        return 5
      case 'low':
        return 3
      default:
        return 1
    }
  }

  /**
   * Get severity label
   */
  private getSeverityLabel(level: SeverityLevel): string {
    const labels: Record<SeverityLevel, string> = {
      critical: '🔴 Critical - Immediate attention required',
      high: '🟠 High - Should be addressed soon',
      medium: '🟡 Medium - Should be optimized',
      low: '🟢 Low - Minor improvement',
      info: 'ℹ️ Info - For awareness',
    }
    return labels[level]
  }

  /**
   * Prune history
   */
  private pruneHistory(): void {
    if (this.analysisHistory.length > this.config.history.maxEntries) {
      this.analysisHistory = this.analysisHistory.slice(-this.config.history.maxEntries)
    }
  }

  // ============================================================================
  // Public Tracking API
  // ============================================================================

  /**
   * Track a database query
   */
  trackDatabaseQuery(
    query: Parameters<DatabaseTracker['trackQuery']>[0]
  ): ReturnType<DatabaseTracker['trackQuery']> {
    return this.databaseTracker.trackQuery(query)
  }

  /**
   * Track an API request
   */
  trackAPIRequest(
    request: Parameters<APITracker['trackRequest']>[0]
  ): ReturnType<APITracker['trackRequest']> {
    return this.apiTracker.trackRequest(request)
  }

  /**
   * Track rendering metrics
   */
  trackRenderingMetrics(
    metrics: Parameters<RenderingTracker['trackMetrics']>[0]
  ): ReturnType<RenderingTracker['trackMetrics']> {
    return this.renderingTracker.trackMetrics(metrics)
  }

  /**
   * Get database tracker
   */
  getDatabaseTracker(): DatabaseTracker {
    return this.databaseTracker
  }

  /**
   * Get API tracker
   */
  getAPITracker(): APITracker {
    return this.apiTracker
  }

  /**
   * Get rendering tracker
   */
  getRenderingTracker(): RenderingTracker {
    return this.renderingTracker
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RootCauseAnalysisConfig>): void {
    this.config = { ...this.config, ...config }
    this.databaseTracker.updateConfig(this.config)
    this.apiTracker.updateConfig(this.config)
    this.renderingTracker.updateConfig(this.config)
  }

  /**
   * Get current configuration
   */
  getConfig(): RootCauseAnalysisConfig {
    return { ...this.config }
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.databaseTracker.clearHistory()
    this.apiTracker.clearHistory()
    this.renderingTracker.clearHistory()
    this.analysisHistory = []
  }
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Slow request trace result
 */
export interface SlowRequestTrace {
  requestId: string
  found: boolean
  request?: APIRequest
  relatedQueries?: DatabaseQuery[]
  relatedMetrics?: RenderingMetrics[]
  rootCauses: RootCause[]
  timeline: TimelineEntry[]
  totalDuration?: number
}

/**
 * Timeline entry
 */
export interface TimelineEntry {
  timestamp: number
  type: 'request' | 'database' | 'rendering' | 'network'
  name: string
  duration: number
}

/**
 * Resource analysis result
 */
export interface ResourceAnalysis {
  cpu: {
    utilization: number
    bottlenecks: ResourceBottleneck[]
    recommendations: string[]
  }
  memory: {
    usage: number
    bottlenecks: ResourceBottleneck[]
    recommendations: string[]
  }
  network: {
    latency: number
    bottlenecks: ResourceBottleneck[]
    recommendations: string[]
  }
  database: DatabaseAnalysis
  api: APIAnalysis
  rendering: RenderingAnalysis
}

/**
 * Resource bottleneck
 */
export interface ResourceBottleneck {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: string
  source?: string
}

/**
 * Hot path
 */
export interface HotPath {
  id: string
  location: string
  type: 'database' | 'api' | 'rendering' | 'network'
  frequency: number
  totalDuration: number
  averageDuration: number
  impact: number
  recommendations: string[]
}

// ============================================================================
// Export
// ============================================================================

export default RootCauseAnalyzer
