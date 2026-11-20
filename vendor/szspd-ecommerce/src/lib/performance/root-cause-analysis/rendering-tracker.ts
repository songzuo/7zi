/**
 * Rendering Performance Tracker
 *
 * Tracks rendering performance metrics and identifies issues
 */

import {
  RenderingMetrics,
  RenderingAnalysis,
  RenderingIssueType,
  RenderingIssue,
  RenderingBottleneck,
  RenderingRecommendation,
  Severity,
  SeverityLevel,
  RootCauseAnalysisConfig,
  DEFAULT_CONFIG,
} from './types'

// Re-export types for external use
export type { RenderingMetrics } from './types'

// ============================================================================
// Rendering Tracker Class
// ============================================================================

export class RenderingTracker {
  private config: RootCauseAnalysisConfig
  private metricsHistory: RenderingMetrics[] = []
  private longTasks: LongTask[] = []
  private layoutShifts: LayoutShiftEntry[] = []

  constructor(config: Partial<RootCauseAnalysisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.setupPerformanceObserver()
  }

  // ============================================================================
  // Metrics Tracking
  // ============================================================================

  /**
   * Track rendering metrics
   */
  trackMetrics(metrics: Omit<RenderingMetrics, 'id' | 'timestamp' | 'issues'>): RenderingMetrics {
    const trackedMetrics: RenderingMetrics = {
      id: this.generateMetricsId(),
      ...metrics,
      timestamp: Date.now(),
      issues: this.detectIssues(metrics),
    }

    // Add to history
    this.metricsHistory.push(trackedMetrics)
    this.pruneHistory()

    return trackedMetrics
  }

  /**
   * Track a long task (>50ms)
   */
  trackLongTask(duration: number, startTime: number, attribution?: string): void {
    const longTask: LongTask = {
      id: this.generateLongTaskId(),
      duration,
      startTime,
      attribution,
      timestamp: Date.now(),
    }

    this.longTasks.push(longTask)

    // Clean old tasks
    this.pruneLongTasks()
  }

  /**
   * Track a layout shift (CLS)
   */
  trackLayoutShift(value: number, sources?: LayoutShiftSource[]): void {
    const entry: LayoutShiftEntry = {
      id: this.generateLayoutShiftId(),
      value,
      sources,
      timestamp: Date.now(),
    }

    this.layoutShifts.push(entry)

    // Clean old shifts
    this.pruneLayoutShifts()
  }

  // ============================================================================
  // Performance Observer Setup
  // ============================================================================

