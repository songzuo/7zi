/**
 * Root Cause Analysis Module
 * 性能问题根因分析
 * 
 * 功能：
 * - 检测常见性能瓶颈（内存泄漏、数据库慢查询、缓存命中率低）
 * - 生成诊断建议
 * - 自动关联相关指标
 */

import {
  BottleneckDetector,
  bottleneckDetector,
  type Bottleneck,
  type BottleneckAnalysis,
  type BottleneckRecommendation,
  type PerformanceProfile,
} from './root-cause/bottleneck-detector';

import {
  SlowRequestTracker,
  slowRequestTracker,
  type RequestTiming,
  type SlowRequestAnalysis,
  type RequestBottleneck,
} from './root-cause/slow-request-tracker';

import {
  PerformanceWaterfall,
  performanceWaterfall,
  type ResourceTiming,
  type WaterfallAnalysis,
} from './root-cause/performance-waterfall';

// ========================================
// Types
// ========================================

export interface MemoryLeakIndicator {
  type: 'memory-leak';
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string;
  metrics: {
    heapGrowthRate: number; // bytes per second
    gcFrequency: number;
    memoryTrend: 'increasing' | 'stable' | 'decreasing';
  };
  suspectedCauses: string[];
  recommendations: string[];
}

export interface SlowQueryIndicator {
  type: 'slow-query';
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string;
  metrics: {
    averageQueryTime: number;
    slowQueryCount: number;
    totalQueryTime: number;
    queriesPerSecond: number;
  };
  suspectedCauses: string[];
  recommendations: string[];
}

export interface CacheHitRateIndicator {
  type: 'cache-miss';
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string;
  metrics: {
    hitRate: number;
    missRate: number;
    totalRequests: number;
    averageLatency: number;
  };
  suspectedCauses: string[];
  recommendations: string[];
}

export type PerformanceIndicator = 
  | MemoryLeakIndicator 
  | SlowQueryIndicator 
  | CacheHitRateIndicator
  | Bottleneck;

export interface RootCauseAnalysis {
  timestamp: Date;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  indicators: PerformanceIndicator[];
  criticalIssues: PerformanceIndicator[];
  warnings: PerformanceIndicator[];
  correlations: MetricCorrelation[];
  diagnosis: DiagnosisReport;
  actionPlan: ActionItem[];
  summary: string;
}

export interface MetricCorrelation {
  metrics: [string, string];
  correlationCoefficient: number; // -1 to 1
  relationship: 'positive' | 'negative' | 'none';
  significance: 'strong' | 'moderate' | 'weak';
  description: string;
}

export interface DiagnosisReport {
  primaryIssue: string;
  rootCause: string;
  contributingFactors: string[];
  affectedComponents: string[];
  timeline: DiagnosisEvent[];
}

export interface DiagnosisEvent {
  timestamp: Date;
  event: string;
  impact: 'low' | 'medium' | 'high';
  relatedMetric?: string;
}

export interface ActionItem {
  priority: 'p0' | 'p1' | 'p2' | 'p3';
  title: string;
  description: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  category: 'immediate' | 'short-term' | 'long-term';
  assignee?: string;
  dueBy?: Date;
}

// ========================================
// Root Cause Analyzer Class
// ========================================

export class RootCauseAnalyzer {
  private bottleneckDetector: BottleneckDetector;
  private slowRequestTracker: SlowRequestTracker;
  private performanceWaterfall: PerformanceWaterfall;
  
  private metricHistory: Map<string, number[]> = new Map();
  private maxHistoryLength = 100;

  constructor() {
    this.bottleneckDetector = bottleneckDetector;
    this.slowRequestTracker = slowRequestTracker;
    this.performanceWaterfall = performanceWaterfall;
  }

