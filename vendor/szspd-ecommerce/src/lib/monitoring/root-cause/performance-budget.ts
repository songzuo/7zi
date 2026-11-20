// @ts-nocheck
/**
 * Performance Budget Controller
 * 性能预算控制器
 *
 * 功能：
 * - 定义性能预算阈值（各指标阈值）
 * - 预算超限告警
 * - 预算合规报告
 */

// ========================================
// Types
// ========================================

export interface BudgetThreshold {
  metric: string
  threshold: number
  unit: 'ms' | 'score' | 'bytes' | 'count' | '%'
  comparison: 'lt' | 'lte' | 'gt' | 'gte' // Less than, Less than or equal, etc.
  severity: 'warning' | 'error'
  category: 'web-vitals' | 'resource' | 'timing' | 'memory' | 'custom'
  description: string
}

export interface BudgetViolation {
  metric: string
  actualValue: number
  threshold: number
  unit: string
  severity: 'warning' | 'error'
  deviation: number // percentage
  timestamp: Date
  url?: string
  details?: Record<string, unknown>
}

export interface BudgetComplianceReport {
  timestamp: Date
  url?: string
  period: { start: Date; end: Date }
  overallScore: number // 0-100
  complianceStatus: 'compliant' | 'warning' | 'violated'
  violations: BudgetViolation[]
  warnings: BudgetViolation[]
  errors: BudgetViolation[]
  passedMetrics: string[]
  summary: string
  recommendations: string[]
}

export interface BudgetAlert {
  violation: BudgetViolation
  suppressed: boolean
  suppressionReason?: string
  alertSent: boolean
  alertTimestamp?: Date
}

export interface BudgetHistory {
  timestamp: Date
  url?: string
  score: number
  complianceStatus: 'compliant' | 'warning' | 'violated'
  violationCount: number
}

// ========================================
// Default Budget Thresholds
// ========================================

export const DEFAULT_BUDGET_THRESHOLDS: BudgetThreshold[] = [
  // Core Web Vitals
  {
    metric: 'FCP',
    threshold: 1800,
    unit: 'ms',
    comparison: 'lte',
    severity: 'error',
    category: 'web-vitals',
    description: 'First Contentful Paint should be ≤ 1.8s',
  },
  {
    metric: 'LCP',
    threshold: 2500,
    unit: 'ms',
    comparison: 'lte',
    severity: 'error',
    category: 'web-vitals',
    description: 'Largest Contentful Paint should be ≤ 2.5s',
  },
  {
    metric: 'CLS',
    threshold: 0.1,
    unit: 'score',
    comparison: 'lte',
    severity: 'error',
    category: 'web-vitals',
    description: 'Cumulative Layout Shift should be ≤ 0.1',
  },
  {
    metric: 'FID',
    threshold: 100,
    unit: 'ms',
    comparison: 'lte',
    severity: 'error',
    category: 'web-vitals',
    description: 'First Input Delay should be ≤ 100ms',
  },
  {
    metric: 'INP',
    threshold: 200,
    unit: 'ms',
    comparison: 'lte',
    severity: 'error',
    category: 'web-vitals',
    description: 'Interaction to Next Paint should be ≤ 200ms',
  },
  {
    metric: 'TTFB',
    threshold: 800,
    unit: 'ms',
    comparison: 'lte',
    severity: 'error',
    category: 'web-vitals',
    description: 'Time to First Byte should be ≤ 800ms',
  },
  {
    metric: 'TBT',
    threshold: 200,
    unit: 'ms',
    comparison: 'lte',
    severity: 'warning',
    category: 'web-vitals',
    description: 'Total Blocking Time should be ≤ 200ms',
  },
  {
    metric: 'TTI',
    threshold: 3800,
    unit: 'ms',
    comparison: 'lte',
    severity: 'warning',
    category: 'web-vitals',
    description: 'Time to Interactive should be ≤ 3.8s',
  },

  // Resource budgets
  {
    metric: 'totalTransferSize',
    threshold: 1024 * 1024, // 1MB
    unit: 'bytes',
    comparison: 'lte',
    severity: 'error',
    category: 'resource',
    description: 'Total page transfer size should be ≤ 1MB',
  },
  {
    metric: 'documentSize',
    threshold: 50 * 1024, // 50KB
    unit: 'bytes',
    comparison: 'lte',
    severity: 'warning',
    category: 'resource',
    description: 'Document size should be ≤ 50KB',
  },
  {
    metric: 'scriptSize',
    threshold: 300 * 1024, // 300KB
    unit: 'bytes',
    comparison: 'lte',
    severity: 'error',
    category: 'resource',
    description: 'Total JavaScript size should be ≤ 300KB',
  },
  {
    metric: 'cssSize',
    threshold: 100 * 1024, // 100KB
    unit: 'bytes',
    comparison: 'lte',
    severity: 'warning',
    category: 'resource',
    description: 'Total CSS size should be ≤ 100KB',
  },
  {
    metric: 'imageSize',
    threshold: 500 * 1024, // 500KB
    unit: 'bytes',
    comparison: 'lte',
    severity: 'error',
    category: 'resource',
    description: 'Total image size should be ≤ 500KB',
  },

  // Request budgets
  {
    metric: 'requestCount',
    threshold: 50,
    unit: 'count',
    comparison: 'lte',
    severity: 'warning',
    category: 'resource',
    description: 'Total number of requests should be ≤ 50',
  },
  {
    metric: 'thirdPartyRequestCount',
    threshold: 20,
    unit: 'count',
    comparison: 'lte',
    severity: 'error',
    category: 'resource',
    description: 'Third-party requests should be ≤ 20',
  },

  // Timing budgets
  {
    metric: 'domContentLoaded',
    threshold: 2000,
    unit: 'ms',
    comparison: 'lte',
    severity: 'warning',
    category: 'timing',
    description: 'DOM Content Loaded should be ≤ 2s',
  },
  {
    metric: 'windowLoad',
    threshold: 3000,
    unit: 'ms',
    comparison: 'lte',
    severity: 'warning',
    category: 'timing',
    description: 'Window Load should be ≤ 3s',
  },

  // Memory budgets
  {
    metric: 'memoryUsage',
    threshold: 100 * 1024 * 1024, // 100MB
    unit: 'bytes',
    comparison: 'lte',
    severity: 'warning',
    category: 'memory',
    description: 'Memory usage should be ≤ 100MB',
  },
  {
    metric: 'memoryUsageRatio',
    threshold: 0.7, // 70%
    unit: '%',
    comparison: 'lte',
    severity: 'error',
    category: 'memory',
    description: 'Memory usage ratio should be ≤ 70%',
  },

  // DOM budgets
  {
    metric: 'domNodeCount',
    threshold: 1500,
    unit: 'count',
    comparison: 'lte',
    severity: 'warning',
    category: 'resource',
    description: 'DOM node count should be ≤ 1500',
  },
  {
    metric: 'domDepth',
    threshold: 32,
    unit: 'count',
    comparison: 'lte',
    severity: 'warning',
    category: 'resource',
    description: 'DOM depth should be ≤ 32',
  },
]

