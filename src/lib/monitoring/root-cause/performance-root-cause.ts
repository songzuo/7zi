// @ts-nocheck
/**
 * Performance Root Cause Analyzer
 * 性能根因分析器
 *
 * 功能：
 * - 慢页面诊断（FCP > 3s, LCP > 4s, CLS > 0.1, INP > 500ms）
 * - 内存泄漏检测（长期堆内存增长 > 50MB）
 * - 网络瓶颈识别（DNS/TCP/TLS 连接时间）
 * - 渲染问题诊断（长任务 > 50ms、强制回流）
 */

// ========================================
// Types
// ========================================

export interface CoreWebVitalsMetrics {
  FCP: number // First Contentful Paint (ms)
  LCP: number // Largest Contentful Paint (ms)
  CLS: number // Cumulative Layout Shift (score)
  FID: number // First Input Delay (ms)
  INP: number // Interaction to Next Paint (ms)
  TTFB: number // Time to First Byte (ms)
}

export interface MemoryMetrics {
  usedJSHeapSize: number // bytes
  totalJSHeapSize: number // bytes
  jsHeapSizeLimit: number // bytes
  growthRate: number // bytes/second
  trend: 'increasing' | 'stable' | 'decreasing'
  samples: MemorySample[]
}

export interface MemorySample {
  timestamp: number
  used: number
  total: number
}

export interface NetworkTimingBreakdown {
  dns: number // DNS lookup time (ms)
  tcp: number // TCP connection time (ms)
  tls: number // TLS/SSL negotiation time (ms)
  request: number // Request time (ms)
  response: number // Response time (ms)
  total: number // Total time (ms)
}

export interface NetworkBottleneck {
  type: 'dns' | 'tcp' | 'tls' | 'request' | 'response' | 'connection'
  resource: string
  duration: number
  threshold: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  recommendation: string
}

export interface RenderIssue {
  type: 'long-task' | 'forced-reflow' | 'layout-thrashing' | 'large-paint' | 'blocked-render'
  duration: number
  element?: string
  stackTrace?: unknown
  impact: 'low' | 'medium' | 'high' | 'critical'
  details: Record<string, unknown>
}

export interface SlowPageDiagnosis {
  metric: 'FCP' | 'LCP' | 'CLS' | 'INP'
  actualValue: number
  threshold: number
  deviation: number // percentage
  severity: 'good' | 'needs-improvement' | 'poor'
  rootCauses: RootCauseItem[]
  recommendations: string[]
}

export interface RootCauseItem {
  category: 'network' | 'render' | 'script' | 'resource' | 'memory' | 'dom'
  description: string
  impact: number // 0-100
  evidence: string
  fixable: boolean
}

export interface MemoryLeakIndication {
  detected: boolean
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical'
  growthRate: number // MB/hour
  estimatedTimeToOOM: number // seconds (0 if stable)
  suspectedSources: string[]
  recommendations: string[]
  memoryTrend: MemorySample[]
}

export interface PerformanceRootCauseAnalysis {
  timestamp: Date
  url: string
  coreWebVitals: CoreWebVitalsMetrics
  slowPageDiagnoses: SlowPageDiagnosis[]
  memoryAnalysis: MemoryLeakIndication
  networkBottlenecks: NetworkBottleneck[]
  renderIssues: RenderIssue[]
  overallHealth: 'healthy' | 'degraded' | 'critical'
  priorityActions: PriorityAction[]
  summary: string
}

export interface PriorityAction {
  rank: number
  category: 'immediate' | 'short-term' | 'long-term'
  issue: string
  impact: 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  action: string
  estimatedGain: string
}

// ========================================
// Thresholds Configuration
// ========================================

export const CORE_WEB_VITALS_THRESHOLDS = {
  FCP: {
    good: 1800, // ms
    needsImprovement: 3000, // ms
    poor: 3000, // ms (same as needs improvement threshold)
  },
  LCP: {
    good: 2500, // ms
    needsImprovement: 4000, // ms
    poor: 4000, // ms
  },
  CLS: {
    good: 0.1,
    needsImprovement: 0.25,
    poor: 0.25,
  },
  FID: {
    good: 100, // ms
    needsImprovement: 300, // ms
    poor: 300, // ms
  },
  INP: {
    good: 200, // ms
    needsImprovement: 500, // ms
    poor: 500, // ms
  },
  TTFB: {
    good: 800, // ms
    needsImprovement: 1800, // ms
    poor: 1800, // ms
  },
} as const

