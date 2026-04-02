/**
 * Bottleneck Detector
 * Identifies performance bottlenecks and provides optimization recommendations
 */

// ========================================
// Types
// ========================================

export interface MemorySnapshot {
  timestamp: number
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  domNodes?: number
  eventListeners?: number
}

export interface Bottleneck {
  id: string
  type:
    | 'network'
    | 'render'
    | 'script'
    | 'layout'
    | 'paint'
    | 'memory'
    | 'dom'
    | 'database'
    | 'external-api'
    | 'memory-leak'
    | 'custom'
  severity: 'low' | 'medium' | 'high' | 'critical'
  name: string
  description: string
  impact: number // 0-100
  source: string // Where the bottleneck originates
  details?: Record<string, unknown>
  suggestedFix?: string
  documentationLinks?: string[]
}

export interface BottleneckAnalysis {
  bottlenecks: Bottleneck[]
  overallScore: number // 0-100 (higher is better)
  criticalIssues: Bottleneck[]
  highPriorityIssues: Bottleneck[]
  recommendations: BottleneckRecommendation[]
  summary: string
}

export interface BottleneckRecommendation {
  bottleneckId: string
  type: 'quick-win' | 'medium-term' | 'long-term'
  effort: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  title: string
  description: string
  steps: string[]
  priority: number // 1-10
}

export interface PerformanceProfile {
  // Network metrics
  totalTransferSize: number
  requestCount: number
  slowRequests: number
  averageResponseTime: number

  // Render metrics
  firstContentfulPaint: number
  largestContentfulPaint: number
  firstInputDelay: number
  cumulativeLayoutShift: number
  timeToInteractive: number

  // Script metrics
  scriptExecutionTime: number
  blockingScriptTime: number
  scriptErrors: number

  // DOM metrics
  domNodes: number
  domDepth: number
  iframeCount: number

  // Memory metrics
  memoryUsed: number
  memoryLimit: number

  // Database metrics (enhanced)
  databaseQueries?: number
  slowDatabaseQueries?: number
  averageDatabaseQueryTime?: number
  databaseConnectionPoolUsage?: number

  // External API metrics (enhanced)
  externalApiCalls?: number
  slowExternalApiCalls?: number
  averageExternalApiTime?: number
  externalApiErrorRate?: number

  // Memory leak detection (enhanced)
  memoryGrowthRate?: number // MB per minute
  memorySnapshots?: MemorySnapshot[]
  longLivedObjects?: number
  detachedDomNodes?: number
}

// ========================================
// Bottleneck Detector Class
// ========================================

export class BottleneckDetector {
  private thresholds = {
    network: {
      totalTransferSize: 1024 * 1024, // 1MB
      requestCount: 100,
      slowRequests: 5,
      averageResponseTime: 500,
    },
    render: {
      fcp: 1800, // ms
      lcp: 2500, // ms
      fid: 100, // ms
      cls: 0.1,
      tti: 3800, // ms
    },
    script: {
      executionTime: 50, // ms
      blockingTime: 100, // ms
      errors: 0,
    },
    dom: {
      nodes: 1500,
      depth: 32,
      iframes: 0,
    },
    memory: {
      usageRatio: 0.7, // 70%
      growthRate: 5, // MB per minute
      longLivedObjects: 1000,
      detachedDomNodes: 100,
    },
    database: {
      slowQueryThreshold: 1000, // ms
      connectionPoolUsage: 0.8, // 80%
      queryCount: 50, // per request
    },
    externalApi: {
      slowRequestThreshold: 2000, // ms
      errorRate: 0.05, // 5%
      requestCount: 20, // per page load
    },
  }

  /**
   * Analyze a performance profile to find bottlenecks
   */
  analyze(profile: PerformanceProfile): BottleneckAnalysis {
    const bottlenecks = this.detectBottlenecks(profile)
    const sortedBottlenecks = bottlenecks.sort((a, b) => b.impact - a.impact)

    const criticalIssues = sortedBottlenecks.filter(b => b.severity === 'critical')
    const highPriorityIssues = sortedBottlenecks.filter(b => b.severity === 'high')

    const overallScore = this.calculateOverallScore(sortedBottlenecks)
    const recommendations = this.generateRecommendations(sortedBottlenecks)
    const summary = this.generateSummary(sortedBottlenecks, overallScore)

    return {
      bottlenecks: sortedBottlenecks,
      overallScore,
      criticalIssues,
      highPriorityIssues,
      recommendations,
      summary,
    }
  }

  /**
   * Detect all bottlenecks from profile
   */
  private detectBottlenecks(profile: PerformanceProfile): Bottleneck[] {
    const bottlenecks: Bottleneck[] = []

    // Network bottlenecks
    bottlenecks.push(...this.detectNetworkBottlenecks(profile))

    // Render bottlenecks
    bottlenecks.push(...this.detectRenderBottlenecks(profile))

    // Script bottlenecks
    bottlenecks.push(...this.detectScriptBottlenecks(profile))

    // DOM bottlenecks
    bottlenecks.push(...this.detectDomBottlenecks(profile))

    // Memory bottlenecks
    bottlenecks.push(...this.detectMemoryBottlenecks(profile))

    // Database bottlenecks (enhanced)
    bottlenecks.push(...this.detectDatabaseBottlenecks(profile))

    // External API bottlenecks (enhanced)
    bottlenecks.push(...this.detectExternalApiBottlenecks(profile))

    // Memory leak detection (enhanced)
    bottlenecks.push(...this.detectMemoryLeaks(profile))

    return bottlenecks
  }

