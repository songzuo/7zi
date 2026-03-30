/**
 * Causality Analyzer
 *
 * Analyzes temporal causal chains in performance issues
 * Using time series analysis to identify cause-effect relationships
 */

import { Severity, SeverityLevel } from './types';

// ============================================================================
// Types
// ============================================================================

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  metric: string;
  tags?: Record<string, string>;
}

export interface CausalChain {
  id: string;
  rootCause: CausalNode;
  intermediate: CausalNode[];
  effect: CausalNode;
  confidence: number;
  timeline: CausalTimeline;
  analysis: CausalAnalysis;
}

export interface CausalNode {
  id: string;
  metric: string;
  value: number;
  change: number; // Change from baseline
  percentage: number; // Percentage change
  timestamp: number;
  severity: SeverityLevel;
  context?: Record<string, any>;
}

export interface CausalTimeline {
  start: number;
  end: number;
  duration: number;
  intervals: CausalInterval[];
}

export interface CausalInterval {
  start: number;
  end: number;
  description: string;
  metric: string;
  change: number;
}

export interface CausalAnalysis {
  method: 'granger' | 'transfer-entropy' | 'correlation-lag' | 'rule-based';
  strength: number;
  pValue?: number;
  explanation: string;
  evidence: string[];
}

export interface CausalityRule {
  id: string;
  name: string;
  description: string;
  cause: {
    metric: string;
    condition: 'increase' | 'decrease' | 'threshold' | 'spike' | 'drop';
    threshold?: number;
  };
  effect: {
    metric: string;
    expectedChange: 'increase' | 'decrease' | 'delay';
    timeLag: number; // milliseconds
    probability: number;
  };
  confidence: number;
}

export interface CausalityConfig {
  minTimeLag: number; // Minimum time lag (ms)
  maxTimeLag: number; // Maximum time lag (ms)
  correlationThreshold: number; // Minimum correlation for causality
  significanceLevel: number; // P-value threshold
  maxChainLength: number; // Maximum causal chain length
  enableGrangerTest: boolean;
  enableRuleBased: boolean;
}

export const DEFAULT_CAUSALITY_CONFIG: CausalityConfig = {
  minTimeLag: 100, // 100ms
  maxTimeLag: 300000, // 5 minutes
  correlationThreshold: 0.6,
  significanceLevel: 0.05,
  maxChainLength: 10,
  enableGrangerTest: true,
  enableRuleBased: true
};

// ============================================================================
// Predefined Causality Rules
// ============================================================================