export const NETWORK_THRESHOLDS = {
  dns: 100, // ms
  tcp: 100, // ms
  tls: 100, // ms
  request: 200, // ms
  response: 500, // ms
  connection: 300, // ms (dns + tcp + tls)
}

export const MEMORY_THRESHOLDS = {
  growthRateWarning: 10 * 1024 * 1024, // 10MB per sample period
  growthRateCritical: 50 * 1024 * 1024, // 50MB per sample period
  usageRatioWarning: 0.7, // 70%
  usageRatioCritical: 0.9, // 90%
  minSamplesForAnalysis: 5,
}

export const RENDER_THRESHOLDS = {
  longTask: 50, // ms
  forcedReflow: 16, // ms
  layoutThrashing: 10, // consecutive reflows
  largePaint: 100, // ms
}

// ========================================
// Performance Root Cause Analyzer Class
// ========================================

export class PerformanceRootCauseAnalyzer {
  private memorySamples: MemorySample[] = []
  private readonly maxMemorySamples = 50
  private readonly sampleIntervalMs = 60000 // 1 minute

  private observers: PerformanceObserver[] = []
  private longTasks: RenderIssue[] = []
  private layoutShifts: Array<{ value: number; sources: string[] }> = []

  /**
   * Analyze Core Web Vitals and diagnose slow pages
   */
  diagnoseSlowPages(metrics: CoreWebVitalsMetrics): SlowPageDiagnosis[] {
    const diagnoses: SlowPageDiagnosis[] = []

    // FCP Analysis
    if (metrics.FCP > CORE_WEB_VITALS_THRESHOLDS.FCP.good) {
      diagnoses.push(this.diagnoseFCP(metrics.FCP))
    }

    // LCP Analysis
    if (metrics.LCP > CORE_WEB_VITALS_THRESHOLDS.LCP.good) {
      diagnoses.push(this.diagnoseLCP(metrics.LCP, metrics.TTFB))
    }

    // CLS Analysis
    if (metrics.CLS > CORE_WEB_VITALS_THRESHOLDS.CLS.good) {
      diagnoses.push(this.diagnoseCLS(metrics.CLS))
    }

    // INP Analysis
    if (metrics.INP > CORE_WEB_VITALS_THRESHOLDS.INP.good) {
      diagnoses.push(this.diagnoseINP(metrics.INP))
    }

    return diagnoses
  }

  /**
   * Diagnose slow First Contentful Paint
   */
  private diagnoseFCP(fcp: number): SlowPageDiagnosis {
    const threshold = CORE_WEB_VITALS_THRESHOLDS.FCP
    const severity =
      fcp <= threshold.good
        ? 'good'
        : fcp <= threshold.needsImprovement
          ? 'needs-improvement'
          : 'poor'
    const deviation = ((fcp - threshold.good) / threshold.good) * 100

    const rootCauses: RootCauseItem[] = []

    // Check TTFB contribution
    rootCauses.push({
      category: 'network',
      description: 'Server response time affects FCP',
      impact: Math.min(40, fcp / 50),
      evidence: `FCP of ${fcp}ms suggests server or network delays`,
      fixable: true,
    })

    // Check render blocking resources
    rootCauses.push({
      category: 'render',
      description: 'Render-blocking scripts or stylesheets',
      impact: Math.min(30, fcp / 100),
      evidence: 'Blocking resources delay first paint',
      fixable: true,
    })

    // Check critical path
    rootCauses.push({
      category: 'resource',
      description: 'Large critical resources on initial path',
      impact: Math.min(25, fcp / 120),
      evidence: 'Large HTML, CSS, or font files slow down rendering',
      fixable: true,
    })

    return {
      metric: 'FCP',
      actualValue: fcp,
      threshold: threshold.good,
      deviation,
      severity,
      rootCauses,
      recommendations: [
        'Eliminate render-blocking resources with async/defer',
        'Inline critical CSS for above-the-fold content',
        'Preload critical fonts and images',
        'Optimize server response time (TTFB)',
        'Use server-side rendering or static generation',
        'Reduce JavaScript bundle size',
      ],
    }
  }

