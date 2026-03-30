/**
 * API Response Tracker
 *
 * Tracks API responses and identifies performance issues
 */

import {
  APIRequest,
  APIAnalysis,
  APIIssueType,
  APIIssue,
  APIRecommendation,
  APIStatistics,
  ErrorRateAnalysis,
  Severity,
  SeverityLevel,
  RootCauseAnalysisConfig,
  DEFAULT_CONFIG
} from './types';

// Re-export types for external use
export type { APIRequest } from './types';

// ============================================================================
// API Tracker Class
// ============================================================================

export class APITracker {
  private config: RootCauseAnalysisConfig;
  private requestHistory: APIRequest[] = [];
  private errorHistory: Array<{ timestamp: number; statusCode: number; endpoint: string }> = [];

  constructor(config: Partial<RootCauseAnalysisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Request Tracking
  // ============================================================================

  /**
   * Track an API request
   */
  trackRequest(request: Omit<APIRequest, 'id' | 'issues' | 'timestamp'>): APIRequest {
    const trackedRequest: APIRequest = {
      id: this.generateRequestId(),
      ...request,
      timestamp: Date.now(),
      issues: this.detectIssues(request)
    };

    // Add to history
    this.requestHistory.push(trackedRequest);
    this.pruneHistory();

    // Track errors
    if (this.isError(request.statusCode)) {
      this.errorHistory.push({
        timestamp: trackedRequest.timestamp,
        statusCode: request.statusCode,
        endpoint: request.endpoint
      });
    }

    return trackedRequest;
  }

  /**
   * Track multiple requests in batch
   */
  trackRequests(requests: Array<Omit<APIRequest, 'id' | 'issues' | 'timestamp'>>): APIRequest[] {
    return requests.map(r => this.trackRequest(r));
  }

  // ============================================================================
  // Issue Detection
  // ============================================================================

  /**
   * Detect issues in an API request
   */
  private detectIssues(request: Omit<APIRequest, 'id' | 'issues' | 'timestamp'>): APIIssueType[] {
    const issues: APIIssueType[] = [];

    // Check for slow response
    if (request.duration > this.config.api.slowRequestThreshold) {
      issues.push('slow-response');
    }

    // Check for timeout
    if (request.duration > this.config.api.timeoutThreshold) {
      issues.push('timeout');
    }

    // Check for server error (5xx)
    if (request.statusCode >= 500 && request.statusCode < 600) {
      issues.push('server-error');
    }

    // Check for client error (4xx)
    if (request.statusCode >= 400 && request.statusCode < 500) {
      issues.push('client-error');
    }

    // Check for rate limit (429)
    if (request.statusCode === 429) {
      issues.push('rate-limit');
    }

    // Check for connection error (0 or negative duration)
    if (request.duration <= 0) {
      issues.push('connection-error');
    }

    // Check for large payload
    if (request.payloadSize && request.payloadSize > this.config.api.maxPayloadSize) {
      issues.push('large-payload');
    }

    // Check for large response
    if (request.responseSize && request.responseSize > this.config.api.maxPayloadSize) {
      issues.push('large-payload');
    }

    // Check for cache miss
    if (request.cacheStatus === 'miss') {
      issues.push('caching-miss');
    }

    return issues;
  }

  /**
   * Check if status code is an error
   */
  private isError(statusCode: number): boolean {
    return statusCode >= 400 || statusCode === 0;
  }

  // ============================================================================
  // Analysis
  // ============================================================================

  /**
   * Analyze all tracked requests
   */
  analyze(): APIAnalysis {
    const slowRequests = this.getSlowRequests();
    const requestStatistics = this.calculateStatistics();
    const criticalIssues = this.identifyCriticalIssues();
    const errorRateAnalysis = this.calculateErrorRate();
    const recommendations = this.generateRecommendations();

    return {
      slowRequests,
      requestStatistics,
      criticalIssues,
      errorRateAnalysis,
      recommendations
    };
  }

  /**
   * Get slow requests
   */
  getSlowRequests(): APIRequest[] {
    return this.requestHistory
      .filter(r => r.duration > this.config.api.slowRequestThreshold)
      .sort((a, b) => b.duration - a.duration);
  }

  /**
   * Calculate request statistics
   */
  private calculateStatistics(): APIStatistics {
    const requests = this.requestHistory;
    const slowRequests = requests.filter(r => r.duration > this.config.api.slowRequestThreshold);

    // Requests by endpoint
    const requestsByEndpoint = new Map<string, number>();
    requests.forEach(r => {
      requestsByEndpoint.set(r.endpoint, (requestsByEndpoint.get(r.endpoint) || 0) + 1);
    });

    // Requests by status code
    const requestsByStatusCode = new Map<number, number>();
    requests.forEach(r => {
      requestsByStatusCode.set(r.statusCode, (requestsByStatusCode.get(r.statusCode) || 0) + 1);
    });

    // Requests by issue type
    const requestsByIssueType = new Map<APIIssueType, number>();
    requests.forEach(r => {
      r.issues.forEach(issue => {
        requestsByIssueType.set(issue, (requestsByIssueType.get(issue) || 0) + 1);
      });
    });

    // Top slow endpoints
    const endpointDurations = new Map<string, { total: number; count: number }>();
    requests.forEach(r => {
      if (r.duration > this.config.api.slowRequestThreshold) {
        const data = endpointDurations.get(r.endpoint) || { total: 0, count: 0 };
        data.total += r.duration;
        data.count += 1;
        endpointDurations.set(r.endpoint, data);
      }
    });

    const topSlowEndpoints: APIRequest[] = [];
    endpointDurations.forEach((data, endpoint) => {
      topSlowEndpoints.push({
        id: `endpoint-${endpoint}`,
        endpoint,
        method: 'GET',
        duration: data.total / data.count,
        statusCode: 0,
        timestamp: Date.now(),
        issues: ['slow-response']
      } as APIRequest);
    });

    // Calculate error rate
    const errorCount = requests.filter(r => this.isError(r.statusCode)).length;
    const errorRate = requests.length > 0 ? errorCount / requests.length : 0;

    // Calculate average payload size
    const payloads = requests.filter(r => r.payloadSize !== undefined);
    const averagePayloadSize = payloads.length > 0
      ? payloads.reduce((sum, r) => sum + (r.payloadSize || 0), 0) / payloads.length
      : 0;

    return {
      totalRequests: requests.length,
      averageDuration: requests.length > 0
        ? requests.reduce((sum, r) => sum + r.duration, 0) / requests.length
        : 0,
      slowRequestThreshold: this.config.api.slowRequestThreshold,
      requestsByEndpoint,
      requestsByStatusCode,
      requestsByIssueType,
      topSlowEndpoints: topSlowEndpoints.sort((a, b) => b.duration - a.duration).slice(0, 10),
      errorRate,
      averagePayloadSize
    };
  }

  /**
   * Identify critical issues
   */
  private identifyCriticalIssues(): APIIssue[] {
    const issues: APIIssue[] = [];
    const issueMap = new Map<APIIssueType, APIRequest[]>();

    // Group requests by issue type
    this.requestHistory.forEach(request => {
      request.issues.forEach(issueType => {
        if (!issueMap.has(issueType)) {
          issueMap.set(issueType, []);
        }
        issueMap.get(issueType)!.push(request);
      });
    });

    // Create issue objects
    issueMap.forEach((affectedRequests, type) => {
      const severity = this.calculateIssueSeverity(type, affectedRequests);

      issues.push({
        id: `issue-${type}-${Date.now()}`,
        type,
        severity,
        description: this.getIssueDescription(type, affectedRequests),
        affectedRequests,
        endpoint: this.getMostAffectedEndpoint(affectedRequests),
        impact: this.calculateImpact(type, affectedRequests)
      });
    });

    // Sort by severity
    return issues.sort((a, b) => b.severity.score - a.severity.score);
  }

  /**
   * Calculate error rate analysis
   */
  private calculateErrorRate(): ErrorRateAnalysis {
    const requests = this.requestHistory;
    const now = Date.now();

    // Error rate by endpoint
    const errorRateByEndpoint = new Map<string, number>();
    const endpointCounts = new Map<string, { total: number; errors: number }>();

    requests.forEach(r => {
      const data = endpointCounts.get(r.endpoint) || { total: 0, errors: 0 };
      data.total++;
      if (this.isError(r.statusCode)) {
        data.errors++;
      }
      endpointCounts.set(r.endpoint, data);
    });

    endpointCounts.forEach((data, endpoint) => {
      errorRateByEndpoint.set(endpoint, data.errors / data.total);
    });

    // Error rate by status code
    const errorRateByStatus = new Map<number, number>();
    const statusCounts = new Map<number, number>();

    requests.forEach(r => {
      if (this.isError(r.statusCode)) {
        statusCounts.set(r.statusCode, (statusCounts.get(r.statusCode) || 0) + 1);
      }
    });

    statusCounts.forEach((count, status) => {
      errorRateByStatus.set(status, count / requests.length);
    });

    // Calculate overall error rate
    const errorCount = requests.filter(r => this.isError(r.statusCode)).length;
    const overallErrorRate = requests.length > 0 ? errorCount / requests.length : 0;

    // Detect trend
    const recentErrors = this.errorHistory.filter(e => now - e.timestamp < 300000); // 5 minutes
    const olderErrors = this.errorHistory.filter(e => {
      const age = now - e.timestamp;
      return age >= 300000 && age < 600000; // 5-10 minutes ago
    });

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (recentErrors.length > olderErrors.length * 1.5) {
      trend = 'increasing';
    } else if (recentErrors.length < olderErrors.length * 0.5) {
      trend = 'decreasing';
    }

    // Detect spike
    const spikeDetected = trend === 'increasing' && overallErrorRate > this.config.api.errorRateThreshold * 2;

    return {
      overallErrorRate,
      errorRateByEndpoint,
      errorRateByStatus,
      trend,
      spikeDetected
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(): APIRecommendation[] {
    const recommendations: APIRecommendation[] = [];
    const issues = this.identifyCriticalIssues();
    const errorAnalysis = this.calculateErrorRate();

    issues.forEach(issue => {
      const recommendation = this.createRecommendation(issue);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    });

    // Check for error rate spike
    if (errorAnalysis.spikeDetected) {
      recommendations.push({
        id: `rec-error-spike-${Date.now()}`,
        type: 'server-error',
        severity: {
          level: 'critical',
          score: 95,
          label: '🔴 Critical - Error rate spike detected'
        },
        title: 'Address Error Rate Spike',
        description: `Error rate has spiked to ${(errorAnalysis.overallErrorRate * 100).toFixed(2)}%. Immediate investigation required.`,
        actionItems: [
          'Check server logs for recent errors',
          'Verify database connectivity',
          'Check external service dependencies',
          'Review recent deployments'
        ],
        estimatedImpact: 'Reduce error rate to normal levels',
        complexity: 'medium',
        estimatedTime: '1-4 hours'
      });
    }

    return recommendations.sort((a, b) => b.severity.score - a.severity.score);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Calculate issue severity
   */
  private calculateIssueSeverity(type: APIIssueType, requests: APIRequest[]): Severity {
    const avgDuration = requests.reduce((sum, r) => sum + r.duration, 0) / requests.length;
    const count = requests.length;
    const errorCount = requests.filter(r => this.isError(r.statusCode)).length;

    // Base severity by type
    const typeSeverity: Record<APIIssueType, SeverityLevel> = {
      'server-error': 'critical',
      'client-error': 'high',
      'rate-limit': 'high',
      'timeout': 'high',
      'slow-response': 'medium',
      'connection-error': 'high',
      'large-payload': 'medium',
      'caching-miss': 'low'
    };

    const level = typeSeverity[type] || 'low';
    let score = 0;

    // Calculate score based on impact
    switch (level) {
      case 'critical':
        score = 80 + Math.min(errorCount * 5, 20);
        break;
      case 'high':
        score = 60 + Math.min(count * 2, 25);
        break;
      case 'medium':
        score = 40 + Math.min(count, 20);
        break;
      case 'low':
        score = 20 + Math.min(count, 15);
        break;
      default:
        score = 10;
    }

    // Adjust for average duration
    if (avgDuration > 5000) {
      score = Math.min(score + 10, 100);
    }

    // Adjust for repeated timeouts
    if (type === 'timeout' && count > 5) {
      score = Math.min(score + 15, 100);
    }

    return { level, score: Math.min(score, 100), label: this.getSeverityLabel(level) };
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
      info: 'ℹ️ Info - For awareness'
    };
    return labels[level];
  }

  /**
   * Get issue description
   */
  private getIssueDescription(type: APIIssueType, requests: APIRequest[]): string {
    const avgDuration = requests.reduce((sum, r) => sum + r.duration, 0) / requests.length;

    const descriptions: Record<APIIssueType, string> = {
      'server-error': `${requests.length} server errors (5xx) detected`,
      'client-error': `${requests.length} client errors (4xx) detected`,
      'rate-limit': `${requests.length} requests hit rate limits`,
      'timeout': `${requests.length} requests timed out`,
      'slow-response': `${requests.length} requests exceed slow threshold`,
      'connection-error': `${requests.length} connection errors detected`,
      'large-payload': `${requests.length} requests have large payloads`,
      'caching-miss': `${requests.length} cache misses detected`
    };
    return descriptions[type];
  }

  /**
   * Calculate impact
   */
  private calculateImpact(type: APIIssueType, requests: APIRequest[]): string {
    const avgDuration = requests.reduce((sum, r) => sum + r.duration, 0) / requests.length;
    const totalDuration = requests.reduce((sum, r) => sum + r.duration, 0);

    const impacts: Record<APIIssueType, string> = {
      'server-error': `${requests.length} failures, potential service disruption`,
      'client-error': `${requests.length} errors, possible API misuse`,
      'rate-limit': `${requests.length} requests blocked, rate limit needs adjustment`,
      'timeout': `${requests.length} timeouts, average duration: ${avgDuration.toFixed(0)}ms`,
      'slow-response': `Average duration: ${avgDuration.toFixed(0)}ms, Total: ${(totalDuration / 1000).toFixed(2)}s`,
      'connection-error': `${requests.length} connection failures, network or server issue`,
      'large-payload': `Average payload: ${Math.round(this.calculateAveragePayload(requests))} bytes`,
      'caching-miss': `${requests.length} missed caching opportunities`
    };
    return impacts[type];
  }

  /**
   * Calculate average payload size
   */
  private calculateAveragePayload(requests: APIRequest[]): number {
    const withPayload = requests.filter(r => r.payloadSize !== undefined || r.responseSize !== undefined);
    if (withPayload.length === 0) return 0;
    return withPayload.reduce((sum, r) => sum + (r.payloadSize || r.responseSize || 0), 0) / withPayload.length;
  }

  /**
   * Get most affected endpoint
   */
  private getMostAffectedEndpoint(requests: APIRequest[]): string {
    const endpointCounts = new Map<string, number>();
    requests.forEach(r => {
      endpointCounts.set(r.endpoint, (endpointCounts.get(r.endpoint) || 0) + 1);
    });

    let maxEndpoint = '';
    let maxCount = 0;
    endpointCounts.forEach((count, endpoint) => {
      if (count > maxCount) {
        maxCount = count;
        maxEndpoint = endpoint;
      }
    });

    return maxEndpoint;
  }

  /**
   * Create recommendation
   */
  private createRecommendation(issue: APIIssue): APIRecommendation | null {
    const templates: Record<APIIssueType, () => APIRecommendation> = {
      'server-error': () => ({
        id: `rec-server-error-${Date.now()}`,
        type: 'server-error',
        severity: issue.severity,
        title: 'Fix Server Errors',
        description: 'Server errors indicate application or infrastructure issues.',
        actionItems: [
          'Review server logs for error details',
          'Check database connectivity and performance',
          'Verify external service availability',
          'Review recent code changes'
        ],
        estimatedImpact: 'Restore service availability',
        complexity: 'medium',
        estimatedTime: '2-6 hours'
      }),

      'client-error': () => ({
        id: `rec-client-error-${Date.now()}`,
        type: 'client-error',
        severity: issue.severity,
        title: 'Fix Client Errors',
        description: 'Client errors indicate invalid requests or API misuse.',
        actionItems: [
          'Validate request parameters on client side',
          'Review API documentation and usage',
          'Implement proper error handling',
          'Add request validation middleware'
        ],
        estimatedImpact: 'Reduce error rate and improve UX',
        complexity: 'low',
        estimatedTime: '1-3 hours'
      }),

      'rate-limit': () => ({
        id: `rec-rate-limit-${Date.now()}`,
        type: 'rate-limit',
        severity: issue.severity,
        title: 'Address Rate Limiting',
        description: 'Requests are being rate-limited, need to adjust strategy.',
        actionItems: [
          'Implement request batching',
          'Add exponential backoff for retries',
          'Review rate limit quota',
          'Consider caching responses'
        ],
        estimatedImpact: 'Prevent request blocking',
        complexity: 'medium',
        estimatedTime: '2-4 hours'
      }),

      'timeout': () => ({
        id: `rec-timeout-${Date.now()}`,
        type: 'timeout',
        severity: issue.severity,
        title: 'Address Request Timeouts',
        description: 'Requests are timing out, indicating slow responses.',
        actionItems: [
          'Increase timeout threshold if appropriate',
          'Optimize slow endpoints',
          'Add retry logic with backoff',
          'Check for network issues'
        ],
        estimatedImpact: 'Improve reliability and responsiveness',
        complexity: 'medium',
        estimatedTime: '2-4 hours'
      }),

      'slow-response': () => ({
        id: `rec-slow-response-${Date.now()}`,
        type: 'slow-response',
        severity: issue.severity,
        title: 'Optimize Slow Endpoints',
        description: 'Endpoints are responding slowly, need optimization.',
        actionItems: [
          'Profile endpoint performance',
          'Add database indexes',
          'Implement response caching',
          'Use pagination for large datasets'
        ],
        estimatedImpact: '30-70% faster response times',
        complexity: 'medium',
        estimatedTime: '3-6 hours'
      }),

      'connection-error': () => ({
        id: `rec-connection-error-${Date.now()}`,
        type: 'connection-error',
        severity: issue.severity,
        title: 'Fix Connection Errors',
        description: 'Connection errors indicate network or server issues.',
        actionItems: [
          'Check server availability and health',
          'Verify DNS resolution',
          'Review firewall and security rules',
          'Implement connection retry logic'
        ],
        estimatedImpact: 'Restore connectivity',
        complexity: 'medium',
        estimatedTime: '1-4 hours'
      }),

      'large-payload': () => ({
        id: `rec-large-payload-${Date.now()}`,
        type: 'large-payload',
        severity: issue.severity,
        title: 'Optimize Payload Size',
        description: 'Requests or responses have large payloads.',
        actionItems: [
          'Implement compression (gzip, brotli)',
          'Use pagination for large datasets',
          'Remove unnecessary fields',
          'Consider using more efficient data formats'
        ],
        estimatedImpact: '40-80% reduction in data transfer',
        complexity: 'low',
        estimatedTime: '2-3 hours'
      }),

      'caching-miss': () => ({
        id: `rec-caching-miss-${Date.now()}`,
        type: 'caching-miss',
        severity: issue.severity,
        title: 'Implement Caching',
        description: 'Responses are not being cached effectively.',
        actionItems: [
          'Add response caching headers',
          'Implement server-side caching',
          'Use CDN for static assets',
          'Cache frequently accessed data'
        ],
        estimatedImpact: '50-90% faster cached responses',
        complexity: 'low',
        estimatedTime: '1-3 hours'
      })
    };

    const template = templates[issue.type];
    return template ? template() : null;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Prune history to max entries
   */
  private pruneHistory(): void {
    if (this.requestHistory.length > this.config.history.maxEntries) {
      this.requestHistory = this.requestHistory.slice(-this.config.history.maxEntries);
    }

    // Clean old error history
    const cutoff = Date.now() - (this.config.history.retentionDays * 24 * 60 * 60 * 1000);
    this.errorHistory = this.errorHistory.filter(e => e.timestamp > cutoff);
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get all tracked requests
   */
  getHistory(): APIRequest[] {
    return [...this.requestHistory];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.requestHistory = [];
    this.errorHistory = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RootCauseAnalysisConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RootCauseAnalysisConfig {
    return { ...this.config };
  }

  /**
   * Get requests by endpoint
   */
  getRequestsByEndpoint(endpoint: string): APIRequest[] {
    return this.requestHistory.filter(r => r.endpoint === endpoint);
  }

  /**
   * Get requests by status code
   */
  getRequestsByStatusCode(statusCode: number): APIRequest[] {
    return this.requestHistory.filter(r => r.statusCode === statusCode);
  }

  /**
   * Get requests by issue type
   */
  getRequestsByIssueType(issueType: APIIssueType): APIRequest[] {
    return this.requestHistory.filter(r => r.issues.includes(issueType));
  }
}
