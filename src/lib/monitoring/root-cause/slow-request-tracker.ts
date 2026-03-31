/**
 * Slow Request Tracker
 * Tracks and analyzes slow network requests
 */

// ========================================
// Types
// ========================================

export interface RequestTiming {
  url: string;
  method: string;
  status: number;
  startTime: number;
  endTime: number;
  duration: number;
  size: number;

  // Detailed timing breakdown
  dnsLookup?: number;
  tcpConnection?: number;
  tlsHandshake?: number;
  requestSent?: number;
  serverProcessing?: number;
  contentTransfer?: number;

  // Additional metadata
  cached: boolean;
  headers?: Record<string, string>;
  error?: string;
}

export interface SlowRequestAnalysis {
  request: RequestTiming;
  bottlenecks: RequestBottleneck[];
  totalDuration: number;
  primaryBottleneck: string;
  recommendations: string[];
}

export interface RequestBottleneck {
  phase: string;
  duration: number;
  percentage: number;
  severity: 'normal' | 'warning' | 'critical';
  threshold: number;
}

export interface SlowRequestThresholds {
  dnsLookup: number; // ms
  tcpConnection: number; // ms
  tlsHandshake: number; // ms
  requestSent: number; // ms
  serverProcessing: number; // ms
  contentTransfer: number; // ms
  totalDuration: number; // ms
}

export interface SlowRequestStats {
  totalRequests: number;
  slowRequests: number;
  averageDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  slowestRequests: RequestTiming[];
}

// ========================================
// Default Thresholds
// ========================================

const DEFAULT_THRESHOLDS: SlowRequestThresholds = {
  dnsLookup: 100, // ms
  tcpConnection: 100, // ms
  tlsHandshake: 200, // ms
  requestSent: 50, // ms
  serverProcessing: 500, // ms
  contentTransfer: 1000, // ms
  totalDuration: 2000, // ms
};

// ========================================
// Slow Request Tracker Class
// ========================================

export class SlowRequestTracker {
  private requests: RequestTiming[] = [];
  private thresholds: SlowRequestThresholds;
  private maxRequests: number = 1000;