  /**
   * Diagnose slow Largest Contentful Paint
   */
  private diagnoseLCP(lcp: number, ttfb: number): SlowPageDiagnosis {
    const threshold = CORE_WEB_VITALS_THRESHOLDS.LCP
    const severity =
      lcp <= threshold.good
        ? 'good'
        : lcp <= threshold.needsImprovement
          ? 'needs-improvement'
          : 'poor'
    const deviation = ((lcp - threshold.good) / threshold.good) * 100

    const rootCauses: RootCauseItem[] = []

    // TTFB impact
    if (ttfb > CORE_WEB_VITALS_THRESHOLDS.TTFB.good) {
      rootCauses.push({
        category: 'network',
        description: 'Slow server response time delays LCP',
        impact: Math.min(35, ttfb / 50),
        evidence: `TTFB of ${ttfb}ms contributes to slow LCP`,
        fixable: true,
      })
    }

    // Resource load time
    rootCauses.push({
      category: 'resource',
      description: 'LCP element (image/video/text) loading slowly',
      impact: Math.min(40, lcp / 60),
      evidence: `LCP element took ${lcp - ttfb}ms to load after TTFB`,
      fixable: true,
    })

    // Render blocking
    rootCauses.push({
      category: 'render',
      description: 'Render-blocking resources delay LCP element display',
      impact: Math.min(25, lcp / 100),
      evidence: 'Blocking scripts prevent LCP element from rendering',
      fixable: true,
    })

    return {
      metric: 'LCP',
      actualValue: lcp,
      threshold: threshold.good,
      deviation,
      severity,
      rootCauses,
      recommendations: [
        'Optimize and preload LCP image',
        'Use a CDN for faster content delivery',
        'Implement responsive images with srcset',
        'Compress images with WebP/AVIF formats',
        'Preconnect to required origins',
        'Reduce server response time',
        'Remove unnecessary render-blocking resources',
      ],
    }
  }

  /**
   * Diagnose Cumulative Layout Shift
   */
  private diagnoseCLS(cls: number): SlowPageDiagnosis {
    const threshold = CORE_WEB_VITALS_THRESHOLDS.CLS
    const severity =
      cls <= threshold.good
        ? 'good'
        : cls <= threshold.needsImprovement
          ? 'needs-improvement'
          : 'poor'
    const deviation = ((cls - threshold.good) / threshold.good) * 100

    const rootCauses: RootCauseItem[] = []

    rootCauses.push({
      category: 'render',
      description: 'Images without explicit dimensions',
      impact: 35,
      evidence: 'Images loading without reserved space cause layout shifts',
      fixable: true,
    })

    rootCauses.push({
      category: 'render',
      description: 'Dynamically injected content',
      impact: 30,
      evidence: 'Content inserted above existing content shifts layout',
      fixable: true,
    })

    rootCauses.push({
      category: 'render',
      description: 'Web fonts causing FOIT/FOUT',
      impact: 25,
      evidence: 'Font loading causes text to shift',
      fixable: true,
    })

    rootCauses.push({
      category: 'render',
      description: 'Animations using layout properties',
      impact: 20,
      evidence: 'CSS animations changing width/height cause shifts',
      fixable: true,
    })

    return {
      metric: 'CLS',
      actualValue: cls,
      threshold: threshold.good,
      deviation,
      severity,
      rootCauses,
      recommendations: [
        'Set explicit width/height on images and videos',
        'Reserve space for ads and embeds with CSS aspect-ratio',
        'Use font-display: swap for web fonts',
        'Avoid inserting content above existing content',
        'Use CSS transform for animations instead of layout properties',
        'Preload critical fonts',
        'Use skeleton screens for loading states',
      ],
    }
  }

  /**
   * Diagnose Interaction to Next Paint
   */
  private diagnoseINP(inp: number): SlowPageDiagnosis {
    const threshold = CORE_WEB_VITALS_THRESHOLDS.INP
    const severity =
      inp <= threshold.good
        ? 'good'
        : inp <= threshold.needsImprovement
          ? 'needs-improvement'
          : 'poor'
    const deviation = ((inp - threshold.good) / threshold.good) * 100

    const rootCauses: RootCauseItem[] = []

    rootCauses.push({
      category: 'script',
      description: 'Long JavaScript tasks blocking main thread',
      impact: Math.min(40, inp / 15),
      evidence: `INP of ${inp}ms indicates main thread blocking`,
      fixable: true,
    })

    rootCauses.push({
      category: 'render',
      description: 'Heavy DOM updates on interaction',
      impact: Math.min(30, inp / 20),
      evidence: 'Interaction handlers causing expensive re-renders',
      fixable: true,
    })

    rootCauses.push({
      category: 'script',
      description: 'Event handlers without debouncing/throttling',
      impact: Math.min(25, inp / 25),
      evidence: 'Rapid interactions overwhelming handlers',
      fixable: true,
    })

    return {
      metric: 'INP',
      actualValue: inp,
      threshold: threshold.good,
      deviation,
      severity,
      rootCauses,
      recommendations: [
        'Break up long tasks with setTimeout or requestIdleCallback',
        'Use web workers for CPU-intensive work',
        'Debounce or throttle event handlers',
        'Optimize React re-renders with memo/useMemo/useCallback',
        'Reduce JavaScript bundle size',
        'Use passive event listeners where possible',
        'Implement optimistic UI updates',
      ],
    }
  }

