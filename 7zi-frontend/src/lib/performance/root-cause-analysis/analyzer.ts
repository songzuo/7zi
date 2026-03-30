/**
 * Root Cause Analyzer
 * 根因分析器（更新版 - 集成追踪器）
 */

import {
  PerformanceContext,
  RootCause,
  RootCauseCandidate,
  RootCauseAnalysisConfig,
  DEFAULT_ROOT_CAUSE_CONFIG,
  SlowQuery,
  SlowAPICall,
  RenderingMetrics,
} from './types';
import { DatabaseTracker, QueryIssue } from './database-tracker';
import { APITracker, APIIssue } from './api-tracker';

/**
 * RootCauseAnalyzer - 根因分析核心类
 * 集成数据库追踪器和 API 追踪器，提供完整的根因分析能力
 */
export class RootCauseAnalyzer {
  private config: RootCauseAnalysisConfig;
  private databaseTracker: DatabaseTracker;
  private apiTracker: APITracker;

  constructor(
    config: Partial<RootCauseAnalysisConfig> = {},
    databaseTracker?: DatabaseTracker,
    apiTracker?: APITracker
  ) {
    this.config = { ...DEFAULT_ROOT_CAUSE_CONFIG, ...config };
    this.databaseTracker = databaseTracker || new DatabaseTracker();
    this.apiTracker = apiTracker || new APITracker();
  }

  /**
   * Analyze root cause for a performance issue
   * 分析性能问题的根因
   */
  analyze(metric: string, value: number, context: PerformanceContext): RootCause {
    const candidates: RootCauseCandidate[] = [];

    // First, track all data so trackers have it
    if (context.slowQueries && context.slowQueries.length > 0) {
      for (const query of context.slowQueries) {
        this.databaseTracker.trackQuery(
          query.query,
          query.duration,
          query.rowCount,
          { table: query.table, type: query.type }
        );
      }
    }
    
    if (context.slowApis && context.slowApis.length > 0) {
      for (const api of context.slowApis) {
        this.apiTracker.trackApiCall(
          api.endpoint,
          api.method,
          api.duration,
          api.statusCode,
          { error: api.error, requestSize: api.requestSize, responseSize: api.responseSize }
        );
      }
    }

    // 检查数据库查询
    if (context.slowQueries && context.slowQueries.length > 0) {
      const dbCandidate = this.analyzeDatabaseIssues(context.slowQueries);
      if (dbCandidate) {
        candidates.push(dbCandidate);
      }
    }

    // 检查 API 调用
    if (context.slowApis && context.slowApis.length > 0) {
      const apiCandidate = this.analyzeApiIssues(context.slowApis);
      if (apiCandidate) {
        candidates.push(apiCandidate);
      }
    }

    // 检查渲染性能
    if (context.rendering) {
      const renderingCandidate = this.analyzeRenderingIssues(context.rendering);
      if (renderingCandidate) {
        candidates.push(renderingCandidate);
      }
    }

    // 检查资源加载
    if (context.resources) {
      const resourceCandidate = this.analyzeResources(context.resources);
      if (resourceCandidate) {
        candidates.push(resourceCandidate);
      }
    }

    // 检查网络
    if (context.network) {
      const networkCandidate = this.analyzeNetwork(context);
      if (networkCandidate) {
        candidates.push(networkCandidate);
      }
    }

    // 检查内存（如果有数据）
    if (context.memory) {
      const memoryCandidate = this.analyzeMemory(context.memory);
      if (memoryCandidate) {
        candidates.push(memoryCandidate);
      }
    }

    // 按严重程度和置信度排序
    candidates.sort((a, b) => {
      const severityScore = this.severityScore(b.severity) - this.severityScore(a.severity);
      if (severityScore !== 0) return severityScore;
      return b.confidence - a.confidence;
    });

    // 过滤低置信度的候选
    const filteredCandidates = candidates.filter(
      (c) => c.confidence >= this.config.minConfidence
    );

    // 限制候选数量
    const finalCandidates = filteredCandidates.slice(0, this.config.maxCandidates);

    return {
      metric,
      timestamp: context.timestamp,
      candidates: finalCandidates,
      primaryCause: finalCandidates.length > 0 ? finalCandidates[0] : null,
      analyzedAt: Date.now(),
      context,
    };
  }