  /**
   * Analyze performance profile and identify root causes
   */
  analyze(profile: PerformanceProfile): RootCauseAnalysis {
    const indicators: PerformanceIndicator[] = [];
    
    // Run bottleneck detection
    const bottleneckAnalysis = this.bottleneckDetector.analyze(profile);
    indicators.push(...bottleneckAnalysis.bottlenecks);

    // Check for memory leaks
    const memoryIndicator = this.detectMemoryLeak(profile);
    if (memoryIndicator) {
      indicators.push(memoryIndicator);
    }

    // Check for slow queries (simulated from slow requests)
    const slowQueryIndicator = this.detectSlowQueries(profile);
    if (slowQueryIndicator) {
      indicators.push(slowQueryIndicator);
    }

    // Check for cache issues
    const cacheIndicator = this.detectCacheIssues(profile);
    if (cacheIndicator) {
      indicators.push(cacheIndicator);
    }

    // Calculate correlations between metrics
    const correlations = this.calculateCorrelations(profile);

    // Categorize issues
    const criticalIssues = indicators.filter(
      i => 'severity' in i && i.severity === 'critical'
    );
    const warnings = indicators.filter(
      i => 'severity' in i && (i.severity === 'high' || i.severity === 'medium')
    );

    // Generate diagnosis
    const diagnosis = this.generateDiagnosis(indicators, correlations);
    
    // Create action plan
    const actionPlan = this.generateActionPlan(indicators, diagnosis);

    // Determine overall health
    const overallHealth = this.determineHealth(criticalIssues.length, warnings.length);

    // Generate summary
    const summary = this.generateSummary(indicators, overallHealth);

    return {
      timestamp: new Date(),
      overallHealth,
      indicators,
      criticalIssues,
      warnings,
      correlations,
      diagnosis,
      actionPlan,
      summary,
    };
  }

  /**
   * Detect memory leak indicators
   */
  private detectMemoryLeak(profile: PerformanceProfile): MemoryLeakIndicator | null {
    // Track memory over time
    this.recordMetric('memory', profile.memoryUsed);
    const memoryHistory = this.metricHistory.get('memory') || [];

    if (memoryHistory.length < 5) {
      return null; // Need more data points
    }

    // Calculate memory growth rate
    const growthRate = this.calculateGrowthRate(memoryHistory);
    const trend = this.determineTrend(memoryHistory);

    // Memory leak detection criteria
    const isIncreasing = trend === 'increasing';
    const highGrowthRate = growthRate > 1000; // More than 1KB/s growth
    const highMemoryUsage = profile.memoryUsed / profile.memoryLimit > 0.7;

    if (isIncreasing && (highGrowthRate || highMemoryUsage)) {
      const severity = this.determineMemorySeverity(growthRate, profile.memoryUsed / profile.memoryLimit);
      
      return {
        type: 'memory-leak',
        severity,
        evidence: `Memory usage trending upward at ${this.formatBytes(growthRate)}/s over ${memoryHistory.length} samples`,
        metrics: {
          heapGrowthRate: growthRate,
          gcFrequency: 0, // Would need actual GC events
          memoryTrend: trend,
        },
        suspectedCauses: [
          'Unremoved event listeners',
          'Closure references holding objects',
          'Detached DOM nodes',
          'Timer/interval not cleared',
          'Large object caching without eviction',
        ],
        recommendations: [
          'Review event listener cleanup in useEffect/componentWillUnmount',
          'Check for closures capturing large objects',
          'Use WeakMap/WeakSet for cached references',
          'Clear timers and intervals on component unmount',
          'Profile memory with Chrome DevTools heap snapshots',
        ],
      };
    }

    return null;
  }

  /**
   * Detect slow database/API queries
   */
  private detectSlowQueries(profile: PerformanceProfile): SlowQueryIndicator | null {
    if (profile.slowRequests === 0 && profile.averageResponseTime < 500) {
      return null;
    }

    const severity = this.determineQuerySeverity(
      profile.slowRequests,
      profile.averageResponseTime
    );

    const estimatedQps = profile.requestCount > 0 
      ? 1000 / profile.averageResponseTime 
      : 0;

    return {
      type: 'slow-query',
      severity,
      evidence: `${profile.slowRequests} slow requests detected with average response time of ${profile.averageResponseTime}ms`,
      metrics: {
        averageQueryTime: profile.averageResponseTime,
        slowQueryCount: profile.slowRequests,
        totalQueryTime: profile.requestCount * profile.averageResponseTime,
        queriesPerSecond: estimatedQps,
      },
      suspectedCauses: [
        'Missing database indexes',
        'N+1 query problem',
        'Large result sets without pagination',
        'Inefficient query patterns',
        'Database connection pool exhaustion',
        'Network latency between app and database',
      ],
      recommendations: [
        'Add indexes on frequently queried columns',
        'Implement query batching to avoid N+1',
        'Add pagination to large queries',
        'Use query explain plan to identify bottlenecks',
        'Implement connection pooling',
        'Consider read replicas for heavy read workloads',
      ],
    };
  }

