/**
 * Anomaly Detector
 * Simple statistical anomaly detection based on standard deviation (Z-Score)
 */

// ========================================
// Types
// ========================================

export interface Baseline {
  metric: string;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
  sampleSize: number;
  lastUpdated: number;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  value: number;
  zScore: number;
  severity: 'normal' | 'warning' | 'critical';
  algorithm: 'zscore' | 'threshold';
  timestamp: number;
}

export interface AnomalyDetectorConfig {
  enabled: boolean;
  zScoreThreshold: number; // Default: 3
  minSampleSize: number; // Default: 10
  windowSize: number; // Max samples to keep
}

const DEFAULT_CONFIG: AnomalyDetectorConfig = {
  enabled: true,
  zScoreThreshold: 3,
  minSampleSize: 10,
  windowSize: 100,
};

// ========================================
// Anomaly Detector Class
// ========================================

export class AnomalyDetector {
  private config: AnomalyDetectorConfig;
  private dataHistory: Map<string, number[]> = new Map();
  private baselines: Map<string, Baseline> = new Map();

  constructor(config: Partial<AnomalyDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a data point for a metric
   */
  addDataPoint(metric: string, value: number): void {
    if (!this.config.enabled) return;

    const history = this.dataHistory.get(metric) || [];
    history.push(value);

    // Keep only the last windowSize samples
    if (history.length > this.config.windowSize) {
      history.shift();
    }

    this.dataHistory.set(metric, history);
  }

  /**
   * Calculate baseline statistics for a metric
   */
  calculateBaseline(metric: string): Baseline | undefined {
    const history = this.dataHistory.get(metric);
    if (!history || history.length < this.config.minSampleSize) {
      return undefined;
    }

    const sorted = [...history].sort((a, b) => a - b);
    const n = sorted.length;

    // Calculate mean
    const mean = sorted.reduce((a, b) => a + b, 0) / n;

    // Calculate standard deviation
    const squaredDiffs = sorted.map((v) => Math.pow(v - mean, 2));
    const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / n);

    // Calculate percentiles
    const p50 = this.percentile(sorted, 50);
    const p95 = this.percentile(sorted, 95);
    const p99 = this.percentile(sorted, 99);

    const baseline: Baseline = {
      metric,
      mean,
      stdDev: stdDev || 1, // Prevent division by zero
      min: sorted[0],
      max: sorted[n - 1],
      p50,
      p95,
      p99,
      sampleSize: n,
      lastUpdated: Date.now(),
    };

    this.baselines.set(metric, baseline);
    return baseline;
  }

  /**
   * Get the percentile value from sorted data
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Get baseline for a metric
   */
  getBaseline(metric: string): Baseline | null {
    return this.baselines.get(metric) || null;
  }

  /**
   * Calculate Z-Score for a value
   */
  calculateZScore(value: number, baseline: Baseline): number {
    return (value - baseline.mean) / baseline.stdDev;
  }

  /**
   * Detect anomaly using Z-Score
   */
  detectAnomaly(metric: string, value: number): AnomalyResult | null {
    if (!this.config.enabled) {
      return null;
    }

    // First check if we have enough data
    const history = this.dataHistory.get(metric);
    if (!history || history.length < this.config.minSampleSize) {
      // Not enough data, just track it
      this.addDataPoint(metric, value);
      return null;
    }

    // Get or calculate baseline
    let baseline = this.baselines.get(metric);
    if (!baseline) {
      baseline = this.calculateBaseline(metric);
      if (!baseline) return null;
    }

    // Calculate Z-Score
    const zScore = this.calculateZScore(value, baseline);
    const absZScore = Math.abs(zScore);

    // Determine if anomaly
    const isAnomaly = absZScore >= this.config.zScoreThreshold;

    // Determine severity
    let severity: 'normal' | 'warning' | 'critical' = 'normal';
    if (isAnomaly) {
      if (absZScore >= this.config.zScoreThreshold * 2) {
        severity = 'critical';
      } else {
        severity = 'warning';
      }
    }

    // Add the value to history for future analysis
    this.addDataPoint(metric, value);

    return {
      isAnomaly,
      value,
      zScore,
      severity,
      algorithm: 'zscore',
      timestamp: Date.now(),
    };
  }

  /**
   * Check if a value exceeds a simple threshold
   */
  detectThresholdAnomaly(metric: string, value: number, threshold: number): AnomalyResult {
    const isAnomaly = value > threshold;
    let severity: 'normal' | 'warning' | 'critical' = 'normal';

    if (isAnomaly) {
      if (value >= threshold * 1.5) {
        severity = 'critical';
      } else {
        severity = 'warning';
      }
    }

    return {
      isAnomaly,
      value,
      zScore: 0,
      severity,
      algorithm: 'threshold',
      timestamp: Date.now(),
    };
  }

  /**
   * Clear all data for a specific metric
   */
  clearMetric(metric: string): void {
    this.dataHistory.delete(metric);
    this.baselines.delete(metric);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.dataHistory.clear();
    this.baselines.clear();
  }

  /**
   * Get statistics for all metrics
   */
  getStats(): { metric: string; sampleSize: number; mean: number; stdDev: number }[] {
    const stats: { metric: string; sampleSize: number; mean: number; stdDev: number }[] = [];

    this.baselines.forEach((baseline, metric) => {
      stats.push({
        metric,
        sampleSize: baseline.sampleSize,
        mean: baseline.mean,
        stdDev: baseline.stdDev,
      });
    });

    return stats;
  }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Calculate mean of an array
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
export function calculateStdDev(values: number[], mean?: number): number {
  if (values.length === 0) return 0;
  
  const m = mean ?? calculateMean(values);
  const squaredDiffs = values.map((v) => Math.pow(v - m, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Calculate Z-Score
 */
export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Detect anomaly using Z-Score with pre-calculated values
 */
export function detectAnomalyZScore(
  value: number,
  mean: number,
  stdDev: number,
  threshold: number = 3
): { isAnomaly: boolean; zScore: number; severity: 'normal' | 'warning' | 'critical' } {
  const zScore = calculateZScore(value, mean, stdDev);
  const absZScore = Math.abs(zScore);

  let severity: 'normal' | 'warning' | 'critical' = 'normal';
  if (absZScore >= threshold * 2) {
    severity = 'critical';
  } else if (absZScore >= threshold) {
    severity = 'warning';
  }

  return {
    isAnomaly: absZScore >= threshold,
    zScore,
    severity,
  };
}

// ========================================
// Export singleton instance
// ========================================

export const anomalyDetector = new AnomalyDetector();

export default AnomalyDetector;