  /**
   * Detect memory leaks
   */
  detectMemoryLeak(currentMetrics: MemoryMetrics): MemoryLeakIndication {
    // Add new sample
    this.addMemorySample({
      timestamp: Date.now(),
      used: currentMetrics.usedJSHeapSize,
      total: currentMetrics.totalJSHeapSize,
    })

    const samples = this.memorySamples

    // Need enough samples
    if (samples.length < MEMORY_THRESHOLDS.minSamplesForAnalysis) {
      return {
        detected: false,
        severity: 'none',
        growthRate: 0,
        estimatedTimeToOOM: 0,
        suspectedSources: [],
        recommendations: ['Collect more memory samples for analysis'],
        memoryTrend: samples,
      }
    }

    // Calculate growth rate
    const growthRate = this.calculateMemoryGrowthRate(samples)
    const trend = this.analyzeMemoryTrend(samples)
    const usageRatio = currentMetrics.usedJSHeapSize / currentMetrics.jsHeapSizeLimit

    // Determine severity
    let severity: MemoryLeakIndication['severity'] = 'none'
    let detected = false

    if (
      growthRate > MEMORY_THRESHOLDS.growthRateCritical ||
      usageRatio > MEMORY_THRESHOLDS.usageRatioCritical
    ) {
      severity = 'critical'
      detected = true
    } else if (
      growthRate > MEMORY_THRESHOLDS.growthRateWarning ||
      usageRatio > MEMORY_THRESHOLDS.usageRatioWarning
    ) {
      severity = 'high'
      detected = true
    } else if (growthRate > MEMORY_THRESHOLDS.growthRateWarning / 2) {
      severity = 'medium'
      detected = trend === 'increasing'
    } else if (growthRate > 0 && trend === 'increasing') {
      severity = 'low'
      detected = true
    }

    // Estimate time to OOM
    let estimatedTimeToOOM = 0
    if (growthRate > 0 && trend === 'increasing') {
      const remainingMemory = currentMetrics.jsHeapSizeLimit - currentMetrics.usedJSHeapSize
      estimatedTimeToOOM = remainingMemory / growthRate
    }

    // Identify suspected sources
    const suspectedSources = this.identifyMemoryLeakSources(currentMetrics, trend)

    return {
      detected,
      severity,
      growthRate: growthRate / (1024 * 1024), // Convert to MB/s
      estimatedTimeToOOM,
      suspectedSources,
      recommendations: this.getMemoryLeakRecommendations(severity, suspectedSources),
      memoryTrend: samples,
    }
  }