const CAUSALITY_RULES: CausalityRule[] = [
  {
    id: 'db-query-api-response',
    name: 'Database Query → API Response',
    description: 'Slow database queries cause slow API responses',
    cause: { metric: 'database-query-time', condition: 'spike' },
    effect: { metric: 'api-response-time', expectedChange: 'increase', timeLag: 50, probability: 0.85 },
    confidence: 0.9
  },
  {
    id: 'api-response-lcp',
    name: 'API Response → LCP',
    description: 'Slow API responses delay Largest Contentful Paint',
    cause: { metric: 'api-response-time', condition: 'spike' },
    effect: { metric: 'lcp', expectedChange: 'increase', timeLag: 100, probability: 0.75 },
    confidence: 0.85
  },
  {
    id: 'memory-gc-pause',
    name: 'Memory → GC Pause',
    description: 'High memory usage triggers GC pauses',
    cause: { metric: 'memory-usage', condition: 'threshold', threshold: 80 },
    effect: { metric: 'gc-pause-time', expectedChange: 'increase', timeLag: 1000, probability: 0.9 },
    confidence: 0.95
  },
  {
    id: 'cpu-long-tasks',
    name: 'CPU → Long Tasks',
    description: 'High CPU usage leads to long tasks',
    cause: { metric: 'cpu-usage', condition: 'threshold', threshold: 80 },
    effect: { metric: 'long-tasks', expectedChange: 'increase', timeLag: 500, probability: 0.8 },
    confidence: 0.85
  },
  {
    id: 'long-tasks-fid',
    name: 'Long Tasks → FID',
    description: 'Long tasks increase First Input Delay',
    cause: { metric: 'long-tasks', condition: 'spike' },
    effect: { metric: 'fid', expectedChange: 'increase', timeLag: 0, probability: 0.85 },
    confidence: 0.9
  },
  {
    id: 'network-lcp',
    name: 'Network Latency → LCP',
    description: 'High network latency delays LCP',
    cause: { metric: 'network-latency', condition: 'spike' },
    effect: { metric: 'lcp', expectedChange: 'increase', timeLag: 200, probability: 0.7 },
    confidence: 0.75
  },
  {
    id: 'connection-pool-db-time',
    name: 'Connection Pool → DB Time',
    description: 'Connection pool exhaustion increases query times',
    cause: { metric: 'connection-pool-usage', condition: 'threshold', threshold: 90 },
    effect: { metric: 'database-query-time', expectedChange: 'increase', timeLag: 100, probability: 0.85 },
    confidence: 0.88
  },
  {
    id: 'bundle-size-fcp',
    name: 'Bundle Size → FCP',
    description: 'Large bundle sizes delay First Contentful Paint',
    cause: { metric: 'bundle-size', condition: 'threshold', threshold: 1024 * 1024 },
    effect: { metric: 'fcp', expectedChange: 'increase', timeLag: 0, probability: 0.8 },
    confidence: 0.82
  }
];

// ============================================================================
// Causality Analyzer
// ============================================================================

/**
 * Causality Analyzer
 *
 * Analyzes temporal causal chains in performance issues
 */
export class CausalityAnalyzer {
  private config: CausalityConfig;
  private timeSeriesData: Map<string, TimeSeriesPoint[]> = new Map();
  private detectedChains: Map<string, CausalChain> = new Map();
  private rules: CausalityRule[];

  constructor(config: Partial<CausalityConfig> = {}) {
    this.config = { ...DEFAULT_CAUSALITY_CONFIG, ...config };
    this.rules = CAUSALITY_RULES;
  }

  // ============================================================================
  // Data Management
  // ============================================================================

  /**
   * Add time series data point
   */
  addDataPoint(point: TimeSeriesPoint): void {
    const metric = point.metric;
    if (!this.timeSeriesData.has(metric)) {
      this.timeSeriesData.set(metric, []);
    }
    this.timeSeriesData.get(metric)!.push(point);

    // Keep data size manageable
    const maxPoints = 10000;
    const data = this.timeSeriesData.get(metric)!;
    if (data.length > maxPoints) {
      this.timeSeriesData.set(metric, data.slice(-maxPoints));
    }
  }

  /**
   * Add multiple data points
   */
  addDataPoints(points: TimeSeriesPoint[]): void {
    points.forEach(point => this.addDataPoint(point));
  }

  /**
   * Get time series for a metric
   */
  getTimeSeries(metric: string, start?: number, end?: number): TimeSeriesPoint[] {
    const data = this.timeSeriesData.get(metric) || [];
    if (start !== undefined && end !== undefined) {
      return data.filter(p => p.timestamp >= start && p.timestamp <= end);
    }
    return [...data];
  }

  /**
   * Get all available metrics
   */
  getAvailableMetrics(): string[] {
    return Array.from(this.timeSeriesData.keys());
  }

  // ============================================================================
  // Causal Chain Analysis
  // ============================================================================

