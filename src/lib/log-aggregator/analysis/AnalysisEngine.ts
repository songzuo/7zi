/**
 * Analysis Engine - v1.10.0
 * 日志分析引擎实现（异常检测、趋势分析、统计报告）
 */

import { EventEmitter } from 'events';
import type {
  IAnalysisEngine,
  AnalysisEngineConfig,
  ILogStorage,
  LogQuery,
  TimeRange,
  AnomalyResult,
  TrendResult,
  AnalysisReport,
  Insight,
  ReportSummary,
  ErrorSummary,
  SourceSummary,
  ReportSection,
  ReportMetric,
  LogEntry,
  LogLevel,
  LogEvent,
  LogEventListener,
} from '../types.js';

/**
 * 统计数据
 */
interface StatsData {
  count: number;
  sum: number;
  sumSq: number;
  min: number;
  max: number;
  values: number[];
  avg: number;
}

/**
 * 日志分析引擎
 */
export class LogAnalysisEngine extends EventEmitter implements IAnalysisEngine {
  private _storage: ILogStorage;
  private _listeners: LogEventListener[] = [];
  private _anomalyHistory: Map<string, AnomalyResult[]> = new Map();
  private _baselineStats: Map<string, StatsData> = new Map();

  constructor(
    public readonly config: AnalysisEngineConfig,
    storage: ILogStorage
  ) {
    super();
    this._storage = storage;
    this.setMaxListeners(100);
  }