// ========================================
// Performance Budget Controller Class
// ========================================

export class PerformanceBudgetController {
  private thresholds: BudgetThreshold[] = [...DEFAULT_BUDGET_THRESHOLDS]
  private alerts: BudgetAlert[] = []
  private history: BudgetHistory[] = []
  private readonly maxHistoryLength = 100
  private maxAlerts = 50

  /**
   * Check metrics against budget thresholds
   */
  checkBudgets(metrics: Record<string, number>, url?: string): BudgetComplianceReport {
    const violations: BudgetViolation[] = []
    const passedMetrics: string[] = []

    for (const threshold of this.thresholds) {
      const actualValue = metrics[threshold.metric]

      if (actualValue === undefined) {
        // Skip if metric not provided
        continue
      }

      const violation = this.checkThreshold(threshold, actualValue, url)

      if (violation) {
        violations.push(violation)
      } else {
        passedMetrics.push(threshold.metric)
      }
    }

    const warnings = violations.filter(v => v.severity === 'warning')
    const errors = violations.filter(v => v.severity === 'error')

    // Calculate overall score
    const overallScore = this.calculateOverallScore(violations, this.thresholds.length)

    // Determine compliance status
    const complianceStatus =
      errors.length > 0 ? 'violated' : warnings.length > 0 ? 'warning' : 'compliant'

    // Generate summary
    const summary = this.generateSummary(complianceStatus, violations)

    // Generate recommendations
    const recommendations = this.generateRecommendations(violations)

    // Store in history
    this.addToHistory({
      timestamp: new Date(),
      url,
      score: overallScore,
      complianceStatus,
      violationCount: violations.length,
    })

    // Create alerts for new violations
    for (const violation of violations) {
      this.createAlert(violation)
    }

    return {
      timestamp: new Date(),
      url,
      period: {
        start: new Date(Date.now() - 60000), // Last minute
        end: new Date(),
      },
      overallScore,
      complianceStatus,
      violations,
      warnings,
      errors,
      passedMetrics,
      summary,
      recommendations,
    }
  }