  /**
   * Analyze database queries
   * 分析数据库查询
   */
  private analyzeDatabaseIssues(queries: SlowQuery[]): RootCauseCandidate | null {
    const issues = this.databaseTracker.identifyQueryIssues(queries);
    
    if (issues.length === 0) return null;

    // 找出最慢的查询
    const slowest = queries.reduce((a, b) => (a.duration > b.duration ? a : b));
    
    // 汇总问题
    const totalSlowQueries = queries.length;
    const avgDuration = queries.reduce((sum, q) => sum + q.duration, 0) / totalSlowQueries;
    const maxDuration = Math.max(...queries.map((q) => q.duration));

    // 确定严重程度
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (avgDuration > this.config.slowQueryThreshold * 3 || totalSlowQueries > 10) {
      severity = 'critical';
    } else if (avgDuration > this.config.slowQueryThreshold * 2 || totalSlowQueries > 5) {
      severity = 'high';
    } else if (avgDuration > this.config.slowQueryThreshold || totalSlowQueries > 2) {
      severity = 'medium';
    }

    // 计算置信度
    const confidence = Math.min(avgDuration / (this.config.slowQueryThreshold * 2.5), 1);

    // 生成建议
    const suggestedActions = new Set<string>();
    for (const issue of issues) {
      suggestedActions.add(issue.suggestion);
    }

    // 添加通用建议
    if (avgDuration > 2000) {
      suggestedActions.add('Review database indexing strategy');
      suggestedActions.add('Consider adding database connection pooling');
    }
    if (totalSlowQueries > 5) {
      suggestedActions.add('Check for N+1 query patterns');
      suggestedActions.add('Implement query result caching');
    }

    return {
      type: 'database',
      severity,
      confidence,
      description: `${totalSlowQueries} slow database queries detected (avg: ${avgDuration.toFixed(0)}ms, max: ${maxDuration.toFixed(0)}ms)`,
      details: {
        totalSlowQueries,
        avgDuration,
        maxDuration,
        slowestQuery: {
          query: slowest.query.substring(0, 200) + '...',
          duration: slowest.duration,
          type: slowest.type,
          rowCount: slowest.rowCount,
        },
        issues: issues.slice(0, 5), // 只显示前 5 个问题
      },
      suggestedActions: Array.from(suggestedActions),
      estimatedFixTime: this.estimateDatabaseFixTime(issues, avgDuration),
      relatedMetrics: ['LCP', 'FID', 'TTI', 'INP'],
    };
  }

