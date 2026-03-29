/**
 * Performance Waterfall Analyzer
 * Analyzes resource loading waterfall to identify performance bottlenecks
 */

// ========================================
// Types
// ========================================

export interface ResourceTiming {
  name: string;
  startTime: number;
  duration: number;
  initiatorType: string;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  responseStatus: number;
  serverTiming?: PerformanceServerTiming[];
}

export interface ResourceBreakdown {
  phase: string;
  duration: number;
  percentage: number;
  color: string;
}

export interface WaterfallEntry {
  resource: ResourceTiming;
  breakdown: ResourceBreakdown[];
  totalDuration: number;
  critical: boolean;
  onCriticalPath: boolean;
}

export interface WaterfallAnalysis {
  entries: WaterfallEntry[];
  criticalPath: ResourceTiming[];
  totalPageLoadTime: number;
  mainThreadBlockingTime: number;
  networkTime: number;
  parallelism: number;
  recommendations: string[];
}

export interface CriticalPathSegment {
  resources: ResourceTiming[];
  totalDuration: number;
  bottleneck?: {
    resource: ResourceTiming;
    phase: string;
    impact: number;
  };
}

// ========================================
// Waterfall Analyzer Class
// ========================================

export class PerformanceWaterfall {
  private resources: ResourceTiming[] = [];
  private criticalPathThresholds = {
    renderBlocking: 100, // ms
    javascriptBlocking: 200, // ms
    cssBlocking: 100, // ms
  };

  /**
   * Add resource timing data
   */
  addResource(resource: ResourceTiming): void {
    this.resources.push(resource);
  }

  /**
   * Add multiple resources
   */
  addResources(resources: ResourceTiming[]): void {
    this.resources.push(...resources);
  }

  /**
   * Clear all resources
   */
  clear(): void {
    this.resources = [];
  }

  /**
   * Get all resources
   */
  getResources(): ResourceTiming[] {
    return [...this.resources];
  }

  /**
   * Break down a single resource's timing into phases
   */
  breakdownResource(resource: ResourceTiming): ResourceBreakdown[] {
    const breakdown: ResourceBreakdown[] = [];
    const { duration } = resource;

    // Estimate phase breakdown (simplified)
    // In real scenario, use performance.timing entries
    const phases = [
      { name: 'DNS Lookup', percentage: 0.1, color: '#3b82f6' },
      { name: 'TCP Connection', percentage: 0.1, color: '#10b981' },
      { name: 'TLS Handshake', percentage: 0.1, color: '#f59e0b' },
      { name: 'Request Sent', percentage: 0.1, color: '#ef4444' },
      { name: 'Server Processing', percentage: 0.3, color: '#8b5cf6' },
      { name: 'Content Download', percentage: 0.3, color: '#ec4899' },
    ];

    phases.forEach((phase) => {
      const phaseDuration = duration * phase.percentage;
      breakdown.push({
        phase: phase.name,
        duration: Math.round(phaseDuration),
        percentage: Math.round(phase.percentage * 100),
        color: phase.color,
      });
    });

    return breakdown;
  }

  /**
   * Analyze a single resource
   */
  analyzeResource(resource: ResourceTiming): WaterfallEntry {
    const breakdown = this.breakdownResource(resource);
    const critical = this.isCriticalResource(resource);
    const onCriticalPath = this.isOnCriticalPath(resource);

    return {
      resource,
      breakdown,
      totalDuration: Math.round(resource.duration),
      critical,
      onCriticalPath,
    };
  }

  /**
   * Check if a resource is critical (blocking)
   */
  private isCriticalResource(resource: ResourceTiming): boolean {
    const { initiatorType, responseStatus, duration } = resource;

    // Failed resources
    if (responseStatus >= 400) {
      return true;
    }

    // Render-blocking resources
    if (initiatorType === 'script' || initiatorType === 'link') {
      return duration > this.criticalPathThresholds.renderBlocking;
    }

    // Large resources
    if (resource.transferSize > 500 * 1024) {
      return true;
    }

    return false;
  }

