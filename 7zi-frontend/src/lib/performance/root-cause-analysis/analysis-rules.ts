/**
 * Enhanced Analysis Rules
 * 增强的分析规则模块
 */

import {
  SlowQuery,
  SlowAPICall,
  RenderingMetrics,
  ResourceMetrics,
  RootCauseCandidate,
  Severity,
  PerformanceContext,
} from './types'

/**
 * Rule Engine for Root Cause Analysis
 */
export class AnalysisRuleEngine {
  /**
   * Analyze database queries with enhanced rules
   */
  analyzeDatabaseRules(queries: SlowQuery[]): {
    issues: string[]
    patterns: string[]
    severity: Severity
    suggestions: string[]
  } {
    const issues: string[] = []
    const patterns: string[] = []
    const suggestions: string[] = []

    // Rule 1: N+1 Query Pattern Detection
    const tableQueryCounts = new Map<string, number>()
    queries.forEach(q => {
      if (q.table) {
        tableQueryCounts.set(q.table, (tableQueryCounts.get(q.table) || 0) + 1)
      }
    })

    for (const [table, count] of tableQueryCounts.entries()) {
      if (count > 3) {
        issues.push(`N+1 query pattern detected for table "${table}" (${count} queries)`)
        patterns.push('n-plus-one')
        suggestions.push(`Implement batching or use eager loading for ${table} queries`)
      }
    }

    // Rule 2: Large Result Set Detection
    const largeResultQueries = queries.filter(q => q.rowCount > 1000)
    if (largeResultQueries.length > 0) {
      issues.push(`${largeResultQueries.length} queries returning large result sets`)
      patterns.push('large-result')
      suggestions.push('Implement pagination for queries returning many rows')
      suggestions.push('Use SELECT only required columns instead of SELECT *')
    }

    // Rule 3: Missing Index Detection (by query pattern)
    const fullTableScans = queries.filter(q =>
      q.query.toLowerCase().includes('where') &&
      !q.query.toLowerCase().includes('limit') &&
      q.duration > 500
    )

    if (fullTableScans.length > 0) {
      issues.push(`${fullTableScans.length} queries may be performing full table scans`)
      patterns.push('missing-index')
      suggestions.push('Review and add appropriate indexes for WHERE clause columns')
      suggestions.push('Use EXPLAIN ANALYZE to identify slow queries')
    }

    // Rule 4: Sequential Query Pattern
    const avgDuration = queries.reduce((sum, q) => sum + q.duration, 0) / queries.length
    if (avgDuration > 100 && queries.length > 3) {
      issues.push('Sequential slow queries detected - consider parallel execution')
      patterns.push('sequential-queries')
      suggestions.push('Use Promise.all() for parallel independent queries')
      suggestions.push('Implement query batching where possible')
    }

    // Rule 5: Unnecessary Join Detection
    const joinQueries = queries.filter(q =>
      q.query.toLowerCase().includes('join') && q.duration > 300
    )
    if (joinQueries.length > 0) {
      issues.push(`${joinQueries.length} slow JOIN queries detected`)
      patterns.push('slow-joins')
      suggestions.push('Review JOIN conditions and add composite indexes')
      suggestions.push('Consider denormalization for frequently accessed data')
    }

    // Rule 6: Aggregation Performance
    const aggregationQueries = queries.filter(q =>
      /group by|having|count\(|sum\(|avg\(/i.test(q.query) && q.duration > 500
    )
    if (aggregationQueries.length > 0) {
      issues.push(`${aggregationQueries.length} slow aggregation queries detected`)
      patterns.push('slow-aggregation')
      suggestions.push('Add indexes for GROUP BY and aggregation columns')
      suggestions.push('Consider materialized views for complex aggregations')
      suggestions.push('Use caching for expensive aggregation results')
    }

    // Determine severity
    let severity: Severity = 'low'
    const criticalPatterns = ['n-plus-one', 'large-result', 'missing-index']
    const highPatterns = ['slow-joins', 'slow-aggregation']

    for (const pattern of patterns) {
      if (criticalPatterns.includes(pattern)) {
        severity = 'critical'
        break
      }
      if (highPatterns.includes(pattern)) {
        severity = severity === 'critical' ? 'critical' : 'high'
      } else if (severity !== 'high' && severity !== 'critical') {
        severity = 'medium'
      }
    }

    return { issues, patterns, severity, suggestions }
  }

  /**
   * Analyze API calls with enhanced rules
   */
  analyzeAPIRules(apis: SlowAPICall[]): {
    issues: string[]
    patterns: string[]
    severity: Severity
    suggestions: string[]
  } {
    const issues: string[] = []
    const patterns: string[] = []
    const suggestions: string[] = []

    // Rule 1: Waterfall Request Pattern (sequential requests)
    const sortedApis = [...apis].sort((a, b) => a.timestamp - b.timestamp)
    let sequentialCount = 0
    for (let i = 0; i < sortedApis.length - 1; i++) {
      if (sortedApis[i + 1].timestamp - sortedApis[i].timestamp < 100) {
        sequentialCount++
      }
    }

    if (sequentialCount > 2) {
      issues.push('Waterfall request pattern detected - requests are serializing')
      patterns.push('waterfall-requests')
      suggestions.push('Combine multiple endpoints into a single batch request')
      suggestions.push('Use GraphQL for efficient data fetching')
      suggestions.push('Parallelize independent requests with Promise.all()')
    }

    // Rule 2: Over-fetching Detection
    const overFetchedApis = apis.filter(a =>
      a.responseSize && a.responseSize > 500 * 1024 // 500KB
    )
    if (overFetchedApis.length > 0) {
      issues.push(`${overFetchedApis.length} APIs over-fetching data (response > 500KB)`)
      patterns.push('over-fetching')
      suggestions.push('Implement field selection to return only needed data')
      suggestions.push('Use data compression (gzip/brotli)')
      suggestions.push('Consider pagination for large datasets')
    }

    // Rule 3: Error Pattern Detection
    const errorCodes = new Map<number, number>()
    apis.forEach(a => {
      if (a.statusCode >= 400) {
        errorCodes.set(a.statusCode, (errorCodes.get(a.statusCode) || 0) + 1)
      }
    })

    for (const [code, count] of errorCodes.entries()) {
      if (code === 401) {
        issues.push(`${count} unauthorized requests - check authentication`)
        patterns.push('auth-issues')
        suggestions.push('Refresh tokens proactively before expiration')
        suggestions.push('Implement proper token management and refresh logic')
      } else if (code === 429) {
        issues.push(`${count} rate limit errors - implement backoff strategy`)
        patterns.push('rate-limited')
        suggestions.push('Implement exponential backoff retry logic')
        suggestions.push('Use request batching to reduce API call frequency')
      } else if (code >= 500) {
        issues.push(`${count} server errors (${code}) - check server logs`)
        patterns.push('server-error')
        suggestions.push('Monitor server health and implement retry logic')
        suggestions.push('Add circuit breaker pattern for failing services')
      }
    }

    // Rule 4: Duplicate Request Detection
    const endpointCounts = new Map<string, number>()
    apis.forEach(a => {
      const key = `${a.method}:${a.endpoint}`
      endpointCounts.set(key, (endpointCounts.get(key) || 0) + 1)
    })

    for (const [endpoint, count] of endpointCounts.entries()) {
      if (count > 3) {
        issues.push(`Duplicate requests to ${endpoint} (${count} times)`)
        patterns.push('duplicate-requests')
        suggestions.push('Implement request deduplication and caching')
        suggestions.push('Use request debouncing for rapidly repeated requests')
      }
    }

    // Rule 5: Large Payload Detection
    const largePayloadApis = apis.filter(a =>
      a.requestSize && a.requestSize > 100 * 1024 // 100KB
    )
    if (largePayloadApis.length > 0) {
      issues.push(`${largePayloadApis.length} APIs with large request payloads`)
      patterns.push('large-payload')
      suggestions.push('Compress request payloads')
      suggestions.push('Use multipart upload for large files')
      suggestions.push('Validate and sanitize input data before sending')
    }

    // Rule 6: Slow Endpoint Pattern
    const endpointStats = new Map<string, { total: number; count: number }>()
    apis.forEach(a => {
      const key = `${a.method}:${a.endpoint}`
      const stats = endpointStats.get(key) || { total: 0, count: 0 }
      stats.total += a.duration
      stats.count++
      endpointStats.set(key, stats)
    })

    for (const [endpoint, stats] of endpointStats.entries()) {
      const avgDuration = stats.total / stats.count
      if (avgDuration > 3000 && stats.count >= 3) {
        issues.push(`Slow endpoint: ${endpoint} (avg ${avgDuration.toFixed(0)}ms)`)
        patterns.push('slow-endpoint')
        suggestions.push(`Review and optimize ${endpoint} implementation`)
        suggestions.push('Add caching for frequently accessed endpoints')
      }
    }

    // Determine severity
    let severity: Severity = 'low'
    const criticalPatterns = ['auth-issues', 'server-error', 'rate-limited']
    const highPatterns = ['over-fetching', 'waterfall-requests']

    for (const pattern of patterns) {
      if (criticalPatterns.includes(pattern)) {
        severity = 'critical'
        break
      }
      if (highPatterns.includes(pattern)) {
        severity = severity === 'critical' ? 'critical' : 'high'
      } else if (severity !== 'high' && severity !== 'critical') {
        severity = 'medium'
      }
    }

    return { issues, patterns, severity, suggestions }
  }

  /**
   * Analyze rendering metrics with enhanced rules
   */
  analyzeRenderingRules(rendering: RenderingMetrics): {
    issues: string[]
    patterns: string[]
    severity: Severity
    suggestions: string[]
  } {
    const issues: string[] = []
    const patterns: string[] = []
    const suggestions: string[] = []

    // Rule 1: Excessive Re-renders Detection
    if (rendering.longTasks > 20) {
      issues.push(`${rendering.longTasks} long tasks - likely excessive re-renders`)
      patterns.push('excessive-renders')
      suggestions.push('Use React.memo() to prevent unnecessary re-renders')
      suggestions.push('Implement useMemo() and useCallback() for expensive operations')
      suggestions.push('Consider using React Compiler for automatic optimization')
    }

    // Rule 2: Layout Thrashing Detection
    if (rendering.totalBlockingTime > 300 && (rendering.cumulativeLayoutShift ?? 0) > 0.1) {
      issues.push('Possible layout thrashing detected (high TBT + CLS)')
      patterns.push('layout-thrashing')
      suggestions.push('Batch DOM reads and writes together')
      suggestions.push('Use FastDOM for automated layout batching')
      suggestions.push('Avoid reading layout properties in loops')
    }

    // Rule 3: Critical Rendering Path Issues
    if (rendering.largestContentfulPaint && rendering.largestContentfulPaint > 4000) {
      issues.push(`Critical rendering path slow (LCP: ${rendering.largestContentfulPaint.toFixed(0)}ms)`)
      patterns.push('slow-crp')
      suggestions.push('Identify and preload critical resources')
      suggestions.push('Eliminate render-blocking JavaScript and CSS')
      suggestions.push('Use inline critical CSS and defer non-critical styles')
    }

    // Rule 4: Input Responsiveness Issues
    if (rendering.firstInputDelay && rendering.firstInputDelay > 100) {
      issues.push(`Poor input responsiveness (FID: ${rendering.firstInputDelay.toFixed(0)}ms)`)
      patterns.push('poor-input-responsiveness')
      suggestions.push('Minimize JavaScript execution during page load')
      suggestions.push('Break up long tasks into smaller chunks')
      suggestions.push('Use web workers for CPU-intensive operations')
    }

    // Rule 5: Layout Shift Detection
    if (rendering.cumulativeLayoutShift && rendering.cumulativeLayoutShift > 0.25) {
      issues.push(`Significant layout shifts (CLS: ${rendering.cumulativeLayoutShift.toFixed(3)})`)
      patterns.push('layout-shift')
      suggestions.push('Reserve space for dynamic content (images, ads, iframes)')
      suggestions.push('Avoid inserting content above existing content')
      suggestions.push('Use CSS transforms and opacity for animations')
    }

    // Rule 6: Interaction to Next Paint (INP) Issues
    if (rendering.interactionToNextPaint && rendering.interactionToNextPaint > 200) {
      issues.push(`Slow interaction response (INP: ${rendering.interactionToNextPaint.toFixed(0)}ms)`)
      patterns.push('slow-interaction')
      suggestions.push('Optimize event handlers and debouncing')
      suggestions.push('Reduce main thread work during interactions')
      suggestions.push('Use requestAnimationFrame for animations')
    }

    // Determine severity
    let severity: Severity = 'low'
    const criticalPatterns = ['layout-thrashing', 'slow-interaction']
    const highPatterns = ['excessive-renders', 'slow-crp', 'poor-input-responsiveness']

    for (const pattern of patterns) {
      if (criticalPatterns.includes(pattern)) {
        severity = 'critical'
        break
      }
      if (highPatterns.includes(pattern)) {
        severity = severity === 'critical' ? 'critical' : 'high'
      } else if (severity !== 'high' && severity !== 'critical') {
        severity = 'medium'
      }
    }

    return { issues, patterns, severity, suggestions }
  }

  /**
   * Analyze resource loading with enhanced rules
   */
  analyzeResourceRules(resources: ResourceMetrics): {
    issues: string[]
    patterns: string[]
    severity: Severity
    suggestions: string[]
  } {
    const issues: string[] = []
    const patterns: string[] = []
    const suggestions: string[] = []

    const slowResources = resources.slowResources || []
    const totalSizeMB = (resources.totalSize / (1024 * 1024)).toFixed(2)

    // Rule 1: Large Bundle Size Detection
    if (resources.totalSize > 3 * 1024 * 1024) {
      issues.push(`Large bundle size (${totalSizeMB}MB)`)
      patterns.push('large-bundle')
      suggestions.push('Implement code splitting with dynamic imports')
      suggestions.push('Use tree shaking to remove unused code')
      suggestions.push('Enable bundle compression (gzip/brotli)')
    }

    // Rule 2: Unoptimized Images Detection
    const largeImages = slowResources.filter(r =>
      r.type === 'image' && r.size > 200 * 1024
    )
    if (largeImages.length > 0) {
      issues.push(`${largeImages.length} unoptimized images detected`)
      patterns.push('unoptimized-images')
      suggestions.push('Use modern image formats (WebP, AVIF)')
      suggestions.push('Implement responsive images with srcset and sizes')
      suggestions.push('Add lazy loading for below-the-fold images')
      suggestions.push('Serve appropriately sized images')
    }

    // Rule 3: Third-party Script Impact
    const thirdPartyScripts = slowResources.filter(r =>
      r.type === 'script' && r.url.includes('cdn') || r.url.includes('analytics')
    )
    if (thirdPartyScripts.length > 3) {
      issues.push(`${thirdPartyScripts.length} third-party scripts may impact performance`)
      patterns.push('third-party-scripts')
      suggestions.push('Audit third-party scripts and remove unnecessary ones')
      suggestions.push('Load non-critical third-party scripts with defer/async')
      suggestions.push('Consider self-hosting critical third-party scripts')
    }

    // Rule 4: Render-blocking Resources
    const blockingResources = slowResources.filter(r =>
      (r.type === 'script' || r.type === 'stylesheet') &&
      r.duration > 200
    )
    if (blockingResources.length > 0) {
      issues.push(`${blockingResources.length} render-blocking resources detected`)
      patterns.push('render-blocking')
      suggestions.push('Use async/defer for non-blocking script loading')
      suggestions.push('Inline critical CSS and defer non-critical stylesheets')
      suggestions.push('Preload critical resources')
    }

    // Rule 5: Unused CSS Detection
    const stylesheets = slowResources.filter(r => r.type === 'stylesheet')
    if (stylesheets.length > 3) {
      issues.push('Multiple stylesheets - check for unused CSS')
      patterns.push('unused-css')
      suggestions.push('Use PurgeCSS to remove unused CSS')
      suggestions.push('Implement critical CSS extraction')
      suggestions.push('Merge and minify CSS files')
    }

    // Rule 6: Cache Misses Detection (inferred from slow resources)
    if (slowResources.length > 5 && resources.count > 10) {
      issues.push('Multiple slow resources - check caching strategy')
      patterns.push('cache-issues')
      suggestions.push('Implement proper HTTP caching headers')
      suggestions.push('Use service workers for offline caching')
      suggestions.push('Implement CDN caching for static assets')
    }

    // Determine severity
    let severity: Severity = 'low'
    const criticalPatterns = ['large-bundle', 'unoptimized-images']
    const highPatterns = ['render-blocking', 'third-party-scripts']

    for (const pattern of patterns) {
      if (criticalPatterns.includes(pattern)) {
        severity = 'critical'
        break
      }
      if (highPatterns.includes(pattern)) {
        severity = severity === 'critical' ? 'critical' : 'high'
      } else if (severity !== 'high' && severity !== 'critical') {
        severity = 'medium'
      }
    }

    return { issues, patterns, severity, suggestions }
  }

  /**
   * Generate prioritized suggestions based on severity and impact
   */
  prioritizeSuggestions(
    candidates: RootCauseCandidate[],
    context: PerformanceContext
  ): {
    highPriority: string[]
    mediumPriority: string[]
    lowPriority: string[]
  } {
    const highPriority: string[] = []
    const mediumPriority: string[] = []
    const lowPriority: string[] = []

    // Collect all suggestions
    const allSuggestions = new Map<string, { count: number; severity: Severity }>()

    candidates.forEach(candidate => {
      candidate.suggestedActions.forEach(action => {
        const existing = allSuggestions.get(action) || { count: 0, severity: 'low' as Severity }
        existing.count++
        // Upgrade severity if this candidate has higher severity
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        if (severityOrder[candidate.severity] > severityOrder[existing.severity]) {
          existing.severity = candidate.severity
        }
        allSuggestions.set(action, existing)
      })
    })

    // Prioritize based on severity and frequency
    for (const [action, data] of allSuggestions.entries()) {
      if (data.severity === 'critical' || (data.severity === 'high' && data.count > 1)) {
        highPriority.push(action)
      } else if (data.severity === 'high' || data.severity === 'medium') {
        mediumPriority.push(action)
      } else {
        lowPriority.push(action)
      }
    }

    // Remove duplicates and limit
    return {
      highPriority: [...new Set(highPriority)].slice(0, 10),
      mediumPriority: [...new Set(mediumPriority)].slice(0, 10),
      lowPriority: [...new Set(lowPriority)].slice(0, 10),
    }
  }

  /**
   * Estimate potential impact of fixes
   */
  estimateImpact(candidate: RootCauseCandidate): {
    metricImprovement: string
    effort: 'low' | 'medium' | 'high'
    roi: 'high' | 'medium' | 'low'
  } {
    const type = candidate.type
    const severity = candidate.severity

    let metricImprovement = '10-20%'
    let effort: 'low' | 'medium' | 'high' = 'medium'
    let roi: 'high' | 'medium' | 'low' = 'medium'

    // Database fixes
    if (type === 'database') {
      if (severity === 'critical') {
        metricImprovement = '40-60%'
        effort = 'high'
        roi = 'high'
      } else if (severity === 'high') {
        metricImprovement = '20-40%'
        effort = 'medium'
        roi = 'high'
      } else {
        metricImprovement = '10-20%'
        effort = 'low'
        roi = 'medium'
      }
    }

    // API fixes
    if (type === 'api') {
      if (severity === 'critical') {
        metricImprovement = '30-50%'
        effort = 'high'
        roi = 'high'
      } else if (severity === 'high') {
        metricImprovement = '20-30%'
        effort = 'medium'
        roi = 'high'
      } else {
        metricImprovement = '10-15%'
        effort = 'low'
        roi = 'medium'
      }
    }

    // Rendering fixes
    if (type === 'rendering') {
      if (severity === 'critical') {
        metricImprovement = '50-70%'
        effort = 'high'
        roi = 'high'
      } else if (severity === 'high') {
        metricImprovement = '30-50%'
        effort = 'medium'
        roi = 'high'
      } else {
        metricImprovement = '15-25%'
        effort = 'low'
        roi = 'medium'
      }
    }

    // Resource fixes
    if (type === 'resource') {
      if (severity === 'critical') {
        metricImprovement = '30-40%'
        effort = 'medium'
        roi = 'high'
      } else if (severity === 'high') {
        metricImprovement = '20-30%'
        effort = 'low'
        roi = 'high'
      } else {
        metricImprovement = '10-20%'
        effort = 'low'
        roi = 'medium'
      }
    }

    return { metricImprovement, effort, roi }
  }
}
