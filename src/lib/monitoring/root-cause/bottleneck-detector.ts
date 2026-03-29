/**
 * Bottleneck Detector
 * Identifies performance bottlenecks and provides optimization recommendations
 */

// ========================================
// Types
// ========================================

export interface Bottleneck {
  id: string;
  type: 'network' | 'render' | 'script' | 'layout' | 'paint' | 'memory' | 'dom' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  name: string;
  description: string;
  impact: number; // 0-100
  source: string; // Where the bottleneck originates
  details?: Record<string, unknown>;
}

export interface BottleneckAnalysis {
  bottlenecks: Bottleneck[];
  overallScore: number; // 0-100 (higher is better)
  criticalIssues: Bottleneck[];
  highPriorityIssues: Bottleneck[];
  recommendations: BottleneckRecommendation[];
  summary: string;
}

export interface BottleneckRecommendation {
  bottleneckId: string;
  type: 'quick-win' | 'medium-term' | 'long-term';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  steps: string[];
  priority: number; // 1-10
}

export interface PerformanceProfile {
  // Network metrics
  totalTransferSize: number;
  requestCount: number;
  slowRequests: number;
  averageResponseTime: number;

  // Render metrics
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;

  // Script metrics
  scriptExecutionTime: number;
  blockingScriptTime: number;
  scriptErrors: number;

  // DOM metrics
  domNodes: number;
  domDepth: number;
  iframeCount: number;