  /**
   * Check if resource is on critical path
   */
  private isOnCriticalPath(resource: ResourceTiming): boolean {
    const { initiatorType, name } = resource;

    // HTML document
    if (initiatorType === 'document' && name.endsWith('.html')) {
      return true;
    }

    // Critical CSS
    if (initiatorType === 'link' && name.includes('css')) {
      // Check if it's in <head>
      return true;
    }

    // Blocking JS
    if (initiatorType === 'script' && !name.includes('async') && !name.includes('defer')) {
      return true;
    }

    return false;
  }

  /**
   * Identify the critical rendering path
   */
  identifyCriticalPath(): CriticalPathSegment[] {
    const segments: CriticalPathSegment[] = [];

    // Sort resources by start time
    const sortedResources = [...this.resources].sort((a, b) => a.startTime - b.startTime);

    // Find sequential dependencies
    let currentSegment: ResourceTiming[] = [];
    let lastEndTime = 0;

    sortedResources.forEach((resource) => {
      if (resource.startTime > lastEndTime) {
        // New segment (parallel)
        if (currentSegment.length > 0) {
          segments.push({
            resources: currentSegment,
            totalDuration: currentSegment.reduce((sum, r) => sum + r.duration, 0),
          });
        }
        currentSegment = [];
      }

      currentSegment.push(resource);
      lastEndTime = Math.max(lastEndTime, resource.startTime + resource.duration);
    });

    // Add final segment
    if (currentSegment.length > 0) {
      segments.push({
        resources: currentSegment,
        totalDuration: currentSegment.reduce((sum, r) => sum + r.duration, 0),
      });
    }

    // Identify bottlenecks in each segment
    segments.forEach((segment) => {
      const slowest = segment.resources.reduce((slowest, r) =>
        r.duration > slowest.duration ? r : slowest
      );

      if (slowest.duration > 500) {
        segment.bottleneck = {
          resource: slowest,
          phase: 'server',
          impact: (slowest.duration / segment.totalDuration) * 100,
        };
      }
    });

    return segments;
  }