  /**
   * Identify network bottlenecks
   */
  identifyNetworkBottlenecks(timings: NetworkTimingBreakdown[]): NetworkBottleneck[] {
    const bottlenecks: NetworkBottleneck[] = []

    for (const timing of timings) {
      // DNS bottleneck
      if (timing.dns > NETWORK_THRESHOLDS.dns) {
        bottlenecks.push({
          type: 'dns',
          resource: 'connection',
          duration: timing.dns,
          threshold: NETWORK_THRESHOLDS.dns,
          severity: this.getNetworkSeverity(timing.dns, NETWORK_THRESHOLDS.dns),
          recommendation: 'Consider DNS prefetching with <link rel="dns-prefetch">',
        })
      }

      // TCP bottleneck
      if (timing.tcp > NETWORK_THRESHOLDS.tcp) {
        bottlenecks.push({
          type: 'tcp',
          resource: 'connection',
          duration: timing.tcp,
          threshold: NETWORK_THRESHOLDS.tcp,
          severity: this.getNetworkSeverity(timing.tcp, NETWORK_THRESHOLDS.tcp),
          recommendation: 'Enable HTTP/2 or HTTP/3 for connection reuse',
        })
      }

      // TLS bottleneck
      if (timing.tls > NETWORK_THRESHOLDS.tls) {
        bottlenecks.push({
          type: 'tls',
          resource: 'connection',
          duration: timing.tls,
          threshold: NETWORK_THRESHOLDS.tls,
          severity: this.getNetworkSeverity(timing.tls, NETWORK_THRESHOLDS.tls),
          recommendation: 'Optimize TLS configuration, use TLS 1.3, and OCSP stapling',
        })
      }

      // Request bottleneck
      if (timing.request > NETWORK_THRESHOLDS.request) {
        bottlenecks.push({
          type: 'request',
          resource: 'request',
          duration: timing.request,
          threshold: NETWORK_THRESHOLDS.request,
          severity: this.getNetworkSeverity(timing.request, NETWORK_THRESHOLDS.request),
          recommendation: 'Optimize server response time, add caching',
        })
      }

      // Response bottleneck
      if (timing.response > NETWORK_THRESHOLDS.response) {
        bottlenecks.push({
          type: 'response',
          resource: 'response',
          duration: timing.response,
          threshold: NETWORK_THRESHOLDS.response,
          severity: this.getNetworkSeverity(timing.response, NETWORK_THRESHOLDS.response),
          recommendation: 'Compress responses, reduce payload size',
        })
      }

      // Overall connection time
      const connectionTime = timing.dns + timing.tcp + timing.tls
      if (connectionTime > NETWORK_THRESHOLDS.connection) {
        bottlenecks.push({
          type: 'connection',
          resource: 'connection',
          duration: connectionTime,
          threshold: NETWORK_THRESHOLDS.connection,
          severity: this.getNetworkSeverity(connectionTime, NETWORK_THRESHOLDS.connection),
          recommendation: 'Use preconnect for critical origins',
        })
      }
    }

    return bottlenecks
  }

  /**
   * Diagnose render issues
   */
  diagnoseRenderIssues(performanceEntries: PerformanceEntry[]): RenderIssue[] {
    const issues: RenderIssue[] = []

    // Analyze long tasks
    const longTasks = performanceEntries.filter(
      entry => entry.entryType === 'longtask' && entry.duration > RENDER_THRESHOLDS.longTask
    )

    for (const task of longTasks) {
      issues.push({
        type: 'long-task',
        duration: task.duration,
        stackTrace: (task as PerformanceEventTiming).toJSON?.(),
        impact: task.duration > 200 ? 'critical' : task.duration > 100 ? 'high' : 'medium',
        details: {
          startTime: task.startTime,
          name: task.name,
        },
      })
    }

    // Analyze layout shifts
    const layoutShifts = performanceEntries.filter(entry => entry.entryType === 'layout-shift')

    for (const shift of layoutShifts) {
      const shiftEntry = shift as LayoutShiftEntry
      if (shiftEntry.value > 0.01) {
        issues.push({
          type: 'forced-reflow',
          duration: 0,
          impact: shiftEntry.value > 0.1 ? 'high' : 'medium',
          details: {
            value: shiftEntry.value,
            sources: shiftEntry.sources?.map(s => s.node?.localName || 'unknown'),
          },
        })
      }
    }

    return issues
  }