  /**
   * Analyze API calls
   * 分析 API 调用
   */
  private analyzeApiIssues(apis: SlowAPICall[]): RootCauseCandidate | null {
    if (apis.length === 0) return null;
    
    const issues = this.apiTracker.identifyAPIIssues(apis);

    // 统计
    const totalSlowApis = apis.length;
    const avgDuration = apis.reduce((sum, a) => sum + a.duration, 0) / totalSlowApis;
    const errorCount = apis.filter((a) => a.statusCode >= 400 || a.error).length;
    const errorRate = errorCount / totalSlowApis;

    // 找出最慢的 API
    const slowestApi = apis.reduce((a, b) => (a.duration > b.duration ? a : b), apis[0]);

    // 确定严重程度
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (
      errorRate > 0.3 ||
      avgDuration > this.config.slowAPIThreshold * 5 ||
      totalSlowApis > 15
    ) {
      severity = 'critical';
    } else if (
      errorRate > 0.1 ||
      avgDuration > this.config.slowAPIThreshold * 3 ||
      totalSlowApis > 10
    ) {
      severity = 'high';
    } else if (
      errorRate > 0.05 ||
      avgDuration > this.config.slowAPIThreshold * 2 ||
      totalSlowApis > 5
    ) {
      severity = 'medium';
    } else if (avgDuration > this.config.slowAPIThreshold) {
      // Even with lower averages, if it's above threshold, at least medium
      severity = 'medium';
    }

    // 计算置信度
    const confidence = Math.min(avgDuration / (this.config.slowAPIThreshold * 2.5), 1);

    // 生成建议
    const suggestedActions = new Set<string>();
    for (const issue of issues) {
      suggestedActions.add(issue.suggestion);
    }

    // 添加通用建议
    if (avgDuration > 3000) {
      suggestedActions.add('Implement API response caching');
      suggestedActions.add('Consider implementing pagination for large datasets');
    }
    if (errorRate > 0.1) {
      suggestedActions.add('Review and improve error handling');
      suggestedActions.add('Implement retry logic with exponential backoff');
    }
    suggestedActions.add('Review API payload sizes and implement compression');
    suggestedActions.add('Monitor API performance trends and set up alerts');
    if (suggestedActions.size === 0) {
      suggestedActions.add('Analyze API response patterns and optimize endpoints');
      suggestedActions.add('Check network latency and server response times');
    }

    return {
      type: 'api',
      severity,
      confidence,
      description: `${totalSlowApis} slow API calls detected (avg: ${avgDuration.toFixed(0)}ms, errors: ${errorCount}, error rate: ${(errorRate * 100).toFixed(1)}%)`,
      details: {
        totalSlowApis,
        avgDuration,
        errorCount,
        errorRate,
        slowestApi: {
          endpoint: slowestApi.endpoint,
          method: slowestApi.method,
          duration: slowestApi.duration,
          statusCode: slowestApi.statusCode,
        },
        issues: issues.slice(0, 5),
      },
      suggestedActions: Array.from(suggestedActions),
      estimatedFixTime: this.estimateAPIFixTime(issues, avgDuration),
      relatedMetrics: ['LCP', 'FID', 'INP'],
    };
  }