  /**
   * Setup Performance Observer for automatic tracking
   */
  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return
    }

    try {
      // Observe long tasks
      try {
        const longTaskObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.duration > this.config.rendering.longTaskThreshold) {
              const attribution = this.getTaskAttribution(entry)
              this.trackLongTask(entry.duration, entry.startTime, attribution)
            }
          }
        })
        longTaskObserver.observe({ entryTypes: ['longtask'] })
      } catch (e) {
        // Long task API may not be supported in all browsers
      }

      // Observe layout shifts
      try {
        interface LayoutShiftEntry extends PerformanceEntry {
          value: number
          hadRecentInput: boolean
          sources?: Array<{ node?: Node; previousRect?: DOMRect; currentRect?: DOMRect }>
        }
        const layoutShiftObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            const ls = entry as LayoutShiftEntry
            if (!ls.hadRecentInput) {
              const sources = (ls.sources || []).map(s => ({
                node: s.node?.nodeName || undefined,
                previousRect: s.previousRect,
                currentRect: s.currentRect,
              })) as LayoutShiftSource[]
              this.trackLayoutShift(ls.value, sources)
            }
          }
        })
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] })
      } catch (e) {
        // Layout shift API may not be supported in all browsers
      }

      // Observe LCP
      try {
        const lcpObserver = new PerformanceObserver(list => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          this.trackMetrics({
            lcp: lastEntry.startTime,
            longTaskCount: this.metricsHistory[this.metricsHistory.length - 1]?.longTaskCount || 0,
            longTaskDuration:
              this.metricsHistory[this.metricsHistory.length - 1]?.longTaskDuration || 0,
          })
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      } catch (e) {
        // LCP API may not be supported in all browsers
      }

      // Observe FID
      try {
        interface FirstInputEntry extends PerformanceEntry {
          processingStart: number
          startTime: number
        }
        const fidObserver = new PerformanceObserver(list => {
          const entries = list.getEntries()
          const firstEntry = entries[0] as FirstInputEntry
          this.trackMetrics({
            fid: firstEntry.processingStart - firstEntry.startTime,
            longTaskCount: this.metricsHistory[this.metricsHistory.length - 1]?.longTaskCount || 0,
            longTaskDuration:
              this.metricsHistory[this.metricsHistory.length - 1]?.longTaskDuration || 0,
          })
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
      } catch (e) {
        // FID API may not be supported in all browsers
      }

      // Observe TBT (Total Blocking Time)
      try {
        const tbtObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.duration > this.config.rendering.longTaskThreshold) {
              const longTaskDuration = entry.duration - this.config.rendering.longTaskThreshold
              const currentTbt = this.metricsHistory[this.metricsHistory.length - 1]?.tbt || 0
              const currentLongTaskCount =
                this.metricsHistory[this.metricsHistory.length - 1]?.longTaskCount || 0
              const currentLongTaskDuration =
                this.metricsHistory[this.metricsHistory.length - 1]?.longTaskDuration || 0
              this.trackMetrics({
                tbt: currentTbt + longTaskDuration,
                longTaskCount: currentLongTaskCount,
                longTaskDuration: currentLongTaskDuration,
              })
            }
          }
        })
        tbtObserver.observe({ entryTypes: ['longtask'] })
      } catch (e) {
        // Long task API may not be supported in all browsers
      }
    } catch (e) {
      // PerformanceObserver may not be supported
    }
  }

  /**
   * Get task attribution
   */
  private getTaskAttribution(entry: PerformanceEntry): string {
    try {
      interface LongTaskEntry extends PerformanceEntry {
        attribution?: Array<{ name?: string; container?: { type?: string } }>
      }
      const attribution = (entry as LongTaskEntry).attribution
      if (attribution && attribution.length > 0) {
        const firstAttribution = attribution[0]
        return firstAttribution.name || firstAttribution.container?.type || 'unknown'
      }
    } catch (e) {
      // Attribution may not be available
    }
    return 'unknown'
  }

  // ============================================================================
  // Issue Detection
  // ============================================================================

  /**
   * Detect rendering issues
   */
  private detectIssues(
    metrics: Omit<RenderingMetrics, 'id' | 'timestamp' | 'issues'>
  ): RenderingIssueType[] {
    const issues: RenderingIssueType[] = []

    // Check for long tasks
    if (metrics.longTaskCount > 10) {
      issues.push('long-tasks')
    }

    // Check for high CLS
    if (metrics.cls && metrics.cls > this.config.rendering.clsThreshold) {
      issues.push('high-cls')
    }

    // Check for slow LCP
    if (metrics.lcp && metrics.lcp > this.config.rendering.lcpThreshold) {
      issues.push('slow-lcp')
    }

    // Check for high FID
    if (metrics.fid && metrics.fid > this.config.rendering.fidThreshold) {
      issues.push('blocking-resource')
    }

    // Check for high TBT
    if (metrics.tbt && metrics.tbt > this.config.rendering.tbtThreshold) {
      issues.push('long-tasks')
    }

    // Check for blocking resources
    if (metrics.longTaskCount > 5 && metrics.longTaskDuration > 300) {
      issues.push('blocking-resource')
    }

    return issues
  }

  // ============================================================================
  // Analysis
  // ============================================================================

  /**
   * Analyze all tracked metrics
   */
  analyze(): RenderingAnalysis {
    const metrics = [...this.metricsHistory]
    const criticalIssues = this.identifyCriticalIssues()
    const bottlenecks = this.identifyBottlenecks()
    const recommendations = this.generateRecommendations()

    return {
      metrics,
      criticalIssues,
      bottlenecks,
      recommendations,
    }
  }

  /**
   * Calculate CLS
   */
  calculateCLS(): number {
    if (this.layoutShifts.length === 0) {
      return 0
    }

    // Calculate session window CLS
    let sessionValue = 0
    let sessionEntries: LayoutShiftEntry[] = []

    for (const entry of this.layoutShifts) {
      sessionEntries.push(entry)
      sessionValue += entry.value

      // Remove old entries outside the 1-second window
      const lastEntryTime = entry.timestamp
      sessionEntries = sessionEntries.filter(e => e.timestamp >= lastEntryTime - 1000)

      // Update session value to only include entries in the window
      sessionValue = sessionEntries.reduce((sum, e) => sum + e.value, 0)
    }

    return sessionValue
  }

  /**
   * Calculate Total Blocking Time
   */
  calculateTBT(): number {
    return this.longTasks
      .filter(task => task.duration > this.config.rendering.longTaskThreshold)
      .reduce((total, task) => total + (task.duration - this.config.rendering.longTaskThreshold), 0)
  }

  /**
   * Identify critical issues
   */
  private identifyCriticalIssues(): RenderingIssue[] {
    const issues: RenderingIssue[] = []
    const issueMap = new Map<RenderingIssueType, RenderingMetrics[]>()

    // Group metrics by issue type
    this.metricsHistory.forEach(metrics => {
      metrics.issues.forEach(issueType => {
        if (!issueMap.has(issueType)) {
          issueMap.set(issueType, [])
        }
        issueMap.get(issueType)!.push(metrics)
      })
    })

    // Create issue objects
    issueMap.forEach((affectedMetrics, type) => {
      const severity = this.calculateIssueSeverity(type, affectedMetrics)

      issues.push({
        id: `issue-${type}-${Date.now()}`,
        type,
        severity,
        description: this.getIssueDescription(type, affectedMetrics),
        affectedMetrics,
        impact: this.calculateImpact(type, affectedMetrics),
        component: this.getComponentInvolved(type, affectedMetrics),
      })
    })

    // Sort by severity
    return issues.sort((a, b) => b.severity.score - a.severity.score)
  }

  /**
   * Identify bottlenecks
   */
  private identifyBottlenecks(): RenderingBottleneck[] {
    const bottlenecks: RenderingBottleneck[] = []

    // Long task bottleneck
    const totalBlockingTime = this.calculateTBT()
    if (totalBlockingTime > this.config.rendering.tbtThreshold) {
      const longTaskBottleneck: RenderingBottleneck = {
        id: `bottleneck-long-tasks-${Date.now()}`,
        type: 'javascript',
        severity: this.calculateTBTSeverity(totalBlockingTime),
        description: 'JavaScript execution is blocking the main thread',
        contribution: Math.min((totalBlockingTime / 5000) * 100, 100),
        source: this.getMostAttributedTask(),
      }
      bottlenecks.push(longTaskBottleneck)
    }

    // Layout shift bottleneck
    const cls = this.calculateCLS()
    if (cls > this.config.rendering.clsThreshold) {
      const layoutBottleneck: RenderingBottleneck = {
        id: `bottleneck-layout-${Date.now()}`,
        type: 'layout',
        severity: this.calculateCLSSeverity(cls),
        description: 'Unexpected layout shifts are affecting visual stability',
        contribution: Math.min((cls / 0.5) * 100, 100),
        source: this.getTopLayoutShiftSource(),
      }
      bottlenecks.push(layoutBottleneck)
    }

    // Styling bottleneck
    const averageLongTaskDuration =
      this.longTasks.length > 0
        ? this.longTasks.reduce((sum, t) => sum + t.duration, 0) / this.longTasks.length
        : 0

    if (averageLongTaskDuration > 100) {
      const stylingBottleneck: RenderingBottleneck = {
        id: `bottleneck-styling-${Date.now()}`,
        type: 'styling',
        severity: {
          level: 'medium',
          score: 60,
          label: '🟡 Medium - Should be optimized',
        },
        description: 'CSS recalculation and styling is taking significant time',
        contribution: Math.min((averageLongTaskDuration / 200) * 50, 50),
        source: 'CSS recalculation',
      }
      bottlenecks.push(stylingBottleneck)
    }

    return bottlenecks
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(): RenderingRecommendation[] {
    const recommendations: RenderingRecommendation[] = []
    const issues = this.identifyCriticalIssues()

    issues.forEach(issue => {
      const recommendation = this.createRecommendation(issue)
      if (recommendation) {
        recommendations.push(recommendation)
      }
    })

    return recommendations.sort((a, b) => b.severity.score - a.severity.score)
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Calculate issue severity
   */
  private calculateIssueSeverity(type: RenderingIssueType, metrics: RenderingMetrics[]): Severity {
    const latestMetrics = metrics[metrics.length - 1]
    const count = metrics.length

    const typeSeverity: Record<RenderingIssueType, SeverityLevel> = {
      'long-tasks': 'medium',
      'layout-shift': 'high',
      'slow-lcp': 'high',
      'high-cls': 'high',
      'blocking-resource': 'medium',
      'hydration-mismatch': 'high',
      'uncontrolled-renders': 'medium',
    }

    const level = typeSeverity[type] || 'low'
    let score = 0

    switch (level) {
      case 'critical':
        score = 80 + Math.min(count, 20)
        break
      case 'high':
        score = 60 + Math.min(count * 2, 25)
        break
      case 'medium':
        score = 40 + Math.min(count, 20)
        break
      case 'low':
        score = 20 + Math.min(count, 10)
        break
      default:
        score = 10
    }

    // Adjust based on metric values
    if (latestMetrics.lcp && latestMetrics.lcp > 4000) {
      score = Math.min(score + 15, 100)
    }

    if (latestMetrics.cls && latestMetrics.cls > 0.25) {
      score = Math.min(score + 15, 100)
    }

    return { level, score: Math.min(score, 100), label: this.getSeverityLabel(level) }
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
   * Get issue description
   */
  private getIssueDescription(type: RenderingIssueType, metrics: RenderingMetrics[]): string {
    const descriptions: Record<RenderingIssueType, string> = {
      'long-tasks': `${metrics.length} instances of long blocking tasks detected`,
      'layout-shift': `${metrics.length} layout shifts detected affecting visual stability`,
      'slow-lcp': `LCP times exceed ${this.config.rendering.lcpThreshold}ms threshold`,
      'high-cls': `CLS values exceed ${this.config.rendering.clsThreshold} threshold`,
      'blocking-resource': `${metrics.length} instances of resource blocking detected`,
      'hydration-mismatch': 'Server-side hydration mismatch detected',
      'uncontrolled-renders': 'Uncontrolled component re-renders detected',
    }
    return descriptions[type]
  }

  /**
   * Calculate impact
   */
  private calculateImpact(type: RenderingIssueType, metrics: RenderingMetrics[]): string {
    const latestMetrics = metrics[metrics.length - 1]

    const impacts: Record<RenderingIssueType, string> = {
      'long-tasks': `Total blocking time: ${this.calculateTBT().toFixed(0)}ms`,
      'layout-shift': `Cumulative Layout Shift: ${this.calculateCLS().toFixed(3)}`,
      'slow-lcp': `Latest LCP: ${latestMetrics.lcp?.toFixed(0)}ms (threshold: ${this.config.rendering.lcpThreshold}ms)`,
      'high-cls': `Latest CLS: ${latestMetrics.cls?.toFixed(3)} (threshold: ${this.config.rendering.clsThreshold})`,
      'blocking-resource': `${metrics.length} blocking resources identified`,
      'hydration-mismatch': 'Causing client-side render errors',
      'uncontrolled-renders': `${metrics.length} unnecessary re-renders detected`,
    }
    return impacts[type]
  }

  /**
   * Get component involved
   */
  private getComponentInvolved(
    type: RenderingIssueType,
    metrics: RenderingMetrics[]
  ): string | undefined {
    if (type === 'long-tasks' || type === 'blocking-resource') {
      return this.getMostAttributedTask()
    }
    if (type === 'layout-shift' || type === 'high-cls') {
      return this.getTopLayoutShiftSource()
    }
    return undefined
  }

  /**
   * Get most attributed task
   */
  private getMostAttributedTask(): string {
    const taskCounts = new Map<string, number>()
    this.longTasks.forEach(task => {
      if (task.attribution) {
        taskCounts.set(task.attribution, (taskCounts.get(task.attribution) || 0) + 1)
      }
    })

    let maxTask = ''
    let maxCount = 0
    taskCounts.forEach((count, task) => {
      if (count > maxCount) {
        maxCount = count
        maxTask = task
      }
    })

    return maxTask || 'unknown'
  }

  /**
   * Get top layout shift source
   */
  private getTopLayoutShiftSource(): string | undefined {
    const sourceCounts = new Map<string, number>()
    this.layoutShifts.forEach(shift => {
      shift.sources?.forEach(source => {
        const key = source.node || 'unknown'
        sourceCounts.set(key, (sourceCounts.get(key) || 0) + 1)
      })
    })

    let maxSource = ''
    let maxCount = 0
    sourceCounts.forEach((count, source) => {
      if (count > maxCount) {
        maxCount = count
        maxSource = source
      }
    })

    return maxSource || undefined
  }

  /**
   * Calculate TBT severity
   */
  private calculateTBTSeverity(tbt: number): Severity {
    if (tbt > 600) {
      return {
        level: 'critical',
        score: 95,
        label: '🔴 Critical - Very poor responsiveness',
      }
    }
    if (tbt > 300) {
      return {
        level: 'high',
        score: 80,
        label: '🟠 High - Poor responsiveness',
      }
    }
    if (tbt > 200) {
      return {
        level: 'medium',
        score: 60,
        label: '🟡 Medium - Needs improvement',
      }
    }
    return {
      level: 'low',
      score: 30,
      label: '🟢 Low - Minor impact',
    }
  }

  /**
   * Calculate CLS severity
   */
  private calculateCLSSeverity(cls: number): Severity {
    if (cls > 0.25) {
      return {
        level: 'critical',
        score: 95,
        label: '🔴 Critical - Poor visual stability',
      }
    }
    if (cls > 0.1) {
      return {
        level: 'high',
        score: 80,
        label: '🟠 High - Needs improvement',
      }
    }
    if (cls > 0.05) {
      return {
        level: 'medium',
        score: 60,
        label: '🟡 Medium - Minor shifts',
      }
    }
    return {
      level: 'low',
      score: 30,
      label: '🟢 Low - Good stability',
    }
  }

  /**
   * Create recommendation
   */
  private createRecommendation(issue: RenderingIssue): RenderingRecommendation | null {
    const templates: Record<RenderingIssueType, () => RenderingRecommendation> = {
      'long-tasks': () => ({
        id: `rec-long-tasks-${Date.now()}`,
        type: 'long-tasks',
        severity: issue.severity,
        title: 'Reduce JavaScript Execution Time',
        description: 'Long JavaScript tasks are blocking the main thread.',
        actionItems: [
          'Split large tasks into smaller chunks using setTimeout or requestIdleCallback',
          'Use Web Workers for CPU-intensive operations',
          'Code splitting to reduce initial JavaScript bundle',
          'Defer non-critical JavaScript',
        ],
        estimatedImpact: '30-70% improvement in responsiveness',
        complexity: 'medium',
        estimatedTime: '4-12 hours',
      }),

      'layout-shift': () => ({
        id: `rec-layout-shift-${Date.now()}`,
        type: 'layout-shift',
        severity: issue.severity,
        title: 'Eliminate Layout Shifts',
        description: 'Unexpected layout shifts are affecting user experience.',
        actionItems: [
          'Include size attributes on images and videos',
          'Reserve space for dynamic content',
          'Avoid inserting content above existing content',
          'Use CSS transforms and opacity for animations',
        ],
        estimatedImpact: '90%+ reduction in CLS',
        complexity: 'low',
        estimatedTime: '2-6 hours',
      }),

      'slow-lcp': () => ({
        id: `rec-slow-lcp-${Date.now()}`,
        type: 'slow-lcp',
        severity: issue.severity,
        title: 'Improve Largest Contentful Paint',
        description: 'Main content is taking too long to appear.',
        actionItems: [
          'Optimize the LCP image (compress, use modern formats)',
          'Preload the LCP resource',
          'Remove render-blocking resources',
          'Improve server response time',
          'Use HTTP/2 or HTTP/3',
        ],
        estimatedImpact: '30-60% faster LCP',
        complexity: 'medium',
        estimatedTime: '4-8 hours',
      }),

      'high-cls': () => ({
        id: `rec-high-cls-${Date.now()}`,
        type: 'high-cls',
        severity: issue.severity,
        title: 'Reduce Cumulative Layout Shift',
        description: 'Cumulative Layout Shift exceeds the good threshold.',
        actionItems: [
          'Ensure all images have width and height attributes',
          'Reserve space for ads and embeds',
          'Avoid DOM injection above existing content',
          'Use font-display: swap for web fonts',
        ],
        estimatedImpact: '80-95% reduction in CLS',
        complexity: 'low',
        estimatedTime: '2-4 hours',
      }),

      'blocking-resource': () => ({
        id: `rec-blocking-${Date.now()}`,
        type: 'blocking-resource',
        severity: issue.severity,
        title: 'Eliminate Render-Blocking Resources',
        description: 'Resources are blocking page rendering.',
        actionItems: [
          'Defer non-critical CSS and JavaScript',
          'Inline critical CSS',
          'Use async/defer attributes for scripts',
          'Preload critical resources',
        ],
        estimatedImpact: '20-40% faster initial render',
        complexity: 'low',
        estimatedTime: '2-4 hours',
      }),

      'hydration-mismatch': () => ({
        id: `rec-hydration-${Date.now()}`,
        type: 'hydration-mismatch',
        severity: issue.severity,
        title: 'Fix Hydration Mismatch',
        description: 'Server and client rendering are not matching.',
        actionItems: [
          'Ensure unique keys for list items',
          'Avoid using Math.random() or Date.now() in render',
          'Check for browser-only APIs in render',
          'Use useEffect for browser-only operations',
        ],
        estimatedImpact: 'Eliminate client-side errors',
        complexity: 'high',
        estimatedTime: '4-8 hours',
      }),

      'uncontrolled-renders': () => ({
        id: `rec-renders-${Date.now()}`,
        type: 'uncontrolled-renders',
        severity: issue.severity,
        title: 'Optimize Component Re-renders',
        description: 'Components are re-rendering unnecessarily.',
        actionItems: [
          'Use React.memo for expensive components',
          'Use useCallback and useMemo for expensive computations',
          'Lift state up to avoid prop drilling',
          'Consider using React Compiler (if available)',
        ],
        estimatedImpact: '20-50% reduction in re-renders',
        complexity: 'medium',
        estimatedTime: '4-10 hours',
      }),
    }

    const template = templates[issue.type]
    return template ? template() : null
  }

  /**
   * Generate unique metrics ID
   */
  private generateMetricsId(): string {
    return `metrics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique long task ID
   */
  private generateLongTaskId(): string {
    return `longtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique layout shift ID
   */
  private generateLayoutShiftId(): string {
    return `layoutshift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Prune metrics history
   */
  private pruneHistory(): void {
    if (this.metricsHistory.length > this.config.history.maxEntries) {
      this.metricsHistory = this.metricsHistory.slice(-this.config.history.maxEntries)
    }
  }

  /**
   * Prune long tasks
   */
  private pruneLongTasks(): void {
    const cutoff = Date.now() - this.config.history.retentionDays * 24 * 60 * 60 * 1000
    this.longTasks = this.longTasks.filter(task => task.timestamp > cutoff)
  }

  /**
   * Prune layout shifts
   */
  private pruneLayoutShifts(): void {
    const cutoff = Date.now() - this.config.history.retentionDays * 24 * 60 * 60 * 1000
    this.layoutShifts = this.layoutShifts.filter(shift => shift.timestamp > cutoff)
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get all tracked metrics
   */
  getHistory(): RenderingMetrics[] {
    return [...this.metricsHistory]
  }

  /**
   * Get long tasks
   */
  getLongTasks(): LongTask[] {
    return [...this.longTasks]
  }

  /**
   * Get layout shifts
   */
  getLayoutShifts(): LayoutShiftEntry[] {
    return [...this.layoutShifts]
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.metricsHistory = []
    this.longTasks = []
    this.layoutShifts = []
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RootCauseAnalysisConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): RootCauseAnalysisConfig {
    return { ...this.config }
  }

  /**
   * Get current Web Vitals
   */
  getWebVitals(): {
    lcp?: number
    cls: number
    fid?: number
    tbt: number
    fcp?: number
    tti?: number
  } {
    const latest = this.metricsHistory[this.metricsHistory.length - 1]
    return {
      lcp: latest?.lcp,
      cls: this.calculateCLS(),
      fid: latest?.fid,
      tbt: this.calculateTBT(),
      fcp: latest?.fcp,
      tti: latest?.tti,
    }
  }
}

// ============================================================================
// Helper Types
// ============================================================================

interface LongTask {
  id: string
  duration: number
  startTime: number
  attribution?: string
  timestamp: number
}

interface LayoutShiftEntry {
  id: string
  value: number
  sources?: LayoutShiftSource[]
  timestamp: number
}

interface LayoutShiftSource {
  node?: string
  currentRect?: DOMRect
  previousRect?: DOMRect
}