  /**
   * Start observing performance entries
   */
  startObserving(): void {
    // Observe long tasks
    try {
      const longTaskObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          this.longTasks.push({
            type: 'long-task',
            duration: entry.duration,
            impact: entry.duration > 200 ? 'critical' : entry.duration > 100 ? 'high' : 'medium',
            details: {
              startTime: entry.startTime,
              name: entry.name,
            },
          })
        }
      })
      longTaskObserver.observe({ type: 'longtask', buffered: true })
      this.observers.push(longTaskObserver)
    } catch (e) {
      // Long task observer not supported
    }

    // Observe layout shifts
    try {
      const layoutShiftObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const shiftEntry = entry as LayoutShiftEntry
          this.layoutShifts.push({
            value: shiftEntry.value,
            sources: shiftEntry.sources?.map(s => s.node?.localName || 'unknown') || [],
          })
        }
      })
      layoutShiftObserver.observe({ type: 'layout-shift', buffered: true })
      this.observers.push(layoutShiftObserver)
    } catch (e) {
      // Layout shift observer not supported
    }
  }

  /**
   * Stop observing performance entries
   */
  stopObserving(): void {
    for (const observer of this.observers) {
      observer.disconnect()
    }
    this.observers = []
  }

  /**
   * Collect memory sample
   */
  collectMemorySample(): MemorySample | null {
    // Check if performance.memory is available (Chrome only)
    const memory = (performance as unknown as { memory?: MemoryInfo }).memory
    if (!memory) {
      return null
    }

    const sample: MemorySample = {
      timestamp: Date.now(),
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
    }

    this.addMemorySample(sample)
    return sample
  }

  /**
   * Perform complete root cause analysis
   */
  analyze(
    coreWebVitals: CoreWebVitalsMetrics,
    memoryMetrics: MemoryMetrics,
    networkTimings: NetworkTimingBreakdown[],
    url: string
  ): PerformanceRootCauseAnalysis {
    // Diagnose slow pages
    const slowPageDiagnoses = this.diagnoseSlowPages(coreWebVitals)

    // Detect memory leaks
    const memoryAnalysis = this.detectMemoryLeak(memoryMetrics)

    // Identify network bottlenecks
    const networkBottlenecks = this.identifyNetworkBottlenecks(networkTimings)

    // Get render issues
    const renderIssues = [...this.longTasks]
    if (typeof PerformanceObserver !== 'undefined') {
      const entries = performance.getEntriesByType('longtask')
      renderIssues.push(...this.diagnoseRenderIssues(entries))
    }

    // Determine overall health
    const overallHealth = this.determineOverallHealth(
      slowPageDiagnoses,
      memoryAnalysis,
      networkBottlenecks,
      renderIssues
    )

    // Generate priority actions
    const priorityActions = this.generatePriorityActions(
      slowPageDiagnoses,
      memoryAnalysis,
      networkBottlenecks,
      renderIssues
    )

    // Generate summary
    const summary = this.generateSummary(
      overallHealth,
      slowPageDiagnoses,
      memoryAnalysis,
      networkBottlenecks
    )

    return {
      timestamp: new Date(),
      url,
      coreWebVitals,
      slowPageDiagnoses,
      memoryAnalysis,
      networkBottlenecks,
      renderIssues,
      overallHealth,
      priorityActions,
      summary,
    }
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private addMemorySample(sample: MemorySample): void {
    this.memorySamples.push(sample)
    if (this.memorySamples.length > this.maxMemorySamples) {
      this.memorySamples.shift()
    }
  }

  private calculateMemoryGrowthRate(samples: MemorySample[]): number {
    if (samples.length < 2) return 0

    const first = samples[0]
    const last = samples[samples.length - 1]
    const timeDiff = (last.timestamp - first.timestamp) / 1000 // seconds

    if (timeDiff === 0) return 0

    return (last.used - first.used) / timeDiff // bytes per second
  }

  private analyzeMemoryTrend(samples: MemorySample[]): 'increasing' | 'stable' | 'decreasing' {
    if (samples.length < 3) return 'stable'

    const firstHalf = samples.slice(0, Math.floor(samples.length / 2))
    const secondHalf = samples.slice(Math.floor(samples.length / 2))

    const firstAvg = firstHalf.reduce((sum, s) => sum + s.used, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.used, 0) / secondHalf.length

    const change = (secondAvg - firstAvg) / firstAvg

    if (change > 0.1) return 'increasing'
    if (change < -0.1) return 'decreasing'
    return 'stable'
  }

  private identifyMemoryLeakSources(
    _metrics: MemoryMetrics,
    trend: 'increasing' | 'stable' | 'decreasing'
  ): string[] {
    if (trend !== 'increasing') return []

    return [
      'Event listeners not removed on component unmount',
      'Closures capturing large objects',
      'Timer/interval references not cleared',
      'Detached DOM nodes in memory',
      'Large cached data without eviction',
      'Observable subscriptions not unsubscribed',
      'WeakMap/WeakSet not used for cached references',
    ]
  }

  private getMemoryLeakRecommendations(
    severity: MemoryLeakIndication['severity'],
    _sources: string[]
  ): string[] {
    const recommendations: string[] = []

    if (severity === 'none') {
      return ['Continue monitoring memory usage']
    }

    recommendations.push('Profile memory with Chrome DevTools heap snapshots')
    recommendations.push('Check for unremoved event listeners in useEffect cleanup')

    if (severity === 'critical' || severity === 'high') {
      recommendations.push('Review recent code changes for memory-intensive operations')
      recommendations.push('Consider implementing object pooling for frequently created objects')
    }

    recommendations.push('Use WeakMap/WeakSet for cached references')
    recommendations.push('Clear timers and intervals on component unmount')
    recommendations.push('Unsubscribe from observables in cleanup functions')

    return recommendations
  }

  private getNetworkSeverity(
    actual: number,
    threshold: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = actual / threshold
    if (ratio > 3) return 'critical'
    if (ratio > 2) return 'high'
    if (ratio > 1.5) return 'medium'
    return 'low'
  }

  private determineOverallHealth(
    slowPageDiagnoses: SlowPageDiagnosis[],
    memoryAnalysis: MemoryLeakIndication,
    networkBottlenecks: NetworkBottleneck[],
    renderIssues: RenderIssue[]
  ): 'healthy' | 'degraded' | 'critical' {
    // Critical conditions
    const hasCriticalDiagnosis = slowPageDiagnoses.some(d => d.severity === 'poor')
    const hasMemoryLeak =
      memoryAnalysis.severity === 'critical' || memoryAnalysis.severity === 'high'
    const hasCriticalBottlenecks = networkBottlenecks.some(b => b.severity === 'critical')
    const hasCriticalRenderIssues = renderIssues.some(i => i.impact === 'critical')

    if (
      hasCriticalDiagnosis ||
      hasMemoryLeak ||
      hasCriticalBottlenecks ||
      hasCriticalRenderIssues
    ) {
      return 'critical'
    }

    // Degraded conditions
    const hasNeedsImprovement = slowPageDiagnoses.some(d => d.severity === 'needs-improvement')
    const hasModerateMemory = memoryAnalysis.severity === 'medium'
    const hasHighBottlenecks = networkBottlenecks.some(b => b.severity === 'high')
    const hasHighRenderIssues = renderIssues.some(i => i.impact === 'high')

    if (hasNeedsImprovement || hasModerateMemory || hasHighBottlenecks || hasHighRenderIssues) {
      return 'degraded'
    }

    return 'healthy'
  }

  private generatePriorityActions(
    slowPageDiagnoses: SlowPageDiagnosis[],
    memoryAnalysis: MemoryLeakIndication,
    networkBottlenecks: NetworkBottleneck[],
    renderIssues: RenderIssue[]
  ): PriorityAction[] {
    const actions: PriorityAction[] = []
    let rank = 1

    // Add critical render issues first
    for (const issue of renderIssues.filter(i => i.impact === 'critical')) {
      actions.push({
        rank: rank++,
        category: 'immediate',
        issue: `Long task blocking main thread (${issue.duration}ms)`,
        impact: 'high',
        effort: 'medium',
        action: 'Break up long task into smaller chunks using setTimeout or requestIdleCallback',
        estimatedGain: `Reduce ${issue.duration}ms blocking time`,
      })
    }

    // Add slow page diagnoses
    for (const diagnosis of slowPageDiagnoses.filter(d => d.severity === 'poor')) {
      actions.push({
        rank: rank++,
        category: 'immediate',
        issue: `${diagnosis.metric} is ${diagnosis.actualValue}ms (${diagnosis.deviation.toFixed(0)}% above threshold)`,
        impact: 'high',
        effort: 'medium',
        action: diagnosis.recommendations[0] || 'Optimize',
        estimatedGain: `Improve ${diagnosis.metric} by ~${Math.round(diagnosis.deviation / 2)}%`,
      })
    }

    // Add memory leak actions
    if (
      memoryAnalysis.detected &&
      (memoryAnalysis.severity === 'high' || memoryAnalysis.severity === 'critical')
    ) {
      actions.push({
        rank: rank++,
        category: 'immediate',
        issue: `Memory leak detected (${memoryAnalysis.growthRate.toFixed(2)} MB/hour growth)`,
        impact: 'high',
        effort: 'high',
        action: memoryAnalysis.recommendations[0] || 'Profile and fix memory leak',
        estimatedGain: 'Prevent potential memory exhaustion',
      })
    }

    // Add network bottleneck actions
    for (const bottleneck of networkBottlenecks.filter(
      b => b.severity === 'high' || b.severity === 'critical'
    )) {
      actions.push({
        rank: rank++,
        category: 'short-term',
        issue: `${bottleneck.type} bottleneck: ${bottleneck.duration}ms`,
        impact: bottleneck.severity === 'critical' ? 'high' : 'medium',
        effort: 'low',
        action: bottleneck.recommendation,
        estimatedGain: `Reduce ${bottleneck.type} time by ~${Math.round(bottleneck.duration / 2)}ms`,
      })
    }

    return actions.slice(0, 10) // Top 10 actions
  }

  private generateSummary(
    health: 'healthy' | 'degraded' | 'critical',
    diagnoses: SlowPageDiagnosis[],
    memory: MemoryLeakIndication,
    bottlenecks: NetworkBottleneck[]
  ): string {
    if (health === 'healthy') {
      return 'Performance is healthy. No critical issues detected.'
    }

    const parts: string[] = []

    if (diagnoses.length > 0) {
      const poorCount = diagnoses.filter(d => d.severity === 'poor').length
      const needsImprovementCount = diagnoses.filter(d => d.severity === 'needs-improvement').length
      if (poorCount > 0 || needsImprovementCount > 0) {
        parts.push(
          `${poorCount} poor and ${needsImprovementCount} needs-improvement Core Web Vitals metrics`
        )
      }
    }

    if (memory.detected) {
      parts.push(`memory leak (${memory.severity} severity)`)
    }

    if (bottlenecks.length > 0) {
      const criticalCount = bottlenecks.filter(b => b.severity === 'critical').length
      const highCount = bottlenecks.filter(b => b.severity === 'high').length
      if (criticalCount > 0 || highCount > 0) {
        parts.push(`${criticalCount + highCount} network bottlenecks`)
      }
    }

    const prefix = health === 'critical' ? 'Critical:' : 'Degraded:'
    return `${prefix} Detected ${parts.join(', ')}. Immediate attention required.`
  }

  /**
   * Clear all collected data
   */
  clear(): void {
    this.memorySamples = []
    this.longTasks = []
    this.layoutShifts = []
  }
}