  /**
   * Detect network bottlenecks
   */
  private detectNetworkBottlenecks(profile: PerformanceProfile): Bottleneck[] {
    const bottlenecks: Bottleneck[] = []

    // Large transfer size
    if (profile.totalTransferSize > this.thresholds.network.totalTransferSize) {
      const impact = Math.min(
        100,
        (profile.totalTransferSize / this.thresholds.network.totalTransferSize) * 40
      )
      bottlenecks.push({
        id: 'network-large-transfer',
        type: 'network',
        severity: impact > 80 ? 'critical' : impact > 60 ? 'high' : 'medium',
        name: 'Large Page Weight',
        description: `Page transfer size (${this.formatBytes(profile.totalTransferSize)}) exceeds threshold (${this.formatBytes(this.thresholds.network.totalTransferSize)})`,
        impact: Math.round(impact),
        source: 'network',
        details: {
          transferSize: profile.totalTransferSize,
          threshold: this.thresholds.network.totalTransferSize,
        },
      })
    }

    // Too many requests
    if (profile.requestCount > this.thresholds.network.requestCount) {
      const impact = Math.min(
        100,
        (profile.requestCount / this.thresholds.network.requestCount) * 30
      )
      bottlenecks.push({
        id: 'network-many-requests',
        type: 'network',
        severity: impact > 70 ? 'high' : 'medium',
        name: 'Too Many Requests',
        description: `${profile.requestCount} requests exceed threshold of ${this.thresholds.network.requestCount}`,
        impact: Math.round(impact),
        source: 'network',
        details: {
          requestCount: profile.requestCount,
          threshold: this.thresholds.network.requestCount,
        },
      })
    }

    // Slow requests
    if (profile.slowRequests > this.thresholds.network.slowRequests) {
      const impact = Math.min(
        100,
        (profile.slowRequests / this.thresholds.network.slowRequests) * 35
      )
      bottlenecks.push({
        id: 'network-slow-requests',
        type: 'network',
        severity: impact > 70 ? 'high' : 'medium',
        name: 'Slow API Responses',
        description: `${profile.slowRequests} slow requests detected`,
        impact: Math.round(impact),
        source: 'network',
        details: {
          slowRequests: profile.slowRequests,
          averageResponseTime: profile.averageResponseTime,
        },
      })
    }

    return bottlenecks
  }

  /**
   * Detect render bottlenecks
   */
  private detectRenderBottlenecks(profile: PerformanceProfile): Bottleneck[] {
    const bottlenecks: Bottleneck[] = []

    // Slow FCP
    if (profile.firstContentfulPaint > this.thresholds.render.fcp) {
      const impact = Math.min(100, (profile.firstContentfulPaint / this.thresholds.render.fcp) * 50)
      bottlenecks.push({
        id: 'render-slow-fcp',
        type: 'render',
        severity: impact > 80 ? 'critical' : impact > 60 ? 'high' : 'medium',
        name: 'Slow First Contentful Paint',
        description: `FCP (${profile.firstContentfulPaint}ms) exceeds threshold (${this.thresholds.render.fcp}ms)`,
        impact: Math.round(impact),
        source: 'render',
        details: {
          fcp: profile.firstContentfulPaint,
          threshold: this.thresholds.render.fcp,
        },
      })
    }

    // Slow LCP
    if (profile.largestContentfulPaint > this.thresholds.render.lcp) {
      const impact = Math.min(
        100,
        (profile.largestContentfulPaint / this.thresholds.render.lcp) * 50
      )
      bottlenecks.push({
        id: 'render-slow-lcp',
        type: 'render',
        severity: impact > 80 ? 'critical' : impact > 60 ? 'high' : 'medium',
        name: 'Slow Largest Contentful Paint',
        description: `LCP (${profile.largestContentfulPaint}ms) exceeds threshold (${this.thresholds.render.lcp}ms)`,
        impact: Math.round(impact),
        source: 'render',
        details: {
          lcp: profile.largestContentfulPaint,
          threshold: this.thresholds.render.lcp,
        },
      })
    }

    // Poor CLS
    if (profile.cumulativeLayoutShift > this.thresholds.render.cls) {
      const impact = Math.min(
        100,
        (profile.cumulativeLayoutShift / this.thresholds.render.cls) * 40
      )
      bottlenecks.push({
        id: 'render-poor-cls',
        type: 'render',
        severity: impact > 70 ? 'high' : 'medium',
        name: 'Poor Cumulative Layout Shift',
        description: `CLS (${profile.cumulativeLayoutShift.toFixed(3)}) exceeds threshold (${this.thresholds.render.cls})`,
        impact: Math.round(impact),
        source: 'render',
        details: {
          cls: profile.cumulativeLayoutShift,
          threshold: this.thresholds.render.cls,
        },
      })
    }

    return bottlenecks
  }