  constructor(thresholds: Partial<SlowRequestThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Track a new request
   */
  trackRequest(request: RequestTiming): void {
    this.requests.push(request);

    // Keep only the last maxRequests
    if (this.requests.length > this.maxRequests) {
      this.requests.shift();
    }
  }

  /**
   * Track multiple requests
   */
  trackRequests(requests: RequestTiming[]): void {
    requests.forEach((r) => this.trackRequest(r));
  }

  /**
   * Clear all tracked requests
   */
  clear(): void {
    this.requests = [];
  }

  /**
   * Get all tracked requests
   */
  getRequests(): RequestTiming[] {
    return [...this.requests];
  }

  /**
   * Get slow requests (above total duration threshold)
   */
  getSlowRequests(): RequestTiming[] {
    return this.requests.filter(
      (r) => r.duration >= this.thresholds.totalDuration
    );
  }

  /**
   * Analyze a single request for bottlenecks
   */
  analyzeRequest(request: RequestTiming): SlowRequestAnalysis {
    const bottlenecks = this.identifyBottlenecks(request);
    const primaryBottleneck = this.findPrimaryBottleneck(bottlenecks);
    const recommendations = this.generateRecommendations(request, bottlenecks);

    return {
      request,
      bottlenecks,
      totalDuration: request.duration,
      primaryBottleneck,
      recommendations,
    };
  }

  /**
   * Identify bottlenecks in a request
   */
  identifyBottlenecks(request: RequestTiming): RequestBottleneck[] {
    const bottlenecks: RequestBottleneck[] = [];

    // DNS Lookup
    if (request.dnsLookup !== undefined) {
      bottlenecks.push(
        this.createBottleneck(
          'DNS Lookup',
          request.dnsLookup,
          request.duration,
          this.thresholds.dnsLookup
        )
      );
    }

    // TCP Connection
    if (request.tcpConnection !== undefined) {
      bottlenecks.push(
        this.createBottleneck(
          'TCP Connection',
          request.tcpConnection,
          request.duration,
          this.thresholds.tcpConnection
        )
      );
    }

    // TLS Handshake
    if (request.tlsHandshake !== undefined) {
      bottlenecks.push(
        this.createBottleneck(
          'TLS Handshake',
          request.tlsHandshake,
          request.duration,
          this.thresholds.tlsHandshake
        )
      );
    }

    // Request Sent
    if (request.requestSent !== undefined) {
      bottlenecks.push(
        this.createBottleneck(
          'Request Sent',
          request.requestSent,
          request.duration,
          this.thresholds.requestSent
        )
      );
    }

    // Server Processing
    if (request.serverProcessing !== undefined) {
      bottlenecks.push(
        this.createBottleneck(
          'Server Processing',
          request.serverProcessing,
          request.duration,
          this.thresholds.serverProcessing
        )
      );
    }

    // Content Transfer
    if (request.contentTransfer !== undefined) {
      bottlenecks.push(
        this.createBottleneck(
          'Content Transfer',
          request.contentTransfer,
          request.duration,
          this.thresholds.contentTransfer
        )
      );
    }

    return bottlenecks.sort((a, b) => b.duration - a.duration);
  }

  /**
   * Create a bottleneck entry
   */
  private createBottleneck(
    phase: string,
    duration: number,
    totalDuration: number,
    threshold: number
  ): RequestBottleneck {
    let severity: 'normal' | 'warning' | 'critical' = 'normal';

    if (duration >= threshold * 2) {
      severity = 'critical';
    } else if (duration >= threshold) {
      severity = 'warning';
    }

    return {
      phase,
      duration,
      percentage: Math.round((duration / totalDuration) * 100),
      severity,
      threshold,
    };
  }

  /**
   * Find the primary bottleneck
   */
  private findPrimaryBottleneck(bottlenecks: RequestBottleneck[]): string {
    const critical = bottlenecks.filter((b) => b.severity === 'critical');
    const warning = bottlenecks.filter((b) => b.severity === 'warning');

    if (critical.length > 0) {
      return critical[0].phase;
    }

    if (warning.length > 0) {
      return warning[0].phase;
    }

    return 'None';
  }

  /**
   * Generate recommendations based on bottlenecks
   */
  private generateRecommendations(
    request: RequestTiming,
    bottlenecks: RequestBottleneck[]
  ): string[] {
    const recommendations: string[] = [];

    bottlenecks.forEach((bottleneck) => {
      if (bottleneck.severity === 'normal') return;

      switch (bottleneck.phase) {
        case 'DNS Lookup':
          recommendations.push(
            'DNS lookup is slow. Consider using DNS prefetching or switching to a faster DNS provider.'
          );
          break;
        case 'TCP Connection':
          recommendations.push(
            'TCP connection is slow. Consider enabling TCP Fast Open or using a CDN closer to users.'
          );
          break;
        case 'TLS Handshake':
          recommendations.push(
            'TLS handshake is slow. Consider enabling TLS 1.3, OCSP stapling, or session resumption.'
          );
          break;
        case 'Request Sent':
          recommendations.push(
            'Request sending is slow. Reduce request size or optimize headers.'
          );
          break;
        case 'Server Processing':
          recommendations.push(
            'Server processing is slow. Optimize backend performance, add caching, or scale resources.'
          );
          break;
        case 'Content Transfer':
          recommendations.push(
            'Content transfer is slow. Enable compression (gzip/brotli), use a CDN, or reduce response size.'
          );
          break;
      }
    });

    // Additional recommendations based on request characteristics
    if (request.size > 1024 * 1024) {
      recommendations.push(
        'Response is larger than 1MB. Consider pagination, streaming, or compression.'
      );
    }

    if (request.cached && request.duration > 100) {
      recommendations.push(
        'Cached request is slow. Check cache headers and consider using a more efficient cache.'
      );
    }

    if (request.status >= 400) {
      recommendations.push(
        `Request failed with status ${request.status}. Handle errors gracefully and implement retry logic.`
      );
    }

    return recommendations;
  }

  /**
   * Get statistics for all tracked requests
   */
  getStats(): SlowRequestStats {
    const durations = this.requests.map((r) => r.duration);
    const sorted = [...durations].sort((a, b) => a - b);
    const n = sorted.length;

    const slowRequests = this.getSlowRequests();

    return {
      totalRequests: this.requests.length,
      slowRequests: slowRequests.length,
      averageDuration: n > 0 ? Math.round(this.average(durations)) : 0,
      p50Duration: n > 0 ? this.percentile(sorted, 50) : 0,
      p95Duration: n > 0 ? this.percentile(sorted, 95) : 0,
      p99Duration: n > 0 ? this.percentile(sorted, 99) : 0,
      slowestRequests: slowRequests
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10),
    };
  }

  /**
   * Calculate average
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Find requests by URL pattern
   */
  findByUrl(pattern: string | RegExp): RequestTiming[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    return this.requests.filter((r) => regex.test(r.url));
  }

