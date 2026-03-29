/**
 * Pseudo Anomaly Filters
 * 伪异常过滤器
 */

import { AnomalyDetection, MetricBaseline } from './types';

export interface FilterRule {
  name: string;
  description: string;
  apply: (detection: AnomalyDetection, context: FilterContext) => boolean;
}

export interface FilterContext {
  recentDetections: AnomalyDetection[];
  metricHistory: { timestamp: number; value: number }[];
  systemLoad?: {
    cpu: number;
    memory: number;
    network: number;
  };
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
}

/**
 * Cooldown filter - prevents repeated alerts for the same metric
 * 冷却时间过滤器 - 防止同一指标重复告警
 */
export function createCooldownFilter(cooldownMs: number): FilterRule {
  return {
    name: 'cooldown',
    description: `Prevents repeated alerts within ${cooldownMs}ms`,
    apply: (detection, context) => {
      const recentSameMetric = context.recentDetections.filter(
        (d) =>
          d.metric === detection.metric &&
          Date.now() - d.detectedAt < cooldownMs
      );
      return recentSameMetric.length === 0;
    },
  };
}

/**
 * Minimum confidence filter
 * 最小置信度过滤器
 */
export function createConfidenceFilter(minConfidence: number): FilterRule {
  return {
    name: 'confidence',
    description: `Filters detections with confidence < ${minConfidence}`,
    apply: (detection) => {
      return detection.confidence >= minConfidence;
    },
  };
}

/**
 * Seasonal pattern filter - filters known seasonal variations
 * 季节性模式过滤器 - 过滤已知的季节性变化
 */
export function createSeasonalFilter(config: {
  peakHours?: number[]; // 高峰时段
  weekendEffect?: boolean; // 周末效应
}): FilterRule {
  return {
    name: 'seasonal',
    description: 'Filters known seasonal variations',
    apply: (detection, context) => {
      // 如果是高峰时段，允许更高的阈值
      if (config.peakHours?.includes(context.timeOfDay)) {
        // 高峰时段，调整置信度阈值
        return detection.confidence > 0.8; // 需要更高的置信度
      }

      // 周末效应
      if (config.weekendEffect && (context.dayOfWeek === 0 || context.dayOfWeek === 6)) {
        // 周末，流量通常较低，一些异常可能是正常的
        return detection.confidence > 0.75;
      }

      return true;
    },
  };
}

/**
 * System load filter - considers current system load
 * 系统负载过滤器 - 考虑当前系统负载
 */
export function createSystemLoadFilter(thresholds: {
  cpu: number;
  memory: number;
}): FilterRule {
  return {
    name: 'system-load',
    description: 'Considers current system load',
    apply: (detection, context) => {
      if (!context.systemLoad) return true;

      // 如果系统负载很高，可能是正常的性能下降
      if (
        context.systemLoad.cpu > thresholds.cpu ||
        context.systemLoad.memory > thresholds.memory
      ) {
        // 系统负载高，需要更高的置信度才报警
        return detection.confidence > 0.85;
      }

      return true;
    },
  };
}

/**
 * Trend consistency filter - checks if anomaly is consistent with trend
 * 趋势一致性过滤器 - 检查异常是否与趋势一致
 */
export function createTrendFilter(windowSize: number = 10): FilterRule {
  return {
    name: 'trend',
    description: 'Checks if anomaly is consistent with recent trend',
    apply: (detection, context) => {
      const history = context.metricHistory;
      if (history.length < windowSize) return true;

      // 计算最近的趋势
      const recent = history.slice(-windowSize);
      const values = recent.map((h) => h.value);
      
      // 简单线性趋势
      let trend = 0;
      for (let i = 1; i < values.length; i++) {
        trend += values[i] - values[i - 1];
      }
      trend /= (values.length - 1);

      // 如果趋势是上升的，当前值高于均值是正常的
      if (trend > 0 && detection.value > detection.baseline.mean) {
        // 上升趋势，高于均值可能是正常的
        return detection.confidence > 0.8;
      }

      // 如果趋势是下降的，当前值低于均值是正常的
      if (trend < 0 && detection.value < detection.baseline.mean) {
        return detection.confidence > 0.8;
      }

      return true;
    },
  };
}

/**
 * Composite filter - combines multiple filters
 * 组合过滤器 - 组合多个过滤器
 */
export class CompositeFilter {
  private filters: FilterRule[] = [];

  addFilter(filter: FilterRule): void {
    this.filters.push(filter);
  }

  apply(detection: AnomalyDetection, context: FilterContext): boolean {
    // 所有过滤器都必须通过
    return this.filters.every((filter) => filter.apply(detection, context));
  }

  applyWithDetails(
    detection: AnomalyDetection,
    context: FilterContext
  ): {
    passed: boolean;
    failedFilters: string[];
  } {
    const failedFilters: string[] = [];

    for (const filter of this.filters) {
      if (!filter.apply(detection, context)) {
        failedFilters.push(filter.name);
      }
    }

    return {
      passed: failedFilters.length === 0,
      failedFilters,
    };
  }
}

/**
 * Create default filter set
 * 创建默认过滤器集
 */
export function createDefaultFilters(config: {
  cooldownMs: number;
  minConfidence: number;
}): CompositeFilter {
  const composite = new CompositeFilter();

  composite.addFilter(createCooldownFilter(config.cooldownMs));
  composite.addFilter(createConfidenceFilter(config.minConfidence));
  composite.addFilter(createSeasonalFilter({
    peakHours: [9, 10, 11, 14, 15, 16, 17], // 工作高峰时段
    weekendEffect: true,
  }));
  composite.addFilter(createTrendFilter(10));

  return composite;
}