  /**
   * Analyze rendering metrics
   * 分析渲染指标
   */
  private analyzeRenderingIssues(rendering: RenderingMetrics): RootCauseCandidate | null {
    const issues: string[] = [];

    if (rendering.longTasks > 10) {
      issues.push(`${rendering.longTasks} long tasks detected`);
    }

    if (rendering.totalBlockingTime > 300) {
      issues.push(`High total blocking time: ${rendering.totalBlockingTime.toFixed(0)}ms`);
    }

    if (rendering.largestContentfulPaint && rendering.largestContentfulPaint > 4000) {
      issues.push(`Slow LCP: ${rendering.largestContentfulPaint.toFixed(0)}ms`);
    }

    if (rendering.cumulativeLayoutShift && rendering.cumulativeLayoutShift > 0.25) {
      issues.push(`High CLS: ${rendering.cumulativeLayoutShift.toFixed(3)}`);
    }

    if (rendering.firstInputDelay && rendering.firstInputDelay > 100) {
      issues.push(`Poor FID: ${rendering.firstInputDelay.toFixed(0)}ms`);
    }

    if (issues.length === 0) return null;

    // 确定严重程度
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (
      rendering.longTasks > 50 ||
      rendering.totalBlockingTime > 1000 ||
      (rendering.largestContentfulPaint && rendering.largestContentfulPaint > 8000) ||
      (rendering.cumulativeLayoutShift && rendering.cumulativeLayoutShift > 0.5)
    ) {
      severity = 'critical';
    } else if (
      rendering.longTasks > 20 ||
      rendering.totalBlockingTime > 500 ||
      (rendering.largestContentfulPaint && rendering.largestContentfulPaint > 6000) ||
      (rendering.cumulativeLayoutShift && rendering.cumulativeLayoutShift > 0.35)
    ) {
      severity = 'high';
    } else if (
      rendering.longTasks > 10 ||
      rendering.totalBlockingTime > 300 ||
      (rendering.largestContentfulPaint && rendering.largestContentfulPaint > 4000) ||
      (rendering.cumulativeLayoutShift && rendering.cumulativeLayoutShift > 0.25)
    ) {
      severity = 'medium';
    }

    // 计算置信度
    const blockingTimeScore = Math.min(rendering.totalBlockingTime / 500, 1);  // Increased from 1000
    const longTaskScore = Math.min(rendering.longTasks / 25, 1);  // Increased from 50
    const confidence = (blockingTimeScore + longTaskScore) / 2;

    // 生成建议
    const suggestedActions: string[] = [];
    if (rendering.longTasks > 10) {
      suggestedActions.push('Identify and break up long-running JavaScript tasks');
      suggestedActions.push('Use code splitting and lazy loading');
      suggestedActions.push('Consider using Web Workers for heavy computations');
      suggestedActions.push('Review and optimize component rendering logic');
    }
    if (rendering.totalBlockingTime > 300) {
      suggestedActions.push('Defer non-critical JavaScript execution');
      suggestedActions.push('Use requestIdleCallback for non-essential work');
      suggestedActions.push('Optimize event handlers and prevent layout thrashing');
    }
    if (rendering.largestContentfulPaint && rendering.largestContentfulPaint > 4000) {
      suggestedActions.push('Optimize LCP: preload critical resources');
      suggestedActions.push('Remove render-blocking resources');
      suggestedActions.push('Optimize images and use next-gen formats');
      suggestedActions.push('Minify and compress CSS/JS');
    }
    if (rendering.cumulativeLayoutShift && rendering.cumulativeLayoutShift > 0.25) {
      suggestedActions.push('Reserve space for images and ads');
      suggestedActions.push('Avoid inserting content above existing content');
      suggestedActions.push('Use CSS transforms for animations');
      suggestedActions.push('Ensure consistent font loading with font-display');
    }
    suggestedActions.push('Consider using React Compiler to reduce re-renders');
    suggestedActions.push('Implement virtual scrolling for long lists');
    if (suggestedActions.length === 0) {
      suggestedActions.push('Analyze long task patterns with DevTools');
      suggestedActions.push('Review component render cycles');
    }

    return {
      type: 'rendering',
      severity,
      confidence,
      description: issues.join('; '),
      details: rendering,
      suggestedActions,
      estimatedFixTime: this.estimateRenderingFixTime(rendering),
      relatedMetrics: ['FID', 'TTI', 'LCP', 'CLS', 'INP'],
    };
  }