  /**
   * 检测异常
   */
  async detectAnomalies(timeRange: TimeRange): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];

    if (!this.config.anomalyDetection.enabled) {
      return anomalies;
    }

    // Get log counts by level
    const levelCounts = await this.getLogCountsByField(timeRange, 'level');
    const sourceCounts = await this.getLogCountsByField(timeRange, 'source.name');

    // Detect spikes in error rates
    if (levelCounts.error || levelCounts.fatal) {
      const errorRate = (levelCounts.error || 0 + levelCounts.fatal || 0) / 
        Object.values(levelCounts).reduce((a, b) => a + b, 0);

      const baselineErrorRate = this._baselineStats.get('error_rate');
      if (baselineErrorRate && errorRate > baselineErrorRate.avg + 2 * this.stdDev(baselineErrorRate)) {
        anomalies.push({
          id: `anomaly-error-rate-${Date.now()}`,
          timestamp: new Date(),
          type: 'spike',
          severity: errorRate > 0.5 ? 'critical' : 'high',
          score: errorRate,
          field: 'error_rate',
          expectedValue: baselineErrorRate.avg,
          actualValue: errorRate,
          context: { levelCounts },
        });
      }
    }

    // Detect anomalies using Z-score
    for (const algorithm of this.config.anomalyDetection.algorithms) {
      const algorithmAnomalies = await this.runAnomalyAlgorithm(timeRange, algorithm);
      anomalies.push(...algorithmAnomalies);
    }

    // Store anomalies
    for (const anomaly of anomalies) {
      const key = anomaly.field;
      if (!this._anomalyHistory.has(key)) {
        this._anomalyHistory.set(key, []);
      }
      this._anomalyHistory.get(key)!.push(anomaly);

      // Emit event
      await this.emitEvent({
        type: 'anomaly_detected',
        anomaly,
      });
    }

    return anomalies;
  }

  /**
   * 分析趋势
   */
  async analyzeTrends(timeRange: TimeRange): Promise<TrendResult[]> {
    const trends: TrendResult[] = [];

    if (!this.config.trendAnalysis.enabled) {
      return trends;
    }

    // Analyze log volume trend
    const volumeTrend = await this.analyzeVolumeTrend(timeRange);
    if (volumeTrend) {
      trends.push(volumeTrend);
    }

    // Analyze error rate trend
    const errorTrend = await this.analyzeErrorRateTrend(timeRange);
    if (errorTrend) {
      trends.push(errorTrend);
    }

    // Analyze response time trend
    const responseTrend = await this.analyzeResponseTimeTrend(timeRange);
    if (responseTrend) {
      trends.push(responseTrend);
    }

    return trends;
  }

  /**
   * 生成报告
   */
  async generateReport(timeRange: TimeRange): Promise<AnalysisReport> {
    const reportId = `report-${Date.now()}`;
    const generatedAt = new Date();

    // Generate summary
    const summary = await this.generateSummary(timeRange);

    // Generate sections
    const sections = await this.generateReportSections(timeRange);

    // Generate metrics
    const metrics = await this.generateReportMetrics(timeRange);

    return {
      id: reportId,
      generatedAt,
      timeRange,
      summary,
      sections,
      metrics,
    };
  }

  /**
   * 获取洞察
   */
  async getInsights(timeRange: TimeRange): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Get anomalies
    const anomalies = await this.detectAnomalies(timeRange);
    for (const anomaly of anomalies) {
      insights.push({
        id: `insight-anomaly-${anomaly.id}`,
        type: 'anomaly',
        title: `Anomaly Detected: ${anomaly.field}`,
        description: `Detected ${anomaly.type} in ${anomaly.field}. Expected: ${anomaly.expectedValue.toFixed(2)}, Actual: ${anomaly.actualValue.toFixed(2)}`,
        importance: anomaly.severity === 'critical' ? 'high' : anomaly.severity === 'high' ? 'medium' : 'low',
        actionable: true,
        suggestedActions: [
          'Investigate the root cause',
          'Check for recent deployments or changes',
          'Review related error logs',
        ],
      });
    }

    // Get trends
    const trends = await this.analyzeTrends(timeRange);
    for (const trend of trends) {
      if (trend.direction !== 'stable') {
        insights.push({
          id: `insight-trend-${trend.field}`,
          type: 'trend',
          title: `${trend.field} is ${trend.direction}`,
          description: `${trend.field} has changed by ${Math.abs(trend.changeRate * 100).toFixed(1)}% with ${trend.confidence * 100}% confidence`,
          importance: trend.confidence > 0.8 ? 'high' : 'medium',
          actionable: trend.direction === 'up',
          suggestedActions: trend.direction === 'up'
            ? ['Monitor closely', 'Prepare for scaling', 'Review resource allocation']
            : ['Investigate the decrease', 'Check for successful optimizations'],
        });
      }
    }

    // Get correlations
    const correlations = await this.findCorrelations(timeRange);
    insights.push(...correlations);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(timeRange, anomalies, trends);
    insights.push(...recommendations);

    return insights;
  }

  /**
   * 添加事件监听器
   */
  addEventListener(listener: LogEventListener): void {
    this._listeners.push(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: LogEventListener): void {
    const index = this._listeners.indexOf(listener);
    if (index > -1) {
      this._listeners.splice(index, 1);
    }
  }

  /**
   * 触发事件
   */
  private async emitEvent(event: LogEvent): Promise<void> {
    for (const listener of this._listeners) {
      try {
        await listener(event);
      } catch (error) {
        console.error(`Error in event listener:`, error);
      }
    }
  }

  /**
   * 运行异常检测算法
   */
  private async runAnomalyAlgorithm(
    timeRange: TimeRange,
    algorithm: string
  ): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];

    switch (algorithm) {
      case 'zscore':
        anomalies.push(...await this.detectZScoreAnomalies(timeRange));
        break;
      case 'isolation_forest':
        anomalies.push(...await this.detectIsolationForestAnomalies(timeRange));
        break;
      case 'kmeans':
        anomalies.push(...await this.detectKMeansAnomalies(timeRange));
        break;
      case 'dbscan':
        anomalies.push(...await this.detectDBSCANAnomalies(timeRange));
        break;
    }

    return anomalies;
  }

  /**
   * Z-Score 异常检测
   */
  private async detectZScoreAnomalies(timeRange: TimeRange): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];
    
    // Get hourly counts
    const query: LogQuery = {
      timeRange,
      sort: [{ field: 'timestamp', order: 'asc' }],
    };

    const result = await this._storage.query(query);
    const hourlyCounts = this.groupByHour(result.entries);

    // Calculate statistics
    const counts = Object.values(hourlyCounts);
    const stats = this.calculateStats(counts);

    // Detect anomalies
    const threshold = this.config.anomalyDetection.sensitivity * 2;
    
    for (const [hour, count] of Object.entries(hourlyCounts)) {
      const zScore = stats.avg > 0 ? (count - stats.avg) / this.stdDev(stats) : 0;
      
      if (Math.abs(zScore) > threshold) {
        anomalies.push({
          id: `zscore-${hour}-${Date.now()}`,
          timestamp: new Date(hour),
          type: zScore > 0 ? 'spike' : 'drop',
          severity: Math.abs(zScore) > 3 ? 'critical' : Math.abs(zScore) > 2.5 ? 'high' : 'medium',
          score: Math.abs(zScore),
          field: 'log_count',
          expectedValue: stats.avg,
          actualValue: count,
          context: { hour, zScore },
        });
      }
    }

    return anomalies;
  }

  /**
   * Isolation Forest 异常检测（简化实现）
   */
  private async detectIsolationForestAnomalies(timeRange: TimeRange): Promise<AnomalyResult[]> {
    // Simplified implementation using outlier detection
    return this.detectZScoreAnomalies(timeRange);
  }

  /**
   * K-Means 异常检测（简化实现）
   */
  private async detectKMeansAnomalies(timeRange: TimeRange): Promise<AnomalyResult[]> {
    // Simplified implementation
    const query: LogQuery = {
      timeRange,
      filters: [{ field: 'level', operator: 'eq', value: 'error' }],
    };

    const result = await this._storage.query(query);
    
    if (result.total > 0) {
      const normalThreshold = result.total * 0.1;
      return [{
        id: `kmeans-error-${Date.now()}`,
        timestamp: new Date(),
        type: 'outlier',
        severity: 'medium',
        score: result.total / normalThreshold,
        field: 'error_count',
        expectedValue: normalThreshold,
        actualValue: result.total,
        context: { totalErrors: result.total },
      }];
    }

    return [];
  }

  /**
   * DBSCAN 异常检测（简化实现）
   */
  private async detectDBSCANAnomalies(timeRange: TimeRange): Promise<AnomalyResult[]> {
    // Simplified implementation
    return this.detectZScoreAnomalies(timeRange);
  }

  /**
   * 分析日志量趋势
   */
  private async analyzeVolumeTrend(timeRange: TimeRange): Promise<TrendResult | null> {
    const result = await this._storage.query({
      timeRange,
      sort: [{ field: 'timestamp', order: 'asc' }],
    });

    const hourlyCounts = this.groupByHour(result.entries);
    const trend = this.calculateTrend(Object.values(hourlyCounts));

    return {
      field: 'log_volume',
      direction: trend > 0.05 ? 'up' : trend < -0.05 ? 'down' : 'stable',
      changeRate: trend,
      confidence: Math.min(1, Math.abs(trend) * 10),
      startDate: timeRange.start,
      endDate: timeRange.end,
    };
  }

  /**
   * 分析错误率趋势
   */
  private async analyzeErrorRateTrend(timeRange: TimeRange): Promise<TrendResult | null> {
    const errorQuery: LogQuery = {
      timeRange,
      filters: [
        { field: 'level', operator: 'in', value: ['error', 'fatal'] },
      ],
    };

    const totalQuery: LogQuery = { timeRange };

    const errorResult = await this._storage.query(errorQuery);
    const totalResult = await this._storage.query(totalQuery);

    const errorRate = totalResult.total > 0 ? errorResult.total / totalResult.total : 0;

    // Compare with previous period
    const previousRange = this.getPreviousPeriod(timeRange);
    const previousErrorResult = await this._storage.query({
      ...errorQuery,
      timeRange: previousRange,
    });
    const previousTotalResult = await this._storage.query({
      ...totalQuery,
      timeRange: previousRange,
    });

    const previousErrorRate = previousTotalResult.total > 0 
      ? previousErrorResult.total / previousTotalResult.total 
      : 0;

    const change = previousErrorRate > 0 
      ? (errorRate - previousErrorRate) / previousErrorRate 
      : 0;

    return {
      field: 'error_rate',
      direction: change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'stable',
      changeRate: change,
      confidence: 0.8,
      startDate: timeRange.start,
      endDate: timeRange.end,
    };
  }

  /**
   * 分析响应时间趋势
   */
  private async analyzeResponseTimeTrend(timeRange: TimeRange): Promise<TrendResult | null> {
    const query: LogQuery = {
      timeRange,
      filters: [
        { field: 'metadata.duration', operator: 'exists', value: true },
      ],
    };

    const result = await this._storage.query(query);

    if (result.entries.length === 0) {
      return null;
    }

    const durations = result.entries
      .map((e) => e.metadata?.duration as number)
      .filter((d): d is number => typeof d === 'number');

    if (durations.length === 0) {
      return null;
    }

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    // Compare with previous period
    const previousRange = this.getPreviousPeriod(timeRange);
    const previousResult = await this._storage.query({
      ...query,
      timeRange: previousRange,
    });

    const previousDurations = previousResult.entries
      .map((e) => e.metadata?.duration as number)
      .filter((d): d is number => typeof d === 'number');

    const previousAvgDuration = previousDurations.length > 0
      ? previousDurations.reduce((a, b) => a + b, 0) / previousDurations.length
      : avgDuration;

    const change = previousAvgDuration > 0
      ? (avgDuration - previousAvgDuration) / previousAvgDuration
      : 0;

    return {
      field: 'response_time',
      direction: change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'stable',
      changeRate: change,
      confidence: 0.75,
      startDate: timeRange.start,
      endDate: timeRange.end,
    };
  }

  /**
   * 生成报告摘要
   */
  private async generateSummary(timeRange: TimeRange): Promise<ReportSummary> {
    const query: LogQuery = { timeRange };
    const result = await this._storage.query(query);

    // Error query
    const errorQuery: LogQuery = {
      timeRange,
      filters: [{ field: 'level', operator: 'in', value: ['error', 'fatal'] }],
    };
    const errorResult = await this._storage.query(errorQuery);

    // Get top errors
    const topErrors = await this.getTopErrors(timeRange);

    // Get top sources
    const topSources = await this.getTopSources(timeRange);

    // Calculate average response time
    const avgResponseTime = await this.calculateAverageResponseTime(timeRange);

    return {
      totalLogs: result.total,
      errorRate: result.total > 0 ? errorResult.total / result.total : 0,
      avgResponseTime,
      topErrors,
      topSources,
    };
  }

  /**
   * 生成报告章节
   */
  private async generateReportSections(timeRange: TimeRange): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];

    // Log level distribution
    const levelDistribution = await this.getLevelDistribution(timeRange);
    sections.push({
      title: 'Log Level Distribution',
      type: 'chart',
      data: levelDistribution,
    });

    // Timeline chart
    const timeline = await this.getTimelineData(timeRange);
    sections.push({
      title: 'Log Volume Timeline',
      type: 'chart',
      data: timeline,
    });

    // Top error messages
    const topErrors = await this.getTopErrors(timeRange);
    sections.push({
      title: 'Top Errors',
      type: 'table',
      data: topErrors,
    });

    // Source breakdown
    const sourceBreakdown = await this.getSourceBreakdown(timeRange);
    sections.push({
      title: 'Source Breakdown',
      type: 'chart',
      data: sourceBreakdown,
    });

    return sections;
  }

  /**
   * 生成报告指标
   */
  private async generateReportMetrics(timeRange: TimeRange): Promise<ReportMetric[]> {
    const metrics: ReportMetric[] = [];

    // Total logs
    const query: LogQuery = { timeRange };
    const result = await this._storage.query(query);
    metrics.push({
      name: 'Total Logs',
      value: result.total,
      unit: 'count',
      change: 0,
      trend: 'stable',
    });

    // Error rate
    const errorQuery: LogQuery = {
      timeRange,
      filters: [{ field: 'level', operator: 'in', value: ['error', 'fatal'] }],
    };
    const errorResult = await this._storage.query(errorQuery);
    const errorRate = result.total > 0 ? (errorResult.total / result.total) * 100 : 0;
    metrics.push({
      name: 'Error Rate',
      value: errorRate,
      unit: '%',
      change: 0,
      trend: 'stable',
    });

    // Average response time
    const avgResponseTime = await this.calculateAverageResponseTime(timeRange);
    metrics.push({
      name: 'Avg Response Time',
      value: avgResponseTime,
      unit: 'ms',
      change: 0,
      trend: 'stable',
    });

    // Unique sources
    const sources = new Set(result.entries.map((e) => e.source?.name).filter(Boolean));
    metrics.push({
      name: 'Unique Sources',
      value: sources.size,
      unit: 'count',
      change: 0,
      trend: 'stable',
    });

    return metrics;
  }

  /**
   * 获取日志计数（按字段）
   */
  private async getLogCountsByField(timeRange: TimeRange, field: string): Promise<Record<string, number>> {
    const query: LogQuery = { timeRange };
    const result = await this._storage.query(query);

    const counts: Record<string, number> = {};
    for (const entry of result.entries) {
      const value = this.getFieldValue(entry, field);
      const key = String(value ?? 'unknown');
      counts[key] = (counts[key] || 0) + 1;
    }

    return counts;
  }

  /**
   * 按小时分组
   */
  private groupByHour(entries: LogEntry[]): Record<string, number> {
    const groups: Record<string, number> = {};

    for (const entry of entries) {
      const hour = new Date(entry.timestamp);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      groups[key] = (groups[key] || 0) + 1;
    }

    return groups;
  }

  /**
   * 计算统计
   */
  private calculateStats(values: number[]): StatsData {
    if (values.length === 0) {
      return { count: 0, sum: 0, sumSq: 0, min: 0, max: 0, values: [], avg: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      sum,
      sumSq: values.reduce((a, b) => a + b * b, 0),
      min: Math.min(...values),
      max: Math.max(...values),
      values,
      avg: sum / values.length,
    };
  }

  /**
   * 计算标准差
   */
  private stdDev(stats: StatsData): number {
    if (stats.count < 2) return 0;
    const variance = (stats.sumSq - stats.sum * stats.sum / stats.count) / (stats.count - 1);
    return Math.sqrt(Math.max(0, variance));
  }

  /**
   * 计算趋势
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    const slope = denominator > 0 ? numerator / denominator : 0;
    return slope / yMean;
  }

  /**
   * 获取上一周期
   */
  private getPreviousPeriod(timeRange: TimeRange): TimeRange {
    const duration = timeRange.end.getTime() - timeRange.start.getTime();
    return {
      start: new Date(timeRange.start.getTime() - duration),
      end: timeRange.start,
    };
  }

  /**
   * 获取字段值
   */
  private getFieldValue(entry: LogEntry, field: string): unknown {
    const parts = field.split('.');
    let value: unknown = entry;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * 获取顶级错误
   */
  private async getTopErrors(timeRange: TimeRange, limit = 10): Promise<ErrorSummary[]> {
    const query: LogQuery = {
      timeRange,
      filters: [{ field: 'level', operator: 'in', value: ['error', 'fatal'] }],
      sort: [{ field: 'timestamp', order: 'desc' }],
      pagination: { offset: 0, limit: 100 },
    };

    const result = await this._storage.query(query);

    // Group by message
    const groups = new Map<string, LogEntry[]>();
    for (const entry of result.entries) {
      const message = entry.message.substring(0, 100);
      if (!groups.has(message)) {
        groups.set(message, []);
      }
      groups.get(message)!.push(entry);
    }

    // Sort by count
    const sorted = Array.from(groups.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, limit);

    return sorted.map(([message, entries]) => ({
      message,
      count: entries.length,
      firstSeen: entries[entries.length - 1].timestamp,
      lastSeen: entries[0].timestamp,
      trend: 'stable' as const,
    }));
  }

  /**
   * 获取顶级来源
   */
  private async getTopSources(timeRange: TimeRange, limit = 10): Promise<SourceSummary[]> {
    const query: LogQuery = { timeRange };
    const result = await this._storage.query(query);

    // Group by source
    const groups = new Map<string, LogEntry[]>();
    for (const entry of result.entries) {
      const source = entry.source?.name || 'unknown';
      if (!groups.has(source)) {
        groups.set(source, []);
      }
      groups.get(source)!.push(entry);
    }

    // Sort by count
    const sorted = Array.from(groups.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, limit);

    return sorted.map(([source, entries]) => ({
      source,
      count: entries.length,
      errorCount: entries.filter((e) => e.level === 'error' || e.level === 'fatal').length,
      avgSize: entries.reduce((sum, e) => sum + JSON.stringify(e).length, 0) / entries.length,
    }));
  }

  /**
   * 计算平均响应时间
   */
  private async calculateAverageResponseTime(timeRange: TimeRange): Promise<number> {
    const query: LogQuery = {
      timeRange,
      filters: [{ field: 'metadata.duration', operator: 'exists', value: true }],
    };

    const result = await this._storage.query(query);

    if (result.entries.length === 0) {
      return 0;
    }

    const durations = result.entries
      .map((e) => e.metadata?.duration as number)
      .filter((d): d is number => typeof d === 'number');

    return durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
  }

  /**
   * 获取级别分布
   */
  private async getLevelDistribution(timeRange: TimeRange): Promise<Record<string, number>> {
    return this.getLogCountsByField(timeRange, 'level');
  }

  /**
   * 获取时间线数据
   */
  private async getTimelineData(timeRange: TimeRange): Promise<{ time: string; count: number }[]> {
    const query: LogQuery = { timeRange, sort: [{ field: 'timestamp', order: 'asc' }] };
    const result = await this._storage.query(query);
    const hourlyCounts = this.groupByHour(result.entries);

    return Object.entries(hourlyCounts)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  /**
   * 获取来源分布
   */
  private async getSourceBreakdown(timeRange: TimeRange): Promise<Record<string, number>> {
    return this.getLogCountsByField(timeRange, 'source.name');
  }

  /**
   * 发现相关性
   */
  private async findCorrelations(timeRange: TimeRange): Promise<Insight[]> {
    // Simplified correlation detection
    return [];
  }

  /**
   * 生成建议
   */
  private async generateRecommendations(
    timeRange: TimeRange,
    anomalies: AnomalyResult[],
    trends: TrendResult[]
  ): Promise<Insight[]> {
    const recommendations: Insight[] = [];

    // Check for high error rate
    const errorAnomaly = anomalies.find((a) => a.field === 'error_rate' && a.actualValue > 0.1);
    if (errorAnomaly) {
      recommendations.push({
        id: `rec-error-rate-${Date.now()}`,
        type: 'recommendation',
        title: 'Reduce Error Rate',
        description: 'Consider implementing better error handling and monitoring',
        importance: 'high',
        actionable: true,
        suggestedActions: [
          'Review error logs for patterns',
          'Implement circuit breakers',
          'Add automated alerting for error spikes',
        ],
      });
    }

    // Check for increasing response times
    const responseTrend = trends.find((t) => t.field === 'response_time' && t.direction === 'up');
    if (responseTrend) {
      recommendations.push({
        id: `rec-response-time-${Date.now()}`,
        type: 'recommendation',
        title: 'Optimize Response Times',
        description: 'Response times are increasing. Consider performance optimization',
        importance: 'medium',
        actionable: true,
        suggestedActions: [
          'Review slow queries',
          'Implement caching',
          'Scale infrastructure',
        ],
      });
    }

    return recommendations;
  }
}
