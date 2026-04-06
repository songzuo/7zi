// @ts-nocheck
/**
 * Performance Waterfall Analyzer (Enhanced)
 * Enhanced version with:
 * - Page load performance waterfall
 * - Network request timing breakdown
 * - Render blocking analysis
 * - First Contentful Paint calculation
 *
 * Uses Performance Observer API and is compatible with Next.js App Router
 */

// ========================================
// Types
// ========================================

export interface ResourceTiming {
  name: string
  startTime: number
  duration: number
  initiatorType: string
  transferSize: number
  encodedBodySize: number
  decodedBodySize: number
  responseStatus: number
  serverTiming?: PerformanceServerTiming[]
  // Enhanced fields
  fetchStart?: number
  domainLookupStart?: number
  domainLookupEnd?: number
  connectStart?: number
  connectEnd?: number
  requestStart?: number
  responseStart?: number
  responseEnd?: number
  // Additional metrics for enhanced analysis
  renderBlocking?: boolean
  priority?: 'high' | 'low' | 'auto'
  cacheMode?: string
  nextHopProtocol?: string
  resourceType?: 'script' | 'stylesheet' | 'image' | 'font' | 'document' | 'xhr' | 'fetch' | 'other'
}

export interface ResourceBreakdown {
  phase: string
  duration: number
  percentage: number
  color: string
  startTime?: number
}

export interface WaterfallEntry {
  resource: ResourceTiming
  breakdown: ResourceBreakdown[]
  totalDuration: number
  critical: boolean
  onCriticalPath: boolean
  // Enhanced fields
  blockingTime: number
  estimatedImpact: 'low' | 'medium' | 'high' | 'critical'
}

export interface WaterfallAnalysis {
  entries: WaterfallEntry[]
  criticalPath: ResourceTiming[]
  totalPageLoadTime: number
  mainThreadBlockingTime: number
  networkTime: number
  parallelism: number
  recommendations: string[]
  // Enhanced fields
  fcpEstimate: number
  renderBlockingResources: ResourceTiming[]
  nonCriticalResources: ResourceTiming[]
  timingBreakdown: {
    dns: number
    tcp: number
    tls: number
    request: number
    response: number
    processing: number
  }
  // Additional metrics for v1.8.1
  resourceTypeBreakdown: Map<string, { count: number; totalSize: number; totalTime: number }>
  criticalPathAnalysis: {
    longestChain: ResourceTiming[]
    chainDuration: number
    bottleneck: ResourceTiming | null
    optimizationPotential: number
  }
  performanceScore: number
  coreWebVitals: {
    lcp: number | null
    fid: number | null
    cls: number | null
  }
  renderingMetrics: {
    layoutCount: number
    layoutDuration: number
    recalcStyleCount: number
    recalcStyleDuration: number
    paintCount: number
    paintDuration: number
  }
}

export interface CriticalPathSegment {
  resources: ResourceTiming[]
  totalDuration: number
  bottleneck?: {
    resource: ResourceTiming
    phase: string
    impact: number
  }
}

export interface FirstContentfulPaintData {
  fcp: number
  timestamp: number
  contributingResources: ResourceTiming[]
  blockingResources: ResourceTiming[]
}

// ========================================
// Waterfall Analyzer Class
// ========================================

export class PerformanceWaterfall {
  private resources: ResourceTiming[] = []
  private criticalPathThresholds = {
    renderBlocking: 100, // ms
    javascriptBlocking: 200, // ms
    cssBlocking: 100, // ms
  }
  private performanceObservers: PerformanceObserver[] = []

  /**
   * Add resource timing data
   */
  addResource(resource: ResourceTiming): void {
    this.resources.push(resource)
  }

  /**
   * Add multiple resources
   */
  addResources(resources: ResourceTiming[]): void {
    this.resources.push(...resources)
  }

  /**
   * Clear all resources
   */
  clear(): void {
    this.resources = []
  }

  /**
   * Get all resources
   */
  getResources(): ResourceTiming[] {
    return [...this.resources]
  }