  /**
   * Find requests by status code
   */
  findByStatus(status: number | number[]): RequestTiming[] {
    const statuses = Array.isArray(status) ? status : [status];
    return this.requests.filter((r) => statuses.includes(r.status));
  }

  /**
   * Get worst performing URLs
   */
  getWorstPerformingUrls(limit: number = 10): Array<{ url: string; count: number; avgDuration: number }> {
    const urlStats = new Map<string, { count: number; totalDuration: number }>();

    this.requests.forEach((r) => {
      const existing = urlStats.get(r.url) || { count: 0, totalDuration: 0 };
      existing.count++;
      existing.totalDuration += r.duration;
      urlStats.set(r.url, existing);
    });

    return Array.from(urlStats.entries())
      .map(([url, stats]) => ({
        url,
        count: stats.count,
        avgDuration: Math.round(stats.totalDuration / stats.count),
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  /**
   * Update thresholds
   */
  updateThresholds(thresholds: Partial<SlowRequestThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds
   */
  getThresholds(): SlowRequestThresholds {
    return { ...this.thresholds };
  }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Create mock request timing for testing
 */
export function createMockRequestTiming(
  overrides: Partial<RequestTiming> = {}
): RequestTiming {
  const duration = overrides.duration !== undefined ? overrides.duration : 1000;
  const startTime = overrides.startTime !== undefined ? overrides.startTime : Date.now() - duration;
  const endTime = overrides.endTime !== undefined ? overrides.endTime : startTime + duration;

  return {
    url: overrides.url !== undefined ? overrides.url : 'https://api.example.com/data',
    method: overrides.method !== undefined ? overrides.method : 'GET',
    status: overrides.status !== undefined ? overrides.status : 200,
    startTime,
    endTime,
    duration,
    size: overrides.size !== undefined ? overrides.size : 50 * 1024,
    dnsLookup: overrides.dnsLookup !== undefined ? overrides.dnsLookup : Math.round(duration * 0.05),
    tcpConnection: overrides.tcpConnection !== undefined ? overrides.tcpConnection : Math.round(duration * 0.05),
    tlsHandshake: overrides.tlsHandshake !== undefined ? overrides.tlsHandshake : Math.round(duration * 0.1),
    requestSent: overrides.requestSent !== undefined ? overrides.requestSent : Math.round(duration * 0.02),
    serverProcessing: overrides.serverProcessing !== undefined ? overrides.serverProcessing : Math.round(duration * 0.5),
    contentTransfer: overrides.contentTransfer !== undefined ? overrides.contentTransfer : Math.round(duration * 0.28),
    cached: overrides.cached !== undefined ? overrides.cached : false,
    headers: overrides.headers,
    error: overrides.error,
  };
}

/**
 * Measure actual request timing using Performance API
 */
export async function measureRequestTiming(
  url: string,
  options?: RequestInit
): Promise<RequestTiming> {
  const startTime = performance.now();

  try {
    const response = await fetch(url, options);
    const endTime = performance.now();

    // Get detailed timing from Performance API
    const entries = performance.getEntriesByName(url, 'resource') as PerformanceResourceTiming[];
    const timing = entries[entries.length - 1];

    const requestTiming: RequestTiming = {
      url,
      method: options?.method || 'GET',
      status: response.status,
      startTime,
      endTime,
      duration: endTime - startTime,
      size: 0, // Will be estimated from transferSize
      cached: false,
    };

    if (timing) {
      requestTiming.dnsLookup = timing.domainLookupEnd - timing.domainLookupStart;
      requestTiming.tcpConnection = timing.connectEnd - timing.connectStart;
      requestTiming.tlsHandshake = timing.secureConnectionStart > 0
        ? timing.connectEnd - timing.secureConnectionStart
        : undefined;
      requestTiming.requestSent = timing.requestStart - timing.connectEnd;
      requestTiming.serverProcessing = timing.responseStart - timing.requestStart;
      requestTiming.contentTransfer = timing.responseEnd - timing.responseStart;
      requestTiming.size = timing.transferSize;
      requestTiming.cached = timing.transferSize === 0;
    }

    return requestTiming;
  } catch (_error) {
    const endTime = performance.now();
    return {
      url,
      method: options?.method || 'GET',
      status: 0,
      startTime,
      endTime,
      duration: endTime - startTime,
      size: 0,
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ========================================
// Export singleton instance
// ========================================

export const slowRequestTracker = new SlowRequestTracker();

export default SlowRequestTracker;