  /**
   * Check a single threshold
   */
  private checkThreshold(
    threshold: BudgetThreshold,
    actualValue: number,
    url?: string
  ): BudgetViolation | null {
    let violated = false

    switch (threshold.comparison) {
      case 'lt':
        violated = actualValue >= threshold.threshold
        break
      case 'lte':
        violated = actualValue > threshold.threshold
        break
      case 'gt':
        violated = actualValue <= threshold.threshold
        break
      case 'gte':
        violated = actualValue < threshold.threshold
        break
    }

    if (!violated) {
      return null
    }

    const deviation =
      threshold.threshold === 0
        ? 100
        : Math.abs((actualValue - threshold.threshold) / threshold.threshold) * 100

    return {
      metric: threshold.metric,
      actualValue,
      threshold: threshold.threshold,
      unit: threshold.unit,
      severity: threshold.severity,
      deviation: Math.round(deviation * 100) / 100,
      timestamp: new Date(),
      url,
      details: {
        category: threshold.category,
        description: threshold.description,
      },
    }
  }

  /**
   * Calculate overall compliance score
   */
  private calculateOverallScore(violations: BudgetViolation[], totalThresholds: number): number {
    if (violations.length === 0) return 100

    let totalDeduction = 0
    for (const violation of violations) {
      const weight = violation.severity === 'error' ? 2 : 1
      totalDeduction += weight * (violation.deviation / 100)
    }

    const score = 100 - (totalDeduction / totalThresholds) * 100
    return Math.max(0, Math.round(score))
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    status: 'compliant' | 'warning' | 'violated',
    violations: BudgetViolation[]
  ): string {
    if (status === 'compliant') {
      return 'All performance budgets are within acceptable limits.'
    }

    const errorCount = violations.filter(v => v.severity === 'error').length
    const warningCount = violations.filter(v => v.severity === 'warning').length

    if (status === 'violated') {
      return `${errorCount} critical and ${warningCount} warning budget violations detected. Immediate attention required.`
    }

    return `${warningCount} budget warnings detected. Optimization recommended.`
  }

  /**
   * Generate recommendations for violations
   */
  private generateRecommendations(violations: BudgetViolation[]): string[] {
    const recommendations: string[] = []
    const seenMetrics = new Set<string>()

    for (const violation of violations) {
      if (seenMetrics.has(violation.metric)) {
        continue
      }

      seenMetrics.add(violation.metric)
      const metricRecs = this.getRecommendationsForMetric(
        violation.metric,
        violation.actualValue,
        violation.threshold
      )
      recommendations.push(...metricRecs)
    }

    return recommendations.slice(0, 10) // Top 10 recommendations
  }