  /**
   * Start observing resource timing using Performance Observer API
   */
  startObserving(): void {
    if (typeof PerformanceObserver === 'undefined') {
      return
    }

    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceTiming = this.fromPerformanceResourceTiming(
              entry as PerformanceResourceTiming
            )
            this.addResource(resourceTiming)
          }
        }
      })
      observer.observe({ type: 'resource', buffered: true })
      this.performanceObservers.push(observer)
    } catch (e) {
      // PerformanceObserver not supported
    }
  }

  /**
   * Stop observing
   */
  stopObserving(): void {
    for (const observer of this.performanceObservers) {
      observer.disconnect()
    }
    this.performanceObservers = []
  }

  /**
   * Calculate detailed breakdown of a single resource's timing
   */
  breakdownResource(resource: ResourceTiming): ResourceBreakdown[] {
    const breakdown: ResourceBreakdown[] = []

    // Use actual timing data if available
    if (
      resource.domainLookupStart !== undefined &&
      resource.domainLookupEnd !== undefined &&
      resource.connectStart !== undefined &&
      resource.connectEnd !== undefined &&
      resource.requestStart !== undefined &&
      resource.responseStart !== undefined &&
      resource.responseEnd !== undefined
    ) {
      const navigationStart = resource.startTime

      // DNS lookup
      if (resource.domainLookupStart > navigationStart) {
        breakdown.push({
          phase: 'DNS Lookup',
          duration: Math.round(resource.domainLookupEnd - resource.domainLookupStart),
          percentage: 0,
          color: '#3b82f6',
          startTime: resource.domainLookupStart,
        })
      }

      // TCP connection
      if (resource.connectStart > 0 && resource.connectEnd > 0) {
        breakdown.push({
          phase: 'TCP Connection',
          duration: Math.round(resource.connectEnd - resource.connectStart),
          percentage: 0,
          color: '#10b981',
          startTime: resource.connectStart,
        })
      }

      // TLS negotiation
      if (resource.connectEnd > 0 && resource.requestStart > 0) {
        const tlsTime = resource.requestStart - resource.connectEnd
        if (tlsTime > 0) {
          breakdown.push({
            phase: 'TLS Handshake',
            duration: Math.round(tlsTime),
            percentage: 0,
            color: '#f59e0b',
            startTime: resource.connectEnd,
          })
        }
      }

      // Request sent
      if (resource.requestStart > 0 && resource.responseStart > 0) {
        breakdown.push({
          phase: 'Request Sent',
          duration: Math.round(resource.responseStart - resource.requestStart),
          percentage: 0,
          color: '#ef4444',
          startTime: resource.requestStart,
        })
      }

      // Response (TTFB + download)
      if (resource.responseStart > 0 && resource.responseEnd > 0) {
        breakdown.push({
          phase: 'Server Response',
          duration: Math.round(resource.responseEnd - resource.responseStart),
          percentage: 0,
          color: '#8b5cf6',
          startTime: resource.responseStart,
        })
      }

      // Calculate percentages
      const total = breakdown.reduce((sum, b) => sum + b.duration, 0)
      breakdown.forEach(b => {
        b.percentage = Math.round((b.duration / total) * 100)
      })
    } else {
      // Fallback to estimated phase breakdown
      const { duration } = resource
      const phases = [
        { name: 'DNS Lookup', percentage: 0.1, color: '#3b82f6' },
        { name: 'TCP Connection', percentage: 0.1, color: '#10b981' },
        { name: 'TLS Handshake', percentage: 0.1, color: '#f59e0b' },
        { name: 'Request Sent', percentage: 0.1, color: '#ef4444' },
        { name: 'Server Processing', percentage: 0.3, color: '#8b5cf6' },
        { name: 'Content Download', percentage: 0.3, color: '#ec4899' },
      ]

      phases.forEach(phase => {
        const phaseDuration = duration * phase.percentage
        breakdown.push({
          phase: phase.name,
          duration: Math.round(phaseDuration),
          percentage: Math.round(phase.percentage * 100),
          color: phase.color,
        })
      })
    }

    return breakdown
  }

  /**
   * Analyze a single resource with enhanced metrics
   */
  analyzeResource(resource: ResourceTiming): WaterfallEntry {
    const breakdown = this.breakdownResource(resource)
    const critical = this.isCriticalResource(resource)
    const onCriticalPath = this.isOnCriticalPath(resource)
    const blockingTime = this.calculateBlockingTime(resource)
    const estimatedImpact = this.estimateResourceImpact(resource)

    return {
      resource,
      breakdown,
      totalDuration: Math.round(resource.duration),
      critical,
      onCriticalPath,
      blockingTime,
      estimatedImpact,
    }
  }

  /**
   * Check if a resource is critical (blocking)
   */
  private isCriticalResource(resource: ResourceTiming): boolean {
    const { initiatorType, responseStatus, duration } = resource

    // Failed resources
    if (responseStatus >= 400) {
      return true
    }

    // Render-blocking resources
    if (initiatorType === 'script' || initiatorType === 'link') {
      return duration > this.criticalPathThresholds.renderBlocking
    }

    // Large resources
    if (resource.transferSize > 500 * 1024) {
      return true
    }

    return false
  }

  /**
   * Check if resource is on critical rendering path
   */
  private isOnCriticalPath(resource: ResourceTiming): boolean {
    const { initiatorType, name } = resource

    // HTML document
    if (initiatorType === 'document' && name.endsWith('.html')) {
      return true
    }

    // Critical CSS
    if (initiatorType === 'link' && name.includes('css')) {
      return true
    }

    // Blocking JS
    if (initiatorType === 'script' && !name.includes('async') && !name.includes('defer')) {
      return true
    }

    return false
  }

  /**
   * Calculate blocking time for a resource
   */
  private calculateBlockingTime(resource: ResourceTiming): number {
    const { initiatorType, duration } = resource

    if (initiatorType === 'script' || initiatorType === 'link') {
      return duration
    }

    return 0
  }

  /**
   * Estimate resource impact on performance
   */
  private estimateResourceImpact(resource: ResourceTiming): 'low' | 'medium' | 'high' | 'critical' {
    const { duration, transferSize, responseStatus } = resource

    // Failed resources are critical
    if (responseStatus >= 400) {
      return 'critical'
    }

    // Large slow resources are critical
    if (duration > 2000 && transferSize > 500 * 1024) {
      return 'critical'
    }

    // Slow resources are high impact
    if (duration > 1000) {
      return 'high'
    }

    // Large resources are medium impact
    if (transferSize > 200 * 1024) {
      return 'medium'
    }

    // Fast small resources are low impact
    if (duration < 100 && transferSize < 50 * 1024) {
      return 'low'
    }

    return 'medium'
  }

  /**
   * Identify the critical rendering path
   */
  identifyCriticalPath(): CriticalPathSegment[] {
    const segments: CriticalPathSegment[] = []

    // Sort resources by start time
    const sortedResources = [...this.resources].sort((a, b) => a.startTime - b.startTime)

    // Find sequential dependencies
    let currentSegment: ResourceTiming[] = []
    let lastEndTime = 0

    sortedResources.forEach(resource => {
      if (resource.startTime > lastEndTime) {
        // New segment (parallel)
        if (currentSegment.length > 0) {
          segments.push({
            resources: currentSegment,
            totalDuration: currentSegment.reduce((sum, r) => sum + r.duration, 0),
          })
        }
        currentSegment = []
      }

      currentSegment.push(resource)
      lastEndTime = Math.max(lastEndTime, resource.startTime + resource.duration)
    })

    // Add final segment
    if (currentSegment.length > 0) {
      segments.push({
        resources: currentSegment,
        totalDuration: currentSegment.reduce((sum, r) => sum + r.duration, 0),
      })
    }

    // Identify bottlenecks in each segment
    segments.forEach(segment => {
      const slowest = segment.resources.reduce((slowest, r) =>
        r.duration > slowest.duration ? r : slowest
      )

      if (slowest.duration > 500) {
        segment.bottleneck = {
          resource: slowest,
          phase: 'server',
          impact: (slowest.duration / segment.totalDuration) * 100,
        }
      }
    })

    return segments
  }

  /**
   * Estimate First Contentful Paint (FCP)
   */
  estimateFCP(): FirstContentfulPaintData {
    // Get critical resources that block rendering
    const blockingResources = this.resources.filter(r => this.isOnCriticalPath(r))

    // Calculate when the critical path completes
    let criticalPathTime = 0
    for (const resource of blockingResources) {
      const endTime = resource.startTime + resource.duration
      if (endTime > criticalPathTime) {
        criticalPathTime = endTime
      }
    }

    // FCP is approximately when critical path completes + some rendering time
    const fcp = criticalPathTime + 100 // Add ~100ms for rendering

    return {
      fcp: Math.round(fcp),
      timestamp: Math.round(fcp),
      contributingResources: blockingResources,
      blockingResources: blockingResources.filter(
        r => r.initiatorType === 'script' || r.initiatorType === 'link'
      ),
    }
  }

  /**
   * Analyze render blocking resources
   */
  analyzeRenderBlocking(): {
    blockingResources: ResourceTiming[]
    totalBlockingTime: number
    recommendations: string[]
  } {
    const blockingResources = this.resources.filter(r => this.isOnCriticalPath(r))
    const totalBlockingTime = blockingResources.reduce(
      (sum, r) => sum + this.calculateBlockingTime(r),
      0
    )

    const recommendations: string[] = []

    if (blockingResources.length > 0) {
      recommendations.push(
        `Found ${blockingResources.length} render-blocking resources delaying first paint.`
      )
    }

    const blockingScripts = blockingResources.filter(r => r.initiatorType === 'script')
    if (blockingScripts.length > 0) {
      recommendations.push(
        `${blockingScripts.length} JavaScript files are blocking. Consider using async/defer.`
      )
    }

    const blockingStyles = blockingResources.filter(
      r => r.initiatorType === 'link' && r.name.includes('css')
    )
    if (blockingStyles.length > 0) {
      recommendations.push(
        `${blockingStyles.length} CSS files are blocking. Consider inlining critical CSS.`
      )
    }

    return {
      blockingResources,
      totalBlockingTime,
      recommendations,
    }
  }

  /**
   * Analyze complete waterfall with enhanced metrics
   */
  analyzeWaterfall(): WaterfallAnalysis {
    // Handle empty resources
    if (this.resources.length === 0) {
      return {
        entries: [],
        criticalPath: [],
        totalPageLoadTime: 0,
        mainThreadBlockingTime: 0,
        networkTime: 0,
        parallelism: 1,
        recommendations: [],
        fcpEstimate: 0,
        renderBlockingResources: [],
        nonCriticalResources: [],
        timingBreakdown: {
          dns: 0,
          tcp: 0,
          tls: 0,
          request: 0,
          response: 0,
          processing: 0,
        },
        resourceTypeBreakdown: new Map(),
        criticalPathAnalysis: {
          longestChain: [],
          chainDuration: 0,
          bottleneck: null,
          optimizationPotential: 0,
        },
        performanceScore: 0,
        coreWebVitals: {
          lcp: null,
          fid: null,
          cls: null,
        },
        renderingMetrics: {
          layoutCount: 0,
          layoutDuration: 0,
          recalcStyleCount: 0,
          recalcStyleDuration: 0,
          paintCount: 0,
          paintDuration: 0,
        },
      }
    }

    const entries = this.resources.map(resource => this.analyzeResource(resource))
    const criticalPathSegments = this.identifyCriticalPath()
    const fcpData = this.estimateFCP()
    const blockingAnalysis = this.analyzeRenderBlocking()

    // Calculate totals
    const totalPageLoadTime = Math.max(...this.resources.map(r => r.startTime + r.duration))

    // Estimate network time (sum of all resource transfer times)
    const networkTime = this.resources.reduce((sum, r) => sum + r.duration, 0)

    // Calculate parallelism
    const maxIterations = 10000
    const timeSlotMap = new Map<number, number>()
    this.resources.forEach(r => {
      const durationSlots = Math.min(Math.floor(r.duration), maxIterations)
      const startSlot = Math.floor(r.startTime)
      for (let i = 0; i < durationSlots; i++) {
        const t = startSlot + i
        timeSlotMap.set(t, (timeSlotMap.get(t) || 0) + 1)
      }
    })
    const parallelism =
      networkTime > 0 && totalPageLoadTime > 0 ? Math.min(totalPageLoadTime / networkTime, 1) : 1

    // Identify critical path resources
    const criticalPath: ResourceTiming[] = []
    criticalPathSegments.forEach(segment => {
      segment.resources.forEach(r => {
        if (this.isOnCriticalPath(r)) {
          criticalPath.push(r)
        }
      })
    })

    // Calculate timing breakdown
    const timingBreakdown = this.calculateTimingBreakdown()

    // Identify non-critical resources
    const nonCriticalResources = this.resources.filter(r => !this.isOnCriticalPath(r))

    // Generate recommendations
    const recommendations = [
      ...this.generateRecommendations(entries),
      ...blockingAnalysis.recommendations,
    ]

    return {
      entries,
      criticalPath,
      totalPageLoadTime: Math.round(totalPageLoadTime),
      mainThreadBlockingTime: this.calculateMainThreadBlocking(),
      networkTime: Math.round(networkTime),
      parallelism: Math.round(parallelism * 10) / 10,
      recommendations,
      fcpEstimate: fcpData.fcp,
      renderBlockingResources: blockingAnalysis.blockingResources,
      nonCriticalResources,
      timingBreakdown,
      // Additional metrics for v1.8.1
      resourceTypeBreakdown: this.calculateResourceTypeBreakdown(),
      criticalPathAnalysis: this.analyzeCriticalPathDetails(criticalPath),
      performanceScore: this.calculatePerformanceScore(entries),
      coreWebVitals: this.estimateCoreWebVitals(fcpData, blockingAnalysis),
      renderingMetrics: this.estimateRenderingMetrics(),
    }
  }

  /**
   * Calculate overall timing breakdown
   */
  private calculateTimingBreakdown(): {
    dns: number
    tcp: number
    tls: number
    request: number
    response: number
    processing: number
  } {
    let dns = 0
    let tcp = 0
    let tls = 0
    let request = 0
    let response = 0
    let processing = 0

    for (const resource of this.resources) {
      if (resource.domainLookupStart !== undefined && resource.domainLookupEnd !== undefined) {
        dns += resource.domainLookupEnd - resource.domainLookupStart
      }
      if (resource.connectStart !== undefined && resource.connectEnd !== undefined) {
        const connectTime = resource.connectEnd - resource.connectStart
        tcp += Math.min(
          connectTime,
          resource.connectStart - (resource.domainLookupEnd ?? resource.connectStart)
        )
        if (resource.requestStart !== undefined) {
          tls += Math.max(0, resource.requestStart - resource.connectEnd)
        }
      }
      if (resource.requestStart !== undefined && resource.responseStart !== undefined) {
        request += resource.responseStart - resource.requestStart
      }
      if (resource.responseStart !== undefined && resource.responseEnd !== undefined) {
        response += resource.responseEnd - resource.responseStart
      }
    }

    // Processing is estimated as remaining time
    const totalNetworkTime = dns + tcp + tls + request + response
    processing = Math.max(
      0,
      this.resources.reduce((sum, r) => sum + r.duration, 0) - totalNetworkTime
    )

    return {
      dns: Math.round(dns),
      tcp: Math.round(tcp),
      tls: Math.round(tls),
      request: Math.round(request),
      response: Math.round(response),
      processing: Math.round(processing),
    }
  }

  /**
   * Calculate main thread blocking time
   */
  private calculateMainThreadBlocking(): number {
    const jsResources = this.resources.filter(r => r.initiatorType === 'script')
    return Math.round(jsResources.reduce((sum, r) => sum + r.duration * 0.5, 0))
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(entries: WaterfallEntry[]): string[] {
    const recommendations: string[] = []

    // Check for large resources
    const largeResources = entries.filter(e => e.resource.transferSize > 500 * 1024)
    if (largeResources.length > 0) {
      recommendations.push(
        `${largeResources.length} resources are larger than 500KB. Consider compression or lazy loading.`
      )
    }

    // Check for slow resources
    const slowResources = entries.filter(e => e.totalDuration > 1000)
    if (slowResources.length > 0) {
      recommendations.push(
        `${slowResources.length} resources took more than 1 second to load. Optimize server response times.`
      )
    }

    // Check for critical impact resources
    const criticalImpactResources = entries.filter(e => e.estimatedImpact === 'critical')
    if (criticalImpactResources.length > 0) {
      recommendations.push(
        `${criticalImpactResources.length} resources have critical impact on performance.`
      )
    }

    // Check parallelism
    if (entries.length > 10) {
      recommendations.push(
        'Consider using HTTP/2 or HTTP/3 for better parallelism with many resources.'
      )
    }

    return recommendations
  }

  /**
   * Calculate resource type breakdown
   */
  private calculateResourceTypeBreakdown(): Map<
    string,
    { count: number; totalSize: number; totalTime: number }
  > {
    const breakdown = new Map<string, { count: number; totalSize: number; totalTime: number }>()

    for (const resource of this.resources) {
      const type = resource.resourceType || resource.initiatorType || 'other'
      const current = breakdown.get(type) || { count: 0, totalSize: 0, totalTime: 0 }
      current.count++
      current.totalSize += resource.transferSize || 0
      current.totalTime += resource.duration
      breakdown.set(type, current)
    }

    return breakdown
  }

  /**
   * Analyze critical path in detail
   */
  private analyzeCriticalPathDetails(criticalPath: ResourceTiming[]): {
    longestChain: ResourceTiming[]
    chainDuration: number
    bottleneck: ResourceTiming | null
    optimizationPotential: number
  } {
    if (criticalPath.length === 0) {
      return {
        longestChain: [],
        chainDuration: 0,
        bottleneck: null,
        optimizationPotential: 0,
      }
    }

    // Sort by start time
    const sorted = [...criticalPath].sort((a, b) => a.startTime - b.startTime)

    // Find the longest sequential chain
    let longestChain: ResourceTiming[] = []
    let currentChain: ResourceTiming[] = []
    let lastEndTime = 0

    for (const resource of sorted) {
      if (resource.startTime >= lastEndTime) {
        // Sequential
        currentChain.push(resource)
      } else {
        // Parallel or overlapping
        if (currentChain.length > longestChain.length) {
          longestChain = [...currentChain]
        }
        currentChain = [resource]
      }
      lastEndTime = Math.max(lastEndTime, resource.startTime + resource.duration)
    }

    if (currentChain.length > longestChain.length) {
      longestChain = currentChain
    }

    const chainDuration = longestChain.reduce((sum, r) => sum + r.duration, 0)

    // Find bottleneck (slowest resource)
    const bottleneck =
      longestChain.length > 0
        ? longestChain.reduce((slowest, r) => (r.duration > slowest.duration ? r : slowest))
        : null

    // Calculate optimization potential
    // If bottleneck was reduced to 50%, how much time would be saved?
    const optimizationPotential = bottleneck ? bottleneck.duration * 0.5 : 0

    return {
      longestChain,
      chainDuration,
      bottleneck,
      optimizationPotential,
    }
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(entries: WaterfallEntry[]): number {
    if (entries.length === 0) return 100

    let score = 100

    // Penalize for slow resources
    const slowResources = entries.filter(e => e.totalDuration > 1000)
    score -= slowResources.length * 5

    // Penalize for large resources
    const largeResources = entries.filter(e => e.resource.transferSize > 500 * 1024)
    score -= largeResources.length * 3

    // Penalize for critical issues
    const criticalIssues = entries.filter(e => e.estimatedImpact === 'critical')
    score -= criticalIssues.length * 10

    // Penalize for blocking resources
    const blockingResources = entries.filter(e => e.blockingTime > 100)
    score -= blockingResources.length * 4

    // Penalize for failed resources
    const failedResources = entries.filter(e => e.resource.responseStatus >= 400)
    score -= failedResources.length * 15

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * Estimate Core Web Vitals
   */
  private estimateCoreWebVitals(
    fcpData: FirstContentfulPaintData,
    blockingAnalysis: {
      blockingResources: ResourceTiming[]
      totalBlockingTime: number
      recommendations: string[]
    }
  ): { lcp: number | null; fid: number | null; cls: number | null } {
    // LCP: Largest Contentful Paint - estimate from critical path
    const lcp = fcpData.fcp > 0 ? fcpData.fcp + blockingAnalysis.totalBlockingTime * 0.5 : null

    // FID: First Input Delay - estimate from main thread blocking
    const fid =
      blockingAnalysis.totalBlockingTime > 0
        ? Math.min(300, blockingAnalysis.totalBlockingTime * 0.1)
        : null

    // CLS: Cumulative Layout Shift - cannot accurately estimate from resources
    // Would need actual layout shift observations
    const cls = null

    return { lcp, fid, cls }
  }

  /**
   * Estimate rendering metrics
   */
  private estimateRenderingMetrics(): {
    layoutCount: number
    layoutDuration: number
    recalcStyleCount: number
    recalcStyleDuration: number
    paintCount: number
    paintDuration: number
  } {
    // These are estimates based on resource counts
    // In a real implementation, these would come from PerformanceObserver

    const scriptCount = this.resources.filter(r => r.initiatorType === 'script').length
    const cssCount = this.resources.filter(
      r => r.initiatorType === 'link' && r.name.includes('css')
    ).length
    const domImpactfulResources = this.resources.filter(
      r => r.initiatorType === 'script' || r.initiatorType === 'link'
    ).length

    return {
      layoutCount: Math.round(domImpactfulResources * 1.5),
      layoutDuration: Math.round(domImpactfulResources * 5),
      recalcStyleCount: Math.round(cssCount * 2),
      recalcStyleDuration: Math.round(cssCount * 10),
      paintCount: Math.round(this.resources.length * 0.5),
      paintDuration: Math.round(this.resources.length * 2),
    }
  }

  /**
   * Find slowest resources
   */
  findSlowestResources(limit: number = 5): WaterfallEntry[] {
    return this.resources
      .map(r => this.analyzeResource(r))
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, limit)
  }

  /**
   * Find largest resources
   */
  findLargestResources(limit: number = 5): WaterfallEntry[] {
    return this.resources
      .map(r => this.analyzeResource(r))
      .sort((a, b) => b.resource.transferSize - a.resource.transferSize)
      .slice(0, limit)
  }

  /**
   * Convert PerformanceResourceTiming to ResourceTiming
   */
  private fromPerformanceResourceTiming(timing: PerformanceResourceTiming): ResourceTiming {
    return {
      name: timing.name,
      startTime: timing.startTime,
      duration: timing.duration,
      initiatorType: timing.initiatorType,
      transferSize: timing.transferSize,
      encodedBodySize: timing.encodedBodySize,
      decodedBodySize: timing.decodedBodySize,
      responseStatus: 0,
      serverTiming: timing.serverTiming ? [...timing.serverTiming] : undefined,
      // Enhanced fields
      fetchStart: timing.fetchStart,
      domainLookupStart: timing.domainLookupStart,
      domainLookupEnd: timing.domainLookupEnd,
      connectStart: timing.connectStart,
      connectEnd: timing.connectEnd,
      requestStart: timing.requestStart,
      responseStart: timing.responseStart,
      responseEnd: timing.responseEnd,
    }
  }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Create mock resource timing for testing
 */
export function createMockResourceTiming(overrides: Partial<ResourceTiming> = {}): ResourceTiming {
  const startTime = overrides.startTime ?? 0
  const duration = overrides.duration ?? 500

  return {
    name: overrides.name !== undefined ? overrides.name : 'https://example.com/script.js',
    startTime,
    duration,
    initiatorType: overrides.initiatorType !== undefined ? overrides.initiatorType : 'script',
    transferSize: overrides.transferSize !== undefined ? overrides.transferSize : 50 * 1024,
    encodedBodySize:
      overrides.encodedBodySize !== undefined ? overrides.encodedBodySize : 50 * 1024,
    decodedBodySize:
      overrides.decodedBodySize !== undefined ? overrides.decodedBodySize : 50 * 1024,
    responseStatus: overrides.responseStatus !== undefined ? overrides.responseStatus : 200,
    serverTiming: overrides.serverTiming,
    // Enhanced fields
    fetchStart: overrides.fetchStart ?? startTime,
    domainLookupStart: overrides.domainLookupStart ?? startTime,
    domainLookupEnd: overrides.domainLookupEnd ?? startTime + 50,
    connectStart: overrides.connectStart ?? startTime + 50,
    connectEnd: overrides.connectEnd ?? startTime + 100,
    requestStart: overrides.requestStart ?? startTime + 100,
    responseStart: overrides.responseStart ?? startTime + 150,
    responseEnd: overrides.responseEnd ?? startTime + duration,
  }
}

/**
 * Convert PerformanceResourceTiming to ResourceTiming
 */
export function fromPerformanceResourceTiming(timing: PerformanceResourceTiming): ResourceTiming {
  return {
    name: timing.name,
    startTime: timing.startTime,
    duration: timing.duration,
    initiatorType: timing.initiatorType,
    transferSize: timing.transferSize,
    encodedBodySize: timing.encodedBodySize,
    decodedBodySize: timing.decodedBodySize,
    responseStatus: 0,
    serverTiming: timing.serverTiming ? [...timing.serverTiming] : undefined,
    fetchStart: timing.fetchStart,
    domainLookupStart: timing.domainLookupStart,
    domainLookupEnd: timing.domainLookupEnd,
    connectStart: timing.connectStart,
    connectEnd: timing.connectEnd,
    requestStart: timing.requestStart,
    responseStart: timing.responseStart,
    responseEnd: timing.responseEnd,
  }
}

// ========================================
// Export singleton instance
// ========================================

export const performanceWaterfall = new PerformanceWaterfall()

export default PerformanceWaterfall