  /**
   * Analyze causal chains for a given effect
   */
  analyzeCausalChains(effectMetric: string, effectTimestamp: number): CausalChain[] {
    const chains: CausalChain[] = [];

    // Rule-based analysis
    if (this.config.enableRuleBased) {
      const ruleBasedChains = this.analyzeWithRules(effectMetric, effectTimestamp);
      chains.push(...ruleBasedChains);
    }

    // Granger causality test
    if (this.config.enableGrangerTest) {
      const grangerChains = this.analyzeWithGranger(effectMetric, effectTimestamp);
      chains.push(...grangerChains);
    }

    // Correlation lag analysis
    const lagChains = this.analyzeWithCorrelationLag(effectMetric, effectTimestamp);
    chains.push(...lagChains);

    // Sort by confidence and return top chains
    return chains
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
  }

  /**
   * Analyze using predefined rules
   */
  private analyzeWithRules(effectMetric: string, effectTimestamp: number): CausalChain[] {
    const chains: CausalChain[] = [];

    // Find rules where effect metric matches
    const relevantRules = this.rules.filter(rule => rule.effect.metric === effectMetric);

    for (const rule of relevantRules) {
      const causeData = this.getTimeSeries(rule.cause.metric);

      if (causeData.length === 0) continue;

      // Find spike/anomaly in cause metric
      const causeAnomaly = this.findAnomaly(
        causeData,
        effectTimestamp - this.config.maxTimeLag,
        effectTimestamp - this.config.minTimeLag,
        rule.cause.condition,
        rule.cause.threshold
      );

      if (causeAnomaly) {
        const effectData = this.getTimeSeries(effectMetric);
        const effectValue = this.getValueAtTime(effectData, effectTimestamp);

        if (effectValue !== null) {
          const rootCause: CausalNode = {
            id: `node-${rule.id}-${causeAnomaly.timestamp}`,
            metric: rule.cause.metric,
            value: causeAnomaly.value,
            change: causeAnomaly.change,
            percentage: causeAnomaly.percentage,
            timestamp: causeAnomaly.timestamp,
            severity: this.calculateSeverity(causeAnomaly.percentage)
          };

          const effectNode: CausalNode = {
            id: `node-${rule.id}-${effectTimestamp}`,
            metric: effectMetric,
            value: effectValue.value,
            change: effectValue.change,
            percentage: effectValue.percentage,
            timestamp: effectTimestamp,
            severity: this.calculateSeverity(effectValue.percentage)
          };

          const chain: CausalChain = {
            id: `chain-${rule.id}-${causeAnomaly.timestamp}`,
            rootCause,
            intermediate: [],
            effect: effectNode,
            confidence: rule.confidence * rule.effect.probability,
            timeline: {
              start: causeAnomaly.timestamp,
              end: effectTimestamp,
              duration: effectTimestamp - causeAnomaly.timestamp,
              intervals: [
                {
                  start: causeAnomaly.timestamp,
                  end: effectTimestamp,
                  description: `${rule.cause.metric} caused ${effectMetric}`,
                  metric: rule.cause.metric,
                  change: causeAnomaly.change
                }
              ]
            },
            analysis: {
              method: 'rule-based',
              strength: rule.confidence,
              explanation: rule.description,
              evidence: [
                `${rule.cause.metric} ${rule.cause.condition} detected at ${new Date(causeAnomaly.timestamp).toISOString()}`,
                `${effectMetric} ${rule.effect.expectedChange} followed ${rule.effect.timeLag}ms later`
              ]
            }
          };

          chains.push(chain);
        }
      }
    }

    return chains;
  }

