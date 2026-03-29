/**
 * Performance Anomaly Detection Types
 * 性能异常检测类型定义
 */

export interface MetricBaseline {
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

export interface AnomalyDetection {
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  value: number;
  baseline: MetricBaseline;
  zScore?: number;
  percentChange?: number;
  confidence: number; // 0-1
  reason: string;
  detectedAt: number;
  algorithm: 'z-score' | 'isolation-forest' | 'threshold';
}

export interface AnomalyDetectionConfig {
  enabled: boolean;
  algorithms: {
    zScore: {
      enabled: boolean;
      threshold: number; // 默认 3，超过此值的 Z-score 视为异常
    };
    isolationForest: {
      enabled: boolean;
      contamination: number; // 异常数据比例期望，默认 0.1
    };
    threshold: {
      enabled: boolean;
      minThreshold?: number;
      maxThreshold?: number;
    };
  };
  baseline: {
    minSampleSize: number; // 最小样本数，默认 30
    updateIntervalMs: number; // 基线更新间隔，默认 1 小时
    windowSizeMs: number; // 基线计算窗口，默认 24 小时
  };
  filters: {
    enablePseudoAnomalyFilter: boolean; // 启用伪异常过滤
    cooldownMs: number; // 同一指标冷却时间，默认 5 分钟
    minConfidence: number; // 最小置信度，默认 0.7
  };
}

export interface MetricDataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

export interface AnomalyEvent {
  id: string;
  detection: AnomalyDetection;
  acknowledged: boolean;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: number;
  falsePositive: boolean;
  notes?: string;
}

export const DEFAULT_ANOMALY_CONFIG: AnomalyDetectionConfig = {
  enabled: true,
  algorithms: {
    zScore: {
      enabled: true,
      threshold: 3,
    },
    isolationForest: {
      enabled: false, // 默认关闭，需要更多数据
      contamination: 0.1,
    },
    threshold: {
      enabled: true,
    },
  },
  baseline: {
    minSampleSize: 30,
    updateIntervalMs: 60 * 60 * 1000, // 1 小时
    windowSizeMs: 24 * 60 * 60 * 1000, // 24 小时
  },
  filters: {
    enablePseudoAnomalyFilter: true,
    cooldownMs: 5 * 60 * 1000, // 5 分钟
    minConfidence: 0.7,
  },
};