  /**
   * Detect script bottlenecks
   */
  private detectScriptBottlenecks(profile: PerformanceProfile): Bottleneck[] {
    const bottlenecks: Bottleneck[] = []

    // Slow script execution
    if (profile.scriptExecutionTime > this.thresholds.script.executionTime) {
      const impact = Math.min(
        100,
        (profile.scriptExecutionTime / this.thresholds.script.executionTime) * 35
      )
      bottlenecks.push({
        id: 'script-slow-execution',
        type: 'script',
        severity: impact > 70 ? 'high' : 'medium',
        name: 'Slow Script Execution',
        description: `Script execution time (${profile.scriptExecutionTime}ms) exceeds threshold (${this.thresholds.script.executionTime}ms)`,
        impact: Math.round(impact),
        source: 'script',
        details: {
          executionTime: profile.scriptExecutionTime,
          threshold: this.thresholds.script.executionTime,
        },
      })
    }

    // Blocking scripts
    if (profile.blockingScriptTime > this.thresholds.script.blockingTime) {
      const impact = Math.min(
        100,
        (profile.blockingScriptTime / this.thresholds.script.blockingTime) * 40
      )
      bottlenecks.push({
        id: 'script-blocking',
        type: 'script',
        severity: impact > 75 ? 'high' : 'medium',
        name: 'Render-Blocking Scripts',
        description: `Blocking script time (${profile.blockingScriptTime}ms) exceeds threshold (${this.thresholds.script.blockingTime}ms)`,
        impact: Math.round(impact),
        source: 'script',
        details: {
          blockingTime: profile.blockingScriptTime,
          threshold: this.thresholds.script.blockingTime,
        },
      })
    }

    // Script errors
    if (profile.scriptErrors > this.thresholds.script.errors) {
      const impact = Math.min(100, profile.scriptErrors * 20)
      bottlenecks.push({
        id: 'script-errors',
        type: 'script',
        severity: impact > 50 ? 'high' : 'medium',
        name: 'Script Errors Detected',
        description: `${profile.scriptErrors} script errors detected`,
        impact: Math.round(impact),
        source: 'script',
        details: {
          errors: profile.scriptErrors,
        },
      })
    }

    return bottlenecks
  }

  /**
   * Detect DOM bottlenecks
   */
  private detectDomBottlenecks(profile: PerformanceProfile): Bottleneck[] {
    const bottlenecks: Bottleneck[] = []

    // Too many DOM nodes
    if (profile.domNodes > this.thresholds.dom.nodes) {
      const impact = Math.min(100, (profile.domNodes / this.thresholds.dom.nodes) * 30)
      bottlenecks.push({
        id: 'dom-many-nodes',
        type: 'dom',
        severity: impact > 70 ? 'high' : 'medium',
        name: 'Large DOM Tree',
        description: `DOM has ${profile.domNodes} nodes, exceeding threshold of ${this.thresholds.dom.nodes}`,
        impact: Math.round(impact),
        source: 'dom',
        details: {
          nodes: profile.domNodes,
          threshold: this.thresholds.dom.nodes,
        },
      })
    }

    // Deep DOM nesting
    if (profile.domDepth > this.thresholds.dom.depth) {
      const impact = Math.min(100, (profile.domDepth / this.thresholds.dom.depth) * 25)
      bottlenecks.push({
        id: 'dom-deep-nesting',
        type: 'dom',
        severity: 'medium',
        name: 'Deep DOM Nesting',
        description: `DOM depth is ${profile.domDepth}, exceeding threshold of ${this.thresholds.dom.depth}`,
        impact: Math.round(impact),
        source: 'dom',
        details: {
          depth: profile.domDepth,
          threshold: this.thresholds.dom.depth,
        },
      })
    }

    // Too many iframes
    if (profile.iframeCount > this.thresholds.dom.iframes) {
      const impact = Math.min(100, profile.iframeCount * 15)
      bottlenecks.push({
        id: 'dom-many-iframes',
        type: 'dom',
        severity: impact > 50 ? 'high' : 'medium',
        name: 'Too Many Iframes',
        description: `${profile.iframeCount} iframes detected`,
        impact: Math.round(impact),
        source: 'dom',
        details: {
          iframes: profile.iframeCount,
        },
      })
    }

    return bottlenecks
  }

  /**
   * Detect memory bottlenecks
   */
  private detectMemoryBottlenecks(profile: PerformanceProfile): Bottleneck[] {
    const bottlenecks: Bottleneck[] = []

    // High memory usage
    if (profile.memoryUsed > 0 && profile.memoryLimit > 0) {
      const usageRatio = profile.memoryUsed / profile.memoryLimit
      if (usageRatio > this.thresholds.memory.usageRatio) {
        const impact = Math.min(100, usageRatio * 100)
        bottlenecks.push({
          id: 'memory-high-usage',
          type: 'memory',
          severity: impact > 80 ? 'critical' : impact > 70 ? 'high' : 'medium',
          name: 'High Memory Usage',
          description: `Memory usage (${this.formatBytes(profile.memoryUsed)}) is ${Math.round(usageRatio * 100)}% of limit`,
          impact: Math.round(impact),
          source: 'memory',
          details: {
            used: profile.memoryUsed,
            limit: profile.memoryLimit,
            ratio: usageRatio,
          },
        })
      }
    }

    return bottlenecks
  }