  /**
   * Get recommendations for a specific metric
   */
  private getRecommendationsForMetric(metric: string, actual: number, threshold: number): string[] {
    const recommendations: Record<string, string[]> = {
      FCP: [
        'Eliminate render-blocking resources using async/defer for scripts',
        'Inline critical CSS for above-the-fold content',
        'Preload critical fonts and images',
        'Optimize server response time (TTFB)',
        'Use server-side rendering or static generation for initial content',
      ],
      LCP: [
        'Optimize and preload the LCP image element',
        'Use a CDN for faster content delivery',
        'Implement responsive images with srcset and sizes',
        'Compress images with modern formats (WebP, AVIF)',
        'Preconnect to required origins',
        'Reduce server response time',
      ],
      CLS: [
        'Set explicit width and height on all images and videos',
        'Reserve space for ads and embeds using CSS aspect-ratio',
        'Use font-display: swap for web fonts',
        'Avoid inserting content above existing content',
        'Use CSS transform for animations instead of layout properties',
        'Preload critical fonts to prevent layout shifts',
      ],
      FID: [
        'Break up long JavaScript tasks into smaller chunks',
        'Minimize main thread work by using web workers',
        'Reduce JavaScript execution time',
        'Keep request counts low and transfer sizes small',
        'Optimize JavaScript bundles with code splitting',
      ],
      INP: [
        'Break up long tasks with setTimeout or requestIdleCallback',
        'Use web workers for CPU-intensive operations',
        'Debounce or throttle event handlers',
        'Optimize React re-renders with memo, useMemo, useCallback',
        'Reduce JavaScript bundle size',
        'Use passive event listeners where possible',
      ],
      TTFB: [
        'Optimize server-side rendering and caching',
        'Use a CDN for faster content delivery',
        'Implement server-side caching',
        'Optimize database queries',
        'Use compression (gzip/brotli) for responses',
      ],
      totalTransferSize: [
        'Optimize images with compression and modern formats',
        'Minify and compress CSS, JavaScript, and HTML',
        'Remove unused JavaScript and CSS',
        'Implement lazy loading for images and videos',
        'Use tree shaking to eliminate dead code',
      ],
      scriptSize: [
        'Minify and compress JavaScript files',
        'Remove unused code with tree shaking',
        'Implement code splitting and lazy loading',
        'Use smaller alternative libraries',
        'Enable module/nomodule for modern browsers',
      ],
      cssSize: [
        'Minify and compress CSS files',
        'Remove unused CSS with PurgeCSS',
        'Implement CSS critical path inlining',
        'Use CSS-in-JS libraries with careful bundle size management',
        'Avoid CSS frameworks for simple styling needs',
      ],
      imageSize: [
        'Compress images with modern formats (WebP, AVIF)',
        'Implement responsive images with srcset',
        'Use lazy loading for below-the-fold images',
        'Serve appropriately sized images based on device',
        'Consider using SVG for icons and simple graphics',
      ],
      requestCount: [
        'Combine and bundle CSS and JavaScript files',
        'Use CSS sprites for small images',
        'Implement HTTP/2 multiplexing',
        'Use data URIs for very small images',
        'Consider resource hints (preload, prefetch, preconnect)',
      ],
      domNodeCount: [
        'Remove unnecessary DOM elements',
        'Implement virtual scrolling for long lists',
        'Use server-side rendering for large content',
        'Avoid deeply nested DOM structures',
        'Consider document fragments for batch updates',
      ],
      memoryUsage: [
        'Profile memory usage with Chrome DevTools heap snapshots',
        'Fix memory leaks by cleaning up event listeners and timers',
        'Use WeakMap/WeakSet for cached references',
        'Implement object pooling for frequently created objects',
        'Lazy load data and components',
      ],
    }

    return (
      recommendations[metric] || [
        `Optimize ${metric} to stay within the budget threshold of ${threshold}.`,
      ]
    )
  }