  /**
   * Analyze using Granger causality test
   */
  private analyzeWithGranger(effectMetric: string, effectTimestamp: number): CausalChain[] {
    const chains: CausalChain[] = [];
    const candidateMetrics = this.findCandidateCauseMetrics(effectMetric);

    for (const causeMetric of candidateMetrics) {
      const causeData = this.getTimeSeries(causeMetric);
      const effectData = this.getTimeSeries(effectMetric);

      if (causeData.length < 10 || effectData.length < 10) continue;

      // Perform Granger test
      const grangerResult = this.grangerCausalityTest(causeData, effectData);

      if (grangerResult.isSignificant) {
        const causeAnomaly = this.findAnomaly(
          causeData,
          effectTimestamp - this.config.maxTimeLag,
          effectTimestamp - this.config.minTimeLag,
          'spike'
        );

        if (causeAnomaly) {
          const effectValue = this.getValueAtTime(effectData, effectTimestamp);

          if (effectValue !== null) {
            const rootCause: CausalNode = {
              id: `node-granger-${causeMetric}-${causeAnomaly.timestamp}`,
              metric: causeMetric,
              value: causeAnomaly.value,
              change: causeAnomaly.change,
              percentage: causeAnomaly.percentage,
              timestamp: causeAnomaly.timestamp,
              severity: this.calculateSeverity(causeAnomaly.percentage)
            };

            const effectNode: CausalNode = {
              id: `node-granger-${effectMetric}-${effectTimestamp}`,
              metric: effectMetric,
              value: effectValue.value,
              change: effectValue.change,
              percentage: effectValue.percentage,
              timestamp: effectTimestamp,
              severity: this.calculateSeverity(effectValue.percentage)
            };

            const chain: CausalChain = {
              id: `chain-granger-${causeMetric}-${causeAnomaly.timestamp}`,
              rootCause,
              intermediate: [],
              effect: effectNode,
              confidence: 1 - grangerResult.pValue,
              timeline: {
                start: causeAnomaly.timestamp,
                end: effectTimestamp,
                duration: effectTimestamp - causeAnomaly.timestamp,
                intervals: [
                  {
                    start: causeAnomaly.timestamp,
                    end: effectTimestamp,
                    description: `${causeMetric} Granger-causes ${effectMetric}`,
                    metric: causeMetric,
                    change: causeAnomaly.change
                  }
                ]
              },
              analysis: {
                method: 'granger',
                strength: 1 - grangerResult.pValue,
                pValue: grangerResult.pValue,
                explanation: `${causeMetric} Granger-causes ${effectMetric} with p-value ${grangerResult.pValue.toFixed(4)}`,
                evidence: grangerResult.evidence
              }
            };

            chains.push(chain);
          }
        }
      }
    }

    return chains;
  }

