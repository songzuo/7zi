/**
 * Baseline Manager
 * 基准线管理器 - 自动学习和更新性能基准线
 */

import { MetricBaseline, MetricDataPoint, AnomalyDetectionConfig } from './types';

export class BaselineManager {
  private baselines: Map<string, MetricBaseline> = new Map();
  private metricHistory: Map<string, MetricDataPoint[]> = new Map();
  private config: AnomalyDetectionConfig;
  private lastUpdateTime: Map<string, number> = new Map();

  constructor(config: AnomalyDetectionConfig) {
    this.config = config;
  }

  /**
   * Add metric data point
   * 添加指标数据点
   */
  addDataPoint(metric: string, value: number, timestamp: number = Date.now()): void {
    if (!this.metricHistory.has(metric)) {
      this.metricHistory.set(metric, []);
    }

    const history = this.metricHistory.get(metric)!;
    history.push({ timestamp, value });

    // 清理过期数据
    this.cleanOldHistory(metric);

    // 检查是否需要更新基线
    this.checkBaselineUpdate(metric);
  }

  /**
   * Clean old history data
   * 清理过期历史数据
   */
  private cleanOldHistory(metric: string): void {
    const history = this.metricHistory.get(metric);
    if (!history) return;

    const cutoff = Date.now() - this.config.baseline.windowSizeMs;
    const filtered = history.filter((d) => d.timestamp >= cutoff);
    this.metricHistory.set(metric, filtered);
  }

  /**
   * Check if baseline needs update
   * 检查基线是否需要更新
   */
  private checkBaselineUpdate(metric: string): void {
    const history = this.metricHistory.get(metric);
    if (!history || history.length < this.config.baseline.minSampleSize) {
      return;
    }

    const lastUpdate = this.lastUpdateTime.get(metric) || 0;
    const now = Date.now();

    if (now - lastUpdate >= this.config.baseline.updateIntervalMs) {
      this.updateBaseline(metric);
    }
  }

  /**
   * Update baseline for a metric
   * 更新指标基线
   */
  updateBaseline(metric: string): MetricBaseline | null {
    const history = this.metricHistory.get(metric);
    if (!history || history.length < this.config.baseline.minSampleSize) {
      return null;
    }

    const values = history.map((d) => d.value);
    const baseline = this.calculateBaseline(metric, values);
    
    this.baselines.set(metric, baseline);
    this.lastUpdateTime.set(metric, Date.now());

    return baseline;
  }

  /**
   * Calculate baseline statistics
   * 计算基线统计数据
   */
  private calculateBaseline(metric: string, values: number[]): MetricBaseline {
    const n = values.length;
    const sorted = [...values].sort((a, b) => a - b);

    // 均值
    const mean = values.reduce((sum, v) => sum + v, 0) / n;

    // 标准差
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // 百分位数
    const p50 = this.percentile(sorted, 50);
    const p95 = this.percentile(sorted, 95);
    const p99 = this.percentile(sorted, 99);

    const baseline: MetricBaseline = {
      metric,
      mean,
      stdDev,
      min: sorted[0],
      max: sorted[n - 1],
      p50,
      p95,
      p99,
      sampleSize: n,
      lastUpdated: Date.now(),
    };

    return baseline;
  }

  /**
   * Calculate percentile
   * 计算百分位数
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get baseline for a metric
   * 获取指标基线
   */
  getBaseline(metric: string): MetricBaseline | null {
    return this.baselines.get(metric) || null;
  }

  /**
   * Get all baselines
   * 获取所有基线
   */
  getAllBaselines(): MetricBaseline[] {
    return Array.from(this.baselines.values());
  }

  /**
   * Force update all baselines
   * 强制更新所有基线
   */
  updateAllBaselines(): void {
    for (const metric of this.metricHistory.keys()) {
      this.updateBaseline(metric);
    }
  }

  /**
   * Clear baseline for a metric
   * 清除指标基线
   */
  clearBaseline(metric: string): void {
    this.baselines.delete(metric);
    this.metricHistory.delete(metric);
    this.lastUpdateTime.delete(metric);
  }

  /**
   * Clear all baselines
   * 清除所有基线
   */
  clearAll(): void {
    this.baselines.clear();
    this.metricHistory.clear();
    this.lastUpdateTime.clear();
  }

  /**
   * Get history for a metric
   * 获取指标历史数据
   */
  getHistory(metric: string): MetricDataPoint[] {
    return this.metricHistory.get(metric) || [];
  }

  /**
   * Import baseline (for persistence)
   * 导入基线（用于持久化）
   */
  importBaseline(baseline: MetricBaseline): void {
    this.baselines.set(baseline.metric, baseline);
    this.lastUpdateTime.set(baseline.metric, baseline.lastUpdated);
  }

  /**
   * Export baselines (for persistence)
   * 导出基线（用于持久化）
   */
  exportBaselines(): MetricBaseline[] {
    return this.getAllBaselines();
  }
}