  /**
   * Create an alert for a violation
   */
  private createAlert(violation: BudgetViolation): void {
    // Check if alert already exists for this metric
    const existingAlert = this.alerts.find(
      a =>
        a.violation.metric === violation.metric &&
        a.violation.url === violation.url &&
        a.violation.timestamp.getTime() > Date.now() - 300000 // Last 5 minutes
    )

    if (existingAlert) {
      return
    }

    const alert: BudgetAlert = {
      violation,
      suppressed: false,
      alertSent: false,
    }

    this.alerts.push(alert)

    // Trim alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift()
    }
  }

  /**
   * Add history entry
   */
  private addToHistory(entry: BudgetHistory): void {
    this.history.push(entry)

    if (this.history.length > this.maxHistoryLength) {
      this.history.shift()
    }
  }

  /**
   * Get budget thresholds
   */
  getThresholds(): BudgetThreshold[] {
    return [...this.thresholds]
  }

  /**
   * Set budget thresholds
   */
  setThresholds(thresholds: BudgetThreshold[]): void {
    this.thresholds = [...thresholds]
  }

  /**
   * Add or update a budget threshold
   */
  setThreshold(threshold: BudgetThreshold): void {
    const index = this.thresholds.findIndex(t => t.metric === threshold.metric)
    if (index >= 0) {
      this.thresholds[index] = threshold
    } else {
      this.thresholds.push(threshold)
    }
  }

  /**
   * Remove a budget threshold
   */
  removeThreshold(metric: string): void {
    this.thresholds = this.thresholds.filter(t => t.metric !== metric)
  }

  /**
   * Get alerts
   */
  getAlerts(): BudgetAlert[] {
    return [...this.alerts]
  }

  /**
   * Get history
   */
  getHistory(): BudgetHistory[] {
    return [...this.history]
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = []
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = []
  }

  /**
   * Get compliance report for a URL over a time period
   */
  getComplianceReportByUrl(
    url: string,
    startDate?: Date,
    endDate?: Date
  ): BudgetComplianceReport | null {
    const filteredHistory = this.history.filter(h => {
      if (h.url !== url) return false
      if (startDate && h.timestamp < startDate) return false
      if (endDate && h.timestamp > endDate) return false
      return true
    })

    if (filteredHistory.length === 0) {
      return null
    }

    const avgScore = filteredHistory.reduce((sum, h) => sum + h.score, 0) / filteredHistory.length
    const violationCounts = filteredHistory.map(h => h.violationCount)
    const avgViolations = violationCounts.reduce((sum, c) => sum + c, 0) / violationCounts.length

    const complianceStatus = avgScore >= 80 ? 'compliant' : avgScore >= 50 ? 'warning' : 'violated'

    return {
      timestamp: new Date(),
      url,
      period: {
        start: startDate ?? filteredHistory[0].timestamp,
        end: endDate ?? filteredHistory[filteredHistory.length - 1].timestamp,
      },
      overallScore: Math.round(avgScore),
      complianceStatus,
      violations: [], // Not tracking per-URL violations in history
      warnings: [],
      errors: [],
      passedMetrics: [],
      summary: `${complianceStatus === 'compliant' ? 'Good' : complianceStatus === 'warning' ? 'Needs improvement' : 'Poor'} compliance over ${filteredHistory.length} checks. Average score: ${Math.round(avgScore)}/100, ${Math.round(avgViolations)} violations per check.`,
      recommendations:
        complianceStatus === 'violated'
          ? ['Review and optimize performance issues detected in recent checks']
          : complianceStatus === 'warning'
            ? ['Monitor performance and address minor issues before they escalate']
            : ['Continue maintaining good performance standards'],
    }
  }

  /**
   * Get trending performance score
   */
  getPerformanceTrend(
    hours: number = 24
  ): Array<{ timestamp: Date; score: number; status: string }> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    const recentHistory = this.history.filter(h => h.timestamp > cutoffTime)

    return recentHistory.map(h => ({
      timestamp: h.timestamp,
      score: h.score,
      status: h.complianceStatus,
    }))
  }

  /**
   * Suppress an alert
   */
  suppressAlert(metric: string, url?: string, reason?: string): boolean {
    const alert = this.alerts.find(
      a => a.violation.metric === metric && (!url || a.violation.url === url) && !a.suppressed
    )

    if (!alert) {
      return false
    }

    alert.suppressed = true
    alert.suppressionReason = reason
    return true
  }

  /**
   * Unsuspend an alert
   */
  unsuppressAlert(metric: string, url?: string): boolean {
    const alert = this.alerts.find(
      a => a.violation.metric === metric && (!url || a.violation.url === url) && a.suppressed
    )

    if (!alert) {
      return false
    }

    alert.suppressed = false
    alert.suppressionReason = undefined
    return true
  }

  /**
   * Get violated metrics
   */
  getViolatedMetrics(): string[] {
    return this.alerts
      .filter(a => !a.suppressed && a.violation.severity === 'error')
      .map(a => a.violation.metric)
  }

  /**
   * Get warning metrics
   */
  getWarningMetrics(): string[] {
    return this.alerts
      .filter(a => !a.suppressed && a.violation.severity === 'warning')
      .map(a => a.violation.metric)
  }

  /**
   * Reset the controller
   */
  reset(): void {
    this.thresholds = [...DEFAULT_BUDGET_THRESHOLDS]
    this.alerts = []
    this.history = []
  }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Create mock performance metrics for testing
 */
export function createMockPerformanceMetrics(
  overrides: Record<string, number> = {}
): Record<string, number> {
  return {
    FCP: overrides.FCP ?? 1200,
    LCP: overrides.LCP ?? 2000,
    CLS: overrides.CLS ?? 0.05,
    FID: overrides.FID ?? 50,
    INP: overrides.INP ?? 100,
    TTFB: overrides.TTFB ?? 600,
    TBT: overrides.TBT ?? 150,
    TTI: overrides.TTI ?? 2500,
    totalTransferSize: overrides.totalTransferSize ?? 500 * 1024,
    documentSize: overrides.documentSize ?? 30 * 1024,
    scriptSize: overrides.scriptSize ?? 200 * 1024,
    cssSize: overrides.cssSize ?? 50 * 1024,
    imageSize: overrides.imageSize ?? 250 * 1024,
    requestCount: overrides.requestCount ?? 25,
    thirdPartyRequestCount: overrides.thirdPartyRequestCount ?? 10,
    domContentLoaded: overrides.domContentLoaded ?? 1500,
    windowLoad: overrides.windowLoad ?? 2500,
    memoryUsage: overrides.memoryUsage ?? 80 * 1024 * 1024,
    memoryUsageRatio: overrides.memoryUsageRatio ?? 0.6,
    domNodeCount: overrides.domNodeCount ?? 1200,
    domDepth: overrides.domDepth ?? 20,
    ...overrides,
  }
}

// ========================================
// Export singleton instance
// ========================================

export const performanceBudgetController = new PerformanceBudgetController()

export default PerformanceBudgetController