  /**
   * Detect cache performance issues
   */
  private detectCacheIssues(profile: PerformanceProfile): CacheHitRateIndicator | null {
    // Estimate cache performance from request patterns
    // This is a simplified model - real implementation would use actual cache metrics
    const estimatedHitRate = this.estimateCacheHitRate(profile);
    const estimatedMissRate = 1 - estimatedHitRate;

    if (estimatedHitRate < 0.8) {
      const severity = estimatedHitRate < 0.5 ? 'critical' 
        : estimatedHitRate < 0.7 ? 'high' 
        : 'medium';

      return {
        type: 'cache-miss',
        severity,
        evidence: `Estimated cache hit rate: ${(estimatedHitRate * 100).toFixed(1)}% (target: >80%)`,
        metrics: {
          hitRate: estimatedHitRate,
          missRate: estimatedMissRate,
          totalRequests: profile.requestCount,
          averageLatency: profile.averageResponseTime,
        },
        suspectedCauses: [
          'Cache invalidation too aggressive',
          'Cache key strategy not optimal',
          'Insufficient cache size',
          'No cache warming strategy',
          'Cache TTL too short',
        ],
        recommendations: [
          'Review cache invalidation strategy',
          'Optimize cache key generation',
          'Increase cache size or use LRU eviction',
          'Implement cache warming on startup',
          'Adjust TTL based on data freshness requirements',
        ],
      };
    }

    return null;
  }

  /**
   * Calculate correlations between metrics
   */
  private calculateCorrelations(profile: PerformanceProfile): MetricCorrelation[] {
    const correlations: MetricCorrelation[] = [];

    // Correlation between transfer size and LCP
    correlations.push(this.createCorrelation(
      'totalTransferSize',
      'largestContentfulPaint',
      profile.totalTransferSize,
      profile.largestContentfulPaint,
      'Larger transfer sizes correlate with slower LCP'
    ));

    // Correlation between request count and TTI
    correlations.push(this.createCorrelation(
      'requestCount',
      'timeToInteractive',
      profile.requestCount,
      profile.timeToInteractive,
      'More requests delay time to interactive'
    ));

    // Correlation between DOM nodes and FID
    correlations.push(this.createCorrelation(
      'domNodes',
      'firstInputDelay',
      profile.domNodes,
      profile.firstInputDelay,
      'Larger DOM can increase input delay'
    ));

    // Correlation between script time and LCP
    correlations.push(this.createCorrelation(
      'scriptExecutionTime',
      'largestContentfulPaint',
      profile.scriptExecutionTime,
      profile.largestContentfulPaint,
      'Blocking scripts delay content paint'
    ));

    return correlations;
  }

  /**
   * Generate diagnosis report
   */
  private generateDiagnosis(
    indicators: PerformanceIndicator[],
    correlations: MetricCorrelation[]
  ): DiagnosisReport {
    // Find primary issue
    const criticalIndicators = indicators.filter(
      i => 'severity' in i && i.severity === 'critical'
    );
    
    const primaryIssue = criticalIndicators.length > 0
      ? this.formatIndicatorTitle(criticalIndicators[0])
      : indicators.length > 0
        ? this.formatIndicatorTitle(indicators[0])
        : 'No significant issues detected';

    // Determine root cause
    const rootCause = this.determineRootCause(indicators, correlations);

    // Get contributing factors
    const contributingFactors = indicators
      .slice(1, 4)
      .map(i => this.formatIndicatorTitle(i));

    // Identify affected components
    const affectedComponents = this.identifyAffectedComponents(indicators);

    // Create timeline
    const timeline: DiagnosisEvent[] = indicators.map(i => ({
      timestamp: new Date(),
      event: this.formatIndicatorTitle(i),
      impact: 'severity' in i && i.severity === 'critical' ? 'high' 
        : 'severity' in i && i.severity === 'high' ? 'medium' 
        : 'low',
      relatedMetric: 'type' in i ? i.type : undefined,
    }));

    return {
      primaryIssue,
      rootCause,
      contributingFactors,
      affectedComponents,
      timeline,
    };
  }