  /**
   * Detect database bottlenecks (enhanced)
   */
  private detectDatabaseBottlenecks(profile: PerformanceProfile): Bottleneck[] {
    const bottlenecks: Bottleneck[] = []

    // Slow database queries
    if (profile.slowDatabaseQueries !== undefined && profile.slowDatabaseQueries > 0) {
      const impact = Math.min(
        100,
        profile.slowDatabaseQueries * 15 +
          (profile.averageDatabaseQueryTime
            ? Math.min(50, profile.averageDatabaseQueryTime / 100)
            : 0)
      )
      bottlenecks.push({
        id: 'database-slow-queries',
        type: 'database',
        severity: impact > 70 ? 'high' : impact > 40 ? 'medium' : 'low',
        name: 'Slow Database Queries',
        description: `${profile.slowDatabaseQueries} slow database queries detected${
          profile.averageDatabaseQueryTime
            ? ` (avg: ${profile.averageDatabaseQueryTime.toFixed(0)}ms)`
            : ''
        }`,
        impact: Math.round(impact),
        source: 'database',
        details: {
          slowQueries: profile.slowDatabaseQueries,
          totalQueries: profile.databaseQueries,
          averageTime: profile.averageDatabaseQueryTime,
        },
        suggestedFix: 'Add database indexes, optimize queries, or implement query caching',
        documentationLinks: [
          'https://web.dev/optimize-database-queries/',
          'https://developer.mozilla.org/en-US/docs/Web/Performance/Database_performance',
        ],
      })
    }

    // Too many database queries (N+1 pattern)
    if (
      profile.databaseQueries !== undefined &&
      profile.databaseQueries > this.thresholds.database.queryCount
    ) {
      const impact = Math.min(
        100,
        (profile.databaseQueries / this.thresholds.database.queryCount) * 40
      )
      bottlenecks.push({
        id: 'database-many-queries',
        type: 'database',
        severity: impact > 60 ? 'high' : 'medium',
        name: 'Too Many Database Queries',
        description: `${profile.databaseQueries} database queries in a single request (threshold: ${this.thresholds.database.queryCount}). Possible N+1 query pattern.`,
        impact: Math.round(impact),
        source: 'database',
        details: {
          queryCount: profile.databaseQueries,
          threshold: this.thresholds.database.queryCount,
        },
        suggestedFix: 'Implement eager loading, use JOINs, or batch queries to reduce N+1 patterns',
        documentationLinks: [
          'https://web.dev/n-plus-one-queries/',
          'https://www.sqlshack.com/what-is-a-n1-query-problem/',
        ],
      })
    }

    // Database connection pool exhaustion
    if (
      profile.databaseConnectionPoolUsage !== undefined &&
      profile.databaseConnectionPoolUsage > this.thresholds.database.connectionPoolUsage
    ) {
      const impact = Math.min(100, profile.databaseConnectionPoolUsage * 100)
      bottlenecks.push({
        id: 'database-pool-exhaustion',
        type: 'database',
        severity: impact > 90 ? 'critical' : impact > 70 ? 'high' : 'medium',
        name: 'Database Connection Pool Exhaustion',
        description: `Connection pool usage at ${Math.round(profile.databaseConnectionPoolUsage * 100)}% (threshold: ${Math.round(this.thresholds.database.connectionPoolUsage * 100)}%)`,
        impact: Math.round(impact),
        source: 'database',
        details: {
          poolUsage: profile.databaseConnectionPoolUsage,
          threshold: this.thresholds.database.connectionPoolUsage,
        },
        suggestedFix: 'Increase connection pool size or fix connection leaks',
        documentationLinks: [
          'https://node-postgres.com/features/pooling',
          'https://web.dev/connection-pool-best-practices/',
        ],
      })
    }

    return bottlenecks
  }

  /**
   * Detect external API bottlenecks (enhanced)
   */
  private detectExternalApiBottlenecks(profile: PerformanceProfile): Bottleneck[] {
    const bottlenecks: Bottleneck[] = []

    // Slow external API calls
    if (profile.slowExternalApiCalls !== undefined && profile.slowExternalApiCalls > 0) {
      const impact = Math.min(
        100,
        profile.slowExternalApiCalls * 20 +
          (profile.averageExternalApiTime ? Math.min(40, profile.averageExternalApiTime / 100) : 0)
      )
      bottlenecks.push({
        id: 'external-api-slow',
        type: 'external-api',
        severity: impact > 70 ? 'high' : impact > 40 ? 'medium' : 'low',
        name: 'Slow External API Calls',
        description: `${profile.slowExternalApiCalls} slow external API calls detected${
          profile.averageExternalApiTime
            ? ` (avg: ${profile.averageExternalApiTime.toFixed(0)}ms)`
            : ''
        }`,
        impact: Math.round(impact),
        source: 'external-api',
        details: {
          slowCalls: profile.slowExternalApiCalls,
          totalCalls: profile.externalApiCalls,
          averageTime: profile.averageExternalApiTime,
        },
        suggestedFix:
          'Implement caching, add timeouts, use circuit breakers, or optimize API calls',
        documentationLinks: [
          'https://web.dev/external-api-optimization/',
          'https://martinfowler.com/articles/patterns-of-distributed-systems/circuit-breaker.html',
        ],
      })
    }

    // Too many external API calls
    if (
      profile.externalApiCalls !== undefined &&
      profile.externalApiCalls > this.thresholds.externalApi.requestCount
    ) {
      const impact = Math.min(
        100,
        (profile.externalApiCalls / this.thresholds.externalApi.requestCount) * 35
      )
      bottlenecks.push({
        id: 'external-api-many-calls',
        type: 'external-api',
        severity: impact > 60 ? 'high' : 'medium',
        name: 'Too Many External API Calls',
        description: `${profile.externalApiCalls} external API calls in a single page load (threshold: ${this.thresholds.externalApi.requestCount})`,
        impact: Math.round(impact),
        source: 'external-api',
        details: {
          callCount: profile.externalApiCalls,
          threshold: this.thresholds.externalApi.requestCount,
        },
        suggestedFix:
          'Batch API requests, implement caching, or use GraphQL to fetch multiple resources',
        documentationLinks: [
          'https://web.dev/api-caching-strategies/',
          'https://graphql.org/learn/',
        ],
      })
    }

    // High external API error rate
    if (
      profile.externalApiErrorRate !== undefined &&
      profile.externalApiErrorRate > this.thresholds.externalApi.errorRate
    ) {
      const impact = Math.min(100, profile.externalApiErrorRate * 200)
      bottlenecks.push({
        id: 'external-api-high-error-rate',
        type: 'external-api',
        severity: impact > 80 ? 'critical' : impact > 50 ? 'high' : 'medium',
        name: 'High External API Error Rate',
        description: `External API error rate is ${(profile.externalApiErrorRate * 100).toFixed(1)}% (threshold: ${(this.thresholds.externalApi.errorRate * 100).toFixed(1)}%)`,
        impact: Math.round(impact),
        source: 'external-api',
        details: {
          errorRate: profile.externalApiErrorRate,
          threshold: this.thresholds.externalApi.errorRate,
        },
        suggestedFix:
          'Add retry logic with exponential backoff, implement circuit breaker, check API health',
        documentationLinks: [
          'https://web.dev/api-error-handling/',
          'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/retry-backoff-and-jitter.html',
        ],
      })
    }

    return bottlenecks
  }

