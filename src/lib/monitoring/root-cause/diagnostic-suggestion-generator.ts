/**
 * Auto-Diagnostic Suggestion Generator
 *
 * Generates diagnostic suggestions based on detected issues
 * @version v1.8.1
 */

import { Bottleneck } from './bottleneck-detector'
import { DatabaseIssueType } from '../../performance/root-cause-analysis/types'
import { APIIssueType } from '../../performance/root-cause-analysis/types'

// ========================================
// Types
// ========================================

export interface DiagnosticSuggestion {
  id: string
  type: 'database' | 'api' | 'rendering' | 'network' | 'memory' | 'general'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  actionItems: string[]
  relatedDocs: string[]
  estimatedImpact: string
  estimatedFixTime: string
  complexity: 'low' | 'medium' | 'high'
  prerequisites?: string[]
  riskLevel: 'low' | 'medium' | 'high'
}

export interface DiagnosticReport {
  id: string
  timestamp: number
  title: string
  summary: string
  suggestions: DiagnosticSuggestion[]
  overallSeverity: 'low' | 'medium' | 'high' | 'critical'
  priorityScore: number
}

// ========================================
// Documentation Links
// ========================================

const DOC_LINKS = {
  // Database
  'db-indexing': 'https://web.dev/optimize-database-queries/',
  'db-n-plus-1': 'https://www.sqlshack.com/what-is-a-n1-query-problem/',
  'db-connection-pool': 'https://node-postgres.com/features/pooling',
  'db-query-cache': 'https://redis.io/docs/manual/pipelining/',

  // API
  'api-retry':
    'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/retry-backoff-and-jitter.html',
  'api-circuit-breaker':
    'https://martinfowler.com/articles/patterns-of-distributed-systems/circuit-breaker.html',
  'api-caching': 'https://web.dev/api-caching-strategies/',
  'api-timeout': 'https://developer.mozilla.org/en-US/docs/Web/API/AbortController',

  // Rendering
  'render-fcp': 'https://web.dev/fcp/',
  'render-lcp': 'https://web.dev/lcp/',
  'render-cls': 'https://web.dev/cls/',
  'render-fid': 'https://web.dev/fid/',
  'render-blocking': 'https://web.dev/render-blocking-resources/',

  // Network
  'network-http2': 'https://web.dev/performance-http2/',
  'network-compression': 'https://web.dev/optimize-encoded-size/',
  'network-cdn': 'https://web.dev/content-delivery-networks/',

  // Memory
  'memory-leak': 'https://web.dev/memory-leaks/',
  'memory-devtools': 'https://developer.chrome.com/docs/devtools/memory-problems/',
  'memory-cleanup': 'https://reactjs.org/docs/hooks-effect.html#effects-with-cleanup',
  'memory-detached-dom': 'https://web.dev/detached-dom-nodes/',

  // General
  'perf-issues': 'https://web.dev/explore/performance',
  'web-vitals': 'https://web.dev/vitals/',
}

// ========================================
// Suggestion Generator
// ========================================