  // Memory metrics
  memoryUsed: number;
  memoryLimit: number;
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
    },
  };

  /**
   * Analyze a performance profile to find bottlenecks
   */
  analyze(profile: PerformanceProfile): BottleneckAnalysis {
    const bottlenecks = this.detectBottlenecks(profile);
    const sortedBottlenecks = bottlenecks.sort((a, b) => b.impact - a.impact);

    const criticalIssues = sortedBottlenecks.filter((b) => b.severity === 'critical');
    const highPriorityIssues = sortedBottlenecks.filter((b) => b.severity === 'high');

    const overallScore = this.calculateOverallScore(sortedBottlenecks);
    const recommendations = this.generateRecommendations(sortedBottlenecks);
    const summary = this.generateSummary(sortedBottlenecks, overallScore);

    return {
      bottlenecks: sortedBottlenecks,
      overallScore,
      criticalIssues,
      highPriorityIssues,
      recommendations,
      summary,
    };
  }

  /**
   * Detect all bottlenecks from profile
   */
  private detectBottlenecks(profile: PerformanceProfile): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // Network bottlenecks
    bottlenecks.push(...this.detectNetworkBottlenecks(profile));

    // Render bottlenecks
    bottlenecks.push(...this.detectRenderBottlenecks(profile));

    // Script bottlenecks
    bottlenecks.push(...this.detectScriptBottlenecks(profile));

    // DOM bottlenecks
    bottlenecks.push(...this.detectDomBottlenecks(profile));

    // Memory bottlenecks
    bottlenecks.push(...this.detectMemoryBottlenecks(profile));

    return bottlenecks;
  }

  /**
   * Detect network bottlenecks
   */
  private detectNetworkBottlenecks(profile: PerformanceProfile): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // Large transfer size
    if (profile.totalTransferSize > this.thresholds.network.totalTransferSize) {
      const impact = Math.min(100, (profile.totalTransferSize / this.thresholds.network.totalTransferSize) * 40);
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
      });
    }

    // Too many requests
    if (profile.requestCount > this.thresholds.network.requestCount) {
      const impact = Math.min(100, (profile.requestCount / this.thresholds.network.requestCount) * 30);
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
      });
    }

    // Slow requests
    if (profile.slowRequests > this.thresholds.network.slowRequests) {
      const impact = Math.min(100, (profile.slowRequests / this.thresholds.network.slowRequests) * 35);
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
      });
    }

    return bottlenecks;
  }

  /**
   * Detect render bottlenecks
   */
  private detectRenderBottlenecks(profile: PerformanceProfile): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // Slow FCP
    if (profile.firstContentfulPaint > this.thresholds.render.fcp) {
      const impact = Math.min(100, (profile.firstContentfulPaint / this.thresholds.render.fcp) * 50);
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
      });
    }

    // Slow LCP
    if (profile.largestContentfulPaint > this.thresholds.render.lcp) {
      const impact = Math.min(100, (profile.largestContentfulPaint / this.thresholds.render.lcp) * 50);
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
      });
    }

    // Poor CLS
    if (profile.cumulativeLayoutShift > this.thresholds.render.cls) {
      const impact = Math.min(100, (profile.cumulativeLayoutShift / this.thresholds.render.cls) * 40);
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
      });
    }

    return bottlenecks;
  }

  /**
   * Detect script bottlenecks
   */
  private detectScriptBottlenecks(profile: PerformanceProfile): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // Slow script execution
    if (profile.scriptExecutionTime > this.thresholds.script.executionTime) {
      const impact = Math.min(100, (profile.scriptExecutionTime / this.thresholds.script.executionTime) * 35);
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
      });
    }

    // Blocking scripts
    if (profile.blockingScriptTime > this.thresholds.script.blockingTime) {
      const impact = Math.min(100, (profile.blockingScriptTime / this.thresholds.script.blockingTime) * 40);
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
      });
    }

    // Script errors
    if (profile.scriptErrors > this.thresholds.script.errors) {
      const impact = Math.min(100, profile.scriptErrors * 20);
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
      });
    }

    return bottlenecks;
  }

  /**
   * Detect DOM bottlenecks
   */
  private detectDomBottlenecks(profile: PerformanceProfile): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // Too many DOM nodes
    if (profile.domNodes > this.thresholds.dom.nodes) {
      const impact = Math.min(100, (profile.domNodes / this.thresholds.dom.nodes) * 30);
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
      });
    }

    // Deep DOM nesting
    if (profile.domDepth > this.thresholds.dom.depth) {
      const impact = Math.min(100, (profile.domDepth / this.thresholds.dom.depth) * 25);
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
      });
    }

    // Too many iframes
    if (profile.iframeCount > this.thresholds.dom.iframes) {
      const impact = Math.min(100, profile.iframeCount * 15);
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
      });
    }

    return bottlenecks;
  }

  /**
   * Detect memory bottlenecks
   */
  private detectMemoryBottlenecks(profile: PerformanceProfile): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // High memory usage
    if (profile.memoryUsed > 0 && profile.memoryLimit > 0) {
      const usageRatio = profile.memoryUsed / profile.memoryLimit;
      if (usageRatio > this.thresholds.memory.usageRatio) {
        const impact = Math.min(100, usageRatio * 100);
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
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(bottlenecks: Bottleneck[]): number {
    if (bottlenecks.length === 0) return 100;

    const totalImpact = bottlenecks.reduce((sum, b) => sum + b.impact, 0);
    const criticalPenalty = bottlenecks.filter((b) => b.severity === 'critical').length * 15;
    const highPenalty = bottlenecks.filter((b) => b.severity === 'high').length * 8;

    let score = 100 - totalImpact / bottlenecks.length - criticalPenalty - highPenalty;
    return Math.max(0, Math.round(score));
  }

  /**
   * Generate recommendations from bottlenecks
   */
  private generateRecommendations(bottlenecks: Bottleneck[]): BottleneckRecommendation[] {
    const recommendations: BottleneckRecommendation[] = [];

    bottlenecks.forEach((bottleneck) => {
      const rec = this.getRecommendationForBottleneck(bottleneck);
      if (rec) {
        recommendations.push(rec);
      }
    });

    return recommendations.sort((a, b) => b.priority - a.priority);
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
    };

    const template = recommendations[bottleneck.id];
    if (!template) return null;

    return {
      bottleneckId: bottleneck.id,
      type: template.type as BottleneckRecommendation['type'],
      effort: template.effort as BottleneckRecommendation['effort'],
      impact: template.impact as BottleneckRecommendation['impact'],
      title: template.title!,
      description: template.description!,
      steps: template.steps!,
      priority: Math.min(10, Math.round(bottleneck.impact / 10)),
    };
  }

  /**
   * Generate summary text
   */
  private generateSummary(bottlenecks: Bottleneck[], score: number): string {
    const criticalCount = bottlenecks.filter((b) => b.severity === 'critical').length;
    const highCount = bottlenecks.filter((b) => b.severity === 'high').length;

    if (bottlenecks.length === 0) {
      return 'No significant bottlenecks detected. Performance is excellent!';
    }

    if (criticalCount > 0) {
      return `Found ${criticalCount} critical and ${highCount} high-priority issues. Immediate attention required. Score: ${score}/100`;
    }

    if (highCount > 0) {
      return `Found ${highCount} high-priority issues. Consider addressing them soon. Score: ${score}/100`;
    }

    return `Found ${bottlenecks.length} minor issues. Performance is good but can be improved. Score: ${score}/100`;
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  }

  /**
   * Update detection thresholds
   */
  updateThresholds(thresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  getThresholds() {
    return { ...this.thresholds };
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
    totalTransferSize: overrides.totalTransferSize !== undefined ? overrides.totalTransferSize : 500 * 1024,
    requestCount: overrides.requestCount !== undefined ? overrides.requestCount : 20,
    slowRequests: overrides.slowRequests !== undefined ? overrides.slowRequests : 0,
    averageResponseTime: overrides.averageResponseTime !== undefined ? overrides.averageResponseTime : 200,

    firstContentfulPaint: overrides.firstContentfulPaint !== undefined ? overrides.firstContentfulPaint : 1200,
    largestContentfulPaint: overrides.largestContentfulPaint !== undefined ? overrides.largestContentfulPaint : 2000,
    firstInputDelay: overrides.firstInputDelay !== undefined ? overrides.firstInputDelay : 50,
    cumulativeLayoutShift: overrides.cumulativeLayoutShift !== undefined ? overrides.cumulativeLayoutShift : 0.05,
    timeToInteractive: overrides.timeToInteractive !== undefined ? overrides.timeToInteractive : 2500,

    scriptExecutionTime: overrides.scriptExecutionTime !== undefined ? overrides.scriptExecutionTime : 30,
    blockingScriptTime: overrides.blockingScriptTime !== undefined ? overrides.blockingScriptTime : 50,
    scriptErrors: overrides.scriptErrors !== undefined ? overrides.scriptErrors : 0,

    domNodes: overrides.domNodes !== undefined ? overrides.domNodes : 800,
    domDepth: overrides.domDepth !== undefined ? overrides.domDepth : 12,
    iframeCount: overrides.iframeCount !== undefined ? overrides.iframeCount : 0,

    memoryUsed: overrides.memoryUsed !== undefined ? overrides.memoryUsed : 50 * 1024 * 1024,
    memoryLimit: overrides.memoryLimit !== undefined ? overrides.memoryLimit : 100 * 1024 * 1024,
  };
}

// ========================================
// Export singleton instance
// ========================================

export const bottleneckDetector = new BottleneckDetector();

export default BottleneckDetector;
