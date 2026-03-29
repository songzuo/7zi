/**
 * Z-Score Anomaly Detection Algorithm
 * Z-Score 异常检测算法
 */

import { MetricBaseline, AnomalyDetection } from '../types';

export interface ZScoreResult {
  zScore: number;
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
}

/**
 * Calculate Z-Score
 * 计算 Z-Score
 */
export function calculateZScore(value: number, baseline: MetricBaseline): number {
  if (baseline.stdDev === 0) {
    // 标准差为 0，所有值相同
    return value === baseline.mean ? 0 : (value > baseline.mean ? Infinity : -Infinity);
  }
  return (value - baseline.mean) / baseline.stdDev;
}

/**
 * Detect anomaly using Z-Score
 * 使用 Z-Score 检测异常
 */
export function detectAnomalyZScore(
  value: number,
  baseline: MetricBaseline,
  threshold: number = 3
): ZScoreResult {
  const zScore = calculateZScore(value, baseline);
  const absZScore = Math.abs(zScore);

  // 判断是否异常
  const isAnomaly = absZScore > threshold;

  // 计算严重程度
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (absZScore > threshold * 3) {
    severity = 'critical';
  } else if (absZScore > threshold * 2) {
    severity = 'high';
  } else if (absZScore > threshold * 1.5) {
    severity = 'medium';
  }

  // 计算置信度
  const confidence = Math.min(absZScore / (threshold * 4), 1);

  return {
    zScore,
    isAnomaly,
    severity,
    confidence,
  };
}

/**
 * Calculate percentile-based anomaly
 * 基于百分位数的异常检测
 */
export function detectAnomalyPercentile(
  value: number,
  baseline: MetricBaseline,
  upperPercentile: number = 95
): boolean {
  const threshold = baseline.p95;
  return value > threshold;
}

/**
 * Calculate percent change from baseline
 * 计算相对基线的百分比变化
 */
export function calculatePercentChange(value: number, baseline: MetricBaseline): number {
  if (baseline.mean === 0) {
    return value === 0 ? 0 : (value > 0 ? Infinity : -Infinity);
  }
  return ((value - baseline.mean) / baseline.mean) * 100;
}

/**
 * Get Z-Score interpretation
 * 获取 Z-Score 解释
 */
export function interpretZScore(zScore: number): string {
  const abs = Math.abs(zScore);
  if (abs < 1) {
    return 'Normal (within 1 standard deviation)';
  } else if (abs < 2) {
    return 'Slightly elevated (1-2 standard deviations)';
  } else if (abs < 3) {
    return 'Elevated (2-3 standard deviations)';
  } else if (abs < 4) {
    return 'Significantly elevated (3-4 standard deviations)';
  } else {
    return 'Highly anomalous (>4 standard deviations)';
  }
}