  /**
   * Detect memory leaks (enhanced)
   */
  private detectMemoryLeaks(profile: PerformanceProfile): Bottleneck[] {
    const bottlenecks: Bottleneck[] = []

    // Memory growth rate detection
    if (
      profile.memoryGrowthRate !== undefined &&
      profile.memoryGrowthRate > this.thresholds.memory.growthRate
    ) {
      const impact = Math.min(
        100,
        (profile.memoryGrowthRate / this.thresholds.memory.growthRate) * 60
      )
      bottlenecks.push({
        id: 'memory-leak-growth',
        type: 'memory-leak',
        severity: impact > 80 ? 'critical' : impact > 60 ? 'high' : 'medium',
        name: 'Memory Leak Detected',
        description: `Memory is growing at ${profile.memoryGrowthRate.toFixed(1)} MB/min (threshold: ${this.thresholds.memory.growthRate} MB/min). Possible memory leak.`,
        impact: Math.round(impact),
        source: 'memory-leak',
        details: {
          growthRate: profile.memoryGrowthRate,
          threshold: this.thresholds.memory.growthRate,
        },
        suggestedFix:
          'Check for unremoved event listeners, closures retaining references, or detached DOM nodes',
        documentationLinks: [
          'https://developer.chrome.com/docs/devtools/memory-problems/',
          'https://web.dev/memory-leaks/',
        ],
      })
    }

    // Long-lived objects detection
    if (
      profile.longLivedObjects !== undefined &&
      profile.longLivedObjects > this.thresholds.memory.longLivedObjects
    ) {
      const impact = Math.min(
        100,
        (profile.longLivedObjects / this.thresholds.memory.longLivedObjects) * 50
      )
      bottlenecks.push({
        id: 'memory-leak-long-lived',
        type: 'memory-leak',
        severity: impact > 70 ? 'high' : 'medium',
        name: 'Excessive Long-Lived Objects',
        description: `${profile.longLivedObjects} long-lived objects detected (threshold: ${this.thresholds.memory.longLivedObjects}). May indicate retained references.`,
        impact: Math.round(impact),
        source: 'memory-leak',
        details: {
          longLivedObjects: profile.longLivedObjects,
          threshold: this.thresholds.memory.longLivedObjects,
        },
        suggestedFix:
          'Review object lifecycle management, ensure proper cleanup in useEffect/componentWillUnmount',
        documentationLinks: [
          'https://reactjs.org/docs/hooks-effect.html#effects-with-cleanup',
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management',
        ],
      })
    }

    // Detached DOM nodes detection
    if (
      profile.detachedDomNodes !== undefined &&
      profile.detachedDomNodes > this.thresholds.memory.detachedDomNodes
    ) {
      const impact = Math.min(
        100,
        (profile.detachedDomNodes / this.thresholds.memory.detachedDomNodes) * 55
      )
      bottlenecks.push({
        id: 'memory-leak-detached-dom',
        type: 'memory-leak',
        severity: impact > 70 ? 'high' : 'medium',
        name: 'Detached DOM Nodes Leak',
        description: `${profile.detachedDomNodes} detached DOM nodes detected (threshold: ${this.thresholds.memory.detachedDomNodes}). These are kept in memory unnecessarily.`,
        impact: Math.round(impact),
        source: 'memory-leak',
        details: {
          detachedDomNodes: profile.detachedDomNodes,
          threshold: this.thresholds.memory.detachedDomNodes,
        },
        suggestedFix:
          'Remove references to DOM elements when they are removed from the document, use WeakRef for DOM references',
        documentationLinks: [
          'https://developer.chrome.com/docs/devtools/memory-problems/#dom_leaks',
          'https://web.dev/detached-dom-nodes/',
        ],
      })
    }

    // Memory snapshot analysis for leak patterns
    if (profile.memorySnapshots && profile.memorySnapshots.length >= 3) {
      const leakPatterns = this.analyzeMemorySnapshots(profile.memorySnapshots)
      if (leakPatterns.length > 0) {
        leakPatterns.forEach(pattern => {
          bottlenecks.push({
            id: `memory-leak-pattern-${pattern.type}`,
            type: 'memory-leak',
            severity: pattern.severity,
            name: pattern.name,
            description: pattern.description,
            impact: pattern.impact,
            source: 'memory-leak',
            details: pattern.details,
            suggestedFix: pattern.suggestedFix,
            documentationLinks: pattern.documentationLinks,
          })
        })
      }
    }

    return bottlenecks
  }