  /**
   * Generate action plan
   */
  private generateActionPlan(
    indicators: PerformanceIndicator[],
    diagnosis: DiagnosisReport
  ): ActionItem[] {
    const actions: ActionItem[] = [];

    for (const indicator of indicators) {
      if ('recommendations' in indicator && Array.isArray(indicator.recommendations)) {
        const priority = this.determinePriority(indicator);
        
        indicator.recommendations.slice(0, 3).forEach((rec, index) => {
          actions.push({
            priority,
            title: rec,
            description: `Address ${this.formatIndicatorTitle(indicator)}`,
            estimatedImpact: indicator.severity === 'critical' ? 'high' 
              : indicator.severity === 'high' ? 'medium' 
              : 'low',
            effort: index === 0 ? 'low' : index === 1 ? 'medium' : 'high',
            category: priority === 'p0' ? 'immediate' 
              : priority === 'p1' ? 'short-term' 
              : 'long-term',
          });
        });
      }
    }

    // Sort by priority
    const priorityOrder = { p0: 0, p1: 1, p2: 2, p3: 3 };
    return actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  // ========================================
  // Helper Methods
  // ========================================

  private recordMetric(name: string, value: number): void {
    const history = this.metricHistory.get(name) || [];
    history.push(value);
    
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
    
    this.metricHistory.set(name, history);
  }

  private calculateGrowthRate(values: number[]): number {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    const timeSpan = values.length - 1; // Assuming 1 second between samples
    
    return (last - first) / timeSpan;
  }

  private determineTrend(values: number[]): 'increasing' | 'stable' | 'decreasing' {
    if (values.length < 3) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private determineMemorySeverity(growthRate: number, usageRatio: number): 'low' | 'medium' | 'high' | 'critical' {
    if (usageRatio > 0.9 || growthRate > 10000) return 'critical';
    if (usageRatio > 0.8 || growthRate > 5000) return 'high';
    if (usageRatio > 0.7 || growthRate > 1000) return 'medium';
    return 'low';
  }

  private determineQuerySeverity(slowCount: number, avgTime: number): 'low' | 'medium' | 'high' | 'critical' {
    if (slowCount > 10 || avgTime > 2000) return 'critical';
    if (slowCount > 5 || avgTime > 1000) return 'high';
    if (slowCount > 2 || avgTime > 500) return 'medium';
    return 'low';
  }

  private estimateCacheHitRate(profile: PerformanceProfile): number {
    // Simplified estimation based on request patterns
    // Real implementation would use actual cache metrics
    const avgResponseTime = profile.averageResponseTime;
    const requestCount = profile.requestCount;
    
    // Lower response times with higher request counts suggest better caching
    if (avgResponseTime < 100 && requestCount > 20) return 0.95;
    if (avgResponseTime < 200 && requestCount > 15) return 0.9;
    if (avgResponseTime < 300 && requestCount > 10) return 0.85;
    if (avgResponseTime < 500 && requestCount > 5) return 0.8;
    if (avgResponseTime < 800) return 0.7;
    return 0.5;
  }

  private createCorrelation(
    metric1: string,
    metric2: string,
    value1: number,
    value2: number,
    description: string
  ): MetricCorrelation {
    // Simplified correlation coefficient calculation
    // Real implementation would use actual statistical methods
    const normalized1 = Math.min(1, value1 / 1000);
    const normalized2 = Math.min(1, value2 / 5000);
    
    const coefficient = normalized1 * normalized2;
    
    let significance: 'strong' | 'moderate' | 'weak';
    if (Math.abs(coefficient) > 0.7) significance = 'strong';
    else if (Math.abs(coefficient) > 0.4) significance = 'moderate';
    else significance = 'weak';

    return {
      metrics: [metric1, metric2],
      correlationCoefficient: coefficient,
      relationship: coefficient > 0.1 ? 'positive' : coefficient < -0.1 ? 'negative' : 'none',
      significance,
      description,
    };
  }

  private determineHealth(criticalCount: number, warningCount: number): 'healthy' | 'degraded' | 'critical' {
    if (criticalCount > 0) return 'critical';
    if (warningCount > 2) return 'degraded';
    return 'healthy';
  }

  private formatIndicatorTitle(indicator: PerformanceIndicator): string {
    if ('name' in indicator) {
      return indicator.name;
    }
    if ('type' in indicator) {
      return indicator.type.split('-').map(
        word => word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    return 'Unknown Issue';
  }

  private determinePriority(indicator: PerformanceIndicator): 'p0' | 'p1' | 'p2' | 'p3' {
    if (!('severity' in indicator)) return 'p3';
    
    switch (indicator.severity) {
      case 'critical': return 'p0';
      case 'high': return 'p1';
      case 'medium': return 'p2';
      default: return 'p3';
    }
  }

  private determineRootCause(
    indicators: PerformanceIndicator[],
    correlations: MetricCorrelation[]
  ): string {
    // Look for strong correlations that might indicate root cause
    const strongCorrelations = correlations.filter(c => c.significance === 'strong');
    
    if (strongCorrelations.length > 0) {
      const corr = strongCorrelations[0];
      return `High correlation between ${corr.metrics[0]} and ${corr.metrics[1]} suggests a causal relationship`;
    }
    
    // Fall back to first critical indicator
    const critical = indicators.find(i => 'severity' in i && i.severity === 'critical');
    if (critical) {
      return `Primary cause: ${this.formatIndicatorTitle(critical)}`;
    }
    
    return 'Multiple factors contributing to performance degradation';
  }

  private identifyAffectedComponents(indicators: PerformanceIndicator[]): string[] {
    const components = new Set<string>();
    
    for (const indicator of indicators) {
      if ('type' in indicator) {
        switch (indicator.type) {
          case 'memory-leak':
            components.add('Memory Management');
            components.add('Event Handlers');
            break;
          case 'slow-query':
            components.add('Database Layer');
            components.add('API Layer');
            break;
          case 'cache-miss':
            components.add('Cache Layer');
            components.add('CDN');
            break;
          case 'network':
            components.add('Network Layer');
            components.add('Resource Loading');
            break;
          case 'render':
            components.add('Rendering Engine');
            components.add('UI Components');
            break;
          case 'script':
            components.add('JavaScript Runtime');
            components.add('Bundle Size');
            break;
          case 'dom':
            components.add('DOM Structure');
            components.add('Component Tree');
            break;
        }
      }
      if ('source' in indicator) {
        components.add(indicator.source);
      }
    }
    
    return Array.from(components);
  }

  private generateSummary(
    indicators: PerformanceIndicator[],
    health: 'healthy' | 'degraded' | 'critical'
  ): string {
    const criticalCount = indicators.filter(
      i => 'severity' in i && i.severity === 'critical'
    ).length;
    const highCount = indicators.filter(
      i => 'severity' in i && i.severity === 'high'
    ).length;

    if (health === 'healthy') {
      return 'System is healthy. No critical performance issues detected.';
    }

    if (health === 'critical') {
      return `Critical: ${criticalCount} critical issues and ${highCount} high-priority issues require immediate attention.`;
    }

    return `Degraded: ${highCount} high-priority issues detected. Performance optimization recommended.`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}

// ========================================
// Export singleton instance
// ========================================

export const rootCauseAnalyzer = new RootCauseAnalyzer();

export default RootCauseAnalyzer;

// Re-export related types and utilities
export {
  BottleneckDetector,
  bottleneckDetector,
  type Bottleneck,
  type BottleneckAnalysis,
  type BottleneckRecommendation,
  type PerformanceProfile,
} from './root-cause/bottleneck-detector';

export {
  SlowRequestTracker,
  slowRequestTracker,
  type RequestTiming,
  type SlowRequestAnalysis,
  type RequestBottleneck,
} from './root-cause/slow-request-tracker';

export {
  PerformanceWaterfall,
  performanceWaterfall,
  type ResourceTiming,
  type WaterfallAnalysis,
} from './root-cause/performance-waterfall';