  /**
   * Analyze resource loading
   * 分析资源加载
   */
  private analyzeResources(resources: any): RootCauseCandidate | null {
    const slowResources = resources.slowResources || [];
    const totalSize = resources.totalSize || 0;
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

    if (slowResources.length === 0 && totalSize < this.config.resourceSizeThreshold * 2) {
      return null;
    }

    // 按类型分组
    const resourcesByType: Record<string, { count: number; totalSize: number }> = {};
    slowResources.forEach((r: any) => {
      if (!resourcesByType[r.type]) {
        resourcesByType[r.type] = { count: 0, totalSize: 0 };
      }
      resourcesByType[r.type].count++;
      resourcesByType[r.type].totalSize += r.size;
    });

    // 确定严重程度
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (totalSize > this.config.resourceSizeThreshold * 5 || slowResources.length > 10) {
      severity = 'critical';
    } else if (totalSize > this.config.resourceSizeThreshold * 3 || slowResources.length > 5) {
      severity = 'high';
    } else if (totalSize > this.config.resourceSizeThreshold * 2 || slowResources.length > 3) {
      severity = 'medium';
    }

    // 计算置信度
    const confidence = Math.min(totalSize / (this.config.resourceSizeThreshold * 5), 1);

    // 生成建议
    const suggestedActions: string[] = [];
    if (resourcesByType.image?.count > 0) {
      suggestedActions.push('Optimize images: use WebP format, resize, compress');
      suggestedActions.push('Implement responsive images with srcset and sizes');
    }
    if (resourcesByType.script?.count > 0) {
      suggestedActions.push('Minify and compress JavaScript files');
      suggestedActions.push('Implement code splitting for large bundles');
    }
    if (resourcesByType.stylesheet?.count > 0) {
      suggestedActions.push('Minify CSS and remove unused styles');
      suggestedActions.push('Inline critical CSS for above-the-fold content');
    }
    suggestedActions.push('Enable gzip/brotli compression');
    suggestedActions.push('Implement browser caching');
    suggestedActions.push('Use CDNs for static assets');

    return {
      type: 'resource',
      severity,
      confidence,
      description: `${slowResources.length} slow resources, total size: ${totalSizeMB}MB`,
      details: {
        totalSize,
        slowResourcesCount: slowResources.length,
        resourcesByType,
      },
      suggestedActions,
      estimatedFixTime: this.estimateResourceFixTime(resourcesByType, totalSize),
      relatedMetrics: ['LCP', 'FCP', 'TTFB'],
    };
  }

  /**
   * Analyze network
   * 分析网络
   */
  private analyzeNetwork(context: PerformanceContext): RootCauseCandidate | null {
    if (!context.network) return null;

    const { network } = context;
    const issues: string[] = [];

    if (network.type === 'unknown' || network.type === '2g') {
      issues.push('Slow or unknown network connection');
    }

    if (network.rtt && network.rtt > 300) {
      issues.push(`High network latency: ${network.rtt.toFixed(0)}ms RTT`);
    }

    if (network.downlink && network.downlink < 1) {
      issues.push(`Low network bandwidth: ${network.downlink.toFixed(1)}Mbps`);
    }

    if (issues.length === 0) return null;

    const severity = 'medium';
    const confidence = 0.7;

    return {
      type: 'network',
      severity,
      confidence,
      description: issues.join('; '),
      details: network,
      suggestedActions: [
        'Implement service worker caching for offline support',
        'Use progressive loading for large content',
        'Provide fallback content for slow connections',
        'Consider adaptive bitrate for media content',
      ],
      estimatedFixTime: '1-2 hours',
      relatedMetrics: ['LCP', 'FCP', 'TTFB'],
    };
  }

  /**
   * Analyze memory usage
   * 分析内存使用
   */
  private analyzeMemory(memory: any): RootCauseCandidate | null {
    const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    if (memoryUsage < 70) return null;

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (memoryUsage > 90) {
      severity = 'critical';
    } else if (memoryUsage > 80) {
      severity = 'high';
    } else if (memoryUsage > 70) {
      severity = 'medium';
    }

    const confidence = memoryUsage / 100;

    return {
      type: 'memory',
      severity,
      confidence,
      description: `High memory usage: ${memoryUsage.toFixed(1)}%`,
      details: {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        memoryUsage,
      },
      suggestedActions: [
        'Check for memory leaks (event listeners, closures)',
        'Implement object pooling and reuse',
        'Clear unnecessary references and caches',
        'Use weak references where appropriate',
        'Profile memory usage with DevTools',
      ],
      estimatedFixTime: '4-8 hours',
      relatedMetrics: ['FID', 'TTI'],
    };
  }

  /**
   * Estimate database fix time
   * 估算数据库修复时间
   */
  private estimateDatabaseFixTime(issues: QueryIssue[], avgDuration: number): string {
    const hasCritical = issues.some(i => i.severity === 'critical');
    const hasLargeResult = issues.some(i => i.type === 'large-result');
    
    if (hasCritical) {
      return '8-16 hours';
    } else if (hasLargeResult || avgDuration > 3000) {
      return '4-8 hours';
    } else {
      return '2-4 hours';
    }
  }