  /**
   * Analyze using correlation lag
   */
  private analyzeWithCorrelationLag(effectMetric: string, effectTimestamp: number): CausalChain[] {
    const chains: CausalChain[] = [];
    const candidateMetrics = this.findCandidateCauseMetrics(effectMetric);

    for (const causeMetric of candidateMetrics) {
      const causeData = this.getTimeSeries(causeMetric);
      const effectData = this.getTimeSeries(effectMetric);

      if (causeData.length < 10 || effectData.length < 10) continue;

      // Find optimal lag
      const lagResult = this.findOptimalLag(causeData, effectData);

      if (lagResult.correlation >= this.config.correlationThreshold) {
        const causeAnomaly = this.findAnomaly(
          causeData,
          effectTimestamp - lagResult.optimalLag - 5000,
          effectTimestamp - lagResult.optimalLag + 5000,
          'spike'
        );

        if (causeAnomaly) {
          const effectValue = this.getValueAtTime(effectData, effectTimestamp);

          if (effectValue !== null) {
            const rootCause: CausalNode = {
              id: `node-lag-${causeMetric}-${causeAnomaly.timestamp}`,
              metric: causeMetric,
              value: causeAnomaly.value,
              change: causeAnomaly.change,
              percentage: causeAnomaly.percentage,
              timestamp: causeAnomaly.timestamp,
              severity: this.calculateSeverity(causeAnomaly.percentage)
            };

            const effectNode: CausalNode = {
              id: `node-lag-${effectMetric}-${effectTimestamp}`,
              metric: effectMetric,
              value: effectValue.value,
              change: effectValue.change,
              percentage: effectValue.percentage,
              timestamp: effectTimestamp,
              severity: this.calculateSeverity(effectValue.percentage)
            };

            const chain: CausalChain = {
              id: `chain-lag-${causeMetric}-${causeAnomaly.timestamp}`,
              rootCause,
              intermediate: [],
              effect: effectNode,
              confidence: lagResult.correlation,
              timeline: {
                start: causeAnomaly.timestamp,
                end: effectTimestamp,
                duration: effectTimestamp - causeAnomaly.timestamp,
                intervals: [
                  {
                    start: causeAnomaly.timestamp,
                    end: effectTimestamp,
                    description: `${causeMetric} leads ${effectMetric} by ${lagResult.optimalLag}ms`,
                    metric: causeMetric,
                    change: causeAnomaly.change
                  }
                ]
              },
              analysis: {
                method: 'correlation-lag',
                strength: lagResult.correlation,
                explanation: `${causeMetric} shows ${lagResult.correlation.toFixed(2)} correlation with ${effectMetric} at ${lagResult.optimalLag}ms lag`,
                evidence: [
                  `Correlation coefficient: ${lagResult.correlation.toFixed(3)}`,
                  `Optimal time lag: ${lagResult.optimalLag}ms`
                ]
              }
            };

            chains.push(chain);
          }
        }
      }
    }

    return chains;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Find candidate cause metrics for an effect
   */
  private findCandidateCauseMetrics(effectMetric: string): string[] {
    const allMetrics = this.getAvailableMetrics();
    const candidates: string[] = [];

    // From predefined rules
    for (const rule of this.rules) {
      if (rule.effect.metric === effectMetric) {
        if (allMetrics.includes(rule.cause.metric)) {
          candidates.push(rule.cause.metric);
        }
      }
    }

    // Add related metrics (same context)
    for (const metric of allMetrics) {
      if (!candidates.includes(metric) && metric !== effectMetric) {
        // Check if metrics are related
        const causeData = this.getTimeSeries(metric);
        const effectData = this.getTimeSeries(effectMetric);

        if (causeData.length >= 10 && effectData.length >= 10) {
          const correlation = this.calculateCorrelation(causeData, effectData);
          if (Math.abs(correlation) >= this.config.correlationThreshold * 0.7) {
            candidates.push(metric);
          }
        }
      }
    }

    return candidates;
  }

  /**
   * Find anomaly in time series
   */
  private findAnomaly(
    data: TimeSeriesPoint[],
    startTime: number,
    endTime: number,
    condition: 'increase' | 'decrease' | 'threshold' | 'spike' | 'drop',
    threshold?: number
  ): { value: number; change: number; percentage: number; timestamp: number } | null {
    const windowData = data.filter(p => p.timestamp >= startTime && p.timestamp <= endTime);
    if (windowData.length === 0) return null;

    const baseline = data.filter(p => p.timestamp < startTime);
    if (baseline.length === 0) return null;

    const baselineMean = baseline.reduce((sum, p) => sum + p.value, 0) / baseline.length;
    const baselineStd = Math.sqrt(
      baseline.reduce((sum, p) => sum + Math.pow(p.value - baselineMean, 2), 0) / baseline.length
    );

    for (const point of windowData) {
      const change = point.value - baselineMean;
      const percentage = baselineMean !== 0 ? (change / Math.abs(baselineMean)) * 100 : 0;

      let isAnomaly = false;

      switch (condition) {
        case 'increase':
          isAnomaly = change > 0 && Math.abs(change) > 2 * baselineStd;
          break;
        case 'decrease':
          isAnomaly = change < 0 && Math.abs(change) > 2 * baselineStd;
          break;
        case 'threshold':
          isAnomaly = threshold !== undefined && point.value >= threshold;
          break;
        case 'spike':
          isAnomaly = Math.abs(change) > 3 * baselineStd;
          break;
        case 'drop':
          isAnomaly = change < -3 * baselineStd;
          break;
      }

      if (isAnomaly) {
        return {
          value: point.value,
          change,
          percentage,
          timestamp: point.timestamp
        };
      }
    }

    return null;
  }

  /**
   * Get value at specific time (or closest)
   */
  private getValueAtTime(
    data: TimeSeriesPoint[],
    timestamp: number,
    tolerance: number = 5000
  ): { value: number; change: number; percentage: number } | null {
    const candidates = data.filter(
      p => Math.abs(p.timestamp - timestamp) <= tolerance
    );

    if (candidates.length === 0) return null;

    const closest = candidates.reduce((prev, curr) =>
      Math.abs(curr.timestamp - timestamp) < Math.abs(prev.timestamp - timestamp) ? curr : prev
    );

    const baseline = data.filter(p => p.timestamp < closest.timestamp - tolerance);
    if (baseline.length === 0) {
      return { value: closest.value, change: 0, percentage: 0 };
    }

    const baselineMean = baseline.reduce((sum, p) => sum + p.value, 0) / baseline.length;
    const change = closest.value - baselineMean;
    const percentage = baselineMean !== 0 ? (change / Math.abs(baselineMean)) * 100 : 0;

    return { value: closest.value, change, percentage };
  }

  /**
   * Calculate Pearson correlation
   */
  private calculateCorrelation(
    series1: TimeSeriesPoint[],
    series2: TimeSeriesPoint[]
  ): number {
    // Align time series
    const aligned1: number[] = [];
    const aligned2: number[] = [];

    const timestamps = new Set([
      ...series1.map(p => Math.floor(p.timestamp / 1000)),
      ...series2.map(p => Math.floor(p.timestamp / 1000))
    ]);

    for (const ts of timestamps) {
      const p1 = series1.find(p => Math.floor(p.timestamp / 1000) === ts);
      const p2 = series2.find(p => Math.floor(p.timestamp / 1000) === ts);
      if (p1 && p2) {
        aligned1.push(p1.value);
        aligned2.push(p2.value);
      }
    }

    if (aligned1.length < 3) return 0;

    const mean1 = aligned1.reduce((sum, v) => sum + v, 0) / aligned1.length;
    const mean2 = aligned2.reduce((sum, v) => sum + v, 0) / aligned2.length;

    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;

    for (let i = 0; i < aligned1.length; i++) {
      const diff1 = aligned1[i] - mean1;
      const diff2 = aligned2[i] - mean2;
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(denom1 * denom2);
    return denominator !== 0 ? numerator / denominator : 0;
  }

  /**
   * Granger causality test (simplified implementation)
   */
  private grangerCausalityTest(
    cause: TimeSeriesPoint[],
    effect: TimeSeriesPoint[]
  ): { isSignificant: boolean; pValue: number; evidence: string[] } {
    // Simplified Granger test
    // In production, use a statistical library for proper implementation

    const lagResult = this.findOptimalLag(cause, effect);
    const correlation = lagResult.correlation;

    // Approximate p-value from correlation
    const tStat = correlation * Math.sqrt((cause.length - 2) / (1 - correlation * correlation));
    const pValue = 2 * (1 - this.normalCDF(Math.abs(tStat), 0, 1));

    const isSignificant = pValue < this.config.significanceLevel && correlation > 0;

    return {
      isSignificant,
      pValue,
      evidence: [
        `Correlation at optimal lag: ${correlation.toFixed(3)}`,
        `T-statistic: ${tStat.toFixed(3)}`,
        `Optimal lag: ${lagResult.optimalLag}ms`
      ]
    };
  }

  /**
   * Find optimal lag for correlation
   */
  private findOptimalLag(
    cause: TimeSeriesPoint[],
    effect: TimeSeriesPoint[]
  ): { correlation: number; optimalLag: number } {
    let maxCorrelation = 0;
    let optimalLag = 0;

    const lagSteps = [100, 200, 500, 1000, 2000, 5000, 10000, 30000, 60000];

    for (const lag of lagSteps) {
      if (lag > this.config.maxTimeLag) break;

      // Shift cause series by lag
      const shiftedCause = cause.map(p => ({
        ...p,
        timestamp: p.timestamp + lag
      }));

      const correlation = this.calculateCorrelation(shiftedCause, effect);

      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        optimalLag = lag;
      }
    }

    return { correlation: maxCorrelation, optimalLag };
  }

  /**
   * Normal CDF approximation
   */
  private normalCDF(x: number, mean: number = 0, std: number = 1): number {
    const z = (x - mean) / std;
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804014327 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }

  /**
   * Calculate severity from percentage change
   */
  private calculateSeverity(percentage: number): SeverityLevel {
    const absPercentage = Math.abs(percentage);
    if (absPercentage >= 100) return 'critical';
    if (absPercentage >= 50) return 'high';
    if (absPercentage >= 25) return 'medium';
    if (absPercentage >= 10) return 'low';
    return 'info';
  }

  // ============================================================================
  // Multi-hop Causal Chains
  // ============================================================================

  /**
   * Build multi-hop causal chains
   */
  buildMultiHopChains(effectMetric: string, effectTimestamp: number): CausalChain[] {
    const chains: CausalChain[] = [];

    // Find immediate causes
    const immediateCauses = this.analyzeCausalChains(effectMetric, effectTimestamp);

    for (const immediateCause of immediateCauses) {
      // Recursively find causes of causes
      const rootCauses = this.analyzeCausalChains(
        immediateCause.rootCause.metric,
        immediateCause.rootCause.timestamp
      );

      if (rootCauses.length > 0) {
        // Build multi-hop chain
        const bestRootCause = rootCauses[0]; // Highest confidence
        const intermediate: CausalNode[] = [immediateCause.rootCause];

        const multiHopChain: CausalChain = {
          id: `multi-hop-${bestRootCause.rootCause.id}`,
          rootCause: bestRootCause.rootCause,
          intermediate,
          effect: immediateCause.effect,
          confidence: bestRootCause.confidence * immediateCause.confidence,
          timeline: {
            start: bestRootCause.timeline.start,
            end: immediateCause.timeline.end,
            duration: immediateCause.timeline.end - bestRootCause.timeline.start,
            intervals: [
              ...bestRootCause.timeline.intervals,
              ...immediateCause.timeline.intervals
            ]
          },
          analysis: {
            method: 'rule-based',
            strength: bestRootCause.confidence * immediateCause.confidence,
            explanation: `Multi-hop causal chain: ${bestRootCause.rootCause.metric} → ${immediateCause.rootCause.metric} → ${effectMetric}`,
            evidence: [
              ...bestRootCause.analysis.evidence,
              ...immediateCause.analysis.evidence
            ]
          }
        };

        chains.push(multiHopChain);
      }
    }

    return chains.sort((a, b) => b.confidence - a.confidence);
  }

  // ============================================================================
  // Reporting
  // ============================================================================

  /**
   * Generate causality report
   */
  generateReport(effectMetric: string, effectTimestamp: number): {
    causalChains: CausalChain[];
    primaryCause: CausalChain | null;
    summary: string;
  } {
    const singleHop = this.analyzeCausalChains(effectMetric, effectTimestamp);
    const multiHop = this.buildMultiHopChains(effectMetric, effectTimestamp);

    const allChains = [...singleHop, ...multiHop].sort((a, b) => b.confidence - a.confidence);

    const primaryCause = allChains[0] || null;

    return {
      causalChains: allChains,
      primaryCause,
      summary: primaryCause
        ? `Primary cause: ${primaryCause.rootCause.metric} → ${primaryCause.effect.metric} (confidence: ${(primaryCause.confidence * 100).toFixed(0)}%)`
        : 'No clear causal chain identified'
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.timeSeriesData.clear();
    this.detectedChains.clear();
  }
}

export default CausalityAnalyzer;