  /**
   * Analyze memory snapshots for leak patterns
   */
  private analyzeMemorySnapshots(snapshots: MemorySnapshot[]): Array<{
    type: string
    name: string
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    impact: number
    details: Record<string, unknown>
    suggestedFix: string
    documentationLinks: string[]
  }> {
    const patterns: Array<{
      type: string
      name: string
      description: string
      severity: 'low' | 'medium' | 'high' | 'critical'
      impact: number
      details: Record<string, unknown>
      suggestedFix: string
      documentationLinks: string[]
    }> = []

    if (snapshots.length < 3) return patterns

    // Sort by timestamp
    const sorted = [...snapshots].sort((a, b) => a.timestamp - b.timestamp)

    // Check for continuous growth
    let continuousGrowth = true
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].usedJSHeapSize <= sorted[i - 1].usedJSHeapSize) {
        continuousGrowth = false
        break
      }
    }

    if (continuousGrowth) {
      const growth = sorted[sorted.length - 1].usedJSHeapSize - sorted[0].usedJSHeapSize
      const timeDiff = sorted[sorted.length - 1].timestamp - sorted[0].timestamp
      const growthRate = growth / (timeDiff / 60000) // MB per minute

      if (growthRate > 1) {
        patterns.push({
          type: 'continuous-growth',
          name: 'Continuous Memory Growth',
          description: `Memory grew by ${this.formatBytes(growth)} over ${(timeDiff / 1000).toFixed(0)}s without any drops. Classic memory leak pattern.`,
          severity: growthRate > 5 ? 'critical' : growthRate > 2 ? 'high' : 'medium',
          impact: Math.min(100, growthRate * 15),
          details: {
            growth,
            growthRate,
            duration: timeDiff,
            snapshots: sorted.length,
          },
          suggestedFix:
            'Profile memory allocation using Chrome DevTools, look for objects that are not being garbage collected',
          documentationLinks: ['https://developer.chrome.com/docs/devtools/memory-problems/'],
        })
      }
    }

    // Check for event listener accumulation
    if (sorted.some(s => s.eventListeners !== undefined)) {
      const listenerCounts = sorted
        .filter(s => s.eventListeners !== undefined)
        .map(s => s.eventListeners!)

      if (listenerCounts.length >= 2) {
        const listenerGrowth = listenerCounts[listenerCounts.length - 1] - listenerCounts[0]
        if (listenerGrowth > 50) {
          patterns.push({
            type: 'event-listener-leak',
            name: 'Event Listener Leak',
            description: `${listenerGrowth} event listeners added over time. Possible event listener leak.`,
            severity: listenerGrowth > 200 ? 'critical' : listenerGrowth > 100 ? 'high' : 'medium',
            impact: Math.min(100, listenerGrowth / 2),
            details: {
              listenerGrowth,
              initialCount: listenerCounts[0],
              finalCount: listenerCounts[listenerCounts.length - 1],
            },
            suggestedFix:
              'Ensure event listeners are removed in cleanup functions (useEffect return, componentWillUnmount)',
            documentationLinks: ['https://reactjs.org/docs/hooks-effect.html#effects-with-cleanup'],
          })
        }
      }
    }

    return patterns
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(bottlenecks: Bottleneck[]): number {
    if (bottlenecks.length === 0) return 100

    const totalImpact = bottlenecks.reduce((sum, b) => sum + b.impact, 0)
    const criticalPenalty = bottlenecks.filter(b => b.severity === 'critical').length * 15
    const highPenalty = bottlenecks.filter(b => b.severity === 'high').length * 8

    const score = 100 - totalImpact / bottlenecks.length - criticalPenalty - highPenalty
    return Math.max(0, Math.round(score))
  }

  /**
   * Generate recommendations from bottlenecks
   */
  private generateRecommendations(bottlenecks: Bottleneck[]): BottleneckRecommendation[] {
    const recommendations: BottleneckRecommendation[] = []

    bottlenecks.forEach(bottleneck => {
      const rec = this.getRecommendationForBottleneck(bottleneck)
      if (rec) {
        recommendations.push(rec)
      }
    })

    return recommendations.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Get specific recommendation for a bottleneck
   */
  private getRecommendationForBottleneck(bottleneck: Bottleneck): BottleneckRecommendation | null {
    const recommendations: Record<string, Partial<BottleneckRecommendation>> = {
      'network-large-transfer': {
        type: 'medium-term',
        effort: 'medium',
        impact: 'high',
        title: 'Reduce Page Weight',
        description: 'Optimize images, minify assets, and reduce payload size',
        steps: [
          'Compress images with modern formats (WebP, AVIF)',
          'Minify CSS, JS, and HTML',
          'Enable text compression (gzip/brotli)',
          'Remove unused JavaScript and CSS',
          'Implement lazy loading for images and videos',
        ],
      },
      'network-many-requests': {
        type: 'quick-win',
        effort: 'low',
        impact: 'medium',
        title: 'Reduce Request Count',
        description: 'Combine and bundle resources to reduce HTTP requests',
        steps: [
          'Bundle CSS and JavaScript files',
          'Use CSS sprites for small images',
          'Enable HTTP/2 multiplexing',
          'Consider resource hints (preload, prefetch)',
        ],
      },
      'network-slow-requests': {
        type: 'medium-term',
        effort: 'medium',
        impact: 'high',
        title: 'Optimize API Performance',
        description: 'Improve server response times and caching strategies',
        steps: [
          'Implement server-side caching',
          'Use a CDN for static assets',
          'Optimize database queries',
          'Implement API response compression',
          'Add request batching and debouncing',
        ],
      },
      'render-slow-fcp': {
        type: 'quick-win',
        effort: 'medium',
        impact: 'high',
        title: 'Improve First Contentful Paint',
        description: 'Optimize initial rendering to show content faster',
        steps: [
          'Reduce render-blocking resources',
          'Inline critical CSS',
          'Defer non-critical JavaScript',
          'Preload critical resources',
          'Use server-side rendering for initial content',
        ],
      },
      'render-slow-lcp': {
        type: 'medium-term',
        effort: 'medium',
        impact: 'high',
        title: 'Optimize Largest Contentful Paint',
        description: 'Ensure the largest element loads quickly',
        steps: [
          'Optimize LCP image (WebP, proper sizing)',
          'Preload LCP image',
          'Serve LCP image from CDN',
          'Compress images aggressively',
          'Use responsive images with srcset',
        ],
      },
      'render-poor-cls': {
        type: 'quick-win',
        effort: 'low',
        impact: 'medium',
        title: 'Fix Layout Shifts',
        description: 'Reduce unexpected layout shifts for better UX',
        steps: [
          'Reserve space for dynamic content',
          'Set explicit dimensions for images and videos',
          'Avoid inserting content above existing content',
          'Use CSS transforms for animations',
          'Ensure font-display: swap is used appropriately',
        ],
      },
      'script-slow-execution': {
        type: 'medium-term',
        effort: 'high',
        impact: 'high',
        title: 'Optimize JavaScript Execution',
        description: 'Reduce main thread blocking from JavaScript',
        steps: [
          'Code split large JavaScript bundles',
          'Use web workers for CPU-intensive tasks',
          'Defer non-critical JavaScript',
          'Optimize expensive computations',
          'Avoid long synchronous operations',
        ],
      },
      'script-blocking': {
        type: 'quick-win',
        effort: 'low',
        impact: 'medium',
        title: 'Reduce Render-Blocking Scripts',
        description: 'Eliminate blocking scripts that delay rendering',
        steps: [
          'Add async or defer attributes to scripts',
          'Inline critical CSS',
          'Use the preload link for critical resources',
          'Load non-critical JS after initial render',
        ],
      },
      'script-errors': {
        type: 'quick-win',
        effort: 'low',
        impact: 'medium',
        title: 'Fix Script Errors',
        description: 'Resolve JavaScript errors affecting performance',
        steps: [
          'Review and fix console errors',
          'Add error boundaries for graceful degradation',
          'Implement proper error handling',
          'Add logging for debugging',
        ],
      },
      'dom-many-nodes': {
        type: 'long-term',
        effort: 'high',
        impact: 'medium',
        title: 'Reduce DOM Size',
        description: 'Simplify DOM structure for better performance',
        steps: [
          'Remove unnecessary DOM nodes',
          'Implement virtual scrolling for long lists',
          'Use server-side rendering for large content',
          'Consider document fragments for batch updates',
        ],
      },
      'dom-deep-nesting': {
        type: 'medium-term',
        effort: 'medium',
        impact: 'medium',
        title: 'Flatten DOM Structure',
        description: 'Reduce DOM depth for better query performance',
        steps: [
          'Review and simplify HTML structure',
          'Use modern CSS (Grid, Flexbox) instead of deep nesting',
          'Consider component-based architecture',
        ],
      },
      'dom-many-iframes': {
        type: 'quick-win',
        effort: 'low',
        impact: 'medium',
        title: 'Reduce Iframe Usage',
        description: 'Minimize or remove iframes where possible',
        steps: [
          'Remove unnecessary iframes',
          'Use loading="lazy" for iframes',
          'Consider alternatives like embedded content APIs',
        ],
      },
      'memory-high-usage': {
        type: 'medium-term',
        effort: 'high',
        impact: 'high',
        title: 'Reduce Memory Usage',
        description: 'Optimize memory consumption to prevent crashes',
        steps: [
          'Fix memory leaks (event listeners, closures)',
          'Implement object pooling for reusable objects',
          'Lazy load data and components',
          'Clean up unused references',
          'Use weak references where appropriate',
        ],
      },
      'database-slow-queries': {
        type: 'medium-term',
        effort: 'medium',
        impact: 'high',
        title: 'Optimize Slow Database Queries',
        description: 'Improve database query performance',
        steps: [
          'Add indexes on frequently queried columns',
          'Use EXPLAIN ANALYZE to identify bottlenecks',
          'Optimize WHERE clauses and JOINs',
          'Implement query result caching',
          'Consider denormalization for read-heavy workloads',
        ],
      },
      'database-many-queries': {
        type: 'medium-term',
        effort: 'medium',
        impact: 'high',
        title: 'Reduce Database Query Count',
        description: 'Fix N+1 query patterns and reduce query count',
        steps: [
          'Implement eager loading with JOINs',
          'Use DataLoader or similar batching mechanisms',
          'Cache frequently accessed data',
          'Use GraphQL to fetch multiple resources in one query',
          'Review and optimize data fetching patterns',
        ],
      },
      'database-pool-exhaustion': {
        type: 'quick-win',
        effort: 'low',
        impact: 'high',
        title: 'Fix Connection Pool Exhaustion',
        description: 'Address database connection pool issues',
        steps: [
          'Increase connection pool size',
          'Fix connection leaks (ensure connections are released)',
          'Implement connection timeout and retry logic',
          'Review long-running transactions',
          'Use connection pooling middleware',
        ],
      },
      'external-api-slow': {
        type: 'medium-term',
        effort: 'medium',
        impact: 'high',
        title: 'Optimize External API Calls',
        description: 'Improve external API performance',
        steps: [
          'Implement response caching',
          'Add request timeouts',
          'Use circuit breakers for fault tolerance',
          'Batch multiple API requests',
          'Consider using GraphQL or API gateways',
        ],
      },
      'external-api-many-calls': {
        type: 'medium-term',
        effort: 'medium',
        impact: 'high',
        title: 'Reduce External API Calls',
        description: 'Minimize external API request count',
        steps: [
          'Batch API requests when possible',
          'Implement aggressive caching',
          'Use GraphQL to fetch multiple resources',
          'Debounce and throttle API calls',
          'Consider server-side aggregation',
        ],
      },
      'external-api-high-error-rate': {
        type: 'quick-win',
        effort: 'low',
        impact: 'high',
        title: 'Fix External API Errors',
        description: 'Address high external API error rate',
        steps: [
          'Implement retry logic with exponential backoff',
          'Add circuit breaker pattern',
          'Check API health and status',
          'Review API authentication and rate limits',
          'Add proper error handling and logging',
        ],
      },
      'memory-leak-growth': {
        type: 'long-term',
        effort: 'high',
        impact: 'high',
        title: 'Fix Memory Leak',
        description: 'Address continuous memory growth',
        steps: [
          'Profile memory allocation using Chrome DevTools',
          'Check for unremoved event listeners',
          'Review closures for retained references',
          'Use WeakMap/WeakSet for temporary storage',
          'Implement proper cleanup in useEffect/componentWillUnmount',
        ],
      },
      'memory-leak-long-lived': {
        type: 'medium-term',
        effort: 'high',
        impact: 'high',
        title: 'Fix Long-Lived Objects',
        description: 'Address excessive long-lived objects',
        steps: [
          'Review object lifecycle management',
          'Implement object pooling for reusable objects',
          'Use WeakRef for temporary references',
          'Clean up unused objects explicitly',
          'Profile memory heap to identify retained objects',
        ],
      },
      'memory-leak-detached-dom': {
        type: 'medium-term',
        effort: 'medium',
        impact: 'high',
        title: 'Fix Detached DOM Nodes',
        description: 'Clean up detached DOM nodes',
        steps: [
          'Remove references to DOM elements when removing them',
          'Use WeakRef for DOM references',
          'Implement proper cleanup in component unmount',
          'Avoid storing DOM elements in state',
          'Use React refs carefully and clean them up',
        ],
      },
    }

    const template = recommendations[bottleneck.id]
    if (!template) return null

    return {
      bottleneckId: bottleneck.id,
      type: template.type as BottleneckRecommendation['type'],
      effort: template.effort as BottleneckRecommendation['effort'],
      impact: template.impact as BottleneckRecommendation['impact'],
      title: template.title!,
      description: template.description!,
      steps: template.steps!,
      priority: Math.min(10, Math.round(bottleneck.impact / 10)),
    }
  }

  /**
   * Generate summary text
   */
  private generateSummary(bottlenecks: Bottleneck[], score: number): string {
    const criticalCount = bottlenecks.filter(b => b.severity === 'critical').length
    const highCount = bottlenecks.filter(b => b.severity === 'high').length

    if (bottlenecks.length === 0) {
      return 'No significant bottlenecks detected. Performance is excellent!'
    }

    if (criticalCount > 0) {
      return `Found ${criticalCount} critical and ${highCount} high-priority issues. Immediate attention required. Score: ${score}/100`
    }

    if (highCount > 0) {
      return `Found ${highCount} high-priority issues. Consider addressing them soon. Score: ${score}/100`
    }

    return `Found ${bottlenecks.length} minor issues. Performance is good but can be improved. Score: ${score}/100`
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
  }

  /**
   * Update detection thresholds
   */
  updateThresholds(thresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
  }

  /**
   * Get current thresholds
   */
  getThresholds() {
    return { ...this.thresholds }
  }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Create mock performance profile for testing
 */
export function createMockPerformanceProfile(
  overrides: Partial<PerformanceProfile> = {}
): PerformanceProfile {
  return {
    totalTransferSize:
      overrides.totalTransferSize !== undefined ? overrides.totalTransferSize : 500 * 1024,
    requestCount: overrides.requestCount !== undefined ? overrides.requestCount : 20,
    slowRequests: overrides.slowRequests !== undefined ? overrides.slowRequests : 0,
    averageResponseTime:
      overrides.averageResponseTime !== undefined ? overrides.averageResponseTime : 200,

    firstContentfulPaint:
      overrides.firstContentfulPaint !== undefined ? overrides.firstContentfulPaint : 1200,
    largestContentfulPaint:
      overrides.largestContentfulPaint !== undefined ? overrides.largestContentfulPaint : 2000,
    firstInputDelay: overrides.firstInputDelay !== undefined ? overrides.firstInputDelay : 50,
    cumulativeLayoutShift:
      overrides.cumulativeLayoutShift !== undefined ? overrides.cumulativeLayoutShift : 0.05,
    timeToInteractive:
      overrides.timeToInteractive !== undefined ? overrides.timeToInteractive : 2500,

    scriptExecutionTime:
      overrides.scriptExecutionTime !== undefined ? overrides.scriptExecutionTime : 30,
    blockingScriptTime:
      overrides.blockingScriptTime !== undefined ? overrides.blockingScriptTime : 50,
    scriptErrors: overrides.scriptErrors !== undefined ? overrides.scriptErrors : 0,

    domNodes: overrides.domNodes !== undefined ? overrides.domNodes : 800,
    domDepth: overrides.domDepth !== undefined ? overrides.domDepth : 12,
    iframeCount: overrides.iframeCount !== undefined ? overrides.iframeCount : 0,

    memoryUsed: overrides.memoryUsed !== undefined ? overrides.memoryUsed : 50 * 1024 * 1024,
    memoryLimit: overrides.memoryLimit !== undefined ? overrides.memoryLimit : 100 * 1024 * 1024,

    // Database metrics (enhanced)
    databaseQueries: overrides.databaseQueries,
    slowDatabaseQueries: overrides.slowDatabaseQueries,
    averageDatabaseQueryTime: overrides.averageDatabaseQueryTime,
    databaseConnectionPoolUsage: overrides.databaseConnectionPoolUsage,

    // External API metrics (enhanced)
    externalApiCalls: overrides.externalApiCalls,
    slowExternalApiCalls: overrides.slowExternalApiCalls,
    averageExternalApiTime: overrides.averageExternalApiTime,
    externalApiErrorRate: overrides.externalApiErrorRate,

    // Memory leak detection (enhanced)
    memoryGrowthRate: overrides.memoryGrowthRate,
    memorySnapshots: overrides.memorySnapshots,
    longLivedObjects: overrides.longLivedObjects,
    detachedDomNodes: overrides.detachedDomNodes,
  }
}

// ========================================
// Export singleton instance
// ========================================

export const bottleneckDetector = new BottleneckDetector()

export default BottleneckDetector