export class DiagnosticSuggestionGenerator {
  /**
   * Generate diagnostic report from bottlenecks
   */
  generateReport(bottlenecks: Bottleneck[]): DiagnosticReport {
    const suggestions = this.generateSuggestions(bottlenecks)
    const priorityScore = this.calculatePriorityScore(bottlenecks)
    const overallSeverity = this.determineOverallSeverity(bottlenecks)

    const title = `Diagnostic Report - ${new Date().toLocaleDateString()}`
    const summary = this.generateSummary(bottlenecks, suggestions)

    return {
      id: `diag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      title,
      summary,
      suggestions,
      overallSeverity,
      priorityScore,
    }
  }

  /**
   * Generate suggestions for each bottleneck
   */
  private generateSuggestions(bottlenecks: Bottleneck[]): DiagnosticSuggestion[] {
    const suggestions: DiagnosticSuggestion[] = []

    for (const bottleneck of bottlenecks) {
      const suggestion = this.getSuggestionForBottleneck(bottleneck)
      if (suggestion) {
        suggestions.push(suggestion)
      }
    }

    // Sort by severity and impact
    return suggestions.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }

  /**
   * Get specific suggestion for a bottleneck
   */
  private getSuggestionForBottleneck(bottleneck: Bottleneck): DiagnosticSuggestion | null {
    const templates: Record<string, () => DiagnosticSuggestion> = {
      'database-slow-queries': () => ({
        id: `suggestion-${bottleneck.id}`,
        type: 'database',
        title: 'Optimize Database Queries',
        description: bottleneck.description,
        severity: bottleneck.severity,
        actionItems: [
          'Run EXPLAIN ANALYZE on slow queries to identify bottlenecks',
          'Add indexes on columns used in WHERE, JOIN, and ORDER BY clauses',
          'Optimize query structure (avoid SELECT *, use proper JOINs)',
          'Implement query result caching with Redis or similar',
          'Consider denormalization for frequently accessed data',
        ],
        relatedDocs: [DOC_LINKS['db-indexing'], DOC_LINKS['db-query-cache']],
        estimatedImpact: '50-90% reduction in query time',
        estimatedFixTime: '2-6 hours',
        complexity: 'medium',
        prerequisites: ['Database access', 'Query analysis tools'],
        riskLevel: 'low',
      }),

      'database-many-queries': () => ({
        id: `suggestion-${bottleneck.id}`,
        type: 'database',
        title: 'Fix N+1 Query Pattern',
        description: bottleneck.description,
        severity: bottleneck.severity,
        actionItems: [
          'Identify N+1 patterns using query logging or ORM features',
          'Implement eager loading (e.g., JOIN, includes) in ORM',
          'Use DataLoader or similar batching mechanism',
          'Cache frequently accessed relationships',
          'Consider GraphQL with DataLoader for complex fetching',
        ],
        relatedDocs: [DOC_LINKS['db-n-plus-1'], DOC_LINKS['db-query-cache']],
        estimatedImpact: '60-80% reduction in query count',
        estimatedFixTime: '4-8 hours',
        complexity: 'medium',
        prerequisites: ['Application code access', 'Database schema understanding'],
        riskLevel: 'medium',
      }),

      'database-pool-exhaustion': () => ({
        id: `suggestion-${bottleneck.id}`,
        type: 'database',
        title: 'Fix Connection Pool Exhaustion',
        description: bottleneck.description,
        severity: bottleneck.severity,
        actionItems: [
          'Increase connection pool size in database configuration',
          'Audit code for connection leaks (ensure connections are released)',
          'Add connection timeout to prevent indefinite waits',
          'Implement query timeout to avoid long-running queries',
          'Monitor connection pool metrics and set alerts',
        ],
        relatedDocs: [DOC_LINKS['db-connection-pool'], DOC_LINKS['perf-issues']],
        estimatedImpact: 'Prevent connection failures under load',
        estimatedFixTime: '1-2 hours',
        complexity: 'low',
        prerequisites: ['Database configuration access'],
        riskLevel: 'low',
      }),

      'external-api-slow': () => ({
        id: `suggestion-${bottleneck.id}`,
        type: 'api',
        title: 'Optimize External API Calls',
        description: bottleneck.description,
        severity: bottleneck.severity,
        actionItems: [
          'Add request timeouts using AbortController',
          'Implement response caching for frequently called endpoints',
          'Add retry logic with exponential backoff',
          'Consider circuit breaker pattern for fault tolerance',
          'Batch multiple API requests when possible',
        ],
        relatedDocs: [
          DOC_LINKS['api-timeout'],
          DOC_LINKS['api-caching'],
          DOC_LINKS['api-circuit-breaker'],
        ],
        estimatedImpact: '30-70% faster API responses',
        estimatedFixTime: '3-6 hours',
        complexity: 'medium',
        prerequisites: ['API client code access'],
        riskLevel: 'medium',
      }),

      'external-api-many-calls': () => ({
        id: `suggestion-${bottleneck.id}`,
        type: 'api',
        title: 'Reduce External API Call Count',
        description: bottleneck.description,
        severity: bottleneck.severity,
        actionItems: [
          'Identify redundant API calls in application code',
          'Implement aggressive client-side caching',
          'Use GraphQL to fetch multiple resources in one request',
          'Batch API requests using request coalescing',
          'Debounce rapid successive API calls',
        ],
        relatedDocs: [DOC_LINKS['api-caching'], DOC_LINKS['perf-issues']],
        estimatedImpact: '40-60% reduction in API calls',
        estimatedFixTime: '2-4 hours',
        complexity: 'medium',
        prerequisites: ['API client code access', 'Caching infrastructure'],
        riskLevel: 'low',
      }),

      'external-api-high-error-rate': () => ({
        id: `suggestion-${bottleneck.id}`,
        type: 'api',
        title: 'Address High API Error Rate',
        description: bottleneck.description,
        severity: bottleneck.severity,
        actionItems: [
          'Add retry logic with exponential backoff (max 3 retries)',
          'Implement circuit breaker pattern',
          'Add detailed logging to capture error context',
          'Check API status page for outages',
          'Implement fallback mechanisms for critical operations',
        ],
        relatedDocs: [DOC_LINKS['api-retry'], DOC_LINKS['api-circuit-breaker']],
        estimatedImpact: 'Reduce error rate by 50-80%',
        estimatedFixTime: '2-4 hours',
        complexity: 'medium',
        prerequisites: ['API client code access'],
        riskLevel: 'medium',
      }),

      'render-slow-fcp': () => ({
        id: `suggestion-${bottleneck.id}`,
        type: 'rendering',
        title: 'Improve First Contentful Paint',
        description: bottleneck.description,
        severity: bottleneck.severity,
        actionItems: [
          'Inline critical CSS in HTML head',
          'Defer non-critical JavaScript using async/defer',
          'Preload critical resources using link rel="preload"',
          'Remove render-blocking resources from head',
          'Consider server-side rendering for faster initial paint',
        ],
        relatedDocs: [DOC_LINKS['render-fcp'], DOC_LINKS['render-blocking']],
        estimatedImpact: '30-50% faster FCP',
        estimatedFixTime: '2-4 hours',
        complexity: 'medium',
        prerequisites: ['Build system access', 'Server configuration'],
        riskLevel: 'medium',
      }),

      'render-slow-lcp': () => ({
        id: `suggestion-${bottleneck.id}`,
        type: 'rendering',
        title: 'Optimize Largest Contentful Paint',
        description: bottleneck.description,
        severity: bottleneck.severity,
        actionItems: [
          'Optimize LCP element (image/video) - use WebP, proper sizing',
          'Preload LCP image using link rel="preload"',
          'Serve LCP image from CDN',
          'Remove lazy loading from LCP element',
          'Ensure server response time is fast (TTFB < 200ms)',
        ],
        relatedDocs: [DOC_LINKS['render-lcp'], DOC_LINKS['network-compression']],
        estimatedImpact: '20-40% faster LCP',
        estimatedFixTime: '2-3 hours',
        complexity: 'medium',
        prerequisites: ['Image optimization pipeline', 'CDN access'],
        riskLevel: 'low',
      }),

      'render-poor-cls': () => ({
        id: `suggestion-${bottleneck.id}`,
        type: 'rendering',
        title: 'Fix Cumulative Layout Shift',
        description: bottleneck.description,
        severity: bottleneck.severity,
        actionItems: [
          'Reserve space for dynamic content with min-height/min-width',
          'Set explicit width and height attributes on images and videos',
          'Use CSS transform for animations instead of animating properties',
          'Add font-display: optional or swap to prevent font shifts',
          'Avoid inserting content above existing content',
        ],
        relatedDocs: [DOC_LINKS['render-cls'], DOC_LINKS['perf-issues']],
        estimatedImpact: 'Eliminate CLS issues',
        estimatedFixTime: '1-3 hours',
        complexity: 'low',
        prerequisites: ['CSS and HTML access'],
        riskLevel: 'low',
      }),

      'memory-leak-growth': () => ({
        id: `suggestion-${bottleneck.id}`,
        type: 'memory',
        title: 'Fix Memory Leak',
        description: bottleneck.description,
        severity: bottleneck.severity,
        actionItems: [
          'Take heap snapshots in Chrome DevTools and compare',
          'Check for unremoved event listeners in components',
          'Review closures for retained references',
          'Look for detached DOM nodes still in memory',
          'Use WeakMap/WeakSet for temporary storage',
        ],
        relatedDocs: [DOC_LINKS['memory-leak'], DOC_LINKS['memory-devtools']],
        estimatedImpact: 'Stop memory growth, improve stability',
        estimatedFixTime: '4-10 hours',
        complexity: 'high',
        prerequisites: ['Chrome DevTools', 'Application code access'],
        riskLevel: 'medium',
      }),

      'memory-leak-detached-dom': () => ({
        id: `suggestion-${bottleneck.id}`,
        type: 'memory',
        title: 'Fix Detached DOM Nodes',
        description: bottleneck.description,
        severity: bottleneck.severity,
        actionItems: [
          'Review code that stores DOM references in arrays/objects',
          'Ensure DOM references are cleared when elements are removed',
          'Use WeakRef for DOM references when possible',
          'Check React component cleanup in useEffect',
          'Use Chrome DevTools Memory > Detached DOM tree',
        ],
        relatedDocs: [DOC_LINKS['memory-detached-dom'], DOC_LINKS['memory-devtools']],
        estimatedImpact: '30-50% memory reduction',
        estimatedFixTime: '2-5 hours',
        complexity: 'medium',
        prerequisites: ['Chrome DevTools', 'DOM code access'],
        riskLevel: 'medium',
      }),

      'network-large-transfer': () => ({
        id: `suggestion-${bottleneck.id}`,
        type: 'network',
        title: 'Reduce Page Transfer Size',
        description: bottleneck.description,
        severity: bottleneck.severity,
        actionItems: [
          'Compress images using WebP or AVIF format',
          'Minify CSS, JavaScript, and HTML',
          'Enable text compression (gzip or brotli) on server',
          'Remove unused code with tree shaking',
          'Implement lazy loading for images and components',
        ],
        relatedDocs: [DOC_LINKS['network-compression'], DOC_LINKS['perf-issues']],
        estimatedImpact: '40-70% reduction in transfer size',
        estimatedFixTime: '3-6 hours',
        complexity: 'medium',
        prerequisites: ['Build pipeline access', 'Server configuration'],
        riskLevel: 'low',
      }),

      'script-blocking': () => ({
        id: `suggestion-${bottleneck.id}`,
        type: 'rendering',
        title: 'Remove Render-Blocking Scripts',
        description: bottleneck.description,
        severity: bottleneck.severity,
        actionItems: [
          'Add async attribute to non-critical scripts',
          'Add defer attribute to scripts that can wait',
          'Inline critical JavaScript in HTML head',
          'Move non-critical scripts to end of body',
          'Consider code splitting with dynamic imports',
        ],
        relatedDocs: [DOC_LINKS['render-blocking'], DOC_LINKS['perf-issues']],
        estimatedImpact: '20-40% faster page load',
        estimatedFixTime: '1-2 hours',
        complexity: 'low',
        prerequisites: ['HTML and JavaScript access'],
        riskLevel: 'low',
      }),
    }

    const template = templates[bottleneck.id]
    return template ? template() : this.getGenericSuggestion(bottleneck)
  }

  /**
   * Get generic suggestion for unknown bottleneck types
   */
  private getGenericSuggestion(bottleneck: Bottleneck): DiagnosticSuggestion {
    return {
      id: `suggestion-${bottleneck.id}`,
      type: this.mapTypeToCategory(bottleneck.type),
      title: bottleneck.name,
      description: bottleneck.description,
      severity: bottleneck.severity,
      actionItems: bottleneck.suggestedFix
        ? [bottleneck.suggestedFix]
        : [
            `Investigate ${bottleneck.type} performance issues`,
            'Review relevant code for optimization opportunities',
            'Monitor metrics to track improvement',
          ],
      relatedDocs: bottleneck.documentationLinks || [DOC_LINKS['perf-issues']],
      estimatedImpact: 'Variable based on root cause',
      estimatedFixTime: 'Variable',
      complexity: 'medium',
      riskLevel: 'medium',
    }
  }

  /**
   * Map bottleneck type to category
   */
  private mapTypeToCategory(type: string): DiagnosticSuggestion['type'] {
    const mapping: Record<string, DiagnosticSuggestion['type']> = {
      database: 'database',
      'database-slow-queries': 'database',
      'database-many-queries': 'database',
      'database-pool-exhaustion': 'database',
      'external-api': 'api',
      'external-api-slow': 'api',
      'external-api-many-calls': 'api',
      'external-api-high-error-rate': 'api',
      render: 'rendering',
      'render-slow-fcp': 'rendering',
      'render-slow-lcp': 'rendering',
      'render-poor-cls': 'rendering',
      network: 'network',
      'network-large-transfer': 'network',
      'network-many-requests': 'network',
      memory: 'memory',
      'memory-leak': 'memory',
      'memory-leak-growth': 'memory',
      'memory-leak-detached-dom': 'memory',
      script: 'rendering',
      'script-blocking': 'rendering',
    }
    return mapping[type] || 'general'
  }

  /**
   * Calculate priority score from bottlenecks
   */
  private calculatePriorityScore(bottlenecks: Bottleneck[]): number {
    let score = 0
    for (const b of bottlenecks) {
      const severityMultiplier: Record<Bottleneck['severity'], number> = {
        critical: 10,
        high: 6,
        medium: 3,
        low: 1,
      }
      score += severityMultiplier[b.severity] * (b.impact / 100)
    }
    return Math.min(100, Math.round(score))
  }

  /**
   * Determine overall severity from bottlenecks
   */
  private determineOverallSeverity(bottlenecks: Bottleneck[]): DiagnosticReport['overallSeverity'] {
    if (bottlenecks.some(b => b.severity === 'critical')) return 'critical'
    if (bottlenecks.some(b => b.severity === 'high')) return 'high'
    if (bottlenecks.some(b => b.severity === 'medium')) return 'medium'
    return 'low'
  }

  /**
   * Generate summary text
   */
  private generateSummary(bottlenecks: Bottleneck[], suggestions: DiagnosticSuggestion[]): string {
    const criticalCount = bottlenecks.filter(b => b.severity === 'critical').length
    const highCount = bottlenecks.filter(b => b.severity === 'high').length

    const topSuggestion = suggestions[0]
    const primaryFix = topSuggestion ? `Primary: ${topSuggestion.title}` : ''

    return `${bottlenecks.length} issues found (${criticalCount} critical, ${highCount} high). ${primaryFix}`
  }
}

// ========================================
// Factory
// ========================================

/**
 * Create diagnostic report from various inputs
 */
export function createDiagnosticReport(input: {
  bottlenecks?: Bottleneck[]
  databaseIssues?: DatabaseIssueType[]
  apiIssues?: APIIssueType[]
}): DiagnosticReport {
  const generator = new DiagnosticSuggestionGenerator()

  // Convert issues to bottleneck-like objects if needed
  let bottlenecks: Bottleneck[] = []

  if (input.bottlenecks) {
    bottlenecks = input.bottlenecks
  }

  return generator.generateReport(bottlenecks)
}

// ========================================
// Export
// ========================================

export const diagnosticGenerator = new DiagnosticSuggestionGenerator()

export default DiagnosticSuggestionGenerator