  /**
   * Analyze complete waterfall
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
      };
    }

    const entries = this.resources.map((resource) => this.analyzeResource(resource));
    const criticalPathSegments = this.identifyCriticalPath();

    // Calculate totals
    const totalPageLoadTime = Math.max(...this.resources.map((r) => r.startTime + r.duration));

    // Estimate network time (sum of all resource transfer times)
    const networkTime = this.resources.reduce((sum, r) => sum + r.duration, 0);

    // Calculate parallelism (how many resources loaded simultaneously)
    // Limit iterations to prevent memory issues with very large durations
    const maxIterations = 10000; // Max 10 seconds of slots
    const timeSlotMap = new Map<number, number>();
    this.resources.forEach((r) => {
      const durationSlots = Math.min(Math.floor(r.duration), maxIterations);
      const startSlot = Math.floor(r.startTime);
      for (let i = 0; i < durationSlots; i++) {
        const t = startSlot + i;
        timeSlotMap.set(t, (timeSlotMap.get(t) || 0) + 1);
      }
    });
    const parallelism = networkTime > 0 && totalPageLoadTime > 0 ? Math.min(totalPageLoadTime / networkTime, 1) : 1;

    // Identify critical path resources
    const criticalPath: ResourceTiming[] = [];
    criticalPathSegments.forEach((segment) => {
      segment.resources.forEach((r) => {
        if (this.isOnCriticalPath(r)) {
          criticalPath.push(r);
        }
      });
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(entries);

    return {
      entries,
      criticalPath,
      totalPageLoadTime: Math.round(totalPageLoadTime),
      mainThreadBlockingTime: this.calculateMainThreadBlocking(),
      networkTime: Math.round(networkTime),
      parallelism: Math.round(parallelism * 10) / 10,
      recommendations,
    };
  }

  /**
   * Calculate main thread blocking time
   */
  private calculateMainThreadBlocking(): number {
    // Estimate based on JavaScript execution
    const jsResources = this.resources.filter(
      (r) => r.initiatorType === 'script'
    );

    // Assume 50% of JS time blocks main thread
    return Math.round(jsResources.reduce((sum, r) => sum + r.duration * 0.5, 0));
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(entries: WaterfallEntry[]): string[] {
    const recommendations: string[] = [];

    // Check for large resources
    const largeResources = entries.filter(
      (e) => e.resource.transferSize > 500 * 1024
    );
    if (largeResources.length > 0) {
      recommendations.push(
        `${largeResources.length} resources are larger than 500KB. Consider compression or lazy loading.`
      );
    }

    // Check for slow resources
    const slowResources = entries.filter((e) => e.totalDuration > 1000);
    if (slowResources.length > 0) {
      recommendations.push(
        `${slowResources.length} resources took more than 1 second to load. Optimize server response times.`
      );
    }

    // Check for render-blocking resources
    const blockingResources = entries.filter((e) => e.critical);
    if (blockingResources.length > 0) {
      recommendations.push(
        `${blockingResources.length} render-blocking resources found. Use async/defer for scripts and preload for critical CSS.`
      );
    }

    // Check parallelism
    const parallelResources = entries.filter((e) => e.resource.initiatorType === 'link');
    if (parallelResources.length > 0) {
      recommendations.push(
        'Consider using HTTP/2 Server Push for critical resources to improve parallelism.'
      );
    }

    return recommendations;
  }

  /**
   * Find slowest resources
   */
  findSlowestResources(limit: number = 5): WaterfallEntry[] {
    return this.resources
      .map((r) => this.analyzeResource(r))
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, limit);
  }

  /**
   * Find largest resources
   */
  findLargestResources(limit: number = 5): WaterfallEntry[] {
    return this.resources
      .map((r) => this.analyzeResource(r))
      .sort((a, b) => b.resource.transferSize - a.resource.transferSize)
      .slice(0, limit);
  }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Create mock resource timing for testing
 */
export function createMockResourceTiming(
  overrides: Partial<ResourceTiming> = {}
): ResourceTiming {
  return {
    name: overrides.name !== undefined ? overrides.name : 'https://example.com/script.js',
    startTime: overrides.startTime !== undefined ? overrides.startTime : 0,
    duration: overrides.duration !== undefined ? overrides.duration : 500,
    initiatorType: overrides.initiatorType !== undefined ? overrides.initiatorType : 'script',
    transferSize: overrides.transferSize !== undefined ? overrides.transferSize : 50 * 1024,
    encodedBodySize: overrides.encodedBodySize !== undefined ? overrides.encodedBodySize : 50 * 1024,
    decodedBodySize: overrides.decodedBodySize !== undefined ? overrides.decodedBodySize : 50 * 1024,
    responseStatus: overrides.responseStatus !== undefined ? overrides.responseStatus : 200,
    serverTiming: overrides.serverTiming,
  };
}

/**
 * Convert PerformanceResourceTiming to ResourceTiming
 */
export function fromPerformanceResourceTiming(
  timing: PerformanceResourceTiming
): ResourceTiming {
  return {
    name: timing.name,
    startTime: timing.startTime,
    duration: timing.duration,
    initiatorType: timing.initiatorType,
    transferSize: timing.transferSize,
    encodedBodySize: timing.encodedBodySize,
    decodedBodySize: timing.decodedBodySize,
    responseStatus: 0, // Not available in PerformanceResourceTiming
    serverTiming: timing.serverTiming ? [...timing.serverTiming] : undefined,
  };
}

// ========================================
// Export singleton instance
// ========================================

export const performanceWaterfall = new PerformanceWaterfall();

export default PerformanceWaterfall;