// ========================================
// Type Definitions for Browser APIs
// ========================================

interface MemoryInfo {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number
  sources?: Array<{
    node?: { localName: string }
    currentRect: DOMRect
    previousRect: DOMRect
  }>
}

interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number
  processingEnd: number
  interactionId: number
}

// ========================================
// Utility Functions
// ========================================

/**
 * Create mock Core Web Vitals metrics for testing
 */
export function createMockCoreWebVitals(
  overrides: Partial<CoreWebVitalsMetrics> = {}
): CoreWebVitalsMetrics {
  return {
    FCP: overrides.FCP ?? 1200,
    LCP: overrides.LCP ?? 2000,
    CLS: overrides.CLS ?? 0.05,
    FID: overrides.FID ?? 50,
    INP: overrides.INP ?? 100,
    TTFB: overrides.TTFB ?? 600,
  }
}

/**
 * Create mock memory metrics for testing
 */
export function createMockMemoryMetrics(overrides: Partial<MemoryMetrics> = {}): MemoryMetrics {
  const used = overrides.usedJSHeapSize ?? 50 * 1024 * 1024 // 50MB
  const total = overrides.totalJSHeapSize ?? 100 * 1024 * 1024 // 100MB
  const limit = overrides.jsHeapSizeLimit ?? 200 * 1024 * 1024 // 200MB

  return {
    usedJSHeapSize: used,
    totalJSHeapSize: total,
    jsHeapSizeLimit: limit,
    growthRate: overrides.growthRate ?? 0,
    trend: overrides.trend ?? 'stable',
    samples: overrides.samples ?? [
      { timestamp: Date.now() - 300000, used: used * 0.95, total: total * 0.95 },
      { timestamp: Date.now() - 200000, used: used * 0.97, total: total * 0.97 },
      { timestamp: Date.now() - 100000, used: used * 0.99, total: total * 0.99 },
      { timestamp: Date.now(), used, total },
    ],
  }
}

/**
 * Create mock network timing breakdown for testing
 */
export function createMockNetworkTiming(
  overrides: Partial<NetworkTimingBreakdown> = {}
): NetworkTimingBreakdown {
  return {
    dns: overrides.dns ?? 20,
    tcp: overrides.tcp ?? 15,
    tls: overrides.tls ?? 25,
    request: overrides.request ?? 50,
    response: overrides.response ?? 100,
    total: overrides.total ?? 210,
  }
}

// ========================================
// Export singleton instance
// ========================================

export const performanceRootCauseAnalyzer = new PerformanceRootCauseAnalyzer()

export default PerformanceRootCauseAnalyzer