  /**
   * Estimate API fix time
   * 估算 API 修复时间
   */
  private estimateAPIFixTime(issues: APIIssue[], avgDuration: number): string {
    const hasCritical = issues.some(i => i.severity === 'critical');
    const hasTimeout = issues.some(i => i.type === 'timeout');
    const hasServerError = issues.some(i => i.type === 'server-error');
    
    if (hasServerError) {
      return '4-8 hours';
    } else if (hasTimeout || hasCritical) {
      return '4-6 hours';
    } else if (avgDuration > 3000) {
      return '2-4 hours';
    } else {
      return '1-2 hours';
    }
  }

  /**
   * Estimate rendering fix time
   * 估算渲染修复时间
   */
  private estimateRenderingFixTime(rendering: RenderingMetrics): string {
    const totalBlockingTime = rendering.totalBlockingTime;
    const longTasks = rendering.longTasks;
    
    if (totalBlockingTime > 1000 || longTasks > 50) {
      return '8-16 hours';
    } else if (totalBlockingTime > 500 || longTasks > 20) {
      return '4-8 hours';
    } else {
      return '2-4 hours';
    }
  }

  /**
   * Estimate resource fix time
   * 估算资源修复时间
   */
  private estimateResourceFixTime(resourcesByType: Record<string, any>, totalSize: number): string {
    const hasImages = !!resourcesByType.image;
    const hasScripts = !!resourcesByType.script;
    
    if (totalSize > 5 * 1024 * 1024) {
      return '4-8 hours';
    } else if (hasImages && hasScripts) {
      return '2-4 hours';
    } else {
      return '1-2 hours';
    }
  }

  /**
   * Convert severity to numeric score
   * 将严重程度转换为数值分数
   */
  private severityScore(severity: string): number {
    return {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    }[severity] || 0;
  }

  /**
   * Update configuration
   * 更新配置
   */
  updateConfig(partialConfig: Partial<RootCauseAnalysisConfig>): void {
    this.config = { ...this.config, ...partialConfig };
  }

  /**
   * Get database tracker
   * 获取数据库追踪器
   */
  getDatabaseTracker(): DatabaseTracker {
    return this.databaseTracker;
  }

  /**
   * Get API tracker
   * 获取 API 追踪器
   */
  getApiTracker(): APITracker {
    return this.apiTracker;
  }

  /**
   * Generate comprehensive report
   * 生成综合报告
   */
  generateReport(rootCause: RootCause): {
    summary: string;
    metric: string;
    timestamp: number;
    severity: string;
    candidates: RootCauseCandidate[];
    primaryCause: RootCauseCandidate | null;
    recommendations: string[];
    quickWins: string[];
  } {
    const summary = rootCause.primaryCause
      ? `Primary cause: ${rootCause.primaryCause.type} (${rootCause.primaryCause.severity})`
      : 'No clear root cause identified';

    // 收集所有建议
    const allSuggestions = new Set<string>();
    rootCause.candidates.forEach(c => {
      c.suggestedActions.forEach(s => allSuggestions.add(s));
    });

    // 提取快速修复
    const quickWins = Array.from(allSuggestions)
      .filter(s => s.length < 100 && !s.includes('implement') && !s.includes('consider'))
      .slice(0, 5);

    return {
      summary,
      metric: rootCause.metric,
      timestamp: rootCause.timestamp,
      severity: rootCause.primaryCause?.severity || 'low',
      candidates: rootCause.candidates,
      primaryCause: rootCause.primaryCause,
      recommendations: Array.from(allSuggestions),
      quickWins,
    };
  }
}

// Export singleton instance
export const rootCauseAnalyzer = new RootCauseAnalyzer();

// Export all types
export * from './types';
export * from './database-tracker';
export * from './api-tracker';
