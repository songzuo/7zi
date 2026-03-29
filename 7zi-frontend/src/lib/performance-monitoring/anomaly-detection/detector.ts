/**
 * Performance Anomaly Detector
 * 性能异常检测器 - 核心模块
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AnomalyDetection,
  AnomalyDetectionConfig,
  AnomalyEvent,
  MetricBaseline,
  MetricDataPoint,
  DEFAULT_ANOMALY_CONFIG,
} from './types';
import { BaselineManager } from './baseline';
import { detectAnomalyZScore, calculatePercentChange } from './algorithms/z-score';
import { trainAndDetect } from './algorithms/isolation-forest';
import { CompositeFilter, createDefaultFilters, FilterContext } from './filters';

export class PerformanceAnomalyDetector {
  private config: AnomalyDetectionConfig;
  private baselineManager: BaselineManager;
  private filter: CompositeFilter;
  private recentDetections: Map<string, AnomalyDetection[]> = new Map();
  private anomalyEvents: AnomalyEvent[] = [];
  private metricHistory: Map<string, MetricDataPoint[]> = new Map();

  constructor(config: Partial<AnomalyDetectionConfig> = {}) {
    this.config = { ...DEFAULT_ANOMALY_CONFIG, ...config };
    this.baselineManager = new BaselineManager(this.config);
    this.filter = createDefaultFilters({
      cooldownMs: this.config.filters.cooldownMs,
      minConfidence: this.config.filters.minConfidence,
    });
  }

  /**
   * Track a metric value
   * 追踪指标值
   */
  trackMetric(metric: string, value: number, timestamp: number = Date.now()): void {
    // 添加到历史
    if (!this.metricHistory.has(metric)) {
      this.metricHistory.set(metric, []);
    }
    this.metricHistory.get(metric)!.push({ timestamp, value });

    // 添加到基线管理器
    this.baselineManager.addDataPoint(metric, value, timestamp);
  }

  /**
   * Detect anomaly for a metric
   * 检测指标异常
   */
  detectAnomaly(metric: string, value: number): AnomalyDetection | null {
    const baseline = this.baselineManager.getBaseline(metric);
    
    if (!baseline) {
      return {
        isAnomaly: false,
        severity: 'low',
        metric,
        value,
        baseline: this.createEmptyBaseline(metric),
        confidence: 0,
        reason: 'No baseline available',
        detectedAt: Date.now(),
        algorithm: 'threshold',
      };
    }

    // 使用配置的算法检测
    const detections: AnomalyDetection[] = [];

    // Z-Score 检测
    if (this.config.algorithms.zScore.enabled) {
      const zScoreResult = detectAnomalyZScore(
        value,
        baseline,
        this.config.algorithms.zScore.threshold
      );
      
      if (zScoreResult.isAnomaly) {
        detections.push({
          isAnomaly: true,
          severity: zScoreResult.severity,
          metric,
          value,
          baseline,
          zScore: zScoreResult.zScore,
          confidence: zScoreResult.confidence,
          reason: `Z-score ${zScoreResult.zScore.toFixed(2)} exceeds threshold ${this.config.algorithms.zScore.threshold}`,
          detectedAt: Date.now(),
          algorithm: 'z-score',
        });
      }
    }

    // 孤立森林检测（需要足够的数据）
    if (this.config.algorithms.isolationForest.enabled) {
      const history = this.metricHistory.get(metric) || [];
      if (history.length >= 30) {
        const isoResult = trainAndDetect(
          history,
          value,
          {
            numTrees: this.config.algorithms.isolationForest.numTrees || 100,
            subSamplingSize: this.config.algorithms.isolationForest.subSamplingSize || 256,
            contamination: this.config.algorithms.isolationForest.contamination,
          }
        );

        if (isoResult.isAnomaly) {
          detections.push({
            isAnomaly: true,
            severity: isoResult.severity,
            metric,
            value,
            baseline,
            confidence: isoResult.score,
            reason: `Isolation forest anomaly score: ${isoResult.score.toFixed(3)}`,
            detectedAt: Date.now(),
            algorithm: 'isolation-forest',
          });
        }
      }
    }

    // 阈值检测
    if (this.config.algorithms.threshold.enabled) {
      const thresholdConfig = this.config.algorithms.threshold;
      
      if (thresholdConfig.minThreshold !== undefined && value < thresholdConfig.minThreshold) {
        detections.push({
          isAnomaly: true,
          severity: 'high',
          metric,
          value,
          baseline,
          confidence: 0.9,
          reason: `Value ${value} below minimum threshold ${thresholdConfig.minThreshold}`,
          detectedAt: Date.now(),
          algorithm: 'threshold',
        });
      }

      if (thresholdConfig.maxThreshold !== undefined && value > thresholdConfig.maxThreshold) {
        detections.push({
          isAnomaly: true,
          severity: 'high',
          metric,
          value,
          baseline,
          confidence: 0.9,
          reason: `Value ${value} exceeds maximum threshold ${thresholdConfig.maxThreshold}`,
          detectedAt: Date.now(),
          algorithm: 'threshold',
        });
      }
    }

    // 如果没有检测到异常，返回正常结果
    if (detections.length === 0) {
      return {
        isAnomaly: false,
        severity: 'low',
        metric,
        value,
        baseline,
        confidence: 0,
        reason: 'Value within normal range',
        detectedAt: Date.now(),
        algorithm: 'z-score',
      };
    }

    // 选择最严重的异常
    const mostSevere = detections.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    })[0];

    // 应用过滤器
    if (this.config.filters.enablePseudoAnomalyFilter) {
      const context = this.createFilterContext(metric);
      const filterResult = this.filter.applyWithDetails(mostSevere, context);
      
      if (!filterResult.passed) {
        // 被过滤器拦截
        return {
          ...mostSevere,
          isAnomaly: false,
          reason: `${mostSevere.reason} (filtered by: ${filterResult.failedFilters.join(', ')})`,
          confidence: mostSevere.confidence * 0.5, // 降低置信度
        };
      }
    }

    // 记录检测历史
    this.recordDetection(metric, mostSevere);

    return mostSevere;
  }

  /**
   * Create filter context
   * 创建过滤器上下文
   */
  private createFilterContext(metric: string): FilterContext {
    const now = new Date();
    const history = this.metricHistory.get(metric) || [];

    return {
      recentDetections: this.recentDetections.get(metric) || [],
      metricHistory: history,
      timeOfDay: now.getHours(),
      dayOfWeek: now.getDay(),
    };
  }

  /**
   * Record detection for cooldown tracking
   * 记录检测用于冷却时间追踪
   */
  private recordDetection(metric: string, detection: AnomalyDetection): void {
    if (!this.recentDetections.has(metric)) {
      this.recentDetections.set(metric, []);
    }
    
    this.recentDetections.get(metric)!.push(detection);

    // 清理过期的检测记录
    const cutoff = Date.now() - this.config.filters.cooldownMs * 2;
    const filtered = this.recentDetections
      .get(metric)!
      .filter((d) => d.detectedAt >= cutoff);
    this.recentDetections.set(metric, filtered);
  }

  /**
   * Create empty baseline
   * 创建空基线
   */
  private createEmptyBaseline(metric: string): MetricBaseline {
    return {
      metric,
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      sampleSize: 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Track and detect in one step
   * 一步追踪并检测
   */
  trackAndDetect(metric: string, value: number): AnomalyDetection | null {
    this.trackMetric(metric, value);
    return this.detectAnomaly(metric, value);
  }

  /**
   * Get baseline for a metric
   * 获取指标基线
   */
  getBaseline(metric: string): MetricBaseline | null {
    return this.baselineManager.getBaseline(metric);
  }

  /**
   * Get all baselines
   * 获取所有基线
   */
  getAllBaselines(): MetricBaseline[] {
    return this.baselineManager.getAllBaselines();
  }

  /**
   * Force update baseline
   * 强制更新基线
   */
  updateBaseline(metric: string): MetricBaseline | null {
    return this.baselineManager.updateBaseline(metric);
  }

  /**
   * Get anomaly events
   * 获取异常事件
   */
  getAnomalyEvents(startTime?: number): AnomalyEvent[] {
    if (startTime) {
      return this.anomalyEvents.filter((e) => e.detection.detectedAt >= startTime);
    }
    return [...this.anomalyEvents];
  }

  /**
   * Acknowledge anomaly event
   * 确认异常事件
   */
  acknowledgeEvent(eventId: string, acknowledgedBy: string): boolean {
    const event = this.anomalyEvents.find((e) => e.id === eventId);
    if (event) {
      event.acknowledged = true;
      event.acknowledgedAt = Date.now();
      event.acknowledgedBy = acknowledgedBy;
      return true;
    }
    return false;
  }

  /**
   * Resolve anomaly event
   * 解决异常事件
   */
  resolveEvent(eventId: string, notes?: string): boolean {
    const event = this.anomalyEvents.find((e) => e.id === eventId);
    if (event) {
      event.resolved = true;
      event.resolvedAt = Date.now();
      event.notes = notes;
      return true;
    }
    return false;
  }

  /**
   * Mark event as false positive
   * 标记为误报
   */
  markAsFalsePositive(eventId: string, notes?: string): boolean {
    const event = this.anomalyEvents.find((e) => e.id === eventId);
    if (event) {
      event.falsePositive = true;
      event.notes = notes;
      return true;
    }
    return false;
  }

  /**
   * Get metric history
   * 获取指标历史
   */
  getMetricHistory(metric: string): MetricDataPoint[] {
    return this.metricHistory.get(metric) || [];
  }

  /**
   * Clear data for a metric
   * 清除指标数据
   */
  clearMetric(metric: string): void {
    this.metricHistory.delete(metric);
    this.recentDetections.delete(metric);
    this.baselineManager.clearBaseline(metric);
  }

  /**
   * Clear all data
   * 清除所有数据
   */
  clearAll(): void {
    this.metricHistory.clear();
    this.recentDetections.clear();
    this.anomalyEvents = [];
    this.baselineManager.clearAll();
  }

  /**
   * Update configuration
   * 更新配置
   */
  updateConfig(partialConfig: Partial<AnomalyDetectionConfig>): void {
    this.config = { ...this.config, ...partialConfig };
    
    // 重新创建过滤器
    if (partialConfig.filters) {
      this.filter = createDefaultFilters({
        cooldownMs: this.config.filters.cooldownMs,
        minConfidence: this.config.filters.minConfidence,
      });
    }
  }

  /**
   * Export state for persistence
   * 导出状态用于持久化
   */
  exportState(): {
    baselines: MetricBaseline[];
    events: AnomalyEvent[];
  } {
    return {
      baselines: this.baselineManager.exportBaselines(),
      events: this.anomalyEvents,
    };
  }

  /**
   * Import state from persistence
   * 从持久化导入状态
   */
  importState(state: { baselines: MetricBaseline[]; events: AnomalyEvent[] }): void {
    state.baselines.forEach((baseline) => {
      this.baselineManager.importBaseline(baseline);
    });
    this.anomalyEvents = state.events;
  }
}

// Export singleton instance
export const anomalyDetector = new PerformanceAnomalyDetector();
